import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { createMatchAssignment } from '@number-strategy-jump/arena-matchmaking';
import {
  createProductMatchResult,
  type ProductMatchResult,
  validateProductMatchResult,
} from '@number-strategy-jump/arena-product-contracts';
import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  validateHumanMatchStudyAssignment,
  type HumanMatchStudyAssignment,
} from './human-match-study-assignment.js';
import {
  createHumanMatchStudyDefinition,
  type HumanMatchStudyDefinition,
} from './human-match-study-definition.js';

export const HUMAN_MATCH_STUDY_CAPTURE_STATE = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

export type HumanMatchStudyCaptureState = typeof HUMAN_MATCH_STUDY_CAPTURE_STATE[
  keyof typeof HUMAN_MATCH_STUDY_CAPTURE_STATE
];

export interface HumanMatchStudyParticipantSnapshot {
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly assignmentId: string;
  readonly participantId: string;
  readonly enrollmentIndex: number;
  readonly state: HumanMatchStudyCaptureState;
  readonly issuedMatchCount: number;
  readonly completedMatchCount: number;
  readonly totalMatchCount: number;
}

interface CapturedMatch {
  readonly matchIndex: number;
  readonly result: ProductMatchResult;
  readonly replay: PlainRecord;
}

interface SeedSource {
  readonly nextSeed: () => number;
}

type CompletionSink = (value: unknown) => HumanMatchStudyParticipantSnapshot;

const SESSION_OPTION_KEYS = new Set(['definition', 'assignment']);
const COMPLETION_KEYS = new Set(['result', 'replay']);

function sameDeterministicData(left: unknown, right: unknown, label: string): boolean {
  return createDeterministicDataHash(left, `${label} left`)
    === createDeterministicDataHash(right, `${label} right`);
}

export class HumanMatchStudyCaptureSession {
  #definition: HumanMatchStudyDefinition | null;
  #assignment: HumanMatchStudyAssignment | null;
  #state: HumanMatchStudyCaptureState;
  #issuedMatchCount: number;
  readonly #captures: CapturedMatch[];
  #seedSource: SeedSource | null;
  #completionSink: CompletionSink | null;

  constructor(optionsValue: unknown) {
    const options = assertPlainRecord(optionsValue, 'HumanMatchStudyCaptureSession options');
    assertKnownKeys(options, SESSION_OPTION_KEYS, 'HumanMatchStudyCaptureSession options');
    const definitionValue = options.definition;
    const assignmentValue = options.assignment;
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

  #assertReadable(): void {
    if (this.#state === HUMAN_MATCH_STUDY_CAPTURE_STATE.DESTROYED) {
      throw new Error('HumanMatchStudyCaptureSession 已销毁。');
    }
  }

  #fail(error: unknown): never {
    this.#state = HUMAN_MATCH_STUDY_CAPTURE_STATE.FAILED;
    throw error;
  }

  #nextSeed(): number {
    this.#assertReadable();
    const definition = this.#definition;
    const assignment = this.#assignment;
    if (!definition || !assignment) throw new Error('HumanMatchStudyCaptureSession 所有权已释放。');
    if (this.#state !== HUMAN_MATCH_STUDY_CAPTURE_STATE.ACTIVE) {
      throw new Error(`HumanMatchStudyCaptureSession 无法在 ${this.#state} 分配比赛。`);
    }
    if (this.#issuedMatchCount !== this.#captures.length) {
      return this.#fail(new Error('上一局尚未留下完整 Replay，不能分配下一局。'));
    }
    if (this.#issuedMatchCount >= definition.matchesPerParticipant) {
      return this.#fail(new Error('HumanMatchStudyCaptureSession 已耗尽预注册比赛。'));
    }
    const seed = assignment.matchSeeds[this.#issuedMatchCount];
    if (seed === undefined) return this.#fail(new Error('预注册 match seed 越界。'));
    this.#issuedMatchCount += 1;
    return seed;
  }

  #capture(value: unknown): HumanMatchStudyParticipantSnapshot {
    this.#assertReadable();
    const definition = this.#definition;
    const assignment = this.#assignment;
    if (!definition || !assignment) throw new Error('HumanMatchStudyCaptureSession 所有权已释放。');
    if (this.#state !== HUMAN_MATCH_STUDY_CAPTURE_STATE.ACTIVE) {
      throw new Error(`HumanMatchStudyCaptureSession 无法在 ${this.#state} 采集比赛。`);
    }
    try {
      const completion = cloneFrozenData(value, 'Human Match Study completion');
      assertKnownKeys(completion, COMPLETION_KEYS, 'Human Match Study completion');
      if (this.#issuedMatchCount !== this.#captures.length + 1) {
        throw new Error('Human Match Study 收到了未分配或重复的比赛结果。');
      }
      const matchIndex = this.#captures.length;
      const matchSeed = assignment.matchSeeds[matchIndex];
      if (matchSeed === undefined) throw new Error('预注册 match seed 越界。');
      const result = validateProductMatchResult(completion.result);
      const replay = assertPlainRecord(
        cloneFrozenData(completion.replay, 'Human Match Study captured replay'),
        'Human Match Study captured replay',
      );
      if (
        result.matchSeed !== matchSeed
        || replay.matchSeed !== matchSeed
      ) throw new RangeError('Human Match Study 完成结果没有使用当前预注册 seed。');
      if (replay.replaySchemaVersion !== definition.candidate.replaySchemaVersion) {
        throw new RangeError('Human Match Study 完成结果使用了错误 Replay schema。');
      }
      if (
        !Array.isArray(replay.inputFrames)
        || !Array.isArray(replay.checkpoints)
        || !Array.isArray(replay.events)
      ) throw new TypeError('Human Match Study 完成结果缺少完整 Replay 序列。');
      const productionAssignment = createMatchAssignment({ matchSeed });
      if (
        productionAssignment.selectedDifficultyId !== assignment.difficultyId
        || productionAssignment.effectiveDifficultyId !== assignment.difficultyId
      ) throw new RangeError('Human Match Study 完成结果没有使用天然隐藏难度。');
      const replayConfig = assertPlainRecord(
        replay.config,
        'Human Match Study captured replay.config',
      );
      const reconstructed = createProductMatchResult({
        matchSeed,
        opponent: productionAssignment.opponent,
        content: replayConfig.contentSelection,
        replay,
      });
      if (!sameDeterministicData(result, reconstructed, 'Human Match Study capture result')) {
        throw new RangeError('Human Match Study 完成结果与 Replay 无法重建一致。');
      }
      this.#captures.push(Object.freeze({ matchIndex, result, replay }));
      if (this.#captures.length === definition.matchesPerParticipant) {
        this.#state = HUMAN_MATCH_STUDY_CAPTURE_STATE.COMPLETED;
      }
      return this.getParticipantSnapshot();
    } catch (error) {
      return this.#fail(error);
    }
  }

  getPresentationPorts(): Readonly<{
    seedSource: SeedSource;
    matchCompletionSink: CompletionSink;
  }> {
    this.#assertReadable();
    if (!this.#seedSource || !this.#completionSink) {
      throw new Error('HumanMatchStudyCaptureSession 端口已释放。');
    }
    return Object.freeze({
      seedSource: this.#seedSource,
      matchCompletionSink: this.#completionSink,
    });
  }

  getParticipantSnapshot(): HumanMatchStudyParticipantSnapshot {
    this.#assertReadable();
    const definition = this.#definition;
    const assignment = this.#assignment;
    if (!definition || !assignment) throw new Error('HumanMatchStudyCaptureSession 所有权已释放。');
    return Object.freeze({
      definitionId: assignment.definitionId,
      definitionHash: assignment.definitionHash,
      assignmentId: assignment.assignmentId,
      participantId: assignment.participantId,
      enrollmentIndex: assignment.enrollmentIndex,
      state: this.#state,
      issuedMatchCount: this.#issuedMatchCount,
      completedMatchCount: this.#captures.length,
      totalMatchCount: definition.matchesPerParticipant,
    });
  }

  exportOperatorCapture(): PlainRecord {
    this.#assertReadable();
    const definition = this.#definition;
    const assignment = this.#assignment;
    if (!definition || !assignment) throw new Error('HumanMatchStudyCaptureSession 所有权已释放。');
    return cloneFrozenData({
      definitionId: definition.id,
      definitionHash: definition.getContentHash(),
      assignment,
      state: this.#state,
      issuedMatchCount: this.#issuedMatchCount,
      matches: this.#captures,
    }, 'Human Match Study operator capture');
  }

  destroy(): void {
    if (this.#state === HUMAN_MATCH_STUDY_CAPTURE_STATE.DESTROYED) return;
    this.#captures.length = 0;
    this.#definition = null;
    this.#assignment = null;
    this.#seedSource = null;
    this.#completionSink = null;
    this.#state = HUMAN_MATCH_STUDY_CAPTURE_STATE.DESTROYED;
  }
}
