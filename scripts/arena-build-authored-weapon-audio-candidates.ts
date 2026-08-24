import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

interface AudioCandidateRecipe {
  readonly weaponId: string;
  readonly source: 'base-push' | 'chain-pull' | 'hammer-smash' | 'shield-charge';
  readonly designIntent: string;
  readonly filter: string;
}

const RECIPES = Object.freeze([
  Object.freeze({ weaponId: 'line-suppressor', source: 'base-push', designIntent: 'wide-muted-pressure', filter: 'highpass=f=90,lowpass=f=2100,equalizer=f=420:t=q:w=1.1:g=5,acompressor=threshold=-18dB:ratio=3:attack=4:release=70,volume=0.9,atrim=0:0.55,afade=t=out:st=0.38:d=0.17' }),
  Object.freeze({ weaponId: 'read-counter', source: 'shield-charge', designIntent: 'short-metal-answer', filter: 'highpass=f=420,lowpass=f=5200,atempo=1.22,equalizer=f=2500:t=q:w=1.4:g=5,volume=0.78,atrim=0:0.36,afade=t=out:st=0.26:d=0.1' }),
  Object.freeze({ weaponId: 'flank-blade', source: 'chain-pull', designIntent: 'fast-side-cut', filter: 'highpass=f=700,atempo=1.35,equalizer=f=3400:t=q:w=1.1:g=6,volume=0.82,atrim=0:0.32,afade=t=out:st=0.23:d=0.09' }),
  Object.freeze({ weaponId: 'hook-spear', source: 'chain-pull', designIntent: 'hook-then-drag', filter: 'highpass=f=180,lowpass=f=4300,equalizer=f=760:t=q:w=1:g=6,aecho=0.75:0.28:42:0.2,volume=0.85,atrim=0:0.58,afade=t=out:st=0.43:d=0.15' }),
  Object.freeze({ weaponId: 'burst-gauntlet', source: 'base-push', designIntent: 'compact-burst', filter: 'highpass=f=160,equalizer=f=1200:t=q:w=1.2:g=7,aecho=0.8:0.32:28:0.24,acompressor=threshold=-20dB:ratio=4:attack=2:release=45,volume=0.9,atrim=0:0.42,afade=t=out:st=0.31:d=0.11' }),
  Object.freeze({ weaponId: 'vault-lance', source: 'chain-pull', designIntent: 'long-clean-thrust', filter: 'highpass=f=320,lowpass=f=6000,equalizer=f=1800:t=q:w=0.8:g=5,atempo=1.08,aecho=0.8:0.22:55:0.15,volume=0.82,atrim=0:0.55,afade=t=out:st=0.42:d=0.13' }),
  Object.freeze({ weaponId: 'scatter-cannon', source: 'hammer-smash', designIntent: 'broad-scatter-blast', filter: 'highpass=f=70,lowpass=f=3400,equalizer=f=180:t=q:w=1:g=7,aecho=0.8:0.3:24:0.22,acompressor=threshold=-17dB:ratio=4:attack=3:release=85,volume=0.86,atrim=0:0.62,afade=t=out:st=0.46:d=0.16' }),
  Object.freeze({ weaponId: 'sky-anchor', source: 'shield-charge', designIntent: 'dense-downward-lock', filter: 'highpass=f=65,lowpass=f=2800,equalizer=f=240:t=q:w=0.9:g=8,atempo=0.86,volume=0.9,atrim=0:0.68,afade=t=out:st=0.5:d=0.18' }),
  Object.freeze({ weaponId: 'edge-scythe', source: 'chain-pull', designIntent: 'thin-edge-sweep', filter: 'highpass=f=950,equalizer=f=4200:t=q:w=1.3:g=7,atempo=1.16,aecho=0.75:0.2:32:0.12,volume=0.78,atrim=0:0.4,afade=t=out:st=0.29:d=0.11' }),
  Object.freeze({ weaponId: 'rebound-hook', source: 'chain-pull', designIntent: 'elastic-return', filter: 'highpass=f=260,equalizer=f=920:t=q:w=1:g=5,aecho=0.8:0.36:75:0.3,volume=0.8,atrim=0:0.72,afade=t=out:st=0.53:d=0.19' }),
  Object.freeze({ weaponId: 'pulse-baton', source: 'shield-charge', designIntent: 'bright-pulse', filter: 'highpass=f=900,lowpass=f=7200,equalizer=f=3200:t=q:w=1.2:g=8,atempo=1.3,aecho=0.7:0.18:18:0.15,volume=0.75,atrim=0:0.3,afade=t=out:st=0.22:d=0.08' }),
  Object.freeze({ weaponId: 'siege-axe', source: 'hammer-smash', designIntent: 'slow-heavy-cleave', filter: 'highpass=f=55,lowpass=f=2600,equalizer=f=150:t=q:w=0.8:g=9,atempo=0.82,acompressor=threshold=-18dB:ratio=3:attack=5:release=100,volume=0.92,atrim=0:0.76,afade=t=out:st=0.56:d=0.2' }),
  Object.freeze({ weaponId: 'twin-fan', source: 'base-push', designIntent: 'paired-air-slap', filter: 'highpass=f=520,lowpass=f=6400,equalizer=f=2200:t=q:w=1.1:g=6,aecho=0.82:0.3:46:0.32,atempo=1.18,volume=0.76,atrim=0:0.48,afade=t=out:st=0.35:d=0.13' }),
  Object.freeze({ weaponId: 'diving-claw', source: 'base-push', designIntent: 'sharp-downward-grab', filter: 'highpass=f=380,lowpass=f=5000,equalizer=f=1450:t=q:w=1:g=6,atempo=1.28,acompressor=threshold=-21dB:ratio=5:attack=1:release=38,volume=0.83,atrim=0:0.34,afade=t=out:st=0.25:d=0.09' }),
  Object.freeze({ weaponId: 'route-bow', source: 'chain-pull', designIntent: 'light-ranged-twang', filter: 'highpass=f=1050,equalizer=f=4700:t=q:w=1.5:g=8,aecho=0.75:0.22:68:0.18,atempo=1.22,volume=0.72,atrim=0:0.44,afade=t=out:st=0.32:d=0.12' }),
  Object.freeze({ weaponId: 'pivot-blade', source: 'chain-pull', designIntent: 'balanced-turning-cut', filter: 'highpass=f=560,lowpass=f=5600,equalizer=f=2700:t=q:w=1:g=5,atempo=1.1,volume=0.82,atrim=0:0.38,afade=t=out:st=0.28:d=0.1' }),
  Object.freeze({ weaponId: 'commitment-fist', source: 'base-push', designIntent: 'committed-heavy-punch', filter: 'highpass=f=70,lowpass=f=3000,equalizer=f=210:t=q:w=0.9:g=8,atempo=0.88,acompressor=threshold=-18dB:ratio=4:attack=3:release=90,volume=0.94,atrim=0:0.62,afade=t=out:st=0.45:d=0.17' }),
] satisfies readonly AudioCandidateRecipe[]);

const root = process.cwd();
const sourceDirectory = path.join(root, 'public/assets/arena/audio/kenney-impact-sounds');
const outputDirectory = path.join(root, 'public/assets/arena/audio/authored-weapon-candidates');
mkdirSync(outputDirectory, { recursive: true });

const manifest = RECIPES.map((recipe) => {
  const source = path.join(sourceDirectory, `${recipe.source}.ogg`);
  const output = path.join(outputDirectory, `${recipe.weaponId}.ogg`);
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
    throw new Error(`生成${recipe.weaponId}音频失败：${result.stderr.trim()}`);
  }
  const bytes = readFileSync(output);
  return Object.freeze({
    weaponId: recipe.weaponId,
    source: recipe.source,
    designIntent: recipe.designIntent,
    byteLength: statSync(output).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
});

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  builderRevision: 'arena-v2-authored-weapon-audio-builder.candidate.v1',
  candidateCount: manifest.length,
  candidates: manifest,
}, null, 2)}\n`);
