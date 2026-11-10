import React from 'react';
import { parseCard, SUIT_INFO } from '../utils/pokerEngine';

interface CardViewProps {
  cardStr?: string | null;
  size?: 'sm' | 'md' | 'lg';
  isHero?: boolean;
  emptyLabel?: string;
  onClick?: () => void;
  onRemove?: () => void;
  interactive?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  cardStr,
  size = 'md',
  isHero = false,
  emptyLabel = '+ Carta',
  onClick,
  onRemove,
  interactive = true,
}) => {
  const parsed = cardStr ? parseCard(cardStr) : null;

  // Dimensions
  const sizeClasses = {
    sm: 'w-11 h-16 text-xs',
    md: 'w-16 h-24 text-sm',
    lg: 'w-20 h-28 text-base',
  }[size];

  if (!parsed) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={emptyLabel}
        className={`${sizeClasses} rounded-xl border-2 border-dashed border-emerald-600/40 bg-emerald-950/20 hover:border-amber-400 hover:bg-emerald-900/30 flex flex-col items-center justify-center text-emerald-400/80 transition-all cursor-pointer group`}
      >
        <span className="text-xl group-hover:scale-125 transition-transform text-amber-400">+</span>
        <span className="text-[10px] uppercase tracking-wider font-semibold group-hover:text-amber-300">
          {emptyLabel}
        </span>
      </button>
    );
  }

  const suitData = SUIT_INFO[parsed.suit];
  const displayRank = parsed.rank === 'T' ? '10' : parsed.rank;

  return (
    <div className="relative group select-none">
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        aria-label={`Carta ${displayRank} de ${suitData.name}`}
        className={`${sizeClasses} relative rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 shadow-lg shadow-black/40 border border-slate-200/90 flex flex-col justify-between p-1.5 overflow-hidden transition-all duration-150 ${
          interactive ? 'hover:-translate-y-1 hover:shadow-amber-400/30 hover:border-amber-400 cursor-pointer' : ''
        } ${isHero ? 'ring-2 ring-amber-400/70 shadow-amber-500/20' : ''}`}
      >
        {/* Subtle card sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Top-left corner */}
        <div className="flex flex-col items-center leading-none z-10 w-fit">
          <span className={`font-black font-mono tracking-tighter ${suitData.colorClass}`}>
            {displayRank}
          </span>
          <span className={`text-[11px] leading-tight font-bold ${suitData.colorClass}`}>
            {suitData.symbol}
          </span>
        </div>

        {/* Center suit watermark/pip */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-90 z-0">
          <span className={`text-2xl md:text-3xl font-black ${suitData.colorClass}`}>
            {suitData.symbol}
          </span>
        </div>

        {/* Bottom-right corner (inverted) */}
        <div className="flex flex-col items-center leading-none z-10 w-fit self-end rotate-180">
          <span className={`font-black font-mono tracking-tighter ${suitData.colorClass}`}>
            {displayRank}
          </span>
          <span className={`text-[11px] leading-tight font-bold ${suitData.colorClass}`}>
            {suitData.symbol}
          </span>
        </div>
      </button>

      {/* Optional quick remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remover carta ${displayRank} de ${suitData.name}`}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer opacity-80 hover:opacity-100 z-20"
        >
          ×
        </button>
      )}
    </div>
  );
};
