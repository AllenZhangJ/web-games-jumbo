import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_V1_PRESENTATION_QUALITY_ID,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  resolveArenaPresentationQualityForLaunch,
} from '@number-strategy-jump/arena-v1-application-launch';
import {
  createArenaPresentationMemoryProviderForLaunch,
} from '@number-strategy-jump/arena-v1-application-launch';

test('launch quality selection is explicit, host-neutral and falls back safely', () => {
  assert.equal(resolveArenaPresentationQualityForLaunch({
    platformId: 'web',
    root: { location: { search: '?arenaQuality=low' } },
  }).id, ARENA_V1_PRESENTATION_QUALITY_ID.LOW);
  assert.equal(resolveArenaPresentationQualityForLaunch({
    platformId: 'wechat',
    root: {
      wx: { getLaunchOptionsSync: () => ({ query: { arenaQuality: 'medium' } }) },
    },
  }).id, ARENA_V1_PRESENTATION_QUALITY_ID.MEDIUM);
  assert.equal(resolveArenaPresentationQualityForLaunch({
    platformId: 'douyin',
    explicitToken: 'low',
    root: {
      __ARENA_PRESENTATION_QUALITY__: 'medium',
      tt: { getLaunchOptionsSync: () => ({ query: { arenaQuality: 'high' } }) },
    },
  }).id, ARENA_V1_PRESENTATION_QUALITY_ID.LOW);
  assert.equal(resolveArenaPresentationQualityForLaunch({
    platformId: 'web',
    root: { location: { search: '?arenaQuality=unknown' } },
  }).id, ARENA_V1_PRESENTATION_QUALITY_ID.HIGH);
});

test('launch memory provider combines Web heap fallback with optional external process evidence', () => {
  const root = {
    performance: { memory: { usedJSHeapSize: 12_345 } },
  };
  const provider = createArenaPresentationMemoryProviderForLaunch({
    root,
    platformId: 'web',
  });
  assert.deepEqual(provider(), {
    jsHeapBytes: 12_345,
    processMemoryBytes: null,
  });

  root.__ARENA_PERFORMANCE_MEMORY_PROVIDER__ = () => ({
    jsHeapBytes: 23_456,
    processMemoryBytes: 45_678,
  });
  assert.deepEqual(provider(), {
    jsHeapBytes: 23_456,
    processMemoryBytes: 45_678,
  });
  root.__ARENA_PERFORMANCE_MEMORY_PROVIDER__ = () => ({ processMemoryBytes: 67_890 });
  assert.deepEqual(provider(), {
    jsHeapBytes: 12_345,
    processMemoryBytes: 67_890,
  });
  root.__ARENA_PERFORMANCE_MEMORY_PROVIDER__ = () => ({ unknownBytes: 1 });
  assert.throws(() => provider(), /不支持字段/);

  assert.equal(createArenaPresentationMemoryProviderForLaunch({
    root: {},
    platformId: 'wechat',
  })(), null);
});
