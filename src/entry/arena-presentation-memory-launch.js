import {
  createPresentationMemorySnapshot,
} from '@number-strategy-jump/arena-presentation-runtime';

const EXTERNAL_PROVIDER_KEY = '__ARENA_PERFORMANCE_MEMORY_PROVIDER__';

function safeProperty(value, key) {
  try { return value?.[key]; } catch { return undefined; }
}

function optionalBytes(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function webHeapBytes(root) {
  const performanceObject = safeProperty(root, 'performance');
  const memory = safeProperty(performanceObject, 'memory');
  return optionalBytes(safeProperty(memory, 'usedJSHeapSize'));
}

/**
 * Creates an entry-only memory provider. Chromium's non-standard JS heap
 * counter is used when present; device acceptance tools may inject a process
 * memory sampler without changing Product Session or authority code.
 */
export function createArenaPresentationMemoryProviderForLaunch({
  root = globalThis,
  platformId,
} = {}) {
  const platform = typeof platformId === 'string' ? platformId : '';
  return () => {
    const external = safeProperty(root, EXTERNAL_PROVIDER_KEY);
    const externalSample = typeof external === 'function' ? external() : null;
    const normalizedExternal = createPresentationMemorySnapshot(externalSample);
    const externalJsHeap = normalizedExternal?.jsHeapBytes ?? null;
    const externalProcess = normalizedExternal?.processMemoryBytes ?? null;
    const fallbackJsHeap = platform === 'web' ? webHeapBytes(root) : null;
    const jsHeapBytes = externalJsHeap ?? fallbackJsHeap;
    if (jsHeapBytes === null && externalProcess === null) return null;
    return {
      jsHeapBytes,
      processMemoryBytes: externalProcess,
    };
  };
}
