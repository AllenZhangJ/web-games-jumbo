import * as THREE from 'three';
import { disposeThreeObject } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';

const EFFECT_TARGET_FIELDS = Object.freeze([
  'targetId',
  'participantId',
  'victimId',
  'ownerId',
]);

const EFFECT_EVENT_TYPES = new Set([
  'HitResolved',
  'KnockbackApplied',
  'DownSmashLanded',
  'PlayerEliminated',
  'PlayerRespawned',
  'EquipmentPickedUp',
]);

function eventTargetId(event) {
  for (const field of EFFECT_TARGET_FIELDS) {
    if (typeof event[field] === 'string') return event[field];
  }
  return null;
}

class PulseEffect {
  constructor({ eventId, position, danger }) {
    this.eventId = eventId;
    this.elapsed = 0;
    this.duration = danger ? 0.72 : 0.42;
    const material = new THREE.MeshBasicMaterial({
      color: danger ? ARENA_GREYBOX_COLOR.danger : ARENA_GREYBOX_COLOR.teal,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.root = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 20), material);
    this.root.name = `ArenaEventEffect:${eventId}`;
    this.root.rotation.x = -Math.PI / 2;
    this.root.position.set(position.x, position.y + 0.05, position.z);
    this.root.renderOrder = 4;
  }

  update(deltaSeconds) {
    this.elapsed += deltaSeconds;
    const progress = Math.min(1, this.elapsed / this.duration);
    this.root.scale.setScalar(1 + progress * 5);
    this.root.material.opacity = (1 - progress) * 0.78;
    return progress >= 1;
  }

  dispose() {
    disposeThreeObject(this.root);
  }
}

export class GreyboxEventEffects {
  #root;
  #effects;
  #disposed;

  constructor(root) {
    if (!root?.add) throw new TypeError('GreyboxEventEffects 需要 Object3D root。');
    this.#root = root;
    this.#effects = [];
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('GreyboxEventEffects 已销毁。');
  }

  consume(events, resolvePosition) {
    this.#assertUsable();
    if (!Array.isArray(events) || typeof resolvePosition !== 'function') {
      throw new TypeError('GreyboxEventEffects.consume 参数无效。');
    }
    for (const event of events) {
      if (!EFFECT_EVENT_TYPES.has(event.type)) continue;
      const participantId = eventTargetId(event);
      const position = participantId ? resolvePosition(participantId) : null;
      if (!position) continue;
      const effect = new PulseEffect({
        eventId: event.id,
        position,
        danger: event.type === 'PlayerEliminated' || event.type === 'KnockbackApplied',
      });
      this.#effects.push(effect);
      this.#root.add(effect.root);
      while (this.#effects.length > ARENA_GREYBOX_DESIGN.maximumEffects) {
        this.#effects.shift().dispose();
      }
    }
  }

  update(deltaSeconds) {
    this.#assertUsable();
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    const survivors = [];
    for (const effect of this.#effects) {
      if (effect.update(delta)) effect.dispose();
      else survivors.push(effect);
    }
    this.#effects = survivors;
  }

  clear() {
    this.#assertUsable();
    for (const effect of this.#effects) effect.dispose();
    this.#effects = [];
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({ effectCount: this.#effects.length });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const effect of this.#effects) {
      try { effect.dispose(); } catch (error) { errors.push(error); }
    }
    this.#effects = [];
    if (errors.length > 0) {
      const failure = new Error('GreyboxEventEffects 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
