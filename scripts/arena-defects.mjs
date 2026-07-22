import {
  ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
  ARENA_DEFECT_REPORT_STATUS,
  ARENA_DEFECT_SEVERITY,
  ARENA_DEFECT_STATUS,
  createArenaDefectLedger,
  createArenaDefectReport,
} from '@number-strategy-jump/arena-release';
import { readVerifiedTextFile } from './lib/evidence-file-verifier.mjs';

const MAXIMUM_LEDGER_BYTES = 5 * 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  npm run arena:defects:verify -- --describe',
    '  npm run arena:defects:verify -- --ledger <defect-ledger.json>',
    '',
    'Exit codes: 0=ready, 2=incomplete/failed, 1=invalid ledger or I/O failure.',
  ].join('\n');
}

function parseArgs(values) {
  const result = { describe: false, ledger: null, help: false };
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
    const match = argument.match(/^--ledger(?:=(.*))?$/);
    if (!match) throw new Error(`未知参数 ${argument}。\n${usage()}`);
    if (seen.has('ledger')) throw new Error('参数 --ledger 不能重复。');
    seen.add('ledger');
    const inlineValue = match[1];
    const value = inlineValue === undefined ? values[++index] : inlineValue;
    if (!value || value.startsWith('--')) throw new Error('参数 --ledger 缺少值。');
    result.ledger = value;
  }
  if (result.help) return result;
  if (result.describe && result.ledger) throw new Error('--describe 不能与 --ledger 同时使用。');
  if (!result.describe && !result.ledger) throw new Error(`缺少 --ledger。\n${usage()}`);
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.describe) {
    console.log(JSON.stringify({
      schemaVersion: ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
      severity: ARENA_DEFECT_SEVERITY,
      defectStatus: ARENA_DEFECT_STATUS,
      requiredReleaseConditions: {
        knownIssuesComplete: true,
        maximumOpenBlockingDefects: 0,
        maximumOpenHighPriorityDefects: 0,
        everyOpenDefectHasResidualRiskOwner: true,
        everyResolvedDefectHasVerificationReferences: true,
      },
    }, null, 2));
    return;
  }
  const source = JSON.parse((await readVerifiedTextFile(options.ledger, {
    label: 'Arena defect ledger',
    maximumBytes: MAXIMUM_LEDGER_BYTES,
  })).text);
  const ledger = createArenaDefectLedger(source);
  const report = createArenaDefectReport(ledger);
  console.log(JSON.stringify({ ledger, report }, null, 2));
  if (report.status !== ARENA_DEFECT_REPORT_STATUS.READY) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
