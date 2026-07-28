import {
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY,
} from './arena-v2-weapon-blood-shadow-hook-blade-case-study.js';
import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
} from './arena-v2-weapon-magic-blood-scythe-case-study.js';
import {
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY,
} from './arena-v2-weapon-true-hades-hook-scythe-case-study.js';
import {
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY,
} from './arena-v2-weapon-white-platinum-dual-guns-case-study.js';
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY,
} from './arena-v2-weapon-phantom-tiger-fist-case-study.js';
import {
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY,
} from './arena-v2-weapon-mammoth-stone-axe-case-study.js';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS,
  type ArenaV2WeaponPublicAxisId,
} from './arena-v2-weapon-public-axis-contract.js';
import {
  ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES,
} from './arena-v2-weapon-launch-research-definition-prototype.js';
import {
  createArenaV2WeaponPhantomTigerFistNumericOverview,
} from './arena-v2-weapon-phantom-tiger-fist-definition-prototype.js';
import {
  createArenaV2WeaponBloodShadowHookBladeNumericOverview,
} from './arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.js';
import {
  createArenaV2WeaponTrueHadesHookScytheNumericOverview,
} from './arena-v2-weapon-true-hades-hook-scythe-definition-prototype.js';
import {
  createArenaV2WeaponMagicBloodScytheNumericOverview,
} from './arena-v2-weapon-magic-blood-scythe-definition-prototype.js';
import {
  createArenaV2WeaponWhitePlatinumDualGunsNumericOverview,
} from './arena-v2-weapon-white-platinum-dual-guns-definition-prototype.js';
import {
  createArenaV2WeaponMammothStoneAxeNumericOverview,
} from './arena-v2-weapon-mammoth-stone-axe-definition-prototype.js';
import {
  createArenaV2WeaponResearchOverviewContexts,
  type ArenaV2WeaponResearchOverviewContext,
} from './arena-v2-weapon-research-overview-prototype.js';
import {
  createArenaV2WeaponCaseStudyLanguageBindings,
  type ArenaV2WeaponCaseStudyLanguageBinding,
} from './arena-v2-weapon-case-study-language.js';
import type { ArenaV2WeaponCaseStudy } from './arena-v2-weapon-case-study-contract.js';

export type ArenaV2WeaponCaseStudyOverviewAxisStatus = 'must-measure' | 'research-only';
export type ArenaV2WeaponCaseStudyNumericReadout = 'not-yet-available' | 'research-projection';

export interface ArenaV2WeaponCaseStudyOverviewAxisAudit {
  readonly axisId: ArenaV2WeaponPublicAxisId;
  readonly label: string;
  readonly status: ArenaV2WeaponCaseStudyOverviewAxisStatus;
  readonly reviewReasons: readonly string[];
  readonly playerMeaning: string;
}

export type ArenaV2WeaponCaseStudyLearningStageId = 'core' | 'context' | 'map';

export interface ArenaV2WeaponCaseStudyLearningAxisFocus {
  readonly axisId: ArenaV2WeaponPublicAxisId;
  readonly label: string;
  readonly status: ArenaV2WeaponCaseStudyOverviewAxisStatus;
}

/**
 * Research-only learning ladder. It describes what to notice next; it does
 * not grant rewards, unlock content or alter authority rules.
 */
export interface ArenaV2WeaponCaseStudyLearningStep {
  readonly id: ArenaV2WeaponCaseStudyLearningStageId;
  readonly title: string;
  readonly sourceMoveId: string;
  readonly input: string;
  readonly context: ArenaV2WeaponCaseStudy['moves'][number]['context'];
  readonly decision: string;
  readonly observe: string;
  readonly failureCost: string;
  readonly numericFocus: readonly ArenaV2WeaponCaseStudyLearningAxisFocus[];
}

export interface ArenaV2WeaponCaseStudyNumericProjection {
  readonly contexts: readonly ArenaV2WeaponResearchOverviewContext[];
  readonly comparisonWeaponIds: readonly string[];
  readonly sourceDefinitionIds: readonly string[];
  readonly numericStatus: 'definition-projected-hypothesis';
}

export interface ArenaV2WeaponCaseStudyOverviewRow {
  readonly referenceId: string;
  readonly referenceName: string;
  readonly sourceUrl: string;
  readonly productionAssetStatus: 'research-only';
  readonly coreVerb: string;
  readonly battleThesis: string;
  readonly contexts: readonly string[];
  readonly requiredPublicAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  /** Includes required axes plus any research-only signal found in a move review. */
  readonly axisAudit: readonly ArenaV2WeaponCaseStudyOverviewAxisAudit[];
  readonly mustMeasureAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly researchOnlyAxisIds: readonly ArenaV2WeaponPublicAxisId[];
  readonly mapSignals: readonly string[];
  readonly counterplay: readonly string[];
  readonly functionLanguage: ArenaV2WeaponCaseStudyLanguageBinding;
  readonly learningPath: readonly ArenaV2WeaponCaseStudyLearningStep[];
  /** Distinguishes a real research Definition projection from a narrative-only case study. */
  readonly numericReadout: ArenaV2WeaponCaseStudyNumericReadout;
  readonly numericProjection: ArenaV2WeaponCaseStudyNumericProjection | null;
  readonly numericReadoutReason: string;
}

export interface ArenaV2WeaponCaseStudyOverview {
  readonly rows: readonly ArenaV2WeaponCaseStudyOverviewRow[];
  readonly allRowsAreResearchOnly: true;
  readonly allRowsBlockUnprojectedNumericValues: true;
}

const CASE_STUDIES: readonly ArenaV2WeaponCaseStudy[] = Object.freeze([
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY,
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY,
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY,
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY,
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY,
]);

const AXIS_DEFINITION_BY_ID = new Map(
  ARENA_V2_WEAPON_PUBLIC_AXIS_DEFINITIONS.map((definition) => [definition.id, definition]),
);
const LANGUAGE_BINDING_BY_REFERENCE_ID = new Map(
  createArenaV2WeaponCaseStudyLanguageBindings().map((binding) => [binding.referenceId, binding]),
);

function unique<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)]);
}

function axisIdsFor(study: ArenaV2WeaponCaseStudy): readonly ArenaV2WeaponPublicAxisId[] {
  return unique([
    ...study.minimumVersion.requiredPublicAxes,
    ...study.moves.flatMap(({ numericReview }) => numericReview.map(({ axisId }) => axisId)),
  ]);
}

function createAxisAudit(
  study: ArenaV2WeaponCaseStudy,
): readonly ArenaV2WeaponCaseStudyOverviewAxisAudit[] {
  return Object.freeze(axisIdsFor(study).map((axisId) => {
    const definition = AXIS_DEFINITION_BY_ID.get(axisId);
    if (!definition) throw new RangeError(`深研案例引用未知公共数值轴：${axisId}`);
    const reviews = study.moves.flatMap(({ numericReview }) => (
      numericReview.filter((review) => review.axisId === axisId)
    ));
    const status: ArenaV2WeaponCaseStudyOverviewAxisStatus = reviews.some((review) => (
      review.status === 'must-measure'
    )) ? 'must-measure' : 'research-only';
    const reviewReasons = unique(reviews.map(({ reviewReason }) => reviewReason));
    return Object.freeze({
      axisId,
      label: definition.label,
      status,
      reviewReasons: reviewReasons.length > 0
        ? reviewReasons
        : Object.freeze(['尚未形成逐动作数值证据，禁止填入玩家数值。']),
      playerMeaning: definition.playerMeaning,
    });
  }));
}

function createLearningAxisFocus(
  move: ArenaV2WeaponCaseStudy['moves'][number],
): readonly ArenaV2WeaponCaseStudyLearningAxisFocus[] {
  return Object.freeze(move.numericReview.map(({ axisId, status }) => {
    const definition = AXIS_DEFINITION_BY_ID.get(axisId);
    if (!definition) throw new RangeError(`学习路径引用未知公共数值轴：${axisId}`);
    return Object.freeze({ axisId, label: definition.label, status });
  }));
}

function createLearningStep(
  id: ArenaV2WeaponCaseStudyLearningStageId,
  title: string,
  move: ArenaV2WeaponCaseStudy['moves'][number],
): ArenaV2WeaponCaseStudyLearningStep {
  return Object.freeze({
    id,
    title,
    sourceMoveId: move.id,
    input: move.input,
    context: move.context,
    decision: move.playerDecision,
    observe: move.designPurpose,
    failureCost: move.failureCost,
    numericFocus: createLearningAxisFocus(move),
  });
}

function createLearningPath(
  study: ArenaV2WeaponCaseStudy,
): readonly ArenaV2WeaponCaseStudyLearningStep[] {
  const firstMove = study.moves[0];
  if (!firstMove) throw new RangeError(`逐件研究案例缺少基础动作：${study.referenceId}`);
  const contextMove = study.moves.find(({ context }) => context !== firstMove.context) ?? firstMove;
  const mapMove = study.moves[study.moves.length - 1] ?? firstMove;
  return Object.freeze([
    createLearningStep('core', '先学核心动作', firstMove),
    createLearningStep('context', '再学上下文转换', contextMove),
    createLearningStep('map', '最后放进地图', mapMove),
  ]);
}

function createLaunchProjection(
  referenceId: string,
): ArenaV2WeaponCaseStudyNumericProjection | null {
  const candidate = ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.find(({ referenceId: id }) => (
    id === referenceId
  ));
  if (!candidate) return null;
  const comparisonProjections = Object.freeze(
    ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ groundStats, aerialStats }) => (
      Object.freeze({ groundStats, aerialStats })
    )),
  );
  return Object.freeze({
    contexts: createArenaV2WeaponResearchOverviewContexts(
      Object.freeze({ groundStats: candidate.groundStats, aerialStats: candidate.aerialStats }),
      comparisonProjections,
    ),
    comparisonWeaponIds: Object.freeze(
      ARENA_V2_WEAPON_LAUNCH_RESEARCH_DEFINITION_PROTOTYPES.map(({ weaponId }) => weaponId),
    ),
    sourceDefinitionIds: Object.freeze([
      candidate.groundActionDefinitionId,
      candidate.aerialActionDefinitionId,
    ]),
    numericStatus: 'definition-projected-hypothesis',
  });
}

function createNumericProjection(
  referenceId: string,
): ArenaV2WeaponCaseStudyNumericProjection | null {
  if (referenceId === 'magic-blood-scythe') {
    const overview = createArenaV2WeaponMagicBloodScytheNumericOverview();
    return Object.freeze({
      contexts: overview.contexts,
      comparisonWeaponIds: overview.comparisonWeaponIds,
      sourceDefinitionIds: Object.freeze([
        'research-magic-blood-scythe-ground',
        'research-magic-blood-scythe-aerial',
      ]),
      numericStatus: 'definition-projected-hypothesis',
    });
  }
  if (referenceId === 'mammoth-stone-axe') {
    const overview = createArenaV2WeaponMammothStoneAxeNumericOverview();
    return Object.freeze({
      contexts: overview.contexts,
      comparisonWeaponIds: overview.comparisonWeaponIds,
      sourceDefinitionIds: Object.freeze([
        'research-mammoth-stone-axe-ground',
        'research-mammoth-stone-axe-aerial',
      ]),
      numericStatus: 'definition-projected-hypothesis',
    });
  }
  if (referenceId === 'phantom-tiger-fist') {
    const overview = createArenaV2WeaponPhantomTigerFistNumericOverview();
    return Object.freeze({
      contexts: overview.contexts,
      comparisonWeaponIds: overview.comparisonWeaponIds,
      sourceDefinitionIds: Object.freeze([
        'research-phantom-tiger-fist-ground',
        'research-phantom-tiger-fist-aerial',
      ]),
      numericStatus: 'definition-projected-hypothesis',
    });
  }
  if (referenceId === 'blood-shadow-hook-blade') {
    const overview = createArenaV2WeaponBloodShadowHookBladeNumericOverview();
    return Object.freeze({
      contexts: overview.contexts,
      comparisonWeaponIds: overview.comparisonWeaponIds,
      sourceDefinitionIds: Object.freeze([
        'research-blood-shadow-hook-blade-ground',
        'research-blood-shadow-hook-blade-aerial',
      ]),
      numericStatus: 'definition-projected-hypothesis',
    });
  }
  if (referenceId === 'true-hades-hook-scythe') {
    const overview = createArenaV2WeaponTrueHadesHookScytheNumericOverview();
    return Object.freeze({
      contexts: overview.contexts,
      comparisonWeaponIds: overview.comparisonWeaponIds,
      sourceDefinitionIds: Object.freeze([
        'research-true-hades-hook-scythe-ground',
        'research-true-hades-hook-scythe-aerial',
      ]),
      numericStatus: 'definition-projected-hypothesis',
    });
  }
  if (referenceId === 'white-platinum-dual-guns') {
    const overview = createArenaV2WeaponWhitePlatinumDualGunsNumericOverview();
    return Object.freeze({
      contexts: overview.contexts,
      comparisonWeaponIds: overview.comparisonWeaponIds,
      sourceDefinitionIds: Object.freeze([
        'research-white-platinum-dual-guns-ground',
        'research-white-platinum-dual-guns-aerial',
      ]),
      numericStatus: 'definition-projected-hypothesis',
    });
  }
  return createLaunchProjection(referenceId);
}

function createRow(study: ArenaV2WeaponCaseStudy): ArenaV2WeaponCaseStudyOverviewRow {
  const axisAudit = createAxisAudit(study);
  const functionLanguage = LANGUAGE_BINDING_BY_REFERENCE_ID.get(study.referenceId);
  if (!functionLanguage) throw new RangeError(`逐件研究案例缺少主战斗语言：${study.referenceId}`);
  const auditedAxisIds = new Set(axisAudit.map(({ axisId }) => axisId));
  for (const axisId of functionLanguage.signatureAxisIds) {
    if (!auditedAxisIds.has(axisId)) {
      throw new RangeError(`逐件研究案例缺少战斗语言公开轴：${study.referenceId}/${axisId}`);
    }
  }
  const numericProjection = createNumericProjection(study.referenceId);
  const numericReadout: ArenaV2WeaponCaseStudyNumericReadout = numericProjection === null
    ? 'not-yet-available'
    : 'research-projection';
  const mustMeasureAxisIds = Object.freeze(
    axisAudit.filter(({ status }) => status === 'must-measure').map(({ axisId }) => axisId),
  );
  const researchOnlyAxisIds = Object.freeze(
    axisAudit.filter(({ status }) => status === 'research-only').map(({ axisId }) => axisId),
  );
  return Object.freeze({
    referenceId: study.referenceId,
    referenceName: study.referenceName,
    sourceUrl: study.sourceUrl,
    productionAssetStatus: study.productionAssetStatus,
    coreVerb: study.minimumVersion.coreVerb,
    battleThesis: study.battleThesis,
    contexts: unique(study.minimumVersion.contexts),
    requiredPublicAxisIds: study.minimumVersion.requiredPublicAxes,
    axisAudit,
    mustMeasureAxisIds,
    researchOnlyAxisIds,
    mapSignals: unique(study.designReasons),
    counterplay: unique(study.moves.map(({ counterplay }) => counterplay)),
    functionLanguage,
    learningPath: createLearningPath(study),
    numericReadout,
    numericProjection,
    numericReadoutReason: numericProjection === null
      ? '当前案例只有研究合同，尚未连接候选 Definition 的权威数值投影；研究推断不能直接展示为玩家数值。'
      : '当前案例已连接研究候选 Definition 的权威数值投影；数值仍是本项目调优假设，不能视为原作数值或生产平衡结论。',
  });
}

export function createArenaV2WeaponCaseStudyOverview(): ArenaV2WeaponCaseStudyOverview {
  const rows = Object.freeze(CASE_STUDIES.map(createRow));
  return Object.freeze({
    rows,
    allRowsAreResearchOnly: true,
    allRowsBlockUnprojectedNumericValues: true,
  });
}
