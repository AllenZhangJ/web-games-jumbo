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
import {
  ARENA_V1_CHARACTER_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  createArenaV1CharacterRegistry,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';
import {
  createArenaV2JumpRoutePrototype,
  type ArenaV2JumpRouteSurface,
} from './arena-v2-jump-route-prototype.js';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);
const PROBE_TICKS = 240;
const KILL_Y = -6;

export type ArenaV2WeaponMapProbeKind = 'wide-platform' | 'narrow-path' | 'edge-platform';

export interface ArenaV2WeaponMapProbeResult {
  readonly weaponId: string;
  readonly mapKind: ArenaV2WeaponMapProbeKind;
  readonly surfaceId: string;
  readonly surfaceWidth: number;
  readonly surfaceDepth: number;
  readonly targetDistance: number;
  readonly hit: boolean;
  readonly firstHitTick: number | null;
  readonly horizontalImpulse: number;
  readonly targetHorizontalDisplacement: number;
  readonly targetFell: boolean;
  readonly fallTick: number | null;
  readonly outcome: 'miss' | 'hit-safe' | 'hit-ring-out';
}

interface MapProbeScenario {
  readonly kind: ArenaV2WeaponMapProbeKind;
  readonly surface: ArenaV2JumpRouteSurface;
  readonly targetOffsetX: number;
}

interface WeaponMapProbeDefinition {
  readonly weaponId: string;
  readonly targetDistance: number;
}

const ROUTE = createArenaV2JumpRoutePrototype();
const ROUTE_SURFACE_BY_ID = new Map(ROUTE.surfaces.map((surface) => [surface.id, surface]));

const SCENARIOS: readonly MapProbeScenario[] = Object.freeze([
  Object.freeze({
    kind: 'wide-platform',
    surface: Object.freeze({
      id: 'weapon-probe-wide-platform',
      segmentId: 'probe-wide-platform',
      center: Object.freeze({ x: 0, y: 0, z: 0 }),
      halfExtents: Object.freeze({ x: 10, y: 0.5, z: 2 }),
    }),
    targetOffsetX: 0,
  }),
  Object.freeze({
    kind: 'narrow-path',
    surface: ROUTE_SURFACE_BY_ID.get('surface-05-narrow')!,
    targetOffsetX: 0,
  }),
  Object.freeze({
    kind: 'edge-platform',
    surface: Object.freeze({
      id: 'weapon-probe-edge-platform',
      segmentId: 'probe-edge-platform',
      center: Object.freeze({ x: 0, y: 0, z: 0 }),
      halfExtents: Object.freeze({ x: 2.5, y: 0.5, z: 1 }),
    }),
    targetOffsetX: 1.85,
  }),
]);

const WEAPONS: readonly WeaponMapProbeDefinition[] = Object.freeze([
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.HAMMER, targetDistance: 1.2 }),
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.CHAIN, targetDistance: 3.2 }),
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.SHIELD, targetDistance: 1 }),
]);

function createActors(
  physics: PhysicsWorld,
): readonly RuleActor[] {
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

function horizontalMagnitude(impulse: Readonly<{ x: number; y: number; z: number }>): number {
  return Math.hypot(impulse.x, impulse.z);
}

function createSurfaceScenario(scenario: MapProbeScenario): PhysicsWorld {
  return createLightweightPhysicsWorld({
    arena: {
      killY: KILL_Y,
      surfaces: [{
        id: scenario.surface.id,
        center: scenario.surface.center,
        halfExtents: scenario.surface.halfExtents,
      }],
    },
  });
}

function runProbe(
  weapon: WeaponMapProbeDefinition,
  scenario: MapProbeScenario,
): ArenaV2WeaponMapProbeResult {
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: PARTICIPANT_IDS,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const physics = createSurfaceScenario(scenario);
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const surfaceTop = scenario.surface.center.y + scenario.surface.halfExtents.y;
  const spawnY = surfaceTop + profile.halfHeight + profile.radius;
  const targetX = scenario.surface.center.x + scenario.targetOffsetX;
  const attackerX = targetX - weapon.targetDistance;
  const startTargetX = targetX;
  physics.addCharacter({
    id: 'player-1',
    position: { x: attackerX, y: spawnY, z: scenario.surface.center.z },
    ...profile,
  });
  physics.addCharacter({
    id: 'player-2',
    position: { x: targetX, y: spawnY, z: scenario.surface.center.z },
    ...profile,
  });
  let firstHitTick: number | null = null;
  let horizontalImpulse = 0;
  let fallTick: number | null = null;
  let finalTargetX = startTargetX;
  try {
    engine.spawnEquipment({
      instanceId: `v2-map-probe:${scenario.kind}:${weapon.weaponId}`,
      definitionId: weapon.weaponId,
      spawnId: `v2-map-probe:${scenario.kind}:${weapon.weaponId}`,
      position: { x: attackerX, y: spawnY, z: scenario.surface.center.z },
    });
    engine.resolveEquipmentPickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: attackerX, y: spawnY, z: scenario.surface.center.z } },
        { id: 'player-2', eligible: true, position: { x: targetX, y: spawnY, z: scenario.surface.center.z } },
      ],
      contestSeed: 20260727,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        horizontalImpulse = horizontalMagnitude(impulse);
        physics.applyImpulse(participantId, impulse);
      },
    });
    const capabilities = Object.freeze({
      participantId: 'player-1',
      canMove: true,
      grounded: true,
      mode: MOVEMENT_MODE.STANDARD,
      crouchActionDefinitionId: null,
      hasBufferedJump: false,
      canGroundJump: false,
      canAirJump: false,
      canBeginCrouchJump: false,
      canReleaseCrouchJump: false,
      canBeginDownSmash: false,
    });
    const additionalCandidates = Object.freeze([{
      participantId: 'player-1',
      candidates: engine.getMovementActionCandidates(capabilities),
    }]);
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const actors = createActors(physics);
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick),
        additionalCandidates,
      });
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors });
      if (activeBatch.hits.some(({ attackerId }) => attackerId === 'player-1')) {
        firstHitTick ??= tick;
      }
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
      const target = physics.getCharacterState('player-2');
      finalTargetX = target.position.x;
      if (fallTick === null && target.position.y < KILL_Y) fallTick = tick + 1;
      if (fallTick !== null) break;
    }
  } finally {
    engine.destroy();
    physics.destroy();
  }
  const targetDisplacement = Math.abs(finalTargetX - startTargetX);
  const hit = firstHitTick !== null;
  const targetFell = fallTick !== null;
  return Object.freeze({
    weaponId: weapon.weaponId,
    mapKind: scenario.kind,
    surfaceId: scenario.surface.id,
    surfaceWidth: scenario.surface.halfExtents.x * 2,
    surfaceDepth: scenario.surface.halfExtents.z * 2,
    targetDistance: weapon.targetDistance,
    hit,
    firstHitTick,
    horizontalImpulse,
    targetHorizontalDisplacement: targetDisplacement,
    targetFell,
    fallTick,
    outcome: !hit ? 'miss' : targetFell ? 'hit-ring-out' : 'hit-safe',
  });
}

export function runArenaV2WeaponMapPrototype(): readonly ArenaV2WeaponMapProbeResult[] {
  const results: ArenaV2WeaponMapProbeResult[] = [];
  for (const scenario of SCENARIOS) {
    for (const weapon of WEAPONS) results.push(runProbe(weapon, scenario));
  }
  return Object.freeze(results);
}
