import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
} from './definition-utils.js';
import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
  createArenaWeaponFeedbackSemanticEventV1,
  type ArenaWeaponFeedbackSemanticFallCauseV1,
  type ArenaWeaponFeedbackSemanticKindV1,
} from './weapon-feedback-semantic-v1.js';
import {
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
} from './arena-mode-rule-constants-v1.js';

export const ARENA_MATCH_EVENT_V6 = Object.freeze({
  MATCH_STARTED: 'MatchStarted',
  ACTION_STARTED: 'ActionStarted',
  WEAPON_FEEDBACK_RESOLVED: 'WeaponFeedbackResolved',
  PARTICIPANT_FELL: 'ParticipantFell',
  PARTICIPANT_RESPAWN_SCHEDULED: 'ParticipantRespawnScheduled',
  PARTICIPANT_RESPAWNED: 'ParticipantRespawned',
  RACE_SAFE_ANCHOR_COMMITTED: 'RaceSafeAnchorCommitted',
  RACE_FINISH_CLAIMED: 'RaceFinishClaimed',
  SURVIVAL_ENEMY_SLOT_CHANGED: 'SurvivalEnemySlotChanged',
  SURVIVAL_PLAYER_FALL_COUNTED: 'SurvivalPlayerFallCounted',
  MATCH_ENDED: 'MatchEnded',
} as const);

export const ARENA_MATCH_EVENT_V6_ACTION_SOURCE = Object.freeze({
  BASE_ACTION: 'base-action',
  EQUIPMENT: 'equipment',
} as const);

export const ARENA_MATCH_EVENT_V6_FALL_CAUSE = Object.freeze({
  CREDITED_HIT: 'credited-hit',
  MOVEMENT: 'movement',
  ENVIRONMENT: 'environment',
} as const);

export const ARENA_MATCH_EVENT_V6_RESPAWN_REASON = Object.freeze({
  RACE_FALL: 'race-fall',
  SURVIVAL_FIRST_FALL: 'survival-first-fall',
} as const);

export const ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON = Object.freeze({
  PRESSURE_STAGE: 'pressure-stage',
  REACTIVATION_READY: 'reactivation-ready',
  FELL: 'fell',
} as const);

export const ARENA_MATCH_EVENT_V6_MODE_ROLE = Object.freeze({
  COMPETITOR: 'competitor',
  PLAYER: 'player',
  ENEMY: 'enemy',
} as const);

export const ARENA_MODE_RESULT_V3_KIND = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

type EventType = typeof ARENA_MATCH_EVENT_V6[keyof typeof ARENA_MATCH_EVENT_V6];
type ActionSource = typeof ARENA_MATCH_EVENT_V6_ACTION_SOURCE[
  keyof typeof ARENA_MATCH_EVENT_V6_ACTION_SOURCE
];
type FallCause = typeof ARENA_MATCH_EVENT_V6_FALL_CAUSE[
  keyof typeof ARENA_MATCH_EVENT_V6_FALL_CAUSE
];
type RespawnReason = typeof ARENA_MATCH_EVENT_V6_RESPAWN_REASON[
  keyof typeof ARENA_MATCH_EVENT_V6_RESPAWN_REASON
];
type SlotChangeReason = typeof ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON[
  keyof typeof ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON
];
type ModeRole = typeof ARENA_MATCH_EVENT_V6_MODE_ROLE[
  keyof typeof ARENA_MATCH_EVENT_V6_MODE_ROLE
];

export interface ArenaMatchEventV6Envelope {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: EventType;
}

export interface DuelModeResultV3Payload {
  readonly kind: 'duel';
  readonly winnerParticipantIds: readonly string[];
  readonly isDraw: boolean;
  readonly reason:
    | 'last-participant-standing'
    | 'simultaneous-elimination'
    | 'timeout-score'
    | 'timeout-draw';
  readonly endedAtTick: number;
}

export interface RaceModeResultV3Ranking {
  readonly participantId: string;
  readonly rank: number;
  readonly finishTick: number | null;
  readonly progressOrdinal: number;
}

export interface RaceModeResultV3Payload {
  readonly kind: 'race';
  readonly winnerParticipantIds: readonly string[];
  readonly rankings: readonly RaceModeResultV3Ranking[];
  readonly reason: 'finish-claimed' | 'no-finisher';
  readonly endedAtTick: number;
}

export interface SurvivalModeResultV3Payload {
  readonly kind: 'survival';
  readonly playerParticipantId: string;
  readonly survivedTicks: number;
  readonly pressureStage: number;
  readonly fallCount: number;
  readonly reason: 'terminal-player-fall' | 'survival-time-cap';
  readonly endedAtTick: number;
}

export type ModeResultV3Payload =
  | DuelModeResultV3Payload
  | RaceModeResultV3Payload
  | SurvivalModeResultV3Payload;

export interface MatchStartedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'MatchStarted';
  readonly modeDefinitionId: string;
  readonly participantIds: readonly string[];
}

export interface ActionStartedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'ActionStarted';
  readonly participantId: string;
  readonly action: string;
  readonly sourceKind: ActionSource;
  readonly equipmentInstanceId: string | null;
  readonly runtimeEquipmentDefinitionId: string | null;
  readonly collectionEquipmentDefinitionId: string | null;
  readonly survivalLevel: number | null;
}

export interface WeaponFeedbackResolvedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'WeaponFeedbackResolved';
  readonly kind: ArenaWeaponFeedbackSemanticKindV1;
  readonly attackerId: string | null;
  readonly targetId: string | null;
  readonly actionDefinitionId: string | null;
  readonly actionStartedTick: number | null;
  readonly firstHitTick: number | null;
  readonly targetFallTick: number | null;
  readonly initialSupportSurfaceId: string | null;
  readonly finalSupportSurfaceId: string | null;
  readonly fallCause: ArenaWeaponFeedbackSemanticFallCauseV1 | null;
  readonly creditedAttackerId: string | null;
}

export interface ParticipantFellEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'ParticipantFell';
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly modeRole: ModeRole;
  readonly slotId: string | null;
  readonly slotGeneration: number;
  readonly fallCause: FallCause;
  readonly creditedAttackerId: string | null;
  readonly supportSurfaceId: string | null;
}

export interface ParticipantRespawnScheduledEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'ParticipantRespawnScheduled';
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly modeRole: 'competitor' | 'player';
  readonly slotId: null;
  readonly slotGeneration: number;
  readonly readyTick: number;
  readonly anchorId: string;
  readonly reason: RespawnReason;
}

export interface ParticipantRespawnedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'ParticipantRespawned';
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly modeRole: 'competitor' | 'player';
  readonly slotId: null;
  readonly slotGeneration: number;
  readonly anchorId: string;
  readonly invulnerableTicks: number;
}

export interface RaceSafeAnchorCommittedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'RaceSafeAnchorCommitted';
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly anchorId: string;
  readonly progressOrdinal: number;
}

export interface RaceFinishClaimedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'RaceFinishClaimed';
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly finishTick: number;
  readonly progressOrdinal: number;
}

export interface SurvivalEnemySlotChangedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'SurvivalEnemySlotChanged';
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly slotId: string;
  readonly previousGeneration: number;
  readonly generation: number;
  readonly active: boolean;
  readonly anchorId: string | null;
  readonly reason: SlotChangeReason;
}

export interface SurvivalPlayerFallCountedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'SurvivalPlayerFallCounted';
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly fallCount: number;
  readonly terminalFallCount: 2;
  readonly terminal: boolean;
}

export interface MatchEndedEventV6 extends ArenaMatchEventV6Envelope {
  readonly type: 'MatchEnded';
  readonly modeDefinitionId: string;
  readonly modeResult: ModeResultV3Payload;
}

export type ArenaMatchEventV6 =
  | MatchStartedEventV6
  | ActionStartedEventV6
  | WeaponFeedbackResolvedEventV6
  | ParticipantFellEventV6
  | ParticipantRespawnScheduledEventV6
  | ParticipantRespawnedEventV6
  | RaceSafeAnchorCommittedEventV6
  | RaceFinishClaimedEventV6
  | SurvivalEnemySlotChangedEventV6
  | SurvivalPlayerFallCountedEventV6
  | MatchEndedEventV6;

const ENVELOPE_KEYS = ['id', 'sequence', 'tick', 'type'] as const;
const MATCH_STARTED_KEYS = keySet(...ENVELOPE_KEYS, 'modeDefinitionId', 'participantIds');
const ACTION_STARTED_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'participantId',
  'action',
  'sourceKind',
  'equipmentInstanceId',
  'runtimeEquipmentDefinitionId',
  'collectionEquipmentDefinitionId',
  'survivalLevel',
);
const WEAPON_FEEDBACK_RESOLVED_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'kind',
  'attackerId',
  'targetId',
  'actionDefinitionId',
  'actionStartedTick',
  'firstHitTick',
  'targetFallTick',
  'initialSupportSurfaceId',
  'finalSupportSurfaceId',
  'fallCause',
  'creditedAttackerId',
);
const FELL_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'modeDefinitionId',
  'participantId',
  'modeRole',
  'slotId',
  'slotGeneration',
  'fallCause',
  'creditedAttackerId',
  'supportSurfaceId',
);
const RESPAWN_SCHEDULED_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'modeDefinitionId',
  'participantId',
  'modeRole',
  'slotId',
  'slotGeneration',
  'readyTick',
  'anchorId',
  'reason',
);
const RESPAWNED_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'modeDefinitionId',
  'participantId',
  'modeRole',
  'slotId',
  'slotGeneration',
  'anchorId',
  'invulnerableTicks',
);
const SAFE_ANCHOR_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'modeDefinitionId',
  'participantId',
  'anchorId',
  'progressOrdinal',
);
const FINISH_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'modeDefinitionId',
  'participantId',
  'finishTick',
  'progressOrdinal',
);
const SLOT_CHANGED_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'modeDefinitionId',
  'participantId',
  'slotId',
  'previousGeneration',
  'generation',
  'active',
  'anchorId',
  'reason',
);
const FALL_COUNTED_KEYS = keySet(
  ...ENVELOPE_KEYS,
  'modeDefinitionId',
  'participantId',
  'fallCount',
  'terminalFallCount',
  'terminal',
);
const MATCH_ENDED_KEYS = keySet(...ENVELOPE_KEYS, 'modeDefinitionId', 'modeResult');
const DUEL_RESULT_KEYS = keySet(
  'kind', 'winnerParticipantIds', 'isDraw', 'reason', 'endedAtTick',
);
const RACE_RESULT_KEYS = keySet(
  'kind', 'winnerParticipantIds', 'rankings', 'reason', 'endedAtTick',
);
const RACE_RANKING_KEYS = keySet(
  'participantId', 'rank', 'finishTick', 'progressOrdinal',
);
const SURVIVAL_RESULT_KEYS = keySet(
  'kind', 'playerParticipantId', 'survivedTicks', 'pressureStage', 'fallCount',
  'reason', 'endedAtTick',
);

const EVENT_TYPES: ReadonlySet<unknown> = new Set(Object.values(ARENA_MATCH_EVENT_V6));
const ACTION_SOURCES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_MATCH_EVENT_V6_ACTION_SOURCE),
);
const FALL_CAUSES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_MATCH_EVENT_V6_FALL_CAUSE),
);
const RESPAWN_REASONS: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_MATCH_EVENT_V6_RESPAWN_REASON),
);
const SLOT_REASONS: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON),
);
const MODE_ROLES: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_MATCH_EVENT_V6_MODE_ROLE),
);
const DUEL_RESULT_REASONS: ReadonlySet<unknown> = new Set([
  'last-participant-standing',
  'simultaneous-elimination',
  'timeout-score',
  'timeout-draw',
]);
const RACE_RESULT_REASONS: ReadonlySet<unknown> = new Set(['finish-claimed', 'no-finisher']);
const SURVIVAL_RESULT_REASONS: ReadonlySet<unknown> = new Set([
  'terminal-player-fall',
  'survival-time-cap',
]);

function keySet(...keys: string[]): ReadonlySet<string> {
  return new Set(keys);
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function safeTick(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function literal<T extends string>(
  value: unknown,
  allowed: ReadonlySet<unknown>,
  name: string,
): T {
  if (!allowed.has(value)) throw new RangeError(`${name} 不受支持。`);
  return value as T;
}

function sortedUniqueIds(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const ids = value.map((item, index) => assertNonEmptyString(item, `${name}[${index}]`));
  for (let index = 1; index < ids.length; index += 1) {
    if (ids[index - 1]! >= ids[index]!) {
      throw new RangeError(`${name} 必须唯一且按字符串稳定升序排序。`);
    }
  }
  return Object.freeze(ids);
}

function envelope(
  source: Record<string, unknown>,
  expectedType: EventType,
  keys: ReadonlySet<string>,
  name: string,
): ArenaMatchEventV6Envelope {
  exactRecord(source, keys, name);
  if (source.type !== expectedType || !EVENT_TYPES.has(source.type)) {
    throw new RangeError(`${name}.type 必须是 ${expectedType}。`);
  }
  return Object.freeze({
    id: assertNonEmptyString(source.id, `${name}.id`),
    sequence: safeTick(source.sequence, `${name}.sequence`),
    tick: safeTick(source.tick, `${name}.tick`),
    type: expectedType,
  });
}

function modeReference(source: Record<string, unknown>, name: string): string {
  return assertNonEmptyString(source.modeDefinitionId, `${name}.modeDefinitionId`);
}

export function createModeResultV3Payload(value: unknown): DeepReadonly<ModeResultV3Payload> {
  const source = cloneFrozenData(value, 'ModeResultV3Payload');
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('ModeResultV3Payload 必须是普通对象。');
  }
  const record = source as Record<string, unknown>;
  if (record.kind === ARENA_MODE_RESULT_V3_KIND.DUEL) {
    exactRecord(record, DUEL_RESULT_KEYS, 'DuelModeResultV3Payload');
    const winnerParticipantIds = sortedUniqueIds(
      record.winnerParticipantIds,
      'DuelModeResultV3Payload.winnerParticipantIds',
    );
    if (winnerParticipantIds.length > 1) {
      throw new RangeError('DuelModeResultV3Payload 最多一个winner。');
    }
    if (typeof record.isDraw !== 'boolean'
      || record.isDraw !== (winnerParticipantIds.length === 0)) {
      throw new RangeError('DuelModeResultV3Payload winner/isDraw 不一致。');
    }
    const reason = literal<DuelModeResultV3Payload['reason']>(
      record.reason,
      DUEL_RESULT_REASONS,
      'DuelModeResultV3Payload.reason',
    );
    if ((reason === 'simultaneous-elimination' || reason === 'timeout-draw')
      !== record.isDraw) {
      throw new RangeError('DuelModeResultV3Payload reason与draw不一致。');
    }
    return Object.freeze({
      kind: ARENA_MODE_RESULT_V3_KIND.DUEL,
      winnerParticipantIds,
      isDraw: record.isDraw,
      reason,
      endedAtTick: safeTick(record.endedAtTick, 'DuelModeResultV3Payload.endedAtTick'),
    });
  }
  if (record.kind === ARENA_MODE_RESULT_V3_KIND.RACE) {
    exactRecord(record, RACE_RESULT_KEYS, 'RaceModeResultV3Payload');
    const endedAtTick = safeTick(
      record.endedAtTick,
      'RaceModeResultV3Payload.endedAtTick',
    );
    const winnerParticipantIds = sortedUniqueIds(
      record.winnerParticipantIds,
      'RaceModeResultV3Payload.winnerParticipantIds',
    );
    const rankingValues = record.rankings;
    if (!Array.isArray(rankingValues) || rankingValues.length < 2 || rankingValues.length > 4) {
      throw new RangeError('RaceModeResultV3Payload.rankings 必须包含2-4人。');
    }
    const seen = new Set<string>();
    const rankings = rankingValues.map((value, index): RaceModeResultV3Ranking => {
      const name = `RaceModeResultV3Payload.rankings[${index}]`;
      exactRecord(value, RACE_RANKING_KEYS, name);
      const participantId = assertNonEmptyString(value.participantId, `${name}.participantId`);
      if (seen.has(participantId)) throw new RangeError(`${name}.participantId 重复。`);
      seen.add(participantId);
      const finishTick = value.finishTick === null
        ? null
        : safeTick(value.finishTick, `${name}.finishTick`);
      if (finishTick !== null && finishTick > endedAtTick) {
        throw new RangeError(`${name}.finishTick 不能晚于 endedAtTick。`);
      }
      const rank = assertIntegerAtLeast(value.rank, 1, `${name}.rank`);
      if (rank > rankingValues.length) {
        throw new RangeError(`${name}.rank 不能超过参与排名人数。`);
      }
      return Object.freeze({
        participantId,
        rank,
        finishTick,
        progressOrdinal: safeTick(value.progressOrdinal, `${name}.progressOrdinal`),
      });
    });
    for (let index = 1; index < rankings.length; index += 1) {
      if (rankings[index - 1]!.participantId >= rankings[index]!.participantId) {
        throw new RangeError('RaceModeResultV3Payload.rankings 必须按participantId排序。');
      }
    }
    const reason = literal<RaceModeResultV3Payload['reason']>(
      record.reason,
      RACE_RESULT_REASONS,
      'RaceModeResultV3Payload.reason',
    );
    const rankOneFinishers = rankings
      .filter(({ rank, finishTick }) => rank === 1 && finishTick !== null)
      .map(({ participantId }) => participantId)
      .sort();
    if (
      winnerParticipantIds.length !== rankOneFinishers.length
      || winnerParticipantIds.some((id, index) => id !== rankOneFinishers[index])
    ) {
      throw new RangeError('RaceModeResultV3Payload winner必须等于有效rank 1 finishers。');
    }
    if (reason === 'no-finisher' && (
      winnerParticipantIds.length !== 0
      || rankings.some(({ finishTick }) => finishTick !== null)
    )) {
      throw new RangeError('Race no-finisher不能包含finish或winner。');
    }
    if (reason === 'finish-claimed' && winnerParticipantIds.length === 0) {
      throw new RangeError('Race finish-claimed必须包含winner。');
    }
    return Object.freeze({
      kind: ARENA_MODE_RESULT_V3_KIND.RACE,
      winnerParticipantIds,
      rankings: Object.freeze(rankings),
      reason,
      endedAtTick,
    });
  }
  if (record.kind === ARENA_MODE_RESULT_V3_KIND.SURVIVAL) {
    exactRecord(record, SURVIVAL_RESULT_KEYS, 'SurvivalModeResultV3Payload');
    const fallCount = assertIntegerAtLeast(
      record.fallCount,
      0,
      'SurvivalModeResultV3Payload.fallCount',
    );
    if (fallCount > 2) throw new RangeError('SurvivalModeResultV3Payload.fallCount 不能超过2。');
    const reason = literal<SurvivalModeResultV3Payload['reason']>(
      record.reason,
      SURVIVAL_RESULT_REASONS,
      'SurvivalModeResultV3Payload.reason',
    );
    if (reason === 'terminal-player-fall' && fallCount !== 2) {
      throw new RangeError('Survival terminal-player-fall必须以fallCount=2结束。');
    }
    const survivedTicks = safeTick(
      record.survivedTicks,
      'SurvivalModeResultV3Payload.survivedTicks',
    );
    const endedAtTick = safeTick(
      record.endedAtTick,
      'SurvivalModeResultV3Payload.endedAtTick',
    );
    if (survivedTicks > endedAtTick) {
      throw new RangeError('Survival survivedTicks 不能超过 endedAtTick。');
    }
    return Object.freeze({
      kind: ARENA_MODE_RESULT_V3_KIND.SURVIVAL,
      playerParticipantId: assertNonEmptyString(
        record.playerParticipantId,
        'SurvivalModeResultV3Payload.playerParticipantId',
      ),
      survivedTicks,
      pressureStage: safeTick(
        record.pressureStage,
        'SurvivalModeResultV3Payload.pressureStage',
      ),
      fallCount,
      reason,
      endedAtTick,
    });
  }
  throw new RangeError(`ModeResultV3Payload.kind 不受支持：${String(record.kind)}。`);
}

function createMatchStarted(source: Record<string, unknown>): MatchStartedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.MATCH_STARTED,
    MATCH_STARTED_KEYS,
    'MatchStartedEventV6',
  );
  const participantIds = sortedUniqueIds(
    source.participantIds,
    'MatchStartedEventV6.participantIds',
  );
  if (participantIds.length < 2 || participantIds.length > 17) {
    throw new RangeError('MatchStartedEventV6.participantIds 必须包含2-17项。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
    modeDefinitionId: modeReference(source, 'MatchStartedEventV6'),
    participantIds,
  });
}

function createActionStarted(source: Record<string, unknown>): ActionStartedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.ACTION_STARTED,
    ACTION_STARTED_KEYS,
    'ActionStartedEventV6',
  );
  const sourceKind = literal<ActionSource>(
    source.sourceKind,
    ACTION_SOURCES,
    'ActionStartedEventV6.sourceKind',
  );
  const equipmentInstanceId = nullableId(
    source.equipmentInstanceId,
    'ActionStartedEventV6.equipmentInstanceId',
  );
  const runtimeEquipmentDefinitionId = nullableId(
    source.runtimeEquipmentDefinitionId,
    'ActionStartedEventV6.runtimeEquipmentDefinitionId',
  );
  const collectionEquipmentDefinitionId = nullableId(
    source.collectionEquipmentDefinitionId,
    'ActionStartedEventV6.collectionEquipmentDefinitionId',
  );
  const survivalLevel = source.survivalLevel === null
    ? null
    : assertIntegerAtLeast(source.survivalLevel, 1, 'ActionStartedEventV6.survivalLevel');
  const equipmentIdentityCount = [
    equipmentInstanceId,
    runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId,
  ].filter((value) => value !== null).length;
  if (sourceKind === ARENA_MATCH_EVENT_V6_ACTION_SOURCE.BASE_ACTION
    && (equipmentIdentityCount !== 0 || survivalLevel !== null)) {
    throw new RangeError('base-action的equipment/tier字段必须全部为null。');
  }
  if (sourceKind === ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT
    && equipmentIdentityCount !== 3) {
    throw new RangeError('equipment ActionStarted必须携带完整三项装备身份。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
    participantId: assertNonEmptyString(source.participantId, 'ActionStartedEventV6.participantId'),
    action: assertNonEmptyString(source.action, 'ActionStartedEventV6.action'),
    sourceKind,
    equipmentInstanceId,
    runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId,
    survivalLevel,
  });
}

function createWeaponFeedbackResolved(
  source: Record<string, unknown>,
): WeaponFeedbackResolvedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
    WEAPON_FEEDBACK_RESOLVED_KEYS,
    'WeaponFeedbackResolvedEventV6',
  );
  const semantic = createArenaWeaponFeedbackSemanticEventV1({
    schemaVersion: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
    ...source,
  });
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
    kind: semantic.kind,
    attackerId: semantic.attackerId,
    targetId: semantic.targetId,
    actionDefinitionId: semantic.actionDefinitionId,
    actionStartedTick: semantic.actionStartedTick,
    firstHitTick: semantic.firstHitTick,
    targetFallTick: semantic.targetFallTick,
    initialSupportSurfaceId: semantic.initialSupportSurfaceId,
    finalSupportSurfaceId: semantic.finalSupportSurfaceId,
    fallCause: semantic.fallCause,
    creditedAttackerId: semantic.creditedAttackerId,
  });
}

function createParticipantFell(source: Record<string, unknown>): ParticipantFellEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
    FELL_KEYS,
    'ParticipantFellEventV6',
  );
  const modeRole = literal<ModeRole>(
    source.modeRole,
    MODE_ROLES,
    'ParticipantFellEventV6.modeRole',
  );
  const slotId = nullableId(source.slotId, 'ParticipantFellEventV6.slotId');
  const slotGeneration = safeTick(
    source.slotGeneration,
    'ParticipantFellEventV6.slotGeneration',
  );
  if (modeRole === ARENA_MATCH_EVENT_V6_MODE_ROLE.ENEMY) {
    if (slotId === null || slotGeneration < 1) {
      throw new RangeError('enemy ParticipantFell必须携带slot与正generation。');
    }
  } else if (slotId !== null || slotGeneration !== 0) {
    throw new RangeError('非enemy ParticipantFell的slot必须为null/0。');
  }
  const fallCause = literal<FallCause>(
    source.fallCause,
    FALL_CAUSES,
    'ParticipantFellEventV6.fallCause',
  );
  const creditedAttackerId = nullableId(
    source.creditedAttackerId,
    'ParticipantFellEventV6.creditedAttackerId',
  );
  if ((fallCause === ARENA_MATCH_EVENT_V6_FALL_CAUSE.CREDITED_HIT)
    !== (creditedAttackerId !== null)) {
    throw new RangeError('ParticipantFell credited-hit与attacker身份不一致。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
    modeDefinitionId: modeReference(source, 'ParticipantFellEventV6'),
    participantId: assertNonEmptyString(source.participantId, 'ParticipantFellEventV6.participantId'),
    modeRole,
    slotId,
    slotGeneration,
    fallCause,
    creditedAttackerId,
    supportSurfaceId: nullableId(source.supportSurfaceId, 'ParticipantFellEventV6.supportSurfaceId'),
  });
}

function respawnRole(value: unknown, name: string): 'competitor' | 'player' {
  if (value !== ARENA_MATCH_EVENT_V6_MODE_ROLE.COMPETITOR
    && value !== ARENA_MATCH_EVENT_V6_MODE_ROLE.PLAYER) {
    throw new RangeError(`${name} 只允许competitor/player。`);
  }
  return value;
}

function createRespawnScheduled(
  source: Record<string, unknown>,
): ParticipantRespawnScheduledEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
    RESPAWN_SCHEDULED_KEYS,
    'ParticipantRespawnScheduledEventV6',
  );
  const modeRole = respawnRole(source.modeRole, 'ParticipantRespawnScheduledEventV6.modeRole');
  if (source.slotId !== null || source.slotGeneration !== 0) {
    throw new RangeError('player/competitor respawn schedule的slot必须为null/0。');
  }
  const readyTick = safeTick(source.readyTick, 'ParticipantRespawnScheduledEventV6.readyTick');
  if (readyTick < base.tick) throw new RangeError('respawn readyTick不能早于event tick。');
  const reason = literal<RespawnReason>(
    source.reason,
    RESPAWN_REASONS,
    'ParticipantRespawnScheduledEventV6.reason',
  );
  if (modeRole === ARENA_MATCH_EVENT_V6_MODE_ROLE.COMPETITOR) {
    if (reason !== ARENA_MATCH_EVENT_V6_RESPAWN_REASON.RACE_FALL
      || readyTick - base.tick !== RACE_MODE_RESPAWN_DELAY_TICKS_V1) {
      throw new RangeError(
        `Race respawn schedule必须是race-fall与${RACE_MODE_RESPAWN_DELAY_TICKS_V1} tick。`,
      );
    }
  } else if (reason !== ARENA_MATCH_EVENT_V6_RESPAWN_REASON.SURVIVAL_FIRST_FALL) {
    throw new RangeError('Survival player respawn reason必须是survival-first-fall。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
    modeDefinitionId: modeReference(source, 'ParticipantRespawnScheduledEventV6'),
    participantId: assertNonEmptyString(
      source.participantId,
      'ParticipantRespawnScheduledEventV6.participantId',
    ),
    modeRole,
    slotId: null,
    slotGeneration: 0,
    readyTick,
    anchorId: assertNonEmptyString(source.anchorId, 'ParticipantRespawnScheduledEventV6.anchorId'),
    reason,
  });
}

function createRespawned(source: Record<string, unknown>): ParticipantRespawnedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
    RESPAWNED_KEYS,
    'ParticipantRespawnedEventV6',
  );
  if (source.slotId !== null || source.slotGeneration !== 0) {
    throw new RangeError('player/competitor respawned的slot必须为null/0。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
    modeDefinitionId: modeReference(source, 'ParticipantRespawnedEventV6'),
    participantId: assertNonEmptyString(source.participantId, 'ParticipantRespawnedEventV6.participantId'),
    modeRole: respawnRole(source.modeRole, 'ParticipantRespawnedEventV6.modeRole'),
    slotId: null,
    slotGeneration: 0,
    anchorId: assertNonEmptyString(source.anchorId, 'ParticipantRespawnedEventV6.anchorId'),
    invulnerableTicks: safeTick(
      source.invulnerableTicks,
      'ParticipantRespawnedEventV6.invulnerableTicks',
    ),
  });
}

function createSafeAnchor(source: Record<string, unknown>): RaceSafeAnchorCommittedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
    SAFE_ANCHOR_KEYS,
    'RaceSafeAnchorCommittedEventV6',
  );
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
    modeDefinitionId: modeReference(source, 'RaceSafeAnchorCommittedEventV6'),
    participantId: assertNonEmptyString(source.participantId, 'RaceSafeAnchorCommittedEventV6.participantId'),
    anchorId: assertNonEmptyString(source.anchorId, 'RaceSafeAnchorCommittedEventV6.anchorId'),
    progressOrdinal: safeTick(source.progressOrdinal, 'RaceSafeAnchorCommittedEventV6.progressOrdinal'),
  });
}

function createFinish(source: Record<string, unknown>): RaceFinishClaimedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
    FINISH_KEYS,
    'RaceFinishClaimedEventV6',
  );
  if (source.finishTick !== base.tick) {
    throw new RangeError('RaceFinishClaimedEventV6.finishTick必须等于event tick。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
    modeDefinitionId: modeReference(source, 'RaceFinishClaimedEventV6'),
    participantId: assertNonEmptyString(source.participantId, 'RaceFinishClaimedEventV6.participantId'),
    finishTick: base.tick,
    progressOrdinal: safeTick(source.progressOrdinal, 'RaceFinishClaimedEventV6.progressOrdinal'),
  });
}

function createSlotChanged(source: Record<string, unknown>): SurvivalEnemySlotChangedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED,
    SLOT_CHANGED_KEYS,
    'SurvivalEnemySlotChangedEventV6',
  );
  if (typeof source.active !== 'boolean') {
    throw new TypeError('SurvivalEnemySlotChangedEventV6.active必须是布尔值。');
  }
  const previousGeneration = safeTick(
    source.previousGeneration,
    'SurvivalEnemySlotChangedEventV6.previousGeneration',
  );
  const generation = safeTick(source.generation, 'SurvivalEnemySlotChangedEventV6.generation');
  const anchorId = nullableId(source.anchorId, 'SurvivalEnemySlotChangedEventV6.anchorId');
  const reason = literal<SlotChangeReason>(
    source.reason,
    SLOT_REASONS,
    'SurvivalEnemySlotChangedEventV6.reason',
  );
  if (source.active) {
    if (generation !== previousGeneration + 1 || anchorId === null
      || reason === ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON.FELL) {
      throw new RangeError('slot激活必须generation+1、anchor非null且使用激活reason。');
    }
  } else if (
    generation !== previousGeneration
    || anchorId !== null
    || reason !== ARENA_MATCH_EVENT_V6_SLOT_CHANGE_REASON.FELL
  ) {
    throw new RangeError('slot失活必须generation不变、anchor=null且reason=fell。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED,
    modeDefinitionId: modeReference(source, 'SurvivalEnemySlotChangedEventV6'),
    participantId: assertNonEmptyString(
      source.participantId,
      'SurvivalEnemySlotChangedEventV6.participantId',
    ),
    slotId: assertNonEmptyString(source.slotId, 'SurvivalEnemySlotChangedEventV6.slotId'),
    previousGeneration,
    generation,
    active: source.active,
    anchorId,
    reason,
  });
}

function createFallCounted(source: Record<string, unknown>): SurvivalPlayerFallCountedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED,
    FALL_COUNTED_KEYS,
    'SurvivalPlayerFallCountedEventV6',
  );
  const fallCount = assertIntegerAtLeast(
    source.fallCount,
    1,
    'SurvivalPlayerFallCountedEventV6.fallCount',
  );
  if (fallCount > 2 || source.terminalFallCount !== 2 || typeof source.terminal !== 'boolean'
    || source.terminal !== (fallCount >= 2)) {
    throw new RangeError('SurvivalPlayerFallCountedEventV6 fall/terminal合同不一致。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED,
    modeDefinitionId: modeReference(source, 'SurvivalPlayerFallCountedEventV6'),
    participantId: assertNonEmptyString(
      source.participantId,
      'SurvivalPlayerFallCountedEventV6.participantId',
    ),
    fallCount,
    terminalFallCount: 2,
    terminal: source.terminal,
  });
}

function createMatchEnded(source: Record<string, unknown>): MatchEndedEventV6 {
  const base = envelope(
    source,
    ARENA_MATCH_EVENT_V6.MATCH_ENDED,
    MATCH_ENDED_KEYS,
    'MatchEndedEventV6',
  );
  const modeResult = createModeResultV3Payload(source.modeResult);
  if (modeResult.endedAtTick !== base.tick) {
    throw new RangeError('MatchEndedEventV6 modeResult.endedAtTick必须等于event tick。');
  }
  return Object.freeze({
    ...base,
    type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
    modeDefinitionId: modeReference(source, 'MatchEndedEventV6'),
    modeResult,
  });
}

export function createArenaMatchEventV6(value: unknown): DeepReadonly<ArenaMatchEventV6> {
  const source = cloneFrozenData(value, 'ArenaMatchEventV6');
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('ArenaMatchEventV6必须是普通对象。');
  }
  const record = source as Record<string, unknown>;
  switch (record.type) {
    case ARENA_MATCH_EVENT_V6.MATCH_STARTED: return createMatchStarted(record);
    case ARENA_MATCH_EVENT_V6.ACTION_STARTED: return createActionStarted(record);
    case ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED:
      return createWeaponFeedbackResolved(record);
    case ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL: return createParticipantFell(record);
    case ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED:
      return createRespawnScheduled(record);
    case ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED: return createRespawned(record);
    case ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED: return createSafeAnchor(record);
    case ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED: return createFinish(record);
    case ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED: return createSlotChanged(record);
    case ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED: return createFallCounted(record);
    case ARENA_MATCH_EVENT_V6.MATCH_ENDED: return createMatchEnded(record);
    default: throw new RangeError(`ArenaMatchEventV6.type 不受支持：${String(record.type)}。`);
  }
}
