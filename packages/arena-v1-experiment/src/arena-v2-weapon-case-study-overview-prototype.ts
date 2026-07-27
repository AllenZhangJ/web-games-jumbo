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
import type { ArenaV2WeaponCaseStudy } from './arena-v2-weapon-case-study-contract.js';

export type ArenaV2WeaponCaseStudyOverviewAxisStatus = 'must-measure' | 'research-only';

export interface ArenaV2WeaponCaseStudyOverviewAxisAudit {
  readonly axisId: ArenaV2WeaponPublicAxisId;
  readonly label: string;
  readonly status: ArenaV2WeaponCaseStudyOverviewAxisStatus;
  readonly reviewReasons: readonly string[];
  readonly playerMeaning: string;
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
  /** Prevents this research row from being mistaken for a player-facing numeric row. */
  readonly numericReadout: 'not-yet-available';
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

function createRow(study: ArenaV2WeaponCaseStudy): ArenaV2WeaponCaseStudyOverviewRow {
  const axisAudit = createAxisAudit(study);
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
    numericReadout: 'not-yet-available',
    numericReadoutReason: '当前案例只有研究合同，尚未连接候选 Definition 的权威数值投影；研究推断不能直接展示为玩家数值。',
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
