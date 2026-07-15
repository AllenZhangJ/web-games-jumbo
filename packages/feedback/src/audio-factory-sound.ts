import type { AudioFactory, AudioLike, SoundCue, SoundPort } from './ports.js';

const TONES: Readonly<Record<SoundCue, readonly [frequency: number, durationMs: number]>> = Object.freeze({
  jump: [440, 90],
  land: [620, 70],
  miss: [150, 180],
  win: [880, 240],
  restart: [330, 80],
});

function encodeBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const value = (first << 16) | (second << 8) | third;
    output += alphabet[(value >>> 18) & 63];
    output += alphabet[(value >>> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[value & 63] : '=';
  }
  return output;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function createProgrammaticTone(frequency: number, durationMs: number): string {
  const sampleRate = 8_000;
  const sampleCount = Math.max(1, Math.floor(sampleRate * durationMs / 1_000));
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const envelope = Math.sin(Math.PI * progress) ** 2;
    const sample = Math.sin(2 * Math.PI * frequency * index / sampleRate) * envelope * 0.28;
    view.setInt16(44 + index * 2, Math.round(sample * 0x7fff), true);
  }
  return `data:audio/wav;base64,${encodeBase64(new Uint8Array(buffer))}`;
}

export class AudioFactorySoundPort implements SoundPort {
  readonly factory: AudioFactory;
  readonly #players = new Map<SoundCue, AudioLike>();
  disposed = false;

  constructor(factory: AudioFactory) {
    this.factory = factory;
  }

  play(cue: SoundCue): boolean {
    if (this.disposed) return false;
    try {
      let player = this.#players.get(cue);
      if (!player) {
        player = this.factory() ?? undefined;
        if (!player) return false;
        const [frequency, durationMs] = TONES[cue];
        player.src = createProgrammaticTone(frequency, durationMs);
        player.volume = 0.22;
        this.#players.set(cue, player);
      }
      player.stop?.();
      player.seek?.(0);
      if ('currentTime' in player) {
        try { player.currentTime = 0; } catch { /* Mini-game audio may expose a readonly cursor. */ }
      }
      const result = player.play();
      if (result && typeof result === 'object' && 'catch' in result) {
        const promise = result as Promise<unknown>;
        void promise.catch(() => false);
      }
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const player of this.#players.values()) {
      try { player.pause?.(); } catch { /* Continue disposing the remaining players. */ }
      try { player.stop?.(); } catch { /* Continue disposing the remaining players. */ }
      try { player.destroy?.(); } catch { /* Continue disposing the remaining players. */ }
    }
    this.#players.clear();
  }
}
