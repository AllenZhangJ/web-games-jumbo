import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1MatchCore } from '../../../src/arena/arena-v1-match-core.js';
import { createArenaV1CharacterRegistry } from '../../../src/arena/content/arena-v1-characters.js';
import { createArenaV1MapRegistry } from '../../../src/arena/content/arena-v1-maps.js';
import {
  createArenaV1SelectedAuthorityRegistries,
} from '../../../src/arena/composition/arena-v1-content-selection.js';
import {
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  createMatchContentSelection,
} from '../../../src/arena/content/match-content-selection.js';
import { ARENA_V1_CHARACTER_DEFINITIONS } from '../../../src/arena/content/arena-v1-characters.js';
import {
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE4_EQUIPMENT_ID,
} from '../../../src/arena/content/stage4-equipment.js';
import { STAGE5_MAP_ID } from '../../../src/arena/content/stage5-map.js';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { MAP_EVENT_KIND } from '../../../src/arena/map/map-event-types.js';
import { QuickMatchService } from '../../../src/arena/matchmaking/quick-match-service.js';
import { HeadlessMatchRunner, replayMatch } from '../../../src/arena/replay.js';
import {
  ARENA_V1_CONTENT_REPLACEMENT_REGISTRY,
  ARENA_V1_MATCH_CONTENT_CATALOG,
  ARENA_V1_MATCH_CONTENT_POOL_DEFINITION,
} from '../../../src/arena/product/content/arena-v1-match-content.js';
import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '../../../src/arena/product/content/arena-v1-player-profile-definition.js';
import {
  CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
  MATCH_CONTENT_KIND,
} from '../../../src/arena/product/content-pool/content-replacement-definition.js';
import { ContentReplacementRegistry } from '../../../src/arena/product/content-pool/content-replacement-registry.js';
import {
  FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION,
  createFrozenMatchContentPool,
} from '../../../src/arena/product/content-pool/frozen-match-content-pool.js';
import { MatchContentPoolResolver } from '../../../src/arena/product/content-pool/match-content-pool-resolver.js';
import {
  advancePlayerProfile,
  createPlayerProfile,
} from '@number-strategy-jump/arena-profile-contracts';

const characterIds = ARENA_V1_CHARACTER_DEFINITIONS.map(({ id }) => id);
const allEquipmentIds = STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id);

function selection({ equipmentDefinitionIds = allEquipmentIds } = {}) {
  return createMatchContentSelection({
    schemaVersion: MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
    contentDefinitionId: 'test-frozen-content',
    contentVersion: 1,
    characterDefinitionIds: characterIds,
    equipmentDefinitionIds,
    mapDefinitionIds: [STAGE5_MAP_ID],
    selectedMapDefinitionId: STAGE5_MAP_ID,
    participantCharacters: [
      { participantId: 'player-1', definitionId: characterIds[0] },
      { participantId: 'player-2', definitionId: characterIds[1] },
    ],
  });
}

function replacement({ id, retiredId, replacementId }) {
  return {
    schemaVersion: CONTENT_REPLACEMENT_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    kind: MATCH_CONTENT_KIND.EQUIPMENT,
    retiredId,
    replacementId,
  };
}

function resolver(replacementRegistry = ARENA_V1_CONTENT_REPLACEMENT_REGISTRY) {
  return new MatchContentPoolResolver({
    definition: ARENA_V1_MATCH_CONTENT_POOL_DEFINITION,
    catalog: ARENA_V1_MATCH_CONTENT_CATALOG,
    replacementRegistry,
    profileDefinition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
  });
}

function neutralFrames(snapshot) {
  return snapshot.participants.map(({ id }) => createNeutralInputFrame(snapshot.tick, id));
}

test('MatchContentSelection and FrozenMatchContentPool are immutable and hash-checked', () => {
  const selected = selection();
  assert.equal(Object.isFrozen(selected), true);
  assert.equal(Object.isFrozen(selected.participantCharacters), true);
  assert.match(selected.contentHash, /^[0-9a-f]{8}$/);
  assert.throws(
    () => createMatchContentSelection({ ...selected, contentHash: '00000000' }),
    /contentHash 与内容不一致/,
  );
  const pool = createFrozenMatchContentPool({
    schemaVersion: FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION,
    matchSeed: 99,
    sourceProfileRevision: 7,
    selection: selected,
  });
  assert.equal(Object.isFrozen(pool), true);
  assert.match(pool.poolHash, /^[0-9a-f]{8}$/);
  assert.deepEqual(createFrozenMatchContentPool(pool), pool);
  assert.throws(
    () => createFrozenMatchContentPool({ ...pool, sourceProfileRevision: 8 }),
    /poolHash 与内容不一致/,
  );
});

test('ContentReplacementRegistry resolves explicit chains and rejects ambiguity, cycles and unsafe arrays', () => {
  const registry = new ContentReplacementRegistry([
    replacement({ id: 'retire-old', retiredId: 'old-hammer', replacementId: 'legacy-hammer' }),
    replacement({ id: 'retire-legacy', retiredId: 'legacy-hammer', replacementId: 'hammer' }),
  ]);
  assert.equal(registry.resolve(MATCH_CONTENT_KIND.EQUIPMENT, 'old-hammer'), 'hammer');
  assert.equal(registry.resolve(MATCH_CONTENT_KIND.EQUIPMENT, 'hammer'), null);
  assert.throws(() => new ContentReplacementRegistry([
    replacement({ id: 'a', retiredId: 'old', replacementId: 'next' }),
    replacement({ id: 'b', retiredId: 'old', replacementId: 'hammer' }),
  ]), /重复来源/);
  assert.throws(() => new ContentReplacementRegistry([
    replacement({ id: 'a', retiredId: 'old', replacementId: 'next' }),
    replacement({ id: 'b', retiredId: 'next', replacementId: 'old' }),
  ]), /替换环/);
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => new ContentReplacementRegistry(sparse), /空槽或访问器/);
  const accessor = [];
  Object.defineProperty(accessor, '0', { enumerable: true, get: () => replacement({
    id: 'unsafe', retiredId: 'old', replacementId: 'hammer',
  }) });
  accessor.length = 1;
  assert.throws(() => new ContentReplacementRegistry(accessor), /空槽或访问器/);
  assert.throws(
    () => registry.resolve('unknown-kind', 'old-hammer'),
    /不支持 kind/,
  );
});

test('MatchContentPoolResolver shares one deterministic pool and requires explicit retired-ID replacement', () => {
  const profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  const first = resolver().resolve({ profile, matchSeed: 12345 });
  const second = resolver().resolve({ profile, matchSeed: 12345 });
  assert.deepEqual(first, second);
  assert.equal(first.sourceProfileRevision, profile.revision);
  assert.deepEqual(first.selection.equipmentDefinitionIds, profile.unlocks.equipmentIds);
  assert.deepEqual(first.selection.mapDefinitionIds, profile.unlocks.mapIds);
  assert.ok(first.selection.characterDefinitionIds.includes(
    first.selection.participantCharacters[1].definitionId,
  ));
  const changedSelection = advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, profile, {
    selection: {
      ...profile.selection,
      characterId: characterIds.find((id) => id !== profile.selection.characterId),
    },
  });
  const changed = resolver().resolve({ profile: changedSelection, matchSeed: 12345 });
  assert.equal(
    changed.selection.participantCharacters[1].definitionId,
    first.selection.participantCharacters[1].definitionId,
  );
  assert.equal(changed.selection.selectedMapDefinitionId, first.selection.selectedMapDefinitionId);

  const retiredProfile = advancePlayerProfile(
    ARENA_V1_PLAYER_PROFILE_DEFINITION,
    profile,
    {
      unlocks: {
        ...profile.unlocks,
        equipmentIds: [...profile.unlocks.equipmentIds, 'retired-hammer'],
      },
    },
  );
  assert.throws(
    () => resolver().resolve({ profile: retiredProfile, matchSeed: 1 }),
    /未知且未声明替代/,
  );
  const replacementRegistry = new ContentReplacementRegistry([
    replacement({
      id: 'retired-hammer-to-hammer',
      retiredId: 'retired-hammer',
      replacementId: STAGE4_EQUIPMENT_ID.HAMMER,
    }),
  ]);
  assert.deepEqual(
    resolver(replacementRegistry).resolve({ profile: retiredProfile, matchSeed: 1 })
      .selection.equipmentDefinitionIds,
    profile.unlocks.equipmentIds,
  );
  assert.throws(
    () => resolver().resolve({ profile, matchSeed: -1 }),
    /matchSeed 必须是 uint32/,
  );
  assert.throws(() => resolver(new ContentReplacementRegistry([
    replacement({
      id: 'still-live',
      retiredId: STAGE4_EQUIPMENT_ID.HAMMER,
      replacementId: STAGE4_EQUIPMENT_ID.CHAIN,
    }),
  ])), /替代来源仍在 Catalog/);
  assert.throws(() => resolver(new ContentReplacementRegistry([
    replacement({
      id: 'missing-target',
      retiredId: 'removed-item',
      replacementId: 'not-in-catalog',
    }),
  ])), /替代目标不存在/);
});

test('frozen authority content filters registries and map waves, and Replay V5 rebuilds it', () => {
  const contentSelection = selection({ equipmentDefinitionIds: [STAGE4_EQUIPMENT_ID.HAMMER] });
  const core = createArenaV1MatchCore({
    seed: 20260718,
    config: {
      contentSelection,
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: 1_805,
      hardLimitTicks: 1_820,
    },
  });
  assert.equal(core.config.schemaVersion, 5);
  assert.deepEqual(
    core.config.equipment.initialSpawns.map(({ definitionId }) => definitionId),
    [STAGE4_EQUIPMENT_ID.HAMMER],
  );
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 300 });
  const replay = runner.runUntilEnded(neutralFrames);
  const spawnedDefinitionIds = replay.events
    .filter(({ type }) => type === 'EquipmentSpawned')
    .map(({ equipmentDefinitionId }) => equipmentDefinitionId);
  assert.ok(spawnedDefinitionIds.length >= 2);
  assert.deepEqual([...new Set(spawnedDefinitionIds)], [STAGE4_EQUIPMENT_ID.HAMMER]);
  assert.equal(replay.config.contentSelection.contentHash, contentSelection.contentHash);
  assert.equal(replayMatch(replay).finalHash, replay.finalHash);
  runner.destroy();
  core.destroy();

  assert.throws(() => createArenaV1MatchCore({
    config: {
      contentSelection,
      mapDefinitionId: 'not-the-selected-map',
    },
  }), /mapDefinitionId 与 MatchContentSelection/);
  assert.throws(() => createArenaV1MatchCore({
    config: {
      contentSelection: selection({ equipmentDefinitionIds: [] }),
    },
  }), /装备波.*没有交集/);
});

test('authority map projection validates equipment pools without reordering map-authored waves', () => {
  const mapRegistry = createArenaV1MapRegistry();
  const originalWaves = mapRegistry.require(STAGE5_MAP_ID).events
    .filter(({ kind }) => kind === MAP_EVENT_KIND.EQUIPMENT_WAVE)
    .map(({ parameters }) => parameters.equipmentDefinitionIds);
  const projected = createArenaV1SelectedAuthorityRegistries({
    selection: selection(),
    mapRegistry,
    characterRegistry: createArenaV1CharacterRegistry(),
  });
  const projectedWaves = projected.mapRegistry.require(STAGE5_MAP_ID).events
    .filter(({ kind }) => kind === MAP_EVENT_KIND.EQUIPMENT_WAVE)
    .map(({ parameters }) => parameters.equipmentDefinitionIds);
  assert.deepEqual(projectedWaves, originalWaves);
});

test('QuickMatchService injects one frozen selection without exposing Profile provenance or difficulty', () => {
  let profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  const contentResolver = resolver();
  let capturedConfig = null;
  const service = new QuickMatchService({
    contentPoolProvider: {
      resolve: ({ matchSeed }) => contentResolver.resolve({ profile, matchSeed }),
    },
    coreFactory(options) {
      capturedConfig = options.config;
      return createArenaV1MatchCore(options);
    },
  });
  const match = service.create({ matchSeed: 456 });
  assert.equal(
    capturedConfig.contentSelection.contentHash,
    match.content.contentHash,
  );
  assert.equal(match.content.participantCharacters.length, 2);
  assert.doesNotMatch(
    JSON.stringify(match),
    /sourceProfileRevision|poolHash|difficulty|简单|普通|困难/i,
  );
  const frozenMatchContent = match.content;
  const frozenPlayerCharacterId = match.content.participantCharacters
    .find(({ participantId }) => participantId === 'player-1').definitionId;
  profile = advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, profile, {
    selection: {
      ...profile.selection,
      characterId: characterIds.find((id) => id !== profile.selection.characterId),
    },
  });
  assert.strictEqual(match.content, frozenMatchContent);
  assert.notEqual(profile.selection.characterId, frozenPlayerCharacterId);
  assert.equal(
    match.content.participantCharacters.find(({ participantId }) => participantId === 'player-1')
      .definitionId,
    frozenPlayerCharacterId,
  );
  match.session.destroy();

  assert.throws(() => service.create({
    matchSeed: 457,
    config: { contentSelection: selection() },
  }), /不能由调用者覆盖 contentSelection/);
  assert.throws(() => new QuickMatchService({
    contentPoolProvider: {
      resolve: ({ matchSeed }) => ({
        ...contentResolver.resolve({ profile, matchSeed }),
        matchSeed: matchSeed + 1,
      }),
    },
  }).create({ matchSeed: 1 }), /matchSeed 与匹配分配不一致/);
});
