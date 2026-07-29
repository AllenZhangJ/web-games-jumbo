import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  combineCleanupFailure,
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_V2_SURVIVAL_SUPPLY_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import {
  assertBotProfileRegistry,
  BotController,
  type BotProfileRegistryContract,
} from '@number-strategy-jump/arena-bot';
import {
  LocalMatchSession,
  type LocalMatchPublicInfo,
} from '@number-strategy-jump/arena-session';
import type { MatchCore } from '@number-strategy-jump/arena-match';
import type { EquipmentSupplySpawnSpec } from '@number-strategy-jump/arena-equipment';
import {
  createArenaV2SurvivalSupplyMatchCore,
  type ArenaV2SurvivalSupplyMatchCoreOptions,
} from './arena-v2-survival-supply-match-core.js';

const OPTION_KEYS = new Set([
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
  'supply',
  'bot',
  'playerParticipantId',
  'publicMatchInfo',
]);
const CORE_OPTION_KEYS = [
  'seed',
  'config',
  'physicsFactory',
  'ruleEngineFactory',
  'mapSystemFactory',
  'characterRegistry',
  'supply',
] as const;
const BOT_KEYS = new Set([
  'participantId',
  'difficultyId',
  'behaviorSeed',
  'personalitySeed',
  'profileRegistry',
]);
const SUPPLY_KEYS = new Set(['supplyDefinitionId', 'spawnSpecs']);

export interface ArenaV2SurvivalSupplyBotCompositionOptions
  extends ArenaV2SurvivalSupplyMatchCoreOptions {
  readonly bot: {
    readonly participantId: string;
    readonly difficultyId: string;
    readonly behaviorSeed: number;
    readonly personalitySeed: number;
    readonly profileRegistry: BotProfileRegistryContract;
  };
  readonly playerParticipantId?: string;
  readonly publicMatchInfo: LocalMatchPublicInfo;
}

function readDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function cleanupComposition(
  controller: BotController | null,
  core: MatchCore | null,
  error: unknown,
): never {
  const cleanupErrors: Error[] = [];
  if (controller !== null) {
    try {
      controller.destroy();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'survival BotController 清理失败'));
    }
  }
  if (core !== null) {
    try {
      core.destroy();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'survival MatchCore 清理失败'));
    }
  }
  throw combineCleanupFailure(
    normalizeThrownError(error, 'Arena V2 survival Bot composition 创建失败'),
    cleanupErrors,
    'Arena V2 survival Bot composition 创建失败且清理未完整完成。',
  );
}

/**
 * Creates the production survival Core + read-only Bot input composition.
 * The Bot receives only LocalMatchSession snapshots and returns an InputFrame;
 * it never receives EquipmentSystem or supply lifecycle authority.
 */
export function createArenaV2SurvivalSupplyBotSession(
  options: ArenaV2SurvivalSupplyBotCompositionOptions,
): LocalMatchSession;
export function createArenaV2SurvivalSupplyBotSession(options: unknown): LocalMatchSession;
export function createArenaV2SurvivalSupplyBotSession(options: unknown): LocalMatchSession {
  assertKnownKeys(options, OPTION_KEYS, 'Arena V2 survival Bot composition');
  const record = assertPlainRecord(options, 'Arena V2 survival Bot composition');
  const bot = assertPlainRecord(
    readDataProperty(record, 'bot', 'Arena V2 survival Bot composition'),
    'Arena V2 survival Bot composition.bot',
  );
  assertKnownKeys(bot, BOT_KEYS, 'Arena V2 survival Bot composition.bot');

  const botParticipantId = assertNonEmptyString(
    readDataProperty(bot, 'participantId', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.participantId',
  );
  const playerParticipantId = assertNonEmptyString(
    readOptionalDataProperty(record, 'playerParticipantId', 'Arena V2 survival Bot composition')
      ?? 'player-1',
    'Arena V2 survival Bot composition.playerParticipantId',
  );
  if (playerParticipantId === botParticipantId) {
    throw new RangeError('survival Bot 与 player 不能使用同一 participantId。');
  }
  const difficultyId = assertNonEmptyString(
    readDataProperty(bot, 'difficultyId', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.difficultyId',
  );
  const behaviorSeed = uint32(
    readDataProperty(bot, 'behaviorSeed', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.behaviorSeed',
  );
  const personalitySeed = uint32(
    readDataProperty(bot, 'personalitySeed', 'Arena V2 survival Bot composition.bot'),
    'Arena V2 survival Bot composition.bot.personalitySeed',
  );
  const profileRegistry = assertBotProfileRegistry(
    readDataProperty(bot, 'profileRegistry', 'Arena V2 survival Bot composition.bot'),
  );
  profileRegistry.require(difficultyId);
  const publicMatchInfo = readDataProperty(
    record,
    'publicMatchInfo',
    'Arena V2 survival Bot composition',
  ) as LocalMatchPublicInfo;
  const frozenSupply = assertPlainRecord(
    cloneFrozenData(
      readDataProperty(record, 'supply', 'Arena V2 survival Bot composition'),
      'Arena V2 survival Bot composition.supply',
    ),
    'Arena V2 survival Bot composition.supply',
  );
  assertKnownKeys(frozenSupply, SUPPLY_KEYS, 'Arena V2 survival Bot composition.supply');
  if (frozenSupply.supplyDefinitionId !== ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id) {
    throw new RangeError('survival Bot composition 只能使用正式 survival supply Definition。');
  }
  if (!Array.isArray(frozenSupply.spawnSpecs)) {
    throw new TypeError('Arena V2 survival Bot composition.supply.spawnSpecs 必须是数组。');
  }
  const spawnSpecs = frozenSupply.spawnSpecs as readonly EquipmentSupplySpawnSpec[];

  const coreOptions: Record<string, unknown> = {};
  for (const key of CORE_OPTION_KEYS) {
    if (key === 'supply') {
      coreOptions[key] = frozenSupply;
      continue;
    }
    const value = readOptionalDataProperty(record, key, 'Arena V2 survival Bot composition');
    if (value !== undefined) coreOptions[key] = value;
  }

  let core: MatchCore | null = null;
  let controller: BotController | null = null;
  try {
    core = createArenaV2SurvivalSupplyMatchCore(coreOptions);
    if (
      !core.config.participantIds.includes(playerParticipantId)
      || !core.config.participantIds.includes(botParticipantId)
    ) {
      throw new RangeError('survival Bot/player participantId 不在 MatchCore 组合中。');
    }
    const botCharacter = core.getCharacterDefinition(botParticipantId);
    controller = new BotController({
      participantId: botParticipantId,
      difficultyId,
      behaviorSeed,
      personalitySeed,
      profileRegistry,
      requireActiveSupplyProjection: true,
      supplyProjectionContract: {
        supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
        firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.firstSpawnTick,
        spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnIntervalTicks,
        spawnCount: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.spawnCount,
        lifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.lifetimeTicks,
        spawnSpecs,
        equipmentDefinitionIds: [...new Set(spawnSpecs.map(({ equipmentDefinitionId }) => (
          equipmentDefinitionId
        )))],
      },
      arena: core.config.arena,
      characterRadius: botCharacter.collision.radius,
      maximumStepHeight: botCharacter.movement.automaticStepHeight,
    });
    const session = new LocalMatchSession({
      core,
      botController: controller,
      playerParticipantId,
      botParticipantId,
      publicMatchInfo,
    });
    core = null;
    controller = null;
    return session;
  } catch (error) {
    return cleanupComposition(controller, core, error);
  }
}
