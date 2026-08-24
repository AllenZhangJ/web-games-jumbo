import {
  ACTION_EFFECT_TRIGGER,
  ACTION_LANE,
  type ActionDefinition,
  type EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
  ActionResolver,
} from './action-resolver.js';
import { ARENA_ACTION_PHASE } from './action-state.js';
import { ActionExecutionSystem } from './action-execution-system.js';
import type { ActionStateSnapshot } from './action-execution-system.js';
import {
  ARENA_RULE_ENGINE_CHECKPOINT_V1_SCHEMA_VERSION,
  createArenaRuleEngineCheckpointV1,
  validateArenaRuleEngineCheckpointV1,
  type ArenaRuleEngineCheckpointV1,
} from './arena-rule-engine-checkpoint-v1.js';
import {
  ActionAffordanceProjector,
  assertActionAffordanceProfile,
  type ActionAffordance,
  type ActionAffordanceProfile,
  type ActionAffordanceProfileResult,
  type BotMobilityAffordance,
  type LocalActionAffordance,
} from './action-affordance.js';
import { ACTION_RULE_COMMAND } from './default-effect-handlers.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type ArenaInputFrame,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import type { ActionCandidate } from './action-candidate.js';
import type {
  ActionRegistryContract,
  ActionResolution,
} from './action-resolver.js';
import type {
  ActionStart,
  ActionTransition,
} from './action-execution-system.js';
import type { ActionEffectRegistry, RuleCommand } from './action-effect-registry.js';
import type { TargetingRegistry } from './targeting-registry.js';
import type { RuleCommandRegistry } from './rule-command-registry.js';

type UnknownRecord = Readonly<Record<string, unknown>>;

export interface RuleActor {
  readonly id: string;
  readonly canAct: boolean;
  readonly targetable: boolean;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly facing: Readonly<{ x: number; z: number }>;
}

export interface EquipmentRegistryContract {
  require(id: string): EquipmentDefinition;
  list(): readonly EquipmentDefinition[];
}

export interface RuleEquipmentPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RuleEquipmentSnapshot {
  readonly schemaVersion: number;
  readonly instanceId: string;
  readonly definitionId: string;
  readonly spawnId: string;
  readonly locationState: string;
  readonly ownerId: string | null;
  readonly position: RuleEquipmentPosition | null;
  readonly originPosition: RuleEquipmentPosition;
  readonly lastSafePosition: RuleEquipmentPosition | null;
  readonly cooldownRemainingTicks: number;
  readonly revision: number;
}

export interface RuleEquipmentPickupDecision {
  readonly participantId: string;
  readonly equipmentInstanceId: string;
}

export interface RuleEquipmentDropResult {
  readonly participantId: string;
  readonly equipment: RuleEquipmentSnapshot;
  readonly fallbackUsed: boolean;
  readonly despawned: boolean;
  readonly diagnosticCode: string | null;
}

export interface EquipmentSystemContract {
  getActionCandidate(participantId: string): ActionCandidate | null;
  getAerialActionCandidate(participantId: string): ActionCandidate | null;
  assertActionCanStart(participantId: string, actionDefinitionId: string): unknown;
  markActionStarted(participantId: string, actionDefinitionId: string): unknown;
  advanceCooldowns(): readonly unknown[];
  spawn(options: unknown): RuleEquipmentSnapshot;
  resolvePickups(options: unknown): readonly RuleEquipmentPickupDecision[];
  updateLastSafePosition(
    participantId: string,
    position: unknown,
  ): RuleEquipmentSnapshot | null;
  dropOwned(participantId: string, options: unknown): RuleEquipmentDropResult | null;
  despawnInvalidWorldEquipment(options: unknown): readonly RuleEquipmentSnapshot[];
  getHeldEquipment(participantId: string): RuleEquipmentSnapshot | null;
  getSnapshot(instanceId: string): RuleEquipmentSnapshot;
  listSnapshots(): readonly RuleEquipmentSnapshot[];
  listExpiredHeldSupplyEquipmentInstanceIds(): readonly string[];
  exportCheckpointV1?(): DeepReadonly<unknown>;
  applySupplyTimelinePhase?(options: unknown): unknown;
  resolveSupplyPickups?(options: unknown): unknown;
  destroy(): void;
}

export interface MovementCapabilities {
  readonly participantId: string;
  readonly canBeginDownSmash: boolean;
}

export interface MovementCandidateProviderContract {
  getCandidates(capabilities: MovementCapabilities): readonly ActionCandidate[];
}

export interface MovementCommandAdapter {
  isCommandKind(kind: unknown): boolean;
  createCommand(command: RuleCommand): unknown;
}

export interface RuleTargetEligibilityContract {
  readonly contentHash: string;
  allowsTarget(sourceParticipantId: string, targetParticipantId: string): boolean;
}

export interface ArenaRuleEngineOptions {
  readonly participantIds: readonly string[];
  readonly baseActionDefinitionId: string;
  readonly baseAirActionDefinitionId: string;
  readonly actionRegistry: ActionRegistryContract & { list(): readonly ActionDefinition[] };
  readonly equipmentRegistry: EquipmentRegistryContract;
  readonly targetingRegistry: TargetingRegistry;
  readonly effectRegistry: ActionEffectRegistry;
  readonly commandRegistry: RuleCommandRegistry;
  readonly movementCandidateProvider: MovementCandidateProviderContract;
  readonly targetEligibility?: RuleTargetEligibilityContract;
  readonly createEquipmentSystem: (options: {
    readonly participantIds: readonly string[];
    readonly actionRegistry: ActionRegistryContract & { list(): readonly ActionDefinition[] };
    readonly equipmentRegistry: EquipmentRegistryContract;
    readonly checkpoint?: DeepReadonly<unknown>;
  }) => EquipmentSystemContract;
  readonly movementCommandAdapter: MovementCommandAdapter;
  readonly allowBaseAttackWhiff?: boolean;
  readonly checkpoint?: unknown;
}

export interface ArenaRuleEngineContract {
  advanceTimers(): ArenaRuleTimerAdvance;
  resolveActions(options: unknown): ArenaRuleBatch;
  resolveActiveActions(options: unknown): ArenaRuleBatch;
  commit(batch: ArenaRuleBatch, ports: RuleMutationPorts): void;
  resetParticipant(participantId: string): void;
  getActionSnapshot(participantId: string): ActionStateSnapshot;
  getHeldEquipment(participantId: string): RuleEquipmentSnapshot | null;
  getEquipmentSnapshot(instanceId: string): RuleEquipmentSnapshot;
  listEquipmentSnapshots(): readonly RuleEquipmentSnapshot[];
  listExpiredHeldSupplyEquipmentInstanceIds(): readonly string[];
  applyEquipmentSupplyTimelinePhase?(options: unknown): unknown;
  resolveEquipmentSupplyPickups?(options: unknown): unknown;
  spawnEquipment(options: unknown): RuleEquipmentSnapshot;
  resolveEquipmentPickups(options: unknown): readonly RuleEquipmentPickupDecision[];
  updateEquipmentLastSafePosition(
    participantId: string,
    position: unknown,
  ): RuleEquipmentSnapshot | null;
  dropEquipment(participantId: string, options: unknown): RuleEquipmentDropResult | null;
  despawnInvalidWorldEquipment(options: unknown): readonly RuleEquipmentSnapshot[];
  requireEquipmentDefinition(definitionId: string): EquipmentDefinition;
  getContentHash(): string;
  getMovementActionCandidates(capabilities: MovementCapabilities): readonly ActionCandidate[];
  getActionAffordance(options: unknown): ActionAffordance;
  getActionAffordanceProfile(
    options: unknown,
    profile: 'local-context-primary',
  ): LocalActionAffordance;
  getActionAffordanceProfile(
    options: unknown,
    profile: 'bot-mobility',
  ): BotMobilityAffordance;
  getActionAffordanceProfile(
    options: unknown,
    profile: 'full-audit',
  ): ActionAffordance;
  getActionAffordanceProfile(
    options: unknown,
    profile: ActionAffordanceProfile,
  ): ActionAffordanceProfileResult;
  getParticipantActionRule(participantId: string): PublicActionRule;
  exportCheckpointV1?(): ArenaRuleEngineCheckpointV1;
  destroy(): void;
}

interface EnrichedRuleCommand extends RuleCommand {
  readonly sourceParticipantId?: string;
  readonly targetParticipantId: string;
  readonly effectKind?: string;
  readonly impulse?: Readonly<{ x: number; y: number; z: number }>;
  readonly hitSequence?: number;
}

interface GuardCommand extends EnrichedRuleCommand {
  readonly participantId: string;
  readonly minimumFacingDot: number;
  readonly impulseMultiplier: number;
  readonly cancelledEffectKinds: readonly string[];
}

export interface RuleHit {
  readonly attackerId: string;
  readonly targetId: string;
  readonly actionDefinitionId: string;
}

export interface ArenaRuleDomainEvent extends UnknownRecord {
  readonly type: string;
}

export interface ArenaRuleBatch {
  readonly resolutions: readonly ActionResolution[];
  readonly starts: readonly ActionStart[];
  readonly hits: readonly RuleHit[];
  readonly commands: readonly DeepReadonly<EnrichedRuleCommand>[];
  readonly movementCommands: readonly unknown[];
  readonly events: readonly ArenaRuleDomainEvent[];
}

export interface ArenaRuleTimerAdvance {
  readonly actionTransitions: readonly ActionTransition[];
  readonly equipmentCooldowns: readonly unknown[];
}

type ArenaRuleEngineOperation = 'commit' | 'destroy';

export const ARENA_RULE_ENGINE_COMMIT_GUARD_V1 = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  publicCallsRejectCommitIntermediateState: true,
  mutationPortsCheckedAfterEveryCallback: true,
  swallowedPortReentryStopsLaterMutationPorts: true,
  authorityCommitChecksStickyReentryFact: true,
  postCommitReentryFailsClosed: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  validationStatus: 'not-run',
} as const);

export interface PublicActionRule {
  readonly definitionId: string;
  readonly targetingKind: string;
  readonly range: number;
  readonly minimumFacingDot: number;
  readonly maximumVerticalDifference: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  /** Zero means a press action; positive values are the authority minimum before release. */
  readonly minimumCommitmentTicks: number;
}

export interface RuleImpulse {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RuleMutationPorts {
  readonly recordHit: (attackerId: string, targetId: string, actionDefinitionId: string) => unknown;
  readonly applyHitstun: (participantId: string, ticks: number) => unknown;
  readonly applyImpulse: (participantId: string, impulse: RuleImpulse) => unknown;
}

interface RuleCommitBatch {
  readonly hits: readonly RuleHit[];
  readonly commands: readonly RuleCommand[];
}

function requireMapValue<K, V>(map: ReadonlyMap<K, V>, key: K, message: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(message);
  return value;
}

function requireActorById(
  actors: readonly RuleActor[],
  participantId: string,
  context: string,
): RuleActor {
  const actor = actors.find(({ id }) => id === participantId);
  if (!actor) throw new Error(`${context} ${participantId} 缺少 RuleActor。`);
  return actor;
}

function projectCommittedActionFacing(
  action: ActionStateSnapshot,
  actor: RuleActor,
): RuleActor {
  const facing = action.commitment?.facingAtResult;
  if (!facing) return actor;
  return Object.freeze({
    ...actor,
    facing: Object.freeze({ x: facing.x, z: facing.z }),
  });
}

export const ARENA_RULE_EVENT = Object.freeze({
  ACTION_STARTED: 'ActionStarted',
  ACTION_COMMITMENT_CANCELLED: 'ActionCommitmentCancelled',
  ACTION_COMMITMENT_COMMITTED: 'ActionCommitmentCommitted',
  HIT_RESOLVED: 'HitResolved',
  KNOCKBACK_APPLIED: 'KnockbackApplied',
});

const RESOLVE_ACTION_KEYS = new Set([
  'tick',
  'actors',
  'inputFrames',
  'additionalCandidates',
]);
const ADDITIONAL_CANDIDATE_ENTRY_KEYS = new Set(['participantId', 'candidates']);
const RESOLVE_ACTIVE_KEYS = new Set(['actors']);
const AFFORDANCE_KEYS = new Set([
  'tick',
  'participantId',
  'actors',
  'additionalCandidates',
]);
const UNSAFE_AFFORDANCE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function snapshotAffordanceOptions(value: unknown): Record<string, unknown> {
  const record = assertPlainRecord(value, 'ArenaRuleEngine action affordance options');
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string') {
      throw new TypeError('ArenaRuleEngine action affordance options 不能包含 Symbol 字段。');
    }
    if (UNSAFE_AFFORDANCE_KEYS.has(key) || !AFFORDANCE_KEYS.has(key)) {
      throw new RangeError(`ArenaRuleEngine action affordance options 不支持字段 ${key}。`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(
        `ArenaRuleEngine action affordance options.${key} 必须是可枚举数据字段。`,
      );
    }
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}
const COMMIT_KEYS = new Set(['recordHit', 'applyHitstun', 'applyImpulse']);
const ACTOR_KEYS = new Set(['id', 'canAct', 'targetable', 'position', 'facing']);
const INPUT_FRAME_KEYS = new Set([
  'tick',
  'participantId',
  'moveX',
  'moveZ',
  'primaryPressed',
  'primaryHeld',
  'jumpPressed',
  'jumpHeld',
  'slamPressed',
]);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const FACING_KEYS = new Set(['x', 'z']);
const REQUIRED_ENGINE_METHODS = Object.freeze([
  'advanceTimers',
  'resolveActions',
  'resolveActiveActions',
  'commit',
  'resetParticipant',
  'getActionSnapshot',
  'getHeldEquipment',
  'getEquipmentSnapshot',
  'listEquipmentSnapshots',
  'listExpiredHeldSupplyEquipmentInstanceIds',
  'spawnEquipment',
  'resolveEquipmentPickups',
  'updateEquipmentLastSafePosition',
  'dropEquipment',
  'despawnInvalidWorldEquipment',
  'requireEquipmentDefinition',
  'getContentHash',
  'getMovementActionCandidates',
  'getActionAffordance',
  'getActionAffordanceProfile',
  'getParticipantActionRule',
  'destroy',
]);
const MAX_CONTRACT_PROTOTYPE_DEPTH = 32;
const REQUIRED_EQUIPMENT_SYSTEM_METHODS = Object.freeze([
  'getActionCandidate', 'getAerialActionCandidate', 'assertActionCanStart',
  'markActionStarted', 'advanceCooldowns', 'spawn', 'resolvePickups',
  'updateLastSafePosition', 'dropOwned', 'despawnInvalidWorldEquipment',
  'getHeldEquipment', 'getSnapshot', 'listSnapshots', 'destroy',
  'listExpiredHeldSupplyEquipmentInstanceIds',
]);

function findContractDataMethod(
  value: object,
  methodName: string,
  ownerName: string,
): ((...arguments_: unknown[]) => unknown) | null {
  const visited = new Set<object>();
  let target: object | null = value;
  for (
    let depth = 0;
    target !== null && depth < MAX_CONTRACT_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(target)) throw new TypeError(`${ownerName} prototype 链不能循环。`);
    visited.add(target);
    const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
    if (descriptor !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`${ownerName}.${methodName} 必须是数据方法。`);
      }
      return typeof descriptor.value === 'function'
        ? descriptor.value as (...arguments_: unknown[]) => unknown
        : null;
    }
    target = Object.getPrototypeOf(target) as object | null;
  }
  if (target !== null) {
    throw new RangeError(
      `${ownerName} prototype 链超过 ${MAX_CONTRACT_PROTOTYPE_DEPTH} 层。`,
    );
  }
  return null;
}

function assertEquipmentSystem(value: unknown): EquipmentSystemContract {
  if (!value || typeof value !== 'object') {
    throw new TypeError('createEquipmentSystem 必须返回对象。');
  }
  const candidate = value as UnknownRecord;
  for (const method of REQUIRED_EQUIPMENT_SYSTEM_METHODS) {
    if (typeof candidate[method] !== 'function') {
      try {
        if (typeof candidate.destroy === 'function') candidate.destroy();
      } catch (cleanupError) {
        throw new AggregateError(
          [new TypeError(`EquipmentSystem 缺少 ${method}()。`), cleanupError],
          'EquipmentSystem 合同校验与清理均失败。',
        );
      }
      throw new TypeError(`EquipmentSystem 缺少 ${method}()。`);
    }
  }
  return candidate as unknown as EquipmentSystemContract;
}

export function assertArenaRuleEngine(engine: unknown): ArenaRuleEngineContract {
  if (!engine || typeof engine !== 'object') throw new TypeError('ruleEngineFactory 必须返回对象。');
  for (const method of REQUIRED_ENGINE_METHODS) {
    if (findContractDataMethod(engine, method, 'ruleEngineFactory 返回值') === null) {
      throw new TypeError(`ruleEngineFactory 返回值缺少 ${method}()。`);
    }
  }
  return engine as ArenaRuleEngineContract;
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cloneActor(value: unknown, index: number): RuleActor {
  const name = `RuleActor[${index}]`;
  assertKnownKeys(value, ACTOR_KEYS, name);
  const id = assertNonEmptyString(value.id, `${name}.id`);
  if (typeof value.canAct !== 'boolean' || typeof value.targetable !== 'boolean') {
    throw new TypeError(`${name}.canAct/targetable 必须是布尔值。`);
  }
  assertKnownKeys(value.position, POSITION_KEYS, `${name}.position`);
  assertKnownKeys(value.facing, FACING_KEYS, `${name}.facing`);
  const position: Record<string, number> = {};
  for (const axis of POSITION_KEYS) {
    if (!Number.isFinite(value.position[axis])) {
      throw new TypeError(`${name}.position.${axis} 必须是有限数。`);
    }
    position[axis] = value.position[axis] as number;
  }
  const facing: Record<string, number> = {};
  for (const axis of FACING_KEYS) {
    if (!Number.isFinite(value.facing[axis])) {
      throw new TypeError(`${name}.facing.${axis} 必须是有限数。`);
    }
    facing[axis] = value.facing[axis] as number;
  }
  if (Math.hypot(facing.x ?? 0, facing.z ?? 0) < 1e-7) {
    throw new RangeError(`${name}.facing 不能为零。`);
  }
  return Object.freeze({
    id,
    canAct: value.canAct,
    targetable: value.targetable,
    position: Object.freeze(position) as RuleActor['position'],
    facing: Object.freeze(facing) as RuleActor['facing'],
  }) as RuleActor;
}

function enrichCommand<T extends UnknownRecord>(
  command: RuleCommand,
  metadata: T,
): DeepReadonly<RuleCommand & T> {
  return cloneFrozenData({ ...command, ...metadata }, 'RuleCommand') as DeepReadonly<RuleCommand & T>;
}

function createBaseCandidate(actionDefinitionId: string, available: boolean): ActionCandidate {
  return Object.freeze({
    id: `base:${actionDefinitionId}`,
    actionDefinitionId,
    source: 'base-action-provider',
    priority: ACTION_PRIORITY.BASE,
    available,
    blocksFallback: false,
    unavailableReason: available ? null : 'no-base-action-target',
  });
}

function snapshotDataArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    !lengthDescriptor
    || lengthDescriptor.enumerable
    || !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value')
    || !Number.isSafeInteger(lengthDescriptor.value)
    || (lengthDescriptor.value as number) < 0
  ) throw new TypeError(`${name}.length 必须是非负安全整数数据字段。`);
  const length = lengthDescriptor.value as number;
  const expectedKeys = new Set<string>(['length']);
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    expectedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}[${index}] 必须是可枚举数据字段。`);
    result.push(descriptor.value);
  }
  const actualKeys = new Set(keys);
  if (
    actualKeys.size !== keys.length
    || actualKeys.size !== expectedKeys.size
    || keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))
  ) {
    throw new TypeError(`${name} 不能包含额外字段或隐藏索引。`);
  }
  return Object.freeze(result);
}

function snapshotKnownDataRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new TypeError(`${name} 不能包含 Symbol 字段。`);
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    Object.defineProperty(result, key, {
      configurable: false,
      enumerable: true,
      value: descriptor.value,
      writable: false,
    });
  }
  return Object.freeze(result);
}

function cloneAdditionalCandidates(
  values: unknown,
  participantIds: readonly string[],
): ReadonlyMap<string, readonly unknown[]> {
  if (values === undefined) {
    return new Map<string, readonly unknown[]>(
      participantIds.map((id) => [id, Object.freeze([])] as const),
    );
  }
  const entries = snapshotDataArray(values, 'additionalCandidates');
  const result = new Map<string, readonly unknown[]>(
    participantIds.map((id) => [id, Object.freeze([])] as const),
  );
  const seen = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = snapshotKnownDataRecord(
      entries[index],
      ADDITIONAL_CANDIDATE_ENTRY_KEYS,
      `additionalCandidates[${index}]`,
    );
    const participantId = assertNonEmptyString(
      entry.participantId,
      `additionalCandidates[${index}].participantId`,
    );
    if (!result.has(participantId)) {
      throw new RangeError(`additionalCandidates 包含未知 participant ${participantId}。`);
    }
    if (seen.has(participantId)) {
      throw new RangeError(`additionalCandidates 包含重复 participant ${participantId}。`);
    }
    const candidates = snapshotDataArray(
      entry.candidates,
      `additionalCandidates[${index}].candidates`,
    );
    seen.add(participantId);
    result.set(participantId, candidates);
  }
  return result;
}

function createPublicActionRule(definition: ActionDefinition): PublicActionRule {
  const parameters = definition.targeting.parameters as UnknownRecord;
  if (!Number.isFinite(parameters.range) || !Number.isFinite(parameters.maximumVerticalDifference)) {
    throw new Error(`ActionDefinition ${definition.id} 缺少公共 targeting 数值。`);
  }
  return Object.freeze({
    definitionId: definition.id,
    targetingKind: definition.targeting.kind,
    range: parameters.range as number,
    minimumFacingDot: Number.isFinite(parameters.minimumFacingDot)
      ? parameters.minimumFacingDot as number
      : -1,
    maximumVerticalDifference: parameters.maximumVerticalDifference as number,
    windupTicks: definition.timing.windupTicks,
    activeTicks: definition.timing.activeTicks,
    recoveryTicks: definition.timing.recoveryTicks,
    minimumCommitmentTicks: definition.commitment?.commitTicks ?? 0,
  });
}

function applyFrontGuards(
  commands: readonly EnrichedRuleCommand[],
  guards: readonly GuardCommand[],
  actorsById: ReadonlyMap<string, RuleActor>,
): readonly DeepReadonly<EnrichedRuleCommand>[] {
  const guardByParticipant = new Map(guards.map((guard) => [guard.participantId, guard]));
  const result: DeepReadonly<EnrichedRuleCommand>[] = [];
  for (const command of commands) {
    const guard = guardByParticipant.get(command.targetParticipantId);
    if (!guard || !command.sourceParticipantId) {
      result.push(command);
      continue;
    }
    const target = requireMapValue(
      actorsById,
      command.targetParticipantId,
      `guard target ${command.targetParticipantId} 缺少 actor。`,
    );
    const source = requireMapValue(
      actorsById,
      command.sourceParticipantId,
      `guard source ${command.sourceParticipantId} 缺少 actor。`,
    );
    const dx = source.position.x - target.position.x;
    const dz = source.position.z - target.position.z;
    const distance = Math.hypot(dx, dz);
    const facingLength = Math.hypot(target.facing.x, target.facing.z);
    const facingDot = distance > 1e-7
      ? (dx / distance) * (target.facing.x / facingLength)
        + (dz / distance) * (target.facing.z / facingLength)
      : 1;
    if (facingDot < guard.minimumFacingDot) {
      result.push(command);
      continue;
    }
    if (
      command.effectKind !== undefined
      && guard.cancelledEffectKinds.includes(command.effectKind)
    ) continue;
    if (command.kind === ACTION_RULE_COMMAND.APPLY_IMPULSE) {
      if (!command.impulse) throw new TypeError('apply-impulse RuleCommand 缺少 impulse。');
      result.push(cloneFrozenData({
        ...command,
        impulse: {
          x: command.impulse.x * guard.impulseMultiplier,
          y: command.impulse.y * guard.impulseMultiplier,
          z: command.impulse.z * guard.impulseMultiplier,
        },
      }, 'guarded RuleCommand'));
    } else {
      result.push(command);
    }
  }
  return Object.freeze(result);
}

export class ArenaRuleEngine {
  readonly #participantIds: readonly string[];
  readonly #baseActionDefinitionId: string;
  readonly #baseAirActionDefinitionId: string;
  readonly #actionRegistry: ArenaRuleEngineOptions['actionRegistry'];
  readonly #actionResolver: ActionResolver;
  readonly #actionExecution: ActionExecutionSystem;
  readonly #movementCandidateProvider: MovementCandidateProviderContract;
  readonly #movementCommandAdapter: MovementCommandAdapter;
  readonly #targetEligibility: Readonly<{
    readonly contentHash: string;
    readonly allowedPairs: readonly string[];
  }> | null;
  readonly #actionAffordanceProjector: ActionAffordanceProjector;
  readonly #targetingRegistry: TargetingRegistry;
  readonly #effectRegistry: ActionEffectRegistry;
  readonly #commandRegistry: RuleCommandRegistry;
  readonly #equipmentRegistry: EquipmentRegistryContract;
  readonly #equipmentSystem: EquipmentSystemContract;
  readonly #allowBaseAttackWhiff: boolean;
  readonly #contentHash: string;
  #destroyed: boolean;
  #failed: boolean;
  #operation: ArenaRuleEngineOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;

  static restoreFromCheckpointV1(
    checkpointValue: unknown,
    options: Omit<
      ArenaRuleEngineOptions,
      | 'participantIds'
      | 'baseActionDefinitionId'
      | 'baseAirActionDefinitionId'
      | 'allowBaseAttackWhiff'
      | 'checkpoint'
    >,
  ): ArenaRuleEngine {
    const checkpoint = validateArenaRuleEngineCheckpointV1(checkpointValue);
    return new ArenaRuleEngine({
      ...options,
      participantIds: checkpoint.participantIds,
      baseActionDefinitionId: checkpoint.baseActionDefinitionId,
      baseAirActionDefinitionId: checkpoint.baseAirActionDefinitionId,
      allowBaseAttackWhiff: checkpoint.allowBaseAttackWhiff,
      checkpoint,
    });
  }

  constructor({
    participantIds,
    baseActionDefinitionId,
    baseAirActionDefinitionId,
    actionRegistry,
    equipmentRegistry,
    targetingRegistry,
    effectRegistry,
    commandRegistry,
    movementCandidateProvider,
    targetEligibility,
    createEquipmentSystem,
    movementCommandAdapter,
    allowBaseAttackWhiff = false,
    checkpoint: checkpointValue,
  }: ArenaRuleEngineOptions) {
    if (
      !Array.isArray(participantIds)
      || participantIds.length === 0
      || new Set(participantIds).size !== participantIds.length
    ) throw new RangeError('ArenaRuleEngine participantIds 无效。');
    this.#participantIds = Object.freeze([...participantIds].sort(compareStrings));
    const checkpoint = checkpointValue === undefined
      ? null
      : validateArenaRuleEngineCheckpointV1(checkpointValue);
    if (
      checkpoint !== null
      && (
        checkpoint.participantIds.length !== this.#participantIds.length
        || checkpoint.participantIds.some((id, index) => id !== this.#participantIds[index])
      )
    ) throw new RangeError('ArenaRuleEngine checkpoint participantIds不一致。');
    this.#baseActionDefinitionId = assertNonEmptyString(
      baseActionDefinitionId,
      'baseActionDefinitionId',
    );
    this.#actionRegistry = actionRegistry;
    this.#actionRegistry.require(this.#baseActionDefinitionId);
    this.#baseAirActionDefinitionId = assertNonEmptyString(
      baseAirActionDefinitionId,
      'baseAirActionDefinitionId',
    );
    this.#actionRegistry.require(this.#baseAirActionDefinitionId);
    if (
      checkpoint !== null
      && (
        checkpoint.baseActionDefinitionId !== this.#baseActionDefinitionId
        || checkpoint.baseAirActionDefinitionId !== this.#baseAirActionDefinitionId
      )
    ) throw new RangeError('ArenaRuleEngine checkpoint基础动作身份不一致。');
    targetingRegistry.validateActionRegistry(actionRegistry);
    effectRegistry.validateActionRegistry(actionRegistry);
    if (!commandRegistry || typeof commandRegistry.execute !== 'function') {
      throw new TypeError('ArenaRuleEngine 需要 RuleCommandRegistry。');
    }
    this.#actionResolver = new ActionResolver({ actionRegistry });
    if (!movementCandidateProvider || typeof movementCandidateProvider.getCandidates !== 'function') {
      throw new TypeError('ArenaRuleEngine 需要 movementCandidateProvider.getCandidates()。');
    }
    this.#movementCandidateProvider = movementCandidateProvider;
    if (targetEligibility === undefined) {
      this.#targetEligibility = null;
    } else {
      const targetEligibilityRecord = assertPlainRecord(
        targetEligibility,
        'ArenaRuleEngine targetEligibility',
      );
      assertKnownKeys(
        targetEligibilityRecord,
        new Set(['contentHash', 'allowsTarget']),
        'ArenaRuleEngine targetEligibility',
      );
      const contentHashDescriptor = Object.getOwnPropertyDescriptor(
        targetEligibilityRecord,
        'contentHash',
      );
      const allowsTargetDescriptor = Object.getOwnPropertyDescriptor(
        targetEligibilityRecord,
        'allowsTarget',
      );
      if (
        !contentHashDescriptor
        || !contentHashDescriptor.enumerable
        || !Object.hasOwn(contentHashDescriptor, 'value')
        || typeof contentHashDescriptor.value !== 'string'
        || !/^[0-9a-f]{8}$/u.test(contentHashDescriptor.value)
        || !allowsTargetDescriptor
        || !allowsTargetDescriptor.enumerable
        || !Object.hasOwn(allowsTargetDescriptor, 'value')
        || typeof allowsTargetDescriptor.value !== 'function'
      ) throw new TypeError('ArenaRuleEngine targetEligibility无效。');
      const allowsTarget = allowsTargetDescriptor.value as RuleTargetEligibilityContract[
        'allowsTarget'
      ];
      const allowedPairs: string[] = [];
      for (const sourceParticipantId of this.#participantIds) {
        for (const targetParticipantId of this.#participantIds) {
          if (sourceParticipantId === targetParticipantId) continue;
          const result = allowsTarget(
            sourceParticipantId,
            targetParticipantId,
          );
          if (typeof result !== 'boolean') {
            throw new TypeError('ArenaRuleEngine targetEligibility必须返回布尔值。');
          }
          if (result) allowedPairs.push(`${sourceParticipantId}\0${targetParticipantId}`);
        }
      }
      this.#targetEligibility = Object.freeze({
        contentHash: contentHashDescriptor.value,
        allowedPairs: Object.freeze(allowedPairs.sort(compareStrings)),
      });
    }
    if (
      !movementCommandAdapter
      || typeof movementCommandAdapter.isCommandKind !== 'function'
      || typeof movementCommandAdapter.createCommand !== 'function'
    ) throw new TypeError('ArenaRuleEngine 需要 movementCommandAdapter。');
    this.#movementCommandAdapter = Object.freeze({
      isCommandKind: (kind: unknown) => movementCommandAdapter.isCommandKind(kind),
      createCommand: (command: RuleCommand) => movementCommandAdapter.createCommand(command),
    });
    if (typeof allowBaseAttackWhiff !== 'boolean') {
      throw new TypeError('ArenaRuleEngine.allowBaseAttackWhiff 必须是布尔值。');
    }
    this.#allowBaseAttackWhiff = allowBaseAttackWhiff;
    if (checkpoint !== null && checkpoint.allowBaseAttackWhiff !== this.#allowBaseAttackWhiff) {
      throw new RangeError('ArenaRuleEngine checkpoint allowBaseAttackWhiff不一致。');
    }
    this.#actionAffordanceProjector = new ActionAffordanceProjector({
      resolver: this.#actionResolver,
    });
    this.#targetingRegistry = targetingRegistry;
    this.#effectRegistry = effectRegistry;
    this.#commandRegistry = commandRegistry;
    this.#equipmentRegistry = equipmentRegistry;
    this.#contentHash = createDeterministicDataHash({
      actions: actionRegistry.list(),
      equipment: equipmentRegistry.list(),
      ...(allowBaseAttackWhiff ? { allowBaseAttackWhiff: true } : {}),
      ...(this.#targetEligibility === null ? {} : {
        targetEligibilityContentHash: this.#targetEligibility.contentHash,
        allowedTargetPairs: [...this.#targetEligibility.allowedPairs],
      }),
    }, 'Arena rule content');
    if (checkpoint !== null && checkpoint.contentHash !== this.#contentHash) {
      throw new RangeError('ArenaRuleEngine checkpoint规则内容身份不一致。');
    }
    this.#actionExecution = checkpoint === null
      ? new ActionExecutionSystem({ participantIds: this.#participantIds, actionRegistry })
      : ActionExecutionSystem.restoreFromCheckpointV1(
        checkpoint.actionExecutionCheckpoint,
        actionRegistry,
      );
    if (typeof createEquipmentSystem !== 'function') {
      throw new TypeError('ArenaRuleEngine 需要 createEquipmentSystem()。');
    }
    this.#equipmentSystem = assertEquipmentSystem(createEquipmentSystem({
      participantIds: this.#participantIds,
      actionRegistry,
      equipmentRegistry,
      ...(checkpoint === null ? {} : { checkpoint: checkpoint.equipmentCheckpoint }),
    }));
    this.#destroyed = false;
    this.#failed = false;
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
    Object.freeze(this);
  }

  requireEquipmentDefinition(definitionId: string): EquipmentDefinition {
    this.#assertUsable();
    return this.#equipmentRegistry.require(definitionId);
  }

  #assertUsable(): void {
    if (this.#operation !== null) throw this.#recordReentry('public-call');
    if (this.#destroyed) throw new Error('ArenaRuleEngine 已销毁。');
    if (this.#failed) throw new Error('ArenaRuleEngine 已失败，不能继续推进。');
  }

  #recordReentry(requestedOperation: ArenaRuleEngineOperation | 'public-call'): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `ArenaRuleEngine ${String(this.#operation)} 期间不可重入 ${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertOperationReady(
    operation: ArenaRuleEngineOperation,
    operationSequence: number,
    stage: string,
    postCommit = false,
  ): void {
    if (
      this.#operation !== operation
      || this.#operationSequence !== operationSequence
    ) {
      this.#failed = true;
      throw new Error(`ArenaRuleEngine ${stage}缺少${operation}操作所有权。`);
    }
    if (this.#reentryError === null) return;
    if (postCommit) this.#failed = true;
    throw this.#reentryError;
  }

  #runOperation<T>(
    operation: ArenaRuleEngineOperation,
    callback: (operationSequence: number) => T,
    options: Readonly<{ allowDestroyed?: boolean; allowFailed?: boolean }> = {},
  ): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const operationSequence = this.#operationSequence;
    this.#reentryError = null;
    try {
      if (!options.allowDestroyed && this.#destroyed) {
        throw new Error('ArenaRuleEngine 已销毁。');
      }
      if (!options.allowFailed && this.#failed) {
        throw new Error('ArenaRuleEngine 已失败，不能继续推进。');
      }
      const result = callback(operationSequence);
      this.#assertOperationReady(operation, operationSequence, operation, true);
      return result;
    } catch (error) {
      if (this.#reentryError !== null) {
        this.#failed = true;
        throw this.#reentryError;
      }
      throw error;
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertAuthorityCommitReady(
    operationSequence: number,
    stage: string,
    postCommit = false,
  ): void {
    this.#assertOperationReady('commit', operationSequence, stage, postCommit);
  }

  #useMutationPortChecked<T>(
    operationSequence: number,
    stage: string,
    callback: () => T,
  ): T {
    this.#assertAuthorityCommitReady(operationSequence, `${stage}调用前`);
    try {
      const result = callback();
      this.#assertAuthorityCommitReady(operationSequence, `${stage}返回后`, true);
      return result;
    } catch (error) {
      this.#assertAuthorityCommitReady(operationSequence, `${stage}异常后`, true);
      throw error;
    }
  }

  #cloneActors(actors: unknown): readonly RuleActor[] {
    if (!Array.isArray(actors) || actors.length !== this.#participantIds.length) {
      throw new RangeError('ArenaRuleEngine actors 必须覆盖全部 participants。');
    }
    const result = actors.map(cloneActor).sort((left, right) => compareStrings(left.id, right.id));
    if (
      new Set(result.map(({ id }) => id)).size !== result.length
      || result.some(({ id }, index) => id !== this.#participantIds[index])
    ) throw new RangeError('ArenaRuleEngine actor IDs 与 participantIds 不一致。');
    return Object.freeze(result);
  }

  #createCandidates(
    participantId: string,
    actors: readonly RuleActor[],
    additionalCandidates: readonly unknown[] = [],
  ): readonly unknown[] {
    const actor = requireActorById(actors, participantId, 'participant');
    const baseDefinition = this.#actionRegistry.require(this.#baseActionDefinitionId);
    const baseTargets = this.#targetingRegistry.resolve({
      definition: baseDefinition,
      source: actor,
      candidates: this.#eligibleTargets(participantId, actors),
    });
    // The production explicit-control mode treats a whiff as a real attack;
    // range/facing still resolve only on active ticks. The legacy contextual
    // primary mapper retains target-gated fallback so its one button can still
    // mean jump when combat has no target.
    const candidates: unknown[] = [createBaseCandidate(
      this.#baseActionDefinitionId,
      this.#allowBaseAttackWhiff || baseTargets.length > 0,
    )];
    const equipmentCandidate = this.#equipmentSystem.getActionCandidate(participantId);
    if (equipmentCandidate) candidates.push(equipmentCandidate);
    candidates.push(...additionalCandidates);
    return Object.freeze(candidates);
  }

  #eligibleTargets(
    sourceParticipantId: string,
    actors: readonly RuleActor[],
  ): readonly RuleActor[] {
    return Object.freeze(actors.filter(({ id, targetable }) => (
      id !== sourceParticipantId
      && targetable
      && (this.#targetEligibility === null
        || this.#targetEligibility.allowedPairs.includes(`${sourceParticipantId}\0${id}`))
    )));
  }

  advanceTimers(): ArenaRuleTimerAdvance {
    this.#assertUsable();
    return Object.freeze({
      actionTransitions: this.#actionExecution.advance(),
      equipmentCooldowns: this.#equipmentSystem.advanceCooldowns(),
    });
  }

  resolveActions(options: unknown): ArenaRuleBatch {
    this.#assertUsable();
    assertKnownKeys(options, RESOLVE_ACTION_KEYS, 'ArenaRuleEngine resolveActions options');
    const tick = assertIntegerAtLeast(options.tick, 0, 'ArenaRuleEngine tick');
    const actors = this.#cloneActors(options.actors);
    if (!Array.isArray(options.inputFrames)) throw new TypeError('inputFrames 必须是数组。');
    const frameById = new Map<string, ArenaInputFrame>();
    for (const frame of options.inputFrames) {
      assertKnownKeys(frame, INPUT_FRAME_KEYS, 'ArenaRuleEngine InputFrame');
      if (frame.tick !== tick) throw new RangeError(`InputFrame.tick 必须等于 ${tick}。`);
      if (!Number.isFinite(frame.moveX) || !Number.isFinite(frame.moveZ)) {
        throw new TypeError('InputFrame moveX/moveZ 必须是有限数。');
      }
      const participantId = assertNonEmptyString(frame.participantId, 'InputFrame.participantId');
      if (frameById.has(participantId)) throw new RangeError(`重复 InputFrame ${participantId}。`);
      if ([
        frame.primaryPressed,
        frame.primaryHeld,
        frame.jumpPressed,
        frame.jumpHeld,
        frame.slamPressed,
      ].some((value) => typeof value !== 'boolean')) {
        throw new TypeError('InputFrame 动作字段必须是布尔值。');
      }
      frameById.set(participantId, frame as unknown as ArenaInputFrame);
    }
    if (
      frameById.size !== this.#participantIds.length
      || this.#participantIds.some((id) => !frameById.has(id))
    ) throw new RangeError('ArenaRuleEngine inputFrames 必须覆盖全部 participants。');
    const additionalCandidates = cloneAdditionalCandidates(
      options.additionalCandidates,
      this.#participantIds,
    );
    const commitmentTransitions = this.#actionExecution.applyCommitmentInputs({
      tick,
      actors,
      inputFrames: Object.freeze(this.#participantIds.map((id) => requireMapValue(
        frameById,
        id,
        `缺少 ${id} InputFrame。`,
      ))),
    });
    const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
    const resolutions = this.#participantIds.map((participantId) => {
      const actor = requireMapValue(
        actorsById,
        participantId,
        `participant ${participantId} 缺少 RuleActor。`,
      );
      const candidates = this.#createCandidates(
        participantId,
        actors,
        additionalCandidates.get(participantId) ?? [],
      );
      const constraints = this.#actionExecution.getConstraints(participantId);
      const frame = requireMapValue(frameById, participantId, '缺少 InputFrame。');
      return this.#actionResolver.resolve({
        tick,
        participantId,
        canAct: actor.canAct,
        input: {
          primaryPressed: frame.primaryPressed,
          primaryHeld: frame.primaryHeld,
          jumpPressed: frame.jumpPressed,
          jumpHeld: frame.jumpHeld,
          slamPressed: frame.slamPressed,
        },
        candidates,
        occupiedLanes: constraints.occupiedLanes,
        activeConflictTags: constraints.activeConflictTags,
      });
    });
    const outcomes = resolutions.flatMap(({ outcomes: batchOutcomes }) => batchOutcomes);
    const selected = outcomes.filter(({ kind }) => kind === ACTION_RESOLUTION_KIND.SELECTED);
    for (const resolution of selected) {
      if (resolution.source === 'equipment-system') {
        this.#equipmentSystem.assertActionCanStart(
          resolution.participantId,
          assertNonEmptyString(resolution.actionDefinitionId, 'equipment actionDefinitionId'),
        );
      }
    }
    const starts = this.#actionExecution.start(selected);
    for (const resolution of selected) {
      if (resolution.source === 'equipment-system') {
        this.#equipmentSystem.markActionStarted(
          resolution.participantId,
          assertNonEmptyString(resolution.actionDefinitionId, 'equipment actionDefinitionId'),
        );
      }
    }
    const commands: EnrichedRuleCommand[] = [];
    const events: ArenaRuleDomainEvent[] = commitmentTransitions.map((transition) => Object.freeze({
      type: transition.kind === 'cancelled'
        ? ARENA_RULE_EVENT.ACTION_COMMITMENT_CANCELLED
        : ARENA_RULE_EVENT.ACTION_COMMITMENT_COMMITTED,
      participantId: transition.participantId,
      action: transition.actionDefinitionId,
      lane: transition.lane,
      chargeTicks: transition.chargeTicks,
      chargeLevel: transition.chargeLevel,
      facingAtStart: transition.facingAtStart,
      facingAtResult: transition.facingAtResult,
    }));
    for (const [index, start] of starts.entries()) {
      const definition = this.#actionRegistry.require(start.actionDefinitionId);
      const source = requireMapValue(
        actorsById,
        start.participantId,
        `action source ${start.participantId} 缺少 RuleActor。`,
      );
      events.push(Object.freeze({
        type: ARENA_RULE_EVENT.ACTION_STARTED,
        participantId: start.participantId,
        action: definition.id,
        lane: start.lane,
        source: start.source,
      }));
      for (const effect of definition.effects) {
        if (effect.trigger !== ACTION_EFFECT_TRIGGER.ACTION_STARTED) continue;
        const resolved = this.#effectRegistry.resolve(effect, {
          actionDefinitionId: definition.id,
          source,
        });
        for (let commandIndex = 0; commandIndex < resolved.length; commandIndex += 1) {
          const command = resolved[commandIndex];
          if (!command) throw new Error('ActionEffect 返回稀疏命令数组。');
          commands.push(enrichCommand(command, {
            sourceParticipantId: source.id,
            targetParticipantId: source.id,
            actionDefinitionId: definition.id,
            effectId: effect.id,
            sequence: `${index}:${commandIndex}`,
          }));
        }
      }
    }
    const movementCommands: unknown[] = [];
    const ruleCommands: EnrichedRuleCommand[] = [];
    for (const command of commands) {
      if (this.#movementCommandAdapter.isCommandKind(command.kind)) {
        movementCommands.push(this.#movementCommandAdapter.createCommand({
          kind: command.kind,
          participantId: command.participantId,
          actionDefinitionId: command.actionDefinitionId,
        }));
      } else {
        ruleCommands.push(command);
      }
    }
    return Object.freeze({
      resolutions: Object.freeze(outcomes),
      starts,
      hits: Object.freeze([]),
      commands: Object.freeze(ruleCommands),
      movementCommands: Object.freeze(movementCommands),
      events: Object.freeze(events),
    });
  }

  resolveActiveActions(options: unknown): ArenaRuleBatch {
    this.#assertUsable();
    assertKnownKeys(options, RESOLVE_ACTIVE_KEYS, 'ArenaRuleEngine resolveActive options');
    const actors = this.#cloneActors(options.actors);
    const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
    const active = this.#actionExecution.listAllSnapshots().filter(({ phase }) => (
      phase === ARENA_ACTION_PHASE.ACTIVE
    ));
    const guards: GuardCommand[] = [];
    for (const action of active) {
      const definition = this.#actionRegistry.require(assertNonEmptyString(
        action.definitionId,
        'active action definitionId',
      ));
      const source = projectCommittedActionFacing(action, requireMapValue(
        actorsById,
        action.participantId,
        `active source ${action.participantId} 缺少 RuleActor。`,
      ));
      for (const effect of definition.effects) {
        if (effect.trigger !== ACTION_EFFECT_TRIGGER.ACTION_ACTIVE) continue;
        for (const command of this.#effectRegistry.resolve(effect, {
          actionDefinitionId: definition.id,
          source,
        })) {
          if (command.kind !== ACTION_RULE_COMMAND.REGISTER_FRONT_GUARD) {
            throw new Error(`action-active effect ${effect.id} 必须产生 guard modifier。`);
          }
          guards.push(enrichCommand(command, {
            sourceParticipantId: source.id,
            targetParticipantId: source.id,
            actionDefinitionId: definition.id,
            effectId: effect.id,
          }) as unknown as GuardCommand);
        }
      }
    }

    const hits: RuleHit[] = [];
    const commands: EnrichedRuleCommand[] = [];
    for (const action of active) {
      const definition = this.#actionRegistry.require(assertNonEmptyString(
        action.definitionId,
        'active action definitionId',
      ));
      const source = projectCommittedActionFacing(action, requireMapValue(
        actorsById,
        action.participantId,
        `active source ${action.participantId} 缺少 RuleActor。`,
      ));
      const candidates = this.#eligibleTargets(source.id, actors);
      const targets = this.#targetingRegistry.resolve({ definition, source, candidates })
        .filter((targetId) => !action.hitTargetIds.includes(targetId));
      for (const targetId of targets) {
        const target = requireMapValue(
          actorsById,
          targetId,
          `target ${targetId} 缺少 RuleActor。`,
        );
        const hitSequence = hits.length;
        hits.push(Object.freeze({
          attackerId: source.id,
          targetId,
          actionDefinitionId: definition.id,
        }));
        for (const effect of definition.effects) {
          if (effect.trigger !== ACTION_EFFECT_TRIGGER.HIT_RESOLVED) continue;
          const resolved = this.#effectRegistry.resolve(effect, {
            actionDefinitionId: definition.id,
            source,
            target,
          });
          for (let commandIndex = 0; commandIndex < resolved.length; commandIndex += 1) {
            const command = resolved[commandIndex];
            if (!command) throw new Error('ActionEffect 返回稀疏命令数组。');
            commands.push(enrichCommand(command, {
              sourceParticipantId: source.id,
              targetParticipantId: target.id,
              actionDefinitionId: definition.id,
              effectId: effect.id,
              hitSequence,
              sequence: `${hitSequence}:${commandIndex}`,
            }));
          }
        }
      }
    }
    const guardedCommands = applyFrontGuards(commands, guards, actorsById);
    const events: ArenaRuleDomainEvent[] = [];
    for (const [hitIndex, hit] of hits.entries()) {
      events.push(Object.freeze({
        type: ARENA_RULE_EVENT.HIT_RESOLVED,
        attackerId: hit.attackerId,
        targetId: hit.targetId,
        action: hit.actionDefinitionId,
      }));
      for (const command of guardedCommands) {
        if (command.hitSequence !== hitIndex || command.kind !== ACTION_RULE_COMMAND.APPLY_IMPULSE) {
          continue;
        }
        events.push(Object.freeze({
          type: ARENA_RULE_EVENT.KNOCKBACK_APPLIED,
          attackerId: hit.attackerId,
          targetId: hit.targetId,
          impulse: command.impulse,
        }));
      }
    }
    return Object.freeze({
      resolutions: Object.freeze([]),
      starts: Object.freeze([]),
      hits: Object.freeze(hits),
      commands: guardedCommands,
      movementCommands: Object.freeze([]),
      events: Object.freeze(events),
    });
  }

  commit(batch: unknown, ports: unknown): void {
    this.#runOperation('commit', (operationSequence) => {
      const batchRecord = batch && typeof batch === 'object'
        ? batch as UnknownRecord
        : null;
      if (!batchRecord) {
        throw new TypeError('ArenaRuleEngine commit batch 无效。');
      }
      const hits = batchRecord.hits;
      this.#assertAuthorityCommitReady(operationSequence, '命中批次读取');
      const commands = batchRecord.commands;
      this.#assertAuthorityCommitReady(operationSequence, '命令批次读取');
      if (!Array.isArray(hits) || !Array.isArray(commands)) {
        throw new TypeError('ArenaRuleEngine commit batch 无效。');
      }
      assertKnownKeys(ports, COMMIT_KEYS, 'Rule mutation ports');
      this.#assertAuthorityCommitReady(operationSequence, '变更端口字段校验');
      const portRecord = ports as UnknownRecord;
      const recordHit = portRecord.recordHit;
      this.#assertAuthorityCommitReady(operationSequence, 'recordHit端口读取');
      const applyHitstun = portRecord.applyHitstun;
      this.#assertAuthorityCommitReady(operationSequence, 'applyHitstun端口读取');
      const applyImpulse = portRecord.applyImpulse;
      this.#assertAuthorityCommitReady(operationSequence, 'applyImpulse端口读取');
      for (const [name, method] of [
        ['recordHit', recordHit],
        ['applyHitstun', applyHitstun],
        ['applyImpulse', applyImpulse],
      ] as const) {
        if (typeof method !== 'function') {
          throw new TypeError(`Rule mutation port 缺少 ${name}()。`);
        }
      }
      const validatedBatch: RuleCommitBatch = { hits, commands } as RuleCommitBatch;
      this.#commandRegistry.assertSupported(validatedBatch.commands);
      this.#assertAuthorityCommitReady(operationSequence, '提交输入验证');
      const guardedPorts: RuleMutationPorts = Object.freeze({
        recordHit: (attackerId: string, targetId: string, actionDefinitionId: string) => (
          this.#useMutationPortChecked(operationSequence, 'recordHit端口', () => (
            Reflect.apply(recordHit as RuleMutationPorts['recordHit'], ports, [
              attackerId,
              targetId,
              actionDefinitionId,
            ])
          ))
        ),
        applyHitstun: (participantId: string, ticks: number) => (
          this.#useMutationPortChecked(operationSequence, 'applyHitstun端口', () => (
            Reflect.apply(applyHitstun as RuleMutationPorts['applyHitstun'], ports, [
              participantId,
              ticks,
            ])
          ))
        ),
        applyImpulse: (participantId: string, impulse: RuleImpulse) => (
          this.#useMutationPortChecked(operationSequence, 'applyImpulse端口', () => (
            Reflect.apply(applyImpulse as RuleMutationPorts['applyImpulse'], ports, [
              participantId,
              impulse,
            ])
          ))
        ),
      });
      try {
        this.#assertAuthorityCommitReady(operationSequence, '命中权威提交');
        this.#actionExecution.recordHits(validatedBatch.hits);
        this.#assertAuthorityCommitReady(operationSequence, '命中权威提交后', true);
        for (const hit of validatedBatch.hits) {
          guardedPorts.recordHit(hit.attackerId, hit.targetId, hit.actionDefinitionId);
        }
        this.#commandRegistry.execute(validatedBatch.commands, {
          ports: guardedPorts,
          actionExecutionSystem: this.#actionExecution,
        });
        this.#assertAuthorityCommitReady(operationSequence, '规则命令提交后', true);
      } catch (error) {
        this.#failed = true;
        throw error;
      }
    });
  }

  spawnEquipment(options: unknown): RuleEquipmentSnapshot {
    this.#assertUsable();
    return this.#equipmentSystem.spawn(options);
  }

  resolveEquipmentPickups(options: unknown): readonly RuleEquipmentPickupDecision[] {
    this.#assertUsable();
    const decisions = this.#equipmentSystem.resolvePickups(options);
    try {
      this.#interruptCombatActionsForEquipmentChange(
        decisions.map(({ participantId }) => participantId),
      );
    } catch (error) {
      this.#failed = true;
      throw error;
    }
    return decisions;
  }

  updateEquipmentLastSafePosition(
    participantId: string,
    position: unknown,
  ): RuleEquipmentSnapshot | null {
    this.#assertUsable();
    return this.#equipmentSystem.updateLastSafePosition(participantId, position);
  }

  dropEquipment(participantId: string, options: unknown): RuleEquipmentDropResult | null {
    this.#assertUsable();
    const result = this.#equipmentSystem.dropOwned(participantId, options);
    if (result === null) return null;
    try {
      this.#interruptCombatActionsForEquipmentChange([participantId]);
      return result;
    } catch (error) {
      this.#failed = true;
      throw error;
    }
  }

  despawnInvalidWorldEquipment(options: unknown): readonly RuleEquipmentSnapshot[] {
    this.#assertUsable();
    return this.#equipmentSystem.despawnInvalidWorldEquipment(options);
  }

  resetParticipant(participantId: string): void {
    this.#assertUsable();
    this.#actionExecution.reset(participantId);
  }

  #interruptCombatActionsForEquipmentChange(
    participantIds: readonly string[],
  ): readonly Readonly<{
    readonly participantId: string;
    readonly actionDefinitionId: string;
    readonly phase: string;
  }>[] {
    return this.#actionExecution.interruptLane(participantIds, ACTION_LANE.COMBAT);
  }

  getActionSnapshot(participantId: string): ActionStateSnapshot {
    this.#assertUsable();
    return this.#actionExecution.getSnapshot(participantId);
  }

  getHeldEquipment(participantId: string): RuleEquipmentSnapshot | null {
    this.#assertUsable();
    return this.#equipmentSystem.getHeldEquipment(participantId);
  }

  getEquipmentSnapshot(instanceId: string): RuleEquipmentSnapshot {
    this.#assertUsable();
    return this.#equipmentSystem.getSnapshot(instanceId);
  }

  listEquipmentSnapshots(): readonly RuleEquipmentSnapshot[] {
    this.#assertUsable();
    return this.#equipmentSystem.listSnapshots();
  }

  listExpiredHeldSupplyEquipmentInstanceIds(): readonly string[] {
    this.#assertUsable();
    return this.#equipmentSystem.listExpiredHeldSupplyEquipmentInstanceIds();
  }

  applyEquipmentSupplyTimelinePhase(options: unknown): unknown {
    this.#assertUsable();
    if (typeof this.#equipmentSystem.applySupplyTimelinePhase !== 'function') {
      throw new Error('当前 EquipmentSystem 未启用供给时间线。');
    }
    return this.#equipmentSystem.applySupplyTimelinePhase(options);
  }

  resolveEquipmentSupplyPickups(options: unknown): unknown {
    this.#assertUsable();
    if (typeof this.#equipmentSystem.resolveSupplyPickups !== 'function') {
      throw new Error('当前 EquipmentSystem 未启用供给替换事务。');
    }
    const result = this.#equipmentSystem.resolveSupplyPickups(options);
    try {
      const record = assertPlainRecord(result, 'Equipment supply pickup transaction result');
      if (!Array.isArray(record.decisions) || !Array.isArray(record.events)) {
        throw new TypeError('Equipment supply pickup transaction result缺少decisions/events数组。');
      }
      const participantIds = record.decisions.map((decision, index) => {
        const entry = assertPlainRecord(
          decision,
          `Equipment supply pickup transaction result.decisions[${index}]`,
        );
        return assertNonEmptyString(
          entry.participantId,
          `Equipment supply pickup transaction result.decisions[${index}].participantId`,
        );
      });
      this.#interruptCombatActionsForEquipmentChange(participantIds);
      return result;
    } catch (error) {
      this.#failed = true;
      throw error;
    }
  }

  getContentHash(): string {
    this.#assertUsable();
    return this.#contentHash;
  }

  exportCheckpointV1(): ArenaRuleEngineCheckpointV1 {
    this.#assertUsable();
    if (typeof this.#equipmentSystem.exportCheckpointV1 !== 'function') {
      throw new Error('当前EquipmentSystem不支持ArenaRuleEngine完整checkpoint。');
    }
    return createArenaRuleEngineCheckpointV1({
      schemaVersion: ARENA_RULE_ENGINE_CHECKPOINT_V1_SCHEMA_VERSION,
      participantIds: this.#participantIds,
      baseActionDefinitionId: this.#baseActionDefinitionId,
      baseAirActionDefinitionId: this.#baseAirActionDefinitionId,
      allowBaseAttackWhiff: this.#allowBaseAttackWhiff,
      contentHash: this.#contentHash,
      actionExecutionCheckpoint: this.#actionExecution.exportCheckpointV1(),
      equipmentCheckpoint: this.#equipmentSystem.exportCheckpointV1(),
    });
  }

  getMovementActionCandidates(capabilities: MovementCapabilities): readonly ActionCandidate[] {
    this.#assertUsable();
    const movementCandidates = this.#movementCandidateProvider.getCandidates(capabilities);
    // Legacy contextual input reuses PRIMARY as mobility. Keep that mode's
    // established jump fallback; the product's explicit combat control owns
    // the always-available aerial attack.
    if (!this.#allowBaseAttackWhiff || !capabilities.canBeginDownSmash) {
      return movementCandidates;
    }
    const aerialCandidate = this.#equipmentSystem.getAerialActionCandidate(
      capabilities.participantId,
    ) ?? Object.freeze({
      id: `base-air:${this.#baseAirActionDefinitionId}`,
      actionDefinitionId: this.#baseAirActionDefinitionId,
      source: 'base-air-action-provider',
      priority: ACTION_PRIORITY.AIR_COMBAT,
      available: true,
      blocksFallback: true,
      unavailableReason: null,
    });
    return Object.freeze([...movementCandidates, aerialCandidate]);
  }

  #createActionAffordanceProjectOptions(options: unknown): {
    readonly tick: number;
    readonly participantId: string;
    readonly canAct: boolean;
    readonly candidates: readonly unknown[];
    readonly occupiedLanes: readonly unknown[];
    readonly activeConflictTags: readonly string[];
  } {
    const source = snapshotAffordanceOptions(options);
    const tick = assertIntegerAtLeast(source.tick, 0, 'ArenaRuleEngine affordance tick');
    const participantId = assertNonEmptyString(
      source.participantId,
      'ArenaRuleEngine affordance participantId',
    );
    if (!this.#participantIds.includes(participantId)) {
      throw new RangeError(`未知 affordance participant ${participantId}。`);
    }
    const actors = this.#cloneActors(source.actors);
    const actor = requireActorById(actors, participantId, 'affordance participant');
    const additionalCandidates = cloneAdditionalCandidates(
      source.additionalCandidates === undefined
        ? undefined
        : [{ participantId, candidates: source.additionalCandidates }],
      this.#participantIds,
    ).get(participantId);
    const constraints = this.#actionExecution.getNextTickConstraints(participantId);
    return {
      tick,
      participantId,
      canAct: actor.canAct,
      candidates: this.#createCandidates(participantId, actors, additionalCandidates ?? []),
      occupiedLanes: constraints.occupiedLanes,
      activeConflictTags: constraints.activeConflictTags,
    };
  }

  getActionAffordance(options: unknown): ActionAffordance {
    this.#assertUsable();
    return this.#actionAffordanceProjector.project(
      this.#createActionAffordanceProjectOptions(options),
    );
  }

  getActionAffordanceProfile(
    options: unknown,
    profile: 'local-context-primary',
  ): LocalActionAffordance;
  getActionAffordanceProfile(
    options: unknown,
    profile: 'bot-mobility',
  ): BotMobilityAffordance;
  getActionAffordanceProfile(
    options: unknown,
    profile: 'full-audit',
  ): ActionAffordance;
  getActionAffordanceProfile(
    options: unknown,
    profile: ActionAffordanceProfile,
  ): ActionAffordanceProfileResult;
  getActionAffordanceProfile(
    options: unknown,
    profileValue: unknown,
  ): ActionAffordanceProfileResult {
    this.#assertUsable();
    const profile = assertActionAffordanceProfile(profileValue);
    return this.#actionAffordanceProjector.projectProfile(
      this.#createActionAffordanceProjectOptions(options),
      profile,
    );
  }

  getParticipantActionRule(participantId: string): PublicActionRule {
    this.#assertUsable();
    const equipmentCandidate = this.#equipmentSystem.getActionCandidate(participantId);
    const definition = this.#actionRegistry.require(
      equipmentCandidate?.actionDefinitionId ?? this.#baseActionDefinitionId,
    );
    return createPublicActionRule(definition);
  }

  destroy(): void {
    this.#runOperation('destroy', (operationSequence) => {
      if (this.#destroyed) return;
      this.#equipmentSystem.destroy();
      this.#assertOperationReady(
        'destroy',
        operationSequence,
        'EquipmentSystem销毁返回后',
        true,
      );
      this.#destroyed = true;
    }, { allowDestroyed: true, allowFailed: true });
  }
}
