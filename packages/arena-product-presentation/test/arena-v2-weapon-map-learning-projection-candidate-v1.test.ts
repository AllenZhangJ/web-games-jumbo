import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_MAP_LEARNING_PROJECTION_CONTRACT_V1,
  projectArenaV2RaceResultRouteContinuationCandidateV1,
  projectArenaV2WeaponMapLearningCandidateV1,
  projectArenaV2WeaponMapSegmentLearningCandidateV1,
  requireArenaV2WeaponDefinitionIdV1,
} from '../src/index.js';

const BASE_MAP = 'arena-v2-kz-base-map.candidate.v1';
const CHARGE_SHIELD = 'arena-v2.weapon.charge-shield.candidate.v1';
const HEAVY_HAMMER = 'arena-v2.weapon.heavy-hammer.candidate.v1';
const FLANK_BLADE = 'arena-v2.weapon.flank-blade.candidate.v1';

describe('Arena V2 shared weapon × mode × map learning projection candidate', () => {
  it('declares every current detail, preparation, match and result consumer', () => {
    expect(ARENA_V2_WEAPON_MAP_LEARNING_PROJECTION_CONTRACT_V1.consumers).toEqual([
      'competitive-weapon-detail',
      'competitive-map-detail',
      'competitive-preparation',
      'duel-persistent-current-weapon',
      'survival-local-pickup-or-replacement',
      'survival-persistent-current-weapon',
      'race-next-segment-current-weapon',
      'product-result-review',
    ]);
  });

  it('projects only a real route segment that matches the current weapon mode grammar', () => {
    expect(projectArenaV2WeaponMapSegmentLearningCandidateV1({
      modeKind: 'race',
      weaponDefinitionId: 'arena-v2.weapon.line-suppressor.candidate.v1',
      mapDefinitionId: BASE_MAP,
      segmentDefinitionId: 'kz-segment-05-narrow',
      segmentOrdinal: 5,
    })).toMatchObject({
      weaponDisplayName: '线性压制器',
      segmentDisplayName: '窄路校正',
      situation: 'narrow-path',
      situationDisplayName: '窄路',
    });
    expect(projectArenaV2WeaponMapSegmentLearningCandidateV1({
      modeKind: 'race',
      weaponDefinitionId: 'arena-v2.weapon.line-suppressor.candidate.v1',
      mapDefinitionId: BASE_MAP,
      segmentDefinitionId: 'kz-segment-01-platform',
      segmentOrdinal: 1,
    })).toBeNull();
    expect(() => projectArenaV2WeaponMapSegmentLearningCandidateV1({
      modeKind: 'race',
      weaponDefinitionId: 'arena-v2.weapon.line-suppressor.candidate.v1',
      mapDefinitionId: BASE_MAP,
      segmentDefinitionId: 'kz-segment-05-narrow',
      segmentOrdinal: 4,
    })).toThrow(/身份与序号不闭合/);
  });

  it('normalizes a unique HUD collection id without weakening strict projector inputs', () => {
    expect(requireArenaV2WeaponDefinitionIdV1('charge-shield')).toBe(CHARGE_SHIELD);
    expect(requireArenaV2WeaponDefinitionIdV1(CHARGE_SHIELD)).toBe(CHARGE_SHIELD);
    expect(() => requireArenaV2WeaponDefinitionIdV1('weapon.unknown')).toThrow(/无法唯一规范化/);
    expect(() => projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: 'race',
      weaponDefinitionIds: ['charge-shield'],
      mapDefinitionId: BASE_MAP,
      focusPolicy: 'exactly-one',
      unknownMapPolicy: 'fail-closed',
    })).toThrow(/缺少武器/);
  });

  it('ranks current-map opportunities and caps the shared visible focus at two', () => {
    expect(projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: 'race',
      weaponDefinitionIds: [CHARGE_SHIELD],
      mapDefinitionId: BASE_MAP,
      focusPolicy: 'exactly-one',
      unknownMapPolicy: 'fail-closed',
    })).toMatchObject({
      weaponDisplayName: '冲锋盾',
      mapDisplayName: 'KZ 十二段竞技路线',
      mapSegmentCount: 12,
      situationSummary: '平台入口、断层',
      practiceSummary: '平台入口（第1段·起步平台）、断层（第2段·定向断层）',
      situations: [
        {
          situation: 'platform-entry',
          segmentCount: 4,
          exampleSegmentDefinitionId: 'kz-segment-01-platform',
          exampleSegmentOrdinal: 1,
          exampleSegmentDisplayName: '起步平台',
        },
        {
          situation: 'gap',
          segmentCount: 2,
          exampleSegmentDefinitionId: 'kz-segment-02-gap',
          exampleSegmentOrdinal: 2,
          exampleSegmentDisplayName: '定向断层',
        },
      ],
    });
  });

  it('chooses the lowest collection-order weapon only when the caller requests review focus', () => {
    expect(projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: 'duel',
      weaponDefinitionIds: [FLANK_BLADE, HEAVY_HAMMER],
      mapDefinitionId: BASE_MAP,
      focusPolicy: 'lowest-collection-order',
      unknownMapPolicy: 'fail-closed',
    })?.weaponDefinitionId).toBe(HEAVY_HAMMER);
  });

  it('fails closed on duplicate, unknown or multi-weapon exactly-one identities', () => {
    expect(() => projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: 'duel',
      weaponDefinitionIds: [CHARGE_SHIELD, CHARGE_SHIELD],
      mapDefinitionId: BASE_MAP,
      focusPolicy: 'lowest-collection-order',
      unknownMapPolicy: 'fail-closed',
    })).toThrow(/不能重复/);
    expect(() => projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: 'duel',
      weaponDefinitionIds: [CHARGE_SHIELD, HEAVY_HAMMER],
      mapDefinitionId: BASE_MAP,
      focusPolicy: 'exactly-one',
      unknownMapPolicy: 'fail-closed',
    })).toThrow(/精确提供一把/);
    expect(() => projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: 'duel',
      weaponDefinitionIds: ['weapon.unknown'],
      mapDefinitionId: BASE_MAP,
      focusPolicy: 'exactly-one',
      unknownMapPolicy: 'fail-closed',
    })).toThrow(/缺少武器/);
  });

  it('allows result review to preserve usage facts when a historical map is unknown', () => {
    expect(projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: 'duel',
      weaponDefinitionIds: [CHARGE_SHIELD],
      mapDefinitionId: 'map.historical.test.v1',
      focusPolicy: 'lowest-collection-order',
      unknownMapPolicy: 'return-null',
    })).toBeNull();
  });

  it('uses terminal race progress only to name the next formal route segment or finish gate', () => {
    expect(projectArenaV2RaceResultRouteContinuationCandidateV1(BASE_MAP, 0)).toMatchObject({
      kind: 'segment',
      segmentOrdinal: 1,
      segmentDisplayName: '起步平台',
    });
    expect(projectArenaV2RaceResultRouteContinuationCandidateV1(BASE_MAP, 11)).toMatchObject({
      kind: 'segment',
      segmentOrdinal: 12,
    });
    expect(projectArenaV2RaceResultRouteContinuationCandidateV1(BASE_MAP, 12)).toMatchObject({
      kind: 'finish-gate',
      completedSegmentCount: 12,
    });
    expect(projectArenaV2RaceResultRouteContinuationCandidateV1(
      'map.historical.test.v1',
      4,
    )).toBeNull();
    expect(() => projectArenaV2RaceResultRouteContinuationCandidateV1(BASE_MAP, 13))
      .toThrow(/超过正式地图段数/);
  });
});
