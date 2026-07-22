import {
  ARENA_CONTROL_ID,
  controlAtPoint,
  createArenaControlLayout,
  joystickRadius,
  normalizedControlDelta,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  clonePoint,
  cloneViewport,
  nextRevision,
} from './input-validation.js';

const CONTROL_IDS = Object.freeze(Object.values(ARENA_CONTROL_ID));

function emptyEdges() {
  return { started: false, ended: false, cancelled: false };
}

function frozenPoint(point) {
  return point ? Object.freeze({ x: point.x, y: point.y, pointerId: point.pointerId }) : null;
}

export class RawControlState {
  #layout;
  #viewport;
  #pointers;
  #ownerByControl;
  #lastByControl;
  #edgesByControl;
  #revision;
  #suspended;
  #destroyed;

  constructor({ viewport, layout = {} }) {
    this.#layout = createArenaControlLayout(layout);
    this.#viewport = cloneViewport(viewport, 'RawControlState.viewport');
    this.#pointers = new Map();
    this.#ownerByControl = new Map();
    this.#lastByControl = new Map(CONTROL_IDS.map((id) => [id, null]));
    this.#edgesByControl = new Map(CONTROL_IDS.map((id) => [id, emptyEdges()]));
    this.#revision = 0;
    this.#suspended = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('RawControlState 已销毁。');
  }

  #touchRevision() {
    this.#revision = nextRevision(this.#revision);
  }

  #clearInternal() {
    this.#pointers.clear();
    this.#ownerByControl.clear();
    for (const controlId of CONTROL_IDS) {
      this.#lastByControl.set(controlId, null);
      this.#edgesByControl.set(controlId, emptyEdges());
    }
  }

  resize(viewport) {
    this.#assertUsable();
    const next = cloneViewport(viewport, 'RawControlState.viewport');
    if (next.width === this.#viewport.width && next.height === this.#viewport.height) {
      return false;
    }
    this.#viewport = next;
    this.#clearInternal();
    this.#touchRevision();
    return true;
  }

  pointerStart(point) {
    this.#assertUsable();
    const value = clonePoint(point, 'pointerStart');
    if (this.#suspended || this.#pointers.has(value.pointerId)) return false;
    const controlId = controlAtPoint(value, this.#viewport, this.#layout);
    if (
      controlId === null
      || this.#ownerByControl.has(controlId)
      || Object.values(this.#edgesByControl.get(controlId)).some(Boolean)
    ) return false;
    const record = {
      pointerId: value.pointerId,
      controlId,
      origin: { ...value },
      current: { ...value },
    };
    this.#pointers.set(value.pointerId, record);
    this.#ownerByControl.set(controlId, value.pointerId);
    this.#lastByControl.set(controlId, record);
    this.#edgesByControl.get(controlId).started = true;
    this.#touchRevision();
    return true;
  }

  pointerMove(point) {
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

  #release(point, cancelled) {
    const value = clonePoint(point, cancelled ? 'pointerCancel' : 'pointerEnd');
    const record = this.#pointers.get(value.pointerId);
    if (!record) return false;
    record.current = { ...value };
    this.#pointers.delete(value.pointerId);
    this.#ownerByControl.delete(record.controlId);
    this.#lastByControl.set(record.controlId, record);
    const edges = this.#edgesByControl.get(record.controlId);
    if (cancelled) edges.cancelled = true;
    else edges.ended = true;
    this.#touchRevision();
    return true;
  }

  pointerEnd(point) {
    this.#assertUsable();
    if (this.#suspended) return false;
    return this.#release(point, false);
  }

  pointerCancel(point) {
    this.#assertUsable();
    if (this.#suspended) return false;
    return this.#release(point, true);
  }

  suspend() {
    this.#assertUsable();
    if (this.#suspended) return false;
    this.#suspended = true;
    this.#clearInternal();
    this.#touchRevision();
    return true;
  }

  resume() {
    this.#assertUsable();
    if (!this.#suspended) return false;
    this.#suspended = false;
    this.#clearInternal();
    this.#touchRevision();
    return true;
  }

  #controlSnapshot(controlId) {
    const ownerId = this.#ownerByControl.get(controlId);
    const activeRecord = ownerId === undefined ? null : this.#pointers.get(ownerId);
    const record = activeRecord ?? this.#lastByControl.get(controlId);
    const radius = joystickRadius(this.#viewport, this.#layout);
    const delta = record
      ? normalizedControlDelta(record.origin, record.current, radius)
      : Object.freeze({
        x: 0,
        y: 0,
        rawX: 0,
        rawY: 0,
        magnitude: 0,
        rawMagnitude: 0,
      });
    const edges = this.#edgesByControl.get(controlId);
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

  #snapshot() {
    return Object.freeze({
      revision: this.#revision,
      suspended: this.#suspended,
      viewport: this.#viewport,
      move: this.#controlSnapshot(ARENA_CONTROL_ID.MOVE),
      primary: this.#controlSnapshot(ARENA_CONTROL_ID.PRIMARY),
      jump: this.#controlSnapshot(ARENA_CONTROL_ID.JUMP),
    });
  }

  consumeSnapshot() {
    this.#assertUsable();
    const snapshot = this.#snapshot();
    for (const controlId of CONTROL_IDS) {
      this.#edgesByControl.set(controlId, emptyEdges());
    }
    return snapshot;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return this.#snapshot();
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#suspended = true;
    this.#clearInternal();
  }
}
