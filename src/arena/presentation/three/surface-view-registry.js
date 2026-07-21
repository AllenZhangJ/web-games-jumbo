import * as THREE from 'three';
import { disposeThreeObject } from './dispose-three-resources.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { toVisualPosition } from './visual-coordinate.js';

class SurfaceView {
  #definition;
  #mesh;
  #edge;
  #baseY;
  #enabled;
  #warning;
  #elapsed;
  #appliedStyleKey;

  constructor(definition) {
    this.#definition = definition;
    this.root = new THREE.Group();
    this.root.name = `ArenaSurface:${definition.id}`;
    const size = definition.halfExtents;
    const geometry = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
    const material = new THREE.MeshStandardMaterial({
      color: ARENA_GREYBOX_COLOR.platform,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 1,
    });
    this.#mesh = new THREE.Mesh(geometry, material);
    this.#mesh.castShadow = true;
    this.#mesh.receiveShadow = true;
    const edges = new THREE.EdgesGeometry(geometry, 25);
    this.#edge = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: ARENA_GREYBOX_COLOR.platformEdge,
      transparent: true,
      opacity: 0.55,
    }));
    this.#edge.scale.setScalar(1.002);
    this.root.add(this.#mesh, this.#edge);
    const visual = toVisualPosition(definition.center);
    this.root.position.set(visual.x, visual.y, visual.z);
    this.#baseY = visual.y;
    this.#enabled = true;
    this.#warning = false;
    this.#elapsed = 0;
    this.#appliedStyleKey = null;
  }

  sync({ enabled, warning }, { snap = false } = {}) {
    this.#enabled = enabled;
    this.#warning = warning;
    if (snap) {
      this.root.position.y = this.#baseY
        - (enabled ? 0 : ARENA_GREYBOX_DESIGN.surfaceDropDistance);
    }
  }

  update(deltaSeconds) {
    const delta = Math.min(0.1, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    this.#elapsed += delta;
    const targetY = this.#baseY
      - (this.#enabled ? 0 : ARENA_GREYBOX_DESIGN.surfaceDropDistance);
    const heightDelta = targetY - this.root.position.y;
    if (Math.abs(heightDelta) > 0.0001) {
      this.root.position.y += heightDelta * (1 - Math.exp(-7 * delta));
    } else {
      this.root.position.y = targetY;
    }
    const styleKey = `${this.#enabled}:${this.#warning}`;
    if (!this.#warning && styleKey === this.#appliedStyleKey) return;
    const pulse = 0.5 + Math.sin(this.#elapsed * 8) * 0.5;
    this.#mesh.material.color.setHex(
      this.#warning
        ? ARENA_GREYBOX_COLOR.warning
        : this.#enabled
          ? ARENA_GREYBOX_COLOR.platform
          : ARENA_GREYBOX_COLOR.platformDisabled,
    );
    this.#mesh.material.emissive.setHex(this.#warning ? ARENA_GREYBOX_COLOR.danger : 0x000000);
    this.#mesh.material.emissiveIntensity = this.#warning ? 0.08 + pulse * 0.12 : 0;
    this.#mesh.material.opacity = this.#enabled ? 1 : 0.25;
    this.#edge.material.opacity = this.#warning ? 0.9 : this.#enabled ? 0.55 : 0.12;
    this.#appliedStyleKey = styleKey;
  }

  getDebugSnapshot() {
    return Object.freeze({
      id: this.#definition.id,
      enabled: this.#enabled,
      warning: this.#warning,
    });
  }
}

function warningSurfaceIds(occurrences) {
  const ids = new Set();
  for (const occurrence of occurrences) {
    if (occurrence.kind !== 'collapse-surfaces' || occurrence.phase !== 'warning') continue;
    for (const id of occurrence.publicPayload?.surfaceIds ?? []) ids.add(id);
  }
  return ids;
}

export class SurfaceViewRegistry {
  #views;
  #disposed;

  constructor(root, definitions) {
    if (!root?.add || !Array.isArray(definitions) || definitions.length === 0) {
      throw new TypeError('SurfaceViewRegistry 需要 root 和 surface definitions。');
    }
    this.#views = new Map();
    this.#disposed = false;
    try {
      for (const definition of definitions) {
        if (this.#views.has(definition.id)) throw new RangeError(`重复 surface ${definition.id}。`);
        const view = new SurfaceView(definition);
        this.#views.set(definition.id, view);
        root.add(view.root);
      }
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('SurfaceViewRegistry 已销毁。');
  }

  sync(map, { snap = false } = {}) {
    this.#assertUsable();
    const warnings = warningSurfaceIds(map.occurrences);
    if (map.surfaces.length !== this.#views.size) {
      throw new RangeError('SurfaceViewRegistry 快照数量不一致。');
    }
    for (const surface of map.surfaces) {
      const view = this.#views.get(surface.id);
      if (!view) throw new RangeError(`SurfaceViewRegistry 缺少 ${surface.id}。`);
      view.sync({ enabled: surface.enabled, warning: warnings.has(surface.id) }, { snap });
    }
  }

  update(deltaSeconds) {
    this.#assertUsable();
    for (const view of this.#views.values()) view.update(deltaSeconds);
  }

  getDebugSnapshot() {
    this.#assertUsable();
    const surfaces = Object.freeze([...this.#views.values()].map((view) => view.getDebugSnapshot()));
    return Object.freeze({
      surfaceCount: this.#views.size,
      warningSurfaceCount: surfaces.filter(({ warning }) => warning).length,
      disabledSurfaceCount: surfaces.filter(({ enabled }) => !enabled).length,
      surfaces,
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const view of this.#views?.values() ?? []) {
      try { disposeThreeObject(view.root); } catch (error) { errors.push(error); }
    }
    this.#views?.clear();
    if (errors.length > 0) {
      const failure = new Error('SurfaceViewRegistry 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
