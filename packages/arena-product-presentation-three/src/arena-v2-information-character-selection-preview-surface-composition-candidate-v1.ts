import {
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2UiRenderPlanV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1,
  type ArenaV2CharacterSelectionFormalPreviewViewportV1,
} from './arena-v2-character-selection-formal-preview-mount-candidate-v1.js';
import {
  ArenaV2CharacterSelectionFormalPreviewRenderSurfaceCandidateV1,
} from './arena-v2-character-selection-formal-preview-render-surface-candidate-v1.js';
import type {
  ArenaV2WeaponCollectionPreviewRendererPortV1,
} from './arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.js';
import {
  addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1,
} from './arena-v2-character-selection-card-handling-identity-render-plan-candidate-v1.js';
import {
  addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1,
} from './arena-v2-mode-selection-card-non-color-identity-render-plan-candidate-v1.js';

export interface ArenaV2InformationCharacterSelectionPreviewSurfacePortV1 {
  readonly scrollOffsetCssPixels: number;
  load(): unknown;
  bindIntent(value: unknown): unknown;
  bindScrollOffset(onChange: (offsetCssPixels: number) => unknown): () => void;
  revealActionPrimitive?(primitiveId: unknown): unknown;
  revealPrimitive?(primitiveId: unknown): unknown;
  render(plan: ArenaV2UiRenderPlanV1): unknown;
  dispose(): unknown;
}

export interface ArenaV2InformationCharacterSelectionPreviewContextRequestV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly sourceRenderPlan: ArenaV2UiRenderPlanV1;
  readonly scrollOffsetCssPixels: number;
}

export interface ArenaV2InformationCharacterSelectionPreviewHiddenContextV1 {
  readonly schemaVersion: 1;
  readonly visibility: 'clipped-or-outside';
}

export interface ArenaV2InformationCharacterSelectionPreviewVisibleContextV1 {
  readonly schemaVersion: 1;
  readonly visibility: 'fully-visible';
  readonly characterDefinitionId: string;
  readonly selectedModeKind: 'duel' | 'race' | 'survival';
  readonly previewWeaponDefinitionId: string | null;
  readonly viewport: ArenaV2CharacterSelectionFormalPreviewViewportV1;
  readonly previewRectCssPixels: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>;
  readonly pixelRatio: number;
  readonly reducedMotion: boolean;
}

export type ArenaV2InformationCharacterSelectionPreviewContextV1 =
  | ArenaV2InformationCharacterSelectionPreviewHiddenContextV1
  | ArenaV2InformationCharacterSelectionPreviewVisibleContextV1;

export interface ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionOptionsV1 {
  readonly schemaVersion: 1;
  readonly surface: ArenaV2InformationCharacterSelectionPreviewSurfacePortV1;
  readonly mountOwnerFactory:
    () => ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1;
  readonly rendererFactory: () => ArenaV2WeaponCollectionPreviewRendererPortV1;
  readonly contextProvider: (
    request: ArenaV2InformationCharacterSelectionPreviewContextRequestV1,
  ) => ArenaV2InformationCharacterSelectionPreviewContextV1 | null;
  readonly setPreviewVisible: (visible: boolean) => unknown;
  readonly onFailure?: (error: unknown) => unknown;
}

type State = 'created' | 'ready' | 'active' | 'failed' | 'disposed';

function synchronousVoid(value: unknown, name: string): void {
  rejectThenable(value, name);
  if (value !== undefined) throw new TypeError(`${name}必须返回void。`);
}

function nextTick(value: number): number {
  if (!Number.isSafeInteger(value) || value < -1 || value >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Arena V2角色选择预览展示tick耗尽。');
  }
  return value + 1;
}

/**
 * Delegates the information surface and adds one inert formal character draw
 * only while the existing character-selection page is visible. It adds no
 * page, action, input, RAF or wall-clock animation.
 */
export class ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1 {
  readonly #surface: ArenaV2InformationCharacterSelectionPreviewSurfacePortV1;
  readonly #mountOwnerFactory:
    ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionOptionsV1[
      'mountOwnerFactory'
    ];
  readonly #rendererFactory:
    ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionOptionsV1[
      'rendererFactory'
    ];
  readonly #contextProvider:
    ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionOptionsV1[
      'contextProvider'
    ];
  readonly #setPreviewVisibleCallback: (visible: boolean) => unknown;
  readonly #onFailure: ((error: unknown) => unknown) | null;
  #state: State = 'created';
  #lastTick = -1;
  #lastSourceRenderPlan: ArenaV2UiRenderPlanV1 | null = null;
  #mountOwner: ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1 | null = null;
  #renderSurface: ArenaV2CharacterSelectionFormalPreviewRenderSurfaceCandidateV1 | null = null;
  #orphanRenderer: ArenaV2WeaponCollectionPreviewRendererPortV1 | null = null;
  #rendererFactoryInvoked = false;
  #scrollUnbind: (() => void) | null = null;
  #previewVisible = false;
  #renderedFrameCount = 0;
  #previewHiddenForDispose = false;
  #surfaceDisposed = false;
  #disposeInProgress = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionOptionsV1) {
    if (value.schemaVersion !== 1) throw new RangeError('Arena V2角色预览组合只接受schema 1。');
    if (typeof value.mountOwnerFactory !== 'function'
      || typeof value.rendererFactory !== 'function'
      || typeof value.contextProvider !== 'function'
      || typeof value.setPreviewVisible !== 'function') {
      throw new TypeError('Arena V2角色预览组合缺少同步工厂或回调。');
    }
    if (value.onFailure !== undefined && typeof value.onFailure !== 'function') {
      throw new TypeError('Arena V2角色预览组合onFailure必须是函数。');
    }
    if (value.surface.revealPrimitive !== undefined
      && typeof value.surface.revealPrimitive !== 'function') {
      throw new TypeError('Arena V2角色预览组合surface.revealPrimitive必须是函数。');
    }
    this.#surface = value.surface;
    this.#mountOwnerFactory = value.mountOwnerFactory;
    this.#rendererFactory = value.rendererFactory;
    this.#contextProvider = value.contextProvider;
    this.#setPreviewVisibleCallback = value.setPreviewVisible;
    this.#onFailure = value.onFailure ?? null;
  }

  get state(): State {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  get scrollOffsetCssPixels(): number {
    return this.#runSynchronousOperation('scroll offset read', () => {
      const offset = this.#surface.scrollOffsetCssPixels;
      this.#assertCurrentOperationCommit();
      return offset;
    });
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`Arena V2角色预览${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('Arena V2角色预览缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failure: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failure !== reentryError
        ? new AggregateError([failure, reentryError], `Arena V2角色预览${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failure;
    return result;
  }

  #setPreviewVisible(visible: boolean): void {
    synchronousVoid(this.#setPreviewVisibleCallback(visible), 'Arena V2角色预览可见性回调');
    this.#assertCurrentOperationCommit();
    this.#previewVisible = visible;
    this.#previewHiddenForDispose = !visible;
  }

  #fail(error: unknown): void {
    this.#state = 'failed';
    try {
      this.#setPreviewVisible(false);
    } catch { /* 保留原始错误。 */ }
    if (this.#onFailure !== null) {
      try { rejectThenable(this.#onFailure(error), 'Arena V2角色预览onFailure'); } catch {
        /* onFailure仅观察。 */
      }
    }
  }

  #runCleanupStep(
    label: string,
    run: () => unknown,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const sequence = this.#reentrySequence;
    try {
      rejectThenable(run(), `${label}清理回调`);
      if (this.#reentrySequence !== sequence) {
        const error = this.#reentryError ?? new Error(`${label}清理期间发生同步重入。`);
        errors.push(error);
        return false;
      }
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      return false;
    }
  }

  #ensurePreviewOwners(): void {
    if (this.#mountOwner !== null && this.#renderSurface !== null) return;
    if (this.#rendererFactoryInvoked) {
      throw new Error('Arena V2角色预览Renderer工厂不可重复调用。');
    }
    let mountOwner: ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1 | null = null;
    let renderer: ArenaV2WeaponCollectionPreviewRendererPortV1 | null = null;
    let renderSurface: ArenaV2CharacterSelectionFormalPreviewRenderSurfaceCandidateV1 | null = null;
    try {
      mountOwner = this.#mountOwnerFactory();
      this.#assertCurrentOperationCommit();
      if (!(mountOwner instanceof ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1)) {
        throw new TypeError('Arena V2角色预览Owner工厂返回值无效。');
      }
      this.#mountOwner = mountOwner;
      this.#rendererFactoryInvoked = true;
      renderer = this.#rendererFactory();
      this.#assertCurrentOperationCommit();
      this.#orphanRenderer = renderer;
      renderSurface = new ArenaV2CharacterSelectionFormalPreviewRenderSurfaceCandidateV1({
        schemaVersion: 1,
        renderer,
      });
      this.#renderSurface = renderSurface;
      this.#orphanRenderer = null;
      this.#assertCurrentOperationCommit();
    } catch (error) {
      const cleanup: unknown[] = [];
      if (renderSurface !== null) {
        try {
          renderSurface.destroy();
          this.#renderSurface = null;
        } catch (cleanupError) { cleanup.push(cleanupError); }
      } else if (renderer !== null) {
        try {
          renderer.dispose();
          this.#orphanRenderer = null;
        } catch (cleanupError) { cleanup.push(cleanupError); }
      }
      if (this.#renderSurface === null && this.#orphanRenderer === null
        && mountOwner !== null) {
        try {
          mountOwner.destroy();
          this.#mountOwner = null;
        } catch (cleanupError) { cleanup.push(cleanupError); }
      }
      throw cleanup.length === 0
        ? error
        : new AggregateError([error, ...cleanup], 'Arena V2角色预览工厂回滚不完整。');
    }
  }

  #refreshCharacterPreview(plan: ArenaV2UiRenderPlanV1): void {
    const tick = nextTick(this.#lastTick);
    const scrollOffsetCssPixels = this.#surface.scrollOffsetCssPixels;
    this.#assertCurrentOperationCommit();
    const context = this.#contextProvider(Object.freeze({
      schemaVersion: 1 as const,
      tick,
      sourceRenderPlan: plan,
      scrollOffsetCssPixels,
    }));
    rejectThenable(context, 'Arena V2角色预览contextProvider');
    this.#assertCurrentOperationCommit();
    this.#lastTick = tick;
    if (context === null) {
      this.#setPreviewVisible(false);
      this.#mountOwner?.clear();
      this.#assertCurrentOperationCommit();
      return;
    }
    if (context.schemaVersion !== 1) {
      throw new TypeError('Arena V2角色预览context schema无效。');
    }
    if (context.visibility === 'clipped-or-outside') {
      this.#setPreviewVisible(false);
      return;
    }
    if (context.visibility !== 'fully-visible'
      || typeof context.characterDefinitionId !== 'string'
      || context.characterDefinitionId.length === 0
      || (context.selectedModeKind !== 'duel'
        && context.selectedModeKind !== 'race'
        && context.selectedModeKind !== 'survival')
      || (context.previewWeaponDefinitionId !== null
        && (typeof context.previewWeaponDefinitionId !== 'string'
          || context.previewWeaponDefinitionId.length === 0))
      || ((context.selectedModeKind === 'survival')
        !== (context.previewWeaponDefinitionId === null))
      || typeof context.reducedMotion !== 'boolean') {
      throw new TypeError('Arena V2角色预览context无效。');
    }
    this.#ensurePreviewOwners();
    const mount = this.#mountOwner!.mount({
      schemaVersion: 1,
      tick,
      characterDefinitionId: context.characterDefinitionId,
      selectedModeKind: context.selectedModeKind,
      previewWeaponDefinitionId: context.previewWeaponDefinitionId,
      viewport: context.viewport,
      previewSizeCssPixels: Object.freeze({
        width: context.previewRectCssPixels.width,
        height: context.previewRectCssPixels.height,
      }),
      reducedMotion: context.reducedMotion,
    });
    this.#assertCurrentOperationCommit();
    this.#renderSurface!.render({
      schemaVersion: 1,
      tick,
      mount,
      viewport: context.viewport,
      previewRectCssPixels: context.previewRectCssPixels,
      pixelRatio: context.pixelRatio,
    });
    this.#assertCurrentOperationCommit();
    this.#renderedFrameCount += 1;
    this.#setPreviewVisible(true);
  }

  #handleScrollOffset(): void {
    if (this.#lastSourceRenderPlan === null
      || this.#state === 'failed' || this.#state === 'disposed'
      || this.#disposeInProgress) return;
    const refresh = (): void => this.#refreshCharacterPreview(this.#lastSourceRenderPlan!);
    if (this.#operation === 'reveal-action' || this.#operation === 'reveal-primitive') {
      try { refresh(); } catch (error) {
        this.#fail(error);
        throw error;
      }
      return;
    }
    try {
      this.#runSynchronousOperation('scroll-preview-refresh', refresh);
    } catch (error) {
      if (this.#operation === null) {
        this.#runSynchronousOperation('scroll-preview-failure', () => this.#fail(error));
      } else {
        this.#fail(error);
      }
      throw error;
    }
  }

  load(): this {
    return this.#runSynchronousOperation('load', () => {
    if (this.#state === 'ready' || this.#state === 'active') return this;
    if (this.#state !== 'created') throw new Error(`Arena V2角色预览load拒绝${this.#state}。`);
    let unbind: (() => void) | null = null;
    try {
      rejectThenable(this.#surface.load(), 'Arena V2角色预览underlying surface.load');
      this.#assertCurrentOperationCommit();
      unbind = this.#surface.bindScrollOffset(() => this.#handleScrollOffset());
      this.#assertCurrentOperationCommit();
      if (typeof unbind !== 'function') {
        throw new TypeError('Arena V2角色预览滚动绑定必须返回解绑函数。');
      }
      this.#scrollUnbind = unbind;
      unbind = null;
      this.#state = 'ready';
      return this;
    } catch (error) {
      const cleanup: unknown[] = [];
      if (typeof unbind === 'function') {
        this.#scrollUnbind = unbind;
      }
      if (this.#scrollUnbind !== null) {
        try {
          synchronousVoid(this.#scrollUnbind(), 'Arena V2角色预览load回滚解绑');
          this.#scrollUnbind = null;
        } catch (cleanupError) { cleanup.push(cleanupError); }
      }
      if (this.#scrollUnbind === null) {
        try {
          synchronousVoid(this.#surface.dispose(), 'Arena V2角色预览load回滚surface.dispose');
          this.#surfaceDisposed = true;
        } catch (cleanupError) { cleanup.push(cleanupError); }
      }
      this.#fail(error);
      throw cleanup.length === 0
        ? error
        : new AggregateError([error, ...cleanup], 'Arena V2角色预览load回滚不完整。');
    }
    });
  }

  bindIntent(value: unknown): unknown {
    return this.#runSynchronousOperation('bind-intent', () => {
      if (this.#state !== 'ready' && this.#state !== 'active') {
        throw new Error(`Arena V2角色预览bindIntent拒绝${this.#state}。`);
      }
      const result = this.#surface.bindIntent(value);
      rejectThenable(result, 'Arena V2角色预览underlying surface.bindIntent');
      this.#assertCurrentOperationCommit();
      return result;
    });
  }

  revealActionPrimitive(primitiveId: unknown): void {
    this.#runSynchronousOperation('reveal-action', () => {
    if (this.#state !== 'ready' && this.#state !== 'active') {
      throw new Error(`Arena V2角色预览revealActionPrimitive拒绝${this.#state}。`);
    }
    if (this.#surface.revealActionPrimitive === undefined) {
      throw new Error('Arena V2角色预览underlying surface不支持动作显示请求。');
    }
    try {
      rejectThenable(
        this.#surface.revealActionPrimitive(primitiveId),
        'Arena V2角色预览underlying surface.revealActionPrimitive',
      );
      this.#assertCurrentOperationCommit();
    } catch (error) {
      this.#fail(error);
      throw error;
    }
    });
  }

  revealPrimitive(primitiveId: unknown): void {
    this.#runSynchronousOperation('reveal-primitive', () => {
    if (this.#state !== 'ready' && this.#state !== 'active') {
      throw new Error(`Arena V2角色预览revealPrimitive拒绝${this.#state}。`);
    }
    if (this.#surface.revealPrimitive === undefined) {
      throw new Error('Arena V2角色预览underlying surface不支持内容显示请求。');
    }
    try {
      rejectThenable(
        this.#surface.revealPrimitive(primitiveId),
        'Arena V2角色预览underlying surface.revealPrimitive',
      );
      this.#assertCurrentOperationCommit();
    } catch (error) {
      this.#fail(error);
      throw error;
    }
    });
  }

  render(plan: ArenaV2UiRenderPlanV1): void {
    this.#runSynchronousOperation('render', () => {
    if (this.#state !== 'ready' && this.#state !== 'active') {
      throw new Error(`Arena V2角色预览render拒绝${this.#state}。`);
    }
    try {
      const modeEnhancedPlan =
        addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1(plan);
      const enhancedPlan =
        addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1(
          modeEnhancedPlan,
        );
      rejectThenable(
        this.#surface.render(enhancedPlan),
        'Arena V2角色预览underlying surface.render',
      );
      this.#assertCurrentOperationCommit();
      this.#lastSourceRenderPlan = plan;
      this.#refreshCharacterPreview(plan);
      this.#state = 'active';
    } catch (error) {
      this.#fail(error);
      throw error;
    }
    });
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertNoOperation('snapshot read');
    return this.#runSynchronousOperation('snapshot read', () => {
      const mountOwner = this.#mountOwner?.getSnapshot() ?? null;
      this.#assertCurrentOperationCommit();
      const renderSurface = this.#renderSurface?.getSnapshot() ?? null;
      this.#assertCurrentOperationCommit();
      return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      state: this.#state,
      lastTick: this.#lastTick,
      previewVisible: this.#previewVisible,
      rendererFactoryInvoked: this.#rendererFactoryInvoked,
      renderedFrameCount: this.#renderedFrameCount,
      mountOwner,
      renderSurface,
      orphanRendererRetainedForCleanup: this.#orphanRenderer !== null,
      previewHiddenForDispose: this.#previewHiddenForDispose,
      scrollUnboundForDispose: this.#scrollUnbind === null,
      surfaceDisposed: this.#surfaceDisposed,
      createsRaf: false as const,
      addsInput: false as const,
      });
    });
  }

  dispose(): void {
    this.#assertNoOperation('dispose');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('dispose', () => {
    if (this.#disposeInProgress) throw new Error('Arena V2角色预览组合dispose不可重入。');
    this.#disposeInProgress = true;
    this.#state = 'failed';
    const errors: unknown[] = [];
    let mayContinue = true;
    try {
      if (!this.#previewHiddenForDispose) {
        mayContinue = this.#runCleanupStep(
          'Arena V2角色预览可见性Owner',
          () => this.#setPreviewVisible(false),
          () => { this.#previewHiddenForDispose = true; },
          errors,
        );
      }
      if (mayContinue && this.#scrollUnbind !== null) {
        const unbind = this.#scrollUnbind;
        mayContinue = this.#runCleanupStep(
          'Arena V2角色预览滚动绑定Owner',
          () => unbind(),
          () => { if (this.#scrollUnbind === unbind) this.#scrollUnbind = null; },
          errors,
        );
      }
      if (mayContinue && this.#renderSurface !== null) {
        const renderSurface = this.#renderSurface;
        mayContinue = this.#runCleanupStep(
          'Arena V2角色预览Render Surface Owner',
          () => renderSurface.destroy(),
          () => { if (this.#renderSurface === renderSurface) this.#renderSurface = null; },
          errors,
        );
      }
      if (mayContinue && this.#orphanRenderer !== null) {
        const renderer = this.#orphanRenderer;
        mayContinue = this.#runCleanupStep(
          'Arena V2角色预览孤儿Renderer Owner',
          () => renderer.dispose(),
          () => { if (this.#orphanRenderer === renderer) this.#orphanRenderer = null; },
          errors,
        );
      }
      if (mayContinue && this.#renderSurface === null && this.#orphanRenderer === null
        && this.#mountOwner !== null) {
        const mountOwner = this.#mountOwner;
        mayContinue = this.#runCleanupStep(
          'Arena V2角色预览Mount Owner',
          () => mountOwner.destroy(),
          () => { if (this.#mountOwner === mountOwner) this.#mountOwner = null; },
          errors,
        );
      }
      if (mayContinue && this.#scrollUnbind === null
        && this.#renderSurface === null
        && this.#orphanRenderer === null
        && this.#mountOwner === null
        && !this.#surfaceDisposed) {
        mayContinue = this.#runCleanupStep(
          'Arena V2角色预览底层Surface Owner',
          () => this.#surface.dispose(),
          () => { this.#surfaceDisposed = true; },
          errors,
        );
      }
      this.#lastSourceRenderPlan = null;
      const complete = this.#previewHiddenForDispose
        && this.#scrollUnbind === null
        && this.#mountOwner === null
        && this.#renderSurface === null
        && this.#orphanRenderer === null
        && this.#surfaceDisposed;
      this.#state = complete && errors.length === 0 ? 'disposed' : 'failed';
    } finally {
      this.#disposeInProgress = false;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2角色预览组合清理不完整。');
    }
    if (this.#state !== 'disposed') {
      throw new Error('Arena V2角色预览组合清理未收敛。');
    }
    });
  }
}

export const ARENA_V2_INFORMATION_CHARACTER_SELECTION_PREVIEW_SURFACE_COMPOSITION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    addsPages: false as const,
    addsActions: false as const,
    createsRaf: false as const,
    addsInput: false as const,
    sharesFormalMatchCharacterAssets: true as const,
    sharesFormalMatchWeaponAssets: true as const,
    selectedModeLoadoutPreviewWired: true as const,
    survivalUnarmedPreviewWired: true as const,
    scrollPositionDoesNotRemountCharacterOrWeapon: true as const,
    fullyVisiblePreviewOnly: true as const,
    clippedPreviewRetainsMount: true as const,
    leavingCharacterPageReleasesMount: true as const,
    constructionRollbackRetainsFailedCleanupOwnership: true as const,
    unpublishedRenderSurfacePublishedBeforeParentCommitCheck: true as const,
    renderSurfaceOwnershipTransferPrecedesOrphanRendererRelease: true as const,
    disposeRetriesOnlyIncompleteOwnedResources: true as const,
    rendererBorrowReleasedBeforeMountOwnerDestroy: true as const,
    underlyingSurfaceWaitsForPreviewOwners: true as const,
    disposeReentrancyRejected: true as const,
    characterCardHandlingIdentityRenderPlanWired: true as const,
    modeCardNonColorIdentityRenderPlanWired: true as const,
    characterPreviewContextUsesOriginalStablePlan: true as const,
    forwardsActionRevealWithoutOwningLayout: true as const,
    forwardsPrimitiveRevealWithoutOwningLayout: true as const,
    synchronousLifecycleOperationReentryRejected: true as const,
    swallowedHostReentryRejectedBeforeSuccessCommit: true as const,
    scrollRefreshReusesCurrentRevealOperation: true as const,
    publicReadsRejectedDuringOperationCommit: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    surfaceMountRendererAndObserverCallbacksCheckedBeforeStateCommit: true as const,
    childSnapshotsCheckedBeforeAggregatePublication: true as const,
    cleanupReentryRetainsCurrentAndLaterOwners: true as const,
    ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
    cleanupCallbacksMustCompleteSynchronously: true as const,
  });
