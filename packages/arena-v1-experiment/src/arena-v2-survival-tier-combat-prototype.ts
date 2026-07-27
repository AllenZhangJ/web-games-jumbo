import {
  createNeutralInputFrame,
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
  ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS,
  createArenaV2SurvivalTierAuthorityContent,
  selectArenaV2SurvivalTierWeapon,
  type ArenaV2SurvivalWeaponDefinition,
} from './arena-v2-survival-weapon-definition.js';

const PLAYER_ID = 'player-1';
const TARGET_ID = 'target-1';
const PROBE_TICKS = 120;
const KILL_Y = -20;
const TIERS = Object.freeze([1, 5, 10]);
const SURFACE = Object.freeze({
  id: 'v2-survival-tier-combat-surface',
  center: Object.freeze({ x: 0, y: 0, z: 0 }),
  halfExtents: Object.freeze({ x: 30, y: 0.5, z: 8 }),
});

interface WeaponProbe {
  readonly definition: ArenaV2SurvivalWeaponDefinition;
  readonly targetDistance: number;
}

const PROBE_TARGET_DISTANCE: Readonly<Record<string, number>> = Object.freeze({
  hammer: 1.2,
  chain: 3.2,
  shield: 1,
});

const WEAPONS: readonly WeaponProbe[] = Object.freeze(
  ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS.map((definition) => Object.freeze({
    definition,
    targetDistance: PROBE_TARGET_DISTANCE[definition.id] ?? definition.baseStats.effectiveDistance / 2,
  })),
);

export interface ArenaV2SurvivalTierCombatProbeResult {
  readonly weaponId: string;
  readonly actionId: string;
  readonly equipmentDefinitionId: string;
  readonly definitionBundleHash: string;
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
  readonly scalingBoundary: 'formal-tier-definition';
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
  const config = createArenaV1MatchConfig({
    contextPrimaryMobilityEnabled: false,
    equipment: { initialSpawns: [] },
  });
  const content = createArenaV2SurvivalTierAuthorityContent(tier, config);
  const selection = selectArenaV2SurvivalTierWeapon(content, weapon.definition.id);
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: Object.freeze([PLAYER_ID, TARGET_ID]),
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
  const playerX = -weapon.targetDistance / 2;
  const targetX = weapon.targetDistance / 2;
  physics.addCharacter({ id: PLAYER_ID, position: { x: playerX, y: spawnY, z: 0 }, ...profile });
  physics.addCharacter({ id: TARGET_ID, position: { x: targetX, y: spawnY, z: 0 }, ...profile });
  const startTarget = physics.getCharacterState(TARGET_ID).position;
  let finalTarget = startTarget;
  let firstHitTick: number | null = null;
  let appliedHorizontalControlPower = 0;
  const attackerByTarget = new Map<string, string>();
  try {
    engine.spawnEquipment({
      instanceId: `v2-tier:${weapon.definition.id}:${tier}`,
      definitionId: selection.equipmentDefinitionId,
      spawnId: `v2-tier:${weapon.definition.id}:${tier}`,
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
        const scaled = Object.freeze({ ...impulse });
        if (participantId === TARGET_ID && attackerByTarget.get(participantId) === PLAYER_ID) {
          appliedHorizontalControlPower = Math.max(
            appliedHorizontalControlPower,
            Math.hypot(scaled.x, scaled.z),
          );
        }
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
    weaponId: weapon.definition.id,
    actionId: selection.groundActionDefinitionId,
    equipmentDefinitionId: selection.equipmentDefinitionId,
    definitionBundleHash: content.definitionBundleHash,
    tier,
    controlPowerMultiplier: selection.multiplier,
    baseControlPower: weapon.definition.baseStats.horizontalControl,
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
  const sameWeaponTier10DisplacementExceedsTier1 = WEAPONS.every(({ definition }) => {
    const low = tier1.find((probe) => probe.weaponId === definition.id);
    const high = tier10.find((probe) => probe.weaponId === definition.id);
    return low !== undefined
      && high !== undefined
      && high.targetHorizontalDisplacement > low.targetHorizontalDisplacement;
  });
  return Object.freeze({
    modeId: 'survival-1ve',
    scalingBoundary: 'formal-tier-definition',
    inputGrammarUnchanged: true,
    weaponIds: Object.freeze(WEAPONS.map(({ definition }) => definition.id)),
    tiers: TIERS,
    probes: Object.freeze(probes),
    sameWeaponTier10DisplacementExceedsTier1,
  });
}
