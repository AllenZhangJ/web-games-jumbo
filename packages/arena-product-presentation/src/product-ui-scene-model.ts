import {
  assertIntegerAtLeast,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { isTrustedProductSessionViewModel } from './product-view-model-trust.js';
import { markTrustedProductUiSceneModel } from './product-ui-scene-model-trust.js';

export interface ProductUiSceneAction {
  readonly label: string;
  readonly enabled: boolean;
  readonly intent: Readonly<Record<string, unknown>>;
}

export interface ProductUiSceneCharacterCard {
  readonly id: string;
  readonly name: string;
  readonly previewAssetId: string | null;
  readonly selected: boolean;
  readonly enabled: boolean;
  readonly intent: Readonly<Record<string, unknown>>;
}

export interface ProductUiSceneWeaponStat {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly maxValue: number;
  readonly unit: string;
  readonly direction: string;
  readonly precision: number;
}

export interface ProductUiSceneWeaponCard {
  readonly id: string;
  readonly name: string;
  readonly previewAssetId: string | null;
  readonly role: string;
  readonly description: string;
  readonly coreVerb: string;
  readonly tradeoff: string;
  readonly counterplay: string;
  readonly hitResult: string;
  readonly mapUse: string;
  readonly stats: readonly ProductUiSceneWeaponStat[];
  readonly behaviorStats: readonly ProductUiSceneWeaponStat[];
  readonly contexts: readonly ProductUiSceneWeaponContext[];
}

export interface ProductUiSceneWeaponContext {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly stats: readonly ProductUiSceneWeaponStat[];
}

export interface ProductUiSceneWeaponComparisonValue {
  readonly weaponId: string;
  readonly weaponName: string;
  readonly value: number;
  readonly maxValue: number;
  readonly unit: string;
  readonly direction: string;
  readonly precision: number;
}

export interface ProductUiSceneWeaponComparisonRow {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly values: readonly ProductUiSceneWeaponComparisonValue[];
}

export interface ProductUiSceneModel {
  readonly revision: number;
  readonly locale: string;
  readonly scene: string;
  readonly gameplay: boolean;
  readonly busy: boolean;
  readonly terminal: boolean;
  readonly inputEnabled: boolean;
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly announcement: string;
  readonly primaryAction: ProductUiSceneAction | null;
  readonly secondaryAction: ProductUiSceneAction | null;
  readonly selectedCharacter: Readonly<{
    id: string;
    name: string;
    previewAssetId: string | null;
  }> | null;
  readonly opponentName: string;
  readonly characterCards: readonly ProductUiSceneCharacterCard[];
  readonly weaponCards: readonly ProductUiSceneWeaponCard[];
  readonly weaponComparison: readonly ProductUiSceneWeaponComparisonRow[];
  readonly outcome: string | null;
  readonly experienceDelta: number | null;
  readonly unlock: Readonly<{
    kind: string;
    id: string;
    name: string;
    previewAssetId: string | null;
  }> | null;
  readonly errorMessage: string;
}

const KICKER_BY_SCENE: Readonly<Record<string, string>> = Object.freeze({
  loading: 'ARENA LINK',
  home: 'QUICK MATCH',
  'character-select': 'LOADOUT',
  matching: 'MATCH LINK',
  gameplay: 'LIVE ARENA',
  result: 'MATCH REPORT',
  reward: 'MATCH REPORT',
  unlock: 'NEW DROP',
  'recoverable-error': 'RECOVERY',
  'fatal-error': 'SYSTEM NOTICE',
  destroyed: 'SESSION CLOSED',
});

const frozenViewModelCache = new WeakMap<object, ProductUiSceneModel>();

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function nullableString(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null;
  return assertNonEmptyString(value, name);
}

function optionalText(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new TypeError(`${name} 必须是字符串。`);
  return value;
}

function finiteNumber(value: unknown, name: string, minimum: number): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}

function dataRecord(value: unknown, name: string): PlainRecord {
  return assertPlainRecord(value, name);
}

function actionView(value: unknown, name: string): ProductUiSceneAction | null {
  if (value === null || value === undefined) return null;
  const action = dataRecord(value, name);
  return Object.freeze({
    label: assertNonEmptyString(action.label, `${name}.label`),
    enabled: booleanValue(action.enabled, `${name}.enabled`),
    intent: dataRecord(action.intent, `${name}.intent`),
  });
}

function characterCards(
  values: unknown,
  inputEnabled: boolean,
): readonly ProductUiSceneCharacterCard[] {
  if (!Array.isArray(values)) {
    throw new TypeError('Product UI ViewModel.characterOptions 必须是数组。');
  }
  const ids = new Set<string>();
  const cards = values.map((value, index) => {
    const name = `Product UI ViewModel.characterOptions[${index}]`;
    const option = dataRecord(value, name);
    const id = assertNonEmptyString(option.characterDefinitionId, `${name}.characterDefinitionId`);
    if (ids.has(id)) throw new RangeError(`Product UI ViewModel 包含重复角色 ${id}。`);
    ids.add(id);
    return Object.freeze({
      id,
      name: assertNonEmptyString(option.name, `${name}.name`),
      previewAssetId: nullableString(option.previewAssetId, `${name}.previewAssetId`),
      selected: booleanValue(option.selected, `${name}.selected`),
      enabled: inputEnabled,
      intent: dataRecord(option.selectIntent, `${name}.selectIntent`),
    });
  });
  if (cards.filter(({ selected }) => selected).length > 1) {
    throw new RangeError('Product UI ViewModel 不能同时选择多个角色。');
  }
  return Object.freeze(cards);
}

function weaponStats(values: unknown, name: string): readonly ProductUiSceneWeaponStat[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError(`${name}.stats 必须是非空数组。`);
  }
  const statIds = new Set<string>();
  return Object.freeze(values.map((statValue, statIndex) => {
    const statName = `${name}.stats[${statIndex}]`;
    const stat = dataRecord(statValue, statName);
    const statId = assertNonEmptyString(stat.id, `${statName}.id`);
    if (statIds.has(statId)) throw new RangeError(`${name} 包含重复数值 ${statId}。`);
    statIds.add(statId);
    const valueNumber = finiteNumber(stat.value, `${statName}.value`, 0);
    const maxValue = finiteNumber(stat.maxValue, `${statName}.maxValue`, 0);
    if (maxValue <= 0 || valueNumber > maxValue) {
      throw new RangeError(`${statName} 的数值范围无效。`);
    }
    return Object.freeze({
      id: statId,
      label: assertNonEmptyString(stat.label, `${statName}.label`),
      value: valueNumber,
      maxValue,
      unit: assertNonEmptyString(stat.unit, `${statName}.unit`),
      direction: assertNonEmptyString(stat.direction, `${statName}.direction`),
      precision: assertIntegerAtLeast(stat.precision, 0, `${statName}.precision`),
    });
  }));
}

function optionalWeaponStats(
  values: unknown,
  name: string,
): readonly ProductUiSceneWeaponStat[] {
  if (values === undefined || values === null) return Object.freeze([]);
  return weaponStats(values, name);
}

function weaponContexts(values: unknown, name: string): readonly ProductUiSceneWeaponContext[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError(`${name}.contexts 必须是非空数组。`);
  }
  const contextIds = new Set<string>();
  return Object.freeze(values.map((value, index) => {
    const contextName = `${name}.contexts[${index}]`;
    const context = dataRecord(value, contextName);
    const id = assertNonEmptyString(context.id, `${contextName}.id`);
    if (contextIds.has(id)) throw new RangeError(`${name} 包含重复上下文 ${id}。`);
    contextIds.add(id);
    return Object.freeze({
      id,
      label: assertNonEmptyString(context.label, `${contextName}.label`),
      summary: assertNonEmptyString(context.summary, `${contextName}.summary`),
      stats: weaponStats(context.stats, contextName),
    });
  }));
}

function weaponCards(values: unknown): readonly ProductUiSceneWeaponCard[] {
  if (values === undefined || values === null) return Object.freeze([]);
  if (!Array.isArray(values)) {
    throw new TypeError('Product UI ViewModel.weaponOptions 必须是数组。');
  }
  const ids = new Set<string>();
  return Object.freeze(values.map((value, index) => {
    const name = `Product UI ViewModel.weaponOptions[${index}]`;
    const option = dataRecord(value, name);
    const id = assertNonEmptyString(option.weaponDefinitionId, `${name}.weaponDefinitionId`);
    if (ids.has(id)) throw new RangeError(`Product UI ViewModel 包含重复武器 ${id}。`);
    ids.add(id);
    return Object.freeze({
      id,
      name: assertNonEmptyString(option.name, `${name}.name`),
      previewAssetId: nullableString(option.previewAssetId, `${name}.previewAssetId`),
      role: assertNonEmptyString(option.role, `${name}.role`),
      description: assertNonEmptyString(option.description, `${name}.description`),
      coreVerb: assertNonEmptyString(option.coreVerb, `${name}.coreVerb`),
      tradeoff: assertNonEmptyString(option.tradeoff, `${name}.tradeoff`),
      counterplay: assertNonEmptyString(option.counterplay, `${name}.counterplay`),
      hitResult: assertNonEmptyString(option.hitResult, `${name}.hitResult`),
      mapUse: assertNonEmptyString(option.mapUse, `${name}.mapUse`),
      stats: weaponStats(option.stats, name),
      behaviorStats: optionalWeaponStats(option.behaviorStats, `${name}.behaviorStats`),
      contexts: weaponContexts(option.contexts, name),
    });
  }));
}

function weaponComparison(
  cards: readonly ProductUiSceneWeaponCard[],
): readonly ProductUiSceneWeaponComparisonRow[] {
  if (cards.length === 0) return Object.freeze([]);
  const referenceStats = cards[0]!.stats;
  for (const card of cards.slice(1)) {
    if (
      card.stats.length !== referenceStats.length
      || referenceStats.some(({ id }) => !card.stats.some((stat) => stat.id === id))
    ) {
      throw new RangeError('Product UI 武器比较要求所有武器使用同一组公开数值。');
    }
  }
  return Object.freeze(referenceStats.map((referenceStat) => Object.freeze({
    id: referenceStat.id,
    label: referenceStat.label,
    unit: referenceStat.unit,
    values: Object.freeze(cards.map((card) => {
      const stat = card.stats.find(({ id }) => id === referenceStat.id);
      if (!stat) throw new RangeError(`Product UI 武器比较缺少数值 ${referenceStat.id}。`);
      if (stat.unit !== referenceStat.unit) {
        throw new RangeError(`Product UI 武器比较的 ${referenceStat.id} 单位不一致。`);
      }
      if (stat.direction !== referenceStat.direction) {
        throw new RangeError(`Product UI 武器比较的 ${referenceStat.id} 方向语义不一致。`);
      }
      if (stat.maxValue !== referenceStat.maxValue) {
        throw new RangeError(`Product UI 武器比较的 ${referenceStat.id} 尺度不一致。`);
      }
      return Object.freeze({
        weaponId: card.id,
        weaponName: card.name,
        value: stat.value,
        maxValue: stat.maxValue,
        unit: stat.unit,
        direction: stat.direction,
        precision: stat.precision,
      });
    })),
  })));
}

function selectedCharacter(
  cards: readonly ProductUiSceneCharacterCard[],
): ProductUiSceneModel['selectedCharacter'] {
  const selected = cards.find((card) => card.selected) ?? cards[0] ?? null;
  return selected === null ? null : Object.freeze({
    id: selected.id,
    name: selected.name,
    previewAssetId: selected.previewAssetId,
  });
}

function unlockView(values: unknown): ProductUiSceneModel['unlock'] {
  if (!Array.isArray(values)) throw new TypeError('Product UI ViewModel.unlocks 必须是数组。');
  if (values.length === 0) return null;
  const unlock = dataRecord(values[0], 'Product UI ViewModel.unlocks[0]');
  return Object.freeze({
    kind: assertNonEmptyString(unlock.kind, 'Product UI ViewModel.unlocks[0].kind'),
    id: assertNonEmptyString(unlock.contentId, 'Product UI ViewModel.unlocks[0].contentId'),
    name: assertNonEmptyString(unlock.name, 'Product UI ViewModel.unlocks[0].name'),
    previewAssetId: nullableString(
      unlock.previewAssetId,
      'Product UI ViewModel.unlocks[0].previewAssetId',
    ),
  });
}

export function createProductUiSceneModel(viewModelValue: unknown): ProductUiSceneModel {
  if (isTrustedProductSessionViewModel(viewModelValue)) {
    const cached = frozenViewModelCache.get(viewModelValue);
    if (cached) return cached;
  }
  const source = dataRecord(
    cloneFrozenData(viewModelValue, 'Product UI ViewModel'),
    'Product UI ViewModel',
  );
  const screen = dataRecord(source.screen, 'Product UI ViewModel.screen');
  const scene = assertNonEmptyString(screen.sceneId, 'Product UI ViewModel.screen.sceneId');
  const inputEnabled = booleanValue(source.inputEnabled, 'Product UI ViewModel.inputEnabled');
  const cards = characterCards(source.characterOptions, inputEnabled);
  const weapons = weaponCards(source.weaponOptions);
  const match = source.match === null || source.match === undefined
    ? null
    : dataRecord(source.match, 'Product UI ViewModel.match');
  const opponent = match === null
    ? null
    : dataRecord(match.opponent, 'Product UI ViewModel.match.opponent');
  const result = source.result === null || source.result === undefined
    ? null
    : dataRecord(source.result, 'Product UI ViewModel.result');
  const reward = source.reward === null || source.reward === undefined
    ? null
    : dataRecord(source.reward, 'Product UI ViewModel.reward');
  const error = source.error === null || source.error === undefined
    ? null
    : dataRecord(source.error, 'Product UI ViewModel.error');
  const busy = booleanValue(source.busy, 'Product UI ViewModel.busy');
  const suspended = booleanValue(source.suspended, 'Product UI ViewModel.suspended');
  const experienceDelta = reward === null
    ? null
    : assertIntegerAtLeast(
      reward.experienceDelta,
      0,
      'Product UI ViewModel.reward.experienceDelta',
    );
  const model: ProductUiSceneModel = markTrustedProductUiSceneModel(Object.freeze({
    revision: assertIntegerAtLeast(source.revision, 0, 'Product UI ViewModel.revision'),
    locale: assertNonEmptyString(source.locale, 'Product UI ViewModel.locale'),
    scene,
    gameplay: scene === 'gameplay',
    busy: busy || suspended,
    terminal: booleanValue(source.terminal, 'Product UI ViewModel.terminal'),
    inputEnabled,
    kicker: KICKER_BY_SCENE[scene] ?? 'ABYSS ARENA',
    title: assertNonEmptyString(screen.title, 'Product UI ViewModel.screen.title'),
    body: optionalText(screen.body, 'Product UI ViewModel.screen.body') ?? '',
    announcement: assertNonEmptyString(
      screen.announcement,
      'Product UI ViewModel.screen.announcement',
    ),
    primaryAction: actionView(screen.primaryAction, 'Product UI ViewModel.screen.primaryAction'),
    secondaryAction: actionView(
      screen.secondaryAction,
      'Product UI ViewModel.screen.secondaryAction',
    ),
    selectedCharacter: selectedCharacter(cards),
    opponentName: opponent === null
      ? '神秘挑战者'
      : assertNonEmptyString(
        opponent.displayName,
        'Product UI ViewModel.match.opponent.displayName',
      ),
    characterCards: cards,
    weaponCards: weapons,
    weaponComparison: weaponComparison(weapons),
    outcome: result === null
      ? null
      : assertNonEmptyString(result.outcome, 'Product UI ViewModel.result.outcome'),
    experienceDelta,
    unlock: unlockView(source.unlocks),
    errorMessage: error === null
      ? ''
      : optionalText(error.message, 'Product UI ViewModel.error.message') ?? '',
  }));
  if (isTrustedProductSessionViewModel(viewModelValue)) {
    frozenViewModelCache.set(viewModelValue, model);
  }
  return model;
}
