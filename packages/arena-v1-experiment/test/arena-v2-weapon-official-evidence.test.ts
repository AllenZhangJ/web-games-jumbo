import { describe, expect, it } from 'vitest';
import { ARENA_V2_WEAPON_OFFICIAL_EVIDENCE } from '../src/index.js';

describe('Arena V2 official weapon evidence', () => {
  it('keeps a small source-backed evidence set separate from production weapons', () => {
    expect(ARENA_V2_WEAPON_OFFICIAL_EVIDENCE).toHaveLength(9);
    expect(new Set(ARENA_V2_WEAPON_OFFICIAL_EVIDENCE.map(({ referenceId }) => referenceId)).size)
      .toBe(9);
    for (const evidence of ARENA_V2_WEAPON_OFFICIAL_EVIDENCE) {
      expect(evidence.sourceUrl).toMatch(/^https:\/\/bfo\.web\.sdo\.com\//);
      expect(evidence.observedSignals.length).toBeGreaterThanOrEqual(3);
      expect(new Set(evidence.observedSignals.map(({ id }) => id)).size)
        .toBe(evidence.observedSignals.length);
      expect(evidence.actionPatterns.length).toBeGreaterThanOrEqual(2);
      expect(new Set(evidence.actionPatterns.map(({ id }) => id)).size)
        .toBe(evidence.actionPatterns.length);
      expect(evidence.actionPatterns.every(({ input, observableOutcome, mapMeaning, failureCost }) => (
        input.length > 0
        && observableOutcome.length > 0
        && mapMeaning.length > 0
        && failureCost.length > 0
      ))).toBe(true);
      expect(evidence.arenaLesson.length).toBeGreaterThan(12);
    }
  });

  it('covers commitment, geometry, context, resource and persistent-threat evidence', () => {
    const ids = new Set(
      ARENA_V2_WEAPON_OFFICIAL_EVIDENCE.flatMap(({ observedSignals }) => (
        observedSignals.map(({ id }) => id)
      )),
    );
    expect([...ids]).toEqual(expect.arrayContaining([
      'charge-levels',
      'charge-cancel',
      'turn-during-charge',
      'fire-modes',
      'movement-contexts',
      'resource-cost',
      'rear-attack',
      'trap-duration',
      'obstruction-failure',
      'running-float',
      'rebound-projectile',
      'marked-delay',
      'hit-gated-branch',
    ]));
  });

  it('keeps representative official action patterns distinct by context and consequence', () => {
    const claw = ARENA_V2_WEAPON_OFFICIAL_EVIDENCE.find(({ referenceId }) => referenceId === 'red-demon-claw');
    const thor = ARENA_V2_WEAPON_OFFICIAL_EVIDENCE.find(({ referenceId }) => referenceId === 'true-thor-hammer');
    expect(claw?.actionPatterns.map(({ context }) => context)).toEqual(['running', 'charged', 'aerial']);
    expect(thor?.actionPatterns.map(({ context }) => context)).toEqual(['delayed', 'resource']);
    expect(claw?.actionPatterns[0]?.mapMeaning).toContain('窄路');
    expect(thor?.actionPatterns[1]?.observableOutcome).toContain('连锁');
  });
});
