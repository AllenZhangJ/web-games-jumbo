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

const PLAYER_ID = 'player-1';
const TARGET_ID = 'target-1';
const PROBE_TICKS = 120;
const KILL_Y = -20;
const CONTROL_POWER_STEP = 0.08;
const TIERS = Object.freeze([1, 5, 10]);
const SURFACE = Object.freeze({
  id: 'v2-survival-tier-combat-surface',
  center: Object.freeze({ x: 0, y: 0, z: 0 }),
  halfExtents: Object.freeze({ x: 30, y: 0.5, z: 8 }),
});

interface WeaponProbe {
  readonly weaponId: string;
  readonly actionId: string;
  readonly targetDistance: number;
  readonly baseControlPower: number;
}

const WEAPONS: readonly WeaponProbe[] = Object.freeze([
  Object.freeze({
    weaponId: STAGE4_EQUIPMENT_ID.HAMMER,
    actionId: STAGE4_ACTION_ID.HAMMER_SMASH,
    targetDistance: 1.2,
    baseControlPower: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.HAMMER_SMASH]
      .knockback.horizontalImpulse,
  }),
  Object.freeze({
    weaponId: STAGE4_EQUIPMENT_ID.CHAIN,
    actionId: STAGE4_ACTION_ID.CHAIN_PULL,
    targetDistance: 3.2,
    baseControlPower: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.CHAIN_PULL]
      .knockback.horizontalImpulse,
  }),
  Object.freeze({
    weaponId: STAGE4_EQUIPMENT_ID.SHIELD,
    actionId: STAGE4_ACTION_ID.SHIELD_CHARGE,
    targetDistance: 1,
    baseControlPower: ARENA_GAMEPLAY_V2_TUNING.attacks[STAGE4_ACTION_ID.SHIELD_CHARGE]
      .knockback.horizontalImpulse,
  }),
]);

export interface ArenaV2SurvivalTierCombatProbeResult {
  readonly weaponId: string;
  readonly actionId: string;
  readonly tier: number;
  readonly controlPowerMultiplier: number;
  readonly baseControlPower: number;
  readonly appliedHorizontalControlPower: number;
  readonly firstHitTick: number | null;
  readonly targetHorizontalDisplacement: number;
  readonly targetFell: boolean;
}

export interface ArenaV2SurvivalTierCombatPrototypeResult {
  readonly modeId: 'survival-1ve';
  readonly scalingBoundary: 'research-impulse-port';
  readonly inputGrammarUnchanged: true;
  readonly weaponIds: readonly string[];
  readonly tiers: readonly number[];
  readonly probes: readonly ArenaV2SurvivalTierCombatProbeResult[];
  readonly sameWeaponTier10DisplacementExceedsTier1: boolean;
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

function createActors(physics: PhysicsWorld): readonly RuleActor[] {
  const player = physics.getCharacterState(PLAYER_ID);
  const target = physics.getCharacterState(TARGET_ID);
  return Object.freeze([
    Object.freeze({
      id: PLAYER_ID,
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...player.position }),
      facing: Object.freeze({ x: 1, z: 0 }),
    }),
    Object.freeze({
      id: TARGET_ID,
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...target.position }),
      facing: Object.freeze({ x: -1, z: 0 }),
    }),
  ]);
}

function createFrames(tick: number): readonly ArenaInputFrame[] {
  return Object.freeze([
    Object.freeze({
      ...createNeutralInputFrame(tick, PLAYER_ID),
      primaryPressed: tick === 0,
    }),
    createNeutralInputFrame(tick, TARGET_ID),
  ]);
}

function groundY(): number {
  const character = createArenaV1CharacterRegistry().require(
    ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  );
  const profile = createCharacterPhysicsProfile(character);
  return SURFACE.center.y + SURFACE.halfExtents.y + profile.halfHeight + profile.radius;
}

function runProbe(weapon: WeaponProbe, tier: number): ArenaV2SurvivalTierCombatProbeResult {
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: Object.freeze([PLAYER_ID, TARGET_ID]),
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const physics = createPhysics();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const spawnY = groundY();
  const playerX = -weapon.targetDistance / 2;
  const targetX = weapon.targetDistance / 2;
  physics.addCharacter({ id: PLAYER_ID, position: { x: playerX, y: spawnY, z: 0 }, ...profile });
  physics.addCharacter({ id: TARGET_ID, position: { x: targetX, y: spawnY, z: 0 }, ...profile });
  const startTarget = physics.getCharacterState(TARGET_ID).position;
  let finalTarget = startTarget;
  let firstHitTick: number | null = null;
  let appliedHorizontalControlPower = 0;
  const attackerByTarget = new Map<string, string>();
  const controlPowerMultiplier = Number((1 + (tier - 1) * CONTROL_POWER_STEP).toFixed(4));
  try {
    engine.spawnEquipment({
      instanceId: `v2-tier:${weapon.weaponId}:${tier}`,
      definitionId: weapon.weaponId,
      spawnId: `v2-tier:${weapon.weaponId}:${tier}`,
      position: { x: playerX, y: spawnY, z: 0 },
    });
    engine.resolveEquipmentPickups({
      participants: [PLAYER_ID, TARGET_ID].map((id) => ({
        id,
        eligible: true,
        position: physics.getCharacterState(id).position,
      })),
      contestSeed: 20260727,
    });
    const ports = Object.freeze({
      recordHit: (attackerId: string, targetId: string) => {
        attackerByTarget.set(targetId, attackerId);
      },
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        const attackerId = attackerByTarget.get(participantId);
        const multiplier = attackerId === PLAYER_ID ? controlPowerMultiplier : 1;
        const scaled = Object.freeze({
          x: impulse.x * multiplier,
          y: impulse.y,
          z: impulse.z * multiplier,
        });
        appliedHorizontalControlPower = Math.max(
          appliedHorizontalControlPower,
          Math.hypot(scaled.x, scaled.z),
        );
        physics.applyImpulse(participantId, scaled);
      },
    });
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const actors = createActors(physics);
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick),
      });
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors: createActors(physics) });
      if (activeBatch.hits.some(({ attackerId }) => attackerId === PLAYER_ID)) {
        firstHitTick ??= tick;
      }
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
      finalTarget = physics.getCharacterState(TARGET_ID).position;
    }
  } finally {
    engine.destroy();
    physics.destroy();
  }
  return Object.freeze({
    weaponId: weapon.weaponId,
    actionId: weapon.actionId,
    tier,
    controlPowerMultiplier,
    baseControlPower: weapon.baseControlPower,
    appliedHorizontalControlPower,
    firstHitTick,
    targetHorizontalDisplacement: Math.hypot(
      finalTarget.x - startTarget.x,
      finalTarget.z - startTarget.z,
    ),
    targetFell: finalTarget.y < KILL_Y,
  });
}

export function runArenaV2SurvivalTierCombatPrototype(): ArenaV2SurvivalTierCombatPrototypeResult {
  const probes = WEAPONS.flatMap((weapon) => TIERS.map((tier) => runProbe(weapon, tier)));
  const tier1 = probes.filter(({ tier }) => tier === 1);
  const tier10 = probes.filter(({ tier }) => tier === 10);
  const sameWeaponTier10DisplacementExceedsTier1 = WEAPONS.every(({ weaponId }) => {
    const low = tier1.find((probe) => probe.weaponId === weaponId);
    const high = tier10.find((probe) => probe.weaponId === weaponId);
    return low !== undefined
      && high !== undefined
      && high.targetHorizontalDisplacement > low.targetHorizontalDisplacement;
  });
  return Object.freeze({
    modeId: 'survival-1ve',
    scalingBoundary: 'research-impulse-port',
    inputGrammarUnchanged: true,
    weaponIds: Object.freeze(WEAPONS.map(({ weaponId }) => weaponId)),
    tiers: TIERS,
    probes: Object.freeze(probes),
    sameWeaponTier10DisplacementExceedsTier1,
  });
}
