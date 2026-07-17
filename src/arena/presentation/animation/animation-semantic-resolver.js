import {
  ARENA_ANIMATION_ACTION_CATEGORY,
  ARENA_ANIMATION_SEMANTIC,
} from './animation-semantics.js';

const ACTION_STARTED = 'ActionStarted';
const ACTIVE_STATUS = 'active';
const RESPAWNING_STATUS = 'respawning';
const ENDED_PHASE = 'ended';
const MOVEMENT_MODE = Object.freeze({
  CROUCH_CHARGING: 'crouch-charging',
  DOWN_SMASH: 'down-smash',
});
const ACTION_PHASE = Object.freeze({
  ACTIVE: 'active',
  IDLE: 'idle',
  RECOVERY: 'recovery',
  WINDUP: 'windup',
});

const MOVEMENT_ACTION_SEMANTIC = Object.freeze({
  'air-jump': ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP,
  'crouch-charge': ARENA_ANIMATION_SEMANTIC.CROUCH_CHARGE,
  'crouch-jump': ARENA_ANIMATION_SEMANTIC.CROUCH_JUMP,
  'down-smash': ARENA_ANIMATION_SEMANTIC.DOWN_SMASH,
  jump: ARENA_ANIMATION_SEMANTIC.JUMP,
});

function integerAtLeast(value, minimum, name) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

function finiteSpeed(participant) {
  const velocity = participant?.velocity;
  if (
    !velocity
    || !Number.isFinite(velocity.x)
    || !Number.isFinite(velocity.y)
    || !Number.isFinite(velocity.z)
  ) throw new TypeError('AnimationSemanticResolver participant.velocity 必须是有限向量。');
  return {
    horizontal: Math.hypot(velocity.x, velocity.z),
    total: Math.hypot(velocity.x, velocity.y, velocity.z),
  };
}

function activeMovementSemantic(frame, participantId, actionPresentations) {
  let selected = null;
  for (const event of frame.events) {
    if (event?.type !== ACTION_STARTED || event.participantId !== participantId) continue;
    const action = actionPresentations[event.action];
    if (!action) throw new RangeError(`缺少 action presentation ${String(event.action)}。`);
    const semantic = MOVEMENT_ACTION_SEMANTIC[action.semantic];
    if (semantic) selected = semantic;
  }
  return selected;
}

function resolveOverlay(participant) {
  const action = participant.action;
  if (!action || action.phase === ACTION_PHASE.IDLE || action.definitionId === null) return null;
  if (action.phase === ACTION_PHASE.RECOVERY) return null;
  if (action.phase === ACTION_PHASE.WINDUP) return ARENA_ANIMATION_SEMANTIC.ATTACK_WINDUP;
  if (action.phase !== ACTION_PHASE.ACTIVE) {
    throw new RangeError(`未知 presentation action phase ${String(action.phase)}。`);
  }
  if (!Object.values(ARENA_ANIMATION_ACTION_CATEGORY).includes(action.animationCategory)) {
    throw new RangeError(`未知 animation action category ${String(action.animationCategory)}。`);
  }
  if (action.animationCategory === ARENA_ANIMATION_ACTION_CATEGORY.DEFEND) {
    return ARENA_ANIMATION_SEMANTIC.DEFEND;
  }
  if (action.animationCategory === ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT) {
    return ARENA_ANIMATION_SEMANTIC.EQUIPMENT;
  }
  if (action.animationCategory === ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT) return null;
  return ARENA_ANIMATION_SEMANTIC.ATTACK_ACTIVE;
}

export class AnimationSemanticResolver {
  #participantId;
  #definition;
  #actionPresentations;
  #lastMatchSeed;
  #lastTick;
  #lastGrounded;
  #airborneSemantic;
  #baseSemantic;
  #overlaySemantic;
  #baseEnteredAtTick;
  #overlayEnteredAtTick;
  #lastResolution;
  #destroyed;

  constructor({ participantId, presentationDefinition, actionPresentations }) {
    if (typeof participantId !== 'string' || participantId.length === 0) {
      throw new TypeError('AnimationSemanticResolver.participantId 必须是非空字符串。');
    }
    if (!presentationDefinition?.locomotion || !presentationDefinition?.animationMap) {
      throw new TypeError('AnimationSemanticResolver 需要 CharacterPresentationDefinition。');
    }
    if (!actionPresentations || typeof actionPresentations !== 'object') {
      throw new TypeError('AnimationSemanticResolver.actionPresentations 必须是对象。');
    }
    this.#participantId = participantId;
    this.#definition = presentationDefinition;
    this.#actionPresentations = actionPresentations;
    this.#destroyed = false;
    this.#reset();
  }

  #reset() {
    this.#lastMatchSeed = null;
    this.#lastTick = -1;
    this.#lastGrounded = null;
    this.#airborneSemantic = ARENA_ANIMATION_SEMANTIC.JUMP;
    this.#baseSemantic = null;
    this.#overlaySemantic = null;
    this.#baseEnteredAtTick = -1;
    this.#overlayEnteredAtTick = -1;
    this.#lastResolution = null;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('AnimationSemanticResolver 已销毁。');
  }

  #base(frame, participant, movementSemantic, speed) {
    const result = frame.hud?.result;
    if (frame.phase === ENDED_PHASE && result) {
      if (result.isDraw) return ARENA_ANIMATION_SEMANTIC.DRAW;
      return result.winnerId === participant.id
        ? ARENA_ANIMATION_SEMANTIC.WIN
        : ARENA_ANIMATION_SEMANTIC.LOSE;
    }
    if (participant.status !== ACTIVE_STATUS) {
      if (participant.status !== RESPAWNING_STATUS && participant.status !== 'eliminated') {
        throw new RangeError(`未知 participant status ${String(participant.status)}。`);
      }
      return ARENA_ANIMATION_SEMANTIC.ELIMINATED;
    }
    if (participant.hitstunTicks > 0) {
      return speed.total >= this.#definition.locomotion.knockbackSpeedThreshold
        ? ARENA_ANIMATION_SEMANTIC.KNOCKBACK
        : ARENA_ANIMATION_SEMANTIC.HITSTUN;
    }
    if (participant.movement?.mode === MOVEMENT_MODE.DOWN_SMASH) {
      return ARENA_ANIMATION_SEMANTIC.DOWN_SMASH;
    }
    if (participant.movement?.mode === MOVEMENT_MODE.CROUCH_CHARGING) {
      return ARENA_ANIMATION_SEMANTIC.CROUCH_CHARGE;
    }
    if (movementSemantic) {
      if (
        movementSemantic === ARENA_ANIMATION_SEMANTIC.JUMP
        || movementSemantic === ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP
        || movementSemantic === ARENA_ANIMATION_SEMANTIC.CROUCH_JUMP
      ) this.#airborneSemantic = movementSemantic;
      return movementSemantic;
    }
    if (!participant.grounded) return this.#airborneSemantic;
    if (this.#lastGrounded === false) return ARENA_ANIMATION_SEMANTIC.LAND;
    if (speed.horizontal >= this.#definition.locomotion.runSpeedThreshold) {
      return ARENA_ANIMATION_SEMANTIC.RUN;
    }
    if (speed.horizontal >= this.#definition.locomotion.walkSpeedThreshold) {
      return ARENA_ANIMATION_SEMANTIC.WALK;
    }
    return ARENA_ANIMATION_SEMANTIC.IDLE;
  }

  resolve(frame, participant) {
    this.#assertUsable();
    if (!frame?.source || !Array.isArray(frame.events)) {
      throw new TypeError('AnimationSemanticResolver 需要 presentation frame。');
    }
    if (!participant || participant.id !== this.#participantId) {
      throw new RangeError('AnimationSemanticResolver participant 身份不一致。');
    }
    const matchSeed = integerAtLeast(frame.source.matchSeed, 0, 'frame.source.matchSeed');
    const tick = integerAtLeast(frame.source.tick, 0, 'frame.source.tick');
    if (matchSeed > 0xffffffff) throw new RangeError('frame.source.matchSeed 必须是 uint32。');
    if (this.#lastMatchSeed !== null && (
      matchSeed !== this.#lastMatchSeed || tick < this.#lastTick
    )) this.#reset();
    if (matchSeed === this.#lastMatchSeed && tick === this.#lastTick) {
      return this.#lastResolution;
    }
    const speed = finiteSpeed(participant);
    const movementSemantic = activeMovementSemantic(
      frame,
      participant.id,
      this.#actionPresentations,
    );
    const baseSemantic = this.#base(frame, participant, movementSemantic, speed);
    const overlaySemantic = (
      participant.status === ACTIVE_STATUS && participant.hitstunTicks === 0
    ) ? resolveOverlay(participant) : null;
    if (baseSemantic !== this.#baseSemantic) this.#baseEnteredAtTick = tick;
    if (overlaySemantic !== this.#overlaySemantic) this.#overlayEnteredAtTick = tick;
    const resolution = Object.freeze({
      participantId: participant.id,
      matchSeed,
      tick,
      baseSemantic,
      baseEnteredAtTick: this.#baseEnteredAtTick,
      overlaySemantic,
      overlayEnteredAtTick: overlaySemantic === null ? null : this.#overlayEnteredAtTick,
    });
    this.#lastMatchSeed = matchSeed;
    this.#lastTick = tick;
    this.#lastGrounded = participant.grounded;
    if (participant.grounded) this.#airborneSemantic = ARENA_ANIMATION_SEMANTIC.JUMP;
    this.#baseSemantic = baseSemantic;
    this.#overlaySemantic = overlaySemantic;
    this.#lastResolution = resolution;
    return resolution;
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#reset();
  }
}
