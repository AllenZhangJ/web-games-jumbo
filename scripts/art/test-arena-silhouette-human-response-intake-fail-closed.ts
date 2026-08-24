import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const REPO = resolve(import.meta.dirname, '../..');
const KIT_PATH = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-test-kit-v1.json';
type Json = ReturnType<typeof JSON.parse>;
const kit = JSON.parse(readFileSync(resolve(REPO, KIT_PATH), 'utf8')) as Json; const form = kit.forms[0]; const assignment = JSON.parse(readFileSync(resolve(REPO, form.assignment.path), 'utf8')) as Json;
const root = mkdtempSync(resolve(tmpdir(), 'arena-intake-fail-closed-'));
const base = resolve(root, 'base');
function write(path: string, value: Json): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function baseResponse(): Json { const completed = Date.now() - 60_000; const started = completed - 120_000; return { schemaVersion: 1, kind: 'arena-a0.3-independent-human-response', kitId: kit.id, assignmentSha256: form.assignment.sha256, formId: form.formId, participantCode: 'P-TEST0001', startedAt: new Date(started).toISOString(), completedAt: new Date(completed).toISOString(), durationMs: 120000, attestations: { consent: true, independentFromProduction: true, noAnswerAccess: true, noPersonalDataSubmitted: true }, answers: assignment.questions.map((item: Json) => ({ questionId: item.questionId, character: 'C01', equipment: 'unarmed', direction: 'front' })) }; }
function probe(name: string, mutate: (response: Json, ledger: Json) => void): void {
  const probeRoot = resolve(root, name); cpSync(base, probeRoot, { recursive: true });
  const ledger: Json = { schemaVersion: 1, id: 'arena.art.silhouette-human-response-intake.a0.3.v1', status: 'collecting', kitId: kit.id, entries: [] }; const response = baseResponse(); mutate(response, ledger);
  write(resolve(probeRoot, 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-response-intake-ledger-v1.json'), ledger); const input = resolve(probeRoot, 'malicious.json'); write(input, response);
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/intake-arena-silhouette-human-response.ts', input, 'W-TEST'], { cwd: REPO, encoding: 'utf8', env: { ...process.env, ARENA_HUMAN_TEST_ROOT: probeRoot } });
  if (result.status === 0) throw new Error(`malicious response unexpectedly accepted: ${name}`); process.stdout.write(`PASS ${name}\n`);
}
try {
  mkdirSync(resolve(base, 'docs/quality/art/silhouette'), { recursive: true });
  cpSync(resolve(REPO, 'docs/quality/art/silhouette/human-test-kit'), resolve(base, 'docs/quality/art/silhouette/human-test-kit'), { recursive: true });
  cpSync(resolve(REPO, 'docs/quality/art/silhouette/blind-test'), resolve(base, 'docs/quality/art/silhouette/blind-test'), { recursive: true });
  const generatorTarget = resolve(base, kit.generator.path); mkdirSync(dirname(generatorTarget), { recursive: true }); cpSync(resolve(REPO, kit.generator.path), generatorTarget);
  for (const source of ['character-b01-rogue-front-side.png', 'character-b02-skeleton-front-three-quarter.png']) { const target = resolve(base, 'docs/quality/art/reference-sources/project-character-renders', source); mkdirSync(dirname(target), { recursive: true }); cpSync(resolve(REPO, 'docs/quality/art/reference-sources/project-character-renders', source), target); }
  probe('assignment-hash', (r) => { r.assignmentSha256 = '0'.repeat(64); });
  probe('duplicate-participant', (_r, l) => { l.entries.push({ participantCode: 'P-TEST0001', formId: 'form-02' }); });
  probe('duplicate-form', (_r, l) => { l.entries.push({ participantCode: 'P-OTHER001', formId: form.formId }); });
  probe('missing-question', (r) => { r.answers.pop(); });
  probe('invalid-enum', (r) => { r.answers[0].direction = 'future'; });
  probe('invalid-time', (r) => { r.completedAt = 'not-a-date'; });
  probe('completed-far-in-future', (r) => { const completed = Date.now() + 600_000; r.startedAt = new Date(completed - 120_000).toISOString(); r.completedAt = new Date(completed).toISOString(); });
  probe('unsafe-duration', (r) => { r.durationMs = 1; });
  probe('missing-attestation', (r) => { delete r.attestations.noAnswerAccess; });
  probe('future-field', (r) => { r.futureSchemaField = true; });
  probe('answer-leak-field', (r) => { r.answers[0].correctAnswer = 'front'; });
  probe('tool-generated-marker', (r) => { r.generatedBy = 'synthetic-tool'; });
  const successRoot = resolve(root, 'canonical-write'); cpSync(base, successRoot, { recursive: true });
  const input = resolve(successRoot, 'private-input-with-person-name.json'); write(input, baseResponse());
  const accepted = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/intake-arena-silhouette-human-response.ts', input, 'W-TEST'], { cwd: REPO, encoding: 'utf8', env: { ...process.env, ARENA_HUMAN_TEST_ROOT: successRoot } });
  if (accepted.status !== 0) throw new Error(`valid canonical intake failed: ${accepted.stderr}`);
  const ledger = JSON.parse(readFileSync(resolve(successRoot, 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-response-intake-ledger-v1.json'), 'utf8')) as Json;
  const artifact = ledger.entries[0].rawArtifact; const stored = readFileSync(resolve(successRoot, artifact.path));
  const acceptedResponse = JSON.parse(readFileSync(input, 'utf8')) as Json;
  if ('originalFileName' in artifact || artifact.sha256 !== createHash('sha256').update(stored).digest('hex') || artifact.byteLength !== stored.byteLength || !stored.equals(readFileSync(input)) || Date.parse(ledger.entries[0].receivedAt) < Date.parse(acceptedResponse.completedAt)) throw new Error('canonical intake bytes/hash/privacy/time mismatch');
  process.stdout.write('PASS canonical-exclusive-byte-write-no-filename\n');
  const postCommitRoot = resolve(root, 'post-commit-failure'); cpSync(base, postCommitRoot, { recursive: true }); const postCommitInput = resolve(postCommitRoot, 'post-commit.json'); write(postCommitInput, baseResponse());
  const postCommit = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/art/intake-arena-silhouette-human-response.ts', postCommitInput, 'W-TEST'], { cwd: REPO, encoding: 'utf8', env: { ...process.env, ARENA_HUMAN_TEST_ROOT: postCommitRoot, ARENA_HUMAN_TEST_SIMULATE_POST_COMMIT_FAILURE: '1' } });
  if (postCommit.status === 0) throw new Error('simulated post-commit failure must surface');
  const postLedger = JSON.parse(readFileSync(resolve(postCommitRoot, 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-response-intake-ledger-v1.json'), 'utf8')) as Json; const postArtifact = postLedger.entries[0]?.rawArtifact;
  if (!postArtifact || !readFileSync(resolve(postCommitRoot, postArtifact.path)).equals(readFileSync(postCommitInput))) throw new Error('post-commit failure created dangling ledger or deleted raw bytes');
  process.stdout.write('PASS post-commit-failure-preserves-ledger-and-raw\n12/12 malicious intake probes, 1 canonical write and 1 post-commit durability probe passed\n');
} finally { rmSync(root, { recursive: true, force: true }); }
