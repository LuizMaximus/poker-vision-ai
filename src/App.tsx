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
  ArrowRight, 
  Grid, 
  Sparkles,
  Gift,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const [showProUpgradeModal, setShowProUpgradeModal] = useState<boolean>(false);

  const [heroHand, setHeroHand] = useState<string[]>(['As', 'Ah']);
  const [board, setBoard] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>('preflop');
  const [position, setPosition] = useState<Position | null>('BTN');
  const [stackBB, setStackBB] = useState<number | null>(100);
  const [villains, setVillains] = useState<number | null>(1);
  const [actionToHero, setActionToHero] = useState<ActionToHero>('unopened');

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

  const [decision, setDecision] = useState<PokerDecision | null>(null);

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

  const handleBoardSlotClick = (target: 'hero1' | 'hero2' | 'board', _boardIndex?: number) => {
    if (target === 'board') {
      setShowProUpgradeModal(true);
      return;
    }

    if (target === 'hero1') {
      setCardPickerConfig({ isOpen: true, title: 'Selecione a 1ª Carta do Hero', maxCards: 2, target: 'hero1' });
    } else if (target === 'hero2') {
      setCardPickerConfig({ isOpen: true, title: 'Selecione a 2ª Carta do Hero', maxCards: 2, target: 'hero2' });
    }
  };

  return (
    <div className="min-h-screen bg-[#06130d] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950 pb-20">
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

      <main className="max-w-4xl mx-auto p-3 sm:p-5 flex flex-col gap-5">
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

        <TableCardsView
          heroHand={heroHand}
          board={board}
          stage={stage}
          onCardSlotClick={handleBoardSlotClick}
          onRemoveCard={(target, _index) => {
            if (target === 'hero') {
              setHeroHand(heroHand.filter(Boolean));
            } else if (target === 'board') {
              setShowProUpgradeModal(true);
            }
          }}
          confidenceSummary="Modo de demonstração livre ativado. Toque nas cartas do Hero para testar diferentes combinações pré-flop."
        />

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

        <DecisionDisplay decision={decision} />
      </main>

      {showProUpgradeModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-gradient-to-b from-[#0c2419] to-[#06140e] border border-amber-400/60 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 flex flex-col gap-5 relative">
            <button 
              onClick={() => setShowProUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold w-8 h-8 rounded-full bg-black/40 flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b border-emerald-800/60">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Segurança Antifraude Ativa
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white font-serif mt-1">
                  Ative seus 3 Dias PRO no Mercado Pago
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200 bg-emerald-950/60 p-3.5 rounded-2xl border border-amber-400/30">
                <Gift className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block mb-0.5">3 Dias Grátis, Sem Cobrança Hoje</strong>
                  <span className="text-slate-300 text-xs">Você ganha acesso total à IA de câmera e mesa inteira. Nenhuma cobrança é efetuada no cartão agora.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-200 bg-black/40 p-3.5 rounded-2xl border border-white/5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Por que exigimos o método de pagamento?</strong>
                  <span className="text-slate-400 text-xs">Para evitar abusos e garantir estabilidade aos usuários reais, exigimos um meio de pagamento válido. A assinatura só será cobrada no 4º dia se você decidir continuar. Cancele com 1 clique a qualquer momento.</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  alert('Redirecionando para o checkout seguro do Mercado Pago...');
                  setShowProUpgradeModal(false);
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-[1.01]"
              >
                <span>Continuar para Checkout Seguro (Mercado Pago)</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowProUpgradeModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 text-center py-1.5 cursor-pointer transition-colors"
              >
                Voltar ao modo Pré-Flop (Grátis)
              </button>
            </div>
          </div>
        </div>
      )}

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
          setCardPickerCard(prev => ({ ...prev, isOpen: false }));
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
