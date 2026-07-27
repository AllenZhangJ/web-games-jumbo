import {
  createNeutralInputFrame,
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  type ArenaRuleEngineContract,
  type RuleActor,
} from '@number-strategy-jump/arena-core';
import {
  createArenaV1MatchConfig,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_FIXED_DT,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  createArenaV1CharacterRegistry,
} from '@number-strategy-jump/arena-v1-content';
import {
  createArenaV2SurvivalAuthorityContent,
  type ArenaV2SurvivalAuthorityContent,
} from './arena-v2-survival-weapon-definition.js';

const SURVIVAL_TICK_RATE = 60;
const PROBE_TICKS = SURVIVAL_TICK_RATE * 50;
const PROBE_SEED = 20260727;
const PLAYER_ID = 'player-1';
const ENEMY_COUNTS = Object.freeze([1, 2, 4]);
const KILL_Y = -6;
const SURFACE = Object.freeze({
  id: 'v2-survival-pressure-surface',
  center: Object.freeze({ x: 0, y: 0, z: 0 }),
  halfExtents: Object.freeze({ x: 18, y: 0.5, z: 10 }),
});
const WEAPON_IDS = Object.freeze(['hammer', 'chain', 'shield']);
const SURVIVAL_TIERS = Object.freeze([1, 5, 10]);
const STAGED_ENEMY_SPAWN_TICKS = Object.freeze([
  0,
  SURVIVAL_TICK_RATE * 15,
  SURVIVAL_TICK_RATE * 30,
  SURVIVAL_TICK_RATE * 45,
]);
const COMMON_TIER_MULTIPLIER: Readonly<Record<number, number>> = Object.freeze({
  1: 1,
  5: 1.24,
  10: 1.72,
});

export type ArenaV2SurvivalPressureRouteLayout = 'split' | 'compressed';
export type ArenaV2SurvivalPressureSupplyLayout = 'wide' | 'narrow';
export type ArenaV2SurvivalPressureEnemySpawnProfile = 'all-at-start' | 'staged';

export interface ArenaV2SurvivalPressurePrototypeOptions {
  readonly offerIntervalSeconds?: number;
  readonly routeLayout?: ArenaV2SurvivalPressureRouteLayout;
  readonly supplyLayout?: ArenaV2SurvivalPressureSupplyLayout;
  readonly enemySpawnProfile?: ArenaV2SurvivalPressureEnemySpawnProfile;
}

interface ResolvedPressureOptions {
  readonly offerIntervalSeconds: number;
  readonly offerIntervalTicks: number;
  readonly routeLayout: ArenaV2SurvivalPressureRouteLayout;
  readonly supplyLayout: ArenaV2SurvivalPressureSupplyLayout;
  readonly enemySpawnProfile: ArenaV2SurvivalPressureEnemySpawnProfile;
}

const PRESSURE_OPTIONS_KEYS = new Set([
  'offerIntervalSeconds',
  'routeLayout',
  'supplyLayout',
  'enemySpawnProfile',
]);
const SUPPORTED_OFFER_INTERVALS = Object.freeze([15, 20, 30]);

function resolvePressureOptions(value: unknown): ResolvedPressureOptions {
  const source = cloneFrozenData(value ?? {}, 'Arena V2 survival pressure options');
  assertKnownKeys(source, PRESSURE_OPTIONS_KEYS, 'Arena V2 survival pressure options');
  const offerIntervalSeconds = assertIntegerAtLeast(
    source.offerIntervalSeconds ?? 20,
    1,
    'offerIntervalSeconds',
  );
  if (!SUPPORTED_OFFER_INTERVALS.includes(offerIntervalSeconds)) {
    throw new RangeError('offerIntervalSeconds 研究矩阵只支持 15/20/30 秒。');
  }
  const routeLayout = source.routeLayout ?? 'split';
  if (routeLayout !== 'split' && routeLayout !== 'compressed') {
    throw new RangeError(`不支持的生存路线布局 ${String(routeLayout)}。`);
  }
  const supplyLayout = source.supplyLayout ?? 'wide';
  if (supplyLayout !== 'wide' && supplyLayout !== 'narrow') {
    throw new RangeError(`不支持的生存供给布局 ${String(supplyLayout)}。`);
  }
  const enemySpawnProfile = source.enemySpawnProfile ?? 'all-at-start';
  if (enemySpawnProfile !== 'all-at-start' && enemySpawnProfile !== 'staged') {
    throw new RangeError(`不支持的生存敌人刷新策略 ${String(enemySpawnProfile)}。`);
  }
  return Object.freeze({
    offerIntervalSeconds,
    offerIntervalTicks: offerIntervalSeconds * SURVIVAL_TICK_RATE,
    routeLayout,
    supplyLayout,
    enemySpawnProfile,
  });
}

export interface ArenaV2SurvivalPressurePickup {
  readonly weaponId: string;
  readonly participantId: string;
}

export interface ArenaV2SurvivalPressureOffer {
  readonly offerIndex: number;
  readonly offerTick: number;
  readonly survivalLevel: number;
  readonly offerTier: number;
  readonly weaponIds: readonly string[];
  readonly offerTierMultiplier: number;
  readonly weaponControlPowerMultiplier: Readonly<Record<string, number>>;
  readonly temporaryControlPower: Readonly<Record<string, number>>;
  readonly definitionBundleHash: string;
  readonly pickups: readonly ArenaV2SurvivalPressurePickup[];
  readonly contested: boolean;
}

export interface ArenaV2SurvivalPressureScenarioResult {
  readonly enemyCount: number;
  readonly offerIntervalSeconds: number;
  readonly routeLayout: ArenaV2SurvivalPressureRouteLayout;
  readonly supplyLayout: ArenaV2SurvivalPressureSupplyLayout;
  readonly enemySpawnProfile: ArenaV2SurvivalPressureEnemySpawnProfile;
  readonly ticksSimulated: number;
  readonly survivalSeconds: number;
  readonly enemySpawnTicks: readonly number[];
  readonly activeEnemyPeak: number;
  readonly firstEnemyContactTick: number | null;
  readonly playerHitCount: number;
  readonly enemyAttackCount: number;
  readonly enemyAttackIntentCount: number;
  readonly playerDowns: number;
  readonly reviveCount: number;
  readonly enemyKnockdowns: number;
  readonly activeEnemiesAtEnd: number;
  readonly crowdPressurePeak: number;
  readonly supplyRouteTicks: number;
  readonly playerWeaponIds: readonly string[];
  readonly offers: readonly ArenaV2SurvivalPressureOffer[];
  readonly ended: boolean;
  readonly endReason: 'second-knockdown' | null;
}

export interface ArenaV2SurvivalPressurePrototypeResult {
  readonly modeId: 'survival-1ve';
  readonly seed: number;
  readonly offerIntervalSeconds: number;
  readonly routeLayout: ArenaV2SurvivalPressureRouteLayout;
  readonly supplyLayout: ArenaV2SurvivalPressureSupplyLayout;
  readonly enemySpawnProfile: ArenaV2SurvivalPressureEnemySpawnProfile;
  readonly enemyDefinitionId: 'single-enemy-family';
  readonly enemyInputPolicy: 'bounded-pursuit-with-supply-priority';
  readonly sharedMovementAndCombatRules: true;
  readonly tieredOfferCombatWired: true;
  readonly scenarios: readonly ArenaV2SurvivalPressureScenarioResult[];
}

interface SupplyOfferRecord {
  readonly offerIndex: number;
  readonly offerTick: number;
  readonly survivalLevel: number;
  readonly offerTier: number;
  readonly weaponIds: readonly string[];
  readonly offerTierMultiplier: number;
  readonly weaponControlPowerMultiplier: Readonly<Record<string, number>>;
  readonly temporaryControlPower: Readonly<Record<string, number>>;
  readonly definitionBundleHash: string;
  readonly instanceIds: readonly string[];
  contested: boolean;
}

interface ScenarioState {
  readonly activeIds: Set<string>;
  playerDowns: number;
  reviveCount: number;
  enemyKnockdowns: number;
  playerHitCount: number;
  enemyAttackCount: number;
  enemyAttackIntentCount: number;
  firstEnemyContactTick: number | null;
  crowdPressurePeak: number;
  activeEnemyPeak: number;
  readonly enemySpawnTicks: number[];
  supplyRouteTicks: number;
  ended: boolean;
}

function enemyId(index: number): string {
  return `enemy-${index + 1}`;
}

function enemyIds(enemyCount: number): readonly string[] {
  return Object.freeze(Array.from({ length: enemyCount }, (_, index) => enemyId(index)));
}

function enemySpawnTick(
  index: number,
  profile: ArenaV2SurvivalPressureEnemySpawnProfile,
): number {
  if (profile === 'all-at-start' || index === 0) return 0;
  const tick = STAGED_ENEMY_SPAWN_TICKS[index];
  if (tick === undefined) throw new RangeError(`生存敌人刷新阶段 ${index + 1} 未定义。`);
  return tick;
}

function createPhysics(): PhysicsWorld {
  return createLightweightPhysicsWorld({
    arena: {
      killY: KILL_Y,
      surfaces: [{
        id: SURFACE.id,
        center: SURFACE.center,
        halfExtents: SURFACE.halfExtents,
      }],
    },
  });
}

function groundY(): number {
  const character = createArenaV1CharacterRegistry().require(
    ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  );
  const profile = createCharacterPhysicsProfile(character);
  return SURFACE.center.y + SURFACE.halfExtents.y + profile.halfHeight + profile.radius;
}

function distance(
  first: Readonly<{ x: number; z: number }>,
  second: Readonly<{ x: number; z: number }>,
): number {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function directionTo(
  source: Readonly<{ x: number; z: number }>,
  target: Readonly<{ x: number; z: number }>,
): Readonly<{ x: number; z: number }> {
  const dx = target.x - source.x;
  const dz = target.z - source.z;
  const length = Math.hypot(dx, dz);
  if (length <= 1e-6) return Object.freeze({ x: 0, z: 0 });
  return Object.freeze({ x: dx / length, z: dz / length });
}

function tierForOffer(offerIndex: number): number {
  const index = Math.min(Math.max(offerIndex - 1, 0), SURVIVAL_TIERS.length - 1);
  const tier = SURVIVAL_TIERS[index];
  if (tier === undefined) throw new RangeError(`供给轮次 ${offerIndex} 缺少生存等级。`);
  return tier;
}

function weaponIdFromDefinitionId(definitionId: string): string {
  return definitionId.split('.survival-tier-')[0] ?? definitionId;
}

function createSupplyOffer(
  offerIndex: number,
  tick: number,
  seed: number,
  ground: number,
  engine: ArenaRuleEngineContract,
  content: ArenaV2SurvivalAuthorityContent,
  options: ResolvedPressureOptions,
): SupplyOfferRecord {
  const offerTier = tierForOffer(offerIndex);
  const offerTierMultiplier = COMMON_TIER_MULTIPLIER[offerTier];
  if (offerTierMultiplier === undefined) {
    throw new RangeError(`生存等级 ${offerTier} 缺少通用展示倍率。`);
  }
  const weaponIds = Object.freeze(WEAPON_IDS.map((_, index) => (
    WEAPON_IDS[(index + seed + offerIndex) % WEAPON_IDS.length]!
  )));
  const supplyHalfWidth = options.supplyLayout === 'wide' ? 4 : 2;
  const positions = Object.freeze([
    Object.freeze({ x: -supplyHalfWidth, y: ground, z: 0 }),
    Object.freeze({ x: 0, y: ground, z: 0 }),
    Object.freeze({ x: supplyHalfWidth, y: ground, z: 0 }),
  ]);
  const instanceIds = weaponIds.map((weaponId, index) => {
    const instanceId = `v2-survival-pressure:offer-${offerIndex}:${index}:${weaponId}`;
    const position = positions[index];
    if (!position) throw new Error(`生存供给缺少位置 ${offerIndex}:${index}。`);
    const selection = content.weapons.find(({ weaponId: id, tier }) => (
      id === weaponId && tier === offerTier
    ));
    if (!selection) throw new RangeError(`生存供给缺少 ${weaponId} 等级 ${offerTier} Definition。`);
    engine.spawnEquipment({
      instanceId,
      definitionId: selection.equipmentDefinitionId,
      spawnId: instanceId,
      position,
    });
    return instanceId;
  });
  const weaponControlPowerMultiplier = Object.freeze(Object.fromEntries(
    weaponIds.map((weaponId) => {
      const selection = content.weapons.find(({ weaponId: id, tier }) => (
        id === weaponId && tier === offerTier
      ));
      if (!selection) throw new RangeError(`生存供给缺少 ${weaponId} 等级 ${offerTier} 数值。`);
      return [weaponId, selection.multiplier];
    }),
  ));
  const temporaryControlPower = Object.freeze(Object.fromEntries(
    weaponIds.map((weaponId) => {
      const selection = content.weapons.find(({ weaponId: id, tier }) => (
        id === weaponId && tier === offerTier
      ));
      if (!selection) throw new RangeError(`生存供给缺少 ${weaponId} 等级 ${offerTier} 作用力。`);
      return [weaponId, Number(selection.stats.horizontalControl.toFixed(4))];
    }),
  ));
  return {
    offerIndex,
    offerTick: tick,
    survivalLevel: offerIndex,
    offerTier,
    weaponIds,
    offerTierMultiplier,
    weaponControlPowerMultiplier,
    temporaryControlPower,
    definitionBundleHash: content.definitionBundleHash,
    instanceIds: Object.freeze(instanceIds),
    contested: false,
  };
}

function nearestWorldSupply(
  engine: ArenaRuleEngineContract,
  position: Readonly<{ x: number; z: number }>,
): Readonly<{ x: number; y: number; z: number }> | null {
  const supplies = engine.listEquipmentSnapshots()
    .filter(({ locationState, position: supplyPosition }) => (
      (locationState === 'spawned' || locationState === 'dropped') && supplyPosition !== null
    ))
    .sort((left, right) => left.instanceId < right.instanceId ? -1 : 1);
  let nearest: Readonly<{ x: number; y: number; z: number }> | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const supply of supplies) {
    if (!supply.position) continue;
    const currentDistance = distance(position, supply.position);
    if (currentDistance < nearestDistance) {
      nearestDistance = currentDistance;
      nearest = supply.position;
    }
  }
  return nearest;
}

function nearestActiveEnemy(
  id: string,
  activeIds: ReadonlySet<string>,
  physics: PhysicsWorld,
): string | null {
  const source = physics.getCharacterState(id).position;
  let nearest: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of activeIds) {
    if (candidate === PLAYER_ID) continue;
    const currentDistance = distance(source, physics.getCharacterState(candidate).position);
    if (currentDistance < nearestDistance || (
      currentDistance === nearestDistance && (nearest === null || candidate < nearest)
    )) {
      nearest = candidate;
      nearestDistance = currentDistance;
    }
  }
  return nearest;
}

function createActors(
  participantIds: readonly string[],
  activeIds: ReadonlySet<string>,
  physics: PhysicsWorld,
): readonly RuleActor[] {
  return Object.freeze(participantIds.map((id) => {
    const state = physics.getCharacterState(id);
    const active = activeIds.has(id);
    return Object.freeze({
      id,
      canAct: active,
      targetable: active,
      position: Object.freeze({ ...state.position }),
      facing: Object.freeze({ ...state.facing }),
    });
  }));
}

function createInputFrames(
  tick: number,
  participantIds: readonly string[],
  activeIds: ReadonlySet<string>,
  physics: PhysicsWorld,
  engine: ArenaRuleEngineContract,
  state: ScenarioState,
): readonly ArenaInputFrame[] {
  const frames = participantIds.map((id) => {
    if (!activeIds.has(id)) {
      physics.setMovementIntent(id, 0, 0);
      return createNeutralInputFrame(tick, id);
    }
    const current = physics.getCharacterState(id);
    const held = engine.getHeldEquipment(id);
    const supply = held === null ? nearestWorldSupply(engine, current.position) : null;
    let targetId: string | null = null;
    let targetPosition: Readonly<{ x: number; z: number }> | null = supply;
    if (targetPosition) {
      if (id === PLAYER_ID) state.supplyRouteTicks += 1;
    } else if (id === PLAYER_ID) {
      targetId = nearestActiveEnemy(id, activeIds, physics);
      targetPosition = targetId === null
        ? null
        : physics.getCharacterState(targetId).position;
    } else {
      targetId = PLAYER_ID;
      targetPosition = physics.getCharacterState(PLAYER_ID).position;
    }
    const move = targetPosition === null
      ? Object.freeze({ x: 0, z: 0 })
      : directionTo(current.position, targetPosition);
    physics.setMovementIntent(id, move.x, move.z);
    const targetDistance = targetPosition === null
      ? Number.POSITIVE_INFINITY
      : distance(current.position, targetPosition);
    const canAttack = targetId !== null
      && targetDistance <= (held === null ? 1.2 : 3.5)
      && engine.getActionSnapshot(id).phase === 'idle';
    if (canAttack && id !== PLAYER_ID) state.enemyAttackIntentCount += 1;
    return Object.freeze({
      ...createNeutralInputFrame(tick, id),
      primaryPressed: canAttack,
      primaryHeld: canAttack,
    });
  });
  return Object.freeze(frames);
}

function resolveSupplyPickups(
  engine: ArenaRuleEngineContract,
  activeIds: ReadonlySet<string>,
  participantIds: readonly string[],
  physics: PhysicsWorld,
  offers: readonly SupplyOfferRecord[],
): void {
  for (const offer of offers) {
    for (const instanceId of offer.instanceIds) {
      const supply = engine.getEquipmentSnapshot(instanceId);
      if (!supply.position) continue;
      const supplyPosition = supply.position;
      const nearby = participantIds.filter((id) => (
        activeIds.has(id)
        && engine.getHeldEquipment(id) === null
        && distance(physics.getCharacterState(id).position, supplyPosition) <= 1.2
      ));
      if (nearby.length > 1) offer.contested = true;
    }
  }
  engine.resolveEquipmentPickups({
    participants: participantIds.map((id) => ({
      id,
      eligible: activeIds.has(id) && engine.getHeldEquipment(id) === null,
      position: physics.getCharacterState(id).position,
    })),
    contestSeed: PROBE_SEED,
  });
}

function createOfferResult(
  offer: SupplyOfferRecord,
  engine: ArenaRuleEngineContract,
): ArenaV2SurvivalPressureOffer {
  const pickups = offer.instanceIds.flatMap((instanceId) => {
    const snapshot = engine.getEquipmentSnapshot(instanceId);
    if (!snapshot.ownerId) return [];
    return [{
      weaponId: weaponIdFromDefinitionId(snapshot.definitionId),
      participantId: snapshot.ownerId,
    }];
  });
  return Object.freeze({
    offerIndex: offer.offerIndex,
    offerTick: offer.offerTick,
    survivalLevel: offer.survivalLevel,
    offerTier: offer.offerTier,
    weaponIds: offer.weaponIds,
    offerTierMultiplier: offer.offerTierMultiplier,
    weaponControlPowerMultiplier: offer.weaponControlPowerMultiplier,
    temporaryControlPower: offer.temporaryControlPower,
    definitionBundleHash: offer.definitionBundleHash,
    pickups: Object.freeze(pickups),
    contested: offer.contested,
  });
}

function createScenario(
  enemyCount: number,
  seed: number,
  options: ResolvedPressureOptions,
): ArenaV2SurvivalPressureScenarioResult {
  const participants = Object.freeze([PLAYER_ID, ...enemyIds(enemyCount)]);
  const config = createArenaV1MatchConfig({
    contextPrimaryMobilityEnabled: false,
    equipment: { initialSpawns: [] },
  });
  const content = createArenaV2SurvivalAuthorityContent(config, SURVIVAL_TIERS);
  const engine = createArenaV1RuleEngine({
    participantIds: participants,
    config,
    authorityContent: {
      actionRegistry: content.actionRegistry,
      equipmentRegistry: content.equipmentRegistry,
      mapRegistry: content.mapRegistry,
      characterRegistry: content.characterRegistry,
    },
  });
  const physics = createPhysics();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const spawnY = groundY();
  const activeIds = new Set<string>([PLAYER_ID]);
  const state: ScenarioState = {
    activeIds,
    playerDowns: 0,
    reviveCount: 0,
    enemyKnockdowns: 0,
    playerHitCount: 0,
    enemyAttackCount: 0,
    enemyAttackIntentCount: 0,
    firstEnemyContactTick: null,
    crowdPressurePeak: 0,
    activeEnemyPeak: 0,
    enemySpawnTicks: [],
    supplyRouteTicks: 0,
    ended: false,
  };
  const offers: SupplyOfferRecord[] = [];
  let ticksSimulated = 0;
  let playerWeaponIds: string[] = [];
  try {
    physics.addCharacter({ id: PLAYER_ID, position: { x: 0, y: spawnY, z: 0 }, ...profile });
    for (let index = 0; index < enemyCount; index += 1) {
      const id = enemyId(index);
      const spawnHalfWidth = options.routeLayout === 'split' ? 10 : 6;
      const spawnLaneGap = options.routeLayout === 'split' ? 3.4 : 1.8;
      physics.addCharacter({
        id,
        position: {
          x: index % 2 === 0 ? -spawnHalfWidth : spawnHalfWidth,
          y: enemySpawnTick(index, options.enemySpawnProfile) === 0 ? spawnY : KILL_Y - 1,
          z: (index - (enemyCount - 1) / 2) * spawnLaneGap,
        },
        ...profile,
      });
    }
    const ports = Object.freeze({
      recordHit: (attackerId: string, targetId: string) => {
        if (targetId === PLAYER_ID && attackerId !== PLAYER_ID) {
          state.playerHitCount += 1;
          state.firstEnemyContactTick ??= ticksSimulated;
        }
        if (attackerId !== PLAYER_ID && targetId === PLAYER_ID) state.enemyAttackCount += 1;
      },
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        physics.applyImpulse(participantId, impulse);
      },
    });
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      ticksSimulated = tick;
      for (let index = 0; index < enemyCount; index += 1) {
        const id = enemyId(index);
        if (activeIds.has(id) || enemySpawnTick(index, options.enemySpawnProfile) !== tick) continue;
        engine.resetParticipant(id);
        const spawnHalfWidth = options.routeLayout === 'split' ? 10 : 6;
        const spawnLaneGap = options.routeLayout === 'split' ? 3.4 : 1.8;
        physics.resetCharacter(id, {
          position: {
            x: index % 2 === 0 ? -spawnHalfWidth : spawnHalfWidth,
            y: spawnY,
            z: (index - (enemyCount - 1) / 2) * spawnLaneGap,
          },
          facing: { x: index % 2 === 0 ? 1 : -1, z: 0 },
        });
        activeIds.add(id);
        state.enemySpawnTicks.push(tick);
      }
      state.activeEnemyPeak = Math.max(
        state.activeEnemyPeak,
        [...activeIds].filter((id) => id !== PLAYER_ID).length,
      );
      if (tick > 0 && tick % options.offerIntervalTicks === 0) {
        offers.push(createSupplyOffer(
          offers.length + 1,
          tick,
          seed,
          spawnY,
          engine,
          content,
          options,
        ));
      }
      engine.advanceTimers();
      const inputFrames = createInputFrames(
        tick,
        participants,
        activeIds,
        physics,
        engine,
        state,
      );
      const actors = createActors(participants, activeIds, physics);
      const batch = engine.resolveActions({ tick, actors, inputFrames });
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors: createActors(participants, activeIds, physics) });
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
      resolveSupplyPickups(engine, activeIds, participants, physics, offers);

      const playerPosition = physics.getCharacterState(PLAYER_ID).position;
      const nearbyEnemies = [...activeIds].filter((id) => (
        id !== PLAYER_ID
        && distance(playerPosition, physics.getCharacterState(id).position) <= 3
      )).length;
      state.crowdPressurePeak = Math.max(state.crowdPressurePeak, nearbyEnemies);

      for (const id of [...activeIds]) {
        if (physics.getCharacterState(id).position.y >= KILL_Y) continue;
        if (id === PLAYER_ID) {
          state.playerDowns += 1;
          engine.resetParticipant(id);
          if (state.playerDowns >= 2) {
            activeIds.delete(id);
            state.ended = true;
            break;
          }
          state.reviveCount += 1;
          physics.resetCharacter(id, {
            position: { x: 0, y: spawnY, z: 0 },
            facing: { x: 1, z: 0 },
          });
        } else {
          state.enemyKnockdowns += 1;
          activeIds.delete(id);
          engine.resetParticipant(id);
        }
      }
      if (state.ended) break;
    }
    playerWeaponIds = [...new Set(participants
      .map((id) => engine.getHeldEquipment(id))
      .filter((equipment) => equipment?.ownerId === PLAYER_ID)
      .map((equipment) => equipment?.definitionId === undefined
        ? undefined
        : weaponIdFromDefinitionId(equipment.definitionId))
      .filter((weaponId): weaponId is string => weaponId !== undefined))];
    const output = Object.freeze({
      enemyCount,
      offerIntervalSeconds: options.offerIntervalSeconds,
      routeLayout: options.routeLayout,
      supplyLayout: options.supplyLayout,
      enemySpawnProfile: options.enemySpawnProfile,
      ticksSimulated: ticksSimulated + 1,
      survivalSeconds: Number(((ticksSimulated + 1) / SURVIVAL_TICK_RATE).toFixed(2)),
      enemySpawnTicks: Object.freeze([...state.enemySpawnTicks]),
      activeEnemyPeak: state.activeEnemyPeak,
      firstEnemyContactTick: state.firstEnemyContactTick,
      playerHitCount: state.playerHitCount,
      enemyAttackCount: state.enemyAttackCount,
      enemyAttackIntentCount: state.enemyAttackIntentCount,
      playerDowns: state.playerDowns,
      reviveCount: state.reviveCount,
      enemyKnockdowns: state.enemyKnockdowns,
      activeEnemiesAtEnd: [...activeIds].filter((id) => id !== PLAYER_ID).length,
      crowdPressurePeak: state.crowdPressurePeak,
      supplyRouteTicks: state.supplyRouteTicks,
      playerWeaponIds: Object.freeze(playerWeaponIds),
      offers: Object.freeze(offers.map((offer) => createOfferResult(offer, engine))),
      ended: state.ended,
      endReason: state.ended ? 'second-knockdown' : null,
    });
    return output;
  } finally {
    engine.destroy();
    physics.destroy();
  }
}

export function runArenaV2SurvivalPressurePrototype(
  options: ArenaV2SurvivalPressurePrototypeOptions = {},
): ArenaV2SurvivalPressurePrototypeResult {
  const resolved = resolvePressureOptions(options);
  return Object.freeze({
    modeId: 'survival-1ve',
    seed: PROBE_SEED,
    offerIntervalSeconds: resolved.offerIntervalSeconds,
    routeLayout: resolved.routeLayout,
    supplyLayout: resolved.supplyLayout,
    enemySpawnProfile: resolved.enemySpawnProfile,
    enemyDefinitionId: 'single-enemy-family',
    enemyInputPolicy: 'bounded-pursuit-with-supply-priority',
    sharedMovementAndCombatRules: true,
    tieredOfferCombatWired: true,
    scenarios: Object.freeze(ENEMY_COUNTS.map((enemyCount) => (
      createScenario(enemyCount, PROBE_SEED, resolved)
    ))),
  });
}

export interface ArenaV2SurvivalPressureMatrixCase {
  readonly caseId: string;
  readonly offerIntervalSeconds: number;
  readonly routeLayout: ArenaV2SurvivalPressureRouteLayout;
  readonly supplyLayout: ArenaV2SurvivalPressureSupplyLayout;
  readonly scenarios: readonly ArenaV2SurvivalPressureScenarioResult[];
  readonly secondKnockdownReached: boolean;
  readonly maximumCrowdPressurePeak: number;
}

export interface ArenaV2SurvivalPressureMatrixPrototypeResult {
  readonly modeId: 'survival-1ve-pressure-matrix';
  readonly seed: number;
  readonly cases: readonly ArenaV2SurvivalPressureMatrixCase[];
}

const PRESSURE_MATRIX_CASES = Object.freeze([
  Object.freeze({ offerIntervalSeconds: 15, routeLayout: 'split' as const }),
  Object.freeze({ offerIntervalSeconds: 15, routeLayout: 'compressed' as const }),
  Object.freeze({ offerIntervalSeconds: 20, routeLayout: 'split' as const }),
  Object.freeze({ offerIntervalSeconds: 20, routeLayout: 'compressed' as const }),
  Object.freeze({ offerIntervalSeconds: 30, routeLayout: 'split' as const }),
  Object.freeze({ offerIntervalSeconds: 30, routeLayout: 'compressed' as const }),
]);

export function runArenaV2SurvivalPressureMatrixPrototype(): ArenaV2SurvivalPressureMatrixPrototypeResult {
  const cases = PRESSURE_MATRIX_CASES.map(({ offerIntervalSeconds, routeLayout }) => {
    const result = runArenaV2SurvivalPressurePrototype({
      offerIntervalSeconds,
      routeLayout,
      supplyLayout: 'wide',
    });
    return Object.freeze({
      caseId: `${offerIntervalSeconds}s-${routeLayout}`,
      offerIntervalSeconds,
      routeLayout,
      supplyLayout: 'wide' as const,
      scenarios: result.scenarios,
      secondKnockdownReached: result.scenarios.some(({ playerDowns }) => playerDowns >= 2),
      maximumCrowdPressurePeak: Math.max(...result.scenarios.map(({ crowdPressurePeak }) => crowdPressurePeak)),
    });
  });
  return Object.freeze({
    modeId: 'survival-1ve-pressure-matrix',
    seed: PROBE_SEED,
    cases: Object.freeze(cases),
  });
}
