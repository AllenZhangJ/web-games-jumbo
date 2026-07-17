function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function validatePlatform(value) {
  if (!value || typeof value !== 'object') throw new TypeError('PointerInputAdapter.platform 无效。');
  for (const method of ['bindInput', 'onResize', 'onShow', 'onHide']) {
    requiredFunction(value[method], `PointerInputAdapter.platform.${method}`);
  }
  return value;
}

function validateSampler(value) {
  if (!value || typeof value !== 'object') throw new TypeError('PointerInputAdapter.sampler 无效。');
  for (const method of [
    'pointerStart',
    'pointerMove',
    'pointerEnd',
    'pointerCancel',
    'resize',
    'suspend',
    'resume',
  ]) requiredFunction(value[method], `PointerInputAdapter.sampler.${method}`);
  return value;
}

export class PointerInputAdapter {
  #platform;
  #sampler;
  #viewportProvider;
  #onError;
  #cleanups;
  #state;
  #destroyRequested;

  constructor({ platform, sampler, viewportProvider, onError = () => {} }) {
    this.#platform = validatePlatform(platform);
    this.#sampler = validateSampler(sampler);
    this.#viewportProvider = requiredFunction(
      viewportProvider,
      'PointerInputAdapter.viewportProvider',
    );
    this.#onError = requiredFunction(onError, 'PointerInputAdapter.onError');
    this.#cleanups = [];
    this.#state = 'idle';
    this.#destroyRequested = false;
    Object.freeze(this);
  }

  #report(error) {
    try { this.#onError(error); } catch { /* diagnostics cannot break input cleanup */ }
  }

  #dispatch(callback) {
    return (...args) => {
      if (this.#state !== 'started') return false;
      try {
        return callback(...args);
      } catch (error) {
        this.#report(error);
        return false;
      }
    };
  }

  #cleanup(values) {
    for (const cleanup of [...values].reverse()) {
      try { cleanup(); } catch (error) { this.#report(error); }
    }
  }

  start() {
    if (this.#state === 'destroyed' || this.#destroyRequested) {
      throw new Error('PointerInputAdapter 已销毁。');
    }
    if (this.#state === 'started') return false;
    if (this.#state === 'starting') throw new Error('PointerInputAdapter.start() 不可重入。');
    if (this.#state === 'stopping') {
      throw new Error('PointerInputAdapter.stop() 期间不能 start。');
    }
    this.#state = 'starting';
    const cleanups = [];
    const register = (cleanup) => {
      if (typeof cleanup !== 'function') {
        throw new TypeError('PointerInputAdapter 平台绑定必须返回 cleanup 函数。');
      }
      cleanups.push(cleanup);
      if (this.#destroyRequested) {
        throw new Error('PointerInputAdapter 启动期间已请求销毁。');
      }
    };
    try {
      this.#sampler.resize(this.#viewportProvider());
      register(this.#platform.bindInput({
        onStart: this.#dispatch((point) => this.#sampler.pointerStart(point)),
        onMove: this.#dispatch((point) => this.#sampler.pointerMove(point)),
        onEnd: this.#dispatch((point) => this.#sampler.pointerEnd(point)),
        onCancel: this.#dispatch((point) => this.#sampler.pointerCancel(point)),
      }));
      register(this.#platform.onResize(this.#dispatch(() => (
        this.#sampler.resize(this.#viewportProvider())
      ))));
      register(this.#platform.onHide(this.#dispatch(() => this.#sampler.suspend())));
      register(this.#platform.onShow(this.#dispatch(() => this.#sampler.resume())));
      this.#cleanups = cleanups;
      this.#state = 'started';
      return true;
    } catch (error) {
      this.#cleanup(cleanups.filter((cleanup) => typeof cleanup === 'function'));
      this.#state = this.#destroyRequested ? 'destroyed' : 'idle';
      throw error;
    }
  }

  stop() {
    if (this.#state === 'destroyed' || this.#state === 'idle') return false;
    if (this.#state === 'starting') throw new Error('PointerInputAdapter.start() 期间不能 stop。');
    if (this.#state === 'stopping') return false;
    this.#state = 'stopping';
    const cleanups = this.#cleanups.splice(0);
    this.#cleanup(cleanups);
    try { this.#sampler.suspend(); } catch (error) { this.#report(error); }
    this.#state = this.#destroyRequested ? 'destroyed' : 'idle';
    return true;
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      cleanupCount: this.#cleanups.length,
      destroyRequested: this.#destroyRequested,
    });
  }

  destroy() {
    if (this.#state === 'destroyed' || this.#destroyRequested) return;
    this.#destroyRequested = true;
    if (this.#state === 'starting' || this.#state === 'stopping') return;
    this.stop();
    this.#state = 'destroyed';
  }
}
