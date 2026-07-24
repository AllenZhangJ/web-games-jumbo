import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const PRODUCT_UI_INTENT_ID = Object.freeze({
  BOOT: 'boot',
  START_MATCH: 'start-match',
  OPEN_CHARACTER_SELECT: 'open-character-select',
  CLOSE_CHARACTER_SELECT: 'close-character-select',
  SELECT_CHARACTER: 'select-character',
  REQUEST_MATCH: 'request-match',
  REQUEST_REMATCH: 'request-rematch',
  CONTINUE_REWARD: 'continue-reward',
  DISMISS_UNLOCKS: 'dismiss-unlocks',
  RETRY: 'retry',
} as const);

export type ProductUiIntentId = typeof PRODUCT_UI_INTENT_ID[keyof typeof PRODUCT_UI_INTENT_ID];

export interface ProductUiIntent {
  readonly id: ProductUiIntentId;
  readonly characterDefinitionId: string | null;
}

export const PRODUCT_INPUT_ROUTER_MODE = Object.freeze({
  INACTIVE: 'inactive',
  UI: 'ui',
  GAMEPLAY: 'gameplay',
} as const);

export type ProductInputRouterMode = typeof PRODUCT_INPUT_ROUTER_MODE[
  keyof typeof PRODUCT_INPUT_ROUTER_MODE
];

export const PRODUCT_PRESENTATION_FLOW_STATE = Object.freeze({
  ACTIVE: 'active',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ProductPresentationFlowState = typeof PRODUCT_PRESENTATION_FLOW_STATE[
  keyof typeof PRODUCT_PRESENTATION_FLOW_STATE
];

export const PRODUCT_PRESENTATION_SESSION_STATE = Object.freeze({
  CREATED: 'created',
  STARTING: 'starting',
  RUNNING: 'running',
  PAUSED: 'paused',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ProductPresentationSessionState = typeof PRODUCT_PRESENTATION_SESSION_STATE[
  keyof typeof PRODUCT_PRESENTATION_SESSION_STATE
];

const INTENT_IDS = new Set<string>(Object.values(PRODUCT_UI_INTENT_ID));
const INTENT_KEYS = new Set(['id', 'characterDefinitionId']);

export function assertProductUiIntentId(
  value: unknown,
  name = 'ProductUiIntent.id',
): ProductUiIntentId {
  const id = assertNonEmptyString(value, name);
  if (!INTENT_IDS.has(id)) throw new RangeError(`${name} 不受支持：${id}。`);
  return id as ProductUiIntentId;
}

export function createProductUiIntent(value: unknown): ProductUiIntent {
  const source = cloneFrozenData(value, 'ProductUiIntent');
  assertKnownKeys(source, INTENT_KEYS, 'ProductUiIntent');
  const id = assertProductUiIntentId(source.id);
  const characterDefinitionId = source.characterDefinitionId === undefined
    || source.characterDefinitionId === null
    ? null
    : assertNonEmptyString(
      source.characterDefinitionId,
      'ProductUiIntent.characterDefinitionId',
    );
  if (id === PRODUCT_UI_INTENT_ID.SELECT_CHARACTER && characterDefinitionId === null) {
    throw new RangeError('select-character 意图必须包含 characterDefinitionId。');
  }
  if (id !== PRODUCT_UI_INTENT_ID.SELECT_CHARACTER && characterDefinitionId !== null) {
    throw new RangeError(`${id} 意图不能包含 characterDefinitionId。`);
  }
  return Object.freeze({ id, characterDefinitionId });
}

export function createProductUiIntentKey(value: unknown): string {
  const intent = createProductUiIntent(value);
  return intent.characterDefinitionId === null
    ? intent.id
    : `${intent.id}:${intent.characterDefinitionId}`;
}
