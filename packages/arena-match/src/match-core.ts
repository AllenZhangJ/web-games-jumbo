import {
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  type ArenaMatchConfig,
  type ArenaMatchConfigOverrides,
  type ArenaMatchPhase,
  createArenaMatchConfig,
} from './match-config.js';
import { MatchParticipantSystem } from './match-participant-system.js';
import {
  MatchTimelineSystem,
  type MatchActiveTickTransition,
  type MatchTimelineSnapshot,
} from './match-timeline-system.js';
import {
  createCharacterRuntimeReference,
  type CharacterRuntimeReference,
} from './character-runtime.js';
import {
  createArenaConfigHash,
  createMatchStateHash,
  type ArenaInternalMatchSnapshot,
} from './state-hash.js';
import {
  ARENA_MATCH_EVENT as EVENT,
  combineCleanupFailure,
  createDeterministicDataHash,
  createRng,
  deriveSeed,
  normalizeInputFrames,
  normalizeThrownError,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
  type DeepReadonly,
  type DeterministicRng,
} from '@number-strategy-jump/arena-contracts';
import {
  assertPhysicsWorld,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  createMovementPhysicsPort,
  type PhysicsVector3,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import {
  assertArenaMapSystem,
  type ArenaMapSystemContract,
} from '@number-strategy-jump/arena-map';
import {
  assertArenaRuleEngine,
  type ActionCandidate,
  type ArenaRuleBatch,
  type ArenaRuleEngineContract,
  type RuleActor,
  type RuleEquipmentPosition,
} from '@number-strategy-jump/arena-core';
import {
  assertCharacterRegistry,
  type CharacterDefinition,
  type CharacterRegistryContract,
} from '@number-strategy-jump/arena-definitions';
import {
  createMovementCommand,
  MovementSystem,
  type MovementMutationPort,
} from '@number-strategy-jump/arena-movement';

// Equipment positions share the character-body coordinate convention so a
// dropped item and a configured spawn can use the same validation path. The
// tolerance covers the physics world's small ground-probe/snap offset without
// accepting unreachable items floating above or buried below a surface.
const EQUIPMENT_SURFACE_HEIGHT_TOLERANCE = 0.1;

type UnknownRecord = Readonly<Record<string, unknown>>;

export interface ArenaAuthorityEvent extends UnknownRecord {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: string;
}

export interface MatchCoreFactoryContext {
  readonly participantIds: readonly string[];
  readonly config: ArenaMatchConfig;
}

export interface MatchCoreMapFactoryContext {
  readonly config: ArenaMatchConfig;
  readonly matchSeed: number;
  readonly equipmentDefinitionCatalog: Readonly<{
    require(definitionId: string): unknown;
  }>;
  readonly characterDefinitionCatalog: Readonly<{
    require(definitionId: string): CharacterDefinition;
  }>;
}

export interface MatchCoreOptions {
  readonly seed?: unknown;
  readonly config?: unknown;
  readonly physicsFactory?: (options: { readonly arena: ArenaMatchConfig['arena'] }) => unknown;
  readonly ruleEngineFactory?: (context: MatchCoreFactoryContext) => unknown;
  readonly mapSystemFactory?: (context: MatchCoreMapFactoryContext) => unknown;
  readonly characterRegistry?: unknown;
}

export interface MatchReplayMetadata {
  readonly schemaVersion: ArenaMatchConfig['schemaVersion'];
  readonly physicsBackendVersion: ArenaMatchConfig['physicsBackendVersion'];
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly matchSeed: number;
  readonly config: ArenaMatchConfigOverrides;
}

interface MovementPreparation {
  readonly additionalCandidates: readonly Readonly<{
    participantId: string;
    candidates: readonly ActionCandidate[];
  }>[];
  readonly resolutionInputFrames: readonly ArenaInputFrame[] | null;
}

interface MatchOutcome {
  readonly winnerId: string | null;
  readonly reason: string;
  readonly isDraw: boolean;
}

function normalizeSeed(seed: unknown): number {
  if (typeof seed !== 'number' || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('match seed 必须是 uint32 整数。');
  }
  return seed;
}

function cloneSnapshotData<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object') return value as DeepReadonly<T>;
  if (Array.isArray(value)) return value.map(cloneSnapshotData) as DeepReadonly<T>;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    cloneSnapshotData(child),
  ])) as DeepReadonly<T>;
}

function cleanupCauses(value: unknown): readonly unknown[] | null {
  if (!value || typeof value !== 'object') return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, 'causes');
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    && Array.isArray(descriptor.value)
    ? descriptor.value
    : null;
}

function requireMapValue<K, V>(map: ReadonlyMap<K, V>, key: K, message: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(message);
  return value;
}

function findDataMethod(value: unknown, name: string): ((...args: unknown[]) => unknown) | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  let target: object | null = value;
  while (target) {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (descriptor) {
      return Object.prototype.hasOwnProperty.call(descriptor, 'value')
        && typeof descriptor.value === 'function'
        ? descriptor.value as (...args: unknown[]) => unknown
        : null;
    }
    target = Object.getPrototypeOf(target) as object | null;
  }
  return null;
}

function adoptFactoryResource<T>(
  candidate: unknown,
  assertion: (value: unknown) => T,
  name: string,
): T {
  try {
    return assertion(candidate);
  } catch (error) {
    const cleanupErrors: Error[] = [];
    try {
      findDataMethod(candidate, 'destroy')?.call(candidate);
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, `${name} 候选资源清理失败`));
    }
    throw combineCleanupFailure(
      normalizeThrownError(error, `${name} 校验失败`),
      cleanupErrors,
      `${name} 校验失败且候选资源清理未完整完成。`,
    );
  }
}

/**
 * Authoritative, renderer-free 1v1 arena simulation. All time is integer ticks;
 * callers may sample snapshots at any render rate without changing outcomes.
 */
export class MatchCore {
  #matchSeed: number;
  #config: ArenaMatchConfig;
  #configHash: string;
  #ruleContentHash: string | null;
  #characterRegistry: CharacterRegistryContract;
  #characterRuntimes: Map<string, CharacterRuntimeReference>;
  #physics: PhysicsWorld | null;
  #movement: MovementSystem | null;
  #movementPhysicsPort: MovementMutationPort | null;
  #rules: ArenaRuleEngineContract | null;
  #map: ArenaMapSystemContract | null;
  #participantSystem: MatchParticipantSystem | null;
  #timeline: MatchTimelineSystem | null;
  #terminalTimelineSnapshot: MatchTimelineSnapshot | null;
  #rngStreams: Readonly<Record<string, DeterministicRng>>;
  #events: ArenaAuthorityEvent[];
  #destroyed: boolean;
  #eventSequence: number;
  #stepping: boolean;

  #requireResource<T>(resource: T | null, name: string): T {
    if (resource === null) throw new Error(`MatchCore ${name} 资源不可用。`);
    return resource;
  }

  get #physicsWorld(): PhysicsWorld {
    return this.#requireResource(this.#physics, 'physics');
  }

  get #movementSystem(): MovementSystem {
    return this.#requireResource(this.#movement, 'movement');
  }

  get #movementPort(): MovementMutationPort {
    return this.#requireResource(this.#movementPhysicsPort, 'movement physics port');
  }

  get #ruleEngine(): ArenaRuleEngineContract {
    return this.#requireResource(this.#rules, 'rules');
  }

  get #mapSystem(): ArenaMapSystemContract {
    return this.#requireResource(this.#map, 'map');
  }

  get #participants(): MatchParticipantSystem {
    return this.#requireResource(this.#participantSystem, 'participants');
  }

  get #matchTimeline(): MatchTimelineSystem {
    return this.#requireResource(this.#timeline, 'timeline');
  }

  #cleanupConstructionFailure(error: unknown): Error {
    const cleanupErrors: Error[] = [];
    try {
      if (typeof this.#timeline?.destroy === 'function') this.#matchTimeline.destroy();
      this.#timeline = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(
        cleanupError,
        'MatchCore timeline 构造清理失败',
      ));
    }
    try {
      if (typeof this.#participantSystem?.destroy === 'function') {
        this.#participants.destroy();
      }
      this.#participantSystem = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(
        cleanupError,
        'MatchCore participant 构造清理失败',
      ));
    }
    try {
      if (typeof this.#movement?.destroy === 'function') this.#movementSystem.destroy();
      this.#movement = null;
      this.#movementPhysicsPort = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore movement 构造清理失败'));
    }
    try {
      if (typeof this.#physics?.destroy === 'function') this.#physicsWorld.destroy();
      this.#physics = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore physics 构造清理失败'));
    }
    try {
      if (typeof this.#rules?.destroy === 'function') this.#ruleEngine.destroy();
      this.#rules = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore rules 构造清理失败'));
    }
    try {
      if (typeof this.#map?.destroy === 'function') this.#mapSystem.destroy();
      this.#map = null;
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, 'MatchCore map 构造清理失败'));
    }
    this.#destroyed = true;
    this.#characterRuntimes?.clear();
    return combineCleanupFailure(
      normalizeThrownError(error, 'MatchCore 构造失败'),
      cleanupErrors,
      'MatchCore 构造失败且清理未完整完成。',
    );
  }

  constructor({
    seed = 1,
    config = {},
    physicsFactory = createLightweightPhysicsWorld,
    ruleEngineFactory,
    mapSystemFactory,
    characterRegistry,
  }: MatchCoreOptions = {}) {
    if (typeof physicsFactory !== 'function') throw new TypeError('physicsFactory 必须是函数。');
    if (typeof ruleEngineFactory !== 'function') {
      throw new TypeError('MatchCore 需要显式 ruleEngineFactory。');
    }
    if (typeof mapSystemFactory !== 'function') {
      throw new TypeError('MatchCore 需要显式 mapSystemFactory。');
    }
    this.#characterRegistry = assertCharacterRegistry(characterRegistry);
    this.#matchSeed = normalizeSeed(seed);
    this.#config = createArenaMatchConfig(config);
    this.#configHash = createArenaConfigHash(this.#config);
    this.#ruleContentHash = null;
    this.#eventSequence = 0;
    this.#events = [];
    this.#destroyed = false;
    this.#terminalTimelineSnapshot = null;
    this.#stepping = false;
    this.#rngStreams = Object.fromEntries(
      ['spawn', 'map', 'equipment', 'bot', 'presentation'].map((name) => [
        name,
        createRng(deriveSeed(this.matchSeed, name)),
      ]),
    );
    this.#characterRuntimes = new Map<string, CharacterRuntimeReference>();
    this.#participantSystem = null;
    this.#timeline = null;
    this.#physics = null;
    this.#movement = null;
    this.#movementPhysicsPort = null;
    this.#rules = null;
    this.#map = null;
    try {
      this.#participantSystem = new MatchParticipantSystem({
        participantIds: this.config.participantIds,
        livesPerParticipant: this.config.livesPerParticipant,
      });
      this.#timeline = new MatchTimelineSystem({
        preparingTicks: this.config.preparingTicks,
        suddenDeathStartTick: this.config.suddenDeathStartTick,
        hardLimitTicks: this.config.hardLimitTicks,
      });
      for (const assignment of this.config.participantCharacters) {
        const runtime = createCharacterRuntimeReference({
          participantId: assignment.participantId,
          definitionId: assignment.definitionId,
          characterRegistry: this.#characterRegistry,
        });
        this.#characterRuntimes.set(runtime.participantId, runtime);
        const definition = this.#characterRegistry.require(runtime.definitionId);
        if (
          !Number.isFinite(this.config.basePush.horizontalImpulse / definition.collision.mass)
          || !Number.isFinite(this.config.basePush.verticalImpulse / definition.collision.mass)
        ) {
          throw new RangeError(
            `basePush impulse 与 CharacterDefinition ${definition.id} 的质量组合后无效。`,
          );
        }
      }
      this.#movement = new MovementSystem({
        airJumpHorizontalImpulse: this.config.airJumpHorizontalImpulse ?? 0,
        participantCharacters: this.config.participantIds.map((participantId) => {
          const runtime = requireMapValue(
            this.#characterRuntimes,
            participantId,
            `participant ${participantId} 缺少 character runtime。`,
          );
          return {
            participantId,
            characterDefinition: this.#characterRegistry.require(runtime.definitionId),
          };
        }),
      });
      this.#rules = adoptFactoryResource(
        ruleEngineFactory({
          participantIds: this.config.participantIds,
          config: this.config,
        }),
        assertArenaRuleEngine,
        'ruleEngineFactory',
      );
      this.#map = adoptFactoryResource(
        mapSystemFactory({
          config: this.config,
          matchSeed: this.matchSeed,
          equipmentDefinitionCatalog: Object.freeze({
            require: (definitionId) => this.#ruleEngine.requireEquipmentDefinition(definitionId),
          }),
          characterDefinitionCatalog: Object.freeze({
            require: (definitionId) => this.#characterRegistry.require(definitionId),
          }),
        }),
        assertArenaMapSystem,
        'mapSystemFactory',
      );
      this.#ruleContentHash = createDeterministicDataHash({
        combat: this.#ruleEngine.getContentHash(),
        map: this.#mapSystem.getContentHash(),
        characters: this.#characterRegistry.list(),
      }, 'Arena authority content');
      if (typeof this.#ruleContentHash !== 'string' || !/^[0-9a-f]{8}$/.test(this.#ruleContentHash)) {
        throw new TypeError('ruleEngine content hash 必须是 8 位十六进制字符串。');
      }
      this.#physics = adoptFactoryResource(
        physicsFactory({ arena: this.config.arena }),
        assertPhysicsWorld,
        'physicsFactory',
      );
      this.#movementPhysicsPort = createMovementPhysicsPort(this.#physicsWorld);
      for (let index = 0; index < this.config.participantIds.length; index += 1) {
        const id = this.config.participantIds[index];
        const spawn = this.config.arena.spawns[index];
        if (id === undefined || spawn === undefined) {
          throw new Error(`participant/spawn 索引 ${index} 不完整。`);
        }
        const runtime = requireMapValue(
          this.#characterRuntimes,
          id,
          `participant ${id} 缺少 character runtime。`,
        );
        const definition = this.#characterRegistry.require(runtime.definitionId);
        this.#physicsWorld.addCharacter({
          id,
          position: spawn,
          ...createCharacterPhysicsProfile(definition),
        });
        this.#physicsWorld.resetCharacter(id, {
          position: spawn,
          velocity: { x: 0, y: 0, z: 0 },
          facing: { x: index === 0 ? 1 : -1, z: 0 },
        });
      }
      for (const spawn of this.config.equipment.initialSpawns) {
        if (!this.#isEquipmentPositionValid(spawn.position)) {
          throw new RangeError(`equipment spawn ${spawn.id} 不在合法竞技场表面。`);
        }
        this.#ruleEngine.spawnEquipment({
          instanceId: `initial:${spawn.id}`,
          definitionId: spawn.definitionId,
          spawnId: spawn.id,
          position: spawn.position,
        });
      }
    } catch (error) {
      throw this.#cleanupConstructionFailure(error);
    }
  }

  get tick(): number {
    return this.#timeline?.tick ?? this.#terminalTimelineSnapshot?.tick ?? 0;
  }

  get matchSeed(): number {
    return this.#matchSeed;
  }

  get config(): ArenaMatchConfig {
    return this.#config;
  }

  get configHash(): string {
    return this.#configHash;
  }

  get ruleContentHash(): string {
    if (this.#ruleContentHash === null) {
      throw new Error('MatchCore rule content hash 尚未初始化。');
    }
    return this.#ruleContentHash;
  }

  get activeTick(): number {
    return this.#timeline?.activeTick ?? this.#terminalTimelineSnapshot?.activeTick ?? 0;
  }

  get phase(): ArenaMatchPhase {
    return this.#timeline?.phase ?? this.#terminalTimelineSnapshot?.phase ?? ARENA_MATCH_PHASE.ENDED;
  }

  get result(): MatchTimelineSnapshot['result'] {
    const result = this.#timeline?.result ?? this.#terminalTimelineSnapshot?.result ?? null;
    return result ? { ...result } : null;
  }

  getCharacterDefinition(participantId: unknown): CharacterDefinition {
    this.#assertUsable();
    const runtime = typeof participantId === 'string'
      ? this.#characterRuntimes.get(participantId)
      : undefined;
    if (!runtime) throw new RangeError(`未知 character participant ${String(participantId)}。`);
    return this.#characterRegistry.require(runtime.definitionId);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MatchCore 已销毁。');
  }

  #emit(type: string, payload: UnknownRecord = {}): ArenaAuthorityEvent {
    const event = {
      id: `${this.matchSeed.toString(16)}:${this.tick}:${this.#eventSequence}`,
      sequence: this.#eventSequence,
      tick: this.tick,
      type,
      ...payload,
    };
    this.#eventSequence += 1;
    this.#events.push(event);
    return event;
  }

  #startRunningIfNeeded(): void {
    if (!this.#matchTimeline.claimMatchStart()) return;
    this.#emit(EVENT.MATCH_STARTED, { participantIds: [...this.config.participantIds] });
    for (const equipment of this.#ruleEngine.listEquipmentSnapshots()) {
      this.#emit(EVENT.EQUIPMENT_SPAWNED, {
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
        spawnId: equipment.spawnId,
        position: equipment.position ? { ...equipment.position } : null,
      });
    }
  }

  step(inputFrames: readonly unknown[] = []): readonly ArenaAuthorityEvent[] {
    this.#assertUsable();
    if (this.phase === ARENA_MATCH_PHASE.ENDED) throw new Error('比赛已经结束，不能继续 step。');
    if (this.#stepping) throw new Error('MatchCore.step() 不可重入。');
    this.#stepping = true;
    try {
      const frames = normalizeInputFrames(inputFrames, {
        tick: this.tick,
        participantIds: this.config.participantIds,
      });
      this.#events = [];
      try {
        return this.#stepNormalized(frames);
      } catch (error) {
        const failure = normalizeThrownError(error, 'MatchCore tick 失败');
        // Internal fail-closed cleanup is allowed after the authoritative
        // mutation phase unwinds; external destroy() remains blocked while a
        // caller-owned input is being validated.
        this.#stepping = false;
        try {
          this.destroy();
        } catch (cleanupError) {
          const causes = cleanupCauses(cleanupError);
          const cleanupErrors = causes
            ? causes.map((cause) => normalizeThrownError(
              cause,
              'MatchCore tick 清理失败',
            ))
            : [normalizeThrownError(cleanupError, 'MatchCore tick 清理失败')];
          throw combineCleanupFailure(
            failure,
            cleanupErrors,
            'MatchCore tick 失败且清理未完整完成。',
          );
        }
        throw failure;
      }
    } finally {
      this.#stepping = false;
    }
  }

  #stepNormalized(frames: readonly ArenaInputFrame[]): readonly ArenaAuthorityEvent[] {
    this.#matchTimeline.beginStep();
    if (this.phase === ARENA_MATCH_PHASE.PREPARING) {
      for (const id of this.config.participantIds) this.#physicsWorld.setMovementIntent(id, 0, 0);
      this.#physicsWorld.step(this.config.fixedDeltaSeconds);
      if (this.#matchTimeline.advancePreparation()) this.#startRunningIfNeeded();
      this.#matchTimeline.completeStep();
      return this.#events.map((event) => ({ ...event }));
    }

    this.#startRunningIfNeeded();
    this.#advanceParticipantTimers();
    this.#ruleEngine.advanceTimers();
    this.#advanceMapState();
    this.#updateEquipmentState();
    const frameById = new Map(frames.map((frame) => [frame.participantId, frame]));
    const movementPreparation = this.#prepareMovement(frameById);
    const startedActions = this.#ruleEngine.resolveActions({
      tick: this.tick,
      actors: this.#createRuleActors(),
      inputFrames: movementPreparation.resolutionInputFrames ?? frames,
      additionalCandidates: movementPreparation.additionalCandidates,
    });
    this.#movementSystem.execute(
      startedActions.movementCommands.map(createMovementCommand),
      this.#movementPort,
    );
    this.#commitRuleBatch(startedActions);
    const activeActions = this.#ruleEngine.resolveActiveActions({ actors: this.#createRuleActors() });
    this.#commitRuleBatch(activeActions);
    this.#applyMovementIntents(frameById);
    this.#physicsWorld.step(this.config.fixedDeltaSeconds);
    this.#completeMovement();
    this.#resolveEliminations();

    if (this.phase !== ARENA_MATCH_PHASE.ENDED) {
      const transition = this.#matchTimeline.advanceActiveTick();
      if (transition.suddenDeathStarted) this.#handleSuddenDeathStarted(transition);
      if (transition.timeoutDue) this.#resolveTimeout();
    }
    this.#matchTimeline.completeStep();
    return this.#events.map((event) => ({ ...event }));
  }

  #advanceParticipantTimers(): void {
    for (const participantId of this.#participants.advanceTimers()) {
      this.#respawnParticipant(participantId, 'timer');
    }
  }

  #createRuleActors(): readonly RuleActor[] {
    return this.config.participantIds.map((id) => {
      const physics = this.#physicsWorld.getCharacterState(id);
      return {
        id,
        canAct: this.#participants.canAct(id),
        targetable: this.#participants.isTargetable(id),
        position: { ...physics.position },
        facing: { ...physics.facing },
      };
    });
  }

  #prepareMovement(frameById: ReadonlyMap<string, ArenaInputFrame>): MovementPreparation {
    const contacts = [];
    const inputs = [];
    const availability = [];
    for (const participantId of this.config.participantIds) {
      const physics = this.#physicsWorld.getCharacterState(participantId);
      const frame = requireMapValue(
        frameById,
        participantId,
        `participant ${participantId} 缺少当前 tick 输入。`,
      );
      contacts.push({ participantId, grounded: physics.grounded });
      inputs.push({
        tick: this.tick,
        participantId,
        jumpPressed: frame.jumpPressed,
        jumpHeld: frame.jumpHeld,
        moveX: frame.moveX,
        moveZ: frame.moveZ,
      });
      availability.push({
        participantId,
        canMove: this.#participants.canAct(participantId),
      });
    }
    this.#movementSystem.prepareTick({
      tick: this.tick,
      contacts,
      inputs,
      availability,
    });
    const additionalCandidates: Array<Readonly<{
      participantId: string;
      candidates: readonly ActionCandidate[];
    }>> = [];
    let resolutionInputFrames: ArenaInputFrame[] | null = null;
    for (let index = 0; index < this.config.participantIds.length; index += 1) {
      const participantId = this.config.participantIds[index];
      if (participantId === undefined) {
        throw new Error(`participant 索引 ${index} 不完整。`);
      }
      const capabilities = this.#movementSystem.getCapabilities(participantId);
      additionalCandidates.push(Object.freeze({
        participantId,
        candidates: this.#ruleEngine.getMovementActionCandidates(capabilities),
      }));
      const frame = requireMapValue(
        frameById,
        participantId,
        `participant ${participantId} 缺少当前 tick 输入。`,
      );
      // Replay records only real semantic edges. A buffered press is an
      // authoritative Movement derivation and is re-presented to the same
      // resolver on the first legal grounded tick until consumed or expired.
      if (
        capabilities.hasBufferedJump
        && capabilities.canGroundJump
        && !frame.jumpPressed
      ) {
        resolutionInputFrames ??= this.config.participantIds.map((id) => requireMapValue(
          frameById,
          id,
          `participant ${id} 缺少当前 tick 输入。`,
        ));
        resolutionInputFrames[index] = Object.freeze({ ...frame, jumpPressed: true });
      }
    }
    return Object.freeze({
      additionalCandidates: Object.freeze(additionalCandidates),
      resolutionInputFrames: resolutionInputFrames
        ? Object.freeze(resolutionInputFrames)
        : null,
    });
  }

  #completeMovement(): void {
    const transitions = this.#movementSystem.completeTick({
      tick: this.tick,
      contacts: this.config.participantIds.map((participantId) => ({
        participantId,
        grounded: this.#physicsWorld.getCharacterState(participantId).grounded,
      })),
    });
    for (const transition of transitions) {
      if (transition.kind !== 'down-smash-landed') {
        throw new RangeError(`未知 Movement transition ${transition.kind}。`);
      }
      this.#emit(EVENT.DOWN_SMASH_LANDED, {
        participantId: transition.participantId,
        action: transition.actionDefinitionId,
      });
    }
  }

  #isEquipmentPositionValid(position: unknown): boolean {
    if (!position || typeof position !== 'object') return false;
    const candidate = position as Partial<RuleEquipmentPosition>;
    if (
      !Number.isFinite(candidate.x)
      || !Number.isFinite(candidate.y)
      || !Number.isFinite(candidate.z)
      || (candidate.y as number) <= this.config.arena.killY
    ) return false;
    const normalized = candidate as RuleEquipmentPosition;
    return this.config.arena.surfaces.some((surface) => {
      if (
        !this.#mapSystem.isSurfaceEnabled(surface.id)
        || Math.abs(normalized.x - surface.center.x) > surface.halfExtents.x
        || Math.abs(normalized.z - surface.center.z) > surface.halfExtents.z
      ) return false;
      const surfaceTop = surface.center.y + surface.halfExtents.y;
      return [...this.#characterRuntimes.values()].some((runtime) => {
        const collision = this.#characterRegistry.require(runtime.definitionId).collision;
        return Math.abs(
          normalized.y - (surfaceTop + collision.radius + collision.halfHeight)
        ) <= EQUIPMENT_SURFACE_HEIGHT_TOLERANCE;
      });
    });
  }

  #advanceMapState(): void {
    const batch = this.#mapSystem.advance({
      activeTick: this.activeTick,
      actors: this.config.participantIds.map((id) => {
        const physics = this.#physicsWorld.getCharacterState(id);
        return {
          id,
          position: { ...physics.position },
          eligible: this.#participants.isActive(id),
        };
      }),
    });
    this.#mapSystem.commit(batch, {
      applyImpulse: (participantId, impulse) => {
        this.#physicsWorld.applyImpulse(participantId, impulse);
      },
      setSurfaceEnabled: (surfaceId, enabled) => {
        this.#physicsWorld.setSurfaceEnabled(surfaceId, enabled);
      },
      spawnEquipment: (spawn) => {
        if (!this.#isEquipmentPositionValid(spawn.position)) {
          throw new RangeError(`map equipment spawn ${spawn.spawnId} 不在可用竞技场表面。`);
        }
        const equipment = this.#ruleEngine.spawnEquipment(spawn);
        this.#emit(EVENT.EQUIPMENT_SPAWNED, {
          equipmentInstanceId: equipment.instanceId,
          equipmentDefinitionId: equipment.definitionId,
          spawnId: equipment.spawnId,
          position: equipment.position ? { ...equipment.position } : null,
        });
      },
    });
    for (const event of batch.events) {
      const { type, ...payload } = event;
      this.#emit(type, payload);
    }
    for (const equipment of this.#ruleEngine.despawnInvalidWorldEquipment({
      isPositionValid: (position: RuleEquipmentPosition) => this.#isEquipmentPositionValid(position),
    })) {
      this.#emit(EVENT.EQUIPMENT_DESPAWNED, {
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
        reason: 'invalid-map-surface',
      });
    }
  }

  #updateEquipmentState(): void {
    const participants = this.config.participantIds.map((id) => {
      const physics = this.#physicsWorld.getCharacterState(id);
      if (
        this.#participants.isActive(id)
        && physics.grounded
        && physics.supportSurfaceId
        && this.#ruleEngine.getHeldEquipment(id)
      ) this.#ruleEngine.updateEquipmentLastSafePosition(id, physics.position);
      return {
        id,
        position: { ...physics.position },
        eligible: this.#participants.isActive(id),
      };
    });
    const pickups = this.#ruleEngine.resolveEquipmentPickups({
      participants,
      contestSeed: deriveSeed(this.matchSeed, `equipment-pickup:${this.tick}`),
    });
    for (const pickup of pickups) {
      const equipment = this.#ruleEngine.getEquipmentSnapshot(pickup.equipmentInstanceId);
      const participant = participants.find(({ id }) => id === pickup.participantId);
      if (!participant) {
        throw new Error(`equipment pickup ${pickup.equipmentInstanceId} 缺少 participant。`);
      }
      const physics = this.#physicsWorld.getCharacterState(pickup.participantId);
      if (physics.grounded && physics.supportSurfaceId) {
        this.#ruleEngine.updateEquipmentLastSafePosition(pickup.participantId, participant.position);
      }
      this.#emit(EVENT.EQUIPMENT_PICKED_UP, {
        participantId: pickup.participantId,
        equipmentInstanceId: equipment.instanceId,
        equipmentDefinitionId: equipment.definitionId,
      });
    }
  }

  #commitRuleBatch(batch: ArenaRuleBatch): void {
    this.#ruleEngine.commit(batch, {
      recordHit: (attackerId, targetId) => {
        this.#participants.recordHit(attackerId, targetId, this.tick);
      },
      applyHitstun: (participantId, ticks) => {
        this.#participants.applyHitstun(participantId, ticks);
      },
      applyImpulse: (participantId, impulse) => {
        this.#physicsWorld.applyImpulse(participantId, impulse);
      },
    });
    for (const event of batch.events) {
      const { type, ...payload } = event;
      this.#emit(type, payload);
    }
  }

  #applyMovementIntents(frameById: ReadonlyMap<string, ArenaInputFrame>): void {
    for (const id of this.config.participantIds) {
      const frame = requireMapValue(
        frameById,
        id,
        `participant ${id} 缺少当前 tick 输入。`,
      );
      if (!this.#participants.canAct(id)) {
        this.#physicsWorld.setMovementIntent(id, 0, 0);
      } else {
        const intent = this.#movementSystem.projectHorizontalIntent(id, frame.moveX, frame.moveZ);
        this.#physicsWorld.setMovementIntent(id, intent.x, intent.z);
      }
    }
  }

  #resolveEliminations(): void {
    const eliminatedIds: string[] = [];
    for (const id of this.config.participantIds) {
      if (!this.#participants.isActive(id)) continue;
      const state = this.#physicsWorld.getCharacterState(id);
      if (state.position.y < this.config.arena.killY) eliminatedIds.push(id);
    }
    if (eliminatedIds.length === 0) return;

    const outcomes = this.#participants.eliminateBatch(eliminatedIds, {
      tick: this.tick,
      suddenDeath: this.phase === ARENA_MATCH_PHASE.SUDDEN_DEATH,
      lastHitCreditTicks: this.config.lastHitCreditTicks,
      respawnTicks: this.config.respawnTicks,
    });
    for (const outcome of outcomes) {
      this.#emit(EVENT.PLAYER_ELIMINATED, {
        participantId: outcome.participantId,
        remainingLives: outcome.remainingLives,
        creditedAttackerId: outcome.creditedAttackerId,
      });
      const dropped = this.#ruleEngine.dropEquipment(outcome.participantId, {
        isPositionValid: (position: RuleEquipmentPosition) => this.#isEquipmentPositionValid(position),
      });
      if (dropped) {
        if (dropped.despawned) {
          this.#emit(EVENT.EQUIPMENT_DESPAWNED, {
            participantId: outcome.participantId,
            equipmentInstanceId: dropped.equipment.instanceId,
            equipmentDefinitionId: dropped.equipment.definitionId,
            reason: 'no-valid-drop-position',
          });
        } else {
          if (!dropped.equipment.position) {
            throw new Error(`equipment ${dropped.equipment.instanceId} 掉落后缺少 position。`);
          }
          this.#emit(EVENT.EQUIPMENT_DROPPED, {
            participantId: outcome.participantId,
            equipmentInstanceId: dropped.equipment.instanceId,
            equipmentDefinitionId: dropped.equipment.definitionId,
            position: { ...dropped.equipment.position },
          });
        }
        if (dropped.fallbackUsed) {
          this.#emit(EVENT.EQUIPMENT_DROP_FALLBACK, {
            participantId: outcome.participantId,
            equipmentInstanceId: dropped.equipment.instanceId,
            diagnosticCode: dropped.diagnosticCode,
          });
        }
      }
      this.#ruleEngine.resetParticipant(outcome.participantId);
      this.#movementSystem.resetParticipant(outcome.participantId);
      this.#physicsWorld.resetCharacter(outcome.participantId, {
        position: this.#holdingPosition(outcome.participantId),
        velocity: { x: 0, y: 0, z: 0 },
      });
    }

    const terminalParticipantIds = this.#participants.listByStatus(
      ARENA_PARTICIPANT_STATUS.ELIMINATED,
    );
    if (terminalParticipantIds.length === 2) {
      this.#endMatch({ winnerId: null, reason: 'simultaneous-elimination', isDraw: true });
    } else if (terminalParticipantIds.length === 1) {
      const winnerId = this.config.participantIds.find(
        (id) => id !== terminalParticipantIds[0],
      );
      if (winnerId === undefined) throw new Error('终局状态缺少可用胜者。');
      this.#endMatch({ winnerId, reason: 'last-participant-standing', isDraw: false });
    }
  }

  #holdingPosition(participantId: string): PhysicsVector3 {
    const spawnIndex = this.#participants.getSpawnIndex(participantId);
    return {
      x: spawnIndex * 4,
      y: this.config.arena.killY - 50 - spawnIndex * 5,
      z: 0,
    };
  }

  #chooseRespawn(participantId: string): PhysicsVector3 {
    const validSpawns = this.config.arena.spawns.filter((spawn) => (
      this.#mapSystem.isPositionOnEnabledSurface(spawn)
    ));
    if (validSpawns.length === 0) throw new Error('当前地图没有合法重生点。');
    const opponents = this.#participants
      .listByStatus(ARENA_PARTICIPANT_STATUS.ACTIVE)
      .filter((id) => id !== participantId)
      .map((id) => this.#physicsWorld.getCharacterState(id));
    const spawnIndex = this.#participants.getSpawnIndex(participantId);
    if (opponents.length === 0) {
      const spawn = validSpawns[spawnIndex % validSpawns.length];
      if (!spawn) throw new Error('合法重生点选择失败。');
      return spawn;
    }
    const best = validSpawns
      .map((spawn, index) => ({
        spawn,
        index,
        nearestOpponentDistance: Math.min(...opponents.map((opponent) => Math.hypot(
          spawn.x - opponent.position.x,
          spawn.z - opponent.position.z,
        ))),
      }))
      .sort((a, b) => (
        b.nearestOpponentDistance - a.nearestOpponentDistance || a.index - b.index
      ))[0];
    if (!best) throw new Error('合法重生点排序失败。');
    return best.spawn;
  }

  #respawnParticipant(
    participantId: string,
    reason: 'timer' | 'phase-transition' = 'phase-transition',
  ): void {
    const spawn = this.#chooseRespawn(participantId);
    const participant = this.#participants.respawn(participantId, {
      invulnerableTicks: this.config.invulnerableTicks,
      reason,
    });
    this.#ruleEngine.resetParticipant(participantId);
    this.#movementSystem.resetParticipant(participantId);
    this.#physicsWorld.resetCharacter(participantId, {
      position: spawn,
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: spawn.x <= 0 ? 1 : -1, z: 0 },
    });
    this.#emit(EVENT.PLAYER_RESPAWNED, {
      participantId,
      position: { ...spawn },
      invulnerableTicks: participant.invulnerableTicks,
    });
  }

  #handleSuddenDeathStarted(transition: MatchActiveTickTransition): void {
    if (this.phase !== ARENA_MATCH_PHASE.SUDDEN_DEATH) {
      throw new Error('Sudden Death transition 与 timeline phase 不一致。');
    }
    for (const participantId of this.#participants.listByStatus(
      ARENA_PARTICIPANT_STATUS.RESPAWNING,
    )) {
      this.#respawnParticipant(participantId);
    }
    this.#emit(EVENT.SUDDEN_DEATH_STARTED, {
      remainingTicks: transition.remainingTicks,
    });
  }

  #resolveTimeout(): void {
    if (this.phase === ARENA_MATCH_PHASE.ENDED) return;
    this.#endMatch(this.#participants.resolveTimeout());
  }

  #endMatch({ winnerId, reason, isDraw }: MatchOutcome): void {
    if (this.phase === ARENA_MATCH_PHASE.ENDED) return;
    for (const participantId of this.#participants.listByStatus(
      ARENA_PARTICIPANT_STATUS.RESPAWNING,
    )) {
      this.#respawnParticipant(participantId);
    }
    const result = this.#matchTimeline.end({
      winnerId,
      reason,
      isDraw,
    });
    for (const id of this.config.participantIds) this.#physicsWorld.setMovementIntent(id, 0, 0);
    this.#emit(EVENT.MATCH_ENDED, { ...result });
  }

  #createSnapshot(includeInternal: false): ArenaMatchSnapshot;
  #createSnapshot(includeInternal: true): ArenaInternalMatchSnapshot;
  #createSnapshot(
    includeInternal: boolean,
  ): ArenaMatchSnapshot | ArenaInternalMatchSnapshot {
    this.#assertUsable();
    const timeline = this.#matchTimeline.getSnapshot();
    // ActionAffordance is a public next-input projection, not authority state.
    // Internal hash snapshots omit it entirely instead of recomputing derived data.
    const ruleActors: readonly RuleActor[] = includeInternal ? [] : this.#createRuleActors();
    const ruleActorById = new Map(ruleActors.map((actor) => [actor.id, actor]));
    const snapshot: ArenaMatchSnapshot = {
      schemaVersion: this.config.schemaVersion,
      physicsBackendVersion: this.config.physicsBackendVersion,
      configHash: this.configHash,
      ruleContentHash: this.ruleContentHash,
      matchSeed: this.matchSeed,
      tick: timeline.tick,
      activeTick: timeline.activeTick,
      phase: timeline.phase,
      remainingTicks: this.#matchTimeline.remainingTicks,
      eventSequence: this.#eventSequence,
      participants: this.config.participantIds.map((id) => {
        const participant = this.#participants.getSnapshot(id);
        const physics = this.#physicsWorld.getCharacterState(id);
        return {
          id,
          characterDefinitionId: requireMapValue(
            this.#characterRuntimes,
            id,
            `participant ${id} 缺少 character runtime。`,
          ).definitionId,
          status: participant.status,
          lives: participant.lives,
          eliminations: participant.eliminations,
          deaths: participant.deaths,
          hitstunTicks: participant.hitstunTicks,
          invulnerableTicks: participant.invulnerableTicks,
          respawnTicks: participant.respawnTicks,
          lastHitBy: participant.lastHitBy,
          lastHitTick: participant.lastHitTick,
          action: (() => {
            const action = this.#ruleEngine.getActionSnapshot(id);
            return {
              definitionId: action.definitionId,
              phase: action.phase,
              ticksRemaining: action.ticksRemaining,
            };
          })(),
          actionRule: this.#ruleEngine.getParticipantActionRule(id),
          movement: (() => {
            const movement = this.#movementSystem.getSnapshot(id);
            return {
              ...movement,
              grounded: physics.grounded,
            };
          })(),
          ...(includeInternal ? {} : {
            actionAffordance: (() => {
              const actor = requireMapValue(
                ruleActorById,
                id,
                `participant ${id} 缺少 rule actor。`,
              );
              const capabilities = this.#movementSystem.projectCapabilities(id, {
                grounded: physics.grounded,
                canMove: actor.canAct,
              });
              return cloneSnapshotData(this.#ruleEngine.getActionAffordance({
                tick: timeline.tick,
                participantId: id,
                actors: ruleActors,
                additionalCandidates: this.#ruleEngine.getMovementActionCandidates(capabilities),
              }));
            })(),
          }),
          equipment: (() => {
            const equipment = this.#ruleEngine.getHeldEquipment(id);
            return equipment ? {
              instanceId: equipment.instanceId,
              definitionId: equipment.definitionId,
              cooldownRemainingTicks: equipment.cooldownRemainingTicks,
            } : null;
          })(),
          position: { ...physics.position },
          velocity: { ...physics.velocity },
          facing: { ...physics.facing },
          grounded: physics.grounded,
          supportSurfaceId: physics.supportSurfaceId,
        };
      }),
      equipment: this.#ruleEngine.listEquipmentSnapshots().map((equipment) => ({
        schemaVersion: equipment.schemaVersion,
        instanceId: equipment.instanceId,
        definitionId: equipment.definitionId,
        spawnId: equipment.spawnId,
        locationState: equipment.locationState,
        ownerId: equipment.ownerId,
        position: equipment.position ? { ...equipment.position } : null,
        lastSafePosition: equipment.lastSafePosition
          ? { ...equipment.lastSafePosition }
          : null,
        cooldownRemainingTicks: equipment.cooldownRemainingTicks,
        revision: equipment.revision,
      })),
      map: cloneSnapshotData(includeInternal
        ? this.#mapSystem.getStateSnapshot()
        : this.#mapSystem.getSnapshot()),
      result: timeline.result,
    };
    if (includeInternal) {
      return Object.freeze({
        ...snapshot,
        rngStates: Object.freeze(Object.fromEntries(
          Object.entries(this.#rngStreams).map(([name, rng]) => [name, rng.snapshot()]),
        )),
      });
    }
    return snapshot;
  }

  getSnapshot(): ArenaMatchSnapshot {
    return this.#createSnapshot(false);
  }

  getStateHash(): string {
    return createMatchStateHash(this.#createSnapshot(true));
  }

  getReplayMetadata(): MatchReplayMetadata {
    return {
      schemaVersion: this.config.schemaVersion,
      physicsBackendVersion: this.config.physicsBackendVersion,
      configHash: this.configHash,
      ruleContentHash: this.ruleContentHash,
      matchSeed: this.matchSeed,
      config: {
        participantIds: [...this.config.participantIds],
        livesPerParticipant: this.config.livesPerParticipant,
        preparingTicks: this.config.preparingTicks,
        suddenDeathStartTick: this.config.suddenDeathStartTick,
        hardLimitTicks: this.config.hardLimitTicks,
        respawnTicks: this.config.respawnTicks,
        invulnerableTicks: this.config.invulnerableTicks,
        lastHitCreditTicks: this.config.lastHitCreditTicks,
        basePush: { ...this.config.basePush },
        participantCharacters: this.config.participantCharacters.map((assignment) => ({
          ...assignment,
        })),
        contentSelection: this.config.contentSelection,
        mapDefinitionId: this.config.mapDefinitionId,
        equipment: {
          initialSpawns: this.config.equipment.initialSpawns.map((spawn) => ({
            id: spawn.id,
            definitionId: spawn.definitionId,
            position: { ...spawn.position },
          })),
        },
        arena: {
          killY: this.config.arena.killY,
          surfaces: this.config.arena.surfaces.map((surface) => ({
            id: surface.id,
            center: { ...surface.center },
            halfExtents: { ...surface.halfExtents },
          })),
          spawns: this.config.arena.spawns.map((spawn) => ({ ...spawn })),
        },
        ...(this.config.airJumpHorizontalImpulse === undefined
          ? {}
          : { airJumpHorizontalImpulse: this.config.airJumpHorizontalImpulse }),
        ...(this.config.contextPrimaryMobilityEnabled === undefined
          ? {}
          : { contextPrimaryMobilityEnabled: this.config.contextPrimaryMobilityEnabled }),
      },
    };
  }

  destroy(): void {
    if (
      this.#destroyed
      && !this.#timeline
      && !this.#participantSystem
      && !this.#movement
      && !this.#rules
      && !this.#map
      && !this.#physics
    ) return;
    if (this.#stepping) throw new Error('step() 期间不能销毁 MatchCore。');
    this.#destroyed = true;
    this.#events.length = 0;
    this.#characterRuntimes.clear();
    const errors: Error[] = [];
    if (this.#timeline) {
      try {
        this.#terminalTimelineSnapshot = this.#matchTimeline.getSnapshot();
        this.#matchTimeline.destroy();
        this.#timeline = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore timeline 清理失败'));
      }
    }
    if (this.#participantSystem) {
      try {
        this.#participants.destroy();
        this.#participantSystem = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore participant 清理失败'));
      }
    }
    if (this.#movement) {
      try {
        this.#movementSystem.destroy();
        this.#movement = null;
        this.#movementPhysicsPort = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore movement 清理失败'));
      }
    }
    if (this.#rules) {
      try {
        this.#ruleEngine.destroy();
        this.#rules = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore rules 清理失败'));
      }
    }
    if (this.#map) {
      try {
        this.#mapSystem.destroy();
        this.#map = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore map 清理失败'));
      }
    }
    if (this.#physics) {
      try {
        this.#physicsWorld.destroy();
        this.#physics = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'MatchCore physics 清理失败'));
      }
    }
    if (errors.length > 0) {
      const cleanupError = Object.assign(new Error('MatchCore 清理未完整完成。'), {
        causes: Object.freeze([...errors]),
      });
      throw cleanupError;
    }
  }
}

export { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-contracts';
