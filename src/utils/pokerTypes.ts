export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface CardObject {
  raw: string; // e.g., 'As', 'Kh', 'Td'
  rank: Rank;
  suit: Suit;
}

export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Stage = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionToHero = 'unopened' | 'limp' | 'raise' | '3bet';

export interface VisionExtraction {
  hero_hand: string[];
  board: string[];
  stage: Stage;
  position: Position | null;
  effective_stack_bb: number | null;
  active_villains: number | null;
  action_to_hero: ActionToHero | null;
  confidence: {
    hero_hand: number;
    board: number;
    position: number;
    effective_stack_bb: number;
    active_villains: number;
    action_to_hero: number;
    summary?: string;
  };
  notes?: string;
}

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

export interface SampleScenario {
  id: string;
  title: string;
  description: string;
  extraction: VisionExtraction;
  mockImageUrl?: string;
}
