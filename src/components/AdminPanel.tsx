import React, { useState } from 'react';
import { RefreshCw, Check, AlertTriangle, Play, HelpCircle, Save } from 'lucide-react';
import { Match } from '../types';

interface AdminPanelProps {
  matches: Match[];
  realChampion: string;
  realTopScorer: string;
  onUpdateMatch: (
    matchId: string,
    teamAScore: number,
    teamBScore: number,
    winner: string,
    isCompleted: boolean
  ) => Promise<void>;
  onUpdateExtras: (realChampion: string, realTopScorer: string) => Promise<void>;
  onResetAll: () => Promise<void>;
}

const CHAMPION_OPTIONS = ['', '法国', '西班牙', '英格兰', '阿根廷'];
const SCORER_OPTIONS = [
  '',
  '姆巴佩 (法国 🇫🇷)',
  '雅马尔 (西班牙 🇪🇸)',
  '凯恩 (英格兰 🏴󠁧󠁢󠁥󠁮󠁧󠁿)',
  '梅西 (阿根廷 🇦🇷)',
  '奥尔莫 (西班牙 🇪🇸)',
  '阿尔瓦雷斯 (阿根廷 🇦🇷)',
];

export default function AdminPanel({
  matches,
  realChampion,
  realTopScorer,
  onUpdateMatch,
  onUpdateExtras,
  onResetAll,
}: AdminPanelProps) {
  const [matchScores, setMatchScores] = useState<Record<string, { scoreA: string; scoreB: string; winner: string; isCompleted: boolean }>>(() => {
    const initial: Record<string, { scoreA: string; scoreB: string; winner: string; isCompleted: boolean }> = {};
    matches.forEach((m) => {
      initial[m.id] = {
        scoreA: m.teamAScore !== undefined ? String(m.teamAScore) : '0',
        scoreB: m.teamBScore !== undefined ? String(m.teamBScore) : '0',
        winner: m.winner || m.teamA,
        isCompleted: m.isCompleted,
      };
    });
    return initial;
  });

  const [champion, setChampion] = useState(realChampion);
  const [topScorer, setTopScorer] = useState(realTopScorer);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [isUpdatingExtras, setIsUpdatingExtras] = useState(false);

  const handleScoreChange = (matchId: string, team: 'A' | 'B', val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    setMatchScores((prev) => {
      const current = { ...prev[matchId] };
      if (team === 'A') {
        current.scoreA = cleanVal;
      } else {
        current.scoreB = cleanVal;
      }
      return { ...prev, [matchId]: current };
    });
  };

  const handleWinnerChange = (matchId: string, winner: string) => {
    setMatchScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], winner },
    }));
  };

  const handleStatusChange = (matchId: string, isCompleted: boolean) => {
    setMatchScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], isCompleted },
    }));
  };

  const saveMatchResult = async (matchId: string, match: Match) => {
    setUpdatingMatchId(matchId);
    try {
      const current = matchScores[matchId];
      await onUpdateMatch(
        matchId,
        Number(current.scoreA),
        Number(current.scoreB),
        current.winner,
        current.isCompleted
      );
      alert(`${match.teamA} vs ${match.teamB} 比分保存并重算成功！`);
    } catch (err) {
      console.error(err);
      alert('更新比分失败，请检查后端服务！');
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const saveExtras = async () => {
    setIsUpdatingExtras(true);
    try {
      await onUpdateExtras(champion, topScorer);
      alert('冠军及金靴真实获得者更新成功！');
    } catch (err) {
      console.error(err);
      alert('更新额外奖项失败');
    } finally {
      setIsUpdatingExtras(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Info */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-3 text-xs leading-relaxed text-amber-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <p className="font-bold text-slate-200">🛠️ 沙盘模拟控制台（所有人均可体验模拟）</p>
          <p className="mt-1">
            你可以在这里随意决定4场比赛的真实得分、冠军归属。
            **半决赛结算后，系统会自动计算决赛和季军赛的真实参赛球队！**
            排行榜会瞬间拉取数据并重新计算所有人的积分，快去模拟各种冷门比分吧！
          </p>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          📢 赛程状态判定 (4 场对决)
        </h4>

        <div className="grid grid-cols-1 gap-4">
          {matches.map((m) => {
            const current = matchScores[m.id] || { scoreA: '0', scoreB: '0', winner: m.teamA, isCompleted: false };
            const isSaving = updatingMatchId === m.id;

            return (
              <div
                key={m.id}
                className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"
              >
                {/* Stage Flag */}
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <span className="px-2 py-0.5 bg-slate-950 text-[10px] font-bold text-slate-400 rounded">
                    {m.stage === 'semifinal' ? '半决赛' : m.stage === 'playoff' ? '三四名' : '总决赛'}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {m.teamAFlag} {m.teamA} vs {m.teamBFlag} {m.teamB}
                  </span>
                </div>

                {/* Score setter and completion toggle */}
                <div className="flex flex-wrap items-center gap-4 justify-between w-full md:w-auto">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={current.scoreA}
                      onChange={(e) => handleScoreChange(m.id, 'A', e.target.value)}
                      className="w-10 py-1 bg-slate-950 border border-slate-800 text-white font-mono text-center font-bold text-sm rounded focus:border-yellow-500 outline-none"
                      placeholder="0"
                    />
                    <span className="text-slate-500 font-bold">:</span>
                    <input
                      type="text"
                      value={current.scoreB}
                      onChange={(e) => handleScoreChange(m.id, 'B', e.target.value)}
                      className="w-10 py-1 bg-slate-950 border border-slate-800 text-white font-mono text-center font-bold text-sm rounded focus:border-yellow-500 outline-none"
                      placeholder="0"
                    />
                  </div>

                  {/* Winner dropdown for ties */}
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-500">胜出者:</span>
                    <select
                      value={current.winner}
                      onChange={(e) => handleWinnerChange(m.id, e.target.value)}
                      className="bg-slate-950 text-[11px] text-slate-300 font-bold border border-slate-800 py-1 px-1.5 rounded outline-none"
                    >
                      <option value={m.teamA}>{m.teamA}</option>
                      <option value={m.teamB}>{m.teamB}</option>
                    </select>
                  </div>

                  {/* Completed status check */}
                  <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={current.isCompleted}
                      onChange={(e) => handleStatusChange(m.id, e.target.checked)}
                      className="w-4 h-4 text-yellow-500 accent-yellow-500 bg-slate-900 border-slate-800 rounded focus:ring-0 cursor-pointer"
                    />
                    <span>已踢完</span>
                  </label>

                  {/* Action Save Button */}
                  <button
                    onClick={() => saveMatchResult(m.id, m)}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 text-slate-950 rounded text-xs font-black uppercase transition-all flex items-center space-x-1 shadow-sm"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>更新</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extras Selection */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          🏅 最终奖项归属判定 (冠军 & 金靴)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">最终冠军球队</span>
            <select
              value={champion}
              onChange={(e) => setChampion(e.target.value)}
              className="w-full bg-slate-950 text-xs text-slate-300 border border-slate-800 p-2 rounded-lg outline-none font-bold"
            >
              {CHAMPION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || '暂未揭晓'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">最佳射手金靴获得者</span>
            <select
              value={topScorer}
              onChange={(e) => setTopScorer(e.target.value)}
              className="w-full bg-slate-950 text-xs text-slate-300 border border-slate-800 p-2 rounded-lg outline-none font-bold"
            >
              {SCORER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || '暂未揭晓'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={saveExtras}
          disabled={isUpdatingExtras}
          className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 text-slate-950 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]"
        >
          {isUpdatingExtras ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>确认更新世界杯最终大奖结果</span>
            </>
          )}
        </button>
      </div>

      {/* Dangerous Wipe Database */}
      <div className="bg-slate-900/50 border border-rose-500/10 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-rose-400 block">⚠️ 危险：重置所有房间和预测数据</span>
          <span className="text-[10px] text-slate-500">
            一键清空后端数据库所有的房间、用户、比分预测，恢复初始状态。
          </span>
        </div>

        {showConfirmReset ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={async () => {
                await onResetAll();
                setShowConfirmReset(false);
                alert('数据库已清空重置为初始状态！');
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold"
            >
              确认清空
            </button>
            <button
              onClick={() => setShowConfirmReset(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmReset(true)}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-rose-500 hover:text-rose-400 border border-rose-500/20 rounded text-xs font-bold transition-all"
          >
            清空所有对局数据
          </button>
        )}
      </div>
    </div>
  );
}
