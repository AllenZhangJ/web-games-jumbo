import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID =
  'arena.stage7.formal-asset-budget.v1' as const;

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1 = Object.freeze({
  AUDIO: 'audio',
  CHARACTER_MODEL: 'character-model',
  MODEL_ATTACHMENT: 'model-attachment',
  TEXTURE: 'texture',
} as const);

export type ArenaStage7FormalAssetBudgetArtifactKindV1 =
  typeof ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1[
    keyof typeof ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1
  ];

export interface ArenaStage7FormalAssetBudgetArtifactV1 {
  readonly id: string;
  readonly path: string;
  readonly kind: ArenaStage7FormalAssetBudgetArtifactKindV1;
  readonly maximumEncodedBytes: number;
}

const CHARACTER_MODEL_MAXIMUM_ENCODED_BYTES = 1_048_576;
const ATTACHMENT_MODEL_MAXIMUM_ENCODED_BYTES = 65_536;
const TEXTURE_MAXIMUM_ENCODED_BYTES = 65_536;
const AUDIO_MAXIMUM_ENCODED_BYTES = 16_384;

/**
 * Single, immutable artifact directory for arena.stage7.formal-asset-budget.v1.
 * The order is the canonical id order produced by the existing policy parser.
 */
export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'arena.asset.attachment.shield.kaykit-round.v1',
    path: 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.MODEL_ATTACHMENT,
    maximumEncodedBytes: ATTACHMENT_MODEL_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
    path: 'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.CHARACTER_MODEL,
    maximumEncodedBytes: CHARACTER_MODEL_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
    path: 'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.CHARACTER_MODEL,
    maximumEncodedBytes: CHARACTER_MODEL_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.audio.impact.base-push.v1',
    path: 'public/assets/arena/audio/kenney-impact-sounds/base-push.ogg',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.AUDIO,
    maximumEncodedBytes: AUDIO_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.audio.impact.chain-pull.v1',
    path: 'public/assets/arena/audio/kenney-impact-sounds/chain-pull.ogg',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.AUDIO,
    maximumEncodedBytes: AUDIO_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.audio.impact.hammer-smash.v1',
    path: 'public/assets/arena/audio/kenney-impact-sounds/hammer-smash.ogg',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.AUDIO,
    maximumEncodedBytes: AUDIO_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.audio.impact.shield-charge.v1',
    path: 'public/assets/arena/audio/kenney-impact-sounds/shield-charge.ogg',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.AUDIO,
    maximumEncodedBytes: AUDIO_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.texture.attachment.shield.v1',
    path: 'public/assets/arena/equipment/kaykit-adventurers/shield_texture.png',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.TEXTURE,
    maximumEncodedBytes: TEXTURE_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.texture.character.rogue.v1',
    path: 'public/assets/arena/characters/kaykit-adventurers/rogue_texture.png',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.TEXTURE,
    maximumEncodedBytes: TEXTURE_MAXIMUM_ENCODED_BYTES,
  }),
  Object.freeze({
    id: 'arena.texture.character.skeleton.v1',
    path: 'public/assets/arena/characters/kaykit-skeletons/skeleton_texture.png',
    kind: ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V1.TEXTURE,
    maximumEncodedBytes: TEXTURE_MAXIMUM_ENCODED_BYTES,
  }),
] as const satisfies readonly ArenaStage7FormalAssetBudgetArtifactV1[]);

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA = Object.freeze({
  schemaVersion: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_SCHEMA_VERSION,
  id: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID,
  contentVersion: 1 as const,
  maximumTotalEncodedBytes: 2_359_296,
  maximumTotalAudioBytes: 65_536,
  maximumTotalDecodedTextureBytes: 16_777_216,
  maximumDecodedTextureBytesPerArtifact: 4_194_304,
  maximumTextureDimension: 1_024,
  maximumCharacterNodes: 64,
  maximumCharacterJoints: 48,
  requiredCharacterAnimationCount: 18,
  maximumCharacterAnimationCount: 18,
  maximumCharacterPrimitives: 16,
  maximumCharacterMaterials: 4,
  maximumAttachmentNodes: 8,
  maximumAttachmentPrimitives: 4,
  maximumAttachmentMaterials: 2,
  artifacts: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS,
});

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH = '532faaa2' as const;

const COMPUTED_ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH =
  createDeterministicDataHash(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA,
    `FormalAssetBudgetPolicy ${ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID}`,
  );

if (COMPUTED_ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH
  !== ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH) {
  throw new RangeError(
    'arena.stage7.formal-asset-budget.v1 内容漂移；必须升级版本，禁止静默改写V1。',
  );
}

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY = Object.freeze({
  policyId: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID,
  policyContentHash: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH,
  artifactCount: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.length,
});
