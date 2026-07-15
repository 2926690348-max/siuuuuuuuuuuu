import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Award, Flame, CheckCircle, ChevronDown, ChevronUp, Share2, Sparkles, Copy, Users } from 'lucide-react';
import { RankingEntry, Room, Match } from '../types';

interface LeaderboardProps {
  rankings: RankingEntry[];
  room: Room;
  matches: Match[];
  currentUserId: string;
}

export default function Leaderboard({ rankings, room, matches, currentUserId }: LeaderboardProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleExpand = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
    }
  };

  const copyShareLink = () => {
    const shareText = `⚽ 终哨预言家！快来加入我的世界杯终局预测房间PK！\n房间邀请码: ${room.id}\n开发环境链接: ${window.location.href}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
          badge: 'bg-yellow-500 text-slate-950 font-black shadow-[0_0_10px_rgba(234,179,8,0.3)]',
          border: 'border-l-4 border-l-yellow-500',
        };
      case 1:
        return {
          bg: 'bg-slate-300/10 border-slate-300/20 text-slate-300',
          badge: 'bg-slate-300 text-slate-950 font-black',
          border: 'border-l-4 border-l-slate-300',
        };
      case 2:
        return {
          bg: 'bg-amber-700/10 border-amber-700/20 text-amber-500',
          badge: 'bg-amber-700 text-slate-100 font-black',
          border: 'border-l-4 border-l-amber-700',
        };
      default:
        return {
          bg: 'bg-slate-950/40 border-slate-900 text-slate-400',
          badge: 'bg-slate-800 text-slate-400 font-semibold',
          border: 'border-l-2 border-l-slate-800',
        };
    }
  };

  const getPredictorTypeColor = (type: string) => {
    if (type.includes('玄学大师') || type.includes('反向')) {
      return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
    }
    if (type.includes('神算子') || type.includes('全胜')) {
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Share & Header Banner */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
            <Users className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">房间代码:</span>
              <span className="text-sm font-black text-yellow-500 tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {room.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              邀请好友输入代码加入对决，查看谁才是终局预测神算子！
            </p>
          </div>
        </div>

        <button
          onClick={copyShareLink}
          className="w-full md:w-auto px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500">分享文字已复制！</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-slate-400" />
              <span>复制房间邀请信息</span>
            </>
          )}
        </button>
      </div>

      {/* Leaderboard Chart */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-950/80 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">🏆 世界杯预测风云榜</h3>
          </div>
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">实时计算积分</span>
        </div>

        <div className="divide-y divide-slate-850">
          {rankings.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              暂无预测玩家，请先在下方创建你的昵称！
            </div>
          ) : (
            rankings.map((entry, index) => {
              const styles = getRankStyle(index);
              const isExpanded = expandedUserId === entry.userId;
              const isSelf = entry.userId === currentUserId;
              const pred = room.predictions[entry.userId];

              return (
                <div key={entry.userId} className="transition-all">
                  {/* Row Entry */}
                  <div
                    onClick={() => toggleExpand(entry.userId)}
                    className={`flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-800/50 transition-all ${styles.border} ${
                      isSelf ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Rank badge */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${styles.badge}`}>
                        {index + 1}
                      </div>

                      {/* Avatar */}
                      <span className="text-2xl filter drop-shadow-sm select-none">{entry.avatar}</span>

                      {/* User Nickname */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-200 truncate">
                            {entry.nickname}
                          </span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-[9px] font-bold">
                              我
                            </span>
                          )}
                          {entry.isHost && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold">
                              房东
                            </span>
                          )}
                        </div>
                        {/* Predictor Class Name Tag */}
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.2 border rounded-full font-medium ${getPredictorTypeColor(entry.bestPredictorType)}`}>
                            {entry.bestPredictorType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">正确率 / 比分对</span>
                        <span className="text-xs font-bold text-slate-300">
                          {entry.accuracyRate}% <span className="text-slate-500">({entry.correctScoresCount}场比分)</span>
                        </span>
                      </div>

                      <div className="text-center min-w-16 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">积分</span>
                        <span className="text-base font-black text-yellow-500 tracking-tight">
                          {entry.totalPoints}
                        </span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expansion Detail: Show actual predictions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-950 overflow-hidden border-t border-slate-900"
                      >
                        <div className="p-4 space-y-4 text-xs">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Champions */}
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                              <span className="text-slate-500 block mb-0.5 font-medium">预测冠军</span>
                              <span className="text-sm font-bold text-yellow-400">
                                {pred?.championPrediction ? `🏆 ${pred.championPrediction}` : '未指定'}
                              </span>
                            </div>
                            {/* Scorer */}
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                              <span className="text-slate-500 block mb-0.5 font-medium">预测金靴</span>
                              <span className="text-sm font-bold text-yellow-500">
                                {pred?.topScorerPrediction ? `👟 ${pred.topScorerPrediction}` : '未指定'}
                              </span>
                            </div>
                            {/* Submitted At */}
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 col-span-2">
                              <span className="text-slate-500 block mb-0.5 font-medium">提交预测时间</span>
                              <span className="text-slate-400 font-mono">
                                {pred?.submittedAt
                                  ? new Date(pred.submittedAt).toLocaleString()
                                  : '尚未提交预测'}
                              </span>
                            </div>
                          </div>

                          {/* Specific match predictions list */}
                          <div className="space-y-2">
                            <span className="text-slate-500 font-bold block uppercase tracking-wider text-[10px]">
                              📋 比分与晋级预测
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {matches.map((m) => {
                                const mPred = pred?.matchPredictions[m.id];
                                return (
                                  <div
                                    key={m.id}
                                    className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg flex items-center justify-between"
                                  >
                                    <div className="flex items-center space-x-1.5">
                                      <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] rounded text-slate-400 font-mono">
                                        {m.stage === 'semifinal' ? '半决赛' : m.stage === 'playoff' ? '季军赛' : '决赛'}
                                      </span>
                                      <span className="font-bold text-slate-300">
                                        {m.teamAFlag} {m.teamA} vs {m.teamBFlag} {m.teamB}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      {mPred ? (
                                        <div className="space-y-0.5">
                                          <div className="font-bold text-yellow-500 text-sm font-mono">
                                            {mPred.teamAScore} : {mPred.teamBScore}
                                          </div>
                                          <div className="text-[9px] text-slate-500">
                                            晋级: <span className="text-slate-300 font-semibold">{mPred.winner}</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-slate-600 font-semibold italic">未预测</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
