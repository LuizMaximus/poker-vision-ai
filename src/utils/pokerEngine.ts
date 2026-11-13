// --- TIPAGENS E ESTRUTURAS DO MOTOR GTO ---
import { Position, Stage, ActionToHero, PokerDecision, SampleScenario } from './pokerTypes';

export interface SuitInfo {
  color: string;
  symbol: string;
}

export const SUIT_INFO: Record<string, SuitInfo> = {
  h: { color: 'text-red-500', symbol: '♥' },
  d: { color: 'text-blue-500', symbol: '♦' },
  c: { color: 'text-emerald-500', symbol: '♣' },
  s: { color: 'text-slate-100', symbol: '♠' }
};

/**
 * Faz o parse de uma string de carta (ex: 'As', 'Th', '2c') retornando rank e naipe.
 */
export function parseCard(cardStr: string): { rank: string; suit: string; color: string; symbol: string } {
  if (!cardStr || cardStr.length < 2) {
    return { rank: '?', suit: '?', color: 'text-slate-400', symbol: '?' };
  }
  const rank = cardStr[0];
  const suitChar = cardStr[1].toLowerCase();
  const suitInfo = SUIT_INFO[suitChar] || { color: 'text-slate-400', symbol: '?' };

  return {
    rank,
    suit: suitChar,
    color: suitInfo.color,
    symbol: suitInfo.symbol
  };
}

/**
 * Cenários de exemplo para testes rápidos e demonstração na Landing Page / App.
 */
export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'btn-open-pairs',
    title: 'Pocket Aces no BTN',
    description: 'Ação aberta emfolded até você no Botão com Ases.',
    extraction: {
      hero_hand: ['As', 'Ah'],
      board: [],
      stage: 'preflop',
      position: 'BTN',
      effective_stack_bb: 100,
      active_villains: 2,
      action_to_hero: 'unopened'
    }
  },
  {
    id: 'bb-defend-broadway',
    title: 'KQ Suited no BB vs BTN',
    description: 'Raise do Botão, você defende no Big Blind.',
    extraction: {
      hero_hand: ['Ks', 'Qs'],
      board: ['Ts', '7h', '2d'],
      stage: 'flop',
      position: 'BB',
      effective_stack_bb: 80,
      active_villains: 1,
      action_to_hero: 'raise'
    }
  },
  {
    id: 'mtt-push-fold',
    title: 'Short Stack Push (12 BB)',
    description: 'Fase final de torneio (MTT) com Par de Oito no CO.',
    extraction: {
      hero_hand: ['8h', '8c'],
      board: [],
      stage: 'preflop',
      position: 'CO',
      effective_stack_bb: 12,
      active_villains: 5,
      action_to_hero: 'unopened'
    }
  }
];

interface EngineInput {
  heroCardsRaw: string[];
  boardCardsRaw: string[];
  stage: Stage;
  position: Position;
  effectiveStackBB: number;
  activeVillains: number;
  actionToHero: ActionToHero;
}

/**
 * Motor principal de cálculo GTO para o Poker Vision AI.
 */
export function calculateDecision(input: EngineInput): PokerDecision {
  const { heroCardsRaw, stage, position, effectiveStackBB } = input;

  // Validação básica
  if (!heroCardsRaw || heroCardsRaw.length < 2) {
    return {
      primaryAction: 'AGUARDANDO',
      actionFrequencies: { fold: 0, checkCall: 0, raise: 0, allIn: 0 },
      handStrengthPercent: 0,
      handCategory: 'Aguardando cartas...',
      tacticalJustification: 'Selecione as 2 cartas do Hero para iniciar a análise GTO.',
      recommendedBetSize: '-',
      equityVsRange: 0,
      rangeAdvantage: 'neutral',
    };
  }

  // Lógica de simulação baseada em GTO simplificado
  const r1 = heroCardsRaw[0]?.[0];
  const r2 = heroCardsRaw[1]?.[0];
  const isPair = r1 === r2;
  const isSuited = heroCardsRaw[0]?.[1] === heroCardsRaw[1]?.[1];

  let primaryAction = 'RAISE';
  let recommendedBetSize = '2.5x - 3x';
  let handCategory = 'Mão Premium / Forte';
  let justification = 'Range ideal para agressão pré-flop considerando equidade e posição GTO.';
  let confidence = 0.95;

  if (effectiveStackBB <= 15 && stage === 'preflop') {
    if (isPair || ['A', 'K', 'Q'].includes(r1)) {
      primaryAction = 'ALL-IN';
      recommendedBetSize = `${effectiveStackBB} BB`;
      handCategory = 'Push or Fold (Short Stack)';
      justification = 'Com stack reduzido, o modelo de Nash recomenda shove direto para maximizar fold equity.';
    } else {
      primaryAction = 'FOLD';
      recommendedBetSize = '-';
      handCategory = 'Lixo / Risco Elevado';
      justification = 'Sem jogabilidade suficiente com 12 BB ou menos frente ao range de shove.';
    }
  } else if (stage === 'preflop') {
    if (isPair || ['A', 'K'].includes(r1) || ['A', 'K'].includes(r2)) {
      primaryAction = position === 'BB' ? 'CHECK / CALL' : 'RAISE';
      recommendedBetSize = position === 'BB' ? 'Defesa' : '3x Open';
      justification = `Excelente valor esperado (EV) na posição ${position} com cartas altas ou par na mão.`;
    } else if (!isSuited && !isPair) {
      primaryAction = 'FOLD';
      recommendedBetSize = '-';
      handCategory = 'Offsuit Desconectado';
      justification = 'Sem conexões fortes ou bloqueadores relevantes para abrir desta posição.';
      confidence = 0.91;
    }
  } else {
    primaryAction = 'CHECK / CALL';
    recommendedBetSize = '50% Pot';
    handCategory = 'Post-flop GTO';
    justification = 'Proteção de range com equidade moderada no board atual.';
  }

  return {
    primaryAction: primaryAction as any,
    actionFrequencies: {
      fold: primaryAction === 'FOLD' ? 85 : 5,
      checkCall: primaryAction === 'CHECK / CALL' ? 70 : 15,
      raise: primaryAction === 'RAISE' ? 75 : 10,
      allIn: primaryAction === 'ALL-IN' ? 90 : 5,
    },
    handStrengthPercent: isPair ? 88 : 72,
    handCategory,
    tacticalJustification: justification,
    recommendedBetSize,
    equityVsRange: 58.4,
    rangeAdvantage: 'hero',
    confidenceScore: confidence
  };
}
