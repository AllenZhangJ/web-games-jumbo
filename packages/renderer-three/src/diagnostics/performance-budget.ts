export type RenderQualityTier = 'high' | 'low';

export interface RenderQualityProfile {
  readonly id: RenderQualityTier;
  readonly targetFrameMs: number;
  readonly releaseResponseBudgetMs: number;
  readonly longTaskLimitMs: number;
  readonly uiTextureBudgetBytes: number;
  readonly dynamicTextureBudgetBytes: number;
  readonly pixelRatioCap: number;
  readonly shadowMapSize: number;
  readonly particleLimit: number;
  readonly trailPointLimit: number;
}

const MEBIBYTE = 1024 * 1024;

export const RENDER_QUALITY_PROFILES: Readonly<Record<RenderQualityTier, RenderQualityProfile>>
  = Object.freeze({
    high: Object.freeze({
      id: 'high',
      targetFrameMs: 1000 / 60,
      releaseResponseBudgetMs: 33,
      longTaskLimitMs: 50,
      uiTextureBudgetBytes: 24 * MEBIBYTE,
      dynamicTextureBudgetBytes: 12 * MEBIBYTE,
      pixelRatioCap: 2,
      shadowMapSize: 1024,
      particleLimit: 72,
      trailPointLimit: 18,
    }),
    low: Object.freeze({
      id: 'low',
      targetFrameMs: 1000 / 30,
      releaseResponseBudgetMs: 33,
      longTaskLimitMs: 50,
      uiTextureBudgetBytes: 10 * MEBIBYTE,
      dynamicTextureBudgetBytes: 6 * MEBIBYTE,
      pixelRatioCap: 1.5,
      shadowMapSize: 512,
      particleLimit: 24,
      trailPointLimit: 10,
    }),
  });

export function resolveRenderQualityProfile(value: unknown): RenderQualityProfile {
  return value === 'low' ? RENDER_QUALITY_PROFILES.low : RENDER_QUALITY_PROFILES.high;
}
