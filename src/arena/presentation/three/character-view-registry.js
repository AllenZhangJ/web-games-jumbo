import { ProgrammaticCharacterView } from './programmatic-character-view.js';

export class CharacterViewRegistry {
  #root;
  #views;
  #disposed;

  constructor(root) {
    if (!root?.add) throw new TypeError('CharacterViewRegistry 需要 Object3D root。');
    this.#root = root;
    this.#views = new Map();
    this.#disposed = false;
  }

  #assertUsable() {
    if (this.#disposed) throw new Error('CharacterViewRegistry 已销毁。');
  }

  sync(participants, { snap = false } = {}) {
    this.#assertUsable();
    if (!Array.isArray(participants) || participants.length === 0) {
      throw new RangeError('CharacterViewRegistry participants 必须是非空数组。');
    }
    const nextIds = new Set();
    for (const participant of participants) {
      if (nextIds.has(participant.id)) throw new RangeError(`重复 participant ${participant.id}。`);
      nextIds.add(participant.id);
    }
    for (const [participantId, view] of this.#views) {
      if (nextIds.has(participantId)) continue;
      view.dispose();
      this.#views.delete(participantId);
    }
    for (const participant of participants) {
      let view = this.#views.get(participant.id);
      const geometry = participant.appearance?.geometry;
      if (view && view.geometry !== geometry) {
        view.dispose();
        this.#views.delete(participant.id);
        view = null;
      }
      if (!view) {
        view = new ProgrammaticCharacterView({
          participantId: participant.id,
          appearance: participant.appearance,
        });
        this.#views.set(participant.id, view);
        this.#root.add(view.root);
      }
      view.sync(participant, { snap });
    }
  }

  update(deltaSeconds) {
    this.#assertUsable();
    for (const view of this.#views.values()) view.update(deltaSeconds);
  }

  getParticipantVisualPosition(participantId) {
    this.#assertUsable();
    const view = this.#views.get(participantId);
    if (!view) return null;
    return Object.freeze({
      x: view.root.position.x,
      y: view.root.position.y,
      z: view.root.position.z,
    });
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      characterCount: this.#views.size,
      characters: Object.freeze([...this.#views.values()].map((view) => view.getDebugSnapshot())),
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (const view of this.#views.values()) {
      try { view.dispose(); } catch (error) { errors.push(error); }
    }
    this.#views.clear();
    if (errors.length > 0) {
      const failure = new Error('CharacterViewRegistry 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
