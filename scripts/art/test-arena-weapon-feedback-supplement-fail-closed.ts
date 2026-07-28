import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '../..');
const PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-supplemental-weapon-feedback-v1.json';
const CHECKER_PATH = resolve(ROOT, 'scripts/art/check-arena-weapon-feedback-supplement.ts');
type MutableRecord = Record<string, unknown>;

function object(value: unknown, label: string): MutableRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object`);
  return value as MutableRecord;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`);
  return value;
}

const probes: ReadonlyArray<Readonly<{ id: string; expected: RegExp; mutate: (pack: MutableRecord) => void }>> = [
  { id: 'domain-count', expected: /must contain exactly eight direct visuals/, mutate: (pack) => { object(array(pack.entries, 'entries')[0], 'entry').domain = 'combat-feedback-direct'; } },
  { id: 'rights', expected: /rights are incomplete/, mutate: (pack) => { object(object(array(pack.entries, 'entries')[0], 'entry').rights, 'rights').redistributionAllowed = false; } },
  { id: 'duplicate-rendered-bytes', expected: /duplicates source or rendered bytes/, mutate: (pack) => { const entries = array(pack.entries, 'entries'); object(entries[1], 'entry').artifact = object(entries[0], 'entry').artifact; } },
  { id: 'duplicate-composition', expected: /duplicates a composition signature/, mutate: (pack) => { const entries = array(pack.entries, 'entries'); object(entries[1], 'entry').compositionSignature = object(entries[0], 'entry').compositionSignature; } },
  { id: 'event-slot', expected: /unknown future event slot/, mutate: (pack) => { object(array(pack.entries, 'entries')[0], 'entry').eventMappings = ['InventedEvent:future-presentation-mapping']; } },
  { id: 'path-escape', expected: /outside the supplemental artifact directory|escapes repository/, mutate: (pack) => { const entry = object(array(pack.entries, 'entries')[0], 'entry'); object(entry.sourceArtifact, 'sourceArtifact').path = '../outside.svg'; entry.sourceLocator = '../outside.svg'; } },
];

const testRoot = mkdtempSync(join(tmpdir(), 'arena-a021-supplement-fail-closed-'));
try {
  cpSync(resolve(ROOT, 'docs/quality/art'), resolve(testRoot, 'docs/quality/art'), { recursive: true });
  const generatorPath = 'scripts/art/generate-arena-weapon-feedback-supplement.ts';
  mkdirSync(dirname(resolve(testRoot, generatorPath)), { recursive: true });
  cpSync(resolve(ROOT, generatorPath), resolve(testRoot, generatorPath));
  const baseline = readFileSync(resolve(ROOT, PACK_PATH));
  const rejected: string[] = [];
  for (const probe of probes) {
    const pack = JSON.parse(baseline.toString('utf8')) as MutableRecord;
    probe.mutate(pack);
    writeFileSync(resolve(testRoot, PACK_PATH), `${JSON.stringify(pack, null, 2)}\n`);
    const result = spawnSync(process.execPath, ['--import', 'tsx', CHECKER_PATH], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ARENA_A022_SUPPLEMENT_CHECK_ROOT: testRoot },
    });
    const output = `${result.stdout}${result.stderr}`;
    if (result.status === 0) throw new Error(`${probe.id} probe was incorrectly accepted`);
    if (!probe.expected.test(output)) throw new Error(`${probe.id} failed for the wrong reason:\n${output}`);
    rejected.push(probe.id);
  }
  process.stdout.write(`${JSON.stringify({ status: 'pass', probes: rejected.length, rejected })}\n`);
} finally {
  if (statSync(testRoot).isDirectory()) rmSync(testRoot, { recursive: true, force: true });
}
