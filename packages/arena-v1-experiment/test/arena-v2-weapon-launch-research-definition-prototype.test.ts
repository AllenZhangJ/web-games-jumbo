import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
  findArenaV2WeaponLaunchResearchDefinitionPrototype,
} from '../src/index.js';

describe('Arena V2 launch research Definition prototypes', () => {
  it('compiles the three research launch candidates into comparable ground/aerial values', () => {
    expect(ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES).toHaveLength(3);
    expect(ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ languageId }) => languageId))
      .toEqual(['line-pressure', 'read-punish', 'flank']);
    for (const prototype of ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES) {
      expect(prototype.status).toBe('research-only');
      expect(prototype.publicOverviewAxes).toHaveLength(9);
      expect(prototype.publicBehaviorAxes).toEqual(['active-frames', 'direction-tolerance']);
      expect(prototype.groundStats.range).toBeGreaterThan(0);
      expect(prototype.aerialStats.range).toBeGreaterThan(0);
      expect(prototype.groundStats.windupTicks).toBeGreaterThan(0);
      expect(prototype.aerialStats.cooldownTicks).toBeGreaterThan(0);
      expect(prototype.probe).toMatchObject({
        holdOutcome: 'hit',
        stepOutOutcome: 'miss',
        stepOutFirstHitTick: null,
      });
    }
  });

  it('keeps the three languages numerically distinguishable in the overview', () => {
    const line = findArenaV2WeaponLaunchResearchDefinitionPrototype('launch-04-line-pressure');
    const readPunish = findArenaV2WeaponLaunchResearchDefinitionPrototype('launch-05-read-punish');
    const flank = findArenaV2WeaponLaunchResearchDefinitionPrototype('launch-06-flank');
    expect(line?.groundStats.range).toBeGreaterThan(readPunish?.groundStats.range ?? 0);
    expect(readPunish?.groundStats.windupTicks).toBeGreaterThan(flank?.groundStats.windupTicks ?? 0);
    expect(readPunish?.groundStats.impactDistance).toBeGreaterThan(flank?.groundStats.impactDistance ?? 0);
    expect(flank?.groundStats.directionToleranceDegrees).toBeLessThan(180);
  });

  it('keeps Definition evidence and projections deeply frozen', () => {
    const prototype = findArenaV2WeaponLaunchResearchDefinitionPrototype('launch-04-line-pressure');
    expect(prototype).toBeDefined();
    expect(Object.isFrozen(prototype)).toBe(true);
    expect(Object.isFrozen(prototype?.groundAction)).toBe(true);
    expect(Object.isFrozen(prototype?.groundStats)).toBe(true);
    expect(Object.isFrozen(prototype?.probe)).toBe(true);
  });
});
