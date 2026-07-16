import type { SaveEnvelope, SaveRepository } from '@number-strategy/persistence';

export class SaveScheduler {
  readonly repository: SaveRepository;
  pending: SaveEnvelope | null = null;
  readyAfterRender = false;
  queued = 0;
  flushes = 0;
  failedFlushes = 0;

  constructor(repository: SaveRepository) {
    this.repository = repository;
  }

  schedule(envelope: SaveEnvelope): void {
    this.pending = envelope;
    this.readyAfterRender = false;
    this.queued += 1;
  }

  flush(): boolean {
    if (!this.pending) return true;
    const envelope = this.pending;
    this.pending = null;
    this.readyAfterRender = false;
    this.flushes += 1;
    const saved = this.repository.save(envelope);
    if (!saved) {
      this.failedFlushes += 1;
      // Keep the latest unsaved envelope retryable. A storage adapter is allowed
      // to synchronously queue a newer envelope while save() is running; never
      // overwrite that newer state with the failed older snapshot.
      if (this.pending === null) this.pending = envelope;
      this.readyAfterRender = false;
    }
    return saved;
  }

  cancel(): void {
    this.pending = null;
    this.readyAfterRender = false;
  }

  afterRender(): boolean {
    if (!this.pending) return true;
    if (!this.readyAfterRender) {
      this.readyAfterRender = true;
      return true;
    }
    return this.flush();
  }

  diagnostics() {
    return Object.freeze({
      pending: this.pending !== null,
      readyAfterRender: this.readyAfterRender,
      queued: this.queued,
      flushes: this.flushes,
      failedFlushes: this.failedFlushes,
    });
  }
}
