import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type WeaponPhase = 'windup' | 'release' | 'recovery';

interface WeaponSource {
  readonly weaponId: string;
  readonly sourcePath: string;
}

const WEAPON_SOURCES = Object.freeze([
  Object.freeze({ weaponId: 'charge-shield', sourcePath: 'kenney-impact-sounds/shield-charge.ogg' }),
  Object.freeze({ weaponId: 'heavy-hammer', sourcePath: 'kenney-impact-sounds/hammer-smash.ogg' }),
  Object.freeze({ weaponId: 'gravity-chain', sourcePath: 'kenney-impact-sounds/chain-pull.ogg' }),
  ...[
    'line-suppressor', 'read-counter', 'flank-blade', 'hook-spear', 'burst-gauntlet',
    'vault-lance', 'scatter-cannon', 'sky-anchor', 'edge-scythe', 'rebound-hook',
    'pulse-baton', 'siege-axe', 'twin-fan', 'diving-claw', 'route-bow', 'pivot-blade',
    'commitment-fist',
  ].map((weaponId) => Object.freeze({
    weaponId,
    sourcePath: `authored-weapon-candidates/${weaponId}.ogg`,
  })),
] satisfies readonly WeaponSource[]);

const PHASE_RECIPES = Object.freeze({
  windup: Object.freeze({
    designIntent: 'short-rising-commitment-read',
    filter:
      'areverse,highpass=f=280,lowpass=f=5200,atempo=1.18,volume=0.58,'
      + 'atrim=0:0.38,afade=t=in:st=0:d=0.05,afade=t=out:st=0.29:d=0.09',
  }),
  release: Object.freeze({
    designIntent: 'clear-action-release-without-hit-confirm',
    filter:
      'highpass=f=180,lowpass=f=6200,atempo=1.24,volume=0.7,'
      + 'atrim=0:0.34,afade=t=out:st=0.25:d=0.09',
  }),
  recovery: Object.freeze({
    designIntent: 'quiet-mechanical-or-body-reset',
    filter:
      'highpass=f=90,lowpass=f=2100,atempo=0.92,volume=0.42,'
      + 'atrim=0:0.46,afade=t=in:st=0:d=0.035,afade=t=out:st=0.31:d=0.15',
  }),
} as const satisfies Readonly<Record<WeaponPhase, Readonly<{
  readonly designIntent: string;
  readonly filter: string;
}>>>);

const PHASES = Object.freeze(['windup', 'release', 'recovery'] as const);
const root = process.cwd();
const audioRoot = path.join(root, 'public/assets/arena/audio');
const outputDirectory = path.join(audioRoot, 'authored-weapon-phase-candidates');
mkdirSync(outputDirectory, { recursive: true });

const candidates = WEAPON_SOURCES.flatMap((weapon) => PHASES.map((phase) => {
  const recipe = PHASE_RECIPES[phase];
  const source = path.join(audioRoot, weapon.sourcePath);
  const filename = `${weapon.weaponId}-${phase}.ogg`;
  const output = path.join(outputDirectory, filename);
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', source,
    '-map_metadata', '-1', '-vn',
    '-af', recipe.filter,
    '-ar', '48000', '-ac', '1',
    '-c:a', 'libvorbis', '-q:a', '4',
    output,
  ], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`生成${weapon.weaponId}/${phase}音频失败：${result.stderr.trim()}`);
  }
  const bytes = readFileSync(output);
  return Object.freeze({
    weaponId: weapon.weaponId,
    phase,
    filename,
    sourcePath: weapon.sourcePath,
    designIntent: recipe.designIntent,
    byteLength: statSync(output).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}));

if (WEAPON_SOURCES.length !== 20
  || candidates.length !== 60
  || new Set(candidates.map(({ filename }) => filename)).size !== 60) {
  throw new RangeError('Arena V2武器阶段音频候选必须闭合20把×3阶段。');
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  builderRevision: 'arena-v2-authored-weapon-phase-audio-builder.candidate.v1',
  candidateCount: candidates.length,
  candidates,
}, null, 2)}\n`);
