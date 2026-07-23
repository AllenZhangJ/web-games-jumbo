import {
  ARENA_MATCH_PHASE,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  createArenaV1ScriptedPressureInputStrategy,
  createArenaV1ScriptedPressureParameters,
} from '@number-strategy-jump/arena-experiment';

export { ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS } from '@number-strategy-jump/arena-experiment';

export const ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_ID =
  'arena.stage9.scripted-pressure';
export const ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_VERSION = 1;

class ArenaV1ScriptedPressureCase {
  #core;
  #runner;
  #inputStrategy;
  #destroyed;

  constructor({ seed, candidate, parameters }) {
    const normalizedParameters = createArenaV1ScriptedPressureParameters(parameters);
    this.#core = createArenaV1MatchCore({ seed, config: candidate.matchConfig });
    try {
      this.#inputStrategy = createArenaV1ScriptedPressureInputStrategy({
        matchSeed: this.#core.matchSeed,
        participantIds: this.#core.config.participantIds,
        basePushRange: this.#core.config.basePush.range,
        parameters: normalizedParameters,
      });
      this.#runner = new HeadlessMatchRunner(this.#core, { checkpointInterval: 300 });
    } catch (error) {
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (cleanupError) {
        const combined = new Error('Scripted pressure case 构造失败且 Core 清理失败。');
        combined.originalError = error;
        combined.cleanupError = cleanupError;
        throw combined;
      }
      throw error;
    }
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaV1ScriptedPressureCase 已销毁。');
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
    return this.#core.getSnapshot();
  }

  isComplete() {
    this.#assertUsable();
    return this.#core.phase === ARENA_MATCH_PHASE.ENDED;
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 scripted pressure case 不能继续 step。');
    const frames = this.#inputStrategy.createFrames(this.#core.getSnapshot());
    const events = this.#runner.step(frames);
    return Object.freeze({
      inputFrames: frames,
      events,
      snapshot: this.#core.getSnapshot(),
    });
  }

  exportResult() {
    this.#assertUsable();
    if (!this.isComplete() || !this.#core.result) {
      throw new Error('只能导出已经结算的 scripted pressure case。');
    }
    return Object.freeze({
      finalHash: this.#core.getStateHash(),
      result: this.#core.result,
    });
  }

  destroy() {
    if (this.#destroyed && !this.#runner && !this.#core) return;
    this.#destroyed = true;
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
      const error = new Error('ArenaV1ScriptedPressureCase 清理未完整完成。');
      error.causes = errors;
      throw error;
    }
    this.#inputStrategy = null;
  }
}

export function createArenaV1ScriptedPressureWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_ID,
    version: ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_VERSION,
    validateParameters: createArenaV1ScriptedPressureParameters,
    createCase: (options) => new ArenaV1ScriptedPressureCase(options),
  });
}
