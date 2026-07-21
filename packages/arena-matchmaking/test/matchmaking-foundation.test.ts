import { describe, expect, it } from 'vitest';
import {
  copyMatchAssignmentDiagnostics,
  createMatchAssignment,
  OPPONENT_PROFILES,
  SequentialMatchSeedSource,
} from '../src/index.js';

describe('arena-matchmaking deterministic foundation', () => {
  it('preserves deterministic named streams and frozen public values', () => {
    const first = createMatchAssignment({ matchSeed: 0x12345678 });
    const second = createMatchAssignment({ matchSeed: 0x12345678 });
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.opponent)).toBe(true);
    expect(Object.isFrozen(first.seeds)).toBe(true);
    expect(Object.isFrozen(copyMatchAssignmentDiagnostics(first))).toBe(true);
    expect(OPPONENT_PROFILES).toHaveLength(12);

    const sequenceA = new SequentialMatchSeedSource(7);
    const sequenceB = new SequentialMatchSeedSource(7);
    expect([sequenceA.nextSeed(), sequenceA.nextSeed()]).toEqual([
      sequenceB.nextSeed(),
      sequenceB.nextSeed(),
    ]);
  });

  it('rejects assignment accessors without executing caller code', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'matchSeed', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 7;
      },
    });
    expect(() => createMatchAssignment(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });
});
