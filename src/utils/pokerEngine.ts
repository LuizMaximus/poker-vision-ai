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

// --- CLIENTE DE COMUNICAÇÃO SEGURO ---
export async function fetchFastDecision(input: FastDecisionInput): Promise<PokerDecision> {
  try {
    const response = await fetch('/api/poker/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    if (!response.ok) {
      throw new Error('Falha de permissão ou servidor.');
    }
    
    return await response.json();
  } catch (error) {
    return {
      action: 'ERRO',
      confidence: 0,
      sizing: '-',
      rationale: 'Falha na conexão segura com o motor GTO.',
      evEstimate: 0,
      riskLevel: 'LOW'
    };
  }
}
