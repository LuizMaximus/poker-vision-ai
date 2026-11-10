import React, { useState, useEffect } from 'react';
import { TablePosition, PokerDecision } from './utils/pokerTypes';
import { fetchFastDecision, StackDepth, GameMode } from './utils/pokerEngine';
import { CardPickerModal } from './components/CardPickerModal';
import { DecisionDisplay } from './components/DecisionDisplay';
import { Zap, RotateCcw, Swords, Coins, Trophy, Lock, Crown, LogOut, Mail, KeyRound, Loader2, AlertCircle } from 'lucide-react';

import { auth, db, googleProvider } from './firebase'; // Importamos o googleProvider
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth'; // Importamos o signInWithPopup
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
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

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
      setAuthError(err.message.includes('auth/invalid-credential') ? 'Dados incorretos. Tente novamente.' : 'Erro ao autenticar.');
    }
  };

  // --- NOVO: FUNÇÃO DE LOGIN COM O GOOGLE ---
  const handleGoogleAuth = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Erro ao iniciar sessão com o Google.');
      }
    }
  };

  const handlePayment = async () => {
    setIsCheckoutLoading(true);
    setCheckoutError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email })
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setCheckoutError(data.error || "Ocorreu um erro ao conectar com o banco. Tente novamente.");
      }
    } catch (error) {
      setCheckoutError("Falha na comunicação. Verifique a sua internet.");
    }
    setIsCheckoutLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const getDecision = async () => {
      if (heroHand.length < 2) { setDecision({ action: 'AGUARDANDO', confidence: 0, sizing: '-', rationale: 'Selecione as suas 2 cartas para começar.', evEstimate: 0, riskLevel: 'LOW' }); return; }
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

  if (isAuthLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Zap className="w-10 h-10 text-amber-400 animate-pulse drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020806] flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="w-full max-w-md bg-[#0c2419]/90 backdrop-blur-xl border border-emerald-800/50 rounded-3xl p-8 shadow-2xl z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/50 flex items-center justify-center shadow-lg"><Zap className="w-8 h-8 text-amber-400" /></div>
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 text-center font-serif mb-1 tracking-tight">POKER VISION</h1>
          <p className="text-sm text-emerald-400/80 text-center mb-8 font-medium">O seu assistente GTO de bolso</p>
          
          {authError && <div className="mb-4 bg-red-950/50 border border-red-900/50 text-red-400 text-xs font-bold text-center py-2 rounded-lg flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{authError}</div>}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div className="relative group">
              <Mail className="w-5 h-5 text-emerald-600 absolute left-3 top-3.5 transition-colors group-focus-within:text-amber-400" />
              <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#05140e] border border-emerald-800/60 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all shadow-inner" required />
            </div>
            <div className="relative group">
              <KeyRound className="w-5 h-5 text-emerald-600 absolute left-3 top-3.5 transition-colors group-focus-within:text-amber-400" />
              <input type="password" placeholder="Palavra-passe (mín. 6 char)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#05140e] border border-emerald-800/60 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all shadow-inner" required minLength={6} />
            </div>
            <button type="submit" className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black uppercase tracking-widest shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.23)] hover:bg-gradient-to-r hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.97] transition-all duration-200">
              {authMode === 'login' ? 'Entrar na Mesa' : 'Criar Conta Grátis'}
            </button>
          </form>

          {/* --- NOVO: BOTÃO DO GOOGLE --- */}
          <div className="relative flex items-center py-5">
            <div className="flex-grow border-t border-emerald-800/60"></div>
            <span className="flex-shrink-0 mx-4 text-emerald-600/80 text-xs font-bold uppercase tracking-wider">Ou</span>
            <div className="flex-grow border-t border-emerald-800/60"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-3 bg-white text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 shadow-[0_4px_14px_0_rgba(255,255,255,0.1)] hover:bg-slate-50 active:scale-[0.97] transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com o Google
          </button>

          <div className="mt-6 text-center">
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-sm text-slate-400 hover:text-amber-400 transition-colors font-medium">
              {authMode === 'login' ? 'Novo por aqui? Registe-se' : 'Já tem conta? Inicie sessão'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020806] text-slate-100 flex flex-col font-sans select-none pb-12 relative">
      <header className="px-4 pt-3 pb-2 bg-[#0c2419]/95 backdrop-blur-md border-b border-emerald-800/60 shadow-lg sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${isCalculating ? 'bg-amber-400 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105' : 'bg-amber-400/10 border-amber-400/50'}`}>
              <Zap className={`w-5 h-5 ${isCalculating ? 'text-slate-900 animate-pulse' : 'text-amber-400'}`} />
            </div>
            <div>
              <h1 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 font-serif leading-none flex items-center gap-1.5">
                POKER VISION {isProUser ? <Crown className="w-4 h-4 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" /> : <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-[9px] rounded text-slate-400 font-bold">FREE</span>}
              </h1>
              <span className="text-[10px] text-emerald-400/70 font-medium truncate max-w-[140px] block mt-0.5">{user.email}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetTable} className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 hover:text-white active:scale-90 transition-all"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={() => signOut(auth)} className="p-2 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900/60 hover:text-white active:scale-90 transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex p-1 bg-black/40 rounded-xl border border-emerald-900/40 shadow-inner">
          {[{ id: 'CASH', label: 'CASH', icon: <Coins className="w-3.5 h-3.5" /> }, { id: 'MTT', label: 'MTT / SNG', icon: <Trophy className="w-3.5 h-3.5" /> }, { id: 'SPIN', label: 'SPIN & GO', icon: <Swords className="w-3.5 h-3.5" /> }].map(m => (
            <button key={m.id} onClick={() => handleModeChange(m.id as GameMode)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${gameMode === m.id ? 'bg-gradient-to-t from-emerald-700 to-emerald-600 text-white shadow-md' : 'text-emerald-500/60 hover:text-emerald-300 hover:bg-emerald-900/30'}`}>{m.icon} {m.label}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-3 max-w-md mx-auto w-full flex flex-col gap-3">
        <div className="bg-[#0c2419] border border-emerald-800/50 rounded-2xl p-3 shadow-lg transition-all hover:border-emerald-700/60">
          <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest block mb-2">1. Suas Cartas</span>
          <div onClick={() => { setHeroHand([]); setPickerTarget('hero'); }} className="flex justify-center gap-3 p-4 bg-[#05140e] rounded-xl border border-dashed border-emerald-800/80 cursor-pointer hover:bg-emerald-950/30 transition-colors group">
            {heroHand.length === 2 ? heroHand.map((c, i) => (
              <div key={i} className="w-16 h-22 bg-white text-slate-900 rounded-lg flex flex-col items-center justify-between p-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.3)] font-black text-lg transform transition-transform group-hover:scale-105">
                <span className={c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}>{c[0]}</span>
                <span className={`text-2xl ${c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}`}>{c.includes('s') ? '♠' : c.includes('h') ? '♥' : c.includes('d') ? '♦' : '♣'}</span>
              </div>
            )) : <div className="py-4 text-emerald-600 font-bold text-sm group-hover:text-amber-400 transition-colors flex items-center gap-2">Toque para selecionar <span className="animate-bounce">👇</span></div>}
          </div>
        </div>

        <div className="relative bg-[#0c2419] border border-emerald-800/50 rounded-2xl p-3 shadow-lg overflow-hidden transition-all hover:border-emerald-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest">2. Board (Pós-Flop)</span>
            {!isProUser && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded border border-amber-500/30 font-bold flex gap-1 items-center shadow-[0_0_8px_rgba(245,158,11,0.2)]"><Lock className="w-3 h-3" /> PRO</span>}
          </div>
          <div onClick={() => { if (!isProUser) { setShowUpgradeModal(true); return; } setPickerTarget('board'); }} className={`flex justify-center gap-1.5 p-4 rounded-xl border border-dashed cursor-pointer transition-all ${isProUser ? 'bg-[#05140e] border-emerald-800/80 hover:bg-emerald-950/30 group' : 'bg-[#020806]/80 border-emerald-900/50 blur-[3px] scale-[0.98]'}`}>
            {[1, 2, 3, 4, 5].map((_, i) => {
              const c = boardCards[i];
              return c ? (
                <div key={i} className={`w-11 h-16 bg-white rounded-md flex flex-col items-center justify-between p-1 shadow-md font-black text-sm ${isProUser && 'transform transition-transform group-hover:scale-105'}`}>
                  <span className={c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}>{c[0]}</span>
                  <span className={c.includes('h') || c.includes('d') ? 'text-red-600' : 'text-slate-900'}>{c.includes('s') ? '♠' : c.includes('h') ? '♥' : c.includes('d') ? '♦' : '♣'}</span>
                </div>
              ) : <div key={i} className="w-11 h-16 bg-[#0c2419] rounded-md border border-emerald-800/50 flex items-center justify-center text-emerald-700 text-xs font-bold">{i < 3 ? 'F' : i === 3 ? 'T' : 'R'}</div>;
            })}
          </div>
          {!isProUser && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[1px]">
              <button onClick={() => setShowUpgradeModal(true)} className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-black px-5 py-2.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all">
                <Lock className="w-3.5 h-3.5" /> Desbloquear Board
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#0c2419] border border-emerald-800/50 rounded-2xl p-3 shadow-lg">
          <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest block mb-2">3. Stack Efetivo</span>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'low', label: 'LOW' }, { id: 'medium', label: 'MEDIUM' }, { id: 'deep', label: 'DEEP' }].map(s => (
              <button key={s.id} onClick={() => setStackDepth(s.id as StackDepth)} className={`py-2.5 rounded-xl text-center font-bold text-xs transition-all active:scale-95 ${stackDepth === s.id ? 'bg-amber-400 text-slate-950 shadow-[0_2px_10px_rgba(251,191,36,0.3)] border-amber-300' : 'bg-[#05140e] border border-emerald-800/60 text-emerald-400 hover:border-emerald-600'}`}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0c2419] border border-emerald-800/50 rounded-2xl p-3 shadow-lg">
            <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest block mb-2">4. Posição</span>
            <div className="grid grid-cols-2 gap-1.5">
              {activePositions.map(pos => <button key={pos} onClick={() => handlePositionChange(pos)} className={`py-2 rounded-lg text-xs font-black transition-all active:scale-95 ${position === pos ? 'bg-emerald-500 text-slate-950 shadow-[0_2px_8px_rgba(16,185,129,0.4)] border-emerald-400' : 'bg-[#05140e] border border-emerald-800/60 text-emerald-500 hover:border-emerald-600'}`}>{pos}</button>)}
            </div>
          </div>
          <div className="bg-[#0c2419] border border-emerald-800/50 rounded-2xl p-3 shadow-lg">
            <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest block mb-2">5. Ação Prév.</span>
            <div className="flex flex-col gap-1.5">
              {[{ id: 'unopened', label: 'Mesa em Fold' }, { id: 'limp', label: 'Limpers' }, { id: 'raise', label: 'Raise Prévio' }].map(act => (
                <button key={act.id} onClick={() => handleActionChange(act.id as any)} className={`py-2 px-1 rounded-lg font-bold text-xs transition-all active:scale-95 ${actionToHero === act.id ? 'bg-amber-400 text-slate-950 shadow-[0_2px_8px_rgba(251,191,36,0.3)] border-amber-300' : 'bg-[#05140e] border border-emerald-800/60 text-emerald-500 hover:border-emerald-600'}`}>{act.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-2 mb-8 transition-opacity duration-300 ${isCalculating ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}>
          <DecisionDisplay decision={decision} />
        </div>
      </main>

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[#0a1f15] border border-amber-500/30 w-full max-w-sm rounded-[2rem] p-8 shadow-[0_0_40px_rgba(5,20,14,0.9)] text-center relative overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-[-50px] left-1/2 transform -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-[40px]"></div>
            <Crown className="w-14 h-14 text-amber-400 mx-auto mb-5 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] relative z-10" />
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-3 relative z-10">Desbloqueie o Motor PRO</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
              Analise Board Textures (Flop, Turn, River) e receba as decisões matemáticas mais precisas do mercado para esmagar os seus oponentes no Pós-Flop.
            </p>
            
            <div className="flex flex-col gap-4 relative z-10">
              {checkoutError && (
                <div className="bg-red-950/40 text-red-400 text-xs py-2 px-3 rounded-lg border border-red-900/50 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {checkoutError}
                </div>
              )}
              
              <button 
                onClick={handlePayment} 
                disabled={isCheckoutLoading}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
              >
                {isCheckoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assinar PRO (R$ 29,90)'}
              </button>
              <button onClick={() => setShowUpgradeModal(false)} className="text-sm font-bold text-slate-500 hover:text-white py-2 transition-colors">
                Continuar na versão Limitada
              </button>
            </div>
          </div>
        </div>
      )}

      <CardPickerModal isOpen={pickerTarget !== null} onClose={() => setPickerTarget(null)} selectedCards={pickerTarget === 'hero' ? heroHand : boardCards} onSelectCard={(c) => { if (pickerTarget === 'hero') { if (heroHand.includes(c)) setHeroHand(heroHand.filter(x => x !== c)); else { const u = [...heroHand, c]; setHeroHand(u); if (u.length === 2) setTimeout(() => setPickerTarget(null), 150); } } else { if (boardCards.includes(c)) setBoardCards(boardCards.filter(x => x !== c)); else { const u = [...boardCards, c]; if (u.length <= 5) setBoardCards(u); } } }} maxCards={pickerTarget === 'hero' ? 2 : 5} title={pickerTarget === 'hero' ? "Cartas da Mão" : "Cartas da Mesa"} />
    </div>
  );
};

export default App;
