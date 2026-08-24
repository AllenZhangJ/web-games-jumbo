import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A4_FORMAL_MATERIAL_TEXTURE_PRODUCTION_REVIEW_PREPARATION_CANDIDATE_V1 as PREPARATION,
} from '../src/index.js';

describe('Arena V2 A4 formal material texture production review preparation candidate V1 (not run)', () => {
  it('closes three texture assets, bindings and model consumers one to one', () => {
    expect(PREPARATION.summary).toMatchObject({
      textureAssetCount: 3,
      bindingCount: 3,
      consumerVisualAssetCount: 3,
      playableMaterialProfileCount: 6,
      survivalEnemyMaterialProfileCount: 1,
    });
    const rows = PREPARATION.materialTextureReviewPack.textureReviewRows;
    expect(new Set(rows.map(({ textureAsset }) => textureAsset.assetId)).size).toBe(3);
    expect(new Set(rows.map(({ binding }) => binding.bindingId)).size).toBe(3);
    expect(new Set(rows.map(({ binding }) => binding.consumerVisualAssetId)).size).toBe(3);
  });

  it('specifies albedo sRGB and PBR compatibility without claiming runtime proof', () => {
    expect(PREPARATION.materialTextureReviewPack.textureReviewRows.every((row) => (
      row.textureAsset.width === 1024
      && row.textureAsset.height === 1024
      && row.binding.relationship === 'external-gltf-image-uri'
      && row.materialContract.semantic === 'albedo-color-map'
      && row.materialContract.requiredColorSpace === 'srgb'
      && row.materialContract.requiredMaterialCompatibility
        === 'gltf-pbr-mesh-standard-compatible'
      && row.materialContract.actualRuntimeMaterialStatus === 'not-run'
      && row.materialContract.uvBindingReviewStatus === 'not-run'
      && row.materialContract.decodeReviewStatus === 'not-run'
    ))).toBe(true);
  });

  it('separates deterministic decoded-memory estimates from runtime measurement', () => {
    expect(PREPARATION.materialTextureReviewPack.decodedMemoryEnvelope).toEqual({
      estimateKind: 'deterministic-rgba8-no-mip-upper-envelope-not-runtime-measurement',
      bytesPerPixel: 4,
      perTextureDecodedByteEstimate: 4_194_304,
      batchDecodedByteEstimate: 12_582_912,
      batchDecodedBudgetBytes: 16_777_216,
      withinCandidateEnvelope: true,
      runtimePeakMeasurementStatus: 'not-run',
    });
    expect(PREPARATION.materialTextureReviewPack.textureReviewRows.every((row) => (
      row.memoryEnvelope.measurementStatus === 'not-measured-runtime-peak'
      && row.memoryEnvelope.lifecycleReviewStatus === 'not-run'
    ))).toBe(true);
  });

  it('preserves non-color identity and a deferred neutral lighting review', () => {
    expect(PREPARATION.materialTextureReviewPack.playableMaterialProfiles).toHaveLength(6);
    expect(PREPARATION.materialTextureReviewPack.playableMaterialProfiles.every((profile) => (
      profile.meshValueMultiplierCount === 7
      && profile.colorIsNeverSoleSignal === true
      && profile.evidenceStatus === 'specified-not-captured'
    ))).toBe(true);
    expect(PREPARATION.materialTextureReviewPack.lightingContract).toMatchObject({
      sourceStatus: 'specified-not-device-verified',
      neutralKeyRequired: true,
      hemisphereFillAllowed: true,
      directionalKeyAllowed: true,
      pointLightShadowAllowed: false,
      materialIdentityMustSurviveBothMapEnvironments: true,
      imageBasedLightingPolicy: 'not-selected',
      toneMappingReviewStatus: 'not-run',
      shadowPolicyReviewStatus: 'not-run',
    });
  });

  it('keeps all asset and production gates closed', () => {
    expect(PREPARATION).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      formalReady: false,
      grantsApproval: false,
      assetUsePermitted: false,
      createsOrModifiesAssets: false,
      downloadsAssets: false,
      convertsAssets: false,
      loadsAssets: false,
      participatesInGameplayAuthority: false,
      changesMaterialProfiles: false,
      changesLightingRuntime: false,
      infersGameplayFromColorOrMaterial: false,
      changesMapWeaponCharacterOrEnemyRules: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(PREPARATION.materialTextureReviewPack.textureReviewRows.every((row) => (
      row.textureAsset.productionApprovalStatus === 'missing-not-approved'
      && row.textureAsset.productionApproved === false
      && row.textureAsset.formalReady === false
      && row.textureAsset.assetUsePermitted === false
      && row.binding.consumerProductionApprovalStatus === 'missing-not-approved'
      && row.reviewStatus === 'not-run'
      && row.productionBlockoutAllowed === false
      && row.integrationAllowed === false
      && row.finalAllowed === false
    ))).toBe(true);
    expect(PREPARATION.materialTextureReviewPack.reviewChecklist).toHaveLength(10);
  });
});
