import { describe, expect, it } from 'vitest';
import {
  createFrameScheduler,
  createPlatformContract,
  normalizeCanvasSize,
} from '../src/index.js';
import type {
  ArenaPlatformContract,
  FrameScheduler,
  PlatformContractOverrides,
  PlatformStorageConcurrency,
} from '../src/index.js';

describe('Arena platform contracts', () => {
  it('publishes typed canvas and storage-concurrency boundaries', () => {
    const concurrency: PlatformStorageConcurrency = 'single-active-runtime';
    const platform: ArenaPlatformContract = createPlatformContract({
      id: 'typed-host',
      storageConcurrency: concurrency,
    });
    expect(platform.id).toBe('typed-host');
    expect(platform.storageConcurrency).toBe(concurrency);
    expect(normalizeCanvasSize(390.9, 844.2, 'typed-host')).toEqual({
      width: 390,
      height: 844,
    });
    const invalid = { storageConcurrency: 'unsupported' } as unknown as PlatformContractOverrides;
    expect(() => createPlatformContract(invalid)).toThrow(/storageConcurrency/);
  });

  it('treats an undefined host frame id as one scheduled frame', () => {
    let hostCallback: (() => void) | null = null;
    const scheduler: FrameScheduler = createFrameScheduler({
      request(callback) {
        hostCallback = callback;
        return undefined;
      },
      now: () => 123,
    });
    const timestamps: number[] = [];
    const token = scheduler.requestFrame((timestamp) => timestamps.push(timestamp));
    expect(scheduler.cancelFrame(token)).toBe(true);
    if (hostCallback === null) throw new Error('宿主帧回调未注册。');
    (hostCallback as () => void)();
    expect(timestamps).toEqual([]);
  });
});
