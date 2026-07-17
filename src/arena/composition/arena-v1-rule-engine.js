import { createDefaultActionEffectRegistry } from '../action/effects/default-effect-handlers.js';
import { createDefaultTargetingRegistry } from '../action/targeting/default-targeting-handlers.js';
import {
  STAGE4_ACTION_ID,
  createStage4ContentRegistries,
} from '../content/stage4-equipment.js';
import { ArenaRuleEngine } from '../rules/arena-rule-engine.js';
import { createDefaultRuleCommandRegistry } from '../rules/default-rule-command-handlers.js';
import { assertArenaV1AuthorityContent } from './arena-v1-authority-content.js';
import { STAGE6_MOVEMENT_ACTION_DEFINITIONS } from '../content/stage6-movement-actions.js';
import { createMovementActionEffectHandlers } from '../movement/movement-action-effect-handlers.js';
import { MovementActionCandidateProvider } from '../movement/movement-action-candidate-provider.js';

export function createArenaV1RuleEngine({ participantIds, config, authorityContent = null }) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createArenaV1RuleEngine 需要已验证 match config。');
  }
  const { actionRegistry, equipmentRegistry } = authorityContent
    ? assertArenaV1AuthorityContent(authorityContent)
    : createStage4ContentRegistries({
      basePush: config.basePush,
      additionalActionDefinitions: STAGE6_MOVEMENT_ACTION_DEFINITIONS,
    });
  return new ArenaRuleEngine({
    participantIds,
    baseActionDefinitionId: STAGE4_ACTION_ID.BASE_PUSH,
    actionRegistry,
    equipmentRegistry,
    targetingRegistry: createDefaultTargetingRegistry(),
    effectRegistry: createDefaultActionEffectRegistry(createMovementActionEffectHandlers()),
    commandRegistry: createDefaultRuleCommandRegistry(),
    movementCandidateProvider: new MovementActionCandidateProvider({ actionRegistry }),
  });
}
