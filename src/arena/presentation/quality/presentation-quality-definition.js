import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { ARENA_TICK_RATE } from '../../config.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION = 1;

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'targetFramesPerSecond',
  'maximumPixelRatio',
  'antialiasEnabled',
  'shadowsEnabled',
  'maximumEffects',
  'trailsEnabled',
  'outlinesEnabled',
]);

function booleanValue(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

export class PresentationQualityDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'PresentationQualityDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'PresentationQualityDefinition');
    if (source.schemaVersion !== PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 PresentationQualityDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    const targetFramesPerSecond = assertIntegerAtLeast(
      source.targetFramesPerSecond,
      1,
      'PresentationQualityDefinition.targetFramesPerSecond',
    );
    if (
      targetFramesPerSecond > ARENA_TICK_RATE
      || ARENA_TICK_RATE % targetFramesPerSecond !== 0
    ) {
      throw new RangeError(
        `表现帧率必须是 ${ARENA_TICK_RATE} Hz Core tick 的整数约数。`,
      );
    }
    const maximumPixelRatio = assertPositiveFinite(
      source.maximumPixelRatio,
      'PresentationQualityDefinition.maximumPixelRatio',
    );
    if (maximumPixelRatio > 4) {
      throw new RangeError('PresentationQualityDefinition.maximumPixelRatio 不能超过 4。');
    }
    const maximumEffects = assertIntegerAtLeast(
      source.maximumEffects,
      0,
      'PresentationQualityDefinition.maximumEffects',
    );
    if (maximumEffects > 256) {
      throw new RangeError('PresentationQualityDefinition.maximumEffects 不能超过 256。');
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'PresentationQualityDefinition.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'PresentationQualityDefinition.contentVersion',
        ),
        enumerable: true,
      },
      targetFramesPerSecond: { value: targetFramesPerSecond, enumerable: true },
      maximumPixelRatio: { value: maximumPixelRatio, enumerable: true },
      antialiasEnabled: {
        value: booleanValue(
          source.antialiasEnabled,
          'PresentationQualityDefinition.antialiasEnabled',
        ),
        enumerable: true,
      },
      shadowsEnabled: {
        value: booleanValue(
          source.shadowsEnabled,
          'PresentationQualityDefinition.shadowsEnabled',
        ),
        enumerable: true,
      },
      maximumEffects: { value: maximumEffects, enumerable: true },
      trailsEnabled: {
        value: booleanValue(
          source.trailsEnabled,
          'PresentationQualityDefinition.trailsEnabled',
        ),
        enumerable: true,
      },
      outlinesEnabled: {
        value: booleanValue(
          source.outlinesEnabled,
          'PresentationQualityDefinition.outlinesEnabled',
        ),
        enumerable: true,
      },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      targetFramesPerSecond: this.targetFramesPerSecond,
      maximumPixelRatio: this.maximumPixelRatio,
      antialiasEnabled: this.antialiasEnabled,
      shadowsEnabled: this.shadowsEnabled,
      maximumEffects: this.maximumEffects,
      trailsEnabled: this.trailsEnabled,
      outlinesEnabled: this.outlinesEnabled,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(
      this.toJSON(),
      `PresentationQualityDefinition ${this.id}`,
    );
  }
}

export function createPresentationQualityDefinition(value) {
  return value instanceof PresentationQualityDefinition
    ? value
    : new PresentationQualityDefinition(value);
}
