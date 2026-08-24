import {
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EquipmentRegistry,
  type ActionDefinition,
  type EquipmentDefinition,
  type WeaponActionContextKindV1,
  type WeaponCombatGrammarDefinitionV1,
  type WeaponCounterInputV1,
  type WeaponMapSituationV1,
} from '@number-strategy-jump/arena-definitions';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type ArenaInputFrame,
  type ArenaWeaponFeedbackSemanticEventV1,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_ACTION_PHASE,
  ArenaRuleEngine,
  createArenaBeginDownSmashActionEffectHandlerV1,
  createDefaultActionEffectRegistry,
  createDefaultRuleCommandRegistry,
  createDefaultTargetingRegistry,
  resolveArenaWeaponFeedbackSemanticV1,
  type ArenaRuleEngineContract,
  type RuleActor,
  type RuleImpulse,
  type RuleMutationPorts,
  type RuleTargetEligibilityContract,
} from '@number-strategy-jump/arena-core';
import { EquipmentSystem } from '@number-strategy-jump/arena-equipment';
import {
  createMovementCommand,
  isMovementCommandKind,
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
  ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1,
  ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1,
  ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_BASELINE_WEAPON_CONSEQUENCE_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_BASELINE_WEAPON_CONSEQUENCE_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const ATTACKER_ID = 'arena-p4-attacker';
const TARGET_ID = 'arena-p4-target';
const PARTICIPANT_IDS = Object.freeze([ATTACKER_ID, TARGET_ID]);
const CONSEQUENCE_TICKS = 240;
const COUNTERFACTUAL_SEED = 4;
const SCENE_SITUATIONS = Object.freeze(['edge', 'narrow-path'] as const);
const SCENE_CONTEXTS = Object.freeze(['ground', 'aerial'] as const);
const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const PROFILE = createCharacterPhysicsProfile(CHARACTER);

export interface ArenaBaselineWeaponBundleV1 {
  readonly id: string;
  readonly actions: readonly ActionDefinition[];
  readonly equipment: EquipmentDefinition;
  readonly grammar: WeaponCombatGrammarDefinitionV1;
  readonly contentHash: string;
}

const WEAPONS: readonly ArenaBaselineWeaponBundleV1[] = Object.freeze([
  {
    id: 'heavy-hammer',
    actions: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.actions,
    equipment: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.equipment,
    grammar: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.grammar,
    contentHash: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.contentHash,
  },
  {
    id: 'gravity-chain',
    actions: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.actions,
    equipment: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.equipment,
    grammar: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.grammar,
    contentHash: ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.contentHash,
  },
  {
    id: 'charge-shield',
    actions: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.actions,
    equipment: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.equipment,
    grammar: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.grammar,
    contentHash: ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.contentHash,
  },
]);

interface SceneDefinition {
  readonly sourcePosition: Readonly<{ x: number; y: number; z: number }>;
  readonly targetPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly facing: Readonly<{ x: number; z: number }>;
  readonly expectedSurfaceId: string;
}

export interface ArenaBaselineWeaponConsequenceScenarioV1 {
  readonly id: string;
  readonly weaponId: string;
  readonly equipmentDefinitionId: string;
  readonly actionDefinitionId: string;
  readonly coreVerb: string;
  readonly context: WeaponActionContextKindV1;
  readonly mapSituation: WeaponMapSituationV1;
  readonly expectedSurfaceId: string;
  readonly selectedFromEquipmentSystem: boolean;
  readonly actionStarted: boolean;
  readonly commitmentCancelledCount: number;
  readonly commitmentCommittedCount: number;
  readonly hitCount: number;
  readonly recordedHitCount: number;
  readonly hitstunTicks: number | null;
  readonly appliedImpulses: readonly Readonly<{
    participantId: string;
    impulse: RuleImpulse;
  }>[];
  readonly movementCommandCount: number;
  readonly movementCommandExecuted: boolean;
  readonly cooldownRejected: boolean;
  readonly interruptTargetWasActive: boolean;
  readonly interruptCommitted: boolean;
  readonly whiffStarted: boolean;
  readonly whiffHitCount: number;
  readonly whiffFeedbackSemantic: ArenaWeaponFeedbackSemanticEventV1;
  readonly targetFirstUnsupportedTick: number | null;
  readonly targetFallTick: number | null;
  readonly sourceFallTick: number | null;
  readonly targetMaximumHorizontalDisplacement: number;
  readonly targetFinalState: PhysicsCharacterState;
  readonly sourceFinalState: PhysicsCharacterState;
  readonly feedbackSemantic: ArenaWeaponFeedbackSemanticEventV1;
  readonly resultHash: string;
}

export interface ArenaBaselineWeaponConsequenceVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_BASELINE_WEAPON_CONSEQUENCE_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_BASELINE_WEAPON_CONSEQUENCE_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly mapDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly usesArenaRuleEngine: true;
  readonly usesActionResolver: true;
  readonly usesActionExecution: true;
  readonly usesTargetingAndEffectRegistries: true;
  readonly usesEquipmentSystem: true;
  readonly usesSharedPhysics: true;
  readonly exercisesGroundAndAerialContexts: true;
  readonly exercisesCooldownRejection: true;
  readonly exercisesWhiffResolution: true;
  readonly exercisesInterruption: true;
  readonly exercisesMovementCommandExecution: true;
  readonly exercisesIntegratedAerialTickOrder: true;
  readonly usesAuthorityWeaponFeedbackResolver: true;
  readonly exercisesReplayCheckpoint: false;
  readonly exercisesModeLifecycle: false;
  readonly weaponContentHashes: readonly Readonly<{
    id: string;
    contentHash: string;
  }>[];
  readonly scenarios: readonly ArenaBaselineWeaponConsequenceScenarioV1[];
  readonly movementFallFeedbackSemantic: ArenaWeaponFeedbackSemanticEventV1;
  readonly resultHash: string;
}

export function createArenaBaselineWeaponRuleEngineCandidateV1(
  bundle: ArenaBaselineWeaponBundleV1,
  participantIds: readonly string[] = PARTICIPANT_IDS,
  checkpoint?: unknown,
  targetEligibility?: RuleTargetEligibilityContract,
): ArenaRuleEngineContract {
  const actionRegistry = new ActionRegistry(bundle.actions);
  const equipmentRegistry = new EquipmentRegistry({
    definitions: [bundle.equipment],
    actionRegistry,
  });
  return new ArenaRuleEngine({
    participantIds,
    baseActionDefinitionId: bundle.equipment.actionDefinitionId,
    baseAirActionDefinitionId: bundle.equipment.aerialActionDefinitionId,
    actionRegistry,
    equipmentRegistry,
    targetingRegistry: createDefaultTargetingRegistry(),
    effectRegistry: createDefaultActionEffectRegistry([
      createArenaBeginDownSmashActionEffectHandlerV1(),
    ]),
    commandRegistry: createDefaultRuleCommandRegistry(),
    movementCandidateProvider: Object.freeze({
      getCandidates: () => Object.freeze([]),
    }),
    ...(targetEligibility === undefined ? {} : { targetEligibility }),
    createEquipmentSystem: ({ checkpoint: equipmentCheckpoint, ...options }) => (
      equipmentCheckpoint === undefined
        ? new EquipmentSystem(options)
        : EquipmentSystem.restoreFromCheckpointV1(equipmentCheckpoint, options)
    ),
    movementCommandAdapter: Object.freeze({
      isCommandKind: isMovementCommandKind,
      createCommand: createMovementCommand,
    }),
    allowBaseAttackWhiff: true,
    ...(checkpoint === undefined ? {} : { checkpoint }),
  });
}

function createEngine(bundle: ArenaBaselineWeaponBundleV1): ArenaRuleEngineContract {
  return createArenaBaselineWeaponRuleEngineCandidateV1(bundle);
}

function characterCenterY(surfaceTop: number): number {
  return surfaceTop + PROFILE.halfHeight + PROFILE.radius;
}

function scene(
  situation: typeof SCENE_SITUATIONS[number],
  context: typeof SCENE_CONTEXTS[number],
  action: ActionDefinition,
): SceneDefinition {
  const usesDownSmash = action.effects.some(({ kind }) => kind === 'begin-down-smash');
  const aerialOffset = context === 'aerial'
    ? usesDownSmash ? 1 + action.timing.windupTicks * 0.3 : 1
    : 0;
  if (situation === 'edge') {
    const groundY = characterCenterY(0.5);
    return Object.freeze({
      sourcePosition: Object.freeze({
        x: context === 'ground' || !usesDownSmash ? 1.35 : 2.75,
        y: groundY + aerialOffset,
        z: 0,
      }),
      targetPosition: Object.freeze({ x: 2.75, y: groundY, z: 0 }),
      facing: Object.freeze({ x: 1, z: 0 }),
      expectedSurfaceId: 'kz-s01-start',
    });
  }
  const groundY = characterCenterY(0.95);
  const targetsByVerticalStrike = context !== 'ground' && usesDownSmash;
  return Object.freeze({
    sourcePosition: Object.freeze({
      x: targetsByVerticalStrike ? 27.1 : 26,
      y: groundY + aerialOffset,
      z: -2.2,
    }),
    targetPosition: Object.freeze({ x: 27.1, y: groundY, z: -2.2 }),
    facing: Object.freeze({ x: 1, z: 0 }),
    expectedSurfaceId: 'kz-s05-narrow',
  });
}

function addCharacter(
  physics: PhysicsWorld,
  participantId: string,
  position: SceneDefinition['sourcePosition'],
  facing: SceneDefinition['facing'],
): void {
  physics.addCharacter({ id: participantId, position, ...PROFILE });
  physics.resetCharacter(participantId, { position, facing });
}

function actors(
  physics: PhysicsWorld,
  untargetableParticipantIds: ReadonlySet<string> = new Set(),
): readonly RuleActor[] {
  return Object.freeze(PARTICIPANT_IDS.map((participantId) => {
    const state = physics.getCharacterState(participantId);
    return Object.freeze({
      id: participantId,
      canAct: true,
      targetable: !untargetableParticipantIds.has(participantId),
      position: state.position,
      facing: state.facing,
    });
  }));
}

function inputFrames(
  tick: number,
  attackerPressed: boolean,
  attackerHeld = attackerPressed,
): readonly ArenaInputFrame[] {
  return Object.freeze(PARTICIPANT_IDS.map((participantId) => Object.freeze({
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: participantId === ATTACKER_ID && attackerPressed,
    primaryHeld: participantId === ATTACKER_ID && attackerHeld,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  })));
}

function holdsPrimaryForAction(
  action: ActionDefinition,
  tick: number,
  startTick: number,
): boolean {
  if (tick < startTick) return false;
  if (action.commitment === undefined) return tick === startTick;
  return tick - startTick < action.commitment.commitTicks;
}

function interruptionInputFrames(
  tick: number,
  action: ActionDefinition,
): readonly ArenaInputFrame[] {
  return Object.freeze(PARTICIPANT_IDS.map((participantId) => {
    const startTick = participantId === TARGET_ID ? 0 : 1;
    const pressed = tick === startTick;
    return Object.freeze({
      tick,
      participantId,
      moveX: 0,
      moveZ: 0,
      primaryPressed: pressed,
      primaryHeld: holdsPrimaryForAction(action, tick, startTick),
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    });
  }));
}

function equipAttacker(
  engine: ArenaRuleEngineContract,
  bundle: ArenaBaselineWeaponBundleV1,
  physics: PhysicsWorld,
): void {
  const position = physics.getCharacterState(ATTACKER_ID).position;
  engine.spawnEquipment({
    instanceId: `arena-p4-${bundle.id}-instance`,
    definitionId: bundle.equipment.id,
    spawnId: `arena-p4-${bundle.id}-spawn`,
    position,
  });
  const decisions = engine.resolveEquipmentPickups({
    participants: PARTICIPANT_IDS.map((participantId) => ({
      id: participantId,
      position: physics.getCharacterState(participantId).position,
      eligible: true,
    })),
    contestSeed: COUNTERFACTUAL_SEED,
  });
  if (decisions.length !== 1 || decisions[0]?.participantId !== ATTACKER_ID) {
    throw new Error(`P4 ${bundle.id}未由攻击者拾取。`);
  }
}

function additionalCandidates(
  engine: ArenaRuleEngineContract,
  context: WeaponActionContextKindV1,
): readonly Readonly<{ participantId: string; candidates: readonly unknown[] }>[] {
  if (context === 'ground') return Object.freeze([]);
  return Object.freeze([Object.freeze({
    participantId: ATTACKER_ID,
    candidates: engine.getMovementActionCandidates({
      participantId: ATTACKER_ID,
      canBeginDownSmash: true,
    }),
  })]);
}

function mutationPorts(
  physics: PhysicsWorld,
  record: {
    hits: Array<Readonly<{ attackerId: string; targetId: string; actionDefinitionId: string }>>;
    hitstuns: Array<Readonly<{ participantId: string; ticks: number }>>;
    impulses: Array<Readonly<{ participantId: string; impulse: RuleImpulse }>>;
  },
): RuleMutationPorts {
  return Object.freeze({
    recordHit(attackerId: string, targetId: string, actionDefinitionId: string) {
      record.hits.push(Object.freeze({ attackerId, targetId, actionDefinitionId }));
    },
    applyHitstun(participantId: string, ticks: number) {
      record.hitstuns.push(Object.freeze({ participantId, ticks }));
    },
    applyImpulse(participantId: string, impulse: RuleImpulse) {
      const frozenImpulse = Object.freeze({ ...impulse });
      record.impulses.push(Object.freeze({ participantId, impulse: frozenImpulse }));
      physics.applyImpulse(participantId, frozenImpulse);
    },
  });
}

function createMovementSystem(): MovementSystem {
  return new MovementSystem({
    participantCharacters: PARTICIPANT_IDS.map((participantId) => ({
      participantId,
      characterDefinition: CHARACTER,
    })),
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
  });
}

function prepareMovementTick(
  movement: MovementSystem,
  physics: PhysicsWorld,
  tick: number,
): void {
  movement.prepareTick({
    tick,
    contacts: PARTICIPANT_IDS.map((participantId) => ({
      participantId,
      grounded: physics.getCharacterState(participantId).grounded,
    })),
    inputs: PARTICIPANT_IDS.map((participantId) => ({
      tick,
      participantId,
      moveX: 0,
      moveZ: 0,
      jumpPressed: false,
      jumpHeld: false,
    })),
    availability: PARTICIPANT_IDS.map((participantId) => ({ participantId, canMove: true })),
  });
}

function completeMovementTick(
  movement: MovementSystem,
  physics: PhysicsWorld,
  tick: number,
): void {
  movement.completeTick({
    tick,
    contacts: PARTICIPANT_IDS.map((participantId) => ({
      participantId,
      grounded: physics.getCharacterState(participantId).grounded,
    })),
  });
}

function actionForContext(
  bundle: ArenaBaselineWeaponBundleV1,
  context: WeaponActionContextKindV1,
): ActionDefinition {
  const id = context === 'ground'
    ? bundle.equipment.actionDefinitionId
    : bundle.equipment.aerialActionDefinitionId;
  const action = bundle.actions.find(({ id: candidateId }) => candidateId === id);
  if (!action) throw new Error(`P4 ${bundle.id}缺少${context}动作。`);
  return action;
}

const COUNTERFACTUAL_OPTIONS_KEYS = new Set([
  'context', 'mapSituation', 'defenderInputScript',
]);
const COUNTERFACTUAL_TICK_KEYS = new Set(['tick', 'inputs']);
const COUNTERFACTUAL_INPUT_KEYS = new Set([
  'tick', 'participantId', 'moveX', 'moveZ', 'jumpPressed', 'jumpHeld',
]);
const COUNTERFACTUAL_CONTEXTS: ReadonlySet<unknown> = new Set(SCENE_CONTEXTS);
const COUNTERFACTUAL_SITUATIONS: ReadonlySet<unknown> = new Set(SCENE_SITUATIONS);

export interface ArenaWeaponCounterplayMovementInputV1 {
  readonly tick: number;
  readonly participantId: string;
  readonly moveX: number;
  readonly moveZ: number;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
}

export interface ArenaWeaponCounterplayInputTickV1 {
  readonly tick: number;
  readonly inputs: readonly ArenaWeaponCounterplayMovementInputV1[];
}

export interface ArenaWeaponDefenderCounterfactualRunV1 {
  readonly variant: 'control' | 'counterfactual';
  readonly inputFrames: readonly ArenaInputFrame[];
  readonly actionStarted: boolean;
  readonly hitCount: number;
  readonly firstHitTick: number | null;
  readonly targetMovementCommandCount: number;
  readonly directionIntentAppliedTickCount: number;
  readonly jumpPressedTickCount: number;
  readonly jumpHeldTickCount: number;
  readonly targetMaximumHorizontalDisplacement: number;
  readonly targetFirstUnsupportedTick: number | null;
  readonly targetFallTick: number | null;
  readonly initialTargetState: PhysicsCharacterState;
  readonly finalTargetState: PhysicsCharacterState;
  readonly resultHash: string;
}

export interface ArenaWeaponDefenderCounterfactualProbeV1 {
  readonly probeId: string;
  readonly weaponId: string;
  readonly equipmentDefinitionId: string;
  readonly grammarDefinitionId: string;
  readonly actionDefinitionId: string;
  readonly weaponContentHash: string;
  readonly context: WeaponActionContextKindV1;
  readonly mapSituation: typeof SCENE_SITUATIONS[number];
  readonly seed: typeof COUNTERFACTUAL_SEED;
  readonly declaredCounterInputs: readonly WeaponCounterInputV1[];
  readonly control: ArenaWeaponDefenderCounterfactualRunV1;
  readonly counterfactual: ArenaWeaponDefenderCounterfactualRunV1;
  readonly attackOutcomeDifferenceAxes: readonly string[];
  readonly physicalDifferenceAxes: readonly string[];
  readonly counterplayChangedAttackOutcome: boolean;
  readonly counterplayChangedObservableOutcome: boolean;
  readonly resultHash: string;
}

interface NormalizedCounterfactualOptions {
  readonly context: WeaponActionContextKindV1;
  readonly mapSituation: typeof SCENE_SITUATIONS[number];
  readonly defenderInputScript: readonly ArenaWeaponCounterplayInputTickV1[];
}

function counterfactualTickCount(action: ActionDefinition): number {
  return action.timing.windupTicks
    + action.timing.activeTicks
    + action.timing.recoveryTicks
    + CONSEQUENCE_TICKS;
}

function finiteAxis(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < -1 || value > 1) {
    throw new RangeError(`${name}必须是[-1,1]内有限数。`);
  }
  return value;
}

function isCounterfactualContext(
  value: unknown,
): value is WeaponActionContextKindV1 {
  return COUNTERFACTUAL_CONTEXTS.has(value);
}

function isCounterfactualMapSituation(
  value: unknown,
): value is typeof SCENE_SITUATIONS[number] {
  return COUNTERFACTUAL_SITUATIONS.has(value);
}

function normalizeCounterfactualOptions(
  bundle: ArenaBaselineWeaponBundleV1,
  value: unknown,
): NormalizedCounterfactualOptions {
  const source = cloneFrozenData(value, `P4 ${bundle.id} defender counterfactual options`);
  assertKnownKeys(source, COUNTERFACTUAL_OPTIONS_KEYS, 'P4 defender counterfactual options');
  for (const key of COUNTERFACTUAL_OPTIONS_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`P4 counterfactual缺少${key}。`);
  }
  const contextValue = source.context;
  if (!isCounterfactualContext(contextValue)) {
    throw new RangeError('P4 counterfactual context必须是ground/aerial。');
  }
  const mapSituationValue = source.mapSituation;
  if (!isCounterfactualMapSituation(mapSituationValue)) {
    throw new RangeError('P4 counterfactual mapSituation必须是edge/narrow-path。');
  }
  const context = contextValue;
  const mapSituation = mapSituationValue;
  const action = actionForContext(bundle, context);
  const requiredTicks = counterfactualTickCount(action);
  const defenderInputScriptValue = source.defenderInputScript;
  if (!Array.isArray(defenderInputScriptValue)
    || defenderInputScriptValue.length !== requiredTicks) {
    throw new RangeError(`P4 counterfactual script必须精确覆盖${requiredTicks}个tick。`);
  }
  const defenderInputScriptSource: readonly unknown[] = defenderInputScriptValue;
  const grammarContext = bundle.grammar.contexts.find(({ kind }) => kind === context);
  if (grammarContext === undefined) throw new RangeError(`P4 ${bundle.id}缺少${context} grammar。`);
  const allowed = new Set(grammarContext.counterInputs);
  let directionUsed = false;
  let jumpPressed = false;
  let jumpHeld = false;
  const defenderInputScript = defenderInputScriptSource.map((entry: unknown, index: number) => {
    assertKnownKeys(entry, COUNTERFACTUAL_TICK_KEYS, `counterfactual[${index}]`);
    if (!Object.hasOwn(entry, 'tick') || !Object.hasOwn(entry, 'inputs')) {
      throw new TypeError(`counterfactual[${index}]缺少tick/inputs。`);
    }
    const tick = assertIntegerAtLeast(entry.tick, 0, `counterfactual[${index}].tick`);
    if (tick !== index) throw new RangeError('P4 counterfactual tick必须从0严格连续。');
    const inputsValue = entry.inputs;
    if (!Array.isArray(inputsValue) || inputsValue.length !== PARTICIPANT_IDS.length) {
      throw new RangeError(`counterfactual[${index}].inputs必须覆盖全部participant。`);
    }
    const inputSources: readonly unknown[] = inputsValue;
    const participantIds = new Set<string>();
    const inputs = inputSources.map((input: unknown, inputIndex: number) => {
      assertKnownKeys(
        input,
        COUNTERFACTUAL_INPUT_KEYS,
        `counterfactual[${index}].inputs[${inputIndex}]`,
      );
      for (const key of COUNTERFACTUAL_INPUT_KEYS) {
        if (!Object.hasOwn(input, key)) {
          throw new TypeError(`counterfactual[${index}].inputs[${inputIndex}]缺少${key}。`);
        }
      }
      if (input.tick !== tick) throw new RangeError('P4 movement input tick与script tick不一致。');
      const expectedParticipantId = PARTICIPANT_IDS[inputIndex];
      if (expectedParticipantId === undefined || input.participantId !== expectedParticipantId) {
        throw new RangeError('P4 counterfactual participant必须按稳定attacker/target顺序。');
      }
      const participantId = expectedParticipantId;
      if (participantIds.has(participantId)) {
        throw new RangeError(`P4 counterfactual重复participant ${participantId}。`);
      }
      participantIds.add(participantId);
      const moveX = finiteAxis(input.moveX, 'P4 counterfactual moveX');
      const moveZ = finiteAxis(input.moveZ, 'P4 counterfactual moveZ');
      if (typeof input.jumpPressed !== 'boolean' || typeof input.jumpHeld !== 'boolean') {
        throw new TypeError('P4 counterfactual jump字段必须是布尔值。');
      }
      if (participantId === ATTACKER_ID
        && (moveX !== 0 || moveZ !== 0 || input.jumpPressed || input.jumpHeld)) {
        throw new RangeError('P4 counterfactual只能改变defender movement输入。');
      }
      if (participantId === TARGET_ID) {
        if (moveX !== 0 || moveZ !== 0) directionUsed = true;
        if (input.jumpPressed) jumpPressed = true;
        if (input.jumpHeld) jumpHeld = true;
      }
      return Object.freeze({
        tick,
        participantId,
        moveX,
        moveZ,
        jumpPressed: input.jumpPressed,
        jumpHeld: input.jumpHeld,
      });
    });
    return Object.freeze({ tick, inputs: Object.freeze(inputs) });
  });
  if (directionUsed !== allowed.has('direction')) {
    throw new RangeError('P4 counterfactual direction执行与Grammar counterInputs不一致。');
  }
  if (jumpPressed !== allowed.has('jump') || jumpHeld !== allowed.has('jump')) {
    throw new RangeError('P4 counterfactual jump执行与Grammar counterInputs不一致。');
  }
  return Object.freeze({ context, mapSituation, defenderInputScript: Object.freeze(
    defenderInputScript,
  ) });
}

export function createArenaWeaponDefenderCounterplayInputScriptCandidateV1(
  bundle: ArenaBaselineWeaponBundleV1,
  context: WeaponActionContextKindV1,
  mapSituation: typeof SCENE_SITUATIONS[number] = 'edge',
): readonly ArenaWeaponCounterplayInputTickV1[] {
  if (!COUNTERFACTUAL_CONTEXTS.has(context) || !COUNTERFACTUAL_SITUATIONS.has(mapSituation)) {
    throw new RangeError('P4 counterplay script context/mapSituation无效。');
  }
  const action = actionForContext(bundle, context);
  const grammarContext = bundle.grammar.contexts.find(({ kind }) => kind === context);
  if (grammarContext === undefined) throw new RangeError(`P4 ${bundle.id}缺少${context} grammar。`);
  const usesDirection = grammarContext.counterInputs.includes('direction');
  const usesJump = grammarContext.counterInputs.includes('jump');
  const definition = scene(mapSituation, context, action);
  const sideStep = definition.facing.x === 0
    ? Object.freeze({ x: 1, z: 0 })
    : Object.freeze({ x: 0, z: 1 });
  const script = Array.from({ length: counterfactualTickCount(action) }, (_, tick) => (
    Object.freeze({
      tick,
      inputs: Object.freeze(PARTICIPANT_IDS.map((participantId) => {
        const defender = participantId === TARGET_ID;
        return Object.freeze({
          tick,
          participantId,
          moveX: defender && usesDirection ? sideStep.x : 0,
          moveZ: defender && usesDirection ? sideStep.z : 0,
          jumpPressed: defender && usesJump && tick === 0,
          jumpHeld: defender && usesJump && tick < 4,
        });
      })),
    })
  ));
  return normalizeCounterfactualOptions(bundle, {
    context,
    mapSituation,
    defenderInputScript: script,
  }).defenderInputScript;
}

function controlScript(
  script: readonly ArenaWeaponCounterplayInputTickV1[],
): readonly ArenaWeaponCounterplayInputTickV1[] {
  return Object.freeze(script.map(({ tick, inputs }) => Object.freeze({
    tick,
    inputs: Object.freeze(inputs.map((input) => Object.freeze({
      ...input,
      ...(input.participantId === TARGET_ID ? {
        moveX: 0,
        moveZ: 0,
        jumpPressed: false,
        jumpHeld: false,
      } : {}),
    }))),
  })));
}

function fullInputFrames(
  tick: number,
  action: ActionDefinition,
  movementInputs: readonly ArenaWeaponCounterplayMovementInputV1[],
): readonly ArenaInputFrame[] {
  return Object.freeze(movementInputs.map((input) => Object.freeze({
    tick,
    participantId: input.participantId,
    moveX: input.moveX,
    moveZ: input.moveZ,
    primaryPressed: input.participantId === ATTACKER_ID && tick === 0,
    primaryHeld: input.participantId === ATTACKER_ID && holdsPrimaryForAction(action, tick, 0),
    jumpPressed: input.jumpPressed,
    jumpHeld: input.jumpHeld,
    slamPressed: false,
  })));
}

function runCounterfactualVariant(
  bundle: ArenaBaselineWeaponBundleV1,
  options: NormalizedCounterfactualOptions,
  variant: 'control' | 'counterfactual',
): ArenaWeaponDefenderCounterfactualRunV1 {
  const action = actionForContext(bundle, options.context);
  const definition = scene(options.mapSituation, options.context, action);
  const script = variant === 'control'
    ? controlScript(options.defenderInputScript)
    : options.defenderInputScript;
  let engine: ArenaRuleEngineContract | null = null;
  let physics: PhysicsWorld | null = null;
  let movement: MovementSystem | null = null;
  const record = {
    hits: [] as Array<Readonly<{
      attackerId: string; targetId: string; actionDefinitionId: string;
    }>>,
    hitstuns: [] as Array<Readonly<{ participantId: string; ticks: number }>>,
    impulses: [] as Array<Readonly<{ participantId: string; impulse: RuleImpulse }>>,
  };
  let result: ArenaWeaponDefenderCounterfactualRunV1 | null = null;
  let primaryError: unknown;
  let hasPrimaryError = false;
  try {
    engine = createEngine(bundle);
    physics = createLightweightPhysicsWorld({ arena: MAP.arena });
    movement = createMovementSystem();
    const ownedEngine = engine;
    const ownedPhysics = physics;
    const ownedMovement = movement;
    addCharacter(ownedPhysics, ATTACKER_ID, definition.sourcePosition, definition.facing);
    addCharacter(ownedPhysics, TARGET_ID, definition.targetPosition, {
      x: action.targeting.kind === 'rear-cone' ? definition.facing.x : -definition.facing.x,
      z: action.targeting.kind === 'rear-cone' ? definition.facing.z : -definition.facing.z,
    });
    equipAttacker(ownedEngine, bundle, ownedPhysics);
    const initialTargetState = ownedPhysics.getCharacterState(TARGET_ID);
    const recordedFrames: ArenaInputFrame[] = [];
    let actionStarted = false;
    let hitCount = 0;
    let firstHitTick: number | null = null;
    let targetMovementCommandCount = 0;
    let directionIntentAppliedTickCount = 0;
    let jumpPressedTickCount = 0;
    let jumpHeldTickCount = 0;
    let targetMaximumHorizontalDisplacement = 0;
    let targetFirstUnsupportedTick: number | null = null;
    let targetFallTick: number | null = null;
    for (const { tick, inputs } of script) {
      ownedEngine.advanceTimers();
      ownedMovement.prepareTick({
        tick,
        contacts: PARTICIPANT_IDS.map((participantId) => ({
          participantId,
          grounded: ownedPhysics.getCharacterState(participantId).grounded,
        })),
        inputs,
        availability: PARTICIPANT_IDS.map((participantId) => ({ participantId, canMove: true })),
      });
      const frames = fullInputFrames(tick, action, inputs);
      recordedFrames.push(...frames);
      const started = ownedEngine.resolveActions({
        tick,
        actors: actors(ownedPhysics),
        inputFrames: frames,
        additionalCandidates: PARTICIPANT_IDS.map((participantId) => Object.freeze({
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
      }
      targetMovementCommandCount += started.movementCommands.filter((command, index) => {
        const record = assertPlainRecord(
          command,
          `Arena baseline movement command[${index}]`,
        );
        return record.participantId === TARGET_ID;
      }).length;
      ownedMovement.execute(
        started.movementCommands.map(createMovementCommand),
        { applyBatch: (mutations) => ownedPhysics.applyCharacterMutationBatch(mutations) },
      );
      ownedEngine.commit(started, mutationPorts(ownedPhysics, record));
      const active = ownedEngine.resolveActiveActions({ actors: actors(ownedPhysics) });
      const targetHits = active.hits.filter(({ attackerId, targetId }) => (
        attackerId === ATTACKER_ID && targetId === TARGET_ID
      ));
      if (targetHits.length > 0 && firstHitTick === null) firstHitTick = tick;
      hitCount += targetHits.length;
      ownedEngine.commit(active, mutationPorts(ownedPhysics, record));
      for (const input of inputs) {
        const intent = ownedMovement.projectHorizontalIntent(
          input.participantId,
          input.moveX,
          input.moveZ,
        );
        ownedPhysics.setMovementIntent(input.participantId, intent.x, intent.z);
        if (input.participantId === TARGET_ID) {
          if (intent.x !== 0 || intent.z !== 0) directionIntentAppliedTickCount += 1;
          if (input.jumpPressed) jumpPressedTickCount += 1;
          if (input.jumpHeld) jumpHeldTickCount += 1;
        }
      }
      ownedPhysics.step(ARENA_FIXED_DT);
      completeMovementTick(ownedMovement, ownedPhysics, tick);
      const target = ownedPhysics.getCharacterState(TARGET_ID);
      targetMaximumHorizontalDisplacement = Math.max(
        targetMaximumHorizontalDisplacement,
        Math.hypot(
          target.position.x - initialTargetState.position.x,
          target.position.z - initialTargetState.position.z,
        ),
      );
      if (!target.grounded && targetFirstUnsupportedTick === null) {
        targetFirstUnsupportedTick = tick;
      }
      if (target.position.y < MAP.arena.killY && targetFallTick === null) targetFallTick = tick;
    }
    const authority = Object.freeze({
      variant,
      inputFrames: Object.freeze(recordedFrames),
      actionStarted,
      hitCount,
      firstHitTick,
      targetMovementCommandCount,
      directionIntentAppliedTickCount,
      jumpPressedTickCount,
      jumpHeldTickCount,
      targetMaximumHorizontalDisplacement,
      targetFirstUnsupportedTick,
      targetFallTick,
      initialTargetState,
      finalTargetState: ownedPhysics.getCharacterState(TARGET_ID),
    });
    result = Object.freeze({
      ...authority,
      resultHash: createDeterministicDataHash(
        authority,
        `${bundle.id}.${options.context}.${variant} counterfactual`,
      ),
    });
  } catch (error) {
    primaryError = error;
    hasPrimaryError = true;
  }
  const cleanupErrors: unknown[] = [];
  for (const destroy of [
    movement === null ? null : () => movement!.destroy(),
    physics === null ? null : () => physics!.destroy(),
    engine === null ? null : () => engine!.destroy(),
  ]) {
    if (destroy === null) continue;
    try {
      destroy();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      hasPrimaryError ? [primaryError, ...cleanupErrors] : cleanupErrors,
      `P4 ${bundle.id}/${options.context}/${variant}主流程或清理失败。`,
    );
  }
  if (hasPrimaryError) throw primaryError;
  if (result === null) throw new Error('P4 counterfactual未形成结果。');
  return result;
}

function differenceAxes(
  control: ArenaWeaponDefenderCounterfactualRunV1,
  counterfactual: ArenaWeaponDefenderCounterfactualRunV1,
): Readonly<{ attack: readonly string[]; physical: readonly string[] }> {
  const attack = Object.freeze([
    ...(control.hitCount === counterfactual.hitCount ? [] : ['hitCount']),
    ...(control.firstHitTick === counterfactual.firstHitTick ? [] : ['firstHitTick']),
    ...(control.targetFallTick === counterfactual.targetFallTick ? [] : ['targetFallTick']),
  ]);
  const physical = Object.freeze([
    ...(control.targetMaximumHorizontalDisplacement
      === counterfactual.targetMaximumHorizontalDisplacement
      ? [] : ['targetMaximumHorizontalDisplacement']),
    ...(control.targetFirstUnsupportedTick === counterfactual.targetFirstUnsupportedTick
      ? [] : ['targetFirstUnsupportedTick']),
    ...(control.finalTargetState.supportSurfaceId
      === counterfactual.finalTargetState.supportSurfaceId
      ? [] : ['finalSupportSurfaceId']),
    ...(createDeterministicDataHash(control.finalTargetState, 'control target state')
      === createDeterministicDataHash(counterfactual.finalTargetState, 'counter target state')
      ? [] : ['finalTargetState']),
  ]);
  return Object.freeze({ attack, physical });
}

function assertOnlyDefenderMovementDiffers(
  control: ArenaWeaponDefenderCounterfactualRunV1,
  counterfactual: ArenaWeaponDefenderCounterfactualRunV1,
): void {
  if (control.inputFrames.length !== counterfactual.inputFrames.length) {
    throw new RangeError('P4 control/counterfactual输入帧数不一致。');
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
    ) throw new RangeError('P4 control/counterfactual不能改变tick、participant或attacker action。');
    if (before.participantId === ATTACKER_ID && (
      before.moveX !== after.moveX
      || before.moveZ !== after.moveZ
      || before.jumpPressed !== after.jumpPressed
      || before.jumpHeld !== after.jumpHeld
    )) throw new RangeError('P4 counterfactual不能改变attacker movement输入。');
    if (before.participantId === TARGET_ID && (
      before.moveX !== 0
      || before.moveZ !== 0
      || before.jumpPressed
      || before.jumpHeld
    )) throw new RangeError('P4 control defender输入必须为零。');
  }
}

export function runArenaWeaponDefenderCounterfactualProbeCandidateV1(
  bundle: ArenaBaselineWeaponBundleV1,
  value: unknown,
): ArenaWeaponDefenderCounterfactualProbeV1 {
  if (
    bundle.actions.length !== 2
    || bundle.grammar.equipmentDefinitionId !== bundle.equipment.id
    || bundle.grammar.contexts.some((context, index) => (
      context.actionDefinitionId !== bundle.actions[index]?.id
    ))
  ) throw new RangeError(`P4 ${bundle.id} counterfactual bundle身份不闭合。`);
  const options = normalizeCounterfactualOptions(bundle, value);
  const action = actionForContext(bundle, options.context);
  const control = runCounterfactualVariant(bundle, options, 'control');
  const counterfactual = runCounterfactualVariant(bundle, options, 'counterfactual');
  assertOnlyDefenderMovementDiffers(control, counterfactual);
  if (createDeterministicDataHash(control.initialTargetState, 'control initial target')
    !== createDeterministicDataHash(counterfactual.initialTargetState, 'counter initial target')) {
    throw new RangeError('P4 control/counterfactual起始物理场景不一致。');
  }
  if (!control.actionStarted || !counterfactual.actionStarted || control.hitCount === 0) {
    throw new RangeError(`P4 ${bundle.id}/${options.context}反事实缺少可对照的真实攻击。`);
  }
  const declaredCounterInputs = bundle.grammar.contexts.find(({ kind }) => (
    kind === options.context
  ))!.counterInputs;
  if (
    declaredCounterInputs.includes('direction')
    && counterfactual.directionIntentAppliedTickCount === 0
  ) throw new RangeError(`P4 ${bundle.id}/${options.context} direction未进入Movement投影。`);
  if (declaredCounterInputs.includes('jump') && (
    counterfactual.jumpPressedTickCount === 0
    || counterfactual.jumpHeldTickCount === 0
    || counterfactual.targetMovementCommandCount === 0
  )) throw new RangeError(`P4 ${bundle.id}/${options.context} jump未进入Rule/Movement command。`);
  const differences = differenceAxes(control, counterfactual);
  const authority = Object.freeze({
    probeId: `arena-p4.${bundle.id}.${options.context}.${options.mapSituation}.counterfactual.v1`,
    weaponId: bundle.id,
    equipmentDefinitionId: bundle.equipment.id,
    grammarDefinitionId: bundle.grammar.id,
    actionDefinitionId: action.id,
    weaponContentHash: bundle.contentHash,
    context: options.context,
    mapSituation: options.mapSituation,
    seed: COUNTERFACTUAL_SEED,
    declaredCounterInputs,
    control,
    counterfactual,
    attackOutcomeDifferenceAxes: differences.attack,
    physicalDifferenceAxes: differences.physical,
    counterplayChangedAttackOutcome: differences.attack.length > 0,
    counterplayChangedObservableOutcome:
      differences.attack.length > 0 || differences.physical.length > 0,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      `${bundle.id}.${options.context} defender counterfactual probe`,
    ),
  });
}

function runWhiffProbe(
  bundle: ArenaBaselineWeaponBundleV1,
  context: WeaponActionContextKindV1,
): Readonly<{
  started: boolean;
  hitCount: number;
  feedbackSemantic: ArenaWeaponFeedbackSemanticEventV1;
}> {
  const engine = createEngine(bundle);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  try {
    const groundY = characterCenterY(0.5);
    const action = actionForContext(bundle, context);
    const source = {
      x: -2.8,
      y: groundY + (context === 'aerial' ? 1 + action.timing.windupTicks * 0.3 : 0),
      z: 0,
    };
    const target = { x: 2.8, y: groundY, z: context === 'aerial' ? 2 : 0 };
    addCharacter(physics, ATTACKER_ID, source, { x: 1, z: 0 });
    addCharacter(physics, TARGET_ID, target, { x: -1, z: 0 });
    const initialSupportSurfaceId = physics.getCharacterState(TARGET_ID).supportSurfaceId;
    if (initialSupportSurfaceId === null) throw new Error('P4 whiff探针缺少目标起始支撑面。');
    equipAttacker(engine, bundle, physics);
    const started = engine.resolveActions({
      tick: 0,
      actors: actors(physics),
      inputFrames: inputFrames(0, true),
      additionalCandidates: additionalCandidates(engine, context),
    });
    const record = { hits: [], hitstuns: [], impulses: [] } as {
      hits: Array<Readonly<{
        attackerId: string; targetId: string; actionDefinitionId: string;
      }>>;
      hitstuns: Array<Readonly<{ participantId: string; ticks: number }>>;
      impulses: Array<Readonly<{ participantId: string; impulse: RuleImpulse }>>;
    };
    const ports = mutationPorts(physics, record);
    engine.commit(started, ports);
    let hitCount = 0;
    const actionWindowTicks = action.timing.windupTicks
      + action.timing.activeTicks
      + action.timing.recoveryTicks;
    for (let tick = 1; tick <= actionWindowTicks; tick += 1) {
      engine.advanceTimers();
      const continuation = engine.resolveActions({
        tick,
        actors: actors(physics),
        inputFrames: inputFrames(tick, false, holdsPrimaryForAction(action, tick, 0)),
        additionalCandidates: additionalCandidates(engine, context),
      });
      engine.commit(continuation, ports);
      const active = engine.resolveActiveActions({ actors: actors(physics) });
      hitCount += active.hits.length;
      engine.commit(active, ports);
    }
    const finalSupportSurfaceId = physics.getCharacterState(TARGET_ID).supportSurfaceId;
    return Object.freeze({
      started: started.starts.some(({ participantId, actionDefinitionId }) => (
        participantId === ATTACKER_ID && actionDefinitionId === action.id
      )),
      hitCount,
      feedbackSemantic: resolveArenaWeaponFeedbackSemanticV1({
        id: `arena-p4.${bundle.id}.${context}.whiff.feedback.v1`,
        sequence: 0,
        resolutionTick: actionWindowTicks,
        attackerId: ATTACKER_ID,
        targetId: TARGET_ID,
        actionDefinitionId: action.id,
        actionStartedTick: 0,
        firstHitTick: null,
        targetFallTick: null,
        initialSupportSurfaceId,
        finalSupportSurfaceId,
        fallCause: null,
        creditedAttackerId: null,
      }),
    });
  } finally {
    engine.destroy();
    physics.destroy();
  }
}

function runCooldownProbe(
  bundle: ArenaBaselineWeaponBundleV1,
  context: WeaponActionContextKindV1,
): boolean {
  const engine = createEngine(bundle);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  try {
    const action = actionForContext(bundle, context);
    const definition = scene('edge', context, action);
    addCharacter(physics, ATTACKER_ID, definition.sourcePosition, definition.facing);
    addCharacter(physics, TARGET_ID, definition.targetPosition, {
      x: -definition.facing.x,
      z: -definition.facing.z,
    });
    equipAttacker(engine, bundle, physics);
    const started = engine.resolveActions({
      tick: 0,
      actors: actors(physics),
      inputFrames: inputFrames(0, true),
      additionalCandidates: additionalCandidates(engine, context),
    });
    engine.commit(started, mutationPorts(physics, { hits: [], hitstuns: [], impulses: [] }));
    engine.resetParticipant(ATTACKER_ID);
    engine.advanceTimers();
    const rejected = engine.resolveActions({
      tick: 1,
      actors: actors(physics),
      inputFrames: inputFrames(1, true),
      additionalCandidates: additionalCandidates(engine, context),
    });
    return rejected.starts.length === 0
      && rejected.resolutions.some(({ reason }) => reason === 'equipment-cooldown');
  } finally {
    engine.destroy();
    physics.destroy();
  }
}

function runInterruptionProbe(bundle: ArenaBaselineWeaponBundleV1): Readonly<{
  targetWasActive: boolean;
  committed: boolean;
}> {
  const engine = createEngine(bundle);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  const record = {
    hits: [] as Array<Readonly<{
      attackerId: string; targetId: string; actionDefinitionId: string;
    }>>,
    hitstuns: [] as Array<Readonly<{ participantId: string; ticks: number }>>,
    impulses: [] as Array<Readonly<{ participantId: string; impulse: RuleImpulse }>>,
  };
  try {
    const groundY = characterCenterY(0.5);
    addCharacter(physics, ATTACKER_ID, { x: 0, y: groundY, z: 0 }, { x: 1, z: 0 });
    addCharacter(physics, TARGET_ID, { x: 1.2, y: groundY, z: 0 }, { x: 1, z: 0 });
    equipAttacker(engine, bundle, physics);
    const action = actionForContext(bundle, 'ground');
    const isolatedActors = () => actors(physics, new Set([ATTACKER_ID]));
    const maximumTicks = action.timing.windupTicks + action.timing.activeTicks + 3;
    for (let tick = 0; tick < maximumTicks; tick += 1) {
      engine.advanceTimers();
      const started = engine.resolveActions({
        tick,
        actors: isolatedActors(),
        inputFrames: interruptionInputFrames(tick, action),
        additionalCandidates: [],
      });
      engine.commit(started, mutationPorts(physics, record));
      const active = engine.resolveActiveActions({ actors: isolatedActors() });
      const attackerHitTarget = active.hits.some(({ attackerId, targetId }) => (
        attackerId === ATTACKER_ID && targetId === TARGET_ID
      ));
      if (attackerHitTarget) {
        const before = engine.getActionSnapshot(TARGET_ID);
        const targetWasActive = before.definitionId === action.id
          && before.phase === ARENA_ACTION_PHASE.ACTIVE;
        engine.commit(active, mutationPorts(physics, record));
        const after = engine.getActionSnapshot(TARGET_ID);
        return Object.freeze({
          targetWasActive,
          committed: targetWasActive && after.definitionId === null,
        });
      }
      engine.commit(active, mutationPorts(physics, record));
      physics.setMovementIntent(ATTACKER_ID, 0, 0);
      physics.setMovementIntent(TARGET_ID, 0, 0);
      physics.step(ARENA_FIXED_DT);
    }
    throw new Error(`P4 ${bundle.id}打断探针未命中。`);
  } finally {
    engine.destroy();
    physics.destroy();
  }
}

function runScenario(
  bundle: ArenaBaselineWeaponBundleV1,
  context: WeaponActionContextKindV1,
  mapSituation: typeof SCENE_SITUATIONS[number],
): ArenaBaselineWeaponConsequenceScenarioV1 {
  const scenarioId = `arena-p4.${bundle.id}.${context}.${mapSituation}.v1`;
  const action = actionForContext(bundle, context);
  const definition = scene(mapSituation, context, action);
  const engine = createEngine(bundle);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  const movement = createMovementSystem();
  const record = {
    hits: [] as Array<Readonly<{
      attackerId: string; targetId: string; actionDefinitionId: string;
    }>>,
    hitstuns: [] as Array<Readonly<{ participantId: string; ticks: number }>>,
    impulses: [] as Array<Readonly<{ participantId: string; impulse: RuleImpulse }>>,
  };
  try {
    addCharacter(physics, ATTACKER_ID, definition.sourcePosition, definition.facing);
    addCharacter(
      physics,
      TARGET_ID,
      definition.targetPosition,
      action.targeting.kind === 'rear-cone'
        ? definition.facing
        : { x: -definition.facing.x, z: -definition.facing.z },
    );
    equipAttacker(engine, bundle, physics);
    let selectedFromEquipmentSystem = false;
    let actionStarted = false;
    let commitmentCancelledCount = 0;
    let commitmentCommittedCount = 0;
    let hitCount = 0;
    let movementCommandCount = 0;
    let movementCommandExecuted = false;
    let hitTick: number | null = null;
    let initialTarget: PhysicsCharacterState | null = null;
    let targetFirstUnsupportedTick: number | null = null;
    let targetFallTick: number | null = null;
    let sourceFallTick: number | null = null;
    let targetMaximumHorizontalDisplacement = 0;

    const maximumTicks = action.timing.windupTicks
      + action.timing.activeTicks
      + CONSEQUENCE_TICKS;
    for (let tick = 0; tick < maximumTicks; tick += 1) {
      engine.advanceTimers();
      prepareMovementTick(movement, physics, tick);
      const capabilities = movement.getCapabilities(ATTACKER_ID);
      const candidates = context === 'aerial'
        ? Object.freeze([Object.freeze({
          participantId: ATTACKER_ID,
          candidates: engine.getMovementActionCandidates(capabilities),
        })])
        : Object.freeze([]);
      const started = engine.resolveActions({
        tick,
        actors: actors(physics),
        inputFrames: inputFrames(
          tick,
          tick === 0,
          holdsPrimaryForAction(action, tick, 0),
        ),
        additionalCandidates: candidates,
      });
      commitmentCancelledCount += started.events.filter(
        ({ type }) => type === 'ActionCommitmentCancelled',
      ).length;
      commitmentCommittedCount += started.events.filter(
        ({ type }) => type === 'ActionCommitmentCommitted',
      ).length;
      if (tick === 0) {
        const selected = started.resolutions.find(({ participantId, actionDefinitionId }) => (
          participantId === ATTACKER_ID && actionDefinitionId === action.id
        ));
        selectedFromEquipmentSystem = selected?.source === 'equipment-system';
        actionStarted = started.starts.some(({ participantId, actionDefinitionId }) => (
          participantId === ATTACKER_ID && actionDefinitionId === action.id
        ));
      }
      movementCommandCount += started.movementCommands.length;
      const movementExecutions = movement.execute(
        started.movementCommands.map(createMovementCommand),
        { applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations) },
      );
      if (movementExecutions.length > 0) movementCommandExecuted = true;
      engine.commit(started, mutationPorts(physics, record));
      const active = engine.resolveActiveActions({ actors: actors(physics) });
      if (active.hits.length > 0 && hitTick === null) {
        hitTick = tick;
        initialTarget = physics.getCharacterState(TARGET_ID);
      }
      hitCount += active.hits.length;
      engine.commit(active, mutationPorts(physics, record));
      physics.setMovementIntent(ATTACKER_ID, 0, 0);
      physics.setMovementIntent(TARGET_ID, 0, 0);
      physics.step(ARENA_FIXED_DT);
      completeMovementTick(movement, physics, tick);

      if (hitTick !== null && initialTarget !== null) {
        const consequenceTick = tick - hitTick;
        const target = physics.getCharacterState(TARGET_ID);
        const source = physics.getCharacterState(ATTACKER_ID);
        targetMaximumHorizontalDisplacement = Math.max(
          targetMaximumHorizontalDisplacement,
          Math.hypot(
            target.position.x - initialTarget.position.x,
            target.position.z - initialTarget.position.z,
          ),
        );
        if (!target.grounded && targetFirstUnsupportedTick === null) {
          targetFirstUnsupportedTick = consequenceTick;
        }
        if (target.position.y < MAP.arena.killY && targetFallTick === null) {
          targetFallTick = consequenceTick;
        }
        if (source.position.y < MAP.arena.killY && sourceFallTick === null) {
          sourceFallTick = consequenceTick;
        }
        if (consequenceTick + 1 >= CONSEQUENCE_TICKS) break;
      }
    }
    if (hitTick === null || initialTarget === null) {
      throw new Error(`${scenarioId}未在动作active窗口命中。`);
    }
    const whiff = runWhiffProbe(bundle, context);
    const cooldownRejected = runCooldownProbe(bundle, context);
    const interruption = runInterruptionProbe(bundle);
    const targetFinalState = physics.getCharacterState(TARGET_ID);
    const sourceFinalState = physics.getCharacterState(ATTACKER_ID);
    if (targetFallTick !== null && (
      initialTarget.supportSurfaceId === null || targetFinalState.supportSurfaceId !== null
    )) {
      throw new RangeError(
        `${scenarioId}记录了targetFall但支撑面未闭合 (${String(initialTarget.supportSurfaceId)} -> ${String(targetFinalState.supportSurfaceId)})。`,
      );
    }
    const feedbackSemantic = resolveArenaWeaponFeedbackSemanticV1({
      id: `${scenarioId}:feedback`,
      sequence: 0,
      resolutionTick: maximumTicks - 1,
      attackerId: ATTACKER_ID,
      targetId: TARGET_ID,
      actionDefinitionId: action.id,
      actionStartedTick: 0,
      firstHitTick: hitTick,
      targetFallTick: targetFallTick === null ? null : hitTick + targetFallTick,
      initialSupportSurfaceId: initialTarget.supportSurfaceId,
      finalSupportSurfaceId: targetFinalState.supportSurfaceId,
      fallCause: targetFallTick === null ? null : 'credited-hit',
      creditedAttackerId: targetFallTick === null ? null : ATTACKER_ID,
    });
    const scenario = Object.freeze({
      id: scenarioId,
      weaponId: bundle.id,
      equipmentDefinitionId: bundle.equipment.id,
      actionDefinitionId: action.id,
      coreVerb: bundle.grammar.coreVerb,
      context,
      mapSituation,
      expectedSurfaceId: definition.expectedSurfaceId,
      selectedFromEquipmentSystem,
      actionStarted,
      commitmentCancelledCount,
      commitmentCommittedCount,
      hitCount,
      recordedHitCount: record.hits.length,
      hitstunTicks: record.hitstuns.find(({ participantId }) => participantId === TARGET_ID)?.ticks
        ?? null,
      appliedImpulses: Object.freeze(record.impulses),
      movementCommandCount,
      movementCommandExecuted,
      cooldownRejected,
      interruptTargetWasActive: interruption.targetWasActive,
      interruptCommitted: interruption.committed,
      whiffStarted: whiff.started,
      whiffHitCount: whiff.hitCount,
      whiffFeedbackSemantic: whiff.feedbackSemantic,
      targetFirstUnsupportedTick,
      targetFallTick,
      sourceFallTick,
      targetMaximumHorizontalDisplacement,
      targetFinalState,
      sourceFinalState,
      feedbackSemantic,
    });
    return Object.freeze({
      ...scenario,
      resultHash: createDeterministicDataHash(scenario, scenarioId),
    });
  } finally {
    movement.destroy();
    engine.destroy();
    physics.destroy();
  }
}

export interface ArenaWeaponCommitmentCancellationProbeCandidateV1 {
  readonly weaponId: string;
  readonly context: WeaponActionContextKindV1;
  readonly actionDefinitionId: string;
  readonly started: boolean;
  readonly cancellationEventCount: number;
  readonly cancelledAtTick: 1;
  readonly actionDefinitionIdAfterCancellation: null;
  readonly resultHash: string;
}

export function runArenaWeaponCommitmentCancellationProbeCandidateV1(
  bundle: ArenaBaselineWeaponBundleV1,
  context: WeaponActionContextKindV1,
): ArenaWeaponCommitmentCancellationProbeCandidateV1 {
  const action = actionForContext(bundle, context);
  if (!action.commitment) throw new RangeError(`P4 ${bundle.id}/${context}缺少承诺合同。`);
  const engine = createEngine(bundle);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  try {
    const definition = scene('edge', context, action);
    addCharacter(physics, ATTACKER_ID, definition.sourcePosition, definition.facing);
    addCharacter(physics, TARGET_ID, definition.targetPosition, {
      x: -definition.facing.x,
      z: -definition.facing.z,
    });
    equipAttacker(engine, bundle, physics);
    const ports = mutationPorts(physics, { hits: [], hitstuns: [], impulses: [] });
    const startedBatch = engine.resolveActions({
      tick: 0,
      actors: actors(physics),
      inputFrames: inputFrames(0, true, true),
      additionalCandidates: additionalCandidates(engine, context),
    });
    engine.commit(startedBatch, ports);
    engine.advanceTimers();
    const cancellationBatch = engine.resolveActions({
      tick: 1,
      actors: actors(physics),
      inputFrames: inputFrames(1, false, false),
      additionalCandidates: additionalCandidates(engine, context),
    });
    engine.commit(cancellationBatch, ports);
    const authority = Object.freeze({
      weaponId: bundle.id,
      context,
      actionDefinitionId: action.id,
      started: startedBatch.starts.some(({ actionDefinitionId }) => actionDefinitionId === action.id),
      cancellationEventCount: cancellationBatch.events.filter(
        ({ type }) => type === 'ActionCommitmentCancelled',
      ).length,
      cancelledAtTick: 1 as const,
      actionDefinitionIdAfterCancellation: engine.getActionSnapshot(ATTACKER_ID).definitionId,
    });
    if (authority.actionDefinitionIdAfterCancellation !== null) {
      throw new Error(`P4 ${bundle.id}/${context}提前释放后动作未取消。`);
    }
    return Object.freeze({
      ...authority,
      actionDefinitionIdAfterCancellation: null,
      resultHash: createDeterministicDataHash(
        authority,
        `Arena P4 ${bundle.id}/${context} commitment cancellation`,
      ),
    });
  } finally {
    engine.destroy();
    physics.destroy();
  }
}

function runMovementFallFeedbackSemanticCandidateV1(): ArenaWeaponFeedbackSemanticEventV1 {
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  try {
    const groundY = characterCenterY(0.5);
    addCharacter(
      physics,
      TARGET_ID,
      { x: 2.75, y: groundY, z: 0 },
      { x: 1, z: 0 },
    );
    const initialSupportSurfaceId = physics.getCharacterState(TARGET_ID).supportSurfaceId;
    if (initialSupportSurfaceId === null) {
      throw new Error('P4 movement-fall反馈探针缺少起始权威支撑面。');
    }
    let fallTick: number | null = null;
    for (let tick = 0; tick < CONSEQUENCE_TICKS * 2; tick += 1) {
      physics.setMovementIntent(TARGET_ID, 1, 0);
      physics.step(ARENA_FIXED_DT);
      if (physics.getCharacterState(TARGET_ID).position.y < MAP.arena.killY) {
        fallTick = tick;
        break;
      }
    }
    if (fallTick === null) throw new Error('P4 movement-fall反馈探针未离开地图。');
    return resolveArenaWeaponFeedbackSemanticV1({
      id: 'arena-p4.movement-fall.feedback.v1',
      sequence: 0,
      resolutionTick: fallTick,
      attackerId: null,
      targetId: TARGET_ID,
      actionDefinitionId: null,
      actionStartedTick: null,
      firstHitTick: null,
      targetFallTick: fallTick,
      initialSupportSurfaceId,
      finalSupportSurfaceId: null,
      fallCause: 'movement',
      creditedAttackerId: null,
    });
  } finally {
    physics.destroy();
  }
}

export function runArenaWeaponBundleConsequenceScenariosCandidateV1(
  weapon: ArenaBaselineWeaponBundleV1,
): readonly ArenaBaselineWeaponConsequenceScenarioV1[] {
  if (
    weapon.actions.length !== 2
    || weapon.grammar.equipmentDefinitionId !== weapon.equipment.id
    || weapon.grammar.contexts.some((context, index) => (
      context.actionDefinitionId !== weapon.actions[index]?.id
    ))
  ) throw new RangeError(`P4 ${weapon.id} consequence bundle身份不闭合。`);
  return Object.freeze(SCENE_CONTEXTS.flatMap((context) => (
    SCENE_SITUATIONS.map((situation) => runScenario(weapon, context, situation))
  )));
}

export function runArenaBaselineWeaponConsequenceVerificationCandidateV1():
ArenaBaselineWeaponConsequenceVerificationReportV1 {
  const scenarios = Object.freeze(WEAPONS.flatMap((weapon) => (
    runArenaWeaponBundleConsequenceScenariosCandidateV1(weapon)
  )));
  const movementFallFeedbackSemantic = runMovementFallFeedbackSemanticCandidateV1();
  const report = Object.freeze({
    schemaVersion: ARENA_BASELINE_WEAPON_CONSEQUENCE_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_BASELINE_WEAPON_CONSEQUENCE_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    mapDefinitionId: MAP.id,
    characterDefinitionId: CHARACTER.id,
    usesArenaRuleEngine: true as const,
    usesActionResolver: true as const,
    usesActionExecution: true as const,
    usesTargetingAndEffectRegistries: true as const,
    usesEquipmentSystem: true as const,
    usesSharedPhysics: true as const,
    exercisesGroundAndAerialContexts: true as const,
    exercisesCooldownRejection: true as const,
    exercisesWhiffResolution: true as const,
    exercisesInterruption: true as const,
    exercisesMovementCommandExecution: true as const,
    exercisesIntegratedAerialTickOrder: true as const,
    usesAuthorityWeaponFeedbackResolver: true as const,
    exercisesReplayCheckpoint: false as const,
    exercisesModeLifecycle: false as const,
    weaponContentHashes: Object.freeze(WEAPONS.map(({ id, contentHash }) => Object.freeze({
      id,
      contentHash,
    }))),
    scenarios,
    movementFallFeedbackSemantic,
  });
  return Object.freeze({
    ...report,
    resultHash: createDeterministicDataHash(report, 'Arena P4 baseline weapon consequence V1'),
  });
}
