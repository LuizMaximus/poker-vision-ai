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
  LogOut, 
  Lock, 
  Grid, 
  Sparkles,
  Gift,
  CheckCircle
} from 'lucide-react';

export default function App() {
  // --- ESTADOS DA APLICAÇÃO ---
  // isAuthenticated agora começa como TRUE para o usuário entrar direto no app (modo free normal)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  
  // Controla o modal de conversão/cadastro que aparece ao tentar interagir com recursos avançados (como o board)
  const [showProUpgradeModal, setShowProUpgradeModal] = useState<boolean>(false);

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

  // Recalcula a decisão GTO
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

  const handleScenarioSelected = (scenario: SampleScenario) => {
    setHeroHand(scenario.extraction.hero_hand);
    setBoard(scenario.extraction.board);
    setStage(scenario.extraction.stage);
    if (scenario.extraction.position) setPosition(scenario.extraction.position);
    if (scenario.extraction.effective_stack_bb) setStackBB(scenario.extraction.effective_stack_bb);
    if (scenario.extraction.active_villains) setVillains(scenario.extraction.active_villains);
    if (scenario.extraction.action_to_hero) setActionToHero(scenario.extraction.action_to_hero);
  };

  const handleImageCaptured = async (_base64: string) => {
    setIsProcessingVision(true);
    setTimeout(() => {
      handleScenarioSelected(SAMPLE_SCENARIOS[0]);
      setIsProcessingVision(false);
      setIsCaptureOpen(false);
    }, 1500);
  };

  // Interceptador para o clique no board (Gera a conversão amigável PRO)
  const handleBoardSlotClick = (target: 'hero1' | 'hero2' | 'board', boardIndex?: number) => {
    if (target === 'board') {
      // Exibe o modal convidando a criar a conta e ganhar 3 dias PRO grátis
      setShowProUpgradeModal(true);
      return;
    }

    // Se for o Hero, abre o seletor normal no modo Free
    if (target === 'hero1') {
      setCardPickerConfig({ isOpen: true, title: 'Selecione a 1ª Carta do Hero', maxCards: 2, target: 'hero1' });
    } else if (target === 'hero2') {
      setCardPickerConfig({ isOpen: true, title: 'Selecione a 2ª Carta do Hero', maxCards: 2, target: 'hero2' });
    }
  };

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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Modo Free Ativo
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
            onClick={() => setShowProUpgradeModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quero 3 Dias PRO Grátis</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-3 sm:p-5 flex flex-col gap-5">
        {/* Banner Informativo convidativo no topo do App */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#0c2419] to-emerald-950/80 border border-emerald-600/40 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-amber-300">Você está testando o Poker Vision AI livremente!</h2>
              <p className="text-[11px] text-emerald-200/80">Insira suas cartas do Hero abaixo ou crie sua conta para desbloquear o Board completo e a IA de Câmera.</p>
            </div>
          </div>
          <button
            onClick={() => setShowProUpgradeModal(true)}
            className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 shadow cursor-pointer transition-all"
          >
            Criar Conta Grátis
          </button>
        </div>

        {/* Scenario Quick Presets */}
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

        {/* Table Cards View */}
        <TableCardsView
          heroHand={heroHand}
          board={board}
          stage={stage}
          onCardSlotClick={handleBoardSlotClick}
          onRemoveCard={(target, index) => {
            if (target === 'hero') {
              const updated = [...heroHand];
              updated[index] = '';
              setHeroHand(updated.filter(Boolean));
            } else if (target === 'board') {
              setShowProUpgradeModal(true);
            }
          }}
          confidenceSummary="Modo de demonstração livre ativado. Toque nas cartas do Hero para testar diferentes combinações pré-flop."
        />

        {/* Quick Chips Panel */}
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

        {/* Decision GTO Display */}
        <DecisionDisplay decision={decision} />
      </main>

      {/* --- MODAL DE CONVERSÃO / 3 DIAS PRO GRÁTIS --- */}
      {showProUpgradeModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-gradient-to-b from-[#0c2419] to-[#06140e] border border-amber-400/50 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col gap-5 relative">
            <button 
              onClick={() => setShowProUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold w-8 h-8 rounded-full bg-black/40 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-emerald-800/60">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-300 font-serif">Desbloqueie o Flop, Turn e River com IA</h3>
                <p className="text-xs text-emerald-300/80">Crie sua conta gratuita em segundos e ganhe benefícios exclusivos</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-200 bg-black/30 p-3 rounded-2xl border border-white/5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Cadastro 100% Gratuito:</strong> Sem cobrança antecipada para criar sua conta.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200 bg-emerald-950/50 p-3 rounded-2xl border border-amber-400/30">
                <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>3 Dias de Acesso PRO Completo:</strong> Teste o reconhecimento por câmera e análise de mesa inteira por 3 dias sem compromisso.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200 bg-black/30 p-3 rounded-2xl border border-white/5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Assinatura flexível:</strong> Se optar por um plano PRO, a cobrança pelo Mercado Pago só começa a contar <strong>após o término dos 3 dias grátis</strong>.</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  // Aqui você pode disparar a criação de conta via Firebase Auth
                  alert('Redirecionando para cadastro gratuito com 3 dias PRO...');
                  setShowProUpgradeModal(false);
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Criar Conta Grátis (Garantir 3 Dias PRO)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowProUpgradeModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 text-center py-1 cursor-pointer underline"
              >
                Continuar testando apenas no Pré-Flop (Modo Free)
              </button>
            </div>
          </div>
        </div>
      )}

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
