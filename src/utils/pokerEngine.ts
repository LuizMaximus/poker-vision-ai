import { PokerDecision, TablePosition, Suit } from './pokerTypes';

export type StackDepth = 'low' | 'medium' | 'deep';
export type GameMode = 'CASH' | 'MTT' | 'SPIN';

export interface FastDecisionInput {
  heroHand: string[];
  board?: string[];
  position: TablePosition;
  stackDepth: StackDepth;
  actionToHero: 'unopened' | 'limp' | 'raise' | '3bet';
  gameMode: GameMode;
}

// Exportações para os componentes visuais
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export const SUIT_INFO: Record<Suit, { symbol: string; name: string; color: string; bg: string }> = {
  s: { symbol: '♠', name: 'Espadas', color: 'text-slate-200', bg: 'bg-slate-800' },
  h: { symbol: '♥', name: 'Copas', color: 'text-red-500', bg: 'bg-red-950/40' },
  d: { symbol: '♦', name: 'Ouros', color: 'text-blue-400', bg: 'bg-blue-950/40' },
  c: { symbol: '♣', name: 'Paus', color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
};

// Compatibilidade legada
export function formatCards(cards: string[]): string {
  if (!cards || !Array.isArray(cards)) return '';
  return cards.join(' ');
}

export function evaluateBoardTexture(board: string[]) {
  if (!board || board.length === 0) return { isMonotone: false, isPaired: false, isConnected: false };
  const suits = board.map((c) => c[1]?.toLowerCase());
  const ranks = board.map((c) => c[0]?.toUpperCase());
  return { isMonotone: new Set(suits).size === 1, isPaired: new Set(ranks).size < ranks.length, isConnected: false };
}

function getHandKey(card1: string, card2: string): string {
  if (!card1 || !card2) return '';
  const r1 = card1[0]?.toUpperCase();
  const r2 = card2[0]?.toUpperCase();
  const s1 = card1[1]?.toLowerCase();
  const s2 = card2[1]?.toLowerCase();

  const rankOrder = '23456789TJQKA';
  const idx1 = rankOrder.indexOf(r1);
  const idx2 = rankOrder.indexOf(r2);

  if (idx1 === -1 || idx2 === -1) return '';
  if (idx1 === idx2) return `${r1}${r2}`;
  const isSuited = s1 === s2;

  return idx1 > idx2 ? `${r1}${r2}${isSuited ? 's' : 'o'}` : `${r2}${r1}${isSuited ? 's' : 'o'}`;
}

const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'];
const STRONG_HANDS = ['99', '88', '77', 'AJs', 'ATs', 'AQo', 'KQs', 'KJs'];
const PLAYABLE_HANDS = ['66', '55', '44', '33', '22', 'A9s', 'A8s', 'A5s', 'A4s', 'AJo', 'ATo', 'KQo', 'QJs', 'JTs', 'T9s', '98s'];
// Range extra para agressividade no Spin & Go (Qualquer Ás, Reis naipados)
const SPIN_PUSH_HANDS = [...PREMIUM_HANDS, ...STRONG_HANDS, ...PLAYABLE_HANDS, 'A2o', 'A3o', 'A4o', 'A5o', 'A6o', 'A7o', 'A8o', 'A9o', 'K9s', 'K8s', 'Q9s'];

export function calculateFastDecision(input: FastDecisionInput): PokerDecision {
  const { heroHand, position, stackDepth, actionToHero, gameMode } = input;

  if (!heroHand || heroHand.length < 2) {
    return { action: 'CHECK', confidence: 0, sizing: '-', rationale: 'Aguardando seleção das cartas.', evEstimate: 0, riskLevel: 'LOW' };
  }

  const handKey = getHandKey(heroHand[0], heroHand[1]);
  const isPremium = PREMIUM_HANDS.includes(handKey);
  const isStrong = STRONG_HANDS.includes(handKey);
  const isPlayable = PLAYABLE_HANDS.includes(handKey);
  const isSpinPush = SPIN_PUSH_HANDS.includes(handKey);

  // ==========================================
  // ESTRATÉGIA 1: SPIN & GO (SIT & GO 3-Max)
  // ==========================================
  if (gameMode === 'SPIN') {
    if (stackDepth === 'low') {
      if (actionToHero === 'unopened') {
        if (isSpinPush) return { action: 'ALL-IN', confidence: 0.98, sizing: 'Push', rationale: `Spin&Go Nash: Shove lucrativo com ${handKey} do ${position}. Foca na fold equity extrema.`, evEstimate: 3.0, riskLevel: 'HIGH' };
        return { action: 'FOLD', confidence: 0.9, sizing: '0 BB', rationale: 'Mão muito fraca até para Nash push.', evEstimate: 0, riskLevel: 'LOW' };
      }
      if (actionToHero === 'raise') {
        if (isPremium || isStrong) return { action: 'ALL-IN', confidence: 0.95, sizing: 'Re-shove', rationale: 'Top range, re-shove obrigatório em mesas curtas.', evEstimate: 4.0, riskLevel: 'HIGH' };
        return { action: 'FOLD', confidence: 0.9, sizing: '0 BB', rationale: 'Fold contra raise ativo no Spin.', evEstimate: 0, riskLevel: 'LOW' };
      }
    }
    // Spin Medium/Deep
    if (actionToHero === 'unopened') {
      if (isPremium || isStrong || isPlayable) return { action: 'RAISE', confidence: 0.9, sizing: '2.0x BB', rationale: `Min-raise em ${position} para roubar blinds em Spin&Go.`, evEstimate: 1.5, riskLevel: 'MEDIUM' };
      return { action: 'FOLD', confidence: 0.9, sizing: '0 BB', rationale: 'Fold GTO.', evEstimate: 0, riskLevel: 'LOW' };
    }
  }

  // ==========================================
  // ESTRATÉGIA 2: CASH GAME (Rake-Aware, Deep)
  // ==========================================
  if (gameMode === 'CASH') {
    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) {
        return { action: 'RAISE', confidence: 0.95, sizing: '3.0x - 3.5x BB', rationale: `Cash Game: Open-raise maior (3x) para bater o Rake e extrair valor.`, evEstimate: 2.5, riskLevel: 'MEDIUM' };
      }
      if (isPlayable && ['CO', 'BTN'].includes(position)) {
        return { action: 'RAISE', confidence: 0.85, sizing: '2.5x BB', rationale: `Roubo em posição. Evite jogar pots deep sem posição no Cash Game.`, evEstimate: 1.2, riskLevel: 'MEDIUM' };
      }
      return { action: 'FOLD', confidence: 0.9, sizing: '0 BB', rationale: `Fold. Jogar mãos marginais em Cash atrai perdas enormes pós-flop devido ao Rake.`, evEstimate: 0, riskLevel: 'LOW' };
    }
    if (actionToHero === 'raise') {
      if (isPremium) return { action: 'RAISE', confidence: 0.95, sizing: '3-Bet (3.5x o Raise)', rationale: `3-Bet polarizado de alto valor (Cash Game).`, evEstimate: 4.0, riskLevel: 'HIGH' };
      if ((isStrong || isPlayable) && position === 'BB') return { action: 'CALL', confidence: 0.85, sizing: 'Pagar (Call)', rationale: `Defender o BB por Implied Odds em stacks profundos.`, evEstimate: 1.0, riskLevel: 'MEDIUM' };
      return { action: 'FOLD', confidence: 0.9, sizing: '0 BB', rationale: `Fold seguro contra open-raise no Cash.`, evEstimate: 0, riskLevel: 'LOW' };
    }
  }

  // ==========================================
  // ESTRATÉGIA 3: MTT (Torneio / ICM / Antes)
  // ==========================================
  if (stackDepth === 'low') {
    if (actionToHero === 'unopened' || actionToHero === 'limp') {
      if (isPremium || isStrong || (isPlayable && ['CO', 'BTN', 'SB'].includes(position))) {
        return { action: 'ALL-IN', confidence: 0.95, sizing: 'Push', rationale: `MTT: All-in direto para roubar os blinds + Antes e evitar jogar pós-flop curto.`, evEstimate: 2.8, riskLevel: 'HIGH' };
      }
      return { action: 'FOLD', confidence: 0.9, sizing: '0 BB', rationale: `MTT: Preservar fold equity futura.`, evEstimate: 0, riskLevel: 'LOW' };
    }
    if (actionToHero === 'raise') {
      if (isPremium || (isStrong && ['BTN', 'BB'].includes(position))) return { action: 'ALL-IN', confidence: 0.95, sizing: 'Re-shove', rationale: `MTT Re-shove de valor.`, evEstimate: 3.5, riskLevel: 'HIGH' };
      return { action: 'FOLD', confidence: 0.95, sizing: '0 BB', rationale: `Não envolver a vida do torneio contra raises dominantes.`, evEstimate: 0, riskLevel: 'LOW' };
    }
  }

  if (stackDepth === 'medium' || stackDepth === 'deep') {
    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) return { action: 'RAISE', confidence: 0.92, sizing: '2.1x - 2.2x BB', rationale: `MTT: Open-raise otimizado. Arriscar poucas fichas para ganhar os Antes.`, evEstimate: 1.8, riskLevel: 'MEDIUM' };
      if (isPlayable && ['CO', 'BTN', 'SB'].includes(position)) return { action: 'RAISE', confidence: 0.85, sizing: '2.0x BB', rationale: `MTT: Roubo lucrativo em posição late.`, evEstimate: 1.1, riskLevel: 'MEDIUM' };
      return { action: 'FOLD', confidence: 0.88, sizing: '0 BB', rationale: `Fold padrão MTT.`, evEstimate: 0, riskLevel: 'LOW' };
    }
    if (actionToHero === 'raise') {
      if (isPremium) return { action: 'RAISE', confidence: 0.95, sizing: '3-Bet (2.5x a 3x)', rationale: `MTT: 3-Bet extraindo valor do topo do range.`, evEstimate: 3.2, riskLevel: 'HIGH' };
      if (isStrong && position === 'BB') return { action: 'CALL', confidence: 0.82, sizing: 'Defender BB', rationale: `MTT: Ótimas pot odds por causa dos Antes no pote.`, evEstimate: 0.8, riskLevel: 'MEDIUM' };
      return { action: 'FOLD', confidence: 0.9, sizing: '0 BB', rationale: `ICM Fold: evite vazamento de fichas em potes inflados.`, evEstimate: 0, riskLevel: 'LOW' };
    }
  }

  return { action: isPremium ? 'RAISE' : 'FOLD', confidence: 0.8, sizing: isPremium ? '2.5x BB' : '0 BB', rationale: `Linha de segurança conservadora.`, evEstimate: 0.5, riskLevel: 'LOW' };
}

export const calculateDecision = (params: any) => {
  return calculateFastDecision({
    heroHand: params.heroCardsRaw || [],
    position: params.position || 'BTN',
    stackDepth: 'medium',
    actionToHero: params.actionToHero || 'unopened',
    gameMode: 'MTT',
  });
};
