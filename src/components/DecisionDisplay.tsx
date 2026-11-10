import React from 'react';
import { PokerDecision } from '../utils/pokerTypes';
import { Target, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';

interface DecisionDisplayProps {
  decision: PokerDecision | null;
}

export const DecisionDisplay: React.FC<DecisionDisplayProps> = ({ decision }) => {
  if (!decision) return null;

  // Define as cores e ícones baseados na ação (FOLD, CALL, RAISE, ALL-IN)
  const getStyles = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('FOLD')) {
      return {
        wrapper: 'bg-red-950/40 border-red-500/50 shadow-red-900/20',
        title: 'text-red-500',
        icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      };
    }
    if (act.includes('ALL-IN') || act.includes('RAISE')) {
      return {
        wrapper: 'bg-emerald-950/40 border-emerald-400/50 shadow-emerald-900/20',
        title: 'text-emerald-400',
        icon: <Zap className="w-6 h-6 text-emerald-400" />,
      };
    }
    return {
      wrapper: 'bg-blue-950/40 border-blue-400/50 shadow-blue-900/20',
      title: 'text-blue-400',
      icon: <ShieldCheck className="w-6 h-6 text-blue-400" />,
    };
  };

  const styles = getStyles(decision.action);

  return (
    <div className={`mt-3 p-5 rounded-2xl border-2 shadow-xl backdrop-blur-sm transition-all ${styles.wrapper}`}>
      
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          {styles.icon}
          <h2 className={`text-3xl font-black tracking-tight ${styles.title}`}>
            {decision.action}
          </h2>
        </div>
        
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
            Sizing Ideal
          </span>
          <span className="text-base font-bold text-slate-200 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
            {decision.sizing}
          </span>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <div className="mt-1">
          <Target className="w-5 h-5 text-amber-400/70" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80 block mb-1">
            Justificativa Tática (GTO)
          </span>
          <p className="text-sm font-medium text-slate-300 leading-relaxed">
            {decision.rationale}
          </p>
        </div>
      </div>

    </div>
  );
};
