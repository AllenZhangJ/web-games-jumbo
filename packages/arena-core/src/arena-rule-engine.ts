import {
  ACTION_EFFECT_TRIGGER,
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
import { ActionAffordanceProjector } from './action-affordance.js';
import { ACTION_RULE_COMMAND } from './default-effect-handlers.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
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

export interface EquipmentSystemContract {
  getActionCandidate(participantId: string): ActionCandidate | null;
  getAerialActionCandidate(participantId: string): ActionCandidate | null;
  assertActionCanStart(participantId: string, actionDefinitionId: string): unknown;
  markActionStarted(participantId: string, actionDefinitionId: string): unknown;
  advanceCooldowns(): readonly unknown[];
  spawn(options: unknown): unknown;
  resolvePickups(options: unknown): unknown;
  updateLastSafePosition(participantId: string, position: unknown): unknown;
  dropOwned(participantId: string, options: unknown): unknown;
  despawnInvalidWorldEquipment(options: unknown): unknown;
  getHeldEquipment(participantId: string): unknown;
  getSnapshot(instanceId: string): unknown;
  listSnapshots(): readonly unknown[];
  destroy(): void;
}

export interface MovementCapabilities {
  readonly participantId: string;
  readonly canBeginDownSmash: boolean;
  readonly [key: string]: unknown;
}

export interface MovementCandidateProviderContract {
  getCandidates(capabilities: MovementCapabilities): readonly ActionCandidate[];
}

export interface MovementCommandAdapter {
  isCommandKind(kind: unknown): boolean;
  createCommand(command: RuleCommand): unknown;
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
  readonly createEquipmentSystem: (options: {
    readonly participantIds: readonly string[];
    readonly actionRegistry: ActionRegistryContract & { list(): readonly ActionDefinition[] };
    readonly equipmentRegistry: EquipmentRegistryContract;
  }) => EquipmentSystemContract;
  readonly movementCommandAdapter: MovementCommandAdapter;
  readonly allowBaseAttackWhiff?: boolean;
}

export interface ArenaRuleEngineContract {
  advanceTimers(): ArenaRuleTimerAdvance;
  resolveActions(options: unknown): ArenaRuleBatch;
  resolveActiveActions(options: unknown): ArenaRuleBatch;
  commit(batch: unknown, ports: unknown): void;
  resetParticipant(participantId: string): void;
  getActionSnapshot(participantId: string): unknown;
  getHeldEquipment(participantId: string): unknown;
  getEquipmentSnapshot(instanceId: string): unknown;
  listEquipmentSnapshots(): readonly unknown[];
  spawnEquipment(options: unknown): unknown;
  resolveEquipmentPickups(options: unknown): unknown;
  updateEquipmentLastSafePosition(participantId: string, position: unknown): unknown;
  dropEquipment(participantId: string, options: unknown): unknown;
  despawnInvalidWorldEquipment(options: unknown): unknown;
  requireEquipmentDefinition(definitionId: string): EquipmentDefinition;
  getContentHash(): string;
  getMovementActionCandidates(capabilities: MovementCapabilities): readonly ActionCandidate[];
  getActionAffordance(options: unknown): unknown;
  getParticipantActionRule(participantId: string): PublicActionRule;
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

export interface ArenaRuleBatch {
  readonly resolutions: readonly ActionResolution[];
  readonly starts: readonly ActionStart[];
  readonly hits: readonly RuleHit[];
  readonly commands: readonly DeepReadonly<EnrichedRuleCommand>[];
  readonly movementCommands: readonly unknown[];
  readonly events: readonly UnknownRecord[];
}

export interface ArenaRuleTimerAdvance {
  readonly actionTransitions: readonly ActionTransition[];
  readonly equipmentCooldowns: readonly unknown[];
}

export interface PublicActionRule {
  readonly definitionId: string;
  readonly targetingKind: string;
  readonly range: number;
  readonly minimumFacingDot: number;
  readonly maximumVerticalDifference: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
}

interface RuleMutationPorts {
  readonly recordHit: (attackerId: string, targetId: string, actionDefinitionId: string) => unknown;
  readonly applyHitstun: (participantId: string, ticks: number) => unknown;
  readonly applyImpulse: (participantId: string, impulse: unknown) => unknown;
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

export const ARENA_RULE_EVENT = Object.freeze({
  ACTION_STARTED: 'ActionStarted',
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
  'spawnEquipment',
  'resolveEquipmentPickups',
  'updateEquipmentLastSafePosition',
  'dropEquipment',
  'despawnInvalidWorldEquipment',
  'requireEquipmentDefinition',
  'getContentHash',
  'getMovementActionCandidates',
  'getActionAffordance',
  'getParticipantActionRule',
  'destroy',
]);
const REQUIRED_EQUIPMENT_SYSTEM_METHODS = Object.freeze([
  'getActionCandidate', 'getAerialActionCandidate', 'assertActionCanStart',
  'markActionStarted', 'advanceCooldowns', 'spawn', 'resolvePickups',
  'updateLastSafePosition', 'dropOwned', 'despawnInvalidWorldEquipment',
  'getHeldEquipment', 'getSnapshot', 'listSnapshots', 'destroy',
]);

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
  const contract = engine as UnknownRecord;
  for (const method of REQUIRED_ENGINE_METHODS) {
    if (typeof contract[method] !== 'function') {
      throw new TypeError(`ruleEngineFactory 返回值缺少 ${method}()。`);
    }
  }
  return contract as unknown as ArenaRuleEngineContract;
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

function cloneAdditionalCandidates(
  values: unknown,
  participantIds: readonly string[],
): ReadonlyMap<string, readonly unknown[]> {
  if (values === undefined) {
    return new Map<string, readonly unknown[]>(
      participantIds.map((id) => [id, Object.freeze([])] as const),
    );
  }
  if (!Array.isArray(values)) throw new TypeError('additionalCandidates 必须是数组。');
  const result = new Map<string, readonly unknown[]>(
    participantIds.map((id) => [id, Object.freeze([])] as const),
  );
  const seen = new Set<string>();
  for (let index = 0; index < values.length; index += 1) {
    const entry = cloneFrozenData(values[index], `additionalCandidates[${index}]`);
    assertKnownKeys(
      entry,
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
    if (!Array.isArray(entry.candidates)) {
      throw new TypeError(`additionalCandidates[${index}].candidates 必须是数组。`);
    }
    seen.add(participantId);
    result.set(participantId, entry.candidates);
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
  readonly #actionAffordanceProjector: ActionAffordanceProjector;
  readonly #targetingRegistry: TargetingRegistry;
  readonly #effectRegistry: ActionEffectRegistry;
  readonly #commandRegistry: RuleCommandRegistry;
  readonly #equipmentRegistry: EquipmentRegistryContract;
  readonly #equipmentSystem: EquipmentSystemContract;
  readonly #allowBaseAttackWhiff: boolean;
  readonly #contentHash: string;
  #destroyed: boolean;
  #committing: boolean;
  #failed: boolean;

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
    createEquipmentSystem,
    movementCommandAdapter,
    allowBaseAttackWhiff = false,
  }: ArenaRuleEngineOptions) {
    if (
      !Array.isArray(participantIds)
      || participantIds.length === 0
      || new Set(participantIds).size !== participantIds.length
    ) throw new RangeError('ArenaRuleEngine participantIds 无效。');
    this.#participantIds = Object.freeze([...participantIds].sort(compareStrings));
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
    targetingRegistry.validateActionRegistry(actionRegistry);
    effectRegistry.validateActionRegistry(actionRegistry);
    if (!commandRegistry || typeof commandRegistry.execute !== 'function') {
      throw new TypeError('ArenaRuleEngine 需要 RuleCommandRegistry。');
    }
    this.#actionResolver = new ActionResolver({ actionRegistry });
    this.#actionExecution = new ActionExecutionSystem({ participantIds, actionRegistry });
    if (!movementCandidateProvider || typeof movementCandidateProvider.getCandidates !== 'function') {
      throw new TypeError('ArenaRuleEngine 需要 movementCandidateProvider.getCandidates()。');
    }
    this.#movementCandidateProvider = movementCandidateProvider;
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
    }, 'Arena rule content');
    if (typeof createEquipmentSystem !== 'function') {
      throw new TypeError('ArenaRuleEngine 需要 createEquipmentSystem()。');
    }
    this.#equipmentSystem = assertEquipmentSystem(createEquipmentSystem({
      participantIds,
      actionRegistry,
      equipmentRegistry,
    }));
    this.#destroyed = false;
    this.#committing = false;
    this.#failed = false;
    Object.freeze(this);
  }

  requireEquipmentDefinition(definitionId: string): EquipmentDefinition {
    this.#assertUsable();
    return this.#equipmentRegistry.require(definitionId);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('ArenaRuleEngine 已销毁。');
    if (this.#failed) throw new Error('ArenaRuleEngine 已失败，不能继续推进。');
    if (this.#committing) throw new Error('ArenaRuleEngine commit 期间不可重入。');
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
      candidates: actors.filter(({ id, targetable }) => id !== participantId && targetable),
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
    const events: UnknownRecord[] = [];
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
      const source = requireMapValue(
        actorsById,
        action.participantId,
        `active source ${action.participantId} 缺少 RuleActor。`,
      );
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
      const source = requireMapValue(
        actorsById,
        action.participantId,
        `active source ${action.participantId} 缺少 RuleActor。`,
      );
      const candidates = actors.filter(({ id, targetable }) => id !== source.id && targetable);
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
    const events: UnknownRecord[] = [];
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
    this.#assertUsable();
    const batchRecord = batch && typeof batch === 'object'
      ? batch as UnknownRecord
      : null;
    if (!batchRecord || !Array.isArray(batchRecord.hits) || !Array.isArray(batchRecord.commands)) {
      throw new TypeError('ArenaRuleEngine commit batch 无效。');
    }
    assertKnownKeys(ports, COMMIT_KEYS, 'Rule mutation ports');
    for (const name of COMMIT_KEYS) {
      if (typeof ports[name] !== 'function') throw new TypeError(`Rule mutation port 缺少 ${name}()。`);
    }
    const validatedBatch = batch as RuleCommitBatch;
    const validatedPorts = ports as unknown as RuleMutationPorts;
    this.#commandRegistry.assertSupported(validatedBatch.commands);
    this.#committing = true;
    try {
      this.#actionExecution.recordHits(validatedBatch.hits);
      for (const hit of validatedBatch.hits) {
        validatedPorts.recordHit(hit.attackerId, hit.targetId, hit.actionDefinitionId);
      }
      this.#commandRegistry.execute(validatedBatch.commands, {
        ports: validatedPorts,
        actionExecutionSystem: this.#actionExecution,
      });
    } catch (error) {
      this.#failed = true;
      throw error;
    } finally {
      this.#committing = false;
    }
  }

  spawnEquipment(options: unknown): unknown {
    this.#assertUsable();
    return this.#equipmentSystem.spawn(options);
  }

  resolveEquipmentPickups(options: unknown): unknown {
    this.#assertUsable();
    return this.#equipmentSystem.resolvePickups(options);
  }

  updateEquipmentLastSafePosition(participantId: string, position: unknown): unknown {
    this.#assertUsable();
    return this.#equipmentSystem.updateLastSafePosition(participantId, position);
  }

  dropEquipment(participantId: string, options: unknown): unknown {
    this.#assertUsable();
    return this.#equipmentSystem.dropOwned(participantId, options);
  }

  despawnInvalidWorldEquipment(options: unknown): unknown {
    this.#assertUsable();
    return this.#equipmentSystem.despawnInvalidWorldEquipment(options);
  }

  resetParticipant(participantId: string): void {
    this.#assertUsable();
    this.#actionExecution.reset(participantId);
  }

  getActionSnapshot(participantId: string) {
    this.#assertUsable();
    return this.#actionExecution.getSnapshot(participantId);
  }

  getHeldEquipment(participantId: string): unknown {
    this.#assertUsable();
    return this.#equipmentSystem.getHeldEquipment(participantId);
  }

  getEquipmentSnapshot(instanceId: string): unknown {
    this.#assertUsable();
    return this.#equipmentSystem.getSnapshot(instanceId);
  }

  listEquipmentSnapshots(): readonly unknown[] {
    this.#assertUsable();
    return this.#equipmentSystem.listSnapshots();
  }

  getContentHash(): string {
    this.#assertUsable();
    return this.#contentHash;
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

  getActionAffordance(options: unknown) {
    this.#assertUsable();
    assertKnownKeys(options, AFFORDANCE_KEYS, 'ArenaRuleEngine action affordance options');
    const tick = assertIntegerAtLeast(options.tick, 0, 'ArenaRuleEngine affordance tick');
    const participantId = assertNonEmptyString(
      options.participantId,
      'ArenaRuleEngine affordance participantId',
    );
    if (!this.#participantIds.includes(participantId)) {
      throw new RangeError(`未知 affordance participant ${participantId}。`);
    }
    const actors = this.#cloneActors(options.actors);
    const actor = requireActorById(actors, participantId, 'affordance participant');
    const additionalCandidates = cloneAdditionalCandidates(
      options.additionalCandidates === undefined
        ? undefined
        : [{ participantId, candidates: options.additionalCandidates }],
      this.#participantIds,
    ).get(participantId);
    const constraints = this.#actionExecution.getNextTickConstraints(participantId);
    return this.#actionAffordanceProjector.project({
      tick,
      participantId,
      canAct: actor.canAct,
      candidates: this.#createCandidates(participantId, actors, additionalCandidates ?? []),
      occupiedLanes: constraints.occupiedLanes,
      activeConflictTags: constraints.activeConflictTags,
    });
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
    if (this.#destroyed) return;
    if (this.#committing) throw new Error('commit 期间不能销毁 ArenaRuleEngine。');
    this.#equipmentSystem.destroy();
    this.#destroyed = true;
  }
}
