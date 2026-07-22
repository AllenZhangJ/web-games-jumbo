import { describe, expect, it } from 'vitest';
import {
  ARENA_BUILD_DEFAULT_ENTRY,
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ArenaPerformanceMetricCollectorRegistry,
  createArenaBuildBudgetReport,
  createArenaPerformancePolicyDefinition,
  createArenaPerformanceRecord,
  createArenaPerformanceReport,
  createArenaStage9BuildBudgetV1Policy,
  getArenaPerformanceRecordHash,
} from '../src/index.js';
import type { ArenaPerformanceMetricCollector } from '../src/index.js';

function createPerformancePolicy() {
  return createArenaPerformancePolicyDefinition({
    schemaVersion: 1,
    id: 'arena.performance.test.v1',
    stage: 'test',
    contentVersion: 1,
    targets: [{
      id: 'web-low',
      platform: 'web',
      deviceClass: 'low',
      requiredOsNames: ['iOS'],
      qualityDefinitionId: 'quality.test',
      qualityDefinitionHash: '1234abcd',
      gates: [{
        id: 'capture.clean',
        collectorId: 'observer-error-count',
        operator: 'equal',
        threshold: 0,
        required: true,
        parameters: {},
      }],
    }],
  });
}

function createPerformanceRecordValue(policyHash: string) {
  return {
    schemaVersion: 1,
    recordId: 'record.test',
    policyId: 'arena.performance.test.v1',
    policyHash,
    commit: 'a'.repeat(40),
    buildId: 'arena-build-test',
    targetId: 'web-low',
    runId: 'run.test',
    performedAt: '2026-07-22T00:00:00.000Z',
    capture: {
      qualityDefinitionId: 'quality.test',
      qualityDefinitionHash: '1234abcd',
      observerErrorCount: 0,
      observedMatchCount: 0,
      lifecycle: {
        hideCount: 0,
        showCount: 0,
        contextLostCount: 0,
        contextRestoredCount: 0,
      },
      probe: {
        schemaVersion: 1,
        state: 'stopped',
        durationMs: 0,
        maximumFrameSamples: 1,
        maximumResourceSamples: 1,
        resourceSampleIntervalFrames: 1,
        observedFrameCount: 0,
        recordedFrameCount: 0,
        droppedFrameSampleCount: 0,
        droppedResourceSampleCount: 0,
        milestones: [],
        frames: [],
        resources: [],
      },
    },
  };
}

describe('build budget evidence', () => {
  it('recomputes a clean Web product build without trusting status', () => {
    const report = createArenaBuildBudgetReport(createArenaStage9BuildBudgetV1Policy(), {
      schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
      buildId: 'arena-build-budget-test',
      commit: 'a'.repeat(40),
      sourceDirty: false,
      target: 'web',
      defaultEntry: ARENA_BUILD_DEFAULT_ENTRY.PRODUCT,
      artifacts: [
        { path: 'index.html', sha256: 'b'.repeat(64), byteLength: 1_024 },
        { path: 'assets/game.js', sha256: 'c'.repeat(64), byteLength: 2_048 },
      ],
    });
    expect(report.status).toBe('passed');
    expect(report.freezeEligible).toBe(true);
    expect(report.deliveryBytes).toBe(3_072);
  });

  it('normalizes immutable performance policy and record evidence', () => {
    const policy = createPerformancePolicy();
    const record = createArenaPerformanceRecord(
      policy,
      createPerformanceRecordValue(policy.getContentHash()),
    );
    expect(policy.getTarget('web-low')?.platform).toBe('web');
    expect(Object.isFrozen(policy.targets[0]?.gates)).toBe(true);
    expect(Object.isFrozen(record.capture.probe)).toBe(true);
    expect(getArenaPerformanceRecordHash(policy, record)).toMatch(/^[0-9a-f]{8}$/);
    expect(createArenaPerformanceReport(policy, record).status).toBe('passed');
  });

  it('rejects accessor-backed performance evidence without executing it', () => {
    const policy = createPerformancePolicy();
    let getterCalls = 0;
    const value = createPerformanceRecordValue(policy.getContentHash());
    Object.defineProperty(value, 'runId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'forged';
      },
    });
    expect(() => createArenaPerformanceRecord(policy, value)).toThrow(/runId/);
    expect(getterCalls).toBe(0);
  });

  it('snapshots metric collectors and rejects accessor-backed plugins', () => {
    const registry = new ArenaPerformanceMetricCollectorRegistry();
    const collector: { id: string; collect: ArenaPerformanceMetricCollector['collect'] } = {
      id: 'test.metric',
      collect: () => Object.freeze({
        available: true as const,
        value: 1,
        unit: 'count',
        numerator: null,
        denominator: null,
        reason: null,
      }),
    };
    registry.register(collector);
    collector.collect = () => Object.freeze({
      available: true as const,
      value: 2,
      unit: 'count',
      numerator: null,
      denominator: null,
      reason: null,
    });
    const policy = createPerformancePolicy();
    const record = createArenaPerformanceRecord(
      policy,
      createPerformanceRecordValue(policy.getContentHash()),
    );
    expect(registry.require('test.metric').collect(record, {}).value).toBe(1);

    let getterCalls = 0;
    const accessorCollector = Object.defineProperty({ collect: collector.collect }, 'id', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'forged.metric';
      },
    });
    expect(() => registry.register(accessorCollector)).toThrow(/id/);
    expect(getterCalls).toBe(0);
  });

  it('rejects accessor-backed report options without executing them', () => {
    const policy = createPerformancePolicy();
    const record = createArenaPerformanceRecord(
      policy,
      createPerformanceRecordValue(policy.getContentHash()),
    );
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'metricRegistry', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return undefined;
      },
    });
    expect(() => createArenaPerformanceReport(policy, record, options)).toThrow(/metricRegistry/);
    expect(getterCalls).toBe(0);
  });
});
