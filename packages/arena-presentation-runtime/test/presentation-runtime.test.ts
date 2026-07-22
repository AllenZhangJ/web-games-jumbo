import { describe, expect, it } from 'vitest';
import {
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY,
  ARENA_V1_PRESENTATION_QUALITY_ID,
  FixedTickAccumulator,
  PresentationEventWindow,
  type PresentationFrame,
  PresentationFrameLoop,
  PresentationRenderPacer,
} from '../src/index.js';

describe('Arena Presentation runtime boundaries', () => {
  it('rejects option and event accessors without executing them', () => {
    let optionReads = 0;
    expect(() => new PresentationFrameLoop({
      get requestFrame() { optionReads += 1; return () => 1; },
      cancelFrame: () => {},
      now: () => 0,
      onError: () => {},
    })).toThrow(/requestFrame.*数据字段/);
    expect(optionReads).toBe(0);

    const window = new PresentationEventWindow();
    let eventReads = 0;
    expect(() => window.consume([{
      id: 'event:1',
      type: 'HitResolved',
      tick: 1,
      get sequence() { eventReads += 1; return 1; },
    }])).toThrow(/sequence.*数据字段|访问器/);
    expect(eventReads).toBe(0);
    expect(window.getDebugSnapshot().acceptedCount).toBe(0);
  });

  it('owns a null host frame token and suppresses its late callback after stop', () => {
    let pending: ((timestamp: unknown) => void) | null = null;
    const cancelled: unknown[] = [];
    const frames: unknown[] = [];
    const loop = new PresentationFrameLoop({
      requestFrame: (callback: (timestamp: unknown) => void) => { pending = callback; return null; },
      cancelFrame: (token: unknown) => { cancelled.push(token); },
      now: () => 0,
      onError: () => {},
    });
    loop.start((frame: PresentationFrame) => { frames.push(frame); });
    expect(loop.getDebugSnapshot().hasPendingFrame).toBe(true);
    const late = pending as unknown as ((timestamp: unknown) => void);
    expect(loop.stop()).toBe(true);
    expect(cancelled).toEqual([null]);
    late(16);
    expect(frames).toEqual([]);
    loop.destroy();
  });

  it('contains async callbacks and keeps accumulator overflow failures atomic', async () => {
    let pending: ((timestamp: unknown) => void) | null = null;
    const errors: unknown[] = [];
    const loop = new PresentationFrameLoop({
      requestFrame: (callback: (timestamp: unknown) => void) => { pending = callback; return 1; },
      cancelFrame: () => {},
      now: () => 0,
      onError: (error: unknown) => { errors.push(error); },
    });
    loop.start(async () => { throw new Error('late async failure'); });
    const deliver = pending as unknown as ((timestamp: unknown) => void);
    deliver(16);
    await Promise.resolve();
    expect(loop.getDebugSnapshot().state).toBe('failed');
    expect(errors).toHaveLength(1);

    const accumulator = new FixedTickAccumulator({
      fixedDeltaSeconds: Number.MIN_VALUE,
      maximumSteps: 4,
    });
    const before = accumulator.getDebugSnapshot();
    expect(() => accumulator.push(1)).toThrow(/步数必须保持有限/);
    expect(accumulator.getDebugSnapshot()).toEqual(before);
  });

  it('keeps the production high quality path and exact 30 FPS pacing values', () => {
    const high = ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
      ARENA_V1_PRESENTATION_QUALITY_ID.HIGH,
    );
    expect(high.maximumPixelRatio).toBe(2);
    expect(high.antialiasEnabled).toBe(true);
    const pacer = new PresentationRenderPacer({
      qualityDefinition: ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
        ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
      ),
    });
    expect([pacer.shouldRender(1 / 60), pacer.shouldRender(1 / 60)]).toEqual([false, true]);
  });
});
