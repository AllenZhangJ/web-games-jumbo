import { CharacterViewRuntime } from '../character/character-view-runtime.js';
import { assertCharacterPresentationRegistry } from '@number-strategy-jump/arena-presentation-contracts';

export class CharacterViewRegistry {
  #root;
  #presentationRegistry;
  #viewFactory;
  #actionPresentations;
  #runtimes;
  #seenParticipantIds;
  #disposed;
  #failedError;

  constructor(root, { presentationRegistry, viewFactory, actionPresentations }) {
    if (!root?.add || !root?.remove) {
      throw new TypeError('CharacterViewRegistry 需要带 add/remove 的 Object3D root。');
    }
    if (!viewFactory || typeof viewFactory.create !== 'function') {
      throw new TypeError('CharacterViewRegistry 需要 CharacterViewFactory。');
    }
    if (!actionPresentations || typeof actionPresentations !== 'object') {
      throw new TypeError('CharacterViewRegistry 需要 action presentations。');
    }
    this.#root = root;
    this.#presentationRegistry = assertCharacterPresentationRegistry(presentationRegistry);
    this.#viewFactory = viewFactory;
    this.#actionPresentations = actionPresentations;
    this.#runtimes = new Map();
    this.#seenParticipantIds = new Set();
    this.#disposed = false;
    this.#failedError = null;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('CharacterViewRegistry 已销毁。');
    if (this.#failedError) {
      const error = new Error('CharacterViewRegistry 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
  }

  #cleanupRecord(record) {
    const errors = [];
    try { this.#root.remove(record.root); } catch (error) { errors.push(error); }
    try { record.runtime.dispose(); } catch (error) { errors.push(error); }
    return errors;
  }

  #deleteRecord(participantId, record) {
    this.#runtimes.delete(participantId);
    const errors = this.#cleanupRecord(record);
    if (errors.length > 0) {
      const failure = new Error(`角色表现 ${participantId} 清理未完整完成。`);
      failure.causes = errors;
      throw failure;
    }
  }

  #failClosed(error, localRecord = null) {
    this.#failedError = error;
    const cleanupErrors = [];
    if (localRecord) cleanupErrors.push(...this.#cleanupRecord(localRecord));
    for (const [participantId, record] of this.#runtimes) {
      this.#runtimes.delete(participantId);
      cleanupErrors.push(...this.#cleanupRecord(record));
    }
    if (cleanupErrors.length > 0) {
      const failure = new Error('CharacterViewRegistry 失败关闭时清理未完整完成。');
      failure.cause = error;
      failure.cleanupCauses = cleanupErrors;
      throw failure;
    }
    throw error;
  }

  sync(frame, { snap = false, cameraModel } = {}) {
    this.#assertUsable();
    const participants = frame?.world?.participants;
    if (!Array.isArray(participants) || participants.length === 0) {
      throw new RangeError('CharacterViewRegistry frame participants 必须是非空数组。');
    }
    this.#seenParticipantIds.clear();
    for (const participant of participants) {
      if (typeof participant?.id !== 'string' || participant.id.length === 0) {
        throw new TypeError('CharacterViewRegistry participant.id 必须是非空字符串。');
      }
      if (this.#seenParticipantIds.has(participant.id)) {
        throw new RangeError('CharacterViewRegistry participant 重复。');
      }
      this.#seenParticipantIds.add(participant.id);
      const presentationId = participant.appearance?.presentationId;
      const definition = this.#presentationRegistry.require(presentationId);
      if (
        definition.characterDefinitionId !== participant.characterDefinitionId
        || definition.getContentHash() !== participant.appearance.definitionHash
      ) throw new RangeError(`participant ${participant.id} 的 presentation 引用不一致。`);
    }

    for (const [participantId, record] of this.#runtimes) {
      if (this.#seenParticipantIds.has(participantId)) continue;
      try {
        this.#deleteRecord(participantId, record);
      } catch (error) {
        this.#failClosed(error);
      }
    }
    for (const participant of participants) {
      const definition = this.#presentationRegistry.require(
        participant.appearance.presentationId,
      );
      let record = this.#runtimes.get(participant.id);
      if (
        record
        && (
          record.runtime.presentationId !== definition.id
          || record.runtime.presentationHash !== definition.getContentHash()
        )
      ) {
        try {
          this.#deleteRecord(participant.id, record);
        } catch (error) {
          this.#failClosed(error);
        }
        record = null;
      }
      if (!record) {
        let localRecord = null;
        try {
          const runtime = new CharacterViewRuntime({
            participantId: participant.id,
            presentationDefinition: definition,
            actionPresentations: this.#actionPresentations,
            viewFactory: this.#viewFactory,
          });
          localRecord = { runtime, root: runtime.root };
          this.#root.add(localRecord.root);
          runtime.sync(frame, participant, { snap, cameraModel });
          this.#runtimes.set(participant.id, localRecord);
        } catch (error) {
          this.#failClosed(error, localRecord);
        }
        continue;
      }
      try {
        record.runtime.sync(frame, participant, { snap, cameraModel });
      } catch (error) {
        this.#failClosed(error);
      }
    }
  }

  update(deltaSeconds) {
    this.#assertUsable();
    try {
      for (const { runtime } of this.#runtimes.values()) runtime.update(deltaSeconds);
    } catch (error) {
      this.#failClosed(error);
    }
  }

  getParticipantVisualPosition(participantId) {
    this.#assertUsable();
    const record = this.#runtimes.get(participantId);
    return record?.runtime.getVisualPosition() ?? null;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      characterCount: this.#runtimes.size,
      characters: Object.freeze(
        [...this.#runtimes.values()].map(({ runtime }) => runtime.getDebugSnapshot()),
      ),
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const record of this.#runtimes.values()) {
      errors.push(...this.#cleanupRecord(record));
    }
    this.#runtimes.clear();
    this.#seenParticipantIds.clear();
    if (errors.length > 0) {
      const failure = new Error('CharacterViewRegistry 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
