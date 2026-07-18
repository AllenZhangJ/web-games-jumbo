import { createDeterministicDataHash } from '../../shared/deterministic-data-hash.js';
import { createMatchAssignment } from '../matchmaking/match-assignment.js';
import {
  createProductMatchResult,
  validateProductMatchResult,
} from '../product/matchmaking/product-match-result.js';
import { cloneFrozenData } from '../rules/definition-utils.js';
import {
  validateHumanMatchStudyAssignment,
} from './human-match-study-assignment.js';
import { createHumanMatchStudyDefinition } from './human-match-study-definition.js';

export const HUMAN_MATCH_STUDY_CAPTURE_STATE = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function sameDeterministicData(left, right, label) {
  return createDeterministicDataHash(left, `${label} left`)
    === createDeterministicDataHash(right, `${label} right`);
}

export class HumanMatchStudyCaptureSession {
  #definition;
  #assignment;
  #state;
  #issuedMatchCount;
  #captures;
  #seedSource;
  #completionSink;

  constructor({ definition: definitionValue, assignment: assignmentValue }) {
    this.#definition = createHumanMatchStudyDefinition(definitionValue);
    this.#assignment = validateHumanMatchStudyAssignment(
      this.#definition,
      assignmentValue,
    );
    this.#state = HUMAN_MATCH_STUDY_CAPTURE_STATE.ACTIVE;
    this.#issuedMatchCount = 0;
    this.#captures = [];
    this.#seedSource = Object.freeze({
      nextSeed: () => this.#nextSeed(),
    });
    this.#completionSink = (value) => this.#capture(value);
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertReadable() {
    if (this.#state === HUMAN_MATCH_STUDY_CAPTURE_STATE.DESTROYED) {
      throw new Error('HumanMatchStudyCaptureSession 已销毁。');
    }
  }

  #fail(error) {
    this.#state = HUMAN_MATCH_STUDY_CAPTURE_STATE.FAILED;
    throw error;
  }

  #nextSeed() {
    this.#assertReadable();
    if (this.#state !== HUMAN_MATCH_STUDY_CAPTURE_STATE.ACTIVE) {
      throw new Error(`HumanMatchStudyCaptureSession 无法在 ${this.#state} 分配比赛。`);
    }
    if (this.#issuedMatchCount !== this.#captures.length) {
      return this.#fail(new Error('上一局尚未留下完整 Replay，不能分配下一局。'));
    }
    if (this.#issuedMatchCount >= this.#definition.matchesPerParticipant) {
      return this.#fail(new Error('HumanMatchStudyCaptureSession 已耗尽预注册比赛。'));
    }
    const seed = this.#assignment.matchSeeds[this.#issuedMatchCount];
    this.#issuedMatchCount += 1;
    return seed;
  }

  #capture(value) {
    this.#assertReadable();
    if (this.#state !== HUMAN_MATCH_STUDY_CAPTURE_STATE.ACTIVE) {
      throw new Error(`HumanMatchStudyCaptureSession 无法在 ${this.#state} 采集比赛。`);
    }
    try {
      if (!value || typeof value !== 'object') {
        throw new TypeError('Human Match Study completion 必须是对象。');
      }
      if (this.#issuedMatchCount !== this.#captures.length + 1) {
        throw new Error('Human Match Study 收到了未分配或重复的比赛结果。');
      }
      const matchIndex = this.#captures.length;
      const matchSeed = this.#assignment.matchSeeds[matchIndex];
      const result = validateProductMatchResult(value.result);
      const replay = cloneFrozenData(value.replay, 'Human Match Study captured replay');
      if (
        result.matchSeed !== matchSeed
        || replay.matchSeed !== matchSeed
      ) throw new RangeError('Human Match Study 完成结果没有使用当前预注册 seed。');
      if (replay.replaySchemaVersion !== this.#definition.candidate.replaySchemaVersion) {
        throw new RangeError('Human Match Study 完成结果使用了错误 Replay schema。');
      }
      if (
        !Array.isArray(replay.inputFrames)
        || !Array.isArray(replay.checkpoints)
        || !Array.isArray(replay.events)
      ) throw new TypeError('Human Match Study 完成结果缺少完整 Replay 序列。');
      const productionAssignment = createMatchAssignment({ matchSeed });
      if (
        productionAssignment.selectedDifficultyId !== this.#assignment.difficultyId
        || productionAssignment.effectiveDifficultyId !== this.#assignment.difficultyId
      ) throw new RangeError('Human Match Study 完成结果没有使用天然隐藏难度。');
      const reconstructed = createProductMatchResult({
        matchSeed,
        opponent: productionAssignment.opponent,
        content: replay.config?.contentSelection,
        replay,
      });
      if (!sameDeterministicData(result, reconstructed, 'Human Match Study capture result')) {
        throw new RangeError('Human Match Study 完成结果与 Replay 无法重建一致。');
      }
      this.#captures.push(Object.freeze({ matchIndex, result, replay }));
      if (this.#captures.length === this.#definition.matchesPerParticipant) {
        this.#state = HUMAN_MATCH_STUDY_CAPTURE_STATE.COMPLETED;
      }
      return this.getParticipantSnapshot();
    } catch (error) {
      return this.#fail(error);
    }
  }

  getPresentationPorts() {
    this.#assertReadable();
    return Object.freeze({
      seedSource: this.#seedSource,
      matchCompletionSink: this.#completionSink,
    });
  }

  getParticipantSnapshot() {
    this.#assertReadable();
    return Object.freeze({
      definitionId: this.#assignment.definitionId,
      definitionHash: this.#assignment.definitionHash,
      assignmentId: this.#assignment.assignmentId,
      participantId: this.#assignment.participantId,
      enrollmentIndex: this.#assignment.enrollmentIndex,
      state: this.#state,
      issuedMatchCount: this.#issuedMatchCount,
      completedMatchCount: this.#captures.length,
      totalMatchCount: this.#definition.matchesPerParticipant,
    });
  }

  exportOperatorCapture() {
    this.#assertReadable();
    return cloneFrozenData({
      definitionId: this.#definition.id,
      definitionHash: this.#definition.getContentHash(),
      assignment: this.#assignment,
      state: this.#state,
      issuedMatchCount: this.#issuedMatchCount,
      matches: this.#captures,
    }, 'Human Match Study operator capture');
  }

  destroy() {
    if (this.#state === HUMAN_MATCH_STUDY_CAPTURE_STATE.DESTROYED) return;
    this.#captures.length = 0;
    this.#definition = null;
    this.#assignment = null;
    this.#seedSource = null;
    this.#completionSink = null;
    this.#state = HUMAN_MATCH_STUDY_CAPTURE_STATE.DESTROYED;
  }
}
