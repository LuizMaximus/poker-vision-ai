import React, { useState, useMemo } from 'react';
import {
  Position,
  Stage,
  ActionToHero,
  SampleScenario,
  VisionExtraction,
} from './utils/pokerTypes';
import { calculateDecision, normalizeCard } from './utils/pokerEngine';
import { SAMPLE_SCENARIOS } from './utils/sampleTables';
import { TableCardsView } from './components/TableCardsView';
import { QuickChipsPanel } from './components/QuickChipsPanel';
import { DecisionDisplay } from './components/DecisionDisplay';
import { CaptureModal } from './components/CaptureModal';
import { CardPickerModal } from './components/CardPickerModal';
import { RangeMatrixModal } from './components/RangeMatrixModal';
import {
  Camera,
  RotateCcw,
  Grid,
  Sparkles,
  Info,
  ChevronDown,
  Layers,
} from 'lucide-react';

export default function App() {
  // Game & Extraction State (Default with first realistic sample)
  const defaultScenario = SAMPLE_SCENARIOS[0];
  const [heroHand, setHeroHand] = useState<string[]>(defaultScenario.extraction.hero_hand);
  const [board, setBoard] = useState<string[]>(defaultScenario.extraction.board);
  const [stage, setStage] = useState<Stage>(defaultScenario.extraction.stage);
  const [position, setPosition] = useState<Position | null>(defaultScenario.extraction.position);
  const [stackBB, setStackBB] = useState<number | null>(defaultScenario.extraction.effective_stack_bb);
  const [villains, setVillains] = useState<number | null>(defaultScenario.extraction.active_villains);
  const [actionToHero, setActionToHero] = useState<ActionToHero | null>(
    defaultScenario.extraction.action_to_hero
  );
  const [confidence, setConfidence] = useState(defaultScenario.extraction.confidence);
  const [confidenceSummary, setConfidenceSummary] = useState<string>(
    defaultScenario.extraction.confidence.summary || ''
  );

  // Modals & Async States
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isRangeMatrixOpen, setIsRangeMatrixOpen] = useState(false);
  const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);
  const [cardPickerTarget, setCardPickerTarget] = useState<{
    type: 'hero1' | 'hero2' | 'board';
    boardIndex?: number;
  } | null>(null);

  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [deepAnalysisLoading, setDeepAnalysisLoading] = useState(false);
  const [deepAnalysisResult, setDeepAnalysisResult] = useState<{
    main_line: string;
    sizing_advice: string;
    gto_rationale: string;
    exploits_and_traps?: string;
    next_street_plan?: string;
  } | null>(null);

  // Combined set of in-play cards for picker duplication prevention
  const allUsedCards = useMemo(() => {
    return [...heroHand, ...board];
  }, [heroHand, board]);

  // Strategic Decision calculation (Re-runs instantly whenever any parameter changes)
  const decision = useMemo(() => {
    return calculateDecision({
      heroCardsRaw: heroHand,
      boardCardsRaw: board,
      stage,
      position,
      effectiveStackBB: stackBB,
      activeVillains: villains,
      actionToHero,
    });
  }, [heroHand, board, stage, position, stackBB, villains, actionToHero]);

  // Multimodal Vision Capture Handler
  const handleImageCaptured = async (base64Image: string) => {
    setIsAnalyzingImage(true);
    setDeepAnalysisResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('/api/poker/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Erro do servidor (${response.status})`);
      }

      const extraction: VisionExtraction = await response.json();

      if (extraction.hero_hand && extraction.hero_hand.length > 0) {
        setHeroHand(extraction.hero_hand);
      }
      if (Array.isArray(extraction.board)) {
        setBoard(extraction.board);
      }
      if (extraction.stage) {
        setStage(extraction.stage);
      }
      if (extraction.position) setPosition(extraction.position);
      if (extraction.effective_stack_bb) setStackBB(extraction.effective_stack_bb);
      if (extraction.active_villains) setVillains(extraction.active_villains);
      if (extraction.action_to_hero) setActionToHero(extraction.action_to_hero);
      if (extraction.confidence) {
        setConfidence(extraction.confidence);
        setConfidenceSummary(extraction.confidence.summary || 'Extração de visão concluída.');
      }

      setIsCaptureModalOpen(false);
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      const msg = err.name === 'AbortError' 
        ? 'A requisição demorou muito (tempo esgotado). Tente novamente.' 
        : (err.message || 'Erro ao processar imagem.');
      alert(`Falha na análise: ${msg}`);
      setIsCaptureModalOpen(false);
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzingImage(false);
    }
  };

  // Scenario selection handler
  const handleScenarioSelected = (scenario: SampleScenario) => {
    const ext = scenario.extraction;
    setHeroHand(ext.hero_hand);
    setBoard(ext.board);
    setStage(ext.stage);
    setPosition(ext.position);
    setStackBB(ext.effective_stack_bb);
    setVillains(ext.active_villains);
    setActionToHero(ext.action_to_hero);
    setConfidence(ext.confidence);
    setConfidenceSummary(ext.confidence.summary || scenario.description);
    setDeepAnalysisResult(null);
  };

  // Deep GTO Analysis with Gemini
  const handleDeepAnalysis = async () => {
    setDeepAnalysisLoading(true);
    try {
      const res = await fetch('/api/poker/strategic-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_hand: heroHand,
          board,
          stage,
          position,
          effective_stack_bb: stackBB,
          active_villains: villains,
          action_to_hero: actionToHero,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha na análise aprofundada');
      }

      const data = await res.json();
      setDeepAnalysisResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDeepAnalysisLoading(false);
    }
  };

  // Card slot click handler
  const handleCardSlotClick = (target: 'hero1' | 'hero2' | 'board', boardIndex?: number) => {
    setCardPickerTarget({ type: target, boardIndex });
    setIsCardPickerOpen(true);
  };

  // Card selected from picker
  const handleSelectCard = (cardRaw: string) => {
    if (!cardPickerTarget) return;

    if (cardPickerTarget.type === 'hero1') {
      const newHand = [...heroHand];
      newHand[0] = cardRaw;
      setHeroHand(newHand);
    } else if (cardPickerTarget.type === 'hero2') {
      const newHand = [...heroHand];
      newHand[1] = cardRaw;
      setHeroHand(newHand);
    } else if (cardPickerTarget.type === 'board') {
      const newBoard = [...board];
      const idx = cardPickerTarget.boardIndex ?? newBoard.length;
      if (idx < newBoard.length) {
        newBoard[idx] = cardRaw;
      } else {
        newBoard.push(cardRaw);
      }
      setBoard(newBoard);
      // Auto-update stage based on board length
      if (newBoard.length >= 5) setStage('river');
      else if (newBoard.length === 4) setStage('turn');
      else if (newBoard.length === 3) setStage('flop');
    }

    setCardPickerTarget(null);
  };

  // Remove card handler
  const handleRemoveCard = (target: 'hero' | 'board', index: number) => {
    if (target === 'hero') {
      const newHand = [...heroHand];
      newHand.splice(index, 1);
      setHeroHand(newHand);
    } else {
      const newBoard = [...board];
      newBoard.splice(index, 1);
      setBoard(newBoard);
      if (newBoard.length === 0) setStage('preflop');
      else if (newBoard.length <= 3) setStage('flop');
      else if (newBoard.length === 4) setStage('turn');
    }
  };

  // Stage change sync with board cards
  const handleStageChange = (newStage: Stage) => {
    setStage(newStage);
    if (newStage === 'preflop') {
      setBoard([]);
    } else if (newStage === 'flop' && board.length < 3) {
      // If user toggles to flop with fewer than 3 cards, leave what they have or prompt
    }
  };

  // Reset table handler
  const handleResetTable = () => {
    setHeroHand(['As', 'Kh']);
    setBoard([]);
    setStage('preflop');
    setPosition('BTN');
    setStackBB(40);
    setVillains(1);
    setActionToHero('unopened');
    setConfidenceSummary('Mesa redefinida para configuração padrão.');
    setDeepAnalysisResult(null);
  };

  return (
    <div className="min-h-screen casino-felt text-slate-100 flex flex-col items-center p-3 sm:p-5 select-none pb-20">
      {/* Mobile constraint container */}
      <main className="w-full max-w-md flex flex-col gap-4">
        {/* 1. Header Bar */}
        <header className="flex items-center justify-between py-2 border-b border-emerald-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 text-slate-950 font-black font-serif text-lg border border-amber-200">
              ♠
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black font-serif tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300">
                  Poker Vision AI
                </h1>
                <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/40">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-[10px] text-emerald-300/80 -mt-0.5">
                Tomada de Decisão em Tempo Real • Texas Hold'em
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsRangeMatrixOpen(true)}
              aria-label="Abrir Matriz de Ranges GTO"
              title="Ver Matriz de Ranges GTO"
              className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:text-amber-300 hover:border-amber-400/60 transition-all cursor-pointer shadow-md"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetTable}
              aria-label="Redefinir mesa"
              title="Redefinir mesa"
              className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:text-amber-300 hover:border-amber-400/60 transition-all cursor-pointer shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. Prominent Camera / Vision Capture Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#173e2a] via-[#1b4b33] to-[#0e2a1d] border-2 border-amber-400/60 p-3.5 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Captura Multimodal
              </span>
              <span className="text-sm font-bold text-white leading-tight">
                Escaneie a mesa ou dê upload
              </span>
              <span className="text-[11px] text-emerald-300/80">
                Extração automática com Gemini Flash
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsCaptureModalOpen(true)}
              aria-label="Capturar Foto da Mesa"
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-400/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>Capturar Mesa</span>
            </button>
          </div>
        </div>

        {/* 3. Strategic Decision Engine (Main Focus) */}
        <section aria-label="Recomendação Estratégica">
          <DecisionDisplay
            decision={decision}
            onDeepAnalysisRequested={handleDeepAnalysis}
            deepAnalysisLoading={deepAnalysisLoading}
            deepAnalysisResult={deepAnalysisResult}
          />
        </section>

        {/* 4. Interactive Table Cards View */}
        <section aria-label="Cartas da Mesa">
          <TableCardsView
            heroHand={heroHand}
            board={board}
            stage={stage}
            onCardSlotClick={handleCardSlotClick}
            onRemoveCard={handleRemoveCard}
            confidenceSummary={confidenceSummary}
          />
        </section>

        {/* 5. Painel Interativo de Confirmação Rápida (Quick Chips) */}
        <section aria-label="Confirmação Rápida de Parâmetros">
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
            onStageChange={handleStageChange}
            confidence={confidence}
          />
        </section>

        {/* Quick Demo Scenarios Footer Drawer */}
        <div className="bg-[#071911]/80 border border-emerald-800/40 rounded-2xl p-3 text-xs flex items-center justify-between">
          <span className="text-emerald-300/80 font-mono">
            Cenários Rápidos:
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {SAMPLE_SCENARIOS.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleScenarioSelected(s)}
                className="px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-700/60 hover:border-amber-400 text-[10px] font-bold text-amber-300 whitespace-nowrap cursor-pointer transition-colors"
              >
                {s.title.split(' ')[0]} {s.extraction.hero_hand.join('')}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Modals */}
      <CaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        onImageCaptured={handleImageCaptured}
        onScenarioSelected={handleScenarioSelected}
        isProcessing={isAnalyzingImage}
      />

      <CardPickerModal
        isOpen={isCardPickerOpen}
        onClose={() => {
          setIsCardPickerOpen(false);
          setCardPickerTarget(null);
        }}
        onSelectCard={handleSelectCard}
        alreadySelectedCards={allUsedCards}
        title={
          cardPickerTarget?.type === 'hero1'
            ? 'Carta 1 do Hero'
            : cardPickerTarget?.type === 'hero2'
            ? 'Carta 2 do Hero'
            : `Carta da Mesa (${stage})`
        }
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
