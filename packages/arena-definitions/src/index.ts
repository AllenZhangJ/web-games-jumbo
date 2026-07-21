export {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  createActionDefinition,
} from './action-definition.js';
export type {
  ActionDefinition,
  ActionEffect,
  ActionEffectTrigger,
  ActionInput,
  ActionInputChannel,
  ActionInputTrigger,
  ActionLane,
  ActionTargeting,
  ActionTiming,
} from './action-definition.js';
export { ActionRegistry } from './action-registry.js';
export {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  createCharacterDefinition,
} from './character-definition.js';
export type {
  CharacterCollisionDefinition,
  CharacterDefinition,
  CharacterJumpDefinition,
  CharacterMovementDefinition,
} from './character-definition.js';
export {
  assertCharacterRegistry,
  CharacterRegistry,
  createCharacterRegistrySnapshot,
} from './character-registry.js';
export type { CharacterRegistryContract } from './character-registry.js';
export {
  ARENA_GAMEPLAY_V2_TUNING,
  compileHorizontalImpulseFromDistance,
  compileJumpImpulseFromHeight,
} from './arena-gameplay-v2-tuning.js';
