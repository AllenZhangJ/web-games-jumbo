import type * as THREE from 'three';
import { createThreeObjectDisposalLease, type ThreeObjectDisposalLease } from './dispose-three-resources.js';
import {
  createProgrammaticEquipment,
  ProgrammaticEquipmentBuildConstructionCleanupError,
} from './programmatic-equipment.js';
import { readDataArray } from './strict-data-array.js';

type UnknownMethod = (...args: unknown[]) => unknown;
export const EQUIPMENT_VIEW_REGISTRY_TERMINAL_LIFECYCLE_V1 = Object.freeze({
  id: 'equipment-view-registry-terminal-lifecycle-v1',
  cleanupCallbacksCannotReenterPublicApi: true,
  cleanupCallbacksMustCompleteSynchronously: true,
  recordFailureStopsLaterCleanup: true,
});
export const EQUIPMENT_VIEW_REGISTRY_RUNTIME_CONSTRUCTION_LIFECYCLE_V1 = Object.freeze({
  id: 'equipment-view-registry-runtime-construction-lifecycle-v1',
  worldViewOwnsBuilderDebtAndRawRoot: true,
  registryRetriesUnpublishedWorldViewDebt: true,
});

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

interface WorldEquipmentViewConstructionResources {
  nestedDebt: ProgrammaticEquipmentBuildConstructionCleanupError | null;
  root: THREE.Group | null;
  disposal: ThreeObjectDisposalLease | null;
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

function worldEquipmentViewConstructionCleanupComplete(
  resources: WorldEquipmentViewConstructionResources,
): boolean {
  return resources.nestedDebt === null
    && (resources.root === null || resources.disposal?.complete === true);
}

function cleanupWorldEquipmentViewConstruction(
  resources: WorldEquipmentViewConstructionResources,
): void {
  const errors: unknown[] = [];
  if (resources.nestedDebt !== null) {
    try { resources.nestedDebt.retryCleanup(); } catch (error) { errors.push(error); }
    if (resources.nestedDebt.cleanupComplete) resources.nestedDebt = null;
  }
  if (resources.root !== null) {
    if (resources.disposal === null) {
      try {
        resources.disposal = createThreeObjectDisposalLease(
          resources.root,
          { removeFromParent: false },
        );
      } catch (error) { errors.push(error); }
    }
    if (resources.disposal !== null && !resources.disposal.complete) {
      try { resources.disposal.dispose(); } catch (error) { errors.push(error); }
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'WorldEquipmentView 构造资源清理未完整完成。');
  }
  if (!worldEquipmentViewConstructionCleanupComplete(resources)) {
    throw new Error('WorldEquipmentView 构造资源清理依赖尚未收敛。');
  }
}

export class WorldEquipmentViewConstructionCleanupError extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: WorldEquipmentViewConstructionResources;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: WorldEquipmentViewConstructionResources,
  ) {
    super([originalError, cleanupError], 'WorldEquipmentView 构造失败且清理未完整完成。');
    this.name = 'WorldEquipmentViewConstructionCleanupError';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return worldEquipmentViewConstructionCleanupComplete(this.#resources);
  }

  retryCleanup(): void { cleanupWorldEquipmentViewConstruction(this.#resources); }
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
    const construction: WorldEquipmentViewConstructionResources = {
      nestedDebt: null,
      root: null,
      disposal: null,
    };
    try {
      const root = createProgrammaticEquipment(item.definitionId);
      construction.root = root;
      root.name = `ArenaEquipment:${item.instanceId}`;
      root.scale.setScalar(0.85);
      const disposal = createThreeObjectDisposalLease(root, { removeFromParent: false });
      construction.disposal = disposal;
      this.root = root;
      this.#disposal = disposal;
      this.sync(item, true);
    } catch (error) {
      if (error instanceof ProgrammaticEquipmentBuildConstructionCleanupError) {
        construction.nestedDebt = error;
      }
      try { cleanupWorldEquipmentViewConstruction(construction); }
      catch (cleanupError) {
        throw new WorldEquipmentViewConstructionCleanupError(error, cleanupError, construction);
      }
      throw error;
    }
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

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

export class EquipmentViewRegistry {
  readonly #add: UnknownMethod;
  readonly #remove: UnknownMethod;
  readonly #views = new Map<string, EquipmentRecord>();
  #constructionDebt: WorldEquipmentViewConstructionCleanupError | null = null;
  #disposed = false;
  #failedError: unknown = null;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;

  constructor(root: unknown) {
    this.#add = snapshotMethod(root, 'EquipmentViewRegistry root', 'add');
    this.#remove = snapshotMethod(root, 'EquipmentViewRegistry root', 'remove');
  }

  #assertUsable(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('EquipmentViewRegistry 不允许重入。');
    }
    if (this.#disposed) throw new Error('EquipmentViewRegistry 已销毁。');
    if (this.#failedError) {
      const error = new Error('EquipmentViewRegistry 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
  }

  #cleanupRecord(record: EquipmentRecord): unknown[] {
    const errors: unknown[] = [];
    if (!record.rootDetached) {
      try {
        rejectThenable(this.#remove(record.view.root), 'EquipmentViewRegistry root.remove()');
        if (this.#reentryDetected) throw new Error('EquipmentViewRegistry remove回调发生公开API重入。');
        record.rootDetached = true;
      } catch (error) { errors.push(error); }
    }
    if (!this.#reentryDetected && record.rootDetached && !record.viewDisposed) {
      try {
        rejectThenable(record.view.dispose(), 'EquipmentViewRegistry view.dispose()');
        if (this.#reentryDetected) throw new Error('EquipmentViewRegistry dispose回调发生公开API重入。');
        record.viewDisposed = true;
      } catch (error) { errors.push(error); }
    }
    return errors;
  }

  #cleanupAll(): unknown[] {
    if (this.#cleaning) {
      this.#reentryDetected = true;
      return [new Error('EquipmentViewRegistry 清理不可重入。')];
    }
    this.#cleaning = true;
    this.#reentryDetected = false;
    const errors: unknown[] = [];
    try {
      if (this.#constructionDebt !== null) {
        try { this.#constructionDebt.retryCleanup(); }
        catch (error) { errors.push(error); }
        if (this.#constructionDebt.cleanupComplete) this.#constructionDebt = null;
      }
      for (const [id, record] of this.#views) {
        if (this.#reentryDetected) break;
        const errorCount = errors.length;
        errors.push(...this.#cleanupRecord(record));
        if (record.rootDetached && record.viewDisposed) this.#views.delete(id);
        if (errors.length > errorCount) break;
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
    this.#reentryDetected = false;
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
          rejectThenable(this.#add(view.root), 'EquipmentViewRegistry root.add()');
        }
        record.view.sync(item, snap);
      }
    } catch (error) {
      if (error instanceof WorldEquipmentViewConstructionCleanupError) {
        this.#constructionDebt = error;
      }
      this.#operating = false;
      this.#fail(error);
    }
    this.#operating = false;
  }

  update(deltaSeconds: unknown): void {
    this.#assertUsable();
    this.#operating = true;
    this.#reentryDetected = false;
    try { for (const { view } of this.#views.values()) view.update(deltaSeconds); }
    catch (error) { this.#operating = false; this.#fail(error); }
    this.#operating = false;
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({ equipmentCount: this.#views.size });
  }

  dispose(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('EquipmentViewRegistry 清理不可重入。');
    }
    if (!this.#disposed) this.#disposed = true;
    const errors = this.#cleanupAll();
    if (errors.length > 0) throw cleanupFailure('EquipmentViewRegistry 清理未完整完成。', this.#failedError, errors);
  }
}
