import {
  createNeutralInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
} from '@number-strategy-jump/arena-definitions';
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
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';

const SURVIVAL_TICK_RATE = 60;
const OFFER_INTERVAL_TICKS = SURVIVAL_TICK_RATE * 20;
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
const WEAPON_IDS = Object.freeze([
  STAGE4_EQUIPMENT_ID.HAMMER,
  STAGE4_EQUIPMENT_ID.CHAIN,
  STAGE4_EQUIPMENT_ID.SHIELD,
]);

const BASE_CONTROL_POWER: Readonly<Record<string, number>> = Object.freeze({
  [STAGE4_EQUIPMENT_ID.HAMMER]: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.HAMMER_SMASH]
    .knockback.horizontalImpulse,
  [STAGE4_EQUIPMENT_ID.CHAIN]: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.CHAIN_PULL]
    .knockback.horizontalImpulse,
  [STAGE4_EQUIPMENT_ID.SHIELD]: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.SHIELD_CHARGE]
    .knockback.horizontalImpulse,
});

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
  readonly controlPowerMultiplier: number;
  readonly temporaryControlPower: Readonly<Record<string, number>>;
  readonly pickups: readonly ArenaV2SurvivalPressurePickup[];
  readonly contested: boolean;
}

export interface ArenaV2SurvivalPressureScenarioResult {
  readonly enemyCount: number;
  readonly ticksSimulated: number;
  readonly survivalSeconds: number;
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
  readonly enemyDefinitionId: 'single-enemy-family';
  readonly enemyInputPolicy: 'bounded-pursuit-with-supply-priority';
  readonly sharedMovementAndCombatRules: true;
  readonly tieredOfferTelemetryOnly: true;
  readonly scenarios: readonly ArenaV2SurvivalPressureScenarioResult[];
}

interface SupplyOfferRecord {
  readonly offerIndex: number;
  readonly offerTick: number;
  readonly survivalLevel: number;
  readonly offerTier: number;
  readonly weaponIds: readonly string[];
  readonly controlPowerMultiplier: number;
  readonly temporaryControlPower: Readonly<Record<string, number>>;
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
  supplyRouteTicks: number;
  ended: boolean;
}

function enemyId(index: number): string {
  return `enemy-${index + 1}`;
}

function enemyIds(enemyCount: number): readonly string[] {
  return Object.freeze(Array.from({ length: enemyCount }, (_, index) => enemyId(index)));
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

function createSupplyOffer(
  offerIndex: number,
  tick: number,
  seed: number,
  ground: number,
  engine: ArenaRuleEngineContract,
): SupplyOfferRecord {
  const controlPowerMultiplier = Number((1 + (offerIndex - 1) * 0.08).toFixed(4));
  const offerTier = 1 + Math.floor((offerIndex - 1) / 3);
  const weaponIds = Object.freeze(WEAPON_IDS.map((_, index) => (
    WEAPON_IDS[(index + seed + offerIndex) % WEAPON_IDS.length]!
  )));
  const positions = Object.freeze([
    Object.freeze({ x: -4, y: ground, z: 0 }),
    Object.freeze({ x: 0, y: ground, z: 0 }),
    Object.freeze({ x: 4, y: ground, z: 0 }),
  ]);
  const instanceIds = weaponIds.map((weaponId, index) => {
    const instanceId = `v2-survival-pressure:offer-${offerIndex}:${index}:${weaponId}`;
    const position = positions[index];
    if (!position) throw new Error(`生存供给缺少位置 ${offerIndex}:${index}。`);
    engine.spawnEquipment({
      instanceId,
      definitionId: weaponId,
      spawnId: instanceId,
      position,
    });
    return instanceId;
  });
  const temporaryControlPower = Object.freeze(Object.fromEntries(
    weaponIds.map((weaponId) => {
      const base = BASE_CONTROL_POWER[weaponId];
      if (base === undefined) throw new Error(`生存供给缺少武器作用力 ${weaponId}。`);
      return [weaponId, Number((base * controlPowerMultiplier).toFixed(4))];
    }),
  ));
  return {
    offerIndex,
    offerTick: tick,
    survivalLevel: offerIndex,
    offerTier,
    weaponIds,
    controlPowerMultiplier,
    temporaryControlPower,
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
      weaponId: snapshot.definitionId,
      participantId: snapshot.ownerId,
    }];
  });
  return Object.freeze({
    offerIndex: offer.offerIndex,
    offerTick: offer.offerTick,
    survivalLevel: offer.survivalLevel,
    offerTier: offer.offerTier,
    weaponIds: offer.weaponIds,
    controlPowerMultiplier: offer.controlPowerMultiplier,
    temporaryControlPower: offer.temporaryControlPower,
    pickups: Object.freeze(pickups),
    contested: offer.contested,
  });
}

function createScenario(enemyCount: number, seed: number): ArenaV2SurvivalPressureScenarioResult {
  const participants = Object.freeze([PLAYER_ID, ...enemyIds(enemyCount)]);
  const engine = createArenaV1RuleEngine({
    participantIds: participants,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const physics = createPhysics();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const spawnY = groundY();
  const activeIds = new Set(participants);
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
      physics.addCharacter({
        id,
        position: {
          x: index % 2 === 0 ? -10 : 10,
          y: spawnY,
          z: (index - (enemyCount - 1) / 2) * 3.4,
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
      if (tick > 0 && tick % OFFER_INTERVAL_TICKS === 0) {
        offers.push(createSupplyOffer(
          offers.length + 1,
          tick,
          seed,
          spawnY,
          engine,
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
      .map((equipment) => equipment?.definitionId)
      .filter((weaponId): weaponId is string => weaponId !== undefined))];
    const output = Object.freeze({
      enemyCount,
      ticksSimulated: ticksSimulated + 1,
      survivalSeconds: Number(((ticksSimulated + 1) / SURVIVAL_TICK_RATE).toFixed(2)),
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

export function runArenaV2SurvivalPressurePrototype(): ArenaV2SurvivalPressurePrototypeResult {
  return Object.freeze({
    modeId: 'survival-1ve',
    seed: PROBE_SEED,
    enemyDefinitionId: 'single-enemy-family',
    enemyInputPolicy: 'bounded-pursuit-with-supply-priority',
    sharedMovementAndCombatRules: true,
    tieredOfferTelemetryOnly: true,
    scenarios: Object.freeze(ENEMY_COUNTS.map((enemyCount) => createScenario(enemyCount, PROBE_SEED))),
  });
}
