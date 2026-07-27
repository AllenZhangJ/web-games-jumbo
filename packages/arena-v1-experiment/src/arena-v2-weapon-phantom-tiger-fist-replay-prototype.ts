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
  createArenaV1CharacterRegistry,
  createArenaV1MapRegistry,
  createArenaV2WeaponCandidateContentRegistries,
} from '@number-strategy-jump/arena-v1-content';
import {
  createArenaV1MapSystem,
  createArenaV1MatchCore,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import type {
  MatchCoreFactoryContext,
  MatchCoreMapFactoryContext,
} from '@number-strategy-jump/arena-match';
import { EquipmentRegistry } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE,
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID,
} from './arena-v2-weapon-phantom-tiger-fist-definition-prototype.js';

const CANDIDATE_ID = 'case-study-phantom-tiger-fist';
const WEAPON_ID = ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE.weaponId;
const PLAYER_ID = 'player-1';
const REPLAY_SEED = 0x50485446;
const START_TICK = 1;
const COMMIT_TICKS = 12;

const REPLAY_CONFIG = Object.freeze({
  participantIds: Object.freeze(['player-1', 'player-2']),
  livesPerParticipant: 1,
  preparingTicks: 0,
  suddenDeathStartTick: 40,
  hardLimitTicks: 48,
  contextPrimaryMobilityEnabled: false,
  equipment: Object.freeze({
    initialSpawns: Object.freeze([Object.freeze({
      id: 'phantom-tiger-fist-replay-spawn',
      definitionId: WEAPON_ID,
      position: Object.freeze({ x: -1.2, y: 1.02, z: 0 }),
    })]),
  }),
});

export type ArenaV2WeaponPhantomTigerFistReplayScenario =
  | 'early-release'
  | 'committed-release'
  | 'expired-hold';

export interface ArenaV2WeaponPhantomTigerFistActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly commitmentStatus: 'charging' | 'committed' | null;
  readonly chargeTicks: number;
  readonly chargeLevel: number;
  readonly positionX: number;
  readonly positionZ: number;
}

export interface ArenaV2WeaponPhantomTigerFistScenarioResult {
  readonly scenario: ArenaV2WeaponPhantomTigerFistReplayScenario;
  readonly actionStartTick: number | null;
  readonly commitmentOutcome: 'cancelled' | 'committed';
  readonly commitmentTick: number;
  readonly firstHitTick: number | null;
  readonly actionStateSamples: readonly ArenaV2WeaponPhantomTigerFistActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponPhantomTigerFistReplayPrototypeResult {
  readonly candidateId: typeof CANDIDATE_ID;
  readonly weaponId: typeof WEAPON_ID;
  readonly groundActionDefinitionId: typeof ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponPhantomTigerFistScenarioResult[];
}

type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

const replayMatch = createReplayMatch((options: ReplayCoreFactoryOptions) => (
  createCore(options)
));

function createAuthorityContent(): ResearchAuthorityContent {
  const base = createArenaV2WeaponCandidateContentRegistries({
    additionalActionDefinitions: [
      ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE.groundAction,
      ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE.aerialAction,
    ],
  });
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...base.equipmentRegistry.list(),
      ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE.equipment,
    ],
    actionRegistry: base.actionRegistry,
  });
  return Object.freeze({
    actionRegistry: base.actionRegistry,
    equipmentRegistry,
    mapRegistry: createArenaV1MapRegistry(),
    characterRegistry: createArenaV1CharacterRegistry(),
  });
}

export function createArenaV2WeaponPhantomTigerFistReplayCore({
  seed,
  config,
}: ReplayCoreFactoryOptions): ReturnType<typeof createArenaV1MatchCore> {
  const authorityContent = createAuthorityContent();
  return createArenaV1MatchCore({
    seed,
    config,
    ruleEngineFactory: ({
      participantIds,
      config: matchConfig,
    }: MatchCoreFactoryContext) => createArenaV1RuleEngine({
      participantIds,
      config: matchConfig,
      authorityContent,
    }),
    mapSystemFactory: (context: MatchCoreMapFactoryContext) => (
      createArenaV1MapSystem({ ...context, authorityContent })
    ),
  });
}

const createCore = createArenaV2WeaponPhantomTigerFistReplayCore;

function releaseTickFor(
  scenario: ArenaV2WeaponPhantomTigerFistReplayScenario,
): number | null {
  if (scenario === 'early-release') return START_TICK + 8;
  if (scenario === 'committed-release') return START_TICK + COMMIT_TICKS;
  return null;
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponPhantomTigerFistReplayScenario,
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

function actionStateFor(
  snapshot: ArenaMatchSnapshot,
): ArenaV2WeaponPhantomTigerFistActionSample {
  const participant = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  if (!participant) throw new RangeError(`Replay 快照缺少 ${PLAYER_ID}。`);
  const phase = participant.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}`);
  }
  const commitmentStatus = participant.action.commitment?.status;
  if (
    commitmentStatus !== undefined
    && commitmentStatus !== 'charging'
    && commitmentStatus !== 'committed'
  ) {
    throw new RangeError(`Replay 快照包含未知承诺状态：${String(commitmentStatus)}`);
  }
  return Object.freeze({
    tick: snapshot.tick,
    phase,
    definitionId: participant.action.definitionId,
    commitmentStatus: commitmentStatus ?? null,
    chargeTicks: participant.action.commitment?.chargeTicks ?? 0,
    chargeLevel: participant.action.commitment?.chargeLevel ?? 0,
    positionX: participant.position.x,
    positionZ: participant.position.z,
  });
}

function actionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  return typeof event.action === 'string' ? event.action : null;
}

function createScenarioReplay(
  scenario: ArenaV2WeaponPhantomTigerFistReplayScenario,
): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponPhantomTigerFistActionSample[];
}> {
  const core = createCore({ seed: REPLAY_SEED, config: REPLAY_CONFIG });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponPhantomTigerFistActionSample[] = [];
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
  scenario: ArenaV2WeaponPhantomTigerFistReplayScenario,
): ArenaV2WeaponPhantomTigerFistScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  let actionStartTick: number | null = null;
  let commitmentOutcome: 'cancelled' | 'committed' | null = null;
  let commitmentTick: number | null = null;
  let firstHitTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (
      record.type === 'ActionStarted'
      && actionDefinitionId(record) === ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID
    ) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (
      (record.type === 'ActionCommitmentCancelled' || record.type === 'ActionCommitmentCommitted')
      && actionDefinitionId(record) === ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID
    ) {
      commitmentOutcome = record.type === 'ActionCommitmentCancelled' ? 'cancelled' : 'committed';
      commitmentTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (
      record.type === 'HitResolved'
      && actionDefinitionId(record) === ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID
    ) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  const expectedOutcome = scenario === 'committed-release' ? 'committed' : 'cancelled';
  if (commitmentOutcome !== expectedOutcome || commitmentTick === null) {
    throw new Error(`幻虎巨拳 ${scenario} 缺少承诺结算证据。`);
  }
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      actionStateFor(snapshot);
    },
  });
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`幻虎巨拳 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  if (scenario === 'committed-release' && firstHitTick === null) {
    throw new Error('幻虎巨拳成功提交后缺少正式命中证据。');
  }
  if (scenario !== 'committed-release' && firstHitTick !== null) {
    throw new Error(`幻虎巨拳 ${scenario} 不应产生命中。`);
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

export function runArenaV2WeaponPhantomTigerFistReplayPrototype(): ArenaV2WeaponPhantomTigerFistReplayPrototypeResult {
  return Object.freeze({
    candidateId: CANDIDATE_ID,
    weaponId: WEAPON_ID,
    groundActionDefinitionId: ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_GROUND_ACTION_ID,
    scenarios: Object.freeze(([
      'early-release',
      'committed-release',
      'expired-hold',
    ] as const).map(runScenario)),
  });
}
