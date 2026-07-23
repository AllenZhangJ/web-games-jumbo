import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { createLightweightPhysicsWorld } from '@number-strategy-jump/arena-physics';
import { runPhysicsPoc } from '../src/arena/physics/poc-scenarios.ts';

async function bundleMetrics(contents, sourcefile) {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd(), sourcefile },
    bundle: true,
    write: false,
    minify: true,
    format: 'iife',
    platform: 'neutral',
    target: 'es2020',
    logLevel: 'silent',
  });
  const bytes = result.outputFiles.reduce((total, file) => total + file.contents.byteLength, 0);
  const combined = Buffer.concat(result.outputFiles.map((file) => Buffer.from(file.contents)));
  return { bundleBytes: bytes, gzipBytes: gzipSync(combined).byteLength };
}

function readStressTicks() {
  const prefix = '--stress-ticks=';
  const option = process.argv.find((argument) => argument.startsWith(prefix));
  if (!option) return 20_000;
  const value = Number(option.slice(prefix.length));
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('--stress-ticks 必须是正安全整数。');
  }
  return value;
}

const candidates = [
  {
    backend: 'lightweight-strict-ts',
    createWorld: createLightweightPhysicsWorld,
    bundle: "import { createLightweightPhysicsWorld } from '@number-strategy-jump/arena-physics'; globalThis.__arenaPhysics = createLightweightPhysicsWorld;",
  },
];

const reports = [];
for (const candidate of candidates) {
  const [runtime, bundle] = await Promise.all([
    runPhysicsPoc({ ...candidate, stressTicks: readStressTicks() }),
    bundleMetrics(candidate.bundle, `${candidate.backend}-entry.js`),
  ]);
  reports.push({ ...runtime, ...bundle });
}

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
