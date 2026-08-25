import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MOUNT_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-character-selection-formal-preview-mount-candidate-v1.ts';
const RENDER_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-character-selection-formal-preview-render-surface-candidate-v1.ts';
const SURFACE_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-information-character-selection-preview-surface-composition-candidate-v1.ts';
const LOCAL_HOST_SOURCE_PATH =
  'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts';
const FORMAL_WEB_SOURCE_PATH =
  'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts';
const BINDING_SOURCE_PATH =
  'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts';
const FORMAL_CHARACTER_SOURCE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

test('P5 character preview reuses selected weapon silhouette without adding authority', () => {
  const mount = source(MOUNT_SOURCE_PATH);
  assert.match(mount, /requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1/u);
  assert.match(mount, /equipmentAssetBindings\.find/u);
  assert.match(mount, /cloneSkeleton\(weaponTemplate\.scene\)/u);
  assert.match(mount, /weapon\.rotation\.set\(\.\.\.weaponProfile\.grip\.heldEulerRadians\)/u);
  assert.match(mount, /weapon\.scale\.setScalar\(weaponProfile\.grip\.heldScale\)/u);
  assert.match(mount, /instance\.equipmentSlot\.add\(weapon\)/u);
  assert.match(mount, /new THREE\.Box3\(\)\.setFromObject\(model\)/u);
  assert.match(mount, /sharesPreloadedWeaponGeometryMaterialAndTexture: true/u);
  assert.match(mount, /disposesSharedGeometryOrTexture: false/u);
  assert.doesNotMatch(mount, /MatchCore|ActionResolver|Math\.random|requestAnimationFrame/u);
});

test('P5 character preview keeps survival unarmed and duel/race weapon-bound', () => {
  const mount = source(MOUNT_SOURCE_PATH);
  const surface = source(SURFACE_SOURCE_PATH);
  const render = source(RENDER_SOURCE_PATH);
  const host = source(LOCAL_HOST_SOURCE_PATH);
  const web = source(FORMAL_WEB_SOURCE_PATH);

  assert.match(
    mount,
    /\(modeKind === 'survival'\) !== \(previewWeaponDefinitionId === null\)/u,
  );
  assert.match(host, /getInformationCharacterPreviewLoadoutRead\(\)/u);
  assert.match(host, /const matchStartsUnarmed = selectedModeKind === 'survival'/u);
  assert.match(
    host,
    /previewWeaponDefinitionId: matchStartsUnarmed\s*\? null\s*: this\.#selectedWeaponDefinitionId/u,
  );
  assert.match(host, /collectionEquipmentDefinitionIds\.includes/u);
  assert.match(surface, /selectedModeKind: context\.selectedModeKind/u);
  assert.match(surface, /previewWeaponDefinitionId: context\.previewWeaponDefinitionId/u);
  assert.match(render, /Arena V2生存角色预览必须保持空手/u);
  assert.match(web, /getInformationCharacterPreviewLoadoutRead\(\)/u);
  assert.match(web, /loadout\.selectedCharacterDefinitionId !== selection\.selectedId/u);
  assert.match(web, /survivalCharacterPreviewRemainsUnarmed: true/u);
});

test('P5 character preview projects scroll per frame without remounting or leaking page ownership', () => {
  const mount = source(MOUNT_SOURCE_PATH);
  const surface = source(SURFACE_SOURCE_PATH);
  const render = source(RENDER_SOURCE_PATH);
  const web = source(FORMAL_WEB_SOURCE_PATH);

  assert.match(mount, /previewSizeCssPixels/u);
  assert.doesNotMatch(mount, /previewRectCssPixels/u);
  assert.match(mount, /clearReleasesActiveCloneWithoutDestroyingOwner: true/u);
  assert.match(render, /previewRectCssPixels/u);
  assert.match(render, /renderPositionProvidedPerFrame: true/u);
  assert.match(render, /fractionalScrollPositionSupported: true/u);
  assert.match(render, /fullyVisiblePreviewOnly: true/u);
  assert.match(surface, /visibility: 'clipped-or-outside'/u);
  assert.match(surface, /this\.#mountOwner\?\.clear\(\)/u);
  assert.match(surface, /scrollPositionDoesNotRemountCharacterOrWeapon: true/u);
  assert.match(surface, /clippedPreviewRetainsMount: true/u);
  assert.match(surface, /leavingCharacterPageReleasesMount: true/u);
  assert.match(web, /x: panel\.rect\.x/u);
  assert.match(web, /y: panel\.rect\.y - request\.scrollOffsetCssPixels/u);
  assert.match(web, /characterPreviewFractionalScrollProjectionWired: true/u);
  assert.match(web, /characterPreviewFullyVisiblePolicy: 'entire-preview-rect-inside-content-clip'/u);
  assert.match(web, /characterPreviewScrollDoesNotRemountModel: true/u);
  assert.match(web, /characterPreviewClippedStateSkipsProfileAndLoadoutReads: true/u);
  assert.ok(
    web.indexOf("visibility: 'clipped-or-outside' as const")
      < web.indexOf('getInformationCharacterPreviewLoadoutRead()'),
  );
  assert.doesNotMatch(web, /if \(request\.scrollOffsetCssPixels !== 0\) return null/u);
});

test('P5 character preview retains incomplete construction and disposal ownership for retry', () => {
  const mount = source(MOUNT_SOURCE_PATH);
  const render = source(RENDER_SOURCE_PATH);
  const surface = source(SURFACE_SOURCE_PATH);
  const binding = source(BINDING_SOURCE_PATH);
  const formalCharacter = source(FORMAL_CHARACTER_SOURCE_PATH);

  assert.match(surface, /#orphanRenderer:/u);
  assert.match(surface, /this\.#mountOwner = mountOwner/u);
  assert.match(surface, /this\.#orphanRenderer = renderer/u);
  assert.match(surface, /this\.#renderSurface = renderSurface/u);
  assert.match(surface, /this\.#orphanRenderer = null/u);
  assert.match(surface, /if \(this\.#disposeInProgress\)/u);
  assert.match(surface, /\(\) => renderSurface\.destroy\(\),\s*\(\) => \{ if \(this\.#renderSurface === renderSurface\) this\.#renderSurface = null; \}/u);
  assert.match(surface, /\(\) => mountOwner\.destroy\(\),\s*\(\) => \{ if \(this\.#mountOwner === mountOwner\) this\.#mountOwner = null; \}/u);
  assert.match(surface, /\(\) => renderer\.dispose\(\),\s*\(\) => \{ if \(this\.#orphanRenderer === renderer\) this\.#orphanRenderer = null; \}/u);
  assert.match(
    surface,
    /this\.#scrollUnbind === null\s*&& this\.#renderSurface === null\s*&& this\.#orphanRenderer === null\s*&& this\.#mountOwner === null\s*&& !this\.#surfaceDisposed/u,
  );
  assert.match(surface, /this\.#scrollUnbind = unbind;\s*unbind = null/u);
  assert.match(surface, /if \(typeof unbind === 'function'\)/u);
  assert.match(surface, /if \(this\.#scrollUnbind === null\) \{\s*try \{\s*synchronousVoid\(this\.#surface\.dispose/u);
  assert.match(surface, /this\.#surfaceDisposed = true/u);
  assert.match(surface, /this\.#previewHiddenForDispose = true/u);
  assert.match(surface, /constructionRollbackRetainsFailedCleanupOwnership: true/u);
  assert.match(surface, /disposeRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(surface, /rendererBorrowReleasedBeforeMountOwnerDestroy: true/u);
  assert.match(surface, /underlyingSurfaceWaitsForPreviewOwners: true/u);
  assert.match(surface, /disposeReentrancyRejected: true/u);
  assert.match(surface, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(surface, /surfaceMountRendererAndObserverCallbacksCheckedBeforeStateCommit: true/u);
  assert.match(surface, /childSnapshotsCheckedBeforeAggregatePublication: true/u);
  assert.match(surface, /cleanupReentryRetainsCurrentAndLaterOwners: true/u);
  assert.match(mount, /mountCleanupUsesPerResourceCompletionWatermarks: true/u);
  assert.match(mount, /failedBuildCleanupDebtRetainedForDestroyRetry: true/u);
  assert.match(mount, /failedModelConstructionCleanupDebtRetainedForDestroyRetry: true/u);
  assert.match(mount, /failedPreviousMountRetirementDoesNotDoubleCleanupNextMount: true/u);
  assert.match(mount, /mountOwnerDestroyReentrancyRejected: true/u);
  assert.match(mount, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(mount, /buildRetirementAndCleanupCheckedBeforeOwnerCommit: true/u);
  assert.match(mount, /cleanupReentryRetainsCurrentAndLaterOwners: true/u);
  assert.match(mount, /#cleanupDebts = new Set/u);
  assert.match(mount, /cleanupDebtCount: this\.#cleanupDebts\.size/u);
  assert.match(render, /rendererDestroyUsesCompletionWatermarks: true/u);
  assert.match(render, /rendererDestroyReentrancyRejected: true/u);
  assert.match(render, /stickyReentryUsesMonotonicSequenceAndFirstError: true/u);
  assert.match(render, /rendererAndSceneCallbacksCheckedBeforeFrameCommit: true/u);
  assert.match(render, /destroyReentryRetainsCurrentAndLaterOwners: true/u);
  assert.ok(
    surface.indexOf('() => renderSurface.destroy()')
      < surface.lastIndexOf('() => mountOwner.destroy()'),
  );
  assert.doesNotMatch(
    surface,
    /try \{ this\.#mountOwner\.destroy\(\); \} catch \(error\) \{ errors\.push\(error\); \}\s*this\.#mountOwner = null/u,
  );
  assert.match(binding, /this\.#unbindIntent === null && !this\.#surfaceDisposed/u);
  assert.match(binding, /this\.#surfaceDisposed && !this\.#hostOwnerDestroyed/u);
  assert.match(
    binding,
    /this\.#surfaceDisposed\s*&& this\.#hostOwnerDestroyed\s*&& this\.#matchSurface !== null\s*&& !this\.#matchSurfaceDisposed/u,
  );
  assert.equal(
    binding.indexOf('this.#destroyHostOwner()')
      < binding.indexOf('this.#matchSurface!.dispose()'),
    true,
  );
  assert.match(
    binding,
    /cleanupRespectsInformationHostAndMatchProducerDependencyOrder: true/u,
  );
  assert.match(binding, /failedInformationCleanupRetainsHostAndMatchAssetOwners: true/u);
  assert.match(binding, /failedHostCleanupRetainsMatchAudioAndVfxProducer: true/u);
  assert.match(binding, /disposeRequiresAllOwnedResourcesToReachCompletion: true/u);
  assert.match(
    formalCharacter,
    /class ArenaV2FormalCharacterModelInstanceConstructionCleanupFailureCandidateV1\s*extends AggregateError/u,
  );
  assert.match(formalCharacter, /constructionOwnedMaterials\.push\(cloned\)/u);
  assert.match(formalCharacter, /cleanupModelInstanceConstructionResources\(cleanupResources\)/u);
  assert.match(formalCharacter, /#constructionCleanupDebts/u);
  assert.match(
    formalCharacter,
    /failedModelAndViewConstructionCleanupRetainsFactoryOwnership: true/u,
  );
  assert.match(formalCharacter, /failedInitialDirectionCleanupClosesFactoryToCreate: true/u);
});

test('P5 character preview batch remains isolated and explicitly unvalidated', () => {
  for (const path of [MOUNT_SOURCE_PATH, RENDER_SOURCE_PATH, SURFACE_SOURCE_PATH, FORMAL_WEB_SOURCE_PATH]) {
    const value = source(path);
    assert.match(value, /status: 'production-unreachable'/u);
    assert.match(value, /validationStatus: 'not-run'/u);
  }
  assert.match(source(MOUNT_SOURCE_PATH), /hardGate: false/u);
  assert.match(source(SURFACE_SOURCE_PATH), /defaultSurfaceWired: false/u);
  assert.match(source(FORMAL_WEB_SOURCE_PATH), /defaultEntryWired: false/u);
});
