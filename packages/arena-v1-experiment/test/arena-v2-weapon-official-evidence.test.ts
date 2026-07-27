import { describe, expect, it } from 'vitest';
import { ARENA_V2_WEAPON_OFFICIAL_EVIDENCE } from '../src/index.js';

describe('Arena V2 official weapon evidence', () => {
  it('keeps a small source-backed evidence set separate from production weapons', () => {
    expect(ARENA_V2_WEAPON_OFFICIAL_EVIDENCE).toHaveLength(5);
    expect(new Set(ARENA_V2_WEAPON_OFFICIAL_EVIDENCE.map(({ referenceId }) => referenceId)).size)
      .toBe(5);
    for (const evidence of ARENA_V2_WEAPON_OFFICIAL_EVIDENCE) {
      expect(evidence.sourceUrl).toMatch(/^https:\/\/bfo\.web\.sdo\.com\//);
      expect(evidence.observedSignals.length).toBeGreaterThanOrEqual(3);
      expect(new Set(evidence.observedSignals.map(({ id }) => id)).size)
        .toBe(evidence.observedSignals.length);
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
    ]));
  });
});
