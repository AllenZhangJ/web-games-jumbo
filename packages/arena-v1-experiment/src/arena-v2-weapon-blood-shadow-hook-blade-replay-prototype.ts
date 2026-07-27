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
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE,
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_GROUND_ACTION_ID,
} from './arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.js';

const CANDIDATE_ID = 'case-study-blood-shadow-hook-blade';
const WEAPON_ID = ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE.weaponId;
const PLAYER_ID = 'player-1';
const TARGET_ID = 'player-2';
const REPLAY_SEED = 0x42534842;
const START_TICK = 1;
const TURN_TICK = 8;
const SECOND_TURN_TICK = 10;
const ATTACKER_START_X = -1.2;
const TARGET_START_X = 0;

export type ArenaV2WeaponBloodShadowHookBladeReplayScenario =
  | 'target-keeps-facing-away'
  | 'target-turns-to-attacker'
  | 'target-turns-back-before-active';

export interface ArenaV2WeaponBloodShadowHookBladeActionSample {
  readonly tick: number;
  readonly phase: 'idle' | 'windup' | 'active' | 'recovery';
  readonly definitionId: string | null;
  readonly ticksRemaining: number;
  readonly targetFacingX: number;
  readonly attackerPosition: Readonly<{ readonly x: number; readonly z: number }>;
  readonly targetPosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
}

export interface ArenaV2WeaponBloodShadowHookBladeReplayScenarioResult {
  readonly scenario: ArenaV2WeaponBloodShadowHookBladeReplayScenario;
  readonly actionStartTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly targetFacingAtActive: number | null;
  readonly targetHorizontalDisplacementAfterHit: number;
  readonly feedback: Readonly<{
    readonly kind: 'hit-pull' | 'attack-evaded';
    readonly title: string;
    readonly explanation: string;
  }>;
  readonly actionStateSamples: readonly ArenaV2WeaponBloodShadowHookBladeActionSample[];
  readonly replaySchemaVersion: number;
  readonly matchSeed: number;
  readonly checkpointCount: number;
  readonly inputFrameCount: number;
  readonly finalHash: string;
  readonly replayVerified: true;
}

export interface ArenaV2WeaponBloodShadowHookBladeReplayPrototypeResult {
  readonly candidateId: typeof CANDIDATE_ID;
  readonly weaponId: typeof WEAPON_ID;
  readonly groundActionDefinitionId: typeof ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_GROUND_ACTION_ID;
  readonly scenarios: readonly ArenaV2WeaponBloodShadowHookBladeReplayScenarioResult[];
}

type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

function createAuthorityContent(): ResearchAuthorityContent {
  const base = createArenaV2WeaponCandidateContentRegistries({
    additionalActionDefinitions: [
      ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE.groundAction,
      ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE.aerialAction,
    ],
  });
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...base.equipmentRegistry.list(),
      ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE.equipment,
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

export function createArenaV2WeaponBloodShadowHookBladeReplayCore({
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

const replayMatch = createReplayMatch(createArenaV2WeaponBloodShadowHookBladeReplayCore);

function configFor() {
  return Object.freeze({
    participantIds: Object.freeze([PLAYER_ID, TARGET_ID]),
    livesPerParticipant: 1,
    preparingTicks: 0,
    suddenDeathStartTick: 40,
    hardLimitTicks: 48,
    contextPrimaryMobilityEnabled: false,
    arena: Object.freeze({
      killY: -5,
      surfaces: Object.freeze([Object.freeze({
        id: 'blood-shadow-hook-blade-replay-platform',
        center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
        halfExtents: Object.freeze({ x: 6, y: 0.5, z: 3 }),
      })]),
      spawns: Object.freeze([
        Object.freeze({ x: ATTACKER_START_X, y: 1.02, z: 0 }),
        Object.freeze({ x: TARGET_START_X, y: 1.02, z: 0 }),
      ]),
    }),
    equipment: Object.freeze({
      initialSpawns: Object.freeze([Object.freeze({
        id: 'blood-shadow-hook-blade-replay-spawn',
        definitionId: WEAPON_ID,
        position: Object.freeze({ x: ATTACKER_START_X, y: 1.02, z: 0 }),
      })]),
    }),
  });
}

function targetMoveXFor(
  scenario: ArenaV2WeaponBloodShadowHookBladeReplayScenario,
  tick: number,
): number {
  if (tick === 0) return 1;
  if (scenario === 'target-turns-to-attacker' && tick === TURN_TICK) return -1;
  if (scenario === 'target-turns-back-before-active' && tick === TURN_TICK) return -1;
  if (scenario === 'target-turns-back-before-active' && tick === SECOND_TURN_TICK) return 1;
  return 0;
}

function inputFor(
  snapshot: ArenaMatchSnapshot,
  scenario: ArenaV2WeaponBloodShadowHookBladeReplayScenario,
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
): ArenaV2WeaponBloodShadowHookBladeActionSample {
  const attacker = snapshot.participants.find(({ id }) => id === PLAYER_ID);
  const target = snapshot.participants.find(({ id }) => id === TARGET_ID);
  if (!attacker || !target) throw new RangeError('血影钩刃 Replay 快照缺少参与者。');
  const phase = attacker.action.phase;
  if (phase !== 'idle' && phase !== 'windup' && phase !== 'active' && phase !== 'recovery') {
    throw new RangeError(`Replay 快照包含未知动作阶段：${String(phase)}`);
  }
  return Object.freeze({
    tick: snapshot.tick,
    phase,
    definitionId: attacker.action.definitionId,
    ticksRemaining: attacker.action.ticksRemaining,
    targetFacingX: target.facing.x,
    attackerPosition: Object.freeze({ x: attacker.position.x, z: attacker.position.z }),
    targetPosition: Object.freeze({ x: target.position.x, y: target.position.y, z: target.position.z }),
  });
}

function actionDefinitionId(event: Readonly<Record<string, unknown>>): string | null {
  return typeof event.action === 'string' ? event.action : null;
}

function createScenarioReplay(
  scenario: ArenaV2WeaponBloodShadowHookBladeReplayScenario,
): Readonly<{
  replay: ArenaReplay;
  actionStateSamples: readonly ArenaV2WeaponBloodShadowHookBladeActionSample[];
}> {
  const core = createArenaV2WeaponBloodShadowHookBladeReplayCore({
    seed: REPLAY_SEED,
    config: configFor(),
  });
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 6 });
  const actionStateSamples: ArenaV2WeaponBloodShadowHookBladeActionSample[] = [];
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
  scenario: ArenaV2WeaponBloodShadowHookBladeReplayScenario,
): ArenaV2WeaponBloodShadowHookBladeReplayScenarioResult {
  const { replay, actionStateSamples } = createScenarioReplay(scenario);
  let actionStartTick: number | null = null;
  let firstHitTick: number | null = null;
  for (const event of replay.events) {
    const record = event as Readonly<Record<string, unknown>>;
    if (record.type === 'ActionStarted' && actionDefinitionId(record) === ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_GROUND_ACTION_ID) {
      actionStartTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
    if (record.type === 'HitResolved' && actionDefinitionId(record) === ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_GROUND_ACTION_ID) {
      firstHitTick ??= typeof record.tick === 'number' ? record.tick : null;
    }
  }
  const activeSample = actionStateSamples.find(({ phase }) => phase === 'active');
  const afterHitSample = firstHitTick === null
    ? null
    : actionStateSamples.find(({ tick }) => tick >= firstHitTick! + 3);
  const hitSample = firstHitTick === null
    ? null
    : actionStateSamples.find(({ tick }) => tick === firstHitTick);
  const targetHorizontalDisplacementAfterHit = hitSample && afterHitSample
    ? Math.hypot(
      afterHitSample.targetPosition.x - hitSample.targetPosition.x,
      afterHitSample.targetPosition.z - hitSample.targetPosition.z,
    )
    : 0;
  const verification = replayMatch(replay, {
    beforeStep: ({ snapshot }) => {
      actionStateFor(snapshot);
    },
  });
  if (verification.finalHash !== replay.finalHash) {
    throw new Error(`血影钩刃 ${scenario} Replay 验证后的最终 hash 不一致。`);
  }
  if (actionStartTick === null || activeSample === undefined) {
    throw new Error(`血影钩刃 ${scenario} 缺少动作开始或 active 证据。`);
  }
  if (scenario === 'target-keeps-facing-away' && firstHitTick === null) {
    throw new Error('目标保持背向时应产生命中证据。');
  }
  if (scenario === 'target-turns-to-attacker' && firstHitTick !== null) {
    throw new Error('目标转身正面后不应继续产生命中。');
  }
  if (scenario === 'target-turns-back-before-active' && firstHitTick === null) {
    throw new Error('目标在 active 前转回背向后应恢复命中。');
  }
  return Object.freeze({
    scenario,
    actionStartTick,
    firstActiveTick: activeSample.tick,
    firstHitTick,
    targetFacingAtActive: activeSample.targetFacingX,
    targetHorizontalDisplacementAfterHit,
    feedback: firstHitTick === null
      ? Object.freeze({
        kind: 'attack-evaded',
        title: '未命中·目标已转身',
        explanation: '血影钩刃的背向条件没有成立，扩大范围不能替代目标朝向判断。',
      })
      : Object.freeze({
        kind: 'hit-pull',
        title: '命中·距离被拉近',
        explanation: '命中结果不只显示受击，还显示目标相对位置被拉向攻击者。',
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

export function runArenaV2WeaponBloodShadowHookBladeReplayPrototype(): ArenaV2WeaponBloodShadowHookBladeReplayPrototypeResult {
  return Object.freeze({
    candidateId: CANDIDATE_ID,
    weaponId: WEAPON_ID,
    groundActionDefinitionId: ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_GROUND_ACTION_ID,
    scenarios: Object.freeze(([
      'target-keeps-facing-away',
      'target-turns-to-attacker',
      'target-turns-back-before-active',
    ] as const).map(runScenario)),
  });
}
