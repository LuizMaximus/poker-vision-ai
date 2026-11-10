import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCard,
  parseCard,
  evaluatePreflop,
  isPushFoldHand,
  evaluatePostflop,
  calculateDecision,
} from './pokerEngine';

test('normalizeCard handles valid and lowercase/alternate card notations', () => {
  assert.equal(normalizeCard('As'), 'As');
  assert.equal(normalizeCard('ad'), 'Ad');
  assert.equal(normalizeCard('10h'), 'Th');
  assert.equal(normalizeCard('tc'), 'Tc');
  assert.equal(normalizeCard('Kh '), 'Kh');
  assert.equal(normalizeCard('invalid'), null);
});

test('evaluatePreflop rates AA as 100% monster hand and 72o as fold trash', () => {
  const c1 = parseCard('As')!;
  const c2 = parseCard('Ah')!;
  const aaResult = evaluatePreflop(c1, c2);
  assert.equal(aaResult.score, 100);
  assert.equal(aaResult.isPocketPair, true);

  const c3 = parseCard('7d')!;
  const c4 = parseCard('2c')!;
  const trashResult = evaluatePreflop(c3, c4);
  assert.ok(trashResult.score < 30);
});

test('isPushFoldHand returns true for pocket pairs with short stack <= 12bb', () => {
  const p1 = parseCard('2s')!;
  const p2 = parseCard('2h')!;
  assert.equal(isPushFoldHand(p1, p2, 'CO', 10), true);
  assert.equal(isPushFoldHand(p1, p2, 'BTN', 8), true);

  // 72o should not push in UTG
  const t1 = parseCard('7h')!;
  const t2 = parseCard('2d')!;
  assert.equal(isPushFoldHand(t1, t2, 'UTG', 10), false);
});

test('evaluatePostflop detects flush and straight draws', () => {
  const hero = [parseCard('As')!, parseCard('Ks')!];
  const board = [parseCard('Qs')!, parseCard('4s')!, parseCard('2d')!];
  const result = evaluatePostflop(hero, board);
  assert.equal(result.hasDraw, true);
  assert.ok(result.drawDescription?.includes('Nut Flush Draw'));
  assert.equal(result.outs, 9);
});

test('calculateDecision recommends ALL_IN on short stack push/fold', () => {
  const decision = calculateDecision({
    heroCardsRaw: ['As', 'Qd'],
    boardCardsRaw: [],
    stage: 'preflop',
    position: 'CO',
    effectiveStackBB: 10,
    activeVillains: 2,
    actionToHero: 'unopened',
  });

  assert.equal(decision.primaryAction, 'ALL_IN');
  assert.ok(decision.recommendedBetSize.includes('All-in'));
});

test('calculateDecision recommends RAISE on BTN with AA deep stack unopened', () => {
  const decision = calculateDecision({
    heroCardsRaw: ['As', 'Ad'],
    boardCardsRaw: [],
    stage: 'preflop',
    position: 'BTN',
    effectiveStackBB: 100,
    activeVillains: 2,
    actionToHero: 'unopened',
  });

  assert.equal(decision.primaryAction, 'RAISE');
  assert.ok(decision.tacticalJustification.includes('Open raise'));
});
