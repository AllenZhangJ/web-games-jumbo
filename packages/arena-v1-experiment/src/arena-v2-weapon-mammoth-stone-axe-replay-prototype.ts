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
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE,
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_GROUND_ACTION_ID,
} from './arena-v2-weapon-mammoth-stone-axe-definition-prototype.js';

const CANDIDATE_ID = 'case-study-mammoth-stone-axe';
const WEAPON_ID = ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.weaponId;
const PLAYER_ID = 'player-1';
const TARGET_ID = 'player-2';
const REPLAY_SEED = 0x4d534158;
const START_TICK = 1;
const ATTACKER_START_X = -1.2;
const TARGET_START_X = 0;

export type ArenaV2WeaponMammothStoneAxeReplayScenario =
  | 'ground-hit-safe'
  | 'ground-leaves-line'
  | 'ground-edge';

export interface ArenaV2WeaponMammothStoneAxeActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly positionX: number;
  readonly targetPositionX: number;
  readonly targetPositionY: number;
}

export interface ArenaV2WeaponMammothStoneAxeReplayScenarioResult {
  readonly scenario: ArenaV2WeaponMammothStoneAxeReplayScenario;
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
  readonly actionStateSamples: readonly ArenaV2WeaponMammothStoneAxeActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponMammothStoneAxeReplayPrototypeResult {
  readonly candidateId: typeof CANDIDATE_ID;
  readonly weaponId: typeof WEAPON_ID;
  readonly groundActionDefinitionId: typeof ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponMammothStoneAxeReplayScenarioResult[];
}

type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

function createAuthorityContent(): ResearchAuthorityContent {
  const base = createArenaV2WeaponCandidateContentRegistries({
    additionalActionDefinitions: [
      ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.groundAction,
      ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.aerialAction,
    ],
  });
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...base.equipmentRegistry.list(),
      ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.equipment,
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

export function createArenaV2WeaponMammothStoneAxeReplayCore({
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

const replayMatch = createReplayMatch(createArenaV2WeaponMammothStoneAxeReplayCore);

function configFor(scenario: ArenaV2WeaponMammothStoneAxeReplayScenario) {
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
    hardLimitTicks: edge ? 140 : 68,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: edge ? 'mammoth-stone-axe-edge-platform' : 'mammoth-stone-axe-replay-platform',
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
        id: `mammoth-stone-axe-replay-${scenario}`,
        definitionId: WEAPON_ID,
        position: Object.freeze({ x: edge ? 0 : ATTACKER_START_X, y: 1.02, z: 0 }),
      })]),
    }),
  });
}

function targetMoveXFor(
  scenario: ArenaV2WeaponMammothStoneAxeReplayScenario,
  tick: number,
): number {
  if (scenario !== 'ground-leaves-line') return 0;
  return tick >= 1 ? 1 : 0;
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponMammothStoneAxeReplayScenario,
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
): ArenaV2WeaponMammothStoneAxeActionSample {
  const attacker = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  const target = snapshot.participants.find(({ id }) => id === TARGET_ID);
  if (!attacker || !target) throw new RangeError('猛犸石斧 Replay 快照缺少参与者。');
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
  scenario: ArenaV2WeaponMammothStoneAxeReplayScenario,
): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponMammothStoneAxeActionSample[];
}> {
  const core = createArenaV2WeaponMammothStoneAxeReplayCore({
    seed: REPLAY_SEED,
    config: configFor(scenario),
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponMammothStoneAxeActionSample[] = [];
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
  scenario: ArenaV2WeaponMammothStoneAxeReplayScenario,
): ArenaV2WeaponMammothStoneAxeReplayScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  let actionStartTick: number | null = null;
  let firstHitTick: number | null = null;
  let fallTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (record.type === 'ActionStarted' && actionDefinitionId(record) === ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_GROUND_ACTION_ID) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'HitResolved' && actionDefinitionId(record) === ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_GROUND_ACTION_ID) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'PlayerEliminated') {
      fallTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  const firstActiveTick = actionStateSamples.find(({ phase }) => phase === 'active')?.tick ?? null;
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
    throw new Error(`猛犸石斧 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  if (actionStartTick === null || firstActiveTick === null) {
    throw new Error(`猛犸石斧 ${scenario} 缺少动作开始或 active 证据。`);
  }
  if (scenario === 'ground-hit-safe' && firstHitTick === null) {
    throw new Error('猛犸石斧安全地面场景应产生命中证据。');
  }
  if (scenario === 'ground-leaves-line' && firstHitTick !== null) {
    throw new Error('猛犸石斧离开攻击线场景不应继续产生命中。');
  }
  if (scenario === 'ground-edge' && (firstHitTick === null || fallTick === null)) {
    throw new Error('猛犸石斧边缘场景必须同时产生命中与击落证据。');
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
        explanation: '重击命中后的位移是否击落目标由 MatchCore 的支撑面和淘汰规则共同决定。',
      })
      : firstHitTick !== null
        ? Object.freeze({
          kind: 'hit-safe',
          title: '命中·仍保留支撑面',
          explanation: '重击的价值显示为路线位移与控制，而不是未经验证的固定伤害。',
        })
        : Object.freeze({
          kind: 'attack-evaded',
          title: '未命中·预判落点失败',
          explanation: '目标在动作生效前离开攻击线后，攻击者承担长前摇和恢复，不会自动追踪。',
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

export function runArenaV2WeaponMammothStoneAxeReplayPrototype(): ArenaV2WeaponMammothStoneAxeReplayPrototypeResult {
  return Object.freeze({
    candidateId: CANDIDATE_ID,
    weaponId: WEAPON_ID,
    groundActionDefinitionId: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_GROUND_ACTION_ID,
    scenarios: Object.freeze(([
      'ground-hit-safe',
      'ground-leaves-line',
      'ground-edge',
    ] as const).map(runScenario)),
  });
}
