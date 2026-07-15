import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Match, Room, Prediction, RankingEntry } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_FILE_PATH = path.join(process.cwd(), "data_store.json");

// Default initial matches
const DEFAULT_MATCHES: Match[] = [
  {
    id: "sf1",
    stage: "semifinal",
    teamA: "法国",
    teamB: "西班牙",
    teamAFlag: "🇫🇷",
    teamBFlag: "🇪🇸",
    isCompleted: false,
    matchTime: "07-15 02:00",
  },
  {
    id: "sf2",
    stage: "semifinal",
    teamA: "英格兰",
    teamB: "阿根廷",
    teamAFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    teamBFlag: "🇦🇷",
    isCompleted: false,
    matchTime: "07-16 02:00",
  },
  {
    id: "playoff",
    stage: "playoff",
    teamA: "半决赛1负者",
    teamB: "半决赛2负者",
    teamAFlag: "❓",
    teamBFlag: "❓",
    isCompleted: false,
    matchTime: "07-18 22:00",
  },
  {
    id: "final",
    stage: "final",
    teamA: "半决赛1胜者",
    teamB: "半决赛2胜者",
    teamAFlag: "❓",
    teamBFlag: "❓",
    isCompleted: false,
    matchTime: "07-19 02:00",
  },
];

interface DBState {
  matches: Match[];
  rooms: Record<string, Room>;
  realChampion: string;
  realTopScorer: string;
}

// Load or initialize DB state
let state: DBState = {
  matches: [...DEFAULT_MATCHES],
  rooms: {},
  realChampion: "",
  realTopScorer: "",
};

function loadState() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const rawData = fs.readFileSync(DB_FILE_PATH, "utf8");
      state = JSON.parse(rawData);
      // Fallback matching structure if file was corrupt or outdated
      if (!state.matches || state.matches.length === 0) {
        state.matches = [...DEFAULT_MATCHES];
      }
      if (!state.rooms) {
        state.rooms = {};
      }
    } else {
      saveState();
    }
  } catch (error) {
    console.error("Error loading database file, initializing defaults", error);
    state = {
      matches: [...DEFAULT_MATCHES],
      rooms: {},
      realChampion: "",
      realTopScorer: "",
    };
  }
}

function saveState() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving database file", error);
  }
}

// Initialize database
loadState();

// Helper to find flags of teams
const TEAM_FLAGS: Record<string, string> = {
  "法国": "🇫🇷",
  "西班牙": "🇪🇸",
  "英格兰": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "阿根廷": "🇦🇷",
  "半决赛1负者": "❓",
  "半决赛2负者": "❓",
  "半决赛1胜者": "❓",
  "半决赛2胜者": "❓",
};

// Lazy initialization of Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Propagate winners and losers from semifinals to playoff & final
function propagateTournamentMatches() {
  const sf1 = state.matches.find((m) => m.id === "sf1");
  const sf2 = state.matches.find((m) => m.id === "sf2");
  const playoff = state.matches.find((m) => m.id === "playoff");
  const final = state.matches.find((m) => m.id === "final");

  if (!playoff || !final) return;

  // SF1 propagation
  if (sf1 && sf1.isCompleted && sf1.winner) {
    const winner = sf1.winner;
    const loser = winner === sf1.teamA ? sf1.teamB : sf1.teamA;
    final.teamA = winner;
    final.teamAFlag = TEAM_FLAGS[winner] || "❓";
    playoff.teamA = loser;
    playoff.teamAFlag = TEAM_FLAGS[loser] || "❓";
  } else {
    final.teamA = "半决赛1胜者";
    final.teamAFlag = "❓";
    playoff.teamA = "半决赛1负者";
    playoff.teamAFlag = "❓";
  }

  // SF2 propagation
  if (sf2 && sf2.isCompleted && sf2.winner) {
    const winner = sf2.winner;
    const loser = winner === sf2.teamA ? sf2.teamB : sf2.teamA;
    final.teamB = winner;
    final.teamBFlag = TEAM_FLAGS[winner] || "❓";
    playoff.teamB = loser;
    playoff.teamBFlag = TEAM_FLAGS[loser] || "❓";
  } else {
    final.teamB = "半决赛2胜者";
    final.teamBFlag = "❓";
    playoff.teamB = "半决赛2负者";
    playoff.teamBFlag = "❓";
  }
}

// Calculate Ranking details for a single room
function calculateRankings(roomCode: string): RankingEntry[] {
  const room = state.rooms[roomCode];
  if (!room) return [];

  const rankings: RankingEntry[] = [];

  for (const userId of Object.keys(room.users)) {
    const user = room.users[userId];
    const prediction = room.predictions[userId];

    if (!prediction) {
      rankings.push({
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        totalPoints: 0,
        correctWinnersCount: 0,
        correctScoresCount: 0,
        accuracyRate: 0,
        predictionStatus: "pending",
        isHost: !!user.isHost,
        bestPredictorType: "暂无预测",
      });
      continue;
    }

    let points = 0;
    let correctWinners = 0;
    let correctScores = 0;
    let evaluatedMatches = 0;

    // Check each match
    for (const match of state.matches) {
      if (!match.isCompleted) continue;
      evaluatedMatches++;

      const pred = prediction.matchPredictions[match.id];
      if (!pred) continue;

      const realWinner = match.winner;
      const realAScore = match.teamAScore ?? 0;
      const realBScore = match.teamBScore ?? 0;

      const predWinner = pred.winner;
      const predAScore = pred.teamAScore;
      const predBScore = pred.teamBScore;

      // Match Stage Weights
      const winnerPoints = match.stage === "final" ? 5 : 3;
      const exactScorePoints = match.stage === "final" ? 8 : 5;

      // Winner comparison
      const isWinnerCorrect = predWinner === realWinner;
      if (isWinnerCorrect) {
        points += winnerPoints;
        correctWinners++;
      }

      // Exact score comparison
      const isScoreCorrect = predAScore === realAScore && predBScore === realBScore;
      if (isScoreCorrect) {
        points += exactScorePoints;
        correctScores++;
      }
    }

    // Check Champion Prediction
    if (state.realChampion && prediction.championPrediction === state.realChampion) {
      points += 10;
    }

    // Check Top Scorer Prediction
    if (state.realTopScorer && prediction.topScorerPrediction === state.realTopScorer) {
      points += 5;
    }

    const accuracyRate = evaluatedMatches > 0 ? Math.round((correctWinners / evaluatedMatches) * 100) : 0;

    // Assign a creative predictor status
    let bestPredictorType = "懂球帝";
    if (correctScores >= 2) {
      bestPredictorType = "绿茵神算子";
    } else if (correctWinners === evaluatedMatches && evaluatedMatches > 0) {
      bestPredictorType = "全胜预言家";
    } else if (evaluatedMatches > 0 && correctWinners === 0) {
      bestPredictorType = "足球玄学大师 (反向明灯)";
    } else if (correctScores === 0 && correctWinners > 0) {
      bestPredictorType = "大方向看准者";
    } else if (evaluatedMatches === 0) {
      bestPredictorType = "热身备战中";
    }

    rankings.push({
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      totalPoints: points,
      correctWinnersCount: correctWinners,
      correctScoresCount: correctScores,
      accuracyRate,
      predictionStatus: "completed",
      isHost: !!user.isHost,
      bestPredictorType,
    });
  }

  // Sort rankings: totalPoints desc, then correctScores desc, then correctWinners desc, then nickname alphabetically
  return rankings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.correctScoresCount !== a.correctScoresCount) {
      return b.correctScoresCount - a.correctScoresCount;
    }
    return b.correctWinnersCount - a.correctWinnersCount;
  });
}

// REST API Endpoints

// Get global tournament state (matches, real extras) and list of rooms
app.get("/api/state", (req, res) => {
  res.json({
    matches: state.matches,
    realChampion: state.realChampion,
    realTopScorer: state.realTopScorer,
  });
});

// Join or Create a room
app.post("/api/room/join", (req, res) => {
  const { roomCode, nickname, avatar, userId, isHost } = req.body;

  if (!roomCode || !nickname || !avatar || !userId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const code = roomCode.toUpperCase().trim();

  // Create room if not existing
  if (!state.rooms[code]) {
    state.rooms[code] = {
      id: code,
      name: `${nickname}的世界杯预测房间`,
      users: {},
      predictions: {},
    };
  }

  const room = state.rooms[code];

  // If there are no hosts, or this user is explicitly requested to be host
  const shouldBeHost = isHost || Object.keys(room.users).length === 0;

  // Add user to room
  room.users[userId] = {
    id: userId,
    nickname,
    avatar,
    isHost: shouldBeHost,
  };

  saveState();

  const rankings = calculateRankings(code);
  res.json({
    room: room,
    rankings: rankings,
  });
});

// Fetch full details of a specific room
app.get("/api/room/:code", (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const room = state.rooms[code];

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const rankings = calculateRankings(code);
  res.json({
    room,
    rankings,
  });
});

// Submit/Update prediction for a user
app.post("/api/prediction/submit", (req, res) => {
  const { roomCode, userId, prediction } = req.body;

  if (!roomCode || !userId || !prediction) {
    return res.status(400).json({ error: "Missing roomCode, userId or prediction data" });
  }

  const code = roomCode.toUpperCase().trim();
  const room = state.rooms[code];

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (!room.users[userId]) {
    return res.status(404).json({ error: "User not found in this room" });
  }

  // Update prediction
  room.predictions[userId] = {
    userId,
    matchPredictions: prediction.matchPredictions,
    championPrediction: prediction.championPrediction,
    topScorerPrediction: prediction.topScorerPrediction,
    submittedAt: new Date().toISOString(),
  };

  saveState();

  const rankings = calculateRankings(code);
  res.json({
    room,
    rankings,
  });
});

// Admin: Update a real match's result (simulate or record score)
app.post("/api/admin/update-match", (req, res) => {
  const { matchId, teamAScore, teamBScore, winner, isCompleted } = req.body;

  const match = state.matches.find((m) => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }

  match.isCompleted = isCompleted;
  if (isCompleted) {
    match.teamAScore = Number(teamAScore);
    match.teamBScore = Number(teamBScore);
    match.winner = winner;
  } else {
    delete match.teamAScore;
    delete match.teamBScore;
    delete match.winner;
  }

  // Handle SF -> playoff / final propagation
  propagateTournamentMatches();

  saveState();

  res.json({
    matches: state.matches,
    message: "Match score updated successfully",
  });
});

// Admin: Update champion and top scorer
app.post("/api/admin/update-extras", (req, res) => {
  const { realChampion, realTopScorer } = req.body;

  state.realChampion = realChampion || "";
  state.realTopScorer = realTopScorer || "";

  saveState();

  res.json({
    realChampion: state.realChampion,
    realTopScorer: state.realTopScorer,
    message: "Tournament outcome parameters updated",
  });
});

// Admin: Reset entire platform to empty
app.post("/api/admin/reset", (req, res) => {
  state.matches = [
    {
      id: "sf1",
      stage: "semifinal",
      teamA: "法国",
      teamB: "西班牙",
      teamAFlag: "🇫🇷",
      teamBFlag: "🇪🇸",
      isCompleted: false,
      matchTime: "07-15 02:00",
    },
    {
      id: "sf2",
      stage: "semifinal",
      teamA: "英格兰",
      teamB: "阿根廷",
      teamAFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      teamBFlag: "🇦🇷",
      isCompleted: false,
      matchTime: "07-16 02:00",
    },
    {
      id: "playoff",
      stage: "playoff",
      teamA: "半决赛1负者",
      teamB: "半决赛2负者",
      teamAFlag: "❓",
      teamBFlag: "❓",
      isCompleted: false,
      matchTime: "07-18 22:00",
    },
    {
      id: "final",
      stage: "final",
      teamA: "半决赛1胜者",
      teamB: "半决赛2胜者",
      teamAFlag: "❓",
      teamBFlag: "❓",
      isCompleted: false,
      matchTime: "07-19 02:00",
    },
  ];
  state.rooms = {};
  state.realChampion = "";
  state.realTopScorer = "";

  saveState();

  res.json({
    matches: state.matches,
    message: "Platform state completely reset successfully",
  });
});

// AI Prediction helper calling Gemini API
app.post("/api/ai-predict", async (req, res) => {
  const { matchId, teamA, teamB } = req.body;

  if (!teamA || !teamB) {
    return res.status(400).json({ error: "Missing team names" });
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `你是一名资深足球战术大师、数据分析师和顶级互联网产品经理。
请分析一场世界杯淘汰赛的交手。根据两队最新的FIFA排名、球星配置、近期淘汰赛战术表现、历史交锋以及潜在的赔率偏向，生成专业有趣的足球胜负预测。
你必须严格返回以下 JSON 格式（不要有 markdown 包装，不要写 \`\`\`json 块，直接返回一个合法的 JSON 字符串，确保可以直接 JSON.parse）：
{
  "matchId": "该比赛的ID",
  "teamAWinProb": 整数 (两队胜率相加必须为100),
  "teamBWinProb": 整数,
  "recommendedScore": "X:Y (例如 '2:1' 或 '1:1')",
  "reasoning": "Markdown格式的战术解析和胜负逻辑分析，使用流利中文，幽默风趣，多用足球黑话，分析要犀利，字数约250字"
}`;

    const prompt = `请预测：半决赛/决赛交手 - 【${teamA}】 vs 【${teamB}】 (比赛ID: ${matchId})`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const predictionResult = JSON.parse(cleanedText);

    res.json(predictionResult);
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    res.status(500).json({
      error: "AI 战术助手暂时离线。请检查 GEMINI_API_KEY 配置是否正确，或稍后再试。",
      details: error.message,
    });
  }
});

// Configure Vite middleware / client-serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`World Cup Prediction Platform running on http://localhost:${PORT}`);
  });
}

startServer();
