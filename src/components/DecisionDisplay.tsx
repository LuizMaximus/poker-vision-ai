import React from 'react';
import { PokerDecision } from '../utils/pokerTypes';
import { Target, TrendingUp, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  decision: PokerDecision | null;
}

export const DecisionDisplay: React.FC<Props> = ({ decision }) => {
  if (!decision) return null;

  const isWait = decision.action === 'AGUARDANDO';
  const isFold = decision.action.includes('FOLD');
  const isRaise = decision.action.includes('RAISE') || decision.action.includes('ALL-IN');
  const isCall = decision.action.includes('CALL');

  // Cores dinâmicas baseadas na ação
  const bgColors = isWait ? 'from-slate-900 to-[#05140e]' : isFold ? 'from-red-950/40 to-[#05140e]' : isRaise ? 'from-emerald-900/40 to-[#05140e]' : 'from-blue-900/40 to-[#05140e]';
  const borderColors = isWait ? 'border-emerald-900/40' : isFold ? 'border-red-900/50' : isRaise ? 'border-emerald-500/50' : 'border-blue-500/50';
  const textColors = isWait ? 'text-slate-400' : isFold ? 'text-red-400' : isRaise ? 'text-emerald-400' : 'text-blue-400';
  const shadow = isRaise ? 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' : isFold ? 'shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'shadow-lg';

  const ActionIcon = isWait ? Zap : isFold ? AlertTriangle : isRaise ? TrendingUp : ShieldCheck;

  return (
    <div className={`w-full rounded-[2rem] p-6 border bg-gradient-to-b ${bgColors} ${borderColors} ${shadow} animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden`}>
      {/* Efeito de brilho no fundo */}
      {!isWait && <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent ${isFold ? 'via-red-500' : isRaise ? 'via-emerald-500' : 'via-blue-500'} to-transparent opacity-50`}></div>}
      
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Ação Recomendada (GTO)</span>
          <div className={`text-3xl font-black ${textColors} flex items-center gap-3 tracking-tight`}>
            {decision.action}
            {!isWait && <ActionIcon className="w-7 h-7 opacity-80" />}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Confiança</span>
          <div className="text-xl font-black text-white">
            {isWait ? '-' : `${(decision.confidence * 100).toFixed(0)}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Sizing (Tamanho)</span>
          <span className="text-sm font-bold text-amber-400">{decision.sizing}</span>
        </div>
        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">EV / Risco</span>
          <span className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-slate-500" /> {decision.riskLevel}
          </span>
        </div>
      </div>

      <div className="bg-black/20 rounded-xl p-4 border border-white/5 relative">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Justificativa da IA</span>
        <p className="text-sm text-slate-300 leading-relaxed font-medium">
          {decision.rationale}
        </p>
      </div>
    </div>
  );
};
