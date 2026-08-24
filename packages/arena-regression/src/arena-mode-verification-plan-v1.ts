import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_MODE_VERIFICATION_PLAN_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS = 'production-unreachable' as const;
export const ARENA_MODE_VERIFICATION_PLAN_V1_MINIMUM_SEEDS_PER_MATRIX_CASE = 30 as const;
export const ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS = 108_000 as const;
export const ARENA_MODE_VERIFICATION_PLAN_V1_MINIMUM_REMATCHES = 100 as const;
export const ARENA_MODE_VERIFICATION_PLAN_V1_MAXIMUM_CASES = 256 as const;

export type ArenaModeVerificationPlanV1ModeKind = 'duel' | 'race' | 'survival';
export type ArenaModeVerificationPlanV1Profile = 'correctness' | 'long-run' | 'rematch';

export interface ArenaModeVerificationCaseV1 {
  readonly id: string;
  readonly profile: ArenaModeVerificationPlanV1Profile;
  readonly modeKind: ArenaModeVerificationPlanV1ModeKind;
  readonly modeDefinitionId: string;
  readonly fixtureDefinitionId: string | null;
  readonly participantCount: number;
  readonly enemySlotCount: number;
  readonly seedStart: number;
  readonly seedCount: number;
  readonly runnerTickBudget: number;
  readonly rematchCount: number;
  readonly requireDoubleRun: true;
}

export interface ArenaModeVerificationPlanV1 {
  readonly schemaVersion: typeof ARENA_MODE_VERIFICATION_PLAN_V1_SCHEMA_VERSION;
  readonly candidateStatus: typeof ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS;
  readonly id: string;
  readonly sourceCommit: string;
  readonly cases: readonly Readonly<ArenaModeVerificationCaseV1>[];
  readonly resultHash: string;
}

export type ArenaModeVerificationPlanV1CreateOptions = Omit<
  ArenaModeVerificationPlanV1,
  'resultHash'
>;

const CREATE_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion', 'candidateStatus', 'id', 'sourceCommit', 'cases',
]);
const PLAN_KEYS: ReadonlySet<string> = new Set([...CREATE_KEYS, 'resultHash']);
const CASE_KEYS: ReadonlySet<string> = new Set([
  'id',
  'profile',
  'modeKind',
  'modeDefinitionId',
  'fixtureDefinitionId',
  'participantCount',
  'enemySlotCount',
  'seedStart',
  'seedCount',
  'runnerTickBudget',
  'rematchCount',
  'requireDoubleRun',
]);
const MODE_KINDS: readonly ArenaModeVerificationPlanV1ModeKind[] = Object.freeze([
  'duel', 'race', 'survival',
]);
const PROFILES: ReadonlySet<unknown> = new Set(['correctness', 'long-run', 'rematch']);
const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u;
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const UINT32_MAXIMUM = 0xffffffff;

const REQUIRED_CORRECTNESS_CASES: ReadonlySet<string> = new Set([
  'duel:2:0',
  'race:2:0',
  'race:3:0',
  'race:4:0',
  'survival:5:4',
  'survival:9:8',
  'survival:13:12',
  'survival:17:16',
]);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function stableId(value: unknown, name: string): string {
  const id = assertNonEmptyString(value, name);
  if (!ID_PATTERN.test(id)) throw new RangeError(`${name} 格式无效。`);
  return id;
}

function testFixtureId(value: unknown, name: string): string {
  const id = stableId(value, name);
  if (!id.includes('.test.')) throw new RangeError(`${name} 必须是显式.test.fixture。`);
  return id;
}

function uint32(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > UINT32_MAXIMUM) throw new RangeError(`${name} 必须是uint32。`);
  return result;
}

function cloneCase(value: unknown, index: number): Readonly<ArenaModeVerificationCaseV1> {
  const name = `ArenaModeVerificationPlanV1.cases[${index}]`;
  exactRecord(value, CASE_KEYS, name);
  if (!PROFILES.has(value.profile)) throw new RangeError(`${name}.profile 不受支持。`);
  if (!MODE_KINDS.includes(value.modeKind as ArenaModeVerificationPlanV1ModeKind)) {
    throw new RangeError(`${name}.modeKind 不受支持。`);
  }
  const profile = value.profile as ArenaModeVerificationPlanV1Profile;
  const modeKind = value.modeKind as ArenaModeVerificationPlanV1ModeKind;
  const participantCount = assertIntegerAtLeast(
    value.participantCount,
    1,
    `${name}.participantCount`,
  );
  const enemySlotCount = assertIntegerAtLeast(
    value.enemySlotCount,
    0,
    `${name}.enemySlotCount`,
  );
  let fixtureDefinitionId: string | null;
  if (modeKind === 'duel') {
    if (participantCount !== 2 || enemySlotCount !== 0 || value.fixtureDefinitionId !== null) {
      throw new RangeError(`${name} Duel必须为2名participant、0 enemy slot且无未决fixture。`);
    }
    fixtureDefinitionId = null;
  } else {
    fixtureDefinitionId = testFixtureId(
      value.fixtureDefinitionId,
      `${name}.fixtureDefinitionId`,
    );
    if (modeKind === 'race') {
      if (participantCount < 2 || participantCount > 4 || enemySlotCount !== 0) {
        throw new RangeError(`${name} Race必须为2-4名participant且无enemy slot。`);
      }
    } else if (
      enemySlotCount < 1
      || enemySlotCount > 16
      || participantCount !== enemySlotCount + 1
    ) {
      throw new RangeError(`${name} Survival必须为1名玩家加1-16个enemy slot。`);
    }
  }
  const seedStart = uint32(value.seedStart, `${name}.seedStart`);
  const seedCount = assertIntegerAtLeast(value.seedCount, 1, `${name}.seedCount`);
  if (seedStart + seedCount - 1 > UINT32_MAXIMUM) {
    throw new RangeError(`${name} seed范围超出uint32。`);
  }
  const runnerTickBudget = assertIntegerAtLeast(
    value.runnerTickBudget,
    1,
    `${name}.runnerTickBudget`,
  );
  const rematchCount = assertIntegerAtLeast(
    value.rematchCount,
    1,
    `${name}.rematchCount`,
  );
  if (value.requireDoubleRun !== true) {
    throw new RangeError(`${name}.requireDoubleRun 必须为true。`);
  }
  if (
    profile === 'correctness'
    && seedCount < ARENA_MODE_VERIFICATION_PLAN_V1_MINIMUM_SEEDS_PER_MATRIX_CASE
  ) {
    throw new RangeError(`${name} correctness每档至少需要30个seed。`);
  }
  if (profile !== 'correctness' && seedCount !== 1) {
    throw new RangeError(`${name} long-run/rematch必须由单个预注册seed独立执行。`);
  }
  if (
    profile === 'long-run'
    && runnerTickBudget < ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS
  ) {
    throw new RangeError(`${name} long-run至少需要30分钟等效tick预算。`);
  }
  if (
    profile === 'rematch'
    && rematchCount < ARENA_MODE_VERIFICATION_PLAN_V1_MINIMUM_REMATCHES
  ) {
    throw new RangeError(`${name} rematch至少需要100局。`);
  }
  if (profile !== 'rematch' && rematchCount !== 1) {
    throw new RangeError(`${name} correctness/long-run不得混入多局rematch。`);
  }
  return Object.freeze({
    id: stableId(value.id, `${name}.id`),
    profile,
    modeKind,
    modeDefinitionId: stableId(value.modeDefinitionId, `${name}.modeDefinitionId`),
    fixtureDefinitionId,
    participantCount,
    enemySlotCount,
    seedStart,
    seedCount,
    runnerTickBudget,
    rematchCount,
    requireDoubleRun: true,
  });
}

function assertCoverage(cases: readonly Readonly<ArenaModeVerificationCaseV1>[]): void {
  const correctnessCases = new Set(cases
    .filter(({ profile }) => profile === 'correctness')
    .map(({ modeKind, participantCount, enemySlotCount }) => (
      `${modeKind}:${participantCount}:${enemySlotCount}`
    )));
  for (const requiredCase of REQUIRED_CORRECTNESS_CASES) {
    if (!correctnessCases.has(requiredCase)) {
      throw new RangeError(`P2 correctness压力矩阵缺少${requiredCase}。`);
    }
  }
  for (const profile of ['long-run', 'rematch'] as const) {
    for (const modeKind of MODE_KINDS) {
      if (!cases.some((entry) => entry.profile === profile && entry.modeKind === modeKind)) {
        throw new RangeError(`P2 ${profile}压力矩阵缺少${modeKind}。`);
      }
    }
  }
}

function createPlanCore(value: unknown): ArenaModeVerificationPlanV1CreateOptions {
  const source = cloneFrozenData(value, 'ArenaModeVerificationPlanV1 create options');
  exactRecord(source, CREATE_KEYS, 'ArenaModeVerificationPlanV1 create options');
  if (source.schemaVersion !== ARENA_MODE_VERIFICATION_PLAN_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaModeVerificationPlanV1.schemaVersion 必须是1。');
  }
  if (source.candidateStatus !== ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS) {
    throw new RangeError('ArenaModeVerificationPlanV1 必须保持production-unreachable。');
  }
  if (typeof source.sourceCommit !== 'string' || !COMMIT_PATTERN.test(source.sourceCommit)) {
    throw new TypeError('ArenaModeVerificationPlanV1.sourceCommit 必须是40位小写commit SHA。');
  }
  if (!Array.isArray(source.cases) || source.cases.length === 0) {
    throw new RangeError('ArenaModeVerificationPlanV1.cases 必须是非空数组。');
  }
  if (source.cases.length > ARENA_MODE_VERIFICATION_PLAN_V1_MAXIMUM_CASES) {
    throw new RangeError(
      `ArenaModeVerificationPlanV1.cases 不能超过${ARENA_MODE_VERIFICATION_PLAN_V1_MAXIMUM_CASES}项。`,
    );
  }
  const cases = source.cases.map(cloneCase);
  const ids = new Set<string>();
  let previousId: string | undefined;
  for (const entry of cases) {
    if (ids.has(entry.id)) throw new RangeError(`P2 verification case id重复：${entry.id}。`);
    if (previousId !== undefined && entry.id <= previousId) {
      throw new RangeError('ArenaModeVerificationPlanV1.cases 必须按id严格递增。');
    }
    ids.add(entry.id);
    previousId = entry.id;
  }
  assertCoverage(cases);
  return Object.freeze({
    schemaVersion: ARENA_MODE_VERIFICATION_PLAN_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS,
    id: stableId(source.id, 'ArenaModeVerificationPlanV1.id'),
    sourceCommit: source.sourceCommit,
    cases: Object.freeze(cases),
  });
}

export function createArenaModeVerificationPlanV1(
  value: unknown,
): Readonly<ArenaModeVerificationPlanV1> {
  const core = createPlanCore(value);
  return cloneFrozenData({
    ...core,
    resultHash: createDeterministicDataHash(core, 'ArenaModeVerificationPlanV1'),
  }, 'ArenaModeVerificationPlanV1');
}

export function validateArenaModeVerificationPlanV1(
  value: unknown,
): Readonly<ArenaModeVerificationPlanV1> {
  const source = cloneFrozenData(value, 'ArenaModeVerificationPlanV1 candidate');
  exactRecord(source, PLAN_KEYS, 'ArenaModeVerificationPlanV1 candidate');
  const expected = createArenaModeVerificationPlanV1({
    schemaVersion: source.schemaVersion,
    candidateStatus: source.candidateStatus,
    id: source.id,
    sourceCommit: source.sourceCommit,
    cases: source.cases,
  });
  if (typeof source.resultHash !== 'string' || !HASH_PATTERN.test(source.resultHash)) {
    throw new TypeError('ArenaModeVerificationPlanV1.resultHash 必须是8位小写hash。');
  }
  if (source.resultHash !== expected.resultHash) {
    throw new RangeError('ArenaModeVerificationPlanV1.resultHash 与重算身份不一致。');
  }
  return expected;
}
