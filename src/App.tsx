import React, { useState, useEffect } from 'react';
import { Trophy, Swords, Settings, BookOpen, AlertCircle, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import RoomJoin from './components/RoomJoin';
import Leaderboard from './components/Leaderboard';
import PredictionForm from './components/PredictionForm';
import AdminPanel from './components/AdminPanel';
import BlueprintModal from './components/BlueprintModal';
import { Match, Room, Prediction, RankingEntry, MatchPrediction } from './types';

export default function App() {
  // User Authentication / Local Storage cache
  const [userId, setUserId] = useState<string>(() => {
    const saved = localStorage.getItem('wc_user_id');
    if (saved) return saved;
    const newId = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('wc_user_id', newId);
    return newId;
  });

  const [nickname, setNickname] = useState(() => localStorage.getItem('wc_nickname') || '');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('wc_avatar') || '⚽');
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('wc_room_code') || '');
  const [isHost, setIsHost] = useState(() => localStorage.getItem('wc_is_host') === 'true');

  // App States
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'prediction' | 'admin'>('leaderboard');
  const [matches, setMatches] = useState<Match[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [realChampion, setRealChampion] = useState('');
  const [realTopScorer, setRealTopScorer] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPrediction, setIsSavingPrediction] = useState(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load state and rooms if user has room cached
  useEffect(() => {
    fetchGlobalState();
    if (roomCode) {
      fetchRoomDetails(roomCode);
    }
  }, [roomCode]);

  // Dynamic status notifications timer
  useEffect(() => {
    if (feedbackMsg) {
      const t = setTimeout(() => setFeedbackMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedbackMsg]);

  // Polling rankings/room details every 10 seconds for real-time multiplayer feel
  useEffect(() => {
    if (!roomCode) return;
    const interval = setInterval(() => {
      fetchRoomDetails(roomCode, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [roomCode]);

  const fetchGlobalState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches);
        setRealChampion(data.realChampion);
        setRealTopScorer(data.realTopScorer);
      }
    } catch (err) {
      console.error('Error fetching global state', err);
    }
  };

  const fetchRoomDetails = async (code: string, isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetch(`/api/room/${code}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        setRankings(data.rankings);
      } else {
        // If room cached locally was reset/deleted on server, logout
        if (res.status === 404) {
          handleLogOut();
        }
      }
    } catch (err) {
      console.error('Error fetching room', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleJoinRoom = async (name: string, icon: string, code: string, hostFlag: boolean) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: code,
          nickname: name,
          avatar: icon,
          userId,
          isHost: hostFlag,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '加入房间失败');
      }

      // Save to local state and storage
      setNickname(name);
      setAvatar(icon);
      setRoomCode(code);
      setIsHost(hostFlag);
      localStorage.setItem('wc_nickname', name);
      localStorage.setItem('wc_avatar', icon);
      localStorage.setItem('wc_room_code', code);
      localStorage.setItem('wc_is_host', hostFlag ? 'true' : 'false');

      setRoom(data.room);
      setRankings(data.rankings);
      setFeedbackMsg({ type: 'success', text: `成功加入/创建预测房间: ${code}！` });
      setActiveTab('prediction'); // Redirect to predict form on first join
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || '加入房间发生网络错误' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrediction = async (
    matchPredictions: Record<string, MatchPrediction>,
    championPrediction: string,
    topScorerPrediction: string
  ) => {
    if (!roomCode) return;
    setIsSavingPrediction(true);
    try {
      const res = await fetch('/api/prediction/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          userId,
          prediction: {
            matchPredictions,
            championPrediction,
            topScorerPrediction,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '提交预测失败');
      }

      setRoom(data.room);
      setRankings(data.rankings);
      setFeedbackMsg({ type: 'success', text: '恭喜！你的预测单已成功同步提交！' });
      setActiveTab('leaderboard'); // Switch to leaderboard to see points
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || '网络问题，保存失败！' });
    } finally {
      setIsSavingPrediction(false);
    }
  };

  const handleUpdateMatchResult = async (
    matchId: string,
    teamAScore: number,
    teamBScore: number,
    winner: string,
    isCompleted: boolean
  ) => {
    try {
      const res = await fetch('/api/admin/update-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          teamAScore,
          teamBScore,
          winner,
          isCompleted,
        }),
      });

      if (res.ok) {
        await fetchGlobalState();
        if (roomCode) {
          await fetchRoomDetails(roomCode, true);
        }
        setFeedbackMsg({ type: 'success', text: '赛果已核销，榜单正在重构分数！' });
      }
    } catch (err) {
      console.error('Error updating match', err);
    }
  };

  const handleUpdateExtras = async (championName: string, scorerName: string) => {
    try {
      const res = await fetch('/api/admin/update-extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realChampion: championName,
          realTopScorer: scorerName,
        }),
      });

      if (res.ok) {
        await fetchGlobalState();
        if (roomCode) {
          await fetchRoomDetails(roomCode, true);
        }
        setFeedbackMsg({ type: 'success', text: '大力神金杯/金靴获得者更新成功！' });
      }
    } catch (err) {
      console.error('Error updating extras', err);
    }
  };

  const handleResetAllData = async () => {
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (res.ok) {
        handleLogOut();
        await fetchGlobalState();
        setFeedbackMsg({ type: 'success', text: '后端数据库已初始化，进入初始页。' });
      }
    } catch (err) {
      console.error('Error resetting database', err);
    }
  };

  const handleLogOut = () => {
    setNickname('');
    setRoomCode('');
    setIsHost(false);
    setRoom(null);
    setRankings([]);
    localStorage.removeItem('wc_nickname');
    localStorage.removeItem('wc_avatar');
    localStorage.removeItem('wc_room_code');
    localStorage.removeItem('wc_is_host');
  };

  const currentPrediction = room?.predictions[userId];

  return (
    <div className="min-h-screen bg-[#050A18] text-slate-100 flex flex-col font-sans antialiased selection:bg-yellow-500/20 selection:text-yellow-500">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#050A18]/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)]">
              <span className="text-2xl">🏆</span>
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tighter uppercase leading-none flex items-center space-x-1.5">
                <span>World Cup Oracle</span>
                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 py-0.2 rounded font-bold tracking-widest">
                  2026世界杯
                </span>
              </h1>
              <p className="text-[10px] text-yellow-500 font-bold tracking-[0.2em] uppercase mt-0.5">THE FINAL FOUR • ROOM PLATFORM</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Design Blueprint document trigger */}
            <button
              onClick={() => setIsBlueprintOpen(true)}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">产品设计白皮书</span>
            </button>

            {roomCode && (
              <button
                onClick={handleLogOut}
                className="p-1.5 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/30 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition-all"
                title="退出当前房间"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 pb-20">
        
        {/* Dynamic global feedback popup alerts */}
        {feedbackMsg && (
          <div
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 p-3.5 rounded-xl shadow-xl flex items-center space-x-2.5 border text-xs font-bold transition-all animate-bounce ${
              feedbackMsg.type === 'success'
                ? 'bg-slate-900 border-yellow-500/20 text-yellow-500'
                : 'bg-slate-900 border-rose-500/20 text-rose-400'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-yellow-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {!roomCode ? (
          /* Join / Creation foyer screen */
          <div className="py-8">
            <RoomJoin
              onJoin={handleJoinRoom}
              isLoading={isLoading}
              onOpenBlueprint={() => setIsBlueprintOpen(true)}
            />
          </div>
        ) : (
          /* Active room workspace */
          <div className="space-y-6">
            
            {/* Room Welcome Header */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl filter drop-shadow-md select-none">{avatar}</span>
                <div>
                  <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                    <span>你好，{nickname}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 font-normal px-2 py-0.2 rounded border border-slate-700">
                      房客 ID: {userId.substring(5, 11)}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    正在对决房间: <strong className="text-yellow-500 font-bold">{room?.name || roomCode}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => fetchRoomDetails(roomCode)}
                className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                title="强制手动刷新榜单"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-yellow-500' : ''}`} />
              </button>
            </div>

            {/* Esports Grid Tabs Navigation */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-900">
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'leaderboard'
                    ? 'bg-yellow-500 text-slate-950 shadow shadow-yellow-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>预测排行榜</span>
              </button>

              <button
                onClick={() => setActiveTab('prediction')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'prediction'
                    ? 'bg-yellow-500 text-slate-950 shadow shadow-yellow-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>赛事预测表</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-yellow-500 text-slate-950 shadow shadow-yellow-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>沙盘控制台</span>
              </button>
            </div>

            {/* Rendered workspace content panel based on active tab */}
            <div className="pt-2">
              {activeTab === 'leaderboard' && (
                <Leaderboard
                  rankings={rankings}
                  room={room!}
                  matches={matches}
                  currentUserId={userId}
                />
              )}

              {activeTab === 'prediction' && (
                <PredictionForm
                  matches={matches}
                  onSave={handleSavePrediction}
                  existingPrediction={currentPrediction}
                  isSaving={isSavingPrediction}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPanel
                  matches={matches}
                  realChampion={realChampion}
                  realTopScorer={realTopScorer}
                  onUpdateMatch={handleUpdateMatchResult}
                  onUpdateExtras={handleUpdateExtras}
                  onResetAll={handleResetAllData}
                />
              )}
            </div>

          </div>
        )}
      </main>

      {/* Product Manager design blueprint Modal */}
      <BlueprintModal isOpen={isBlueprintOpen} onClose={() => setIsBlueprintOpen(false)} />

      {/* Footer Branding credits */}
      <footer className="bg-slate-950 text-slate-600 text-center text-[10px] py-4 border-t border-slate-900 shrink-0 select-none">
        <p>© 2026 绿茵神算榜 - 足球终哨对决沙盘. All Rights Reserved.</p>
        <p className="mt-0.5 text-slate-700">FIFA World Cup Special Sandbox Interactive Edition</p>
      </footer>
    </div>
  );
}
