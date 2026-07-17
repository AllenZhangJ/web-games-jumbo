export function normalizeThrownError(value, messagePrefix) {
  if (value instanceof Error) return value;
  const error = new Error(`${messagePrefix}：${String(value)}`);
  error.originalError = value;
  return error;
}

export function combineCleanupFailure(originalError, cleanupErrors, message) {
  if (!Array.isArray(cleanupErrors) || cleanupErrors.length === 0) return originalError;
  const combined = new Error(message);
  combined.originalError = originalError;
  combined.cleanupErrors = [...cleanupErrors];
  return combined;
}
