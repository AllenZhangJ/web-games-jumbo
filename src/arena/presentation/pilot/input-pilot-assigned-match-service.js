function validateMatchService(value) {
  if (!value || typeof value.create !== 'function') {
    throw new TypeError('InputPilotAssignedMatchService.matchService 必须实现 create()。');
  }
  return value;
}

function uint32(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value;
}

export class InputPilotAssignedMatchService {
  #matchService;
  #matchSeed;
  #created;
  #destroyed;

  constructor({ matchService, matchSeed }) {
    this.#matchService = validateMatchService(matchService);
    this.#matchSeed = uint32(matchSeed, 'InputPilotAssignedMatchService.matchSeed');
    this.#created = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  create(options = {}) {
    if (this.#destroyed) throw new Error('InputPilotAssignedMatchService 已销毁。');
    if (this.#created) throw new Error('一个 pilot assignment 只允许创建一局比赛。');
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('pilot match options 必须是对象。');
    }
    if (
      Object.prototype.hasOwnProperty.call(options, 'matchSeed')
      && options.matchSeed !== this.#matchSeed
    ) {
      throw new RangeError('pilot match options 不能覆盖 assignment matchSeed。');
    }
    this.#created = true;
    try {
      return this.#matchService.create({ ...options, matchSeed: this.#matchSeed });
    } catch (error) {
      this.#created = false;
      throw error;
    }
  }

  destroy() {
    if (this.#destroyed) return;
    try {
      this.#matchService?.destroy?.();
    } finally {
      this.#matchService = null;
      this.#destroyed = true;
    }
  }
}
