import { expect, test } from 'vitest';
import * as THREE from 'three';
import { PlatformMeshFactory } from '../src/world/platform-mesh-factory.js';
import { PlatformViewRegistry } from '../src/world/platform-view-registry.js';
import { CoreEffectsRuntime } from '../src/effects/core-effects-runtime.js';
import { RENDER_QUALITY_PROFILES } from '../src/diagnostics/performance-budget.js';

function platform(id: string, role: 'current' | 'candidate', x: number) {
  return {
    id,
    role,
    center: { x, z: 4 },
    heading: { x: 0, z: 1 },
    halfWidth: 1.05,
    halfDepth: 0.75,
    topY: 0,
    height: 0.34,
    operation: role === 'candidate' ? { label: x < 0 ? '+1' : '×2' } : null,
    preview: role === 'candidate' ? 12 : null,
  };
}

test('100 presentation rounds keep platform resources bounded and dispose the final graph', () => {
  const root = new THREE.Group();
  const factory = new PlatformMeshFactory({ platformLabel: () => null });
  const registry = new PlatformViewRegistry(root, factory);

  for (let round = 0; round < 100; round += 1) {
    const current = platform(`round-${round}-current`, 'current', 0);
    const left = platform(`round-${round}-left`, 'candidate', -1.4);
    const right = platform(`round-${round}-right`, 'candidate', 1.4);
    registry.sync([current, left, right], {
      candidates: [left, right],
      current,
      player: { supportPlatformId: current.id },
      selectedChoice: round % 2,
      reducedMotion: true,
    }, 1 / 60);

    expect(registry.ids()).toHaveLength(3);
    expect(root.children).toHaveLength(3);
  }

  registry.dispose();
  expect(registry.ids()).toEqual([]);
  expect(root.children).toHaveLength(0);
});

test('100 effect rounds reuse the low-quality pool and release the graph', () => {
  const root = new THREE.Group();
  const runtime = new CoreEffectsRuntime(root, RENDER_QUALITY_PROFILES.low);
  const position = { x: 0, y: 0, z: 0 };

  for (let round = 0; round < 100; round += 1) {
    runtime.update({
      characterPosition: position,
      landingPosition: position,
      deltaSeconds: 1 / 60,
      isJumping: true,
      reducedMotion: false,
      stepAdvanced: true,
      stepReset: false,
      color: 0xe53935,
    });
    for (let frame = 0; frame < 60; frame += 1) {
      runtime.update({
        characterPosition: position,
        landingPosition: position,
        deltaSeconds: 1 / 60,
        isJumping: false,
        reducedMotion: false,
        stepAdvanced: false,
        stepReset: false,
        color: 0xe53935,
      });
    }
    expect(runtime.snapshot()).toMatchObject({ particles: 0 });
    expect(runtime.trail.pointCount).toBeLessThanOrEqual(RENDER_QUALITY_PROFILES.low.trailPointLimit);
    expect(root.children).toHaveLength(2);
  }

  runtime.dispose();
  expect(root.children).toHaveLength(0);
});
