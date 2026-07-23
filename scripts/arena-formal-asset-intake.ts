import { parseArgs } from 'node:util';
import {
  createArenaFormalAssetIntakeV1Policy,
} from '../src/arena/presentation/assets/formal-asset-intake-policy.js';
import {
  readVerifiedTextFile,
} from './lib/evidence-file-verifier.js';
import {
  verifyArenaFormalAssetIntake,
} from './lib/arena-formal-asset-intake-verifier.js';

const MAXIMUM_BUNDLE_BYTES = 5 * 1024 * 1024;

function describe(): Readonly<Record<string, unknown>> {
  const policy = createArenaFormalAssetIntakeV1Policy();
  return {
    status: 'contract-only',
    policy: policy.toJSON(),
    policyHash: policy.getContentHash(),
    requiredArguments: ['--bundle', '--artifacts-root'],
    resultMeaning: '只证明来源、授权和文件完整性，不代表 S7.5 或发行门通过。',
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      describe: { type: 'boolean', default: false },
      bundle: { type: 'string' },
      'artifacts-root': { type: 'string' },
    },
    strict: true,
  });
  if (values.describe) {
    process.stdout.write(`${JSON.stringify(describe(), null, 2)}\n`);
    return;
  }
  if (!values.bundle || !values['artifacts-root']) {
    throw new Error('必须同时提供 --bundle 与 --artifacts-root。');
  }
  const read = await readVerifiedTextFile(values.bundle, {
    label: 'formal asset intake bundle',
    maximumBytes: MAXIMUM_BUNDLE_BYTES,
  });
  let bundle: unknown;
  try {
    bundle = JSON.parse(read.text);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`formal asset intake bundle 不是有效 JSON：${message}`);
  }
  const result = await verifyArenaFormalAssetIntake({
    bundle,
    artifactsRoot: values['artifacts-root'],
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
