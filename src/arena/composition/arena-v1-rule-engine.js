import { createDefaultActionEffectRegistry } from '../action/effects/default-effect-handlers.js';
import { createDefaultTargetingRegistry } from '../action/targeting/default-targeting-handlers.js';
import {
  STAGE4_ACTION_ID,
  createStage4ContentRegistries,
} from '../content/stage4-equipment.js';
import { ArenaRuleEngine } from '../rules/arena-rule-engine.js';
import { createDefaultRuleCommandRegistry } from '../rules/default-rule-command-handlers.js';

export function createArenaV1RuleEngine({ participantIds, config }) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('createArenaV1RuleEngine 需要已验证 match config。');
  }
  const { actionRegistry, equipmentRegistry } = createStage4ContentRegistries({
    basePush: config.basePush,
  });
  return new ArenaRuleEngine({
    participantIds,
    baseActionDefinitionId: STAGE4_ACTION_ID.BASE_PUSH,
    actionRegistry,
    equipmentRegistry,
    targetingRegistry: createDefaultTargetingRegistry(),
    effectRegistry: createDefaultActionEffectRegistry(),
    commandRegistry: createDefaultRuleCommandRegistry(),
  });
}
