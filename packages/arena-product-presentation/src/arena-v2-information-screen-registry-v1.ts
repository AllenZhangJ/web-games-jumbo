import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_READ_MODEL_KIND_V1 as SOURCE,
  ARENA_V2_INFORMATION_SCREEN_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_INFORMATION_SCREEN_ID_V1 as SCREEN,
  ARENA_V2_INFORMATION_SCREEN_ORDER_V1,
  ARENA_V2_INFORMATION_SCREEN_TEMPLATE_V1 as TEMPLATE,
  ARENA_V2_INFORMATION_UI_INTENT_V1 as INTENT,
  createArenaV2InformationScreenDefinitionV1,
  type ArenaV2InformationScreenDefinitionV1,
  type ArenaV2InformationScreenIdV1,
} from './arena-v2-information-screen-definition-v1.js';

export const ARENA_V2_INFORMATION_SHARED_LAYOUT_V1 = Object.freeze({
  minimumTouchTargetCssPixels: 48 as const,
  narrowBreakpointCssPixels: 760 as const,
  maximumFirstViewItems: 3 as const,
  maximumPrimaryActions: 1 as const,
  usesSafeAreaInsets: true as const,
  fixedWidthNumericFields: true as const,
  bottomNavigationItems: Object.freeze(['start', 'weapons', 'maps', 'records'] as const),
});

function screen(
  id: ArenaV2InformationScreenIdV1,
  ordinal: number,
  value: Omit<ArenaV2InformationScreenDefinitionV1, 'schemaVersion' | 'id' | 'ordinal'>,
) {
  return createArenaV2InformationScreenDefinitionV1({
    schemaVersion: ARENA_V2_INFORMATION_SCREEN_DEFINITION_V1_SCHEMA_VERSION,
    id,
    ordinal,
    ...value,
  });
}

export const ARENA_V2_INFORMATION_SCREEN_DEFINITIONS_CANDIDATE_V1 = Object.freeze([
  screen(SCREEN.LOADING, 1, {
    template: TEMPLATE.LOADING,
    questionMessageId: 'arena.v2.screen.loading.question',
    primaryAction: { intentId: INTENT.RETRY_LOADING, labelMessageId: 'arena.v2.action.retry-loading' },
    firstViewFieldIds: ['asset-progress', 'input-summary', 'recovery-status'],
    deferredFieldIds: ['load-diagnostic'],
    readModelKinds: [SOURCE.PRODUCT_SESSION],
    navigationTargetIds: [SCREEN.HOME],
    bottomNavigationVisible: false,
    announcementMessageId: 'arena.v2.screen.loading.announcement',
  }),
  screen(SCREEN.HOME, 2, {
    template: TEMPLATE.GOAL,
    questionMessageId: 'arena.v2.screen.home.question',
    primaryAction: { intentId: INTENT.OPEN_MODE_SELECT, labelMessageId: 'arena.v2.action.choose-mode' },
    firstViewFieldIds: ['next-goal', 'last-mode', 'quick-start'],
    deferredFieldIds: ['recent-records'],
    readModelKinds: [SOURCE.PRODUCT_SESSION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [SCREEN.MODE_SELECT, SCREEN.WEAPON_INDEX, SCREEN.MAP_INDEX],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.home.announcement',
  }),
  screen(SCREEN.MODE_SELECT, 3, {
    template: TEMPLATE.SELECTION,
    questionMessageId: 'arena.v2.screen.mode-select.question',
    primaryAction: { intentId: INTENT.START_SELECTED_MODE, labelMessageId: 'arena.v2.action.start-selected-mode' },
    firstViewFieldIds: ['mode-objective', 'participant-count', 'character-entry'],
    deferredFieldIds: ['record-type', 'preparation-entry'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [SCREEN.CHARACTER_SELECT, SCREEN.MATCH_PREP, SCREEN.SURVIVAL_PREP],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.mode-select.announcement',
  }),
  screen(SCREEN.CHARACTER_SELECT, 4, {
    template: TEMPLATE.SELECTION,
    questionMessageId: 'arena.v2.screen.character-select.question',
    primaryAction: { intentId: INTENT.SAVE_CHARACTER, labelMessageId: 'arena.v2.action.save-character' },
    firstViewFieldIds: ['selected-character', 'handling-summary', 'movement-difference'],
    deferredFieldIds: ['character-record'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [SCREEN.MODE_SELECT, SCREEN.MATCH_PREP, SCREEN.SURVIVAL_PREP],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.character-select.announcement',
  }),
  screen(SCREEN.MATCH_PREP, 5, {
    template: TEMPLATE.PREPARATION,
    questionMessageId: 'arena.v2.screen.match-prep.question',
    primaryAction: { intentId: INTENT.START_PREPARED_MATCH, labelMessageId: 'arena.v2.action.start-match' },
    firstViewFieldIds: ['mode-goal', 'participant-count', 'map-rule'],
    deferredFieldIds: ['character-entry', 'weapon-entry', 'map-entry', 'weapon-map-plan'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PUBLIC_MATCH_INFO],
    navigationTargetIds: [
      SCREEN.MODE_SELECT,
      SCREEN.CHARACTER_SELECT,
      SCREEN.WEAPON_DETAIL,
      SCREEN.MAP_DETAIL,
    ],
    bottomNavigationVisible: false,
    announcementMessageId: 'arena.v2.screen.match-prep.announcement',
  }),
  screen(SCREEN.SURVIVAL_PREP, 6, {
    template: TEMPLATE.PREPARATION,
    questionMessageId: 'arena.v2.screen.survival-prep.question',
    primaryAction: { intentId: INTENT.START_SURVIVAL, labelMessageId: 'arena.v2.action.start-survival' },
    firstViewFieldIds: ['unarmed-start', 'supply-timing', 'fall-rule'],
    deferredFieldIds: ['pressure-summary', 'best-survival-record'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [
      SCREEN.MODE_SELECT,
      SCREEN.CHARACTER_SELECT,
      SCREEN.WEAPON_INDEX,
      SCREEN.MAP_DETAIL,
    ],
    bottomNavigationVisible: false,
    announcementMessageId: 'arena.v2.screen.survival-prep.announcement',
  }),
  screen(SCREEN.WEAPON_INDEX, 7, {
    template: TEMPLATE.COLLECTION,
    questionMessageId: 'arena.v2.screen.weapon-index.question',
    primaryAction: { intentId: INTENT.OPEN_SELECTED_WEAPON, labelMessageId: 'arena.v2.action.open-weapon' },
    firstViewFieldIds: ['owned-progress', 'next-unowned', 'practice-target'],
    deferredFieldIds: ['all-weapon-records'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [SCREEN.WEAPON_DETAIL, SCREEN.HOME],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.weapon-index.announcement',
  }),
  screen(SCREEN.WEAPON_DETAIL, 8, {
    template: TEMPLATE.DETAIL,
    questionMessageId: 'arena.v2.screen.weapon-detail.question',
    primaryAction: {
      intentId: INTENT.USE_SELECTED_WEAPON_NEXT_MATCH,
      labelMessageId: 'arena.v2.action.use-weapon-next-match',
    },
    firstViewFieldIds: ['range-coverage', 'timing-risk', 'ground-aerial'],
    deferredFieldIds: ['counter-inputs', 'map-consequences', 'weapon-record'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [SCREEN.MODE_SELECT, SCREEN.WEAPON_INDEX, SCREEN.MATCH_PREP],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.weapon-detail.announcement',
  }),
  screen(SCREEN.MAP_INDEX, 9, {
    template: TEMPLATE.COLLECTION,
    questionMessageId: 'arena.v2.screen.map-index.question',
    primaryAction: { intentId: INTENT.OPEN_SELECTED_MAP, labelMessageId: 'arena.v2.action.open-map' },
    firstViewFieldIds: ['segment-progress', 'next-map', 'mode-coverage'],
    deferredFieldIds: ['all-map-records'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [SCREEN.MAP_DETAIL, SCREEN.HOME],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.map-index.announcement',
  }),
  screen(SCREEN.MAP_DETAIL, 10, {
    template: TEMPLATE.DETAIL,
    questionMessageId: 'arena.v2.screen.map-detail.question',
    primaryAction: {
      intentId: INTENT.USE_SELECTED_MAP_NEXT_MATCH,
      labelMessageId: 'arena.v2.action.use-map-next-match',
    },
    firstViewFieldIds: ['route-goal', 'hazard-summary', 'best-record'],
    deferredFieldIds: ['full-route', 'weapon-consequences', 'mode-records'],
    readModelKinds: [SOURCE.CONTENT_DEFINITION, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [
      SCREEN.MODE_SELECT,
      SCREEN.MAP_INDEX,
      SCREEN.MATCH_PREP,
      SCREEN.SURVIVAL_PREP,
    ],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.map-detail.announcement',
  }),
  screen(SCREEN.RESULT_REWARD, 11, {
    template: TEMPLATE.RESULT,
    questionMessageId: 'arena.v2.screen.result-reward.question',
    primaryAction: { intentId: INTENT.PLAY_AGAIN_OR_NEXT, labelMessageId: 'arena.v2.action.play-again-or-next' },
    firstViewFieldIds: ['match-result', 'earned-progress', 'next-goal'],
    deferredFieldIds: ['reward-breakdown', 'full-match-record', 'collection-change'],
    readModelKinds: [SOURCE.PRODUCT_RESULT, SOURCE.PROFILE_SNAPSHOT],
    navigationTargetIds: [
      SCREEN.MODE_SELECT,
      SCREEN.HOME,
      SCREEN.WEAPON_INDEX,
      SCREEN.WEAPON_DETAIL,
      SCREEN.MAP_DETAIL,
    ],
    bottomNavigationVisible: true,
    announcementMessageId: 'arena.v2.screen.result-reward.announcement',
  }),
]);

export class ArenaV2InformationScreenRegistryV1 {
  readonly #definitions: readonly ArenaV2InformationScreenDefinitionV1[];
  readonly #byId: ReadonlyMap<ArenaV2InformationScreenIdV1, ArenaV2InformationScreenDefinitionV1>;

  constructor(definitions: readonly ArenaV2InformationScreenDefinitionV1[]) {
    if (!Array.isArray(definitions) || definitions.length !== ARENA_V2_INFORMATION_SCREEN_ORDER_V1.length) {
      throw new RangeError('ArenaV2InformationScreenRegistryV1必须精确包含11个页面。');
    }
    const normalized = definitions.map((definition, index) => {
      const expectedId = ARENA_V2_INFORMATION_SCREEN_ORDER_V1[index];
      if (definition.id !== expectedId || definition.ordinal !== index + 1) {
        throw new RangeError('ArenaV2InformationScreenRegistryV1页面必须按固定ID和ordinal排列。');
      }
      return createArenaV2InformationScreenDefinitionV1(definition);
    });
    this.#definitions = Object.freeze(normalized);
    this.#byId = new Map(normalized.map((definition) => [definition.id, definition]));
    Object.freeze(this);
  }

  require(id: ArenaV2InformationScreenIdV1): ArenaV2InformationScreenDefinitionV1 {
    const definition = this.#byId.get(id);
    if (!definition) throw new RangeError(`未知Arena V2信息页面${String(id)}。`);
    return definition;
  }

  list(): readonly ArenaV2InformationScreenDefinitionV1[] {
    return this.#definitions;
  }
}

export const ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1 =
  new ArenaV2InformationScreenRegistryV1(ARENA_V2_INFORMATION_SCREEN_DEFINITIONS_CANDIDATE_V1);

const AUTHORITY = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultNavigationWired: false as const,
  pageCount: 11 as const,
  maximumPrimaryClicksFromHomeToStartMatch: 2 as const,
  quickStartIntentPath: Object.freeze([
    INTENT.OPEN_MODE_SELECT,
    INTENT.START_SELECTED_MODE,
  ] as const),
  sharedLayout: ARENA_V2_INFORMATION_SHARED_LAYOUT_V1,
  definitions: ARENA_V2_INFORMATION_SCREEN_DEFINITIONS_CANDIDATE_V1,
});

export const ARENA_V2_INFORMATION_SCREEN_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Information Screen Catalog Candidate V1',
  ),
});
