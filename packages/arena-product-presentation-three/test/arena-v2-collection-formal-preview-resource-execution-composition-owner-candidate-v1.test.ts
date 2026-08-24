import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_FORMAL_PREVIEW_RESOURCE_EXECUTION_COMPOSITION_OWNER_CANDIDATE_V1,
  ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1,
} from '../src/arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.js';
import {
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
      displayName: `A6.11c Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'read-shape',
    })),
    maps: mapBindings.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.11c Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.11c.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a611c001',
  } as const;
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function currentBinding() {
  const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({ epochId: 'epoch-a' });
  const snapshot = owner.consume({
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
  owner.destroy();
  return snapshot;
}

function readSnapshot() {
  const binding = currentBinding();
  const previewSlots = binding.slots.filter(({ kind }) => kind === 'weapon').map((slot) => {
    const previewStrategy = slot.previewStrategies[0];
    if (previewStrategy === undefined) throw new Error('测试slot缺少index策略。');
    const { previewStrategies: _strategies, ...base } = slot;
    void _strategies;
    return Object.freeze({ ...base, previewStrategy });
  });
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    validationStatus: 'not-run' as const,
    epochId: 'epoch-a',
    tick: 0,
    screenId: 'weapon-index' as const,
    sourceState: 'loading' as const,
    indexPage: Object.freeze({ screenId: 'weapon-index' as const, profileIdentity: null }),
    detailPage: null,
    previewSlots: Object.freeze(previewSlots),
    formalAssetLeaseBinding: binding,
    formalAssetGovernance: Object.freeze({
      contentIdentity: binding.contentIdentity,
      budget: binding.budget,
      layouts: binding.layouts,
      accessibility: binding.accessibility,
      governance: binding.governance,
      loadsResourcesHere: false as const,
      ownsThreeResourcesHere: false as const,
    }),
  }) as unknown as ArenaV2CollectionFourScreenReadSnapshotV1;
}

describe('Arena V2 A6.11c resource composition current approval closure（未运行）', () => {
  it('P6.321 publishes and settles the composition command Owner with sticky child reentry facts', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).toMatch(/#operation: string \| null = null/u);
    expect(source).toMatch(/#reentrySequence = 0/u);
    expect(source).toMatch(/#reentryError: Error \| null = null/u);
    expect(source).not.toMatch(/#reentryAttempted/u);
    for (const operation of [
      'constructor-snapshot',
      'execute',
      'command-fulfilled',
      'command-fulfilled-failure',
      'command-rejected',
      'command-rejected-failure',
      'snapshot-refresh',
      'reset-epoch',
      'destroy',
    ]) expect(source).toContain(`#runSynchronousOperation('${operation}'`);
    expect(source).toMatch(
      /this\.#inFlightPromise = operation;[\s\S]*?childPromise = this\.#executor\.execute\(value\)/u,
    );
    expect(source).toMatch(/command完成时拒绝状态\$\{this\.#state\}复活/u);
    for (const marker of [
      'synchronousLifecycleOperationReentryRejected: true',
      'swallowedChildReentryRejectedBeforeSuccessCommit: true',
      'commandOwnerPublishedBeforeExecutorExecute: true',
      'commandSettlementCommitsUnderOperationGuard: true',
      'failedOwnerCannotBeRevivedByLateFulfillment: true',
      'publicReadsRejectedDuringOperationCommit: true',
      'stickyReentryUsesMonotonicSequenceAndFirstError: true',
      'executorAdapterSnapshotsCheckedBeforeAggregateCommit: true',
      'asyncChildCommandCapturedAndSettledBeforeCommitCheck: true',
      'destroyReentryRetainsCurrentAndLaterOwners: true',
    ]) expect(source).toContain(marker);
  });

  it('20武器当前全部fallback，执行计划保持零loader、零active lease', async () => {
    const snapshot = readSnapshot();
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
    let loaderCalls = 0;
    const owner = new ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: snapshot.formalAssetLeaseBinding,
      beforeReleaseBarrier: Object.freeze({
        readDestroyedProof(): never { throw new Error('零租约计划不得读取销毁证明。'); },
      }),
      underlyingLoader: Object.freeze({
        load(): never {
          loaderCalls += 1;
          throw new Error('当前批准数0不得调用底层loader。');
        },
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
    expect(loaderCalls).toBe(0);
    expect(owner.getSnapshot()).toMatchObject({
      state: 'active',
      activeLeaseCount: 0,
      pendingLeaseCount: 0,
      readyLeaseCount: 0,
      fallbackLeaseCount: 0,
      loadingTaskCount: 0,
      readyTaskCount: 0,
    });
  });

  it('生产批准账本identity漂移在组合构造前失败关闭且底层零调用', () => {
    const binding = currentBinding();
    const forged = {
      ...binding,
      contentIdentity: {
        ...binding.contentIdentity,
        productionApprovalLedgerContentHash: 'f'.repeat(64),
      },
    };
    let loaderCalls = 0;
    expect(() => new ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: forged,
      beforeReleaseBarrier: Object.freeze({
        readDestroyedProof(): never { throw new Error('不应读取。'); },
      }),
      underlyingLoader: Object.freeze({
        load(): never { loaderCalls += 1; throw new Error('不应调用。'); },
      }),
    })).toThrow(/生产批准账本|identity/u);
    expect(loaderCalls).toBe(0);
  });

  it('公开治理元数据仍关闭生产与默认Surface', () => {
    expect(ARENA_V2_COLLECTION_FORMAL_PREVIEW_RESOURCE_EXECUTION_COMPOSITION_OWNER_CANDIDATE_V1)
      .toMatchObject({
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        productionReachable: false,
        defaultSurfaceWired: false,
        currentProductionApprovedPreviewAssetCount: 0,
        currentLoaderReachableAssetCount: 0,
        currentActiveLeasePermittedCount: 0,
        futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true,
      });
  });
});
