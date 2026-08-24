import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaWorldBounds,
  createLocalFollowArenaCamera,
  createOrthographicArenaCamera,
  type ArenaCameraModel,
} from '@number-strategy-jump/arena-presentation-three';
import * as THREE from 'three';
import type {
  ArenaV2FormalMatchSurfacePacketCandidateV1,
} from './arena-v2-formal-match-surface-candidate-v1.js';
import {
  ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_MAXIMUM_DISPLACEMENT_FRACTION_CANDIDATE_V1,
  ArenaV2FormalThreeCameraImpactStateCandidateV1,
  type ArenaV2FormalThreeCameraImpactResolutionCandidateV1,
} from './arena-v2-formal-three-camera-impact-candidate-v1.js';

export const ARENA_V2_FORMAL_THREE_CAMERA_STATE_CANDIDATE_V1 = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type CameraState = typeof ARENA_V2_FORMAL_THREE_CAMERA_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_THREE_CAMERA_STATE_CANDIDATE_V1
];
type SyncFunction = (...args: readonly unknown[]) => unknown;

const OPTION_KEYS = new Set(['camera', 'viewportProvider']);
const VIEWPORT_KEYS = new Set(['width', 'height', 'pixelRatio', 'safeArea']);
const CAMERA_IMPACT_EPOCH_PREFIX = 'arena-v2.formal-three.camera-impact.epoch';

function dataField(source: object, key: string, name: string, required = true): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${key}缺失。`);
  }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function syncFunction(value: unknown, name: string): SyncFunction {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncFunction;
}

function viewport(value: unknown): Readonly<{
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly safeArea: null;
}> {
  const source = assertPlainRecord(value, 'Arena V2 formal Three camera viewport');
  assertKnownKeys(source, VIEWPORT_KEYS, 'Arena V2 formal Three camera viewport');
  const width = dataField(source, 'width', 'Arena V2 formal Three camera viewport');
  const height = dataField(source, 'height', 'Arena V2 formal Three camera viewport');
  const pixelRatio = dataField(
    source,
    'pixelRatio',
    'Arena V2 formal Three camera viewport',
    false,
  ) ?? 1;
  if (
    typeof width !== 'number'
    || !Number.isFinite(width)
    || width <= 0
    || typeof height !== 'number'
    || !Number.isFinite(height)
    || height <= 0
    || typeof pixelRatio !== 'number'
    || !Number.isFinite(pixelRatio)
    || pixelRatio <= 0
  ) throw new RangeError('Arena V2 formal Three camera viewport必须是有限正尺寸。');
  return Object.freeze({ width, height, pixelRatio, safeArea: null });
}

function applyCameraModel(camera: THREE.OrthographicCamera, model: ArenaCameraModel): void {
  camera.left = model.frustum.left;
  camera.right = model.frustum.right;
  camera.top = model.frustum.top;
  camera.bottom = model.frustum.bottom;
  camera.near = model.near;
  camera.far = model.far;
  camera.zoom = 1;
  camera.position.set(-model.position.x, model.position.y, model.position.z);
  camera.up.set(0, 1, 0);
  camera.lookAt(-model.target.x, model.target.y, model.target.z);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function reducedMotionFromPacket(packet: ArenaV2FormalMatchSurfacePacketCandidateV1): boolean {
  const hud = assertPlainRecord(packet.hud, 'Arena V2 formal Three camera HUD');
  const preferences = assertPlainRecord(
    dataField(hud, 'presentationPreferences', 'Arena V2 formal Three camera HUD'),
    'Arena V2 formal Three camera HUD.presentationPreferences',
  );
  const reducedMotion = dataField(
    preferences,
    'reducedMotion',
    'Arena V2 formal Three camera HUD.presentationPreferences',
  );
  if (typeof reducedMotion !== 'boolean') {
    throw new TypeError('Arena V2 formal Three camera reducedMotion必须是boolean。');
  }
  return reducedMotion;
}

function applyCameraImpact(
  camera: THREE.OrthographicCamera,
  model: ArenaCameraModel,
  resolution: ArenaV2FormalThreeCameraImpactResolutionCandidateV1,
): void {
  const verticalSpan = model.frustum.top - model.frustum.bottom;
  if (!Number.isFinite(verticalSpan) || verticalSpan <= 0) {
    throw new RangeError('Arena V2 formal Three camera基础垂直视野无效。');
  }
  const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  const offset = new THREE.Vector3();
  for (const sample of resolution.samples) {
    let right: number;
    let up: number;
    if (sample.direction.kind === 'world') {
      const world = new THREE.Vector3(-sample.direction.x, 0, sample.direction.z).normalize();
      right = world.dot(cameraRight);
      up = world.dot(cameraUp);
    } else {
      right = sample.direction.right;
      up = sample.direction.up;
    }
    const projectedLength = Math.hypot(right, up);
    if (!Number.isFinite(projectedLength) || projectedLength <= 1e-7) {
      throw new RangeError(`Arena V2 formal Three camera impact ${sample.sourceEventId}方向无法投影。`);
    }
    const distance = sample.displacementFraction * verticalSpan;
    offset.addScaledVector(cameraRight, (right / projectedLength) * distance);
    offset.addScaledVector(cameraUp, (up / projectedLength) * distance);
  }
  const maximumOffset = verticalSpan
    * ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_MAXIMUM_DISPLACEMENT_FRACTION_CANDIDATE_V1;
  if (offset.length() > maximumOffset) offset.setLength(maximumOffset);
  const target = new THREE.Vector3(-model.target.x, model.target.y, model.target.z).add(offset);
  camera.position.add(offset);
  camera.lookAt(target);
  camera.zoom = 1 + resolution.zoomFraction;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function matchPacket(value: unknown): ArenaV2FormalMatchSurfacePacketCandidateV1 {
  const source = assertPlainRecord(value, 'Arena V2 formal Three camera packet');
  if (source.schemaVersion !== 1 || source.status !== 'production-unreachable') {
    throw new RangeError('Arena V2 formal Three camera只接受V1正式packet。');
  }
  return source as unknown as ArenaV2FormalMatchSurfacePacketCandidateV1;
}

export class ArenaV2FormalThreeCameraControllerCandidateV1 {
  readonly #camera: THREE.OrthographicCamera;
  readonly #viewportProvider: SyncFunction;
  readonly #cameraImpacts: ArenaV2FormalThreeCameraImpactStateCandidateV1;
  #state: CameraState = 'active';
  #lastModel: ArenaCameraModel | null = null;
  #lastImpactTick: number | null = null;
  #lastImpactReducedMotion = false;
  #cameraImpactEpochOrdinal = 0;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #cleanupStarted = false;
  #cameraImpactsCleared = false;
  #baseCameraRestored = false;
  #cameraImpactsDisposed = false;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal Three camera options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Three camera options');
    for (const key of OPTION_KEYS) dataField(source, key, 'Arena V2 formal Three camera options');
    if (!(source.camera instanceof THREE.OrthographicCamera)) {
      throw new TypeError('Arena V2 formal Three camera需要OrthographicCamera。');
    }
    this.#camera = source.camera;
    this.#viewportProvider = syncFunction(
      source.viewportProvider,
      'Arena V2 formal Three camera viewportProvider',
    );
    this.#cameraImpacts = new ArenaV2FormalThreeCameraImpactStateCandidateV1(
      `${CAMERA_IMPACT_EPOCH_PREFIX}.0`,
    );
  }

  get state(): CameraState {
    return this.#runSynchronousOperation('state-read', () => this.#state);
  }
  get lastModel(): ArenaCameraModel | null {
    return this.#runSynchronousOperation('last-model-read', () => this.#lastModel);
  }

  getCameraImpactEpochId(): string {
    this.#assertUsable('Arena V2 formal Three camera impact epoch');
    return this.#runSynchronousOperation(
      'impact-epoch-read',
      () => {
        const epochId = this.#cameraImpacts.epochId;
        this.#assertCurrentOperationCommit();
        return epochId;
      },
    );
  }

  presentCameraImpact(value: unknown): void {
    this.#assertUsable('Arena V2 formal Three camera impact present');
    this.#runSynchronousOperation('Arena V2 formal Three camera impact present', () => {
      if (this.#state !== 'active') {
        throw new Error('Arena V2 formal Three camera暂停时拒绝新镜头冲击。');
      }
      this.#cameraImpacts.present(value);
      this.#assertCurrentOperationCommit();
    });
  }

  removeCameraImpact(sourceEventId: unknown): void {
    this.#assertNoOperation('Arena V2 formal Three camera impact remove');
    if (this.#state === 'disposed') return;
    this.#assertUsable('Arena V2 formal Three camera impact remove');
    this.#runSynchronousOperation('Arena V2 formal Three camera impact remove', () => {
      this.#cameraImpacts.remove(sourceEventId);
      this.#assertCurrentOperationCommit();
      this.#reapplyCurrentCameraImpacts();
    });
  }

  clearCameraImpacts(): void {
    this.#assertNoOperation('Arena V2 formal Three camera impact clear');
    if (this.#state === 'disposed') return;
    this.#assertUsable('Arena V2 formal Three camera impact clear');
    this.#runSynchronousOperation('Arena V2 formal Three camera impact clear', () => {
      this.#advanceCameraImpactEpoch();
      this.#restoreBaseCamera();
    });
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('Arena V2 formal Three camera缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #assertUsable(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝当前状态${this.#state}。`);
    }
    if (this.#cleanupStarted) throw new Error(`${operation}拒绝清理中的相机。`);
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failureValue !== reentryError
        ? new AggregateError([failureValue, reentryError], `${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #cleanupOwnedResources(): readonly unknown[] {
    const errors: unknown[] = [];
    if (!this.#cameraImpactsCleared) {
      try {
        this.#cameraImpacts.clear();
        this.#assertCurrentOperationCommit();
        this.#lastImpactTick = null;
        this.#lastImpactReducedMotion = false;
        this.#cameraImpactsCleared = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (this.#cameraImpactsCleared && !this.#baseCameraRestored) {
      try {
        this.#restoreBaseCamera();
        this.#assertCurrentOperationCommit();
        this.#baseCameraRestored = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (this.#baseCameraRestored && !this.#cameraImpactsDisposed) {
      try {
        this.#cameraImpacts.dispose();
        this.#assertCurrentOperationCommit();
        this.#cameraImpactsDisposed = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
      }
    }
    if (this.#baseCameraRestored && this.#cameraImpactsDisposed) this.#lastModel = null;
    return Object.freeze(errors);
  }

  #advanceCameraImpactEpoch(): void {
    if (this.#cameraImpactEpochOrdinal >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError('Arena V2 formal Three camera impact epoch已耗尽。');
    }
    const nextOrdinal = this.#cameraImpactEpochOrdinal + 1;
    this.#cameraImpacts.clear(
      `${CAMERA_IMPACT_EPOCH_PREFIX}.${nextOrdinal}`,
    );
    this.#assertCurrentOperationCommit();
    this.#cameraImpactEpochOrdinal = nextOrdinal;
    this.#lastImpactTick = null;
    this.#lastImpactReducedMotion = false;
  }

  #restoreBaseCamera(): void {
    if (this.#lastModel !== null) {
      applyCameraModel(this.#camera, this.#lastModel);
      this.#assertCurrentOperationCommit();
      return;
    }
    this.#camera.zoom = 1;
    this.#camera.updateProjectionMatrix();
    this.#camera.updateMatrixWorld(true);
    this.#assertCurrentOperationCommit();
  }

  #reapplyCurrentCameraImpacts(): void {
    this.#restoreBaseCamera();
    if (this.#lastModel === null || this.#lastImpactTick === null) return;
    const impact = this.#cameraImpacts.resolve(
      this.#lastImpactTick,
      this.#lastImpactReducedMotion,
    );
    this.#assertCurrentOperationCommit();
    applyCameraImpact(this.#camera, this.#lastModel, impact);
    this.#assertCurrentOperationCommit();
  }

  sync(value: unknown): ArenaCameraModel {
    this.#assertUsable('Arena V2 formal Three camera sync');
    if (this.#state === 'paused') throw new Error('Arena V2 formal Three camera暂停时不能同步。');
    return this.#runSynchronousOperation('Arena V2 formal Three camera sync', () => {
      const packet = matchPacket(value);
      const viewportValue = this.#viewportProvider();
      this.#assertCurrentOperationCommit();
      rejectThenable(viewportValue, 'Arena V2 formal Three camera viewportProvider');
      const size = viewport(viewportValue);
      const worldBounds = createArenaWorldBounds(packet.scene.world.map.surfaces);
      const local = packet.scene.world.participants.find(({ id }) => (
        id === packet.scene.localParticipantId
      ));
      if (local === undefined) throw new RangeError('Arena V2 formal Three camera缺少本地玩家。');
      const modeKind = packet.scene.world.modeProjection.state.kind;
      const followsLocal = modeKind === 'race' || modeKind === 'survival';
      const model = followsLocal
        ? createLocalFollowArenaCamera({
          viewport: size,
          worldBounds,
          target: Object.freeze({ x: local.position.x, z: local.position.z }),
        })
        : createOrthographicArenaCamera({ viewport: size, worldBounds });
      applyCameraModel(this.#camera, model);
      this.#assertCurrentOperationCommit();
      const reducedMotion = reducedMotionFromPacket(packet);
      const impact = this.#cameraImpacts.resolve(packet.scene.source.tick, reducedMotion);
      this.#assertCurrentOperationCommit();
      applyCameraImpact(this.#camera, model, impact);
      this.#assertCurrentOperationCommit();
      this.#lastModel = model;
      this.#lastImpactTick = packet.scene.source.tick;
      this.#lastImpactReducedMotion = reducedMotion;
      return model;
    });
  }

  pause(): void {
    this.#assertUsable('Arena V2 formal Three camera pause');
    this.#runSynchronousOperation('Arena V2 formal Three camera pause', () => {
      this.#advanceCameraImpactEpoch();
      this.#restoreBaseCamera();
      this.#state = 'paused';
    });
  }

  resume(): void {
    this.#assertUsable('Arena V2 formal Three camera resume');
    this.#runSynchronousOperation('Arena V2 formal Three camera resume', () => {
      this.#state = 'active';
    });
  }

  reset(): void {
    this.#assertUsable('Arena V2 formal Three camera reset');
    this.#runSynchronousOperation('Arena V2 formal Three camera reset', () => {
      this.#advanceCameraImpactEpoch();
      this.#restoreBaseCamera();
      this.#lastModel = null;
    });
  }

  dispose(): void {
    this.#assertNoOperation('Arena V2 formal Three camera dispose');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('Arena V2 formal Three camera dispose', () => {
      this.#cleanupStarted = true;
      const errors = [...this.#cleanupOwnedResources()];
      if (this.#baseCameraRestored && this.#cameraImpactsDisposed) {
        this.#state = 'disposed';
      } else {
        this.#state = 'failed';
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Three camera清理不完整。');
      }
    });
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runSynchronousOperation('snapshot-read', () => {
      const cameraImpact = this.#cameraImpacts.getSnapshot();
      this.#assertCurrentOperationCommit();
      return Object.freeze({
        state: this.#state,
        hasLastModel: this.#lastModel !== null,
        lastImpactTick: this.#lastImpactTick,
        lastImpactReducedMotion: this.#lastImpactReducedMotion,
        cleanupWatermarks: Object.freeze({
          cameraImpactsCleared: this.#cameraImpactsCleared,
          baseCameraRestored: this.#baseCameraRestored,
          cameraImpactsDisposed: this.#cameraImpactsDisposed,
        }),
        cameraImpact,
      });
    });
  }
}

export const ARENA_V2_FORMAL_THREE_CAMERA_CONTROLLER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  duelUsesFullMapCamera: true as const,
  raceAndSurvivalFollowLocalParticipant: true as const,
  stableAuthorityInputBasis: true as const,
  consumesStablePresentationCameraImpactCommands: true as const,
  cameraImpactMaximumDisplacementFraction:
    ARENA_V2_FORMAL_THREE_CAMERA_IMPACT_MAXIMUM_DISPLACEMENT_FRACTION_CANDIDATE_V1,
  cameraImpactUsesWallClock: false as const,
  cameraImpactUsesRandom: false as const,
  ownsRuleOrMatchAuthority: false as const,
  terminalDisposalDoesNotAllocateEpoch: true as const,
  cleanupRetriesOnlyIncompleteOwnedResources: true as const,
  allPublicLifecycleCommitsGuarded: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  swallowedCameraOrImpactReentryFailsClosed: true as const,
  successfulStateAndModelCommitsAfterChildOperationsOnly: true as const,
  terminalCleanupUsesSameStickyOperationGuard: true as const,
  impactStateReleaseWaitsForBaseCameraRestore: true as const,
  terminalCleanupWatermarks: Object.freeze([
    'camera-impacts-cleared',
    'base-camera-restored',
    'camera-impact-owner-disposed',
  ] as const),
  ordinaryCleanupFailureStopsBeforeLaterCameraOwners: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  cameraImpactAndViewportCallbacksCheckedBeforeStateCommit: true as const,
  cameraWritesCheckedBeforeModelPublication: true as const,
  cleanupReentryRetainsCurrentAndLaterCameraOwners: true as const,
  validationStatus: 'not-run' as const,
});
