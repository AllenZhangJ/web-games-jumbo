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
import { MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);
const PROBE_TICKS = 120;
const KILL_Y = -6;
const SURFACE = Object.freeze({
  id: 'weapon-probe-contest-surface',
  center: Object.freeze({ x: 0, y: 0, z: 0 }),
  halfExtents: Object.freeze({ x: 10, y: 0.5, z: 4 }),
});

export type ArenaV2WeaponContestScenario =
  | 'self-displacement'
  | 'aerial-context'
  | 'mutual-attack';

export interface ArenaV2WeaponContestActorResult {
  readonly weaponId: string;
  readonly started: boolean;
  readonly firstStartTick: number | null;
  readonly firstHitTick: number | null;
  readonly hitCount: number;
  readonly selfImpulse: number;
  readonly horizontalDisplacement: number;
  readonly verticalDisplacement: number;
}

export interface ArenaV2WeaponContestResult {
  readonly scenario: ArenaV2WeaponContestScenario;
  readonly weaponB: string | null;
  readonly actorA: ArenaV2WeaponContestActorResult;
  readonly actorB: ArenaV2WeaponContestActorResult | null;
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

const MUTUAL_PAIRS: readonly (readonly [WeaponProbeDefinition, WeaponProbeDefinition])[] = Object.freeze([
  Object.freeze([WEAPONS[0]!, WEAPONS[1]!] as const),
  Object.freeze([WEAPONS[1]!, WEAPONS[2]!] as const),
  Object.freeze([WEAPONS[2]!, WEAPONS[0]!] as const),
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
  const first = physics.getCharacterState('player-1');
  const second = physics.getCharacterState('player-2');
  return Object.freeze([
    Object.freeze({
      id: 'player-1',
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...first.position }),
      facing: Object.freeze({ x: 1, z: 0 }),
    }),
    Object.freeze({
      id: 'player-2',
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...second.position }),
      facing: Object.freeze({ x: -1, z: 0 }),
    }),
  ]);
}

function createFrames(
  tick: number,
  attackingParticipants: ReadonlySet<string>,
): readonly ArenaInputFrame[] {
  return Object.freeze(PARTICIPANT_IDS.map((participantId) => Object.freeze({
    ...createNeutralInputFrame(tick, participantId),
    primaryPressed: tick === 0 && attackingParticipants.has(participantId),
  })));
}

function createAerialCandidates(engine: ArenaRuleEngineContract) {
  const capabilities = {
    participantId: 'player-1',
    canMove: true,
    grounded: false,
    mode: MOVEMENT_MODE.STANDARD,
    crouchActionDefinitionId: null,
    hasBufferedJump: false,
    canGroundJump: false,
    canAirJump: false,
    canBeginCrouchJump: false,
    canReleaseCrouchJump: false,
    canBeginDownSmash: true,
  };
  return Object.freeze([{
    participantId: 'player-1',
    candidates: engine.getMovementActionCandidates(capabilities),
  }]);
}

function horizontalMagnitude(value: Readonly<{ x: number; z: number }>): number {
  return Math.hypot(value.x, value.z);
}

function createActorResult(
  weaponId: string,
  firstStartTick: number | null,
  firstHitTick: number | null,
  hitCount: number,
  selfImpulse: number,
  start: Readonly<{ x: number; y: number; z: number }>,
  end: Readonly<{ x: number; y: number; z: number }>,
): ArenaV2WeaponContestActorResult {
  return Object.freeze({
    weaponId,
    started: firstStartTick !== null,
    firstStartTick,
    firstHitTick,
    hitCount,
    selfImpulse,
    horizontalDisplacement: Math.hypot(end.x - start.x, end.z - start.z),
    verticalDisplacement: Math.abs(end.y - start.y),
  });
}

function runProbe(
  scenario: ArenaV2WeaponContestScenario,
  weapon: WeaponProbeDefinition,
  opponent: WeaponProbeDefinition | null,
): ArenaV2WeaponContestResult {
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
  const groundY = surfaceTop + profile.halfHeight + profile.radius;
  const isMutual = opponent !== null;
  const attackDistance = scenario === 'aerial-context' ? 0.8 : weapon.targetDistance;
  const firstX = isMutual ? -attackDistance / 2 : -attackDistance;
  const secondX = isMutual ? weapon.targetDistance / 2 : 0;
  const firstY = scenario === 'aerial-context' ? groundY + 1.8 : groundY;
  const secondY = groundY;
  physics.addCharacter({ id: 'player-1', position: { x: firstX, y: firstY, z: 0 }, ...profile });
  physics.addCharacter({ id: 'player-2', position: { x: secondX, y: secondY, z: 0 }, ...profile });
  const starts = Object.freeze({
    'player-1': Object.freeze({ ...physics.getCharacterState('player-1').position }),
    'player-2': Object.freeze({ ...physics.getCharacterState('player-2').position }),
  });
  const firstHits: Record<string, number | null> = { 'player-1': null, 'player-2': null };
  const firstStarts: Record<string, number | null> = { 'player-1': null, 'player-2': null };
  const hitCounts: Record<string, number> = { 'player-1': 0, 'player-2': 0 };
  const selfImpulses: Record<string, number> = { 'player-1': 0, 'player-2': 0 };
  const attackingParticipants = new Set(['player-1']);
  if (opponent !== null) attackingParticipants.add('player-2');
  try {
    engine.spawnEquipment({
      instanceId: `v2-contest:${scenario}:player-1:${weapon.weaponId}`,
      definitionId: weapon.weaponId,
      spawnId: `v2-contest:${scenario}:player-1:${weapon.weaponId}`,
      position: { x: firstX, y: firstY, z: 0 },
    });
    if (opponent !== null) {
      engine.spawnEquipment({
        instanceId: `v2-contest:${scenario}:player-2:${opponent.weaponId}`,
        definitionId: opponent.weaponId,
        spawnId: `v2-contest:${scenario}:player-2:${opponent.weaponId}`,
        position: { x: secondX, y: secondY, z: 0 },
      });
    }
    engine.resolveEquipmentPickups({
      participants: PARTICIPANT_IDS.map((id) => ({
        id,
        eligible: true,
        position: physics.getCharacterState(id).position,
      })),
      contestSeed: 20260727,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        physics.applyImpulse(participantId, impulse);
      },
    });
    const additionalCandidates = scenario === 'aerial-context'
      ? createAerialCandidates(engine)
      : undefined;
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const actors = createActors(physics);
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick, attackingParticipants),
        ...(additionalCandidates === undefined ? {} : { additionalCandidates }),
      });
      for (const start of batch.starts) firstStarts[start.participantId] ??= tick;
      for (const command of batch.commands) {
        const value = command as unknown as Readonly<Record<string, unknown>>;
        if (value.effectKind !== 'apply-self-impulse') continue;
        const participantId = value.participantId;
        if (typeof participantId !== 'string' || !(participantId in selfImpulses)) continue;
        const impulse = value.impulse;
        if (!impulse || typeof impulse !== 'object') continue;
        const record = impulse as Readonly<Record<string, unknown>>;
        if (typeof record.x !== 'number' || typeof record.z !== 'number') continue;
        const currentSelfImpulse = selfImpulses[participantId];
        if (currentSelfImpulse === undefined) continue;
        selfImpulses[participantId] = currentSelfImpulse
          + horizontalMagnitude({ x: record.x, z: record.z });
      }
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors });
      for (const hit of activeBatch.hits) {
        if (!(hit.attackerId in hitCounts)) continue;
        const currentHitCount = hitCounts[hit.attackerId];
        if (currentHitCount === undefined) continue;
        hitCounts[hit.attackerId] = currentHitCount + 1;
        firstHits[hit.attackerId] ??= tick;
      }
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
    }
    const ends = Object.freeze({
      'player-1': Object.freeze({ ...physics.getCharacterState('player-1').position }),
      'player-2': Object.freeze({ ...physics.getCharacterState('player-2').position }),
    });
    return Object.freeze({
      scenario,
      weaponB: opponent?.weaponId ?? null,
      actorA: createActorResult(
        weapon.weaponId,
        firstStarts['player-1'] ?? null,
        firstHits['player-1'] ?? null,
        hitCounts['player-1'] ?? 0,
        selfImpulses['player-1'] ?? 0,
        starts['player-1'],
        ends['player-1'],
      ),
      actorB: opponent === null
        ? null
        : createActorResult(
          opponent.weaponId,
          firstStarts['player-2'] ?? null,
          firstHits['player-2'] ?? null,
          hitCounts['player-2'] ?? 0,
          selfImpulses['player-2'] ?? 0,
          starts['player-2'],
          ends['player-2'],
        ),
    });
  } finally {
    engine.destroy();
    physics.destroy();
  }
}

export function runArenaV2WeaponContestPrototype(): readonly ArenaV2WeaponContestResult[] {
  const results: ArenaV2WeaponContestResult[] = [];
  for (const weapon of WEAPONS) {
    results.push(runProbe('self-displacement', weapon, null));
    results.push(runProbe('aerial-context', weapon, null));
  }
  for (const [first, second] of MUTUAL_PAIRS) {
    results.push(runProbe('mutual-attack', first, second));
  }
  return Object.freeze(results);
}
