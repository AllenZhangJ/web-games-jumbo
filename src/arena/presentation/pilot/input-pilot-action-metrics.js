import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-contracts';
import { INPUT_PILOT_ACTION_OUTCOME } from '@number-strategy-jump/arena-input-pilot';

const GROUND_JUMP_ACTION_IDS = new Set([
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
  STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE,
]);
const AIR_JUMP_ACTION_IDS = new Set([
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.CONTEXT_AIR_JUMP,
]);

function actionDefinitionId(outcome) {
  return outcome?.kind === 'selected' && typeof outcome.actionDefinitionId === 'string'
    ? outcome.actionDefinitionId
    : null;
}

function actionOutcome(attempted, succeeded) {
  if (succeeded) return INPUT_PILOT_ACTION_OUTCOME.SUCCEEDED;
  return attempted
    ? INPUT_PILOT_ACTION_OUTCOME.FAILED
    : INPUT_PILOT_ACTION_OUTCOME.NOT_ATTEMPTED;
}

export class InputPilotActionMetrics {
  #localParticipantId;
  #attempted;
  #succeeded;
  #firstCorrectContextActionMs;

  constructor({ localParticipantId }) {
    if (typeof localParticipantId !== 'string' || localParticipantId.length === 0) {
      throw new TypeError('InputPilotActionMetrics.localParticipantId 必须是非空字符串。');
    }
    this.#localParticipantId = localParticipantId;
    this.#attempted = { groundJump: false, airJump: false, downSmash: false };
    this.#succeeded = { groundJump: false, airJump: false, downSmash: false };
    this.#firstCorrectContextActionMs = null;
    Object.freeze(this);
  }

  #recordAttempts(beforeParticipant, input) {
    if (input.slamPressed) this.#attempted.downSmash = true;
    if (input.jumpPressed) {
      this.#attempted[beforeParticipant.grounded ? 'groundJump' : 'airJump'] = true;
    }
    // jumpHeld means crouch-charge, not a second press. A held upward gesture
    // that carries into the air must not be misreported as an air-jump attempt.
    if (input.jumpHeld && beforeParticipant.grounded) this.#attempted.groundJump = true;
    const channels = beforeParticipant.actionAffordance?.channels;
    const primaryAction = input.primaryPressed
      ? actionDefinitionId(channels?.primary)
      : null;
    const primaryHoldAction = input.primaryHeld
      ? actionDefinitionId(channels?.primaryHold)
      : null;
    for (const actionId of [primaryAction, primaryHoldAction]) {
      if (GROUND_JUMP_ACTION_IDS.has(actionId)) this.#attempted.groundJump = true;
      if (AIR_JUMP_ACTION_IDS.has(actionId)) this.#attempted.airJump = true;
    }
    return new Set([primaryAction, primaryHoldAction].filter(Boolean));
  }

  observe({ beforeParticipant, input, events, elapsedMs }) {
    const expectedPrimaryActions = this.#recordAttempts(beforeParticipant, input);
    for (const event of events) {
      if (!event || event.participantId !== this.#localParticipantId) continue;
      if (event.type === ARENA_MATCH_EVENT.ACTION_STARTED) {
        if (GROUND_JUMP_ACTION_IDS.has(event.action)) {
          this.#attempted.groundJump = true;
          this.#succeeded.groundJump = true;
        }
        if (AIR_JUMP_ACTION_IDS.has(event.action)) {
          this.#attempted.airJump = true;
          this.#succeeded.airJump = true;
        }
        if (
          this.#firstCorrectContextActionMs === null
          && expectedPrimaryActions.has(event.action)
        ) this.#firstCorrectContextActionMs = elapsedMs;
      }
      if (event.type === ARENA_MATCH_EVENT.DOWN_SMASH_LANDED) {
        this.#attempted.downSmash = true;
        this.#succeeded.downSmash = true;
      }
    }
  }

  getSnapshot() {
    return Object.freeze({
      firstCorrectContextActionMs: this.#firstCorrectContextActionMs,
      groundJump: actionOutcome(this.#attempted.groundJump, this.#succeeded.groundJump),
      airJump: actionOutcome(this.#attempted.airJump, this.#succeeded.airJump),
      downSmash: actionOutcome(this.#attempted.downSmash, this.#succeeded.downSmash),
    });
  }
}
