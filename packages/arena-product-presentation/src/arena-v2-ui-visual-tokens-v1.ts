import {
  ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1,
} from '@number-strategy-jump/arena-presentation-runtime';

export const ARENA_V2_UI_VISUAL_TOKENS_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_UI_VISUAL_TONE_IDS_V1 = Object.freeze([
  'background',
  'surface',
  'primary',
  'secondary',
  'muted',
  'strong',
  'warning',
  'transparent',
] as const);

export type ArenaV2UiToneV1 = typeof ARENA_V2_UI_VISUAL_TONE_IDS_V1[number];

export const ARENA_V2_UI_CONTROL_VISUAL_ROLE_IDS_V1 = Object.freeze([
  'move',
  'primary',
  'jump',
] as const);

export type ArenaV2UiControlVisualRoleV1 =
  typeof ARENA_V2_UI_CONTROL_VISUAL_ROLE_IDS_V1[number];

export const ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1 = Object.freeze([
  'idle',
  'pressed',
] as const);

export type ArenaV2UiControlInteractionStateV1 =
  typeof ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1[number];

export const ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1 = Object.freeze([
  'unknown',
  'ready',
  'blocked',
] as const);

export type ArenaV2UiMoveAvailabilityStateV1 =
  typeof ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1[number];

export const ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1 = Object.freeze([
  'unknown',
  'ready',
  'blocked',
] as const);

export type ArenaV2UiPrimaryAvailabilityStateV1 =
  typeof ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1[number];

export const ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1 = Object.freeze([
  'press',
  'hold',
  'release',
] as const);

export type ArenaV2UiPrimaryGestureHintV1 =
  typeof ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1[number];

export const ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1 = Object.freeze([
  'unknown',
  'ready',
  'blocked',
] as const);

export type ArenaV2UiJumpAvailabilityStateV1 =
  typeof ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1[number];

export interface ArenaV2UiControlInteractionVisualTokenV1 {
  readonly backgroundColor: string;
  readonly outlineColor: string;
  readonly boxShadow: string;
  readonly transform: string;
}

export interface ArenaV2UiControlVisualRoleTokenV1 {
  readonly id: ArenaV2UiControlVisualRoleV1;
  readonly label: '移动' | '攻击' | '跳跃';
  readonly tone: 'secondary' | 'primary' | 'warning';
  readonly borderStyle: 'solid' | 'dashed';
  readonly states: Readonly<
    Record<ArenaV2UiControlInteractionStateV1, ArenaV2UiControlInteractionVisualTokenV1>
  >;
}

export interface ArenaV2UiMoveAvailabilityVisualTokenV1 {
  readonly controlOpacity: number;
  readonly indicatorVisible: boolean;
  readonly indicatorColor: string;
  readonly indicatorWidthRatio: number;
  readonly indicatorThicknessCssPixels: number;
  readonly indicatorTransform: string;
}

export interface ArenaV2UiPrimaryAvailabilityVisualTokenV1 {
  readonly controlOpacity: number;
  readonly indicatorVisible: boolean;
  readonly indicatorColor: string;
  readonly indicatorWidthRatio: number;
  readonly indicatorThicknessCssPixels: number;
  readonly indicatorTransform: string;
}

export interface ArenaV2UiJumpAvailabilityVisualTokenV1 {
  readonly controlOpacity: number;
  readonly indicatorVisible: boolean;
  readonly indicatorColor: string;
  readonly indicatorWidthRatio: number;
  readonly indicatorThicknessCssPixels: number;
  readonly indicatorTransform: string;
}

export interface ArenaV2UiVisualToneTokenV1 {
  readonly fill: string;
  readonly text: string;
  readonly artBibleSemantic:
    | 'paper-background'
    | 'paper-surface'
    | 'primary-action'
    | 'secondary-action'
    | 'muted-state'
    | 'ink-structure'
    | 'warning-state'
    | 'non-visual-hit-area';
}

const TONES: Readonly<Record<ArenaV2UiToneV1, ArenaV2UiVisualToneTokenV1>> =
  Object.freeze({
    background: Object.freeze({
      fill: '#F2EEE5',
      text: '#253238',
      artBibleSemantic: 'paper-background',
    }),
    surface: Object.freeze({
      fill: '#FFF9EE',
      text: '#253238',
      artBibleSemantic: 'paper-surface',
    }),
    primary: Object.freeze({
      fill: '#E85D4A',
      text: '#FFF9EE',
      artBibleSemantic: 'primary-action',
    }),
    secondary: Object.freeze({
      fill: '#16A6A1',
      text: '#0B7775',
      artBibleSemantic: 'secondary-action',
    }),
    muted: Object.freeze({
      fill: '#E3DED3',
      text: '#6E7778',
      artBibleSemantic: 'muted-state',
    }),
    strong: Object.freeze({
      fill: '#253238',
      text: '#253238',
      artBibleSemantic: 'ink-structure',
    }),
    warning: Object.freeze({
      fill: '#B93E33',
      text: '#B93E33',
      artBibleSemantic: 'warning-state',
    }),
    transparent: Object.freeze({
      fill: 'rgba(0,0,0,0)',
      text: 'rgba(0,0,0,0)',
      artBibleSemantic: 'non-visual-hit-area',
    }),
  });

const IDLE_CONTROL_BOX_SHADOW =
  'inset 0 0 0 5px rgb(255 255 255 / 8%), 0 8px 24px rgb(0 0 0 / 20%)';
const PRESSED_CONTROL_BOX_SHADOW =
  'inset 0 0 0 4px rgb(255 255 255 / 14%), 0 3px 10px rgb(0 0 0 / 28%)';
const IDLE_CONTROL_TRANSFORM = 'translate(-50%, -50%)';
const PRESSED_CONTROL_TRANSFORM = 'translate(-50%, -50%) scale(0.92)';

const MOVE_CONTROL_STATES = Object.freeze({
  idle: Object.freeze({
    backgroundColor: 'rgba(101,210,204,0.20)',
    outlineColor: '#65D2CC',
    boxShadow: IDLE_CONTROL_BOX_SHADOW,
    transform: IDLE_CONTROL_TRANSFORM,
  }),
  pressed: Object.freeze({
    backgroundColor: 'rgba(101,210,204,0.36)',
    outlineColor: '#65D2CC',
    boxShadow: PRESSED_CONTROL_BOX_SHADOW,
    transform: PRESSED_CONTROL_TRANSFORM,
  }),
} satisfies Readonly<
  Record<ArenaV2UiControlInteractionStateV1, ArenaV2UiControlInteractionVisualTokenV1>
>);

const PRIMARY_CONTROL_STATES = Object.freeze({
  idle: Object.freeze({
    backgroundColor: 'rgba(232,93,74,0.20)',
    outlineColor: TONES.primary.fill,
    boxShadow: IDLE_CONTROL_BOX_SHADOW,
    transform: IDLE_CONTROL_TRANSFORM,
  }),
  pressed: Object.freeze({
    backgroundColor: 'rgba(232,93,74,0.36)',
    outlineColor: TONES.primary.fill,
    boxShadow: PRESSED_CONTROL_BOX_SHADOW,
    transform: PRESSED_CONTROL_TRANSFORM,
  }),
} satisfies Readonly<
  Record<ArenaV2UiControlInteractionStateV1, ArenaV2UiControlInteractionVisualTokenV1>
>);

const JUMP_CONTROL_STATES = Object.freeze({
  idle: Object.freeze({
    backgroundColor: 'rgba(244,184,68,0.20)',
    outlineColor: '#F4B844',
    boxShadow: IDLE_CONTROL_BOX_SHADOW,
    transform: IDLE_CONTROL_TRANSFORM,
  }),
  pressed: Object.freeze({
    backgroundColor: 'rgba(244,184,68,0.36)',
    outlineColor: '#F4B844',
    boxShadow: PRESSED_CONTROL_BOX_SHADOW,
    transform: PRESSED_CONTROL_TRANSFORM,
  }),
} satisfies Readonly<
  Record<ArenaV2UiControlInteractionStateV1, ArenaV2UiControlInteractionVisualTokenV1>
>);

const CONTROL_VISUAL_ROLES: Readonly<
  Record<ArenaV2UiControlVisualRoleV1, ArenaV2UiControlVisualRoleTokenV1>
> = Object.freeze({
  move: Object.freeze({
    id: 'move',
    label: ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.movementControlLabel,
    tone: 'secondary',
    borderStyle: 'dashed',
    states: MOVE_CONTROL_STATES,
  }),
  primary: Object.freeze({
    id: 'primary',
    label: ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.primaryAttackControlLabel,
    tone: 'primary',
    borderStyle: 'solid',
    states: PRIMARY_CONTROL_STATES,
  }),
  jump: Object.freeze({
    id: 'jump',
    label: ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.jumpControlLabel,
    tone: 'warning',
    borderStyle: 'solid',
    states: JUMP_CONTROL_STATES,
  }),
});

const TOUCH_MOVE_AVAILABILITY: Readonly<
  Record<ArenaV2UiMoveAvailabilityStateV1, ArenaV2UiMoveAvailabilityVisualTokenV1>
> = Object.freeze({
  unknown: Object.freeze({
    controlOpacity: 1,
    indicatorVisible: false,
    indicatorColor: 'rgba(0,0,0,0)',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
  ready: Object.freeze({
    controlOpacity: 1,
    indicatorVisible: false,
    indicatorColor: 'rgba(0,0,0,0)',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
  blocked: Object.freeze({
    controlOpacity: 0.68,
    indicatorVisible: true,
    indicatorColor: '#FFF9EE',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
});

const TOUCH_PRIMARY_AVAILABILITY: Readonly<
  Record<ArenaV2UiPrimaryAvailabilityStateV1, ArenaV2UiPrimaryAvailabilityVisualTokenV1>
> = Object.freeze({
  unknown: Object.freeze({
    controlOpacity: 1,
    indicatorVisible: false,
    indicatorColor: 'rgba(0,0,0,0)',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
  ready: Object.freeze({
    controlOpacity: 1,
    indicatorVisible: false,
    indicatorColor: 'rgba(0,0,0,0)',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
  blocked: Object.freeze({
    controlOpacity: 0.68,
    indicatorVisible: true,
    indicatorColor: '#FFF9EE',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
});

const TOUCH_PRIMARY_GESTURE_LABELS: Readonly<
  Record<ArenaV2UiPrimaryGestureHintV1, '攻击' | '按住' | '松开'>
> = Object.freeze({
  press: '攻击',
  hold: '按住',
  release: '松开',
});

const TOUCH_JUMP_AVAILABILITY: Readonly<
  Record<ArenaV2UiJumpAvailabilityStateV1, ArenaV2UiJumpAvailabilityVisualTokenV1>
> = Object.freeze({
  unknown: Object.freeze({
    controlOpacity: 1,
    indicatorVisible: false,
    indicatorColor: 'rgba(0,0,0,0)',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
  ready: Object.freeze({
    controlOpacity: 1,
    indicatorVisible: false,
    indicatorColor: 'rgba(0,0,0,0)',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
  blocked: Object.freeze({
    controlOpacity: 0.68,
    indicatorVisible: true,
    indicatorColor: '#FFF9EE',
    indicatorWidthRatio: 0.58,
    indicatorThicknessCssPixels: 4,
    indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
  }),
});

/**
 * One immutable visual vocabulary for the 11 information pages and HUD Canvas.
 * It contains presentation values only and never derives gameplay facts.
 */
export const ARENA_V2_UI_VISUAL_TOKENS_V1 = Object.freeze({
  schemaVersion: ARENA_V2_UI_VISUAL_TOKENS_V1_SCHEMA_VERSION,
  id: 'arena-v2.ui-visual-tokens.v1',
  status: 'production-unreachable' as const,
  validationStatus: 'not-run' as const,
  productionReady: false as const,
  toneIds: ARENA_V2_UI_VISUAL_TONE_IDS_V1,
  tones: TONES,
  controlRoleIds: ARENA_V2_UI_CONTROL_VISUAL_ROLE_IDS_V1,
  controlInteractionStateIds: ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1,
  moveAvailabilityStateIds: ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1,
  primaryAvailabilityStateIds: ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1,
  primaryGestureHintIds: ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1,
  jumpAvailabilityStateIds: ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1,
  controlRoles: CONTROL_VISUAL_ROLES,
  typography: Object.freeze({
    chineseFontStack: '"PingFang SC", "Microsoft YaHei", sans-serif',
    numericFontStack: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
    numericVariant: 'tabular-nums' as const,
    standardVariant: 'normal' as const,
    canvasStandardWeight: 700 as const,
    canvasNumericWeight: 800 as const,
    domStandardWeight: 700 as const,
    domEmphasisWeight: 900 as const,
    lineHeight: 1.28 as const,
    fixedWidthNumericStrategy: Object.freeze({
      reservesStableGlyphColumns: true as const,
      negativeLetterSpacingAllowed: false as const,
      valueSlotMayResizeForDigits: false as const,
    }),
  }),
  radiiCssPixels: Object.freeze({
    none: 0 as const,
    textureInset: 2 as const,
    previewPanel: 12 as const,
    panel: 16 as const,
    action: 18 as const,
  }),
  strokes: Object.freeze({
    panel: Object.freeze({ widthCssPixels: 1 as const, color: 'rgba(37,50,56,0.18)' }),
    primaryPanel: Object.freeze({ widthCssPixels: 1 as const, color: '#B93E33' }),
    action: Object.freeze({ widthCssPixels: 1 as const, color: 'rgba(37,50,56,0.20)' }),
    focus: Object.freeze({ widthCssPixels: 3 as const, color: '#253238' }),
  }),
  touchControlChrome: Object.freeze({
    borderWidthCssPixels: 2 as const,
    borderRadius: '50%' as const,
    textColor: TONES.surface.fill,
    fontWeight: 900 as const,
    fontSizeCssPixels: 13 as const,
    fontLineHeight: 1 as const,
    letterSpacingEm: 0.08 as const,
    textShadow: '0 1px 3px rgb(0 0 0 / 65%)',
  }),
  touchMoveControl: Object.freeze({
    idleAnchorXFraction: 0.22 as const,
    idleAnchorYFraction: 0.78 as const,
    thumbDiameterRatio: 0.38 as const,
    thumbBackgroundColor: 'rgba(255,249,238,0.88)',
    thumbOutlineColor: '#65D2CC',
    thumbBorderWidthCssPixels: 2 as const,
    thumbBoxShadow:
      'inset 0 0 0 3px rgb(255 255 255 / 24%), 0 2px 8px rgb(0 0 0 / 28%)',
  }),
  touchMoveAvailability: TOUCH_MOVE_AVAILABILITY,
  touchPrimaryAvailability: TOUCH_PRIMARY_AVAILABILITY,
  touchPrimaryGestureLabels: TOUCH_PRIMARY_GESTURE_LABELS,
  touchJumpAvailability: TOUCH_JUMP_AVAILABILITY,
  constraints: Object.freeze({
    gradientsAllowed: false as const,
    dashboardCardStackAllowed: false as const,
    colorMayBeSoleSemanticChannel: false as const,
    reducedMotionMayRemoveInformation: false as const,
    mutedMayRemoveInformation: false as const,
    touchControlTransitionsAllowed: false as const,
    touchControlTimersAllowed: false as const,
    createsDomOrCanvasResources: false as const,
    ownsAuthorityState: false as const,
  }),
});

export function requireArenaV2UiVisualToneTokenV1(
  value: unknown,
): ArenaV2UiVisualToneTokenV1 {
  if (typeof value !== 'string' || !Object.hasOwn(TONES, value)) {
    throw new RangeError('Arena V2 UI tone不属于Visual Tokens V1闭合集合。');
  }
  return TONES[value as ArenaV2UiToneV1];
}

export function requireArenaV2UiControlVisualRoleTokenV1(
  value: unknown,
): ArenaV2UiControlVisualRoleTokenV1 {
  if (typeof value !== 'string' || !Object.hasOwn(CONTROL_VISUAL_ROLES, value)) {
    throw new RangeError('Arena V2 UI control role不属于Visual Tokens V1闭合集合。');
  }
  return CONTROL_VISUAL_ROLES[value as ArenaV2UiControlVisualRoleV1];
}

export function requireArenaV2UiControlInteractionVisualTokenV1(
  roleValue: unknown,
  stateValue: unknown,
): ArenaV2UiControlInteractionVisualTokenV1 {
  const role = requireArenaV2UiControlVisualRoleTokenV1(roleValue);
  if (typeof stateValue !== 'string' || !Object.hasOwn(role.states, stateValue)) {
    throw new RangeError('Arena V2 UI control interaction state不属于闭合集合。');
  }
  return role.states[stateValue as ArenaV2UiControlInteractionStateV1];
}

export function requireArenaV2UiMoveAvailabilityVisualTokenV1(
  value: unknown,
): ArenaV2UiMoveAvailabilityVisualTokenV1 {
  if (typeof value !== 'string' || !Object.hasOwn(TOUCH_MOVE_AVAILABILITY, value)) {
    throw new RangeError('Arena V2 UI move availability state不属于闭合集合。');
  }
  return TOUCH_MOVE_AVAILABILITY[value as ArenaV2UiMoveAvailabilityStateV1];
}

export function requireArenaV2UiPrimaryAvailabilityVisualTokenV1(
  value: unknown,
): ArenaV2UiPrimaryAvailabilityVisualTokenV1 {
  if (typeof value !== 'string' || !Object.hasOwn(TOUCH_PRIMARY_AVAILABILITY, value)) {
    throw new RangeError('Arena V2 UI primary availability state不属于闭合集合。');
  }
  return TOUCH_PRIMARY_AVAILABILITY[value as ArenaV2UiPrimaryAvailabilityStateV1];
}

export function requireArenaV2UiPrimaryGestureLabelV1(
  value: unknown,
): '攻击' | '按住' | '松开' {
  if (typeof value !== 'string' || !Object.hasOwn(TOUCH_PRIMARY_GESTURE_LABELS, value)) {
    throw new RangeError('Arena V2 UI primary gesture hint不属于闭合集合。');
  }
  return TOUCH_PRIMARY_GESTURE_LABELS[value as ArenaV2UiPrimaryGestureHintV1];
}

export function requireArenaV2UiJumpAvailabilityVisualTokenV1(
  value: unknown,
): ArenaV2UiJumpAvailabilityVisualTokenV1 {
  if (typeof value !== 'string' || !Object.hasOwn(TOUCH_JUMP_AVAILABILITY, value)) {
    throw new RangeError('Arena V2 UI jump availability state不属于闭合集合。');
  }
  return TOUCH_JUMP_AVAILABILITY[value as ArenaV2UiJumpAvailabilityStateV1];
}
