import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const ROOT = resolve(process.env.ARENA_A022_CHECK_ROOT ?? resolve(import.meta.dirname, '../..'));
const BOARD_DIR = 'docs/quality/art/reference-boards';
const LEDGER_PATH = `${BOARD_DIR}/arena-a0.2.2-reference-board-ledger-v1.json`;
const SOURCE_PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json';
const SUPPLEMENTAL_PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-supplemental-weapon-feedback-v1.json';
const BOARD_IDS = ['character', 'weapon', 'map-composition', 'combat-feedback', 'ui', 'color-material'] as const;
const DECISION_SLOTS = ['USE01', 'USE02', 'USE03', 'USE04', 'USE05', 'USE06', 'USE07', 'AVOID01', 'AVOID02', 'TEST01'];
const ALLOWED_STATUSES = new Set(['board-ready']);

type Artifact = Readonly<{
  path: string;
  sha256: string;
  byteLength: number;
  width: number;
  height: number;
  colorSpace?: string;
  transparent?: boolean;
}>;

type SourceEntry = Readonly<{
  entryId: string;
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
  rights: Readonly<{ commercialUseAllowed: boolean; modificationAllowed: boolean; redistributionAllowed: boolean }>;
  embeddingMode: 'embedded' | 'link-only';
  artifact: Artifact | null;
  specificTakeaway: string;
  doNotCopy: string;
  usageBoundary: string;
  sourceArtifact?: Artifact;
  domain?: 'weapon-direct' | 'combat-feedback-direct';
  creationMethod?: string;
  compositionSignature?: string;
  perceptualHash?: string;
  coverageTags?: readonly string[];
  eventMappings?: readonly string[];
  cleanRoomBoundary?: string;
}>;

type SourcePack = Readonly<{
  id: string;
  status: string;
  boards: ReadonlyArray<Readonly<{ entries: readonly SourceEntry[] }>>;
}>;

type SupplementalPack = Readonly<{
  id: string;
  status: string;
  entries: readonly SourceEntry[];
}>;

type Crop = Readonly<{
  mode: string;
  sourceRect: Readonly<{ x: number; y: number; width: number; height: number }>;
  displayRect: Readonly<{ x: number; y: number; width: number; height: number }>;
  croppedPixels: number;
  approval: Readonly<{ status: string; reviewer: string; signedAt: string; rationale: string }>;
}>;

type BoardEntry = SourceEntry & Readonly<{
  decisionSlot: string;
  decisionClass: 'adopt' | 'avoid' | 'experiment';
  tileIndex: number;
  crop: Crop | null;
  decisionReason: string;
  arenaConstraint: string;
  reviewStatus: string;
}>;

type BoardManifest = Readonly<{
  schemaVersion: number;
  id: string;
  status: string;
  category: string;
  artBibleRevision: string;
  sourcePack: Readonly<{ path: string; id: string; sha256: string; status: string }>;
  supplementalPack: Readonly<{ path: string; id: string; sha256: string; status: string }>;
  generatedAt: string;
  weights: Readonly<{ adopt: number; avoid: number; experiment: number }>;
  layout: Readonly<{
    canvas: Readonly<{ width: number; height: number; colorSpace: string; transparent: boolean }>;
    grid: Readonly<Record<string, number>>;
    order: readonly string[];
  }>;
  purpose: string;
  sourceArtifact: Artifact;
  reviewArtifact: Artifact;
  tenPercentReview: Artifact & Readonly<{ scale: number; readabilityScope: readonly string[]; fullAnnotationReadability: string; status: string }>;
  mobileEquivalentReview: Artifact & Readonly<{
    cssViewport: Readonly<{ width: number; height: number; devicePixelRatio: number }>;
    capture: string;
    entryCount: number;
    annotationReadability: string;
    status: string;
  }>;
  entries: readonly BoardEntry[];
  keyTakeaways: readonly string[];
  antiReferences: readonly string[];
  selfReview: Readonly<{ status: string; evidenceScope: string; score: number; maximum: number; dimensions: Readonly<Record<string, number>>; risk: string; hardGatePassed: boolean; hardGateReason: string }>;
  signOff: Readonly<{ status: string; artDirector: Readonly<{ name: string; signedAt: string }>; coordinator: Readonly<{ name: string | null; signedAt: string | null }> }>;
  failClosed: Readonly<Record<string, boolean>>;
}>;

type LedgerBoard = Readonly<{
  id: string;
  manifest: Readonly<{ path: string; sha256: string; byteLength: number }>;
  svg: Artifact;
  png: Artifact;
  tenPercent: Artifact;
  mobile: Artifact;
}>;

type Ledger = Readonly<{
  schemaVersion: number;
  id: string;
  status: string;
  baselineCommit: string;
  generator: Readonly<{ path: string; sha256: string }>;
  sourcePack: Readonly<{ path: string; id: string; sha256: string; status: string }>;
  supplementalPack: Readonly<{ path: string; id: string; sha256: string; status: string }>;
  boardCount: number;
  sourceEntryCount: number;
  originalApprovedSourceUseCount: number;
  supplementalDirectSourceUseCount: number;
  uniqueSourceUse: boolean;
  decisionTotals: Readonly<{ adopt: number; avoid: number; experiment: number }>;
  boards: readonly LedgerBoard[];
  a0_2_2GateScore: Readonly<{ total: number; maximum: number; dimensions: Readonly<Record<string, Readonly<{ score: number; maximum: number }>>>; hardGatePassed: boolean; gateReason: string }>;
  statusBoundary: Readonly<Record<string, string>>;
}>;

function fail(message: string): never {
  throw new Error(`A0.2.2 reference-board gate failed: ${message}`);
}

function assertText(value: unknown, label: string, minimum = 1): asserts value is string {
  if (typeof value !== 'string' || value.trim().length < minimum) fail(`${label} must contain at least ${minimum} characters`);
  if (/\b(?:TBD|TODO|UNKNOWN)\b/i.test(value)) fail(`${label} contains a placeholder`);
}

function repositoryFile(locator: string, label: string): string {
  if (isAbsolute(locator)) fail(`${label} must be repository-relative`);
  const absolute = resolve(ROOT, locator);
  const lexicalRelative = relative(ROOT, absolute);
  if (lexicalRelative.startsWith('..') || isAbsolute(lexicalRelative)) fail(`${label} escapes repository lexically`);
  let actual: string;
  try { actual = realpathSync(absolute); } catch { fail(`${label} does not exist: ${locator}`); }
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) fail(`${label} escapes repository through a symbolic link`);
  if (!lstatSync(absolute).isFile()) fail(`${label} must resolve to a file`);
  return absolute;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Buffer, label: string): Readonly<{ width: number; height: number; colorType: number }> {
  if (bytes.length < 24 || bytes.subarray(1, 4).toString('ascii') !== 'PNG') fail(`${label} must be PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25]! };
}

function verifyArtifact(artifact: Artifact, label: string, expectedWidth: number, expectedHeight: number, extension: '.png' | '.svg'): Buffer {
  assertText(artifact.path, `${label}.path`);
  if (!artifact.path.startsWith(`${BOARD_DIR}/`) || !artifact.path.endsWith(extension)) fail(`${label}.path must stay in ${BOARD_DIR} and end in ${extension}`);
  if (!/^[0-9a-f]{64}$/.test(artifact.sha256)) fail(`${label}.sha256 is invalid`);
  if (!Number.isInteger(artifact.byteLength) || artifact.byteLength <= 0) fail(`${label}.byteLength is invalid`);
  if (artifact.width !== expectedWidth || artifact.height !== expectedHeight) fail(`${label} declared dimensions must be ${expectedWidth}x${expectedHeight}`);
  const absolute = repositoryFile(artifact.path, `${label}.path`);
  const bytes = readFileSync(absolute);
  if (statSync(absolute).size !== artifact.byteLength) fail(`${label} byteLength drift`);
  if (sha256(bytes) !== artifact.sha256) fail(`${label} SHA-256 drift`);
  if (extension === '.png') {
    const dimensions = pngDimensions(bytes, label);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) fail(`${label} physical dimensions drift`);
    if (dimensions.colorType !== 2) fail(`${label} must be opaque RGB PNG without an alpha or palette transparency channel`);
  } else {
    const svg = bytes.toString('utf8');
    if (!svg.includes('width="2560" height="1440"') || !svg.includes('viewBox="0 0 2560 1440"')) fail(`${label} SVG dimensions are invalid`);
    if (!svg.includes('<rect width="2560" height="1440" fill="#172033"')) fail(`${label} must declare an opaque full-canvas background`);
  }
  return bytes;
}

function sourceIdentity(entry: SourceEntry): string {
  return JSON.stringify({
    entryId: entry.entryId,
    sourceKind: entry.sourceKind,
    title: entry.title,
    creator: entry.creator,
    rightsHolder: entry.rightsHolder,
    sourceLocator: entry.sourceLocator,
    sourceRevision: entry.sourceRevision,
    retrievedAt: entry.retrievedAt,
    licenseId: entry.licenseId,
    licenseLocator: entry.licenseLocator,
    proofLocator: entry.proofLocator,
    rights: entry.rights,
    embeddingMode: entry.embeddingMode,
    artifact: entry.artifact,
    specificTakeaway: entry.specificTakeaway,
    doNotCopy: entry.doNotCopy,
    usageBoundary: entry.usageBoundary,
    sourceArtifact: entry.sourceArtifact,
    domain: entry.domain,
    creationMethod: entry.creationMethod,
    compositionSignature: entry.compositionSignature,
    perceptualHash: entry.perceptualHash,
    coverageTags: entry.coverageTags,
    eventMappings: entry.eventMappings,
    cleanRoomBoundary: entry.cleanRoomBoundary,
  });
}

function verifySourceArtifact(entry: BoardEntry): void {
  if (entry.embeddingMode === 'link-only') {
    if (entry.artifact !== null || entry.crop !== null) fail(`${entry.entryId} link-only source must not cache or crop an image`);
    return;
  }
  if (!entry.artifact || !entry.crop) fail(`${entry.entryId} embedded source needs artifact and crop evidence`);
  const sourcePath = repositoryFile(entry.artifact.path, `${entry.entryId}.artifact.path`);
  const bytes = readFileSync(sourcePath);
  if (bytes.length !== entry.artifact.byteLength || sha256(bytes) !== entry.artifact.sha256) fail(`${entry.entryId} source artifact drift`);
  if (!entry.rights.commercialUseAllowed || !entry.rights.modificationAllowed || !entry.rights.redistributionAllowed) fail(`${entry.entryId} lacks embedding rights`);
  if (entry.crop.mode !== 'contain' || entry.crop.croppedPixels !== 0 || entry.crop.approval.status !== 'approved-no-crop') fail(`${entry.entryId} crop evidence is not fail-closed`);
  if (entry.crop.sourceRect.x !== 0 || entry.crop.sourceRect.y !== 0 || entry.crop.sourceRect.width !== entry.artifact.width || entry.crop.sourceRect.height !== entry.artifact.height) fail(`${entry.entryId} crop sourceRect must preserve the full approved source`);
  if (entry.crop.displayRect.width <= 0 || entry.crop.displayRect.height <= 0 || entry.crop.displayRect.width > 480 || entry.crop.displayRect.height > 320) fail(`${entry.entryId} displayRect escapes the visual cell`);
  assertText(entry.crop.approval.reviewer, `${entry.entryId}.crop.reviewer`);
  assertText(entry.crop.approval.signedAt, `${entry.entryId}.crop.signedAt`);
  assertText(entry.crop.approval.rationale, `${entry.entryId}.crop.rationale`, 12);
  if (entry.domain) {
    if (!entry.sourceArtifact) fail(`${entry.entryId} direct visual needs an SVG source artifact`);
    const svgBytes = readFileSync(repositoryFile(entry.sourceArtifact.path, `${entry.entryId}.sourceArtifact.path`));
    if (svgBytes.length !== entry.sourceArtifact.byteLength || sha256(svgBytes) !== entry.sourceArtifact.sha256) fail(`${entry.entryId} SVG source artifact drift`);
    if (!entry.sourceArtifact.path.startsWith('docs/quality/art/reference-sources/original/a0.2.1-supplemental-weapon-feedback/') || !entry.sourceArtifact.path.endsWith('.svg')) fail(`${entry.entryId} SVG source is outside the supplemental directory`);
    const svg = svgBytes.toString('utf8');
    if (/<image\b/i.test(svg) || !svg.includes('CLEAN-ROOM PROJECT ORIGINAL')) fail(`${entry.entryId} SVG source is not clean-room primitive-only`);
    assertText(entry.creationMethod, `${entry.entryId}.creationMethod`, 20);
    assertText(entry.compositionSignature, `${entry.entryId}.compositionSignature`, 8);
    assertText(entry.cleanRoomBoundary, `${entry.entryId}.cleanRoomBoundary`, 20);
    if (!entry.perceptualHash || !/^[01]{144}$/.test(entry.perceptualHash)) fail(`${entry.entryId} perceptualHash is invalid`);
    if (!entry.coverageTags || entry.coverageTags.length < 2 || !entry.eventMappings || entry.eventMappings.length < 1) fail(`${entry.entryId} direct-domain evidence is incomplete`);
  }
}

const sourcePackAbsolute = repositoryFile(SOURCE_PACK_PATH, 'source pack');
const sourcePackBytes = readFileSync(sourcePackAbsolute);
const sourcePack = JSON.parse(sourcePackBytes.toString('utf8')) as SourcePack;
if (sourcePack.status !== 'source-ready') fail('A0.2.1 source pack must remain source-ready');
const approvedSources = new Map<string, SourceEntry>();
for (const board of sourcePack.boards) for (const entry of board.entries) approvedSources.set(entry.entryId, entry);
if (approvedSources.size !== 60) fail('approved source pack must expose exactly 60 unique entries');
const supplementalPackBytes = readFileSync(repositoryFile(SUPPLEMENTAL_PACK_PATH, 'supplemental source pack'));
const supplementalPack = JSON.parse(supplementalPackBytes.toString('utf8')) as SupplementalPack;
if (supplementalPack.status !== 'supplemental-source-ready' || supplementalPack.entries.length !== 16) fail('supplemental pack must contain 16 source-ready direct visuals');
for (const entry of supplementalPack.entries) {
  if (approvedSources.has(entry.entryId)) fail(`supplemental source collides with original source ${entry.entryId}`);
  approvedSources.set(entry.entryId, entry);
}

const ledgerAbsolute = repositoryFile(LEDGER_PATH, 'ledger');
const ledger = JSON.parse(readFileSync(ledgerAbsolute, 'utf8')) as Ledger;
if (ledger.schemaVersion !== 1 || ledger.id !== 'arena.art.reference-boards.a0.2.2.v1') fail('ledger identity is invalid');
if (!ALLOWED_STATUSES.has(ledger.status)) fail('ledger status must be board-ready');
if (!/^[0-9a-f]{40}$/.test(ledger.baselineCommit)) fail('baselineCommit must be a full hash');
if (ledger.boardCount !== 6 || ledger.sourceEntryCount !== 60 || ledger.boards.length !== 6 || !ledger.uniqueSourceUse) fail('ledger totals are invalid');
if (ledger.originalApprovedSourceUseCount !== 44 || ledger.supplementalDirectSourceUseCount !== 16) fail('ledger original/supplemental source-use totals must be 44/16');
if (ledger.decisionTotals.adopt !== 42 || ledger.decisionTotals.avoid !== 12 || ledger.decisionTotals.experiment !== 6) fail('ledger decision totals must be 42/12/6');
if (ledger.sourcePack.path !== SOURCE_PACK_PATH || ledger.sourcePack.id !== sourcePack.id || ledger.sourcePack.status !== 'source-ready' || ledger.sourcePack.sha256 !== sha256(sourcePackBytes)) fail('ledger source-pack identity drift');
if (ledger.supplementalPack.path !== SUPPLEMENTAL_PACK_PATH || ledger.supplementalPack.id !== supplementalPack.id || ledger.supplementalPack.status !== 'supplemental-source-ready' || ledger.supplementalPack.sha256 !== sha256(supplementalPackBytes)) fail('ledger supplemental-pack identity drift');
const generatorBytes = readFileSync(repositoryFile(ledger.generator.path, 'generator.path'));
if (sha256(generatorBytes) !== ledger.generator.sha256) fail('generator SHA-256 drift; regenerate boards after changing the generator');

const usedSources = new Set<string>();
const decisionTotals = { adopt: 0, avoid: 0, experiment: 0 };
for (const boardId of BOARD_IDS) {
  const ledgerBoard = ledger.boards.find((candidate) => candidate.id === boardId);
  if (!ledgerBoard) fail(`missing ledger board ${boardId}`);
  const manifestAbsolute = repositoryFile(ledgerBoard.manifest.path, `${boardId}.manifest.path`);
  const manifestBytes = readFileSync(manifestAbsolute);
  if (manifestBytes.length !== ledgerBoard.manifest.byteLength || sha256(manifestBytes) !== ledgerBoard.manifest.sha256) fail(`${boardId} manifest identity drift`);
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as BoardManifest;
  if (manifest.schemaVersion !== 1 || manifest.category !== boardId || manifest.id !== `arena.art.reference-board.${boardId}.a0.2.2.v1`) fail(`${boardId} manifest identity is invalid`);
  if (!ALLOWED_STATUSES.has(manifest.status) || manifest.status !== ledger.status) fail(`${boardId} status must match ledger`);
  assertText(manifest.artBibleRevision, `${boardId}.artBibleRevision`);
  assertText(manifest.purpose, `${boardId}.purpose`, 20);
  if (manifest.sourcePack.path !== SOURCE_PACK_PATH || manifest.sourcePack.id !== sourcePack.id || manifest.sourcePack.sha256 !== sha256(sourcePackBytes) || manifest.sourcePack.status !== 'source-ready') fail(`${boardId} source-pack identity drift`);
  if (manifest.supplementalPack.path !== SUPPLEMENTAL_PACK_PATH || manifest.supplementalPack.id !== supplementalPack.id || manifest.supplementalPack.sha256 !== sha256(supplementalPackBytes) || manifest.supplementalPack.status !== 'supplemental-source-ready') fail(`${boardId} supplemental-pack identity drift`);
  if (manifest.weights.adopt !== 70 || manifest.weights.avoid !== 20 || manifest.weights.experiment !== 10) fail(`${boardId} weights must be 70/20/10`);
  if (manifest.layout.canvas.width !== 2560 || manifest.layout.canvas.height !== 1440 || manifest.layout.canvas.colorSpace !== 'srgb' || manifest.layout.canvas.transparent) fail(`${boardId} canvas contract is invalid`);
  if (manifest.layout.grid.columns !== 5 || manifest.layout.grid.rows !== 2 || manifest.layout.grid.tileWidth !== 480 || manifest.layout.grid.tileHeight !== 480 || manifest.layout.grid.visualHeight !== 320 || manifest.layout.grid.annotationHeight !== 160) fail(`${boardId} grid contract is invalid`);
  if (manifest.layout.order.join('|') !== DECISION_SLOTS.join('|')) fail(`${boardId} slot order is invalid`);

  const svgBytes = verifyArtifact(manifest.sourceArtifact, `${boardId}.svg`, 2560, 1440, '.svg');
  verifyArtifact(manifest.reviewArtifact, `${boardId}.png`, 2560, 1440, '.png');
  verifyArtifact(manifest.tenPercentReview, `${boardId}.10pct`, 256, 144, '.png');
  verifyArtifact(manifest.mobileEquivalentReview, `${boardId}.mobile`, 780, 6420, '.png');
  if (JSON.stringify(ledgerBoard.svg) !== JSON.stringify(manifest.sourceArtifact)
    || JSON.stringify(ledgerBoard.png) !== JSON.stringify(manifest.reviewArtifact)
    || JSON.stringify(ledgerBoard.tenPercent) !== JSON.stringify(manifest.tenPercentReview)
    || JSON.stringify(ledgerBoard.mobile) !== JSON.stringify(manifest.mobileEquivalentReview)) fail(`${boardId} ledger artifact record drift`);

  if (manifest.tenPercentReview.scale !== 0.1 || manifest.tenPercentReview.status !== 'overview-readable' || manifest.tenPercentReview.fullAnnotationReadability !== 'mobile-equivalent-required' || manifest.tenPercentReview.readabilityScope.length < 4) fail(`${boardId} 10% review evidence is incomplete`);
  const mobile = manifest.mobileEquivalentReview;
  if (mobile.cssViewport.width !== 390 || mobile.cssViewport.height !== 844 || mobile.cssViewport.devicePixelRatio !== 2 || mobile.capture !== 'full-page-scroll-equivalent' || mobile.entryCount !== 10 || mobile.annotationReadability !== 'full' || !ALLOWED_STATUSES.has(mobile.status)) fail(`${boardId} mobile-equivalent evidence is incomplete`);

  if (manifest.entries.length !== 10) fail(`${boardId} must contain exactly ten entries`);
  const classes = {
    adopt: manifest.entries.filter((entry) => entry.decisionClass === 'adopt'),
    avoid: manifest.entries.filter((entry) => entry.decisionClass === 'avoid'),
    experiment: manifest.entries.filter((entry) => entry.decisionClass === 'experiment'),
  };
  if (classes.adopt.length !== 7 || classes.avoid.length !== 2 || classes.experiment.length !== 1) fail(`${boardId} decision ratio must be 7/2/1`);
  const slots = manifest.entries.map((entry) => entry.decisionSlot);
  if (slots.join('|') !== DECISION_SLOTS.join('|')) fail(`${boardId} decision slots are invalid`);
  const embedded = manifest.entries.filter((entry) => entry.embeddingMode === 'embedded').length;
  if (embedded < 6 || manifest.entries.length - embedded > 4) fail(`${boardId} needs at least six embedded and at most four link-only entries`);
  const expectedDomain = boardId === 'weapon' ? 'weapon-direct' : boardId === 'combat-feedback' ? 'combat-feedback-direct' : null;
  const directEntries = manifest.entries.filter((entry) => entry.domain === expectedDomain);
  if (expectedDomain && directEntries.length < 8) fail(`${boardId} needs at least eight domain-direct supplemental visuals`);
  if (!expectedDomain && manifest.entries.some((entry) => entry.domain !== undefined)) fail(`${boardId} must not consume weapon/feedback supplemental visuals`);
  if (expectedDomain) {
    if (directEntries.some((entry) => entry.sourceKind !== 'project-original' || entry.embeddingMode !== 'embedded')) fail(`${boardId} direct visuals must be embedded project originals`);
    const coverage = new Set(directEntries.flatMap((entry) => entry.coverageTags ?? []));
    const required = boardId === 'weapon'
      ? ['mass-light', 'mass-medium', 'mass-heavy', 'grip-boundary', 'phase-windup', 'phase-hit', 'phase-recovery', 'ground-read', 'air-read', 'knockback-push', 'displacement-pull', 'vertical-launch', 'whiff', 'six-weapon-directions']
      : ['hit-spark', 'hit-direction', 'hitstop', 'knockback-trajectory', 'ledge-risk', 'ringout', 'equipment-pickup', 'equipment-replaced', 'equipment-expired', 'same-screen-hierarchy', 'occlusion-budget', 'reduced-motion'];
    for (const tag of required) if (!coverage.has(tag)) fail(`${boardId} direct visuals miss required coverage ${tag}`);
  }

  const svg = svgBytes.toString('utf8');
  const dataImageCount = [...svg.matchAll(/<image href="data:image\/(?:png|jpeg);base64,/g)].length;
  if (dataImageCount !== embedded) fail(`${boardId} embedded image count does not match manifest`);
  if (/<image href="(?:https?:|\/\/|file:)/i.test(svg)) fail(`${boardId} embeds an external image`);
  if ([...svg.matchAll(/data-entry-id=/g)].length !== 10) fail(`${boardId} SVG must expose ten auditable entry markers`);

  manifest.entries.forEach((entry, index) => {
    if (entry.tileIndex !== index) fail(`${boardId}.${entry.entryId} tile order drift`);
    const approved = approvedSources.get(entry.entryId);
    if (!approved || sourceIdentity(entry) !== sourceIdentity(approved)) fail(`${boardId}.${entry.entryId} is not identical to the approved A0.2.1 source`);
    if (usedSources.has(entry.entryId)) fail(`approved source reused across boards: ${entry.entryId}`);
    usedSources.add(entry.entryId);
    decisionTotals[entry.decisionClass] += 1;
    assertText(entry.decisionReason, `${entry.entryId}.decisionReason`, 12);
    assertText(entry.arenaConstraint, `${entry.entryId}.arenaConstraint`, 12);
    assertText(entry.doNotCopy, `${entry.entryId}.doNotCopy`, 8);
    if (entry.reviewStatus !== 'coordination-approved') fail(`${entry.entryId}.reviewStatus is invalid`);
    if (!svg.includes(`data-entry-id="${entry.entryId}"`) || !svg.includes(`data-decision="${entry.decisionClass}"`)) fail(`${entry.entryId} is missing from SVG audit markers`);
    if (!svg.includes(entry.entryId.toUpperCase())) fail(`${entry.entryId} source number is not visible on the board`);
    verifySourceArtifact(entry);
  });

  manifest.keyTakeaways.forEach((value, index) => assertText(value, `${boardId}.keyTakeaways[${index}]`, 10));
  manifest.antiReferences.forEach((value, index) => assertText(value, `${boardId}.antiReferences[${index}]`, 10));
  if (manifest.keyTakeaways.length !== 3 || manifest.antiReferences.length !== 2) fail(`${boardId} needs three takeaways and two anti-references`);
  if (manifest.selfReview.maximum !== 100 || manifest.selfReview.score !== Object.values(manifest.selfReview.dimensions).reduce((sum, value) => sum + value, 0)) fail(`${boardId} self-review score arithmetic drift`);
  const expectedScope = boardId === 'weapon' || boardId === 'combat-feedback' ? 'direction-contract' : 'actual-reference-board';
  if (manifest.selfReview.evidenceScope !== expectedScope) fail(`${boardId} evidence scope must be ${expectedScope}`);
  if (boardId === 'weapon' && manifest.selfReview.score !== 93) fail('weapon direct-direction board score must be 93 while models remain pending');
  if (boardId === 'combat-feedback' && manifest.selfReview.score !== 94) fail('combat-feedback direct-direction board score must be 94 while runtime VFX remains pending');
  assertText(manifest.selfReview.risk, `${boardId}.risk`, 20);
  if (!manifest.selfReview.hardGatePassed || manifest.selfReview.status !== 'board-ready' || manifest.signOff.status !== 'coordination-approved' || manifest.signOff.coordinator.name !== 'Arena V2 主协调' || manifest.signOff.coordinator.signedAt !== '2026-07-28') fail(`${boardId} coordinator sign-off is invalid`);
  if (!manifest.failClosed.a0_2_2Passed) fail(`${boardId} A0.2.2 board gate must be passed`);
  if (Object.entries(manifest.failClosed).some(([key, value]) => key !== 'a0_2_2Passed' && value)) fail(`${boardId} downstream gates must remain fail closed`);
}

if (usedSources.size !== 60) fail('the six boards must use exactly 60 unique sources');
const supplementalUsed = supplementalPack.entries.filter((entry) => usedSources.has(entry.entryId)).length;
if (supplementalUsed !== 16) fail('the two revised boards must use all 16 supplemental direct visuals');
if (decisionTotals.adopt !== 42 || decisionTotals.avoid !== 12 || decisionTotals.experiment !== 6) fail('recomputed decision totals must be 42/12/6');
const gate = ledger.a0_2_2GateScore;
const score = Object.values(gate.dimensions).reduce((sum, dimension) => sum + dimension.score, 0);
const maximum = Object.values(gate.dimensions).reduce((sum, dimension) => sum + dimension.maximum, 0);
if (score !== gate.total || maximum !== gate.maximum || gate.total !== 94 || gate.maximum !== 100 || !gate.hardGatePassed) fail('A0.2.2 score or approved hard-gate state is invalid');
assertText(gate.gateReason, 'a0_2_2GateScore.gateReason', 20);
const requiredBoundary: Readonly<Record<string, string>> = { a0_2_2: 'board-ready', a0_2: 'incomplete', referenceBoard: 'incomplete', blockout: 'forbidden', a0_3: 'incomplete', device: 'incomplete', human: 'incomplete', final: 'incomplete' };
for (const [key, value] of Object.entries(requiredBoundary)) if (ledger.statusBoundary[key] !== value) fail(`statusBoundary.${key} must remain ${value}`);

process.stdout.write(`${JSON.stringify({ status: ledger.status, boards: BOARD_IDS.length, sources: usedSources.size, supplementalDirect: supplementalUsed, weaponDirect: 8, combatFeedbackDirect: 8, decisions: decisionTotals, score: gate.total, hardGatePassed: gate.hardGatePassed })}\n`);
