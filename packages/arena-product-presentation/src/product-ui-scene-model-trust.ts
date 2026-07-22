import type { ProductUiSceneModel } from './product-ui-scene-model.js';

const trustedProductUiSceneModels = new WeakSet<object>();

export function markTrustedProductUiSceneModel(value: ProductUiSceneModel): ProductUiSceneModel {
  trustedProductUiSceneModels.add(value);
  return value;
}

export function isTrustedProductUiSceneModel(value: unknown): value is ProductUiSceneModel {
  return Boolean(value && typeof value === 'object' && trustedProductUiSceneModels.has(value));
}
