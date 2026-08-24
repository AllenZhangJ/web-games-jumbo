export const ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1 = Object.freeze({
  schemaVersion: 1 as const,
  moveLeftCodes: Object.freeze(['KeyA', 'ArrowLeft'] as const),
  moveRightCodes: Object.freeze(['KeyD', 'ArrowRight'] as const),
  moveForwardCodes: Object.freeze(['KeyW', 'ArrowUp'] as const),
  moveBackwardCodes: Object.freeze(['KeyS', 'ArrowDown'] as const),
  jumpCodes: Object.freeze(['Space'] as const),
  primaryAttackCodes: Object.freeze(['KeyJ', 'KeyE'] as const),
  visibleText: '键盘 WASD/方向键移动 · 空格跳跃 · J/E攻击' as const,
  accessibilityText:
    '键盘使用W、A、S、D或方向键移动，空格键跳跃，J键或E键攻击；蓄力武器按住攻击键并松开。' as const,
});

export const ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1 = Object.freeze({
  schemaVersion: 1 as const,
  movementControlLabel: '移动' as const,
  jumpControlLabel: '跳跃' as const,
  primaryAttackControlLabel: '攻击' as const,
  visibleText: '触控 方向盘移动 · 跳跃键 · 攻击键' as const,
  accessibilityText:
    '触控使用屏幕方向盘移动、跳跃键跳跃、攻击键攻击；蓄力武器按住攻击键并松开。' as const,
});
