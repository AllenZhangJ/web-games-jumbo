import { describe, expect, it } from 'vitest';
import {
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1 as READINESS,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1 as APPROVAL_LEDGER,
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_ASSET_RECORDS_CANDIDATE_V1 as MATERIAL_TEXTURES,
  ARENA_V2_FORMAL_MATERIAL_TEXTURE_BINDINGS_CANDIDATE_V1 as MATERIAL_TEXTURE_BINDINGS,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1 as CATALOG,
  ARENA_V2_FORMAL_VFX_TEXTURE_ASSET_RECORDS_CANDIDATE_V1 as VFX_TEXTURES,
} from '../src/index.js';

describe('Arena V2 A3-A6 formal asset readiness candidate V1 (not run)', () => {
  it('binds six characters, twenty weapons, two maps and the current media catalog', () => {
    expect(READINESS.coverage).toMatchObject({
      playableCharacterIdentities: 6,
      survivalEnemyIdentities: 1,
      weaponIdentities: 20,
      mapIdentities: 2,
      vfxTextureIdentities: 5,
      formalMaterialTextureIdentities: 3,
      formalMaterialTextureBindings: 3,
      audioIdentities: 98,
      weaponActionAudioIdentities: 21,
      weaponImpactAudioIdentities: 20,
      additionalUnarmedImpactAudioIdentities: 1,
      weaponPhaseAudioIdentities: 60,
      modeSupplyAudioIdentities: 17,
      modeFeedbackAudioIdentities: 13,
      supplyFeedbackAudioIdentities: 4,
    });
    expect(READINESS.formalReady).toBe(false);
    expect(READINESS.hardGate).toBe(false);
    expect(READINESS.status).toBe('production-unreachable');
    expect(READINESS.implementationStatus).toBe('code-written-not-run');
  });

  it('uses the shared Stage7 policy identity and leaves outsiders uncovered', () => {
    expect(READINESS.formalBudgetPolicyIdentity).toBe(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_POLICY_IDENTITY,
    );
    expect(READINESS.coverage.budgetPolicyArtifacts).toBe(10);
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS).toHaveLength(10);
    expect(READINESS.uncoveredAssetIds).toContain(
      'arena.asset.map.kz-base.authored-candidate.v1',
    );
    expect(READINESS.uncoveredAssetIds).toContain(
      'arena.asset.attachment.weapon.heavy-hammer.kaykit-candidate.v1',
    );
    expect(READINESS.uncoveredAssetIds).toHaveLength(120);
    expect(READINESS.policyOnlyArtifacts).toEqual([]);
    expect(READINESS.coverage.policyOnlyArtifacts).toBe(0);
    expect(READINESS.coverage.catalogAssetsCoveredByPolicy).toBe(10);
  });

  it('adds a separate V2 candidate projection without rewriting V1 uncovered truth', () => {
    expect(READINESS.proposedFormalBudgetPolicyV2Identity).toBe(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
    );
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS).toHaveLength(130);
    expect(READINESS.coverage).toMatchObject({
      v2CandidateBudgetPolicyArtifacts: 130,
      catalogAssetsCoveredByV2Candidate: 130,
      catalogAssetsUncoveredByV2Candidate: 0,
      catalogAssetsCoveredByPolicy: 10,
    });
    expect(READINESS.v2CandidateBudgetCoverageProjection).toMatchObject({
      status: 'candidate-coverage-only',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      uncoveredAssetIds: [],
      preservedV1UncoveredAssetIds: READINESS.uncoveredAssetIds,
      encodedMediaFormatSourceProjectionClosed: true,
      textureDimensionSourceProjectionClosed: true,
      productionApproved: false,
      assetUsePermitted: false,
      hardGate: false,
      hardGateUsable: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(READINESS.v2CandidateBudgetCoverageProjection.coveredAssetIds).toHaveLength(130);
    expect(READINESS.uncoveredAssetIds).toContain(
      'arena.asset.map.kz-base.authored-candidate.v1',
    );
    expect(READINESS.uncoveredAssetIds).toContain(
      'arena.asset.attachment.weapon.heavy-hammer.kaykit-candidate.v1',
    );
    expect(READINESS.catalogAssets.every((asset) => (
      asset.v2CandidateBudgetCoverage.status === 'candidate-covered'
      && asset.v2CandidateBudgetCoverage.withinCandidateEncodedCeiling === true
      && asset.productionApproved === false
      && asset.formalReady === false
    ))).toBe(true);
    const sourceTextureById = new Map([
      ...MATERIAL_TEXTURES.map((record) => [record.textureAssetId, record] as const),
      ...VFX_TEXTURES.map((record) => [record.vfxAssetId, record] as const),
    ]);
    const sourceEncodedFormatById = new Map([
      ...CATALOG.visualRecords.map((record) => (
        [record.runtimeDefinition.id, record.encodedMediaFormat] as const
      )),
      ...MATERIAL_TEXTURES.map((record) => (
        [record.textureAssetId, record.encodedMediaFormat] as const
      )),
      ...CATALOG.audioRecords.map((record) => (
        [record.audioAssetId, record.encodedMediaFormat] as const
      )),
      ...VFX_TEXTURES.map((record) => (
        [record.vfxAssetId, record.encodedMediaFormat] as const
      )),
    ]);
    for (const artifact of ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS) {
      expect(artifact.encodedMediaFormat).toBe(sourceEncodedFormatById.get(artifact.id));
      const sourceTexture = sourceTextureById.get(artifact.id);
      if (artifact.kind === 'texture') {
        expect(sourceTexture).toBeDefined();
        expect(artifact.decodedTextureFormat).toBe(sourceTexture?.decodedTextureFormat);
        expect(artifact.widthPixels).toBe(sourceTexture?.width);
        expect(artifact.heightPixels).toBe(sourceTexture?.height);
      } else {
        expect(artifact.decodedTextureFormat).toBe('not-applicable');
        expect(artifact.widthPixels).toBe(0);
        expect(artifact.heightPixels).toBe(0);
      }
    }
  });

  it('registers all three pinned KayKit material textures without granting Final approval', () => {
    expect(READINESS.currentCatalogContentHash).toBe(CATALOG.contentHash);
    expect(CATALOG.coverage.formalMaterialTextureIdentities).toEqual({
      implemented: 3,
      required: 3,
    });
    expect(CATALOG.coverage.formalMaterialTextureBindings).toEqual({
      implemented: 3,
      required: 3,
    });
    expect(CATALOG.materialTextureRecords).toBe(MATERIAL_TEXTURES);
    expect(CATALOG.materialTextureBindings).toBe(MATERIAL_TEXTURE_BINDINGS);
    expect(MATERIAL_TEXTURES.map(({ textureAssetId }) => textureAssetId)).toEqual([
      'arena.texture.attachment.shield.v1',
      'arena.texture.character.rogue.v1',
      'arena.texture.character.skeleton.v1',
    ]);
    expect(MATERIAL_TEXTURES.map((record) => ({
      textureAssetId: record.textureAssetId,
      runtimeSourceKey: record.runtimeSourceKey,
      encodedMediaFormat: record.encodedMediaFormat,
      decodedTextureFormat: record.decodedTextureFormat,
      width: record.width,
      height: record.height,
      byteLength: record.byteLength,
      sha256: record.sha256,
    }))).toEqual([
      {
        textureAssetId: 'arena.texture.attachment.shield.v1',
        runtimeSourceKey: './assets/arena/equipment/kaykit-adventurers/shield_texture.png',
        encodedMediaFormat: 'png',
        decodedTextureFormat: 'rgba8',
        width: 1024,
        height: 1024,
        byteLength: 14_172,
        sha256: '5d250ccc5da020e6126bfa3839f83bd9a465a951ed223e4d13c08b1925e154d4',
      },
      {
        textureAssetId: 'arena.texture.character.rogue.v1',
        runtimeSourceKey: './assets/arena/characters/kaykit-adventurers/rogue_texture.png',
        encodedMediaFormat: 'png',
        decodedTextureFormat: 'rgba8',
        width: 1024,
        height: 1024,
        byteLength: 16_670,
        sha256: 'a4032e877c3b91939f5cdbb630349c1998fdbc3211bbd587c111125500fe4cc5',
      },
      {
        textureAssetId: 'arena.texture.character.skeleton.v1',
        runtimeSourceKey: './assets/arena/characters/kaykit-skeletons/skeleton_texture.png',
        encodedMediaFormat: 'png',
        decodedTextureFormat: 'rgba8',
        width: 1024,
        height: 1024,
        byteLength: 17_037,
        sha256: '15741a25c53e04fa9bf3beac3bc0de442359404b1ff9be863b892cb551ad3657',
      },
    ]);
    expect(MATERIAL_TEXTURES.every((record) => (
      record.contentVersion === 3
      && record.encodedMediaFormat === 'png'
      && record.decodedTextureFormat === 'rgba8'
      && record.maturity === 'verified-intake-only'
      && record.productionApproved === false
    ))).toBe(true);
    expect(MATERIAL_TEXTURE_BINDINGS.map((binding) => ({
      bindingId: binding.bindingId,
      consumerVisualAssetId: binding.consumerVisualAssetId,
      textureAssetId: binding.textureAssetId,
      gltfImageUri: binding.gltfImageUri,
    }))).toEqual([
      {
        bindingId: 'arena.binding.material-texture.attachment.shield.v1',
        consumerVisualAssetId: 'arena.asset.attachment.shield.kaykit-round.v1',
        textureAssetId: 'arena.texture.attachment.shield.v1',
        gltfImageUri: 'shield_texture.png',
      },
      {
        bindingId: 'arena.binding.material-texture.character.rogue.v1',
        consumerVisualAssetId: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
        textureAssetId: 'arena.texture.character.rogue.v1',
        gltfImageUri: 'rogue_texture.png',
      },
      {
        bindingId: 'arena.binding.material-texture.character.skeleton.v1',
        consumerVisualAssetId:
          'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
        textureAssetId: 'arena.texture.character.skeleton.v1',
        gltfImageUri: 'skeleton_texture.png',
      },
    ]);
    expect(READINESS.materialTextureDependencyClosure).toHaveLength(3);
    expect(READINESS.materialTextureDependencyClosure.every((binding) => (
      binding.relationship === 'external-gltf-image-uri'
      && binding.textureBudgetCoverage.status === 'covered'
      && binding.textureBudgetCoverage.withinEncodedBudget === true
      && binding.productionApproved === false
      && binding.formalReady === false
    ))).toBe(true);
    for (const record of MATERIAL_TEXTURES) {
      expect(READINESS.catalogAssets.find(({ assetId }) => assetId === record.textureAssetId))
        .toMatchObject({
          phaseId: 'A4',
          mediaKind: 'texture',
          maturity: 'verified-intake-only',
          artifactPath: record.artifactPath,
          byteLength: record.byteLength,
          sha256: record.sha256,
          budgetCoverage: { status: 'covered', withinEncodedBudget: true },
          productionApproved: false,
          formalReady: false,
        });
    }
  });

  it('does not convert source approval or catalog registration into production approval', () => {
    const shield = READINESS.catalogAssets.find(({ assetId }) => (
      assetId === 'arena.asset.attachment.shield.kaykit-round.v1'
    ));
    expect(shield).toMatchObject({
      maturity: 'verified-intake-only',
      provenance: { sourceApprovalRecorded: true },
      budgetCoverage: { status: 'covered', withinEncodedBudget: true },
      productionApproved: false,
      formalReady: false,
    });
    expect(READINESS.mapIdentities.every(({ formalReady }) => !formalReady)).toBe(true);
    expect(READINESS.a6ReuseBindings).toMatchObject({
      addsAssets: false,
      formalReady: false,
      productionApprovedPreviewAssetIds: [],
      assetUsePermittedPreviewAssetIds: [],
      requestTokenCount: 0,
      releaseTokenCount: 0,
      futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true,
    });
    expect(READINESS.a6ReuseBindings.fallbackPreviewAssetIds).toHaveLength(22);
    expect(READINESS.catalogAssets.filter(({ phaseId, mediaKind }) => (
      phaseId === 'A4' && mediaKind === 'audio'
    ))).toHaveLength(21);
    expect(READINESS.catalogAssets.filter(({ phaseId, mediaKind }) => (
      phaseId === 'A5' && mediaKind === 'audio'
    ))).toHaveLength(17);
  });

  it('projects the separate 130-item production approval evidence gap without changing budget truth', () => {
    expect(READINESS.productionApprovalEvidenceProjection).toMatchObject({
      status: 'evidence-gap-projection-only',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      sourceApprovalRecordedAssetIds: expect.any(Array),
      productionApprovedAssetIds: [],
      grantsApproval: false,
      assetUsePermitted: false,
      formalReady: false,
      hardGate: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
    });
    expect(READINESS.productionApprovalEvidenceProjection.ledgerIdentity.contentHash)
      .toBe(APPROVAL_LEDGER.contentHash);
    expect(READINESS.productionApprovalEvidenceProjection.sourceApprovalRecordedAssetIds)
      .toHaveLength(29);
    expect(READINESS.productionApprovalEvidenceProjection.productionApprovalMissingAssetIds)
      .toHaveLength(130);
    expect(READINESS.productionApprovalEvidenceProjection.budgetCandidateCoveredAssetIds)
      .toHaveLength(130);
    expect(READINESS.unapprovedAssetIds).toHaveLength(130);
    expect(READINESS.uncoveredAssetIds).toHaveLength(120);
    expect(READINESS.coverage).toMatchObject({
      catalogAssetsCoveredByV2Candidate: 130,
      productionApprovalEvidenceAssets: 130,
      sourceApprovalRecordedAssets: 29,
      productionApprovedAssets: 0,
      productionApprovalMissingAssets: 130,
    });
  });
});
