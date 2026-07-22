import * as THREE from 'three';
import { ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { readDataArray } from './strict-data-array.js';

const EFFECT_TARGET_FIELDS = Object.freeze([
  'targetId',
  'participantId',
  'victimId',
  'ownerId',
] as const);

const EFFECT_EVENT_TYPES: ReadonlySet<string> = new Set([
  'HitResolved',
  'KnockbackApplied',
  'DownSmashLanded',
  'PlayerEliminated',
  'PlayerRespawned',
  'EquipmentPickedUp',
]);

const EFFECT_KIND = Object.freeze({
  PULSE: 'pulse',
  IMPACT: 'impact',
} as const);

type EffectKind = typeof EFFECT_KIND[keyof typeof EFFECT_KIND];

const DEFAULT_IMPACT_STREAK_LENGTHS = Object.freeze([1.08, 0.82, 0.62, 0.46]);
const HAMMER_IMPACT_STREAK_LENGTHS = Object.freeze([1.45, 1.05, 0.78, 0.62, 0.48]);
const IMPACT_STREAK_LENGTHS: Readonly<Record<string, readonly number[]>> = Object.freeze({
  default: DEFAULT_IMPACT_STREAK_LENGTHS,
  'hammer-smash': HAMMER_IMPACT_STREAK_LENGTHS,
});

const OPTION_KEYS = new Set<PropertyKey>(['maximumEffects']);

interface PositionSnapshot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface EffectEventSnapshot {
  readonly id: string;
  readonly type: string;
  readonly action: string | null;
  readonly targetId: string | null;
  readonly attackerId: string | null;
}

interface EffectActivation {
  readonly event: EffectEventSnapshot;
  readonly position: PositionSnapshot;
  readonly attackerPosition: PositionSnapshot | null;
  readonly danger: boolean;
}

function ownData(value: unknown, field: PropertyKey, name: string, required = true): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return undefined;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  return descriptor.value;
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function optionalString(value: unknown, name: string): string | null {
  if (value === undefined || value === null) return null;
  return nonEmptyString(value, name);
}

function finiteNumber(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} 必须是有限数。`);
  return value as number;
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function snapshotPosition(value: unknown, name: string): PositionSnapshot | null {
  if (value === null || value === undefined) return null;
  return Object.freeze({
    x: finiteNumber(ownData(value, 'x', name), `${name}.x`),
    y: finiteNumber(ownData(value, 'y', name), `${name}.y`),
    z: finiteNumber(ownData(value, 'z', name), `${name}.z`),
  });
}

function snapshotEvent(value: unknown, index: number): EffectEventSnapshot | null {
  const name = `GreyboxEventEffects.events[${index}]`;
  const type = nonEmptyString(ownData(value, 'type', name), `${name}.type`);
  if (!EFFECT_EVENT_TYPES.has(type)) return null;
  let targetId: string | null = null;
  for (const field of EFFECT_TARGET_FIELDS) {
    const candidate = optionalString(ownData(value, field, name, false), `${name}.${field}`);
    if (targetId === null && candidate !== null) targetId = candidate;
  }
  return Object.freeze({
    id: nonEmptyString(ownData(value, 'id', name), `${name}.id`),
    type,
    action: optionalString(ownData(value, 'action', name, false), `${name}.action`),
    targetId,
    attackerId: optionalString(ownData(value, 'attackerId', name, false), `${name}.attackerId`),
  });
}

function cleanupFailure(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...cleanupCauses]) });
  return failure;
}

function snapshotMethod(value: object, name: string): (...args: unknown[]) => unknown {
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`Three root.${name} 必须是数据方法。`);
      }
      const method = descriptor.value as (...args: unknown[]) => unknown;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`Three root 缺少 ${name}()。`);
}

class PooledEventEffect {
  readonly root: THREE.Group;
  readonly #pulse: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  readonly #impact: THREE.Group;
  readonly #flash: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  readonly #streaks: readonly THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>[];
  readonly #ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  readonly #hookArc: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  readonly #guardArc: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  readonly #disposal: ThreeObjectDisposalLease;
  #eventId: string | null = null;
  #elapsed = 0;
  #duration = 0;
  #scale = 1;
  #kind: EffectKind | null = null;
  #active = false;

  constructor(parent: THREE.Object3D) {
    this.root = new THREE.Group();
    this.root.name = 'ArenaPooledEventEffect';
    this.root.visible = false;

    const material = new THREE.MeshBasicMaterial({
      color: ARENA_GREYBOX_COLOR.teal,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.#pulse = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 20), material);
    this.#pulse.rotation.x = -Math.PI / 2;
    this.#pulse.renderOrder = 4;
    this.root.add(this.#pulse);

    this.#impact = new THREE.Group();
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: ARENA_GREYBOX_COLOR.white,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    });
    this.#flash = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), flashMaterial);
    this.#flash.scale.set(1.4, 0.8, 0.65);
    this.#impact.add(this.#flash);

    const streakMaterial = flashMaterial.clone();
    const streaks: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>[] = [];
    for (let index = 0; index < HAMMER_IMPACT_STREAK_LENGTHS.length; index += 1) {
      const streak = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), streakMaterial);
      streaks.push(streak);
      this.#impact.add(streak);
    }
    this.#streaks = Object.freeze(streaks);

    const ringMaterial = flashMaterial.clone();
    ringMaterial.opacity = 0.8;
    this.#ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24), ringMaterial);
    this.#ring.rotation.x = -Math.PI / 2;
    this.#ring.position.y = -0.45;
    this.#impact.add(this.#ring);

    const accentMaterial = flashMaterial.clone();
    this.#hookArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.045, 7, 18, Math.PI * 1.45),
      accentMaterial,
    );
    this.#hookArc.rotation.z = 0.45;
    this.#hookArc.position.z = -0.12;
    this.#impact.add(this.#hookArc);

    this.#guardArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.055, 7, 18, Math.PI),
      accentMaterial,
    );
    this.#guardArc.rotation.z = Math.PI / 2;
    this.#guardArc.position.z = -0.05;
    this.#impact.add(this.#guardArc);
    this.#impact.renderOrder = 8;
    this.root.add(this.#impact);
    this.#disposal = new ThreeObjectDisposalLease(this.root);
    try {
      const add = snapshotMethod(parent, 'add');
      rejectThenable(add(this.root), 'Three root.add()');
    } catch (error) {
      try { this.#disposal.dispose(); } catch (cleanupError) {
        throw cleanupFailure('Greybox event effect 挂载失败且清理未完整完成。', error, [cleanupError]);
      }
      throw error;
    }
  }

  activate({ event, position, attackerPosition, danger }: EffectActivation): void {
    this.#eventId = event.id;
    this.#elapsed = 0;
    this.#active = true;
    this.root.name = `ArenaEventEffect:${event.id}`;
    this.root.visible = true;
    this.root.rotation.set(0, 0, 0);
    this.root.scale.setScalar(1);
    if (event.type !== 'HitResolved') {
      this.#kind = EFFECT_KIND.PULSE;
      this.#duration = danger ? 0.72 : 0.42;
      this.#pulse.visible = true;
      this.#impact.visible = false;
      this.#pulse.material.color.setHex(
        danger ? ARENA_GREYBOX_COLOR.danger : ARENA_GREYBOX_COLOR.teal,
      );
      this.#pulse.material.opacity = 0.8;
      this.#pulse.scale.setScalar(1);
      this.root.position.set(position.x, position.y + 0.05, position.z);
      return;
    }

    this.#kind = EFFECT_KIND.IMPACT;
    this.#duration = event.action === 'hammer-smash' ? 0.34 : 0.22;
    this.#scale = event.action === 'hammer-smash'
      ? 1.65
      : event.action === 'shield-charge' ? 1.25 : event.action === 'chain-pull' ? 1.1 : 0.9;
    this.#pulse.visible = false;
    this.#impact.visible = true;
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
    this.#flash.material.color.setHex(color);
    this.#flash.material.opacity = 0.95;
    this.#flash.scale.set(1.4, 0.8, 0.65);
    this.#ring.material.color.setHex(color);
    this.#ring.material.opacity = 0.8;
    this.#ring.scale.setScalar(1);
    this.#hookArc.material.color.setHex(color);
    this.#hookArc.material.opacity = 0.95;
    this.#hookArc.visible = event.action === 'chain-pull';
    this.#guardArc.visible = event.action === 'shield-charge';
    const lengths = IMPACT_STREAK_LENGTHS[event.action ?? 'default'] ?? DEFAULT_IMPACT_STREAK_LENGTHS;
    for (const [index, streak] of this.#streaks.entries()) {
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
    this.#impact.scale.setScalar(this.#scale);
  }

  update(deltaSeconds: number): boolean {
    if (!this.#active) return true;
    this.#elapsed += deltaSeconds;
    const progress = Math.min(1, this.#elapsed / this.#duration);
    if (this.#kind === EFFECT_KIND.PULSE) {
      this.#pulse.scale.setScalar(1 + progress * 5);
      this.#pulse.material.opacity = (1 - progress) * 0.78;
      return progress >= 1;
    }
    const punch = Math.sin(Math.min(1, progress * 2) * Math.PI / 2);
    this.#flash.scale.set(1.4 + punch * 1.2, 0.8 + punch * 0.5, 0.65 + punch * 0.3);
    this.#flash.material.opacity = (1 - progress) * 0.95;
    for (const streak of this.#streaks) {
      if (!streak.visible) continue;
      const baseLength = finiteNumber(streak.userData.baseLength, 'Greybox streak baseLength');
      streak.scale.z = baseLength * (0.4 + punch * 1.25);
      streak.material.opacity = (1 - progress) * 0.88;
    }
    this.#ring.scale.setScalar(0.6 + progress * 3.2);
    this.#ring.material.opacity = (1 - progress) * 0.8;
    return progress >= 1;
  }

  deactivate(): void {
    this.#active = false;
    this.#eventId = null;
    this.#kind = null;
    this.root.visible = false;
  }

  destroy(): void { this.#disposal.dispose(); }
}

export class GreyboxEventEffects {
  readonly #effects: PooledEventEffect[] = [];
  readonly #freeEffects: PooledEventEffect[] = [];
  readonly #allEffects: PooledEventEffect[] = [];
  readonly #destroyedEffects = new Set<PooledEventEffect>();
  readonly #maximumEffects: number;
  #disposed = false;
  #destroyRequested = false;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;
  #failedError: unknown = null;

  constructor(rootValue: unknown, options: unknown = {}) {
    if (!(rootValue instanceof THREE.Object3D)) throw new TypeError('GreyboxEventEffects 需要 Object3D root。');
    assertKnownKeys(options, OPTION_KEYS, 'GreyboxEventEffects options');
    const maximumEffectsValue = ownData(options, 'maximumEffects', 'GreyboxEventEffects options', false)
      ?? ARENA_GREYBOX_DESIGN.maximumEffects;
    if (!Number.isSafeInteger(maximumEffectsValue) || (maximumEffectsValue as number) < 0 || (maximumEffectsValue as number) > 256) {
      throw new RangeError('GreyboxEventEffects.maximumEffects 必须是 0～256 的安全整数。');
    }
    this.#maximumEffects = maximumEffectsValue as number;
    try {
      for (let index = 0; index < this.#maximumEffects; index += 1) {
        const effect = new PooledEventEffect(rootValue);
        this.#allEffects.push(effect);
        this.#freeEffects.push(effect);
      }
    } catch (error) {
      const cleanupCauses = this.#cleanupAll();
      if (cleanupCauses.length > 0) {
        throw cleanupFailure('GreyboxEventEffects 构造失败且清理未完整完成。', error, cleanupCauses);
      }
      throw error;
    }
  }

  #assertUsable(): void {
    if (this.#disposed || this.#destroyRequested) throw new Error('GreyboxEventEffects 已销毁。');
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('GreyboxEventEffects 不允许重入。');
    }
  }

  #beginOperation(): void {
    this.#assertUsable();
    this.#operating = true;
    this.#reentryDetected = false;
  }

  #assertNoReentry(): void {
    if (this.#reentryDetected) throw new Error('GreyboxEventEffects 回调发生重入。');
  }

  #cleanupAll(): unknown[] {
    const errors: unknown[] = [];
    for (const effect of this.#allEffects) {
      if (this.#destroyedEffects.has(effect)) continue;
      try {
        effect.destroy();
        this.#destroyedEffects.add(effect);
      } catch (error) { errors.push(error); }
    }
    if (this.#destroyedEffects.size === this.#allEffects.length) {
      this.#effects.length = 0;
      this.#freeEffects.length = 0;
      this.#allEffects.length = 0;
      this.#destroyedEffects.clear();
      this.#disposed = true;
    }
    return errors;
  }

  #fail(error: unknown): never {
    this.#failedError = error;
    this.#destroyRequested = true;
    const cleanupCauses = this.#cleanupAll();
    if (cleanupCauses.length > 0) {
      throw cleanupFailure('GreyboxEventEffects 运行失败且清理未完整完成。', error, cleanupCauses);
    }
    throw error;
  }

  consume(eventsValue: unknown, resolvePositionValue: unknown): void {
    this.#beginOperation();
    try {
      if (typeof resolvePositionValue !== 'function') {
        throw new TypeError('GreyboxEventEffects.resolvePosition 必须是函数。');
      }
      const events = readDataArray(eventsValue, 'GreyboxEventEffects.events');
      const resolvePosition = resolvePositionValue as (participantId: string) => unknown;
      const positions = new Map<string, PositionSnapshot | null>();
      const resolve = (participantId: string): PositionSnapshot | null => {
        if (positions.has(participantId)) return positions.get(participantId) ?? null;
        const result = resolvePosition(participantId);
        rejectThenable(result, 'GreyboxEventEffects.resolvePosition()');
        this.#assertNoReentry();
        const position = snapshotPosition(result, `GreyboxEventEffects position ${participantId}`);
        positions.set(participantId, position);
        return position;
      };
      const activations: EffectActivation[] = [];
      for (let index = 0; index < events.length; index += 1) {
        const event = snapshotEvent(events[index], index);
        if (!event || event.targetId === null) continue;
        const position = resolve(event.targetId);
        if (!position) continue;
        const attackerPosition = event.attackerId === null ? null : resolve(event.attackerId);
        activations.push(Object.freeze({
          event,
          position,
          attackerPosition,
          danger: event.type === 'PlayerEliminated' || event.type === 'KnockbackApplied',
        }));
      }
      this.#assertNoReentry();
      try {
        for (const activation of activations) {
          if (this.#maximumEffects === 0) continue;
          let effect = this.#freeEffects.pop();
          if (!effect) {
            effect = this.#effects.shift();
            if (!effect) throw new Error('GreyboxEventEffects 对象池状态不一致。');
            effect.deactivate();
          }
          effect.activate(activation);
          this.#effects.push(effect);
        }
      } catch (error) { this.#fail(error); }
    } finally {
      this.#operating = false;
    }
  }

  update(deltaSeconds: unknown): void {
    this.#beginOperation();
    try {
      const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds as number : 0));
      let survivorCount = 0;
      try {
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
      } catch (error) { this.#fail(error); }
    } finally {
      this.#operating = false;
    }
  }

  clear(): void {
    this.#beginOperation();
    try {
      try {
        for (const effect of this.#effects) {
          effect.deactivate();
          this.#freeEffects.push(effect);
        }
        this.#effects.length = 0;
      } catch (error) { this.#fail(error); }
    } finally {
      this.#operating = false;
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      effectCount: this.#effects.length,
      maximumEffects: this.#maximumEffects,
      pooledEffects: this.#allEffects.length,
      availableEffects: this.#freeEffects.length,
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('GreyboxEventEffects 清理不可重入。');
    }
    this.#destroyRequested = true;
    this.#cleaning = true;
    const errors = this.#cleanupAll();
    this.#cleaning = false;
    if (errors.length > 0) {
      throw cleanupFailure('GreyboxEventEffects 清理未完整完成。', this.#failedError, errors);
    }
  }
}
