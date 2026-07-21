import { describe, expect, it } from 'vitest';
import {
  ARENA_ACTION_PHASE,
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
});
