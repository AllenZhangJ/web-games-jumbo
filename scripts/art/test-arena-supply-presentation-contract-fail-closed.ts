import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

type JsonRecord = Record<string, unknown>;

const ROOT = resolve(import.meta.dirname, '../..');
const CONTRACT_PATH = 'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v1.json';
const CHECKER = resolve(ROOT, 'scripts/art/check-arena-supply-presentation-contract.ts');
const original = JSON.parse(readFileSync(resolve(ROOT, CONTRACT_PATH), 'utf8')) as JsonRecord;
const tempRoot = mkdtempSync(resolve(tmpdir(), 'arena-a10-contract-'));
let expectedFailures = 0;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function writeContract(value: JsonRecord): void {
  const path = resolve(tempRoot, CONTRACT_PATH);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
function run(): string {
  return execFileSync(process.execPath, ['--import', 'tsx', CHECKER], {
    cwd: ROOT,
    env: { ...process.env, ARENA_A10_CHECK_ROOT: tempRoot },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function mustFail(name: string, mutate: (value: JsonRecord) => void): void {
  expectedFailures += 1;
  const candidate = clone(original);
  mutate(candidate);
  writeContract(candidate);
  try { run(); } catch { return; }
  throw new Error(`A1.0 fail-closed probe unexpectedly passed: ${name}`);
}

try {
  for (const source of original.sourceAudit as JsonRecord[]) {
    const sourcePath = String(source.path);
    const destination = resolve(tempRoot, sourcePath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(resolve(ROOT, sourcePath), destination);
  }
  writeContract(original);
  const positive = JSON.parse(run()) as JsonRecord;
  if (positive.status !== 'contract-ready' || positive.hardGatePassed !== true || positive.runtimeAdapterTested !== false || positive.a1Passed !== false || positive.blockoutAllowed !== false) throw new Error('positive signed contract probe status drift');

  mustFail('missing strict payload field', (value) => { ((value.eventShapes as JsonRecord[])[0]?.payloadFields as unknown[]).pop(); });
  mustFail('future strict payload field', (value) => { ((value.eventShapes as JsonRecord[])[0]?.payloadFields as unknown[]).push('futureField'); });
  mustFail('unknown event type', (value) => { const shape = (value.eventShapes as JsonRecord[])[0]; if (shape) shape.type = 'EquipmentFuture'; });
  mustFail('ordinary flat spawn loses bypass', (value) => { const shape = (value.eventShapes as JsonRecord[])[1]; if (shape) shape.adapterDisposition = 'consume-supply-lifecycle'; });
  mustFail('ordinary flat spawn accepts payload', (value) => { ((value.eventShapes as JsonRecord[])[1]?.outerForbiddenFields as unknown[]).pop(); });
  mustFail('strict spawn accepts mixed flat field', (value) => { ((value.eventShapes as JsonRecord[])[0]?.outerForbiddenFields as unknown[]).pop(); });
  mustFail('pickup no longer requires active match', (value) => { (value.routingRules as JsonRecord).activeSupplyPickupRule = 'delete any equipment marker'; });
  mustFail('ordinary pickup no longer bypasses', (value) => { (value.routingRules as JsonRecord).ordinaryPickupBypassRule = 'reject every ordinary pickup'; });
  mustFail('adapter processes event without complete active projection', (value) => { (value.routingRules as JsonRecord).adapterReadinessRule = 'process immediately'; });
  mustFail('pickup terminal rule keeps unbounded terminal history', (value) => { const shape = (value.eventShapes as JsonRecord[])[2]; if (shape) shape.terminalRule = 'keep every terminal supply identity forever'; });
  mustFail('replacement waits for generic pickup', (value) => { (value.routingRules as JsonRecord).replacementTerminalRule = 'wait for EquipmentPickedUp'; });
  mustFail('strict terminal event can miss active identity', (value) => { (value.routingRules as JsonRecord).strictTerminalMatchRule = 'ignore missing active identity'; });
  mustFail('common envelope gains payload', (value) => { ((value.authority as JsonRecord).commonEnvelopeFields as unknown[]).push('payload'); });
  mustFail('wall-clock deletion enabled', (value) => { (value.tickProjection as JsonRecord).wallClockDeletionForbidden = false; });
  mustFail('599 boundary hidden early', (value) => { (((value.tickProjection as JsonRecord).boundaryFixtures as JsonRecord[])[0] as JsonRecord).worldVisible = false; });
  mustFail('future tick projection field', (value) => { (value.tickProjection as JsonRecord).future = true; });
  mustFail('missing boundary field', (value) => { delete (((value.tickProjection as JsonRecord).boundaryFixtures as JsonRecord[])[1] as JsonRecord).pickupEligible; });
  mustFail('choice UI enabled', (value) => { (value.semantics as JsonRecord).notAChoiceUi = false; });
  mustFail('future semantic token field', (value) => { (((value.semantics as JsonRecord).tokens as JsonRecord[])[0] as JsonRecord).future = true; });
  mustFail('source hash drift', (value) => { ((value.sourceAudit as JsonRecord[])[0] as JsonRecord).sha256 = '0'.repeat(64); });
  mustFail('source path escape', (value) => { ((value.sourceAudit as JsonRecord[])[0] as JsonRecord).path = '../escape.ts'; });
  mustFail('30fps fixture removed', (value) => { (value.proposedBudgets as JsonRecord).requiredFrameRateFixture = 60; });
  mustFail('active identity budget exceeds authority spawn count', (value) => { (value.proposedBudgets as JsonRecord).activeSupplyIdentities = 4; });
  mustFail('recent event ring becomes unbounded', (value) => { (value.proposedBudgets as JsonRecord).recentCanonicalEventHashRingEntries = 65; });
  mustFail('pending replacement pairs become unbounded', (value) => { (value.proposedBudgets as JsonRecord).pendingReplacementPairs = 4; });
  mustFail('future budget field', (value) => { (value.proposedBudgets as JsonRecord).future = 1; });
  mustFail('formal input text drift', (value) => { (value.formalRepresentativeInputs as unknown[])[0] = 'A0.3 passed'; });
  mustFail('fixture plan removes ordinary bypass', (value) => { (value.testFixturePlan as unknown[]).splice(1, 1); });
  mustFail('disconnect recovery processes without ledger', (value) => { (value.resilience as JsonRecord).disconnectRecovery = 'process event and infer identity'; });
  mustFail('old event outside ring replays cue', (value) => { (value.resilience as JsonRecord).outOfOrder = 'apply every old event'; });
  mustFail('replay seek reuses previous epoch ring', (value) => { (value.resilience as JsonRecord).replay = 'reuse ring across epochs'; });
  mustFail('circular measured evidence required to start', (value) => { (value.formalRepresentativeInputs as unknown[])[5] = 'measured GPU, overdraw, memory, voice and lifecycle evidence'; });
  mustFail('signed contract status reverted to candidate', (value) => { value.status = 'contract-ready-candidate'; });
  mustFail('signed contract status expanded to integrated', (value) => { value.status = 'integrated'; });
  mustFail('coordinator sign-off reverted', (value) => { (value.hardGates as JsonRecord).a1_0CoordinatorSignOff = false; });
  mustFail('A1.0 contract pass reverted', (value) => { (value.hardGates as JsonRecord).a1_0ContractPassed = false; });
  mustFail('A1.0 score hard gate reverted', (value) => { (value.score as JsonRecord).hardGatePassed = false; });
  for (const gate of ['a1RepresentativeSpecimenStarted', 'a1Passed', 'a0_3Passed', 'blockoutAllowed', 'productionVfxIntegrated', 'productionAudioIntegrated', 'deviceVerified', 'humanVerified', 'finalPassed']) {
    mustFail(`downstream gate opened: ${gate}`, (value) => { (value.hardGates as JsonRecord)[gate] = true; });
  }
  mustFail('score inflated', (value) => { (value.score as JsonRecord).total = 100; });
  mustFail('future score field', (value) => { (value.score as JsonRecord).future = true; });
  mustFail('dimension content drift', (value) => { (((value.score as JsonRecord).dimensions as JsonRecord[])[0] as JsonRecord).score = 25; });
  mustFail('future dimension field', (value) => { (((value.score as JsonRecord).dimensions as JsonRecord[])[0] as JsonRecord).future = true; });
  mustFail('future contract field', (value) => { value.future = true; });

  process.stdout.write(`${JSON.stringify({ positiveSignedContract: 1, expectedFailures, runtimeAdapterTested: false, a1Passed: false, blockoutAllowed: false, status: 'pass' })}\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
