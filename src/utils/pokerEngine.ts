import { PokerDecision, TablePosition, ActionType, GameStage } from './pokerTypes';

export type StackDepth = 'low' | 'medium' | 'deep';

export interface FastDecisionInput {
  heroHand: string[];        // Ex: ["Jh", "4s"] ou ["Ah", "Kd"]
  board?: string[];          // Opcional para pós-flop
  position: TablePosition;   // "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
  stackDepth: StackDepth;    // "low" | "medium" | "deep"
  actionToHero: 'unopened' | 'limp' | 'raise' | '3bet';
}

// Converte cartas para padrão de mão (ex: AhKd -> AKo, AsKs -> AKs, 8h8d -> 88)
function getHandKey(card1: string, card2: string): string {
  if (!card1 || !card2) return '';
  const r1 = card1[0].toUpperCase();
  const r2 = card2[0].toUpperCase();
  const s1 = card1[1]?.toLowerCase();
  const s2 = card2[1]?.toLowerCase();

  const rankOrder = '23456789TJQKA';
  const idx1 = rankOrder.indexOf(r1);
  const idx2 = rankOrder.indexOf(r2);

  if (idx1 === -1 || idx2 === -1) return '';

  if (idx1 === idx2) return `${r1}${r2}`; // Par (ex: 88, AA)
  const isSuited = s1 === s2;

  // Maior rank primeiro
  if (idx1 > idx2) {
    return `${r1}${r2}${isSuited ? 's' : 'o'}`;
  } else {
    return `${r2}${r1}${isSuited ? 's' : 'o'}`;
  }
}

// Ranges simplificados de alto valor para tomada de decisão pré-flop
const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'];
const STRONG_HANDS = ['99', '88', '77', 'AJs', 'ATs', 'AQo', 'KQs', 'KJs'];
const PLAYABLE_HANDS = [
  '66', '55', '44', '33', '22',
  'A9s', 'A8s', 'A5s', 'A4s',
  'AJo', 'ATo', 'KQo', 'QJs', 'JTs', 'T9s', '98s'
];

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

  // 1. MODO LOW STACK (<= 15 BBs - Estratégia Push/Fold Pura)
  if (stackDepth === 'low') {
    if (actionToHero === 'unopened' || actionToHero === 'limp') {
      // Posições finais (CO, BTN, SB) sh継am mais mãos
      const widePositions = ['CO', 'BTN', 'SB'];
      if (isPremium || isStrong || (isPlayable && widePositions.includes(position))) {
        return {
          action: 'ALL-IN',
          confidence: 0.95,
          sizing: 'ALL-IN (Push)',
          rationale: `Low stack (${stackDepth.toUpperCase()}). Com ${handKey} em ${position}, o shove maximiza fold equity e retorno esperado direto.`,
          evEstimate: 2.8,
          riskLevel: 'HIGH',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.9,
        sizing: '0 BB',
        rationale: `Low stack. ${handKey} não tem equidade suficiente para comprometer todo o stack contra o range de call dos adversários.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    } else {
      // Enfrentando Raise
      if (isPremium || (isStrong && ['BTN', 'BB'].includes(position))) {
        return {
          action: 'ALL-IN',
          confidence: 0.95,
          sizing: 'ALL-IN (Re-shove)',
          rationale: `Re-shove lucrativo contra o raise inicial. Mão forte no topo do range para stack curto.`,
          evEstimate: 3.5,
          riskLevel: 'HIGH',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.95,
        sizing: '0 BB',
        rationale: `Fold padrão contra raise ativo. Mão dominada para pagar ou re-shovar com stack curto.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    }
  }

  // 2. MODO MEDIUM STACK (20 - 45 BBs - Padrão de Torneio)
  if (stackDepth === 'medium') {
    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) {
        return {
          action: 'RAISE',
          confidence: 0.92,
          sizing: '2.2x - 2.5x BB',
          rationale: `Open-raise padrão com ${handKey} de ${position}. Range forte com ótimo controle de pote.`,
          evEstimate: 1.8,
          riskLevel: 'MEDIUM',
        };
      }
      if (isPlayable && ['CO', 'BTN', 'SB'].includes(position)) {
        return {
          action: 'RAISE',
          confidence: 0.85,
          sizing: '2.0x - 2.2x BB',
          rationale: `Roubo de blinds rentável em posição tardia (${position}) com boa jogabilidade pós-flop.`,
          evEstimate: 1.1,
          riskLevel: 'MEDIUM',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.88,
        sizing: '0 BB',
        rationale: `Fold conservador em ${position}. Evita potes fora de posição com stack médio.`,
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
          rationale: `3-Bet por valor claro contra raise de abertura. Isola o agressor com vantagem de cartas.`,
          evEstimate: 3.2,
          riskLevel: 'HIGH',
        };
      }
      if (isStrong && position === 'BB') {
        return {
          action: 'CALL',
          confidence: 0.82,
          sizing: 'Defender BB',
          rationale: `Excelente preço de pote na Big Blind para ver o flop com mão conectada/forte.`,
          evEstimate: 0.8,
          riskLevel: 'MEDIUM',
        };
      }
      return {
        action: 'FOLD',
        confidence: 0.9,
        sizing: '0 BB',
        rationale: `Fold seguro contra raise com stack médio. Mão vulnerável a 4-bets e pressão pós-flop.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    }
  }

  // 3. MODO DEEP STACK (50+ BBs - Padrão Cash Game)
  if (actionToHero === 'unopened') {
    if (isPremium || isStrong || isPlayable) {
      return {
        action: 'RAISE',
        confidence: 0.9,
        sizing: '2.5x - 3.0x BB',
        rationale: `Deep stack: abrindo o pote com ${handKey} em ${position}. Alto valor em implied odds e pós-flop.`,
        evEstimate: 2.1,
        riskLevel: 'MEDIUM',
      };
    }
    return {
      action: 'FOLD',
      confidence: 0.88,
      sizing: '0 BB',
      rationale: `Fold pré-flop. Não justificado abrir mão marginal fora de posição em jogo deep.`,
      evEstimate: 0,
      riskLevel: 'LOW',
    };
  }

  if (actionToHero === 'raise') {
    if (isPremium) {
      return {
        action: 'RAISE',
        confidence: 0.96,
        sizing: '3-Bet (3.0x a 3.5x do raise)',
        rationale: `Construção de pote com mãos monstro em profundidade de fichas.`,
        evEstimate: 3.8,
        riskLevel: 'HIGH',
      };
    }
    if ((isStrong || isPlayable) && ['BTN', 'CO', 'BB'].includes(position)) {
      return {
        action: 'CALL',
        confidence: 0.85,
        sizing: 'Pagar Raise',
        rationale: `Call justificável por implied odds em profundidade de stack para acertar jogos fortes.`,
        evEstimate: 1.2,
        riskLevel: 'MEDIUM',
      };
    }
    return {
      action: 'FOLD',
      confidence: 0.9,
      sizing: '0 BB',
      rationale: `Fold para raise. Mãos fracas geram vazamento de fichas pós-flop em deep stacks.`,
      evEstimate: 0,
      riskLevel: 'LOW',
    };
  }

  // Fallback geral
  return {
    action: isPremium ? 'RAISE' : isStrong ? 'CALL' : 'FOLD',
    confidence: 0.8,
    sizing: isPremium ? '2.5x BB' : '0 BB',
    rationale: `Linha padrão para o spot selecionado com ${handKey}.`,
    evEstimate: 0.5,
    riskLevel: 'MEDIUM',
  };
}
