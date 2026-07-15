import React, { useState } from 'react';
import { Trophy, HelpCircle, UserPlus, Sparkles, BookOpen } from 'lucide-react';

interface RoomJoinProps {
  onJoin: (nickname: string, avatar: string, roomCode: string, isHost: boolean) => void;
  isLoading: boolean;
  onOpenBlueprint: () => void;
}

const AVATAR_OPTIONS = [
  { emoji: '⚽', label: '皮球' },
  { emoji: '🏆', label: '大力神杯' },
  { emoji: '👑', label: '皇冠' },
  { emoji: '🇫🇷', label: '高卢雄鸡' },
  { emoji: '🇪🇸', label: '斗牛士' },
  { emoji: '🇦🇷', label: '潘帕斯雄鹰' },
  { emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', label: '三狮军团' },
  { emoji: '⚡', label: '闪电' },
  { emoji: '🦁', label: '雄狮' },
  { emoji: '🦉', label: '猫头鹰' },
  { emoji: '🐯', label: '猛虎' },
  { emoji: '💎', label: '钻石' },
];

export default function RoomJoin({ onJoin, isLoading, onOpenBlueprint }: RoomJoinProps) {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('⚽');
  const [roomCode, setRoomCode] = useState('FW2026');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = nickname.trim();
    const cleanRoom = roomCode.trim().toUpperCase();

    if (!cleanName) {
      setError('请输入一个响亮的预测昵称！');
      return;
    }

    if (!cleanRoom) {
      setError('请输入要加入或创建的房间号！');
      return;
    }

    onJoin(cleanName, selectedAvatar, cleanRoom, isHost);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
      {/* Decorative Top Banner */}
      <div className="bg-gradient-to-br from-[#050A18] via-slate-950 to-slate-900 p-6 text-center relative border-b border-slate-800">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600"></div>
        <div className="absolute top-3 right-3">
          <button
            type="button"
            onClick={onOpenBlueprint}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-yellow-500 border border-slate-800 rounded-lg text-xs font-semibold backdrop-blur-sm transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>设计白皮书</span>
          </button>
        </div>
        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-pulse">
          <Trophy className="w-9 h-9 text-slate-950" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white uppercase">World Cup Oracle</h1>
        <p className="text-yellow-500 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">THE FINAL FOUR • SOCIAL SANDBOX</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-[#050A18]/40">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Room Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center justify-between">
            <span>房间邀请码 (Room Code)</span>
            <span className="text-[10px] text-yellow-500 font-bold tracking-widest">支持输入任意代码创建新房</span>
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="例如: FW2026, BEST-FRIENDS"
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 text-white font-bold rounded-xl outline-none transition-all text-center tracking-widest text-lg"
          />
        </div>

        {/* Nickname Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            预测玩家昵称
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="例如: 预言帝梅西、办公室反向神医"
            maxLength={16}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 text-white rounded-xl outline-none transition-all"
          />
        </div>

        {/* Avatar Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-1">
            选择你的绿茵本命头像
          </label>
          <div className="grid grid-cols-6 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt.emoji}
                type="button"
                onClick={() => setSelectedAvatar(opt.emoji)}
                className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all ${
                  selectedAvatar === opt.emoji
                    ? 'bg-yellow-500/10 border-2 border-yellow-500 scale-110 shadow-lg shadow-yellow-500/10'
                    : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                }`}
                title={opt.label}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Option to create as simulated host */}
        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">我是创建者/房东</span>
            <span className="text-[10px] text-slate-500">拥有管理和模拟比赛比分的权限</span>
          </div>
          <input
            type="checkbox"
            checked={isHost}
            onChange={(e) => setIsHost(e.target.checked)}
            className="w-4.5 h-4.5 text-yellow-500 accent-yellow-500 bg-slate-900 border-slate-800 rounded focus:ring-0 cursor-pointer"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 text-slate-950 font-black tracking-wide uppercase rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30 hover:scale-[1.01]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>创建/加入房间并预测</span>
            </>
          )}
        </button>

        {/* Footnote */}
        <p className="text-[10px] text-slate-500 text-center flex items-center justify-center space-x-1 uppercase font-bold tracking-wider">
          <Sparkles className="w-3 h-3 text-yellow-500/60 animate-pulse" />
          <span>支持多浏览器多好友异地同房对决</span>
        </p>
      </form>
    </div>
  );
}
