import { PokerDecision, TablePosition, Suit } from './pokerTypes';

export type StackDepth = 'low' | 'medium' | 'deep';

export interface FastDecisionInput {
  heroHand: string[];        // Ex: ["Jh", "4s"] ou ["Ah", "Kd"]
  board?: string[];          // Opcional para pós-flop
  position: TablePosition;   // "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
  stackDepth: StackDepth;    // "low" | "medium" | "deep"
  actionToHero: 'unopened' | 'limp' | 'raise' | '3bet';
}

// Definições necessárias para o CardPickerModal
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export const SUIT_INFO: Record<Suit, { symbol: string; name: string; color: string; bg: string }> = {
  s: { symbol: '♠', name: 'Espadas', color: 'text-slate-200', bg: 'bg-slate-800' },
  h: { symbol: '♥', name: 'Copas', color: 'text-red-500', bg: 'bg-red-950/40' },
  d: { symbol: '♦', name: 'Ouros', color: 'text-blue-400', bg: 'bg-blue-950/40' },
  c: { symbol: '♣', name: 'Paus', color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
};

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

  if (idx1 === idx2) return `${r1}${r2}`;
  const isSuited = s1 === s2;

  if (idx1 > idx2) {
    return `${r1}${r2}${isSuited ? 's' : 'o'}`;
  } else {
    return `${r2}${r1}${isSuited ? 's' : 'o'}`;
  }
}

// Ranges para cálculo pré-flop
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
        rationale: `Low stack. ${handKey} não tem equidade suficiente para ir all-in contra os ranges de call.`,
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
        rationale: `Fold para raise ativo. Mão vulnerável com stack curto.`,
        evEstimate: 0,
        riskLevel: 'LOW',
      };
    }
  }

  // 2. MEDIUM STACK (20 - 45 BBs - Padrão de Torneio)
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
          sizing: '2.0x
