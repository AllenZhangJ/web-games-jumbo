import * as THREE from 'three';
import { disposeThreeObject } from './dispose-three-resources.js';
import { createProgrammaticEquipment } from './programmatic-equipment.js';
import { toVisualPosition } from './visual-coordinate.js';

class WorldEquipmentView {
  #instanceId;
  #definitionId;
  #baseY;
  #elapsed;

  constructor(item) {
    this.#instanceId = item.instanceId;
    this.#definitionId = item.definitionId;
    this.root = createProgrammaticEquipment(item.definitionId);
    this.root.name = `ArenaEquipment:${item.instanceId}`;
    this.root.scale.setScalar(0.85);
    this.#baseY = 0;
    this.#elapsed = 0;
    this.sync(item, { snap: true });
  }

  get definitionId() {
    return this.#definitionId;
  }

  sync(item, { snap = false } = {}) {
    if (item.instanceId !== this.#instanceId || item.definitionId !== this.#definitionId) {
      throw new RangeError('WorldEquipmentView 身份不一致。');
    }
    const position = toVisualPosition(item.position);
    this.root.userData.targetPosition = position;
    this.#baseY = position.y + 0.34;
    if (snap) this.root.position.set(position.x, this.#baseY, position.z);
  }

  update(deltaSeconds) {
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.#elapsed += delta;
    const target = this.root.userData.targetPosition;
    this.root.position.x += (target.x - this.root.position.x) * (1 - Math.exp(-16 * delta));
    this.root.position.z += (target.z - this.root.position.z) * (1 - Math.exp(-16 * delta));
    this.root.position.y = this.#baseY + Math.sin(this.#elapsed * 3.4) * 0.1;
    this.root.rotation.y += delta * 0.8;
  }

  dispose() {
    disposeThreeObject(this.root);
  }
}

export class EquipmentViewRegistry {
  #root;
  #views;
  #disposed;

  constructor(root) {
    if (!root?.add) throw new TypeError('EquipmentViewRegistry 需要 Object3D root。');
    this.#root = root;
    this.#views = new Map();
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('EquipmentViewRegistry 已销毁。');
  }

  sync(items, { snap = false } = {}) {
    this.#assertUsable();
    if (!Array.isArray(items)) throw new TypeError('EquipmentViewRegistry items 必须是数组。');
    const worldItems = items.filter(({ position, locationState }) => (
      position !== null && (locationState === 'spawned' || locationState === 'dropped')
    ));
    const nextIds = new Set(worldItems.map(({ instanceId }) => instanceId));
    for (const [instanceId, view] of this.#views) {
      if (nextIds.has(instanceId)) continue;
      view.dispose();
      this.#views.delete(instanceId);
    }
    for (const item of worldItems) {
      let view = this.#views.get(item.instanceId);
      if (view && view.definitionId !== item.definitionId) {
        view.dispose();
        this.#views.delete(item.instanceId);
        view = null;
      }
      if (!view) {
        view = new WorldEquipmentView(item);
        this.#views.set(item.instanceId, view);
        this.#root.add(view.root);
      }
      view.sync(item, { snap });
    }
  }

  update(deltaSeconds) {
    this.#assertUsable();
    for (const view of this.#views.values()) view.update(deltaSeconds);
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({ equipmentCount: this.#views.size });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const view of this.#views.values()) {
      try { view.dispose(); } catch (error) { errors.push(error); }
    }
    this.#views.clear();
    if (errors.length > 0) {
      const failure = new Error('EquipmentViewRegistry 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
