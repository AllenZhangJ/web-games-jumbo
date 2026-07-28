import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

type JsonRecord = Record<string, unknown>;
type ShapeExpectation = {
  readonly type: string;
  readonly outerRequiredFields: readonly string[];
  readonly outerOptionalFields: readonly string[];
  readonly outerForbiddenFields: readonly string[];
  readonly payloadFields: readonly string[];
  readonly adapterDisposition: string;
  readonly terminalRule: string;
};

const ROOT = resolve(process.env.ARENA_A10_CHECK_ROOT ?? resolve(import.meta.dirname, '../..'));
const CONTRACT_PATH = 'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v1.json';
const COMMON = ['id', 'sequence', 'tick', 'type'] as const;
const STRICT_IDENTITY = ['schemaVersion', 'supplyDefinitionId', 'supplyId', 'equipmentInstanceId', 'spawnTick', 'expireTick', 'tick'] as const;
const EXPECTED_SHAPES = new Map<string, ShapeExpectation>([
  ['supply-spawned-strict', {
    type: 'EquipmentSpawned', outerRequiredFields: [...COMMON, 'payload'], outerOptionalFields: [], outerForbiddenFields: ['equipmentInstanceId', 'equipmentDefinitionId', 'spawnId', 'position'],
    payloadFields: [...STRICT_IDENTITY, 'equipmentDefinitionId', 'spawnId', 'position'], adapterDisposition: 'consume-supply-lifecycle', terminalRule: 'remains active until matched supply pickup, replacement, expiry or authoritative resync removal',
  }],
  ['ordinary-spawned-flat-bypass', {
    type: 'EquipmentSpawned', outerRequiredFields: [...COMMON, 'equipmentInstanceId', 'equipmentDefinitionId', 'spawnId', 'position'], outerOptionalFields: [], outerForbiddenFields: ['payload'], payloadFields: [],
    adapterDisposition: 'bypass-known-ordinary-event', terminalRule: 'not tracked by supply lifecycle adapter',
  }],
  ['ordinary-picked-up-flat-conditional', {
    type: 'EquipmentPickedUp', outerRequiredFields: [...COMMON, 'participantId', 'equipmentInstanceId', 'equipmentDefinitionId'], outerOptionalFields: [], outerForbiddenFields: ['payload', 'supplyId', 'spawnTick', 'expireTick'], payloadFields: ['participantId', 'equipmentInstanceId', 'equipmentDefinitionId'],
    adapterDisposition: 'consume-only-if-equipment-id-matches-one-active-validated-supply-otherwise-bypass-no-active-match-or-fail-closed', terminalRule: 'with a ready bounded active supply ledger, terminate exactly one uniquely matched active supply; no active match bypasses with no cue or marker change; definition conflict or multiple active matches fail closed',
  }],
  ['supply-recycled-strict', {
    type: 'EquipmentRecycled', outerRequiredFields: [...COMMON, 'payload'], outerOptionalFields: [], outerForbiddenFields: ['participantId', 'equipmentInstanceId', 'supplyId'], payloadFields: [...STRICT_IDENTITY, 'participantId', 'recycledEquipmentInstanceId', 'replacementEquipmentInstanceId', 'reason'],
    adapterDisposition: 'consume-supply-replacement-pair-start', terminalRule: 'require one matching active supply identity, then hold at most one pending pair for it until the immediately paired EquipmentReplaced identity validates; no active match fails closed',
  }],
  ['supply-replaced-strict', {
    type: 'EquipmentReplaced', outerRequiredFields: [...COMMON, 'payload'], outerOptionalFields: [], outerForbiddenFields: ['participantId', 'equipmentInstanceId', 'supplyId'], payloadFields: [...STRICT_IDENTITY, 'participantId', 'previousEquipmentInstanceId', 'nextEquipmentInstanceId'],
    adapterDisposition: 'consume-supply-replacement-pair-terminal', terminalRule: 'require one matching active supply identity and pending recycle pair; paired Replaced terminates target marker once, clears pending and never waits for EquipmentPickedUp; no active match fails closed',
  }],
  ['supply-expired-strict', {
    type: 'EquipmentExpired', outerRequiredFields: [...COMMON, 'payload'], outerOptionalFields: [], outerForbiddenFields: ['equipmentInstanceId', 'expiredEquipmentInstanceId', 'supplyId'], payloadFields: [...STRICT_IDENTITY, 'expiredEquipmentInstanceId', 'reason'],
    adapterDisposition: 'consume-supply-lifecycle-terminal', terminalRule: 'require and terminate exactly one matched active supply at expireTick; no active match, definition conflict or multiple match fails closed',
  }],
]);
const EXPECTED_ROUTING = {
  adapterReadinessRule: 'before processing any event, require gap-free history or an eventSequence-bound complete active supply lifecycle projection; otherwise enter resync and process nothing',
  supplySpawnPredicate: 'EquipmentSpawned has exactly the common envelope plus payload, no flat equipment fields, and strict payload identity validates',
  ordinarySpawnBypassPredicate: 'EquipmentSpawned has exactly the common envelope plus flat equipmentInstanceId/equipmentDefinitionId/spawnId/position and no payload',
  ambiguousSpawnRule: 'payload mixed with any flat spawned field, neither legal shape, or malformed strict payload fails closed and creates no marker',
  activeSupplyPickupRule: 'with a ready bounded active ledger, EquipmentPickedUp terminates only the single active supply whose equipmentInstanceId and equipmentDefinitionId both match',
  ordinaryPickupBypassRule: 'with a ready bounded active ledger, a legal flat EquipmentPickedUp matching no active supply bypasses, emits no supply cue and changes no supply marker',
  pickupConflictRule: 'an equipmentInstanceId active match with definition mismatch or more than one active match removes no marker and requests authoritative resync',
  replacementTerminalRule: 'a contiguous identity-matched EquipmentRecycled then EquipmentReplaced pair terminates the target supply; EquipmentPickedUp is neither awaited nor consumed for replacement',
  strictTerminalMatchRule: 'EquipmentRecycled, EquipmentReplaced and EquipmentExpired must each match exactly one active supply identity; no match or conflicting match fails closed',
} as const;
const REQUIRED_FIXTURES = [
  'spawn-three-physical-entities-without-modal',
  'ordinary-flat-equipment-spawn-bypasses-supply-adapter',
  'mixed-flat-and-payload-spawn-fails-closed',
  'active-supply-flat-pickup-terminates-exactly-one-marker',
  'flat-pickup-not-matching-active-bypasses-without-cue-or-marker-change',
  'definition-conflict-or-multiple-active-pickup-fails-closed',
  'missing-history-or-bound-active-projection-enters-resync-before-any-event',
  'replacement-pair-terminates-without-waiting-for-picked-up',
  'strict-replacement-without-active-match-fails-closed',
  'strict-expiry-without-active-match-fails-closed',
  'remaining-tick-599-600-601',
  'same-tick-expire-before-pickup',
  'same-tick-recycle-before-replace-and-pickup-before-action',
  'duplicate-identical-event-idempotent',
  'duplicate-conflicting-event-fail-closed',
  'event-older-than-recent-ring-never-applies-or-replays-one-shot',
  'sequence-gap-and-out-of-order-resync',
  'missing-required-and-future-field-rejected',
  'pause-resume-no-wall-clock-progress',
  '30fps-terminal-state-exact',
  'replay-forward-and-catch-up-no-double-one-shot',
  'replay-seek-or-reset-starts-new-epoch-and-clears-ring-and-pending',
  'asset-failure-accessible-fallback-does-not-pass-asset-gate',
  'reduced-motion-and-silent-equivalence',
  'destroy-twice-no-live-resources',
] as const;
const FORMAL_INPUTS = [
  'A0.3 human blind test coordinator approval with at least 10 qualified people',
  'approved gap-free event history or eventSequence-bound complete active supply lifecycle projection',
  'approved representative equipment silhouette/icon and provenance',
  'approved temporary VFX/audio source manifests with license and hashes',
  'target desktop and 390x844 capture harness',
  'approved measurement plan, budget thresholds and capture method for GPU, overdraw, memory, voice and lifecycle',
] as const;
const EXPECTED_RESILIENCE = {
  duplicate: 'keep one lastAppliedSequence waterline plus a 64-entry recent canonical hash ring; sequence at or below waterline and present with identical hash is ignored, while conflicting hash fails closed',
  outOfOrder: 'next sequence must equal lastAppliedSequence plus one; a forward gap enters resync, while an event older than the 64-entry ring is never applied and never replays a one-shot',
  disconnectRecovery: 'require gap-free history or an eventSequence-bound complete active supply lifecycle projection before processing any event; otherwise the entire adapter enters resync, processes nothing and hides countdown',
  pauseResume: 'frozen authority tick freezes all persistent progress; no wall-clock catch-up',
  replay: 'seek or reset creates a new projection epoch, clears the recent hash ring and pending replacement pairs, restores bounded active identities, and never reuses dedupe state across epochs',
  assetFailure: 'diagnostic geometry plus icon code is accessibility fallback only and fails representative-asset gate',
  unknownOrFuture: 'unknown type, schema, field or missing required field fails closed without best-effort rendering',
  destroy: 'idempotently clear active identities, lastAppliedSequence, recent hash ring, pending replacement pairs, current projection epoch, markers, particles, audio voices, listeners and pooled references',
} as const;

function fail(message: string): never { throw new Error(`A1.0 supply presentation contract failed: ${message}`); }
function object(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as JsonRecord;
}
function records(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((item, index) => object(item, `${label}[${index}]`));
}
function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) fail(`${label} must be a string array`);
  return value as string[];
}
function exactKeys(value: JsonRecord, expected: readonly string[], label: string): void {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) fail(`${label} contains missing or future fields`);
}
function exactArray(value: unknown, expected: readonly unknown[], label: string): void {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(`${label} drift`);
}
function repositoryFile(path: unknown, label: string): string {
  if (typeof path !== 'string' || !path || isAbsolute(path)) fail(`${label} must be a non-empty repository-relative path`);
  const absolute = resolve(ROOT, path);
  const lexical = relative(ROOT, absolute);
  if (lexical.startsWith('..') || isAbsolute(lexical)) fail(`${label} escapes repository lexically`);
  let actual: string;
  try { actual = realpathSync(absolute); } catch { fail(`${label} does not exist: ${path}`); }
  const actualRelative = relative(realpathSync(ROOT), actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) fail(`${label} escapes repository through symlink`);
  if (!lstatSync(actual).isFile()) fail(`${label} must resolve to a file`);
  return actual;
}
function sha256(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }

const contract = object(JSON.parse(readFileSync(repositoryFile(CONTRACT_PATH, 'contract'), 'utf8')), 'contract');
exactKeys(contract, ['schemaVersion', 'id', 'status', 'baselineCommit', 'reviewedAt', 'scope', 'authority', 'eventShapes', 'routingRules', 'tickProjection', 'semantics', 'resilience', 'accessibility', 'proposedBudgets', 'testFixturePlan', 'formalRepresentativeInputs', 'hardGates', 'score', 'sourceAudit', 'missingMandatorySkillReferences'], 'contract');
if (contract.schemaVersion !== 1 || contract.id !== 'arena.art.supply-presentation.a1.0.v1' || contract.status !== 'contract-ready' || contract.scope !== 'contract-and-fixture-plan-only') fail('identity/status/scope drift');
if (contract.baselineCommit !== 'dd786a922625472643b2f6c96f80c7049a57d3e2' || contract.reviewedAt !== '2026-07-28') fail('baseline/date drift');

const authority = object(contract.authority, 'authority');
exactKeys(authority, ['fixedHz', 'spawnCount', 'spawnIntervalTicks', 'pickupRadius', 'lifetimeTicks', 'replacementPolicy', 'expiryPolicy', 'tickOrder', 'commonEnvelopeFields', 'payloadSchemaVersion'], 'authority');
if (authority.fixedHz !== 60 || authority.spawnCount !== 3 || authority.spawnIntervalTicks !== 1200 || authority.pickupRadius !== 0.8 || authority.lifetimeTicks !== 600 || authority.replacementPolicy !== 'atomic-recycle-held' || authority.expiryPolicy !== 'world-only-at-expire-tick' || authority.payloadSchemaVersion !== 1) fail('frozen authority values drift');
exactArray(authority.tickOrder, ['spawn', 'expire', 'pickup', 'action'], 'authority.tickOrder');
exactArray(authority.commonEnvelopeFields, COMMON, 'authority.commonEnvelopeFields');

const shapes = records(contract.eventShapes, 'eventShapes');
if (shapes.length !== EXPECTED_SHAPES.size || new Set(shapes.map((shape) => shape.shapeId)).size !== shapes.length) fail('event shape set must contain six unique shapes');
for (const shape of shapes) {
  const shapeId = String(shape.shapeId);
  exactKeys(shape, ['shapeId', 'type', 'outerRequiredFields', 'outerOptionalFields', 'outerForbiddenFields', 'payloadFields', 'adapterDisposition', 'presentationState', 'cue', 'terminalRule'], `eventShape.${shapeId}`);
  const expected = EXPECTED_SHAPES.get(shapeId);
  if (!expected || shape.type !== expected.type || shape.adapterDisposition !== expected.adapterDisposition || shape.terminalRule !== expected.terminalRule) fail(`${shapeId} routing semantics drift`);
  exactArray(shape.outerRequiredFields, expected.outerRequiredFields, `${shapeId}.outerRequiredFields`);
  exactArray(shape.outerOptionalFields, expected.outerOptionalFields, `${shapeId}.outerOptionalFields`);
  exactArray(shape.outerForbiddenFields, expected.outerForbiddenFields, `${shapeId}.outerForbiddenFields`);
  exactArray(shape.payloadFields, expected.payloadFields, `${shapeId}.payloadFields`);
  if (typeof shape.presentationState !== 'string' || shape.presentationState.length < 8 || typeof shape.cue !== 'string' || shape.cue.length < 20) fail(`${shapeId} cue mapping incomplete`);
}
const routing = object(contract.routingRules, 'routingRules');
exactKeys(routing, Object.keys(EXPECTED_ROUTING), 'routingRules');
for (const [key, expected] of Object.entries(EXPECTED_ROUTING)) if (routing[key] !== expected) fail(`routingRules.${key} drift`);

const tick = object(contract.tickProjection, 'tickProjection');
exactKeys(tick, ['formula', 'secondsLabelFormula', 'visibleLabels', 'boundaryFixtures', 'wallClockDeletionForbidden', 'zeroSecondLingeringForbidden'], 'tickProjection');
if (tick.formula !== 'remainingTicks=max(0,expireTick-currentSnapshotTick)' || tick.secondsLabelFormula !== 'ceil(remainingTicks/60)' || tick.wallClockDeletionForbidden !== true || tick.zeroSecondLingeringForbidden !== true) fail('tick projection drift');
exactArray(tick.visibleLabels, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 'tickProjection.visibleLabels');
const boundaries = records(tick.boundaryFixtures, 'tickProjection.boundaryFixtures');
if (boundaries.length !== 3) fail('three boundary fixtures required');
exactKeys(boundaries[0] ?? {}, ['offset', 'remainingTicks', 'worldVisible', 'pickupEligible'], 'boundary.599');
exactKeys(boundaries[1] ?? {}, ['offset', 'remainingTicks', 'worldVisible', 'pickupEligible'], 'boundary.600');
exactKeys(boundaries[2] ?? {}, ['offset', 'remainingTicks', 'worldVisible', 'duplicateExpiry'], 'boundary.601');
exactArray(boundaries, [{ offset: 599, remainingTicks: 1, worldVisible: true, pickupEligible: true }, { offset: 600, remainingTicks: 0, worldVisible: false, pickupEligible: false }, { offset: 601, remainingTicks: 0, worldVisible: false, duplicateExpiry: false }], 'tickProjection.boundaryFixtures');

const semantics = object(contract.semantics, 'semantics');
exactKeys(semantics, ['notAChoiceUi', 'newInputForbidden', 'pauseOrModalForbidden', 'colorIsNeverSoleEncoding', 'tokens'], 'semantics');
for (const flag of ['notAChoiceUi', 'newInputForbidden', 'pauseOrModalForbidden', 'colorIsNeverSoleEncoding']) if (semantics[flag] !== true) fail(`semantics.${flag} must fail closed`);
const tokens = records(semantics.tokens, 'semantics.tokens');
if (tokens.length !== 5) fail('five semantic token mappings required');
for (const token of tokens) {
  exactKeys(token, ['meaning', 'color', 'shape', 'textureOrIcon'], `semanticToken.${String(token.meaning)}`);
  for (const key of ['meaning', 'color', 'shape', 'textureOrIcon']) if (typeof token[key] !== 'string' || !String(token[key]).trim()) fail(`semantic token ${String(token.meaning)}.${key} missing`);
}

const resilience = object(contract.resilience, 'resilience');
exactKeys(resilience, Object.keys(EXPECTED_RESILIENCE), 'resilience');
for (const [key, expected] of Object.entries(EXPECTED_RESILIENCE)) if (resilience[key] !== expected) fail(`resilience.${key} drift`);
const accessibility = object(contract.accessibility, 'accessibility');
exactKeys(accessibility, ['reducedMotion', 'silent', 'colorVision', 'screenReader'], 'accessibility');
for (const value of Object.values(accessibility)) if (typeof value !== 'string' || value.length < 30) fail('accessibility equivalence incomplete');

const budgets = object(contract.proposedBudgets, 'proposedBudgets');
const expectedBudgets = { status: 'unmeasured-contract-ceilings', persistentWorldMarkers: 3, desktopBurstParticlesPerMarker: 24, mobileBurstParticlesPerMarker: 12, desktopConcurrentSupplyParticles: 72, mobileConcurrentSupplyParticles: 36, additiveLayers: 1, distortionPasses: 0, countdownAudioLoops: 0, simultaneousSupplyOneShots: 4, requiredFrameRateFixture: 30, activeSupplyIdentities: 3, recentCanonicalEventHashRingEntries: 64, pendingReplacementPairs: 3, lastAppliedSequenceWatermarks: 1, projectionEpochsRetained: 1 };
exactKeys(budgets, Object.keys(expectedBudgets), 'proposedBudgets');
if (JSON.stringify(budgets) !== JSON.stringify(expectedBudgets)) fail('proposed budget ceilings drift');
exactArray(contract.testFixturePlan, REQUIRED_FIXTURES, 'testFixturePlan');
exactArray(contract.formalRepresentativeInputs, FORMAL_INPUTS, 'formalRepresentativeInputs');

const gates = object(contract.hardGates, 'hardGates');
const gateKeys = ['a1_0CoordinatorSignOff', 'a1_0ContractPassed', 'a1RepresentativeSpecimenStarted', 'a1Passed', 'a0_3Passed', 'blockoutAllowed', 'productionVfxIntegrated', 'productionAudioIntegrated', 'deviceVerified', 'humanVerified', 'finalPassed'];
exactKeys(gates, gateKeys, 'hardGates');
if (gates.a1_0CoordinatorSignOff !== true || gates.a1_0ContractPassed !== true) fail('A1.0 coordinator/contract sign-off must remain true');
for (const key of gateKeys.slice(2)) if (gates[key] !== false) fail(`downstream gate ${key} must remain false`);
const score = object(contract.score, 'score');
exactKeys(score, ['basis', 'total', 'maximum', 'hardGatePassed', 'dimensions'], 'score');
if (score.basis !== 'A1.0 contract completeness only; no asset, device, runtime integration or human maturity') fail('score basis drift');
const dimensions = records(score.dimensions, 'score.dimensions');
const expectedDimensions = [
  { id: 'authority-audit', score: 24, maximum: 25 }, { id: 'event-to-cue-mapping', score: 19, maximum: 20 }, { id: 'accessibility-semantics', score: 14, maximum: 15 },
  { id: 'resilience-replay', score: 14, maximum: 15 }, { id: 'budget-lifecycle', score: 13, maximum: 15 }, { id: 'evidence-fixture-governance', score: 10, maximum: 10 },
];
for (const [index, dimension] of dimensions.entries()) exactKeys(dimension, ['id', 'score', 'maximum'], `score.dimensions[${index}]`);
exactArray(dimensions, expectedDimensions, 'score.dimensions');
if (score.total !== 94 || score.maximum !== 100 || score.hardGatePassed !== true || dimensions.reduce((sum, item) => sum + Number(item.score), 0) !== 94 || dimensions.reduce((sum, item) => sum + Number(item.maximum), 0) !== 100) fail('score arithmetic/status drift');
for (const dimension of dimensions) if (Number(dimension.score) / Number(dimension.maximum) < 0.8) fail(`score ${String(dimension.id)} below 80%`);

const sources = records(contract.sourceAudit, 'sourceAudit');
if (sources.length !== 15 || new Set(sources.map((source) => source.path)).size !== 15) fail('source audit must bind 15 unique files');
for (const source of sources) {
  exactKeys(source, ['path', 'byteLength', 'sha256'], `source.${String(source.path)}`);
  const bytes = readFileSync(repositoryFile(source.path, `source.${String(source.path)}`));
  if (source.byteLength !== bytes.length || source.sha256 !== sha256(bytes)) fail(`source identity drift: ${String(source.path)}`);
}
const missing = strings(contract.missingMandatorySkillReferences, 'missingMandatorySkillReferences');
exactArray(missing, ['docs/collaboration-protocol.md', 'docs/game-design-theory.md'], 'missingMandatorySkillReferences');
if (missing.some((path) => existsSync(resolve(ROOT, path)))) fail('missing skill-reference ledger drift');

process.stdout.write(`${JSON.stringify({ status: contract.status, score: score.total, hardGatePassed: true, eventShapes: shapes.length, sources: sources.length, contractFixtures: REQUIRED_FIXTURES.length, runtimeAdapterTested: false, a1Passed: false, blockoutAllowed: false })}\n`);
