import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  ActionRegistry,
  EquipmentRegistry,
  EQUIPMENT_DEFINITION_SCHEMA_VERSION,
  EQUIPMENT_DROP_FALLBACK,
  EQUIPMENT_DROP_POLICY,
  EQUIPMENT_PICKUP_MODE,
  createActionDefinition,
  createEquipmentDefinition,
  type ActionDefinition,
  type ActionCommitmentDefinition,
  type EquipmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  type ArenaInputFrame,
  createNeutralInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  type ArenaRuleEngineContract,
  type RuleActor,
} from '@number-strategy-jump/arena-core';
import {
  createArenaV1MatchConfig,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import {
  createArenaV1CharacterRegistry,
  createArenaV1MapRegistry,
  createStage4ContentRegistries,
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE6_MOVEMENT_ACTION_DEFINITIONS,
} from '@number-strategy-jump/arena-v1-content';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import { ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID } from './arena-v2-weapon-function-language.js';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);
const PROBE_TICKS = 180;
type ResearchAuthorityContent = NonNullable<
  Parameters<typeof createArenaV1RuleEngine>[0]['authorityContent']
>;

export type ArenaV2WeaponLanguageProbePolicy = 'hold' | 'step-out';

export type ArenaV2WeaponLanguageProbeOutcome = 'hit' | 'miss';

export interface ArenaV2WeaponLanguageProbeResult {
  readonly weaponId: string;
  readonly languageId: string;
  readonly actionDefinitionId: string;
  readonly policy: ArenaV2WeaponLanguageProbePolicy;
  readonly responseTicks: number;
  readonly actionStartedTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly horizontalImpulse: number;
  readonly outcome: ArenaV2WeaponLanguageProbeOutcome;
}

export interface ArenaV2WeaponLanguagePrototypeResult {
  readonly candidateCount: number;
  readonly policies: readonly ArenaV2WeaponLanguageProbePolicy[];
  readonly results: readonly ArenaV2WeaponLanguageProbeResult[];
  readonly persistentAreaEffectImplemented: false;
}

export interface ArenaV2WeaponLanguageCandidate {
  readonly weaponId: string;
  readonly languageId: string;
  readonly groundAction: ActionDefinition;
  readonly aerialAction: ActionDefinition;
  readonly equipment: EquipmentDefinition;
  readonly targetDistance: number;
  readonly responseTicks: number;
}

interface AttackDefinitionInput {
  readonly id: string;
  readonly targeting: Readonly<{ kind: string; parameters: Readonly<Record<string, unknown>> }>;
  readonly timing: Readonly<{
    windupTicks: number;
    activeTicks: number;
    recoveryTicks: number;
    cooldownTicks: number;
  }>;
  readonly targetGroundKnockbackDistance: number;
  readonly verticalImpulse: number;
  readonly hitstunTicks: number;
  readonly tags: readonly string[];
  readonly commitment?: ActionCommitmentDefinition;
}

function attackDefinition(input: AttackDefinitionInput): ActionDefinition {
  return createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: input.id,
    kind: 'research-language-attack',
    input: {
      channel: ACTION_INPUT_CHANNEL.PRIMARY,
      trigger: ACTION_INPUT_TRIGGER.PRESSED,
    },
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['research-language-commitment'],
    timing: input.timing,
    ...(input.commitment ? { commitment: input.commitment } : {}),
    targeting: input.targeting,
    effects: [
      {
        id: `${input.id}-interrupt`,
        kind: 'interrupt-action',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {},
      },
      {
        id: `${input.id}-hitstun`,
        kind: 'apply-hitstun',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: { ticks: input.hitstunTicks },
      },
      {
        id: `${input.id}-impulse`,
        kind: 'apply-directional-impulse',
        trigger: ACTION_EFFECT_TRIGGER.HIT_RESOLVED,
        parameters: {
          horizontalImpulse: Math.sqrt(
            2 * ARENA_GAMEPLAY_V2_TUNING.physics.standardGroundDeceleration
              * input.targetGroundKnockbackDistance,
          ),
          verticalImpulse: input.verticalImpulse,
        },
      },
    ],
    tags: input.tags,
  });
}

function equipmentDefinition({
  id,
  groundActionId,
  aerialActionId,
  languageId,
}: Readonly<{
  id: string;
  groundActionId: string;
  aerialActionId: string;
  languageId: string;
}>): EquipmentDefinition {
  return createEquipmentDefinition({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    id,
    category: 'research-language',
    slot: 'primary',
    actionDefinitionId: groundActionId,
    aerialActionDefinitionId: aerialActionId,
    pickup: {
      mode: EQUIPMENT_PICKUP_MODE.AUTOMATIC,
      radius: ARENA_GAMEPLAY_V2_TUNING.equipment.automaticPickupRadius,
    },
    drop: {
      onOwnerEliminated: EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION,
      invalidPositionFallback: EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN,
    },
    presentationSemantic: `research-${languageId}`,
    tags: ['research', 'v2-language'],
  });
}

export function createArenaV2WeaponLanguageCandidates(): readonly ArenaV2WeaponLanguageCandidate[] {
  const lineGround = attackDefinition({
    id: 'research-line-pressure-ground',
    targeting: {
      kind: 'facing-cone',
      parameters: { range: 5.5, minimumFacingDot: 0.8, maximumVerticalDifference: 1.5 },
    },
    timing: { windupTicks: 8, activeTicks: 3, recoveryTicks: 18, cooldownTicks: 60 },
    targetGroundKnockbackDistance: 0.55,
    verticalImpulse: 2.2,
    hitstunTicks: 12,
    tags: ['line-pressure', 'ground'],
  });
  const lineAir = attackDefinition({
    id: 'research-line-pressure-aerial',
    targeting: {
      kind: 'downward-cylinder',
      parameters: { range: 3, radius: 1.1, minimumVerticalDrop: 0, maximumVerticalDifference: 3 },
    },
    timing: { windupTicks: 6, activeTicks: 4, recoveryTicks: 20, cooldownTicks: 60 },
    targetGroundKnockbackDistance: 0.7,
    verticalImpulse: 2.8,
    hitstunTicks: 14,
    tags: ['line-pressure', 'aerial'],
  });
  const zoneGround = attackDefinition({
    id: 'research-zone-denial-ground',
    targeting: {
      kind: 'facing-capsule',
      parameters: { range: 4, radius: 1.2, maximumVerticalDifference: 1.5 },
    },
    timing: { windupTicks: 24, activeTicks: 3, recoveryTicks: 18, cooldownTicks: 96 },
    targetGroundKnockbackDistance: 0.8,
    verticalImpulse: 2.5,
    hitstunTicks: 18,
    tags: ['zone-denial', 'warning', 'ground'],
  });
  const zoneAir = attackDefinition({
    id: 'research-zone-denial-aerial',
    targeting: {
      kind: 'downward-cylinder',
      parameters: { range: 3.2, radius: 1.4, minimumVerticalDrop: 0, maximumVerticalDifference: 3.2 },
    },
    timing: { windupTicks: 18, activeTicks: 4, recoveryTicks: 20, cooldownTicks: 96 },
    targetGroundKnockbackDistance: 0.9,
    verticalImpulse: 3,
    hitstunTicks: 20,
    tags: ['zone-denial', 'warning', 'aerial'],
  });
  const delayedGround = attackDefinition({
    id: 'research-delayed-heavy-ground',
    targeting: {
      kind: 'facing-cone',
      parameters: { range: 2.4, minimumFacingDot: 0.45, maximumVerticalDifference: 1.5 },
    },
    timing: { windupTicks: 30, activeTicks: 3, recoveryTicks: 30, cooldownTicks: 120 },
    targetGroundKnockbackDistance: 3.3,
    verticalImpulse: 6.5,
    hitstunTicks: 30,
    tags: ['delayed-heavy', 'warning', 'ground'],
  });
  const delayedAir = attackDefinition({
    id: 'research-delayed-heavy-aerial',
    targeting: {
      kind: 'downward-cylinder',
      parameters: { range: 3, radius: 1.3, minimumVerticalDrop: 0, maximumVerticalDifference: 3 },
    },
    timing: { windupTicks: 22, activeTicks: 4, recoveryTicks: 32, cooldownTicks: 120 },
    targetGroundKnockbackDistance: 3.6,
    verticalImpulse: 7,
    hitstunTicks: 32,
    tags: ['delayed-heavy', 'warning', 'aerial'],
  });
  const readPunishGround = attackDefinition({
    id: 'research-read-punish-ground',
    targeting: {
      kind: 'facing-cone',
      parameters: { range: 3.2, minimumFacingDot: 0.75, maximumVerticalDifference: 1.5 },
    },
    timing: { windupTicks: 24, activeTicks: 2, recoveryTicks: 28, cooldownTicks: 96 },
    targetGroundKnockbackDistance: 2.4,
    verticalImpulse: 4.8,
    hitstunTicks: 24,
    tags: ['read-punish', 'active-frames', 'ground'],
    commitment: {
      commitTicks: 12,
      expireTicks: 18,
      expireOutcome: 'cancel',
      canTurn: true,
      levelThresholds: [6, 12],
    },
  });
  const readPunishAir = attackDefinition({
    id: 'research-read-punish-aerial',
    targeting: {
      kind: 'downward-cylinder',
      parameters: { range: 2.8, radius: 1.1, minimumVerticalDrop: 0, maximumVerticalDifference: 2.8 },
    },
    timing: { windupTicks: 20, activeTicks: 3, recoveryTicks: 30, cooldownTicks: 96 },
    targetGroundKnockbackDistance: 2.6,
    verticalImpulse: 5.4,
    hitstunTicks: 26,
    tags: ['read-punish', 'active-frames', 'aerial'],
    commitment: {
      commitTicks: 12,
      expireTicks: 18,
      expireOutcome: 'cancel',
      canTurn: true,
      levelThresholds: [6, 12],
    },
  });
  const flankGround = attackDefinition({
    id: 'research-flank-ground',
    targeting: {
      kind: 'rear-cone',
      parameters: { range: 3.4, minimumFacingDot: 0.65, maximumVerticalDifference: 1.5 },
    },
    timing: { windupTicks: 10, activeTicks: 3, recoveryTicks: 22, cooldownTicks: 72 },
    targetGroundKnockbackDistance: 2,
    verticalImpulse: 3.2,
    hitstunTicks: 16,
    tags: ['flank', 'directional', 'ground'],
  });
  const flankAir = attackDefinition({
    id: 'research-flank-aerial',
    targeting: {
      kind: 'rear-cone',
      parameters: { range: 2.8, minimumFacingDot: 0.6, maximumVerticalDifference: 2.8 },
    },
    timing: { windupTicks: 8, activeTicks: 3, recoveryTicks: 24, cooldownTicks: 72 },
    targetGroundKnockbackDistance: 2.2,
    verticalImpulse: 3.8,
    hitstunTicks: 18,
    tags: ['flank', 'directional', 'aerial'],
  });
  const definitions = [
    {
      weaponId: 'research-line-pressure',
      languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.LINE_PRESSURE,
      groundAction: lineGround,
      aerialAction: lineAir,
      targetDistance: 4,
      responseTicks: lineGround.timing.windupTicks,
    },
    {
      weaponId: 'research-zone-denial',
      languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL,
      groundAction: zoneGround,
      aerialAction: zoneAir,
      targetDistance: 2.8,
      responseTicks: zoneGround.timing.windupTicks,
    },
    {
      weaponId: 'research-delayed-heavy',
      languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.DELAYED_HEAVY,
      groundAction: delayedGround,
      aerialAction: delayedAir,
      targetDistance: 1.8,
      responseTicks: delayedGround.timing.windupTicks,
    },
    {
      weaponId: 'research-read-punish',
      languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.READ_PUNISH,
      groundAction: readPunishGround,
      aerialAction: readPunishAir,
      targetDistance: 2.2,
      responseTicks: readPunishGround.timing.windupTicks,
    },
    {
      weaponId: 'research-flank',
      languageId: ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK,
      groundAction: flankGround,
      aerialAction: flankAir,
      targetDistance: 2.3,
      responseTicks: flankGround.timing.windupTicks,
    },
  ] as const;
  return Object.freeze(definitions.map((definition) => Object.freeze({
    ...definition,
    equipment: equipmentDefinition({
      id: definition.weaponId,
      groundActionId: definition.groundAction.id,
      aerialActionId: definition.aerialAction.id,
      languageId: definition.languageId,
    }),
  })));
}

const CANDIDATES = createArenaV2WeaponLanguageCandidates();

export function createArenaV2WeaponLanguageResearchContent(): ResearchAuthorityContent {
  const base = createStage4ContentRegistries({
    additionalActionDefinitions: [
      ...STAGE6_MOVEMENT_ACTION_DEFINITIONS,
      ...CANDIDATES.flatMap(({ groundAction, aerialAction }) => [groundAction, aerialAction]),
    ],
  });
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [
      ...STAGE4_EQUIPMENT_DEFINITIONS,
      ...CANDIDATES.map(({ equipment }) => equipment),
    ],
    actionRegistry: base.actionRegistry,
  });
  return Object.freeze({
    actionRegistry: new ActionRegistry(base.actionRegistry.list()),
    equipmentRegistry,
    mapRegistry: createArenaV1MapRegistry(),
    characterRegistry: createArenaV1CharacterRegistry(),
  });
}

function createActors(targetX: number, targetFacingX = -1): readonly RuleActor[] {
  return Object.freeze([
    Object.freeze({
      id: 'player-1',
      canAct: true,
      targetable: true,
      position: Object.freeze({ x: 0, y: 1, z: 0 }),
      facing: Object.freeze({ x: 1, z: 0 }),
    }),
    Object.freeze({
      id: 'player-2',
      canAct: true,
      targetable: true,
      position: Object.freeze({ x: targetX, y: 1, z: 0 }),
      facing: Object.freeze({ x: targetFacingX, z: 0 }),
    }),
  ]);
}

function targetXForPolicy(
  candidate: ArenaV2WeaponLanguageCandidate,
  policy: ArenaV2WeaponLanguageProbePolicy,
  tick: number,
): number {
  if (policy === 'hold' || tick < candidate.responseTicks - 4) return candidate.targetDistance;
  return candidate.targetDistance + 3;
}

function createFrames(
  tick: number,
  candidate: ArenaV2WeaponLanguageCandidate,
  policy: ArenaV2WeaponLanguageProbePolicy,
): readonly ArenaInputFrame[] {
  const commitment = candidate.groundAction.commitment;
  const primaryHeld = commitment
    ? policy === 'hold'
      ? tick < commitment.commitTicks
      : tick < Math.max(1, commitment.commitTicks - 4)
    : false;
  return Object.freeze([
    Object.freeze({
      ...createNeutralInputFrame(tick, 'player-1'),
      primaryPressed: tick === 0,
      primaryHeld,
    }),
    createNeutralInputFrame(tick, 'player-2'),
  ]);
}

function runProbe(
  candidate: ArenaV2WeaponLanguageCandidate,
  policy: ArenaV2WeaponLanguageProbePolicy,
): ArenaV2WeaponLanguageProbeResult {
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: PARTICIPANT_IDS,
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
    authorityContent: createArenaV2WeaponLanguageResearchContent(),
  });
  let actionStartedTick: number | null = null;
  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  let horizontalImpulse = 0;
  try {
    engine.spawnEquipment({
      instanceId: `v2-language:${candidate.weaponId}`,
      definitionId: candidate.weaponId,
      spawnId: `v2-language:${candidate.weaponId}`,
      position: { x: 0, y: 1, z: 0 },
    });
    engine.resolveEquipmentPickups({
      participants: [
        { id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } },
        { id: 'player-2', eligible: true, position: { x: candidate.targetDistance, y: 1, z: 0 } },
      ],
      contestSeed: 20260727,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: () => undefined,
    });
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const actors = createActors(
        targetXForPolicy(candidate, policy, tick),
        candidate.languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK ? 1 : -1,
      );
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick, candidate, policy),
        additionalCandidates: Object.freeze([]),
      });
      if (batch.starts.some(({ participantId }) => participantId === 'player-1')) {
        actionStartedTick ??= tick;
        firstActiveTick ??= tick + candidate.groundAction.timing.windupTicks;
      }
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors });
      if (activeBatch.hits.some(({ attackerId }) => attackerId === 'player-1')) {
        firstHitTick ??= tick;
      }
      for (const event of activeBatch.events) {
        if (event.type !== 'KnockbackApplied') continue;
        const impulse = event.impulse;
        if (!impulse || typeof impulse !== 'object') continue;
        const record = impulse as Readonly<Record<string, unknown>>;
        if (typeof record.x === 'number' && typeof record.z === 'number') {
          horizontalImpulse = Math.hypot(record.x, record.z);
        }
      }
      engine.commit(activeBatch, ports);
      if (firstHitTick !== null) break;
    }
  } finally {
    engine.destroy();
  }
  return Object.freeze({
    weaponId: candidate.weaponId,
    languageId: candidate.languageId,
    actionDefinitionId: candidate.groundAction.id,
    policy,
    responseTicks: candidate.responseTicks,
    actionStartedTick,
    firstActiveTick,
    firstHitTick,
    horizontalImpulse,
    outcome: firstHitTick === null ? 'miss' : 'hit',
  });
}

export function runArenaV2WeaponLanguagePrototype(): ArenaV2WeaponLanguagePrototypeResult {
  const policies: readonly ArenaV2WeaponLanguageProbePolicy[] = Object.freeze(['hold', 'step-out']);
  const results = CANDIDATES.flatMap((candidate) => policies.map((policy) => runProbe(candidate, policy)));
  return Object.freeze({
    candidateCount: CANDIDATES.length,
    policies,
    results: Object.freeze(results),
    persistentAreaEffectImplemented: false,
  });
}
