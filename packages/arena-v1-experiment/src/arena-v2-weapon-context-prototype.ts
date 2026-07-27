import {
  createNeutralInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_RULE_EVENT,
  type ArenaRuleEngineContract,
  type RuleActor,
} from '@number-strategy-jump/arena-core';
import {
  createArenaV1MatchConfig,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import { STAGE4_EQUIPMENT_ID } from '@number-strategy-jump/arena-v1-content';
import { MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);
const ATTEMPT_TICKS = Object.freeze([0, 120, 240]);
const PROBE_TICKS = 360;

type ProbeMode = 'ground' | 'aerial';
type ProbeDistance = 'in-range' | 'out-of-range';

interface WeaponProbeDefinition {
  readonly weaponId: string;
  readonly inRangeDistance: number;
  readonly outOfRangeDistance: number;
  readonly aerialInRangeOffset: number;
  readonly aerialOutOfRangeOffset: number;
}

export interface ArenaV2WeaponContextPrototypeResult {
  readonly weaponId: string;
  readonly mode: ProbeMode;
  readonly distance: ProbeDistance;
  readonly targetDistance: number;
  readonly attempts: number;
  readonly starts: number;
  readonly firstStartTick: number | null;
  readonly firstHitTick: number | null;
  readonly timeToFirstHitTicks: number | null;
  readonly hits: number;
  readonly hitRate: number;
  readonly whiffRate: number;
  readonly knockbacks: number;
  readonly averageHorizontalImpulse: number;
  readonly maximumHorizontalImpulse: number;
}

const PROBES: readonly WeaponProbeDefinition[] = Object.freeze([
  Object.freeze({
    weaponId: STAGE4_EQUIPMENT_ID.HAMMER,
    inRangeDistance: 1.2,
    outOfRangeDistance: 2.3,
    aerialInRangeOffset: 0.5,
    aerialOutOfRangeOffset: 1.5,
  }),
  Object.freeze({
    weaponId: STAGE4_EQUIPMENT_ID.CHAIN,
    inRangeDistance: 3.2,
    outOfRangeDistance: 5.8,
    aerialInRangeOffset: 1,
    aerialOutOfRangeOffset: 2,
  }),
  Object.freeze({
    weaponId: STAGE4_EQUIPMENT_ID.SHIELD,
    inRangeDistance: 1,
    outOfRangeDistance: 2.4,
    aerialInRangeOffset: 0.4,
    aerialOutOfRangeOffset: 1.2,
  }),
]);

function createGroundCapabilities(participantId: string) {
  return Object.freeze({
    participantId,
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
}

function createAerialCapabilities(participantId: string) {
  return Object.freeze({
    participantId,
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
  });
}

function createActors(mode: ProbeMode, targetDistance: number): readonly RuleActor[] {
  const attackerY = mode === 'aerial' ? 2 : 1;
  return Object.freeze([
    Object.freeze({
      id: 'player-1',
      canAct: true,
      targetable: true,
      position: Object.freeze({ x: 0, y: attackerY, z: 0 }),
      facing: Object.freeze({ x: 1, z: 0 }),
    }),
    Object.freeze({
      id: 'player-2',
      canAct: true,
      targetable: true,
      position: Object.freeze({ x: targetDistance, y: 1, z: 0 }),
      facing: Object.freeze({ x: -1, z: 0 }),
    }),
  ]);
}

function createFrames(tick: number, attack: boolean): readonly ArenaInputFrame[] {
  return Object.freeze([
    Object.freeze({
      ...createNeutralInputFrame(tick, 'player-1'),
      primaryPressed: attack,
    }),
    createNeutralInputFrame(tick, 'player-2'),
  ]);
}

function createCommitPorts() {
  return Object.freeze({
    recordHit: () => undefined,
    applyHitstun: () => undefined,
    applyImpulse: () => undefined,
  });
}

function impulseHorizontalMagnitude(event: Record<string, unknown>): number | null {
  const impulse = event.impulse;
  if (!impulse || typeof impulse !== 'object') return null;
  const value = impulse as Record<string, unknown>;
  if (typeof value.x !== 'number' || typeof value.z !== 'number') return null;
  return Math.hypot(value.x, value.z);
}

function runProbe(
  probe: WeaponProbeDefinition,
  mode: ProbeMode,
  distance: ProbeDistance,
): ArenaV2WeaponContextPrototypeResult {
  const isInRange = distance === 'in-range';
  const targetDistance = mode === 'ground'
    ? (isInRange ? probe.inRangeDistance : probe.outOfRangeDistance)
    : (isInRange ? probe.aerialInRangeOffset : probe.aerialOutOfRangeOffset);
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: PARTICIPANT_IDS,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const impulses: number[] = [];
  let starts = 0;
  let firstStartTick: number | null = null;
  let firstHitTick: number | null = null;
  let hits = 0;
  let knockbacks = 0;
  try {
    engine.spawnEquipment({
      instanceId: `v2-probe:${probe.weaponId}`,
      definitionId: probe.weaponId,
      spawnId: `v2-probe:${probe.weaponId}`,
      position: { x: 0, y: 1, z: 0 },
    });
    engine.resolveEquipmentPickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
        { id: 'player-2', eligible: true, position: { x: targetDistance, y: 1, z: 0 } },
      ],
      contestSeed: 20260727,
    });
    const actors = createActors(mode, targetDistance);
    const capabilities = mode === 'ground'
      ? createGroundCapabilities('player-1')
      : createAerialCapabilities('player-1');
    const additionalCandidates = Object.freeze([{
      participantId: 'player-1',
      candidates: engine.getMovementActionCandidates(capabilities),
    }]);
    const ports = createCommitPorts();
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick, ATTEMPT_TICKS.includes(tick)),
        additionalCandidates,
      });
      if (batch.starts.some(({ participantId }) => participantId === 'player-1')) {
        starts += 1;
        firstStartTick ??= tick;
      }
      engine.commit(batch, ports);

      const activeBatch = engine.resolveActiveActions({ actors });
      hits += activeBatch.hits.filter(({ attackerId }) => attackerId === 'player-1').length;
      if (
        firstHitTick === null
        && activeBatch.hits.some(({ attackerId }) => attackerId === 'player-1')
      ) firstHitTick = tick;
      for (const event of activeBatch.events) {
        if (event.type !== ARENA_RULE_EVENT.KNOCKBACK_APPLIED) continue;
        knockbacks += 1;
        const magnitude = impulseHorizontalMagnitude(event);
        if (magnitude !== null) impulses.push(magnitude);
      }
      engine.commit(activeBatch, ports);
    }
  } finally {
    engine.destroy();
  }
  const averageHorizontalImpulse = impulses.length === 0
    ? 0
    : impulses.reduce((total, value) => total + value, 0) / impulses.length;
  return Object.freeze({
    weaponId: probe.weaponId,
    mode,
    distance,
    targetDistance,
    attempts: ATTEMPT_TICKS.length,
    starts,
    firstStartTick,
    firstHitTick,
    timeToFirstHitTicks: firstStartTick !== null && firstHitTick !== null
      ? firstHitTick - firstStartTick
      : null,
    hits,
    hitRate: starts === 0 ? 0 : hits / starts,
    whiffRate: starts === 0 ? 0 : (starts - hits) / starts,
    knockbacks,
    averageHorizontalImpulse,
    maximumHorizontalImpulse: impulses.length === 0 ? 0 : Math.max(...impulses),
  });
}

export function runArenaV2WeaponContextPrototype(): readonly ArenaV2WeaponContextPrototypeResult[] {
  const results: ArenaV2WeaponContextPrototypeResult[] = [];
  for (const probe of PROBES) {
    for (const mode of ['ground', 'aerial'] as const) {
      for (const distance of ['in-range', 'out-of-range'] as const) {
        results.push(runProbe(probe, mode, distance));
      }
    }
  }
  return Object.freeze(results);
}
