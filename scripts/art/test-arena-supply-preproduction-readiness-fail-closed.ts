import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type JsonRecord = Record<string, unknown>;
const ROOT = resolve(import.meta.dirname, '../..');
const LEDGER = 'docs/quality/art/supply/arena-a1.1-preproduction-readiness-v1.json';
const CHECKER = resolve(ROOT, 'scripts/art/check-arena-supply-preproduction-readiness.ts');
const source = JSON.parse(readFileSync(resolve(ROOT, LEDGER), 'utf8')) as JsonRecord;

function object(value: unknown): JsonRecord { return value as JsonRecord; }
function clone(): JsonRecord { return structuredClone(source) as JsonRecord; }
function copyFile(root: string, path: string): void {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(resolve(ROOT, path), target);
}
function collectPaths(value: JsonRecord): string[] {
  const paths = new Set<string>([LEDGER, String(object(value.upstream).a1_0ContractPath)]);
  for (const entry of objectArray(object(object(value.upstream).activeLifecycleProjectionContract).sourceArtifacts)) {
    paths.add(String(entry.path));
  }
  for (const entry of objectArray(value.repositoryAudits)) paths.add(String(entry.path));
  for (const entry of objectArray(value.equipmentInputAudit)) {
    paths.add(String(object(entry.artifact).path));
    const license = object(entry.license);
    paths.add(String(object(license.proofArtifact).path)); paths.add(String(object(license.textArtifact).path));
  }
  for (const entry of objectArray(value.temporarySourceCandidates)) {
    if (entry.artifact) paths.add(String(object(entry.artifact).path));
    const license = object(entry.license);
    if (license.proofArtifact) paths.add(String(object(license.proofArtifact).path));
    if (license.textArtifact) paths.add(String(object(license.textArtifact).path));
  }
  return [...paths];
}
function objectArray(value: unknown): JsonRecord[] { return value as JsonRecord[]; }
function run(root: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ['--import', 'tsx', CHECKER], { cwd: ROOT, env: { ...process.env, ARENA_A11_CHECK_ROOT: root }, encoding: 'utf8' });
}

const tempRoot = mkdtempSync(resolve(tmpdir(), 'arena-a11-readiness-'));
const outsideRoot = mkdtempSync(resolve(tmpdir(), 'arena-a11-outside-'));
try {
  for (const path of collectPaths(source)) copyFile(tempRoot, path);
  const ledgerPath = resolve(tempRoot, LEDGER);
  const positive = run(tempRoot);
  if (positive.status !== 0) throw new Error(`positive fixture failed: ${positive.stderr}`);
  let expectedFailures = 0;
  function mustFail(label: string, mutate: (value: JsonRecord) => void): void {
    const value = clone(); mutate(value); writeFileSync(ledgerPath, `${JSON.stringify(value, null, 2)}\n`);
    const result = run(tempRoot);
    if (result.status === 0) throw new Error(`probe unexpectedly passed: ${label}`);
    expectedFailures += 1;
  }

  mustFail('future ledger field', (v) => { v.future = true; });
  mustFail('baseline drift', (v) => { v.baselineCommit = '0'.repeat(40); });
  mustFail('candidate promoted', (v) => { v.status = 'preproduction-readiness-ready'; });
  mustFail('future upstream field', (v) => { object(v.upstream).future = true; });
  mustFail('coherent A1.0 upstream substitution', (v) => {
    const replacement = objectArray(v.repositoryAudits)[0]!;
    object(v.upstream).a1_0ContractPath = replacement.path;
    object(v.upstream).a1_0ContractSha256 = replacement.sha256;
  });
  mustFail('A0.3 humans falsified', (v) => { object(v.upstream).a0_3QualifiedHumanParticipants = 10; });
  mustFail('active projection availability regressed', (v) => { object(v.upstream).activeLifecycleProjectionAvailable = false; });
  mustFail('active projection commit drift', (v) => { object(object(v.upstream).activeLifecycleProjectionContract).signedCommit = '0'.repeat(40); });
  mustFail('active projection schema drift', (v) => { object(object(v.upstream).activeLifecycleProjectionContract).schemaVersion = 1; });
  mustFail('active projection source substitution', (v) => {
    objectArray(object(object(v.upstream).activeLifecycleProjectionContract).sourceArtifacts)[0] = structuredClone(objectArray(v.repositoryAudits)[0]!);
  });
  mustFail('active projection binding removed', (v) => {
    object(object(v.upstream).activeLifecycleProjectionContract).requiredBindings = ['snapshotTick'];
  });
  mustFail('active projection resync boundary weakened', (v) => {
    object(object(v.upstream).activeLifecycleProjectionContract).recoveryBoundary = 'pre-step may recover';
  });
  mustFail('repository hash drift', (v) => { objectArray(v.repositoryAudits)[0]!.sha256 = '0'.repeat(64); });
  mustFail('repository artifact future field', (v) => { objectArray(v.repositoryAudits)[0]!.future = true; });
  mustFail('coherent repository audit substitution', (v) => { objectArray(v.repositoryAudits)[0] = structuredClone(objectArray(v.repositoryAudits)[1]!); });
  mustFail('equipment hash drift', (v) => { object(objectArray(v.equipmentInputAudit)[0]!.artifact).sha256 = '0'.repeat(64); });
  mustFail('equipment size drift', (v) => { object(objectArray(v.equipmentInputAudit)[0]!.artifact).byteLength = 1; });
  mustFail('equipment path escape', (v) => { object(objectArray(v.equipmentInputAudit)[0]!.artifact).path = '../escape.glb'; });
  mustFail('coherent equipment artifact substitution', (v) => { objectArray(v.equipmentInputAudit)[0]!.artifact = structuredClone(objectArray(v.equipmentInputAudit)[1]!.artifact); });
  mustFail('equipment approved', (v) => { objectArray(v.equipmentInputAudit)[0]!.a1_1Approved = true; });
  mustFail('texture promoted to icon', (v) => { objectArray(v.equipmentInputAudit)[1]!.a1_1Disposition = 'representative-equipment-input-candidate'; });
  mustFail('diagnostic silhouette promoted', (v) => { objectArray(v.equipmentInputAudit)[2]!.a1_1Disposition = 'representative-equipment-input-candidate'; });
  mustFail('future equipment field', (v) => { objectArray(v.equipmentInputAudit)[0]!.future = true; });
  mustFail('future equipment license field', (v) => { object(objectArray(v.equipmentInputAudit)[0]!.license).future = true; });
  mustFail('equipment license identity drift', (v) => { object(objectArray(v.equipmentInputAudit)[0]!.license).id = 'PROJECT-ORIGINAL-INTERNAL'; });
  mustFail('equipment rights holder drift', (v) => { object(objectArray(v.equipmentInputAudit)[0]!.license).rightsHolder = 'Arena project'; });
  mustFail('equipment redistribution boolean drift', (v) => { object(objectArray(v.equipmentInputAudit)[0]!.license).redistributionAllowed = false; });
  mustFail('equipment proof hash drift', (v) => { object(object(objectArray(v.equipmentInputAudit)[0]!.license).proofArtifact).sha256 = '0'.repeat(64); });
  mustFail('equipment license text size drift', (v) => { object(object(objectArray(v.equipmentInputAudit)[0]!.license).textArtifact).byteLength = 1; });
  mustFail('missing icon falsely closed', (v) => { objectArray(v.missingEquipmentInputs)[0]!.bytesPresent = true; });
  mustFail('no-byte VFX gains fake artifact', (v) => { objectArray(v.temporarySourceCandidates)[0]!.artifact = { path: 'fake.png', byteLength: 1, sha256: '0'.repeat(64) }; });
  mustFail('no-byte VFX gains fake rights', (v) => { object(objectArray(v.temporarySourceCandidates)[0]!.license).commercialUseAllowed = true; });
  mustFail('no-byte VFX gains fake proof', (v) => { object(objectArray(v.temporarySourceCandidates)[0]!.license).proofArtifact = { path: 'fake.txt', byteLength: 1, sha256: '0'.repeat(64) }; });
  mustFail('no-byte VFX approved', (v) => { objectArray(v.temporarySourceCandidates)[0]!.a1_1Approved = true; });
  mustFail('VFX creator expanded', (v) => { objectArray(v.temporarySourceCandidates)[0]!.creator = 'Arena project'; });
  mustFail('VFX source locator expanded', (v) => { objectArray(v.temporarySourceCandidates)[0]!.sourceLocator = 'https://example.com/vfx.png'; });
  mustFail('VFX allowed use expanded', (v) => { objectArray(v.temporarySourceCandidates)[0]!.allowedUse = 'runtime prototype'; });
  mustFail('VFX prohibited use weakened', (v) => { objectArray(v.temporarySourceCandidates)[0]!.prohibitedUse = 'production allowed'; });
  mustFail('VFX withdrawal boundary drift', (v) => { objectArray(v.temporarySourceCandidates)[0]!.withdrawalPoint = 'keep forever'; });
  mustFail('VFX pending license identity drift', (v) => { object(objectArray(v.temporarySourceCandidates)[0]!.license).id = 'CC0-1.0'; });
  mustFail('VFX pending rights holder drift', (v) => { object(objectArray(v.temporarySourceCandidates)[0]!.license).rightsHolder = 'Arena project'; });
  mustFail('audio approved', (v) => { objectArray(v.temporarySourceCandidates)[3]!.a1_1Approved = true; });
  mustFail('coherent audio artifact substitution', (v) => { objectArray(v.temporarySourceCandidates)[3]!.artifact = structuredClone(objectArray(v.temporarySourceCandidates)[4]!.artifact); });
  mustFail('audio creator drift', (v) => { objectArray(v.temporarySourceCandidates)[3]!.creator = 'Arena project'; });
  mustFail('audio source locator drift', (v) => { objectArray(v.temporarySourceCandidates)[3]!.sourceLocator = 'https://example.com/audio'; });
  mustFail('audio source revision drift', (v) => { objectArray(v.temporarySourceCandidates)[3]!.sourceRevision = 'latest'; });
  mustFail('audio license identity drift', (v) => { object(objectArray(v.temporarySourceCandidates)[3]!.license).id = 'MIT'; });
  mustFail('audio rights holder drift', (v) => { object(objectArray(v.temporarySourceCandidates)[3]!.license).rightsHolder = 'unknown'; });
  mustFail('audio commercial-use boolean drift', (v) => { object(objectArray(v.temporarySourceCandidates)[3]!.license).commercialUseAllowed = false; });
  mustFail('audio license hash drift', (v) => { object(object(objectArray(v.temporarySourceCandidates)[3]!.license).textArtifact).sha256 = '0'.repeat(64); });
  mustFail('audio use expanded', (v) => { objectArray(v.temporarySourceCandidates)[3]!.allowedUse = 'production runtime'; });
  mustFail('withdrawal removed', (v) => { objectArray(v.temporarySourceCandidates)[3]!.withdrawalPoint = ''; });
  mustFail('future source field', (v) => { objectArray(v.temporarySourceCandidates)[0]!.future = true; });
  mustFail('plan falsely approved', (v) => { object(v.measurementPlan).preStartPlanApproved = true; });
  mustFail('measured evidence falsified', (v) => { object(v.measurementPlan).postSpecimenMeasuredEvidencePresent = true; });
  mustFail('future plan field', (v) => { object(v.measurementPlan).future = true; });
  mustFail('mobile viewport changed', (v) => { objectArray(object(v.measurementPlan).viewports)[1]!.cssWidth = 430; });
  mustFail('device gap removed', (v) => { objectArray(object(v.measurementPlan).viewports)[1]!.deviceGap = ''; });
  mustFail('future viewport field', (v) => { objectArray(object(v.measurementPlan).viewports)[0]!.future = true; });
  mustFail('30 FPS drift', (v) => { object(object(v.measurementPlan).timing).requiredPresentationFps = 60; });
  mustFail('599/600/601 removed', (v) => { object(object(v.measurementPlan).timing).terminalOffsets = [599, 600]; });
  mustFail('future timing field', (v) => { object(object(v.measurementPlan).timing).future = true; });
  mustFail('mobile overdraw relaxed', (v) => { object(object(v.measurementPlan).budgets).mobilePeakOverdrawMultiple = 8; });
  mustFail('destroy resources nonzero', (v) => { object(object(v.measurementPlan).budgets).postDestroyOwnedResources = 1; });
  mustFail('future budget field', (v) => { object(object(v.measurementPlan).budgets).future = true; });
  mustFail('capture removed', (v) => { object(v.measurementPlan).captures = objectArray(object(v.measurementPlan).captures).slice(0, 6); });
  mustFail('future capture field', (v) => { objectArray(object(v.measurementPlan).captures)[0]!.future = true; });
  mustFail('device input gap hidden', (v) => { object(v.measurementPlan).missingExecutionInputs = ['capture harness implementation']; });
  mustFail('score inflated', (v) => { object(v.score).total = 100; });
  mustFail('score hard gate opened', (v) => { object(v.score).hardGatePassed = true; });
  mustFail('maturity inflated', (v) => { object(object(v.score).maturity).device = 100; });
  mustFail('future score field', (v) => { object(v.score).future = true; });
  mustFail('future dimension field', (v) => { objectArray(object(v.score).dimensions)[0]!.future = true; });
  for (const gate of Object.keys(object(source.hardGates))) {
    if (gate === 'activeLifecycleProjectionAvailable') {
      mustFail(`gate regressed: ${gate}`, (v) => { object(v.hardGates)[gate] = false; });
    } else {
      mustFail(`gate opened: ${gate}`, (v) => { object(v.hardGates)[gate] = true; });
    }
  }

  writeFileSync(ledgerPath, `${JSON.stringify(source, null, 2)}\n`);
  const symlinkTarget = resolve(tempRoot, String(object(objectArray(source.equipmentInputAudit)[0]!.artifact).path));
  const outside = resolve(outsideRoot, 'outside.glb');
  writeFileSync(outside, 'outside'); unlinkSync(symlinkTarget); symlinkSync(outside, symlinkTarget);
  const symlinkResult = run(tempRoot);
  if (symlinkResult.status === 0) throw new Error('probe unexpectedly passed: symlink artifact');
  expectedFailures += 1;

  process.stdout.write(`${JSON.stringify({ positiveCandidate: 1, expectedFailures, status: 'pass', activeLifecycleProjectionAvailable: true, hardGatePassed: false, representativeSpecimenStarted: false })}\n`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
}
