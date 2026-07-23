import {
  ARENA_MATCH_PHASE,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { replayMatch } from '../replay.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  assertArenaMapTimelineFinalState,
  assertArenaMapTimelineSnapshotInvariants,
  createArenaMatchCoreTickSnapshot,
  cloneArenaExperimentReplaySeeds,
} from '@number-strategy-jump/arena-experiment';

export const ARENA_V1_MAP_TIMELINE_WORKLOAD_ID = 'arena.stage9.map-timeline';
export const ARENA_V1_MAP_TIMELINE_WORKLOAD_VERSION = 1;

export const ARENA_V1_MAP_TIMELINE_EXPECTED_EVENT_COUNTS = Object.freeze({
  MapEventEnded: 6,
  MapEventStarted: 13,
  MapEventWarned: 13,
  MapEquipmentWaveReleased: 4,
  MapSurfaceCollapsed: 8,
});

export const ARENA_V1_MAP_TIMELINE_DEFAULT_PARAMETERS = Object.freeze({
  replaySeeds: Object.freeze([]),
  replayCheckpointInterval: 600,
  maximumEventsPerCase: 500,
  expectedEnabledSurfaceIds: Object.freeze(['tile-center']),
  expectedOccurrenceCount: 13,
  expectedEventCounts: ARENA_V1_MAP_TIMELINE_EXPECTED_EVENT_COUNTS,
});

const PARAMETER_KEYS = new Set([
  'replaySeeds',
  'replayCheckpointInterval',
  'maximumEventsPerCase',
  'expectedEnabledSurfaceIds',
  'expectedOccurrenceCount',
  'expectedEventCounts',
]);

function cloneExpectedEventCounts(value) {
  const source = cloneFrozenData(value, 'map timeline expectedEventCounts');
  const result = {};
  for (const [type, count] of Object.entries(source)) {
    result[assertNonEmptyString(type, 'map timeline expected event type')] = assertIntegerAtLeast(
      count,
      0,
      `map timeline expectedEventCounts.${type}`,
    );
  }
  if (Object.keys(result).length === 0) {
    throw new RangeError('map timeline expectedEventCounts 不能为空。');
  }
  return Object.freeze(result);
}

function sortedCounts(values) {
  return Object.freeze(Object.fromEntries([...values.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ))));
}

export function createArenaV1MapTimelineParameters(value) {
  const source = cloneFrozenData(value, 'map timeline parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'map timeline parameters');
  return Object.freeze({
    replaySeeds: cloneArenaExperimentReplaySeeds(
      source.replaySeeds,
      'map timeline replaySeeds',
    ),
    replayCheckpointInterval: assertIntegerAtLeast(
      source.replayCheckpointInterval,
      1,
      'map timeline replayCheckpointInterval',
    ),
    maximumEventsPerCase: assertIntegerAtLeast(
      source.maximumEventsPerCase,
      1,
      'map timeline maximumEventsPerCase',
    ),
    expectedEnabledSurfaceIds: cloneFrozenStringSet(
      source.expectedEnabledSurfaceIds,
      'map timeline expectedEnabledSurfaceIds',
    ),
    expectedOccurrenceCount: assertIntegerAtLeast(
      source.expectedOccurrenceCount,
      0,
      'map timeline expectedOccurrenceCount',
    ),
    expectedEventCounts: cloneExpectedEventCounts(source.expectedEventCounts),
  });
}

class ArenaV1MapTimelineCase {
  #core;
  #runner;
  #parameters;
  #eventCounts;
  #eventCount;
  #destroyed;

  constructor({ seed, candidate, parameters }) {
    this.#parameters = createArenaV1MapTimelineParameters(parameters);
    this.#core = createArenaV1MatchCore({ seed, config: candidate.matchConfig });
    this.#runner = null;
    try {
      if (this.#parameters.replaySeeds.includes(seed)) {
        this.#runner = new HeadlessMatchRunner(this.#core, {
          checkpointInterval: this.#parameters.replayCheckpointInterval,
        });
      }
    } catch (error) {
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (cleanupError) {
        const combined = new Error('Map timeline case 构造失败且 Core 清理失败。');
        combined.originalError = error;
        combined.cleanupError = cleanupError;
        throw combined;
      }
      throw error;
    }
    this.#eventCounts = new Map();
    this.#eventCount = 0;
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaV1MapTimelineCase 已销毁。');
  }

  #snapshot() {
    return assertArenaMapTimelineSnapshotInvariants(this.#core.getSnapshot(), this.#core.config);
  }

  getMetadata() {
    this.#assertUsable();
    const metadata = this.#core.getReplayMetadata();
    return Object.freeze({
      matchSeed: metadata.matchSeed,
      matchSchemaVersion: metadata.schemaVersion,
      physicsBackendVersion: metadata.physicsBackendVersion,
      configHash: metadata.configHash,
      ruleContentHash: metadata.ruleContentHash,
    });
  }

  getSnapshot() {
    this.#assertUsable();
    return createArenaMatchCoreTickSnapshot(this.#snapshot().tick);
  }

  isComplete() {
    this.#assertUsable();
    return this.#core.phase === ARENA_MATCH_PHASE.ENDED;
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 Map timeline case 不能继续 step。');
    const snapshot = this.#snapshot();
    const frames = this.#core.config.participantIds.map((participantId) => (
      createNeutralInputFrame(snapshot.tick, participantId)
    ));
    const events = this.#runner ? this.#runner.step(frames) : this.#core.step(frames);
    for (const event of events) {
      this.#eventCounts.set(event.type, (this.#eventCounts.get(event.type) ?? 0) + 1);
      this.#eventCount += 1;
    }
    if (this.#eventCount > this.#parameters.maximumEventsPerCase) {
      throw new Error(
        `Map timeline case ${this.#core.matchSeed} 事件数超过`
        + ` ${this.#parameters.maximumEventsPerCase}。`,
      );
    }
    return Object.freeze({
      inputFrames: frames,
      events,
      snapshot: createArenaMatchCoreTickSnapshot(this.#core.tick),
    });
  }

  exportResult() {
    this.#assertUsable();
    if (!this.isComplete() || !this.#core.result) {
      throw new Error('只能导出已经结算的 Map timeline case。');
    }
    const finalSnapshot = this.#snapshot();
    const finalState = assertArenaMapTimelineFinalState(finalSnapshot, this.#parameters);
    const eventCounts = sortedCounts(this.#eventCounts);
    for (const [type, expected] of Object.entries(this.#parameters.expectedEventCounts)) {
      if ((eventCounts[type] ?? 0) !== expected) {
        throw new Error(
          `Map timeline case ${this.#core.matchSeed} ${type} 数量`
          + ` ${eventCounts[type] ?? 0} 与预期 ${expected} 不一致。`,
        );
      }
    }
    const finalHash = this.#core.getStateHash();
    let replayVerified = false;
    if (this.#runner) {
      const replay = this.#runner.exportReplay();
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash || replay.finalHash !== finalHash) {
        throw new Error(`Map timeline case ${this.#core.matchSeed} 回放 hash 不同。`);
      }
      replayVerified = true;
    }
    return Object.freeze({
      finalHash,
      result: Object.freeze({
        replayVerified,
        enabledSurfaceIds: finalState.enabledSurfaceIds,
        occurrenceCount: finalState.occurrenceCount,
        eventCounts,
      }),
    });
  }

  destroy() {
    if (this.#destroyed && !this.#runner && !this.#core) return;
    this.#destroyed = true;
    this.#parameters = null;
    this.#eventCounts.clear();
    const errors = [];
    if (this.#runner) {
      try {
        this.#runner.destroy();
        this.#runner = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#core) {
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      const error = new Error('ArenaV1MapTimelineCase 清理未完整完成。');
      error.causes = errors;
      throw error;
    }
  }
}

export function createArenaV1MapTimelineWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_MAP_TIMELINE_WORKLOAD_ID,
    version: ARENA_V1_MAP_TIMELINE_WORKLOAD_VERSION,
    validateParameters: createArenaV1MapTimelineParameters,
    createCase: (options) => new ArenaV1MapTimelineCase(options),
  });
}
