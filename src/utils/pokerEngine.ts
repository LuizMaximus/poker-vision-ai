import { PokerDecision, TablePosition, Suit } from './pokerTypes';

export type StackDepth = 'low' | 'medium' | 'deep';

export interface FastDecisionInput {
  heroHand: string[];
  board?: string[];
  position: TablePosition;
  stackDepth: StackDepth;
  actionToHero: 'unopened' | 'limp' | 'raise' | '3bet';
}

// Exportações essenciais para os componentes visuais
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export const SUIT_INFO: Record<Suit, { symbol: string; name: string; color: string; bg: string }> = {
  s: { symbol: '♠', name: 'Espadas', color: 'text-slate-200', bg: 'bg-slate-800' },
  h: { symbol: '♥', name: 'Copas', color: 'text-red-500', bg: 'bg-red-950/40' },
  d: { symbol: '♦', name: 'Ouros', color: 'text-blue-400', bg: 'bg-blue-950/40' },
  c: { symbol: '♣', name: 'Paus', color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
};

// Funções auxiliares legadas para compatibilidade de build
export function formatCards(cards: string[]): string {
  if (!cards || !Array.isArray(cards)) return '';
  return cards.join(' ');
}

export function evaluateBoardTexture(board: string[]) {
  if (!board || board.length === 0) return { isMonotone: false, isPaired: false, isConnected: false };
  const suits = board.map((c) => c[1]?.toLowerCase());
  const ranks = board.map((c) => c[0]?.toUpperCase());
  const isMonotone = new Set(suits).size === 1;
  const isPaired = new Set(ranks).size < ranks.length;
  return { isMonotone, isPaired, isConnected: false };
}

// Converte cartas para notação padrão (ex: AhKd -> AKo)
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

  if (idx1 > idx2) {
    return `${r1}${r2}${isSuited ? 's' : 'o'}`;
  } else {
    return `${r2}${r1}${isSuited ? 's' : 'o'}`;
  }
}

const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'];
const STRONG_HANDS = ['99', '88', '77', 'AJs', 'ATs', 'AQo', 'KQs', 'KJs'];
const PLAYABLE_HANDS = [
  '66', '55', '44', '33', '22',
  'A9s', 'A8s', 'A5s', 'A4s',
  'AJo', 'ATo', 'KQo', 'QJs', 'JTs', 'T9s', '98s'
];

// Motor rápido de decisão GTO
export function calculateFastDecision(input: FastDecisionInput): PokerDecision {
  const { heroHand, position, stackDepth, actionToHero } = input;

  if (!heroHand || heroHand.length < 2) {
    return {
      action: 'CHECK',
      confidence: 0,
      sizing: 'Selecione 2 cartas',
      rationale: 'Aguardando seleção das duas cartas da mão do Hero.',
      evEstimate: 0,
      riskLevel: 'LOW',
    };
  }

  const handKey = getHandKey(heroHand[0], heroHand[1]);
  const isPremium = PREMIUM_HANDS.includes(handKey);
  const isStrong = STRONG_HANDS.includes(handKey);
  const isPlayable = PLAYABLE_HANDS.includes(handKey);

  // 1. LOW STACK (<= 15 BBs - Push / Fold)
  if (stackDepth === 'low') {
    if (actionToHero === 'unopened' || actionToHero === 'limp') {
      const widePositions = ['CO', 'BTN', 'SB'];
      if (isPremium || isStrong || (isPlayable && widePositions.includes(position))) {
        return {
          action: 'ALL-IN',
          confidence: 0.95,
          sizing: 'ALL-IN (Push)',
          rationale: `Low stack (${stackDepth.toUpperCase()}). Com ${handKey} em ${position}, o shove maximiza fold equity direta.`,
          evEstimate: 2.8,
          riskLevel: 'HIGH',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.9,
        sizing: '0 BB',
        rationale: `Low stack. ${handKey} não tem equidade para ir all-in lucrativamente.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    } else {
      if (isPremium || (isStrong && ['BTN', 'BB'].includes(position))) {
        return {
          action: 'ALL-IN',
          confidence: 0.95,
          sizing: 'ALL-IN (Re-shove)',
          rationale: `Re-shove lucrativo contra raise inicial. Mão no topo do range para stack curto.`,
          evEstimate: 3.5,
          riskLevel: 'HIGH',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.95,
        sizing: '0 BB',
        rationale: `Fold para raise ativo com stack curto.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    }
  }

  // 2. MEDIUM STACK (20 - 45 BBs - Padrão Torneio)
  if (stackDepth === 'medium') {
    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) {
        return {
          action: 'RAISE',
          confidence: 0.92,
          sizing: '2.2x - 2.5x BB',
          rationale: `Open-raise padrão com ${handKey} de ${position}. Range forte com controle de pote.`,
          evEstimate: 1.8,
          riskLevel: 'MEDIUM',
        };
      }
      if (isPlayable && ['CO', 'BTN', 'SB'].includes(position)) {
        return {
          action: 'RAISE',
          confidence: 0.85,
          sizing: '2.0x - 2.2x BB',
          rationale: `Roubo de blinds rentável em posição tardia (${position}).`,
          evEstimate: 1.1,
          riskLevel: 'MEDIUM',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.88,
        sizing: '0 BB',
        rationale: `Fold conservador em ${position}. Evita potes marginais fora de posição.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    }

    if (actionToHero === 'raise') {
      if (isPremium) {
        return {
          action: 'RAISE',
          confidence: 0.95,
          sizing: '3-Bet (6.5x - 8x BB)',
          rationale: `3-Bet de valor claro contra abertura.`,
          evEstimate: 3.2,
          riskLevel: 'HIGH',
        };
      }
      if (isStrong && position === 'BB') {
        return {
          action: 'CALL',
          confidence: 0.82,
          sizing: 'Defender BB',
          rationale: `Preço favorável na Big Blind com mão conectada/forte.`,
          evEstimate: 0.8,
          riskLevel: 'MEDIUM',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.9,
        sizing: '0 BB',
        rationale: `Fold para raise em stack médio. Mão vulnerável a 4-bets.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    }
  }

  // 3. DEEP STACK (50+ BBs - Cash Game)
  if (actionToHero === 'unopened') {
    if (isPremium || isStrong || isPlayable) {
      return {
        action: 'RAISE',
        confidence: 0.9,
        sizing: '2.5x - 3.0x BB',
        rationale: `Deep stack: abrindo ${handKey} em ${position} por implied odds.`,
        evEstimate: 2.1,
        riskLevel: 'MEDIUM',
      };
    }
    return {
      action: 'FOLD',
      confidence: 0.88,
      sizing: '0 BB',
      rationale: `Fold pré-flop em spot deep.`,
      evEstimate: 0,
      riskLevel: 'LOW',
    };
  }

  if (actionToHero === 'raise') {
    if (isPremium) {
      return {
        action: 'RAISE',
        confidence: 0.96,
        sizing: '3-Bet (3.0x a 3.5x)',
        rationale: `Construção de pote com mãos de topo.`,
        evEstimate: 3.8,
        riskLevel: 'HIGH',
      };
    }
    if ((isStrong || isPlayable) && ['BTN', 'CO', 'BB'].includes(position)) {
      return {
        action: 'CALL',
        confidence: 0.85,
        sizing: 'Pagar Raise',
        rationale: `Call justificável por implied odds em profundidade de stack.`,
        evEstimate: 1.2,
        riskLevel: 'MEDIUM',
      };
    }
    return {
      action: 'FOLD',
      confidence: 0.9,
      sizing: '0 BB',
      rationale: `Fold para raise. Evita vazamento de fichas pós-flop.`,
      evEstimate: 0,
      riskLevel: 'LOW',
    };
  }

  return {
    action: isPremium ? 'RAISE' : isStrong ? 'CALL' : 'FOLD',
    confidence: 0.8,
    sizing: isPremium ? '2.5x BB' : '0 BB',
    rationale: `Linha padrão para o spot com ${handKey}.`,
    evEstimate: 0.5,
    riskLevel: 'MEDIUM',
  };
}

// Alias legado para que nenhum componente antigo falhe no import
export const calculateDecision = (params: any) => {
  const stackBB = params.effectiveStackBB || 40;
  const depth: StackDepth = stackBB <= 15 ? 'low' : stackBB <= 45 ? 'medium' : 'deep';
  return calculateFastDecision({
    heroHand: params.heroCardsRaw || [],
    board: params.boardCardsRaw || [],
    position: params.position || 'BTN',
    stackDepth: depth,
    actionToHero: params.actionToHero || 'unopened',
  });
};
