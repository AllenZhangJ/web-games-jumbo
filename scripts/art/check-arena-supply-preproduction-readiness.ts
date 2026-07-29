import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

type JsonRecord = Record<string, unknown>;

const ROOT = resolve(process.env.ARENA_A11_CHECK_ROOT ?? resolve(import.meta.dirname, '../..'));
const LEDGER_PATH = 'docs/quality/art/supply/arena-a1.1-preproduction-readiness-v1.json';
const BASELINE = 'f80307b375eb9f8f5380372e5b002d1eb86a4df7';
const FALSE_GATES = [
  'a1_1CoordinatorSignOff', 'equipmentInputApproved', 'temporaryVfxSourcesApproved', 'temporaryAudioSourcesApproved',
  'capturePlanApproved', 'a0_3Passed', 'a1RepresentativeSpecimenStarted',
  'a1Passed', 'blockoutAllowed', 'productionVfxIntegrated', 'productionAudioIntegrated', 'deviceVerified',
  'humanVerified', 'finalPassed',
] as const;
const ACTIVE_LIFECYCLE_PROJECTION_ARTIFACTS = [
  { path: 'packages/arena-contracts/src/arena-public-supply-projection.ts', byteLength: 29094, sha256: 'b1ad32bc9e3d023af0cfbcbac41c31efee69d291de856e1914e5622dfa5ec7ec' },
  { path: 'packages/arena-contracts/src/match-snapshot.ts', byteLength: 19417, sha256: '89ca74403445cbe8333e68e0e907a914500dce51b3bcf3cbce8ebb928e51fe38' },
  { path: 'packages/arena-equipment/src/equipment-supply-timeline-system.ts', byteLength: 26241, sha256: '57bf117fb918724e77bd3ec0bb2f3dc0727803747b335f6039d13aab29937d0e' },
  { path: 'packages/arena-match/src/match-core.ts', byteLength: 58363, sha256: '208a736b7d95c654bc99592bb0b82a14fa760c117d9afd4d30dbf744b10f7347' },
  { path: 'packages/arena-bot/src/bot-observation.ts', byteLength: 36050, sha256: 'ceaaaf020a2a2168e52aa4356dd32feb88736fbfd894c751fc404b863bc2dac3' },
  { path: 'packages/arena-bot/src/bot-controller.ts', byteLength: 16293, sha256: '75ce2cd9d69822ffe38ffb67f14467b63df7cde49ea0b33b34653a7f7d0fb99d' },
] as const;
const ACTIVE_LIFECYCLE_BINDINGS = [
  'snapshotTick', 'snapshotEventSequence', 'remainingTicks', 'pendingExpiryEquipmentInstanceIds',
  'resyncReadiness', 'pendingAuthorityTick',
] as const;
const EQUIPMENT_IDS = [
  'a11-equipment-shield-round-glb', 'a11-equipment-shield-texture',
  'a11-equipment-a03-shield-silhouette', 'a11-equipment-ui-wireframes',
] as const;
const TEMPORARY_IDS = [
  'a11-vfx-supply-spawn', 'a11-vfx-supply-replace', 'a11-vfx-supply-expire',
  'a11-audio-kenney-base-push', 'a11-audio-kenney-chain-pull',
  'a11-audio-kenney-hammer-smash', 'a11-audio-kenney-shield-charge',
] as const;
const CAPTURE_IDS = ['terminal-30fps', 'gpu-and-frame', 'overdraw', 'memory', 'voice', 'pause-resume', 'destroy-twice'] as const;
const EXPECTED_REPOSITORY_AUDITS = [
  { path: 'governance/formal-assets/arena-stage7-formal-assets-v1.json', byteLength: 6893, sha256: '68a79e95e8920e2b98df8bad3a4b44d22f3dc7f17b53acd5ed8398e426c5b0bf' },
  { path: 'governance/third-party/arena-runtime-assets-v1.json', byteLength: 4580, sha256: '73916959ae685ae7ebea359cb618b6b5edf265a4a8f4b7ebb5e4600943261d76' },
  { path: 'docs/quality/art/silhouette/arena-a0.3-silhouette-render-manifest-v1.json', byteLength: 257391, sha256: '1b85c5442fbb08c3ff7e8d82538d0f6fdc2cb17dad06c3a279d4b7e1350805c7' },
  { path: 'docs/quality/art/reference-sources/project-ui-wireframes/ui-source-visual-manifest-v1.json', byteLength: 4088, sha256: 'ace4813c8036a8ed13d1182f91bcad6f44df12002c4ec990f7ff7a12512e9109' },
] as const;
const EXPECTED_EQUIPMENT = [
  {
    id: 'a11-equipment-shield-round-glb', category: 'formal-round-shield-model',
    artifact: { path: 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb', byteLength: 13084, sha256: 'a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d' },
    sourceRevision: '672074b73ba276876a19e8816ecdc5241817ab47', licenseId: 'CC0-1.0', rightsHolder: 'KayKit Game Assets / Kay Lousberg', rights: [true, true, true, 'not-required'],
    existingMaturity: 'verified-intake-only', disposition: 'representative-equipment-input-candidate',
    usableDirection: 'round shield mass, rim, boss and held-equipment silhouette only',
    forbiddenUse: 'does not prove supply icon, pickup marker, final attachment pose, runtime lifecycle or Blockout',
  },
  {
    id: 'a11-equipment-shield-texture', category: 'formal-round-shield-texture-dependency',
    artifact: { path: 'public/assets/arena/equipment/kaykit-adventurers/shield_texture.png', byteLength: 14172, sha256: '5d250ccc5da020e6126bfa3839f83bd9a465a951ed223e4d13c08b1925e154d4' },
    sourceRevision: '672074b73ba276876a19e8816ecdc5241817ab47', licenseId: 'CC0-1.0', rightsHolder: 'KayKit Game Assets / Kay Lousberg', rights: [true, true, true, 'not-required'],
    existingMaturity: 'verified-intake-only-dependency', disposition: 'supporting-material-candidate-not-icon',
    usableDirection: 'only material support for the audited shield model', forbiddenUse: 'a UV texture is not an equipment silhouette, icon or supply marker',
  },
  {
    id: 'a11-equipment-a03-shield-silhouette', category: 'diagnostic-silhouette-evidence',
    artifact: { path: 'docs/quality/art/silhouette/arena.asset.character.parkour-apprentice.kaykit-rogue.v1/arena.asset.character.parkour-apprentice.kaykit-rogue.v1__shield__front__d05__390x844@2x.png', byteLength: 6912, sha256: '020ca9fc6a3e6719aebf21fe5971071c3c241ccc4ade3bebb590f8648bf34029' },
    sourceRevision: 'A0.3 deterministic-render-manifest-v1', licenseId: 'PROJECT-DIAGNOSTIC-DERIVATIVE-OF-CC0', rightsHolder: 'Arena project plus KayKit CC0 source', rights: [true, true, true, 'not-required'],
    existingMaturity: 'diagnostic-evidence-only', disposition: 'audit-reference-only',
    usableDirection: 'inspect whether the round shield remains legible at the frozen A0.3 mobile camera',
    forbiddenUse: 'must not ship, become a supply icon, count as a representative asset or claim A0.3 human passage',
  },
  {
    id: 'a11-equipment-ui-wireframes', category: 'programmatic-contract-wireframes',
    artifact: { path: 'docs/quality/art/reference-sources/project-ui-wireframes/ui-source-visual-manifest-v1.json', byteLength: 4088, sha256: 'ace4813c8036a8ed13d1182f91bcad6f44df12002c4ec990f7ff7a12512e9109' },
    sourceRevision: 'arena-a0.2.1-project-ui-wireframes.v1', licenseId: 'PROJECT-ORIGINAL-INTERNAL', rightsHolder: 'Arena project', rights: [true, true, false, 'internal-only'],
    existingMaturity: 'reference-contract-only', disposition: 'research-only', usableDirection: 'layout responsibility audit only',
    forbiddenUse: 'programmatic wireframes are not production equipment icons or representative sample UI',
  },
] as const;
const EXPECTED_AUDIO = [
  ['a11-audio-kenney-base-push', 'public/assets/arena/audio/kenney-impact-sounds/base-push.ogg', 8800, '486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c'],
  ['a11-audio-kenney-chain-pull', 'public/assets/arena/audio/kenney-impact-sounds/chain-pull.ogg', 7651, '33b5e6e37c6e9d54e07bf5a89b12c76e879f40c1ea83cdd82714df1d6f9fec6d'],
  ['a11-audio-kenney-hammer-smash', 'public/assets/arena/audio/kenney-impact-sounds/hammer-smash.ogg', 6110, 'e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831'],
  ['a11-audio-kenney-shield-charge', 'public/assets/arena/audio/kenney-impact-sounds/shield-charge.ogg', 10032, '112d4f93ddcc370b410630f971c0f5d991856102da9c76bc5c5540d388e75aaa'],
] as const;
const KENNEY_SOURCE = {
  creator: 'Kenney', locator: 'https://www.kenney.nl/assets/impact-sounds',
  revision: 'upstream-version-1.0+zip-sha256-029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8',
  allowedUse: 'offline semantic audition after A1.1 coordinator approval',
  prohibitedUse: 'must not be relabelled as approved supply audio, integrated, shipped or replace its current HitResolved purpose',
  withdrawalPoint: 'remove candidate reference without deleting the existing formal HitResolved asset',
} as const;
const VFX_BOUNDARY = {
  creator: 'unassigned', locator: 'none-no-bytes-acquired', revision: 'none',
  allowedUse: 'contract discussion only before authorship and rights intake',
  prohibitedUse: 'no generation, download, runtime integration, representative sample or production claim',
  withdrawalPoint: 'remove ledger entry before any authored bytes exist',
} as const;
const KAYKIT_PROOF = { path: 'governance/third-party/proofs/kaykit-adventurers-source.txt', byteLength: 380, sha256: '0f60d3f9f0beab6e131bf7b1b118d8d1930dff05f9c1d31cc4141ff19dcb4923' } as const;
const KAYKIT_LICENSE = { path: 'licenses/kaykit-adventurers-CC0-LICENSE.txt', byteLength: 891, sha256: 'ae322141814056dda0deea7540d74c41d87aee1da319977cd1bd84ee5a923629' } as const;
const UI_RIGHTS = { path: 'docs/quality/art/reference-sources/project-ui-wireframes/ui-source-visual-manifest-v1.json', byteLength: 4088, sha256: 'ace4813c8036a8ed13d1182f91bcad6f44df12002c4ec990f7ff7a12512e9109' } as const;
const KENNEY_PROOF = { path: 'governance/third-party/proofs/kenney-impact-sounds-source.txt', byteLength: 375, sha256: '74f8d5796e067f689269ec7f77f4ebfa523bab0fe15d3d5f7ab909c8921585ec' } as const;
const KENNEY_LICENSE = { path: 'licenses/kenney-impact-sounds-CC0-LICENSE.txt', byteLength: 448, sha256: 'd66be41e71d4f284733729d7edb2cbbb65811b8b9603c8640b0ca0f687ba0c7c' } as const;

function fail(message: string): never { throw new Error(`A1.1 readiness check failed: ${message}`); }
function object(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as JsonRecord;
}
function records(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((entry, index) => object(entry, `${label}[${index}]`));
}
function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) fail(`${label} must be a string array`);
  return value as string[];
}
function exactKeys(value: JsonRecord, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) fail(`${label} contains missing or future fields`);
}
function exactArray(value: unknown, expected: readonly unknown[], label: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(`${label} drift`);
}
function sha256(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function repositoryFile(pathValue: unknown, label: string): string {
  if (typeof pathValue !== 'string' || !pathValue || isAbsolute(pathValue)) fail(`${label} must be a repository-relative path`);
  const absolute = resolve(ROOT, pathValue);
  const lexical = relative(ROOT, absolute);
  if (lexical.startsWith('..') || isAbsolute(lexical)) fail(`${label} escapes repository lexically`);
  if (!existsSync(absolute)) fail(`${label} missing: ${pathValue}`);
  if (lstatSync(absolute).isSymbolicLink()) fail(`${label} must not be a symbolic link`);
  const actual = realpathSync(absolute);
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) fail(`${label} escapes repository through symlink`);
  if (!lstatSync(actual).isFile()) fail(`${label} must resolve to a file`);
  return actual;
}
function verifyArtifact(value: unknown, label: string): JsonRecord {
  const artifact = object(value, label);
  exactKeys(artifact, ['path', 'byteLength', 'sha256'], label);
  const file = repositoryFile(artifact.path, `${label}.path`);
  const bytes = readFileSync(file);
  if (!Number.isInteger(artifact.byteLength) || artifact.byteLength !== bytes.byteLength) fail(`${label}.byteLength drift`);
  if (typeof artifact.sha256 !== 'string' || artifact.sha256 !== sha256(bytes)) fail(`${label}.sha256 drift`);
  return artifact;
}
function verifyLicense(value: unknown, label: string): JsonRecord {
  const license = object(value, label);
  exactKeys(license, ['id', 'rightsHolder', 'proofArtifact', 'textArtifact', 'commercialUseAllowed', 'modificationAllowed', 'redistributionAllowed', 'attribution'], label);
  if (typeof license.id !== 'string' || typeof license.rightsHolder !== 'string' || typeof license.attribution !== 'string') fail(`${label} identity incomplete`);
  if (license.proofArtifact !== null) verifyArtifact(license.proofArtifact, `${label}.proofArtifact`);
  if (license.textArtifact !== null) verifyArtifact(license.textArtifact, `${label}.textArtifact`);
  for (const key of ['commercialUseAllowed', 'modificationAllowed', 'redistributionAllowed']) {
    if (typeof license[key] !== 'boolean') fail(`${label}.${key} must be boolean`);
  }
  return license;
}

const ledger = object(JSON.parse(readFileSync(repositoryFile(LEDGER_PATH, 'ledger'), 'utf8')), 'ledger');
exactKeys(ledger, [
  'schemaVersion', 'id', 'status', 'baselineCommit', 'reviewedAt', 'scope', 'upstream', 'repositoryAudits',
  'equipmentInputAudit', 'missingEquipmentInputs', 'temporarySourceCandidates', 'measurementPlan', 'hardGates',
  'score', 'missingMandatorySkillReferences', 'rollback',
], 'ledger');
if (ledger.schemaVersion !== 2 || ledger.id !== 'arena.art.supply-preproduction-readiness.a1.1.v1') fail('identity drift');
if (ledger.status !== 'upstream-contract-ready-candidate' || ledger.baselineCommit !== BASELINE || ledger.reviewedAt !== '2026-07-29') fail('status/baseline/date drift');
if (ledger.scope !== 'source-rights-and-measurement-plan-only-no-specimen-or-runtime') fail('scope expanded');

const upstream = object(ledger.upstream, 'upstream');
exactKeys(upstream, ['a1_0ContractPath', 'a1_0ContractSha256', 'a1_0Status', 'a0_3QualifiedHumanParticipants', 'activeLifecycleProjectionAvailable', 'activeLifecycleProjectionContract'], 'upstream');
if (upstream.a1_0ContractPath !== 'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v1.json' || upstream.a1_0ContractSha256 !== '719e68766a03c82d76ef1eb49eeab29bc5045c57dad450032f96db26f410ed1e' || upstream.a1_0Status !== 'contract-ready') fail('A1.0 pinned path/hash/status drift');
const a10Bytes = readFileSync(repositoryFile(upstream.a1_0ContractPath, 'upstream.a1_0ContractPath'));
if (upstream.a1_0ContractSha256 !== sha256(a10Bytes)) fail('A1.0 bytes drift');
const a10 = object(JSON.parse(a10Bytes.toString('utf8')), 'upstream.actualA1.0');
if (a10.id !== 'arena.art.supply-presentation.a1.0.v1' || a10.status !== 'contract-ready') fail('actual A1.0 identity/status drift');
const a10Score = object(a10.score, 'upstream.actualA1.0.score');
if (a10Score.hardGatePassed !== true) fail('actual A1.0 own hard gate must remain true');
const a10Gates = object(a10.hardGates, 'upstream.actualA1.0.hardGates');
if (a10Gates.a1_0CoordinatorSignOff !== true || a10Gates.a1_0ContractPassed !== true) fail('actual A1.0 sign-off gates drift');
for (const gate of ['a1RepresentativeSpecimenStarted', 'a1Passed', 'a0_3Passed', 'blockoutAllowed', 'productionVfxIntegrated', 'productionAudioIntegrated', 'deviceVerified', 'humanVerified', 'finalPassed']) {
  if (a10Gates[gate] !== false) fail(`actual A1.0 downstream gate ${gate} must remain false`);
}
if (upstream.a0_3QualifiedHumanParticipants !== 0 || upstream.activeLifecycleProjectionAvailable !== true) fail('upstream availability/human boundary drift');
const activeLifecycle = object(upstream.activeLifecycleProjectionContract, 'upstream.activeLifecycleProjectionContract');
exactKeys(activeLifecycle, ['status', 'signedCommit', 'schemaVersion', 'sourceArtifacts', 'requiredBindings', 'recoveryBoundary'], 'upstream.activeLifecycleProjectionContract');
if (activeLifecycle.status !== 'contract-available-upstream-signed' || activeLifecycle.signedCommit !== BASELINE || activeLifecycle.schemaVersion !== 2) fail('active lifecycle contract identity drift');
const activeLifecycleArtifacts = records(activeLifecycle.sourceArtifacts, 'upstream.activeLifecycleProjectionContract.sourceArtifacts');
exactArray(activeLifecycleArtifacts, ACTIVE_LIFECYCLE_PROJECTION_ARTIFACTS, 'active lifecycle source artifacts');
for (const [index, artifact] of activeLifecycleArtifacts.entries()) verifyArtifact(artifact, `activeLifecycleProjectionContract.sourceArtifacts[${index}]`);
exactArray(activeLifecycle.requiredBindings, ACTIVE_LIFECYCLE_BINDINGS, 'active lifecycle required bindings');
if (activeLifecycle.recoveryBoundary !== 'not-ready-pre-expiry is a current-tick command view only; recovery must wait for the next ready projection') fail('active lifecycle recovery boundary drift');

const audits = records(ledger.repositoryAudits, 'repositoryAudits');
if (audits.length !== 4) fail('four repository audits required');
exactArray(audits, EXPECTED_REPOSITORY_AUDITS, 'repository audit pinned identities/order');
for (const [index, audit] of audits.entries()) verifyArtifact(audit, `repositoryAudits[${index}]`);

const equipment = records(ledger.equipmentInputAudit, 'equipmentInputAudit');
exactArray(equipment.map((entry) => entry.id), EQUIPMENT_IDS, 'equipment ids');
for (const [index, entry] of equipment.entries()) {
  exactKeys(entry, ['id', 'category', 'artifact', 'sourceRevision', 'license', 'existingMaturity', 'a1_1Disposition', 'usableDirection', 'forbiddenUse', 'a1_1Approved'], `equipment[${index}]`);
  verifyArtifact(entry.artifact, `equipment[${index}].artifact`);
  const license = verifyLicense(entry.license, `equipment[${index}].license`);
  if (license.proofArtifact === null || license.textArtifact === null) fail(`${String(entry.id)} rights artifacts missing`);
  if (entry.a1_1Approved !== false) fail(`${String(entry.id)} cannot be approved in candidate pack`);
  for (const key of ['category', 'sourceRevision', 'existingMaturity', 'a1_1Disposition', 'usableDirection', 'forbiddenUse']) {
    if (typeof entry[key] !== 'string' || String(entry[key]).length < 5) fail(`${String(entry.id)}.${key} incomplete`);
  }
  const expected = EXPECTED_EQUIPMENT[index];
  if (!expected || entry.id !== expected.id || entry.category !== expected.category || JSON.stringify(entry.artifact) !== JSON.stringify(expected.artifact) || entry.sourceRevision !== expected.sourceRevision || entry.existingMaturity !== expected.existingMaturity || entry.a1_1Disposition !== expected.disposition || entry.usableDirection !== expected.usableDirection || entry.forbiddenUse !== expected.forbiddenUse) fail(`${String(entry.id)} pinned equipment identity/usage drift`);
  if (license.id !== expected.licenseId || license.rightsHolder !== expected.rightsHolder || JSON.stringify([license.commercialUseAllowed, license.modificationAllowed, license.redistributionAllowed, license.attribution]) !== JSON.stringify(expected.rights)) fail(`${String(entry.id)} pinned license identity/rights drift`);
  const expectedProof = index === 3 ? UI_RIGHTS : KAYKIT_PROOF;
  const expectedText = index === 3 ? UI_RIGHTS : KAYKIT_LICENSE;
  if (JSON.stringify(license.proofArtifact) !== JSON.stringify(expectedProof) || JSON.stringify(license.textArtifact) !== JSON.stringify(expectedText)) fail(`${String(entry.id)} pinned rights artifact drift`);
}
if (equipment[0]?.a1_1Disposition !== 'representative-equipment-input-candidate') fail('formal shield disposition drift');
if (equipment[1]?.a1_1Disposition !== 'supporting-material-candidate-not-icon') fail('texture was promoted to icon');
if (equipment[2]?.a1_1Disposition !== 'audit-reference-only' || equipment[2]?.existingMaturity !== 'diagnostic-evidence-only') fail('A0.3 diagnostic silhouette was promoted');
if (equipment[3]?.a1_1Disposition !== 'research-only' || equipment[3]?.existingMaturity !== 'reference-contract-only') fail('wireframe was promoted');

const missing = records(ledger.missingEquipmentInputs, 'missingEquipmentInputs');
if (missing.length !== 1) fail('one explicit missing supply icon input required');
exactKeys(missing[0] ?? {}, ['id', 'required', 'bytesPresent', 'hashRecorded', 'status', 'minimumCloseAction'], 'missingEquipmentInputs[0]');
if (missing[0]?.id !== 'supply-equipment-icon-set' || missing[0]?.required !== true || missing[0]?.bytesPresent !== false || missing[0]?.hashRecorded !== false || missing[0]?.status !== 'missing-not-approved') fail('missing icon gap was falsely closed');

const candidates = records(ledger.temporarySourceCandidates, 'temporarySourceCandidates');
exactArray(candidates.map((entry) => entry.id), TEMPORARY_IDS, 'temporary source ids');
for (const [index, candidate] of candidates.entries()) {
  exactKeys(candidate, ['id', 'domain', 'sourceKind', 'creator', 'sourceLocator', 'sourceRevision', 'artifact', 'license', 'status', 'allowedUse', 'prohibitedUse', 'withdrawalPoint', 'a1_1Approved'], `candidate[${index}]`);
  const license = verifyLicense(candidate.license, `candidate[${index}].license`);
  if (candidate.a1_1Approved !== false || typeof candidate.withdrawalPoint !== 'string' || String(candidate.withdrawalPoint).length < 20) fail(`${String(candidate.id)} approval/withdrawal boundary drift`);
  if (candidate.domain === 'vfx') {
    if (candidate.artifact !== null || candidate.status !== 'research-candidate' || candidate.sourceKind !== 'project-clean-room-to-be-authored') fail(`${String(candidate.id)} no-byte VFX candidate was falsely materialized`);
    if (license.proofArtifact !== null || license.textArtifact !== null || license.commercialUseAllowed !== false || license.modificationAllowed !== false || license.redistributionAllowed !== false) fail(`${String(candidate.id)} no-byte rights were falsely approved`);
    if (candidate.creator !== VFX_BOUNDARY.creator || candidate.sourceLocator !== VFX_BOUNDARY.locator || candidate.sourceRevision !== VFX_BOUNDARY.revision || candidate.allowedUse !== VFX_BOUNDARY.allowedUse || candidate.prohibitedUse !== VFX_BOUNDARY.prohibitedUse || candidate.withdrawalPoint !== VFX_BOUNDARY.withdrawalPoint) fail(`${String(candidate.id)} pinned VFX source/use boundary drift`);
    if (license.id !== 'PROJECT-RIGHTS-PENDING-AUTHORSHIP' || license.rightsHolder !== 'unassigned' || license.attribution !== 'unresolved') fail(`${String(candidate.id)} pending-rights identity drift`);
  } else if (candidate.domain === 'audio') {
    verifyArtifact(candidate.artifact, `candidate[${index}].artifact`);
    if (candidate.status !== 'source-byte-candidate' || candidate.sourceKind !== 'existing-audited-third-party-byte') fail(`${String(candidate.id)} audio candidate status drift`);
    if (license.id !== 'CC0-1.0' || license.proofArtifact === null || license.textArtifact === null || license.commercialUseAllowed !== true || license.modificationAllowed !== true || license.redistributionAllowed !== true) fail(`${String(candidate.id)} audited CC0 rights drift`);
    const expected = EXPECTED_AUDIO[index - 3];
    if (!expected || candidate.id !== expected[0] || JSON.stringify(candidate.artifact) !== JSON.stringify({ path: expected[1], byteLength: expected[2], sha256: expected[3] })) fail(`${String(candidate.id)} pinned audio artifact drift`);
    if (candidate.creator !== KENNEY_SOURCE.creator || candidate.sourceLocator !== KENNEY_SOURCE.locator || candidate.sourceRevision !== KENNEY_SOURCE.revision || candidate.allowedUse !== KENNEY_SOURCE.allowedUse || candidate.prohibitedUse !== KENNEY_SOURCE.prohibitedUse || candidate.withdrawalPoint !== KENNEY_SOURCE.withdrawalPoint) fail(`${String(candidate.id)} pinned audio source/use boundary drift`);
    if (license.rightsHolder !== 'Kenney' || license.attribution !== 'not-required' || JSON.stringify(license.proofArtifact) !== JSON.stringify(KENNEY_PROOF) || JSON.stringify(license.textArtifact) !== JSON.stringify(KENNEY_LICENSE)) fail(`${String(candidate.id)} pinned audio license identity/artifacts drift`);
  } else fail(`${String(candidate.id)} unknown domain`);
}

const plan = object(ledger.measurementPlan, 'measurementPlan');
exactKeys(plan, ['status', 'preStartPlanApproved', 'postSpecimenMeasuredEvidencePresent', 'viewports', 'timing', 'budgets', 'captures', 'evidenceBoundary', 'missingExecutionInputs'], 'measurementPlan');
if (plan.status !== 'plan-candidate-not-approved-not-measured' || plan.preStartPlanApproved !== false || plan.postSpecimenMeasuredEvidencePresent !== false) fail('plan approval/evidence timing was falsified');
const viewports = records(plan.viewports, 'measurementPlan.viewports');
if (viewports.length !== 2) fail('desktop and mobile viewports required');
for (const [index, viewport] of viewports.entries()) exactKeys(viewport, ['id', 'cssWidth', 'cssHeight', 'devicePixelRatio', 'captureKind', 'deviceGap'], `viewport[${index}]`);
exactArray(viewports.map(({ id, cssWidth, cssHeight, devicePixelRatio }) => ({ id, cssWidth, cssHeight, devicePixelRatio })), [
  { id: 'desktop', cssWidth: 1440, cssHeight: 900, devicePixelRatio: 1 },
  { id: 'mobile-390x844', cssWidth: 390, cssHeight: 844, devicePixelRatio: 1 },
], 'viewport dimensions');
if (viewports.some((viewport) => typeof viewport.deviceGap !== 'string' || !String(viewport.deviceGap).includes(viewport.id === 'desktop' ? 'GPU' : 'not real'))) fail('device evidence gap missing');
const timing = object(plan.timing, 'measurementPlan.timing');
exactKeys(timing, ['fixedHz', 'requiredPresentationFps', 'warmupTicks', 'sampleTicks', 'terminalOffsets', 'repetitions', 'wallClockAuthorityForbidden'], 'measurementPlan.timing');
if (timing.fixedHz !== 60 || timing.requiredPresentationFps !== 30 || timing.warmupTicks !== 300 || timing.sampleTicks !== 1800 || timing.repetitions !== 3 || timing.wallClockAuthorityForbidden !== true) fail('measurement timing drift');
exactArray(timing.terminalOffsets, [599, 600, 601], 'measurementPlan.timing.terminalOffsets');
const budgets = object(plan.budgets, 'measurementPlan.budgets');
const expectedBudgets = { activeMarkers: 3, desktopParticles: 72, mobileParticles: 36, additiveLayers: 1, distortionPasses: 0, simultaneousSupplyVoices: 4, countdownLoops: 0, desktopAverageOverdrawMultiple: 4, desktopPeakOverdrawMultiple: 8, mobileAverageOverdrawMultiple: 2, mobilePeakOverdrawMultiple: 4, p95FrameMilliseconds: 33.33, supplyGpuDeltaMilliseconds: 2, heapGrowthAcrossTwentyCyclesBytes: 1048576, postDestroyOwnedResources: 0 };
exactKeys(budgets, Object.keys(expectedBudgets), 'measurementPlan.budgets');
if (JSON.stringify(budgets) !== JSON.stringify(expectedBudgets)) fail('measurement budgets drift');
const captures = records(plan.captures, 'measurementPlan.captures');
exactArray(captures.map((entry) => entry.id), CAPTURE_IDS, 'capture ids');
for (const [index, capture] of captures.entries()) {
  exactKeys(capture, ['id', 'window', 'method', 'pass'], `capture[${index}]`);
  for (const key of ['window', 'method', 'pass']) if (typeof capture[key] !== 'string' || String(capture[key]).length < 20) fail(`capture[${index}].${key} incomplete`);
}
if (typeof plan.evidenceBoundary !== 'string' || !String(plan.evidenceBoundary).includes('after a representative specimen exists')) fail('measurement evidence timing boundary missing');
exactArray(plan.missingExecutionInputs, ['capture harness implementation', 'approved browser and GPU identity', 'real iOS device', 'real Android device', 'A0.3 ten-person human approval', 'A1.1 coordinator approval'], 'measurementPlan.missingExecutionInputs');

const gates = object(ledger.hardGates, 'hardGates');
exactKeys(gates, [...FALSE_GATES, 'activeLifecycleProjectionAvailable'], 'hardGates');
for (const gate of FALSE_GATES) if (gates[gate] !== false) fail(`gate ${gate} must remain false`);
if (gates.activeLifecycleProjectionAvailable !== true) fail('active lifecycle projection prerequisite must remain available');
const score = object(ledger.score, 'score');
exactKeys(score, ['basis', 'total', 'maximum', 'hardGatePassed', 'dimensions', 'maturity'], 'score');
if (score.basis !== 'A1.1 preproduction source audit and measurement-plan contract only; no source approval, specimen, runtime, device or human maturity' || score.total !== 92 || score.maximum !== 100 || score.hardGatePassed !== false) fail('score basis/value drift');
const dimensions = records(score.dimensions, 'score.dimensions');
const expectedDimensions = [
  { id: 'repository-asset-truth', score: 19, maximum: 20 }, { id: 'rights-and-withdrawal', score: 18, maximum: 20 },
  { id: 'vfx-audio-candidate-honesty', score: 17, maximum: 20 }, { id: 'measurement-repeatability', score: 19, maximum: 20 },
  { id: 'fail-closed-governance', score: 19, maximum: 20 },
];
for (const [index, dimension] of dimensions.entries()) exactKeys(dimension, ['id', 'score', 'maximum'], `score.dimensions[${index}]`);
exactArray(dimensions, expectedDimensions, 'score.dimensions');
if (dimensions.reduce((sum, entry) => sum + Number(entry.score), 0) !== 92 || dimensions.some((entry) => Number(entry.score) / Number(entry.maximum) < 0.8)) fail('score arithmetic/80% floor failed');
const maturity = object(score.maturity, 'score.maturity');
exactKeys(maturity, ['asset', 'device', 'human', 'runtime', 'maximumEach'], 'score.maturity');
if (JSON.stringify(maturity) !== JSON.stringify({ asset: 10, device: 0, human: 0, runtime: 0, maximumEach: 100 })) fail('maturity was inflated');

exactArray(ledger.missingMandatorySkillReferences, ['docs/collaboration-protocol.md', 'docs/game-design-theory.md'], 'missingMandatorySkillReferences');
for (const path of strings(ledger.missingMandatorySkillReferences, 'missingMandatorySkillReferences')) if (existsSync(resolve(ROOT, path))) fail(`skill reference now exists and audit must be updated: ${path}`);
if (typeof ledger.rollback !== 'string' || !ledger.rollback.includes('preserve A1.0')) fail('rollback boundary incomplete');

process.stdout.write(`${JSON.stringify({ status: ledger.status, equipmentAudits: equipment.length, temporaryCandidates: candidates.length, capturePlans: captures.length, score: score.total, hardGatePassed: false, activeLifecycleProjectionAvailable: true, a0_3Humans: 0, representativeSpecimenStarted: false })}\n`);
