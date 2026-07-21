import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, deriveSeed } from '../../src/shared/deterministic-rng.js';

test('shared RNG preserves the frozen Arena deterministic sequence', () => {
  const rng = createRng(12345);
  assert.deepEqual(
    Array.from({ length: 8 }, () => rng.next()),
    [
      0.9797282677609473,
      0.3067522644996643,
      0.484205421525985,
      0.817934412509203,
      0.5094283693470061,
      0.34747186047025025,
      0.07375754183158278,
      0.7663964673411101,
    ],
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
