import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LINE_PRESSURE_DEFINITION_PROTOTYPE,
  createArenaV2LinePressureDefinitionPrototype,
} from '../src/index.js';

describe('Arena V2 line-pressure Definition prototype', () => {
  it('projects ground and aerial ActionDefinitions into comparable public numbers', () => {
    const prototype = ARENA_V2_LINE_PRESSURE_DEFINITION_PROTOTYPE;
    expect(prototype).toMatchObject({
      weaponId: 'research-line-pressure',
      languageId: 'line-pressure',
      status: 'research-only',
      groundActionDefinitionId: 'research-line-pressure-ground',
      aerialActionDefinitionId: 'research-line-pressure-aerial',
    });
    expect(prototype.groundStats).toMatchObject({
      range: 5.5,
      windupTicks: 8,
      activeTicks: 3,
      recoveryTicks: 18,
      cooldownTicks: 60,
      impactDistance: 0.55,
      verticalImpulse: 2.2,
      hitstunTicks: 12,
      selfMovementImpulse: 0,
      heightGap: 1.5,
    });
    expect(prototype.groundStats.coverage).toBeCloseTo(6.6, 10);
    expect(prototype.groundStats.directionToleranceDegrees).toBeCloseTo(73.74, 1);
    expect(prototype.aerialStats).toMatchObject({
      range: 3,
      coverage: 2.2,
      windupTicks: 6,
      cooldownTicks: 60,
      heightGap: 3,
    });
    expect(prototype.publicOverviewAxes).toHaveLength(11);
  });

  it('binds numeric projection to deterministic hit and miss evidence', () => {
    expect(ARENA_V2_LINE_PRESSURE_DEFINITION_PROTOTYPE.probe).toEqual({
      holdOutcome: 'hit',
      holdFirstHitTick: 8,
      stepOutOutcome: 'miss',
      stepOutFirstHitTick: null,
      responseTicks: 8,
    });
    expect(ARENA_V2_LINE_PRESSURE_DEFINITION_PROTOTYPE.counterplay).toEqual([
      '绕出攻击线',
      '贴身压迫',
      '利用高低差',
    ]);
  });

  it('keeps the prototype research-only and deeply frozen', () => {
    const rebuilt = createArenaV2LinePressureDefinitionPrototype();
    expect(rebuilt.status).toBe('research-only');
    expect(Object.isFrozen(rebuilt)).toBe(true);
    expect(Object.isFrozen(rebuilt.groundStats)).toBe(true);
    expect(Object.isFrozen(rebuilt.aerialStats)).toBe(true);
    expect(Object.isFrozen(rebuilt.probe)).toBe(true);
  });
});
