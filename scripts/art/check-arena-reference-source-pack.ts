import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PACK_PATH = resolve(
  ROOT,
  'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json',
);
const CONTACT_SHEET_MANIFEST_PATH = resolve(
  ROOT,
  'docs/quality/art/reference-source-inspection/a0.2.1-contact-sheet-manifest-v1.json',
);
const CATEGORIES = ['mood', 'color', 'composition', 'character', 'environment', 'ui'] as const;
const EXPECTED_SLOTS = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'A01', 'A02', 'T01'];
const ALLOWED_PACK_STATUSES = new Set(['source-ready-candidate', 'source-ready']);
const ALLOWED_SOURCE_KINDS = new Set(['open-source', 'project-document', 'project-original', 'public-domain', 'research-link']);
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'www.metmuseum.org',
  'collectionapi.metmuseum.org',
  'store.steampowered.com',
  'steamcommunity.com',
  'kz-rush.com',
  'docs.cs2kz.org',
  'getamped.game.naver.com',
  'apps.apple.com',
  'play.google.com',
  'github.com',
]);

type Artifact = Readonly<{
  path: string;
  byteLength: number;
  sha256: string;
  width: number;
  height: number;
}>;

type Entry = Readonly<{
  entryId: string;
  weightClass: 'baseline' | 'aspiration' | 'tension';
  boardSlot: string;
  sourceKind: string;
  title: string;
  creator: string;
  rightsHolder: string;
  sourceLocator: string;
  sourceRevision: string;
  retrievedAt: string;
  licenseId: string;
  licenseLocator: string;
  proofLocator: string;
  rights: Readonly<{
    commercialUseAllowed: boolean;
    modificationAllowed: boolean;
    redistributionAllowed: boolean;
  }>;
  embeddingMode: 'embedded' | 'link-only';
  artifact: Artifact | null;
  specificTakeaway: string;
  doNotCopy: string;
  usageBoundary: string;
  reviewStatus: string;
}>;

type Board = Readonly<{
  category: string;
  status: string;
  entries: readonly Entry[];
}>;

type Pack = Readonly<{
  schemaVersion: number;
  id: string;
  status: string;
  baselineCommit: string;
  boards: readonly Board[];
}>;

type ContactSheetManifest = Readonly<{
  schemaVersion: number;
  id: string;
  status: string;
  embeddedEntryCount: number;
  a0_2_2BoardPass: boolean;
  sheets: ReadonlyArray<Readonly<{
    category: string;
    status: string;
    entryCount: number;
    entries: ReadonlyArray<Readonly<{ entryId: string; sourceArtifactSha256: string; thumbnailSha256: string }>>;
    artifact: Artifact;
  }>>;
}>;

function fail(message: string): never {
  throw new Error(`A0.2.1 source-pack gate failed: ${message}`);
}

function assertText(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${label} must be non-empty`);
  if (/\b(?:TBD|TODO|UNKNOWN)\b/i.test(value)) fail(`${label} contains a placeholder`);
}

function imageDimensions(bytes: Buffer, path: string): Readonly<{ width: number; height: number }> {
  if (bytes.subarray(1, 4).toString('ascii') === 'PNG') {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if (marker === undefined) break;
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + length + 2 > bytes.length) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      }
      offset += length + 2;
    }
  }
  fail(`${path} is not a supported PNG/JPEG reference input`);
}

function repositoryFile(locator: string, label: string): string {
  if (isAbsolute(locator)) fail(`${label} must be repository-relative`);
  const absolute = resolve(ROOT, locator);
  const lexicalRelative = relative(ROOT, absolute);
  if (lexicalRelative.startsWith('..') || isAbsolute(lexicalRelative)) fail(`${label} escapes repository lexically`);
  let actual: string;
  try {
    actual = realpathSync(absolute);
  } catch {
    fail(`${label} local path does not exist: ${locator}`);
  }
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) fail(`${label} escapes repository through a symbolic link`);
  if (!lstatSync(absolute).isFile()) fail(`${label} must resolve to a file`);
  return absolute;
}

function verifyLocator(locator: string, label: string): void {
  assertText(locator, label);
  if (locator.startsWith('https://')) {
    const host = new URL(locator).hostname;
    if (!ALLOWED_EXTERNAL_HOSTS.has(host)) fail(`${label} uses unapproved host ${host}`);
    return;
  }
  if (locator.includes('://') || locator.startsWith('git:')) fail(`${label} uses unsupported locator scheme`);
  const [path, fragment] = locator.split('#', 2);
  assertText(path, `${label}.path`);
  if (fragment !== undefined) assertText(fragment, `${label}.fragment`);
  repositoryFile(path, label);
}

function verifyArtifact(artifact: Artifact, label: string): void {
  if (!/^[0-9a-f]{64}$/.test(artifact.sha256)) fail(`${label} has invalid SHA-256`);
  if (!Number.isInteger(artifact.byteLength) || artifact.byteLength <= 0) fail(`${label} has invalid byteLength`);
  if (!Number.isInteger(artifact.width) || artifact.width <= 0 || !Number.isInteger(artifact.height) || artifact.height <= 0) {
    fail(`${label} has invalid dimensions`);
  }
  const absolute = repositoryFile(artifact.path, `${label}.path`);
  const bytes = readFileSync(absolute);
  const stat = statSync(absolute);
  if (stat.size !== artifact.byteLength) fail(`${label} byteLength drift`);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== artifact.sha256) fail(`${label} SHA-256 drift`);
  const dimensions = imageDimensions(bytes, artifact.path);
  if (dimensions.width !== artifact.width || dimensions.height !== artifact.height) fail(`${label} dimension drift`);
}

const pack = JSON.parse(readFileSync(PACK_PATH, 'utf8')) as Pack;
if (pack.schemaVersion !== 1) fail('schemaVersion must be 1');
if (pack.id !== 'arena.art.reference-source-pack.a0.2.1.v1') fail('unexpected pack id');
if (!ALLOWED_PACK_STATUSES.has(pack.status)) fail('status must be source-ready-candidate or source-ready');
if (!/^[0-9a-f]{40}$/.test(pack.baselineCommit)) fail('baselineCommit must be a full commit hash');
if (pack.boards.length !== CATEGORIES.length) fail('exactly six boards are required');

const seenEntries = new Set<string>();
const seenArtifacts = new Set<string>();
const seenHashes = new Set<string>();
let embeddedTotal = 0;
let linkOnlyTotal = 0;

for (const category of CATEGORIES) {
  const board = pack.boards.find((candidate) => candidate.category === category);
  if (!board) fail(`missing ${category} board`);
  if (board.status !== pack.status) fail(`${category} status must match pack status ${pack.status}`);
  if (board.entries.length !== 10) fail(`${category} must contain exactly ten entries`);
  const slots = board.entries.map((entry) => entry.boardSlot).sort();
  if (slots.join('|') !== [...EXPECTED_SLOTS].sort().join('|')) fail(`${category} slots must be 7/2/1`);
  const weights = {
    baseline: board.entries.filter((entry) => entry.weightClass === 'baseline').length,
    aspiration: board.entries.filter((entry) => entry.weightClass === 'aspiration').length,
    tension: board.entries.filter((entry) => entry.weightClass === 'tension').length,
  };
  if (weights.baseline !== 7 || weights.aspiration !== 2 || weights.tension !== 1) {
    fail(`${category} weight distribution must be 7/2/1`);
  }
  const embedded = board.entries.filter((entry) => entry.embeddingMode === 'embedded');
  const links = board.entries.filter((entry) => entry.embeddingMode === 'link-only');
  if (embedded.length < 6 || links.length > 4) fail(`${category} must have at least six embedded and at most four link-only entries`);
  if (embedded.filter((entry) => entry.weightClass === 'baseline').length < 4) fail(`${category} needs four embedded baseline entries`);
  if (!embedded.some((entry) => entry.weightClass === 'aspiration')) fail(`${category} needs an embedded aspiration entry`);
  if (!embedded.some((entry) => entry.weightClass === 'tension')) fail(`${category} needs an embedded tension entry`);

  for (const entry of board.entries) {
    for (const [field, value] of Object.entries({
      entryId: entry.entryId,
      sourceKind: entry.sourceKind,
      title: entry.title,
      creator: entry.creator,
      rightsHolder: entry.rightsHolder,
      sourceRevision: entry.sourceRevision,
      retrievedAt: entry.retrievedAt,
      licenseId: entry.licenseId,
      licenseLocator: entry.licenseLocator,
      proofLocator: entry.proofLocator,
      specificTakeaway: entry.specificTakeaway,
      doNotCopy: entry.doNotCopy,
      usageBoundary: entry.usageBoundary,
      reviewStatus: entry.reviewStatus,
    })) assertText(value, `${entry.entryId}.${field}`);
    if (!ALLOWED_SOURCE_KINDS.has(entry.sourceKind)) fail(`${entry.entryId}.sourceKind is unsupported`);
    const expectedReviewStatus = entry.embeddingMode === 'embedded' ? 'source-verified' : 'link-verified';
    if (entry.reviewStatus !== expectedReviewStatus) fail(`${entry.entryId}.reviewStatus must be ${expectedReviewStatus}`);
    verifyLocator(entry.sourceLocator, `${entry.entryId}.sourceLocator`);
    verifyLocator(entry.licenseLocator, `${entry.entryId}.licenseLocator`);
    verifyLocator(entry.proofLocator, `${entry.entryId}.proofLocator`);
    if (seenEntries.has(entry.entryId)) fail(`duplicate entry id ${entry.entryId}`);
    seenEntries.add(entry.entryId);

    if (entry.embeddingMode === 'link-only') {
      linkOnlyTotal += 1;
      if (entry.artifact !== null) fail(`${entry.entryId} link-only entry must not cache an artifact`);
      continue;
    }

    embeddedTotal += 1;
    if (!entry.artifact) fail(`${entry.entryId} embedded entry must have an artifact`);
    if (!entry.rights.commercialUseAllowed || !entry.rights.modificationAllowed || !entry.rights.redistributionAllowed) {
      fail(`${entry.entryId} lacks commercial/modification/redistribution rights`);
    }
    if (seenArtifacts.has(entry.artifact.path)) fail(`duplicate embedded artifact ${entry.artifact.path}`);
    if (seenHashes.has(entry.artifact.sha256)) fail(`duplicate embedded image bytes ${entry.artifact.sha256}`);
    seenArtifacts.add(entry.artifact.path);
    seenHashes.add(entry.artifact.sha256);
    verifyArtifact(entry.artifact, entry.entryId);
  }
}

if (seenEntries.size !== 60 || embeddedTotal !== 36 || linkOnlyTotal !== 24) fail('pack totals are invalid');

const contactSheets = JSON.parse(readFileSync(CONTACT_SHEET_MANIFEST_PATH, 'utf8')) as ContactSheetManifest;
if (contactSheets.schemaVersion !== 1 || contactSheets.id !== 'arena.art.reference-source-inspection.a0.2.1.v1') {
  fail('contact-sheet manifest identity is invalid');
}
if (contactSheets.status !== 'source-quality-inspection-only' || contactSheets.a0_2_2BoardPass !== false) {
  fail('contact sheets must remain source-quality-only and explicitly deny A0.2.2 board pass');
}
if (contactSheets.embeddedEntryCount !== 36 || contactSheets.sheets.length !== 6) fail('contact-sheet totals are invalid');
const contactArtifactPaths = new Set<string>();
for (const category of CATEGORIES) {
  const sheet = contactSheets.sheets.find((candidate) => candidate.category === category);
  if (!sheet) fail(`missing ${category} contact sheet`);
  if (sheet.status !== 'source-quality-inspection-only' || sheet.entryCount !== 6 || sheet.entries.length !== 6) {
    fail(`${category} contact sheet has invalid status or count`);
  }
  const board = pack.boards.find((candidate) => candidate.category === category)!;
  const expected = board.entries
    .filter((entry) => entry.embeddingMode === 'embedded')
    .map((entry) => `${entry.entryId}:${entry.artifact!.sha256}`)
    .sort();
  const actual = sheet.entries.map((entry) => {
    if (!/^[0-9a-f]{64}$/.test(entry.sourceArtifactSha256) || !/^[0-9a-f]{64}$/.test(entry.thumbnailSha256)) {
      fail(`${category} contact sheet contains an invalid source or thumbnail hash`);
    }
    return `${entry.entryId}:${entry.sourceArtifactSha256}`;
  }).sort();
  if (actual.join('|') !== expected.join('|')) fail(`${category} contact sheet entries drifted from the source pack`);
  if (contactArtifactPaths.has(sheet.artifact.path)) fail(`duplicate contact-sheet artifact ${sheet.artifact.path}`);
  contactArtifactPaths.add(sheet.artifact.path);
  verifyArtifact(sheet.artifact, `${category}.contactSheet`);
}
process.stdout.write(`${JSON.stringify({
  status: 'passed',
  packId: pack.id,
  boardCount: pack.boards.length,
  entryCount: seenEntries.size,
  embeddedCount: embeddedTotal,
  linkOnlyCount: linkOnlyTotal,
  uniqueArtifactCount: seenArtifacts.size,
  contactSheetCount: contactArtifactPaths.size,
  contactSheetStatus: contactSheets.status,
})}\n`);
