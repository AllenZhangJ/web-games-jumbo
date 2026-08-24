import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE_PACKAGE_PREFIX = '@number-strategy-jump/';
const THREE_MODE_REGISTRY_CANDIDATE_FILE =
  'packages/arena-product-content/src/arena-v2-three-mode-registry-candidate-v1.ts';
const THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_FILE =
  'packages/arena-product-content/src/arena-v2-three-mode-timeline-product-proposal-candidate-v1.ts';
const THREE_MODE_QUICK_MATCH_COMPOSITION_CANDIDATE_FILE =
  'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts';
const THREE_MODE_RUNTIME_POLICY_BINDING_CANDIDATE_FILE =
  'packages/arena-regression/src/arena-three-mode-runtime-policy-binding-candidate-v1.ts';
const THREE_MODE_TIMELINE_WIRING_ELIGIBILITY_CANDIDATE_FILE =
  'packages/arena-regression/src/arena-three-mode-timeline-runtime-wiring-eligibility-candidate-v1.ts';
const RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE =
  'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts';
const SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE =
  'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts';
const DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE =
  'packages/arena-regression/src/arena-duel-authoritative-runtime-candidate-v1.ts';
const MODE_MATCH_RUNTIME_FILE = 'packages/arena-match/src/mode-match-runtime-v6.ts';
const ARENA_RULE_ENGINE_FILE = 'packages/arena-core/src/arena-rule-engine.ts';
const MODE_TIMELINE_POLICY_RESOLVER_FILE =
  'packages/arena-match/src/mode-timeline-policy-resolver-v1.ts';
const MODE_OBJECTIVE_POLICY_RESOLVER_FILE =
  'packages/arena-match/src/mode-objective-policy-resolver-v1.ts';
const MODE_RESULT_POLICY_RESOLVER_FILE =
  'packages/arena-match/src/mode-result-policy-resolver-v1.ts';
const THREE_MODE_REGISTRY_PREFLIGHT_TEST_FILE =
  'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts';
const REPLAY_SYNC_CONTRACT_FILE = 'packages/arena-match/src/replay.ts';
const REPLAY_SYNC_CONTRACT_TEST_FILE = 'tests/arena/replay.test.ts';
const P2_TEST_RUNNER_FILE = 'scripts/run-arena-p2-candidate-tests.ts';
const SYNCHRONOUS_RETURN_BOUNDARY_FILE =
  'packages/arena-contracts/src/synchronous-return-boundary.ts';
const P2_DECLARED_THEN_TEST_FILES = Object.freeze([
  'packages/arena-contracts/test/contracts.test.ts',
  'packages/arena-presentation-runtime/test/capability-utils-dedup.test.ts',
  'packages/arena-product-presentation/test/product-presentation-boundaries.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts',
]);

const PRODUCTION_ROOTS = Object.freeze([
  'src/arena',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-presentation-three/src',
  'packages/arena-product-v1-content/src',
]);

const P2_CANDIDATE_PACKAGE_DIRECTORIES = Object.freeze([
  'packages/arena-contracts',
  'packages/arena-definitions',
  'packages/arena-match',
  'packages/arena-matchmaking',
  'packages/arena-product-composition',
  'packages/arena-product-content',
  'packages/arena-product-contracts',
  'packages/arena-product-match',
  'packages/arena-product-progression',
  'packages/arena-product-session',
  'packages/arena-progression',
  'packages/arena-quick-match',
  'packages/arena-regression',
  'packages/arena-session',
]);

const AUTHORITY_CANDIDATE_FILES = Object.freeze([
  'packages/arena-definitions/src/mode-definition.ts',
  'packages/arena-definitions/src/mode-policy-definition.ts',
  'packages/arena-definitions/src/mode-registry.ts',
  'packages/arena-contracts/src/match-content-selection-v2.ts',
  'packages/arena-contracts/src/match-equipment-usage-v3.ts',
  'packages/arena-contracts/src/match-participant-assignment-v2.ts',
  'packages/arena-contracts/src/match-event-v6.ts',
  'packages/arena-contracts/src/arena-public-supply-projection-v3.ts',
  'packages/arena-contracts/src/survival-equipment-ownership-consistency-v1.ts',
  'packages/arena-contracts/src/match-read-frame-v3.ts',
  'packages/arena-match/src/match-config-v6.ts',
  'packages/arena-match/src/match-participant-system-v2.ts',
  'packages/arena-match/src/mode-policy-resolver.ts',
  MODE_TIMELINE_POLICY_RESOLVER_FILE,
  MODE_OBJECTIVE_POLICY_RESOLVER_FILE,
  MODE_RESULT_POLICY_RESOLVER_FILE,
  'packages/arena-match/src/match-mode-system.ts',
  'packages/arena-match/src/mode-runtime-contracts-v1.ts',
  'packages/arena-match/src/duel-mode-adapter-v6.ts',
  'packages/arena-match/src/race-mode-system.ts',
  'packages/arena-match/src/survival-mode-system.ts',
  'packages/arena-match/src/mode-checkpoint-v2.ts',
  REPLAY_SYNC_CONTRACT_FILE,
  'packages/arena-match/src/replay-v6.ts',
  'packages/arena-match/src/mode-match-runtime-v6.ts',
  'packages/arena-match/src/mode-match-runtime-checkpoint-v1.ts',
  'packages/arena-match/src/mode-match-runtime-checkpoint-v2.ts',
  'packages/arena-match/src/mode-match-runtime-checkpoint-v3.ts',
  'packages/arena-match/src/mode-match-runtime-checkpoint-v4.ts',
  'packages/arena-match/src/mode-match-runtime-terminal-evidence-v1.ts',
  'packages/arena-match/src/mode-match-runtime-terminal-evidence-v2.ts',
  'packages/arena-product-content/src/arena-v2-race-respawn-capability-id-v1.ts',
  'packages/arena-product-content/src/arena-v2-race-finish-capability-id-v1.ts',
  'packages/arena-product-content/src/arena-v2-race-respawn-tuning-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-respawn-capability-id-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-first-respawn-tuning-candidate-v1.ts',
  'packages/arena-product-match/src/product-result-replay-settlement-evidence-v1.ts',
  'packages/arena-product-match/src/product-result-runtime-settlement-evidence-v2.ts',
  'packages/arena-product-match/src/product-result-runtime-settlement-evidence-v3.ts',
  'packages/arena-product-match/src/arena-v2-product-authority-registry-candidate-v1.ts',
  'packages/arena-regression/src/arena-mode-verification-runtime-factory-v1.ts',
  THREE_MODE_RUNTIME_POLICY_BINDING_CANDIDATE_FILE,
  THREE_MODE_TIMELINE_WIRING_ELIGIBILITY_CANDIDATE_FILE,
  THREE_MODE_REGISTRY_CANDIDATE_FILE,
  THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_FILE,
]);

const EXPECTED_VERSIONED_EXPORTS = Object.freeze([
  ['packages/arena-contracts/src/index.ts', './match-content-selection-v2.js'],
  ['packages/arena-contracts/src/index.ts', './match-equipment-usage-v3.js'],
  ['packages/arena-contracts/src/index.ts', './match-participant-assignment-v2.js'],
  ['packages/arena-contracts/src/index.ts', './match-event-v6.js'],
  ['packages/arena-contracts/src/index.ts', './arena-public-supply-projection-v3.js'],
  [
    'packages/arena-contracts/src/index.ts',
    './survival-equipment-ownership-consistency-v1.js',
  ],
  ['packages/arena-contracts/src/index.ts', './match-read-frame-v3.js'],
  ['packages/arena-definitions/src/index.ts', './mode-definition.js'],
  ['packages/arena-definitions/src/index.ts', './mode-policy-definition.js'],
  ['packages/arena-definitions/src/index.ts', './mode-registry.js'],
  ['packages/arena-match/src/index.ts', './match-config-v6.js'],
  ['packages/arena-match/src/index.ts', './match-participant-system-v2.js'],
  ['packages/arena-match/src/index.ts', './mode-policy-resolver.js'],
  ['packages/arena-match/src/index.ts', './mode-timeline-policy-resolver-v1.js'],
  ['packages/arena-match/src/index.ts', './mode-objective-policy-resolver-v1.js'],
  ['packages/arena-match/src/index.ts', './mode-result-policy-resolver-v1.js'],
  ['packages/arena-match/src/index.ts', './match-mode-system.js'],
  ['packages/arena-match/src/index.ts', './mode-runtime-contracts-v1.js'],
  ['packages/arena-match/src/index.ts', './duel-mode-adapter-v6.js'],
  ['packages/arena-match/src/index.ts', './race-mode-system.js'],
  ['packages/arena-match/src/index.ts', './survival-mode-system.js'],
  ['packages/arena-match/src/index.ts', './mode-checkpoint-v2.js'],
  ['packages/arena-match/src/index.ts', './replay-v6.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-v6.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-checkpoint-v1.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-checkpoint-v2.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-checkpoint-v3.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-checkpoint-v4.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-terminal-evidence-v1.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-terminal-evidence-v2.js'],
  ['packages/arena-matchmaking/src/index.ts', './mode-match-assignment-v2.js'],
  ['packages/arena-product-content/src/index.ts', './frozen-mode-match-content-pool-v2.js'],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-race-finish-capability-id-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-race-respawn-capability-id-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-race-respawn-tuning-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-survival-respawn-capability-id-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-survival-first-respawn-tuning-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-three-mode-registry-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-three-mode-timeline-product-proposal-candidate-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-runtime-policy-binding-candidate-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-timeline-runtime-wiring-eligibility-candidate-v1.js',
  ],
  ['packages/arena-product-contracts/src/index.ts', './product-participant-contract-v2.js'],
  ['packages/arena-product-contracts/src/index.ts', './product-public-match-info-v2.js'],
  ['packages/arena-product-contracts/src/index.ts', './product-match-result-v3.js'],
  ['packages/arena-product-match/src/index.ts', './mode-product-result-assembler-v3.js'],
  [
    'packages/arena-product-match/src/index.ts',
    './product-result-replay-settlement-evidence-v1.js',
  ],
  [
    'packages/arena-product-match/src/index.ts',
    './product-result-runtime-settlement-evidence-v2.js',
  ],
  [
    'packages/arena-product-match/src/index.ts',
    './product-result-runtime-settlement-evidence-v3.js',
  ],
  [
    'packages/arena-product-match/src/index.ts',
    './arena-v2-product-authority-registry-candidate-v1.js',
  ],
  ['packages/arena-progression/src/index.ts', './mode-match-reward-definition-v2.js'],
  ['packages/arena-progression/src/index.ts', './mode-progression-registry-v2.js'],
  ['packages/arena-product-progression/src/index.ts', './mode-reward-resolver-v2.js'],
  ['packages/arena-product-progression/src/index.ts', './mode-reward-committer-v2.js'],
  ['packages/arena-quick-match/src/index.ts', './mode-quick-match-service-v2.js'],
  ['packages/arena-session/src/index.ts', './mode-local-match-session-v2.js'],
  ['packages/arena-product-session/src/index.ts', './mode-product-session-v2.js'],
  [
    'packages/arena-product-composition/src/index.ts',
    './mode-product-session-composition-v2.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-replay-v6-mode-checkpoint-v2-regression.js',
  ],
  ['packages/arena-regression/src/index.ts', './arena-mode-golden-manifest-v2.js'],
  ['packages/arena-regression/src/index.ts', './arena-mode-verification-plan-v1.js'],
  ['packages/arena-regression/src/index.ts', './arena-mode-verification-runner-v1.js'],
  ['packages/arena-regression/src/index.ts', './arena-mode-verification-fixture-v1.js'],
  [
    'packages/arena-regression/src/index.ts',
    './arena-mode-verification-runtime-factory-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-three-mode-authoritative-quick-match-composition-candidate-v1.js',
  ],
] as const);

const P2_PRODUCTION_REACHABILITY_PATTERN = new RegExp([
  '\\b(?:createMatchContentSelectionV2|createMatchEquipmentUsageV3',
  '|createMatchRosterAssignmentV2|finalizeMatchParticipantAssignmentV2',
  '|createArenaMatchEventV6|createArenaPublicSupplyProjectionV3|createMatchReadFrameV3',
  '|createModeDefinition|createModePolicyDefinition|ModeRegistry|ModePolicyRegistry',
  '|createArenaMatchConfigV6|MatchParticipantSystemV2|ModePolicyResolver',
  '|ModeResultPolicyResolverV1|MatchModeSystem',
  '|DuelModeAdapterV6|RaceModeSystem|SurvivalModeSystem|ModeMatchRuntimeV6',
  '|createModeMatchRuntimeCheckpointV[123]|validateModeMatchRuntimeCheckpointV[123]',
  '|createModeMatchRuntimeTerminalEvidenceV1|validateModeMatchRuntimeTerminalEvidenceV1',
  '|createArenaReplayV6|validateArenaReplayV6|createArenaModeCheckpointV2',
  '|restoreArenaModeCheckpointV2|createModeMatchAssignmentPlanV2',
  '|createFrozenModeMatchContentPoolV2|ProductPublicMatchInfoV2|ProductMatchResultV3',
  '|ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2RaceRespawnFallbackAnchorCandidateV1',
  '|ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1',
  '|createArenaV2ThreeModeRegistryCandidateV1',
  '|ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1',
  '|preflightArenaThreeModeModeRegistryCandidateV1',
  '|ModeProductResultAssemblerV3|ProductResultReplaySettlementEvidenceV1',
  '|ProductResultRuntimeSettlementEvidenceV2',
  '|createProductResultReplaySettlementEvidenceV1',
  '|createProductResultRuntimeSettlementEvidenceV2',
  '|ArenaV2ProductAuthorityRegistryCandidateV1',
  '|ModeProgressionRegistryV2|ModeRewardCommitterV2',
  '|ModeQuickMatchServiceV2|ModeLocalMatchSessionV2|ModeProductSessionV2',
  '|createModeProductSessionCompositionV2',
  '|createArenaReplayV6ModeCheckpointV2RegressionCandidate',
  '|createArenaModeGoldenManifestV2|createArenaModeVerificationPlanV1',
  '|runArenaModeVerificationPlanV1|validateArenaModeVerificationReportV1',
  '|createArenaModeVerificationFixtureV1|createArenaModeVerificationRuntimeFactoryV1)\\b',
  '|/(?:match-content-selection-v2|match-equipment-usage-v3',
  '|match-participant-assignment-v2|match-event-v6|arena-public-supply-projection-v3',
  '|match-read-frame-v3|mode-definition|mode-policy-definition|mode-registry',
  '|match-config-v6|match-participant-system-v2|mode-policy-resolver',
  '|mode-timeline-policy-resolver-v1|mode-objective-policy-resolver-v1',
  '|mode-result-policy-resolver-v1|match-mode-system',
  '|mode-runtime-contracts-v1|duel-mode-adapter-v6|race-mode-system',
  '|survival-mode-system|mode-checkpoint-v2|replay-v6|mode-match-runtime-v6',
  '|mode-match-runtime-checkpoint-v[1234]|mode-match-runtime-terminal-evidence-v[12]',
  '|mode-match-assignment-v2',
  '|frozen-mode-match-content-pool-v2|arena-v2-race-respawn-capability-id-v1',
  '|arena-v2-race-respawn-tuning-candidate-v1|arena-v2-survival-respawn-capability-id-v1',
  '|arena-v2-survival-first-respawn-tuning-candidate-v1|product-participant-contract-v2',
  '|arena-v2-three-mode-registry-candidate-v1',
  '|arena-three-mode-authoritative-quick-match-composition-candidate-v1',
  '|product-public-match-info-v2|product-match-result-v3',
  '|mode-product-result-assembler-v3|product-result-replay-settlement-evidence-v1',
  '|product-result-runtime-settlement-evidence-v[23]',
  '|arena-v2-product-authority-registry-candidate-v1',
  '|mode-match-reward-definition-v2',
  '|mode-progression-registry-v2|mode-reward-resolver-v2|mode-reward-committer-v2',
  '|mode-quick-match-service-v2|mode-local-match-session-v2|mode-product-session-v2',
  '|mode-product-session-composition-v2|arena-replay-v6-mode-checkpoint-v2-regression',
  '|arena-mode-golden-manifest-v2|arena-mode-verification-plan-v1',
  '|arena-mode-verification-runner-v1|arena-mode-verification-fixture-v1',
  '|arena-mode-verification-runtime-factory-v1)\\.js',
].join(''), 'u');

const AUTHORITY_FORBIDDEN_PATTERNS = Object.freeze([
  ['Three.js', /(?:from\s+['"]three['"]|@number-strategy-jump\/arena-presentation-three)/u],
  ['实验包', /@number-strategy-jump\/arena-experiment/u],
  ['DOM window', /\bwindow(?:\.|\[)/u],
  ['DOM document', /\bdocument(?:\.|\[)/u],
  ['平台 navigator', /\bnavigator(?:\.|\[)/u],
  ['未注入随机', /\bMath\.random\s*\(/u],
  ['墙钟 Date.now', /\bDate\.now\s*\(/u],
  ['墙钟 performance.now', /\bperformance\.now\s*\(/u],
  ['异步计时器', /\bset(?:Timeout|Interval)\s*\(/u],
] as const);

const IMPORT_PATTERN = /(?:from\s+|import\s*\()\s*['"](@number-strategy-jump\/[a-z0-9-]+)(?:\/[^'"]*)?['"]/gu;

interface WorkspacePackage {
  readonly directory: string;
  readonly name: string;
  readonly dependencies: ReadonlySet<string>;
  readonly sourceImports: ReadonlySet<string>;
}

function fail(message: string): never {
  throw new Error(message);
}

async function readText(repositoryRoot: string, relativePath: string): Promise<string> {
  return readFile(path.join(repositoryRoot, relativePath), 'utf8');
}

async function collectTypeScriptFiles(
  repositoryRoot: string,
  relativeDirectory: string,
): Promise<string[]> {
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  const directoryStat = await lstat(absoluteDirectory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    return fail(`${relativeDirectory} 必须是真实目录。`);
  }
  const result: string[] = [];
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativeEntry = path.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink()) fail(`${relativeEntry} 不得是符号链接。`);
    if (entry.isDirectory()) {
      result.push(...await collectTypeScriptFiles(repositoryRoot, relativeEntry));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      result.push(relativeEntry);
    }
  }
  return result;
}

function collectWorkspaceImports(source: string): ReadonlySet<string> {
  const imports = new Set<string>();
  for (const match of source.matchAll(IMPORT_PATTERN)) imports.add(match[1]!);
  return imports;
}

async function readWorkspacePackage(
  repositoryRoot: string,
  directory: string,
): Promise<WorkspacePackage> {
  const manifestValue: unknown = JSON.parse(await readText(repositoryRoot, `${directory}/package.json`));
  if (typeof manifestValue !== 'object' || manifestValue === null || Array.isArray(manifestValue)) {
    return fail(`${directory}/package.json 必须是对象。`);
  }
  const manifest = manifestValue as Record<string, unknown>;
  if (typeof manifest.name !== 'string' || !manifest.name.startsWith(WORKSPACE_PACKAGE_PREFIX)) {
    return fail(`${directory}/package.json 缺少合法工作区包名。`);
  }
  const dependencies = new Set<string>();
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const group = manifest[key];
    if (group === undefined) continue;
    if (typeof group !== 'object' || group === null || Array.isArray(group)) {
      fail(`${directory}/package.json.${key} 必须是对象。`);
    }
    for (const dependencyName of Object.keys(group as Record<string, unknown>)) {
      dependencies.add(dependencyName);
    }
  }
  const sourceImports = new Set<string>();
  for (const file of await collectTypeScriptFiles(repositoryRoot, `${directory}/src`)) {
    for (const dependencyName of collectWorkspaceImports(await readText(repositoryRoot, file))) {
      sourceImports.add(dependencyName);
    }
  }
  return Object.freeze({
    directory,
    name: manifest.name,
    dependencies,
    sourceImports,
  });
}

function assertAcyclicWorkspaceGraph(packages: readonly WorkspacePackage[]): void {
  const packagesByName = new Map(packages.map((workspacePackage) => [
    workspacePackage.name,
    workspacePackage,
  ]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (packageName: string): void => {
    if (visited.has(packageName)) return;
    if (visiting.has(packageName)) {
      const cycleStart = stack.indexOf(packageName);
      fail(`P2候选工作区依赖形成环：${[...stack.slice(cycleStart), packageName].join(' -> ')}`);
    }
    visiting.add(packageName);
    stack.push(packageName);
    const workspacePackage = packagesByName.get(packageName)!;
    for (const dependencyName of workspacePackage.sourceImports) {
      if (packagesByName.has(dependencyName)) visit(dependencyName);
    }
    stack.pop();
    visiting.delete(packageName);
    visited.add(packageName);
  };

  for (const packageName of [...packagesByName.keys()].sort()) visit(packageName);
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();

  for (const productionRoot of PRODUCTION_ROOTS) {
    for (const file of await collectTypeScriptFiles(repositoryRoot, productionRoot)) {
      const source = await readText(repositoryRoot, file);
      if (P2_PRODUCTION_REACHABILITY_PATTERN.test(source)) {
        fail(`${file} 在P2总门批准前不得接入版本化P2候选。`);
      }
    }
  }

  for (const [file, expectedExport] of EXPECTED_VERSIONED_EXPORTS) {
    const source = await readText(repositoryRoot, file);
    if (!source.includes(expectedExport)) {
      fail(`${file} 缺少显式版本化导出 ${expectedExport}。`);
    }
  }

  for (const file of AUTHORITY_CANDIDATE_FILES) {
    const source = await readText(repositoryRoot, file);
    for (const [label, pattern] of AUTHORITY_FORBIDDEN_PATTERNS) {
      if (pattern.test(source)) fail(`${file} 的权威候选不得依赖${label}。`);
    }
  }

  const threeModeRegistryCandidate = await readText(
    repositoryRoot,
    THREE_MODE_REGISTRY_CANDIDATE_FILE,
  );
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    'defaultRegistryWired: false',
    'defaultCompositionWired: false',
    'defaultEntryWired: false',
    'createsDefaultRegistryInstance: false',
    'requiresExplicitBasePolicyDefinitions: true',
    'requiredBasePolicyDefinitionCount: EXPECTED_BASE_POLICY_COUNT',
    'registeredPolicyDefinitionCount: EXPECTED_REGISTERED_POLICY_COUNT',
    'bindsSingleSourceRaceRespawnTuning: true',
    'bindsSingleSourceRaceFinishCapability: true',
    'assertSingleSourceRaceObjective(basePolicies)',
    'bindsSingleSourceThreeModeTimelineProductProposal: true',
    'assertSingleSourceTimelinePolicies(basePolicies)',
    'timelineProductProposalContentHash',
    "timelineProposalStatus: 'proposed-not-approved'",
    "timelineBalanceApprovalStatus: 'not-run'",
    'timelineRuntimePolicyConsumptionWired: false',
    "raceRespawnProtectionBalanceApprovalStatus: 'not-run'",
    'raceRespawnTuningContentHash',
    'value.length !== EXPECTED_BASE_POLICY_COUNT',
    "definition.id.includes('.test.')",
  ]) {
    if (!threeModeRegistryCandidate.includes(marker)) {
      fail(`${THREE_MODE_REGISTRY_CANDIDATE_FILE} 缺少失败关闭标记 ${marker}。`);
    }
  }
  if (/export const ARENA_V2_THREE_MODE_REGISTRY_CANDIDATE_V1\s*=/u.test(
    threeModeRegistryCandidate,
  )) {
    fail(`${THREE_MODE_REGISTRY_CANDIDATE_FILE} 不得导出默认Registry实例。`);
  }

  const timelineProductProposal = await readText(
    repositoryRoot,
    THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_FILE,
  );
  for (const marker of [
    "source: SOURCE",
    "const SOURCE = 'preserved-current-runtime-values'",
    "proposalStatus: 'proposed-not-approved'",
    "balanceApprovalStatus: 'not-run'",
    'timelineRuntimePolicyConsumptionWired: false',
    'defaultRegistryWired: false',
    'defaultCompositionWired: false',
    'defaultEntryWired: false',
    'hardLimitActiveTicks: 3_600',
    'hardLimitActiveTicks: 5_940',
    'hardLimitActiveTicks: 13_330',
  ]) {
    if (!timelineProductProposal.includes(marker)) {
      fail(
        `${THREE_MODE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_FILE}`
          + ` 缺少Timeline产品提案隔离标记 ${marker}。`,
      );
    }
  }

  const threeModeQuickMatchComposition = await readText(
    repositoryRoot,
    THREE_MODE_QUICK_MATCH_COMPOSITION_CANDIDATE_FILE,
  );
  for (const marker of [
    'ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1',
    'reusableModeRegistryPreflightBoundaryWired: true',
    'topLevelModeRegistryPreflightConsumerWired: false',
    "modeRegistryOptionName: 'modeRegistryCandidate'",
    "weaponRegistryOptionName: 'weaponRegistryReference'",
    'requiresExplicitRaceParticipantCount: true',
    'requiresExplicitSurvivalEnemyCount: true',
    'preflightRunsBeforeSeedRosterContentAndRuntime: true',
    'participantCountsValidatedFromResolvedPolicy: true',
    'survivalEnemySlotsValidatedFromResolvedPolicy: true',
    'modeRegistryContentHashValidated: true',
    'contentIdentityWired: true',
    "contentIdentityBindingField: 'MatchContentSelectionV2.contentDefinitionId'",
    "contentIdentityBindingPolicy: 'internal-verified-mode-registry-hash-suffix'",
    'bundleContentIdentityPostconditionWired: true',
    'reusablePurePreflightBoundaryWired: true',
    'purePreflightSummaryIsAuthorizationToken: false',
    'downstreamCandidateRevalidationRequired: true',
    // The production-unreachable Information/Local Host is a real consumer;
    // only the default surface/entry and the reusable pure boundary remain off.
    'topLevelConsumerWired: true',
    'modeRegistryPreflightInformationHostWired: true',
    'modeRegistryPreflightLocalPlayableHostWired: true',
    'runtimePolicyConsumptionWired: false',
    'resolvedFrozenRuntimePolicyConsumptionWired: true',
    'timelineRuntimePolicyConsumptionWired: false',
    'explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true',
    'explicitTimelinePolicyRuntimeMirrorWired: false',
    'raceEliminationAndRelationshipPolicyConsumedByRuntime: true',
    'survivalEliminationAndRelationshipPolicyConsumedByRuntime: true',
    'objectiveAndResultExistingSemanticsIdentityBound: true',
    'threeModeObjectivePolicyAssertedAtTerminal: true',
    'threeModeResultPolicyAssertedAtTerminal: true',
    'presentationConsumesModeRegistry: false',
    'defaultRegistryWired: false',
    'defaultCompositionWired: false',
    'defaultEntryWired: false',
    '#reentryAttempted = false',
    'this.#reentryAttempted = true',
  ]) {
    if (!threeModeQuickMatchComposition.includes(marker)) {
      fail(`${THREE_MODE_QUICK_MATCH_COMPOSITION_CANDIDATE_FILE} 缺少预检隔离标记 ${marker}。`);
    }
  }
  if (/runtimePolicyConsumptionWired:\s*true/u.test(
    threeModeQuickMatchComposition,
  )) {
    fail('P2.0e在完整Timeline等Policy接管前不得声明通用runtime消费已接通。');
  }
  if (/topLevelModeRegistryPreflightConsumerWired:\s*true/u.test(
    threeModeQuickMatchComposition,
  )) {
    fail('P2.0g-A纯预检能力不得冒充已接线的顶层consumer。');
  }
  for (const marker of [
    'createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Internal',
    'createArenaThreeModeAuthoritativeQuickMatchBundleFactoryCandidateV1Internal(value, null)',
    'binding.registryContentHash',
    'createRuntimePolicyBindings(binding)',
    'survivalPressureSlotOrderAndStagesConsumedByRuntime: true',
    'survivalTierPolicyConstrainsActiveWeaponRegistrySubset: true',
    'runtimePolicyBindings.duel',
    'runtimePolicyBindings.race',
    'runtimePolicyBindings.survival',
    '.mode-registry-${modeRegistryContentHash}',
    'assertModeRegistryBundleContentIdentity(\n        bundle,\n        this.#registryContentHash,\n        this.#authorityRegistry,',
    "const hasModeRegistryCandidate = Object.hasOwn(source, 'modeRegistryCandidate');",
    '? new ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1({',
    'weaponRegistryReference',
    '...(hasModeRegistryCandidate ? { modeRegistryCandidate } : {})',
    'export function preflightArenaThreeModeModeRegistryCandidateV1(',
    'const binding = modeRegistryPreflightBinding(modeRegistryCandidate);',
    'assertRequestedParticipantCounts(binding, raceParticipantCount, survivalEnemyCount);',
  ]) {
    if (!threeModeQuickMatchComposition.includes(marker)) {
      fail(`${THREE_MODE_QUICK_MATCH_COMPOSITION_CANDIDATE_FILE} 缺少内部已验证Registry身份绑定标记 ${marker}。`);
    }
  }

  const runtimePolicyBinding = await readText(
    repositoryRoot,
    THREE_MODE_RUNTIME_POLICY_BINDING_CANDIDATE_FILE,
  );
  for (const marker of [
    'projectArenaRuntimePolicyResolverBundleCandidateV1',
    'projectArenaRuntimeTimelinePolicyResolverBundleCandidateV1',
    'projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1',
    'projectArenaRuntimeResultPolicyResolverBundleCandidateV1',
    'assertArenaRuntimeExistingModeSemanticsCandidateV1',
    'raceEliminationAndRelationshipPolicyConsumedByRuntime: true',
    'survivalEliminationAndRelationshipPolicyConsumedByRuntime: true',
    "objectivePolicyConsumption: 'runtime-terminal-objective-asserted'",
    "resultPolicyConsumption: 'runtime-terminal-result-asserted'",
    'explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true',
    'explicitTimelinePolicyRuntimeMirrorWired: false',
    'threeModeObjectivePolicyAssertedAtTerminal: true',
    'threeModeResultPolicyAssertedAtTerminal: true',
  ]) {
    if (!runtimePolicyBinding.includes(marker)) {
      fail(`${THREE_MODE_RUNTIME_POLICY_BINDING_CANDIDATE_FILE} 缺少resolved运行标记 ${marker}。`);
    }
  }
  const duelAuthoritativeRuntime = await readText(
    repositoryRoot,
    DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE,
  );
  for (const marker of [
    'projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1',
    'projectArenaRuntimeResultPolicyResolverBundleCandidateV1',
    'objectivePolicyBundle',
    'resultPolicyBundle',
    "resolvedResultPolicyRuntimeBinding: 'optional-explicit-registry-terminal-assertion'",
    'explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true',
    'explicitTimelinePolicyRuntimeMirrorWired: false',
  ]) {
    if (!duelAuthoritativeRuntime.includes(marker)) {
      fail(`${DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE} 缺少终局Result Policy标记 ${marker}。`);
    }
  }
  const modeMatchRuntime = await readText(repositoryRoot, MODE_MATCH_RUNTIME_FILE);
  for (const marker of [
    'ModeTimelinePolicyResolverV1',
    'timelinePolicyResolver.assertDuelObservation',
    'Duel Mode driver authority, timeline, objective and result policy bundle',
    'ModeObjectivePolicyResolverV1',
    'ModeResultPolicyResolverV1',
    'objectivePolicyResolver.assertTerminalObjective',
    'resultPolicyResolver?.assertResult(objectiveResult, tick)',
    'Duel Mode driver authority, objective and result policy bundle',
  ]) {
    if (!modeMatchRuntime.includes(marker)) {
      fail(`${MODE_MATCH_RUNTIME_FILE} 缺少Duel终局Result Policy标记 ${marker}。`);
    }
  }
  for (const marker of [
    'explicitSupplyFactsRequiredEveryCommittedStep: true',
    'const STEP_REQUIRED_KEYS = new Set([',
    "'supplyFacts',",
    'supplyFacts: createArenaSupplyAuthorityFactsV1(source.supplyFacts)',
  ]) {
    if (!modeMatchRuntime.includes(marker)) {
      fail(`${MODE_MATCH_RUNTIME_FILE} 缺少逐帧显式补给事实标记 ${marker}。`);
    }
  }
  for (const marker of [
    'explicitLocalJumpAvailabilityRequiredEveryStartAndStep: true',
    "'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability', 'stateHash'",
    'localJumpAvailability: start.localJumpAvailability',
    'localJumpAvailability: stepped.localJumpAvailability',
  ]) {
    if (!modeMatchRuntime.includes(marker)) {
      fail(`${MODE_MATCH_RUNTIME_FILE} 缺少开局/逐帧显式跳跃能力标记 ${marker}。`);
    }
  }

  const modeTimelinePolicyResolver = await readText(
    repositoryRoot,
    MODE_TIMELINE_POLICY_RESOLVER_FILE,
  );
  for (const marker of [
    'ModeTimelinePolicyResolverV1',
    'assertRuntimeMirror',
    'assertDuelObservation',
    'terminalBeforeActiveAdvance',
    'terminalAtHardLimit',
    'Mode Timeline runtime镜像与resolved Timeline Policy不一致',
    'Duel首个active step前不能产生终局结果',
    'Duel Timeline hard limit终局边界漂移',
  ]) {
    if (!modeTimelinePolicyResolver.includes(marker)) {
      fail(`${MODE_TIMELINE_POLICY_RESOLVER_FILE} 缺少Timeline Policy失败关闭标记 ${marker}。`);
    }
  }

  const timelineWiringEligibility = await readText(
    repositoryRoot,
    THREE_MODE_TIMELINE_WIRING_ELIGIBILITY_CANDIDATE_FILE,
  );
  for (const marker of [
    'readsOnlyAuthoritativeRuntimeMirrors: true',
    'callerCannotSubmitRuntimeMirrors: true',
    'coversEverySupportedSurvivalEnemyCount: true',
    'exactMismatchFieldsReported: true',
    'requiresSingleRegistryIdentity: true',
    'timelinePolicyContentVersion: 2',
    'TIMELINE_POLICY_VARIANT_SELECTOR_KIND_V2.SURVIVAL_ENEMY_COUNT',
    'balanceApprovalStatus: \'not-run\'',
    'registryContentHash: duel.registryContentHash',
    'mayWireRuntimeTimelinePolicy: false',
    'blocked-by-runtime-policy-mismatch',
    'awaiting-balance-approval',
  ]) {
    if (!timelineWiringEligibility.includes(marker)) {
      fail(
        `${THREE_MODE_TIMELINE_WIRING_ELIGIBILITY_CANDIDATE_FILE}`
          + ` 缺少Timeline接线资格失败关闭标记 ${marker}。`,
      );
    }
  }
  for (const marker of [
    'createArenaThreeModeTimelineRuntimeWiringEligibilityCandidateV1',
    'timelineRuntimeWiringEligibility',
    'timelineRuntimeWiringEligibilityReported: true',
    'timelineRuntimePolicyConsumptionWired: false',
  ]) {
    if (!threeModeQuickMatchComposition.includes(marker)) {
      fail(
        `${THREE_MODE_QUICK_MATCH_COMPOSITION_CANDIDATE_FILE}`
          + ` 缺少Timeline资格预检消费标记 ${marker}。`,
      );
    }
  }

  const modeObjectivePolicyResolver = await readText(
    repositoryRoot,
    MODE_OBJECTIVE_POLICY_RESOLVER_FILE,
  );
  for (const marker of [
    'ModeObjectivePolicyResolverV1',
    'assertTerminalObjective',
    'Duel Result reason与独立参与者Objective事实不一致',
    'Race有效终点声明必须在声明tick结束比赛',
    'Race Objective finish claim只能引用本局participant',
    'Survival第二次玩家掉落必须产生terminal-player-fall',
    'Survival Objective facts.fallCount不能超过终局上限2',
    'Race无终点声明只能由本局显式hard limit产生no-finisher',
  ]) {
    if (!modeObjectivePolicyResolver.includes(marker)) {
      fail(`${MODE_OBJECTIVE_POLICY_RESOLVER_FILE} 缺少Objective Policy失败关闭标记 ${marker}。`);
    }
  }
  const raceAuthoritativeRuntime = await readText(
    repositoryRoot,
    RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE,
  );
  for (const marker of [
    'allowsTarget: (sourceParticipantId: string, targetParticipantId: string) => (',
    "fallDisposition !== 'schedule-respawn'",
    "relationshipBetween(attackerId, targetId) !== 'hostile'",
    'projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1',
    'objectivePolicyBundle',
    'ModeResultPolicyResolverV1',
    'assertResult(normalizedModeResult, tick)',
    'explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true',
    'explicitTimelinePolicyRuntimeMirrorWired: false',
    'interactiveExecutionTimingPurpose:',
    'interactive-product-candidate',
    'executionTimingIdentityBoundToConfigAndModeFixture: true',
    'verificationScenarioWatchdogControlsInteractiveFixture: false',
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
    '.registry-${runtimePolicyBinding.contentHash}',
  ]) {
    if (!raceAuthoritativeRuntime.includes(marker)) {
      fail(`${RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE} 缺少resolved裁决标记 ${marker}。`);
    }
  }
  const survivalAuthoritativeRuntime = await readText(
    repositoryRoot,
    SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE,
  );
  for (const marker of [
    'allowsTarget: (sourceParticipantId: string, targetParticipantId: string) => (',
    "fallDisposition !== 'count-for-objective'",
    "fallDisposition !== 'deactivate-slot'",
    "relationshipBetween(attackerId, targetId) !== 'hostile'",
    'projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1',
    'objectivePolicyBundle',
    'ModeResultPolicyResolverV1',
    'assertResult(normalizedModeResult, tick)',
    'explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true',
    'explicitTimelinePolicyRuntimeMirrorWired: false',
    'interactiveInitialPlayerProtectionTicks: 0',
    'verificationExecutionTimingSeparatedFromInteractiveRuntime: true',
    'executionTimingCheckpointSchemaVersion: 3',
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
  ]) {
    if (!survivalAuthoritativeRuntime.includes(marker)) {
      fail(`${SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE} 缺少resolved裁决标记 ${marker}。`);
    }
  }
  for (const [file, source] of [
    [DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE, duelAuthoritativeRuntime],
    [RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE, raceAuthoritativeRuntime],
    [SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_FILE, survivalAuthoritativeRuntime],
  ] as const) {
    for (const marker of [
      'localPrimaryAffordanceProjectedFromRuleEngine: true',
      'localPrimaryHoldAffordanceProjectedFromRuleEngine: true',
    ]) {
      if (!source.includes(marker)) {
        fail(`${file} 缺少正式primary/primaryHold权威投影标记 ${marker}。`);
      }
    }
    if (/localSidecar[\s\S]{0,1800}reason: 'not-requested'/u.test(source)) {
      fail(`${file} 不得在正式local sidecar中硬编码primaryHold不可用。`);
    }
    if (source.includes('timelinePolicyBundle')) {
      fail(`${file} 当前不得注入timelinePolicyBundle；Timeline数值批准前必须保持未接线。`);
    }
  }
  const survivalModeSystem = await readText(
    repositoryRoot,
    'packages/arena-match/src/survival-mode-system.ts',
  );
  for (const marker of [
    'const hardLimitReached = activeTick >= this.#hardLimitActiveTicks;',
    'if (terminal || hardLimitReached)',
    'const terminalByHardLimit = !terminalByPlayer && hardLimitReached;',
  ]) {
    if (!survivalModeSystem.includes(marker)) {
      fail(`packages/arena-match/src/survival-mode-system.ts 缺少终局优先于复活调度标记 ${marker}。`);
    }
  }
  const arenaRuleEngine = await readText(repositoryRoot, ARENA_RULE_ENGINE_FILE);
  for (const marker of [
    'RuleTargetEligibilityContract',
    'allowedTargetPairs',
    '#eligibleTargets(',
    'checkpoint规则内容身份不一致',
  ]) {
    if (!arenaRuleEngine.includes(marker)) {
      fail(`${ARENA_RULE_ENGINE_FILE} 缺少目标资格checkpoint闭包标记 ${marker}。`);
    }
  }

  const modeResultPolicyResolver = await readText(
    repositoryRoot,
    MODE_RESULT_POLICY_RESOLVER_FILE,
  );
  for (const marker of [
    'ModeResultPolicyResolverV1',
    'createModeResultV3Payload(value)',
    'result.endedAtTick !== expectedTerminalTick',
    'assertRaceProjection(result, this.#participantIds)',
    'Survival Result player必须是本局唯一player participant',
    'Survival time-cap不能覆盖已经达到第二次掉落的终局',
  ]) {
    if (!modeResultPolicyResolver.includes(marker)) {
      fail(`${MODE_RESULT_POLICY_RESOLVER_FILE} 缺少终局Policy失败关闭标记 ${marker}。`);
    }
  }

  const p2TestRunner = await readText(repositoryRoot, P2_TEST_RUNNER_FILE);
  if (!p2TestRunner.includes(THREE_MODE_REGISTRY_PREFLIGHT_TEST_FILE)) {
    fail(`${P2_TEST_RUNNER_FILE} 缺少P2.0e-P2.0g-A延期Regression测试登记。`);
  }
  if (!p2TestRunner.includes(REPLAY_SYNC_CONTRACT_TEST_FILE)) {
    fail(`${P2_TEST_RUNNER_FILE} 缺少P2.0g-B Replay同步合同测试登记。`);
  }
  if (!p2TestRunner.includes('packages/arena-match/test/mode-result-policy-resolver-v1.test.ts')) {
    fail(`${P2_TEST_RUNNER_FILE} 缺少P2.0p终局Policy延期测试登记。`);
  }
  if (!p2TestRunner.includes('packages/arena-match/test/mode-objective-policy-resolver-v1.test.ts')) {
    fail(`${P2_TEST_RUNNER_FILE} 缺少P2.0q Objective Policy延期测试登记。`);
  }
  if (!p2TestRunner.includes('packages/arena-match/test/mode-timeline-policy-resolver-v1.test.ts')) {
    fail(`${P2_TEST_RUNNER_FILE} 缺少P2.0r Timeline Policy能力延期测试登记。`);
  }
  for (const testFile of P2_DECLARED_THEN_TEST_FILES) {
    if (!p2TestRunner.includes(testFile)) {
      fail(`${P2_TEST_RUNNER_FILE} 缺少P2.0s声明then字段延期测试 ${testFile}。`);
    }
  }
  const synchronousReturnBoundary = await readText(
    repositoryRoot,
    SYNCHRONOUS_RETURN_BOUNDARY_FILE,
  );
  for (const marker of [
    "Object.getOwnPropertyDescriptor(owner, 'then')",
    "if (thenDescriptor === null) return;",
    '返回then字段，必须同步完成。',
  ]) {
    if (!synchronousReturnBoundary.includes(marker)) {
      fail(`${SYNCHRONOUS_RETURN_BOUNDARY_FILE} 缺少P2.0s同步端口失败关闭标记 ${marker}。`);
    }
  }
  if (/typeof\s+thenDescriptor\.value\s*===\s*['"]function['"]/u.test(
    synchronousReturnBoundary,
  )) {
    fail(`${SYNCHRONOUS_RETURN_BOUNDARY_FILE} 不得只拒绝函数型then字段。`);
  }
  const replaySyncContract = await readText(repositoryRoot, REPLAY_SYNC_CONTRACT_FILE);
  for (const marker of [
    "Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then')",
    'Reflect.apply(NATIVE_PROMISE_THEN, verification, [NOOP, NOOP])',
    'visited.has(target)',
    'depth < MAX_SYNC_DESCRIPTOR_PROTOTYPE_DEPTH',
    "Object.getOwnPropertyDescriptor(target, 'then')",
    '返回then字段，必须同步完成。',
  ]) {
    if (!replaySyncContract.includes(marker)) {
      fail(`${REPLAY_SYNC_CONTRACT_FILE} 缺少P2.0g-B无副作用thenable拒绝标记 ${marker}。`);
    }
  }
  if (/(?:descriptor\.value\.call\(verification|Reflect\.apply\(descriptor\.value,\s*verification)/u
    .test(replaySyncContract)) {
    fail(`${REPLAY_SYNC_CONTRACT_FILE} 不得调用外部beforeStep then方法。`);
  }
  if (/typeof\s+thenDescriptor\.value\s*===\s*['"]function['"]/u.test(replaySyncContract)) {
    fail(`${REPLAY_SYNC_CONTRACT_FILE} 不得只拒绝函数型beforeStep then字段。`);
  }
  const replayThenableRejectIndex = replaySyncContract.indexOf('rejectThenable(verification);');
  const replayCoreStepIndex = replaySyncContract.indexOf(
    'replayedEvents.push(...core.step(frames));',
  );
  if (replayThenableRejectIndex < 0
    || replayCoreStepIndex < 0
    || replayThenableRejectIndex >= replayCoreStepIndex) {
    fail(`${REPLAY_SYNC_CONTRACT_FILE} 必须在Core step前拒绝beforeStep异步返回。`);
  }
  const productRegistryTest = await readText(
    repositoryRoot,
    'packages/arena-product-content/test/arena-v2-three-mode-registry-candidate-v1.test.ts',
  );
  if (/@number-strategy-jump\/arena-regression|\.\.\/\.\.\/arena-regression/u.test(
    productRegistryTest,
  )) {
    fail('arena-product-content测试不得反向依赖arena-regression。');
  }
  if (!p2TestRunner.includes(
    'packages/arena-product-content/test/arena-v2-three-mode-timeline-product-proposal-candidate-v1.test.ts',
  )) {
    fail('P2延期清单缺少三模式Timeline产品提案V1/V2兼容测试。');
  }

  const workspacePackages = await Promise.all(P2_CANDIDATE_PACKAGE_DIRECTORIES.map(
    (directory) => readWorkspacePackage(repositoryRoot, directory),
  ));
  for (const workspacePackage of workspacePackages) {
    for (const dependencyName of workspacePackage.sourceImports) {
      if (
        dependencyName !== workspacePackage.name
        && !workspacePackage.dependencies.has(dependencyName)
      ) {
        fail(`${workspacePackage.directory} 使用未声明依赖 ${dependencyName}。`);
      }
    }
  }
  assertAcyclicWorkspaceGraph(workspacePackages);

  console.log(JSON.stringify({
    status: 'passed',
    productionRootCount: PRODUCTION_ROOTS.length,
    authorityCandidateFileCount: AUTHORITY_CANDIDATE_FILES.length,
    versionedExportCount: EXPECTED_VERSIONED_EXPORTS.length,
    workspacePackageCount: workspacePackages.length,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
