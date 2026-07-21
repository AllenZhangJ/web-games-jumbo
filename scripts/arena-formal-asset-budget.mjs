import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaStage7FormalAssetBudgetV1Policy,
} from '../src/arena/presentation/assets/formal-asset-budget-policy.js';
import {
  verifyArenaFormalAssetBudget,
} from './lib/arena-formal-asset-budget-verifier.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = createArenaStage7FormalAssetBudgetV1Policy();
const report = await verifyArenaFormalAssetBudget({ repositoryRoot: root });
process.stdout.write(`${JSON.stringify({
  policy: policy.toJSON(),
  policyHash: policy.getContentHash(),
  report,
}, null, 2)}\n`);
if (report.status !== 'passed') process.exitCode = 2;
