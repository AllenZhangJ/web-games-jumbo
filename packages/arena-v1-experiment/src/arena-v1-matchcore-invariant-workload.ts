import {
  ARENA_MATCH_PHASE,
  createReplayMatch,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertArenaMatchCoreSnapshotInvariants,
  createArenaMatchCoreTickSnapshot,
  ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING,
  createArenaV1MatchCoreStressInputParameters,
  createArenaV1MatchCoreStressInputStrategy,
  cloneArenaExperimentReplaySeeds,
} from '@number-strategy-jump/arena-experiment';
import type { ArenaSimulationCaseFactoryOptions } from '@number-strategy-jump/arena-experiment';

const replayMatch = createReplayMatch(createArenaV1MatchCore);

export const ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_ID =
  'arena.stage9.matchcore-invariants';
export const ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_VERSION = 1;

export const ARENA_V1_MATCHCORE_INVARIANT_DEFAULT_PARAMETERS = Object.freeze({
  input: Object.freeze({
    ...ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING,
    sequenceFirstSeed: 0xa11e0000,
  }),
  replaySeeds: Object.freeze([]),
  replayCheckpointInterval: 300,
  maximumEventsPerCase: 2_000,
});

const PARAMETER_KEYS = new Set([
  'input',
  'replaySeeds',
  'replayCheckpointInterval',
  'maximumEventsPerCase',
]);
export function createArenaV1MatchCoreInvariantParameters(value: unknown) {
  const source = cloneFrozenData(value, 'matchcore invariant parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'matchcore invariant parameters');
  return Object.freeze({
    input: createArenaV1MatchCoreStressInputParameters(source.input),
    replaySeeds: cloneArenaExperimentReplaySeeds(
      source.replaySeeds,
      'matchcore invariants replaySeeds',
    ),
    replayCheckpointInterval: assertIntegerAtLeast(
      source.replayCheckpointInterval,
      1,
      'matchcore invariants replayCheckpointInterval',
    ),
    maximumEventsPerCase: assertIntegerAtLeast(
      source.maximumEventsPerCase,
      1,
      'matchcore invariants maximumEventsPerCase',
    ),
  });
}

class ArenaV1MatchCoreInvariantCase {
  #core: ReturnType<typeof createArenaV1MatchCore> | null;
  #runner: HeadlessMatchRunner | null;
  #inputStrategy: ReturnType<typeof createArenaV1MatchCoreStressInputStrategy> | null;
  #parameters: ReturnType<typeof createArenaV1MatchCoreInvariantParameters> | null;
  #eventCount: number;
  #destroyed: boolean;

  constructor({ seed, candidate, parameters }: ArenaSimulationCaseFactoryOptions) {
    this.#parameters = createArenaV1MatchCoreInvariantParameters(parameters);
    this.#core = createArenaV1MatchCore({ seed, config: candidate.matchConfig });
    try {
      this.#inputStrategy = createArenaV1MatchCoreStressInputStrategy({
        matchSeed: this.#core.matchSeed,
        participantIds: this.#core.config.participantIds,
        parameters: this.#parameters.input,
      });
      this.#runner = this.#parameters.replaySeeds.includes(seed)
        ? new HeadlessMatchRunner(this.#core, {
          checkpointInterval: this.#parameters.replayCheckpointInterval,
        })
        : null;
    } catch (error) {
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (cleanupError) {
        throw Object.assign(new Error('MatchCore invariant case 构造失败且 Core 清理失败。'), {
          originalError: error,
          cleanupError,
        });
      }
      throw error;
    }
    this.#eventCount = 0;
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaV1MatchCoreInvariantCase 已销毁。');
  }

  #requireCore() {
    this.#assertUsable();
    if (!this.#core) throw new Error('ArenaV1MatchCoreInvariantCase 缺少 Core。');
    return this.#core;
  }

  #requireInputStrategy() {
    this.#assertUsable();
    if (!this.#inputStrategy) throw new Error('ArenaV1MatchCoreInvariantCase 缺少输入策略。');
    return this.#inputStrategy;
  }

  #requireParameters() {
    this.#assertUsable();
    if (!this.#parameters) throw new Error('ArenaV1MatchCoreInvariantCase 缺少参数。');
    return this.#parameters;
  }

  #assertAuthoritySnapshot() {
    const core = this.#requireCore();
    return assertArenaMatchCoreSnapshotInvariants(core.getSnapshot(), core.config);
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
    const snapshot = this.#assertAuthoritySnapshot();
    return createArenaMatchCoreTickSnapshot(snapshot.tick);
  }

  isComplete() {
    this.#assertUsable();
    return this.#requireCore().phase === ARENA_MATCH_PHASE.ENDED;
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 MatchCore invariant case 不能继续 step。');
    const snapshot = this.#assertAuthoritySnapshot();
    const core = this.#requireCore();
    const parameters = this.#requireParameters();
    const frames = this.#requireInputStrategy().createFrames(snapshot);
    const events = this.#runner ? this.#runner.step(frames) : core.step(frames);
    this.#eventCount += events.length;
    if (this.#eventCount > parameters.maximumEventsPerCase) {
      throw new Error(
        `MatchCore invariant case ${core.matchSeed} 事件数超过`
        + ` ${parameters.maximumEventsPerCase}。`,
      );
    }
    return Object.freeze({
      inputFrames: frames,
      events,
      snapshot: createArenaMatchCoreTickSnapshot(core.tick),
    });
  }

  exportResult() {
    this.#assertUsable();
    const core = this.#requireCore();
    if (!this.isComplete() || !core.result) {
      throw new Error('只能导出已经结算的 MatchCore invariant case。');
    }
    this.#assertAuthoritySnapshot();
    const finalHash = core.getStateHash();
    let replayVerified = false;
    if (this.#runner) {
      const replay = this.#runner.exportReplay();
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash || replay.finalHash !== finalHash) {
        throw new Error(`MatchCore invariant case ${core.matchSeed} 回放 hash 不同。`);
      }
      replayVerified = true;
    }
    return Object.freeze({
      finalHash,
      result: Object.freeze({ ...core.result, replayVerified }),
    });
  }

  destroy() {
    if (this.#destroyed && !this.#runner && !this.#core) return;
    this.#destroyed = true;
    this.#inputStrategy = null;
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
    if (this.#core) {
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw Object.assign(new Error('ArenaV1MatchCoreInvariantCase 清理未完整完成。'), {
        causes: Object.freeze(errors),
      });
    }
  }
}

export function createArenaV1MatchCoreInvariantWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_ID,
    version: ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_VERSION,
    validateParameters: createArenaV1MatchCoreInvariantParameters,
    createCase: (options: ArenaSimulationCaseFactoryOptions) => (
      new ArenaV1MatchCoreInvariantCase(options)
    ),
  });
}
