import { migrateSaveEnvelope, type SaveEnvelope } from './save-envelope.js';

export const GAME_SAVE_KEY = 'number-strategy.game-save';

export interface PersistenceStoragePort {
  read(key: string): unknown;
  write(key: string, value: unknown): boolean;
  remove(key: string): boolean;
}

export interface SaveRepositoryDiagnostics {
  readonly loads: number;
  readonly migrations: number;
  readonly invalidLoads: number;
  readonly writeFailures: number;
  readonly removeFailures: number;
  readonly lastError: string | null;
}

export class SaveRepository {
  readonly storage: PersistenceStoragePort;
  loads = 0;
  migrations = 0;
  invalidLoads = 0;
  writeFailures = 0;
  removeFailures = 0;
  lastError: string | null = null;

  constructor(storage: PersistenceStoragePort) {
    this.storage = storage;
  }

  load(): SaveEnvelope | null {
    this.loads += 1;
    try {
      const raw = this.storage.read(GAME_SAVE_KEY);
      if (raw === undefined || raw === null) return null;
      const envelope = migrateSaveEnvelope(raw);
      const rawVersion = typeof raw === 'object' && raw !== null
        ? (raw as { version?: unknown }).version
        : undefined;
      if (rawVersion !== envelope.version) {
        this.migrations += 1;
        if (!this.storage.write(GAME_SAVE_KEY, envelope)) this.writeFailures += 1;
      }
      this.lastError = null;
      return envelope;
    } catch (error) {
      this.invalidLoads += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.clear();
      return null;
    }
  }

  save(envelope: SaveEnvelope): boolean {
    try {
      const validated = migrateSaveEnvelope(envelope);
      const saved = this.storage.write(GAME_SAVE_KEY, validated);
      if (!saved) this.writeFailures += 1;
      return saved;
    } catch (error) {
      this.writeFailures += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  clear(): boolean {
    try {
      const removed = this.storage.remove(GAME_SAVE_KEY);
      if (!removed) this.removeFailures += 1;
      return removed;
    } catch (error) {
      this.removeFailures += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  diagnostics(): SaveRepositoryDiagnostics {
    return Object.freeze({
      loads: this.loads,
      migrations: this.migrations,
      invalidLoads: this.invalidLoads,
      writeFailures: this.writeFailures,
      removeFailures: this.removeFailures,
      lastError: this.lastError,
    });
  }
}

export function exportSaveDiagnostics(
  envelope: SaveEnvelope | null,
  diagnostics: SaveRepositoryDiagnostics,
): string {
  return JSON.stringify({
    format: 'number-strategy-diagnostics',
    version: 1,
    generatedAtMs: Date.now(),
    save: envelope,
    diagnostics,
    privacy: 'local-only; gameplay state and replay commands only',
  }, null, 2);
}
