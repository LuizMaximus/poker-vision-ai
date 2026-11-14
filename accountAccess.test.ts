import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccess, trialEmailKey } from './accountAccess';

test('trial lasts 72 hours from activation and never restarts', () => {
  const expiry = Date.parse('2026-11-17T10:00:00Z');
  assert.deepEqual(resolveAccess(expiry, undefined, expiry - 1), { plan: 'trial', endsAt: expiry });
  assert.deepEqual(resolveAccess(expiry, undefined, expiry), { plan: 'free', endsAt: null });
  assert.deepEqual(resolveAccess(expiry, undefined, expiry + 86400000), { plan: 'free', endsAt: null });
});

test('paid access takes precedence and legacy indefinite PRO remains valid', () => {
  const created = '2026-11-14T10:00:00Z';
  const now = Date.parse('2026-11-14T10:00:00Z');
  const expiresAt = '2026-12-14T10:00:00Z';
  assert.deepEqual(resolveAccess(null, { isPro: true, expiresAt }, now), { plan: 'paid', endsAt: Date.parse(expiresAt) });
  assert.deepEqual(resolveAccess(null, { isPro: true }, now), { plan: 'paid', endsAt: null });
});

test('Gmail aliases share one mailbox and other domains retain their local part', () => {
  assert.equal(trialEmailKey('P.oker+teste@googlemail.com'), 'poker@gmail.com');
  assert.equal(trialEmailKey('poker@gmail.com'), 'poker@gmail.com');
  assert.equal(trialEmailKey('P.oker+teste@example.com'), 'p.oker+teste@example.com');
});
