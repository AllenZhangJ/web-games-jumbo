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
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import {
  createArenaV2WeaponLanguageCandidates,
  type ArenaV2WeaponLanguageCandidate,
} from './arena-v2-weapon-language-prototype.js';
import { createArenaV2WeaponResearchReplayCore } from './arena-v2-weapon-replay-core.js';

const PLAYER_ONE_ID = 'player-1';
const PLAYER_TWO_ID = 'player-2';
const REPLAY_SEED = 0x494e5445;
const SAME_TICK_ATTACK_TICK = 1;
const AIRBORNE_ATTACK_TICK = 7;
const HARD_LIMIT_TICKS = 42;

const RESEARCH_CANDIDATES = Object.freeze(
  createArenaV2WeaponLanguageCandidates().filter(({ languageId }) => (
    languageId === 'line-pressure' || languageId === 'read-punish' || languageId === 'flank'
  )),
);

export type ArenaV2WeaponAttackJumpInterleaveScenario =
  | 'same-tick-independent-lanes'
  | 'airborne-weapon-action';

export interface ArenaV2WeaponAttackJumpActionStart {
  readonly tick: number;
  readonly actionDefinitionId: string;
  readonly movementModeAfterStep: string;
  readonly groundedAfterStep: boolean;
}

export interface ArenaV2WeaponAttackJumpInterleaveReplayResult {
  readonly candidateId: string;
  readonly weaponId: string;
  readonly scenario: ArenaV2WeaponAttackJumpInterleaveScenario;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly jumpActionDefinitionId: string;
  readonly actionStarts: readonly ArenaV2WeaponAttackJumpActionStart[];
  readonly sameTickAttackAndJumpStarted: boolean;
  readonly airborneWeaponActionStarted: boolean;
  readonly airborneMovementMode: string | null;
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponAttackJumpInterleaveReplayPrototypeResult {
  readonly candidateCount: number;
  readonly scenarioCount: 2;
  readonly usesIndependentActionLanes: true;
  readonly results: readonly ArenaV2WeaponAttackJumpInterleaveReplayResult[];
}

const replayMatch = createReplayMatch(createArenaV2WeaponResearchReplayCore);

function configFor(weaponId: string) {
  return Object.freeze({
    participantIds: Object.freeze([PLAYER_ONE_ID, PLAYER_TWO_ID]),
    livesPerParticipant: 1,
    preparingTicks: 0,
    suddenDeathStartTick: 30,
    hardLimitTicks: HARD_LIMIT_TICKS,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: 'research-interleave-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: 6, y: 0.5, z: 2 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: -1.4, y: 1.02, z: 0 }),
        Object.freeze({ x: 1.4, y: 1.02, z: 0 }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([
        Object.freeze({
          id: `research-interleave:${weaponId}`,
          definitionId: weaponId,
          position: Object.freeze({ x: -1.4, y: 1.02, z: 0 }),
        }),
      ]),
    }),
  });
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponAttackJumpInterleaveScenario,
): readonly ArenaInputFrame[] {
  const tick = snapshot.tick;
  const primaryPressed = scenario === 'same-tick-independent-lanes'
    ? tick === SAME_TICK_ATTACK_TICK
    : tick === AIRBORNE_ATTACK_TICK;
  const jumpPressed = scenario === 'same-tick-independent-lanes'
    ? tick === SAME_TICK_ATTACK_TICK
    : tick === SAME_TICK_ATTACK_TICK;
  return Object.freeze(snapshot.participants.map(({ id }) => Object.freeze({
    ...createNeutralInputFrame(tick, id),
    primaryPressed: id === PLAYER_ONE_ID && primaryPressed,
    jumpPressed: id === PLAYER_ONE_ID && jumpPressed,
  })));
}

function eventString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new TypeError(`攻击/跳跃 Replay 事件缺少字符串 ${key}。`);
  return value;
}

function eventNumber(record: Readonly<Record<string, unknown>>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number') throw new TypeError(`攻击/跳跃 Replay 事件缺少数字 ${key}。`);
  return value;
}

function createReplay(
  candidate: ArenaV2WeaponLanguageCandidate,
  scenario: ArenaV2WeaponAttackJumpInterleaveScenario,
): Readonly<{ replay: ArenaReplay; actionStarts: readonly ArenaV2WeaponAttackJumpActionStart[] }> {
  const core = createArenaV2WeaponResearchReplayCore({
    seed: REPLAY_SEED,
    config: configFor(candidate.weaponId),
  } satisfies ReplayCoreFactoryOptions);
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStarts: ArenaV2WeaponAttackJumpActionStart[] = [];
  try {
    while (core.phase !== 'ended') {
      const events = runner.step(inputFor(core.getLegacyFullSnapshotForAudit(), scenario));
      const snapshot = core.getLegacyFullSnapshotForAudit();
      const player = snapshot.participants.find(({ id }) => id === PLAYER_ONE_ID);
      if (!player) throw new Error('攻击/跳跃 Replay 缺少 player-1。');
      for (const event of events) {
        const record = event as Readonly<Record<string, unknown>>;
        if (eventString(record, 'type') !== 'ActionStarted') continue;
        if (eventString(record, 'participantId') !== PLAYER_ONE_ID) continue;
        const actionDefinitionId = eventString(record, 'action');
        if (
          actionDefinitionId !== candidate.groundAction.id
          && actionDefinitionId !== candidate.aerialAction.id
          && actionDefinitionId !== STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP
        ) continue;
        actionStarts.push(Object.freeze({
          tick: eventNumber(record, 'tick'),
          actionDefinitionId,
          movementModeAfterStep: player.movement.mode,
          groundedAfterStep: player.grounded,
        }));
      }
    }
    return Object.freeze({ replay: runner.exportReplay(), actionStarts: Object.freeze(actionStarts) });
  } finally {
    runner.destroy();
    core.destroy();
  }
}

function runCandidate(
  candidate: ArenaV2WeaponLanguageCandidate,
  scenario: ArenaV2WeaponAttackJumpInterleaveScenario,
): ArenaV2WeaponAttackJumpInterleaveReplayResult {
  const { replay, actionStarts } = createReplay(candidate, scenario);
  const startsAtAttackTick = actionStarts.filter(({ tick }) => tick === (
    scenario === 'same-tick-independent-lanes' ? SAME_TICK_ATTACK_TICK : AIRBORNE_ATTACK_TICK
  ));
  const sameTickAttackAndJumpStarted = scenario === 'same-tick-independent-lanes'
    && startsAtAttackTick.some(({ actionDefinitionId }) => actionDefinitionId === candidate.groundAction.id)
    && startsAtAttackTick.some(({ actionDefinitionId }) => actionDefinitionId === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP);
  const airborneAction = actionStarts.find(({ actionDefinitionId }) => (
    actionDefinitionId === candidate.aerialAction.id
  ));
  const verification = replayMatch(replay);
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`攻击/跳跃 ${candidate.weaponId}/${scenario} Replay 最终 hash 不一致。`);
  }
  if (scenario === 'same-tick-independent-lanes' && !sameTickAttackAndJumpStarted) {
    throw new Error(`攻击/跳跃 ${candidate.weaponId} 未保持同 tick 独立动作通道。`);
  }
  if (scenario === 'airborne-weapon-action' && !airborneAction) {
    throw new Error(`攻击/跳跃 ${candidate.weaponId} 未启动空中专属武器动作。`);
  }
  return Object.freeze({
    candidateId: candidate.languageId,
    weaponId: candidate.weaponId,
    scenario,
    groundActionDefinitionId: candidate.groundAction.id,
    aerialActionDefinitionId: candidate.aerialAction.id,
    jumpActionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
    actionStarts,
    sameTickAttackAndJumpStarted,
    airborneWeaponActionStarted: airborneAction !== undefined,
    airborneMovementMode: airborneAction?.movementModeAfterStep ?? null,
    replaySchemaVersion: replay.replaySchemaVersion,
    matchSeed: replay.matchSeed,
    checkpointCount: replay.checkpoints.length,
    inputFrameCount: replay.inputFrames.length,
    finalHash: replay.finalHash,
    replayVerified: true,
  });
}

export function runArenaV2WeaponAttackJumpInterleaveReplayPrototype(): ArenaV2WeaponAttackJumpInterleaveReplayPrototypeResult {
  const results = RESEARCH_CANDIDATES.flatMap((candidate) => (
    (['same-tick-independent-lanes', 'airborne-weapon-action'] as const).map((scenario) => (
      runCandidate(candidate, scenario)
    ))
  ));
  return Object.freeze({
    candidateCount: RESEARCH_CANDIDATES.length,
    scenarioCount: 2,
    usesIndependentActionLanes: true,
    results: Object.freeze(results),
  });
}
