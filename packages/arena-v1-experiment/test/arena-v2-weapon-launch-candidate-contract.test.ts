import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_LAUNCH_CANDIDATES,
  ARENA_V2_WEAPON_LAUNCH_LANGUAGE_IDS,
} from '../src/index.js';

describe('Arena V2 weapon launch candidate contract', () => {
  it('selects six distinct ready languages in a deliberate learning order', () => {
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.map(({ displayName }) => displayName)).toEqual([
      '冲锋盾',
      '重锤',
      '引力锁链',
      '直线压制候选',
      '读招反制候选',
      '绕后候选',
    ]);
    expect(ARENA_V2_WEAPON_LAUNCH_LANGUAGE_IDS).toEqual([
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.APPROACH,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.PUSH_AWAY,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.REPOSITION,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
      ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
    ]);
    expect(new Set(ARENA_V2_WEAPON_LAUNCH_LANGUAGE_IDS).size).toBe(6);
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.every(({ readiness }) => readiness === 'ready')).toBe(true);
  });

  it('keeps three current production baselines and three research-only candidates', () => {
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.filter(({ source }) => (
      source === 'production-baseline'
    )).map(({ productionEquipmentDefinitionId }) => productionEquipmentDefinitionId)).toEqual([
      'shield',
      'hammer',
      'chain',
    ]);
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.filter(({ source }) => (
      source === 'research-candidate'
    )).map(({ referenceId }) => referenceId)).toEqual([
      'white-platinum-dual-guns',
      'phantom-tiger-fist',
      'blood-blade',
    ]);
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.filter(({ implementationStatus }) => (
      implementationStatus === 'research-contract-only'
    ))).toHaveLength(3);
  });

  it('exposes public overview axes for every candidate', () => {
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.every(({ requiredPublicAxes }) => (
      requiredPublicAxes.length >= 4
    ))).toBe(true);
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.find(({ languageId }) => (
      languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH
    ))?.requiredPublicAxes).toContain('active-frames');
    expect(ARENA_V2_WEAPON_LAUNCH_CANDIDATES.find(({ languageId }) => (
      languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK
    ))?.requiredPublicAxes).toContain('direction-tolerance');
  });

  it('freezes the candidate collection and each candidate', () => {
    expect(Object.isFrozen(ARENA_V2_WEAPON_LAUNCH_CANDIDATES)).toBe(true);
    expect(Object.isFrozen(ARENA_V2_WEAPON_LAUNCH_CANDIDATES[0])).toBe(true);
    expect(Object.isFrozen(ARENA_V2_WEAPON_LAUNCH_CANDIDATES[0]?.requiredPublicAxes)).toBe(true);
  });
});
