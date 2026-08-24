import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ARENA_V2_A6_FORMAL_PREVIEW_LEASE_OWNER_CANDIDATE_V1,
  ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1,
  type ArenaV2A6FormalPreviewDisposeRequestV1,
  type ArenaV2A6FormalPreviewLoadRequestV1,
} from '../src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectionContent() {
  const weaponBindings = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'weapon');
  const mapBindings = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'map');
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: weaponBindings.map(({ definitionId }, index) => ({
      weaponDefinitionId: definitionId,
      collectionOrder: index + 1,
      displayName: `候选武器${index + 1}`,
      learningFocus: `轮廓${index + 1}`,
      coreVerb: `动作${index + 1}`,
    })),
    maps: mapBindings.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `KZ候选地图${mapIndex + 1}`,
      participantRange: '1–16人',
      segments: Array.from({ length: mapIndex === 0 ? 12 : 8 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.6.map-${mapIndex + 1}.segment-${segmentIndex + 1}`,
        ordinal: segmentIndex + 1,
        displayName: `路线段${segmentIndex + 1}`,
        learningFocus: `路线重点${segmentIndex + 1}`,
        segmentKind: '跳跃路线',
        survivalRole: '选择',
      })),
    })),
    sourceContentHash: 'a660cafe',
  } as const;
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function bindingSnapshot(): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
    epochId: 'a6.6-current-approval-ledger-epoch',
  });
  const snapshot = owner.consume({
    schemaVersion: 1,
    collectionProgressInput: {
      schemaVersion: 1,
      epochId: 'a6.6-current-approval-ledger-epoch',
      tick: 10,
      locale: 'zh-CN',
      sourceState: 'loading',
      profileIdentity: null,
      collectionContent: collectionContent(),
      progressFacts: null,
      nextGoalIdentity: null,
      diagnosticCode: null,
      observedProfileSchemaVersion: null,
      reducedMotion: true,
      muted: true,
      decorativeAssetState: 'missing',
    },
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1()),
  });
  owner.destroy();
  return snapshot;
}

function ownerFixture(snapshot: unknown = bindingSnapshot()) {
  const loadCalls: ArenaV2A6FormalPreviewLoadRequestV1[] = [];
  const disposeCalls: ArenaV2A6FormalPreviewDisposeRequestV1[] = [];
  const owner = new ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1({
    schemaVersion: 1,
    bindingSnapshot: snapshot,
    loader: {
      load(request: ArenaV2A6FormalPreviewLoadRequestV1) {
        loadCalls.push(request);
        return { promise: Promise.resolve({ forbidden: true }), cancel: () => undefined };
      },
    },
    disposer: {
      dispose(request: ArenaV2A6FormalPreviewDisposeRequestV1) {
        disposeCalls.push(request);
      },
    },
  });
  return { owner, loadCalls, disposeCalls };
}

describe('Arena V2 A6.6 current production approval ledger boundary（未运行）', () => {
  it('P6.323 publishes lease/resource Owners and retains callback cleanup ownership', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).toMatch(/#operation: string \| null = null/u);
    expect(source).toMatch(/#reentrySequence = 0/u);
    expect(source).toMatch(/#reentryError: Error \| null = null/u);
    expect(source).not.toMatch(/#reentryAttempted/u);
    for (const operation of [
      'acquire',
      'release',
      'reset-epoch',
      'snapshot-read',
      'destroy',
      'load-fulfilled',
      'load-rejected',
      'load-invocation-failure',
      'load-invocation-failure-close',
    ]) expect(source).toContain(`#runSynchronousOperation('${operation}'`);
    expect(source).toMatch(
      /const settlementOwner = createDeferredPromiseOwner<void>\(\);[\s\S]*?const leaseResult = this\.#installLease\([\s\S]*?this\.#load, loadRequest/u,
    );
    expect(source).toMatch(/if \(lease\.resultSettled\) return/u);
    expect(source).toMatch(/\|\| this\.#state !== 'active'\)/u);
    for (const marker of [
      'synchronousLifecycleOperationReentryRejected: true',
      'swallowedCallbackReentryRejectedBeforeSuccessCommit: true',
      'leaseAndResourceOwnersPublishedBeforeLoaderLoad: true',
      'loadSettlementCommitsUnderOperationGuard: true',
      'releasedLeaseCannotBeRevivedByLateLoad: true',
      'publicReadsRejectedDuringOperationCommit: true',
      'stickyReentryUsesMonotonicSequenceAndFirstError: true',
      'loadOperationCapturedAndObservedBeforeCommitCheck: true',
      'cancelAndDisposeCallbacksCheckedBeforeCleanupCommit: true',
      'cleanupReentryRetainsCurrentAndLaterResources: true',
    ]) expect(source).toContain(marker);
  });

  it('accepts the complete 22-slot binding but exposes zero requestable assets', () => {
    const snapshot = bindingSnapshot();
    expect(snapshot.slots).toHaveLength(22);
    expect(snapshot.slots.every((slot) => (
      slot.formalReady === false
      && slot.assetUsePermitted === false
      && slot.previewSourceUse === 'text-shape-pattern-fallback-only'
      && slot.lifecycle.requestPermitted === false
      && slot.lifecycle.requestToken === null
      && slot.lifecycle.releaseToken === null
      && slot.fallback.active === true
    ))).toBe(true);

    const fixture = ownerFixture(snapshot);
    for (const [index, slot] of snapshot.slots.entries()) {
      expect(() => fixture.owner.acquire({
        schemaVersion: 1,
        tick: 11,
        visibleSlotLeaseId: `forbidden-slot-${index + 1}`,
        assetId: slot.assetId,
        requestToken: 'forged-production-token',
      })).toThrow(/loader前拒绝/u);
    }
    expect(fixture.loadCalls).toHaveLength(0);
    expect(fixture.disposeCalls).toHaveLength(0);
    expect(fixture.owner.getSnapshot()).toMatchObject({
      activeLeaseCount: 0,
      loadingResourceCount: 0,
      readyResourceCount: 0,
    });
    fixture.owner.destroy();
  });

  it('rejects coherent source-approval-to-production-approval forgery before loader invocation', () => {
    const forged = clone(bindingSnapshot()) as unknown as {
      slots: Array<Record<string, unknown> & {
        lifecycle: Record<string, unknown>;
        fallback: Record<string, unknown>;
      }>;
    };
    const first = forged.slots[0]!;
    first.formalReady = true;
    first.assetUsePermitted = true;
    first.previewSourceUse = 'formal-glb-permitted';
    first.lifecycle.lazyRequest = true;
    first.lifecycle.requestPermitted = true;
    first.lifecycle.requestWhen = 'slot-enters-visible-layout';
    first.lifecycle.requestToken = 'a6.4:request:forged';
    first.lifecycle.releaseWhen = 'slot-unmount-or-epoch-reset';
    first.lifecycle.releaseToken = 'a6.4:release:forged';
    first.fallback.active = false;

    expect(() => ownerFixture(forged)).toThrow(/生产批准账本|不可请求回退/u);
  });

  it('rejects production approval ledger identity drift and future fields', () => {
    const drift = clone(bindingSnapshot()) as unknown as {
      contentIdentity: Record<string, unknown>;
    };
    drift.contentIdentity.productionApprovalLedgerContentHash = 'deadbeef';
    expect(() => ownerFixture(drift)).toThrow(/catalog identity/u);

    const future = clone(bindingSnapshot()) as unknown as Record<string, unknown>;
    future.futureApproval = true;
    expect(() => ownerFixture(future)).toThrow(/exact-key/u);
  });

  it('destroys the zero-resource owner idempotently without resource callbacks', () => {
    const fixture = ownerFixture();
    fixture.owner.destroy();
    fixture.owner.destroy();
    expect(fixture.loadCalls).toHaveLength(0);
    expect(fixture.disposeCalls).toHaveLength(0);
    expect(fixture.owner.getSnapshot().state).toBe('destroyed');
  });

  it('publishes the current closed gate instead of the historical 20-ready claim', () => {
    expect(ARENA_V2_A6_FORMAL_PREVIEW_LEASE_OWNER_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      defaultSurfaceWired: false,
      currentProductionApprovedAssetCount: 0,
      currentRequestPermittedAssetCount: 0,
      futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true,
      validationStatus: 'not-run',
    });
  });
});
