import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

interface AudioCandidateRecipe {
  readonly cueId: string;
  readonly category: 'mode' | 'supply';
  readonly source: 'base-push' | 'chain-pull' | 'hammer-smash' | 'shield-charge';
  readonly designIntent: string;
  readonly filter: string;
}

const RECIPES = Object.freeze([
  Object.freeze({ cueId: 'mode-started', category: 'mode', source: 'shield-charge', designIntent: 'clear-round-open', filter: 'highpass=f=500,lowpass=f=6500,equalizer=f=2400:t=q:w=1.1:g=7,atempo=1.12,aecho=0.78:0.2:52:0.16,volume=0.78,atrim=0:0.52,afade=t=out:st=0.39:d=0.13' }),
  Object.freeze({ cueId: 'participant-fell-credited-hit', category: 'mode', source: 'hammer-smash', designIntent: 'credited-heavy-drop', filter: 'highpass=f=65,lowpass=f=2800,equalizer=f=190:t=q:w=0.9:g=8,atempo=0.9,acompressor=threshold=-18dB:ratio=4:attack=3:release=90,volume=0.86,atrim=0:0.64,afade=t=out:st=0.47:d=0.17' }),
  Object.freeze({ cueId: 'participant-fell-movement', category: 'mode', source: 'base-push', designIntent: 'light-route-miss', filter: 'highpass=f=460,lowpass=f=4200,equalizer=f=1000:t=q:w=1.2:g=-4,atempo=1.18,volume=0.62,atrim=0:0.42,afade=t=out:st=0.27:d=0.15' }),
  Object.freeze({ cueId: 'participant-fell-environment', category: 'mode', source: 'hammer-smash', designIntent: 'dark-world-drop', filter: 'highpass=f=55,lowpass=f=1900,equalizer=f=145:t=q:w=0.8:g=7,atempo=0.84,volume=0.74,atrim=0:0.72,afade=t=out:st=0.5:d=0.22' }),
  Object.freeze({ cueId: 'respawn-scheduled', category: 'mode', source: 'shield-charge', designIntent: 'soft-pending-pulse', filter: 'highpass=f=700,lowpass=f=4700,equalizer=f=1800:t=q:w=1.1:g=4,aecho=0.76:0.24:115:0.2,volume=0.56,atrim=0:0.66,afade=t=out:st=0.46:d=0.2' }),
  Object.freeze({ cueId: 'respawned', category: 'mode', source: 'shield-charge', designIntent: 'bright-return-confirm', filter: 'highpass=f=850,lowpass=f=7200,equalizer=f=3100:t=q:w=1.2:g=8,atempo=1.26,aecho=0.8:0.2:34:0.14,volume=0.72,atrim=0:0.38,afade=t=out:st=0.27:d=0.11' }),
  Object.freeze({ cueId: 'safe-anchor-committed', category: 'mode', source: 'chain-pull', designIntent: 'precise-checkpoint-lock', filter: 'highpass=f=1100,lowpass=f=7600,equalizer=f=4300:t=q:w=1.4:g=8,atempo=1.34,aecho=0.74:0.2:58:0.16,volume=0.63,atrim=0:0.38,afade=t=out:st=0.27:d=0.11' }),
  Object.freeze({ cueId: 'race-finish-claimed', category: 'mode', source: 'base-push', designIntent: 'wide-finish-release', filter: 'highpass=f=260,lowpass=f=6200,equalizer=f=2100:t=q:w=1:g=6,aecho=0.8:0.3:82:0.28,acompressor=threshold=-20dB:ratio=3:attack=4:release=100,volume=0.79,atrim=0:0.78,afade=t=out:st=0.57:d=0.21' }),
  Object.freeze({ cueId: 'enemy-pressure', category: 'mode', source: 'hammer-smash', designIntent: 'low-threat-entry', filter: 'highpass=f=45,lowpass=f=2100,equalizer=f=125:t=q:w=0.8:g=9,atempo=0.78,acompressor=threshold=-19dB:ratio=4:attack=5:release=120,volume=0.78,atrim=0:0.82,afade=t=out:st=0.58:d=0.24' }),
  Object.freeze({ cueId: 'enemy-left', category: 'mode', source: 'base-push', designIntent: 'pressure-release', filter: 'highpass=f=380,lowpass=f=3300,equalizer=f=760:t=q:w=1:g=-3,atempo=1.24,volume=0.48,atrim=0:0.38,afade=t=out:st=0.22:d=0.16' }),
  Object.freeze({ cueId: 'survival-first-fall', category: 'mode', source: 'hammer-smash', designIntent: 'warning-with-recovery', filter: 'highpass=f=120,lowpass=f=3600,equalizer=f=320:t=q:w=1:g=6,aecho=0.78:0.22:76:0.18,volume=0.8,atrim=0:0.66,afade=t=out:st=0.48:d=0.18' }),
  Object.freeze({ cueId: 'survival-terminal-fall', category: 'mode', source: 'hammer-smash', designIntent: 'terminal-heavy-stop', filter: 'highpass=f=45,lowpass=f=2300,equalizer=f=110:t=q:w=0.8:g=10,atempo=0.76,acompressor=threshold=-17dB:ratio=5:attack=4:release=130,volume=0.9,atrim=0:0.88,afade=t=out:st=0.62:d=0.26' }),
  Object.freeze({ cueId: 'match-ended', category: 'mode', source: 'shield-charge', designIntent: 'neutral-round-close', filter: 'highpass=f=240,lowpass=f=5600,equalizer=f=1450:t=q:w=1:g=5,atempo=0.94,aecho=0.8:0.26:96:0.22,volume=0.72,atrim=0:0.8,afade=t=out:st=0.58:d=0.22' }),
  Object.freeze({ cueId: 'supply-spawned', category: 'supply', source: 'shield-charge', designIntent: 'visible-world-arrival', filter: 'highpass=f=780,lowpass=f=7000,equalizer=f=2800:t=q:w=1.2:g=7,atempo=1.24,aecho=0.78:0.2:42:0.18,volume=0.68,atrim=0:0.4,afade=t=out:st=0.29:d=0.11' }),
  Object.freeze({ cueId: 'supply-picked-up', category: 'supply', source: 'chain-pull', designIntent: 'quick-ownership-confirm', filter: 'highpass=f=1250,lowpass=f=7800,equalizer=f=4600:t=q:w=1.4:g=8,atempo=1.42,volume=0.6,atrim=0:0.26,afade=t=out:st=0.18:d=0.08' }),
  Object.freeze({ cueId: 'supply-replaced', category: 'supply', source: 'chain-pull', designIntent: 'two-stage-swap-confirm', filter: 'highpass=f=520,lowpass=f=6100,equalizer=f=2300:t=q:w=1:g=6,aecho=0.8:0.32:70:0.28,atempo=1.12,volume=0.68,atrim=0:0.56,afade=t=out:st=0.41:d=0.15' }),
  Object.freeze({ cueId: 'supply-expired', category: 'supply', source: 'base-push', designIntent: 'quiet-lifecycle-close', filter: 'highpass=f=520,lowpass=f=2800,equalizer=f=950:t=q:w=1:g=-5,atempo=1.3,volume=0.42,atrim=0:0.34,afade=t=out:st=0.18:d=0.16' }),
] satisfies readonly AudioCandidateRecipe[]);

const root = process.cwd();
const sourceDirectory = path.join(root, 'public/assets/arena/audio/kenney-impact-sounds');
const outputDirectory = path.join(root, 'public/assets/arena/audio/authored-mode-supply-candidates');
mkdirSync(outputDirectory, { recursive: true });

const manifest = RECIPES.map((recipe) => {
  const source = path.join(sourceDirectory, `${recipe.source}.ogg`);
  const output = path.join(outputDirectory, `${recipe.cueId}.ogg`);
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
    throw new Error(`生成${recipe.cueId}音频失败：${result.stderr.trim()}`);
  }
  const bytes = readFileSync(output);
  return Object.freeze({
    cueId: recipe.cueId,
    category: recipe.category,
    source: recipe.source,
    designIntent: recipe.designIntent,
    byteLength: statSync(output).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
});

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  builderRevision: 'arena-v2-authored-mode-supply-audio-builder.candidate.v1',
  candidateCount: manifest.length,
  candidates: manifest,
}, null, 2)}\n`);
