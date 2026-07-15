export type ApplicationLifecycle = 'idle' | 'starting' | 'running' | 'failed' | 'destroyed';

const ALLOWED: Readonly<Record<ApplicationLifecycle, readonly ApplicationLifecycle[]>> = {
  idle: ['starting', 'destroyed'],
  starting: ['running', 'idle', 'failed', 'destroyed'],
  running: ['failed', 'destroyed'],
  failed: ['idle', 'destroyed'],
  destroyed: [],
};

export class LifecycleController {
  #state: ApplicationLifecycle = 'idle';

  get state(): ApplicationLifecycle {
    return this.#state;
  }

  transition(next: ApplicationLifecycle): void {
    if (next === this.#state) return;
    if (!ALLOWED[this.#state].includes(next)) {
      throw new Error(`非法生命周期转换：${this.#state} → ${next}`);
    }
    this.#state = next;
  }
}
