import {
  createCharacterDefinition,
  type CharacterDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  createDeterministicDataHash,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  cloneMovementRuntimeState,
  createMovementRuntimeSnapshotFromValidatedDefinition,
  createMovementRuntimeState,
  resetMovementRuntimeState,
  type MovementRuntimeSnapshot,
  type MovementRuntimeState,
} from './movement-runtime.js';
import {
  createMovementCompleteBatch,
  createMovementPrepareBatch,
  type MovementAvailability,
  type MovementContactSnapshot,
  type MovementTickInput,
} from './movement-tick-batch.js';
import {
  createMovementCapabilities,
  type MovementCapabilities,
} from './movement-capabilities.js';
import type { MovementCommand } from './movement-command.js';
import type { MovementMutation } from './movement-mutation.js';
import {
  createDownSmashContinuationMutations,
  createMovementExecutionPlan,
  type MovementExecution,
  type MovementExecutionContext,
} from './movement-execution-plan.js';
import {
  createCharacterMovementIntentProjector,
  type CharacterMovementIntent,
  type CharacterMovementIntentProjector,
} from './movement-intent.js';
import {
  applyMovementExecutionState,
  completeMovementRuntimeState,
  interruptMovementRuntimeState,
  prepareMovementRuntimeState,
  type MovementLandingTransition,
} from './movement-state-transition.js';
import { deserializeMovementRuntimeState } from './movement-serializer.js';

export const MOVEMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION = 1 as const;

export interface MovementParticipantCharacter {
  readonly participantId: string;
  readonly characterDefinition: CharacterDefinition;
}

export interface MovementSystemOptions {
  readonly participantCharacters: readonly MovementParticipantCharacter[];
  readonly airJumpHorizontalImpulse?: number;
}

export interface MovementSystemCheckpointV1 {
  readonly schemaVersion: typeof MOVEMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION;
  readonly participantCharacters: readonly MovementParticipantCharacter[];
  readonly airJumpHorizontalImpulse: number;
  readonly lastCompletedTick: number | null;
  readonly states: readonly MovementRuntimeSnapshot[];
  readonly checkpointIdentityHash: string;
}

export interface MovementCapabilityProjection {
  readonly grounded: boolean;
  readonly canMove: boolean;
}

export interface MovementMutationPort {
  readonly applyBatch: (mutations: readonly MovementMutation[]) => unknown;
}

export interface MovementPrepareOptions {
  readonly tick: number;
  readonly contacts: readonly MovementContactSnapshot[];
  readonly inputs: readonly MovementTickInput[];
  readonly availability: readonly MovementAvailability[];
}

export interface MovementCompleteOptions {
  readonly tick: number;
  readonly contacts: readonly MovementContactSnapshot[];
}

type MovementSystemOperation =
  | 'prepare-tick'
  | 'capabilities-read'
  | 'capabilities-projection'
  | 'horizontal-intent-projection'
  | 'execute'
  | 'complete-tick'
  | 'interrupt-participant'
  | 'reset-participant'
  | 'snapshot-read'
  | 'snapshot-list-read'
  | 'checkpoint-export'
  | 'destroy';

export const MOVEMENT_SYSTEM_OPERATION_GUARD_V1 = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  physicalMutationPortCheckedBeforeMovementCommit: true,
  swallowedPortReentryRejectsBeforeMovementCommit: true,
  publicReadsRejectMovementIntermediateState: true,
  internalCapabilityAndSnapshotReadsAvoidPublicReentry: true,
  movementCommitChecksStickyReentryFact: true,
  indeterminatePhysicalMutationFailsClosed: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  validationStatus: 'not-run',
} as const);

const PORT_KEYS = new Set(['applyBatch']);
const CHARACTER_ENTRY_KEYS = new Set(['participantId', 'characterDefinition']);
const PROJECT_CAPABILITY_KEYS = new Set(['grounded', 'canMove']);
const CHECKPOINT_CORE_KEYS = new Set([
  'schemaVersion',
  'participantCharacters',
  'airJumpHorizontalImpulse',
  'lastCompletedTick',
  'states',
]);
const CHECKPOINT_KEYS = new Set([...CHECKPOINT_CORE_KEYS, 'checkpointIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function checkpointDataField(source: PlainRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function exactCheckpointRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) checkpointDataField(source, key, name);
  return source;
}

function normalizeMovementSystemCheckpointCoreV1(
  value: unknown,
): Omit<MovementSystemCheckpointV1, 'checkpointIdentityHash'> {
  const source = exactCheckpointRecord(value, CHECKPOINT_CORE_KEYS, 'MovementSystemCheckpointV1');
  if (checkpointDataField(source, 'schemaVersion', 'MovementSystemCheckpointV1')
    !== MOVEMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION) {
    throw new RangeError('MovementSystemCheckpointV1.schemaVersion必须是1。');
  }
  const rawParticipants = checkpointDataField(
    source,
    'participantCharacters',
    'MovementSystemCheckpointV1',
  );
  if (!Array.isArray(rawParticipants) || rawParticipants.length === 0) {
    throw new RangeError('MovementSystemCheckpointV1 participantCharacters必须非空。');
  }
  const participantCharacters = Object.freeze(rawParticipants.map((entry, index) => {
    const name = `MovementSystemCheckpointV1 participantCharacters[${index}]`;
    const record = exactCheckpointRecord(entry, CHARACTER_ENTRY_KEYS, name);
    return Object.freeze({
      participantId: assertNonEmptyString(
        checkpointDataField(record, 'participantId', name),
        `${name}.participantId`,
      ),
      characterDefinition: createCharacterDefinition(
        checkpointDataField(record, 'characterDefinition', name),
      ),
    });
  }).sort((left, right) => compareText(left.participantId, right.participantId)));
  const participantIds = participantCharacters.map(({ participantId }) => participantId);
  if (new Set(participantIds).size !== participantIds.length) {
    throw new RangeError('MovementSystemCheckpointV1 participantId必须唯一。');
  }
  const airJumpHorizontalImpulse = checkpointDataField(
    source,
    'airJumpHorizontalImpulse',
    'MovementSystemCheckpointV1',
  );
  if (
    typeof airJumpHorizontalImpulse !== 'number'
    || !Number.isFinite(airJumpHorizontalImpulse)
    || airJumpHorizontalImpulse < 0
  ) throw new RangeError('MovementSystemCheckpointV1 airJumpHorizontalImpulse无效。');
  const rawLastCompletedTick = checkpointDataField(
    source,
    'lastCompletedTick',
    'MovementSystemCheckpointV1',
  );
  const lastCompletedTick = rawLastCompletedTick === null
    ? null
    : assertIntegerAtLeast(
      rawLastCompletedTick,
      0,
      'MovementSystemCheckpointV1.lastCompletedTick',
    );
  if (lastCompletedTick !== null && !Number.isSafeInteger(lastCompletedTick)) {
    throw new RangeError('MovementSystemCheckpointV1.lastCompletedTick必须是安全整数。');
  }
  const rawStates = checkpointDataField(source, 'states', 'MovementSystemCheckpointV1');
  if (!Array.isArray(rawStates) || rawStates.length !== participantCharacters.length) {
    throw new RangeError('MovementSystemCheckpointV1 states必须完整覆盖participant。');
  }
  const definitions = new Map(participantCharacters.map(({ participantId, characterDefinition }) => (
    [participantId, characterDefinition] as const
  )));
  const states = Object.freeze(rawStates.map((state, index) => {
    const participantId = participantIds[index]!;
    const definition = definitions.get(participantId)!;
    const snapshot = createMovementRuntimeSnapshotFromValidatedDefinition(state, definition);
    if (snapshot.participantId !== participantId) {
      throw new RangeError('MovementSystemCheckpointV1 states必须按participantId稳定升序。');
    }
    return snapshot;
  }));
  return Object.freeze({
    schemaVersion: MOVEMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION,
    participantCharacters,
    airJumpHorizontalImpulse,
    lastCompletedTick,
    states,
  });
}

function withMovementSystemCheckpointIdentityV1(
  core: Omit<MovementSystemCheckpointV1, 'checkpointIdentityHash'>,
): MovementSystemCheckpointV1 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'MovementSystemCheckpointV1 identity',
    ),
  });
}

export function createMovementSystemCheckpointV1(
  value: unknown,
): MovementSystemCheckpointV1 {
  const source = cloneFrozenData(value, 'MovementSystemCheckpointV1 create options');
  return withMovementSystemCheckpointIdentityV1(
    normalizeMovementSystemCheckpointCoreV1(source),
  );
}

export function validateMovementSystemCheckpointV1(
  value: unknown,
): DeepReadonly<MovementSystemCheckpointV1> {
  const source = cloneFrozenData(value, 'MovementSystemCheckpointV1');
  const record = exactCheckpointRecord(source, CHECKPOINT_KEYS, 'MovementSystemCheckpointV1');
  const checkpointIdentityHash = checkpointDataField(
    record,
    'checkpointIdentityHash',
    'MovementSystemCheckpointV1',
  );
  if (typeof checkpointIdentityHash !== 'string' || !HASH_PATTERN.test(checkpointIdentityHash)) {
    throw new TypeError('MovementSystemCheckpointV1 checkpointIdentityHash无效。');
  }
  const core = Object.fromEntries([...CHECKPOINT_CORE_KEYS].map((key) => [
    key,
    checkpointDataField(record, key, 'MovementSystemCheckpointV1'),
  ]));
  const normalized = withMovementSystemCheckpointIdentityV1(
    normalizeMovementSystemCheckpointCoreV1(core),
  );
  if (normalized.checkpointIdentityHash !== checkpointIdentityHash) {
    throw new RangeError('MovementSystemCheckpointV1 identity hash漂移。');
  }
  return normalized;
}

export class MovementSystem {
  #participantIds: readonly string[];
  #definitionsByParticipant: Map<string, CharacterDefinition>;
  #definitionsById: Map<string, CharacterDefinition>;
  #intentProjectorsByParticipant: Map<string, CharacterMovementIntentProjector>;
  #states: Map<string, MovementRuntimeState>;
  #preparedTick: number | null;
  #lastCompletedTick: number | null;
  #preparedContacts: Map<string, MovementContactSnapshot> | null;
  #preparedAvailability: Map<string, MovementAvailability> | null;
  #preparedInputs: Map<string, MovementTickInput> | null;
  #airJumpHorizontalImpulse: number;
  #executed: boolean;
  #failed: boolean;
  #destroyed: boolean;
  #operation: MovementSystemOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor({
    participantCharacters,
    airJumpHorizontalImpulse = 0,
  }: MovementSystemOptions) {
    if (!Array.isArray(participantCharacters) || participantCharacters.length === 0) {
      throw new RangeError('MovementSystem 需要非空 participantCharacters。');
    }
    if (typeof airJumpHorizontalImpulse !== 'number'
      || !Number.isFinite(airJumpHorizontalImpulse)
      || airJumpHorizontalImpulse < 0) {
      throw new RangeError('MovementSystem.airJumpHorizontalImpulse 必须是非负有限数。');
    }
    const entries = participantCharacters.map((entry, index) => {
      const source = cloneFrozenData(entry, `participantCharacters[${index}]`);
      assertKnownKeys(source, CHARACTER_ENTRY_KEYS, `participantCharacters[${index}]`);
      return Object.freeze({
        participantId: assertNonEmptyString(
          source.participantId,
          `participantCharacters[${index}].participantId`,
        ),
        characterDefinition: createCharacterDefinition(source.characterDefinition),
      });
    }).sort((left, right) => compareText(left.participantId, right.participantId));
    if (new Set(entries.map(({ participantId }) => participantId)).size !== entries.length) {
      throw new RangeError('MovementSystem participantCharacters 包含重复 participantId。');
    }
    this.#participantIds = Object.freeze(entries.map(({ participantId }) => participantId));
    this.#definitionsByParticipant = new Map(entries.map((entry) => [
      entry.participantId,
      entry.characterDefinition,
    ]));
    this.#intentProjectorsByParticipant = new Map(entries.map((entry) => [
      entry.participantId,
      createCharacterMovementIntentProjector(entry.characterDefinition),
    ]));
    this.#definitionsById = new Map();
    for (const { characterDefinition } of entries) {
      const existing = this.#definitionsById.get(characterDefinition.id);
      if (
        existing
        && createDeterministicDataHash(existing, `CharacterDefinition ${characterDefinition.id}`)
          !== createDeterministicDataHash(
            characterDefinition,
            `CharacterDefinition ${characterDefinition.id}`,
          )
      ) {
        throw new RangeError(
          `MovementSystem CharacterDefinition ${characterDefinition.id} 内容不一致。`,
        );
      }
      this.#definitionsById.set(characterDefinition.id, characterDefinition);
    }
    this.#states = new Map(entries.map(({ participantId, characterDefinition }) => [
      participantId,
      createMovementRuntimeState({ participantId, characterDefinition }),
    ]));
    this.#preparedTick = null;
    this.#lastCompletedTick = null;
    this.#preparedContacts = null;
    this.#preparedAvailability = null;
    this.#preparedInputs = null;
    this.#airJumpHorizontalImpulse = airJumpHorizontalImpulse;
    this.#executed = false;
    this.#failed = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  static restoreFromCheckpointV1(value: unknown): MovementSystem {
    const checkpoint = validateMovementSystemCheckpointV1(value);
    const system = new MovementSystem({
      participantCharacters: checkpoint.participantCharacters,
      airJumpHorizontalImpulse: checkpoint.airJumpHorizontalImpulse,
    });
    try {
      system.#states = new Map(checkpoint.states.map((snapshot) => [
        snapshot.participantId,
        deserializeMovementRuntimeState(snapshot, {
          characterDefinitionById(characterDefinitionId: string) {
            const definition = system.#definitionsById.get(characterDefinitionId);
            if (!definition) {
              throw new RangeError(
                `MovementSystemCheckpointV1未知CharacterDefinition ${characterDefinitionId}。`,
              );
            }
            return definition;
          },
        }),
      ]));
      system.#lastCompletedTick = checkpoint.lastCompletedTick;
      return system;
    } catch (error) {
      system.destroy();
      throw error;
    }
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MovementSystem 已销毁。');
    if (this.#failed) throw new Error('MovementSystem 已失败，不能继续推进。');
  }

  #recordReentry(requestedOperation: MovementSystemOperation): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `MovementSystem ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertReentryFree(sequence: number, operation: string, failClosed = false): void {
    if (this.#reentrySequence === sequence) return;
    if (failClosed) this.#failed = true;
    throw this.#reentryError ?? new Error(`MovementSystem ${operation}期间发生重入。`);
  }

  #runOperation<T>(
    operation: MovementSystemOperation,
    callback: () => T,
    options: Readonly<{ allowDestroyed?: boolean; allowFailed?: boolean }> = {},
  ): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      if (!options.allowDestroyed && !options.allowFailed) this.#assertUsable();
      else {
        if (!options.allowDestroyed && this.#destroyed) {
          throw new Error('MovementSystem 已销毁。');
        }
        if (!options.allowFailed && this.#failed) {
          throw new Error('MovementSystem 已失败，不能继续推进。');
        }
      }
      const result = callback();
      this.#assertReentryFree(sequence, operation, true);
      return result;
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertMovementCommitReady(operation: string): void {
    if (this.#reentryError !== null) throw this.#reentryError;
    if (this.#operation === null) {
      throw new Error(`MovementSystem ${operation}缺少权威操作所有权。`);
    }
  }

  #applyPhysicalMutationBatchChecked(
    applyBatch: MovementMutationPort['applyBatch'],
    mutations: readonly MovementMutation[],
  ): void {
    const sequence = this.#reentrySequence;
    try {
      const result = applyBatch(mutations);
      if (result !== undefined) {
        throw new TypeError('Movement mutation port applyBatch() 必须同步返回 undefined。');
      }
      this.#assertReentryFree(sequence, '物理变更端口', true);
    } catch (error) {
      this.#failed = true;
      this.#assertReentryFree(sequence, '物理变更端口', true);
      throw error;
    }
  }

  #requireParticipant(participantId: unknown): MovementRuntimeState {
    const id = assertNonEmptyString(participantId, 'movement participantId');
    const state = this.#states.get(id);
    if (!state) throw new RangeError(`未知 movement participant ${id}。`);
    return state;
  }

  #definition(participantId: string): CharacterDefinition {
    const definition = this.#definitionsByParticipant.get(participantId);
    if (!definition) throw new Error(`MovementSystem 缺少 ${participantId} 的 CharacterDefinition。`);
    return definition;
  }

  #serializeStates(
    states: ReadonlyMap<string, MovementRuntimeState> = this.#states,
  ): readonly MovementRuntimeSnapshot[] {
    return Object.freeze([...states.values()].map((state) => (
      createMovementRuntimeSnapshotFromValidatedDefinition(
        state,
        this.#definition(state.participantId),
      )
    )).sort((left, right) => compareText(left.participantId, right.participantId)));
  }

  #cloneStates(): Map<string, MovementRuntimeState> {
    const drafts = new Map<string, MovementRuntimeState>();
    for (const state of this.#states.values()) {
      drafts.set(state.participantId, cloneMovementRuntimeState(state));
    }
    return drafts;
  }

  #assertIdleLifecycle(operationName: string): void {
    if (this.#preparedTick !== null) {
      throw new Error(
        `MovementSystem tick ${this.#preparedTick} 进行中，不能 ${operationName}。`,
      );
    }
  }

  #getCapabilitiesInsideOperation(participantId: string): MovementCapabilities {
    if (this.#preparedTick === null) throw new Error('MovementSystem 需要先 prepareTick。');
    const state = this.#requireParticipant(participantId);
    return createMovementCapabilities({
      participantId,
      state,
      definition: this.#definition(participantId),
      contact: this.#preparedContacts!.get(participantId)!,
      canMove: this.#preparedAvailability!.get(participantId)!.canMove,
    });
  }

  prepareTick(options: MovementPrepareOptions): readonly MovementRuntimeSnapshot[] {
    return this.#runOperation('prepare-tick', () => {
      const batch = createMovementPrepareBatch(options, this.#participantIds);
      const { tick, contacts, inputs, availability } = batch;
      if (this.#preparedTick !== null) {
        throw new Error(`MovementSystem tick ${this.#preparedTick} 尚未完成。`);
      }
      if (this.#lastCompletedTick !== null && tick !== this.#lastCompletedTick + 1) {
        throw new RangeError(
          `MovementSystem tick 必须连续：上次 ${this.#lastCompletedTick}，当前 ${tick}。`,
        );
      }
      const drafts = this.#cloneStates();
      for (const participantId of this.#participantIds) {
        prepareMovementRuntimeState({
          state: drafts.get(participantId)!,
          definition: this.#definition(participantId),
          contact: contacts.get(participantId)!,
          input: inputs.get(participantId)!,
          canMove: availability.get(participantId)!.canMove,
        });
      }
      const snapshots = this.#serializeStates(drafts);
      this.#assertMovementCommitReady('准备tick');
      this.#states = drafts;
      this.#preparedTick = tick;
      this.#preparedContacts = contacts;
      this.#preparedAvailability = availability;
      this.#preparedInputs = inputs;
      this.#executed = false;
      return snapshots;
    });
  }

  getCapabilities(participantId: string): MovementCapabilities {
    return this.#runOperation('capabilities-read', () => (
      this.#getCapabilitiesInsideOperation(participantId)
    ));
  }

  projectCapabilities(
    participantId: string,
    options: MovementCapabilityProjection,
  ): MovementCapabilities {
    return this.#runOperation('capabilities-projection', () => {
      assertKnownKeys(options, PROJECT_CAPABILITY_KEYS, 'Movement capability projection');
      if (typeof options.grounded !== 'boolean' || typeof options.canMove !== 'boolean') {
        throw new TypeError('Movement capability projection grounded/canMove 必须是布尔值。');
      }
      const state = this.#requireParticipant(participantId);
      return createMovementCapabilities({
        participantId,
        state,
        definition: this.#definition(participantId),
        contact: Object.freeze({ participantId, grounded: options.grounded }),
        canMove: options.canMove,
      });
    });
  }

  projectHorizontalIntent(
    participantId: string,
    moveX: number,
    moveZ: number,
  ): CharacterMovementIntent {
    return this.#runOperation('horizontal-intent-projection', () => {
      this.#requireParticipant(participantId);
      return this.#intentProjectorsByParticipant.get(participantId)!.project(moveX, moveZ);
    });
  }

  execute(
    commands: readonly MovementCommand[],
    ports: MovementMutationPort,
  ): readonly MovementExecution[] {
    return this.#runOperation('execute', () => {
      if (this.#preparedTick === null) throw new Error('MovementSystem 需要先 prepareTick。');
      if (this.#executed) throw new Error(`MovementSystem tick ${this.#preparedTick} 已执行命令。`);
      assertKnownKeys(ports, PORT_KEYS, 'Movement mutation ports');
      if (typeof ports.applyBatch !== 'function') {
        throw new TypeError('Movement mutation port 缺少 applyBatch()。');
      }
      const applyBatch = ports.applyBatch;
      const contexts = this.#participantIds.map((participantId) => Object.freeze({
        participantId,
        state: this.#states.get(participantId)!,
        definition: this.#definition(participantId),
        capabilities: this.#getCapabilitiesInsideOperation(participantId),
        input: this.#preparedInputs!.get(participantId)!,
        airJumpHorizontalImpulse: this.#airJumpHorizontalImpulse,
      })) satisfies readonly MovementExecutionContext[];
      const plan = createMovementExecutionPlan(commands, contexts);
      const continuationMutations = createDownSmashContinuationMutations(
        contexts,
        plan.operations.map(({ command }) => command.participantId),
      );
      const mutations = Object.freeze([...plan.mutations, ...continuationMutations]);
      const drafts = this.#cloneStates();
      for (const operation of plan.operations) {
        applyMovementExecutionState(
          drafts.get(operation.command.participantId)!,
          operation,
        );
      }
      this.#serializeStates(drafts);
      if (mutations.length > 0) {
        this.#applyPhysicalMutationBatchChecked(applyBatch, mutations);
      }
      this.#assertMovementCommitReady('执行移动命令');
      this.#states = drafts;
      this.#executed = true;
      return plan.executions;
    });
  }

  completeTick(options: MovementCompleteOptions): readonly MovementLandingTransition[] {
    return this.#runOperation('complete-tick', () => {
      const batch = createMovementCompleteBatch(options, this.#participantIds);
      if (this.#preparedTick === null || batch.tick !== this.#preparedTick) {
        throw new RangeError(
          `MovementSystem completeTick 必须匹配 prepared tick ${String(this.#preparedTick)}。`,
        );
      }
      if (!this.#executed) throw new Error(`MovementSystem tick ${this.#preparedTick} 尚未执行命令批次。`);
      const drafts = this.#cloneStates();
      const transitions: MovementLandingTransition[] = [];
      for (const participantId of this.#participantIds) {
        const transition = completeMovementRuntimeState({
          state: drafts.get(participantId)!,
          definition: this.#definition(participantId),
          beforeContact: this.#preparedContacts!.get(participantId)!,
          afterContact: batch.contacts.get(participantId)!,
        });
        if (transition) transitions.push(transition);
      }
      this.#serializeStates(drafts);
      const frozenTransitions = Object.freeze(transitions);
      const completedTick = this.#preparedTick;
      this.#assertMovementCommitReady('完成tick');
      this.#states = drafts;
      this.#lastCompletedTick = completedTick;
      this.#preparedTick = null;
      this.#preparedContacts = null;
      this.#preparedAvailability = null;
      this.#preparedInputs = null;
      this.#executed = false;
      return frozenTransitions;
    });
  }

  interruptParticipant(participantId: string): MovementRuntimeSnapshot {
    return this.#runOperation('interrupt-participant', () => {
      this.#assertIdleLifecycle('中断 participant');
      const current = this.#requireParticipant(participantId);
      const drafts = this.#cloneStates();
      const state = drafts.get(current.participantId)!;
      interruptMovementRuntimeState(state);
      const snapshot = createMovementRuntimeSnapshotFromValidatedDefinition(
        state,
        this.#definition(state.participantId),
      );
      this.#assertMovementCommitReady('中断participant');
      this.#states = drafts;
      return snapshot;
    });
  }

  resetParticipant(participantId: string): MovementRuntimeSnapshot {
    return this.#runOperation('reset-participant', () => {
      this.#assertIdleLifecycle('重置 participant');
      const current = this.#requireParticipant(participantId);
      const drafts = this.#cloneStates();
      const state = drafts.get(current.participantId)!;
      resetMovementRuntimeState(state);
      const snapshot = createMovementRuntimeSnapshotFromValidatedDefinition(
        state,
        this.#definition(state.participantId),
      );
      this.#assertMovementCommitReady('重置participant');
      this.#states = drafts;
      return snapshot;
    });
  }

  getSnapshot(participantId: string): MovementRuntimeSnapshot {
    return this.#runOperation('snapshot-read', () => {
      const state = this.#requireParticipant(participantId);
      return createMovementRuntimeSnapshotFromValidatedDefinition(
        state,
        this.#definition(participantId),
      );
    });
  }

  listSnapshots(): readonly MovementRuntimeSnapshot[] {
    return this.#runOperation('snapshot-list-read', () => this.#serializeStates());
  }

  exportCheckpointV1(): MovementSystemCheckpointV1 {
    return this.#runOperation('checkpoint-export', () => {
      this.#assertIdleLifecycle('导出checkpoint');
      return createMovementSystemCheckpointV1({
        schemaVersion: MOVEMENT_SYSTEM_CHECKPOINT_V1_SCHEMA_VERSION,
        participantCharacters: this.#participantIds.map((participantId) => Object.freeze({
          participantId,
          characterDefinition: this.#definition(participantId),
        })),
        airJumpHorizontalImpulse: this.#airJumpHorizontalImpulse,
        lastCompletedTick: this.#lastCompletedTick,
        states: this.#serializeStates(),
      });
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#destroyed) return;
      this.#destroyed = true;
      this.#failed = false;
      this.#states.clear();
      this.#definitionsByParticipant.clear();
      this.#definitionsById.clear();
      this.#intentProjectorsByParticipant.clear();
      this.#preparedContacts?.clear();
      this.#preparedAvailability?.clear();
      this.#preparedInputs?.clear();
      this.#preparedContacts = null;
      this.#preparedAvailability = null;
      this.#preparedInputs = null;
    }, { allowDestroyed: true, allowFailed: true });
  }
}
