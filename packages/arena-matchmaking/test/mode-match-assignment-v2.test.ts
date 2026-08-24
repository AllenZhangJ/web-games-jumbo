import { describe, expect, it } from 'vitest';
import {
  MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION,
  createModeMatchAssignmentPlanV2,
} from '../src/index.js';

function options() {
  return {
    schemaVersion: MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION,
    matchSeed: 7,
    roster: {
      schemaVersion: 2,
      modeDefinitionId: 'mode.race.test.v1',
      participants: [
        {
          participantId: 'p1', modeRole: 'competitor', teamId: null,
          controllerKind: 'human', slotId: null, slotGeneration: 0,
        },
        {
          participantId: 'p2', modeRole: 'competitor', teamId: null,
          controllerKind: 'bot', slotId: null, slotGeneration: 0,
        },
      ],
    },
  } as const;
}

describe('P2.5 mode assignment plan V2 candidate', () => {
  it('derives isolated named streams and a stable authority hash', () => {
    const first = createModeMatchAssignmentPlanV2(options());
    const second = createModeMatchAssignmentPlanV2(options());
    expect(first).toEqual(second);
    expect(first.seeds.controllers.map(({ participantId }) => participantId)).toEqual(['p2']);
    expect(new Set([
      first.seeds.content,
      first.seeds.map,
      first.seeds.equipmentSupply,
      first.seeds.controllers[0]?.seed,
    ]).size).toBe(4);
  });

  it('rejects non-canonical roster and hostile future fields', () => {
    const source = options();
    expect(() => createModeMatchAssignmentPlanV2({ ...source, future: true }))
      .toThrow(/future/);
    expect(() => createModeMatchAssignmentPlanV2({
      ...source,
      roster: {
        ...source.roster,
        participants: [...source.roster.participants].reverse(),
      },
    })).toThrow(/稳定升序/);
  });
});
