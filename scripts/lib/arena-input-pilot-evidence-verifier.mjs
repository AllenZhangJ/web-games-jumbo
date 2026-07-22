import {
  createArenaInputPilotReleaseResult,
} from '../../src/arena-release/input-pilot-release-evidence.js';
import {
  createArenaStage6DeviceReleaseResult,
} from '../../src/arena-release/device-release-evidence.js';
import {
  createArenaInputPilotV1Definition,
  createInputPilotEvidenceBundle,
} from '@number-strategy-jump/arena-input-pilot';
import {
  createArenaStage6DeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  verifyArenaBuildManifestDirectory,
} from './arena-build-manifest-files.mjs';
import { verifyArenaDeviceEvidence } from './arena-device-evidence-verifier.mjs';

export async function verifyArenaInputPilotEvidence({
  evidenceBundleValue,
  buildRoot,
  deviceEvidenceBundleValue,
  deviceArtifactsRoot,
}) {
  const definition = createArenaInputPilotV1Definition();
  const evidenceBundle = createInputPilotEvidenceBundle(definition, evidenceBundleValue);
  const buildManifest = await verifyArenaBuildManifestDirectory(
    buildRoot,
    { requireCleanSource: true },
  );
  const deviceDefinition = createArenaStage6DeviceAcceptanceV1Definition();
  const deviceVerification = await verifyArenaDeviceEvidence({
    definition: deviceDefinition,
    bundleValue: deviceEvidenceBundleValue,
    artifactsRoot: deviceArtifactsRoot,
  });
  const stage6DeviceResult = createArenaStage6DeviceReleaseResult({
    bundle: deviceVerification.bundle,
  });
  const result = createArenaInputPilotReleaseResult({
    evidenceBundle,
    buildManifest,
    stage6DeviceResult,
  });
  return Object.freeze({
    definition,
    evidenceBundle,
    buildManifest,
    deviceDefinition,
    deviceVerification,
    stage6DeviceResult,
    result,
  });
}
