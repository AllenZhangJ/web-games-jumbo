import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { exactKeys, shaBytes, validateHumanKit } from './arena-silhouette-human-kit-validation.js';

const ROOT = resolve(process.env.ARENA_HUMAN_TEST_ROOT ?? resolve(import.meta.dirname, '../..'));
const KIT_PATH = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-test-kit-v1.json';
const RESPONSE_ROOT = 'docs/quality/art/silhouette/human-test-kit/responses';
const LEDGER_PATH = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-response-intake-ledger-v1.json';
type Json = ReturnType<typeof JSON.parse>;
const MAX_FUTURE_SKEW_MS = 300_000;
function fsyncDirectory(path: string): void { const descriptor = openSync(path, 'r'); try { fsyncSync(descriptor); } finally { closeSync(descriptor); } }
const input = process.argv[2]; const witness = process.argv[3];
if (!input || !/^W-[A-Z0-9]{4,16}$/.test(witness ?? '')) throw new Error('usage: node --import tsx scripts/art/intake-arena-silhouette-human-response.ts <raw.json> W-<witness-code>');
const validated = validateHumanKit(ROOT, KIT_PATH);
const kit = validated.manifest;
const bytes = readFileSync(resolve(input)); const response = JSON.parse(bytes.toString('utf8')) as Json;
exactKeys(response, ['schemaVersion', 'kind', 'kitId', 'assignmentSha256', 'formId', 'participantCode', 'startedAt', 'completedAt', 'durationMs', 'attestations', 'answers'], 'response');
if (response.schemaVersion !== 1 || response.kind !== 'arena-a0.3-independent-human-response' || response.kitId !== kit.id) throw new Error('response identity mismatch');
if (!/^P-[A-Z0-9]{6,16}$/.test(response.participantCode)) throw new Error('anonymous participant code invalid');
const form = kit.forms.find((item: Json) => item.formId === response.formId); if (!form) throw new Error('unknown form');
if (response.assignmentSha256 !== form.assignment.sha256) throw new Error('assignment hash mismatch');
exactKeys(response.attestations ?? {}, ['consent', 'independentFromProduction', 'noAnswerAccess', 'noPersonalDataSubmitted'], 'attestations');
if (!Object.values(response.attestations).every((value) => value === true)) throw new Error('all four attestations are required');
const started = Date.parse(response.startedAt); const completed = Date.parse(response.completedAt);
const validationNow = Date.now();
if (!Number.isFinite(started) || !Number.isFinite(completed) || completed <= started || completed > validationNow + MAX_FUTURE_SKEW_MS || Math.abs(response.durationMs - (completed - started)) > 1_000 || response.durationMs < 30_000 || response.durationMs > 7_200_000) throw new Error('response timing invalid');
const assignment = validated.assignments.get(form.formId); if (!assignment) throw new Error('validated assignment missing');
const expected = assignment.questions.map((item: Json) => item.questionId).sort(); const actual = response.answers?.map((item: Json) => item.questionId).sort();
if (response.answers?.length !== 24 || JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('response question coverage invalid');
const allowed = { character: new Set(['C01', 'C02']), equipment: new Set(['unarmed', 'shield']), direction: new Set(['front', 'front-right', 'back-right', 'back', 'back-left', 'front-left']) };
if (response.answers.some((item: Json) => { exactKeys(item, ['questionId', 'character', 'equipment', 'direction'], 'answer'); return !allowed.character.has(item.character) || !allowed.equipment.has(item.equipment) || !allowed.direction.has(item.direction); })) throw new Error('response option invalid');
mkdirSync(resolve(ROOT, RESPONSE_ROOT), { recursive: true });
const ledgerAbsolute = resolve(ROOT, LEDGER_PATH); const lockPath = `${ledgerAbsolute}.lock`; const lock = openSync(lockPath, 'wx');
const destination = `${RESPONSE_ROOT}/${response.participantCode}__${response.formId}__raw.json`; const destinationAbsolute = resolve(ROOT, destination); const ledgerTemp = `${ledgerAbsolute}.${process.pid}.tmp`;
let rawWritten = false; let committed = false; let output = '';
try {
  const current = existsSync(ledgerAbsolute) ? JSON.parse(readFileSync(ledgerAbsolute, 'utf8')) as Json : { schemaVersion: 1, id: 'arena.art.silhouette-human-response-intake.a0.3.v1', status: 'collecting', kitId: kit.id, entries: [] };
  if (current.entries.some((item: Json) => item.participantCode === response.participantCode || item.formId === response.formId)) throw new Error('participant codes and form assignments must both be unique');
  writeFileSync(destinationAbsolute, bytes, { flag: 'wx' }); rawWritten = true;
  const storedBytes = readFileSync(destinationAbsolute); const storedHash = shaBytes(storedBytes);
  if (storedHash !== shaBytes(bytes) || statSync(destinationAbsolute).size !== bytes.byteLength) throw new Error('canonical raw response write verification failed');
  const rawDescriptor = openSync(destinationAbsolute, 'r'); try { fsyncSync(rawDescriptor); } finally { closeSync(rawDescriptor); } fsyncDirectory(dirname(destinationAbsolute));
  const receivedAtMs = Math.max(Date.now(), completed);
  current.entries.push({ participantCode: response.participantCode, formId: response.formId, witnessCode: witness, receivedAt: new Date(receivedAtMs).toISOString(), rawArtifact: { path: destination, byteLength: storedBytes.byteLength, sha256: storedHash } });
  current.participantCount = current.entries.length; current.minimumParticipants = 10; current.hardGatePassed = false;
  const ledgerBytes = Buffer.from(`${JSON.stringify(current, null, 2)}\n`); const temp = openSync(ledgerTemp, 'wx');
  try { writeFileSync(temp, ledgerBytes); fsyncSync(temp); } finally { closeSync(temp); }
  renameSync(ledgerTemp, ledgerAbsolute);
  committed = true; fsyncDirectory(dirname(ledgerAbsolute));
  if (process.env.ARENA_HUMAN_TEST_SIMULATE_POST_COMMIT_FAILURE === '1') throw new Error('simulated post-commit failure');
  output = `${JSON.stringify({ status: current.status, participantCount: current.participantCount, formId: response.formId, stored: destination, hardGatePassed: false })}\n`;
} catch (error) {
  if (existsSync(ledgerTemp)) unlinkSync(ledgerTemp);
  if (!committed && rawWritten && existsSync(destinationAbsolute)) unlinkSync(destinationAbsolute);
  throw error;
} finally {
  closeSync(lock); if (existsSync(lockPath)) unlinkSync(lockPath);
}
process.stdout.write(output);
