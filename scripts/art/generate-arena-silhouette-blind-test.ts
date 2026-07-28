import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');
const RENDER_MANIFEST_PATH = 'docs/quality/art/silhouette/arena-a0.3-silhouette-render-manifest-v1.json';
const BLIND_DIR = 'docs/quality/art/silhouette/blind-test';
const QUESTION_IMAGE_DIR = `${BLIND_DIR}/question-images`;
const QUESTION_PATH = `${BLIND_DIR}/arena-a0.3-blind-questions-v1.json`;
const ANSWER_PATH = `${BLIND_DIR}/arena-a0.3-blind-answer-key-v1.json`;
const PROXY_PATH = `${BLIND_DIR}/arena-a0.3-internal-proxy-baseline-v1.json`;
const PACKAGE_PATH = `${BLIND_DIR}/arena-a0.3-blind-test-package-v1.json`;
const SEED = 20260728;
type JsonRecord = Record<string, unknown>;
type RenderOutput = Readonly<{ id: string; characterId: string; equipmentState: string; direction: string; distanceMeters: number; viewport: Readonly<{ id: string }>; thumbnail: Readonly<{ path: string; sha256: string; byteLength: number; width: number; height: number }> }>;
type Feature = Readonly<{ output: RenderOutput; bits: string }>;

function sha256Bytes(value: Buffer | string): string { return createHash('sha256').update(value).digest('hex'); }
function sha256File(path: string): string { return sha256Bytes(readFileSync(resolve(ROOT, path))); }
function artifact(path: string): Readonly<Record<string, unknown>> { return { path, sha256: sha256File(path), byteLength: statSync(resolve(ROOT, path)).size }; }
function mulberry32(seed: number): () => number { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed); value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value; return ((value ^ value >>> 14) >>> 0) / 4294967296; }; }
function shuffle<T>(values: readonly T[], seed: number): T[] { const result = [...values]; const random = mulberry32(seed); for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(random() * (index + 1)); [result[index], result[swap]] = [result[swap]!, result[index]!]; } return result; }
function hamming(left: string, right: string): number { let distance = 0; for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) distance += 1; return distance; }
async function feature(output: RenderOutput): Promise<Feature> {
  const { data, info } = await sharp(resolve(ROOT, output.thumbnail.path)).greyscale().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width; let maxX = -1; let minY = info.height; let maxY = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[y * info.width + x]! < 64) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (maxX < minX || maxY < minY) return { output, bits: '0'.repeat(4096) };
  const normalized = await sharp(resolve(ROOT, output.thumbnail.path)).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).resize(64, 64, { fit: 'contain', background: '#808080', kernel: 'nearest' }).greyscale().raw().toBuffer();
  return { output, bits: [...normalized].map((value) => value < 64 ? '1' : '0').join('') };
}

const renderManifest = JSON.parse(readFileSync(resolve(ROOT, RENDER_MANIFEST_PATH), 'utf8')) as JsonRecord;
const outputs = renderManifest.outputs as RenderOutput[];
if (renderManifest.status !== 'render-evidence-ready' || outputs.length !== 144) throw new Error('render manifest must contain 144 ready outputs');
mkdirSync(resolve(ROOT, QUESTION_IMAGE_DIR), { recursive: true });
const randomized = shuffle(outputs, SEED);
const mapping = randomized.map((output, index) => {
  const questionId = `q${String(index + 1).padStart(4, '0')}`;
  const path = `${QUESTION_IMAGE_DIR}/${questionId}.png`;
  const bytes = readFileSync(resolve(ROOT, output.thumbnail.path));
  writeFileSync(resolve(ROOT, path), bytes);
  return { questionId, image: { path, sha256: sha256Bytes(bytes), byteLength: bytes.length, width: output.thumbnail.width, height: output.thumbnail.height }, output };
});

const formBuckets = Array.from({ length: 10 }, () => [] as typeof mapping[number][]);
mapping.forEach((item, index) => formBuckets[index % formBuckets.length]!.push(item));
const repeatOrder = shuffle(mapping, SEED + 50);
let repeatCursor = 0;
for (const bucket of formBuckets) {
  const seen = new Set(bucket.map((item) => item.questionId));
  while (bucket.length < 24) {
    const candidate = repeatOrder[repeatCursor % repeatOrder.length]!; repeatCursor += 1;
    if (seen.has(candidate.questionId)) continue;
    bucket.push(candidate); seen.add(candidate.questionId);
  }
}
const forms = formBuckets.map((bucket, formIndex) => {
  const selected = shuffle(bucket, SEED + formIndex + 1);
  return { formId: `form-${String(formIndex + 1).padStart(2, '0')}`, seed: SEED + formIndex + 1, questions: selected.map((item) => ({ questionId: item.questionId, imagePath: item.image.path })) };
});
const formQuestionCounts = new Map<string, number>();
for (const form of forms) for (const question of form.questions) formQuestionCounts.set(question.questionId, (formQuestionCounts.get(question.questionId) ?? 0) + 1);
const questions = {
  schemaVersion: 1, id: 'arena.art.silhouette-blind-questions.a0.3.v1', status: 'awaiting-human-responses', seed: SEED,
  instructions: 'Do not inspect repository filenames or the separate answer key. For each opaque image, choose one character slot, one equipment state and one facing direction.',
  options: { character: ['C01', 'C02'], equipment: ['unarmed', 'shield'], direction: ['front', 'front-right', 'back-right', 'back', 'back-left', 'front-left'] },
  forms, aggregateCoverage: { uniqueQuestions: formQuestionCounts.size, minimumAppearances: Math.min(...formQuestionCounts.values()), maximumAppearances: Math.max(...formQuestionCounts.values()) }, minimumIndependentHumanParticipants: 10, receivedIndependentHumanParticipants: 0, answersIncluded: false,
};
writeFileSync(resolve(ROOT, QUESTION_PATH), `${JSON.stringify(questions, null, 2)}\n`);
const answerKey = {
  schemaVersion: 1, id: 'arena.art.silhouette-blind-answer-key.a0.3.v1', status: 'restricted-evaluator-only', questionPackId: questions.id,
  answers: mapping.map((item) => ({ questionId: item.questionId, character: item.output.characterId === 'parkour-apprentice' ? 'C01' : 'C02', equipment: item.output.equipmentState, direction: item.output.direction, distanceMeters: item.output.distanceMeters, viewport: item.output.viewport.id, sourceOutputId: item.output.id })),
};
writeFileSync(resolve(ROOT, ANSWER_PATH), `${JSON.stringify(answerKey, null, 2)}\n`);

const features = await Promise.all(outputs.map(feature));
const increment = (matrix: Record<string, Record<string, number>>, actual: string, predicted: string, amount = 1): void => { matrix[actual] ??= {}; matrix[actual]![predicted] = (matrix[actual]![predicted] ?? 0) + amount; };
const proxyRuns = Array.from({ length: 10 }, (_, runIndex) => {
  const poolOrder = shuffle(features, SEED + 100 + runIndex);
  const pool = new Set(poolOrder.slice(0, Math.floor(poolOrder.length * 0.8)).map((item) => item.output.id));
  let characterCorrect = 0; let equipmentCorrect = 0; let directionCorrect = 0;
  const confusion = { character: {} as Record<string, Record<string, number>>, equipment: {} as Record<string, Record<string, number>>, direction: {} as Record<string, Record<string, number>> };
  const byDistance: Record<string, { sampleCount: number; characterCorrect: number; equipmentCorrect: number; directionCorrect: number }> = {};
  for (const target of features) {
    const candidates = features.filter((candidate) => candidate.output.id !== target.output.id && pool.has(candidate.output.id));
    const nearest = candidates.reduce((best, candidate) => hamming(target.bits, candidate.bits) < hamming(target.bits, best.bits) ? candidate : best, candidates[0]!);
    if (nearest.output.characterId === target.output.characterId) characterCorrect += 1;
    if (nearest.output.equipmentState === target.output.equipmentState) equipmentCorrect += 1;
    if (nearest.output.direction === target.output.direction) directionCorrect += 1;
    increment(confusion.character, target.output.characterId, nearest.output.characterId);
    increment(confusion.equipment, target.output.equipmentState, nearest.output.equipmentState);
    increment(confusion.direction, target.output.direction, nearest.output.direction);
    const bucket = byDistance[String(target.output.distanceMeters)] ??= { sampleCount: 0, characterCorrect: 0, equipmentCorrect: 0, directionCorrect: 0 };
    bucket.sampleCount += 1;
    if (nearest.output.characterId === target.output.characterId) bucket.characterCorrect += 1;
    if (nearest.output.equipmentState === target.output.equipmentState) bucket.equipmentCorrect += 1;
    if (nearest.output.direction === target.output.direction) bucket.directionCorrect += 1;
  }
  return { runId: `internal-proxy-${String(runIndex + 1).padStart(2, '0')}`, kind: 'non-human-nearest-silhouette-sanity-proxy', seed: SEED + 100 + runIndex, sampleCount: features.length, characterAccuracy: characterCorrect / features.length, equipmentAccuracy: equipmentCorrect / features.length, directionAccuracy: directionCorrect / features.length, confusion, byDistance: Object.fromEntries(Object.entries(byDistance).map(([distance, item]) => [distance, { sampleCount: item.sampleCount, characterAccuracy: item.characterCorrect / item.sampleCount, equipmentAccuracy: item.equipmentCorrect / item.sampleCount, directionAccuracy: item.directionCorrect / item.sampleCount }])) };
});
const average = (field: 'characterAccuracy' | 'equipmentAccuracy' | 'directionAccuracy') => proxyRuns.reduce((sum, run) => sum + run[field], 0) / proxyRuns.length;
const aggregateConfusion = { character: {} as Record<string, Record<string, number>>, equipment: {} as Record<string, Record<string, number>>, direction: {} as Record<string, Record<string, number>> };
for (const run of proxyRuns) for (const dimension of ['character', 'equipment', 'direction'] as const) for (const [actual, predictions] of Object.entries(run.confusion[dimension])) for (const [predicted, count] of Object.entries(predictions)) increment(aggregateConfusion[dimension], actual, predicted, count);
const aggregateByDistance = Object.fromEntries(['0', '5', '12'].map((distance) => [distance, {
  sampleCountPerRun: proxyRuns[0]!.byDistance[distance]!.sampleCount,
  characterAccuracy: proxyRuns.reduce((sum, run) => sum + run.byDistance[distance]!.characterAccuracy, 0) / proxyRuns.length,
  equipmentAccuracy: proxyRuns.reduce((sum, run) => sum + run.byDistance[distance]!.equipmentAccuracy, 0) / proxyRuns.length,
  directionAccuracy: proxyRuns.reduce((sum, run) => sum + run.byDistance[distance]!.directionAccuracy, 0) / proxyRuns.length,
}]));
const proxy = {
  schemaVersion: 1, id: 'arena.art.silhouette-internal-proxy.a0.3.v1', status: 'non-human-proxy-only', method: '64x64 centered binary silhouette nearest-neighbor; 10 deterministic 80% template folds',
  disclaimer: 'This is a tooling and gross-confusion sanity baseline. It is not a human participant, usability result, device result or A0.3 pass.',
  runs: proxyRuns, aggregate: { runCount: 10, sampleCountPerRun: 144, characterAccuracy: average('characterAccuracy'), equipmentAccuracy: average('equipmentAccuracy'), directionAccuracy: average('directionAccuracy'), confusion: aggregateConfusion, byDistance: aggregateByDistance },
};
writeFileSync(resolve(ROOT, PROXY_PATH), `${JSON.stringify(proxy, null, 2)}\n`);

const packageManifest = {
  schemaVersion: 1, id: 'arena.art.silhouette-blind-test-package.a0.3.v1', status: 'awaiting-human-responses', generatedAt: '2026-07-28', seed: SEED,
  renderManifest: { path: RENDER_MANIFEST_PATH, sha256: sha256File(RENDER_MANIFEST_PATH) }, questions: artifact(QUESTION_PATH), answerKey: artifact(ANSWER_PATH), proxyBaseline: artifact(PROXY_PATH),
  questionImages: mapping.map((item) => ({ questionId: item.questionId, ...item.image })), formCount: forms.length, questionsPerForm: 24,
  humanEvidence: { participantCount: 0, minimum: 10, independentFromProduction: true, rawResponses: [], status: 'missing-blocking' },
  thresholds: { character: 0.9, equipment: 0.9, direction: 0.9, minimumCombination: 0.8 },
};
writeFileSync(resolve(ROOT, PACKAGE_PATH), `${JSON.stringify(packageManifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: packageManifest.status, opaqueImages: mapping.length, forms: forms.length, proxy: proxy.aggregate, humanParticipants: 0 })}\n`);
