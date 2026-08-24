import {
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_V2_REGISTRY_WEAPON_SEQUENCE_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2RegistryWeaponSequenceCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly activeWeaponCount: number;
  readonly totalWeaponCount: 20;
  readonly complete: boolean;
  readonly activeWeaponIds: readonly string[];
  readonly remainingWeaponIds: readonly string[];
  readonly nextWeaponId: string | null;
  readonly nextWeaponDefinitionId: string | null;
  readonly nextCollectionOrder: number | null;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
}

export const ARENA_V2_REGISTRY_WEAPON_SEQUENCE_POLICY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: ARENA_V2_REGISTRY_WEAPON_SEQUENCE_CANDIDATE_V1_SCHEMA_VERSION,
  id: 'arena-v2.registry-weapon-sequence.candidate.v1' as const,
  status: 'production-unreachable' as const,
  source: 'active-registry-collection-weapon-ids' as const,
  ordering: 'exact-contiguous-collection-prefix' as const,
  promotionUnit: 'exactly-next-single-weapon' as const,
  skipPermitted: false as const,
  reorderPermitted: false as const,
  removalPermitted: false as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  validationStatus: 'not-run' as const,
});

function normalizeActiveWeaponIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Arena V2 Registry可玩武器序列必须是数组。');
  }
  if (value.length > ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.length) {
    throw new RangeError('Arena V2 Registry可玩武器数量超过正式目录。');
  }
  const ids = Object.freeze(value.map((entry, index) => assertNonEmptyString(
    entry,
    `Arena V2 Registry可玩武器序列[${index}]`,
  )));
  if (new Set(ids).size !== ids.length) {
    throw new RangeError('Arena V2 Registry可玩武器序列不能重复。');
  }
  const expected = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1
    .slice(0, ids.length)
    .map(({ id }) => id);
  if (!ids.every((id, index) => id === expected[index])) {
    throw new RangeError('Arena V2 Registry可玩武器必须是正式收藏目录的连续前缀。');
  }
  return ids;
}

export function projectArenaV2RegistryWeaponSequenceCandidateV1(
  activeCollectionWeaponIds: unknown,
): Readonly<ArenaV2RegistryWeaponSequenceCandidateV1> {
  const activeWeaponIds = normalizeActiveWeaponIds(activeCollectionWeaponIds);
  const nextWeapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[activeWeaponIds.length] ?? null;
  const remainingWeaponIds = Object.freeze(
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1
      .slice(activeWeaponIds.length)
      .map(({ id }) => id),
  );
  return Object.freeze({
    schemaVersion: ARENA_V2_REGISTRY_WEAPON_SEQUENCE_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    activeWeaponCount: activeWeaponIds.length,
    totalWeaponCount: 20 as const,
    complete: nextWeapon === null,
    activeWeaponIds,
    remainingWeaponIds,
    nextWeaponId: nextWeapon?.id ?? null,
    nextWeaponDefinitionId: nextWeapon?.equipment.id ?? null,
    nextCollectionOrder: nextWeapon?.collectionOrder ?? null,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
  });
}

export function assertArenaV2NextRegistryWeaponCandidateV1(
  activeCollectionWeaponIds: unknown,
  targetWeaponId: unknown,
): Readonly<ArenaV2RegistryWeaponSequenceCandidateV1> {
  const sequence = projectArenaV2RegistryWeaponSequenceCandidateV1(
    activeCollectionWeaponIds,
  );
  const target = assertNonEmptyString(targetWeaponId, 'Arena V2 Registry目标武器ID');
  if (sequence.complete) {
    throw new RangeError('Arena V2 Registry已包含全部20把正式武器，不能继续晋级。');
  }
  if (target !== sequence.nextWeaponId) {
    throw new RangeError(
      `Arena V2 Registry下一把只能晋级${String(sequence.nextWeaponId)}，不能跳到${target}。`,
    );
  }
  return sequence;
}
