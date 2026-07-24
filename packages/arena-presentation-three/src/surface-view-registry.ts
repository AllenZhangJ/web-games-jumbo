import * as THREE from 'three';
import { createThreeObjectDisposalLease, type ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { toVisualPosition } from './visual-coordinate.js';
import { readDataArray } from './strict-data-array.js';

type UnknownMethod = (...args: unknown[]) => unknown;
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
    this.root.name = `ArenaSurface:${definition.id}`;
    const size = definition.halfExtents;
    const geometry = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
    const material = new THREE.MeshStandardMaterial({
      color: ARENA_GREYBOX_COLOR.platform, roughness: 0.9, metalness: 0, transparent: true, opacity: 1,
    });
    this.#mesh = new THREE.Mesh(geometry, material);
    this.#mesh.castShadow = true;
    this.#mesh.receiveShadow = true;
    this.#edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), new THREE.LineBasicMaterial({
      color: ARENA_GREYBOX_COLOR.platformEdge, transparent: true, opacity: 0.55,
    }));
    this.#edge.scale.setScalar(1.002);
    this.root.add(this.#mesh, this.#edge);
    const visual = toVisualPosition(definition.center);
    this.root.position.set(visual.x, visual.y, visual.z);
    this.#baseY = visual.y;
    this.#disposal = createThreeObjectDisposalLease(this.root, { removeFromParent: false });
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

export class SurfaceViewRegistry {
  readonly #add: UnknownMethod;
  readonly #remove: UnknownMethod;
  readonly #views = new Map<string, SurfaceRecord>();
  #disposed = false;
  #failedError: unknown = null;
  #operating = false;
  #cleaning = false;

  constructor(root: unknown, definitionsValue: unknown) {
    this.#add = snapshotMethod(root, 'SurfaceViewRegistry root', 'add');
    this.#remove = snapshotMethod(root, 'SurfaceViewRegistry root', 'remove');
    const definitions = normalizeDefinitions(definitionsValue);
    try {
      for (const definition of definitions) {
        const view = new SurfaceView(definition);
        this.#views.set(definition.id, { view, rootDetached: false, viewDisposed: false });
        this.#add(view.root);
      }
    } catch (error) {
      this.#failedError = error;
      const cleanupErrors = this.#cleanupAll();
      if (cleanupErrors.length > 0) throw aggregate('SurfaceViewRegistry 构造失败且清理未完整完成。', error, cleanupErrors);
      throw error;
    }
  }

  #assertUsable(): void {
    if (this.#disposed) throw new Error('SurfaceViewRegistry 已销毁。');
    if (this.#failedError) { const error = new Error('SurfaceViewRegistry 已失败。'); error.cause = this.#failedError; throw error; }
    if (this.#operating) throw new Error('SurfaceViewRegistry 不允许回调重入。');
  }

  #cleanupAll(): unknown[] {
    if (this.#cleaning) return [new Error('SurfaceViewRegistry 清理不可重入。')];
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      for (const [id, record] of this.#views) {
        if (!record.rootDetached) {
          try { this.#remove(record.view.root); record.rootDetached = true; } catch (error) { errors.push(error); }
        }
        if (!record.viewDisposed) {
          try { record.view.dispose(); record.viewDisposed = true; } catch (error) { errors.push(error); }
        }
        if (record.rootDetached && record.viewDisposed) this.#views.delete(id);
      }
    } finally { this.#cleaning = false; }
    return errors;
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
    try { for (const state of states) this.#views.get(state.id)?.view.sync(state, snap); }
    catch (error) { this.#operating = false; this.#fail(error); }
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
    const surfaces = Object.freeze([...this.#views.values()].map(({ view }) => view.getDebugSnapshot()));
    return Object.freeze({
      surfaceCount: this.#views.size,
      warningSurfaceCount: surfaces.filter(({ warning }) => warning).length,
      disabledSurfaceCount: surfaces.filter(({ enabled }) => !enabled).length,
      surfaces,
    });
  }

  dispose(): void {
    if (!this.#disposed) this.#disposed = true;
    const errors = this.#cleanupAll();
    if (errors.length > 0) throw aggregate('SurfaceViewRegistry 清理未完整完成。', this.#failedError, errors);
  }
}
