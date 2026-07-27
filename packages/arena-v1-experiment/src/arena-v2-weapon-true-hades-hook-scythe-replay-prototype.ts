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
import { EquipmentRegistry } from '@number-strategy-jump/arena-definitions';
import type {
  MatchCoreFactoryContext,
  MatchCoreMapFactoryContext,
} from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE,
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_GROUND_ACTION_ID,
} from './arena-v2-weapon-true-hades-hook-scythe-definition-prototype.js';

const CANDIDATE_ID = 'case-study-true-hades-hook-scythe';
const WEAPON_ID = ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.weaponId;
const PLAYER_ID = 'player-1';
const TARGET_ID = 'player-2';
const REPLAY_SEED = 0x54485343;
const START_TICK = 1;
const COMMIT_TICKS = 8;
const PLAYER_START_X = -1.2;
const TARGET_START_X = 0;

export type ArenaV2WeaponTrueHadesHookScytheReplayScenario =
  | 'early-release'
  | 'committed-release'
  | 'expired-hold'
  | 'committed-edge';

export interface ArenaV2WeaponTrueHadesHookScytheActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly commitmentStatus: 'charging' | 'committed' | null;
  readonly chargeTicks: number;
  readonly chargeLevel: number;
  readonly positionX: number;
  readonly positionZ: number;
  readonly targetPositionX: number;
}

export interface ArenaV2WeaponTrueHadesHookScytheReplayScenarioResult {
  readonly scenario: ArenaV2WeaponTrueHadesHookScytheReplayScenario;
  readonly actionStartTick: number | null;
  readonly commitmentOutcome: 'cancelled' | 'committed';
  readonly commitmentTick: number;
  readonly firstHitTick: number | null;
  readonly fallTick: number | null;
  readonly targetHorizontalDisplacement: number;
  readonly feedback: Readonly<{
    readonly kind: 'commitment-cancelled' | 'hit-safe' | 'hit-ring-out';
    readonly title: string;
    readonly explanation: string;
  }>;
  readonly actionStateSamples: readonly ArenaV2WeaponTrueHadesHookScytheActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponTrueHadesHookScytheReplayPrototypeResult {
  readonly candidateId: typeof CANDIDATE_ID;
  readonly weaponId: typeof WEAPON_ID;
  readonly groundActionDefinitionId: typeof ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponTrueHadesHookScytheReplayScenarioResult[];
}

type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

function createAuthorityContent(): ResearchAuthorityContent {
  const base = createArenaV2WeaponCandidateContentRegistries({
    additionalActionDefinitions: [
      ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.groundAction,
      ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.aerialAction,
    ],
  });
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...base.equipmentRegistry.list(),
      ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE.equipment,
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

export function createArenaV2WeaponTrueHadesHookScytheReplayCore({
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

const replayMatch = createReplayMatch(createArenaV2WeaponTrueHadesHookScytheReplayCore);

function configFor(scenario: ArenaV2WeaponTrueHadesHookScytheReplayScenario) {
  const edge = scenario === 'committed-edge';
  return Object.freeze({
    participantIds: Object.freeze([PLAYER_ID, TARGET_ID]),
    livesPerParticipant: 1,
    preparingTicks: 0,
    suddenDeathStartTick: edge ? 90 : 40,
    hardLimitTicks: edge ? 120 : 48,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: edge ? 'true-hades-edge-platform' : 'true-hades-replay-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: edge ? 2.5 : 6, y: 0.5, z: 3 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: edge ? 0 : PLAYER_START_X, y: 1.02, z: 0 }),
        Object.freeze({ x: edge ? 2.05 : TARGET_START_X, y: 1.02, z: 0 }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([Object.freeze({
        id: `true-hades-hook-scythe-replay-${scenario}`,
        definitionId: WEAPON_ID,
        position: Object.freeze({ x: edge ? 0 : PLAYER_START_X, y: 1.02, z: 0 }),
      })]),
    }),
  });
}

function releaseTickFor(
  scenario: ArenaV2WeaponTrueHadesHookScytheReplayScenario,
): number | null {
  if (scenario === 'early-release') return START_TICK + 4;
  if (scenario === 'committed-release' || scenario === 'committed-edge') {
    return START_TICK + COMMIT_TICKS;
  }
  return null;
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponTrueHadesHookScytheReplayScenario,
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
): ArenaV2WeaponTrueHadesHookScytheActionSample {
  const attacker = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  const target = snapshot.participants.find(({ id }) => id === TARGET_ID);
  if (!attacker || !target) throw new RangeError('真·哈迪斯钩镰 Replay 快照缺少参与者。');
  const phase = attacker.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}`);
  }
  const commitmentStatus = attacker.action.commitment?.status;
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
    definitionId: attacker.action.definitionId,
    commitmentStatus: commitmentStatus ?? null,
    chargeTicks: attacker.action.commitment?.chargeTicks ?? 0,
    chargeLevel: attacker.action.commitment?.chargeLevel ?? 0,
    positionX: attacker.position.x,
    positionZ: attacker.position.z,
    targetPositionX: target.position.x,
  });
}

function actionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  return typeof event.action === 'string' ? event.action : null;
}

function createScenarioReplay(
  scenario: ArenaV2WeaponTrueHadesHookScytheReplayScenario,
): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponTrueHadesHookScytheActionSample[];
}> {
  const core = createArenaV2WeaponTrueHadesHookScytheReplayCore({
    seed: REPLAY_SEED,
    config: configFor(scenario),
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponTrueHadesHookScytheActionSample[] = [];
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

function eventTick(
  replay: ArenaReplay,
  type: string,
): number | null {
  const event = replay.events.find((candidate) => {
    const record = candidate as Readonly<Record<string, unknown>>;
    return record.type === type && (
      type === 'PlayerEliminated'
      || actionDefinitionId(record) === ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_GROUND_ACTION_ID
    );
  });
  if (!event) return null;
  const tick = (event as Readonly<Record<string, unknown>>).tick;
  return typeof tick === 'number' ? tick : null;
}

function runScenario(
  scenario: ArenaV2WeaponTrueHadesHookScytheReplayScenario,
): ArenaV2WeaponTrueHadesHookScytheReplayScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  const actionStartTick = eventTick(replay, 'ActionStarted');
  const firstHitTick = eventTick(replay, 'HitResolved');
  const fallTick = eventTick(replay, 'PlayerEliminated');
  const commitmentEvent = replay.events.find((candidate) => {
    const record = candidate as Readonly<Record<string, unknown>>;
    return (
      (record.type === 'ActionCommitmentCancelled' || record.type === 'ActionCommitmentCommitted')
      && actionDefinitionId(record) === ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_GROUND_ACTION_ID
    );
  }) as Readonly<Record<string, unknown>> | undefined;
  if (!commitmentEvent || typeof commitmentEvent.tick !== 'number') {
    throw new Error(`真·哈迪斯钩镰 ${scenario} 缺少承诺结算证据。`);
  }
  const commitmentOutcome = commitmentEvent.type === 'ActionCommitmentCancelled'
    ? 'cancelled'
    : 'committed';
  const firstPosition = actionStateSamples[0]?.targetPositionX ?? TARGET_START_X;
  const finalPosition = actionStateSamples.at(-1)?.targetPositionX ?? firstPosition;
  const targetHorizontalDisplacement = Math.abs(finalPosition - firstPosition);
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      actionStateFor(snapshot);
    },
  });
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`真·哈迪斯钩镰 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  const expectedOutcome = scenario === 'committed-release' || scenario === 'committed-edge'
    ? 'committed'
    : 'cancelled';
  if (commitmentOutcome !== expectedOutcome) {
    throw new Error(`真·哈迪斯钩镰 ${scenario} 的承诺结果不符合预期。`);
  }
  if ((scenario === 'early-release' || scenario === 'expired-hold') && firstHitTick !== null) {
    throw new Error(`真·哈迪斯钩镰 ${scenario} 不应产生命中。`);
  }
  if ((scenario === 'committed-release' || scenario === 'committed-edge') && firstHitTick === null) {
    throw new Error(`真·哈迪斯钩镰 ${scenario} 缺少提交后的命中证据。`);
  }
  if (scenario === 'committed-edge' && fallTick === null) {
    throw new Error('真·哈迪斯钩镰边缘场景必须产生击落证据。');
  }
  return Object.freeze({
    scenario,
    actionStartTick,
    commitmentOutcome,
    commitmentTick: commitmentEvent.tick,
    firstHitTick,
    fallTick,
    targetHorizontalDisplacement,
    feedback: commitmentOutcome === 'cancelled'
      ? Object.freeze({
        kind: 'commitment-cancelled',
        title: '承诺取消·没有自动补偿',
        explanation: '提前释放或持续等待到期都会取消强招，前段未成立时不会自动派生后段。',
      })
      : fallTick !== null
        ? Object.freeze({
          kind: 'hit-ring-out',
          title: '命中·支撑面丢失',
          explanation: '高承诺冲击改变目标位置，边缘结果来自 MatchCore 与物理支撑面，而不是表现层猜测。',
        })
        : Object.freeze({
          kind: 'hit-safe',
          title: '命中·仍保留支撑面',
          explanation: '命中与淘汰分开反馈；目标仍在平台上时，后续位置决策仍然存在。',
        }),
    actionStateSamples: Object.freeze(actionStateSamples),
    replaySchemaVersion: replay.replaySchemaVersion,
    matchSeed: replay.matchSeed,
    checkpointCount: replay.checkpoints.length,
    inputFrameCount: replay.inputFrames.length,
    finalHash: replay.finalHash,
    replayVerified: true,
  });
}

export function runArenaV2WeaponTrueHadesHookScytheReplayPrototype(): ArenaV2WeaponTrueHadesHookScytheReplayPrototypeResult {
  return Object.freeze({
    candidateId: CANDIDATE_ID,
    weaponId: WEAPON_ID,
    groundActionDefinitionId: ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_GROUND_ACTION_ID,
    scenarios: Object.freeze(([
      'early-release',
      'committed-release',
      'expired-hold',
      'committed-edge',
    ] as const).map(runScenario)),
  });
}
