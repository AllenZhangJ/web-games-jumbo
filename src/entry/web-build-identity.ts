import {
  ARENA_BUILD_MANIFEST_FILENAME,
  createArenaBuildManifest,
} from '@number-strategy-jump/arena-device-acceptance';
import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';

type UnknownMethod = (...args: unknown[]) => unknown;

export interface WebBuildIdentityOptions {
  readonly requiredArtifact: string;
  readonly label?: string;
}

function ownOptions(value: unknown): Readonly<Required<WebBuildIdentityOptions>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Web build identity options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Web build identity options 必须是普通对象。');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || (key !== 'requiredArtifact' && key !== 'label')) {
      throw new RangeError(`Web build identity 不支持 option ${String(key)}。`);
    }
    if (!Object.hasOwn(descriptors[key]!, 'value')) {
      throw new TypeError(`Web build identity option ${key} 不能是访问器。`);
    }
  }
  const requiredArtifact = descriptors.requiredArtifact?.value;
  const label = descriptors.label?.value ?? 'Web evidence workbench';
  if (typeof requiredArtifact !== 'string' || requiredArtifact.length === 0) {
    throw new TypeError('requiredArtifact 必须是非空字符串。');
  }
  if (typeof label !== 'string' || label.length === 0) {
    throw new TypeError('label 必须是非空字符串。');
  }
  return Object.freeze({ requiredArtifact, label });
}

function descriptorInPrototypeChain(
  value: object,
  key: PropertyKey,
  name: string,
): PropertyDescriptor | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function optionalMethod(value: unknown, key: string, name: string): UnknownMethod | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor) return null;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${key} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownMethod;
}

function hostProperty(value: unknown, key: PropertyKey): unknown {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined;
  return Reflect.get(value, key);
}

export async function loadCleanWebBuildIdentity(
  root: unknown = globalThis,
  optionsValue: unknown = {},
) {
  const { requiredArtifact, label } = ownOptions(optionsValue);
  let fetchMethod: UnknownMethod | null;
  try {
    fetchMethod = optionalMethod(root, 'fetch', 'Web build identity root');
  } catch (error) {
    const normalized = normalizeThrownError(error, 'Web build identity fetch capability 无效');
    return Object.freeze({
      collectable: false as const,
      reason: 'build-manifest-fetch-invalid' as const,
      manifest: null,
      error: Object.freeze({ name: normalized.name, message: normalized.message }),
    });
  }
  if (!fetchMethod) {
    return Object.freeze({
      collectable: false as const,
      reason: 'build-manifest-fetch-unavailable' as const,
      manifest: null,
    });
  }
  try {
    const response = await fetchMethod(`./${ARENA_BUILD_MANIFEST_FILENAME}`, Object.freeze({
      cache: 'no-store',
      credentials: 'same-origin',
    }));
    if (hostProperty(response, 'ok') !== true) {
      throw new Error(`HTTP ${String(hostProperty(response, 'status'))}`);
    }
    const json = optionalMethod(response, 'json', 'Web build manifest response');
    if (!json) throw new TypeError('Web build manifest response 缺少 json()。');
    const manifest = createArenaBuildManifest(await json());
    if (manifest.target !== 'web') throw new RangeError(`${label} 收到非 Web 构建 Manifest。`);
    if (manifest.getArtifact(requiredArtifact) === null) {
      throw new RangeError(`构建 Manifest 未覆盖 ${requiredArtifact}。`);
    }
    if (manifest.sourceDirty) {
      return Object.freeze({
        collectable: false as const,
        reason: 'dirty-source-build' as const,
        manifest,
      });
    }
    return Object.freeze({ collectable: true as const, reason: null, manifest });
  } catch (error) {
    const normalized = normalizeThrownError(error, 'Web build manifest 无效');
    return Object.freeze({
      collectable: false as const,
      reason: 'build-manifest-invalid' as const,
      manifest: null,
      error: Object.freeze({ name: normalized.name, message: normalized.message }),
    });
  }
}
