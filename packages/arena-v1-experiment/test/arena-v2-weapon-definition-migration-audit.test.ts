import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS,
  ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID,
  ARENA_V2_WEAPON_PUBLIC_AXIS_AUTHORITY_SOURCES,
} from '../src/index.js';

describe('Arena V2 weapon Definition migration audit', () => {
  it('proves current production baselines can project every required public axis', () => {
    const productionAudits = ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS.filter(({ source }) => (
      source === 'production-baseline'
    ));
    expect(productionAudits).toHaveLength(3);
    expect(productionAudits.every(({ status, missingOverviewAxes, contexts }) => (
      status === 'ready'
      && missingOverviewAxes.length === 0
      && contexts.every(({ missingAxes }) => missingAxes.length === 0)
    ))).toBe(true);
    expect(productionAudits.map(({ groundActionDefinitionId, aerialActionDefinitionId }) => [
      groundActionDefinitionId,
      aerialActionDefinitionId,
    ])).toEqual([
      ['shield-charge', 'shield-air-drop'],
      ['hammer-smash', 'hammer-air-smash'],
      ['chain-pull', 'chain-air-lash'],
    ]);
  });

  it('keeps research candidates research-only after their minimum Definition gaps close', () => {
    const researchAudits = ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS.filter(({ source }) => (
      source === 'research-candidate'
    ));
    expect(researchAudits).toHaveLength(3);
    expect(researchAudits.every(({ status, implementationStatus, productionEquipmentDefinitionId }) => (
      status === 'ready'
      && implementationStatus === 'research-only-definition'
      && productionEquipmentDefinitionId === null
    ))).toBe(true);
    expect(researchAudits.every(({ structuralGaps, contexts, missingOverviewAxes }) => (
      structuralGaps.length === 0
      && missingOverviewAxes.length === 0
      && contexts.every(({ missingAxes }) => missingAxes.length === 0)
    ))).toBe(true);
    expect(researchAudits.find(({ languageId }) => (
      languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE
    ))).toMatchObject({
      groundActionDefinitionId: 'research-line-pressure-ground',
      aerialActionDefinitionId: 'research-line-pressure-aerial',
    });
    expect(researchAudits.find(({ languageId }) => (
      languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH
    ))).toMatchObject({
      groundActionDefinitionId: 'research-read-punish-ground',
      aerialActionDefinitionId: 'research-read-punish-aerial',
    });
    expect(researchAudits.find(({ languageId }) => (
      languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK
    ))).toMatchObject({
      groundActionDefinitionId: 'research-flank-ground',
      aerialActionDefinitionId: 'research-flank-aerial',
    });
  });

  it('keeps one explicit authority source contract for the eleven public axes', () => {
    expect(ARENA_V2_WEAPON_PUBLIC_AXIS_AUTHORITY_SOURCES).toHaveLength(11);
    expect(new Set(ARENA_V2_WEAPON_PUBLIC_AXIS_AUTHORITY_SOURCES.map(({ axisId }) => axisId)).size).toBe(11);
    expect(ARENA_V2_WEAPON_PUBLIC_AXIS_AUTHORITY_SOURCES.find(({ axisId }) => (
      axisId === 'coverage'
    ))).toMatchObject({
      projection: 'derived',
      sourceFieldPath: 'action.tuning.targeting.radius | minimumFacingDot',
    });
    expect(ARENA_V2_WEAPON_PUBLIC_AXIS_AUTHORITY_SOURCES.find(({ axisId }) => (
      axisId === 'self-movement'
    ))).toMatchObject({
      projection: 'direct',
      sourceFieldPath: 'action.tuning.selfMovement.horizontalImpulse',
    });
  });

  it('freezes the audit and authority source snapshots', () => {
    expect(Object.isFrozen(ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS)).toBe(true);
    expect(Object.isFrozen(ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS[0])).toBe(true);
    expect(Object.isFrozen(ARENA_V2_WEAPON_DEFINITION_MIGRATION_AUDITS[0]?.contexts)).toBe(true);
    expect(Object.isFrozen(ARENA_V2_WEAPON_PUBLIC_AXIS_AUTHORITY_SOURCES)).toBe(true);
  });
});
