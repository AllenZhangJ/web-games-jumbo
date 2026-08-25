import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type JsonRecord = Record<string, unknown>;

const ROOT = resolve(import.meta.dirname, '../..');
const LEDGER = 'docs/quality/art/mode/arena-a2.0-mode-presentation-contract-v1.json';
const CHECKER = resolve(ROOT, 'scripts/art/check-arena-mode-presentation-contract-a2.0.ts');
const source = JSON.parse(readFileSync(resolve(ROOT, LEDGER), 'utf8')) as JsonRecord;

function record(value: unknown): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('probe fixture expected an object');
  }
  return value as JsonRecord;
}

function records(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) throw new TypeError('probe fixture expected an array');
  for (const entry of value) record(entry);
  return value as JsonRecord[];
}

function clone(): JsonRecord {
  return structuredClone(source) as JsonRecord;
}

function copyFile(root: string, path: string): void {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(resolve(ROOT, path), target);
}

function run(root: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ['--import', 'tsx', CHECKER], {
    cwd: ROOT,
    env: { ...process.env, ARENA_A20_CHECK_ROOT: root },
    encoding: 'utf8',
  });
}

const tempRoot = mkdtempSync(resolve(tmpdir(), 'arena-a20-mode-contract-'));
const outsideRoot = mkdtempSync(resolve(tmpdir(), 'arena-a20-outside-'));
try {
  copyFile(tempRoot, LEDGER);
  for (const audit of records(source.sourceAudit)) copyFile(tempRoot, String(audit.path));
  const ledgerPath = resolve(tempRoot, LEDGER);
  const positive = run(tempRoot);
  if (positive.status !== 0) throw new Error(`positive fixture failed: ${positive.stderr}`);

  let expectedFailures = 0;
  function mustFail(label: string, mutate: (value: JsonRecord) => void): void {
    const candidate = clone();
    mutate(candidate);
    writeFileSync(ledgerPath, `${JSON.stringify(candidate, null, 2)}\n`);
    const result = run(tempRoot);
    if (result.status === 0) throw new Error(`expected fail-closed rejection: ${label}`);
    expectedFailures += 1;
  }

  mustFail('future root field', (value) => { value.future = true; });
  mustFail('schema drift', (value) => { value.schemaVersion = 2; });
  mustFail('identity drift', (value) => { value.id = 'arena.art.mode-presentation.a2.0.v2'; });
  mustFail('status promotion', (value) => { value.status = 'approved'; });
  mustFail('source commit drift', (value) => { value.sourceCommit = '0'.repeat(40); });
  mustFail('commit exception hidden', (value) => { value.sourceAuditCommitExceptions = []; });
  mustFail('commit status promoted', (value) => { value.machinePackageCommitStatus = 'committed'; });
  mustFail('scope expansion', (value) => { value.scope = 'production-runtime'; });
  mustFail('source omitted', (value) => { records(value.sourceAudit).pop(); });
  mustFail('source duplicate', (value) => {
    const audits = records(value.sourceAudit);
    audits.push(structuredClone(audits[0]!) as JsonRecord);
  });
  mustFail('source order drift', (value) => { records(value.sourceAudit).reverse(); });
  mustFail('source path drift', (value) => { records(value.sourceAudit)[0]!.path = '../outside.ts'; });
  mustFail('source byte length drift', (value) => { records(value.sourceAudit)[0]!.byteLength = 1; });
  mustFail('source hash drift', (value) => { records(value.sourceAudit)[0]!.sha256 = '0'.repeat(64); });
  mustFail('source domain drift', (value) => { records(value.sourceAudit)[0]!.domain = 'authority'; });
  mustFail('source marker removed', (value) => { records(value.sourceAudit)[0]!.semanticMarkers = []; });
  mustFail('source marker invented', (value) => { records(value.sourceAudit)[0]!.semanticMarkers = ['not-present']; });
  mustFail('step key omitted', (value) => { record(value.runtimeBoundary).stepExactKeys = ['events', 'readFrame', 'readFrameAudit']; });
  mustFail('step key added', (value) => {
    record(value.runtimeBoundary).stepExactKeys = [
      'events', 'localJumpAvailability', 'readFrame', 'readFrameAudit', 'supplyCadence',
      'supplyFacts', 'stateHash',
    ];
  });
  mustFail('read frame audit loosened', (value) => {
    record(value.runtimeBoundary).readFrameAuditExactKeys = ['worldSupplyEquipmentInstanceIds'];
  });
  mustFail('jump capability downgraded to optional', (value) => {
    record(value.runtimeBoundary).jumpAvailabilitySchema =
      'ArenaLocalJumpAvailabilityV1-optional-authority-capability';
  });
  mustFail('state hash allowed into presentation', (value) => {
    record(value.runtimeBoundary).forbiddenRuntimeInputs = ['commands'];
  });
  mustFail('terminal atomicity loosened', (value) => {
    record(value.runtimeBoundary).terminalCommitRule = 'event-only';
  });
  mustFail('race participant range loosened', (value) => { records(value.modeContracts)[1]!.participantCount = '2-to-17'; });
  mustFail('race no-finisher removed', (value) => {
    records(value.modeContracts)[1]!.specialCases = ['shared-rank'];
  });
  mustFail('survival second fall removed', (value) => {
    records(value.modeContracts)[2]!.specialCases = ['first-fall-1-of-2'];
  });
  mustFail('participant color-only', (value) => { record(value.participantIdentity).colorIsNeverSoleChannel = false; });
  mustFail('participant identity channel removed', (value) => {
    record(value.participantIdentity).requiredChannels = ['displayName'];
  });
  mustFail('P5 readonly boundary opened', (value) => { record(value.p5ConsumerChain).readonlyOnly = false; });
  mustFail('P5 default entry opened', (value) => { record(value.p5ConsumerChain).defaultEntryWired = true; });
  mustFail('epoch cleanup removed', (value) => {
    record(value.p5ConsumerChain).epochRules = ['same-epoch-waterline-continuity'];
  });
  mustFail('programmatic fallback promoted', (value) => {
    record(value.fallbackAndAccessibility).programmaticProductionNormalPath = true;
  });
  mustFail('reduced motion information removed', (value) => {
    record(value.fallbackAndAccessibility).reducedMotion = 'hide-all';
  });
  mustFail('fixture omitted', (value) => { records(value.fixtureMatrix).pop(); });
  mustFail('fixture duplicated', (value) => {
    const fixtures = records(value.fixtureMatrix);
    fixtures.push(structuredClone(fixtures[0]!) as JsonRecord);
  });
  mustFail('fixture marker drift', (value) => { records(value.fixtureMatrix)[0]!.marker = 'not present'; });
  mustFail('A0.3 human gate forged', (value) => { record(value.hardGates).a0_3HumanApproved = true; });
  mustFail('A1.1 approval forged', (value) => { record(value.hardGates).a1_1ProductionAssetApproved = true; });
  mustFail('runtime evidence forged', (value) => { record(value.hardGates).a2RuntimeEvidencePassed = true; });
  mustFail('default composition opened', (value) => { record(value.hardGates).defaultCompositionWired = true; });
  mustFail('hard gate opened', (value) => { value.hardGate = true; });
  mustFail('rollback expanded', (value) => { value.rollback = 'replace production sources'; });

  writeFileSync(ledgerPath, `${JSON.stringify(source, null, 2)}\n`);
  const auditedPath = String(records(source.sourceAudit)[0]!.path);
  const auditedAbsolute = resolve(tempRoot, auditedPath);
  const auditedOriginal = readFileSync(auditedAbsolute);
  writeFileSync(auditedAbsolute, Buffer.concat([auditedOriginal, Buffer.from('\n// drift\n')]));
  if (run(tempRoot).status === 0) throw new Error('expected source byte drift rejection');
  expectedFailures += 1;
  writeFileSync(auditedAbsolute, auditedOriginal);

  const outsideFile = resolve(outsideRoot, 'outside.ts');
  writeFileSync(outsideFile, auditedOriginal);
  unlinkSync(auditedAbsolute);
  symlinkSync(outsideFile, auditedAbsolute);
  if (run(tempRoot).status === 0) throw new Error('expected source symlink rejection');
  expectedFailures += 1;

  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    positiveCandidates: 1,
    expectedFailures,
    hardGate: false,
    productionSourcesMutated: false,
  })}\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
}
