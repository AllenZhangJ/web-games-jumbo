import {
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2A6ExistingDetailSelectionActionV1,
  createArenaV2A6P5DetailContentEnvelopeV1,
  type ArenaV2A6DetailSelectionV1,
  type ArenaV2A6FormalPreviewAvailabilitySetV1,
  type ArenaV2A6FormalPreviewCatalogV1,
  type ArenaV2CollectionFourScreenIdV1,
} from '@number-strategy-jump/arena-product-presentation-three';
import type {
  ArenaV2InformationFieldSourceV1,
  ArenaV2UiRenderPlanV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
} from '@number-strategy-jump/arena-regression';

export const ARENA_V2_COLLECTION_PREVIEW_READ_INPUT_CANDIDATE_V1 = Object.freeze({
  stage: 'A6.16-read-input' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  ownsProfileWrites: false as const,
  ownsGameplayAuthority: false as const,
  addsPages: false as const,
  addsActions: false as const,
  readsSelectionContentProfileAndWeaponScopeFromOneHostSnapshot: true as const,
  fullCatalogProgressRemainsVisible: true as const,
});

export interface ArenaV2CollectionPreviewReadInputCandidateV1Options {
  readonly host: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1;
  readonly epochId: string;
  readonly tick: number;
  readonly renderPlan: ArenaV2UiRenderPlanV1;
  readonly formalAssetCatalog: ArenaV2A6FormalPreviewCatalogV1;
  readonly availability: ArenaV2A6FormalPreviewAvailabilitySetV1;
  readonly reducedMotion: boolean;
  readonly muted: boolean;
  readonly decorativeAssetState: 'ready' | 'missing';
}

export interface ArenaV2CollectionPreviewReadInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly profileCollectionProgressInput: Readonly<Record<string, unknown>>;
  readonly detail: Readonly<Record<string, unknown>> | null;
  readonly formalAssetCatalog: ArenaV2A6FormalPreviewCatalogV1;
  readonly availability: ArenaV2A6FormalPreviewAvailabilitySetV1;
}

const COLLECTION_SCREENS = new Set<unknown>([
  'weapon-index',
  'map-index',
  'weapon-detail',
  'map-detail',
]);

function nonEmptyText(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name}必须是非空字符串。`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function currentScreen(
  host: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
): ArenaV2CollectionFourScreenIdV1 | null {
  const information = assertPlainRecord(
    host.getInformationSnapshot(),
    'Arena V2 collection preview information snapshot',
  );
  const navigation = assertPlainRecord(
    information.navigation,
    'Arena V2 collection preview information navigation',
  );
  return COLLECTION_SCREENS.has(navigation.currentScreenId)
    ? navigation.currentScreenId as ArenaV2CollectionFourScreenIdV1
    : null;
}

function contentFieldSource(
  host: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const composition = host.getInformationCurrentScreenComposition();
  if (composition === null) throw new Error('Arena V2 collection detail缺少当前页面组合。');
  const candidates = composition.fieldSources.filter(({ ownerId }) => ownerId === 'p5-content');
  if (candidates.length !== 1) {
    throw new Error('Arena V2 collection detail必须恰好复用一个P5详情字段Owner。');
  }
  return candidates[0]!;
}

function detailPackage(
  host: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
  screenId: Extract<ArenaV2CollectionFourScreenIdV1, 'weapon-detail' | 'map-detail'>,
  renderPlan: ArenaV2UiRenderPlanV1,
  collectionContent: Readonly<{ readonly sourceContentHash: string }>,
  selectedWeaponDefinitionId: string | null,
  selectedMapDefinitionId: string | null,
): Readonly<Record<string, unknown>> {
  const kind = screenId === 'weapon-detail' ? 'weapon' as const : 'map' as const;
  const targetDefinitionId = kind === 'weapon'
    ? selectedWeaponDefinitionId
    : selectedMapDefinitionId;
  if (targetDefinitionId === null) {
    throw new Error(`Arena V2 ${screenId}缺少当前选择身份。`);
  }
  const selection: ArenaV2A6DetailSelectionV1 = Object.freeze({
    kind,
    screenId,
    targetDefinitionId,
  });
  const expectedIntentId = kind === 'weapon'
    ? 'use-selected-weapon-next-match' as const
    : 'use-selected-map-next-match' as const;
  const actions = renderPlan.primitives.filter((primitive) => (
    primitive.kind === 'action' && primitive.intentId === expectedIntentId
  ));
  if (actions.length !== 1 || actions[0]!.kind !== 'action') {
    throw new Error(`Arena V2 ${screenId}必须恰好复用一个既有详情选择动作。`);
  }
  const action = actions[0];
  const fields = contentFieldSource(host);
  return Object.freeze({
    selection,
    p5DetailContent: createArenaV2A6P5DetailContentEnvelopeV1({
      selection,
      sourceContentHash: collectionContent.sourceContentHash,
      fieldValues: fields.fieldValues,
    }),
    existingSelectionAction: createArenaV2A6ExistingDetailSelectionActionV1({
      selection,
      intentId: expectedIntentId,
      labelText: action.label,
      accessibilityText: action.accessibilityText,
      enabled: action.enabled,
      disabledReason: action.disabledReason,
    }),
  });
}

export function createArenaV2CollectionPreviewReadInputCandidateV1(
  value: ArenaV2CollectionPreviewReadInputCandidateV1Options,
): ArenaV2CollectionPreviewReadInputCandidateV1 | null {
  if (!(value.host instanceof ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1)) {
    throw new TypeError('Arena V2 collection preview read input需要本地三模式Host。');
  }
  const screenId = currentScreen(value.host);
  if (screenId === null) return null;
  const collectionRead = value.host.getInformationCollectionRead();
  const profileRead = collectionRead.learningProfile;
  const collectionContent = collectionRead.collectionContent;
  const epochId = nonEmptyText(value.epochId, 'Arena V2 collection preview epochId');
  const tick = nonNegativeInteger(value.tick, 'Arena V2 collection preview tick');
  const detail = screenId === 'weapon-detail' || screenId === 'map-detail'
    ? detailPackage(
      value.host,
      screenId,
      value.renderPlan,
      collectionContent,
      collectionRead.selectedWeaponDefinitionId,
      collectionRead.selectedMapDefinitionId,
    )
    : null;
  return Object.freeze({
    schemaVersion: 1 as const,
    screenId,
    profileCollectionProgressInput: Object.freeze({
      schemaVersion: 1 as const,
      epochId,
      tick,
      locale: 'zh-CN',
      sourceState: 'ready' as const,
      collectionContent,
      profileDefinition: profileRead.profileDefinition,
      profile: profileRead.profile,
      eligibleWeaponDefinitionIds: profileRead.eligibleWeaponDefinitionIds,
      diagnosticCode: null,
      observedProfileSchemaVersion: 1,
      reducedMotion: value.reducedMotion,
      muted: value.muted,
      decorativeAssetState: value.decorativeAssetState,
    }),
    detail,
    formalAssetCatalog: value.formalAssetCatalog,
    availability: value.availability,
  });
}
