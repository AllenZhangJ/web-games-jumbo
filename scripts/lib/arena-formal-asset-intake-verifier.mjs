import {
  createFormalAssetIntakeBundle,
} from '../../src/arena/presentation/assets/formal-asset-intake-bundle.ts';
import {
  createArenaFormalAssetIntakeV1Policy,
} from '../../src/arena/presentation/assets/formal-asset-intake-policy.ts';
import {
  readVerifiedEvidenceArtifact,
  resolveEvidenceRoot,
} from './evidence-file-verifier.mjs';

const MAXIMUM_CONTENT_BYTES = 64 * 1024 * 1024;
const MAXIMUM_DOCUMENT_BYTES = 16 * 1024 * 1024;

function artifactKey(artifact) {
  return `${artifact.path}\u0000${artifact.sha256}\u0000${artifact.byteLength}`;
}

export async function verifyArenaFormalAssetIntake({
  bundle: bundleValue,
  artifactsRoot,
}) {
  const policy = createArenaFormalAssetIntakeV1Policy();
  const bundle = createFormalAssetIntakeBundle(policy, bundleValue);
  const root = await resolveEvidenceRoot(artifactsRoot);
  const uniqueArtifacts = new Map();
  for (const record of bundle.records) {
    for (const [kind, artifact] of [
      ['content', record.contentArtifact],
      ...record.dependencyArtifacts.map((entry) => ['content-dependency', entry]),
      ['license-text', record.license.textArtifact],
      ['rights-proof', record.proofArtifact],
    ]) {
      const key = artifactKey(artifact);
      const existing = uniqueArtifacts.get(key);
      if (existing) {
        existing.kinds.add(kind);
      } else {
        uniqueArtifacts.set(key, { kinds: new Set([kind]), artifact });
      }
    }
  }
  const verifiedArtifacts = [];
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
