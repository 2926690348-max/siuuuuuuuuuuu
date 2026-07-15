export interface Match {
  id: string; // "sf1", "sf2", "playoff", "final"
  stage: 'semifinal' | 'playoff' | 'final';
  teamA: string; // e.g., "法国" or "半决赛1胜者"
  teamB: string;
  teamAFlag: string;
  teamBFlag: string;
  teamAScore?: number;
  teamBScore?: number;
  winner?: string; // team name
  isCompleted: boolean;
  matchTime: string;
}

export interface MatchPrediction {
  teamAScore: number;
  teamBScore: number;
  winner: string; // predicted winner (to handle draws leading to penalties)
}

export interface Prediction {
  userId: string;
  matchPredictions: Record<string, MatchPrediction>; // matchId -> prediction
  championPrediction: string; // team name
  topScorerPrediction: string; // player name
  submittedAt: string;
}

export interface User {
  id: string;
  nickname: string;
  avatar: string; // emoji or icon identifier
  isHost?: boolean;
}

export interface Room {
  id: string; // room code
  name: string;
  users: Record<string, User>;
  predictions: Record<string, Prediction>; // userId -> prediction
}

export interface RankingEntry {
  userId: string;
  nickname: string;
  avatar: string;
  totalPoints: number;
  correctWinnersCount: number; // Correct winner predictions
  correctScoresCount: number; // Correct exact score predictions
  accuracyRate: number; // percentage of correct winners out of completed matches
  predictionStatus: 'pending' | 'completed';
  isHost: boolean;
  bestPredictorType: string; // e.g., "神算子", "反向灯塔", "稳健选手"
}

export interface AIAnalysisRequest {
  matchId: string;
  teamA: string;
  teamB: string;
}

export interface AIAnalysisResponse {
  matchId: string;
  teamAWinProb: number;
  teamBWinProb: number;
  recommendedScore: string;
  reasoning: string;
}
