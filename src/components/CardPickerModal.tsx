import React from 'react';
import { X } from 'lucide-react';
import { RANKS, SUITS, SUIT_INFO } from '../utils/pokerEngine';

interface CardPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCards: string[];
  onSelectCard: (card: string) => void;
  maxCards?: number;
  title?: string;
}

export const CardPickerModal: React.FC<CardPickerModalProps> = ({
  isOpen,
  onClose,
  selectedCards,
  onSelectCard,
  maxCards = 2,
  title = "Selecione as Cartas"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#0c2419] border border-emerald-800/60 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-800/50">
          <div>
            <h3 className="text-lg font-bold text-amber-300 font-serif">{title}</h3>
            <span className="text-xs font-medium text-emerald-400">
              Selecionadas: {selectedCards.length} / {maxCards}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-slate-300 flex items-center justify-center active:bg-emerald-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grelha de Naipes e Cartas */}
        <div className="flex flex-col gap-5">
          {SUITS.map(suit => {
            const info = SUIT_INFO[suit];
            return (
              <div key={suit} className="flex flex-col gap-2">
                <div className={`flex items-center gap-2 px-1 ${info.color}`}>
                  <span className="text-xl">{info.symbol}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider">{info.name}</span>
                </div>
                
                <div className="grid grid-cols-7 gap-1.5">
                  {RANKS.map(rank => {
                    const cardStr = `${rank}${suit}`;
                    const isSelected = selectedCards.includes(cardStr);
                    
                    return (
                      <button
                        key={rank}
                        onClick={() => onSelectCard(cardStr)}
                        className={`h-11 rounded-lg font-black text-sm flex items-center justify-center transition-all border ${
                          isSelected
                            ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-md scale-[1.05]'
                            : 'bg-[#05140e] border-emerald-800/40 text-slate-200 active:bg-emerald-900/60'
                        }`}
                      >
                        {rank}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Botão Concluir */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black uppercase tracking-widest shadow-lg hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.98] transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
