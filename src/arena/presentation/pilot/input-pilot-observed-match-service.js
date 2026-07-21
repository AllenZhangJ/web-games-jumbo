import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { InputPilotObservedSession } from './input-pilot-observed-session.js';

function validateMatchService(value) {
  if (!value || typeof value.create !== 'function') {
    throw new TypeError('InputPilotObservedMatchService.matchService 必须实现 create()。');
  }
  return value;
}

function validateCollector(value) {
  if (!value || typeof value.observeStep !== 'function') {
    throw new TypeError('InputPilotObservedMatchService.collector 必须实现 observeStep()。');
  }
  return value;
}

function createObservedMatch(match, session) {
  if (!Number.isSafeInteger(match.matchSeed) || match.matchSeed < 0 || match.matchSeed > 0xffffffff) {
    throw new RangeError('pilot match.matchSeed 必须是 uint32。');
  }
  return Object.freeze({
    matchSeed: match.matchSeed,
    opponent: cloneFrozenData(match.opponent, 'pilot match.opponent'),
    session,
  });
}

export class InputPilotObservedMatchService {
  #matchService;
  #collector;
  #session;
  #creating;
  #created;
  #destroyed;

  constructor({ matchService, collector }) {
    this.#matchService = validateMatchService(matchService);
    this.#collector = validateCollector(collector);
    this.#session = null;
    this.#creating = false;
    this.#created = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  create(options) {
    if (this.#destroyed) throw new Error('InputPilotObservedMatchService 已销毁。');
    if (this.#creating) throw new Error('InputPilotObservedMatchService.create() 不可重入。');
    if (this.#created) throw new Error('一个 pilot assignment 只允许创建一局比赛。');
    this.#creating = true;
    let match = null;
    let rawSession = null;
    let observedSession = null;
    try {
      match = this.#matchService.create(options);
      if (!match || typeof match !== 'object') {
        throw new TypeError('pilot matchService 未返回 match。');
      }
      rawSession = match.session;
      if (!rawSession) throw new TypeError('pilot matchService 未返回 session。');
      observedSession = new InputPilotObservedSession({
        session: rawSession,
        collector: this.#collector,
      });
      const observedMatch = createObservedMatch(match, observedSession);
      this.#session = observedSession;
      this.#created = true;
      return observedMatch;
    } catch (error) {
      const failure = normalizeThrownError(
        error,
        'InputPilotObservedMatchService.create() 失败',
      );
      const cleanupErrors = [];
      const cleanupTarget = observedSession ?? rawSession;
      if (cleanupTarget && !this.#session) {
        try {
          cleanupTarget.destroy();
        } catch (cleanupError) {
          cleanupErrors.push(normalizeThrownError(
            cleanupError,
            'InputPilotObservedMatchService session 清理失败',
          ));
        }
      }
      throw combineCleanupFailure(
        failure,
        cleanupErrors,
        'InputPilotObservedMatchService 创建失败且清理未完整完成。',
      );
    } finally {
      this.#creating = false;
    }
  }

  getDebugSnapshot() {
    return Object.freeze({
      creating: this.#creating,
      created: this.#created,
      destroyed: this.#destroyed,
      hasSession: this.#session !== null,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#creating) {
      throw new Error('create() 期间不能销毁 InputPilotObservedMatchService。');
    }
    try {
      this.#session?.destroy();
    } finally {
      this.#session = null;
      this.#matchService = null;
      this.#collector = null;
      this.#destroyed = true;
    }
  }
}
