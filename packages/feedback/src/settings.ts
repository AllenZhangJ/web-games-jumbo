import type { SettingsStoragePort } from './ports.js';

export const FEEDBACK_SETTINGS_KEY = 'number-strategy.feedback-settings';
export const FEEDBACK_SETTINGS_VERSION = 1 as const;

export interface FeedbackSettings {
  readonly version: typeof FEEDBACK_SETTINGS_VERSION;
  readonly soundEnabled: boolean;
  readonly hapticEnabled: boolean;
}

export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = Object.freeze({
  version: FEEDBACK_SETTINGS_VERSION,
  soundEnabled: true,
  hapticEnabled: true,
});

export function parseFeedbackSettings(value: unknown): FeedbackSettings {
  if (!value || typeof value !== 'object') return DEFAULT_FEEDBACK_SETTINGS;
  const candidate = value as Partial<FeedbackSettings>;
  if (
    candidate.version !== FEEDBACK_SETTINGS_VERSION
    || typeof candidate.soundEnabled !== 'boolean'
    || typeof candidate.hapticEnabled !== 'boolean'
  ) return DEFAULT_FEEDBACK_SETTINGS;
  return Object.freeze({
    version: FEEDBACK_SETTINGS_VERSION,
    soundEnabled: candidate.soundEnabled,
    hapticEnabled: candidate.hapticEnabled,
  });
}

export function loadFeedbackSettings(storage: SettingsStoragePort): FeedbackSettings {
  try {
    return parseFeedbackSettings(storage.read(FEEDBACK_SETTINGS_KEY));
  } catch {
    return DEFAULT_FEEDBACK_SETTINGS;
  }
}

export function saveFeedbackSettings(
  storage: SettingsStoragePort,
  settings: FeedbackSettings,
): boolean {
  try {
    return storage.write(FEEDBACK_SETTINGS_KEY, settings);
  } catch {
    return false;
  }
}
