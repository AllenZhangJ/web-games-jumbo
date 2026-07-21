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
});

const INTENT_IDS = new Set(Object.values(PRODUCT_UI_INTENT_ID));
const INTENT_KEYS = new Set(['id', 'characterDefinitionId']);

export function assertProductUiIntentId(value, name = 'ProductUiIntent.id') {
  const id = assertNonEmptyString(value, name);
  if (!INTENT_IDS.has(id)) throw new RangeError(`${name} 不受支持：${id}。`);
  return id;
}

export function createProductUiIntent(value) {
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
  if (
    id === PRODUCT_UI_INTENT_ID.SELECT_CHARACTER
    && characterDefinitionId === null
  ) {
    throw new RangeError('select-character 意图必须包含 characterDefinitionId。');
  }
  if (
    id !== PRODUCT_UI_INTENT_ID.SELECT_CHARACTER
    && characterDefinitionId !== null
  ) {
    throw new RangeError(`${id} 意图不能包含 characterDefinitionId。`);
  }
  return Object.freeze({ id, characterDefinitionId });
}

export function createProductUiIntentKey(value) {
  const intent = createProductUiIntent(value);
  return `${intent.id}:${intent.characterDefinitionId ?? ''}`;
}
