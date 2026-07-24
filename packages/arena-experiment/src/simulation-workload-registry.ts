import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { readBoundMethod, snapshotDataArray } from './callable-boundary.js';

const ENTRY_KEYS: ReadonlySet<string> = new Set(['id', 'version', 'validateParameters', 'createCase']);
const REFERENCE_KEYS: ReadonlySet<string> = new Set(['id', 'version', 'parameters']);
const CASE_METHODS = Object.freeze([
  'getMetadata', 'getSnapshot', 'isComplete', 'step', 'exportResult', 'destroy',
] as const);

export interface ArenaSimulationCase {
  readonly getMetadata: () => unknown;
  readonly getSnapshot: () => unknown;
  readonly isComplete: () => unknown;
  readonly step: () => unknown;
  readonly exportResult: () => unknown;
  readonly destroy: () => void;
}
export interface ArenaSimulationWorkloadEntry {
  readonly id: string;
  readonly version: number;
  readonly validateParameters: (parameters: unknown) => unknown;
  readonly createCase: (options: unknown) => unknown;
}

function normalizeEntry(value: unknown, index: number): Readonly<ArenaSimulationWorkloadEntry> {
  const name = `SimulationWorkloadRegistry.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  if (typeof value.validateParameters !== 'function') {
    throw new TypeError(`${name}.validateParameters 必须是函数。`);
  }
  if (typeof value.createCase !== 'function') throw new TypeError(`${name}.createCase 必须是函数。`);
  return Object.freeze({
    id: assertNonEmptyString(value.id, `${name}.id`),
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    validateParameters: value.validateParameters as ArenaSimulationWorkloadEntry['validateParameters'],
    createCase: value.createCase as ArenaSimulationWorkloadEntry['createCase'],
  });
}

export function assertSimulationCase(value: unknown, name = 'SimulationCase'): Readonly<ArenaSimulationCase> {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  const methods = Object.fromEntries(CASE_METHODS.map((method) => [
    method,
    readBoundMethod(value, method, name),
  ])) as unknown as ArenaSimulationCase;
  return Object.freeze(methods);
}

export class SimulationWorkloadRegistry {
  readonly #entries: ReadonlyMap<string, Readonly<ArenaSimulationWorkloadEntry>>;

  constructor(entries: unknown = []) {
    const source = snapshotDataArray(entries, 'SimulationWorkloadRegistry entries');
    const normalizedEntries = new Map<string, Readonly<ArenaSimulationWorkloadEntry>>();
    for (let index = 0; index < source.length; index += 1) {
      const entry = normalizeEntry(source[index], index);
      if (normalizedEntries.has(entry.id)) {
        throw new RangeError(`SimulationWorkloadRegistry 包含重复 id ${entry.id}。`);
      }
      normalizedEntries.set(entry.id, entry);
    }
    this.#entries = normalizedEntries;
    Object.freeze(this);
  }

  require(referenceValue: unknown): Readonly<ArenaSimulationWorkloadEntry> {
    const reference = cloneFrozenData(referenceValue, 'SimulationWorkload reference');
    assertKnownKeys(reference, REFERENCE_KEYS, 'SimulationWorkload reference');
    const referenceId = assertNonEmptyString(reference.id, 'SimulationWorkload reference.id');
    const referenceVersion = assertIntegerAtLeast(reference.version, 1, 'SimulationWorkload reference.version');
    const entry = this.#entries.get(referenceId);
    if (!entry) throw new RangeError(`未知 SimulationWorkload ${referenceId}。`);
    if (entry.version !== referenceVersion) {
      throw new RangeError(
        `SimulationWorkload ${entry.id} 版本 ${entry.version} 与 Definition ${referenceVersion} 不一致。`,
      );
    }
    entry.validateParameters(reference.parameters ?? {});
    return entry;
  }

  list(): readonly Readonly<{ id: string; version: number }>[] {
    return Object.freeze([...this.#entries.values()]
      .map(({ id, version }) => Object.freeze({ id, version }))
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
  }
}
