import {
  assertKnownKeys,
  combineCleanupFailure,
  createDeterministicDataHash,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  BOT_DIFFICULTY_PROFILES,
  BotController,
  type BotDifficultyId,
} from '@number-strategy-jump/arena-bot';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { ARENA_V1_BALANCE_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import {
  createReplayMatch,
  validateArenaReplay,
  type ArenaReplay,
  type ReplayBeforeStepContext,
  type ReplayMatchResult,
} from '@number-strategy-jump/arena-match';
import {
  createProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import {
  createHumanMatchStudyDefinition,
  createHumanMatchStudyRecord,
  type HumanMatchStudyDefinition,
} from '@number-strategy-jump/arena-human-match-study';

const replayMatch = createReplayMatch(createArenaV1MatchCore);
const OPTION_KEYS = new Set(['definition', 'record', 'matchIndex', 'replay']);

export interface HumanMatchStudyReplayVerification {
  readonly recordId: string;
  readonly assignmentId: string;
  readonly participantId: string;
  readonly armId: string;
  readonly difficultyId: BotDifficultyId;
  readonly matchIndex: number;
  readonly matchSeed: number;
  readonly replayHash: string;
  readonly finalHash: string;
  readonly authorityHash: string;
  readonly endedAtTick: number;
}

function normalizeOptions(value: unknown): Readonly<{
  definition: unknown;
  record: unknown;
  matchIndex: unknown;
  replay: unknown;
}> {
  assertKnownKeys(value, OPTION_KEYS, 'verifyHumanMatchStudyReplay options');
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const read = (key: string): unknown => {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new TypeError(`verifyHumanMatchStudyReplay options.${key} 必须是数据字段。`);
    }
    return descriptor.value;
  };
  return Object.freeze({
    definition: read('definition'),
    record: read('record'),
    matchIndex: read('matchIndex'),
    replay: read('replay'),
  });
}

function assertCandidateIdentity(definition: HumanMatchStudyDefinition): void {
  const balanceHash = createDeterministicDataHash(
    ARENA_V1_BALANCE_DEFINITION,
    'Arena V1 balance definition',
  );
  const profilesHash = createDeterministicDataHash(
    BOT_DIFFICULTY_PROFILES,
    'Arena Bot difficulty profiles',
  );
  if (
    definition.candidate.balanceDefinitionId !== ARENA_V1_BALANCE_DEFINITION.id
    || definition.candidate.balanceDefinitionHash !== balanceHash
    || definition.candidate.botDifficultyProfilesHash !== profilesHash
  ) throw new RangeError('Human Match Study candidate 与当前 Product/Bot 内容不一致。');
}

function sameResult(left: unknown, right: unknown): boolean {
  return createDeterministicDataHash(left, 'Human Match Study stored result')
    === createDeterministicDataHash(right, 'Human Match Study replay result');
}

function expectedProductConfigHash(replay: ArenaReplay): string {
  const core = createArenaV1MatchCore({
    seed: replay.matchSeed,
    config: {
      ...ARENA_V1_BALANCE_DEFINITION.matchConfig,
      contentSelection: replay.config?.contentSelection,
    },
  });
  try {
    return core.configHash;
  } finally {
    core.destroy();
  }
}

function createBotVerifier(replay: ArenaReplay, difficultyId: BotDifficultyId) {
  const assignment = createMatchAssignment({ matchSeed: replay.matchSeed });
  if (
    assignment.selectedDifficultyId !== difficultyId
    || assignment.effectiveDifficultyId !== difficultyId
  ) throw new RangeError('Human Match Study replay seed 没有天然选择预注册隐藏难度。');
  const probeCore = createArenaV1MatchCore({ seed: replay.matchSeed, config: replay.config });
  let arena: typeof probeCore.config.arena;
  let characterRadius: number;
  let maximumStepHeight: number;
  try {
    const character = probeCore.getCharacterDefinition('player-2');
    arena = probeCore.config.arena;
    characterRadius = character.collision.radius;
    maximumStepHeight = character.movement.automaticStepHeight;
  } finally {
    probeCore.destroy();
  }
  let controller: BotController | null = new BotController({
    participantId: 'player-2',
    difficultyId,
    behaviorSeed: assignment.seeds.botBehavior,
    personalitySeed: assignment.seeds.botPersonality,
    arena,
    characterRadius,
    maximumStepHeight,
  });
  return Object.freeze({
    assignment,
    verify({ snapshot, frames }: ReplayBeforeStepContext): void {
      if (!controller) throw new Error('Human Match Study Bot verifier 已销毁。');
      const recorded = frames.find(({ participantId }) => participantId === 'player-2');
      if (!recorded) throw new RangeError(`Human Match Study tick ${snapshot.tick} 缺少 Bot 输入。`);
      const expected = controller.createInput(snapshot);
      if (
        createDeterministicDataHash(recorded, 'recorded Human Match Study Bot input')
        !== createDeterministicDataHash(expected, 'expected Human Match Study Bot input')
      ) throw new RangeError(`Human Match Study Bot 输入在 tick ${snapshot.tick} 不匹配。`);
    },
    destroy(): void {
      if (!controller) return;
      controller.destroy();
      controller = null;
    },
  });
}

export function verifyHumanMatchStudyReplay(optionsValue: unknown): HumanMatchStudyReplayVerification {
  const options = normalizeOptions(optionsValue);
  const definitionValue = options.definition;
  const recordValue = options.record;
  const replayValue = options.replay;
  const definition = createHumanMatchStudyDefinition(definitionValue);
  assertCandidateIdentity(definition);
  const record = createHumanMatchStudyRecord(definition, recordValue);
  if (!Number.isSafeInteger(options.matchIndex) || (options.matchIndex as number) < 0) {
    throw new RangeError('Human Match Study replay matchIndex 必须是非负安全整数。');
  }
  const matchIndex = options.matchIndex as number;
  const match = record.matches[matchIndex];
  if (!match || match.matchIndex !== matchIndex) {
    throw new RangeError(`Human Match Study record 不包含 match ${matchIndex}。`);
  }
  const replay = validateArenaReplay(replayValue);
  if (replay.replaySchemaVersion !== definition.candidate.replaySchemaVersion) {
    throw new RangeError('Human Match Study replay schema 与 Definition 不一致。');
  }
  if (replay.matchSeed !== match.result.matchSeed) {
    throw new RangeError('Human Match Study replay seed 与 Record 不一致。');
  }
  if (replay.configHash !== expectedProductConfigHash(replay)) {
    throw new RangeError('Human Match Study replay 没有使用冻结的 Product Match config。');
  }
  const botVerifier = createBotVerifier(replay, record.assignment.difficultyId);
  let replayed: ReplayMatchResult | null = null;
  let replayFailure: Error | null = null;
  try {
    replayed = replayMatch(replay, {
      beforeStep: (step) => botVerifier.verify(step),
    });
  } catch (error) {
    replayFailure = normalizeThrownError(error, 'Human Match Study replay 复验失败');
  }
  const cleanupErrors: Error[] = [];
  try {
    botVerifier.destroy();
  } catch (error) {
    cleanupErrors.push(normalizeThrownError(error, 'Human Match Study Bot verifier 清理失败'));
  }
  if (replayFailure) {
    throw combineCleanupFailure(
      replayFailure,
      cleanupErrors,
      'Human Match Study replay 复验失败且清理未完成。',
    );
  }
  if (cleanupErrors[0]) throw cleanupErrors[0];
  if (!replayed) {
    throw new Error('Human Match Study replay 复验未返回结果。');
  }
  const result = createProductMatchResult({
    matchSeed: replay.matchSeed,
    opponent: botVerifier.assignment.opponent,
    content: replay.config.contentSelection,
    replay,
  });
  if (!sameResult(result, match.result)) {
    throw new RangeError('Human Match Study replay 重建的 Product 结果与 Record 不一致。');
  }
  return Object.freeze({
    recordId: record.recordId,
    assignmentId: record.assignment.assignmentId,
    participantId: record.assignment.participantId,
    armId: record.assignment.armId,
    difficultyId: record.assignment.difficultyId,
    matchIndex,
    matchSeed: replay.matchSeed,
    replayHash: createDeterministicDataHash(replay, 'Human Match Study replay evidence'),
    finalHash: replayed.finalHash,
    authorityHash: result.authorityHash,
    endedAtTick: result.authorityResult.endedAtTick,
  });
}
