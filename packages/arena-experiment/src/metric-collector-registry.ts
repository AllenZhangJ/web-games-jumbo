import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { PlainRecord } from '@number-strategy-jump/arena-contracts';
import { readBoundMethod, snapshotDataArray } from './callable-boundary.js';
import {
  createArenaExperimentDefinition,
  type ArenaExperimentCandidate,
  type ArenaExperimentDefinition,
} from './experiment-definition.js';

const ENTRY_KEYS: ReadonlySet<string> = new Set(['id', 'version', 'validateParameters', 'create']);
const COLLECTOR_METHODS = Object.freeze([
  'beginCase', 'observeStep', 'completeCase', 'failCase', 'getResult', 'destroy',
] as const);

export interface ArenaSimulationMetadata extends PlainRecord {
  readonly matchSeed: number;
  readonly matchSchemaVersion: number;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
}
export interface ArenaSimulationSnapshot extends PlainRecord { readonly tick: number }
export interface ArenaMetricCollectorBeginContext<
  TSnapshot extends ArenaSimulationSnapshot = ArenaSimulationSnapshot,
> {
  readonly seed: number;
  readonly metadata: Readonly<ArenaSimulationMetadata>;
  readonly initialSnapshot: Readonly<TSnapshot>;
}
export interface ArenaMetricCollectorStepContext<
  TSnapshot extends ArenaSimulationSnapshot = ArenaSimulationSnapshot,
  TInputFrame = unknown,
  TEvent = unknown,
> {
  readonly seed: number;
  readonly metadata: Readonly<ArenaSimulationMetadata>;
  readonly inputFrames: readonly Readonly<TInputFrame>[];
  readonly events: readonly Readonly<TEvent>[];
  readonly snapshot: Readonly<TSnapshot>;
}
export interface ArenaMetricCollectorCompleteContext<
  TSnapshot extends ArenaSimulationSnapshot = ArenaSimulationSnapshot,
  TResult extends PlainRecord = PlainRecord,
> {
  readonly seed: number;
  readonly metadata: Readonly<ArenaSimulationMetadata>;
  readonly finalSnapshot: Readonly<TSnapshot>;
  readonly ticks: number;
  readonly eventCount: number;
  readonly finalHash: string;
  readonly result: Readonly<TResult>;
}
export interface ArenaMetricCollectorFailureContext<
  TSnapshot extends ArenaSimulationSnapshot = ArenaSimulationSnapshot,
> {
  readonly seed: number;
  readonly metadata: Readonly<ArenaSimulationMetadata> | null;
  readonly lastSnapshot: Readonly<TSnapshot> | null;
  readonly ticks: number;
  readonly eventCount: number;
  readonly failure: Readonly<{ name: string; message: string }>;
}
export interface ArenaMetricCollector<
  TSnapshot extends ArenaSimulationSnapshot = ArenaSimulationSnapshot,
  TInputFrame = unknown,
  TEvent = unknown,
  TResult extends PlainRecord = PlainRecord,
> {
  readonly beginCase: (value: Readonly<ArenaMetricCollectorBeginContext<TSnapshot>>) => void;
  readonly observeStep: (value: Readonly<ArenaMetricCollectorStepContext<TSnapshot, TInputFrame, TEvent>>) => void;
  readonly completeCase: (value: Readonly<ArenaMetricCollectorCompleteContext<TSnapshot, TResult>>) => void;
  readonly failCase: (value: Readonly<ArenaMetricCollectorFailureContext<TSnapshot>>) => void;
  readonly getResult: () => unknown;
  readonly destroy: () => void;
}
export interface ArenaMetricCollectorEntry {
  readonly id: string;
  readonly version: number;
  readonly validateParameters?: (parameters: unknown) => unknown;
  readonly create: (options: {
    readonly definition: ArenaExperimentDefinition;
    readonly parameters: Readonly<PlainRecord>;
  }) => unknown;
}
export interface ArenaMetricCollectorFactoryOptions {
  readonly definition: ArenaExperimentDefinition;
  readonly parameters: Readonly<PlainRecord>;
}
export interface ArenaSimulationCaseFactoryOptions {
  readonly seed: number;
  readonly candidate: Readonly<ArenaExperimentCandidate>;
  readonly parameters: Readonly<PlainRecord>;
}
interface NormalizedCollectorEntry extends ArenaMetricCollectorEntry {
  readonly validateParameters: (parameters: unknown) => unknown;
}
export interface ArenaMetricCollectorHandle {
  readonly id: string;
  readonly version: number;
  readonly instance: Readonly<ArenaMetricCollector>;
}

function assertCollector(value: unknown, name: string): Readonly<ArenaMetricCollector> {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const methods = Object.fromEntries(COLLECTOR_METHODS.map((method) => [
    method,
    readBoundMethod(value, method, name),
  ])) as unknown as ArenaMetricCollector;
  return Object.freeze(methods);
}

function normalizeEntry(value: unknown, index: number): Readonly<NormalizedCollectorEntry> {
  const name = `MetricCollectorRegistry.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  if (typeof value.create !== 'function') throw new TypeError(`${name}.create 必须是函数。`);
  if (value.validateParameters !== undefined && typeof value.validateParameters !== 'function') {
    throw new TypeError(`${name}.validateParameters 必须是函数。`);
  }
  const validateParameters: NormalizedCollectorEntry['validateParameters'] =
    typeof value.validateParameters === 'function'
      ? value.validateParameters as NormalizedCollectorEntry['validateParameters']
      : (parameters: unknown): Readonly<PlainRecord> => {
        assertKnownKeys(parameters, new Set(), `${name} parameters`);
        return Object.freeze({});
      };
  return Object.freeze({
    id: assertNonEmptyString(value.id, `${name}.id`),
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    validateParameters,
    create: value.create as NormalizedCollectorEntry['create'],
  });
}

function validateCollectorParameters(
  entry: Readonly<NormalizedCollectorEntry>,
  parametersValue: unknown,
): Readonly<PlainRecord> {
  const validated = entry.validateParameters(parametersValue ?? {});
  return assertPlainRecord(
    cloneFrozenData(validated, `MetricCollector ${entry.id} validated parameters`),
    `MetricCollector ${entry.id} validated parameters`,
  );
}

function cleanupPendingCollector(value: unknown): unknown | null {
  if (!value || typeof value !== 'object') return null;
  try {
    const destroy = readBoundMethod(value, 'destroy', 'MetricCollector pending instance', false);
    if (destroy) destroy();
    return null;
  } catch (error) {
    return error;
  }
}

export class MetricCollectorRegistry {
  readonly #entries: ReadonlyMap<string, Readonly<NormalizedCollectorEntry>>;

  constructor(entries: unknown = []) {
    const source = snapshotDataArray(entries, 'MetricCollectorRegistry entries');
    const normalizedEntries = new Map<string, Readonly<NormalizedCollectorEntry>>();
    for (let index = 0; index < source.length; index += 1) {
      const entry = normalizeEntry(source[index], index);
      if (normalizedEntries.has(entry.id)) {
        throw new RangeError(`MetricCollectorRegistry 包含重复 id ${entry.id}。`);
      }
      normalizedEntries.set(entry.id, entry);
    }
    this.#entries = normalizedEntries;
    Object.freeze(this);
  }

  #requireEntry(id: string): Readonly<NormalizedCollectorEntry> {
    const entry = this.#entries.get(id);
    if (!entry) throw new RangeError(`未知 MetricCollector ${id}。`);
    return entry;
  }

  assertDefinition(definitionValue: unknown): ArenaExperimentDefinition {
    const definition = createArenaExperimentDefinition(definitionValue);
    for (const reference of definition.collectors) {
      const entry = this.#requireEntry(reference.id);
      if (entry.version !== reference.version) {
        throw new RangeError(
          `MetricCollector ${entry.id} 版本 ${entry.version} 与 Definition ${reference.version} 不一致。`,
        );
      }
      validateCollectorParameters(entry, reference.parameters);
    }
    return definition;
  }

  createCollectors(definitionValue: unknown): readonly Readonly<ArenaMetricCollectorHandle>[] {
    const definition = this.assertDefinition(definitionValue);
    const created: Readonly<ArenaMetricCollectorHandle>[] = [];
    let pendingInstance: unknown = null;
    try {
      for (const reference of definition.collectors) {
        const entry = this.#requireEntry(reference.id);
        const parameters = validateCollectorParameters(entry, reference.parameters);
        pendingInstance = entry.create({ definition, parameters });
        created.push(Object.freeze({
          id: entry.id,
          version: entry.version,
          instance: assertCollector(pendingInstance, `MetricCollector ${entry.id}`),
        }));
        pendingInstance = null;
      }
      return Object.freeze(created);
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      const pendingCleanupError = cleanupPendingCollector(pendingInstance);
      if (pendingCleanupError !== null) cleanupErrors.push(pendingCleanupError);
      for (const handle of [...created].reverse()) {
        try {
          handle.instance.destroy();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (cleanupErrors.length > 0) {
        throw Object.assign(new Error('MetricCollector 构造失败且清理未完整完成。'), {
          originalError: error,
          cleanupErrors: Object.freeze(cleanupErrors),
        });
      }
      throw error;
    }
  }

  list(): readonly Readonly<{ id: string; version: number }>[] {
    return Object.freeze([...this.#entries.values()]
      .map(({ id, version }) => Object.freeze({ id, version }))
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
  }
}
