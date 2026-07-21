import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';

export const ARENA_REGRESSION_EVIDENCE_SCHEMA_VERSION = 1;
export const ARENA_STAGE9_REGRESSION_EVIDENCE_V1_ID = 'arena.stage9.regression-evidence.v1';

export const ARENA_REGRESSION_COMPONENT_ID = Object.freeze({
  INPUT_FUZZ: 'input-fuzz',
  LIFECYCLE_TESTS: 'lifecycle-tests',
  PRESENTATION_SESSION_SOAK: 'presentation-session-soak',
  PRODUCT_PRESENTATION_SESSION_SOAK: 'product-presentation-session-soak',
  PRODUCT_SESSION_STRESS: 'product-session-stress',
});

const DEFINITION = Object.freeze({
  schemaVersion: ARENA_REGRESSION_EVIDENCE_SCHEMA_VERSION,
  id: ARENA_STAGE9_REGRESSION_EVIDENCE_V1_ID,
  components: Object.freeze([
    Object.freeze({
      id: ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ,
      matchesPerMapper: 40,
      replaySamplesPerMapper: 2,
      mapperIds: Object.freeze([
        'gesture-mobility-a',
        'context-primary-b',
      ].sort()),
    }),
    Object.freeze({
      id: ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS,
      testFiles: Object.freeze([
        'tests/arena/input/pointer-input-adapter.test.js',
        'tests/arena/local-match-session.test.js',
        'tests/arena/presentation/product-presentation-session.test.js',
        'tests/arena/product/stage8-product-session.test.js',
        'tests/arena/product/stage8-profile-persistence.test.js',
        'tests/arena/replay.test.js',
      ].sort()),
    }),
    Object.freeze({
      id: ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK,
      matches: 100,
      heapGrowthBudgetBytes: 8 * 1024 * 1024,
    }),
    Object.freeze({
      id: ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK,
      matches: 100,
      heapGrowthBudgetBytes: 8 * 1024 * 1024,
    }),
    Object.freeze({
      id: ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS,
      matches: 200,
    }),
  ]),
});

export function createArenaStage9RegressionEvidenceV1Definition() {
  return cloneFrozenData(DEFINITION, 'Arena Stage 9 Regression Evidence V1 Definition');
}

export function createArenaStage9RegressionEvidenceV1DefinitionHash() {
  return createDeterministicDataHash(DEFINITION, 'Arena Stage 9 Regression Evidence V1 Definition');
}
