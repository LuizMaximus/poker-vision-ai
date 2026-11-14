import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccess } from './accountAccess';

test('trial lasts 72 hours from account creation and never restarts', () => {
  const created = '2026-11-14T10:00:00Z';
  const expiry = Date.parse('2026-11-17T10:00:00Z');
  assert.deepEqual(resolveAccess(created, undefined, expiry - 1), { plan: 'trial', endsAt: expiry });
  assert.deepEqual(resolveAccess(created, undefined, expiry), { plan: 'free', endsAt: null });
  assert.deepEqual(resolveAccess(created, undefined, expiry + 86400000), { plan: 'free', endsAt: null });
});

test('paid access takes precedence and legacy indefinite PRO remains valid', () => {
  const created = '2026-11-14T10:00:00Z';
  const now = Date.parse(created);
  const expiresAt = '2026-12-14T10:00:00Z';
  assert.deepEqual(resolveAccess(created, { isPro: true, expiresAt }, now), { plan: 'paid', endsAt: Date.parse(expiresAt) });
  assert.deepEqual(resolveAccess(created, { isPro: true }, now), { plan: 'paid', endsAt: null });
});
