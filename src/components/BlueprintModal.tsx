import React from 'react';
import { X, BookOpen, Crown, Target, Layers, Database, ShieldAlert } from 'lucide-react';
import { BLUEPRINT_DATA } from '../data/blueprint';

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlueprintModal({ isOpen, onClose }: BlueprintModalProps) {
  if (!isOpen) return null;

  const getSectionIcon = (id: string) => {
    switch (id) {
      case 'names': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'positioning': return <Target className="w-5 h-5 text-emerald-400" />;
      case 'user-flow': return <Layers className="w-5 h-5 text-indigo-400" />;
      case 'ui-ux': return <BookOpen className="w-5 h-5 text-pink-400" />;
      case 'database': return <Database className="w-5 h-5 text-cyan-400" />;
      case 'scoring': return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      default: return <BookOpen className="w-5 h-5 text-teal-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#050A18] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <BookOpen className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">产品设计白皮书 & 架构方案</h2>
              <p className="text-xs text-slate-400">资深互联网产品经理 & 全栈工程师核心规划</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-8 text-slate-300">
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-500/90">
            💡 <strong>PM小提示：</strong> 这是一个专为熟人、球迷群PK设计的轻量平台，通过强化“决赛权重”以及设计“反向毒奶称号”，既拉开了最终胜负梯度，也维持了极高的娱乐性与传播度。
          </div>

          {BLUEPRINT_DATA.map((section) => (
            <div key={section.sectionId} className="space-y-3 pb-6 border-b border-slate-800 last:border-none">
              <div className="flex items-center space-x-2 text-white font-bold text-lg border-l-4 border-yellow-500 pl-3 uppercase tracking-wider">
                {getSectionIcon(section.sectionId)}
                <span>{section.title}</span>
              </div>
              
              <div className="pl-4 text-slate-300 space-y-4 text-sm leading-relaxed whitespace-pre-line">
                {section.content.split('\n\n').map((paragraph, index) => {
                  // Bullet points
                  if (paragraph.startsWith('*')) {
                    return (
                      <ul key={index} className="list-disc pl-5 space-y-2 text-slate-300">
                        {paragraph.split('\n').map((bullet, bIndex) => (
                          <li key={bIndex} className="text-slate-300">
                            {bullet.replace(/^\*\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  // Quotes
                  if (paragraph.startsWith('>')) {
                    return (
                      <blockquote key={index} className="pl-4 border-l-4 border-slate-700 italic text-slate-400 my-2">
                        {paragraph.replace(/^>\s*/, '')}
                      </blockquote>
                    );
                  }
                  // Code block
                  if (paragraph.startsWith('```')) {
                    const cleanCode = paragraph.replace(/```[a-z]*/g, '').trim();
                    return (
                      <pre key={index} className="bg-slate-950 p-4 rounded-lg font-mono text-xs overflow-x-auto text-yellow-500 border border-slate-800 leading-normal">
                        {cleanCode}
                      </pre>
                    );
                  }

                  return (
                    <p key={index} className="text-slate-300">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black tracking-widest uppercase text-xs rounded-lg shadow-lg shadow-yellow-500/10 transition-all hover:scale-[1.01]"
          >
            阅读完毕，进入平台
          </button>
        </div>

      </div>
    </div>
  );
}
