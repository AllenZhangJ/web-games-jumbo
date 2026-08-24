import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1,
  ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_KZ_ROUTE_THREE_SHAPE_LANGUAGE_CANDIDATE_V1 as CATALOG,
  resolveArenaV2KzRouteThreeShapeLanguageCandidateV1,
} from '../src/index.js';

describe('Arena V2 KZ route Three shape language candidate V1 (not run)', () => {
  it('closes the six guidance by four risk directory with unique static transforms', () => {
    const resolved = ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1.flatMap(
      (guidanceShape) => ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1.map((riskShape) => (
        resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({ guidanceShape, riskShape })
      )),
    );
    expect(resolved).toHaveLength(24);
    expect(new Set(resolved.map(({ transform }) => JSON.stringify(transform))).size).toBe(24);
    expect(new Set(resolved.map(({ shapeIdentity }) => shapeIdentity)).size).toBe(24);
    expect(resolved.every(({ colorIsNeverSoleSignal }) => colorIsNeverSoleSignal)).toBe(true);
    expect(resolved.every(({ transform }) => Object.isFrozen(transform))).toBe(true);
    expect(CATALOG).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      guidanceShapeCount: 6,
      riskShapeCount: 4,
      exactCombinationCount: 24,
      usesExistingAuthoredSegmentEntryCueOnly: true,
      createsGeometryOrMaterials: false,
      changesCollisionRouteOrAuthority: false,
      usesColorAsSoleSignal: false,
      usesWallClockRandomOrAnimation: false,
      defaultEntryWired: false,
    });
  });

  it('is deterministic for the same route semantics and keeps guidance and risk both visible', () => {
    const first = resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
      guidanceShape: 'broken-gap',
      riskShape: 'striped-pressure',
    });
    const second = resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
      guidanceShape: 'broken-gap',
      riskShape: 'striped-pressure',
    });
    expect(second).toEqual(first);
    expect(second.shapeIdentity).toBe(first.shapeIdentity);
    expect(first.transform.scaleX).not.toBe(first.transform.scaleZ);
    expect(first.transform.rotationZRadians).not.toBe(0);
  });

  it('rejects future fields, unknown identities, accessors and symbols before resolution', () => {
    expect(() => resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
      guidanceShape: 'future-guidance',
      riskShape: 'solid-safe',
    })).toThrow(/未知guidanceShape/);
    expect(() => resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
      guidanceShape: 'stable-platform',
      riskShape: 'future-risk',
    })).toThrow(/未知riskShape/);
    expect(() => resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
      guidanceShape: 'stable-platform',
      riskShape: 'solid-safe',
      inferredDanger: true,
    })).toThrow(/不支持字段/);
    const accessor = {
      get guidanceShape(): string { throw new Error('getter must not run'); },
      riskShape: 'solid-safe',
    };
    expect(() => resolveArenaV2KzRouteThreeShapeLanguageCandidateV1(accessor))
      .toThrow(/可枚举数据字段/);
    const symbolInput: Record<PropertyKey, unknown> = {
      guidanceShape: 'stable-platform',
      riskShape: 'solid-safe',
    };
    symbolInput[Symbol('future')] = true;
    expect(() => resolveArenaV2KzRouteThreeShapeLanguageCandidateV1(symbolInput))
      .toThrow(/Symbol键/);
  });
});
