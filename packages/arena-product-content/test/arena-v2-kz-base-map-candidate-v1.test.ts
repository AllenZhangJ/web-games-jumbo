import { describe, expect, it } from 'vitest';
import {
  KZ_ROUTE_INPUT,
  KzRouteRegistryV2,
  createKzRouteDefinitionV2,
  createMapDefinition,
} from '@number-strategy-jump/arena-definitions';
import { validateKzRouteMapCandidateV1 } from '@number-strategy-jump/arena-map';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MOBILITY_ENVELOPE_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from '../src/arena-v2-kz-base-map-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('Arena V2 KZ base map candidate V1', () => {
  it('freezes one twelve-segment map for both Race and Survival without new inputs', () => {
    expect(ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.status).toBe('production-unreachable');
    expect(ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.hardGate).toBe(false);
    expect(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.requiredInputs).toEqual([
      KZ_ROUTE_INPUT.DIRECTION,
      KZ_ROUTE_INPUT.JUMP,
    ]);
    expect(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.segments).toHaveLength(12);
    expect(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.startAnchorIds).toHaveLength(4);
    expect(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.respawnDelayTicks).toBe(180);
    expect(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.supplyPoints).toHaveLength(12);
    expect(ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.staticValidation).toMatchObject({
      segmentCount: 12,
      branchCount: 8,
      surfaceCount: 34,
      supplyPointCount: 12,
      survivalLinkCount: 22,
    });
  });

  it('builds an explicit registry with a deterministic content identity', () => {
    const source = {
      definitions: [ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2],
      mapDefinitionIds: [ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1.id],
    };
    const first = new KzRouteRegistryV2(source);
    const second = new KzRouteRegistryV2(clone(source));
    expect(first.require(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.id))
      .toEqual(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2);
    expect(first.contentHash).toBe(second.contentHash);
  });

  it('fails closed on added fields, new inputs and disconnected map identities', () => {
    const extraField = clone(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2) as unknown as
      Record<string, unknown>;
    extraField.unknown = true;
    expect(() => createKzRouteDefinitionV2(extraField)).toThrow(/unknown|不支持字段/);

    const newInput = clone(ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2) as unknown as
      Record<string, unknown>;
    newInput.requiredInputs = ['direction', 'jump', 'dash'];
    expect(() => createKzRouteDefinitionV2(newInput)).toThrow(/direction 与 jump/);

    expect(() => new KzRouteRegistryV2({
      definitions: [ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2],
      mapDefinitionIds: ['different-map'],
    })).toThrow(/未注册 map/);
  });

  it('rejects a route outside the declared mobility envelope and a detached supply anchor', () => {
    expect(() => validateKzRouteMapCandidateV1(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
      ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1,
      { ...ARENA_V2_KZ_BASE_MOBILITY_ENVELOPE_CANDIDATE_V1, maximumJumpGap: 1.9 },
    )).toThrow(/跳跃间隙/);

    const mapValue = clone(ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1.toJSON());
    const firstSupply = mapValue.equipmentSpawnPoints[0]! as {
      position: { x: number; y: number; z: number };
    };
    firstSupply.position.x += 0.1;
    const detached = createMapDefinition(mapValue);
    expect(() => validateKzRouteMapCandidateV1(
      ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
      detached,
      ARENA_V2_KZ_BASE_MOBILITY_ENVELOPE_CANDIDATE_V1,
    )).toThrow(/未与 anchor/);
  });
});
