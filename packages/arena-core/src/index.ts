export {
  ARENA_ACTION_PHASE,
  createActionRuntimeState,
  resetActionRuntimeState,
} from './action-state.js';
export type { ActionRuntimeState, ArenaActionPhase } from './action-state.js';
export {
  compareActionCandidates,
  createActionCandidate,
} from './action-candidate.js';
export type { ActionCandidate } from './action-candidate.js';
export {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
  ActionResolver,
} from './action-resolver.js';
export type {
  ActionIntentInput,
  ActionRegistryContract,
  ActionResolution,
  ActionResolutionContext,
  ActionResolutionKind,
  ActionResolutionResult,
} from './action-resolver.js';
export { ActionAffordanceProjector } from './action-affordance.js';
export type {
  ActionAffordance,
  ActionAffordanceOutcome,
} from './action-affordance.js';
export { ActionExecutionSystem } from './action-execution-system.js';
export type {
  ActionConstraints,
  ActionHit,
  ActionStart,
  ActionStateSnapshot,
  ActionTransition,
} from './action-execution-system.js';
export { TargetingRegistry } from './targeting-registry.js';
export type {
  TargetingActionRegistryContract,
  TargetingActor,
  TargetingHandler,
  TargetingResolutionContext,
} from './targeting-registry.js';
export { createDefaultTargetingRegistry } from './default-targeting-handlers.js';
export { ActionEffectRegistry } from './action-effect-registry.js';
export type {
  ActionEffectContext,
  ActionEffectHandler,
  ActionEffectResolutionContext,
  EffectActionRegistryContract,
  RuleCommand,
} from './action-effect-registry.js';
export {
  ACTION_RULE_COMMAND,
  createDefaultActionEffectRegistry,
} from './default-effect-handlers.js';
export { RuleCommandRegistry } from './rule-command-registry.js';
export type {
  RuleCommandExecutionContext,
  RuleCommandHandler,
} from './rule-command-registry.js';
export { createDefaultRuleCommandRegistry } from './default-rule-command-handlers.js';
export {
  ARENA_RULE_EVENT,
  ArenaRuleEngine,
  assertArenaRuleEngine,
} from './arena-rule-engine.js';
export type {
  ArenaRuleEngineContract,
  ArenaRuleEngineOptions,
  ArenaRuleBatch,
  ArenaRuleTimerAdvance,
  EquipmentRegistryContract,
  EquipmentSystemContract,
  MovementCandidateProviderContract,
  MovementCapabilities,
  MovementCommandAdapter,
  PublicActionRule,
  RuleActor,
  RuleHit,
} from './arena-rule-engine.js';
