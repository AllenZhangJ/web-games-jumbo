import {
  NumberStrategyGame,
  type NumberStrategyGameOptions,
  type PlatformPort,
} from '@number-strategy/application';
import type { FeedbackPort, StoragePort } from '@number-strategy/game-contracts';
import { BUILTIN_CHARACTERS } from '@number-strategy/content';
import {
  AudioFactorySoundPort,
  FeedbackController,
  type AudioLike,
  type HapticCue,
} from '@number-strategy/feedback';
import { Renderer3D } from '@number-strategy/renderer-three';

interface EntryPlatform extends PlatformPort {
  createAudio?(): AudioLike | null;
  vibrate?(cue: HapticCue): unknown;
  storageGet?(key: string): unknown;
  storageSet?(key: string, value: unknown): unknown;
  storageRemove?(key: string): unknown;
}

export interface EntryGameOptions
  extends Omit<NumberStrategyGameOptions, 'rendererFactory' | 'feedback' | 'storage'> {
  readonly rendererOptions?: Readonly<Record<string, unknown>>;
  readonly feedback?: FeedbackPort;
  readonly storage?: StoragePort;
}

function createStoragePort(platform: EntryPlatform): StoragePort {
  return {
    read: (key) => platform.storageGet?.(key),
    write: (key, value) => Boolean(platform.storageSet?.(key, value)),
    remove: (key) => Boolean(platform.storageRemove?.(key)),
  };
}

function createFeedback(platform: EntryPlatform, storage: StoragePort): FeedbackPort {
  return new FeedbackController({
    sound: new AudioFactorySoundPort(() => platform.createAudio?.() ?? null),
    haptic: {
      pulse: (cue) => Boolean(platform.vibrate?.(cue)),
      dispose: () => {},
    },
    storage,
  });
}

export function createNumberStrategyGame(
  platform: EntryPlatform,
  options: EntryGameOptions = {},
): NumberStrategyGame {
  const {
    rendererOptions = {},
    feedback: injectedFeedback,
    storage: injectedStorage,
    ...gameOptions
  } = options;
  const storage = injectedStorage ?? createStoragePort(platform);
  const feedback = injectedFeedback ?? createFeedback(platform, storage);
  const characterCatalog = gameOptions.characterCatalog ?? BUILTIN_CHARACTERS.map((character) => ({
    id: character.id,
    version: character.version,
    name: character.presentation.name,
    description: character.presentation.description,
  }));
  return new NumberStrategyGame(platform, {
    ...gameOptions,
    characterCatalog,
    showContentMenu: gameOptions.showContentMenu ?? true,
    feedback,
    storage,
    rendererFactory: (canvas, rendererPlatform) => (
      new Renderer3D(canvas, rendererPlatform, {
        ...rendererOptions,
        characterId: gameOptions.characterId,
      })
    ),
  });
}
