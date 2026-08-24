export {
  BOT_DIFFICULTY_ID,
  BOT_DIFFICULTY_REGISTRY,
  BOT_DIFFICULTY_IDS,
  BOT_DIFFICULTY_PROFILES,
  BOT_PROFILE_REGISTRY,
  getBotDifficultyProfile,
} from './bot-difficulty.js';
export type {
  BotDifficultyId,
  BotDifficultyProfile,
} from './bot-difficulty.js';
export {
  BOT_PROFILE_DEFINITION_SCHEMA_VERSION,
  createBotProfileDefinition,
} from './bot-profile-definition.js';
export type { BotProfileDefinition } from './bot-profile-definition.js';
export {
  assertBotProfileRegistry,
  BotProfileRegistry,
  createBotProfileRegistrySnapshot,
} from './bot-profile-registry.js';
export type { BotProfileRegistryContract } from './bot-profile-registry.js';
export { createBotPersonality } from './bot-personality.js';
export type {
  BotPersonality,
  BotPersonalityArchetypeId,
} from './bot-personality.js';
export { selectHighestUtility } from './utility-arbitrator.js';
export type {
  UtilityDecision,
  UtilityEvaluator,
  UtilityPlan,
} from './utility-arbitrator.js';
export {
  cloneBotSourceSnapshot,
  cloneBotCommandSourceV5,
  createBotArenaView,
  createBotObservation,
  createBotObservationV5,
} from './bot-observation.js';

// P3 versioned Survival enemy observation. It exposes only current restricted
// facts and legal route targets; no MatchCore, future-state or renderer handle.
export * from './survival-enemy-observation-v1.js';
export * from './survival-enemy-controller-v1.js';
export * from './survival-enemy-weapon-affordance-v1.js';
export * from './survival-enemy-observation-v2.js';
export * from './survival-enemy-controller-v2.js';
export * from './bot-primary-input-pacing-v1.js';
// P6 collection counterplay probe remains absent from default bot controllers.
export * from './weapon-counterplay-probe-v1.js';
export {
  activeWindThreat,
  clearanceFromMapEdge,
  collapseThreatenedSurfaceIds,
  compareText,
  distance2d,
  findSurfacePath,
  maximumRecoverableClearance,
  nearestSurface,
  safestHazardTarget,
  supportSurface,
  surfaceForPosition,
} from './bot-map-navigation.js';
export type { BotHazardTarget } from './bot-map-navigation.js';
export {
  BOT_GOAL_ID,
  getArenaBotEvaluators,
} from './bot-goals.js';
export type {
  BotGoalContext,
  BotGoalId,
  BotGoalPlan,
} from './bot-goals.js';
export {
  BOT_MOBILITY_INTENT,
  selectBotMobilityIntent,
} from './bot-mobility-policy.js';
export type {
  BotMobilityIntent,
  BotMobilitySelection,
} from './bot-mobility-policy.js';
export { BotMobilityScheduler } from './bot-mobility-scheduler.js';
export type {
  BotMobilityDebugSnapshot,
  BotMobilitySample,
  BotMobilitySchedulerOptions,
} from './bot-mobility-scheduler.js';
export { BotController } from './bot-controller.js';
export type {
  BotControllerDebugSnapshot,
  BotControllerOptions,
} from './bot-controller.js';
export type {
  BotActionAffordance,
  BotActionAffordanceOutcome,
  BotActionRule,
  BotArenaSurface,
  BotArenaView,
  BotHeldEquipment,
  BotMovementSnapshot,
  BotObservation,
  BotObservationV5,
  BotObservationV5Options,
  BotObservationOptions,
  BotCommandSourceV5,
  BotCommandSourceReaderV5,
  BotRestrictedMapOccurrenceV5,
  BotRestrictedMapV5,
  BotMobilitySidecarV5,
  BotPolicyObservation,
  BotPolicyParticipant,
  BotParticipantObservation,
  BotSourceSnapshot,
  BotVector2,
  BotVector3,
  BotVisibleEquipment,
} from './bot-observation.js';
