export const INPUT_PILOT_ACTION_OUTCOME = Object.freeze({
  NOT_ATTEMPTED: 'not-attempted',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
});

export const INPUT_PILOT_COMPREHENSION = Object.freeze({
  CORRECT: 'correct',
  PARTIAL: 'partial',
  INCORRECT: 'incorrect',
  NOT_ANSWERED: 'not-answered',
});

export const INPUT_PILOT_TRIAL_STATUS = Object.freeze({
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  INVALIDATED: 'invalidated',
});

export const INPUT_PILOT_TERMINATION_REASON = Object.freeze({
  MATCH_ENDED: 'match-ended',
  MAXIMUM_DURATION_REACHED: 'maximum-duration-reached',
  PARTICIPANT_ABANDONED: 'participant-abandoned',
  RUNNING_RECOVERED: 'running-recovered',
  RUNTIME_FAILED: 'runtime-failed',
  PROTOCOL_DEVIATION: 'protocol-deviation',
});

export const INPUT_PILOT_EXCLUSION_REASON = Object.freeze({
  INVALIDATED: 'invalidated',
  PRIOR_ARENA_EXPERIENCE: 'prior-arena-experience',
  PRIOR_OTHER_VARIANT_EXPOSURE: 'prior-other-variant-exposure',
  PLATFORM_MISMATCH: 'platform-mismatch',
  FORM_FACTOR_MISMATCH: 'form-factor-mismatch',
  ORIENTATION_MISMATCH: 'orientation-mismatch',
  INPUT_MODE_MISMATCH: 'input-mode-mismatch',
});

export const INPUT_PILOT_TRIAL_CONTROLLER_STATE = Object.freeze({
  CREATED: 'created',
  IDLE: 'idle',
  ENROLLED: 'enrolled',
  STARTING: 'starting',
  RUNNING: 'running',
  REVIEWING: 'reviewing',
  TERMINAL: 'terminal',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

export type InputPilotTrialControllerState = typeof INPUT_PILOT_TRIAL_CONTROLLER_STATE[
  keyof typeof INPUT_PILOT_TRIAL_CONTROLLER_STATE
];
