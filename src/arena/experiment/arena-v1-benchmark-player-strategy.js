import { createArenaV1CharacterRegistry } from '../content/arena-v1-characters.js';
import { createNeutralInputFrame, normalizeInputFrame } from '../input-frame.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
} from '../rules/definition-utils.js';

export const ARENA_V1_BENCHMARK_PLAYER_STRATEGY_VERSION = 1;

export const ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING = Object.freeze({
  observationHistoryTicks: 11,
  decisionIntervalTicks: 8,
  movementMagnitude: 0.92,
  edgeRecoveryClearance: 1.25,
  attackRangeScale: 0.92,
});

const TUNING_KEYS = new Set(Object.keys(ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING));

function unitInterval(value, name) {
  const result = assertPositiveFinite(value, name);
  if (result > 1) throw new RangeError(`${name} 不能超过 1。`);
  return result;
}

export function createArenaV1BenchmarkPlayerTuning(value) {
  const source = cloneFrozenData(value, 'benchmark player tuning');
  assertKnownKeys(source, TUNING_KEYS, 'benchmark player tuning');
  return Object.freeze({
    observationHistoryTicks: assertIntegerAtLeast(
      source.observationHistoryTicks,
      1,
      'benchmark player observationHistoryTicks',
    ),
    decisionIntervalTicks: assertIntegerAtLeast(
      source.decisionIntervalTicks,
      1,
      'benchmark player decisionIntervalTicks',
    ),
    movementMagnitude: unitInterval(
      source.movementMagnitude,
      'benchmark player movementMagnitude',
    ),
    edgeRecoveryClearance: assertPositiveFinite(
      source.edgeRecoveryClearance,
      'benchmark player edgeRecoveryClearance',
    ),
    attackRangeScale: unitInterval(
      source.attackRangeScale,
      'benchmark player attackRangeScale',
    ),
  });
}

export function createArenaV1BenchmarkPlayerStrategy({
  config,
  tuning,
  participantId = 'player-1',
  opponentId = 'player-2',
}) {
  const resolved = createArenaV1BenchmarkPlayerTuning(tuning);
  const characterRegistry = createArenaV1CharacterRegistry();
  const characterId = config.participantCharacters.find(
    (value) => value.participantId === participantId,
  )?.definitionId;
  const characterRadius = characterRegistry.require(characterId).collision.radius;
  const history = [];
  let nextDecisionTick = 0;
  let moveX = 0;
  let moveZ = 0;
  let destroyed = false;
  return Object.freeze({
    version: ARENA_V1_BENCHMARK_PLAYER_STRATEGY_VERSION,
    createInput(snapshot) {
      if (destroyed) throw new Error('ArenaV1BenchmarkPlayerStrategy 已销毁。');
      history.push(snapshot);
      if (history.length > resolved.observationHistoryTicks) history.shift();
      const self = snapshot.participants.find(({ id }) => id === participantId);
      if (!self) throw new Error(`benchmark player 缺少参与者 ${participantId}。`);
      if (self.status !== 'active') return createNeutralInputFrame(snapshot.tick, participantId);
      let primaryPressed = false;
      if (snapshot.tick >= nextDecisionTick) {
        nextDecisionTick = snapshot.tick + resolved.decisionIntervalTicks;
        const delayed = history[0];
        const opponent = delayed.participants.find(({ id }) => id === opponentId);
        if (!opponent) throw new Error(`benchmark player 缺少对手 ${opponentId}。`);
        const surface = config.arena.surfaces.find(
          ({ id }) => id === self.supportSurfaceId,
        ) ?? config.arena.surfaces[0];
        const clearance = Math.min(
          surface.halfExtents.x - Math.abs(self.position.x - surface.center.x),
          surface.halfExtents.z - Math.abs(self.position.z - surface.center.z),
        ) - characterRadius;
        const target = clearance < resolved.edgeRecoveryClearance
          ? surface.center
          : opponent.position;
        const dx = target.x - self.position.x;
        const dz = target.z - self.position.z;
        const distance = Math.hypot(dx, dz);
        moveX = distance > 1e-6 ? dx / distance * resolved.movementMagnitude : 0;
        moveZ = distance > 1e-6 ? dz / distance * resolved.movementMagnitude : 0;
        if (
          self.action.phase === 'idle'
          && self.hitstunTicks === 0
          && opponent.status === 'active'
          && opponent.invulnerableTicks === 0
        ) {
          const opponentDistance = Math.hypot(
            opponent.position.x - self.position.x,
            opponent.position.z - self.position.z,
          );
          const directionX = opponentDistance > 1e-6
            ? (opponent.position.x - self.position.x) / opponentDistance
            : self.facing.x;
          const directionZ = opponentDistance > 1e-6
            ? (opponent.position.z - self.position.z) / opponentDistance
            : self.facing.z;
          const facingDot = directionX * self.facing.x + directionZ * self.facing.z;
          primaryPressed = opponentDistance <= config.basePush.range * resolved.attackRangeScale
            && facingDot >= config.basePush.minimumFacingDot;
        }
      }
      return normalizeInputFrame({
        tick: snapshot.tick,
        participantId,
        moveX,
        moveZ,
        primaryPressed,
        primaryHeld: primaryPressed,
        jumpPressed: false,
        jumpHeld: false,
        slamPressed: false,
      }, {
        expectedTick: snapshot.tick,
        participantIds: [participantId],
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      history.length = 0;
    },
  });
}
