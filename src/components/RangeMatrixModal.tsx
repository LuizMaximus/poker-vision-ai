import React from 'react';
import { Rank, Position } from '../utils/pokerTypes';
import { X, Check } from 'lucide-react';

interface RangeMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  heroCards: string[];
  currentPosition: Position | null;
}

const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export const RangeMatrixModal: React.FC<RangeMatrixModalProps> = ({
  isOpen,
  onClose,
  heroCards,
  currentPosition,
}) => {
  if (!isOpen) return null;

  // Determine current hero hand combo
  let heroCombo = '';
  if (heroCards.length === 2) {
    const r1 = heroCards[0][0].toUpperCase() as Rank;
    const s1 = heroCards[0][1].toLowerCase();
    const r2 = heroCards[1][0].toUpperCase() as Rank;
    const s2 = heroCards[1][1].toLowerCase();

    const idx1 = RANKS.indexOf(r1);
    const idx2 = RANKS.indexOf(r2);

    if (idx1 !== -1 && idx2 !== -1) {
      const highRank = idx1 <= idx2 ? r1 : r2;
      const lowRank = idx1 <= idx2 ? r2 : r1;
      const isPair = highRank === lowRank;
      const isSuited = s1 === s2;
      heroCombo = isPair ? `${highRank}${lowRank}` : `${highRank}${lowRank}${isSuited ? 's' : 'o'}`;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="matrix-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-xl bg-gradient-to-b from-[#0c261a] to-[#06140e] border border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-2xl text-slate-100 flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-emerald-800/60">
          <div>
            <h3 id="matrix-title" className="text-base sm:text-lg font-bold text-amber-300 font-serif">
              Matriz de Ranges 13x13 (Texas Hold'em GTO)
            </h3>
            <p className="text-xs text-emerald-300/70">
              Posição atual: <span className="font-bold text-amber-400">{currentPosition || 'BTN'}</span>
              {heroCombo && (
                <>
                  {' '}• Sua Mão: <span className="font-bold text-amber-300 bg-black/40 px-1.5 py-0.5 rounded border border-amber-400/30">{heroCombo}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar matriz"
            className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 bg-black/30 p-2 rounded-xl flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400" />
            <span>Pares (Diagonal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600" />
            <span>Suited 's' (Topo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-700" />
            <span>Offsuit 'o' (Fundo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded ring-2 ring-amber-300 bg-rose-600" />
            <span>Sua Mão</span>
          </div>
        </div>

        {/* 13x13 Grid */}
        <div className="grid grid-cols-13 gap-0.5 sm:gap-1 text-center font-mono select-none overflow-x-auto pb-1">
          {RANKS.map((r1, i) =>
            RANKS.map((r2, j) => {
              const isPair = i === j;
              const isSuited = i < j;
              const comboName = isPair ? `${r1}${r2}` : isSuited ? `${r1}${r2}s` : `${r2}${r1}o`;
              const isHeroMatch = heroCombo === comboName;

              let cellColor = 'bg-slate-800/80 text-slate-300';
              if (isPair) cellColor = 'bg-amber-500/80 text-slate-950 font-black';
              else if (isSuited) cellColor = 'bg-emerald-700/70 text-emerald-100';
              else cellColor = 'bg-slate-800/60 text-slate-400';

              if (isHeroMatch) {
                cellColor = 'bg-rose-600 text-white font-black ring-2 ring-amber-300 scale-110 z-10 shadow-lg';
              }

              return (
                <div
                  key={`${r1}-${r2}`}
                  title={comboName}
                  className={`aspect-square flex items-center justify-center rounded-[3px] sm:rounded text-[9px] sm:text-[11px] transition-all ${cellColor}`}
                >
                  {comboName}
                </div>
              );
            })
          )}
        </div>

        <div className="text-center text-[11px] text-emerald-400/70 pt-1">
          Ranges calibrados para limites padrão de Texas Hold'em No-Limit Cash e Torneios.
        </div>
      </div>
    </div>
  );
};
