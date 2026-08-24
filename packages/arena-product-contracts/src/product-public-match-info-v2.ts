import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  validateMatchContentSelectionV2,
  type DeepReadonly,
  type MatchContentSelectionV2,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { assertProductMatchSeed } from './product-match-result.js';
import {
  PRODUCT_MODE_ROLE,
  createProductParticipantAssignmentsV2,
  createProductPublicParticipantsV2,
  type ProductParticipantAssignmentV2,
  type ProductPublicParticipantV2,
} from './product-participant-contract-v2.js';

export const PRODUCT_PUBLIC_MATCH_INFO_V2_SCHEMA_VERSION = 2 as const;

export interface ProductPublicMatchInfoV2 {
  readonly schemaVersion: typeof PRODUCT_PUBLIC_MATCH_INFO_V2_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly localParticipantId: string;
  readonly content: MatchContentSelectionV2;
  readonly participantAssignments: readonly ProductParticipantAssignmentV2[];
  readonly publicParticipants: readonly ProductPublicParticipantV2[];
}

const KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'matchSeed', 'localParticipantId', 'content',
  'participantAssignments', 'publicParticipants',
]);

function requireKeys(value: PlainRecord, name: string): void {
  for (const key of KEYS) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
}

export function createProductPublicMatchInfoV2(
  value: unknown,
): DeepReadonly<ProductPublicMatchInfoV2> {
  const source = cloneFrozenData(value, 'ProductPublicMatchInfoV2');
  assertKnownKeys(source, KEYS, 'ProductPublicMatchInfoV2');
  requireKeys(source, 'ProductPublicMatchInfoV2');
  if (source.schemaVersion !== PRODUCT_PUBLIC_MATCH_INFO_V2_SCHEMA_VERSION) {
    throw new RangeError('ProductPublicMatchInfoV2.schemaVersion 必须是2。');
  }
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'ProductPublicMatchInfoV2.modeDefinitionId',
  );
  const content = validateMatchContentSelectionV2(source.content);
  if (content.modeDefinitionId !== modeDefinitionId) {
    throw new RangeError('ProductPublicMatchInfoV2 content Mode身份不一致。');
  }
  const participantAssignments = createProductParticipantAssignmentsV2(
    source.participantAssignments,
  );
  const assignmentIds = participantAssignments.map(({ participantId }) => participantId);
  const contentIds = content.participantCharacters.map(({ participantId }) => participantId);
  if (
    assignmentIds.length !== contentIds.length
    || assignmentIds.some((id, index) => id !== contentIds[index])
  ) {
    throw new RangeError('ProductPublicMatchInfoV2 assignment/content participant集合不一致。');
  }
  const localParticipantId = assertNonEmptyString(
    source.localParticipantId,
    'ProductPublicMatchInfoV2.localParticipantId',
  );
  const localAssignment = participantAssignments.find(
    ({ participantId }) => participantId === localParticipantId,
  );
  if (!localAssignment || localAssignment.modeRole === PRODUCT_MODE_ROLE.ENEMY) {
    throw new RangeError('ProductPublicMatchInfoV2 localParticipantId必须引用可控非enemy身份。');
  }
  return Object.freeze({
    schemaVersion: PRODUCT_PUBLIC_MATCH_INFO_V2_SCHEMA_VERSION,
    modeDefinitionId,
    matchSeed: assertProductMatchSeed(source.matchSeed, 'ProductPublicMatchInfoV2.matchSeed'),
    localParticipantId,
    content,
    participantAssignments,
    publicParticipants: createProductPublicParticipantsV2(
      source.publicParticipants,
      participantAssignments,
    ),
  });
}
