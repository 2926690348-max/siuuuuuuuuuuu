import React, { useState } from 'react';
import { Sparkles, Save, Check, Award, BrainCircuit, Activity, Swords, Info } from 'lucide-react';
import { Match, MatchPrediction, Prediction } from '../types';

interface PredictionFormProps {
  matches: Match[];
  onSave: (
    matchPredictions: Record<string, MatchPrediction>,
    championPrediction: string,
    topScorerPrediction: string
  ) => Promise<void>;
  existingPrediction?: Prediction;
  isSaving: boolean;
}

const CHAMPION_OPTIONS = ['西班牙', '法国', '英格兰', '阿根廷'];
const SCORER_OPTIONS = [
  '姆巴佩 (法国 🇫🇷)',
  '雅马尔 (西班牙 🇪🇸)',
  '凯恩 (英格兰 🏴󠁧󠁢󠁥󠁮󠁧󠁿)',
  '梅西 (阿根廷 🇦🇷)',
  '奥尔莫 (西班牙 🇪🇸)',
  '阿尔瓦雷斯 (阿根廷 🇦🇷)',
];

export default function PredictionForm({
  matches,
  onSave,
  existingPrediction,
  isSaving,
}: PredictionFormProps) {
  // State for match predictions
  const [matchPreds, setMatchPreds] = useState<Record<string, { teamAScore: string; teamBScore: string; winner: string }>>(() => {
    const initial: Record<string, { teamAScore: string; teamBScore: string; winner: string }> = {};
    matches.forEach((m) => {
      const exist = existingPrediction?.matchPredictions[m.id];
      initial[m.id] = {
        teamAScore: exist ? String(exist.teamAScore) : '0',
        teamBScore: exist ? String(exist.teamBScore) : '0',
        winner: exist ? exist.winner : m.teamA,
      };
    });
    return initial;
  });

  const [champion, setChampion] = useState(existingPrediction?.championPrediction || '西班牙');
  const [topScorer, setTopScorer] = useState(existingPrediction?.topScorerPrediction || '姆巴佩 (法国 🇫🇷)');

  // AI assistant loading and results state
  const [aiLoadingMatchId, setAiLoadingMatchId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    matchId: string;
    teamAWinProb: number;
    teamBWinProb: number;
    recommendedScore: string;
    reasoning: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleScoreChange = (matchId: string, team: 'A' | 'B', val: string) => {
    // Only positive integers
    const cleanVal = val.replace(/[^0-9]/g, '');
    setMatchPreds((prev) => {
      const current = { ...prev[matchId] };
      if (team === 'A') {
        current.teamAScore = cleanVal;
      } else {
        current.teamBScore = cleanVal;
      }
      return { ...prev, [matchId]: current };
    });
  };

  const handleWinnerSelect = (matchId: string, winnerName: string) => {
    setMatchPreds((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], winner: winnerName },
    }));
  };

  const handleAutoFillScores = (matchId: string, scoreA: number, scoreB: number, winner: string) => {
    setMatchPreds((prev) => ({
      ...prev,
      [matchId]: {
        teamAScore: String(scoreA),
        teamBScore: String(scoreB),
        winner,
      },
    }));
  };

  const fetchAIPrediction = async (match: Match) => {
    // Cannot predict placeholder teams
    if (match.teamA.includes('胜者') || match.teamA.includes('负者')) {
      setAiError('半决赛完赛前，AI战术大师无法对该对决进行分析。请先进行半决赛！');
      return;
    }

    setAiLoadingMatchId(match.id);
    setAiResult(null);
    setAiError(null);

    try {
      const response = await fetch('/api/ai-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          teamA: match.teamA,
          teamB: match.teamB,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '获取AI预测失败');
      }

      setAiResult(data);
      // Automatically prefill based on AI recommendation
      const recScore = data.recommendedScore || '1:1';
      const parts = recScore.split(':');
      const scoreA = parseInt(parts[0]) || 0;
      const scoreB = parseInt(parts[1]) || 0;
      const recommendedWinner = scoreA > scoreB ? match.teamA : scoreB > scoreA ? match.teamB : data.teamAWinProb >= data.teamBWinProb ? match.teamA : match.teamB;
      
      // We don't overwrite if the user already changed it, or we can offer a button. Let's offer a "采纳比分" option on the AI report card instead!
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || '网络连接失败，请稍后再试');
    } finally {
      setAiLoadingMatchId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPredictions: Record<string, MatchPrediction> = {};

    matches.forEach((m) => {
      const pred = matchPreds[m.id];
      formattedPredictions[m.id] = {
        teamAScore: Number(pred?.teamAScore || 0),
        teamBScore: Number(pred?.teamBScore || 0),
        winner: pred?.winner || m.teamA,
      };
    });

    await onSave(formattedPredictions, champion, topScorer);
  };

  return (
    <div className="space-y-6">
      {/* Introduction Alert */}
      <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start space-x-3 text-xs leading-relaxed text-yellow-500/90">
        <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-200">🔮 玩法说明：如何应对平局？</p>
          <p className="mt-1 text-slate-300">
            在淘汰赛阶段，若预测90分钟为平局（如 1:1），请额外在国旗卡片上**勾选哪个国家将通过加时赛或点球大战晋级**。
            已经开赛或完赛的赛事会自动锁定，不能再次修改预测。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Match Prediction Cards */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
            <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />
            <span>比分与晋级预测 ({matches.length} 场对决)</span>
          </h4>

          <div className="grid grid-cols-1 gap-4">
            {matches.map((m) => {
              const pred = matchPreds[m.id] || { teamAScore: '0', teamBScore: '0', winner: m.teamA };
              const isLocked = m.isCompleted;

              return (
                <div
                  key={m.id}
                  className={`bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-md transition-all ${
                    isLocked ? 'opacity-80 border-slate-900 bg-slate-900/40' : 'hover:border-slate-700'
                  }`}
                >
                  {/* Match Header Info */}
                  <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-850">
                    <span className="px-2.5 py-0.5 bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider rounded border border-slate-800">
                      {m.stage === 'semifinal' ? '🏆 半决赛' : m.stage === 'playoff' ? '🥉 季军赛' : '🔥 冠军总决赛'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">⏰ 开球时间: {m.matchTime}</span>
                  </div>

                  {/* Prediction input area */}
                  <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Team A selector card */}
                    <div className="flex-1 w-full flex items-center justify-end space-x-3.5">
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-200 block">{m.teamA}</span>
                        <span className="text-[10px] text-slate-500">Team A</span>
                      </div>
                      <button
                        type="button"
                        disabled={isLocked || m.teamA.includes('负者') || m.teamA.includes('胜者')}
                        onClick={() => handleWinnerSelect(m.id, m.teamA)}
                        className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-3xl border transition-all ${
                          pred.winner === m.teamA
                            ? 'bg-yellow-500/10 border-yellow-500 scale-105 shadow-md shadow-yellow-500/10'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                        title="点击选择该队晋级/取胜"
                      >
                        <span className="filter drop-shadow-sm">{m.teamAFlag}</span>
                        {pred.winner === m.teamA && (
                          <span className="absolute -top-1 -right-1 p-0.5 bg-yellow-500 text-slate-950 rounded-full">
                            <Check className="w-2.5 h-2.5 font-black" />
                          </span>
                        )}
                      </button>

                      {/* Score Input A */}
                      <input
                        type="text"
                        disabled={isLocked}
                        value={pred.teamAScore}
                        onChange={(e) => handleScoreChange(m.id, 'A', e.target.value)}
                        className="w-12 py-2 bg-slate-950 border border-slate-800 text-white font-mono text-center font-black text-xl rounded-lg focus:border-yellow-500 outline-none transition-all"
                      />
                    </div>

                    {/* Versus separator */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <Swords className="w-4 h-4 text-slate-500 rotate-45" />
                      <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase font-mono">VS</span>
                    </div>

                    {/* Team B selector card */}
                    <div className="flex-1 w-full flex items-center justify-start space-x-3.5">
                      {/* Score Input B */}
                      <input
                        type="text"
                        disabled={isLocked}
                        value={pred.teamBScore}
                        onChange={(e) => handleScoreChange(m.id, 'B', e.target.value)}
                        className="w-12 py-2 bg-slate-950 border border-slate-800 text-white font-mono text-center font-black text-xl rounded-lg focus:border-yellow-500 outline-none transition-all"
                      />

                      <button
                        type="button"
                        disabled={isLocked || m.teamB.includes('负者') || m.teamB.includes('胜者')}
                        onClick={() => handleWinnerSelect(m.id, m.teamB)}
                        className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-3xl border transition-all relative ${
                          pred.winner === m.teamB
                            ? 'bg-yellow-500/10 border-yellow-500 scale-105 shadow-md shadow-yellow-500/10'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                        title="点击选择该队晋级/取胜"
                      >
                        <span className="filter drop-shadow-sm">{m.teamBFlag}</span>
                        {pred.winner === m.teamB && (
                          <span className="absolute -top-1 -right-1 p-0.5 bg-yellow-500 text-slate-950 rounded-full">
                            <Check className="w-2.5 h-2.5 font-black" />
                          </span>
                        )}
                      </button>
                      <div className="text-left">
                        <span className="text-sm font-bold text-slate-200 block">{m.teamB}</span>
                        <span className="text-[10px] text-slate-500">Team B</span>
                      </div>
                    </div>

                    {/* AI Button */}
                    <div className="shrink-0 w-full md:w-auto text-center">
                      <button
                        type="button"
                        disabled={aiLoadingMatchId !== null || m.teamA.includes('胜者') || m.teamA.includes('负者')}
                        onClick={() => fetchAIPrediction(m)}
                        className="w-full md:w-auto px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 hover:text-yellow-400 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        <span>{aiLoadingMatchId === m.id ? '大师分析中...' : 'AI 战术助手'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Render inline AI tactical report if this is the active match */}
                  {aiResult && aiResult.matchId === m.id && (
                    <div className="bg-slate-950 px-5 py-4 border-t border-slate-800 text-xs space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-yellow-500 flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Gemini 3.5 AI 深度战术报告</span>
                        </span>
                        <span className="text-slate-500 uppercase tracking-widest font-bold text-[9px]">智能拟真演算</span>
                      </div>

                      {/* Win probability slider bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-bold text-[10px] text-slate-400">
                          <span>{m.teamA} 胜率: {aiResult.teamAWinProb}%</span>
                          <span>{m.teamB} 胜率: {aiResult.teamBWinProb}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                          <div className="h-full bg-yellow-500" style={{ width: `${aiResult.teamAWinProb}%` }} />
                          <div className="h-full bg-slate-700" style={{ width: `${aiResult.teamBWinProb}%` }} />
                        </div>
                      </div>

                      {/* Recommendation and adoption */}
                      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-0.5">推荐指数最高比分</span>
                          <span className="text-sm font-black text-yellow-500 font-mono">{aiResult.recommendedScore}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const scoreParts = aiResult.recommendedScore.split(':');
                            const a = parseInt(scoreParts[0]) || 0;
                            const b = parseInt(scoreParts[1]) || 0;
                            const calculatedWinner = a > b ? m.teamA : b > a ? m.teamB : aiResult.teamAWinProb >= aiResult.teamBWinProb ? m.teamA : m.teamB;
                            handleAutoFillScores(m.id, a, b, calculatedWinner);
                          }}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black rounded text-[11px] uppercase tracking-wide transition-all shadow-md"
                        >
                          采纳此推荐比分
                        </button>
                      </div>

                      {/* Tactical report texts */}
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                        {aiResult.reasoning}
                      </p>
                    </div>
                  )}

                  {isLocked && (
                    <div className="bg-slate-950/80 p-2 text-center text-[10px] font-bold text-slate-500 tracking-wider">
                      🔒 本场赛事已锁定 (真实赛果: {m.teamAScore} : {m.teamBScore} • 胜者: {m.winner})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Extras: Champion & Golden Boot */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5 shadow-md">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
            <Award className="w-4 h-4 text-yellow-500" />
            <span>终极特设预测（高区分度加分项）</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Champion Predict */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">🏅 大力神杯总冠军归属预测 (+10分)</label>
              <select
                value={champion}
                onChange={(e) => setChampion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-200 focus:text-white rounded-xl outline-none transition-all text-sm font-bold"
              >
                {CHAMPION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block">不限四强淘汰赛对决胜负，直接指定你心目中的终极冠军</span>
            </div>

            {/* Top Scorer Predict */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">👟 赛事最佳射手（金靴奖）预测 (+5分)</label>
              <select
                value={topScorer}
                onChange={(e) => setTopScorer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-200 focus:text-white rounded-xl outline-none transition-all text-sm font-bold"
              >
                {SCORER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block">四强战队中表现最好、进球最多的超级射手候选人</span>
            </div>
          </div>
        </div>

        {/* Global error block */}
        {aiError && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-center font-medium">
            ⚠️ {aiError}
          </div>
        )}

        {/* Save/Submit Action Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 text-slate-950 font-black tracking-wider text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 hover:scale-[1.01] uppercase"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="w-4.5 h-4.5" />
              <span>提交并同步终局预测预测单</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
