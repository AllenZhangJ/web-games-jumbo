import { createCharacterDefinition } from '../character/character-definition.js';
import { createDeterministicDataHash } from '../../shared/deterministic-data-hash.js';
import {
  cloneMovementRuntimeState,
  createMovementRuntimeSnapshotFromValidatedDefinition,
  createMovementRuntimeState,
  resetMovementRuntimeState,
} from './movement-runtime.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import {
  createMovementCompleteBatch,
  createMovementPrepareBatch,
} from './movement-tick-batch.js';
import { createMovementCapabilities } from './movement-capabilities.js';
import {
  createDownSmashContinuationMutations,
  createMovementExecutionPlan,
} from './movement-execution-plan.js';
import { createCharacterMovementIntentProjector } from './movement-intent.js';
import {
  applyMovementExecutionState,
  completeMovementRuntimeState,
  interruptMovementRuntimeState,
  prepareMovementRuntimeState,
} from './movement-state-transition.js';

const PORT_KEYS = new Set(['applyBatch']);
const CHARACTER_ENTRY_KEYS = new Set(['participantId', 'characterDefinition']);
const PROJECT_CAPABILITY_KEYS = new Set(['grounded', 'canMove']);

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export class MovementSystem {
  #participantIds;
  #definitionsByParticipant;
  #definitionsById;
  #intentProjectorsByParticipant;
  #states;
  #preparedTick;
  #lastCompletedTick;
  #preparedContacts;
  #preparedAvailability;
  #preparedInputs;
  #airJumpHorizontalImpulse;
  #executed;
  #mutating;
  #failed;
  #destroyed;

  constructor({ participantCharacters, airJumpHorizontalImpulse = 0 }) {
    if (!Array.isArray(participantCharacters) || participantCharacters.length === 0) {
      throw new RangeError('MovementSystem 需要非空 participantCharacters。');
    }
    if (!Number.isFinite(airJumpHorizontalImpulse) || airJumpHorizontalImpulse < 0) {
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

  #assertUsable() {
    if (this.#destroyed) throw new Error('MovementSystem 已销毁。');
    if (this.#failed) throw new Error('MovementSystem 已失败，不能继续推进。');
    if (this.#mutating) throw new Error('MovementSystem 权威变更不可重入。');
  }

  #requireParticipant(participantId) {
    const id = assertNonEmptyString(participantId, 'movement participantId');
    const state = this.#states.get(id);
    if (!state) throw new RangeError(`未知 movement participant ${id}。`);
    return state;
  }

  #definition(participantId) {
    return this.#definitionsByParticipant.get(participantId);
  }

  #serializeStates(states = this.#states) {
    return Object.freeze([...states.values()].map((state) => (
      createMovementRuntimeSnapshotFromValidatedDefinition(
        state,
        this.#definition(state.participantId),
      )
    )).sort((left, right) => compareText(left.participantId, right.participantId)));
  }

  #cloneStates() {
    const drafts = new Map();
    for (const state of this.#states.values()) {
      drafts.set(state.participantId, cloneMovementRuntimeState(state));
    }
    return drafts;
  }

  #assertIdleLifecycle(operationName) {
    if (this.#preparedTick !== null) {
      throw new Error(
        `MovementSystem tick ${this.#preparedTick} 进行中，不能 ${operationName}。`,
      );
    }
  }

  #mutate(operation, { failClosed = false } = {}) {
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

  prepareTick(options) {
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
        state: drafts.get(participantId),
        definition: this.#definition(participantId),
        contact: contacts.get(participantId),
        input: inputs.get(participantId),
        canMove: availability.get(participantId).canMove,
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

  getCapabilities(participantId) {
    this.#assertUsable();
    if (this.#preparedTick === null) throw new Error('MovementSystem 需要先 prepareTick。');
    const state = this.#requireParticipant(participantId);
    return createMovementCapabilities({
      participantId,
      state,
      definition: this.#definition(participantId),
      contact: this.#preparedContacts.get(participantId),
      canMove: this.#preparedAvailability.get(participantId).canMove,
    });
  }

  projectCapabilities(participantId, options) {
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

  projectHorizontalIntent(participantId, moveX, moveZ) {
    this.#assertUsable();
    this.#requireParticipant(participantId);
    return this.#intentProjectorsByParticipant.get(participantId).project(moveX, moveZ);
  }

  execute(commands, ports) {
    this.#assertUsable();
    if (this.#preparedTick === null) throw new Error('MovementSystem 需要先 prepareTick。');
    if (this.#executed) throw new Error(`MovementSystem tick ${this.#preparedTick} 已执行命令。`);
    assertKnownKeys(ports, PORT_KEYS, 'Movement mutation ports');
    if (typeof ports.applyBatch !== 'function') {
      throw new TypeError('Movement mutation port 缺少 applyBatch()。');
    }
    const contexts = this.#participantIds.map((participantId) => Object.freeze({
      participantId,
      state: this.#states.get(participantId),
      definition: this.#definition(participantId),
      capabilities: this.getCapabilities(participantId),
      input: this.#preparedInputs.get(participantId),
      airJumpHorizontalImpulse: this.#airJumpHorizontalImpulse,
    }));
    const plan = createMovementExecutionPlan(commands, contexts);
    const continuationMutations = createDownSmashContinuationMutations(
      contexts,
      plan.operations.map(({ command }) => command.participantId),
    );
    const mutations = Object.freeze([...plan.mutations, ...continuationMutations]);
    const drafts = this.#cloneStates();
    for (const operation of plan.operations) {
      applyMovementExecutionState(
        drafts.get(operation.command.participantId),
        operation,
      );
    }
    this.#serializeStates(drafts);
    return this.#mutate(() => {
      if (mutations.length > 0) {
        const result = ports.applyBatch(mutations);
        if (result !== undefined) {
          throw new TypeError('Movement mutation port applyBatch() 必须同步返回 undefined。');
        }
      }
      this.#states = drafts;
      this.#executed = true;
      return plan.executions;
    }, { failClosed: true });
  }

  completeTick(options) {
    this.#assertUsable();
    const batch = createMovementCompleteBatch(options, this.#participantIds);
    if (this.#preparedTick === null || batch.tick !== this.#preparedTick) {
      throw new RangeError(
        `MovementSystem completeTick 必须匹配 prepared tick ${String(this.#preparedTick)}。`,
      );
    }
    if (!this.#executed) throw new Error(`MovementSystem tick ${this.#preparedTick} 尚未执行命令批次。`);
    const drafts = this.#cloneStates();
    const transitions = [];
    for (const participantId of this.#participantIds) {
      const transition = completeMovementRuntimeState({
        state: drafts.get(participantId),
        definition: this.#definition(participantId),
        beforeContact: this.#preparedContacts.get(participantId),
        afterContact: batch.contacts.get(participantId),
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

  interruptParticipant(participantId) {
    this.#assertUsable();
    this.#assertIdleLifecycle('中断 participant');
    const current = this.#requireParticipant(participantId);
    const drafts = this.#cloneStates();
    const state = drafts.get(current.participantId);
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

  resetParticipant(participantId) {
    this.#assertUsable();
    this.#assertIdleLifecycle('重置 participant');
    const current = this.#requireParticipant(participantId);
    const drafts = this.#cloneStates();
    const state = drafts.get(current.participantId);
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

  getSnapshot(participantId) {
    this.#assertUsable();
    const state = this.#requireParticipant(participantId);
    return createMovementRuntimeSnapshotFromValidatedDefinition(
      state,
      this.#definition(participantId),
    );
  }

  listSnapshots() {
    this.#assertUsable();
    return this.#serializeStates();
  }

  destroy() {
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
