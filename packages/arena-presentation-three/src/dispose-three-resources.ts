import * as THREE from 'three';

export interface ThreeDisposalReport {
  readonly geometries: number;
  readonly materials: number;
  readonly textures: number;
}

type UnknownMethod = (...args: unknown[]) => unknown;

interface DisposalUnit {
  readonly dispose: () => unknown;
  disposed: boolean;
}

export const THREE_OBJECT_DISPOSAL_LEASE_TERMINAL_LIFECYCLE_V1 = Object.freeze({
  id: 'three-object-disposal-lease-terminal-lifecycle-v1',
  cleanupCallbacksCannotReenterLeaseApi: true,
  cleanupCallbacksMustCompleteSynchronously: true,
  failedUnitStopsLaterCleanup: true,
  detachWaitsForAllResources: true,
});

function snapshotMethod(value: object, name: string, required = false): UnknownMethod | null {
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`Three resource.${name} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (required) throw new TypeError(`Three resource 缺少 ${name}()。`);
  return null;
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* invalid thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function ownData(value: object, key: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}

function disposalUnit(value: object): DisposalUnit | null {
  const method = snapshotMethod(value, 'dispose');
  if (!method) return null;
  return { dispose: () => method(), disposed: false };
}

export class ThreeObjectDisposalLease {
  readonly #report: Readonly<ThreeDisposalReport>;
  readonly #resources: readonly DisposalUnit[];
  readonly #removeFromParent: UnknownMethod | null;
  #detached: boolean;
  #operating = false;
  #reentryDetected = false;

  constructor(rootValue: unknown, { removeFromParent = true }: Readonly<{ removeFromParent?: boolean }> = {}) {
    if (!rootValue || typeof rootValue !== 'object') throw new TypeError('Three root 必须是对象。');
    if (typeof removeFromParent !== 'boolean') throw new TypeError('removeFromParent 必须是布尔值。');
    const geometries = new Set<object>();
    const materials = new Set<object>();
    const textures = new Set<object>();
    const traverse = snapshotMethod(rootValue, 'traverse');
    if (traverse) {
      const result = traverse((objectValue: unknown) => {
        if (!objectValue || typeof objectValue !== 'object') return;
        const geometry = ownData(objectValue, 'geometry');
        if (geometry && typeof geometry === 'object') geometries.add(geometry);
        const materialValue = ownData(objectValue, 'material');
        const entries = Array.isArray(materialValue) ? materialValue : [materialValue];
        for (const entry of entries) {
          if (!entry || typeof entry !== 'object') continue;
          materials.add(entry);
          for (const key of Reflect.ownKeys(entry)) {
            const value = ownData(entry, key);
            if (value instanceof THREE.Texture) textures.add(value);
          }
        }
      });
      rejectThenable(result, 'Three root.traverse()');
    }
    this.#resources = Object.freeze(
      [...textures, ...materials, ...geometries]
        .map(disposalUnit)
        .filter((unit): unit is DisposalUnit => unit !== null),
    );
    this.#report = Object.freeze({
      geometries: geometries.size,
      materials: materials.size,
      textures: textures.size,
    });
    this.#removeFromParent = removeFromParent ? snapshotMethod(rootValue, 'removeFromParent') : null;
    this.#detached = !removeFromParent || this.#removeFromParent === null;
  }

  get complete(): boolean {
    if (this.#operating) {
      this.#reentryDetected = true;
      throw new Error('ThreeObjectDisposalLease 清理期间不能读取完成状态。');
    }
    return this.#detached && this.#resources.every(({ disposed }) => disposed);
  }

  dispose(): Readonly<ThreeDisposalReport> {
    if (this.#operating) {
      this.#reentryDetected = true;
      throw new Error('ThreeObjectDisposalLease 不允许重入。');
    }
    this.#operating = true;
    this.#reentryDetected = false;
    const errors: unknown[] = [];
    try {
      for (const unit of this.#resources) {
        if (unit.disposed) continue;
        try {
          rejectThenable(unit.dispose(), 'Three resource.dispose()');
          if (this.#reentryDetected) {
            throw new Error('Three resource.dispose() 回调发生租约反调。');
          }
          unit.disposed = true;
        } catch (error) {
          errors.push(error);
          break;
        }
      }
      if (
        errors.length === 0
        && !this.#reentryDetected
        && this.#resources.every(({ disposed }) => disposed)
        && !this.#detached
        && this.#removeFromParent
      ) {
        try {
          rejectThenable(this.#removeFromParent(), 'Three root.removeFromParent()');
          if (this.#reentryDetected) {
            throw new Error('Three root.removeFromParent() 回调发生租约反调。');
          }
          this.#detached = true;
        } catch (error) { errors.push(error); }
      }
    } finally {
      this.#operating = false;
    }
    if (errors.length > 0) {
      const failure = new Error('Three.js 资源清理未完整完成。');
      Object.defineProperty(failure, 'causes', { value: Object.freeze(errors) });
      throw failure;
    }
    return this.#report;
  }
}

export function createThreeObjectDisposalLease(
  root: unknown,
  options?: Readonly<{ removeFromParent?: boolean }>,
): ThreeObjectDisposalLease {
  return new ThreeObjectDisposalLease(root, options);
}

export function disposeThreeObject(
  rootValue: unknown,
  options?: Readonly<{ removeFromParent?: boolean }>,
): Readonly<ThreeDisposalReport> {
  if (rootValue === null || rootValue === undefined) {
    return Object.freeze({ geometries: 0, materials: 0, textures: 0 });
  }
  return new ThreeObjectDisposalLease(rootValue, options).dispose();
}
