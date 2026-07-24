import { assertIntegerAtLeast, assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import type { PlainRecord } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_REGRESSION_COMPONENT_ID,
  createArenaStage9RegressionEvidenceV1Definition,
  type ArenaRegressionComponentDefinition,
} from './arena-stage9-regression-evidence-v1.js';
import {
  assertArenaRegressionSafeInteger,
  assertArenaRegressionText,
  cloneArenaRegressionIntegerRecord,
} from './arena-regression-evidence-validation.js';

const DEFINITION = createArenaStage9RegressionEvidenceV1Definition();
const INPUT_FUZZ_KEYS: ReadonlySet<string> = new Set([
  'id', 'matchesPerMapper', 'totalMatches', 'replaySamplesPerMapper', 'verifiedReplays',
  'uniqueFinalHashes', 'mappers', 'operations', 'frameCounts',
]);
const INPUT_MAPPER_KEYS: ReadonlySet<string> = new Set(['id', 'matches', 'uniqueFinalHashes', 'replayChecks']);
const LIFECYCLE_KEYS: ReadonlySet<string> = new Set([
  'id', 'testFileCount', 'testCount', 'passCount', 'failCount', 'cancelledCount', 'skippedCount', 'todoCount',
]);
const PRESENTATION_SOAK_KEYS: ReadonlySet<string> = new Set([
  'id', 'matches', 'uniqueMatchSeeds', 'heapGrowthBytes', 'heapGrowthBudgetBytes',
  'remainingFrames', 'remainingLifecycleListeners', 'remainingCanvasListeners', 'inputBound', 'diagnostics',
]);
const PRODUCT_PRESENTATION_SOAK_KEYS: ReadonlySet<string> = new Set([
  ...PRESENTATION_SOAK_KEYS, 'ok', 'uniqueAuthorityHashes',
]);
const PRODUCT_STRESS_KEYS: ReadonlySet<string> = new Set([
  'id', 'ok', 'matches', 'authorityHashCount', 'contentHashCount', 'lifecycleTransitions',
  'rematches', 'maximumTicks', 'restarts', 'experience', 'latestGrantId',
]);

function definitionComponent(id: string): Readonly<ArenaRegressionComponentDefinition> {
  const component = DEFINITION.components.find((value) => value.id === id);
  if (!component) throw new RangeError(`未知 Regression component ${id}。`);
  return component;
}
function requiredNumber(value: number | undefined, name: string): number {
  if (value === undefined) throw new Error(`${name} 未在 Definition 中配置。`);
  return value;
}
function requiredStrings(value: readonly string[] | undefined, name: string): readonly string[] {
  if (!value) throw new Error(`${name} 未在 Definition 中配置。`);
  return value;
}

function cloneInputFuzz(value: unknown): Readonly<PlainRecord> {
  const name = 'ArenaRegressionEvidence.components.input-fuzz';
  assertKnownKeys(value, INPUT_FUZZ_KEYS, name);
  const definition = definitionComponent(ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ);
  const mapperIds = requiredStrings(definition.mapperIds, `${name}.mapperIds`);
  const definitionMatches = requiredNumber(definition.matchesPerMapper, `${name}.matchesPerMapper`);
  const definitionReplaySamples = requiredNumber(
    definition.replaySamplesPerMapper,
    `${name}.replaySamplesPerMapper`,
  );
  if (!Array.isArray(value.mappers)) throw new TypeError(`${name}.mappers 必须是数组。`);
  const mappers = value.mappers.map((mapper, index) => {
    const mapperName = `${name}.mappers[${index}]`;
    assertKnownKeys(mapper, INPUT_MAPPER_KEYS, mapperName);
    return Object.freeze({
      id: assertArenaRegressionText(mapper.id, `${mapperName}.id`),
      matches: assertIntegerAtLeast(mapper.matches, 0, `${mapperName}.matches`),
      uniqueFinalHashes: assertIntegerAtLeast(mapper.uniqueFinalHashes, 0, `${mapperName}.uniqueFinalHashes`),
      replayChecks: assertIntegerAtLeast(mapper.replayChecks, 0, `${mapperName}.replayChecks`),
    });
  }).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const matchesPerMapper = assertIntegerAtLeast(value.matchesPerMapper, 0, `${name}.matchesPerMapper`);
  const totalMatches = assertIntegerAtLeast(value.totalMatches, 0, `${name}.totalMatches`);
  const replaySamplesPerMapper = assertIntegerAtLeast(value.replaySamplesPerMapper, 0, `${name}.replaySamplesPerMapper`);
  const verifiedReplays = assertIntegerAtLeast(value.verifiedReplays, 0, `${name}.verifiedReplays`);
  const uniqueFinalHashes = assertIntegerAtLeast(value.uniqueFinalHashes, 0, `${name}.uniqueFinalHashes`);
  if (
    value.id !== definition.id || matchesPerMapper !== definitionMatches
    || replaySamplesPerMapper !== definitionReplaySamples
    || totalMatches !== definitionMatches * mapperIds.length
    || verifiedReplays !== definitionReplaySamples * mapperIds.length
    || uniqueFinalHashes !== totalMatches || mappers.length !== mapperIds.length
    || mappers.some((mapper, index) => (
      mapper.id !== mapperIds[index] || mapper.matches !== definitionMatches
      || mapper.uniqueFinalHashes !== mapper.matches || mapper.replayChecks !== definitionReplaySamples
    ))
  ) throw new Error('Input fuzz evidence 未达到固定 V1 门限。');
  return Object.freeze({
    id: definition.id,
    matchesPerMapper: definitionMatches,
    totalMatches,
    replaySamplesPerMapper: definitionReplaySamples,
    verifiedReplays,
    uniqueFinalHashes,
    mappers: Object.freeze(mappers),
    operations: cloneArenaRegressionIntegerRecord(value.operations, `${name}.operations`),
    frameCounts: cloneArenaRegressionIntegerRecord(value.frameCounts, `${name}.frameCounts`),
  });
}

function cloneLifecycle(value: unknown): Readonly<PlainRecord> {
  const name = 'ArenaRegressionEvidence.components.lifecycle-tests';
  assertKnownKeys(value, LIFECYCLE_KEYS, name);
  const definition = definitionComponent(ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS);
  const testFiles = requiredStrings(definition.testFiles, `${name}.testFiles`);
  const result = Object.freeze({
    id: value.id,
    testFileCount: assertIntegerAtLeast(value.testFileCount, 0, `${name}.testFileCount`),
    testCount: assertIntegerAtLeast(value.testCount, 0, `${name}.testCount`),
    passCount: assertIntegerAtLeast(value.passCount, 0, `${name}.passCount`),
    failCount: assertIntegerAtLeast(value.failCount, 0, `${name}.failCount`),
    cancelledCount: assertIntegerAtLeast(value.cancelledCount, 0, `${name}.cancelledCount`),
    skippedCount: assertIntegerAtLeast(value.skippedCount, 0, `${name}.skippedCount`),
    todoCount: assertIntegerAtLeast(value.todoCount, 0, `${name}.todoCount`),
  });
  if (
    result.id !== definition.id || result.testFileCount !== testFiles.length || result.testCount < 1
    || result.passCount !== result.testCount || result.failCount !== 0 || result.cancelledCount !== 0
    || result.skippedCount !== 0 || result.todoCount !== 0
  ) throw new Error('Lifecycle regression evidence 未全部通过。');
  return result;
}

function clonePresentationSoak(value: unknown, product: boolean): Readonly<PlainRecord> {
  const id = product
    ? ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK
    : ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK;
  const name = `ArenaRegressionEvidence.components.${id}`;
  assertKnownKeys(value, product ? PRODUCT_PRESENTATION_SOAK_KEYS : PRESENTATION_SOAK_KEYS, name);
  const definition = definitionComponent(id);
  const matches = assertIntegerAtLeast(value.matches, 0, `${name}.matches`);
  const uniqueMatchSeeds = assertIntegerAtLeast(value.uniqueMatchSeeds, 0, `${name}.uniqueMatchSeeds`);
  const heapGrowthBytes = assertArenaRegressionSafeInteger(value.heapGrowthBytes, `${name}.heapGrowthBytes`);
  const heapGrowthBudgetBytes = assertIntegerAtLeast(value.heapGrowthBudgetBytes, 1, `${name}.heapGrowthBudgetBytes`);
  const remainingFrames = assertIntegerAtLeast(value.remainingFrames, 0, `${name}.remainingFrames`);
  const remainingLifecycleListeners = assertIntegerAtLeast(value.remainingLifecycleListeners, 0, `${name}.remainingLifecycleListeners`);
  const remainingCanvasListeners = assertIntegerAtLeast(value.remainingCanvasListeners, 0, `${name}.remainingCanvasListeners`);
  const diagnostics = assertIntegerAtLeast(value.diagnostics, 0, `${name}.diagnostics`);
  const uniqueAuthorityHashes = product
    ? assertIntegerAtLeast(value.uniqueAuthorityHashes, 0, `${name}.uniqueAuthorityHashes`)
    : null;
  if (
    value.id !== definition.id || matches !== requiredNumber(definition.matches, `${name}.matches`)
    || uniqueMatchSeeds !== matches
    || heapGrowthBudgetBytes !== requiredNumber(definition.heapGrowthBudgetBytes, `${name}.heapGrowthBudgetBytes`)
    || heapGrowthBytes > heapGrowthBudgetBytes || remainingFrames !== 0
    || remainingLifecycleListeners !== 0 || remainingCanvasListeners !== 0 || value.inputBound !== false
    || (product && (value.ok !== true || uniqueAuthorityHashes !== matches))
  ) throw new Error(`${id} evidence 未达到固定 V1 门限。`);
  return Object.freeze({
    id: definition.id,
    matches,
    uniqueMatchSeeds,
    heapGrowthBytes,
    heapGrowthBudgetBytes,
    remainingFrames,
    remainingLifecycleListeners,
    remainingCanvasListeners,
    inputBound: false,
    diagnostics,
    ...(product ? { ok: true, uniqueAuthorityHashes } : {}),
  });
}

function cloneProductStress(value: unknown): Readonly<PlainRecord> {
  const name = 'ArenaRegressionEvidence.components.product-session-stress';
  assertKnownKeys(value, PRODUCT_STRESS_KEYS, name);
  const definition = definitionComponent(ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS);
  const result = Object.freeze({
    id: value.id,
    ok: value.ok,
    matches: assertIntegerAtLeast(value.matches, 0, `${name}.matches`),
    authorityHashCount: assertIntegerAtLeast(value.authorityHashCount, 0, `${name}.authorityHashCount`),
    contentHashCount: assertIntegerAtLeast(value.contentHashCount, 0, `${name}.contentHashCount`),
    lifecycleTransitions: assertIntegerAtLeast(value.lifecycleTransitions, 0, `${name}.lifecycleTransitions`),
    rematches: assertIntegerAtLeast(value.rematches, 0, `${name}.rematches`),
    maximumTicks: assertIntegerAtLeast(value.maximumTicks, 0, `${name}.maximumTicks`),
    restarts: assertIntegerAtLeast(value.restarts, 0, `${name}.restarts`),
    experience: assertIntegerAtLeast(value.experience, 0, `${name}.experience`),
    latestGrantId: assertArenaRegressionText(value.latestGrantId, `${name}.latestGrantId`),
  });
  if (
    result.id !== definition.id || result.ok !== true
    || result.matches !== requiredNumber(definition.matches, `${name}.matches`)
    || result.authorityHashCount !== result.matches || result.contentHashCount < 1
  ) throw new Error('Product Session stress evidence 未达到固定 V1 门限。');
  return result;
}

export function cloneArenaRegressionEvidenceComponents(values: unknown): readonly Readonly<PlainRecord>[] {
  if (!Array.isArray(values) || values.length !== DEFINITION.components.length) {
    throw new RangeError('ArenaRegressionEvidence.components 必须精确覆盖 V1 Definition。');
  }
  const byId = new Map<string, unknown>();
  for (const value of values) {
    assertKnownKeys(value, new Set(Reflect.ownKeys(value as object).filter((key): key is string => typeof key === 'string')), 'ArenaRegressionEvidence component');
    if (typeof value.id !== 'string') throw new TypeError('ArenaRegressionEvidence component 必须包含 id。');
    if (byId.has(value.id)) throw new RangeError(`重复 Regression component ${value.id}。`);
    byId.set(value.id, value);
  }
  return Object.freeze(DEFINITION.components.map(({ id }) => {
    const value = byId.get(id);
    if (!value) throw new RangeError(`缺少 Regression component ${id}。`);
    if (id === ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ) return cloneInputFuzz(value);
    if (id === ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS) return cloneLifecycle(value);
    if (id === ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK) return clonePresentationSoak(value, false);
    if (id === ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK) return clonePresentationSoak(value, true);
    return cloneProductStress(value);
  }));
}
