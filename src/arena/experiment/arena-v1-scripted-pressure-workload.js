import { ARENA_MATCH_PHASE, ARENA_PARTICIPANT_STATUS } from '../config.js';
import { createArenaV1MatchCore } from '../arena-v1-match-core.js';
import { createNeutralInputFrame, normalizeInputFrames } from '../input-frame.js';
import { HeadlessMatchRunner } from '../replay.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
} from '../rules/definition-utils.js';

export const ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_ID =
  'arena.stage9.scripted-pressure';
export const ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_VERSION = 1;

export const ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS = Object.freeze({
  cadenceTicks: Object.freeze([31, 43]),
  cadenceJitterTicks: Object.freeze([3, 5]),
  attackOffsetTicks: Object.freeze([0, 13]),
  strafePeriodTicks: 90,
  strafeMagnitude: 0.16,
  attackRangeScale: 0.98,
});

const PARAMETER_KEYS = new Set([
  'cadenceTicks',
  'cadenceJitterTicks',
  'attackOffsetTicks',
  'strafePeriodTicks',
  'strafeMagnitude',
  'attackRangeScale',
]);

function cloneIntegerPair(value, minimum, name) {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new RangeError(`${name} 必须恰好包含两个整数。`);
  }
  return Object.freeze(value.map((entry, index) => (
    assertIntegerAtLeast(entry, minimum, `${name}[${index}]`)
  )));
}

function createParameters(value) {
  const source = cloneFrozenData(value, 'scripted pressure parameters');
  assertKnownKeys(source, PARAMETER_KEYS, 'scripted pressure parameters');
  const strafeMagnitude = assertPositiveFinite(
    source.strafeMagnitude,
    'scripted pressure parameters.strafeMagnitude',
  );
  if (strafeMagnitude > 1) {
    throw new RangeError('scripted pressure parameters.strafeMagnitude 不能超过 1。');
  }
  const attackRangeScale = assertPositiveFinite(
    source.attackRangeScale,
    'scripted pressure parameters.attackRangeScale',
  );
  if (attackRangeScale > 1) {
    throw new RangeError('scripted pressure parameters.attackRangeScale 不能超过 1。');
  }
  return Object.freeze({
    cadenceTicks: cloneIntegerPair(source.cadenceTicks, 1, 'cadenceTicks'),
    cadenceJitterTicks: cloneIntegerPair(source.cadenceJitterTicks, 1, 'cadenceJitterTicks'),
    attackOffsetTicks: cloneIntegerPair(source.attackOffsetTicks, 0, 'attackOffsetTicks'),
    strafePeriodTicks: assertIntegerAtLeast(source.strafePeriodTicks, 1, 'strafePeriodTicks'),
    strafeMagnitude,
    attackRangeScale,
  });
}

class ArenaV1ScriptedPressureCase {
  #core;
  #runner;
  #parameters;
  #destroyed;

  constructor({ seed, candidate, parameters }) {
    this.#parameters = createParameters(parameters);
    this.#core = createArenaV1MatchCore({ seed, config: candidate.matchConfig });
    try {
      this.#runner = new HeadlessMatchRunner(this.#core, { checkpointInterval: 300 });
    } catch (error) {
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (cleanupError) {
        const combined = new Error('Scripted pressure case 构造失败且 Core 清理失败。');
        combined.originalError = error;
        combined.cleanupError = cleanupError;
        throw combined;
      }
      throw error;
    }
    this.#destroyed = false;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaV1ScriptedPressureCase 已销毁。');
  }

  getMetadata() {
    this.#assertUsable();
    const metadata = this.#core.getReplayMetadata();
    return Object.freeze({
      matchSeed: metadata.matchSeed,
      matchSchemaVersion: metadata.schemaVersion,
      physicsBackendVersion: metadata.physicsBackendVersion,
      configHash: metadata.configHash,
      ruleContentHash: metadata.ruleContentHash,
    });
  }

  getSnapshot() {
    this.#assertUsable();
    return this.#core.getSnapshot();
  }

  isComplete() {
    this.#assertUsable();
    return this.#core.phase === ARENA_MATCH_PHASE.ENDED;
  }

  #createFrames(snapshot) {
    const frames = snapshot.participants.map((participant, index) => {
      const neutral = createNeutralInputFrame(snapshot.tick, participant.id);
      if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return neutral;
      const opponent = snapshot.participants.find(({ id }) => id !== participant.id);
      if (!opponent || opponent.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) {
        const distanceToCenter = Math.hypot(participant.position.x, participant.position.z);
        if (distanceToCenter <= 0.25) return neutral;
        return {
          ...neutral,
          moveX: -participant.position.x / distanceToCenter,
          moveZ: -participant.position.z / distanceToCenter,
        };
      }
      const dx = opponent.position.x - participant.position.x;
      const dz = opponent.position.z - participant.position.z;
      const distance = Math.hypot(dx, dz);
      const directionX = distance > 1e-7 ? dx / distance : participant.facing.x;
      const directionZ = distance > 1e-7 ? dz / distance : participant.facing.z;
      const seedOffset = this.#core.matchSeed % this.#parameters.cadenceJitterTicks[index];
      const cadence = this.#parameters.cadenceTicks[index] + seedOffset;
      const attackOffset = this.#parameters.attackOffsetTicks[index]
        + (this.#core.matchSeed % 97) * 7;
      const strafe = (
        (Math.floor((snapshot.tick + attackOffset) / this.#parameters.strafePeriodTicks) % 2) * 2
        - 1
      ) * this.#parameters.strafeMagnitude;
      const inRange = distance <= this.#core.config.basePush.range
        * this.#parameters.attackRangeScale;
      return {
        ...neutral,
        moveX: directionX - directionZ * strafe,
        moveZ: directionZ + directionX * strafe,
        primaryPressed: inRange && (snapshot.tick + attackOffset) % cadence === 0,
        primaryHeld: inRange,
      };
    });
    return normalizeInputFrames(frames, {
      tick: snapshot.tick,
      participantIds: this.#core.config.participantIds,
    });
  }

  step() {
    this.#assertUsable();
    if (this.isComplete()) throw new Error('已完成的 scripted pressure case 不能继续 step。');
    const frames = this.#createFrames(this.#core.getSnapshot());
    const events = this.#runner.step(frames);
    return Object.freeze({
      inputFrames: frames,
      events,
      snapshot: this.#core.getSnapshot(),
    });
  }

  exportResult() {
    this.#assertUsable();
    if (!this.isComplete() || !this.#core.result) {
      throw new Error('只能导出已经结算的 scripted pressure case。');
    }
    return Object.freeze({
      finalHash: this.#core.getStateHash(),
      result: this.#core.result,
    });
  }

  destroy() {
    if (this.#destroyed && !this.#runner && !this.#core) return;
    this.#destroyed = true;
    const errors = [];
    if (this.#runner) {
      try {
        this.#runner.destroy();
        this.#runner = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#core) {
      try {
        this.#core.destroy();
        this.#core = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      const error = new Error('ArenaV1ScriptedPressureCase 清理未完整完成。');
      error.causes = errors;
      throw error;
    }
  }
}

export function createArenaV1ScriptedPressureWorkloadEntry() {
  return Object.freeze({
    id: ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_ID,
    version: ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_VERSION,
    validateParameters: createParameters,
    createCase: (options) => new ArenaV1ScriptedPressureCase(options),
  });
}
