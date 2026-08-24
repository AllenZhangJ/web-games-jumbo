import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ARENA_V2_INFORMATION_SCREEN_ORDER_V1,
  type ArenaV2UiRenderPlanV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '@number-strategy-jump/arena-product-presentation-three';
import {
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
} from '@number-strategy-jump/arena-regression';
import {
  createArenaV2CollectionPreviewReadInputCandidateV1,
} from '../../src/entry/arena-v2-collection-preview-read-input-candidate-v1.js';

const COLLECTION_SCREENS = Object.freeze([
  'weapon-index', 'weapon-detail', 'map-index', 'map-detail',
] as const);
const WEAPON_ID = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .find(({ kind }) => kind === 'weapon')!.definitionId;
const MAP_ID = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .find(({ kind }) => kind === 'map')!.definitionId;

function renderPlan(screenId: string): ArenaV2UiRenderPlanV1 {
  const detail = screenId === 'weapon-detail' || screenId === 'map-detail';
  const weapon = screenId === 'weapon-detail';
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: screenId,
    revision: 7,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze(detail ? [Object.freeze({
      kind: 'action' as const,
      id: 'existing-detail-selection-action',
      rect: Object.freeze({ x: 16, y: 672, width: 358, height: 56 }),
      clipRect: null,
      intentId: weapon
        ? 'use-selected-weapon-next-match'
        : 'use-selected-map-next-match',
      label: '选择模式',
      accessibilityText: weapon
        ? '选择模式；一对一和竞速使用当前武器，生存空手开局'
        : '选择模式；三种模式使用当前地图',
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'primary' as const,
      zIndex: 4,
    })] : []),
    scrollRegion: null,
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([]),
  });
}

function fieldValues(screenId: string) {
  const ids = screenId === 'weapon-detail'
    ? ['range-coverage', 'timing-risk', 'ground-aerial', 'counter-inputs', 'map-consequences']
    : ['route-goal', 'hazard-summary', 'full-route', 'weapon-consequences'];
  return Object.freeze(ids.map((fieldId) => Object.freeze({
    fieldId,
    labelMessageId: `a6.17.${fieldId}`,
    valueText: `value:${fieldId}`,
    accessibilityText: `accessible:${fieldId}`,
    fixedWidthNumeric: false,
  })));
}

function hostFor(screenId: string): ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 {
  const host = Object.create(
    ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1.prototype,
  ) as ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1;
  Object.defineProperties(host, {
    getInformationSnapshot: {
      value: () => Object.freeze({
        navigation: Object.freeze({ currentScreenId: screenId }),
      }),
    },
    getInformationCollectionRead: {
      value: () => Object.freeze({
        learningProfile: Object.freeze({
          profileDefinition: null,
          profile: null,
          eligibleWeaponDefinitionIds: Object.freeze([WEAPON_ID]),
        }),
        collectionContent: Object.freeze({ sourceContentHash: 'a617c0de' }),
        selectedWeaponDefinitionId: WEAPON_ID,
        selectedMapDefinitionId: MAP_ID,
      }),
    },
    getInformationCurrentScreenComposition: {
      value: () => Object.freeze({
        fieldSources: Object.freeze([Object.freeze({
          ownerId: 'p5-content',
          fieldValues: fieldValues(screenId),
        })]),
      }),
    },
  });
  return host;
}

test('A6.17 routes exactly four of the fixed eleven information pages into collection input', () => {
  assert.equal(ARENA_V2_INFORMATION_SCREEN_ORDER_V1.length, 11);
  const enabled: string[] = [];
  for (const [tick, screenId] of ARENA_V2_INFORMATION_SCREEN_ORDER_V1.entries()) {
    const plan = renderPlan(screenId);
    const result = createArenaV2CollectionPreviewReadInputCandidateV1({
      host: hostFor(screenId),
      epochId: 'epoch-a6.17',
      tick,
      renderPlan: plan,
      formalAssetCatalog: ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
      availability: createArenaV2A6CurrentFormalPreviewAvailabilityV1(),
      reducedMotion: false,
      muted: false,
      decorativeAssetState: 'ready',
    });
    if (result === null) continue;
    enabled.push(result.screenId);
    assert.equal(result.profileCollectionProgressInput['tick'], tick);
    assert.equal(result.profileCollectionProgressInput['epochId'], 'epoch-a6.17');
    assert.deepEqual(
      result.profileCollectionProgressInput['eligibleWeaponDefinitionIds'],
      [WEAPON_ID],
    );
    if (screenId.endsWith('-index')) assert.equal(result.detail, null);
    else {
      assert.equal(result.detail?.['selection'] instanceof Object, true);
      assert.equal(
        (result.detail?.['existingSelectionAction'] as Readonly<Record<string, unknown>>)
          .labelText,
        '选择模式',
      );
    }
  }
  assert.deepEqual(enabled, COLLECTION_SCREENS);
});

test('A6.17 keeps the base pipeline and attests the host-composed RenderPlan', () => {
  const formal = readFileSync(
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
    'utf8',
  );
  const composition = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  const characterComposition = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(formal, /getInformationCurrentScreenBasePipeline\s*\(/u);
  assert.match(
    formal,
    /authoritativePipeline\s*=\s*localHost!\.getInformationCurrentScreenPipeline\s*\(/u,
  );
  assert.match(
    formal,
    /authoritativeSourceRenderPlan:\s*authoritativePipeline\.renderPlan/u,
  );
  assert.match(formal, /selectionProjection:\s*localHost!\.getInformationCurrentScreenSelectionProjection\(\)/u);
  assert.match(
    composition,
    /this\.#layoutBridge\.compose\(\{[\s\S]*?authoritativeSourceRenderPlan:[\s\S]*?selectionProjection:[\s\S]*?sourceRenderPlan,[\s\S]*?readSnapshot,/u,
  );
  assert.match(composition, /forwardsActionRevealWithoutOwningLayout: true/u);
  assert.match(composition, /this\.#surface\.revealActionPrimitive\(primitiveId\)/u);
  assert.match(composition, /forwardsPrimitiveRevealWithoutOwningLayout: true/u);
  assert.match(composition, /this\.#surface\.revealPrimitive\(primitiveId\)/u);
  assert.match(characterComposition, /forwardsActionRevealWithoutOwningLayout: true/u);
  assert.match(characterComposition, /this\.#surface\.revealActionPrimitive\(primitiveId\)/u);
  assert.match(characterComposition, /forwardsPrimitiveRevealWithoutOwningLayout: true/u);
  assert.match(characterComposition, /this\.#surface\.revealPrimitive\(primitiveId\)/u);
});

test('P6.218 keeps character preview composition lifecycle commits mutually exclusive', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: string \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  assert.match(source, /#runSynchronousOperation<T>\(operation: string, run: \(\) => T\): T/u);
  for (const operation of [
    'load',
    'bind-intent',
    'reveal-action',
    'reveal-primitive',
    'render',
    'scroll-preview-refresh',
    'dispose',
  ]) {
    assert.match(source, new RegExp(`#runSynchronousOperation\\('${operation}'`, 'u'));
  }
  assert.match(
    source,
    /this\.#operation === 'reveal-action' \|\| this\.#operation === 'reveal-primitive'/u,
  );
  assert.match(source, /synchronousLifecycleOperationReentryRejected: true/u);
  assert.match(source, /swallowedHostReentryRejectedBeforeSuccessCommit: true/u);
  assert.match(source, /scrollRefreshReusesCurrentRevealOperation: true/u);
  assert.match(source, /publicReadsRejectedDuringOperationCommit: true/u);
});

test('P6.219 keeps collection preview sync and async commits mutually exclusive', () => {
  const source = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /#operation: string \| null = null/u);
  assert.match(source, /#reentrySequence = 0/u);
  assert.match(source, /#reentryError: Error \| null = null/u);
  assert.doesNotMatch(source, /#reentryAttempted/u);
  assert.match(source, /#runSynchronousOperation<T>\(operation: string, run: \(\) => T\): T/u);
  for (const operation of [
    'load',
    'bind-scroll-observer',
    'unbind-scroll-observer',
    'bind-intent',
    'reveal-action',
    'reveal-primitive',
    'render',
    'scroll-preview-refresh',
    'submission-fulfilled',
    'submission-rejected',
    'resource-redraw',
    'dispose',
  ]) {
    assert.match(source, new RegExp(`#runSynchronousOperation\\('${operation}'`, 'u'));
  }
  assert.match(
    source,
    /this\.#submission = operation;[\s\S]*?this\.#previewHost\.submitPage\(\{/u,
  );
  assert.match(
    source,
    /this\.#operation === 'reveal-action' \|\| this\.#operation === 'reveal-primitive'/u,
  );
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedHostReentryRejectedBeforeSuccessCommit: true',
    'submissionOwnerPublishedBeforePreviewHostSubmit: true',
    'submissionSettlementCommitsUnderOperationGuard: true',
    'resourceRedrawCallbackCommitsUnderOperationGuard: true',
    'scrollRefreshReusesCurrentRevealOperation: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'surfaceContextPreviewAndObserverCallbacksCheckedBeforeStateCommit: true',
    'asyncSubmissionOwnersCapturedBeforeChildStart: true',
    'childSnapshotsCheckedBeforeAggregatePublication: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) {
    assert.match(source, new RegExp(marker, 'u'));
  }
});

test('A6.17 lazily creates the preview renderer and safely downgrades unsupported viewports', () => {
  const formal = readFileSync(
    'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
    'utf8',
  );
  assert.match(formal, /rendererFactory:\s*collectionPreviewRendererFactory/u);
  assert.match(formal, /new THREE\.WebGLRenderer\s*\(/u);
  assert.match(formal, /width === 390 && height === 844/u);
  assert.match(formal, /width === 1440 && height === 900/u);
  assert.match(formal, /:\s*null;\s*if \(viewport === null\) return null;/u);
  assert.match(
    formal,
    /this\.#collectionPreviewVisibilityRequested\s*&&\s*this\.#activeSurface === 'information'/u,
  );
  assert.doesNotMatch(
    formal,
    /this\.#collectionPreviewSurface\.getSnapshot\(\)\.collectionPageVisible/u,
  );
  assert.match(formal, /decorativeAssetState:\s*'missing'/u);
});

test('A6.16-A6.17 remain action-neutral, polling-free and unreachable from default entries', () => {
  const composition = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
    'utf8',
  );
  const readInput = readFileSync(
    'src/entry/arena-v2-collection-preview-read-input-candidate-v1.ts',
    'utf8',
  );
  for (const marker of [
    "status: 'production-unreachable'",
    'defaultSurfaceWired: false',
    'addsPages: false',
    'addsActions: false',
    'forwardsActionRevealWithoutOwningLayout: true',
    'forwardsPrimitiveRevealWithoutOwningLayout: true',
    'createsRaf: false',
    'pollsResources: false',
    'constructionRollbackRetainsHostAndRendererCleanupOwnership: true',
    'disposalUsesDependencyOrderedCompletionWatermarks: true',
    'orphanRendererDisposeWaitsForScissorDisable: true',
    'underlyingSurfaceWaitsForPreviewResourceCleanup: true',
    'defaultUnderlyingLoaderAcceptsCancellableAssetReadAndImagePorts: true',
    'defaultUnderlyingLoaderShutdownRequestedBeforePreviewTaskSettlementWait: true',
    'disposeReentrancyRejected: true',
  ]) assert.match(composition, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  assert.match(readInput, /status: 'production-unreachable'/u);
  assert.match(readInput, /addsPages: false/u);
  assert.match(readInput, /addsActions: false/u);
  assert.doesNotMatch(composition, /requestAnimationFrame|setInterval|requestIdleCallback/u);

  for (const entry of ['src/entry/web.ts', 'src/entry/wechat.ts', 'src/entry/douyin.ts']) {
    const source = readFileSync(entry, 'utf8');
    assert.doesNotMatch(
      source,
      /information-collection-preview-surface-composition|collection-preview-read-input/u,
      `${entry}不得默认接入A6.16/A6.17。`,
    );
  }
});
