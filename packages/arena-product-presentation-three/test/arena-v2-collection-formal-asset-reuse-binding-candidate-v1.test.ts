import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_CANDIDATE_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
  type ArenaV2A6CollectionFormalAssetReuseBindingInputV1,
  type ArenaV2A6FormalPreviewCatalogV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectionContent(options: Readonly<{
  readonly weaponPrefix?: string;
  readonly firstWeaponName?: string;
}> = {}) {
  const weaponBindings = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'weapon');
  const mapBindings = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'map');
  const weapons = weaponBindings.map(({ definitionId }, index) => ({
    weaponDefinitionId: options.weaponPrefix === undefined
      ? definitionId
      : `${options.weaponPrefix}.${String(index + 1).padStart(2, '0')}`,
    collectionOrder: index + 1,
    displayName: index === 0 ? options.firstWeaponName ?? '候选武器一' : `候选武器${index + 1}`,
    learningFocus: `学习轮廓${index + 1}`,
    coreVerb: `动作动词${index + 1}`,
  }));
  const maps = mapBindings.map(({ definitionId }, mapIndex) => ({
    mapDefinitionId: definitionId,
    displayName: `KZ候选地图${mapIndex + 1}`,
    participantRange: '1–16人',
    segments: Array.from({ length: mapIndex === 0 ? 12 : 8 }, (_, segmentIndex) => ({
      segmentDefinitionId: `test.a6.4.map-${mapIndex + 1}.segment-${segmentIndex + 1}`,
      ordinal: segmentIndex + 1,
      displayName: `路线段${mapIndex + 1}-${segmentIndex + 1}`,
      learningFocus: `路线重点${mapIndex + 1}-${segmentIndex + 1}`,
      segmentKind: '跳跃路线',
      survivalRole: '选择',
    })),
  }));
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons,
    maps,
    sourceContentHash: 'a64c0ffe',
  } as const;
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function collectionInput(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    schemaVersion: 1,
    epochId: 'a6.4-epoch-1',
    tick: 10,
    locale: 'zh-CN',
    sourceState: 'loading',
    profileIdentity: null,
    collectionContent: collectionContent(),
    progressFacts: null,
    nextGoalIdentity: null,
    diagnosticCode: null,
    observedProfileSchemaVersion: null,
    reducedMotion: false,
    muted: false,
    decorativeAssetState: 'ready',
    ...overrides,
  };
}

function input(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    schemaVersion: 1,
    collectionProgressInput: collectionInput(),
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1()),
    ...overrides,
  } as ArenaV2A6CollectionFormalAssetReuseBindingInputV1;
}

function rehashCatalog(value: ArenaV2A6FormalPreviewCatalogV1): ArenaV2A6FormalPreviewCatalogV1 {
  const source = clone(value) as unknown as Record<string, unknown>;
  delete source.contentHash;
  return {
    ...source,
    contentHash: createDeterministicDataHash(
      source,
      'Arena V2 A6.4 Formal Preview Catalog V1',
    ),
  } as unknown as ArenaV2A6FormalPreviewCatalogV1;
}

describe('Arena V2 A6.4 collection formal asset reuse binding candidate V1', () => {
  it('projects the dynamic 20 weapon and 2 map directory onto the existing formal catalog', () => {
    const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    });
    const snapshot = owner.consume(input());

    expect(snapshot.status).toBe('production-unreachable');
    expect(snapshot.hardGate).toBe(false);
    expect(snapshot.slots).toHaveLength(22);
    expect(snapshot.slots.filter(({ kind }) => kind === 'weapon')).toHaveLength(20);
    expect(snapshot.slots.filter(({ kind }) => kind === 'map')).toHaveLength(2);
    expect(new Set(snapshot.slots.map(({ assetId }) => assetId)).size).toBe(22);
    expect(snapshot.slots.filter(({ kind }) => kind === 'weapon').every((slot) => (
      slot.role === 'weapon-attachment-model'
      && slot.maturity === 'verified-intake-only'
      && slot.runtimeSourceKey.endsWith('.glb')
      && !slot.formalReady
      && !slot.assetUsePermitted
      && slot.previewSourceUse === 'text-shape-pattern-fallback-only'
      && slot.fallback.active
      && !slot.lifecycle.requestPermitted
      && slot.lifecycle.requestToken === null
      && slot.lifecycle.releaseToken === null
      && slot.budget.maximumEncodedBytes === 65_536
      && slot.budget.withinPerItemLimit === true
    ))).toBe(true);
    expect(snapshot.slots.filter(({ kind }) => kind === 'map').every((slot) => (
      slot.role === 'map-model'
      && slot.maturity === 'authored-candidate-not-approved'
      && !slot.formalReady
      && !slot.assetUsePermitted
      && slot.previewSourceUse === 'text-shape-pattern-fallback-only'
      && slot.fallback.active
      && !slot.lifecycle.requestPermitted
      && slot.lifecycle.requestToken === null
      && slot.lifecycle.releaseToken === null
      && slot.budget.coverage === 'map-glb-not-covered-by-current-policy'
      && slot.budget.maximumEncodedBytes === null
    ))).toBe(true);
    expect(snapshot.governance.binaryAssetBytesAdded).toBe(0);
    expect(snapshot.governance.formalAssetGatePassed).toBe(false);
    expect(ARENA_V2_A6_FORMAL_ASSET_REUSE_BINDING_CANDIDATE_V1.pageCountAdded).toBe(0);
    owner.destroy();
  });

  it('keeps source, catalog, provenance, SHA and partial budget evidence explicit', () => {
    const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    });
    const snapshot = owner.consume(input());
    const expectedTotal = snapshot.slots.reduce((total, slot) => total + slot.byteLength, 0);

    expect(snapshot.contentIdentity.catalogRevision).toBe(
      ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.sourceCatalogContentHash,
    );
    expect(snapshot.contentIdentity.catalogContentHash).toBe(
      ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.contentHash,
    );
    expect(snapshot.contentIdentity.productionApprovalLedgerId).toBe(
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.ledgerId,
    );
    expect(snapshot.contentIdentity.productionApprovalLedgerContentHash).toBe(
      ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY.contentHash,
    );
    expect(snapshot.budget.totalEncodedBytes).toBe(expectedTotal);
    expect(snapshot.budget.withinTotalEncodedLimit).toBe(true);
    expect(snapshot.budget.perItemBudgetClosedCount).toBe(20);
    expect(snapshot.budget.uncoveredPerItemBudgetCount).toBe(2);
    expect(snapshot.budget.formalBudgetReady).toBe(false);
    expect(snapshot.slots.every((slot) => (
      /^[0-9a-f]{64}$/u.test(slot.sha256)
      && slot.provenance.sourceRevision.length > 0
      && slot.provenance.proofDocument.length > 0
      && slot.provenance.commercialUseDeclared
      && slot.provenance.modificationDeclared
      && slot.provenance.redistributionDeclared
    ))).toBe(true);
    owner.destroy();
  });

  it('falls back to text, shape and pattern for a missing GLB without programmatic geometry', () => {
    const missingAssetId = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records
      .find(({ role }) => role === 'weapon-attachment-model')!.assetId;
    const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    });
    const snapshot = owner.consume(input({
      availability: createArenaV2A6CurrentFormalPreviewAvailabilityV1([missingAssetId]),
    }));
    const missing = snapshot.slots.find(({ assetId }) => assetId === missingAssetId)!;

    expect(missing.availability).toBe('missing');
    expect(missing.formalReady).toBe(false);
    expect(missing.assetUsePermitted).toBe(false);
    expect(missing.previewSourceUse).toBe('text-shape-pattern-fallback-only');
    expect(missing.lifecycle.requestPermitted).toBe(false);
    expect(missing.lifecycle.requestToken).toBeNull();
    expect(missing.lifecycle.releaseToken).toBeNull();
    expect(missing.fallback).toEqual({
      active: true,
      content: 'text-shape-pattern-only',
      preservesDefinitionIdentity: true,
      programmaticGeometryAllowed: false,
      claimsFormalApproval: false,
    });
    owner.destroy();
  });

  it('defines two static preview strategies, responsive safe areas, reduced motion and mute equivalence', () => {
    const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    });
    const snapshot = owner.consume(input({
      collectionProgressInput: collectionInput({ reducedMotion: true, muted: true }),
    }));

    expect(snapshot.layouts.map(({ viewport }) => viewport)).toEqual(['390x844', '1440x900']);
    expect(snapshot.layouts.every((layout) => (
      layout.safeAreaRequired
      && layout.existingItemTouchTargetMinimumCssPixels === 48
      && layout.newTouchActionsAdded === 0
      && !layout.horizontalOverflowAllowed
    ))).toBe(true);
    expect(snapshot.slots.every(({ previewStrategies }) => previewStrategies.every((strategy) => (
      !strategy.autoRotate
      && strategy.motionPolicy === 'static-no-auto-rotate'
      && !strategy.touchActionAdded
      && !strategy.selectionIntentAdded
    )))).toBe(true);
    expect(snapshot.accessibility.mutedChangesPreviewMeaning).toBe(false);
    expect(snapshot.accessibility.assetFailurePreservesTextShapePattern).toBe(true);
    owner.destroy();
  });

  it('emits zero request/release tokens while production approval remains missing', () => {
    const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    });
    const first = owner.consume(input());
    const requests = first.slots.map(({ lifecycle }) => lifecycle.requestToken);
    const releases = first.slots.map(({ lifecycle }) => lifecycle.releaseToken);

    expect(requests.every((token) => token === null)).toBe(true);
    expect(releases.every((token) => token === null)).toBe(true);
    expect(first.slots.every(({ formalReady, assetUsePermitted, lifecycle, fallback }) => (
      formalReady === false
      && assetUsePermitted === false
      && lifecycle.lazyRequest === false
      && lifecycle.requestPermitted === false
      && lifecycle.requestToken === null
      && lifecycle.releaseToken === null
      && fallback.active === true
      && !lifecycle.loadsBytesHere
      && !lifecycle.ownsThreeResourcesHere
    ))).toBe(true);
    expect(owner.consume(input())).toBe(first);
    owner.destroy();
  });

  it('allows a higher-tick availability failure while rejecting same-tick conflict', () => {
    const missingAssetId = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records[0]!.assetId;
    const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    });
    owner.consume(input());
    expect(() => owner.consume(input({
      availability: createArenaV2A6CurrentFormalPreviewAvailabilityV1([missingAssetId]),
    }))).toThrow(/同tick/u);
    const next = owner.consume(input({
      collectionProgressInput: collectionInput({ tick: 11 }),
      availability: createArenaV2A6CurrentFormalPreviewAvailabilityV1([missingAssetId]),
    }));
    expect(next.slots.find(({ assetId }) => assetId === missingAssetId)?.fallback.active).toBe(true);
    owner.destroy();
  });

  it('rejects duplicate, unknown and missing catalog coverage before publishing a snapshot', () => {
    const duplicateRecord = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(duplicateRecord.records, 1, clone(duplicateRecord.records[0]!));
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: rehashCatalog(duplicateRecord) }))).toThrow(/重复/u);

    const unknownBinding = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(unknownBinding.bindings, 0, {
      ...unknownBinding.bindings[0]!,
      definitionId: 'test.a6.4.unknown-definition',
    });
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: rehashCatalog(unknownBinding) }))).toThrow();

    const missingBinding = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(missingBinding, 'bindings', missingBinding.bindings.slice(1));
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: rehashCatalog(missingBinding) }))).toThrow(/20武器＋2地图/u);
  });

  it('rejects forged SHA, license expansion, approval drift and per-item budget overflow', () => {
    const forgedSha = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(forgedSha.records, 0, { ...forgedSha.records[0]!, sha256: 'f'.repeat(64) });
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: rehashCatalog(forgedSha) }))).toThrow(/一致替换/u);

    const licenseDrift = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(licenseDrift.records, 0, {
      ...licenseDrift.records[0]!,
      provenance: { ...licenseDrift.records[0]!.provenance, commercialUseDeclared: false },
    });
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: rehashCatalog(licenseDrift) }))).toThrow(/许可/u);

    const approvalDrift = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    const weaponIndex = approvalDrift.records.findIndex(({ role }) => (
      role === 'weapon-attachment-model'
    ));
    Reflect.set(approvalDrift.records, weaponIndex, {
      ...approvalDrift.records[weaponIndex]!,
      provenance: {
        ...approvalDrift.records[weaponIndex]!.provenance,
        approvedBy: null,
        approvedAt: null,
      },
    });
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: rehashCatalog(approvalDrift) }))).toThrow(/一致替换/u);

    const oversized = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(oversized.records, weaponIndex, {
      ...oversized.records[weaponIndex]!,
      byteLength: 65_537,
    });
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: rehashCatalog(oversized) }))).toThrow(/64KiB/u);
  });

  it('rejects fake hashes, future fields, getters, thenables and incomplete availability', () => {
    const fakeCatalogHash = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(fakeCatalogHash, 'contentHash', 'deadbeef');
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ formalAssetCatalog: fakeCatalogHash }))).toThrow(/hash/u);

    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume({ ...input(), futureField: true })).toThrow(/exact-key/u);

    const getterInput = input() as unknown as Record<string, unknown>;
    Object.defineProperty(getterInput, 'availability', { enumerable: true, get: () => ({}) });
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(getterInput)).toThrow(/getter/u);

    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume({ ...input(), availability: { then: () => undefined } })).toThrow(/thenable|then/u);

    const incompleteAvailability = clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1());
    Reflect.set(incompleteAvailability, 'entries', incompleteAvailability.entries.slice(1));
    expect(() => new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    }).consume(input({ availability: incompleteAvailability }))).toThrow(/完整覆盖/u);
  });

  it('rejects same-epoch content or catalog drift and permits a clean epoch reset', () => {
    const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
      epochId: 'a6.4-epoch-1',
    });
    owner.consume(input());
    expect(() => owner.consume(input({
      collectionProgressInput: collectionInput({
        tick: 11,
        collectionContent: collectionContent({ firstWeaponName: '同目录被替换的名称' }),
      }),
    }))).toThrow(/collectionContent|内容/u);

    const catalogDrift = clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1);
    Reflect.set(catalogDrift.records, 0, {
      ...catalogDrift.records[0]!,
      runtimeSourceKey: './assets/arena/equipment/coherent-substitution.glb',
      artifactPath: 'public/assets/arena/equipment/coherent-substitution.glb',
    });
    expect(() => owner.consume(input({
      collectionProgressInput: collectionInput({ tick: 11 }),
      formalAssetCatalog: rehashCatalog(catalogDrift),
    }))).toThrow();

    owner.resetPresentationEpoch({ epochId: 'a6.4-epoch-2' });
    const resetSnapshot = owner.consume(input({
      collectionProgressInput: collectionInput({ epochId: 'a6.4-epoch-2', tick: 1 }),
    }));
    expect(resetSnapshot.epochId).toBe('a6.4-epoch-2');
    owner.destroy();
    expect(() => owner.getSnapshot()).toThrow(/destroyed/u);
    expect(() => owner.consume(input())).toThrow(/destroyed/u);
  });
});
