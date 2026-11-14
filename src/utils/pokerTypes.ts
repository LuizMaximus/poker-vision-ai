export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface CardObject {
  raw: string; // e.g., 'As', 'Kh', 'Td'
  rank: Rank;
  suit: Suit;
}

export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';
export type TablePosition = Position;
export interface PokerDecision {
  action: string;
  sizing: string;
  rationale: string;
}
export type Stage = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionToHero = 'unopened' | 'limp' | 'raise' | '3bet';

export type PrimaryAction = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN';

export interface ActionDistribution {
  fold: number; // 0 - 100
  checkCall: number; // 0 - 100
  raise: number; // 0 - 100
  allIn: number; // 0 - 100
}

export interface StrategicRecommendation {
  primaryAction: PrimaryAction;
  actionFrequencies: ActionDistribution;
  handStrengthPercent: number; // 0 - 100
  handCategory: string; // e.g. "Par Alto (Overpair)", "Flush Draw Nut", "Mão Premium Preflop"
  tacticalJustification: string; // Portuguese tactical explanation
  recommendedBetSize: string; // e.g. "2.5x BB", "33% Pote", "All-in"
  equityVsRange: number; // 0 - 100
  potOddsInfo?: {
    potOddsPercent: number;
    requiredEquityPercent: number;
    advice: string;
  };
  rangeAdvantage: 'hero' | 'neutral' | 'villain';
  keyRiskAlert?: string;
}
