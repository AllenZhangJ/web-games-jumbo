import path from 'node:path';
import {
  ARENA_RELEASE_EVIDENCE_STATUS,
} from '../src/arena-release/release-evidence-statement.js';
import {
  createArenaInputPilotV1Definition,
} from '@number-strategy-jump/arena-input-pilot';
import {
  createArenaStage6DeviceAcceptanceV1Definition,
} from '@number-strategy-jump/arena-device-acceptance';
import { readVerifiedTextFile } from './lib/evidence-file-verifier.mjs';
import {
  verifyArenaInputPilotEvidence,
} from './lib/arena-input-pilot-evidence-verifier.mjs';

const MAXIMUM_BUNDLE_BYTES = 32 * 1024 * 1024;
const MAXIMUM_DEVICE_BUNDLE_BYTES = 5 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:input-pilot:evidence -- --describe',
    '  npm run arena:input-pilot:evidence -- --bundle <input-pilot-evidence.json> --build-root <clean-web-build> --device-evidence <device-evidence.json> [--device-artifacts-root <dir>]',
    '',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = {
    bundle: null,
    buildRoot: null,
    deviceEvidence: null,
    deviceArtifactsRoot: null,
    describe: false,
    help: false,
  };
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (argument === '--help' || argument === '-h') {
      result.help = true;
      continue;
    }
    if (argument === '--describe') {
      if (seen.has('describe')) throw new Error('参数 --describe 不能重复。');
      seen.add('describe');
      result.describe = true;
      continue;
    }
    const match = argument.match(
      /^--(bundle|build-root|device-evidence|device-artifacts-root)(?:=(.*))?$/,
    );
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (seen.has(key)) throw new Error(`参数 --${key} 不能重复。`);
    seen.add(key);
    const inlineValue = match[2];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 缺少值。`);
    if (key === 'bundle') result.bundle = value;
    else if (key === 'build-root') result.buildRoot = value;
    else if (key === 'device-evidence') result.deviceEvidence = value;
    else result.deviceArtifactsRoot = value;
  }
  if (result.help) return result;
  if (result.describe && (
    result.bundle
    || result.buildRoot
    || result.deviceEvidence
    || result.deviceArtifactsRoot
  )) throw new Error('--describe 不能与证据路径参数同时使用。');
  if (!result.describe && !result.bundle) throw new Error(`缺少 --bundle。\n${usage()}`);
  if (!result.describe && !result.buildRoot) throw new Error(`缺少 --build-root。\n${usage()}`);
  if (!result.describe && !result.deviceEvidence) {
    throw new Error(`缺少 --device-evidence。\n${usage()}`);
  }
  return result;
}

async function readJson(filePath, label, maximumBytes) {
  const source = await readVerifiedTextFile(filePath, { label, maximumBytes });
  return JSON.parse(source.text);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const definition = createArenaInputPilotV1Definition();
  const deviceDefinition = createArenaStage6DeviceAcceptanceV1Definition();
  if (options.describe) {
    console.log(JSON.stringify({
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
      requiredAssessmentStatus: 'candidate-winner',
      requiredBuildArtifact: 'pilot.html',
      requiredDeviceDefinition: {
        id: deviceDefinition.id,
        hash: deviceDefinition.getContentHash(),
        status: 'ready',
      },
    }, null, 2));
    return;
  }
  const evidencePath = path.resolve(options.bundle);
  const devicePath = path.resolve(options.deviceEvidence);
  const verified = await verifyArenaInputPilotEvidence({
    evidenceBundleValue: await readJson(
      evidencePath,
      'Input Pilot evidence bundle',
      MAXIMUM_BUNDLE_BYTES,
    ),
    buildRoot: path.resolve(options.buildRoot),
    deviceEvidenceBundleValue: await readJson(
      devicePath,
      'Stage 6 device evidence bundle',
      MAXIMUM_DEVICE_BUNDLE_BYTES,
    ),
    deviceArtifactsRoot: path.resolve(
      options.deviceArtifactsRoot ?? path.dirname(devicePath),
    ),
  });
  console.log(JSON.stringify({
    commit: verified.evidenceBundle.commit,
    buildId: verified.evidenceBundle.buildId,
    buildManifestHash: verified.buildManifest.getContentHash(),
    report: verified.evidenceBundle.audit.report,
    stage6DeviceReport: verified.deviceVerification.report,
    result: verified.result,
  }, null, 2));
  if (verified.result.status !== ARENA_RELEASE_EVIDENCE_STATUS.READY) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
