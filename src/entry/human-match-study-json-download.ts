import {
  createWebJsonDownloadLease,
  releaseWebJsonDownloadLease,
  waitForWebDownloadDispatch,
} from './web-json-download-runtime.js';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';

type UnknownMethod = (...args: unknown[]) => unknown;
type TextEncoderConstructor = new () => Readonly<{ encode: UnknownMethod }>;

function frozenRecord(value: unknown, name: string): Readonly<Record<string, unknown>> {
  const cloned = cloneFrozenData(value, name);
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return cloned as Readonly<Record<string, unknown>>;
}

function hostProperty(value: unknown, key: PropertyKey, name: string): unknown {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return Reflect.get(value, key);
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

function requiredMethod(value: unknown, key: string, name: string): UnknownMethod {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${key} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownMethod;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function safeFileName(packageId: unknown): string {
  if (typeof packageId !== 'string' || !/^human-study-package-[0-9a-f]{8}$/.test(packageId)) {
    throw new RangeError('CapturePackage packageId 不能用于下载文件名。');
  }
  return `${packageId}.json`;
}

async function encodeAndHash(root: unknown, value: unknown): Promise<Readonly<{
  bytes: Uint8Array;
  sha256: string;
}>> {
  const cryptoObject = hostProperty(root, 'crypto', 'Study 下载 root');
  const subtle = hostProperty(cryptoObject, 'subtle', 'Study 下载 crypto');
  const digest = requiredMethod(subtle, 'digest', 'Study 下载 subtle');
  const EncoderValue = hostProperty(root, 'TextEncoder', 'Study 下载 root');
  if (typeof EncoderValue !== 'function') throw new TypeError('Study 下载 TextEncoder 不可用。');
  const encoder = new (EncoderValue as TextEncoderConstructor)();
  const encode = requiredMethod(encoder, 'encode', 'Study 下载 TextEncoder');
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) throw new TypeError('Study JSON 下载 value 不可序列化。');
  const encoded = encode(`${serialized}\n`);
  if (!(encoded instanceof Uint8Array)) throw new TypeError('TextEncoder.encode 必须返回 Uint8Array。');
  const bytes = Uint8Array.from(encoded);
  const digestValue = await digest('SHA-256', bytes);
  let digestBytes: Uint8Array;
  try {
    digestBytes = new Uint8Array(digestValue as ArrayBuffer);
  } catch {
    throw new TypeError('SHA-256 digest 必须返回 ArrayBuffer。');
  }
  if (digestBytes.byteLength !== 32) throw new RangeError('SHA-256 digest 必须是 32 bytes。');
  return Object.freeze({ bytes, sha256: bytesToHex(digestBytes) });
}

async function downloadJson(
  root: unknown,
  value: unknown,
  fileName: string,
): Promise<Readonly<{ fileName: string; sha256: string; byteLength: number }>> {
  const encoded = await encodeAndHash(root, value);
  const lease = createWebJsonDownloadLease(root, encoded.bytes, fileName);
  const primaryErrors: unknown[] = [];
  try {
    lease.click();
    await waitForWebDownloadDispatch(root);
  } catch (error) {
    primaryErrors.push(error);
  }
  releaseWebJsonDownloadLease(lease, primaryErrors);
  return Object.freeze({
    fileName,
    sha256: encoded.sha256,
    byteLength: encoded.bytes.byteLength,
  });
}

export async function downloadHumanMatchStudyCapturePackage(
  root: unknown,
  capturePackageValue: unknown,
) {
  const capturePackage = frozenRecord(capturePackageValue, 'Human Match Study CapturePackage');
  const artifact = await downloadJson(
    root,
    capturePackage,
    safeFileName(capturePackage.packageId),
  );
  return Object.freeze({ packageId: capturePackage.packageId as string, ...artifact });
}

export async function downloadHumanMatchStudyWorkspace(
  root: unknown,
  workspaceValue: unknown,
) {
  const workspace = frozenRecord(workspaceValue, 'Human Match Study Workspace');
  if (!Number.isSafeInteger(workspace.revision) || (workspace.revision as number) < 0) {
    throw new RangeError('Human Match Study Workspace revision 无效。');
  }
  return downloadJson(
    root,
    workspace,
    `human-study-workspace-r${String(workspace.revision)}.json`,
  );
}
