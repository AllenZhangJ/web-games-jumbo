import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';

type JsonRecord = Record<string, unknown>;
type ProbeSetup = (tempRoot: string) => void;

const ROOT = resolve(import.meta.dirname, '../..');
const CONTRACT_PATH =
  'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v2.json';
const V1_PATH =
  'docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v1.json';
const PP1_PATH =
  'packages/arena-presentation-runtime/src/arena-supply-presentation-adapter.ts';
const CHECKER = resolve(ROOT, 'scripts/art/check-arena-supply-presentation-contract-v2.ts');
const original = JSON.parse(
  readFileSync(resolve(ROOT, CONTRACT_PATH), 'utf8'),
) as JsonRecord;
let expectedFailures = 0;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as JsonRecord;
}

function records(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`);
  return value.map((item, index) => record(item, `${label}[${index}]`));
}

function copyBaseline(tempRoot: string): void {
  const sources = records(original.sourceAudit, 'sourceAudit');
  for (const source of sources) {
    const sourcePath = String(source.path);
    const destination = resolve(tempRoot, sourcePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(ROOT, sourcePath), destination);
  }
  const v1Destination = resolve(tempRoot, V1_PATH);
  mkdirSync(dirname(v1Destination), { recursive: true });
  copyFileSync(resolve(ROOT, V1_PATH), v1Destination);
}

function runCandidate(candidate: JsonRecord, setup?: ProbeSetup): Readonly<{
  status: number | null;
  stdout: string;
  stderr: string;
}> {
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'arena-a10-v2-contract-'));
  try {
    copyBaseline(tempRoot);
    const contractDestination = resolve(tempRoot, CONTRACT_PATH);
    mkdirSync(dirname(contractDestination), { recursive: true });
    writeFileSync(contractDestination, `${JSON.stringify(candidate, null, 2)}\n`);
    setup?.(tempRoot);
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', CHECKER],
      {
        cwd: ROOT,
        env: { ...process.env, ARENA_A10_V2_CHECK_ROOT: tempRoot },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    if (result.error !== undefined) throw result.error;
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function mustFail(
  name: string,
  mutate: (candidate: JsonRecord) => void,
  setup?: ProbeSetup,
): void {
  const candidate = clone(original);
  mutate(candidate);
  const result = runCandidate(candidate, setup);
  if (result.status === 0) {
    throw new Error(`A1.0-v2 fail-closed probe unexpectedly passed: ${name}`);
  }
  expectedFailures += 1;
}

const positive = runCandidate(clone(original));
if (positive.status !== 0) {
  throw new Error(
    `A1.0-v2 isolated positive baseline failed before mutations:\n${positive.stderr}`,
  );
}
const positiveResult = JSON.parse(positive.stdout) as JsonRecord;
if (positiveResult.status !== 'joint-gate-candidate'
  || positiveResult.score !== 94
  || positiveResult.sources !== 28
  || positiveResult.fixtureMappings !== 25
  || positiveResult.runtimeAdapterTested !== true
  || positiveResult.hardGatePassed !== false
  || positiveResult.coordinatorSignOff !== false
  || positiveResult.pp2Authorized !== false
  || positiveResult.pp3aAuthorized !== false
  || positiveResult.pp3bAuthorized !== false
  || positiveResult.a1Passed !== false
  || positiveResult.blockoutAllowed !== false) {
  throw new Error('A1.0-v2 isolated positive output drift');
}

mustFail('future schema', (candidate) => { candidate.schemaVersion = 3; });
mustFail('missing identity field', (candidate) => { delete candidate.scope; });
mustFail('extra top-level field', (candidate) => { candidate.future = true; });
mustFail('candidate status inflated', (candidate) => { candidate.status = 'contract-ready'; });
mustFail('candidate status regressed', (candidate) => { candidate.status = 'draft'; });

mustFail('supersedes id drift', (candidate) => {
  record(candidate.supersedes, 'supersedes').id = 'arena.art.supply-presentation.a1.0.future';
});
mustFail('supersedes baseline substitution', (candidate) => {
  const supersedes = record(candidate.supersedes, 'supersedes');
  const source = records(candidate.sourceAudit, 'sourceAudit')[0]!;
  supersedes.path = source.path;
  supersedes.sha256 = source.sha256;
  supersedes.baselineCommit = '0'.repeat(40);
});
mustFail('supersedes hash drift', (candidate) => {
  record(candidate.supersedes, 'supersedes').sha256 = '0'.repeat(64);
});

mustFail('marker exact-key missing', (candidate) => {
  (record(candidate.contractSurface, 'contractSurface').markerKeys as unknown[]).pop();
});
mustFail('cue exact-key future field', (candidate) => {
  (record(candidate.contractSurface, 'contractSurface').cueKeys as unknown[]).push('position');
});
mustFail('view exact-key future authority field', (candidate) => {
  (record(candidate.contractSurface, 'contractSurface').viewKeys as unknown[]).push('assetGatePassed');
});
mustFail('options lifecycle contract removed', (candidate) => {
  const options = record(candidate.contractSurface, 'contractSurface').optionsKeys as unknown[];
  options.splice(options.indexOf('lifecycleContract'), 1);
});
mustFail('update input event field removed', (candidate) => {
  (record(candidate.contractSurface, 'contractSurface').updateInputKeys as unknown[]).pop();
});
mustFail('debug surface gains host resources', (candidate) => {
  (record(candidate.contractSurface, 'contractSurface').debugKeys as unknown[]).push(
    'audioResourceCount',
  );
});
mustFail('adapter method surface expands', (candidate) => {
  (record(candidate.contractSurface, 'contractSurface').adapterMethods as unknown[]).push(
    'reset',
  );
});
mustFail('half-open sequence weakens', (candidate) => {
  record(
    record(candidate.contractSurface, 'contractSurface').invariants,
    'invariants',
  ).sequenceWindow = 'best-effort';
});
mustFail('semantic batch cap expands', (candidate) => {
  record(
    record(candidate.contractSurface, 'contractSurface').invariants,
    'invariants',
  ).maximumSemanticEventsPerUpdate = 256;
});
mustFail('structural rescue cap expands', (candidate) => {
  record(
    record(candidate.contractSurface, 'contractSurface').invariants,
    'invariants',
  ).maximumStructuralResyncEventsPerUpdate = 257;
});

mustFail('event shape removed', (candidate) => {
  (record(candidate.eventRouting, 'eventRouting').shapes as unknown[]).pop();
});
mustFail('event shape duplicated', (candidate) => {
  const shapes = record(candidate.eventRouting, 'eventRouting').shapes as unknown[];
  shapes[1] = clone(shapes[0]);
});
mustFail('ordinary spawn becomes supply', (candidate) => {
  const shape = records(record(candidate.eventRouting, 'eventRouting').shapes, 'shapes')[1]!;
  shape.disposition = 'consume-strict-supply';
});
mustFail('mixed spawn becomes legal', (candidate) => {
  const shape = records(record(candidate.eventRouting, 'eventRouting').shapes, 'shapes')[0]!;
  (shape.outerKeys as unknown[]).push('equipmentInstanceId');
});
mustFail('ordinary pickup deletes unmatched supply', (candidate) => {
  const shape = records(record(candidate.eventRouting, 'eventRouting').shapes, 'shapes')[2]!;
  shape.terminalRule = 'remove-nearest-marker';
});
mustFail('replacement waits for picked-up', (candidate) => {
  const shape = records(record(candidate.eventRouting, 'eventRouting').shapes, 'shapes')[4]!;
  shape.terminalRule = 'wait-for-picked-up';
});
mustFail('unknown event best effort', (candidate) => {
  record(candidate.eventRouting, 'eventRouting').unknownEventRule = 'render-best-effort';
});
mustFail('canonical hash only uses envelope', (candidate) => {
  record(candidate.eventRouting, 'eventRouting').canonicalHashRule = 'hash-id-sequence-only';
});
mustFail('terminal position reads post marker', (candidate) => {
  record(candidate.eventRouting, 'eventRouting').terminalPositionRule =
    'read current post marker position';
});

mustFail('65 event batch executes semantics', (candidate) => {
  record(candidate.sequenceAndRecovery, 'sequenceAndRecovery').batch65To256 =
    'process all events';
});
mustFail('resync retains stale markers', (candidate) => {
  record(candidate.sequenceAndRecovery, 'sequenceAndRecovery').resyncNotReady =
    'keep prior markers';
});
mustFail('pause uses wall clock', (candidate) => {
  record(candidate.sequenceAndRecovery, 'sequenceAndRecovery').pauseResume =
    'advance from wall clock';
});
mustFail('replay reuses epoch', (candidate) => {
  record(candidate.sequenceAndRecovery, 'sequenceAndRecovery').replay =
    'reuse prior stream state';
});

mustFail('fixture missing', (candidate) => {
  (record(candidate.fixtureCoverage, 'fixtureCoverage').fixtures as unknown[]).pop();
});
mustFail('fixture duplicated', (candidate) => {
  const fixtures = record(candidate.fixtureCoverage, 'fixtureCoverage').fixtures as unknown[];
  fixtures[1] = clone(fixtures[0]);
});
mustFail('fixture renamed', (candidate) => {
  records(record(candidate.fixtureCoverage, 'fixtureCoverage').fixtures, 'fixtures')[0]!.id =
    'renamed-fixture';
});
mustFail('fixture test name substituted', (candidate) => {
  const fixtures = records(record(candidate.fixtureCoverage, 'fixtureCoverage').fixtures, 'fixtures');
  fixtures[0]!.testName = fixtures[1]!.testName;
});
mustFail('runtime candidate evidence falsified false', (candidate) => {
  record(candidate.fixtureCoverage, 'fixtureCoverage').runtimeAdapterTested = false;
});
mustFail('candidate test count inflated', (candidate) => {
  record(candidate.fixtureCoverage, 'fixtureCoverage').candidateReportedTestCount = 52;
});

mustFail('terminal cue gains position', (candidate) => {
  const terminal = record(
    record(candidate.artCounterevidence, 'artCounterevidence').terminalCuePosition,
    'terminalCuePosition',
  );
  terminal.cueContainsPosition = true;
});
mustFail('terminal origin uses current post marker', (candidate) => {
  const terminal = record(
    record(candidate.artCounterevidence, 'artCounterevidence').terminalCuePosition,
    'terminalCuePosition',
  );
  terminal.onlySpatialSource = 'current-post-marker';
});
mustFail('terminal fallback absent', (candidate) => {
  const terminal = record(
    record(candidate.artCounterevidence, 'artCounterevidence').terminalCuePosition,
    'terminalCuePosition',
  );
  terminal.fallback = 'none';
});
mustFail('PP3a runtime evidence prefilled', (candidate) => {
  const terminal = record(
    record(candidate.artCounterevidence, 'artCounterevidence').terminalCuePosition,
    'terminalCuePosition',
  );
  terminal.pp3aRuntimeEvidencePassed = true;
});
mustFail('reduced-motion equivalence removed', (candidate) => {
  const cue = records(
    record(candidate.artCounterevidence, 'artCounterevidence').cueContracts,
    'cueContracts',
  )[0]!;
  cue.reducedMotion = 'same-animation';
});
mustFail('silent equivalence removed', (candidate) => {
  const cue = records(
    record(candidate.artCounterevidence, 'artCounterevidence').cueContracts,
    'cueContracts',
  )[3]!;
  cue.silentEquivalent = 'audio-only';
});
mustFail('resync countdown shown', (candidate) => {
  const resync = record(
    record(candidate.artCounterevidence, 'artCounterevidence').resyncPresentation,
    'resyncPresentation',
  );
  resync.markerPolicy = 'show-last-countdown';
});
mustFail('fallback claims representative asset gate', (candidate) => {
  const boundary = record(
    record(candidate.artCounterevidence, 'artCounterevidence').assetFailureBoundary,
    'assetFailureBoundary',
  );
  boundary.fallbackMayClaimRepresentativeAssetGate = true;
});
mustFail('wall-clock deletion enabled', (candidate) => {
  const authority = record(
    record(candidate.artCounterevidence, 'artCounterevidence').authoritySeparation,
    'authoritySeparation',
  );
  authority.wallClockDeletionAllowed = true;
});

mustFail('external evidence aggregate prefilled', (candidate) => {
  record(candidate.externalEvidenceBoundary, 'externalEvidenceBoundary')
    .allExternalEvidencePassed = true;
});
mustFail('PP3a owner evidence removed', (candidate) => {
  const boundary = record(candidate.externalEvidenceBoundary, 'externalEvidenceBoundary');
  (boundary.pp3aMustProve as unknown[]).shift();
});
mustFail('device evidence moved into Node', (candidate) => {
  const boundary = record(candidate.externalEvidenceBoundary, 'externalEvidenceBoundary');
  (boundary.nodeCanProve as unknown[]).push('real-ios-and-android-behavior');
});

mustFail('source hash drift', (candidate) => {
  records(candidate.sourceAudit, 'sourceAudit')[0]!.sha256 = '0'.repeat(64);
});
mustFail('source size drift', (candidate) => {
  const source = records(candidate.sourceAudit, 'sourceAudit')[0]!;
  source.byteLength = Number(source.byteLength) + 1;
});
mustFail('source path escape', (candidate) => {
  records(candidate.sourceAudit, 'sourceAudit')[0]!.path = '../escape.ts';
});
mustFail('source role drift', (candidate) => {
  records(candidate.sourceAudit, 'sourceAudit')[0]!.role = 'future-role';
});
mustFail('source stable order drift', (candidate) => {
  const sources = candidate.sourceAudit as unknown[];
  [sources[0], sources[1]] = [sources[1], sources[0]];
});
mustFail('coherent source substitution', (candidate) => {
  const sources = candidate.sourceAudit as unknown[];
  sources[0] = clone(sources[1]);
});
mustFail('source bytes drift under unchanged ledger', () => {}, (tempRoot) => {
  const path = resolve(tempRoot, 'packages/arena-contracts/src/match-event-types.ts');
  const bytes = readFileSync(path);
  writeFileSync(path, Buffer.concat([bytes, Buffer.from('\n') ]));
});
mustFail('ADR-113 bytes drift under unchanged ledger', () => {}, (tempRoot) => {
  const path = resolve(
    tempRoot,
    'docs/decisions/113-arena-v2-supply-presentation-adapter-boundary.md',
  );
  const bytes = readFileSync(path);
  writeFileSync(path, Buffer.concat([bytes, Buffer.from('\n')]));
});
mustFail('ADR-114 bytes drift under unchanged ledger', () => {}, (tempRoot) => {
  const path = resolve(
    tempRoot,
    'docs/decisions/114-arena-v2-art-evidence-versioning-and-joint-gate.md',
  );
  const bytes = readFileSync(path);
  writeFileSync(path, Buffer.concat([bytes, Buffer.from('\n')]));
});
mustFail('source symlink traversal', () => {}, (tempRoot) => {
  const path = resolve(tempRoot, 'packages/arena-contracts/src/match-event-types.ts');
  const donor = resolve(tempRoot, 'packages/arena-contracts/src/match-snapshot.ts');
  rmSync(path);
  symlinkSync(relative(dirname(path), donor), path);
});

for (const gate of [
  'a1_0V2CoordinatorSignOff',
  'a1_0V2JointGatePassed',
  'pp1Completed',
  'pp2Authorized',
  'pp3aAuthorized',
  'pp3bAuthorized',
  'a0_3Passed',
  'a1_1Passed',
  'representativeSpecimenStarted',
  'a1Passed',
  'blockoutAllowed',
  'productionVfxIntegrated',
  'productionAudioIntegrated',
  'browserVerified',
  'deviceVerified',
  'humanVerified',
  'formalPerformancePassed',
  'finalPassed',
]) {
  mustFail(`downstream gate opened: ${gate}`, (candidate) => {
    record(candidate.hardGates, 'hardGates')[gate] = true;
  });
}
mustFail('source audit self-check regressed', (candidate) => {
  record(candidate.hardGates, 'hardGates').sourceAuditVerified = false;
});
mustFail('score inflated', (candidate) => {
  record(candidate.score, 'score').total = 100;
});
mustFail('score hard gate prefilled', (candidate) => {
  record(candidate.score, 'score').hardGatePassed = true;
});
mustFail('dimension falls below threshold', (candidate) => {
  records(record(candidate.score, 'score').dimensions, 'dimensions')[0]!.score = 1;
});
mustFail('governance claims coordinator complete', (candidate) => {
  const governance = record(record(candidate.score, 'score').governance, 'governance');
  governance.coordinatorReviewPending = false;
});
mustFail('governance write set expands', (candidate) => {
  const governance = record(record(candidate.score, 'score').governance, 'governance');
  (governance.authorizedFiles as unknown[]).push('packages/arena-match/src/match-core.ts');
});
mustFail('missing mandatory reference ledger erased', (candidate) => {
  candidate.missingMandatorySkillReferences = [];
});
mustFail('rollback expands beyond v2', (candidate) => {
  const rollback = record(candidate.rollback, 'rollback');
  (rollback.allowedPaths as unknown[]).push(PP1_PATH);
});
mustFail('rollback allows reset checkout', (candidate) => {
  record(candidate.rollback, 'rollback').resetOrCheckoutAllowed = true;
});
mustFail('rollback no longer preserves v1', (candidate) => {
  const rollback = record(candidate.rollback, 'rollback');
  (rollback.preservePaths as unknown[]).shift();
});

process.stdout.write(`${JSON.stringify({
  positiveIsolatedBaseline: 1,
  expectedFailures,
  status: 'pass',
  runtimeAdapterTested: true,
  hardGatePassed: false,
  coordinatorSignOff: false,
  pp2Authorized: false,
  pp3aAuthorized: false,
  pp3bAuthorized: false,
  a1Passed: false,
  blockoutAllowed: false,
})}\n`);
