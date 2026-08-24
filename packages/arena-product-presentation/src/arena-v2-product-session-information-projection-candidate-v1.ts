import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  type DeepReadonly,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  validateProductMatchResultV3,
  type ProductMatchResultV3,
} from '@number-strategy-jump/arena-product-contracts';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';
import {
  projectArenaV2WeaponCoreFightReadV1,
} from './arena-v2-information-content-read-projection-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';
import {
  findArenaV2MapDisplayNameV1,
  arenaV2WeaponDisplayNameV1,
  projectArenaV2RaceResultRouteContinuationCandidateV1,
  projectArenaV2WeaponMapLearningCandidateV1,
} from './arena-v2-weapon-map-learning-projection-candidate-v1.js';

export type ArenaV2ProductSessionInformationModeKindCandidateV1 =
  | 'duel'
  | 'race'
  | 'survival';

export interface ArenaV2ProductSessionInformationProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly selectedModeKind: ArenaV2ProductSessionInformationModeKindCandidateV1 | null;
  readonly hasTerminalResult: boolean;
  readonly screens: readonly Readonly<{
    readonly screenId: 'home' | 'result-reward';
    readonly fieldSource: ArenaV2InformationFieldSourceV1;
  }>[];
}

const OPTION_KEYS = new Set(['selectedModeKind', 'productResult', 'localParticipantId']);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;

export const ARENA_V2_PRODUCT_RESULT_WEAPON_MAP_REVIEW_CONTRACT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  validationStatus: 'not-run' as const,
  resultFieldId: 'full-match-record' as const,
  authorityMapSource: 'product-result-v3.content.selectedMapDefinitionId' as const,
  weaponUsageSource: 'participant-equipment-usage-v3' as const,
  weaponSituationSource: 'weapon-map-learning-projection.mode-consequence' as const,
  mapOpportunitySource: 'weapon-map-learning-projection.current-map-opportunity-counts' as const,
  reviewFocusPolicy: 'lowest-collection-order-among-used-weapons' as const,
  coreFightSource: 'shared-weapon-core-fight-read-projection' as const,
  maximumVisibleCoreFightCount: 1 as const,
  coreFightSelectionUsesReviewFocus: true as const,
  maximumVisibleSituationCount: 2 as const,
  unknownMapPolicy: 'preserve-usage-fact-without-review-guess' as const,
  readsParticipantPosition: false as const,
  infersCurrentSegment: false as const,
  claimsHitCountSuccessOrPerformance: false as const,
  addsPagePopupTaskRewardOrProfileField: false as const,
});

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function elapsedClockText(ticks: number): string {
  if (ticks < 0) throw new RangeError('Arena V2 Product Session展示时间不能为负tick。');
  const totalSeconds = Math.floor(ticks / TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function field(
  fieldId: string,
  valueText: string,
  accessibilityText = valueText,
  fixedWidthNumeric = false,
): ArenaV2InformationFieldValueV1 {
  return Object.freeze({
    fieldId,
    labelMessageId: `arena.v2.field.${fieldId}`,
    valueText,
    accessibilityText,
    fixedWidthNumeric,
  });
}

function source(fieldValues: readonly ArenaV2InformationFieldValueV1[]) {
  return Object.freeze({
    ownerId: 'p5-product-session',
    fieldValues: Object.freeze([...fieldValues]),
  });
}

function modeLabel(mode: ArenaV2ProductSessionInformationModeKindCandidateV1): string {
  if (mode === 'duel') return '常规1v1';
  if (mode === 'race') return '竞速';
  return '生存';
}

function selectedModeKind(
  value: unknown,
): ArenaV2ProductSessionInformationModeKindCandidateV1 | null {
  if (value === null) return null;
  if (!MODE_KINDS.has(value)) {
    throw new RangeError('Arena V2 Product Session selectedModeKind无效。');
  }
  return value as ArenaV2ProductSessionInformationModeKindCandidateV1;
}

function resultContinuationCopy(
  result: DeepReadonly<ModeResultV3Payload>,
  localParticipantId: string,
  mapDefinitionId: string,
): Readonly<{ readonly valueText: string; readonly accessibilityText: string }> {
  if (result.kind === 'duel') {
    if (result.isDraw) {
      return Object.freeze({
        valueText: '再练：稳住落点并完成击落',
        accessibilityText: '下一局先保持安全落点，再寻找一次明确击落。',
      });
    }
    return result.winnerParticipantIds.includes(localParticipantId)
      ? Object.freeze({
        valueText: '再练：同组合争取更快击落',
        accessibilityText: '下一局保留同一组合，争取更快完成击落。',
      })
      : Object.freeze({
        valueText: '再练：先稳住落点再反击',
        accessibilityText: '下一局先稳住自己的落点，再寻找反击机会。',
      });
  }
  if (result.kind === 'race') {
    const local = result.rankings.find(({ participantId }) => participantId === localParticipantId);
    if (local === undefined) throw new RangeError('竞速终局缺少本地玩家排名。');
    if (local.finishTick !== null) {
      return Object.freeze({
        valueText: '再练：同路线争取更快到达',
        accessibilityText: '下一局沿同一条完整路线，争取更快到达终点。',
      });
    }
    const route = projectArenaV2RaceResultRouteContinuationCandidateV1(
      mapDefinitionId,
      local.progressOrdinal,
    );
    if (route === null) {
      return Object.freeze({
        valueText: `已推进${local.progressOrdinal}段 · 再练下一段`,
        accessibilityText:
          `本局权威进度是推进${local.progressOrdinal}段。下一局继续练习下一路段并向终点推进。`,
      });
    }
    if (route.kind === 'finish-gate') {
      return Object.freeze({
        valueText: `已过${route.completedSegmentCount}段 · 再练终点冲刺`,
        accessibilityText:
          `本局已通过${route.mapDisplayName}全部${route.completedSegmentCount}段。下一局练习完成终点冲刺。`,
      });
    }
    return Object.freeze({
      valueText: `再练第${route.segmentOrdinal}段 · ${route.segmentDisplayName}`,
      accessibilityText:
        `下一局先通过${route.mapDisplayName}第${route.segmentOrdinal}段，${route.segmentDisplayName}。`,
    });
  }
  if (result.playerParticipantId !== localParticipantId) {
    throw new RangeError('生存终局playerParticipantId不是本地玩家。');
  }
  return result.reason === 'terminal-player-fall'
    ? Object.freeze({
      valueText: '再练：保住复活并进更高压力档',
      accessibilityText: '下一局利用同一地图地形保住第一次复活，并争取进入更高压力档。',
    })
    : Object.freeze({
      valueText: '再练：保持节奏并刷新坚持时间',
      accessibilityText: '下一局保持当前生存节奏，并继续刷新最长坚持时间。',
    });
}

function resultText(
  result: DeepReadonly<ModeResultV3Payload>,
  localParticipantId: string,
  mapDefinitionId: string,
): Readonly<{ readonly valueText: string; readonly accessibilityText: string }> {
  let terminalText: string;
  if (result.kind === 'duel') {
    terminalText = result.isDraw
      ? `常规1v1 平局 · ${elapsedClockText(result.endedAtTick)}`
      : `${result.winnerParticipantIds.includes(localParticipantId)
        ? '常规1v1 胜利'
        : '常规1v1 失败'} · ${elapsedClockText(result.endedAtTick)}`;
  } else if (result.kind === 'race') {
    const local = result.rankings.find(({ participantId }) => participantId === localParticipantId);
    if (local === undefined) throw new RangeError('竞速终局缺少本地玩家排名。');
    const finish = local.finishTick === null
      ? '未到达终点'
      : `${elapsedClockText(local.finishTick)}到达终点`;
    terminalText = `竞速第${local.rank}名 · ${finish}`;
  } else {
    if (result.playerParticipantId !== localParticipantId) {
      throw new RangeError('生存终局playerParticipantId不是本地玩家。');
    }
    terminalText = `生存${elapsedClockText(result.survivedTicks)} · 压力阶段${
      result.pressureStage
    } · 掉落${result.fallCount}/2`;
  }
  const continuation = resultContinuationCopy(result, localParticipantId, mapDefinitionId);
  return Object.freeze({
    valueText: `${terminalText} · ${continuation.valueText}`,
    accessibilityText: `本局权威结果：${terminalText}。${continuation.accessibilityText}`,
  });
}

function equipmentUsageText(
  result: DeepReadonly<ProductMatchResultV3>,
  localParticipantId: string,
): Readonly<{ readonly valueText: string; readonly accessibilityText: string }> {
  const mapDefinitionId = result.content.selectedMapDefinitionId;
  const mapDisplayName = findArenaV2MapDisplayNameV1(mapDefinitionId);
  const mapText = `本局地图：${mapDisplayName ?? mapDefinitionId}`;
  const usage = result.participantEquipmentUsage.find(
    (entry) => entry.participantId === localParticipantId,
  );
  if (usage === undefined) {
    throw new RangeError('Arena V2 Product Result缺少本地玩家武器使用事实。');
  }
  if (usage.usedCollectionEquipmentDefinitionIds.length === 0) {
    const valueText = `${mapText}；本局未使用收藏武器`;
    return Object.freeze({
      valueText,
      accessibilityText: `本局权威武器使用记录：${valueText}。`,
    });
  }
  const names = usage.usedCollectionEquipmentDefinitionIds.map(
    (equipmentDefinitionId) => arenaV2WeaponDisplayNameV1(equipmentDefinitionId),
  );
  const usageText = `${mapText}；本局使用：${names.join('、')}`;
  const review = projectArenaV2WeaponMapLearningCandidateV1({
    modeKind: result.modeResult.kind,
    weaponDefinitionIds: usage.usedCollectionEquipmentDefinitionIds,
    mapDefinitionId,
    focusPolicy: 'lowest-collection-order',
    unknownMapPolicy: 'return-null',
  });
  if (review === null) {
    return Object.freeze({
      valueText: usageText,
      accessibilityText: `本局权威武器使用记录：${usageText}。`,
    });
  }
  const coreFight = projectArenaV2WeaponCoreFightReadV1(
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    review.weaponDefinitionId,
  );
  if (coreFight.displayName !== review.weaponDisplayName) {
    throw new RangeError('Arena V2 Product Result主复盘武器名称与共享核心打法漂移。');
  }
  const valueText = `${usageText}；主复盘${coreFight.displayName}：${
    coreFight.coreVerb
  }·${coreFight.operation.compactText}；下局优先找${review.practiceSummary}`;
  return Object.freeze({
    valueText,
    accessibilityText: `本局权威武器使用记录：${usageText}。主复盘不代表命中次数或表现结论。${
      coreFight.accessibilityText
    } 当前地图${review.mapDisplayName}，下局优先找${review.practiceSummary}。`,
  });
}

export function projectArenaV2ProductSessionInformationCandidateV1(
  value: unknown,
): ArenaV2ProductSessionInformationProjectionCandidateV1 {
  const options = assertPlainRecord(value, 'Arena V2 Product Session information options');
  assertKnownKeys(options, OPTION_KEYS, 'Arena V2 Product Session information options');
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Arena V2 Product Session information缺少${key}。`);
    }
    dataField(options, key, 'Arena V2 Product Session information options');
  }
  const selectedMode = selectedModeKind(dataField(
    options,
    'selectedModeKind',
    'Arena V2 Product Session information options',
  ));
  const rawProductResult = dataField(
    options,
    'productResult',
    'Arena V2 Product Session information options',
  );
  const productResult = rawProductResult === null
    ? null
    : validateProductMatchResultV3(rawProductResult);
  const result = productResult?.modeResult ?? null;
  const rawLocalParticipantId = dataField(
    options,
    'localParticipantId',
    'Arena V2 Product Session information options',
  );
  const localParticipantId = rawLocalParticipantId === null
    ? null
    : assertNonEmptyString(
      rawLocalParticipantId,
      'Arena V2 Product Session localParticipantId',
    );
  if ((productResult === null) !== (localParticipantId === null)) {
    throw new RangeError('Arena V2 Product Session终局与本地玩家身份必须同时存在。');
  }
  if (result !== null && selectedMode !== result.kind) {
    throw new RangeError('Arena V2 Product Session终局与所选模式不一致。');
  }

  const homeFields = Object.freeze([
    field(
      'last-mode',
      selectedMode === null ? '尚未完成模式选择' : modeLabel(selectedMode),
    ),
    field('quick-start', '2次主要点击内开局', '从首页开始，两次主要点击内进入对局。', true),
  ]);
  const resultFields = productResult === null || localParticipantId === null
    ? Object.freeze([])
    : (() => {
      const terminal = resultText(
        productResult.modeResult,
        localParticipantId,
        productResult.content.selectedMapDefinitionId,
      );
      const usage = equipmentUsageText(productResult, localParticipantId);
      return Object.freeze([
        field(
          'match-result',
          terminal.valueText,
          terminal.accessibilityText,
          true,
        ),
        field(
          'full-match-record',
          usage.valueText,
          usage.accessibilityText,
        ),
      ]);
    })();
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    selectedModeKind: selectedMode,
    hasTerminalResult: result !== null,
    screens: Object.freeze([
      Object.freeze({ screenId: 'home' as const, fieldSource: source(homeFields) }),
      Object.freeze({ screenId: 'result-reward' as const, fieldSource: source(resultFields) }),
    ]),
  });
}

export const ARENA_V2_PRODUCT_SESSION_INFORMATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  ownerId: 'p5-product-session' as const,
  ownedFieldIds: Object.freeze([
    'last-mode', 'quick-start', 'match-result', 'full-match-record',
  ]),
  terminalFactSource: 'validated-product-match-result-v3' as const,
  terminalMapSource: 'validated-product-match-result-v3.selected-map' as const,
  resultContinuationSource: 'validated-mode-result-v3-only' as const,
  raceContinuationUsesAuthorityProgressOrdinal: true as const,
  resultContinuationDoesNotInferFailureCause: true as const,
  unknownMapDisplayPolicy: 'preserve-authority-definition-id' as const,
  equipmentUsageSource: 'participant-equipment-usage-v3' as const,
  weaponMapReviewSource: 'validated-result-plus-shared-weapon-map-learning-projection' as const,
  weaponCoreFightReviewSource: 'shared-weapon-core-fight-read-projection' as const,
  resultReviewDoesNotClaimHitCountSuccessOrPerformance: true as const,
  resultReviewVisibleCoreFightCount: 1 as const,
  addsResultFieldOrPage: false as const,
  validationStatus: 'not-run' as const,
  defaultSurfaceWired: false as const,
});
