import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { NodeIO } from '@gltf-transform/core';

const EXPECTED_SOURCE_REVISION = '672074b73ba276876a19e8816ecdc5241817ab47';
const SOURCE_SUBDIRECTORY = path.join(
  'addons',
  'kaykit_character_pack_adventures',
  'Assets',
  'gltf',
);
const OUTPUT_DIRECTORY = path.join(
  'public',
  'assets',
  'arena',
  'equipment',
  'kaykit-adventurers',
  'weapon-candidates',
);

const ATTACHMENTS = Object.freeze([
  Object.freeze({ weaponId: 'heavy-hammer', sourceName: 'axe_2handed' }),
  Object.freeze({ weaponId: 'gravity-chain', sourceName: 'crossbow_1handed' }),
  Object.freeze({ weaponId: 'line-suppressor', sourceName: 'staff' }),
  Object.freeze({ weaponId: 'read-counter', sourceName: 'spellbook_open' }),
  Object.freeze({ weaponId: 'flank-blade', sourceName: 'dagger' }),
  Object.freeze({ weaponId: 'hook-spear', sourceName: 'sword_2handed' }),
  Object.freeze({ weaponId: 'burst-gauntlet', sourceName: 'shield_badge_color' }),
  Object.freeze({ weaponId: 'vault-lance', sourceName: 'sword_2handed_color' }),
  Object.freeze({ weaponId: 'scatter-cannon', sourceName: 'crossbow_2handed' }),
  Object.freeze({ weaponId: 'sky-anchor', sourceName: 'shield_spikes' }),
  Object.freeze({ weaponId: 'edge-scythe', sourceName: 'axe_1handed' }),
  Object.freeze({ weaponId: 'rebound-hook', sourceName: 'arrow_bundle' }),
  Object.freeze({ weaponId: 'pulse-baton', sourceName: 'wand' }),
  Object.freeze({ weaponId: 'siege-axe', sourceName: 'shield_spikes_color' }),
  Object.freeze({ weaponId: 'twin-fan', sourceName: 'shield_badge' }),
  Object.freeze({ weaponId: 'diving-claw', sourceName: 'arrow' }),
  Object.freeze({ weaponId: 'route-bow', sourceName: 'quiver' }),
  Object.freeze({ weaponId: 'pivot-blade', sourceName: 'sword_1handed' }),
  Object.freeze({ weaponId: 'commitment-fist', sourceName: 'mug_full' }),
]);

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'source-root': { type: 'string' },
    },
    strict: true,
  });
  if (!values['source-root']) {
    throw new Error('必须提供固定KayKit checkout的--source-root。');
  }
  const sourceRoot = path.resolve(values['source-root']);
  const repositoryRoot = process.cwd();
  const outputRoot = path.join(repositoryRoot, OUTPUT_DIRECTORY);
  await mkdir(outputRoot, { recursive: true });
  const io = new NodeIO();
  const results: Array<Readonly<{
    weaponId: string;
    sourceName: string;
    outputPath: string;
    byteLength: number;
  }>> = [];
  for (const attachment of ATTACHMENTS) {
    const inputPath = path.join(
      sourceRoot,
      SOURCE_SUBDIRECTORY,
      `${attachment.sourceName}.gltf`,
    );
    const document = await io.read(inputPath);
    if (document.getRoot().listScenes().length !== 1) {
      throw new RangeError(`${attachment.sourceName}.gltf必须精确包含一个Scene。`);
    }
    const bytes = await io.writeBinary(document);
    const outputPath = path.join(outputRoot, `${attachment.weaponId}.glb`);
    await writeFile(outputPath, bytes);
    results.push(Object.freeze({
      ...attachment,
      outputPath: path.relative(repositoryRoot, outputPath),
      byteLength: bytes.byteLength,
    }));
  }
  process.stdout.write(`${JSON.stringify({
    status: 'imported-candidate-assets-not-validated',
    sourceRevision: EXPECTED_SOURCE_REVISION,
    attachmentCount: results.length,
    results,
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
