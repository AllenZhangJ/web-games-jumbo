import {
  createFormalAssetIntakeBundle,
} from '../../src/arena/presentation/assets/formal-asset-intake-bundle.js';
import {
  createArenaFormalAssetIntakeV1Policy,
} from '../../src/arena/presentation/assets/formal-asset-intake-policy.js';
import type { FormalAssetArtifactEvidence } from '../../src/arena/presentation/assets/formal-asset-provenance-record.js';
import {
  readVerifiedEvidenceArtifact,
  resolveEvidenceRoot,
} from './evidence-file-verifier.js';

const MAXIMUM_CONTENT_BYTES = 64 * 1024 * 1024;
const MAXIMUM_DOCUMENT_BYTES = 16 * 1024 * 1024;

type FormalAssetArtifactRole = 'content' | 'content-dependency' | 'license-text' | 'rights-proof';

export interface VerifiedFormalAssetArtifact {
  readonly kinds: readonly FormalAssetArtifactRole[];
  readonly path: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export interface FormalAssetIntakeVerificationResult {
  readonly status: 'verified-intake-only';
  readonly policyId: string;
  readonly policyHash: string;
  readonly bundleId: string;
  readonly bundleHash: string;
  readonly assetCount: number;
  readonly artifactCount: number;
  readonly verifiedArtifacts: readonly VerifiedFormalAssetArtifact[];
}

function artifactKey(artifact: FormalAssetArtifactEvidence): string {
  return `${artifact.path}\u0000${artifact.sha256}\u0000${artifact.byteLength}`;
}

export async function verifyArenaFormalAssetIntake({
  bundle: bundleValue,
  artifactsRoot,
}: Readonly<{
  bundle: unknown;
  artifactsRoot: string;
}>): Promise<FormalAssetIntakeVerificationResult> {
  const policy = createArenaFormalAssetIntakeV1Policy();
  const bundle = createFormalAssetIntakeBundle(policy, bundleValue);
  const root = await resolveEvidenceRoot(artifactsRoot);
  const uniqueArtifacts = new Map<string, {
    readonly kinds: Set<FormalAssetArtifactRole>;
    readonly artifact: FormalAssetArtifactEvidence;
  }>();
  for (const record of bundle.records) {
    const artifacts: readonly Readonly<{
      kind: FormalAssetArtifactRole;
      artifact: FormalAssetArtifactEvidence;
    }>[] = [
      { kind: 'content', artifact: record.contentArtifact },
      ...record.dependencyArtifacts.map((artifact) => ({
        kind: 'content-dependency' as const,
        artifact,
      })),
      { kind: 'license-text', artifact: record.license.textArtifact },
      { kind: 'rights-proof', artifact: record.proofArtifact },
    ];
    for (const { kind, artifact } of artifacts) {
      const key = artifactKey(artifact);
      const existing = uniqueArtifacts.get(key);
      if (existing) {
        existing.kinds.add(kind);
      } else {
        uniqueArtifacts.set(key, { kinds: new Set([kind]), artifact });
      }
    }
  }
  const verifiedArtifacts: VerifiedFormalAssetArtifact[] = [];
  for (const { kinds, artifact } of uniqueArtifacts.values()) {
    const artifactKinds = Object.freeze([...kinds].sort());
    const verified = await readVerifiedEvidenceArtifact({
      root,
      relativePath: artifact.path,
      expectedByteLength: artifact.byteLength,
      expectedSha256: artifact.sha256,
      maximumBytes: artifactKinds.some((kind) => kind.startsWith('content'))
        ? MAXIMUM_CONTENT_BYTES
        : MAXIMUM_DOCUMENT_BYTES,
      includeText: false,
      label: `formal asset ${artifactKinds.join('+')} ${artifact.path}`,
    });
    verifiedArtifacts.push(Object.freeze({
      kinds: artifactKinds,
      path: artifact.path,
      sha256: verified.sha256,
      byteLength: verified.byteLength,
    }));
  }
  verifiedArtifacts.sort((left, right) => (
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  ));
  return Object.freeze({
    status: 'verified-intake-only',
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    bundleId: bundle.id,
    bundleHash: bundle.getContentHash(),
    assetCount: bundle.assets.length,
    artifactCount: verifiedArtifacts.length,
    verifiedArtifacts: Object.freeze(verifiedArtifacts),
  });
}
