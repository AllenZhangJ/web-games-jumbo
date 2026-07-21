export {
  BOT_DIFFICULTY_ID,
  BOT_DIFFICULTY_IDS,
  BOT_DIFFICULTY_PROFILES,
  getBotDifficultyProfile,
} from './bot-difficulty.js';
export type {
  BotDifficultyId,
  BotDifficultyProfile,
} from './bot-difficulty.js';
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
  createBotArenaView,
  createBotObservation,
} from './bot-observation.js';
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
export type {
  BotActionAffordance,
  BotActionAffordanceOutcome,
  BotActionRule,
  BotArenaSurface,
  BotArenaView,
  BotHeldEquipment,
  BotMovementSnapshot,
  BotObservation,
  BotObservationOptions,
  BotParticipantObservation,
  BotSourceSnapshot,
  BotVector2,
  BotVector3,
  BotVisibleEquipment,
} from './bot-observation.js';
