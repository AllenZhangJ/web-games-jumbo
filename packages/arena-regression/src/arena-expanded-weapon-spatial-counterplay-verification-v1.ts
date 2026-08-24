import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  type ArenaInputFrame,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  type ActionDefinition,
  type WeaponActionContextKindV1,
  type WeaponCounterInputV1,
} from '@number-strategy-jump/arena-definitions';
import {
  type ArenaRuleEngineContract,
  type RuleActor,
  type RuleImpulse,
  type RuleMutationPorts,
} from '@number-strategy-jump/arena-core';
import {
  createMovementCommand,
  MovementSystem,
} from '@number-strategy-jump/arena-movement';
import {
  ARENA_FIXED_DT,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsCharacterState,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import {
  ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1,
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
  type ArenaV2CollectionWeaponBundleCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaBaselineWeaponRuleEngineCandidateV1,
  type ArenaBaselineWeaponBundleV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';

export const ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;
export const ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VALIDATION_STATUS_V1 =
  'not-run' as const;

const ATTACKER_ID = 'arena-p4-spatial-attacker';
const DEFENDER_A_ID = 'arena-p4-spatial-defender-a';
const DEFENDER_B_ID = 'arena-p4-spatial-defender-b';
const SPATIAL_SEED = 44_020_001;
const CONSEQUENCE_TICKS = 180;
const MAX_SCENARIO_TICKS = 512;
const PLAN_KEYS = new Set([
  'schemaVersion',
  'candidateStatus',
  'hardGate',
  'defaultRegistryWired',
  'validationStatus',
  'weaponCatalogHash',
  'weaponCount',
  'probeKinds',
  'allowedCounterInputs',
  'weapons',
  'contentHash',
]);
const ALLOWED_COUNTER_INPUTS = Object.freeze(['direction', 'jump'] as const);
const PROBE_KINDS = Object.freeze([
  'height-difference',
  'multi-target',
  'collision-edge',
] as const);
const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const PROFILE = createCharacterPhysicsProfile(CHARACTER);
const START_SURFACE_TOP = 0.5;
const START_CENTER_Y = START_SURFACE_TOP + PROFILE.halfHeight + PROFILE.radius;

type SpatialProbeKindV1 = typeof PROBE_KINDS[number];
export type ArenaWeaponSpatialObservationStatusV1 =
  | 'observed'
  | 'indistinguishable'
  | 'deferred';
type RunVariant =
  | 'control'
  | 'counterfactual'
  | 'candidate-order-forward'
  | 'candidate-order-reversed';

interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface ScenarioParticipant {
  readonly id: string;
  readonly position: Vector3;
  readonly facing: Readonly<{ x: number; z: number }>;
}

interface ScenarioDefinition {
  readonly id: string;
  readonly kind: SpatialProbeKindV1;
  readonly context: WeaponActionContextKindV1;
  readonly participants: readonly ScenarioParticipant[];
  readonly actorInsertionOrder: readonly string[];
  readonly counterfactual: boolean;
}

export interface ArenaWeaponSpatialRunV1 {
  readonly scenarioId: string;
  readonly probeKind: SpatialProbeKindV1;
  readonly variant: RunVariant;
  readonly context: WeaponActionContextKindV1;
  readonly seed: typeof SPATIAL_SEED;
  readonly actorInsertionOrder: readonly string[];
  readonly inputFrames: readonly ArenaInputFrame[];
  readonly actionStarted: boolean;
  readonly selectedFromEquipmentSystem: boolean;
  readonly resolvedTargetOrder: readonly string[];
  readonly firstHitTicks: readonly Readonly<{ participantId: string; tick: number }>[];
  readonly appliedImpulses: readonly Readonly<{
    participantId: string;
    impulse: RuleImpulse;
  }>[];
  readonly initialStates: readonly PhysicsCharacterState[];
  readonly finalStates: readonly PhysicsCharacterState[];
  readonly bodyCollisionTickCount: number;
  readonly unsupportedTickByParticipant: readonly Readonly<{
    participantId: string;
    tick: number | null;
  }>[];
  readonly fallTickByParticipant: readonly Readonly<{
    participantId: string;
    tick: number | null;
  }>[];
  readonly resultHash: string;
}

export interface ArenaWeaponHeightDifferenceEvidenceV1 {
  readonly probeId: string;
  readonly kind: 'height-difference';
  readonly status: ArenaWeaponSpatialObservationStatusV1;
  readonly groundControl: ArenaWeaponSpatialRunV1;
  readonly groundCounterfactual: ArenaWeaponSpatialRunV1;
  readonly aerialControl: ArenaWeaponSpatialRunV1;
  readonly aerialCounterfactual: ArenaWeaponSpatialRunV1;
  readonly groundAerialSemanticsDiffer: boolean;
  readonly defenderCounterplayDiffered: boolean;
  readonly evidenceHash: string;
}

export interface ArenaWeaponMultiTargetEvidenceV1 {
  readonly probeId: string;
  readonly kind: 'multi-target';
  readonly status: ArenaWeaponSpatialObservationStatusV1;
  readonly candidateIds: readonly [typeof DEFENDER_A_ID, typeof DEFENDER_B_ID];
  readonly candidateRoles: readonly Readonly<{
    participantId: string;
    role: 'legal-center' | 'boundary-near';
  }>[];
  readonly forward: ArenaWeaponSpatialRunV1;
  readonly reversed: ArenaWeaponSpatialRunV1;
  readonly selectedTargetId: string | null;
  readonly otherTargetId: string | null;
  readonly stableTargetOrder: boolean;
  readonly targetOrderHash: string;
  readonly evidenceHash: string;
}

export interface ArenaWeaponCollisionEdgeEvidenceV1 {
  readonly probeId: string;
  readonly kind: 'collision-edge';
  readonly status: ArenaWeaponSpatialObservationStatusV1;
  readonly declaredCounterInputs: readonly WeaponCounterInputV1[];
  readonly control: ArenaWeaponSpatialRunV1;
  readonly counterfactual: ArenaWeaponSpatialRunV1;
  readonly firstHitTickChanged: boolean;
  readonly supportOrFallChanged: boolean;
  readonly bodyCollisionChanged: boolean;
  readonly impulseOutcomeChanged: boolean;
  readonly evidenceHash: string;
}

export interface ArenaExpandedWeaponSpatialCounterplayWeaponEvidenceV1 {
  readonly weaponId: string;
  readonly collectionOrder: number;
  readonly sourceBatch: 'launch-six' | 'collection-expansion';
  readonly equipmentDefinitionId: string;
  readonly grammarDefinitionId: string;
  readonly groundActionDefinitionId: string;
  readonly aerialActionDefinitionId: string;
  readonly weaponContentHash: string;
  readonly heightDifference: ArenaWeaponHeightDifferenceEvidenceV1;
  readonly multiTarget: ArenaWeaponMultiTargetEvidenceV1;
  readonly collisionEdge: ArenaWeaponCollisionEdgeEvidenceV1;
  readonly evidenceHash: string;
}

export interface ArenaExpandedWeaponSpatialCounterplayReportV1 {
  readonly schemaVersion:
    typeof ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly seed: typeof SPATIAL_SEED;
  readonly weaponCatalogHash: string;
  readonly weaponCount: 20;
  readonly probeKinds: typeof PROBE_KINDS;
  readonly weapons: readonly ArenaExpandedWeaponSpatialCounterplayWeaponEvidenceV1[];
  readonly observedProbeCount: number;
  readonly indistinguishableProbeCount: number;
  readonly deferredProbeCount: number;
  readonly resultHash: string;
}

export interface ArenaExpandedWeaponSpatialCounterplayPlanWeaponV1 {
  readonly weaponId: string;
  readonly collectionOrder: number;
  readonly sourceBatch: 'launch-six' | 'collection-expansion';
  readonly equipmentDefinitionId: string;
  readonly grammarDefinitionId: string;
  readonly actionDefinitionIds: readonly [string, string];
  readonly weaponContentHash: string;
  readonly probeIds: readonly [string, string, string];
}

export interface ArenaExpandedWeaponSpatialCounterplayPlanV1 {
  readonly schemaVersion:
    typeof ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly validationStatus:
    typeof ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VALIDATION_STATUS_V1;
  readonly weaponCatalogHash: string;
  readonly weaponCount: 20;
  readonly probeKinds: typeof PROBE_KINDS;
  readonly allowedCounterInputs: typeof ALLOWED_COUNTER_INPUTS;
  readonly weapons: readonly ArenaExpandedWeaponSpatialCounterplayPlanWeaponV1[];
  readonly contentHash: string;
}

function dataNumber(value: unknown, key: string, fallback: number): number {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('P4 spatial targeting parameters必须是普通数据对象。');
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return fallback;
  if (
    !descriptor.enumerable
    || !Object.hasOwn(descriptor, 'value')
    || typeof descriptor.value !== 'number'
    || !Number.isFinite(descriptor.value)
  ) throw new TypeError(`P4 spatial targeting.${key}必须是可枚举有限数数据字段。`);
  return descriptor.value;
}

function actionFor(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  context: WeaponActionContextKindV1,
): ActionDefinition {
  const actionId = context === 'ground'
    ? weapon.equipment.actionDefinitionId
    : weapon.equipment.aerialActionDefinitionId;
  const action = weapon.actions.find(({ id }) => id === actionId);
  if (action === undefined) throw new RangeError(`${weapon.id}缺少${context} ActionDefinition。`);
  return action;
}

function grammarCounterInputs(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  context: WeaponActionContextKindV1,
): readonly WeaponCounterInputV1[] {
  const grammarContext = weapon.grammar.contexts.find(({ kind }) => kind === context);
  if (grammarContext === undefined) throw new RangeError(`${weapon.id}缺少${context} grammar。`);
  const result = Object.freeze([...grammarContext.counterInputs]);
  if (
    result.length === 0
    || new Set(result).size !== result.length
    || result.some((input) => input !== 'direction' && input !== 'jump')
  ) throw new RangeError(`${weapon.id}/${context}反制输入只能是非空direction/jump集合。`);
  return result;
}

function bundleFor(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
): ArenaBaselineWeaponBundleV1 {
  return Object.freeze({
    id: weapon.id,
    actions: weapon.actions,
    equipment: weapon.equipment,
    grammar: weapon.grammar,
    contentHash: weapon.contentHash,
  });
}

function assertWeaponIdentity(weapon: ArenaV2CollectionWeaponBundleCandidateV1): void {
  if (
    weapon.actions.length !== 2
    || weapon.collectionOrder < 1
    || weapon.collectionOrder > 20
    || weapon.grammar.equipmentDefinitionId !== weapon.equipment.id
    || weapon.grammar.contexts[0]?.kind !== 'ground'
    || weapon.grammar.contexts[1]?.kind !== 'aerial'
    || weapon.grammar.contexts[0]?.actionDefinitionId !== weapon.actions[0]?.id
    || weapon.grammar.contexts[1]?.actionDefinitionId !== weapon.actions[1]?.id
    || weapon.grammar.requiredInput !== 'primary'
    || weapon.actions.some(({ input }) => input.channel !== 'primary')
  ) throw new RangeError(`${weapon.id}空间反制Definition身份未闭合。`);
  const contentHash = createDeterministicDataHash(
    { actions: weapon.actions, equipment: weapon.equipment, grammar: weapon.grammar },
    `Weapon candidate ${weapon.equipment.id}`,
  );
  if (contentHash !== weapon.contentHash) {
    throw new RangeError(`${weapon.id}空间反制contentHash与真实Definition漂移。`);
  }
  grammarCounterInputs(weapon, 'ground');
  grammarCounterInputs(weapon, 'aerial');
}

function actionDistance(action: ActionDefinition): number {
  const range = dataNumber(action.targeting.parameters, 'range', 1);
  const radius = dataNumber(action.targeting.parameters, 'radius', range);
  return Math.max(0.15, Math.min(range * 0.45, radius * 0.85, 1.05));
}

function aerialHeight(action: ActionDefinition): number {
  const maximum = Math.max(
    0.1,
    dataNumber(action.targeting.parameters, 'maximumVerticalDifference', 1),
  );
  const minimum = Math.max(
    0,
    dataNumber(action.targeting.parameters, 'minimumVerticalDrop', 0),
  );
  return Math.min(maximum * 0.9, Math.max(minimum + 0.05, maximum * 0.5));
}

function targetFacing(action: ActionDefinition): Readonly<{ x: number; z: number }> {
  return action.targeting.kind === 'rear-cone'
    ? Object.freeze({ x: 1, z: 0 })
    : Object.freeze({ x: -1, z: 0 });
}

function heightScenario(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  context: WeaponActionContextKindV1,
  counterfactual: boolean,
): ScenarioDefinition {
  const action = actionFor(weapon, context);
  const distance = actionDistance(action);
  const sourceHeight = context === 'aerial' ? aerialHeight(action) : 0;
  return Object.freeze({
    id: `arena.p4.spatial.${weapon.id}.height.${context}`,
    kind: 'height-difference' as const,
    context,
    participants: Object.freeze([
      Object.freeze({
        id: ATTACKER_ID,
        position: Object.freeze({ x: 0, y: START_CENTER_Y + sourceHeight, z: 0 }),
        facing: Object.freeze({ x: 1, z: 0 }),
      }),
      Object.freeze({
        id: DEFENDER_A_ID,
        position: Object.freeze({ x: distance, y: START_CENTER_Y, z: 0 }),
        facing: targetFacing(action),
      }),
    ]),
    actorInsertionOrder: Object.freeze([ATTACKER_ID, DEFENDER_A_ID]),
    counterfactual,
  });
}

function multiTargetScenario(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  reversed: boolean,
): ScenarioDefinition {
  const context: WeaponActionContextKindV1 = 'ground';
  const action = actionFor(weapon, context);
  const range = Math.max(0.2, dataNumber(action.targeting.parameters, 'range', 1));
  const distance = Math.max(0.15, Math.min(range * 0.45, 0.9));
  const radius = Math.max(0.05, dataNumber(
    action.targeting.parameters,
    'radius',
    distance * 0.2,
  ));
  const minimumFacingDot = Math.max(-1, Math.min(
    1,
    dataNumber(action.targeting.parameters, 'minimumFacingDot', 0),
  ));
  const boundaryDistance = Math.max(0.15, Math.min(range * 0.78, 1.15));
  const boundaryDot = Math.max(-1, Math.min(
    1,
    minimumFacingDot + (1 - minimumFacingDot) * 0.08,
  ));
  const boundaryPosition = action.targeting.kind === 'facing-capsule'
    ? Object.freeze({ x: distance, y: START_CENTER_Y, z: radius * 0.9 })
    : action.targeting.kind === 'facing-cone'
      ? Object.freeze({
        x: boundaryDistance * boundaryDot,
        y: START_CENTER_Y,
        z: boundaryDistance * Math.sqrt(Math.max(0, 1 - boundaryDot ** 2)),
      })
      : Object.freeze({ x: boundaryDistance, y: START_CENTER_Y, z: 0.02 });
  const boundaryFacing = action.targeting.kind === 'rear-cone'
    ? Object.freeze({
      x: Math.max(0.05, minimumFacingDot + (1 - minimumFacingDot) * 0.08),
      z: Math.sqrt(Math.max(
        0,
        1 - (minimumFacingDot + (1 - minimumFacingDot) * 0.08) ** 2,
      )),
    })
    : targetFacing(action);
  const defenders = [
    Object.freeze({
      id: DEFENDER_A_ID,
      position: Object.freeze({ x: distance, y: START_CENTER_Y, z: 0 }),
      facing: targetFacing(action),
    }),
    Object.freeze({
      id: DEFENDER_B_ID,
      position: boundaryPosition,
      facing: boundaryFacing,
    }),
  ] as const;
  return Object.freeze({
    id: `arena.p4.spatial.${weapon.id}.multi-target`,
    kind: 'multi-target' as const,
    context,
    participants: Object.freeze([
      Object.freeze({
        id: ATTACKER_ID,
        position: Object.freeze({ x: 0, y: START_CENTER_Y, z: 0 }),
        facing: Object.freeze({ x: 1, z: 0 }),
      }),
      ...defenders,
    ]),
    actorInsertionOrder: reversed
      ? Object.freeze([ATTACKER_ID, DEFENDER_B_ID, DEFENDER_A_ID])
      : Object.freeze([ATTACKER_ID, DEFENDER_A_ID, DEFENDER_B_ID]),
    counterfactual: false,
  });
}

function collisionEdgeScenario(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  counterfactual: boolean,
): ScenarioDefinition {
  const context: WeaponActionContextKindV1 = 'ground';
  const action = actionFor(weapon, context);
  const distance = Math.min(actionDistance(action), 0.72);
  const targetX = 2.75;
  return Object.freeze({
    id: `arena.p4.spatial.${weapon.id}.collision-edge`,
    kind: 'collision-edge' as const,
    context,
    participants: Object.freeze([
      Object.freeze({
        id: ATTACKER_ID,
        position: Object.freeze({ x: targetX - distance, y: START_CENTER_Y, z: 2.05 }),
        facing: Object.freeze({ x: 1, z: 0 }),
      }),
      Object.freeze({
        id: DEFENDER_A_ID,
        position: Object.freeze({ x: targetX, y: START_CENTER_Y, z: 2.05 }),
        facing: targetFacing(action),
      }),
    ]),
    actorInsertionOrder: Object.freeze([ATTACKER_ID, DEFENDER_A_ID]),
    counterfactual,
  });
}

function addParticipant(physics: PhysicsWorld, participant: ScenarioParticipant): void {
  physics.addCharacter({ id: participant.id, position: participant.position, ...PROFILE });
  physics.resetCharacter(participant.id, {
    position: participant.position,
    facing: participant.facing,
  });
}

function orderedStates(
  physics: PhysicsWorld,
  participantIds: readonly string[],
): readonly PhysicsCharacterState[] {
  return Object.freeze(participantIds.map((participantId) => (
    cloneFrozenData(
      physics.getCharacterState(participantId),
      `P4 spatial physics state ${participantId}`,
    ) as unknown as PhysicsCharacterState
  )));
}

function actorsFor(
  physics: PhysicsWorld,
  insertionOrder: readonly string[],
): readonly RuleActor[] {
  return Object.freeze(insertionOrder.map((participantId) => {
    const state = physics.getCharacterState(participantId);
    return Object.freeze({
      id: participantId,
      canAct: true,
      targetable: participantId !== ATTACKER_ID,
      position: state.position,
      facing: state.facing,
    });
  }));
}

function holdsPrimary(action: ActionDefinition, tick: number): boolean {
  if (action.commitment === undefined) return tick === 0;
  return tick < action.commitment.commitTicks;
}

function createMovementSystem(participantIds: readonly string[]): MovementSystem {
  return new MovementSystem({
    participantCharacters: participantIds.map((participantId) => ({
      participantId,
      characterDefinition: CHARACTER,
    })),
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
  });
}

function counterInput(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  context: WeaponActionContextKindV1,
  scenario: ScenarioDefinition,
  participantId: string,
  tick: number,
): Readonly<{
  tick: number;
  participantId: string;
  moveX: number;
  moveZ: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
}> {
  const declared = grammarCounterInputs(weapon, context);
  const defender = participantId !== ATTACKER_ID;
  const enabled = scenario.counterfactual && defender && participantId === DEFENDER_A_ID;
  const direction = enabled && declared.includes('direction');
  const jump = enabled && declared.includes('jump');
  return Object.freeze({
    tick,
    participantId,
    moveX: 0,
    moveZ: direction ? 1 : 0,
    jumpPressed: jump && tick === 0,
    jumpHeld: jump && tick < 4,
  });
}

function createInputFrames(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  action: ActionDefinition,
  scenario: ScenarioDefinition,
  participantIds: readonly string[],
  tick: number,
): readonly ArenaInputFrame[] {
  return Object.freeze(participantIds.map((participantId) => {
    const movement = counterInput(weapon, scenario.context, scenario, participantId, tick);
    return Object.freeze({
      ...movement,
      primaryPressed: participantId === ATTACKER_ID && tick === 0,
      primaryHeld: participantId === ATTACKER_ID && holdsPrimary(action, tick),
      slamPressed: false,
    });
  }));
}

function equipAttacker(
  engine: ArenaRuleEngineContract,
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  physics: PhysicsWorld,
  participantIds: readonly string[],
): void {
  const position = physics.getCharacterState(ATTACKER_ID).position;
  engine.spawnEquipment({
    instanceId: `arena-p4-spatial-${weapon.id}-instance`,
    definitionId: weapon.equipment.id,
    spawnId: `arena-p4-spatial-${weapon.id}-spawn`,
    position,
  });
  const decisions = engine.resolveEquipmentPickups({
    participants: participantIds.map((participantId) => ({
      id: participantId,
      position: physics.getCharacterState(participantId).position,
      eligible: participantId === ATTACKER_ID,
    })),
    contestSeed: SPATIAL_SEED,
  });
  if (decisions.length !== 1 || decisions[0]?.participantId !== ATTACKER_ID) {
    throw new RangeError(`${weapon.id}空间探针未由attacker唯一拾取。`);
  }
}

function mutationPorts(
  physics: PhysicsWorld,
  hits: Array<Readonly<{
    attackerId: string;
    targetId: string;
    actionDefinitionId: string;
  }>>,
  impulses: Array<Readonly<{ participantId: string; impulse: RuleImpulse }>>,
): RuleMutationPorts {
  return Object.freeze({
    recordHit(attackerId: string, targetId: string, actionDefinitionId: string): void {
      hits.push(Object.freeze({ attackerId, targetId, actionDefinitionId }));
    },
    applyHitstun(): void {},
    applyImpulse(participantId: string, impulse: RuleImpulse): void {
      const frozen = Object.freeze({ ...impulse });
      impulses.push(Object.freeze({ participantId, impulse: frozen }));
      physics.applyImpulse(participantId, frozen);
    },
  });
}

function bodiesTouch(left: PhysicsCharacterState, right: PhysicsCharacterState): boolean {
  const horizontal = Math.hypot(
    left.position.x - right.position.x,
    left.position.z - right.position.z,
  );
  const vertical = Math.abs(left.position.y - right.position.y);
  return horizontal <= PROFILE.radius * 2 + 1e-7
    && vertical < (PROFILE.halfHeight + PROFILE.radius) * 2;
}

function assertScenarioDefinition(
  scenario: ScenarioDefinition,
  variant: RunVariant,
): void {
  const expectedVariant = scenario.kind === 'multi-target'
    ? scenario.actorInsertionOrder[1] === DEFENDER_A_ID
      ? 'candidate-order-forward'
      : 'candidate-order-reversed'
    : scenario.counterfactual
      ? 'counterfactual'
      : 'control';
  if (variant !== expectedVariant) {
    throw new RangeError(`${scenario.id} probe variant与场景语义不闭合。`);
  }
  for (const participant of scenario.participants) {
    if (
      participant.id.length === 0
      || !Number.isFinite(participant.position.x)
      || !Number.isFinite(participant.position.y)
      || !Number.isFinite(participant.position.z)
      || !Number.isFinite(participant.facing.x)
      || !Number.isFinite(participant.facing.z)
      || Math.hypot(participant.facing.x, participant.facing.z) < 1e-7
    ) throw new RangeError(`${scenario.id} participant空间状态非有限或facing无效。`);
  }
}

function assertResolvedHits(
  hits: readonly Readonly<{
    attackerId: string;
    targetId: string;
    actionDefinitionId: string;
  }>[],
  participantIds: readonly string[],
  expectedActionDefinitionId: string,
): void {
  for (const hit of hits) {
    if (
      hit.attackerId !== ATTACKER_ID
      || hit.targetId === ATTACKER_ID
      || !participantIds.includes(hit.targetId)
      || hit.actionDefinitionId !== expectedActionDefinitionId
    ) throw new RangeError('P4 spatial Rule命中身份与本探针不闭合。');
  }
}

function runScenario(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
  scenario: ScenarioDefinition,
  variant: RunVariant,
): ArenaWeaponSpatialRunV1 {
  assertScenarioDefinition(scenario, variant);
  const participantIds = Object.freeze(scenario.participants.map(({ id }) => id).sort());
  if (
    participantIds.length < 2
    || participantIds.length > 3
    || new Set(participantIds).size !== participantIds.length
    || !participantIds.includes(ATTACKER_ID)
    || scenario.actorInsertionOrder.length !== participantIds.length
    || new Set(scenario.actorInsertionOrder).size !== participantIds.length
    || scenario.actorInsertionOrder.some((id) => !participantIds.includes(id))
  ) throw new RangeError(`${scenario.id} participant/insertion order不闭合。`);
  const action = actionFor(weapon, scenario.context);
  const maximumTicks = action.timing.windupTicks
    + action.timing.activeTicks
    + action.timing.recoveryTicks
    + CONSEQUENCE_TICKS;
  if (!Number.isSafeInteger(maximumTicks) || maximumTicks < 1 || maximumTicks > MAX_SCENARIO_TICKS) {
    throw new RangeError(`${scenario.id} tick预算越界。`);
  }
  let engine: ArenaRuleEngineContract | null = null;
  let physics: PhysicsWorld | null = null;
  let movement: MovementSystem | null = null;
  let primaryError: unknown;
  let failed = false;
  let result: ArenaWeaponSpatialRunV1 | null = null;
  try {
    engine = createArenaBaselineWeaponRuleEngineCandidateV1(bundleFor(weapon), participantIds);
    physics = createLightweightPhysicsWorld({ arena: MAP.arena });
    movement = createMovementSystem(participantIds);
    const ownedEngine = engine;
    const ownedPhysics = physics;
    const ownedMovement = movement;
    scenario.participants.forEach((participant) => addParticipant(ownedPhysics, participant));
    equipAttacker(ownedEngine, weapon, ownedPhysics, participantIds);
    const initialStates = orderedStates(ownedPhysics, participantIds);
    const recordedFrames: ArenaInputFrame[] = [];
    const recordedHits: Array<Readonly<{
      attackerId: string;
      targetId: string;
      actionDefinitionId: string;
    }>> = [];
    const impulses: Array<Readonly<{ participantId: string; impulse: RuleImpulse }>> = [];
    const firstHitTicks = new Map<string, number>();
    const unsupportedTicks = new Map<string, number | null>(
      participantIds.map((id) => [id, null] as const),
    );
    const fallTicks = new Map<string, number | null>(
      participantIds.map((id) => [id, null] as const),
    );
    let actionStarted = false;
    let selectedFromEquipmentSystem = false;
    let bodyCollisionTickCount = 0;
    for (let tick = 0; tick < maximumTicks; tick += 1) {
      ownedEngine.advanceTimers();
      const movementInputs = participantIds.map((participantId) => (
        counterInput(weapon, scenario.context, scenario, participantId, tick)
      ));
      ownedMovement.prepareTick({
        tick,
        contacts: participantIds.map((participantId) => ({
          participantId,
          grounded: ownedPhysics.getCharacterState(participantId).grounded,
        })),
        inputs: movementInputs,
        availability: participantIds.map((participantId) => ({ participantId, canMove: true })),
      });
      const frames = createInputFrames(weapon, action, scenario, participantIds, tick);
      recordedFrames.push(...frames);
      const started = ownedEngine.resolveActions({
        tick,
        actors: actorsFor(ownedPhysics, scenario.actorInsertionOrder),
        inputFrames: frames,
        additionalCandidates: participantIds.map((participantId) => Object.freeze({
          participantId,
          candidates: ownedEngine.getMovementActionCandidates(
            ownedMovement.getCapabilities(participantId),
          ),
        })),
      });
      if (tick === 0) {
        actionStarted = started.starts.some(({ participantId, actionDefinitionId }) => (
          participantId === ATTACKER_ID && actionDefinitionId === action.id
        ));
        selectedFromEquipmentSystem = started.resolutions.some((resolution) => (
          resolution.participantId === ATTACKER_ID
          && resolution.actionDefinitionId === action.id
          && resolution.source === 'equipment-system'
        ));
      }
      ownedMovement.execute(
        started.movementCommands.map(createMovementCommand),
        { applyBatch: (mutations) => ownedPhysics.applyCharacterMutationBatch(mutations) },
      );
      const ports = mutationPorts(ownedPhysics, recordedHits, impulses);
      ownedEngine.commit(started, ports);
      const active = ownedEngine.resolveActiveActions({
        actors: actorsFor(ownedPhysics, scenario.actorInsertionOrder),
      });
      assertResolvedHits(active.hits, participantIds, action.id);
      for (const hit of active.hits) {
        if (!firstHitTicks.has(hit.targetId)) firstHitTicks.set(hit.targetId, tick);
      }
      ownedEngine.commit(active, ports);
      for (const input of movementInputs) {
        const intent = ownedMovement.projectHorizontalIntent(
          input.participantId,
          input.moveX,
          input.moveZ,
        );
        ownedPhysics.setMovementIntent(input.participantId, intent.x, intent.z);
      }
      ownedPhysics.step(ARENA_FIXED_DT);
      ownedMovement.completeTick({
        tick,
        contacts: participantIds.map((participantId) => ({
          participantId,
          grounded: ownedPhysics.getCharacterState(participantId).grounded,
        })),
      });
      const attacker = ownedPhysics.getCharacterState(ATTACKER_ID);
      for (const participantId of participantIds) {
        if (participantId === ATTACKER_ID) continue;
        const state = ownedPhysics.getCharacterState(participantId);
        if (bodiesTouch(attacker, state)) bodyCollisionTickCount += 1;
      }
      for (const participantId of participantIds) {
        const state = ownedPhysics.getCharacterState(participantId);
        if (!state.grounded && unsupportedTicks.get(participantId) === null) {
          unsupportedTicks.set(participantId, tick);
        }
        if (state.position.y < MAP.arena.killY && fallTicks.get(participantId) === null) {
          fallTicks.set(participantId, tick);
        }
      }
    }
    const authority = Object.freeze({
      scenarioId: scenario.id,
      probeKind: scenario.kind,
      variant,
      context: scenario.context,
      seed: SPATIAL_SEED,
      actorInsertionOrder: Object.freeze([...scenario.actorInsertionOrder]),
      inputFrames: Object.freeze(recordedFrames),
      actionStarted,
      selectedFromEquipmentSystem,
      resolvedTargetOrder: Object.freeze(recordedHits.map(({ targetId }) => targetId)),
      firstHitTicks: Object.freeze([...firstHitTicks.entries()].map(
        ([participantId, tick]) => Object.freeze({ participantId, tick }),
      )),
      appliedImpulses: Object.freeze(impulses),
      initialStates,
      finalStates: orderedStates(ownedPhysics, participantIds),
      bodyCollisionTickCount,
      unsupportedTickByParticipant: Object.freeze(participantIds.map((participantId) => (
        Object.freeze({ participantId, tick: unsupportedTicks.get(participantId) ?? null })
      ))),
      fallTickByParticipant: Object.freeze(participantIds.map((participantId) => (
        Object.freeze({ participantId, tick: fallTicks.get(participantId) ?? null })
      ))),
    });
    result = Object.freeze({
      ...authority,
      resultHash: createDeterministicDataHash(authority, `${scenario.id}.${variant}`),
    });
  } catch (error) {
    failed = true;
    primaryError = error;
  }
  const cleanupErrors: unknown[] = [];
  for (const cleanup of [
    movement === null ? null : () => movement!.destroy(),
    physics === null ? null : () => physics!.destroy(),
    engine === null ? null : () => engine!.destroy(),
  ]) {
    if (cleanup === null) continue;
    try {
      cleanup();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      failed ? [primaryError, ...cleanupErrors] : cleanupErrors,
      `${scenario.id}主流程或逆序清理失败。`,
    );
  }
  if (failed) throw primaryError;
  if (result === null) throw new Error(`${scenario.id}未形成空间反制结果。`);
  return result;
}

function observableRunHash(run: ArenaWeaponSpatialRunV1, name: string): string {
  return createDeterministicDataHash({
    probeKind: run.probeKind,
    context: run.context,
    seed: run.seed,
    actionStarted: run.actionStarted,
    selectedFromEquipmentSystem: run.selectedFromEquipmentSystem,
    resolvedTargetOrder: run.resolvedTargetOrder,
    firstHitTicks: run.firstHitTicks,
    appliedImpulses: run.appliedImpulses,
    initialStates: run.initialStates,
    finalStates: run.finalStates,
    bodyCollisionTickCount: run.bodyCollisionTickCount,
    unsupportedTickByParticipant: run.unsupportedTickByParticipant,
    fallTickByParticipant: run.fallTickByParticipant,
  }, name);
}

function assertDefenderOnlyInputDifference(
  control: ArenaWeaponSpatialRunV1,
  counterfactual: ArenaWeaponSpatialRunV1,
): void {
  if (
    control.scenarioId !== counterfactual.scenarioId
    || control.context !== counterfactual.context
    || control.seed !== counterfactual.seed
    || createDeterministicDataHash(control.initialStates, 'P4 spatial initial states')
      !== createDeterministicDataHash(counterfactual.initialStates, 'P4 spatial initial states')
  ) throw new RangeError('P4 spatial control/counterfactual场景或seed漂移。');
  if (control.inputFrames.length !== counterfactual.inputFrames.length) {
    throw new RangeError('P4 spatial control/counterfactual输入长度漂移。');
  }
  for (let index = 0; index < control.inputFrames.length; index += 1) {
    const before = control.inputFrames[index]!;
    const after = counterfactual.inputFrames[index]!;
    if (
      before.tick !== after.tick
      || before.participantId !== after.participantId
      || before.primaryPressed !== after.primaryPressed
      || before.primaryHeld !== after.primaryHeld
      || before.slamPressed !== after.slamPressed
    ) throw new RangeError('P4 spatial反事实改变了tick、participant或primary输入。');
    if (before.participantId === ATTACKER_ID && (
      before.moveX !== after.moveX
      || before.moveZ !== after.moveZ
      || before.jumpPressed !== after.jumpPressed
      || before.jumpHeld !== after.jumpHeld
    )) throw new RangeError('P4 spatial反事实不能改变attacker movement输入。');
    if (before.participantId !== DEFENDER_A_ID && (
      before.moveX !== after.moveX
      || before.moveZ !== after.moveZ
      || before.jumpPressed !== after.jumpPressed
      || before.jumpHeld !== after.jumpHeld
    )) throw new RangeError('P4 spatial反事实只能改变具名defender输入。');
  }
}

function assertCandidateOrderOnlyDifference(
  forward: ArenaWeaponSpatialRunV1,
  reversed: ArenaWeaponSpatialRunV1,
): void {
  if (
    forward.scenarioId !== reversed.scenarioId
    || forward.context !== reversed.context
    || forward.seed !== reversed.seed
    || createDeterministicDataHash(forward.initialStates, 'P4 multi-target initial states')
      !== createDeterministicDataHash(reversed.initialStates, 'P4 multi-target initial states')
    || createDeterministicDataHash(forward.inputFrames, 'P4 multi-target input frames')
      !== createDeterministicDataHash(reversed.inputFrames, 'P4 multi-target input frames')
  ) throw new RangeError('P4 multi-target排列反事实改变了场景、seed或输入。');
  if (
    forward.actorInsertionOrder.length !== reversed.actorInsertionOrder.length
    || forward.actorInsertionOrder[0] !== ATTACKER_ID
    || reversed.actorInsertionOrder[0] !== ATTACKER_ID
    || forward.actorInsertionOrder[1] !== reversed.actorInsertionOrder[2]
    || forward.actorInsertionOrder[2] !== reversed.actorInsertionOrder[1]
  ) throw new RangeError('P4 multi-target必须只置换两个defender候选插入顺序。');
}

function assertDeclaredCounterInputsExecuted(
  run: ArenaWeaponSpatialRunV1,
  declared: readonly WeaponCounterInputV1[],
): void {
  const defenderFrames = run.inputFrames.filter(({ participantId }) => (
    participantId === DEFENDER_A_ID
  ));
  const usedDirection = defenderFrames.some(({ moveX, moveZ }) => moveX !== 0 || moveZ !== 0);
  const pressedJump = defenderFrames.some(({ jumpPressed }) => jumpPressed);
  const heldJump = defenderFrames.some(({ jumpHeld }) => jumpHeld);
  if (usedDirection !== declared.includes('direction')) {
    throw new RangeError('P4 spatial direction执行与Grammar counterInputs漂移。');
  }
  if (pressedJump !== declared.includes('jump') || heldJump !== declared.includes('jump')) {
    throw new RangeError('P4 spatial jump执行与Grammar counterInputs漂移。');
  }
}

function runHeightEvidence(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
): ArenaWeaponHeightDifferenceEvidenceV1 {
  const groundControl = runScenario(
    weapon,
    heightScenario(weapon, 'ground', false),
    'control',
  );
  const groundCounterfactual = runScenario(
    weapon,
    heightScenario(weapon, 'ground', true),
    'counterfactual',
  );
  const aerialControl = runScenario(
    weapon,
    heightScenario(weapon, 'aerial', false),
    'control',
  );
  const aerialCounterfactual = runScenario(
    weapon,
    heightScenario(weapon, 'aerial', true),
    'counterfactual',
  );
  assertDefenderOnlyInputDifference(groundControl, groundCounterfactual);
  assertDefenderOnlyInputDifference(aerialControl, aerialCounterfactual);
  assertDeclaredCounterInputsExecuted(
    groundCounterfactual,
    grammarCounterInputs(weapon, 'ground'),
  );
  assertDeclaredCounterInputsExecuted(
    aerialCounterfactual,
    grammarCounterInputs(weapon, 'aerial'),
  );
  const all = [groundControl, groundCounterfactual, aerialControl, aerialCounterfactual];
  const controlsResolvedSpatialTargets = groundControl.resolvedTargetOrder.length > 0
    && aerialControl.resolvedTargetOrder.length > 0;
  const groundAerialSemanticsDiffer = observableRunHash(
    groundControl,
    `${weapon.id}.height observable`,
  ) !== observableRunHash(aerialControl, `${weapon.id}.height observable`);
  const defenderCounterplayDiffered = observableRunHash(
    groundControl,
    `${weapon.id}.ground counterplay observable`,
  ) !== observableRunHash(
    groundCounterfactual,
    `${weapon.id}.ground counterplay observable`,
  ) || observableRunHash(
    aerialControl,
    `${weapon.id}.aerial counterplay observable`,
  ) !== observableRunHash(
    aerialCounterfactual,
    `${weapon.id}.aerial counterplay observable`,
  );
  const status: ArenaWeaponSpatialObservationStatusV1 = all.every((run) => (
    run.actionStarted && run.selectedFromEquipmentSystem
  )) && controlsResolvedSpatialTargets
    ? groundAerialSemanticsDiffer || defenderCounterplayDiffered ? 'observed' : 'indistinguishable'
    : 'deferred';
  const authority = Object.freeze({
    probeId: `arena.p4.spatial.${weapon.id}.height-difference.v1`,
    kind: 'height-difference' as const,
    status,
    groundControl,
    groundCounterfactual,
    aerialControl,
    aerialCounterfactual,
    groundAerialSemanticsDiffer,
    defenderCounterplayDiffered,
  });
  return Object.freeze({
    ...authority,
    evidenceHash: createDeterministicDataHash(authority, `${weapon.id}.height evidence`),
  });
}

function runMultiTargetEvidence(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
): ArenaWeaponMultiTargetEvidenceV1 {
  const forward = runScenario(
    weapon,
    multiTargetScenario(weapon, false),
    'candidate-order-forward',
  );
  const reversed = runScenario(
    weapon,
    multiTargetScenario(weapon, true),
    'candidate-order-reversed',
  );
  assertCandidateOrderOnlyDifference(forward, reversed);
  const stableTargetOrder = forward.resolvedTargetOrder.length === 2
    && reversed.resolvedTargetOrder.length === 2
    && forward.resolvedTargetOrder.every((targetId, index) => (
      targetId === reversed.resolvedTargetOrder[index]
    ));
  const selectedTargetId = stableTargetOrder ? forward.resolvedTargetOrder[0] ?? null : null;
  const otherTargetId = stableTargetOrder ? forward.resolvedTargetOrder[1] ?? null : null;
  const bothRunsResolvedTwoTargets = forward.resolvedTargetOrder.length === 2
    && reversed.resolvedTargetOrder.length === 2;
  if (bothRunsResolvedTwoTargets && (
    !stableTargetOrder
    || selectedTargetId !== DEFENDER_A_ID
    || otherTargetId !== DEFENDER_B_ID
  )) throw new RangeError(`${weapon.id} multi-target稳定Targeting顺序漂移。`);
  const status: ArenaWeaponSpatialObservationStatusV1 = !forward.actionStarted
    || !forward.selectedFromEquipmentSystem
    || !reversed.actionStarted
    || !reversed.selectedFromEquipmentSystem
    || forward.resolvedTargetOrder.length < 2
    || reversed.resolvedTargetOrder.length < 2
    ? 'deferred'
    : 'observed';
  const targetOrderHash = createDeterministicDataHash(
    {
      selectedTargetId,
      otherTargetId,
      forwardOrder: forward.resolvedTargetOrder,
      reversedOrder: reversed.resolvedTargetOrder,
    },
    `${weapon.id}.multi-target order`,
  );
  const authority = Object.freeze({
    probeId: `arena.p4.spatial.${weapon.id}.multi-target.v1`,
    kind: 'multi-target' as const,
    status,
    candidateIds: Object.freeze([DEFENDER_A_ID, DEFENDER_B_ID] as const),
    candidateRoles: Object.freeze([
      Object.freeze({ participantId: DEFENDER_A_ID, role: 'legal-center' as const }),
      Object.freeze({ participantId: DEFENDER_B_ID, role: 'boundary-near' as const }),
    ]),
    forward,
    reversed,
    selectedTargetId,
    otherTargetId,
    stableTargetOrder,
    targetOrderHash,
  });
  return Object.freeze({
    ...authority,
    evidenceHash: createDeterministicDataHash(authority, `${weapon.id}.multi-target evidence`),
  });
}

function defenderTick(
  run: ArenaWeaponSpatialRunV1,
  field: 'unsupportedTickByParticipant' | 'fallTickByParticipant',
): number | null {
  return run[field].find(({ participantId }) => participantId === DEFENDER_A_ID)?.tick ?? null;
}

function runCollisionEdgeEvidence(
  weapon: ArenaV2CollectionWeaponBundleCandidateV1,
): ArenaWeaponCollisionEdgeEvidenceV1 {
  const control = runScenario(
    weapon,
    collisionEdgeScenario(weapon, false),
    'control',
  );
  const counterfactual = runScenario(
    weapon,
    collisionEdgeScenario(weapon, true),
    'counterfactual',
  );
  assertDefenderOnlyInputDifference(control, counterfactual);
  assertDeclaredCounterInputsExecuted(counterfactual, grammarCounterInputs(weapon, 'ground'));
  const controlFirstHit = control.firstHitTicks.find(({ participantId }) => (
    participantId === DEFENDER_A_ID
  ))?.tick ?? null;
  const counterFirstHit = counterfactual.firstHitTicks.find(({ participantId }) => (
    participantId === DEFENDER_A_ID
  ))?.tick ?? null;
  const firstHitTickChanged = controlFirstHit !== counterFirstHit;
  const supportOrFallChanged = defenderTick(control, 'unsupportedTickByParticipant')
      !== defenderTick(counterfactual, 'unsupportedTickByParticipant')
    || defenderTick(control, 'fallTickByParticipant')
      !== defenderTick(counterfactual, 'fallTickByParticipant')
    || control.finalStates.find(({ id }) => id === DEFENDER_A_ID)?.supportSurfaceId
      !== counterfactual.finalStates.find(({ id }) => id === DEFENDER_A_ID)?.supportSurfaceId;
  const bodyCollisionChanged = control.bodyCollisionTickCount
    !== counterfactual.bodyCollisionTickCount;
  const impulseOutcomeChanged = createDeterministicDataHash(
    control.appliedImpulses,
    `${weapon.id}.collision-edge impulses`,
  ) !== createDeterministicDataHash(
    counterfactual.appliedImpulses,
    `${weapon.id}.collision-edge impulses`,
  );
  const status: ArenaWeaponSpatialObservationStatusV1 = !control.actionStarted
    || !control.selectedFromEquipmentSystem
    || !counterfactual.actionStarted
    || !counterfactual.selectedFromEquipmentSystem
    || control.resolvedTargetOrder.length === 0
    ? 'deferred'
    : firstHitTickChanged || supportOrFallChanged || bodyCollisionChanged || impulseOutcomeChanged
      ? 'observed'
      : 'indistinguishable';
  const authority = Object.freeze({
    probeId: `arena.p4.spatial.${weapon.id}.collision-edge.v1`,
    kind: 'collision-edge' as const,
    status,
    declaredCounterInputs: grammarCounterInputs(weapon, 'ground'),
    control,
    counterfactual,
    firstHitTickChanged,
    supportOrFallChanged,
    bodyCollisionChanged,
    impulseOutcomeChanged,
  });
  return Object.freeze({
    ...authority,
    evidenceHash: createDeterministicDataHash(authority, `${weapon.id}.collision-edge evidence`),
  });
}

export function runArenaExpandedWeaponSpatialCounterplayWeaponCandidateV1(
  weaponId: string,
): ArenaExpandedWeaponSpatialCounterplayWeaponEvidenceV1 {
  if (typeof weaponId !== 'string' || weaponId.length === 0) {
    throw new TypeError('P4 spatial weaponId必须是非空字符串。');
  }
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(({ id }) => id === weaponId);
  if (weapon === undefined) throw new RangeError(`未知P4 spatial weapon ${weaponId}。`);
  assertWeaponIdentity(weapon);
  const heightDifference = runHeightEvidence(weapon);
  const multiTarget = runMultiTargetEvidence(weapon);
  const collisionEdge = runCollisionEdgeEvidence(weapon);
  const authority = Object.freeze({
    weaponId: weapon.id,
    collectionOrder: weapon.collectionOrder,
    sourceBatch: weapon.sourceBatch,
    equipmentDefinitionId: weapon.equipment.id,
    grammarDefinitionId: weapon.grammar.id,
    groundActionDefinitionId: weapon.actions[0]!.id,
    aerialActionDefinitionId: weapon.actions[1]!.id,
    weaponContentHash: weapon.contentHash,
    heightDifference,
    multiTarget,
    collisionEdge,
  });
  return Object.freeze({
    ...authority,
    evidenceHash: createDeterministicDataHash(authority, `${weapon.id}.spatial evidence`),
  });
}

function createExpectedPlan(): Readonly<ArenaExpandedWeaponSpatialCounterplayPlanV1> {
  if (
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.length !== 20
    || ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.collectionWeaponCount !== 20
  ) throw new RangeError('P4 spatial目录必须精确覆盖20把武器。');
  const weapons = Object.freeze(ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(
    (weapon, index) => {
      assertWeaponIdentity(weapon);
      if (weapon.collectionOrder !== index + 1) {
        throw new RangeError('P4 spatial武器目录必须按collectionOrder稳定排序。');
      }
      return Object.freeze({
        weaponId: weapon.id,
        collectionOrder: weapon.collectionOrder,
        sourceBatch: weapon.sourceBatch,
        equipmentDefinitionId: weapon.equipment.id,
        grammarDefinitionId: weapon.grammar.id,
        actionDefinitionIds: Object.freeze([
          weapon.actions[0]!.id,
          weapon.actions[1]!.id,
        ] as [string, string]),
        weaponContentHash: weapon.contentHash,
        probeIds: Object.freeze([
          `arena.p4.spatial.${weapon.id}.height-difference.v1`,
          `arena.p4.spatial.${weapon.id}.multi-target.v1`,
          `arena.p4.spatial.${weapon.id}.collision-edge.v1`,
        ] as [string, string, string]),
      });
    },
  ));
  const identities = [
    weapons.map(({ weaponId }) => weaponId),
    weapons.flatMap(({ probeIds }) => probeIds),
  ];
  if (identities.some((values) => new Set(values).size !== values.length)) {
    throw new RangeError('P4 spatial weapon/probe身份必须唯一。');
  }
  const authority = Object.freeze({
    schemaVersion: ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus:
      ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    validationStatus: ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VALIDATION_STATUS_V1,
    weaponCatalogHash: ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.contentHash,
    weaponCount: 20 as const,
    probeKinds: PROBE_KINDS,
    allowedCounterInputs: ALLOWED_COUNTER_INPUTS,
    weapons,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena Expanded Weapon Spatial Counterplay Plan V1',
    ),
  });
}

function assertExactDataEqual(left: unknown, right: unknown, path: string): void {
  if (Object.is(left, right)) return;
  if (
    typeof left !== 'object' || left === null
    || typeof right !== 'object' || right === null
  ) throw new RangeError(`${path}身份漂移。`);
  const leftKeys = Reflect.ownKeys(left);
  const rightKeys = Reflect.ownKeys(right);
  if (
    leftKeys.some((key) => typeof key === 'symbol')
    || rightKeys.some((key) => typeof key === 'symbol')
    || leftKeys.length !== rightKeys.length
  ) throw new RangeError(`${path} exact-key漂移。`);
  for (let index = 0; index < leftKeys.length; index += 1) {
    const leftKey = leftKeys[index]!;
    const rightKey = rightKeys[index]!;
    if (leftKey !== rightKey) throw new RangeError(`${path}字段或目录顺序漂移。`);
    const leftDescriptor = Object.getOwnPropertyDescriptor(left, leftKey);
    const rightDescriptor = Object.getOwnPropertyDescriptor(right, rightKey);
    if (
      leftDescriptor === undefined || rightDescriptor === undefined
      || !Object.hasOwn(leftDescriptor, 'value')
      || !Object.hasOwn(rightDescriptor, 'value')
    ) throw new TypeError(`${path}.${String(leftKey)}必须是数据字段。`);
    assertExactDataEqual(
      leftDescriptor.value,
      rightDescriptor.value,
      `${path}.${String(leftKey)}`,
    );
  }
}

const EXPECTED_PLAN = createExpectedPlan();

export const ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_PLAN_CANDIDATE_V1 = EXPECTED_PLAN;

export function validateArenaExpandedWeaponSpatialCounterplayPlanV1(
  value: unknown,
): DeepReadonly<ArenaExpandedWeaponSpatialCounterplayPlanV1> {
  const source = cloneFrozenData(value, 'Arena Expanded Weapon Spatial Counterplay Plan V1');
  assertKnownKeys(source, PLAN_KEYS, 'Arena Expanded Weapon Spatial Counterplay Plan V1');
  for (const key of PLAN_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena Expanded Weapon Spatial Counterplay Plan V1缺少${key}。`);
    }
  }
  assertExactDataEqual(source, EXPECTED_PLAN, 'Arena Expanded Weapon Spatial Counterplay Plan V1');
  return source as DeepReadonly<ArenaExpandedWeaponSpatialCounterplayPlanV1>;
}

export function createArenaExpandedWeaponSpatialCounterplayPlanV1():
DeepReadonly<ArenaExpandedWeaponSpatialCounterplayPlanV1> {
  return validateArenaExpandedWeaponSpatialCounterplayPlanV1(EXPECTED_PLAN);
}

export function runArenaExpandedWeaponSpatialCounterplayVerificationCandidateV1(
  plan: unknown = EXPECTED_PLAN,
): ArenaExpandedWeaponSpatialCounterplayReportV1 {
  const validated = validateArenaExpandedWeaponSpatialCounterplayPlanV1(plan);
  const weapons = Object.freeze(validated.weapons.map(({ weaponId }) => (
    runArenaExpandedWeaponSpatialCounterplayWeaponCandidateV1(weaponId)
  )));
  const statuses = weapons.flatMap(({ heightDifference, multiTarget, collisionEdge }) => (
    [heightDifference.status, multiTarget.status, collisionEdge.status]
  ));
  const authority = Object.freeze({
    schemaVersion: ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus:
      ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    seed: SPATIAL_SEED,
    weaponCatalogHash: validated.weaponCatalogHash,
    weaponCount: 20 as const,
    probeKinds: PROBE_KINDS,
    weapons,
    observedProbeCount: statuses.filter((status) => status === 'observed').length,
    indistinguishableProbeCount: statuses.filter(
      (status) => status === 'indistinguishable',
    ).length,
    deferredProbeCount: statuses.filter((status) => status === 'deferred').length,
  });
  if (
    authority.observedProbeCount
      + authority.indistinguishableProbeCount
      + authority.deferredProbeCount !== 60
  ) throw new RangeError('P4 spatial执行结果必须精确覆盖20×3 probes。');
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Expanded Weapon Spatial Counterplay Report V1',
    ),
  });
}
