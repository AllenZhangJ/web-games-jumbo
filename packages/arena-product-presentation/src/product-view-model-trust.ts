const trustedProductSessionViewModels = new WeakSet<object>();

export function markTrustedProductSessionViewModel<T extends object>(value: T): T {
  if (!Object.isFrozen(value)) {
    throw new TypeError('ProductSessionViewModel 必须冻结后才能标记为可信。');
  }
  trustedProductSessionViewModels.add(value);
  return value;
}

export function isTrustedProductSessionViewModel(value: unknown): value is object {
  return Boolean(value && typeof value === 'object' && trustedProductSessionViewModels.has(value));
}
