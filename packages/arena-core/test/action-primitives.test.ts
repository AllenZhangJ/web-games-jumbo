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
  compareActionCandidates,
  createActionCandidate,
  createActionRuntimeState,
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
});
