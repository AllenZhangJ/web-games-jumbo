import {
  ARENA_MATCH_EVENT,
  assertNonEmptyString,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import type { InputPilotAutomatedMetrics } from './input-pilot-record-fields.js';
import { INPUT_PILOT_ACTION_OUTCOME } from './input-pilot-vocabulary.js';

const GROUND_JUMP_ACTION_IDS: ReadonlySet<string> = new Set([
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
  STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE,
]);
const AIR_JUMP_ACTION_IDS: ReadonlySet<string> = new Set([
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.CONTEXT_AIR_JUMP,
]);

type ActionMetricKey = 'groundJump' | 'airJump' | 'downSmash';
type ActionMetricFlags = Readonly<Record<ActionMetricKey, boolean>>;

export interface InputPilotActionParticipantObservation {
  readonly grounded: boolean;
  readonly primaryActionId: string | null;
  readonly primaryHoldActionId: string | null;
}

export interface InputPilotActionEventObservation {
  readonly type: unknown;
  readonly participantId: unknown;
  readonly action: unknown;
}

export interface InputPilotActionMetricSnapshot {
  readonly firstCorrectContextActionMs: number | null;
  readonly groundJump: InputPilotAutomatedMetrics['groundJump'];
  readonly airJump: InputPilotAutomatedMetrics['airJump'];
  readonly downSmash: InputPilotAutomatedMetrics['downSmash'];
}

function actionOutcome(attempted: boolean, succeeded: boolean) {
  if (succeeded) return INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED;
  return attempted
    ? INPUT_PILOT_ACTION_OUTCOME.FAILED
    : INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED;
}

export class InputPilotActionMetrics {
  readonly #localParticipantId: string;
  #attempted: ActionMetricFlags;
  #succeeded: ActionMetricFlags;
  #firstCorrectContextActionMs: number | null;
  #observing: boolean;

  constructor({ localParticipantId }: { readonly localParticipantId: unknown }) {
    this.#localParticipantId = assertNonEmptyString(
      localParticipantId,
      'InputPilotActionMetrics.localParticipantId',
    );
    this.#attempted = Object.freeze({ groundJump: false, airJump: false, downSmash: false });
    this.#succeeded = Object.freeze({ groundJump: false, airJump: false, downSmash: false });
    this.#firstCorrectContextActionMs = null;
    this.#observing = false;
    Object.freeze(this);
  }

  observe({
    beforeParticipant,
    input,
    events,
    elapsedMs,
  }: {
    readonly beforeParticipant: InputPilotActionParticipantObservation;
    readonly input: ArenaInputFrame;
    readonly events: readonly InputPilotActionEventObservation[];
    readonly elapsedMs: number;
  }): void {
    if (this.#observing) throw new Error('InputPilotActionMetrics.observe() 不可重入。');
    this.#observing = true;
    try {
      const attempted = { ...this.#attempted };
      const succeeded = { ...this.#succeeded };
      let firstCorrectContextActionMs = this.#firstCorrectContextActionMs;

      if (input.slamPressed) attempted.downSmash = true;
      if (input.jumpPressed) {
        attempted[beforeParticipant.grounded ? 'groundJump' : 'airJump'] = true;
      }
      // jumpHeld 表示蓄力，不是第二次按下；带入空中的 hold 不能记成二段跳尝试。
      if (input.jumpHeld && beforeParticipant.grounded) attempted.groundJump = true;

      const expectedPrimaryActions = new Set<string>();
      if (input.primaryPressed && beforeParticipant.primaryActionId !== null) {
        expectedPrimaryActions.add(beforeParticipant.primaryActionId);
      }
      if (input.primaryHeld && beforeParticipant.primaryHoldActionId !== null) {
        expectedPrimaryActions.add(beforeParticipant.primaryHoldActionId);
      }
      for (const actionId of expectedPrimaryActions) {
        if (GROUND_JUMP_ACTION_IDS.has(actionId)) attempted.groundJump = true;
        if (AIR_JUMP_ACTION_IDS.has(actionId)) attempted.airJump = true;
      }

      for (const event of events) {
        if (event.participantId !== this.#localParticipantId) continue;
        if (event.type === ARENA_MATCH_EVENT.ACTION_STARTED) {
          if (typeof event.action !== 'string') continue;
          if (GROUND_JUMP_ACTION_IDS.has(event.action)) {
            attempted.groundJump = true;
            succeeded.groundJump = true;
          }
          if (AIR_JUMP_ACTION_IDS.has(event.action)) {
            attempted.airJump = true;
            succeeded.airJump = true;
          }
          if (
            firstCorrectContextActionMs === null
            && expectedPrimaryActions.has(event.action)
          ) firstCorrectContextActionMs = elapsedMs;
        }
        if (event.type === ARENA_MATCH_EVENT.DOWN_SMASH_LANDED) {
          attempted.downSmash = true;
          succeeded.downSmash = true;
        }
      }

      this.#attempted = Object.freeze(attempted);
      this.#succeeded = Object.freeze(succeeded);
      this.#firstCorrectContextActionMs = firstCorrectContextActionMs;
    } finally {
      this.#observing = false;
    }
  }

  getSnapshot(): InputPilotActionMetricSnapshot {
    if (this.#observing) throw new Error('observe() 期间不能读取 InputPilotActionMetrics。');
    return Object.freeze({
      firstCorrectContextActionMs: this.#firstCorrectContextActionMs,
      groundJump: actionOutcome(this.#attempted.groundJump, this.#succeeded.groundJump),
      airJump: actionOutcome(this.#attempted.airJump, this.#succeeded.airJump),
      downSmash: actionOutcome(this.#attempted.downSmash, this.#succeeded.downSmash),
    });
  }
}
