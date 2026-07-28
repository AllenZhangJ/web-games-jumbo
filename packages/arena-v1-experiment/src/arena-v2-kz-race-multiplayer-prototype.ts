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
  ARENA_V1_CHARACTER_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  MOVEMENT_COMMAND_KIND,
  MovementSystem,
  type MovementCommand,
} from '@number-strategy-jump/arena-movement';
import {
  ARENA_FIXED_DT,
  ARENA_TICK_RATE,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsCharacterState,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import {
  createArenaV1CharacterRegistry,
  STAGE4_EQUIPMENT_ID,
  STAGE6_MOVEMENT_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  createArenaV2JumpRouteInputForTick,
  createArenaV2JumpRoutePrototype,
  type ArenaV2JumpRoutePrototype,
} from './arena-v2-jump-route-prototype.js';

const KILL_Y = -6;
const COUNTDOWN_TICKS = ARENA_TICK_RATE;
const RESPAWN_WAIT_TICKS = ARENA_TICK_RATE * 3;
const MAX_RACE_TICKS = 760;
const POST_FINISH_OBSERVATION_TICKS = RESPAWN_WAIT_TICKS + 30;
const ATTACKER_INDEX = 1;
const TARGET_INDEX = 2;
const ATTACK_WEAPON_ID = STAGE4_EQUIPMENT_ID.SHIELD;
const ATTACK_DISTANCE = 1.15;

export type ArenaV2KzRaceScenario = 'finish' | 'hit-reentry';
export type ArenaV2KzRacePhase = 'countdown' | 'running' | 'finished' | 'timeout';
export type ArenaV2KzRaceParticipantStatus = 'ready' | 'running' | 'respawning' | 'finished';

export interface ArenaV2KzRaceParticipantResult {
  readonly participantId: string;
  readonly status: ArenaV2KzRaceParticipantStatus;
  readonly finishTick: number | null;
  readonly fallTick: number | null;
  readonly respawnTick: number | null;
  readonly respawnCount: number;
  readonly respawnSurfaceId: string | null;
  readonly respawnPositionError: number | null;
  readonly finalSurfaceId: string | null;
}

export interface ArenaV2KzRaceEvent {
  readonly kind: 'countdown-finished' | 'attack-hit' | 'fell' | 'respawned' | 'finished';
  readonly tick: number;
  readonly participantId: string | null;
  readonly targetId: string | null;
  readonly surfaceId: string | null;
}

export interface ArenaV2KzRaceProbeResult {
  readonly scenario: ArenaV2KzRaceScenario;
  readonly participantCount: number;
  readonly routeId: string;
  readonly phase: ArenaV2KzRacePhase;
  readonly raceStartTick: number;
  readonly winnerId: string | null;
  readonly winnerFinishTick: number | null;
  readonly attackWeaponId: string | null;
  readonly attackAttemptTick: number | null;
  readonly attackHitTick: number | null;
  readonly attackHitTargetId: string | null;
  readonly respawnWaitTicks: number;
  readonly observedUntilTick: number;
  readonly participantResults: readonly ArenaV2KzRaceParticipantResult[];
  readonly events: readonly ArenaV2KzRaceEvent[];
}

export interface ArenaV2KzRaceMultiplayerPrototypeResult {
  readonly productionStatus: 'research-only';
  readonly usesSharedRuleAndPhysics: true;
  readonly routeId: string;
  readonly participantCounts: readonly number[];
  readonly scenarios: readonly ArenaV2KzRaceScenario[];
  readonly probeCount: number;
  readonly probes: readonly ArenaV2KzRaceProbeResult[];
}

interface MutableRaceParticipant {
  readonly participantId: string;
  status: ArenaV2KzRaceParticipantStatus;
  finishTick: number | null;
  fallTick: number | null;
  respawnTick: number | null;
  respawnCount: number;
  lastSafePosition: { x: number; y: number; z: number };
  lastSafeSurfaceId: string | null;
  respawnSurfaceId: string | null;
  respawnPositionError: number | null;
  finalSurfaceId: string | null;
}

interface RaceRuntime {
  readonly participant: MutableRaceParticipant;
  readonly spawnPosition: Readonly<{ x: number; y: number; z: number }>;
}

const PARTICIPANT_COUNTS: readonly number[] = Object.freeze([2, 3, 4]);
const SCENARIOS: readonly ArenaV2KzRaceScenario[] = Object.freeze(['finish', 'hit-reentry']);

function participantId(index: number): string {
  return `kz-race-player-${index}`;
}

function targetable(participant: MutableRaceParticipant): boolean {
  return participant.status === 'running';
}

function actorSnapshots(
  physics: PhysicsWorld,
  participants: readonly MutableRaceParticipant[],
): readonly RuleActor[] {
  return Object.freeze(participants.map((participant) => {
    const state = physics.getCharacterState(participant.participantId);
    return Object.freeze({
      id: participant.participantId,
      canAct: participant.status === 'running',
      targetable: targetable(participant),
      position: Object.freeze({ ...state.position }),
      facing: Object.freeze({ x: 1, z: 0 }),
    });
  }));
}

function neutralFrame(tick: number, participantIdValue: string): ArenaInputFrame {
  return createNeutralInputFrame(tick, participantIdValue);
}

function inputFrames(
  tick: number,
  participants: readonly MutableRaceParticipant[],
  inputs: ReadonlyMap<string, Readonly<{
    readonly jumpPressed: boolean;
    readonly jumpHeld: boolean;
    readonly moveX: number;
    readonly moveZ: number;
  }>>,
  attackAttemptTick: number | null,
): readonly ArenaInputFrame[] {
  return Object.freeze(participants.map((participant) => {
    const routeInput = inputs.get(participant.participantId);
    if (!routeInput) return neutralFrame(tick, participant.participantId);
    return Object.freeze({
      ...neutralFrame(tick, participant.participantId),
      moveX: routeInput.moveX,
      moveZ: routeInput.moveZ,
      jumpPressed: routeInput.jumpPressed,
      jumpHeld: routeInput.jumpHeld,
      primaryPressed: participant.participantId === participantId(ATTACKER_INDEX)
        && tick === attackAttemptTick,
    });
  }));
}

function positionAtStart(
  route: ArenaV2JumpRoutePrototype,
  profile: Readonly<{ radius: number; halfHeight: number }>,
  index: number,
): Readonly<{ x: number; y: number; z: number }> {
  const surface = route.surfaces[0];
  if (!surface) throw new Error('KZ 竞速缺少起点 surface。');
  const zLanes = [-0.36, -0.12, 0.12, 0.36] as const;
  const z = zLanes[index - 1] ?? 0;
  return Object.freeze({
    x: surface.center.x - 0.4 - (index - 1) * 0.08,
    y: surface.center.y + surface.halfExtents.y + profile.halfHeight + profile.radius,
    z,
  });
}

function surfaceIsRaceFinish(route: ArenaV2JumpRoutePrototype, state: PhysicsCharacterState): boolean {
  const finish = route.anchors[route.finishAnchor];
  if (!finish || state.supportSurfaceId !== 'surface-06-wire') return false;
  return state.position.x >= finish.x - 0.8;
}

function updateSafePosition(
  runtime: RaceRuntime,
  state: PhysicsCharacterState,
): void {
  if (!state.grounded || state.supportSurfaceId === null) return;
  runtime.participant.lastSafePosition = { ...state.position };
  runtime.participant.lastSafeSurfaceId = state.supportSurfaceId;
  runtime.participant.finalSurfaceId = state.supportSurfaceId;
}

function createMovementCommands(
  movement: MovementSystem,
  participant: MutableRaceParticipant,
  input: Readonly<{
    readonly jumpPressed: boolean;
    readonly jumpHeld: boolean;
  }>,
): readonly MovementCommand[] {
  if (participant.status !== 'running' || !input.jumpPressed) return Object.freeze([]);
  const capabilities = movement.getCapabilities(participant.participantId);
  if (capabilities.canGroundJump) {
    return Object.freeze([{
      kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
      participantId: participant.participantId,
      actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
    }]);
  }
  if (capabilities.canAirJump) {
    return Object.freeze([{
      kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
      participantId: participant.participantId,
      actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
    }]);
  }
  return Object.freeze([]);
}

function shouldAttemptAttack(
  scenario: ArenaV2KzRaceScenario,
  attackAttemptTick: number | null,
  physics: PhysicsWorld,
  participants: readonly MutableRaceParticipant[],
): boolean {
  if (scenario !== 'hit-reentry' || attackAttemptTick !== null) return false;
  const attacker = participants.find(({ participantId: id }) => id === participantId(ATTACKER_INDEX));
  const target = participants.find(({ participantId: id }) => id === participantId(TARGET_INDEX));
  if (!attacker || !target || attacker.status !== 'running' || target.status !== 'running') return false;
  const attackerState = physics.getCharacterState(attacker.participantId);
  const targetState = physics.getCharacterState(target.participantId);
  const samePressureSurface = targetState.supportSurfaceId === 'surface-05-narrow'
    || targetState.supportSurfaceId === 'surface-06-wire';
  const distance = Math.hypot(
    targetState.position.x - attackerState.position.x,
    targetState.position.z - attackerState.position.z,
  );
  return samePressureSurface && distance <= ATTACK_DISTANCE;
}

function runProbe(
  route: ArenaV2JumpRoutePrototype,
  characterProfile: Readonly<ReturnType<typeof createCharacterPhysicsProfile>>,
  participantCount: number,
  scenario: ArenaV2KzRaceScenario,
): ArenaV2KzRaceProbeResult {
  const participantIds = Object.freeze(Array.from(
    { length: participantCount },
    (_, index) => participantId(index + 1),
  ));
  const spawnPositions = participantIds.map((_, index) => (
    positionAtStart(route, characterProfile, index + 1)
  ));
  const participants: MutableRaceParticipant[] = participantIds.map((id, index) => ({
    participantId: id,
    status: 'ready',
    finishTick: null,
    fallTick: null,
    respawnTick: null,
    respawnCount: 0,
    lastSafePosition: { ...spawnPositions[index]! },
    lastSafeSurfaceId: 'surface-01-start',
    respawnSurfaceId: null,
    respawnPositionError: null,
    finalSurfaceId: 'surface-01-start',
  }));
  const runtimes: readonly RaceRuntime[] = Object.freeze(participants.map((participant, index) => ({
    participant,
    spawnPosition: spawnPositions[index]!,
  })));
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const physics = createLightweightPhysicsWorld({
    arena: {
      killY: KILL_Y,
      surfaces: route.surfaces.map(({ id, center, halfExtents }) => ({ id, center, halfExtents })),
    },
  });
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const movement = new MovementSystem({
    participantCharacters: participantIds.map((id) => ({
      participantId: id,
      characterDefinition: character,
    })),
    airJumpHorizontalImpulse: 0.6,
  });
  const events: ArenaV2KzRaceEvent[] = [];
  let attackAttemptTick: number | null = null;
  let attackHitTick: number | null = null;
  let attackHitTargetId: string | null = null;
  let winnerId: string | null = null;
  let winnerFinishTick: number | null = null;
  let observedUntilTick = 0;
  let racePhase: ArenaV2KzRacePhase = 'countdown';
  const lastFinishObservationTick = MAX_RACE_TICKS + POST_FINISH_OBSERVATION_TICKS;
  for (const runtime of runtimes) {
    physics.addCharacter({
      id: runtime.participant.participantId,
      position: runtime.spawnPosition,
      ...characterProfile,
    });
  }
  try {
    if (scenario === 'hit-reentry') {
      const instanceId = `v2-kz-race:${scenario}:${participantCount}:${ATTACK_WEAPON_ID}`;
      engine.spawnEquipment({
        instanceId,
        definitionId: ATTACK_WEAPON_ID,
        spawnId: instanceId,
        position: spawnPositions[ATTACKER_INDEX - 1]!,
      });
      engine.resolveEquipmentPickups({
        participants: participantIds.map((id) => ({
          id,
          eligible: id === participantId(ATTACKER_INDEX),
          position: physics.getCharacterState(id).position,
        })),
        contestSeed: 20260730 + participantCount,
      });
    }
    for (let tick = 0; tick <= lastFinishObservationTick; tick += 1) {
      observedUntilTick = tick + 1;
      const running = tick >= COUNTDOWN_TICKS;
      if (running && racePhase === 'countdown') {
        racePhase = 'running';
        events.push(Object.freeze({
          kind: 'countdown-finished',
          tick: tick,
          participantId: null,
          targetId: null,
          surfaceId: null,
        }));
        for (const participant of participants) {
          if (participant.status === 'ready') participant.status = 'running';
        }
      }
      if (scenario === 'hit-reentry' && shouldAttemptAttack(
        scenario,
        attackAttemptTick,
        physics,
        participants,
      )) {
        attackAttemptTick = tick;
      }
      const routeInputs = new Map<string, Readonly<{
        readonly jumpPressed: boolean;
        readonly jumpHeld: boolean;
        readonly moveX: number;
        readonly moveZ: number;
      }>>();
      const contacts = participants.map((participant) => {
        const state = physics.getCharacterState(participant.participantId);
        const routeInput = participant.status === 'running' && running
          ? createArenaV2JumpRouteInputForTick(state.position, state.grounded)
          : { moveX: 0, moveZ: 0, jumpPressed: false, jumpHeld: false };
        routeInputs.set(participant.participantId, routeInput);
        physics.setMovementIntent(
          participant.participantId,
          participant.status === 'running' && running ? routeInput.moveX : 0,
          participant.status === 'running' && running ? routeInput.moveZ : 0,
        );
        if (participant.status === 'running') updateSafePosition(
          runtimes.find(({ participant: value }) => value === participant)!,
          state,
        );
        return Object.freeze({ participantId: participant.participantId, grounded: state.grounded });
      });
      movement.prepareTick({
        tick,
        contacts,
        inputs: participants.map((participant) => {
          const input = routeInputs.get(participant.participantId)!;
          return Object.freeze({
            tick,
            participantId: participant.participantId,
            moveX: input.moveX,
            moveZ: input.moveZ,
            jumpPressed: input.jumpPressed,
            jumpHeld: input.jumpHeld,
          });
        }),
        availability: participants.map((participant) => Object.freeze({
          participantId: participant.participantId,
          canMove: participant.status === 'running' && running,
        })),
      });
      const movementCommands = participants.flatMap((participant) => (
        createMovementCommands(movement, participant, routeInputs.get(participant.participantId)!)
      ));
      movement.execute(movementCommands, {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
      engine.advanceTimers();
      const actionBatch = engine.resolveActions({
        tick,
        actors: actorSnapshots(physics, participants),
        inputFrames: inputFrames(tick, participants, routeInputs, attackAttemptTick),
      });
      const ports = Object.freeze({
        recordHit: () => undefined,
        applyHitstun: () => undefined,
        applyImpulse: (participantIdValue: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
          physics.applyImpulse(participantIdValue, impulse);
        },
      });
      engine.commit(actionBatch, ports);
      const activeBatch = engine.resolveActiveActions({ actors: actorSnapshots(physics, participants) });
      for (const hit of activeBatch.hits) {
        if (hit.attackerId !== participantId(ATTACKER_INDEX)) continue;
        attackHitTick ??= tick;
        attackHitTargetId ??= hit.targetId;
        events.push(Object.freeze({
          kind: 'attack-hit',
          tick,
          participantId: hit.attackerId,
          targetId: hit.targetId,
          surfaceId: physics.getCharacterState(hit.targetId).supportSurfaceId,
        }));
      }
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
      const afterContacts = participants.map((participant) => {
        const state = physics.getCharacterState(participant.participantId);
        return Object.freeze({ participantId: participant.participantId, grounded: state.grounded });
      });
      movement.completeTick({ tick, contacts: afterContacts });
      for (const runtime of runtimes) {
        const participant = runtime.participant;
        const state = physics.getCharacterState(participant.participantId);
        if (participant.status === 'running') {
          updateSafePosition(runtime, state);
          if (state.position.y < KILL_Y) {
            participant.status = 'respawning';
            participant.fallTick = tick + 1;
            participant.respawnTick = tick + 1 + RESPAWN_WAIT_TICKS;
            engine.resetParticipant(participant.participantId);
            movement.resetParticipant(participant.participantId);
            events.push(Object.freeze({
              kind: 'fell',
              tick: tick + 1,
              participantId: participant.participantId,
              targetId: null,
              surfaceId: participant.lastSafeSurfaceId,
            }));
          } else if (surfaceIsRaceFinish(route, state)) {
            participant.status = 'finished';
            participant.finishTick = tick + 1;
            events.push(Object.freeze({
              kind: 'finished',
              tick: tick + 1,
              participantId: participant.participantId,
              targetId: null,
              surfaceId: state.supportSurfaceId,
            }));
            if (winnerFinishTick === null || participant.finishTick < winnerFinishTick) {
              winnerId = participant.participantId;
              winnerFinishTick = participant.finishTick;
              racePhase = 'finished';
            }
          }
        }
        if (participant.status === 'respawning' && participant.respawnTick !== null
          && tick + 1 >= participant.respawnTick) {
          physics.resetCharacter(participant.participantId, {
            position: participant.lastSafePosition,
            facing: { x: 1, z: 0 },
          });
          movement.resetParticipant(participant.participantId);
          const afterRespawn = physics.getCharacterState(participant.participantId);
          participant.status = 'running';
          participant.respawnCount += 1;
          participant.respawnSurfaceId = afterRespawn.supportSurfaceId;
          participant.respawnPositionError = Math.hypot(
            afterRespawn.position.x - participant.lastSafePosition.x,
            afterRespawn.position.z - participant.lastSafePosition.z,
          );
          events.push(Object.freeze({
            kind: 'respawned',
            tick: tick + 1,
            participantId: participant.participantId,
            targetId: null,
            surfaceId: afterRespawn.supportSurfaceId,
          }));
        }
      }
      if (tick >= MAX_RACE_TICKS && winnerFinishTick === null) {
        racePhase = 'timeout';
        break;
      }
      if (winnerFinishTick !== null && tick >= winnerFinishTick + POST_FINISH_OBSERVATION_TICKS) break;
    }
  } finally {
    movement.destroy();
    engine.destroy();
    physics.destroy();
  }
  const results = Object.freeze(participants.map((participant) => Object.freeze({
    participantId: participant.participantId,
    status: participant.status,
    finishTick: participant.finishTick,
    fallTick: participant.fallTick,
    respawnTick: participant.respawnTick,
    respawnCount: participant.respawnCount,
    respawnSurfaceId: participant.respawnSurfaceId,
    respawnPositionError: participant.respawnPositionError,
    finalSurfaceId: participant.finalSurfaceId,
  })));
  return Object.freeze({
    scenario,
    participantCount,
    routeId: route.routeId,
    phase: racePhase,
    raceStartTick: COUNTDOWN_TICKS,
    winnerId,
    winnerFinishTick,
    attackWeaponId: scenario === 'hit-reentry' ? ATTACK_WEAPON_ID : null,
    attackAttemptTick,
    attackHitTick,
    attackHitTargetId,
    respawnWaitTicks: RESPAWN_WAIT_TICKS,
    observedUntilTick,
    participantResults: results,
    events: Object.freeze(events),
  });
}

/**
 * Runs a research-only local race coordinator against the shared route,
 * RuleEngine, MovementSystem and PhysicsWorld. It records a winner and a
 * three-second exact-safe-position respawn observation; it is not a network
 * mode, final race state machine or human fairness result.
 */
export function runArenaV2KzRaceMultiplayerPrototype(): ArenaV2KzRaceMultiplayerPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const probes = SCENARIOS.flatMap((scenario) => PARTICIPANT_COUNTS.map((participantCount) => (
    runProbe(route, profile, participantCount, scenario)
  )));
  return Object.freeze({
    productionStatus: 'research-only',
    usesSharedRuleAndPhysics: true,
    routeId: route.routeId,
    participantCounts: PARTICIPANT_COUNTS,
    scenarios: SCENARIOS,
    probeCount: probes.length,
    probes: Object.freeze(probes),
  });
}
