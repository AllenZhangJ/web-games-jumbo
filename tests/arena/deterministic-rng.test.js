import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng as createLegacyRng } from '../../src/core/rng.js';
import { createRng, deriveSeed } from '../../src/shared/deterministic-rng.js';

test('shared RNG preserves the legacy deterministic sequence', () => {
  const legacy = createLegacyRng(12345);
  const shared = createRng(12345);
  assert.deepEqual(
    Array.from({ length: 32 }, () => legacy.next()),
    Array.from({ length: 32 }, () => shared.next()),
  );
});

test('named streams are stable and isolated', () => {
  const mapSeed = deriveSeed(88, 'map');
  const botSeed = deriveSeed(88, 'bot');
  assert.equal(mapSeed, deriveSeed(88, 'map'));
  assert.notEqual(mapSeed, botSeed);
  assert.throws(() => deriveSeed(88, ''), /namespace/);
});

test('integer RNG rejects ranges wider than its uint32 resolution', () => {
  const rng = createRng(1);
  assert.throws(() => rng.int(0, 0x100000000), /不能超过 uint32/);
  assert.throws(
    () => rng.int(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    /不能超过 uint32/,
  );
});
