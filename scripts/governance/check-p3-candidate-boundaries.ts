import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const PRODUCTION_ROOTS = Object.freeze([
  'src/arena',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-composition/src',
  'packages/arena-product-presentation-three/src',
  'packages/arena-product-v1-content/src',
]);

const P3_AUTHORITY_FILES = Object.freeze([
  'packages/arena-core/src/action-execution-system.ts',
  'packages/arena-core/src/arena-rule-engine-checkpoint-v1.ts',
  'packages/arena-core/src/arena-rule-engine.ts',
  'packages/arena-equipment/src/equipment-system-checkpoint-v1.ts',
  'packages/arena-equipment/src/equipment-system.ts',
  'packages/arena-movement/src/movement-system.ts',
  'packages/arena-physics/src/lightweight-physics.ts',
  'packages/arena-definitions/src/kz-route-definition-v2.ts',
  'packages/arena-definitions/src/kz-route-registry-v2.ts',
  'packages/arena-map/src/kz-route-map-validator-v1.ts',
  'packages/arena-product-content/src/arena-v2-kz-base-map-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-kz-switchback-map-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-race-respawn-capability-id-v1.ts',
  'packages/arena-product-content/src/arena-v2-race-respawn-tuning-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-respawn-capability-id-v1.ts',
  'packages/arena-product-content/src/arena-v2-survival-first-respawn-tuning-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-three-mode-timeline-product-proposal-candidate-v1.ts',
  'packages/arena-product-content/src/arena-v2-kz-verification-character-candidate-v1.ts',
  'packages/arena-bot/src/survival-enemy-observation-v1.ts',
  'packages/arena-bot/src/survival-enemy-controller-v1.ts',
  'packages/arena-bot/src/survival-enemy-observation-v2.ts',
  'packages/arena-bot/src/survival-enemy-controller-v2.ts',
  'packages/arena-match/src/kz-mode-map-adapter-v1.ts',
  'packages/arena-match/src/mode-match-runtime-checkpoint-v3.ts',
  'packages/arena-regression/src/arena-kz-route-physics-verification-v1.ts',
  'packages/arena-regression/src/arena-survival-enemy-physics-verification-v1.ts',
  'packages/arena-regression/src/arena-race-crowding-physics-verification-v1.ts',
  'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
  'packages/arena-regression/src/arena-survival-mode-vertical-integration-candidate-v1.ts',
  'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
]);

const EXPECTED_EXPORTS = Object.freeze([
  ['packages/arena-definitions/src/index.ts', './kz-route-definition-v2.js'],
  ['packages/arena-definitions/src/index.ts', './kz-route-registry-v2.js'],
  ['packages/arena-map/src/index.ts', './kz-route-map-validator-v1.js'],
  ['packages/arena-bot/src/index.ts', './survival-enemy-observation-v1.js'],
  ['packages/arena-bot/src/index.ts', './survival-enemy-controller-v1.js'],
  ['packages/arena-bot/src/index.ts', './survival-enemy-observation-v2.js'],
  ['packages/arena-bot/src/index.ts', './survival-enemy-controller-v2.js'],
  ['packages/arena-match/src/index.ts', './kz-mode-map-adapter-v1.js'],
  ['packages/arena-match/src/index.ts', './mode-match-runtime-checkpoint-v3.js'],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-kz-base-map-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-kz-switchback-map-candidate-v1.js',
  ],
  [
    'packages/arena-product-content/src/index.ts',
    './arena-v2-kz-verification-character-candidate-v1.js',
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
    './arena-v2-three-mode-timeline-product-proposal-candidate-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-kz-route-physics-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-survival-enemy-physics-verification-v1.js',
  ],
  [
    'packages/arena-regression/src/index.ts',
    './arena-race-crowding-physics-verification-v1.js',
  ],
] as const);

const P3_REACHABILITY = new RegExp([
  '\\b(?:KzRouteRegistryV2|createKzRouteDefinitionV2|validateKzRouteMapCandidateV1',
  '|ARENA_V2_KZ_(?:BASE|SWITCHBACK)_MAP_CANDIDATE_V1|SurvivalEnemyControllerV[12]',
  '|createSurvivalEnemyObservationV[12]|KzRaceModeMapAdapterV1',
  '|createModeMatchRuntimeCheckpointV3|validateModeMatchRuntimeCheckpointV3',
  '|createKzSurvivalRouteTargetProjectionV1',
  '|ARENA_V2_KZ_VERIFICATION_CHARACTER_CANDIDATE_V1',
  '|ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2RaceRespawnFallbackAnchorCandidateV1',
  '|ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1',
  '|ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1',
  '|resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1',
  '|runArenaKzRoutePhysicsVerificationCandidateV1',
  '|runArenaSurvivalEnemyPhysicsVerificationCandidateV1',
  '|runArenaRaceCrowdingPhysicsVerificationCandidateV1',
  '|runArenaRaceVerticalIntegrationVerificationCandidateV1',
  '|runArenaSurvivalModeVerticalIntegrationCandidateV1',
  '|runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1',
  '|runArenaSurvivalSupplyActionReplayVerificationCandidateV1)\\b',
  '|/(?:kz-route-definition-v2|kz-route-registry-v2|kz-route-map-validator-v1',
  '|arena-v2-kz-(?:base|switchback)-map-candidate-v1',
  '|arena-v2-race-respawn-capability-id-v1',
  '|arena-v2-race-respawn-tuning-candidate-v1',
  '|arena-v2-survival-respawn-capability-id-v1',
  '|arena-v2-survival-first-respawn-tuning-candidate-v1|survival-enemy-observation-v1',
  '|survival-enemy-observation-v2',
  '|arena-v2-kz-verification-character-candidate-v1',
  '|survival-enemy-controller-v1|survival-enemy-controller-v2|kz-mode-map-adapter-v1',
  '|mode-match-runtime-checkpoint-v3',
  '|arena-kz-route-physics-verification-v1',
  '|arena-survival-enemy-physics-verification-v1',
  '|arena-race-crowding-physics-verification-v1',
  '|arena-race-vertical-integration-verification-v1',
  '|arena-survival-mode-vertical-integration-candidate-v1',
  '|arena-survival-shared-world-authority-verification-v1)\\.js',
].join(''), 'u');

const FORBIDDEN_AUTHORITY_PATTERNS = Object.freeze([
  ['experiment dependency', /@number-strategy-jump\/arena-v1-experiment/u],
  ['Three.js', /(?:from\s+['"]three['"]|arena-presentation-three)/u],
  ['DOM window', /\bwindow(?:\.|\[)/u],
  ['DOM document', /\bdocument(?:\.|\[)/u],
  ['platform navigator', /\bnavigator(?:\.|\[)/u],
  ['unseeded random', /\bMath\.random\s*\(/u],
  ['wall clock', /\b(?:Date|performance)\.now\s*\(/u],
  ['async timer', /\bset(?:Timeout|Interval)\s*\(/u],
] as const);

const CANDIDATE_COMPOSITION_ALLOWLIST = new Set([
  'packages/arena-product-composition/src/arena-v2-learning-evidence-composition-candidate-v1.ts',
]);

async function typescriptFiles(root: string): Promise<readonly string[]> {
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await typescriptFiles(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(candidate);
  }
  return result;
}

function sourceSection(
  source: string,
  startMarker: string,
  endMarker: string,
  label: string,
): string {
  const start = source.indexOf(startMarker);
  const end = start < 0 ? -1 : source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${label}缺少受治理的源码区段。`);
  return source.slice(start, end);
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  for (const [file, expectedExport] of EXPECTED_EXPORTS) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    if (!source.includes(expectedExport)) throw new Error(`${file} 缺少 ${expectedExport}。`);
  }
  for (const file of P3_AUTHORITY_FILES) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const [label, pattern] of FORBIDDEN_AUTHORITY_PATTERNS) {
      if (pattern.test(source)) throw new Error(`${file} 包含禁止的 ${label}。`);
    }
  }
  const survivalSharedWorldAuthority = await readFile(path.join(
    repositoryRoot,
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
  ), 'utf8');
  for (const marker of [
    "command.kind === 'end-survival'",
    'P3 Survival end-survival终局身份漂移',
    'player.active = false;',
    'P3 Survival participant snapshot收到非Survival result',
    "result.reason === 'terminal-player-fall' ? 'eliminated' : 'active'",
    "projectedSlot?.active ? 'active' : 'eliminated'",
    'P3 Survival mode resolution tick漂移',
    'P3 Survival projection/modeState身份不闭合',
    'P3 Survival projection/modeState enemy slots',
    'P3 Survival Projection与终局Result不闭合',
    'P3 Survival非终局Projection/ModeState不得携带ended',
    'P3 Survival终局命令与顶层Result不闭合',
    'P3 Survival terminal command/result identity',
    'P3 Survival player命令结果与ModeState不闭合',
    'P3 Survival projection与player authority不闭合',
    'P3 Survival终局不得调度或执行玩家复活',
    'P3 Survival mode commands未按冻结生命周期阶段排序',
    'P3 Survival enemy fall commands未按participantId稳定排序',
    'P3 Survival enemy命令结果与Projection/ModeState不闭合',
    'P3 Survival command apply缺少当前压力阶段',
    'expectedReactivationReadyTick: authority.respawnReadyTick',
    'if (!command.active) participant.fallCount += 1;',
    'assertAuthorityCheckpointParticipantClosure',
    'P3 Survival authority checkpoint只接受运行中同局Survival Frame',
    'P3 Survival authority checkpoint roster或enemy fall evidence不闭合',
    'evidence.enemyReactivationCount + pendingEnemyReactivationCount',
    'P3 Survival enemy掉落与失活命令集合不闭合',
    'validateSurvivalModeCommands',
    "INTERACTIVE_PRODUCT_CANDIDATE: 'interactive-product-candidate'",
    "VERIFICATION_SCENARIO: 'verification-scenario'",
    'initialPlayerProtectionTicks: 0',
    'executionTimingContentHash: executionTiming.contentHash',
    'P3 Survival authority checkpoint executionTiming漂移',
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
    'verificationExecutionTimingSeparatedFromInteractiveRuntime: true',
    'ARENA_V2_SURVIVAL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2',
    'prepareNeutralVerificationInputFrames',
    'P3 Survival neutral verification只能使用interactive execution timing',
    'P3 Survival supply action起手缺少已确认的真实拾取供给身份',
    'prepareVerificationScenarioInputFrames',
    'P3 Survival scenario verification只能使用verification execution timing',
    'pressureTargetReached: pressureTargetObserved',
  ]) {
    if (!survivalSharedWorldAuthority.includes(marker)) {
      throw new Error(`P3 Survival终局Authority闭包缺少 ${marker}。`);
    }
  }
  const raceVerticalAuthority = await readFile(path.join(
    repositoryRoot,
    'packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts',
  ), 'utf8');
  for (const marker of [
    "command.kind === 'end-race'",
    'P3 Race end-race终局身份漂移',
    'this.#evidence.pendingRespawns.clear();',
    'P3 Race终局后仍保留幽灵待复活证据',
    "projected.status === 'respawning'",
    "matchEnded ? 'eliminated' : 'respawning'",
    "status === 'eliminated' || projected.respawnReadyTick === null",
    'P3 Race mode resolution tick漂移',
    'P3 Race projection/modeState身份不闭合',
    'P3 Race projection/modeState participants',
    'P3 Race Projection与终局Result不闭合',
    'P3 Race非终局Projection不得携带完赛排名',
    'P3 Race终局命令与顶层Result不闭合',
    'P3 Race terminal command/result identity',
    'P3 Race schedule command与掉落/Projection不闭合',
    'P3 Race respawn command与pending/Projection不闭合',
    'P3 Race物理终点事实与finish命令集合不闭合',
    'P3 Race本tick掉落与复活调度集合不闭合',
    'fallRespawnExpectations',
    'participant.latestSafeAnchorId = command.anchorId;',
    'P3 Race projection与participant authority',
    'assertRaceAuthorityCheckpointParticipantClosure',
    'P3 Race authority checkpoint roster或fall evidence不闭合',
    'P3 Race checkpoint falls必须按tick/participantId稳定唯一排序',
    'P3 Race checkpoint pendingRespawns必须按participantId唯一升序',
    'P3 Race运行中checkpoint的fall lifecycle未完全闭合',
    'Race finish command重复、复位中或未知',
    'P3 Race mode commands未按冻结阶段和participantId稳定排序',
    'this.#requireAnchor(command.anchorId);',
    "phase: 'before-falls' | 'after-falls'",
    'const committedFalls = new Set',
    "INTERACTIVE_PRODUCT_CANDIDATE: 'interactive-product-candidate'",
    "VERIFICATION_SCENARIO: 'verification-scenario'",
    'executionTimingContentHash: executionTiming.contentHash',
    'this.#executionTiming.preparingTicks',
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
    'executionTimingIdentityBoundToConfigAndModeFixture: true',
    'verificationScenarioWatchdogControlsInteractiveFixture: false',
    '.registry-${runtimePolicyBinding.contentHash}',
    'ARENA_V2_RACE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2',
  ]) {
    if (!raceVerticalAuthority.includes(marker)) {
      throw new Error(`P3 Race终局Authority闭包缺少 ${marker}。`);
    }
  }
  const duelAuthority = await readFile(path.join(
    repositoryRoot,
    'packages/arena-regression/src/arena-duel-authoritative-runtime-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'if (this.#failed) throw new Error(\'Arena Duel authority已失败关闭。\')',
    'if (this.#feedback === feedback) this.#feedback = null',
    'if (this.#core === core) this.#core = null',
    'restoreOldResourcesCommitPerResource: true',
    'restoreFailureRetainsCleanupOwnership: true',
    'restorePostAdoptionFailureFailsClosed: true',
    '#releasePendingCleanupResources(cleanupErrors)',
    'Arena Duel restore与资源清理失败',
    'this.#failed = true;',
    'Arena Duel authority destroy清理不完整',
    'ARENA_V2_DUEL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2',
  ]) {
    if (!duelAuthority.includes(marker)) {
      throw new Error(`P3三模式Duel Authority缺少可重试清理标记 ${marker}。`);
    }
  }
  for (const marker of [
    'this.#controllers.delete(participantId)',
    "['WeaponFeedback', () => this.#feedback",
    'restoreOldResourcesCommitPerResource: true',
    'restoreFailureRetainsCleanupOwnership: true',
    'restorePostAdoptionFailureFailsClosed: true',
    '#releaseDetachedControllers(nextControllers, cleanupErrors)',
    '#releasePendingCleanupResources(errors)',
    'P3 Survival restore与新资源清理均失败',
    'this.#failed = true;',
    'P3 Survival authority清理不完整',
  ]) {
    if (!survivalSharedWorldAuthority.includes(marker)) {
      throw new Error(`P3 Survival Authority缺少可重试清理标记 ${marker}。`);
    }
  }
  if (!raceVerticalAuthority.includes(
    "this.#failed = true;\n      throw new AggregateError(errors, 'P3 Race authority清理不完整。')",
  )) {
    throw new Error('P3 Race Authority清理失败后必须显式失败关闭。');
  }
  for (const marker of [
    'restoreOldResourcesCommitPerResource: true',
    'restoreFailureRetainsCleanupOwnership: true',
    'restorePostAdoptionFailureFailsClosed: true',
    '#releaseCurrentResources(cleanupErrors)',
    '#releasePendingCleanupResources(errors)',
    'P3 Race restore及资源清理失败',
  ]) {
    if (!raceVerticalAuthority.includes(marker)) {
      throw new Error(`P3 Race Authority缺少restore可重试清理标记 ${marker}。`);
    }
  }
  for (const [label, source, pattern] of [
    [
      'Survival',
      sourceSection(
        survivalSharedWorldAuthority,
        '  #participantSnapshot(',
        '  #localSidecar(',
        'P3 Survival participant snapshot',
      ),
      /\b(?:ended|inactive)\b/u,
    ],
    [
      'Race',
      sourceSection(
        raceVerticalAuthority,
        '  #participantSnapshot(',
        '  #equipmentSnapshots(',
        'P3 Race participant snapshot',
      ),
      /status:\s*projected\.status/u,
    ],
  ] as const) {
    if (pattern.test(source)) {
      throw new Error(`P3 ${label} ModeProjection专用状态不得泄漏到WorldSnapshot。`);
    }
  }
  for (const root of PRODUCTION_ROOTS) {
    for (const file of await typescriptFiles(path.join(repositoryRoot, root))) {
      const relative = path.relative(repositoryRoot, file);
      if (CANDIDATE_COMPOSITION_ALLOWLIST.has(relative)) continue;
      const source = await readFile(file, 'utf8');
      if (P3_REACHABILITY.test(source)) {
        throw new Error(`${file} 在P3门批准前接入了KZ候选。`);
      }
    }
  }
  for (const file of [
    'packages/arena-product-content/src/arena-v2-kz-base-map-candidate-v1.ts',
    'packages/arena-product-content/src/arena-v2-kz-switchback-map-candidate-v1.ts',
    'packages/arena-product-content/src/arena-v2-race-respawn-tuning-candidate-v1.ts',
    'packages/arena-product-content/src/arena-v2-survival-first-respawn-tuning-candidate-v1.ts',
    'packages/arena-product-content/src/arena-v2-kz-verification-character-candidate-v1.ts',
  ]) {
    const candidate = await readFile(path.join(repositoryRoot, file), 'utf8');
    if (!candidate.includes("status: 'production-unreachable'") || !candidate.includes('hardGate: false')) {
      throw new Error(`${file}必须显式保持production-unreachable/hardGate=false。`);
    }
    if (/research-|prototype/i.test(candidate)) {
      throw new Error(`${file}不得携带research/prototype身份。`);
    }
  }
  console.log(JSON.stringify({
    status: 'passed',
    authorityFileCount: P3_AUTHORITY_FILES.length,
    productionRootCount: PRODUCTION_ROOTS.length,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
