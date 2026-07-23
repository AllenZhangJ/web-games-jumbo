import path from 'node:path';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '@number-strategy-jump/arena-human-match-study';
import {
  HUMAN_MATCH_STUDY_REPORT_STATUS,
} from '@number-strategy-jump/arena-human-match-study';
import {
  readVerifiedTextFile,
} from './lib/evidence-file-verifier.ts';
import {
  verifyArenaHumanFairnessEvidence,
} from './lib/arena-human-fairness-evidence-verifier.ts';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:human-fairness:evidence -- --describe',
    '  npm run arena:human-fairness:evidence -- --bundle <study-evidence.json> --build-root <clean-web-build> [--artifacts-root <dir>]',
    '',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = {
    bundle: null,
    buildRoot: null,
    artifactsRoot: null,
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
    const match = argument.match(/^--(bundle|build-root|artifacts-root)(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (seen.has(key)) throw new Error(`参数 --${key} 不能重复。`);
    seen.add(key);
    const inlineValue = match[2];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 缺少值。`);
    if (key === 'bundle') result.bundle = value;
    else if (key === 'build-root') result.buildRoot = value;
    else result.artifactsRoot = value;
  }
  if (result.help) return result;
  if (result.describe && (result.bundle || result.buildRoot || result.artifactsRoot)) {
    throw new Error('--describe 不能与 --bundle、--build-root 或 --artifacts-root 同时使用。');
  }
  if (!result.describe && !result.bundle) throw new Error(`缺少 --bundle。\n${usage()}`);
  if (!result.describe && !result.buildRoot) throw new Error(`缺少 --build-root。\n${usage()}`);
  return result;
}

async function readBundleSource(bundlePath) {
  return JSON.parse((await readVerifiedTextFile(bundlePath, {
    label: 'human fairness evidence bundle',
    maximumBytes: MAXIMUM_BUNDLE_BYTES,
  })).text);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const definition = createArenaStage9HumanFairnessV1Definition();
  if (options.describe) {
    console.log(JSON.stringify({
      definition: definition.toJSON(),
      definitionHash: definition.getContentHash(),
      minimumCompletedParticipants: (
        definition.arms.length
        * definition.thresholds.minimumEligibleParticipantsPerArm
      ),
      minimumCompletedMatches: (
        definition.arms.length
        * definition.thresholds.minimumEligibleParticipantsPerArm
        * definition.matchesPerParticipant
      ),
    }, null, 2));
    return;
  }
  const bundlePath = path.resolve(options.bundle);
  const verified = await verifyArenaHumanFairnessEvidence({
    bundleValue: await readBundleSource(bundlePath),
    artifactsRoot: path.resolve(options.artifactsRoot ?? path.dirname(bundlePath)),
    buildRoot: path.resolve(options.buildRoot),
  });
  console.log(JSON.stringify({
    definitionId: verified.definition.id,
    definitionHash: verified.definition.getContentHash(),
    commit: verified.bundle.commit,
    buildId: verified.bundle.buildId,
    buildManifestHash: verified.buildManifest.getContentHash(),
    workspaceAudit: verified.workspaceAudit,
    verifiedMatchCount: verified.verifiedMatches.length,
    verifiedMatches: verified.verifiedMatches,
    report: verified.report,
  }, null, 2));
  if (verified.report.status !== HUMAN_MATCH_STUDY_REPORT_STATUS.READY) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
