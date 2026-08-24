import {
  assertEvidenceBoundedString,
} from '@number-strategy-jump/arena-evidence-contracts';

export const ARENA_V2_A7_FORMAL_BUDGET_EVIDENCE_IDENTIFIER_MAXIMUM_LENGTH_CANDIDATE_V1 =
  256 as const;
export const ARENA_V2_A7_FORMAL_BUDGET_EVIDENCE_LOCATOR_MAXIMUM_LENGTH_CANDIDATE_V1 =
  2_048 as const;
export const ARENA_V2_A7_FORMAL_BUDGET_EVIDENCE_TEXT_MAXIMUM_LENGTH_CANDIDATE_V1 =
  4_096 as const;
const CANONICAL_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/u;
const WHITESPACE_PATTERN = /\s/u;

function assertBoundedCanonicalString(
  value: unknown,
  maximumLength: number,
  name: string,
): string {
  const result = assertEvidenceBoundedString(value, maximumLength, name, {
    rejectControlCharacters: true,
  });
  if (result !== result.trim()) throw new RangeError(`${name}不允许首尾空白。`);
  return result;
}

export function assertArenaV2A7FormalBudgetEvidenceIdentifierCandidateV1(
  value: unknown,
  name: string,
): string {
  const result = assertBoundedCanonicalString(
    value,
    ARENA_V2_A7_FORMAL_BUDGET_EVIDENCE_IDENTIFIER_MAXIMUM_LENGTH_CANDIDATE_V1,
    name,
  );
  if (!CANONICAL_IDENTIFIER_PATTERN.test(result)) {
    throw new RangeError(`${name}必须是小写ASCII规范标识。`);
  }
  return result;
}

export function assertArenaV2A7FormalBudgetEvidenceLocatorCandidateV1(
  value: unknown,
  name: string,
): string {
  const result = assertBoundedCanonicalString(
    value,
    ARENA_V2_A7_FORMAL_BUDGET_EVIDENCE_LOCATOR_MAXIMUM_LENGTH_CANDIDATE_V1,
    name,
  );
  if (WHITESPACE_PATTERN.test(result)) throw new RangeError(`${name}不允许包含空白。`);
  return result;
}

export function assertArenaV2A7FormalBudgetEvidenceTextCandidateV1(
  value: unknown,
  name: string,
): string {
  return assertEvidenceBoundedString(
    value,
    ARENA_V2_A7_FORMAL_BUDGET_EVIDENCE_TEXT_MAXIMUM_LENGTH_CANDIDATE_V1,
    name,
  );
}

export function assertArenaV2A7FormalBudgetNullableEvidenceTextCandidateV1(
  value: unknown,
  name: string,
): string | null {
  return value === null
    ? null
    : assertArenaV2A7FormalBudgetEvidenceTextCandidateV1(value, name);
}
