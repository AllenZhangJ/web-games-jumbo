import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1,
  ARENA_V2_UI_CONTROL_VISUAL_ROLE_IDS_V1,
  ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1,
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  ARENA_V2_UI_VISUAL_TONE_IDS_V1,
  requireArenaV2UiControlInteractionVisualTokenV1,
  requireArenaV2UiControlVisualRoleTokenV1,
  requireArenaV2UiJumpAvailabilityVisualTokenV1,
  requireArenaV2UiMoveAvailabilityVisualTokenV1,
  requireArenaV2UiPrimaryAvailabilityVisualTokenV1,
  requireArenaV2UiPrimaryGestureLabelV1,
  requireArenaV2UiVisualToneTokenV1,
} from '../src/index.js';

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value as Readonly<Record<string, unknown>>)) {
    expectDeepFrozen(child, seen);
  }
}

describe('Arena V2 UI visual tokens V1', () => {
  it('deep-freezes one exact eight-tone vocabulary for DOM and Canvas', () => {
    expect(ARENA_V2_UI_VISUAL_TONE_IDS_V1).toEqual([
      'background', 'surface', 'primary', 'secondary',
      'muted', 'strong', 'warning', 'transparent',
    ]);
    expect(Object.keys(ARENA_V2_UI_VISUAL_TOKENS_V1.tones)).toEqual(
      ARENA_V2_UI_VISUAL_TONE_IDS_V1,
    );
    expectDeepFrozen(ARENA_V2_UI_VISUAL_TOKENS_V1);
  });

  it('keeps Chinese and numeric fallback policy explicit without animation or audio semantics', () => {
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.typography).toMatchObject({
      chineseFontStack: '"PingFang SC", "Microsoft YaHei", sans-serif',
      numericFontStack: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
      numericVariant: 'tabular-nums',
      fixedWidthNumericStrategy: {
        reservesStableGlyphColumns: true,
        negativeLetterSpacingAllowed: false,
        valueSlotMayResizeForDigits: false,
      },
    });
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.constraints).toMatchObject({
      reducedMotionMayRemoveInformation: false,
      mutedMayRemoveInformation: false,
      ownsAuthorityState: false,
      createsDomOrCanvasResources: false,
    });
  });

  it('deep-freezes the exact move, primary and jump visual roles without adding inputs', () => {
    expect(ARENA_V2_UI_CONTROL_VISUAL_ROLE_IDS_V1).toEqual(['move', 'primary', 'jump']);
    expect(Object.keys(ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoles)).toEqual([
      'move', 'primary', 'jump',
    ]);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoleIds).toBe(
      ARENA_V2_UI_CONTROL_VISUAL_ROLE_IDS_V1,
    );
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoles).toMatchObject({
      move: {
        label: ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.movementControlLabel,
        tone: 'secondary',
        borderStyle: 'dashed',
      },
      primary: {
        label: ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.primaryAttackControlLabel,
        tone: 'primary',
        borderStyle: 'solid',
      },
      jump: {
        label: ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.jumpControlLabel,
        tone: 'warning',
        borderStyle: 'solid',
      },
    });
    expect(ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1).toEqual(['idle', 'pressed']);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.controlInteractionStateIds).toBe(
      ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1,
    );
    for (const roleId of ARENA_V2_UI_CONTROL_VISUAL_ROLE_IDS_V1) {
      const role = ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoles[roleId];
      expect(Object.keys(role)).toEqual([
        'id', 'label', 'tone', 'borderStyle', 'states',
      ]);
      expect(Object.keys(role.states)).toEqual(ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1);
      for (const stateId of ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1) {
        expect(Object.keys(role.states[stateId])).toEqual([
          'backgroundColor', 'outlineColor', 'boxShadow', 'transform',
        ]);
      }
      expect(Object.hasOwn(role, 'backgroundColor')).toBe(false);
      expect(Object.hasOwn(role, 'outlineColor')).toBe(false);
      expect(role.states.idle.transform).toBe('translate(-50%, -50%)');
      expect(role.states.pressed.transform).toBe(
        'translate(-50%, -50%) scale(0.92)',
      );
      expect(role.states.pressed.backgroundColor).not.toBe(role.states.idle.backgroundColor);
      expect(role.states.pressed.boxShadow).not.toBe(role.states.idle.boxShadow);
      expect(Object.hasOwn(role.states.pressed, 'transition')).toBe(false);
    }
    expect(Object.hasOwn(ARENA_V2_UI_VISUAL_TOKENS_V1.touchControlChrome, 'insetHighlightAndShadow')).toBe(
      false,
    );
    expectDeepFrozen(ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoles);
  });

  it('fails closed for future and non-string tone identities', () => {
    expect(() => requireArenaV2UiVisualToneTokenV1('future')).toThrow(/闭合集合/);
    expect(() => requireArenaV2UiVisualToneTokenV1({ tone: 'primary' })).toThrow(/闭合集合/);
    expect(requireArenaV2UiVisualToneTokenV1('primary')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.tones.primary,
    );
  });

  it('fails closed for future and non-string control roles', () => {
    expect(() => requireArenaV2UiControlVisualRoleTokenV1('future')).toThrow(/闭合集合/);
    expect(() => requireArenaV2UiControlVisualRoleTokenV1({ id: 'move' })).toThrow(/闭合集合/);
    expect(requireArenaV2UiControlVisualRoleTokenV1('move')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoles.move,
    );
  });

  it('deep-freezes one exact move anchor and directional thumb visual contract', () => {
    const moveControl = ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveControl;
    expect(Object.keys(moveControl)).toEqual([
      'idleAnchorXFraction',
      'idleAnchorYFraction',
      'thumbDiameterRatio',
      'thumbBackgroundColor',
      'thumbOutlineColor',
      'thumbBorderWidthCssPixels',
      'thumbBoxShadow',
    ]);
    expect(moveControl).toMatchObject({
      idleAnchorXFraction: 0.22,
      idleAnchorYFraction: 0.78,
      thumbDiameterRatio: 0.38,
      thumbBackgroundColor: 'rgba(255,249,238,0.88)',
      thumbOutlineColor: '#65D2CC',
      thumbBorderWidthCssPixels: 2,
    });
    expect(moveControl.idleAnchorXFraction).toBeGreaterThan(0);
    expect(moveControl.idleAnchorXFraction).toBeLessThan(1);
    expect(moveControl.idleAnchorYFraction).toBeGreaterThan(0);
    expect(moveControl.idleAnchorYFraction).toBeLessThan(1);
    expect(moveControl.thumbDiameterRatio).toBeGreaterThan(0);
    expect(moveControl.thumbDiameterRatio).toBeLessThan(1);
    expect(Object.hasOwn(moveControl, 'transition')).toBe(false);
    expect(Object.hasOwn(moveControl, 'timer')).toBe(false);
    expect(Object.hasOwn(moveControl, 'label')).toBe(false);
    expect(Object.hasOwn(moveControl, 'intent')).toBe(false);
    expect(Object.hasOwn(moveControl, 'authority')).toBe(false);
    expectDeepFrozen(moveControl);
  });

  it('deep-freezes the exact unknown, ready and blocked primary availability states', () => {
    expect(ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1).toEqual([
      'unknown', 'ready', 'blocked',
    ]);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.primaryAvailabilityStateIds).toBe(
      ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1,
    );
    expect(ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1).toEqual([
      'press', 'hold', 'release',
    ]);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.primaryGestureHintIds).toBe(
      ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1,
    );
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryGestureLabels).toEqual({
      press: '攻击', hold: '按住', release: '松开',
    });
    expect(requireArenaV2UiPrimaryGestureLabelV1('press')).toBe('攻击');
    expect(requireArenaV2UiPrimaryGestureLabelV1('hold')).toBe('按住');
    expect(requireArenaV2UiPrimaryGestureLabelV1('release')).toBe('松开');
    expect(() => requireArenaV2UiPrimaryGestureLabelV1('future')).toThrow(/闭合集合/);
    expect(Object.keys(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability)).toEqual(
      ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1,
    );
    for (const stateId of ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1) {
      const state = ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability[stateId];
      expect(Object.keys(state)).toEqual([
        'controlOpacity',
        'indicatorVisible',
        'indicatorColor',
        'indicatorWidthRatio',
        'indicatorThicknessCssPixels',
        'indicatorTransform',
      ]);
      expect(state.controlOpacity).toBeGreaterThan(0);
      expect(state.controlOpacity).toBeLessThanOrEqual(1);
      expect(state.indicatorWidthRatio).toBeGreaterThan(0);
      expect(state.indicatorWidthRatio).toBeLessThan(1);
      expect(state.indicatorThicknessCssPixels).toBeGreaterThan(0);
      expect(Object.hasOwn(state, 'transition')).toBe(false);
      expect(Object.hasOwn(state, 'timer')).toBe(false);
      expect(Object.hasOwn(state, 'authority')).toBe(false);
    }
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.unknown).toMatchObject({
      controlOpacity: 1,
      indicatorVisible: false,
      indicatorColor: 'rgba(0,0,0,0)',
    });
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.ready).toMatchObject({
      controlOpacity: 1,
      indicatorVisible: false,
      indicatorColor: 'rgba(0,0,0,0)',
    });
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.blocked).toMatchObject({
      controlOpacity: 0.68,
      indicatorVisible: true,
      indicatorColor: '#FFF9EE',
      indicatorWidthRatio: 0.58,
      indicatorThicknessCssPixels: 4,
      indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
    });
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.blocked.controlOpacity)
      .toBeLessThan(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.ready.controlOpacity);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.blocked.indicatorTransform)
      .toContain('rotate');
    expectDeepFrozen(ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability);
  });

  it('resolves exact primary availability states and fails closed for future identities', () => {
    expect(requireArenaV2UiPrimaryAvailabilityVisualTokenV1('unknown')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.unknown,
    );
    expect(requireArenaV2UiPrimaryAvailabilityVisualTokenV1('ready')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.ready,
    );
    expect(requireArenaV2UiPrimaryAvailabilityVisualTokenV1('blocked')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability.blocked,
    );
    expect(() => requireArenaV2UiPrimaryAvailabilityVisualTokenV1('future'))
      .toThrow(/闭合集合/);
    expect(() => requireArenaV2UiPrimaryAvailabilityVisualTokenV1({ state: 'ready' }))
      .toThrow(/闭合集合/);
  });

  it('reuses the exact non-color-only availability vocabulary for jump', () => {
    expect(ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1).toEqual([
      'unknown', 'ready', 'blocked',
    ]);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.jumpAvailabilityStateIds).toBe(
      ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1,
    );
    expect(Object.keys(ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability)).toEqual(
      ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1,
    );
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability).not.toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchPrimaryAvailability,
    );
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability.blocked).toMatchObject({
      controlOpacity: 0.68,
      indicatorVisible: true,
      indicatorColor: '#FFF9EE',
      indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
    });
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability.blocked.indicatorTransform)
      .toContain('rotate');
    expect(requireArenaV2UiJumpAvailabilityVisualTokenV1('unknown')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability.unknown,
    );
    expect(requireArenaV2UiJumpAvailabilityVisualTokenV1('ready')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability.ready,
    );
    expect(requireArenaV2UiJumpAvailabilityVisualTokenV1('blocked')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability.blocked,
    );
    expect(() => requireArenaV2UiJumpAvailabilityVisualTokenV1('future'))
      .toThrow(/闭合集合/);
    expectDeepFrozen(ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability);
  });

  it('reuses the exact non-color-only availability vocabulary for movement', () => {
    expect(ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1).toEqual([
      'unknown', 'ready', 'blocked',
    ]);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.moveAvailabilityStateIds).toBe(
      ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1,
    );
    expect(Object.keys(ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveAvailability)).toEqual(
      ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1,
    );
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveAvailability).not.toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchJumpAvailability,
    );
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveAvailability.blocked).toMatchObject({
      controlOpacity: 0.68,
      indicatorVisible: true,
      indicatorColor: '#FFF9EE',
      indicatorTransform: 'translate(-50%, -50%) rotate(-42deg)',
    });
    expect(requireArenaV2UiMoveAvailabilityVisualTokenV1('unknown')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveAvailability.unknown,
    );
    expect(requireArenaV2UiMoveAvailabilityVisualTokenV1('ready')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveAvailability.ready,
    );
    expect(requireArenaV2UiMoveAvailabilityVisualTokenV1('blocked')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveAvailability.blocked,
    );
    expect(() => requireArenaV2UiMoveAvailabilityVisualTokenV1('future'))
      .toThrow(/闭合集合/);
    expectDeepFrozen(ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveAvailability);
  });

  it('resolves exact role and interaction state pairs and rejects future states', () => {
    expect(requireArenaV2UiControlInteractionVisualTokenV1('move', 'idle')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoles.move.states.idle,
    );
    expect(requireArenaV2UiControlInteractionVisualTokenV1('primary', 'pressed')).toBe(
      ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoles.primary.states.pressed,
    );
    expect(() => requireArenaV2UiControlInteractionVisualTokenV1('jump', 'future'))
      .toThrow(/闭合集合/);
    expect(() => requireArenaV2UiControlInteractionVisualTokenV1('future', 'idle'))
      .toThrow(/闭合集合/);
    expect(ARENA_V2_UI_VISUAL_TOKENS_V1.constraints).toMatchObject({
      touchControlTransitionsAllowed: false,
      touchControlTimersAllowed: false,
      reducedMotionMayRemoveInformation: false,
    });
  });
});
