import React, { useState, useEffect } from 'react';
import { TablePosition, PokerDecision } from './utils/pokerTypes';
import { fetchFastDecision, StackDepth, GameMode } from './utils/pokerEngine';
import { CardPickerModal } from './components/CardPickerModal';
import { DecisionDisplay } from './components/DecisionDisplay';
import { Zap, RotateCcw, Swords, Coins, Trophy, Lock, Crown, LogOut, Mail, KeyRound, Loader2 } from 'lucide-react'; // Adicionado Loader2

import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [isProUser, setIsProUser] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false); // NOVO: Estado de loading do pagamento

  const [gameMode, setGameMode] = useState<GameMode>('MTT');
  const [heroHand, setHeroHand] = useState<string[]>([]);
  const [boardCards, setBoardCards] = useState<string[]>([]);
  const [position, setPosition] = useState<TablePosition>('BTN');
  const [stackDepth, setStackDepth] = useState<StackDepth>('medium');
  const [actionToHero, setActionToHero] = useState<'unopened' | 'limp' | 'raise' | '3bet'>('unopened');
  const [pickerTarget, setPickerTarget] = useState<'hero' | 'board' | null>(null);
  const [decision, setDecision] = useState<PokerDecision | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        try {
          const userRef = doc(db, 'users', currentUser.email);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().isPro === true) setIsProUser(true);
          else setIsProUser(false);
        } catch (error) { setIsProUser(false); }
      } else setIsProUser(false);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setAuthError(err.message.includes('auth/invalid-credential') ? 'Dados incorretos.' : 'Erro ao autenticar.');
    }
  };

  // --- NOVO: FUNÇÃO QUE CHAMA O MERCADO PAGO ---
  const handlePayment = async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email })
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point; // Redireciona o utilizador para pagar!
      } else {
        alert("Erro ao conectar com a operadora de pagamentos.");
      }
    } catch (error) {
      console.error(error);
    }
    setIsCheckoutLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const getDecision = async () => {
      if (heroHand.length < 2) { setDecision({ action: 'AGUARDANDO', confidence: 0, sizing: '-', rationale: 'Selecione as 2 cartas.', evEstimate: 0, riskLevel: 'LOW' }); return; }
      setIsCalculating(true);
      const result = await fetchFastDecision({ heroHand, board: boardCards, position, stackDepth, actionToHero, gameMode });
      if (isMounted) { setDecision(result); setIsCalculating(false); }
    };
    getDecision();
    return () => { isMounted = false; };
  }, [heroHand, boardCards, position, stackDepth, actionToHero, gameMode, user]);

  const resetTable = () => { setHeroHand([]); setBoardCards([]); setActionToHero('unopened'); };
  const handlePositionChange = (pos: TablePosition) => { setPosition(pos); if (pos === 'BB' && actionToHero === 'unopened') setActionToHero('limp'); };
  const handleActionChange = (act: 'unopened' | 'limp' | 'raise' | '3bet') => { setActionToHero(act); if (act === 'unopened' && position === 'BB') setPosition('SB'); };
  const handleModeChange = (mode: GameMode) => { setGameMode(mode); setHeroHand([]); setBoardCards([]); if (mode === 'SPIN') { setPosition('BTN'); setStackDepth('low'); } else if (mode === 'CASH') { setPosition('BTN'); setStackDepth('deep'); } else { setPosition('BTN'); setStackDepth('medium'); } };
  const activePositions: TablePosition[] = gameMode === 'SPIN' ? ['BTN', 'SB', 'BB'] : ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

  if (isAuthLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Zap className="w-8 h-8 text-amber-400 animate-pulse" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-[#0c2419] border border-emerald-800/60 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center"><Zap className="w-8 h-8 text-amber-400" /></div>
          </div>
          <h1 className="text-2xl font-black text-amber-300 text-center font-serif mb-1">POKER VISION AI</h1>
          <p className="text-sm text-emerald-400/80 text-center mb-8 font-medium">O seu assistente GTO de bolso</p>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="w-5 h-5 text-emerald-600 absolute left-3 top-3.5" />
              <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#05140e] border border-emerald-800/60 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-400" required />
            </div>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-emerald-600 absolute left-3 top-3.5" />
              <input type="password" placeholder="Palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#05140e] border border-emerald-800/60 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-400" required minLength={6} />
            </div>
            {authError && <p className="text-red-400 text-xs font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all">
              {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-sm text-slate-400 hover:text-amber-400 transition-colors">
              {authMode === 'login' ? 'Não tem conta? Registe-se grátis' : 'Já tem conta? Inicie sessão'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12 relative">
      <header className="px-4 pt-3 pb-2 bg-[#0c2419] border-b border-emerald-800/60 shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${isCalculating ? 'bg-amber-400 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-amber-400/20 border-amber-400'}`}>
              <Zap className={`w-5 h-5 ${isCalculating ? 'text-slate-900 animate-pulse' : 'text-amber-400'}`} />
            </div>
            <div>
              <h1 className="text-base font-black text-amber-300 font-serif leading-none flex items-center gap-1">
                POKER VISION {isProUser ? <Crown className="w-4 h-4 text-amber-400" /> : <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] rounded text-slate-400">FREE</span>}
              </h1>
              <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[140px] block">{user.email}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetTable} className="p-2 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={() => signOut(auth)} className="p-2 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex p-1 bg-black/60 rounded-xl border border-emerald-900/60">
          {[{ id: 'CASH', label: 'CASH', icon: <Coins className="w-3.5 h-3.5" /> }, { id: 'MTT', label: 'MTT / SNG', icon: <Trophy className="w-3.5 h-3.5" /> }, { id: 'SPIN', label: 'SPIN & GO', icon: <Swords className="w-3.5 h-3.5" /> }].map(m => (
            <button key={m.id} onClick={() => handleModeChange(m.id as GameMode)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${gameMode === m.id ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-500/70 hover:text-emerald-300'}`}>{m.icon} {m.label}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-3 max-w-md mx-auto w-full flex flex-col gap-3">
        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">1. Suas Cartas</span>
          <div onClick={() => { setHeroHand([]); setPickerTarget('hero'); }} className="flex justify-center gap-3 p-3 bg-black/40 rounded-xl border border-dashed border-emerald-700/60 cursor-pointer">
            {heroHand.length === 2 ? heroHand.map((c, i) => (
              <div key={i} className="w-16 h-22 bg-white text-slate-900 rounded-lg flex flex-col items-center justify-between p-1.5 shadow-md font-bold text-lg">
                <span className={c.includes('h') || c.includes('d') ? 'text-red-600' : ''}>{c[0]}</span>
                <span className={`text-2xl ${c.includes('h') || c.includes('d') ? 'text-red-600' : ''}`}>{c.includes('s') ? '♠' : c.includes('h') ? '♥' : c.includes('d') ? '♦' : '♣'}</span>
              </div>
            )) : <div className="py-4 text-amber-400 font-bold text-sm">Selecione 2 cartas</div>}
          </div>
        </div>

        <div className="relative bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">2. Board (Pós-Flop)</span>
            {!isProUser && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded font-bold flex gap-1"><Lock className="w-3 h-3" /> PRO</span>}
          </div>
          <div onClick={() => { if (!isProUser) { setShowUpgradeModal(true); return; } setPickerTarget('board'); }} className={`flex justify-center gap-1.5 p-3 rounded-xl border border-dashed cursor-pointer ${isProUser ? 'bg-black/40 border-emerald-700/60' : 'bg-slate-900/50 border-slate-700/50 blur-[2px]'}`}>
            {[1, 2, 3, 4, 5].map((_, i) => {
              const c = boardCards[i];
              return c ? (
                <div key={i} className="w-11 h-16 bg-white text-slate-900 rounded-md flex flex-col items-center justify-between p-1 font-bold text-sm"><span className={c.includes('h') || c.includes('d') ? 'text-red-600' : ''}>{c[0]}</span><span className={c.includes('h') || c.includes('d') ? 'text-red-600' : ''}>{c.includes('s') ? '♠' : c.includes('h') ? '♥' : c.includes('d') ? '♦' : '♣'}</span></div>
              ) : <div key={i} className="w-11 h-16 bg-black/40 rounded-md border border-slate-700 flex items-center justify-center text-slate-600 text-xs">{i < 3 ? 'F' : i === 3 ? 'T' : 'R'}</div>;
            })}
          </div>
          {!isProUser && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60">
              <button onClick={() => setShowUpgradeModal(true)} className="bg-amber-500 text-slate-950 text-xs font-black px-4 py-2 rounded-full flex gap-2"><Lock className="w-3.5 h-3.5" /> Desbloquear</button>
            </div>
          )}
        </div>

        <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-2">3. Stack Efetivo</span>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'low', label: 'LOW' }, { id: 'medium', label: 'MEDIUM' }, { id: 'deep', label: 'DEEP' }].map(s => (
              <button key={s.id} onClick={() => setStackDepth(s.id as StackDepth)} className={`py-2 rounded-xl text-center border font-bold text-xs ${stackDepth === s.id ? 'bg-amber-400 text-slate-950' : 'bg-emerald-950/60 border-emerald-800/60'}`}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
            <span className="text-[11px] font-bold text-amber-300 block mb-2">4. Posição</span>
            <div className="grid grid-cols-2 gap-1.5">
              {activePositions.map(pos => <button key={pos} onClick={() => handlePositionChange(pos)} className={`py-1.5 rounded-lg text-xs font-black border ${position === pos ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950/60 border-emerald-800/60'}`}>{pos}</button>)}
            </div>
          </div>
          <div className="bg-[#05140e] border border-emerald-800/80 rounded-2xl p-3 shadow-lg">
            <span className="text-[11px] font-bold text-amber-300 block mb-2">5. Ação</span>
            <div className="flex flex-col gap-1.5">
              {[{ id: 'unopened', label: 'Aberto' }, { id: 'limp', label: 'Limpers' }, { id: 'raise', label: 'Raise' }].map(act => (
                <button key={act.id} onClick={() => handleActionChange(act.id as any)} className={`py-1.5 px-1 rounded-lg font-bold text-xs ${actionToHero === act.id ? 'bg-amber-400 text-slate-950' : 'bg-emerald-950/60 border-emerald-800/60'}`}>{act.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-1 mb-8 transition-opacity duration-200 ${isCalculating ? 'opacity-50' : 'opacity-100'}`}>
          <DecisionDisplay decision={decision} />
        </div>
      </main>

      {/* --- MODAL PAYWALL ATUALIZADO --- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-gradient-to-b from-emerald-900 to-slate-950 border border-emerald-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
            <Crown className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Desbloqueie o Pós-Flop</h2>
            <p className="text-slate-300 text-xs mb-6">Receba as decisões matemáticas exatas (Top Pairs, Draws) com o motor PRO.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handlePayment} 
                disabled={isCheckoutLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                {isCheckoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assinar PRO (R$ 29,90)'}
              </button>
              <button onClick={() => setShowUpgradeModal(false)} className="text-sm font-bold text-slate-400 hover:text-white py-2">
                Continuar na versão Free
              </button>
            </div>
          </div>
        </div>
      )}

      <CardPickerModal isOpen={pickerTarget !== null} onClose={() => setPickerTarget(null)} selectedCards={pickerTarget === 'hero' ? heroHand : boardCards} onSelectCard={(c) => { if (pickerTarget === 'hero') { if (heroHand.includes(c)) setHeroHand(heroHand.filter(x => x !== c)); else { const u = [...heroHand, c]; setHeroHand(u); if (u.length === 2) setTimeout(() => setPickerTarget(null), 150); } } else { if (boardCards.includes(c)) setBoardCards(boardCards.filter(x => x !== c)); else { const u = [...boardCards, c]; if (u.length <= 5) setBoardCards(u); } } }} maxCards={pickerTarget === 'hero' ? 2 : 5} title={pickerTarget === 'hero' ? "Cartas do Hero" : "Board"} />
    </div>
  );
};

export default App;
