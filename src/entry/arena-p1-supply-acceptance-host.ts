import { BOT_PROFILE_REGISTRY } from '@number-strategy-jump/arena-bot';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  ArenaP1SupplyAcceptanceRuntime,
  type ArenaP1SupplyAcceptanceHostCommitV1,
  type ArenaP1SupplyAcceptanceInputSampleV1,
  type ArenaP1SupplyAcceptanceRuntimeDebugSnapshotV1,
} from './arena-p1-supply-acceptance-runtime.js';

type UnknownMethod = (...args: unknown[]) => unknown;

interface CanvasLike {
  width?: unknown;
  height?: unknown;
  getContext(...args: unknown[]): unknown;
}

interface Canvas2DLike {
  canvas?: unknown;
  fillStyle?: unknown;
  strokeStyle?: unknown;
  font?: unknown;
  lineWidth?: unknown;
  textAlign?: unknown;
  textBaseline?: unknown;
  globalAlpha?: unknown;
  clearRect(...args: unknown[]): unknown;
  fillRect(...args: unknown[]): unknown;
  fillText(...args: unknown[]): unknown;
  beginPath(...args: unknown[]): unknown;
  arc(...args: unknown[]): unknown;
  fill(...args: unknown[]): unknown;
  stroke(...args: unknown[]): unknown;
}

type CanvasMethodName =
  | 'clearRect'
  | 'fillRect'
  | 'fillText'
  | 'beginPath'
  | 'arc'
  | 'fill'
  | 'stroke';

interface CapturedCanvas2D {
  readonly owner: Canvas2DLike;
  readonly methods: Readonly<Record<CanvasMethodName, UnknownMethod>>;
}

interface ListenerOwner {
  active: boolean;
  readonly cleanup: () => void;
}

interface FrameOwner {
  active: boolean;
  frameId: number | null;
  exposedToRuntime: boolean;
}

type PlatformPrimitives = Readonly<Pick<
  ArenaPlatformContract,
  'id' | 'createCanvas' | 'getViewport' | 'requestFrame' | 'cancelFrame'
  | 'onResize' | 'onShow' | 'onHide'
>>;

interface HostOptions {
  readonly platformId: 'web' | 'wechat' | 'douyin';
  readonly announce?: (message: string) => void;
  readonly updateStatus?: (message: string, failed: boolean) => void;
  readonly clearDom?: () => void;
}

export interface ArenaP1SupplyAcceptanceHostResourceSnapshotV1 {
  readonly schemaVersion: 1;
  readonly platformId: 'web' | 'wechat' | 'douyin';
  readonly frameLoopCount: number;
  readonly asyncCallbackCount: number;
  readonly listenerCount: number;
  readonly particleCount: number;
  readonly voiceCount: number;
  readonly gpuOwned: boolean;
  readonly domOwned: boolean;
  readonly reentryCount: number;
}

export interface ArenaP1SupplyAcceptanceHostResourceBundle {
  readonly hostResourcePort: Readonly<{
    sampleInput(value: unknown): unknown;
    commit(value: unknown): void;
    startFrameLoop(value: unknown): unknown;
    cancelFrameLoop(value: unknown): void;
    destroyListeners(): void;
    destroyParticles(): void;
    destroyVoices(): void;
    destroyGpu(): void;
    destroyDom(): void;
    destroyAsyncCallbacks(): void;
  }>;
  setShutdown(callback: (() => void) | null): void;
  destroyAll(): void;
  getResourceSnapshot(): ArenaP1SupplyAcceptanceHostResourceSnapshotV1;
}

export interface ArenaP1SupplyAcceptanceEntryHandle {
  destroy(): void;
  getRuntimeDebugSnapshot(): ArenaP1SupplyAcceptanceRuntimeDebugSnapshotV1;
  getHostResourceSnapshot(): ArenaP1SupplyAcceptanceHostResourceSnapshotV1;
}

const NATIVE_PROMISE_THEN = Promise.prototype.then;
const HOST_OPTION_KEYS = new Set(['platformId', 'announce', 'updateStatus', 'clearDom']);
const MAX_CANVAS_SIZE = 4096;
const MAX_PROTOTYPE_DEPTH = 64;
const PLATFORM_IDS = new Set(['web', 'wechat', 'douyin']);
const CANVAS_METHOD_NAMES = Object.freeze([
  'clearRect',
  'fillRect',
  'fillText',
  'beginPath',
  'arc',
  'fill',
  'stroke',
] as const);

const SUPPLY_SPAWN_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'p1-supply-acceptance-left',
    position: Object.freeze({ x: -3, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'p1-supply-acceptance-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'p1-supply-acceptance-right',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);

function safeError(value: unknown, message: string): Error {
  const error = new Error(message, { cause: value }) as Error & { opaqueCause?: unknown };
  Object.defineProperty(error, 'opaqueCause', {
    configurable: false,
    enumerable: false,
    writable: false,
    value,
  });
  return error;
}

function rejectThenable(value: unknown, name: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const promiseBrandSentinel = Object.freeze({});
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    throw promiseBrandSentinel;
  } catch (error) {
    if (error === promiseBrandSentinel) throw new TypeError(`${name} 必须同步完成。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  for (let depth = 0; current !== null; depth += 1) {
    if (depth >= MAX_PROTOTYPE_DEPTH || visited.has(current)) {
      throw new TypeError(`${name} thenable 原型链无效。`);
    }
    visited.add(current);
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    } catch (cause) {
      throw new TypeError(`${name} thenable descriptor 检查失败。`, { cause });
    }
    if (descriptor !== undefined) throw new TypeError(`${name} 不得返回 thenable。`);
    try {
      current = Object.getPrototypeOf(current) as object | null;
    } catch (cause) {
      throw new TypeError(`${name} thenable 原型检查失败。`, { cause });
    }
  }
}

function callSync<Args extends unknown[]>(
  method: (...args: Args) => unknown,
  owner: unknown,
  name: string,
  ...args: Args
): unknown {
  const result = Reflect.apply(method, owner, args);
  rejectThenable(result, name);
  return result;
}

function dataProperty(value: unknown, key: string, name: string): unknown {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const visited = new Set<object>();
  let current: object | null = value as object;
  for (let depth = 0; current !== null; depth += 1) {
    if (depth >= MAX_PROTOTYPE_DEPTH || visited.has(current)) {
      throw new TypeError(`${name}.${key} 原型链无效。`);
    }
    visited.add(current);
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(current, key);
    } catch (cause) {
      throw new TypeError(`${name}.${key} descriptor 无法读取。`, { cause });
    }
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${name}.${key} 必须是数据字段。`);
      }
      return descriptor.value;
    }
    try {
      current = Object.getPrototypeOf(current) as object | null;
    } catch (cause) {
      throw new TypeError(`${name}.${key} 原型无法读取。`, { cause });
    }
  }
  throw new TypeError(`${name}.${key} 缺失。`);
}

function method(value: unknown, key: string, name: string): UnknownMethod {
  const candidate = dataProperty(value, key, name);
  if (typeof candidate !== 'function') throw new TypeError(`${name}.${key} 必须是函数。`);
  return candidate as UnknownMethod;
}

function capturedMethod<Args extends unknown[], Result>(
  owner: unknown,
  key: string,
  name: string,
): (...args: Args) => Result {
  const captured = method(owner, key, name);
  return (...args: Args): Result => Reflect.apply(captured, owner, args) as Result;
}

function capturePlatformPrimitives(value: ArenaPlatformContract): PlatformPrimitives {
  const id = dataProperty(value, 'id', 'P1 supply platform');
  if (typeof id !== 'string' || !PLATFORM_IDS.has(id)) {
    throw new TypeError('P1 supply platform id 必须精确为 web|wechat|douyin。');
  }
  return Object.freeze({
    id,
    createCanvas: capturedMethod<[], unknown>(value, 'createCanvas', `P1 supply ${id} platform`),
    getViewport: capturedMethod<[], ReturnType<ArenaPlatformContract['getViewport']>>(
      value,
      'getViewport',
      `P1 supply ${id} platform`,
    ),
    requestFrame: capturedMethod<
      Parameters<ArenaPlatformContract['requestFrame']>,
      ReturnType<ArenaPlatformContract['requestFrame']>
    >(value, 'requestFrame', `P1 supply ${id} platform`),
    cancelFrame: capturedMethod<
      Parameters<ArenaPlatformContract['cancelFrame']>,
      ReturnType<ArenaPlatformContract['cancelFrame']>
    >(value, 'cancelFrame', `P1 supply ${id} platform`),
    onResize: capturedMethod<
      Parameters<ArenaPlatformContract['onResize']>,
      ReturnType<ArenaPlatformContract['onResize']>
    >(value, 'onResize', `P1 supply ${id} platform`),
    onShow: capturedMethod<
      Parameters<ArenaPlatformContract['onShow']>,
      ReturnType<ArenaPlatformContract['onShow']>
    >(value, 'onShow', `P1 supply ${id} platform`),
    onHide: capturedMethod<
      Parameters<ArenaPlatformContract['onHide']>,
      ReturnType<ArenaPlatformContract['onHide']>
    >(value, 'onHide', `P1 supply ${id} platform`),
  });
}

function normalizeHostOptions(value: HostOptions): HostOptions {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('P1 supply host options 必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('P1 supply host options 必须是普通对象。');
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !HOST_OPTION_KEYS.has(key)) {
      throw new TypeError(`P1 supply host options 不支持字段 ${String(key)}。`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`P1 supply host options.${key} 必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  if (typeof result.platformId !== 'string' || result.platformId.length === 0) {
    throw new RangeError('P1 supply host platformId 无效。');
  }
  for (const key of ['announce', 'updateStatus', 'clearDom'] as const) {
    if (result[key] !== undefined && typeof result[key] !== 'function') {
      throw new TypeError(`P1 supply host options.${key} 必须是函数。`);
    }
  }
  return Object.freeze(result) as unknown as HostOptions;
}

function canvasSize(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return normalized >= 1
    ? Math.min(normalized, MAX_CANVAS_SIZE)
    : fallback;
}

function context2d(canvas: CanvasLike, platformId: string): CapturedCanvas2D {
  const getContext = method(canvas, 'getContext', `${platformId} acceptance canvas`);
  const candidate = callSync(getContext, canvas, `${platformId} acceptance canvas.getContext`, '2d');
  if (candidate === null || typeof candidate !== 'object') {
    throw new Error(`[${platformId}] P1 supply acceptance 缺少 Canvas 2D context。`);
  }
  const methods = Object.fromEntries(CANVAS_METHOD_NAMES.map((key) => [
    key,
    method(candidate, key, `${platformId} acceptance CanvasRenderingContext2D`),
  ])) as Record<CanvasMethodName, UnknownMethod>;
  return Object.freeze({
    owner: candidate as Canvas2DLike,
    methods: Object.freeze(methods),
  });
}

function combineErrors(primary: unknown, cleanupErrors: readonly unknown[], message: string): Error {
  const normalized = cleanupErrors.map((error) => safeError(error, `${message} cleanup 失败。`));
  if (normalized.length === 0) return safeError(primary, message);
  const result = new AggregateError([safeError(primary, message), ...normalized], message) as AggregateError & {
    originalCause?: unknown;
    cleanupCauses?: readonly unknown[];
  };
  Object.defineProperties(result, {
    originalCause: {
      configurable: false,
      enumerable: false,
      writable: false,
      value: primary,
    },
    cleanupCauses: {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.freeze([...cleanupErrors]),
    },
  });
  return result;
}

function compositionOptions(): Readonly<Record<string, unknown>> {
  const seed = 0x51a77e;
  return Object.freeze({
    seed,
    config: Object.freeze({
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: 2_400,
      hardLimitTicks: 2_500,
    }),
    supply: Object.freeze({
      supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
      spawnSpecs: Object.freeze(SUPPLY_SPAWN_SPECS.map((spec) => Object.freeze({
        ...spec,
        position: Object.freeze({ ...spec.position }),
      }))),
    }),
    bot: Object.freeze({
      participantId: 'player-2',
      difficultyId: 'normal',
      behaviorSeed: 0x12003456,
      personalitySeed: 0x5600789a,
      profileRegistry: BOT_PROFILE_REGISTRY,
    }),
    playerParticipantId: 'player-1',
    publicMatchInfo: Object.freeze({
      matchSeed: seed,
      opponent: Object.freeze({
        id: 'p1-supply-acceptance-bot',
        displayName: 'P1 Supply Acceptance Bot',
        portraitKey: 'p1-supply-acceptance-portrait',
        appearanceKey: 'p1-supply-acceptance-appearance',
      }),
    }),
  });
}

class ArenaP1SupplyAcceptancePlatformHost {
  readonly #platform: PlatformPrimitives;
  readonly #options: HostOptions;
  #canvas: CanvasLike | null = null;
  #context: Canvas2DLike | null = null;
  #contextMethods: Readonly<Record<CanvasMethodName, UnknownMethod>> | null = null;
  #frameOwner: FrameOwner | null = null;
  readonly #listeners: ListenerOwner[] = [];
  readonly #asyncCallbacks = new Set<() => void>();
  readonly #particles: Array<Readonly<{ x: number; y: number }>> = [];
  readonly #voices = new Set<unknown>();
  #lastCommit: ArenaP1SupplyAcceptanceHostCommitV1 | null = null;
  #shutdown: (() => void) | null = null;
  #gpuOwned = false;
  #domOwned = false;
  #canvasWidth = 1;
  #canvasHeight = 1;
  #inOperation = false;
  #reentryCount = 0;
  #shutdownTriggered = false;

  constructor(platform: ArenaPlatformContract, optionsValue: HostOptions) {
    this.#platform = capturePlatformPrimitives(platform);
    this.#options = normalizeHostOptions(optionsValue);
    if (this.#options.platformId !== this.#platform.id) {
      throw new Error('P1 supply host options 与 platform identity 不一致。');
    }
    try {
      const canvasCandidate = callSync(
        this.#platform.createCanvas,
        this.#platform,
        `${this.#platform.id} createCanvas`,
      );
      if (canvasCandidate === null || typeof canvasCandidate !== 'object') {
        throw new TypeError(`[${this.#platform.id}] P1 supply acceptance canvas 无效。`);
      }
      this.#canvas = canvasCandidate as CanvasLike;
      this.#domOwned = true;
      const capturedContext = context2d(this.#canvas, this.#options.platformId);
      this.#context = capturedContext.owner;
      this.#contextMethods = capturedContext.methods;
      this.#gpuOwned = true;
      this.#captureListener(this.#platform.onResize, () => undefined, 'resize');
      this.#captureListener(this.#platform.onShow, () => undefined, 'show');
      this.#captureListener(this.#platform.onHide, () => this.#requestShutdown(), 'hide');
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      try { this.destroyAll(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      throw combineErrors(error, cleanupErrors, 'P1 supply host 构造失败且回滚不完整。');
    }
  }

  #captureListener(
    register: (callback: () => void) => () => void,
    callback: () => void,
    name: string,
  ): void {
    const cleanup = callSync(
      register,
      this.#platform,
      `${this.#options.platformId} acceptance ${name} listener`,
      callback,
    );
    if (typeof cleanup !== 'function') {
      throw new TypeError(`${this.#options.platformId} acceptance ${name} listener 必须返回 cleanup。`);
    }
    this.#listeners.push({ active: true, cleanup: cleanup as () => void });
  }

  #enterOperation(): number {
    if (this.#inOperation) {
      this.#reentryCount += 1;
      throw new Error('P1 supply host 检测到重入调用。');
    }
    this.#inOperation = true;
    return this.#reentryCount;
  }

  #leaveOperation(): void {
    this.#inOperation = false;
  }

  #assertNoReentry(epoch: number): void {
    if (epoch !== this.#reentryCount) throw new Error('P1 supply host 检测到被吞掉的重入调用。');
  }

  #run<T>(operation: () => T): T {
    const epoch = this.#enterOperation();
    try {
      const result = operation();
      this.#assertNoReentry(epoch);
      return result;
    } catch (error) {
      if (epoch !== this.#reentryCount) {
        throw combineErrors(
          new Error('P1 supply host 检测到被吞掉的重入调用。'),
          [error],
          'P1 supply host 重入后失败。',
        );
      }
      throw error;
    } finally {
      this.#leaveOperation();
    }
  }

  #contextCall(name: CanvasMethodName, ...args: unknown[]): void {
    const context = this.#context;
    const methods = this.#contextMethods;
    if (context === null || methods === null) throw new Error('P1 supply host GPU 已释放。');
    callSync(methods[name], context, `P1 supply Canvas2D.${name}`, ...args);
  }

  #draw(commit: ArenaP1SupplyAcceptanceHostCommitV1): void {
    if (commit === null || typeof commit !== 'object' || commit.schemaVersion !== 1) {
      throw new TypeError('P1 supply host commit schema 无效。');
    }
    const { view } = commit;
    if (!Array.isArray(view.markers) || !Array.isArray(view.cues)
      || !Array.isArray(commit.terminalCuePlacements)) {
      throw new TypeError('P1 supply host commit collections 无效。');
    }
    const viewport = callSync(
      this.#platform.getViewport,
      this.#platform,
      `${this.#options.platformId} acceptance getViewport`,
    ) as ReturnType<ArenaPlatformContract['getViewport']>;
    const width = canvasSize(dataProperty(viewport, 'width', 'P1 supply viewport'), 390);
    const height = canvasSize(dataProperty(viewport, 'height', 'P1 supply viewport'), 844);
    const canvas = this.#canvas;
    if (canvas === null) throw new Error('P1 supply host surface 已释放。');
    canvas.width = width;
    canvas.height = height;
    this.#canvasWidth = width;
    this.#canvasHeight = height;
    const context = this.#context;
    if (context === null) throw new Error('P1 supply host GPU 已释放。');
    context.fillStyle = '#07111f';
    this.#contextCall('fillRect', 0, 0, width, height);
    context.fillStyle = '#dff8ff';
    context.font = '700 18px system-ui, sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    this.#contextCall('fillText', 'Arena · Supply Acceptance', 20, 20);
    context.fillStyle = '#8ba4ba';
    context.font = '13px ui-monospace, monospace';
    this.#contextCall(
      'fillText',
      `tick ${view.snapshotTick} · ${view.status} · markers ${view.markers.length}`,
      20,
      50,
    );
    const centerX = width / 2;
    const groundY = Math.max(120, height * 0.58);
    const scale = Math.max(20, Math.min(width / 12, 72));
    for (const marker of view.markers) {
      const x = centerX + marker.position.x * scale;
      const y = groundY - marker.position.z * scale;
      context.fillStyle = '#5ce1e6';
      this.#contextCall('beginPath');
      this.#contextCall('arc', x, y, 13, 0, Math.PI * 2);
      this.#contextCall('fill');
      context.fillStyle = '#dff8ff';
      context.font = '12px system-ui, sans-serif';
      context.textAlign = 'center';
      this.#contextCall('fillText', `${marker.labelSeconds}s`, x, y + 20);
    }
    this.#particles.length = 0;
    for (const placement of commit.terminalCuePlacements) {
      if (placement.originKind === 'spatial' && placement.position !== null) {
        const x = centerX + placement.position.x * scale;
        const y = groundY - placement.position.z * scale;
        this.#particles.push(Object.freeze({ x, y }));
        context.strokeStyle = '#ffcf5c';
        context.lineWidth = 3;
        this.#contextCall('beginPath');
        this.#contextCall('arc', x, y, 22, 0, Math.PI * 2);
        this.#contextCall('stroke');
      } else {
        if (this.#options.announce !== undefined) {
          callSync(
            this.#options.announce,
            this.#options,
            'P1 supply accessible announcement',
            '供给状态已更新。',
          );
        }
      }
    }
    if (view.cues.length > 0) {
      context.fillStyle = '#ffcf5c';
      context.font = '700 14px system-ui, sans-serif';
      context.textAlign = 'left';
      this.#contextCall('fillText', `供给更新 · ${view.cues.at(-1)?.kind ?? 'unknown'}`, 20, height - 46);
    }
    this.#lastCommit = commit;
    if (this.#options.updateStatus !== undefined) {
      callSync(
        this.#options.updateStatus,
        this.#options,
        'P1 supply status update',
        `运行中 · tick ${view.snapshotTick}`,
        false,
      );
    }
  }

  #scheduleFrame(owner: FrameOwner, callback: () => void): void {
    let synchronousDispatch = false;
    let scheduling = true;
    const frameId = callSync(
      this.#platform.requestFrame,
      this.#platform,
      `${this.#options.platformId} acceptance requestFrame`,
      () => {
        if (scheduling) {
          synchronousDispatch = true;
          return;
        }
        if (!owner.active || this.#frameOwner !== owner) return;
        owner.frameId = null;
        try {
          const result = callback();
          rejectThenable(result, 'P1 supply frame callback');
          if (owner.active && this.#frameOwner === owner) this.#scheduleFrame(owner, callback);
        } catch (error) {
          owner.active = false;
          const cleanupErrors: unknown[] = [];
          try { this.#requestShutdown(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
          throw combineErrors(error, cleanupErrors, 'P1 supply frame loop 失败并关闭。');
        }
      },
    );
    scheduling = false;
    if (!Number.isSafeInteger(frameId) || (frameId as number) < 1) {
      throw new TypeError(`${this.#options.platformId} acceptance requestFrame token 无效。`);
    }
    owner.frameId = frameId as number;
    if (synchronousDispatch) {
      owner.active = false;
      try {
        callSync(
          this.#platform.cancelFrame,
          this.#platform,
          `${this.#options.platformId} acceptance synchronous frame rollback`,
          owner.frameId,
        );
        owner.frameId = null;
      } catch (error) {
        throw combineErrors(
          new Error(`${this.#options.platformId} acceptance requestFrame 不得同步调用 callback。`),
          [error],
          `${this.#options.platformId} acceptance synchronous frame 回滚失败。`,
        );
      }
      throw new Error(`${this.#options.platformId} acceptance requestFrame 不得同步调用 callback。`);
    }
  }

  #requestShutdown(): void {
    if (this.#shutdownTriggered) return;
    const shutdown = this.#shutdown;
    if (shutdown === null) return;
    this.#shutdownTriggered = true;
    callSync(shutdown, undefined, 'P1 supply captured shutdown');
  }

  #cancelFrameOwner(owner: FrameOwner): void {
    owner.active = false;
    if (owner.frameId !== null) {
      callSync(
        this.#platform.cancelFrame,
        this.#platform,
        `${this.#options.platformId} acceptance cancelFrame`,
        owner.frameId,
      );
    }
    owner.frameId = null;
    if (this.#frameOwner === owner) this.#frameOwner = null;
  }

  readonly hostResourcePort = Object.freeze({
    sampleInput: (value: unknown): unknown => this.#run(() => {
      if (value === null || typeof value !== 'object') {
        throw new TypeError('P1 supply input sample 无效。');
      }
      const sample = value as ArenaP1SupplyAcceptanceInputSampleV1;
      return createNeutralInputFrame(sample.tick, sample.participantId);
    }),
    commit: (value: unknown): void => this.#run(() => {
      this.#draw(value as ArenaP1SupplyAcceptanceHostCommitV1);
    }),
    startFrameLoop: (value: unknown): unknown => this.#run(() => {
      if (typeof value !== 'function') throw new TypeError('P1 supply frame callback 必须是函数。');
      if (this.#frameOwner !== null) throw new Error('P1 supply frame loop 已启动。');
      const owner: FrameOwner = { active: true, frameId: null, exposedToRuntime: false };
      this.#frameOwner = owner;
      try {
        this.#scheduleFrame(owner, value as () => void);
      } catch (error) {
        owner.active = false;
        if (owner.frameId === null) this.#frameOwner = null;
        throw error;
      }
      owner.exposedToRuntime = true;
      return owner;
    }),
    cancelFrameLoop: (value: unknown): void => this.#run(() => {
      const owner = this.#frameOwner;
      if (owner === null) return;
      if (value !== owner) throw new Error('P1 supply frame loop token 不匹配。');
      this.#cancelFrameOwner(owner);
    }),
    destroyListeners: (): void => this.#run(() => {
      this.#shutdown = null;
      const errors: unknown[] = [];
      for (const listener of [...this.#listeners].reverse()) {
        if (!listener.active) continue;
        try {
          callSync(listener.cleanup, undefined, 'P1 supply listener cleanup');
          listener.active = false;
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) throw combineErrors(errors[0], errors.slice(1), 'P1 supply listeners cleanup 失败。');
    }),
    destroyParticles: (): void => this.#run(() => {
      this.#particles.length = 0;
    }),
    destroyVoices: (): void => this.#run(() => {
      const errors: unknown[] = [];
      for (const voice of this.#voices) {
        try {
          const stop = typeof (voice as { stop?: unknown }).stop === 'function'
            ? (voice as { stop: UnknownMethod }).stop
            : null;
          const destroy = typeof (voice as { destroy?: unknown }).destroy === 'function'
            ? (voice as { destroy: UnknownMethod }).destroy
            : null;
          if (stop) callSync(stop, voice, 'P1 supply voice.stop');
          if (destroy) callSync(destroy, voice, 'P1 supply voice.destroy');
          this.#voices.delete(voice);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) throw combineErrors(errors[0], errors.slice(1), 'P1 supply voices cleanup 失败。');
    }),
    destroyGpu: (): void => this.#run(() => {
      if (!this.#gpuOwned) return;
      this.#contextCall('clearRect', 0, 0, this.#canvasWidth, this.#canvasHeight);
      this.#context = null;
      this.#contextMethods = null;
      this.#gpuOwned = false;
      this.#lastCommit = null;
    }),
    destroyDom: (): void => this.#run(() => {
      if (!this.#domOwned) return;
      if (this.#options.clearDom !== undefined) {
        callSync(this.#options.clearDom, this.#options, 'P1 supply surface cleanup');
      }
      this.#domOwned = false;
      this.#canvas = null;
    }),
    destroyAsyncCallbacks: (): void => this.#run(() => {
      const errors: unknown[] = [];
      const orphan = this.#frameOwner;
      if (orphan !== null && !orphan.exposedToRuntime) {
        try { this.#cancelFrameOwner(orphan); } catch (error) { errors.push(error); }
      }
      for (const cleanup of [...this.#asyncCallbacks]) {
        try {
          callSync(cleanup, undefined, 'P1 supply async callback cleanup');
          this.#asyncCallbacks.delete(cleanup);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) {
        throw combineErrors(errors[0], errors.slice(1), 'P1 supply async callbacks cleanup 失败。');
      }
    }),
  });

  setShutdown(callback: (() => void) | null): void {
    this.#run(() => {
      if (callback !== null && typeof callback !== 'function') {
        throw new TypeError('P1 supply shutdown callback 必须是函数或 null。');
      }
      this.#shutdown = callback;
    });
  }

  destroyAll(): void {
    const errors: unknown[] = [];
    const owner = this.#frameOwner;
    if (owner !== null) {
      try { this.hostResourcePort.cancelFrameLoop(owner); } catch (error) { errors.push(error); }
    }
    for (const methodName of [
      'destroyAsyncCallbacks',
      'destroyListeners',
      'destroyParticles',
      'destroyVoices',
      'destroyGpu',
      'destroyDom',
    ] as const) {
      try { this.hostResourcePort[methodName](); } catch (error) { errors.push(error); }
    }
    if (errors.length > 0) throw combineErrors(errors[0], errors.slice(1), 'P1 supply host cleanup 失败。');
  }

  getResourceSnapshot(): ArenaP1SupplyAcceptanceHostResourceSnapshotV1 {
    return this.#run(() => Object.freeze({
      schemaVersion: 1,
      platformId: this.#options.platformId,
      frameLoopCount: this.#frameOwner === null ? 0 : 1,
      asyncCallbackCount: this.#asyncCallbacks.size,
      listenerCount: this.#listeners.filter(({ active }) => active).length,
      particleCount: this.#particles.length,
      voiceCount: this.#voices.size,
      gpuOwned: this.#gpuOwned,
      domOwned: this.#domOwned,
      reentryCount: this.#reentryCount,
    }));
  }
}

export function createArenaP1SupplyAcceptancePlatformHostResourcePort(
  platform: ArenaPlatformContract,
  options: HostOptions,
): ArenaP1SupplyAcceptanceHostResourceBundle {
  const host = new ArenaP1SupplyAcceptancePlatformHost(platform, options);
  return Object.freeze({
    hostResourcePort: host.hostResourcePort,
    setShutdown: (callback: (() => void) | null) => host.setShutdown(callback),
    destroyAll: () => host.destroyAll(),
    getResourceSnapshot: () => host.getResourceSnapshot(),
  });
}

export function startArenaP1SupplyAcceptanceWithPlatform(
  platform: ArenaPlatformContract,
  options: HostOptions,
): ArenaP1SupplyAcceptanceEntryHandle {
  const host = createArenaP1SupplyAcceptancePlatformHostResourcePort(platform, options);
  let runtime: ArenaP1SupplyAcceptanceRuntime | null = null;
  try {
    runtime = new ArenaP1SupplyAcceptanceRuntime({
      compositionOptions: compositionOptions(),
      hostResourcePort: host.hostResourcePort,
    });
    runtime.start();
    let destroyed = false;
    const handle: ArenaP1SupplyAcceptanceEntryHandle = Object.freeze({
      destroy(): void {
        if (destroyed) return;
        runtime?.destroy();
        destroyed = true;
      },
      getRuntimeDebugSnapshot(): ArenaP1SupplyAcceptanceRuntimeDebugSnapshotV1 {
        if (runtime === null) throw new Error('P1 supply runtime 不可用。');
        return runtime.getDebugSnapshot();
      },
      getHostResourceSnapshot(): ArenaP1SupplyAcceptanceHostResourceSnapshotV1 {
        return host.getResourceSnapshot();
      },
    });
    host.setShutdown(() => handle.destroy());
    return handle;
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    if (runtime !== null) {
      try { runtime.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    }
    try { host.destroyAll(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    const failure = combineErrors(error, cleanupErrors, 'P1 supply acceptance 启动失败。') as Error & {
      hostResourceSnapshot?: ArenaP1SupplyAcceptanceHostResourceSnapshotV1;
    };
    try { failure.hostResourceSnapshot = host.getResourceSnapshot(); } catch { /* best-effort evidence */ }
    throw failure;
  }
}
