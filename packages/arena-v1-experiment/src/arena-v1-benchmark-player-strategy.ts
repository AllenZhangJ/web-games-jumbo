import { createArenaV1CharacterRegistry } from '@number-strategy-jump/arena-v1-content';
import { createNeutralInputFrame, normalizeInputFrame } from '@number-strategy-jump/arena-contracts';
import type { ArenaInputFrame, ArenaMatchSnapshot } from '@number-strategy-jump/arena-contracts';
import type { ArenaMatchConfig } from '@number-strategy-jump/arena-match';
import {
  ARENA_V1_BENCHMARK_PLAYER_STRATEGY_VERSION,
  createArenaV1BenchmarkPlayerTuning,
} from '@number-strategy-jump/arena-balance';

export {
  ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING,
  ARENA_V1_BENCHMARK_PLAYER_STRATEGY_VERSION,
  createArenaV1BenchmarkPlayerTuning,
} from '@number-strategy-jump/arena-balance';

export interface ArenaV1BenchmarkPlayerStrategy {
  readonly version: number;
  readonly createInput: (snapshot: ArenaMatchSnapshot) => ArenaInputFrame;
  readonly destroy: () => void;
}
export interface ArenaV1BenchmarkPlayerStrategyOptions {
  readonly config: ArenaMatchConfig;
  readonly tuning: unknown;
  readonly participantId?: string;
  readonly opponentId?: string;
}

export function createArenaV1BenchmarkPlayerStrategy({
  config,
  tuning,
  participantId = 'player-1',
  opponentId = 'player-2',
}: ArenaV1BenchmarkPlayerStrategyOptions): Readonly<ArenaV1BenchmarkPlayerStrategy> {
  const resolved = createArenaV1BenchmarkPlayerTuning(tuning);
  const characterRegistry = createArenaV1CharacterRegistry();
  const characterId = config.participantCharacters.find(
    (value) => value.participantId === participantId,
  )?.definitionId;
  if (!characterId) throw new Error(`benchmark player 缺少 ${participantId} 的角色定义。`);
  const characterRadius = characterRegistry.require(characterId).collision.radius;
  const history: ArenaMatchSnapshot[] = [];
  let nextDecisionTick = 0;
  let moveX = 0;
  let moveZ = 0;
  let destroyed = false;
  return Object.freeze({
    version: ARENA_V1_BENCHMARK_PLAYER_STRATEGY_VERSION,
    createInput(snapshot: ArenaMatchSnapshot) {
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
        if (!delayed) throw new Error('benchmark player 缺少观察历史。');
        const opponent = delayed.participants.find(({ id }) => id === opponentId);
        if (!opponent) throw new Error(`benchmark player 缺少对手 ${opponentId}。`);
        const surface = config.arena.surfaces.find(
          ({ id }) => id === self.supportSurfaceId,
        ) ?? config.arena.surfaces[0];
        if (!surface) throw new Error('benchmark player 缺少可用地图表面。');
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
