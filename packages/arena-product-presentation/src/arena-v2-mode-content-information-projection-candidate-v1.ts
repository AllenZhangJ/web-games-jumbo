import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  projectArenaV2WeaponCollectionResearchMilestoneV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';
import type {
  ArenaV2ProductSessionInformationModeKindCandidateV1,
} from './arena-v2-product-session-information-projection-candidate-v1.js';
import {
  ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1,
} from './arena-v2-control-learning-copy-candidate-v1.js';
import {
  projectArenaV2MapRouteSkeletonReadV1,
  projectArenaV2WeaponCoreFightReadV1,
} from './arena-v2-information-content-read-projection-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';
import {
  arenaV2MapDisplayNameV1,
  arenaV2MapSegmentCountV1,
  projectArenaV2WeaponMapLearningCandidateV1,
  requireArenaV2WeaponDisplayNameV1,
} from './arena-v2-weapon-map-learning-projection-candidate-v1.js';

export interface ArenaV2ModeContentInformationProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly selectedModeKind: ArenaV2ProductSessionInformationModeKindCandidateV1;
  readonly screens: readonly Readonly<{
    readonly screenId: 'mode-select' | 'character-select' | 'match-prep' | 'survival-prep';
    readonly fieldSource: ArenaV2InformationFieldSourceV1;
  }>[];
}

const OPTION_KEYS = new Set([
  'selectedModeKind',
  'raceParticipantCount',
  'survivalEnemyCount',
  'selectedCharacterDisplayName',
  'selectedWeaponDefinitionId',
  'selectedWeaponDisplayName',
  'selectedWeaponCollected',
  'selectedWeaponCollectionEvidence',
  'selectedWeaponCollectionTarget',
  'selectedMapDefinitionId',
  'selectedMapDisplayName',
  'selectedMapCollected',
  'selectedMapCompletedSegmentCount',
  'selectedMapSegmentCount',
  'homeContinuationPreparationState',
  'homeContinuationPreparationSource',
  'supplyIntervalTicks',
  'supplySpawnCount',
  'supplyLifetimeTicks',
  'pressureStageIntervalTicks',
]);
const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;

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
    ownerId: 'p5-mode-content',
    fieldValues: Object.freeze([...fieldValues]),
  });
}

function mode(value: unknown): ArenaV2ProductSessionInformationModeKindCandidateV1 {
  if (value !== 'duel' && value !== 'race' && value !== 'survival') {
    throw new RangeError('Arena V2 Mode Content selectedModeKind无效。');
  }
  return value;
}

function boundedCount(value: unknown, minimum: number, maximum: number, name: string): number {
  const count = assertIntegerAtLeast(value, minimum, name);
  if (count > maximum) throw new RangeError(`${name}超过上限。`);
  return count;
}

function tickDuration(ticks: number): string {
  if (ticks % TICK_RATE_HZ === 0) return `${ticks / TICK_RATE_HZ}秒`;
  return `${(ticks / TICK_RATE_HZ).toFixed(1).replace(/\.0$/u, '')}秒`;
}

function objective(kind: ArenaV2ProductSessionInformationModeKindCandidateV1): string {
  if (kind === 'duel') return '把对手击落到场外，成为最后站立者';
  if (kind === 'race') {
    return '方向与跳跃能够完成全部路线；也可攻击对手使其掉落，率先到达终点';
  }
  return '利用路线躲避和武器击落敌人，坚持尽可能久';
}

function participants(
  kind: ArenaV2ProductSessionInformationModeKindCandidateV1,
  raceParticipantCount: number,
  survivalEnemyCount: number,
): string {
  if (kind === 'duel') return '2名参与者（1名玩家 + 1名对手）';
  if (kind === 'race') return `${raceParticipantCount}名竞速者`;
  return `1名玩家 + ${survivalEnemyCount}名同族敌人`;
}

function recordType(kind: ArenaV2ProductSessionInformationModeKindCandidateV1): string {
  if (kind === 'duel') return '胜负、结束时间与武器对抗记录';
  if (kind === 'race') return '本地名次、终点时间与路线段记录';
  return '生存时间、压力阶段、掉落次数与武器应用记录';
}

function mapRule(kind: ArenaV2ProductSessionInformationModeKindCandidateV1): string {
  if (kind === 'duel') return '在所选路线的多段平台上利用武器和边界完成击落';
  if (kind === 'race') {
    return '路线板块不掉落；可攻击对手使其掉落；掉落后3秒在最近安全锚点重生';
  }
  return '复用KZ路线躲避压力；世界武器靠近即拾取替换';
}

function homeContinuationPreparationState(
  value: unknown,
): 'none' | 'ready' | 'adjusted' {
  if (value !== 'none' && value !== 'ready' && value !== 'adjusted') {
    throw new RangeError('Arena V2 Mode Content首页建议准备状态无效。');
  }
  return value;
}

function homeContinuationPreparationSource(
  value: unknown,
): 'none' | 'home' | 'result' {
  if (value !== 'none' && value !== 'home' && value !== 'result') {
    throw new RangeError('Arena V2 Mode Content目标续玩准备来源无效。');
  }
  return value;
}

export function projectArenaV2ModeContentInformationCandidateV1(
  value: unknown,
): ArenaV2ModeContentInformationProjectionCandidateV1 {
  const options = assertPlainRecord(value, 'Arena V2 Mode Content information options');
  assertKnownKeys(options, OPTION_KEYS, 'Arena V2 Mode Content information options');
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Arena V2 Mode Content information缺少${key}。`);
    }
  }
  const selectedModeKind = mode(options.selectedModeKind);
  const continuationPreparationState = homeContinuationPreparationState(
    options.homeContinuationPreparationState,
  );
  const continuationPreparationSource = homeContinuationPreparationSource(
    options.homeContinuationPreparationSource,
  );
  if ((continuationPreparationState === 'none')
    !== (continuationPreparationSource === 'none')) {
    throw new RangeError('Arena V2 Mode Content目标续玩准备状态与来源不一致。');
  }
  const raceParticipantCount = boundedCount(
    options.raceParticipantCount,
    2,
    4,
    'Arena V2 Mode Content raceParticipantCount',
  );
  const survivalEnemyCount = boundedCount(
    options.survivalEnemyCount,
    1,
    16,
    'Arena V2 Mode Content survivalEnemyCount',
  );
  if (![1, 4, 8, 12, 16].includes(survivalEnemyCount)) {
    throw new RangeError('Arena V2 Mode Content survivalEnemyCount必须是1/4/8/12/16。');
  }
  const selectedCharacterDisplayName = assertNonEmptyString(
    options.selectedCharacterDisplayName,
    'Arena V2 Mode Content selectedCharacterDisplayName',
  );
  const selectedWeaponDefinitionId = assertNonEmptyString(
    options.selectedWeaponDefinitionId,
    'Arena V2 Mode Content selectedWeaponDefinitionId',
  );
  const selectedWeaponDisplayName = assertNonEmptyString(
    options.selectedWeaponDisplayName,
    'Arena V2 Mode Content selectedWeaponDisplayName',
  );
  const expectedWeaponDisplayName = requireArenaV2WeaponDisplayNameV1(
    selectedWeaponDefinitionId,
  );
  if (selectedWeaponDisplayName !== expectedWeaponDisplayName) {
    throw new RangeError('Arena V2 Mode Content武器Definition与显示名称不一致。');
  }
  const selectedWeaponCoreFight = selectedModeKind === 'survival'
    ? null
    : projectArenaV2WeaponCoreFightReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      selectedWeaponDefinitionId,
    );
  if (selectedWeaponCoreFight !== null
    && selectedWeaponCoreFight.displayName !== selectedWeaponDisplayName) {
    throw new RangeError('Arena V2 Mode Content武器核心打法与显示名称不一致。');
  }
  if (typeof options.selectedWeaponCollected !== 'boolean') {
    throw new TypeError('Arena V2 Mode Content selectedWeaponCollected必须是布尔值。');
  }
  const selectedWeaponCollectionEvidence = boundedCount(
    options.selectedWeaponCollectionEvidence,
    0,
    1_000_000,
    'Arena V2 Mode Content selectedWeaponCollectionEvidence',
  );
  const selectedWeaponCollectionTarget = boundedCount(
    options.selectedWeaponCollectionTarget,
    1,
    1_000_000,
    'Arena V2 Mode Content selectedWeaponCollectionTarget',
  );
  if (selectedWeaponCollectionEvidence > selectedWeaponCollectionTarget) {
    throw new RangeError('Arena V2 Mode Content武器收藏研究进度不能超过目标。');
  }
  if (options.selectedWeaponCollected
    !== (selectedWeaponCollectionEvidence === selectedWeaponCollectionTarget)) {
    throw new RangeError('Arena V2 Mode Content武器收藏状态与研究进度不一致。');
  }
  const selectedMapDefinitionId = assertNonEmptyString(
    options.selectedMapDefinitionId,
    'Arena V2 Mode Content selectedMapDefinitionId',
  );
  const selectedMapDisplayName = assertNonEmptyString(
    options.selectedMapDisplayName,
    'Arena V2 Mode Content selectedMapDisplayName',
  );
  const expectedMapDisplayName = arenaV2MapDisplayNameV1(selectedMapDefinitionId);
  if (selectedMapDisplayName !== expectedMapDisplayName) {
    throw new RangeError('Arena V2 Mode Content地图Definition与显示名称不一致。');
  }
  if (typeof options.selectedMapCollected !== 'boolean') {
    throw new TypeError('Arena V2 Mode Content selectedMapCollected必须是布尔值。');
  }
  const selectedMapCompletedSegmentCount = boundedCount(
    options.selectedMapCompletedSegmentCount,
    0,
    1_000_000,
    'Arena V2 Mode Content selectedMapCompletedSegmentCount',
  );
  const selectedMapSegmentCount = boundedCount(
    options.selectedMapSegmentCount,
    1,
    1_000_000,
    'Arena V2 Mode Content selectedMapSegmentCount',
  );
  if (selectedMapCompletedSegmentCount > selectedMapSegmentCount) {
    throw new RangeError('Arena V2 Mode Content地图路线理解不能超过段落总数。');
  }
  if (arenaV2MapSegmentCountV1(selectedMapDefinitionId) !== selectedMapSegmentCount) {
    throw new RangeError('Arena V2 Mode Content地图Definition与路线段落总数不一致。');
  }
  const selectedMapRouteSkeleton = projectArenaV2MapRouteSkeletonReadV1(
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    selectedMapDefinitionId,
  );
  if (selectedMapRouteSkeleton.displayName !== selectedMapDisplayName) {
    throw new RangeError('Arena V2 Mode Content地图路线骨架与显示名称不一致。');
  }
  const routeStart = selectedMapRouteSkeleton.anchors[0];
  const routeFinish = selectedMapRouteSkeleton.anchors[
    selectedMapRouteSkeleton.anchors.length - 1
  ];
  if (routeStart === undefined || routeFinish === undefined) {
    throw new RangeError('Arena V2 Mode Content地图路线骨架缺少首尾锚点。');
  }
  const shortRouteSignature = `${routeStart.displayName}→${routeFinish.displayName}`;
  const continuationValuePrefix = continuationPreparationState === 'ready'
    ? '目标已准备｜'
    : continuationPreparationState === 'adjusted' ? '已改选｜' : '';
  const continuationAccessibilityPrefix = continuationPreparationState === 'ready'
    ? continuationPreparationSource === 'home'
      ? '已按首页目标准备当前组合。'
      : '已按上局结算目标准备当前组合。'
    : continuationPreparationState === 'adjusted'
      ? continuationPreparationSource === 'home'
        ? '当前组合已与首页目标不同，可按当前选择开始。'
        : '当前组合已与上局结算目标不同，可按当前选择开始。'
      : '';
  const preparationEntryValueText = selectedModeKind === 'survival'
    ? `生存：${selectedMapDisplayName}｜${shortRouteSignature}｜空手开局`
    : `1v1/竞速：${selectedWeaponDisplayName} ${
      selectedWeaponCoreFight!.coreVerb
    }·${selectedWeaponCoreFight!.operation.compactText} × ${
      selectedMapDisplayName
    } ${shortRouteSignature}`;
  const preparationEntryAccessibilityText = selectedModeKind === 'survival'
    ? `生存使用${selectedMapDisplayName}并默认空手开局。路线骨架：${
      selectedMapRouteSkeleton.accessibilityText
    }。`
    : `1v1和竞速使用${selectedWeaponDisplayName}与${selectedMapDisplayName}。${
      selectedWeaponCoreFight!.accessibilityText
    } 地图路线骨架：${selectedMapRouteSkeleton.accessibilityText}。`;
  const supplyIntervalTicks = boundedCount(
    options.supplyIntervalTicks,
    1,
    1_000_000,
    'Arena V2 Mode Content supplyIntervalTicks',
  );
  const supplySpawnCount = boundedCount(
    options.supplySpawnCount,
    1,
    16,
    'Arena V2 Mode Content supplySpawnCount',
  );
  const supplyLifetimeTicks = boundedCount(
    options.supplyLifetimeTicks,
    1,
    1_000_000,
    'Arena V2 Mode Content supplyLifetimeTicks',
  );
  const pressureStageIntervalTicks = boundedCount(
    options.pressureStageIntervalTicks,
    1,
    1_000_000,
    'Arena V2 Mode Content pressureStageIntervalTicks',
  );
  const competitiveWeaponMapLearning = selectedModeKind === 'survival'
    ? null
    : projectArenaV2WeaponMapLearningCandidateV1({
      modeKind: selectedModeKind,
      weaponDefinitionIds: [selectedWeaponDefinitionId],
      mapDefinitionId: selectedMapDefinitionId,
      focusPolicy: 'exactly-one',
      unknownMapPolicy: 'fail-closed',
    });
  if (selectedModeKind !== 'survival' && competitiveWeaponMapLearning === null) {
    throw new RangeError('Arena V2竞技准备缺少武器地图学习投影。');
  }
  const weaponResearchMilestone = selectedWeaponCollectionTarget === 120
    ? projectArenaV2WeaponCollectionResearchMilestoneV1({
      count: selectedWeaponCollectionEvidence,
      target: selectedWeaponCollectionTarget,
      collected: options.selectedWeaponCollected,
    })
    : null;

  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    selectedModeKind,
    screens: Object.freeze([
      Object.freeze({
        screenId: 'mode-select' as const,
        fieldSource: source([
          field('mode-objective', objective(selectedModeKind)),
          field(
            'participant-count',
            participants(selectedModeKind, raceParticipantCount, survivalEnemyCount),
            undefined,
            true,
          ),
          field('record-type', recordType(selectedModeKind)),
          field(
            'character-entry',
            ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.quickStartText,
          ),
          field(
            'preparation-entry',
            `${continuationValuePrefix}${preparationEntryValueText}`,
            `${continuationAccessibilityPrefix}${preparationEntryAccessibilityText}`,
          ),
        ]),
      }),
      Object.freeze({
        screenId: 'character-select' as const,
        fieldSource: source([
          field(
            'handling-summary',
            ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.characterLearningText,
          ),
          field(
            'movement-difference',
            ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.characterDifferenceText,
          ),
        ]),
      }),
      Object.freeze({
        screenId: 'match-prep' as const,
        fieldSource: source([
          field('mode-goal', objective(selectedModeKind)),
          field(
            'participant-count',
            participants(selectedModeKind, raceParticipantCount, survivalEnemyCount),
            undefined,
            true,
          ),
          field('map-rule', mapRule(selectedModeKind)),
          field('character-entry', `当前角色：${selectedCharacterDisplayName}`),
          field(
            'weapon-entry',
            weaponResearchMilestone === null
              ? options.selectedWeaponCollected
                ? `本局武器：${selectedWeaponDisplayName}（已收藏 · 主研究${
                  selectedWeaponCollectionEvidence
                }/${selectedWeaponCollectionTarget}${
                  selectedWeaponCollectionEvidence === selectedWeaponCollectionTarget
                    ? '已完成'
                    : ' · 继续主研究'
                } · 可继续练五情境）`
                : `本局武器：${selectedWeaponDisplayName}（主研究 ${
                  selectedWeaponCollectionEvidence
                }/${selectedWeaponCollectionTarget}）`
                : weaponResearchMilestone.nextStage === null
                  ? `本局武器：${selectedWeaponDisplayName}（${
                    weaponResearchMilestone.collected ? '已收藏 · ' : ''
                  }主研究已完成 · 可继续练五情境）`
                  : `本局武器：${selectedWeaponDisplayName}（${
                    weaponResearchMilestone.collected ? '已收藏 · ' : ''
                  }${weaponResearchMilestone.stage} · 主研究${
                    weaponResearchMilestone.count
                  }/${weaponResearchMilestone.target} · 距${weaponResearchMilestone.nextStage}至少${
                    weaponResearchMilestone.minimumEffectiveMainResearchMatchCount
                  }局有效主研究）`,
          ),
          field(
            'map-entry',
            `本局地图：${selectedMapDisplayName}（${
              options.selectedMapCollected ? '已收藏' : '待收集'
            }，路线理解 ${selectedMapCompletedSegmentCount}/${selectedMapSegmentCount}）`,
          ),
          ...(competitiveWeaponMapLearning === null ? [] : [field(
            'weapon-map-plan',
            `本局练法：${competitiveWeaponMapLearning.weaponDisplayName}核心 ${
              selectedWeaponCoreFight!.compactText
            }；在${competitiveWeaponMapLearning.mapDisplayName}`
              + `优先找${competitiveWeaponMapLearning.practiceSummary}`,
            `${selectedWeaponCoreFight!.accessibilityText} 当前地图${
              competitiveWeaponMapLearning.mapDisplayName
            }，优先练${
              competitiveWeaponMapLearning.practiceSummary
            }。`,
          )]),
        ]),
      }),
      Object.freeze({
        screenId: 'survival-prep' as const,
        fieldSource: source([
          field('unarmed-start', '默认空手开局；靠近世界武器才会拾取或替换'),
          field(
            'supply-timing',
            `每${tickDuration(supplyIntervalTicks)}刷新${supplySpawnCount}把；未拾取${tickDuration(supplyLifetimeTicks)}后消失`,
            undefined,
            true,
          ),
          field('fall-rule', '第一次掉落后复活；第二次掉落立即结束本局'),
          field(
            'pressure-summary',
            `本局地图：${selectedMapDisplayName}（${
              options.selectedMapCollected ? '已收藏' : '待收集'
            }，路线理解 ${selectedMapCompletedSegmentCount}/${selectedMapSegmentCount}）；敌人共用同一外观；每${
              tickDuration(pressureStageIntervalTicks)
            }提高压力，存活越久武器等级越高`,
            undefined,
            true,
          ),
        ]),
      }),
    ]),
  });
}

export const ARENA_V2_MODE_CONTENT_INFORMATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  ownerId: 'p5-mode-content' as const,
  competitivePreparationWeaponMapLearningWired: true as const,
  competitivePreparationWeaponCoreFightWired: true as const,
  quickStartCurrentLoadoutVisibleBeforePrimaryAction: true as const,
  modeSelectionShortWeaponMapSignatureWired: true as const,
  modeSelectionSignatureUsesSharedWeaponAndMapProjection: true as const,
  acceptedHomeContinuationStateReusesPreparationEntry: true as const,
  acceptedResultContinuationStateReusesPreparationEntry: true as const,
  continuationPreparationCopyUsesExplicitSource: true as const,
  adjustedHomeContinuationDoesNotBlockCurrentSelection: true as const,
  survivalSkipsWeaponCoreFightProjection: true as const,
  survivalStartsUnarmedWithoutPreselectedWeaponPlan: true as const,
  validationStatus: 'not-run' as const,
  defaultSurfaceWired: false as const,
});
