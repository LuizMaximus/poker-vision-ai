import React, { useState, useEffect } from 'react';
import { 
  Position, 
  Stage, 
  ActionToHero, 
  PokerDecision, 
  SampleScenario 
} from './utils/pokerTypes';
import { calculateDecision, SAMPLE_SCENARIOS } from './utils/pokerEngine';
import { CaptureModal } from './components/CaptureModal';
import { CardPickerModal } from './components/CardPickerModal';
import { RangeMatrixModal } from './components/RangeMatrixModal';
import { QuickChipsPanel } from './components/QuickChipsPanel';
import { TableCardsView } from './components/TableCardsView';
import { DecisionDisplay } from './components/DecisionDisplay';
import { 
  Camera, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  User, 
  LogOut, 
  Lock, 
  Grid, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  // --- ESTADOS DA APLICAÇÃO ---
  // Se for falso, exibe a Landing Page otimizada com conversão imediata. Se verdadeiro, exibe o app logado/funcional.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Estados principais da mão de Poker
  const [heroHand, setHeroHand] = useState<string[]>(['As', 'Ah']);
  const [board, setBoard] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>('preflop');
  const [position, setPosition] = useState<Position | null>('BTN');
  const [stackBB, setStackBB] = useState<number | null>(100);
  const [villains, setVillains] = useState<number | null>(1);
  const [actionToHero, setActionToHero] = useState<ActionToHero>('unopened');

  // Estados de Modais
  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);
  const [isProcessingVision, setIsProcessingVision] = useState<boolean>(false);
  const [cardPickerConfig, setCardPickerConfig] = useState<{
    isOpen: boolean;
    title: string;
    maxCards: number;
    target: 'hero1' | 'hero2' | 'board' | null;
    boardIndex?: number;
  }>({
    isOpen: false,
    title: '',
    maxCards: 2,
    target: null,
  });
  const [isRangeMatrixOpen, setIsRangeMatrixOpen] = useState<boolean>(false);

  // Decisão GTO Calculada
  const [decision, setDecision] = useState<PokerDecision | null>(null);

  // Recalcula a decisão sempre que os parâmetros mudarem
  useEffect(() => {
    if (heroHand.length === 2) {
      const res = calculateDecision({
        heroCardsRaw: heroHand,
        boardCardsRaw: board,
        stage,
        position: position || 'BTN',
        effectiveStackBB: stackBB || 40,
        activeVillains: villains || 1,
        actionToHero: actionToHero || 'unopened',
      });
      setDecision(res);
    } else {
      setDecision({
        primaryAction: 'AGUARDANDO',
        actionFrequencies: { fold: 0, checkCall: 0, raise: 0, allIn: 0 },
        handStrengthPercent: 0,
        handCategory: 'Aguardando cartas...',
        tacticalJustification: 'Selecione as 2 cartas do Hero para iniciar a análise GTO.',
        recommendedBetSize: '-',
        equityVsRange: 0,
        rangeAdvantage: 'neutral',
      });
    }
  }, [heroHand, board, stage, position, stackBB, villains, actionToHero]);

  // Handler para cenários prontos
  const handleScenarioSelected = (scenario: SampleScenario) => {
    setHeroHand(scenario.extraction.hero_hand);
    setBoard(scenario.extraction.board);
    setStage(scenario.extraction.stage);
    if (scenario.extraction.position) setPosition(scenario.extraction.position);
    if (scenario.extraction.effective_stack_bb) setStackBB(scenario.extraction.effective_stack_bb);
    if (scenario.extraction.active_villains) setVillains(scenario.extraction.active_villains);
    if (scenario.extraction.action_to_hero) setActionToHero(scenario.extraction.action_to_hero);
  };

  // Handler para captura de imagem (Vision AI Mock/API)
  const handleImageCaptured = async (_base64: string) => {
    setIsProcessingVision(true);
    setTimeout(() => {
      // Simula o retorno da IA de visão computacional com base no cenário monstro BTN
      handleScenarioSelected(SAMPLE_SCENARIOS[0]);
      setIsProcessingVision(false);
      setIsCaptureOpen(false);
    }, 1500);
  };

  // --- RENDERIZAÇÃO DA LANDING PAGE OTIMIZADA (Para resolver o problema de zero cadastros) ---
  if (!isAuthenticated && !showAuthModal) {
    const sampleSc = SAMPLE_SCENARIOS[0];
    const initialLpDecision = calculateDecision({
      heroCardsRaw: sampleSc.extraction.hero_hand,
      boardCardsRaw: sampleSc.extraction.board,
      stage: sampleSc.extraction.stage,
      position: sampleSc.extraction.position || 'BTN',
      effectiveStackBB: sampleSc.extraction.effective_stack_bb || 100,
      activeVillains: sampleSc.extraction.active_villains || 1,
      actionToHero: sampleSc.extraction.action_to_hero || 'unopened',
    });

    return (
      <div className="min-h-screen bg-[#06130d] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
        {/* Navbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-emerald-900/40 bg-[#081a12]/90 backdrop-blur sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-amber-500/20">
              PV
            </div>
            <span className="font-serif font-black text-lg tracking-wide text-amber-300">
              Poker Vision <span className="text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50">GTO AI</span>
            </span>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm shadow-md shadow-amber-400/20 transition-all cursor-pointer"
          >
            Entrar / Criar Conta Grátis
          </button>
        </header>

        {/* Hero Section com Simulador Interativo Imediato */}
        <section className="px-4 py-12 md:py-20 max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-bold mb-6 shadow-inner">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Teste o Motor GTO Agora (Sem Cadastro Necessário)</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black font-serif tracking-tight text-white mb-4 max-w-3xl leading-tight">
            Pare de perder dinheiro em spots difíceis. Deixe a IA calcular o <span className="text-amber-400">EV perfeito</span>.
          </h1>
          <p className="text-sm md:text-base text-slate-300 mb-8 max-w-2xl leading-relaxed">
            Assistente estratégico de Texas Hold'em para análise pós-sessão e treino de ranges. Veja a recomendação GTO instantânea abaixo:
          </p>

          {/* Widget Interativo na LP (Aha Moment) */}
          <div className="w-full bg-[#0c2419] border border-amber-400/30 rounded-3xl p-5 md:p-8 shadow-2xl text-left mb-8 flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300">
                1. Situação de Mesa Exemplo:
              </label>
              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-800/60">
                <div className="font-bold text-sm text-amber-300 mb-1">{sampleSc.title}</div>
                <p className="text-xs text-slate-300 mb-3">{sampleSc.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-amber-400 text-slate-950 px-2.5 py-1 rounded">
                    Hero: {sampleSc.extraction.hero_hand.join(' ')}
                  </span>
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-700">
                    Posição: {sampleSc.extraction.position}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAuthenticated(true)}
                className="py-3 px-4 rounded-xl bg-emerald-900/40 border border-emerald-700 text-xs font-bold text-emerald-300 hover:bg-emerald-800/50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Abrir App Completo e Testar Outras Mãos</span>
              </button>
            </div>

            <div className="flex-1 bg-black/40 border border-emerald-800/60 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Análise GTO Instantânea</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">Confiança: 98%</span>
                </div>

                <div className="mb-4">
                  <span className="text-[10px] text-slate-400 block uppercase">Ação Recomendada</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {initialLpDecision.primaryAction} ({initialLpDecision.recommendedBetSize})
                  </span>
                </div>

                <div className="mb-4">
                  <span className="text-[10px] text-slate-400 block uppercase">Justificativa Tática</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {initialLpDecision.tacticalJustification}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Criar Conta Grátis e Usar IA de Câmera</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> Sem cartão de crédito necessário para o plano gratuito.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MODAL DE AUTENTICAÇÃO SIMULADO/FIREBASE ---
  if (showAuthModal && !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="w-full max-w-md bg-[#0c2419] border border-amber-400/40 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-800/60">
            <h3 className="text-lg font-bold text-amber-300 font-serif">Acesse o Poker Vision AI</h3>
            <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
          </div>
          <p className="text-xs text-slate-300">Entre com sua conta para desbloquear análises ilimitadas, captura por câmera e histórico de sessões.</p>
          <button
            onClick={() => {
              setIsAuthenticated(true);
              setShowAuthModal(false);
            }}
            className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-400/30 cursor-pointer"
          >
            Entrar com Google / E-mail
          </button>
          <button
            onClick={() => setShowAuthModal(false)}
            className="text-xs text-slate-400 hover:text-white text-center underline cursor-pointer"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  // --- APLICAÇÃO PRINCIPAL (DASHBOARD LOGADO) ---
  return (
    <div className="min-h-screen bg-[#06130d] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950 pb-20">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-emerald-900/50 bg-[#081a12]/90 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-amber-500/20">
            PV
          </div>
          <div>
            <h1 className="font-serif font-black text-sm sm:text-base tracking-wide text-amber-300 leading-tight">
              Poker Vision AI
            </h1>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Motor GTO Ativo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRangeMatrixOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-700/60 hover:border-amber-400 text-xs font-bold text-emerald-200 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Grid className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Matriz 13x13</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCaptureOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capturar Mesa</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            title="Sair"
            className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-slate-400 hover:text-rose-400 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-3 sm:p-5 flex flex-col gap-5">
        {/* Scenario Quick Presets Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
            Exemplos:
          </span>
          {SAMPLE_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleScenarioSelected(sc)}
              className="px-3 py-1 rounded-xl bg-[#0c2419] border border-emerald-800/60 hover:border-amber-400/80 text-xs text-emerald-200 shrink-0 transition-all cursor-pointer font-medium"
            >
              {sc.title}
            </button>
          ))}
        </div>

        {/* Table Cards Visual Component */}
        <TableCardsView
          heroHand={heroHand}
          board={board}
          stage={stage}
          onCardSlotClick={(target, boardIdx) => {
            if (target === 'hero1') {
              setCardPickerConfig({ isOpen: true, title: 'Selecione a 1ª Carta do Hero', maxCards: 2, target: 'hero1' });
            } else if (target === 'hero2') {
              setCardPickerConfig({ isOpen: true, title: 'Selecione a 2ª Carta do Hero', maxCards: 2, target: 'hero2' });
            } else if (target === 'board') {
              setCardPickerConfig({ isOpen: true, title: `Selecione a Carta ${ (boardIdx || 0) + 1 } do Board`, maxCards: 5, target: 'board', boardIndex: boardIdx });
            }
          }}
          onRemoveCard={(target, index) => {
            if (target === 'hero') {
              const updated = [...heroHand];
              updated[index] = '';
              setHeroHand(updated.filter(Boolean));
            } else if (target === 'board') {
              const updated = [...board];
              updated.splice(index, 1);
              setBoard(updated);
            }
          }}
        />

        {/* Quick Chips & Table Parameters Panel */}
        <QuickChipsPanel
          position={position}
          onPositionChange={setPosition}
          stackBB={stackBB}
          onStackChange={setStackBB}
          villains={villains}
          onVillainsChange={setVillains}
          actionToHero={actionToHero}
          onActionChange={setActionToHero}
          stage={stage}
          onStageChange={setStage}
        />

        {/* Decision GTO Result Display */}
        <DecisionDisplay decision={decision} />
      </main>

      {/* --- MODAIS DO SISTEMA --- */}
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onImageCaptured={handleImageCaptured}
        onScenarioSelected={(sc) => {
          handleScenarioSelected(sc);
          setIsCaptureOpen(false);
        }}
        isProcessing={isProcessingVision}
      />

      <CardPickerModal
        isOpen={cardPickerConfig.isOpen}
        onClose={() => setCardPickerConfig(prev => ({ ...prev, isOpen: false }))}
        selectedCards={[...heroHand, ...board]}
        usedCards={[...heroHand, ...board]}
        maxCards={cardPickerConfig.maxCards}
        title={cardPickerConfig.title}
        onSelectCard={(card) => {
          if (cardPickerConfig.target === 'hero1') {
            const updated = [...heroHand];
            updated[0] = card;
            setHeroHand(updated.filter(Boolean));
          } else if (cardPickerConfig.target === 'hero2') {
            const updated = [...heroHand];
            updated[1] = card;
            setHeroHand(updated.filter(Boolean));
          } else if (cardPickerConfig.target === 'board' && cardPickerConfig.boardIndex !== undefined) {
            const updated = [...board];
            updated[cardPickerConfig.boardIndex] = card;
            setBoard(updated);
          }
          setCardPickerConfig(prev => ({ ...prev, isOpen: false }));
        }}
      />

      <RangeMatrixModal
        isOpen={isRangeMatrixOpen}
        onClose={() => setIsRangeMatrixOpen(false)}
        heroCards={heroHand}
        currentPosition={position}
      />
    </div>
  );
}
