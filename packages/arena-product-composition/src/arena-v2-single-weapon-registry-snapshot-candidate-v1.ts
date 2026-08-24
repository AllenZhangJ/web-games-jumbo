import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ActionRegistry,
  EquipmentRegistry,
  createWeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  validateArenaV2SingleWeaponRegistrationPlanCandidateV1,
} from './arena-v2-single-weapon-registration-plan-candidate-v1.js';
import {
  assertArenaV2NextRegistryWeaponCandidateV1,
} from './arena-v2-registry-weapon-sequence-candidate-v1.js';

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

const OPTION_KEYS = new Set([
  'assessment', 'plan', 'baseCollectionWeaponIds', 'baseActionDefinitions',
  'baseEquipmentDefinitions', 'baseGrammarDefinitions',
]);

const POLICY_AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.single-weapon-registry-snapshot-policy.candidate.v1' as const,
  status: 'production-unreachable' as const,
  sourceScope: 'arena-v2-collection-weapons-only' as const,
  constructionMode: 'build-new-immutable-snapshots' as const,
  publishMode: 'external-cas-owner-code-written-not-run' as const,
  rollbackMode: 'retain-exact-previous-snapshot' as const,
  groupRegistrationPermitted: false as const,
  acceptsUnknownBaseDefinitions: false as const,
  acceptsDefinitionIdentityDrift: false as const,
  mutatesInputRegistries: false as const,
  publishesDefaultRegistry: false as const,
  defaultCompositionWired: false as const,
});

export const ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_POLICY_CANDIDATE_V1 =
  Object.freeze({
    ...POLICY_AUTHORITY,
    contentHash: createDeterministicDataHash(
      POLICY_AUTHORITY,
      'Arena V2 single weapon registry snapshot policy candidate V1',
    ),
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

function normalizeBaseWeaponIds(value: unknown, targetWeaponId: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError('Arena V2 baseCollectionWeaponIds必须是数组。');
  const ids = value.map((entry, index) => assertNonEmptyString(
    entry,
    `Arena V2 baseCollectionWeaponIds[${index}]`,
  ));
  if (new Set(ids).size !== ids.length || ids.includes(targetWeaponId)) {
    throw new RangeError('Arena V2基础武器集合重复或已经包含目标武器。');
  }
  assertArenaV2NextRegistryWeaponCandidateV1(ids, targetWeaponId);
  return Object.freeze(ids);
}

function assertDefinitionsMatchCatalog(
  actual: readonly Readonly<{ readonly id: string }>[],
  expected: readonly Readonly<{ readonly id: string }>[],
  name: string,
): void {
  const expectedById = new Map(expected.map((definition) => [definition.id, definition] as const));
  if (actual.length !== expected.length) throw new RangeError(`${name}数量与基础武器集合不闭合。`);
  for (const definition of actual) {
    const registered = expectedById.get(definition.id);
    if (registered === undefined
      || createDeterministicDataHash(definition, `${name}.${definition.id}`)
        !== createDeterministicDataHash(registered, `${name}.${definition.id}`)) {
      throw new RangeError(`${name}包含未知或漂移Definition ${definition.id}。`);
    }
  }
  if (new Set(actual.map(({ id }) => id)).size !== actual.length) {
    throw new RangeError(`${name}存在重复Definition。`);
  }
}

/**
 * Constructs previous/next immutable Arena V2 registry snapshots locally.
 * Publication remains owned by the separate CAS/durable activation lifecycle;
 * this constructor never swaps a registry reference itself. Callers cannot
 * reach this path until the exact assessment and registration plan both pass.
 */
export function createArenaV2SingleWeaponRegistrySnapshotCandidateV1(value: unknown) {
  const source = cloneFrozenData(value, 'Arena V2 single weapon registry snapshot options');
  exactRecord(source, OPTION_KEYS, 'Arena V2 single weapon registry snapshot options');
  const plan = validateArenaV2SingleWeaponRegistrationPlanCandidateV1({
    assessment: source.assessment,
    plan: source.plan,
  });
  const targetWeapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
    ({ id }) => id === plan.weaponId,
  );
  if (targetWeapon === undefined) throw new RangeError(`Arena V2注册快照未知武器${plan.weaponId}。`);
  const baseCollectionWeaponIds = normalizeBaseWeaponIds(
    source.baseCollectionWeaponIds,
    targetWeapon.id,
  );
  const baseWeapons = baseCollectionWeaponIds.map((weaponId) => (
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === weaponId)!
  ));
  if (!Array.isArray(source.baseActionDefinitions)
    || !Array.isArray(source.baseEquipmentDefinitions)
    || !Array.isArray(source.baseGrammarDefinitions)) {
    throw new TypeError('Arena V2注册快照基础Definition必须都是数组。');
  }

  const baseActionRegistry = new ActionRegistry(source.baseActionDefinitions);
  const baseEquipmentRegistry = new EquipmentRegistry({
    definitions: source.baseEquipmentDefinitions,
    actionRegistry: baseActionRegistry,
  });
  const baseGrammarDefinitions = Object.freeze(source.baseGrammarDefinitions
    .map(createWeaponCombatGrammarDefinitionV1)
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const expectedBaseActions = baseWeapons.flatMap(({ actions }) => actions);
  const expectedBaseEquipment = baseWeapons.map(({ equipment }) => equipment);
  const expectedBaseGrammars = baseWeapons.map(({ grammar }) => grammar);
  assertDefinitionsMatchCatalog(
    baseActionRegistry.list(),
    expectedBaseActions,
    'Arena V2基础ActionRegistry',
  );
  assertDefinitionsMatchCatalog(
    baseEquipmentRegistry.list(),
    expectedBaseEquipment,
    'Arena V2基础EquipmentRegistry',
  );
  assertDefinitionsMatchCatalog(
    baseGrammarDefinitions,
    expectedBaseGrammars,
    'Arena V2基础GrammarDefinitions',
  );

  const nextActionRegistry = new ActionRegistry([
    ...baseActionRegistry.list(),
    ...targetWeapon.actions,
  ]);
  const nextEquipmentRegistry = new EquipmentRegistry({
    definitions: [...baseEquipmentRegistry.list(), targetWeapon.equipment],
    actionRegistry: nextActionRegistry,
  });
  const nextGrammarDefinitions = Object.freeze([
    ...baseGrammarDefinitions,
    createWeaponCombatGrammarDefinitionV1(targetWeapon.grammar),
  ].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const nextCollectionWeaponIds = Object.freeze([
    ...baseCollectionWeaponIds,
    targetWeapon.id,
  ].sort((left, right) => {
    const leftWeapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === left)!;
    const rightWeapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === right)!;
    return leftWeapon.collectionOrder - rightWeapon.collectionOrder;
  }));

  const previousData = Object.freeze({
    collectionWeaponIds: baseCollectionWeaponIds,
    actionDefinitions: baseActionRegistry.list(),
    equipmentDefinitions: baseEquipmentRegistry.list(),
    grammarDefinitions: baseGrammarDefinitions,
  });
  const nextData = Object.freeze({
    collectionWeaponIds: nextCollectionWeaponIds,
    actionDefinitions: nextActionRegistry.list(),
    equipmentDefinitions: nextEquipmentRegistry.list(),
    grammarDefinitions: nextGrammarDefinitions,
  });
  const previousSnapshotHash = createDeterministicDataHash(
    previousData,
    `Arena V2 registry snapshot before ${targetWeapon.id}`,
  );
  const nextSnapshotHash = createDeterministicDataHash(
    nextData,
    `Arena V2 registry snapshot after ${targetWeapon.id}`,
  );
  const authority = Object.freeze({
    schemaVersion: ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_CANDIDATE_V1_SCHEMA_VERSION,
    id: `arena-v2.single-weapon-registry-snapshot.${targetWeapon.id}.candidate.v1`,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    publishStatus:
      ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_POLICY_CANDIDATE_V1.publishMode,
    weaponId: targetWeapon.id,
    planContentHash: plan.contentHash,
    policyContentHash:
      ARENA_V2_SINGLE_WEAPON_REGISTRY_SNAPSHOT_POLICY_CANDIDATE_V1.contentHash,
    previousSnapshotHash,
    nextSnapshotHash,
    previous: Object.freeze({
      ...previousData,
      actionRegistry: baseActionRegistry,
      equipmentRegistry: baseEquipmentRegistry,
    }),
    next: Object.freeze({
      ...nextData,
      actionRegistry: nextActionRegistry,
      equipmentRegistry: nextEquipmentRegistry,
    }),
    presentationPromotionIds: Object.freeze(
      plan.presentationPromotions.map(({ presentationIdentity }) => presentationIdentity),
    ),
    sharedPresentationRequirementIds: Object.freeze(
      plan.sharedPresentationRequirements.map(({ vfxAssetId }) => vfxAssetId),
    ),
    rollbackToken: Object.freeze({
      weaponId: targetWeapon.id,
      expectedCurrentSnapshotHash: nextSnapshotHash,
      restoreSnapshotHash: previousSnapshotHash,
      rollbackOperationIds: plan.rollbackOperationIds,
      mayRollbackOtherWeapons: false as const,
    }),
    mutatesInputRegistries: false as const,
    publishesDefaultRegistry: false as const,
    defaultCompositionWired: false as const,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      Object.freeze({
        ...authority,
        previous: previousData,
        next: nextData,
      }),
      `Arena V2 single weapon registry snapshot candidate ${targetWeapon.id}`,
    ),
  });
}

export type ArenaV2SingleWeaponRegistrySnapshotCandidateV1 = ReturnType<
  typeof createArenaV2SingleWeaponRegistrySnapshotCandidateV1
>;
