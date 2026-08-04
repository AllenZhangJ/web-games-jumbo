import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1,
  ARENA_PA6_READ_STEP_CASES_V1,
  ARENA_PA6_READ_STEP_SEED_BASE,
  ARENA_PA6_READ_STEP_VARIANTS_V1,
  ARENA_PA6_READ_STEP_VARIANT,
  assertArenaPa6AbbaScheduleV1,
  assertArenaPa6FixedCasesV1,
} from '../../scripts/lib/arena-pa6-read-step-variants-v1.js';
import {
  assertArenaPa6AbbaReportSourceIdentityV1,
  assertArenaPa6GroupResultV1,
  cloneArenaPa6StrictDataV1,
  createArenaPa6PlanV1,
  parseArenaPa6CliV1,
  publishArenaPa6ReportAtomicV1,
  readArenaPa6EnvironmentV1,
  readArenaPa6SourceIdentityV1,
  runArenaPa6AbbaV1,
  runArenaPa6StrictJsonChildV1,
  runArenaPa6VariantProbeV2,
  startArenaPa6VariantWorkerV2,
  type ArenaPa6SourceIdentityV1,
} from '../../scripts/lib/arena-pa6-read-step-abba-v1.js';
import {
  ARENA_PA6_LOADER_CONFIG_ENV_V2,
  buildArenaPa6WorkspaceSourceEntryManifestV2,
  createArenaPa6LoaderConfigV2,
  validateArenaPa6LoaderAttestationV2,
  validateArenaPa6LoaderConfigV2,
} from '../../scripts/lib/arena-pa6-source-transform-register-v2.js';
import { transformArenaPa6TargetSourceV2 } from '../../scripts/lib/arena-pa6-source-transform-hook-v2.js';

const SOURCE: ArenaPa6SourceIdentityV1 = Object.freeze({
  head: 'a'.repeat(40),
  dirty: true,
  fingerprint: 'b'.repeat(64),
});

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function fakeLoaderAttestation(variantId: string) {
  const variant = ARENA_PA6_READ_STEP_VARIANTS_V1.find(({ id }) => id === variantId);
  assert.ok(variant);
  const config = createArenaPa6LoaderConfigV2({
    repositoryRoot: process.cwd(),
    sourceFingerprint: SOURCE.fingerprint,
    variantId: variant.id,
  });
  const matchCoreTransform = transformArenaPa6TargetSourceV2({
    targetName: 'matchCore',
    source: readFileSync(path.join(process.cwd(), config.targets.matchCore.relativePath), 'utf8'),
    profileRead: variant.profileRead,
    resolverRead: variant.resolverRead,
  });
  const actionAffordanceTransform = transformArenaPa6TargetSourceV2({
    targetName: 'actionAffordance',
    source: readFileSync(
      path.join(process.cwd(), config.targets.actionAffordance.relativePath),
      'utf8',
    ),
    profileRead: variant.profileRead,
    resolverRead: variant.resolverRead,
  });
  const sourceModules = [
    {
      packageId: '@number-strategy-jump/arena-core',
      relativePath: config.targets.actionAffordance.relativePath,
      sourceSha256: config.targets.actionAffordance.sourceSha256,
    },
    config.workspaceSourceEntries.find(({ packageId }) => (
      packageId === '@number-strategy-jump/arena-core'
    ))!,
    config.workspaceSourceEntries.find(({ packageId }) => (
      packageId === '@number-strategy-jump/arena-match'
    ))!,
    {
      packageId: '@number-strategy-jump/arena-match',
      relativePath: config.targets.matchCore.relativePath,
      sourceSha256: config.targets.matchCore.sourceSha256,
    },
  ].sort((left, right) => left.relativePath < right.relativePath ? -1 : 1);
  const attestation = {
    schemaVersion: 2,
    variantId: variant.id,
    sourceFingerprint: SOURCE.fingerprint,
    profileRead: variant.profileRead,
    resolverRead: variant.resolverRead,
    files: {
      matchCore: {
        ...config.targets.matchCore,
        transformedSha256: sha256(matchCoreTransform.source),
      },
      actionAffordance: {
        ...config.targets.actionAffordance,
        transformedSha256: sha256(actionAffordanceTransform.source),
      },
    },
    sourceAnchorCounts: {
      localProfile: matchCoreTransform.sourceAnchorCounts.localProfile,
      botProfile: matchCoreTransform.sourceAnchorCounts.botProfile,
      previewDecision: actionAffordanceTransform.sourceAnchorCounts.previewDecision,
    },
    workspaceSourceGraph: {
      redirectHits: [
        { packageId: '@number-strategy-jump/arena-core', count: 6 },
        { packageId: '@number-strategy-jump/arena-match', count: 12 },
      ],
      sourceModules,
      sourceModuleCount: sourceModules.length,
      sourceModuleSetSha256: sha256(JSON.stringify(sourceModules)),
      distLoads: 0,
    },
    replacementCounts: {
      profileReads: matchCoreTransform.replacementCounts.profileReads,
      previewDecision: actionAffordanceTransform.replacementCounts.previewDecision,
    },
  };
  return validateArenaPa6LoaderAttestationV2(attestation, config);
}

function fakeMeasurement(variantId: string, caseSetIdentity: string) {
  const variant = ARENA_PA6_READ_STEP_VARIANTS_V1.find(({ id }) => id === variantId);
  assert.ok(variant);
  const sampleCount = 100_000;
  const baseline = variantId === ARENA_PA6_READ_STEP_VARIANT.B_ONLY;
  const processUserMicros = baseline ? 15 : 7;
  const processSystemMicros = baseline ? 5 : 3;
  const processTotalMicros = processUserMicros + processSystemMicros;
  return {
    schemaVersion: 2,
    variantId,
    loaderAttestation: fakeLoaderAttestation(variantId),
    caseSetIdentity,
    parityIdentity: 'parity-fixed',
    caseCount: 20,
    uniqueSeedCount: 20,
    hardLimitTicks: 2_500,
    doubleRunsPerCase: 2,
    denominatorTicks: 100_000,
    selfCpuMicros: { sampleCount, p50: 100, p95: 180, p99: 200 },
    inclusiveCpuMicros: baseline
      ? { sampleCount, p50: 120, p95: 200, p99: 220 }
      : { sampleCount, p50: 90, p95: 150, p99: 180 },
    inclusiveWallMicros: { sampleCount, p50: 120, p95: 200, p99: 220 },
    processCpu: {
      userMicros: processUserMicros,
      systemMicros: processSystemMicros,
      totalMicros: processTotalMicros,
      microsPerTick: processTotalMicros / sampleCount,
    },
    counts: {
      scheduledFullAudits: 5,
      sessionsCreated: 40,
      sessionsDestroyed: 40,
      completedCases: 20,
    },
    gc: { exposed: false, forcedCollections: 0 },
    resources: {
      maximumWorldEquipmentCount: 3,
      maximumRuntimeCount: 5,
      maximumActiveSupplyCount: 3,
      maximumEventsPerTick: 10,
      heapBeforeBytes: 1_000,
      heapAfterBytes: 1_100,
      heapDeltaBytes: 100,
    },
    cases: ARENA_PA6_READ_STEP_CASES_V1.map((item) => ({
      caseId: item.caseId,
      caseIdentity: item.caseIdentity,
      seed: item.seed,
      traceHash: `trace-${item.caseId}`,
      finalHash: `final-${item.caseId}`,
      finalTick: 2_500,
      totalEvents: 10,
    })),
  };
}

function fakeGroup(
  groupIndex = 0,
  environment: unknown = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    release: 'test-release',
    cpuModel: 'test-cpu',
    logicalCpuCount: 8,
    totalMemoryBytes: 1_024,
  },
) {
  const plan = createArenaPa6PlanV1(3);
  return {
    schemaVersion: 2,
    groupIndex,
    planIdentity: plan.planIdentity,
    source: SOURCE,
    environment,
    warmup: {
      variants: ['B-only', 'C+B', 'B-only', 'B+D', 'B-only', 'C+B+D'],
      sampleCount: 0,
      parityIdentity: 'parity-fixed',
      denominatorTicks: 100_000,
    },
    rawRounds: ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1.map((scheduled) => ({
      comparisonId: scheduled.comparisonId,
      sequence: scheduled.sequence,
      variantId: scheduled.variantId,
      measurement: fakeMeasurement(scheduled.variantId, plan.caseSetIdentity),
    })),
    gates: {
      inclusiveP95Passed: true,
      recoveryMicros: 50,
      recoveryPassed: true,
      processCpuSameDirection: true,
      passed: true,
    },
  };
}

function mutableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertStructuredTimeoutFailure(
  value: unknown,
  expected: {
    readonly groupIndex: number;
    readonly variantId: string | null;
    readonly completedGroupCount: number;
  },
): asserts value is {
  readonly status: 'failed';
  readonly plan: { readonly groupCount: number; readonly caseCount: number };
  readonly rawGroups: readonly { readonly groupIndex: number }[];
  readonly failure: {
    readonly completedGroups: readonly number[];
    readonly current: {
      readonly groupIndex: number;
      readonly phase: string;
      readonly variantId: string | null;
    };
    readonly reason: {
      readonly kind: 'timeout';
      readonly message: string;
    };
  };
} {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  const report = value as Record<string, unknown>;
  assert.equal(report.status, 'failed');
  const rawGroups = report.rawGroups;
  assert.ok(Array.isArray(rawGroups));
  assert.equal(rawGroups.length, expected.completedGroupCount);
  const rawGroupIndexes = rawGroups.map((group, index) => {
    assert.equal(typeof group, 'object', `rawGroups[${index}] must be an object`);
    assert.notEqual(group, null);
    return (group as Record<string, unknown>).groupIndex;
  });
  assert.deepEqual(
    rawGroupIndexes,
    Array.from({ length: expected.completedGroupCount }, (_, index) => index),
  );

  assert.equal(typeof report.plan, 'object');
  assert.notEqual(report.plan, null);
  const plan = report.plan as Record<string, unknown>;
  assert.equal(plan.groupCount, 3);
  assert.equal(plan.caseCount, 20);

  assert.equal(typeof report.failure, 'object');
  assert.notEqual(report.failure, null);
  const failure = report.failure as Record<string, unknown>;
  assert.ok(Array.isArray(failure.completedGroups));
  assert.deepEqual(failure.completedGroups, rawGroupIndexes);

  assert.equal(typeof failure.current, 'object');
  assert.notEqual(failure.current, null);
  const current = failure.current as Record<string, unknown>;
  assert.equal(current.groupIndex, expected.groupIndex);
  assert.equal(current.variantId, expected.variantId);
  assert.equal(typeof current.phase, 'string');
  assert.notEqual((current.phase as string).trim(), '');
  assert.notEqual((current.phase as string).trim(), 'unknown');

  assert.equal(typeof failure.reason, 'object');
  assert.notEqual(failure.reason, null);
  const reason = failure.reason as Record<string, unknown>;
  assert.equal(reason.kind, 'timeout');
  assert.equal(typeof reason.message, 'string');
  assert.notEqual((reason.message as string).trim(), '');
}

function runGit(cwd: string, args: readonly string[]): void {
  execFileSync('git', [...args], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function spawnRawPa6Worker(
  config: ReturnType<typeof createArenaPa6LoaderConfigV2>,
  source: ArenaPa6SourceIdentityV1,
) {
  return spawn(process.execPath, [
    '--import',
    'tsx',
    '--import',
    pathToFileURL(path.resolve(
      'scripts/lib/arena-pa6-source-transform-register-v2.ts',
    )).href,
    path.resolve('scripts/arena-pa6-read-step-variant-worker.ts'),
    '--ipc-worker',
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      [ARENA_PA6_LOADER_CONFIG_ENV_V2]: JSON.stringify(config),
      ARENA_PA6_EXPECTED_SOURCE_V2: JSON.stringify(source),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
}

function runPa6LoaderEval(
  config: ReturnType<typeof createArenaPa6LoaderConfigV2>,
  source: string,
) {
  return spawnSync(process.execPath, [
    '--import',
    'tsx',
    '--import',
    pathToFileURL(path.resolve(
      'scripts/lib/arena-pa6-source-transform-register-v2.ts',
    )).href,
    '--input-type=module',
    '-e',
    source,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      [ARENA_PA6_LOADER_CONFIG_ENV_V2]: JSON.stringify(config),
    },
  });
}

function nextWorkerMessage(child: ReturnType<typeof spawn>, timeoutMs = 30_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(() => reject(new Error('test worker message timeout'))), timeoutMs);
    const onMessage = (value: unknown): void => finish(() => resolve(value));
    const onError = (error: Error): void => finish(() => reject(error));
    const onExit = (): void => finish(() => reject(new Error('test worker exited before message')));
    const finish = (callback: () => void): void => {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('error', onError);
      child.off('exit', onExit);
      callback();
    };
    child.once('message', onMessage);
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

function waitWorkerClose(child: ReturnType<typeof spawn>, timeoutMs = 30_000): Promise<{
  code: number | null;
  signal: NodeJS.Signals | null;
}> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('test worker close timeout'));
    }, timeoutMs);
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

test('PA6 freezes four variants, cases 000-019, seeds and the three fixed ABBA comparisons', () => {
  assert.deepEqual(
    ARENA_PA6_READ_STEP_VARIANTS_V1.map(({ id }) => id),
    ['B-only', 'C+B', 'B+D', 'C+B+D'],
  );
  assertArenaPa6FixedCasesV1(ARENA_PA6_READ_STEP_CASES_V1);
  assertArenaPa6AbbaScheduleV1(ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1);
  assert.equal(ARENA_PA6_READ_STEP_CASES_V1.length, 20);
  assert.equal(new Set(ARENA_PA6_READ_STEP_CASES_V1.map(({ seed }) => seed)).size, 20);
  for (let index = 0; index < 20; index += 1) {
    assert.equal(ARENA_PA6_READ_STEP_CASES_V1[index]?.seed, ARENA_PA6_READ_STEP_SEED_BASE + index);
    assert.equal(ARENA_PA6_READ_STEP_CASES_V1[index]?.caseId, `formal-survival-bot-${String(index).padStart(3, '0')}`);
  }
  assert.equal(ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1.length, 12);
});

test('PA6 freezes the four mutually exclusive target read-model paths', () => {
  assert.deepEqual(
    ARENA_PA6_READ_STEP_VARIANTS_V1.map(({ id, profileRead, resolverRead }) => ({
      id,
      profileRead,
      resolverRead,
    })),
    [
      { id: 'B-only', profileRead: 'broad', resolverRead: 'sequential' },
      { id: 'C+B', profileRead: 'split', resolverRead: 'sequential' },
      { id: 'B+D', profileRead: 'broad', resolverRead: 'multi-intent' },
      { id: 'C+B+D', profileRead: 'split', resolverRead: 'multi-intent' },
    ],
  );
});

test('PA6 workspace source manifest covers every fixed package source entry', () => {
  const manifest = buildArenaPa6WorkspaceSourceEntryManifestV2(process.cwd());
  assert.equal(manifest.length, 52);
  assert.equal(new Set(manifest.map(({ packageId }) => packageId)).size, manifest.length);
  for (const entry of manifest) {
    const directoryName = entry.packageId.slice('@number-strategy-jump/'.length);
    assert.equal(entry.relativePath, `packages/${directoryName}/src/index.ts`);
    assert.match(entry.sourceSha256, /^[0-9a-f]{64}$/);
  }
});

test('PA6 workspace source manifest rejects symlink packages and missing source entries', async () => {
  const directory = realpathSync.native(await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-manifest-')));
  const packagesRoot = path.join(directory, 'packages');
  const packageRoot = path.join(packagesRoot, 'arena-example');
  const indexPath = path.join(packageRoot, 'src/index.ts');
  const linkedPackagePath = path.join(packagesRoot, 'arena-linked');
  try {
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(
      path.join(packageRoot, 'package.json'),
      '{"name":"@number-strategy-jump/arena-example"}\n',
      'utf8',
    );
    await writeFile(indexPath, 'export const example = true;\n', 'utf8');
    assert.equal(buildArenaPa6WorkspaceSourceEntryManifestV2(directory).length, 1);

    await symlink(packageRoot, linkedPackagePath, 'dir');
    assert.throws(
      () => buildArenaPa6WorkspaceSourceEntryManifestV2(directory),
      /非普通目录/,
    );
    await unlink(linkedPackagePath);
    await unlink(indexPath);
    assert.throws(
      () => buildArenaPa6WorkspaceSourceEntryManifestV2(directory),
      /ENOENT/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 source fingerprint is content-sensitive in one dirty repo and handles NUL paths/symlinks', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-source-'));
  const trackedName = 'tracked\nname.txt';
  const untrackedName = 'untracked\nname.txt';
  const linkName = 'source-link';
  try {
    runGit(directory, ['init']);
    await writeFile(path.join(directory, trackedName), 'tracked-v1', 'utf8');
    runGit(directory, ['add', '--', trackedName]);
    runGit(directory, [
      '-c', 'user.name=PA6 Test',
      '-c', 'user.email=pa6@example.invalid',
      'commit', '-m', 'initial',
    ]);
    await writeFile(path.join(directory, untrackedName), 'dirty-v1', 'utf8');
    await symlink(untrackedName, path.join(directory, linkName));

    const first = readArenaPa6SourceIdentityV1(directory);
    await writeFile(path.join(directory, untrackedName), 'dirty-v2', 'utf8');
    const contentChanged = readArenaPa6SourceIdentityV1(directory);
    assert.equal(first.head, contentChanged.head);
    assert.equal(first.dirty, true);
    assert.equal(contentChanged.dirty, true);
    assert.notEqual(first.fingerprint, contentChanged.fingerprint);

    await unlink(path.join(directory, linkName));
    await symlink(trackedName, path.join(directory, linkName));
    const symlinkChanged = readArenaPa6SourceIdentityV1(directory);
    assert.notEqual(contentChanged.fingerprint, symlinkChanged.fingerprint);

    await writeFile(path.join(directory, trackedName), 'tracked-v2', 'utf8');
    const trackedChanged = readArenaPa6SourceIdentityV1(directory);
    assert.notEqual(symlinkChanged.fingerprint, trackedChanged.fingerprint);

    const renamedTrackedName = 'renamed\ntracked.txt';
    await rename(
      path.join(directory, trackedName),
      path.join(directory, renamedTrackedName),
    );
    const trackedRenamed = readArenaPa6SourceIdentityV1(directory);
    assert.notEqual(trackedChanged.fingerprint, trackedRenamed.fingerprint);

    await unlink(path.join(directory, renamedTrackedName));
    const trackedDeleted = readArenaPa6SourceIdentityV1(directory);
    assert.notEqual(trackedRenamed.fingerprint, trackedDeleted.fingerprint);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 real loader executes all four mutually exclusive paths with strict probe parity', async () => {
  const probes = [];
  for (const variant of ARENA_PA6_READ_STEP_VARIANTS_V1) {
    const probe = await runArenaPa6VariantProbeV2({
      variantId: variant.id,
      probe: 'probe-read-model',
      timeoutMs: 30_000,
    });
    probes.push({ variant, ...probe });
  }
  assert.equal(new Set(probes.map(({ result }) => JSON.stringify(result))).size, 1);
  assert.equal(new Set(probes.map(({ loaderAttestation }) => JSON.stringify(
    loaderAttestation.workspaceSourceGraph,
  ))).size, 1);
  for (const { variant, loaderAttestation, result } of probes) {
    assert.equal(loaderAttestation.workspaceSourceGraph.distLoads, 0);
    assert.deepEqual(
      loaderAttestation.workspaceSourceGraph.redirectHits.map(({ packageId }) => packageId),
      [...new Set(loaderAttestation.workspaceSourceGraph.sourceModules.map(
        ({ packageId }) => packageId,
      ))],
    );
    assert.ok(loaderAttestation.workspaceSourceGraph.redirectHits.some(({ packageId }) => (
      packageId === '@number-strategy-jump/arena-core'
    )));
    assert.ok(loaderAttestation.workspaceSourceGraph.redirectHits.some(({ packageId }) => (
      packageId === '@number-strategy-jump/arena-match'
    )));
    assert.ok(loaderAttestation.workspaceSourceGraph.sourceModules.every(({ relativePath }) => (
      /^packages\/arena-[a-z0-9-]+\/src\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.ts$/.test(
        relativePath,
      )
    )));
    assert.equal(
      loaderAttestation.workspaceSourceGraph.sourceModuleCount,
      loaderAttestation.workspaceSourceGraph.sourceModules.length,
    );
    assert.equal(
      loaderAttestation.workspaceSourceGraph.sourceModuleSetSha256,
      sha256(JSON.stringify(loaderAttestation.workspaceSourceGraph.sourceModules)),
    );
    assert.equal(loaderAttestation.replacementCounts.profileReads, variant.cEnabled ? 0 : 2);
    assert.equal(loaderAttestation.replacementCounts.previewDecision, variant.dEnabled ? 0 : 1);
    assert.equal((result as { scheduledFullAudits: number }).scheduledFullAudits, 2);
  }
  const currentSource = readArenaPa6SourceIdentityV1(process.cwd());
  const noAblationConfig = createArenaPa6LoaderConfigV2({
    repositoryRoot: process.cwd(),
    sourceFingerprint: currentSource.fingerprint,
    variantId: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
  });
  const current = runPa6LoaderEval(noAblationConfig, [
    'const {readArenaPa6LoaderAttestationV2:read}=await import("./scripts/lib/arena-pa6-source-transform-register-v2.ts");',
    'const {runArenaPa6ReadModelProbeV2:run}=await import("./scripts/arena-formal-survival-bot-pressure.ts");',
    'const attestation=await read();',
    'process.stdout.write(`${JSON.stringify({attestation,result:run()})}\\n`);',
  ].join(''));
  assert.equal(current.status, 0, current.stderr);
  assert.equal(current.stderr, '');
  const currentSourceResult = JSON.parse(current.stdout) as {
    attestation: ReturnType<typeof fakeLoaderAttestation>;
    result: unknown;
  };
  assert.equal(currentSourceResult.attestation.workspaceSourceGraph.distLoads, 0);
  assert.equal(
    currentSourceResult.attestation.files.matchCore.transformedSha256,
    currentSourceResult.attestation.files.matchCore.sourceSha256,
  );
  assert.equal(
    currentSourceResult.attestation.files.actionAffordance.transformedSha256,
    currentSourceResult.attestation.files.actionAffordance.sourceSha256,
  );
  assert.deepEqual(currentSourceResult.result, probes[3]!.result);
});

test('PA6 source graph rejects omitted redirects, workspace dist and unknown subpaths after finalize', () => {
  const source = readArenaPa6SourceIdentityV1(process.cwd());
  const config = createArenaPa6LoaderConfigV2({
    repositoryRoot: process.cwd(),
    sourceFingerprint: source.fingerprint,
    variantId: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
  });
  const omitted = mutableClone(config);
  Reflect.set(
    omitted,
    'workspaceSourceEntries',
    omitted.workspaceSourceEntries.slice(0, -1),
  );
  const omittedChild = runPa6LoaderEval(omitted, 'process.stdout.write("unreachable");');
  assert.notEqual(omittedChild.status, 0);
  assert.match(omittedChild.stderr, /workspace source manifest 数量漂移/);
  assert.equal(omittedChild.stdout, '');

  const finalizePrefix = [
    'const {readArenaPa6LoaderAttestationV2:read}=await import("./scripts/lib/arena-pa6-source-transform-register-v2.ts");',
    'await import("./scripts/arena-formal-survival-bot-pressure.ts");',
    'await read();',
  ].join('');
  const distUrl = pathToFileURL(path.join(
    process.cwd(),
    'packages/arena-contracts/dist/index.js',
  )).href;
  const distChild = runPa6LoaderEval(config, `${finalizePrefix}await import(${JSON.stringify(distUrl)});`);
  assert.notEqual(distChild.status, 0);
  assert.match(distChild.stderr, /拒绝 workspace dist load/);
  assert.equal(distChild.stdout, '');

  const subpathChild = runPa6LoaderEval(
    config,
    `${finalizePrefix}await import("@number-strategy-jump/arena-contracts/not-manifested");`,
  );
  assert.notEqual(subpathChild.status, 0);
  assert.match(subpathChild.stderr, /未纳入 manifest 的 workspace specifier\/subpath/);
  assert.equal(subpathChild.stdout, '');
});

test('PA6 workspace src load executes its one stable read and never delegates path re-read', () => {
  const child = spawnSync(process.execPath, [
    '--import',
    'tsx',
    '--input-type=module',
    '-e',
    [
      'const {readFileSync}=await import("node:fs");',
      'const path=(await import("node:path")).default;',
      'const {pathToFileURL}=await import("node:url");',
      'const {transform}=await import("esbuild");',
      'const {createArenaPa6LoaderConfigV2:create}=await import("./scripts/lib/arena-pa6-source-transform-register-v2.ts");',
      'const hook=await import("./scripts/lib/arena-pa6-source-transform-hook-v2.ts");',
      'const config=create({repositoryRoot:process.cwd(),sourceFingerprint:"a".repeat(64),variantId:"C+B+D"});',
      'hook.initialize({config,port:{on(){},postMessage(){},close(){}}});',
      'let delegated=0;const checks=[];',
      'for(const relativePath of ["packages/arena-contracts/src/index.ts","packages/arena-contracts/src/input-frame.ts"]){',
      'const filePath=path.join(process.cwd(),relativePath);',
      'const loaded=await hook.load(pathToFileURL(filePath).href,{},()=>{delegated+=1;return{format:"module",source:"export const forged=true;"};});',
      'const source=readFileSync(filePath,"utf8");',
      'const expected=await transform(source,{format:"esm",loader:"ts",platform:"node",target:"node20",sourcefile:relativePath,sourcemap:"inline"});',
      'checks.push(loaded.shortCircuit===true&&loaded.source===expected.code&&!loaded.source.includes("forged=true"));}',
      'let unsupported="";try{await hook.load(pathToFileURL(path.join(process.cwd(),"packages/arena-contracts/src/unsupported.js")).href,{},()=>{delegated+=1;});}catch(error){unsupported=error.message;}',
      'let unknown="";try{await hook.load(pathToFileURL(path.join(process.cwd(),"packages/arena-unknown/src/index.ts")).href,{},()=>{delegated+=1;});}catch(error){unknown=error.message;}',
      'let escaped="";try{hook.resolve("../package.json",{parentURL:pathToFileURL(path.join(process.cwd(),"packages/arena-contracts/src/index.ts")).href},()=>{delegated+=1;});}catch(error){escaped=error.message;}',
      'let externalDelegated=0;await hook.load("node:fs",{},()=>{externalDelegated+=1;return{format:"builtin"};});',
      'process.stdout.write(`${JSON.stringify({delegated,checks,unsupported,unknown,escaped,externalDelegated})}\\n`);',
    ].join(''),
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  assert.deepEqual(JSON.parse(child.stdout), {
    delegated: 0,
    checks: [true, true],
    unsupported: 'PA6 loader workspace src 路径/扩展/链接不受支持：packages/arena-contracts/src/unsupported.js',
    unknown: 'PA6 loader workspace src package 未纳入固定 manifest：packages/arena-unknown/src/index.ts',
    escaped: 'PA6 loader workspace source relative import 逃逸 src：../package.json',
    externalDelegated: 1,
  });
});

test('PA6 D-disabled reaches real sequential evaluation while D-enabled uses multi-intent once', async () => {
  const sequential = await runArenaPa6VariantProbeV2({
    variantId: ARENA_PA6_READ_STEP_VARIANT.B_ONLY,
    probe: 'probe-resolver',
    timeoutMs: 30_000,
  });
  const multiIntent = await runArenaPa6VariantProbeV2({
    variantId: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
    probe: 'probe-resolver',
    timeoutMs: 30_000,
  });
  assert.equal((sequential.result as { registryRequireCalls: number }).registryRequireCalls, 4);
  assert.equal((multiIntent.result as { registryRequireCalls: number }).registryRequireCalls, 1);
  assert.equal(
    (sequential.result as { resultHash: string }).resultHash,
    (multiIntent.result as { resultHash: string }).resultHash,
  );
});

test('PA6 manifest and attestation reject missing redirects, forged graph data and source fragments', () => {
  const valid = fakeLoaderAttestation(ARENA_PA6_READ_STEP_VARIANT.B_ONLY);
  const config = createArenaPa6LoaderConfigV2({
    repositoryRoot: process.cwd(),
    sourceFingerprint: SOURCE.fingerprint,
    variantId: ARENA_PA6_READ_STEP_VARIANT.B_ONLY,
  });
  const noReplace = mutableClone(valid);
  Reflect.set(noReplace.replacementCounts, 'profileReads', 0);
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(noReplace, config),
    /replacement count/,
  );
  const missingFingerprint = mutableClone(valid);
  Reflect.deleteProperty(missingFingerprint, 'sourceFingerprint');
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(missingFingerprint, config),
    /字段集合不精确/,
  );
  const forgedFingerprint = mutableClone(valid);
  Reflect.set(forgedFingerprint, 'sourceFingerprint', 'c'.repeat(64));
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(forgedFingerprint, config),
    /identity 漂移/,
  );
  const noRedirect = mutableClone(valid);
  Reflect.set(noRedirect.workspaceSourceGraph.redirectHits[0]!, 'count', 0);
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(noRedirect, config),
    /identity\/count/,
  );
  const forgedPackageId = mutableClone(valid);
  Reflect.set(
    forgedPackageId.workspaceSourceGraph.redirectHits[0]!,
    'packageId',
    '@number-strategy-jump/arena-balance',
  );
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(forgedPackageId, config),
    /严格排序|root redirect|未真实加载/,
  );
  const forgedModuleHash = mutableClone(valid);
  Reflect.set(
    forgedModuleHash.workspaceSourceGraph.sourceModules[0]!,
    'sourceSha256',
    'f'.repeat(64),
  );
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(forgedModuleHash, config),
    /source identity 漂移/,
  );
  const forgedModulePath = mutableClone(valid);
  Reflect.set(
    forgedModulePath.workspaceSourceGraph.sourceModules[0]!,
    'relativePath',
    'packages/arena-core/src/../escape.ts',
  );
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(forgedModulePath, config),
    /identity 非法/,
  );
  const omittedModule = mutableClone(valid);
  Reflect.set(
    omittedModule.workspaceSourceGraph,
    'sourceModules',
    omittedModule.workspaceSourceGraph.sourceModules.slice(0, -1),
  );
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(omittedModule, config),
    /sourceModuleCount|target 未包含/,
  );
  const duplicateModule = mutableClone(valid);
  Reflect.set(
    duplicateModule.workspaceSourceGraph,
    'sourceModules',
    [
      ...duplicateModule.workspaceSourceGraph.sourceModules,
      mutableClone(duplicateModule.workspaceSourceGraph.sourceModules.at(-1)!),
    ],
  );
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(duplicateModule, config),
    /严格排序且唯一/,
  );
  const omittedManifestEntry = mutableClone(config);
  Reflect.set(
    omittedManifestEntry,
    'workspaceSourceEntries',
    omittedManifestEntry.workspaceSourceEntries.slice(0, -1),
  );
  assert.throws(
    () => validateArenaPa6LoaderConfigV2(omittedManifestEntry),
    /manifest 数量漂移/,
  );
  const forgedManifestHash = mutableClone(config);
  Reflect.set(forgedManifestHash.workspaceSourceEntries[0]!, 'sourceSha256', 'f'.repeat(64));
  assert.throws(
    () => validateArenaPa6LoaderConfigV2(forgedManifestHash),
    /manifest\[0\] 漂移/,
  );
  const forgedManifestPackageId = mutableClone(config);
  Reflect.set(
    forgedManifestPackageId.workspaceSourceEntries[0]!,
    'packageId',
    '@number-strategy-jump/arena-balance-forged',
  );
  assert.throws(
    () => validateArenaPa6LoaderConfigV2(forgedManifestPackageId),
    /package\/path identity 漂移/,
  );
  const escapedManifestPath = mutableClone(config);
  Reflect.set(escapedManifestPath.workspaceSourceEntries[0]!, 'relativePath', '../escape.ts');
  assert.throws(
    () => validateArenaPa6LoaderConfigV2(escapedManifestPath),
    /identity 非法/,
  );
  const forgedHash = mutableClone(valid);
  Reflect.set(forgedHash.files.matchCore, 'transformedSha256', 'f'.repeat(64));
  assert.throws(
    () => validateArenaPa6LoaderAttestationV2(forgedHash, config),
    /重算/,
  );
  const wrongVariant = mutableClone(config);
  Reflect.set(wrongVariant, 'variantId', ARENA_PA6_READ_STEP_VARIANT.C_B_D);
  assert.throws(() => validateArenaPa6LoaderConfigV2(wrongVariant), /read path identity/);
  const matchSource = readFileSync(
    path.join(process.cwd(), config.targets.matchCore.relativePath),
    'utf8',
  );
  assert.throws(() => transformArenaPa6TargetSourceV2({
    targetName: 'matchCore',
    source: matchSource.replace("          'local-context-primary',", "          'broken-profile',"),
    profileRead: 'broad',
    resolverRead: 'sequential',
  }), /anchor count=0/);
});

test('PA6 actual loader fails closed on wrong source hash and malformed worker protocol', async () => {
  const source = readArenaPa6SourceIdentityV1(process.cwd());
  const validConfig = createArenaPa6LoaderConfigV2({
    repositoryRoot: process.cwd(),
    sourceFingerprint: source.fingerprint,
    variantId: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
  });
  const wrongHash = mutableClone(validConfig);
  Reflect.set(wrongHash.targets.matchCore, 'sourceSha256', 'f'.repeat(64));
  const wrongHashChild = spawnSync(process.execPath, [
    '--import',
    'tsx',
    '--import',
    pathToFileURL(path.resolve(
      'scripts/lib/arena-pa6-source-transform-register-v2.ts',
    )).href,
    path.resolve('scripts/arena-pa6-read-step-variant-worker.ts'),
    '--attestation-probe',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      [ARENA_PA6_LOADER_CONFIG_ENV_V2]: JSON.stringify(wrongHash),
    },
  });
  assert.notEqual(wrongHashChild.status, 0);
  assert.match(
    wrongHashChild.stderr,
    /PA6 loader matchCore target identity\/hash 漂移/,
  );
  assert.equal(wrongHashChild.stdout, '');

  const child = spawnRawPa6Worker(validConfig, source);
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
  child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
  const ready = await nextWorkerMessage(child) as { type: string };
  assert.equal(ready.type, 'ready');
  const failedPromise = nextWorkerMessage(child);
  child.send({ schemaVersion: 2, requestId: 1, type: 'unknown' });
  const failed = await failedPromise as { type: string; error: string };
  assert.equal(failed.type, 'failed');
  assert.match(failed.error, /request schema\/id\/type 非法/);
  const closed = await waitWorkerClose(child);
  assert.equal(closed.code, 1);
  assert.equal(closed.signal, null);
  assert.equal(stdout, '');
  assert.equal(stderr, '');
});

test('PA6 startup failure awaits cleanup for ready timeout, bad ready protocol and non-zero exit', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-startup-'));
  const source = readArenaPa6SourceIdentityV1(process.cwd());
  const scenarios = [
    {
      id: 'timeout',
      body: 'setInterval(()=>{},1000);',
      pattern: /ready timeout/,
      timeoutMs: 2_000,
      outputCapBytes: 1_024 * 1_024,
    },
    {
      id: 'bad-protocol',
      body: 'process.send?.({bad:true});setInterval(()=>{},1000);',
      pattern: /字段集合不精确/,
      timeoutMs: 10_000,
      outputCapBytes: 1_024 * 1_024,
    },
    {
      id: 'nonzero',
      body: 'process.exit(7);',
      pattern: /提前退出/,
      timeoutMs: 10_000,
      outputCapBytes: 1_024 * 1_024,
    },
    {
      id: 'output-cap',
      body: 'process.stdout.write("x".repeat(2048));setInterval(()=>{},1000);',
      pattern: /输出上限/,
      timeoutMs: 10_000,
      outputCapBytes: 128,
    },
  ] as const;
  try {
    for (const scenario of scenarios) {
      const entry = path.join(directory, `${scenario.id}.mjs`);
      const pidPath = path.join(directory, `${scenario.id}.pid`);
      await writeFile(
        entry,
        `import{writeFileSync}from'node:fs';writeFileSync(${JSON.stringify(pidPath)},String(process.pid));${scenario.body}\n`,
        'utf8',
      );
      await assert.rejects(startArenaPa6VariantWorkerV2({
        cwd: process.cwd(),
        variantId: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
        expectedSource: source,
        timeoutMs: scenario.timeoutMs,
        outputCapBytes: scenario.outputCapBytes,
        workerEntryPath: entry,
      }), scenario.pattern);
      const workerPid = Number(await readFile(pidPath, 'utf8'));
      assert.ok(Number.isSafeInteger(workerPid) && workerPid > 1);
      assert.throws(
        () => process.kill(workerPid, 0),
        (error: unknown) => (error as NodeJS.ErrnoException).code === 'ESRCH',
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 worker re-reads repository fingerprint after its complete lifecycle', async () => {
  const source = readArenaPa6SourceIdentityV1(process.cwd());
  const config = createArenaPa6LoaderConfigV2({
    repositoryRoot: process.cwd(),
    sourceFingerprint: source.fingerprint,
    variantId: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
  });
  const child = spawnRawPa6Worker(config, source);
  const driftPath = path.join(
    process.cwd(),
    `pa6-worker-source-drift-${process.pid}-${Date.now()}.tmp`,
  );
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
  child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
  try {
    const ready = await nextWorkerMessage(child) as { type: string };
    assert.equal(ready.type, 'ready');
    await writeFile(driftPath, 'drift-after-ready', 'utf8');
    const failedPromise = nextWorkerMessage(child);
    child.send({ schemaVersion: 2, requestId: 1, type: 'shutdown' });
    const failed = await failedPromise as { type: string; error: string };
    assert.equal(failed.type, 'failed');
    assert.match(failed.error, /后置 source identity 漂移/);
    const closed = await waitWorkerClose(child);
    assert.equal(closed.code, 1);
    assert.equal(closed.signal, null);
    assert.equal(stdout, '');
    assert.equal(stderr, '');
  } finally {
    await rm(driftPath, { force: true });
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});

test('PA6 parent verifies source after every child before accepting child output', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-parent-drift-'));
  const entry = path.join(directory, 'child.mjs');
  const drifted = Object.freeze({ ...SOURCE, fingerprint: 'c'.repeat(64) });
  let reads = 0;
  try {
    await writeFile(entry, 'process.stdout.write("{}\\n");\n', 'utf8');
    const report = await runArenaPa6AbbaV1({
      groupCount: 3,
      cwd: process.cwd(),
      entryPath: entry,
      timeoutMs: 10_000,
      readSourceIdentity: () => {
        reads += 1;
        return reads < 3 ? SOURCE : drifted;
      },
    });
    assert.equal(report.status, 'failed');
    assert.deepEqual(report.rawGroups, []);
    assert.deepEqual(report.failure?.completedGroups, []);
    assert.equal(report.failure?.current.groupIndex, 0);
    assert.equal(report.failure?.reason.kind, 'unknown');
    assert.match(report.failure?.reason.message ?? '', /后置 source identity 漂移/);
    assert.equal(reads, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 parent forwards exact timeout and output cap to the group worker CLI', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-limits-'));
  const entry = path.join(directory, 'child.mjs');
  const argsPath = path.join(directory, 'args.json');
  try {
    await writeFile(
      entry,
      `import{writeFileSync}from'node:fs';writeFileSync(${JSON.stringify(argsPath)},JSON.stringify(process.argv.slice(2)));process.stdout.write("{}\\n");\n`,
      'utf8',
    );
    const report = await runArenaPa6AbbaV1({
      groupCount: 3,
      cwd: process.cwd(),
      entryPath: entry,
      timeoutMs: 7_321,
      outputCapBytes: 45_678,
    });
    assert.equal(report.status, 'failed');
    assert.deepEqual(report.rawGroups, []);
    assert.deepEqual(report.failure?.completedGroups, []);
    assert.equal(report.failure?.current.groupIndex, 0);
    assert.match(report.failure?.reason.message ?? '', /字段集合不精确|schema/);
    const args = JSON.parse(await readFile(argsPath, 'utf8')) as string[];
    assert.ok(args.includes('--timeout-ms=7321'));
    assert.ok(args.includes('--output-cap-bytes=45678'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 parent reports a located timeout, cleans descendants and never treats partial groups as passed', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-partial-timeout-'));
  const entry = path.join(directory, 'group-worker.mjs');
  const groupPath = path.join(directory, 'group-0.json');
  const invocationPath = path.join(directory, 'invocations.txt');
  const grandchildPidPath = path.join(directory, 'grandchild.pid');
  try {
    await writeFile(
      groupPath,
      JSON.stringify(fakeGroup(0, readArenaPa6EnvironmentV1())),
      'utf8',
    );
    await writeFile(
      entry,
      [
        'import{appendFileSync,readFileSync,writeFileSync}from"node:fs";',
        'import{spawn}from"node:child_process";',
        'const argument=process.argv.find((value)=>value.startsWith("--worker-group="));',
        'if(argument===undefined)throw new Error("missing worker group");',
        'const progressArgument=process.argv.find((value)=>value.startsWith("--progress-file="));',
        'if(progressArgument===undefined)throw new Error("missing progress file");',
        'const progressTokenArgument=process.argv.find((value)=>value.startsWith("--progress-token="));',
        'if(progressTokenArgument===undefined)throw new Error("missing progress token");',
        'const groupIndex=Number(argument.slice("--worker-group=".length));',
        'const progressPath=progressArgument.slice("--progress-file=".length);',
        'const runToken=progressTokenArgument.slice("--progress-token=".length);',
        `appendFileSync(${JSON.stringify(invocationPath)},String(groupIndex)+"\\n");`,
        `if(groupIndex===0){process.stdout.write(readFileSync(${JSON.stringify(groupPath)},"utf8")+"\\n");}`,
        'else{',
        'writeFileSync(progressPath,JSON.stringify({schemaVersion:1,runToken,groupIndex,phase:"measure",comparisonId:"C-ablation",workerRole:"A",variantId:"B-only",sequence:"A1",completedComparisonIds:[],completedRoundCount:0})+"\\n");',
        'const descendant=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});',
        `writeFileSync(${JSON.stringify(grandchildPidPath)},String(descendant.pid));`,
        'setInterval(()=>{},1000);',
        '}',
      ].join(''),
      'utf8',
    );

    const report = await runArenaPa6AbbaV1({
      groupCount: 3,
      cwd: process.cwd(),
      entryPath: entry,
      timeoutMs: 500,
      outputCapBytes: 8 * 1024 * 1024,
      readSourceIdentity: () => SOURCE,
    });
    assertStructuredTimeoutFailure(report, {
      groupIndex: 1,
      variantId: ARENA_PA6_READ_STEP_VARIANT.B_ONLY,
      completedGroupCount: 1,
    });
    const completed = report.rawGroups[0] as { readonly groupIndex?: unknown };
    assert.equal(completed.groupIndex, 0);
    assert.deepEqual((await readFile(invocationPath, 'utf8')).trim().split('\n'), ['0', '1']);

    const grandchildPid = Number(await readFile(grandchildPidPath, 'utf8'));
    assert.ok(Number.isSafeInteger(grandchildPid) && grandchildPid > 1);
    assert.throws(
      () => process.kill(grandchildPid, 0),
      (error: unknown) => (error as NodeJS.ErrnoException).code === 'ESRCH',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 strict data rejects Proxy/accessor/sparse/cycle/hostile coercion without coercing it', () => {
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, 'value', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 1;
    },
  });
  assert.throws(() => cloneArenaPa6StrictDataV1(accessor), /数据字段/);
  assert.equal(getterCalls, 0);

  let proxyTrapCalls = 0;
  const proxy = new Proxy({}, {
    ownKeys() {
      proxyTrapCalls += 1;
      throw new Error('hostile proxy trap');
    },
  });
  assert.throws(() => cloneArenaPa6StrictDataV1(proxy), /hostile proxy trap/);
  assert.equal(proxyTrapCalls, 1);

  const sparse = new Array<unknown>(2);
  sparse[1] = 'present';
  assert.throws(() => cloneArenaPa6StrictDataV1(sparse), /sparse/);

  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  assert.throws(() => cloneArenaPa6StrictDataV1(cycle), /cycle/);

  let coercions = 0;
  const hostile = Object.create({
    toString() {
      coercions += 1;
      return 'hostile';
    },
  }) as object;
  assert.throws(() => cloneArenaPa6StrictDataV1(hostile), /plain record/);
  assert.equal(coercions, 0);
});

test('PA6 CLI exact-key parser rejects unknown, duplicate and illegal arguments', () => {
  const defaults = parseArenaPa6CliV1([]);
  assert.equal(defaults.mode, 'run');
  assert.equal(defaults.groups, 3);
  assert.throws(() => parseArenaPa6CliV1(['--unknown=1']), /未知参数/);
  assert.throws(() => parseArenaPa6CliV1(['--groups=3', '--groups=4']), /不能重复/);
  assert.throws(() => parseArenaPa6CliV1(['--groups=03']), /十进制整数/);
  assert.throws(() => parseArenaPa6CliV1(['--groups=2']), />=3/);
  assert.throws(() => parseArenaPa6CliV1(['--plan=true']), /不接受 value/);
  assert.throws(() => parseArenaPa6CliV1(['groups=3']), /只接受/);
  assert.throws(() => parseArenaPa6CliV1(['--worker-group=0', '--groups=3']), /identity/);
  assert.throws(() => parseArenaPa6CliV1([
    '--worker-group=0',
    '--groups=3',
    `--expected-head=${'a'.repeat(40)}`,
    '--expected-dirty=true',
    '--expected-plan-identity=plan',
  ]), /identity/);
  assert.throws(() => parseArenaPa6CliV1([
    '--worker-group=0',
    '--groups=3',
    `--expected-head=${'a'.repeat(40)}`,
    '--expected-dirty=true',
    '--expected-fingerprint=forged',
    '--expected-plan-identity=plan',
  ]), /identity/);
  const worker = parseArenaPa6CliV1([
    '--worker-group=0',
    '--groups=3',
    `--expected-head=${SOURCE.head}`,
    '--expected-dirty=true',
    `--expected-fingerprint=${SOURCE.fingerprint}`,
    '--expected-plan-identity=plan',
    '--timeout-ms=7321',
    '--output-cap-bytes=45678',
  ]);
  assert.equal(worker.expectedFingerprint, SOURCE.fingerprint);
  assert.equal(worker.timeoutMs, 7_321);
  assert.equal(worker.outputCapBytes, 45_678);
});

test('PA6 real CLI entry emits one current-source plan and does not execute ABBA', () => {
  const entry = path.resolve('scripts/arena-pa6-read-step-abba.ts');
  const child = spawnSync(process.execPath, ['--import', 'tsx', entry, '--plan', '--groups=3'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  assert.ok(child.stdout.endsWith('\n'));
  assert.equal(child.stdout.slice(0, -1).includes('\n'), false);
  const report = JSON.parse(child.stdout) as {
    mode: string;
    source: { head: string; dirty: boolean; fingerprint: string };
    plan: { groupCount: number; caseCount: number; hardLimitTicks: number };
  };
  assert.equal(report.mode, 'plan');
  assert.match(report.source.head, /^[0-9a-f]{40}$/);
  assert.equal(typeof report.source.dirty, 'boolean');
  assert.match(report.source.fingerprint, /^[0-9a-f]{64}$/);
  assert.deepEqual(report.plan, {
    ...report.plan,
    groupCount: 3,
    caseCount: 20,
    hardLimitTicks: 2_500,
  });
});

test('PA6 real CLI atomically publishes a structured timeout report instead of stderr-only failure', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-cli-timeout-'));
  const output = path.join(directory, 'report.json');
  const entry = path.resolve('scripts/arena-pa6-read-step-abba.ts');
  try {
    const child = spawnSync(process.execPath, [
      '--import',
      'tsx',
      entry,
      `--output=${output}`,
      '--timeout-ms=250',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 15_000,
    });
    assert.equal(child.status, 1);
    assert.equal(child.signal, null);
    assert.equal(child.stderr, '');
    assert.ok(child.stdout.endsWith('\n'));
    assert.equal(child.stdout.slice(0, -1).includes('\n'), false);

    const stdoutReport = JSON.parse(child.stdout) as unknown;
    const publishedReport = JSON.parse(await readFile(output, 'utf8')) as unknown;
    assert.deepEqual(publishedReport, stdoutReport);
    assertStructuredTimeoutFailure(publishedReport, {
      groupIndex: 0,
      variantId: null,
      completedGroupCount: 0,
    });
    assert.deepEqual(await readdir(directory), ['report.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 child boundary fails closed on timeout, cap, stderr, partial JSON and non-zero exit', async () => {
  const base = {
    command: process.execPath,
    cwd: process.cwd(),
    timeoutMs: 2_000,
    outputCapBytes: 1_024,
  };
  await assert.rejects(
    runArenaPa6StrictJsonChildV1({
      ...base,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      timeoutMs: 50,
    }),
    /timeout/,
  );
  await assert.rejects(
    runArenaPa6StrictJsonChildV1({
      ...base,
      args: ['-e', 'process.stdout.write("x".repeat(2048))'],
      outputCapBytes: 128,
    }),
    /输出上限/,
  );
  await assert.rejects(
    runArenaPa6StrictJsonChildV1({
      ...base,
      args: ['-e', 'process.stderr.write("red")'],
    }),
    /stderr/,
  );
  await assert.rejects(
    runArenaPa6StrictJsonChildV1({
      ...base,
      args: ['-e', 'process.stdout.write("{\\\"partial\\\":")'],
    }),
    /完整 JSON/,
  );
  await assert.rejects(
    runArenaPa6StrictJsonChildV1({
      ...base,
      args: ['-e', 'process.exitCode = 7'],
    }),
    /非正常退出/,
  );
});

test('PA6 child timeout measures progress inactivity rather than total process lifetime', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-heartbeat-progress-'));
  const entry = path.join(directory, 'progressing-child.mjs');
  const progressPath = path.join(directory, 'progress.json');
  const runToken = 'pa6-heartbeat-progress-token';
  const states = [
    {
      schemaVersion: 1,
      runToken,
      groupIndex: 0,
      phase: 'group-start',
      comparisonId: null,
      workerRole: null,
      variantId: null,
      sequence: null,
      completedComparisonIds: [],
      completedRoundCount: 0,
    },
    {
      schemaVersion: 1,
      runToken,
      groupIndex: 0,
      phase: 'start-worker',
      comparisonId: 'C-ablation',
      workerRole: 'A',
      variantId: 'B-only',
      sequence: null,
      completedComparisonIds: [],
      completedRoundCount: 0,
    },
    {
      schemaVersion: 1,
      runToken,
      groupIndex: 0,
      phase: 'start-worker',
      comparisonId: 'C-ablation',
      workerRole: 'B',
      variantId: 'C+B',
      sequence: null,
      completedComparisonIds: [],
      completedRoundCount: 0,
    },
    {
      schemaVersion: 1,
      runToken,
      groupIndex: 0,
      phase: 'warmup',
      comparisonId: 'C-ablation',
      workerRole: 'A',
      variantId: 'B-only',
      sequence: null,
      completedComparisonIds: [],
      completedRoundCount: 0,
    },
    {
      schemaVersion: 1,
      runToken,
      groupIndex: 0,
      phase: 'warmup',
      comparisonId: 'C-ablation',
      workerRole: 'B',
      variantId: 'C+B',
      sequence: null,
      completedComparisonIds: [],
      completedRoundCount: 0,
    },
    ...(['A1', 'B1', 'B2', 'A2'] as const).map((sequence, index) => ({
      schemaVersion: 1,
      runToken,
      groupIndex: 0,
      phase: 'measure',
      comparisonId: 'C-ablation',
      workerRole: sequence.startsWith('A') ? 'A' : 'B',
      variantId: sequence.startsWith('A') ? 'B-only' : 'C+B',
      sequence,
      completedComparisonIds: [],
      completedRoundCount: index,
    })),
    {
      schemaVersion: 1,
      runToken,
      groupIndex: 0,
      phase: 'comparison-complete',
      comparisonId: 'C-ablation',
      workerRole: null,
      variantId: null,
      sequence: null,
      completedComparisonIds: ['C-ablation'],
      completedRoundCount: 4,
    },
  ];
  try {
    await writeFile(
      entry,
      [
        'import{renameSync,writeFileSync}from"node:fs";',
        `const progressPath=${JSON.stringify(progressPath)};`,
        `const states=${JSON.stringify(states)};`,
        'let index=0;',
        'const publish=()=>{',
        'const temporary=progressPath+".child-tmp";',
        'writeFileSync(temporary,JSON.stringify(states[index])+"\\n");',
        'renameSync(temporary,progressPath);',
        'index+=1;',
        'if(index<states.length)setTimeout(publish,70);',
        'else setTimeout(()=>process.stdout.write("{\\"completed\\":true}\\n"),70);',
        '};',
        'publish();',
      ].join(''),
      'utf8',
    );
    const result = await runArenaPa6StrictJsonChildV1({
      command: process.execPath,
      args: [entry],
      cwd: process.cwd(),
      timeoutMs: 220,
      outputCapBytes: 4_096,
      progressPath,
      expectedProgressGroupIndex: 0,
      expectedProgressToken: runToken,
      inactivityTimeoutMs: 220,
      progressPollMs: 10,
    });
    assert.equal(result.stdout, '{"completed":true}\n');
    assert.deepEqual(result.parsed, { completed: true });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 duplicate, regressed, corrupt and wrong-group progress never renews child lifetime', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-heartbeat-stagnant-'));
  const entry = path.join(directory, 'stagnant-child.mjs');
  const progressPath = path.join(directory, 'progress.json');
  const descendantPidPath = path.join(directory, 'descendant.pid');
  const runToken = 'pa6-heartbeat-stagnant-token';
  const baseline = {
    schemaVersion: 1,
    runToken,
    groupIndex: 0,
    phase: 'measure',
    comparisonId: 'C-ablation',
    workerRole: 'B',
    variantId: 'C+B',
    sequence: 'B2',
    completedComparisonIds: [],
    completedRoundCount: 2,
  };
  const invalidStates = [
    JSON.stringify(baseline),
    JSON.stringify({ ...baseline, sequence: 'B1', completedRoundCount: 1 }),
    '{',
    JSON.stringify({ ...baseline, groupIndex: 1, sequence: 'A2', completedRoundCount: 3 }),
    JSON.stringify({
      ...baseline,
      runToken: 'pa6-heartbeat-wrong-token',
      sequence: 'A2',
      completedRoundCount: 3,
    }),
  ];
  try {
    await writeFile(
      entry,
      [
        'import{renameSync,writeFileSync}from"node:fs";',
        'import{spawn}from"node:child_process";',
        `const progressPath=${JSON.stringify(progressPath)};`,
        `const descendantPidPath=${JSON.stringify(descendantPidPath)};`,
        `const baseline=${JSON.stringify(JSON.stringify(baseline))};`,
        `const invalidStates=${JSON.stringify(invalidStates)};`,
        'const descendant=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});',
        'writeFileSync(descendantPidPath,String(descendant.pid));',
        'const write=(payload)=>{const temporary=progressPath+".child-tmp";writeFileSync(temporary,payload+"\\n");renameSync(temporary,progressPath);};',
        'write(baseline);',
        'let index=0;',
        'const churn=setInterval(()=>{write(invalidStates[index%invalidStates.length]);index+=1;},50);',
        'setTimeout(()=>{clearInterval(churn);process.stdout.write("{\\"incorrectlySurvived\\":true}\\n");},800);',
      ].join(''),
      'utf8',
    );
    await assert.rejects(
      runArenaPa6StrictJsonChildV1({
        command: process.execPath,
        args: [entry],
        cwd: process.cwd(),
        timeoutMs: 240,
        outputCapBytes: 4_096,
        progressPath,
        expectedProgressGroupIndex: 0,
        expectedProgressToken: runToken,
        inactivityTimeoutMs: 240,
        progressPollMs: 10,
      }),
      (error: unknown) => (
        typeof error === 'object'
        && error !== null
        && Object.getOwnPropertyDescriptor(error, 'kind')?.value === 'timeout'
      ),
    );
    const descendantPid = Number(await readFile(descendantPidPath, 'utf8'));
    assert.ok(Number.isSafeInteger(descendantPid) && descendantPid > 1);
    assert.throws(
      () => process.kill(descendantPid, 0),
      (error: unknown) => (error as NodeJS.ErrnoException).code === 'ESRCH',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 child timeout terminates its exact descendant process group', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-process-group-'));
  const pidPath = path.join(directory, 'grandchild.pid');
  try {
    await assert.rejects(runArenaPa6StrictJsonChildV1({
      command: process.execPath,
      args: [
        '-e',
        'const{spawn}=require("node:child_process");const{writeFileSync}=require("node:fs");const c=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});writeFileSync(process.argv[1],String(c.pid));setInterval(()=>{},1000);',
        pidPath,
      ],
      cwd: process.cwd(),
      timeoutMs: 200,
      outputCapBytes: 1_024,
    }), /timeout/);
    const grandchildPid = Number(await readFile(pidPath, 'utf8'));
    assert.ok(Number.isSafeInteger(grandchildPid) && grandchildPid > 1);
    assert.throws(
      () => process.kill(grandchildPid, 0),
      (error: unknown) => (error as NodeJS.ErrnoException).code === 'ESRCH',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 atomic publication never overwrites and leaves no staging residue', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'arena-pa6-atomic-'));
  const output = path.join(directory, 'report.json');
  try {
    await writeFile(output, 'preserve-me', 'utf8');
    await assert.rejects(publishArenaPa6ReportAtomicV1(output, { status: 'new' }), /EEXIST/);
    assert.equal(await readFile(output, 'utf8'), 'preserve-me');
    assert.deepEqual(await readdir(directory), ['report.json']);
    await rm(output);
    await publishArenaPa6ReportAtomicV1(output, { status: 'fresh' });
    assert.equal(await readFile(output, 'utf8'), '{"status":"fresh"}\n');
    await assert.rejects(publishArenaPa6ReportAtomicV1(output, { status: 'overwrite' }), /EEXIST/);
    assert.deepEqual(await readdir(directory), ['report.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PA6 group validation rejects wrong case/seed/schedule/identity atomically', () => {
  const plan = createArenaPa6PlanV1(3);
  const valid = fakeGroup();
  assert.doesNotThrow(() => assertArenaPa6GroupResultV1(valid, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }));

  const missingFingerprint = mutableClone(valid);
  Reflect.deleteProperty(missingFingerprint.source, 'fingerprint');
  assert.throws(() => assertArenaPa6GroupResultV1(missingFingerprint, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /字段/);

  const forgedFingerprint = mutableClone(valid);
  Reflect.set(forgedFingerprint.source, 'fingerprint', 'c'.repeat(64));
  assert.throws(() => assertArenaPa6GroupResultV1(forgedFingerprint, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /source identity 漂移/);

  const wrongCase = mutableClone(valid);
  wrongCase.rawRounds[0]!.measurement.cases[0]!.caseId = 'wrong-case';
  assert.throws(() => assertArenaPa6GroupResultV1(wrongCase, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /case .*漂移/);

  const wrongSeed = mutableClone(valid);
  wrongSeed.rawRounds[0]!.measurement.cases[0]!.seed += 1;
  assert.throws(() => assertArenaPa6GroupResultV1(wrongSeed, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /identity\/seed 漂移/);

  const wrongSchedule = mutableClone(valid);
  wrongSchedule.rawRounds[0]!.sequence = 'B1';
  assert.throws(() => assertArenaPa6GroupResultV1(wrongSchedule, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /schedule 漂移/);

  const wrongIdentity = mutableClone(valid);
  wrongIdentity.planIdentity = 'wrong-plan';
  assert.throws(() => assertArenaPa6GroupResultV1(wrongIdentity, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /identity 漂移/);

  const wrongLifecycle = mutableClone(valid);
  wrongLifecycle.rawRounds[0]!.measurement.counts.sessionsDestroyed = 39;
  assert.throws(() => assertArenaPa6GroupResultV1(wrongLifecycle, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /lifecycle\/case count/);

  const wrongResource = mutableClone(valid);
  wrongResource.rawRounds[0]!.measurement.resources.maximumRuntimeCount = 6;
  assert.throws(() => assertArenaPa6GroupResultV1(wrongResource, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /resource limit/);

  const wrongGate = mutableClone(valid);
  wrongGate.gates.recoveryMicros = 49;
  assert.throws(() => assertArenaPa6GroupResultV1(wrongGate, {
    expectedGroupIndex: 0,
    plan,
    source: SOURCE,
  }), /重算结果/);
});

test('PA6 report source validation rejects missing and forged fingerprints', () => {
  const report = {
    schemaVersion: 2,
    status: 'failed',
    source: SOURCE,
    environment: {},
    plan: {},
    rawGroups: [],
  };
  assert.doesNotThrow(() => assertArenaPa6AbbaReportSourceIdentityV1(report, SOURCE));

  const missing = mutableClone(report);
  Reflect.deleteProperty(missing.source, 'fingerprint');
  assert.throws(
    () => assertArenaPa6AbbaReportSourceIdentityV1(missing, SOURCE),
    /字段/,
  );

  const forged = mutableClone(report);
  Reflect.set(forged.source, 'fingerprint', 'c'.repeat(64));
  assert.throws(
    () => assertArenaPa6AbbaReportSourceIdentityV1(forged, SOURCE),
    /source identity 漂移/,
  );
});
