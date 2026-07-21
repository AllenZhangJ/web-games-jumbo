import { BotController } from '../ai/bot-controller.js';
import { BOT_DIFFICULTY_IDS, getBotDifficultyProfile } from '../ai/bot-difficulty.js';
import { createArenaV1MatchCore } from '../arena-v1-match-core.js';
import { combineCleanupFailure, normalizeThrownError } from '../lifecycle-error.js';
import { QuickMatchService } from '../matchmaking/quick-match-service.js';
import { replayMatch } from '../replay.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING,
  createArenaV1BenchmarkPlayerStrategy,
  createArenaV1BenchmarkPlayerTuning,
} from './arena-v1-benchmark-player-strategy.js';
import { cloneArenaExperimentReplaySeeds } from './experiment-seed-utils.js';

export const ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID = 'arena.stage9.bot-capability';
export const ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION = 1;

export const ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS = Object.freeze({
  difficultyIds: BOT_DIFFICULTY_IDS,
  benchmarkPlayer: ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING,
  replaySeeds: Object.freeze([]),
  maximumEventsPerCase: 20_000,
});

const PARAMETER_KEYS = new Set([
  'difficultyIds',
  'benchmarkPlayer',
  'replaySeeds',
  'maximumEventsPerCase',
]);

function cloneDifficultyIds(value) {
  const source = cloneFrozenData(value, 'bot capability difficultyIds');
  if (!Array.isArray(source) || source.length === 0) {
    throw new RangeError('bot capability difficultyIds 必须是非空数组。');
  }
  const result = source.map((id) => getBotDifficultyProfile(id).id);
  if (new Set(result).size !== result.length) {
    throw new RangeError('bot capability difficultyIds 不能重复。');
  }
  if (
    result.length !== BOT_DIFFICULTY_IDS.length
    || result.some((id, index) => id !== BOT_DIFFICULTY_IDS[index])
  ) {
    throw new RangeError('bot capability v1 必须按 easy/normal/hard 运行完整配对样本。');
  }
  return Object.freeze(result);
}

export function createArenaV1BotCapabilityParameters(value) {
  const source = cloneFrozenData(value, 'bot capability parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'bot capability parameters');
  return Object.freeze({
    difficultyIds: cloneDifficultyIds(source.difficultyIds),
    benchmarkPlayer: createArenaV1BenchmarkPlayerTuning(source.benchmarkPlayer),
    replaySeeds: cloneArenaExperimentReplaySeeds(
      source.replaySeeds,
      'bot capability replaySeeds',
    ),
    maximumEventsPerCase: assertIntegerAtLeast(
      source.maximumEventsPerCase,
      1,
      'bot capability maximumEventsPerCase',
    ),
  });
}

function createExperimentSnapshot(tick, difficultyId, snapshot) {
  return Object.freeze({
    tick,
    difficultyId,
    matchTick: snapshot.tick,
  });
}

class ArenaV1BotCapabilityCase {
  #seed;
  #candidate;
  #parameters;
  #difficultyIndex;
  #session;
  #playerStrategy;
  #lastBotFrame;
  #metadata;
  #lastSnapshot;
  #experimentTick;
  #eventCount;
  #results;
  #destroyed;

  constructor({ seed, candidate, parameters }) {
    this.#seed = seed;
    this.#candidate = candidate;
    this.#parameters = createArenaV1BotCapabilityParameters(parameters);
    this.#difficultyIndex = 0;
    this.#session = null;
    this.#playerStrategy = null;
    this.#lastBotFrame = null;
    this.#metadata = null;
    this.#lastSnapshot = null;
    this.#experimentTick = 0;
    this.#eventCount = 0;
    this.#results = [];
    this.#destroyed = false;
    try {
      this.#startDifficulty();
    } catch (error) {
      const cleanupErrors = this.#cleanupCurrent();
      throw combineCleanupFailure(
        normalizeThrownError(error, 'Bot capability case 构造失败'),
        cleanupErrors,
        'Bot capability case 构造失败且清理未完整完成。',
      );
    }
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaV1BotCapabilityCase 已销毁。');
  }

  #verifyCoreMetadata(metadata) {
    const expected = this.#candidate.authority;
    for (const field of [
      'matchSchemaVersion',
      'physicsBackendVersion',
      'configHash',
      'ruleContentHash',
    ]) {
      const actualField = field === 'matchSchemaVersion'
        ? 'schemaVersion'
        : field;
      if (metadata[actualField] !== expected[field]) {
        throw new Error(`Bot capability ${field} 与候选不一致。`);
      }
    }
    if (metadata.matchSeed !== this.#seed) {
      throw new Error('Bot capability core matchSeed 与 case seed 不一致。');
    }
  }

  #startDifficulty() {
    const difficultyId = this.#parameters.difficultyIds[this.#difficultyIndex];
    if (!difficultyId) throw new Error('Bot capability 没有待启动难度。');
    let createdMetadata = null;
    const service = new QuickMatchService({
      allowDifficultyOverride: true,
      coreFactory: (options) => {
        const core = createArenaV1MatchCore(options);
        try {
          createdMetadata = core.getReplayMetadata();
          this.#verifyCoreMetadata(createdMetadata);
          return core;
        } catch (error) {
          const cleanupErrors = [];
          try {
            core.destroy();
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
          throw combineCleanupFailure(
            normalizeThrownError(error, 'Bot capability Core metadata 校验失败'),
            cleanupErrors,
            'Bot capability Core metadata 校验失败且清理未完整完成。',
          );
        }
      },
      botControllerFactory: (options) => {
        const controller = new BotController(options);
        return {
          createInput: (snapshot) => {
            const frame = controller.createInput(snapshot);
            this.#lastBotFrame = frame;
            return frame;
          },
          destroy: () => controller.destroy(),
        };
      },
    });
    let match = null;
    let playerStrategy = null;
    try {
      match = service.create({
        matchSeed: this.#seed,
        difficultyOverride: difficultyId,
        config: this.#candidate.matchConfig,
      });
      playerStrategy = createArenaV1BenchmarkPlayerStrategy({
        config: this.#candidate.matchConfig,
        tuning: this.#parameters.benchmarkPlayer,
      });
      match.session.start();
      const snapshot = match.session.getSnapshot();
      this.#metadata ??= createdMetadata;
      this.#session = match.session;
      this.#playerStrategy = playerStrategy;
      this.#lastSnapshot = createExperimentSnapshot(
        this.#experimentTick,
        difficultyId,
        snapshot,
      );
    } catch (error) {
      const cleanupErrors = [];
      try {
        playerStrategy?.destroy();
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      try {
        match?.session.destroy();
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, `Bot capability ${difficultyId} 启动失败`),
        cleanupErrors,
        `Bot capability ${difficultyId} 启动失败且清理未完整完成。`,
      );
    }
  }

  #cleanupCurrent() {
    const errors = [];
    if (this.#playerStrategy) {
      try {
        this.#playerStrategy.destroy();
        this.#playerStrategy = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#session) {
      try {
        this.#session.destroy();
        this.#session = null;
      } catch (error) {
        errors.push(error);
      }
    }
    this.#lastBotFrame = null;
    return errors;
  }

  #finishDifficulty() {
    const difficultyId = this.#parameters.difficultyIds[this.#difficultyIndex];
    let result = null;
    let failure = null;
    try {
      const replay = this.#session.exportReplay();
      let replayVerified = false;
      if (this.#parameters.replaySeeds.includes(this.#seed)) {
        const replayed = replayMatch(replay);
        if (replayed.finalHash !== replay.finalHash) {
          throw new Error(`Bot capability ${difficultyId} seed ${this.#seed} 回放分叉。`);
        }
        replayVerified = true;
      }
      result = Object.freeze({
        difficultyId,
        ticks: replay.result.endedAtTick + 1,
        outcome: replay.result,
        finalHash: replay.finalHash,
        replayVerified,
      });
    } catch (error) {
      failure = normalizeThrownError(error, `Bot capability ${difficultyId} 导出失败`);
    }
    const cleanupErrors = this.#cleanupCurrent();
    if (failure || cleanupErrors.length > 0) {
      throw combineCleanupFailure(
        failure ?? new Error(`Bot capability ${difficultyId} 清理失败。`),
        cleanupErrors,
        `Bot capability ${difficultyId} 导出且清理未完整完成。`,
      );
    }
    this.#results.push(result);
    this.#difficultyIndex += 1;
  }

  getMetadata() {
    this.#assertUsable();
    return Object.freeze({
      matchSeed: this.#metadata.matchSeed,
      matchSchemaVersion: this.#metadata.schemaVersion,
      physicsBackendVersion: this.#metadata.physicsBackendVersion,
      configHash: this.#metadata.configHash,
      ruleContentHash: this.#metadata.ruleContentHash,
    });
  }

  getSnapshot() {
    this.#assertUsable();
    return this.#lastSnapshot;
  }

  isComplete() {
    this.#assertUsable();
    return this.#results.length === this.#parameters.difficultyIds.length;
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 Bot capability case 不能继续 step。');
    if (!this.#session) this.#startDifficulty();
    const difficultyId = this.#parameters.difficultyIds[this.#difficultyIndex];
    const snapshot = this.#session.getSnapshot();
    const playerFrame = this.#playerStrategy.createInput(snapshot);
    this.#lastBotFrame = null;
    const stepped = this.#session.step(playerFrame);
    const botFrame = this.#lastBotFrame;
    if (!botFrame) throw new Error(`Bot capability ${difficultyId} 未产生 Bot InputFrame。`);
    this.#experimentTick += 1;
    this.#eventCount += stepped.events.length;
    if (this.#eventCount > this.#parameters.maximumEventsPerCase) {
      throw new Error(
        `Bot capability case ${this.#seed} 事件数超过`
        + ` ${this.#parameters.maximumEventsPerCase}。`,
      );
    }
    this.#lastSnapshot = createExperimentSnapshot(
      this.#experimentTick,
      difficultyId,
      stepped.snapshot,
    );
    if (this.#session.state === 'ended') this.#finishDifficulty();
    return Object.freeze({
      inputFrames: Object.freeze([playerFrame, botFrame]),
      events: stepped.events,
      snapshot: this.#lastSnapshot,
    });
  }

  exportResult() {
    this.#assertUsable();
    if (!this.isComplete()) throw new Error('只能导出已经完成的 Bot capability case。');
    const difficulties = Object.freeze([...this.#results]);
    return Object.freeze({
      finalHash: createDeterministicDataHash(
        { seed: this.#seed, difficulties },
        `Bot capability case ${this.#seed}`,
      ),
      result: Object.freeze({ difficulties }),
    });
  }

  destroy() {
    if (this.#destroyed && !this.#session && !this.#playerStrategy) return;
    this.#destroyed = true;
    const errors = this.#cleanupCurrent();
    this.#candidate = null;
    this.#parameters = null;
    this.#metadata = null;
    this.#lastSnapshot = null;
    this.#results = [];
    if (errors.length > 0) {
      const error = new Error('ArenaV1BotCapabilityCase 清理未完整完成。');
      error.causes = errors;
      throw error;
    }
  }
}

export function createArenaV1BotCapabilityWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
    version: ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
    validateParameters: createArenaV1BotCapabilityParameters,
    createCase: (options) => new ArenaV1BotCapabilityCase(options),
  });
}
