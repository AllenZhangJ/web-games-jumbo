import path from 'node:path';
import {
  createArenaStage9HumanFairnessV1Definition,
} from '../src/arena/study/arena-stage9-human-fairness-v1.js';
import {
  createHumanMatchStudyBundle,
} from '../src/arena/study/human-match-study-bundle.js';
import {
  HUMAN_MATCH_STUDY_REPORT_STATUS,
  createHumanMatchStudyReport,
} from '../src/arena/study/human-match-study-report.js';
import {
  verifyHumanMatchStudyReplay,
} from '../src/arena/study/human-match-study-replay-verifier.js';
import {
  readVerifiedEvidenceArtifact,
  readVerifiedTextFile,
  resolveEvidenceRoot,
} from './lib/evidence-file-verifier.mjs';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;
const MAXIMUM_REPLAY_BYTES = 64 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:human-fairness:evidence -- --describe',
    '  npm run arena:human-fairness:evidence -- --bundle <study-evidence.json> [--artifacts-root <dir>]',
    '',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid evidence or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = {
    bundle: null,
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
    const match = argument.match(/^--(bundle|artifacts-root)(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    const key = match[1];
    if (seen.has(key)) throw new Error(`参数 --${key} 不能重复。`);
    seen.add(key);
    const inlineValue = match[2];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 缺少值。`);
    if (key === 'bundle') result.bundle = value;
    else result.artifactsRoot = value;
  }
  if (result.help) return result;
  if (result.describe && (result.bundle || result.artifactsRoot)) {
    throw new Error('--describe 不能与 --bundle 或 --artifacts-root 同时使用。');
  }
  if (!result.describe && !result.bundle) throw new Error(`缺少 --bundle。\n${usage()}`);
  return result;
}

async function readBundleSource(bundlePath) {
  return JSON.parse((await readVerifiedTextFile(bundlePath, {
    label: 'human fairness evidence bundle',
    maximumBytes: MAXIMUM_BUNDLE_BYTES,
  })).text);
}

async function verifyReplays(definition, bundle, rootValue) {
  const root = await resolveEvidenceRoot(rootValue);
  const paths = new Set();
  const files = new Set();
  const hashes = new Set();
  const verifiedMatches = [];
  for (const record of bundle.records) {
    for (const match of record.matches) {
      const artifact = match.replayArtifact;
      const verifiedFile = await readVerifiedEvidenceArtifact({
        root,
        relativePath: artifact.path,
        expectedByteLength: artifact.byteLength,
        expectedSha256: artifact.sha256,
        maximumBytes: MAXIMUM_REPLAY_BYTES,
        label: `replay artifact ${artifact.path}`,
      });
      if (paths.has(verifiedFile.resolvedPath)) {
        throw new Error(`replay artifact ${artifact.path} 重复使用同一路径。`);
      }
      if (files.has(verifiedFile.fileIdentity)) {
        throw new Error(`replay artifact ${artifact.path} 重复使用同一文件。`);
      }
      if (hashes.has(verifiedFile.sha256)) {
        throw new Error(`replay artifact ${artifact.path} 重复使用相同内容。`);
      }
      paths.add(verifiedFile.resolvedPath);
      files.add(verifiedFile.fileIdentity);
      hashes.add(verifiedFile.sha256);
      const replay = JSON.parse(verifiedFile.text);
      verifiedMatches.push(verifyHumanMatchStudyReplay({
        definition,
        record,
        matchIndex: match.matchIndex,
        replay,
      }));
    }
  }
  return Object.freeze(verifiedMatches);
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
  const artifactsRoot = path.resolve(options.artifactsRoot ?? path.dirname(bundlePath));
  const bundle = createHumanMatchStudyBundle(
    definition,
    await readBundleSource(bundlePath),
  );
  const report = createHumanMatchStudyReport(definition, bundle.records);
  const verifiedMatches = await verifyReplays(definition, bundle, artifactsRoot);
  console.log(JSON.stringify({
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: bundle.commit,
    buildId: bundle.buildId,
    verifiedMatchCount: verifiedMatches.length,
    verifiedMatches,
    report,
  }, null, 2));
  if (report.status !== HUMAN_MATCH_STUDY_REPORT_STATUS.READY) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
