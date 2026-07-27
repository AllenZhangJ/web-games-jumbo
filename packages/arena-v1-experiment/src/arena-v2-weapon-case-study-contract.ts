import type { ArenaV2WeaponOfficialActionContext } from './arena-v2-weapon-official-evidence.js';
import type { ArenaV2WeaponPublicAxisId } from './arena-v2-weapon-public-axis-contract.js';

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

export function createArenaV2WeaponCaseStudyNumericReview(
  axisId: ArenaV2WeaponPublicAxisId,
  reviewReason: string,
  status: ArenaV2WeaponCaseStudyNumericReview['status'],
): ArenaV2WeaponCaseStudyNumericReview {
  return Object.freeze({ axisId, reviewReason, status });
}
