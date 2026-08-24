import type { ProductMessageCatalog } from './product-message-catalog.js';
import type {
  ArenaV2InformationFieldValueV1,
  ArenaV2InformationScreenViewModelV1,
} from './arena-v2-information-screen-view-model-v1.js';

export const ARENA_V2_INFORMATION_SCREEN_RENDER_MODEL_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2BottomNavigationItemIdV1 = 'start' | 'weapons' | 'maps' | 'records';

export interface ArenaV2InformationRenderItemV1 {
  readonly fieldId: string;
  readonly label: string;
  readonly valueText: string;
  readonly accessibilityText: string;
  readonly fixedWidthNumeric: boolean;
}

export interface ArenaV2InformationScreenRenderModelV1 {
  readonly schemaVersion: typeof ARENA_V2_INFORMATION_SCREEN_RENDER_MODEL_V1_SCHEMA_VERSION;
  readonly revision: number;
  readonly locale: string;
  readonly screenId: ArenaV2InformationScreenViewModelV1['screenId'];
  readonly template: ArenaV2InformationScreenViewModelV1['template'];
  readonly state: ArenaV2InformationScreenViewModelV1['state'];
  readonly question: string;
  readonly firstViewItems: readonly ArenaV2InformationRenderItemV1[];
  readonly deferredItems: readonly ArenaV2InformationRenderItemV1[];
  readonly primaryAction: Readonly<{
    readonly intentId: ArenaV2InformationScreenViewModelV1['primaryAction']['intentId'];
    readonly label: string;
    readonly enabled: boolean;
    readonly disabledReason: string | null;
    readonly minimumTouchTargetCssPixels: 48;
  }>;
  readonly navigationTargetIds: ArenaV2InformationScreenViewModelV1['navigationTargetIds'];
  readonly bottomNavigation: readonly Readonly<{
    readonly id: ArenaV2BottomNavigationItemIdV1;
    readonly label: string;
    readonly active: boolean;
  }>[];
  readonly announcement: string;
}

const BOTTOM_NAVIGATION_IDS = Object.freeze([
  'start',
  'weapons',
  'maps',
  'records',
] as const);

function renderItem(
  messages: ProductMessageCatalog,
  field: ArenaV2InformationFieldValueV1,
): ArenaV2InformationRenderItemV1 {
  return Object.freeze({
    fieldId: field.fieldId,
    label: messages.require(field.labelMessageId),
    valueText: field.valueText,
    accessibilityText: field.accessibilityText,
    fixedWidthNumeric: field.fixedWidthNumeric,
  });
}

function activeNavigationId(
  screenId: ArenaV2InformationScreenViewModelV1['screenId'],
): ArenaV2BottomNavigationItemIdV1 {
  if (screenId === 'weapon-index' || screenId === 'weapon-detail') return 'weapons';
  if (screenId === 'map-index' || screenId === 'map-detail') return 'maps';
  if (screenId === 'result-reward') return 'records';
  return 'start';
}

/**
 * Resolves presentation copy only. It deliberately does not add navigation
 * intents, progress, rewards or match facts that are absent from the source
 * ViewModel.
 */
export function resolveArenaV2InformationScreenRenderModelV1(
  viewModel: ArenaV2InformationScreenViewModelV1,
  messages: ProductMessageCatalog,
): ArenaV2InformationScreenRenderModelV1 {
  if (viewModel.schemaVersion !== 1) {
    throw new RangeError('Arena V2页面RenderModel只支持ViewModel schema 1。');
  }
  const activeId = activeNavigationId(viewModel.screenId);
  return Object.freeze({
    schemaVersion: ARENA_V2_INFORMATION_SCREEN_RENDER_MODEL_V1_SCHEMA_VERSION,
    revision: viewModel.revision,
    locale: messages.locale,
    screenId: viewModel.screenId,
    template: viewModel.template,
    state: viewModel.state,
    question: messages.require(viewModel.questionMessageId),
    firstViewItems: Object.freeze(viewModel.firstViewItems.map((field) => (
      renderItem(messages, field)
    ))),
    deferredItems: Object.freeze(viewModel.deferredItems.map((field) => (
      renderItem(messages, field)
    ))),
    primaryAction: Object.freeze({
      intentId: viewModel.primaryAction.intentId,
      label: messages.require(viewModel.primaryAction.labelMessageId),
      enabled: viewModel.primaryAction.enabled,
      disabledReason: viewModel.primaryAction.disabledReasonMessageId === null
        ? null
        : messages.require(viewModel.primaryAction.disabledReasonMessageId),
      minimumTouchTargetCssPixels: viewModel.primaryAction.minimumTouchTargetCssPixels,
    }),
    navigationTargetIds: viewModel.navigationTargetIds,
    bottomNavigation: viewModel.bottomNavigationVisible
      ? Object.freeze(BOTTOM_NAVIGATION_IDS.map((id) => Object.freeze({
        id,
        label: messages.require(`arena.v2.navigation.${id}`),
        active: id === activeId,
      })))
      : Object.freeze([]),
    announcement: messages.require(viewModel.announcementMessageId),
  });
}
