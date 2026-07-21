import { describe, expect, it } from 'vitest';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ActionRegistry,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_ACTION_PHASE,
  ACTION_RESOLUTION_KIND,
  ActionExecutionSystem,
  RuleCommandRegistry,
  compareActionCandidates,
  createActionCandidate,
  createActionRuntimeState,
  createDefaultActionEffectRegistry,
  createDefaultTargetingRegistry,
  resetActionRuntimeState,
} from '../src/index.js';

describe('Arena action core primitives', () => {
  it('resets all mutable action runtime fields without replacing hit ownership', () => {
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
        kind: 'noop',
        trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
        parameters: {},
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
    expect(system.start([selected])[0]?.phase).toBe(ARENA_ACTION_PHASE.WINDUP);
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
});
