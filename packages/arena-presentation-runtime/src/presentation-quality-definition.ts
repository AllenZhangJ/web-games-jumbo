import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_TICK_RATE } from '@number-strategy-jump/arena-match';

export const PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION = 1 as const;

export interface PresentationQualityDefinitionJson {
  readonly schemaVersion: typeof PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly targetFramesPerSecond: number;
  readonly maximumPixelRatio: number;
  readonly antialiasEnabled: boolean;
  readonly shadowsEnabled: boolean;
  readonly maximumEffects: number;
  readonly trailsEnabled: boolean;
  readonly outlinesEnabled: boolean;
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'targetFramesPerSecond',
  'maximumPixelRatio', 'antialiasEnabled', 'shadowsEnabled', 'maximumEffects',
  'trailsEnabled', 'outlinesEnabled',
]);

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

export class PresentationQualityDefinition implements PresentationQualityDefinitionJson {
  readonly schemaVersion = PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly targetFramesPerSecond: number;
  readonly maximumPixelRatio: number;
  readonly antialiasEnabled: boolean;
  readonly shadowsEnabled: boolean;
  readonly maximumEffects: number;
  readonly trailsEnabled: boolean;
  readonly outlinesEnabled: boolean;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'PresentationQualityDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'PresentationQualityDefinition');
    if (source.schemaVersion !== PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 PresentationQualityDefinition schema ${String(source.schemaVersion)}。`);
    }
    const targetFramesPerSecond = assertIntegerAtLeast(
      source.targetFramesPerSecond, 1, 'PresentationQualityDefinition.targetFramesPerSecond',
    );
    if (targetFramesPerSecond > ARENA_TICK_RATE || ARENA_TICK_RATE % targetFramesPerSecond !== 0) {
      throw new RangeError(`表现帧率必须是 ${ARENA_TICK_RATE} Hz Core tick 的整数约数。`);
    }
    const maximumPixelRatio = assertPositiveFinite(
      source.maximumPixelRatio, 'PresentationQualityDefinition.maximumPixelRatio',
    );
    if (maximumPixelRatio > 4) {
      throw new RangeError('PresentationQualityDefinition.maximumPixelRatio 不能超过 4。');
    }
    const maximumEffects = assertIntegerAtLeast(
      source.maximumEffects, 0, 'PresentationQualityDefinition.maximumEffects',
    );
    if (maximumEffects > 256) {
      throw new RangeError('PresentationQualityDefinition.maximumEffects 不能超过 256。');
    }
    this.id = assertNonEmptyString(source.id, 'PresentationQualityDefinition.id');
    this.contentVersion = assertIntegerAtLeast(
      source.contentVersion, 1, 'PresentationQualityDefinition.contentVersion',
    );
    this.targetFramesPerSecond = targetFramesPerSecond;
    this.maximumPixelRatio = maximumPixelRatio;
    this.antialiasEnabled = booleanValue(source.antialiasEnabled, 'PresentationQualityDefinition.antialiasEnabled');
    this.shadowsEnabled = booleanValue(source.shadowsEnabled, 'PresentationQualityDefinition.shadowsEnabled');
    this.maximumEffects = maximumEffects;
    this.trailsEnabled = booleanValue(source.trailsEnabled, 'PresentationQualityDefinition.trailsEnabled');
    this.outlinesEnabled = booleanValue(source.outlinesEnabled, 'PresentationQualityDefinition.outlinesEnabled');
    Object.freeze(this);
  }

  toJSON(): PresentationQualityDefinitionJson {
    return {
      schemaVersion: this.schemaVersion, id: this.id, contentVersion: this.contentVersion,
      targetFramesPerSecond: this.targetFramesPerSecond,
      maximumPixelRatio: this.maximumPixelRatio,
      antialiasEnabled: this.antialiasEnabled, shadowsEnabled: this.shadowsEnabled,
      maximumEffects: this.maximumEffects, trailsEnabled: this.trailsEnabled,
      outlinesEnabled: this.outlinesEnabled,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `PresentationQualityDefinition ${this.id}`);
  }
}

export function createPresentationQualityDefinition(value: unknown): PresentationQualityDefinition {
  return value instanceof PresentationQualityDefinition ? value : new PresentationQualityDefinition(value);
}
