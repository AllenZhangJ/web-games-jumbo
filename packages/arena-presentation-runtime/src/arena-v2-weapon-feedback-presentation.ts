import {
  ARENA_MATCH_EVENT_V6,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createArenaMatchEventV6,
  createArenaWeaponFeedbackSemanticEventV1,
  type ArenaWeaponFeedbackSemanticKindV1,
} from '@number-strategy-jump/arena-contracts';
import type { PresentationEvent } from './presentation-event-window.js';

export const ARENA_V2_WEAPON_FEEDBACK_KIND = ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_KIND;

export type ArenaV2WeaponFeedbackKind = ArenaWeaponFeedbackSemanticKindV1;

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
  readonly action?: string | null;
  readonly targetId?: string | null;
  readonly attackerId?: string | null;
  readonly feedback: Readonly<{
    readonly kind: ArenaV2WeaponFeedbackKind;
    readonly title: string;
    readonly explanation: string;
  }>;
}

export interface ArenaV2WeaponFeedbackPresentationEvent extends PresentationEvent {
  readonly type: 'WeaponFeedbackPresented';
  readonly sourceEventId: string;
  readonly action: string | null;
  readonly targetId: string | null;
  readonly attackerId: string | null;
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

interface FeedbackCopy {
  readonly title: string;
  readonly explanation: string;
}

const INPUT_KEYS = new Set([
  'id', 'tick', 'sequence', 'action', 'targetId', 'attackerId', 'feedback',
]);
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
const COPY_BY_KIND: Readonly<Record<ArenaV2WeaponFeedbackKind, FeedbackCopy>> = Object.freeze({
  'hit-confirm': Object.freeze({
    title: '命中·位置被改变',
    explanation: '武器命中成立，目标仍在原支撑面，但位置和路线压力已经改变。',
  }),
  'hit-surface-transfer': Object.freeze({
    title: '命中·落点改变',
    explanation: '武器命中改变了目标的最终支撑面，路线位置发生了转移。',
  }),
  'hit-ring-out': Object.freeze({
    title: '击落·失去支撑面',
    explanation: '本次掉落已由权威规则归因给命中者。',
  }),
  'attack-evaded': Object.freeze({
    title: '未命中·攻击被避开',
    explanation: '动作结算时没有命中或掉落事实，本次攻击窗口已经结束。',
  }),
  'movement-fall': Object.freeze({
    title: '路线失误·非武器击落',
    explanation: '本次掉落由权威规则归因为移动失足，不计作武器击落。',
  }),
});

function readKind(value: unknown, name: string): ArenaV2WeaponFeedbackKind {
  if (typeof value !== 'string' || !Object.hasOwn(CUE_BY_KIND, value)) {
    throw new RangeError(`${name} 不是受支持的武器反馈语义。`);
  }
  return value as ArenaV2WeaponFeedbackKind;
}

function readOptionalString(value: unknown, name: string): string | null {
  if (value === undefined || value === null) return null;
  return assertNonEmptyString(value, name);
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
  const action = readOptionalString(
    source.action,
    'Arena V2 weapon feedback presentation input.action',
  );
  const targetId = readOptionalString(
    source.targetId,
    'Arena V2 weapon feedback presentation input.targetId',
  );
  const attackerId = readOptionalString(
    source.attackerId,
    'Arena V2 weapon feedback presentation input.attackerId',
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
    action,
    targetId,
    attackerId,
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

/**
 * Production-candidate adapter from the exact authority semantic contract.
 * Copy and cue selection stay here; cause, attribution and chronology have
 * already been validated by Rule/Core before this function is called.
 */
export function projectArenaWeaponFeedbackSemanticV1PresentationEvent(
  value: unknown,
): ArenaV2WeaponFeedbackPresentationEvent {
  const source = createArenaWeaponFeedbackSemanticEventV1(value);
  const copy = COPY_BY_KIND[source.kind];
  return projectArenaV2WeaponFeedbackPresentationEvent({
    id: source.id,
    tick: source.tick,
    sequence: source.sequence,
    action: source.actionDefinitionId,
    targetId: source.targetId,
    attackerId: source.attackerId,
    feedback: Object.freeze({
      kind: source.kind,
      title: copy.title,
      explanation: copy.explanation,
    }),
  });
}

/** Converts the public V6 authority envelope without accepting any second source. */
export function projectArenaWeaponFeedbackEventV6PresentationEvent(
  value: unknown,
): ArenaV2WeaponFeedbackPresentationEvent {
  const source = createArenaMatchEventV6(value);
  if (source.type !== ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED) {
    throw new RangeError('Weapon feedback Presentation只接受WeaponFeedbackResolved V6事件。');
  }
  return projectArenaWeaponFeedbackSemanticV1PresentationEvent({
    schemaVersion: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
    ...source,
  });
}
