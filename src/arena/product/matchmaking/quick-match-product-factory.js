import { combineCleanupFailure, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { ProductMatchRuntime } from './product-match-runtime.js';

function validateQuickMatchService(value) {
  if (!value || typeof value.create !== 'function') {
    throw new TypeError('QuickMatchProductFactory 需要 QuickMatchService 合同。');
  }
  return value;
}

export class QuickMatchProductFactory {
  #quickMatchService;
  #matchConfig;
  #completionSink;

  constructor({ quickMatchService, matchConfig = {}, completionSink = null }) {
    this.#quickMatchService = validateQuickMatchService(quickMatchService);
    this.#matchConfig = cloneFrozenData(matchConfig, 'QuickMatchProductFactory matchConfig');
    if (completionSink !== null && typeof completionSink !== 'function') {
      throw new TypeError('QuickMatchProductFactory completionSink 必须是函数或 null。');
    }
    this.#completionSink = completionSink;
    Object.freeze(this);
  }

  create() {
    let localMatch = null;
    try {
      // The product surface intentionally exposes neither difficulty override
      // nor hidden assignment diagnostics.
      localMatch = this.#quickMatchService.create({ config: this.#matchConfig });
      return new ProductMatchRuntime(localMatch, { completionSink: this.#completionSink });
    } catch (error) {
      const cleanupErrors = [];
      if (localMatch?.session && typeof localMatch.session.destroy === 'function') {
        try {
          localMatch.session.destroy();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      throw combineCleanupFailure(
        normalizeThrownError(error, 'QuickMatchProductFactory 创建失败'),
        cleanupErrors,
        'QuickMatchProductFactory 创建失败且清理未完整完成。',
      );
    }
  }
}
