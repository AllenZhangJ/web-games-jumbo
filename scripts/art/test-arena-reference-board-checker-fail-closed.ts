import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '../..');
const LEDGER_PATH = 'docs/quality/art/reference-boards/arena-a0.2.2-reference-board-ledger-v1.json';
const CHECKER_PATH = resolve(ROOT, 'scripts/art/check-arena-reference-boards.ts');

type MutableRecord = Record<string, unknown>;

function object(value: unknown, label: string): MutableRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object`);
  return value as MutableRecord;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`);
  return value;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function writeJson(root: string, path: string, value: unknown): Buffer {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const absolute = resolve(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
  return bytes;
}

const probes: ReadonlyArray<Readonly<{
  id: string;
  boardId?: string;
  expected: RegExp;
  mutate: (ledger: MutableRecord, manifest: MutableRecord, ledgerBoard: MutableRecord) => void;
}>> = [
  { id: 'status', expected: /ledger status/, mutate: (ledger) => { ledger.status = 'complete'; } },
  { id: 'count', expected: /exactly ten entries/, mutate: (_ledger, manifest) => { array(manifest.entries, 'entries').pop(); } },
  { id: 'ratio', expected: /decision ratio/, mutate: (_ledger, manifest) => { object(array(manifest.entries, 'entries')[6], 'entry').decisionClass = 'avoid'; } },
  { id: 'source', expected: /not identical to the approved/, mutate: (_ledger, manifest) => { object(array(manifest.entries, 'entries')[0], 'entry').entryId = 'unapproved-source'; } },
  {
    id: 'path-escape',
    expected: /must stay in|escapes repository/,
    mutate: (_ledger, manifest, ledgerBoard) => {
      object(manifest.sourceArtifact, 'sourceArtifact').path = '../outside.svg';
      ledgerBoard.svg = manifest.sourceArtifact;
    },
  },
  {
    id: 'hash',
    expected: /SHA-256 drift/,
    mutate: (_ledger, manifest, ledgerBoard) => {
      object(manifest.reviewArtifact, 'reviewArtifact').sha256 = '0'.repeat(64);
      ledgerBoard.png = manifest.reviewArtifact;
    },
  },
  {
    id: 'resolution',
    expected: /declared dimensions/,
    mutate: (_ledger, manifest, ledgerBoard) => {
      object(manifest.reviewArtifact, 'reviewArtifact').width = 2559;
      ledgerBoard.png = manifest.reviewArtifact;
    },
  },
  { id: 'annotation', expected: /arenaConstraint/, mutate: (_ledger, manifest) => { object(array(manifest.entries, 'entries')[0], 'entry').arenaConstraint = ''; } },
  {
    id: 'ten-percent',
    expected: /10% review evidence/,
    mutate: (_ledger, manifest, ledgerBoard) => {
      object(manifest.tenPercentReview, 'tenPercentReview').status = 'missing';
      ledgerBoard.tenPercent = manifest.tenPercentReview;
    },
  },
  {
    id: 'mobile',
    expected: /mobile-equivalent evidence/,
    mutate: (_ledger, manifest, ledgerBoard) => {
      object(manifest.mobileEquivalentReview, 'mobileEquivalentReview').entryCount = 9;
      ledgerBoard.mobile = manifest.mobileEquivalentReview;
    },
  },
  {
    id: 'weapon-direct-domain',
    boardId: 'weapon',
    expected: /needs at least eight domain-direct supplemental visuals/,
    mutate: (_ledger, manifest) => { delete object(array(manifest.entries, 'entries')[0], 'entry').domain; },
  },
  {
    id: 'feedback-direct-domain',
    boardId: 'combat-feedback',
    expected: /needs at least eight domain-direct supplemental visuals/,
    mutate: (_ledger, manifest) => { delete object(array(manifest.entries, 'entries')[0], 'entry').domain; },
  },
];

const testRoot = mkdtempSync(join(tmpdir(), 'arena-a022-fail-closed-'));
try {
  cpSync(resolve(ROOT, 'docs/quality/art'), resolve(testRoot, 'docs/quality/art'), { recursive: true });
  const generatorRelative = 'scripts/art/generate-arena-reference-boards.ts';
  mkdirSync(dirname(resolve(testRoot, generatorRelative)), { recursive: true });
  cpSync(resolve(ROOT, generatorRelative), resolve(testRoot, generatorRelative));

  const baselineLedger = readFileSync(resolve(testRoot, LEDGER_PATH));
  const passed: string[] = [];

  for (const probe of probes) {
    const ledger = JSON.parse(baselineLedger.toString('utf8')) as MutableRecord;
    const targetBoardId = probe.boardId ?? 'character';
    const ledgerBoardValue = array(ledger.boards, 'ledger.boards').find((value) => object(value, 'ledger board candidate').id === targetBoardId);
    const ledgerBoard = object(ledgerBoardValue, `ledger board ${targetBoardId}`);
    const manifestPath = String(object(ledgerBoard.manifest, 'ledger manifest').path);
    const baselineManifest = readFileSync(resolve(ROOT, manifestPath));
    const manifest = JSON.parse(baselineManifest.toString('utf8')) as MutableRecord;
    probe.mutate(ledger, manifest, ledgerBoard);
    const manifestBytes = writeJson(testRoot, manifestPath, manifest);
    const manifestIdentity = object(ledgerBoard.manifest, 'ledger manifest identity');
    manifestIdentity.sha256 = sha256(manifestBytes);
    manifestIdentity.byteLength = manifestBytes.length;
    writeJson(testRoot, LEDGER_PATH, ledger);

    const result = spawnSync(process.execPath, ['--import', 'tsx', CHECKER_PATH], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ARENA_A022_CHECK_ROOT: testRoot },
    });
    const output = `${result.stdout}${result.stderr}`;
    if (result.status === 0) throw new Error(`${probe.id} probe was incorrectly accepted`);
    if (!probe.expected.test(output)) throw new Error(`${probe.id} failed for the wrong reason:\n${output}`);
    passed.push(probe.id);
    writeFileSync(resolve(testRoot, manifestPath), baselineManifest);
    writeFileSync(resolve(testRoot, LEDGER_PATH), baselineLedger);
  }

  process.stdout.write(`${JSON.stringify({ status: 'pass', probes: passed.length, rejected: passed })}\n`);
} finally {
  if (statSync(testRoot).isDirectory()) rmSync(testRoot, { recursive: true, force: true });
}
