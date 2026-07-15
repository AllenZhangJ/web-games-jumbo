import { NumberStrategyGame } from '@number-strategy/application';
import { AudioFactorySoundPort, FeedbackController } from '@number-strategy/feedback';
import { Renderer3D } from '@number-strategy/renderer-three';

function createStoragePort(platform) {
  return {
    read: (key) => platform.storageGet?.(key),
    write: (key, value) => Boolean(platform.storageSet?.(key, value)),
    remove: (key) => Boolean(platform.storageSet?.(key, undefined)),
  };
}

function createFeedback(platform, storage) {
  return new FeedbackController({
    sound: new AudioFactorySoundPort(() => platform.createAudio?.() ?? null),
    haptic: {
      pulse: (cue) => Boolean(platform.vibrate?.(cue)),
      dispose: () => {},
    },
    storage,
  });
}

export function createNumberStrategyGame(platform, options = {}) {
  const {
    rendererOptions = {},
    feedback: injectedFeedback,
    storage: injectedStorage,
    ...gameOptions
  } = options;
  const storage = injectedStorage ?? createStoragePort(platform);
  const feedback = injectedFeedback ?? createFeedback(platform, storage);
  return new NumberStrategyGame(platform, {
    ...gameOptions,
    feedback,
    storage,
    rendererFactory: (canvas, rendererPlatform) => (
      new Renderer3D(canvas, rendererPlatform, rendererOptions)
    ),
  });
}
