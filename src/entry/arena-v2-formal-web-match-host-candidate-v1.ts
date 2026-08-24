import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1,
  createArenaV2UiViewportV1,
  type ArenaV2UiViewportV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1,
  ArenaV2FormalMatchSurfaceCandidateV1,
  ArenaV2FormalThreeAssetPreloaderCandidateV1,
  ArenaV2FormalThreeCameraControllerCandidateV1,
  ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1,
  ArenaV2FormalThreeStageConstructionCleanupFailureCandidateV1,
  ArenaV2FormalThreeStageCandidateV1,
} from '@number-strategy-jump/arena-product-presentation-three';
import * as THREE from 'three';
import {
  ArenaV2FormalHudCanvasLayerCandidateV1,
} from './arena-v2-formal-hud-canvas-layer-candidate-v1.js';
import {
  ArenaV2FormalWebAudioConstructionCleanupFailureCandidateV1,
  ArenaV2FormalWebAudioPortCandidateV1,
} from './arena-v2-formal-web-audio-port-candidate-v1.js';
import {
  ArenaV2FormalThreeVfxConstructionCleanupFailureCandidateV1,
  ArenaV2FormalThreeVfxPortCandidateV1,
} from './arena-v2-formal-three-vfx-port-candidate-v1.js';

export const ARENA_V2_FORMAL_WEB_MATCH_HOST_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  PREPARING: 'preparing',
  PRELOADED: 'preloaded',
  MATCH_READY: 'match-ready',
  ACTIVE: 'active',
  PAUSED: 'paused',
  LEFT: 'left',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type WebMatchHostState = typeof ARENA_V2_FORMAL_WEB_MATCH_HOST_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_WEB_MATCH_HOST_STATE_CANDIDATE_V1
];
type SyncFunction = (...args: readonly unknown[]) => unknown;

interface WebViewportEnvelope {
  readonly layout: ArenaV2UiViewportV1;
  readonly pixelRatio: number;
}

const OPTION_KEYS = new Set([
  'rendererCanvas',
  'hudCanvas',
  'viewportProvider',
  'reservedInputBottomCssPixels',
  'assetLoader',
  'onTerminalCleanupSettled',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'rendererCanvas',
  'hudCanvas',
  'viewportProvider',
  'reservedInputBottomCssPixels',
] as const);
const VIEWPORT_KEYS = new Set(['layout', 'pixelRatio']);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function canvasElement(value: unknown, name: string): HTMLCanvasElement {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || typeof (value as HTMLCanvasElement).getContext !== 'function'
    || typeof (value as HTMLCanvasElement).addEventListener !== 'function'
  ) throw new TypeError(`${name}必须是HTMLCanvasElement。`);
  const canvas = value as HTMLCanvasElement;
  if (!canvas.ownerDocument?.defaultView) throw new TypeError(`${name}缺少Document/Window。`);
  return canvas;
}

function syncFunction(value: unknown, name: string): SyncFunction {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncFunction;
}

function captureAsyncOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return operation();
  } catch (error) {
    return Promise.reject(error);
  }
}

function throwSettledBatchFailures(
  results: readonly PromiseSettledResult<unknown>[],
  message: string,
): void {
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, message);
}

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的有限数。`);
  }
  return value;
}

function viewportEnvelope(value: unknown): WebViewportEnvelope {
  const source = assertPlainRecord(value, 'Arena V2 formal Web viewport');
  assertKnownKeys(source, VIEWPORT_KEYS, 'Arena V2 formal Web viewport');
  for (const key of VIEWPORT_KEYS) dataField(source, key, 'Arena V2 formal Web viewport');
  return Object.freeze({
    layout: createArenaV2UiViewportV1(source.layout),
    pixelRatio: finiteAtLeast(source.pixelRatio, 0.5, 'Arena V2 formal Web pixelRatio'),
  });
}

function formalWorldPosition(value: unknown): THREE.Vector3 {
  const source = assertPlainRecord(value, 'Arena V2 formal Web marker position');
  const coordinates = ['x', 'y', 'z'].map((axis) => dataField(
    source,
    axis,
    'Arena V2 formal Web marker position',
  ));
  if (coordinates.some((coordinate) => (
    typeof coordinate !== 'number' || !Number.isFinite(coordinate)
  ))) throw new TypeError('Arena V2 formal Web marker position必须是有限三维坐标。');
  return new THREE.Vector3(
    -(coordinates[0] as number),
    coordinates[1] as number,
    coordinates[2] as number,
  );
}

function formalAssetSourceUrl(sourceKeyValue: unknown, baseUrl: string): string {
  if (
    typeof sourceKeyValue !== 'string'
    || (!sourceKeyValue.startsWith('./assets/') && !sourceKeyValue.startsWith('assets/'))
  ) {
    throw new RangeError('Arena V2 formal Web只允许读取assets/内的正式模型。');
  }
  const pathname = sourceKeyValue.split(/[?#]/u, 1)[0] ?? '';
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch (cause) {
    const failure = new RangeError('Arena V2 formal Web模型路径编码无效。');
    failure.cause = cause;
    throw failure;
  }
  if (
    pathname.includes('\\')
    || decodedPathname.includes('\\')
    || decodedPathname.split('/').includes('..')
  ) {
    throw new RangeError('Arena V2 formal Web拒绝模型路径逃逸。');
  }
  return new URL(sourceKeyValue, baseUrl).href;
}

function belongsToFormalMap(value: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = value;
  while (cursor !== null) {
    if (cursor.name.startsWith('ArenaV2FormalMap:')) return true;
    cursor = cursor.parent;
  }
  return false;
}

function aggregate(
  message: string,
  cause: unknown,
  cleanupErrors: readonly unknown[],
): never {
  if (cleanupErrors.length === 0) throw cause;
  throw new AggregateError([cause, ...cleanupErrors], message);
}

interface FormalWebMatchHostConstructionResourcesCandidateV1 {
  surface: ArenaV2FormalMatchSurfaceCandidateV1 | null;
  stage: ArenaV2FormalThreeStageCandidateV1 | null;
  stageConstructionDebt: ArenaV2FormalThreeStageConstructionCleanupFailureCandidateV1 | null;
  hudLayer: ArenaV2FormalHudCanvasLayerCandidateV1 | null;
  visualEffects: ArenaV2FormalThreeVfxPortCandidateV1 | null;
  visualEffectsConstructionDebt:
    ArenaV2FormalThreeVfxConstructionCleanupFailureCandidateV1 | null;
  characterImpact: ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1 | null;
  cameraController: ArenaV2FormalThreeCameraControllerCandidateV1 | null;
  preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1 | null;
  audio: ArenaV2FormalWebAudioPortCandidateV1 | null;
  audioConstructionDebt: ArenaV2FormalWebAudioConstructionCleanupFailureCandidateV1 | null;
  renderer: THREE.WebGLRenderer | null;
}

function formalWebMatchHostConstructionCleanupCompleteCandidateV1(
  resources: FormalWebMatchHostConstructionResourcesCandidateV1,
): boolean {
  return resources.surface === null
    && resources.stage === null
    && resources.stageConstructionDebt === null
    && resources.hudLayer === null
    && resources.visualEffects === null
    && resources.visualEffectsConstructionDebt === null
    && resources.characterImpact === null
    && resources.cameraController === null
    && resources.preloader === null
    && resources.audio === null
    && resources.audioConstructionDebt === null
    && resources.renderer === null;
}

function cleanupFormalWebMatchHostConstructionResourcesCandidateV1(
  resources: FormalWebMatchHostConstructionResourcesCandidateV1,
): void {
  if (resources.surface !== null) {
    rejectThenable(
      resources.surface.dispose(),
      'Arena V2 formal Web match host construction surface.dispose()',
    );
    resources.surface = null;
    resources.stage = null;
    resources.hudLayer = null;
    resources.visualEffects = null;
    resources.characterImpact = null;
    resources.cameraController = null;
  } else if (resources.stage !== null) {
    rejectThenable(
      resources.stage.dispose(),
      'Arena V2 formal Web match host construction stage.dispose()',
    );
    resources.stage = null;
    resources.hudLayer = null;
    resources.visualEffects = null;
    resources.characterImpact = null;
    resources.cameraController = null;
  } else if (resources.stageConstructionDebt !== null) {
    const debt = resources.stageConstructionDebt;
    rejectThenable(
      debt.retryCleanup(),
      'Arena V2 formal Web match host stage construction debt.retryCleanup()',
    );
    if (!debt.cleanupComplete) {
      throw new Error('Arena V2 formal Web match host Stage构造债务尚未收敛。');
    }
    resources.stageConstructionDebt = null;
  }

  if (resources.surface === null
    && resources.stage === null
    && resources.stageConstructionDebt === null) {
    if (resources.hudLayer !== null) {
      rejectThenable(
        resources.hudLayer.dispose(),
        'Arena V2 formal Web match host construction HUD.dispose()',
      );
      resources.hudLayer = null;
    }
    if (resources.visualEffects !== null) {
      rejectThenable(
        resources.visualEffects.dispose(),
        'Arena V2 formal Web match host construction VFX.dispose()',
      );
      resources.visualEffects = null;
    } else if (resources.visualEffectsConstructionDebt !== null) {
      const debt = resources.visualEffectsConstructionDebt;
      rejectThenable(
        debt.retryCleanup(),
        'Arena V2 formal Web match host VFX construction debt.retryCleanup()',
      );
      if (!debt.cleanupComplete) {
        throw new Error('Arena V2 formal Web match host VFX构造债务尚未收敛。');
      }
      resources.visualEffectsConstructionDebt = null;
    }
    if (resources.characterImpact !== null) {
      rejectThenable(
        resources.characterImpact.dispose(),
        'Arena V2 formal Web match host construction impact.dispose()',
      );
      resources.characterImpact = null;
    }
    if (resources.cameraController !== null) {
      rejectThenable(
        resources.cameraController.dispose(),
        'Arena V2 formal Web match host construction camera.dispose()',
      );
      resources.cameraController = null;
    }
  }

  const stageTreeReleased = resources.surface === null
    && resources.stage === null
    && resources.stageConstructionDebt === null
    && resources.hudLayer === null
    && resources.visualEffects === null
    && resources.visualEffectsConstructionDebt === null
    && resources.characterImpact === null
    && resources.cameraController === null;
  if (stageTreeReleased && resources.preloader !== null) {
    rejectThenable(
      resources.preloader.dispose(),
      'Arena V2 formal Web match host construction preloader.dispose()',
    );
    resources.preloader = null;
  }
  if (stageTreeReleased && resources.preloader === null && resources.audio !== null) {
    rejectThenable(
      resources.audio.dispose(),
      'Arena V2 formal Web match host construction audio.dispose()',
    );
    if (resources.audio.state !== 'disposed') {
      throw new Error('Arena V2 formal Web match host构造Audio清理尚未收敛。');
    }
    resources.audio = null;
  } else if (stageTreeReleased
    && resources.preloader === null
    && resources.audioConstructionDebt !== null) {
    const debt = resources.audioConstructionDebt;
    rejectThenable(
      debt.retryCleanup(),
      'Arena V2 formal Web match host audio construction debt.retryCleanup()',
    );
    if (!debt.cleanupComplete) {
      throw new Error('Arena V2 formal Web match host Audio构造债务尚未收敛。');
    }
    resources.audioConstructionDebt = null;
  }
  if (stageTreeReleased
    && resources.preloader === null
    && resources.audio === null
    && resources.audioConstructionDebt === null
    && resources.renderer !== null) {
    rejectThenable(
      resources.renderer.dispose(),
      'Arena V2 formal Web match host construction renderer.dispose()',
    );
    resources.renderer = null;
  }
  if (!formalWebMatchHostConstructionCleanupCompleteCandidateV1(resources)) {
    throw new Error('Arena V2 formal Web match host构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2FormalWebMatchHostConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: FormalWebMatchHostConstructionResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: FormalWebMatchHostConstructionResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 formal Web match host构造失败且清理不完整。',
    );
    this.name = 'ArenaV2FormalWebMatchHostConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return formalWebMatchHostConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    cleanupFormalWebMatchHostConstructionResourcesCandidateV1(this.#resources);
  }
}

/**
 * Isolated browser composition for the formal Arena V2 match surface. Asset
 * loading is explicitly completed during the information/loading phase; every
 * match call remains synchronous afterwards. The host owns WebGL, scene,
 * camera, HUD and preload leases, but never owns authority state or an RAF.
 */
export class ArenaV2FormalWebMatchHostCandidateV1 {
  readonly #rendererCanvas: HTMLCanvasElement;
  readonly #hudCanvas: HTMLCanvasElement;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.OrthographicCamera;
  readonly #preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1;
  readonly #surface: ArenaV2FormalMatchSurfaceCandidateV1;
  readonly #visualEffects: ArenaV2FormalThreeVfxPortCandidateV1;
  readonly #audio: ArenaV2FormalWebAudioPortCandidateV1;
  readonly #characterSelectionPreviewCleanupDebts =
    new Set<ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1>();
  readonly #onTerminalCleanupSettled: (() => unknown) | null;
  #state: WebMatchHostState = 'created';
  #prepareOperation: Promise<this> | null = null;
  #activationOperation: Promise<this> | null = null;
  #surfaceDisposed = false;
  #preloaderDisposed = false;
  #rendererDisposed = false;
  #audioDisposed = false;
  #contextLostListenerRemoved = true;
  #lastError: unknown = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #pendingContextLoss: unknown = null;
  #terminalCleanupRequested = false;
  #terminalCleanupContinuationScheduled = false;
  #terminalCleanupSettledNotified = false;
  #constructionComplete = false;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal Web match host options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Web match host options');
    for (const key of REQUIRED_OPTION_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena V2 formal Web match host缺少${key}。`);
      }
    }
    for (const key of Object.keys(source)) {
      dataField(source, key, 'Arena V2 formal Web match host options');
    }
    const rendererCanvas = canvasElement(
      source.rendererCanvas,
      'Arena V2 formal Web rendererCanvas',
    );
    const hudCanvas = canvasElement(source.hudCanvas, 'Arena V2 formal Web hudCanvas');
    if (rendererCanvas === hudCanvas) {
      throw new RangeError('Arena V2 formal Web的Three画布与HUD画布必须分离。');
    }
    if (rendererCanvas.ownerDocument !== hudCanvas.ownerDocument) {
      throw new RangeError('Arena V2 formal Web的两个画布必须属于同一Document。');
    }
    const viewportProvider = syncFunction(
      source.viewportProvider,
      'Arena V2 formal Web viewportProvider',
    );
    const reservedInputBottomCssPixels = finiteAtLeast(
      source.reservedInputBottomCssPixels,
      0,
      'Arena V2 formal Web reservedInputBottomCssPixels',
    );
    const onTerminalCleanupSettled = Object.hasOwn(source, 'onTerminalCleanupSettled')
      ? dataField(source, 'onTerminalCleanupSettled', 'Arena V2 formal Web match host options')
      : null;
    if (onTerminalCleanupSettled !== null && typeof onTerminalCleanupSettled !== 'function') {
      throw new TypeError(
        'Arena V2 formal Web match host onTerminalCleanupSettled必须是函数或null。',
      );
    }
    this.#onTerminalCleanupSettled = onTerminalCleanupSettled as (() => unknown) | null;
    const windowObject = rendererCanvas.ownerDocument.defaultView;
    if (windowObject === null) {
      throw new TypeError('Arena V2 formal Web match host缺少Window。');
    }
    const assetBaseUrl = rendererCanvas.ownerDocument.baseURI;

    let renderer: THREE.WebGLRenderer | null = null;
    let preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1 | null = null;
    let audio: ArenaV2FormalWebAudioPortCandidateV1 | null = null;
    let hudLayer: ArenaV2FormalHudCanvasLayerCandidateV1 | null = null;
    let cameraController: ArenaV2FormalThreeCameraControllerCandidateV1 | null = null;
    let characterImpact:
      ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1 | null = null;
    let visualEffects: ArenaV2FormalThreeVfxPortCandidateV1 | null = null;
    let stage: ArenaV2FormalThreeStageCandidateV1 | null = null;
    let surface: ArenaV2FormalMatchSurfaceCandidateV1 | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: rendererCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x19_28_33, 1);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x19_28_33);
      const hemisphere = new THREE.HemisphereLight(0xf3_f8_ff, 0x24_30_34, 2.1);
      hemisphere.name = 'ArenaV2FormalHemisphereLight';
      const keyLight = new THREE.DirectionalLight(0xff_f3_d4, 3.1);
      keyLight.name = 'ArenaV2FormalKeyLight';
      keyLight.position.set(-8, 14, 9);
      const fillLight = new THREE.DirectionalLight(0x64_c9_e8, 1.2);
      fillLight.name = 'ArenaV2FormalFillLight';
      fillLight.position.set(10, 7, -6);
      scene.add(hemisphere, keyLight, fillLight);
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1_000);
      camera.name = 'ArenaV2FormalCamera';
      audio = new ArenaV2FormalWebAudioPortCandidateV1({
        windowObject,
        baseUrl: assetBaseUrl,
        allowMissingCandidateCues: true,
        allowUnapprovedCandidateCues: true,
        onTerminalCleanupProgress: () => {
          if (this.#constructionComplete) this.#scheduleTerminalCleanupContinuation();
        },
      });
      preloader = new ArenaV2FormalThreeAssetPreloaderCandidateV1(
        source.assetLoader === undefined
          ? {
              readAssetBytes: async (sourceKey: string, signal: AbortSignal) => {
                const response = await windowObject.fetch(
                  formalAssetSourceUrl(sourceKey, assetBaseUrl),
                  { signal },
                );
                if (!response.ok) {
                  throw new Error(
                    `Arena V2 formal Web模型读取失败：HTTP ${response.status}。`,
                  );
                }
                return response.arrayBuffer();
              },
              createImage: () => rendererCanvas.ownerDocument.createElement('img'),
              allowUnapprovedCandidates: true,
            }
          : { loader: source.assetLoader, allowUnapprovedCandidates: true },
      );
      const readViewport = (): WebViewportEnvelope => {
        const result = viewportProvider();
        rejectThenable(result, 'Arena V2 formal Web viewportProvider');
        return viewportEnvelope(result);
      };
      cameraController = new ArenaV2FormalThreeCameraControllerCandidateV1({
        camera,
        viewportProvider: () => {
          const viewport = readViewport();
          return Object.freeze({
            width: viewport.layout.width,
            height: viewport.layout.height,
            pixelRatio: viewport.pixelRatio,
            safeArea: null,
          });
        },
      });
      characterImpact = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
      const markerRaycaster = new THREE.Raycaster();
      const cameraProjection = Object.freeze({
        project: (position: unknown) => {
          const world = formalWorldPosition(position);
          camera.updateMatrixWorld(true);
          scene.updateMatrixWorld(true);
          const cameraSpace = world.clone().applyMatrix4(camera.matrixWorldInverse);
          const normalized = world.clone().project(camera);
          const behindCamera = cameraSpace.z >= 0
            || normalized.z < -1
            || normalized.z > 1;
          const direction = world.clone().sub(camera.position);
          const distance = direction.length();
          let occluded = false;
          if (!behindCamera && distance > 0.2) {
            markerRaycaster.set(camera.position, direction.normalize());
            markerRaycaster.near = 0.01;
            markerRaycaster.far = Math.max(0.01, distance - 0.2);
            occluded = markerRaycaster.intersectObjects(scene.children, true).some(
              ({ object }) => belongsToFormalMap(object),
            );
          }
          return Object.freeze({
            normalizedX: normalized.x,
            normalizedY: normalized.y,
            depth: distance,
            behindCamera,
            occluded,
          });
        },
      });
      hudLayer = new ArenaV2FormalHudCanvasLayerCandidateV1({
        canvas: hudCanvas,
        viewportProvider: readViewport,
        reservedInputBottomCssPixels,
        cameraProjection,
      });
      hudLayer.load();
      visualEffects = new ArenaV2FormalThreeVfxPortCandidateV1({
        scene,
        camera,
        baseUrl: assetBaseUrl,
        createImage: () => rendererCanvas.ownerDocument.createElement('img'),
        allowUnapprovedCandidateTextures: true,
        cameraImpact: cameraController,
        characterImpact,
      });
      let rendererWidth = -1;
      let rendererHeight = -1;
      let rendererPixelRatio = -1;
      const rendererPort = Object.freeze({
        render: (renderScene: unknown, renderCamera: unknown): void => {
          if (!(renderScene instanceof THREE.Scene) || !(renderCamera instanceof THREE.Camera)) {
            throw new TypeError('Arena V2 formal Web renderer只接受Three Scene/Camera。');
          }
          const viewport = readViewport();
          const width = Math.max(1, Math.round(viewport.layout.width));
          const height = Math.max(1, Math.round(viewport.layout.height));
          if (rendererPixelRatio !== viewport.pixelRatio) {
            renderer!.setPixelRatio(viewport.pixelRatio);
            rendererPixelRatio = viewport.pixelRatio;
          }
          if (rendererWidth !== width || rendererHeight !== height) {
            renderer!.setSize(width, height, false);
            rendererWidth = width;
            rendererHeight = height;
          }
          renderer!.render(renderScene, renderCamera);
        },
      });
      stage = new ArenaV2FormalThreeStageCandidateV1({
        preloader,
        actionPresentations: ARENA_V2_FORMAL_ACTION_PRESENTATIONS_CANDIDATE_V1,
        scene,
        camera,
        renderer: rendererPort,
        cameraController,
        characterImpact,
        hudLayer,
        visualEffects,
        weaponPhaseAudio: audio,
        allowUnapprovedCandidates: true,
      });
      surface = new ArenaV2FormalMatchSurfaceCandidateV1({
        stage,
        allowUnapprovedCandidates: true,
      });
      this.#rendererCanvas = rendererCanvas;
      this.#hudCanvas = hudCanvas;
      this.#renderer = renderer;
      this.#scene = scene;
      this.#camera = camera;
      this.#preloader = preloader;
      this.#surface = surface;
      this.#visualEffects = visualEffects;
      this.#audio = audio;
      this.#constructionComplete = true;
    } catch (error) {
      const resources: FormalWebMatchHostConstructionResourcesCandidateV1 = {
        surface,
        stage,
        stageConstructionDebt:
          error instanceof ArenaV2FormalThreeStageConstructionCleanupFailureCandidateV1
            ? error
            : null,
        hudLayer,
        visualEffects,
        visualEffectsConstructionDebt:
          error instanceof ArenaV2FormalThreeVfxConstructionCleanupFailureCandidateV1
            ? error
            : null,
        characterImpact,
        cameraController,
        preloader,
        audio,
        audioConstructionDebt:
          error instanceof ArenaV2FormalWebAudioConstructionCleanupFailureCandidateV1
            ? error
            : null,
        renderer,
      };
      try {
        cleanupFormalWebMatchHostConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaV2FormalWebMatchHostConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
  }

  get state(): WebMatchHostState {
    return this.#runSynchronousOperation('state-read', () => this.#state);
  }
  get lastError(): unknown {
    return this.#runSynchronousOperation('last-error-read', () => this.#lastError);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertOperationCommit(operation: string): void {
    if (this.#operation !== operation) {
      throw new Error(`Arena V2 formal Web match host缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal Web match host缺少当前操作所有权。');
    }
    this.#assertOperationCommit(this.#operation);
  }

  #assertUsable(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝当前状态${this.#state}。`);
    }
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
    try {
      const result = run();
      this.#assertOperationCommit(operation);
      return result;
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      const reentryError = this.#reentryError;
      const operationFailure = this.#operationFailure;
      if (reentryError !== null) {
        const failure = operationFailure === null || operationFailure === reentryError
          ? reentryError
          : new AggregateError(
            [operationFailure, reentryError],
            `Arena V2 formal Web match host ${operation}失败且检测到同步重入。`,
          );
        try {
          this.#commitFailure(failure);
        } finally {
          if (this.#operation === operation) this.#operation = null;
          this.#reentryError = null;
          this.#operationFailure = null;
        }
      }
      if (this.#operation === operation) this.#operation = null;
      this.#reentryError = null;
      this.#operationFailure = null;
    }
  }

  #throwPendingContextLoss(): void {
    if (this.#pendingContextLoss === null) return;
    const error = this.#pendingContextLoss;
    this.#pendingContextLoss = null;
    throw error;
  }

  #runCleanupStep(
    label: string,
    run: () => unknown,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const reentrySequence = this.#reentrySequence;
    try {
      rejectThenable(run(), `${label}清理回调`);
      if (this.#reentrySequence !== reentrySequence) {
        const error = this.#reentryError ?? new Error(`${label}清理期间发生同步重入。`);
        errors.push(error);
        this.#operationFailure ??= error;
        return false;
      }
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      if (this.#reentrySequence !== reentrySequence) {
        this.#operationFailure ??= error;
      }
      return false;
    }
  }

  #cleanup(): readonly unknown[] {
    const errors: unknown[] = [];
    if (!this.#contextLostListenerRemoved) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Web context lost listener',
        () => {
          const removal = this.#rendererCanvas.removeEventListener(
            'webglcontextlost',
            this.#handleContextLost,
          );
          rejectThenable(removal, 'Arena V2 formal Web context lost listener cleanup');
        },
        () => { this.#contextLostListenerRemoved = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (!this.#surfaceDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Web match surface',
        () => this.#surface.dispose(),
        () => { this.#surfaceDisposed = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#surfaceDisposed) {
      for (const owner of this.#characterSelectionPreviewCleanupDebts) {
        if (!this.#runCleanupStep(
          'Arena V2 formal Web character selection preview construction debt',
          () => owner.destroy(),
          () => { this.#characterSelectionPreviewCleanupDebts.delete(owner); },
          errors,
        )) return Object.freeze(errors);
      }
    }
    if (this.#surfaceDisposed && !this.#preloaderDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Web asset preloader',
        () => this.#preloader.dispose(),
        () => { this.#preloaderDisposed = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#surfaceDisposed && !this.#rendererDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Web renderer',
        () => this.#renderer.dispose(),
        () => { this.#rendererDisposed = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#surfaceDisposed && !this.#audioDisposed) {
      let audioDisposed = false;
      if (!this.#runCleanupStep(
        'Arena V2 formal Web audio',
        () => {
          this.#audio.dispose();
          audioDisposed = this.#audio.state === 'disposed';
        },
        () => { this.#audioDisposed = audioDisposed; },
        errors,
      )) return Object.freeze(errors);
    }
    if (errors.length === 0 && !this.#cleanupComplete()) {
      errors.push(new Error('Arena V2 formal Web match host终态清理依赖尚未收敛。'));
    }
    return Object.freeze(errors);
  }

  #cleanupComplete(): boolean {
    return this.#contextLostListenerRemoved
      && this.#surfaceDisposed
      && this.#characterSelectionPreviewCleanupDebts.size === 0
      && this.#preloaderDisposed
      && this.#rendererDisposed
      && this.#audioDisposed;
  }

  #notifyTerminalCleanupSettled(): void {
    if (this.#terminalCleanupSettledNotified || this.#state !== 'disposed') return;
    this.#terminalCleanupSettledNotified = true;
    if (this.#onTerminalCleanupSettled === null) return;
    try {
      rejectThenable(
        this.#onTerminalCleanupSettled(),
        'Arena V2 formal Web match host terminal cleanup observer',
      );
    } catch (error) {
      this.#lastError ??= error;
    }
  }

  #recordTerminalCleanupContinuationFailure(error: unknown): void {
    try {
      this.#runSynchronousOperation(
        'Arena V2 formal Web异步续接清理异常提交',
        () => {
          this.#terminalCleanupContinuationScheduled = false;
          this.#state = 'failed';
          this.#lastError = new AggregateError(
            this.#lastError === null ? [error] : [this.#lastError, error],
            'Arena V2 formal Web match host异步续接清理异常。',
          );
        },
      );
    } catch (commitError) {
      this.#terminalCleanupContinuationScheduled = false;
      this.#state = 'failed';
      this.#lastError = new AggregateError(
        this.#lastError === null
          ? [error, commitError]
          : [this.#lastError, error, commitError],
        'Arena V2 formal Web match host异步续接清理异常提交失败。',
      );
    }
  }

  #scheduleTerminalCleanupContinuation(): void {
    if (
      !this.#terminalCleanupRequested
      || this.#terminalCleanupContinuationScheduled
      || this.#state === 'disposed'
    ) return;
    this.#terminalCleanupContinuationScheduled = true;
    void Promise.resolve().then(() => {
      this.#runSynchronousOperation('Arena V2 formal Web异步续接清理', () => {
        this.#terminalCleanupContinuationScheduled = false;
        if (!this.#terminalCleanupRequested || this.#state === 'disposed') return;
        const errors = this.#cleanup();
        this.#assertCurrentOperationCommit();
        if (this.#cleanupComplete()) {
          this.#state = 'disposed';
          this.#notifyTerminalCleanupSettled();
          this.#assertCurrentOperationCommit();
          return;
        }
        this.#state = 'failed';
        if (errors.length > 0) {
          this.#lastError = new AggregateError(
            this.#lastError === null ? errors : [this.#lastError, ...errors],
            'Arena V2 formal Web match host异步续接清理不完整。',
          );
        }
      });
    }).catch((error: unknown) => {
      this.#recordTerminalCleanupContinuationFailure(error);
    });
  }

  #bindContextLostListener(): void {
    if (!this.#contextLostListenerRemoved) return;
    this.#contextLostListenerRemoved = false;
    const result = this.#rendererCanvas.addEventListener(
      'webglcontextlost',
      this.#handleContextLost,
    );
    rejectThenable(result, 'Arena V2 formal Web context lost listener bind');
    this.#assertCurrentOperationCommit();
  }

  #commitFailure(error: unknown): never {
    this.#pendingContextLoss = null;
    this.#lastError = error;
    this.#terminalCleanupRequested = true;
    const cleanupErrors = this.#cleanup();
    this.#state = 'failed';
    aggregate('Arena V2 formal Web match host失败且清理不完整。', error, cleanupErrors);
  }

  #fail(error: unknown): never {
    if (this.#operation !== null && this.#reentryError !== null) throw error;
    if (this.#operation !== null) return this.#commitFailure(error);
    return this.#runSynchronousOperation(
      'Arena V2 formal Web match host失败提交',
      () => this.#commitFailure(error),
    );
  }

  readonly #handleContextLost = (event: Event): void => {
    if (this.#operation !== null) {
      const operation = this.#operation;
      event.preventDefault();
      this.#assertOperationCommit(operation);
      if (this.#state === 'disposed' || this.#state === 'failed') return;
      const contextLostError = new Error('Arena V2 formal WebGL context丢失，需要完整重建Host。');
      if (!this.#terminalCleanupRequested) this.#pendingContextLoss ??= contextLostError;
      return;
    }
    this.#runSynchronousOperation('Arena V2 formal Web context lost提交', () => {
      event.preventDefault();
      this.#assertCurrentOperationCommit();
      if (this.#state === 'disposed' || this.#state === 'failed') return;
      const contextLostError = new Error('Arena V2 formal WebGL context丢失，需要完整重建Host。');
      this.#terminalCleanupRequested = true;
      const cleanupErrors = this.#cleanup();
      this.#assertCurrentOperationCommit();
      this.#lastError = cleanupErrors.length === 0
        ? contextLostError
        : new AggregateError(
          [contextLostError, ...cleanupErrors],
          'Arena V2 formal WebGL context丢失且清理不完整。',
        );
      this.#state = 'failed';
    });
  };

  prepareFormalAssets(): Promise<this> {
    this.#assertNoOperation('Arena V2 formal Web match host prepareFormalAssets');
    if (this.#state === 'preparing' && this.#prepareOperation !== null) {
      return this.#prepareOperation;
    }
    this.#assertUsable('Arena V2 formal Web match host prepareFormalAssets');
    if (this.#state === 'preloaded') return Promise.resolve(this);
    if (this.#prepareOperation !== null) return this.#prepareOperation;
    if (this.#state !== 'created') {
      return Promise.reject(new Error(`Arena V2 formal Web不能在${this.#state}预加载。`));
    }
    this.#state = 'preparing';
    const prepareOwner = deferred<this>();
    this.#prepareOperation = prepareOwner.promise;
    let childOperations: readonly Promise<unknown>[] = Object.freeze([]);
    try {
      this.#runSynchronousOperation(
        'Arena V2 formal Web match host资产准备启动',
        () => {
          this.#bindContextLostListener();
          const startedChildOperations: Promise<unknown>[] = [];
          startedChildOperations.push(captureAsyncOperation(() => this.#preloader.load()));
          childOperations = Object.freeze([...startedChildOperations]);
          this.#assertCurrentOperationCommit();
          startedChildOperations.push(captureAsyncOperation(() => this.#audio.load()));
          childOperations = Object.freeze([...startedChildOperations]);
          this.#assertCurrentOperationCommit();
          startedChildOperations.push(captureAsyncOperation(() => this.#visualEffects.load()));
          childOperations = Object.freeze([...startedChildOperations]);
          this.#assertCurrentOperationCommit();
          this.#throwPendingContextLoss();
        },
      );
    } catch (error) {
      let failure: unknown = error;
      if (this.#state === 'preparing') {
        try {
          this.#fail(error);
        } catch (caught) { failure = caught; }
      }
      const execution = Promise.allSettled(childOperations).then(() => {
        throw failure;
      }).finally(() => {
        this.#scheduleTerminalCleanupContinuation();
      });
      void execution.then(prepareOwner.resolve, prepareOwner.reject);
      return this.#prepareOperation;
    }
    const execution = Promise.allSettled(childOperations).then((results) => {
      return this.#runSynchronousOperation(
        'Arena V2 formal Web match host资产准备成功提交',
        () => {
          throwSettledBatchFailures(
            results,
            'Arena V2 formal Web资产准备批次存在多项失败。',
          );
          if (this.#state !== 'preparing') {
            throw new Error('Arena V2 formal Web资产加载完成时Host已不可接收。');
          }
          this.#throwPendingContextLoss();
          this.#state = 'preloaded';
          return this;
        },
      );
    }).catch((error: unknown) => {
      if (this.#state !== 'preparing') throw error;
      return this.#fail(error);
    }).finally(() => {
      this.#scheduleTerminalCleanupContinuation();
    });
    void execution.then(prepareOwner.resolve, prepareOwner.reject);
    return this.#prepareOperation;
  }

  activateFormalAudio(): Promise<this> {
    this.#assertNoOperation('Arena V2 formal Web match host activateFormalAudio');
    if (this.#state === 'preloaded' && this.#activationOperation !== null) {
      return this.#activationOperation;
    }
    this.#assertUsable('Arena V2 formal Web match host activateFormalAudio');
    if (this.#state !== 'preloaded') {
      return Promise.reject(new Error('Arena V2 formal Web必须先完成正式资产预加载。'));
    }
    if (this.#activationOperation !== null) return this.#activationOperation;
    const activationOwner = deferred<this>();
    this.#activationOperation = activationOwner.promise;
    let audioActivation: Promise<ArenaV2FormalWebAudioPortCandidateV1>;
    try {
      audioActivation = this.#runSynchronousOperation(
        'Arena V2 formal Web match host音频激活启动',
        () => {
          const operation = captureAsyncOperation(() => this.#audio.activate());
          this.#assertCurrentOperationCommit();
          this.#throwPendingContextLoss();
          return operation;
        },
      );
    } catch (error) {
      audioActivation = Promise.reject(error);
    }
    const execution = audioActivation.then(() => {
      return this.#runSynchronousOperation(
        'Arena V2 formal Web match host音频激活成功提交',
        () => {
          if (this.#state !== 'preloaded') {
            throw new Error(`Arena V2 formal Web音频激活完成时Host状态已是${this.#state}。`);
          }
          this.#throwPendingContextLoss();
          return this;
        },
      );
    }).catch((error: unknown) => {
      if (this.#state === 'disposed' || this.#state === 'failed') throw error;
      return this.#fail(error);
    }).finally(() => {
      this.#scheduleTerminalCleanupContinuation();
    });
    void execution.then(activationOwner.resolve, activationOwner.reject);
    return this.#activationOperation;
  }

  createCharacterSelectionFormalPreviewMountOwner():
    ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1 {
    this.#assertUsable('Arena V2 formal Web match host createCharacterSelectionPreview');
    if (this.#state === 'created' || this.#state === 'preparing') {
      throw new Error('Arena V2角色选择正式预览必须等待共享正式资产预加载完成。');
    }
    return this.#runSynchronousOperation(
      'Arena V2 formal Web match host createCharacterSelectionPreview',
      () => {
        let owner: ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1 | null = null;
        try {
          owner = new ArenaV2CharacterSelectionFormalPreviewMountOwnerCandidateV1({
            schemaVersion: 1,
            preloader: this.#preloader,
          });
          this.#assertCurrentOperationCommit();
          this.#throwPendingContextLoss();
          return owner;
        } catch (error) {
          const cleanupErrors: unknown[] = [];
          if (owner !== null) {
            this.#characterSelectionPreviewCleanupDebts.add(owner);
            const reentrySequence = this.#reentrySequence;
            try {
              rejectThenable(
                owner.destroy(),
                'Arena V2角色选择正式预览Owner创建回滚destroy()',
              );
              if (this.#reentrySequence !== reentrySequence) {
                cleanupErrors.push(this.#reentryError ?? new Error(
                  'Arena V2角色选择正式预览Owner回滚期间发生同步重入。',
                ));
              } else {
                this.#characterSelectionPreviewCleanupDebts.delete(owner);
              }
            } catch (cleanupError) { cleanupErrors.push(cleanupError); }
          }
          this.#fail(cleanupErrors.length === 0
            ? error
            : new AggregateError(
              [error, ...cleanupErrors],
              'Arena V2角色选择正式预览Owner创建失败且回滚不完整。',
            ));
        }
      },
    );
  }

  getFeedbackPorts(): Readonly<{
    readonly audio: ArenaV2FormalWebAudioPortCandidateV1;
    readonly visual: ArenaV2FormalThreeVfxPortCandidateV1;
  }> {
    this.#assertUsable('Arena V2 formal Web match host getFeedbackPorts');
    return this.#runSynchronousOperation(
      'Arena V2 formal Web match host getFeedbackPorts',
      () => Object.freeze({ audio: this.#audio, visual: this.#visualEffects }),
    );
  }

  load(value: unknown): void {
    this.#assertUsable('Arena V2 formal Web match host load');
    if (this.#state !== 'preloaded') {
      throw new Error('Arena V2 formal Web必须先完成正式资产预加载。');
    }
    if (this.#audio.state !== 'ready') {
      throw new Error('Arena V2 formal Web必须先由用户手势激活正式音频。');
    }
    this.#runSynchronousOperation('Arena V2 formal Web match host load', () => {
      try {
        this.#surface.load(value);
        this.#assertCurrentOperationCommit();
        this.#throwPendingContextLoss();
        this.#state = 'match-ready';
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  render(value: unknown): void {
    this.#assertUsable('Arena V2 formal Web match host render');
    if (this.#state !== 'match-ready' && this.#state !== 'active' && this.#state !== 'left') {
      throw new Error(`Arena V2 formal Web不能在${this.#state}渲染。`);
    }
    this.#runSynchronousOperation('Arena V2 formal Web match host render', () => {
      try {
        this.#surface.render(value);
        this.#assertCurrentOperationCommit();
        this.#throwPendingContextLoss();
        this.#state = 'active';
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  pause(): void {
    this.#assertUsable('Arena V2 formal Web match host pause');
    if (this.#state === 'paused') return;
    if (this.#state !== 'active') throw new Error('Arena V2 formal Web只能暂停活动对局。');
    this.#runSynchronousOperation('Arena V2 formal Web match host pause', () => {
      try {
        this.#surface.pause();
        this.#assertCurrentOperationCommit();
        this.#throwPendingContextLoss();
        this.#state = 'paused';
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  resume(): void {
    this.#assertUsable('Arena V2 formal Web match host resume');
    if (this.#state === 'active') return;
    if (this.#state !== 'paused') throw new Error('Arena V2 formal Web只能恢复暂停对局。');
    this.#runSynchronousOperation('Arena V2 formal Web match host resume', () => {
      try {
        this.#surface.resume();
        this.#assertCurrentOperationCommit();
        this.#throwPendingContextLoss();
        this.#state = 'active';
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  leave(): void {
    this.#assertUsable('Arena V2 formal Web match host leave');
    if (this.#state === 'left') return;
    if (this.#state !== 'active' && this.#state !== 'paused') {
      throw new Error('Arena V2 formal Web当前没有可离开的对局。');
    }
    this.#runSynchronousOperation('Arena V2 formal Web match host leave', () => {
      try {
        this.#surface.leave();
        this.#assertCurrentOperationCommit();
        this.#throwPendingContextLoss();
        this.#state = 'left';
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runSynchronousOperation('snapshot-read', () => {
      try {
        const preloaderSnapshot = this.#preloader.getSnapshot();
        this.#assertCurrentOperationCommit();
        const rendererCanvasWidth = this.#rendererCanvas.width;
        this.#assertCurrentOperationCommit();
        const rendererCanvasHeight = this.#rendererCanvas.height;
        this.#assertCurrentOperationCommit();
        const hudCanvasWidth = this.#hudCanvas.width;
        this.#assertCurrentOperationCommit();
        const hudCanvasHeight = this.#hudCanvas.height;
        this.#assertCurrentOperationCommit();
        const sceneChildCount = this.#scene.children.length;
        this.#assertCurrentOperationCommit();
        const cameraType = this.#camera.type;
        this.#assertCurrentOperationCommit();
        const visualEffects = this.#visualEffects.getSnapshot();
        this.#assertCurrentOperationCommit();
        const audio = this.#audio.getSnapshot();
        this.#assertCurrentOperationCommit();
        const snapshot = Object.freeze({
          state: this.#state,
          preloader: preloaderSnapshot,
          rendererCanvasSize: Object.freeze({
            width: rendererCanvasWidth,
            height: rendererCanvasHeight,
          }),
          hudCanvasSize: Object.freeze({
            width: hudCanvasWidth,
            height: hudCanvasHeight,
          }),
          sceneChildCount,
          cameraType,
          visualEffects,
          audio,
          characterSelectionPreviewCleanupDebtCount:
            this.#characterSelectionPreviewCleanupDebts.size,
          terminalCleanupRequested: this.#terminalCleanupRequested,
          terminalCleanupContinuationScheduled: this.#terminalCleanupContinuationScheduled,
          pendingContextLoss: this.#pendingContextLoss !== null,
          lastError: this.#lastError,
        });
        this.#throwPendingContextLoss();
        return snapshot;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  dispose(): void {
    this.#assertNoOperation('Arena V2 formal Web match host dispose');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Web match host dispose', () => {
      this.#pendingContextLoss = null;
      this.#terminalCleanupRequested = true;
      const errors = this.#cleanup();
      this.#assertCurrentOperationCommit();
      this.#state = errors.length === 0 ? 'disposed' : 'failed';
      if (this.#state === 'disposed') {
        this.#notifyTerminalCleanupSettled();
        this.#assertCurrentOperationCommit();
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Web match host清理不完整。');
      }
    });
  }
}

export const ARENA_V2_FORMAL_WEB_MATCH_HOST_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  engine: 'three.js-webgl-plus-custom-deterministic-typescript-authority' as const,
  antialiasEnabled: true as const,
  renderScaleReductionAllowed: false as const,
  ownsAnimationFrameLoop: false as const,
  requiresLoadingPhaseFormalAssetPreload: true as const,
  requiresUserGestureAudioActivation: true as const,
  lateAudioActivationCannotReviveOrRefailClosedHost: true as const,
  contextLostListenerBindsAfterConstruction: true as const,
  contextLostListenerCleanupRetainsRetryOwnership: true as const,
  listenerCleanupFailureStopsOwnedResourceCleanup: true as const,
  borrowedResourcesReleaseAfterSurfaceDisposal: true as const,
  audioOwnershipRetainedUntilContextCloseCompletes: true as const,
  terminalStateRequiresEveryOwnedResourceCleanup: true as const,
  terminalCleanupCommitsUnderOperationGuard: true as const,
  contextLossDuringOperationDefersFailureUntilBeforeSuccessCommit: true as const,
  pendingContextLossCannotBeOverwrittenBySuccessState: true as const,
  snapshotRejectedDuringOperationCommit: true as const,
  assetPreparationWaitsForEntireChildBatchSettlement: true as const,
  prepareOperationPublishedBeforeChildAssetLoad: true as const,
  activationOperationPublishedBeforeAudioResume: true as const,
  repeatedPrepareAndActivationRequestsCheckReentryBeforeOwnerReuse: true as const,
  asyncLaunchCommitsGuarded: true as const,
  stateAndErrorReadsRejectedDuringOperationCommit: true as const,
  swallowedChildOwnerOrObserverReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  childCallbacksCheckedBeforeStateAndSnapshotCommit: true as const,
  preparationChildrenCapturedBeforeNextLaunch: true as const,
  cleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true as const,
  ordinaryCleanupFailureRetainsCurrentOwnerAndStopsLaterOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  previewOwnerRollbackPrecedesHostFailureCleanup: true as const,
  failedPreviewOwnerRollbackRetainedUntilBeforePreloaderRelease: true as const,
  asyncPrepareAndActivationSettlementCommitsUnderOperationGuard: true as const,
  pendingContextLossConsumedByAsyncSuccessCommits: true as const,
  synchronousPrepareLaunchFailureWaitsForStartedChildren: true as const,
  terminalContinuationUsesStickyOperationGuard: true as const,
  terminalContinuationFailureCommitCannotEscapeDetachedPromise: true as const,
  failedTerminalContinuationClearsScheduledWatermarkForRetry: true as const,
  publicLifecycleAndSnapshotUseStickyOperationGuard: true as const,
  synchronousChildLoadThrowCannotSkipSiblingStartup: true as const,
  reportsEveryRejectedChildPreparationInSettledBatch: true as const,
  asyncChildSettlementAutomaticallyContinuesTerminalCleanup: true as const,
  constructorRollbackIgnoresLateChildProgressCallbacks: true as const,
  constructorRollbackExposesRetryableCompleteOwnerTree: true as const,
  constructorRollbackStopsAtFirstIncompleteOwner: true as const,
  constructorRollbackOwnsAudioConstructionDebtUntilContextClose: true as const,
  constructorRollbackOwnsVfxConstructionDebtUntilRootDetach: true as const,
  terminalCleanupProgressUsesEventsNotPolling: true as const,
  terminalCleanupSettlementPropagatesToOwningComposition: true as const,
  lateAssetPreparationCannotRefailClosedHost: true as const,
  exposesSharedFeedbackPorts: true as const,
  exposesSharedCharacterSelectionPreviewFactory: true as const,
  matchPhaseAsyncAssetIoAllowed: false as const,
  programmaticAssetFallbackAllowed: false as const,
  formalModelFetchesUseAbortableOwnedAssetReadPort: true as const,
  formalModelSourcePathRestrictedToProjectAssets: true as const,
  ownsTickDrivenThreeVfxExecutor: true as const,
  ownsStablePresentationCameraImpactComposition: true as const,
  ownsTargetCharacterImpactReadabilityComposition: true as const,
  preloadsFiveAuthoredCoreVfxTextures: true as const,
  closesFormalVfxAssetGate: false as const,
  isolatedDevelopmentUsesExplicitUnapprovedCandidatePath: true as const,
  preloaderExplicitlyOptsIntoUnapprovedCandidateLoading: true as const,
  audioExplicitlyOptsIntoUnapprovedCandidateLoading: true as const,
  vfxExplicitlyOptsIntoUnapprovedCandidateLoading: true as const,
  stageExplicitlyOptsIntoUnapprovedCandidateRendering: true as const,
  greyboxFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
