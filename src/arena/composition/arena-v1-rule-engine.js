import {
  createDefaultActionEffectRegistry,
  createDefaultRuleCommandRegistry,
  createDefaultTargetingRegistry,
  ArenaRuleEngine,
} from '@number-strategy-jump/arena-core';
import {
  STAGE4_ACTION_ID,
  createStage4ContentRegistries,
} from '../content/stage4-equipment.js';
import { assertArenaV1AuthorityContent } from './arena-v1-authority-content.js';
import { STAGE6_MOVEMENT_ACTION_DEFINITIONS } from '../content/stage6-movement-actions.js';
import { createMovementActionEffectHandlers } from '../movement/movement-action-effect-handlers.js';
import { MovementActionCandidateProvider } from '../movement/movement-action-candidate-provider.js';
import { EquipmentSystem } from '../equipment/equipment-system.js';
import {
  createMovementCommand,
  isMovementCommandKind,
} from '@number-strategy-jump/arena-movement';

const MOVEMENT_COMMAND_ADAPTER = Object.freeze({
  isCommandKind: isMovementCommandKind,
  createCommand: createMovementCommand,
});

export function createArenaV1RuleEngine({ participantIds, config, authorityContent = null }) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createArenaV1RuleEngine 需要已验证 match config。');
  }
  const { actionRegistry, equipmentRegistry } = authorityContent
    ? assertArenaV1AuthorityContent(authorityContent)
    : createStage4ContentRegistries({
      basePush: config.basePush,
      additionalActionDefinitions: STAGE6_MOVEMENT_ACTION_DEFINITIONS,
      equipmentDefinitionIds: config.contentSelection?.equipmentDefinitionIds ?? null,
    });
  return new ArenaRuleEngine({
    participantIds,
    baseActionDefinitionId: STAGE4_ACTION_ID.BASE_PUSH,
    baseAirActionDefinitionId: STAGE4_ACTION_ID.BASE_AIR_STRIKE,
    actionRegistry,
    equipmentRegistry,
    targetingRegistry: createDefaultTargetingRegistry(),
    effectRegistry: createDefaultActionEffectRegistry(createMovementActionEffectHandlers()),
    commandRegistry: createDefaultRuleCommandRegistry(),
    createEquipmentSystem: (options) => new EquipmentSystem(options),
    movementCommandAdapter: MOVEMENT_COMMAND_ADAPTER,
    movementCandidateProvider: new MovementActionCandidateProvider({
      actionRegistry,
      contextPrimaryEnabled: config.contextPrimaryMobilityEnabled ?? true,
    }),
    allowBaseAttackWhiff: config.contextPrimaryMobilityEnabled === false,
  });
}
