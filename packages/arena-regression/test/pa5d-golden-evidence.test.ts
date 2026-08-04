import { describe, expect, it } from 'vitest';
import {
  createArenaGoldenReplayManifest,
  createArenaRegressionEvidenceReport,
  createArenaStage9RegressionEvidenceV1Definition,
  readArenaRegressionEvidenceReport,
} from '../src/index.js';

const HASH = '0123abcd';

function manifestEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'regression.sample',
    category: 'regression',
    file: 'regression-sample.json',
    scenario: { id: 'regression.sample', version: 1 },
    replayHash: HASH,
    matchSeed: 42,
    matchSchemaVersion: 1,
    physicsBackendVersion: 'arena.physics.v1',
    configHash: HASH,
    ruleContentHash: HASH,
    finalHash: HASH,
    endedAtTick: 2,
    resultReason: 'match-ended',
    winnerId: null,
    inputFrameCount: 2,
    checkpointCount: 2,
    eventCounts: { MatchStarted: 1, MatchEnded: 1 },
    ...overrides,
  };
}

function validManifest(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'arena.stage9.golden-replays.v5',
    replaySchemaVersion: 5,
    rejectedReplaySchemaVersions: [4],
    entries: [manifestEntry()],
  };
}

function validEvidenceInput(): Record<string, unknown> {
  const definition = createArenaStage9RegressionEvidenceV1Definition();
  const input = definition.components.map((component) => {
    if (component.id === 'input-fuzz') {
      return {
        id: component.id,
        matchesPerMapper: 40,
        totalMatches: 80,
        replaySamplesPerMapper: 2,
        verifiedReplays: 4,
        uniqueFinalHashes: 80,
        mappers: [
          { id: 'context-primary-b', matches: 40, uniqueFinalHashes: 40, replayChecks: 2 },
          { id: 'gesture-mobility-a', matches: 40, uniqueFinalHashes: 40, replayChecks: 2 },
        ],
        operations: { down: 1, move: 1, up: 1 },
        frameCounts: { '1': 1 },
      };
    }
    if (component.id === 'lifecycle-tests') {
      return {
        id: component.id,
        testFileCount: component.testFiles?.length,
        testCount: 6,
        passCount: 6,
        failCount: 0,
        cancelledCount: 0,
        skippedCount: 0,
        todoCount: 0,
      };
    }
    if (component.id === 'presentation-session-soak') {
      return {
        id: component.id,
        matches: 100,
        uniqueMatchSeeds: 100,
        heapGrowthBytes: 1,
        heapGrowthBudgetBytes: 8 * 1024 * 1024,
        remainingFrames: 0,
        remainingLifecycleListeners: 0,
        remainingCanvasListeners: 0,
        inputBound: false,
        diagnostics: 0,
      };
    }
    if (component.id === 'product-presentation-session-soak') {
      return {
        id: component.id,
        ok: true,
        matches: 100,
        uniqueMatchSeeds: 100,
        uniqueAuthorityHashes: 100,
        heapGrowthBytes: 1,
        heapGrowthBudgetBytes: 8 * 1024 * 1024,
        remainingFrames: 0,
        remainingLifecycleListeners: 0,
        remainingCanvasListeners: 0,
        inputBound: false,
        diagnostics: 0,
      };
    }
    return {
      id: component.id,
      ok: true,
      matches: 200,
      authorityHashCount: 200,
      contentHashCount: 1,
      lifecycleTransitions: 1,
      rematches: 1,
      maximumTicks: 1,
      restarts: 1,
      experience: 1,
      latestGrantId: 'grant-1',
    };
  });
  return {
    sourceCommit: '0123456789abcdef0123456789abcdef01234567',
    sourceDirty: false,
    generatedAt: '2026-07-30T00:00:00.000Z',
    runtime: { name: 'node', version: '22', platform: 'darwin', architecture: 'arm64' },
    components: input,
  };
}

describe('PA5d manifest and evidence contracts', () => {
  it('deep-freezes a deterministic manifest and rejects extra or unsorted data', () => {
    const manifest = createArenaGoldenReplayManifest(validManifest());
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.entries)).toBe(true);
    expect(Object.isFrozen(manifest.entries[0]?.eventCounts)).toBe(true);

    expect(() => createArenaGoldenReplayManifest({
      ...validManifest(),
      entries: [{ ...manifestEntry(), extra: true }],
    })).toThrow(/不支持字段/);
    expect(() => createArenaGoldenReplayManifest({
      ...validManifest(),
      entries: [manifestEntry({ id: 'regression.z' }), manifestEntry({ id: 'regression.a', file: 'regression-a.json' })],
    })).toThrow(/严格递增/);
  });

  it('rejects missing/non-enumerable/accessor/sparse manifest fields without invoking getters', () => {
    const missing = validManifest();
    delete missing.rejectedReplaySchemaVersions;
    expect(() => createArenaGoldenReplayManifest(missing)).toThrow();

    let reads = 0;
    const hostile = validManifest();
    Object.defineProperty(hostile, 'schemaVersion', {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    expect(() => createArenaGoldenReplayManifest(hostile)).toThrow(/访问器|数据字段/);
    expect(reads).toBe(0);

    const sparse = validManifest();
    sparse.entries = new Array(1);
    expect(() => createArenaGoldenReplayManifest(sparse)).toThrow(/空槽/);
  });

  it('recomputes evidence result hash and rejects tampered nested components', () => {
    const input = validEvidenceInput();
    const report = createArenaRegressionEvidenceReport(input);
    expect(readArenaRegressionEvidenceReport(report)).toEqual(report);
    expect(Object.isFrozen(report.components)).toBe(true);

    let createReads = 0;
    const createProxy = new Proxy(input, {
      get() {
        createReads += 1;
        throw new Error('evidence input getter must not execute');
      },
    });
    expect(createArenaRegressionEvidenceReport(createProxy)).toEqual(report);
    expect(createReads).toBe(0);

    let readReads = 0;
    const readProxy = new Proxy(report, {
      get() {
        readReads += 1;
        throw new Error('evidence report getter must not execute');
      },
    });
    expect(readArenaRegressionEvidenceReport(readProxy)).toEqual(report);
    expect(readReads).toBe(0);

    const tampered = structuredClone(report) as unknown as { components: Array<Record<string, unknown>> };
    tampered.components[0]!.totalMatches = 81;
    expect(() => readArenaRegressionEvidenceReport(tampered)).toThrow();
  });
});
