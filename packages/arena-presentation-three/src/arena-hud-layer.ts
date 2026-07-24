import {
  DEFAULT_ARENA_CONTROL_LAYOUT,
  actionButtonRadius,
} from '@number-strategy-jump/arena-presentation-runtime';
import * as THREE from 'three';
import { createThreeObjectDisposalLease, type ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { readDataArray } from './strict-data-array.js';

const VIEWPORT_KEYS = new Set<PropertyKey>(['width', 'height', 'pixelRatio', 'safeArea']);
const SAFE_AREA_KEYS = new Set<PropertyKey>(['left', 'top', 'right', 'bottom', 'width', 'height']);
const STATE_KEYS = new Set<PropertyKey>(['mode', 'mapperLabel']);
const POINT_KEYS = new Set<PropertyKey>(['x', 'y', 'pointerId']);
const CONTEXT_METHODS = Object.freeze([
  'setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo',
  'closePath', 'fill', 'stroke', 'arc', 'fillRect', 'fillText',
] as const);

type UnknownMethod = (...args: unknown[]) => unknown;
type HudContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface CanvasLike {
  width: number;
  height: number;
}

interface HudViewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly safeArea: SafeRect | null;
}

interface SafeRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

interface HudParticipant {
  readonly id: string;
  readonly status: string;
  readonly position: Readonly<{ x: number; z: number }>;
}

interface HudFrame {
  readonly source: Readonly<{ matchSeed: number }>;
  readonly phase: string;
  readonly hud: Readonly<{
    remainingSeconds: number;
    phaseLabel: string;
    local: Readonly<{ participantId: string; lives: number }>;
    opponent: Readonly<{ participantId: string; lives: number; displayName: string }>;
    action: Readonly<{ definitionId: string | null; available: boolean; label: string }>;
    result: Readonly<{ winnerId: string | null; isDraw: boolean }> | null;
  }>;
  readonly world: Readonly<{ participants: readonly HudParticipant[] }>;
}

interface RematchRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function assertRecord(value: unknown, name: string): asserts value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  assertRecord(value, name);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function ownData(value: unknown, field: PropertyKey, name: string, required = true): unknown {
  assertRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  return descriptor.value;
}

function snapshotMethod(value: unknown, name: string, methodName: string): UnknownMethod {
  assertRecord(value, name);
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`${name} 缺少 ${methodName}()。`);
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* invalid thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

function positive(value: unknown, name: string): number {
  const number = finite(value, name);
  if (number <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return number;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new RangeError(`${name} 必须是非负安全整数。`);
  return value as number;
}

function stringValue(value: unknown, name: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${name} 必须是${allowEmpty ? '' : '非空'}字符串。`);
  }
  return value;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function optionalString(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null;
  return stringValue(value, name);
}

function aggregate(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...cleanupCauses]) });
  return failure;
}

function normalizeSafeArea(value: unknown, width: number, height: number): SafeRect {
  if (value === null || value === undefined) {
    return Object.freeze({ left: 0, top: 0, right: width, bottom: height, width, height });
  }
  assertKnownKeys(value, SAFE_AREA_KEYS, 'ArenaHudLayer viewport.safeArea');
  const read = (field: string): number | undefined => {
    const fieldValue = ownData(value, field, 'ArenaHudLayer viewport.safeArea', false);
    return fieldValue === undefined ? undefined : finite(fieldValue, `ArenaHudLayer viewport.safeArea.${field}`);
  };
  const left = Math.max(0, Math.min(width - 1, read('left') ?? 0));
  const top = Math.max(0, Math.min(height - 1, read('top') ?? 0));
  const right = Math.max(left + 1, Math.min(width, read('right') ?? left + (read('width') ?? width - left)));
  const bottom = Math.max(top + 1, Math.min(height, read('bottom') ?? top + (read('height') ?? height - top)));
  return Object.freeze({ left, top, right, bottom, width: right - left, height: bottom - top });
}

function normalizeViewport(value: unknown): Readonly<{ viewport: HudViewport; safeRect: SafeRect }> {
  assertKnownKeys(value, VIEWPORT_KEYS, 'ArenaHudLayer viewport');
  const width = positive(ownData(value, 'width', 'ArenaHudLayer viewport'), 'ArenaHudLayer viewport.width');
  const height = positive(ownData(value, 'height', 'ArenaHudLayer viewport'), 'ArenaHudLayer viewport.height');
  const ratioValue = ownData(value, 'pixelRatio', 'ArenaHudLayer viewport', false);
  const pixelRatio = Math.max(0.5, Math.min(2, ratioValue === undefined ? 1 : finite(
    ratioValue,
    'ArenaHudLayer viewport.pixelRatio',
  )));
  const safeAreaValue = ownData(value, 'safeArea', 'ArenaHudLayer viewport', false) ?? null;
  const safeRect = normalizeSafeArea(safeAreaValue, width, height);
  return Object.freeze({
    viewport: Object.freeze({ width, height, pixelRatio, safeArea: safeAreaValue === null ? null : safeRect }),
    safeRect,
  });
}

function normalizeState(value: unknown): Readonly<{ mode: string; mapperLabel: string }> {
  assertKnownKeys(value, STATE_KEYS, 'ArenaHudLayer state');
  return Object.freeze({
    mode: stringValue(ownData(value, 'mode', 'ArenaHudLayer state', false) ?? 'match', 'ArenaHudLayer state.mode', true),
    mapperLabel: stringValue(ownData(value, 'mapperLabel', 'ArenaHudLayer state', false) ?? '', 'ArenaHudLayer state.mapperLabel', true),
  });
}

function normalizeFrame(value: unknown): HudFrame {
  assertRecord(value, 'ArenaHudLayer frame');
  const source = ownData(value, 'source', 'ArenaHudLayer frame');
  const hud = ownData(value, 'hud', 'ArenaHudLayer frame');
  const world = ownData(value, 'world', 'ArenaHudLayer frame');
  const local = ownData(hud, 'local', 'ArenaHudLayer frame.hud');
  const opponent = ownData(hud, 'opponent', 'ArenaHudLayer frame.hud');
  const action = ownData(hud, 'action', 'ArenaHudLayer frame.hud');
  const resultValue = ownData(hud, 'result', 'ArenaHudLayer frame.hud', false) ?? null;
  const result = resultValue === null ? null : Object.freeze({
    winnerId: optionalString(
      ownData(resultValue, 'winnerId', 'ArenaHudLayer frame.hud.result', false),
      'ArenaHudLayer frame.hud.result.winnerId',
    ),
    isDraw: booleanValue(
      ownData(resultValue, 'isDraw', 'ArenaHudLayer frame.hud.result'),
      'ArenaHudLayer frame.hud.result.isDraw',
    ),
  });
  const participants = Object.freeze(readDataArray(
    ownData(world, 'participants', 'ArenaHudLayer frame.world'),
    'ArenaHudLayer frame.world.participants',
    { nonEmpty: true },
  ).map((participant, index) => {
    const name = `ArenaHudLayer frame.world.participants[${index}]`;
    const position = ownData(participant, 'position', name);
    return Object.freeze({
      id: stringValue(ownData(participant, 'id', name), `${name}.id`),
      status: stringValue(ownData(participant, 'status', name), `${name}.status`),
      position: Object.freeze({
        x: finite(ownData(position, 'x', `${name}.position`), `${name}.position.x`),
        z: finite(ownData(position, 'z', `${name}.position`), `${name}.position.z`),
      }),
    });
  }));
  if (new Set(participants.map(({ id }) => id)).size !== participants.length) {
    throw new RangeError('ArenaHudLayer participant id 必须唯一。');
  }
  return Object.freeze({
    source: Object.freeze({
      matchSeed: nonNegativeInteger(
        ownData(source, 'matchSeed', 'ArenaHudLayer frame.source'),
        'ArenaHudLayer frame.source.matchSeed',
      ),
    }),
    phase: stringValue(ownData(value, 'phase', 'ArenaHudLayer frame'), 'ArenaHudLayer frame.phase'),
    hud: Object.freeze({
      remainingSeconds: nonNegativeInteger(
        ownData(hud, 'remainingSeconds', 'ArenaHudLayer frame.hud'),
        'ArenaHudLayer frame.hud.remainingSeconds',
      ),
      phaseLabel: stringValue(ownData(hud, 'phaseLabel', 'ArenaHudLayer frame.hud'), 'ArenaHudLayer frame.hud.phaseLabel'),
      local: Object.freeze({
        participantId: stringValue(ownData(local, 'participantId', 'ArenaHudLayer frame.hud.local'), 'ArenaHudLayer frame.hud.local.participantId'),
        lives: nonNegativeInteger(ownData(local, 'lives', 'ArenaHudLayer frame.hud.local'), 'ArenaHudLayer frame.hud.local.lives'),
      }),
      opponent: Object.freeze({
        participantId: stringValue(ownData(opponent, 'participantId', 'ArenaHudLayer frame.hud.opponent'), 'ArenaHudLayer frame.hud.opponent.participantId'),
        lives: nonNegativeInteger(ownData(opponent, 'lives', 'ArenaHudLayer frame.hud.opponent'), 'ArenaHudLayer frame.hud.opponent.lives'),
        displayName: stringValue(ownData(opponent, 'displayName', 'ArenaHudLayer frame.hud.opponent'), 'ArenaHudLayer frame.hud.opponent.displayName'),
      }),
      action: Object.freeze({
        definitionId: optionalString(ownData(action, 'definitionId', 'ArenaHudLayer frame.hud.action', false), 'ArenaHudLayer frame.hud.action.definitionId'),
        available: booleanValue(ownData(action, 'available', 'ArenaHudLayer frame.hud.action'), 'ArenaHudLayer frame.hud.action.available'),
        label: stringValue(ownData(action, 'label', 'ArenaHudLayer frame.hud.action'), 'ArenaHudLayer frame.hud.action.label'),
      }),
      result,
    }),
    world: Object.freeze({ participants }),
  });
}

function snapshotContext(value: unknown): HudContext {
  assertRecord(value, 'ArenaHudLayer 2D context');
  const methods = Object.fromEntries(CONTEXT_METHODS.map((name) => [
    name,
    snapshotMethod(value, 'ArenaHudLayer 2D context', name),
  ])) as Record<typeof CONTEXT_METHODS[number], UnknownMethod>;
  const invoke = (name: typeof CONTEXT_METHODS[number], args: readonly unknown[]): void => {
    rejectThenable(methods[name](...args), `ArenaHudLayer 2D context.${name}()`);
  };
  const set = (name: string, fieldValue: unknown): void => {
    if (!Reflect.set(value, name, fieldValue)) throw new Error(`ArenaHudLayer ${name} 写入失败。`);
  };
  return {
    setTransform: (...args: unknown[]) => invoke('setTransform', args),
    clearRect: (...args: unknown[]) => invoke('clearRect', args),
    beginPath: () => invoke('beginPath', []),
    moveTo: (...args: unknown[]) => invoke('moveTo', args),
    lineTo: (...args: unknown[]) => invoke('lineTo', args),
    quadraticCurveTo: (...args: unknown[]) => invoke('quadraticCurveTo', args),
    closePath: () => invoke('closePath', []),
    fill: () => invoke('fill', []),
    stroke: () => invoke('stroke', []),
    arc: (...args: unknown[]) => invoke('arc', args),
    fillRect: (...args: unknown[]) => invoke('fillRect', args),
    fillText: (...args: unknown[]) => invoke('fillText', args),
    get fillStyle() { return Reflect.get(value, 'fillStyle') as string | CanvasGradient | CanvasPattern; },
    set fillStyle(fieldValue: string | CanvasGradient | CanvasPattern) { set('fillStyle', fieldValue); },
    get strokeStyle() { return Reflect.get(value, 'strokeStyle') as string | CanvasGradient | CanvasPattern; },
    set strokeStyle(fieldValue: string | CanvasGradient | CanvasPattern) { set('strokeStyle', fieldValue); },
    get lineWidth() { return Reflect.get(value, 'lineWidth') as number; },
    set lineWidth(fieldValue: number) { set('lineWidth', fieldValue); },
    get font() { return Reflect.get(value, 'font') as string; },
    set font(fieldValue: string) { set('font', fieldValue); },
    get textBaseline() { return Reflect.get(value, 'textBaseline') as CanvasTextBaseline; },
    set textBaseline(fieldValue: CanvasTextBaseline) { set('textBaseline', fieldValue); },
    get textAlign() { return Reflect.get(value, 'textAlign') as CanvasTextAlign; },
    set textAlign(fieldValue: CanvasTextAlign) { set('textAlign', fieldValue); },
  } as unknown as HudContext;
}

function createSurface(platform: unknown): Readonly<{ canvas: CanvasLike; context: HudContext }> {
  const createCanvas = snapshotMethod(platform, 'ArenaHudLayer platform', 'createOffscreenCanvas');
  let canvas: unknown;
  try { canvas = createCanvas(2, 2); }
  catch { canvas = createCanvas(Object.freeze({ width: 2, height: 2 })); }
  assertRecord(canvas, 'ArenaHudLayer canvas');
  const context = snapshotContext(snapshotMethod(canvas, 'ArenaHudLayer canvas', 'getContext')('2d'));
  return Object.freeze({
    canvas: canvas as unknown as CanvasLike,
    context,
  });
}

function font(size: number, weight = 700): string {
  return `${weight} ${Math.max(10, size)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function roundedRect(context: HudContext, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(Math.max(0, radius), width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawLives(
  context: HudContext,
  values: Readonly<{ x: number; y: number; lives: number; align: CanvasTextAlign; color: string; scale: number }>,
): void {
  context.beginPath();
  context.arc(values.x, values.y, 7 * values.scale, 0, Math.PI * 2);
  context.fillStyle = values.lives > 0 ? values.color : 'rgba(38,50,56,0.16)';
  context.fill();
  context.font = font(14 * values.scale, 800);
  context.textBaseline = 'middle';
  context.textAlign = values.align;
  context.fillStyle = '#263238';
  context.fillText(
    `×${values.lives}`,
    values.x + (values.align === 'right' ? -12 : 12) * values.scale,
    values.y + 0.5 * values.scale,
  );
}

function drawControlRing(context: HudContext, x: number, y: number, radius: number, active = false): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = active ? 'rgba(22,166,161,0.14)' : 'rgba(255,255,255,0.22)';
  context.fill();
  context.strokeStyle = active ? 'rgba(22,166,161,0.68)' : 'rgba(38,50,56,0.22)';
  context.lineWidth = Math.max(2, radius * 0.035);
  context.stroke();
}

function presentationSignature(frame: HudFrame, state: Readonly<{ mode: string; mapperLabel: string }>): string {
  const local = frame.world.participants.find(({ id }) => id === frame.hud.local.participantId);
  const opponent = frame.world.participants.find(({ id }) => id === frame.hud.opponent.participantId);
  return JSON.stringify([
    frame.source.matchSeed, frame.phase, frame.hud.remainingSeconds, frame.hud.local.lives,
    frame.hud.opponent.lives, frame.hud.opponent.displayName, frame.hud.action.definitionId,
    frame.hud.action.available, frame.hud.result,
    local ? [Math.round(local.position.x * 2), Math.round(local.position.z * 2)] : null,
    opponent ? [Math.round(opponent.position.x * 2), Math.round(opponent.position.z * 2)] : null,
    state.mode, state.mapperLabel,
  ]);
}

function drawOffscreenOpponent(context: HudContext, frame: HudFrame, safe: SafeRect, scale: number): void {
  const local = frame.world.participants.find(({ id }) => id === frame.hud.local.participantId);
  const opponent = frame.world.participants.find(({ id }) => id === frame.hud.opponent.participantId);
  if (!local || !opponent || opponent.status !== 'active') return;
  const dx = opponent.position.x - local.position.x;
  const dz = opponent.position.z - local.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= (safe.width < safe.height ? 4.2 : 6)) return;
  const nx = dx / distance;
  const ny = -dz / distance;
  const centerX = safe.left + safe.width / 2;
  const centerY = safe.top + safe.height / 2;
  const ratio = Math.min(
    Math.max(34 * scale, safe.width / 2 - 28 * scale) / Math.max(0.001, Math.abs(nx)),
    Math.max(64 * scale, safe.height / 2 - 118 * scale) / Math.max(0.001, Math.abs(ny)),
  );
  const x = centerX + nx * ratio;
  const y = centerY + ny * ratio;
  const tipX = x + nx * 13 * scale;
  const tipY = y + ny * 13 * scale;
  const baseX = x - nx * 9 * scale;
  const baseY = y - ny * 9 * scale;
  const px = -ny;
  const py = nx;
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(baseX + px * 9 * scale, baseY + py * 9 * scale);
  context.lineTo(baseX - px * 9 * scale, baseY - py * 9 * scale);
  context.closePath();
  context.fillStyle = 'rgba(22,166,161,0.94)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.9)';
  context.lineWidth = Math.max(1.5, 2 * scale);
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = ny > 0.45 ? 'top' : 'bottom';
  context.fillStyle = '#263238';
  context.font = font(11 * scale, 800);
  context.fillText(`对手 ${Math.round(distance)}m`, x, y + (ny > 0.45 ? 18 : -17) * scale);
}

export class ArenaHudLayer {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  readonly #canvas: CanvasLike;
  readonly #context: HudContext;
  readonly #texture: THREE.CanvasTexture<TexImageSource>;
  readonly #quadDisposal: ThreeObjectDisposalLease;
  readonly #sceneClear: UnknownMethod;
  #viewport: HudViewport = Object.freeze({ width: 1, height: 1, pixelRatio: 1, safeArea: null });
  #safeRect: SafeRect = Object.freeze({ left: 0, top: 0, right: 1, bottom: 1, width: 1, height: 1 });
  #textureScale = 1;
  #frame: HudFrame | null = null;
  #state: Readonly<{ mode: string; mapperLabel: string }> = Object.freeze({
    mode: 'match',
    mapperLabel: '',
  });
  #signature = '';
  #rematchRect: RematchRect | null = null;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;
  #destroyRequested = false;
  #quadDisposed = false;
  #sceneCleared = false;
  #disposed = false;
  #failedError: unknown = null;

  constructor(platform: unknown) {
    const surface = createSurface(platform);
    this.#canvas = surface.canvas;
    this.#context = surface.context;
    let texture!: THREE.CanvasTexture<TexImageSource>;
    let scene!: THREE.Scene;
    let camera!: THREE.OrthographicCamera;
    let quad!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    let lease: ThreeObjectDisposalLease | null = null;
    let sceneClear: UnknownMethod | null = null;
    try {
      texture = new THREE.CanvasTexture(this.#canvas as unknown as TexImageSource);
      texture.name = 'ArenaHudTexture';
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      scene = new THREE.Scene();
      scene.name = 'ArenaHudScene';
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
      camera.position.z = 1;
      quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      quad.name = 'ArenaHudQuad';
      quad.renderOrder = 1000;
      scene.add(quad);
      lease = createThreeObjectDisposalLease(quad, { removeFromParent: false });
      sceneClear = snapshotMethod(scene, 'ArenaHudLayer scene', 'clear');
    } catch (error) {
      const cleanupCauses: unknown[] = [];
      try { lease?.dispose(); } catch (cleanupError) { cleanupCauses.push(cleanupError); }
      try { scene?.clear(); } catch (cleanupError) { cleanupCauses.push(cleanupError); }
      if (cleanupCauses.length > 0) {
        throw aggregate('ArenaHudLayer 构造失败且清理未完整完成。', error, cleanupCauses);
      }
      throw error;
    }
    this.#texture = texture;
    this.scene = scene;
    this.camera = camera;
    this.quad = quad;
    this.#quadDisposal = lease;
    this.#sceneClear = sceneClear;
  }

  #assertUsable(): void {
    if (this.#disposed || this.#destroyRequested) throw new Error('ArenaHudLayer 已销毁。');
    if (this.#failedError) {
      const error = new Error('ArenaHudLayer 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('ArenaHudLayer 不允许重入。');
    }
  }

  #begin(): void {
    this.#assertUsable();
    this.#operating = true;
    this.#reentryDetected = false;
  }

  #finish(): void {
    if (this.#reentryDetected) throw new Error('ArenaHudLayer 回调发生重入。');
    this.#operating = false;
  }

  #cleanupAll(): unknown[] {
    if (this.#cleaning) return [new Error('ArenaHudLayer 清理不可重入。')];
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      if (!this.#quadDisposed) {
        try { this.#quadDisposal.dispose(); this.#quadDisposed = true; }
        catch (error) { errors.push(error); }
      }
      if (!this.#sceneCleared) {
        try {
          rejectThenable(this.#sceneClear(), 'ArenaHudLayer scene.clear()');
          this.#sceneCleared = true;
        } catch (error) { errors.push(error); }
      }
    } finally { this.#cleaning = false; }
    if (this.#quadDisposed && this.#sceneCleared) this.#disposed = true;
    return errors;
  }

  #fail(error: unknown): never {
    this.#failedError = error;
    this.#destroyRequested = true;
    this.#operating = false;
    const cleanupCauses = this.#cleanupAll();
    if (cleanupCauses.length > 0) {
      throw aggregate('ArenaHudLayer 运行失败且清理未完整完成。', error, cleanupCauses);
    }
    throw error;
  }

  resize(viewportValue: unknown): void {
    this.#assertUsable();
    const normalized = normalizeViewport(viewportValue);
    const textureScale = Math.max(0.5, Math.min(
      normalized.viewport.pixelRatio,
      ARENA_GREYBOX_DESIGN.maximumHudTextureSide
        / Math.max(normalized.viewport.width, normalized.viewport.height),
    ));
    this.#begin();
    try {
      this.#viewport = normalized.viewport;
      this.#safeRect = normalized.safeRect;
      this.#textureScale = textureScale;
      this.#canvas.width = Math.max(1, Math.round(this.#viewport.width * textureScale));
      this.#canvas.height = Math.max(1, Math.round(this.#viewport.height * textureScale));
      this.#texture.needsUpdate = true;
      this.#signature = '';
      this.#draw();
      this.#finish();
    } catch (error) { this.#fail(error); }
  }

  sync(frameValue: unknown, stateValue: unknown = {}): void {
    this.#assertUsable();
    const frame = normalizeFrame(frameValue);
    const state = normalizeState(stateValue);
    this.#begin();
    try {
      this.#frame = frame;
      this.#state = state;
      this.#draw();
      this.#finish();
    } catch (error) { this.#fail(error); }
  }

  #drawTop(context: HudContext, frame: HudFrame, scale: number): void {
    const safe = this.#safeRect;
    const pad = 18 * scale;
    const y = safe.top + 24 * scale;
    const centerX = safe.left + safe.width / 2;
    context.textBaseline = 'middle';
    context.fillStyle = '#263238';
    context.font = font(18 * scale, 800);
    context.textAlign = 'left';
    context.fillText('YOU', safe.left + pad, y);
    drawLives(context, { x: safe.left + pad, y: y + 25 * scale, lives: frame.hud.local.lives, align: 'left', color: '#E53935', scale });
    context.textAlign = 'right';
    context.fillText(frame.hud.opponent.displayName, safe.right - pad, y);
    drawLives(context, { x: safe.right - pad, y: y + 25 * scale, lives: frame.hud.opponent.lives, align: 'right', color: '#16A6A1', scale });
    const pillWidth = 116 * scale;
    const pillHeight = 44 * scale;
    roundedRect(context, centerX - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 22 * scale);
    context.fillStyle = 'rgba(255,255,255,0.82)';
    context.fill();
    context.strokeStyle = 'rgba(38,50,56,0.10)';
    context.lineWidth = Math.max(1, 1.5 * scale);
    context.stroke();
    context.textAlign = 'center';
    context.fillStyle = '#263238';
    context.font = font(17 * scale, 800);
    context.fillText(`${frame.hud.phaseLabel}  ${frame.hud.remainingSeconds}s`, centerX, y + scale);
  }

  #drawControls(context: HudContext, frame: HudFrame, scale: number): void {
    const safe = this.#safeRect;
    const radius = Math.max(42, Math.min(72, Math.min(safe.width, safe.height) * 0.09));
    const bottom = safe.bottom - Math.max(24, 28 * scale) - radius;
    const moveX = safe.left + Math.max(radius + 18, safe.width * 0.2);
    drawControlRing(context, moveX, bottom, radius);
    context.beginPath();
    context.arc(moveX, bottom, radius * 0.34, 0, Math.PI * 2);
    context.fillStyle = 'rgba(38,50,56,0.22)';
    context.fill();
    const actionRadius = actionButtonRadius({ width: this.#viewport.width, height: this.#viewport.height });
    const actionX = this.#viewport.width * DEFAULT_ARENA_CONTROL_LAYOUT.primaryCenterXFraction;
    const actionY = this.#viewport.height * DEFAULT_ARENA_CONTROL_LAYOUT.primaryCenterYFraction;
    const jumpX = this.#viewport.width * DEFAULT_ARENA_CONTROL_LAYOUT.jumpCenterXFraction;
    const jumpY = this.#viewport.height * DEFAULT_ARENA_CONTROL_LAYOUT.jumpCenterYFraction;
    drawControlRing(context, actionX, actionY, actionRadius, frame.hud.action.available);
    context.beginPath();
    context.arc(actionX, actionY, actionRadius * 0.75, 0, Math.PI * 2);
    context.fillStyle = frame.hud.action.available ? 'rgba(229,57,53,0.88)' : 'rgba(112,121,128,0.52)';
    context.fill();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#FFFFFF';
    context.font = font(Math.max(13, actionRadius * 0.24), 800);
    context.fillText(frame.hud.action.label, actionX, actionY);
    drawControlRing(context, jumpX, jumpY, actionRadius * 0.86, true);
    context.beginPath();
    context.arc(jumpX, jumpY, actionRadius * 0.62, 0, Math.PI * 2);
    context.fillStyle = 'rgba(22,166,161,0.88)';
    context.fill();
    context.fillStyle = '#FFFFFF';
    context.font = font(Math.max(12, actionRadius * 0.22), 800);
    context.fillText('跳跃', jumpX, jumpY);
    if (this.#state.mapperLabel) {
      context.fillStyle = 'rgba(38,50,56,0.5)';
      context.font = font(12 * scale, 600);
      context.fillText(this.#state.mapperLabel, safe.left + safe.width / 2, safe.bottom - 20 * scale);
    }
  }

  #drawOverlay(context: HudContext, frame: HudFrame, scale: number): void {
    const safe = this.#safeRect;
    const centerX = safe.left + safe.width / 2;
    const centerY = safe.top + safe.height / 2;
    if (this.#state.mode === 'matching') {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#263238';
      context.font = font(30 * scale, 900);
      context.fillText('正在匹配对手', centerX, centerY - 18 * scale);
      context.fillStyle = 'rgba(38,50,56,0.58)';
      context.font = font(15 * scale, 600);
      context.fillText('准备争夺神器并把对手击出平台', centerX, centerY + 24 * scale);
      return;
    }
    if (frame.phase === 'preparing') {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#263238';
      context.font = font(42 * scale, 900);
      context.fillText('准备', centerX, centerY - 14 * scale);
      context.fillStyle = 'rgba(38,50,56,0.58)';
      context.font = font(16 * scale, 650);
      context.fillText('左摇杆移动 · 红键攻击 · 青键跳跃', centerX, centerY + 30 * scale);
      return;
    }
    if (frame.phase !== 'ended') return;
    context.fillStyle = 'rgba(38,50,56,0.28)';
    context.fillRect(0, 0, this.#viewport.width, this.#viewport.height);
    const modalWidth = Math.min(safe.width - 28 * scale, 420 * scale);
    const modalHeight = 220 * scale;
    const modalX = centerX - modalWidth / 2;
    const modalY = centerY - modalHeight / 2;
    roundedRect(context, modalX, modalY, modalWidth, modalHeight, 28 * scale);
    context.fillStyle = 'rgba(255,255,255,0.94)';
    context.fill();
    const result = frame.hud.result;
    const won = result?.winnerId === frame.hud.local.participantId;
    const title = result?.isDraw ? '平局' : won ? '胜利' : '再接再厉';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = won ? '#E53935' : '#263238';
    context.font = font(36 * scale, 900);
    context.fillText(title, centerX, modalY + 58 * scale);
    const buttonWidth = Math.min(modalWidth - 48 * scale, 250 * scale);
    const buttonHeight = 58 * scale;
    this.#rematchRect = Object.freeze({
      x: centerX - buttonWidth / 2,
      y: modalY + modalHeight - buttonHeight - 28 * scale,
      width: buttonWidth,
      height: buttonHeight,
    });
    roundedRect(
      context,
      this.#rematchRect.x,
      this.#rematchRect.y,
      this.#rematchRect.width,
      this.#rematchRect.height,
      buttonHeight / 2,
    );
    context.fillStyle = '#E53935';
    context.fill();
    context.fillStyle = '#FFFFFF';
    context.font = font(18 * scale, 800);
    context.fillText('再来一局', centerX, this.#rematchRect.y + buttonHeight / 2);
  }

  #draw(): void {
    if (!this.#frame) return;
    const signature = `${this.#viewport.width}x${this.#viewport.height}:${presentationSignature(this.#frame, this.#state)}`;
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.#rematchRect = null;
    const scale = Math.max(0.6, Math.min(1.4, Math.min(
      this.#safeRect.width / 430,
      this.#safeRect.height / 760,
    )));
    this.#context.setTransform(this.#textureScale, 0, 0, this.#textureScale, 0, 0);
    this.#context.clearRect(0, 0, this.#viewport.width, this.#viewport.height);
    this.#drawTop(this.#context, this.#frame, scale);
    drawOffscreenOpponent(this.#context, this.#frame, this.#safeRect, scale);
    this.#drawControls(this.#context, this.#frame, scale);
    this.#drawOverlay(this.#context, this.#frame, scale);
    this.#texture.needsUpdate = true;
  }

  hitTestRematch(pointValue: unknown, viewportValue: unknown = this.#viewport): boolean {
    this.#assertUsable();
    if (!this.#rematchRect || pointValue === null || pointValue === undefined) return false;
    assertKnownKeys(pointValue, POINT_KEYS, 'ArenaHudLayer point');
    const x = finite(ownData(pointValue, 'x', 'ArenaHudLayer point'), 'ArenaHudLayer point.x');
    const y = finite(ownData(pointValue, 'y', 'ArenaHudLayer point'), 'ArenaHudLayer point.y');
    const { viewport } = normalizeViewport(viewportValue);
    const mappedX = x / viewport.width * this.#viewport.width;
    const mappedY = y / viewport.height * this.#viewport.height;
    return mappedX >= this.#rematchRect.x
      && mappedX <= this.#rematchRect.x + this.#rematchRect.width
      && mappedY >= this.#rematchRect.y
      && mappedY <= this.#rematchRect.y + this.#rematchRect.height;
  }

  render(renderer: unknown): void {
    this.#assertUsable();
    const render = snapshotMethod(renderer, 'ArenaHudLayer renderer', 'render');
    this.#begin();
    try {
      rejectThenable(render(this.scene, this.camera), 'ArenaHudLayer renderer.render()');
      this.#finish();
    } catch (error) { this.#fail(error); }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      textureWidth: this.#canvas.width,
      textureHeight: this.#canvas.height,
      hasFrame: this.#frame !== null,
      hasRematchControl: this.#rematchRect !== null,
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('ArenaHudLayer 清理不可重入。');
    }
    this.#destroyRequested = true;
    this.#frame = null;
    this.#rematchRect = null;
    const errors = this.#cleanupAll();
    if (errors.length > 0) {
      throw aggregate('ArenaHudLayer 清理未完整完成。', this.#failedError, errors);
    }
  }
}
