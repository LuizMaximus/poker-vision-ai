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

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export const SUIT_INFO: Record<Suit, { symbol: string; name: string; color: string; bg: string }> = {
  s: { symbol: '♠', name: 'Espadas', color: 'text-slate-200', bg: 'bg-slate-800' },
  h: { symbol: '♥', name: 'Copas', color: 'text-red-500', bg: 'bg-red-950/40' },
  d: { symbol: '♦', name: 'Ouros', color: 'text-blue-400', bg: 'bg-blue-950/40' },
  c: { symbol: '♣', name: 'Paus', color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
};

// --- FUNÇÕES DE SUPORTE ---
const getRankVal = (r: string) => '23456789TJQKA'.indexOf(r.toUpperCase());

function getHandKey(card1: string, card2: string): string {
  if (!card1 || !card2) return '';
  const r1 = card1[0]?.toUpperCase();
  const r2 = card2[0]?.toUpperCase();
  const isSuited = card1[1]?.toLowerCase() === card2[1]?.toLowerCase();
  
  const v1 = getRankVal(r1);
  const v2 = getRankVal(r2);
  
  if (v1 === v2) return `${r1}${r2}`;
  return v1 > v2 ? `${r1}${r2}${isSuited ? 's' : 'o'}` : `${r2}${r1}${isSuited ? 's' : 'o'}`;
}

// --- RANGES PRÉ-FLOP ---
const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'];
const STRONG_HANDS = ['99', '88', '77', 'AJs', 'ATs', 'AQo', 'KQs', 'KJs'];
const PLAYABLE_HANDS = ['66', '55', '44', '33', '22', 'A9s', 'A8s', 'A5s', 'A4s', 'AJo', 'ATo', 'KQo', 'QJs', 'JTs', 'T9s', '98s'];
const SPIN_PUSH_HANDS = [...PREMIUM_HANDS, ...STRONG_HANDS, ...PLAYABLE_HANDS, 'A2o', 'A3o', 'A4o', 'A5o', 'A6o', 'A7o', 'A8o', 'A9o', 'K9s', 'K8s', 'Q9s'];

// --- MOTOR PÓS-FLOP (PRO) ---
function evaluatePostFlop(heroHand: string[], board: string[]): { category: string, desc: string, isDraw: boolean } {
  const allCards = [...heroHand, ...board];
  
  // Avaliação de Naipes (Flush / Draw)
  const suitCounts: Record<string, number> = {};
  allCards.forEach(c => { const s = c[1]; suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuitCount = Math.max(...Object.values(suitCounts), 0);
  
  const hasFlush = maxSuitCount >= 5;
  const hasFlushDraw = maxSuitCount === 4;

  // Avaliação de Pares e Ranks
  const hRanks = heroHand.map(c => getRankVal(c[0]));
  const bRanks = board.map(c => getRankVal(c[0]));
  const highestBoardRank = Math.max(...bRanks);
  
  const isPocketPair = hRanks[0] === hRanks[1];
  const isOverpair = isPocketPair && hRanks[0] > highestBoardRank;
  
  let hitBoardCount = 0;
  let isTopPair = false;
  let isMidBottomPair = false;
  
  hRanks.forEach(hr => {
    if (bRanks.includes(hr)) {
      hitBoardCount++;
      if (hr === highestBoardRank) isTopPair = true;
      else isMidBottomPair = true;
    }
  });

  const isTwoPairOrSet = hitBoardCount >= 2 || (isPocketPair && bRanks.includes(hRanks[0]));

  if (hasFlush) return { category: 'monster', desc: 'Flush Completo', isDraw: false };
  if (isTwoPairOrSet) return { category: 'strong', desc: 'Dois Pares ou Trinca (Set)', isDraw: false };
  if (isOverpair) return { category: 'strong', desc: 'Overpair', isDraw: false };
  if (isTopPair) return { category: 'marginal_plus', desc: 'Top Pair', isDraw: false };
  if (hasFlushDraw) return { category: 'draw', desc: 'Flush Draw (Mão na massa)', isDraw: true };
  if (isMidBottomPair) return { category: 'marginal', desc: 'Par Médio/Baixo', isDraw: false };
  
  return { category: 'trash', desc: 'Air (Nenhum acerto relevante)', isDraw: false };
}

// --- FUNÇÃO PRINCIPAL (ROTEADOR) ---
export function calculateFastDecision(input: FastDecisionInput): PokerDecision {
  const { heroHand, board, position, stackDepth, actionToHero, gameMode } = input;

  if (!heroHand || heroHand.length < 2) {
    return { action: 'AGUARDANDO', confidence: 0, sizing: '-', rationale: 'Selecione as 2 cartas do Hero.', evEstimate: 0, riskLevel: 'LOW' };
  }

  // ROTEAMENTO: SE TEM BOARD (>=3 CARTAS), VAI PARA O MOTOR PÓS-FLOP PRO
  if (board && board.length >= 3) {
    const postFlop = evaluatePostFlop(heroHand, board);
    const stage = board.length === 3 ? 'Flop' : board.length === 4 ? 'Turn' : 'River';

    if (postFlop.category === 'monster' || postFlop.category === 'strong') {
      return {
        action: 'RAISE',
        confidence: 0.95,
        sizing: '50% a 75% do Pote',
        rationale: `Modo PRO (${stage}): Você tem ${postFlop.desc}. Extraia valor máximo apostando ou aumentando.`,
        evEstimate: 4.5,
        riskLevel: 'HIGH'
      };
    }

    if (postFlop.category === 'marginal_plus') {
      return {
        action: 'CALL',
        confidence: 0.85,
        sizing: 'Controle de Pote',
        rationale: `Modo PRO (${stage}): ${postFlop.desc}. Mão com valor de showdown. Pague apostas justas, evite potes gigantes.`,
        evEstimate: 1.5,
        riskLevel: 'MEDIUM'
      };
    }

    if (postFlop.isDraw) {
      return {
        action: 'CALL / SEMI-BLUFF',
        confidence: 0.8,
        sizing: 'Baseado em Pot Odds',
        rationale: `Modo PRO (${stage}): Você tem um ${postFlop.desc}. Pode apostar para roubar o pote ou pagar se as odds permitirem.`,
        evEstimate: 1.2,
        riskLevel: 'HIGH'
      };
    }

    return {
      action: 'CHECK / FOLD',
      confidence: 0.9,
      sizing: '0 BB',
      rationale: `Modo PRO (${stage}): ${postFlop.desc}. Desista para qualquer agressão adversária.`,
      evEstimate: 0,
      riskLevel: 'LOW'
    };
  }

  // --- MOTOR PRÉ-FLOP (MANTIDO INTACTO) ---
  const handKey = getHandKey(heroHand[0], heroHand[1]);
  const isPremium = PREMIUM_HANDS.includes(handKey);
  const isStrong = STRONG_HANDS.includes(handKey);
  const isPlayable = PLAYABLE_HANDS.includes(handKey);
  const isSpinPush = SPIN_PUSH_HANDS.includes(handKey);

  if (gameMode === 'SPIN') {
    if (stackDepth === 'low') {
      if (actionToHero === 'unopened') return isSpinPush 
        ? { action: 'ALL-IN', confidence: 0.98, sizing: 'Push', rationale: `Nash Shove lucrativo com ${handKey}.`, evEstimate: 3.0, riskLevel: 'HIGH' }
        : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: 'Fold GTO.', evEstimate: 0, riskLevel: 'LOW' };
    }
    return (isPremium || isStrong || isPlayable) 
      ? { action: 'RAISE', confidence: 0.9, sizing: '2.0x BB', rationale: 'Min-raise em Spin.', evEstimate: 1.5, riskLevel: 'MEDIUM' }
      : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: 'Fold GTO.', evEstimate: 0, riskLevel: 'LOW' };
  }

  if (gameMode === 'CASH') {
    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) return { action: 'RAISE', confidence: 0.95, sizing: '3.0x BB', rationale: `Cash: Open-raise maior por causa do Rake.`, evEstimate: 2.5, riskLevel: 'MEDIUM' };
      if (isPlayable && ['CO', 'BTN'].includes(position)) return { action: 'RAISE', confidence: 0.85, sizing: '2.5x BB', rationale: `Roubo posicional em Cash.`, evEstimate: 1.2, riskLevel: 'MEDIUM' };
      return { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Evite potes deep com mãos fracas.`, evEstimate: 0, riskLevel: 'LOW' };
    }
    if (actionToHero === 'raise') {
      if (isPremium) return { action: 'RAISE', confidence: 0.95, sizing: '3-Bet (3.5x)', rationale: `3-Bet por valor.`, evEstimate: 4.0, riskLevel: 'HIGH' };
      if ((isStrong || isPlayable) && position === 'BB') return { action: 'CALL', confidence: 0.85, sizing: 'Call', rationale: `Defesa de BB deep.`, evEstimate: 1.0, riskLevel: 'MEDIUM' };
      return { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold contra raise em Cash.`, evEstimate: 0, riskLevel: 'LOW' };
    }
  }

  // MTT
  if (stackDepth === 'low') {
    if (actionToHero === 'unopened' || actionToHero === 'limp') return (isPremium || isStrong || (isPlayable && ['CO', 'BTN', 'SB'].includes(position)))
      ? { action: 'ALL-IN', confidence: 0.95, sizing: 'Push', rationale: `MTT Push para roubar blinds/antes.`, evEstimate: 2.8, riskLevel: 'HIGH' }
      : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Preservar stack.`, evEstimate: 0, riskLevel: 'LOW' };
    if (actionToHero === 'raise') return (isPremium || (isStrong && ['BTN', 'BB'].includes(position)))
      ? { action: 'ALL-IN', confidence: 0.95, sizing: 'Re-shove', rationale: `Re-shove valor.`, evEstimate: 3.5, riskLevel: 'HIGH' }
      : { action: 'FOLD', confidence: 0.95, sizing: '0', rationale: `Fold MTT.`, evEstimate: 0, riskLevel: 'LOW' };
  }

  if (actionToHero === 'unopened') {
    if (isPremium || isStrong) return { action: 'RAISE', confidence: 0.92, sizing: '2.2x BB', rationale: `Open MTT Padrão.`, evEstimate: 1.8, riskLevel: 'MEDIUM' };
    if (isPlayable && ['CO', 'BTN', 'SB'].includes(position)) return { action: 'RAISE', confidence: 0.85, sizing: '2.0x BB', rationale: `Roubo late position.`, evEstimate: 1.1, riskLevel: 'MEDIUM' };
    return { action: 'FOLD', confidence: 0.88, sizing: '0', rationale: `Fold MTT.`, evEstimate: 0, riskLevel: 'LOW' };
  }

  if (actionToHero === 'raise') {
    if (isPremium) return { action: 'RAISE', confidence: 0.95, sizing: '3-Bet (2.8x)', rationale: `3-Bet valor.`, evEstimate: 3.2, riskLevel: 'HIGH' };
    if (isStrong && position === 'BB') return { action: 'CALL', confidence: 0.82, sizing: 'Call', rationale: `Call por Odds.`, evEstimate: 0.8, riskLevel: 'MEDIUM' };
    return { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold para raise.`, evEstimate: 0, riskLevel: 'LOW' };
  }

  return { action: 'FOLD', confidence: 0.8, sizing: '0', rationale: `Fold padrão.`, evEstimate: 0, riskLevel: 'LOW' };
}
