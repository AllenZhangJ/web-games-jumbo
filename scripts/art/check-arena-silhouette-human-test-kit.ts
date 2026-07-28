import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { safePath, validateHumanKit } from './arena-silhouette-human-kit-validation.js';

const ROOT = resolve(process.env.ARENA_HUMAN_TEST_ROOT ?? resolve(import.meta.dirname, '../..'));
const MANIFEST_PATH = process.env.ARENA_SILHOUETTE_HUMAN_KIT ?? 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-test-kit-v1.json';
const validated = validateHumanKit(ROOT, MANIFEST_PATH);
const { manifest, answerKey, appearances } = validated;

const intake = JSON.parse(readFileSync(safePath(ROOT, manifest.intakeLedgerPath), 'utf8')) as ReturnType<typeof JSON.parse>;
const responseFiles = readdirSync(safePath(ROOT, manifest.responseDropPath)).filter((name) => name.endsWith('.json'));
if (intake.participantCount !== intake.entries?.length || responseFiles.length !== intake.entries?.length || intake.hardGatePassed !== false || intake.coordinatorSignOff !== null) throw new Error('intake ledger/raw response count or fail-closed state');
if (readFileSync(safePath(ROOT, manifest.responseDropPolicy.path), 'utf8') !== '*\n!.gitignore\n!.gitkeep\n') throw new Error('response .gitignore policy drift');
if (!process.env.ARENA_HUMAN_TEST_ROOT) {
  const tracked = execFileSync('git', ['-C', ROOT, 'ls-files', '--', `${manifest.responseDropPath}/*.json`], { encoding: 'utf8' }).trim();
  if (tracked) throw new Error(`raw human responses must never be Git-tracked: ${tracked}`);
}

for (const form of manifest.forms as ReturnType<typeof JSON.parse>[]) {
  const participantBytes = Buffer.concat([
    readFileSync(safePath(ROOT, form.assignment.path)),
    readFileSync(safePath(ROOT, form.runner.path)),
    ...form.images.map((item: ReturnType<typeof JSON.parse>) => readFileSync(safePath(ROOT, item.path))),
  ]);
  const participantText = participantBytes.toString('latin1');
  if (/answer-key|sourceOutputId|parkour-apprentice|wind-up-cube|kaykit|correctAnswer/i.test(participantText)) throw new Error(`${form.formId} answer/source leakage`);
  if (!participantText.includes(form.assignment.sha256)) throw new Error(`${form.formId} runner assignment hash missing`);
}

const fineStrata = new Map<string, number>();
const distanceSamples = new Map<number, number>();
for (const answer of answerKey.answers as ReturnType<typeof JSON.parse>[]) {
  const count = appearances.get(answer.questionId);
  if (!count) throw new Error(`answer key question absent from forms: ${answer.questionId}`);
  const fineId = `${answer.character}|${answer.equipment}|${answer.direction}|d${answer.distanceMeters}`;
  fineStrata.set(fineId, (fineStrata.get(fineId) ?? 0) + count);
  distanceSamples.set(answer.distanceMeters, (distanceSamples.get(answer.distanceMeters) ?? 0) + count);
}
if (fineStrata.size !== 72 || Math.min(...fineStrata.values()) < 2 || [...distanceSamples.keys()].sort((a, b) => a - b).join(',') !== '0,5,12') throw new Error('72 fine-strata sample coverage drift');
process.stdout.write(`${JSON.stringify({ status: manifest.status, forms: 10, questionsPerForm: 24, uniqueQuestions: 144, exactCartesianTuples: 144, uniqueSourceOutputIds: 144, viewportsPerFineStratum: 2, appearances: [1, 2], fineStrata: { count: fineStrata.size, minimumSamples: Math.min(...fineStrata.values()), maximumSamples: Math.max(...fineStrata.values()) }, distanceSamples: Object.fromEntries(distanceSamples), humanParticipants: intake.participantCount, hardGatePassed: false })}\n`);
