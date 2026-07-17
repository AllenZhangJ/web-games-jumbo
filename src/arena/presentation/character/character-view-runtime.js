import { resolveAnimationBinding } from '../animation/animation-binding-resolver.js';
import { AnimationSemanticResolver } from '../animation/animation-semantic-resolver.js';
import { SixSectorDirectionResolver } from '../direction/six-sector-direction-resolver.js';

export const CHARACTER_VIEW_RUNTIME_STATE = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function validateView(value) {
  if (!value || typeof value !== 'object' || !value.root?.position) {
    throw new TypeError('CharacterViewFactory 必须返回带 root 的 view。');
  }
  for (const method of [
    'getAnimationCapabilities',
    'sync',
    'update',
    'getDebugSnapshot',
    'dispose',
  ]) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`Character view 缺少 ${method}()。`);
    }
  }
  return value;
}

export class CharacterViewRuntime {
  #participantId;
  #definition;
  #definitionHash;
  #resolver;
  #directionResolver;
  #view;
  #capabilities;
  #viewDisposed;
  #state;
  #lastError;

  constructor({ participantId, presentationDefinition, actionPresentations, viewFactory }) {
    if (typeof participantId !== 'string' || participantId.length === 0) {
      throw new TypeError('CharacterViewRuntime.participantId 必须是非空字符串。');
    }
    if (!presentationDefinition || typeof presentationDefinition.getContentHash !== 'function') {
      throw new TypeError('CharacterViewRuntime 需要 CharacterPresentationDefinition。');
    }
    if (!viewFactory || typeof viewFactory.create !== 'function') {
      throw new TypeError('CharacterViewRuntime 需要 CharacterViewFactory.create()。');
    }
    this.#participantId = participantId;
    this.#definition = presentationDefinition;
    this.#definitionHash = presentationDefinition.getContentHash();
    this.#resolver = null;
    this.#directionResolver = null;
    this.#view = null;
    this.#capabilities = null;
    this.#viewDisposed = false;
    this.#state = CHARACTER_VIEW_RUNTIME_STATE.ACTIVE;
    this.#lastError = null;
    let candidate = null;
    try {
      this.#resolver = new AnimationSemanticResolver({
        participantId,
        presentationDefinition,
        actionPresentations,
      });
      this.#directionResolver = new SixSectorDirectionResolver(
        presentationDefinition.direction,
      );
      candidate = viewFactory.create({ participantId, presentationDefinition });
      this.#view = validateView(candidate);
      this.#capabilities = this.#view.getAnimationCapabilities();
      resolveAnimationBinding(
        presentationDefinition,
        'idle',
        this.#capabilities,
      );
    } catch (error) {
      this.#state = CHARACTER_VIEW_RUNTIME_STATE.FAILED;
      this.#lastError = error;
      const cleanupErrors = [];
      try { this.#resolver?.destroy(); } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      try { this.#directionResolver?.destroy(); } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      if (candidate && typeof candidate.dispose === 'function') {
        try { candidate.dispose(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      if (cleanupErrors.length > 0) {
        const failure = new Error('Character view 创建失败且清理未完整完成。');
        failure.cause = error;
        failure.cleanupCauses = cleanupErrors;
        throw failure;
      }
      throw error;
    }
  }

  get root() {
    this.#assertUsable();
    return this.#view.root;
  }

  get participantId() {
    return this.#participantId;
  }

  get presentationId() {
    return this.#definition.id;
  }

  get presentationHash() {
    return this.#definitionHash;
  }

  #assertUsable() {
    if (this.#state === CHARACTER_VIEW_RUNTIME_STATE.DESTROYED) {
      throw new Error('CharacterViewRuntime 已销毁。');
    }
    if (this.#state === CHARACTER_VIEW_RUNTIME_STATE.FAILED) {
      const error = new Error('CharacterViewRuntime 已失败。');
      error.cause = this.#lastError;
      throw error;
    }
  }

  #fail(error) {
    this.#state = CHARACTER_VIEW_RUNTIME_STATE.FAILED;
    this.#lastError = error;
    const cleanupErrors = [];
    try { this.#resolver?.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    try { this.#directionResolver?.destroy(); } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }
    try { this.#disposeView(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
    if (cleanupErrors.length > 0) {
      const failure = new Error('CharacterViewRuntime 失败关闭时清理未完整完成。');
      failure.cause = error;
      failure.cleanupCauses = cleanupErrors;
      throw failure;
    }
    throw error;
  }

  #disposeView() {
    if (this.#viewDisposed) return;
    this.#viewDisposed = true;
    this.#view?.dispose();
  }

  sync(frame, participant, { snap = false, cameraModel } = {}) {
    this.#assertUsable();
    try {
      if (participant?.id !== this.#participantId) {
        throw new RangeError('CharacterViewRuntime participant 身份不一致。');
      }
      if (
        participant.appearance?.presentationId !== this.#definition.id
        || participant.appearance?.definitionHash !== this.#definitionHash
      ) throw new RangeError('CharacterViewRuntime presentation Definition 不一致。');
      const semantics = this.#resolver.resolve(frame, participant);
      const direction = this.#directionResolver.resolve({
        facing: participant.facing,
        cameraBasis: cameraModel?.inputBasis,
        reset: snap,
      });
      const baseBinding = resolveAnimationBinding(
        this.#definition,
        semantics.baseSemantic,
        this.#capabilities,
      );
      const overlayBinding = semantics.overlaySemantic === null
        ? null
        : resolveAnimationBinding(
          this.#definition,
          semantics.overlaySemantic,
          this.#capabilities,
        );
      this.#view.sync(participant, {
        snap,
        animation: Object.freeze({ semantics, baseBinding, overlayBinding }),
        direction,
      });
      return semantics;
    } catch (error) {
      return this.#fail(error);
    }
  }

  update(deltaSeconds) {
    this.#assertUsable();
    try {
      this.#view.update(deltaSeconds);
    } catch (error) {
      this.#fail(error);
    }
  }

  getVisualPosition() {
    this.#assertUsable();
    return Object.freeze({
      x: this.#view.root.position.x,
      y: this.#view.root.position.y,
      z: this.#view.root.position.z,
    });
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      participantId: this.#participantId,
      presentationId: this.#definition.id,
      presentationHash: this.#definitionHash,
      state: this.#state,
      view: this.#view.getDebugSnapshot(),
    });
  }

  dispose() {
    if (this.#state === CHARACTER_VIEW_RUNTIME_STATE.DESTROYED) return;
    this.#state = CHARACTER_VIEW_RUNTIME_STATE.DESTROYED;
    const errors = [];
    try { this.#resolver?.destroy(); } catch (error) { errors.push(error); }
    try { this.#directionResolver?.destroy(); } catch (error) { errors.push(error); }
    try { this.#disposeView(); } catch (error) { errors.push(error); }
    if (errors.length > 0) {
      const failure = new Error('CharacterViewRuntime 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
