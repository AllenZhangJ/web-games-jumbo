import * as THREE from 'three';
import {
  ARENA_ANIMATION_SEMANTIC,
  type ArenaAnimationSemantic,
} from '@number-strategy-jump/arena-presentation-contracts';
import { readDataArray } from './strict-data-array.js';

const BASE_FADE_SECONDS: Readonly<Partial<Record<ArenaAnimationSemantic, number>>> = Object.freeze({
  [ARENA_ANIMATION_SEMANTIC.HITSTUN]: 0.035,
  [ARENA_ANIMATION_SEMANTIC.KNOCKBACK]: 0.035,
  [ARENA_ANIMATION_SEMANTIC.LAND]: 0.07,
  [ARENA_ANIMATION_SEMANTIC.RUN]: 0.1,
  [ARENA_ANIMATION_SEMANTIC.WALK]: 0.14,
});
const TAKEOFF_START_TICKS = 8;
const ACTION_PHASES = Object.freeze(['idle', 'windup', 'active', 'recovery'] as const);
type ActionPhase = typeof ACTION_PHASES[number];
const UPPER_BODY_TRACK_PATTERN = /(?:spine|chest|neck|head|shoulder|upperarm|lowerarm|forearm|hand|arm)[.\[\]_]/i;

interface ActionTiming { readonly windupTicks?: number; readonly activeTicks?: number; readonly recoveryTicks?: number }
interface ActionPresentation {
  readonly clipName: string | null;
  readonly overlayMask: string | null;
  readonly timing: ActionTiming | null;
}
interface PreparedOverlay { readonly action: THREE.AnimationAction; readonly clipName: string; readonly trackCount: number }
interface AnimationSemantics {
  readonly tick: number;
  readonly baseEnteredAtTick: number;
  readonly baseSemantic: ArenaAnimationSemantic;
}
interface AnimationBinding { readonly sourceKey: string; readonly loop: boolean }
interface AnimationResolution { readonly semantics: AnimationSemantics; readonly baseBinding: AnimationBinding }
interface CharacterSnapshot {
  readonly velocity: Readonly<{ x: number; z: number }>;
  readonly equipment: Readonly<{ definitionId: string }> | null;
  readonly action: Readonly<{ definitionId: string | null; phase: ActionPhase; ticksRemaining: number }>;
}

function clamp01(value: number): number { return Math.min(1, Math.max(0, value)); }

function ownData(value: unknown, field: string, name: string, required = true): unknown {
  if (!value || typeof value !== 'object') {
    if (!required) return undefined;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${field} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${field} 必须是数据字段。`);
  return descriptor.value;
}

function finite(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

function safeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

function stringValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function normalizeClips(value: unknown): ReadonlyMap<string, THREE.AnimationClip> {
  const clips = readDataArray(value, 'CharacterAnimationController clips', { nonEmpty: true });
  const result = new Map<string, THREE.AnimationClip>();
  for (const clip of clips) {
    if (!(clip instanceof THREE.AnimationClip) || typeof clip.name !== 'string' || clip.name.length === 0) {
      throw new TypeError('CharacterAnimationController clip 无效。');
    }
    if (result.has(clip.name)) throw new RangeError(`重复 animation clip ${clip.name}。`);
    result.set(clip.name, clip);
  }
  return result;
}

function normalizeTiming(value: unknown, name: string): ActionTiming | null {
  if (value === null || value === undefined) return null;
  const result: { windupTicks?: number; activeTicks?: number; recoveryTicks?: number } = {};
  for (const key of ['windupTicks', 'activeTicks', 'recoveryTicks'] as const) {
    const item = ownData(value, key, name, false);
    if (item === undefined) continue;
    if (!Number.isSafeInteger(item) || (item as number) < 1) throw new RangeError(`${name}.${key} 必须是正安全整数。`);
    result[key] = item as number;
  }
  return Object.freeze(result);
}

function normalizePresentations(value: unknown): ReadonlyMap<string, ActionPresentation> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('CharacterAnimationController 需要 action presentations。');
  }
  const result = new Map<string, ActionPresentation>();
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new TypeError('action presentations 不得包含 symbol 字段。');
    if (key.length === 0) throw new TypeError('action presentations key 必须是非空字符串。');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`action presentations.${key} 必须是可枚举数据字段。`);
    }
    const item = descriptor.value;
    const clip = ownData(item, 'clipName', `action presentations.${key}`, false);
    const mask = ownData(item, 'overlayMask', `action presentations.${key}`, false);
    if (clip !== undefined && clip !== null && (typeof clip !== 'string' || clip.length === 0)) {
      throw new TypeError(`action presentations.${key}.clipName 无效。`);
    }
    if (mask !== undefined && mask !== null && typeof mask !== 'string') {
      throw new TypeError(`action presentations.${key}.overlayMask 无效。`);
    }
    result.set(key, Object.freeze({
      clipName: typeof clip === 'string' ? clip : null,
      overlayMask: typeof mask === 'string' ? mask : null,
      timing: normalizeTiming(ownData(item, 'timing', `action presentations.${key}`, false), `action presentations.${key}.timing`),
    }));
  }
  return result;
}

function normalizeEquipment(value: unknown): CharacterSnapshot['equipment'] {
  if (value === null || value === undefined) return null;
  const definitionId = ownData(value, 'definitionId', 'snapshot.equipment');
  return Object.freeze({ definitionId: stringValue(definitionId, 'snapshot.equipment.definitionId') });
}

function normalizeAction(value: unknown): CharacterSnapshot['action'] {
  const definitionValue = ownData(value, 'definitionId', 'snapshot.action');
  const definitionId = definitionValue === null
    ? null : stringValue(definitionValue, 'snapshot.action.definitionId');
  const phaseValue = stringValue(ownData(value, 'phase', 'snapshot.action'), 'snapshot.action.phase');
  if (!ACTION_PHASES.includes(phaseValue as ActionPhase)) {
    throw new RangeError('snapshot.action.phase 不受支持。');
  }
  const phase = phaseValue as ActionPhase;
  const ticksRemaining = safeInteger(
    ownData(value, 'ticksRemaining', 'snapshot.action'),
    'snapshot.action.ticksRemaining',
  );
  if (phase === 'idle' && (definitionId !== null || ticksRemaining !== 0)) {
    throw new RangeError('idle action 必须没有 definitionId 且 ticksRemaining 为 0。');
  }
  if (phase !== 'idle' && (definitionId === null || ticksRemaining < 1)) {
    throw new RangeError('非 idle action 必须有 definitionId 且 ticksRemaining 为正整数。');
  }
  return Object.freeze({ definitionId, phase, ticksRemaining });
}

function loopMode(loop: boolean): THREE.AnimationActionLoopStyles {
  return loop ? THREE.LoopRepeat : THREE.LoopOnce;
}

function phaseDuration(timing: ActionTiming | null, phase: string): number | undefined {
  if (phase === 'windup') return timing?.windupTicks;
  if (phase === 'active') return timing?.activeTicks;
  if (phase === 'recovery') return timing?.recoveryTicks;
  return undefined;
}

function createUpperBodyClip(source: THREE.AnimationClip, definitionId: string): THREE.AnimationClip {
  const selected = source.tracks.filter(({ name }) => UPPER_BODY_TRACK_PATTERN.test(name));
  const tracks = (selected.length > 0 ? selected : source.tracks).map((track) => track.clone());
  return new THREE.AnimationClip(`${source.name}:upper-body:${definitionId}`, source.duration, tracks);
}

function normalizedClipTime(timing: ActionTiming | null, phase: string, ticksRemaining: number): number | null {
  const duration = phaseDuration(timing, phase);
  if (!Number.isSafeInteger(duration) || (duration ?? 0) < 1) return null;
  const remaining = Math.min(duration as number, Math.max(0, ticksRemaining));
  const progress = clamp01(1 - remaining / (duration as number));
  if (phase === 'windup') return progress * 0.38;
  if (phase === 'active') return 0.38 + progress * 0.36;
  if (phase === 'recovery') return 0.74 + progress * 0.26;
  return null;
}

function cleanupFailure(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...cleanupCauses]) });
  return failure;
}

export class CharacterAnimationController {
  readonly #mixer: THREE.AnimationMixer;
  readonly #clipByName: ReadonlyMap<string, THREE.AnimationClip>;
  readonly #actionPresentations: ReadonlyMap<string, ActionPresentation>;
  readonly #overlayActionsByDefinitionId = new Map<string, PreparedOverlay>();
  #baseAction: THREE.AnimationAction | null = null;
  #baseClipName: string | null = null;
  #overlayAction: THREE.AnimationAction | null = null;
  #overlayClipName: string | null = null;
  #overlayDefinitionId: string | null = null;
  #overlayPhase: string | null = null;
  #baseMotionPhase: string | null = null;
  #state: 'active' | 'failed' | 'destroyed' = 'active';
  #lastError: unknown = null;
  #mixerStopped = false;
  #rootUncached = false;
  #operating = false;
  #cleaning = false;

  constructor(options: unknown) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('CharacterAnimationController options 必须是对象。');
    const allowed = new Set<PropertyKey>(['root', 'clips', 'actionPresentations']);
    if (Reflect.ownKeys(options).some((key) => !allowed.has(key))) throw new TypeError('CharacterAnimationController options 包含未知字段。');
    const root = ownData(options, 'root', 'CharacterAnimationController options');
    if (!(root instanceof THREE.Object3D)) throw new TypeError('CharacterAnimationController 需要 Object3D root。');
    this.#clipByName = normalizeClips(ownData(options, 'clips', 'CharacterAnimationController options'));
    this.#actionPresentations = normalizePresentations(ownData(options, 'actionPresentations', 'CharacterAnimationController options'));
    this.#mixer = new THREE.AnimationMixer(root);
    try {
      for (const [definitionId, presentation] of this.#actionPresentations) {
        const clipName = presentation.clipName;
        if (!clipName || !this.#clipByName.has(clipName)) continue;
        const source = this.#requireClip(clipName);
        const maskedClip = presentation.overlayMask === 'upper-body'
          ? createUpperBodyClip(source, definitionId) : source.clone();
        const action = this.#mixer.clipAction(maskedClip);
        action.enabled = false;
        action.clampWhenFinished = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.setEffectiveWeight(0).play();
        this.#overlayActionsByDefinitionId.set(definitionId, Object.freeze({
          action, clipName, trackCount: maskedClip.tracks.length,
        }));
      }
    } catch (error) {
      const cleanupErrors = this.#cleanup();
      if (cleanupErrors.length > 0) throw cleanupFailure('CharacterAnimationController 构造失败且清理未完整完成。', error, cleanupErrors);
      throw error;
    }
  }

  #assertUsable(): void {
    if (this.#state === 'destroyed') throw new Error('CharacterAnimationController 已销毁。');
    if (this.#state === 'failed') { const error = new Error('CharacterAnimationController 已失败。'); error.cause = this.#lastError; throw error; }
    if (this.#operating) throw new Error('CharacterAnimationController 不允许回调重入。');
  }

  #requireClip(name: string): THREE.AnimationClip {
    const clip = this.#clipByName.get(name);
    if (!clip) throw new RangeError(`角色模型缺少 animation clip ${String(name)}。`);
    return clip;
  }

  listClipNames(): readonly string[] { this.#assertUsable(); return Object.freeze([...this.#clipByName.keys()].sort()); }

  #baseClip(binding: AnimationBinding, semantics: AnimationSemantics, hitDirection: unknown): string {
    if (semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.JUMP || semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.CROUCH_JUMP) {
      const elapsedTicks = semantics.tick - semantics.baseEnteredAtTick;
      if (elapsedTicks <= TAKEOFF_START_TICKS && this.#clipByName.has('Jump_Start')) { this.#baseMotionPhase = 'jump-start'; return 'Jump_Start'; }
      if (this.#clipByName.has('Jump_Idle')) { this.#baseMotionPhase = 'jump-air'; return 'Jump_Idle'; }
    }
    if (semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP) {
      const elapsedTicks = semantics.tick - semantics.baseEnteredAtTick;
      if (elapsedTicks <= TAKEOFF_START_TICKS && this.#clipByName.has('Jump_Full_Short')) { this.#baseMotionPhase = 'double-jump-start'; return 'Jump_Full_Short'; }
      if (this.#clipByName.has('Jump_Idle')) { this.#baseMotionPhase = 'double-jump-air'; return 'Jump_Idle'; }
    }
    if (semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.HITSTUN || semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.KNOCKBACK) {
      const directional = hitDirection === 'back' ? 'Hit_B' : 'Hit_A';
      if (this.#clipByName.has(directional)) { this.#baseMotionPhase = hitDirection === 'back' ? 'hit-back' : 'hit-front'; return directional; }
    }
    this.#baseMotionPhase = semantics.baseSemantic;
    return binding.sourceKey;
  }

  #switchBase(name: string, loop: boolean, semantic: ArenaAnimationSemantic): void {
    if (name === this.#baseClipName) return;
    const previous = this.#baseAction;
    const action = this.#mixer.clipAction(this.#requireClip(name));
    action.enabled = true;
    action.clampWhenFinished = !loop;
    action.setLoop(loopMode(loop), loop ? Infinity : 1);
    action.reset().setEffectiveWeight(1).play();
    const fade = BASE_FADE_SECONDS[semantic] ?? 0.12;
    if (previous && previous !== action) previous.crossFadeTo(action, fade, true);
    else action.fadeIn(fade);
    this.#baseAction = action;
    this.#baseClipName = name;
  }

  #syncBaseSpeed(snapshot: CharacterSnapshot, semantic: ArenaAnimationSemantic): void {
    if (!this.#baseAction) return;
    const horizontalSpeed = Math.hypot(snapshot.velocity.x, snapshot.velocity.z);
    let timeScale = 1;
    if (semantic === ARENA_ANIMATION_SEMANTIC.RUN) timeScale = Math.min(1.65, Math.max(0.72, horizontalSpeed / 5.2));
    else if (semantic === ARENA_ANIMATION_SEMANTIC.WALK) timeScale = Math.min(1.4, Math.max(0.62, horizontalSpeed / 2.25));
    else if (semantic === ARENA_ANIMATION_SEMANTIC.IDLE) timeScale = snapshot.equipment?.definitionId === 'hammer' ? 0.82 : 0.94;
    this.#baseAction.setEffectiveTimeScale(timeScale);
  }

  #stopOverlay(): void {
    if (this.#overlayAction) { this.#overlayAction.setEffectiveWeight(0); this.#overlayAction.enabled = false; }
    this.#overlayAction = null;
    this.#overlayClipName = null;
    this.#overlayDefinitionId = null;
    this.#overlayPhase = null;
  }

  #syncActionOverlay(snapshot: CharacterSnapshot): void {
    const { definitionId, phase, ticksRemaining } = snapshot.action;
    if (definitionId === null || phase === 'idle') { this.#stopOverlay(); return; }
    const prepared = this.#overlayActionsByDefinitionId.get(definitionId);
    if (!prepared) { this.#stopOverlay(); return; }
    if (this.#overlayDefinitionId !== definitionId || this.#overlayClipName !== prepared.clipName || this.#overlayAction === null) {
      this.#stopOverlay();
      const action = prepared.action;
      action.enabled = true;
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
      action.reset().setEffectiveWeight(1).play();
      this.#overlayAction = action;
      this.#overlayClipName = prepared.clipName;
      this.#overlayDefinitionId = definitionId;
    }
    const normalized = normalizedClipTime(this.#actionPresentations.get(definitionId)?.timing ?? null, phase, ticksRemaining);
    if (normalized === null) return;
    this.#overlayAction.time = normalized * this.#overlayAction.getClip().duration;
    this.#overlayAction.setEffectiveWeight(1);
    this.#overlayPhase = phase;
  }

  #normalizeSync(value: unknown): { snapshot: CharacterSnapshot; animation: AnimationResolution; hitDirection: unknown } {
    const snapshot = ownData(value, 'snapshot', 'CharacterAnimationController.sync');
    const animation = ownData(value, 'animation', 'CharacterAnimationController.sync');
    const semantics = ownData(animation, 'semantics', 'CharacterAnimationController.sync.animation');
    const binding = ownData(animation, 'baseBinding', 'CharacterAnimationController.sync.animation');
    const velocity = ownData(snapshot, 'velocity', 'CharacterAnimationController.sync.snapshot');
    const action = ownData(snapshot, 'action', 'CharacterAnimationController.sync.snapshot');
    const normalizedSnapshot: CharacterSnapshot = Object.freeze({
      velocity: Object.freeze({
        x: finite(ownData(velocity, 'x', 'snapshot.velocity'), 'snapshot.velocity.x'),
        z: finite(ownData(velocity, 'z', 'snapshot.velocity'), 'snapshot.velocity.z'),
      }),
      equipment: normalizeEquipment(ownData(snapshot, 'equipment', 'snapshot', false)),
      action: normalizeAction(action),
    });
    const baseSemantic = ownData(semantics, 'baseSemantic', 'animation.semantics');
    if (!Object.values(ARENA_ANIMATION_SEMANTIC).includes(baseSemantic as ArenaAnimationSemantic)) throw new RangeError('animation.semantics.baseSemantic 不受支持。');
    const tick = safeInteger(ownData(semantics, 'tick', 'animation.semantics'), 'animation.semantics.tick');
    const baseEnteredAtTick = safeInteger(
      ownData(semantics, 'baseEnteredAtTick', 'animation.semantics'),
      'animation.semantics.baseEnteredAtTick',
    );
    if (baseEnteredAtTick > tick) {
      throw new RangeError('animation.semantics.baseEnteredAtTick 不得晚于 tick。');
    }
    const normalizedAnimation: AnimationResolution = Object.freeze({
      semantics: Object.freeze({
        tick,
        baseEnteredAtTick,
        baseSemantic: baseSemantic as ArenaAnimationSemantic,
      }),
      baseBinding: Object.freeze({
        sourceKey: stringValue(ownData(binding, 'sourceKey', 'animation.baseBinding'), 'animation.baseBinding.sourceKey'),
        loop: (() => {
          const value = ownData(binding, 'loop', 'animation.baseBinding');
          if (typeof value !== 'boolean') throw new TypeError('animation.baseBinding.loop 必须是布尔值。');
          return value;
        })(),
      }),
    });
    return { snapshot: normalizedSnapshot, animation: normalizedAnimation, hitDirection: ownData(value, 'hitDirection', 'CharacterAnimationController.sync', false) ?? null };
  }

  sync(value: unknown): void {
    this.#assertUsable();
    const { snapshot, animation, hitDirection } = this.#normalizeSync(value);
    this.#operating = true;
    try {
      const baseClip = this.#baseClip(animation.baseBinding, animation.semantics, hitDirection);
      this.#switchBase(baseClip, baseClip === 'Jump_Idle' || animation.baseBinding.loop, animation.semantics.baseSemantic);
      this.#syncBaseSpeed(snapshot, animation.semantics.baseSemantic);
      this.#syncActionOverlay(snapshot);
    } catch (error) { this.#operating = false; this.#fail(error); }
    this.#operating = false;
  }

  update(deltaSeconds: unknown): void {
    this.#assertUsable();
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds as number : 0));
    this.#operating = true;
    try { this.#mixer.update(delta); } catch (error) { this.#operating = false; this.#fail(error); }
    this.#operating = false;
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      clipCount: this.#clipByName.size,
      baseClipName: this.#baseClipName,
      baseMotionPhase: this.#baseMotionPhase,
      baseTimeScale: this.#baseAction?.getEffectiveTimeScale() ?? null,
      overlayClipName: this.#overlayClipName,
      overlayDefinitionId: this.#overlayDefinitionId,
      overlayTimeSeconds: this.#overlayAction?.time ?? null,
      overlayDurationSeconds: this.#overlayAction?.getClip().duration ?? null,
      overlayPhase: this.#overlayPhase,
      overlayTrackCount: this.#overlayDefinitionId === null ? null
        : this.#overlayActionsByDefinitionId.get(this.#overlayDefinitionId)?.trackCount ?? null,
      prewarmedOverlayCount: this.#overlayActionsByDefinitionId.size,
    });
  }

  #cleanup(): unknown[] {
    if (this.#cleaning) return [new Error('CharacterAnimationController 清理不可重入。')];
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      if (!this.#mixerStopped) {
        try { this.#mixer.stopAllAction(); this.#mixerStopped = true; } catch (error) { errors.push(error); }
      }
      if (!this.#rootUncached) {
        try { this.#mixer.uncacheRoot(this.#mixer.getRoot()); this.#rootUncached = true; } catch (error) { errors.push(error); }
      }
      if (this.#mixerStopped && this.#rootUncached) {
        this.#baseAction = null;
        this.#overlayAction = null;
        this.#overlayActionsByDefinitionId.clear();
      }
    } finally { this.#cleaning = false; }
    return errors;
  }

  #fail(error: unknown): never {
    this.#state = 'failed';
    this.#lastError = error;
    const errors = this.#cleanup();
    if (errors.length > 0) throw cleanupFailure('CharacterAnimationController 失败关闭时清理未完整完成。', error, errors);
    throw error;
  }

  dispose(): void {
    this.#state = 'destroyed';
    const errors = this.#cleanup();
    if (errors.length > 0) throw cleanupFailure('CharacterAnimationController 清理未完整完成。', this.#lastError, errors);
  }
}
