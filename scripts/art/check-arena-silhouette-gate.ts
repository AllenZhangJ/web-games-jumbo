import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import sharp from 'sharp';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY,
  ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1,
} from '../../packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.js';
import {
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1,
  ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY,
} from '../../packages/arena-product-presentation/src/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.js';
import { validateArenaSilhouetteInheritedSourceFreeze } from './arena-silhouette-source-freeze.js';

const ROOT = resolve(import.meta.dirname, '../..');
const RENDER_PATH = process.env.ARENA_SILHOUETTE_RENDER ?? 'docs/quality/art/silhouette/arena-a0.3-silhouette-render-manifest-v1.json';
const BLIND_PATH = process.env.ARENA_SILHOUETTE_BLIND ?? 'docs/quality/art/silhouette/blind-test/arena-a0.3-blind-test-package-v1.json';
const GATE_PATH = process.env.ARENA_SILHOUETTE_GATE ?? 'docs/quality/art/silhouette/arena-a0.3-gate-v1.json';
const CHECKER_PATH = 'scripts/art/check-arena-silhouette-gate.ts';
const FORMAL_CATALOG_SOURCE = 'packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts';
const APPROVAL_LEDGER_SOURCE = 'packages/arena-product-presentation/src/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.ts';
const AUTHORITY_PATHS = [
  'packages/arena-presentation-three/src/arena-camera.ts',
  'packages/arena-presentation-runtime/src/six-sector-direction-resolver.ts',
  FORMAL_CATALOG_SOURCE,
  APPROVAL_LEDGER_SOURCE,
  'governance/formal-assets/arena-stage7-formal-assets-v1.json',
] as const;
const SELECTED_ASSET_IDS = [
  'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
  'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
  'arena.asset.attachment.shield.kaykit-round.v1',
] as const;
type Json = ReturnType<typeof JSON.parse>;
const fail = (message: string): never => { throw new Error(message); };
function requirePresent<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}
const read = (path: string): Json => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as Json;
const hash = (path: string): string => createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');
function safe(path: string): string {
  const absolute = resolve(ROOT, path);
  if (!existsSync(absolute)) fail(`missing path: ${path}`);
  const rel = relative(ROOT, realpathSync(absolute));
  if (rel.startsWith('..') || resolve(ROOT, rel) !== realpathSync(absolute)) fail(`path escape: ${path}`);
  if (lstatSync(absolute).isSymbolicLink()) fail(`symlink forbidden: ${path}`);
  return absolute;
}
function verifyArtifact(value: Json, dimensions = false): void {
  const absolute = safe(value.path);
  if (hash(value.path) !== value.sha256 || (value.byteLength !== undefined && statSync(absolute).size !== value.byteLength)) fail(`artifact identity mismatch: ${value.path}`);
  if (dimensions && (!(value.width > 0) || !(value.height > 0))) fail(`invalid dimensions: ${value.path}`);
}

const render = read(RENDER_PATH); const blind = read(BLIND_PATH); const gate = read(GATE_PATH);
const sourceFreeze = validateArenaSilhouetteInheritedSourceFreeze(render.sourceFreeze, CHECKER_PATH);
if (render.status !== 'render-evidence-ready' || render.outputs?.length !== 144) fail('render coverage/status');
if (
  render.sourceCommit !== sourceFreeze.sourceCommit
  || blind.sourceCommit !== sourceFreeze.sourceCommit
  || gate.sourceCommit !== sourceFreeze.sourceCommit
  || JSON.stringify(blind.sourceFreeze) !== JSON.stringify(render.sourceFreeze)
  || JSON.stringify(gate.sourceFreeze) !== JSON.stringify(render.sourceFreeze)
) fail('sourceCommit/source-freeze inheritance drift');
if (JSON.stringify(render.authorities?.map((item: Json) => item.path)) !== JSON.stringify(AUTHORITY_PATHS)) fail('authority path drift');
if (JSON.stringify(render.authorities).includes('arena-v1-presentation-content')) fail('historical V1 Presentation authority leaked');
for (const authority of render.authorities) verifyArtifact(authority);
const catalog = render.formalCatalog;
if (!catalog || catalog.source?.path !== FORMAL_CATALOG_SOURCE || catalog.approvalLedger?.source?.path !== APPROVAL_LEDGER_SOURCE) fail('current Catalog source binding missing');
verifyArtifact(catalog.source); verifyArtifact(catalog.approvalLedger.source);
if (JSON.stringify(catalog.identity) !== JSON.stringify(ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1_IDENTITY)) fail('current Catalog identity drift');
if (JSON.stringify(catalog.approvalLedger.identity) !== JSON.stringify(ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1_IDENTITY)) fail('approval ledger identity drift');
if (
  catalog.boundary?.selectedAssetCount !== 3
  || catalog.boundary?.catalogAssetCount !== 130
  || catalog.boundary?.diagnosticEvidenceOnly !== true
  || catalog.boundary?.grantsProductionApproval !== false
  || catalog.boundary?.programmaticNormalPathAllowed !== false
) fail('Catalog diagnostic/approval boundary drift');
if (catalog.selectedAssets?.length !== SELECTED_ASSET_IDS.length) fail('selected Catalog asset count drift');
for (let index = 0; index < SELECTED_ASSET_IDS.length; index += 1) {
  const assetId = SELECTED_ASSET_IDS[index]!;
  const selected = requirePresent(catalog.selectedAssets[index], `selected Catalog asset missing: ${assetId}`);
  const records = ARENA_V2_FORMAL_VISUAL_ASSET_RECORDS_CANDIDATE_V1.filter((item) => item.runtimeDefinition.id === assetId);
  const approvals = ARENA_V2_A3_A6_PRODUCTION_APPROVAL_EVIDENCE_LEDGER_CANDIDATE_V1.entries.filter((item) => item.assetId === assetId);
  if (records.length !== 1 || approvals.length !== 1 || selected.assetId !== assetId) fail(`selected Catalog asset identity/uniqueness drift: ${assetId}`);
  const record = requirePresent(records[0], `selected Catalog record missing after uniqueness check: ${assetId}`);
  const approval = requirePresent(approvals[0], `selected Catalog approval missing after uniqueness check: ${assetId}`);
  if (
    selected.role !== record.role
    || selected.maturity !== 'verified-intake-only'
    || JSON.stringify(selected.artifact) !== JSON.stringify({ path: record.artifactPath, byteLength: record.byteLength, sha256: record.sha256 })
    || JSON.stringify(selected.runtimeDefinition) !== JSON.stringify(record.runtimeDefinition)
    || JSON.stringify(selected.provenance) !== JSON.stringify(record.provenance)
    || selected.sourceApprovalRecorded !== approval.sourceApprovalRecorded
    || selected.productionApprovalStatus !== 'missing-not-approved'
    || selected.assetUsePermitted !== false
    || selected.formalReady !== false
  ) fail(`selected Catalog asset identity/approval drift: ${assetId}`);
  verifyArtifact(selected.artifact);
}
if (render.camera?.background !== '#808080' || render.camera?.silhouette !== '#000000') fail('binary palette contract');
if (render.pose?.sourceClipByEquipment?.unarmed !== 'Idle' || render.pose?.sourceClipByEquipment?.shield !== 'Blocking' || render.pose?.deterministic !== true) fail('formal deterministic clip');
if (render.inputs?.length !== 2 || new Set(render.inputs.map((x: Json) => x.skeletonHash)).size !== 1) fail('formal character/skeleton identity');
if (render.inputs.some((x: Json) => x.clips?.length !== 2 || x.clips[0]?.clipName !== 'Idle' || x.clips[1]?.clipName !== 'Blocking' || x.clips.some((clip: Json) => !clip.clipHash) || !x.glb?.sha256)) fail('clip or glb identity');
if (render.shield?.attachmentSlot !== 'handslot.l' || JSON.stringify(render.shield.localPosition) !== '[0,0,0]' || JSON.stringify(render.shield.localRotation) !== '[0,0,0]' || render.shield.localScale !== 1) fail('shield runtime attachment');
const serialized = JSON.stringify(render).toLowerCase();
if (render.fallbackUsedPath !== undefined || render.programmaticUsedPath !== undefined || serialized.includes('future-character.glb')) fail('fallback/future asset forbidden');
for (const input of render.inputs) verifyArtifact(input.glb);
verifyArtifact(render.shield.glb);
if (
  render.inputs[0]?.assetId !== SELECTED_ASSET_IDS[0]
  || render.inputs[0]?.glb?.path !== catalog.selectedAssets[0].artifact.path
  || render.inputs[1]?.assetId !== SELECTED_ASSET_IDS[1]
  || render.inputs[1]?.glb?.path !== catalog.selectedAssets[1].artifact.path
  || render.shield?.assetId !== SELECTED_ASSET_IDS[2]
  || render.shield?.glb?.path !== catalog.selectedAssets[2].artifact.path
) fail('render inputs are not closed to selected Catalog assets');
const combos = new Set<string>(); let inFrame = 0;
for (const output of render.outputs as Json[]) {
  const combo = [output.characterId, output.equipmentState, output.direction, output.distanceMeters, output.viewport?.id].join('|');
  if (combos.has(combo)) fail(`duplicate output: ${combo}`); combos.add(combo);
  verifyArtifact(output.artifact, true); verifyArtifact(output.thumbnail, true);
  const image = sharp(safe(output.artifact.path)); const metadata = await image.metadata();
  if (metadata.width !== output.artifact.width || metadata.height !== output.artifact.height || metadata.hasAlpha || metadata.channels !== 3) fail(`png dimensions/alpha/channels: ${output.artifact.path}`);
  const { data } = await image.raw().toBuffer({ resolveWithObject: true });
  let black = 0;
  for (let offset = 0; offset < data.length; offset += 3) {
    const value = data[offset];
    if (value !== data[offset + 1] || value !== data[offset + 2] || (value !== 0 && value !== 128)) fail(`non-binary pixel: ${output.artifact.path}`);
    if (value === 0) black += 1;
  }
  if (black !== output.blackPixelCount || Math.abs(black / (metadata.width! * metadata.height!) - output.coverageRatio) > 1e-12 || (black > 0) !== output.inFrame) fail(`pixel metrics: ${output.artifact.path}`);
  if (output.inFrame) inFrame += 1;
}
if (combos.size !== 144) fail('missing direction/distance/viewport/state combination');
for (const character of ['parkour-apprentice', 'wind-up-cube']) for (const equipment of ['unarmed', 'shield']) for (const direction of ['front', 'front-right', 'back-right', 'back', 'back-left', 'front-left']) for (const distance of [0, 5, 12]) for (const viewport of ['390x844@2x', '1280x720@1x']) if (!combos.has([character, equipment, direction, distance, viewport].join('|'))) fail('coverage hole');

if (blind.status !== 'awaiting-human-responses' || blind.formCount !== 10 || blind.questionsPerForm !== 24) fail('blind package protocol');
if (blind.generator?.path !== 'scripts/art/generate-arena-silhouette-blind-test.ts') fail('blind generator path drift');
verifyArtifact(blind.generator);
verifyArtifact(blind.questions); verifyArtifact(blind.answerKey); verifyArtifact(blind.proxyBaseline);
if (blind.renderManifest.sha256 !== hash(blind.renderManifest.path)) fail('blind render hash drift');
if (blind.questionImages?.length !== 144) fail('opaque image count');
for (const image of blind.questionImages) { verifyArtifact(image, true); if (!/^q\d{4}$/.test(image.questionId) || !/\/q\d{4}\.png$/.test(image.path)) fail('answer leakage in opaque image'); }
const questions = read(blind.questions.path); const questionText = JSON.stringify(questions);
if (questions.answersIncluded !== false || /sourceOutputId|correctAnswer|asset\.character|parkour-apprentice|wind-up-cube/i.test(questionText)) fail('answer leak in participant package');
if (questions.forms?.length !== 10 || questions.forms.some((form: Json) => form.questions?.length !== 24)) fail('form coverage');
if (blind.humanEvidence?.participantCount !== 0 || blind.humanEvidence?.minimum !== 10 || blind.humanEvidence?.rawResponses?.length !== 0 || blind.humanEvidence?.status !== 'missing-blocking') fail('human evidence must fail closed');
if (blind.thresholds?.character !== 0.9 || blind.thresholds?.equipment !== 0.9 || blind.thresholds?.direction !== 0.9) fail('recognition threshold drift');
const proxy = read(blind.proxyBaseline.path); const aggregate = proxy.aggregate;
if (proxy.sourceCommit !== sourceFreeze.sourceCommit || proxy.sourceFreezeFingerprint !== sourceFreeze.cleanCheckFingerprint) fail('proxy source-freeze identity drift');
if (aggregate?.characterAccuracy < 0.9 || aggregate?.equipmentAccuracy < 0.9 || aggregate?.directionAccuracy < 0.9) fail('internal proxy threshold');
if (!aggregate?.confusion?.character || !aggregate?.confusion?.equipment || !aggregate?.confusion?.direction || Object.keys(aggregate?.byDistance ?? {}).sort().join(',') !== '0,12,5') fail('proxy confusion/distance evidence');
if (Object.values(aggregate.byDistance).some((item: Json) => item.characterAccuracy < 0.9 || item.equipmentAccuracy < 0.9 || item.directionAccuracy < 0.9)) fail('proxy distance-stratified threshold');

if (gate.status !== 'tooling-review-candidate-human-blocked' || gate.hardGatePassed !== false || gate.boundaries?.a0_3 !== 'incomplete' || gate.boundaries?.blockout !== 'forbidden') fail('gate/downstream state');
if (inFrame !== 144 || gate.facts?.inFrameOutputs !== inFrame || gate.facts?.humanParticipants !== 0 || gate.score?.passed !== false || gate.score?.total >= 90 || gate.blockers?.length !== 1) fail('gate facts/score');
for (const input of Object.values(gate.inputs) as Json[]) verifyArtifact(input);
process.stdout.write(`${JSON.stringify({ status: gate.status, outputs: combos.size, inFrame, forms: 10, humanParticipants: 0, score: gate.score.total, hardGatePassed: false })}\n`);
