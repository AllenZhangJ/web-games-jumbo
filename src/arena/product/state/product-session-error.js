export const PRODUCT_SESSION_ERROR_CODE = Object.freeze({
  PROFILE_LOAD_FAILED: 'profile-load-failed',
  PROFILE_SAVE_FAILED: 'profile-save-failed',
  REWARD_SAVE_FAILED: 'reward-save-failed',
  REWARD_PROCESSING_FAILED: 'reward-processing-failed',
  MATCH_PREPARE_FAILED: 'match-prepare-failed',
  MATCH_RUNTIME_FAILED: 'match-runtime-failed',
  LIFECYCLE_FAILED: 'lifecycle-failed',
  CLEANUP_FAILED: 'cleanup-failed',
});

export function createProductSessionPublicError(code) {
  if (!Object.values(PRODUCT_SESSION_ERROR_CODE).includes(code)) {
    throw new RangeError('ProductSession 公开错误码不受支持。');
  }
  return Object.freeze({ code });
}

export function createProductSessionCleanupFailure(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const error = new Error('ProductSessionController 清理未完整完成。');
  error.causes = [...errors];
  return error;
}
