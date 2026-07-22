import {
  createDefaultActionEffectRegistry,
  createDefaultRuleCommandRegistry,
  createDefaultTargetingRegistry,
  ArenaRuleEngine,
  type ArenaRuleEngineContract,
} from '@number-strategy-jump/arena-core';
import {
  STAGE4_ACTION_ID,
  createStage4ContentRegistries,
} from '@number-strategy-jump/arena-v1-content';
import {
  assertArenaV1AuthorityContent,
  type ArenaV1AuthorityContent,
} from './arena-v1-authority-content.js';
import { STAGE6_MOVEMENT_ACTION_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';
import { createMovementActionEffectHandlers } from './movement-action-effect-handlers.js';
import { MovementActionCandidateProvider } from './movement-action-candidate-provider.js';
import { EquipmentSystem } from '@number-strategy-jump/arena-equipment';
import {
  createMovementCommand,
  isMovementCommandKind,
} from '@number-strategy-jump/arena-movement';
import type { ArenaMatchConfig } from '@number-strategy-jump/arena-match';

const MOVEMENT_COMMAND_ADAPTER = Object.freeze({
  isCommandKind: isMovementCommandKind,
  createCommand: createMovementCommand,
});

export function createArenaV1RuleEngine({
  participantIds,
  config,
  authorityContent = null,
}: Readonly<{
  participantIds: readonly string[];
  config: ArenaMatchConfig;
  authorityContent?: ArenaV1AuthorityContent | null;
}>): ArenaRuleEngineContract {
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
