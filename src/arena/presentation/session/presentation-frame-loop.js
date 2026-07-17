function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function safeTimestamp(timestamp, now, previous) {
  if (Number.isFinite(timestamp)) return timestamp;
  try {
    const fallback = now();
    if (Number.isFinite(fallback)) return fallback;
  } catch {
    // Use a monotonic synthetic timestamp when the host clock fails.
  }
  return previous === null ? 0 : previous + 1000 / 60;
}

export class PresentationFrameLoop {
  #requestFrame;
  #cancelFrame;
  #now;
  #onError;
  #maxDeltaSeconds;
  #callback;
  #token;
  #generation;
  #lastTimestamp;
  #state;
  #scheduling;
  #delivering;

  constructor({
    requestFrame,
    cancelFrame,
    now,
    onError,
    maxDeltaSeconds = 0.1,
  }) {
    this.#requestFrame = requiredFunction(requestFrame, 'PresentationFrameLoop.requestFrame');
    this.#cancelFrame = requiredFunction(cancelFrame, 'PresentationFrameLoop.cancelFrame');
    this.#now = requiredFunction(now, 'PresentationFrameLoop.now');
    this.#onError = requiredFunction(onError, 'PresentationFrameLoop.onError');
    if (!Number.isFinite(maxDeltaSeconds) || maxDeltaSeconds <= 0) {
      throw new RangeError('PresentationFrameLoop.maxDeltaSeconds 必须大于 0。');
    }
    this.#maxDeltaSeconds = maxDeltaSeconds;
    this.#callback = null;
    this.#token = null;
    this.#generation = 0;
    this.#lastTimestamp = null;
    this.#state = 'idle';
    this.#scheduling = false;
    this.#delivering = false;
  }

  #report(error) {
    try { this.#onError(error); } catch { /* diagnostics cannot restart the loop */ }
  }

  #schedule() {
    if (this.#state !== 'running' || this.#token !== null || this.#scheduling) return false;
    this.#scheduling = true;
    const generation = this.#generation;
    let synchronous = true;
    let invokedSynchronously = false;
    let token;
    try {
      token = this.#requestFrame((timestamp) => {
        if (synchronous) {
          invokedSynchronously = true;
          return;
        }
        if (this.#state !== 'running' || generation !== this.#generation) return;
        this.#token = null;
        this.#deliver(timestamp, generation);
      });
      synchronous = false;
      if (invokedSynchronously) {
        try { this.#cancelFrame(token); } catch { /* callback was already suppressed */ }
        throw new Error('PresentationFrameLoop 不接受同步 requestFrame 回调。');
      }
      this.#token = token;
      return true;
    } finally {
      synchronous = false;
      this.#scheduling = false;
    }
  }

  #deliver(timestamp, generation) {
    if (this.#delivering) {
      this.#state = 'failed';
      this.#report(new Error('PresentationFrameLoop callback 不可重入。'));
      return;
    }
    this.#delivering = true;
    try {
      const normalized = safeTimestamp(timestamp, this.#now, this.#lastTimestamp);
      let deltaSeconds = 0;
      if (this.#lastTimestamp !== null) {
        const raw = (normalized - this.#lastTimestamp) / 1000;
        deltaSeconds = Math.min(
          this.#maxDeltaSeconds,
          Math.max(0, Number.isFinite(raw) ? raw : 0),
        );
      }
      this.#lastTimestamp = normalized;
      const shouldContinue = this.#callback(Object.freeze({
        timestamp: normalized,
        deltaSeconds,
      })) !== false;
      if (!shouldContinue && this.#state === 'running' && generation === this.#generation) {
        this.#state = 'idle';
        this.#callback = null;
      }
    } catch (error) {
      if (this.#state !== 'destroyed') this.#state = 'failed';
      this.#report(error);
    } finally {
      this.#delivering = false;
    }
    if (this.#state === 'running' && generation === this.#generation) {
      try {
        this.#schedule();
      } catch (error) {
        this.#state = 'failed';
        this.#report(error);
      }
    }
  }

  start(callback) {
    if (this.#state === 'destroyed') throw new Error('PresentationFrameLoop 已销毁。');
    if (this.#state === 'failed') throw new Error('PresentationFrameLoop 已失败。');
    requiredFunction(callback, 'PresentationFrameLoop.callback');
    if (this.#state === 'running') return false;
    this.#callback = callback;
    this.#lastTimestamp = null;
    this.#generation += 1;
    this.#state = 'running';
    try {
      this.#schedule();
      return true;
    } catch (error) {
      this.#state = 'failed';
      this.#callback = null;
      this.#report(error);
      throw error;
    }
  }

  stop() {
    if (this.#state === 'destroyed' || this.#state === 'idle') return false;
    this.#generation += 1;
    const token = this.#token;
    this.#token = null;
    this.#callback = null;
    this.#lastTimestamp = null;
    if (this.#state !== 'failed') this.#state = 'idle';
    if (token !== null) {
      try { this.#cancelFrame(token); } catch { /* generation suppresses late callbacks */ }
    }
    return true;
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      hasPendingFrame: this.#token !== null,
      generation: this.#generation,
      lastTimestamp: this.#lastTimestamp,
      scheduling: this.#scheduling,
      delivering: this.#delivering,
    });
  }

  destroy() {
    if (this.#state === 'destroyed') return;
    this.stop();
    this.#generation += 1;
    this.#state = 'destroyed';
    this.#callback = null;
  }
}
