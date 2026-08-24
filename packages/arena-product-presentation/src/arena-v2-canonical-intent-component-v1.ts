function encodedComponent(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Arena V2意图编码组件必须是非空字符串。');
  }
  return value;
}

export function decodeArenaV2CanonicalIntentComponentV1(value: unknown): string {
  const encoded = encodedComponent(value);
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    throw new RangeError('Arena V2意图编码组件不是合法的percent-encoding。');
  }
  if (decoded.trim().length === 0) {
    throw new RangeError('Arena V2意图编码组件解码后不能为空。');
  }
  let canonical: string;
  try {
    canonical = encodeURIComponent(decoded);
  } catch {
    throw new RangeError('Arena V2意图编码组件包含不可编码的Unicode。');
  }
  if (canonical !== encoded) {
    throw new RangeError('Arena V2意图编码组件必须使用canonical encodeURIComponent编码。');
  }
  return decoded;
}

export const ARENA_V2_CANONICAL_INTENT_COMPONENT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  rejectsMalformedPercentEncoding: true as const,
  rejectsNonCanonicalEquivalentEncoding: true as const,
  validationStatus: 'not-run' as const,
});
