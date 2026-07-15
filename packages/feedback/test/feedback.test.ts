import { describe, expect, it } from 'vitest';
import { AudioFactorySoundPort, FeedbackController, createProgrammaticTone } from '../src/index.js';

describe('feedback controller', () => {
  it('drives sound and haptics from events with independent persisted switches', () => {
    const sounds: string[] = [];
    const haptics: string[] = [];
    let stored: unknown;
    const controller = new FeedbackController({
      sound: { play: (cue) => { sounds.push(cue); return true; }, dispose: () => {} },
      haptic: { pulse: (cue) => { haptics.push(cue); return true; }, dispose: () => {} },
      storage: { read: () => stored, write: (_key, value) => { stored = value; return true; } },
    });
    controller.handle([{ id: 1, type: 'landed', occurredAtMs: 1, payload: {} }]);
    expect(sounds).toEqual(['land']);
    expect(haptics).toEqual(['light']);

    controller.updateSettings({ soundEnabled: false });
    controller.handle([{ id: 2, type: 'missed', occurredAtMs: 2, payload: {} }]);
    expect(sounds).toEqual(['land']);
    expect(haptics).toEqual(['light', 'heavy']);
    expect(stored).toMatchObject({ version: 1, soundEnabled: false, hapticEnabled: true });
  });

  it('loads valid settings and silently contains unavailable platform capabilities', () => {
    const controller = new FeedbackController({
      sound: { play: () => { throw new Error('blocked'); }, dispose: () => { throw new Error('broken'); } },
      haptic: { pulse: () => false, dispose: () => { throw new Error('broken'); } },
      storage: { read: () => ({ version: 1, soundEnabled: true, hapticEnabled: true }), write: () => false },
    });
    expect(() => controller.handle([{ id: 1, type: 'won', occurredAtMs: 1, payload: {} }])).not.toThrow();
    controller.updateSettings({ hapticEnabled: false });
    controller.dispose();
    expect(controller.diagnostics()).toMatchObject({
      soundFailures: 2,
      hapticFailures: 2,
      persistenceFailures: 1,
    });
  });

  it('creates reusable original programmatic WAV cues and disposes players', () => {
    expect(createProgrammaticTone(440, 50)).toMatch(/^data:audio\/wav;base64,/);
    let plays = 0;
    let destroys = 0;
    const port = new AudioFactorySoundPort(() => ({
      src: '',
      play: () => { plays += 1; },
      destroy: () => { destroys += 1; },
    }));
    expect(port.play('jump')).toBe(true);
    expect(port.play('jump')).toBe(true);
    expect(plays).toBe(2);
    port.dispose();
    expect(destroys).toBe(1);
  });
});
