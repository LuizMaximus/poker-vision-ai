import React from 'react';
import { CardView } from './CardView';
import { Stage } from '../utils/pokerTypes';
import { Sparkles, Edit3 } from 'lucide-react';

interface TableCardsViewProps {
  heroHand: string[];
  board: string[];
  stage: Stage;
  onCardSlotClick: (target: 'hero1' | 'hero2' | 'board', boardIndex?: number) => void;
  onRemoveCard: (target: 'hero' | 'board', index: number) => void;
  confidenceSummary?: string;
}

export const TableCardsView: React.FC<TableCardsViewProps> = ({
  heroHand,
  board,
  stage,
  onCardSlotClick,
  onRemoveCard,
  confidenceSummary,
}) => {
  // Pad board up to required count based on stage
  // Preflop: 0, Flop: 3, Turn: 4, River: 5
  const maxSlots = stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;
  const boardSlots = Array.from({ length: Math.max(maxSlots, board.length) });

  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#0e3522] via-[#092417] to-[#06150e] border-2 border-emerald-600/30 p-4 sm:p-5 shadow-2xl overflow-hidden">
      {/* Felt background ring / oval */}
      <div className="absolute inset-2 border border-emerald-500/20 rounded-[28px] pointer-events-none" />
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-32 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* 1. Community Board Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Mesa Comunitária (Board)
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-300/70 capitalize">
            {stage === 'preflop' ? 'Sem cartas (Pré-Flop)' : `${stage} (${board.length} cartas)`}
          </span>
        </div>

        {stage === 'preflop' && board.length === 0 ? (
          <div className="h-20 sm:h-24 rounded-2xl border border-dashed border-emerald-700/40 bg-emerald-950/20 flex items-center justify-center text-center p-3">
            <span className="text-xs text-emerald-400/70">
              Fase Pré-Flop: Sem cartas comunitárias. Toque em 'Flop' abaixo para abrir a mesa.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap min-h-24">
            {board.map((card, idx) => (
              <CardView
                key={`${card}-${idx}`}
                cardStr={card}
                size="md"
                onClick={() => onCardSlotClick('board', idx)}
                onRemove={() => onRemoveCard('board', idx)}
              />
            ))}
            {/* Show empty placeholder if board has fewer cards than stage slots */}
            {board.length < (stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5) && (
              <CardView
                cardStr={null}
                size="md"
                emptyLabel={`+ ${board.length === 3 ? 'Turn' : board.length === 4 ? 'River' : 'Flop'}`}
                onClick={() => onCardSlotClick('board', board.length)}
              />
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="relative my-3 flex items-center justify-center">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <span className="relative bg-[#092417] px-3 text-[10px] uppercase font-mono font-bold tracking-widest text-amber-400">
          Sua Mão
        </span>
      </div>

      {/* 2. Hero Hand Section */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-3 sm:gap-4 justify-center">
          <CardView
            cardStr={heroHand[0] || null}
            size="lg"
            isHero
            emptyLabel="+ Carta 1"
            onClick={() => onCardSlotClick('hero1')}
            onRemove={heroHand[0] ? () => onRemoveCard('hero', 0) : undefined}
          />
          <CardView
            cardStr={heroHand[1] || null}
            size="lg"
            isHero
            emptyLabel="+ Carta 2"
            onClick={() => onCardSlotClick('hero2')}
            onRemove={heroHand[1] ? () => onRemoveCard('hero', 1) : undefined}
          />
        </div>

        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-300/80">
          <Edit3 className="w-3.5 h-3.5" />
          <span>Toque em qualquer carta para alterar valor ou naipe</span>
        </div>
      </div>

      {/* AI Confidence / Status ticker if present */}
      {confidenceSummary && (
        <div className="mt-4 pt-3 border-t border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-200/90 bg-emerald-950/40 rounded-xl p-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span className="leading-snug">{confidenceSummary}</span>
        </div>
      )}
    </div>
  );
};
