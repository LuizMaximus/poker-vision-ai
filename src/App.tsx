import React, { useState, useMemo } from 'react';
import { TablePosition } from './utils/pokerTypes';
import { calculateFastDecision, StackDepth, GameMode } from './utils/pokerEngine';
import { CardPickerModal } from './components/CardPickerModal';
import { DecisionDisplay } from './components/DecisionDisplay';
import { Zap, RotateCcw, Swords, Coins, Trophy, Lock, Crown } from 'lucide-react';

export const App: React.FC = () => {
  // Simulador de status da conta (Futuramente virá do Banco de Dados)
  const [isProUser, setIsProUser] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [gameMode, setGameMode] = useState<GameMode>('MTT');
  const [heroHand, setHeroHand] = useState<string[]>([]);
  const [boardCards, setBoardCards] = useState<string[]>([]);
  const [position, setPosition] = useState<TablePosition>('BTN');
  const [stackDepth, setStackDepth] = useState<StackDepth>('medium');
  const [actionToHero, setActionToHero] = useState<'unopened' | 'limp' | 'raise' | '3bet'>('unopened');
  
  // Controle dos modais de cartas
  const [pickerTarget, setPickerTarget] = useState<'hero' | 'board' | null>(null);

  // Regra Tática 1: O Big Blind não pode enfrentar ação "Em Aberto" (Unopened).
  // Se estiver em Unopened e o usuário clicar em BB, mudamos a ação para Limp ou mudamos a posição.
  const handlePositionChange = (pos: TablePosition) => {
    setPosition(pos);
    if (pos === 'BB' && actionToHero === 'unopened') {
      setActionToHero('limp'); // Ajuste automático inteligente
    }
  };

  const handleActionChange = (act: 'unopened' | 'limp' | 'raise' | '3bet') => {
    setActionToHero(act);
    if (act === 'unopened' && position === 'BB') {
      setPosition('SB'); // Ajuste automático inteligente
    }
  };

  const decision = useMemo(() => {
    return calculateFastDecision({
      heroHand,
      board: boardCards,
      position,
      stackDepth,
      actionToHero,
      gameMode
    });
  }, [heroHand, boardCards, position, stackDepth, actionToHero, gameMode]);

  const resetTable = () => {
    setHeroHand([]);
    setBoardCards([]);
    setActionToHero('unopened');
  };

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    setHeroHand([]);
    setBoardCards([]);
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

  const activePositions: TablePosition[] = gameMode === 'SPIN' 
    ? ['BTN', 'SB', 'BB'] 
    : ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12 relative">
      
      {/* Top Header */}
      <header className="px-4 pt-3 pb-2 bg-[#0c2419] border-b border-emerald-800/60 shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-black text-amber-300 font-serif leading-none tracking-wide flex items-center gap-1">
                POKER VISION 
                {isProUser ? <Crown className="w-4 h-4 text-amber-400" /> : <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] rounded text-slate-400 font-sans">FREE</span>}
              </h1>
              <span className="text-[10px] text-emerald-400 font-medium">GTO Engine (0ms)</span>
            </div>
          </div>
          <button onClick={resetTable} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-xs font-semibold text-emerald-300">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>

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
        
        {/* Bloco 1: Cartas do Hero */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">1. Suas Cartas</span>
          <div
            onClick={() => {
              setHeroHand([]);
              setPickerTarget('hero');
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

        {/* NOVO BLOCO: Board (Com Paywall Pós-Flop) */}
        <div className="relative bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">2. Board (Pós-Flop)</span>
            {!isProUser && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> PRO</span>}
          </div>
          
          <div
            onClick={() => {
              if (!isProUser) {
                setShowUpgradeModal(true);
                return;
              }
              setPickerTarget('board');
            }}
            className={`flex justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer ${isProUser ? 'bg-black/40 border-emerald-700/60' : 'bg-slate-900/50 border-slate-700/50 blur-[2px]'}`}
          >
            {/* Visualização de placeholders para o Flop/Turn/River */}
            {[1, 2, 3, 4, 5].map((_, i) => {
              const c = boardCards[i];
              return c ? (
                <div key={i} className="w-11 h-16 bg-white text-slate-900 rounded-md flex flex-col items-center justify-between p-1 shadow font-bold text-sm">
                  <span className={c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}>{c[0]}</span>
                  <span className={`text-base ${c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}`}>
                    {c.includes('s') ? '♠' : c.includes('h') ? '♥' : c.includes('d') ? '♦' : '♣'}
                  </span>
                </div>
              ) : (
                <div key={i} className="w-11 h-16 bg-black/40 rounded-md border border-slate-700 flex items-center justify-center text-slate-600 text-xs">
                  {i < 3 ? 'F' : i === 3 ? 'T' : 'R'}
                </div>
              );
            })}
          </div>

          {/* Paywall Overlay */}
          {!isProUser && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[1px]">
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Lock className="w-3.5 h-3.5" />
                Desbloquear Pós-Flop
              </button>
            </div>
          )}
        </div>

        {/* Bloco 3: Stack */}
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">3. Stack Efetivo</span>
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

        {/* Bloco 4: Posição e Ação (Integrados para poupar espaço) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">4. Posição</span>
            <div className="grid grid-cols-2 gap-1.5">
              {activePositions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => handlePositionChange(pos)}
                  className={`py-1.5 rounded-lg text-xs font-black border transition-all ${
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

          <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">5. Ação</span>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'unopened', label: 'Aberto' },
                { id: 'limp', label: 'Limpers' },
                { id: 'raise', label: 'Raise / 3bet' },
              ].map((act) => (
                <button
                  key={act.id}
                  onClick={() => handleActionChange(act.id as any)}
                  className={`py-1.5 px-1 rounded-lg text-center border font-bold text-xs ${
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
        </div>

        {/* Veredito GTO */}
        <div className="mt-1 mb-8">
          <DecisionDisplay decision={decision} />
        </div>
      </main>

      {/* Modal Upgrade PRO */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-gradient-to-b from-emerald-900 to-slate-950 border border-emerald-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
            <Crown className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Desbloqueie o Pós-Flop</h2>
            <p className="text-slate-300 text-sm mb-6">
              A matemática avançada do pós-flop exige cálculo intensivo. Assine a versão PRO para ter acesso aos ranges de Flop, Turn e River com equidade exata.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  // Aqui futuramente entra a integração com a tela de pagamento
                  setIsProUser(true); 
                  setShowUpgradeModal(false);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg"
              >
                Assinar Agora (Teste Grátis)
              </button>
              <button onClick={() => setShowUpgradeModal(false)} className="text-sm font-bold text-slate-400 hover:text-white py-2">
                Continuar na versão Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cartas Reutilizável */}
      <CardPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        selectedCards={pickerTarget === 'hero' ? heroHand : boardCards}
        onSelectCard={(c) => {
          if (pickerTarget === 'hero') {
            if (heroHand.includes(c)) setHeroHand(heroHand.filter((x) => x !== c));
            else {
              const updated = [...heroHand, c];
              setHeroHand(updated);
              if (updated.length === 2) setTimeout(() => setPickerTarget(null), 150);
            }
          } else if (pickerTarget === 'board') {
            if (boardCards.includes(c)) setBoardCards(boardCards.filter((x) => x !== c));
            else {
              const updated = [...boardCards, c];
              if (updated.length <= 5) setBoardCards(updated);
            }
          }
        }}
        maxCards={pickerTarget === 'hero' ? 2 : 5}
        title={pickerTarget === 'hero' ? "Cartas do Hero" : "Cartas Comunitárias (Board)"}
      />
    </div>
  );
};

export default App;
