import { describe, expect, it } from 'vitest';

import {
  ARENA_V2_FORMAL_VFX_CAMERA_EDGE_SAFE_COMPOSITION_CANDIDATE_V1,
  composeArenaV2FormalVfxCameraEdgeSafeCandidateV1,
  type ArenaV2FormalVfxCameraEdgeLaneCandidateV1,
} from '../src/index.js';

function entry(
  sourceEventId: string,
  lane: ArenaV2FormalVfxCameraEdgeLaneCandidateV1,
  x: number,
  y: number,
  z = 0,
  anchorIdentity = 'participant:["p1","body-impact"]',
) {
  return {
    sourceEventId,
    anchorIdentity,
    lane,
    projectedAnchorNdc: { x, y, z },
  } as const;
}

function composeAt(x: number, y: number, z = 0) {
  return composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
    schemaVersion: 1,
    entries: [
      entry('primary', 'primary-center', x, y, z),
      entry('secondary', 'secondary-upper-left', x, y, z),
      entry('tertiary', 'tertiary-upper-right', x, y, z),
    ],
  });
}

describe('Arena V2 formal VFX camera-edge safe composition candidate V1', () => {
  it('keeps the center fan and rotates single-edge fans toward the frame interior', () => {
    expect(composeAt(0, 0).map(({ offsetCameraX, offsetCameraY }) => (
      [offsetCameraX, offsetCameraY]
    ))).toEqual([[0, 0], [-0.24, 0.18], [0.24, 0.18]]);
    expect(composeAt(-0.9, 0).map(({ offsetCameraX, offsetCameraY }) => (
      [offsetCameraX, offsetCameraY]
    ))).toEqual([[0, 0], [0.18, 0.24], [0.18, -0.24]]);
    expect(composeAt(0.9, 0).map(({ offsetCameraX, offsetCameraY }) => (
      [offsetCameraX, offsetCameraY]
    ))).toEqual([[0, 0], [-0.18, -0.24], [-0.18, 0.24]]);
    expect(composeAt(0, 0.9).map(({ offsetCameraX, offsetCameraY }) => (
      [offsetCameraX, offsetCameraY]
    ))).toEqual([[0, 0], [-0.24, -0.18], [0.24, -0.18]]);
    expect(composeAt(0, -0.9).map(({ offsetCameraX, offsetCameraY }) => (
      [offsetCameraX, offsetCameraY]
    ))).toEqual([[0, 0], [-0.24, 0.18], [0.24, 0.18]]);
  });

  it('uses distinct two-axis inward lanes at all four camera corners', () => {
    const cases = [
      [-0.9, 0.9, 'top-left', [[0, 0], [0.18, -0.24], [0.24, -0.18]]],
      [0.9, 0.9, 'top-right', [[0, 0], [-0.18, -0.24], [-0.24, -0.18]]],
      [-0.9, -0.9, 'bottom-left', [[0, 0], [0.18, 0.24], [0.24, 0.18]]],
      [0.9, -0.9, 'bottom-right', [[0, 0], [-0.18, 0.24], [-0.24, 0.18]]],
    ] as const;
    for (const [x, y, edgeBias, offsets] of cases) {
      const result = composeAt(x, y);
      expect(result.every((lane) => lane.edgeBias === edgeBias)).toBe(true);
      expect(result.map(({ offsetCameraX, offsetCameraY }) => (
        [offsetCameraX, offsetCameraY]
      ))).toEqual(offsets);
      expect(new Set(result.map(({ offsetCameraX, offsetCameraY }) => (
        `${offsetCameraX}:${offsetCameraY}`
      ))).size).toBe(3);
    }
  });

  it('keeps depth-outside projections conservative and returns deterministic frozen data', () => {
    const first = composeAt(0.95, 0.95, 2);
    const second = composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
      schemaVersion: 1,
      entries: [
        entry('tertiary', 'tertiary-upper-right', 0.95, 0.95, 2),
        entry('primary', 'primary-center', 0.95, 0.95, 2),
        entry('secondary', 'secondary-upper-left', 0.95, 0.95, 2),
      ],
    });

    expect(second).toEqual(first);
    expect(first.every(({ edgeBias }) => edgeBias === 'center')).toBe(true);
    expect(first.every(({ projectionDepthVisible }) => !projectionDepthVisible)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every(Object.isFrozen)).toBe(true);
  });

  it('fails closed for duplicate lanes, projection drift and hostile fields', () => {
    expect(() => composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
      schemaVersion: 1,
      entries: [
        entry('a', 'primary-center', 0, 0),
        entry('b', 'primary-center', 0, 0),
      ],
    })).toThrow(/重复lane/u);
    expect(() => composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
      schemaVersion: 1,
      entries: [
        entry('a', 'primary-center', 0, 0),
        entry('b', 'secondary-upper-left', 0.1, 0),
      ],
    })).toThrow(/投影漂移/u);
    expect(() => composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
      schemaVersion: 1,
      entries: [{ ...entry('a', 'primary-center', 0, 0), future: true }],
    })).toThrow();
    expect(() => composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
      schemaVersion: 1,
      entries: [entry('a', 'primary-center', Number.NaN, 0)],
    })).toThrow(/有限数字/u);
    expect(() => composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({
      schemaVersion: 1,
      entries: [Object.defineProperty({}, 'sourceEventId', { get: () => 'a' })],
    })).toThrow();
  });

  it('publishes only the production-unreachable zero-resource candidate contract', () => {
    expect(ARENA_V2_FORMAL_VFX_CAMERA_EDGE_SAFE_COMPOSITION_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      maximumActiveEffects: 3,
      maximumSameAnchorLanes: 3,
      keepsPrimaryAtAuthoritativeVisualAnchor: true,
      usesForwardProjectionOnly: true,
      usesUnprojection: false,
      measuresEffectRadiusOrClipRect: false,
      guaranteesFullViewportContainment: false,
      addsGeometry: false,
      addsMaterial: false,
      addsTexture: false,
      addsDrawCall: false,
      defaultEntryWired: false,
    });
  });
});
