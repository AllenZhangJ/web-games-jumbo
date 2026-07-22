import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export interface PresentationMemorySnapshot {
  readonly jsHeapBytes: number | null;
  readonly processMemoryBytes: number | null;
}

export interface PresentationResourceSnapshot {
  readonly [key: string]: unknown;
  readonly jsHeapBytes?: number | null;
  readonly processMemoryBytes?: number | null;
}

const MEMORY_KEYS = new Set(['jsHeapBytes', 'processMemoryBytes']);

function nullableBytes(value: unknown, name: string): number | null {
  return value === null || value === undefined
    ? null
    : assertIntegerAtLeast(value, 0, name);
}

export function createPresentationMemorySnapshot(value: unknown): PresentationMemorySnapshot | null {
  if (value === null || value === undefined) return null;
  const source = assertPlainRecord(value, 'PresentationMemorySnapshot');
  assertKnownKeys(source, MEMORY_KEYS, 'PresentationMemorySnapshot');
  const result = Object.freeze({
    jsHeapBytes: nullableBytes(source.jsHeapBytes, 'PresentationMemorySnapshot.jsHeapBytes'),
    processMemoryBytes: nullableBytes(
      source.processMemoryBytes,
      'PresentationMemorySnapshot.processMemoryBytes',
    ),
  });
  return result.jsHeapBytes === null && result.processMemoryBytes === null ? null : result;
}

export function mergePresentationMemorySnapshot(
  resources: PresentationResourceSnapshot | null | undefined,
  memory: PresentationMemorySnapshot | null,
): Readonly<PresentationResourceSnapshot> | null | undefined {
  if (memory === null) return resources;
  const normalizedResources = resources === null || resources === undefined
    ? {}
    : cloneFrozenData(resources, 'PresentationResourceSnapshot');
  return Object.freeze({
    ...normalizedResources,
    jsHeapBytes: memory.jsHeapBytes,
    processMemoryBytes: memory.processMemoryBytes,
  });
}
