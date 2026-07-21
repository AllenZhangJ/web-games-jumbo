import {
  assertIntegerAtLeast,
  assertKnownKeys,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_REGRESSION_COMPONENT_ID,
  createArenaStage9RegressionEvidenceV1Definition,
} from './arena-stage9-regression-evidence-v1.js';
import {
  assertArenaRegressionSafeInteger,
  assertArenaRegressionText,
  cloneArenaRegressionIntegerRecord,
} from './arena-regression-evidence-validation.js';

const DEFINITION = createArenaStage9RegressionEvidenceV1Definition();
const INPUT_FUZZ_KEYS = new Set([
  'id',
  'matchesPerMapper',
  'totalMatches',
  'replaySamplesPerMapper',
  'verifiedReplays',
  'uniqueFinalHashes',
  'mappers',
  'operations',
  'frameCounts',
]);
const INPUT_MAPPER_KEYS = new Set(['id', 'matches', 'uniqueFinalHashes', 'replayChecks']);
const LIFECYCLE_KEYS = new Set([
  'id',
  'testFileCount',
  'testCount',
  'passCount',
  'failCount',
  'cancelledCount',
  'skippedCount',
  'todoCount',
]);
const PRESENTATION_SOAK_KEYS = new Set([
  'id',
  'matches',
  'uniqueMatchSeeds',
  'heapGrowthBytes',
  'heapGrowthBudgetBytes',
  'remainingFrames',
  'remainingLifecycleListeners',
  'remainingCanvasListeners',
  'inputBound',
  'diagnostics',
]);
const PRODUCT_PRESENTATION_SOAK_KEYS = new Set([
  ...PRESENTATION_SOAK_KEYS,
  'ok',
  'uniqueAuthorityHashes',
]);
const PRODUCT_STRESS_KEYS = new Set([
  'id',
  'ok',
  'matches',
  'authorityHashCount',
  'contentHashCount',
  'lifecycleTransitions',
  'rematches',
  'maximumTicks',
  'restarts',
  'experience',
  'latestGrantId',
]);

function definitionComponent(id) {
  const component = DEFINITION.components.find((value) => value.id === id);
  if (!component) throw new RangeError(`未知 Regression component ${id}。`);
  return component;
}

function cloneInputFuzz(value) {
  const name = 'ArenaRegressionEvidence.components.input-fuzz';
  assertKnownKeys(value, INPUT_FUZZ_KEYS, name);
  const definition = definitionComponent(ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ);
  if (!Array.isArray(value.mappers)) throw new TypeError(`${name}.mappers 必须是数组。`);
  const mappers = value.mappers.map((mapper, index) => {
    const mapperName = `${name}.mappers[${index}]`;
    assertKnownKeys(mapper, INPUT_MAPPER_KEYS, mapperName);
    return Object.freeze({
      id: assertArenaRegressionText(mapper.id, `${mapperName}.id`),
      matches: assertIntegerAtLeast(mapper.matches, 0, `${mapperName}.matches`),
      uniqueFinalHashes: assertIntegerAtLeast(
        mapper.uniqueFinalHashes,
        0,
        `${mapperName}.uniqueFinalHashes`,
      ),
      replayChecks: assertIntegerAtLeast(mapper.replayChecks, 0, `${mapperName}.replayChecks`),
    });
  }).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const matchesPerMapper = assertIntegerAtLeast(
    value.matchesPerMapper,
    0,
    `${name}.matchesPerMapper`,
  );
  const totalMatches = assertIntegerAtLeast(value.totalMatches, 0, `${name}.totalMatches`);
  const replaySamplesPerMapper = assertIntegerAtLeast(
    value.replaySamplesPerMapper,
    0,
    `${name}.replaySamplesPerMapper`,
  );
  const verifiedReplays = assertIntegerAtLeast(
    value.verifiedReplays,
    0,
    `${name}.verifiedReplays`,
  );
  const uniqueFinalHashes = assertIntegerAtLeast(
    value.uniqueFinalHashes,
    0,
    `${name}.uniqueFinalHashes`,
  );
  if (
    value.id !== definition.id
    || matchesPerMapper !== definition.matchesPerMapper
    || replaySamplesPerMapper !== definition.replaySamplesPerMapper
    || totalMatches !== definition.matchesPerMapper * definition.mapperIds.length
    || verifiedReplays !== definition.replaySamplesPerMapper * definition.mapperIds.length
    || uniqueFinalHashes !== totalMatches
    || mappers.length !== definition.mapperIds.length
    || mappers.some((mapper, index) => (
      mapper.id !== definition.mapperIds[index]
      || mapper.matches !== definition.matchesPerMapper
      || mapper.uniqueFinalHashes !== mapper.matches
      || mapper.replayChecks !== definition.replaySamplesPerMapper
    ))
  ) throw new Error('Input fuzz evidence 未达到固定 V1 门限。');
  return Object.freeze({
    id: definition.id,
    matchesPerMapper: definition.matchesPerMapper,
    totalMatches,
    replaySamplesPerMapper: definition.replaySamplesPerMapper,
    verifiedReplays,
    uniqueFinalHashes,
    mappers: Object.freeze(mappers),
    operations: cloneArenaRegressionIntegerRecord(value.operations, `${name}.operations`),
    frameCounts: cloneArenaRegressionIntegerRecord(value.frameCounts, `${name}.frameCounts`),
  });
}

function cloneLifecycle(value) {
  const name = 'ArenaRegressionEvidence.components.lifecycle-tests';
  assertKnownKeys(value, LIFECYCLE_KEYS, name);
  const definition = definitionComponent(ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS);
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
    result.id !== definition.id
    || result.testFileCount !== definition.testFiles.length
    || result.testCount < 1
    || result.passCount !== result.testCount
    || result.failCount !== 0
    || result.cancelledCount !== 0
    || result.skippedCount !== 0
    || result.todoCount !== 0
  ) throw new Error('Lifecycle regression evidence 未全部通过。');
  return result;
}

function clonePresentationSoak(value, product) {
  const id = product
    ? ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK
    : ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK;
  const name = `ArenaRegressionEvidence.components.${id}`;
  assertKnownKeys(value, product ? PRODUCT_PRESENTATION_SOAK_KEYS : PRESENTATION_SOAK_KEYS, name);
  const definition = definitionComponent(id);
  const result = {
    id: value.id,
    matches: assertIntegerAtLeast(value.matches, 0, `${name}.matches`),
    uniqueMatchSeeds: assertIntegerAtLeast(value.uniqueMatchSeeds, 0, `${name}.uniqueMatchSeeds`),
    heapGrowthBytes: assertArenaRegressionSafeInteger(
      value.heapGrowthBytes,
      `${name}.heapGrowthBytes`,
    ),
    heapGrowthBudgetBytes: assertIntegerAtLeast(
      value.heapGrowthBudgetBytes,
      1,
      `${name}.heapGrowthBudgetBytes`,
    ),
    remainingFrames: assertIntegerAtLeast(value.remainingFrames, 0, `${name}.remainingFrames`),
    remainingLifecycleListeners: assertIntegerAtLeast(
      value.remainingLifecycleListeners,
      0,
      `${name}.remainingLifecycleListeners`,
    ),
    remainingCanvasListeners: assertIntegerAtLeast(
      value.remainingCanvasListeners,
      0,
      `${name}.remainingCanvasListeners`,
    ),
    inputBound: value.inputBound,
    diagnostics: assertIntegerAtLeast(value.diagnostics, 0, `${name}.diagnostics`),
  };
  if (product) {
    result.ok = value.ok;
    result.uniqueAuthorityHashes = assertIntegerAtLeast(
      value.uniqueAuthorityHashes,
      0,
      `${name}.uniqueAuthorityHashes`,
    );
  }
  if (
    result.id !== definition.id
    || result.matches !== definition.matches
    || result.uniqueMatchSeeds !== result.matches
    || result.heapGrowthBudgetBytes !== definition.heapGrowthBudgetBytes
    || result.heapGrowthBytes > result.heapGrowthBudgetBytes
    || result.remainingFrames !== 0
    || result.remainingLifecycleListeners !== 0
    || result.remainingCanvasListeners !== 0
    || result.inputBound !== false
    || (product && (result.ok !== true || result.uniqueAuthorityHashes !== result.matches))
  ) throw new Error(`${id} evidence 未达到固定 V1 门限。`);
  return Object.freeze(result);
}

function cloneProductStress(value) {
  const name = 'ArenaRegressionEvidence.components.product-session-stress';
  assertKnownKeys(value, PRODUCT_STRESS_KEYS, name);
  const definition = definitionComponent(ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS);
  const result = Object.freeze({
    id: value.id,
    ok: value.ok,
    matches: assertIntegerAtLeast(value.matches, 0, `${name}.matches`),
    authorityHashCount: assertIntegerAtLeast(
      value.authorityHashCount,
      0,
      `${name}.authorityHashCount`,
    ),
    contentHashCount: assertIntegerAtLeast(value.contentHashCount, 0, `${name}.contentHashCount`),
    lifecycleTransitions: assertIntegerAtLeast(
      value.lifecycleTransitions,
      0,
      `${name}.lifecycleTransitions`,
    ),
    rematches: assertIntegerAtLeast(value.rematches, 0, `${name}.rematches`),
    maximumTicks: assertIntegerAtLeast(value.maximumTicks, 0, `${name}.maximumTicks`),
    restarts: assertIntegerAtLeast(value.restarts, 0, `${name}.restarts`),
    experience: assertIntegerAtLeast(value.experience, 0, `${name}.experience`),
    latestGrantId: assertArenaRegressionText(value.latestGrantId, `${name}.latestGrantId`),
  });
  if (
    result.id !== definition.id
    || result.ok !== true
    || result.matches !== definition.matches
    || result.authorityHashCount !== result.matches
    || result.contentHashCount < 1
  ) throw new Error('Product Session stress evidence 未达到固定 V1 门限。');
  return result;
}

export function cloneArenaRegressionEvidenceComponents(values) {
  if (!Array.isArray(values) || values.length !== DEFINITION.components.length) {
    throw new RangeError('ArenaRegressionEvidence.components 必须精确覆盖 V1 Definition。');
  }
  const byId = new Map();
  for (const value of values) {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string') {
      throw new TypeError('ArenaRegressionEvidence component 必须包含 id。');
    }
    if (byId.has(value.id)) throw new RangeError(`重复 Regression component ${value.id}。`);
    byId.set(value.id, value);
  }
  return Object.freeze(DEFINITION.components.map(({ id }) => {
    const value = byId.get(id);
    if (!value) throw new RangeError(`缺少 Regression component ${id}。`);
    if (id === ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ) return cloneInputFuzz(value);
    if (id === ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS) return cloneLifecycle(value);
    if (id === ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK) {
      return clonePresentationSoak(value, false);
    }
    if (id === ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK) {
      return clonePresentationSoak(value, true);
    }
    return cloneProductStress(value);
  }));
}
