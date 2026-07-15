import type { FeedbackPort, GameEvent } from '@number-strategy/game-contracts';
import type { HapticCue, HapticPort, SettingsStoragePort, SoundCue, SoundPort } from './ports.js';
import {
  DEFAULT_FEEDBACK_SETTINGS,
  loadFeedbackSettings,
  saveFeedbackSettings,
  type FeedbackSettings,
} from './settings.js';

interface FeedbackAction {
  readonly sound?: SoundCue;
  readonly haptic?: HapticCue;
}

const ACTIONS: Readonly<Record<string, FeedbackAction>> = Object.freeze({
  'jump-started': { sound: 'jump', haptic: 'light' },
  landed: { sound: 'land', haptic: 'light' },
  missed: { sound: 'miss', haptic: 'heavy' },
  won: { sound: 'win', haptic: 'heavy' },
  restarted: { sound: 'restart', haptic: 'light' },
});

export interface FeedbackDiagnostics {
  readonly handledEvents: number;
  readonly soundFailures: number;
  readonly hapticFailures: number;
  readonly persistenceFailures: number;
}

export class FeedbackController implements FeedbackPort {
  readonly sound: SoundPort;
  readonly haptic: HapticPort;
  readonly storage: SettingsStoragePort;
  settings: FeedbackSettings;
  disposed = false;
  handledEvents = 0;
  soundFailures = 0;
  hapticFailures = 0;
  persistenceFailures = 0;

  constructor({
    sound,
    haptic,
    storage,
  }: {
    readonly sound: SoundPort;
    readonly haptic: HapticPort;
    readonly storage: SettingsStoragePort;
  }) {
    this.sound = sound;
    this.haptic = haptic;
    this.storage = storage;
    this.settings = loadFeedbackSettings(storage);
  }

  handle(events: readonly GameEvent[]): void {
    if (this.disposed) return;
    for (const event of events) {
      this.handledEvents += 1;
      const action = ACTIONS[event.type];
      if (!action) continue;
      if (this.settings.soundEnabled && action.sound) this.invokeSound(action.sound);
      if (this.settings.hapticEnabled && action.haptic) this.invokeHaptic(action.haptic);
    }
  }

  updateSettings(patch: Partial<Pick<FeedbackSettings, 'soundEnabled' | 'hapticEnabled'>>): FeedbackSettings {
    if (this.disposed) throw new Error('FeedbackController 已销毁。');
    const settings = Object.freeze({
      version: DEFAULT_FEEDBACK_SETTINGS.version,
      soundEnabled: patch.soundEnabled ?? this.settings.soundEnabled,
      hapticEnabled: patch.hapticEnabled ?? this.settings.hapticEnabled,
    });
    this.settings = settings;
    if (!saveFeedbackSettings(this.storage, settings)) this.persistenceFailures += 1;
    return settings;
  }

  diagnostics(): FeedbackDiagnostics {
    return Object.freeze({
      handledEvents: this.handledEvents,
      soundFailures: this.soundFailures,
      hapticFailures: this.hapticFailures,
      persistenceFailures: this.persistenceFailures,
    });
  }

  private invokeSound(cue: SoundCue): void {
    try {
      const result = this.sound.play(cue);
      if (result && typeof result === 'object') {
        void result.catch(() => { this.soundFailures += 1; });
      } else if (!result) this.soundFailures += 1;
    } catch {
      this.soundFailures += 1;
    }
  }

  private invokeHaptic(cue: HapticCue): void {
    try {
      const result = this.haptic.pulse(cue);
      if (result && typeof result === 'object') {
        void result.catch(() => { this.hapticFailures += 1; });
      } else if (!result) this.hapticFailures += 1;
    } catch {
      this.hapticFailures += 1;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try { this.sound.dispose(); } catch { this.soundFailures += 1; }
    try { this.haptic.dispose(); } catch { this.hapticFailures += 1; }
  }
}
