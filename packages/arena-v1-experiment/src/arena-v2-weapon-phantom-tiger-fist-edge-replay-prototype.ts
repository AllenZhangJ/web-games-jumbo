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
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE,
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID,
} from './arena-v2-weapon-phantom-tiger-fist-definition-prototype.js';
import { createArenaV2WeaponPhantomTigerFistReplayCore } from './arena-v2-weapon-phantom-tiger-fist-replay-prototype.js';

const PLAYER_ONE_ID = 'player-1';
const PLAYER_TWO_ID = 'player-2';
const REPLAY_SEED = 0x50484544;
const START_TICK = 1;
const COMMIT_TICKS = 12;
const PLATFORM_HALF_WIDTH = 4;
const TARGET_START_X = 3.4;
const WEAPON_ID = ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE.weaponId;

export interface ArenaV2WeaponPhantomTigerFistEdgeReplayResult {
  readonly weaponId: typeof WEAPON_ID;
  readonly actionDefinitionId: typeof ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID;
  readonly platformHalfWidth: number;
  readonly targetStartX: number;
  readonly actionStartTick: number;
  readonly commitmentTick: number;
  readonly firstHitTick: number;
  readonly fallTick: number | null;
  readonly targetFinalX: number;
  readonly targetHorizontalDisplacement: number;
  readonly eliminatedParticipantIds: readonly string[];
  readonly outcome: 'hit-safe' | 'hit-ring-out';
  readonly feedback: Readonly<{
    kind: 'hit-confirm' | 'hit-ring-out';
    title: string;
    explanation: string;
  }>;
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponPhantomTigerFistEdgeReplayPrototypeResult {
  readonly candidateId: 'case-study-phantom-tiger-fist';
  readonly usesTwoParticipantMatchCoreBoundary: true;
  readonly result: ArenaV2WeaponPhantomTigerFistEdgeReplayResult;
}

const replayMatch = createReplayMatch(createArenaV2WeaponPhantomTigerFistReplayCore);

function configFor() {
  return Object.freeze({
    participantIds: Object.freeze([PLAYER_ONE_ID, PLAYER_TWO_ID]),
    livesPerParticipant: 1,
    preparingTicks: 0,
    suddenDeathStartTick: 90,
    hardLimitTicks: 120,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: 'research-phantom-edge-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: PLATFORM_HALF_WIDTH, y: 0.5, z: 2 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: 0, y: 1.02, z: 0 }),
        Object.freeze({ x: TARGET_START_X, y: 1.02, z: 0 }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([Object.freeze({
        id: 'research-phantom-edge:player-1',
        definitionId: WEAPON_ID,
        position: Object.freeze({ x: 0, y: 1.02, z: 0 }),
      })]),
    }),
  });
}

function inputFor(snapshot: ArenaMatchSnapshot): readonly ArenaInputFrame[] {
  const primaryHeld = snapshot.tick >= START_TICK && snapshot.tick < START_TICK + COMMIT_TICKS;
  return Object.freeze(snapshot.participants.map(({ id }) => (
    id === PLAYER_ONE_ID
      ? Object.freeze({
        ...createNeutralInputFrame(snapshot.tick, id),
        primaryPressed: snapshot.tick === START_TICK,
        primaryHeld,
      })
      : createNeutralInputFrame(snapshot.tick, id)
  )));
}

function createReplay(): Readonly<{
  replay: ArenaReplay;
  finalSnapshot: ArenaMatchSnapshot;
}> {
  const core = createArenaV2WeaponPhantomTigerFistReplayCore({
    seed: REPLAY_SEED,
    config: configFor(),
  } satisfies ReplayCoreFactoryOptions);
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  try {
    while (core.phase !== 'ended') runner.step(inputFor(core.getSnapshot()));
    return Object.freeze({ replay: runner.exportReplay(), finalSnapshot: core.getSnapshot() });
  } finally {
    runner.destroy();
    core.destroy();
  }
}

function eventNumber(record: Readonly<Record<string, unknown>>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number') throw new TypeError(`幻虎巨拳边缘 Replay 事件缺少数字 ${key}。`);
  return value;
}

function eventString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new TypeError(`幻虎巨拳边缘 Replay 事件缺少字符串 ${key}。`);
  return value;
}

export function runArenaV2WeaponPhantomTigerFistEdgeReplayPrototype(): ArenaV2WeaponPhantomTigerFistEdgeReplayPrototypeResult {
  const { replay, finalSnapshot } = createReplay();
  let actionStartTick: number | null = null;
  let commitmentTick: number | null = null;
  let firstHitTick: number | null = null;
  let fallTick: number | null = null;
  const eliminatedParticipantIds: string[] = [];
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    const type = eventString(record, 'type');
    if (type === 'ActionStarted' && eventString(record, 'action') === ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID) {
      actionStartTick ??= eventNumber(record, 'tick');
    }
    if (type === 'ActionCommitmentCommitted' && eventString(record, 'action') === ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID) {
      commitmentTick ??= eventNumber(record, 'tick');
    }
    if (type === 'HitResolved' && eventString(record, 'action') === ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID) {
      firstHitTick ??= eventNumber(record, 'tick');
    }
    if (type === 'PlayerEliminated') {
      eliminatedParticipantIds.push(eventString(record, 'participantId'));
      fallTick ??= eventNumber(record, 'tick');
    }
  }
  if (actionStartTick === null || commitmentTick === null || firstHitTick === null) {
    throw new Error('幻虎巨拳边缘 Replay 缺少动作开始、承诺或命中证据。');
  }
  const target = finalSnapshot.participants.find(({ id }) => id === PLAYER_TWO_ID);
  if (!target) throw new Error('幻虎巨拳边缘 Replay 缺少目标参与者。');
  const targetFinalX = target.position.x;
  const uniqueEliminatedParticipantIds = Object.freeze([...new Set(eliminatedParticipantIds)]);
  const targetFell = uniqueEliminatedParticipantIds.includes(PLAYER_TWO_ID);
  const verification = replayMatch(replay);
  if (verification.finalHash !== replay.finalHash) {
    throw new Error('幻虎巨拳边缘 Replay 验证后的最终 hash 不一致。');
  }
  return Object.freeze({
    candidateId: 'case-study-phantom-tiger-fist',
    usesTwoParticipantMatchCoreBoundary: true,
    result: Object.freeze({
      weaponId: WEAPON_ID,
      actionDefinitionId: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID,
      platformHalfWidth: PLATFORM_HALF_WIDTH,
      targetStartX: TARGET_START_X,
      actionStartTick,
      commitmentTick,
      firstHitTick,
      fallTick,
      targetFinalX,
      targetHorizontalDisplacement: Math.abs(targetFinalX - TARGET_START_X),
      eliminatedParticipantIds: uniqueEliminatedParticipantIds,
      outcome: targetFell ? 'hit-ring-out' : 'hit-safe',
      feedback: targetFell
        ? Object.freeze({
          kind: 'hit-ring-out' as const,
          title: '击落·失去支撑面',
          explanation: '幻虎巨拳的承诺命中把边缘目标推出平台安全边界，命中结果转化为淘汰。',
        })
        : Object.freeze({
          kind: 'hit-confirm' as const,
          title: '命中·仍保留支撑面',
          explanation: '幻虎巨拳命中成立，但目标仍保留平台支撑面；命中与淘汰必须分开反馈。',
        }),
      replaySchemaVersion: replay.replaySchemaVersion,
      matchSeed: replay.matchSeed,
      checkpointCount: replay.checkpoints.length,
      inputFrameCount: replay.inputFrames.length,
      finalHash: replay.finalHash,
      replayVerified: true,
    }),
  });
}
