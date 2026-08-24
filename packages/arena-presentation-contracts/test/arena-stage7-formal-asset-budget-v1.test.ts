import { describe, expect, it } from 'vitest';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY,
} from '../src/index.js';

describe('Arena Stage7 formal asset budget V1 pure data directory', () => {
  it('keeps the current ten policy artifacts in canonical id order', () => {
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS).toHaveLength(10);
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.map(({ id }) => id)).toEqual(
      [...ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS]
        .map(({ id }) => id)
        .sort(),
    );
    expect(new Set(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS.map(({ path }) => path),
    ).size).toBe(10);
  });

  it('recomputes the exported policy identity from the exact frozen policy data', () => {
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY).toEqual({
      policyId: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID,
      policyContentHash: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH,
      artifactCount: 10,
    });
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH).toBe('532faaa2');
    expect(createDeterministicDataHash(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA,
      `FormalAssetBudgetPolicy ${ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ID}`,
    )).toBe(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH);
    expect(Object.isFrozen(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA)).toBe(true);
    expect(Object.isFrozen(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS)).toBe(true);
  });

  it('retains the established global and structural budgets', () => {
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_DATA).toMatchObject({
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
    });
  });
});
