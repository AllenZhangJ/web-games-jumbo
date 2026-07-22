import * as THREE from 'three';
import { createThreeObjectDisposalLease, type ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { createProgrammaticEquipment } from './programmatic-equipment.js';
import { readDataArray } from './strict-data-array.js';

type UnknownMethod = (...args: unknown[]) => unknown;

interface PositionValue { readonly x: number; readonly y: number; readonly z: number }
interface EquipmentSnapshot {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly position: PositionValue | null;
  readonly locationState: string;
}

interface EquipmentRecord {
  readonly view: WorldEquipmentView;
  rootDetached: boolean;
  viewDisposed: boolean;
}

function snapshotMethod(value: unknown, name: string, methodName: string): UnknownMethod {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`${name} 缺少 ${methodName}()。`);
}

function data(value: unknown, field: string, name: string): unknown {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${field} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function nonEmpty(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function position(value: unknown, name: string): PositionValue {
  const result = { x: data(value, 'x', name), y: data(value, 'y', name), z: data(value, 'z', name) };
  if (!Number.isFinite(result.x) || !Number.isFinite(result.y) || !Number.isFinite(result.z)) {
    throw new TypeError(`${name} 必须包含有限数 x/y/z。`);
  }
  return Object.freeze(result) as PositionValue;
}

function normalizeItems(value: unknown): readonly EquipmentSnapshot[] {
  const entries = readDataArray(value, 'EquipmentViewRegistry items');
  const seen = new Set<string>();
  const locationStates = new Set(['spawned', 'held', 'dropped', 'despawned']);
  return Object.freeze(entries.map((item, index) => {
    const name = `EquipmentViewRegistry items[${index}]`;
    const instanceId = nonEmpty(data(item, 'instanceId', name), `${name}.instanceId`);
    if (seen.has(instanceId)) throw new RangeError(`EquipmentViewRegistry item ${instanceId} 重复。`);
    seen.add(instanceId);
    const positionValue = data(item, 'position', name);
    const locationState = nonEmpty(data(item, 'locationState', name), `${name}.locationState`);
    if (!locationStates.has(locationState)) {
      throw new RangeError(`${name}.locationState 不受支持：${locationState}。`);
    }
    const isWorldItem = locationState === 'spawned' || locationState === 'dropped';
    if (isWorldItem !== (positionValue !== null)) {
      throw new RangeError(`${name} 的 locationState 与 position 不一致。`);
    }
    return Object.freeze({
      instanceId,
      definitionId: nonEmpty(data(item, 'definitionId', name), `${name}.definitionId`),
      position: positionValue === null ? null : position(positionValue, `${name}.position`),
      locationState,
    });
  }));
}

function snapOption(value: unknown): boolean {
  if (value === undefined) return false;
  if (!value || typeof value !== 'object') throw new TypeError('EquipmentViewRegistry sync options 必须是对象。');
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => key !== 'snap')) throw new TypeError('EquipmentViewRegistry sync options 包含未知字段。');
  const descriptor = Object.getOwnPropertyDescriptor(value, 'snap');
  if (!descriptor) return false;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'boolean') {
    throw new TypeError('EquipmentViewRegistry snap 必须是布尔数据字段。');
  }
  return descriptor.value;
}

class WorldEquipmentView {
  readonly root: THREE.Group;
  readonly #instanceId: string;
  readonly #definitionId: string;
  readonly #disposal: ThreeObjectDisposalLease;
  #baseY = 0;
  #targetX = 0;
  #targetZ = 0;
  #elapsed = 0;

  constructor(item: EquipmentSnapshot) {
    this.#instanceId = item.instanceId;
    this.#definitionId = item.definitionId;
    this.root = createProgrammaticEquipment(item.definitionId);
    this.root.name = `ArenaEquipment:${item.instanceId}`;
    this.root.scale.setScalar(0.85);
    this.#disposal = createThreeObjectDisposalLease(this.root, { removeFromParent: false });
    this.sync(item, true);
  }

  get definitionId(): string { return this.#definitionId; }

  sync(item: EquipmentSnapshot, snap: boolean): void {
    if (item.instanceId !== this.#instanceId || item.definitionId !== this.#definitionId || !item.position) {
      throw new RangeError('WorldEquipmentView 身份或位置不一致。');
    }
    this.#targetX = -item.position.x;
    this.#targetZ = item.position.z;
    this.#baseY = item.position.y + 0.34;
    if (snap) this.root.position.set(this.#targetX, this.#baseY, this.#targetZ);
  }

  update(deltaSeconds: unknown): void {
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds as number : 0));
    this.#elapsed += delta;
    this.root.position.x += (this.#targetX - this.root.position.x) * (1 - Math.exp(-16 * delta));
    this.root.position.z += (this.#targetZ - this.root.position.z) * (1 - Math.exp(-16 * delta));
    this.root.position.y = this.#baseY + Math.sin(this.#elapsed * 3.4) * 0.1;
    this.root.rotation.y += delta * 0.8;
  }

  dispose(): void { this.#disposal.dispose(); }
}

function cleanupFailure(message: string, cause: unknown, errors: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...errors]) });
  return failure;
}

export class EquipmentViewRegistry {
  readonly #add: UnknownMethod;
  readonly #remove: UnknownMethod;
  readonly #views = new Map<string, EquipmentRecord>();
  #disposed = false;
  #failedError: unknown = null;
  #operating = false;
  #cleaning = false;

  constructor(root: unknown) {
    this.#add = snapshotMethod(root, 'EquipmentViewRegistry root', 'add');
    this.#remove = snapshotMethod(root, 'EquipmentViewRegistry root', 'remove');
  }

  #assertUsable(): void {
    if (this.#disposed) throw new Error('EquipmentViewRegistry 已销毁。');
    if (this.#failedError) {
      const error = new Error('EquipmentViewRegistry 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
    if (this.#operating) throw new Error('EquipmentViewRegistry 不允许回调重入。');
  }

  #cleanupRecord(record: EquipmentRecord): unknown[] {
    const errors: unknown[] = [];
    if (!record.rootDetached) {
      try { this.#remove(record.view.root); record.rootDetached = true; } catch (error) { errors.push(error); }
    }
    if (!record.viewDisposed) {
      try { record.view.dispose(); record.viewDisposed = true; } catch (error) { errors.push(error); }
    }
    return errors;
  }

  #cleanupAll(): unknown[] {
    if (this.#cleaning) return [new Error('EquipmentViewRegistry 清理不可重入。')];
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      for (const [id, record] of this.#views) {
        errors.push(...this.#cleanupRecord(record));
        if (record.rootDetached && record.viewDisposed) this.#views.delete(id);
      }
    } finally { this.#cleaning = false; }
    return errors;
  }

  #fail(error: unknown): never {
    this.#failedError = error;
    const cleanupErrors = this.#cleanupAll();
    if (cleanupErrors.length > 0) throw cleanupFailure('EquipmentViewRegistry 失败关闭时清理未完整完成。', error, cleanupErrors);
    throw error;
  }

  sync(itemsValue: unknown, options: unknown = {}): void {
    this.#assertUsable();
    const items = normalizeItems(itemsValue);
    const snap = snapOption(options);
    const active = new Map(items.filter((item) => item.position !== null
      && (item.locationState === 'spawned' || item.locationState === 'dropped'))
      .map((item) => [item.instanceId, item]));
    this.#operating = true;
    try {
      for (const [id, record] of this.#views) {
        const item = active.get(id);
        if (item && item.definitionId === record.view.definitionId) continue;
        const errors = this.#cleanupRecord(record);
        if (errors.length > 0) throw cleanupFailure(`装备表现 ${id} 清理未完整完成。`, null, errors);
        this.#views.delete(id);
      }
      for (const [id, item] of active) {
        let record = this.#views.get(id);
        if (!record) {
          const view = new WorldEquipmentView(item);
          record = { view, rootDetached: false, viewDisposed: false };
          this.#views.set(id, record);
          this.#add(view.root);
        }
        record.view.sync(item, snap);
      }
    } catch (error) {
      this.#operating = false;
      this.#fail(error);
    }
    this.#operating = false;
  }

  update(deltaSeconds: unknown): void {
    this.#assertUsable();
    this.#operating = true;
    try { for (const { view } of this.#views.values()) view.update(deltaSeconds); }
    catch (error) { this.#operating = false; this.#fail(error); }
    this.#operating = false;
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({ equipmentCount: this.#views.size });
  }

  dispose(): void {
    if (!this.#disposed) this.#disposed = true;
    const errors = this.#cleanupAll();
    if (errors.length > 0) throw cleanupFailure('EquipmentViewRegistry 清理未完整完成。', this.#failedError, errors);
  }
}
