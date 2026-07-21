import { ACTION_EFFECT_TRIGGER } from '@number-strategy-jump/arena-definitions';
import { ActionExecutionSystem } from '../action/action-execution-system.js';
import {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
  ActionResolver,
} from '../action/action-resolver.js';
import { ARENA_ACTION_PHASE } from '../action/action-state.js';
import { ACTION_RULE_COMMAND } from '../action/effects/default-effect-handlers.js';
import { EquipmentSystem } from '../equipment/equipment-system.js';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createMovementCommand,
  isMovementCommandKind,
} from '../movement/movement-command.js';
import { ActionAffordanceProjector } from '../action/action-affordance.js';

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

export function assertArenaRuleEngine(engine) {
  if (!engine || typeof engine !== 'object') throw new TypeError('ruleEngineFactory 必须返回对象。');
  for (const method of REQUIRED_ENGINE_METHODS) {
    if (typeof engine[method] !== 'function') {
      throw new TypeError(`ruleEngineFactory 返回值缺少 ${method}()。`);
    }
  }
  return engine;
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cloneActor(value, index) {
  const name = `RuleActor[${index}]`;
  assertKnownKeys(value, ACTOR_KEYS, name);
  const id = assertNonEmptyString(value.id, `${name}.id`);
  if (typeof value.canAct !== 'boolean' || typeof value.targetable !== 'boolean') {
    throw new TypeError(`${name}.canAct/targetable 必须是布尔值。`);
  }
  assertKnownKeys(value.position, POSITION_KEYS, `${name}.position`);
  assertKnownKeys(value.facing, FACING_KEYS, `${name}.facing`);
  const position = {};
  for (const axis of POSITION_KEYS) {
    if (!Number.isFinite(value.position[axis])) {
      throw new TypeError(`${name}.position.${axis} 必须是有限数。`);
    }
    position[axis] = value.position[axis];
  }
  const facing = {};
  for (const axis of FACING_KEYS) {
    if (!Number.isFinite(value.facing[axis])) {
      throw new TypeError(`${name}.facing.${axis} 必须是有限数。`);
    }
    facing[axis] = value.facing[axis];
  }
  if (Math.hypot(facing.x, facing.z) < 1e-7) throw new RangeError(`${name}.facing 不能为零。`);
  return Object.freeze({
    id,
    canAct: value.canAct,
    targetable: value.targetable,
    position: Object.freeze(position),
    facing: Object.freeze(facing),
  });
}

function enrichCommand(command, metadata) {
  return cloneFrozenData({ ...command, ...metadata }, 'RuleCommand');
}

function createBaseCandidate(actionDefinitionId, available) {
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

function cloneAdditionalCandidates(values, participantIds) {
  if (values === undefined) return new Map(participantIds.map((id) => [id, Object.freeze([])]));
  if (!Array.isArray(values)) throw new TypeError('additionalCandidates 必须是数组。');
  const result = new Map(participantIds.map((id) => [id, Object.freeze([])]));
  const seen = new Set();
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

function createPublicActionRule(definition) {
  const parameters = definition.targeting.parameters;
  return Object.freeze({
    definitionId: definition.id,
    targetingKind: definition.targeting.kind,
    range: parameters.range,
    minimumFacingDot: Number.isFinite(parameters.minimumFacingDot)
      ? parameters.minimumFacingDot
      : -1,
    maximumVerticalDifference: parameters.maximumVerticalDifference,
    windupTicks: definition.timing.windupTicks,
    activeTicks: definition.timing.activeTicks,
    recoveryTicks: definition.timing.recoveryTicks,
  });
}

function applyFrontGuards(commands, guards, actorsById) {
  const guardByParticipant = new Map(guards.map((guard) => [guard.participantId, guard]));
  const result = [];
  for (const command of commands) {
    const guard = guardByParticipant.get(command.targetParticipantId);
    if (!guard || !command.sourceParticipantId) {
      result.push(command);
      continue;
    }
    const target = actorsById.get(command.targetParticipantId);
    const source = actorsById.get(command.sourceParticipantId);
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
    if (guard.cancelledEffectKinds.includes(command.effectKind)) continue;
    if (command.kind === ACTION_RULE_COMMAND.APPLY_IMPULSE) {
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
  #participantIds;
  #baseActionDefinitionId;
  #baseAirActionDefinitionId;
  #actionRegistry;
  #actionResolver;
  #actionExecution;
  #movementCandidateProvider;
  #actionAffordanceProjector;
  #targetingRegistry;
  #effectRegistry;
  #commandRegistry;
  #equipmentRegistry;
  #equipmentSystem;
  #allowBaseAttackWhiff;
  #contentHash;
  #destroyed;
  #committing;
  #failed;

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
    allowBaseAttackWhiff = false,
  }) {
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
    this.#equipmentSystem = new EquipmentSystem({
      participantIds,
      actionRegistry,
      equipmentRegistry,
    });
    this.#destroyed = false;
    this.#committing = false;
    this.#failed = false;
    Object.freeze(this);
  }

  requireEquipmentDefinition(definitionId) {
    this.#assertUsable();
    return this.#equipmentRegistry.require(definitionId);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaRuleEngine 已销毁。');
    if (this.#failed) throw new Error('ArenaRuleEngine 已失败，不能继续推进。');
    if (this.#committing) throw new Error('ArenaRuleEngine commit 期间不可重入。');
  }

  #cloneActors(actors) {
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

  #createCandidates(participantId, actors, additionalCandidates) {
    const actor = actors.find(({ id }) => id === participantId);
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
    const candidates = [createBaseCandidate(
      this.#baseActionDefinitionId,
      this.#allowBaseAttackWhiff || baseTargets.length > 0,
    )];
    const equipmentCandidate = this.#equipmentSystem.getActionCandidate(participantId);
    if (equipmentCandidate) candidates.push(equipmentCandidate);
    candidates.push(...additionalCandidates);
    return Object.freeze(candidates);
  }

  advanceTimers() {
    this.#assertUsable();
    return Object.freeze({
      actionTransitions: this.#actionExecution.advance(),
      equipmentCooldowns: this.#equipmentSystem.advanceCooldowns(),
    });
  }

  resolveActions(options) {
    this.#assertUsable();
    assertKnownKeys(options, RESOLVE_ACTION_KEYS, 'ArenaRuleEngine resolveActions options');
    const tick = assertIntegerAtLeast(options.tick, 0, 'ArenaRuleEngine tick');
    const actors = this.#cloneActors(options.actors);
    if (!Array.isArray(options.inputFrames)) throw new TypeError('inputFrames 必须是数组。');
    const frameById = new Map();
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
      frameById.set(participantId, frame);
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
      const actor = actorsById.get(participantId);
      const candidates = this.#createCandidates(
        participantId,
        actors,
        additionalCandidates.get(participantId),
      );
      const constraints = this.#actionExecution.getConstraints(participantId);
      return this.#actionResolver.resolve({
        tick,
        participantId,
        canAct: actor.canAct,
        input: {
          primaryPressed: frameById.get(participantId).primaryPressed,
          primaryHeld: frameById.get(participantId).primaryHeld,
          jumpPressed: frameById.get(participantId).jumpPressed,
          jumpHeld: frameById.get(participantId).jumpHeld,
          slamPressed: frameById.get(participantId).slamPressed,
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
          resolution.actionDefinitionId,
        );
      }
    }
    const starts = this.#actionExecution.start(selected);
    for (const resolution of selected) {
      if (resolution.source === 'equipment-system') {
        this.#equipmentSystem.markActionStarted(
          resolution.participantId,
          resolution.actionDefinitionId,
        );
      }
    }
    const commands = [];
    const events = [];
    for (let index = 0; index < starts.length; index += 1) {
      const start = starts[index];
      const definition = this.#actionRegistry.require(start.actionDefinitionId);
      const source = actorsById.get(start.participantId);
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
          commands.push(enrichCommand(resolved[commandIndex], {
            sourceParticipantId: source.id,
            targetParticipantId: source.id,
            actionDefinitionId: definition.id,
            effectId: effect.id,
            sequence: `${index}:${commandIndex}`,
          }));
        }
      }
    }
    const movementCommands = [];
    const ruleCommands = [];
    for (const command of commands) {
      if (isMovementCommandKind(command.kind)) {
        movementCommands.push(createMovementCommand({
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

  resolveActiveActions(options) {
    this.#assertUsable();
    assertKnownKeys(options, RESOLVE_ACTIVE_KEYS, 'ArenaRuleEngine resolveActive options');
    const actors = this.#cloneActors(options.actors);
    const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
    const active = this.#actionExecution.listAllSnapshots().filter(({ phase }) => (
      phase === ARENA_ACTION_PHASE.ACTIVE
    ));
    const guards = [];
    for (const action of active) {
      const definition = this.#actionRegistry.require(action.definitionId);
      const source = actorsById.get(action.participantId);
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
          }));
        }
      }
    }

    const hits = [];
    const commands = [];
    for (const action of active) {
      const definition = this.#actionRegistry.require(action.definitionId);
      const source = actorsById.get(action.participantId);
      const candidates = actors.filter(({ id, targetable }) => id !== source.id && targetable);
      const targets = this.#targetingRegistry.resolve({ definition, source, candidates })
        .filter((targetId) => !action.hitTargetIds.includes(targetId));
      for (const targetId of targets) {
        const target = actorsById.get(targetId);
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
            commands.push(enrichCommand(resolved[commandIndex], {
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
    const events = [];
    for (let hitIndex = 0; hitIndex < hits.length; hitIndex += 1) {
      const hit = hits[hitIndex];
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

  commit(batch, ports) {
    this.#assertUsable();
    if (!batch || !Array.isArray(batch.hits) || !Array.isArray(batch.commands)) {
      throw new TypeError('ArenaRuleEngine commit batch 无效。');
    }
    assertKnownKeys(ports, COMMIT_KEYS, 'Rule mutation ports');
    for (const name of COMMIT_KEYS) {
      if (typeof ports[name] !== 'function') throw new TypeError(`Rule mutation port 缺少 ${name}()。`);
    }
    this.#commandRegistry.assertSupported(batch.commands);
    this.#committing = true;
    try {
      this.#actionExecution.recordHits(batch.hits);
      for (const hit of batch.hits) {
        ports.recordHit(hit.attackerId, hit.targetId, hit.actionDefinitionId);
      }
      this.#commandRegistry.execute(batch.commands, {
        ports,
        actionExecutionSystem: this.#actionExecution,
      });
    } catch (error) {
      this.#failed = true;
      throw error;
    } finally {
      this.#committing = false;
    }
  }

  spawnEquipment(options) {
    this.#assertUsable();
    return this.#equipmentSystem.spawn(options);
  }

  resolveEquipmentPickups(options) {
    this.#assertUsable();
    return this.#equipmentSystem.resolvePickups(options);
  }

  updateEquipmentLastSafePosition(participantId, position) {
    this.#assertUsable();
    return this.#equipmentSystem.updateLastSafePosition(participantId, position);
  }

  dropEquipment(participantId, options) {
    this.#assertUsable();
    return this.#equipmentSystem.dropOwned(participantId, options);
  }

  despawnInvalidWorldEquipment(options) {
    this.#assertUsable();
    return this.#equipmentSystem.despawnInvalidWorldEquipment(options);
  }

  resetParticipant(participantId) {
    this.#assertUsable();
    this.#actionExecution.reset(participantId);
  }

  getActionSnapshot(participantId) {
    this.#assertUsable();
    return this.#actionExecution.getSnapshot(participantId);
  }

  getHeldEquipment(participantId) {
    this.#assertUsable();
    return this.#equipmentSystem.getHeldEquipment(participantId);
  }

  getEquipmentSnapshot(instanceId) {
    this.#assertUsable();
    return this.#equipmentSystem.getSnapshot(instanceId);
  }

  listEquipmentSnapshots() {
    this.#assertUsable();
    return this.#equipmentSystem.listSnapshots();
  }

  getContentHash() {
    this.#assertUsable();
    return this.#contentHash;
  }

  getMovementActionCandidates(capabilities) {
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

  getActionAffordance(options) {
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
    const actor = actors.find(({ id }) => id === participantId);
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
      candidates: this.#createCandidates(participantId, actors, additionalCandidates),
      occupiedLanes: constraints.occupiedLanes,
      activeConflictTags: constraints.activeConflictTags,
    });
  }

  getParticipantActionRule(participantId) {
    this.#assertUsable();
    const equipmentCandidate = this.#equipmentSystem.getActionCandidate(participantId);
    const definition = this.#actionRegistry.require(
      equipmentCandidate?.actionDefinitionId ?? this.#baseActionDefinitionId,
    );
    return createPublicActionRule(definition);
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#committing) throw new Error('commit 期间不能销毁 ArenaRuleEngine。');
    this.#equipmentSystem.destroy();
    this.#destroyed = true;
  }
}
