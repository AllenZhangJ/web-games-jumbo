import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION = 1;
export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID = 'arena.stage7.formal-asset-budget.v1';

export const FORMAL_ASSET_BUDGET_ARTIFACT_KIND = Object.freeze({
  AUDIO: 'audio',
  CHARACTER_MODEL: 'character-model',
  MODEL_ATTACHMENT: 'model-attachment',
  TEXTURE: 'texture',
});

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

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function relativeArtifactPath(value, name) {
  const result = assertNonEmptyString(value, name);
  const segments = result.split('/');
  if (
    result.startsWith('/')
    || result.includes('\\')
    || segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  ) throw new RangeError(`${name} 必须是无歧义的仓库内相对路径。`);
  return result;
}

function cloneArtifacts(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('FormalAssetBudgetPolicy.artifacts 不能为空。');
  }
  const ids = new Set();
  const paths = new Set();
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

export class FormalAssetBudgetPolicy {
  constructor(value) {
    const source = cloneFrozenData(value, 'FormalAssetBudgetPolicy');
    assertKnownKeys(source, POLICY_KEYS, 'FormalAssetBudgetPolicy');
    if (source.schemaVersion !== FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 FormalAssetBudgetPolicy schema ${String(source.schemaVersion)}。`,
      );
    }
    const integer = (key, minimum = 1) => assertIntegerAtLeast(
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

  toJSON() {
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

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `FormalAssetBudgetPolicy ${this.id}`);
  }
}

export function createFormalAssetBudgetPolicy(value) {
  return value instanceof FormalAssetBudgetPolicy ? value : new FormalAssetBudgetPolicy(value);
}

export function createArenaStage7FormalAssetBudgetV1Policy() {
  const characterModelMaximum = 1024 * 1024;
  const textureMaximum = 64 * 1024;
  const audioMaximum = 16 * 1024;
  return createFormalAssetBudgetPolicy({
    schemaVersion: FORMAL_ASSET_BUDGET_POLICY_SCHEMA_VERSION,
    id: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID,
    contentVersion: 1,
    maximumTotalEncodedBytes: 2_359_296,
    maximumTotalAudioBytes: 64 * 1024,
    maximumTotalDecodedTextureBytes: 16 * 1024 * 1024,
    maximumDecodedTextureBytesPerArtifact: 4 * 1024 * 1024,
    maximumTextureDimension: 1024,
    maximumCharacterNodes: 64,
    maximumCharacterJoints: 48,
    requiredCharacterAnimationCount: 18,
    maximumCharacterAnimationCount: 18,
    maximumCharacterPrimitives: 16,
    maximumCharacterMaterials: 4,
    maximumAttachmentNodes: 8,
    maximumAttachmentPrimitives: 4,
    maximumAttachmentMaterials: 2,
    artifacts: [
      {
        id: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
        path: 'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
        kind: FORMAL_ASSET_BUDGET_ARTIFACT_KIND.CHARACTER_MODEL,
        maximumEncodedBytes: characterModelMaximum,
      },
      {
        id: 'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
        path: 'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
        kind: FORMAL_ASSET_BUDGET_ARTIFACT_KIND.CHARACTER_MODEL,
        maximumEncodedBytes: characterModelMaximum,
      },
      {
        id: 'arena.asset.attachment.shield.kaykit-round.v1',
        path: 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
        kind: FORMAL_ASSET_BUDGET_ARTIFACT_KIND.MODEL_ATTACHMENT,
        maximumEncodedBytes: 64 * 1024,
      },
      ...[
        ['arena.texture.character.rogue.v1', 'public/assets/arena/characters/kaykit-adventurers/rogue_texture.png'],
        ['arena.texture.character.skeleton.v1', 'public/assets/arena/characters/kaykit-skeletons/skeleton_texture.png'],
        ['arena.texture.attachment.shield.v1', 'public/assets/arena/equipment/kaykit-adventurers/shield_texture.png'],
      ].map(([id, artifactPath]) => ({
        id,
        path: artifactPath,
        kind: FORMAL_ASSET_BUDGET_ARTIFACT_KIND.TEXTURE,
        maximumEncodedBytes: textureMaximum,
      })),
      ...[
        ['arena.audio.impact.base-push.v1', 'base-push.ogg'],
        ['arena.audio.impact.chain-pull.v1', 'chain-pull.ogg'],
        ['arena.audio.impact.hammer-smash.v1', 'hammer-smash.ogg'],
        ['arena.audio.impact.shield-charge.v1', 'shield-charge.ogg'],
      ].map(([id, filename]) => ({
        id,
        path: `public/assets/arena/audio/kenney-impact-sounds/${filename}`,
        kind: FORMAL_ASSET_BUDGET_ARTIFACT_KIND.AUDIO,
        maximumEncodedBytes: audioMaximum,
      })),
    ],
  });
}
