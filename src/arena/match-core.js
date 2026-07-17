import {
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  createArenaMatchConfig,
} from './config.js';
import { normalizeInputFrames } from './input-frame.js';
import { createLightweightPhysicsWorld } from './physics/lightweight-physics.js';
import { assertPhysicsWorld } from './physics/physics-adapter.js';
import { assertArenaRuleEngine } from './rules/arena-rule-engine.js';
import { createArenaConfigHash, createMatchStateHash } from './state-hash.js';
import { createRng, deriveSeed } from '../shared/deterministic-rng.js';
import { combineCleanupFailure, normalizeThrownError } from './lifecycle-error.js';

const EVENT = Object.freeze({
  MATCH_STARTED: 'MatchStarted',
  EQUIPMENT_SPAWNED: 'EquipmentSpawned',
  EQUIPMENT_PICKED_UP: 'EquipmentPickedUp',
  EQUIPMENT_DROPPED: 'EquipmentDropped',
  EQUIPMENT_DROP_FALLBACK: 'EquipmentDropFallback',
  ACTION_STARTED: 'ActionStarted',
  HIT_RESOLVED: 'HitResolved',
  KNOCKBACK_APPLIED: 'KnockbackApplied',
  PLAYER_ELIMINATED: 'PlayerEliminated',
  PLAYER_RESPAWNED: 'PlayerRespawned',
  SUDDEN_DEATH_STARTED: 'SuddenDeathStarted',
  MATCH_ENDED: 'MatchEnded',
});

// Equipment positions share the character-body coordinate convention so a
// dropped item and a configured spawn can use the same validation path. The
// tolerance covers the physics world's small ground-probe/snap offset without
// accepting unreachable items floating above or buried below a surface.
const EQUIPMENT_SURFACE_HEIGHT_TOLERANCE = 0.1;

function normalizeSeed(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('match seed 必须是 uint32 整数。');
  }
  return seed;
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
  };
}

function cloneResult(result) {
  return result ? { ...result } : null;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Authoritative, renderer-free 1v1 arena simulation. All time is integer ticks;
 * callers may sample snapshots at any render rate without changing outcomes.
 */
export class MatchCore {
  #matchSeed;
  #config;
  #configHash;
  #ruleContentHash;
  #physics;
  #rules;
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
  #stepping;

  #cleanupConstructionFailure(error) {
    const cleanupErrors = [];
    try {
      this.#physics?.destroy();
      this.#physics = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore physics 构造清理失败'));
    }
    try {
      this.#rules?.destroy();
      this.#rules = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore rules 构造清理失败'));
    }
    this.#destroyed = true;
    return combineCleanupFailure(
      normalizeThrownError(error, 'MatchCore 构造失败'),
      cleanupErrors,
      'MatchCore 构造失败且清理未完整完成。',
    );
  }

  constructor({
    seed = 1,
    config = {},
    physicsFactory = createLightweightPhysicsWorld,
    ruleEngineFactory,
  } = {}) {
    if (typeof physicsFactory !== 'function') throw new TypeError('physicsFactory 必须是函数。');
    if (typeof ruleEngineFactory !== 'function') {
      throw new TypeError('MatchCore 需要显式 ruleEngineFactory。');
    }
    this.#matchSeed = normalizeSeed(seed);
    this.#config = createArenaMatchConfig(config);
    this.#configHash = createArenaConfigHash(this.#config);
    this.#ruleContentHash = null;
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
    this.#stepping = false;
    this.#rngStreams = Object.fromEntries(
      ['spawn', 'map', 'equipment', 'bot', 'presentation'].map((name) => [
        name,
        createRng(deriveSeed(this.matchSeed, name)),
      ]),
    );
    this.#participants = new Map();
    this.#physics = null;
    this.#rules = null;
    try {
      this.#rules = assertArenaRuleEngine(ruleEngineFactory({
        participantIds: this.config.participantIds,
        config: this.config,
      }));
      this.#ruleContentHash = this.#rules.getContentHash();
      if (typeof this.#ruleContentHash !== 'string' || !/^[0-9a-f]{8}$/.test(this.#ruleContentHash)) {
        throw new TypeError('ruleEngine content hash 必须是 8 位十六进制字符串。');
      }
      this.#physics = assertPhysicsWorld(physicsFactory({ arena: this.config.arena }));
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
      for (const spawn of this.config.equipment.initialSpawns) {
        if (!this.#isEquipmentPositionValid(spawn.position)) {
          throw new RangeError(`equipment spawn ${spawn.id} 不在合法竞技场表面。`);
        }
        this.#rules.spawnEquipment({
          instanceId: `initial:${spawn.id}`,
          definitionId: spawn.definitionId,
          spawnId: spawn.id,
          position: spawn.position,
        });
      }
    } catch (error) {
      this.#participants.clear();
      throw this.#cleanupConstructionFailure(error);
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

  get ruleContentHash() {
    return this.#ruleContentHash;
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
    for (const equipment of this.#rules.listEquipmentSnapshots()) {
      this.#emit(EVENT.EQUIPMENT_SPAWNED, {
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
        spawnId: equipment.spawnId,
        position: equipment.position ? { ...equipment.position } : null,
      });
    }
  }

  step(inputFrames = []) {
    this.#assertUsable();
    if (this.#phase === ARENA_MATCH_PHASE.ENDED) throw new Error('比赛已经结束，不能继续 step。');
    if (this.#stepping) throw new Error('MatchCore.step() 不可重入。');
    this.#stepping = true;
    try {
      const frames = normalizeInputFrames(inputFrames, {
        tick: this.#tick,
        participantIds: this.config.participantIds,
      });
      this.#events = [];
      try {
        return this.#stepNormalized(frames);
      } catch (error) {
        const failure = normalizeThrownError(error, 'MatchCore tick 失败');
        // Internal fail-closed cleanup is allowed after the authoritative
        // mutation phase unwinds; external destroy() remains blocked while a
        // caller-owned input is being validated.
        this.#stepping = false;
        try {
          this.destroy();
        } catch (cleanupError) {
          const cleanupErrors = Array.isArray(cleanupError?.causes)
            ? cleanupError.causes.map((cause) => normalizeThrownError(
              cause,
              'MatchCore tick 清理失败',
            ))
            : [normalizeThrownError(cleanupError, 'MatchCore tick 清理失败')];
          throw combineCleanupFailure(
            failure,
            cleanupErrors,
            'MatchCore tick 失败且清理未完整完成。',
          );
        }
        throw failure;
      }
    } finally {
      this.#stepping = false;
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
    this.#rules.advanceTimers();
    this.#updateEquipmentState();
    const frameById = new Map(frames.map((frame) => [frame.participantId, frame]));
    const startedActions = this.#rules.resolveActions({
      tick: this.#tick,
      actors: this.#createRuleActors(),
      inputFrames: frames,
    });
    this.#commitRuleBatch(startedActions);
    const activeActions = this.#rules.resolveActiveActions({ actors: this.#createRuleActors() });
    this.#commitRuleBatch(activeActions);
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
    }
  }

  #createRuleActors() {
    return this.config.participantIds.map((id) => {
      const participant = this.#participants.get(id);
      const physics = this.#physics.getCharacterState(id);
      return {
        id,
        canAct: participant.status === ARENA_PARTICIPANT_STATUS.ACTIVE
          && participant.hitstunTicks === 0,
        targetable: participant.status === ARENA_PARTICIPANT_STATUS.ACTIVE
          && participant.invulnerableTicks === 0,
        position: { ...physics.position },
        facing: { ...physics.facing },
      };
    });
  }

  #isEquipmentPositionValid(position) {
    if (
      !position
      || !Number.isFinite(position.x)
      || !Number.isFinite(position.y)
      || !Number.isFinite(position.z)
      || position.y <= this.config.arena.killY
    ) return false;
    return this.config.arena.surfaces.some((surface) => (
      Math.abs(position.x - surface.center.x) <= surface.halfExtents.x
      && Math.abs(position.z - surface.center.z) <= surface.halfExtents.z
      && Math.abs(
        position.y
          - (
            surface.center.y
            + surface.halfExtents.y
            + this.config.character.radius
            + this.config.character.halfHeight
          )
      ) <= EQUIPMENT_SURFACE_HEIGHT_TOLERANCE
    ));
  }

  #updateEquipmentState() {
    const participants = this.config.participantIds.map((id) => {
      const participant = this.#participants.get(id);
      const physics = this.#physics.getCharacterState(id);
      if (
        participant.status === ARENA_PARTICIPANT_STATUS.ACTIVE
        && physics.grounded
        && physics.supportSurfaceId
        && this.#rules.getHeldEquipment(id)
      ) this.#rules.updateEquipmentLastSafePosition(id, physics.position);
      return {
        id,
        position: { ...physics.position },
        eligible: participant.status === ARENA_PARTICIPANT_STATUS.ACTIVE,
      };
    });
    const pickups = this.#rules.resolveEquipmentPickups({
      participants,
      contestSeed: deriveSeed(this.matchSeed, `equipment-pickup:${this.#tick}`),
    });
    for (const pickup of pickups) {
      const equipment = this.#rules.getEquipmentSnapshot(pickup.equipmentInstanceId);
      const participant = participants.find(({ id }) => id === pickup.participantId);
      const physics = this.#physics.getCharacterState(pickup.participantId);
      if (physics.grounded && physics.supportSurfaceId) {
        this.#rules.updateEquipmentLastSafePosition(pickup.participantId, participant.position);
      }
      this.#emit(EVENT.EQUIPMENT_PICKED_UP, {
        participantId: pickup.participantId,
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
      });
    }
  }

  #commitRuleBatch(batch) {
    this.#rules.commit(batch, {
      recordHit: (attackerId, targetId) => {
        const target = this.#participants.get(targetId);
        target.lastHitBy = attackerId;
        target.lastHitTick = this.#tick;
      },
      applyHitstun: (participantId, ticks) => {
        const participant = this.#participants.get(participantId);
        participant.hitstunTicks = Math.max(participant.hitstunTicks, ticks);
      },
      applyImpulse: (participantId, impulse) => {
        this.#physics.applyImpulse(participantId, impulse);
      },
    });
    for (const event of batch.events) {
      const { type, ...payload } = event;
      this.#emit(type, payload);
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
      const dropped = this.#rules.dropEquipment(participant.id, {
        isPositionValid: (position) => this.#isEquipmentPositionValid(position),
      });
      if (dropped) {
        this.#emit(EVENT.EQUIPMENT_DROPPED, {
          participantId: participant.id,
          equipmentInstanceId: dropped.equipment.instanceId,
          equipmentDefinitionId: dropped.equipment.definitionId,
          position: { ...dropped.equipment.position },
        });
        if (dropped.fallbackUsed) {
          this.#emit(EVENT.EQUIPMENT_DROP_FALLBACK, {
            participantId: participant.id,
            equipmentInstanceId: dropped.equipment.instanceId,
            diagnosticCode: dropped.diagnosticCode,
          });
        }
      }
      const terminal = this.#phase === ARENA_MATCH_PHASE.SUDDEN_DEATH || participant.lives === 0;
      participant.status = terminal
        ? ARENA_PARTICIPANT_STATUS.ELIMINATED
        : ARENA_PARTICIPANT_STATUS.RESPAWNING;
      participant.respawnTicks = terminal ? 0 : this.config.respawnTicks;
      participant.hitstunTicks = 0;
      participant.invulnerableTicks = 0;
      this.#rules.resetParticipant(participant.id);
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
    this.#rules.resetParticipant(participant.id);
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
      .sort((a, b) => (
        b.lives - a.lives
        || b.eliminations - a.eliminations
        || compareText(a.id, b.id)
      ));
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
      ruleContentHash: this.ruleContentHash,
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
          action: (() => {
            const action = this.#rules.getActionSnapshot(id);
            return {
              definitionId: action.definitionId,
              phase: action.phase,
              ticksRemaining: action.ticksRemaining,
            };
          })(),
          actionRule: this.#rules.getParticipantActionRule(id),
          equipment: (() => {
            const equipment = this.#rules.getHeldEquipment(id);
            return equipment ? {
              instanceId: equipment.instanceId,
              definitionId: equipment.definitionId,
              cooldownRemainingTicks: equipment.cooldownRemainingTicks,
            } : null;
          })(),
          position: { ...physics.position },
          velocity: { ...physics.velocity },
          facing: { ...physics.facing },
          grounded: physics.grounded,
          supportSurfaceId: physics.supportSurfaceId,
        };
      }),
      equipment: this.#rules.listEquipmentSnapshots().map((equipment) => ({
        schemaVersion: equipment.schemaVersion,
        instanceId: equipment.instanceId,
        definitionId: equipment.definitionId,
        spawnId: equipment.spawnId,
        locationState: equipment.locationState,
        ownerId: equipment.ownerId,
        position: equipment.position ? { ...equipment.position } : null,
        lastSafePosition: equipment.lastSafePosition
          ? { ...equipment.lastSafePosition }
          : null,
        cooldownRemainingTicks: equipment.cooldownRemainingTicks,
        revision: equipment.revision,
      })),
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
      ruleContentHash: this.ruleContentHash,
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
        equipment: {
          initialSpawns: this.config.equipment.initialSpawns.map((spawn) => ({
            id: spawn.id,
            definitionId: spawn.definitionId,
            position: { ...spawn.position },
          })),
        },
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
    if (this.#destroyed && !this.#rules && !this.#physics) return;
    if (this.#stepping) throw new Error('step() 期间不能销毁 MatchCore。');
    this.#destroyed = true;
    this.#events.length = 0;
    this.#participants.clear();
    const errors = [];
    if (this.#rules) {
      try {
        this.#rules.destroy();
        this.#rules = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore rules 清理失败'));
      }
    }
    if (this.#physics) {
      try {
        this.#physics.destroy();
        this.#physics = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore physics 清理失败'));
      }
    }
    if (errors.length > 0) {
      const cleanupError = new Error('MatchCore 清理未完整完成。');
      cleanupError.causes = errors;
      throw cleanupError;
    }
  }
}

export { EVENT as ARENA_MATCH_EVENT };
