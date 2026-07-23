import { BotController } from '@number-strategy-jump/arena-bot';
import { BOT_DIFFICULTY_IDS, getBotDifficultyProfile } from '@number-strategy-jump/arena-bot';
import type { BotDifficultyId } from '@number-strategy-jump/arena-bot';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { combineCleanupFailure, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { QuickMatchService } from '@number-strategy-jump/arena-v1-composition';
import { createArenaMatchConfig, createReplayMatch } from '@number-strategy-jump/arena-match';
import type { MatchReplayMetadata } from '@number-strategy-jump/arena-match';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaInputFrame,
  ArenaMatchResultSnapshot,
  ArenaMatchSnapshot,
  PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  createArenaV1BenchmarkPlayerStrategy,
  createArenaV1BenchmarkPlayerTuning,
} from './arena-v1-benchmark-player-strategy.js';
import type {
  ArenaV1BenchmarkPlayerStrategy,
} from './arena-v1-benchmark-player-strategy.js';
import { cloneArenaExperimentReplaySeeds } from '@number-strategy-jump/arena-experiment';
import type {
  ArenaExperimentCandidate,
  ArenaSimulationCaseFactoryOptions,
} from '@number-strategy-jump/arena-experiment';
import {
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
} from '@number-strategy-jump/arena-balance';

const replayMatch = createReplayMatch(createArenaV1MatchCore);

export {
  ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
} from '@number-strategy-jump/arena-balance';

const PARAMETER_KEYS = new Set([
  'difficultyIds',
  'benchmarkPlayer',
  'replaySeeds',
  'maximumEventsPerCase',
]);

function cloneDifficultyIds(value: unknown): readonly BotDifficultyId[] {
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

export function createArenaV1BotCapabilityParameters(value: unknown) {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'bot capability parameters'),
    'bot capability parameters',
  );
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

interface ArenaBotExperimentSnapshot extends PlainRecord {
  readonly tick: number;
  readonly difficultyId: string;
  readonly matchTick: number;
}
interface ArenaBotDifficultyResult {
  readonly difficultyId: string;
  readonly ticks: number;
  readonly outcome: Readonly<ArenaMatchResultSnapshot>;
  readonly finalHash: string;
  readonly replayVerified: boolean;
}

function createExperimentSnapshot(
  tick: number,
  difficultyId: string,
  snapshot: ArenaMatchSnapshot,
): Readonly<ArenaBotExperimentSnapshot> {
  return Object.freeze({
    tick,
    difficultyId,
    matchTick: snapshot.tick,
  });
}

class ArenaV1BotCapabilityCase {
  #seed: number;
  #candidate: Readonly<ArenaExperimentCandidate> | null;
  #parameters: ReturnType<typeof createArenaV1BotCapabilityParameters> | null;
  #difficultyIndex: number;
  #session: ReturnType<QuickMatchService['create']>['session'] | null;
  #playerStrategy: Readonly<ArenaV1BenchmarkPlayerStrategy> | null;
  #lastBotFrame: ArenaInputFrame | null;
  #metadata: MatchReplayMetadata | null;
  #lastSnapshot: Readonly<ArenaBotExperimentSnapshot> | null;
  #experimentTick: number;
  #eventCount: number;
  #results: Readonly<ArenaBotDifficultyResult>[];
  #destroyed: boolean;

  constructor({ seed, candidate, parameters }: ArenaSimulationCaseFactoryOptions) {
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

  #requireCandidate() {
    this.#assertUsable();
    if (!this.#candidate) throw new Error('ArenaV1BotCapabilityCase 缺少候选。');
    return this.#candidate;
  }

  #requireParameters() {
    this.#assertUsable();
    if (!this.#parameters) throw new Error('ArenaV1BotCapabilityCase 缺少参数。');
    return this.#parameters;
  }

  #requireMetadata() {
    this.#assertUsable();
    if (!this.#metadata) throw new Error('ArenaV1BotCapabilityCase 缺少元数据。');
    return this.#metadata;
  }

  #verifyCoreMetadata(metadata: MatchReplayMetadata) {
    const expected = this.#requireCandidate().authority;
    for (const field of [
      'matchSchemaVersion',
      'physicsBackendVersion',
      'configHash',
      'ruleContentHash',
    ]) {
      const actualField = field === 'matchSchemaVersion'
        ? 'schemaVersion'
        : field;
      if (metadata[actualField as keyof MatchReplayMetadata] !== expected[field as keyof typeof expected]) {
        throw new Error(`Bot capability ${field} 与候选不一致。`);
      }
    }
    if (metadata.matchSeed !== this.#seed) {
      throw new Error('Bot capability core matchSeed 与 case seed 不一致。');
    }
  }

  #startDifficulty() {
    const parameters = this.#requireParameters();
    const candidate = this.#requireCandidate();
    const difficultyId = parameters.difficultyIds[this.#difficultyIndex];
    if (!difficultyId) throw new Error('Bot capability 没有待启动难度。');
    let createdMetadata: MatchReplayMetadata | null = null;
    const service = new QuickMatchService({
      allowDifficultyOverride: true,
      coreFactory: (options: unknown) => {
        const core = createArenaV1MatchCore(options);
        try {
          createdMetadata = core.getReplayMetadata();
          this.#verifyCoreMetadata(createdMetadata);
          return core;
        } catch (error) {
          const cleanupErrors: Error[] = [];
          try {
            core.destroy();
          } catch (cleanupError) {
            cleanupErrors.push(normalizeThrownError(cleanupError, 'Bot capability Core 清理失败'));
          }
          throw combineCleanupFailure(
            normalizeThrownError(error, 'Bot capability Core metadata 校验失败'),
            cleanupErrors,
            'Bot capability Core metadata 校验失败且清理未完整完成。',
          );
        }
      },
      botControllerFactory: (options: ConstructorParameters<typeof BotController>[0]) => {
        const controller = new BotController(options);
        return {
          createInput: (snapshot: ArenaMatchSnapshot) => {
            const frame = controller.createInput(snapshot);
            this.#lastBotFrame = frame;
            return frame;
          },
          destroy: () => controller.destroy(),
        };
      },
    });
    let match: ReturnType<QuickMatchService['create']> | null = null;
    let playerStrategy: Readonly<ArenaV1BenchmarkPlayerStrategy> | null = null;
    try {
      match = service.create({
        matchSeed: this.#seed,
        difficultyOverride: difficultyId,
        config: candidate.matchConfig,
      });
      playerStrategy = createArenaV1BenchmarkPlayerStrategy({
        config: createArenaMatchConfig(candidate.matchConfig),
        tuning: parameters.benchmarkPlayer,
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
      const cleanupErrors: Error[] = [];
      try {
        playerStrategy?.destroy();
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, 'Bot capability player strategy 清理失败'));
      }
      try {
        match?.session.destroy();
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(cleanupError, 'Bot capability session 清理失败'));
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, `Bot capability ${difficultyId} 启动失败`),
        cleanupErrors,
        `Bot capability ${difficultyId} 启动失败且清理未完整完成。`,
      );
    }
  }

  #cleanupCurrent(): Error[] {
    const errors: Error[] = [];
    if (this.#playerStrategy) {
      try {
        this.#playerStrategy.destroy();
        this.#playerStrategy = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'Bot capability player strategy 清理失败'));
      }
    }
    if (this.#session) {
      try {
        this.#session.destroy();
        this.#session = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'Bot capability session 清理失败'));
      }
    }
    this.#lastBotFrame = null;
    return errors;
  }

  #finishDifficulty() {
    const parameters = this.#requireParameters();
    const difficultyId = parameters.difficultyIds[this.#difficultyIndex];
    if (!difficultyId) throw new Error('Bot capability 没有待完成难度。');
    let result: Readonly<ArenaBotDifficultyResult> | null = null;
    let failure: Error | null = null;
    try {
      if (!this.#session) throw new Error('Bot capability 缺少活动 session。');
      const replay = this.#session.exportReplay();
      let replayVerified = false;
      if (parameters.replaySeeds.includes(this.#seed)) {
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
    if (!result) throw new Error(`Bot capability ${difficultyId} 未生成结果。`);
    this.#results.push(result);
    this.#difficultyIndex += 1;
  }

  getMetadata() {
    this.#assertUsable();
    const metadata = this.#requireMetadata();
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
    return this.#lastSnapshot;
  }

  isComplete() {
    this.#assertUsable();
    return this.#results.length === this.#requireParameters().difficultyIds.length;
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 Bot capability case 不能继续 step。');
    if (!this.#session) this.#startDifficulty();
    const parameters = this.#requireParameters();
    const difficultyId = parameters.difficultyIds[this.#difficultyIndex];
    if (!difficultyId) throw new Error('Bot capability 没有活动难度。');
    if (!this.#session || !this.#playerStrategy) throw new Error('Bot capability 缺少活动运行时。');
    const snapshot = this.#session.getSnapshot();
    const playerFrame = this.#playerStrategy.createInput(snapshot);
    this.#lastBotFrame = null;
    const stepped = this.#session.step(playerFrame);
    const botFrame = this.#lastBotFrame;
    if (!botFrame) throw new Error(`Bot capability ${difficultyId} 未产生 Bot InputFrame。`);
    this.#experimentTick += 1;
    this.#eventCount += stepped.events.length;
    if (this.#eventCount > parameters.maximumEventsPerCase) {
      throw new Error(
        `Bot capability case ${this.#seed} 事件数超过`
        + ` ${parameters.maximumEventsPerCase}。`,
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
      throw Object.assign(new Error('ArenaV1BotCapabilityCase 清理未完整完成。'), {
        causes: Object.freeze(errors),
      });
    }
  }
}

export function createArenaV1BotCapabilityWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
    version: ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
    validateParameters: createArenaV1BotCapabilityParameters,
    createCase: (options: ArenaSimulationCaseFactoryOptions) => new ArenaV1BotCapabilityCase(options),
  });
}
