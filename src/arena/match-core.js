import {
  ARENA_ACTION_PHASE,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  createArenaMatchConfig,
} from './config.js';
import { normalizeInputFrames } from './input-frame.js';
import { createLightweightPhysicsWorld } from './physics/lightweight-physics.js';
import { assertPhysicsWorld } from './physics/physics-adapter.js';
import { createArenaConfigHash, createMatchStateHash } from './state-hash.js';
import { createRng, deriveSeed } from '../shared/deterministic-rng.js';

const EVENT = Object.freeze({
  MATCH_STARTED: 'MatchStarted',
  ACTION_STARTED: 'ActionStarted',
  HIT_RESOLVED: 'HitResolved',
  KNOCKBACK_APPLIED: 'KnockbackApplied',
  PLAYER_ELIMINATED: 'PlayerEliminated',
  PLAYER_RESPAWNED: 'PlayerRespawned',
  SUDDEN_DEATH_STARTED: 'SuddenDeathStarted',
  MATCH_ENDED: 'MatchEnded',
});

function normalizeSeed(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('match seed 必须是 uint32 整数。');
  }
  return seed;
}

function resetAction(action) {
  action.phase = ARENA_ACTION_PHASE.IDLE;
  action.ticksRemaining = 0;
  action.hitTargets.clear();
}

function createParticipant(id, lives, spawnIndex) {
  return {
    id,
    lives,
    spawnIndex,
    status: ARENA_PARTICIPANT_STATUS.ACTIVE,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: {
      phase: ARENA_ACTION_PHASE.IDLE,
      ticksRemaining: 0,
      hitTargets: new Set(),
    },
  };
}

function cloneResult(result) {
  return result ? { ...result } : null;
}

/**
 * Authoritative, renderer-free 1v1 arena simulation. All time is integer ticks;
 * callers may sample snapshots at any render rate without changing outcomes.
 */
export class MatchCore {
  #matchSeed;
  #config;
  #configHash;
  #physics;
  #participants;
  #rngStreams;
  #events;
  #started;
  #destroyed;
  #tick;
  #activeTick;
  #phase;
  #result;
  #eventSequence;

  constructor({ seed = 1, config = {}, physicsFactory = createLightweightPhysicsWorld } = {}) {
    if (typeof physicsFactory !== 'function') throw new TypeError('physicsFactory 必须是函数。');
    this.#matchSeed = normalizeSeed(seed);
    this.#config = createArenaMatchConfig(config);
    this.#configHash = createArenaConfigHash(this.#config);
    this.#tick = 0;
    this.#activeTick = 0;
    this.#phase = this.config.preparingTicks > 0
      ? ARENA_MATCH_PHASE.PREPARING
      : ARENA_MATCH_PHASE.RUNNING;
    this.#result = null;
    this.#eventSequence = 0;
    this.#events = [];
    this.#started = false;
    this.#destroyed = false;
    this.#rngStreams = Object.fromEntries(
      ['spawn', 'map', 'equipment', 'bot', 'presentation'].map((name) => [
        name,
        createRng(deriveSeed(this.matchSeed, name)),
      ]),
    );
    this.#physics = assertPhysicsWorld(physicsFactory({ arena: this.config.arena }));
    this.#participants = new Map();
    try {
      for (let index = 0; index < this.config.participantIds.length; index += 1) {
        const id = this.config.participantIds[index];
        const participant = createParticipant(id, this.config.livesPerParticipant, index);
        this.#participants.set(id, participant);
        this.#physics.addCharacter({
          id,
          position: this.config.arena.spawns[index],
          ...this.config.character,
        });
        this.#physics.resetCharacter(id, {
          position: this.config.arena.spawns[index],
          velocity: { x: 0, y: 0, z: 0 },
          facing: { x: index === 0 ? 1 : -1, z: 0 },
        });
      }
    } catch (error) {
      this.#participants.clear();
      this.#physics.destroy();
      this.#destroyed = true;
      throw error;
    }
  }

  get tick() {
    return this.#tick;
  }

  get matchSeed() {
    return this.#matchSeed;
  }

  get config() {
    return this.#config;
  }

  get configHash() {
    return this.#configHash;
  }

  get activeTick() {
    return this.#activeTick;
  }

  get phase() {
    return this.#phase;
  }

  get result() {
    return cloneResult(this.#result);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('MatchCore 已销毁。');
  }

  #emit(type, payload = {}) {
    const event = {
      id: `${this.matchSeed.toString(16)}:${this.#tick}:${this.#eventSequence}`,
      sequence: this.#eventSequence,
      tick: this.#tick,
      type,
      ...payload,
    };
    this.#eventSequence += 1;
    this.#events.push(event);
    return event;
  }

  #startRunningIfNeeded() {
    if (this.#started || this.#phase !== ARENA_MATCH_PHASE.RUNNING) return;
    this.#started = true;
    this.#emit(EVENT.MATCH_STARTED, { participantIds: [...this.config.participantIds] });
  }

  step(inputFrames = []) {
    this.#assertUsable();
    if (this.#phase === ARENA_MATCH_PHASE.ENDED) throw new Error('比赛已经结束，不能继续 step。');
    const frames = normalizeInputFrames(inputFrames, {
      tick: this.#tick,
      participantIds: this.config.participantIds,
    });
    this.#events = [];
    try {
      return this.#stepNormalized(frames);
    } catch (error) {
      try {
        this.destroy();
      } catch (cleanupError) {
        const combinedError = new Error('MatchCore tick 失败且清理未完整完成。');
        combinedError.originalError = error;
        combinedError.cleanupError = cleanupError;
        throw combinedError;
      }
      throw error;
    }
  }

  #stepNormalized(frames) {
    if (this.#phase === ARENA_MATCH_PHASE.PREPARING) {
      for (const id of this.config.participantIds) this.#physics.setMovementIntent(id, 0, 0);
      this.#physics.step(this.config.fixedDeltaSeconds);
      if (this.#tick + 1 >= this.config.preparingTicks) {
        this.#phase = ARENA_MATCH_PHASE.RUNNING;
        this.#startRunningIfNeeded();
      }
      this.#tick += 1;
      return this.#events.map((event) => ({ ...event }));
    }

    this.#startRunningIfNeeded();
    this.#advanceParticipantTimers();
    const frameById = new Map(frames.map((frame) => [frame.participantId, frame]));
    this.#startRequestedActions(frameById);
    this.#resolveActiveActions();
    this.#applyMovementIntents(frameById);
    this.#physics.step(this.config.fixedDeltaSeconds);
    this.#resolveEliminations();

    if (this.#phase !== ARENA_MATCH_PHASE.ENDED) {
      this.#activeTick += 1;
      if (
        this.#phase === ARENA_MATCH_PHASE.RUNNING
        && this.#activeTick >= this.config.suddenDeathStartTick
      ) this.#startSuddenDeath();
      if (this.#activeTick >= this.config.hardLimitTicks) this.#resolveTimeout();
    }
    this.#tick += 1;
    return this.#events.map((event) => ({ ...event }));
  }

  #advanceParticipantTimers() {
    for (const id of this.config.participantIds) {
      const participant = this.#participants.get(id);
      if (participant.status === ARENA_PARTICIPANT_STATUS.RESPAWNING) {
        participant.respawnTicks -= 1;
        if (participant.respawnTicks <= 0) this.#respawnParticipant(participant);
        continue;
      }
      if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) continue;
      if (participant.hitstunTicks > 0) participant.hitstunTicks -= 1;
      if (participant.invulnerableTicks > 0) participant.invulnerableTicks -= 1;
      this.#advanceAction(participant);
    }
  }

  #advanceAction(participant) {
    const action = participant.action;
    if (action.phase === ARENA_ACTION_PHASE.IDLE) return;
    action.ticksRemaining -= 1;
    if (action.ticksRemaining > 0) return;
    const rule = this.config.basePush;
    if (action.phase === ARENA_ACTION_PHASE.WINDUP) {
      action.phase = ARENA_ACTION_PHASE.ACTIVE;
      action.ticksRemaining = rule.activeTicks;
      action.hitTargets.clear();
    } else if (action.phase === ARENA_ACTION_PHASE.ACTIVE) {
      action.phase = ARENA_ACTION_PHASE.RECOVERY;
      action.ticksRemaining = rule.recoveryTicks;
    } else {
      resetAction(action);
    }
  }

  #startRequestedActions(frameById) {
    for (const id of this.config.participantIds) {
      const participant = this.#participants.get(id);
      const frame = frameById.get(id);
      if (
        participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE
        || participant.hitstunTicks > 0
        || participant.action.phase !== ARENA_ACTION_PHASE.IDLE
        || !frame.actionPressed
      ) continue;
      participant.action.phase = ARENA_ACTION_PHASE.WINDUP;
      participant.action.ticksRemaining = this.config.basePush.windupTicks;
      participant.action.hitTargets.clear();
      this.#emit(EVENT.ACTION_STARTED, { participantId: id, action: 'base-push' });
    }
  }

  #resolveActiveActions() {
    const rule = this.config.basePush;
    const resolvedHits = [];
    for (const attackerId of this.config.participantIds) {
      const attacker = this.#participants.get(attackerId);
      if (
        attacker.status !== ARENA_PARTICIPANT_STATUS.ACTIVE
        || attacker.hitstunTicks > 0
        || attacker.action.phase !== ARENA_ACTION_PHASE.ACTIVE
      ) continue;
      const attackerState = this.#physics.getCharacterState(attackerId);
      for (const targetId of this.config.participantIds) {
        if (targetId === attackerId || attacker.action.hitTargets.has(targetId)) continue;
        const target = this.#participants.get(targetId);
        if (
          target.status !== ARENA_PARTICIPANT_STATUS.ACTIVE
          || target.invulnerableTicks > 0
        ) continue;
        const targetState = this.#physics.getCharacterState(targetId);
        const dx = targetState.position.x - attackerState.position.x;
        const dz = targetState.position.z - attackerState.position.z;
        const distance = Math.hypot(dx, dz);
        if (
          distance > rule.range
          || Math.abs(targetState.position.y - attackerState.position.y)
            > rule.maximumVerticalDifference
        ) continue;
        const directionX = distance > 1e-7 ? dx / distance : attackerState.facing.x;
        const directionZ = distance > 1e-7 ? dz / distance : attackerState.facing.z;
        const facingDot = directionX * attackerState.facing.x
          + directionZ * attackerState.facing.z;
        if (facingDot < rule.minimumFacingDot) continue;

        attacker.action.hitTargets.add(targetId);
        const impulse = {
          x: directionX * rule.horizontalImpulse,
          y: rule.verticalImpulse,
          z: directionZ * rule.horizontalImpulse,
        };
        resolvedHits.push({ attackerId, targetId, impulse });
      }
    }

    // Collect before mutating so symmetric attacks on the same tick can trade;
    // participant ID order must never grant an implicit first-hit advantage.
    for (const { attackerId, targetId, impulse } of resolvedHits) {
      const target = this.#participants.get(targetId);
      target.hitstunTicks = Math.max(target.hitstunTicks, rule.hitstunTicks);
      target.lastHitBy = attackerId;
      target.lastHitTick = this.#tick;
      resetAction(target.action);
      this.#physics.applyImpulse(targetId, impulse);
      this.#emit(EVENT.HIT_RESOLVED, {
        attackerId,
        targetId,
        action: 'base-push',
      });
      this.#emit(EVENT.KNOCKBACK_APPLIED, {
        attackerId,
        targetId,
        impulse,
      });
    }
  }

  #applyMovementIntents(frameById) {
    for (const id of this.config.participantIds) {
      const participant = this.#participants.get(id);
      const frame = frameById.get(id);
      if (
        participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE
        || participant.hitstunTicks > 0
      ) {
        this.#physics.setMovementIntent(id, 0, 0);
      } else {
        this.#physics.setMovementIntent(id, frame.moveX, frame.moveZ);
      }
    }
  }

  #resolveEliminations() {
    const eliminated = [];
    for (const id of this.config.participantIds) {
      const participant = this.#participants.get(id);
      if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) continue;
      const state = this.#physics.getCharacterState(id);
      if (state.position.y < this.config.arena.killY) eliminated.push(participant);
    }
    if (eliminated.length === 0) return;

    for (const participant of eliminated) {
      participant.lives = Math.max(0, participant.lives - 1);
      participant.deaths += 1;
      const creditedAttacker = participant.lastHitBy
        && this.#tick - participant.lastHitTick <= this.config.lastHitCreditTicks
        ? this.#participants.get(participant.lastHitBy)
        : null;
      if (creditedAttacker) creditedAttacker.eliminations += 1;
      this.#emit(EVENT.PLAYER_ELIMINATED, {
        participantId: participant.id,
        remainingLives: participant.lives,
        creditedAttackerId: creditedAttacker?.id ?? null,
      });
      const terminal = this.#phase === ARENA_MATCH_PHASE.SUDDEN_DEATH || participant.lives === 0;
      participant.status = terminal
        ? ARENA_PARTICIPANT_STATUS.ELIMINATED
        : ARENA_PARTICIPANT_STATUS.RESPAWNING;
      participant.respawnTicks = terminal ? 0 : this.config.respawnTicks;
      participant.hitstunTicks = 0;
      participant.invulnerableTicks = 0;
      resetAction(participant.action);
      this.#physics.resetCharacter(participant.id, {
        position: this.#holdingPosition(participant),
        velocity: { x: 0, y: 0, z: 0 },
      });
    }

    const terminalParticipants = this.config.participantIds
      .map((id) => this.#participants.get(id))
      .filter((participant) => participant.status === ARENA_PARTICIPANT_STATUS.ELIMINATED);
    if (terminalParticipants.length === 2) {
      this.#endMatch({ winnerId: null, reason: 'simultaneous-elimination', isDraw: true });
    } else if (terminalParticipants.length === 1) {
      const winnerId = this.config.participantIds.find(
        (id) => id !== terminalParticipants[0].id,
      );
      this.#endMatch({ winnerId, reason: 'last-participant-standing', isDraw: false });
    }
  }

  #holdingPosition(participant) {
    return {
      x: participant.spawnIndex * 4,
      y: this.config.arena.killY - 50 - participant.spawnIndex * 5,
      z: 0,
    };
  }

  #chooseRespawn(participant) {
    const opponents = this.config.participantIds
      .filter((id) => id !== participant.id)
      .map((id) => this.#participants.get(id))
      .filter((value) => value.status === ARENA_PARTICIPANT_STATUS.ACTIVE)
      .map((value) => this.#physics.getCharacterState(value.id));
    if (opponents.length === 0) return this.config.arena.spawns[participant.spawnIndex];
    return this.config.arena.spawns
      .map((spawn, index) => ({
        spawn,
        index,
        nearestOpponentDistance: Math.min(...opponents.map((opponent) => Math.hypot(
          spawn.x - opponent.position.x,
          spawn.z - opponent.position.z,
        ))),
      }))
      .sort((a, b) => (
        b.nearestOpponentDistance - a.nearestOpponentDistance || a.index - b.index
      ))[0].spawn;
  }

  #respawnParticipant(participant) {
    const spawn = this.#chooseRespawn(participant);
    participant.status = ARENA_PARTICIPANT_STATUS.ACTIVE;
    participant.respawnTicks = 0;
    participant.hitstunTicks = 0;
    participant.invulnerableTicks = this.config.invulnerableTicks;
    participant.lastHitBy = null;
    participant.lastHitTick = -1;
    resetAction(participant.action);
    this.#physics.resetCharacter(participant.id, {
      position: spawn,
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: spawn.x <= 0 ? 1 : -1, z: 0 },
    });
    this.#emit(EVENT.PLAYER_RESPAWNED, {
      participantId: participant.id,
      position: { ...spawn },
      invulnerableTicks: participant.invulnerableTicks,
    });
  }

  #startSuddenDeath() {
    if (this.#phase !== ARENA_MATCH_PHASE.RUNNING) return;
    this.#phase = ARENA_MATCH_PHASE.SUDDEN_DEATH;
    for (const id of this.config.participantIds) {
      const participant = this.#participants.get(id);
      if (participant.status === ARENA_PARTICIPANT_STATUS.RESPAWNING) {
        this.#respawnParticipant(participant);
      }
    }
    this.#emit(EVENT.SUDDEN_DEATH_STARTED, {
      remainingTicks: Math.max(0, this.config.hardLimitTicks - this.#activeTick),
    });
  }

  #resolveTimeout() {
    if (this.#phase === ARENA_MATCH_PHASE.ENDED) return;
    const ranked = this.config.participantIds
      .map((id) => this.#participants.get(id))
      .sort((a, b) => b.lives - a.lives || b.eliminations - a.eliminations || a.id.localeCompare(b.id));
    const tied = ranked[0].lives === ranked[1].lives
      && ranked[0].eliminations === ranked[1].eliminations;
    this.#endMatch({
      winnerId: tied ? null : ranked[0].id,
      reason: tied ? 'timeout-draw' : 'timeout-score',
      isDraw: tied,
    });
  }

  #endMatch({ winnerId, reason, isDraw }) {
    if (this.#phase === ARENA_MATCH_PHASE.ENDED) return;
    for (const id of this.config.participantIds) {
      const participant = this.#participants.get(id);
      if (participant.status === ARENA_PARTICIPANT_STATUS.RESPAWNING) {
        this.#respawnParticipant(participant);
      }
    }
    this.#phase = ARENA_MATCH_PHASE.ENDED;
    this.#result = {
      winnerId,
      reason,
      isDraw,
      endedAtTick: this.#tick,
    };
    for (const id of this.config.participantIds) this.#physics.setMovementIntent(id, 0, 0);
    this.#emit(EVENT.MATCH_ENDED, { ...this.#result });
  }

  #createSnapshot(includeInternal) {
    this.#assertUsable();
    const snapshot = {
      schemaVersion: this.config.schemaVersion,
      physicsBackendVersion: this.config.physicsBackendVersion,
      configHash: this.configHash,
      matchSeed: this.matchSeed,
      tick: this.#tick,
      activeTick: this.#activeTick,
      phase: this.#phase,
      remainingTicks: Math.max(0, this.config.hardLimitTicks - this.#activeTick),
      eventSequence: this.#eventSequence,
      participants: this.config.participantIds.map((id) => {
        const participant = this.#participants.get(id);
        const physics = this.#physics.getCharacterState(id);
        return {
          id,
          status: participant.status,
          lives: participant.lives,
          eliminations: participant.eliminations,
          deaths: participant.deaths,
          hitstunTicks: participant.hitstunTicks,
          invulnerableTicks: participant.invulnerableTicks,
          respawnTicks: participant.respawnTicks,
          lastHitBy: participant.lastHitBy,
          lastHitTick: participant.lastHitTick,
          action: {
            phase: participant.action.phase,
            ticksRemaining: participant.action.ticksRemaining,
          },
          position: { ...physics.position },
          velocity: { ...physics.velocity },
          facing: { ...physics.facing },
          grounded: physics.grounded,
          supportSurfaceId: physics.supportSurfaceId,
        };
      }),
      result: cloneResult(this.#result),
    };
    if (includeInternal) {
      snapshot.rngStates = Object.fromEntries(
        Object.entries(this.#rngStreams).map(([name, rng]) => [name, rng.snapshot()]),
      );
    }
    return snapshot;
  }

  getSnapshot() {
    return this.#createSnapshot(false);
  }

  getStateHash() {
    return createMatchStateHash(this.#createSnapshot(true));
  }

  getReplayMetadata() {
    return {
      schemaVersion: this.config.schemaVersion,
      physicsBackendVersion: this.config.physicsBackendVersion,
      configHash: this.configHash,
      matchSeed: this.matchSeed,
      config: {
        participantIds: [...this.config.participantIds],
        livesPerParticipant: this.config.livesPerParticipant,
        preparingTicks: this.config.preparingTicks,
        suddenDeathStartTick: this.config.suddenDeathStartTick,
        hardLimitTicks: this.config.hardLimitTicks,
        respawnTicks: this.config.respawnTicks,
        invulnerableTicks: this.config.invulnerableTicks,
        lastHitCreditTicks: this.config.lastHitCreditTicks,
        basePush: { ...this.config.basePush },
        arena: {
          killY: this.config.arena.killY,
          surfaces: this.config.arena.surfaces.map((surface) => ({
            id: surface.id,
            center: { ...surface.center },
            halfExtents: { ...surface.halfExtents },
          })),
          spawns: this.config.arena.spawns.map((spawn) => ({ ...spawn })),
        },
        character: { ...this.config.character },
      },
    };
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#events.length = 0;
    this.#participants.clear();
    this.#physics.destroy();
  }
}

export { EVENT as ARENA_MATCH_EVENT };
