import { describe, expect, it } from 'vitest';
import {
  ActionRegistry,
  EquipmentRegistry,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_IN_MEMORY_REGISTRY_PUBLICATION_PORT_POLICY_CANDIDATE_V1,
  ArenaV2InMemoryRegistryPublicationPortCandidateV1,
  createArenaV2RegistryPublicationSnapshotHashCandidateV1,
} from '../src/index.js';

function emptySnapshot() {
  const actionRegistry = new ActionRegistry();
  return Object.freeze({
    collectionWeaponIds: Object.freeze([]),
    actionRegistry,
    equipmentRegistry: new EquipmentRegistry({ definitions: [], actionRegistry }),
    grammarDefinitions: Object.freeze([]),
  });
}

function firstWeaponSnapshot() {
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[0]!;
  const actionRegistry = new ActionRegistry(weapon.actions);
  return Object.freeze({
    collectionWeaponIds: Object.freeze([weapon.id]),
    actionRegistry,
    equipmentRegistry: new EquipmentRegistry({
      definitions: [weapon.equipment],
      actionRegistry,
    }),
    grammarDefinitions: Object.freeze([weapon.grammar]),
  });
}

describe('Arena V2 in-memory registry publication port candidate V1', () => {
  it('keeps a non-default Arena V2-only single-weapon CAS policy', () => {
    expect(ARENA_V2_IN_MEMORY_REGISTRY_PUBLICATION_PORT_POLICY_CANDIDATE_V1)
      .toMatchObject({
        sourceScope: 'arena-v2-collection-weapons-only',
        transitionScope: 'exactly-one-weapon',
        concurrency: 'synchronous-cas',
        maximumHistoryEntries: 64,
        defaultPort: false,
        persistent: false,
        defaultRegistryWired: false,
      });
  });

  it('publishes one weapon, rejects stale CAS and rolls back only that weapon', () => {
    const previous = emptySnapshot();
    const next = firstWeaponSnapshot();
    const previousHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(previous);
    const nextHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(next);
    const port = new ArenaV2InMemoryRegistryPublicationPortCandidateV1({
      revision: 0,
      snapshotHash: previousHash,
      snapshot: previous,
    });
    const weaponId = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[0]!.id;
    const publish = {
      schemaVersion: 1 as const,
      ownerId: 'owner-1',
      weaponId,
      direction: 'publish' as const,
      expectedRevision: 0,
      expectedSnapshotHash: previousHash,
      nextRevision: 1,
      nextSnapshotHash: nextHash,
      planContentHash: '12345678',
      snapshot: next,
    };
    expect(port.compareAndSwap(publish).committed).toBe(true);
    expect(port.read()).toEqual({
      revision: 1,
      snapshotHash: nextHash,
      collectionWeaponIds: [weaponId],
    });
    expect(port.compareAndSwap(publish)).toMatchObject({
      committed: false,
      observedRevision: 1,
      observedSnapshotHash: nextHash,
    });
    expect(port.compareAndSwap({
      ...publish,
      direction: 'rollback',
      expectedRevision: 1,
      expectedSnapshotHash: nextHash,
      nextRevision: 2,
      nextSnapshotHash: previousHash,
      snapshot: previous,
    }).committed).toBe(true);
    expect(port.read()).toEqual({
      revision: 2,
      snapshotHash: previousHash,
      collectionWeaponIds: [],
    });
    expect(port.history()).toHaveLength(2);
  });
});
