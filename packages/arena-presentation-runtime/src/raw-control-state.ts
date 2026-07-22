import {
  ARENA_CONTROL_ID,
  type ArenaControlDelta,
  type ArenaControlId,
  type ArenaControlLayout,
  type ArenaControlPoint,
  controlAtPoint,
  createArenaControlLayout,
  joystickRadius,
  normalizedControlDelta,
} from './control-layout.js';
import {
  cloneKnownRecord,
  clonePoint,
  cloneViewport,
  nextRevision,
  type PresentationInputViewport,
} from './input-validation.js';
import { trustRawControlSnapshot } from './input-snapshot-trust.js';

export interface RawControlEdges {
  readonly started: boolean;
  readonly ended: boolean;
  readonly cancelled: boolean;
}

interface MutableRawControlEdges {
  started: boolean;
  ended: boolean;
  cancelled: boolean;
}

export interface RawControlVector {
  readonly x: number;
  readonly z: number;
}

export interface RawControlSnapshotEntry {
  readonly active: boolean;
  readonly pointerId: number | null;
  readonly origin: Readonly<ArenaControlPoint> | null;
  readonly current: Readonly<ArenaControlPoint> | null;
  readonly delta: Readonly<ArenaControlDelta>;
  readonly vector: Readonly<RawControlVector>;
  readonly edges: Readonly<RawControlEdges>;
}

export interface RawControlSnapshot {
  readonly revision: number;
  readonly suspended: boolean;
  readonly viewport: Readonly<PresentationInputViewport>;
  readonly move: RawControlSnapshotEntry;
  readonly primary: RawControlSnapshotEntry;
  readonly jump: RawControlSnapshotEntry;
}

interface PointerRecord {
  readonly pointerId: number;
  readonly controlId: ArenaControlId;
  readonly origin: ArenaControlPoint;
  current: ArenaControlPoint;
}

const OPTION_KEYS = new Set(['viewport', 'layout']);
const CONTROL_IDS: readonly ArenaControlId[] = Object.freeze(Object.values(ARENA_CONTROL_ID));

function emptyEdges(): MutableRawControlEdges {
  return { started: false, ended: false, cancelled: false };
}

function frozenPoint(point: ArenaControlPoint | null): Readonly<ArenaControlPoint> | null {
  return point
    ? Object.freeze({ x: point.x, y: point.y, pointerId: point.pointerId })
    : null;
}

function requireMapValue<K, V>(map: ReadonlyMap<K, V>, key: K, name: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`RawControlState 缺少 ${name}。`);
  return value;
}

export class RawControlState {
  readonly #layout: Readonly<ArenaControlLayout>;
  #viewport: Readonly<PresentationInputViewport>;
  #joystickRadius: number;
  readonly #pointers: Map<number, PointerRecord>;
  readonly #ownerByControl: Map<ArenaControlId, number>;
  readonly #lastByControl: Map<ArenaControlId, PointerRecord | null>;
  readonly #edgesByControl: Map<ArenaControlId, MutableRawControlEdges>;
  #revision: number;
  #suspended: boolean;
  #destroyed: boolean;

  constructor(options: unknown) {
    const source = cloneKnownRecord(options, OPTION_KEYS, 'RawControlState options');
    this.#layout = createArenaControlLayout(source.layout ?? {});
    this.#viewport = cloneViewport(source.viewport, 'RawControlState.viewport');
    this.#joystickRadius = joystickRadius(this.#viewport, this.#layout);
    this.#pointers = new Map();
    this.#ownerByControl = new Map();
    this.#lastByControl = new Map(CONTROL_IDS.map((id) => [id, null]));
    this.#edgesByControl = new Map(CONTROL_IDS.map((id) => [id, emptyEdges()]));
    this.#revision = 0;
    this.#suspended = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('RawControlState 已销毁。');
  }

  #touchRevision(): void {
    this.#revision = nextRevision(this.#revision);
  }

  #clearInternal(): void {
    this.#pointers.clear();
    this.#ownerByControl.clear();
    for (const controlId of CONTROL_IDS) {
      this.#lastByControl.set(controlId, null);
      this.#edgesByControl.set(controlId, emptyEdges());
    }
  }

  resize(viewport: unknown): boolean {
    this.#assertUsable();
    const next = cloneViewport(viewport, 'RawControlState.viewport');
    if (next.width === this.#viewport.width && next.height === this.#viewport.height) {
      return false;
    }
    const nextJoystickRadius = joystickRadius(next, this.#layout);
    this.#viewport = next;
    this.#joystickRadius = nextJoystickRadius;
    this.#clearInternal();
    this.#touchRevision();
    return true;
  }

  pointerStart(point: unknown): boolean {
    this.#assertUsable();
    const value = clonePoint(point, 'pointerStart');
    if (this.#suspended || this.#pointers.has(value.pointerId)) return false;
    const controlId = controlAtPoint(value, this.#viewport, this.#layout);
    if (
      controlId === null
      || this.#ownerByControl.has(controlId)
      || Object.values(requireMapValue(
        this.#edgesByControl,
        controlId,
        `${controlId} edges`,
      )).some(Boolean)
    ) return false;
    const record: PointerRecord = {
      pointerId: value.pointerId,
      controlId,
      origin: { ...value },
      current: { ...value },
    };
    this.#pointers.set(value.pointerId, record);
    this.#ownerByControl.set(controlId, value.pointerId);
    this.#lastByControl.set(controlId, record);
    requireMapValue(this.#edgesByControl, controlId, `${controlId} edges`).started = true;
    this.#touchRevision();
    return true;
  }

  pointerMove(point: unknown): boolean {
    this.#assertUsable();
    const value = clonePoint(point, 'pointerMove');
    if (this.#suspended) return false;
    const record = this.#pointers.get(value.pointerId);
    if (!record) return false;
    if (record.current.x === value.x && record.current.y === value.y) return true;
    record.current = { ...value };
    this.#lastByControl.set(record.controlId, record);
    this.#touchRevision();
    return true;
  }

  #release(point: unknown, cancelled: boolean): boolean {
    const value = clonePoint(point, cancelled ? 'pointerCancel' : 'pointerEnd');
    const record = this.#pointers.get(value.pointerId);
    if (!record) return false;
    record.current = { ...value };
    this.#pointers.delete(value.pointerId);
    this.#ownerByControl.delete(record.controlId);
    this.#lastByControl.set(record.controlId, record);
    const edges = requireMapValue(
      this.#edgesByControl,
      record.controlId,
      `${record.controlId} edges`,
    );
    if (cancelled) edges.cancelled = true;
    else edges.ended = true;
    this.#touchRevision();
    return true;
  }

  pointerEnd(point: unknown): boolean {
    this.#assertUsable();
    if (this.#suspended) return false;
    return this.#release(point, false);
  }

  pointerCancel(point: unknown): boolean {
    this.#assertUsable();
    if (this.#suspended) return false;
    return this.#release(point, true);
  }

  suspend(): boolean {
    this.#assertUsable();
    if (this.#suspended) return false;
    this.#suspended = true;
    this.#clearInternal();
    this.#touchRevision();
    return true;
  }

  resume(): boolean {
    this.#assertUsable();
    if (!this.#suspended) return false;
    this.#suspended = false;
    this.#clearInternal();
    this.#touchRevision();
    return true;
  }

  #controlSnapshot(controlId: ArenaControlId): RawControlSnapshotEntry {
    const ownerId = this.#ownerByControl.get(controlId);
    const activeRecord = ownerId === undefined ? null : (this.#pointers.get(ownerId) ?? null);
    const record = activeRecord ?? requireMapValue(
      this.#lastByControl,
      controlId,
      `${controlId} last record`,
    );
    const delta = record
      ? normalizedControlDelta(record.origin, record.current, this.#joystickRadius)
      : Object.freeze({
        x: 0,
        y: 0,
        rawX: 0,
        rawY: 0,
        magnitude: 0,
        rawMagnitude: 0,
      });
    const edges = requireMapValue(this.#edgesByControl, controlId, `${controlId} edges`);
    return Object.freeze({
      active: activeRecord !== null,
      pointerId: record?.pointerId ?? null,
      origin: frozenPoint(record?.origin ?? null),
      current: frozenPoint(record?.current ?? null),
      delta,
      vector: Object.freeze(controlId === ARENA_CONTROL_ID.MOVE && activeRecord
        ? { x: delta.x, z: -delta.y }
        : { x: 0, z: 0 }),
      edges: Object.freeze({ ...edges }),
    });
  }

  #snapshot(): RawControlSnapshot {
    return trustRawControlSnapshot(Object.freeze({
      revision: this.#revision,
      suspended: this.#suspended,
      viewport: this.#viewport,
      move: this.#controlSnapshot(ARENA_CONTROL_ID.MOVE),
      primary: this.#controlSnapshot(ARENA_CONTROL_ID.PRIMARY),
      jump: this.#controlSnapshot(ARENA_CONTROL_ID.JUMP),
    }));
  }

  consumeSnapshot(): RawControlSnapshot {
    this.#assertUsable();
    const snapshot = this.#snapshot();
    for (const controlId of CONTROL_IDS) {
      this.#edgesByControl.set(controlId, emptyEdges());
    }
    return snapshot;
  }

  getDebugSnapshot(): RawControlSnapshot {
    this.#assertUsable();
    return this.#snapshot();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#suspended = true;
    this.#clearInternal();
  }
}
