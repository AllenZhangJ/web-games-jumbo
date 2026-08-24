import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1,
  ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1,
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  requireArenaV2UiControlInteractionVisualTokenV1,
  requireArenaV2UiControlVisualRoleTokenV1,
  requireArenaV2UiJumpAvailabilityVisualTokenV1,
  requireArenaV2UiMoveAvailabilityVisualTokenV1,
  requireArenaV2UiPrimaryAvailabilityVisualTokenV1,
  requireArenaV2UiPrimaryGestureLabelV1,
  requireArenaV2UiVisualToneTokenV1,
  type ArenaV2UiControlInteractionStateV1,
  type ArenaV2UiControlVisualRoleTokenV1,
  type ArenaV2UiJumpAvailabilityStateV1,
  type ArenaV2UiJumpAvailabilityVisualTokenV1,
  type ArenaV2UiMoveAvailabilityStateV1,
  type ArenaV2UiMoveAvailabilityVisualTokenV1,
  type ArenaV2UiPrimaryAvailabilityStateV1,
  type ArenaV2UiPrimaryAvailabilityVisualTokenV1,
  type ArenaV2UiPrimaryGestureHintV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  actionButtonCenter,
  actionButtonRadius,
  cloneViewport,
  controlSafeAreaRect,
  controlAtPoint,
  createArenaControlLayout,
  joystickRadius,
  normalizedControlDelta,
  type ArenaControlId,
  type ArenaControlLayout,
  type PresentationInputViewport,
} from '@number-strategy-jump/arena-presentation-runtime';

type SyncFunction = (...arguments_: readonly unknown[]) => unknown;
type InputCallbacks = Readonly<{
  onStart: SyncFunction;
  onMove: SyncFunction;
  onEnd: SyncFunction;
  onCancel: SyncFunction;
}>;
type PointerPoint = Readonly<{ x: number; y: number; pointerId: number }>;
type ActivePointer = Readonly<PointerPoint & {
  role: ArenaControlId;
  origin: PointerPoint;
}>;
type TouchMoveControlVisualToken = Readonly<{
  idleAnchorXFraction: number;
  idleAnchorYFraction: number;
  thumbDiameterRatio: number;
  thumbBackgroundColor: string;
  thumbOutlineColor: string;
  thumbBorderWidthCssPixels: number;
  thumbBoxShadow: string;
}>;
type MoveVisualVector = Readonly<{ x: number; y: number; magnitude: number }>;
type MoveVisualOrigin = Readonly<
  | { kind: 'idle'; xFraction: number; yFraction: number; x: number; y: number }
  | { kind: 'pointer'; x: number; y: number }
>;

export interface ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly participantId: string;
  readonly state: ArenaV2UiPrimaryAvailabilityStateV1;
  readonly gestureHint: ArenaV2UiPrimaryGestureHintV1;
}

export interface ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly participantId: string;
  readonly state: ArenaV2UiMoveAvailabilityStateV1;
}

export interface ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1 {
  readonly schemaVersion: 1;
  readonly tick: number;
  readonly participantId: string;
  readonly state: ArenaV2UiJumpAvailabilityStateV1;
}

const OPTION_KEYS = new Set(['hostRoot', 'layout', 'viewportProvider']);
const INPUT_KEYS = new Set(['onStart', 'onMove', 'onEnd', 'onCancel']);
const TOUCH_MOVE_CONTROL_KEYS = new Set([
  'idleAnchorXFraction',
  'idleAnchorYFraction',
  'thumbDiameterRatio',
  'thumbBackgroundColor',
  'thumbOutlineColor',
  'thumbBorderWidthCssPixels',
  'thumbBoxShadow',
]);
const MOVE_AVAILABILITY_KEYS = new Set([
  'schemaVersion', 'tick', 'participantId', 'state',
]);
const PRIMARY_AVAILABILITY_KEYS = new Set([
  'schemaVersion', 'tick', 'participantId', 'state', 'gestureHint',
]);
const JUMP_AVAILABILITY_KEYS = new Set([
  'schemaVersion', 'tick', 'participantId', 'state',
]);
const PRIMARY_AVAILABILITY_VISUAL_KEYS = new Set([
  'controlOpacity',
  'indicatorVisible',
  'indicatorColor',
  'indicatorWidthRatio',
  'indicatorThicknessCssPixels',
  'indicatorTransform',
]);
const MOVE_AVAILABILITY_VISUAL_KEYS = PRIMARY_AVAILABILITY_VISUAL_KEYS;
const JUMP_AVAILABILITY_VISUAL_KEYS = PRIMARY_AVAILABILITY_VISUAL_KEYS;
const POINTER_CONTROL_ROLE_IDS = Object.freeze(['move', 'primary', 'jump'] as const);

export function validateArenaV2FormalWebPointerControlVisualRolesCandidateV1(
  value: unknown,
): readonly [
  ArenaV2UiControlVisualRoleTokenV1,
  ArenaV2UiControlVisualRoleTokenV1,
  ArenaV2UiControlVisualRoleTokenV1,
] {
  if (ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1.length !== 2
    || ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1[0] !== 'idle'
    || ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1[1] !== 'pressed') {
    throw new RangeError('Arena V2 formal Web pointer interaction state必须精确为idle/pressed。');
  }
  if (!Array.isArray(value) || value.length !== POINTER_CONTROL_ROLE_IDS.length) {
    throw new RangeError('Arena V2 formal Web pointer control role必须精确为三概念。');
  }
  const resolved = POINTER_CONTROL_ROLE_IDS.map((expected, index) => {
    if (value[index] !== expected) {
      throw new RangeError('Arena V2 formal Web pointer control role顺序或身份漂移。');
    }
    const role = requireArenaV2UiControlVisualRoleTokenV1(value[index]);
    requireArenaV2UiVisualToneTokenV1(role.tone);
    requireArenaV2UiControlInteractionVisualTokenV1(role.id, 'idle');
    requireArenaV2UiControlInteractionVisualTokenV1(role.id, 'pressed');
    return role;
  });
  return Object.freeze(resolved) as readonly [
    ArenaV2UiControlVisualRoleTokenV1,
    ArenaV2UiControlVisualRoleTokenV1,
    ArenaV2UiControlVisualRoleTokenV1,
  ];
}

function hostRoot(value: unknown): HTMLElement {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || typeof (value as HTMLElement).append !== 'function'
    || typeof (value as HTMLElement).getBoundingClientRect !== 'function') {
    throw new TypeError('Arena V2 formal Web pointer surface需要HTMLElement根节点。');
  }
  const root = value as HTMLElement;
  if (!root.ownerDocument?.defaultView) {
    throw new TypeError('Arena V2 formal Web pointer surface缺少Document/Window。');
  }
  return root;
}

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function finiteNumberInRange(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
  minimumInclusive = true,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  if ((minimumInclusive ? value < minimum : value <= minimum) || value > maximum) {
    throw new RangeError(`${name}超出允许范围。`);
  }
  return value;
}

function nonEmptyVisualString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    throw new TypeError(`${name}必须是1..512字符的字符串。`);
  }
  return value;
}

function validateTouchMoveControlVisualToken(value: unknown): TouchMoveControlVisualToken {
  const source = assertPlainRecord(value, 'Arena V2 formal Web touchMoveControl token');
  assertKnownKeys(
    source,
    TOUCH_MOVE_CONTROL_KEYS,
    'Arena V2 formal Web touchMoveControl token',
  );
  for (const key of TOUCH_MOVE_CONTROL_KEYS) {
    dataField(source, key, 'Arena V2 formal Web touchMoveControl token');
  }
  return Object.freeze({
    idleAnchorXFraction: finiteNumberInRange(
      source.idleAnchorXFraction,
      'touchMoveControl.idleAnchorXFraction',
      0,
      1,
    ),
    idleAnchorYFraction: finiteNumberInRange(
      source.idleAnchorYFraction,
      'touchMoveControl.idleAnchorYFraction',
      0,
      1,
    ),
    thumbDiameterRatio: finiteNumberInRange(
      source.thumbDiameterRatio,
      'touchMoveControl.thumbDiameterRatio',
      0,
      1,
      false,
    ),
    thumbBackgroundColor: nonEmptyVisualString(
      source.thumbBackgroundColor,
      'touchMoveControl.thumbBackgroundColor',
    ),
    thumbOutlineColor: nonEmptyVisualString(
      source.thumbOutlineColor,
      'touchMoveControl.thumbOutlineColor',
    ),
    thumbBorderWidthCssPixels: finiteNumberInRange(
      source.thumbBorderWidthCssPixels,
      'touchMoveControl.thumbBorderWidthCssPixels',
      0,
      32,
    ),
    thumbBoxShadow: nonEmptyVisualString(
      source.thumbBoxShadow,
      'touchMoveControl.thumbBoxShadow',
    ),
  });
}

function touchMoveControlVisualToken(): TouchMoveControlVisualToken {
  return validateTouchMoveControlVisualToken(ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveControl);
}

function moveAvailabilityVisualTokens(): Readonly<
  Record<ArenaV2UiMoveAvailabilityStateV1, ArenaV2UiMoveAvailabilityVisualTokenV1>
> {
  if (ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1.length !== 3
    || ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1[0] !== 'unknown'
    || ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1[1] !== 'ready'
    || ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1[2] !== 'blocked') {
    throw new RangeError('Arena V2 formal Web move availability必须精确为unknown/ready/blocked。');
  }
  const result = Object.create(null) as Record<
    ArenaV2UiMoveAvailabilityStateV1,
    ArenaV2UiMoveAvailabilityVisualTokenV1
  >;
  for (const state of ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1) {
    const token = requireArenaV2UiMoveAvailabilityVisualTokenV1(state);
    assertKnownKeys(
      token,
      MOVE_AVAILABILITY_VISUAL_KEYS,
      `Arena V2 formal Web move availability ${state} token`,
    );
    for (const key of MOVE_AVAILABILITY_VISUAL_KEYS) {
      dataField(token, key, `Arena V2 formal Web move availability ${state} token`);
    }
    finiteNumberInRange(token.controlOpacity, `${state}.controlOpacity`, 0, 1);
    if (typeof token.indicatorVisible !== 'boolean') {
      throw new TypeError(`${state}.indicatorVisible必须是boolean。`);
    }
    nonEmptyVisualString(token.indicatorColor, `${state}.indicatorColor`);
    finiteNumberInRange(token.indicatorWidthRatio, `${state}.indicatorWidthRatio`, 0, 1, false);
    finiteNumberInRange(
      token.indicatorThicknessCssPixels,
      `${state}.indicatorThicknessCssPixels`,
      0,
      32,
      false,
    );
    nonEmptyVisualString(token.indicatorTransform, `${state}.indicatorTransform`);
    result[state] = token;
  }
  return Object.freeze(result);
}

function primaryAvailabilityVisualTokens(): Readonly<
  Record<ArenaV2UiPrimaryAvailabilityStateV1, ArenaV2UiPrimaryAvailabilityVisualTokenV1>
> {
  if (ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1.length !== 3
    || ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1[0] !== 'unknown'
    || ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1[1] !== 'ready'
    || ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1[2] !== 'blocked') {
    throw new RangeError('Arena V2 formal Web primary availability必须精确为unknown/ready/blocked。');
  }
  const result = Object.create(null) as Record<
    ArenaV2UiPrimaryAvailabilityStateV1,
    ArenaV2UiPrimaryAvailabilityVisualTokenV1
  >;
  for (const state of ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1) {
    const token = requireArenaV2UiPrimaryAvailabilityVisualTokenV1(state);
    assertKnownKeys(
      token,
      PRIMARY_AVAILABILITY_VISUAL_KEYS,
      `Arena V2 formal Web primary availability ${state} token`,
    );
    for (const key of PRIMARY_AVAILABILITY_VISUAL_KEYS) {
      dataField(token, key, `Arena V2 formal Web primary availability ${state} token`);
    }
    finiteNumberInRange(token.controlOpacity, `${state}.controlOpacity`, 0, 1);
    if (typeof token.indicatorVisible !== 'boolean') {
      throw new TypeError(`${state}.indicatorVisible必须是boolean。`);
    }
    nonEmptyVisualString(token.indicatorColor, `${state}.indicatorColor`);
    finiteNumberInRange(token.indicatorWidthRatio, `${state}.indicatorWidthRatio`, 0, 1, false);
    finiteNumberInRange(
      token.indicatorThicknessCssPixels,
      `${state}.indicatorThicknessCssPixels`,
      0,
      32,
      false,
    );
    nonEmptyVisualString(token.indicatorTransform, `${state}.indicatorTransform`);
    result[state] = token;
  }
  return Object.freeze(result);
}

function jumpAvailabilityVisualTokens(): Readonly<
  Record<ArenaV2UiJumpAvailabilityStateV1, ArenaV2UiJumpAvailabilityVisualTokenV1>
> {
  if (ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1.length !== 3
    || ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1[0] !== 'unknown'
    || ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1[1] !== 'ready'
    || ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1[2] !== 'blocked') {
    throw new RangeError('Arena V2 formal Web jump availability必须精确为unknown/ready/blocked。');
  }
  const result = Object.create(null) as Record<
    ArenaV2UiJumpAvailabilityStateV1,
    ArenaV2UiJumpAvailabilityVisualTokenV1
  >;
  for (const state of ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1) {
    const token = requireArenaV2UiJumpAvailabilityVisualTokenV1(state);
    assertKnownKeys(
      token,
      JUMP_AVAILABILITY_VISUAL_KEYS,
      `Arena V2 formal Web jump availability ${state} token`,
    );
    for (const key of JUMP_AVAILABILITY_VISUAL_KEYS) {
      dataField(token, key, `Arena V2 formal Web jump availability ${state} token`);
    }
    finiteNumberInRange(token.controlOpacity, `${state}.controlOpacity`, 0, 1);
    if (typeof token.indicatorVisible !== 'boolean') {
      throw new TypeError(`${state}.indicatorVisible必须是boolean。`);
    }
    nonEmptyVisualString(token.indicatorColor, `${state}.indicatorColor`);
    finiteNumberInRange(token.indicatorWidthRatio, `${state}.indicatorWidthRatio`, 0, 1, false);
    finiteNumberInRange(
      token.indicatorThicknessCssPixels,
      `${state}.indicatorThicknessCssPixels`,
      0,
      32,
      false,
    );
    nonEmptyVisualString(token.indicatorTransform, `${state}.indicatorTransform`);
    result[state] = token;
  }
  return Object.freeze(result);
}

function callbacks(value: unknown): InputCallbacks {
  const source = assertPlainRecord(value, 'Arena V2 formal Web pointer callbacks');
  assertKnownKeys(source, INPUT_KEYS, 'Arena V2 formal Web pointer callbacks');
  const result = Object.create(null) as Record<string, SyncFunction>;
  for (const key of INPUT_KEYS) {
    const candidate = Object.hasOwn(source, key)
      ? dataField(source, key, 'Arena V2 formal Web pointer callbacks')
      : () => undefined;
    if (typeof candidate !== 'function') {
      throw new TypeError(`Arena V2 formal Web pointer callbacks.${key}必须是函数。`);
    }
    result[key] = candidate as SyncFunction;
  }
  return Object.freeze(result) as InputCallbacks;
}

function syncFunction(value: unknown, name: string): SyncFunction {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncFunction;
}

function movementAvailability(
  value: unknown,
): ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1 {
  rejectThenable(value, 'Arena V2 formal Web movement availability');
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena V2 formal Web movement availability'),
    'Arena V2 formal Web movement availability',
  );
  assertKnownKeys(source, MOVE_AVAILABILITY_KEYS, 'Arena V2 formal Web movement availability');
  for (const key of MOVE_AVAILABILITY_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 formal Web movement availability缺少${key}。`);
    }
    dataField(source, key, 'Arena V2 formal Web movement availability');
  }
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena V2 formal Web movement availability.schemaVersion必须是1。');
  }
  if (!Number.isSafeInteger(source.tick) || (source.tick as number) < 0) {
    throw new RangeError('Arena V2 formal Web movement availability.tick必须是非负安全整数。');
  }
  if (typeof source.participantId !== 'string'
    || source.participantId.length === 0
    || source.participantId.length > 256) {
    throw new TypeError('Arena V2 formal Web movement availability.participantId无效。');
  }
  if (typeof source.state !== 'string'
    || !ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1.includes(
      source.state as ArenaV2UiMoveAvailabilityStateV1,
    )) {
    throw new RangeError('Arena V2 formal Web movement availability.state无效。');
  }
  requireArenaV2UiMoveAvailabilityVisualTokenV1(source.state);
  return source as unknown as ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1;
}

function primaryActionAvailability(
  value: unknown,
): ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1 {
  rejectThenable(value, 'Arena V2 formal Web primary action availability');
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena V2 formal Web primary action availability'),
    'Arena V2 formal Web primary action availability',
  );
  assertKnownKeys(
    source,
    PRIMARY_AVAILABILITY_KEYS,
    'Arena V2 formal Web primary action availability',
  );
  for (const key of PRIMARY_AVAILABILITY_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 formal Web primary action availability缺少${key}。`);
    }
    dataField(source, key, 'Arena V2 formal Web primary action availability');
  }
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena V2 formal Web primary action availability.schemaVersion必须是1。');
  }
  if (!Number.isSafeInteger(source.tick) || (source.tick as number) < 0) {
    throw new RangeError('Arena V2 formal Web primary action availability.tick必须是非负安全整数。');
  }
  if (typeof source.participantId !== 'string'
    || source.participantId.length === 0
    || source.participantId.length > 256) {
    throw new TypeError('Arena V2 formal Web primary action availability.participantId无效。');
  }
  if (typeof source.state !== 'string'
    || !ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1.includes(
      source.state as ArenaV2UiPrimaryAvailabilityStateV1,
    )) {
    throw new RangeError('Arena V2 formal Web primary action availability.state无效。');
  }
  requireArenaV2UiPrimaryAvailabilityVisualTokenV1(source.state);
  if (typeof source.gestureHint !== 'string'
    || !ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1.includes(
      source.gestureHint as ArenaV2UiPrimaryGestureHintV1,
    )) {
    throw new RangeError('Arena V2 formal Web primary action gestureHint无效。');
  }
  requireArenaV2UiPrimaryGestureLabelV1(source.gestureHint);
  return source as unknown as ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1;
}

function jumpAvailability(
  value: unknown,
): ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1 {
  rejectThenable(value, 'Arena V2 formal Web jump availability');
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena V2 formal Web jump availability'),
    'Arena V2 formal Web jump availability',
  );
  assertKnownKeys(source, JUMP_AVAILABILITY_KEYS, 'Arena V2 formal Web jump availability');
  for (const key of JUMP_AVAILABILITY_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 formal Web jump availability缺少${key}。`);
    }
    dataField(source, key, 'Arena V2 formal Web jump availability');
  }
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena V2 formal Web jump availability.schemaVersion必须是1。');
  }
  if (!Number.isSafeInteger(source.tick) || (source.tick as number) < 0) {
    throw new RangeError('Arena V2 formal Web jump availability.tick必须是非负安全整数。');
  }
  if (typeof source.participantId !== 'string'
    || source.participantId.length === 0
    || source.participantId.length > 256) {
    throw new TypeError('Arena V2 formal Web jump availability.participantId无效。');
  }
  if (typeof source.state !== 'string'
    || !ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1.includes(
      source.state as ArenaV2UiJumpAvailabilityStateV1,
    )) {
    throw new RangeError('Arena V2 formal Web jump availability.state无效。');
  }
  requireArenaV2UiJumpAvailabilityVisualTokenV1(source.state);
  return source as unknown as ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1;
}

function run(callback: SyncFunction, argument: unknown, name: string): unknown {
  const result = callback(argument);
  rejectThenable(result, name);
  return result;
}

function runWithoutArgument(callback: SyncFunction, name: string): unknown {
  const result = callback();
  rejectThenable(result, name);
  return result;
}

function throwWithCleanup(
  error: unknown,
  cleanupErrors: readonly unknown[],
  message: string,
): never {
  if (cleanupErrors.length === 0) throw error;
  throw new AggregateError([error, ...cleanupErrors], message);
}

function applyVisualControlState(
  element: HTMLDivElement,
  role: ArenaV2UiControlVisualRoleTokenV1,
  state: ArenaV2UiControlInteractionStateV1,
): void {
  const chrome = ARENA_V2_UI_VISUAL_TOKENS_V1.touchControlChrome;
  const stateToken = requireArenaV2UiControlInteractionVisualTokenV1(role.id, state);
  Object.assign(element.style, {
    border: `${chrome.borderWidthCssPixels}px ${role.borderStyle} ${stateToken.outlineColor}`,
    background: stateToken.backgroundColor,
    boxShadow: stateToken.boxShadow,
    transform: stateToken.transform,
  });
}

function applyMoveAvailabilityVisual(
  moveGuide: HTMLDivElement,
  indicator: HTMLDivElement,
  token: ArenaV2UiMoveAvailabilityVisualTokenV1,
): void {
  moveGuide.style.opacity = String(token.controlOpacity);
  Object.assign(indicator.style, {
    display: token.indicatorVisible ? 'block' : 'none',
    width: `${token.indicatorWidthRatio * 100}%`,
    height: `${token.indicatorThicknessCssPixels}px`,
    background: token.indicatorColor,
    transform: token.indicatorTransform,
  });
}

function applyPrimaryAvailabilityVisual(
  primaryGuide: HTMLDivElement,
  indicator: HTMLDivElement,
  token: ArenaV2UiPrimaryAvailabilityVisualTokenV1,
): void {
  primaryGuide.style.opacity = String(token.controlOpacity);
  Object.assign(indicator.style, {
    display: token.indicatorVisible ? 'block' : 'none',
    width: `${token.indicatorWidthRatio * 100}%`,
    height: `${token.indicatorThicknessCssPixels}px`,
    background: token.indicatorColor,
    transform: token.indicatorTransform,
  });
}

function applyJumpAvailabilityVisual(
  jumpGuide: HTMLDivElement,
  indicator: HTMLDivElement,
  token: ArenaV2UiJumpAvailabilityVisualTokenV1,
): void {
  jumpGuide.style.opacity = String(token.controlOpacity);
  Object.assign(indicator.style, {
    display: token.indicatorVisible ? 'block' : 'none',
    width: `${token.indicatorWidthRatio * 100}%`,
    height: `${token.indicatorThicknessCssPixels}px`,
    background: token.indicatorColor,
    transform: token.indicatorTransform,
  });
}

function visualControl(
  documentObject: Document,
  role: ArenaV2UiControlVisualRoleTokenV1,
): HTMLDivElement {
  const tokens = ARENA_V2_UI_VISUAL_TOKENS_V1;
  const chrome = tokens.touchControlChrome;
  const element = documentObject.createElement('div');
  element.textContent = role.label;
  element.setAttribute('aria-hidden', 'true');
  Object.assign(element.style, {
    position: 'absolute',
    display: 'grid',
    placeItems: 'center',
    borderRadius: chrome.borderRadius,
    color: chrome.textColor,
    font: `${chrome.fontWeight} ${chrome.fontSizeCssPixels}px/${chrome.fontLineHeight} ${
      tokens.typography.chineseFontStack
    }`,
    letterSpacing: `${chrome.letterSpacingEm}em`,
    textShadow: chrome.textShadow,
    pointerEvents: 'none',
  });
  applyVisualControlState(element, role, 'idle');
  return element;
}

export class ArenaV2FormalWebPointerSurfaceConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  #surface: HTMLDivElement | null;

  constructor(originalError: unknown, cleanupError: unknown, surface: HTMLDivElement) {
    super(
      [originalError, cleanupError],
      'Arena V2 formal Web pointer surface构造失败且DOM回滚不完整。',
    );
    this.name =
      'ArenaV2FormalWebPointerSurfaceConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#surface = surface;
  }

  get cleanupComplete(): boolean {
    return this.#surface === null;
  }

  retryCleanup(): void {
    if (this.#surface === null) return;
    rejectThenable(
      this.#surface.remove(),
      'Arena V2 formal Web pointer surface construction root.remove',
    );
    this.#surface = null;
  }
}

/**
 * Browser-only visual and event surface for the existing three-concept pointer
 * driver. It never maps gestures to authority commands; it only forwards raw
 * pointer coordinates through the platform-shaped input boundary.
 */
export class ArenaV2FormalWebPointerSurfaceCandidateV1 {
  readonly #hostRoot: HTMLElement;
  readonly #document: Document;
  readonly #window: Window;
  readonly #layout: Readonly<ArenaControlLayout>;
  readonly #viewportProvider: SyncFunction;
  readonly #surface: HTMLDivElement;
  readonly #moveGuide: HTMLDivElement;
  readonly #moveThumb: HTMLDivElement;
  readonly #moveAvailabilityIndicator: HTMLDivElement;
  readonly #moveAvailabilityVisualTokens: Readonly<
    Record<ArenaV2UiMoveAvailabilityStateV1, ArenaV2UiMoveAvailabilityVisualTokenV1>
  >;
  readonly #primaryGuide: HTMLDivElement;
  readonly #primaryLabel: HTMLSpanElement;
  readonly #primaryAvailabilityIndicator: HTMLDivElement;
  readonly #primaryAvailabilityVisualTokens: Readonly<
    Record<ArenaV2UiPrimaryAvailabilityStateV1, ArenaV2UiPrimaryAvailabilityVisualTokenV1>
  >;
  readonly #jumpGuide: HTMLDivElement;
  readonly #jumpAvailabilityIndicator: HTMLDivElement;
  readonly #jumpAvailabilityVisualTokens: Readonly<
    Record<ArenaV2UiJumpAvailabilityStateV1, ArenaV2UiJumpAvailabilityVisualTokenV1>
  >;
  readonly #touchMoveControl: TouchMoveControlVisualToken;
  #callbacks: InputCallbacks | null = null;
  #activePointers = new Map<number, ActivePointer>();
  readonly #pressedPointerIdsByRole: Readonly<Record<ArenaControlId, Set<number>>> = {
    move: new Set<number>(),
    primary: new Set<number>(),
    jump: new Set<number>(),
  };
  #inputListenerCleanups: Array<() => void> = [];
  readonly #lifecycleListenerCleanups = new Set<() => void>();
  #visible = false;
  #disposed = false;
  #disposing = false;
  #failed = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #moveRingRadius = 1;
  #moveThumbRadius = 0;
  #moveVisualOwnerPointerId: number | null = null;
  #moveVisualVector: MoveVisualVector = Object.freeze({ x: 0, y: 0, magnitude: 0 });
  #moveVisualOrigin: MoveVisualOrigin = Object.freeze({
    kind: 'idle',
    xFraction: 0,
    yFraction: 0,
    x: 0,
    y: 0,
  });
  #moveIdleCenterX = 0;
  #moveIdleCenterY = 0;
  #movementAvailability:
    ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1 | null = null;
  #primaryActionAvailability:
    ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1 | null = null;
  #jumpActionAvailability:
    ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1 | null = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal Web pointer surface options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Web pointer surface options');
    if (!Object.hasOwn(source, 'hostRoot')) {
      throw new TypeError('Arena V2 formal Web pointer surface缺少hostRoot。');
    }
    for (const key of Object.keys(source)) {
      dataField(source, key, 'Arena V2 formal Web pointer surface options');
    }
    this.#hostRoot = hostRoot(source.hostRoot);
    this.#document = this.#hostRoot.ownerDocument;
    this.#window = this.#document.defaultView!;
    this.#layout = createArenaControlLayout(source.layout ?? {});
    const viewportProviderValue = Object.hasOwn(source, 'viewportProvider')
      ? dataField(source, 'viewportProvider', 'Arena V2 formal Web pointer surface options')
      : undefined;
    const suppliedViewportProvider = viewportProviderValue === undefined
      ? null
      : syncFunction(viewportProviderValue, 'Arena V2 formal Web pointer viewportProvider');
    const [moveVisual, primaryVisual, jumpVisual] =
      validateArenaV2FormalWebPointerControlVisualRolesCandidateV1(
        ARENA_V2_UI_VISUAL_TOKENS_V1.controlRoleIds,
      );
    this.#touchMoveControl = touchMoveControlVisualToken();
    this.#moveAvailabilityVisualTokens = moveAvailabilityVisualTokens();
    this.#primaryAvailabilityVisualTokens = primaryAvailabilityVisualTokens();
    this.#jumpAvailabilityVisualTokens = jumpAvailabilityVisualTokens();
    const surface = this.#document.createElement('div');
    surface.dataset.arenaV2FormalWebPointerSurfaceCandidate = 'v1';
    surface.setAttribute('aria-hidden', 'true');
    Object.assign(surface.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '7',
      display: 'none',
      overflow: 'hidden',
      touchAction: 'none',
      pointerEvents: 'none',
      WebkitTapHighlightColor: 'transparent',
    });
    const moveGuide = visualControl(this.#document, moveVisual);
    moveGuide.textContent = '';
    const moveThumb = this.#document.createElement('div');
    moveThumb.setAttribute('aria-hidden', 'true');
    Object.assign(moveThumb.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      boxSizing: 'border-box',
      borderRadius: ARENA_V2_UI_VISUAL_TOKENS_V1.touchControlChrome.borderRadius,
      pointerEvents: 'none',
      zIndex: '1',
      background: this.#touchMoveControl.thumbBackgroundColor,
      border: `${this.#touchMoveControl.thumbBorderWidthCssPixels}px solid ${
        this.#touchMoveControl.thumbOutlineColor
      }`,
      boxShadow: this.#touchMoveControl.thumbBoxShadow,
      transform: 'translate(-50%, -50%)',
    });
    const moveLabel = this.#document.createElement('span');
    moveLabel.textContent = moveVisual.label;
    moveLabel.setAttribute('aria-hidden', 'true');
    Object.assign(moveLabel.style, {
      position: 'absolute',
      inset: '0',
      display: 'grid',
      placeItems: 'center',
      color: 'inherit',
      font: 'inherit',
      letterSpacing: 'inherit',
      textShadow: 'inherit',
      pointerEvents: 'none',
      zIndex: '2',
    });
    const moveAvailabilityIndicator = this.#document.createElement('div');
    moveAvailabilityIndicator.setAttribute('aria-hidden', 'true');
    Object.assign(moveAvailabilityIndicator.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      pointerEvents: 'none',
      zIndex: '3',
    });
    applyMoveAvailabilityVisual(
      moveGuide,
      moveAvailabilityIndicator,
      this.#moveAvailabilityVisualTokens.unknown,
    );
    const primaryGuide = visualControl(this.#document, primaryVisual);
    primaryGuide.textContent = '';
    const primaryLabel = this.#document.createElement('span');
    primaryLabel.textContent = requireArenaV2UiPrimaryGestureLabelV1('press');
    primaryLabel.setAttribute('aria-hidden', 'true');
    Object.assign(primaryLabel.style, {
      position: 'absolute',
      inset: '0',
      display: 'grid',
      placeItems: 'center',
      color: 'inherit',
      font: 'inherit',
      letterSpacing: 'inherit',
      textShadow: 'inherit',
      pointerEvents: 'none',
      zIndex: '2',
    });
    const primaryAvailabilityIndicator = this.#document.createElement('div');
    primaryAvailabilityIndicator.setAttribute('aria-hidden', 'true');
    Object.assign(primaryAvailabilityIndicator.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      pointerEvents: 'none',
      zIndex: '3',
    });
    applyPrimaryAvailabilityVisual(
      primaryGuide,
      primaryAvailabilityIndicator,
      this.#primaryAvailabilityVisualTokens.unknown,
    );
    const jumpGuide = visualControl(this.#document, jumpVisual);
    const jumpAvailabilityIndicator = this.#document.createElement('div');
    jumpAvailabilityIndicator.setAttribute('aria-hidden', 'true');
    Object.assign(jumpAvailabilityIndicator.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      pointerEvents: 'none',
      zIndex: '3',
    });
    applyJumpAvailabilityVisual(
      jumpGuide,
      jumpAvailabilityIndicator,
      this.#jumpAvailabilityVisualTokens.unknown,
    );
    this.#surface = surface;
    this.#viewportProvider = suppliedViewportProvider ?? (() => {
      const bounds = surface.getBoundingClientRect();
      return Object.freeze({
        width: Math.max(1, bounds.width),
        height: Math.max(1, bounds.height),
      });
    });
    this.#moveGuide = moveGuide;
    this.#moveThumb = moveThumb;
    this.#moveAvailabilityIndicator = moveAvailabilityIndicator;
    this.#primaryGuide = primaryGuide;
    this.#primaryLabel = primaryLabel;
    this.#primaryAvailabilityIndicator = primaryAvailabilityIndicator;
    this.#jumpGuide = jumpGuide;
    this.#jumpAvailabilityIndicator = jumpAvailabilityIndicator;
    try {
      moveGuide.append(moveThumb, moveLabel, moveAvailabilityIndicator);
      primaryGuide.append(primaryLabel, primaryAvailabilityIndicator);
      jumpGuide.append(jumpAvailabilityIndicator);
      surface.append(moveGuide, primaryGuide, jumpGuide);
      this.#hostRoot.append(surface);
      this.#resizeGuides();
    } catch (error) {
      try {
        rejectThenable(
          surface.remove(),
          'Arena V2 formal Web pointer surface construction root.remove',
        );
      } catch (cleanupError) {
        throw new ArenaV2FormalWebPointerSurfaceConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          surface,
        );
      }
      throw error;
    }
    Object.freeze(this);
  }

  get visible(): boolean {
    this.#assertNoOperation('Arena V2 formal Web pointer surface visible read');
    return this.#visible;
  }

  #assertUsable(operation: string): void {
    this.#assertNoOperation(operation);
    if (this.#failed) throw new Error(`${operation}不能在失败关闭后调用。`);
    if (this.#disposed) throw new Error(`${operation}不能在销毁后调用。`);
    if (this.#disposing) throw new Error(`${operation}不能在销毁期间调用。`);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可在${this.#operation}期间同步重入。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #beginOperation(operation: string): void {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal Web pointer surface缺少当前操作所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #failClosed(error: unknown): never {
    this.#failed = true;
    this.#disposed = false;
    this.#visible = false;
    const errors: unknown[] = [error];
    try {
      this.#surface.style.display = 'none';
      this.#surface.style.pointerEvents = 'none';
    } catch (cleanupError) { errors.push(cleanupError); }
    let mayContinue = true;
    const inputSequence = this.#reentrySequence;
    const inputErrorCount = errors.length;
    if (this.#callbacks !== null) {
      try { this.#unbindInput(this.#callbacks); } catch (cleanupError) {
        errors.push(cleanupError);
      }
    } else {
      errors.push(...this.#cancelAll(), ...this.#removeInputListeners());
    }
    mayContinue = errors.length === inputErrorCount
      && this.#reentrySequence === inputSequence;
    if (mayContinue) errors.push(...this.#removeLifecycleListeners());
    throw errors.length === 1
      ? error
      : new AggregateError(errors, 'Arena V2 formal Web pointer surface重入失败且清理不完整。');
  }

  #endOperation(operation: string): void {
    const reentryError = this.#reentryError;
    const operationFailure = this.#operationFailure;
    if (reentryError === null) {
      this.#operation = null;
      this.#operationFailure = null;
      return;
    }
    const failure = operationFailure === null || operationFailure === reentryError
      ? reentryError
      : new AggregateError(
        [operationFailure, reentryError],
        `${operation}失败且检测到同步重入。`,
      );
    try {
      this.#failClosed(failure);
    } finally {
      this.#operation = null;
      this.#reentryError = null;
      this.#operationFailure = null;
    }
  }

  #runOperation<T>(operation: string, action: () => T): T {
    this.#beginOperation(operation);
    try {
      return action();
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#endOperation(operation);
    }
  }

  #runEventOperation(operation: string, action: () => void): void {
    if (this.#failed || this.#disposed || this.#disposing) return;
    this.#runOperation(operation, action);
  }

  #point(event: PointerEvent): Readonly<{ x: number; y: number; pointerId: number }> {
    const bounds = this.#surface.getBoundingClientRect();
    this.#assertCurrentOperationCommit();
    return Object.freeze({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      pointerId: event.pointerId,
    });
  }

  #viewport(): Readonly<PresentationInputViewport> {
    const candidate = runWithoutArgument(
      this.#viewportProvider,
      'Arena V2 formal Web pointer viewportProvider',
    );
    this.#assertCurrentOperationCommit();
    const viewport = cloneViewport(candidate, 'Arena V2 formal Web pointer viewport');
    const bounds = this.#surface.getBoundingClientRect();
    this.#assertCurrentOperationCommit();
    const normalizedBoundsWidth = Math.max(1, bounds.width);
    const normalizedBoundsHeight = Math.max(1, bounds.height);
    if (Math.abs(viewport.width - normalizedBoundsWidth) > 0.5
      || Math.abs(viewport.height - normalizedBoundsHeight) > 0.5) {
      throw new RangeError('Arena V2 formal Web pointer视觉与命中viewport尺寸不一致。');
    }
    return viewport;
  }

  #guide(role: ArenaControlId): HTMLDivElement {
    if (role === 'move') return this.#moveGuide;
    if (role === 'primary') return this.#primaryGuide;
    return this.#jumpGuide;
  }

  #applyRoleVisualState(role: ArenaControlId): void {
    applyVisualControlState(
      this.#guide(role),
      requireArenaV2UiControlVisualRoleTokenV1(role),
      this.#pressedPointerIdsByRole[role].size > 0 ? 'pressed' : 'idle',
    );
  }

  #setMovementAvailability(
    next: ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1 | null,
  ): void {
    const previous = this.#movementAvailability;
    const nextState = next?.state ?? 'unknown';
    try {
      applyMoveAvailabilityVisual(
        this.#moveGuide,
        this.#moveAvailabilityIndicator,
        this.#moveAvailabilityVisualTokens[nextState],
      );
    } catch (error) {
      const previousState = previous?.state ?? 'unknown';
      try {
        applyMoveAvailabilityVisual(
          this.#moveGuide,
          this.#moveAvailabilityIndicator,
          this.#moveAvailabilityVisualTokens[previousState],
        );
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Arena V2 formal Web movement availability视觉提交失败且回滚不完整。',
        );
      }
      throw error;
    }
    this.#movementAvailability = next;
  }

  applyMovementAvailability(
    value: unknown,
  ): ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1 {
    const operation = 'Arena V2 formal Web pointer surface applyMovementAvailability';
    this.#assertUsable(operation);
    return this.#runOperation(operation, () => {
      const next = movementAvailability(value);
      const previous = this.#movementAvailability;
      if (previous !== null) {
        if (next.participantId !== previous.participantId) {
          throw new RangeError('Arena V2 formal Web movement availability participant跨局漂移。');
        }
        if (next.tick < previous.tick) {
          throw new RangeError('Arena V2 formal Web movement availability tick回退。');
        }
        if (next.tick === previous.tick) {
          if (next.state !== previous.state) {
            throw new RangeError('Arena V2 formal Web movement availability同tick冲突。');
          }
          return previous;
        }
      }
      this.#setMovementAvailability(next);
      return next;
    });
  }

  clearMovementAvailability(): void {
    const operation = 'Arena V2 formal Web pointer surface clearMovementAvailability';
    this.#assertUsable(operation);
    this.#runOperation(operation, () => {
      if (this.#movementAvailability !== null) this.#setMovementAvailability(null);
    });
  }

  #setPrimaryActionAvailability(
    next: ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1 | null,
  ): void {
    const previous = this.#primaryActionAvailability;
    const nextState = next?.state ?? 'unknown';
    const nextGestureHint = next?.gestureHint ?? 'press';
    try {
      applyPrimaryAvailabilityVisual(
        this.#primaryGuide,
        this.#primaryAvailabilityIndicator,
        this.#primaryAvailabilityVisualTokens[nextState],
      );
      this.#primaryLabel.textContent = requireArenaV2UiPrimaryGestureLabelV1(nextGestureHint);
    } catch (error) {
      const previousState = previous?.state ?? 'unknown';
      const previousGestureHint = previous?.gestureHint ?? 'press';
      try {
        applyPrimaryAvailabilityVisual(
          this.#primaryGuide,
          this.#primaryAvailabilityIndicator,
          this.#primaryAvailabilityVisualTokens[previousState],
        );
        this.#primaryLabel.textContent = requireArenaV2UiPrimaryGestureLabelV1(
          previousGestureHint,
        );
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Arena V2 formal Web primary availability视觉提交失败且回滚不完整。',
        );
      }
      throw error;
    }
    this.#primaryActionAvailability = next;
  }

  applyPrimaryActionAvailability(
    value: unknown,
  ): ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1 {
    const operation = 'Arena V2 formal Web pointer surface applyPrimaryActionAvailability';
    this.#assertUsable(operation);
    return this.#runOperation(operation, () => {
      const next = primaryActionAvailability(value);
      const previous = this.#primaryActionAvailability;
      if (previous !== null) {
        if (next.participantId !== previous.participantId) {
          throw new RangeError('Arena V2 formal Web primary availability participant跨局漂移。');
        }
        if (next.tick < previous.tick) {
          throw new RangeError('Arena V2 formal Web primary availability tick回退。');
        }
        if (next.tick === previous.tick) {
          if (next.state !== previous.state || next.gestureHint !== previous.gestureHint) {
            throw new RangeError('Arena V2 formal Web primary availability同tick冲突。');
          }
          return previous;
        }
      }
      this.#setPrimaryActionAvailability(next);
      return next;
    });
  }

  clearPrimaryActionAvailability(): void {
    const operation = 'Arena V2 formal Web pointer surface clearPrimaryActionAvailability';
    this.#assertUsable(operation);
    this.#runOperation(operation, () => {
      if (this.#primaryActionAvailability !== null) this.#setPrimaryActionAvailability(null);
    });
  }

  #setJumpActionAvailability(
    next: ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1 | null,
  ): void {
    const previous = this.#jumpActionAvailability;
    const nextState = next?.state ?? 'unknown';
    try {
      applyJumpAvailabilityVisual(
        this.#jumpGuide,
        this.#jumpAvailabilityIndicator,
        this.#jumpAvailabilityVisualTokens[nextState],
      );
    } catch (error) {
      const previousState = previous?.state ?? 'unknown';
      try {
        applyJumpAvailabilityVisual(
          this.#jumpGuide,
          this.#jumpAvailabilityIndicator,
          this.#jumpAvailabilityVisualTokens[previousState],
        );
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Arena V2 formal Web jump availability视觉提交失败且回滚不完整。',
        );
      }
      throw error;
    }
    this.#jumpActionAvailability = next;
  }

  applyJumpActionAvailability(
    value: unknown,
  ): ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1 {
    const operation = 'Arena V2 formal Web pointer surface applyJumpActionAvailability';
    this.#assertUsable(operation);
    return this.#runOperation(operation, () => {
      const next = jumpAvailability(value);
      const previous = this.#jumpActionAvailability;
      if (previous !== null) {
        if (next.participantId !== previous.participantId) {
          throw new RangeError('Arena V2 formal Web jump availability participant跨局漂移。');
        }
        if (next.tick < previous.tick) {
          throw new RangeError('Arena V2 formal Web jump availability tick回退。');
        }
        if (next.tick === previous.tick) {
          if (next.state !== previous.state) {
            throw new RangeError('Arena V2 formal Web jump availability同tick冲突。');
          }
          return previous;
        }
      }
      this.#setJumpActionAvailability(next);
      return next;
    });
  }

  clearJumpActionAvailability(): void {
    const operation = 'Arena V2 formal Web pointer surface clearJumpActionAvailability';
    this.#assertUsable(operation);
    this.#runOperation(operation, () => {
      if (this.#jumpActionAvailability !== null) this.#setJumpActionAvailability(null);
    });
  }

  #resetAllRoleVisualStates(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const role of POINTER_CONTROL_ROLE_IDS) {
      this.#pressedPointerIdsByRole[role].clear();
      try { this.#applyRoleVisualState(role); } catch (error) { errors.push(error); }
    }
    try { this.#applyMoveVisual(); } catch (error) { errors.push(error); }
    return Object.freeze(errors);
  }

  #pointFromRecord(record: ActivePointer): PointerPoint {
    return Object.freeze({ x: record.x, y: record.y, pointerId: record.pointerId });
  }

  #moveVisualOwner(): ActivePointer | null {
    for (const record of this.#activePointers.values()) {
      if (record.role === 'move') return record;
    }
    return null;
  }

  #applyMoveVisual(): void {
    const owner = this.#moveVisualOwner();
    if (owner === null) {
      const origin = Object.freeze({
        kind: 'idle' as const,
        xFraction: this.#touchMoveControl.idleAnchorXFraction,
        yFraction: this.#touchMoveControl.idleAnchorYFraction,
        x: this.#moveIdleCenterX,
        y: this.#moveIdleCenterY,
      });
      const vector = Object.freeze({ x: 0, y: 0, magnitude: 0 });
      this.#moveGuide.style.left = `${origin.x}px`;
      this.#moveGuide.style.top = `${origin.y}px`;
      this.#moveThumb.style.left = '50%';
      this.#moveThumb.style.top = '50%';
      this.#moveVisualOwnerPointerId = null;
      this.#moveVisualOrigin = origin;
      this.#moveVisualVector = vector;
      return;
    }
    const delta = normalizedControlDelta(
      owner.origin,
      this.#pointFromRecord(owner),
      this.#moveRingRadius,
    );
    const maximumTravel = Math.max(0, this.#moveRingRadius - this.#moveThumbRadius);
    const offsetX = delta.x * maximumTravel;
    const offsetY = delta.y * maximumTravel;
    const origin = Object.freeze({
      kind: 'pointer' as const,
      x: owner.origin.x,
      y: owner.origin.y,
    });
    const vector = Object.freeze({
      x: delta.x,
      y: delta.y,
      magnitude: delta.magnitude,
    });
    this.#moveGuide.style.left = `${origin.x}px`;
    this.#moveGuide.style.top = `${origin.y}px`;
    this.#moveThumb.style.left = `calc(50% + ${offsetX}px)`;
    this.#moveThumb.style.top = `calc(50% + ${offsetY}px)`;
    this.#moveVisualOwnerPointerId = owner.pointerId;
    this.#moveVisualOrigin = origin;
    this.#moveVisualVector = vector;
  }

  #resizeGuides(): void {
    const viewport = this.#viewport();
    const actionRadius = actionButtonRadius(viewport, this.#layout);
    const actionDiameter = actionRadius * 2;
    const moveRadius = joystickRadius(viewport, this.#layout);
    const moveDiameter = moveRadius * 2;
    const safeRect = controlSafeAreaRect(viewport);
    if (safeRect.width < moveDiameter || safeRect.height < moveDiameter) {
      throw new RangeError('Arena V2 formal Web pointer safe area无法容纳完整移动外圈。');
    }
    const primaryCenter = actionButtonCenter(viewport, 'primary', this.#layout);
    const jumpCenter = actionButtonCenter(viewport, 'jump', this.#layout);
    const moveCenter = Object.freeze({
      x: Math.min(
        safeRect.right - moveRadius,
        Math.max(
          safeRect.left + moveRadius,
          safeRect.left + safeRect.width * this.#touchMoveControl.idleAnchorXFraction,
        ),
      ),
      y: Math.min(
        safeRect.bottom - moveRadius,
        Math.max(
          safeRect.top + moveRadius,
          safeRect.top + safeRect.height * this.#touchMoveControl.idleAnchorYFraction,
        ),
      ),
    });
    if (Math.hypot(primaryCenter.x - jumpCenter.x, primaryCenter.y - jumpCenter.y)
      < actionDiameter) {
      throw new RangeError('Arena V2 formal Web pointer primary/jump固定圆形发生重叠。');
    }
    for (const [name, center] of [
      ['primary', primaryCenter],
      ['jump', jumpCenter],
    ] as const) {
      if (Math.hypot(moveCenter.x - center.x, moveCenter.y - center.y)
        < moveRadius + actionRadius) {
        throw new RangeError(`Arena V2 formal Web pointer move/${name}固定圆形发生重叠。`);
      }
    }
    const thumbDiameter = moveDiameter * this.#touchMoveControl.thumbDiameterRatio;
    this.#moveRingRadius = moveRadius;
    this.#moveThumbRadius = thumbDiameter / 2;
    this.#moveIdleCenterX = moveCenter.x;
    this.#moveIdleCenterY = moveCenter.y;
    for (const [element, diameter] of [
      [this.#moveGuide, moveDiameter],
      [this.#primaryGuide, actionDiameter],
      [this.#jumpGuide, actionDiameter],
    ] as const) {
      element.style.width = `${diameter}px`;
      element.style.height = `${diameter}px`;
    }
    this.#moveThumb.style.width = `${thumbDiameter}px`;
    this.#moveThumb.style.height = `${thumbDiameter}px`;
    this.#primaryGuide.style.left = `${primaryCenter.x}px`;
    this.#primaryGuide.style.top = `${primaryCenter.y}px`;
    this.#jumpGuide.style.left = `${jumpCenter.x}px`;
    this.#jumpGuide.style.top = `${jumpCenter.y}px`;
    this.#applyMoveVisual();
  }

  #cancelAll(): readonly unknown[] {
    const registered = this.#callbacks;
    const records = [...this.#activePointers.values()];
    const errors: unknown[] = [];
    for (const record of records) {
      const errorCount = errors.length;
      errors.push(...this.#removeActivePointer(record));
      if (errors.length !== errorCount) break;
      if (this.#activePointers.get(record.pointerId) === record) break;
      if (registered === null) continue;
      const sequence = this.#reentrySequence;
      try {
        run(
          registered.onCancel,
          this.#pointFromRecord(record),
          'Arena V2 Web pointer onCancel',
        );
      } catch (error) {
        errors.push(error);
        break;
      }
      if (this.#reentrySequence !== sequence) break;
    }
    return Object.freeze(errors);
  }

  #compensateRejectedStart(
    registered: InputCallbacks,
    point: PointerPoint,
    error: unknown,
  ): never {
    const cleanupErrors: unknown[] = [];
    try { run(registered.onCancel, point, 'Arena V2 Web pointer rejected onStart compensation'); }
    catch (cleanupError) { cleanupErrors.push(cleanupError); }
    throwWithCleanup(
      error,
      cleanupErrors,
      'Arena V2 Web pointer onStart失败且下游补偿不完整。',
    );
  }

  #removeActivePointer(record: ActivePointer): readonly unknown[] {
    const errors: unknown[] = [];
    const sequence = this.#reentrySequence;
    try { this.#surface.releasePointerCapture(record.pointerId); } catch { /* 宿主可能已释放。 */ }
    if (this.#reentrySequence !== sequence) return Object.freeze(errors);
    this.#activePointers.delete(record.pointerId);
    this.#pressedPointerIdsByRole[record.role].delete(record.pointerId);
    try { this.#applyRoleVisualState(record.role); } catch (error) { errors.push(error); }
    if (errors.length === 0 && record.role === 'move') {
      try { this.#applyMoveVisual(); } catch (error) { errors.push(error); }
    }
    return Object.freeze(errors);
  }

  #removeInputListeners(): readonly unknown[] {
    const cleanups = [...this.#inputListenerCleanups];
    const failed: Array<() => void> = [];
    const errors: unknown[] = [];
    for (let index = cleanups.length - 1; index >= 0; index -= 1) {
      const cleanup = cleanups[index]!;
      const sequence = this.#reentrySequence;
      try {
        rejectThenable(cleanup(), 'Arena V2 formal Web pointer input listener cleanup');
        if (this.#reentrySequence !== sequence) {
          failed.unshift(...cleanups.slice(0, index + 1));
          break;
        }
      } catch (error) {
        failed.unshift(cleanup);
        errors.push(error);
        failed.unshift(...cleanups.slice(0, index));
        break;
      }
    }
    this.#inputListenerCleanups = failed;
    return Object.freeze(errors);
  }

  #removeLifecycleListeners(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const cleanup of [...this.#lifecycleListenerCleanups].reverse()) {
      const sequence = this.#reentrySequence;
      try {
        rejectThenable(cleanup(), 'Arena V2 formal Web pointer lifecycle listener cleanup');
        if (this.#reentrySequence !== sequence) {
          this.#lifecycleListenerCleanups.add(cleanup);
          break;
        }
      } catch (error) {
        errors.push(error);
        break;
      }
    }
    return Object.freeze(errors);
  }

  #unbindInput(registered: InputCallbacks): void {
    const cancelSequence = this.#reentrySequence;
    const errors = [...this.#cancelAll()];
    if (this.#reentrySequence !== cancelSequence) {
      throw errors.length === 0
        ? this.#reentryError!
        : new AggregateError(errors, 'Arena V2 formal Web pointer取消输入时检测到同步反调。');
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 formal Web pointer取消输入不完整。');
    }
    try {
      if (this.#movementAvailability !== null) this.#setMovementAvailability(null);
    } catch (error) { errors.push(error); }
    if (errors.length === 0) try {
      if (this.#primaryActionAvailability !== null) {
        this.#setPrimaryActionAvailability(null);
      }
    } catch (error) { errors.push(error); }
    if (errors.length === 0) try {
      if (this.#jumpActionAvailability !== null) this.#setJumpActionAvailability(null);
    } catch (error) { errors.push(error); }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 formal Web pointer可用性清理不完整。');
    }
    const listenerSequence = this.#reentrySequence;
    errors.push(...this.#removeInputListeners());
    if (this.#reentrySequence !== listenerSequence) {
      throw errors.length === 0
        ? this.#reentryError!
        : new AggregateError(errors, 'Arena V2 formal Web pointer解绑监听时检测到同步反调。');
    }
    if (errors.length === 0
      && this.#callbacks === registered
      && this.#inputListenerCleanups.length === 0) {
      this.#callbacks = null;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 formal Web pointer surface解绑不完整。');
    }
  }

  #bindLifecycleListeners(
    registrations: readonly Readonly<{
      target: Document | Window;
      type: string;
      listener: EventListener;
    }>[],
    name: string,
  ): () => void {
    let pending: Array<() => void> = [];
    const cleanup = () => {
      if (pending.length === 0) return;
      const owned = [...pending];
      const failed: Array<() => void> = [];
      const errors: unknown[] = [];
      for (let index = owned.length - 1; index >= 0; index -= 1) {
        const removeListener = owned[index]!;
        const sequence = this.#reentrySequence;
        try {
          rejectThenable(removeListener(), `${name} removeEventListener cleanup`);
          if (this.#reentrySequence !== sequence) {
            failed.unshift(...owned.slice(0, index + 1));
            break;
          }
        } catch (error) {
          failed.unshift(removeListener);
          errors.push(error);
          failed.unshift(...owned.slice(0, index));
          break;
        }
      }
      pending = failed;
      if (pending.length === 0) this.#lifecycleListenerCleanups.delete(cleanup);
      if (errors.length > 0) throw new AggregateError(errors, `${name}解绑不完整。`);
    };
    try {
      for (const { target, type, listener } of registrations) {
        pending.push(() => rejectThenable(
          target.removeEventListener(type, listener),
          `${name} removeEventListener(${type})`,
        ));
        rejectThenable(
          target.addEventListener(type, listener),
          `${name} addEventListener(${type})`,
        );
        this.#assertCurrentOperationCommit();
      }
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      try { cleanup(); } catch (cleanupError) {
        if (cleanupError instanceof AggregateError) cleanupErrors.push(...cleanupError.errors);
        else cleanupErrors.push(cleanupError);
      }
      if (pending.length > 0) this.#lifecycleListenerCleanups.add(cleanup);
      throwWithCleanup(error, cleanupErrors, `${name}绑定失败且回滚不完整。`);
    }
    this.#lifecycleListenerCleanups.add(cleanup);
    return cleanup;
  }

  #publicLifecycleCleanup(operation: string, cleanup: () => void): () => void {
    let completed = false;
    return () => {
      this.#assertNoOperation(operation);
      if (completed) return;
      this.#runOperation(operation, () => {
        rejectThenable(cleanup(), `${operation} cleanup`);
        this.#assertCurrentOperationCommit();
        completed = !this.#lifecycleListenerCleanups.has(cleanup);
      });
    };
  }

  #handlePointerDown(event: PointerEvent): void {
    if (!this.#visible || this.#callbacks === null || this.#activePointers.has(event.pointerId)) return;
    const point = this.#point(event);
    const role = controlAtPoint(point, this.#viewport(), this.#layout);
    if (role === null) return;
    event.preventDefault();
    const registered = this.#callbacks;
    let accepted: unknown;
    try {
      accepted = run(registered.onStart, point, 'Arena V2 Web pointer onStart');
      this.#assertCurrentOperationCommit();
    } catch (error) {
      this.#compensateRejectedStart(registered, point, error);
    }
    if (accepted === false) return;
    if (accepted !== true) {
      this.#compensateRejectedStart(
        registered,
        point,
        new TypeError('Arena V2 Web pointer onStart必须同步返回boolean。'),
      );
    }
    if (!this.#visible || this.#callbacks !== registered || this.#disposed) {
      this.#compensateRejectedStart(
        registered,
        point,
        new Error('Arena V2 Web pointer onStart期间Surface所有权已改变。'),
      );
    }
    const record = Object.freeze({ ...point, role, origin: point });
    this.#activePointers.set(event.pointerId, record);
    this.#pressedPointerIdsByRole[role].add(event.pointerId);
    try {
      this.#applyRoleVisualState(role);
      if (role === 'move') this.#applyMoveVisual();
    } catch (error) {
      this.#activePointers.delete(event.pointerId);
      this.#pressedPointerIdsByRole[role].delete(event.pointerId);
      const cleanupErrors: unknown[] = [];
      try { this.#applyRoleVisualState(role); } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      if (role === 'move') {
        try { this.#applyMoveVisual(); } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (cleanupErrors.length > 0) cleanupErrors.push(...this.#cancelAll());
      try { run(registered.onCancel, point, 'Arena V2 Web pointer visual commit compensation'); }
      catch (cleanupError) { cleanupErrors.push(cleanupError); }
      throwWithCleanup(
        error,
        cleanupErrors,
        'Arena V2 Web pointer pressed视觉提交失败且补偿不完整。',
      );
    }
    const captureSequence = this.#reentrySequence;
    try { this.#surface.setPointerCapture(event.pointerId); } catch { /* window listener仍会收尾。 */ }
    if (this.#reentrySequence !== captureSequence) this.#assertCurrentOperationCommit();
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    this.#runEventOperation(
      'Arena V2 formal Web pointer surface pointerdown event',
      () => this.#handlePointerDown(event),
    );
  };

  #handlePointerMove(event: PointerEvent): void {
    if (!this.#visible || this.#callbacks === null || !this.#activePointers.has(event.pointerId)) return;
    event.preventDefault();
    const point = this.#point(event);
    const previous = this.#activePointers.get(event.pointerId)!;
    const current = Object.freeze({ ...point, role: previous.role, origin: previous.origin });
    const registered = this.#callbacks;
    try {
      run(registered.onMove, point, 'Arena V2 Web pointer onMove');
      this.#assertCurrentOperationCommit();
      this.#activePointers.set(event.pointerId, current);
      if (this.#activePointers.get(event.pointerId) === current
        && current.role === 'move'
        && this.#moveVisualOwner()?.pointerId === current.pointerId) {
        this.#applyMoveVisual();
      }
    } catch (error) {
      const ownedAfterFailure = this.#callbacks === registered
        ? this.#activePointers.get(event.pointerId)
        : undefined;
      const stillOwned = ownedAfterFailure !== undefined;
      const cleanupErrors = ownedAfterFailure === undefined
        ? []
        : [...this.#removeActivePointer(ownedAfterFailure)];
      if (cleanupErrors.length > 0) cleanupErrors.push(...this.#cancelAll());
      if (stillOwned) {
        try { run(registered.onCancel, point, 'Arena V2 Web pointer onMove compensation'); }
        catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      throwWithCleanup(
        error,
        cleanupErrors,
        'Arena V2 Web pointer onMove失败且补偿不完整。',
      );
    }
  }

  readonly #onPointerMove = (event: PointerEvent): void => {
    this.#runEventOperation(
      'Arena V2 formal Web pointer surface pointermove event',
      () => this.#handlePointerMove(event),
    );
  };

  #endPointer(event: PointerEvent, cancelled: boolean): void {
    const registered = this.#callbacks;
    const record = this.#activePointers.get(event.pointerId);
    if (registered === null || record === undefined) return;
    event.preventDefault();
    const point = this.#point(event);
    const errors = [...this.#removeActivePointer(record)];
    if (errors.length > 0) errors.push(...this.#cancelAll());
    try {
      run(
        cancelled || errors.length > 0 ? registered.onCancel : registered.onEnd,
        point,
        cancelled || errors.length > 0
          ? 'Arena V2 Web pointer onCancel'
          : 'Arena V2 Web pointer onEnd',
      );
      this.#assertCurrentOperationCommit();
    } catch (error) { errors.push(error); }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 Web pointer结束且清理不完整。');
    }
  }

  readonly #onPointerUp = (event: PointerEvent): void => {
    this.#runEventOperation(
      'Arena V2 formal Web pointer surface pointerup event',
      () => this.#endPointer(event, false),
    );
  };
  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#runEventOperation(
      'Arena V2 formal Web pointer surface pointercancel event',
      () => this.#endPointer(event, true),
    );
  };

  #bindInputOwned(value: unknown): () => void {
    if (this.#callbacks !== null || this.#inputListenerCleanups.length > 0) {
      throw new Error('Arena V2 formal Web pointer surface已绑定输入或存在未完成解绑。');
    }
    const registered = callbacks(value);
    this.#callbacks = registered;
    try {
      this.#inputListenerCleanups.push(() => {
        rejectThenable(
          this.#surface.removeEventListener('pointerdown', this.#onPointerDown),
          'Arena V2 formal Web pointer removeEventListener(pointerdown)',
        );
      });
      rejectThenable(
        this.#surface.addEventListener(
          'pointerdown',
          this.#onPointerDown,
          { passive: false },
        ),
        'Arena V2 formal Web pointer addEventListener(pointerdown)',
      );
      this.#assertCurrentOperationCommit();
      this.#inputListenerCleanups.push(() => {
        rejectThenable(
          this.#window.removeEventListener('pointermove', this.#onPointerMove),
          'Arena V2 formal Web pointer removeEventListener(pointermove)',
        );
      });
      rejectThenable(
        this.#window.addEventListener(
          'pointermove',
          this.#onPointerMove,
          { passive: false },
        ),
        'Arena V2 formal Web pointer addEventListener(pointermove)',
      );
      this.#assertCurrentOperationCommit();
      this.#inputListenerCleanups.push(() => {
        rejectThenable(
          this.#window.removeEventListener('pointerup', this.#onPointerUp),
          'Arena V2 formal Web pointer removeEventListener(pointerup)',
        );
      });
      rejectThenable(
        this.#window.addEventListener('pointerup', this.#onPointerUp, { passive: false }),
        'Arena V2 formal Web pointer addEventListener(pointerup)',
      );
      this.#assertCurrentOperationCommit();
      this.#inputListenerCleanups.push(() => {
        rejectThenable(
          this.#window.removeEventListener('pointercancel', this.#onPointerCancel),
          'Arena V2 formal Web pointer removeEventListener(pointercancel)',
        );
      });
      rejectThenable(
        this.#window.addEventListener(
          'pointercancel',
          this.#onPointerCancel,
          { passive: false },
        ),
        'Arena V2 formal Web pointer addEventListener(pointercancel)',
      );
      this.#assertCurrentOperationCommit();
    } catch (error) {
      const cleanupErrors = [...this.#cancelAll(), ...this.#removeInputListeners()];
      if (this.#inputListenerCleanups.length === 0) this.#callbacks = null;
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal Web pointer surface绑定失败且回滚不完整。',
        );
      }
      throw error;
    }
    let completed = false;
    return () => {
      const operation = 'Arena V2 formal Web pointer surface unbindInput';
      this.#assertNoOperation(operation);
      if (completed) return;
      this.#runOperation(operation, () => {
        this.#unbindInput(registered);
        completed = this.#callbacks !== registered
          && this.#inputListenerCleanups.length === 0;
      });
    };
  }

  bindInput(value: unknown): () => void {
    const operation = 'Arena V2 formal Web pointer surface bindInput';
    this.#assertUsable(operation);
    return this.#runOperation(operation, () => this.#bindInputOwned(value));
  }

  onResize(callback: () => void): () => void {
    const operation = 'Arena V2 formal Web pointer surface onResize';
    this.#assertUsable(operation);
    if (typeof callback !== 'function') throw new TypeError('onResize callback必须是函数。');
    return this.#runOperation(operation, () => {
      const handler = () => {
        this.#runEventOperation('Arena V2 formal Web pointer surface resize event', () => {
          const errors = [...this.#cancelAll()];
          try {
            this.#resizeGuides();
          } catch (error) {
            this.#visible = false;
            try {
              this.#surface.style.display = 'none';
              this.#surface.style.pointerEvents = 'none';
            } catch (cleanupError) {
              errors.push(cleanupError);
            }
            throwWithCleanup(
              error,
              errors,
              'Arena V2 formal Web pointer resize几何无效且禁用清理不完整。',
            );
          }
          try {
            runWithoutArgument(callback, 'Arena V2 formal Web pointer surface onResize callback');
            this.#assertCurrentOperationCommit();
          } catch (error) { errors.push(error); }
          if (errors.length > 0) {
            throw new AggregateError(errors, 'Arena V2 formal Web pointer resize清理或回调失败。');
          }
        });
      };
      const cleanup = this.#bindLifecycleListeners([{
        target: this.#window,
        type: 'resize',
        listener: handler,
      }], 'Arena V2 formal Web pointer onResize');
      return this.#publicLifecycleCleanup(
        'Arena V2 formal Web pointer surface onResize cleanup',
        cleanup,
      );
    });
  }

  onHide(callback: () => void): () => void {
    const operation = 'Arena V2 formal Web pointer surface onHide';
    this.#assertUsable(operation);
    if (typeof callback !== 'function') throw new TypeError('onHide callback必须是函数。');
    return this.#runOperation(operation, () => {
      const hide = () => {
        this.#runEventOperation('Arena V2 formal Web pointer surface hide event', () => {
          const errors = [...this.#cancelAll()];
          try {
            if (this.#movementAvailability !== null) this.#setMovementAvailability(null);
          } catch (error) { errors.push(error); }
          try {
            if (this.#primaryActionAvailability !== null) {
              this.#setPrimaryActionAvailability(null);
            }
          } catch (error) { errors.push(error); }
          try {
            if (this.#jumpActionAvailability !== null) this.#setJumpActionAvailability(null);
          } catch (error) { errors.push(error); }
          try {
            runWithoutArgument(callback, 'Arena V2 formal Web pointer surface onHide callback');
            this.#assertCurrentOperationCommit();
          } catch (error) { errors.push(error); }
          if (errors.length > 0) {
            throw new AggregateError(errors, 'Arena V2 formal Web pointer hide清理或回调失败。');
          }
        });
      };
      const visibility = () => { if (this.#document.hidden) hide(); };
      const cleanup = this.#bindLifecycleListeners([
        { target: this.#document, type: 'visibilitychange', listener: visibility },
        { target: this.#window, type: 'pagehide', listener: hide },
        { target: this.#window, type: 'blur', listener: hide },
      ], 'Arena V2 formal Web pointer onHide');
      return this.#publicLifecycleCleanup(
        'Arena V2 formal Web pointer surface onHide cleanup',
        cleanup,
      );
    });
  }

  isHidden(): boolean {
    const operation = 'Arena V2 formal Web pointer surface isHidden';
    this.#assertUsable(operation);
    return this.#runOperation(operation, () => this.#document.hidden);
  }

  onShow(callback: () => void): () => void {
    const operation = 'Arena V2 formal Web pointer surface onShow';
    this.#assertUsable(operation);
    if (typeof callback !== 'function') throw new TypeError('onShow callback必须是函数。');
    return this.#runOperation(operation, () => {
      const handler = () => {
        this.#runEventOperation('Arena V2 formal Web pointer surface show event', () => {
          if (!this.#document.hidden) {
            runWithoutArgument(callback, 'Arena V2 formal Web pointer surface onShow callback');
            this.#assertCurrentOperationCommit();
          }
        });
      };
      const cleanup = this.#bindLifecycleListeners([
        { target: this.#document, type: 'visibilitychange', listener: handler },
        { target: this.#window, type: 'pageshow', listener: handler },
        { target: this.#window, type: 'focus', listener: handler },
      ], 'Arena V2 formal Web pointer onShow');
      return this.#publicLifecycleCleanup(
        'Arena V2 formal Web pointer surface onShow cleanup',
        cleanup,
      );
    });
  }

  setVisible(visible: boolean): void {
    const operation = 'Arena V2 formal Web pointer surface setVisible';
    this.#assertUsable(operation);
    if (typeof visible !== 'boolean') throw new TypeError('pointer surface visible必须是boolean。');
    this.#runOperation(operation, () => {
      if (this.#visible === visible
        && (visible || (
          this.#activePointers.size === 0
          && this.#movementAvailability === null
          && this.#primaryActionAvailability === null
          && this.#jumpActionAvailability === null
        ))) {
        return;
      }
      const errors: unknown[] = [];
      if (!visible) {
        errors.push(...this.#cancelAll());
        try {
          if (this.#movementAvailability !== null) this.#setMovementAvailability(null);
        } catch (error) { errors.push(error); }
        try {
          if (this.#primaryActionAvailability !== null) {
            this.#setPrimaryActionAvailability(null);
          }
        } catch (error) { errors.push(error); }
        try {
          if (this.#jumpActionAvailability !== null) this.#setJumpActionAvailability(null);
        } catch (error) { errors.push(error); }
      }
      this.#visible = visible;
      this.#surface.style.display = visible ? 'block' : 'none';
      this.#surface.style.pointerEvents = visible ? 'auto' : 'none';
      if (visible) {
        try { this.#resizeGuides(); } catch (error) {
          this.#visible = false;
          this.#surface.style.display = 'none';
          this.#surface.style.pointerEvents = 'none';
          errors.push(error, ...this.#cancelAll());
        }
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Web pointer visibility切换不完整。');
      }
    });
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertNoOperation('Arena V2 formal Web pointer surface snapshot read');
    return Object.freeze({
      visible: this.#visible,
      bound: this.#callbacks !== null,
      activePointerCount: this.#activePointers.size,
      pressedRoleIds: Object.freeze(POINTER_CONTROL_ROLE_IDS.filter(
        (role) => this.#pressedPointerIdsByRole[role].size > 0,
      )),
      pressedPointerCounts: Object.freeze({
        move: this.#pressedPointerIdsByRole.move.size,
        primary: this.#pressedPointerIdsByRole.primary.size,
        jump: this.#pressedPointerIdsByRole.jump.size,
      }),
      moveVisualOwnerPointerId: this.#moveVisualOwnerPointerId,
      moveVisualOrigin: this.#moveVisualOrigin,
      moveVisualVector: this.#moveVisualVector,
      movementAvailability: this.#movementAvailability,
      movementAvailabilityState: this.#movementAvailability?.state ?? 'unknown',
      primaryActionAvailability: this.#primaryActionAvailability,
      primaryActionAvailabilityState: this.#primaryActionAvailability?.state ?? 'unknown',
      primaryActionGestureHint: this.#primaryActionAvailability?.gestureHint ?? 'press',
      jumpActionAvailability: this.#jumpActionAvailability,
      jumpActionAvailabilityState: this.#jumpActionAvailability?.state ?? 'unknown',
      failed: this.#failed,
      disposed: this.#disposed,
      layout: this.#layout,
    });
  }

  dispose(): void {
    this.#assertNoOperation('Arena V2 formal Web pointer surface dispose');
    if (this.#disposed) return;
    const operation = 'Arena V2 formal Web pointer surface dispose';
    this.#beginOperation(operation);
    this.#disposing = true;
    try {
      const errors: unknown[] = [];
      let mayContinue = true;
      const inputSequence = this.#reentrySequence;
      if (this.#callbacks !== null) {
        try { this.#unbindInput(this.#callbacks); } catch (error) { errors.push(error); }
      } else {
        errors.push(...this.#cancelAll(), ...this.#removeInputListeners());
      }
      mayContinue = errors.length === 0 && this.#reentrySequence === inputSequence;
      if (mayContinue) {
        const lifecycleSequence = this.#reentrySequence;
        errors.push(...this.#removeLifecycleListeners());
        mayContinue = errors.length === 0 && this.#reentrySequence === lifecycleSequence;
      }
      if (mayContinue) {
        try {
          if (this.#movementAvailability !== null) this.#setMovementAvailability(null);
        } catch (error) {
          errors.push(error);
          mayContinue = false;
        }
        if (mayContinue) try {
          if (this.#primaryActionAvailability !== null) this.#setPrimaryActionAvailability(null);
        } catch (error) {
          errors.push(error);
          mayContinue = false;
        }
        if (mayContinue) try {
          if (this.#jumpActionAvailability !== null) this.#setJumpActionAvailability(null);
        } catch (error) {
          errors.push(error);
          mayContinue = false;
        }
        if (mayContinue) {
          this.#visible = false;
          this.#surface.style.display = 'none';
          this.#surface.style.pointerEvents = 'none';
        }
      }
      if (mayContinue && this.#callbacks === null
        && this.#inputListenerCleanups.length === 0
        && this.#lifecycleListenerCleanups.size === 0) {
        try {
          rejectThenable(
            this.#surface.remove(),
            'Arena V2 formal Web pointer surface.remove',
          );
          this.#assertCurrentOperationCommit();
        } catch (error) {
          errors.push(error);
          mayContinue = false;
        }
      }
      this.#disposed = errors.length === 0
        && this.#callbacks === null
        && this.#inputListenerCleanups.length === 0
        && this.#lifecycleListenerCleanups.size === 0
        && this.#surface.parentNode === null;
      this.#failed = !this.#disposed;
      if (!this.#disposed && errors.length === 0) {
        errors.push(new Error('Arena V2 formal Web pointer surface仍有未完成清理。'));
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Web pointer surface销毁不完整。');
      }
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      this.#disposing = false;
      this.#endOperation(operation);
    }
  }
}

export const ARENA_V2_FORMAL_WEB_POINTER_SURFACE_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  inputConceptCount: 3 as const,
  controlRoleIds: POINTER_CONTROL_ROLE_IDS,
  interactionStateIds: ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1,
  moveAvailabilityStateIds: ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1,
  primaryAvailabilityStateIds: ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1,
  primaryGestureHintIds: ARENA_V2_UI_PRIMARY_GESTURE_HINT_IDS_V1,
  jumpAvailabilityStateIds: ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1,
  visualTokenContractId: ARENA_V2_UI_VISUAL_TOKENS_V1.id,
  visualPressedStateFromSharedTokens: true as const,
  visualPressedRoleBoundToAcceptedPointerStart: true as const,
  visualMoveOriginFromAcceptedRawPointer: true as const,
  visualMoveDirectionFromNormalizedRawPointerDelta: true as const,
  visualMoveFeedbackReadOnly: true as const,
  safeAreaVisualAndHitViewportShared: true as const,
  fixedControlCircleOverlapRejected: true as const,
  visualMovementAvailabilityFromAuthorityCanMove: true as const,
  visualMovementAvailabilityReadOnly: true as const,
  visualMovementBlockedDoesNotDisableInput: true as const,
  visualPrimaryAvailabilityFromAuthoritySceneLocalAction: true as const,
  visualPrimaryAvailabilityReadOnly: true as const,
  visualPrimaryBlockedDoesNotDisableInput: true as const,
  visualPrimaryGestureHintUsesAuthorityCommitmentChargeLevel: true as const,
  visualJumpAvailabilityFromAuthorityMovementCapability: true as const,
  visualJumpAvailabilityReadOnly: true as const,
  visualJumpBlockedDoesNotDisableInput: true as const,
  pointerAndLifecycleCallbacksCommitUnderStickyOperation: true as const,
  swallowedDomInputLifecycleOrObserverReentryFailsClosed: true as const,
  publicVisibilityAndSnapshotReadsRejectOperationMiddleState: true as const,
  inputAndLifecycleCleanupClosuresUseSurfaceOperationGuard: true as const,
  inputListenerPotentialOwnersRecordedBeforeRegistration: true as const,
  lifecycleListenerPotentialOwnersRecordedBeforeRegistration: true as const,
  partialListenerRegistrationRemainsRetryable: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  domInputLifecycleAndObserverCallbacksCheckedBeforeStateCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterOwners: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
  constructionRootRollbackFailureExportsRetryableDebt: true as const,
  constructionRootDebtRetainsDetachedOrMountedSurface: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  pointerEventCallbacksStopAtFirstReentrySequenceChange: true as const,
  idempotentVisibilityAndDisposeCheckReentryBeforeFastPath: true as const,
  directionJumpAndPrimaryOnly: true as const,
  mapsRulesOrCommands: false as const,
  ownsAuthorityState: false as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
});
