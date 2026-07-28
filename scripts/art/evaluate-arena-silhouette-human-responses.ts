import { closeSync, existsSync, fsyncSync, openSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { exactKeys, safePath, shaBytes, validateHumanKit } from './arena-silhouette-human-kit-validation.js';

const ROOT = resolve(process.env.ARENA_HUMAN_TEST_ROOT ?? resolve(import.meta.dirname, '../..'));
const KIT_PATH = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-test-kit-v1.json';
const LEDGER_PATH = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-response-intake-ledger-v1.json';
const OUTPUT_PATH = 'docs/quality/art/silhouette/human-test-kit/arena-a0.3-human-evaluation-v1.json';
type Json = ReturnType<typeof JSON.parse>;
const MAX_FUTURE_SKEW_MS = 300_000;
function fsyncDirectory(path: string): void { const descriptor = openSync(path, 'r'); try { fsyncSync(descriptor); } finally { closeSync(descriptor); } }
function atomicWrite(path: string, bytes: Buffer): void {
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    const descriptor = openSync(temporary, 'wx'); try { writeFileSync(descriptor, bytes); fsyncSync(descriptor); } finally { closeSync(descriptor); }
    renameSync(temporary, path); fsyncDirectory(dirname(path));
  } catch (error) { if (existsSync(temporary)) unlinkSync(temporary); throw error; }
}
if (!existsSync(resolve(ROOT, LEDGER_PATH))) throw new Error('A0.3 human gate blocked: intake ledger missing (0/10)');
const validated = validateHumanKit(ROOT, KIT_PATH); const kit = validated.manifest;
const ledger = JSON.parse(readFileSync(safePath(ROOT, LEDGER_PATH), 'utf8')) as Json;
exactKeys(ledger, ['schemaVersion', 'id', 'status', 'kitId', 'participantCount', 'minimumParticipants', 'entries', 'hardGatePassed', 'coordinatorSignOff', 'downstream'], 'intake ledger');
if (ledger.kitId !== kit.id) throw new Error('A0.3 human gate blocked: intake ledger kit identity drift');
if (ledger.entries?.length !== 10 || new Set(ledger.entries.map((item: Json) => item.participantCode)).size !== 10 || new Set(ledger.entries.map((item: Json) => item.formId)).size !== 10) throw new Error(`A0.3 human gate blocked: requires exactly 10 unique independent participants and 10 uniquely occupied forms, received ${ledger.entries?.length ?? 0}`);
if (ledger.participantCount !== 10 || ledger.minimumParticipants !== 10 || ledger.hardGatePassed !== false || ledger.coordinatorSignOff !== null || ledger.downstream?.a0_3 !== 'incomplete' || ledger.downstream?.blockout !== 'forbidden' || ledger.downstream?.final !== 'incomplete') throw new Error('intake ledger gate/downstream drift');
const answers = validated.answers;
const confusion = { character: {} as Record<string, Record<string, number>>, equipment: {} as Record<string, Record<string, number>>, direction: {} as Record<string, Record<string, number>> };
const totals = { character: 0, equipment: 0, direction: 0, all: 0 }; const strata: Record<string, { count: number; character: number; equipment: number; direction: number }> = {};
const combination: Record<string, { count: number; correct: number }> = {}; const fineStrata: Record<string, { count: number; correct: number }> = {}; const rawArtifacts = [];
const increment = (matrix: Record<string, Record<string, number>>, actual: string, predicted: string): void => { matrix[actual] ??= {}; matrix[actual]![predicted] = (matrix[actual]![predicted] ?? 0) + 1; };
const forms = validated.forms;
const allowed = { character: new Set(['C01', 'C02']), equipment: new Set(['unarmed', 'shield']), direction: new Set(['front', 'front-right', 'back-right', 'back', 'back-left', 'front-left']) };
const expectedRawPaths = new Set<string>();
for (const entry of ledger.entries as Json[]) {
  exactKeys(entry, ['participantCode', 'formId', 'witnessCode', 'receivedAt', 'rawArtifact'], 'ledger entry'); exactKeys(entry.rawArtifact, ['path', 'byteLength', 'sha256'], 'raw artifact');
  const receivedAt = Date.parse(entry.receivedAt);
  if (!/^P-[A-Z0-9]{6,16}$/.test(entry.participantCode) || !/^form-(?:0[1-9]|10)$/.test(entry.formId) || !/^W-[A-Z0-9]{4,16}$/.test(entry.witnessCode) || !Number.isFinite(receivedAt)) throw new Error('ledger participant/form/witness/time invalid');
  if (relative(resolve(ROOT, kit.responseDropPath), resolve(ROOT, entry.rawArtifact.path)).startsWith('..')) throw new Error('raw response must stay inside response drop');
  if (expectedRawPaths.has(entry.rawArtifact.path)) throw new Error('duplicate raw artifact path'); expectedRawPaths.add(entry.rawArtifact.path);
  const rawPath = safePath(ROOT, entry.rawArtifact.path); const bytes = readFileSync(rawPath); if (shaBytes(bytes) !== entry.rawArtifact.sha256 || statSync(rawPath).size !== entry.rawArtifact.byteLength) throw new Error('raw response drift');
  const response = JSON.parse(bytes.toString('utf8')) as Json; rawArtifacts.push(entry.rawArtifact); const form = forms.get(entry.formId); if (!form) throw new Error('ledger form missing from kit');
  exactKeys(response, ['schemaVersion', 'kind', 'kitId', 'assignmentSha256', 'formId', 'participantCode', 'startedAt', 'completedAt', 'durationMs', 'attestations', 'answers'], 'response');
  if (response.schemaVersion !== 1 || response.kind !== 'arena-a0.3-independent-human-response' || response.kitId !== kit.id || response.participantCode !== entry.participantCode || response.formId !== entry.formId || response.assignmentSha256 !== form.assignment.sha256) throw new Error('raw response/ledger/assignment identity mismatch');
  exactKeys(response.attestations ?? {}, ['consent', 'independentFromProduction', 'noAnswerAccess', 'noPersonalDataSubmitted'], 'attestations'); if (!Object.values(response.attestations).every((value) => value === true)) throw new Error('raw attestation invalid');
  const started = Date.parse(response.startedAt); const completed = Date.parse(response.completedAt); if (!Number.isFinite(started) || !Number.isFinite(completed) || completed <= started || completed > Date.now() + MAX_FUTURE_SKEW_MS || receivedAt < completed || Math.abs(response.durationMs - (completed - started)) > 1_000 || response.durationMs < 30_000 || response.durationMs > 7_200_000) throw new Error('raw timing invalid');
  const assignment = validated.assignments.get(form.formId); if (!assignment) throw new Error('validated assignment missing'); const expected = assignment.questions.map((item: Json) => item.questionId).sort(); const received = response.answers?.map((item: Json) => item.questionId).sort(); if (response.answers?.length !== 24 || JSON.stringify(expected) !== JSON.stringify(received)) throw new Error('raw question coverage invalid');
  for (const item of response.answers as Json[]) {
    exactKeys(item, ['questionId', 'character', 'equipment', 'direction'], 'answer'); if (!allowed.character.has(item.character) || !allowed.equipment.has(item.equipment) || !allowed.direction.has(item.direction)) throw new Error('raw enum invalid');
    const actual = answers.get(item.questionId); if (!actual) throw new Error('unknown question in raw response'); totals.all += 1;
    for (const dimension of ['character', 'equipment', 'direction'] as const) { increment(confusion[dimension], actual[dimension], item[dimension]); if (actual[dimension] === item[dimension]) totals[dimension] += 1; }
    for (const name of [`distance:${actual.distanceMeters}`, `viewport:${actual.viewport}`]) { const bucket = strata[name] ??= { count: 0, character: 0, equipment: 0, direction: 0 }; bucket.count += 1; for (const dimension of ['character', 'equipment', 'direction'] as const) if (actual[dimension] === item[dimension]) bucket[dimension] += 1; }
    const comboId = `${actual.character}|${actual.equipment}`; const combo = combination[comboId] ??= { count: 0, correct: 0 }; combo.count += 1; if (actual.character === item.character && actual.equipment === item.equipment) combo.correct += 1;
    const fineId = `${actual.character}|${actual.equipment}|${actual.direction}|d${actual.distanceMeters}`; const fine = fineStrata[fineId] ??= { count: 0, correct: 0 }; fine.count += 1; if (actual.character === item.character && actual.equipment === item.equipment && actual.direction === item.direction) fine.correct += 1;
  }
}
const responseFiles = readdirSync(safePath(ROOT, kit.responseDropPath)).filter((name) => name.endsWith('.json')).map((name) => `${kit.responseDropPath}/${name}`).sort();
if (JSON.stringify(responseFiles) !== JSON.stringify([...expectedRawPaths].sort())) throw new Error('raw response directory/ledger set mismatch');
const accuracy = { character: totals.character / totals.all, equipment: totals.equipment / totals.all, direction: totals.direction / totals.all };
const stratified = Object.fromEntries(Object.entries(strata).map(([id, item]) => [id, { sampleCount: item.count, characterAccuracy: item.character / item.count, equipmentAccuracy: item.equipment / item.count, directionAccuracy: item.direction / item.count }]));
const combinations = Object.fromEntries(Object.entries(combination).map(([id, item]) => [id, { sampleCount: item.count, jointAccuracy: item.correct / item.count }]));
const fine = Object.fromEntries(Object.entries(fineStrata).map(([id, item]) => [id, { sampleCount: item.count, jointAccuracy: item.correct / item.count }]));
const passed = Object.values(accuracy).every((value) => value >= 0.9) && Object.values(stratified).every((item: Json) => item.characterAccuracy >= 0.9 && item.equipmentAccuracy >= 0.9 && item.directionAccuracy >= 0.9) && Object.values(combinations).every((item: Json) => item.jointAccuracy >= 0.8) && Object.keys(fine).length === 72 && Object.values(fine).every((item: Json) => item.sampleCount >= 2 && item.jointAccuracy >= 0.8);
const kitBytes = readFileSync(safePath(ROOT, KIT_PATH));
const report = { schemaVersion: 1, id: 'arena.art.silhouette-human-evaluation.a0.3.v1', status: passed ? 'human-threshold-candidate' : 'human-threshold-failed', generatedAt: new Date().toISOString(), kit: { path: KIT_PATH, byteLength: kitBytes.byteLength, sha256: shaBytes(kitBytes) }, restrictedEvaluator: kit.restrictedEvaluator, participantCount: ledger.entries.length, formCount: new Set(ledger.entries.map((item: Json) => item.formId)).size, rawArtifacts, accuracy, confusion, stratified, combinations, fineStrata: fine, thresholds: { overallEach: 0.9, eachDistanceAndViewport: 0.9, eachCharacterEquipmentJoint: 0.8, fineStratumCount: 72, eachCharacterEquipmentDirectionDistanceMinimumSamples: 2, eachCharacterEquipmentDirectionDistanceJoint: 0.8 }, hardGatePassed: false, coordinatorSignOff: null, downstream: { a0_3: 'incomplete', blockout: 'forbidden', final: 'incomplete' } };
atomicWrite(resolve(ROOT, OUTPUT_PATH), Buffer.from(`${JSON.stringify(report, null, 2)}\n`));
if (!passed) throw new Error('A0.3 human thresholds failed; report written and downstream remains closed');
process.stdout.write(`${JSON.stringify({ status: report.status, participantCount: report.participantCount, accuracy, hardGatePassed: false, coordinatorSignOff: null })}\n`);
