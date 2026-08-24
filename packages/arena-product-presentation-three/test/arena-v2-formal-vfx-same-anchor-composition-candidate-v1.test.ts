import { describe, expect, it } from 'vitest';

import {
  ARENA_V2_FORMAL_VFX_SAME_ANCHOR_COMPOSITION_CANDIDATE_V1,
  composeArenaV2FormalVfxSameAnchorCandidateV1,
} from '../src/index.js';

function entry(
  sourceEventId: string,
  semanticRank: 0 | 1 | 2 | 3,
  anchorIdentity = 'participant:["p1","body-impact"]',
  tick = 12,
  sequence = 12,
) {
  return {
    sourceEventId,
    anchorIdentity,
    tick,
    sequence,
    semanticRank,
  } as const;
}

describe('Arena V2 formal VFX same-anchor composition candidate V1', () => {
  it('keeps the strongest result centered and separates the remaining two without new resources', () => {
    const result = composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [
        entry('hit', 1, undefined, 10, 10),
        entry('ring-out', 3, undefined, 10, 12),
        entry('transfer', 2, undefined, 10, 11),
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        sourceEventId: 'ring-out',
        lane: 'primary-center',
        offsetCameraX: 0,
        offsetCameraY: 0,
      }),
      expect.objectContaining({
        sourceEventId: 'transfer',
        lane: 'secondary-upper-left',
        offsetCameraX: -0.24,
        offsetCameraY: 0.18,
      }),
      expect.objectContaining({
        sourceEventId: 'hit',
        lane: 'tertiary-upper-right',
        offsetCameraX: 0.24,
        offsetCameraY: 0.18,
      }),
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.every(Object.isFrozen)).toBe(true);
    expect(ARENA_V2_FORMAL_VFX_SAME_ANCHOR_COMPOSITION_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      maximumActiveEffects: 3,
      addsGeometry: false,
      addsMaterial: false,
      addsTexture: false,
      addsDrawCall: false,
      defaultEntryWired: false,
    });
  });

  it('is independent of input order and keeps distinct anchors centered', () => {
    const first = composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [
        entry('b', 1, 'participant:["p2","body-impact"]'),
        entry('a', 3, 'participant:["p1","body-impact"]'),
      ],
    });
    const second = composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [
        entry('a', 3, 'participant:["p1","body-impact"]'),
        entry('b', 1, 'participant:["p2","body-impact"]'),
      ],
    });

    expect(second).toEqual(first);
    expect(first.map(({ lane }) => lane)).toEqual(['primary-center', 'primary-center']);
  });

  it('uses tick, sequence and source identity as deterministic same-rank tie breakers', () => {
    const result = composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [
        entry('b', 1, undefined, 10, 11),
        entry('c', 1, undefined, 11, 1),
        entry('a', 1, undefined, 10, 11),
      ],
    });

    expect(result.map(({ sourceEventId }) => sourceEventId)).toEqual(['c', 'a', 'b']);
  });

  it('fails closed for duplicate, overflow, future fields and accessors', () => {
    expect(() => composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [entry('same', 1), entry('same', 2)],
    })).toThrow(/重复sourceEventId/u);
    expect(() => composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [entry('a', 0), entry('b', 1), entry('c', 2), entry('d', 3)],
    })).toThrow(/最多接受3项/u);
    expect(() => composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [{ ...entry('a', 1), future: true }],
    })).toThrow();
    expect(() => composeArenaV2FormalVfxSameAnchorCandidateV1({
      schemaVersion: 1,
      entries: [Object.defineProperty({}, 'sourceEventId', { get: () => 'a' })],
    })).toThrow();
  });
});
