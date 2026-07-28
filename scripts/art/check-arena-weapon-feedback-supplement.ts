import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(process.env.ARENA_A022_SUPPLEMENT_CHECK_ROOT ?? resolve(import.meta.dirname, '../..'));
const PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-supplemental-weapon-feedback-v1.json';
const ORIGINAL_PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json';
const DECLARATION_PATH = 'docs/quality/art/reference-sources/original/arena-a0.2.1-supplemental-clean-room-declaration.md';
const DOMAINS = ['weapon-direct', 'combat-feedback-direct'] as const;
const ALLOWED_EVENT_SLOTS = new Set([
  'ActionStarted', 'HitResolved', 'KnockbackApplied', 'PlayerEliminated',
  'EquipmentPickedUp', 'EquipmentReplaced', 'EquipmentRecycled', 'EquipmentExpired',
  'action-snapshot', 'none',
]);
const REQUIRED_COVERAGE = Object.freeze({
  'weapon-direct': ['mass-light', 'mass-medium', 'mass-heavy', 'silhouette', 'grip-boundary', 'phase-windup', 'phase-hit', 'phase-recovery', 'ground-read', 'air-read', 'knockback-push', 'displacement-pull', 'vertical-launch', 'whiff', 'miss-consequence', 'six-weapon-directions'],
  'combat-feedback-direct': ['hit-spark', 'hit-direction', 'hitstop', 'knockback-trajectory', 'ledge-risk', 'ringout', 'equipment-pickup', 'equipment-replaced', 'equipment-expired', 'same-screen-hierarchy', 'occlusion-budget', 'reduced-motion'],
});

type Artifact = Readonly<{ path: string; byteLength: number; sha256: string; width: number; height: number; colorSpace: string; transparent: boolean }>;
type Entry = Readonly<{
  entryId: string; sourceKind: string; title: string; creator: string; rightsHolder: string;
  sourceLocator: string; sourceRevision: string; retrievedAt: string; licenseId: string;
  licenseLocator: string; proofLocator: string;
  rights: Readonly<{ commercialUseAllowed: boolean; modificationAllowed: boolean; redistributionAllowed: boolean }>;
  embeddingMode: string; artifact: Artifact; sourceArtifact: Artifact;
  domain: typeof DOMAINS[number]; creationMethod: string; compositionSignature: string;
  perceptualHash: string; coverageTags: readonly string[]; eventMappings: readonly string[];
  specificTakeaway: string; doNotCopy: string; usageBoundary: string; cleanRoomBoundary: string;
  reviewStatus: string;
}>;
type Pack = Readonly<{
  schemaVersion: number; id: string; status: string; baselineCommit: string;
  originalApprovedPack: Readonly<{ path: string; sha256: string; status: string; immutable: boolean }>;
  declaration: Readonly<{ path: string; sha256: string; byteLength: number }>;
  generator: Readonly<{ path: string; sha256: string }>;
  counts: Readonly<{ total: number; weaponDirect: number; combatFeedbackDirect: number }>;
  rightsConclusion: Readonly<{ projectOriginal: boolean; commercialUseAllowed: boolean; modificationAllowed: boolean; redistributionAllowed: boolean; externalImageInputs: number }>;
  entries: readonly Entry[];
  gate: Readonly<{ score: number; maximum: number; hardGatePassed: boolean; reason: string }>;
  signOff: Readonly<{ status: string; artDirector: Readonly<{ name: string; signedAt: string }>; coordinator: Readonly<{ name: string; signedAt: string }> }>;
}>;

function fail(message: string): never { throw new Error(`A0.2.1 supplemental source gate failed: ${message}`); }
function assertText(value: unknown, label: string, minimum = 1): asserts value is string {
  if (typeof value !== 'string' || value.trim().length < minimum) fail(`${label} must contain at least ${minimum} characters`);
  if (/\b(?:TBD|TODO|UNKNOWN)\b/i.test(value)) fail(`${label} contains a placeholder`);
}
function repositoryFile(locator: string, label: string): string {
  if (isAbsolute(locator)) fail(`${label} must be repository-relative`);
  const absolute = resolve(ROOT, locator);
  const lexical = relative(ROOT, absolute);
  if (lexical.startsWith('..') || isAbsolute(lexical)) fail(`${label} escapes repository lexically`);
  let actual: string;
  try { actual = realpathSync(absolute); } catch { fail(`${label} does not exist: ${locator}`); }
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) fail(`${label} escapes repository through a symbolic link`);
  if (!lstatSync(absolute).isFile()) fail(`${label} must resolve to a file`);
  return absolute;
}
function sha256(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function verifyArtifact(artifact: Artifact, label: string, extension: '.png' | '.svg'): Buffer {
  if (!artifact.path.endsWith(extension)) fail(`${label}.path must end in ${extension}`);
  if (!artifact.path.startsWith('docs/quality/art/reference-sources/original/a0.2.1-supplemental-weapon-feedback/')) fail(`${label}.path is outside the supplemental artifact directory`);
  if (artifact.width !== 1600 || artifact.height !== 900 || artifact.colorSpace !== 'srgb' || artifact.transparent) fail(`${label} must be opaque 1600x900 sRGB`);
  if (!/^[0-9a-f]{64}$/.test(artifact.sha256) || artifact.byteLength <= 0) fail(`${label} identity is invalid`);
  const bytes = readFileSync(repositoryFile(artifact.path, `${label}.path`));
  if (bytes.length !== artifact.byteLength || statSync(resolve(ROOT, artifact.path)).size !== artifact.byteLength || sha256(bytes) !== artifact.sha256) fail(`${label} byte/hash drift`);
  if (extension === '.png') {
    if (bytes.subarray(1, 4).toString('ascii') !== 'PNG' || bytes.readUInt32BE(16) !== 1600 || bytes.readUInt32BE(20) !== 900 || bytes[25] !== 2) fail(`${label} physical PNG must be opaque RGB 1600x900`);
  } else {
    const source = bytes.toString('utf8');
    if (!source.includes('width="1600" height="900"') || !source.includes('viewBox="0 0 1600 900"')) fail(`${label} SVG dimensions are invalid`);
    if (/<image\b/i.test(source)) fail(`${label} SVG must not contain external or embedded image inputs`);
    if (!source.includes('CLEAN-ROOM PROJECT ORIGINAL')) fail(`${label} lacks the clean-room marker`);
  }
  return bytes;
}
async function perceptualHash(path: string): Promise<string> {
  const { data } = await sharp(path).resize(16, 9, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const mean = [...data].reduce((sum, value) => sum + value, 0) / data.length;
  return [...data].map((value) => value >= mean ? '1' : '0').join('');
}
function hamming(left: string, right: string): number {
  if (left.length !== right.length) fail('perceptual hashes have unequal lengths');
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) distance += 1;
  return distance;
}

const packBytes = readFileSync(repositoryFile(PACK_PATH, 'pack'));
const pack = JSON.parse(packBytes.toString('utf8')) as Pack;
if (pack.schemaVersion !== 1 || pack.id !== 'arena.art.reference-source-pack.a0.2.1.supplemental.weapon-feedback.v1') fail('pack identity is invalid');
if (pack.status !== 'supplemental-source-ready') fail('pack must be supplemental-source-ready');
if (!/^[0-9a-f]{40}$/.test(pack.baselineCommit)) fail('baselineCommit must be a full hash');
const originalBytes = readFileSync(repositoryFile(ORIGINAL_PACK_PATH, 'original approved pack'));
const original = JSON.parse(originalBytes.toString('utf8')) as Readonly<{ status: string }>;
if (pack.originalApprovedPack.path !== ORIGINAL_PACK_PATH || pack.originalApprovedPack.sha256 !== sha256(originalBytes) || pack.originalApprovedPack.status !== 'source-ready' || !pack.originalApprovedPack.immutable || original.status !== 'source-ready') fail('original A0.2.1 source-ready identity must remain immutable');
const declarationBytes = readFileSync(repositoryFile(pack.declaration.path, 'declaration.path'));
if (pack.declaration.path !== DECLARATION_PATH || declarationBytes.length !== pack.declaration.byteLength || sha256(declarationBytes) !== pack.declaration.sha256) fail('clean-room declaration drift');
const generatorBytes = readFileSync(repositoryFile(pack.generator.path, 'generator.path'));
if (sha256(generatorBytes) !== pack.generator.sha256) fail('generator drift; regenerate supplemental inputs');
if (pack.entries.length !== 16 || pack.counts.total !== 16 || pack.counts.weaponDirect !== 8 || pack.counts.combatFeedbackDirect !== 8) fail('supplemental counts must be 16 / 8 / 8');
if (!pack.rightsConclusion.projectOriginal || !pack.rightsConclusion.commercialUseAllowed || !pack.rightsConclusion.modificationAllowed || !pack.rightsConclusion.redistributionAllowed || pack.rightsConclusion.externalImageInputs !== 0) fail('rights conclusion is invalid');

const seenIds = new Set<string>();
const seenPngHashes = new Set<string>();
const seenSvgHashes = new Set<string>();
const seenCompositions = new Set<string>();
for (const domain of DOMAINS) {
  const entries = pack.entries.filter((entry) => entry.domain === domain);
  if (entries.length !== 8) fail(`${domain} must contain exactly eight direct visuals`);
  const domainHashes: string[] = [];
  const coverage = new Set(entries.flatMap((entry) => entry.coverageTags));
  for (const required of REQUIRED_COVERAGE[domain]) if (!coverage.has(required)) fail(`${domain} misses required coverage ${required}`);
  for (const entry of entries) {
    for (const [field, value] of Object.entries({ entryId: entry.entryId, title: entry.title, creator: entry.creator, rightsHolder: entry.rightsHolder, sourceRevision: entry.sourceRevision, creationMethod: entry.creationMethod, compositionSignature: entry.compositionSignature, specificTakeaway: entry.specificTakeaway, doNotCopy: entry.doNotCopy, usageBoundary: entry.usageBoundary, cleanRoomBoundary: entry.cleanRoomBoundary, reviewStatus: entry.reviewStatus })) {
      assertText(value, `${entry.entryId}.${field}`, field === 'entryId' ? 3 : field === 'title' ? 6 : 12);
    }
    if (seenIds.has(entry.entryId)) fail(`duplicate entry ${entry.entryId}`);
    seenIds.add(entry.entryId);
    if (entry.sourceKind !== 'project-original' || entry.embeddingMode !== 'embedded' || entry.licenseId !== 'PROJECT-ORIGINAL-INTERNAL' || entry.licenseLocator !== DECLARATION_PATH || entry.proofLocator !== DECLARATION_PATH) fail(`${entry.entryId} provenance classification is invalid`);
    if (!entry.rights.commercialUseAllowed || !entry.rights.modificationAllowed || !entry.rights.redistributionAllowed) fail(`${entry.entryId} rights are incomplete`);
    if (entry.sourceLocator !== entry.sourceArtifact.path) fail(`${entry.entryId} sourceLocator must point to its SVG source`);
    verifyArtifact(entry.sourceArtifact, `${entry.entryId}.sourceArtifact`, '.svg');
    const pngPath = repositoryFile(entry.artifact.path, `${entry.entryId}.artifact.path`);
    verifyArtifact(entry.artifact, `${entry.entryId}.artifact`, '.png');
    if (seenPngHashes.has(entry.artifact.sha256) || seenSvgHashes.has(entry.sourceArtifact.sha256)) fail(`${entry.entryId} duplicates source or rendered bytes`);
    seenPngHashes.add(entry.artifact.sha256); seenSvgHashes.add(entry.sourceArtifact.sha256);
    if (seenCompositions.has(entry.compositionSignature)) fail(`${entry.entryId} duplicates a composition signature`);
    seenCompositions.add(entry.compositionSignature);
    if (!/^[01]{144}$/.test(entry.perceptualHash) || await perceptualHash(pngPath) !== entry.perceptualHash) fail(`${entry.entryId} perceptual hash drift`);
    domainHashes.push(entry.perceptualHash);
    if (entry.coverageTags.length < 2 || new Set(entry.coverageTags).size !== entry.coverageTags.length) fail(`${entry.entryId} coverage tags are invalid`);
    if (entry.eventMappings.length < 1) fail(`${entry.entryId} needs an event mapping or explicit anti-reference slot`);
    for (const mapping of entry.eventMappings) {
      assertText(mapping, `${entry.entryId}.eventMapping`, 6);
      const event = mapping.split(':', 1)[0]!;
      if (!ALLOWED_EVENT_SLOTS.has(event)) fail(`${entry.entryId} uses unknown future event slot ${event}`);
    }
  }
  for (let left = 0; left < domainHashes.length; left += 1) for (let right = left + 1; right < domainHashes.length; right += 1) {
    if (hamming(domainHashes[left]!, domainHashes[right]!) < 16) fail(`${domain} contains visually near-duplicate layouts at ${left}/${right}`);
  }
}
if (pack.gate.score !== 95 || pack.gate.maximum !== 100 || !pack.gate.hardGatePassed) fail('supplemental source-ready score/hard-gate state is invalid');
if (pack.signOff.status !== 'coordination-approved' || pack.signOff.artDirector.signedAt !== '2026-07-28' || pack.signOff.coordinator.name !== 'Arena V2 主协调' || pack.signOff.coordinator.signedAt !== '2026-07-28') fail('supplemental coordinator sign-off is invalid');
assertText(pack.gate.reason, 'gate.reason', 24);
process.stdout.write(`${JSON.stringify({ status: pack.status, entries: pack.entries.length, weaponDirect: 8, combatFeedbackDirect: 8, uniquePng: seenPngHashes.size, uniqueSvg: seenSvgHashes.size, minimumPerceptualDistance: 16, hardGatePassed: pack.gate.hardGatePassed })}\n`);
