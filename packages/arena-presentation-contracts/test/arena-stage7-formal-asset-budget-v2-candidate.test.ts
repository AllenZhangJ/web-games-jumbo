import { describe, expect, it } from 'vitest';
import {
  ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_CONTENT_HASH,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_INPUT,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA,
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY,
  createArenaStage7FormalAssetBudgetV2Candidate,
} from '../src/index.js';

type MutableCandidateInput = Record<PropertyKey, unknown> & Readonly<{
  artifacts: Array<Record<PropertyKey, unknown>>;
}>;

function mutableCandidateInput(): MutableCandidateInput {
  return JSON.parse(JSON.stringify(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_INPUT,
  )) as MutableCandidateInput;
}

describe('Arena Stage7 formal asset budget V2 candidate (not run)', () => {
  it('freezes the exact current catalog byte identities in canonical order', () => {
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA.contentVersion).toBe(4);
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS).toHaveLength(130);
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map(({ id }) => id)).toEqual(
      [...ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS]
        .map(({ id }) => id)
        .sort(),
    );
    expect(new Set(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map(({ id }) => id),
    ).size).toBe(130);
    expect(new Set(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map(({ path }) => path),
    ).size).toBe(130);
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA.summary)
      .toMatchObject({
        artifactCount: 130,
        audioArtifactCount: 98,
        characterModelArtifactCount: 2,
        mapModelArtifactCount: 2,
        modelAttachmentArtifactCount: 20,
        textureArtifactCount: 8,
        totalDecodedTextureBytes: 12_910_592,
      });
  });

  it('freezes the encoded media container identity for every current artifact', () => {
    const formatCounts = new Map<string, number>();
    for (const artifact of ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS) {
      formatCounts.set(
        artifact.encodedMediaFormat,
        (formatCounts.get(artifact.encodedMediaFormat) ?? 0) + 1,
      );
      expect(artifact.path.endsWith(`.${artifact.encodedMediaFormat}`)).toBe(true);
    }
    expect(formatCounts).toEqual(new Map([
      [ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB, 24],
      [ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG, 98],
      [ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.PNG, 8],
    ]));
  });

  it('freezes canonical source texture dimensions in policy metadata', () => {
    const textures = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS
      .filter(({ kind }) => kind === 'texture');
    expect(textures.map(({ widthPixels, heightPixels }) => (
      `${widthPixels}x${heightPixels}`
    ))).toEqual([
      '1024x1024',
      '1024x1024',
      '1024x1024',
      '128x128',
      '128x128',
      '128x128',
      '128x128',
      '128x128',
    ]);
    expect(textures.every((artifact) => (
      artifact.decodedTextureFormat === 'rgba8'
      && artifact.widthPixels * artifact.heightPixels * 4 === artifact.decodedTextureBytes
    ))).toBe(true);
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS
      .filter(({ kind }) => kind !== 'texture')
      .every(({ decodedTextureFormat, widthPixels, heightPixels }) => (
        decodedTextureFormat === 'not-applicable'
        && widthPixels === 0
        && heightPixels === 0
      )))
      .toBe(true);
  });

  it('recomputes totals and keeps exact current bytes as unapproved candidate maxima', () => {
    const artifacts = ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS;
    const totalEncodedBytes = artifacts.reduce(
      (total, artifact) => total + artifact.currentEncodedBytes,
      0,
    );
    const totalAudioBytes = artifacts
      .filter(({ kind }) => kind === 'audio')
      .reduce((total, artifact) => total + artifact.currentEncodedBytes, 0);
    const totalDecodedTextureBytes = artifacts.reduce(
      (total, artifact) => total + artifact.decodedTextureBytes,
      0,
    );
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA.summary).toMatchObject({
      totalEncodedBytes,
      totalAudioBytes,
      totalDecodedTextureBytes,
    });
    expect(artifacts.every((artifact) => (
      artifact.currentEncodedBytes === artifact.maximumEncodedBytes
      && artifact.limitStatus === 'frozen-current-bytes-candidate-not-approved'
    ))).toBe(true);
  });

  it('uses a new identity without mutating or replacing the approved V1 policy truth', () => {
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_ARTIFACTS).toHaveLength(10);
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH).toBe('532faaa2');
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY).toEqual({
      policyId: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID,
      policyContentHash: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_CONTENT_HASH,
      artifactCount: 130,
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      approvalStatus: 'proposed-not-approved',
      hardGateUsable: false,
    });
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_CONTENT_HASH)
      .not.toBe(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V1_CONTENT_HASH);
    expect(createArenaStage7FormalAssetBudgetV2Candidate(
      ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_INPUT,
    ).contentHash).toBe(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_CONTENT_HASH);
  });

  it('keeps approval, hard gate and every default consumer closed', () => {
    expect(ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      approvalStatus: 'proposed-not-approved',
      hardGate: false,
      hardGateUsable: false,
      defaultFormalBundleConsumes: false,
      defaultPreloaderConsumes: false,
      defaultEntryConsumes: false,
      structuralLimits: {
        status: 'unresolved-not-approved',
        hardGateUsable: false,
      },
      pipelineBoundary: {
        encodedMediaFormatMetadataOwner: 'formal-presentation-asset-catalog',
        textureDimensionMetadataOwner: 'formal-presentation-asset-catalog',
        manageApprovalOwnedHere: false,
        createsOrModifiesAssets: false,
        loadsAssets: false,
      },
    });
  });

  it('rejects duplicate ids, duplicate paths, unknown assets and canonical-order drift', () => {
    const duplicateId = mutableCandidateInput();
    duplicateId.artifacts[1]!.id = duplicateId.artifacts[0]!.id;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(duplicateId)).toThrow();

    const duplicatePath = mutableCandidateInput();
    duplicatePath.artifacts[1]!.path = duplicatePath.artifacts[0]!.path;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(duplicatePath)).toThrow();

    const unknown = mutableCandidateInput();
    unknown.artifacts[0]!.id = 'arena.asset.unknown.future.v1';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(unknown)).toThrow();

    const reordered = mutableCandidateInput();
    [reordered.artifacts[0], reordered.artifacts[1]] = [
      reordered.artifacts[1]!,
      reordered.artifacts[0]!,
    ];
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(reordered)).toThrow();
  });

  it('rejects coherent byte, sha, path and kind substitution', () => {
    const bytes = mutableCandidateInput();
    bytes.artifacts[1]!.currentEncodedBytes = Number(
      bytes.artifacts[1]!.currentEncodedBytes,
    ) + 1;
    bytes.artifacts[1]!.maximumEncodedBytes = Number(
      bytes.artifacts[1]!.maximumEncodedBytes,
    ) + 1;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(bytes)).toThrow();

    const sha = mutableCandidateInput();
    sha.artifacts[1]!.sha256 = '0'.repeat(64);
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(sha)).toThrow();

    const path = mutableCandidateInput();
    path.artifacts[1]!.path = 'public/assets/arena/audio/coherent-substitution.ogg';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(path)).toThrow();

    const kind = mutableCandidateInput();
    kind.artifacts[1]!.kind = 'character-model';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(kind)).toThrow();

    const encodedMediaFormat = mutableCandidateInput();
    encodedMediaFormat.artifacts[1]!.encodedMediaFormat = 'png';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(encodedMediaFormat)).toThrow();
  });

  it('rejects texture dimension drift and dimensions on non-texture assets', () => {
    const textureDimensionDrift = mutableCandidateInput();
    const texture = textureDimensionDrift.artifacts.find(({ kind }) => kind === 'texture');
    if (texture === undefined) throw new Error('测试夹具必须包含纹理。');
    texture.widthPixels = Number(texture.widthPixels) / 2;
    texture.heightPixels = Number(texture.heightPixels) * 2;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(textureDimensionDrift)).toThrow();

    const nonTextureDimension = mutableCandidateInput();
    const nonTexture = nonTextureDimension.artifacts.find(({ kind }) => kind !== 'texture');
    if (nonTexture === undefined) throw new Error('测试夹具必须包含非纹理资产。');
    nonTexture.widthPixels = 1;
    nonTexture.heightPixels = 1;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(nonTextureDimension)).toThrow();

    const textureFormatDrift = mutableCandidateInput();
    const formatTexture = textureFormatDrift.artifacts.find(({ kind }) => kind === 'texture');
    if (formatTexture === undefined) throw new Error('测试夹具必须包含纹理。');
    formatTexture.decodedTextureFormat = 'not-applicable';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(textureFormatDrift)).toThrow();
  });

  it('rejects unsafe integers, future fields, accessors and Symbols', () => {
    const unsafe = mutableCandidateInput();
    unsafe.artifacts[0]!.currentEncodedBytes = Number.MAX_SAFE_INTEGER + 1;
    unsafe.artifacts[0]!.maximumEncodedBytes = Number.MAX_SAFE_INTEGER + 1;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(unsafe)).toThrow();

    const futureRoot = mutableCandidateInput();
    futureRoot.futureApproval = true;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(futureRoot)).toThrow();

    const implementationStatusDrift = mutableCandidateInput();
    implementationStatusDrift.implementationStatus = 'passed';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(
      implementationStatusDrift,
    )).toThrow();

    const validationStatusDrift = mutableCandidateInput();
    validationStatusDrift.validationStatus = 'passed';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(validationStatusDrift)).toThrow();

    const futureArtifact = mutableCandidateInput();
    futureArtifact.artifacts[0]!.futureBudgetClass = 'model';
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(futureArtifact)).toThrow();

    const accessor = mutableCandidateInput();
    let getterCallCount = 0;
    Object.defineProperty(accessor.artifacts[0]!, 'sha256', {
      enumerable: true,
      get: () => {
        getterCallCount += 1;
        return ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS[0]!.sha256;
      },
    });
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(accessor)).toThrow();
    expect(getterCallCount).toBe(0);

    const symbol = mutableCandidateInput();
    symbol.artifacts[0]![Symbol('future')] = true;
    expect(() => createArenaStage7FormalAssetBudgetV2Candidate(symbol)).toThrow();
  });
});
