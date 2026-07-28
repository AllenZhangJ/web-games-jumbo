import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const REPO = resolve(import.meta.dirname, '../..');
const TEMP = mkdtempSync(resolve(tmpdir(), 'arena-evaluator-fail-closed-'));
const KIT = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-test-kit-v1.json';
const KEY = 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-answer-key-v1.json';
const PACKAGE = 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-test-package-v1.json';
const LEDGER = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-response-intake-ledger-v1.json';
type Json = ReturnType<typeof JSON.parse>;
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
function write(path: string, value: Json): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function artifact(root: string, path: string): Json { const bytes = readFileSync(resolve(root, path)); return { path, byteLength: bytes.byteLength, sha256: sha(bytes) }; }
function makeFixture(name: string): string {
  const root = resolve(TEMP, name); mkdirSync(resolve(root, 'docs/quality/art/silhouette'), { recursive: true });
  cpSync(resolve(REPO, 'docs/quality/art/silhouette/human-test-kit'), resolve(root, 'docs/quality/art/silhouette/human-test-kit'), { recursive: true });
  cpSync(resolve(REPO, 'docs/quality/art/silhouette/blind-test'), resolve(root, 'docs/quality/art/silhouette/blind-test'), { recursive: true });
  for (const source of ['character-b01-rogue-front-side.png', 'character-b02-skeleton-front-three-quarter.png']) { const target = resolve(root, 'docs/quality/art/reference-sources/project-character-renders', source); mkdirSync(dirname(target), { recursive: true }); cpSync(resolve(REPO, 'docs/quality/art/reference-sources/project-character-renders', source), target); }
  return root;
}
function run(name: string, mutate: (root: string) => void): void {
  const root = makeFixture(name); mutate(root);
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/evaluate-arena-silhouette-human-responses.ts'], { cwd: REPO, encoding: 'utf8', env: { ...process.env, ARENA_HUMAN_TEST_ROOT: root } });
  if (result.status === 0) throw new Error(`evaluator probe unexpectedly passed: ${name}`); process.stdout.write(`PASS ${name}\n`);
}
function identityLedger(root: string, count: number): void {
  const kit = JSON.parse(readFileSync(resolve(root, KIT), 'utf8')) as Json;
  const entries = Array.from({ length: count }, (_, index) => ({ participantCode: `P-TEST${String(index + 1).padStart(4, '0')}`, formId: `form-${String(index + 1).padStart(2, '0')}` }));
  write(resolve(root, LEDGER), { schemaVersion: 1, id: 'arena.art.silhouette-human-response-intake.a0.3.v1', status: 'collecting', kitId: kit.id, participantCount: count, minimumParticipants: 10, entries, hardGatePassed: false, coordinatorSignOff: null, downstream: { a0_3: 'incomplete', blockout: 'forbidden', final: 'incomplete' } });
}
function validResponses(root: string): void {
  const kit = JSON.parse(readFileSync(resolve(root, KIT), 'utf8')) as Json; const key = JSON.parse(readFileSync(resolve(root, KEY), 'utf8')) as Json;
  const answers = new Map<string, Json>(key.answers.map((item: Json) => [item.questionId, item] as const)); const entries = [];
  const completed = Date.now() - 60_000; const started = completed - 120_000; const received = completed + 30_000;
  for (let index = 0; index < 10; index += 1) {
    const form = kit.forms[index]; const assignment = JSON.parse(readFileSync(resolve(root, form.assignment.path), 'utf8')) as Json; const participantCode = `P-TEST${String(index + 1).padStart(4, '0')}`;
    const response = { schemaVersion: 1, kind: 'arena-a0.3-independent-human-response', kitId: kit.id, assignmentSha256: form.assignment.sha256, formId: form.formId, participantCode, startedAt: new Date(started).toISOString(), completedAt: new Date(completed).toISOString(), durationMs: 120000, attestations: { consent: true, independentFromProduction: true, noAnswerAccess: true, noPersonalDataSubmitted: true }, answers: assignment.questions.map((item: Json) => { const answer = answers.get(item.questionId); return { questionId: item.questionId, character: answer.character, equipment: answer.equipment, direction: answer.direction }; }) };
    const path = `docs/quality/art/silhouette/human-test-kit/responses/${participantCode}__${form.formId}__raw.json`; write(resolve(root, path), response); const bytes = readFileSync(resolve(root, path));
    entries.push({ participantCode, formId: form.formId, witnessCode: `W-T${String(index + 1).padStart(3, '0')}`, receivedAt: new Date(received).toISOString(), rawArtifact: { path, byteLength: statSync(resolve(root, path)).size, sha256: sha(bytes) } });
  }
  write(resolve(root, LEDGER), { schemaVersion: 1, id: 'arena.art.silhouette-human-response-intake.a0.3.v1', status: 'collecting', kitId: kit.id, participantCount: 10, minimumParticipants: 10, entries, hardGatePassed: false, coordinatorSignOff: null, downstream: { a0_3: 'incomplete', blockout: 'forbidden', final: 'incomplete' } });
}
function rebindRestricted(root: string): void {
  const pack = JSON.parse(readFileSync(resolve(root, PACKAGE), 'utf8')) as Json; pack.answerKey = artifact(root, KEY); write(resolve(root, PACKAGE), pack);
  const kit = JSON.parse(readFileSync(resolve(root, KIT), 'utf8')) as Json; kit.restrictedEvaluator.answerKey = artifact(root, KEY); kit.restrictedEvaluator.blindPackage = artifact(root, PACKAGE); write(resolve(root, KIT), kit);
}
try {
  run('nine-participants', (root) => identityLedger(root, 9));
  run('eleven-participants', (root) => identityLedger(root, 11));
  run('duplicate-participant', (root) => { identityLedger(root, 10); const ledger = JSON.parse(readFileSync(resolve(root, LEDGER), 'utf8')) as Json; ledger.entries[9].participantCode = ledger.entries[0].participantCode; write(resolve(root, LEDGER), ledger); });
  run('duplicate-form', (root) => { identityLedger(root, 10); const ledger = JSON.parse(readFileSync(resolve(root, LEDGER), 'utf8')) as Json; ledger.entries[9].formId = ledger.entries[0].formId; write(resolve(root, LEDGER), ledger); });
  run('kit-manifest-drift', (root) => { const kit = JSON.parse(readFileSync(resolve(root, KIT), 'utf8')) as Json; kit.status = 'human-verified'; write(resolve(root, KIT), kit); });
  run('blind-package-drift', (root) => { const pack = JSON.parse(readFileSync(resolve(root, PACKAGE), 'utf8')) as Json; pack.seed += 1; write(resolve(root, PACKAGE), pack); });
  run('assignment-file-drift', (root) => { const kit = JSON.parse(readFileSync(resolve(root, KIT), 'utf8')) as Json; const assignment = JSON.parse(readFileSync(resolve(root, kit.forms[0].assignment.path), 'utf8')) as Json; assignment.questionCount = 23; write(resolve(root, kit.forms[0].assignment.path), assignment); });
  run('image-file-drift', (root) => { const kit = JSON.parse(readFileSync(resolve(root, KIT), 'utf8')) as Json; writeFileSync(resolve(root, kit.forms[0].images[0].path), Buffer.from('tampered')); });
  run('answer-key-future-field', (root) => { const key = JSON.parse(readFileSync(resolve(root, KEY), 'utf8')) as Json; key.futureField = true; write(resolve(root, KEY), key); rebindRestricted(root); });
  run('answer-key-duplicate-question', (root) => { const key = JSON.parse(readFileSync(resolve(root, KEY), 'utf8')) as Json; key.answers[1].questionId = key.answers[0].questionId; write(resolve(root, KEY), key); rebindRestricted(root); });
  run('answer-key-invalid-value', (root) => { const key = JSON.parse(readFileSync(resolve(root, KEY), 'utf8')) as Json; key.answers[0].direction = 'future'; write(resolve(root, KEY), key); rebindRestricted(root); });
  run('answer-key-duplicate-tuple', (root) => { const key = JSON.parse(readFileSync(resolve(root, KEY), 'utf8')) as Json; const questionId = key.answers[1].questionId; key.answers[1] = { ...key.answers[0], questionId }; write(resolve(root, KEY), key); rebindRestricted(root); });
  run('answer-key-source-output-id', (root) => { const key = JSON.parse(readFileSync(resolve(root, KEY), 'utf8')) as Json; key.answers[0].sourceOutputId = 'invalid-source'; write(resolve(root, KEY), key); rebindRestricted(root); });
  run('raw-artifact-ledger-mismatch', (root) => { validResponses(root); const ledger = JSON.parse(readFileSync(resolve(root, LEDGER), 'utf8')) as Json; ledger.entries[0].rawArtifact.sha256 = '0'.repeat(64); write(resolve(root, LEDGER), ledger); });
  run('received-before-completed', (root) => { validResponses(root); const ledger = JSON.parse(readFileSync(resolve(root, LEDGER), 'utf8')) as Json; const raw = JSON.parse(readFileSync(resolve(root, ledger.entries[0].rawArtifact.path), 'utf8')) as Json; ledger.entries[0].receivedAt = new Date(Date.parse(raw.completedAt) - 1).toISOString(); write(resolve(root, LEDGER), ledger); });
  process.stdout.write('15/15 evaluator fail-closed probes passed\n');
  const positiveRoot = makeFixture('perfect-positive'); validResponses(positiveRoot);
  const positive = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/evaluate-arena-silhouette-human-responses.ts'], { cwd: REPO, encoding: 'utf8', env: { ...process.env, ARENA_HUMAN_TEST_ROOT: positiveRoot } });
  if (positive.status !== 0) throw new Error(`perfect evaluator fixture failed: ${positive.stderr}`);
  const report = JSON.parse(readFileSync(resolve(positiveRoot, 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-evaluation-v1.json'), 'utf8')) as Json;
  if (report.status !== 'human-threshold-candidate' || report.participantCount !== 10 || report.hardGatePassed !== false || report.coordinatorSignOff !== null || report.downstream?.a0_3 !== 'incomplete' || report.downstream?.blockout !== 'forbidden' || report.downstream?.final !== 'incomplete') throw new Error('perfect evaluator fixture opened a downstream gate or produced wrong status');
  process.stdout.write('PASS perfect-10-response-candidate-remains-fail-closed\n15/15 evaluator fail-closed probes and 1 positive candidate probe passed\n');
} finally { rmSync(TEMP, { recursive: true, force: true }); }
