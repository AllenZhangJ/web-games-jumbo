import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { PresentationEvent } from './presentation-event-window.js';

export const ARENA_V2_WEAPON_FEEDBACK_KIND = Object.freeze({
  HIT_CONFIRM: 'hit-confirm',
  HIT_SURFACE_TRANSFER: 'hit-surface-transfer',
  HIT_RING_OUT: 'hit-ring-out',
  ATTACK_EVADED: 'attack-evaded',
  MOVEMENT_FALL: 'movement-fall',
} as const);

export type ArenaV2WeaponFeedbackKind = typeof ARENA_V2_WEAPON_FEEDBACK_KIND[
  keyof typeof ARENA_V2_WEAPON_FEEDBACK_KIND
];

export type ArenaV2WeaponFeedbackVisualCue =
  | 'impact-confirm'
  | 'impact-surface-transfer'
  | 'ring-out'
  | 'evaded-warning'
  | 'movement-fall-warning';

export type ArenaV2WeaponFeedbackAudioCue =
  | 'weapon-hit'
  | 'weapon-transfer'
  | 'weapon-ring-out'
  | 'weapon-evaded'
  | 'movement-fall';

export interface ArenaV2WeaponFeedbackPresentationInput {
  readonly id: string;
  readonly tick: number;
  readonly sequence: number;
  readonly feedback: Readonly<{
    readonly kind: ArenaV2WeaponFeedbackKind;
    readonly title: string;
    readonly explanation: string;
  }>;
}

export interface ArenaV2WeaponFeedbackPresentationEvent extends PresentationEvent {
  readonly type: 'WeaponFeedbackPresented';
  readonly sourceEventId: string;
  readonly feedbackKind: ArenaV2WeaponFeedbackKind;
  readonly title: string;
  readonly explanation: string;
  readonly visualCue: ArenaV2WeaponFeedbackVisualCue;
  readonly audioCue: ArenaV2WeaponFeedbackAudioCue;
  readonly emphasis: 'normal' | 'strong' | 'warning';
}

interface CueDefinition {
  readonly visualCue: ArenaV2WeaponFeedbackVisualCue;
  readonly audioCue: ArenaV2WeaponFeedbackAudioCue;
  readonly emphasis: ArenaV2WeaponFeedbackPresentationEvent['emphasis'];
}

const INPUT_KEYS = new Set(['id', 'tick', 'sequence', 'feedback']);
const FEEDBACK_KEYS = new Set(['kind', 'title', 'explanation']);
const CUE_BY_KIND: Readonly<Record<ArenaV2WeaponFeedbackKind, CueDefinition>> = Object.freeze({
  'hit-confirm': Object.freeze({
    visualCue: 'impact-confirm',
    audioCue: 'weapon-hit',
    emphasis: 'normal',
  }),
  'hit-surface-transfer': Object.freeze({
    visualCue: 'impact-surface-transfer',
    audioCue: 'weapon-transfer',
    emphasis: 'strong',
  }),
  'hit-ring-out': Object.freeze({
    visualCue: 'ring-out',
    audioCue: 'weapon-ring-out',
    emphasis: 'strong',
  }),
  'attack-evaded': Object.freeze({
    visualCue: 'evaded-warning',
    audioCue: 'weapon-evaded',
    emphasis: 'warning',
  }),
  'movement-fall': Object.freeze({
    visualCue: 'movement-fall-warning',
    audioCue: 'movement-fall',
    emphasis: 'warning',
  }),
});

function readKind(value: unknown, name: string): ArenaV2WeaponFeedbackKind {
  if (typeof value !== 'string' || !Object.hasOwn(CUE_BY_KIND, value)) {
    throw new RangeError(`${name} 不是受支持的武器反馈语义。`);
  }
  return value as ArenaV2WeaponFeedbackKind;
}

/**
 * Maps an authority-owned feedback semantic into a presentation event.
 * Presentation only chooses cues and emphasis; it never derives hit causes
 * from positions or re-runs combat judgment.
 */
export function projectArenaV2WeaponFeedbackPresentationEvent(
  value: unknown,
): ArenaV2WeaponFeedbackPresentationEvent {
  const source = cloneFrozenData(value, 'Arena V2 weapon feedback presentation input');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2 weapon feedback presentation input');
  assertKnownKeys(source.feedback, FEEDBACK_KEYS, 'Arena V2 weapon feedback presentation input.feedback');
  const id = assertNonEmptyString(source.id, 'Arena V2 weapon feedback presentation input.id');
  const tick = assertIntegerAtLeast(
    source.tick,
    0,
    'Arena V2 weapon feedback presentation input.tick',
  );
  const sequence = assertIntegerAtLeast(
    source.sequence,
    0,
    'Arena V2 weapon feedback presentation input.sequence',
  );
  const kind = readKind(
    source.feedback.kind,
    'Arena V2 weapon feedback presentation input.feedback.kind',
  );
  const cue = CUE_BY_KIND[kind];
  return Object.freeze({
    id: `presentation:weapon-feedback:${id}`,
    type: 'WeaponFeedbackPresented' as const,
    tick,
    sequence,
    sourceEventId: id,
    feedbackKind: kind,
    title: assertNonEmptyString(
      source.feedback.title,
      'Arena V2 weapon feedback presentation input.feedback.title',
    ),
    explanation: assertNonEmptyString(
      source.feedback.explanation,
      'Arena V2 weapon feedback presentation input.feedback.explanation',
    ),
    visualCue: cue.visualCue,
    audioCue: cue.audioCue,
    emphasis: cue.emphasis,
  });
}
