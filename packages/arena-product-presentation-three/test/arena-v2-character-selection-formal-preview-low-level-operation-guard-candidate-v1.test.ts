import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MOUNT_SOURCE = readFileSync(new URL(
  '../src/arena-v2-character-selection-formal-preview-mount-candidate-v1.ts',
  import.meta.url,
), 'utf8');
const RENDER_SOURCE = readFileSync(new URL(
  '../src/arena-v2-character-selection-formal-preview-render-surface-candidate-v1.ts',
  import.meta.url,
), 'utf8');

describe('Arena V2 character selection formal preview low-level operation guards', () => {
  it('P6.230 keeps mount replacement and cleanup under one sticky operation owner', () => {
    expect(MOUNT_SOURCE).toContain('#operation: string | null = null');
    expect(MOUNT_SOURCE).toContain('检测到被Three子回调吞掉的同步重入');
    for (const operation of ['mount', 'snapshot', 'clear', 'destroy']) {
      expect(MOUNT_SOURCE).toContain(`#runSynchronousOperation('${operation}'`);
    }
    expect(MOUNT_SOURCE).toContain('synchronousMountSnapshotClearAndDestroyGuarded: true');
    expect(MOUNT_SOURCE).toContain('swallowedThreeAndMixerReentryFailsClosed: true');
  });

  it('P6.230 prevents swallowed renderer reentry from committing a frame or destroy terminal', () => {
    expect(RENDER_SOURCE).toContain('#operation: string | null = null');
    expect(RENDER_SOURCE).toContain('检测到被Renderer吞掉的同步重入');
    for (const operation of ['render', 'snapshot', 'destroy']) {
      expect(RENDER_SOURCE).toContain(`#runSynchronousOperation('${operation}'`);
    }
    expect(RENDER_SOURCE).toContain('synchronousRenderSnapshotAndDestroyGuarded: true');
    expect(RENDER_SOURCE).toContain('swallowedRendererReentryFailsClosed: true');
  });

  it('does not add a renderer, frame loop, asset or gameplay authority', () => {
    expect(MOUNT_SOURCE).toContain('createsRenderer: false');
    expect(MOUNT_SOURCE).toContain('createsRaf: false');
    expect(RENDER_SOURCE).toContain('injectedRendererOnly: true');
    expect(RENDER_SOURCE).toContain('createsRaf: false');
    expect(RENDER_SOURCE).not.toContain('requestAnimationFrame(');
  });
});
