import React, { useState, useMemo } from 'react';
import { TablePosition } from './utils/pokerTypes';
import { calculateFastDecision, StackDepth, GameMode } from './utils/pokerEngine';
import { CardPickerModal } from './components/CardPickerModal';
import { DecisionDisplay } from './components/DecisionDisplay';
import { Zap, RotateCcw, Swords, Coins, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('MTT');
  const [heroHand, setHeroHand] = useState<string[]>([]);
  const [position, setPosition] = useState<TablePosition>('BTN');
  const [stackDepth, setStackDepth] = useState<StackDepth>('medium');
  const [actionToHero, setActionToHero] = useState<'unopened' | 'limp' | 'raise' | '3bet'>('unopened');
  const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);

  // Calcula instantaneamente enviando o GameMode selecionado
  const decision = useMemo(() => {
    return calculateFastDecision({
      heroHand,
      position,
      stackDepth,
      actionToHero,
      gameMode
    });
  }, [heroHand, position, stackDepth, actionToHero, gameMode]);

  const resetTable = () => {
    setHeroHand([]);
    setActionToHero('unopened');
  };

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    setHeroHand([]);
    // Ajustes automáticos inteligentes por modo de jogo
    if (mode === 'SPIN') {
      setPosition('BTN');
      setStackDepth('low');
    } else if (mode === 'CASH') {
      setPosition('BTN');
      setStackDepth('deep');
    } else {
      setPosition('BTN');
      setStackDepth('medium');
    }
  };

  // Se for Spin, esconde as posições iniciais (mesa 3-Max)
  const activePositions: TablePosition[] = gameMode === 'SPIN' 
    ? ['BTN', 'SB', 'BB'] 
    : ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      
      {/* Top Header */}
      <header className="px-4 pt-3 pb-2 bg-[#0c2419] border-b border-emerald-800/60 shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-black text-amber-300 font-serif leading-none tracking-wide">POKER VISION</h1>
              <span className="text-[10px] text-emerald-400 font-medium">GTO Engine (0ms)</span>
            </div>
          </div>
          <button onClick={resetTable} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-xs font-semibold text-emerald-300">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>

        {/* Abas de Modo de Jogo */}
        <div className="flex p-1 bg-black/60 rounded-xl border border-emerald-900/60">
          {[
            { id: 'CASH', label: 'CASH', icon: <Coins className="w-3.5 h-3.5" /> },
            { id: 'MTT', label: 'MTT / SNG', icon: <Trophy className="w-3.5 h-3.5" /> },
            { id: 'SPIN', label: 'SPIN & GO', icon: <Swords className="w-3.5 h-3.5" /> },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id as GameMode)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                gameMode === m.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-emerald-500/70 hover:text-emerald-300'
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-3 max-w-md mx-auto w-full flex flex-col gap-3">
        
        {/* Bloco 1: Cartas */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">1. Suas Cartas</span>
          <div
            onClick={() => {
              setHeroHand([]);
              setIsCardPickerOpen(true);
            }}
            className="flex justify-center gap-3 p-3 bg-black/40 rounded-xl border border-dashed border-emerald-700/60 cursor-pointer"
          >
            {heroHand.length === 2 ? (
              heroHand.map((c, i) => (
                <div key={i} className="w-16 h-22 bg-white text-slate-900 rounded-lg flex flex-col items-center justify-between p-1.5 shadow-md font-bold text-lg">
                  <span className={c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}>{c[0]}</span>
                  <span className={`text-2xl ${c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}`}>
                    {c.includes('s') ? '♠' : c.includes('h') ? '♥' : c.includes('d') ? '♦' : '♣'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-amber-400 font-bold text-sm">Toque para selecionar 2 cartas</div>
            )}
          </div>
        </div>

        {/* Bloco 2: Stack (com desativação visual no Spin se for muito profundo) */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">2. Stack Efetivo</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'LOW', sub: '< 15 BB' },
              { id: 'medium', label: 'MEDIUM', sub: '20-45 BB' },
              { id: 'deep', label: 'DEEP', sub: '50+ BB' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStackDepth(s.id as StackDepth)}
                className={`py-2 px-1 rounded-xl text-center border font-bold transition-all ${
                  stackDepth === s.id
                    ? 'bg-amber-400 border-amber-300 text-slate-950 scale-[1.02]'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-slate-300'
                } ${gameMode === 'SPIN' && s.id === 'deep' ? 'opacity-30 grayscale' : ''}`}
              >
                <div className="text-[11px] leading-tight">{s.label}</div>
                <div className={`text-[9px] mt-0.5 ${stackDepth === s.id ? 'text-slate-900 font-medium' : 'text-emerald-400/70'}`}>{s.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Bloco 3: Posição (dinâmico 3-max vs 6-max) */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">3. Posição (Hero)</span>
          <div className={`grid gap-1.5 ${gameMode === 'SPIN' ? 'grid-cols-3' : 'grid-cols-6'}`}>
            {activePositions.map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={`py-2 rounded-xl text-xs font-black border transition-all ${
                  position === pos
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-slate-300'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Bloco 4: Ação */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'unopened', label: 'Aberto' },
              { id: 'limp', label: 'Limpers' },
              { id: 'raise', label: 'Teve Raise' },
            ].map((act) => (
              <button
                key={act.id}
                onClick={() => setActionToHero(act.id as any)}
                className={`py-2 px-1 rounded-xl text-center border font-bold text-xs ${
                  actionToHero === act.id
                    ? 'bg-amber-400 border-amber-300 text-slate-950'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-slate-300'
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>

        {/* Veredito GTO */}
        <div className="mt-1 mb-8">
          <DecisionDisplay decision={decision} />
        </div>
      </main>

      {/* Modal de Cartas Inteligente */}
      <CardPickerModal
        isOpen={isCardPickerOpen}
        onClose={() => setIsCardPickerOpen(false)}
        selectedCards={heroHand}
        onSelectCard={(c) => {
          if (heroHand.includes(c)) {
            setHeroHand(heroHand.filter((x) => x !== c));
          } else {
            const updated = [...heroHand, c];
            setHeroHand(updated);
            if (updated.length === 2) setTimeout(() => setIsCardPickerOpen(false), 150);
          }
        }}
        maxCards={2}
        title="Cartas do Hero"
      />
    </div>
  );
};

export default App;
