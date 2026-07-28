import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '../..');
const TOTAL_PATH = 'docs/quality/art/reference-boards/arena-a0.2-total-gate-v1.json';
const CHECKER = resolve(ROOT, 'scripts/art/check-arena-reference-total-gate.ts');
type Mutable = Record<string, unknown>;
function object(value: unknown): Mutable { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected object'); return value as Mutable; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('expected array'); return value; }

const probes: ReadonlyArray<Readonly<{ id: string; expected: RegExp; mutate: (ledger: Mutable) => void }>> = [
  { id: 'status', expected: /status\/id must be ready/, mutate: (ledger) => { ledger.status = 'complete'; } },
  { id: 'dependency-hash', expected: /hash\/byteLength drift/, mutate: (ledger) => { object(object(ledger.dependencies).originalSourcePack).sha256 = '0'.repeat(64); } },
  { id: 'path-escape', expected: /identity\/status drift|escapes repository/, mutate: (ledger) => { object(object(ledger.dependencies).boardLedger).path = '../outside.json'; } },
  { id: 'source-use', expected: /source-use ID audit drift/, mutate: (ledger) => { array(object(ledger.sourceUseAudit).boardIds).pop(); } },
  { id: 'board-count', expected: /boardAudit\.boardCount drift/, mutate: (ledger) => { object(ledger.boardAudit).boardCount = 5; } },
  { id: 'signoff', expected: /aggregate review status must remain honest/, mutate: (ledger) => { object(ledger.review).coordinatorAggregateSignOff = 'fabricated'; } },
  { id: 'score', expected: /score arithmetic\/hard gate drift/, mutate: (ledger) => { object(ledger.score).total = 100; } },
  { id: 'dimension', expected: /every score dimension must be at least 80%|score arithmetic/, mutate: (ledger) => { object(object(object(ledger.score).dimensions).governanceReproducibility).score = 7; object(ledger.score).total = 95; } },
  { id: 'a0-3-leak', expected: /statusBoundary\.a0_3 must be incomplete/, mutate: (ledger) => { object(ledger.statusBoundary).a0_3 = 'ready'; } },
  { id: 'blockout-leak', expected: /statusBoundary\.blockout must be forbidden/, mutate: (ledger) => { object(ledger.statusBoundary).blockout = 'allowed'; } },
];

const testRoot = mkdtempSync(join(tmpdir(), 'arena-a02-total-fail-closed-'));
try {
  cpSync(resolve(ROOT, 'docs/quality/art'), resolve(testRoot, 'docs/quality/art'), { recursive: true });
  const baseline = readFileSync(resolve(ROOT, TOTAL_PATH));
  const rejected: string[] = [];
  for (const probe of probes) {
    const ledger = JSON.parse(baseline.toString('utf8')) as Mutable;
    probe.mutate(ledger);
    mkdirSync(dirname(resolve(testRoot, TOTAL_PATH)), { recursive: true });
    writeFileSync(resolve(testRoot, TOTAL_PATH), `${JSON.stringify(ledger, null, 2)}\n`);
    const result = spawnSync(process.execPath, ['--import', 'tsx', CHECKER], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ARENA_A02_TOTAL_CHECK_ROOT: testRoot } });
    const output = `${result.stdout}${result.stderr}`;
    if (result.status === 0) throw new Error(`${probe.id} was incorrectly accepted`);
    if (!probe.expected.test(output)) throw new Error(`${probe.id} failed for the wrong reason:\n${output}`);
    rejected.push(probe.id);
  }
  process.stdout.write(`${JSON.stringify({ status: 'pass', probes: rejected.length, rejected })}\n`);
} finally {
  if (statSync(testRoot).isDirectory()) rmSync(testRoot, { recursive: true, force: true });
}
