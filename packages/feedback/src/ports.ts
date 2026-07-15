export type SoundCue = 'jump' | 'land' | 'miss' | 'win' | 'restart';
export type HapticCue = 'light' | 'heavy';

export interface SoundPort {
  play(cue: SoundCue): boolean | Promise<boolean>;
  dispose(): void;
}

export interface HapticPort {
  pulse(cue: HapticCue): boolean | Promise<boolean>;
  dispose(): void;
}

export interface SettingsStoragePort {
  read(key: string): unknown;
  write(key: string, value: unknown): boolean;
}

export interface AudioLike {
  src: string;
  volume?: number;
  currentTime?: number;
  play(): unknown;
  pause?(): void;
  stop?(): void;
  seek?(position: number): void;
  destroy?(): void;
}

export type AudioFactory = () => AudioLike | null;
