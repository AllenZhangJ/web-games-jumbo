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

const PLAYER_ID = 'player-1';
const ENEMY_ID = 'enemy-1';
const KILL_Y = -6;
const PROBE_TICKS = 180;
const SURFACE = Object.freeze({
  id: 'v2-survival-entity-surface',
  center: Object.freeze({ x: 0, y: 0, z: 0 }),
  halfExtents: Object.freeze({ x: 2.5, y: 0.5, z: 2 }),
});
const PLAYER_ATTACK_WEAPON = STAGE4_EQUIPMENT_ID.HAMMER;
const ENEMY_ATTACK_WEAPON = STAGE4_EQUIPMENT_ID.HAMMER;
const REVIVE_POSITION = Object.freeze({ x: 0, z: 0 });

export type ArenaV2SurvivalEntityEncounterKind =
  | 'enemy-knockdown'
  | 'player-first-down'
  | 'player-second-down';

export interface ArenaV2SurvivalEntityEncounterResult {
  readonly kind: ArenaV2SurvivalEntityEncounterKind;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly firstHitTick: number | null;
  readonly fallTick: number | null;
  readonly targetHorizontalDisplacement: number;
  readonly targetFell: boolean;
  readonly targetOutcome: 'enemy-removed' | 'player-revived' | 'player-eliminated';
  readonly revivedAt: Readonly<{ x: number; y: number; z: number }> | null;
}

export interface ArenaV2SurvivalEntityPrototypeResult {
  readonly modeId: 'survival-1ve';
  readonly seed: number;
  readonly enemyEntityId: typeof ENEMY_ID;
  readonly enemyDefinitionId: 'single-enemy-family';
  readonly sharedMovementAndCombatRules: true;
  readonly playerLives: number;
  readonly encounters: readonly ArenaV2SurvivalEntityEncounterResult[];
  readonly enemyKnockdowns: number;
  readonly playerDowns: number;
  readonly reviveCount: number;
  readonly ended: boolean;
  readonly endReason: 'second-knockdown' | null;
}

interface EncounterSetup {
  readonly kind: ArenaV2SurvivalEntityEncounterKind;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly attackerX: number;
  readonly targetX: number;
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
  const enemy = physics.getCharacterState(ENEMY_ID);
  return Object.freeze([
    Object.freeze({
      id: PLAYER_ID,
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...player.position }),
      facing: Object.freeze({ ...player.facing }),
    }),
    Object.freeze({
      id: ENEMY_ID,
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...enemy.position }),
      facing: Object.freeze({ ...enemy.facing }),
    }),
  ]);
}

function createFrames(tick: number, attackerId: string): readonly ArenaInputFrame[] {
  return Object.freeze([
    Object.freeze({
      ...createNeutralInputFrame(tick, PLAYER_ID),
      primaryPressed: tick === 0 && attackerId === PLAYER_ID,
    }),
    Object.freeze({
      ...createNeutralInputFrame(tick, ENEMY_ID),
      primaryPressed: tick === 0 && attackerId === ENEMY_ID,
    }),
  ]);
}

function spawnAndPickWeapon(
  engine: ArenaRuleEngineContract,
  setup: EncounterSetup,
  physics: PhysicsWorld,
): void {
  engine.spawnEquipment({
    instanceId: `v2-survival-entity:${setup.kind}:${setup.attackerId}`,
    definitionId: setup.weaponId,
    spawnId: `v2-survival-entity:${setup.kind}:${setup.attackerId}`,
    position: {
      x: setup.attackerX,
      y: physics.getCharacterState(setup.attackerId).position.y,
      z: 0,
    },
  });
  engine.resolveEquipmentPickups({
    participants: [PLAYER_ID, ENEMY_ID].map((id) => ({
      id,
      eligible: true,
      position: physics.getCharacterState(id).position,
    })),
    contestSeed: 20260727,
  });
}

function runEncounter(setup: EncounterSetup): ArenaV2SurvivalEntityEncounterResult {
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: Object.freeze([PLAYER_ID, ENEMY_ID]),
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const physics = createPhysics();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const surfaceTop = SURFACE.center.y + SURFACE.halfExtents.y;
  const spawnY = surfaceTop + profile.halfHeight + profile.radius;
  physics.addCharacter({
    id: PLAYER_ID,
    position: { x: setup.attackerId === PLAYER_ID ? setup.attackerX : setup.targetX, y: spawnY, z: 0 },
    ...profile,
  });
  physics.addCharacter({
    id: ENEMY_ID,
    position: { x: setup.attackerId === ENEMY_ID ? setup.attackerX : setup.targetX, y: spawnY, z: 0 },
    ...profile,
  });
  const startTarget = Object.freeze({ ...physics.getCharacterState(setup.targetId).position });
  let finalTarget = startTarget;
  let firstHitTick: number | null = null;
  let fallTick: number | null = null;
  let revivedAt: Readonly<{ x: number; y: number; z: number }> | null = null;
  try {
    spawnAndPickWeapon(engine, setup, physics);
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
        inputFrames: createFrames(tick, setup.attackerId),
      });
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors });
      if (activeBatch.hits.some(({ attackerId }) => attackerId === setup.attackerId)) {
        firstHitTick ??= tick;
      }
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
      const target = physics.getCharacterState(setup.targetId);
      finalTarget = Object.freeze({ ...target.position });
      if (fallTick === null && target.position.y < KILL_Y) {
        fallTick = tick + 1;
        if (setup.kind === 'player-first-down') {
          physics.resetCharacter(setup.targetId, {
            position: { x: REVIVE_POSITION.x, y: spawnY, z: REVIVE_POSITION.z },
            facing: { x: 1, z: 0 },
          });
          const reset = physics.getCharacterState(setup.targetId);
          revivedAt = Object.freeze({ ...reset.position });
        }
        break;
      }
    }
  } finally {
    engine.destroy();
    physics.destroy();
  }
  const displacement = Math.hypot(finalTarget.x - startTarget.x, finalTarget.z - startTarget.z);
  return Object.freeze({
    kind: setup.kind,
    attackerId: setup.attackerId,
    targetId: setup.targetId,
    weaponId: setup.weaponId,
    firstHitTick,
    fallTick,
    targetHorizontalDisplacement: displacement,
    targetFell: fallTick !== null,
    targetOutcome: setup.targetId === ENEMY_ID ? 'enemy-removed' : (
      setup.kind === 'player-first-down' ? 'player-revived' : 'player-eliminated'
    ),
    revivedAt,
  });
}

function setupFor(kind: ArenaV2SurvivalEntityEncounterKind): EncounterSetup {
  if (kind === 'enemy-knockdown') {
    return Object.freeze({
      kind,
      attackerId: PLAYER_ID,
      targetId: ENEMY_ID,
      weaponId: PLAYER_ATTACK_WEAPON,
      attackerX: 0,
      targetX: 1.2,
    });
  }
  return Object.freeze({
    kind,
    attackerId: ENEMY_ID,
    targetId: PLAYER_ID,
    weaponId: ENEMY_ATTACK_WEAPON,
    attackerX: 0,
    targetX: 1.2,
  });
}

export function runArenaV2SurvivalEntityPrototype(): ArenaV2SurvivalEntityPrototypeResult {
  const encounters = Object.freeze([
    runEncounter(setupFor('enemy-knockdown')),
    runEncounter(setupFor('player-first-down')),
    runEncounter(setupFor('player-second-down')),
  ]);
  const playerDowns = encounters.filter(({ targetId, targetFell }) => targetId === PLAYER_ID && targetFell).length;
  const enemyKnockdowns = encounters.filter(({ targetId, targetFell }) => targetId === ENEMY_ID && targetFell).length;
  return Object.freeze({
    modeId: 'survival-1ve',
    seed: 20260727,
    enemyEntityId: ENEMY_ID,
    enemyDefinitionId: 'single-enemy-family',
    sharedMovementAndCombatRules: true,
    playerLives: 2,
    encounters,
    enemyKnockdowns,
    playerDowns,
    reviveCount: encounters.filter(({ targetOutcome }) => targetOutcome === 'player-revived').length,
    ended: encounters.some(({ targetOutcome }) => targetOutcome === 'player-eliminated'),
    endReason: playerDowns >= 2 ? 'second-knockdown' : null,
  });
}
