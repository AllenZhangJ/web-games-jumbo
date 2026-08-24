import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_UNARMED_ACTION_CANDIDATE_V1,
} from '../src/index.js';

describe('Arena V2 unarmed action candidate v1', () => {
  it('keeps no-weapon play on the same primary ground/aerial contract', () => {
    const candidate = ARENA_V2_UNARMED_ACTION_CANDIDATE_V1;
    expect(candidate.status).toBe('production-unreachable');
    expect(candidate.hardGate).toBe(false);
    expect(candidate.defaultRegistryWired).toBe(false);
    expect(candidate.requiredInput).toBe('primary');
    expect(candidate.addsInput).toBe(false);
    expect(candidate.guardEnabled).toBe(false);
    expect(candidate.actions).toHaveLength(2);
    expect(candidate.actions.map(({ input }) => input)).toEqual([
      { channel: 'primary', trigger: 'pressed' },
      { channel: 'primary', trigger: 'pressed' },
    ]);
    expect(candidate.actions.map(({ kind }) => kind)).toEqual([
      'equipment-attack', 'aerial-attack',
    ]);
    expect(candidate.actions.flatMap(({ effects }) => effects.map(({ kind }) => kind))).not
      .toEqual(expect.arrayContaining(['front-guard', 'guard', 'damage-reduction', 'invulnerability']));
    expect(candidate.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
