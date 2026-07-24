export interface NormalizedLifecycleError extends Error {
  originalError: unknown;
}

export interface CombinedLifecycleError extends Error {
  originalError: Error;
  cleanupErrors: readonly Error[];
}

export function normalizeThrownError(value: unknown, messagePrefix: string): Error {
  if (value instanceof Error) return value;
  const error = new Error(`${messagePrefix}：${String(value)}`) as NormalizedLifecycleError;
  error.originalError = value;
  return error;
}

export function combineCleanupFailure(
  originalError: Error,
  cleanupErrors: readonly Error[],
  message: string,
): Error {
  if (!Array.isArray(cleanupErrors) || cleanupErrors.length === 0) return originalError;
  const combined = new Error(message) as CombinedLifecycleError;
  combined.originalError = originalError;
  combined.cleanupErrors = Object.freeze([...cleanupErrors]);
  return combined;
}
