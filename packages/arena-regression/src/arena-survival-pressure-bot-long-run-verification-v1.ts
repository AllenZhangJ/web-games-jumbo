import {
  createDeterministicDataHash,
  deriveSeed,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  SURVIVAL_ENEMY_PRIMARY_SOURCE_V1,
  SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION,
  SurvivalEnemyControllerV1,
  createSurvivalEnemyPrimaryActionAffordanceV1,
} from '@number-strategy-jump/arena-bot';
import { SurvivalPressureResolverV1 } from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1,
  ARENA_V2_UNARMED_ACTION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_SURVIVAL_PRESSURE_BOT_LONG_RUN_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_PRESSURE_BOT_LONG_RUN_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const MODE_ID = ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId;
const PRESSURE = ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.pressurePolicyDefinition;
const LAST_STAGE = PRESSURE.stages.at(-1)!;
const FINAL_TICK = LAST_STAGE.startActiveTick;
const PLAYER_ID = 'arena-p4-survival-long-run-player';
const BASE_SEED = 0x5044_33;
const ROUTE = ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2;
const ZERO = Object.freeze({ x: 0, y: 0, z: 0 });
const BASE_AFFORDANCE = createSurvivalEnemyPrimaryActionAffordanceV1({
  schemaVersion: SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION,
  sourceKind: SURVIVAL_ENEMY_PRIMARY_SOURCE_V1.BASE_ACTION,
  primaryActionDefinitionId: ARENA_V2_UNARMED_ACTION_CANDIDATE_V1.actions[0]!.id,
  collectionEquipmentDefinitionId: null,
  runtimeEquipmentDefinitionId: null,
  survivalLevel: null,
  primaryRange: 2,
  minimumCommitmentTicks: 0,
  cooldownRemainingTicks: 0,
  actionBlocked: false,
});

interface ControllerSlot {
  readonly slotId: string;
  readonly participantId: string;
  readonly controller: SurvivalEnemyControllerV1;
}

export interface ArenaSurvivalPressureBotLongRunStageReportV1 {
  readonly stage: number;
  readonly startActiveTick: number;
  readonly desiredActiveEnemySlots: number;
  readonly activeInputFrameCount: number;
}

export interface ArenaSurvivalPressureBotLongRunVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_PRESSURE_BOT_LONG_RUN_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_PRESSURE_BOT_LONG_RUN_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly usesSingleEnemyFamily: true;
  readonly usesOrdinaryInputFramesOnly: true;
  readonly writesNoHitPickupOrMovementAuthority: true;
  readonly exercisesFormalModeLifecycle: false;
  readonly simulatedTickCount: number;
  readonly configuredEnemySlotCount: number;
  readonly finalActiveEnemyCount: number;
  readonly totalInputFrameCount: number;
  readonly activePrimaryPressCount: number;
  readonly inactiveNonNeutralFrameCount: number;
  readonly stageReports: readonly ArenaSurvivalPressureBotLongRunStageReportV1[];
  readonly checkpointContinuationHash: string;
  readonly restoredContinuationHash: string;
  readonly pressureContentHash: string;
  readonly resultHash: string;
}

function participantId(index: number): string {
  return `arena-p4-survival-long-run-enemy-${String(index + 1).padStart(2, '0')}`;
}

function createControllers(): readonly ControllerSlot[] {
  return Object.freeze(PRESSURE.slotActivationOrder.map((slotId, index) => Object.freeze({
    slotId,
    participantId: participantId(index),
    controller: new SurvivalEnemyControllerV1({
      participantId: participantId(index),
      slotId,
      behaviorSeed: deriveSeed(BASE_SEED, `survival-pressure-slot:${slotId}`),
      profile: SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
    }),
  })));
}

function routeContext(anchorId: string) {
  const anchor = ROUTE.anchors.find(({ id }) => id === anchorId);
  const segment = ROUTE.segments.find(({ respawnAnchorId }) => respawnAnchorId === anchorId);
  if (!anchor || !segment) throw new Error(`Survival pressure anchor ${anchorId} route闭包缺失。`);
  return Object.freeze({ anchor, segment });
}

function observation(
  slot: ControllerSlot,
  tick: number,
  active: boolean,
  anchorCapabilityId: string,
) {
  const { anchor, segment } = routeContext(anchorCapabilityId);
  return Object.freeze({
    schemaVersion: 1,
    tick,
    eventSequence: tick,
    modeDefinitionId: MODE_ID,
    participantId: slot.participantId,
    slotId: slot.slotId,
    slotGeneration: active ? 1 : 0,
    active,
    primaryRange: BASE_AFFORDANCE.primaryRange,
    primaryMinimumCommitmentTicks: BASE_AFFORDANCE.minimumCommitmentTicks,
    primaryCommitment: null,
    self: Object.freeze({
      position: anchor.position,
      velocity: ZERO,
      grounded: true,
      hitstunTicks: 0,
      actionReady: BASE_AFFORDANCE.actionReady,
      actionInProgress: false,
      currentSegmentId: segment.id,
    }),
    player: Object.freeze({
      participantId: PLAYER_ID,
      position: Object.freeze({
        x: anchor.position.x + 0.5,
        y: anchor.position.y,
        z: anchor.position.z,
      }),
      velocity: ZERO,
      invulnerableTicks: 0,
      currentSegmentId: segment.id,
    }),
    routeTargets: active ? Object.freeze([Object.freeze({
      segmentId: segment.id,
      anchorId: anchor.id,
      position: anchor.position,
      intent: 'pursuit' as const,
      traversal: 'walk' as const,
      priority: 100,
    })]) : Object.freeze([]),
  });
}

function isNeutral(frame: ArenaInputFrame): boolean {
  return frame.moveX === 0
    && frame.moveZ === 0
    && !frame.primaryPressed
    && !frame.primaryHeld
    && !frame.jumpPressed
    && !frame.jumpHeld
    && !frame.slamPressed;
}

function createFrames(
  slots: readonly ControllerSlot[],
  resolver: SurvivalPressureResolverV1,
  tick: number,
): readonly ArenaInputFrame[] {
  const pressure = resolver.resolve(tick);
  const activeBySlot = new Map(
    pressure.activeSlots.map((slot) => [slot.slotId, slot.anchorCapabilityId]),
  );
  return Object.freeze(slots.map((slot) => {
    const activeAnchor = activeBySlot.get(slot.slotId);
    const fallbackAnchor = PRESSURE.slotEntries.find(({ slotId }) => slotId === slot.slotId)
      ?.anchorCapabilityId;
    if (!fallbackAnchor) throw new Error(`Survival pressure slot ${slot.slotId}缺少anchor。`);
    return slot.controller.createInput(observation(
      slot,
      tick,
      activeAnchor !== undefined,
      activeAnchor ?? fallbackAnchor,
    ));
  }));
}

export function runArenaSurvivalPressureBotLongRunVerificationCandidateV1():
ArenaSurvivalPressureBotLongRunVerificationReportV1 {
  const resolver = new SurvivalPressureResolverV1(PRESSURE);
  const slots = createControllers();
  const stageByTick = new Map(PRESSURE.stages.map((stage) => [stage.startActiveTick, stage]));
  const stageReports: ArenaSurvivalPressureBotLongRunStageReportV1[] = [];
  let totalInputFrameCount = 0;
  let activePrimaryPressCount = 0;
  let inactiveNonNeutralFrameCount = 0;
  for (let tick = 0; tick <= FINAL_TICK; tick += 1) {
    const pressure = resolver.resolve(tick);
    const activeIds = new Set(pressure.activeSlots.map(({ slotId }) => slotId));
    const frames = createFrames(slots, resolver, tick);
    totalInputFrameCount += frames.length;
    activePrimaryPressCount += frames.filter((frame) => (
      activeIds.has(slots.find(({ participantId: id }) => id === frame.participantId)!.slotId)
      && frame.primaryPressed
    )).length;
    inactiveNonNeutralFrameCount += frames.filter((frame) => {
      const slot = slots.find(({ participantId: id }) => id === frame.participantId)!;
      return !activeIds.has(slot.slotId) && !isNeutral(frame);
    }).length;
    const stage = stageByTick.get(tick);
    if (stage) {
      stageReports.push(Object.freeze({
        stage: stage.stage,
        startActiveTick: stage.startActiveTick,
        desiredActiveEnemySlots: stage.desiredActiveEnemySlots,
        activeInputFrameCount: frames.filter((frame) => {
          const slot = slots.find(({ participantId: id }) => id === frame.participantId)!;
          return activeIds.has(slot.slotId);
        }).length,
      }));
    }
  }
  const checkpoints = slots.map(({ controller }) => controller.exportCheckpointV1());
  const originalContinuation = createFrames(slots, resolver, FINAL_TICK + 1);
  const restoredSlots = slots.map((slot, index) => Object.freeze({
    slotId: slot.slotId,
    participantId: slot.participantId,
    controller: SurvivalEnemyControllerV1.restoreFromCheckpointV1(checkpoints[index]!),
  }));
  const restoredContinuation = createFrames(restoredSlots, resolver, FINAL_TICK + 1);
  const authority = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_PRESSURE_BOT_LONG_RUN_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_PRESSURE_BOT_LONG_RUN_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    usesSingleEnemyFamily: true as const,
    usesOrdinaryInputFramesOnly: true as const,
    writesNoHitPickupOrMovementAuthority: true as const,
    exercisesFormalModeLifecycle: false as const,
    simulatedTickCount: FINAL_TICK + 1,
    configuredEnemySlotCount: slots.length,
    finalActiveEnemyCount: resolver.resolve(FINAL_TICK).desiredActiveEnemySlots,
    totalInputFrameCount,
    activePrimaryPressCount,
    inactiveNonNeutralFrameCount,
    stageReports: Object.freeze(stageReports),
    checkpointContinuationHash: createDeterministicDataHash(
      originalContinuation,
      'Arena Survival pressure Bot continuation',
    ),
    restoredContinuationHash: createDeterministicDataHash(
      restoredContinuation,
      'Arena Survival pressure Bot continuation',
    ),
    pressureContentHash: resolver.contentHash,
  });
  for (const { controller } of slots) controller.destroy();
  for (const { controller } of restoredSlots) controller.destroy();
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Survival Pressure Bot Long Run Verification V1',
    ),
  });
}
