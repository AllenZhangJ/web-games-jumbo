import { describe, expect, it } from 'vitest';
import {
  assertArenaExperimentReplaySeedsPlanned,
  cloneArenaExperimentReplaySeeds,
  createArenaExperimentReplaySeeds,
  createArenaMetricGate,
  createContiguousArenaExperimentSeedRange,
  createSortedArenaExperimentSeeds,
  createSortedMetricCountRecord,
  incrementMetricCount,
  metricRatioOrNull,
  readArenaMetricGate,
} from '../src/index.js';

describe('Arena experiment primitives', () => {
  it('creates stable metric counts and ratios without hiding an empty denominator', () => {
    const counts = new Map<string, number>();
    incrementMetricCount(counts, 'zeta');
    incrementMetricCount(counts, 'alpha', 2);
    incrementMetricCount(counts, 'zeta', 3);

    expect(createSortedMetricCountRecord(counts)).toEqual({ alpha: 2, zeta: 4 });
    expect(metricRatioOrNull(3, 4)).toBe(0.75);
    expect(metricRatioOrNull(0, 0)).toBeNull();
  });

  it('normalizes seed plans deterministically and enforces uint32 boundaries', () => {
    expect(createContiguousArenaExperimentSeedRange(0xfffffffd, 3)).toEqual({
      firstSeed: 0xfffffffd,
      lastSeed: 0xffffffff,
      caseCount: 3,
    });
    expect(() => createContiguousArenaExperimentSeedRange(0xffffffff, 2)).toThrow(/uint32/);
    expect(createSortedArenaExperimentSeeds([9, 1, 5])).toEqual([1, 5, 9]);
    expect(() => createSortedArenaExperimentSeeds([1, 1])).toThrow(/重复 seed/);
    expect(createArenaExperimentReplaySeeds([9, 1, 5], 2)).toEqual([1, 5]);
    expect(cloneArenaExperimentReplaySeeds([1, 5, 9])).toEqual([1, 5, 9]);
    expect(() => cloneArenaExperimentReplaySeeds([5, 1])).toThrow(/严格递增/);
    expect(() => assertArenaExperimentReplaySeedsPlanned([1, 8], [1, 5], 'replay')).toThrow(
      /不在 Definition seed 集/,
    );
  });

  it('rejects accessor-backed seed arrays without executing them', () => {
    let reads = 0;
    const seeds = [1];
    Object.defineProperty(seeds, '0', {
      enumerable: true,
      get() {
        reads += 1;
        return 7;
      },
    });

    expect(() => createSortedArenaExperimentSeeds(seeds)).toThrow(/访问器/);
    expect(reads).toBe(0);
  });

  it('creates and reads a metric gate from its checks as the single truth', () => {
    const gate = createArenaMetricGate([
      { id: 'combat.hit-rate', passed: true },
      { id: 'combat.timeout-rate', passed: false },
    ]);

    expect(gate.passed).toBe(false);
    expect(readArenaMetricGate({ gate })).toEqual(gate);
    expect(readArenaMetricGate({ unrelated: true })).toBeNull();
    expect(() => readArenaMetricGate({
      gate: { ...gate, passed: true },
    })).toThrow(/计算结果不一致/);
    expect(() => createArenaMetricGate([
      { id: 'duplicate', passed: true },
      { id: 'duplicate', passed: true },
    ])).toThrow(/重复 check/);
    expect(() => createArenaMetricGate([
      { id: 'known', passed: true, extra: true },
    ])).toThrow(/不支持字段 extra/);
  });

  it('rejects an accessor-backed gate without executing it', () => {
    let reads = 0;
    const metricData = Object.defineProperty({}, 'gate', {
      enumerable: true,
      get() {
        reads += 1;
        return createArenaMetricGate([{ id: 'unsafe', passed: true }]);
      },
    });

    expect(() => readArenaMetricGate(metricData)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});
