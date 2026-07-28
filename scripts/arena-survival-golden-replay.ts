import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createArenaGoldenReplayManifest,
  createArenaV2SurvivalGoldenReplayCore,
  createArenaV2SurvivalGoldenReplayScenarioRegistry,
  verifyArenaGoldenReplayCorpus,
} from '@number-strategy-jump/arena-regression';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'tests/arena/fixtures/replays/survival-v5');

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}

const manifest = createArenaGoldenReplayManifest(await readJson(path.join(directory, 'manifest.json')));
const expectedFiles = new Set(['manifest.json', ...manifest.entries.map(({ file }) => file)]);
for (const entry of await readdir(directory, { withFileTypes: true })) {
  if (entry.name.startsWith('.')) continue;
  if (!entry.isFile() || !expectedFiles.delete(entry.name)) {
    throw new Error(`Arena V2 生存黄金回放目录包含未登记内容 ${entry.name}。`);
  }
}
if (expectedFiles.size > 0) {
  throw new Error(`Arena V2 生存黄金回放目录缺少 ${[...expectedFiles].join(', ')}。`);
}
const fixtures = await Promise.all(manifest.entries.map(async ({ file }) => ({
  file,
  replay: await readJson(path.join(directory, file)),
})));
const report = verifyArenaGoldenReplayCorpus({
  manifest,
  fixtures,
  scenarioRegistry: createArenaV2SurvivalGoldenReplayScenarioRegistry(),
  coreFactory: createArenaV2SurvivalGoldenReplayCore,
});
console.log(JSON.stringify(report, null, 2));
