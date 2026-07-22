import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';

export const FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION = 1;
export const ARENA_FORMAL_ASSET_INTAKE_V1_POLICY_ID = 'arena.stage7.formal-asset-intake.v1';

export const FORMAL_ASSET_SOURCE_KIND = Object.freeze({
  COMMISSIONED: 'commissioned',
  OPEN_SOURCE: 'open-source',
  ORIGINAL: 'original',
  PURCHASED: 'purchased',
});

const POLICY_KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'allowedSourceKinds',
  'requiredAssetTags',
  'forbiddenAssetTags',
  'forbiddenProviderIds',
  'requiredRights',
]);
const RIGHTS_KEYS = new Set([
  'commercialUse',
  'modification',
  'redistributionInBuild',
]);

function cloneRequiredRights(value) {
  const name = 'FormalAssetIntakePolicy.requiredRights';
  assertKnownKeys(value, RIGHTS_KEYS, name);
  const result = {};
  for (const key of RIGHTS_KEYS) {
    if (typeof value[key] !== 'boolean') {
      throw new TypeError(`${name}.${key} 必须是布尔值。`);
    }
    result[key] = value[key];
  }
  return Object.freeze(result);
}

export class FormalAssetIntakePolicy {
  constructor(value) {
    const source = cloneFrozenData(value, 'FormalAssetIntakePolicy');
    assertKnownKeys(source, POLICY_KEYS, 'FormalAssetIntakePolicy');
    if (source.schemaVersion !== FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 FormalAssetIntakePolicy schema ${String(source.schemaVersion)}。`,
      );
    }
    const allowedSourceKinds = cloneFrozenStringSet(
      source.allowedSourceKinds,
      'FormalAssetIntakePolicy.allowedSourceKinds',
    );
    if (allowedSourceKinds.length === 0) {
      throw new RangeError('FormalAssetIntakePolicy.allowedSourceKinds 不能为空。');
    }
    for (const kind of allowedSourceKinds) {
      if (!Object.values(FORMAL_ASSET_SOURCE_KIND).includes(kind)) {
        throw new RangeError(`FormalAssetIntakePolicy 不支持 source kind ${kind}。`);
      }
    }
    const requiredAssetTags = cloneFrozenStringSet(
      source.requiredAssetTags,
      'FormalAssetIntakePolicy.requiredAssetTags',
    );
    const forbiddenAssetTags = cloneFrozenStringSet(
      source.forbiddenAssetTags,
      'FormalAssetIntakePolicy.forbiddenAssetTags',
    );
    const conflictingTag = requiredAssetTags.find((tag) => forbiddenAssetTags.includes(tag));
    if (conflictingTag) {
      throw new RangeError(`FormalAssetIntakePolicy 同时要求并禁止 tag ${conflictingTag}。`);
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'FormalAssetIntakePolicy.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'FormalAssetIntakePolicy.contentVersion',
        ),
        enumerable: true,
      },
      allowedSourceKinds: { value: allowedSourceKinds, enumerable: true },
      requiredAssetTags: { value: requiredAssetTags, enumerable: true },
      forbiddenAssetTags: { value: forbiddenAssetTags, enumerable: true },
      forbiddenProviderIds: {
        value: cloneFrozenStringSet(
          source.forbiddenProviderIds,
          'FormalAssetIntakePolicy.forbiddenProviderIds',
        ),
        enumerable: true,
      },
      requiredRights: { value: cloneRequiredRights(source.requiredRights), enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      allowedSourceKinds: this.allowedSourceKinds,
      requiredAssetTags: this.requiredAssetTags,
      forbiddenAssetTags: this.forbiddenAssetTags,
      forbiddenProviderIds: this.forbiddenProviderIds,
      requiredRights: this.requiredRights,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `FormalAssetIntakePolicy ${this.id}`);
  }
}

export function createFormalAssetIntakePolicy(value) {
  return value instanceof FormalAssetIntakePolicy
    ? value
    : new FormalAssetIntakePolicy(value);
}

export function createArenaFormalAssetIntakeV1Policy() {
  return createFormalAssetIntakePolicy({
    schemaVersion: FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION,
    id: ARENA_FORMAL_ASSET_INTAKE_V1_POLICY_ID,
    contentVersion: 1,
    allowedSourceKinds: Object.values(FORMAL_ASSET_SOURCE_KIND),
    requiredAssetTags: ['formal'],
    forbiddenAssetTags: ['greybox'],
    forbiddenProviderIds: [ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1],
    requiredRights: {
      commercialUse: true,
      modification: true,
      redistributionInBuild: true,
    },
  });
}
