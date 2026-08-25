import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_EXECUTION_OWNER_CANDIDATE_V1,
  ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1,
  createArenaV2CollectionVisiblePreviewLeaseCommandPlanIdentityV1,
} from '../src/arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.js';
import {
  ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1,
} from '../src/arena-v2-collection-visible-preview-lease-command-planning-owner-candidate-v1.js';
import type {
  ArenaV2CollectionFourScreenReadSnapshotV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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
      displayName: `A6.11b Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'read-shape',
    })),
    maps: maps.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.11b Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.11b.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a611b001',
  } as const;
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function currentReadSnapshot(): ArenaV2CollectionFourScreenReadSnapshotV1 {
  const bindingOwner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({
    epochId: 'epoch-a',
  });
  const binding = bindingOwner.consume({
    schemaVersion: 1,
    collectionProgressInput: {
      schemaVersion: 1,
      epochId: 'epoch-a',
      tick: 0,
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
  bindingOwner.destroy();
  const slots = binding.slots.filter(({ kind }) => kind === 'weapon').map((slot) => {
    const previewStrategy = slot.previewStrategies[0];
    if (previewStrategy === undefined) throw new Error('测试slot缺少index策略。');
    const { previewStrategies: _strategies, ...base } = slot;
    void _strategies;
    return Object.freeze({ ...base, previewStrategy });
  });
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    validationStatus: 'not-run',
    epochId: 'epoch-a',
    tick: 0,
    screenId: 'weapon-index',
    sourceState: 'loading',
    indexPage: Object.freeze({ screenId: 'weapon-index', profileIdentity: null }),
    detailPage: null,
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

describe('Arena V2 A6.11b command execution current approval closure（未运行）', () => {
  it('P6.322 publishes the command Owner and closes proof, lease and cleanup commits', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).toMatch(/#operation: string \| null = null/u);
    expect(source).toMatch(/#reentrySequence = 0/u);
    expect(source).toMatch(/#reentryError: Error \| null = null/u);
    expect(source).not.toMatch(/#reentryAttempted/u);
    for (const operation of [
      'constructor-snapshot',
      'execute',
      'command-commit',
      'command-failure',
      'command-failure-close',
      'lease-settled',
      'lease-settlement-failure',
      'lease-rejected',
      'lease-rejection-failure',
      'snapshot-read',
      'reset-epoch',
      'destroy',
    ]) expect(source).toMatch(new RegExp(
      `#runSynchronousOperation\\(\\s*'${operation}'`,
      'u',
    ));
    expect(source).toMatch(
      /this\.#inFlightPromise = operation;[\s\S]*?NATIVE_PROMISE_THEN, EXECUTION_MICROTASK_TRIGGER/u,
    );
    expect(source).toMatch(/command执行时拒绝状态\$\{this\.#state\}复活/u);
    for (const marker of [
      'synchronousLifecycleOperationReentryRejected: true',
      'swallowedCallbackReentryRejectedBeforeSuccessCommit: true',
      'commandOwnerPublishedBeforeExecutionMicrotask: true',
      'commandAndLeaseSettlementCommitUnderOperationGuard: true',
      'failedOwnerCannotBeRevivedByLateCommand: true',
      'publicReadsRejectedDuringOperationCommit: true',
      'stickyReentryUsesMonotonicSequenceAndFirstError: true',
      'proofAndLeaseCallbacksCheckedBeforeLedgerCommit: true',
      'acquiredLeasePromiseObservedBeforeRecordPublication: true',
      'destroyReentryRetainsCurrentAndLaterOwners: true',
    ]) expect(source).toContain(marker);
  });

  it('20个可见武器全部fallback，load与active record精确为0', async () => {
    const snapshot = currentReadSnapshot();
    const planner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: snapshot.epochId,
    });
    const plan = planner.plan({
      schemaVersion: 1,
      epochId: snapshot.epochId,
      tick: snapshot.tick,
      screenId: snapshot.screenId,
      viewport: '390x844',
      readSnapshot: snapshot,
      visibleDefinitionIds: snapshot.previewSlots.map(({ definitionId }) => definitionId),
      previousActiveLeaseLedger: [],
    });
    let loadCalls = 0;
    let disposeCalls = 0;
    let proofCalls = 0;
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: snapshot.formalAssetLeaseBinding,
      loader: Object.freeze({
        load(): never { loadCalls += 1; throw new Error('当前许可数0不得load。'); },
      }),
      disposer: Object.freeze({
        dispose(): never { disposeCalls += 1; throw new Error('当前零租约不得dispose。'); },
      }),
      beforeReleaseBarrier: Object.freeze({
        readDestroyedProof(): never { proofCalls += 1; throw new Error('当前零租约不得读proof。'); },
      }),
    });
    const result = await owner.execute({
      schemaVersion: 1,
      bindingSnapshot: snapshot.formalAssetLeaseBinding,
      epochId: snapshot.epochId,
      tick: snapshot.tick,
      planIdentity: createArenaV2CollectionVisiblePreviewLeaseCommandPlanIdentityV1(plan),
      plan,
      previousActiveLeaseLedger: [],
    });

    expect(plan.acquireCommands).toHaveLength(0);
    expect(plan.nextActiveLeaseLedger).toHaveLength(0);
    expect(plan.fallbackSlots).toHaveLength(20);
    expect(result.activeRecords).toHaveLength(0);
    expect(result.staticFallbackCount).toBe(20);
    expect({ loadCalls, disposeCalls, proofCalls }).toEqual({
      loadCalls: 0,
      disposeCalls: 0,
      proofCalls: 0,
    });
    expect(owner.getSnapshot()).toMatchObject({
      state: 'active',
      activeLeaseCount: 0,
      assetReadyCount: 0,
      leaseFallbackCount: 0,
    });
  });

  it('当前治理元数据保持生产与默认Surface关闭', () => {
    expect(ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_EXECUTION_OWNER_CANDIDATE_V1)
      .toMatchObject({
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        productionReachable: false,
        defaultSurfaceWired: false,
        currentProductionApprovedPreviewAssetCount: 0,
        currentAcquirePermittedAssetCount: 0,
        currentResourcePathRequiresZeroCalls: true,
        futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true,
      });
  });
});
