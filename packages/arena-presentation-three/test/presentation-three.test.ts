import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  EquipmentViewRegistry,
  ThreeObjectDisposalLease,
  toVisualPosition,
} from '../src/index.js';

describe('Arena Presentation Three lifecycle boundaries', () => {
  it('retries only failed Three resources and never repeats successful cleanup', () => {
    const calls = { texture: 0, material: 0, geometry: 0, detach: 0 };
    const texture = new THREE.Texture();
    texture.dispose = () => { calls.texture += 1; };
    const material = {
      map: texture,
      dispose() {
        calls.material += 1;
        if (calls.material === 1) throw new Error('transient material cleanup');
      },
    };
    const geometry = { dispose: () => { calls.geometry += 1; } };
    const root = {
      traverse: (visit: (object: unknown) => void) => { visit({ geometry, material }); },
      removeFromParent: () => { calls.detach += 1; },
    };
    const lease = new ThreeObjectDisposalLease(root);
    expect(() => lease.dispose()).toThrow(/清理未完整完成/);
    expect(calls).toEqual({ texture: 1, material: 1, geometry: 1, detach: 1 });
    expect(lease.complete).toBe(false);
    lease.dispose();
    lease.dispose();
    expect(calls).toEqual({ texture: 1, material: 2, geometry: 1, detach: 1 });
    expect(lease.complete).toBe(true);
  });

  it('rejects coordinate and lifecycle accessors without executing them', () => {
    let reads = 0;
    expect(() => toVisualPosition({
      get x() { reads += 1; return 1; },
      y: 2,
      z: 3,
    })).toThrow(/x.*数据字段/);
    expect(reads).toBe(0);

    const root = {
      get traverse() { reads += 1; return () => {}; },
      removeFromParent: () => {},
    };
    expect(() => new ThreeObjectDisposalLease(root)).toThrow(/traverse.*数据方法/);
    expect(reads).toBe(0);
  });

  it('validates the whole equipment snapshot before mutation and retains failed detach ownership', () => {
    const roots: unknown[] = [];
    let removeAttempts = 0;
    const registry = new EquipmentViewRegistry({
      add: (root: unknown) => { roots.push(root); },
      remove: (root: unknown) => {
        removeAttempts += 1;
        if (removeAttempts <= 2) throw new Error('transient detach failure');
        const index = roots.indexOf(root);
        if (index >= 0) roots.splice(index, 1);
      },
    });
    const item = {
      instanceId: 'equipment-1', definitionId: 'hammer',
      position: { x: 1, y: 2, z: 3 }, locationState: 'spawned',
    };
    registry.sync([item], { snap: true });
    expect(roots).toHaveLength(1);
    let itemReads = 0;
    const accessorItems: unknown[] = [];
    Object.defineProperty(accessorItems, '0', {
      enumerable: true,
      get() { itemReads += 1; return item; },
    });
    expect(() => registry.sync(accessorItems)).toThrow(/空槽或访问器/);
    expect(itemReads).toBe(0);
    expect(() => registry.sync([item, item])).toThrow(/重复/);
    expect(registry.getDebugSnapshot()).toEqual({ equipmentCount: 1 });
    expect(() => registry.sync([])).toThrow(/清理未完整完成/);
    expect(() => registry.update(0)).toThrow(/已失败/);
    expect(roots).toHaveLength(1);
    registry.dispose();
    registry.dispose();
    expect(roots).toHaveLength(0);
    expect(removeAttempts).toBe(3);
  });
});
