import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1,
} from '../src/index.js';

describe('Arena V2 mode selection copy candidate V1', () => {
  it('keeps all three mode cards concise while exposing the decisive rules', () => {
    expect(ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.items).toEqual([
      {
        id: 'duel',
        label: '常规1v1',
        description: '击落唯一对手，持续练习武器进攻与反制。',
      },
      {
        id: 'race',
        label: '竞速',
        description: '2–4人；地图板块不掉落；可攻击干扰，掉落3秒后复位且不限次数，先到终点获胜。',
      },
      {
        id: 'survival',
        label: '生存',
        description: '空手开局；靠近即拾取替换；每20秒刷新3把，10秒未拾取消失；存活越久压力和武器越强；第一次掉落复活，第二次结束。',
      },
    ]);
  });

  it('derives timed copy from existing mode facts without owning gameplay', () => {
    expect(ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1.sourceFacts).toEqual({
      tickRateHz: 60,
      sharedMapDefinitionIds: [
        'arena-v2-kz-base-map.candidate.v1',
        'arena-v2-kz-switchback-map.candidate.v1',
      ],
      sharedRouteDefinitionIds: [
        'arena-v2-kz-base-route.candidate.v2',
        'arena-v2-kz-switchback-route.candidate.v2',
      ],
      raceMinimumParticipants: 2,
      raceMaximumParticipants: 4,
      raceSurfaceCollapseEnabled: false,
      raceRespawnSeconds: 3,
      raceMaximumRespawns: null,
      survivalStartsUnarmed: true,
      survivalPickupReplacesCurrentWeapon: true,
      survivalSupplyIntervalSeconds: 20,
      survivalSupplySpawnCount: 3,
      survivalSupplyLifetimeSeconds: 10,
      survivalPressureIntervalSeconds: 20,
      survivalWeaponLevelCount: 10,
      survivalWeaponStrengthensEachWave: true,
      survivalMaximumRespawns: 1,
      survivalTerminalPlayerFallCount: 2,
    });
    expect(ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1).toMatchObject({
      ownsModeRules: false,
      ownsSelectionState: false,
      addsGameplayBehavior: false,
      defaultSurfaceWired: false,
      validationStatus: 'not-run',
    });
  });
});
