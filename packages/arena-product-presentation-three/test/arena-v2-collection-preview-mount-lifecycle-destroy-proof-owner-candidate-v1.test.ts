import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import type {
  ArenaV2A6FormalPreviewLeaseResultV1,
} from '../src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import type {
  ArenaV2CollectionFourScreenIdV1,
  ArenaV2CollectionFourScreenReadSnapshotV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_PREVIEW_MOUNT_LIFECYCLE_DESTROY_PROOF_OWNER_CANDIDATE_V1,
  ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1,
} from '../src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.js';
import type {
  ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1,
  ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1,
  ArenaV2A6BeforeReleaseDestroyedProofV1,
} from '../src/arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.js';
import {
  ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1,
  type ArenaV2CollectionPreviewSlotLayoutObservationInputV1,
  type ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
  type ArenaV2CollectionVisibleWeaponMountLayoutV1,
} from '../src/arena-v2-collection-visible-layout-observation-owner-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewViewportV1,
} from '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

it('P6.320 isolates mount/proof lifecycle commits with sticky child reentry facts', () => {
  const source = readFileSync(new URL(
    '../src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.ts',
    import.meta.url,
  ), 'utf8');
  expect(source).toMatch(/#operation: string \| null = null/u);
  expect(source).toMatch(/#reentrySequence = 0/u);
  expect(source).toMatch(/#reentryError: Error \| null = null/u);
  expect(source).not.toMatch(/#reentryAttempted/u);
  for (const operation of [
    'constructor-snapshot',
    'commit-execution',
    'prepare-release',
    'read-destroyed-proof',
    'commit-release',
    'rollback-release',
    'prepare-owner-destroy',
    'finalize-destroy',
    'reset-epoch',
    'snapshot-read',
    'lease-settled',
    'lease-rejected',
  ]) expect(source).toContain(`#runSynchronousOperation('${operation}'`);
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedA6_9CallbackReentryFailsMountLifecycleOwner: true',
    'leaseSettlementCommitsUnderOperationGuard: true',
    'proofReadAndReleaseCommitAreOperationIsolated: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'mountProofSettlementAndSnapshotCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) expect(source).toContain(marker);
});

function collectionContent() {
  const weapons = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'weapon');
  const maps = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'map');
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: weapons.map(({ definitionId }, index) => ({
      weaponDefinitionId: definitionId,
      collectionOrder: index + 1,
      displayName: `A6.12b Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: maps.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.12b Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.12b.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route-control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a612b001',
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function bindingSnapshot(
  epochId: string,
  tick: number,
  missingAssetIds: readonly string[] = [],
): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({ epochId });
  const snapshot = owner.consume({
    schemaVersion: 1,
    collectionProgressInput: {
      schemaVersion: 1,
      epochId,
      tick,
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
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1(missingAssetIds)),
  });
  owner.destroy();
  return snapshot;
}

function readSnapshot(
  screenId: ArenaV2CollectionFourScreenIdV1,
  tick: number,
  options: Readonly<{
    epochId?: string;
    missingAssetIds?: readonly string[];
    detailOrdinal?: number;
  }> = {},
): ArenaV2CollectionFourScreenReadSnapshotV1 {
  const epochId = options.epochId ?? 'epoch-a';
  const binding = bindingSnapshot(epochId, tick, options.missingAssetIds);
  const kind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const detail = screenId.endsWith('-detail');
  const slots = binding.slots
    .filter((slot) => slot.kind === kind)
    .filter((_, index) => !detail || index === (options.detailOrdinal ?? 1) - 1)
    .map((slot) => {
      const previewStrategy = slot.previewStrategies
        .find((candidate) => candidate.screenId === screenId)!;
      const { previewStrategies: _strategies, ...base } = slot;
      void _strategies;
      return Object.freeze({ ...base, previewStrategy });
    });
  const page = Object.freeze({
    ...(detail ? { screenId, targetDefinitionId: slots[0]!.definitionId } : {}),
    profileIdentity: null,
  });
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    validationStatus: 'not-run',
    epochId,
    tick,
    screenId,
    sourceState: 'loading',
    indexPage: detail ? null : page,
    detailPage: detail ? page : null,
    previewSlots: Object.freeze(slots),
    formalAssetLeaseBinding: binding,
    formalAssetGovernance: Object.freeze({
      contentIdentity: binding.contentIdentity,
      budget: binding.budget,
      layouts: binding.layouts,
      accessibility: binding.accessibility,
      governance: binding.governance,
      loadsResourcesHere: false,
      ownsThreeResourcesHere: false,
    }),
  }) as unknown as ArenaV2CollectionFourScreenReadSnapshotV1;
}

function viewport(id: '390x844' | '1440x900'): ArenaV2A6WeaponPreviewViewportV1 {
  return id === '390x844'
    ? Object.freeze({ viewportId: id, widthCssPixels: 390, heightCssPixels: 844 })
    : Object.freeze({ viewportId: id, widthCssPixels: 1440, heightCssPixels: 900 });
}

function clip(id: '390x844' | '1440x900') {
  return id === '390x844'
    ? Object.freeze({ x: 12, y: 96, width: 366, height: 600 })
    : Object.freeze({ x: 12, y: 96, width: 1416, height: 520 });
}

function slotLayouts(
  snapshot: ArenaV2CollectionFourScreenReadSnapshotV1,
  viewportId: '390x844' | '1440x900',
  visibleCount: number,
  xOffset = 0,
): ArenaV2CollectionPreviewSlotLayoutObservationInputV1[] {
  const detail = snapshot.screenId.endsWith('-detail');
  return snapshot.previewSlots.map((slot, index) => {
    const visible = index < visibleCount;
    const rect = detail
      ? viewportId === '390x844'
        ? { x: 95 + xOffset, y: 220, width: 200, height: 200 }
        : { x: 590 + xOffset, y: 210, width: 260, height: 260 }
      : viewportId === '390x844'
        ? { x: 24, y: visible ? 120 + index * 96 : 900 + index * 96, width: 80, height: 80 }
        : {
          x: 24 + (index % 10) * 132,
          y: visible ? 120 + Math.floor(index / 10) * 132 : 980 + index * 132,
          width: 112,
          height: 112,
        };
    return {
      kind: slot.kind,
      definitionId: slot.definitionId,
      assetId: slot.assetId,
      ordinal: slot.ordinal,
      previewRectCssPixels: rect,
    };
  });
}

function layoutSnapshot(options: Readonly<{
  tick: number;
  screenId?: ArenaV2CollectionFourScreenIdV1;
  viewportId?: '390x844' | '1440x900';
  visibleCount?: number;
  xOffset?: number;
  epochId?: string;
  missingAssetIds?: readonly string[];
  detailOrdinal?: number;
}>): ArenaV2CollectionVisibleLayoutObservationSnapshotV1 {
  const screenId = options.screenId ?? 'weapon-detail';
  const viewportId = options.viewportId ?? '390x844';
  const read = readSnapshot(screenId, options.tick, options);
  const owner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
    epochId: read.epochId,
  });
  const result = owner.observe({
    schemaVersion: 1,
    epochId: read.epochId,
    tick: read.tick,
    screenId,
    viewport: viewport(viewportId),
    readSnapshot: read,
    previousActiveLeaseLedger: [],
    contentClipRectCssPixels: clip(viewportId),
    slotLayouts: slotLayouts(
      read,
      viewportId,
      options.visibleCount ?? (screenId.endsWith('-detail') ? 1 : 1),
      options.xOffset,
    ),
  });
  owner.destroy();
  return result;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function staticWeaponHandle(name: string): THREE.Object3D {
  const root = new THREE.Group();
  root.name = name;
  const geometry = new THREE.BoxGeometry(0.4, 1.6, 0.25);
  const material = new THREE.MeshStandardMaterial({ color: 0x8899aa });
  root.add(new THREE.Mesh(geometry, material));
  return root;
}

function requestIdentity(
  layout: ArenaV2CollectionVisibleWeaponMountLayoutV1,
  binding: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
): string {
  return createDeterministicDataHash({
    epochId: binding.epochId,
    catalogContentHash: binding.contentIdentity.catalogContentHash,
    assetId: layout.assetId,
    sha256: layout.slot.sha256,
    requestToken: layout.slot.lifecycle.requestToken!,
  }, 'Arena V2 A6.6 Formal Preview Request Identity V1');
}

function leaseId(layout: ArenaV2CollectionVisibleWeaponMountLayoutV1, sequence: number): string {
  return `a6.10:${layout.screenId}:${layout.assetId}:${sequence}`;
}

function readyResult(
  layout: ArenaV2CollectionVisibleWeaponMountLayoutV1,
  binding: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  sequence: number,
  handle = staticWeaponHandle(`weapon-${sequence}`),
): ArenaV2A6FormalPreviewLeaseResultV1 {
  return Object.freeze({
    schemaVersion: 1,
    status: 'ready',
    visibleSlotLeaseId: leaseId(layout, sequence),
    requestIdentity: requestIdentity(layout, binding),
    assetId: layout.assetId,
    handle,
    fallbackActive: false,
  });
}

function fallbackResult(
  layout: ArenaV2CollectionVisibleWeaponMountLayoutV1,
  binding: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  sequence: number,
): ArenaV2A6FormalPreviewLeaseResultV1 {
  return Object.freeze({
    schemaVersion: 1,
    status: 'fallback',
    visibleSlotLeaseId: leaseId(layout, sequence),
    requestIdentity: requestIdentity(layout, binding),
    assetId: layout.assetId,
    handle: null,
    fallbackActive: true,
    fallbackContent: 'text-shape-pattern-only',
    failureCode: 'load-rejected',
  });
}

function activeRecord(
  layout: ArenaV2CollectionVisibleWeaponMountLayoutV1,
  binding: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
  sequence: number,
  promise: Promise<ArenaV2A6FormalPreviewLeaseResultV1>,
  settledResult: ArenaV2A6FormalPreviewLeaseResultV1 | null = null,
): ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1 {
  return Object.freeze({
    schemaVersion: 1,
    epochId: binding.epochId,
    catalogContentHash: binding.contentIdentity.catalogContentHash,
    screenId: layout.screenId,
    activationSequence: sequence,
    visibleSlotLeaseId: leaseId(layout, sequence),
    kind: 'weapon',
    definitionId: layout.definitionId,
    assetId: layout.assetId,
    ordinal: layout.ordinal,
    requestToken: layout.slot.lifecycle.requestToken!,
    releaseToken: layout.slot.lifecycle.releaseToken!,
    requestIdentity: requestIdentity(layout, binding),
    leaseResultPromise: promise,
    settlementState: settledResult?.status ?? 'pending',
    settledResult,
  });
}

function executionResult(
  layout: ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
  records: readonly ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1[],
  planIdentity: string,
  proofs: readonly ArenaV2A6BeforeReleaseDestroyedProofV1[] = [],
): ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1 {
  const fallbackSlots = layout.visibleStaticFallbackLayouts.map((fallback) => Object.freeze({
    schemaVersion: 1 as const,
    kind: fallback.kind,
    definitionId: fallback.definitionId,
    assetId: fallback.assetId,
    ordinal: fallback.ordinal,
    reason: fallback.reason,
    previewSourceUse: fallback.previewSourceUse,
    fallbackContent: fallback.fallbackContent,
    requestPermitted: false as const,
  }));
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    validationStatus: 'not-run',
    productionReachable: false,
    defaultSurfaceWired: false,
    epochId: layout.epochId,
    tick: layout.tick,
    screenId: layout.screenId,
    planIdentity,
    releaseBarrierProofs: Object.freeze([...proofs]),
    activeRecords: Object.freeze([...records]),
    fallbackSlots: Object.freeze(fallbackSlots),
    assetReadyCount: records.filter(({ settlementState }) => settlementState === 'ready').length,
    leaseFallbackCount: records.filter(({ settlementState }) => settlementState === 'fallback').length,
    staticFallbackCount: fallbackSlots.length,
  });
}

function bindingFromLayout(
  layout: ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  return layout.plannerInput.readSnapshot.formalAssetLeaseBinding;
}

function ownerFor(layout: ArenaV2CollectionVisibleLayoutObservationSnapshotV1) {
  return new ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1({
    schemaVersion: 1,
    bindingSnapshot: bindingFromLayout(layout),
  });
}

function commit(
  owner: ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1,
  layout: ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
  records: readonly ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1[],
  planIdentity = `plan-${layout.tick}`,
) {
  return owner.commitExecution({
    schemaVersion: 1,
    layoutSnapshot: layout,
    executionResult: executionResult(layout, records, planIdentity),
  });
}

function releaseCommand(
  record: ArenaV2CollectionVisiblePreviewActiveLeaseRecordV1,
  tick: number,
) {
  return Object.freeze({
    schemaVersion: 1 as const,
    tick,
    visibleSlotLeaseId: record.visibleSlotLeaseId,
    releaseToken: record.releaseToken,
  });
}

describe('Arena V2 A6.12b mount lifecycle and destroyed-proof owner candidate V1', () => {
  it('mounts one ready weapon and keeps fallback as no-mount', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const ready = readyResult(mountLayout, binding, 1);
    const readyPromise = Promise.resolve(ready);
    const owner = ownerFor(layout);
    const mounted = commit(owner, layout, [activeRecord(
      mountLayout,
      binding,
      1,
      readyPromise,
      ready,
    )]);
    expect(mounted.mountedCount).toBe(1);
    expect(mounted.activeMounts[0]).toMatchObject({
      assetId: mountLayout.assetId,
      visibleSlotLeaseId: ready.visibleSlotLeaseId,
      screenId: 'weapon-detail',
    });

    const fallbackLayout = layoutSnapshot({ tick: 10, epochId: 'epoch-fallback' });
    const fallbackBinding = bindingFromLayout(fallbackLayout);
    const fallbackMount = fallbackLayout.visibleWeaponMountLayouts[0]!;
    const fallback = fallbackResult(fallbackMount, fallbackBinding, 1);
    const fallbackOwner = ownerFor(fallbackLayout);
    const fallbackSnapshot = commit(fallbackOwner, fallbackLayout, [activeRecord(
      fallbackMount,
      fallbackBinding,
      1,
      Promise.resolve(fallback),
      fallback,
    )]);
    expect(fallbackSnapshot.fallbackLeaseCount).toBe(1);
    expect(fallbackSnapshot.mountedCount).toBe(0);
  });

  it('publishes pending immediately and ignores a ready settlement after release commit', async () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const pending = deferred<ArenaV2A6FormalPreviewLeaseResultV1>();
    const record = activeRecord(mountLayout, binding, 1, pending.promise);
    const owner = ownerFor(layout);
    expect(commit(owner, layout, [record]).pendingLeaseCount).toBe(1);
    const prepared = owner.prepareRelease({
      schemaVersion: 1,
      planIdentity: 'release-pending',
      tick: 11,
      releaseCommands: [releaseCommand(record, 11)],
    });
    const releaseExecution = executionResult(
      { ...layout, tick: 11 } as ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
      [],
      'release-pending',
      prepared.proofs,
    );
    owner.commitRelease({
      schemaVersion: 1,
      planIdentity: 'release-pending',
      executionResult: releaseExecution,
    });
    pending.resolve(readyResult(mountLayout, binding, 1));
    await pending.promise;
    await Promise.resolve();
    expect(owner.getSnapshot()).toMatchObject({ activeLeaseCount: 0, mountedCount: 0 });
    expect(owner.getSnapshot().lateSettlementDiagnosticCount).toBe(1);
  });

  it('remounts a retained ready lease when its higher-tick preview rect changes', () => {
    const firstLayout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(firstLayout);
    const firstMountLayout = firstLayout.visibleWeaponMountLayouts[0]!;
    const ready = readyResult(firstMountLayout, binding, 1);
    const promise = Promise.resolve(ready);
    const firstRecord = activeRecord(firstMountLayout, binding, 1, promise, ready);
    const owner = ownerFor(firstLayout);
    const first = commit(owner, firstLayout, [firstRecord]);
    const firstMountId = first.activeMounts[0]!.mountId;

    const secondLayout = layoutSnapshot({ tick: 11, xOffset: 8 });
    const secondRecord = activeRecord(
      secondLayout.visibleWeaponMountLayouts[0]!,
      bindingFromLayout(secondLayout),
      1,
      promise,
      ready,
    );
    const second = commit(owner, secondLayout, [secondRecord]);
    expect(second.mountedCount).toBe(1);
    expect(second.activeMounts[0]!.mountId).not.toBe(firstMountId);
    expect(second.activeMounts[0]!.previewRectCssPixels.x).toBe(103);
  });

  it('prepares proofs without side effects, commits release, and replays exact calls', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const ready = readyResult(mountLayout, binding, 1);
    const record = activeRecord(mountLayout, binding, 1, Promise.resolve(ready), ready);
    const owner = ownerFor(layout);
    commit(owner, layout, [record]);
    const prepareInput = {
      schemaVersion: 1 as const,
      planIdentity: 'release-one',
      tick: 11,
      releaseCommands: [releaseCommand(record, 11)],
    };
    const prepared = owner.prepareRelease(prepareInput);
    expect(owner.prepareRelease(prepareInput)).toBe(prepared);
    const beforeRead = owner.getSnapshot();
    expect(owner.readDestroyedProof({
      schemaVersion: 1,
      epochId: layout.epochId,
      tick: 11,
      visibleSlotLeaseId: record.visibleSlotLeaseId,
      requestIdentity: record.requestIdentity,
      assetId: record.assetId,
    })).toBe(prepared.proofs[0]);
    expect(owner.getSnapshot()).toBe(beforeRead);
    const released = executionResult(
      { ...layout, tick: 11 } as ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
      [],
      'release-one',
      prepared.proofs,
    );
    const committed = owner.commitRelease({
      schemaVersion: 1,
      planIdentity: 'release-one',
      executionResult: released,
    });
    expect(committed).toMatchObject({ activeLeaseCount: 0, mountedCount: 0 });
    expect(owner.commitRelease({
      schemaVersion: 1,
      planIdentity: 'release-one',
      executionResult: released,
    })).toBe(committed);
  });

  it('rolls back only active before-mutation rejection and remounts with a new sequence', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const ready = readyResult(mountLayout, binding, 1);
    const record = activeRecord(mountLayout, binding, 1, Promise.resolve(ready), ready);
    const owner = ownerFor(layout);
    const first = commit(owner, layout, [record]);
    const firstMountId = first.activeMounts[0]!.mountId;
    owner.prepareRelease({
      schemaVersion: 1,
      planIdentity: 'rollback-one',
      tick: 11,
      releaseCommands: [releaseCommand(record, 11)],
    });
    const rolledBack = owner.rollbackPreparedRelease({
      schemaVersion: 1,
      planIdentity: 'rollback-one',
      tick: 11,
      resourceExecutorState: 'active',
      rejectionPhase: 'before-resource-mutation',
    });
    expect(rolledBack.mountedCount).toBe(1);
    expect(rolledBack.activeMounts[0]!.mountId).not.toBe(firstMountId);
    expect(owner.rollbackPreparedRelease({
      schemaVersion: 1,
      planIdentity: 'rollback-one',
      tick: 11,
      resourceExecutorState: 'active',
      rejectionPhase: 'before-resource-mutation',
    })).toBe(rolledBack);
  });

  it('rejects partial-or-unknown rollback and never remounts the released handle', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const ready = readyResult(mountLayout, binding, 1);
    const record = activeRecord(mountLayout, binding, 1, Promise.resolve(ready), ready);
    const owner = ownerFor(layout);
    commit(owner, layout, [record]);
    owner.prepareRelease({
      schemaVersion: 1,
      planIdentity: 'partial',
      tick: 11,
      releaseCommands: [releaseCommand(record, 11)],
    });
    expect(() => owner.rollbackPreparedRelease({
      schemaVersion: 1,
      planIdentity: 'partial',
      tick: 11,
      resourceExecutorState: 'active',
      rejectionPhase: 'partial-or-unknown',
    })).toThrow(/resource mutation|resource.*active|A6\.11b/i);
    expect(owner.getSnapshot()).toMatchObject({ state: 'failed', mountedCount: 0 });
  });

  it('absorbs an existing prepared release into owner destroy and reuses its proof', () => {
    const layout = layoutSnapshot({
      tick: 10,
      screenId: 'weapon-index',
      viewportId: '1440x900',
      visibleCount: 2,
    });
    const binding = bindingFromLayout(layout);
    const records = layout.visibleWeaponMountLayouts.map((mountLayout, index) => {
      const result = readyResult(mountLayout, binding, index + 1);
      return activeRecord(mountLayout, binding, index + 1, Promise.resolve(result), result);
    });
    const owner = ownerFor(layout);
    commit(owner, layout, records);
    const prepared = owner.prepareRelease({
      schemaVersion: 1,
      planIdentity: 'partial-resource-plan',
      tick: 11,
      releaseCommands: [releaseCommand(records[0]!, 11)],
    });
    const firstProof = prepared.proofs[0]!;
    const destroyInput = { schemaVersion: 1 as const, tick: 11 };
    const destroyPrepared = owner.prepareAllForOwnerDestroy(destroyInput);
    expect(destroyPrepared).toMatchObject({
      state: 'destroy-prepared',
      preparedLeaseCount: 2,
      proofCount: 2,
      failedMountLeaseIds: [],
    });
    expect(owner.readDestroyedProof({
      schemaVersion: 1,
      epochId: layout.epochId,
      tick: 11,
      visibleSlotLeaseId: records[0]!.visibleSlotLeaseId,
      requestIdentity: records[0]!.requestIdentity,
      assetId: records[0]!.assetId,
    })).toBe(firstProof);
    expect(owner.readDestroyedProof({
      schemaVersion: 1,
      epochId: layout.epochId,
      tick: 11,
      visibleSlotLeaseId: records[1]!.visibleSlotLeaseId,
      requestIdentity: records[1]!.requestIdentity,
      assetId: records[1]!.assetId,
    }).destroyed).toBe(true);
    expect(owner.getSnapshot()).toMatchObject({
      state: 'destroy-prepared',
      mountedCount: 0,
      preparedReleaseLeaseCount: 0,
    });
    expect(owner.prepareAllForOwnerDestroy(destroyInput)).toBe(destroyPrepared);
  });

  it('does not mount a late settlement after owner destroy preparation', async () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const pending = deferred<ArenaV2A6FormalPreviewLeaseResultV1>();
    const record = activeRecord(mountLayout, binding, 1, pending.promise);
    const owner = ownerFor(layout);
    commit(owner, layout, [record]);
    owner.prepareAllForOwnerDestroy({ schemaVersion: 1, tick: 11 });
    pending.resolve(readyResult(mountLayout, binding, 1));
    await pending.promise;
    await Promise.resolve();
    expect(owner.getSnapshot()).toMatchObject({
      state: 'destroy-prepared',
      mountedCount: 0,
      readyLeaseCount: 0,
    });
    expect(owner.getSnapshot().lateSettlementDiagnosticCount).toBe(1);
  });

  it('supports twenty pending records without waiting for settlement', () => {
    const layout = layoutSnapshot({
      tick: 10,
      screenId: 'weapon-index',
      viewportId: '1440x900',
      visibleCount: 20,
    });
    const binding = bindingFromLayout(layout);
    const records = layout.visibleWeaponMountLayouts.map((mountLayout, index) => activeRecord(
      mountLayout,
      binding,
      index + 1,
      deferred<ArenaV2A6FormalPreviewLeaseResultV1>().promise,
    ));
    const owner = ownerFor(layout);
    expect(commit(owner, layout, records)).toMatchObject({
      activeLeaseCount: 20,
      pendingLeaseCount: 20,
      mountedCount: 0,
    });
  });

  it('rejects forged proof identity and preserves the prepared transaction', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const ready = readyResult(mountLayout, binding, 1);
    const record = activeRecord(mountLayout, binding, 1, Promise.resolve(ready), ready);
    const owner = ownerFor(layout);
    commit(owner, layout, [record]);
    const prepared = owner.prepareRelease({
      schemaVersion: 1,
      planIdentity: 'forged-proof',
      tick: 11,
      releaseCommands: [releaseCommand(record, 11)],
    });
    const forged = [{ ...prepared.proofs[0]!, requestIdentity: 'forged-request' }];
    expect(() => owner.commitRelease({
      schemaVersion: 1,
      planIdentity: 'forged-proof',
      executionResult: executionResult(
        { ...layout, tick: 11 } as ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
        [],
        'forged-proof',
        forged,
      ),
    })).toThrow(/proof.*漂移/);
    expect(owner.getSnapshot().preparedReleaseLeaseCount).toBe(1);
  });

  it('retries only incomplete mount cleanup and publishes proof after the retained debt clears', () => {
    const layout = layoutSnapshot({
      tick: 10,
      screenId: 'weapon-index',
      viewportId: '1440x900',
      visibleCount: 2,
    });
    const binding = bindingFromLayout(layout);
    const records = layout.visibleWeaponMountLayouts.map((mountLayout, index) => {
      const result = readyResult(mountLayout, binding, index + 1);
      return activeRecord(mountLayout, binding, index + 1, Promise.resolve(result), result);
    });
    const owner = ownerFor(layout);
    commit(owner, layout, records);
    const originalClear = THREE.Object3D.prototype.clear;
    let throwOnce = true;
    Object.defineProperty(THREE.Object3D.prototype, 'clear', {
      configurable: true,
      writable: true,
      value(this: THREE.Object3D) {
        if (throwOnce) {
          throwOnce = false;
          throw new Error('fixture cleanup failure');
        }
        return originalClear.call(this);
      },
    });
    try {
      const result = owner.prepareAllForOwnerDestroy({ schemaVersion: 1, tick: 11 });
      expect(result.state).toBe('destroy-incomplete');
      expect(result.proofCount).toBeLessThan(result.preparedLeaseCount);
      expect(result.failedMountLeaseIds).toContain(records[0]!.visibleSlotLeaseId);
      expect(owner.getSnapshot().a6_9State).toBe('destroyed');
      const retried = owner.prepareAllForOwnerDestroy({ schemaVersion: 1, tick: 11 });
      expect(retried).not.toBe(result);
      expect(retried).toMatchObject({
        state: 'destroy-prepared',
        preparedLeaseCount: 2,
        proofCount: 2,
        failedMountLeaseIds: [],
      });
      expect(owner.prepareAllForOwnerDestroy({ schemaVersion: 1, tick: 11 })).toBe(retried);
    } finally {
      Object.defineProperty(THREE.Object3D.prototype, 'clear', {
        configurable: true,
        writable: true,
        value: originalClear,
      });
    }
  });

  it('uses two-phase owner destroy and finalizes only after the resource owner is destroyed', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const binding = bindingFromLayout(layout);
    const mountLayout = layout.visibleWeaponMountLayouts[0]!;
    const ready = readyResult(mountLayout, binding, 1);
    const record = activeRecord(mountLayout, binding, 1, Promise.resolve(ready), ready);
    const owner = ownerFor(layout);
    commit(owner, layout, [record]);
    expect(owner.prepareAllForOwnerDestroy({ schemaVersion: 1, tick: 11 }).state)
      .toBe('destroy-prepared');
    expect(() => owner.finalizeDestroy({
      schemaVersion: 1,
      tick: 11,
      resourceOwnerState: 'destroy-incomplete',
    })).toThrow(/resource Owner|A6\.11b\/A6\.11c/i);
    const destroyed = owner.finalizeDestroy({
      schemaVersion: 1,
      tick: 12,
      resourceOwnerState: 'destroyed',
    });
    expect(destroyed).toMatchObject({
      state: 'destroyed',
      activeLeaseCount: 0,
      proofHistoryCount: 0,
      mountedCount: 0,
    });
  });

  it('resets only while empty and adopts the new epoch time domain', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const owner = ownerFor(layout);
    const nextBinding = bindingSnapshot('epoch-b', 0);
    const reset = owner.resetPresentationEpoch({
      schemaVersion: 1,
      tick: 11,
      nextBindingSnapshot: nextBinding,
    });
    expect(reset).toMatchObject({ epochId: 'epoch-b', lastTick: 0, activeLeaseCount: 0 });
    expect(() => owner.resetPresentationEpoch({
      schemaVersion: 1,
      tick: 0,
      nextBindingSnapshot: bindingSnapshot('epoch-c', 0),
    })).not.toThrow();
  });

  it('rejects future fields, getters, thenables and same-plan conflicts before mutation', () => {
    const layout = layoutSnapshot({ tick: 10 });
    const owner = ownerFor(layout);
    let getterCalls = 0;
    const getter = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() { getterCalls += 1; return 1; },
    });
    expect(() => owner.commitExecution(getter)).toThrow(/data|getter|accessor|数据/i);
    expect(getterCalls).toBe(0);
    expect(() => owner.commitExecution({
      schemaVersion: 1,
      executionResult: executionResult(layout, [], 'future'),
      layoutSnapshot: layout,
      then() { return undefined; },
    })).toThrow(/then|字段|exact/i);
    expect(owner.getSnapshot()).toMatchObject({ activeLeaseCount: 0, mountedCount: 0 });
    expect(ARENA_V2_COLLECTION_PREVIEW_MOUNT_LIFECYCLE_DESTROY_PROOF_OWNER_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        ownsOrReleasesA6_6: false,
        inheritedLighting: 'A6.9-hemisphere-plus-directional-only',
      });
  });
});
