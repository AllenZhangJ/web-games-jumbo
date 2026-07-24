import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createCharacterPresentationDefinition,
  type CharacterPresentationDefinition,
} from './character-presentation-definition.js';
import {
  ARENA_ANIMATION_ACTION_CATEGORY,
  ARENA_ANIMATION_SEMANTIC,
  type ArenaAnimationSemantic,
} from './animation-semantics.js';

const ACTION_STARTED = 'ActionStarted';
const ACTIVE_STATUS = 'active';
const RESPAWNING_STATUS = 'respawning';
const ELIMINATED_STATUS = 'eliminated';
const ENDED_PHASE = 'ended';
const UINT32_MAX = 0xffff_ffff;
const OPTION_KEYS = new Set(['participantId', 'presentationDefinition', 'actionPresentations']);
const ACTION_CATEGORIES: ReadonlySet<unknown> = new Set(Object.values(ARENA_ANIMATION_ACTION_CATEGORY));
const AIRBORNE_START_SEMANTICS: ReadonlySet<ArenaAnimationSemantic> = new Set([
  ARENA_ANIMATION_SEMANTIC.JUMP,
  ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP,
  ARENA_ANIMATION_SEMANTIC.CROUCH_JUMP,
]);
const MOVEMENT_ACTION_SEMANTIC: Readonly<Record<string, ArenaAnimationSemantic>> = Object.freeze({
  'air-jump': ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP,
  'crouch-charge': ARENA_ANIMATION_SEMANTIC.CROUCH_CHARGE,
  'crouch-jump': ARENA_ANIMATION_SEMANTIC.CROUCH_JUMP,
  'down-smash': ARENA_ANIMATION_SEMANTIC.DOWN_SMASH,
  jump: ARENA_ANIMATION_SEMANTIC.JUMP,
});

export interface AnimationSemanticResolution {
  readonly participantId: string;
  readonly matchSeed: number;
  readonly tick: number;
  readonly baseSemantic: ArenaAnimationSemantic;
  readonly baseEnteredAtTick: number;
  readonly overlaySemantic: ArenaAnimationSemantic | null;
  readonly overlayEnteredAtTick: number | null;
}

function ownData(value: unknown, key: string, name: string, required = true): unknown {
  const record = assertPlainRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${key} 缺失。`);
  }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function finiteNumber(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

function finiteSpeed(participant: PlainRecord): { readonly horizontal: number; readonly total: number } {
  const velocity = ownData(participant, 'velocity', 'AnimationSemanticResolver participant');
  const x = finiteNumber(ownData(velocity, 'x', 'participant.velocity'), 'participant.velocity.x');
  const y = finiteNumber(ownData(velocity, 'y', 'participant.velocity'), 'participant.velocity.y');
  const z = finiteNumber(ownData(velocity, 'z', 'participant.velocity'), 'participant.velocity.z');
  return { horizontal: Math.hypot(x, z), total: Math.hypot(x, y, z) };
}

function arrayData(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const expected = new Set(['length']);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    expected.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name} 不能包含空槽或访问器。`);
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !expected.has(key))) {
    throw new TypeError(`${name} 不能包含额外字段。`);
  }
  return result;
}

function activeMovementSemantic(
  eventsValue: unknown,
  participantId: string,
  actionPresentations: PlainRecord,
): ArenaAnimationSemantic | null {
  let selected: ArenaAnimationSemantic | null = null;
  for (const eventValue of arrayData(eventsValue, 'presentation frame.events')) {
    const event = assertPlainRecord(eventValue, 'presentation frame event');
    if (ownData(event, 'type', 'presentation frame event', false) !== ACTION_STARTED) continue;
    if (ownData(event, 'participantId', 'presentation frame event', false) !== participantId) continue;
    const actionId = assertNonEmptyString(
      ownData(event, 'action', 'presentation frame event'),
      'presentation frame event.action',
    );
    const action = actionPresentations[actionId];
    if (!action) throw new RangeError(`缺少 action presentation ${actionId}。`);
    const semantic = assertNonEmptyString(
      ownData(action, 'semantic', `actionPresentations.${actionId}`),
      `actionPresentations.${actionId}.semantic`,
    );
    selected = MOVEMENT_ACTION_SEMANTIC[semantic] ?? selected;
  }
  return selected;
}

function resolveOverlay(participant: PlainRecord): ArenaAnimationSemantic | null {
  const actionValue = ownData(participant, 'action', 'participant', false);
  if (actionValue === null || actionValue === undefined) return null;
  const action = assertPlainRecord(actionValue, 'participant.action');
  const phase = ownData(action, 'phase', 'participant.action');
  const definitionId = ownData(action, 'definitionId', 'participant.action');
  if (phase === 'idle' || definitionId === null) return null;
  if (phase === 'recovery') return null;
  if (phase === 'windup') return ARENA_ANIMATION_SEMANTIC.ATTACK_WINDUP;
  if (phase !== 'active') throw new RangeError(`未知 presentation action phase ${String(phase)}。`);
  const category = ownData(action, 'animationCategory', 'participant.action');
  if (!ACTION_CATEGORIES.has(category)) {
    throw new RangeError(`未知 animation action category ${String(category)}。`);
  }
  if (category === ARENA_ANIMATION_ACTION_CATEGORY.DEFEND) return ARENA_ANIMATION_SEMANTIC.DEFEND;
  if (category === ARENA_ANIMATION_ACTION_CATEGORY.EQUIPMENT) return ARENA_ANIMATION_SEMANTIC.EQUIPMENT;
  if (category === ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT) return null;
  return ARENA_ANIMATION_SEMANTIC.ATTACK_ACTIVE;
}

interface ResolverState {
  readonly lastMatchSeed: number | null;
  readonly lastTick: number;
  readonly lastGrounded: boolean | null;
  readonly airborneSemantic: ArenaAnimationSemantic;
  readonly baseSemantic: ArenaAnimationSemantic | null;
  readonly overlaySemantic: ArenaAnimationSemantic | null;
  readonly baseEnteredAtTick: number;
  readonly overlayEnteredAtTick: number;
  readonly lastResolution: AnimationSemanticResolution | null;
}

function initialState(): ResolverState {
  return {
    lastMatchSeed: null, lastTick: -1, lastGrounded: null,
    airborneSemantic: ARENA_ANIMATION_SEMANTIC.JUMP,
    baseSemantic: null, overlaySemantic: null,
    baseEnteredAtTick: -1, overlayEnteredAtTick: -1, lastResolution: null,
  };
}

export class AnimationSemanticResolver {
  readonly #participantId: string;
  readonly #definition: CharacterPresentationDefinition;
  readonly #actionPresentations: PlainRecord;
  #state: ResolverState = initialState();
  #destroyed = false;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'AnimationSemanticResolver options');
    this.#participantId = assertNonEmptyString(options.participantId, 'AnimationSemanticResolver.participantId');
    this.#definition = createCharacterPresentationDefinition(options.presentationDefinition);
    const actions = cloneFrozenData(options.actionPresentations, 'AnimationSemanticResolver.actionPresentations');
    this.#actionPresentations = assertPlainRecord(actions, 'AnimationSemanticResolver.actionPresentations');
  }

  #base(
    frame: PlainRecord,
    participant: PlainRecord,
    movementSemantic: ArenaAnimationSemantic | null,
    speed: { readonly horizontal: number; readonly total: number },
    state: ResolverState,
  ): { readonly semantic: ArenaAnimationSemantic; readonly airborneSemantic: ArenaAnimationSemantic } {
    let airborneSemantic = state.airborneSemantic;
    const phase = ownData(frame, 'phase', 'presentation frame');
    const hudValue = ownData(frame, 'hud', 'presentation frame', false);
    const resultValue = hudValue === undefined ? undefined : ownData(hudValue, 'result', 'presentation frame.hud', false);
    const participantId = assertNonEmptyString(ownData(participant, 'id', 'participant'), 'participant.id');
    if (phase === ENDED_PHASE && resultValue) {
      const isDraw = booleanValue(ownData(resultValue, 'isDraw', 'presentation frame.hud.result'), 'presentation frame.hud.result.isDraw');
      const winnerId = ownData(resultValue, 'winnerId', 'presentation frame.hud.result');
      return { semantic: isDraw ? ARENA_ANIMATION_SEMANTIC.DRAW
        : winnerId === participantId ? ARENA_ANIMATION_SEMANTIC.WIN : ARENA_ANIMATION_SEMANTIC.LOSE,
      airborneSemantic };
    }
    const status = ownData(participant, 'status', 'participant');
    if (status !== ACTIVE_STATUS) {
      if (status !== RESPAWNING_STATUS && status !== ELIMINATED_STATUS) {
        throw new RangeError(`未知 participant status ${String(status)}。`);
      }
      return { semantic: ARENA_ANIMATION_SEMANTIC.ELIMINATED, airborneSemantic };
    }
    const hitstunTicks = assertIntegerAtLeast(ownData(participant, 'hitstunTicks', 'participant'), 0, 'participant.hitstunTicks');
    if (hitstunTicks > 0) {
      return { semantic: speed.total >= this.#definition.locomotion.knockbackSpeedThreshold
        ? ARENA_ANIMATION_SEMANTIC.KNOCKBACK : ARENA_ANIMATION_SEMANTIC.HITSTUN,
      airborneSemantic };
    }
    const movementValue = ownData(participant, 'movement', 'participant', false);
    const movementMode = movementValue === undefined ? undefined : ownData(movementValue, 'mode', 'participant.movement', false);
    if (movementMode === 'down-smash') return { semantic: ARENA_ANIMATION_SEMANTIC.DOWN_SMASH, airborneSemantic };
    if (movementMode === 'crouch-charging') return { semantic: ARENA_ANIMATION_SEMANTIC.CROUCH_CHARGE, airborneSemantic };
    if (movementSemantic) {
      if (AIRBORNE_START_SEMANTICS.has(movementSemantic)) {
        airborneSemantic = movementSemantic;
      }
      return { semantic: movementSemantic, airborneSemantic };
    }
    const grounded = booleanValue(ownData(participant, 'grounded', 'participant'), 'participant.grounded');
    if (!grounded) return { semantic: airborneSemantic, airborneSemantic };
    if (state.lastGrounded === false) return { semantic: ARENA_ANIMATION_SEMANTIC.LAND, airborneSemantic };
    if (speed.horizontal >= this.#definition.locomotion.runSpeedThreshold) {
      return { semantic: ARENA_ANIMATION_SEMANTIC.RUN, airborneSemantic };
    }
    if (speed.horizontal >= this.#definition.locomotion.walkSpeedThreshold) {
      return { semantic: ARENA_ANIMATION_SEMANTIC.WALK, airborneSemantic };
    }
    return { semantic: ARENA_ANIMATION_SEMANTIC.IDLE, airborneSemantic };
  }

  resolve(frameValue: unknown, participantValue: unknown): AnimationSemanticResolution {
    if (this.#destroyed) throw new Error('AnimationSemanticResolver 已销毁。');
    const frame = assertPlainRecord(frameValue, 'AnimationSemanticResolver presentation frame');
    const participant = assertPlainRecord(participantValue, 'AnimationSemanticResolver participant');
    const participantId = assertNonEmptyString(ownData(participant, 'id', 'participant'), 'participant.id');
    if (participantId !== this.#participantId) throw new RangeError('AnimationSemanticResolver participant 身份不一致。');
    const source = ownData(frame, 'source', 'presentation frame');
    const matchSeed = assertIntegerAtLeast(ownData(source, 'matchSeed', 'presentation frame.source'), 0, 'frame.source.matchSeed');
    if (matchSeed > UINT32_MAX) throw new RangeError('frame.source.matchSeed 必须是 uint32。');
    const tick = assertIntegerAtLeast(ownData(source, 'tick', 'presentation frame.source'), 0, 'frame.source.tick');
    let state = this.#state;
    if (state.lastMatchSeed !== null && (matchSeed !== state.lastMatchSeed || tick < state.lastTick)) {
      state = initialState();
    }
    if (matchSeed === state.lastMatchSeed && tick === state.lastTick && state.lastResolution) {
      return state.lastResolution;
    }
    const speed = finiteSpeed(participant);
    const movementSemantic = activeMovementSemantic(
      ownData(frame, 'events', 'presentation frame'), participantId, this.#actionPresentations,
    );
    const base = this.#base(frame, participant, movementSemantic, speed, state);
    const status = ownData(participant, 'status', 'participant');
    const hitstunTicks = assertIntegerAtLeast(ownData(participant, 'hitstunTicks', 'participant'), 0, 'participant.hitstunTicks');
    const overlaySemantic = status === ACTIVE_STATUS && hitstunTicks === 0 ? resolveOverlay(participant) : null;
    const baseEnteredAtTick = base.semantic === state.baseSemantic ? state.baseEnteredAtTick : tick;
    const overlayEnteredAtTick = overlaySemantic === state.overlaySemantic ? state.overlayEnteredAtTick : tick;
    const grounded = booleanValue(ownData(participant, 'grounded', 'participant'), 'participant.grounded');
    const resolution = Object.freeze({
      participantId, matchSeed, tick, baseSemantic: base.semantic, baseEnteredAtTick,
      overlaySemantic, overlayEnteredAtTick: overlaySemantic === null ? null : overlayEnteredAtTick,
    });
    this.#state = {
      lastMatchSeed: matchSeed, lastTick: tick, lastGrounded: grounded,
      airborneSemantic: grounded ? ARENA_ANIMATION_SEMANTIC.JUMP : base.airborneSemantic,
      baseSemantic: base.semantic, overlaySemantic, baseEnteredAtTick, overlayEnteredAtTick,
      lastResolution: resolution,
    };
    return resolution;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#state = initialState();
  }
}
