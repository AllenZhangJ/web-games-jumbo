import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

type JsonRecord = Record<string, unknown>;
type AuditIdentity = readonly [path: string, byteLength: number, sha256: string, domain: string];
type FixtureIdentity = readonly [id: string, sourcePath: string, marker: string];

const ROOT = resolve(process.env.ARENA_A20_CHECK_ROOT ?? resolve(import.meta.dirname, '../..'));
const LEDGER_PATH = 'docs/quality/art/mode/arena-a2.0-mode-presentation-contract-v1.json';
const BASELINE = '92bafbdb15c268c7465d5321e209473b072024c7';

const EXPECTED_AUDITS: readonly AuditIdentity[] = Object.freeze([
  ['packages/arena-contracts/src/arena-public-supply-projection-v3.ts', 24951, 'd0c687753fdb611cadb00a7eb4d33146cf832961ea85338070e1605f06481c38', 'contract'],
  ['packages/arena-contracts/src/match-event-v6.ts', 34957, 'a9a1e8c170c94cff533d9b1457ba9b5a776ac94cc46cddff5721159a6126a799', 'contract'],
  ['packages/arena-contracts/src/match-read-frame-v3.ts', 30958, '27ed94c735a4cec1552261f9d4124f987dce7c0325f05874f48f31d34feef5e2', 'contract'],
  ['packages/arena-contracts/test/arena-public-supply-projection-v3.test.ts', 21686, 'fdedd4926cb4824b9a787668cd899d75ae5886e44cbb83dfcb5aa97f08619ad8', 'spec'],
  ['packages/arena-contracts/test/match-event-v6.test.ts', 10577, '2733d62046fc807d9e78707dc105f666a592bc0f15149e1007d636aaa4ab0ac0', 'spec'],
  ['packages/arena-contracts/test/match-read-frame-v3.test.ts', 12947, 'a87329d9fa49b0f75a0f3710d6134ef2a3144158833ce72f8823b1d099db585c', 'spec'],
  ['packages/arena-match/src/mode-match-runtime-v6.ts', 86164, '7dd65f3dbfacece0c72e90f0f847c49b4e152fe734c1f3f87c1bf95dd5cffd60', 'runtime'],
  ['packages/arena-match/src/mode-result-policy-resolver-v1.ts', 9416, 'ca08bcb4187b59d195a5b191aa82c109ff8a58fb89e5a405fa6429957524a591', 'runtime'],
  ['packages/arena-match/src/race-mode-system.ts', 33056, 'd8eb8d5a8d9c3cf68caa7fd0027027b3ef4edc322754d3db56dcdd6ed19627c4', 'runtime'],
  ['packages/arena-match/src/survival-mode-system.ts', 40700, 'add942e24442af6e9206efa965e104796396a072e64e4f2bea428175c8ab6e01', 'runtime'],
  ['packages/arena-match/test/mode-match-runtime-v6.test.ts', 39840, 'c672061ec6cd9ad7951ca43994199f005f9c3931dda68daf78f995d6c33dc319', 'spec'],
  ['packages/arena-match/test/mode-result-policy-resolver-v1.test.ts', 7402, '2e844323e490fdb130cfa17f0446f1f6ada483b7745ecf46ba1ef62b5eac1a09', 'spec'],
  ['packages/arena-match/test/race-mode-system.test.ts', 10384, '21605c8fab54067ca5fe684dcdb9e84014204f6844133a397b020b0ccf76e07b', 'spec'],
  ['packages/arena-match/test/survival-mode-system.test.ts', 12043, '775750d28958c6bb06bccb828695b912fdb23a55ca7108216bd27be8efab85ad', 'spec'],
  ['packages/arena-product-contracts/src/product-match-result-v3.ts', 7840, 'bf4a421d5cccdcd42744ef34f77c98db0ed57813f852243eae558595355df8fc', 'product-contract'],
  ['packages/arena-product-contracts/src/product-participant-contract-v2.ts', 7129, '3f6bd33def7f232ab514eb0015a143ba5c4570b0589e571926403abc67d5cd1b', 'product-contract'],
  ['packages/arena-product-contracts/src/product-public-match-info-v2.ts', 3566, 'd95e595305b8d83356699b877c88ba5309844f3f16b5727846899393d14c0584', 'product-contract'],
  ['packages/arena-product-contracts/test/product-match-result-v3.test.ts', 5485, '566d2bc5847d51157e544475266e1603710e08171a4343a3dd8c8cf16750d409', 'spec'],
  ['packages/arena-product-presentation-three/src/arena-v2-formal-passthrough-vfx-semantic-candidate-v1.ts', 5203, '79fcdb51c7b3658569e7ca3063ee99c345796c1e28fbd0b746447b73515a94e2', 'vfx-presentation'],
  ['packages/arena-product-presentation-three/src/arena-v2-twenty-weapon-formal-vfx-style-candidate-v1.ts', 24458, '73aa10d8366644f32e2b31debe1377c6c89a0ccf709d8ee144ba36bd8d6665b1', 'vfx-presentation'],
  ['packages/arena-product-presentation-three/test/arena-v2-twenty-weapon-formal-vfx-combat-grammar-identity-candidate-v1.test.ts', 6645, '8a1b63ec9f78a74b10a937d255021b41083b6d6994ead0df1097f3f3d13f8bb4', 'spec'],
  ['packages/arena-product-presentation/src/arena-v2-formal-audio-cue-resolution-candidate-v1.ts', 16484, '891930db9f8434a4843b2f3a446db3a6dbdaa7a76b0c77b72fd822394c3b0e0c', 'audio-presentation'],
  ['packages/arena-product-presentation/src/arena-v2-mode-hud-consumer-epoch-v1.ts', 17451, '2774456067b40fc08089ab639f8da69ff31d2160577f31c73b459270e3dc2506', 'hud-presentation'],
  ['packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts', 31986, 'bdcbea2f31503c855438a831460a2a2a64ab6c988e5a8ad6b0e462766be5b845', 'hud-presentation'],
  ['packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts', 14851, '6976ccfc145abafd2627358d4ddb942bed8ffb1ca97b840f992de9748afe421e', 'hud-presentation'],
  ['packages/arena-product-presentation/src/arena-v2-mode-hud-validated-presentation-host-v1.ts', 13171, 'ee31bb23305c011f04b1bf009fd011431c57e5b75efe64b83a5dfc3b888e3bdc', 'hud-presentation'],
  ['packages/arena-product-presentation/test/arena-v2-formal-audio-combat-grammar-identity-candidate-v1.test.ts', 11398, 'e66242c1ba3c2082a8159fcd0b3563efc475a0e580240efa6da8ad0c0151b6ac', 'spec'],
  ['packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts', 23540, 'e28f5ca0fd1c68cf1de714789a0c12200f9ff152db4882113af2a91e353591e1', 'spec'],
  ['packages/arena-product-presentation/test/arena-v2-mode-hud-presentation-host-v1.test.ts', 12447, 'e40ba17ac10c9e95bdf09b4151e2514b829a3bd06cce39e18281840dc90b8cdd', 'spec'],
  ['packages/arena-product-presentation/test/arena-v2-mode-hud-validated-presentation-host-v1.test.ts', 15404, 'd6fb1e4a096c0e5fb7f110249c0941a543f2a78afba427ddad0d858b2fe6a23c', 'spec'],
  ['src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts', 84129, 'c9ed44acc7a53004e24d06706b1dd442fede4bd836c320ff97c1d52149b8517a', 'vfx-port'],
  ['src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts', 54155, 'c310343986cf322bd9aba40e21dbb01d8ffe2be684b4f408d75017693cd84f81', 'audio-port'],
  ['tests/arena/p5-formal-web-audio-bus-candidate-v1.test.ts', 13205, '5489b7179cf2d6ffe8e3823fd575a468579ed49c4bf0a30c52607e42cbb6fbf5', 'spec'],
]);

const EXPECTED_FIXTURES: readonly FixtureIdentity[] = Object.freeze([
  ['step-six-key-atomic-terminal', 'packages/arena-match/test/mode-match-runtime-v6.test.ts', 'drives %s from a zero-event start frame to one atomic terminal result'],
  ['jump-capability-required', 'packages/arena-match/test/mode-match-runtime-v6.test.ts', 'requires the authoritative jump capability on start and every step'],
  ['mode-result-duel-winner', 'packages/arena-match/test/mode-result-policy-resolver-v1.test.ts', 'binds Duel winner and terminal tick to the current match'],
  ['mode-result-race-tie', 'packages/arena-match/test/mode-result-policy-resolver-v1.test.ts', 'accepts Race shared-rank finish and progress-tie projection'],
  ['mode-result-race-no-finisher', 'packages/arena-match/test/mode-result-policy-resolver-v1.test.ts', "reason: 'no-finisher'"],
  ['mode-result-survival', 'packages/arena-match/test/mode-result-policy-resolver-v1.test.ts', 'binds Survival result to the single player participant'],
  ['race-respawn', 'packages/arena-contracts/test/match-event-v6.test.ts', 'locks Race respawn scheduling to 180 ticks'],
  ['survival-two-falls', 'packages/arena-contracts/test/match-event-v6.test.ts', 'locks first/second Survival fall semantics'],
  ['survival-supply-pressure', 'packages/arena-contracts/test/arena-public-supply-projection-v3.test.ts', 'locks exact +599/+600/+601 readiness'],
  ['participant-non-color-identity', 'packages/arena-product-contracts/test/product-match-result-v3.test.ts', 'publishes local identity without defaulting to player-1'],
  ['consumer-epoch-atomic-switch', 'packages/arena-product-presentation/test/arena-v2-mode-hud-presentation-host-v1.test.ts', 'switches projection and effect consumers through one epoch boundary'],
  ['old-epoch-rejected', 'packages/arena-product-presentation/test/arena-v2-mode-hud-validated-presentation-host-v1.test.ts', 'rejects direct HUD models and old runtime callbacks before consumption'],
  ['same-tick-dedup', 'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts', 'presents every same-tick feedback identity once in stable queue order'],
  ['reduced-motion-static', 'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts', 'turns reduced motion feedback into a zero-particle static result'],
  ['muted-no-replay', 'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts', 'stops owned feedback audio on mute without replaying it after unmute'],
  ['audio-voice-bound', 'tests/arena/p5-formal-web-audio-bus-candidate-v1.test.ts', 'lets the newest equal-priority authority event replace the oldest voice'],
  ['movement-fall-no-weapon-grammar', 'packages/arena-product-presentation-three/test/arena-v2-twenty-weapon-formal-vfx-combat-grammar-identity-candidate-v1.test.ts', 'keeps movement-fall global and refuses forged weapon grammar'],
]);

function fail(message: string): never {
  throw new Error(`A2.0 mode presentation contract check failed: ${message}`);
}

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as JsonRecord;
}

function recordArray(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((entry, index) => record(entry, `${label}[${index}]`));
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    fail(`${label} must be a string array`);
  }
  return value as string[];
}

function exactKeys(value: JsonRecord, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    fail(`${label} contains missing or future fields`);
  }
}

function exactValue(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} drift`);
}

function containsMarker(source: string, marker: string): boolean {
  return source.includes(marker)
    || source.replace(/\s+/gu, '').includes(marker.replace(/\s+/gu, ''));
}

function repositoryFile(pathValue: unknown, label: string): string {
  if (typeof pathValue !== 'string' || pathValue.length === 0 || isAbsolute(pathValue)) {
    fail(`${label} must be a repository-relative path`);
  }
  const absolute = resolve(ROOT, pathValue);
  const lexical = relative(ROOT, absolute);
  if (lexical.startsWith('..') || isAbsolute(lexical)) fail(`${label} escapes repository lexically`);
  if (!existsSync(absolute)) fail(`${label} is missing`);
  if (lstatSync(absolute).isSymbolicLink()) fail(`${label} must not be a symbolic link`);
  const actual = realpathSync(absolute);
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) {
    fail(`${label} escapes repository through a link`);
  }
  if (!lstatSync(actual).isFile()) fail(`${label} must resolve to a file`);
  return actual;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const ledgerBytes = readFileSync(repositoryFile(LEDGER_PATH, 'ledger'));
const ledger = record(JSON.parse(ledgerBytes.toString('utf8')), 'ledger');
exactKeys(ledger, [
  'schemaVersion', 'id', 'status', 'sourceCommit', 'reviewedAt', 'scope', 'sourceAudit',
  'machinePackageCommitStatus', 'sourceAuditCommitExceptions',
  'runtimeBoundary', 'modeContracts', 'participantIdentity', 'p5ConsumerChain',
  'fallbackAndAccessibility', 'fixtureMatrix', 'hardGates', 'hardGate', 'rollback',
], 'ledger');
if (ledger.schemaVersion !== 1 || ledger.id !== 'arena.art.mode-presentation.a2.0.v1') fail('identity drift');
if (ledger.status !== 'preproduction-contract-machine-closed') fail('status drift');
if (ledger.sourceCommit !== BASELINE || ledger.reviewedAt !== '2026-08-25') fail('source/date drift');
if (ledger.machinePackageCommitStatus !== 'uncommitted-review-candidate') fail('commit status drift');
if (ledger.scope !== 'mode-runtime-readonly-presentation-contract-only-no-media-or-default-entry') fail('scope expanded');

const audits = recordArray(ledger.sourceAudit, 'sourceAudit');
if (audits.length !== EXPECTED_AUDITS.length) fail('sourceAudit count drift');
const auditPaths = audits.map((entry) => String(entry.path));
if (new Set(auditPaths).size !== auditPaths.length) fail('sourceAudit contains duplicate paths');
if (JSON.stringify(auditPaths) !== JSON.stringify([...auditPaths].sort())) fail('sourceAudit order is not canonical');
let auditedBytes = 0;
for (const [index, entry] of audits.entries()) {
  exactKeys(entry, ['path', 'byteLength', 'sha256', 'domain', 'semanticMarkers'], `sourceAudit[${index}]`);
  const [expectedPath, expectedBytes, expectedHash, expectedDomain] = EXPECTED_AUDITS[index]!;
  if (
    entry.path !== expectedPath
    || entry.byteLength !== expectedBytes
    || entry.sha256 !== expectedHash
    || entry.domain !== expectedDomain
  ) fail(`sourceAudit[${index}] identity drift`);
  const file = repositoryFile(entry.path, `sourceAudit[${index}].path`);
  const bytes = readFileSync(file);
  if (bytes.byteLength !== expectedBytes || sha256(bytes) !== expectedHash) {
    fail(`sourceAudit[${index}] bytes drift`);
  }
  auditedBytes += bytes.byteLength;
  const markers = stringArray(entry.semanticMarkers, `sourceAudit[${index}].semanticMarkers`);
  if (markers.length === 0 || new Set(markers).size !== markers.length) {
    fail(`sourceAudit[${index}] semantic markers must be non-empty and unique`);
  }
  const source = bytes.toString('utf8');
  for (const marker of markers) {
    if (marker.length === 0 || !containsMarker(source, marker)) {
      fail(`sourceAudit[${index}] semantic marker is absent: ${marker}`);
    }
  }
}

const commitExceptions = recordArray(ledger.sourceAuditCommitExceptions, 'sourceAuditCommitExceptions');
exactValue(commitExceptions, [{
  path: 'packages/arena-match/test/mode-match-runtime-v6.test.ts',
  reason: 'align-stale-optional-jump-fixture-to-current-required-six-key-runtime-contract',
  status: 'candidate-awaiting-coordinator-review',
}], 'sourceAuditCommitExceptions');

const runtimeBoundary = record(ledger.runtimeBoundary, 'runtimeBoundary');
exactKeys(runtimeBoundary, [
  'stepExactKeys', 'eventSchema', 'readFrameSchema', 'readFrameAuditExactKeys',
  'supplyFactSchema', 'supplyCadenceSchema', 'jumpAvailabilitySchema', 'atomicCommitRule',
  'terminalCommitRule', 'forbiddenRuntimeInputs',
], 'runtimeBoundary');
exactValue(runtimeBoundary.stepExactKeys, [
  'events', 'localJumpAvailability', 'readFrame', 'readFrameAudit', 'supplyCadence', 'supplyFacts',
], 'runtimeBoundary.stepExactKeys');
exactValue(runtimeBoundary.readFrameAuditExactKeys, [
  'expectedWorldSupplyIdentities', 'worldSupplyEquipmentInstanceIds',
], 'runtimeBoundary.readFrameAuditExactKeys');
if (
  runtimeBoundary.eventSchema !== 'ArenaMatchEventV6'
  || runtimeBoundary.readFrameSchema !== 'MatchReadFrameV3'
  || runtimeBoundary.supplyFactSchema !== 'ArenaSupplyAuthorityFactV1'
  || runtimeBoundary.supplyCadenceSchema !== 'ArenaSupplyCadenceSnapshotV1-or-null'
  || runtimeBoundary.jumpAvailabilitySchema !== 'ArenaLocalJumpAvailabilityV1-required-authority-capability'
  || runtimeBoundary.atomicCommitRule !== 'validate-the-complete-step-before-any-hud-audio-vfx-state-or-one-shot-commit'
  || runtimeBoundary.terminalCommitRule !== 'last-event-MatchEnded-modeResult-equals-ended-readFrame-worldSnapshot-result'
) fail('runtimeBoundary semantics drift');
exactValue(runtimeBoundary.forbiddenRuntimeInputs, [
  'stateHash', 'appliedModeCommandHash', 'commands', 'modeState', 'checkpoint', 'replay',
  'worldAuthority', 'modeDriver', 'wallClock', 'Math.random',
], 'runtimeBoundary.forbiddenRuntimeInputs');

const modes = recordArray(ledger.modeContracts, 'modeContracts');
exactValue(modes, [
  { kind: 'duel', participantCount: 'exactly-2', terminalFacts: ['winnerParticipantIds', 'isDraw', 'reason', 'endedAtTick'], specialCases: ['winner', 'draw'], presentationRule: 'result-shape-plus-text-never-color-only' },
  { kind: 'race', participantCount: '2-to-4', terminalFacts: ['winnerParticipantIds', 'rankings', 'reason', 'endedAtTick'], specialCases: ['shared-rank', 'no-finisher', 'respawn-scheduled', 'respawned', 'safe-anchor', 'finish-claimed'], presentationRule: 'rank-finish-progress-and-respawn-are-read-only-authority-facts' },
  { kind: 'survival', participantCount: 'one-player-plus-validated-enemy-slots', terminalFacts: ['playerParticipantId', 'survivedTicks', 'pressureStage', 'fallCount', 'reason', 'endedAtTick'], specialCases: ['first-fall-1-of-2', 'terminal-fall-2-of-2', 'supply-facts', 'supply-cadence', 'pressure-stage', 'enemy-slot-generation'], presentationRule: 'fall-supply-pressure-and-terminal-meaning-come-only-from-events-and-frame' },
], 'modeContracts');

const identity = record(ledger.participantIdentity, 'participantIdentity');
exactKeys(identity, [
  'source', 'supportedCompetitorCount', 'requiredChannels', 'colorIsNeverSoleChannel',
  'liveCueSecondAuthorityForbidden',
], 'participantIdentity');
if (identity.source !== 'ProductPublicMatchInfoV2.publicParticipants') fail('participant identity source drift');
exactValue(identity.supportedCompetitorCount, [2, 3, 4], 'participantIdentity.supportedCompetitorCount');
exactValue(identity.requiredChannels, [
  'identityOrdinal', 'identityGlyphKey', 'identityPatternKey', 'displayName',
], 'participantIdentity.requiredChannels');
if (identity.colorIsNeverSoleChannel !== true || identity.liveCueSecondAuthorityForbidden !== true) {
  fail('participant non-color/authority boundary drift');
}

const chain = record(ledger.p5ConsumerChain, 'p5ConsumerChain');
exactKeys(chain, [
  'consumerEpochOwner', 'validatedInputOwner', 'effectConsumer', 'audioResolver', 'vfxResolvers',
  'epochRules', 'readonlyOnly', 'defaultEntryWired',
], 'p5ConsumerChain');
if (
  chain.consumerEpochOwner !== 'ArenaV2ModeHudPresentationHostV1'
  || chain.validatedInputOwner !== 'ArenaV2ModeHudValidatedPresentationHostV1'
  || chain.effectConsumer !== 'ArenaV2ModeHudFeedbackEffectConsumerV1'
  || chain.audioResolver !== 'ArenaV2FormalAudioCueResolutionCandidateV1'
  || chain.readonlyOnly !== true
  || chain.defaultEntryWired !== false
) fail('P5 owner/read-only/default boundary drift');
exactValue(chain.vfxResolvers, [
  'ArenaV2FormalPassthroughVfxSemanticCandidateV1',
  'ArenaV2TwentyWeaponFormalVfxStyleCandidateV1',
], 'p5ConsumerChain.vfxResolvers');
exactValue(chain.epochRules, [
  'trimmed-non-empty-identity', 'same-epoch-waterline-continuity', 'old-epoch-callback-rejected',
  'epoch-switch-clears-visual-and-stops-audio', 'same-event-id-cannot-drift',
], 'p5ConsumerChain.epochRules');

const fallback = record(ledger.fallbackAndAccessibility, 'fallbackAndAccessibility');
exactKeys(fallback, [
  'reducedMotion', 'muted', 'assetFailure', 'unknownOrDrift', 'programmaticProductionNormalPath',
], 'fallbackAndAccessibility');
if (
  fallback.reducedMotion !== 'consume-the-same-identity-and-retain-static-shape-text-and-result-with-zero-optional-motion'
  || fallback.muted !== 'retain-all-text-shape-glyph-rank-fall-supply-and-terminal-information-without-replay-on-unmute'
  || fallback.assetFailure !== 'neutral-text-glyph-pattern-fallback-only-no-rule-inference'
  || fallback.unknownOrDrift !== 'reject-the-whole-step-before-side-effects-and-clear-time-sensitive-presentation-state'
  || fallback.programmaticProductionNormalPath !== false
) fail('fallback/accessibility boundary drift');

const fixtures = recordArray(ledger.fixtureMatrix, 'fixtureMatrix');
if (fixtures.length !== EXPECTED_FIXTURES.length) fail('fixtureMatrix count drift');
const fixtureIds = fixtures.map((entry) => String(entry.id));
if (new Set(fixtureIds).size !== fixtureIds.length) fail('fixtureMatrix ids must be unique');
for (const [index, fixture] of fixtures.entries()) {
  exactKeys(fixture, ['id', 'sourcePath', 'marker'], `fixtureMatrix[${index}]`);
  const [id, sourcePath, marker] = EXPECTED_FIXTURES[index]!;
  if (fixture.id !== id || fixture.sourcePath !== sourcePath || fixture.marker !== marker) {
    fail(`fixtureMatrix[${index}] identity drift`);
  }
  if (!auditPaths.includes(sourcePath)) fail(`fixtureMatrix[${index}] source is not audited`);
  const source = readFileSync(repositoryFile(sourcePath, `fixtureMatrix[${index}].sourcePath`), 'utf8');
  if (!containsMarker(source, marker)) fail(`fixtureMatrix[${index}] marker is absent`);
}

const gates = record(ledger.hardGates, 'hardGates');
exactKeys(gates, [
  'a2MachineContractClosed', 'a0_3HumanApproved', 'a1_1ProductionAssetApproved',
  'a2RuntimeEvidencePassed', 'browserVerified', 'deviceVerified', 'performanceVerified',
  'humanVerified', 'blockoutAllowed', 'defaultBundleWired', 'defaultPreloaderWired',
  'defaultCompositionWired', 'defaultEntryWired',
], 'hardGates');
if (gates.a2MachineContractClosed !== true) fail('machine contract closure must remain explicit');
for (const key of Object.keys(gates).filter((key) => key !== 'a2MachineContractClosed')) {
  if (gates[key] !== false) fail(`downstream hard gate opened: ${key}`);
}
if (ledger.hardGate !== false) fail('A2.0 hard gate must remain false');
if (ledger.rollback !== 'remove-only-this-A2.0-machine-ledger-checker-probe-and-document-status-update; preserve-P2-P5-production-sources-A0.3-A1.0-A1.1-and-all-assets') {
  fail('rollback boundary drift');
}

process.stdout.write(`${JSON.stringify({
  status: ledger.status,
  sourceCommit: ledger.sourceCommit,
  auditedSourceCount: audits.length,
  auditedBytes,
  fixtureCount: fixtures.length,
  stepExactKeys: runtimeBoundary.stepExactKeys,
  hardGate: false,
  defaultEntryWired: false,
})}\n`);
