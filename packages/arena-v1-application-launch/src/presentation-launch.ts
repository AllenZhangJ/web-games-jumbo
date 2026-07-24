import {
  ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  ARENA_V1_PRESENTATION_QUALITY_ID,
  createPresentationMemorySnapshot,
  resolveArenaV1PresentationQuality,
  type PresentationMemorySnapshot,
  type PresentationQualityDefinition,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  optionalDataField,
  optionalDataMethod,
  ownDataOptions,
} from './capability.js';

const QUALITY_OPTION_KEYS = new Set(['root', 'platformId', 'explicitToken']);
const MEMORY_OPTION_KEYS = new Set(['root', 'platformId']);
const EXTERNAL_PROVIDER_KEY = '__ARENA_PERFORMANCE_MEMORY_PROVIDER__';
const TOKEN_TO_ID: Readonly<Record<string, string>> = Object.freeze({
  high: ARENA_V1_PRESENTATION_QUALITY_ID.HIGH,
  medium: ARENA_V1_PRESENTATION_QUALITY_ID.MEDIUM,
  low: ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
});

function tokenValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return TOKEN_TO_ID[value.trim().toLowerCase()] ?? null;
}

function optionalObservedProperty(value: unknown, key: string): unknown {
  try { return (value as Readonly<Record<string, unknown>> | null)?.[key]; }
  catch { return undefined; }
}

function webQueryToken(root: unknown): string | null {
  try {
    const location = optionalDataField(root, 'location', 'Web launch root');
    const search = optionalObservedProperty(location, 'search');
    if (typeof search !== 'string') return null;
    return tokenValue(new URLSearchParams(search).get('arenaQuality'));
  } catch {
    return null;
  }
}

function miniGameQueryToken(root: unknown, platformId: unknown): string | null {
  try {
    const apiKey = platformId === 'wechat' ? 'wx' : platformId === 'douyin' ? 'tt' : null;
    if (apiKey === null) return null;
    const api = optionalDataField(root, apiKey, 'Mini-game launch root');
    const getLaunchOptions = optionalDataMethod(api, 'getLaunchOptionsSync', `${apiKey} host`);
    if (getLaunchOptions === null) return null;
    const launchOptions = getLaunchOptions();
    const query = optionalObservedProperty(launchOptions, 'query');
    return tokenValue(optionalObservedProperty(query, 'arenaQuality'));
  } catch {
    return null;
  }
}

export function resolveArenaPresentationQualityForLaunch(
  optionsValue: unknown = {},
): PresentationQualityDefinition {
  const options = ownDataOptions(
    optionsValue,
    'resolveArenaPresentationQualityForLaunch options',
    QUALITY_OPTION_KEYS,
  );
  const root = options.root === undefined ? globalThis : options.root;
  const explicit = tokenValue(options.explicitToken);
  let debug: string | null = null;
  try { debug = tokenValue(optionalDataField(root, '__ARENA_PRESENTATION_QUALITY__', 'launch root')); }
  catch { debug = null; }
  const host = options.platformId === 'web'
    ? webQueryToken(root)
    : miniGameQueryToken(root, options.platformId);
  return resolveArenaV1PresentationQuality(
    explicit ?? debug ?? host ?? ARENA_V1_DEFAULT_PRESENTATION_QUALITY.id,
  );
}

function optionalBytes(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;
}

function webHeapBytes(root: unknown): number | null {
  const performanceObject = optionalObservedProperty(root, 'performance');
  const memory = optionalObservedProperty(performanceObject, 'memory');
  return optionalBytes(optionalObservedProperty(memory, 'usedJSHeapSize'));
}

export function createArenaPresentationMemoryProviderForLaunch(
  optionsValue: unknown = {},
): () => PresentationMemorySnapshot | null {
  const options = ownDataOptions(
    optionsValue,
    'createArenaPresentationMemoryProviderForLaunch options',
    MEMORY_OPTION_KEYS,
  );
  const root = options.root === undefined ? globalThis : options.root;
  const platform = typeof options.platformId === 'string' ? options.platformId : '';
  return () => {
    let externalSample: unknown = null;
    try {
      const candidate = optionalDataField(root, EXTERNAL_PROVIDER_KEY, 'memory launch root');
      externalSample = typeof candidate === 'function' ? candidate() : null;
    } catch { externalSample = null; }
    const normalizedExternal = createPresentationMemorySnapshot(externalSample);
    const externalJsHeap = normalizedExternal?.jsHeapBytes ?? null;
    const externalProcess = normalizedExternal?.processMemoryBytes ?? null;
    const fallbackJsHeap = platform === 'web' ? webHeapBytes(root) : null;
    const jsHeapBytes = externalJsHeap ?? fallbackJsHeap;
    if (jsHeapBytes === null && externalProcess === null) return null;
    return Object.freeze({ jsHeapBytes, processMemoryBytes: externalProcess });
  };
}
