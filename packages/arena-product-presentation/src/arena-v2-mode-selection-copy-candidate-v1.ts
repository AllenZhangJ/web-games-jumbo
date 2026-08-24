import {
  ARENA_GAMEPLAY_V2_TUNING,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_MAP_DEFINITION_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_LEVEL_COUNT_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2InformationSelectionItemCandidateV1,
} from './arena-v2-information-selection-render-plan-candidate-v1.js';

const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;
const SHARED_KZ_MAP_DEFINITIONS = Object.freeze([
  ARENA_V2_KZ_BASE_MAP_DEFINITION_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_DEFINITION_CANDIDATE_V1,
]);
const SHARED_KZ_ROUTE_DEFINITIONS = Object.freeze([
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
]);

function exactSeconds(ticks: number, name: string): number {
  if (!Number.isSafeInteger(ticks) || ticks <= 0 || ticks % TICK_RATE_HZ !== 0) {
    throw new RangeError(`Arena V2模式选择${name}必须可换算为整秒。`);
  }
  return ticks / TICK_RATE_HZ;
}

const RACE_RESPAWN_SECONDS = exactSeconds(
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.delayTicks,
  '竞速复位时间',
);
const SURVIVAL_SUPPLY_INTERVAL_SECONDS = exactSeconds(
  ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
  '生存武器刷新间隔',
);
const SURVIVAL_SUPPLY_LIFETIME_SECONDS = exactSeconds(
  ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
  '生存武器保留时间',
);
const SURVIVAL_PRESSURE_INTERVAL_SECONDS = exactSeconds(
  ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
  '生存压力提升间隔',
);
const RACE_MINIMUM_PARTICIPANTS = SHARED_KZ_ROUTE_DEFINITIONS[0]!.minimumParticipants;
const RACE_MAXIMUM_PARTICIPANTS = SHARED_KZ_ROUTE_DEFINITIONS[0]!.maximumParticipants;

if (ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.maximumRespawns !== null) {
  throw new RangeError('Arena V2竞速模式选择文案只接受不限次数复位规则。');
}
if (SHARED_KZ_MAP_DEFINITIONS.length !== 2
  || SHARED_KZ_MAP_DEFINITIONS.some((map) => {
    const events: readonly Readonly<{ readonly kind: string }>[] = map.events;
    return events.some(({ kind }) => kind === 'collapse-surfaces');
  })) {
  throw new RangeError('Arena V2竞速模式选择文案只接受两张无板块坍塌事件的正式KZ地图。');
}
if (SHARED_KZ_ROUTE_DEFINITIONS.length !== SHARED_KZ_MAP_DEFINITIONS.length
  || SHARED_KZ_ROUTE_DEFINITIONS.some((route, index) => (
    route.mapDefinitionId !== SHARED_KZ_MAP_DEFINITIONS[index]?.id
    || route.minimumParticipants !== RACE_MINIMUM_PARTICIPANTS
    || route.maximumParticipants !== RACE_MAXIMUM_PARTICIPANTS
  ))
  || RACE_MINIMUM_PARTICIPANTS !== 2
  || RACE_MAXIMUM_PARTICIPANTS !== 4) {
  throw new RangeError('Arena V2竞速模式选择文案只接受两张共享2至4人规则的正式KZ路线。');
}
if (ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.maximumRespawns !== 1
  || ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.terminalPlayerFallCount !== 2) {
  throw new RangeError('Arena V2生存模式选择文案只接受首次复活、第二次结束规则。');
}
if (ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1.length
    !== ARENA_V2_SURVIVAL_BASELINE_WEAPON_LEVEL_COUNT_CANDIDATE_V1
  || ARENA_V2_SURVIVAL_WEAPON_LEVEL_TUNING_CANDIDATE_V1.some((level, index, levels) => {
    if (level.level !== index + 1 || level.minimumWaveIndex !== index) return true;
    const previous = levels[index - 1];
    if (previous === undefined) return false;
    const regresses = level.rangeMultiplier < previous.rangeMultiplier
      || level.horizontalImpulseMultiplier < previous.horizontalImpulseMultiplier
      || level.cooldownMultiplier > previous.cooldownMultiplier
      || level.hitstunMultiplier < previous.hitstunMultiplier;
    const improves = level.rangeMultiplier > previous.rangeMultiplier
      || level.horizontalImpulseMultiplier > previous.horizontalImpulseMultiplier
      || level.cooldownMultiplier < previous.cooldownMultiplier
      || level.hitstunMultiplier > previous.hitstunMultiplier;
    return regresses || !improves;
  })) {
  throw new RangeError('Arena V2生存模式选择文案只接受从首轮开始逐轮增强的连续武器等级。');
}

const ITEMS: readonly ArenaV2InformationSelectionItemCandidateV1[] = Object.freeze([
  Object.freeze({
    id: 'duel',
    label: '常规1v1',
    description: '击落唯一对手，持续练习武器进攻与反制。',
  }),
  Object.freeze({
    id: 'race',
    label: '竞速',
    description: `${RACE_MINIMUM_PARTICIPANTS}–${RACE_MAXIMUM_PARTICIPANTS}人；地图板块不掉落；可攻击干扰，掉落${RACE_RESPAWN_SECONDS}秒后复位且不限次数，先到终点获胜。`,
  }),
  Object.freeze({
    id: 'survival',
    label: '生存',
    description: `空手开局；靠近即拾取替换；每${SURVIVAL_SUPPLY_INTERVAL_SECONDS}秒刷新${ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1}把，${SURVIVAL_SUPPLY_LIFETIME_SECONDS}秒未拾取消失；存活越久压力和武器越强；第一次掉落复活，第二次结束。`,
  }),
]);

export const ARENA_V2_MODE_SELECTION_COPY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  items: ITEMS,
  sourceFacts: Object.freeze({
    tickRateHz: TICK_RATE_HZ,
    sharedMapDefinitionIds: Object.freeze(
      SHARED_KZ_MAP_DEFINITIONS.map(({ id }) => id),
    ),
    sharedRouteDefinitionIds: Object.freeze(
      SHARED_KZ_ROUTE_DEFINITIONS.map(({ id }) => id),
    ),
    raceMinimumParticipants: RACE_MINIMUM_PARTICIPANTS,
    raceMaximumParticipants: RACE_MAXIMUM_PARTICIPANTS,
    raceSurfaceCollapseEnabled: false as const,
    raceRespawnSeconds: RACE_RESPAWN_SECONDS,
    raceMaximumRespawns: null,
    survivalStartsUnarmed: true as const,
    survivalPickupReplacesCurrentWeapon: true as const,
    survivalSupplyIntervalSeconds: SURVIVAL_SUPPLY_INTERVAL_SECONDS,
    survivalSupplySpawnCount:
      ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
    survivalSupplyLifetimeSeconds: SURVIVAL_SUPPLY_LIFETIME_SECONDS,
    survivalPressureIntervalSeconds: SURVIVAL_PRESSURE_INTERVAL_SECONDS,
    survivalWeaponLevelCount:
      ARENA_V2_SURVIVAL_BASELINE_WEAPON_LEVEL_COUNT_CANDIDATE_V1,
    survivalWeaponStrengthensEachWave: true as const,
    survivalMaximumRespawns:
      ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.maximumRespawns,
    survivalTerminalPlayerFallCount:
      ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.terminalPlayerFallCount,
  }),
  ownsModeRules: false as const,
  ownsSelectionState: false as const,
  addsGameplayBehavior: false as const,
  defaultSurfaceWired: false as const,
  validationStatus: 'not-run' as const,
});
