import * as THREE from 'three';
import { createThreeObjectDisposalLease, type ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { toVisualPosition } from './visual-coordinate.js';
import { readDataArray } from './strict-data-array.js';

type UnknownMethod = (...args: unknown[]) => unknown;
export const SURFACE_VIEW_REGISTRY_CONSTRUCTION_LIFECYCLE_V1 = Object.freeze({
  id: 'surface-view-registry-construction-lifecycle-v1',
  partialViewResourcesRetainCleanupOwner: true,
  registryRetainsFailedViewConstructionDebt: true,
  stageCanRetryRegistryConstructionDebt: true,
});
export const SURFACE_VIEW_REGISTRY_TERMINAL_LIFECYCLE_V1 = Object.freeze({
  id: 'surface-view-registry-terminal-lifecycle-v1',
  cleanupCallbacksCannotReenterPublicApi: true,
  cleanupCallbacksMustCompleteSynchronously: true,
  recordFailureStopsLaterCleanup: true,
});
interface SurfaceDefinitionValue {
  readonly id: string;
  readonly center: unknown;
  readonly halfExtents: Readonly<{ x: number; y: number; z: number }>;
}
interface SurfaceState { readonly id: string; readonly enabled: boolean; readonly warning: boolean }
interface SurfaceRecord {
  readonly view: SurfaceView;
  rootDetached: boolean;
  viewDisposed: boolean;
}
interface ConstructionCleanupDebt {
  readonly cleanupComplete: boolean;
  retryCleanup(): void;
}
interface SurfaceViewConstructionUnit {
  readonly dispose: () => unknown;
  disposed: boolean;
}
interface SurfaceViewConstructionResources {
  readonly root: THREE.Group;
  lease: ThreeObjectDisposalLease | null;
  readonly units: SurfaceViewConstructionUnit[];
  rootCleared: boolean;
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

function data(value: unknown, field: string, name: string, required = true): unknown {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${field} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${field} 必须是数据字段。`);
  return descriptor.value;
}

function nonEmpty(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function dimensions(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  const x = data(value, 'x', name);
  const y = data(value, 'y', name);
  const z = data(value, 'z', name);
  if (![x, y, z].every((axis) => Number.isFinite(axis) && (axis as number) > 0)) {
    throw new RangeError(`${name} 必须包含大于零的有限数 x/y/z。`);
  }
  return Object.freeze({ x, y, z }) as Readonly<{ x: number; y: number; z: number }>;
}

function normalizeDefinitions(value: unknown): readonly SurfaceDefinitionValue[] {
  const entries = readDataArray(value, 'Surface definitions', { nonEmpty: true });
  const ids = new Set<string>();
  return Object.freeze(entries.map((definition, index) => {
    const name = `Surface definitions[${index}]`;
    const id = nonEmpty(data(definition, 'id', name), `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复 surface ${id}。`);
    ids.add(id);
    const center = data(definition, 'center', name);
    toVisualPosition(center);
    return Object.freeze({ id, center, halfExtents: dimensions(data(definition, 'halfExtents', name), `${name}.halfExtents`) });
  }));
}

function snapOption(value: unknown): boolean {
  if (value === undefined) return false;
  if (!value || typeof value !== 'object') throw new TypeError('SurfaceViewRegistry sync options 必须是对象。');
  if (Reflect.ownKeys(value).some((key) => key !== 'snap')) throw new TypeError('SurfaceViewRegistry sync options 包含未知字段。');
  const descriptor = Object.getOwnPropertyDescriptor(value, 'snap');
  if (!descriptor) return false;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'boolean') {
    throw new TypeError('SurfaceViewRegistry snap 必须是布尔数据字段。');
  }
  return descriptor.value;
}

function warningSurfaceIds(value: unknown): ReadonlySet<string> {
  const occurrences = readDataArray(value, 'map.occurrences');
  const ids = new Set<string>();
  occurrences.forEach((occurrence, index) => {
    const name = `map.occurrences[${index}]`;
    const kind = data(occurrence, 'kind', name);
    const phase = data(occurrence, 'phase', name);
    if (kind !== 'collapse-surfaces' || phase !== 'warning') return;
    const payload = data(occurrence, 'publicPayload', name, false);
    if (payload === null || payload === undefined) return;
    const surfaceIds = data(payload, 'surfaceIds', `${name}.publicPayload`, false);
    if (surfaceIds === undefined) return;
    const entries = readDataArray(surfaceIds, `${name}.publicPayload.surfaceIds`);
    for (const [surfaceIndex, id] of entries.entries()) {
      ids.add(nonEmpty(id, `${name}.publicPayload.surfaceIds[${surfaceIndex}]`));
    }
  });
  return ids;
}

class SurfaceView {
  readonly root: THREE.Group;
  readonly #id: string;
  readonly #mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  readonly #edge: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  readonly #baseY: number;
  readonly #disposal: ThreeObjectDisposalLease;
  #enabled = true;
  #warning = false;
  #elapsed = 0;
  #appliedStyleKey: string | null = null;

  constructor(definition: SurfaceDefinitionValue) {
    this.#id = definition.id;
    this.root = new THREE.Group();
    const construction: SurfaceViewConstructionResources = {
      root: this.root,
      lease: null,
      units: [],
      rootCleared: false,
    };
    const track = <T extends { dispose(): unknown }>(resource: T): T => {
      construction.units.push({ dispose: () => resource.dispose(), disposed: false });
      return resource;
    };
    try {
      this.root.name = `ArenaSurface:${definition.id}`;
      const size = definition.halfExtents;
      const geometry = track(new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2));
      const material = track(new THREE.MeshStandardMaterial({
        color: ARENA_GREYBOX_COLOR.platform, roughness: 0.9, metalness: 0, transparent: true, opacity: 1,
      }));
      this.#mesh = new THREE.Mesh(geometry, material);
      this.#mesh.castShadow = true;
      this.#mesh.receiveShadow = true;
      const edgeGeometry = track(new THREE.EdgesGeometry(geometry, 25));
      const edgeMaterial = track(new THREE.LineBasicMaterial({
        color: ARENA_GREYBOX_COLOR.platformEdge, transparent: true, opacity: 0.55,
      }));
      this.#edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      this.#edge.scale.setScalar(1.002);
      this.root.add(this.#mesh, this.#edge);
      const visual = toVisualPosition(definition.center);
      this.root.position.set(visual.x, visual.y, visual.z);
      this.#baseY = visual.y;
      const disposal = createThreeObjectDisposalLease(this.root, { removeFromParent: false });
      construction.lease = disposal;
      this.#disposal = disposal;
    } catch (error) {
      try { cleanupSurfaceViewConstruction(construction); }
      catch (cleanupError) {
        throw new SurfaceViewConstructionCleanupError(error, cleanupError, construction);
      }
      throw error;
    }
  }

  sync(state: SurfaceState, snap: boolean): void {
    if (state.id !== this.#id) throw new RangeError('SurfaceView 身份不一致。');
    this.#enabled = state.enabled;
    this.#warning = state.warning;
    if (snap) this.root.position.y = this.#baseY - (state.enabled ? 0 : ARENA_GREYBOX_DESIGN.surfaceDropDistance);
  }

  update(deltaSeconds: unknown): void {
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds as number : 0));
    this.#elapsed += delta;
    const targetY = this.#baseY - (this.#enabled ? 0 : ARENA_GREYBOX_DESIGN.surfaceDropDistance);
    const heightDelta = targetY - this.root.position.y;
    this.root.position.y = Math.abs(heightDelta) > 0.0001
      ? this.root.position.y + heightDelta * (1 - Math.exp(-7 * delta)) : targetY;
    const styleKey = `${this.#enabled}:${this.#warning}`;
    if (!this.#warning && styleKey === this.#appliedStyleKey) return;
    const pulse = 0.5 + Math.sin(this.#elapsed * 8) * 0.5;
    this.#mesh.material.color.setHex(this.#warning ? ARENA_GREYBOX_COLOR.warning
      : this.#enabled ? ARENA_GREYBOX_COLOR.platform : ARENA_GREYBOX_COLOR.platformDisabled);
    this.#mesh.material.emissive.setHex(this.#warning ? ARENA_GREYBOX_COLOR.danger : 0x000000);
    this.#mesh.material.emissiveIntensity = this.#warning ? 0.08 + pulse * 0.12 : 0;
    this.#mesh.material.opacity = this.#enabled ? 1 : 0.25;
    this.#edge.material.opacity = this.#warning ? 0.9 : this.#enabled ? 0.55 : 0.12;
    this.#appliedStyleKey = styleKey;
  }

  getDebugSnapshot(): Readonly<SurfaceState> {
    return Object.freeze({ id: this.#id, enabled: this.#enabled, warning: this.#warning });
  }

  dispose(): void { this.#disposal.dispose(); }
}

function aggregate(message: string, cause: unknown, errors: readonly unknown[]): Error {
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

function surfaceViewConstructionComplete(resources: SurfaceViewConstructionResources): boolean {
  return resources.lease?.complete
    ?? (resources.rootCleared && resources.units.every(({ disposed }) => disposed));
}

function cleanupSurfaceViewConstruction(resources: SurfaceViewConstructionResources): void {
  const errors: unknown[] = [];
  if (resources.lease !== null) {
    if (!resources.lease.complete) {
      try { resources.lease.dispose(); } catch (error) { errors.push(error); }
    }
  } else {
    if (!resources.rootCleared) {
      try {
        rejectThenable(resources.root.clear(), 'SurfaceView construction root.clear()');
        resources.rootCleared = true;
      } catch (error) { errors.push(error); }
    }
    if (resources.rootCleared) {
      for (const unit of resources.units) {
        if (unit.disposed) continue;
        try {
          rejectThenable(unit.dispose(), 'SurfaceView construction resource.dispose()');
          unit.disposed = true;
        } catch (error) { errors.push(error); }
      }
    }
  }
  if (errors.length > 0) throw new AggregateError(errors, 'SurfaceView 构造资源清理未完整完成。');
  if (!surfaceViewConstructionComplete(resources)) {
    throw new Error('SurfaceView 构造资源清理依赖尚未收敛。');
  }
}

class SurfaceViewConstructionCleanupError extends AggregateError implements ConstructionCleanupDebt {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: SurfaceViewConstructionResources;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: SurfaceViewConstructionResources,
  ) {
    super([originalError, cleanupError], 'SurfaceView 构造失败且清理未完整完成。');
    this.name = 'SurfaceViewConstructionCleanupError';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean { return surfaceViewConstructionComplete(this.#resources); }
  retryCleanup(): void { cleanupSurfaceViewConstruction(this.#resources); }
}

export class SurfaceViewRegistryConstructionCleanupError extends AggregateError implements ConstructionCleanupDebt {
  readonly originalError: unknown;
  readonly cleanupErrors: readonly unknown[];
  readonly #retry: () => readonly unknown[];
  readonly #complete: () => boolean;

  constructor(
    originalError: unknown,
    cleanupErrors: readonly unknown[],
    retry: () => readonly unknown[],
    complete: () => boolean,
  ) {
    super([originalError, ...cleanupErrors], 'SurfaceViewRegistry 构造失败且清理未完整完成。');
    this.name = 'SurfaceViewRegistryConstructionCleanupError';
    this.originalError = originalError;
    this.cleanupErrors = Object.freeze([...cleanupErrors]);
    this.#retry = retry;
    this.#complete = complete;
  }

  get cleanupComplete(): boolean { return this.#complete(); }
  retryCleanup(): void {
    const errors = this.#retry();
    if (errors.length > 0) throw new AggregateError(errors, 'SurfaceViewRegistry 构造清理重试未完整完成。');
    if (!this.#complete()) throw new Error('SurfaceViewRegistry 构造清理依赖尚未收敛。');
  }
}

export class SurfaceViewRegistry {
  readonly #add: UnknownMethod;
  readonly #remove: UnknownMethod;
  readonly #views = new Map<string, SurfaceRecord>();
  #constructionDebt: SurfaceViewConstructionCleanupError | null = null;
  #disposed = false;
  #failedError: unknown = null;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;

  constructor(root: unknown, definitionsValue: unknown) {
    this.#add = snapshotMethod(root, 'SurfaceViewRegistry root', 'add');
    this.#remove = snapshotMethod(root, 'SurfaceViewRegistry root', 'remove');
    const definitions = normalizeDefinitions(definitionsValue);
    try {
      for (const definition of definitions) {
        const view = new SurfaceView(definition);
        this.#views.set(definition.id, { view, rootDetached: false, viewDisposed: false });
        rejectThenable(this.#add(view.root), 'SurfaceViewRegistry root.add()');
      }
    } catch (error) {
      this.#failedError = error;
      if (error instanceof SurfaceViewConstructionCleanupError) this.#constructionDebt = error;
      const cleanupErrors = this.#cleanupAll();
      if (cleanupErrors.length > 0 || !this.#constructionCleanupComplete()) {
        throw new SurfaceViewRegistryConstructionCleanupError(
          error,
          cleanupErrors,
          () => this.#cleanupAll(),
          () => this.#constructionCleanupComplete(),
        );
      }
      throw error;
    }
  }

  #assertUsable(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('SurfaceViewRegistry 不允许重入。');
    }
    if (this.#disposed) throw new Error('SurfaceViewRegistry 已销毁。');
    if (this.#failedError) { const error = new Error('SurfaceViewRegistry 已失败。'); error.cause = this.#failedError; throw error; }
  }

  #cleanupAll(): unknown[] {
    if (this.#cleaning) {
      this.#reentryDetected = true;
      return [new Error('SurfaceViewRegistry 清理不可重入。')];
    }
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      this.#reentryDetected = false;
      if (this.#constructionDebt !== null) {
        try { this.#constructionDebt.retryCleanup(); }
        catch (error) { errors.push(error); }
        if (this.#constructionDebt.cleanupComplete) this.#constructionDebt = null;
      }
      for (const [id, record] of this.#views) {
        if (this.#reentryDetected) break;
        const errorCount = errors.length;
        if (!record.rootDetached) {
          try {
            rejectThenable(this.#remove(record.view.root), 'SurfaceViewRegistry root.remove()');
            if (this.#reentryDetected) throw new Error('SurfaceViewRegistry remove回调发生公开API重入。');
            record.rootDetached = true;
          } catch (error) { errors.push(error); }
        }
        if (!this.#reentryDetected && record.rootDetached && !record.viewDisposed) {
          try {
            rejectThenable(record.view.dispose(), 'SurfaceViewRegistry view.dispose()');
            if (this.#reentryDetected) throw new Error('SurfaceViewRegistry dispose回调发生公开API重入。');
            record.viewDisposed = true;
          } catch (error) { errors.push(error); }
        }
        if (record.rootDetached && record.viewDisposed) this.#views.delete(id);
        if (errors.length > errorCount) break;
      }
    } finally { this.#cleaning = false; }
    return errors;
  }

  #constructionCleanupComplete(): boolean {
    return this.#constructionDebt === null && this.#views.size === 0;
  }

  #fail(error: unknown): never {
    this.#failedError = error;
    const errors = this.#cleanupAll();
    if (errors.length > 0) throw aggregate('SurfaceViewRegistry 失败关闭时清理未完整完成。', error, errors);
    throw error;
  }

  sync(mapValue: unknown, options: unknown = {}): void {
    this.#assertUsable();
    const snap = snapOption(options);
    const surfacesValue = data(mapValue, 'surfaces', 'SurfaceViewRegistry map');
    const occurrences = data(mapValue, 'occurrences', 'SurfaceViewRegistry map');
    const surfaceEntries = readDataArray(surfacesValue, 'SurfaceViewRegistry map.surfaces');
    if (surfaceEntries.length !== this.#views.size) {
      throw new RangeError('SurfaceViewRegistry 快照数量不一致。');
    }
    const warnings = warningSurfaceIds(occurrences);
    for (const id of warnings) {
      if (!this.#views.has(id)) throw new RangeError(`SurfaceViewRegistry warning 引用未知 surface ${id}。`);
    }
    const seen = new Set<string>();
    const states = Object.freeze(surfaceEntries.map((surface, index) => {
      const name = `map.surfaces[${index}]`;
      const id = nonEmpty(data(surface, 'id', name), `${name}.id`);
      if (seen.has(id)) throw new RangeError(`SurfaceViewRegistry surface ${id} 重复。`);
      seen.add(id);
      if (!this.#views.has(id)) throw new RangeError(`SurfaceViewRegistry 缺少 ${id}。`);
      const enabled = data(surface, 'enabled', name);
      if (typeof enabled !== 'boolean') throw new TypeError(`${name}.enabled 必须是布尔值。`);
      return Object.freeze({ id, enabled, warning: warnings.has(id) });
    }));
    this.#operating = true;
    this.#reentryDetected = false;
    try { for (const state of states) this.#views.get(state.id)?.view.sync(state, snap); }
    catch (error) { this.#operating = false; this.#fail(error); }
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
    const surfaces = Object.freeze([...this.#views.values()].map(({ view }) => view.getDebugSnapshot()));
    return Object.freeze({
      surfaceCount: this.#views.size,
      warningSurfaceCount: surfaces.filter(({ warning }) => warning).length,
      disabledSurfaceCount: surfaces.filter(({ enabled }) => !enabled).length,
      surfaces,
    });
  }

  dispose(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('SurfaceViewRegistry 清理不可重入。');
    }
    if (!this.#disposed) this.#disposed = true;
    const errors = this.#cleanupAll();
    if (errors.length > 0) throw aggregate('SurfaceViewRegistry 清理未完整完成。', this.#failedError, errors);
  }
}
