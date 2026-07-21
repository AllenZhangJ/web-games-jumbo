import * as THREE from 'three';
import { ARENA_ANIMATION_SEMANTIC } from '../animation/animation-semantics.js';

const BASE_FADE_SECONDS = Object.freeze({
  [ARENA_ANIMATION_SEMANTIC.HITSTUN]: 0.035,
  [ARENA_ANIMATION_SEMANTIC.KNOCKBACK]: 0.035,
  [ARENA_ANIMATION_SEMANTIC.LAND]: 0.07,
  [ARENA_ANIMATION_SEMANTIC.RUN]: 0.1,
  [ARENA_ANIMATION_SEMANTIC.WALK]: 0.14,
});

// Keep the anticipation/readability pose long enough to survive a 60 Hz phone
// frame drop. Physics remains immediate and authoritative; only the clip phase
// is extended from ~83 ms to ~133 ms.
const TAKEOFF_START_TICKS = 8;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function assertClipList(clips) {
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new RangeError('CharacterAnimationController 需要非空 animation clips。');
  }
  const result = new Map();
  for (const clip of clips) {
    if (!(clip instanceof THREE.AnimationClip) || typeof clip.name !== 'string' || !clip.name) {
      throw new TypeError('CharacterAnimationController clip 无效。');
    }
    if (result.has(clip.name)) throw new RangeError(`重复 animation clip ${clip.name}。`);
    result.set(clip.name, clip);
  }
  return result;
}

function loopMode(loop) {
  return loop ? THREE.LoopRepeat : THREE.LoopOnce;
}

function phaseDuration(timing, phase) {
  if (phase === 'windup') return timing?.windupTicks;
  if (phase === 'active') return timing?.activeTicks;
  if (phase === 'recovery') return timing?.recoveryTicks;
  return null;
}

const UPPER_BODY_TRACK_PATTERN = /(?:spine|chest|neck|head|shoulder|upperarm|lowerarm|forearm|hand|arm)[.\[\]_]/i;

function createUpperBodyClip(source, definitionId) {
  const selected = source.tracks.filter(({ name }) => UPPER_BODY_TRACK_PATTERN.test(name));
  const tracks = (selected.length > 0 ? selected : source.tracks).map((track) => track.clone());
  return new THREE.AnimationClip(
    `${source.name}:upper-body:${definitionId}`,
    source.duration,
    tracks,
  );
}

function normalizedClipTime(timing, phase, ticksRemaining) {
  const duration = phaseDuration(timing, phase);
  if (!Number.isSafeInteger(duration) || duration < 1) return null;
  const remaining = Math.min(duration, Math.max(0, ticksRemaining));
  const progress = clamp01(1 - remaining / duration);
  if (phase === 'windup') return progress * 0.38;
  if (phase === 'active') return 0.38 + progress * 0.36;
  if (phase === 'recovery') return 0.74 + progress * 0.26;
  return null;
}

export class CharacterAnimationController {
  #mixer;
  #clipByName;
  #actionPresentations;
  #baseAction;
  #baseClipName;
  #overlayAction;
  #overlayClipName;
  #overlayDefinitionId;
  #overlayActionsByDefinitionId;
  #overlayPhase;
  #baseMotionPhase;
  #disposed;

  constructor({ root, clips, actionPresentations }) {
    if (!root?.isObject3D) throw new TypeError('CharacterAnimationController 需要 Object3D root。');
    if (!actionPresentations || typeof actionPresentations !== 'object') {
      throw new TypeError('CharacterAnimationController 需要 action presentations。');
    }
    this.#mixer = new THREE.AnimationMixer(root);
    this.#clipByName = assertClipList(clips);
    this.#actionPresentations = actionPresentations;
    this.#baseAction = null;
    this.#baseClipName = null;
    this.#overlayAction = null;
    this.#overlayClipName = null;
    this.#overlayDefinitionId = null;
    this.#overlayActionsByDefinitionId = new Map();
    this.#overlayPhase = null;
    this.#baseMotionPhase = null;
    this.#disposed = false;
    for (const [definitionId, presentation] of Object.entries(actionPresentations)) {
      const clipName = presentation?.clipName;
      if (typeof clipName !== 'string' || !this.#clipByName.has(clipName)) continue;
      const maskedClip = presentation.overlayMask === 'upper-body'
        ? createUpperBodyClip(this.#requireClip(clipName), definitionId)
        : this.#requireClip(clipName).clone();
      const action = this.#mixer.clipAction(maskedClip);
      action.enabled = false;
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
      action.setEffectiveWeight(0).play();
      this.#overlayActionsByDefinitionId.set(definitionId, Object.freeze({
        action,
        clipName,
        trackCount: maskedClip.tracks.length,
      }));
    }
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('CharacterAnimationController 已销毁。');
  }

  listClipNames() {
    this.#assertUsable();
    return Object.freeze([...this.#clipByName.keys()].sort());
  }

  #requireClip(name) {
    const clip = this.#clipByName.get(name);
    if (!clip) throw new RangeError(`角色模型缺少 animation clip ${String(name)}。`);
    return clip;
  }

  #baseClip(binding, semantics, hitDirection) {
    if (
      semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.JUMP
      || semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.CROUCH_JUMP
    ) {
      const elapsedTicks = semantics.tick - semantics.baseEnteredAtTick;
      if (elapsedTicks <= TAKEOFF_START_TICKS && this.#clipByName.has('Jump_Start')) {
        this.#baseMotionPhase = 'jump-start';
        return 'Jump_Start';
      }
      if (this.#clipByName.has('Jump_Idle')) {
        this.#baseMotionPhase = 'jump-air';
        return 'Jump_Idle';
      }
    }
    if (semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP) {
      const elapsedTicks = semantics.tick - semantics.baseEnteredAtTick;
      if (
        elapsedTicks <= TAKEOFF_START_TICKS
        && this.#clipByName.has('Jump_Full_Short')
      ) {
        this.#baseMotionPhase = 'double-jump-start';
        return 'Jump_Full_Short';
      }
      if (this.#clipByName.has('Jump_Idle')) {
        this.#baseMotionPhase = 'double-jump-air';
        return 'Jump_Idle';
      }
    }
    if (
      semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.HITSTUN
      || semantics.baseSemantic === ARENA_ANIMATION_SEMANTIC.KNOCKBACK
    ) {
      const directional = hitDirection === 'back' ? 'Hit_B' : 'Hit_A';
      if (this.#clipByName.has(directional)) {
        this.#baseMotionPhase = hitDirection === 'back' ? 'hit-back' : 'hit-front';
        return directional;
      }
    }
    this.#baseMotionPhase = semantics.baseSemantic;
    return binding.sourceKey;
  }

  #switchBase(name, loop, semantic) {
    if (name === this.#baseClipName) return;
    const previous = this.#baseAction;
    const action = this.#mixer.clipAction(this.#requireClip(name));
    action.enabled = true;
    action.clampWhenFinished = !loop;
    action.setLoop(loopMode(loop), loop ? Infinity : 1);
    action.reset().setEffectiveWeight(1).play();
    const fade = BASE_FADE_SECONDS[semantic] ?? 0.12;
    if (previous && previous !== action) {
      previous.crossFadeTo(action, fade, true);
    } else {
      action.fadeIn(fade);
    }
    this.#baseAction = action;
    this.#baseClipName = name;
  }

  #syncBaseSpeed(snapshot, semantic) {
    if (!this.#baseAction) return;
    const horizontalSpeed = Math.hypot(snapshot.velocity.x, snapshot.velocity.z);
    let timeScale = 1;
    if (semantic === ARENA_ANIMATION_SEMANTIC.RUN) {
      timeScale = Math.min(1.65, Math.max(0.72, horizontalSpeed / 5.2));
    } else if (semantic === ARENA_ANIMATION_SEMANTIC.WALK) {
      timeScale = Math.min(1.4, Math.max(0.62, horizontalSpeed / 2.25));
    } else if (semantic === ARENA_ANIMATION_SEMANTIC.IDLE) {
      timeScale = snapshot.equipment?.definitionId === 'hammer' ? 0.82 : 0.94;
    }
    this.#baseAction.setEffectiveTimeScale(timeScale);
  }

  #stopOverlay(_fadeSeconds = 0.1) {
    if (this.#overlayAction) {
      this.#overlayAction.setEffectiveWeight(0);
      this.#overlayAction.enabled = false;
    }
    this.#overlayAction = null;
    this.#overlayClipName = null;
    this.#overlayDefinitionId = null;
    this.#overlayPhase = null;
  }

  #syncActionOverlay(snapshot) {
    const definitionId = snapshot.action?.definitionId ?? null;
    if (definitionId === null || snapshot.action.phase === 'idle') {
      this.#stopOverlay();
      return;
    }
    const prepared = this.#overlayActionsByDefinitionId.get(definitionId);
    if (!prepared) {
      this.#stopOverlay();
      return;
    }
    if (
      this.#overlayDefinitionId !== definitionId
      || this.#overlayClipName !== prepared.clipName
      || this.#overlayAction === null
    ) {
      this.#stopOverlay(0.045);
      const action = prepared.action;
      action.enabled = true;
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
      action.reset().setEffectiveWeight(1).play();
      this.#overlayAction = action;
      this.#overlayClipName = prepared.clipName;
      this.#overlayDefinitionId = definitionId;
    }
    const timing = this.#actionPresentations[definitionId]?.timing;
    const normalized = normalizedClipTime(
      timing,
      snapshot.action.phase,
      snapshot.action.ticksRemaining,
    );
    if (normalized === null) return;
    this.#overlayAction.time = normalized * this.#overlayAction.getClip().duration;
    this.#overlayAction.setEffectiveWeight(1);
    this.#overlayPhase = snapshot.action.phase;
  }

  sync({ snapshot, animation, hitDirection = null }) {
    this.#assertUsable();
    if (!snapshot || !animation?.semantics || !animation?.baseBinding) {
      throw new TypeError('CharacterAnimationController.sync 参数无效。');
    }
    const { semantics, baseBinding } = animation;
    const baseClip = this.#baseClip(baseBinding, semantics, hitDirection);
    const baseLoop = (
      baseClip === 'Jump_Idle'
      || baseBinding.loop
    );
    this.#switchBase(baseClip, baseLoop, semantics.baseSemantic);
    this.#syncBaseSpeed(snapshot, semantics.baseSemantic);
    this.#syncActionOverlay(snapshot);
  }

  update(deltaSeconds) {
    this.#assertUsable();
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.#mixer.update(delta);
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      clipCount: this.#clipByName.size,
      baseClipName: this.#baseClipName,
      baseMotionPhase: this.#baseMotionPhase,
      baseTimeScale: this.#baseAction?.getEffectiveTimeScale?.() ?? null,
      overlayClipName: this.#overlayClipName,
      overlayDefinitionId: this.#overlayDefinitionId,
      overlayTimeSeconds: this.#overlayAction?.time ?? null,
      overlayDurationSeconds: this.#overlayAction?.getClip?.().duration ?? null,
      overlayPhase: this.#overlayPhase,
      overlayTrackCount: this.#overlayDefinitionId === null
        ? null
        : this.#overlayActionsByDefinitionId.get(this.#overlayDefinitionId)?.trackCount ?? null,
      prewarmedOverlayCount: this.#overlayActionsByDefinitionId.size,
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#mixer.stopAllAction();
    this.#mixer.uncacheRoot(this.#mixer.getRoot());
    this.#baseAction = null;
    this.#overlayAction = null;
    this.#overlayActionsByDefinitionId.clear();
  }
}
