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
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);
const PROBE_TICKS = 120;
const KILL_Y = -6;
const SURFACE = Object.freeze({
  id: 'weapon-probe-moving-target-surface',
  center: Object.freeze({ x: 0, y: 0, z: 0 }),
  halfExtents: Object.freeze({ x: 10, y: 0.5, z: 4 }),
});

export type ArenaV2WeaponTargetMotion = 'stationary' | 'sidestep';

export interface ArenaV2WeaponMovingTargetResult {
  readonly weaponId: string;
  readonly motion: ArenaV2WeaponTargetMotion;
  readonly startDistance: number;
  readonly hit: boolean;
  readonly firstHitTick: number | null;
  readonly targetSideDisplacementAtHit: number | null;
  readonly targetFinalSideDisplacement: number;
  readonly outcome: 'hit' | 'whiff';
}

interface WeaponProbeDefinition {
  readonly weaponId: string;
  readonly targetDistance: number;
}

const WEAPONS: readonly WeaponProbeDefinition[] = Object.freeze([
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.HAMMER, targetDistance: 1.2 }),
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.CHAIN, targetDistance: 3.2 }),
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.SHIELD, targetDistance: 1 }),
]);

function createSurfaceScenario(): PhysicsWorld {
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
  const attacker = physics.getCharacterState('player-1');
  const target = physics.getCharacterState('player-2');
  return Object.freeze([
    Object.freeze({
      id: 'player-1',
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...attacker.position }),
      facing: Object.freeze({ x: 1, z: 0 }),
    }),
    Object.freeze({
      id: 'player-2',
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
      ...createNeutralInputFrame(tick, 'player-1'),
      primaryPressed: tick === 0,
    }),
    createNeutralInputFrame(tick, 'player-2'),
  ]);
}

function runProbe(
  weapon: WeaponProbeDefinition,
  motion: ArenaV2WeaponTargetMotion,
): ArenaV2WeaponMovingTargetResult {
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: PARTICIPANT_IDS,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const physics = createSurfaceScenario();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const surfaceTop = SURFACE.center.y + SURFACE.halfExtents.y;
  const spawnY = surfaceTop + profile.halfHeight + profile.radius;
  const targetX = SURFACE.center.x;
  const attackerX = targetX - weapon.targetDistance;
  physics.addCharacter({
    id: 'player-1',
    position: { x: attackerX, y: spawnY, z: 0 },
    ...profile,
  });
  physics.addCharacter({
    id: 'player-2',
    position: { x: targetX, y: spawnY, z: 0 },
    ...profile,
  });
  const targetSpeed = motion === 'sidestep' ? 1 : 0;
  physics.setMovementIntent('player-2', 0, targetSpeed);
  let firstHitTick: number | null = null;
  let targetSideDisplacementAtHit: number | null = null;
  let targetFinalSideDisplacement = 0;
  try {
    engine.spawnEquipment({
      instanceId: `v2-moving-target:${motion}:${weapon.weaponId}`,
      definitionId: weapon.weaponId,
      spawnId: `v2-moving-target:${motion}:${weapon.weaponId}`,
      position: { x: attackerX, y: spawnY, z: 0 },
    });
    engine.resolveEquipmentPickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: attackerX, y: spawnY, z: 0 } },
        { id: 'player-2', eligible: true, position: { x: targetX, y: spawnY, z: 0 } },
      ],
      contestSeed: 20260727,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        physics.applyImpulse(participantId, impulse);
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
      const activeBatch = engine.resolveActiveActions({ actors });
      if (activeBatch.hits.some(({ attackerId }) => attackerId === 'player-1')) {
        firstHitTick ??= tick;
        targetSideDisplacementAtHit ??= Math.abs(physics.getCharacterState('player-2').position.z);
      }
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
    }
    targetFinalSideDisplacement = Math.abs(physics.getCharacterState('player-2').position.z);
  } finally {
    engine.destroy();
    physics.destroy();
  }
  return Object.freeze({
    weaponId: weapon.weaponId,
    motion,
    startDistance: weapon.targetDistance,
    hit: firstHitTick !== null,
    firstHitTick,
    targetSideDisplacementAtHit,
    targetFinalSideDisplacement,
    outcome: firstHitTick === null ? 'whiff' : 'hit',
  });
}

export function runArenaV2WeaponMovingTargetPrototype(): readonly ArenaV2WeaponMovingTargetResult[] {
  const results: ArenaV2WeaponMovingTargetResult[] = [];
  for (const motion of ['stationary', 'sidestep'] as const) {
    for (const weapon of WEAPONS) results.push(runProbe(weapon, motion));
  }
  return Object.freeze(results);
}
