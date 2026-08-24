import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID as SHARED_ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA,
} from '@number-strategy-jump/arena-presentation-contracts';

export const FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION = 1;
export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID =
  SHARED_ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID;

export const FORMAL_ASSET_BUDGET_ARTIFACT_KIND =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1;

export type FormalAssetBudgetArtifactKind =
  typeof FORMAL_ASSET_BUDGET_ARTIFACT_KIND[keyof typeof FORMAL_ASSET_BUDGET_ARTIFACT_KIND];

export interface FormalAssetBudgetArtifactDefinition {
  readonly id: string;
  readonly path: string;
  readonly kind: FormalAssetBudgetArtifactKind;
  readonly maximumEncodedBytes: number;
}

export interface FormalAssetBudgetPolicyJson {
  readonly schemaVersion: typeof FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly maximumTotalEncodedBytes: number;
  readonly maximumTotalAudioBytes: number;
  readonly maximumTotalDecodedTextureBytes: number;
  readonly maximumDecodedTextureBytesPerArtifact: number;
  readonly maximumTextureDimension: number;
  readonly maximumCharacterNodes: number;
  readonly maximumCharacterJoints: number;
  readonly requiredCharacterAnimationCount: number;
  readonly maximumCharacterAnimationCount: number;
  readonly maximumCharacterPrimitives: number;
  readonly maximumCharacterMaterials: number;
  readonly maximumAttachmentNodes: number;
  readonly maximumAttachmentPrimitives: number;
  readonly maximumAttachmentMaterials: number;
  readonly artifacts: readonly FormalAssetBudgetArtifactDefinition[];
}

const POLICY_KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'maximumTotalEncodedBytes',
  'maximumTotalAudioBytes',
  'maximumTotalDecodedTextureBytes',
  'maximumDecodedTextureBytesPerArtifact',
  'maximumTextureDimension',
  'maximumCharacterNodes',
  'maximumCharacterJoints',
  'requiredCharacterAnimationCount',
  'maximumCharacterAnimationCount',
  'maximumCharacterPrimitives',
  'maximumCharacterMaterials',
  'maximumAttachmentNodes',
  'maximumAttachmentPrimitives',
  'maximumAttachmentMaterials',
  'artifacts',
]);
const ARTIFACT_KEYS = new Set(['id', 'path', 'kind', 'maximumEncodedBytes']);

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function enumValue<T extends string>(
  value: unknown,
  values: Readonly<Record<string, T>>,
  name: string,
): T {
  if (typeof value !== 'string' || !Object.values(values).includes(value as T)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}

function relativeArtifactPath(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  const segments = result.split('/');
  if (
    result.startsWith('/')
    || result.includes('\\')
    || segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  ) throw new RangeError(`${name} 必须是无歧义的仓库内相对路径。`);
  return result;
}

function cloneArtifacts(values: unknown): readonly FormalAssetBudgetArtifactDefinition[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('FormalAssetBudgetPolicy.artifacts 不能为空。');
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  const artifacts = values.map((value, index) => {
    const name = `FormalAssetBudgetPolicy.artifacts[${index}]`;
    assertKnownKeys(value, ARTIFACT_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    const artifactPath = relativeArtifactPath(value.path, `${name}.path`);
    if (ids.has(id)) throw new RangeError(`重复 Formal Asset Budget artifact id ${id}。`);
    if (paths.has(artifactPath)) {
      throw new RangeError(`重复 Formal Asset Budget artifact path ${artifactPath}。`);
    }
    ids.add(id);
    paths.add(artifactPath);
    return Object.freeze({
      id,
      path: artifactPath,
      kind: enumValue(
        value.kind,
        FORMAL_ASSET_BUDGET_ARTIFACT_KIND,
        `${name}.kind`,
      ),
      maximumEncodedBytes: assertIntegerAtLeast(
        value.maximumEncodedBytes,
        1,
        `${name}.maximumEncodedBytes`,
      ),
    });
  });
  const kinds = new Set(artifacts.map(({ kind }) => kind));
  for (const kind of Object.values(FORMAL_ASSET_BUDGET_ARTIFACT_KIND)) {
    if (!kinds.has(kind)) throw new RangeError(`Formal Asset Budget 缺少 ${kind} artifact。`);
  }
  return Object.freeze(artifacts.sort((left, right) => compareText(left.id, right.id)));
}

export class FormalAssetBudgetPolicy implements FormalAssetBudgetPolicyJson {
  declare readonly schemaVersion: typeof FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION;
  declare readonly id: string;
  declare readonly contentVersion: number;
  declare readonly maximumTotalEncodedBytes: number;
  declare readonly maximumTotalAudioBytes: number;
  declare readonly maximumTotalDecodedTextureBytes: number;
  declare readonly maximumDecodedTextureBytesPerArtifact: number;
  declare readonly maximumTextureDimension: number;
  declare readonly maximumCharacterNodes: number;
  declare readonly maximumCharacterJoints: number;
  declare readonly requiredCharacterAnimationCount: number;
  declare readonly maximumCharacterAnimationCount: number;
  declare readonly maximumCharacterPrimitives: number;
  declare readonly maximumCharacterMaterials: number;
  declare readonly maximumAttachmentNodes: number;
  declare readonly maximumAttachmentPrimitives: number;
  declare readonly maximumAttachmentMaterials: number;
  declare readonly artifacts: readonly FormalAssetBudgetArtifactDefinition[];

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'FormalAssetBudgetPolicy');
    assertKnownKeys(source, POLICY_KEYS, 'FormalAssetBudgetPolicy');
    if (source.schemaVersion !== FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 FormalAssetBudgetPolicy schema ${String(source.schemaVersion)}。`,
      );
    }
    const integer = (key: string, minimum = 1): number => assertIntegerAtLeast(
      source[key],
      minimum,
      `FormalAssetBudgetPolicy.${key}`,
    );
    const requiredCharacterAnimationCount = integer('requiredCharacterAnimationCount');
    const maximumCharacterAnimationCount = integer('maximumCharacterAnimationCount');
    if (requiredCharacterAnimationCount > maximumCharacterAnimationCount) {
      throw new RangeError('正式角色必需动作数量不能超过最大动作数量。');
    }
    Object.defineProperties(this, {
      schemaVersion: { value: FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION, enumerable: true },
      id: { value: assertNonEmptyString(source.id, 'FormalAssetBudgetPolicy.id'), enumerable: true },
      contentVersion: { value: integer('contentVersion'), enumerable: true },
      maximumTotalEncodedBytes: { value: integer('maximumTotalEncodedBytes'), enumerable: true },
      maximumTotalAudioBytes: { value: integer('maximumTotalAudioBytes'), enumerable: true },
      maximumTotalDecodedTextureBytes: {
        value: integer('maximumTotalDecodedTextureBytes'),
        enumerable: true,
      },
      maximumDecodedTextureBytesPerArtifact: {
        value: integer('maximumDecodedTextureBytesPerArtifact'),
        enumerable: true,
      },
      maximumTextureDimension: { value: integer('maximumTextureDimension'), enumerable: true },
      maximumCharacterNodes: { value: integer('maximumCharacterNodes'), enumerable: true },
      maximumCharacterJoints: { value: integer('maximumCharacterJoints'), enumerable: true },
      requiredCharacterAnimationCount: { value: requiredCharacterAnimationCount, enumerable: true },
      maximumCharacterAnimationCount: { value: maximumCharacterAnimationCount, enumerable: true },
      maximumCharacterPrimitives: { value: integer('maximumCharacterPrimitives'), enumerable: true },
      maximumCharacterMaterials: { value: integer('maximumCharacterMaterials'), enumerable: true },
      maximumAttachmentNodes: { value: integer('maximumAttachmentNodes'), enumerable: true },
      maximumAttachmentPrimitives: { value: integer('maximumAttachmentPrimitives'), enumerable: true },
      maximumAttachmentMaterials: { value: integer('maximumAttachmentMaterials'), enumerable: true },
      artifacts: { value: cloneArtifacts(source.artifacts), enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON(): FormalAssetBudgetPolicyJson {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      maximumTotalEncodedBytes: this.maximumTotalEncodedBytes,
      maximumTotalAudioBytes: this.maximumTotalAudioBytes,
      maximumTotalDecodedTextureBytes: this.maximumTotalDecodedTextureBytes,
      maximumDecodedTextureBytesPerArtifact: this.maximumDecodedTextureBytesPerArtifact,
      maximumTextureDimension: this.maximumTextureDimension,
      maximumCharacterNodes: this.maximumCharacterNodes,
      maximumCharacterJoints: this.maximumCharacterJoints,
      requiredCharacterAnimationCount: this.requiredCharacterAnimationCount,
      maximumCharacterAnimationCount: this.maximumCharacterAnimationCount,
      maximumCharacterPrimitives: this.maximumCharacterPrimitives,
      maximumCharacterMaterials: this.maximumCharacterMaterials,
      maximumAttachmentNodes: this.maximumAttachmentNodes,
      maximumAttachmentPrimitives: this.maximumAttachmentPrimitives,
      maximumAttachmentMaterials: this.maximumAttachmentMaterials,
      artifacts: this.artifacts,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `FormalAssetBudgetPolicy ${this.id}`);
  }
}

export function createFormalAssetBudgetPolicy(value: unknown): FormalAssetBudgetPolicy {
  return value instanceof FormalAssetBudgetPolicy ? value : new FormalAssetBudgetPolicy(value);
}

export function createArenaStage7FormalAssetBudgetV1Policy(): FormalAssetBudgetPolicy {
  return createFormalAssetBudgetPolicy(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA);
}
