import {
  CardObject,
  Rank,
  Suit,
  Position,
  Stage,
  ActionToHero,
  StrategicRecommendation,
  PrimaryAction,
} from './pokerTypes';

// Rank values
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  'T': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export const SUIT_INFO: Record<
  Suit,
  { name: string; symbol: string; colorClass: string; hex: string; bgClass: string }
> = {
  s: { name: 'Espadas', symbol: '♠', colorClass: 'text-slate-900', hex: '#1e293b', bgClass: 'bg-slate-100 text-slate-900' },
  h: { name: 'Copas', symbol: '♥', colorClass: 'text-rose-600', hex: '#e11d48', bgClass: 'bg-rose-50 text-rose-600' },
  d: { name: 'Ouros', symbol: '♦', colorClass: 'text-blue-600', hex: '#2563eb', bgClass: 'bg-blue-50 text-blue-600' }, // 4-color deck blue for diamonds
  c: { name: 'Paus', symbol: '♣', colorClass: 'text-emerald-700', hex: '#047857', bgClass: 'bg-emerald-50 text-emerald-700' }, // 4-color green for clubs
};

export function normalizeCard(cardStr: string): string | null {
  if (!cardStr) return null;
  const clean = cardStr.trim().replace(/\s+/g, '');
  if (clean.length < 2) return null;

  let rPart = clean.slice(0, -1).toUpperCase();
  let sPart = clean.slice(-1).toLowerCase();

  // If passed e.g. "10h" or "10H"
  if (rPart === '10') rPart = 'T';

  // In case inverted like "hA"
  if (['s', 'h', 'd', 'c'].includes(clean[0].toLowerCase()) && clean.length === 2) {
    sPart = clean[0].toLowerCase();
    rPart = clean[1].toUpperCase();
    if (rPart === '10') rPart = 'T';
  }

  const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const validSuits = ['s', 'h', 'd', 'c'];

  if (!validRanks.includes(rPart) || !validSuits.includes(sPart)) {
    return null;
  }

  return `${rPart}${sPart}`;
}

export function parseCard(cardStr: string): CardObject | null {
  const norm = normalizeCard(cardStr);
  if (!norm) return null;
  return {
    raw: norm,
    rank: norm[0] as Rank,
    suit: norm[1] as Suit,
  };
}

export function parseCards(cardList: string[]): CardObject[] {
  return cardList
    .map(normalizeCard)
    .filter((c): c is string => c !== null)
    .map((norm) => ({
      raw: norm,
      rank: norm[0] as Rank,
      suit: norm[1] as Suit,
    }));
}

/**
 * Chen Formula score for 2 preflop cards
 */
export function calculateChenScore(card1: CardObject, card2: CardObject): number {
  let highCard = RANK_VALUES[card1.rank] >= RANK_VALUES[card2.rank] ? card1 : card2;
  let lowCard = highCard === card1 ? card2 : card1;

  let highVal = RANK_VALUES[highCard.rank];
  let lowVal = RANK_VALUES[lowCard.rank];

  // Base score on highest card
  let score = 0;
  if (highVal === 14) score = 10;
  else if (highVal === 13) score = 8;
  else if (highVal === 12) score = 7;
  else if (highVal === 11) score = 6;
  else score = highVal / 2;

  // Pairs
  if (highVal === lowVal) {
    score = score * 2;
    if (score < 5) score = 5;
    return score;
  }

  // Suited
  if (highCard.suit === lowCard.suit) {
    score += 2;
  }

  // Closeness / Gap
  const gap = highVal - lowVal - 1;
  if (gap === 0) score += 1; // Connected
  else if (gap === 1) score -= 1; // 1-gap
  else if (gap === 2) score -= 2; // 2-gap
  else if (gap === 3) score -= 4; // 3-gap
  else score -= 5; // 4+ gap

  // Ace wheel bonus (A-2, A-3, A-4, A-5)
  if (highVal === 14 && lowVal <= 5) {
    score += 1;
  }

  return Math.max(score, 0);
}

/**
 * Push / Fold chart logic for short stacks (<14 BBs)
 */
export function isPushFoldHand(
  card1: CardObject,
  card2: CardObject,
  position: Position,
  stackBB: number
): boolean {
  const highVal = Math.max(RANK_VALUES[card1.rank], RANK_VALUES[card2.rank]);
  const lowVal = Math.min(RANK_VALUES[card1.rank], RANK_VALUES[card2.rank]);
  const isPair = highVal === lowVal;
  const isSuited = card1.suit === card2.suit;

  // Pocket pairs are always pushes under 12 BB
  if (isPair) return true;

  // Aces are almost always pushes
  if (highVal === 14) {
    if (isSuited) return true;
    if (stackBB <= 10) return true;
    if (position === 'SB' || position === 'BTN' || position === 'CO') return lowVal >= 4;
    return lowVal >= 8;
  }

  // Kings
  if (highVal === 13) {
    if (isSuited) {
      if (position === 'BTN' || position === 'SB' || position === 'CO') return true;
      return lowVal >= 7;
    }
    if (position === 'BTN' || position === 'SB') return lowVal >= 7;
    return lowVal >= 10;
  }

  // Queens
  if (highVal === 12) {
    if (isSuited) {
      if (position === 'BTN' || position === 'SB') return lowVal >= 6;
      return lowVal >= 9;
    }
    if (position === 'BTN' || position === 'SB') return lowVal >= 9;
    return false;
  }

  // Suited connectors e.g. T9s, 98s, 87s, 76s
  if (isSuited && highVal - lowVal === 1 && highVal >= 7 && (position === 'BTN' || position === 'SB')) {
    return true;
  }

  return false;
}

/**
 * Preflop open range percentage threshold
 */
const POSITION_OPEN_THRESHOLDS: Record<Position, number> = {
  UTG: 15,
  MP: 20,
  CO: 30,
  BTN: 48,
  SB: 42,
  BB: 35,
};

/**
 * Evaluates Preflop hand strength (0-100) and category
 */
export function evaluatePreflop(
  card1: CardObject,
  card2: CardObject
): { score: number; handName: string; tier: string; isPocketPair: boolean } {
  const high = RANK_VALUES[card1.rank] >= RANK_VALUES[card2.rank] ? card1 : card2;
  const low = high === card1 ? card2 : card1;
  const isPair = high.rank === low.rank;
  const isSuited = card1.suit === card2.suit;

  const handNotation = isPair
    ? `${high.rank}${low.rank}`
    : `${high.rank}${low.rank}${isSuited ? 's' : 'o'}`;

  const chen = calculateChenScore(card1, card2);
  // Transform chen score (approx 0 to 20) into percent 0-100
  let score = Math.min(Math.round((chen / 18) * 100), 100);

  // Precision boosts for famous monster hands
  if (handNotation === 'AA') score = 100;
  else if (handNotation === 'KK') score = 96;
  else if (handNotation === 'QQ') score = 91;
  else if (handNotation === 'AKs') score = 92;
  else if (handNotation === 'JJ') score = 86;
  else if (handNotation === 'AKo') score = 85;
  else if (handNotation === 'AQs') score = 84;
  else if (handNotation === 'TT') score = 80;
  else if (handNotation === 'AQo') score = 78;
  else if (handNotation === 'AJs') score = 76;
  else if (handNotation === 'KQs') score = 74;
  else if (handNotation === '99') score = 73;

  let tier = 'Lixo (Fold)';
  if (score >= 85) tier = 'Monstro Premium (Tier 1)';
  else if (score >= 72) tier = 'Muito Forte (Tier 2)';
  else if (score >= 58) tier = 'Boa Mão / Valor (Tier 3)';
  else if (score >= 42) tier = 'Especulativa / Posição (Tier 4)';
  else if (score >= 30) tier = 'Marginal / Defesa (Tier 5)';

  return {
    score,
    handName: `${handNotation} (${isPair ? 'Par' : isSuited ? 'Naipe Iguais' : 'Offsuit'})`,
    tier,
    isPocketPair: isPair,
  };
}

/**
 * Postflop hand evaluator (combines hole cards and board cards)
 */
export function evaluatePostflop(
  heroCards: CardObject[],
  boardCards: CardObject[]
): {
  strength: number; // 0 - 100
  category: string;
  hasDraw: boolean;
  drawDescription?: string;
  outs: number;
} {
  if (heroCards.length < 2) {
    return { strength: 20, category: 'Mão Indefinida', hasDraw: false, outs: 0 };
  }

  const allCards = [...heroCards, ...boardCards];
  const heroRanks = heroCards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const boardRanks = boardCards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const highestBoard = boardRanks.length > 0 ? boardRanks[0] : 0;

  // Count suits for flush / flush draw
  const suitCounts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  allCards.forEach((c) => suitCounts[c.suit]++);
  const heroSuits = heroCards.map((c) => c.suit);

  let maxSuitCount = 0;
  let dominantSuit: Suit | null = null;
  (Object.keys(suitCounts) as Suit[]).forEach((s) => {
    if (suitCounts[s] > maxSuitCount) {
      maxSuitCount = suitCounts[s];
      dominantSuit = s;
    }
  });

  // Rank frequency map
  const rankFreq: Record<number, number> = {};
  allCards.forEach((c) => {
    const val = RANK_VALUES[c.rank];
    rankFreq[val] = (rankFreq[val] || 0) + 1;
  });

  const heroPairsOnBoard = heroRanks.filter((hr) => boardRanks.includes(hr));
  const isPocketPair = heroRanks[0] === heroRanks[1];

  // Draws detection
  let outs = 0;
  let hasDraw = false;
  let drawDescription = '';

  // Flush Draw
  if (maxSuitCount === 4 && dominantSuit && heroSuits.includes(dominantSuit)) {
    const heroHasAceOfSuit = heroCards.some(
      (c) => c.suit === dominantSuit && c.rank === 'A'
    );
    outs += 9;
    hasDraw = true;
    drawDescription = heroHasAceOfSuit ? 'Nut Flush Draw (9 outs)' : 'Flush Draw (9 outs)';
  }

  // Straight / Straight Draw detection
  const uniqueRanks = Array.from(new Set(allCards.map((c) => RANK_VALUES[c.rank]))).sort(
    (a, b) => a - b
  );
  if (uniqueRanks.includes(14)) uniqueRanks.unshift(1); // Ace low straight support

  let maxConsecutive = 1;
  let currentConsecutive = 1;
  for (let i = 0; i < uniqueRanks.length - 1; i++) {
    if (uniqueRanks[i + 1] === uniqueRanks[i] + 1) {
      currentConsecutive++;
      if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
    } else {
      currentConsecutive = 1;
    }
  }

  if (maxConsecutive === 4) {
    outs += 8;
    hasDraw = true;
    drawDescription = drawDescription
      ? `${drawDescription} + Open-Ended Straight Draw (17 outs Monster Draw!)`
      : 'Open-Ended Straight Draw (8 outs)';
  }

  // Made hand classification
  if (maxSuitCount >= 5) {
    return {
      strength: 92,
      category: 'Flush Formado',
      hasDraw: false,
      outs: 0,
    };
  }

  if (maxConsecutive >= 5) {
    return {
      strength: 88,
      category: 'Sequência (Straight) Formada',
      hasDraw: false,
      outs: 0,
    };
  }

  // Check Quads / Full House / Trips
  const freqs = Object.values(rankFreq).sort((a, b) => b - a);
  if (freqs[0] === 4) {
    return { strength: 98, category: 'Quadra (Four of a Kind)', hasDraw: false, outs: 0 };
  }
  if (freqs[0] === 3 && freqs[1] >= 2) {
    return { strength: 95, category: 'Full House', hasDraw: false, outs: 0 };
  }
  if (freqs[0] === 3) {
    const tripVal = Number(Object.keys(rankFreq).find((k) => rankFreq[Number(k)] === 3));
    const isSet = isPocketPair && heroRanks[0] === tripVal;
    return {
      strength: isSet ? 89 : 82,
      category: isSet ? 'Trinca Escondida (Set)' : 'Trinca (Trips)',
      hasDraw,
      drawDescription,
      outs,
    };
  }

  // Two Pair
  if (freqs[0] === 2 && freqs[1] === 2) {
    if (heroPairsOnBoard.length === 2) {
      return {
        strength: 78,
        category: 'Dois Pares com a Mesa',
        hasDraw,
        drawDescription,
        outs,
      };
    }
    if (isPocketPair && heroPairsOnBoard.length === 0) {
      return {
        strength: 74,
        category: 'Dois Pares (Par de mão + Par do board)',
        hasDraw,
        drawDescription,
        outs,
      };
    }
  }

  // One Pair
  if (freqs[0] === 2) {
    // Overpair
    if (isPocketPair && heroRanks[0] > highestBoard) {
      return {
        strength: 76,
        category: `Overpair de Mão (${heroCards[0].rank}${heroCards[1].rank})`,
        hasDraw,
        drawDescription,
        outs,
      };
    }
    // Top Pair
    if (heroPairsOnBoard.includes(highestBoard)) {
      const kickerVal = heroRanks[0] === highestBoard ? heroRanks[1] : heroRanks[0];
      const kickerRank = Object.keys(RANK_VALUES).find(
        (k) => RANK_VALUES[k as Rank] === kickerVal
      );
      const isGoodKicker = kickerVal >= 11;
      return {
        strength: isGoodKicker ? 68 : 58,
        category: `Top Pair (Kicker ${kickerRank || 'médio'})`,
        hasDraw,
        drawDescription,
        outs,
      };
    }
    // Middle / Low Pair
    if (heroPairsOnBoard.length > 0) {
      return {
        strength: 48,
        category: 'Segundo/Terceiro Par (Par Médio)',
        hasDraw,
        drawDescription,
        outs,
      };
    }
    // Pocket pair below highest board
    if (isPocketPair) {
      return {
        strength: 44,
        category: 'Underpair de Mão',
        hasDraw,
        drawDescription,
        outs,
      };
    }
  }

  // High card / Draws only
  let strength = 20;
  if (hasDraw) {
    strength = outs >= 12 ? 62 : outs >= 8 ? 52 : 38;
  } else if (heroRanks[0] >= 13) {
    // Overcards
    strength = 32;
  }

  return {
    strength,
    category: hasDraw ? `High Card com ${drawDescription}` : 'High Card / Sem Acerto',
    hasDraw,
    drawDescription,
    outs,
  };
}

/**
 * Main Strategic Decision Engine
 * Integrates Cards + Position + Stack + Villains + Action + Stage
 */
export function calculateDecision({
  heroCardsRaw,
  boardCardsRaw,
  stage,
  position,
  effectiveStackBB,
  activeVillains,
  actionToHero,
}: {
  heroCardsRaw: string[];
  boardCardsRaw: string[];
  stage: Stage;
  position: Position | null;
  effectiveStackBB: number | null;
  activeVillains: number | null;
  actionToHero: ActionToHero | null;
}): StrategicRecommendation {
  const heroCards = parseCards(heroCardsRaw);
  const boardCards = parseCards(boardCardsRaw);

  // Defaults for missing parameters
  const pos: Position = position || 'BTN';
  const stack = effectiveStackBB !== null ? effectiveStackBB : 40;
  const villains = activeVillains !== null ? activeVillains : 1;
  const action: ActionToHero = actionToHero || 'unopened';

  // If hero doesn't have 2 cards yet
  if (heroCards.length < 2) {
    return {
      primaryAction: 'FOLD',
      actionFrequencies: { fold: 100, checkCall: 0, raise: 0, allIn: 0 },
      handStrengthPercent: 0,
      handCategory: 'Aguardando leitura de 2 cartas',
      tacticalJustification: 'Aguardando identificação das duas cartas da mão do Hero.',
      recommendedBetSize: 'N/A',
      equityVsRange: 0,
      rangeAdvantage: 'neutral',
    };
  }

  // PREFLOP DECISION
  if (stage === 'preflop' || boardCards.length === 0) {
    const pf = evaluatePreflop(heroCards[0], heroCards[1]);
    const isPushFoldZone = stack <= 14;

    // Check Push/Fold Chart for Short Stack
    if (isPushFoldZone) {
      const shouldPush = isPushFoldHand(heroCards[0], heroCards[1], pos, stack);
      if (shouldPush) {
        return {
          primaryAction: 'ALL_IN',
          actionFrequencies: { fold: 0, checkCall: 0, raise: 10, allIn: 90 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Push/Fold obrigatório em ${pos} com stack de ${stack} BBs. Mão no range positivo de shove contra ${villains} oponente(s).`,
          recommendedBetSize: `All-in (${stack} BB)`,
          equityVsRange: Math.min(pf.score + 10, 85),
          rangeAdvantage: 'hero',
          keyRiskAlert: 'Stack crítico: evite dar fold e deixar blinds te consumirem.',
        };
      } else {
        return {
          primaryAction: 'FOLD',
          actionFrequencies: { fold: 95, checkCall: 5, raise: 0, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Fold com stack curto de ${stack} BBs em ${pos}. Mão fora do range ótimo de push/fold. Preserve fichas para uma mão de maior equidade.`,
          recommendedBetSize: 'Fold',
          equityVsRange: Math.max(pf.score - 10, 15),
          rangeAdvantage: 'villain',
        };
      }
    }

    // Medium/Deep Stack Preflop
    const openThreshold = POSITION_OPEN_THRESHOLDS[pos];
    const isPremium = pf.score >= 82;
    const isStrong = pf.score >= 68;
    const isPlayable = pf.score >= openThreshold;

    // Facing Action: UNOPENED (Pote em aberto)
    if (action === 'unopened') {
      if (isPlayable) {
        const betSize = pos === 'BTN' || pos === 'CO' ? '2.2 - 2.5 BB' : '2.5 - 3.0 BB';
        const raiseFreq = isPremium ? 100 : pf.score >= 55 ? 85 : 70;
        return {
          primaryAction: 'RAISE',
          actionFrequencies: { fold: 100 - raiseFreq, checkCall: 0, raise: raiseFreq, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Open raise padrão em ${pos} com range de ${openThreshold}%. Aproveite a posição e a iniciativa para atacar as blinds.`,
          recommendedBetSize: betSize,
          equityVsRange: pf.score,
          rangeAdvantage: 'hero',
        };
      } else {
        return {
          primaryAction: 'FOLD',
          actionFrequencies: { fold: 100, checkCall: 0, raise: 0, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Fold recomendado em ${pos}. Esta mão (${pf.handName}) está fora do range GTO de abertura para esta posição.`,
          recommendedBetSize: 'Fold',
          equityVsRange: pf.score,
          rangeAdvantage: 'villain',
        };
      }
    }

    // Facing Action: LIMP (Jogadores pagaram o big blind)
    if (action === 'limp') {
      if (isStrong) {
        return {
          primaryAction: 'RAISE',
          actionFrequencies: { fold: 0, checkCall: 10, raise: 90, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Iso-raise com mão forte contra ${villains} limper(s). Isolar os limpers para jogar o pote em posição e com iniciativa.`,
          recommendedBetSize: `${3 + villains} BB`,
          equityVsRange: pf.score + 5,
          rangeAdvantage: 'hero',
        };
      } else if (isPlayable && (pos === 'BTN' || pos === 'CO' || pos === 'BB')) {
        return {
          primaryAction: pos === 'BB' ? 'CHECK' : 'CALL',
          actionFrequencies: { fold: 20, checkCall: 80, raise: 0, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Overlimp ou call aceitável em ${pos} devido às ótimas pot odds implícitas para acertar draws ou trincas.`,
          recommendedBetSize: '1 BB (Check / Call)',
          equityVsRange: pf.score,
          rangeAdvantage: 'neutral',
        };
      } else {
        return {
          primaryAction: 'FOLD',
          actionFrequencies: { fold: 100, checkCall: 0, raise: 0, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Fold contra limps. Não gaste fichas com mãos marginais sem posição ou iniciativa.`,
          recommendedBetSize: 'Fold',
          equityVsRange: pf.score,
          rangeAdvantage: 'villain',
        };
      }
    }

    // Facing Action: RAISE (Vilão abriu raise)
    if (action === 'raise') {
      if (isPremium) {
        return {
          primaryAction: 'RAISE',
          actionFrequencies: { fold: 0, checkCall: 10, raise: 90, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `Mão Premium (${pf.handName})`,
          tacticalJustification: `3-Bet por valor claro contra o raise do oponente. Construa o pote com mãos premium e retire equidade de mãos marginais.`,
          recommendedBetSize: pos === 'BB' || pos === 'SB' ? '3.5x do Raise' : '3x do Raise',
          equityVsRange: pf.score + 10,
          rangeAdvantage: 'hero',
        };
      } else if (pf.score >= 60 || (pf.isPocketPair && stack > 30)) {
        return {
          primaryAction: 'CALL',
          actionFrequencies: { fold: 20, checkCall: 70, raise: 10, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Flat call justificado em ${pos}. Mão com boa jogabilidade pós-flop e odds implícitas para set mining ou flush.`,
          recommendedBetSize: 'Call do Raise',
          equityVsRange: pf.score,
          rangeAdvantage: 'neutral',
        };
      } else {
        return {
          primaryAction: 'FOLD',
          actionFrequencies: { fold: 100, checkCall: 0, raise: 0, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Fold padrão contra raise. Mão sem equidade suficiente contra o range de abertura do vilão.`,
          recommendedBetSize: 'Fold',
          equityVsRange: pf.score - 5,
          rangeAdvantage: 'villain',
        };
      }
    }

    // Facing Action: 3BET (Pote com 3-bet)
    if (action === '3bet') {
      if (pf.score >= 90) {
        // AA, KK, QQ, AKs
        return {
          primaryAction: stack <= 40 ? 'ALL_IN' : 'RAISE',
          actionFrequencies: { fold: 0, checkCall: 5, raise: 45, allIn: 50 },
          handStrengthPercent: pf.score,
          handCategory: `Topo do Range (${pf.handName})`,
          tacticalJustification: `4-Bet por valor obrigatória contra a 3-bet. Com stacks menores de 40 BBs, o All-in direto maximiza valor e nega equidade.`,
          recommendedBetSize: stack <= 40 ? `All-in (${stack} BB)` : '2.2x - 2.5x da 3-bet',
          equityVsRange: 85,
          rangeAdvantage: 'hero',
        };
      } else if (pf.score >= 75) {
        return {
          primaryAction: 'CALL',
          actionFrequencies: { fold: 30, checkCall: 70, raise: 0, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `Mão Forte de Defesa (${pf.handName})`,
          tacticalJustification: `Defesa com call contra 3-bet. Temos equidade para ver o flop em posição sem nos comprometer com all-in pré-flop.`,
          recommendedBetSize: 'Call da 3-Bet',
          equityVsRange: 60,
          rangeAdvantage: 'neutral',
        };
      } else {
        return {
          primaryAction: 'FOLD',
          actionFrequencies: { fold: 100, checkCall: 0, raise: 0, allIn: 0 },
          handStrengthPercent: pf.score,
          handCategory: `${pf.tier} (${pf.handName})`,
          tacticalJustification: `Fold rápido contra 3-bet. Range do oponente é muito polarizado/forte para continuar com mãos intermediárias.`,
          recommendedBetSize: 'Fold',
          equityVsRange: pf.score - 15,
          rangeAdvantage: 'villain',
        };
      }
    }
  }

  // POSTFLOP DECISION (Flop, Turn, River)
  const post = evaluatePostflop(heroCards, boardCards);
  const multiwayPenalty = villains >= 3 ? 15 : villains === 2 ? 8 : 0;
  const effectiveStrength = Math.max(post.strength - multiwayPenalty, 0);

  // MONSTER / VERY STRONG HAND (Set, Flush, Straight, Full House)
  if (effectiveStrength >= 80) {
    const isNuts = effectiveStrength >= 90;
    return {
      primaryAction: 'RAISE',
      actionFrequencies: { fold: 0, checkCall: 20, raise: 75, allIn: 5 },
      handStrengthPercent: post.strength,
      handCategory: post.category,
      tacticalJustification: `Mão extremamente forte (${post.category}). Construa o pote agressivamente apostando 50-75% do pote para extrair valor máximo de vilões com pares ou draws.`,
      recommendedBetSize: stage === 'river' ? '65% - 85% do Pote' : '50% - 66% do Pote',
      equityVsRange: Math.min(post.strength + 5, 98),
      rangeAdvantage: 'hero',
      keyRiskAlert: multiwayPenalty > 0 ? `Pote multiway (${villains} vilões): aposte forte para cobrar de draws!` : undefined,
    };
  }

  // STRONG MADE HAND (Top Pair Good Kicker, Overpair)
  if (effectiveStrength >= 65) {
    if (action === 'raise' || action === '3bet') {
      return {
        primaryAction: 'CALL',
        actionFrequencies: { fold: 15, checkCall: 75, raise: 10, allIn: 0 },
        handStrengthPercent: post.strength,
        handCategory: post.category,
        tacticalJustification: `Call com ${post.category}. Mão com força para manter o blefe no range do vilão e controlar o tamanho do pote.`,
        recommendedBetSize: 'Call',
        equityVsRange: 68,
        rangeAdvantage: 'neutral',
        potOddsInfo: {
          potOddsPercent: 33,
          requiredEquityPercent: 28,
          advice: 'Temos equidade suficiente contra o range de aposta do vilão.',
        },
      };
    } else {
      // Unopened or checked to hero
      return {
        primaryAction: 'RAISE',
        actionFrequencies: { fold: 0, checkCall: 30, raise: 70, allIn: 0 },
        handStrengthPercent: post.strength,
        handCategory: post.category,
        tacticalJustification: `C-bet padrão por valor e proteção com ${post.category}. Aposta de 33% a 50% do pote pune floats e draws mais fracos.`,
        recommendedBetSize: '33% - 50% do Pote',
        equityVsRange: 72,
        rangeAdvantage: 'hero',
      };
    }
  }

  // MEDIUM MADE HAND OR BIG COMBO DRAW (Top Pair Weak Kicker, Mid Pair, Monster Draw)
  if (effectiveStrength >= 50 || (post.hasDraw && post.outs >= 8)) {
    if (post.hasDraw && post.outs >= 8) {
      // Big Draw: Semi-bluff or Call
      if (action === 'unopened' && pos === 'BTN') {
        return {
          primaryAction: 'RAISE',
          actionFrequencies: { fold: 0, checkCall: 30, raise: 70, allIn: 0 },
          handStrengthPercent: post.strength,
          handCategory: post.category,
          tacticalJustification: `Semi-bluff de alta equidade com ${post.drawDescription}. Combine a fold equity com 8+ outs para os nuts caso chamado.`,
          recommendedBetSize: '40% - 50% do Pote',
          equityVsRange: 55,
          rangeAdvantage: 'hero',
        };
      } else {
        return {
          primaryAction: 'CALL',
          actionFrequencies: { fold: 15, checkCall: 70, raise: 15, allIn: 0 },
          handStrengthPercent: post.strength,
          handCategory: post.category,
          tacticalJustification: `Call justificado pelo draw (${post.drawDescription}). Busque fechar o draw barato para arrebatar stacks no river.`,
          recommendedBetSize: 'Call',
          equityVsRange: 52,
          rangeAdvantage: 'neutral',
          potOddsInfo: {
            potOddsPercent: 25,
            requiredEquityPercent: 20,
            advice: 'Pot odds favoráveis para ver a próxima carta.',
          },
        };
      }
    } else {
      // Medium pair
      return {
        primaryAction: action === 'raise' ? 'CALL' : 'CHECK',
        actionFrequencies: { fold: 25, checkCall: 70, raise: 5, allIn: 0 },
        handStrengthPercent: post.strength,
        handCategory: post.category,
        tacticalJustification: `Controle de pote com ${post.category}. Dê Check/Call para não inflar o pote contra ranges superiores.`,
        recommendedBetSize: action === 'raise' ? 'Call' : 'Check',
        equityVsRange: 50,
        rangeAdvantage: 'neutral',
      };
    }
  }

  // WEAK HAND / GUTSHOT / TRASH
  if (action === 'unopened') {
    return {
      primaryAction: 'CHECK',
      actionFrequencies: { fold: 0, checkCall: 80, raise: 20, allIn: 0 },
      handStrengthPercent: post.strength,
      handCategory: post.category,
      tacticalJustification: `Check para ver carta grátis. Mão sem valor suficiente para apostar contra o board.`,
      recommendedBetSize: 'Check',
      equityVsRange: post.strength,
      rangeAdvantage: 'villain',
    };
  } else {
    // Facing bet/raise with weak hand
    return {
      primaryAction: 'FOLD',
      actionFrequencies: { fold: 90, checkCall: 10, raise: 0, allIn: 0 },
      handStrengthPercent: post.strength,
      handCategory: post.category,
      tacticalJustification: `Fold claro sem valor de showdown nem equidade suficiente contra aposta de vilão.`,
      recommendedBetSize: 'Fold',
      equityVsRange: post.strength,
      rangeAdvantage: 'villain',
    };
  }
}
