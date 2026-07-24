import {
  ARENA_MATCH_PHASE,
  createReplayMatch,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { combineCleanupFailure, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertArenaMovementSnapshotInvariants,
  createArenaMovementExperimentSnapshot,
} from './arena-movement-invariants.js';
import { cloneArenaExperimentReplaySeeds } from '@number-strategy-jump/arena-experiment';
import {
  ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING,
  createArenaV1MovementStressStrategy,
  createArenaV1MovementStressTuning,
} from '@number-strategy-jump/arena-experiment';
import type { ArenaSimulationCaseFactoryOptions } from '@number-strategy-jump/arena-experiment';
import type { ArenaV1MovementStressTuning } from '@number-strategy-jump/arena-experiment';

const replayMatch = createReplayMatch(createArenaV1MatchCore);

export const ARENA_V1_MOVEMENT_STRESS_WORKLOAD_ID = 'arena.stage9.movement-stress';
export const ARENA_V1_MOVEMENT_STRESS_WORKLOAD_VERSION = 2;

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

export interface ArenaV1MovementStressParameters {
  readonly input: Readonly<ArenaV1MovementStressTuning>;
  readonly replaySeeds: readonly number[];
  readonly replayCheckpointInterval: number;
  readonly maximumEventsPerCase: number;
}

export function createArenaV1MovementStressParameters(
  value: unknown,
): Readonly<ArenaV1MovementStressParameters> {
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
  #core: ReturnType<typeof createArenaV1MatchCore> | null;
  #runner: HeadlessMatchRunner | null;
  #strategy: ReturnType<typeof createArenaV1MovementStressStrategy> | null;
  #parameters: ReturnType<typeof createArenaV1MovementStressParameters> | null;
  #eventCount: number;
  #destroyed: boolean;

  constructor({ seed, candidate, parameters }: ArenaSimulationCaseFactoryOptions) {
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
      const cleanupErrors: Error[] = [];
      if (this.#strategy) {
        try {
          this.#strategy.destroy();
          this.#strategy = null;
        } catch (cleanupError) {
          cleanupErrors.push(normalizeThrownError(cleanupError, 'Movement stress 策略清理失败'));
        }
      }
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, 'Movement stress Core 清理失败'));
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

  #requireCore() {
    this.#assertUsable();
    if (!this.#core) throw new Error('ArenaV1MovementStressCase 缺少 Core。');
    return this.#core;
  }

  #requireStrategy() {
    this.#assertUsable();
    if (!this.#strategy) throw new Error('ArenaV1MovementStressCase 缺少输入策略。');
    return this.#strategy;
  }

  #requireParameters() {
    this.#assertUsable();
    if (!this.#parameters) throw new Error('ArenaV1MovementStressCase 缺少参数。');
    return this.#parameters;
  }

  #snapshot() {
    const core = this.#requireCore();
    return assertArenaMovementSnapshotInvariants(
      core.getSnapshot(),
      core.config,
      (participantId) => core.getCharacterDefinition(participantId),
    );
  }

  getMetadata() {
    this.#assertUsable();
    const metadata = this.#requireCore().getReplayMetadata();
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
    return this.#requireCore().phase === ARENA_MATCH_PHASE.ENDED;
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 Movement stress case 不能继续 step。');
    const snapshot = this.#snapshot();
    const core = this.#requireCore();
    const parameters = this.#requireParameters();
    const frames = this.#requireStrategy().createFrames(snapshot);
    const events = this.#runner ? this.#runner.step(frames) : core.step(frames);
    this.#eventCount += events.length;
    if (this.#eventCount > parameters.maximumEventsPerCase) {
      throw new Error(
        `Movement stress case ${core.matchSeed} 事件数超过`
        + ` ${parameters.maximumEventsPerCase}。`,
      );
    }
    return Object.freeze({
      inputFrames: frames,
      events,
      snapshot: createArenaMovementExperimentSnapshot(core.getSnapshot()),
    });
  }

  exportResult() {
    this.#assertUsable();
    const core = this.#requireCore();
    if (!this.isComplete() || !core.result) {
      throw new Error('只能导出已经结算的 Movement stress case。');
    }
    this.#snapshot();
    const finalHash = core.getStateHash();
    let replayVerified = false;
    if (this.#runner) {
      const replay = this.#runner.exportReplay();
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash || replay.finalHash !== finalHash) {
        throw new Error(`Movement stress case ${core.matchSeed} 回放 hash 不同。`);
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
      throw Object.assign(new Error('ArenaV1MovementStressCase 清理未完整完成。'), {
        causes: Object.freeze(errors),
      });
    }
  }
}

export function createArenaV1MovementStressWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_MOVEMENT_STRESS_WORKLOAD_ID,
    version: ARENA_V1_MOVEMENT_STRESS_WORKLOAD_VERSION,
    validateParameters: createArenaV1MovementStressParameters,
    createCase: (options: ArenaSimulationCaseFactoryOptions) => new ArenaV1MovementStressCase(options),
  });
}
