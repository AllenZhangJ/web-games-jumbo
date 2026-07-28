import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export type Json = ReturnType<typeof JSON.parse>;

const EXPECTED = {
  kitId: 'arena.art.silhouette-human-test-kit.a0.3.v1',
  packageId: 'arena.art.silhouette-blind-test-package.a0.3.v1',
  questionsId: 'arena.art.silhouette-blind-questions.a0.3.v1',
  answerKeyId: 'arena.art.silhouette-blind-answer-key.a0.3.v1',
} as const;
const CHARACTERS = ['C01', 'C02'] as const;
const EQUIPMENT = ['unarmed', 'shield'] as const;
const DIRECTIONS = ['front', 'front-right', 'back-right', 'back', 'back-left', 'front-left'] as const;
const DISTANCES = [0, 5, 12] as const;
const VIEWPORTS = ['1280x720@1x', '390x844@2x'] as const;
const CHARACTER_SOURCE = {
  C01: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
  C02: 'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
} as const;

export function shaBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function exactKeys(value: Json, expected: readonly string[], label: string): void {
  if (!value || typeof value !== 'object' || Object.keys(value).sort().join(',') !== [...expected].sort().join(',')) {
    throw new Error(`${label} contains missing or future fields`);
  }
}

export function safePath(root: string, path: string): string {
  const absolute = resolve(root, path);
  const actualRoot = realpathSync(root);
  const actual = realpathSync(absolute);
  if (relative(actualRoot, actual).startsWith('..') || lstatSync(absolute).isSymbolicLink()) {
    throw new Error(`path escape or symlink: ${path}`);
  }
  return actual;
}

function verifyArtifact(root: string, value: Json, label: string): string {
  exactKeys(value, ['path', 'byteLength', 'sha256'], label);
  const path = safePath(root, value.path);
  const bytes = readFileSync(path);
  if (statSync(path).size !== value.byteLength || shaBytes(bytes) !== value.sha256) {
    throw new Error(`${label} drift: ${value.path}`);
  }
  return path;
}

function sameArtifact(actual: Json, expected: Json, label: string): void {
  if (actual?.path !== expected.path || actual?.byteLength !== expected.byteLength || actual?.sha256 !== expected.sha256) {
    throw new Error(`${label} contract mismatch`);
  }
}

export type ValidatedHumanKit = Readonly<{
  manifest: Json;
  blindPackage: Json;
  questions: Json;
  answerKey: Json;
  answers: Map<string, Json>;
  forms: Map<string, Json>;
  assignments: Map<string, Json>;
  appearances: Map<string, number>;
}>;

export function validateHumanKit(root: string, manifestPath: string): ValidatedHumanKit {
  const manifest = JSON.parse(readFileSync(safePath(root, manifestPath), 'utf8')) as Json;
  if (manifest.schemaVersion !== 1 || manifest.id !== EXPECTED.kitId || manifest.status !== 'ready-for-external-human-input') throw new Error('human kit identity/status drift');
  if (manifest.answerKeyIncluded !== false || manifest.personalDataRequested !== false || manifest.participantCount !== 0 || manifest.minimumParticipants !== 10 || manifest.hardGatePassed !== false) throw new Error('human kit privacy/human boundary drift');
  if (manifest.forms?.length !== 10 || manifest.formCount !== 10 || manifest.questionsPerForm !== 24 || manifest.aggregateCoverage?.uniqueQuestions !== 144 || manifest.aggregateCoverage?.minimumAppearances !== 1 || manifest.aggregateCoverage?.maximumAppearances !== 2) throw new Error('human kit balanced coverage drift');
  if (manifest.downstream?.a0_3 !== 'incomplete' || manifest.downstream?.blockout !== 'forbidden' || manifest.downstream?.final !== 'incomplete') throw new Error('human kit downstream leak');
  if (manifest.restrictedEvaluator?.status !== 'restricted-evaluator-only' || manifest.restrictedEvaluator?.participantAccessible !== false) throw new Error('restricted evaluator contract missing');

  const packagePath = verifyArtifact(root, manifest.restrictedEvaluator.blindPackage, 'blind package');
  const questionsPath = verifyArtifact(root, manifest.restrictedEvaluator.questions, 'restricted questions');
  const answerKeyPath = verifyArtifact(root, manifest.restrictedEvaluator.answerKey, 'restricted answer key');
  sameArtifact(manifest.sourceQuestions, manifest.restrictedEvaluator.questions, 'source questions');
  verifyArtifact(root, manifest.sourceQuestions, 'source questions');
  verifyArtifact(root, manifest.responseDropPolicy, 'response drop policy');

  const blindPackage = JSON.parse(readFileSync(packagePath, 'utf8')) as Json;
  const questions = JSON.parse(readFileSync(questionsPath, 'utf8')) as Json;
  const answerKey = JSON.parse(readFileSync(answerKeyPath, 'utf8')) as Json;
  if (blindPackage.schemaVersion !== 1 || blindPackage.id !== EXPECTED.packageId || blindPackage.status !== 'awaiting-human-responses') throw new Error('blind package identity/status drift');
  sameArtifact(blindPackage.questions, manifest.restrictedEvaluator.questions, 'blind package questions');
  sameArtifact(blindPackage.answerKey, manifest.restrictedEvaluator.answerKey, 'blind package answer key');
  if (questions.schemaVersion !== 1 || questions.id !== EXPECTED.questionsId || questions.status !== 'awaiting-human-responses' || questions.forms?.length !== 10) throw new Error('blind questions identity/status drift');
  exactKeys(answerKey, ['schemaVersion', 'id', 'status', 'questionPackId', 'answers'], 'answer key');
  if (answerKey.schemaVersion !== 1 || answerKey.id !== EXPECTED.answerKeyId || answerKey.status !== 'restricted-evaluator-only' || answerKey.questionPackId !== questions.id || answerKey.answers?.length !== 144) throw new Error('answer key identity/status drift');

  const answers = new Map<string, Json>();
  const tuples = new Map<string, Json>();
  const sourceOutputIds = new Set<string>();
  for (const answer of answerKey.answers as Json[]) {
    exactKeys(answer, ['questionId', 'character', 'equipment', 'direction', 'distanceMeters', 'viewport', 'sourceOutputId'], `answer ${answer?.questionId ?? 'unknown'}`);
    if (!CHARACTERS.includes(answer.character) || !EQUIPMENT.includes(answer.equipment) || !DIRECTIONS.includes(answer.direction) || !DISTANCES.includes(answer.distanceMeters) || !VIEWPORTS.includes(answer.viewport)) throw new Error(`answer value outside fixed domain: ${answer.questionId}`);
    if (answers.has(answer.questionId)) throw new Error(`duplicate answer key question: ${answer.questionId}`);
    const tuple = `${answer.character}|${answer.equipment}|${answer.direction}|${answer.distanceMeters}|${answer.viewport}`;
    if (tuples.has(tuple)) throw new Error(`duplicate answer tuple: ${tuple}`);
    const distanceId = `d${String(answer.distanceMeters).padStart(2, '0')}`;
    const expectedSourceOutputId = `${CHARACTER_SOURCE[answer.character as keyof typeof CHARACTER_SOURCE]}__${answer.equipment}__${answer.direction}__${distanceId}__${answer.viewport}`;
    if (answer.sourceOutputId !== expectedSourceOutputId || sourceOutputIds.has(answer.sourceOutputId)) throw new Error(`answer sourceOutputId identity/uniqueness drift: ${answer.questionId}`);
    answers.set(answer.questionId, answer);
    tuples.set(tuple, answer);
    sourceOutputIds.add(answer.sourceOutputId);
  }
  const expectedTuples = new Set<string>();
  for (const character of CHARACTERS) for (const equipment of EQUIPMENT) for (const direction of DIRECTIONS) for (const distance of DISTANCES) for (const viewport of VIEWPORTS) expectedTuples.add(`${character}|${equipment}|${direction}|${distance}|${viewport}`);
  if (answers.size !== 144 || tuples.size !== 144 || sourceOutputIds.size !== 144 || [...expectedTuples].some((tuple) => !tuples.has(tuple))) throw new Error('answer key must contain the exact 2x2x6x3x2 Cartesian product once');
  for (const character of CHARACTERS) for (const equipment of EQUIPMENT) for (const direction of DIRECTIONS) for (const distance of DISTANCES) {
    const viewportSet = new Set(VIEWPORTS.filter((viewport) => tuples.has(`${character}|${equipment}|${direction}|${distance}|${viewport}`)));
    if (viewportSet.size !== 2) throw new Error(`fine stratum must contain both viewports: ${character}|${equipment}|${direction}|${distance}`);
  }

  const sourceForms = new Map<string, Json>((questions.forms as Json[]).map((form: Json) => [form.formId, form] as const));
  const packageImages = new Map<string, Json>();
  for (const image of blindPackage.questionImages as Json[]) {
    if (packageImages.has(image.questionId)) throw new Error(`duplicate blind package image: ${image.questionId}`);
    packageImages.set(image.questionId, image);
  }
  if (packageImages.size !== 144) throw new Error('blind package must bind 144 unique images');

  const forms = new Map<string, Json>();
  const assignments = new Map<string, Json>();
  const appearances = new Map<string, number>();
  for (const form of manifest.forms as Json[]) {
    if (forms.has(form.formId)) throw new Error(`duplicate kit form: ${form.formId}`);
    forms.set(form.formId, form);
    const assignmentPath = verifyArtifact(root, form.assignment, `${form.formId} assignment`);
    verifyArtifact(root, form.runner, `${form.formId} runner`);
    const assignment = JSON.parse(readFileSync(assignmentPath, 'utf8')) as Json;
    assignments.set(form.formId, assignment);
    if (assignment.schemaVersion !== 1 || assignment.kitId !== manifest.id || assignment.formId !== form.formId || assignment.questionCount !== 24 || assignment.questions?.length !== 24) throw new Error(`${form.formId} assignment identity drift`);
    const sourceForm = sourceForms.get(form.formId);
    if (!sourceForm || sourceForm.questions?.length !== 24) throw new Error(`${form.formId} absent from restricted questions`);
    const sourceQuestionIds = sourceForm.questions.map((item: Json) => item.questionId);
    const assignmentQuestionIds = assignment.questions.map((item: Json) => item.questionId);
    if (JSON.stringify(sourceQuestionIds) !== JSON.stringify(assignmentQuestionIds) || new Set(assignmentQuestionIds).size !== 24) throw new Error(`${form.formId} assignment/questions drift`);
    const manifestImages = new Map<string, Json>((form.images as Json[]).map((item: Json) => [item.questionId, item] as const));
    if (manifestImages.size !== 24) throw new Error(`${form.formId} image count/identity drift`);
    for (const item of assignment.questions as Json[]) {
      const image = manifestImages.get(item.questionId);
      const packageImage = packageImages.get(item.questionId);
      if (!image || !packageImage || item.image !== `images/${item.questionId}.png` || item.sha256 !== image.sha256 || image.sha256 !== packageImage.sha256) throw new Error(`${form.formId}/${item.questionId} assignment/image identity drift`);
      verifyArtifact(root, { path: image.path, byteLength: image.byteLength, sha256: image.sha256 }, `${form.formId}/${item.questionId} image`);
      appearances.set(item.questionId, (appearances.get(item.questionId) ?? 0) + 1);
    }
    for (const calibration of form.calibration as Json[]) {
      verifyArtifact(root, { path: calibration.path, byteLength: calibration.byteLength, sha256: calibration.sha256 }, `${form.formId} calibration`);
      if (shaBytes(readFileSync(safePath(root, calibration.sourcePath))) !== calibration.sourceSha256) throw new Error(`${form.formId} calibration source drift`);
    }
  }
  const answerIds = [...answers.keys()].sort();
  const assignmentIds = [...appearances.keys()].sort();
  const packageImageIds = [...packageImages.keys()].sort();
  if (forms.size !== 10 || answerIds.length !== 144 || JSON.stringify(answerIds) !== JSON.stringify(assignmentIds) || JSON.stringify(answerIds) !== JSON.stringify(packageImageIds)) throw new Error('answer/questions/forms image sets are not bidirectionally identical');
  if (Math.min(...appearances.values()) !== 1 || Math.max(...appearances.values()) !== 2) throw new Error('question appearance balance drift');
  return { manifest, blindPackage, questions, answerKey, answers, forms, assignments, appearances };
}
