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

const FLANK_CANDIDATE_ID = 'launch-06-flank';
const FLANK_WEAPON_ID = 'research-flank';
const FLANK_GROUND_ACTION_ID = 'research-flank-ground';
const PLAYER_ID = 'player-1';
const TARGET_ID = 'player-2';
const REPLAY_SEED = 0x464c414e;
const START_TICK = 1;
const TURN_TICK = 8;
const SECOND_TURN_TICK = 10;
const SIDE_ENTRY_START_TICK = 24;
const SIDE_ENTRY_PLAYER_START = Object.freeze({ x: 1.2, z: 1.5 });
const SIDE_ENTRY_TARGET_START = Object.freeze({ x: 0, z: 0 });

const FLANK_REPLAY_CONFIG = Object.freeze({
  participantIds: Object.freeze(['player-1', 'player-2']),
  livesPerParticipant: 1,
  preparingTicks: 0,
  suddenDeathStartTick: 20,
  hardLimitTicks: 30,
  contextPrimaryMobilityEnabled: false,
  equipment: Object.freeze({
    initialSpawns: Object.freeze([Object.freeze({
      id: 'flank-replay-spawn',
      definitionId: FLANK_WEAPON_ID,
      position: Object.freeze({ x: -1.2, y: 1.02, z: 0 }),
    })]),
  }),
});

export type ArenaV2WeaponFlankScenario =
  | 'keep-facing-away'
  | 'turn-to-attacker'
  | 'turn-twice-before-active'
  | 'side-entry';

export interface ArenaV2WeaponFlankActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly ticksRemaining: number;
  readonly targetFacingX: number;
  readonly attackerPosition: Readonly<{ readonly x: number; readonly z: number }>;
  readonly targetPosition: Readonly<{ readonly x: number; readonly z: number }>;
}

export interface ArenaV2WeaponFlankScenarioResult {
  readonly scenario: ArenaV2WeaponFlankScenario;
  readonly actionStartTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly targetFacingBeforeActive: number | null;
  readonly targetFacingAtActive: number | null;
  readonly rearAlignmentAtStart: number | null;
  readonly rearAlignmentAtActive: number | null;
  readonly actionStateSamples: readonly ArenaV2WeaponFlankActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponFlankReplayPrototypeResult {
  readonly candidateId: typeof FLANK_CANDIDATE_ID;
  readonly weaponId: typeof FLANK_WEAPON_ID;
  readonly groundActionDefinitionId: typeof FLANK_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponFlankScenarioResult[];
}

const replayMatch = createReplayMatch(createArenaV2WeaponResearchReplayCore);

function createCore({
  seed,
  config,
}: ReplayCoreFactoryOptions): ReturnType<typeof createArenaV2WeaponResearchReplayCore> {
  return createArenaV2WeaponResearchReplayCore({ seed, config });
}

function configFor(scenario: ArenaV2WeaponFlankScenario) {
  if (scenario !== 'side-entry') return FLANK_REPLAY_CONFIG;
  return Object.freeze({
    ...FLANK_REPLAY_CONFIG,
    hardLimitTicks: 60,
    suddenDeathStartTick: 45,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: 'flank-side-entry-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: 6, y: 0.5, z: 4 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: SIDE_ENTRY_PLAYER_START.x, y: 1.02, z: SIDE_ENTRY_PLAYER_START.z }),
        Object.freeze({ x: SIDE_ENTRY_TARGET_START.x, y: 1.02, z: SIDE_ENTRY_TARGET_START.z }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([Object.freeze({
        id: 'flank-side-entry-spawn',
        definitionId: FLANK_WEAPON_ID,
        position: Object.freeze({
          x: SIDE_ENTRY_PLAYER_START.x,
          y: 1.02,
          z: SIDE_ENTRY_PLAYER_START.z,
        }),
      })]),
    }),
  });
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponFlankScenario,
): readonly ArenaInputFrame[] {
  const isSideEntry = scenario === 'side-entry';
  const targetMoveX = scenario === 'keep-facing-away'
    ? snapshot.tick === 0 ? 1 : 0
    : scenario === 'turn-to-attacker'
      ? snapshot.tick === 0
        ? 1
        : snapshot.tick === TURN_TICK ? -1 : 0
      : scenario === 'turn-twice-before-active'
        ? snapshot.tick === 0
          ? 1
          : snapshot.tick === TURN_TICK
            ? -1
            : snapshot.tick === SECOND_TURN_TICK ? 1 : 0
        : 0;
  const actionStartTick = isSideEntry ? SIDE_ENTRY_START_TICK : START_TICK;
  return Object.freeze(snapshot.participants.map(({ id }) => (
    id === PLAYER_ID
      ? Object.freeze({
        ...createNeutralInputFrame(snapshot.tick, id),
        moveZ: isSideEntry && snapshot.tick < actionStartTick ? -1 : 0,
        primaryPressed: snapshot.tick === actionStartTick,
      })
      : id === TARGET_ID
        ? Object.freeze({ ...createNeutralInputFrame(snapshot.tick, id), moveX: targetMoveX })
        : createNeutralInputFrame(snapshot.tick, id)
  )));
}

function actionStateFor(snapshot: ArenaMatchSnapshot): ArenaV2WeaponFlankActionSample {
  const player = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  const target = snapshot.participants.find(({ id }) => id === TARGET_ID);
  if (!player || !target) throw new RangeError('绕后 Replay 快照缺少参与者。');
  const phase = player.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}。`);
  }
  return Object.freeze({
    tick: snapshot.tick,
    phase,
    definitionId: player.action.definitionId,
    ticksRemaining: player.action.ticksRemaining,
    targetFacingX: target.facing.x,
    attackerPosition: Object.freeze({ x: player.position.x, z: player.position.z }),
    targetPosition: Object.freeze({ x: target.position.x, z: target.position.z }),
  });
}

function rearAlignment(sample: ArenaV2WeaponFlankActionSample): number {
  const dx = sample.attackerPosition.x - sample.targetPosition.x;
  const dz = sample.attackerPosition.z - sample.targetPosition.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-7) return 0;
  return (dx / distance) * sample.targetFacingX;
}

function actionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  return typeof event.action === 'string' ? event.action : null;
}

function createScenarioReplay(scenario: ArenaV2WeaponFlankScenario): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponFlankActionSample[];
}> {
  const core = createCore({ seed: REPLAY_SEED, config: configFor(scenario) });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponFlankActionSample[] = [];
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

function runScenario(scenario: ArenaV2WeaponFlankScenario): ArenaV2WeaponFlankScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  let actionStartTick: number | null = null;
  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (record.type === 'ActionStarted' && actionDefinitionId(record) === FLANK_GROUND_ACTION_ID) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'HitResolved' && actionDefinitionId(record) === FLANK_GROUND_ACTION_ID) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  firstActiveTick = actionStateSamples.find(({ phase }) => phase === 'active')?.tick ?? null;
  const activeSample = actionStateSamples.find(({ phase }) => phase === 'active');
  const initialSample = actionStateSamples[0];
  const beforeActiveSample = activeSample
    ? [...actionStateSamples].reverse().find(({ tick }) => tick < activeSample.tick)
    : undefined;
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      actionStateFor(snapshot);
    },
  });
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`绕后 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  if (actionStartTick === null || firstActiveTick === null) {
    throw new Error(`绕后 ${scenario} 缺少动作开始或 active 证据。`);
  }
  if (scenario === 'keep-facing-away' && firstHitTick === null) {
    throw new Error('绕后保持背向场景缺少命中证据。');
  }
  if (scenario === 'turn-to-attacker' && firstHitTick !== null) {
    throw new Error('绕后目标主动转身后不应继续命中。');
  }
  if (scenario === 'turn-twice-before-active' && firstHitTick === null) {
    throw new Error('绕后目标多次转身回到背向后应恢复命中。');
  }
  if (scenario === 'side-entry') {
    if (!initialSample || !activeSample) throw new Error('绕后侧向进入缺少位置快照。');
    if (rearAlignment(initialSample) <= -0.65) {
      throw new Error('绕后侧向进入必须从 rear-cone 外开始。');
    }
    if (rearAlignment(activeSample) > -0.65 || firstHitTick === null) {
      throw new Error(
        `绕后侧向进入必须在 active 前进入目标背后并命中（alignment=${rearAlignment(activeSample)}, hit=${String(firstHitTick)}）。`,
      );
    }
  }
  return Object.freeze({
    scenario,
    actionStartTick,
    firstActiveTick,
    firstHitTick,
    targetFacingBeforeActive: beforeActiveSample?.targetFacingX ?? null,
    targetFacingAtActive: activeSample?.targetFacingX ?? null,
    rearAlignmentAtStart: initialSample ? rearAlignment(initialSample) : null,
    rearAlignmentAtActive: activeSample ? rearAlignment(activeSample) : null,
    actionStateSamples: Object.freeze(actionStateSamples),
    replaySchemaVersion: replay.replaySchemaVersion,
    matchSeed: replay.matchSeed,
    checkpointCount: replay.checkpoints.length,
    inputFrameCount: replay.inputFrames.length,
    finalHash: replay.finalHash,
    replayVerified: true,
  });
}

export function runArenaV2WeaponFlankReplayPrototype(): ArenaV2WeaponFlankReplayPrototypeResult {
  return Object.freeze({
    candidateId: FLANK_CANDIDATE_ID,
    weaponId: FLANK_WEAPON_ID,
    groundActionDefinitionId: FLANK_GROUND_ACTION_ID,
    scenarios: Object.freeze(([
      'keep-facing-away',
      'turn-to-attacker',
      'turn-twice-before-active',
      'side-entry',
    ] as const).map(runScenario)),
  });
}
