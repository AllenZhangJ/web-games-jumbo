import {
  assertKnownKeys,
  assertPlainRecord,
  createRng,
  createDeterministicDataHash,
  normalizeInputFrame,
  type ArenaInputFrame,
  type ArenaPublicSupplyProjectionLifecycleContract,
  type DeterministicRng,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_PARTICIPANT_STATUS } from '@number-strategy-jump/arena-match';
import {
  BOT_PROFILE_REGISTRY,
} from './bot-difficulty.js';
import {
  assertBotProfileRegistry,
  type BotProfileRegistryContract,
} from './bot-profile-registry.js';
import type { BotProfileDefinition } from './bot-profile-definition.js';
import {
  BOT_GOAL_ID,
  getArenaBotEvaluators,
  type BotGoalId,
  type BotGoalPlan,
} from './bot-goals.js';
import {
  BOT_MOBILITY_INTENT,
  selectBotMobilityIntent,
  type BotMobilityIntent,
} from './bot-mobility-policy.js';
import {
  BotMobilityScheduler,
  type BotMobilityDebugSnapshot,
} from './bot-mobility-scheduler.js';
import {
  cloneBotSourceSnapshot,
  cloneBotCommandSourceV5,
  createBotArenaView,
  createBotCommandSourceV5FromLegacy,
  createBotObservationV5,
  type BotArenaView,
  type BotCommandSourceV5,
  type BotCommandSourceReaderV5,
  type BotObservationV5,
} from './bot-observation.js';
import { createBotPersonality, type BotPersonality } from './bot-personality.js';
import { selectHighestUtility, type UtilityDecision } from './utility-arbitrator.js';

const CONTROLLER_OPTION_KEYS = new Set([
  'participantId',
  'difficultyId',
  'behaviorSeed',
  'personalitySeed',
  'profileRegistry',
  'requireActiveSupplyProjection',
  'supplyProjectionContract',
  'trustedCommandSourceHandle',
  'arena',
  'characterRadius',
  'maximumStepHeight',
]);

export interface BotControllerOptions {
  readonly participantId: string;
  /** A validated Profile Registry ID; default IDs remain easy/normal/hard. */
  readonly difficultyId: string;
  readonly behaviorSeed: number;
  readonly personalitySeed: number;
  readonly profileRegistry?: BotProfileRegistryContract;
  /** Survival composition sets this; ordinary 1v1 keeps the optional view. */
  readonly requireActiveSupplyProjection?: boolean;
  readonly supplyProjectionContract?: ArenaPublicSupplyProjectionLifecycleContract;
  /** Expected opaque PA3b bundle identity; PA3a does not create provenance. */
  readonly trustedCommandSourceHandle?: object;
  readonly arena: unknown;
  readonly characterRadius: number;
  readonly maximumStepHeight?: number;
}

export interface BotControllerDebugSnapshot {
  readonly participantId: string;
  readonly difficultyId: string;
  readonly personality: BotPersonality;
  readonly lastCommandTick: number;
  readonly observedTick: number | null;
  readonly nextPlanTick: number;
  readonly pauseUntilTick: number;
  readonly goalId: BotGoalId | null;
  readonly goalScore: number | null;
  readonly mobilityIntent: BotMobilityIntent;
  readonly mobility: BotMobilityDebugSnapshot;
}

interface NormalizedBotControllerOptions {
  readonly participantId: string;
  readonly difficultyId: string;
  readonly difficulty: BotProfileDefinition;
  readonly behaviorSeed: number;
  readonly personalitySeed: number;
  readonly arena: BotArenaView;
  readonly requireActiveSupplyProjection: boolean;
  readonly supplyProjectionContract?: ArenaPublicSupplyProjectionLifecycleContract;
  readonly trustedCommandSourceHandle: object | null;
}

interface TrustedReaderAttachState {
  reentered: boolean;
}

function equalNormalizedSource(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!equalNormalizedSource(
      (left as Record<string, unknown>)[key],
      (right as Record<string, unknown>)[key],
    )) return false;
  }
  return true;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function readDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function normalizeOptions(options: unknown): NormalizedBotControllerOptions {
  assertKnownKeys(options, CONTROLLER_OPTION_KEYS, 'BotController options');
  const record = assertPlainRecord(options, 'BotController options');
  const participantId = readDataProperty(record, 'participantId', 'BotController options');
  if (typeof participantId !== 'string' || participantId.length === 0) {
    throw new TypeError('Bot participantId 必须是非空字符串。');
  }
  const profileRegistry = assertBotProfileRegistry(
    readOptionalDataProperty(record, 'profileRegistry', 'BotController options')
      ?? BOT_PROFILE_REGISTRY,
  );
  const difficultyId = readDataProperty(record, 'difficultyId', 'BotController options');
  if (typeof difficultyId !== 'string' || difficultyId.length === 0) {
    throw new TypeError('BotController difficultyId 必须是非空字符串。');
  }
  const difficulty = profileRegistry.require(difficultyId);
  const behaviorSeed = uint32(
    readDataProperty(record, 'behaviorSeed', 'BotController options'),
    'behaviorSeed',
  );
  const personalitySeed = uint32(
    readDataProperty(record, 'personalitySeed', 'BotController options'),
    'personalitySeed',
  );
  const requireActiveSupplyProjection = readOptionalDataProperty(
    record,
    'requireActiveSupplyProjection',
    'BotController options',
  );
  if (
    requireActiveSupplyProjection !== undefined
    && typeof requireActiveSupplyProjection !== 'boolean'
  ) {
    throw new TypeError('BotController requireActiveSupplyProjection 必须是布尔值。');
  }
  const supplyProjectionContract = readOptionalDataProperty(
    record,
    'supplyProjectionContract',
    'BotController options',
  );
  if (supplyProjectionContract === null) {
    throw new TypeError('BotController supplyProjectionContract 不能是 null。');
  }
  if (requireActiveSupplyProjection && supplyProjectionContract === undefined) {
    throw new TypeError('survival BotController 必须注入 supplyProjectionContract。');
  }
  const trustedCommandSourceHandle = readOptionalDataProperty(
    record,
    'trustedCommandSourceHandle',
    'BotController options',
  );
  if (
    trustedCommandSourceHandle !== undefined
    && (typeof trustedCommandSourceHandle !== 'object' || trustedCommandSourceHandle === null)
  ) {
    throw new TypeError('BotController trustedCommandSourceHandle 必须是 opaque object。');
  }
  const arena = createBotArenaView(
    readDataProperty(record, 'arena', 'BotController options'),
    readDataProperty(record, 'characterRadius', 'BotController options'),
    readOptionalDataProperty(record, 'maximumStepHeight', 'BotController options'),
  );
  return Object.freeze({
    participantId,
    difficultyId,
    difficulty,
    behaviorSeed,
    personalitySeed,
    arena,
    requireActiveSupplyProjection: requireActiveSupplyProjection ?? false,
    trustedCommandSourceHandle: trustedCommandSourceHandle === undefined
      ? null
      : trustedCommandSourceHandle as object,
    ...(supplyProjectionContract === undefined ? {} : {
      supplyProjectionContract: supplyProjectionContract as ArenaPublicSupplyProjectionLifecycleContract,
    }),
  });
}

export class BotController {
  #participantId: string;
  #difficultyId: string;
  #difficulty: BotProfileDefinition;
  #personality: BotPersonality;
  #rng: DeterministicRng;
  #arena: BotArenaView;
  #sourceSnapshots: BotCommandSourceV5[];
  #currentPlan: UtilityDecision<BotGoalPlan> | null;
  #directionOffsetRadians: number;
  #nextPlanTick: number;
  #pauseUntilTick: number;
  #actionTick: number;
  #mobilityScheduler: BotMobilityScheduler;
  #lastMobilityIntent: BotMobilityIntent;
  #lastCommandTick: number;
  #lastCommandEventSequence: number;
  #lastCommandSource: BotCommandSourceV5 | null;
  #lastCommandSourceHash: string | null;
  #lastInputFrame: ArenaInputFrame | null;
  #requireActiveSupplyProjection: boolean;
  #supplyProjectionContract: ArenaPublicSupplyProjectionLifecycleContract | undefined;
  #trustedCommandSourceReader: BotCommandSourceReaderV5 | null;
  #trustedCommandSourceReaderSource: object | null;
  #trustedCommandSourceHandle: object | null;
  #trustedReaderAttachState: TrustedReaderAttachState | null;
  #creatingInput: boolean;
  #destroyed: boolean;

  constructor(options: BotControllerOptions);
  constructor(options: unknown) {
    const normalized = normalizeOptions(options);
    const personality = createBotPersonality(normalized.personalitySeed);
    const rng = createRng(normalized.behaviorSeed);
    const mobilityScheduler = new BotMobilityScheduler({
      minimumIntervalTicks: normalized.difficulty.minimumMobilityIntervalTicks,
      crouchHoldTicks: normalized.difficulty.crouchHoldTicks,
    });
    this.#participantId = normalized.participantId;
    this.#difficultyId = normalized.difficultyId;
    this.#difficulty = normalized.difficulty;
    this.#personality = personality;
    this.#rng = rng;
    this.#arena = normalized.arena;
    this.#sourceSnapshots = [];
    this.#currentPlan = null;
    this.#directionOffsetRadians = 0;
    this.#nextPlanTick = 0;
    this.#pauseUntilTick = 0;
    this.#actionTick = -1;
    this.#mobilityScheduler = mobilityScheduler;
    this.#lastMobilityIntent = BOT_MOBILITY_INTENT.NONE;
    this.#lastCommandTick = -1;
    this.#lastCommandEventSequence = -1;
    this.#lastCommandSource = null;
    this.#lastCommandSourceHash = null;
    this.#lastInputFrame = null;
    this.#requireActiveSupplyProjection = normalized.requireActiveSupplyProjection;
    this.#supplyProjectionContract = normalized.supplyProjectionContract;
    this.#trustedCommandSourceReader = null;
    this.#trustedCommandSourceReaderSource = null;
    this.#trustedCommandSourceHandle = normalized.trustedCommandSourceHandle;
    this.#trustedReaderAttachState = null;
    this.#creatingInput = false;
    this.#destroyed = false;
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('BotController 已销毁。');
  }

  #rejectDuringTrustedReaderAttach(message: string): never {
    const state = this.#trustedReaderAttachState;
    if (state !== null) state.reentered = true;
    throw new Error(message);
  }

  #beginTrustedReaderAttach(): TrustedReaderAttachState {
    this.#assertUsable();
    if (this.#creatingInput) {
      return this.#rejectDuringTrustedReaderAttach(
        'BotController reader attach 不允许在 createInput 期间执行。',
      );
    }
    if (this.#trustedReaderAttachState !== null) {
      return this.#rejectDuringTrustedReaderAttach(
        'BotController reader attach 不允许重入。',
      );
    }
    const state: TrustedReaderAttachState = { reentered: false };
    this.#trustedReaderAttachState = state;
    return state;
  }

  #assertTrustedReaderAttachCanPublish(state: TrustedReaderAttachState): void {
    if (state.reentered) {
      throw new Error('BotController reader attach 验证期间禁止重入。');
    }
    this.#assertUsable();
  }

  #prepareV5Source(source: BotCommandSourceV5): Readonly<{
    source: BotCommandSourceV5;
    observation: BotObservationV5 | null;
    repeat: boolean;
    frame: ArenaInputFrame | null;
  }> {
    const sourceHash = createDeterministicDataHash(source, 'BotCommandSourceV5 identity');
    if (this.#lastCommandSourceHash !== null) {
      if (source.commandTick === this.#lastCommandTick) {
        if (
          source.commandEventSequence === this.#lastCommandEventSequence
          && source.phase === this.#sourceSnapshots[this.#sourceSnapshots.length - 1]?.phase
          && sourceHash === this.#lastCommandSourceHash
          && this.#lastCommandSource !== null
          && equalNormalizedSource(source, this.#lastCommandSource)
        ) {
          if (this.#lastInputFrame === null) {
            throw new Error('BotController 重复 command source 缺少已提交 InputFrame。');
          }
          return {
            source: this.#sourceSnapshots[this.#sourceSnapshots.length - 1]!,
            observation: null,
            repeat: true,
            frame: this.#lastInputFrame,
          };
        }
        throw new RangeError('BotController 同 tick source identity 或内容不一致。');
      }
      if (source.commandTick < this.#lastCommandTick) {
        throw new RangeError('BotController command source tick 不能回退。');
      }
      if (source.commandTick !== this.#lastCommandTick + 1) {
        throw new RangeError(
          `BotController tick 必须连续：上次 ${this.#lastCommandTick}，本次 ${source.commandTick}。`,
        );
      }
      if (source.commandEventSequence < this.#lastCommandEventSequence) {
        throw new RangeError('BotController eventSequence 不能回退。');
      }
    }
    const maximum = this.#difficulty.observationDelayTicks + 2;
    const shiftOffset = this.#sourceSnapshots.length >= maximum ? 1 : 0;
    const prospectiveLength = Math.min(this.#sourceSnapshots.length + 1, maximum);
    const delayedIndex = Math.max(
      0,
      prospectiveLength - 1 - this.#difficulty.observationDelayTicks,
    );
    const existingIndex = delayedIndex + shiftOffset;
    const delayedSource = existingIndex < this.#sourceSnapshots.length
      ? this.#sourceSnapshots[existingIndex] as BotCommandSourceV5
      : source;
    return {
      source,
      observation: createBotObservationV5({
        commandSource: source,
        delayedSource,
        selfId: this.#participantId,
        arena: this.#arena,
      }),
      repeat: false,
      frame: null,
    };
  }

  #prepareObservation(snapshot: unknown): Readonly<{
    source: BotCommandSourceV5;
    observation: BotObservationV5 | null;
    repeat: boolean;
    frame: ArenaInputFrame | null;
  }> {
    const legacySource = this.#supplyProjectionContract === undefined
      ? cloneBotSourceSnapshot(snapshot)
      : cloneBotSourceSnapshot(snapshot, {
        lifecycleContract: this.#supplyProjectionContract,
      });
    if (this.#requireActiveSupplyProjection && legacySource.activeSupplyProjection === null) {
      throw new RangeError(
        'survival Bot 缺少完整 activeSupplyProjection，已 fail closed。',
      );
    }
    const source = createBotCommandSourceV5FromLegacy(legacySource, this.#participantId);
    return this.#prepareV5Source(source);
  }

  #prepareCommandSource(value: unknown): Readonly<{
    source: BotCommandSourceV5;
    observation: BotObservationV5 | null;
    repeat: boolean;
    frame: ArenaInputFrame | null;
  }> {
    const source = cloneBotCommandSourceV5(value, { participantId: this.#participantId });
    return this.#prepareV5Source(source);
  }

  #commitSourceSnapshot(source: BotCommandSourceV5): void {
    this.#sourceSnapshots.push(source);
    const maximum = this.#difficulty.observationDelayTicks + 2;
    if (this.#sourceSnapshots.length > maximum) this.#sourceSnapshots.shift();
  }

  #replan(observation: BotObservationV5): void {
    const decision = selectHighestUtility(getArenaBotEvaluators(), {
      observation,
      profile: this.#difficulty,
      personality: this.#personality,
    });
    this.#currentPlan = decision;
    this.#directionOffsetRadians = (
      this.#rng.next() * 2 - 1
    ) * this.#difficulty.directionJitterRadians;
    const interval = Math.max(
      1,
      this.#difficulty.replanIntervalTicks + this.#rng.int(
        -this.#difficulty.replanJitterTicks,
        this.#difficulty.replanJitterTicks,
      ),
    );
    this.#nextPlanTick = observation.commandTick + interval;
    this.#actionTick = decision.plan.actionCandidate
      && this.#rng.next() < this.#difficulty.actionCommitChance
      ? observation.commandTick
      : -1;
    const canMove = observation.self.status === ARENA_PARTICIPANT_STATUS.ACTIVE
      && observation.self.hitstunTicks === 0;
    this.#lastMobilityIntent = selectBotMobilityIntent({ observation, decision });
    this.#mobilityScheduler.schedule(
      observation.commandTick,
      this.#lastMobilityIntent,
      this.#lastMobilityIntent !== BOT_MOBILITY_INTENT.NONE
        && this.#rng.next() < this.#difficulty.actionCommitChance,
      canMove,
    );
    if (
      decision.goalId !== BOT_GOAL_ID.RECOVER_EDGE
      && decision.goalId !== BOT_GOAL_ID.AVOID_MAP_HAZARD
      && decision.goalId !== BOT_GOAL_ID.EVADE_THREAT
      && decision.goalId !== BOT_GOAL_ID.ACQUIRE_EQUIPMENT
      && decision.goalId !== BOT_GOAL_ID.ATTACK
      && this.#rng.next() < this.#difficulty.shortPauseChance
    ) {
      this.#pauseUntilTick = observation.commandTick
        + this.#rng.int(2, this.#difficulty.maximumPauseTicks);
    }
  }

  #createFrame(observation: BotObservationV5): ArenaInputFrame {
    if (!this.#currentPlan || observation.commandTick >= this.#nextPlanTick) {
      this.#replan(observation);
    }
    const currentPlan = this.#currentPlan;
    if (!currentPlan) throw new Error('BotController 规划未产生决策。');
    let moveX = 0;
    let moveZ = 0;
    if (
      observation.commandTick >= this.#pauseUntilTick
      && currentPlan.plan.speedScale > 0
    ) {
      const dx = currentPlan.plan.target.x - observation.self.position.x;
      const dz = currentPlan.plan.target.z - observation.self.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 1e-6) {
        const cosine = Math.cos(this.#directionOffsetRadians);
        const sine = Math.sin(this.#directionOffsetRadians);
        const directionX = dx / distance;
        const directionZ = dz / distance;
        const magnitude = this.#difficulty.maximumInputMagnitude
          * currentPlan.plan.speedScale;
        moveX = (directionX * cosine - directionZ * sine) * magnitude;
        moveZ = (directionX * sine + directionZ * cosine) * magnitude;
      }
    }
    const primaryPressed = observation.commandTick === this.#actionTick;
    const canMove = observation.self.status === ARENA_PARTICIPANT_STATUS.ACTIVE
      && observation.self.hitstunTicks === 0;
    const mobility = this.#mobilityScheduler.sample(observation.commandTick, canMove);
    return normalizeInputFrame({
      tick: observation.commandTick,
      participantId: this.#participantId,
      moveX,
      moveZ,
      primaryPressed,
      primaryHeld: primaryPressed,
      jumpPressed: mobility.jumpPressed,
      jumpHeld: mobility.jumpHeld,
      slamPressed: mobility.slamPressed,
    }, {
      expectedTick: observation.commandTick,
      participantIds: [this.#participantId],
    });
  }

  #createInputInternal(
    snapshotFactory: () => unknown,
    commandSource = false,
  ): ArenaInputFrame {
    this.#assertUsable();
    if (this.#trustedReaderAttachState !== null) {
      return this.#rejectDuringTrustedReaderAttach(
        'BotController createInput 不允许在 reader attach 验证期间执行。',
      );
    }
    if (this.#creatingInput) throw new Error('BotController createInput 不允许重入。');
    this.#creatingInput = true;
    let internalPhase = false;
    try {
      const prepared = commandSource
        ? this.#prepareCommandSource(snapshotFactory())
        : this.#prepareObservation(snapshotFactory());
      this.#assertUsable();
      if (prepared.repeat) {
        if (prepared.frame === null) throw new Error('BotController 重复 source 缺少缓存 frame。');
        return prepared.frame;
      }
      if (prepared.observation === null) {
        throw new Error('BotController 新 source 缺少 observation。');
      }
      internalPhase = true;
      const frame = this.#createFrame(prepared.observation);
      this.#commitSourceSnapshot(prepared.source);
      this.#lastCommandTick = prepared.observation.commandTick;
      this.#lastCommandEventSequence = prepared.source.commandEventSequence;
      this.#lastCommandSource = prepared.source;
      this.#lastCommandSourceHash = createDeterministicDataHash(
        prepared.source,
        'BotCommandSourceV5 identity',
      );
      this.#lastInputFrame = frame;
      return frame;
    } catch (error) {
      if (internalPhase && !this.#destroyed) this.#destroyOwnedState();
      throw error;
    } finally {
      this.#creatingInput = false;
    }
  }

  createInput(snapshot: unknown): ArenaInputFrame {
    return this.#createInputInternal(() => snapshot);
  }

  /**
   * PA3a's package-neutral handshake. The opaque handle is created and owned
   * by the future Session bundle; BotController only compares identity and
   * validates the reader's data-method boundary.
   */
  attachTrustedCommandSourceReader(reader: unknown, handle: unknown): boolean {
    this.#assertUsable();
    if (this.#creatingInput) {
      throw new Error('BotController reader attach 不允许在 createInput 期间执行。');
    }
    if (this.#trustedCommandSourceHandle === null) return false;
    if (handle !== this.#trustedCommandSourceHandle) {
      throw new RangeError('BotController V5 command source handle 与组合合同不一致。');
    }
    if (typeof reader !== 'object' || reader === null) {
      throw new TypeError('BotController V5 command source reader 必须是 opaque object。');
    }
    if (this.#trustedCommandSourceReaderSource !== null) {
      if (this.#trustedCommandSourceReaderSource !== reader) {
        throw new Error('BotController V5 command source reader 不可替换。');
      }
      return true;
    }
    const state = this.#beginTrustedReaderAttach();
    try {
      const descriptor = Object.getOwnPropertyDescriptor(reader, 'read');
      if (
        !descriptor
        || !descriptor.enumerable
        || !('value' in descriptor)
        || typeof descriptor.value !== 'function'
      ) {
        throw new TypeError('BotController V5 command source reader.read 必须是数据方法。');
      }
      const capturedRead = Reflect.apply(
        Function.prototype.bind,
        descriptor.value,
        [reader],
      ) as () => unknown;
      this.#assertTrustedReaderAttachCanPublish(state);
      this.#trustedCommandSourceReaderSource = reader;
      this.#trustedCommandSourceReader = Object.freeze({
        read: capturedRead,
      });
      return true;
    } finally {
      if (this.#trustedReaderAttachState === state) {
        this.#trustedReaderAttachState = null;
      }
    }
  }

  createInputFromTrustedCommandSource(): ArenaInputFrame {
    this.#assertUsable();
    const reader = this.#trustedCommandSourceReader;
    if (reader === null) {
      throw new Error('BotController V5 command source reader 尚未由 bundle 绑定。');
    }
    return this.#createInputInternal(() => reader.read(), true);
  }

  getDebugSnapshot(): BotControllerDebugSnapshot {
    this.#assertUsable();
    const delayedIndex = Math.max(
      0,
      this.#sourceSnapshots.length - 1 - this.#difficulty.observationDelayTicks,
    );
    return Object.freeze({
      participantId: this.#participantId,
      difficultyId: this.#difficultyId,
      personality: this.#personality,
      lastCommandTick: this.#lastCommandTick,
      observedTick: this.#sourceSnapshots[delayedIndex]?.commandTick ?? null,
      nextPlanTick: this.#nextPlanTick,
      pauseUntilTick: this.#pauseUntilTick,
      goalId: this.#currentPlan ? this.#currentPlan.goalId as BotGoalId : null,
      goalScore: this.#currentPlan?.score ?? null,
      mobilityIntent: this.#lastMobilityIntent,
      mobility: this.#mobilityScheduler.getDebugSnapshot(),
    });
  }

  #destroyOwnedState(): void {
    this.#destroyed = true;
    this.#sourceSnapshots.length = 0;
    this.#currentPlan = null;
    this.#mobilityScheduler.destroy();
    this.#lastCommandSource = null;
    this.#lastCommandSourceHash = null;
    this.#lastInputFrame = null;
    this.#trustedCommandSourceReader = null;
    this.#trustedCommandSourceReaderSource = null;
    this.#trustedCommandSourceHandle = null;
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyOwnedState();
  }
}
