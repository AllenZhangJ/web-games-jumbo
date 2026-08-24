import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ActionRegistry,
  EquipmentRegistry,
  createWeaponCombatGrammarDefinitionV1,
  type WeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationCompareAndSwapInputCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationPortCandidateV1,
  ArenaV2SingleWeaponRegistryPublicationReadCandidateV1,
} from './arena-v2-single-weapon-registry-publication-owner-candidate-v1.js';

export const ARENA_V2_IN_MEMORY_REGISTRY_PUBLICATION_PORT_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export interface ArenaV2InMemoryRegistryPublicationPortOptionsCandidateV1 {
  readonly revision: number;
  readonly snapshotHash: string;
  readonly snapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1;
}

export interface ArenaV2RegistryPublicationHistoryEntryCandidateV1 {
  readonly sequence: number;
  readonly ownerId: string;
  readonly weaponId: string;
  readonly direction: 'publish' | 'rollback';
  readonly fromRevision: number;
  readonly fromSnapshotHash: string;
  readonly toRevision: number;
  readonly toSnapshotHash: string;
  readonly planContentHash: string;
}

const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/u;
const OPTION_KEYS = new Set(['revision', 'snapshotHash', 'snapshot']);
const SNAPSHOT_KEYS = new Set([
  'collectionWeaponIds', 'actionRegistry', 'equipmentRegistry', 'grammarDefinitions',
]);
const CAS_INPUT_KEYS = new Set([
  'schemaVersion', 'ownerId', 'weaponId', 'direction', 'expectedRevision',
  'expectedSnapshotHash', 'nextRevision', 'nextSnapshotHash', 'planContentHash',
  'snapshot',
]);
const MAXIMUM_HISTORY = 64;
const COLLECTION_ORDER: ReadonlyMap<string, number> = new Map(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map((weapon) => (
    [weapon.id, weapon.collectionOrder] as const
  )),
);

export const ARENA_V2_IN_MEMORY_REGISTRY_PUBLICATION_PORT_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: ARENA_V2_IN_MEMORY_REGISTRY_PUBLICATION_PORT_CANDIDATE_V1_SCHEMA_VERSION,
    id: 'arena-v2.in-memory-registry-publication-port-policy.candidate.v1' as const,
    status: 'production-unreachable' as const,
    sourceScope: 'arena-v2-collection-weapons-only' as const,
    transitionScope: 'exactly-one-weapon' as const,
    concurrency: 'synchronous-cas' as const,
    maximumHistoryEntries: MAXIMUM_HISTORY,
    unknownDefinitionPolicy: 'reject' as const,
    identityDriftPolicy: 'reject' as const,
    defaultPort: false as const,
    persistent: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    validationStatus: 'not-run' as const,
  });

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是普通对象。`);
  }
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined
      || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function contentHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!CONTENT_HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写hash。`);
  return result;
}

function nextRevision(revision: number): number {
  if (revision >= Number.MAX_SAFE_INTEGER) throw new RangeError('Arena V2 Registry revision已经耗尽。');
  return revision + 1;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function normalizeCollectionWeaponIds(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const ids = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(ids).size !== ids.length || ids.some((id) => !COLLECTION_ORDER.has(id))) {
    throw new RangeError(`${name}包含重复或Arena V2目录外武器。`);
  }
  const sorted = [...ids].sort((left, right) => (
    COLLECTION_ORDER.get(left)! - COLLECTION_ORDER.get(right)!
  ));
  if (!sameIds(ids, sorted)) throw new RangeError(`${name}必须按收藏顺序排列。`);
  return Object.freeze(ids);
}

function assertDefinitionsMatchCatalog(
  actual: readonly Readonly<{ readonly id: string }>[],
  expected: readonly Readonly<{ readonly id: string }>[],
  name: string,
): void {
  const expectedById = new Map(expected.map((definition) => [definition.id, definition] as const));
  if (actual.length !== expected.length
    || new Set(actual.map(({ id }) => id)).size !== actual.length) {
    throw new RangeError(`${name}数量或身份唯一性与武器集合不闭合。`);
  }
  for (const definition of actual) {
    const catalogDefinition = expectedById.get(definition.id);
    if (catalogDefinition === undefined
      || createDeterministicDataHash(definition, `${name}.${definition.id}`)
        !== createDeterministicDataHash(catalogDefinition, `${name}.${definition.id}`)) {
      throw new RangeError(`${name}包含未知或漂移Definition ${definition.id}。`);
    }
  }
}

export function createArenaV2PublishedRegistrySnapshotCandidateV1(
  value: unknown,
  name = 'Arena V2 registry publication snapshot',
): ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1 {
  exactRecord(value, SNAPSHOT_KEYS, name);
  const collectionWeaponIds = normalizeCollectionWeaponIds(
    value.collectionWeaponIds,
    `${name}.collectionWeaponIds`,
  );
  if (!(value.actionRegistry instanceof ActionRegistry)
    || !(value.equipmentRegistry instanceof EquipmentRegistry)
    || !Array.isArray(value.grammarDefinitions)) {
    throw new TypeError(`${name}必须持有正式Action/Equipment Registry与Grammar数组。`);
  }
  const grammarDefinitions = Object.freeze(value.grammarDefinitions
    .map(createWeaponCombatGrammarDefinitionV1)
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const weapons = collectionWeaponIds.map((weaponId) => (
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === weaponId)!
  ));
  assertDefinitionsMatchCatalog(
    value.actionRegistry.list(),
    weapons.flatMap(({ actions }) => actions),
    `${name}.actionRegistry`,
  );
  assertDefinitionsMatchCatalog(
    value.equipmentRegistry.list(),
    weapons.map(({ equipment }) => equipment),
    `${name}.equipmentRegistry`,
  );
  assertDefinitionsMatchCatalog(
    grammarDefinitions,
    weapons.map(({ grammar }) => grammar),
    `${name}.grammarDefinitions`,
  );
  return Object.freeze({
    collectionWeaponIds,
    actionRegistry: value.actionRegistry,
    equipmentRegistry: value.equipmentRegistry,
    grammarDefinitions,
  });
}

function snapshotData(snapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1) {
  return Object.freeze({
    collectionWeaponIds: snapshot.collectionWeaponIds,
    actionDefinitions: snapshot.actionRegistry.list(),
    equipmentDefinitions: snapshot.equipmentRegistry.list(),
    grammarDefinitions: snapshot.grammarDefinitions,
  });
}

function normalizedSnapshotHash(
  snapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1,
): string {
  return createDeterministicDataHash(
    snapshotData(snapshot),
    'Arena V2 collection weapon registry publication snapshot',
  );
}

export function createArenaV2RegistryPublicationSnapshotHashCandidateV1(
  value: unknown,
): string {
  return normalizedSnapshotHash(createArenaV2PublishedRegistrySnapshotCandidateV1(value));
}

function normalizedCasInput(
  value: unknown,
): Readonly<{
  readonly ownerId: string;
  readonly weaponId: string;
  readonly direction: 'publish' | 'rollback';
  readonly expectedRevision: number;
  readonly expectedSnapshotHash: string;
  readonly nextRevision: number;
  readonly nextSnapshotHash: string;
  readonly planContentHash: string;
  readonly snapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1;
}> {
  exactRecord(value, CAS_INPUT_KEYS, 'Arena V2 in-memory registry CAS input');
  if (value.schemaVersion
    !== ARENA_V2_IN_MEMORY_REGISTRY_PUBLICATION_PORT_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2 in-memory registry CAS schemaVersion无效。');
  }
  const direction = value.direction;
  if (direction !== 'publish' && direction !== 'rollback') {
    throw new RangeError('Arena V2 in-memory registry CAS direction无效。');
  }
  const weaponId = assertNonEmptyString(value.weaponId, 'Arena V2 registry CAS weaponId');
  if (!COLLECTION_ORDER.has(weaponId)) throw new RangeError(`Arena V2 Registry未知武器${weaponId}。`);
  const expectedRevision = assertIntegerAtLeast(
    value.expectedRevision,
    0,
    'Arena V2 registry CAS expectedRevision',
  );
  const requestedNextRevision = assertIntegerAtLeast(
    value.nextRevision,
    1,
    'Arena V2 registry CAS nextRevision',
  );
  if (requestedNextRevision !== nextRevision(expectedRevision)) {
    throw new RangeError('Arena V2 Registry CAS revision必须严格单调增加1。');
  }
  const snapshot = createArenaV2PublishedRegistrySnapshotCandidateV1(
    value.snapshot,
    'Arena V2 registry CAS snapshot',
  );
  const nextSnapshotHash = contentHash(
    value.nextSnapshotHash,
    'Arena V2 registry CAS nextSnapshotHash',
  );
  if (normalizedSnapshotHash(snapshot) !== nextSnapshotHash) {
    throw new RangeError('Arena V2 Registry CAS nextSnapshotHash与快照内容不一致。');
  }
  return Object.freeze({
    ownerId: assertNonEmptyString(value.ownerId, 'Arena V2 registry CAS ownerId'),
    weaponId,
    direction,
    expectedRevision,
    expectedSnapshotHash: contentHash(
      value.expectedSnapshotHash,
      'Arena V2 registry CAS expectedSnapshotHash',
    ),
    nextRevision: requestedNextRevision,
    nextSnapshotHash,
    planContentHash: contentHash(
      value.planContentHash,
      'Arena V2 registry CAS planContentHash',
    ),
    snapshot,
  });
}

function expectedTransitionWeaponIds(
  currentIds: readonly string[],
  weaponId: string,
  direction: 'publish' | 'rollback',
): readonly string[] {
  if (direction === 'publish') {
    if (currentIds.includes(weaponId)) throw new RangeError(`Arena V2武器${weaponId}已经发布。`);
    return Object.freeze([...currentIds, weaponId].sort((left, right) => (
      COLLECTION_ORDER.get(left)! - COLLECTION_ORDER.get(right)!
    )));
  }
  if (!currentIds.includes(weaponId)) throw new RangeError(`Arena V2武器${weaponId}尚未发布。`);
  return Object.freeze(currentIds.filter((id) => id !== weaponId));
}

export class ArenaV2InMemoryRegistryPublicationPortCandidateV1
implements ArenaV2SingleWeaponRegistryPublicationPortCandidateV1 {
  #revision: number;
  #snapshotHash: string;
  #snapshot: ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1;
  #history: readonly ArenaV2RegistryPublicationHistoryEntryCandidateV1[] = Object.freeze([]);
  #transitioning = false;

  constructor(options: ArenaV2InMemoryRegistryPublicationPortOptionsCandidateV1) {
    exactRecord(options, OPTION_KEYS, 'Arena V2 in-memory registry port options');
    const snapshot = createArenaV2PublishedRegistrySnapshotCandidateV1(
      options.snapshot,
      'Arena V2 in-memory registry initial snapshot',
    );
    const snapshotHash = contentHash(
      options.snapshotHash,
      'Arena V2 in-memory registry initial snapshotHash',
    );
    if (normalizedSnapshotHash(snapshot) !== snapshotHash) {
      throw new RangeError('Arena V2 in-memory Registry初始hash与快照不一致。');
    }
    this.#revision = assertIntegerAtLeast(
      options.revision,
      0,
      'Arena V2 in-memory registry revision',
    );
    this.#snapshotHash = snapshotHash;
    this.#snapshot = snapshot;
    Object.freeze(this);
  }

  read(): Readonly<ArenaV2SingleWeaponRegistryPublicationReadCandidateV1> {
    return Object.freeze({
      revision: this.#revision,
      snapshotHash: this.#snapshotHash,
      collectionWeaponIds: this.#snapshot.collectionWeaponIds,
    });
  }

  readHead(): Readonly<ArenaV2SingleWeaponPublishedRegistrySnapshotCandidateV1> {
    return this.#snapshot;
  }

  history(): readonly ArenaV2RegistryPublicationHistoryEntryCandidateV1[] {
    return this.#history;
  }

  compareAndSwap(
    value: ArenaV2SingleWeaponRegistryPublicationCompareAndSwapInputCandidateV1,
  ): Readonly<ArenaV2SingleWeaponRegistryPublicationCompareAndSwapResultCandidateV1> {
    if (this.#transitioning) throw new Error('Arena V2 in-memory Registry CAS不可重入。');
    this.#transitioning = true;
    try {
      const input = normalizedCasInput(value);
      if (input.expectedRevision !== this.#revision
        || input.expectedSnapshotHash !== this.#snapshotHash) {
        return Object.freeze({
          committed: false,
          observedRevision: this.#revision,
          observedSnapshotHash: this.#snapshotHash,
        });
      }
      const expectedIds = expectedTransitionWeaponIds(
        this.#snapshot.collectionWeaponIds,
        input.weaponId,
        input.direction,
      );
      if (!sameIds(expectedIds, input.snapshot.collectionWeaponIds)) {
        throw new RangeError('Arena V2 Registry CAS必须精确增加或删除目标单把武器。');
      }
      const entry = Object.freeze({
        sequence: this.#history.length === 0
          ? 1
          : this.#history[this.#history.length - 1]!.sequence + 1,
        ownerId: input.ownerId,
        weaponId: input.weaponId,
        direction: input.direction,
        fromRevision: this.#revision,
        fromSnapshotHash: this.#snapshotHash,
        toRevision: input.nextRevision,
        toSnapshotHash: input.nextSnapshotHash,
        planContentHash: input.planContentHash,
      });
      const nextHistory = Object.freeze([
        ...this.#history,
        entry,
      ].slice(-MAXIMUM_HISTORY));
      this.#snapshot = input.snapshot;
      this.#snapshotHash = input.nextSnapshotHash;
      this.#revision = input.nextRevision;
      this.#history = nextHistory;
      return Object.freeze({
        committed: true,
        observedRevision: this.#revision,
        observedSnapshotHash: this.#snapshotHash,
      });
    } finally {
      this.#transitioning = false;
    }
  }

  snapshot(): Readonly<{
    readonly schemaVersion: 1;
    readonly status: 'production-unreachable';
    readonly revision: number;
    readonly snapshotHash: string;
    readonly collectionWeaponIds: readonly string[];
    readonly historyCount: number;
    readonly transitioning: boolean;
    readonly persistent: false;
    readonly defaultPort: false;
    readonly defaultRegistryWired: false;
  }> {
    return Object.freeze({
      schemaVersion: ARENA_V2_IN_MEMORY_REGISTRY_PUBLICATION_PORT_CANDIDATE_V1_SCHEMA_VERSION,
      status: 'production-unreachable' as const,
      revision: this.#revision,
      snapshotHash: this.#snapshotHash,
      collectionWeaponIds: this.#snapshot.collectionWeaponIds,
      historyCount: this.#history.length,
      transitioning: this.#transitioning,
      persistent: false as const,
      defaultPort: false as const,
      defaultRegistryWired: false as const,
    });
  }
}
