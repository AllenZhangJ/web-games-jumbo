import {
  GESTURE_DIRECTION,
  type GestureDirection,
} from './arena-input-mapper.js';
import { type ArenaControlId } from './control-layout.js';
import {
  cloneKnownRecord,
  finiteNumber,
  integerAtLeast,
} from './input-validation.js';
import {
  isTrustedRawControlSnapshot,
  trustGestureSnapshot,
} from './input-snapshot-trust.js';
import {
  type RawControlSnapshot,
} from './raw-control-state.js';

export interface GestureConfig {
  readonly swipeThreshold: number;
  readonly directionDominance: number;
  readonly holdActivationTicks: number;
}

export interface ControlGestureSnapshot {
  readonly pointerId: number | null;
  readonly contactPressed: boolean;
  readonly contactHeld: boolean;
  readonly contactHoldStarted: boolean;
  readonly contactReleased: boolean;
  readonly tapReleased: boolean;
  readonly direction: GestureDirection | null;
  readonly directionPressed: GestureDirection | null;
  readonly directionHeld: GestureDirection | null;
  readonly directionHoldStarted: GestureDirection | null;
  readonly directionReleased: GestureDirection | null;
  readonly wasDirectionHeld: boolean;
  readonly cancelled: boolean;
  readonly heldTicks: number;
}

export interface GestureSnapshot {
  readonly tick: number;
  readonly move: ControlGestureSnapshot;
  readonly primary: ControlGestureSnapshot;
  readonly jump: ControlGestureSnapshot;
}

interface MutableControlGestureSnapshot {
  pointerId: number | null;
  contactPressed: boolean;
  contactHeld: boolean;
  contactHoldStarted: boolean;
  contactReleased: boolean;
  tapReleased: boolean;
  direction: GestureDirection | null;
  directionPressed: GestureDirection | null;
  directionHeld: GestureDirection | null;
  directionHoldStarted: GestureDirection | null;
  directionReleased: GestureDirection | null;
  wasDirectionHeld: boolean;
  cancelled: boolean;
  heldTicks: number;
}

interface GestureSession {
  readonly pointerId: number;
  readonly startTick: number;
  direction: GestureDirection | null;
  contactHoldActivated: boolean;
  directionHoldActivated: boolean;
}

interface RecognizerRawControl {
  readonly active: boolean;
  readonly pointerId: number | null;
  readonly delta: Readonly<{
    x: number;
    y: number;
    rawX: number;
    rawY: number;
    magnitude: number;
    rawMagnitude: number;
  }>;
  readonly edges: Readonly<{
    started: boolean;
    ended: boolean;
    cancelled: boolean;
  }>;
}

interface RecognizerRawSnapshot {
  readonly suspended: boolean;
  readonly move: RecognizerRawControl;
  readonly primary: RecognizerRawControl;
  readonly jump: RecognizerRawControl;
}

const CONFIG_KEYS = new Set([
  'swipeThreshold',
  'directionDominance',
  'holdActivationTicks',
]);
const RAW_SNAPSHOT_KEYS = new Set([
  'revision',
  'suspended',
  'viewport',
  'move',
  'primary',
  'jump',
]);
const RAW_CONTROL_KEYS = new Set([
  'active',
  'pointerId',
  'origin',
  'current',
  'delta',
  'vector',
  'edges',
]);
const RAW_DELTA_KEYS = new Set(['x', 'y', 'rawX', 'rawY', 'magnitude', 'rawMagnitude']);
const RAW_EDGE_KEYS = new Set(['started', 'ended', 'cancelled']);

export const DEFAULT_GESTURE_CONFIG: Readonly<GestureConfig> = Object.freeze({
  swipeThreshold: 0.65,
  directionDominance: 1.25,
  holdActivationTicks: 5,
});

function createGestureConfig(overrides: unknown = {}): Readonly<GestureConfig> {
  const source = cloneKnownRecord(overrides, CONFIG_KEYS, 'GestureConfig');
  const config = { ...DEFAULT_GESTURE_CONFIG, ...source } as unknown as GestureConfig;
  finiteNumber(config.swipeThreshold, 'GestureConfig.swipeThreshold');
  if (config.swipeThreshold <= 0 || config.swipeThreshold > 2) {
    throw new RangeError('GestureConfig.swipeThreshold 必须位于 (0, 2]。');
  }
  finiteNumber(config.directionDominance, 'GestureConfig.directionDominance');
  if (config.directionDominance < 1) {
    throw new RangeError('GestureConfig.directionDominance 必须大于等于 1。');
  }
  integerAtLeast(config.holdActivationTicks, 2, 'GestureConfig.holdActivationTicks');
  return Object.freeze(config);
}

function detectDirection(
  control: RecognizerRawControl,
  config: Readonly<GestureConfig>,
): GestureDirection | null {
  const x = control.delta.rawX;
  const y = control.delta.rawY;
  const absoluteX = Math.abs(x);
  const absoluteY = Math.abs(y);
  if (Math.max(absoluteX, absoluteY) < config.swipeThreshold) return null;
  if (absoluteX >= absoluteY * config.directionDominance) {
    return x < 0 ? GESTURE_DIRECTION.LEFT : GESTURE_DIRECTION.RIGHT;
  }
  if (absoluteY >= absoluteX * config.directionDominance) {
    return y < 0 ? GESTURE_DIRECTION.UP : GESTURE_DIRECTION.DOWN;
  }
  return null;
}

function emptyControlGesture(): MutableControlGestureSnapshot {
  return {
    pointerId: null,
    contactPressed: false,
    contactHeld: false,
    contactHoldStarted: false,
    contactReleased: false,
    tapReleased: false,
    direction: null,
    directionPressed: null,
    directionHeld: null,
    directionHoldStarted: null,
    directionReleased: null,
    wasDirectionHeld: false,
    cancelled: false,
    heldTicks: 0,
  };
}

function freezeGesture(value: MutableControlGestureSnapshot): ControlGestureSnapshot {
  return Object.freeze(value);
}

function cloneRawControl(value: unknown, name: string): RecognizerRawControl {
  const source = cloneKnownRecord(value, RAW_CONTROL_KEYS, name);
  if (typeof source.active !== 'boolean') throw new TypeError(`${name}.active 必须是布尔值。`);
  if (
    source.pointerId !== null
    && (!Number.isSafeInteger(source.pointerId) || (source.pointerId as number) < 0)
  ) throw new RangeError(`${name}.pointerId 无效。`);
  const delta = cloneKnownRecord(source.delta, RAW_DELTA_KEYS, `${name}.delta`);
  const normalizedDelta: Record<string, number> = {};
  for (const key of RAW_DELTA_KEYS) {
    normalizedDelta[key] = finiteNumber(delta[key], `${name}.delta.${key}`);
  }
  const edges = cloneKnownRecord(source.edges, RAW_EDGE_KEYS, `${name}.edges`);
  const normalizedEdges: Record<string, boolean> = {};
  for (const key of RAW_EDGE_KEYS) {
    if (typeof edges[key] !== 'boolean') {
      throw new TypeError(`${name}.edges.${key} 必须是布尔值。`);
    }
    normalizedEdges[key] = edges[key];
  }
  if (
    (source.active || normalizedEdges.started || normalizedEdges.ended || normalizedEdges.cancelled)
    && source.pointerId === null
  ) throw new RangeError(`${name} 活跃或包含边沿时必须有 pointerId。`);
  if (normalizedEdges.ended && normalizedEdges.cancelled) {
    throw new RangeError(`${name} 不能同时 ended 与 cancelled。`);
  }
  return Object.freeze({
    active: source.active,
    pointerId: source.pointerId as number | null,
    delta: Object.freeze({
      x: normalizedDelta.x!,
      y: normalizedDelta.y!,
      rawX: normalizedDelta.rawX!,
      rawY: normalizedDelta.rawY!,
      magnitude: normalizedDelta.magnitude!,
      rawMagnitude: normalizedDelta.rawMagnitude!,
    }),
    edges: Object.freeze({
      started: normalizedEdges.started!,
      ended: normalizedEdges.ended!,
      cancelled: normalizedEdges.cancelled!,
    }),
  });
}

function cloneRawSnapshot(value: unknown): RecognizerRawSnapshot {
  if (isTrustedRawControlSnapshot(value)) {
    return value as RawControlSnapshot;
  }
  const source = cloneKnownRecord(value, RAW_SNAPSHOT_KEYS, 'RawControlSnapshot');
  if (typeof source.suspended !== 'boolean') {
    throw new TypeError('RawControlSnapshot.suspended 必须是布尔值。');
  }
  const snapshot: RecognizerRawSnapshot = Object.freeze({
    suspended: source.suspended,
    move: cloneRawControl(source.move, 'RawControlSnapshot.move'),
    primary: cloneRawControl(source.primary, 'RawControlSnapshot.primary'),
    jump: cloneRawControl(source.jump, 'RawControlSnapshot.jump'),
  });
  if (snapshot.suspended) {
    for (const [name, control] of Object.entries({
      move: snapshot.move,
      primary: snapshot.primary,
      jump: snapshot.jump,
    })) {
      if (control.active || Object.values(control.edges).some(Boolean)) {
        throw new RangeError(`RawControlSnapshot.${name} 在 suspended 时必须已清空。`);
      }
    }
  }
  return snapshot;
}

function cloneSessions(
  sessions: ReadonlyMap<ArenaControlId, GestureSession>,
): Map<ArenaControlId, GestureSession> {
  return new Map([...sessions].map(([key, session]) => [key, { ...session }]));
}

export class GestureRecognizer {
  readonly #config: Readonly<GestureConfig>;
  #sessions: Map<ArenaControlId, GestureSession>;
  #lastTick: number;
  #destroyed: boolean;

  constructor(config: unknown = {}) {
    this.#config = createGestureConfig(config);
    this.#sessions = new Map();
    this.#lastTick = -1;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('GestureRecognizer 已销毁。');
  }

  #sampleControl(
    sessions: Map<ArenaControlId, GestureSession>,
    controlId: ArenaControlId,
    control: RecognizerRawControl,
    tick: number,
  ): ControlGestureSnapshot {
    const output = emptyControlGesture();
    if (control.edges.started) {
      if (sessions.has(controlId)) {
        throw new Error(`GestureRecognizer ${controlId} 收到重复 pointer start。`);
      }
      sessions.set(controlId, {
        pointerId: control.pointerId!,
        startTick: tick,
        direction: null,
        contactHoldActivated: false,
        directionHoldActivated: false,
      });
      output.contactPressed = true;
    }
    const session = sessions.get(controlId);
    if (!session) return freezeGesture(output);
    if (control.pointerId !== session.pointerId) {
      throw new RangeError(`GestureRecognizer ${controlId} pointerId 与所有权不一致。`);
    }
    output.pointerId = session.pointerId;
    output.heldTicks = tick - session.startTick + 1;
    const detected = detectDirection(control, this.#config);
    if (session.direction === null && detected !== null) {
      session.direction = detected;
      output.directionPressed = detected;
    }
    if (
      control.active
      && !session.contactHoldActivated
      && output.heldTicks >= this.#config.holdActivationTicks
    ) {
      session.contactHoldActivated = true;
      output.contactHoldStarted = true;
    }
    if (
      control.active
      && session.direction !== null
      && session.contactHoldActivated
      && !session.directionHoldActivated
    ) {
      session.directionHoldActivated = true;
      output.directionHoldStarted = session.direction;
    }
    output.direction = session.direction;
    output.contactHeld = control.active && session.contactHoldActivated;
    output.directionHeld = control.active && session.directionHoldActivated
      ? session.direction
      : null;

    if (control.edges.cancelled) {
      output.cancelled = true;
      output.contactHeld = false;
      output.directionHeld = null;
      sessions.delete(controlId);
    } else if (control.edges.ended) {
      output.contactReleased = true;
      output.tapReleased = session.direction === null;
      output.directionReleased = session.direction;
      output.wasDirectionHeld = session.directionHoldActivated;
      output.contactHeld = false;
      output.directionHeld = null;
      sessions.delete(controlId);
    } else if (!control.active) {
      throw new Error(`GestureRecognizer ${controlId} pointer 无结束边沿却已失活。`);
    }
    return freezeGesture(output);
  }

  sample(tickValue: unknown, rawSnapshot: unknown): GestureSnapshot {
    this.#assertUsable();
    const tick = integerAtLeast(tickValue, 0, 'GestureRecognizer.tick');
    if (this.#lastTick >= 0 && tick !== this.#lastTick + 1) {
      throw new RangeError(
        `GestureRecognizer tick 必须连续：上次 ${this.#lastTick}，本次 ${tick}。`,
      );
    }
    const source = cloneRawSnapshot(rawSnapshot);
    const nextSessions = cloneSessions(this.#sessions);
    if (source.suspended) nextSessions.clear();
    const result = trustGestureSnapshot(Object.freeze({
      tick,
      move: this.#sampleControl(nextSessions, 'move', source.move, tick),
      primary: this.#sampleControl(nextSessions, 'primary', source.primary, tick),
      jump: this.#sampleControl(nextSessions, 'jump', source.jump, tick),
    }));
    this.#sessions = nextSessions;
    this.#lastTick = tick;
    return result;
  }

  reset(): void {
    this.#assertUsable();
    this.#sessions.clear();
  }

  getDebugSnapshot(): Readonly<{ lastTick: number; activeControls: readonly ArenaControlId[] }> {
    this.#assertUsable();
    return Object.freeze({
      lastTick: this.#lastTick,
      activeControls: Object.freeze([...this.#sessions.keys()].sort()),
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#sessions.clear();
    this.#lastTick = -1;
  }
}
