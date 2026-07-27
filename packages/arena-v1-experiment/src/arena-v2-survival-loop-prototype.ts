import {
  ARENA_GAMEPLAY_V2_TUNING,
} from '@number-strategy-jump/arena-definitions';
import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { createArenaV2JumpRoutePrototype } from './arena-v2-jump-route-prototype.js';

const SURVIVAL_TICK_RATE = 60;
const OFFER_INTERVAL_TICKS = SURVIVAL_TICK_RATE * 20;
const PROTOTYPE_ROUNDS = 10;
const PROTOTYPE_SEED = 20260727;
const WEAPON_IDS = Object.freeze([
  STAGE4_EQUIPMENT_ID.HAMMER,
  STAGE4_EQUIPMENT_ID.CHAIN,
  STAGE4_EQUIPMENT_ID.SHIELD,
]);

type SurvivalEndReason = 'second-knockdown';

export interface ArenaV2SurvivalWeaponOffer {
  readonly weaponId: string;
  readonly offerSlot: number;
  readonly survivalLevel: number;
  readonly offerTier: number;
  readonly baseControlPower: number;
  readonly temporaryControlPower: number;
}

export interface ArenaV2SurvivalRoundResult {
  readonly round: number;
  readonly offerTick: number;
  readonly elapsedSeconds: number;
  readonly enemyCount: number;
  readonly enemySpawnIntervalTicks: number;
  readonly routeSegmentId: string;
  readonly routeRole: string;
  readonly offers: readonly ArenaV2SurvivalWeaponOffer[];
  readonly chosenWeaponId: string;
  readonly usedMapAvoidance: boolean;
  readonly enemiesKnockedOff: number;
  readonly playerKnockbacks: number;
  readonly playerDowned: boolean;
  readonly revivedAfterDown: boolean;
}

export interface ArenaV2SurvivalLoopPrototypeResult {
  readonly modeId: 'survival-1ve';
  readonly seed: number;
  readonly initialWeaponId: null;
  readonly offerIntervalSeconds: 20;
  readonly rounds: readonly ArenaV2SurvivalRoundResult[];
  readonly totalRounds: number;
  readonly survivalSeconds: number;
  readonly firstDownRound: number | null;
  readonly secondDownRound: number | null;
  readonly reviveCount: number;
  readonly ended: boolean;
  readonly endReason: SurvivalEndReason | null;
  readonly collection: Readonly<{
    offersSeen: number;
    uniqueWeaponsSeen: number;
    repeatedOffers: number;
    masteryPoints: number;
  }>;
  readonly reward: Readonly<{
    survivalTokens: number;
    mapMasteryPoints: number;
    weaponMasteryPoints: number;
  }>;
}

const BASE_CONTROL_POWER: Readonly<Record<string, number>> = Object.freeze({
  [STAGE4_EQUIPMENT_ID.HAMMER]: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.HAMMER_SMASH]
    .knockback.horizontalImpulse,
  [STAGE4_EQUIPMENT_ID.CHAIN]: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.CHAIN_PULL]
    .knockback.horizontalImpulse,
  [STAGE4_EQUIPMENT_ID.SHIELD]: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.SHIELD_CHARGE]
    .knockback.horizontalImpulse,
});

function createOffers(round: number): readonly ArenaV2SurvivalWeaponOffer[] {
  return Object.freeze(WEAPON_IDS.map((weaponId, index) => {
    const baseControlPower = BASE_CONTROL_POWER[weaponId];
    if (baseControlPower === undefined) throw new Error(`生存原型缺少武器基础作用力：${weaponId}`);
    const survivalLevel = round;
    const offerTier = 1 + Math.floor((round - 1) / 3);
    return Object.freeze({
      weaponId,
      offerSlot: index,
      survivalLevel,
      offerTier,
      baseControlPower,
      temporaryControlPower: Number((baseControlPower * (1 + (survivalLevel - 1) * 0.08)).toFixed(4)),
    });
  }));
}

function chooseOffer(offers: readonly ArenaV2SurvivalWeaponOffer[], round: number): ArenaV2SurvivalWeaponOffer {
  const index = (PROTOTYPE_SEED + round) % offers.length;
  const offer = offers[index];
  if (!offer) throw new Error(`生存原型缺少第 ${round} 轮选择结果。`);
  return offer;
}

export function runArenaV2SurvivalLoopPrototype(): ArenaV2SurvivalLoopPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const rounds: ArenaV2SurvivalRoundResult[] = [];
  const seenWeapons = new Set<string>();
  let firstDownRound: number | null = null;
  let secondDownRound: number | null = null;
  let reviveCount = 0;

  for (let round = 1; round <= PROTOTYPE_ROUNDS; round += 1) {
    const offers = createOffers(round);
    const chosen = chooseOffer(offers, round);
    seenWeapons.add(chosen.weaponId);
    const routeSegment = route.segments[(round - 1) % route.segments.length];
    if (!routeSegment) throw new Error(`生存原型缺少第 ${round} 轮地图段落。`);
    const playerDowned = round === 3 || round === PROTOTYPE_ROUNDS;
    const revivedAfterDown = playerDowned && firstDownRound === null;
    if (playerDowned && firstDownRound === null) {
      firstDownRound = round;
      reviveCount += 1;
    } else if (playerDowned && secondDownRound === null) {
      secondDownRound = round;
    }
    rounds.push(Object.freeze({
      round,
      offerTick: round * OFFER_INTERVAL_TICKS,
      elapsedSeconds: round * 20,
      enemyCount: 4 + (round - 1) * 2,
      enemySpawnIntervalTicks: Math.max(12, 36 - round * 2),
      routeSegmentId: routeSegment.segmentId,
      routeRole: routeSegment.survivalLoopRole,
      offers,
      chosenWeaponId: chosen.weaponId,
      usedMapAvoidance: routeSegment.survivalLoopRole === 'choice'
        || routeSegment.survivalLoopRole === 'recovery',
      enemiesKnockedOff: Math.max(1, Math.floor(chosen.temporaryControlPower / 3)),
      playerKnockbacks: 1 + Math.floor(round / 4),
      playerDowned,
      revivedAfterDown,
    }));
  }

  const offersSeen = rounds.reduce((total, round) => total + round.offers.length, 0);
  const enemiesKnockedOff = rounds.reduce((total, round) => total + round.enemiesKnockedOff, 0);
  const mapAvoidanceCount = rounds.filter(({ usedMapAvoidance }) => usedMapAvoidance).length;
  const weaponMasteryPoints = rounds.reduce((total, round) => total + round.round * 2, 0);
  const mapMasteryPoints = mapAvoidanceCount * 3 + enemiesKnockedOff;
  return Object.freeze({
    modeId: 'survival-1ve',
    seed: PROTOTYPE_SEED,
    initialWeaponId: null,
    offerIntervalSeconds: 20,
    rounds: Object.freeze(rounds),
    totalRounds: rounds.length,
    survivalSeconds: rounds.length * 20,
    firstDownRound,
    secondDownRound,
    reviveCount,
    ended: secondDownRound !== null,
    endReason: secondDownRound === null ? null : 'second-knockdown',
    collection: Object.freeze({
      offersSeen,
      uniqueWeaponsSeen: seenWeapons.size,
      repeatedOffers: offersSeen - seenWeapons.size,
      masteryPoints: weaponMasteryPoints + mapMasteryPoints,
    }),
    reward: Object.freeze({
      survivalTokens: rounds.length + enemiesKnockedOff,
      mapMasteryPoints,
      weaponMasteryPoints,
    }),
  });
}
