import { createRng, deriveSeed } from '@number-strategy-jump/arena-contracts';
import {
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  createMatchContentSelection,
} from '../../content/match-content-selection.js';
import { createPlayerProfile } from '../profile/player-profile.js';
import { createPlayerProfileDefinition } from '../profile/player-profile-definition.js';
import { MATCH_CONTENT_KIND } from './content-replacement-definition.js';
import { createContentReplacementRegistry } from './content-replacement-registry.js';
import {
  FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION,
  createFrozenMatchContentPool,
} from './frozen-match-content-pool.js';
import { createMatchContentCatalog } from './match-content-catalog.js';
import { createMatchContentPoolDefinition } from './match-content-pool-definition.js';

const PROFILE_KEY_BY_KIND = Object.freeze({
  [MATCH_CONTENT_KIND.CHARACTER]: 'characterIds',
  [MATCH_CONTENT_KIND.EQUIPMENT]: 'equipmentIds',
  [MATCH_CONTENT_KIND.MAP]: 'mapIds',
});

function resolveKnownId({ catalog, replacements, kind, id }) {
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

function resolveUnlockedIds({ profile, catalog, replacements, kind }) {
  const profileKey = PROFILE_KEY_BY_KIND[kind];
  const resolved = profile.unlocks[profileKey].map((id) => resolveKnownId({
    catalog,
    replacements,
    kind,
    id,
  }));
  return Object.freeze([...new Set(resolved)].sort());
}

function requireAvailable(ids, requiredId, name) {
  if (!ids.includes(requiredId)) throw new RangeError(`${name} ${requiredId} 未在当前 Profile 解锁。`);
}

function assertMatchSeed(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError('MatchContentPool matchSeed 必须是 uint32。');
  }
  return value;
}

export class MatchContentPoolResolver {
  #definition;
  #catalog;
  #replacements;
  #profileDefinition;

  constructor({ definition, catalog, replacementRegistry = [], profileDefinition }) {
    this.#definition = createMatchContentPoolDefinition(definition);
    this.#catalog = createMatchContentCatalog(catalog);
    this.#replacements = createContentReplacementRegistry(replacementRegistry);
    this.#profileDefinition = createPlayerProfileDefinition(profileDefinition);
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
      if (!this.#catalog.has(replacement.kind, finalReplacementId)) {
        throw new RangeError(
          `MatchContentPool 替代目标不存在：${replacement.kind} ${finalReplacementId}。`,
        );
      }
    }
    Object.freeze(this);
  }

  resolve({ profile: profileValue, matchSeed }) {
    const normalizedMatchSeed = assertMatchSeed(matchSeed);
    const profile = createPlayerProfile(this.#profileDefinition, profileValue);
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
    requireAvailable(mapDefinitionIds, this.#definition.fallbackMapId, 'MatchContentPool fallback map');
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
