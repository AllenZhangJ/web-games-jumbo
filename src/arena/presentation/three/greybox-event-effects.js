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

const EFFECT_KIND = Object.freeze({
  PULSE: 'pulse',
  IMPACT: 'impact',
});

const IMPACT_STREAK_LENGTHS = Object.freeze({
  default: Object.freeze([1.08, 0.82, 0.62, 0.46]),
  'hammer-smash': Object.freeze([1.45, 1.05, 0.78, 0.62, 0.48]),
});

class PooledEventEffect {
  constructor(root) {
    this.eventId = null;
    this.elapsed = 0;
    this.duration = 0;
    this.scale = 1;
    this.kind = null;
    this.active = false;
    this.root = new THREE.Group();
    this.root.name = 'ArenaPooledEventEffect';
    this.root.visible = false;
    root.add(this.root);

    const material = new THREE.MeshBasicMaterial({
      color: ARENA_GREYBOX_COLOR.teal,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.pulse = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 20), material);
    this.pulse.rotation.x = -Math.PI / 2;
    this.pulse.renderOrder = 4;
    this.root.add(this.pulse);

    this.impact = new THREE.Group();
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: ARENA_GREYBOX_COLOR.white,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    });
    this.flash = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), flashMaterial);
    this.flash.scale.set(1.4, 0.8, 0.65);
    this.impact.add(this.flash);

    const streakMaterial = flashMaterial.clone();
    this.streaks = [];
    for (let index = 0; index < IMPACT_STREAK_LENGTHS['hammer-smash'].length; index += 1) {
      const streak = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        streakMaterial,
      );
      this.streaks.push(streak);
      this.impact.add(streak);
    }

    const ringMaterial = flashMaterial.clone();
    ringMaterial.opacity = 0.8;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24), ringMaterial);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = -0.45;
    this.impact.add(this.ring);

    const accentMaterial = flashMaterial.clone();
    this.hookArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.045, 7, 18, Math.PI * 1.45),
      accentMaterial,
    );
    this.hookArc.rotation.z = 0.45;
    this.hookArc.position.z = -0.12;
    this.impact.add(this.hookArc);

    this.guardArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.055, 7, 18, Math.PI),
      accentMaterial,
    );
    this.guardArc.rotation.z = Math.PI / 2;
    this.guardArc.position.z = -0.05;
    this.impact.add(this.guardArc);
    this.impact.renderOrder = 8;
    this.root.add(this.impact);
  }

  activate({ event, position, attackerPosition, danger }) {
    this.eventId = event.id;
    this.elapsed = 0;
    this.active = true;
    this.root.name = `ArenaEventEffect:${event.id}`;
    this.root.visible = true;
    this.root.rotation.set(0, 0, 0);
    this.root.scale.setScalar(1);
    if (event.type !== 'HitResolved') {
      this.kind = EFFECT_KIND.PULSE;
      this.duration = danger ? 0.72 : 0.42;
      this.pulse.visible = true;
      this.impact.visible = false;
      this.pulse.material.color.setHex(
        danger ? ARENA_GREYBOX_COLOR.danger : ARENA_GREYBOX_COLOR.teal,
      );
      this.pulse.material.opacity = 0.8;
      this.pulse.scale.setScalar(1);
      this.root.position.set(position.x, position.y + 0.05, position.z);
      return;
    }

    this.kind = EFFECT_KIND.IMPACT;
    this.duration = event.action === 'hammer-smash' ? 0.34 : 0.22;
    this.scale = event.action === 'hammer-smash'
      ? 1.65
      : event.action === 'shield-charge' ? 1.25 : event.action === 'chain-pull' ? 1.1 : 0.9;
    this.pulse.visible = false;
    this.impact.visible = true;
    this.root.position.set(position.x, position.y + 0.48, position.z);
    if (attackerPosition) {
      const dx = position.x - attackerPosition.x;
      const dz = position.z - attackerPosition.z;
      this.root.rotation.y = Math.atan2(dx, dz);
    }
    const color = event.action === 'hammer-smash'
      ? ARENA_GREYBOX_COLOR.warning
      : event.action === 'chain-pull'
        ? ARENA_GREYBOX_COLOR.danger
        : event.action === 'shield-charge' ? ARENA_GREYBOX_COLOR.teal : ARENA_GREYBOX_COLOR.white;
    this.flash.material.color.setHex(color);
    this.flash.material.opacity = 0.95;
    this.flash.scale.set(1.4, 0.8, 0.65);
    this.ring.material.color.setHex(color);
    this.ring.material.opacity = 0.8;
    this.ring.scale.setScalar(1);
    this.hookArc.material.color.setHex(color);
    this.hookArc.material.opacity = 0.95;
    this.hookArc.visible = event.action === 'chain-pull';
    this.guardArc.visible = event.action === 'shield-charge';
    const lengths = IMPACT_STREAK_LENGTHS[event.action] ?? IMPACT_STREAK_LENGTHS.default;
    for (let index = 0; index < this.streaks.length; index += 1) {
      const streak = this.streaks[index];
      const length = lengths[index] ?? 0;
      streak.visible = length > 0;
      if (!streak.visible) continue;
      streak.material.color.setHex(color);
      streak.material.opacity = 0.88;
      streak.scale.set(0.055 + index * 0.012, 0.08, length * 0.4);
      streak.position.set(
        (index - (lengths.length - 1) / 2) * 0.14,
        (index % 2 === 0 ? 1 : -1) * index * 0.035,
        -0.16 - length / 2,
      );
      streak.rotation.z = (index - 1.5) * 0.08;
      streak.userData.baseLength = length;
    }
    this.impact.scale.setScalar(this.scale);
  }

  update(deltaSeconds) {
    if (!this.active) return true;
    this.elapsed += deltaSeconds;
    const progress = Math.min(1, this.elapsed / this.duration);
    if (this.kind === EFFECT_KIND.PULSE) {
      this.pulse.scale.setScalar(1 + progress * 5);
      this.pulse.material.opacity = (1 - progress) * 0.78;
      return progress >= 1;
    }
    const punch = Math.sin(Math.min(1, progress * 2) * Math.PI / 2);
    this.flash.scale.set(1.4 + punch * 1.2, 0.8 + punch * 0.5, 0.65 + punch * 0.3);
    this.flash.material.opacity = (1 - progress) * 0.95;
    for (const streak of this.streaks) {
      if (!streak.visible) continue;
      streak.scale.z = streak.userData.baseLength * (0.4 + punch * 1.25);
      streak.material.opacity = (1 - progress) * 0.88;
    }
    this.ring.scale.setScalar(0.6 + progress * 3.2);
    this.ring.material.opacity = (1 - progress) * 0.8;
    return progress >= 1;
  }

  deactivate() {
    this.active = false;
    this.eventId = null;
    this.kind = null;
    this.root.visible = false;
  }

  destroy() {
    disposeThreeObject(this.root);
  }
}

export class GreyboxEventEffects {
  #root;
  #effects;
  #freeEffects;
  #allEffects;
  #maximumEffects;
  #disposed;

  constructor(root, { maximumEffects = ARENA_GREYBOX_DESIGN.maximumEffects } = {}) {
    if (!root?.add) throw new TypeError('GreyboxEventEffects 需要 Object3D root。');
    if (!Number.isSafeInteger(maximumEffects) || maximumEffects < 0 || maximumEffects > 256) {
      throw new RangeError('GreyboxEventEffects.maximumEffects 必须是 0～256 的安全整数。');
    }
    this.#root = root;
    this.#effects = [];
    this.#allEffects = Array.from(
      { length: maximumEffects },
      () => new PooledEventEffect(this.#root),
    );
    this.#freeEffects = [...this.#allEffects];
    this.#maximumEffects = maximumEffects;
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
      const attackerPosition = typeof event.attackerId === 'string'
        ? resolvePosition(event.attackerId)
        : null;
      if (this.#maximumEffects === 0) continue;
      let effect = this.#freeEffects.pop();
      if (!effect) {
        effect = this.#effects.shift();
        effect.deactivate();
      }
      effect.activate({
        event,
        position,
        attackerPosition,
        danger: event.type === 'PlayerEliminated' || event.type === 'KnockbackApplied',
      });
      this.#effects.push(effect);
    }
  }

  update(deltaSeconds) {
    this.#assertUsable();
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    let survivorCount = 0;
    for (const effect of this.#effects) {
      if (effect.update(delta)) {
        effect.deactivate();
        this.#freeEffects.push(effect);
      } else {
        this.#effects[survivorCount] = effect;
        survivorCount += 1;
      }
    }
    this.#effects.length = survivorCount;
  }

  clear() {
    this.#assertUsable();
    for (const effect of this.#effects) {
      effect.deactivate();
      this.#freeEffects.push(effect);
    }
    this.#effects.length = 0;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      effectCount: this.#effects.length,
      maximumEffects: this.#maximumEffects,
      pooledEffects: this.#allEffects.length,
      availableEffects: this.#freeEffects.length,
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const effect of this.#allEffects) {
      try { effect.destroy(); } catch (error) { errors.push(error); }
    }
    this.#effects.length = 0;
    this.#freeEffects.length = 0;
    this.#allEffects.length = 0;
    if (errors.length > 0) {
      const failure = new Error('GreyboxEventEffects 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
