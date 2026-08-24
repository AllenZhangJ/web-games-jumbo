import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActionRegistry,
  EquipmentRegistry,
  createWeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaV2PublishedRegistrySnapshotCandidateV1,
  createArenaV2RegistryPublicationSnapshotHashCandidateV1,
} from '../src/arena-v2-in-memory-registry-publication-port-candidate-v1.js';

const fixture = vi.hoisted(() => ({
  assessment: Object.freeze<Readonly<{
    weaponId: string;
    equipmentDefinitionId: string;
    assessmentContentHash: string;
    readinessContentHash: string;
  }>>({
    weaponId: 'pending',
    equipmentDefinitionId: 'pending',
    assessmentContentHash: 'a1a1a1a1',
    readinessContentHash: 'b2b2b2b2',
  }),
  plan: null as unknown,
}));

vi.mock('../src/arena-v2-single-weapon-production-assessment-candidate-v1.js', () => ({
  validateArenaV2SingleWeaponProductionAssessmentCandidateV1(value: unknown) {
    if (value !== fixture.assessment) throw new RangeError('assessment drift');
    return fixture.assessment;
  },
}));

vi.mock('../src/arena-v2-single-weapon-registration-plan-candidate-v1.js', () => ({
  createArenaV2SingleWeaponRegistrationPlanCandidateV1(value: unknown) {
    if (value !== fixture.assessment) throw new RangeError('assessment drift');
    return fixture.plan;
  },
  validateArenaV2SingleWeaponRegistrationPlanCandidateV1(value: unknown) {
    if (typeof value !== 'object' || value === null
      || (value as { assessment?: unknown }).assessment !== fixture.assessment
      || (value as { plan?: unknown }).plan !== fixture.plan) {
      throw new RangeError('plan drift');
    }
    return fixture.plan;
  },
}));

import {
  ARENA_V2_SINGLE_WEAPON_REGISTRATION_CONFIGURATION_ENVELOPE_POLICY_CANDIDATE_V1,
  createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1,
} from '../src/arena-v2-single-weapon-registration-configuration-envelope-candidate-v1.js';

const firstWeapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[0]!;
const targetWeapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[1]!;

function publishedSnapshot(weaponIds: readonly string[]) {
  const weapons = weaponIds.map((weaponId) => (
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === weaponId)!
  ));
  const actionRegistry = new ActionRegistry(weapons.flatMap(({ actions }) => actions));
  return createArenaV2PublishedRegistrySnapshotCandidateV1({
    collectionWeaponIds: Object.freeze([...weaponIds]),
    actionRegistry,
    equipmentRegistry: new EquipmentRegistry({
      definitions: weapons.map(({ equipment }) => equipment),
      actionRegistry,
    }),
    grammarDefinitions: Object.freeze(
      weapons.map(({ grammar }) => createWeaponCombatGrammarDefinitionV1(grammar)),
    ),
  });
}

function registryReference(options: Readonly<{ driftAfterFirstRead?: boolean }> = {}) {
  const snapshot = publishedSnapshot([firstWeapon.id]);
  const snapshotHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(snapshot);
  let reads = 0;
  return Object.freeze({
    read() {
      reads += 1;
      return Object.freeze({
        revision: options.driftAfterFirstRead && reads > 1 ? 2 : 1,
        snapshotHash,
        collectionWeaponIds: snapshot.collectionWeaponIds,
      });
    },
    readHead() {
      return snapshot;
    },
  });
}

function emptySnapshot() {
  const actionRegistry = new ActionRegistry([]);
  return createArenaV2PublishedRegistrySnapshotCandidateV1({
    collectionWeaponIds: Object.freeze([]),
    actionRegistry,
    equipmentRegistry: new EquipmentRegistry({ definitions: [], actionRegistry }),
    grammarDefinitions: Object.freeze([]),
  });
}

function storagePort() {
  return Object.freeze({
    storageRead() {
      return Object.freeze({ ok: true, found: false, value: undefined });
    },
    storageWrite() {
      return true;
    },
    storageDelete() {
      return true;
    },
  });
}

function options(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    assessment: fixture.assessment,
    registryReference: registryReference(),
    hostId: 'registration-host',
    publicationOwnerId: 'publication-owner',
    portOptions: {
      storage: storagePort(),
      repositoryOwnerId: 'repository-owner',
      leaseHolderId: 'lease-holder',
      wallNow: () => 1_000,
      initialRevision: 0,
      initialSnapshot: emptySnapshot(),
    },
    ...overrides,
  };
}

afterEach(() => {
  const objectPrototype = Object.prototype as unknown as Record<string, unknown>;
  delete objectPrototype.keyPrefix;
  delete objectPrototype.leaseDurationMs;
  delete objectPrototype.leaseTakeoverSameOwner;
});

describe('Arena V2 single weapon registration configuration envelope candidate V1', () => {
  fixture.assessment = Object.freeze({
    weaponId: targetWeapon.id,
    equipmentDefinitionId: targetWeapon.equipment.id,
    assessmentContentHash: 'a1a1a1a1',
    readinessContentHash: 'b2b2b2b2',
  });
  fixture.plan = Object.freeze({
    weaponId: targetWeapon.id,
    equipmentDefinitionId: targetWeapon.equipment.id,
    assessmentContentHash: fixture.assessment.assessmentContentHash,
    readinessContentHash: fixture.assessment.readinessContentHash,
    contentHash: 'c3c3c3c3',
    forwardOperationIds: Object.freeze(Array.from(
      { length: 12 },
      (_, index) => `forward-${index + 1}`,
    )),
    rollbackOperationIds: Object.freeze(Array.from(
      { length: 12 },
      (_, index) => `forward-${12 - index}`,
    )),
  });

  it('closes assessment, twelve-step plan, active prefix and runtime assembly identity', () => {
    const envelope = createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1(
      options(),
    );
    const replay = createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1(
      options(),
    );
    expect(envelope).toMatchObject({
      status: 'production-unreachable',
      assessmentContentHash: fixture.assessment.assessmentContentHash,
      readinessContentHash: fixture.assessment.readinessContentHash,
      planContentHash: 'c3c3c3c3',
      sourceRevision: 1,
      sourceCollectionWeaponIds: [firstWeapon.id],
      targetWeaponId: targetWeapon.id,
      targetEquipmentDefinitionId: targetWeapon.equipment.id,
      targetCollectionOrder: targetWeapon.collectionOrder,
      createsHost: false,
      publishesRegistry: false,
      defaultRegistryWired: false,
    });
    expect(envelope.forwardOperationIds).toHaveLength(12);
    expect(envelope.rollbackOperationIds).toEqual([...envelope.forwardOperationIds].reverse());
    expect(envelope.contentHash).toBe(replay.contentHash);
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.registrationHostIdentity)).toBe(true);
  });

  it('does not read inherited optional port fields under Object prototype pollution', () => {
    let getterCalls = 0;
    for (const key of ['keyPrefix', 'leaseDurationMs', 'leaseTakeoverSameOwner'] as const) {
      Object.defineProperty(Object.prototype, key, {
        configurable: true,
        get() {
          getterCalls += 1;
          throw new Error('prototype getter must not execute');
        },
      });
    }
    const envelope = createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1(
      options(),
    );
    expect(getterCalls).toBe(0);
    expect(envelope.registrationHostIdentity).toMatchObject({
      keyPrefix: 'arena-v2.registry-publication.candidate.v1',
      leaseDurationMs: 60_000,
      leaseTakeoverSameOwner: false,
    });
  });

  it('rejects every own optional accessor without executing it', () => {
    for (const key of ['keyPrefix', 'leaseDurationMs', 'leaseTakeoverSameOwner'] as const) {
      let getterCalls = 0;
      const source = options();
      const portOptions = source.portOptions;
      Object.defineProperty(portOptions, key, {
        configurable: true,
        enumerable: true,
        get() {
          getterCalls += 1;
          throw new Error('optional getter must not execute');
        },
      });
      expect(() => createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1({
        ...source,
        portOptions,
      })).toThrow(/数据字段/u);
      expect(getterCalls).toBe(0);
    }
  });

  it('fails closed on active Registry drift, skipped target and future fields', () => {
    expect(() => createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1(
      options({ registryReference: registryReference({ driftAfterFirstRead: true }) }),
    )).toThrow(/发生漂移/u);
    const futureOptions = {
      ...options(),
      future: true,
    };
    expect(() => createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1(
      futureOptions as never,
    )).toThrow(/不支持字段/u);
    const skipped = publishedSnapshot([]);
    const skippedHash = createArenaV2RegistryPublicationSnapshotHashCandidateV1(skipped);
    expect(() => createArenaV2SingleWeaponRegistrationConfigurationEnvelopeCandidateV1(
      options({
        registryReference: Object.freeze({
          read: () => Object.freeze({
            revision: 0,
            snapshotHash: skippedHash,
            collectionWeaponIds: skipped.collectionWeaponIds,
          }),
          readHead: () => skipped,
        }),
      }),
    )).toThrow(/下一把只能晋级/u);
  });

  it('keeps the policy explicit, non-executing and unreachable from defaults', () => {
    expect(ARENA_V2_SINGLE_WEAPON_REGISTRATION_CONFIGURATION_ENVELOPE_POLICY_CANDIDATE_V1)
      .toMatchObject({
        planSource: 'internally-recomputed-twelve-step-plan',
        callerSuppliedPlanAllowed: false,
        callerSuppliedBaseDefinitionsAllowed: false,
        createsHost: false,
        publishesRegistry: false,
        activatesGeneration: false,
        swapsRegistryReference: false,
        defaultRegistryWired: false,
        defaultCompositionWired: false,
        defaultEntryWired: false,
        validationStatus: 'not-run',
      });
  });
});
