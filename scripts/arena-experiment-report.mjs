import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readArenaExperimentReportBundle } from '@number-strategy-jump/arena-experiment';

async function main() {
  const values = process.argv.slice(2);
  if (values.length === 0) {
    throw new Error('Usage: npm run arena:experiment:report:verify -- <report.json> [...]');
  }
  const reports = [];
  for (const value of values) {
    if (value.startsWith('-')) throw new Error(`未知 Report 验证参数 ${value}。`);
    const file = path.resolve(value);
    let parsed;
    try {
      parsed = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      throw new Error(`无法读取实验 Report ${file}：${error.message}`);
    }
    const bundle = readArenaExperimentReportBundle(parsed);
    reports.push(Object.freeze({
      file,
      bundleHash: bundle.bundleHash,
      suite: bundle.suite,
      definitionId: bundle.report.definitionId,
      definitionHash: bundle.report.definitionHash,
      outcome: bundle.report.outcome,
      freezeEligible: bundle.report.freezeEligible,
      resultHash: bundle.report.resultHash,
    }));
  }
  console.log(JSON.stringify({ reports }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
