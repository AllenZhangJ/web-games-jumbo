import {
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  createReplayMatch,
  HeadlessMatchRunner,
  type ArenaReplay,
  type ReplayCoreFactoryOptions,
} from '@number-strategy-jump/arena-match';
import { createArenaV2WeaponResearchReplayCore } from './arena-v2-weapon-replay-core.js';

const READ_PUNISH_CANDIDATE_ID = 'launch-05-read-punish';
const READ_PUNISH_WEAPON_ID = 'research-read-punish';
const READ_PUNISH_GROUND_ACTION_ID = 'research-read-punish-ground';
const PLAYER_ID = 'player-1';
const REPLAY_SEED = 0x52454144;
const START_TICK = 1;
const COMMIT_TICKS = 12;

const READ_PUNISH_REPLAY_CONFIG = Object.freeze({
  participantIds: Object.freeze(['player-1', 'player-2']),
  livesPerParticipant: 1,
  preparingTicks: 0,
  suddenDeathStartTick: 40,
  hardLimitTicks: 48,
  contextPrimaryMobilityEnabled: false,
  equipment: Object.freeze({
    initialSpawns: Object.freeze([Object.freeze({
      id: 'read-punish-replay-spawn',
      definitionId: READ_PUNISH_WEAPON_ID,
      position: Object.freeze({ x: -1.2, y: 1.02, z: 0 }),
    })]),
  }),
});

export type ArenaV2WeaponReadPunishScenario =
  | 'early-release'
  | 'committed-release'
  | 'expired-hold';

export type ArenaV2WeaponReadPunishCommitmentStatus = 'charging' | 'committed';

export interface ArenaV2WeaponReadPunishActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly ticksRemaining: number;
  readonly commitmentStatus: ArenaV2WeaponReadPunishCommitmentStatus | null;
  readonly chargeTicks: number;
  readonly chargeLevel: number;
}

export interface ArenaV2WeaponReadPunishScenarioResult {
  readonly scenario: ArenaV2WeaponReadPunishScenario;
  readonly actionStartTick: number | null;
  readonly commitmentOutcome: 'cancelled' | 'committed';
  readonly commitmentTick: number;
  readonly firstHitTick: number | null;
  readonly actionStateSamples: readonly ArenaV2WeaponReadPunishActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponReadPunishReplayPrototypeResult {
  readonly candidateId: typeof READ_PUNISH_CANDIDATE_ID;
  readonly weaponId: typeof READ_PUNISH_WEAPON_ID;
  readonly groundActionDefinitionId: typeof READ_PUNISH_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponReadPunishScenarioResult[];
}

const replayMatch = createReplayMatch(createArenaV2WeaponResearchReplayCore);

function createCore({
  seed,
  config,
}: ReplayCoreFactoryOptions): ReturnType<typeof createArenaV2WeaponResearchReplayCore> {
  return createArenaV2WeaponResearchReplayCore({ seed, config });
}

function releaseTickFor(scenario: ArenaV2WeaponReadPunishScenario): number | null {
  if (scenario === 'early-release') return START_TICK + 8;
  if (scenario === 'committed-release') return START_TICK + COMMIT_TICKS;
  return null;
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponReadPunishScenario,
): readonly ArenaInputFrame[] {
  const releaseTick = releaseTickFor(scenario);
  const primaryHeld = snapshot.tick >= START_TICK
    && (releaseTick === null || snapshot.tick < releaseTick);
  return Object.freeze(snapshot.participants.map(({ id }) => (
    id === PLAYER_ID
      ? Object.freeze({
        ...createNeutralInputFrame(snapshot.tick, id),
        primaryPressed: snapshot.tick === START_TICK,
        primaryHeld,
      })
      : createNeutralInputFrame(snapshot.tick, id)
  )));
}

function actionStateFor(snapshot: ArenaMatchSnapshot): ArenaV2WeaponReadPunishActionSample {
  const participant = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  if (!participant) throw new RangeError(`Replay 快照缺少 ${PLAYER_ID}。`);
  const phase = participant.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}。`);
  }
  const commitment = participant.action.commitment;
  const commitmentStatus = commitment?.status;
  if (commitmentStatus !== undefined && commitmentStatus !== 'charging' && commitmentStatus !== 'committed') {
    throw new RangeError(`Replay 快照包含未知承诺状态：${String(commitmentStatus)}。`);
  }
  return Object.freeze({
    tick: snapshot.tick,
    phase,
    definitionId: participant.action.definitionId,
    ticksRemaining: participant.action.ticksRemaining,
    commitmentStatus: commitmentStatus ?? null,
    chargeTicks: commitment?.chargeTicks ?? 0,
    chargeLevel: commitment?.chargeLevel ?? 0,
  });
}

function actionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  return typeof event.action === 'string' ? event.action : null;
}

function createScenarioReplay(scenario: ArenaV2WeaponReadPunishScenario): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponReadPunishActionSample[];
}> {
  const core = createCore({
    seed: REPLAY_SEED,
    config: READ_PUNISH_REPLAY_CONFIG,
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponReadPunishActionSample[] = [];
  try {
    while (core.phase !== 'ended') {
      const snapshot = core.getSnapshot();
      actionStateSamples.push(actionStateFor(snapshot));
      runner.step(inputFor(snapshot, scenario));
    }
    actionStateSamples.push(actionStateFor(core.getSnapshot()));
    return Object.freeze({
      replay: runner.exportReplay(),
      actionStateSamples: Object.freeze(actionStateSamples.map((sample) => Object.freeze({ ...sample }))),
    });
  } finally {
    runner.destroy();
    core.destroy();
  }
}

function runScenario(
  scenario: ArenaV2WeaponReadPunishScenario,
): ArenaV2WeaponReadPunishScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  let actionStartTick: number | null = null;
  let commitmentOutcome: 'cancelled' | 'committed' | null = null;
  let commitmentTick: number | null = null;
  let firstHitTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (record.type === 'ActionStarted' && actionDefinitionId(record) === READ_PUNISH_GROUND_ACTION_ID) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (
      (record.type === 'ActionCommitmentCancelled' || record.type === 'ActionCommitmentCommitted')
      && actionDefinitionId(record) === READ_PUNISH_GROUND_ACTION_ID
    ) {
      commitmentOutcome = record.type === 'ActionCommitmentCancelled' ? 'cancelled' : 'committed';
      commitmentTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'HitResolved' && actionDefinitionId(record) === READ_PUNISH_GROUND_ACTION_ID) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  const expectedOutcome = scenario === 'committed-release' ? 'committed' : 'cancelled';
  if (commitmentOutcome !== expectedOutcome || commitmentTick === null) {
    throw new Error(`读招反制 ${scenario} 缺少承诺结算证据。`);
  }
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      actionStateFor(snapshot);
    },
  });
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`读招反制 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  if (scenario === 'committed-release' && firstHitTick === null) {
    throw new Error('读招反制成功提交后缺少正式命中证据。');
  }
  if (scenario !== 'committed-release' && firstHitTick !== null) {
    throw new Error(`读招反制 ${scenario} 不应产生命中。`);
  }
  return Object.freeze({
    scenario,
    actionStartTick,
    commitmentOutcome,
    commitmentTick,
    firstHitTick,
    actionStateSamples: Object.freeze(actionStateSamples),
    replaySchemaVersion: replay.replaySchemaVersion,
    matchSeed: replay.matchSeed,
    checkpointCount: replay.checkpoints.length,
    inputFrameCount: replay.inputFrames.length,
    finalHash: replay.finalHash,
    replayVerified: true,
  });
}

export function runArenaV2WeaponReadPunishReplayPrototype(): ArenaV2WeaponReadPunishReplayPrototypeResult {
  return Object.freeze({
    candidateId: READ_PUNISH_CANDIDATE_ID,
    weaponId: READ_PUNISH_WEAPON_ID,
    groundActionDefinitionId: READ_PUNISH_GROUND_ACTION_ID,
    scenarios: Object.freeze(([
      'early-release',
      'committed-release',
      'expired-hold',
    ] as const).map(runScenario)),
  });
}
