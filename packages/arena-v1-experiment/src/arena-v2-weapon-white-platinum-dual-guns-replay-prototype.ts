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
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE,
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_GROUND_ACTION_ID,
} from './arena-v2-weapon-white-platinum-dual-guns-definition-prototype.js';

const CANDIDATE_ID = 'case-study-white-platinum-dual-guns';
const WEAPON_ID = ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE.weaponId;
const PLAYER_ID = 'player-1';
const TARGET_ID = 'player-2';
const REPLAY_SEED = 0x57504753;
const START_TICK = 1;
const ATTACKER_START_X = -1.2;
const TARGET_START_X = 0;

export type ArenaV2WeaponWhitePlatinumDualGunsReplayScenario =
  | 'ground-shot-hit'
  | 'ground-shot-line-escape';

export interface ArenaV2WeaponWhitePlatinumDualGunsActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly attackerPositionX: number;
  readonly targetPositionX: number;
}

export interface ArenaV2WeaponWhitePlatinumDualGunsScenarioResult {
  readonly scenario: ArenaV2WeaponWhitePlatinumDualGunsReplayScenario;
  readonly actionStartTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly feedback: Readonly<{
    readonly kind: 'line-hit' | 'line-escaped';
    readonly title: string;
    readonly explanation: string;
  }>;
  readonly actionStateSamples: readonly ArenaV2WeaponWhitePlatinumDualGunsActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponWhitePlatinumDualGunsReplayPrototypeResult {
  readonly candidateId: typeof CANDIDATE_ID;
  readonly weaponId: typeof WEAPON_ID;
  readonly groundActionDefinitionId: typeof ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponWhitePlatinumDualGunsScenarioResult[];
}

type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

function createAuthorityContent(): ResearchAuthorityContent {
  const base = createArenaV2WeaponCandidateContentRegistries({
    additionalActionDefinitions: [
      ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE.groundAction,
      ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE.aerialAction,
    ],
  });
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...base.equipmentRegistry.list(),
      ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE.equipment,
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

export function createArenaV2WeaponWhitePlatinumDualGunsReplayCore({
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

const replayMatch = createReplayMatch(createArenaV2WeaponWhitePlatinumDualGunsReplayCore);

function configFor(scenario: ArenaV2WeaponWhitePlatinumDualGunsReplayScenario) {
  const escaping = scenario === 'ground-shot-line-escape';
  return Object.freeze({
    participantIds: Object.freeze([PLAYER_ID, TARGET_ID]),
    livesPerParticipant: 1,
    preparingTicks: 0,
    suddenDeathStartTick: 40,
    hardLimitTicks: 68,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: 'white-platinum-dual-guns-replay-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: 6, y: 0.5, z: 3 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: ATTACKER_START_X, y: 1.02, z: 0 }),
        Object.freeze({ x: escaping ? 3.8 : TARGET_START_X, y: 1.02, z: 0 }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([Object.freeze({
        id: `white-platinum-dual-guns-replay-${scenario}`,
        definitionId: WEAPON_ID,
        position: Object.freeze({ x: ATTACKER_START_X, y: 1.02, z: 0 }),
      })]),
    }),
  });
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponWhitePlatinumDualGunsReplayScenario,
): readonly ArenaInputFrame[] {
  const escaping = scenario === 'ground-shot-line-escape';
  return Object.freeze(snapshot.participants.map(({ id }) => (
    id === PLAYER_ID
      ? Object.freeze({
        ...createNeutralInputFrame(snapshot.tick, id),
        primaryPressed: snapshot.tick === START_TICK,
      })
      : id === TARGET_ID
        ? Object.freeze({
          ...createNeutralInputFrame(snapshot.tick, id),
          moveX: escaping && snapshot.tick >= START_TICK ? 1 : 0,
        })
        : createNeutralInputFrame(snapshot.tick, id)
  )));
}

function actionStateFor(
  snapshot: ArenaMatchSnapshot,
): ArenaV2WeaponWhitePlatinumDualGunsActionSample {
  const attacker = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  const target = snapshot.participants.find(({ id }) => id === TARGET_ID);
  if (!attacker || !target) throw new RangeError('白金双枪 Replay 快照缺少参与者。');
  const phase = attacker.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}`);
  }
  return Object.freeze({
    tick: snapshot.tick,
    phase,
    definitionId: attacker.action.definitionId,
    attackerPositionX: attacker.position.x,
    targetPositionX: target.position.x,
  });
}

function actionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  return typeof event.action === 'string' ? event.action : null;
}

function createScenarioReplay(
  scenario: ArenaV2WeaponWhitePlatinumDualGunsReplayScenario,
): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponWhitePlatinumDualGunsActionSample[];
}> {
  const core = createArenaV2WeaponWhitePlatinumDualGunsReplayCore({
    seed: REPLAY_SEED,
    config: configFor(scenario),
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponWhitePlatinumDualGunsActionSample[] = [];
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
  scenario: ArenaV2WeaponWhitePlatinumDualGunsReplayScenario,
): ArenaV2WeaponWhitePlatinumDualGunsScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  let actionStartTick: number | null = null;
  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (
      record.type === 'ActionStarted'
      && actionDefinitionId(record) === ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_GROUND_ACTION_ID
    ) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
      if (actionStartTick !== null) {
        firstActiveTick = actionStartTick + ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE.groundAction.timing.windupTicks;
      }
    }
    if (
      record.type === 'HitResolved'
      && actionDefinitionId(record) === ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_GROUND_ACTION_ID
    ) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      actionStateFor(snapshot);
    },
  });
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`白金双枪 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  const escaped = firstHitTick === null;
  if (scenario === 'ground-shot-hit' && firstHitTick === null) {
    throw new Error('白金双枪地面点射命中场景缺少 HitResolved 证据。');
  }
  if (scenario === 'ground-shot-line-escape' && !escaped) {
    throw new Error('白金双枪离开攻击线场景不应命中。');
  }
  return Object.freeze({
    scenario,
    actionStartTick,
    firstActiveTick,
    firstHitTick,
    feedback: Object.freeze(escaped
      ? {
        kind: 'line-escaped' as const,
        title: '离开直线后挥空',
        explanation: '目标在点射有效窗口前横向离开，远程距离不等于自动追踪。',
      }
      : {
        kind: 'line-hit' as const,
        title: '直线点射命中',
        explanation: '目标留在攻击线内时命中，并产生低幅度位移与短暂控制。',
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

export function runArenaV2WeaponWhitePlatinumDualGunsReplayPrototype(): ArenaV2WeaponWhitePlatinumDualGunsReplayPrototypeResult {
  return Object.freeze({
    candidateId: CANDIDATE_ID,
    weaponId: WEAPON_ID,
    groundActionDefinitionId: ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_GROUND_ACTION_ID,
    scenarios: Object.freeze([
      runScenario('ground-shot-hit'),
      runScenario('ground-shot-line-escape'),
    ]),
  });
}
