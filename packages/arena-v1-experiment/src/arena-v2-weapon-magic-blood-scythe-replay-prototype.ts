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
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE,
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_GROUND_ACTION_ID,
} from './arena-v2-weapon-magic-blood-scythe-definition-prototype.js';

const CANDIDATE_ID = 'case-study-magic-blood-scythe';
const WEAPON_ID = ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.weaponId;
const PLAYER_ID = 'player-1';
const TARGET_ID = 'player-2';
const REPLAY_SEED = 0x4d425343;
const START_TICK = 1;
const ATTACKER_START_X = -1.2;
const TARGET_START_X = 0;

export type ArenaV2WeaponMagicBloodScytheReplayScenario =
  | 'ground-hit-safe'
  | 'ground-leaves-line'
  | 'ground-edge';

export interface ArenaV2WeaponMagicBloodScytheActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly positionX: number;
  readonly targetPositionX: number;
  readonly targetPositionY: number;
}

export interface ArenaV2WeaponMagicBloodScytheReplayScenarioResult {
  readonly scenario: ArenaV2WeaponMagicBloodScytheReplayScenario;
  readonly actionStartTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly fallTick: number | null;
  readonly targetHorizontalDisplacementAfterHit: number;
  readonly feedback: Readonly<{
    readonly kind: 'hit-safe' | 'attack-evaded' | 'hit-ring-out';
    readonly title: string;
    readonly explanation: string;
  }>;
  readonly actionStateSamples: readonly ArenaV2WeaponMagicBloodScytheActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponMagicBloodScytheReplayPrototypeResult {
  readonly candidateId: typeof CANDIDATE_ID;
  readonly weaponId: typeof WEAPON_ID;
  readonly groundActionDefinitionId: typeof ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponMagicBloodScytheReplayScenarioResult[];
}

type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

function createAuthorityContent(): ResearchAuthorityContent {
  const base = createArenaV2WeaponCandidateContentRegistries({
    additionalActionDefinitions: [
      ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.groundAction,
      ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.aerialAction,
    ],
  });
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...base.equipmentRegistry.list(),
      ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.equipment,
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

export function createArenaV2WeaponMagicBloodScytheReplayCore({
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

const replayMatch = createReplayMatch(createArenaV2WeaponMagicBloodScytheReplayCore);

function configFor(scenario: ArenaV2WeaponMagicBloodScytheReplayScenario) {
  const edge = scenario === 'ground-edge';
  const targetStartX = edge
    ? 2.05
    : scenario === 'ground-leaves-line'
      ? 3.2
      : TARGET_START_X;
  return Object.freeze({
    participantIds: Object.freeze([PLAYER_ID, TARGET_ID]),
    livesPerParticipant: 1,
    preparingTicks: 0,
    suddenDeathStartTick: edge ? 90 : 40,
    hardLimitTicks: edge ? 120 : 56,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: edge ? 'magic-blood-scythe-edge-platform' : 'magic-blood-scythe-replay-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: edge ? 2.5 : 6, y: 0.5, z: 3 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: edge ? 0 : ATTACKER_START_X, y: 1.02, z: 0 }),
        Object.freeze({ x: targetStartX, y: 1.02, z: 0 }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([Object.freeze({
        id: `magic-blood-scythe-replay-${scenario}`,
        definitionId: WEAPON_ID,
        position: Object.freeze({ x: edge ? 0 : ATTACKER_START_X, y: 1.02, z: 0 }),
      })]),
    }),
  });
}

function targetMoveXFor(
  scenario: ArenaV2WeaponMagicBloodScytheReplayScenario,
  tick: number,
): number {
  if (scenario !== 'ground-leaves-line') return 0;
  return tick >= 1 ? 1 : 0;
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponMagicBloodScytheReplayScenario,
): readonly ArenaInputFrame[] {
  return Object.freeze(snapshot.participants.map(({ id }) => (
    id === PLAYER_ID
      ? Object.freeze({
        ...createNeutralInputFrame(snapshot.tick, id),
        primaryPressed: snapshot.tick === START_TICK,
      })
      : id === TARGET_ID
        ? Object.freeze({
          ...createNeutralInputFrame(snapshot.tick, id),
          moveX: targetMoveXFor(scenario, snapshot.tick),
        })
        : createNeutralInputFrame(snapshot.tick, id)
  )));
}

function actionStateFor(
  snapshot: ArenaMatchSnapshot,
): ArenaV2WeaponMagicBloodScytheActionSample {
  const attacker = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  const target = snapshot.participants.find(({ id }) => id === TARGET_ID);
  if (!attacker || !target) throw new RangeError('魔血镰刃 Replay 快照缺少参与者。');
  const phase = attacker.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}`);
  }
  return Object.freeze({
    tick: snapshot.tick,
    phase,
    definitionId: attacker.action.definitionId,
    positionX: attacker.position.x,
    targetPositionX: target.position.x,
    targetPositionY: target.position.y,
  });
}

function actionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  return typeof event.action === 'string' ? event.action : null;
}

function createScenarioReplay(
  scenario: ArenaV2WeaponMagicBloodScytheReplayScenario,
): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponMagicBloodScytheActionSample[];
}> {
  const core = createArenaV2WeaponMagicBloodScytheReplayCore({
    seed: REPLAY_SEED,
    config: configFor(scenario),
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponMagicBloodScytheActionSample[] = [];
  try {
    while (core.phase !== 'ended') {
      const snapshot = core.getLegacyFullSnapshotForAudit();
      actionStateSamples.push(actionStateFor(snapshot));
      runner.step(inputFor(snapshot, scenario));
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

function runScenario(
  scenario: ArenaV2WeaponMagicBloodScytheReplayScenario,
): ArenaV2WeaponMagicBloodScytheReplayScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  let actionStartTick: number | null = null;
  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  let fallTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (record.type === 'ActionStarted' && actionDefinitionId(record) === ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_GROUND_ACTION_ID) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'HitResolved' && actionDefinitionId(record) === ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_GROUND_ACTION_ID) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'PlayerEliminated') {
      fallTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  firstActiveTick = actionStateSamples.find(({ phase }) => phase === 'active')?.tick ?? null;
  const hitSample = firstHitTick === null
    ? null
    : actionStateSamples.find(({ tick }) => tick === firstHitTick);
  const afterHitSample = firstHitTick === null
    ? null
    : actionStateSamples.find(({ tick }) => tick >= firstHitTick! + 3);
  const targetHorizontalDisplacementAfterHit = hitSample && afterHitSample
    ? Math.abs(afterHitSample.targetPositionX - hitSample.targetPositionX)
    : 0;
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      actionStateFor(snapshot);
    },
  });
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`魔血镰刃 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  if (actionStartTick === null || firstActiveTick === null) {
    throw new Error(`魔血镰刃 ${scenario} 缺少动作开始或 active 证据。`);
  }
  if (scenario === 'ground-hit-safe' && firstHitTick === null) {
    throw new Error('魔血镰刃安全地面场景应产生命中证据。');
  }
  if (scenario === 'ground-leaves-line' && firstHitTick !== null) {
    throw new Error('魔血镰刃离开攻击线场景不应继续产生命中。');
  }
  if (scenario === 'ground-edge' && (firstHitTick === null || fallTick === null)) {
    throw new Error('魔血镰刃边缘场景必须同时产生命中与击落证据。');
  }
  return Object.freeze({
    scenario,
    actionStartTick,
    firstActiveTick,
    firstHitTick,
    fallTick,
    targetHorizontalDisplacementAfterHit,
    feedback: fallTick !== null
      ? Object.freeze({
        kind: 'hit-ring-out',
        title: '命中·支撑面丢失',
        explanation: '宽覆盖命中后，目标是否掉落由 MatchCore 的击退、支撑面和淘汰规则共同决定。',
      })
      : firstHitTick !== null
        ? Object.freeze({
          kind: 'hit-safe',
          title: '命中·仍保留支撑面',
          explanation: '命中反馈同时保留目标位置变化；没有把宽覆盖误报为自动追踪或必杀。',
        })
        : Object.freeze({
          kind: 'attack-evaded',
          title: '未命中·路线已离开',
          explanation: '目标在 active 前离开攻击线后，范围不会自动转向，攻击者承担恢复与冷却。',
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

export function runArenaV2WeaponMagicBloodScytheReplayPrototype(): ArenaV2WeaponMagicBloodScytheReplayPrototypeResult {
  return Object.freeze({
    candidateId: CANDIDATE_ID,
    weaponId: WEAPON_ID,
    groundActionDefinitionId: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_GROUND_ACTION_ID,
    scenarios: Object.freeze(([
      'ground-hit-safe',
      'ground-leaves-line',
      'ground-edge',
    ] as const).map(runScenario)),
  });
}
