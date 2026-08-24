import { describe, expect, it } from 'vitest';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ActionRegistry,
  EquipmentRegistry,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_ACTION_PHASE as CONTRACT_ACTION_PHASE,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_ACTION_PHASE,
  ACTION_EXECUTION_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION,
  ACTION_RESOLUTION_KIND,
  ActionExecutionSystem,
  ArenaRuleEngine,
  RuleCommandRegistry,
  assertArenaRuleEngine,
  compareActionCandidates,
  createActionCandidate,
  createActionRuntimeState,
  createDefaultActionEffectRegistry,
  createDefaultTargetingRegistry,
  resetActionRuntimeState,
} from '../src/index.js';

function checkpointActionDefinitions() {
  return [{
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: 'charged-attack',
    kind: 'attack',
    input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
    lane: ACTION_LANE.COMBAT,
    conflictTags: [],
    timing: { windupTicks: 5, activeTicks: 2, recoveryTicks: 2, cooldownTicks: 0 },
    commitment: {
      commitTicks: 2,
      expireTicks: 4,
      expireOutcome: 'release',
      canTurn: true,
      levelThresholds: [1, 2],
    },
    targeting: { kind: 'none', parameters: {} },
    effects: [{
      id: 'noop-charged',
      kind: 'apply-hitstun',
      trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
      parameters: { ticks: 1 },
    }],
    tags: [],
  }, {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: 'locomotion-step',
    kind: 'movement',
    input: { channel: ACTION_INPUT_CHANNEL.JUMP, trigger: ACTION_INPUT_TRIGGER.PRESSED },
    lane: ACTION_LANE.LOCOMOTION,
    conflictTags: [],
    timing: { windupTicks: 5, activeTicks: 5, recoveryTicks: 5, cooldownTicks: 0 },
    targeting: { kind: 'none', parameters: {} },
    effects: [{
      id: 'noop-step',
      kind: 'noop',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: {},
    }],
    tags: [],
  }] as const;
}

function checkpointInput(tick: number, participantId: string, primaryHeld: boolean) {
  return Object.freeze({
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  });
}

function selectedAction(
  participantId: string,
  actionDefinitionId: string,
  lane: typeof ACTION_LANE[keyof typeof ACTION_LANE],
  inputChannel: typeof ACTION_INPUT_CHANNEL[keyof typeof ACTION_INPUT_CHANNEL],
) {
  return Object.freeze({
    kind: ACTION_RESOLUTION_KIND.SELECTED,
    tick: 10,
    participantId,
    inputChannel,
    lane,
    reason: 'candidate-selected',
    candidateId: actionDefinitionId,
    actionDefinitionId,
    source: 'checkpoint-test',
  });
}

function advanceCheckpointFixture(
  system: ActionExecutionSystem,
  tick: number,
  primaryHeld: boolean,
  facing: Readonly<{ x: number; z: number }>,
): void {
  system.applyCommitmentInputs({
    tick,
    actors: [
      { id: 'p1', facing },
      { id: 'p2', facing: { x: -1, z: 0 } },
    ],
    inputFrames: [
      checkpointInput(tick, 'p1', primaryHeld),
      checkpointInput(tick, 'p2', false),
    ],
  });
  system.advance();
}

function createCheckpointFixture() {
  const actionRegistry = new ActionRegistry(checkpointActionDefinitions());
  const system = new ActionExecutionSystem({
    participantIds: ['p2', 'p1'],
    actionRegistry,
  });
  system.start([
    selectedAction('p1', 'locomotion-step', ACTION_LANE.LOCOMOTION, ACTION_INPUT_CHANNEL.JUMP),
    selectedAction('p1', 'charged-attack', ACTION_LANE.COMBAT, ACTION_INPUT_CHANNEL.PRIMARY),
  ]);
  advanceCheckpointFixture(system, 10, true, { x: 1, z: 0 });
  advanceCheckpointFixture(system, 11, true, { x: 0.8, z: 0.2 });
  advanceCheckpointFixture(system, 12, false, { x: 0, z: 1 });
  advanceCheckpointFixture(system, 13, false, { x: -1, z: 0 });
  advanceCheckpointFixture(system, 14, false, { x: -1, z: 0 });
  system.recordHits([{
    attackerId: 'p1',
    targetId: 'p2',
    actionDefinitionId: 'charged-attack',
  }]);
  return Object.freeze({ actionRegistry, system });
}

function mutableCheckpointCopy(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function withCoherentCheckpointHash(value: Record<string, unknown>): Record<string, unknown> {
  const { checkpointIdentityHash: _discarded, ...core } = value;
  return {
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ActionExecutionSystemCheckpointV1 test identity',
    ),
  };
}

function createTargetEligibilityEngine(
  allowedPairs: readonly string[],
  checkpoint?: unknown,
): ArenaRuleEngine {
  const actionRegistry = new ActionRegistry([{
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: 'relationship-attack',
    kind: 'attack',
    input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
    lane: ACTION_LANE.COMBAT,
    conflictTags: [],
    timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 0, cooldownTicks: 0 },
    targeting: {
      kind: 'facing-cone',
      parameters: { range: 3, minimumFacingDot: 0, maximumVerticalDifference: 1 },
    },
    effects: [{
      id: 'noop-relationship',
      kind: 'apply-hitstun',
      trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
      parameters: { ticks: 1 },
    }],
    tags: [],
  }]);
  const equipmentRegistry = new EquipmentRegistry({ definitions: [], actionRegistry });
  const allowed = new Set(allowedPairs);
  return new ArenaRuleEngine({
    participantIds: ['source', 'hostile', 'neutral'],
    baseActionDefinitionId: 'relationship-attack',
    baseAirActionDefinitionId: 'relationship-attack',
    actionRegistry,
    equipmentRegistry,
    targetingRegistry: createDefaultTargetingRegistry(),
    effectRegistry: createDefaultActionEffectRegistry(),
    commandRegistry: new RuleCommandRegistry(),
    movementCandidateProvider: { getCandidates: () => [] },
    targetEligibility: Object.freeze({
      contentHash: createDeterministicDataHash(
        Object.freeze([...allowed].sort()),
        'target eligibility test policy',
      ),
      allowsTarget: (sourceParticipantId: string, targetParticipantId: string) => (
        allowed.has(`${sourceParticipantId}->${targetParticipantId}`)
      ),
    }),
    movementCommandAdapter: { isCommandKind: () => false, createCommand: (command) => command },
    allowBaseAttackWhiff: true,
    createEquipmentSystem: () => ({
      getActionCandidate: () => null,
      getAerialActionCandidate: () => null,
      assertActionCanStart: () => ({}),
      markActionStarted: () => ({}),
      advanceCooldowns: () => [],
      spawn: () => ({}),
      resolvePickups: () => [],
      updateLastSafePosition: () => null,
      dropOwned: () => null,
      despawnInvalidWorldEquipment: () => [],
      getHeldEquipment: () => null,
      getSnapshot: () => ({}),
      listSnapshots: () => [],
      listExpiredHeldSupplyEquipmentInstanceIds: () => [],
      exportCheckpointV1: () => Object.freeze({ schemaVersion: 1 }),
      destroy: () => {},
    } as never),
    ...(checkpoint === undefined ? {} : { checkpoint }),
  });
}

describe('Arena action core primitives', () => {
  it('resets all mutable action runtime fields without replacing hit ownership', () => {
    expect(ARENA_ACTION_PHASE).toBe(CONTRACT_ACTION_PHASE);
    const state = createActionRuntimeState();
    const hitTargets = state.hitTargets;
    state.definitionId = 'attack';
    state.phase = ARENA_ACTION_PHASE.ACTIVE;
    state.ticksRemaining = 3;
    state.hitTargets.add('target');
    resetActionRuntimeState(state);
    expect(state).toEqual({
      definitionId: null,
      phase: ARENA_ACTION_PHASE.IDLE,
      ticksRemaining: 0,
      hitTargets: new Set(),
      commitmentStartedTick: null,
      commitmentStatus: null,
      commitmentChargeTicks: 0,
      commitmentChargeLevel: 0,
      commitmentFacingAtStart: null,
      commitmentFacingAtResult: null,
    });
    expect(state.hitTargets).toBe(hitTargets);
  });

  it('normalizes immutable candidates and sorts priority before stable id', () => {
    const low = createActionCandidate({
      id: 'base', actionDefinitionId: 'base', source: 'base', priority: 1,
      available: true, blocksFallback: false, unavailableReason: null,
    });
    const high = createActionCandidate({
      id: 'weapon', actionDefinitionId: 'weapon', source: 'equipment', priority: 2,
      available: false, blocksFallback: true, unavailableReason: 'cooldown',
    });
    expect([low, high].sort(compareActionCandidates)).toEqual([high, low]);
    expect(Object.isFrozen(high)).toBe(true);
    expect(() => createActionCandidate({ ...high, unknown: true })).toThrow('不支持字段 unknown');
  });

  it('validates a complete start batch before the unique timing writer mutates state', () => {
    const actionRegistry = new ActionRegistry([{
      schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
      id: 'attack',
      kind: 'attack',
      input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
      lane: ACTION_LANE.COMBAT,
      conflictTags: [],
      timing: { windupTicks: 1, activeTicks: 1, recoveryTicks: 1, cooldownTicks: 0 },
      targeting: { kind: 'none', parameters: {} },
      effects: [{
        id: 'noop',
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: 1 },
      }],
      tags: [],
    }]);
    const system = new ActionExecutionSystem({ participantIds: ['p1', 'p2'], actionRegistry });
    const selected = {
      kind: ACTION_RESOLUTION_KIND.SELECTED,
      tick: 0,
      participantId: 'p1',
      inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
      lane: ACTION_LANE.COMBAT,
      reason: 'candidate-selected',
      candidateId: 'attack',
      actionDefinitionId: 'attack',
      source: 'base',
    };
    expect(() => system.start([selected, { ...selected, participantId: 'unknown' }])).toThrow(
      '未知 action participant',
    );
    expect(system.getSnapshot('p1').phase).toBe(ARENA_ACTION_PHASE.IDLE);
    expect(system.start([selected])[0]).toMatchObject({
      phase: ARENA_ACTION_PHASE.WINDUP,
      source: 'base',
    });
  });

  it('interrupts only the requested lane for equipment identity changes', () => {
    const { system } = createCheckpointFixture();
    expect(system.getLaneSnapshot('p1', ACTION_LANE.COMBAT).phase)
      .not.toBe(ARENA_ACTION_PHASE.IDLE);
    expect(system.getLaneSnapshot('p1', ACTION_LANE.LOCOMOTION).phase)
      .not.toBe(ARENA_ACTION_PHASE.IDLE);
    expect(system.interruptLane(['p1'], ACTION_LANE.COMBAT)).toMatchObject([{
      participantId: 'p1',
      lane: ACTION_LANE.COMBAT,
      actionDefinitionId: 'charged-attack',
    }]);
    expect(system.getLaneSnapshot('p1', ACTION_LANE.COMBAT).phase)
      .toBe(ARENA_ACTION_PHASE.IDLE);
    expect(system.getLaneSnapshot('p1', ACTION_LANE.LOCOMOTION).phase)
      .not.toBe(ARENA_ACTION_PHASE.IDLE);
  });

  it('exports every participant lane with complete commitment identity and stable ordering', () => {
    const { system } = createCheckpointFixture();
    const checkpoint = system.exportCheckpointV1();
    expect(checkpoint.schemaVersion).toBe(
      ACTION_EXECUTION_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION,
    );
    expect(checkpoint.participantIds).toEqual(['p1', 'p2']);
    expect(checkpoint.laneIds).toEqual(['combat', 'interaction', 'locomotion']);
    expect(checkpoint.states).toHaveLength(6);
    expect(checkpoint.states.map(({ participantId, lane }) => `${participantId}/${lane}`)).toEqual([
      'p1/combat',
      'p1/interaction',
      'p1/locomotion',
      'p2/combat',
      'p2/interaction',
      'p2/locomotion',
    ]);
    const combat = checkpoint.states[0]!;
    expect(combat).toMatchObject({
      participantId: 'p1',
      lane: ACTION_LANE.COMBAT,
      definitionId: 'charged-attack',
      phase: ARENA_ACTION_PHASE.ACTIVE,
      ticksRemaining: 2,
      hitTargetIds: ['p2'],
      commitmentStartedTick: 10,
      commitmentStatus: 'committed',
      commitmentChargeTicks: 4,
      commitmentChargeLevel: 2,
      commitmentFacingAtStart: { x: 1, z: 0 },
      commitmentFacingAtResult: { x: 0, z: 1 },
    });
    expect(combat.definitionIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
    const { checkpointIdentityHash, ...core } = checkpoint;
    expect(checkpointIdentityHash).toBe(createDeterministicDataHash(
      core,
      'ActionExecutionSystemCheckpointV1 expected identity',
    ));
    expect(Object.isFrozen(checkpoint)).toBe(true);
    expect(Object.isFrozen(checkpoint.states)).toBe(true);
    expect(Object.isFrozen(combat.hitTargetIds)).toBe(true);
  });

  it('restores the private started tick and produces the same next authority tick', () => {
    const actionRegistry = new ActionRegistry(checkpointActionDefinitions());
    const continuous = new ActionExecutionSystem({
      participantIds: ['p2', 'p1'],
      actionRegistry,
    });
    continuous.start([
      selectedAction('p1', 'charged-attack', ACTION_LANE.COMBAT, ACTION_INPUT_CHANNEL.PRIMARY),
    ]);
    advanceCheckpointFixture(continuous, 10, true, { x: 1, z: 0 });
    advanceCheckpointFixture(continuous, 11, true, { x: 0.8, z: 0.2 });
    const checkpoint = continuous.exportCheckpointV1();
    const restored = ActionExecutionSystem.restoreFromCheckpointV1(
      checkpoint,
      actionRegistry,
    );
    expect(restored.exportCheckpointV1()).toEqual(checkpoint);
    expect(restored.exportCheckpointV1().states[0]?.commitmentStartedTick).toBe(10);
    const commitmentOptions = {
      tick: 12,
      actors: [
        { id: 'p1', facing: { x: 0, z: 1 } },
        { id: 'p2', facing: { x: -1, z: 0 } },
      ],
      inputFrames: [
        checkpointInput(12, 'p1', false),
        checkpointInput(12, 'p2', false),
      ],
    } as const;
    expect(restored.applyCommitmentInputs(commitmentOptions)).toEqual(
      continuous.applyCommitmentInputs(commitmentOptions),
    );
    const continuousNext = continuous.advance();
    const restoredNext = restored.advance();
    expect(restoredNext).toEqual(continuousNext);
    expect(restored.exportCheckpointV1()).toEqual(continuous.exportCheckpointV1());
  });

  it('fails closed on identity, coverage, timing, commitment and registry tampering', () => {
    const { actionRegistry, system } = createCheckpointFixture();
    const checkpoint = system.exportCheckpointV1();

    const identityDrift = mutableCheckpointCopy(checkpoint);
    identityDrift.checkpointIdentityHash = '00000000';
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      identityDrift,
      actionRegistry,
    )).toThrow(/identity hash/u);

    const futureField = mutableCheckpointCopy(checkpoint);
    futureField.futureSchema = 2;
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      futureField,
      actionRegistry,
    )).toThrow(/不支持字段|futureSchema/u);

    const missingState = mutableCheckpointCopy(checkpoint);
    (missingState.states as unknown[]).pop();
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      withCoherentCheckpointHash(missingState),
      actionRegistry,
    )).toThrow(/完整覆盖/u);

    const reorderedStates = mutableCheckpointCopy(checkpoint);
    const reordered = reorderedStates.states as Array<Record<string, unknown>>;
    [reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      withCoherentCheckpointHash(reorderedStates),
      actionRegistry,
    )).toThrow(/稳定顺序/u);

    const invalidTiming = mutableCheckpointCopy(checkpoint);
    (invalidTiming.states as Array<Record<string, unknown>>)[0]!.ticksRemaining = 3;
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      withCoherentCheckpointHash(invalidTiming),
      actionRegistry,
    )).toThrow(/timing\/phase/u);

    const missingStartedTick = mutableCheckpointCopy(checkpoint);
    (missingStartedTick.states as Array<Record<string, unknown>>)[0]!
      .commitmentStartedTick = null;
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      withCoherentCheckpointHash(missingStartedTick),
      actionRegistry,
    )).toThrow(/commitmentStartedTick/u);

    const invalidChargeLevel = mutableCheckpointCopy(checkpoint);
    (invalidChargeLevel.states as Array<Record<string, unknown>>)[0]!
      .commitmentChargeLevel = 1;
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      withCoherentCheckpointHash(invalidChargeLevel),
      actionRegistry,
    )).toThrow(/commitmentChargeLevel/u);

    const unknownDefinition = mutableCheckpointCopy(checkpoint);
    (unknownDefinition.states as Array<Record<string, unknown>>)[0]!.definitionId = 'unknown';
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      withCoherentCheckpointHash(unknownDefinition),
      actionRegistry,
    )).toThrow(/未知 ActionDefinition/u);

    const changedDefinitions = checkpointActionDefinitions().map((definition) => (
      definition.id === 'charged-attack'
        ? { ...definition, timing: { ...definition.timing, windupTicks: 6 } }
        : definition
    ));
    const changedRegistry = new ActionRegistry(changedDefinitions);
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      checkpoint,
      changedRegistry,
    )).toThrow(/Definition identity hash/u);

    const changedLaneRegistry = new ActionRegistry(checkpointActionDefinitions().map((definition) => (
      definition.id === 'charged-attack'
        ? { ...definition, lane: ACTION_LANE.INTERACTION }
        : definition
    )));
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      checkpoint,
      changedLaneRegistry,
    )).toThrow(/id\/lane/u);

    let getterCalls = 0;
    const accessorCheckpoint = mutableCheckpointCopy(checkpoint);
    Object.defineProperty(accessorCheckpoint, 'schemaVersion', {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => ActionExecutionSystem.restoreFromCheckpointV1(
      accessorCheckpoint,
      actionRegistry,
    )).toThrow(/访问器|数据字段/u);
    expect(getterCalls).toBe(0);
  });

  it('resolves targeting from frozen snapshots in stable target id order', () => {
    const definition = new ActionRegistry([{
      schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
      id: 'attack',
      kind: 'attack',
      input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
      lane: ACTION_LANE.COMBAT,
      conflictTags: [],
      timing: { windupTicks: 1, activeTicks: 1, recoveryTicks: 1, cooldownTicks: 0 },
      targeting: {
        kind: 'facing-cone',
        parameters: { range: 2, minimumFacingDot: 0, maximumVerticalDifference: 1 },
      },
      effects: [{
        id: 'hitstun', kind: 'apply-hitstun', trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: 2 },
      }],
      tags: [],
    }]).require('attack');
    const targets = createDefaultTargetingRegistry().resolve({
      definition,
      source: { id: 'source', position: { x: 0, y: 0, z: 0 }, facing: { x: 1, z: 0 } },
      candidates: [
        { id: 'z', position: { x: 1, y: 0, z: 0 } },
        { id: 'a', position: { x: 1.5, y: 0, z: 0 } },
      ],
    });
    expect(targets).toEqual(['a', 'z']);
    expect(Object.isFrozen(targets)).toBe(true);
  });

  it('resolves rear-cone targeting from the target facing direction', () => {
    const definition = new ActionRegistry([{
      schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
      id: 'rear-attack',
      kind: 'attack',
      input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
      lane: ACTION_LANE.COMBAT,
      conflictTags: [],
      timing: { windupTicks: 1, activeTicks: 1, recoveryTicks: 1, cooldownTicks: 0 },
      targeting: {
        kind: 'rear-cone',
        parameters: { range: 3, minimumFacingDot: 0.75, maximumVerticalDifference: 1 },
      },
      effects: [{
        id: 'hitstun', kind: 'apply-hitstun', trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: 2 },
      }],
      tags: [],
    }]).require('rear-attack');
    const targets = createDefaultTargetingRegistry().resolve({
      definition,
      source: { id: 'source', position: { x: -1, y: 0, z: 0 }, facing: { x: 1, z: 0 } },
      candidates: [
        { id: 'back', position: { x: 0, y: 0, z: 0 }, facing: { x: 2, z: 0 } },
        { id: 'front', position: { x: 1, y: 0, z: 0 }, facing: { x: -1, z: 0 } },
        { id: 'side', position: { x: 0, y: 0, z: 1 }, facing: { x: 1, z: 0 } },
      ],
    });
    expect(targets).toEqual(['back']);
  });

  it('turns immutable action effects into frozen commands without retaining actor ownership', () => {
    const definition = new ActionRegistry([{
      schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
      id: 'attack',
      kind: 'attack',
      input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
      lane: ACTION_LANE.COMBAT,
      conflictTags: [],
      timing: { windupTicks: 1, activeTicks: 1, recoveryTicks: 1, cooldownTicks: 0 },
      targeting: { kind: 'none', parameters: {} },
      effects: [{
        id: 'hitstun', kind: 'apply-hitstun', trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: 2 },
      }],
      tags: [],
    }]).require('attack');
    const target = {
      id: 'target', position: { x: 1, y: 0, z: 0 }, facing: { x: -1, z: 0 },
    };
    const commands = createDefaultActionEffectRegistry().resolve(definition.effects[0]!, {
      actionDefinitionId: definition.id,
      source: { id: 'source', position: { x: 0, y: 0, z: 0 }, facing: { x: 1, z: 0 } },
      target,
    });
    target.position.x = 9;
    expect(commands).toEqual([{ kind: 'apply-hitstun', participantId: 'target', ticks: 2 }]);
    expect(Object.isFrozen(commands[0])).toBe(true);
  });

  it('validates the complete command batch before invoking any mutation handler', () => {
    let executions = 0;
    const registry = new RuleCommandRegistry([{
      kind: 'known',
      execute: () => { executions += 1; },
    }]);
    expect(() => registry.execute([{ kind: 'known' }, { kind: 'unknown' }], {})).toThrow(
      '未注册 RuleCommand unknown',
    );
    expect(executions).toBe(0);
  });

  it('cleans an invalid injected equipment system before rejecting construction', () => {
    const actionRegistry = new ActionRegistry([{
      schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
      id: 'attack',
      kind: 'attack',
      input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
      lane: ACTION_LANE.COMBAT,
      conflictTags: [],
      timing: { windupTicks: 1, activeTicks: 1, recoveryTicks: 1, cooldownTicks: 0 },
      targeting: { kind: 'none', parameters: {} },
      effects: [{
        id: 'hitstun', kind: 'apply-hitstun', trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: 2 },
      }],
      tags: [],
    }]);
    const equipmentRegistry = new EquipmentRegistry({ definitions: [], actionRegistry });
    let destroyed = false;
    expect(() => new ArenaRuleEngine({
      participantIds: ['p1'],
      baseActionDefinitionId: 'attack',
      baseAirActionDefinitionId: 'attack',
      actionRegistry,
      equipmentRegistry,
      targetingRegistry: createDefaultTargetingRegistry(),
      effectRegistry: createDefaultActionEffectRegistry(),
      commandRegistry: new RuleCommandRegistry(),
      movementCandidateProvider: { getCandidates: () => [] },
      movementCommandAdapter: { isCommandKind: () => false, createCommand: (command) => command },
      createEquipmentSystem: () => ({
        destroy() { destroyed = true; },
        // This fixture intentionally proves partial factory output is not leaked.
      } as never),
    })).toThrow('EquipmentSystem 缺少 getActionCandidate()');
    expect(destroyed).toBe(true);
  });

  it('interrupts an existing combat action after equipment ownership changes', () => {
    const actionRegistry = new ActionRegistry([{
      schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
      id: 'base-attack',
      kind: 'attack',
      input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: ACTION_INPUT_TRIGGER.PRESSED },
      lane: ACTION_LANE.COMBAT,
      conflictTags: [],
      timing: { windupTicks: 3, activeTicks: 1, recoveryTicks: 1, cooldownTicks: 0 },
      targeting: { kind: 'none', parameters: {} },
      effects: [{
        id: 'noop-base-attack',
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: 1 },
      }],
      tags: [],
    }]);
    const equipmentRegistry = new EquipmentRegistry({ definitions: [], actionRegistry });
    const engine = new ArenaRuleEngine({
      participantIds: ['p1'],
      baseActionDefinitionId: 'base-attack',
      baseAirActionDefinitionId: 'base-attack',
      actionRegistry,
      equipmentRegistry,
      targetingRegistry: createDefaultTargetingRegistry(),
      effectRegistry: createDefaultActionEffectRegistry(),
      commandRegistry: new RuleCommandRegistry(),
      movementCandidateProvider: { getCandidates: () => [] },
      movementCommandAdapter: { isCommandKind: () => false, createCommand: (command) => command },
      allowBaseAttackWhiff: true,
      createEquipmentSystem: () => ({
        getActionCandidate: () => null,
        getAerialActionCandidate: () => null,
        assertActionCanStart: () => ({}),
        markActionStarted: () => ({}),
        advanceCooldowns: () => [],
        spawn: () => ({}),
        resolvePickups: () => [{ participantId: 'p1', equipmentInstanceId: 'new-equipment' }],
        updateLastSafePosition: () => null,
        dropOwned: () => ({
          participantId: 'p1',
          equipment: {},
          fallbackUsed: false,
          despawned: false,
          diagnosticCode: null,
        }),
        despawnInvalidWorldEquipment: () => [],
        getHeldEquipment: () => null,
        getSnapshot: () => ({}),
        listSnapshots: () => [],
        listExpiredHeldSupplyEquipmentInstanceIds: () => [],
        destroy: () => {},
      } as never),
    });
    engine.resolveActions({
      tick: 0,
      actors: [{
        id: 'p1', canAct: true, targetable: true,
        position: { x: 0, y: 0, z: 0 }, facing: { x: 1, z: 0 },
      }],
      inputFrames: [{
        tick: 0, participantId: 'p1', moveX: 0, moveZ: 0,
        primaryPressed: true, primaryHeld: true,
        jumpPressed: false, jumpHeld: false, slamPressed: false,
      }],
    });
    expect(engine.getActionSnapshot('p1').phase).toBe(ARENA_ACTION_PHASE.WINDUP);
    expect(engine.resolveEquipmentPickups({})).toEqual([{
      participantId: 'p1', equipmentInstanceId: 'new-equipment',
    }]);
    expect(engine.getActionSnapshot('p1').phase).toBe(ARENA_ACTION_PHASE.IDLE);

    const secondStart = engine.resolveActions({
      tick: 1,
      actors: [{
        id: 'p1', canAct: true, targetable: true,
        position: { x: 0, y: 0, z: 0 }, facing: { x: 1, z: 0 },
      }],
      inputFrames: [{
        tick: 1, participantId: 'p1', moveX: 0, moveZ: 0,
        primaryPressed: true, primaryHeld: true,
        jumpPressed: false, jumpHeld: false, slamPressed: false,
      }],
    });
    expect(secondStart.starts).toHaveLength(1);
    expect(engine.getActionSnapshot('p1').phase).toBe(ARENA_ACTION_PHASE.WINDUP);
    expect(engine.dropEquipment('p1', {})).not.toBeNull();
    expect(engine.getActionSnapshot('p1').phase).toBe(ARENA_ACTION_PHASE.IDLE);
  });

  it('validates RuleEngine methods by bounded descriptors without invoking accessors', () => {
    let getterCalls = 0;
    const accessorEngine = Object.defineProperty({}, 'advanceTimers', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('rule method getter must not execute');
      },
    });
    expect(() => assertArenaRuleEngine(accessorEngine)).toThrow('数据方法');
    expect(getterCalls).toBe(0);

    const cyclicTarget = Object.create(null) as object;
    let cyclicEngine: object;
    cyclicEngine = new Proxy(cyclicTarget, {
      getPrototypeOf() {
        return cyclicEngine;
      },
    });
    expect(() => assertArenaRuleEngine(cyclicEngine)).toThrow('prototype 链不能循环');

    let tooDeepEngine = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      tooDeepEngine = Object.create(tooDeepEngine) as object;
    }
    expect(() => assertArenaRuleEngine(tooDeepEngine)).toThrow('prototype 链超过 32 层');
  });

  it('filters geometric hit candidates through the frozen directed target eligibility matrix', () => {
    const engine = createTargetEligibilityEngine(['source->hostile']);
    const actors = [{
      id: 'source', canAct: true, targetable: true,
      position: { x: 0, y: 0, z: 0 }, facing: { x: 1, z: 0 },
    }, {
      id: 'hostile', canAct: true, targetable: true,
      position: { x: 1, y: 0, z: 0 }, facing: { x: -1, z: 0 },
    }, {
      id: 'neutral', canAct: true, targetable: true,
      position: { x: 1.5, y: 0, z: 0 }, facing: { x: -1, z: 0 },
    }];
    engine.resolveActions({
      tick: 0,
      actors,
      inputFrames: actors.map(({ id }) => ({
        tick: 0,
        participantId: id,
        moveX: 0,
        moveZ: 0,
        primaryPressed: id === 'source',
        primaryHeld: id === 'source',
        jumpPressed: false,
        jumpHeld: false,
        slamPressed: false,
      })),
    });
    expect(engine.resolveActiveActions({ actors }).hits).toEqual([{
      attackerId: 'source',
      targetId: 'hostile',
      actionDefinitionId: 'relationship-attack',
    }]);
    engine.destroy();
  });

  it('binds target eligibility into Rule checkpoint identity', () => {
    const original = createTargetEligibilityEngine(['source->hostile']);
    const checkpoint = original.exportCheckpointV1();
    original.destroy();
    const restored = createTargetEligibilityEngine(['source->hostile'], checkpoint);
    expect(restored.exportCheckpointV1()).toEqual(checkpoint);
    restored.destroy();
    expect(() => createTargetEligibilityEngine(['source->neutral'], checkpoint)).toThrow(
      'checkpoint规则内容身份不一致',
    );
  });
});
