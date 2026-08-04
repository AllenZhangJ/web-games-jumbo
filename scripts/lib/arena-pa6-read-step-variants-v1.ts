export const ARENA_PA6_READ_STEP_VARIANT_SCHEMA_VERSION = 1 as const;
export const ARENA_PA6_READ_STEP_CASE_COUNT = 20 as const;
export const ARENA_PA6_READ_STEP_SEED_BASE = 0x6b000000 as const;
export const ARENA_PA6_READ_STEP_HARD_LIMIT_TICKS = 2_500 as const;

export const ARENA_PA6_READ_STEP_VARIANT = Object.freeze({
  B_ONLY: 'B-only',
  C_B: 'C+B',
  B_D: 'B+D',
  C_B_D: 'C+B+D',
} as const);

export type ArenaPa6ReadStepVariantId =
  (typeof ARENA_PA6_READ_STEP_VARIANT)[keyof typeof ARENA_PA6_READ_STEP_VARIANT];

export interface ArenaPa6ReadStepVariantDefinitionV1 {
  readonly schemaVersion: typeof ARENA_PA6_READ_STEP_VARIANT_SCHEMA_VERSION;
  readonly id: ArenaPa6ReadStepVariantId;
  readonly cEnabled: boolean;
  readonly dEnabled: boolean;
  readonly profileRead: 'broad' | 'split';
  readonly resolverRead: 'sequential' | 'multi-intent';
}

export const ARENA_PA6_READ_STEP_VARIANTS_V1 = Object.freeze([
  Object.freeze({
    schemaVersion: ARENA_PA6_READ_STEP_VARIANT_SCHEMA_VERSION,
    id: ARENA_PA6_READ_STEP_VARIANT.B_ONLY,
    cEnabled: false,
    dEnabled: false,
    profileRead: 'broad',
    resolverRead: 'sequential',
  }),
  Object.freeze({
    schemaVersion: ARENA_PA6_READ_STEP_VARIANT_SCHEMA_VERSION,
    id: ARENA_PA6_READ_STEP_VARIANT.C_B,
    cEnabled: true,
    dEnabled: false,
    profileRead: 'split',
    resolverRead: 'sequential',
  }),
  Object.freeze({
    schemaVersion: ARENA_PA6_READ_STEP_VARIANT_SCHEMA_VERSION,
    id: ARENA_PA6_READ_STEP_VARIANT.B_D,
    cEnabled: false,
    dEnabled: true,
    profileRead: 'broad',
    resolverRead: 'multi-intent',
  }),
  Object.freeze({
    schemaVersion: ARENA_PA6_READ_STEP_VARIANT_SCHEMA_VERSION,
    id: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
    cEnabled: true,
    dEnabled: true,
    profileRead: 'split',
    resolverRead: 'multi-intent',
  }),
] as const satisfies readonly ArenaPa6ReadStepVariantDefinitionV1[]);

const VARIANT_BY_ID = new Map<ArenaPa6ReadStepVariantId, ArenaPa6ReadStepVariantDefinitionV1>(
  ARENA_PA6_READ_STEP_VARIANTS_V1.map((variant) => [variant.id, variant]),
);

const PROFILE_IDS = Object.freeze(['easy', 'normal', 'hard'] as const);
const INPUT_PLAN_IDS = Object.freeze([
  'neutral',
  'left-contest',
  'center-contest',
  'right-contest',
  'zigzag',
  'jump-cycle',
] as const);
const PAUSE_BOUNDARY_TICKS = Object.freeze([
  null,
  1_199,
  1_200,
  1_201,
  1_799,
  1_800,
  1_801,
  2_399,
  2_400,
  2_401,
] as const);

export interface ArenaPa6ReadStepCaseV1 {
  readonly caseId: string;
  readonly caseIdentity: string;
  readonly seed: number;
  readonly difficultyId: (typeof PROFILE_IDS)[number];
  readonly inputPlanId: (typeof INPUT_PLAN_IDS)[number];
  readonly pauseAtTick: (typeof PAUSE_BOUNDARY_TICKS)[number];
  readonly playerParticipantId: 'player-1' | 'player-2';
  readonly botParticipantId: 'player-1' | 'player-2';
}

function makeCase(index: number): ArenaPa6ReadStepCaseV1 {
  const seed = ARENA_PA6_READ_STEP_SEED_BASE + index;
  const difficultyId = PROFILE_IDS[index % PROFILE_IDS.length]!;
  const inputPlanId = INPUT_PLAN_IDS[index % INPUT_PLAN_IDS.length]!;
  const playerParticipantId = index % 2 === 0 ? 'player-1' : 'player-2';
  const botParticipantId = playerParticipantId === 'player-1' ? 'player-2' : 'player-1';
  const pauseAtTick = PAUSE_BOUNDARY_TICKS[index % PAUSE_BOUNDARY_TICKS.length] ?? null;
  const caseIdentity = [
    seed,
    difficultyId,
    inputPlanId,
    playerParticipantId,
    botParticipantId,
    pauseAtTick ?? 'none',
  ].join('|');
  return Object.freeze({
    caseId: `formal-survival-bot-${String(index).padStart(3, '0')}`,
    caseIdentity,
    seed,
    difficultyId,
    inputPlanId,
    pauseAtTick,
    playerParticipantId,
    botParticipantId,
  });
}

export const ARENA_PA6_READ_STEP_CASES_V1 = Object.freeze(
  Array.from({ length: ARENA_PA6_READ_STEP_CASE_COUNT }, (_, index) => makeCase(index)),
);

export const ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1 = Object.freeze([
  Object.freeze({
    id: 'C-ablation',
    a: ARENA_PA6_READ_STEP_VARIANT.B_ONLY,
    b: ARENA_PA6_READ_STEP_VARIANT.C_B,
  }),
  Object.freeze({
    id: 'D-ablation',
    a: ARENA_PA6_READ_STEP_VARIANT.B_ONLY,
    b: ARENA_PA6_READ_STEP_VARIANT.B_D,
  }),
  Object.freeze({
    id: 'combined',
    a: ARENA_PA6_READ_STEP_VARIANT.B_ONLY,
    b: ARENA_PA6_READ_STEP_VARIANT.C_B_D,
  }),
] as const);

export interface ArenaPa6ReadStepScheduledRoundV1 {
  readonly comparisonId: string;
  readonly sequence: 'A1' | 'B1' | 'B2' | 'A2';
  readonly variantId: ArenaPa6ReadStepVariantId;
}

export const ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1 = Object.freeze(
  ARENA_PA6_READ_STEP_ABBA_COMPARISONS_V1.flatMap(({ id, a, b }) => [
    Object.freeze({ comparisonId: id, sequence: 'A1', variantId: a }),
    Object.freeze({ comparisonId: id, sequence: 'B1', variantId: b }),
    Object.freeze({ comparisonId: id, sequence: 'B2', variantId: b }),
    Object.freeze({ comparisonId: id, sequence: 'A2', variantId: a }),
  ] as const),
) satisfies readonly ArenaPa6ReadStepScheduledRoundV1[];

export function requireArenaPa6ReadStepVariantV1(
  value: unknown,
): ArenaPa6ReadStepVariantDefinitionV1 {
  if (typeof value !== 'string' || !VARIANT_BY_ID.has(value as ArenaPa6ReadStepVariantId)) {
    throw new RangeError('PA6 readStep variant 必须是固定的 B-only/C+B/B+D/C+B+D。');
  }
  return VARIANT_BY_ID.get(value as ArenaPa6ReadStepVariantId)!;
}

export function assertArenaPa6FixedCasesV1(
  cases: readonly ArenaPa6ReadStepCaseV1[],
): void {
  if (!Array.isArray(cases) || cases.length !== ARENA_PA6_READ_STEP_CASE_COUNT) {
    throw new RangeError('PA6 必须完整使用 cases 000-019。');
  }
  const identities = new Set<string>();
  const seeds = new Set<number>();
  for (let index = 0; index < cases.length; index += 1) {
    const item = cases[index];
    const expected = ARENA_PA6_READ_STEP_CASES_V1[index];
    if (!item || !expected
      || item.caseId !== expected.caseId
      || item.caseIdentity !== expected.caseIdentity
      || item.seed !== ARENA_PA6_READ_STEP_SEED_BASE + index
      || item.difficultyId !== expected.difficultyId
      || item.inputPlanId !== expected.inputPlanId
      || item.pauseAtTick !== expected.pauseAtTick
      || item.playerParticipantId !== expected.playerParticipantId
      || item.botParticipantId !== expected.botParticipantId) {
      throw new RangeError(`PA6 case ${String(index).padStart(3, '0')} identity 漂移。`);
    }
    identities.add(item.caseIdentity);
    seeds.add(item.seed);
  }
  if (identities.size !== ARENA_PA6_READ_STEP_CASE_COUNT
    || seeds.size !== ARENA_PA6_READ_STEP_CASE_COUNT) {
    throw new RangeError('PA6 cases 必须包含 20 个唯一 identity/seed。');
  }
}

export function assertArenaPa6AbbaScheduleV1(
  schedule: readonly ArenaPa6ReadStepScheduledRoundV1[],
): void {
  if (!Array.isArray(schedule)
    || schedule.length !== ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1.length) {
    throw new RangeError('PA6 ABBA schedule 长度漂移。');
  }
  for (let index = 0; index < schedule.length; index += 1) {
    const actual = schedule[index];
    const expected = ARENA_PA6_READ_STEP_ABBA_SCHEDULE_V1[index];
    if (!actual || !expected
      || actual.comparisonId !== expected.comparisonId
      || actual.sequence !== expected.sequence
      || actual.variantId !== expected.variantId) {
      throw new RangeError(`PA6 ABBA schedule[${index}] 漂移。`);
    }
  }
}
