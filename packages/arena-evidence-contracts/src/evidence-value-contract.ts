import {
  assertIntegerAtLeast,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';

const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const UTC_ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export interface EvidenceBoundedStringOptions {
  readonly rejectControlCharacters?: boolean;
}

export interface EvidenceRelativePathOptions {
  readonly maximumLength?: number;
}

export function assertEvidenceBoundedString(
  value: unknown,
  maximumLength: number,
  name: string,
  { rejectControlCharacters = false }: EvidenceBoundedStringOptions = {},
): string {
  assertIntegerAtLeast(maximumLength, 1, `${name} maximumLength`);
  if (typeof rejectControlCharacters !== 'boolean') {
    throw new TypeError(`${name} rejectControlCharacters 必须是布尔值。`);
  }
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  if (rejectControlCharacters && CONTROL_CHARACTER_PATTERN.test(text)) {
    throw new RangeError(`${name} 不能包含控制字符。`);
  }
  return text;
}

export function assertEvidenceGitCommit(value: unknown, name: string): string {
  if (typeof value !== 'string' || !GIT_COMMIT_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 40 位小写 Git commit。`);
  }
  return value;
}

export function assertEvidenceSha256(value: unknown, name: string): string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 64 位小写十六进制 SHA-256。`);
  }
  return value;
}

export function assertEvidenceUtcInstant(value: unknown, name: string): string {
  if (typeof value !== 'string' || !UTC_ISO_INSTANT_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是带毫秒的 UTC ISO-8601 时间。`);
  }
  if (!isEvidenceUtcInstant(value)) {
    throw new RangeError(`${name} 不是有效 UTC 时间。`);
  }
  return value;
}

export function isEvidenceUtcInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_ISO_INSTANT_PATTERN.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

export function assertEvidenceRelativePath(
  value: unknown,
  name: string,
  { maximumLength = 512 }: EvidenceRelativePathOptions = {},
): string {
  const artifactPath = assertEvidenceBoundedString(value, maximumLength, name, {
    rejectControlCharacters: true,
  });
  if (
    artifactPath.includes('\\')
    || artifactPath.startsWith('/')
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(artifactPath)
    || /^[A-Za-z]:/.test(artifactPath)
  ) throw new RangeError(`${name} 必须是使用 / 的相对路径。`);
  const segments = artifactPath.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new RangeError(`${name} 不能包含空段、. 或 ..。`);
  }
  return artifactPath;
}
