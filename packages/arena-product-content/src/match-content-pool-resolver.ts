import {
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  assertKnownKeys,
  assertPlainRecord,
  createMatchContentSelection,
  createRng,
  deriveSeed,
} from '@number-strategy-jump/arena-contracts';
import {
  createPlayerProfile,
  createPlayerProfileDefinition,
  type PlayerProfile,
  type PlayerProfileDefinition,
  type PlayerProfileUnlocks,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  MATCH_CONTENT_KIND,
  type MatchContentKind,
} from './content-replacement-definition.js';
import {
  createContentReplacementRegistry,
  type ContentReplacementRegistry,
} from './content-replacement-registry.js';
import {
  FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION,
  assertMatchSeed,
  createFrozenMatchContentPool,
  type FrozenMatchContentPool,
} from './frozen-match-content-pool.js';
import {
  createMatchContentCatalog,
  type MatchContentCatalog,
} from './match-content-catalog.js';
import {
  createMatchContentPoolDefinition,
  type MatchContentPoolDefinition,
} from './match-content-pool-definition.js';
import { readOwnDataField } from './ports.js';

type ProfileUnlockKey = 'characterIds' | 'equipmentIds' | 'mapIds';

const PROFILE_KEY_BY_KIND: Readonly<Record<MatchContentKind, ProfileUnlockKey>> = Object.freeze({
  [MATCH_CONTENT_KIND.CHARACTER]: 'characterIds',
  [MATCH_CONTENT_KIND.EQUIPMENT]: 'equipmentIds',
  [MATCH_CONTENT_KIND.MAP]: 'mapIds',
});
const CONSTRUCTOR_KEYS = new Set([
  'definition',
  'catalog',
  'replacementRegistry',
  'profileDefinition',
]);
const RESOLVE_KEYS = new Set(['profile', 'matchSeed']);

function resolveKnownId(options: Readonly<{
  catalog: MatchContentCatalog;
  replacements: ContentReplacementRegistry;
  kind: MatchContentKind;
  id: string;
}>): string {
  const { catalog, replacements, kind, id } = options;
  if (catalog.has(kind, id)) return id;
  const replacementId = replacements.resolve(kind, id);
  if (replacementId === null) {
    throw new RangeError(`MatchContentPool 未知且未声明替代的 ${kind} ${id}。`);
  }
  if (!catalog.has(kind, replacementId)) {
    throw new RangeError(`MatchContentPool 替代目标不存在：${kind} ${replacementId}。`);
  }
  return replacementId;
}

function resolveUnlockedIds(options: Readonly<{
  profile: PlayerProfile;
  catalog: MatchContentCatalog;
  replacements: ContentReplacementRegistry;
  kind: MatchContentKind;
}>): readonly string[] {
  const { profile, catalog, replacements, kind } = options;
  const profileKey: keyof PlayerProfileUnlocks = PROFILE_KEY_BY_KIND[kind];
  const resolved = profile.unlocks[profileKey].map((id) => resolveKnownId({
    catalog,
    replacements,
    kind,
    id,
  }));
  return Object.freeze([...new Set(resolved)].sort());
}

function requireAvailable(ids: readonly string[], requiredId: string, name: string): void {
  if (!ids.includes(requiredId)) {
    throw new RangeError(`${name} ${requiredId} 未在当前 Profile 解锁。`);
  }
}

export class MatchContentPoolResolver {
  readonly #definition: MatchContentPoolDefinition;
  readonly #catalog: MatchContentCatalog;
  readonly #replacements: ContentReplacementRegistry;
  readonly #profileDefinition: PlayerProfileDefinition;

  constructor(value: unknown) {
    assertKnownKeys(value, CONSTRUCTOR_KEYS, 'MatchContentPoolResolver options');
    const options = assertPlainRecord(value, 'MatchContentPoolResolver options');
    this.#definition = createMatchContentPoolDefinition(readOwnDataField(
      options,
      'definition',
      'MatchContentPoolResolver options',
    ));
    this.#catalog = createMatchContentCatalog(readOwnDataField(
      options,
      'catalog',
      'MatchContentPoolResolver options',
    ));
    const replacementRegistry = readOwnDataField(
      options,
      'replacementRegistry',
      'MatchContentPoolResolver options',
      true,
    );
    this.#replacements = createContentReplacementRegistry(
      replacementRegistry === undefined ? [] : replacementRegistry,
    );
    this.#profileDefinition = createPlayerProfileDefinition(readOwnDataField(
      options,
      'profileDefinition',
      'MatchContentPoolResolver options',
    ));
    if (!this.#catalog.has(MATCH_CONTENT_KIND.CHARACTER, this.#definition.fallbackCharacterId)) {
      throw new RangeError('MatchContentPoolDefinition fallbackCharacterId 不在 Catalog。');
    }
    if (!this.#catalog.has(MATCH_CONTENT_KIND.MAP, this.#definition.fallbackMapId)) {
      throw new RangeError('MatchContentPoolDefinition fallbackMapId 不在 Catalog。');
    }
    for (const id of this.#definition.requiredEquipmentIds) {
      if (!this.#catalog.has(MATCH_CONTENT_KIND.EQUIPMENT, id)) {
        throw new RangeError(`MatchContentPoolDefinition required equipment ${id} 不在 Catalog。`);
      }
    }
    for (const replacement of this.#replacements.list()) {
      if (this.#catalog.has(replacement.kind, replacement.retiredId)) {
        throw new RangeError(
          `MatchContentPool 替代来源仍在 Catalog：${replacement.kind} ${replacement.retiredId}。`,
        );
      }
      const finalReplacementId = this.#replacements.resolve(
        replacement.kind,
        replacement.retiredId,
      );
      if (finalReplacementId === null || !this.#catalog.has(replacement.kind, finalReplacementId)) {
        throw new RangeError(
          `MatchContentPool 替代目标不存在：${replacement.kind} ${String(finalReplacementId)}。`,
        );
      }
    }
    Object.freeze(this);
  }

  resolve(value: unknown): FrozenMatchContentPool {
    assertKnownKeys(value, RESOLVE_KEYS, 'MatchContentPoolResolver resolve options');
    const options = assertPlainRecord(value, 'MatchContentPoolResolver resolve options');
    const normalizedMatchSeed = assertMatchSeed(readOwnDataField(
      options,
      'matchSeed',
      'MatchContentPoolResolver resolve options',
    ));
    const profile = createPlayerProfile(this.#profileDefinition, readOwnDataField(
      options,
      'profile',
      'MatchContentPoolResolver resolve options',
    ));
    const characterDefinitionIds = resolveUnlockedIds({
      profile,
      catalog: this.#catalog,
      replacements: this.#replacements,
      kind: MATCH_CONTENT_KIND.CHARACTER,
    });
    const equipmentDefinitionIds = resolveUnlockedIds({
      profile,
      catalog: this.#catalog,
      replacements: this.#replacements,
      kind: MATCH_CONTENT_KIND.EQUIPMENT,
    });
    const mapDefinitionIds = resolveUnlockedIds({
      profile,
      catalog: this.#catalog,
      replacements: this.#replacements,
      kind: MATCH_CONTENT_KIND.MAP,
    });
    requireAvailable(
      characterDefinitionIds,
      this.#definition.fallbackCharacterId,
      'MatchContentPool fallback character',
    );
    requireAvailable(
      mapDefinitionIds,
      this.#definition.fallbackMapId,
      'MatchContentPool fallback map',
    );
    for (const id of this.#definition.requiredEquipmentIds) {
      requireAvailable(equipmentDefinitionIds, id, 'MatchContentPool required equipment');
    }
    const selectedPlayerCharacterId = resolveKnownId({
      catalog: this.#catalog,
      replacements: this.#replacements,
      kind: MATCH_CONTENT_KIND.CHARACTER,
      id: profile.selection.characterId,
    });
    requireAvailable(
      characterDefinitionIds,
      selectedPlayerCharacterId,
      'MatchContentPool selected character',
    );
    const selectedMapDefinitionId = createRng(
      deriveSeed(normalizedMatchSeed, 'content-pool:map'),
    ).pick(mapDefinitionIds);
    const opponentCharacterId = createRng(
      deriveSeed(normalizedMatchSeed, 'content-pool:opponent-character'),
    ).pick(characterDefinitionIds);
    const selection = createMatchContentSelection({
      schemaVersion: MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
      contentDefinitionId: this.#definition.id,
      contentVersion: this.#definition.contentVersion,
      characterDefinitionIds,
      equipmentDefinitionIds,
      mapDefinitionIds,
      selectedMapDefinitionId,
      participantCharacters: [
        {
          participantId: this.#definition.playerParticipantId,
          definitionId: selectedPlayerCharacterId,
        },
        {
          participantId: this.#definition.opponentParticipantId,
          definitionId: opponentCharacterId,
        },
      ],
    });
    return createFrozenMatchContentPool({
      schemaVersion: FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION,
      matchSeed: normalizedMatchSeed,
      sourceProfileRevision: profile.revision,
      selection,
    });
  }
}
