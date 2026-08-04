import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  cloneArenaPa6StrictDataV1,
  createArenaPa6PlanV1,
  parseArenaPa6CliV1,
  publishArenaPa6ReportAtomicV1,
  readArenaPa6EnvironmentV1,
  readArenaPa6SourceIdentityV1,
  runArenaPa6AbbaV1,
  runArenaPa6GroupWorkerV1,
} from './lib/arena-pa6-read-step-abba-v1.js';

export async function runArenaPa6CliV1(args: readonly string[]): Promise<unknown> {
  const options = parseArenaPa6CliV1(args);
  const cwd = process.cwd();
  if (options.mode === 'worker') {
    if (options.workerGroup === null || options.expectedHead === null
      || options.expectedDirty === null || options.expectedFingerprint === null
      || options.expectedPlanIdentity === null) {
      throw new Error('PA6 worker 参数缺失。');
    }
    return runArenaPa6GroupWorkerV1({
      groupIndex: options.workerGroup,
      groupCount: options.groups,
      expectedPlanIdentity: options.expectedPlanIdentity,
      expectedSource: Object.freeze({
        head: options.expectedHead,
        dirty: options.expectedDirty,
        fingerprint: options.expectedFingerprint,
      }),
      timeoutMs: options.timeoutMs,
      outputCapBytes: options.outputCapBytes,
      cwd,
      progressPath: options.progressPath ?? undefined,
      progressToken: options.progressToken ?? undefined,
    });
  }
  if (options.mode === 'plan') {
    return Object.freeze({
      schemaVersion: 1,
      mode: 'plan',
      source: readArenaPa6SourceIdentityV1(cwd),
      environment: readArenaPa6EnvironmentV1(),
      plan: createArenaPa6PlanV1(options.groups),
    });
  }
  return runArenaPa6AbbaV1({
    groupCount: options.groups,
    timeoutMs: options.timeoutMs,
    outputCapBytes: options.outputCapBytes,
    cwd,
  });
}

async function main(): Promise<void> {
  const options = parseArenaPa6CliV1(process.argv.slice(2));
  const result = await runArenaPa6CliV1(process.argv.slice(2));
  const safeResult = cloneArenaPa6StrictDataV1(result, 'PA6 CLI result');
  if (options.output !== null) await publishArenaPa6ReportAtomicV1(options.output, safeResult);
  process.stdout.write(`${JSON.stringify(safeResult)}\n`);
  if (options.mode === 'run'
    && typeof safeResult === 'object' && safeResult !== null
    && !Array.isArray(safeResult)
    && Object.getOwnPropertyDescriptor(safeResult, 'status')?.value === 'failed') {
    process.exitCode = 1;
  }
}

const invokedScript = process.argv[1] === undefined
  ? false
  : pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedScript) void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'PA6 CLI unknown failure'}\n`);
  process.exitCode = 1;
});
