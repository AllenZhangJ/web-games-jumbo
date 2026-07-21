export const PRODUCT_SESSION_ERROR_CODE = Object.freeze({
  PROFILE_LOAD_FAILED: 'profile-load-failed',
  PROFILE_SAVE_FAILED: 'profile-save-failed',
  REWARD_SAVE_FAILED: 'reward-save-failed',
  REWARD_PROCESSING_FAILED: 'reward-processing-failed',
  MATCH_PREPARE_FAILED: 'match-prepare-failed',
  MATCH_RUNTIME_FAILED: 'match-runtime-failed',
  LIFECYCLE_FAILED: 'lifecycle-failed',
  CLEANUP_FAILED: 'cleanup-failed',
} as const);

export type ProductSessionErrorCode = typeof PRODUCT_SESSION_ERROR_CODE[
  keyof typeof PRODUCT_SESSION_ERROR_CODE
];

export interface ProductSessionPublicError {
  readonly code: ProductSessionErrorCode;
}

export interface ProductSessionCleanupError extends Error {
  readonly causes: readonly unknown[];
}

const KNOWN_ERROR_CODES: ReadonlySet<unknown> = new Set(Object.values(PRODUCT_SESSION_ERROR_CODE));

export function createProductSessionPublicError(code: unknown): ProductSessionPublicError {
  if (!KNOWN_ERROR_CODES.has(code)) {
    throw new RangeError('ProductSession 公开错误码不受支持。');
  }
  return Object.freeze({ code: code as ProductSessionErrorCode });
}

export function createProductSessionCleanupFailure(errors: unknown): ProductSessionCleanupError | null {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const causes: unknown[] = [];
  for (let index = 0; index < errors.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(errors, String(index));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`ProductSession cleanup errors[${index}] 必须是数据字段。`);
    }
    causes.push(descriptor.value);
  }
  const error = new Error('ProductSessionController 清理未完整完成。') as ProductSessionCleanupError;
  Object.defineProperty(error, 'causes', {
    configurable: false,
    enumerable: true,
    writable: false,
    value: Object.freeze(causes),
  });
  return error;
}
