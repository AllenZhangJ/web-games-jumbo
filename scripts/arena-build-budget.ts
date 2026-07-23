import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage9BuildBudgetV1Policy,
} from '@number-strategy-jump/arena-performance-evidence';
import {
  createArenaBuildBudgetReport,
} from '@number-strategy-jump/arena-performance-evidence';
import {
  verifyArenaBuildManifestDirectory,
} from './lib/arena-build-manifest-files.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = createArenaStage9BuildBudgetV1Policy();
const reports: ReturnType<typeof createArenaBuildBudgetReport>[] = [];
for (const platform of ['web', 'wechat', 'douyin']) {
  const manifest = await verifyArenaBuildManifestDirectory(path.join(root, 'dist', platform));
  reports.push(createArenaBuildBudgetReport(policy, manifest));
}
console.log(JSON.stringify({
  policy: policy.toJSON(),
  policyHash: policy.getContentHash(),
  status: reports.every(({ status }) => status === 'passed') ? 'passed' : 'failed',
  freezeEligible: reports.every(({ freezeEligible }) => freezeEligible),
  reports,
}, null, 2));
if (reports.some(({ status }) => status !== 'passed')) process.exitCode = 2;
