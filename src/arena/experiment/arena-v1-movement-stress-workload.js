import { ARENA_MATCH_PHASE } from '../config.js';
import { createArenaV1MatchCore } from '../arena-v1-match-core.js';
import { HeadlessMatchRunner, replayMatch } from '../replay.js';
import { combineCleanupFailure, normalizeThrownError } from '../lifecycle-error.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import {
  assertArenaMovementSnapshotInvariants,
  createArenaMovementExperimentSnapshot,
} from './arena-movement-invariants.js';
import { cloneArenaExperimentReplaySeeds } from './experiment-seed-utils.js';
import {
  ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING,
  createArenaV1MovementStressStrategy,
  createArenaV1MovementStressTuning,
} from './arena-v1-movement-stress-strategy.js';

export const ARENA_V1_MOVEMENT_STRESS_WORKLOAD_ID = 'arena.stage9.movement-stress';
export const ARENA_V1_MOVEMENT_STRESS_WORKLOAD_VERSION = 1;

export const ARENA_V1_MOVEMENT_STRESS_DEFAULT_PARAMETERS = Object.freeze({
  input: ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING,
  replaySeeds: Object.freeze([]),
  replayCheckpointInterval: 300,
  maximumEventsPerCase: 5_000,
});

const PARAMETER_KEYS = new Set([
  'input',
  'replaySeeds',
  'replayCheckpointInterval',
  'maximumEventsPerCase',
]);

export function createArenaV1MovementStressParameters(value) {
  const source = cloneFrozenData(value, 'movement stress parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'movement stress parameters');
  return Object.freeze({
    input: createArenaV1MovementStressTuning(source.input),
    replaySeeds: cloneArenaExperimentReplaySeeds(
      source.replaySeeds,
      'movement stress replaySeeds',
    ),
    replayCheckpointInterval: assertIntegerAtLeast(
      source.replayCheckpointInterval,
      1,
      'movement stress replayCheckpointInterval',
    ),
    maximumEventsPerCase: assertIntegerAtLeast(
      source.maximumEventsPerCase,
      1,
      'movement stress maximumEventsPerCase',
    ),
  });
}

class ArenaV1MovementStressCase {
  #core;
  #runner;
  #strategy;
  #parameters;
  #eventCount;
  #destroyed;

  constructor({ seed, candidate, parameters }) {
    this.#parameters = createArenaV1MovementStressParameters(parameters);
    this.#core = createArenaV1MatchCore({ seed, config: candidate.matchConfig });
    this.#runner = null;
    this.#strategy = null;
    try {
      this.#strategy = createArenaV1MovementStressStrategy({
        matchSeed: this.#core.matchSeed,
        participantIds: this.#core.config.participantIds,
        tuning: this.#parameters.input,
      });
      if (this.#parameters.replaySeeds.includes(seed)) {
        this.#runner = new HeadlessMatchRunner(this.#core, {
          checkpointInterval: this.#parameters.replayCheckpointInterval,
        });
      }
    } catch (error) {
      const cleanupErrors = [];
      if (this.#strategy) {
        try {
          this.#strategy.destroy();
          this.#strategy = null;
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, 'Movement stress case 构造失败'),
        cleanupErrors,
        'Movement stress case 构造失败且清理未完整完成。',
      );
    }
    this.#eventCount = 0;
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaV1MovementStressCase 已销毁。');
  }

  #snapshot() {
    return assertArenaMovementSnapshotInvariants(
      this.#core.getSnapshot(),
      this.#core.config,
      (participantId) => this.#core.getCharacterDefinition(participantId),
    );
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
    return createArenaMovementExperimentSnapshot(this.#snapshot());
  }

  isComplete() {
    this.#assertUsable();
    return this.#core.phase === ARENA_MATCH_PHASE.ENDED;
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 Movement stress case 不能继续 step。');
    const snapshot = this.#snapshot();
    const frames = this.#strategy.createFrames(snapshot);
    const events = this.#runner ? this.#runner.step(frames) : this.#core.step(frames);
    this.#eventCount += events.length;
    if (this.#eventCount > this.#parameters.maximumEventsPerCase) {
      throw new Error(
        `Movement stress case ${this.#core.matchSeed} 事件数超过`
        + ` ${this.#parameters.maximumEventsPerCase}。`,
      );
    }
    return Object.freeze({
      inputFrames: frames,
      events,
      snapshot: createArenaMovementExperimentSnapshot(this.#core.getSnapshot()),
    });
  }

  exportResult() {
    this.#assertUsable();
    if (!this.isComplete() || !this.#core.result) {
      throw new Error('只能导出已经结算的 Movement stress case。');
    }
    this.#snapshot();
    const finalHash = this.#core.getStateHash();
    let replayVerified = false;
    if (this.#runner) {
      const replay = this.#runner.exportReplay();
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash || replay.finalHash !== finalHash) {
        throw new Error(`Movement stress case ${this.#core.matchSeed} 回放 hash 不同。`);
      }
      replayVerified = true;
    }
    return Object.freeze({
      finalHash,
      result: Object.freeze({ replayVerified }),
    });
  }

  destroy() {
    if (this.#destroyed && !this.#runner && !this.#core && !this.#strategy) return;
    this.#destroyed = true;
    this.#parameters = null;
    const errors = [];
    if (this.#runner) {
      try {
        this.#runner.destroy();
        this.#runner = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#strategy) {
      try {
        this.#strategy.destroy();
        this.#strategy = null;
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
      const error = new Error('ArenaV1MovementStressCase 清理未完整完成。');
      error.causes = errors;
      throw error;
    }
  }
}

export function createArenaV1MovementStressWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_MOVEMENT_STRESS_WORKLOAD_ID,
    version: ARENA_V1_MOVEMENT_STRESS_WORKLOAD_VERSION,
    validateParameters: createArenaV1MovementStressParameters,
    createCase: (options) => new ArenaV1MovementStressCase(options),
  });
}
