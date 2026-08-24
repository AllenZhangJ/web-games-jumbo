import {
  ARENA_GAMEPLAY_V2_TUNING,
  CharacterRegistry,
  MAP_DEFINITION_SCHEMA_VERSION,
  createMapDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
  createDeterministicDataHash,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
  type DeepReadonly,
  type WeaponFeedbackResolvedEventV6,
} from '@number-strategy-jump/arena-contracts';
import {
  ArenaMapSystem,
  createDefaultMapCommandRegistry,
  createDefaultMapEventStrategyRegistry,
} from '@number-strategy-jump/arena-map';
import {
  ARENA_MATCH_PHASE,
  HeadlessMatchRunner,
  MatchCoreWeaponFeedbackAdapterV1,
  MatchCore,
  createReplayMatch,
  restoreMatchCoreFromCheckpoint,
  type ArenaInternalMatchCheckpoint,
  type ArenaMatchConfigOverrides,
  type ArenaReplay,
  type InternalCheckpointCoreFactoryOptions,
  type ReplayCoreFactoryOptions,
} from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1,
  ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1,
  ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaBaselineWeaponRuleEngineCandidateV1,
  type ArenaBaselineWeaponBundleV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';

export const ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const ATTACKER_ID = 'arena-p4-replay-attacker';
const TARGET_ID = 'arena-p4-replay-target';
const PARTICIPANT_IDS = Object.freeze([ATTACKER_ID, TARGET_ID]);
const MATCH_SEED = 0x5044;
const HARD_LIMIT_TICKS = 80;
const CHECKPOINT_TICK = 40;
const CHECKPOINT_INTERVAL_TICKS = 20;
const MAP_RULESET_VERSION = 'arena-p4-baseline-weapon-replay-map-ruleset.v1';
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const BASE_MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;

const MATCH_MAP = createMapDefinition({
  schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
  id: 'arena-v2-p4-baseline-weapon-replay-map.candidate.v1',
  arena: {
    killY: BASE_MAP.arena.killY,
    surfaces: BASE_MAP.arena.surfaces,
    spawns: [
      { x: 0, y: 1.5, z: 0 },
      { x: 1.4, y: 1.5, z: 0 },
    ],
  },
  equipmentSpawnPoints: BASE_MAP.equipmentSpawnPoints,
  events: [],
});

const WEAPONS: readonly ArenaBaselineWeaponBundleV1[] = Object.freeze([
  Object.freeze({
    id: 'heavy-hammer',
    actions: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.actions,
    equipment: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.equipment,
    grammar: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.grammar,
    contentHash: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.contentHash,
  }),
  Object.freeze({
    id: 'gravity-chain',
    actions: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.actions,
    equipment: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.equipment,
    grammar: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.grammar,
    contentHash: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.contentHash,
  }),
  Object.freeze({
    id: 'charge-shield',
    actions: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.actions,
    equipment: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.equipment,
    grammar: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.grammar,
    contentHash: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.contentHash,
  }),
]);

export interface ArenaBaselineWeaponMatchCoreReplayRunV1 {
  readonly weaponId: string;
  readonly equipmentDefinitionId: string;
  readonly weaponContentHash: string;
  readonly matchRuleContentHash: string;
  readonly replayConfigHash: string;
  readonly replayFinalHash: string;
  readonly replayedFinalHash: string;
  readonly checkpointTick: number;
  readonly checkpointStateHash: string;
  readonly restoredInitialHash: string;
  readonly restoredFinalHash: string;
  readonly replayCheckpointCount: number;
  readonly replayInputFrameCount: number;
  readonly replayEventCount: number;
  readonly actionStartedCount: number;
  readonly actionCommitmentCancelledCount: number;
  readonly actionCommitmentCommittedCount: number;
  readonly hitResolvedCount: number;
  readonly knockbackAppliedCount: number;
  readonly feedbackEventCount: number;
  readonly feedbackKinds: readonly WeaponFeedbackResolvedEventV6['kind'][];
  readonly feedbackEventHash: string;
  readonly replayedFeedbackEventHash: string;
  readonly resultReason: string;
  readonly resultHash: string;
}

export interface ArenaBaselineWeaponMatchCoreReplayVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly mapDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly matchSeed: number;
  readonly usesMatchCoreV5Authority: true;
  readonly usesHeadlessReplay: true;
  readonly exercisesReplayVerification: true;
  readonly exercisesInternalCheckpointRestore: true;
  readonly usesMatchCoreWeaponFeedbackAdapterV1: true;
  readonly exercisesP2ModeLifecycle: false;
  readonly runs: readonly ArenaBaselineWeaponMatchCoreReplayRunV1[];
  readonly resultHash: string;
}

function candidateConfig(bundle: ArenaBaselineWeaponBundleV1): ArenaMatchConfigOverrides {
  return Object.freeze({
    participantIds: PARTICIPANT_IDS,
    livesPerParticipant: 3,
    preparingTicks: 0,
    suddenDeathStartTick: 60,
    hardLimitTicks: HARD_LIMIT_TICKS,
    respawnTicks: 30,
    invulnerableTicks: 12,
    lastHitCreditTicks: 120,
    mapDefinitionId: MATCH_MAP.id,
    arena: MATCH_MAP.arena,
    participantCharacters: PARTICIPANT_IDS.map((participantId) => Object.freeze({
      participantId,
      definitionId: CHARACTER.id,
    })),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([Object.freeze({
        id: `arena-p4-replay-${bundle.id}-spawn`,
        definitionId: bundle.equipment.id,
        position: MATCH_MAP.arena.spawns[0]!,
      })]),
    }),
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    contextPrimaryMobilityEnabled: false,
  });
}

function createCore(
  bundle: ArenaBaselineWeaponBundleV1,
  seed: number,
  config: ArenaMatchConfigOverrides = candidateConfig(bundle),
): MatchCore {
  return new MatchCore({
    seed,
    config,
    characterRegistry: new CharacterRegistry([CHARACTER]),
    ruleEngineFactory: ({ participantIds }) => (
      createArenaBaselineWeaponRuleEngineCandidateV1(bundle, participantIds)
    ),
    mapSystemFactory: ({ matchSeed, equipmentDefinitionCatalog }) => new ArenaMapSystem({
      mapDefinition: MATCH_MAP,
      strategyRegistry: createDefaultMapEventStrategyRegistry(),
      commandRegistry: createDefaultMapCommandRegistry(),
      matchSeed,
      rulesetVersion: MAP_RULESET_VERSION,
      validationContext: { equipmentRegistry: equipmentDefinitionCatalog },
    }),
  });
}

function frames(bundle: ArenaBaselineWeaponBundleV1, tick: number): readonly ArenaInputFrame[] {
  const action = bundle.actions.find(({ id }) => id === bundle.equipment.actionDefinitionId);
  if (!action) throw new Error(`P4 ${bundle.id}缺少地面动作。`);
  const primaryHeld = action.commitment === undefined
    ? tick === 0
    : tick < action.commitment.commitTicks;
  return Object.freeze(PARTICIPANT_IDS.map((participantId) => Object.freeze({
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: participantId === ATTACKER_ID && tick === 0,
    primaryHeld: participantId === ATTACKER_ID && primaryHeld,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  })));
}

function replayFramesAt(replay: ArenaReplay, tick: number): readonly ArenaInputFrame[] {
  return Object.freeze(replay.inputFrames.filter((frame) => frame.tick === tick));
}

function countEvent(replay: ArenaReplay, type: string): number {
  return replay.events.filter((event) => event.type === type).length;
}

function feedbackObservation(snapshot: DeepReadonly<ArenaMatchSnapshot>) {
  return Object.freeze({
    tick: snapshot.tick,
    eventSequence: snapshot.eventSequence,
    participants: Object.freeze(snapshot.participants.map((participant) => Object.freeze({
      participantId: participant.id,
      active: participant.status === 'active',
      actionDefinitionId: participant.action.definitionId,
      supportSurfaceId: participant.supportSurfaceId,
    }))),
  });
}

function createFeedbackAdapter(core: MatchCore): MatchCoreWeaponFeedbackAdapterV1 {
  return new MatchCoreWeaponFeedbackAdapterV1({
    participantIds: PARTICIPANT_IDS,
    outcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
    initialObservation: feedbackObservation(core.getLegacyFullSnapshotForAudit()),
  });
}

function replayFeedbackEvents(
  bundle: ArenaBaselineWeaponBundleV1,
  replay: ArenaReplay,
): readonly DeepReadonly<WeaponFeedbackResolvedEventV6>[] {
  const core = createCore(bundle, replay.matchSeed, replay.config);
  const adapter = createFeedbackAdapter(core);
  const feedbackEvents: DeepReadonly<WeaponFeedbackResolvedEventV6>[] = [];
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      const events = core.step(replayFramesAt(replay, core.tick));
      feedbackEvents.push(...adapter.step({
        sequenceStart: feedbackEvents.length,
        sourceEvents: events,
        observation: feedbackObservation(core.getLegacyFullSnapshotForAudit()),
      }));
    }
    if (adapter.pendingActionCount !== 0 || adapter.pendingHitCount !== 0) {
      throw new Error(`P4 ${bundle.id}反馈Replay终局仍有未闭合结果。`);
    }
    return Object.freeze(feedbackEvents);
  } finally {
    adapter.destroy();
    core.destroy();
  }
}

export function runArenaWeaponBundleMatchCoreReplayCandidateV1(
  bundle: ArenaBaselineWeaponBundleV1,
): ArenaBaselineWeaponMatchCoreReplayRunV1 {
  const core = createCore(bundle, MATCH_SEED);
  const runner = new HeadlessMatchRunner(core, {
    checkpointInterval: CHECKPOINT_INTERVAL_TICKS,
  });
  const feedbackAdapter = createFeedbackAdapter(core);
  const feedbackEvents: DeepReadonly<WeaponFeedbackResolvedEventV6>[] = [];
  let checkpoint: ArenaInternalMatchCheckpoint | null = null;
  let replay: ArenaReplay;
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      const events = runner.step(frames(bundle, core.tick));
      feedbackEvents.push(...feedbackAdapter.step({
        sequenceStart: feedbackEvents.length,
        sourceEvents: events,
        observation: feedbackObservation(core.getLegacyFullSnapshotForAudit()),
      }));
      if (core.tick === CHECKPOINT_TICK) checkpoint = runner.exportInternalCheckpoint();
    }
    if (feedbackAdapter.pendingActionCount !== 0 || feedbackAdapter.pendingHitCount !== 0) {
      throw new Error(`P4 ${bundle.id}反馈原局终局仍有未闭合结果。`);
    }
    replay = runner.exportReplay();
  } finally {
    feedbackAdapter.destroy();
    runner.destroy();
    core.destroy();
  }
  if (checkpoint === null) throw new Error(`P4 ${bundle.id}未生成tick ${CHECKPOINT_TICK} checkpoint。`);

  const replayed = createReplayMatch(({
    seed,
    config,
  }: ReplayCoreFactoryOptions) => createCore(bundle, seed, config))(replay);
  const replayedFeedbackEvents = replayFeedbackEvents(bundle, replay);
  const feedbackEventHash = createDeterministicDataHash(
    feedbackEvents,
    `Arena P4 ${bundle.id} feedback events`,
  );
  const replayedFeedbackEventHash = createDeterministicDataHash(
    replayedFeedbackEvents,
    `Arena P4 ${bundle.id} feedback events`,
  );
  const restored = restoreMatchCoreFromCheckpoint(checkpoint, {
    coreFactory: ({
      seed,
      config,
    }: InternalCheckpointCoreFactoryOptions) => createCore(bundle, seed, config),
  });
  let restoredInitialHash: string;
  let restoredFinalHash: string;
  try {
    restoredInitialHash = restored.getStateHash();
    while (restored.phase !== ARENA_MATCH_PHASE.ENDED) {
      const tickFrames = replayFramesAt(replay, restored.tick);
      if (tickFrames.length !== PARTICIPANT_IDS.length) {
        throw new Error(`P4 ${bundle.id}恢复后tick ${restored.tick}缺少完整输入。`);
      }
      restored.step(tickFrames);
    }
    restoredFinalHash = restored.getStateHash();
  } finally {
    restored.destroy();
  }

  const run = Object.freeze({
    weaponId: bundle.id,
    equipmentDefinitionId: bundle.equipment.id,
    weaponContentHash: bundle.contentHash,
    matchRuleContentHash: replay.ruleContentHash,
    replayConfigHash: replay.configHash,
    replayFinalHash: replay.finalHash,
    replayedFinalHash: replayed.finalHash,
    checkpointTick: checkpoint.tick,
    checkpointStateHash: checkpoint.stateHash,
    restoredInitialHash,
    restoredFinalHash,
    replayCheckpointCount: replay.checkpoints.length,
    replayInputFrameCount: replay.inputFrames.length,
    replayEventCount: replay.events.length,
    actionStartedCount: countEvent(replay, 'ActionStarted'),
    actionCommitmentCancelledCount: countEvent(replay, 'ActionCommitmentCancelled'),
    actionCommitmentCommittedCount: countEvent(replay, 'ActionCommitmentCommitted'),
    hitResolvedCount: countEvent(replay, 'HitResolved'),
    knockbackAppliedCount: countEvent(replay, 'KnockbackApplied'),
    feedbackEventCount: feedbackEvents.length,
    feedbackKinds: Object.freeze(feedbackEvents.map(({ kind }) => kind)),
    feedbackEventHash,
    replayedFeedbackEventHash,
    resultReason: replay.result.reason,
  });
  return Object.freeze({
    ...run,
    resultHash: createDeterministicDataHash(run, `Arena P4 ${bundle.id} MatchCore Replay`),
  });
}

export function runArenaBaselineWeaponMatchCoreReplayVerificationCandidateV1():
ArenaBaselineWeaponMatchCoreReplayVerificationReportV1 {
  const runs = Object.freeze(WEAPONS.map(runArenaWeaponBundleMatchCoreReplayCandidateV1));
  const report = Object.freeze({
    schemaVersion: ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    mapDefinitionId: MATCH_MAP.id,
    characterDefinitionId: CHARACTER.id,
    matchSeed: MATCH_SEED,
    usesMatchCoreV5Authority: true as const,
    usesHeadlessReplay: true as const,
    exercisesReplayVerification: true as const,
    exercisesInternalCheckpointRestore: true as const,
    usesMatchCoreWeaponFeedbackAdapterV1: true as const,
    exercisesP2ModeLifecycle: false as const,
    runs,
  });
  return Object.freeze({
    ...report,
    resultHash: createDeterministicDataHash(report, 'Arena P4 MatchCore Replay V1'),
  });
}
