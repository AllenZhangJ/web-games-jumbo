import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  cloneFrozenStringSet,
  RACE_MODE_PREPARING_TICKS_V1,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
} from '@number-strategy-jump/arena-contracts';
import { MODE_KIND, type ModeKind } from './mode-definition.js';

export const MODE_POLICY_DEFINITION_SCHEMA_VERSION = 1 as const;
export const MODE_POLICY_TEST_MAXIMUM_ENEMY_SLOTS = 16 as const;
export {
  RACE_MODE_PREPARING_TICKS_V1,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
};

export const MODE_ROLE = Object.freeze({
  COMPETITOR: 'competitor',
  PLAYER: 'player',
  ENEMY: 'enemy',
} as const);

export const MODE_CONTROLLER_KIND = Object.freeze({
  HUMAN: 'human',
  BOT: 'bot',
} as const);

export const MODE_TEAM_RULE_KIND = Object.freeze({
  NONE: 'none',
  FIXED: 'fixed',
} as const);

export const MODE_SLOT_RULE_KIND = Object.freeze({
  NONE: 'none',
  FIXED: 'fixed',
} as const);

export const MODE_OBJECTIVE_KIND = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

export const MODE_FALL_DISPOSITION = Object.freeze({
  ELIMINATE: 'eliminate',
  COUNT_FOR_OBJECTIVE: 'count-for-objective',
  SCHEDULE_RESPAWN: 'schedule-respawn',
  DEACTIVATE_SLOT: 'deactivate-slot',
} as const);

export const MODE_RESPAWN_ANCHOR_POLICY_KIND = Object.freeze({
  DISABLED: 'disabled',
  LATEST_VALID_SAFE_ANCHOR: 'latest-valid-safe-anchor',
  FIXED_ANCHOR: 'fixed-anchor',
} as const);

export const MODE_RELATIONSHIP = Object.freeze({
  HOSTILE: 'hostile',
  ALLY: 'ally',
  NEUTRAL: 'neutral',
} as const);

export const MODE_RESULT_KIND = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

export const MODE_RESULT_PROJECTION_POLICY = Object.freeze({
  DUEL: 'winner-ids-draw',
  RACE: 'finish-then-progress-with-ties',
  SURVIVAL: 'ticks-stage-falls',
} as const);

export const MODE_POLICY_TYPE = Object.freeze({
  PARTICIPANT: 'participant',
  TIMELINE: 'timeline',
  OBJECTIVE: 'objective',
  ELIMINATION: 'elimination',
  RESPAWN: 'respawn',
  RELATIONSHIP: 'relationship',
  RESULT: 'result',
  SURVIVAL_PRESSURE: 'survival-pressure',
  SURVIVAL_EQUIPMENT_TIER: 'survival-equipment-tier',
} as const);

export type ModeRole = typeof MODE_ROLE[keyof typeof MODE_ROLE];
export type ModeControllerKind =
  typeof MODE_CONTROLLER_KIND[keyof typeof MODE_CONTROLLER_KIND];
export type ModeRelationship = typeof MODE_RELATIONSHIP[keyof typeof MODE_RELATIONSHIP];
export type ModePolicyType = typeof MODE_POLICY_TYPE[keyof typeof MODE_POLICY_TYPE];

export interface ModePolicyEnvelope {
  readonly schemaVersion: typeof MODE_POLICY_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly modeKind: ModeKind;
}

export type ModeTeamRule =
  | Readonly<{ readonly kind: 'none' }>
  | Readonly<{ readonly kind: 'fixed'; readonly teamId: string }>;

export type ModeSlotRule =
  | Readonly<{ readonly kind: 'none' }>
  | Readonly<{ readonly kind: 'fixed'; readonly slotIds: readonly string[] }>;

export interface ParticipantRolePolicy {
  readonly modeRole: ModeRole;
  readonly minimumCount: number;
  readonly maximumCount: number;
  readonly allowedControllerKinds: readonly ModeControllerKind[];
  readonly teamRule: ModeTeamRule;
  readonly slotRule: ModeSlotRule;
}

export interface ControllerKindBound {
  readonly controllerKind: ModeControllerKind;
  readonly minimumCount: number;
  readonly maximumCount: number;
}

export interface ParticipantPolicyDefinition extends ModePolicyEnvelope {
  readonly minimumParticipants: number;
  readonly maximumParticipants: number;
  readonly roles: readonly ParticipantRolePolicy[];
  readonly controllerKindBounds: readonly ControllerKindBound[];
}

export interface TimelinePolicyDefinitionV1 extends ModePolicyEnvelope {
  readonly preparingTicks: number;
  readonly hardLimitTicks: number;
  readonly suddenDeathStartActiveTick: number | null;
}

export const TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2 = Object.freeze({
  DEFAULT: 'default',
  SURVIVAL_ENEMY_COUNT: 'survival-enemy-count',
} as const);

export const TIMELINE_POLICY_SURVIVAL_ENEMY_COUNTS_V2 = Object.freeze([
  1, 4, 8, 12, 16,
] as const);

export type TimelinePolicySurvivalEnemyCountV2 =
  typeof TIMELINE_POLICY_SURVIVAL_ENEMY_COUNTS_V2[number];

export type TimelinePolicyVariantSelectorV2 =
  | Readonly<{ readonly kind: 'default' }>
  | Readonly<{
    readonly kind: 'survival-enemy-count';
    readonly enemyCount: TimelinePolicySurvivalEnemyCountV2;
  }>;

export interface TimelinePolicyRuntimeVariantV2 {
  readonly selector: TimelinePolicyVariantSelectorV2;
  readonly preparingTicks: number;
  readonly hardLimitActiveTicks: number;
  readonly suddenDeathStartActiveTick: number | null;
}

export interface TimelinePolicyDefinitionV2 extends ModePolicyEnvelope {
  readonly contentVersion: 2;
  readonly variants: readonly TimelinePolicyRuntimeVariantV2[];
}

export type TimelinePolicyDefinition = TimelinePolicyDefinitionV1 | TimelinePolicyDefinitionV2;

export type ModeObjective =
  | Readonly<{ readonly kind: 'duel'; readonly timeoutPolicy: 'score-or-draw' }>
  | Readonly<{
    readonly kind: 'race';
    readonly finishGateCapabilityId: string;
    readonly validClaimEndPolicy: 'claim-tick';
    readonly sameTickRankPolicy: 'shared-rank-1';
    readonly hardLimitPolicy: 'no-finisher';
  }>
  | Readonly<{
    readonly kind: 'survival';
    readonly terminalPlayerFallCount: 2;
    readonly hardLimitPolicy: 'survival-time-cap';
  }>;

export interface ObjectivePolicyDefinition extends ModePolicyEnvelope {
  readonly objective: ModeObjective;
}

export interface ModeRoleDisposition {
  readonly modeRole: ModeRole;
  readonly fallDisposition:
    typeof MODE_FALL_DISPOSITION[keyof typeof MODE_FALL_DISPOSITION];
}

export interface EliminationPolicyDefinition extends ModePolicyEnvelope {
  readonly roleDispositions: readonly ModeRoleDisposition[];
}

export type ModeRespawnAnchorPolicy =
  | Readonly<{ readonly kind: 'disabled' }>
  | Readonly<{
    readonly kind: 'latest-valid-safe-anchor';
    readonly fallbackAnchorCapabilityId: string;
  }>
  | Readonly<{ readonly kind: 'fixed-anchor'; readonly anchorCapabilityId: string }>;

export interface ModeRoleRespawnPolicy {
  readonly modeRole: ModeRole;
  readonly enabled: boolean;
  readonly delayTicks: number;
  readonly maximumRespawns: number | null;
  readonly anchorPolicy: ModeRespawnAnchorPolicy;
  readonly protectionTicks: number;
}

export interface RespawnPolicyDefinition extends ModePolicyEnvelope {
  readonly rolePolicies: readonly ModeRoleRespawnPolicy[];
}

export interface ModeRoleRelationship {
  readonly sourceRole: ModeRole;
  readonly targetRole: ModeRole;
  readonly relationship: ModeRelationship;
}

export interface RelationshipPolicyDefinition extends ModePolicyEnvelope {
  readonly selfTargeting: 'forbidden';
  readonly relations: readonly ModeRoleRelationship[];
}

export interface ResultPolicyDefinition extends ModePolicyEnvelope {
  readonly resultKind: typeof MODE_RESULT_KIND[keyof typeof MODE_RESULT_KIND];
  readonly allowedReasons: readonly string[];
  readonly projectionPolicy:
    typeof MODE_RESULT_PROJECTION_POLICY[keyof typeof MODE_RESULT_PROJECTION_POLICY];
}

export interface SurvivalPressureSlotEntry {
  readonly slotId: string;
  readonly anchorCapabilityId: string;
}

export interface SurvivalPressureStage {
  readonly stage: number;
  readonly startActiveTick: number;
  readonly desiredActiveEnemySlots: number;
  readonly reactivationDelayTicks: number;
}

export interface SurvivalPressurePolicyDefinition extends ModePolicyEnvelope {
  readonly modeKind: 'survival';
  readonly slotActivationOrder: readonly string[];
  readonly slotEntries: readonly SurvivalPressureSlotEntry[];
  readonly stages: readonly SurvivalPressureStage[];
}

export interface SurvivalEquipmentTierVariant {
  readonly collectionEquipmentDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
}

export interface SurvivalEquipmentTier {
  readonly minimumWaveIndex: number;
  readonly survivalLevel: number;
  readonly variants: readonly SurvivalEquipmentTierVariant[];
}

export interface SurvivalEquipmentTierPolicyDefinition extends ModePolicyEnvelope {
  readonly modeKind: 'survival';
  readonly supplyDefinitionId: string;
  readonly tiers: readonly SurvivalEquipmentTier[];
}

export type ModePolicyDefinition =
  | ParticipantPolicyDefinition
  | TimelinePolicyDefinition
  | ObjectivePolicyDefinition
  | EliminationPolicyDefinition
  | RespawnPolicyDefinition
  | RelationshipPolicyDefinition
  | ResultPolicyDefinition
  | SurvivalPressurePolicyDefinition
  | SurvivalEquipmentTierPolicyDefinition;

const ENVELOPE_KEYS = ['schemaVersion', 'id', 'contentVersion', 'modeKind'] as const;
const PARTICIPANT_KEYS = keySet(...ENVELOPE_KEYS,
  'minimumParticipants', 'maximumParticipants', 'roles', 'controllerKindBounds');
const TIMELINE_V1_KEYS = keySet(...ENVELOPE_KEYS,
  'preparingTicks', 'hardLimitTicks', 'suddenDeathStartActiveTick');
const TIMELINE_V2_KEYS = keySet(...ENVELOPE_KEYS, 'variants');
const OBJECTIVE_KEYS = keySet(...ENVELOPE_KEYS, 'objective');
const ELIMINATION_KEYS = keySet(...ENVELOPE_KEYS, 'roleDispositions');
const RESPAWN_KEYS = keySet(...ENVELOPE_KEYS, 'rolePolicies');
const RELATIONSHIP_KEYS = keySet(...ENVELOPE_KEYS, 'selfTargeting', 'relations');
const RESULT_KEYS = keySet(...ENVELOPE_KEYS, 'resultKind', 'allowedReasons', 'projectionPolicy');
const PRESSURE_KEYS = keySet(...ENVELOPE_KEYS, 'slotActivationOrder', 'slotEntries', 'stages');
const TIER_KEYS = keySet(...ENVELOPE_KEYS, 'supplyDefinitionId', 'tiers');

const ROLE_KEYS = keySet(
  'modeRole', 'minimumCount', 'maximumCount', 'allowedControllerKinds', 'teamRule', 'slotRule',
);
const CONTROLLER_BOUND_KEYS = keySet('controllerKind', 'minimumCount', 'maximumCount');
const TEAM_NONE_KEYS = keySet('kind');
const TEAM_FIXED_KEYS = keySet('kind', 'teamId');
const SLOT_NONE_KEYS = keySet('kind');
const SLOT_FIXED_KEYS = keySet('kind', 'slotIds');
const DUEL_OBJECTIVE_KEYS = keySet('kind', 'timeoutPolicy');
const RACE_OBJECTIVE_KEYS = keySet(
  'kind', 'finishGateCapabilityId', 'validClaimEndPolicy', 'sameTickRankPolicy',
  'hardLimitPolicy',
);
const SURVIVAL_OBJECTIVE_KEYS = keySet('kind', 'terminalPlayerFallCount', 'hardLimitPolicy');
const DISPOSITION_KEYS = keySet('modeRole', 'fallDisposition');
const RESPAWN_ROLE_KEYS = keySet(
  'modeRole', 'enabled', 'delayTicks', 'maximumRespawns', 'anchorPolicy', 'protectionTicks',
);
const ANCHOR_DISABLED_KEYS = keySet('kind');
const ANCHOR_LATEST_KEYS = keySet('kind', 'fallbackAnchorCapabilityId');
const ANCHOR_FIXED_KEYS = keySet('kind', 'anchorCapabilityId');
const RELATION_KEYS = keySet('sourceRole', 'targetRole', 'relationship');
const PRESSURE_SLOT_KEYS = keySet('slotId', 'anchorCapabilityId');
const PRESSURE_STAGE_KEYS = keySet(
  'stage', 'startActiveTick', 'desiredActiveEnemySlots', 'reactivationDelayTicks',
);
const TIER_ENTRY_KEYS = keySet('minimumWaveIndex', 'survivalLevel', 'variants');
const TIER_VARIANT_KEYS = keySet(
  'collectionEquipmentDefinitionId', 'runtimeEquipmentDefinitionId',
);
const TIMELINE_DEFAULT_SELECTOR_KEYS = keySet('kind');
const TIMELINE_SURVIVAL_SELECTOR_KEYS = keySet('kind', 'enemyCount');
const TIMELINE_RUNTIME_VARIANT_KEYS = keySet(
  'selector', 'preparingTicks', 'hardLimitActiveTicks', 'suddenDeathStartActiveTick',
);

const MODE_KINDS: ReadonlySet<unknown> = new Set(Object.values(MODE_KIND));
const MODE_ROLES: ReadonlySet<unknown> = new Set(Object.values(MODE_ROLE));
const CONTROLLER_KINDS: ReadonlySet<unknown> = new Set(Object.values(MODE_CONTROLLER_KIND));
const FALL_DISPOSITIONS: ReadonlySet<unknown> = new Set(Object.values(MODE_FALL_DISPOSITION));
const RELATIONSHIPS: ReadonlySet<unknown> = new Set(Object.values(MODE_RELATIONSHIP));

const MODE_ROLES_BY_KIND: Readonly<Record<ModeKind, readonly ModeRole[]>> = Object.freeze({
  [MODE_KIND.DUEL]: Object.freeze([MODE_ROLE.COMPETITOR]),
  [MODE_KIND.RACE]: Object.freeze([MODE_ROLE.COMPETITOR]),
  [MODE_KIND.SURVIVAL]: Object.freeze([MODE_ROLE.ENEMY, MODE_ROLE.PLAYER]),
});

const RESULT_REASONS: Readonly<Record<ModeKind, readonly string[]>> = Object.freeze({
  [MODE_KIND.DUEL]: Object.freeze([
    'last-participant-standing',
    'simultaneous-elimination',
    'timeout-draw',
    'timeout-score',
  ]),
  [MODE_KIND.RACE]: Object.freeze(['finish-claimed', 'no-finisher']),
  [MODE_KIND.SURVIVAL]: Object.freeze(['survival-time-cap', 'terminal-player-fall']),
});

const POLICY_SIGNATURES = Object.freeze([
  Object.freeze({ type: MODE_POLICY_TYPE.PARTICIPANT, key: 'minimumParticipants' }),
  Object.freeze({ type: MODE_POLICY_TYPE.TIMELINE, key: 'preparingTicks' }),
  Object.freeze({ type: MODE_POLICY_TYPE.TIMELINE, key: 'variants' }),
  Object.freeze({ type: MODE_POLICY_TYPE.OBJECTIVE, key: 'objective' }),
  Object.freeze({ type: MODE_POLICY_TYPE.ELIMINATION, key: 'roleDispositions' }),
  Object.freeze({ type: MODE_POLICY_TYPE.RESPAWN, key: 'rolePolicies' }),
  Object.freeze({ type: MODE_POLICY_TYPE.RELATIONSHIP, key: 'selfTargeting' }),
  Object.freeze({ type: MODE_POLICY_TYPE.RESULT, key: 'resultKind' }),
  Object.freeze({ type: MODE_POLICY_TYPE.SURVIVAL_PRESSURE, key: 'slotActivationOrder' }),
  Object.freeze({ type: MODE_POLICY_TYPE.SURVIVAL_EQUIPMENT_TIER, key: 'supplyDefinitionId' }),
] as const);

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

function safeIntegerAtLeast(value: unknown, minimum: number, name: string): number {
  return assertIntegerAtLeast(value, minimum, name);
}

function literal<T extends string>(
  value: unknown,
  allowed: ReadonlySet<unknown>,
  name: string,
): T {
  if (!allowed.has(value)) throw new RangeError(`${name} 不受支持。`);
  return value as T;
}

function literalValue<T extends string | number | boolean>(
  value: unknown,
  expected: T,
  name: string,
): T {
  if (value !== expected) throw new RangeError(`${name} 必须是 ${expected}。`);
  return expected;
}

function frozenArray<T>(value: unknown, name: string, cloneItem: (item: unknown, index: number) => T): readonly T[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  return Object.freeze(value.map(cloneItem));
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertUnique(values: readonly string[], name: string): void {
  if (new Set(values).size !== values.length) throw new RangeError(`${name} 不能包含重复项。`);
}

function assertSameOrderedValues(actual: readonly string[], expected: readonly string[], name: string): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new RangeError(`${name} 必须精确覆盖冻结集合。`);
  }
}

function envelope(source: Record<string, unknown>, name: string): ModePolicyEnvelope {
  if (source.schemaVersion !== MODE_POLICY_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 必须是 ${MODE_POLICY_DEFINITION_SCHEMA_VERSION}。`);
  }
  return Object.freeze({
    schemaVersion: MODE_POLICY_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, `${name}.id`),
    contentVersion: safeIntegerAtLeast(source.contentVersion, 1, `${name}.contentVersion`),
    modeKind: literal<ModeKind>(source.modeKind, MODE_KINDS, `${name}.modeKind`),
  });
}

function cloneTeamRule(value: unknown, name: string): ModeTeamRule {
  const record = assertPlainRecord(value, name);
  if (record.kind === MODE_TEAM_RULE_KIND.NONE) {
    exactRecord(record, TEAM_NONE_KEYS, name);
    return Object.freeze({ kind: MODE_TEAM_RULE_KIND.NONE });
  }
  if (record.kind === MODE_TEAM_RULE_KIND.FIXED) {
    exactRecord(record, TEAM_FIXED_KEYS, name);
    return Object.freeze({
      kind: MODE_TEAM_RULE_KIND.FIXED,
      teamId: assertNonEmptyString(record.teamId, `${name}.teamId`),
    });
  }
  throw new RangeError(`${name}.kind 不受支持。`);
}

function cloneSlotRule(value: unknown, name: string): ModeSlotRule {
  const record = assertPlainRecord(value, name);
  if (record.kind === MODE_SLOT_RULE_KIND.NONE) {
    exactRecord(record, SLOT_NONE_KEYS, name);
    return Object.freeze({ kind: MODE_SLOT_RULE_KIND.NONE });
  }
  if (record.kind === MODE_SLOT_RULE_KIND.FIXED) {
    exactRecord(record, SLOT_FIXED_KEYS, name);
    const slotIds = cloneFrozenStringSet(record.slotIds as readonly unknown[], `${name}.slotIds`);
    if (slotIds.length === 0 || slotIds.length > MODE_POLICY_TEST_MAXIMUM_ENEMY_SLOTS) {
      throw new RangeError(`${name}.slotIds 必须包含 1–${MODE_POLICY_TEST_MAXIMUM_ENEMY_SLOTS} 项。`);
    }
    return Object.freeze({ kind: MODE_SLOT_RULE_KIND.FIXED, slotIds });
  }
  throw new RangeError(`${name}.kind 不受支持。`);
}

function cloneRole(value: unknown, index: number): ParticipantRolePolicy {
  const name = `ParticipantPolicyDefinition.roles[${index}]`;
  exactRecord(value, ROLE_KEYS, name);
  const minimumCount = safeIntegerAtLeast(value.minimumCount, 0, `${name}.minimumCount`);
  const maximumCount = safeIntegerAtLeast(value.maximumCount, 0, `${name}.maximumCount`);
  if (maximumCount < minimumCount) throw new RangeError(`${name} count 范围无效。`);
  const allowedControllerKinds = cloneFrozenStringSet(
    value.allowedControllerKinds as readonly unknown[],
    `${name}.allowedControllerKinds`,
  ).map((item) => literal<ModeControllerKind>(item, CONTROLLER_KINDS, `${name}.allowedControllerKinds`));
  if (allowedControllerKinds.length === 0) {
    throw new RangeError(`${name}.allowedControllerKinds 不能为空。`);
  }
  return Object.freeze({
    modeRole: literal<ModeRole>(value.modeRole, MODE_ROLES, `${name}.modeRole`),
    minimumCount,
    maximumCount,
    allowedControllerKinds: Object.freeze(allowedControllerKinds),
    teamRule: cloneTeamRule(value.teamRule, `${name}.teamRule`),
    slotRule: cloneSlotRule(value.slotRule, `${name}.slotRule`),
  });
}

function cloneControllerBound(value: unknown, index: number): ControllerKindBound {
  const name = `ParticipantPolicyDefinition.controllerKindBounds[${index}]`;
  exactRecord(value, CONTROLLER_BOUND_KEYS, name);
  const minimumCount = safeIntegerAtLeast(value.minimumCount, 0, `${name}.minimumCount`);
  const maximumCount = safeIntegerAtLeast(value.maximumCount, 0, `${name}.maximumCount`);
  if (maximumCount < minimumCount) throw new RangeError(`${name} count 范围无效。`);
  return Object.freeze({
    controllerKind: literal<ModeControllerKind>(
      value.controllerKind,
      CONTROLLER_KINDS,
      `${name}.controllerKind`,
    ),
    minimumCount,
    maximumCount,
  });
}

function assertParticipantSemantics(definition: ParticipantPolicyDefinition): void {
  const roleById = new Map(definition.roles.map((role) => [role.modeRole, role]));
  const controllerById = new Map(
    definition.controllerKindBounds.map((bound) => [bound.controllerKind, bound]),
  );
  const expectedRoles = MODE_ROLES_BY_KIND[definition.modeKind];
  assertSameOrderedValues(
    definition.roles.map((role) => role.modeRole),
    expectedRoles,
    'ParticipantPolicyDefinition.roles',
  );
  const allowedControllers = [...new Set(definition.roles.flatMap((role) => role.allowedControllerKinds))]
    .sort(compareText);
  assertSameOrderedValues(
    definition.controllerKindBounds.map((bound) => bound.controllerKind),
    allowedControllers,
    'ParticipantPolicyDefinition.controllerKindBounds',
  );
  const minimumRoleCount = definition.roles.reduce((sum, role) => sum + role.minimumCount, 0);
  const maximumRoleCount = definition.roles.reduce((sum, role) => sum + role.maximumCount, 0);
  if (
    minimumRoleCount !== definition.minimumParticipants
    || maximumRoleCount !== definition.maximumParticipants
  ) {
    throw new RangeError('ParticipantPolicyDefinition role count 与 participant 范围不闭合。');
  }
  const controllerMinimum = definition.controllerKindBounds.reduce(
    (sum, bound) => sum + bound.minimumCount,
    0,
  );
  const controllerMaximum = definition.controllerKindBounds.reduce(
    (sum, bound) => sum + bound.maximumCount,
    0,
  );
  if (
    controllerMinimum > definition.minimumParticipants
    || controllerMaximum < definition.maximumParticipants
    || definition.controllerKindBounds.some((bound) => (
      bound.maximumCount > definition.maximumParticipants
    ))
  ) {
    throw new RangeError('ParticipantPolicyDefinition controller count 与 participant 范围不闭合。');
  }
  if (definition.roles.some((role) => role.teamRule.kind !== MODE_TEAM_RULE_KIND.NONE)) {
    throw new RangeError('首发 Mode 的 teamRule 必须为 none，关系只由RelationshipPolicy裁决。');
  }

  if (definition.modeKind === MODE_KIND.DUEL) {
    const competitor = roleById.get(MODE_ROLE.COMPETITOR)!;
    if (
      definition.minimumParticipants !== 2
      || definition.maximumParticipants !== 2
      || competitor.minimumCount !== 2
      || competitor.maximumCount !== 2
      || competitor.slotRule.kind !== MODE_SLOT_RULE_KIND.NONE
    ) {
      throw new RangeError('Duel ParticipantPolicy 必须精确声明 2 个无 slot competitor。');
    }
  } else if (definition.modeKind === MODE_KIND.RACE) {
    const competitor = roleById.get(MODE_ROLE.COMPETITOR)!;
    const human = controllerById.get(MODE_CONTROLLER_KIND.HUMAN);
    if (
      definition.minimumParticipants !== 2
      || definition.maximumParticipants !== 4
      || competitor.minimumCount !== 2
      || competitor.maximumCount !== 4
      || competitor.slotRule.kind !== MODE_SLOT_RULE_KIND.NONE
      || !human
      || human.minimumCount < 1
    ) {
      throw new RangeError('Race ParticipantPolicy 必须声明 2–4 competitor 且至少 1 human。');
    }
  } else {
    const player = roleById.get(MODE_ROLE.PLAYER)!;
    const enemy = roleById.get(MODE_ROLE.ENEMY)!;
    const human = controllerById.get(MODE_CONTROLLER_KIND.HUMAN);
    const bot = controllerById.get(MODE_CONTROLLER_KIND.BOT);
    if (
      player.minimumCount !== 1
      || player.maximumCount !== 1
      || player.allowedControllerKinds.length !== 1
      || player.allowedControllerKinds[0] !== MODE_CONTROLLER_KIND.HUMAN
      || player.slotRule.kind !== MODE_SLOT_RULE_KIND.NONE
      || enemy.minimumCount < 1
      || enemy.maximumCount > MODE_POLICY_TEST_MAXIMUM_ENEMY_SLOTS
      || enemy.allowedControllerKinds.length !== 1
      || enemy.allowedControllerKinds[0] !== MODE_CONTROLLER_KIND.BOT
      || enemy.slotRule.kind !== MODE_SLOT_RULE_KIND.FIXED
      || enemy.slotRule.slotIds.length !== enemy.maximumCount
      || !human
      || human.minimumCount !== 1
      || human.maximumCount !== 1
      || !bot
      || bot.minimumCount !== enemy.minimumCount
      || bot.maximumCount !== enemy.maximumCount
    ) {
      throw new RangeError('Survival ParticipantPolicy 必须声明 1 human player 与有界 enemy Bot slot。');
    }
  }
}

function normalizeParticipant(source: unknown): ParticipantPolicyDefinition {
  exactRecord(source, PARTICIPANT_KEYS, 'ParticipantPolicyDefinition');
  const base = envelope(source, 'ParticipantPolicyDefinition');
  const minimumParticipants = safeIntegerAtLeast(
    source.minimumParticipants,
    1,
    'ParticipantPolicyDefinition.minimumParticipants',
  );
  const maximumParticipants = safeIntegerAtLeast(
    source.maximumParticipants,
    1,
    'ParticipantPolicyDefinition.maximumParticipants',
  );
  if (maximumParticipants < minimumParticipants) {
    throw new RangeError('ParticipantPolicyDefinition participant 范围无效。');
  }
  const roles = [...frozenArray(source.roles, 'ParticipantPolicyDefinition.roles', cloneRole)]
    .sort((left, right) => compareText(left.modeRole, right.modeRole));
  assertUnique(roles.map((role) => role.modeRole), 'ParticipantPolicyDefinition.roles');
  const controllerKindBounds = [
    ...frozenArray(
      source.controllerKindBounds,
      'ParticipantPolicyDefinition.controllerKindBounds',
      cloneControllerBound,
    ),
  ].sort((left, right) => compareText(left.controllerKind, right.controllerKind));
  assertUnique(
    controllerKindBounds.map((bound) => bound.controllerKind),
    'ParticipantPolicyDefinition.controllerKindBounds',
  );
  const definition = Object.freeze({
    ...base,
    minimumParticipants,
    maximumParticipants,
    roles: Object.freeze(roles),
    controllerKindBounds: Object.freeze(controllerKindBounds),
  });
  assertParticipantSemantics(definition);
  return definition;
}

function normalizeTimelineV1(source: Record<string, unknown>): TimelinePolicyDefinitionV1 {
  exactRecord(source, TIMELINE_V1_KEYS, 'TimelinePolicyDefinitionV1');
  const base = envelope(source, 'TimelinePolicyDefinitionV1');
  const preparingTicks = safeIntegerAtLeast(
    source.preparingTicks,
    0,
    'TimelinePolicyDefinitionV1.preparingTicks',
  );
  const hardLimitTicks = safeIntegerAtLeast(
    source.hardLimitTicks,
    1,
    'TimelinePolicyDefinitionV1.hardLimitTicks',
  );
  if (hardLimitTicks <= preparingTicks) {
    throw new RangeError('TimelinePolicyDefinitionV1.hardLimitTicks 必须大于 preparingTicks。');
  }
  let suddenDeathStartActiveTick: number | null = null;
  if (source.suddenDeathStartActiveTick !== null) {
    suddenDeathStartActiveTick = safeIntegerAtLeast(
      source.suddenDeathStartActiveTick,
      0,
      'TimelinePolicyDefinitionV1.suddenDeathStartActiveTick',
    );
  }
  if (base.modeKind === MODE_KIND.DUEL) {
    if (suddenDeathStartActiveTick === null || suddenDeathStartActiveTick >= hardLimitTicks) {
      throw new RangeError('Duel TimelinePolicy 必须声明小于 hard limit 的 sudden death tick。');
    }
  } else if (suddenDeathStartActiveTick !== null) {
    throw new RangeError('Race/Survival TimelinePolicy 的 sudden death 必须精确为 null。');
  }
  if (base.modeKind === MODE_KIND.RACE
    && preparingTicks !== RACE_MODE_PREPARING_TICKS_V1) {
    throw new RangeError(
      `Race TimelinePolicy preparingTicks 候选必须是 ${RACE_MODE_PREPARING_TICKS_V1}。`,
    );
  }
  return Object.freeze({
    ...base,
    preparingTicks,
    hardLimitTicks,
    suddenDeathStartActiveTick,
  });
}

function cloneTimelineVariantSelectorV2(
  value: unknown,
  name: string,
): TimelinePolicyVariantSelectorV2 {
  const source = assertPlainRecord(value, name);
  if (source.kind === TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT) {
    exactRecord(source, TIMELINE_DEFAULT_SELECTOR_KEYS, name);
    return Object.freeze({ kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT });
  }
  if (source.kind === TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT) {
    exactRecord(source, TIMELINE_SURVIVAL_SELECTOR_KEYS, name);
    const enemyCount = safeIntegerAtLeast(source.enemyCount, 1, `${name}.enemyCount`);
    if (!(TIMELINE_POLICY_SURVIVAL_ENEMY_COUNTS_V2 as readonly number[]).includes(enemyCount)) {
      throw new RangeError(`${name}.enemyCount 必须是 1/4/8/12/16。`);
    }
    return Object.freeze({
      kind: TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT,
      enemyCount: enemyCount as TimelinePolicySurvivalEnemyCountV2,
    });
  }
  throw new RangeError(`${name}.kind 不受支持。`);
}

function cloneTimelineRuntimeVariantV2(
  value: unknown,
  index: number,
): TimelinePolicyRuntimeVariantV2 {
  const name = `TimelinePolicyDefinitionV2.variants[${index}]`;
  exactRecord(value, TIMELINE_RUNTIME_VARIANT_KEYS, name);
  const selector = cloneTimelineVariantSelectorV2(value.selector, `${name}.selector`);
  const preparingTicks = safeIntegerAtLeast(value.preparingTicks, 0, `${name}.preparingTicks`);
  const hardLimitActiveTicks = safeIntegerAtLeast(
    value.hardLimitActiveTicks,
    1,
    `${name}.hardLimitActiveTicks`,
  );
  const suddenDeathStartActiveTick = value.suddenDeathStartActiveTick === null
    ? null
    : safeIntegerAtLeast(
      value.suddenDeathStartActiveTick,
      0,
      `${name}.suddenDeathStartActiveTick`,
    );
  return Object.freeze({
    selector,
    preparingTicks,
    hardLimitActiveTicks,
    suddenDeathStartActiveTick,
  });
}

function assertTimelineRuntimeVariantSemanticsV2(
  modeKind: ModeKind,
  variants: readonly TimelinePolicyRuntimeVariantV2[],
): void {
  if (modeKind === MODE_KIND.SURVIVAL) {
    if (variants.length !== TIMELINE_POLICY_SURVIVAL_ENEMY_COUNTS_V2.length) {
      throw new RangeError('Survival TimelinePolicyDefinitionV2 必须精确声明5个敌人数变体。');
    }
    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index]!;
      const expectedEnemyCount = TIMELINE_POLICY_SURVIVAL_ENEMY_COUNTS_V2[index]!;
      if (variant.selector.kind !== TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT
        || variant.selector.enemyCount !== expectedEnemyCount) {
        throw new RangeError('Survival TimelinePolicyDefinitionV2 selector必须按1/4/8/12/16严格有序覆盖。');
      }
      if (variant.preparingTicks !== 0 || variant.suddenDeathStartActiveTick !== null) {
        throw new RangeError('Survival TimelinePolicyDefinitionV2不得声明准备期或sudden death。');
      }
    }
    return;
  }
  if (variants.length !== 1
    || variants[0]!.selector.kind !== TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT) {
    throw new RangeError('Duel/Race TimelinePolicyDefinitionV2必须精确声明一个default变体。');
  }
  const variant = variants[0]!;
  if (modeKind === MODE_KIND.DUEL) {
    if (variant.suddenDeathStartActiveTick === null
      || variant.suddenDeathStartActiveTick >= variant.hardLimitActiveTicks) {
      throw new RangeError('Duel TimelinePolicyDefinitionV2必须声明早于hard limit的sudden death tick。');
    }
  } else if (variant.preparingTicks !== RACE_MODE_PREPARING_TICKS_V1
    || variant.suddenDeathStartActiveTick !== null) {
    throw new RangeError(
      `Race TimelinePolicyDefinitionV2必须使用${RACE_MODE_PREPARING_TICKS_V1} tick准备期且无sudden death。`,
    );
  }
}

function normalizeTimelineV2(source: Record<string, unknown>): TimelinePolicyDefinitionV2 {
  exactRecord(source, TIMELINE_V2_KEYS, 'TimelinePolicyDefinitionV2');
  const base = envelope(source, 'TimelinePolicyDefinitionV2');
  if (base.contentVersion !== 2) {
    throw new RangeError('TimelinePolicyDefinitionV2.contentVersion 必须是 2。');
  }
  const variants = frozenArray(
    source.variants,
    'TimelinePolicyDefinitionV2.variants',
    cloneTimelineRuntimeVariantV2,
  );
  assertTimelineRuntimeVariantSemanticsV2(base.modeKind, variants);
  return Object.freeze({ ...base, contentVersion: 2 as const, variants });
}

function normalizeTimeline(source: unknown): TimelinePolicyDefinition {
  const record = assertPlainRecord(source, 'TimelinePolicyDefinition');
  if (Object.hasOwn(record, 'variants')) return normalizeTimelineV2(record);
  return normalizeTimelineV1(record);
}

function sameTimelineSelectorV2(
  left: TimelinePolicyVariantSelectorV2,
  right: TimelinePolicyVariantSelectorV2,
): boolean {
  return left.kind === right.kind
    && (left.kind === TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.DEFAULT
      || (right.kind === TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT
        && left.enemyCount === right.enemyCount));
}

export function resolveTimelinePolicyRuntimeVariantV2(
  definitionValue: unknown,
  selectorValue: unknown,
): TimelinePolicyRuntimeVariantV2 {
  const definition = createTimelinePolicyDefinition(definitionValue);
  if (!Object.hasOwn(definition, 'variants')) {
    throw new RangeError('Timeline Policy V2变体投影必须消费contentVersion=2。');
  }
  const timelineV2 = definition as TimelinePolicyDefinitionV2;
  const selector = cloneTimelineVariantSelectorV2(
    cloneFrozenData(selectorValue, 'Timeline Policy V2 selector'),
    'Timeline Policy V2 selector',
  );
  const variant = timelineV2.variants.find((candidate) => (
    sameTimelineSelectorV2(candidate.selector, selector)
  ));
  if (variant === undefined) throw new RangeError('Timeline Policy V2 selector未命中已注册变体。');
  return variant;
}

function cloneObjective(value: unknown, modeKind: ModeKind): ModeObjective {
  const name = 'ObjectivePolicyDefinition.objective';
  const record = assertPlainRecord(value, name);
  if (modeKind === MODE_KIND.DUEL) {
    exactRecord(record, DUEL_OBJECTIVE_KEYS, name);
    return Object.freeze({
      kind: literalValue(record.kind, MODE_OBJECTIVE_KIND.DUEL, `${name}.kind`),
      timeoutPolicy: literalValue(record.timeoutPolicy, 'score-or-draw', `${name}.timeoutPolicy`),
    });
  }
  if (modeKind === MODE_KIND.RACE) {
    exactRecord(record, RACE_OBJECTIVE_KEYS, name);
    return Object.freeze({
      kind: literalValue(record.kind, MODE_OBJECTIVE_KIND.RACE, `${name}.kind`),
      finishGateCapabilityId: assertNonEmptyString(
        record.finishGateCapabilityId,
        `${name}.finishGateCapabilityId`,
      ),
      validClaimEndPolicy: literalValue(
        record.validClaimEndPolicy,
        'claim-tick',
        `${name}.validClaimEndPolicy`,
      ),
      sameTickRankPolicy: literalValue(
        record.sameTickRankPolicy,
        'shared-rank-1',
        `${name}.sameTickRankPolicy`,
      ),
      hardLimitPolicy: literalValue(record.hardLimitPolicy, 'no-finisher', `${name}.hardLimitPolicy`),
    });
  }
  exactRecord(record, SURVIVAL_OBJECTIVE_KEYS, name);
  return Object.freeze({
    kind: literalValue(record.kind, MODE_OBJECTIVE_KIND.SURVIVAL, `${name}.kind`),
    terminalPlayerFallCount: literalValue(
      record.terminalPlayerFallCount,
      2,
      `${name}.terminalPlayerFallCount`,
    ),
    hardLimitPolicy: literalValue(
      record.hardLimitPolicy,
      'survival-time-cap',
      `${name}.hardLimitPolicy`,
    ),
  });
}

function normalizeObjective(source: unknown): ObjectivePolicyDefinition {
  exactRecord(source, OBJECTIVE_KEYS, 'ObjectivePolicyDefinition');
  const base = envelope(source, 'ObjectivePolicyDefinition');
  return Object.freeze({ ...base, objective: cloneObjective(source.objective, base.modeKind) });
}

function cloneDisposition(value: unknown, index: number): ModeRoleDisposition {
  const name = `EliminationPolicyDefinition.roleDispositions[${index}]`;
  exactRecord(value, DISPOSITION_KEYS, name);
  return Object.freeze({
    modeRole: literal<ModeRole>(value.modeRole, MODE_ROLES, `${name}.modeRole`),
    fallDisposition: literal<ModeRoleDisposition['fallDisposition']>(
      value.fallDisposition,
      FALL_DISPOSITIONS,
      `${name}.fallDisposition`,
    ),
  });
}

function normalizeElimination(source: unknown): EliminationPolicyDefinition {
  exactRecord(source, ELIMINATION_KEYS, 'EliminationPolicyDefinition');
  const base = envelope(source, 'EliminationPolicyDefinition');
  const roleDispositions = [
    ...frozenArray(
      source.roleDispositions,
      'EliminationPolicyDefinition.roleDispositions',
      cloneDisposition,
    ),
  ].sort((left, right) => compareText(left.modeRole, right.modeRole));
  assertSameOrderedValues(
    roleDispositions.map((item) => item.modeRole),
    MODE_ROLES_BY_KIND[base.modeKind],
    'EliminationPolicyDefinition.roleDispositions',
  );
  const expected = base.modeKind === MODE_KIND.DUEL
    ? [MODE_FALL_DISPOSITION.ELIMINATE]
    : base.modeKind === MODE_KIND.RACE
      ? [MODE_FALL_DISPOSITION.SCHEDULE_RESPAWN]
      : [MODE_FALL_DISPOSITION.DEACTIVATE_SLOT, MODE_FALL_DISPOSITION.COUNT_FOR_OBJECTIVE];
  assertSameOrderedValues(
    roleDispositions.map((item) => item.fallDisposition),
    expected,
    'EliminationPolicyDefinition fall disposition',
  );
  return Object.freeze({ ...base, roleDispositions: Object.freeze(roleDispositions) });
}

function cloneAnchorPolicy(value: unknown, name: string): ModeRespawnAnchorPolicy {
  const record = assertPlainRecord(value, name);
  if (record.kind === MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED) {
    exactRecord(record, ANCHOR_DISABLED_KEYS, name);
    return Object.freeze({ kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED });
  }
  if (record.kind === MODE_RESPAWN_ANCHOR_POLICY_KIND.LATEST_VALID_SAFE_ANCHOR) {
    exactRecord(record, ANCHOR_LATEST_KEYS, name);
    return Object.freeze({
      kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.LATEST_VALID_SAFE_ANCHOR,
      fallbackAnchorCapabilityId: assertNonEmptyString(
        record.fallbackAnchorCapabilityId,
        `${name}.fallbackAnchorCapabilityId`,
      ),
    });
  }
  if (record.kind === MODE_RESPAWN_ANCHOR_POLICY_KIND.FIXED_ANCHOR) {
    exactRecord(record, ANCHOR_FIXED_KEYS, name);
    return Object.freeze({
      kind: MODE_RESPAWN_ANCHOR_POLICY_KIND.FIXED_ANCHOR,
      anchorCapabilityId: assertNonEmptyString(
        record.anchorCapabilityId,
        `${name}.anchorCapabilityId`,
      ),
    });
  }
  throw new RangeError(`${name}.kind 不受支持。`);
}

function cloneRespawnRole(value: unknown, index: number): ModeRoleRespawnPolicy {
  const name = `RespawnPolicyDefinition.rolePolicies[${index}]`;
  exactRecord(value, RESPAWN_ROLE_KEYS, name);
  if (typeof value.enabled !== 'boolean') throw new TypeError(`${name}.enabled 必须是布尔值。`);
  const delayTicks = safeIntegerAtLeast(value.delayTicks, 0, `${name}.delayTicks`);
  const maximumRespawns = value.maximumRespawns === null
    ? null
    : safeIntegerAtLeast(value.maximumRespawns, 0, `${name}.maximumRespawns`);
  const protectionTicks = safeIntegerAtLeast(
    value.protectionTicks,
    0,
    `${name}.protectionTicks`,
  );
  const anchorPolicy = cloneAnchorPolicy(value.anchorPolicy, `${name}.anchorPolicy`);
  if (!value.enabled && (
    delayTicks !== 0
    || maximumRespawns !== 0
    || protectionTicks !== 0
    || anchorPolicy.kind !== MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED
  )) {
    throw new RangeError(`${name} disabled 时必须清空 tick、次数与 anchor。`);
  }
  if (value.enabled && (
    maximumRespawns === 0
    || anchorPolicy.kind === MODE_RESPAWN_ANCHOR_POLICY_KIND.DISABLED
  )) {
    throw new RangeError(`${name} enabled 时必须声明次数与 anchor。`);
  }
  return Object.freeze({
    modeRole: literal<ModeRole>(value.modeRole, MODE_ROLES, `${name}.modeRole`),
    enabled: value.enabled,
    delayTicks,
    maximumRespawns,
    anchorPolicy,
    protectionTicks,
  });
}

function normalizeRespawn(source: unknown): RespawnPolicyDefinition {
  exactRecord(source, RESPAWN_KEYS, 'RespawnPolicyDefinition');
  const base = envelope(source, 'RespawnPolicyDefinition');
  const rolePolicies = [
    ...frozenArray(source.rolePolicies, 'RespawnPolicyDefinition.rolePolicies', cloneRespawnRole),
  ].sort((left, right) => compareText(left.modeRole, right.modeRole));
  assertSameOrderedValues(
    rolePolicies.map((item) => item.modeRole),
    MODE_ROLES_BY_KIND[base.modeKind],
    'RespawnPolicyDefinition.rolePolicies',
  );
  if (base.modeKind === MODE_KIND.DUEL && rolePolicies.some((policy) => policy.enabled)) {
    throw new RangeError('Duel RespawnPolicy 必须 disabled。');
  }
  if (base.modeKind === MODE_KIND.RACE) {
    const competitor = rolePolicies[0]!;
    if (
      !competitor.enabled
      || competitor.delayTicks !== RACE_MODE_RESPAWN_DELAY_TICKS_V1
      || competitor.maximumRespawns !== null
      || competitor.anchorPolicy.kind !== MODE_RESPAWN_ANCHOR_POLICY_KIND.LATEST_VALID_SAFE_ANCHOR
    ) {
      throw new RangeError(
        `Race RespawnPolicy 必须是 ${RACE_MODE_RESPAWN_DELAY_TICKS_V1} tick、无限次及最近安全锚。`,
      );
    }
  }
  if (base.modeKind === MODE_KIND.SURVIVAL) {
    const enemy = rolePolicies.find((policy) => policy.modeRole === MODE_ROLE.ENEMY)!;
    const player = rolePolicies.find((policy) => policy.modeRole === MODE_ROLE.PLAYER)!;
    if (enemy.enabled || !player.enabled || player.maximumRespawns !== 1) {
      throw new RangeError('Survival RespawnPolicy 必须仅允许 player 重生 1 次。');
    }
  }
  return Object.freeze({ ...base, rolePolicies: Object.freeze(rolePolicies) });
}

function cloneRelation(value: unknown, index: number): ModeRoleRelationship {
  const name = `RelationshipPolicyDefinition.relations[${index}]`;
  exactRecord(value, RELATION_KEYS, name);
  return Object.freeze({
    sourceRole: literal<ModeRole>(value.sourceRole, MODE_ROLES, `${name}.sourceRole`),
    targetRole: literal<ModeRole>(value.targetRole, MODE_ROLES, `${name}.targetRole`),
    relationship: literal<ModeRelationship>(
      value.relationship,
      RELATIONSHIPS,
      `${name}.relationship`,
    ),
  });
}

function normalizeRelationship(source: unknown): RelationshipPolicyDefinition {
  exactRecord(source, RELATIONSHIP_KEYS, 'RelationshipPolicyDefinition');
  const base = envelope(source, 'RelationshipPolicyDefinition');
  literalValue(
    source.selfTargeting,
    'forbidden',
    'RelationshipPolicyDefinition.selfTargeting',
  );
  const relations = [
    ...frozenArray(source.relations, 'RelationshipPolicyDefinition.relations', cloneRelation),
  ].sort((left, right) => compareText(
    `${left.sourceRole}\u0000${left.targetRole}`,
    `${right.sourceRole}\u0000${right.targetRole}`,
  ));
  const roles = MODE_ROLES_BY_KIND[base.modeKind];
  const expectedPairs = roles.flatMap((sourceRole) => roles.map((targetRole) => (
    `${sourceRole}\u0000${targetRole}`
  ))).sort(compareText);
  assertSameOrderedValues(
    relations.map((item) => `${item.sourceRole}\u0000${item.targetRole}`),
    expectedPairs,
    'RelationshipPolicyDefinition.relations',
  );
  for (const relation of relations) {
    const expected = base.modeKind === MODE_KIND.SURVIVAL
      && relation.sourceRole === relation.targetRole
      ? MODE_RELATIONSHIP.NEUTRAL
      : MODE_RELATIONSHIP.HOSTILE;
    if (relation.relationship !== expected) {
      throw new RangeError('RelationshipPolicyDefinition relationship 与模式角色不一致。');
    }
  }
  return Object.freeze({
    ...base,
    selfTargeting: 'forbidden' as const,
    relations: Object.freeze(relations),
  });
}

function normalizeResult(source: unknown): ResultPolicyDefinition {
  exactRecord(source, RESULT_KEYS, 'ResultPolicyDefinition');
  const base = envelope(source, 'ResultPolicyDefinition');
  const resultKind = literalValue(
    source.resultKind,
    MODE_RESULT_KIND[base.modeKind.toUpperCase() as keyof typeof MODE_RESULT_KIND],
    'ResultPolicyDefinition.resultKind',
  );
  const projectionPolicy = literalValue(
    source.projectionPolicy,
    MODE_RESULT_PROJECTION_POLICY[
      base.modeKind.toUpperCase() as keyof typeof MODE_RESULT_PROJECTION_POLICY
    ],
    'ResultPolicyDefinition.projectionPolicy',
  );
  const allowedReasons = cloneFrozenStringSet(
    source.allowedReasons as readonly unknown[],
    'ResultPolicyDefinition.allowedReasons',
  );
  assertSameOrderedValues(
    allowedReasons,
    RESULT_REASONS[base.modeKind],
    'ResultPolicyDefinition.allowedReasons',
  );
  return Object.freeze({ ...base, resultKind, allowedReasons, projectionPolicy });
}

function clonePressureSlot(value: unknown, index: number): SurvivalPressureSlotEntry {
  const name = `SurvivalPressurePolicyDefinition.slotEntries[${index}]`;
  exactRecord(value, PRESSURE_SLOT_KEYS, name);
  return Object.freeze({
    slotId: assertNonEmptyString(value.slotId, `${name}.slotId`),
    anchorCapabilityId: assertNonEmptyString(
      value.anchorCapabilityId,
      `${name}.anchorCapabilityId`,
    ),
  });
}

function clonePressureStage(value: unknown, index: number): SurvivalPressureStage {
  const name = `SurvivalPressurePolicyDefinition.stages[${index}]`;
  exactRecord(value, PRESSURE_STAGE_KEYS, name);
  return Object.freeze({
    stage: safeIntegerAtLeast(value.stage, 0, `${name}.stage`),
    startActiveTick: safeIntegerAtLeast(value.startActiveTick, 0, `${name}.startActiveTick`),
    desiredActiveEnemySlots: safeIntegerAtLeast(
      value.desiredActiveEnemySlots,
      1,
      `${name}.desiredActiveEnemySlots`,
    ),
    reactivationDelayTicks: safeIntegerAtLeast(
      value.reactivationDelayTicks,
      0,
      `${name}.reactivationDelayTicks`,
    ),
  });
}

function normalizePressure(source: unknown): SurvivalPressurePolicyDefinition {
  exactRecord(source, PRESSURE_KEYS, 'SurvivalPressurePolicyDefinition');
  const base = envelope(source, 'SurvivalPressurePolicyDefinition');
  if (base.modeKind !== MODE_KIND.SURVIVAL) {
    throw new RangeError('SurvivalPressurePolicyDefinition 只允许 survival。');
  }
  const slotActivationOrder = frozenArray(
    source.slotActivationOrder,
    'SurvivalPressurePolicyDefinition.slotActivationOrder',
    (item, index) => assertNonEmptyString(
      item,
      `SurvivalPressurePolicyDefinition.slotActivationOrder[${index}]`,
    ),
  );
  assertUnique(slotActivationOrder, 'SurvivalPressurePolicyDefinition.slotActivationOrder');
  if (
    slotActivationOrder.length === 0
    || slotActivationOrder.length > MODE_POLICY_TEST_MAXIMUM_ENEMY_SLOTS
  ) {
    throw new RangeError('SurvivalPressurePolicyDefinition slot 数必须位于 1–16。');
  }
  const slotEntries = [
    ...frozenArray(source.slotEntries, 'SurvivalPressurePolicyDefinition.slotEntries', clonePressureSlot),
  ].sort((left, right) => compareText(left.slotId, right.slotId));
  assertUnique(
    slotEntries.map((entry) => entry.slotId),
    'SurvivalPressurePolicyDefinition.slotEntries slotId',
  );
  assertSameOrderedValues(
    [...slotActivationOrder].sort(compareText),
    slotEntries.map((entry) => entry.slotId),
    'SurvivalPressurePolicyDefinition slot closure',
  );
  const stages = frozenArray(
    source.stages,
    'SurvivalPressurePolicyDefinition.stages',
    clonePressureStage,
  );
  if (stages.length === 0 || stages[0]!.stage !== 0 || stages[0]!.startActiveTick !== 0) {
    throw new RangeError('SurvivalPressurePolicyDefinition 首 stage 必须从 stage 0/tick 0 开始。');
  }
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const previous = stages[index - 1];
    if (stage.stage !== index) {
      throw new RangeError('SurvivalPressurePolicyDefinition stage 必须从 0 连续。');
    }
    if (stage.desiredActiveEnemySlots > slotActivationOrder.length) {
      throw new RangeError('SurvivalPressurePolicyDefinition desired slot 超出 slot 池。');
    }
    if (previous && (
      stage.startActiveTick <= previous.startActiveTick
      || stage.desiredActiveEnemySlots < previous.desiredActiveEnemySlots
    )) {
      throw new RangeError('SurvivalPressurePolicyDefinition stage tick/desired count 必须单调。');
    }
  }
  return Object.freeze({
    ...base,
    modeKind: MODE_KIND.SURVIVAL,
    slotActivationOrder,
    slotEntries: Object.freeze(slotEntries),
    stages,
  });
}

function cloneTierVariant(value: unknown, index: number): SurvivalEquipmentTierVariant {
  const name = `SurvivalEquipmentTierPolicyDefinition.tiers[].variants[${index}]`;
  exactRecord(value, TIER_VARIANT_KEYS, name);
  const collectionEquipmentDefinitionId = assertNonEmptyString(
    value.collectionEquipmentDefinitionId,
    `${name}.collectionEquipmentDefinitionId`,
  );
  const runtimeEquipmentDefinitionId = assertNonEmptyString(
    value.runtimeEquipmentDefinitionId,
    `${name}.runtimeEquipmentDefinitionId`,
  );
  if (collectionEquipmentDefinitionId === runtimeEquipmentDefinitionId) {
    throw new RangeError(`${name} collection/runtime Definition ID 必须分离。`);
  }
  return Object.freeze({ collectionEquipmentDefinitionId, runtimeEquipmentDefinitionId });
}

function cloneTier(value: unknown, index: number): SurvivalEquipmentTier {
  const name = `SurvivalEquipmentTierPolicyDefinition.tiers[${index}]`;
  exactRecord(value, TIER_ENTRY_KEYS, name);
  const variants = [
    ...frozenArray(value.variants, `${name}.variants`, cloneTierVariant),
  ].sort((left, right) => compareText(
    left.collectionEquipmentDefinitionId,
    right.collectionEquipmentDefinitionId,
  ));
  if (variants.length === 0) throw new RangeError(`${name}.variants 不能为空。`);
  assertUnique(
    variants.map((variant) => variant.collectionEquipmentDefinitionId),
    `${name}.variants collection`,
  );
  assertUnique(
    variants.map((variant) => variant.runtimeEquipmentDefinitionId),
    `${name}.variants runtime`,
  );
  return Object.freeze({
    minimumWaveIndex: safeIntegerAtLeast(value.minimumWaveIndex, 0, `${name}.minimumWaveIndex`),
    survivalLevel: safeIntegerAtLeast(value.survivalLevel, 1, `${name}.survivalLevel`),
    variants: Object.freeze(variants),
  });
}

function normalizeTier(source: unknown): SurvivalEquipmentTierPolicyDefinition {
  exactRecord(source, TIER_KEYS, 'SurvivalEquipmentTierPolicyDefinition');
  const base = envelope(source, 'SurvivalEquipmentTierPolicyDefinition');
  if (base.modeKind !== MODE_KIND.SURVIVAL) {
    throw new RangeError('SurvivalEquipmentTierPolicyDefinition 只允许 survival。');
  }
  const tiers = frozenArray(
    source.tiers,
    'SurvivalEquipmentTierPolicyDefinition.tiers',
    cloneTier,
  );
  if (tiers.length === 0 || tiers[0]!.minimumWaveIndex !== 0) {
    throw new RangeError('SurvivalEquipmentTierPolicyDefinition 首 tier 必须从 wave 0 开始。');
  }
  const expectedCollections = tiers[0]!.variants.map(
    (variant) => variant.collectionEquipmentDefinitionId,
  );
  const runtimeToCollection = new Map<string, string>();
  const runtimeByCollection = new Map<string, Set<string>>();
  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index]!;
    const previous = tiers[index - 1];
    if (previous && (
      tier.minimumWaveIndex <= previous.minimumWaveIndex
      || tier.survivalLevel <= previous.survivalLevel
    )) {
      throw new RangeError('SurvivalEquipmentTierPolicyDefinition wave/level 必须严格递增。');
    }
    assertSameOrderedValues(
      tier.variants.map((variant) => variant.collectionEquipmentDefinitionId),
      expectedCollections,
      'SurvivalEquipmentTierPolicyDefinition tier collection closure',
    );
    for (const variant of tier.variants) {
      const priorCollection = runtimeToCollection.get(variant.runtimeEquipmentDefinitionId);
      if (priorCollection && priorCollection !== variant.collectionEquipmentDefinitionId) {
        throw new RangeError('SurvivalEquipmentTierPolicyDefinition runtime 不能映射多个 collection。');
      }
      runtimeToCollection.set(variant.runtimeEquipmentDefinitionId, variant.collectionEquipmentDefinitionId);
      const runtimes = runtimeByCollection.get(variant.collectionEquipmentDefinitionId) ?? new Set();
      if (runtimes.has(variant.runtimeEquipmentDefinitionId)) {
        throw new RangeError('SurvivalEquipmentTierPolicyDefinition 跨 level 不得复用 runtime ID。');
      }
      runtimes.add(variant.runtimeEquipmentDefinitionId);
      runtimeByCollection.set(variant.collectionEquipmentDefinitionId, runtimes);
    }
  }
  return Object.freeze({
    ...base,
    modeKind: MODE_KIND.SURVIVAL,
    supplyDefinitionId: assertNonEmptyString(
      source.supplyDefinitionId,
      'SurvivalEquipmentTierPolicyDefinition.supplyDefinitionId',
    ),
    tiers,
  });
}

function cloned(value: unknown, name: string): unknown {
  return cloneFrozenData(value, name);
}

export function createParticipantPolicyDefinition(value: unknown): ParticipantPolicyDefinition {
  return normalizeParticipant(cloned(value, 'ParticipantPolicyDefinition'));
}

export function createTimelinePolicyDefinition(value: unknown): TimelinePolicyDefinition {
  return normalizeTimeline(cloned(value, 'TimelinePolicyDefinition'));
}

export function createObjectivePolicyDefinition(value: unknown): ObjectivePolicyDefinition {
  return normalizeObjective(cloned(value, 'ObjectivePolicyDefinition'));
}

export function createEliminationPolicyDefinition(value: unknown): EliminationPolicyDefinition {
  return normalizeElimination(cloned(value, 'EliminationPolicyDefinition'));
}

export function createRespawnPolicyDefinition(value: unknown): RespawnPolicyDefinition {
  return normalizeRespawn(cloned(value, 'RespawnPolicyDefinition'));
}

export function createRelationshipPolicyDefinition(value: unknown): RelationshipPolicyDefinition {
  return normalizeRelationship(cloned(value, 'RelationshipPolicyDefinition'));
}

export function createResultPolicyDefinition(value: unknown): ResultPolicyDefinition {
  return normalizeResult(cloned(value, 'ResultPolicyDefinition'));
}

export function createSurvivalPressurePolicyDefinition(
  value: unknown,
): SurvivalPressurePolicyDefinition {
  return normalizePressure(cloned(value, 'SurvivalPressurePolicyDefinition'));
}

export function createSurvivalEquipmentTierPolicyDefinition(
  value: unknown,
): SurvivalEquipmentTierPolicyDefinition {
  return normalizeTier(cloned(value, 'SurvivalEquipmentTierPolicyDefinition'));
}

export function createModePolicyDefinition(value: unknown): ModePolicyDefinition {
  const source = cloned(value, 'ModePolicyDefinition');
  const record = assertPlainRecord(source, 'ModePolicyDefinition');
  const signatures = POLICY_SIGNATURES.filter(({ key }) => Object.hasOwn(record, key));
  if (signatures.length !== 1) {
    throw new TypeError('ModePolicyDefinition 必须精确匹配九类 Policy 之一。');
  }
  switch (signatures[0]!.type) {
    case MODE_POLICY_TYPE.PARTICIPANT: return normalizeParticipant(record);
    case MODE_POLICY_TYPE.TIMELINE: return normalizeTimeline(record);
    case MODE_POLICY_TYPE.OBJECTIVE: return normalizeObjective(record);
    case MODE_POLICY_TYPE.ELIMINATION: return normalizeElimination(record);
    case MODE_POLICY_TYPE.RESPAWN: return normalizeRespawn(record);
    case MODE_POLICY_TYPE.RELATIONSHIP: return normalizeRelationship(record);
    case MODE_POLICY_TYPE.RESULT: return normalizeResult(record);
    case MODE_POLICY_TYPE.SURVIVAL_PRESSURE: return normalizePressure(record);
    case MODE_POLICY_TYPE.SURVIVAL_EQUIPMENT_TIER: return normalizeTier(record);
  }
}

export function getModePolicyType(definition: ModePolicyDefinition): ModePolicyType {
  const record = definition as unknown as Record<string, unknown>;
  const signature = POLICY_SIGNATURES.find(({ key }) => Object.hasOwn(record, key));
  if (!signature) throw new TypeError('未知 ModePolicyDefinition 类型。');
  return signature.type;
}
