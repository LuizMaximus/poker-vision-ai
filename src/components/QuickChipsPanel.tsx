import React from 'react';
import { Position, Stage, ActionToHero } from '../utils/pokerTypes';

interface QuickChipsPanelProps {
  position: Position | null;
  onPositionChange: (pos: Position) => void;
  stackBB: number | null;
  onStackChange: (stack: number) => void;
  villains: number | null;
  onVillainsChange: (count: number) => void;
  actionToHero: ActionToHero | null;
  onActionChange: (action: ActionToHero) => void;
  stage: Stage;
  onStageChange: (stage: Stage) => void;
  confidence?: {
    position: number;
    effective_stack_bb: number;
    active_villains: number;
    action_to_hero: number;
    summary?: string;
  };
}

const POSITIONS: { id: Position; label: string; desc: string }[] = [
  { id: 'UTG', label: 'UTG', desc: 'Under The Gun (Primeiro a agir)' },
  { id: 'MP', label: 'MP', desc: 'Middle Position' },
  { id: 'CO', label: 'CO', desc: 'Cutoff (Antes do Botão)' },
  { id: 'BTN', label: 'BTN', desc: 'Botão (Melhor posição)' },
  { id: 'SB', label: 'SB', desc: 'Small Blind' },
  { id: 'BB', label: 'BB', desc: 'Big Blind' },
];

const STACK_PRESETS: { value: number; label: string; tag?: string }[] = [
  { value: 10, label: '10 BB', tag: 'Push/Fold' },
  { value: 15, label: '15 BB', tag: 'Curto' },
  { value: 25, label: '25 BB', tag: 'Médio' },
  { value: 40, label: '40 BB', tag: 'Padrão' },
  { value: 75, label: '75 BB', tag: 'Fundo' },
  { value: 100, label: '100+ BB', tag: 'Deep' },
];

const VILLAINS_PRESETS: { count: number; label: string; tag: string }[] = [
  { count: 1, label: '1 Vilão', tag: 'Heads-up' },
  { count: 2, label: '2 Vilões', tag: 'Pote 3-Way' },
  { count: 3, label: '3 Vilões', tag: 'Multiway' },
  { count: 4, label: '4+ Vilões', tag: 'Multiway Cheio' },
];

const ACTIONS_PRESETS: { id: ActionToHero; label: string; desc: string }[] = [
  { id: 'unopened', label: 'Mesa Limpa', desc: 'Fold até você' },
  { id: 'limp', label: 'Com Limp(s)', desc: 'Pagaram 1 BB' },
  { id: 'raise', label: 'Enfrentando Raise', desc: 'Aumento simples' },
  { id: '3bet', label: 'Enfrentando 3-Bet', desc: 'Re-aumento' },
];

const STAGES: { id: Stage; label: string }[] = [
  { id: 'preflop', label: 'Pré-Flop' },
  { id: 'flop', label: 'Flop' },
  { id: 'turn', label: 'Turn' },
  { id: 'river', label: 'River' },
];

export const QuickChipsPanel: React.FC<QuickChipsPanelProps> = ({
  position,
  onPositionChange,
  stackBB,
  onStackChange,
  villains,
  onVillainsChange,
  actionToHero,
  onActionChange,
  stage,
  onStageChange,
  confidence,
}) => {
  return (
    <div className="flex flex-col gap-4 bg-[#0a2318]/90 border border-emerald-700/40 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
            Confirmação Rápida (1 Toque)
          </h3>
        </div>
        <span className="text-xs text-emerald-300/70 font-mono">Ajuste instantâneo</span>
      </div>

      {/* 1. Stage Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-emerald-200">Estágio da Mão</label>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {STAGES.map((s) => {
            const isSelected = stage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStageChange(s.id)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-1 ring-white/60'
                    : 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Position Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
            Sua Posição na Mesa
            {position === null && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-900/80 text-rose-200 border border-rose-700/60 font-mono">
                Selecione
              </span>
            )}
            {position !== null && confidence && confidence.position > 0.7 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 font-mono">
                IA Detectou
              </span>
            )}
          </label>
          <span className="text-[11px] text-amber-300/80 font-mono font-bold">
            {position ? position : 'Não definida'}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {POSITIONS.map((p) => {
            const isSelected = position === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPositionChange(p.id)}
                title={p.desc}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-md shadow-amber-500/40 ring-2 ring-white/60 scale-105'
                    : 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-200 hover:border-amber-400/50 hover:bg-emerald-900/50'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Effective Stack (Big Blinds) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
            Stack Efetivo
            {stackBB === null && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/80 text-amber-200 border border-amber-700/60 font-mono">
                Padrão 40 BB
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStackChange(Math.max((stackBB || 40) - 5, 5))}
              className="w-5 h-5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold hover:bg-emerald-800 flex items-center justify-center cursor-pointer"
            >
              -
            </button>
            <span className="text-xs font-mono font-bold text-amber-300">
              {stackBB ?? 40} BBs
            </span>
            <button
              type="button"
              onClick={() => onStackChange((stackBB || 40) + 5)}
              className="w-5 h-5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold hover:bg-emerald-800 flex items-center justify-center cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {STACK_PRESETS.map((st) => {
            const isSelected = stackBB === st.value;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => onStackChange(st.value)}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-md shadow-amber-500/40 ring-1 ring-white/60'
                    : 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-200 hover:border-amber-400/50 hover:bg-emerald-900/50'
                }`}
              >
                <span>{st.label}</span>
                {st.tag && (
                  <span className={`text-[9px] uppercase tracking-tighter ${isSelected ? 'text-slate-800' : 'text-emerald-400/70'}`}>
                    {st.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Villains in Pot */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-emerald-200">
            Vilões Ativos na Mão
          </label>
          <span className="text-xs font-mono text-emerald-300">
            {villains ?? 1} oponente{(villains ?? 1) > 1 ? 's' : ''}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {VILLAINS_PRESETS.map((v) => {
            const isSelected = (villains ?? 1) === v.count;
            return (
              <button
                key={v.count}
                type="button"
                onClick={() => onVillainsChange(v.count)}
                className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-md shadow-amber-500/40 ring-1 ring-white/60'
                    : 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-200 hover:border-amber-400/50 hover:bg-emerald-900/50'
                }`}
              >
                <span>{v.label}</span>
                <span className={`text-[9px] tracking-tight ${isSelected ? 'text-slate-900 font-semibold' : 'text-emerald-400/60'}`}>
                  {v.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Action to Hero */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-emerald-200">
            Ação Prévia Observada
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {ACTIONS_PRESETS.map((a) => {
            const isSelected = (actionToHero ?? 'unopened') === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onActionChange(a.id)}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-md shadow-amber-500/40 ring-1 ring-white/60'
                    : 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-200 hover:border-amber-400/50 hover:bg-emerald-900/50'
                }`}
              >
                <span>{a.label}</span>
                <span className={`text-[10px] font-normal ${isSelected ? 'text-slate-800 font-semibold' : 'text-emerald-400/60'}`}>
                  {a.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
