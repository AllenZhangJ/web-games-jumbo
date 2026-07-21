import {
  createCharacterDefinition,
  type CharacterDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  createDeterministicDataHash,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
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

export interface MovementParticipantCharacter {
  readonly participantId: string;
  readonly characterDefinition: CharacterDefinition;
}

export interface MovementSystemOptions {
  readonly participantCharacters: readonly MovementParticipantCharacter[];
  readonly airJumpHorizontalImpulse?: number;
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

const PORT_KEYS = new Set(['applyBatch']);
const CHARACTER_ENTRY_KEYS = new Set(['participantId', 'characterDefinition']);
const PROJECT_CAPABILITY_KEYS = new Set(['grounded', 'canMove']);

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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
  #mutating: boolean;
  #failed: boolean;
  #destroyed: boolean;

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
    this.#mutating = false;
    this.#failed = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MovementSystem 已销毁。');
    if (this.#failed) throw new Error('MovementSystem 已失败，不能继续推进。');
    if (this.#mutating) throw new Error('MovementSystem 权威变更不可重入。');
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

  #mutate<T>(
    operation: () => T,
    { failClosed = false }: { readonly failClosed?: boolean } = {},
  ): T {
    this.#assertUsable();
    this.#mutating = true;
    try {
      return operation();
    } catch (error) {
      if (failClosed) this.#failed = true;
      throw error;
    } finally {
      this.#mutating = false;
    }
  }

  prepareTick(options: MovementPrepareOptions): readonly MovementRuntimeSnapshot[] {
    this.#assertUsable();
    const batch = createMovementPrepareBatch(options, this.#participantIds);
    const { tick, contacts, inputs, availability } = batch;
    if (this.#preparedTick !== null) throw new Error(`MovementSystem tick ${this.#preparedTick} 尚未完成。`);
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
    return this.#mutate(() => {
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
    this.#assertUsable();
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

  projectCapabilities(
    participantId: string,
    options: MovementCapabilityProjection,
  ): MovementCapabilities {
    this.#assertUsable();
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
  }

  projectHorizontalIntent(
    participantId: string,
    moveX: number,
    moveZ: number,
  ): CharacterMovementIntent {
    this.#assertUsable();
    this.#requireParticipant(participantId);
    return this.#intentProjectorsByParticipant.get(participantId)!.project(moveX, moveZ);
  }

  execute(
    commands: readonly MovementCommand[],
    ports: MovementMutationPort,
  ): readonly MovementExecution[] {
    this.#assertUsable();
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
      capabilities: this.getCapabilities(participantId),
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
    return this.#mutate(() => {
      if (mutations.length > 0) {
        const result = applyBatch(mutations);
        if (result !== undefined) {
          throw new TypeError('Movement mutation port applyBatch() 必须同步返回 undefined。');
        }
      }
      this.#states = drafts;
      this.#executed = true;
      return plan.executions;
    }, { failClosed: true });
  }

  completeTick(options: MovementCompleteOptions): readonly MovementLandingTransition[] {
    this.#assertUsable();
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
    return this.#mutate(() => {
      const completedTick = this.#preparedTick;
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
    this.#assertUsable();
    this.#assertIdleLifecycle('中断 participant');
    const current = this.#requireParticipant(participantId);
    const drafts = this.#cloneStates();
    const state = drafts.get(current.participantId)!;
    interruptMovementRuntimeState(state);
    const snapshot = createMovementRuntimeSnapshotFromValidatedDefinition(
      state,
      this.#definition(state.participantId),
    );
    return this.#mutate(() => {
      this.#states = drafts;
      return snapshot;
    });
  }

  resetParticipant(participantId: string): MovementRuntimeSnapshot {
    this.#assertUsable();
    this.#assertIdleLifecycle('重置 participant');
    const current = this.#requireParticipant(participantId);
    const drafts = this.#cloneStates();
    const state = drafts.get(current.participantId)!;
    resetMovementRuntimeState(state);
    const snapshot = createMovementRuntimeSnapshotFromValidatedDefinition(
      state,
      this.#definition(state.participantId),
    );
    return this.#mutate(() => {
      this.#states = drafts;
      return snapshot;
    });
  }

  getSnapshot(participantId: string): MovementRuntimeSnapshot {
    this.#assertUsable();
    const state = this.#requireParticipant(participantId);
    return createMovementRuntimeSnapshotFromValidatedDefinition(
      state,
      this.#definition(participantId),
    );
  }

  listSnapshots(): readonly MovementRuntimeSnapshot[] {
    this.#assertUsable();
    return this.#serializeStates();
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error('MovementSystem 权威变更期间不能销毁。');
    this.#destroyed = true;
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
  }
}
