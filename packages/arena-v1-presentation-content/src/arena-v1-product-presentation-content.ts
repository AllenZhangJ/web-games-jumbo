import {
  ARENA_GAMEPLAY_V2_TUNING,
  ARENA_V1_CHARACTER_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V1_PRODUCT_SCREEN_REGISTRY,
  ARENA_V1_ZH_CN_PRODUCT_MESSAGES,
  createArenaV1ProductPresentationContent,
} from '@number-strategy-jump/arena-product-presentation';
import { ARENA_V1_GREYBOX_CONTENT } from './arena-gameplay-v2-content.js';
import {
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';

type AttackTuning = typeof ARENA_GAMEPLAY_V2_TUNING.attacks[
  keyof typeof ARENA_GAMEPLAY_V2_TUNING.attacks
];

const WEAPON_OVERVIEW_CONFIG: Readonly<Record<string, Readonly<{
  roleMessageId: string;
  descriptionMessageId: string;
  coreVerbMessageId: string;
  tradeoffMessageId: string;
  counterplayMessageId: string;
  hitResultMessageId: string;
  mapUseMessageId: string;
  groundSummaryMessageId: string;
  aerialSummaryMessageId: string;
}>>> = Object.freeze({
  [STAGE4_EQUIPMENT_ID.HAMMER]: Object.freeze({
    roleMessageId: 'equipment.hammer.role',
    descriptionMessageId: 'equipment.hammer.description',
    coreVerbMessageId: 'equipment.hammer.core-verb',
    tradeoffMessageId: 'equipment.hammer.tradeoff',
    counterplayMessageId: 'equipment.hammer.counterplay',
    hitResultMessageId: 'equipment.hammer.hit-result',
    mapUseMessageId: 'equipment.hammer.map-use',
    groundSummaryMessageId: 'equipment.hammer.ground-summary',
    aerialSummaryMessageId: 'equipment.hammer.aerial-summary',
  }),
  [STAGE4_EQUIPMENT_ID.CHAIN]: Object.freeze({
    roleMessageId: 'equipment.chain.role',
    descriptionMessageId: 'equipment.chain.description',
    coreVerbMessageId: 'equipment.chain.core-verb',
    tradeoffMessageId: 'equipment.chain.tradeoff',
    counterplayMessageId: 'equipment.chain.counterplay',
    hitResultMessageId: 'equipment.chain.hit-result',
    mapUseMessageId: 'equipment.chain.map-use',
    groundSummaryMessageId: 'equipment.chain.ground-summary',
    aerialSummaryMessageId: 'equipment.chain.aerial-summary',
  }),
  [STAGE4_EQUIPMENT_ID.SHIELD]: Object.freeze({
    roleMessageId: 'equipment.shield.role',
    descriptionMessageId: 'equipment.shield.description',
    coreVerbMessageId: 'equipment.shield.core-verb',
    tradeoffMessageId: 'equipment.shield.tradeoff',
    counterplayMessageId: 'equipment.shield.counterplay',
    hitResultMessageId: 'equipment.shield.hit-result',
    mapUseMessageId: 'equipment.shield.map-use',
    groundSummaryMessageId: 'equipment.shield.ground-summary',
    aerialSummaryMessageId: 'equipment.shield.aerial-summary',
  }),
});

function attackTuning(actionId: string): AttackTuning {
  const tuning = ARENA_GAMEPLAY_V2_TUNING.attacks[
    actionId as keyof typeof ARENA_GAMEPLAY_V2_TUNING.attacks
  ];
  if (!tuning) throw new RangeError(`武器概览缺少动作调优 ${actionId}。`);
  return tuning;
}

function stat(
  id: string,
  labelMessageId: string,
  value: number,
  maxValue: number,
  unit: string,
  direction: 'higher-is-better' | 'lower-is-better' | 'higher-is-risk',
  precision = 2,
) {
  return { id, labelMessageId, value, maxValue, unit, direction, precision };
}

function contextStats(tuning: AttackTuning) {
  return [
    stat('range', 'equipment.stat.range', tuning.targeting.range, 6, '格', 'higher-is-better'),
    stat('startup', 'equipment.stat.startup', tuning.cadence.windupSeconds, 0.5, '秒', 'lower-is-better'),
    stat('impact', 'equipment.stat.impact', tuning.knockback.targetGroundDistance, 4, '格', 'higher-is-better'),
    stat('vertical', 'equipment.stat.vertical', tuning.knockback.verticalImpulse, 7, '冲量', 'higher-is-better'),
    stat(
      'height-gap',
      'equipment.stat.height-gap',
      tuning.targeting.maximumVerticalDifference,
      4,
      '格',
      'higher-is-better',
    ),
  ];
}

function createEquipmentOverview() {
  const result: Record<string, unknown> = {};
  for (const equipmentDefinition of STAGE4_EQUIPMENT_DEFINITIONS) {
    const config = WEAPON_OVERVIEW_CONFIG[equipmentDefinition.id];
    if (!config) throw new RangeError(`武器 ${equipmentDefinition.id} 缺少概览文案配置。`);
    const tuning = attackTuning(equipmentDefinition.actionDefinitionId);
    const aerialTuning = attackTuning(equipmentDefinition.aerialActionDefinitionId);
    result[equipmentDefinition.id] = {
      roleMessageId: config.roleMessageId,
      descriptionMessageId: config.descriptionMessageId,
      coreVerbMessageId: config.coreVerbMessageId,
      tradeoffMessageId: config.tradeoffMessageId,
      counterplayMessageId: config.counterplayMessageId,
      hitResultMessageId: config.hitResultMessageId,
      mapUseMessageId: config.mapUseMessageId,
      stats: [
        stat('range', 'equipment.stat.range', tuning.targeting.range, 6, '格', 'higher-is-better'),
        stat('startup', 'equipment.stat.startup', tuning.cadence.windupSeconds, 0.5, '秒', 'lower-is-better'),
        stat('recovery', 'equipment.stat.recovery', tuning.cadence.recoverySeconds, 0.5, '秒', 'lower-is-better'),
        stat('impact', 'equipment.stat.impact', tuning.knockback.targetGroundDistance, 3, '格', 'higher-is-better'),
        stat('vertical', 'equipment.stat.vertical', tuning.knockback.verticalImpulse, 7, '冲量', 'higher-is-better'),
        stat('control', 'equipment.stat.control', tuning.hitstunTicks / ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz, 0.6, '秒', 'higher-is-better'),
        stat('self-movement', 'equipment.stat.self-movement', tuning.selfMovement?.horizontalImpulse ?? 0, 7, '冲量', 'higher-is-risk'),
        stat('cooldown', 'equipment.stat.cooldown', tuning.cadence.cooldownSeconds, 2, '秒', 'lower-is-better'),
      ],
      contexts: [
        {
          id: 'ground',
          labelMessageId: 'equipment.context.ground',
          summaryMessageId: config.groundSummaryMessageId,
          stats: contextStats(tuning),
        },
        {
          id: 'aerial',
          labelMessageId: 'equipment.context.aerial',
          summaryMessageId: config.aerialSummaryMessageId,
          stats: contextStats(aerialTuning),
        },
      ],
    };
  }
  return Object.freeze(result);
}

function requirePreviewAssetId(characterDefinitionId: string): string {
  const presentation = ARENA_V1_GREYBOX_CONTENT.characters[characterDefinitionId];
  if (!presentation) {
    throw new RangeError(`Character ${characterDefinitionId} 缺少灰盒表现内容。`);
  }
  return presentation.modelAssetId;
}

export { ARENA_V1_PRODUCT_SCREEN_REGISTRY, ARENA_V1_ZH_CN_PRODUCT_MESSAGES };

export const ARENA_V1_PRODUCT_PRESENTATION_CONTENT = createArenaV1ProductPresentationContent({
  [ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE]: requirePreviewAssetId(
    ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  ),
  [ARENA_V1_CHARACTER_ID.WIND_UP_CUBE]: requirePreviewAssetId(
    ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
  ),
  equipmentOverview: createEquipmentOverview(),
});

export const ARENA_V1_PRODUCT_CONTENT_PRESENTATION_REGISTRY = (
  ARENA_V1_PRODUCT_PRESENTATION_CONTENT.contentRegistry
);
