import React, { useState, useMemo } from 'react';
import { TablePosition } from './utils/pokerTypes';
import { calculateFastDecision, StackDepth } from './utils/pokerEngine';
import { CardPickerModal } from './components/CardPickerModal';
import { DecisionDisplay } from './components/DecisionDisplay';
import { Zap, RotateCcw } from 'lucide-react';

export const App: React.FC = () => {
  // Inicia vazio para forçar a escolha da mão real
  const [heroHand, setHeroHand] = useState<string[]>([]);
  const [position, setPosition] = useState<TablePosition>('BTN');
  const [stackDepth, setStackDepth] = useState<StackDepth>('medium');
  const [actionToHero, setActionToHero] = useState<'unopened' | 'limp' | 'raise' | '3bet'>('unopened');
  const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);

  // Cálculo instantâneo
  const decision = useMemo(() => {
    return calculateFastDecision({
      heroHand,
      position,
      stackDepth,
      actionToHero,
    });
  }, [heroHand, position, stackDepth, actionToHero]);

  const resetTable = () => {
    setHeroHand([]);
    setPosition('BTN');
    setStackDepth('medium');
    setActionToHero('unopened');
  };

  const positions: TablePosition[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      {/* Top Header */}
      <header className="px-4 py-3 bg-[#0c2419] border-b border-emerald-800/60 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-black text-amber-300 font-serif leading-none tracking-wide">
              POKER VISION GTO
            </h1>
            <span className="text-[10px] text-emerald-400 font-medium">Modo Tático Manual (0ms)</span>
          </div>
        </div>

        <button
          onClick={resetTable}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-xs font-semibold text-emerald-300 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </button>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-3 max-w-md mx-auto w-full flex flex-col gap-3">
        
        {/* Bloco 1: A Mão do Hero */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              1. Suas Cartas (Hero)
            </span>
          </div>

          <div
            onClick={() => {
              setHeroHand([]); // Limpa as cartas imediatamente ao clicar para trocar
              setIsCardPickerOpen(true);
            }}
            className="flex items-center justify-center gap-3 p-3 bg-black/40 rounded-xl border border-dashed border-emerald-700/60 hover:border-amber-400 cursor-pointer active:scale-95 transition-all"
          >
            {heroHand.length === 2 ? (
              heroHand.map((c, i) => (
                <div
                  key={i}
                  className="w-16 h-22 bg-white text-slate-900 rounded-lg flex flex-col items-center justify-between p-1.5 shadow-md font-bold text-lg"
                >
                  <span className={c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}>
                    {c[0]}
                  </span>
                  <span className={`text-2xl ${c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}`}>
                    {c.includes('s') ? '♠' : c.includes('h') ? '♥' : c.includes('d') ? '♦' : '♣'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-amber-400 font-bold text-sm flex items-center gap-2">
                <span>Toque aqui para escolher suas 2 cartas</span>
              </div>
            )}
          </div>
        </div>

        {/* Bloco 2: Faixa de Stack */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">
            2. Tamanho do Stack
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'LOW STACK', sub: '≤ 15 BBs' },
              { id: 'medium', label: 'MEDIUM', sub: '20 - 45 BBs' },
              { id: 'deep', label: 'DEEP STACK', sub: '50+ BBs' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStackDepth(s.id as StackDepth)}
                className={`py-2 px-1 rounded-xl text-center border font-bold transition-all ${
                  stackDepth === s.id
                    ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-md shadow-amber-400/20 scale-[1.02]'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-slate-300 hover:bg-emerald-900/40'
                }`}
              >
                <div className="text-[11px] leading-tight">{s.label}</div>
                <div className={`text-[9px] mt-0.5 ${stackDepth === s.id ? 'text-slate-900 font-medium' : 'text-emerald-400/70'}`}>
                  {s.sub}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bloco 3: Posição */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">
            3. Sua Posição (Hero)
          </span>
          <div className="grid grid-cols-6 gap-1.5">
            {positions.map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={`py-2 rounded-xl text-xs font-black border transition-all ${
                  position === pos
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md scale-105'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-slate-300 hover:bg-emerald-900/40'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Bloco 4: Ação */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">
            4. Ação Prévia da Mesa
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'unopened', label: 'Em Aberto', desc: 'Nenhum raise' },
              { id: 'limp', label: 'Limpers', desc: 'Pagaram o BB' },
              { id: 'raise', label: 'Houve Raise', desc: 'Aposta ativa' },
            ].map((act) => (
              <button
                key={act.id}
                onClick={() => setActionToHero(act.id as any)}
                className={`py-2 px-1 rounded-xl text-center border font-bold transition-all ${
                  actionToHero === act.id
                    ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-slate-300 hover:bg-emerald-900/40'
                }`}
              >
                <div className="text-[11px] leading-tight">{act.label}</div>
                <div className={`text-[9px] mt-0.5 ${actionToHero === act.id ? 'text-slate-900' : 'text-emerald-400/70'}`}>
                  {act.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Veredito */}
        <div className="mt-1">
          <DecisionDisplay decision={decision} />
        </div>
      </main>

      {/* Modal Inteligente de Cartas */}
      <CardPickerModal
        isOpen={isCardPickerOpen}
        onClose={() => setIsCardPickerOpen(false)}
        selectedCards={heroHand}
        onSelectCard={(c) => {
          if (heroHand.includes(c)) {
            setHeroHand(heroHand.filter((x) => x !== c)); // Remove se já estiver selecionada
          } else {
            const updated = [...heroHand, c];
            setHeroHand(updated);
            
            // Quando a 2ª carta for escolhida, fecha o modal automaticamente com um pequeno delay visual
            if (updated.length === 2) {
              setTimeout(() => setIsCardPickerOpen(false), 150);
            }
          }
        }}
        maxCards={2}
        title="Selecione Suas 2 Cartas"
      />
    </div>
  );
};

export default App;
