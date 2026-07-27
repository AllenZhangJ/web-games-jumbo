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
import { createArenaV2WeaponLanguageCandidates } from './arena-v2-weapon-language-prototype.js';
import { createArenaV2WeaponResearchReplayCore } from './arena-v2-weapon-replay-core.js';

const PLAYER_ONE_ID = 'player-1';
const PLAYER_TWO_ID = 'player-2';
const REPLAY_SEED = 0x45444745;
const START_TICK = 1;
const PLATFORM_HALF_WIDTH = 3.5;
const EDGE_TARGET_X = 2.8;

const RESEARCH_CANDIDATES = Object.freeze([
  createArenaV2WeaponLanguageCandidates().find(({ weaponId }) => weaponId === 'research-line-pressure')!,
  createArenaV2WeaponLanguageCandidates().find(({ weaponId }) => weaponId === 'research-read-punish')!,
  createArenaV2WeaponLanguageCandidates().find(({ weaponId }) => weaponId === 'research-flank')!,
]);

export type ArenaV2WeaponMultiplayerEdgeOutcome =
  | 'no-elimination'
  | 'player-1-ring-out'
  | 'player-2-ring-out'
  | 'simultaneous-ring-out';

export interface ArenaV2WeaponMultiplayerEdgeHit {
  readonly sourceEventId: string;
  readonly sequence: number;
  readonly tick: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly actionDefinitionId: string;
}

export interface ArenaV2WeaponMultiplayerEdgeFeedback {
  readonly kind: 'hit-confirm' | 'hit-ring-out';
  readonly title: string;
  readonly explanation: string;
}

export interface ArenaV2WeaponMultiplayerEdgeReplayResult {
  readonly candidateId: string;
  readonly weaponId: string;
  readonly actionDefinitionId: string;
  readonly platformHalfWidth: number;
  readonly targetStartX: number;
  readonly actionStartTicks: Readonly<Record<string, number>>;
  readonly hits: readonly ArenaV2WeaponMultiplayerEdgeHit[];
  readonly eliminatedParticipantIds: readonly string[];
  readonly feedback: ArenaV2WeaponMultiplayerEdgeFeedback;
  readonly outcome: ArenaV2WeaponMultiplayerEdgeOutcome;
  readonly finalParticipantStates: Readonly<Record<string, string>>;
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponMultiplayerEdgeReplayPrototypeResult {
  readonly candidateCount: 3;
  readonly usesTwoParticipantMatchCoreBoundary: true;
  readonly platformHalfWidth: number;
  readonly results: readonly ArenaV2WeaponMultiplayerEdgeReplayResult[];
}

const replayMatch = createReplayMatch(createArenaV2WeaponResearchReplayCore);

function configFor(weaponId: string) {
  return Object.freeze({
    participantIds: Object.freeze([PLAYER_ONE_ID, PLAYER_TWO_ID]),
    livesPerParticipant: 1,
    preparingTicks: 0,
    suddenDeathStartTick: 20,
    hardLimitTicks: 60,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: 'research-edge-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: PLATFORM_HALF_WIDTH, y: 0.5, z: 2 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: 0, y: 1.02, z: 0 }),
        Object.freeze({ x: EDGE_TARGET_X, y: 1.02, z: 0 }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([
        Object.freeze({
          id: `research-edge:${weaponId}:player-1`,
          definitionId: weaponId,
          position: Object.freeze({ x: 0, y: 1.02, z: 0 }),
        }),
        Object.freeze({
          id: `research-edge:${weaponId}:player-2`,
          definitionId: weaponId,
          position: Object.freeze({ x: EDGE_TARGET_X, y: 1.02, z: 0 }),
        }),
      ]),
    }),
  });
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  candidate: (typeof RESEARCH_CANDIDATES)[number],
): readonly ArenaInputFrame[] {
  const isFlank = candidate.weaponId === 'research-flank';
  const commitment = candidate.groundAction.commitment;
  const primaryHeld = commitment === undefined
    ? false
    : snapshot.tick < START_TICK + commitment.commitTicks;
  return Object.freeze(snapshot.participants.map(({ id }) => {
    const movement = snapshot.tick === 0
      ? id === PLAYER_ONE_ID
        ? 1
        : isFlank ? 1 : -1
      : 0;
    return Object.freeze({
      ...createNeutralInputFrame(snapshot.tick, id),
      moveX: movement,
      primaryPressed: snapshot.tick === START_TICK,
      primaryHeld,
    });
  }));
}

function eventNumber(record: Readonly<Record<string, unknown>>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number') throw new TypeError(`多人边缘 Replay 事件缺少数字 ${key}。`);
  return value;
}

function eventString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new TypeError(`多人边缘 Replay 事件缺少字符串 ${key}。`);
  return value;
}

function feedbackFor(
  hits: readonly ArenaV2WeaponMultiplayerEdgeHit[],
  eliminatedParticipantIds: readonly string[],
): ArenaV2WeaponMultiplayerEdgeFeedback {
  const ringOut = hits.some(({ targetId }) => eliminatedParticipantIds.includes(targetId));
  return ringOut
    ? Object.freeze({
      kind: 'hit-ring-out' as const,
      title: '击落·失去支撑面',
      explanation: '双方同时出招时，命中产生的横向控制把目标推出窄平台安全边界。',
    })
    : Object.freeze({
      kind: 'hit-confirm' as const,
      title: '命中·位置被改变',
      explanation: '双方同时出招仍然保留明确命中结果，目标尚未失去窄平台支撑面。',
    });
}

function createReplay(candidate: (typeof RESEARCH_CANDIDATES)[number]): Readonly<{
  replay: ArenaReplay;
  finalSnapshot: ArenaMatchSnapshot;
}> {
  const core = createArenaV2WeaponResearchReplayCore({
    seed: REPLAY_SEED,
    config: configFor(candidate.weaponId),
  } satisfies ReplayCoreFactoryOptions);
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  try {
    while (core.phase !== 'ended') runner.step(inputFor(core.getSnapshot(), candidate));
    return Object.freeze({ replay: runner.exportReplay(), finalSnapshot: core.getSnapshot() });
  } finally {
    runner.destroy();
    core.destroy();
  }
}

function outcomeFor(eliminatedParticipantIds: readonly string[]): ArenaV2WeaponMultiplayerEdgeOutcome {
  const ids = new Set(eliminatedParticipantIds);
  if (ids.size === 0) return 'no-elimination';
  if (ids.has(PLAYER_ONE_ID) && ids.has(PLAYER_TWO_ID)) return 'simultaneous-ring-out';
  return ids.has(PLAYER_ONE_ID) ? 'player-1-ring-out' : 'player-2-ring-out';
}

function runCandidate(
  candidate: (typeof RESEARCH_CANDIDATES)[number],
): ArenaV2WeaponMultiplayerEdgeReplayResult {
  const { replay, finalSnapshot } = createReplay(candidate);
  const actionStartTicks: Record<string, number> = {};
  const hits: ArenaV2WeaponMultiplayerEdgeHit[] = [];
  const eliminatedParticipantIds: string[] = [];
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    const type = eventString(record, 'type');
    if (type === 'ActionStarted' && eventString(record, 'action') === candidate.groundAction.id) {
      actionStartTicks[eventString(record, 'participantId')] ??= eventNumber(record, 'tick');
    }
    if (type === 'HitResolved' && eventString(record, 'action') === candidate.groundAction.id) {
      hits.push(Object.freeze({
        sourceEventId: eventString(record, 'id'),
        sequence: eventNumber(record, 'sequence'),
        tick: eventNumber(record, 'tick'),
        attackerId: eventString(record, 'attackerId'),
        targetId: eventString(record, 'targetId'),
        actionDefinitionId: eventString(record, 'action'),
      }));
    }
    if (type === 'PlayerEliminated') {
      eliminatedParticipantIds.push(eventString(record, 'participantId'));
    }
  }
  const finalParticipantStates = Object.fromEntries(finalSnapshot.participants.map((participant) => [
    participant.id,
    participant.status,
  ]));
  const verification = replayMatch(replay);
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`多人边缘 ${candidate.weaponId} Replay 验证后的最终 hash 不一致。`);
  }
  if (Object.keys(actionStartTicks).length !== 2) {
    throw new Error(`多人边缘 ${candidate.weaponId} 必须记录双方动作开始事件。`);
  }
  if (hits.length === 0) {
    throw new Error(`多人边缘 ${candidate.weaponId} 必须至少产生一次真实命中。`);
  }
  const uniqueEliminatedParticipantIds = Object.freeze([...new Set(eliminatedParticipantIds)]);
  return Object.freeze({
    candidateId: candidate.languageId,
    weaponId: candidate.weaponId,
    actionDefinitionId: candidate.groundAction.id,
    platformHalfWidth: PLATFORM_HALF_WIDTH,
    targetStartX: EDGE_TARGET_X,
    actionStartTicks: Object.freeze(actionStartTicks),
    hits: Object.freeze(hits),
    eliminatedParticipantIds: uniqueEliminatedParticipantIds,
    feedback: feedbackFor(hits, uniqueEliminatedParticipantIds),
    outcome: outcomeFor(eliminatedParticipantIds),
    finalParticipantStates: Object.freeze(finalParticipantStates),
    replaySchemaVersion: replay.replaySchemaVersion,
    matchSeed: replay.matchSeed,
    checkpointCount: replay.checkpoints.length,
    inputFrameCount: replay.inputFrames.length,
    finalHash: replay.finalHash,
    replayVerified: true,
  });
}

export function runArenaV2WeaponMultiplayerEdgeReplayPrototype(): ArenaV2WeaponMultiplayerEdgeReplayPrototypeResult {
  return Object.freeze({
    candidateCount: 3,
    usesTwoParticipantMatchCoreBoundary: true,
    platformHalfWidth: PLATFORM_HALF_WIDTH,
    results: Object.freeze(RESEARCH_CANDIDATES.map(runCandidate)),
  });
}
