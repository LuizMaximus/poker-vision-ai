import React, { useState, useEffect } from 'react';
import { TablePosition, PokerDecision } from './utils/pokerTypes';
import { fetchFastDecision, StackDepth, GameMode } from './utils/pokerEngine';
import { CardPickerModal } from './components/CardPickerModal';
import { DecisionDisplay } from './components/DecisionDisplay';
import { Zap, RotateCcw, Swords, Coins, Trophy, Lock, Crown, LogOut, Mail, KeyRound, Loader2, AlertCircle, Clock, ShieldCheck, Sparkles, CheckCircle2, HelpCircle, ArrowRight, MessageSquare, Menu, X, FileText, ChevronDown } from 'lucide-react';

import { auth, db, googleProvider } from './firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth'; 
import { doc, getDoc } from 'firebase/firestore';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [isProUser, setIsProUser] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'semestral' | 'anual'>('mensal');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Estados da Landing Page
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);

  const [gameMode, setGameMode] = useState<GameMode>('MTT');
  const [heroHand, setHeroHand] = useState<string[]>([]);
  const [boardCards, setBoardCards] = useState<string[]>([]);
  const [position, setPosition] = useState<TablePosition>('BTN');
  const [stackDepth, setStackDepth] = useState<StackDepth>('medium');
  const [actionToHero, setActionToHero] = useState<'unopened' | 'limp' | 'raise' | '3bet'>('unopened');
  const [pickerTarget, setPickerTarget] = useState<'hero' | 'board' | null>(null);
  const [decision, setDecision] = useState<PokerDecision | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // --- DETETAR RETORNO DO PAGAMENTO ---
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const status = queryParams.get('status');

    if (status === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsProUser(true);
    }
  }, []);

  // --- VERIFICAR STATUS E VALIDADE DO PRO NO FIREBASE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        try {
          const userRef = doc(db, 'users', currentUser.email);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.isPro && data.expiresAt) {
              const expirationDate = new Date(data.expiresAt);
              const now = new Date();
              const diffTime = expirationDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays > 0) {
                setIsProUser(true);
                setDaysRemaining(diffDays);
              } else {
                setIsProUser(false);
                setDaysRemaining(null);
              }
            } else if (data.isPro) {
              setIsProUser(true); 
            } else {
              setIsProUser(false);
            }
          } else {
            setIsProUser(false);
          }
        } catch (error) { setIsProUser(false); }
      } else {
        setIsProUser(false);
      }
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

  const handlePayment = async (plan: 'mensal' | 'semestral' | 'anual' = selectedPlan) => {
    if (!user) {
      setShowUpgradeModal(false);
      setShowLoginScreen(true);
      return;
    }
    setIsCheckoutLoading(true);
    setCheckoutError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, planType: plan })
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

  // --- SE O UTILIZADOR NÃO ESTIVER LOGADO: EXIBE A LANDING PAGE OU TELA DE LOGIN ---
  if (!user) {
    if (showLoginScreen) {
      return (
        <div className="min-h-screen bg-[#020806] flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-900/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="w-full max-w-md bg-[#0c2419]/90 backdrop-blur-xl border border-emerald-800/50 rounded-3xl p-8 shadow-2xl z-10">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setShowLoginScreen(false)} className="text-xs text-emerald-400 hover:text-white font-bold flex items-center gap-1">← Voltar à Apresentação</button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/50 flex items-center justify-center"><Zap className="w-5 h-5 text-amber-400" /></div>
            </div>
            
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 text-center font-serif mb-1 tracking-tight">POKER VISION AI</h1>
            <p className="text-xs text-emerald-400/80 text-center mb-6 font-medium">O seu assistente GTO de bolso</p>
            
            {authError && <div className="mb-4 bg-red-950/50 border border-red-900/50 text-red-400 text-xs font-bold text-center py-2 rounded-lg flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{authError}</div>}
            
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="relative group">
                <Mail className="w-5 h-5 text-emerald-600 absolute left-3 top-3.5 transition-colors group-focus-within:text-amber-400" />
                <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#05140e] border border-emerald-800/60 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all shadow-inner text-sm" required />
              </div>
              <div className="relative group">
                <KeyRound className="w-5 h-5 text-emerald-600 absolute left-3 top-3.5 transition-colors group-focus-within:text-amber-400" />
                <input type="password" placeholder="Palavra-passe (mín. 6 char)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#05140e] border border-emerald-800/60 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all shadow-inner text-sm" required minLength={6} />
              </div>
              <button type="submit" className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:bg-gradient-to-r hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.97] transition-all duration-200">
                {authMode === 'login' ? 'Entrar na Mesa' : 'Criar Conta Grátis'}
              </button>
            </form>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-emerald-800/60"></div>
              <span className="flex-shrink-0 mx-4 text-emerald-600/80 text-[10px] font-bold uppercase tracking-wider">Ou</span>
              <div className="flex-grow border-t border-emerald-800/60"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-3 bg-white text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-3 shadow-[0_4px_14px_0_rgba(255,255,255,0.1)] hover:bg-slate-50 active:scale-[0.97] transition-all duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com o Google
            </button>

            <div className="mt-5 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-xs text-slate-400 hover:text-amber-400 transition-colors font-medium">
                {authMode === 'login' ? 'Novo por aqui? Registe-se' : 'Já tem conta? Inicie sessão'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // --- LANDING PAGE DE ALTA CONVERSÃO ---
    return (
      <div className="min-h-screen bg-[#020806] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950 relative overflow-x-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-600/10 blur-[140px] pointer-events-none rounded-full"></div>
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-amber-500/5 blur-[160px] pointer-events-none rounded-full"></div>

        {/* HEADER / NAVBAR */}
        <header className="sticky top-0 z-50 bg-[#0c2419]/90 backdrop-blur-md border-b border-emerald-800/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <span className="font-serif text-lg sm:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                POKER VISION AI
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
              <a href="#recursos" className="hover:text-amber-400 transition-colors">Recursos</a>
              <a href="#como-funciona" className="hover:text-amber-400 transition-colors">Como Funciona</a>
              <a href="#precos" className="hover:text-amber-400 transition-colors">Planos</a>
              <a href="#faq" className="hover:text-amber-400 transition-colors">FAQ</a>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => { setAuthMode('login'); setShowLoginScreen(true); }}
                className="text-xs font-bold text-emerald-400 hover:text-white px-4 py-2 transition-colors uppercase tracking-wider"
              >
                Entrar
              </button>
              <button 
                onClick={() => { setAuthMode('register'); setShowLoginScreen(true); }}
                className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
              >
                Criar Conta Grátis
              </button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-emerald-400">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Menu Mobile */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#0a1f15] border-b border-emerald-800/50 px-4 py-5 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
              <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300">Recursos</a>
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300">Como Funciona</a>
              <a href="#precos" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300">Planos</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300">FAQ</a>
              <div className="pt-3 border-t border-emerald-900/60 flex flex-col gap-3">
                <button onClick={() => { setAuthMode('login'); setShowLoginScreen(true); }} className="w-full py-2.5 text-center text-xs font-bold text-emerald-400 bg-emerald-950/40 rounded-xl">Entrar</button>
                <button onClick={() => { setAuthMode('register'); setShowLoginScreen(true); }} className="w-full py-2.5 text-center text-xs font-black text-slate-950 bg-gradient-to-r from-amber-500 to-amber-400 rounded-xl shadow-md">Criar Conta Grátis</button>
              </div>
            </div>
          )}
        </header>

        {/* HERO SECTION */}
        <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-700/40 text-amber-400 text-xs font-bold mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" /> Assistente GTO Avançado de Bolso
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-serif tracking-tight text-white mb-6 leading-[1.1]">
            Domine o Pós-Flop e Esmague <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
              os Seus Oponentes no Poker
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 mb-10 leading-relaxed font-normal">
            Obtenha decisões matemáticas GTO instantâneas direto no seu celular. Análises precisas de pré-flop, flop, turn e river para MTT, Cash Games e Spin & Go.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <button 
              onClick={() => { setAuthMode('register'); setShowLoginScreen(true); }}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              Começar Grátis Agora <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#precos"
              className="w-full sm:w-auto px-8 py-4 bg-[#0c2419] border border-emerald-800/80 text-emerald-300 font-bold rounded-2xl hover:bg-emerald-950/50 hover:text-white transition-all text-sm uppercase tracking-wider text-center"
            >
              Ver Planos PRO
            </a>
          </div>

          {/* Mockup visual estilizado do app */}
          <div className="relative max-w-4xl mx-auto rounded-3xl p-3 bg-gradient-to-b from-emerald-800/30 to-black/60 border border-emerald-700/40 shadow-[0_0_50px_rgba(5,150,105,0.2)]">
            <div className="bg-[#05140e] rounded-2xl p-6 sm:p-10 border border-emerald-900/60 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-6 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg text-amber-400 text-xs font-bold">
                <Crown className="w-3.5 h-3.5" /> Análise GTO em Tempo Real
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-6">
                <div className="bg-[#0c2419] border border-emerald-800/50 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Ação GTO</span>
                  <span className="text-lg font-black text-emerald-400">RAISE (75%)</span>
                </div>
                <div className="bg-[#0c2419] border border-emerald-800/50 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Confiança</span>
                  <span className="text-lg font-black text-amber-400">95.4%</span>
                </div>
                <div className="bg-[#0c2419] border border-emerald-800/50 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">EV Estimado</span>
                  <span className="text-lg font-black text-emerald-400">+4.5 BB</span>
                </div>
                <div className="bg-[#0c2419] border border-emerald-800/50 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">Risco</span>
                  <span className="text-lg font-black text-amber-400">MÉDIO</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic">"Interface leve, intuitiva e desenvolvida por jogadores para otimizar o seu winrate."</p>
            </div>
          </div>
        </section>

        {/* RECURSOS / BENEFÍCIOS */}
        <section id="recursos" className="py-20 bg-[#05140e]/50 border-t border-emerald-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black font-serif text-white mb-4">Por que os melhores jogadores escolhem o Poker Vision AI?</h2>
              <p className="text-sm sm:text-base text-slate-400">Ferramentas de desktop pesadas exigem configurações complexas. O nosso assistente entrega a resposta certa em segundos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#0c2419]/80 border border-emerald-800/50 rounded-3xl p-8 shadow-xl hover:border-amber-400/50 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Respostas Instantâneas</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Insira as suas cartas, selecione a posição e stack em segundos para receber a jogada ideal baseada em teoria de jogos.</p>
              </div>

              <div className="bg-[#0c2419]/80 border border-emerald-800/50 rounded-3xl p-8 shadow-xl hover:border-amber-400/50 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Motor Pós-Flop PRO</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Desbloqueie análises completas de texturas de board (Flop, Turn e River) para extrair valor máximo dos seus oponentes.</p>
              </div>

              <div className="bg-[#0c2419]/80 border border-emerald-800/50 rounded-3xl p-8 shadow-xl hover:border-amber-400/50 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">100% Otimizado p/ Celular</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Projetado especificamente para rodar perfeitamente no navegador do seu celular enquanto joga online ou ao vivo.</p>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black font-serif text-white mb-4">Como Funciona em 3 Passos Simples</h2>
            <p className="text-sm sm:text-base text-slate-400">Sem complicações técnicas. Comece a melhorar o seu jogo imediatamente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0c2419]/50 border border-emerald-800/40 rounded-3xl p-8 relative">
              <span className="absolute -top-4 left-8 w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">1</span>
              <h3 className="text-lg font-bold text-white mb-3 mt-2">Escolha o Modo de Jogo</h3>
              <p className="text-sm text-slate-400">Selecione se está a jogar Cash Game, MTT / SNG ou Spin & Go com o stack efetivo correspondente.</p>
            </div>

            <div className="bg-[#0c2419]/50 border border-emerald-800/40 rounded-3xl p-8 relative">
              <span className="absolute -top-4 left-8 w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">2</span>
              <h3 className="text-lg font-bold text-white mb-3 mt-2">Selecione as Cartas</h3>
              <p className="text-sm text-slate-400">Insira as suas 2 cartas de mão e, no plano PRO, adicione opcionalmente as cartas comunitárias do board.</p>
            </div>

            <div className="bg-[#0c2419]/50 border border-emerald-800/40 rounded-3xl p-8 relative">
              <span className="absolute -top-4 left-8 w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">3</span>
              <h3 className="text-lg font-bold text-white mb-3 mt-2">Execute a Jogada GTO</h3>
              <p className="text-sm text-slate-400">Receba instantaneamente a ação recomendada, sizing exato, taxa de confiança e justificativa matemática.</p>
            </div>
          </div>
        </section>

        {/* PLANOS E PREÇOS */}
        <section id="precos" className="py-20 bg-[#05140e]/50 border-t border-emerald-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black font-serif text-white mb-4">Planos Acessíveis para Todos os Jogadores</h2>
              <p className="text-sm sm:text-base text-slate-400">Invista menos do que o valor de um buy-in e tenha a ferramenta mais afiada do mercado.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Mensal */}
              <div className="bg-[#0c2419] border border-emerald-800/60 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Plano Mensal</h3>
                  <p className="text-xs text-slate-400 mb-6">Flexibilidade total para testar e lucrar.</p>
                  <div className="text-3xl font-black text-amber-400 mb-6">R$ 29,90 <span className="text-xs font-normal text-slate-400">/mês</span></div>
                  <ul className="flex flex-col gap-3 text-xs text-slate-300 mb-8">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Acesso a todos os modos (MTT, Cash, Spin)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Motor PRO de Pós-Flop desbloqueado</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Atualizações automáticas GTO</li>
                  </ul>
                </div>
                <button 
                  onClick={() => { setSelectedPlan('mensal'); setShowUpgradeModal(true); }}
                  className="w-full py-3.5 bg-emerald-800/40 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all border border-emerald-700/60"
                >
                  Assinar Mensal
                </button>
              </div>

              {/* Semestral */}
              <div className="bg-[#0c2419] border border-emerald-800/60 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Plano Semestral</h3>
                  <p className="text-xs text-slate-400 mb-6">Ideal para grind consistente de 6 meses.</p>
                  <div className="text-3xl font-black text-amber-400 mb-6">R$ 149,90 <span className="text-xs font-normal text-slate-400">/semestre</span></div>
                  <ul className="flex flex-col gap-3 text-xs text-slate-300 mb-8">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Todos os benefícios do PRO</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Economia em relação ao mensal</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Suporte prioritário via WhatsApp</li>
                  </ul>
                </div>
                <button 
                  onClick={() => { setSelectedPlan('semestral'); setShowUpgradeModal(true); }}
                  className="w-full py-3.5 bg-emerald-800/40 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all border border-emerald-700/60"
                >
                  Assinar Semestral
                </button>
              </div>

              {/* Anual (Destaque) */}
              <div className="bg-gradient-to-b from-[#0c2419] to-[#05140e] border-2 border-amber-500/50 rounded-3xl p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(245,158,11,0.15)] relative transform md:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                  Mais Popular (-30%)
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 mt-1">Plano Anual</h3>
                  <p className="text-xs text-slate-400 mb-6">Para profissionais e regs focados em longo prazo.</p>
                  <div className="text-3xl font-black text-amber-400 mb-6">R$ 249,90 <span className="text-xs font-normal text-slate-400">/ano</span></div>
                  <ul className="flex flex-col gap-3 text-xs text-slate-300 mb-8">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Acesso total por 365 dias</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Maior desconto da plataforma</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Acesso antecipado a novos recursos</li>
                  </ul>
                </div>
                <button 
                  onClick={() => { setSelectedPlan('anual'); setShowUpgradeModal(true); }}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:scale-[1.02] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                >
                  Assinar Anual PRO
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ (DÚVIDAS FREQUENTES) */}
        <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black font-serif text-white mb-4">Dúvidas Frequentes (FAQ)</h2>
            <p className="text-sm text-slate-400">Tudo o que precisa de saber antes de começar.</p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                q: "Como recebo o acesso PRO após o pagamento?",
                a: "A liberação é 100% automática e instantânea logo após a confirmação do pagamento via Mercado Pago (Pix ou Cartão). A coroa dourada acende na hora no seu app."
              },
              {
                q: "Funciona em celulares e computadores?",
                a: "Sim! O Poker Vision AI foi totalmente otimizado para rodar perfeitamente tanto no navegador do seu celular quanto no computador."
              },
              {
                q: "Posso cancelar a assinatura quando quiser?",
                a: "Sim, no plano mensal você tem total liberdade de gerenciar ou cancelar a sua assinatura de forma simples a qualquer momento."
              },
              {
                q: "As decisões são baseadas em GTO real?",
                a: "Sim, todas as matrizes e algoritmos de cálculo seguem rigorosamente a Teoria de Jogos Ótima (GTO) e conceitos avançados de EV."
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-[#0c2419]/70 border border-emerald-800/50 rounded-2xl overflow-hidden transition-all">
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm sm:text-base text-white flex items-center justify-between gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-amber-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-emerald-900/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-[#020806] border-t border-emerald-900/40 py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-serif font-bold text-white">Poker Vision AI</span>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => setActiveModal('terms')} className="hover:text-amber-400 transition-colors">Termos de Uso</button>
              <button onClick={() => setActiveModal('privacy')} className="hover:text-amber-400 transition-colors">Política de Privacidade</button>
              <a href="mailto:suporte@pokervision.com.br" className="hover:text-amber-400 transition-colors flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Suporte</a>
            </div>
            <div>
              © 2026 Poker Vision AI. Todos os direitos reservados.
            </div>
          </div>
        </footer>

        {/* MODAL DE UPGRADE / PLANOS (DA LANDING PAGE) */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all">
            <div className="bg-[#0a1f15] border border-amber-500/30 w-full max-w-sm rounded-[2rem] p-6 shadow-[0_0_40px_rgba(5,20,14,0.9)] text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-[40px]"></div>
              <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] relative z-10" />
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-2 relative z-10">Desbloqueie o Motor PRO</h2>
              <p className="text-slate-400 text-xs mb-5 leading-relaxed relative z-10">
                Escolha o seu plano ideal e domine o Pós-Flop com análises matemáticas avançadas.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-5 relative z-10">
                {[
                  { id: 'mensal', name: 'Mensal', price: 'R$ 29,90' },
                  { id: 'semestral', name: 'Semestral', price: 'R$ 149,90' },
                  { id: 'anual', name: 'Anual', price: 'R$ 249,90', badge: '-30%' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all relative ${selectedPlan === p.id ? 'bg-amber-400/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#05140e] border-emerald-800/60 text-slate-400 hover:border-emerald-600'}`}
                  >
                    {p.badge && <span className="absolute -top-2 bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-full">{p.badge}</span>}
                    <span className="text-[11px] font-bold">{p.name}</span>
                    <span className="text-xs font-black text-amber-400 mt-0.5">{p.price}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col gap-3 relative z-10">
                {checkoutError && (
                  <div className="bg-red-950/40 text-red-400 text-xs py-2 px-3 rounded-lg border border-red-900/50 flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {checkoutError}
                  </div>
                )}
                
                <button 
                  onClick={() => handlePayment(selectedPlan)} 
                  disabled={isCheckoutLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                >
                  {isCheckoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Assinar Plano ${selectedPlan}`}
                </button>
                <button onClick={() => setShowUpgradeModal(false)} className="text-xs font-bold text-slate-500 hover:text-white py-1 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAIS LEGAIS (TERMOS E PRIVACIDADE) */}
        {activeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a1f15] border border-emerald-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 max-h-[80vh] overflow-y-auto relative">
              <button onClick={() => setActiveModal(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                {activeModal === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
              </h3>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed flex flex-col gap-3">
                {activeModal === 'terms' ? (
                  <>
                    <p>Bem-vindo ao Poker Vision AI. Ao utilizar a nossa aplicação, concorda com os presentes termos de serviço e condições de utilização.</p>
                    <p><strong>1. Utilização do Serviço:</strong> O Poker Vision AI é uma ferramenta de apoio e estudo baseada em GTO (Game Theory Optimal) destinada a auxiliar jogadores na tomada de decisão estratégica.</p>
                    <p><strong>2. Pagamentos e Assinaturas:</strong> Os planos são cobrados antecipadamente através do Mercado Pago. As renovações e acessos seguem o período contratado (mensal, semestral ou anual).</p>
                    <p><strong>3. Responsabilidade:</strong> O utilizador é o único responsável pelas decisões tomadas nas mesas de jogo reais ou virtuais.</p>
                  </>
                ) : (
                  <>
                    <p>A sua privacidade é fundamental para nós. Esta política descreve como recolhemos e tratamos as suas informações.</p>
                    <p><strong>1. Dados Recolhidos:</strong> Recolhemos o seu endereço de e-mail através do processo de autenticação (Firebase) estritamente para gerir o seu acesso e status de utilizador PRO.</p>
                    <p><strong>2. Pagamentos seguros:</strong> Todos os pagamentos são processados diretamente pelo Mercado Pago, não armazenamos dados de cartões de crédito no nosso servidor.</p>
                    <p><strong>3. Segurança:</strong> Utilizamos protocolos criptografados e Firebase Firestore para garantir a integridade e segurança dos seus dados.</p>
                  </>
                )}
              </div>
              <button onClick={() => setActiveModal(null)} className="mt-6 w-full py-3 bg-emerald-800 text-white font-bold rounded-xl text-xs uppercase">Entendido</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- SE O UTILIZADOR JÁ ESTIVER LOGADO: EXIBE A APLICAÇÃO DE POKER GTO ---
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
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-emerald-400/70 font-medium truncate max-w-[130px] block">{user.email}</span>
                {isProUser && daysRemaining !== null && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {daysRemaining}d restantes
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!isProUser && (
              <button onClick={() => setShowUpgradeModal(true)} className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> PRO
              </button>
            )}
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
          <div className="bg-[#0a1f15] border border-amber-500/30 w-full max-w-sm rounded-[2rem] p-6 shadow-[0_0_40px_rgba(5,20,14,0.9)] text-center relative overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-[-50px] left-1/2 transform -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-[40px]"></div>
            <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] relative z-10" />
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-2 relative z-10">Desbloqueie o Motor PRO</h2>
            <p className="text-slate-400 text-xs mb-5 leading-relaxed relative z-10">
              Escolha o seu plano ideal e domine o Pós-Flop com análises matemáticas avançadas.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5 relative z-10">
              {[
                { id: 'mensal', name: 'Mensal', price: 'R$ 29,90' },
                { id: 'semestral', name: 'Semestral', price: 'R$ 149,90' },
                { id: 'anual', name: 'Anual', price: 'R$ 249,90', badge: '-30%' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id as any)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all relative ${selectedPlan === p.id ? 'bg-amber-400/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#05140e] border-emerald-800/60 text-slate-400 hover:border-emerald-600'}`}
                >
                  {p.badge && <span className="absolute -top-2 bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-full">{p.badge}</span>}
                  <span className="text-[11px] font-bold">{p.name}</span>
                  <span className="text-xs font-black text-amber-400 mt-0.5">{p.price}</span>
                </button>
              ))}
            </div>
            
            <div className="flex flex-col gap-3 relative z-10">
              {checkoutError && (
                <div className="bg-red-950/40 text-red-400 text-xs py-2 px-3 rounded-lg border border-red-900/50 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {checkoutError}
                </div>
              )}
              
              <button 
                onClick={() => handlePayment(selectedPlan)} 
                disabled={isCheckoutLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                {isCheckoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Assinar Plano ${selectedPlan}`}
              </button>
              <button onClick={() => setShowUpgradeModal(false)} className="text-xs font-bold text-slate-500 hover:text-white py-1 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <CardPickerModal 
        isOpen={pickerTarget !== null} 
        onClose={() => setPickerTarget(null)} 
        selectedCards={pickerTarget === 'hero' ? heroHand : boardCards} 
        usedCards={pickerTarget === 'hero' ? boardCards : heroHand}
        onSelectCard={(c) => { 
          if (pickerTarget === 'hero') { 
            if (heroHand.includes(c)) {
              setHeroHand(heroHand.filter(x => x !== c)); 
            } else { 
              const u = [...heroHand, c]; 
              setHeroHand(u); 
              if (u.length === 2) setTimeout(() => setPickerTarget(null), 150); 
            } 
          } else { 
            if (boardCards.includes(c)) {
              setBoardCards(boardCards.filter(x => x !== c)); 
            } else { 
              const u = [...boardCards, c]; 
              if (u.length <= 5) setBoardCards(u); 
            } 
          } 
        }} 
        maxCards={pickerTarget === 'hero' ? 2 : 5} 
        title={pickerTarget === 'hero' ? "Cartas da Mão" : "Cartas da Mesa"} 
      />
    </div>
  );
};

export default App;
