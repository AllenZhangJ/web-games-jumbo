import {
  PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION,
  createPresentationQualityDefinition,
} from './presentation-quality-definition.js';
import { createPresentationQualityRegistry } from './presentation-quality-registry.js';

export const ARENA_V1_PRESENTATION_QUALITY_ID = Object.freeze({
  HIGH: 'arena-v1.presentation-quality.high.v1',
  MEDIUM: 'arena-v1.presentation-quality.medium.v1',
  LOW: 'arena-v1.presentation-quality.low.v1',
});

function quality(id, values) {
  return createPresentationQualityDefinition({
    schemaVersion: PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    trailsEnabled: false,
    outlinesEnabled: false,
    ...values,
  });
}

export const ARENA_V1_PRESENTATION_QUALITY_DEFINITIONS = Object.freeze([
  quality(ARENA_V1_PRESENTATION_QUALITY_ID.HIGH, {
    targetFramesPerSecond: 60,
    maximumPixelRatio: 2,
    antialiasEnabled: true,
    shadowsEnabled: true,
    maximumEffects: 32,
  }),
  quality(ARENA_V1_PRESENTATION_QUALITY_ID.MEDIUM, {
    targetFramesPerSecond: 60,
    maximumPixelRatio: 1.5,
    antialiasEnabled: true,
    shadowsEnabled: false,
    maximumEffects: 16,
  }),
  quality(ARENA_V1_PRESENTATION_QUALITY_ID.LOW, {
    targetFramesPerSecond: 30,
    maximumPixelRatio: 1,
    antialiasEnabled: false,
    shadowsEnabled: false,
    maximumEffects: 8,
  }),
]);

export const ARENA_V1_PRESENTATION_QUALITY_REGISTRY = createPresentationQualityRegistry(
  ARENA_V1_PRESENTATION_QUALITY_DEFINITIONS,
);

export const ARENA_V1_DEFAULT_PRESENTATION_QUALITY =
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(ARENA_V1_PRESENTATION_QUALITY_ID.HIGH);

export function resolveArenaV1PresentationQuality(id = ARENA_V1_DEFAULT_PRESENTATION_QUALITY.id) {
  return ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(id);
}
