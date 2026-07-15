import type { RenderQualityTier, StoragePort } from '@number-strategy/game-contracts';

export const RENDER_QUALITY_STORAGE_KEY = 'number-strategy.render-quality';

export function readRenderQuality(
  storage: StoragePort,
  fallback: RenderQualityTier = 'high',
): RenderQualityTier {
  try {
    const value = storage.read(RENDER_QUALITY_STORAGE_KEY);
    return value === 'low' || value === 'high' ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeRenderQuality(storage: StoragePort, quality: RenderQualityTier): boolean {
  try {
    return storage.write(RENDER_QUALITY_STORAGE_KEY, quality);
  } catch {
    return false;
  }
}
