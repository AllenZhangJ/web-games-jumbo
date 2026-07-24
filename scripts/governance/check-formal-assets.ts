import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT } from '@number-strategy-jump/arena-v1-presentation-content';
import { createFormalAssetIntakeBundle } from '../../src/arena/presentation/assets/formal-asset-intake-bundle.js';
import { createArenaFormalAssetIntakeV1Policy } from '../../src/arena/presentation/assets/formal-asset-intake-policy.js';
import { verifyArenaFormalAssetIntake } from '../lib/arena-formal-asset-intake-verifier.js';

const BUNDLE_PATH = 'governance/formal-assets/arena-stage7-formal-assets-v1.json';

export async function verifyFormalAssets(repositoryRoot = process.cwd()): Promise<Readonly<{
  bundleId: string;
  bundleHash: string;
  assetCount: number;
  artifactCount: number;
}>> {
  const root = path.resolve(repositoryRoot);
  const bundleValue = JSON.parse(await readFile(path.join(root, BUNDLE_PATH), 'utf8')) as unknown;
  const policy = createArenaFormalAssetIntakeV1Policy();
  const bundle = createFormalAssetIntakeBundle(policy, bundleValue);
  const runtimeAssets = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.assetRegistry.list()
    .filter((asset) => asset.tags.includes('formal') && asset.providerId.startsWith('arena.gltf-'));
  const runtimeById = new Map(runtimeAssets.map((asset) => [asset.id, asset]));
  if (runtimeById.size !== bundle.assets.length) {
    throw new RangeError('Formal Asset Intake Bundle 必须精确覆盖所有正式 GLTF 运行时资产。');
  }
  for (const approved of bundle.assets) {
    const runtime = runtimeById.get(approved.id);
    if (!runtime || runtime.getContentHash() !== approved.getContentHash()) {
      throw new RangeError(`运行时资产 ${approved.id} 与批准的 Definition 不一致。`);
    }
  }
  const result = await verifyArenaFormalAssetIntake({ bundle: bundleValue, artifactsRoot: root });
  return Object.freeze({
    bundleId: result.bundleId,
    bundleHash: result.bundleHash,
    assetCount: result.assetCount,
    artifactCount: result.artifactCount,
  });
}

async function main(): Promise<void> {
  const report = await verifyFormalAssets();
  console.log(JSON.stringify({ status: 'passed', ...report }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
