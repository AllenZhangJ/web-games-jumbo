import { disposeThreeObject } from './dispose-three-resources.js';
import { createProgrammaticEquipment } from './programmatic-equipment.js';

class WorldEquipmentView {
  #instanceId;
  #definitionId;
  #baseY;
  #targetX;
  #targetZ;
  #elapsed;

  constructor(item) {
    this.#instanceId = item.instanceId;
    this.#definitionId = item.definitionId;
    this.root = createProgrammaticEquipment(item.definitionId);
    this.root.name = `ArenaEquipment:${item.instanceId}`;
    this.root.scale.setScalar(0.85);
    this.#baseY = 0;
    this.#targetX = 0;
    this.#targetZ = 0;
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
    this.#targetX = -item.position.x;
    this.#targetZ = item.position.z;
    this.#baseY = item.position.y + 0.34;
    if (snap) this.root.position.set(this.#targetX, this.#baseY, this.#targetZ);
  }

  update(deltaSeconds) {
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.#elapsed += delta;
    this.root.position.x += (this.#targetX - this.root.position.x) * (1 - Math.exp(-16 * delta));
    this.root.position.z += (this.#targetZ - this.root.position.z) * (1 - Math.exp(-16 * delta));
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
  #seenInstanceIds;
  #disposed;

  constructor(root) {
    if (!root?.add) throw new TypeError('EquipmentViewRegistry 需要 Object3D root。');
    this.#root = root;
    this.#views = new Map();
    this.#seenInstanceIds = new Set();
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('EquipmentViewRegistry 已销毁。');
  }

  sync(items, { snap = false } = {}) {
    this.#assertUsable();
    if (!Array.isArray(items)) throw new TypeError('EquipmentViewRegistry items 必须是数组。');
    this.#seenInstanceIds.clear();
    for (const item of items) {
      if (typeof item?.instanceId !== 'string' || item.instanceId.length === 0) {
        throw new TypeError('EquipmentViewRegistry item.instanceId 必须是非空字符串。');
      }
      if (this.#seenInstanceIds.has(item.instanceId)) {
        throw new RangeError(`EquipmentViewRegistry item ${item.instanceId} 重复。`);
      }
      this.#seenInstanceIds.add(item.instanceId);
    }
    this.#seenInstanceIds.clear();
    for (const item of items) {
      if (
        item.position !== null
        && (item.locationState === 'spawned' || item.locationState === 'dropped')
      ) this.#seenInstanceIds.add(item.instanceId);
    }
    for (const [instanceId, view] of this.#views) {
      if (this.#seenInstanceIds.has(instanceId)) continue;
      view.dispose();
      this.#views.delete(instanceId);
    }
    for (const item of items) {
      if (!this.#seenInstanceIds.has(item.instanceId)) continue;
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
    this.#seenInstanceIds.clear();
    if (errors.length > 0) {
      const failure = new Error('EquipmentViewRegistry 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
