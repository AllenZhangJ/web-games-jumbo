import type { ArenaV2WeaponOfficialActionContext } from './arena-v2-weapon-official-evidence.js';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';

export interface ArenaV2WeaponCaseStudyNumericReview {
  readonly axisId: ArenaV2WeaponPublicAxisId;
  readonly reviewReason: string;
  readonly status: 'must-measure' | 'research-only';
}

export interface ArenaV2WeaponCaseStudyMove {
  readonly id: string;
  readonly input: string;
  readonly context: ArenaV2WeaponOfficialActionContext;
  /** Paraphrase of the official move description, not an Arena rule. */
  readonly officialFact: string;
  /** Design inference made from the official fact. */
  readonly designPurpose: string;
  readonly playerDecision: string;
  readonly counterplay: string;
  readonly failureCost: string;
  readonly numericReview: readonly ArenaV2WeaponCaseStudyNumericReview[];
  readonly arenaMinimumVersion: string;
}

export interface ArenaV2WeaponCaseStudy {
  readonly referenceId: string;
  readonly referenceName: string;
  readonly sourceUrl: string;
  readonly productionAssetStatus: 'research-only';
  readonly battleThesis: string;
  readonly designReasons: readonly string[];
  readonly moves: readonly ArenaV2WeaponCaseStudyMove[];
  readonly minimumVersion: Readonly<{
    readonly coreVerb: string;
    readonly contexts: readonly ArenaV2WeaponOfficialActionContext[];
    readonly requiredPublicAxes: readonly ArenaV2WeaponPublicAxisId[];
    readonly notToCopy: readonly string[];
  }>;
}

export type ArenaV2WeaponValueChainGateId =
  | 'action-identity'
  | 'commitment'
  | 'spatial-condition'
  | 'hit-consequence'
  | 'failure-cost'
  | 'counterplay-feedback';

export interface ArenaV2WeaponValueChainGateResult {
  readonly gateId: ArenaV2WeaponValueChainGateId;
  readonly status: 'passed' | 'blocked';
  readonly evidence: string;
  readonly missing: readonly string[];
}

export interface ArenaV2WeaponValueChainAudit {
  readonly referenceId: string;
  readonly referenceName: string;
  readonly allGatesPassed: boolean;
  readonly gates: readonly ArenaV2WeaponValueChainGateResult[];
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function createValueChainGate(
  gateId: ArenaV2WeaponValueChainGateId,
  missing: readonly string[],
  evidence: string,
): ArenaV2WeaponValueChainGateResult {
  const frozenMissing = Object.freeze([...missing]);
  return Object.freeze({
    gateId,
    status: frozenMissing.length === 0 ? 'passed' : 'blocked',
    evidence,
    missing: frozenMissing,
  });
}

/**
 * Structural research audit for the six-part weapon value chain. This does
 * not validate balance and does not promote a research case into production.
 */
export function auditArenaV2WeaponValueChain(
  study: ArenaV2WeaponCaseStudy,
): ArenaV2WeaponValueChainAudit {
  const moves = study.moves;
  const moveIds = moves.map(({ id }) => id);
  const commitmentReviews = moves.flatMap(({ numericReview }) => (
    numericReview.filter(({ axisId }) => (
      axisId === ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP
      || axisId === ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY
    ))
  ));
  const hasRequiredAxis = (axisId: ArenaV2WeaponPublicAxisId): boolean => (
    study.minimumVersion.requiredPublicAxes.includes(axisId)
  );

  const actionIdentityMissing: string[] = [];
  if (!hasText(study.referenceId)) actionIdentityMissing.push('referenceId');
  if (!hasText(study.referenceName)) actionIdentityMissing.push('referenceName');
  if (!/^https?:\/\//.test(study.sourceUrl)) actionIdentityMissing.push('sourceUrl');
  if (!hasText(study.battleThesis)) actionIdentityMissing.push('battleThesis');
  if (!hasText(study.minimumVersion.coreVerb)) actionIdentityMissing.push('minimumVersion.coreVerb');
  if (moves.length < 3) actionIdentityMissing.push('至少三个独立动作');
  if (new Set(moveIds).size !== moveIds.length) actionIdentityMissing.push('动作 id 必须唯一');
  if (moves.some(({ id, input, context }) => !hasText(id) || !hasText(input) || !hasText(context))) {
    actionIdentityMissing.push('每个动作必须有 id、输入和上下文');
  }

  const commitmentMissing: string[] = [];
  if (!hasRequiredAxis(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP)
    && !hasRequiredAxis(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY)) {
    commitmentMissing.push('公共数值轴必须声明 startup 或 delay');
  }
  if (!commitmentReviews.some(({ status }) => status === 'must-measure')) {
    commitmentMissing.push('至少一个动作必须将承诺时间列为 must-measure');
  }
  if (moves.some(({ numericReview }) => numericReview.length === 0)) {
    commitmentMissing.push('每个动作必须声明至少一个数值复核项');
  }

  const spatialMissing: string[] = [];
  if (!study.minimumVersion.contexts.includes('ground')) spatialMissing.push('ground 上下文');
  if (study.minimumVersion.contexts.length < 2) spatialMissing.push('至少两种空间/时机上下文');
  if (!hasRequiredAxis(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE)
    && !hasRequiredAxis(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE)) {
    spatialMissing.push('range 或 coverage 公共轴');
  }
  if (study.minimumVersion.contexts.includes('aerial')
    && !hasRequiredAxis(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP)) {
    spatialMissing.push('aerial 案例必须声明 height-gap 上下文轴');
  }

  const hitConsequenceMissing: string[] = [];
  const consequenceReviews = moves.flatMap(({ numericReview }) => numericReview).filter(({ axisId }) => [
    ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT,
    ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
    ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL,
  ].some((consequenceAxisId) => consequenceAxisId === axisId));
  if (!consequenceReviews.some(({ status }) => status === 'must-measure')) {
    hitConsequenceMissing.push('动作复核必须将 impact、vertical、control 至少一项列为 must-measure');
  }
  if (moves.some(({ designPurpose }) => !hasText(designPurpose))) {
    hitConsequenceMissing.push('每个动作必须解释命中后的设计目的');
  }
  if (!hasText(study.minimumVersion.coreVerb) || study.designReasons.length === 0) {
    hitConsequenceMissing.push('必须有核心动词和地图后果理由');
  }

  const failureCostMissing: string[] = [];
  if (moves.some(({ failureCost }) => !hasText(failureCost))) {
    failureCostMissing.push('每个动作必须声明失败成本');
  }
  if (moves.some(({ arenaMinimumVersion }) => !hasText(arenaMinimumVersion))) {
    failureCostMissing.push('每个动作必须声明 Arena 最小实现边界');
  }
  if (!hasRequiredAxis(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY)) {
    failureCostMissing.push('公共数值轴必须包含 recovery');
  }

  const counterplayFeedbackMissing: string[] = [];
  if (moves.some(({ counterplay }) => !hasText(counterplay))) {
    counterplayFeedbackMissing.push('每个动作必须声明可执行反制');
  }
  if (moves.some(({ officialFact }) => !hasText(officialFact))) {
    counterplayFeedbackMissing.push('每个动作必须保留来源事实');
  }
  if (moves.some(({ numericReview }) => numericReview.some(({ reviewReason }) => !hasText(reviewReason)))) {
    counterplayFeedbackMissing.push('每个数值复核项必须说明玩家可读意义');
  }
  if (study.minimumVersion.notToCopy.length === 0) {
    counterplayFeedbackMissing.push('必须声明不迁移的复杂机制');
  }

  const gates = Object.freeze([
    createValueChainGate(
      'action-identity',
      actionIdentityMissing,
      '动作身份、来源和核心战斗动词已进入案例合同。',
    ),
    createValueChainGate(
      'commitment',
      commitmentMissing,
      '承诺时间已通过 startup/delay 公共轴和逐动作复核项表达。',
    ),
    createValueChainGate(
      'spatial-condition',
      spatialMissing,
      '有效空间已通过地面/空中上下文、距离、覆盖和高度差表达。',
    ),
    createValueChainGate(
      'hit-consequence',
      hitConsequenceMissing,
      '命中价值已通过击飞、垂直控制、控制和地图后果表达。',
    ),
    createValueChainGate(
      'failure-cost',
      failureCostMissing,
      '失败成本已进入每个动作的研究和最小实现边界。',
    ),
    createValueChainGate(
      'counterplay-feedback',
      counterplayFeedbackMissing,
      '反制、来源事实和玩家可读复核理由已进入案例合同。',
    ),
  ]);
  return Object.freeze({
    referenceId: study.referenceId,
    referenceName: study.referenceName,
    allGatesPassed: gates.every(({ status }) => status === 'passed'),
    gates,
  });
}

export function createArenaV2WeaponCaseStudyNumericReview(
  axisId: ArenaV2WeaponPublicAxisId,
  reviewReason: string,
  status: ArenaV2WeaponCaseStudyNumericReview['status'],
): ArenaV2WeaponCaseStudyNumericReview {
  return Object.freeze({ axisId, reviewReason, status });
}
