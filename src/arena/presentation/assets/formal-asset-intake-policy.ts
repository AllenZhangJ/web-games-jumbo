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
} as const);

export type FormalAssetSourceKind =
  typeof FORMAL_ASSET_SOURCE_KIND[keyof typeof FORMAL_ASSET_SOURCE_KIND];

export interface FormalAssetRequiredRights {
  readonly commercialUse: boolean;
  readonly modification: boolean;
  readonly redistributionInBuild: boolean;
}

export interface FormalAssetIntakePolicyJson {
  readonly schemaVersion: typeof FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly allowedSourceKinds: readonly FormalAssetSourceKind[];
  readonly requiredAssetTags: readonly string[];
  readonly forbiddenAssetTags: readonly string[];
  readonly forbiddenProviderIds: readonly string[];
  readonly requiredRights: FormalAssetRequiredRights;
}

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
const FORMAL_ASSET_SOURCE_KINDS: ReadonlySet<string> = new Set(
  Object.values(FORMAL_ASSET_SOURCE_KIND),
);

function cloneRequiredRights(value: unknown): FormalAssetRequiredRights {
  const name = 'FormalAssetIntakePolicy.requiredRights';
  assertKnownKeys(value, RIGHTS_KEYS, name);
  const result: Record<string, boolean> = {};
  for (const key of RIGHTS_KEYS) {
    if (typeof value[key] !== 'boolean') {
      throw new TypeError(`${name}.${key} 必须是布尔值。`);
    }
    result[key] = value[key];
  }
  return Object.freeze(result) as unknown as FormalAssetRequiredRights;
}

export class FormalAssetIntakePolicy implements FormalAssetIntakePolicyJson {
  readonly schemaVersion = FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly allowedSourceKinds: readonly FormalAssetSourceKind[];
  readonly requiredAssetTags: readonly string[];
  readonly forbiddenAssetTags: readonly string[];
  readonly forbiddenProviderIds: readonly string[];
  readonly requiredRights: FormalAssetRequiredRights;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'FormalAssetIntakePolicy');
    assertKnownKeys(source, POLICY_KEYS, 'FormalAssetIntakePolicy');
    if (source.schemaVersion !== FORMAL_ASSET_INTAKE_POLICY_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 FormalAssetIntakePolicy schema ${String(source.schemaVersion)}。`,
      );
    }
    const allowedSourceKinds = cloneFrozenStringSet(
      source.allowedSourceKinds as readonly unknown[],
      'FormalAssetIntakePolicy.allowedSourceKinds',
    );
    if (allowedSourceKinds.length === 0) {
      throw new RangeError('FormalAssetIntakePolicy.allowedSourceKinds 不能为空。');
    }
    for (const kind of allowedSourceKinds) {
      if (!FORMAL_ASSET_SOURCE_KINDS.has(kind)) {
        throw new RangeError(`FormalAssetIntakePolicy 不支持 source kind ${kind}。`);
      }
    }
    const requiredAssetTags = cloneFrozenStringSet(
      source.requiredAssetTags as readonly unknown[],
      'FormalAssetIntakePolicy.requiredAssetTags',
    );
    const forbiddenAssetTags = cloneFrozenStringSet(
      source.forbiddenAssetTags as readonly unknown[],
      'FormalAssetIntakePolicy.forbiddenAssetTags',
    );
    const conflictingTag = requiredAssetTags.find((tag) => forbiddenAssetTags.includes(tag));
    if (conflictingTag) {
      throw new RangeError(`FormalAssetIntakePolicy 同时要求并禁止 tag ${conflictingTag}。`);
    }
    this.id = assertNonEmptyString(source.id, 'FormalAssetIntakePolicy.id');
    this.contentVersion = assertIntegerAtLeast(
      source.contentVersion,
      1,
      'FormalAssetIntakePolicy.contentVersion',
    );
    this.allowedSourceKinds = allowedSourceKinds as readonly FormalAssetSourceKind[];
    this.requiredAssetTags = requiredAssetTags;
    this.forbiddenAssetTags = forbiddenAssetTags;
    this.forbiddenProviderIds = cloneFrozenStringSet(
      source.forbiddenProviderIds as readonly unknown[],
      'FormalAssetIntakePolicy.forbiddenProviderIds',
    );
    this.requiredRights = cloneRequiredRights(source.requiredRights);
    Object.freeze(this);
  }

  toJSON(): FormalAssetIntakePolicyJson {
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

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `FormalAssetIntakePolicy ${this.id}`);
  }
}

export function createFormalAssetIntakePolicy(value: unknown): FormalAssetIntakePolicy {
  return value instanceof FormalAssetIntakePolicy
    ? value
    : new FormalAssetIntakePolicy(value);
}

export function createArenaFormalAssetIntakeV1Policy(): FormalAssetIntakePolicy {
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
