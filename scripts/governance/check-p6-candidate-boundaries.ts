import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PRODUCTION_ROOTS = Object.freeze([
  'src/entry',
  'packages/arena-v1-composition/src',
  'packages/arena-v1-application-launch/src',
  'packages/arena-v1-application-session/src',
  'packages/arena-product-presentation-three/src',
  'packages/arena-product-v1-content/src',
  'packages/arena-release/src',
]);
const DEFAULT_COMPOSITION_FILES = Object.freeze([
  'packages/arena-product-composition/src/product-session-composition.ts',
  'packages/arena-product-composition/src/mode-product-session-composition-v2.ts',
]);
const A6_COLLECTION_PREVIEW_FILES = Object.freeze({
  composition:
    'packages/arena-product-presentation-three/src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
  resourceExecution:
    'packages/arena-product-presentation-three/src/arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.ts',
  leaseOwner:
    'packages/arena-product-presentation-three/src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.ts',
  lazyLoaderAdapter:
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.ts',
  mountLifecycle:
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.ts',
  mountOwner:
    'packages/arena-product-presentation-three/src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.ts',
  pageTransaction:
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-page-transaction-owner-candidate-v1.ts',
  pageSurfaceHost:
    'packages/arena-product-presentation-three/src/arena-v2-collection-preview-page-surface-host-candidate-v1.ts',
  renderSurface:
    'packages/arena-product-presentation-three/src/arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.ts',
  readInput: 'src/entry/arena-v2-collection-preview-read-input-candidate-v1.ts',
  formalWeb: 'src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
});
const DEFAULT_PRODUCT_ENTRIES = Object.freeze([
  'src/entry/web.ts',
  'src/entry/wechat.ts',
  'src/entry/douyin.ts',
]);
export const P6_RENDERER_NEUTRAL_AUTHORITY_FILES = Object.freeze([
  'packages/arena-core/src/arena-rule-engine.ts',
  'packages/arena-map/src/arena-map-system.ts',
  'packages/arena-equipment/src/equipment-system.ts',
  'packages/arena-match/src/match-participant-system-v2.ts',
  'packages/arena-match/src/race-mode-system.ts',
  'packages/arena-match/src/survival-mode-system.ts',
  'packages/arena-match/src/mode-match-runtime-v6.ts',
  'packages/arena-movement/src/movement-system.ts',
  'packages/arena-session/src/mode-local-match-session-v2.ts',
  'packages/arena-session/src/mode-authoritative-local-match-session-v3.ts',
  'packages/arena-quick-match/src/mode-quick-match-service-v2.ts',
  'packages/arena-quick-match/src/mode-authoritative-quick-match-service-v3.ts',
  'packages/arena-product-match/src/product-match-runtime.ts',
  'packages/arena-product-match/src/product-match-coordinator.ts',
  'packages/arena-product-match/src/quick-match-product-factory.ts',
  'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
  'packages/arena-product-progression/src/mode-reward-committer-v2.ts',
  'packages/arena-product-match/src/arena-v2-product-authority-registry-candidate-v1.ts',
  'packages/arena-product-match/src/product-result-replay-settlement-evidence-v1.ts',
  'packages/arena-product-match/src/product-result-runtime-settlement-evidence-v2.ts',
  'packages/arena-product-match/src/product-result-runtime-settlement-evidence-v3.ts',
  'packages/arena-profile-contracts/src/arena-v2-learning-profile-definition-v1.ts',
  'packages/arena-profile-contracts/src/arena-v2-learning-profile-v1.ts',
  'packages/arena-profile-contracts/src/arena-v2-learning-grant-v1.ts',
  'packages/arena-profile-contracts/src/arena-v2-learning-profile-reducer-v1.ts',
  'packages/arena-profile-contracts/src/arena-v2-learning-profile-save-envelope-v1.ts',
  'packages/arena-profile-service/src/player-profile-service.ts',
  'packages/arena-profile-service/src/arena-v2-learning-profile-service-v1.ts',
  'packages/arena-product-progression/src/arena-v2-collection-mastery-detail-facts-projection-v1.ts',
  'packages/arena-product-progression/src/arena-v2-collection-next-goal-identity-projection-v1.ts',
  'packages/arena-product-progression/src/arena-v2-collection-progress-summary-facts-projection-v1.ts',
  'packages/arena-product-progression/src/arena-v2-learning-capacity-report-v1.ts',
  'packages/arena-product-progression/src/arena-v2-learning-pace-calibration-candidate-v1.ts',
  'packages/arena-product-progression/src/arena-v2-learning-evidence-definition-v1.ts',
  'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts',
  'packages/arena-product-progression/src/arena-v2-map-route-research-milestone-projection-v1.ts',
  'packages/arena-product-progression/src/arena-v2-match-learning-grant-resolver-v1.ts',
  'packages/arena-product-progression/src/arena-v2-next-learning-goal-continuation-route-v1.ts',
  'packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts',
  'packages/arena-product-progression/src/arena-v2-result-next-goal-route-fit-v1.ts',
  'packages/arena-product-progression/src/arena-v2-offline-retention-observation-journal-candidate-v1.ts',
  'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
  'packages/arena-contracts/src/action-feedback-outcome-consistency-v1.ts',
  'packages/arena-contracts/src/competitive-equipment-action-eligibility-v1.ts',
  'packages/arena-contracts/src/survival-equipment-action-eligibility-v1.ts',
  'packages/arena-product-progression/src/arena-v2-retention-observation-v1.ts',
  'packages/arena-product-progression/src/arena-v2-reward-profile-information-candidate-v1.ts',
  'packages/arena-product-progression/src/arena-v2-three-mode-reward-registry-candidate-v1.ts',
  'packages/arena-product-progression/src/arena-v2-weapon-collection-research-milestone-projection-v1.ts',
  'packages/arena-product-progression/src/arena-v2-weapon-research-pace-calibration-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-current-weapon-threat-opponent-selector-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-hud-ready-learning-mode-session-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-information-host-adaptive-counterplay-bot-owner-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-information-host-counterplay-bot-port-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-information-mode-session-host-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-learning-evidence-composition-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-learning-mode-session-bridge-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-profile-persistence-disposition-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-learning-settlement-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-learning-settlement-intent-journal-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-learning-settlement-recovery-owner-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-learning-terminal-handoff-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-local-counterplay-bot-current-facts-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-profile-services-owner-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-weapon-counterplay-bot-probe-composition-candidate-v1.ts',
  'packages/arena-product-composition/src/arena-v2-weapon-counterplay-bot-probe-controller-candidate-v1.ts',
]);
const REACHABILITY = /arena-v2-(?:product-authority-registry|learning-profile|learning-grant|replay-learning|next-learning|result-next-goal-route-fit|learning-capacity|learning-evidence|learning-information|learning-settlement|learning-terminal|mode-learning-session|retention-observation)[^'"\s]*\.js|product-result-(?:replay-settlement-evidence-v1|runtime-settlement-evidence-v2)\.js|ProductResult(?:ReplaySettlementEvidenceV1|RuntimeSettlementEvidenceV2)|ArenaV2ProductAuthorityRegistryCandidateV1|ARENA_V2_(?:PRODUCT_AUTHORITY|RESULT_NEXT_GOAL_ROUTE_FIT|LEARNING_(?:PROFILE|SETTLEMENT|EVIDENCE|TERMINAL)|MODE_LEARNING_SESSION|RETENTION_OBSERVATION).*CANDIDATE/u;
export const P6_RENDERER_NEUTRAL_FORBIDDEN_PATTERNS = Object.freeze([
  ['experiment dependency', /@number-strategy-jump\/arena-v1-experiment/u],
  ['Three.js dependency', /(?:from\s+['"]three['"]|arena-presentation-three)/u],
  ['DOM window', /\bwindow(?:\.|\[)/u],
  ['DOM document', /\bdocument(?:\.|\[)/u],
  ['unseeded random', /\bMath\.random\s*\(/u],
  ['wall clock', /\b(?:Date|performance)\.now\s*\(/u],
  ['network sink', /\b(?:fetch|sendBeacon)\s*\(/u],
] as const);
export const P6_PERMANENT_COMBAT_VALUE_PATTERN =
  /readonly\s+(?:lives|movementSpeed|knockback|cooldownTicks|hitPoints)\s*:/u;

async function files(root: string): Promise<readonly string[]> {
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await files(candidate));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(candidate);
  }
  return result;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const learningProfileContract = await readFile(path.join(
    root,
    'packages/arena-profile-contracts/src/arena-v2-learning-profile-v1.ts',
  ), 'utf8');
  for (const marker of [
    'assertModeRecordPerformanceInvariant(',
    'assertMapSegmentPerformanceInvariant(',
    'Duel胜场与最快胜利记录必须双向一致',
    'Race最快到达记录必须有至少一次有效完成',
    'Race胜场与最快到达记录必须双向一致',
    'Survival胜场必须恒为0',
    'Survival有效完成与最长坚持记录必须双向一致',
    'Duel完成次数必须与游玩次数严格一致',
    'Survival完成次数必须与游玩次数严格一致',
    'Race最佳成绩必须有至少一条段落完成证据',
    'Race最佳成绩只能记录在地图最终段',
    'Survival最佳成绩必须有至少一条段落完成证据',
  ]) {
    if (!learningProfileContract.includes(marker)) {
      throw new Error(`P6 Learning Profile成绩语义不变量缺少${marker}。`);
    }
  }
  const learningGrantContract = await readFile(path.join(
    root,
    'packages/arena-profile-contracts/src/arena-v2-learning-grant-v1.ts',
  ), 'utf8');
  for (const marker of [
    'sourceModeDefinition.kind',
    'Duel每局必须计为有效完成',
    'Duel胜场与最快胜利候选必须双向一致',
    'Race最快到达候选必须来自有效完成',
    'Race胜场与最快到达候选必须双向一致',
    'Survival每局必须计为有效完成',
    'Survival胜场必须恒为0',
    'Survival每局必须携带最长坚持候选',
    'collectedMapDefinitionIds 必须与本局有效完成及来源地图精确一致',
    'Duel不能携带Race或Survival地图成绩候选',
    'Race成绩候选只能记录在来源地图最终段',
    'Race段落成绩必须与模式最佳候选一致',
    'Race有段落证据时必须精确携带一个最终段成绩候选',
    'Survival不能携带Race地图成绩候选',
    'Survival段落成绩必须全部存在且与模式最佳候选一致',
    '模式限定与本局来源模式不一致',
    '地图限定不在本局来源地图中',
    '段落限定缺少本局精确地图段落证据',
    '武器限定缺少本局武器事实',
    '武器与段落交叉限定至少需要一项武器情境证据',
    'Survival武器事实必须携带生存情境证据',
    '非Survival模式不能携带生存情境证据',
    '非Duel模式不能携带1v1反制情境证据',
    '每条地图段落事实必须携带本局完成证据',
    '每条武器事实必须携带至少一项本局情境证据',
    'weaponDeltas 为空时不能携带主研究武器候选',
    'weaponDeltas 非空时必须精确携带一把主研究武器候选',
    'weaponDeltas 必须精确一条主研究证据且身份匹配收藏候选',
    '每条武器事实必须携带地面或空中基础情境证据',
  ]) {
    if (!learningGrantContract.includes(marker)) {
      throw new Error(`P6 Learning Grant单局模式事实不变量缺少${marker}。`);
    }
  }
  for (const relative of P6_RENDERER_NEUTRAL_AUTHORITY_FILES) {
    const source = await readFile(path.join(root, relative), 'utf8');
    for (const [label, pattern] of P6_RENDERER_NEUTRAL_FORBIDDEN_PATTERNS) {
      if (pattern.test(source)) throw new Error(`${relative}包含禁止的${label}。`);
    }
    if (P6_PERMANENT_COMBAT_VALUE_PATTERN.test(source)) {
      throw new Error(`${relative}不得把永久战斗数值写入学习档案。`);
    }
  }
  for (const productionRoot of PRODUCTION_ROOTS) {
    for (const file of await files(path.join(root, productionRoot))) {
      if (REACHABILITY.test(await readFile(file, 'utf8'))) {
        throw new Error(`${file}在P6门前接入了学习候选。`);
      }
    }
  }
  for (const relative of DEFAULT_COMPOSITION_FILES) {
    if (REACHABILITY.test(await readFile(path.join(root, relative), 'utf8'))) {
      throw new Error(`${relative}不得默认接入P6学习结算。`);
    }
  }
  const profileCandidate = await readFile(path.join(
    root,
    'packages/arena-product-content/src/arena-v2-learning-profile-definition-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    'defaultProfileServiceWired: false',
  ]) {
    if (!profileCandidate.includes(marker)) throw new Error(`P6 Profile候选缺少${marker}。`);
  }
  const collectionPreviewLeaseOwner = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.leaseOwner),
    'utf8',
  );
  for (const marker of [
    'cleanupRetriesOnlyIncompleteResources: true',
    'failedDisposeRetainsHandleForRetry: true',
    'destroyIncompleteRetainsResourceLedger: true',
    'if (this.#state === \'destroyed\' && this.#cleanupFailureCount === 0) return',
    'resource.handle = handle',
  ]) {
    if (!collectionPreviewLeaseOwner.includes(marker)) {
      throw new Error(`A6.6收藏租约Owner缺少可重试资源清理标记${marker}。`);
    }
  }
  const collectionPreviewLazyLoaderAdapter = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.lazyLoaderAdapter),
    'utf8',
  );
  for (const marker of [
    'taskDestroyRetriesOnlyIncompleteSettledCleanup: true',
    'destroyIncompleteRetainsTaskRecords: true',
    'failedDisposeRetainsHandleForRetry: true',
    'record.taskDestroyComplete = record.task.isCleanupComplete()',
    'record.retainedInvalidLeaseOwner = value',
    '#retryRetainedInvalidLeaseCleanup(record',
  ]) {
    if (!collectionPreviewLazyLoaderAdapter.includes(marker)) {
      throw new Error(`A6.11a收藏惰性加载适配器缺少可重试清理标记${marker}。`);
    }
  }
  const collectionPreviewMountLifecycle = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.mountLifecycle),
    'utf8',
  );
  for (const marker of [
    'ownerDestroyPreparationRetriesOnlyIncompleteMountCleanup: true',
    'destroyIncompleteResultIsDiagnosticNotTerminal: true',
    "const retryingIncompleteDestroy = this.#state === 'destroy-incomplete'",
    'this.#continueMountCleanupAfterFailure()',
    "cleanupFailed = this.#mountOwner.getSnapshot().state !== 'destroyed'",
  ]) {
    if (!collectionPreviewMountLifecycle.includes(marker)) {
      throw new Error(`A6.12b收藏mount生命周期缺少可重试清理标记${marker}。`);
    }
  }
  const collectionPreviewMountOwner = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.mountOwner),
    'utf8',
  );
  for (const marker of [
    'mountCleanupUsesPerResourceCompletionWatermarks: true',
    'failedBuildCleanupDebtRetainedForDestroyRetry: true',
    'destroyRetriesOnlyIncompleteMountCleanup: true',
    'mutationReentrancyRejected: true',
    'partialMutationSnapshotReadRejected: true',
    'class WeaponCollectionPreviewMountBuildCleanupFailureV1',
    'readonly #cleanupDebts = new Set<OwnedMountObjectsV1>()',
    'cleanupOwnedMountObjects(record.cleanup)',
    "if (this.#mutationInProgress) throw new Error('A6.9 Owner拒绝同步mutation重入。')",
    "if (this.#mutationInProgress) throw new Error('A6.9 Owner拒绝mutation期间读取半完成快照。')",
  ]) {
    if (!collectionPreviewMountOwner.includes(marker)) {
      throw new Error(`A6.9收藏mount Owner缺少可重试Three清理标记${marker}。`);
    }
  }
  const learningInformationProjection = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts',
  ), 'utf8');
  for (const marker of [
    '本局完成${delta.evidenceDelta}次${evidenceLabels[delta.context]}',
    '次安全落点或有效命中，当前${current}/${target}',
    '本局完成1次有效主研究，当前${record.useCount}',
    '·主研究1次·${record.useCount}',
    '下一段：${compactMapSegmentLabel',
    'const progress = `完成：${visible.join(\'；\')}',
    '本局结果已记录，暂未形成新的学习进度',
    '本局进度已记录，收藏阶段未变化',
    '本局结果已记录，收藏阶段未变化',
    '等待结算后更新收藏状态',
    '收藏状态已处理，不重复变化',
    'ARENA_V2_LEARNING_RESULT_PROGRESS_READABILITY_CONTRACT_V1',
    'ARENA_V2_LEARNING_RESULT_GOAL_ROUTE_HINT_CONTRACT_V1',
    'ARENA_V2_HOME_RECORD_SUMMARY_READ_CONTRACT_V1',
    "source: 'validated-learning-profile-mode-collection-and-route-records'",
    "modeOrder: Object.freeze(['duel', 'race', 'survival'] as const)",
    'recordFieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'writesProfileAuthorityRewardOrTask: false',
    'ownsNavigationOrFocus: false',
    'homeRecordSummary: recordSummary',
    "visibleCopyPolicy: 'compact-player-summary'",
    "accessibilityCopyPolicy: 'full-evidence-progress-and-continuation'",
    'visibleCopyOwnsEvidenceJudgement: false',
    'accessibilityCopyRetainsFullEvidence: true',
    'matchStartLearningGoalAttemptReceiptWired: true',
    'matchStartLearningGoalAttemptUsesReducerAppliedIdentityOnly: true',
    'missedGoalReceiptNeverInfersFailureCause: true',
    'catalogCompleteFreePracticeDoesNotPublishMissedGoal: true',
    'function attemptedLearningGoal(',
    'function learningGoalAttemptAdvanced(',
    '本局目标：${target}·已推进',
    '本局目标：${target}·未推进；再试：${goal.actionLabel}',
    'ownsLayoutOrLineBudget: false',
    'readsSettledModeAndCurrentSelectionOnly: true',
    'doesNotResolveOrReplaceNextGoal: true',
    'doesNotMutateSelectionOrNavigation: true',
    'survivalWeaponRequiresWorldPickup: true',
    'genericWeaponGoalsPreferDeterministicLoadoutModes: true',
    'explicitSurvivalWeaponGoalsAreConditional: true',
    'neverPromisesTargetWeaponWillSpawnThisMatch: true',
    "visibleText: '稳定推进：当前组合可继续'",
    "visibleText: `条件推进：${visibleActions.join('、')}`",
    '等待${targetWeaponVisible}刷新后拾取',
    '补给不会保证目标武器在本局出现',
    "weaponGoal.kind === 'collect-weapon'",
    'Learning information武器主研究目标缺少武器身份',
    "nextWeaponMilestone.collected ? '已收藏·' : ''",
    'const scopedCatalogCompletion = goal.kind === \'catalog-complete\'',
    'nextGoal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'const mainResearchComplete = record.useCount === target',
    "mainResearchComplete ? '主研究已完成' : practiceContinuation",
  ]) {
    if (!learningInformationProjection.includes(marker)) {
      throw new Error(`P6结果成长玩家反馈缺少${marker}。`);
    }
  }
  if (learningInformationProjection.includes('const progress = `新增：')) {
    throw new Error('P6结果成长玩家反馈不得退回系统流水账式“新增：A+1”。');
  }
  const collectionProgressSummary = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-collection-progress-summary-facts-projection-v1.ts',
  ), 'utf8');
  for (const marker of [
    "averageMatchMinutesSource: 'arena-v2-learning-capacity-report-v1'",
    'ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1',
    '* ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1',
  ]) {
    if (!collectionProgressSummary.includes(marker)) {
      throw new Error(`P6武器容量剩余时间缺少共享口径${marker}。`);
    }
  }
  const resultNextGoalRouteFit = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-result-next-goal-route-fit-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    'reusesUniqueNextGoalResolver: true',
    "genericWeaponGoalDeterministicModeOrder: Object.freeze(['duel', 'race'] as const)",
    'survivalSupplyPathIsConditional: true',
    'freezesEligibleWeaponScopeForNavigation: true',
    'nullEligibleWeaponScopeMeansFullDefinition: true',
    'eligibleWeaponDefinitionIds: normalizedEligibleWeaponDefinitionIds',
    "defaultResultDecision: requiresAdjustment ? 'next-goal' : 'play-again'",
    'doesNotMutateSelectionNavigationProfileOrReward: true',
    'defaultEntryWired: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!resultNextGoalRouteFit.includes(marker)) {
      throw new Error(`P6结果长期目标路线适配器缺少${marker}。`);
    }
  }
  const nextGoalContinuationRoute = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-next-learning-goal-continuation-route-v1.ts',
  ), 'utf8');
  for (const marker of [
    'reusesResolvedUniqueNextGoal: true',
    'genericWeaponGoalUsesDeterministicDuelLoadout: true',
    'mapGoalUsesRaceRoutePractice: true',
    'survivalWeaponGoalRequiresWorldPickup: true',
    'neverPromisesTargetWeaponSupply: true',
    'activeLearningCompletionUsesFreeChoiceWithoutFullCatalogClaim: true',
    'writesSelectionNavigationProfileRewardOrTask: false',
    'addsPagesFieldsActionsOrCurrencies: false',
    "? 'conditional-survival-supply'",
    "? modeByKind('survival')",
    "? modeByKind('race')",
    ": modeByKind('duel')",
    "validationStatus: 'not-run'",
  ]) {
    if (!nextGoalContinuationRoute.includes(marker)) {
      throw new Error(`P6下一学习目标续玩路由缺少${marker}。`);
    }
  }
  const nextLearningGoal = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts',
  ), 'utf8');
  for (const marker of [
    'function incompleteCollectedWeaponResearchGoal(',
    'function hasIncompleteLearningOutsideEligibleWeaponScope(',
    'profile.collections.weaponDefinitionIds.includes(candidate)',
    'return currentProgress < targetProgress',
    '?? incompleteCollectedWeaponResearchGoal(definition, profile, eligibleWeapons)',
    'ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    'activeLearningScopeIsPartial',
  ]) {
    if (!nextLearningGoal.includes(marker)) {
      throw new Error(`P6已拥有武器主研究续接缺少${marker}。`);
    }
  }
  const nextGoalIdentityProjection = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-collection-next-goal-identity-projection-v1.ts',
  ), 'utf8');
  for (const marker of [
    "catalogCompleteKindMeaning: 'resolved-learning-scope-complete'",
    'fullCatalogTerminalGoalId: ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1',
    'activeLearningCompletionGoalId: ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1',
    "fullCatalogTerminalMeaning: 'free-challenge-or-record-refresh'",
  ]) {
    if (!nextGoalIdentityProjection.includes(marker)) {
      throw new Error(`P6下一目标范围完成身份合同缺少${marker}。`);
    }
  }
  const collectionProgressInputAdapter = await readFile(path.join(
    root,
    'packages/arena-product-presentation-three/src/arena-v2-profile-collection-progress-input-adapter-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'eligibleWeaponScopeForwardedToUniqueGoalResolver: true',
    'nullEligibleWeaponScopeMeansFullDefinition: true',
    'fullCatalogProgressRemainsVisibleForActiveScope: true',
    "'eligibleWeaponDefinitionIds'",
    ': { eligibleWeaponDefinitionIds: input.eligibleWeaponDefinitionIds }',
    '当前可用武器${weaponDefinitionId}不在P5收藏目录中',
  ]) {
    if (!collectionProgressInputAdapter.includes(marker)) {
      throw new Error(`P6收藏页active武器范围接力缺少${marker}。`);
    }
  }
  const collectionPreviewReadInput = await readFile(path.join(
    root,
    'src/entry/arena-v2-collection-preview-read-input-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'readsSelectionContentProfileAndWeaponScopeFromOneHostSnapshot: true',
    'getInformationCollectionRead()',
    'eligibleWeaponDefinitionIds: profileRead.eligibleWeaponDefinitionIds',
  ]) {
    if (!collectionPreviewReadInput.includes(marker)) {
      throw new Error(`P6收藏入口active武器范围接线缺少${marker}。`);
    }
  }
  const weaponResearchMilestone = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-weapon-collection-research-milestone-projection-v1.ts',
  ), 'utf8');
  for (const marker of [
    'ownershipAndMainResearchStageAreIndependent: true',
    'mainResearchCompletesOnlyAtEvidenceTarget: true',
    "'主研究完成'",
  ]) {
    if (!weaponResearchMilestone.includes(marker)) {
      throw new Error(`P6武器拥有与主研究分轨缺少${marker}。`);
    }
  }
  const learningProfileService = await readFile(path.join(
    root,
    'packages/arena-profile-service/src/arena-v2-learning-profile-service-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    '#operation: ArenaV2LearningProfileServiceOperationV1 | null = null',
    '#assertCurrentOperationCommit(',
    "this.#assertCurrentOperationCommit('CAS提交', true)",
    "this.#assertCurrentOperationCommit('提交后读回', true)",
    'repositoryCallbackReentryIsSticky: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'repositoryCallbacksCheckedBeforeProfilePublication: true',
    'destroyCallbackConfirmedBeforeOwnershipRelease: true',
    'profilePublicationWaitsForRepositoryCallbackClosure: true',
    'openFailureDispositionIsExplicit: true',
    'destroyStartsAtFailedClosedWatermark: true',
    "this.#assertCurrentOperationCommit('打开')",
    "reason: 'repository-open-profile-invalid'",
    'assertSynchronousReturn(value, name)',
    'sharedSynchronousReturnBoundaryWired: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!learningProfileService.includes(marker)) {
      throw new Error(`P6 Learning Profile Service缺少仓储重入闭包标记${marker}。`);
    }
  }
  if (learningProfileService.includes('#reentryAttempted')
    || learningProfileService.includes('#assertNoReentry')) {
    throw new Error('P6 Learning Profile Service不得保留可重置布尔反调事实。');
  }
  const learningProfileRepository = await readFile(path.join(
    root,
    'packages/arena-profile-persistence/src/arena-v2-learning-profile-repository-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    '#operation: LearningProfileRepositoryOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#assertNoReentrySince(',
    "this.#runOperation('open'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('diagnostics-read'",
    "this.#runOperation('storage-keys-read'",
    "this.#runOperation('renew-lease'",
    "this.#runOperation('compare-and-set'",
    "this.#runOperation('destroy'",
    "this.#assertNoReentrySince(writeReentrySequence, '新槽写入')",
    "this.#assertNoReentrySince(headWriteReentrySequence, 'head写入')",
    "this.#assertNoReentrySince(destroyReentrySequence, '销毁发布', true)",
    'storageAndLeaseCallbackReentryIsSticky: true',
    'operationGuardPrecedesStateAndInputValidation: true',
    'storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true',
    'durableSlotAndHeadWatermarksPrecedeReentryRejection: true',
    'publicReadsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
    'persistentPublicationWaitsForCallbackClosure: true',
    'postWriteReentryIsIndeterminate: true',
    'openFailureWithLeaseCleanupDebtFailsClosed: true',
    'destroyStartsAtFailedClosedWatermark: true',
    'leaseAcquireFailureDispositionIsExplicit: true',
    'leaseFailedClosed = this.#leaseValue().isFailedClosed();',
    "const indeterminate = new ArenaV2LearningProfileIndeterminateWriteError(",
    'indeterminate.cause = combinedFailure;',
    "validationStatus: 'not-run'",
  ]) {
    if (!learningProfileRepository.includes(marker)) {
      throw new Error(`P6 Learning Profile Repository缺少重入事务标记${marker}。`);
    }
  }
  const playerProfileRepository = await readFile(path.join(
    root,
    'packages/arena-profile-persistence/src/player-profile-repository.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: PlayerProfileRepositoryOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('open'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('diagnostics-read'",
    "this.#runOperation('storage-keys-read'",
    "this.#runOperation('renew-lease'",
    "this.#runOperation('compare-and-set'",
    "this.#runOperation('destroy'",
    "this.#assertNoReentrySince(writeReentrySequence, '新槽写入')",
    "this.#assertNoReentrySince(headWriteReentrySequence, 'head写入')",
    "this.#assertNoReentrySince(destroyReentrySequence, '销毁发布', true)",
    'operationGuardPrecedesStateAndInputValidation: true',
    'storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true',
    'durableSlotAndHeadWatermarksPrecedeReentryRejection: true',
    'publicReadsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!playerProfileRepository.includes(marker)) {
      throw new Error(`P6 Reward PlayerProfileRepository缺少粘滞持久水位标记${marker}。`);
    }
  }
  const synchronousStorageLease = await readFile(path.join(
    root,
    'packages/arena-storage/src/synchronous-storage-lease.ts',
  ), 'utf8');
  for (const marker of [
    '#failed = false',
    '#operation: SynchronousStorageLeaseOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#cleanupLeaseCandidates: StoredLease[] = []',
    '#assertNoReentrySince(sequence: number, operation: string): void',
    '#retainCleanupCandidate(candidate: StoredLease): void',
    'this.#cleanupLeaseCandidates.length > 2',
    'callbackReentryIsSticky: true',
    'storedValueValidationCheckedBeforeCrossPortProgress: true',
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectLeaseTransactionIntermediateState: true',
    'publicStateWaitsForCallbackClosure: true',
    'failedLeaseRetainsCleanupIdentity: true',
    'ambiguousRenewRetainsBoundedCleanupCandidates: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#runOperation('acquire'",
    "this.#runOperation('assert-held'",
    "this.#runOperation('renew'",
    "this.#runOperation('release'",
    "this.#runOperation('status-read'",
    "this.#runOperation('failed-closed-read'",
    "this.#runOperation('destroy'",
    'assertSynchronousReturn(rawNow, `${this.#label} wallNow`)',
    'wallClockUsesSharedSynchronousReturnBoundary: true',
    'failedClosedStateIsOwnerObservable: true',
    'isFailedClosed(): boolean',
    "validationStatus: 'not-run'",
  ]) {
    if (!synchronousStorageLease.includes(marker)) {
      throw new Error(`P6共享同步租约缺少重入清理标记${marker}。`);
    }
  }
  if (synchronousStorageLease.includes('#mutating')) {
    throw new Error('P6共享同步租约不得保留即时mutating布尔锁。');
  }
  const synchronousStoragePort = await readFile(path.join(
    root,
    'packages/arena-contracts/src/synchronous-storage-port.ts',
  ), 'utf8');
  for (const marker of [
    'const MAX_STORAGE_PORT_PROTOTYPE_DEPTH = 32',
    'readResultField(result: object, key: string, label: string)',
    'readResultRequiresExactOwnEnumerableDataFields: true',
    'sharedSynchronousReturnBoundaryWired: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!synchronousStoragePort.includes(marker)) {
      throw new Error(`P6共享Storage端口缺少精确数据边界标记${marker}。`);
    }
  }
  const settlement = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-learning-settlement-candidate-v1.ts',
  ), 'utf8');
  if (!settlement.includes('defaultSessionWired: false')) {
    throw new Error('P6结算候选必须保持默认Session断开。');
  }
  const replayLearning = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-replay-learning-grant-resolver-v1.ts',
  ), 'utf8');
  for (const marker of [
    'const timeCapEndedOnUnscheduledFirstFall =',
    "result.modeResult.reason === 'survival-time-cap'",
    'survivalFirstFallTick === result.modeResult.endedAtTick',
    'survivalFirstFallNeedsSchedule',
    'survivalRespawnSchedule === null',
    '!survivalFirstRespawnCompleted',
    'survivalFirstFallNeedsSchedule && !timeCapEndedOnUnscheduledFirstFall',
  ]) {
    if (!replayLearning.includes(marker)) {
      throw new Error(`P6.56生存同tick时间上限成长闭包缺少${marker}。`);
    }
  }
  if (!replayLearning.includes('Replay Learning movement-fall不能携带攻击上下文。')) {
    throw new Error('P6.393缺少movement-fall攻击上下文纵深拒绝。');
  }
  const survivalActionEligibility = await readFile(path.join(
    root,
    'packages/arena-contracts/src/survival-equipment-action-eligibility-v1.ts',
  ), 'utf8');
  if (!replayLearning.includes('assertArenaV6SurvivalEquipmentActionEligibilityV1')) {
    throw new Error('P6.394缺少Replay Learning的Survival active动作资格重算。');
  }
  for (const marker of [
    'Survival equipment ActionStarted不能来自非active参与者。',
    'does not judge delayed feedback',
  ]) {
    if (!survivalActionEligibility.includes(marker)) {
      throw new Error(`P6.394共享Survival动作资格缺少${marker}。`);
    }
  }
  for (const marker of [
    'firstEffectiveActionSequenceByWeapon',
    'startedAction.startedSequence',
    'Number.MAX_SAFE_INTEGER',
  ]) {
    if (!replayLearning.includes(marker)) {
      throw new Error(`P6.395多武器并列主研究归属缺少${marker}。`);
    }
  }
  const competitiveActionEligibility = await readFile(path.join(
    root,
    'packages/arena-contracts/src/competitive-equipment-action-eligibility-v1.ts',
  ), 'utf8');
  if (!replayLearning.includes('assertArenaV6CompetitiveEquipmentActionEligibilityV1')) {
    throw new Error('P6.396缺少Replay Learning的Duel/Race active动作资格重算。');
  }
  for (const marker of [
    'Competitive equipment ActionStarted不能来自非active参与者。',
    'RACE_MODE_RESPAWN_DELAY_TICKS_V1',
    'does not re-evaluate hit outcomes',
  ]) {
    if (!competitiveActionEligibility.includes(marker)) {
      throw new Error(`P6.396共享Duel/Race动作资格缺少${marker}。`);
    }
  }
  const actionFeedbackConsistency = await readFile(path.join(
    root,
    'packages/arena-contracts/src/action-feedback-outcome-consistency-v1.ts',
  ), 'utf8');
  if (!replayLearning.includes('assertArenaV6ActionFeedbackOutcomeConsistencyV1')) {
    throw new Error('P6.397缺少Replay Learning动作反馈结果一致性重算。');
  }
  for (const marker of [
    'Action feedback outcome缺少同攻击者、动作与起手tick的先行权威起手。',
    '同一权威动作的attack-evaded不能重复或与命中结果共存。',
    'delayed hit outcomes stay legal',
  ]) {
    if (!actionFeedbackConsistency.includes(marker)) {
      throw new Error(`P6.397共享动作反馈结果一致性缺少${marker}。`);
    }
  }
  const learningCompositionTest = await readFile(path.join(
    root,
    'packages/arena-product-composition/test/arena-v2-learning-candidate-v1.test.ts',
  ), 'utf8');
  for (const marker of [
    "id: 'event.first-catalog-action'",
    'weaponDefinitionId: SECOND_WEAPON.equipment.id',
  ]) {
    if (!learningCompositionTest.includes(marker)) {
      throw new Error(`P6.395多武器并列主研究延期规格缺少${marker}。`);
    }
  }
  const terminalHandoff = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-learning-terminal-handoff-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'defaultSessionWired: false',
    '#operation: LearningTerminalHandoffOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('state-read'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('settle-bound'",
    "this.#assertReentryFree(sequence, '绑定结算')",
    '#prepareBoundInsideOperation(): ArenaV2LearningGrantV1',
    'swallowedReentryFailsBeforeEvidenceOrSettlementPublication: true',
    'operationGuardPrecedesStateAndInputValidation: true',
    'authorityAndProfilePortsCheckedBeforeBusinessProgress: true',
    'internalSnapshotAndPreparationAvoidPublicReentry: true',
    'settlementReentryRetainsPreparedGrantAndTerminalEvidence: true',
    'publicReadsRejectOperationIntermediateState: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!terminalHandoff.includes(marker)) {
      throw new Error(`P6终局事件交接候选缺少重入闭包标记${marker}。`);
    }
  }
  const modeLearningFactory = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-mode-learning-session-factory-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'defaultCompositionWired: false',
    'defaultNavigationWired: false',
    'assertSynchronousReturn(value, name)',
    'preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1',
    'Mode Learning Session Factory dependency preflight',
    'dependencyPreflightCapturesBeforeSessionCreation: true',
    'sharedSynchronousReturnBoundaryWired: true',
    '#pendingCleanupResources: PendingCleanupResource[] = []',
    '#releasePendingCleanupResources()',
    'failedConstructionCleanupRetainsRetryOwnership: true',
    'nextCreationClosesHistoricalCleanupDebtFirst: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'constructionCallbacksCheckedBeforeGenerationCommit: true',
    'cleanupReentryRetainsCurrentAndLaterFactoryOwners: true',
    'outerOwnerMustDestroyFactoryAfterSessionHost: true',
    'Mode Learning Session Factory历史资源清理不完整',
  ]) {
    if (!modeLearningFactory.includes(marker)) {
      throw new Error(`P6 Mode/Learning Session Factory缺少失败资源所有权标记${marker}。`);
    }
  }
  if (modeLearningFactory.includes('#reentryAttempted')
    || modeLearningFactory.includes('#assertReentryFree')) {
    throw new Error('P6 Mode/Learning Session Factory不得保留可重置布尔反调事实。');
  }
  const modeProductSession = await readFile(path.join(
    root,
    'packages/arena-product-session/src/mode-product-session-v2.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    'constructorTransfersChildrenOnlyAfterAllPortsCaptured: true',
    'constructionFailureLeavesChildOwnershipWithCaller: true',
    '#operation: ModeProductSessionV2Operation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryStopsLaterOwners: true',
    'requiresExplicitPresentationAuditEveryStep: true',
    'requiresExplicitSupplyCadenceEveryStep: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true',
    'requiredStepFieldsValidatedBeforeAssembler: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeProductSession.includes(marker)) {
      throw new Error(`P6 Mode Product Session缺少构造所有权标记${marker}。`);
    }
  }
  if (modeProductSession.includes('#reentryAttempted')) {
    throw new Error('P6 Mode Product Session不得保留可重置布尔反调事实。');
  }
  const authoritativeLocalMatchSessionV3 = await readFile(path.join(
    root,
    'packages/arena-session/src/mode-authoritative-local-match-session-v3.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeAuthoritativeLocalMatchSessionV3Operation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesSequenceAndFirstError: true',
    'runtimeCleanupCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryRetainsRuntimeOwner: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true',
    'const reentrySequence = this.#reentrySequence',
    "validationStatus: 'not-run'",
  ]) {
    if (!authoritativeLocalMatchSessionV3.includes(marker)) {
      throw new Error(`P6 Authoritative Local Match Session V3缺少清理所有权标记${marker}。`);
    }
  }
  if (authoritativeLocalMatchSessionV3.includes('#reentryAttempted')) {
    throw new Error('P6 Authoritative Local Match Session V3不得保留可重置布尔反调事实。');
  }
  const modeMatchRuntimeV6 = await readFile(path.join(
    root,
    'packages/arena-match/src/mode-match-runtime-v6.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeMatchRuntimeV6Operation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'swallowedCleanupReentryStopsLaterOwners: true',
    'explicitSupplyFactsRequiredEveryCommittedStep: true',
    'explicitLocalJumpAvailabilityRequiredEveryStartAndStep: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'if (this.#reentrySequence !== reentrySequence) return Object.freeze(errors)',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeMatchRuntimeV6.includes(marker)) {
      throw new Error(`P6 Mode Match Runtime V6缺少清理所有权标记${marker}。`);
    }
  }
  if (modeMatchRuntimeV6.includes('#reentryAttempted')) {
    throw new Error('P6 Mode Match Runtime V6不得保留可重置布尔反调事实。');
  }
  const modeProductComposition = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/mode-product-session-composition-v2.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    'childOwnershipTransfersOnlyAfterSessionConstruction: true',
    'failedSessionConstructionLeavesMatchOwnershipWithCaller: true',
    'failedSessionConstructionCleansOnlyCompositionOwnedAssembler: true',
    'const session = new ModeProductSessionV2({',
    'assembler = null;',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeProductComposition.includes(marker)) {
      throw new Error(`P6 Mode Product Composition缺少构造转移标记${marker}。`);
    }
  }
  const hudReadySession = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-hud-ready-learning-mode-session-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'assertSynchronousReturn(value, name)',
    '#cleanupStarted = false',
    '#sessionDestroyed = false',
    '#cleanupSession(operation: string, failureMessage: string): Error[]',
    '#completeTerminalCleanup(): void',
    'if (!this.#sessionDestroyed) return',
    'failedProjectionRetainsLastAuditedProjectionUntilChildCleanup: true',
    'cleanupRetriesSameChildOwner: true',
    'terminalStateWaitsForChildSession: true',
    'constructorTransfersChildOnlyAfterPublicInfoAndPortsValidate: true',
    'constructionFailureLeavesChildOwnershipWithCaller: true',
    'requiresExplicitSupplyFactsEveryStep: true',
    'requiresExplicitAuthorityAuditEveryStep: true',
    'requiresExplicitSupplyCadenceEveryStep: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true',
    'MATCH_STEP_REQUIRED_KEYS',
    "field(matchStep, 'supplyFacts', 'HUD-ready Learning Mode Session matchStep')",
    "field(matchStep, 'readFrameAudit', 'HUD-ready Learning Mode Session matchStep')",
    "field(matchStep, 'supplyCadence', 'HUD-ready Learning Mode Session matchStep')",
    "status: 'production-unreachable'",
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!hudReadySession.includes(marker)) {
      throw new Error(`P6 HUD-ready Session缺少终态Owner合同${marker}。`);
    }
  }
  const quickMatchBundleFactory = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-quick-match-bundle-factory-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'defaultCompositionWired: false',
    'defaultNavigationWired: false',
    'assertSynchronousReturn(value, name)',
    'sharedSynchronousReturnBoundaryWired: true',
    'returnedRawSessionOwnedBeforeDestroyPortCapture: true',
    'invalidDestroyPortRetainsRawSessionCleanupOwnership: true',
    '#operation: QuickMatchBundleFactoryOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesSequenceAndFirstError: true',
    'destroyOwnedSession(owned: OwnedSession, name: string)',
    "validationStatus: 'not-run'",
  ]) {
    if (!quickMatchBundleFactory.includes(marker)) {
      throw new Error(`P6 QuickMatch Bundle Factory缺少同步权威边界标记${marker}。`);
    }
  }
  if (quickMatchBundleFactory.includes('#reentryAttempted')) {
    throw new Error('P6 QuickMatch Bundle Factory不得保留可重置布尔反调事实。');
  }
  const settlementIntentJournal = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-learning-settlement-intent-journal-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    'defaultCompositionWired: false',
    'defaultEntryWired: false',
    'rejectsSameResultDifferentReplayBindingBeforeRewardWrite: true',
    'getArenaV2LearningResultGrantIdV1(learningGrant.grantId)',
    'getArenaV2LearningResultGrantIdV1(grantId) === resultGrantId',
    'recoveryRequiresCommittedRewardBeforeLearningWrite: true',
    'discardDecisionSurvivesIntentCleanupFailure: true',
    'startupLearningRecoveryFailureRetainsIntentForNextRestart: true',
    'startupRecoverableProfileFailureRetainsOpenJournalForExplicitRetry: true',
    'startupNonPersistenceFailureFailsClosed: true',
    "persistenceDispositionContract: 'retry-restart-fail-closed'",
    'crossProfileTransactionClaimed: false',
    '#operation: LearningSettlementIntentJournalOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "'Arena Learning结算意图台账租约续租'",
    '() => lease.renew()',
    'confirmed = this.#readStored()',
    'remaining = this.#readStored()',
    "'Arena Learning结算意图台账Reward Profile读取'",
    '() => rewardService.getSnapshot()',
    "'Arena Learning结算意图台账Learning Profile读取'",
    '() => learningService.getSnapshot()',
    "'Arena Learning结算意图台账Learning Profile提交'",
    '() => learningService.commitGrant(pending.learningGrant!)',
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'leaseStorageAndProfilePortsCheckedBeforeCrossOwnerProgress: true',
    'durableWriteAndDeleteReadbackPrecedesReentryRejection: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'leaseStorageAndProfileCallbacksCheckedBeforeJournalCommit: true',
    'cleanupReentryRetainsCurrentAndLaterJournalOwners: true',
    'publicSnapshotRejectsOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!settlementIntentJournal.includes(marker)) {
      throw new Error(`P6 Reward/Learning结算意图台账缺少${marker}。`);
    }
  }
  if (settlementIntentJournal.includes('#reentryAttempted')
    || settlementIntentJournal.includes('#assertReentryFree')) {
    throw new Error('P6 Reward/Learning结算意图台账不得保留可重置布尔反调事实。');
  }
  const learningSettlementRecoveryOwner = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-learning-settlement-recovery-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#finalizedGrant: ArenaV2LearningGrantV1 | null = null',
    '#operation: LearningSettlementRecoveryOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'if (this.#operation !== null) this.#rejectReentry(operation)',
    'const currentProfile = this.#readCurrentProfile()',
    "this.#assertCurrentOperationCommit('Arena Learning当前Profile读取')",
    "this.#assertCurrentOperationCommit('Arena Learning结算后处理')",
    'this.#lastPostProcessingError = this.#reentryError ?? error',
    "this.#runOperation('settlement-read'",
    "this.#runOperation('pending-baseline-read'",
    "this.#runOperation('recovery-read'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('destroy'",
    "'Arena Learning finalized Grant identity'",
    "'Arena Learning repeated Grant identity'",
    'Arena Learning重复结算的最终Grant身份漂移',
    "'Arena Learning committed settlement replay identity'",
    'Arena committed Learning结算投影与规范重放身份漂移',
    'committedSettlementMatchesCanonicalReplay: true',
    'finalizedGrantIdentityImmutableAcrossIdempotentSettlement: true',
    'operationGuardPrecedesBusinessValidation: true',
    'currentProfileReadReentryFailsBeforeRecoveryCommit: true',
    'postProcessingReentryRecordedWithoutReopeningSettlement: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'authoritativeProfileReadCheckedBeforeRecoveryCommit: true',
    'nonAuthoritativePostProcessingReentryRemainsRecordedAtMostOnce: true',
    'publicReadsRejectOperationIntermediateState: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "status: 'production-unreachable'",
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!learningSettlementRecoveryOwner.includes(marker)) {
      throw new Error(`P6 Learning结算恢复Owner缺少最终Grant不可变标记${marker}。`);
    }
  }
  if (learningSettlementRecoveryOwner.includes('#reentryAttempted')) {
    throw new Error('P6 Learning Settlement Recovery Owner不得恢复可重置布尔反调事实。');
  }
  const playerProfileService = await readFile(path.join(
    root,
    'packages/arena-profile-service/src/player-profile-service.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: PlayerProfileServiceOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('state-read'",
    "this.#runOperation('open'",
    'const renewed = repository.renewLease()',
    "this.#assertCurrentOperationCommit('租约续租')",
    'repository.compareAndSet(next, before.revision)',
    "this.#assertCurrentOperationCommit('CAS提交', true)",
    "this.#assertCurrentOperationCommit('CAS异常后读回', true)",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('last-known-snapshot-read'",
    "this.#runOperation('destroy'",
    "this.#assertCurrentOperationCommit('销毁')",
    'operationGuardPrecedesStateAndInputValidation: true',
    'repositoryPortsCheckedBeforeBusinessProgress: true',
    'ambiguousCompareAndSetReadbackCommitsBeforeReentryRejection: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'repositoryCallbacksCheckedBeforeProfilePublication: true',
    'destroyCallbackConfirmedBeforeOwnershipRelease: true',
    'publicStateAndSnapshotsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!playerProfileService.includes(marker)) {
      throw new Error(`P6 Reward PlayerProfileService缺少粘滞提交标记${marker}。`);
    }
  }
  if (playerProfileService.includes('#reentryAttempted')
    || playerProfileService.includes('#assertNoReentry')) {
    throw new Error('P6 Reward PlayerProfileService不得保留可重置布尔反调事实。');
  }
  const modeLocalMatchSessionV2 = await readFile(path.join(
    root,
    'packages/arena-session/src/mode-local-match-session-v2.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeLocalMatchSessionV2Operation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('start'",
    "this.#runOperation('step'",
    "this.#runOperation('pause'",
    "this.#runOperation('resume'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesStateAndInputValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'runtimeAndControllerCallbacksCheckedBeforeFramePublication: true',
    'publicStateAndReadFrameRejectOperationIntermediateState: true',
    'cleanupReentryRetainsCurrentAndLaterSessionOwners: true',
    'terminalFramePublicationWaitsForRuntimeCallbackClosure: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeLocalMatchSessionV2.includes(marker)) {
      throw new Error(`P6 ModeLocalMatchSessionV2缺少提交保护标记${marker}。`);
    }
  }
  if (/#transitioning|#reentryAttempted/u.test(modeLocalMatchSessionV2)) {
    throw new Error('P6 ModeLocalMatchSessionV2不得保留可重置布尔操作事实。');
  }
  const authoritativeQuickMatchServiceV3 = await readFile(path.join(
    root,
    'packages/arena-quick-match/src/mode-authoritative-quick-match-service-v3.ts',
  ), 'utf8');
  for (const marker of [
    "#operation: 'create' | 'destroy' | null = null",
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#pendingCleanupResources: PendingCleanupResource[] = []',
    'seedRosterContentAndRuntimePortsCheckedBeforeNextOwner: true',
    'createdSessionRetainsCleanupOwnershipUntilSafeReturn: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'failedConstructionCleanupRetainsRetryOwnership: true',
    'cleanupReentryRetainsCurrentAndLaterQuickMatchOwners: true',
    'ModeAuthoritativeQuickMatchServiceV3历史资源清理不完整',
    "validationStatus: 'not-run'",
  ]) {
    if (!authoritativeQuickMatchServiceV3.includes(marker)) {
      throw new Error(`P6权威Quick Match V3缺少提交保护标记${marker}。`);
    }
  }
  if (authoritativeQuickMatchServiceV3.includes('#reentryAttempted')
    || authoritativeQuickMatchServiceV3.includes('#assertReentryFree')) {
    throw new Error('P6权威Quick Match V3不得保留可重置布尔反调事实。');
  }
  const modeQuickMatchServiceV2 = await readFile(path.join(
    root,
    'packages/arena-quick-match/src/mode-quick-match-service-v2.ts',
  ), 'utf8');
  for (const marker of [
    "#operation: 'create' | 'destroy' | null = null",
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#pendingCleanupResources: PendingCleanupResource[] = []',
    'operationGuardPrecedesRequestValidation: true',
    'seedRosterContentRuntimeAndControllerPortsCheckedBeforeNextOwner: true',
    'sessionConstructionOwnsTransferredRuntimeAndControllersOnEntry: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'failedConstructionCleanupRetainsRetryOwnership: true',
    'cleanupReentryRetainsCurrentAndLaterQuickMatchOwners: true',
    'ModeQuickMatchServiceV2历史资源清理不完整',
    "validationStatus: 'not-run'",
  ]) {
    if (!modeQuickMatchServiceV2.includes(marker)) {
      throw new Error(`P6 Quick Match V2缺少提交保护标记${marker}。`);
    }
  }
  if (/#creating|#reentryAttempted/u.test(modeQuickMatchServiceV2)) {
    throw new Error('P6 Quick Match V2不得保留可重置布尔反调事实。');
  }
  const productInputRouter = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/product-input-router.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: string | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#cleanupSamplers: SamplerAdapter[] = []',
    "this.#enter('setMode')",
    'ProductInputRouter UI intent normalization',
    'ProductInputRouter replacement normalization',
    'ProductInputRouter previous sampler destroy',
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'samplerCallbacksCheckedBeforeInputStateCommit: true',
    'uiHitAndIntentCallbacksCheckedBeforeRouterCommit: true',
    'cleanupReentryRetainsCurrentAndLaterSamplerOwners: true',
    'gameplaySampleDoesNotChangeActionVocabulary: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productInputRouter.includes(marker)) {
      throw new Error(`P6 Product Input Router缺少提交保护标记${marker}。`);
    }
  }
  if (productInputRouter.includes('#reentryAttempted')) {
    throw new Error('P6 Product Input Router不得保留可重置布尔反调事实。');
  }
  const inputSampler = await readFile(path.join(
    root,
    'packages/arena-presentation-runtime/src/input-sampler.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: InputSamplerOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#raw: RawControlState | null',
    '#gestures: GestureRecognizer | null',
    "this.#runOperation('sample'",
    'const validationReentry = this.#takeReentryError()',
    'InputSampler RawControlState consumeSnapshot',
    'InputSampler GestureRecognizer sample',
    'InputSampler mapped semantic input',
    'InputSampler normalized frame',
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'validationReentryBeforeRawConsumptionRemainsSameTickRetryable: true',
    'rawGestureAndMapperCallbacksCheckedBeforeFramePublication: true',
    'lastTickAdvancesOnlyAfterNormalizedFrameClosure: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'cleanupReentryRetainsCurrentAndLaterInputOwners: true',
    'destroyFailuresRetainRetryOwnership: true',
    'inputActionVocabularyRemainsMovePrimaryAndJump: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!inputSampler.includes(marker)) {
      throw new Error(`P6 InputSampler缺少提交保护标记${marker}。`);
    }
  }
  if (/#validationActive|#validationReentryAttempted|#sampling|#reentryAttempted/u.test(
    inputSampler,
  )) {
    throw new Error('P6 InputSampler不得保留可重置布尔操作或反调事实。');
  }
  const pointerInputAdapter = await readFile(path.join(
    root,
    'packages/arena-presentation-runtime/src/pointer-input-adapter.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: PointerInputAdapterOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('start'",
    "this.#runOperation('stop'",
    "this.#runOperation('event'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('destroy'",
    'this.#assertCurrentOperationCommit(sequence, name)',
    'if (this.#reentryError !== null) break',
    'this.#destroyRequested = true',
    'operationGuardPrecedesLifecycleValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'deferredDestroyRequestPreservesExistingLifecycleSemantics: true',
    'platformSamplerAndEventCallbacksCheckedBeforeStatePublication: true',
    'bindingsPublishOnlyAfterCompleteStartCallbackClosure: true',
    'cleanupReentryRetainsCurrentAndEarlierBindingOwners: true',
    'failedCleanupRetainsRetryOwnership: true',
    'inputActionVocabularyRemainsPointerMovePrimaryAndJump: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!pointerInputAdapter.includes(marker)) {
      throw new Error(`P6 PointerInputAdapter缺少提交保护标记${marker}。`);
    }
  }
  if (pointerInputAdapter.includes('#reentryAttempted')) {
    throw new Error('P6 PointerInputAdapter不得保留可重置布尔反调事实。');
  }
  const productMatchPresentationRuntime = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/product-match-presentation-runtime.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductMatchPresentationRuntimeOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('start'",
    "this.#runOperation('step'",
    "this.#runOperation('state-read'",
    "this.#runOperation('frame-read'",
    "this.#runOperation('result-read'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('destroy'",
    'Product match start validation',
    'Product match post-step validation',
    'Product match start publication',
    'Product match step publication',
    'sampleStarted && !sampleReturned && !authorityEntered && this.#reentryError === null',
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'controllerInputEventAndProjectorCallbacksCheckedBeforeFramePublication: true',
    'publicStateFrameResultAndDebugReadsRejectIntermediateOperations: true',
    'preAuthorityInputFailureRemainsSameTickRetryable: true',
    'terminalResultPublicationWaitsForPostFrameAndProjectionClosure: true',
    'eventWindowDestroyRetainsOwnershipUntilCallbackClosure: true',
    'presentationDoesNotWriteMatchAuthority: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productMatchPresentationRuntime.includes(marker)) {
      throw new Error(`P6 ProductMatchPresentationRuntime缺少提交保护标记${marker}。`);
    }
  }
  if (/#reentryAttempted|#assertNoSwallowedReentry/u.test(productMatchPresentationRuntime)) {
    throw new Error('P6 ProductMatchPresentationRuntime不得保留可重置布尔反调事实。');
  }
  const productPresentationFlow = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/product-presentation-flow.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductPresentationFlowOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#pendingMatchRuntimeCandidate: unknown = null',
    "this.#run('synchronize'",
    "this.#run('dispatch'",
    "this.#run('intent-settlement'",
    "this.#run('stepMatch'",
    "this.#run('heartbeat'",
    "this.#run('hide'",
    "this.#run('show'",
    "this.#run('snapshot-read'",
    "this.#run('destroy'",
    'this.#pendingMatchRuntimeCandidate = candidate',
    'this.#matchRuntime = runtime',
    'ProductPresentationFlow pending intent publication',
    'ProductPresentationFlow snapshot publication',
    'ProductPresentationFlow dispatcher destroy',
    'operationGuardPrecedesLifecycleIntentAndSnapshotValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'controllerDispatcherAndMatchRuntimeCallbacksCheckedBeforeFlowPublication: true',
    'pendingIntentPublishesAfterDispatcherPromiseCapture: true',
    'asynchronousIntentSettlementUsesIndependentOperation: true',
    'matchFrameResultAndSnapshotPublishAfterCallbackClosure: true',
    'failedMatchRuntimeConstructionRetainsRetryOwnership: true',
    'cleanupReentryRetainsCurrentAndLaterFlowOwners: true',
    'destroyFailuresRetainRetryOwnership: true',
    'flowDoesNotWriteMatchAuthorityOrAddProductScreens: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productPresentationFlow.includes(marker)) {
      throw new Error(`P6 ProductPresentationFlow缺少提交保护标记${marker}。`);
    }
  }
  if (/#reentryAttempted|#assertNoSwallowedReentry/u.test(productPresentationFlow)) {
    throw new Error('P6 ProductPresentationFlow不得保留可重置布尔反调事实。');
  }
  const productSessionStateMachine = await readFile(path.join(
    root,
    'packages/arena-product-state/src/product-session-state-machine.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductSessionStateMachineOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#run('state-read'",
    "this.#run('active-state-read'",
    "this.#run('snapshot-read'",
    "this.#run('dispatch'",
    "this.#run('suspend'",
    "this.#run('resume'",
    "this.#run('fail-recoverable'",
    "this.#run('retry'",
    "this.#run('fail-fatal'",
    "this.#run('destroy'",
    'this.#registry.resolve(eventId, activeFrom)',
    'ProductSession transition resolve',
    'operationGuardPrecedesLifecycleEventAndReadValidation: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'registryResolveCheckedBeforeStateMutation: true',
    'publicStateActiveStateAndSnapshotReadsRejectIntermediateTransitions: true',
    'revisionAndLastTransitionPublishWithStateMutation: true',
    'reentryFailsClosedToFatalErrorWithoutSyntheticTransition: true',
    'transitionVocabularyAndRecoveryStatesRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productSessionStateMachine.includes(marker)) {
      throw new Error(`P6 ProductSessionStateMachine缺少提交保护标记${marker}。`);
    }
  }
  if (/#transitioning|#reentryAttempted/u.test(productSessionStateMachine)) {
    throw new Error('P6 ProductSessionStateMachine不得保留可重置布尔反调事实。');
  }
  const productSessionController = await readFile(path.join(
    root,
    'packages/arena-product-session/src/product-session-controller.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductSessionControllerOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('state-read'",
    "this.#runOperation('boot-request'",
    "this.#runOperation('boot-profile-settlement'",
    "this.#runOperation('boot-profile-failure'",
    "this.#runOperation('match-prepare-start'",
    "this.#runOperation('match-prepare-settlement'",
    "this.#runOperation('match-prepare-failure'",
    "this.#runOperation('begin-match'",
    "this.#runOperation('step-match'",
    "this.#runOperation('commit-reward'",
    "this.#runOperation('destroy'",
    "this.#runOperation('snapshot-read'",
    'ProductSession reentry StateMachine.failFatal()',
    'ProductSession loaded profile publication',
    'ProductSession reward publication',
    'operationGuardPrecedesLifecycleIntentAndReadValidation: true',
    'stickyAuthoritativeReentryUsesMonotonicSequenceAndFirstError: true',
    'diagnosticObservationReentryIsContainedWithoutProductMutation: true',
    'profileMatchRewardAndStateCallbacksCheckedBeforeControllerPublication: true',
    'bootAndMatchPreparationPublishSinglePromiseOwnersBeforeSettlement: true',
    'asynchronousSettlementUsesIndependentOperations: true',
    'publicStateFrameAndSnapshotReadsRejectIntermediateOperations: true',
    'reentryPublishesFatalStateBeforeStoppingCrossOwnerProgress: true',
    'cleanupReentryRetainsCurrentAndLaterControllerOwners: true',
    'destroyFailuresRetainExactRetryOwnership: true',
    'productStatesIntentsMatchAuthorityAndRewardSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productSessionController.includes(marker)) {
      throw new Error(`P6 ProductSessionController缺少提交保护标记${marker}。`);
    }
  }
  if (/#transitioning|#runTransition/u.test(productSessionController)) {
    throw new Error('P6 ProductSessionController不得保留旧布尔操作门。');
  }
  const productPresentationSession = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/product-presentation-session.ts',
  ), 'utf8');
  for (const marker of [
    "#frameOperation: 'frame' | null",
    '#frameOperationSequence: number',
    '#frameReentrySequence: number',
    '#frameReentryError: Error | null',
    "this.#guardFrameReentry('state')",
    "this.#guardFrameReentry('dispatch')",
    "this.#guardFrameReentry('setPaused')",
    "this.#guardFrameReentry('getLastSnapshot')",
    "this.#guardFrameReentry('getPerformanceSnapshot')",
    "this.#guardFrameReentry('getDebugSnapshot')",
    'const sequence = this.#beginFrameOperation()',
    'ProductPresentationSession frame heartbeat',
    'ProductPresentationSession frame match steps',
    'ProductPresentationSession frame publication',
    'ProductPresentationSession frame completion',
    'frameGuardPrecedesTimestampDeltaAndLifecycleValidation: true',
    'stickyFrameReentryUsesMonotonicSequenceAndFirstError: true',
    'frameCallbacksCheckedBeforeLaterFramePublication: true',
    'publicStateSnapshotPerformanceAndDebugReadsRejectFrameIntermediateState: true',
    'swallowedFrameReentryFailsSessionClosed: true',
    'destroyDuringFrameRemainsDeferredUntilFrameClosure: true',
    'frameFailureCleanupRemainsDeferredUntilFrameOwnershipRelease: true',
    'renderingInputTickAndHeartbeatSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productPresentationSession.includes(marker)) {
      throw new Error(`P6 ProductPresentationSession缺少frame提交保护标记${marker}。`);
    }
  }
  if (/#processingFrame|#frameReentryAttempted/u.test(productPresentationSession)) {
    throw new Error('P6 ProductPresentationSession不得保留旧frame双布尔事实。');
  }
  for (const marker of [
    "#cleanupOperation: 'cleanup' | null",
    '#cleanupOperationSequence: number',
    '#cleanupReentrySequence: number',
    '#cleanupReentryError: Error | null',
    "this.#guardCleanupReentry('state')",
    "this.#guardCleanupReentry('start')",
    "this.#guardCleanupReentry('dispatch')",
    "this.#guardCleanupReentry('setPaused')",
    "this.#guardCleanupReentry('getLastSnapshot')",
    "this.#guardCleanupReentry('getPerformanceSnapshot')",
    "this.#guardCleanupReentry('getDebugSnapshot')",
    "this.#guardCleanupReentry('destroy')",
    'const sequence = this.#beginCleanupOperation()',
    'retainedCleanupOrder.push(...cleanupOrder.slice(index + 1))',
    'cleanupGuardPrecedesDestroyIdempotenceAndPublicReads: true',
    'stickyCleanupReentryUsesMonotonicSequenceAndFirstError: true',
    'cleanupCallbacksCheckedBeforeOwnershipRelease: true',
    'cleanupReentryRetainsCurrentAndLaterSessionOwners: true',
    'bindingAndCandidateCleanupRetainUnprocessedReverseOrderOwners: true',
    'performanceProbeCleanupChecksClockStopSnapshotAndDestroyCallbacks: true',
    'ordinaryCleanupFailuresRemainExactRetryOwners: true',
    'cleanupCompletionClearsNonOwnerPresentationStateOnlyAfterAllOwnerClasses: true',
    'renderingInputTickHeartbeatAndDestroyRetrySemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productPresentationSession.includes(marker)) {
      throw new Error(`P6 ProductPresentationSession缺少cleanup提交保护标记${marker}。`);
    }
  }
  if (/#cleaningUp/u.test(productPresentationSession)) {
    throw new Error('P6 ProductPresentationSession不得保留旧cleanup布尔事实。');
  }
  for (const marker of [
    '#startupSegment: ProductPresentationStartupSegment | null',
    '#startupSegmentSequence: number',
    '#startupReentrySequence: number',
    '#startupReentryError: Error | null',
    "this.#runStartupSegment('renderer-construction'",
    "this.#runStartupSegment('product-assembly'",
    "this.#runStartupSegment('input-start'",
    "this.#runStartupSegment('interactive-publication'",
    "this.#guardStartupReentry('state')",
    "this.#guardStartupReentry('dispatch')",
    "this.#guardStartupReentry('setPaused')",
    "this.#guardStartupReentry('getLastSnapshot')",
    "this.#guardStartupReentry('getPerformanceSnapshot')",
    "this.#guardStartupReentry('getDebugSnapshot')",
    "this.#guardStartupReentry('host-callback')",
    "this.#guardStartupReentry('owned-error-callback')",
    'this.#containObservation(() => shouldSampleResources())',
    'startPromisePublishesBeforeAnyFactoryInvocation: true',
    'startupUsesRendererAssemblyInputAndInteractiveSegments: true',
    'stickyStartupReentryUsesMonotonicSequenceAndFirstError: true',
    'startupCallbacksCheckedBeforeCrossSegmentPublication: true',
    'destroyDuringStartupSegmentDefersUntilSegmentClosure: true',
    'destroyBetweenAsyncSegmentsPreventsLaterOwnerPublication: true',
    'observationalCallbacksCannotOwnProductLifecycle: true',
    'startupFailureRetainsCandidateCleanupOwnership: true',
    'renderingInputTickHeartbeatAndProductSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productPresentationSession.includes(marker)) {
      throw new Error(`P6 ProductPresentationSession缺少startup提交保护标记${marker}。`);
    }
  }
  const productRenderer = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/product-renderer.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductRendererOperation | null',
    '#operationSequence: number',
    '#reentrySequence: number',
    '#reentryError: Error | null',
    "this.#runOperation('state-read'",
    "this.#runOperation('load-request'",
    "this.#runOperation('load-gameplay-launch'",
    "this.#runOperation('load-ui-launch'",
    "this.#runOperation('load-publication'",
    "this.#runOperation('render'",
    "this.#runOperation('resize'",
    "this.#runOperation('context-lost'",
    "this.#runOperation('context-restored'",
    "this.#runOperation('dispose'",
    'loadPromisePublishesBeforeChildLoadInvocation: true',
    'asynchronousLoadUsesGameplayUiAndPublicationSegments: true',
    'contextLossAndDisposeRemainAvailableBetweenAsyncLoadSegments: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossChildAndStatePublication: true',
    'publicStateDebugAndPerformanceReadsRejectIntermediateOperations: true',
    'cleanupReentryRetainsCurrentAndLaterRendererOwners: true',
    'ordinaryCleanupFailureRetainsExactRetryOwner: true',
    'frameCompositionContextAndCleanupOrderRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productRenderer.includes(marker)) {
      throw new Error(`P6 ProductRenderer缺少提交保护标记${marker}。`);
    }
  }
  if (/#rendering/u.test(productRenderer)) {
    throw new Error('P6 ProductRenderer不得保留旧rendering布尔事实。');
  }
  const productCanvasUiSurface = await readFile(path.join(
    root,
    'packages/arena-product-presentation-three/src/product-canvas-ui-surface.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductCanvasUiSurfaceOperation | null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('state-read'",
    "this.#runOperation('load'",
    "this.#runOperation('render'",
    "this.#runOperation('resize'",
    "this.#runOperation('input-viewport-read'",
    "this.#runOperation('ui-hit-test'",
    "this.#runOperation('intent-bind'",
    "this.#runOperation('composite-read'",
    "this.#runOperation('present'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('dispose'",
    'ProductCanvasUiSurface paint transform',
    'ProductCanvasUiSurface paint clear',
    'ProductCanvasUiSurface paint scene',
    'ProductCanvasUiSurface render publication',
    'ProductCanvasUiSurface resize publication',
    'allPublicLifecycleAndReadsUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'canvasCallbacksCheckedBeforeTextureModelAndViewportPublication: true',
    'rendererCallbackCheckedBeforePresentCompletion: true',
    'publicStateViewportCompositeAndDebugReadsRejectIntermediateOperations: true',
    'failClosedCleanupRetainsBindingLeaseAndSceneOwnersForRetry: true',
    'cleanupReentryRetainsCurrentAndLaterSurfaceOwners: true',
    'ordinaryCleanupFailureRetainsExactRetryOwner: true',
    'layoutPaintHitIntentAndCompositeSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!productCanvasUiSurface.includes(marker)) {
      throw new Error(`P6 ProductCanvasUiSurface缺少提交保护标记${marker}。`);
    }
  }
  if (/#operating|#operationName|#reentryDetected/u.test(productCanvasUiSurface)) {
    throw new Error('P6 ProductCanvasUiSurface不得保留旧可重置布尔操作事实。');
  }
  const presentationFrameLoop = await readFile(path.join(
    root,
    'packages/arena-presentation-runtime/src/presentation-frame-loop.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: PresentationFrameLoopOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    '#pendingFrameSequence: number | null = null',
    "this.#runOperation('start'",
    "this.#runOperation('deliver'",
    "this.#runOperation('stop'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('destroy'",
    'this.#pendingFrameSequence !== frameSequence',
    "this.#operation === 'start' || this.#operation === 'deliver'",
    "this.#applyDeferredCommand(sequence, 'start')",
    "this.#applyDeferredCommand(sequence, 'deliver')",
    'PresentationFrameLoop requestFrame',
    'PresentationFrameLoop frame clock',
    'PresentationFrameLoop callback',
    'requestCancelDeliveryAndPublicReadsUseSingleOperationOwner: true',
    'pendingFramesUseGenerationAndMonotonicFrameSequenceIdentity: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'requestAndCancelCallbacksCheckedBeforeTokenOrStatePublication: true',
    'clockAndFrameCallbacksCheckedBeforeTimestampAndNextFramePublication: true',
    'stopAndDestroyDuringDeliveryDeferUntilCallbackClosure: true',
    'diagnosticObserverCannotOwnFrameLoopLifecycle: true',
    'duplicateLateAndCancelledCallbacksCannotClearNewerFrameOwner: true',
    'cadenceDeltaClampAndFailureContainmentRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!presentationFrameLoop.includes(marker)) {
      throw new Error(`P6 PresentationFrameLoop缺少提交保护标记${marker}。`);
    }
  }
  if (/#scheduling|#delivering|#cancelling|#hasPendingFrame/u.test(presentationFrameLoop)) {
    throw new Error('P6 PresentationFrameLoop不得保留旧调度布尔事实。');
  }
  const webProductUiSurface = await readFile(path.join(
    root,
    'src/entry/web-product-ui-surface.ts',
  ), 'utf8');
  for (const marker of [
    '#dispatchOwner: IntentDispatchOwner | null',
    '#dispatchSequence: number',
    'const owner = Object.freeze({ sequence: dispatchSequence, intent })',
    'this.#dispatchOwner = owner',
    'this.#dispatchOwner !== owner',
    'this.#settleIntentDispatch(owner, onRejected, null)',
    'this.#settleIntentDispatch(owner, onRejected, error)',
    'intentOwnerPublishesBeforeSessionHandlerInvocation: true',
    'dispatchUsesMonotonicSequenceAndObjectIdentity: true',
    'duplicateClicksCannotCreateParallelIntentOwners: true',
    'staleSuccessAndFailureSettlementsCannotMutateCurrentUi: true',
    'disposeInvalidatesPendingIntentBeforeDomCleanup: true',
    'rejectionObserverCannotReplaceIntentOwner: true',
    'interactiveControlsDeriveDisabledStateFromOwnerIdentity: true',
    'sceneLayoutHitAndIntentSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webProductUiSurface.includes(marker)) {
      throw new Error(`P6 WebProductUiSurface缺少Intent Owner标记${marker}。`);
    }
  }
  if (/#dispatching/u.test(webProductUiSurface)) {
    throw new Error('P6 WebProductUiSurface不得保留旧dispatching布尔事实。');
  }
  for (const marker of [
    "this.#runOperation('state-read'",
    "this.#runOperation('load'",
    "this.#runOperation('render'",
    "this.#runOperation('resize'",
    "this.#runOperation('input-viewport-read'",
    "this.#runOperation('hit-test'",
    "this.#runOperation('present'",
    "this.#runOperation('composite-read'",
    "this.#runOperation('intent-bind'",
    "this.#runOperation('intent-unbind'",
    "this.#runOperation('intent-launch'",
    "this.#runOperation('intent-settlement'",
    "this.#runOperation('debug-read'",
    "this.#runOperation('dispose'",
    'WebProductUiSurface render base DOM commit',
    'WebProductUiSurface render interactive DOM commit',
    'const bindingOwner = this.#bindingOwner',
    'this.#releaseBindingOwner(sequence, \'dispose\', bindingOwner)',
    'this.#state = WEB_PRODUCT_UI_SURFACE_STATE.DISPOSE_INCOMPLETE',
    'allPublicLifecycleAndReadsUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'domCallbacksCheckedBeforeRenderIdentityPublication: true',
    'renderIdentityPublishesOnlyAfterCompleteDomCommit: true',
    'bindingListenerPublishesOnlyAfterHostRegistration: true',
    'bindingCleanupRetainsFailedListenerOwnerForRetry: true',
    'intentLaunchAndSettlementUseSeparateSynchronousSegments: true',
    'intentDomFailureInvalidatesRenderIdentityForFullRetry: true',
    'disposeInvalidatesIntentBeforeBindingAndDomCleanup: true',
    'disposeFailuresRetainExactBindingRootAndCanvasOwners: true',
    'screenLayoutAccessibilityIntentAndGameplayVisibilityRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webProductUiSurface.includes(marker)) {
      throw new Error(`P6 WebProductUiSurface缺少Lifecycle Owner标记${marker}。`);
    }
  }
  if (/#bindingCleanup/u.test(webProductUiSurface)) {
    throw new Error('P6 WebProductUiSurface不得保留旧binding cleanup闭包事实。');
  }
  const webProductUiRender = webProductUiSurface.slice(
    webProductUiSurface.indexOf('  render(viewModel: ProductSessionViewModel): boolean {'),
    webProductUiSurface.indexOf('  resize(viewport:', webProductUiSurface.indexOf('  render(viewModel:')),
  );
  if (
    webProductUiRender.indexOf('WebProductUiSurface render interactive DOM commit')
      >= webProductUiRender.lastIndexOf('this.#lastRenderKey = renderKey')
  ) {
    throw new Error('P6 WebProductUiSurface必须在完整DOM提交后发布render identity。');
  }
  const webGameTeardown = await readFile(path.join(
    root,
    'packages/arena-platform-runtime/src/web-game-teardown.ts',
  ), 'utf8');
  for (const marker of [
    'class WebGameTeardownOwner',
    "this.#runOperation('bind'",
    "this.#runOperation('cleanup'",
    "this.#runOperation('pagehide'",
    'Web teardown state publication',
    'Web teardown addEventListener',
    'this.#cleanupOwned(sequence, \'bind\', true)',
    'Web teardown state ownership read',
    'Web teardown state release',
    'hostCleanupPublishesBeforeListenerRegistration: true',
    'allBindingCleanupAndPagehideCallbacksUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'hostCallbacksCheckedBeforeOwnershipPublicationOrRelease: true',
    'failedRegistrationRollbackRetainsReachableCleanupDebt: true',
    'failedRemovalRetainsExactListenerAndStateOwnersForRetry: true',
    'staleCleanupCompletesBeforeReplacementBinding: true',
    'pagehideStopObserverCannotOwnBindingLifecycle: true',
    'bfcacheAndRealNavigationBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webGameTeardown.includes(marker)) {
      throw new Error(`P6 Web teardown缺少Owner标记${marker}。`);
    }
  }
  const webGameTeardownBind = webGameTeardown.slice(
    webGameTeardown.indexOf('  bind(): Cleanup {'),
    webGameTeardown.indexOf('\n  }\n}', webGameTeardown.indexOf('  bind(): Cleanup {')),
  );
  if (
    webGameTeardownBind.indexOf('Web teardown state publication')
      >= webGameTeardownBind.indexOf('Web teardown addEventListener')
  ) {
    throw new Error('P6 Web teardown必须先发布可达cleanup再注册pagehide监听器。');
  }
  const launchGameCoordinator = await readFile(path.join(
    root,
    'packages/arena-platform-runtime/src/launch-game.ts',
  ), 'utf8');
  for (const marker of [
    'operation: StartupCoordinatorOperation | null',
    'operationSequence: number',
    'reentrySequence: number',
    'reentryError: Error | null',
    'observationDepth: number',
    "runCoordinatorOperation(state, 'begin-generation'",
    "'platform-launch'",
    "'candidate-adoption'",
    "'start-launch'",
    "'start-settlement'",
    "'failure-publication'",
    "runCoordinatorOperation(state, 'retire-record'",
    'launchGame platform Promise publication',
    'launchGame game capability capture',
    'state.starting = record',
    'launchGame start Promise publication',
    'launchGame current game exposure',
    'destroyOwnedChecked(state, sequence, operation, record)',
    'state.pendingCleanup = records.filter((record) => !record.destroyed)',
    'lifecycleUsesHostScopedMonotonicOperationOwner: true',
    'legacyTransitioningFieldIsMigrationOnly: true',
    'platformCandidateStartAndSettlementUseSeparateSynchronousSegments: true',
    'platformAndStartPromisesPublishBeforeAwait: true',
    'gameCapabilitiesPublishToStartingBeforeStartInvocation: true',
    'destroyCallbacksCheckedBeforeDestroyedAndCleanupOwnerRelease: true',
    'stickyReentryStopsCrossOwnerCleanupAndRetainsPendingDebt: true',
    'staleAsyncSettlementsCannotPublishCurrentGame: true',
    'successAndFailureObserversCannotOwnCoordinatorLifecycle: true',
    'replacementStopAndDebugExposureBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!launchGameCoordinator.includes(marker)) {
      throw new Error(`P6 launchGame协调器缺少Owner标记${marker}。`);
    }
  }
  if (/state\.transitioning\s*=\s*true/u.test(launchGameCoordinator)) {
    throw new Error('P6 launchGame不得继续使用legacy transitioning作为生命周期锁。');
  }
  const launchGameBegin = launchGameCoordinator.slice(
    launchGameCoordinator.indexOf('function beginGeneration('),
    launchGameCoordinator.indexOf(
      'function retireRecord(',
      launchGameCoordinator.indexOf('function beginGeneration('),
    ),
  );
  if (
    launchGameBegin.indexOf('state.pendingCleanup = records.filter')
      >= launchGameBegin.indexOf('exposeGame(root, null)')
  ) {
    throw new Error('P6 launchGame必须先登记旧实例清理债再执行宿主暴露回调。');
  }
  const webPlatform = await readFile(path.join(
    root,
    'packages/arena-platform-runtime/src/web-platform.ts',
  ), 'utf8');
  for (const marker of [
    'class WebListenerOwner',
    "this.#runOperation('bind'",
    "this.#runOperation('cleanup'",
    'this.#owned = true',
    'this.#removeOwned(sequence, \'bind\', true)',
    'cleanups.push(owner.cleanup)',
    'owner.bind(required)',
    "'pointerdown',\n          inputOwner.start",
    "listen(cleanups, env.windowObject, 'resize'",
    "listen(cleanups, env.documentObject, 'visibilitychange'",
    'cleanupOwnerPublishesToBatchBeforeHostRegistration: true',
    'eachListenerBindAndCleanupUsesMonotonicOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'addAndRemoveCallbacksCheckedBeforeOwnershipCommit: true',
    'failedRegistrationRollsBackSameListenerIdentity: true',
    'failedRemovalRetainsExactListenerOwnerForRetry: true',
    'batchRollbackUsesReverseRegistrationOrder: true',
    'resizeShowHideAndInputShareTheSameListenerBoundary: true',
    'pointerMappingEventVocabularyAndCallbackOrderRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Listener Owner标记${marker}。`);
    }
  }
  const webPlatformListen = webPlatform.slice(
    webPlatform.indexOf('function listen('),
    webPlatform.indexOf(
      'class WebCleanupBatchOwner',
      webPlatform.indexOf('function listen('),
    ),
  );
  if (
    webPlatformListen.indexOf('cleanups.push(owner.cleanup)')
      >= webPlatformListen.indexOf('owner.bind(required)')
  ) {
    throw new Error('P6 Web Platform必须在宿主注册前把Listener cleanup发布到批清理栈。');
  }
  for (const marker of [
    'class WebResizeObserverOwner',
    "this.#runOperation('observe'",
    "this.#runOperation('cleanup'",
    'this.#disconnectOwned(sequence, \'observe\', true)',
    'const observerOwner = new WebResizeObserverOwner(observe, disconnect, canvas)',
    'cleanups.push(observerOwner.cleanup)',
    'observerOwner.observe()',
    'cleanupOwnerPublishesBeforeObserveInvocation: true',
    'observeAndDisconnectUseMonotonicOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'observeAndDisconnectCallbacksCheckedBeforeOwnershipCommit: true',
    'failedObserveRollsBackTheSameObserverIdentity: true',
    'failedDisconnectRetainsExactObserverOwnerForBatchRetry: true',
    'ordinaryObserveFailureKeepsWindowResizeFallback: true',
    'observerRollbackFailureClosesTheWholeResizeBinding: true',
    'viewportSizingNotificationAndFallbackBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少ResizeObserver Owner标记${marker}。`);
    }
  }
  if (/let observerActive = true/u.test(webPlatform)) {
    throw new Error('P6 Web Platform不得保留ResizeObserver active布尔事实。');
  }
  if (
    webPlatform.indexOf('cleanups.push(observerOwner.cleanup)')
      >= webPlatform.indexOf('observerOwner.observe()')
  ) {
    throw new Error('P6 Web Platform必须在observe前发布ResizeObserver cleanup Owner。');
  }
  for (const marker of [
    'class WebCleanupBatchOwner',
    "this.#runOperation('rollback'",
    "this.#runOperation('cleanup'",
    'const cleanups = [...this.#cleanups].reverse()',
    'if (this.#reentryError !== null) break',
    'this.#completed = true',
    'const cleanupBatch = new WebCleanupBatchOwner(cleanups)',
    "cleanupBatch.rollback('[web] input binding rollback')",
    "this.#cleanupBatch.cleanup('[web] input binding')",
    "cleanupBatch.rollback('[web] resize binding rollback')",
    "cleanupBatch.rollback('[web] show binding rollback')",
    "cleanupBatch.rollback('[web] hide binding rollback')",
    'this.#cleanupBatch.cleanup(`[web] ${this.#label} binding`)',
    'inputResizeShowAndHideUseDedicatedCleanupBatchOwners: true',
    'rollbackAndPublicCleanupUseMonotonicOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCleanupReturnsCheckedBeforeCrossOwnerProgress: true',
    'ordinaryChildFailuresContinueIndependentReverseCleanup: true',
    'reentrantChildFailureStopsCrossOwnerCleanup: true',
    'successfulChildrenRemainIdempotentDuringRetry: true',
    'batchCompletionPublishesOnlyAfterEveryChildConfirmsRelease: true',
    'registrationOrderPublicCleanupAndEventBehaviorRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Cleanup Batch Owner标记${marker}。`);
    }
  }
  if (/function cleanupAll\(/u.test(webPlatform)) {
    throw new Error('P6 Web Platform不得保留无Owner的cleanupAll批清理。');
  }
  for (const marker of [
    'class WebPointerInputBindingOwner',
    "this.#runOperation('start'",
    "this.#runOperation('move'",
    "this.#runOperation('end'",
    "this.#runOperation('cancel'",
    "this.#runOperation('cleanup'",
    'this.#cleanupRequested = true',
    "if (operation !== 'cleanup' && this.#cleanupRequested)",
    'this.#pressedPointers.add(pointerId)',
    'this.#pressedPointers.delete(pointerId)',
    'this.#onStart(normalized)',
    'this.#onMove(normalized)',
    'this.#onEnd(normalized)',
    'this.#onCancel(normalized)',
    'inputOwner.deactivateForRollback()',
    'return inputOwner.cleanup',
    'pointerStartMoveEndCancelAndCleanupUseSingleOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'pointerIdGestureCaptureNormalizationAndCallbacksCheckedBeforeProgress: true',
    'startFailureRollsBackPressedPointerAndCaptureHint: true',
    'endAndCancelCommitPressedPointerRemovalBeforeCallback: true',
    'eventCleanupRequestsDeferUntilCurrentEventClosure: true',
    'cleanupClearsInputStateBeforeReverseBindingCleanup: true',
    'callbackThenablesAndNestedEventsFailClosed: true',
    'directionJumpPrimaryMappingAndPointerCoordinatesRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Pointer Input Owner标记${marker}。`);
    }
  }
  const webPlatformBindInput = webPlatform.slice(
    webPlatform.indexOf('bindInput: (bindingsValue: unknown = {}) => {'),
    webPlatform.indexOf('onResize: (callback) => {'),
  );
  if (/const (start|move|end|cancel) = \(event: HostObject\)/u.test(webPlatformBindInput)) {
    throw new Error('P6 Web Platform不得保留Pointer事件的分散状态闭包。');
  }
  if (
    webPlatformBindInput.indexOf('const inputOwner = new WebPointerInputBindingOwner({')
      >= webPlatformBindInput.indexOf("'pointerdown',\n          inputOwner.start")
  ) {
    throw new Error('P6 Web Platform必须先建立Pointer Input Owner再注册事件。');
  }
  for (const marker of [
    'class WebNotificationBindingOwner',
    "this.#runOperation('notify'",
    "this.#runOperation('unconditional-notify'",
    "this.#runOperation('cleanup'",
    'this.#cleanupRequested = true',
    "if (operation !== 'cleanup' && this.#cleanupRequested)",
    '() => this.#condition()',
    '() => this.#callback()',
    "label: 'resize'",
    "label: 'show'",
    "label: 'hide'",
    "condition: () => !env.documentObject.hidden",
    "condition: () => Boolean(env.documentObject.hidden)",
    "listen(cleanups, env.windowObject, 'resize', notificationOwner.notify)",
    'observer = new ResizeObserverConstructor(observerNotify) as HostObject',
    'observerNotificationFailure ??= error',
    'if (observerNotificationFailure !== null) throw observerNotificationFailure',
    "listen(cleanups, env.windowObject, 'pageshow', notificationOwner.notify)",
    "'pagehide',\n          notificationOwner.notifyUnconditionally",
    "listen(cleanups, env.windowObject, 'blur', notificationOwner.notifyUnconditionally)",
    'notificationOwner.deactivateForRollback()',
    'return notificationOwner.cleanup',
    'resizeShowAndHideEachUseSingleNotificationOwner: true',
    'conditionalAndUnconditionalNotificationsUseMonotonicOperations: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'visibilityConditionAndCallbackCheckedBeforeProgress: true',
    'callbackCleanupRequestsDeferUntilCurrentNotificationClosure: true',
    'cleanupDeactivatesNotificationBeforeReverseBindingCleanup: true',
    'callbackThenablesAndNestedNotificationsFailClosed: true',
    'resizeObserverAndWindowResizeShareTheSameNotificationOwner: true',
    'visibilityPageFocusBlurVocabularyAndConditionsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Notification Owner标记${marker}。`);
    }
  }
  const webPlatformNotificationBindings = webPlatform.slice(
    webPlatform.indexOf('onResize: (callback) => {'),
    webPlatform.indexOf('createAudio: () => {'),
  );
  if (/let active = true/u.test(webPlatformNotificationBindings)) {
    throw new Error('P6 Web Platform通知Binding不得保留active布尔生命周期事实。');
  }
  if (/const (notify|handler|pageHide) = \(/u.test(webPlatformNotificationBindings)) {
    throw new Error('P6 Web Platform通知Binding不得保留分散事件闭包。');
  }
  for (const marker of [
    'class WebStorageOperationOwner',
    "this.#runOperation('read'",
    "this.#runOperation('write'",
    "this.#runOperation('delete'",
    "() => this.#getItem?.(key)",
    'const serialized = JSON.stringify(value)',
    "this.#assertCommit(sequence, 'write', '[web] storage JSON.stringify')",
    '() => this.#setItem?.(key, serialized)',
    '() => this.#removeItem?.(key)',
    'const parsed: unknown = JSON.parse(value)',
    'const storageOwner = new WebStorageOperationOwner({',
    'const storageRead = storageOwner.read',
    'const storageWrite = storageOwner.write',
    'const storageDelete = storageOwner.delete',
    'readWriteAndDeleteUseSingleStorageOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'hostCallbacksAndThenablesCheckedBeforeResultCommit: true',
    'stringifyAccessorsCheckedBeforeSetItem: true',
    'swallowedNestedStorageCallsFailTheOuterOperationClosed: true',
    'readFailureReturnsNotOkAndMutationFailureReturnsFalse: true',
    'storageKeysJsonShapeAndPublicResultSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Storage Owner标记${marker}。`);
    }
  }
  const webPlatformStorageOwner = webPlatform.slice(
    webPlatform.indexOf('class WebStorageOperationOwner'),
    webPlatform.indexOf('function parseInputBindings'),
  );
  if (
    webPlatformStorageOwner.indexOf(
      "this.#assertCommit(sequence, 'write', '[web] storage JSON.stringify')",
    ) >= webPlatformStorageOwner.indexOf('() => this.#setItem?.(key, serialized)')
  ) {
    throw new Error('P6 Web Platform必须在setItem前复核JSON.stringify访问器反调。');
  }
  const webPlatformFactory = webPlatform.slice(
    webPlatform.indexOf('export function createWebPlatform('),
  );
  if (/const storage(Read|Write|Delete) = \(/u.test(webPlatformFactory)) {
    throw new Error('P6 Web Platform不得保留分散Storage操作闭包。');
  }
  for (const marker of [
    'class WebViewportReadOwner',
    "this.#runOperation('read'",
    "'documentElement',\n        '[web] viewport documentElement'",
    "'clientWidth',\n          '[web] viewport document width'",
    "'innerWidth',\n          '[web] viewport window width'",
    "'clientWidth',\n          '[web] viewport canvas width'",
    "'width',\n          '[web] viewport rect width'",
    "'clientHeight',\n          '[web] viewport document height'",
    "'innerHeight',\n          '[web] viewport window height'",
    "'clientHeight',\n          '[web] viewport canvas height'",
    "'height',\n          '[web] viewport rect height'",
    "'devicePixelRatio',\n            '[web] viewport pixel ratio'",
    "this.#assertCommit(sequence, 'read', '[web] viewport snapshot publication')",
    'const viewportOwner = new WebViewportReadOwner({',
    'getViewport: viewportOwner.read',
    'eachViewportSnapshotUsesSingleReadOperationOwner: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'domCanvasReadsAndNumericCoercionsCheckedBeforeProgress: true',
    'swallowedNestedViewportReadsFailTheOuterSnapshotClosed: true',
    'canvasRectFailureKeepsTheExistingFallbackChain: true',
    'rectCanvasWindowDocumentPriorityRemainsUnchanged: true',
    'pixelRatioStillDefaultsToOneAndCapsAtTwo: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Viewport Owner标记${marker}。`);
    }
  }
  const webPlatformViewportOwner = webPlatform.slice(
    webPlatform.indexOf('class WebViewportReadOwner'),
    webPlatform.indexOf('function parseInputBindings'),
  );
  if (
    webPlatformViewportOwner.indexOf('const documentWidth =')
      >= webPlatformViewportOwner.indexOf('const windowWidth =')
    || webPlatformViewportOwner.indexOf('const windowWidth =')
      >= webPlatformViewportOwner.indexOf('const canvasWidth =')
    || webPlatformViewportOwner.indexOf('const canvasWidth =')
      >= webPlatformViewportOwner.indexOf('const width =')
  ) {
    throw new Error('P6 Web Platform必须保持document→window→canvas→rect的Viewport fallback链。');
  }
  if (/getViewport: \(\) => \{/u.test(webPlatformFactory)) {
    throw new Error('P6 Web Platform不得保留无Owner的内联Viewport读取。');
  }
  for (const marker of [
    'class WebAssetReadRequestOwner',
    'class WebAssetReadService',
    "'fetch-start',\n        'created',\n        'fetch-pending'",
    "'fetch-settlement',\n        'fetch-pending',\n        'response-ready'",
    "'bytes-start',\n        'response-ready',\n        'bytes-pending'",
    "'bytes-settlement',\n        'bytes-pending',\n        'completed'",
    'const response = await responseValue',
    'const bytes = await bytesValue',
    'const arrayBuffer = optionalMethod(responseObject, \'arrayBuffer\')',
    'if (!(bytes instanceof ArrayBuffer))',
    'this.#phase = nextPhase',
    'this.#requestSequence += 1',
    "const fetchHost = optionalMethod(env.root, 'fetch')",
    "?? optionalMethod(env.windowObject, 'fetch')",
    'const assetReadService = new WebAssetReadService(fetchHost ?? undefined)',
    'const readAssetBytes = assetReadService.read',
    'eachAssetRequestUsesUniqueMonotonicIdentity: true',
    'concurrentIndependentAssetRequestsRemainAllowed: true',
    'fetchAndBytesStartAndSettlementUseFourOwnedSegments: true',
    'eachSegmentRequiresTheExactPriorPhase: true',
    'responsePortIsCapturedBeforeArrayBufferInvocation: true',
    'onlyCompletedRequestMayPublishArrayBufferBytes: true',
    'assetPathRestrictionAndArrayBufferContractRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Asset Read Owner标记${marker}。`);
    }
  }
  const webPlatformAssetRequest = webPlatform.slice(
    webPlatform.indexOf('class WebAssetReadRequestOwner'),
    webPlatform.indexOf('class WebAssetReadService'),
  );
  if (
    webPlatformAssetRequest.indexOf("'fetch-start'")
      >= webPlatformAssetRequest.indexOf('await responseValue')
    || webPlatformAssetRequest.indexOf("'fetch-settlement'")
      >= webPlatformAssetRequest.indexOf("'bytes-start'")
    || webPlatformAssetRequest.indexOf("'bytes-start'")
      >= webPlatformAssetRequest.indexOf('await bytesValue')
    || webPlatformAssetRequest.indexOf("'bytes-settlement'")
      >= webPlatformAssetRequest.indexOf('return bytes')
  ) {
    throw new Error('P6 Web Platform资产读取必须保持fetch→response→bytes四段提交顺序。');
  }
  if (/const readAssetBytes = async/u.test(webPlatformFactory)) {
    throw new Error('P6 Web Platform不得保留无Request Owner的内联资产读取。');
  }
  for (const marker of [
    'class WebShareOperationOwner',
    'if (this.#pending !== null) return Promise.resolve(false)',
    'this.#pending = pending',
    "this.#runOperation('start'",
    'const result = this.#shareHost?.(payload)',
    "this.#assertCommit(sequence, 'start', '[web] share host invocation')",
    'Promise.resolve(shareResult).then(',
    '() => this.#settle(pending, true)',
    '() => this.#settle(pending, false)',
    'if (this.#pending !== pending) return',
    "this.#runOperation('settlement'",
    'this.#pending = null',
    'pending.resolve(result)',
    'const shareOwner = new WebShareOperationOwner(shareHost ?? undefined)',
    'share: shareOwner.share',
    'pendingOwnerPublishesBeforeHostShareInvocation: true',
    'oneShareRequestMayBePendingAtATime: true',
    'startAndSettlementUseMonotonicOperations: true',
    'stickySynchronousReentryFailsTheCurrentRequestClosed: true',
    'concurrentDuplicateShareReturnsFalseWithoutReplacingOwner: true',
    'staleSettlementCannotReleaseOrPublishANewerRequest: true',
    'hostFailureAndMissingCapabilityStillReturnFalse: true',
    'sharePayloadAndSuccessBooleanSemanticsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Share Owner标记${marker}。`);
    }
  }
  const webPlatformShareOwner = webPlatform.slice(
    webPlatform.indexOf('class WebShareOperationOwner'),
    webPlatform.indexOf('function parseInputBindings'),
  );
  if (
    webPlatformShareOwner.indexOf('this.#pending = pending')
      >= webPlatformShareOwner.indexOf('this.#shareHost?.(payload)')
    || webPlatformShareOwner.indexOf('if (this.#pending !== pending) return')
      >= webPlatformShareOwner.indexOf('this.#pending = null')
  ) {
    throw new Error('P6 Web Platform Share必须先发布pending且只允许当前identity结算。');
  }
  if (/share: async \(payload\)/u.test(webPlatformFactory)) {
    throw new Error('P6 Web Platform不得保留无Pending Owner的内联Share实现。');
  }
  for (const marker of [
    'class WebClockReadOwner',
    'class WebVibrationOperationOwner',
    "this.#runOperation('read'",
    "() => this.#performanceNow?.()",
    "return this.#callChecked(sequence, () => Date.now(), '[web] Date.now fallback')",
    "this.#runOperation('vibrate'",
    "const result = this.#vibrateHost(kind === 'heavy' ? 40 : 18)",
    "rejectThenable(result, '[web] navigator.vibrate')",
    'const clockOwner = new WebClockReadOwner(performanceNow ?? undefined)',
    'const vibrationOwner = new WebVibrationOperationOwner(vibrateHost ?? undefined)',
    'const now = clockOwner.read',
    'vibrate: vibrationOwner.vibrate',
    'performanceClockAndVibrationUseIndependentOperationOwners: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'performanceNowReturnAndThenableCheckedBeforePublication: true',
    'clockFailureStillFallsBackToWallTime: true',
    'vibrationReturnAndThenableCheckedBeforeSuccess: true',
    'vibrationFailureAndMissingCapabilityStillReturnFalse: true',
    'lightAndHeavyDurationsRemainEighteenAndFortyMilliseconds: true',
    'frameSchedulerClockAndPublicNowShareTheSameOwner: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少同步宿主Owner标记${marker}。`);
    }
  }
  if (
    /const now = \(\) => \{/u.test(webPlatformFactory)
    || /vibrate: \(kind = 'light'\) => \{/u.test(webPlatformFactory)
  ) {
    throw new Error('P6 Web Platform不得保留无Owner的时钟或振动闭包。');
  }
  if (
    webPlatformFactory.indexOf('const now = clockOwner.read')
      >= webPlatformFactory.indexOf('createFrameScheduler({')
  ) {
    throw new Error('P6 Web Platform FrameScheduler必须使用同一Clock Owner。');
  }
  for (const marker of [
    'class WebMediaFactoryOperationOwner',
    "this.#runOperation('create-image'",
    "this.#runOperation('create-audio'",
    "this.#runOperation('create-offscreen-canvas'",
    "() => createElement('img')",
    "() => createElement('canvas')",
    "() => normalizeCanvasSize(width, height, 'web')",
    "() => sizeCanvas(canvas, size.width, size.height, 'web')",
    "if (this.#reentryError !== null) throw error",
    'const mediaFactoryOwner = new WebMediaFactoryOperationOwner(env)',
    'createOffscreenCanvas: mediaFactoryOwner.createOffscreenCanvas',
    'createImage: mediaFactoryOwner.createImage',
    'createAudio: mediaFactoryOwner.createAudio',
    'imageAudioAndOffscreenCanvasUseSingleFactoryOwner: true',
    'eachFactoryCallUsesMonotonicNamedOperation: true',
    'stickyCrossFactoryReentryFailsTheOuterConstructionClosed: true',
    'constructorsAndDomFallbacksCheckedBeforePublication: true',
    'offscreenSizeNormalizationAndSizingCheckedBeforePublication: true',
    'blockedOffscreenCanvasStillFallsBackToDomCanvas: true',
    'imageAndAudioFailureStillReturnNull: true',
    'canvasSizeRulesAndMediaFactoryVocabularyRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Media Factory Owner标记${marker}。`);
    }
  }
  if (/function createOffscreenCanvas\(/u.test(webPlatform)) {
    throw new Error('P6 Web Platform不得保留无Owner的OffscreenCanvas工厂。');
  }
  if (
    /createImage: \(\) => \{/u.test(webPlatformFactory)
    || /createAudio: \(\) => \{/u.test(webPlatformFactory)
  ) {
    throw new Error('P6 Web Platform不得保留无Owner的Image或Audio内联工厂。');
  }
  for (const marker of [
    'class WebMainCanvasCreationOwner',
    'class WebGlContextOperationOwner',
    "() => querySelector('#game')",
    "() => prepareCanvas(selectedCanvas, 'web') as HostObject",
    "() => createElement('canvas')",
    'const rollback = remove',
    'appendAttempted = true',
    '() => appendChild(createdCanvas)',
    "() => prepareCanvas(createdCanvas, 'web') as HostObject",
    'if (!rollback) throw cause',
    "'[web] 备用 Canvas 创建失败且DOM回滚不完整。'",
    "const context = getRequiredWebGL2Context(canvas, attributes, 'web')",
    "rejectThenable(context, '[web] WebGL2 context')",
    'const mainCanvasOwner = new WebMainCanvasCreationOwner(env)',
    'const canvas = mainCanvasOwner.create()',
    'const webGlContextOwner = new WebGlContextOperationOwner()',
    'getWebGLContext: webGlContextOwner.create',
    'mainCanvasCreationAndWebGlContextUseIndependentOwners: true',
    'existingSelectedCanvasRemainsBorrowedAndIsNeverRemoved: true',
    'fallbackRollbackPortCapturedBeforeAppendWhenAvailable: true',
    'appendOrPreparationFailureUsesTheSameCandidateRollback: true',
    'minimalHostsWithoutRemovalKeepLegacySuccessfulCreation: true',
    'mainCanvasPublishesOnlyAfterPrepareCanvasCompletes: true',
    'webGlContextPublishesOnlyAfterRequiredWebGl2Validation: true',
    'webGl2AndValidatedLegacyTokenFallbackRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Main Canvas/WebGL Owner标记${marker}。`);
    }
  }
  if (/function mainCanvasFrom\(/u.test(webPlatform)) {
    throw new Error('P6 Web Platform不得保留无Owner的mainCanvasFrom工厂。');
  }
  const webPlatformMainCanvasOwner = webPlatform.slice(
    webPlatform.indexOf('class WebMainCanvasCreationOwner'),
    webPlatform.indexOf('class WebGlContextOperationOwner'),
  );
  if (
    webPlatformMainCanvasOwner.indexOf('const rollback = remove')
      >= webPlatformMainCanvasOwner.indexOf('appendAttempted = true')
    || webPlatformMainCanvasOwner.indexOf('appendAttempted = true')
      >= webPlatformMainCanvasOwner.indexOf('() => appendChild(createdCanvas)')
  ) {
    throw new Error('P6 Web Platform必须先捕获fallback Canvas回滚端口再尝试append。');
  }
  for (const marker of [
    'class WebWallClockReadOwner',
    "this.#runOperation('read'",
    "rejectThenable(value, '[web] wall clock')",
    "throw new TypeError('[web] wall clock 必须返回有限数字。')",
    'readonly #wallNow: HostCallback',
    "() => this.#wallNow(), '[web] wall clock fallback'",
    'const wallClockOwner = new WebWallClockReadOwner(Date.now.bind(Date))',
    'wallClockOwner.read,',
    'wallNow: wallClockOwner.read',
    'requestFrame: frames.requestFrame',
    'cancelFrame: frames.cancelFrame',
    'wallClockUsesIndependentMonotonicReadOwner: true',
    'dateNowPortIsCapturedOnceDuringPlatformConstruction: true',
    'wallClockReturnAndThenableCheckedBeforePublication: true',
    'publicWallNowAndPerformanceFallbackShareTheSameOwner: true',
    'frameSchedulerAndPublicNowStillShareThePerformanceClockOwner: true',
    'frameSchedulerTokenAndLegalCallbackRescheduleSemanticsRemainUnchanged: true',
    'wallClockVocabularyAndMillisecondUnitsRemainUnchanged: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!webPlatform.includes(marker)) {
      throw new Error(`P6 Web Platform缺少Wall Clock Owner标记${marker}。`);
    }
  }
  if (/wallNow: \(\) => Date\.now\(\)/u.test(webPlatformFactory)) {
    throw new Error('P6 Web Platform不得保留无Owner的内联wallNow。');
  }
  if (
    webPlatformFactory.indexOf('const wallClockOwner = new WebWallClockReadOwner')
      >= webPlatformFactory.indexOf('const clockOwner = new WebClockReadOwner')
  ) {
    throw new Error('P6 Web Platform必须先建立Wall Clock Owner再建立Performance Clock。');
  }
  const miniGamePlatform = await readFile(path.join(
    root,
    'packages/arena-platform-runtime/src/mini-game-platform.ts',
  ), 'utf8');
  for (const marker of [
    'class MiniGameMainCanvasCreationOwner',
    'class MiniGameGlContextOperationOwner',
    'class MiniGameWallClockReadOwner',
    'class MiniGameClockReadOwner',
    'class MiniGameMediaFactoryOperationOwner',
    'class MiniGameVibrationOperationOwner',
    'class MiniGameViewportReadOwner',
    'class MiniGameStorageOperationOwner',
    'class MiniGameShareOperationOwner',
    'class MiniGameAssetReadRequestOwner',
    'class MiniGameAssetReadService',
    'class MiniGameInputBindingOwner',
    'class MiniGameNotificationBindingOwner',
    'const mainCanvasOwner = new MiniGameMainCanvasCreationOwner(createCanvas, id)',
    'const glContextOwner = new MiniGameGlContextOperationOwner(id)',
    'const viewportOwner = new MiniGameViewportReadOwner(api, id)',
    'const wallClockOwner = new MiniGameWallClockReadOwner(Date.now.bind(Date), id)',
    'const storageOwner = new MiniGameStorageOperationOwner({',
    'const assetReadService = new MiniGameAssetReadService(api, id)',
    'const mediaFactoryOwner = new MiniGameMediaFactoryOperationOwner({',
    'const vibrationOwner = new MiniGameVibrationOperationOwner(vibrateLong, vibrateShort, id)',
    'const shareOwner = new MiniGameShareOperationOwner(shareAppMessage, id)',
    'const inputBindingOwner = new MiniGameInputBindingOwner({',
    'const notificationBindingOwner = new MiniGameNotificationBindingOwner({',
    'createOffscreenCanvas: mediaFactoryOwner.createOffscreenCanvas',
    'getWebGLContext: glContextOwner.create',
    'readAssetBytes,',
    'getViewport: readViewport',
    'wallNow: wallClockOwner.read',
    'bindInput: inputBindingOwner.bind',
    'share: shareOwner.share',
    'mainCanvasAndWebGlUseIndependentOperationOwners: true',
    'wallClockAndPerformanceClockUseIndependentReadOwners: true',
    'imageAudioAndOffscreenCanvasShareOneFactoryOwner: true',
    'viewportReadUsesSingleSynchronousOperationOwner: true',
    'readWriteAndDeleteShareOneOperationOwner: true',
    'pendingIdentityPublishesBeforeHostInvocation: true',
    'eachAssetReadUsesIndependentRequestOwner: true',
    'touchBindingAndNotificationBindingUseIndependentOwners: true',
    'type MiniGameTouchCoordinateSnapshot',
    'const coordinates = Object.freeze({',
    "const value = touchPoint(hostObject(touch, 'mini-game touch'), coordinates)",
    'oneViewportAndCanvasSnapshotIsSharedByAllTouchesInOneEvent: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!miniGamePlatform.includes(marker)) {
      throw new Error(`P6 Mini-game Platform缺少宿主Owner标记${marker}。`);
    }
  }
  for (const forbidden of [
    /function createMiniGameAssetReader\(/u,
    /function createViewportReader\(/u,
    /wallNow: \(\) => Date\.now\(\)/u,
    /share: async \(payload\)/u,
  ]) {
    if (forbidden.test(miniGamePlatform)) {
      throw new Error(`P6 Mini-game Platform仍保留无Owner宿主边界${String(forbidden)}。`);
    }
  }
  const platformContracts = await readFile(path.join(
    root,
    'packages/arena-platform-contracts/src/index.ts',
  ), 'utf8');
  for (const marker of [
    'let callbackFailed = false',
    'let callbackFailure: unknown = null',
    'if (callbackFailed) throw callbackFailure',
    'if (!entry.active || !pending.has(token)) return token',
    'synchronousDeliveryStillAllowsCallbackRequestedNextFrame: true',
    'deliveredFrameNeverCreatesOrphanFallbackTimer: true',
    'synchronousCallbackFailureCannotBeSwallowedByHostRequest: true',
    'undefinedHostFrameIdStillMeansScheduled: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!platformContracts.includes(marker)) {
      throw new Error(`P6 Platform Frame Scheduler缺少同步投递标记${marker}。`);
    }
  }
  for (const marker of [
    '#operation: ArenaV2LearningProfileServiceOperationV1 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('state-read'",
    "this.#runOperation('open'",
    "this.#runOperation('commit-grant'",
    'this.#repositoryValue().renewLease()',
    "this.#assertCurrentOperationCommit('租约续租')",
    'this.#repositoryValue().compareAndSet(outcome.profile, current.revision)',
    'if (this.#reentryError !== null) {',
    'Learning Repository.getSnapshot after reentrant compareAndSet',
    'this.#profile = published',
    "this.#assertCurrentOperationCommit('CAS返回后读回', true)",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('last-known-snapshot-read'",
    "this.#runOperation('destroy'",
    "this.#assertCurrentOperationCommit('销毁')",
    'operationGuardPrecedesStateAndGrantValidation: true',
    'repositoryPortsCheckedBeforeCrossOwnerProgress: true',
    'ambiguousCompareAndSetReadbackCommitsBeforeReentryRejection: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'repositoryCallbacksCheckedBeforeProfilePublication: true',
    'destroyCallbackConfirmedBeforeOwnershipRelease: true',
    'publicStateAndSnapshotsRejectOperationIntermediateState: true',
    'destroyWatermarkPrecedesReentryRejection: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!learningProfileService.includes(marker)) {
      throw new Error(`P6 Learning Profile Service缺少粘滞提交标记${marker}。`);
    }
  }
  const threeModeLocalPlayableHost = await readFile(path.join(
    root,
    'packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'retentionObservationSequenceCommitsAfterCollectorSuccess: true',
    'retentionProducerStateCommitsAfterCollectorSuccess: true',
    'retentionPendingActionConsumptionCommitsAfterCollectorSuccess: true',
    'retentionPendingActionBlocksLaterWatermarksUntilRetry: true',
    'retentionPendingActionRetriesFrozenObservationIdentity: true',
    'retentionPendingOpportunityNeverReplacedBeforeCommit: true',
    'retentionCollectorReentryCheckedBeforeWatermarkCommit: true',
    'retentionRetryReentryCheckedBeforeBusinessAction: true',
    'retentionPendingActionRetryBlocksBusinessUntilCommitted: true',
    'retentionActionRetryCapturesCurrentCatalogBeforeBusiness: true',
    'retentionPendingActionBlocksMatchStartBeforeBaseline: true',
    'retentionSettlementWorkBatchBoundedToTwentyFive: true',
    'retentionSettlementWorkBatchFreezesOrderedObservationsAndPostCommit: true',
    'retentionSettlementWorkBatchRetriesFromExactCursor: true',
    'retentionSettlementUsesAtomicCollectorBatchWhenAvailable: true',
    'retentionAtomicBatchPreconditionsCheckedBeforeCollectorCall: true',
    'retentionAtomicBatchPostStateCommitsOnlyAfterCollectorSuccess: true',
    'retentionCollectorsWithoutBatchPortRemainSupported: true',
    'retentionCatalogWorkFreezesNavigationRevisionAndOrdinal: true',
    'retentionFocusClearsOnlyAfterCollectorCommit: true',
    'retentionSettlementWorkBlocksNextMatchUntilDrained: true',
    'retentionDestroyDrainsFrozenWorkBeforeChildCleanup: true',
    'retentionNextGoalCaptureDebtFrozenAtSettlementCommit: true',
    'retentionNextGoalCaptureDebtRetriesSameProfileGeneration: true',
    'retentionNextGoalCaptureFreezesRegistryScopeBeforeResolver: true',
    'retentionNextGoalCaptureRetriesNeverRereadRegistryScope: true',
    'retentionNextGoalCaptureDebtBlocksBusinessAndMatchStart: true',
    'retentionNextGoalCaptureDebtClearsOnlyAfterGoalIdentityClosure: true',
    'retentionNextGoalCaptureMutuallyExclusiveWithWorkActionAndImpression: true',
    'retentionDestroyDrainsNextGoalCaptureBeforeChildCleanup: true',
    'retentionWithoutCollectorCreatesNoNextGoalCaptureDebt: true',
    'scopeCompletionDoesNotCreateNextGoalSelectionDenominator: true',
    'goalAlignedPlayAgainCountsAsNextGoalSelection: true',
    'settledRetentionFactsBindCommittedProfileAndReplayContent: true',
    'settledRetentionFactsUseCompleteLocalProductResultWeaponUsage: true',
    'authorityResearchCandidateOnlyChecksSettlementIdentity: true',
    'weaponDefinitionIds: localUsage.usedCollectionEquipmentDefinitionIds',
    'ARENA_V2_OFFLINE_RETENTION_OBSERVATION_BATCH_LIMIT_V1',
    '#prepareSettledMatchRetentionWorkBatch(',
    'for (const weaponDefinitionId of weaponDefinitionIds)',
    '#drainRetentionWorkBatch(',
    '#retryPendingRetentionWorkBatches()',
    '#applyRetentionWorkPostCommit(',
    '#assertAtomicSettlementRetentionWorkBatchReady(',
    '#commitAtomicSettlementRetentionWorkBatch(',
    '#preparePendingNextGoalCaptureDebt(',
    'pendingNextGoalCapture:',
    "if (nextGoal.kind === 'catalog-complete') {",
    'selectedNextGoal || acceptedGoalAlignedPlayAgainPreparation !== null',
    'this.#collectCatalogImpressionForCurrentScreen();',
    'retentionObservationCollectorReentryBlocked: true',
    '#retentionObservationCollectionActive = false',
    'collector.collect(observation);',
    'collector.collect(item.observation);',
    'collector.collectBatch(observations);',
    'this.#retentionObservationEventSequence = item.observation.eventSequence;',
    'Arena留存观察提交期间不能重入本地Playable Host',
    'Arena留存观察提交期间不能销毁本地Playable Host',
    'localPlayableCleanupClosesAllBusinessEntry: true',
    'localPlayablePartialCleanupRetainsOnlyIncompleteOwners: true',
    'localPlayableCleanupFollowsConsumerBeforeDependencyOrder: true',
    'localPlayableConstructionCleanupPreservesPrimaryAndAllCleanupFailures: true',
    'localPlayableConstructionCleanupRetainsRetryableOwnerDebt: true',
    'localPlayableConstructionCleanupWaitsForNestedDownstreamDebt: true',
    'localPlayableEvidenceClearsAfterAllOwnedResources: true',
    'localPlayableHostSynchronousLifecycleReentryRejected: true',
    'localPlayableHostOperationLockScope:',
    "'navigation-selection-match-settlement-recovery-preferences-destroy'",
    'localPlayablePrimarySnapshotsRejectedDuringMutation: true',
    'type ArenaThreeModeLocalPlayableHostOperationCandidateV1 =',
    '#operation: ArenaThreeModeLocalPlayableHostOperationCandidateV1 | null = null',
    'Arena three-mode local playable host拒绝${this.#operation}期间同步重入${operation}',
    "return this.#runOperation('dispatch-primary-intent'",
    "return this.#runOperation('step-match'",
    "return this.#runOperation('settle-match'",
    "return this.#runOperation('retry-settlement-recovery'",
    "this.#runOperation('destroy'",
    'playableHostCleanupClosesAllBusinessEntry: true',
    'playableHostPartialCleanupRetainsOnlyIncompleteOwners: true',
    'playableHostTerminalStateWaitsForInformationAndHudOwners: true',
    'playableHostCleanupFollowsHudConsumerBeforeInformationOwner: true',
    'playableHostConstructionCleanupRetainsRetryableHudOwner: true',
    'playableHostPreflightsHudBeforeInformationOwnerConstruction: true',
    'playableHostSynchronousLifecycleReentryRejected: true',
    "playableHostOperationLockScope:",
    "'all-business-mutations-and-destroy-with-read-snapshot-rejection'",
    'type ArenaThreeModePlayableHostOperationCandidateV1 =',
    '#operation: ArenaThreeModePlayableHostOperationCandidateV1 | null = null',
    '#runOperation<T>(',
    'Arena three-mode playable host拒绝${this.#operation}期间同步重入${operation}',
    'dependencyPreflightCompletesBeforeBundleFactoryConstruction: true',
    'constructionCleanupRetainsRetryableFactoryOwners: true',
    'constructionCleanupFollowsSessionBeforeBundleDependencyOrder: true',
    'class ArenaThreeModeAuthoritativeInformationHostConstructionCleanupFailureCandidateV1',
    'cleanupInformationHostConstructionResourcesCandidateV1',
    'preflightArenaV2ModeLearningSessionFactoryDependenciesCandidateV1({',
    '#informationOwnerDestroyed = false',
    '#cleanupOwnedResources(): readonly unknown[]',
    '#cleanupComplete(): boolean',
    'if (this.#hud === null && !this.#informationOwnerDestroyed)',
    'class ArenaThreeModeAuthoritativePlayableHostConstructionCleanupFailureCandidateV1',
    'cleanupPlayableHostConstructionResourcesCandidateV1',
    'Arena three-mode playable host已开始清理',
    'const hud = new ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1(hudOptions)',
    'informationOwner = new ArenaThreeModeAuthoritativeInformationHostCandidateV1({',
    '#cleanupStarted = false',
    '#learningSettlementRecoveryOwnerDestroyed = false',
    '#learningSettlementIntentJournalDestroyed = false',
    '#assertBusinessOpen(operation: string): void',
    '拒绝已开始清理的本地Playable Host',
    'Arena three-mode local playable host Registry读取',
    'if (!this.#learningSettlementRecoveryOwnerDestroyed)',
    'if (!this.#learningSettlementIntentJournalDestroyed)',
    'if (this.#playableHost === null && !this.#learningSettlementRecoveryOwnerDestroyed)',
    '&& this.#learningSettlementRecoveryOwnerDestroyed',
    '&& this.#learningSettlementIntentJournalDestroyed',
    'Arena three-mode local playable host清理未收敛',
    'class ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1',
    'cleanupLocalPlayableConstructionResourcesCandidateV1',
    'localPlayableConstructionCleanupCompleteCandidateV1',
    'downstreamConstructionDebt',
    'informationConstructionDebt',
    'homePrimaryActionAcceptsContinuationIntoExistingModeConfirmation: true',
    'homeContinuationNeverAutoStartsMatch: true',
    'homeSurvivalContinuationNeverPreselectsWeapon: true',
    'homeContinuationFollowObservationOptInWired: true',
    'homeContinuationFollowUsesFrozenMatchStartScene: true',
    'homeContinuationObservationFailureNeverBlocksMatchStart: true',
    'modeConfirmationShowsHomeContinuationPreparationState: true',
    'adjustedHomeContinuationStillAllowsCurrentSelection: true',
    'homeContinuationPreparationStateIndependentFromRetentionCollector: true',
    'resultHomeContinuationReceiptUsesValidatedMatchStartScene: true',
    'resultHomeContinuationReceiptNeverClaimsGoalCompletion: true',
    'resultHomeContinuationReceiptFailureNeverBlocksMatch: true',
    'resultMatchStartLearningGoalAttemptReceiptWired: true',
    'resultMatchStartLearningGoalAttemptUsesFrozenProfileAndRegistryRead: true',
    'resultMatchStartLearningGoalAttemptUsesReducerAppliedIdentityOnly: true',
    'resultMatchStartLearningGoalAttemptIndependentFromRetentionCollector: true',
    'resultGoalPreparationReusesContinuationConfirmationSession: true',
    'resultGoalPreparationRevalidatesGoalModeWeaponAndMap: true',
    'resultGoalPreparationPreservesSurvivalUnarmedStart: true',
    'resultGoalPreparationNeverWritesHomeContinuationMetric: true',
    'continuationPreparationOptionalDepthPreservesSession: true',
    'continuationPreparationExplicitExitClearsAfterNavigation: true',
    'continuationPreparationExitCompletesOnlyPendingHomeObservation: true',
    'resultCollectionDetailCarriesPendingGoalPreparation: true',
    'resultCollectionDetailRevalidatesGoalBeforeModeConfirmation: true',
    'resultCollectionDetailAdjacentBrowseBecomesAdjustedPreparation: true',
    'resultCollectionDetailExitClearsPendingPreparation: true',
    'goalAlignedPlayAgainUsesRenderedRouteFitIdentity: true',
    'goalAlignedPlayAgainRevalidatesStableOrConditionalFit: true',
    'goalAlignedPlayAgainReceiptUsesValidatedMatchStartScene: true',
    'arbitraryPlayAgainNeverClaimsGoalContinuation: true',
    'explicitNextGoalReusesModeOrDetailContinuationSession: true',
    'explicitNextGoalUnsupportedRoutesNeverClaimPreparation: true',
    'staleContinuationPreparationHiddenWithoutMutation: true',
    'staleContinuationPreparationClearedBeforeNextAction: true',
    'staleContinuationNeverCreatesMatchReceipt: true',
    'staleResultDetailContinuesAsOrdinaryNavigation: true',
    'informationCollectionSelectionUsesSingleProfileRegistryReadSnapshot: true',
    'informationCollectionReadBundlesSelectionContentProfileAndRegistry: true',
    'resultNextGoalNavigationUsesFrozenRouteFitWeaponScope: true',
    'homeContinuationNavigationUsesFrozenGoalWeaponScope: true',
    'informationPageProjectionReusesSingleRewardAndLearningProfileReads: true',
    'informationPipelineSelectionReusesPageProjectionReadBundle: true',
    'informationPipelineDetailBrowseReusesPageProjectionReadBundle: true',
    'informationPipelineCarriesPageRecoveryAndNextGoalRead: true',
    'informationPipelineCarriesResultRecommendationsFromPageRead: true',
    'resultNextGoalClickUsesSingleSettlementAndLearningRead: true',
    'resultReadConsumersAvoidSettlementExistencePreflightReread: true',
    'informationPageProjectionCarriesSingleLearningSettlementRead: true',
    'informationPageProjectionUsesAggregateRecoveryOwnerSnapshot: true',
    'informationCompositionReusesInitialModeSessionStateRead: true',
    'modeContentContinuationPreparationReusesPageLearningRead: true',
    'continuationGoalDriftChecksReuseSingleLearningRead: true',
    'informationNavigationSelectionReadAvoidsProfileProjection: true',
    'primaryIntentReusesSingleLearningSettlementAndRouteFitRead: true',
    'diagnosticSnapshotReusesCurrentScreenPageProjectionRead: true',
    'informationInteractionGateReadSharesInformationAndRecoverySnapshot: true',
    'informationPageProjectionAvoidsNestedHostGuardReads: true',
    'informationPageProjectionUsesGuardFreeProfileAndRegistryReads: true',
    'settlementRecoveryRetryReusesSingleInformationSnapshot: true',
    'standaloneInformationProjectionsUseSingleOuterHostGuard: true',
    'highFrequencyInformationConsumersReuseOuterHostGuard: true',
    'continuationDriftCallersReuseOuterHostGuard: true',
    'bottomNavigationReusesSingleWritableHost: true',
    'primaryIntentReusesSingleWritableHost: true',
    'diagnosticSnapshotReusesSingleHostAndInformationRead: true',
    'detailBrowseReusesOuterHostRegistryRead: true',
    'nextGoalReadsReuseSingleLearningAndRegistrySnapshot: true',
    'weaponSelectionReusesOuterHostAndDeadProfileReadWrappersRemoved: true',
    '#projectInformationLearningFromRead(',
    'const learningRead = pages.profileReads.learning;',
    'const collectionContent = pages.collectionContent;',
    'const activeWeaponDefinitionIds = learningRead.eligibleWeaponDefinitionIds === null',
    '#isContinuationPreparationCurrentFromRead(',
    '#continuationPreparationReadFromLearningRead(',
    '#continuationPreparationGoalDriftedFromCurrentOwners()',
    '#clearContinuationPreparationIfGoalDrifted()',
    'sevenOfflineRetentionObservationLifecycleOptInWired: true',
    'eightOfflineRetentionObservationLifecycleOptInWired: true',
    'offlineWeaponContextFocusContinuationObservationOptInWired: true',
    "nextGoal.kind !== 'collect-weapon' && nextGoal.kind !== 'weapon-context'",
    'settlement.weaponContextEvidenceDeltas.find',
    'previousGoalContext: focus.context',
    'offlineMapLearningFocusContinuationObservationOptInWired: true',
    '#captureMapLearningFocusObservation(',
    '#collectMapLearningFocusObservation(',
    'createArenaV2MapLearningFocusContinuationObservationV1({',
    '#resolveHomeNextGoalContinuationNavigationRoute(',
    '#nextLearningGoalContinuationRouteReadFromLearningRead(readClickLearning())',
    'homeContinuationRead!.eligibleWeaponDefinitionIds',
    '#assertRenderedHomeContinuationRouteIdentity(',
    'Arena首页已渲染的下一局建议与点击时续玩路由发生漂移',
    "targetScreenId: 'mode-select' as const",
    'this.#applyNextGoalNavigationRoute(homeContinuationRoute)',
    '#completeHomeContinuationFollowObservation(',
    "kind: 'home-continuation-followed'",
    'matchPresentation.getSceneReadFrame()',
    '#acceptedHomeContinuationPreparation',
    'const continuationPreparation = this.#continuationPreparationReadFromLearningRead(',
    'homeContinuationPreparationState: continuationPreparation.state',
    '#captureHomeContinuationMatchReceipt(',
    '#projectHomeContinuationMatchReceipt(',
    '#captureResultGoalContinuationPreparation(',
    '#captureResultCollectionDetailPreparation(',
    '#revalidateResultCollectionDetailPreparation(',
    '#captureGoalAlignedPlayAgainPreparation(',
    'expectedResultPlayAgainFitKind',
    'Arena已渲染的目标对齐复玩与点击时长期目标或当前组合发生漂移',
    '#pendingResultCollectionDetailPreparation',
    '#clearContinuationPreparationAfterExplicitExit()',
    'homeContinuationPreparationSource: continuationPreparation.source',
    'Arena结果页目标准备与当前长期目标的模式、武器或地图发生漂移',
    'sourceKind: receipt.source',
    'projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1({',
  ]) {
    if (!threeModeLocalPlayableHost.includes(marker)) {
      throw new Error(`P6离线留存Host缺少成功后提交序号标记${marker}。`);
    }
  }
  const collectionSelectionStart = threeModeLocalPlayableHost.indexOf(
    '  getInformationCurrentScreenSelectionProjection(',
  );
  const collectionSelectionEnd = threeModeLocalPlayableHost.indexOf(
    '\n  getSnapshot(): unknown',
    collectionSelectionStart,
  );
  if (collectionSelectionStart < 0 || collectionSelectionEnd < 0) {
    throw new Error('P6收藏选择页单快照治理边界缺少可定位源码区间。');
  }
  const collectionSelectionBranch = threeModeLocalPlayableHost.slice(
    collectionSelectionStart,
    collectionSelectionEnd,
  );
  if ((collectionSelectionBranch.match(
    /this\.#informationPageProjectionsFromModeSessionState\(/gu,
  )?.length ?? 0) !== 1) {
    throw new Error('P6收藏选择页必须精确读取一次整页Profile快照。');
  }
  if (!collectionSelectionBranch.includes('information.modeSessionState')
    || collectionSelectionBranch.includes('this.getInformationPageProjections(value)')) {
    throw new Error('P6收藏选择页必须复用外层Information的modeSessionState。');
  }
  if (collectionSelectionBranch.includes('this.getInformationCollectionRead()')) {
    throw new Error('P6收藏选择页不得在整页Profile快照外再次读取收藏聚合快照。');
  }
  if (collectionSelectionBranch.includes('this.getInformationLearningProfileRead()')) {
    throw new Error('P6收藏选择页不得在聚合快照外再次读取Profile。');
  }
  if (collectionSelectionBranch.includes('this.#activeRegistryBinding()')) {
    throw new Error('P6收藏选择页不得在已冻结Profile读取后再次读取active Registry。');
  }
  const resultRecommendationStart = threeModeLocalPlayableHost.indexOf(
    '  getInformationResultPrimaryRecommendation():',
  );
  const resultRecommendationEnd = threeModeLocalPlayableHost.indexOf(
    '\n  #createRetentionObservation(',
    resultRecommendationStart,
  );
  if (resultRecommendationStart < 0 || resultRecommendationEnd < 0) {
    throw new Error('P6结果推荐冻结武器范围缺少可定位源码区间。');
  }
  const resultRecommendationBranch = threeModeLocalPlayableHost.slice(
    resultRecommendationStart,
    resultRecommendationEnd,
  );
  if (!resultRecommendationBranch.includes('routeFit.eligibleWeaponDefinitionIds')) {
    throw new Error('P6结果推荐必须消费Route Fit冻结的武器范围。');
  }
  if (resultRecommendationBranch.includes('this.#activeRegistryBinding()')) {
    throw new Error('P6结果推荐不得在Route Fit形成后再次读取active Registry。');
  }
  const homeContinuationNavigationStart = threeModeLocalPlayableHost.indexOf(
    '  #resolveHomeNextGoalContinuationNavigationRoute(',
  );
  const homeContinuationNavigationEnd = threeModeLocalPlayableHost.indexOf(
    '\n  #assertRenderedHomeContinuationRouteIdentity(',
    homeContinuationNavigationStart,
  );
  if (homeContinuationNavigationStart < 0 || homeContinuationNavigationEnd < 0) {
    throw new Error('P6首页续玩冻结武器范围缺少可定位源码区间。');
  }
  const homeContinuationNavigation = threeModeLocalPlayableHost.slice(
    homeContinuationNavigationStart,
    homeContinuationNavigationEnd,
  );
  if (!homeContinuationNavigation.includes('eligibleWeaponDefinitionIds.includes(')) {
    throw new Error('P6首页续玩导航必须消费建议读取时冻结的武器范围。');
  }
  if (homeContinuationNavigation.includes('this.#activeRegistryBinding()')) {
    throw new Error('P6首页续玩导航不得在建议读取后再次读取active Registry。');
  }
  const informationPageProjectionStart = threeModeLocalPlayableHost.indexOf(
    '  getInformationPageProjections(',
  );
  const informationPageProjectionEnd = threeModeLocalPlayableHost.indexOf(
    '\n  #informationCurrentScreenCompositionBundle(',
    informationPageProjectionStart,
  );
  if (informationPageProjectionStart < 0 || informationPageProjectionEnd < 0) {
    throw new Error('P6整页Profile单读取缺少可定位源码区间。');
  }
  const informationPageProjection = threeModeLocalPlayableHost.slice(
    informationPageProjectionStart,
    informationPageProjectionEnd,
  );
  if ((informationPageProjection.match(
    /this\.#rewardProfileSnapshotFromCurrentOwner\(\)/gu,
  )?.length ?? 0) !== 1
    || (informationPageProjection.match(
      /this\.#informationLearningProfileReadFromCurrentOwners\(\)/gu,
    )?.length ?? 0) !== 1
    || informationPageProjection.includes('this.#rewardProfileSnapshotForRead()')
    || informationPageProjection.includes('this.getInformationLearningProfileRead()')) {
    throw new Error('P6整页投影必须精确读取一次Reward Profile和一次Learning Profile包。');
  }
  for (const forbidden of [
    'this.getInformationModeContentProjection()',
    'this.getInformationProfileProjections(value)',
    'this.getInformationProductSessionProjection()',
    'this.getInformationLoadingProjection()',
  ]) {
    if (informationPageProjection.includes(forbidden)) {
      throw new Error(`P6整页投影不得通过${forbidden}重复读取Profile。`);
    }
  }
  if (!informationPageProjection.includes(
    'this.#projectInformationProductSessionFromCurrentRead()',
  ) || !informationPageProjection.includes(
    'this.#projectInformationLoadingFromCurrentRead()',
  )) {
    throw new Error('P6整页投影必须复用无嵌套Host守卫的Product Session与Loading投影。');
  }
  const informationCompositionStart = informationPageProjectionEnd;
  const informationCompositionEnd = threeModeLocalPlayableHost.indexOf(
    '\n  getInformationCurrentScreenComposition(',
    informationCompositionStart,
  );
  const informationComposition = threeModeLocalPlayableHost.slice(
    informationCompositionStart,
    informationCompositionEnd,
  );
  if (!informationComposition.includes('pages.profileReads.learning.profile')) {
    throw new Error('P6页面字段组合必须复用整页冻结的Learning Profile。');
  }
  if (informationComposition.includes('this.#learningProfileSnapshotForRead()')) {
    throw new Error('P6页面字段组合不得在整页投影后再次读取Learning Profile。');
  }
  const informationPipelineStart = threeModeLocalPlayableHost.indexOf(
    '  getInformationCurrentScreenPipelineBundle(',
  );
  const informationPipelineEnd = threeModeLocalPlayableHost.indexOf(
    '\n  getInformationCurrentDetailBrowseProjection(',
    informationPipelineStart,
  );
  const informationPipeline = threeModeLocalPlayableHost.slice(
    informationPipelineStart,
    informationPipelineEnd,
  );
  if (!informationPipeline.includes('const selection = compositionBundle.selection;')) {
    throw new Error('P6页面Pipeline必须复用字段组合阶段冻结的选择投影。');
  }
  if (informationPipeline.includes('this.getInformationCurrentScreenSelectionProjection(value)')) {
    throw new Error('P6页面Pipeline不得在字段组合后再次读取选择投影。');
  }
  for (const marker of [
    'const returnScreenId = compositionBundle.returnScreenId;',
    'compositionBundle.detailBrowseProjection',
  ]) {
    if (!informationPipeline.includes(marker)) {
      throw new Error(`P6详情Pipeline缺少同批次读取${marker}。`);
    }
  }
  for (const forbidden of [
    'this.getInformationCurrentDetailBrowseProjection()',
    'this.#readHost().getInformationSnapshot()',
  ]) {
    if (informationPipeline.includes(forbidden)) {
      throw new Error(`P6详情Pipeline不得通过${forbidden}重读导航或Registry。`);
    }
  }
  const profileServicesOwner = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-profile-services-owner-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'class ArenaV2ProfileServicesOwnerConstructionCleanupFailureCandidateV1',
    'cleanupProfileServicesConstructionResourcesCandidateV1',
    'resources.learningProfileService === null',
    'resources.rewardProfileService === null',
    'retryCleanup(): void',
    'constructionCleanupRetainsRetryableProfileOwners: true',
    'constructionCleanupRetriesOnlyIncompleteOwners: true',
    '#operation: ProfileServicesOwnerOperationCandidateV1 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('reward-service-read'",
    "this.#runOperation('learning-service-read'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('destroy'",
    "this.#assertReentryFree(sequence, 'Reward Profile读取')",
    "this.#assertReentryFree(sequence, 'Learning Profile读取')",
    "this.#assertReentryFree(sequence, 'Learning Profile清理')",
    "this.#assertReentryFree(sequence, 'Reward Profile清理')",
    'operationGuardPrecedesPublicStateChecks: true',
    'profileReadsCheckedBeforeCrossChildProgress: true',
    'swallowedCleanupReentryRetainsAllUnprocessedOwners: true',
    'successfulCleanupWatermarkPrecedesReentryRejection: true',
    'publicReadsRejectOperationIntermediateState: true',
  ]) {
    if (!profileServicesOwner.includes(marker)) {
      throw new Error(`P6 Profile Services Owner缺少可重试构造清理标记${marker}。`);
    }
  }
  const resultContinuationReceipt = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-result-home-continuation-receipt-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "new Set(['schemaVersion', 'fieldSource', 'sourceKind', 'receiptKind'])",
    "acceptedSources: Object.freeze(['home', 'result'] as const)",
    'sourceCopyNeverInferredFromGoalOrSelection: true',
    '上局结算目标回执',
    'neverClaimsGoalCompletion: true',
    'writesAuthorityProfileRewardOrTask: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!resultContinuationReceipt.includes(marker)) {
      throw new Error(`P6结果续玩回执缺少治理标记${marker}。`);
    }
  }
  const resultNewCollectionDetail = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-result-new-collection-detail-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "plan.identity !== 'result-reward'",
    "sourceFacts: Object.freeze([",
    "'learning-settlement.newlyCollectedWeaponDefinitionIds'",
    "'learning-settlement.newlyCollectedMapDefinitionIds'",
    'cloneFrozenData(',
    'preservesLongTermGoalPrimaryAction: true',
    'reusesExistingDetailScreens: true',
    'selectionChangeRequiresExplicitAction: true',
    'startsMatch: false',
    'inputUsesFrozenDataBoundary: true',
    'inputAccessorsExecuted: false',
    'ownsGameplayAuthority: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!resultNewCollectionDetail.includes(marker)) {
      throw new Error(`P6结果页本局新收藏详情缺少治理标记${marker}。`);
    }
  }
  const canonicalIntentComponent = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-canonical-intent-component-v1.ts',
  ), 'utf8');
  for (const marker of [
    'decodeURIComponent(encoded)',
    'encodeURIComponent(decoded)',
    'canonical !== encoded',
    'rejectsMalformedPercentEncoding: true',
    'rejectsNonCanonicalEquivalentEncoding: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!canonicalIntentComponent.includes(marker)) {
      throw new Error(`P6 canonical意图组件缺少治理标记${marker}。`);
    }
  }
  const informationSelectionRenderPlan = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-information-selection-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "cloneFrozenData(value, 'Arena V2 information selection projection')",
    'inputUsesFrozenDataBoundary: true',
    'inputAccessorsExecuted: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!informationSelectionRenderPlan.includes(marker)) {
      throw new Error(`P6信息选择RenderPlan缺少冻结输入治理标记${marker}。`);
    }
  }
  const detailAdjacentBrowseRenderPlan = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-information-detail-adjacent-browse-render-plan-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "cloneFrozenData(value, 'Arena V2 detail browse projection')",
    'function adjacentTargetsFromProjection(',
    'const targets = adjacentTargetsFromProjection(value);',
    'inputUsesFrozenDataBoundary: true',
    'inputAccessorsExecuted: false',
    'renderPlanReusesValidatedProjectionWithoutReparse: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!detailAdjacentBrowseRenderPlan.includes(marker)) {
      throw new Error(`P6相邻详情RenderPlan缺少单次冻结投影标记${marker}。`);
    }
  }
  const characterInformationProjection = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-character-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "'Arena V2 character catalog.entries'",
    'catalogEntriesUseFrozenDataBoundary: true',
    'catalogEntryAccessorsExecuted: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!characterInformationProjection.includes(marker)) {
      throw new Error(`P6六角色信息投影缺少目录冻结标记${marker}。`);
    }
  }
  const uiInteraction = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-ui-interaction-v1.ts',
  ), 'utf8');
  for (const marker of [
    "cloneFrozenData(value, 'Arena V2 UI point')",
    'pointerPointUsesFrozenDataBoundary: true',
    'pointerPointAccessorsExecuted: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!uiInteraction.includes(marker)) {
      throw new Error(`P6 UI指针交互缺少冻结坐标标记${marker}。`);
    }
  }
  const hudFeedbackEffectConsumer = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts',
  ), 'utf8');
  for (const marker of [
    "const OPTION_KEYS = new Set(['audio', 'visual', 'qualityTier'])",
    'visited.size >= 32',
    'constructorOptionsUseDescriptorOnlyDataFields: true',
    'portMethodPrototypeScanDepthLimit: 32',
    'portMethodBindingUsesReflectApply: true',
    'assertTrimmedNonEmptyString(',
    'consumerEpochIdRequiresTrimmedIdentity: true',
    'synchronousLifecycleReentryRejected: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'externalEffectCallbacksCheckedBeforeLaterEffectsOrProjectionWatermark: true',
    'swallowedExternalEffectReentryStopsLaterEffectDispatch: true',
    'cleanupReentryRetainsCurrentAndLaterEffectOwnership: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertOperationCommit('begin-epoch')",
    "this.#assertOperationCommit('consume')",
    "operationLockScope: 'begin-epoch-consume-dispose-with-load-snapshot-rejection'",
    'constructorAccessorsExecuted: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!hudFeedbackEffectConsumer.includes(marker)) {
      throw new Error(`P6 HUD命中反馈Consumer缺少有界构造标记${marker}。`);
    }
  }
  if (hudFeedbackEffectConsumer.includes('#reentryAttempted')) {
    throw new Error('P6 HUD命中反馈Consumer不得保留可重置布尔反调事实。');
  }
  const hudEpochIdentityBoundaryFiles = [
    'packages/arena-product-presentation/src/arena-v2-mode-hud-consumer-epoch-v1.ts',
    'packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts',
    'packages/arena-product-presentation/src/arena-v2-mode-hud-validated-presentation-host-v1.ts',
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
    'src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.ts',
  ];
  const definitionUtils = await readFile(path.join(
    root,
    'packages/arena-contracts/src/definition-utils.ts',
  ), 'utf8');
  for (const marker of [
    'export function assertTrimmedNonEmptyString',
    'result !== result.trim()',
  ]) {
    if (!definitionUtils.includes(marker)) {
      throw new Error(`P6 HUD epoch身份缺少共享规范字符串断言${marker}。`);
    }
  }
  for (const relative of hudEpochIdentityBoundaryFiles) {
    const source = await readFile(path.join(root, relative), 'utf8');
    for (const marker of [
      'assertTrimmedNonEmptyString',
      'consumerEpochIdRequiresTrimmedIdentity: true',
    ]) {
      if (!source.includes(marker)) {
        throw new Error(`P6 HUD epoch身份边界${relative}缺少规范字符串标记${marker}。`);
      }
    }
  }
  const matchSceneReadProjection = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-match-scene-read-projection-candidate-v1.ts',
  ), 'utf8');
  const hudValidatedPresentationHost = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-validated-presentation-host-v1.ts',
  ), 'utf8');
  for (const marker of [
    'requiresExplicitLocalJumpAvailabilityAtSceneProjection: true',
    'readonly localJumpAvailability: ArenaLocalJumpAvailabilityV1',
  ]) {
    if (!matchSceneReadProjection.includes(marker)) {
      throw new Error(`P6.405 Scene能力末端闭合缺少${marker}。`);
    }
  }
  for (const marker of [
    'requiresExplicitLocalJumpAvailabilityAtProjectionBoundary: true',
    'preservesMovementAndJumpCapabilityIdentity: true',
    'getLocalJumpAvailability(): ArenaLocalJumpAvailabilityV1',
  ]) {
    if (!hudValidatedPresentationHost.includes(marker)) {
      throw new Error(`P6.405 HUD能力末端闭合缺少${marker}。`);
    }
  }
  for (const marker of [
    'weaponFeedbackDirectionFactsV2: projection.weaponFeedbackDirectionFactsV2',
    'forwardsValidatedWeaponFeedbackDirectionFactsV2: true',
    'rejectsWeaponFeedbackAtSpecializedEpochBaseline: true',
  ]) {
    if (!hudValidatedPresentationHost.includes(marker)) {
      throw new Error(`P6.408-P6.409二十武器命中末端边界缺少${marker}。`);
    }
  }
  if (matchSceneReadProjection.includes('readonly localJumpAvailability?:')
    || hudValidatedPresentationHost.includes('ArenaLocalJumpAvailabilityV1 | undefined')) {
    throw new Error('P6.405不得在正式Scene/HUD末端重新引入Movement/Jump可选事实。');
  }
  const threeConceptInputContract = await readFile(path.join(
    root,
    'packages/arena-product-content/src/arena-v2-three-concept-input-contract-candidate-v1.ts',
  ), 'utf8');
  const threeConceptControlBinding = await readFile(path.join(
    root,
    'packages/arena-presentation-runtime/src/arena-v2-simple-three-concept-control-binding.ts',
  ), 'utf8');
  const threeConceptControlCopy = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-control-learning-copy-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'characterCount: 6 as const',
    'weaponCount: 20 as const',
    'weaponActionCount: 40 as const',
    'mapCount: 2 as const',
    'mapSegmentCount: MAP_SEGMENT_COUNT',
    'contextAddsButtons: false as const',
    'crouchEnabled: false as const',
    'blockEnabled: false as const',
    'dashEnabled: false as const',
    'slamEnabled: false as const',
  ]) {
    if (!threeConceptInputContract.includes(marker)) {
      throw new Error(`P6.412完整操作范围合同缺少${marker}。`);
    }
  }
  for (const marker of [
    'ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1',
    'ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1',
    'WASD/方向键移动',
    '空格跳跃',
    'J/E攻击',
    '方向盘移动',
    '跳跃键',
    '攻击键',
  ]) {
    if (!threeConceptControlBinding.includes(marker)) {
      throw new Error(`P6.412共享平台操作映射缺少${marker}。`);
    }
  }
  for (const marker of [
    'platformControlText',
    'platformControlAccessibilityText',
    'coveredCharacterCount:',
    'coveredWeaponCount:',
    'coveredMapCount:',
    'coveredMapSegmentCount:',
    'addsInputConcepts: false as const',
    'defaultSurfaceWired: false as const',
  ]) {
    if (!threeConceptControlCopy.includes(marker)) {
      throw new Error(`P6.412三分钟上手文案缺少${marker}。`);
    }
  }
  const unarmedDirectionPresentation = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-unarmed-feedback-direction-presentation-candidate-v1.ts',
  ), 'utf8');
  const unarmedFeedbackHudHost = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
  ), 'utf8');
  const unarmedFormalVfx = await readFile(path.join(
    root,
    'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'exactUnarmedActionIdentityRequired: true',
    'exactFeedbackFactIdentityRequired: true',
    'reusesGenericCueAndAuthoredBudget: true',
    'addsTextureAudioOrParticleBudget: false',
  ]) {
    if (!unarmedDirectionPresentation.includes(marker)) {
      throw new Error(`P6.413徒手权威方向投影缺少${marker}。`);
    }
  }
  for (const marker of [
    'presentPassthroughDirectional',
    'strengthAdjustedAudioCommand(command, directionFact)',
    'unarmedDirectionAndImpactStrengthPreserved: true',
    'unarmedAudioStrengthUsesExistingCueAndBus: true',
  ]) {
    if (!unarmedFeedbackHudHost.includes(marker)) {
      throw new Error(`P6.413徒手反馈Host缺少${marker}。`);
    }
  }
  for (const marker of [
    'projectArenaV2UnarmedFeedbackDirectionPresentationCandidateV1',
    'presentPassthroughDirectional(value: unknown)',
    'unarmedPassthroughConsumesAuthorityDirectionFactsV2: true',
    'unarmedPassthroughReusesGenericCueAndAssetBudget: true',
  ]) {
    if (!unarmedFormalVfx.includes(marker)) {
      throw new Error(`P6.413正式徒手音画末端缺少${marker}。`);
    }
  }
  for (const marker of [
    'const priority = command.priority >= strength.presentation.minimumAudioPriority',
    'const gainDb = command.gainDb >= strength.presentation.minimumAudioGainDb',
    'impactStrengthAudioPriorityAndGainFloorsIndependent: true',
  ]) {
    if (!unarmedFeedbackHudHost.includes(marker)) {
      throw new Error(`P6.414命中力度音频独立下限缺少${marker}。`);
    }
  }
  const hudPresentationHost = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-mode-hud-presentation-host-v1.ts',
  ), 'utf8');
  for (const marker of [
    "type PresentationHostOperation = 'begin-epoch' | 'consume' | 'dispose'",
    'synchronousLifecycleReentryRejected: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossChildProgressOrHostCommit: true',
    'swallowedChildCleanupReentryRetainsCurrentAndLaterOwners: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertOperationCommit('begin-epoch')",
    "this.#assertOperationCommit('consume')",
    "operationLockScope: 'begin-epoch-consume-dispose-with-snapshot-rejection'",
  ]) {
    if (!hudPresentationHost.includes(marker)) {
      throw new Error(`P6 HUD组合Host缺少同步重入拒绝标记${marker}。`);
    }
  }
  if (hudPresentationHost.includes('#reentryAttempted')) {
    throw new Error('P6 HUD组合Host不得保留可重置布尔反调事实。');
  }
  const twentyWeaponHudHost = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "type TwentyWeaponHudHostOperation = 'begin-epoch' | 'consume' | 'dispose'",
    'synchronousLifecycleReentryRejected: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'innerHostAndExternalEffectCallbacksCheckedBeforeIdentityCommit: true',
    'swallowedExternalEffectReentryStopsIdentityDeletionAndQueuePruning: true',
    'swallowedInnerHostCleanupReentryRetainsInnerHostOwnership: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#assertOperationCommit('begin-epoch')",
    "this.#assertOperationCommit('consume')",
    "operationLockScope: 'begin-epoch-consume-dispose-with-snapshot-rejection'",
  ]) {
    if (!twentyWeaponHudHost.includes(marker)) {
      throw new Error(`P6二十武器HUD Host缺少同步重入拒绝标记${marker}。`);
    }
  }
  if (twentyWeaponHudHost.includes('#reentryAttempted')) {
    throw new Error('P6二十武器HUD Host不得保留可重置布尔反调事实。');
  }
  const twentyWeaponFeedbackVfxPort = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: string | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'downstreamCallbacksCheckedBeforeActiveIdentityCommit: true',
    'swallowedDownstreamClearReentryRetainsIdentityAndStopsDispose: true',
    'downstreamOwnershipReleasedOnlyAfterConfirmedDispose: true',
    'this.#assertOperationCommit(operation)',
  ]) {
    if (!twentyWeaponFeedbackVfxPort.includes(marker)) {
      throw new Error(`P6二十武器反馈VFX端口缺少序号化提交标记${marker}。`);
    }
  }
  if (twentyWeaponFeedbackVfxPort.includes('#reentryAttempted')) {
    throw new Error('P6二十武器反馈VFX端口不得保留可重置布尔反调事实。');
  }
  const formalHudCanvas = await readFile(path.join(
    root,
    'src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'function exactDataFields(',
    'const fields = exactDataFields(value, OPTION_KEYS',
    'const fields = exactDataFields(value, VIEWPORT_KEYS',
    'const fields = exactDataFields(value, PROJECTION_KEYS',
    'externalDataFieldsCapturedOnceByDescriptor: true',
    'externalDataFieldOrdinaryReadsAfterValidation: false',
    "type HudCanvasOperation = 'load' | 'render' | 'clear' | 'dispose'",
    'synchronousLifecycleReentryRejected: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'platformCallbacksCheckedBeforeRenderAndLifecycleWatermarks: true',
    'renderProjectionAndPaintCallbacksCheckedBeforeSnapshotPublication: true',
    'cleanupReentryRetainsCurrentOwnerAndStopsLaterResources: true',
    'this.#assertOperationCommit(operation)',
    "operationLockScope: 'load-render-clear-dispose-with-pause-resume-rejection'",
    'loadFailureTransitionsToFailedBeforeOperationRelease: true',
    'loadFailureRetainsRetryableDisposeOwnership: true',
    'clearFailureTransitionsToFailedBeforeOperationRelease: true',
    'clearFailureRetainsRetryableDisposeOwnership: true',
    'failedStateAllowsDisposeOnly: true',
  ]) {
    if (!formalHudCanvas.includes(marker)) {
      throw new Error(`P6正式HUD Canvas缺少单次数据字段捕获标记${marker}。`);
    }
  }
  if (formalHudCanvas.includes('#reentryAttempted')) {
    throw new Error('P6正式HUD Canvas不得保留可重置布尔反调事实。');
  }
  const p6Runner = await readFile(path.join(root, 'scripts/run-arena-p6-candidate-tests.ts'), 'utf8');
  if (!p6Runner.includes('p5-formal-hud-canvas-ready-announcement-candidate-v1.test.ts')) {
    throw new Error('P6集中runner缺少正式HUD Canvas边界测试源码。');
  }
  if (!p6Runner.includes('arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.test.ts')) {
    throw new Error('P6集中runner缺少二十武器HUD Host边界测试源码。');
  }
  if (!p6Runner.includes('arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts')) {
    throw new Error('P6集中runner缺少三模式可玩宿主边界测试源码。');
  }
  for (const marker of [
    'for (const weaponDefinitionId of definition.weaponDefinitionIds)',
    'if (!profile.collections.weaponDefinitionIds.includes(weaponDefinitionId)) continue;',
    "goalId: `weapon-context:${weaponDefinitionId}:${focus.context}`",
  ]) {
    if (!nextLearningGoal.includes(marker)) {
      throw new Error(`P6武器情境目标缺少正式Definition顺序标记${marker}。`);
    }
  }
  const learningInformation = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts',
  ), 'utf8');
  for (const marker of [
    'export function orderArenaV2NewCollectionDefinitionIdsV1(',
    'weaponDefinitionIds: Object.freeze(definition.weaponDefinitionIds.filter(',
    '.filter((mapDefinitionId) => mapIdentities.has(mapDefinitionId))',
    'weaponIdentities.size > 1',
    "Object.getOwnPropertyDescriptor(value, 'length')",
    "const expectedKeys = new Set<PropertyKey>(['length']);",
    'Object.getOwnPropertyDescriptor(value, key)',
    'Reflect.ownKeys(value).some((key) => !expectedKeys.has(key))',
    'const ordered = orderArenaV2NewCollectionDefinitionIdsV1(',
  ]) {
    if (!learningInformation.includes(marker)) {
      throw new Error(`P6本局新收藏文本缺少正式Definition顺序标记${marker}。`);
    }
  }
  for (const marker of [
    'orderArenaV2NewCollectionDefinitionIdsV1,',
    'const ordered = orderArenaV2NewCollectionDefinitionIdsV1(',
    '...ordered.weaponDefinitionIds',
    '...ordered.mapDefinitionIds',
  ]) {
    if (!threeModeLocalPlayableHost.includes(marker)) {
      throw new Error(`P6本局新收藏详情动作缺少共享正式顺序标记${marker}。`);
    }
  }
  const retentionObservationJournal = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-offline-retention-observation-journal-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'legacySixMetricEnvelopeMigratesInMemory: true',
    'legacySevenMetricEnvelopeMigratesInMemory: true',
    'legacyPayloadHashVerifiedBeforeMigration: true',
    'deterministicOfflineExportBundleSupported: true',
    'exportIncludesRawReplayOrInputTrajectory: false',
    'exportPerformsNetworkUpload: false',
    '#operation: OfflineRetentionObservationJournalOperationCandidateV1 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('open'",
    "this.#runOperation('collector-read'",
    "this.#runOperation('collect'",
    "this.#runOperation('collect-batch'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('export-read'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'storageAndLeasePortsCheckedBeforeCrossOwnerProgress: true',
    'durableObservationWatermarkPrecedesReentryRejection: true',
    'pendingCollectIntentFrozenBeforeStorageWrite: true',
    'pendingCollectRetryRequiresExactObservation: true',
    'pendingCollectReconcilesBaseOrIntendedDurableIdentity: true',
    'pendingCollectWatermarkCommitsAfterDurableConfirmation: true',
    'pendingCollectPublicSnapshotAndExportFailClosed: true',
    'destroyPreservesUnresolvedPendingCollectOwnership: true',
    'lastCommittedObservationAcknowledgementRetrySupported: true',
    'lastCommittedAcknowledgementRequiresExactIdentityAndContent: true',
    'lastCommittedAcknowledgementTouchesNoStorageOrLease: true',
    'atomicObservationBatchCollectSupported: true',
    'atomicObservationBatchRevisionAdvancesByObservationCount: true',
    'atomicObservationBatchRetryRequiresExactOrderedContent: true',
    'atomicObservationBatchAcknowledgementRejectsSubBatchOverlap: true',
    'destroyClearsLastCommittedObservationBatch: true',
    'publicReadsRejectOperationIntermediateState: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'destroyWatermarkPrecedesReentryRejection: true',
    'getExportBundle()',
    "status: 'offline-only-export'",
    'sourcePayloadHash: source.payloadHash',
    'Arena V2 offline retention observation export bundle',
    'sourceMetricCount === LEGACY_SIX_KIND_ORDER.length',
    'sourceMetricCount === LEGACY_SEVEN_KIND_ORDER.length',
    'createDeterministicDataHash(\n    payloadForHash',
    '? envelope(normalizedPayload)',
    'KIND_ORDER.slice(expectedOrder.length).map',
    'ARENA_V2_RETENTION_OBSERVATION_KIND_V1.MAP_LEARNING_FOCUS_CONTINUED',
    'ARENA_V2_RETENTION_DENOMINATOR_KEY_V1.MAP_LEARNING_FOCUS_OPPORTUNITY',
    'function observationIdentityHash(',
    '#acknowledgeLastCommittedObservationRetry(',
    'function observationBatchIdentityHash(',
    'function normalizeObservationBatch(',
    '#createPendingCollectBatchIntent(',
    '#acknowledgeLastCommittedObservationBatchRetry(',
    'collectBatch(value: unknown): void',
  ]) {
    if (!retentionObservationJournal.includes(marker)) {
      throw new Error(`P6离线留存Journal缺少治理合同标记${marker}。`);
    }
  }
  const informationNavigationSession = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-information-navigation-session-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ArenaV2InformationNavigationOperationV1 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('start'",
    "this.#runOperation('loading-ready'",
    "this.#runOperation('open-declared-link'",
    "this.#runOperation('open-bottom-navigation'",
    "this.#runOperation('dispatch-primary-intent'",
    "this.#runOperation('complete-match'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'registryCallbacksCheckedBeforeNavigationCommit: true',
    'publicSnapshotRejectsOperationIntermediateState: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'inputAccessorsRejectedBeforeExecution: true',
    'revisionOverflowRejectedBeforeCommit: true',
  ]) {
    if (!informationNavigationSession.includes(marker)) {
      throw new Error(`P6十一页导航Session缺少原子提交标记${marker}。`);
    }
  }
  const arenaRuleEngine = await readFile(path.join(
    root,
    'packages/arena-core/src/arena-rule-engine.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ArenaRuleEngineOperation | null',
    '#operationSequence: number',
    '#reentrySequence: number',
    '#reentryError: Error | null',
    "this.#runOperation('commit'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicCallsRejectCommitIntermediateState: true',
    'mutationPortsCheckedAfterEveryCallback: true',
    'swallowedPortReentryStopsLaterMutationPorts: true',
    'authorityCommitChecksStickyReentryFact: true',
    'postCommitReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#useMutationPortChecked(operationSequence, 'recordHit端口'",
    "this.#useMutationPortChecked(operationSequence, 'applyHitstun端口'",
    "this.#useMutationPortChecked(operationSequence, 'applyImpulse端口'",
    "this.#assertAuthorityCommitReady(operationSequence, '提交输入验证')",
    "this.#assertAuthorityCommitReady(operationSequence, '命中权威提交后', true)",
    "this.#assertAuthorityCommitReady(operationSequence, '规则命令提交后', true)",
    "validationStatus: 'not-run'",
  ]) {
    if (!arenaRuleEngine.includes(marker)) {
      throw new Error(`P6 ArenaRuleEngine缺少权威提交或端口重入标记${marker}。`);
    }
  }
  if (arenaRuleEngine.includes('#committing')) {
    throw new Error('P6 ArenaRuleEngine不得保留即时committing布尔锁。');
  }
  const arenaMapSystem = await readFile(path.join(
    root,
    'packages/arena-map/src/arena-map-system.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ArenaMapSystemOperation | null = null',
    '#operationSequence = 0',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('advance'",
    "this.#runOperation('commit'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('state-snapshot-read'",
    "this.#runOperation('content-hash-read'",
    "this.#runOperation('surface-enabled-read'",
    "this.#runOperation('position-on-surface-read'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'strategyCallbacksCheckedBeforeRuntimeCommit: true',
    'mutationPortsCheckedAfterEveryCallback: true',
    'swallowedCallbackReentryStopsLaterAuthorityMutation: true',
    'publicReadsRejectAdvanceAndCommitIntermediateState: true',
    'pendingBatchPublicationChecksStickyReentryFact: true',
    'pendingBatchClearChecksStickyReentryFact: true',
    'postCommitReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#assertOperationReady('advance', operationSequence, '待提交批次发布', true)",
    "this.#assertOperationReady('commit', operationSequence, '待提交批次清除', true)",
    "validationStatus: 'not-run'",
  ]) {
    if (!arenaMapSystem.includes(marker)) {
      throw new Error(`P6 ArenaMapSystem缺少策略、端口或地图提交标记${marker}。`);
    }
  }
  if (/#advancing|#committing/u.test(arenaMapSystem)) {
    throw new Error('P6 ArenaMapSystem不得保留即时advancing/committing布尔锁。');
  }
  const equipmentSystem = await readFile(path.join(
    root,
    'packages/arena-equipment/src/equipment-system.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: EquipmentSystemOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runMutation('spawn'",
    "this.#runMutation('supply-timeline'",
    "this.#runMutation('pickup'",
    "this.#runMutation('supply-pickup'",
    "this.#runMutation('action-start'",
    "this.#runMutation('drop-owned'",
    "this.#runMutation('world-equipment-reconcile'",
    "this.#runOperation('checkpoint-export'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'registryResolverAndMapCallbacksCheckedBeforeAuthorityCommit: true',
    'swallowedCallbackReentryRejectsBeforeAuthorityCommit: true',
    'publicReadsRejectAuthorityIntermediateState: true',
    'internalReadsAvoidPublicReentry: true',
    'authorityCommitChecksStickyReentryFact: true',
    'postCommitReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'this.#assertAuthorityCommitReady(',
  ]) {
    if (!equipmentSystem.includes(marker)) {
      throw new Error(`P6 EquipmentSystem缺少回调重入或权威提交标记${marker}。`);
    }
  }
  if (equipmentSystem.includes('#mutating')) {
    throw new Error('P6 EquipmentSystem不得保留仅能即时拒绝的mutating布尔锁。');
  }
  const movementSystem = await readFile(path.join(
    root,
    'packages/arena-movement/src/movement-system.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: MovementSystemOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('prepare-tick'",
    "this.#runOperation('execute'",
    "this.#runOperation('complete-tick'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('checkpoint-export'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'physicalMutationPortCheckedBeforeMovementCommit: true',
    'swallowedPortReentryRejectsBeforeMovementCommit: true',
    'publicReadsRejectMovementIntermediateState: true',
    'internalCapabilityAndSnapshotReadsAvoidPublicReentry: true',
    'movementCommitChecksStickyReentryFact: true',
    'indeterminatePhysicalMutationFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'this.#assertMovementCommitReady(',
  ]) {
    if (!movementSystem.includes(marker)) {
      throw new Error(`P6 MovementSystem缺少物理端口重入或移动权威提交标记${marker}。`);
    }
  }
  if (movementSystem.includes('#mutating')) {
    throw new Error('P6 MovementSystem不得保留仅能即时拒绝的mutating布尔锁。');
  }
  const participantSystem = await readFile(path.join(
    root,
    'packages/arena-match/src/match-participant-system-v2.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: MatchParticipantSystemOperationV2 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('state-read'",
    "this.#runOperation('start'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('apply-transitions'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectParticipantTransactionIntermediateState: true',
    'transitionCommitChecksStickyReentryFact: true',
    'resourceCleanupWatermarkPrecedesReentryRejection: true',
    'swallowedResourceReentryStopsLaterCleanup: true',
    'failedCleanupRetainsUnprocessedResourceOwnership: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    'this.#assertTransitionCommitReady()',
  ]) {
    if (!participantSystem.includes(marker)) {
      throw new Error(`P6 MatchParticipantSystemV2缺少转换或资源清理重入标记${marker}。`);
    }
  }
  if (/#mutating|#destroying|#reentryAttempted/u.test(participantSystem)) {
    throw new Error('P6 MatchParticipantSystemV2不得保留即时布尔锁或非序号反调事实。');
  }
  const raceModeSystem = await readFile(path.join(
    root,
    'packages/arena-match/src/race-mode-system.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: RaceModeSystemOperationV1 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('fixture-content-hash-read'",
    "this.#runOperation('lifecycle-read'",
    "this.#runOperation('start'",
    "this.#runOperation('checkpoint-restore'",
    "this.#runOperation('pause'",
    "this.#runOperation('resume'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('step'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectStepAndRestoreIntermediateState: true',
    'checkpointRestoreValidatesCompleteCandidateBeforeCommit: true',
    'stepCommitChecksStickyReentryFact: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'revisionOverflowRejectedBeforeAuthorityCommit: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#assertAuthorityCommitReady('checkpoint-restore', true)",
    "this.#assertAuthorityCommitReady('step', true)",
    "validationStatus: 'not-run'",
  ]) {
    if (!raceModeSystem.includes(marker)) {
      throw new Error(`P6 RaceModeSystem缺少恢复或step权威提交标记${marker}。`);
    }
  }
  if (/#processing|#reentryAttempted|#assertIdle/u.test(raceModeSystem)) {
    throw new Error('P6 RaceModeSystem不得保留即时布尔锁或旧step反调事实。');
  }
  const productMatchRuntime = await readFile(path.join(
    root,
    'packages/arena-product-match/src/product-match-runtime.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductMatchRuntimeOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('state-read'",
    "this.#runOperation('pause-transition'",
    "this.#runOperation('start-read-frame'",
    "this.#runOperation('read-frame-read'",
    "this.#runOperation('step-read-frame'",
    "this.#runOperation('public-info-read'",
    "this.#runOperation('result-read'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectCallbackIntermediateState: true',
    'sessionCallbacksCheckedBeforeAuthorityCommit: true',
    'completionSinkCheckedBeforeResultPublication: true',
    'swallowedCallbackReentryStopsLaterAuthorityMutation: true',
    'postCallbackReentryFailsClosed: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#assertAuthorityCommitReady('pause-transition', true)",
    "this.#assertAuthorityCommitReady('step-read-frame', true)",
    "this.#assertAuthorityCommitReady('destroy', true)",
    "validationStatus: 'not-run'",
  ]) {
    if (!productMatchRuntime.includes(marker)) {
      throw new Error(`P6 ProductMatchRuntime缺少Session回调或结果提交标记${marker}。`);
    }
  }
  if (productMatchRuntime.includes('#transitioning')) {
    throw new Error('P6 ProductMatchRuntime不得保留即时transitioning布尔锁。');
  }
  const productMatchCoordinator = await readFile(path.join(
    root,
    'packages/arena-product-match/src/product-match-coordinator.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ProductMatchCoordinatorOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('prepare-request'",
    "this.#runOperation('prepare-factory-create'",
    "this.#runOperation('prepare-adopt'",
    "this.#runOperation('prepare-reject'",
    "this.#runOperation('prepare-finalize'",
    "this.#runOperation('pause-transition'",
    "this.#runOperation('start-read-frame'",
    "this.#runOperation('step-read-frame'",
    "this.#runOperation('release'",
    "this.#runOperation('reset-failure'",
    "this.#runOperation('destroy'",
    "this.#runOperation('snapshot-read'",
    'operationGuardPrecedesStateAndInputValidation: true',
    'asyncPrepareOwnsOnlySynchronousCommitSlices: true',
    'factoryAndRuntimeCallbacksCheckedBeforeAuthorityCommit: true',
    'snapshotCallbacksCheckedBeforePublication: true',
    'swallowedCallbackReentryStopsLaterAuthorityMutation: true',
    'cleanupOwnershipRetainedWhenReentryInterruptsRelease: true',
    'postCallbackReentryFailsClosed: true',
    'destroyChecksOperationBeforeCleanupMutation: true',
    "this.#assertAuthorityCommitReady('prepare-adopt', true)",
    "this.#assertAuthorityCommitReady('step-read-frame', true)",
    "this.#assertAuthorityCommitReady('destroy', true)",
    "validationStatus: 'not-run'",
  ]) {
    if (!productMatchCoordinator.includes(marker)) {
      throw new Error(`P6 ProductMatchCoordinator缺少Factory/Runtime提交标记${marker}。`);
    }
  }
  if (productMatchCoordinator.includes('#transitioning')) {
    throw new Error('P6 ProductMatchCoordinator不得保留即时transitioning布尔锁。');
  }
  const quickMatchProductFactory = await readFile(path.join(
    root,
    'packages/arena-product-match/src/quick-match-product-factory.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: QuickMatchProductFactoryOperation | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('create'",
    "this.#runOperation('cleanup-retry'",
    "this.#runOperation('pending-cleanup-read'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'createCandidateCleanupCapturedBeforeReentryRejection: true',
    'swallowedCreateReentryPreventsRuntimePublication: true',
    'cleanupCallbackCheckedBeforeOwnershipRelease: true',
    'publicPendingReadRejectsOperationIntermediateState: true',
    'destroyRetainsServiceOwnershipAcrossReentry: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#assertOperationReady('create')",
    "this.#assertOperationReady('destroy')",
    "validationStatus: 'not-run'",
  ]) {
    if (!quickMatchProductFactory.includes(marker)) {
      throw new Error(`P6 QuickMatchProductFactory缺少创建或清理所有权标记${marker}。`);
    }
  }
  if (/#creating|#destroying|#destroyReentryAttempted/u.test(quickMatchProductFactory)) {
    throw new Error('P6 QuickMatchProductFactory不得保留分裂的创建/销毁布尔锁。');
  }
  const survivalModeSystem = await readFile(path.join(
    root,
    'packages/arena-match/src/survival-mode-system.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: SurvivalModeSystemOperationV1 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('fixture-content-hash-read'",
    "this.#runOperation('lifecycle-read'",
    "this.#runOperation('checkpoint-restore'",
    "this.#runOperation('snapshot-read'",
    "this.#runOperation('equipment-tier-resolve'",
    "this.#runOperation('step'",
    "this.#runOperation('destroy'",
    'operationGuardPrecedesLifecycleAndInputValidation: true',
    'publicReadsRejectTickAndRestoreIntermediateState: true',
    'checkpointRestoreValidatesCompleteCandidateBeforeCommit: true',
    'tickCommitChecksStickyReentryFact: true',
    'internalSnapshotAvoidsPublicReentry: true',
    'revisionOverflowRejectedBeforeAuthorityCommit: true',
    'destroyFastPathChecksOperationBeforeIdempotence: true',
    "this.#assertAuthorityCommitReady('checkpoint-restore', true)",
    "this.#assertAuthorityCommitReady('step', true)",
  ]) {
    if (!survivalModeSystem.includes(marker)) {
      throw new Error(`P6 SurvivalModeSystem缺少恢复或tick权威提交标记${marker}。`);
    }
  }
  if (/#processing|#reentryAttempted|#assertIdle/u.test(survivalModeSystem)) {
    throw new Error('P6 SurvivalModeSystem不得保留即时布尔锁或旧tick反调事实。');
  }
  const survivalWorldAuthority = await readFile(path.join(
    root,
    'packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: SurvivalSharedWorldAuthorityOperationV1 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#beginOperation('prepare-inputs')",
    "this.#beginOperation('step')",
    "this.#beginOperation('restore')",
    "this.#beginOperation('pause')",
    "this.#beginOperation('resume')",
    "this.#beginOperation('destroy')",
    'botAuthorityUsesNamedOperationAndStickyReentrySequence: true',
    'botObservationCallbacksCheckedBeforeEvidenceOrPreparedInputPublication: true',
    'modeResolutionAndBotCheckpointCallbacksCheckedBeforeWorldCommit: true',
    'botPauseResumeCallbacksCheckedBeforeAuthorityLifecycleCommit: true',
    'swallowedBotCleanupReentryRetainsCurrentOwnerAndStopsLaterCleanup: true',
    'publicAuthorityReadsRejectBotOperationIntermediateState: true',
    "this.#assertOperationCommit('prepare-inputs')",
    "this.#assertOperationCommit('step')",
    "this.#assertOperationCommit('pause')",
    "this.#assertOperationCommit('resume')",
    "validationStatus: 'not-run'",
  ]) {
    if (!survivalWorldAuthority.includes(marker)) {
      throw new Error(`P6 Survival正式Bot权威Owner缺少观察、生命周期或清理标记${marker}。`);
    }
  }
  const survivalAuthorityClass = survivalWorldAuthority.slice(
    survivalWorldAuthority.indexOf('export class ArenaSurvivalSharedWorldAuthorityCandidateV1'),
    survivalWorldAuthority.indexOf('\nfunction outsideTarget()'),
  );
  if (survivalAuthorityClass.includes('#transitioning')) {
    throw new Error('P6 Survival正式Bot权威Owner不得保留即时transitioning布尔锁。');
  }
  const modeRewardCommitter = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/mode-reward-committer-v2.ts',
  ), 'utf8');
  for (const marker of [
    '#operation: ModeRewardCommitterOperationV2 | null = null',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    "this.#runOperation('prepare'",
    "this.#runOperation('commit'",
    'operationGuardPrecedesFailureAndInputValidation: true',
    'profileReadPortCheckedBeforeRewardResolution: true',
    'swallowedReadReentryFailsClosedBeforePreparedGrantCommit: true',
    'durableCommitOutcomeWatermarkPrecedesReentryRejection: true',
    'preparedGrantPublicationChecksStickyReentryFact: true',
    'duplicatePublicationChecksStickyReentryFact: true',
    "this.#assertAuthorityCommitReady('prepare')",
    "this.#assertAuthorityCommitReady('commit')",
    "this.#assertReentryFree(commitSequence, 'Profile奖励提交终态发布', true)",
  ]) {
    if (!modeRewardCommitter.includes(marker)) {
      throw new Error(`P6 ModeRewardCommitterV2缺少Profile端口或奖励终态标记${marker}。`);
    }
  }
  if (modeRewardCommitter.includes('#committing')) {
    throw new Error('P6 ModeRewardCommitterV2不得保留即时committing布尔锁。');
  }
  const profilePersistenceDisposition = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-profile-persistence-disposition-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "status: 'production-unreachable'",
    'hardGate: false',
    'defaultCompositionWired: false',
    'defaultEntryWired: false',
    "dispositions: Object.freeze(['retry', 'restart', 'fail-closed'] as const)",
    'maximumCauseDepth: 16',
    'knownErrorsOnly: true',
    'hostileInspectionFailsClosed: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!profilePersistenceDisposition.includes(marker)) {
      throw new Error(`P6 Profile持久化共享处置器缺少${marker}。`);
    }
  }
  const informationModeSessionHost = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-information-mode-session-host-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'assertSynchronousReturn(value, name)',
    'recoverableSettlementEntersReadOnlyResultBeforeRetry: true',
    'recoverableSettlementRetainsModeSessionUntilSettled: true',
    'restartRequiredSettlementRetainsReadOnlyResultForCrossRestartRecovery: true',
    'genericRecoverableFlagsFailClosed: true',
    'pendingSettlementStatusMayUseExistingResultPage: true',
    '#navigationDestroyed = false',
    '#pendingSessionDestroy: PortMethod | null = null',
    '#cleanupComplete(): boolean',
    'this.#pendingSessionDestroy === null',
    'sessionFactoryPortPreflightsBeforeNavigationConstruction: true',
    'cleanupRetriesOnlyIncompleteSessionAndNavigationOwners: true',
    'terminalStateWaitsForSessionAndNavigationOwners: true',
    'returnedSessionDestroyCapturedBeforeBusinessPortTransfer: true',
    'failedPortCaptureRetainsPendingSessionCleanupOwnership: true',
    "status: 'production-unreachable'",
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!informationModeSessionHost.includes(marker)) {
      throw new Error(`P6可恢复结算结果页Host缺少${marker}。`);
    }
  }
  const weaponResearchSelectionProjection = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-weapon-collection-research-selection-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2WeaponCollectionResearchMilestoneV1',
    'projectArenaV2WeaponCollectionResearchSelectionCandidateV1',
    "status: 'production-unreachable'",
    "implementationStatus: 'code-written-not-run'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'defaultSurfaceWired: false',
    'mutatesProfile: false',
    'readsRegistry: false',
    'addsSelectionFields: false',
  ]) {
    if (!weaponResearchSelectionProjection.includes(marker)) {
      throw new Error(`P6武器卡收藏研究可读性投影缺少${marker}。`);
    }
  }
  for (const [label, pattern] of P6_RENDERER_NEUTRAL_FORBIDDEN_PATTERNS) {
    if (pattern.test(weaponResearchSelectionProjection)) {
      throw new Error(`P6武器卡收藏研究可读性投影包含禁止的${label}。`);
    }
  }
  if (P6_PERMANENT_COMBAT_VALUE_PATTERN.test(weaponResearchSelectionProjection)) {
    throw new Error('P6武器卡收藏研究可读性投影不得写入永久战斗数值。');
  }
  const competitiveRepeatableChallengeProjection = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1',
    'ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1',
    'ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.limits.maxCounterValue',
    'ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz',
    "targetScreenId: 'match-prep'",
    "targetOwnerId: 'p5-mode-content'",
    "targetFieldId: TARGET_FIELD_ID",
    "improvementStepPolicy: 'no-formal-step-do-not-invent-exact-tick'",
    'fieldCountAdded: 0',
    'pageCountAdded: 0',
    'actionCountAdded: 0',
    'writesAuthorityProfileRewardOrTask: false',
    'usesWallClockTimerOrAsyncOwner: false',
    'hardGate: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!competitiveRepeatableChallengeProjection.includes(marker)) {
      throw new Error(`P6 Duel/Race重复挑战投影缺少${marker}。`);
    }
  }
  for (const [label, pattern] of P6_RENDERER_NEUTRAL_FORBIDDEN_PATTERNS) {
    if (pattern.test(competitiveRepeatableChallengeProjection)) {
      throw new Error(`P6 Duel/Race重复挑战投影包含禁止的${label}。`);
    }
  }
  if (P6_PERMANENT_COMBAT_VALUE_PATTERN.test(competitiveRepeatableChallengeProjection)) {
    throw new Error('P6 Duel/Race重复挑战投影不得写入永久战斗数值。');
  }
  const p6DeferredRunner = await readFile(path.join(
    root,
    'scripts/run-arena-p6-candidate-tests.ts',
  ), 'utf8');
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少Duel/Race重复挑战投影延期测试。');
  }
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-home-record-summary-information-projection-candidate-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少首页记录总览延期测试。');
  }
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-result-new-collection-detail-render-plan-candidate-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少结果页本局新收藏详情延期测试。');
  }
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-canonical-intent-component-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少canonical意图组件延期测试。');
  }
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-information-selection-action-accessibility-candidate-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少信息选择冻结输入延期测试。');
  }
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-character-information-projection-candidate-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少六角色信息目录冻结延期测试。');
  }
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-ui-surface-candidates-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少UI指针坐标冻结延期测试。');
  }
  if (!p6DeferredRunner.includes(
    "'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts'",
  )) {
    throw new Error('P6集中验证清单缺少HUD命中反馈Consumer构造边界延期测试。');
  }
  const localPlayableSurfaceBinding = await readFile(path.join(
    root,
    'src/entry/arena-v2-information-local-playable-surface-binding-candidate-v1.ts',
  ), 'utf8');
  const nextLearningSignatureProjection = await readFile(path.join(
    root,
    'packages/arena-product-presentation/src/arena-v2-home-next-learning-signature-information-projection-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    "'weaponDefinitionId', 'mapDefinitionId', 'segmentDefinitionId'",
    '下一段：${segmentOrdinal}.${segmentDisplayName}',
    '目标路段是第${segmentOrdinal}段${segmentDisplayName}',
    'exactMapSegmentGoalPrecedesRouteSkeleton: true',
    'maximumVisibleMapSegmentSignatureCount: 1',
  ]) {
    if (!nextLearningSignatureProjection.includes(marker)) {
      throw new Error(`P6.417精确地图路段学习签名缺少${marker}。`);
    }
  }
  for (const marker of [
    'segmentDefinitionId: nextGoal.segmentDefinitionId',
    'segmentDefinitionId: nextLearningGoal.segmentDefinitionId',
    'resultLearningSignaturePreservesExactMapSegmentGoal: true',
  ]) {
    if (!host.includes(marker) && !localPlayableSurfaceBinding.includes(marker)) {
      throw new Error(`P6.417地图路段签名接线缺少${marker}。`);
    }
  }
  const learningPaceCalibration = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-learning-pace-calibration-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz',
    'aggregateArenaV2RetentionObservationsV1(source.observations)',
    'missingAuthorityDurationCount: settled.length - measured.length',
    "status: 'offline-capacity-calibration-candidate'",
    "longitudinalEvidence: 'not-run'",
    "'observed-authority-duration-if-every-match-awards-one-main-research-point'",
    'claimsObservedRetention: false',
    'containsWallClockTime: false',
    'preservesFiveMinuteCapacityAsHypothesis: true',
    'idealizedWeaponCollectionDeltaFromTargetHours',
    'meetsTwoHundredHourIdealizedWeaponCapacity',
    'minimumCollectionEvidencePerWeaponForTargetAtObservedAverage',
    'calculatesThresholdDecisionFactsWithoutMutatingThreshold: true',
    "validationStatus: 'not-run'",
  ]) {
    if (!learningPaceCalibration.includes(marker)) {
      throw new Error(`P6.418权威局时学习节奏校准缺少${marker}。`);
    }
  }
  if (/Date\.now|performance\.now|new Date|setTimeout|setInterval/u.test(
    learningPaceCalibration,
  )) {
    throw new Error('P6.418学习节奏校准不得读取墙钟或创建计时器。');
  }
  const weaponResearchPaceCalibration = await readFile(path.join(
    root,
    'packages/arena-product-progression/src/arena-v2-weapon-research-pace-calibration-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'currentProfile.revision - baselineProfile.revision',
    'createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1',
    'baselineProfileHash',
    'windowIdentityHash',
    '观察与校准窗口主体漂移',
    'settled.length !== revisionSpan',
    'observedWeaponResearchPointCount > settled.length',
    'completeAuthorityDurationWindow',
    'averageAuthorityMinutesPerResearchPoint',
    "'profile-delta-and-complete-authority-window-extrapolation'",
    'reusesExistingEightRetentionMetrics: true',
    'addsRetentionMetric: false',
    'mutatesProfileProgressionOrThreshold: false',
    'completeAuthorityDurationWindowRequiredForProjection: true',
    'baselineProfileAndCohortWindowIdentityRequired: true',
    'rawProfileIdExcludedFromWindow: true',
    'containsWallClockTime: false',
    "validationStatus: 'not-run'",
  ]) {
    if (!weaponResearchPaceCalibration.includes(marker)) {
      throw new Error(`P6.420武器主研究实际节奏校准缺少${marker}。`);
    }
  }
  if (/Date\.now|performance\.now|new Date|setTimeout|setInterval/u.test(
    weaponResearchPaceCalibration,
  )) {
    throw new Error('P6.420武器主研究节奏校准不得读取墙钟或创建计时器。');
  }
  if ((localPlayableSurfaceBinding.match(
    /decodeArenaV2CanonicalIntentComponentV1\(/gu,
  )?.length ?? 0) !== 3
    || localPlayableSurfaceBinding.includes('decodeURIComponent(')) {
    throw new Error('P6选择、相邻详情和结果新收藏意图必须共用canonical解析边界。');
  }
  const resultDispatchStart = host.lastIndexOf(
    '  dispatchPrimaryIntent(value: unknown): unknown {',
  );
  const resultDispatchEnd = host.indexOf(
    '\n  openBottomNavigation(value: unknown): unknown {',
    resultDispatchStart,
  );
  const resultDispatch = host.slice(resultDispatchStart, resultDispatchEnd);
  if (!resultDispatch.includes('const settlement =')
    || !resultDispatch.includes('this.#resultNextGoalRouteFitFromRead(')
    || /getSettlement\(\) !== null[\s\S]*#resultNextGoalRouteFit\(\)/u.test(resultDispatch)) {
    throw new Error('P6结果页下一目标点击必须复用单次Settlement与Learning读取。');
  }
  const hostResultRecommendationStart = host.indexOf(
    '  getInformationResultPrimaryRecommendation():',
  );
  const hostResultRecommendationEnd = host.indexOf(
    '\n  #createRetentionObservation(',
    hostResultRecommendationStart,
  );
  const resultRecommendations = host.slice(
    hostResultRecommendationStart,
    hostResultRecommendationEnd,
  );
  if ((resultRecommendations.match(/const settlement =/gu)?.length ?? 0) !== 2
    || (resultRecommendations.match(/#resultNextGoalRouteFitFromRead\(/gu)?.length ?? 0) !== 2
    || (resultRecommendations.match(
      /#informationLearningProfileReadFromCurrentOwners\(\)/gu,
    )?.length ?? 0) !== 2
    || resultRecommendations.includes('this.getInformationLearningProfileRead()')
    || resultRecommendations.includes('this.#resultNextGoalRouteFit()')) {
    throw new Error('P6公开结果推荐读取不得在Settlement判空后经helper二次读取。');
  }
  const hostInformationPageProjectionStart = host.indexOf(
    '  getInformationPageProjections(',
  );
  const hostInformationPageProjectionEnd = host.indexOf(
    '\n  #informationCurrentScreenCompositionBundle(',
    hostInformationPageProjectionStart,
  );
  const hostInformationPageProjection = host.slice(
    hostInformationPageProjectionStart,
    hostInformationPageProjectionEnd,
  );
  const hostInformationCompositionEnd = host.indexOf(
    '\n  getInformationCurrentScreenComposition(',
    hostInformationPageProjectionEnd,
  );
  const informationPageComposition = host.slice(
    hostInformationPageProjectionEnd,
    hostInformationCompositionEnd,
  );
  if ((hostInformationPageProjection.match(/getSnapshot\(\)/gu)?.length ?? 0) !== 1
    || hostInformationPageProjection.includes('getSettlement()')
    || !hostInformationPageProjection.includes('learningSettlement,')
    || !hostInformationPageProjection.includes('learningSettlementRecovery,')
    || !informationPageComposition.includes(
      'const settledLearning = pages.profileReads.learningSettlement',
    )
    || !informationPageComposition.includes(
      'const settlementRecovery = pages.profileReads.learningSettlementRecovery',
    )
    || !informationPageComposition.includes(
      'this.#informationPageProjectionsFromModeSessionState(',
    )
    || !informationPageComposition.includes('information.modeSessionState')
    || informationPageComposition.includes('this.getInformationPageProjections(value)')
    || informationPageComposition.includes(
      'learningSettlementRecoveryOwner.getSettlement',
    )) {
    throw new Error('P6结果正文与推荐必须复用Page Projection单次Learning Settlement读取。');
  }
  const modeContentProjectionStart = host.indexOf(
    '  #projectInformationModeContentFromProfileReads(',
  );
  const modeContentProjectionEnd = host.indexOf(
    '\n  getInformationLoadingProjection():',
    modeContentProjectionStart,
  );
  const modeContentProjection = host.slice(
    modeContentProjectionStart,
    modeContentProjectionEnd,
  );
  if (!modeContentProjection.includes(
    'this.#continuationPreparationReadFromLearningRead(',
  ) || !modeContentProjection.includes('learningRead,')
    || !modeContentProjection.includes('learningSettlement,')
    || modeContentProjection.includes('this.#continuationPreparationRead()')) {
    throw new Error('P6模式准备状态必须复用Page Learning与Settlement读取包。');
  }
  const continuationGoalDriftStart = host.indexOf(
    '  #continuationPreparationGoalDriftedFromCurrentOwners(): boolean {',
  );
  const continuationGoalDriftEnd = host.indexOf(
    '\n  #clearContinuationPreparationIfGoalDrifted(): void {',
    continuationGoalDriftStart,
  );
  const continuationGoalDrift = host.slice(
    continuationGoalDriftStart,
    continuationGoalDriftEnd,
  );
  if ((continuationGoalDrift.match(
    /#informationLearningProfileReadFromCurrentOwners\(\)/gu,
  )?.length ?? 0) !== 1
    || continuationGoalDrift.includes('getInformationLearningProfileRead()')
    || (continuationGoalDrift.match(/getSettlement\(\)/gu)?.length ?? 0) !== 1
    || !continuationGoalDrift.includes('accepted === null && detail === null')) {
    throw new Error('P6准备目标漂移检查必须复用单次Learning与Settlement读取。');
  }
  const navigationSelectionReadStart = host.indexOf(
    '  getInformationNavigationSelectionRead(',
  );
  const interactionGateReadStart = host.indexOf(
    '  getInformationInteractionGateRead(',
  );
  const interactionGateRead = host.slice(
    interactionGateReadStart,
    navigationSelectionReadStart,
  );
  if ((interactionGateRead.match(/getInformationSnapshot\(\)/gu)?.length ?? 0) !== 1
    || (interactionGateRead.match(/getRead\(\)/gu)?.length ?? 0) !== 1
    || !interactionGateRead.includes('information.modeSessionState')) {
    throw new Error('P6交互门禁必须聚合单次Information与Recovery读取。');
  }
  const settlementRecoveryRetryStart = host.indexOf(
    '  retryLearningSettlementProjectionRecovery():',
  );
  const settlementRecoveryRetryEnd = host.indexOf(
    '\n  updatePreferences(value: unknown): void',
    settlementRecoveryRetryStart,
  );
  const settlementRecoveryRetry = host.slice(
    settlementRecoveryRetryStart,
    settlementRecoveryRetryEnd,
  );
  if ((settlementRecoveryRetry.match(/host\.getInformationSnapshot\(\)/gu)?.length ?? 0) !== 1
    || !settlementRecoveryRetry.includes('information.modeSessionState')
    || settlementRecoveryRetry.includes('this.getLearningSettlementRecoveryRead()')) {
    throw new Error('P6结算恢复重试必须复用单次Information Snapshot。');
  }
  const standaloneInformationReads = [
    host.slice(
      host.indexOf('  getInformationCharacterPreviewLoadoutRead():'),
      host.indexOf('\n  #projectInformationLearningFromRead('),
    ),
    host.slice(
      host.indexOf('  getInformationProfileProjection('),
      host.indexOf('\n  getInformationNextLearningGoalRead('),
    ),
    host.slice(
      host.indexOf('  getInformationCollectionRead('),
      host.indexOf('\n  getInformationProfileProjections('),
    ),
    host.slice(
      host.indexOf('  getInformationProfileProjections('),
      host.indexOf('\n  #projectInformationProfileProjectionsFromReads('),
    ),
    host.slice(
      host.indexOf('  getInformationModeContentProjection():'),
      host.indexOf('\n  #projectInformationModeContentFromProfileReads('),
    ),
  ];
  if (standaloneInformationReads.some((read) => (
    read.includes('this.#rewardProfileSnapshotForRead()')
      || read.includes('this.#activeRegistryBinding()')
      || read.includes('this.getInformationLearningProfileRead()')
  ))) {
    throw new Error('P6独立信息投影必须在单一外层守卫后使用内部Profile/Registry读取。');
  }
  const navigationSelectionReadEnd = host.indexOf(
    '\n  getInformationHomeNextGoalContinuationRouteRead(',
    navigationSelectionReadStart,
  );
  const navigationSelectionRead = host.slice(
    navigationSelectionReadStart,
    navigationSelectionReadEnd,
  );
  if (!navigationSelectionRead.includes('selectedModeKind: this.#selectedModeKind')
    || !navigationSelectionRead.includes(
      'selectedWeaponDefinitionId: this.#selectedWeaponDefinitionId',
    )
    || /ProfileProjection|ProfileSnapshot|Registry/u.test(navigationSelectionRead)) {
    throw new Error('P6导航后选择同步必须使用不投影Profile/Registry的窄读取。');
  }
  if (/#learningProfileSnapshotForRead\(\):|#rewardProfileSnapshotForRead\(\):/u.test(host)) {
    throw new Error('P6不得保留无消费者的受保护Profile快照包装器。');
  }
  const weaponSelection = host.slice(
    host.indexOf('  selectInformationWeapon(value: unknown): void {'),
    host.indexOf('\n  selectInformationMap(value: unknown): void {'),
  );
  if (!weaponSelection.includes('#activeRegistryBindingFromCurrentOwner()')
    || weaponSelection.includes('#activeRegistryBinding()')) {
    throw new Error('P6武器选择必须复用可写Host后的Current Owner Registry读取。');
  }
  const detailBrowseStart = host.indexOf(
    '  getInformationCurrentDetailBrowseProjection(',
  );
  const detailBrowseEnd = host.indexOf(
    '\n  #projectInformationCurrentDetailBrowseFromRead(',
    detailBrowseStart,
  );
  const detailBrowse = host.slice(detailBrowseStart, detailBrowseEnd);
  if (!detailBrowse.includes('this.#activeRegistryBindingFromCurrentOwner()')
    || detailBrowse.includes('this.#activeRegistryBinding()')) {
    throw new Error('P6独立详情浏览必须复用外层Host后的Registry读取。');
  }
  const nextGoalReads = [
    host.slice(
      host.indexOf('  getInformationHomeNextGoalContinuationRouteRead('),
      host.indexOf('\n  getMatchInputContext():'),
    ),
    host.slice(
      host.indexOf('  getInformationNextLearningGoalRead('),
      host.indexOf('\n  getInformationLearningProfileRead('),
    ),
  ];
  if (nextGoalReads.some((read) => (
    (read.match(/#informationLearningProfileReadFromCurrentOwners\(\)/gu)?.length ?? 0) !== 1
      || read.includes('#activeRegistryBinding()')
      || read.includes('#learningProfileSnapshotForRead()')
  ))) {
    throw new Error('P6下一目标与首页续玩读取必须复用单一Learning+Registry快照。');
  }
  const bottomNavigationStart = host.indexOf(
    '  openBottomNavigation(value: unknown): unknown {',
    host.indexOf('export class ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1'),
  );
  const bottomNavigationEnd = host.indexOf(
    '\n  selectInformationMode(value: unknown): void {',
    bottomNavigationStart,
  );
  const bottomNavigation = host.slice(bottomNavigationStart, bottomNavigationEnd);
  if ((bottomNavigation.match(/this\.#host\(\)/gu)?.length ?? 0) !== 1
    || !bottomNavigation.includes('const host = this.#host()')
    || !bottomNavigation.includes('host.openBottomNavigation(value)')) {
    throw new Error('P6底部导航必须复用单一可写Host。');
  }
  const primaryIntentStart = host.lastIndexOf(
    '  dispatchPrimaryIntent(value: unknown): unknown {',
  );
  const primaryIntentEnd = host.indexOf(
    '\n  openBottomNavigation(value: unknown): unknown {',
    primaryIntentStart,
  );
  const primaryIntent = host.slice(primaryIntentStart, primaryIntentEnd);
  if ((primaryIntent.match(/this\.#host\(\)/gu)?.length ?? 0) !== 1
    || !primaryIntent.includes('const host = this.#host()')
    || !primaryIntent.includes('host.dispatchPrimaryIntent(navigationIntent)')
    || (primaryIntent.match(
    /#informationLearningProfileReadFromCurrentOwners\(\)/gu,
  )?.length ?? 0) !== 1
    || primaryIntent.includes('getInformationLearningProfileRead()')
    || (primaryIntent.match(/getSettlement\(\)/gu)?.length ?? 0) !== 1
    || (primaryIntent.match(/#resultNextGoalRouteFitFromRead\(/gu)?.length ?? 0) !== 1
    || !primaryIntent.includes(
      '#nextLearningGoalContinuationRouteReadFromLearningRead(readClickLearning())',
    )
    || !primaryIntent.includes('#continuationPreparationGoalDriftedFromRead(')
    || primaryIntent.includes('#resultNextGoalRouteFit()')) {
    throw new Error('P6主按钮点击必须复用单次Learning、Settlement与Route Fit读取。');
  }
  const diagnosticSnapshotStart = host.lastIndexOf('  getSnapshot(): unknown {');
  const diagnosticSnapshotEnd = host.indexOf(
    '\n  destroy(): void {',
    diagnosticSnapshotStart,
  );
  const diagnosticSnapshot = host.slice(diagnosticSnapshotStart, diagnosticSnapshotEnd);
  if (!diagnosticSnapshot.includes(
    'this.#informationCurrentScreenCompositionBundleFromInformation({}, information)',
  )
    || !diagnosticSnapshot.includes(
      'informationPageProjections.profileReads.learningSettlementRecovery',
    )
    || (diagnosticSnapshot.match(/this\.#readHost\(\)/gu)?.length ?? 0) !== 1
    || (diagnosticSnapshot.match(/host\.getInformationSnapshot\(\)/gu)?.length ?? 0) !== 1
    || !diagnosticSnapshot.includes('host.getSnapshot()')
    || !diagnosticSnapshot.includes('host.getPreferencesRead()')
    || /getInformationProfileProjection\(|getInformationProfileProjections\(|getInformationCurrentScreenComposition\(|getInformationPageProjections\(|getInformationPresentationPreferencesRead\(|getLearningSettlementRecoveryRead\(|#activeRegistryBinding\(\)/u
      .test(diagnosticSnapshot)) {
    throw new Error('P6诊断快照必须复用Current Screen实际消费的Page读取。');
  }
  for (const marker of [
    'settlementRestartRequiredBlocksSurfaceInteractions: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'hostSurfaceMatchAndObserverCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'attachedMatchDriverStartUsesIndependentGuardedTransition: true',
    'restartRequiredSettlementUsesDistinctSurfaceOutcome: true',
    '#lastRenderedHomeContinuationRoute',
    'expectedHomeContinuationGoalId',
    'homePrimaryActionSynchronizesAcceptedContinuationFromHost: true',
    'navigationSelectionSynchronizesFromSingleNarrowHostRead: true',
    'getInformationNavigationSelectionRead()',
    'homePrimaryClickRevalidatesLastRenderedContinuationIdentity: true',
    'homePrimaryLabelNamesRecommendedExistingMode: true',
    'homePrimaryAccessibilityExplainsSelectionAndConfirmation: true',
    'function homeContinuationPrimaryActionRenderPlan(',
    'homeAcceptedContinuationStillStopsAtModeConfirmation: true',
    'homeSurvivalContinuationPreservesUnarmedMatchStart: true',
    'renderReusesPipelineRecoveryAndNextGoalRead: true',
    'renderReusesPipelineResultRecommendations: true',
    'interactionGateReusesSingleRecoveryRead: true',
    'interactionGateUsesAggregateInformationAndRecoveryRead: true',
    'getInformationInteractionGateRead()',
    'learningSettlementRecovery: recovery',
    'weaponDefinitionId: nextLearningGoal.weaponDefinitionId',
    'resultPrimaryRecommendation,',
    'resultNextGoalRecommendation,',
    "label: `调整为${compactTargets.join('＋')}`",
    '具体调整路线没有实际选择变化',
    '生存仍然空手开局，目标武器',
    '需要在场上遇到后拾取',
    'resultRouteAdjustmentNamesExactChangedModeWeaponAndMap: true',
    'resultRouteAdjustmentStopsAtExistingModeConfirmation: true',
    'resultSurvivalAdjustmentPreservesUnarmedWorldPickupCopy: true',
    'function resultExplicitNextGoalCopy(',
    "label: `确认${compactTargets.join('＋')}`",
    'label: `了解目标武器：${targetWeaponDisplayName}`',
    'label: `了解目标地图：${targetMapDisplayName}`',
    'label: `查看目标武器：${learningSignature.weaponDisplayName}`',
    "label: '返回首页继续'",
    '结果页显式下一目标缺少可达页面',
    'explicitNextGoalNamesExactExistingDestination: true',
    'explicitNextGoalReusesModeWeaponMapAndHomePages: true',
    'explicitNextGoalAddsNoPageOrAction: true',
    'Arena V2首页续玩路由与页面流水线身份发生漂移',
    "? 'settlement-restart-required'",
    ": 'learning-settlement-recovery-deferred'",
  ]) {
    if (!localPlayableSurfaceBinding.includes(marker)) {
      throw new Error(`P6结算恢复Surface语义缺少${marker}。`);
    }
  }
  if (localPlayableSurfaceBinding.includes('#reentryAttempted')) {
    throw new Error('P6本地Surface Binding不得保留可重置布尔反调事实。');
  }
  const surfaceRenderStart = localPlayableSurfaceBinding.indexOf(
    '  #renderCurrent(): ArenaV2UiRenderPlanV1 | null {',
  );
  const surfaceRenderEnd = localPlayableSurfaceBinding.indexOf(
    '\n  #notifySurface(',
    surfaceRenderStart,
  );
  const surfaceRender = localPlayableSurfaceBinding.slice(
    surfaceRenderStart,
    surfaceRenderEnd,
  );
  for (const forbidden of [
    'getLearningSettlementRecoveryRead()',
    'getInformationNextLearningGoalRead()',
    'getInformationResultPrimaryRecommendation()',
    'getInformationResultNextGoalRecommendation()',
  ]) {
    if (surfaceRender.includes(forbidden)) {
      throw new Error(`P6 Surface渲染不得通过${forbidden}脱离Pipeline读取包。`);
    }
  }
  const surfaceIntentStart = localPlayableSurfaceBinding.indexOf(
    '  readonly #handleIntent = (intentValue: unknown): void => {',
  );
  const surfaceIntentEnd = localPlayableSurfaceBinding.indexOf(
    '\n  get state(): ArenaV2InformationLocalPlayableSurfaceBindingStateCandidateV1 {',
    surfaceIntentStart,
  );
  const surfaceIntent = localPlayableSurfaceBinding.slice(surfaceIntentStart, surfaceIntentEnd);
  if ((surfaceIntent.match(/getLearningSettlementRecoveryRead\(\)/gu)?.length ?? 0) !== 2
    || !surfaceIntent.includes('getInformationInteractionGateRead()')
    || !surfaceIntent.includes('const recoveryAtIntentStart =')
    || !surfaceIntent.includes('startsMatch && recoveryAtIntentStart.retryRequired')) {
    throw new Error('P6 Surface一次交互门禁必须复用单次结算恢复读取，仅失败复核可重读。');
  }
  const learningModeSessionBridge = await readFile(path.join(
    root,
    'packages/arena-product-composition/src/arena-v2-learning-mode-session-bridge-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'postIntentIndeterminateProfileWriteRequiresRestart: true',
    'onlyProfilePersistenceErrorsEnterSettlementRecovery: true',
    'nonRecoverableServiceErrorsWithoutIndeterminateCauseFailClosed: true',
    'profileSaveConflictFailsClosed: true',
    'hostileErrorInspectionFailsClosed: true',
    'sharedPersistenceDispositionResolverWired: true',
    'assertSynchronousReturn(value, name)',
    'sharedSynchronousReturnBoundaryWired: true',
    "settlementPersistenceDispositionContract: 'retry-restart-fail-closed'",
    'readonly recoverable = false',
    'readonly restartRequired = true',
    "readonly phase: 'reward-write' | 'post-reward-learning'",
    'cleanupRetriesOnlyIncompleteChildren: true',
    'cleanupFailureRetainsTerminalSettlementEvidence: true',
    'terminalSettlementEvidenceClearsAfterAllChildren: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeBridgeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterBridgeOwners: true',
    'constructorTransfersChildrenOnlyAfterAllPortsCaptured: true',
    'constructionFailureLeavesChildOwnershipWithCaller: true',
    'requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true',
    'if (!this.#learningHandoffDestroyed)',
    'if (!this.#sessionDestroyed)',
    'if (!this.#sessionDestroyed || !this.#learningHandoffDestroyed)',
    "validationStatus: 'not-run'",
  ]) {
    if (!learningModeSessionBridge.includes(marker)) {
      throw new Error(`P6结算重启错误合同缺少${marker}。`);
    }
  }
  if (learningModeSessionBridge.includes('#reentryAttempted')
    || learningModeSessionBridge.includes('#assertReentryFree')) {
    throw new Error('P6 Learning Mode Session Bridge不得保留可重置布尔反调事实。');
  }
  const collectionPreviewComposition = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.composition),
    'utf8',
  );
  for (const marker of [
    "stage: 'A6.16'",
    "status: 'production-unreachable'",
    "validationStatus: 'not-run'",
    'hardGate: false',
    'defaultSurfaceWired: false',
    'addsPages: false',
    'addsActions: false',
    'forwardsActionRevealWithoutOwningLayout: true',
    'createsRaf: false',
    'pollsResources: false',
    'rendererFactory',
    'constructionRollbackRetainsHostAndRendererCleanupOwnership: true',
    'disposalUsesDependencyOrderedCompletionWatermarks: true',
    'orphanRendererDisposeWaitsForScissorDisable: true',
    'underlyingSurfaceWaitsForPreviewResourceCleanup: true',
    'disposeReentrancyRejected: true',
    'this.#rawOrphanRenderer = rawRenderer',
    'this.#previewHostConstructionCleanupDebt = error',
    'const previewResourcesReleased =',
  ]) {
    if (!collectionPreviewComposition.includes(marker)) {
      throw new Error(`A6.16收藏预览Composition缺少${marker}。`);
    }
  }
  if (/requestAnimationFrame|setInterval|requestIdleCallback/u.test(collectionPreviewComposition)) {
    throw new Error('A6.16收藏预览Composition不得新增RAF、轮询或idle循环。');
  }
  const collectionPreviewResourceExecution = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.resourceExecution),
    'utf8',
  );
  for (const marker of [
    'constructionCleanupRetainsRetryableExecutorAndAdapter: true',
    'adapterDestroyWaitsForExecutorDestroyed: true',
    'class ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1',
    "executorResult?.state === 'destroyed' && this.#executor.state === 'destroyed'",
  ]) {
    if (!collectionPreviewResourceExecution.includes(marker)) {
      throw new Error(`A6.11c收藏资源执行组合缺少可重试清理标记${marker}。`);
    }
  }
  const collectionPreviewPageTransaction = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.pageTransaction),
    'utf8',
  );
  for (const marker of [
    'constructionCleanupRetainsRetryableChildOwners: true',
    'constructionCleanupUsesTerminalLeaseReleaseOrder: true',
    'class ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1',
    'cleanupConstructionResources(resources)',
    'this.#mountsFinalizedForDestroy && !this.#plannerDestroyed',
    'this.#plannerDestroyed && !this.#layoutObserverDestroyed',
  ]) {
    if (!collectionPreviewPageTransaction.includes(marker)) {
      throw new Error(`A6.12c收藏页面事务缺少可重试清理标记${marker}。`);
    }
  }
  const collectionPreviewPageSurfaceHost = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.pageSurfaceHost),
    'utf8',
  );
  for (const marker of [
    'constructionCleanupRetainsRetryableChildOwners: true',
    'constructionCleanupReleasesRendererBorrowBeforePageResources: true',
    'terminalCleanupReleasesRendererBorrowBeforePageResources: true',
    'class ArenaV2CollectionPreviewPageSurfaceHostConstructionCleanupFailureCandidateV1',
    'renderConstructionDebt.retryCleanup()',
    'this.#renderDestroyResult?.state === \'destroyed\'',
  ]) {
    if (!collectionPreviewPageSurfaceHost.includes(marker)) {
      throw new Error(`A6.14收藏页面Host缺少可重试清理标记${marker}。`);
    }
  }
  const collectionPreviewRenderSurface = await readFile(
    path.join(root, A6_COLLECTION_PREVIEW_FILES.renderSurface),
    'utf8',
  );
  for (const marker of [
    'rendererDisposeWaitsForScissorDisable: true',
    'constructionCleanupRetainsRetryableRendererDebt: true',
    'class ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1',
    'cleanupConstructionResources(resources)',
    'if (this.#scissorDisabled && !this.#rendererDisposed)',
  ]) {
    if (!collectionPreviewRenderSurface.includes(marker)) {
      throw new Error(`A6.13收藏Renderer缺少依赖清理标记${marker}。`);
    }
  }
  for (const marker of [
    "status: 'production-unreachable'",
    'addsPages: false',
    'addsActions: false',
    "'weapon-index'",
    "'weapon-detail'",
    "'map-index'",
    "'map-detail'",
  ]) {
    if (!collectionPreviewReadInput.includes(marker)) {
      throw new Error(`A6.17收藏Read Input缺少${marker}。`);
    }
  }
  const formalWeb = await readFile(path.join(root, A6_COLLECTION_PREVIEW_FILES.formalWeb), 'utf8');
  const formalWebPointerSurface = await readFile(path.join(
    root,
    'src/entry/arena-v2-formal-web-pointer-surface-candidate-v1.ts',
  ), 'utf8');
  for (const marker of [
    'visualMovementAvailabilityFromAuthorityCanMove: true',
    'visualMovementAvailabilityReadOnly: true',
    'visualMovementBlockedDoesNotDisableInput: true',
    'visualPrimaryGestureHintUsesAuthorityCommitmentChargeLevel: true',
    'primaryActionGestureHint:',
    "requireArenaV2UiPrimaryGestureLabelV1(nextGestureHint)",
    'applyMovementAvailability(',
    'clearMovementAvailability()',
  ]) {
    if (!formalWebPointerSurface.includes(marker)) {
      throw new Error(`P6.403方向盘可用性反馈缺少${marker}。`);
    }
  }
  for (const marker of [
    'projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1(',
    "'localJumpAvailability', 'localParticipantId', 'events', 'result'",
    'state: authority.canMove',
    'this.#pointerSurface.applyMovementAvailability(movementAndJump.movement)',
    'this.#pointerSurface.applyJumpActionAvailability(movementAndJump.jump)',
    "primaryKind === 'selected' || primaryHoldKind === 'selected'",
    'primaryAvailabilityIncludesPressOrHoldAffordance: true',
    "commitment.status === 'charging'",
    'primaryAvailabilityIncludesActiveHoldCommitment: true',
    'primaryGestureHintUsesAuthorityChargeLevel: true',
  ]) {
    if (!formalWeb.includes(marker)) {
      throw new Error(`P6.403正式Web Movement/Jump共享投影缺少${marker}。`);
    }
  }
  if (!/getInformationCurrentScreenBasePipeline\s*\(/u.test(formalWeb)
    || !/authoritativePipeline\s*=\s*localHost!\.getInformationCurrentScreenPipeline\s*\(/u
      .test(formalWeb)
    || !/authoritativeSourceRenderPlan:\s*authoritativePipeline\.renderPlan/u.test(formalWeb)) {
    throw new Error('A6.17必须同时提供base pipeline与Host完整组合RenderPlan证明。');
  }
  if (!/this\.#layoutBridge\.compose\(\{[\s\S]*?authoritativeSourceRenderPlan:[\s\S]*?selectionProjection:[\s\S]*?sourceRenderPlan,[\s\S]*?readSnapshot,/u
    .test(collectionPreviewComposition)) {
    throw new Error('A6.16必须把Host证明与binding收到的sourceRenderPlan共同交给A6.15。');
  }
  for (const marker of [
    'rendererFactory:',
    'width === 390 && height === 844',
    'width === 1440 && height === 900',
    'if (viewport === null) return null',
    '#collectionPreviewVisibilityRequested',
    "decorativeAssetState: 'missing'",
    'canonicalEncodedSelectionAndDetailIntentsRequired: true',
    'informationSelectionUsesFrozenDataBoundary: true',
    'detailAdjacentBrowseUsesSingleFrozenValidatedProjection: true',
    'characterInformationCatalogEntriesUseFrozenDataBoundary: true',
    'pointerPointUsesFrozenDataBoundary: true',
    'hudFeedbackConsumerUsesDescriptorOnlyBoundedConstruction: true',
    'hudFeedbackConsumerMethodBindingAvoidsBindPropertyLookup: true',
    'hudFeedbackConsumerSynchronousLifecycleReentryRejected: true',
    'hudPresentationHostSynchronousLifecycleReentryRejected: true',
    'hudTwentyWeaponFeedbackHostSynchronousLifecycleReentryRejected: true',
    'authoritativePlayableHostSynchronousLifecycleReentryRejected: true',
    'localPlayableHostSynchronousLifecycleReentryRejected: true',
    'formalWebSynchronousLifecycleReentryRejected: true',
    'formalWebSynchronousOperationLockScope:',
    "'load-media-setup-layout-match-settlement-registry-failure-shutdown-dispose'",
    'prepareOperationPublishedBeforeMatchHostPrepare: true',
    'activationOperationPublishedBeforeMatchHostActivation: true',
    'repeatedAsyncRequestsReusePublishedOwner: true',
    'formalWebAudioActivationCommitReentersThroughOperationLock: true',
    'formalWebScheduledSettlementCommitReentersThroughOperationLock: true',
    'formalWebFailureShutdownCommitReentersThroughOperationLock: true',
    'formalWebDisposeFlagReleasedInFinally: true',
    'type FormalWebSynchronousOperation =',
    '#synchronousOperation: FormalWebSynchronousOperation | null = null',
    '#runSynchronousOperation<T>(',
    '#synchronousReentrySequence = 0',
    '#synchronousReentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childDomAndObserverCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'callbackEntrypointsJoinOrCreateGuardedOperation: true',
    'asyncChildOwnersAndSettlementHooksCapturedBeforeReentryCheck: true',
    'runtimeCleanupReentryRetainsCurrentAndLaterOwners: true',
    'childSnapshotsCheckedBeforeAggregateSnapshotPublication: true',
    "return this.#runSynchronousOperation('load'",
    "return this.#runSynchronousOperation('activate-audio'",
    "return this.#runSynchronousOperation('registry-maintenance'",
    "'failure-shutdown'",
    "this.#runSynchronousOperation('dispose'",
    'hudConsumerEpochIdentityRequiresTrimmedNonEmptyString: true',
    'hudCanvasExternalDataFieldsCapturedOnceByDescriptor: true',
    'hudCanvasSynchronousLifecycleReentryRejected: true',
    'hudCanvasLoadFailureRetainsRetryableDisposeOwnership: true',
    'hudCanvasClearFailureRetainsRetryableDisposeOwnership: true',
    'defaultEntryWired: false',
  ]) {
    if (!formalWeb.includes(marker)) throw new Error(`A6.17正式Web候选缺少${marker}。`);
  }
  if (formalWeb.includes('#synchronousReentryAttempted')) {
    throw new Error('正式Web组合不得保留可重置布尔反调事实。');
  }
  const formalWebEntry = await readFile(
    path.join(root, 'src/entry/web-arena-v2-formal-candidate.ts'),
    'utf8',
  );
  for (const marker of [
    'let preparationOperation: Promise<void> | null = null',
    'let activationOperation: Promise<void> | null = null',
    'async function runPreparation(): Promise<void>',
    'async function runActivation(): Promise<void>',
    'function prepare(): Promise<void>',
    'function handleEnter(): Promise<void>',
    'if (preparationOperation !== null) return preparationOperation',
    'if (preparationOperation !== operation) return',
    'preparationSingleFlightPerGeneration: true',
    'preparationOwnerPublishedBeforeRunPreparation: true',
    'preparationFailureRetryWaitsForOperationSettlement: true',
    'activationSingleFlightPerGeneration: true',
    'activationOwnerPublishedBeforeRunActivation: true',
    'repeatedEntryRequestsReusePublishedOwnerBeforeStateGate: true',
    'ownerSettlementCleanupHandlesResolveAndRejectWithoutDetachedFinally: true',
    'failureRetryWaitsForPreparationAndActivationSettlement: true',
    'pageLifecycleInvalidatesStalePreparationOwnership: true',
    'pageLifecycleInvalidatesStaleActivationOwnership: true',
    'let synchronousReentrySequence = 0',
    'let synchronousReentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'compositionAndDomCallbacksCheckedBeforeStateOrOwnerCommit: true',
    'compositionCleanupReentryRetainsCurrentOwner: true',
    'asyncChildOwnersCapturedBeforeGenerationCheckedSettlement: true',
    'bootstrapAndPageLifecycleCallbacksUseEntryOperationGuard: true',
    'disposedStatePublishesAfterListenerAndCompositionCleanup: true',
  ]) {
    if (!formalWebEntry.includes(marker)) {
      throw new Error(`正式Web隔离入口缺少单飞准备标记${marker}。`);
    }
  }
  if (formalWebEntry.includes('synchronousReentryAttempted')) {
    throw new Error('正式Web隔离入口不得保留可重置布尔反调事实。');
  }
  const formalWebMatchHost = await readFile(
    path.join(root, 'src/entry/arena-v2-formal-web-match-host-candidate-v1.ts'),
    'utf8',
  );
  for (const marker of [
    '#pendingContextLoss: unknown = null',
    '#throwPendingContextLoss(): void',
    'this.#pendingContextLoss ??= contextLostError',
    'terminalCleanupCommitsUnderOperationGuard: true',
    'contextLossDuringOperationDefersFailureUntilBeforeSuccessCommit: true',
    'pendingContextLossCannotBeOverwrittenBySuccessState: true',
    'snapshotRejectedDuringOperationCommit: true',
    'prepareOperationPublishedBeforeChildAssetLoad: true',
    'activationOperationPublishedBeforeAudioResume: true',
    'asyncLaunchCommitsGuarded: true',
    'stateAndErrorReadsRejectedDuringOperationCommit: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeStateAndSnapshotCommit: true',
    'preparationChildrenCapturedBeforeNextLaunch: true',
    'cleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'previewOwnerRollbackPrecedesHostFailureCleanup: true',
  ]) {
    if (!formalWebMatchHost.includes(marker)) {
      throw new Error(`正式Web Match Host缺少Context Loss终态标记${marker}。`);
    }
  }
  if (formalWebMatchHost.includes('#reentryAttempted')) {
    throw new Error('正式Web Match Host不得保留可重置布尔反调事实。');
  }
  const formalMatchSurface = await readFile(
    path.join(
      root,
      'packages/arena-product-presentation-three/src/arena-v2-formal-match-surface-candidate-v1.ts',
    ),
    'utf8',
  );
  for (const marker of [
    'disposeCommitsUnderOperationGuard: true',
    'publicReadsRejectedDuringOperationCommit: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'stageCallbacksCheckedBeforeResolutionAndStateCommit: true',
    'stageCleanupReentryRetainsOwnershipForRetry: true',
  ]) {
    if (!formalMatchSurface.includes(marker)) {
      throw new Error(`正式Match Surface缺少终态提交保护标记${marker}。`);
    }
  }
  if (formalMatchSurface.includes('#reentryAttempted')) {
    throw new Error('正式Match Surface不得保留可重置布尔反调事实。');
  }
  const formalThreeStage = await readFile(
    path.join(
      root,
      'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
    ),
    'utf8',
  );
  for (const marker of [
    'terminalDisposeCommitsUnderOperationGuard: true',
    'stateReadRejectedDuringOperationCommit: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'childCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
    'childSnapshotsCheckedBeforeAggregateSnapshotPublication: true',
    'constructorWorldRootRollbackRetainsCleanupFailure: true',
  ]) {
    if (!formalThreeStage.includes(marker)) {
      throw new Error(`正式Three Stage缺少终态提交保护标记${marker}。`);
    }
  }
  if (formalThreeStage.includes('#reentryAttempted')) {
    throw new Error('正式Three Stage不得保留可重置布尔反调事实。');
  }
  const formalThreePreloader = await readFile(
    path.join(
      root,
      'packages/arena-product-presentation-three/src/arena-v2-formal-three-asset-preloader-candidate-v1.ts',
    ),
    'utf8',
  );
  for (const marker of [
    'this.#loadOperation = loadOwner.promise',
    'loadOperationPublishedBeforeLoaderInvocation: true',
    'synchronousLaunchAndCleanupCommitsGuarded: true',
    'publicReadsRejectedDuringSynchronousCommit: true',
  ]) {
    if (!formalThreePreloader.includes(marker)) {
      throw new Error(`正式Three Preloader缺少单飞或提交保护标记${marker}。`);
    }
  }
  const formalThreeCamera = await readFile(
    path.join(
      root,
      'packages/arena-product-presentation-three/src/arena-v2-formal-three-camera-controller-candidate-v1.ts',
    ),
    'utf8',
  );
  for (const marker of [
    '#runSynchronousOperation<T>(operation: string, run: () => T): T',
    'allPublicLifecycleCommitsGuarded: true',
    'publicReadsRejectedDuringOperationCommit: true',
  ]) {
    if (!formalThreeCamera.includes(marker)) {
      throw new Error(`正式Three Camera缺少生命周期提交保护标记${marker}。`);
    }
  }
  const formalThreeVfx = await readFile(
    path.join(root, 'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts'),
    'utf8',
  );
  for (const marker of [
    'this.#loadOperation = loadOwner.promise',
    'loadOperationPublishedBeforeTextureLoaderInvocation: true',
    'allPublicLifecycleCommitsGuarded: true',
    'publicReadsRejectedDuringOperationCommit: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'textureThreeAndImpactCallbacksCheckedBeforeCrossOwnerOrStateCommit: true',
    'terminalCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'syncResolversCheckedBeforeFrameWatermarkCommit: true',
  ]) {
    if (!formalThreeVfx.includes(marker)) {
      throw new Error(`正式Three VFX缺少Owner或生命周期提交保护标记${marker}。`);
    }
  }
  if (formalThreeVfx.includes('#reentryAttempted')) {
    throw new Error('正式Three VFX不得保留可重置布尔反调事实。');
  }
  const formalWebAudio = await readFile(
    path.join(root, 'src/entry/arena-v2-formal-web-audio-port-candidate-v1.ts'),
    'utf8',
  );
  for (const marker of [
    'this.#loadOperation = loadOwner.promise',
    'this.#activationOperation = activationOwner.promise',
    'loadOperationPublishedBeforeFetch: true',
    'activationOperationPublishedBeforeContextResume: true',
    'allPublicLifecycleCommitsGuarded: true',
    'endedVoiceSettlementReentersThroughOperationGuard: true',
    'publicReadsRejectedDuringOperationCommit: true',
    '#reentrySequence = 0',
    '#reentryError: Error | null = null',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'fetchDecodeAndResumeCallsRetainAsyncOwnerBeforeReentryCheck: true',
    'voiceNodeCallbacksCheckedBeforeVoiceOrRecentIdentityCommit: true',
    'voiceBusAndContextCleanupReentryRetainsCurrentOwnerAndStopsLaterOwners: true',
    'contextCloseOwnerCapturedBeforeReentryCheck: true',
    'contextCloseSettlementHooksCapturedBeforeReentryCheck: true',
  ]) {
    if (!formalWebAudio.includes(marker)) {
      throw new Error(`正式Web Audio缺少Owner或生命周期提交保护标记${marker}。`);
    }
  }
  if (formalWebAudio.includes('#reentryAttempted')) {
    throw new Error('正式Web Audio不得保留可重置布尔反调事实。');
  }
  if (/collectionPreviewSurface\.getSnapshot\(\)\.collectionPageVisible/u.test(formalWeb)) {
    throw new Error('A6.17不得绕过A6.16可见性latch猜测旧Canvas可见状态。');
  }
  const immutableApprovalLedgerAssembly = await readFile(
    path.join(
      root,
      'packages/arena-product-presentation-three/src/arena-v2-a3-a6-production-approval-immutable-ledger-assembly-candidate-v1.ts',
    ),
    'utf8',
  );
  for (const marker of [
    'createArenaV2A3A6ProductionApprovalDecisionRecordCandidateV1',
    'createArenaV2A3A6ProductionReviewAcceptedEvidenceSetCandidateV1',
    "productionApprovalStatus: 'approved-decision-assembled-not-published'",
    "publicationStatus: 'immutable-proposal-not-published'",
    'currentLedgerMutated: false',
    'publishesLedger: false',
    'approvedEntriesRemainRuntimeUnusableUntilSeparatePublication: true',
    'defaultFormalBundleConsumes: false',
    'defaultPreloaderConsumes: false',
    'defaultEntryConsumes: false',
  ]) {
    if (!immutableApprovalLedgerAssembly.includes(marker)) {
      throw new Error(`P6.382新不可变批准账本组装缺少关闭门标记${marker}。`);
    }
  }
  if (/writeFile|appendFile|rename\(|copyFile/u.test(immutableApprovalLedgerAssembly)) {
    throw new Error('P6.382新不可变批准账本组装不得执行文件或账本写入。');
  }
  const defaultReachability =
    /information-collection-preview-surface-composition|collection-preview-read-input/u;
  for (const relative of DEFAULT_PRODUCT_ENTRIES) {
    if (defaultReachability.test(await readFile(path.join(root, relative), 'utf8'))) {
      throw new Error(`${relative}不得默认接入A6.16/A6.17收藏预览候选。`);
    }
  }
  console.log(JSON.stringify({
    status: 'passed',
    authorityFileCount: P6_RENDERER_NEUTRAL_AUTHORITY_FILES.length,
    productionRootCount: PRODUCTION_ROOTS.length,
    a6CollectionPreviewCandidateFileCount: Object.keys(A6_COLLECTION_PREVIEW_FILES).length,
  }));
}

const entryPath = process.argv[1] === undefined ? null : path.resolve(process.argv[1]);
if (entryPath !== null && import.meta.url === pathToFileURL(entryPath).href) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
