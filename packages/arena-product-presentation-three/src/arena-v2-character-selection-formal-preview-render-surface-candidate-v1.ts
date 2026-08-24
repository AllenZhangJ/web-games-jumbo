import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import * as THREE from 'three';
import type {
  ArenaV2CharacterSelectionFormalPreviewMountV1,
  ArenaV2CharacterSelectionFormalPreviewViewportV1,
} from './arena-v2-character-selection-formal-preview-mount-candidate-v1.js';
import type {
  ArenaV2WeaponCollectionPreviewRendererPortV1,
} from './arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.js';

export const ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_RENDER_SURFACE_SCHEMA_VERSION_V1 =
  1 as const;

const OPTION_KEYS = new Set(['schemaVersion', 'renderer']);
const RENDER_KEYS = new Set([
  'schemaVersion', 'tick', 'mount', 'viewport', 'previewRectCssPixels', 'pixelRatio',
]);
const MOUNT_KEYS = new Set([
  'schemaVersion', 'status', 'validationStatus', 'tick', 'identity',
  'characterDefinitionId', 'selectedModeKind', 'matchStartsUnarmed',
  'previewWeaponDefinitionId', 'previewWeaponAssetId', 'previewWeaponSilhouetteFamily',
  'previewWeaponPatternCue', 'presentationDefinitionId', 'presentationDefinitionHash',
  'materialProfileId', 'handlingKind', 'bodyTintHex', 'characterValuePatternId',
  'handlingShapeAxis', 'viewport', 'previewSizeCssPixels', 'reducedMotion',
  'previewGroup', 'model', 'weapon', 'camera',
  'hemisphereLight', 'directionalLight', 'framing', 'animation', 'ownership',
]);
const VIEWPORT_KEYS = new Set(['viewportId', 'widthCssPixels', 'heightCssPixels']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);

export interface ArenaV2CharacterSelectionFormalPreviewRenderInputV1 {
  readonly schemaVersion:
    typeof ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_RENDER_SURFACE_SCHEMA_VERSION_V1;
  readonly tick: number;
  readonly mount: ArenaV2CharacterSelectionFormalPreviewMountV1;
  readonly viewport: ArenaV2CharacterSelectionFormalPreviewViewportV1;
  readonly previewRectCssPixels: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>;
  readonly pixelRatio: number;
}

export interface ArenaV2CharacterSelectionFormalPreviewRenderResultV1 {
  readonly schemaVersion:
    typeof ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_RENDER_SURFACE_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly tick: number;
  readonly mountIdentity: string;
  readonly characterDefinitionId: string;
  readonly selectedModeKind: 'duel' | 'race' | 'survival';
  readonly matchStartsUnarmed: boolean;
  readonly previewWeaponDefinitionId: string | null;
  readonly viewportId: ArenaV2CharacterSelectionFormalPreviewViewportV1['viewportId'];
  readonly pixelRatio: number;
  readonly drawCallCount: 1;
  readonly createsRaf: false;
  readonly addsInput: false;
}

export interface ArenaV2CharacterSelectionFormalPreviewRenderSurfaceSnapshotV1 {
  readonly schemaVersion:
    typeof ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_RENDER_SURFACE_SCHEMA_VERSION_V1;
  readonly status: 'production-unreachable';
  readonly validationStatus: 'not-run';
  readonly state: 'active' | 'failed' | 'destroyed';
  readonly lastTick: number;
  readonly renderedFrameCount: number;
  readonly lastMountIdentity: string | null;
  readonly rendererDisposed: boolean;
  readonly sceneEmpty: boolean;
  readonly createsRaf: false;
}

function dataField(value: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function safeTick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function nonNegativeFiniteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}必须是非负有限数。`);
  }
  return value;
}

function viewport(value: unknown): ArenaV2CharacterSelectionFormalPreviewViewportV1 {
  const source = assertPlainRecord(value, 'Arena V2角色选择预览Render viewport');
  assertKnownKeys(source, VIEWPORT_KEYS, 'Arena V2角色选择预览Render viewport');
  const viewportId = dataField(source, 'viewportId', 'Arena V2角色选择预览Render viewport');
  const widthCssPixels = dataField(
    source,
    'widthCssPixels',
    'Arena V2角色选择预览Render viewport',
  );
  const heightCssPixels = dataField(
    source,
    'heightCssPixels',
    'Arena V2角色选择预览Render viewport',
  );
  if (
    (viewportId === '390x844' && widthCssPixels === 390 && heightCssPixels === 844)
    || (viewportId === '1440x900' && widthCssPixels === 1440 && heightCssPixels === 900)
  ) return Object.freeze({ viewportId, widthCssPixels, heightCssPixels });
  throw new RangeError('Arena V2角色选择预览Render viewport不受支持。');
}

function previewRect(
  value: unknown,
  currentViewport: ArenaV2CharacterSelectionFormalPreviewViewportV1,
): ArenaV2CharacterSelectionFormalPreviewRenderInputV1['previewRectCssPixels'] {
  const source = assertPlainRecord(value, 'Arena V2角色选择预览Render rect');
  assertKnownKeys(source, RECT_KEYS, 'Arena V2角色选择预览Render rect');
  const x = nonNegativeFiniteNumber(
    dataField(source, 'x', 'Arena V2角色选择预览Render rect'),
    'rect.x',
  );
  const y = nonNegativeFiniteNumber(
    dataField(source, 'y', 'Arena V2角色选择预览Render rect'),
    'rect.y',
  );
  const width = safeTick(
    dataField(source, 'width', 'Arena V2角色选择预览Render rect'),
    'rect.width',
  );
  const height = safeTick(
    dataField(source, 'height', 'Arena V2角色选择预览Render rect'),
    'rect.height',
  );
  if (width < 168 || height < 240
    || x + width > currentViewport.widthCssPixels
    || y + height > currentViewport.heightCssPixels) {
    throw new RangeError('Arena V2角色选择预览Render rect必须完整位于viewport。');
  }
  return Object.freeze({ x, y, width, height });
}

function rendererPort(value: unknown): ArenaV2WeaponCollectionPreviewRendererPortV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2角色选择预览Renderer必须是对象。');
  }
  const required = [
    'setPixelRatio', 'setSize', 'clear', 'setScissorTest', 'setViewport',
    'setScissor', 'clearDepth', 'render', 'dispose',
  ] as const;
  for (const key of required) {
    let cursor: object | null = value;
    let found = false;
    while (cursor !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
      if (descriptor !== undefined) {
        if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
          throw new TypeError(`Arena V2角色选择预览Renderer.${key}必须是数据方法。`);
        }
        found = true;
        break;
      }
      cursor = Object.getPrototypeOf(cursor);
    }
    if (!found) throw new TypeError(`Arena V2角色选择预览Renderer缺少${key}。`);
  }
  return value as ArenaV2WeaponCollectionPreviewRendererPortV1;
}

function mount(value: unknown): ArenaV2CharacterSelectionFormalPreviewMountV1 {
  const source = assertPlainRecord(value, 'Arena V2角色选择预览Render mount');
  assertKnownKeys(source, MOUNT_KEYS, 'Arena V2角色选择预览Render mount');
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.validationStatus !== 'not-run') {
    throw new RangeError('Arena V2角色选择预览Render mount状态无效。');
  }
  if (!(source.previewGroup instanceof THREE.Group)
    || !(source.model instanceof THREE.Object3D)
    || !(source.camera instanceof THREE.PerspectiveCamera)
    || !(source.hemisphereLight instanceof THREE.HemisphereLight)
    || !(source.directionalLight instanceof THREE.DirectionalLight)) {
    throw new TypeError('Arena V2角色选择预览Render mount Three对象无效。');
  }
  if (source.model.parent !== source.previewGroup
    || !source.previewGroup.children.includes(source.model)) {
    throw new RangeError('Arena V2角色选择预览Render mount层级已漂移。');
  }
  if (source.selectedModeKind !== 'duel'
    && source.selectedModeKind !== 'race'
    && source.selectedModeKind !== 'survival') {
    throw new RangeError('Arena V2角色选择预览Render模式无效。');
  }
  if (typeof source.matchStartsUnarmed !== 'boolean') {
    throw new TypeError('Arena V2角色选择预览Render空手语义必须是boolean。');
  }
  const survival = source.selectedModeKind === 'survival';
  if (survival !== source.matchStartsUnarmed
    || survival !== (source.previewWeaponDefinitionId === null)) {
    throw new RangeError('Arena V2角色选择预览Render模式与开局武器语义已漂移。');
  }
  if (survival) {
    if (source.weapon !== null
      || source.previewWeaponAssetId !== null
      || source.previewWeaponSilhouetteFamily !== null
      || source.previewWeaponPatternCue !== null) {
      throw new RangeError('Arena V2生存角色预览必须保持空手。');
    }
  } else {
    if (!(source.weapon instanceof THREE.Object3D)
      || source.weapon.parent === null
      || source.model.getObjectByProperty('uuid', source.weapon.uuid) !== source.weapon
      || typeof source.previewWeaponDefinitionId !== 'string'
      || source.previewWeaponDefinitionId.length === 0
      || typeof source.previewWeaponAssetId !== 'string'
      || source.previewWeaponAssetId.length === 0
      || typeof source.previewWeaponSilhouetteFamily !== 'string'
      || source.previewWeaponSilhouetteFamily.length === 0
      || typeof source.previewWeaponPatternCue !== 'string'
      || source.previewWeaponPatternCue.length === 0
      || source.weapon.userData['arenaV2EquipmentDefinitionId']
        !== source.previewWeaponDefinitionId
      || source.weapon.userData['arenaV2SilhouetteFamily']
        !== source.previewWeaponSilhouetteFamily
      || source.weapon.userData['arenaV2PatternCue'] !== source.previewWeaponPatternCue) {
      throw new RangeError('Arena V2对战/竞速角色预览缺少已选武器剪影。');
    }
  }
  return value as ArenaV2CharacterSelectionFormalPreviewMountV1;
}

function sameViewport(
  left: ArenaV2CharacterSelectionFormalPreviewViewportV1,
  right: ArenaV2CharacterSelectionFormalPreviewViewportV1,
): boolean {
  return left.viewportId === right.viewportId
    && left.widthCssPixels === right.widthCssPixels
    && left.heightCssPixels === right.heightCssPixels;
}

export class ArenaV2CharacterSelectionFormalPreviewRenderSurfaceCandidateV1 {
  readonly #renderer: ArenaV2WeaponCollectionPreviewRendererPortV1;
  readonly #scene = new THREE.Scene();
  #state: 'active' | 'failed' | 'destroyed' = 'active';
  #lastTick = -1;
  #renderedFrameCount = 0;
  #lastMountIdentity: string | null = null;
  #rendererDisposed = false;
  #sceneClearedForDestroy = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2角色选择预览Render options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2角色选择预览Render options');
    if (dataField(source, 'schemaVersion', 'Arena V2角色选择预览Render options') !== 1) {
      throw new RangeError('Arena V2角色选择预览Render schemaVersion必须是1。');
    }
    this.#renderer = rendererPort(
      dataField(source, 'renderer', 'Arena V2角色选择预览Render options'),
    );
    this.#scene.name = 'ArenaV2CharacterSelectionFormalPreviewScene';
    this.#scene.background = null;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`Arena V2角色选择预览Render ${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('Arena V2角色选择预览Render缺少当前操作所有权。');
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
        ? new AggregateError([failure, reentryError], `Arena V2角色选择预览Render ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failure;
    return result;
  }

  render(value: unknown): ArenaV2CharacterSelectionFormalPreviewRenderResultV1 {
    return this.#runSynchronousOperation('render', () => {
    if (this.#state !== 'active') throw new Error('Arena V2角色选择预览Render当前不可绘制。');
    const source = assertPlainRecord(value, 'Arena V2角色选择预览Render input');
    assertKnownKeys(source, RENDER_KEYS, 'Arena V2角色选择预览Render input');
    if (dataField(source, 'schemaVersion', 'Arena V2角色选择预览Render input') !== 1) {
      throw new RangeError('Arena V2角色选择预览Render input schemaVersion必须是1。');
    }
    const tick = safeTick(dataField(source, 'tick', 'Arena V2角色选择预览Render input'), 'tick');
    if (tick < this.#lastTick) throw new RangeError('Arena V2角色选择预览Render tick回退。');
    const currentMount = mount(dataField(source, 'mount', 'Arena V2角色选择预览Render input'));
    const currentViewport = viewport(
      dataField(source, 'viewport', 'Arena V2角色选择预览Render input'),
    );
    if (!sameViewport(currentMount.viewport, currentViewport)) {
      throw new RangeError('Arena V2角色选择预览Render mount与viewport漂移。');
    }
    const rect = previewRect(
      dataField(source, 'previewRectCssPixels', 'Arena V2角色选择预览Render input'),
      currentViewport,
    );
    if (rect.width !== currentMount.previewSizeCssPixels.width
      || rect.height !== currentMount.previewSizeCssPixels.height) {
      throw new RangeError('Arena V2角色选择预览Render位置尺寸与mount取景尺寸漂移。');
    }
    const pixelRatio = dataField(source, 'pixelRatio', 'Arena V2角色选择预览Render input');
    if (typeof pixelRatio !== 'number' || !Number.isFinite(pixelRatio)
      || pixelRatio < 0.5 || pixelRatio > 2) {
      throw new RangeError('Arena V2角色选择预览Render pixelRatio必须位于0.5..2。');
    }
    const scissorY = currentViewport.heightCssPixels - rect.y - rect.height;
    if (scissorY < 0) throw new RangeError('Arena V2角色选择预览Render rect坐标无效。');
    try {
      this.#renderer.setPixelRatio(pixelRatio);
      this.#assertCurrentOperationCommit();
      this.#renderer.setSize(
        currentViewport.widthCssPixels,
        currentViewport.heightCssPixels,
        false,
      );
      this.#assertCurrentOperationCommit();
      this.#renderer.setScissorTest(false);
      this.#assertCurrentOperationCommit();
      this.#renderer.clear();
      this.#assertCurrentOperationCommit();
      this.#renderer.setScissorTest(true);
      this.#assertCurrentOperationCommit();
      this.#renderer.setViewport(rect.x, scissorY, rect.width, rect.height);
      this.#assertCurrentOperationCommit();
      this.#renderer.setScissor(rect.x, scissorY, rect.width, rect.height);
      this.#assertCurrentOperationCommit();
      this.#renderer.clearDepth();
      this.#assertCurrentOperationCommit();
      this.#scene.add(
        currentMount.previewGroup,
        currentMount.hemisphereLight,
        currentMount.directionalLight,
      );
      this.#assertCurrentOperationCommit();
      this.#renderer.render(this.#scene, currentMount.camera);
      this.#assertCurrentOperationCommit();
      this.#scene.remove(
        currentMount.previewGroup,
        currentMount.hemisphereLight,
        currentMount.directionalLight,
      );
      this.#assertCurrentOperationCommit();
      this.#renderer.setScissorTest(false);
      this.#assertCurrentOperationCommit();
      this.#lastTick = tick;
      this.#renderedFrameCount += 1;
      this.#lastMountIdentity = currentMount.identity;
      return Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        validationStatus: 'not-run' as const,
        tick,
        mountIdentity: currentMount.identity,
        characterDefinitionId: currentMount.characterDefinitionId,
        selectedModeKind: currentMount.selectedModeKind,
        matchStartsUnarmed: currentMount.matchStartsUnarmed,
        previewWeaponDefinitionId: currentMount.previewWeaponDefinitionId,
        viewportId: currentViewport.viewportId,
        pixelRatio,
        drawCallCount: 1 as const,
        createsRaf: false as const,
        addsInput: false as const,
      });
    } catch (error) {
      try {
        this.#scene.remove(
          currentMount.previewGroup,
          currentMount.hemisphereLight,
          currentMount.directionalLight,
        );
      } catch { /* destroy仍会清空Scene。 */ }
      try { this.#renderer.setScissorTest(false); } catch { /* destroy仍会释放Renderer。 */ }
      this.#state = 'failed';
      throw error;
    }
    });
  }

  getSnapshot(): ArenaV2CharacterSelectionFormalPreviewRenderSurfaceSnapshotV1 {
    return this.#runSynchronousOperation('snapshot', () => Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      validationStatus: 'not-run' as const,
      state: this.#state,
      lastTick: this.#lastTick,
      renderedFrameCount: this.#renderedFrameCount,
      lastMountIdentity: this.#lastMountIdentity,
      rendererDisposed: this.#rendererDisposed,
      sceneEmpty: this.#scene.children.length === 0,
      createsRaf: false as const,
    }));
  }

  destroy(): void {
    this.#runSynchronousOperation('destroy', () => {
    if (this.#state === 'destroyed') return;
    this.#state = 'failed';
    const errors: unknown[] = [];
      let mayContinue = true;
      if (!this.#sceneClearedForDestroy) {
        const sequence = this.#reentrySequence;
        try {
          rejectThenable(
            this.#scene.clear(),
            'Arena V2角色选择预览Render scene.clear',
          );
          if (this.#reentrySequence === sequence) {
            this.#sceneClearedForDestroy = true;
          } else {
            errors.push(this.#reentryError
              ?? new Error('Arena V2角色选择预览Render清Scene期间发生同步重入。'));
            mayContinue = false;
          }
        } catch (error) {
          errors.push(error);
          mayContinue = false;
        }
      }
      if (mayContinue && !this.#rendererDisposed) {
        const sequence = this.#reentrySequence;
        try {
          rejectThenable(
            this.#renderer.dispose(),
            'Arena V2角色选择预览Render renderer.dispose',
          );
          if (this.#reentrySequence === sequence) {
            this.#rendererDisposed = true;
          } else {
            errors.push(this.#reentryError
              ?? new Error('Arena V2角色选择预览Renderer清理期间发生同步重入。'));
          }
        } catch (error) {
          errors.push(error);
        }
      }
      this.#state = errors.length === 0
        && this.#sceneClearedForDestroy
        && this.#rendererDisposed
        ? 'destroyed'
        : 'failed';
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2角色选择预览Render销毁不完整。');
    }
    if (this.#state !== 'destroyed') {
      throw new Error('Arena V2角色选择预览Render销毁未收敛。');
    }
    });
  }
}

export const ARENA_V2_CHARACTER_SELECTION_FORMAL_PREVIEW_RENDER_SURFACE_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    injectedRendererOnly: true as const,
    singleSelectedCharacterDraw: true as const,
    validatesModeLoadoutPreviewSemantics: true as const,
    validatesHeldWeaponBelongsToCharacterHierarchy: true as const,
    renderPositionProvidedPerFrame: true as const,
    fractionalScrollPositionSupported: true as const,
    fullyVisiblePreviewOnly: true as const,
    ownsRendererDisposal: true as const,
    rendererDestroyUsesCompletionWatermarks: true as const,
    rendererDestroyReentrancyRejected: true as const,
    synchronousRenderSnapshotAndDestroyGuarded: true as const,
    swallowedRendererReentryFailsClosed: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    rendererAndSceneCallbacksCheckedBeforeFrameCommit: true as const,
    destroyReentryRetainsCurrentAndLaterOwners: true as const,
    ordinaryDestroyFailureRetainsCurrentAndLaterOwners: true as const,
    destroyCallbacksMustCompleteSynchronously: true as const,
    ownsMount: false as const,
    createsDom: false as const,
    createsRaf: false as const,
    addsInput: false as const,
  });
