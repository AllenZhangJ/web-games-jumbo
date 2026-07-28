import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const ROOT = resolve(process.env.ARENA_A02_TOTAL_CHECK_ROOT ?? resolve(import.meta.dirname, '../..'));
const TOTAL_PATH = 'docs/quality/art/reference-boards/arena-a0.2-total-gate-v1.json';
const ORIGINAL_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json';
const SUPPLEMENT_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-supplemental-weapon-feedback-v1.json';
const BOARD_LEDGER_PATH = 'docs/quality/art/reference-boards/arena-a0.2.2-reference-board-ledger-v1.json';
const SLOTS = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'A01', 'A02', 'T01'];
type JsonRecord = Record<string, unknown>;

function fail(message: string): never { throw new Error(`A0.2 total gate failed: ${message}`); }
function object(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as JsonRecord;
}
function array(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((item, index) => object(item, `${label}[${index}]`));
}
function repositoryFile(path: string, label: string): string {
  if (isAbsolute(path)) fail(`${label} must be repository-relative`);
  const absolute = resolve(ROOT, path);
  const lexical = relative(ROOT, absolute);
  if (lexical.startsWith('..') || isAbsolute(lexical)) fail(`${label} escapes repository lexically`);
  let actual: string;
  try { actual = realpathSync(absolute); } catch { fail(`${label} does not exist: ${path}`); }
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) fail(`${label} escapes repository through symlink`);
  if (!lstatSync(absolute).isFile()) fail(`${label} must resolve to a file`);
  return absolute;
}
function bytes(path: string, label: string): Buffer { return readFileSync(repositoryFile(path, label)); }
function sha256(value: Buffer): string { return createHash('sha256').update(value).digest('hex'); }
function readJson(path: string, label: string): JsonRecord { return JSON.parse(bytes(path, label).toString('utf8')) as JsonRecord; }
function verifyIdentity(identityValue: unknown, expectedPath: string, expectedId: string, expectedStatus: string, label: string): JsonRecord {
  const identity = object(identityValue, label);
  if (identity.path !== expectedPath || identity.id !== expectedId || identity.status !== expectedStatus) fail(`${label} identity/status drift`);
  const fileBytes = bytes(expectedPath, `${label}.path`);
  if (identity.sha256 !== sha256(fileBytes) || identity.byteLength !== fileBytes.length || statSync(resolve(ROOT, expectedPath)).size !== fileBytes.length) fail(`${label} hash/byteLength drift`);
  return readJson(expectedPath, label);
}
function verifyArtifact(value: unknown, label: string): void {
  const artifact = object(value, label);
  const path = String(artifact.path);
  const fileBytes = bytes(path, `${label}.path`);
  if (artifact.sha256 !== sha256(fileBytes) || artifact.byteLength !== fileBytes.length) fail(`${label} hash/byteLength drift`);
}
function sourceIdentity(entry: JsonRecord): string {
  const artifact = entry.artifact && typeof entry.artifact === 'object' ? object(entry.artifact, `${entry.entryId}.artifact`) : null;
  return JSON.stringify([entry.entryId, entry.sourceKind, entry.creator, entry.rightsHolder, entry.sourceLocator, entry.sourceRevision, entry.licenseId, entry.licenseLocator, entry.proofLocator, entry.embeddingMode, artifact?.path ?? null, artifact?.sha256 ?? null]);
}

const total = readJson(TOTAL_PATH, 'total ledger');
if (total.id !== 'arena.art.reference-board.total.a0.2.v1' || total.status !== 'ready') fail('total ledger status/id must be ready');
if (!/^[0-9a-f]{40}$/.test(String(total.baselineCommit))) fail('baselineCommit must be a full commit hash');
const dependencies = object(total.dependencies, 'dependencies');
const original = verifyIdentity(dependencies.originalSourcePack, ORIGINAL_PATH, 'arena.art.reference-source-pack.a0.2.1.v1', 'source-ready', 'originalSourcePack');
const supplement = verifyIdentity(dependencies.supplementalSourcePack, SUPPLEMENT_PATH, 'arena.art.reference-source-pack.a0.2.1.supplemental.weapon-feedback.v1', 'supplemental-source-ready', 'supplementalSourcePack');
const boardLedger = verifyIdentity(dependencies.boardLedger, BOARD_LEDGER_PATH, 'arena.art.reference-boards.a0.2.2.v1', 'board-ready', 'boardLedger');

const coordination = object(original.coordinationSignOff, 'original.coordinationSignOff');
if (coordination.status !== 'source-ready' || coordination.signedAt !== '2026-07-28') fail('original source coordinator sign-off is invalid');
const originalEntries = array(original.boards, 'original.boards').flatMap((board) => {
  if (board.status !== 'source-ready') fail('every original source board must be source-ready');
  const entries = array(board.entries, `${board.category}.entries`);
  if (entries.length !== 10 || entries.map((entry) => entry.boardSlot).join('|') !== SLOTS.join('|')) fail(`${board.category} source slots must be 7/2/1`);
  return entries;
});
if (originalEntries.length !== 60 || new Set(originalEntries.map((entry) => entry.entryId)).size !== 60) fail('original source pack must contain 60 unique entries');

for (const entry of [...originalEntries, ...array(supplement.entries, 'supplement.entries')]) {
  const rights = object(entry.rights, `${entry.entryId}.rights`);
  if (entry.embeddingMode === 'embedded') {
    if (!rights.commercialUseAllowed || !rights.modificationAllowed || !rights.redistributionAllowed) fail(`${entry.entryId} embedded rights are incomplete`);
    verifyArtifact(entry.artifact, `${entry.entryId}.artifact`);
  } else if (entry.embeddingMode === 'link-only') {
    if (entry.artifact !== null) fail(`${entry.entryId} link-only entry must not cache an artifact`);
  } else fail(`${entry.entryId} embeddingMode is invalid`);
  for (const field of ['creator', 'rightsHolder', 'sourceLocator', 'sourceRevision', 'licenseId', 'licenseLocator', 'proofLocator']) if (typeof entry[field] !== 'string' || !String(entry[field]).trim()) fail(`${entry.entryId}.${field} is missing`);
}

const supplementGate = object(supplement.gate, 'supplement.gate');
const supplementSignOff = object(supplement.signOff, 'supplement.signOff');
if (supplementGate.score !== 95 || supplementGate.maximum !== 100 || supplementGate.hardGatePassed !== true || supplementSignOff.status !== 'coordination-approved' || object(supplementSignOff.coordinator, 'supplement coordinator').signedAt !== '2026-07-28') fail('supplement source gate/sign-off is invalid');
if (array(supplement.entries, 'supplement.entries').length !== 16) fail('supplement must contain 16 entries');

const boardGate = object(boardLedger.a0_2_2GateScore, 'board gate');
if (boardGate.total !== 94 || boardGate.maximum !== 100 || boardGate.hardGatePassed !== true) fail('A0.2.2 board gate is invalid');
const boardLedgerBoundary = object(boardLedger.statusBoundary, 'board ledger boundary');
for (const [key, value] of Object.entries({ a0_2: 'incomplete', referenceBoard: 'incomplete', blockout: 'forbidden', a0_3: 'incomplete', device: 'incomplete', human: 'incomplete', final: 'incomplete' })) if (boardLedgerBoundary[key] !== value) fail(`A0.2.2 historical boundary ${key} drift`);

const approved = new Map<string, string>();
for (const entry of [...originalEntries, ...array(supplement.entries, 'supplement.entries')]) approved.set(String(entry.entryId), sourceIdentity(entry));
const manifestIdentities = array(dependencies.boardManifests, 'dependencies.boardManifests');
const ledgerBoards = array(boardLedger.boards, 'boardLedger.boards');
if (manifestIdentities.length !== 6 || ledgerBoards.length !== 6) fail('exactly six board manifests are required');
const boardIds: string[] = [];
let embedded = 0; let linkOnly = 0; let signed = 0; let tenPercent = 0; let mobile = 0;
const decisions = { adopt: 0, avoid: 0, experiment: 0 };
for (const ledgerBoard of ledgerBoards) {
  const manifestRecord = object(ledgerBoard.manifest, `${ledgerBoard.id}.manifest`);
  const path = String(manifestRecord.path);
  const identity = manifestIdentities.find((candidate) => candidate.path === path);
  if (!identity) fail(`${ledgerBoard.id} manifest identity missing from total ledger`);
  const manifest = verifyIdentity(identity, path, String(readJson(path, `${ledgerBoard.id} manifest identity`).id), 'board-ready', `${ledgerBoard.id}.manifestIdentity`);
  verifyArtifact(manifest.sourceArtifact, `${ledgerBoard.id}.svg`); verifyArtifact(manifest.reviewArtifact, `${ledgerBoard.id}.png`); verifyArtifact(manifest.tenPercentReview, `${ledgerBoard.id}.tenPercent`); verifyArtifact(manifest.mobileEquivalentReview, `${ledgerBoard.id}.mobile`);
  tenPercent += 1; mobile += 1;
  const entries = array(manifest.entries, `${ledgerBoard.id}.entries`);
  if (entries.length !== 10) fail(`${ledgerBoard.id} must contain ten entries`);
  const local = { adopt: 0, avoid: 0, experiment: 0 };
  for (const entry of entries) {
    const decision = String(entry.decisionClass) as keyof typeof local;
    if (!(decision in local)) fail(`${entry.entryId} decisionClass is invalid`);
    local[decision] += 1; decisions[decision] += 1; boardIds.push(String(entry.entryId));
    if (entry.embeddingMode === 'embedded') embedded += 1; else if (entry.embeddingMode === 'link-only') linkOnly += 1; else fail(`${entry.entryId} board embeddingMode is invalid`);
    if (approved.get(String(entry.entryId)) !== sourceIdentity(entry)) fail(`${entry.entryId} board source identity differs from approved source`);
    for (const field of ['decisionReason', 'arenaConstraint', 'doNotCopy']) if (typeof entry[field] !== 'string' || String(entry[field]).trim().length < 8) fail(`${entry.entryId}.${field} is incomplete`);
  }
  if (local.adopt !== 7 || local.avoid !== 2 || local.experiment !== 1) fail(`${ledgerBoard.id} must remain 7/2/1`);
  const signOff = object(manifest.signOff, `${ledgerBoard.id}.signOff`);
  if (signOff.status !== 'coordination-approved' || object(signOff.coordinator, `${ledgerBoard.id}.coordinator`).signedAt !== '2026-07-28') fail(`${ledgerBoard.id} coordinator sign-off is invalid`);
  signed += 1;
  const failClosed = object(manifest.failClosed, `${ledgerBoard.id}.failClosed`);
  if (failClosed.a0_2_2Passed !== true) fail(`${ledgerBoard.id} A0.2.2 pass is missing`);
  for (const [key, value] of Object.entries(failClosed)) if (key !== 'a0_2_2Passed' && value !== false) fail(`${ledgerBoard.id}.${key} must remain false`);
}
if (boardIds.length !== 60 || new Set(boardIds).size !== 60 || decisions.adopt !== 42 || decisions.avoid !== 12 || decisions.experiment !== 6 || embedded !== 40 || linkOnly !== 20 || signed !== 6) fail('recomputed board totals/sign-offs are invalid');

const sourceAudit = object(total.sourceUseAudit, 'sourceUseAudit');
const originalIds = originalEntries.map((entry) => String(entry.entryId)).sort();
const supplementalIds = array(supplement.entries, 'supplement.entries').map((entry) => String(entry.entryId)).sort();
if (JSON.stringify(sourceAudit.originalIds) !== JSON.stringify(originalIds) || JSON.stringify(sourceAudit.supplementalIds) !== JSON.stringify(supplementalIds) || JSON.stringify(sourceAudit.boardIds) !== JSON.stringify([...boardIds].sort())) fail('source-use ID audit drift');
for (const [key, value] of Object.entries({ originalSourceEntryCount: 60, supplementalSourceEntryCount: 16, boardSourceUseCount: 60, boardOriginalUseCount: 44, boardSupplementalUseCount: 16, uniqueBoardSourceUseCount: 60 })) if (sourceAudit[key] !== value) fail(`sourceUseAudit.${key} drift`);
const boardAudit = object(total.boardAudit, 'boardAudit');
for (const [key, value] of Object.entries({ boardCount: 6, entriesPerBoard: 10, embeddedCount: 40, linkOnlyCount: 20, coordinatorSignedBoardCount: 6, tenPercentEvidenceCount: tenPercent, mobileEvidenceCount: mobile })) if (boardAudit[key] !== value) fail(`boardAudit.${key} drift`);
if (JSON.stringify(boardAudit.decisionTotals) !== JSON.stringify(decisions)) fail('boardAudit.decisionTotals drift');

const score = object(total.score, 'score');
const dimensions = Object.values(object(score.dimensions, 'score.dimensions')).map((value, index) => object(value, `score.dimension[${index}]`));
const recomputedScore = dimensions.reduce((sum, dimension) => sum + Number(dimension.score), 0);
const recomputedMaximum = dimensions.reduce((sum, dimension) => sum + Number(dimension.maximum), 0);
if (score.total !== 96 || score.maximum !== 100 || score.hardGatePassed !== true || recomputedScore !== 96 || recomputedMaximum !== 100) fail('total score arithmetic/hard gate drift');
for (const dimension of dimensions) if (Number(dimension.score) / Number(dimension.maximum) < 0.8) fail('every score dimension must be at least 80%');
const review = object(total.review, 'review');
if (review.status !== 'machine-and-art-director-ready' || review.reviewedAt !== '2026-07-28' || review.coordinatorAggregateSignOff !== null) fail('aggregate review status must remain honest');
const boundary = object(total.statusBoundary, 'statusBoundary');
for (const [key, value] of Object.entries({ a0_2: 'ready', referenceBoard: 'ready', a0_3: 'incomplete', blockout: 'forbidden', lod: 'incomplete', device: 'incomplete', human: 'incomplete', final: 'incomplete' })) if (boundary[key] !== value) fail(`statusBoundary.${key} must be ${value}`);

process.stdout.write(`${JSON.stringify({ status: total.status, score: score.total, hardGatePassed: score.hardGatePassed, originalSources: 60, supplementalSources: 16, boardUses: 60, decisions })}\n`);
