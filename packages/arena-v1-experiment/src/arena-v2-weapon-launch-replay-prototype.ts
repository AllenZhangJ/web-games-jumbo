import {
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  createReplayMatch,
  HeadlessMatchRunner,
  type ArenaReplay,
} from '@number-strategy-jump/arena-match';
import { createArenaV2WeaponResearchReplayCore } from './arena-v2-weapon-replay-core.js';

const LINE_PRESSURE_CANDIDATE_ID = 'launch-04-line-pressure';
const LINE_PRESSURE_WEAPON_ID = 'research-line-pressure';
const LINE_PRESSURE_GROUND_ACTION_ID = 'research-line-pressure-ground';
const PLAYER_ID = 'player-1';
const REPLAY_SEED = 0x4c494e45;

const LINE_PRESSURE_REPLAY_CONFIG = Object.freeze({
  participantIds: Object.freeze(['player-1', 'player-2']),
  livesPerParticipant: 1,
  preparingTicks: 0,
  suddenDeathStartTick: 20,
  hardLimitTicks: 30,
  contextPrimaryMobilityEnabled: false,
  equipment: Object.freeze({
    initialSpawns: Object.freeze([Object.freeze({
      id: 'line-pressure-replay-spawn',
      definitionId: LINE_PRESSURE_WEAPON_ID,
      position: Object.freeze({ x: -1.2, y: 1.02, z: 0 }),
    })]),
  }),
});

export type ArenaV2WeaponLaunchActionPhase = 'idle' | 'windup' | 'active' | 'recovery';

export interface ArenaV2WeaponLaunchActionStateSample {
  readonly tick: number;
  readonly phase: ArenaV2WeaponLaunchActionPhase;
  readonly definitionId: string | null;
  readonly ticksRemaining: number;
}

export interface ArenaV2WeaponLaunchReplayPrototypeResult {
  readonly candidateId: typeof LINE_PRESSURE_CANDIDATE_ID;
  readonly weaponId: typeof LINE_PRESSURE_WEAPON_ID;
  readonly groundActionDefinitionId: typeof LINE_PRESSURE_GROUND_ACTION_ID;
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly actionStartTick: number | null;
  readonly firstHitTick: number | null;
  readonly actionPhaseSequence: readonly ArenaV2WeaponLaunchActionPhase[];
  readonly actionStateSamples: readonly ArenaV2WeaponLaunchActionStateSample[];
  readonly finalHash: string;
  readonly replayVerified: true;
}

const replayMatch = createReplayMatch(createArenaV2WeaponResearchReplayCore);

function inputFor(snapshot: ArenaMatchSnapshot): readonly ArenaInputFrame[] {
  return Object.freeze(snapshot.participants.map(({ id }) => (
    id === PLAYER_ID
      ? Object.freeze({
        ...createNeutralInputFrame(snapshot.tick, id),
        primaryPressed: snapshot.tick === 1,
      })
      : createNeutralInputFrame(snapshot.tick, id)
  )));
}

function actionStateFor(snapshot: ArenaMatchSnapshot): ArenaV2WeaponLaunchActionStateSample {
  const participant = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  if (!participant) throw new RangeError(`Replay 快照缺少 ${PLAYER_ID}。`);
  const phase = participant.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}。`);
  }
  return Object.freeze({
    tick: snapshot.tick,
    phase,
    definitionId: participant.action.definitionId,
    ticksRemaining: participant.action.ticksRemaining,
  });
}

function uniquePhases(
  samples: readonly ArenaV2WeaponLaunchActionStateSample[],
): readonly ArenaV2WeaponLaunchActionPhase[] {
  const phases: ArenaV2WeaponLaunchActionPhase[] = [];
  for (const sample of samples) {
    if (phases[phases.length - 1] !== sample.phase) phases.push(sample.phase);
  }
  return Object.freeze(phases);
}

function eventActionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  const action = event.action;
  return typeof action === 'string' ? action : null;
}

function createReplay(): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponLaunchActionStateSample[];
}> {
  const core = createArenaV2WeaponResearchReplayCore({
    seed: REPLAY_SEED,
    config: LINE_PRESSURE_REPLAY_CONFIG,
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponLaunchActionStateSample[] = [];
  try {
    while (core.phase !== 'ended') {
      const snapshot = core.getLegacyFullSnapshotForAudit();
      actionStateSamples.push(actionStateFor(snapshot));
      runner.step(inputFor(snapshot));
    }
    actionStateSamples.push(actionStateFor(core.getLegacyFullSnapshotForAudit()));
    return Object.freeze({
      replay: runner.exportReplay(),
      actionStateSamples: Object.freeze(actionStateSamples.map((sample) => Object.freeze({ ...sample }))),
    });
  } finally {
    runner.destroy();
    core.destroy();
  }
}

export function runArenaV2WeaponLaunchReplayPrototype(): ArenaV2WeaponLaunchReplayPrototypeResult {
  const { replay, actionStateSamples } = createReplay();
  let actionStartTick: number | null = null;
  let firstHitTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (record.type === 'ActionStarted' && eventActionDefinitionId(record) === LINE_PRESSURE_GROUND_ACTION_ID) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'HitResolved' && eventActionDefinitionId(record) === LINE_PRESSURE_GROUND_ACTION_ID) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  const verificationSamples: ArenaV2WeaponLaunchActionStateSample[] = [];
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      verificationSamples.push(actionStateFor(snapshot));
    },
  });
  const phases = uniquePhases(actionStateSamples);
  if (verification.finalHash !== replay.finalHash) {
    throw new Error('直线压制候选 Replay 验证后的最终 hash 不一致。');
  }
  if (verificationSamples.length === 0 || actionStartTick === null || firstHitTick === null) {
    throw new Error('直线压制候选 Replay 缺少正式动作开始或命中证据。');
  }
  return Object.freeze({
    candidateId: LINE_PRESSURE_CANDIDATE_ID,
    weaponId: LINE_PRESSURE_WEAPON_ID,
    groundActionDefinitionId: LINE_PRESSURE_GROUND_ACTION_ID,
    replaySchemaVersion: replay.replaySchemaVersion,
    matchSeed: replay.matchSeed,
    checkpointCount: replay.checkpoints.length,
    inputFrameCount: replay.inputFrames.length,
    actionStartTick,
    firstHitTick,
    actionPhaseSequence: phases,
    actionStateSamples: Object.freeze(actionStateSamples),
    finalHash: replay.finalHash,
    replayVerified: true,
  });
}
