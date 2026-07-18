import path from 'node:path';
import {
  ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS,
} from '../src/arena/presentation/acceptance/arena-device-acceptance-bundle.js';
import {
  ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID,
  createArenaDeviceAcceptanceDefinitionById,
  listArenaDeviceAcceptanceDefinitionIds,
} from '../src/arena/presentation/acceptance/arena-device-acceptance-catalog.js';
import {
  ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID,
} from '../src/arena/presentation/acceptance/arena-stage9-performance-device-acceptance-v1.js';
import {
  createArenaStage9PerformanceV1Policy,
} from '../src/arena/presentation/performance/arena-stage9-performance-v1.js';
import {
  readVerifiedTextFile,
} from './lib/evidence-file-verifier.mjs';
import { verifyArenaDeviceEvidence } from './lib/arena-device-evidence-verifier.mjs';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:device:evidence -- --describe [--definition <id>]',
    '  npm run arena:device:evidence -- --bundle <device-evidence.json> [--artifacts-root <dir>] [--definition <id>]',
    '',
    `Definitions: ${listArenaDeviceAcceptanceDefinitionIds().join(', ')}`,
    '',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = {
    bundle: null,
    artifactsRoot: null,
    definitionId: ARENA_DEFAULT_DEVICE_ACCEPTANCE_DEFINITION_ID,
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
    const match = argument.match(/^--(bundle|artifacts-root|definition)(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (seen.has(key)) throw new Error(`参数 --${key} 不能重复。`);
    seen.add(key);
    const inlineValue = match[2];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 缺少值。`);
    if (key === 'bundle') result.bundle = value;
    else if (key === 'artifacts-root') result.artifactsRoot = value;
    else result.definitionId = value;
  }
  if (result.help) return result;
  if (result.describe && (result.bundle || result.artifactsRoot)) {
    throw new Error('--describe 不能与 --bundle 或 --artifacts-root 同时使用。');
  }
  if (!result.describe && !result.bundle) throw new Error(`缺少 --bundle。\n${usage()}`);
  return result;
}

async function readBundleSource(bundlePath) {
  return (await readVerifiedTextFile(bundlePath, {
    label: 'device evidence bundle',
    maximumBytes: MAXIMUM_BUNDLE_BYTES,
  })).text;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const definition = createArenaDeviceAcceptanceDefinitionById(options.definitionId);
  if (options.describe) {
    const description = {
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
    };
    if (definition.id === ARENA_STAGE9_PERFORMANCE_DEVICE_ACCEPTANCE_V1_ID) {
      const performancePolicy = createArenaStage9PerformanceV1Policy();
      description.performancePolicy = performancePolicy.toJSON();
      description.performancePolicyHash = performancePolicy.getContentHash();
    }
    console.log(JSON.stringify(description, null, 2));
    return;
  }
  const bundlePath = path.resolve(options.bundle);
  const artifactRoot = path.resolve(options.artifactsRoot ?? path.dirname(bundlePath));
  const source = JSON.parse(await readBundleSource(bundlePath));
  const verified = await verifyArenaDeviceEvidence({
    definition,
    bundleValue: source,
    artifactsRoot: artifactRoot,
  });
  const { report, performanceReport } = verified;
  console.log(JSON.stringify({
    verifiedArtifactCount: verified.artifacts.length,
    artifacts: verified.artifacts,
    report,
    ...(performanceReport === null ? {} : { performanceReport }),
  }, null, 2));
  if (
    report.status !== ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
    || (
      performanceReport !== null
      && performanceReport.status !== ARENA_DEVICE_ACCEPTANCE_REPORT_STATUS.READY
    )
  ) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
