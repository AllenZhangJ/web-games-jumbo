import {
  assertIntegerAtLeast,
  assertKnownKeys,
} from '@number-strategy-jump/arena-contracts';

const MEMORY_KEYS = new Set([
  'jsHeapBytes',
  'processMemoryBytes',
]);

function nullableBytes(value, name) {
  return value === null || value === undefined
    ? null
    : assertIntegerAtLeast(value, 0, name);
}

/**
 * Normalizes an observational host/tool memory sample without coupling it to
 * renderer counters. A missing source is represented by null, never by zero.
 */
export function createPresentationMemorySnapshot(value) {
  if (value === null || value === undefined) return null;
  assertKnownKeys(value, MEMORY_KEYS, 'PresentationMemorySnapshot');
  const result = Object.freeze({
    jsHeapBytes: nullableBytes(
      value.jsHeapBytes,
      'PresentationMemorySnapshot.jsHeapBytes',
    ),
    processMemoryBytes: nullableBytes(
      value.processMemoryBytes,
      'PresentationMemorySnapshot.processMemoryBytes',
    ),
  });
  return result.jsHeapBytes === null && result.processMemoryBytes === null
    ? null
    : result;
}

export function mergePresentationMemorySnapshot(resources, memory) {
  if (memory === null) return resources;
  return Object.freeze({
    ...(resources ?? {}),
    jsHeapBytes: memory.jsHeapBytes,
    processMemoryBytes: memory.processMemoryBytes,
  });
}
