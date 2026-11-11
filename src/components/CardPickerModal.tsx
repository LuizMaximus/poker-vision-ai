import React from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCards: string[];
  usedCards?: string[]; // <--- Adicionado aqui
  onSelectCard: (card: string) => void;
  maxCards: number;
  title: string;
}

const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export const CardPickerModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  selectedCards, 
  usedCards = [], 
  onSelectCard, 
  maxCards, 
  title 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="flex items-center justify-between p-4 bg-[#0c2419] border-b border-emerald-800/50 shadow-lg sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-black text-amber-400">{title}</h2>
          <span className="text-xs font-bold text-emerald-500">{selectedCards.length} / {maxCards} selecionadas</span>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-900/50 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90 transition-all">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {SUITS.map(suit => (
          <div key={suit} className="mb-6 bg-black/20 p-3 rounded-2xl border border-white/5">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
              {RANKS.map(rank => {
                const card = `${rank}${suit}`;
                const isSelected = selectedCards.includes(card);
                const isUsed = usedCards.includes(card); // <--- Verifica se está na outra seleção
                const isRed = suit === 'h' || suit === 'd';
                const suitSymbol = suit === 's' ? '♠' : suit === 'h' ? '♥' : suit === 'd' ? '♦' : '♣';
                
                return (
                  <button
                    key={card}
                    disabled={isUsed} // <--- Bloqueia o clique se já estiver em uso
                    onClick={() => onSelectCard(card)}
                    className={`relative h-16 rounded-xl flex flex-col items-center justify-center border transition-all duration-200 ${
                      isUsed 
                        ? 'bg-slate-900/40 border-slate-800 opacity-30 cursor-not-allowed' // Visual de carta indisponível
                        : isSelected 
                          ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-105 z-10 active:scale-95' 
                          : 'bg-white border-slate-300 hover:border-amber-400 hover:shadow-md active:scale-95'
                    }`}
                  >
                    <span className={`text-lg font-black leading-none ${isUsed ? 'text-slate-600' : isSelected ? 'text-slate-950' : isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {rank}
                    </span>
                    <span className={`text-xl leading-none mt-1 ${isUsed ? 'text-slate-600' : isSelected ? 'text-slate-950' : isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {suitSymbol}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none flex justify-center">
        <button 
          onClick={onClose} 
          className="pointer-events-auto w-full max-w-sm py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(5,150,105,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Confirmar Seleção
        </button>
      </div>
    </div>
  );
};
