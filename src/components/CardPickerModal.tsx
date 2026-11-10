import React, { useState } from 'react';
import { Rank, Suit } from '../utils/pokerTypes';
import { SUIT_INFO } from '../utils/pokerEngine';

interface CardPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: (cardRaw: string) => void;
  alreadySelectedCards: string[];
  title?: string;
}

const ALL_RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const ALL_SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export const CardPickerModal: React.FC<CardPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCard,
  alreadySelectedCards,
  title = 'Selecionar Carta',
}) => {
  const [selectedRank, setSelectedRank] = useState<Rank>('A');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-picker-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-gradient-to-b from-[#0c2419] to-[#06140e] border border-amber-400/30 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-800/50">
          <div>
            <h3 id="card-picker-title" className="text-lg font-bold text-amber-300 font-serif">
              {title}
            </h3>
            <p className="text-xs text-emerald-300/70">Escolha o valor e o naipe da carta</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar seletor de cartas"
            className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-700/60 hover:bg-emerald-900 text-slate-300 flex items-center justify-center font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 1. Rank selector */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-2 block">
            1. Valor da Carta (Rank)
          </span>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {ALL_RANKS.map((r) => {
              const isSelected = selectedRank === r;
              const displayRank = r === 'T' ? '10' : r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRank(r)}
                  className={`py-2 rounded-lg font-bold font-mono text-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40 scale-105 ring-2 ring-white/50'
                      : 'bg-emerald-950/60 border border-emerald-700/50 text-slate-200 hover:bg-emerald-800/60'
                  }`}
                >
                  {displayRank}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Suit selector with currently selected rank */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-2 block">
            2. Toque no Naipe para confirmar
          </span>
          <div className="grid grid-cols-2 gap-3">
            {ALL_SUITS.map((s) => {
              const suitInfo = SUIT_INFO[s];
              const cardStr = `${selectedRank}${s}`;
              const isUsed = alreadySelectedCards.includes(cardStr);
              const displayRank = selectedRank === 'T' ? '10' : selectedRank;

              return (
                <button
                  key={s}
                  type="button"
                  disabled={isUsed}
                  onClick={() => {
                    if (!isUsed) {
                      onSelectCard(cardStr);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isUsed
                      ? 'opacity-30 bg-black/40 border-slate-800 cursor-not-allowed'
                      : 'bg-white hover:scale-[1.02] border-slate-200 hover:border-amber-400 shadow-md hover:shadow-amber-400/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-black ${isUsed ? 'text-slate-600' : suitInfo.colorClass}`}>
                      {suitInfo.symbol}
                    </span>
                    <div className="text-left">
                      <div className={`font-bold text-sm ${isUsed ? 'text-slate-500' : 'text-slate-900'}`}>
                        {suitInfo.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isUsed ? 'Já em jogo' : `${displayRank} de ${suitInfo.name}`}
                      </div>
                    </div>
                  </div>
                  <span className={`text-lg font-black font-mono ${isUsed ? 'text-slate-500' : suitInfo.colorClass}`}>
                    {displayRank}{suitInfo.symbol}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-emerald-400/60">
          Baralho padrão de 52 cartas Texas Hold'em
        </div>
      </div>
    </div>
  );
};
