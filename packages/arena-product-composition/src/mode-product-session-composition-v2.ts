import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  combineCleanupFailure,
} from '@number-strategy-jump/arena-contracts';
import { ModeProductResultAssemblerV3 } from '@number-strategy-jump/arena-product-match';
import { ModeRewardCommitterV2 } from '@number-strategy-jump/arena-product-progression';
import {
  ModeProductSessionV2,
  type ModeProductMatchSessionPortV2,
} from '@number-strategy-jump/arena-product-session';
import { assertSynchronousCompositionResult } from './synchronous-composition-boundary.js';

export interface ModeProductSessionCompositionV2Options {
  readonly modeDefinitionId: unknown;
  readonly modeKind: unknown;
  readonly matchSession: unknown;
  readonly publicMatchInfo: unknown;
  readonly authorityIdentity: unknown;
  readonly progressionRegistry: unknown;
  readonly profileDefinition: unknown;
  readonly profileService: unknown;
  readonly recipientParticipantId: unknown;
}

export const MODE_PRODUCT_SESSION_COMPOSITION_V2_OWNERSHIP = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  childOwnershipTransfersOnlyAfterSessionConstruction: true,
  failedSessionConstructionLeavesMatchOwnershipWithCaller: true,
  failedSessionConstructionCleansOnlyCompositionOwnedAssembler: true,
  validationStatus: 'not-run',
} as const);

type ModeKind = 'duel' | 'race' | 'survival';

const OPTION_KEYS = new Set([
  'modeDefinitionId',
  'modeKind',
  'matchSession',
  'publicMatchInfo',
  'authorityIdentity',
  'progressionRegistry',
  'profileDefinition',
  'profileService',
  'recipientParticipantId',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);

function safelyWrapThrownError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

function dataField(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function destroyOwnedAssembler(
  assembler: ModeProductResultAssemblerV3 | null,
): Error[] {
  const errors: Error[] = [];
  if (assembler !== null) {
    try {
      assertSynchronousCompositionResult(
        assembler.destroy(),
        'Mode Product Composition assembler destroy',
      );
    } catch (error) {
      errors.push(safelyWrapThrownError(
        error,
        'Mode Product Composition assembler清理失败。',
      ));
    }
  }
  return errors;
}

export function createModeProductSessionCompositionV2(
  value: unknown,
): ModeProductSessionV2 {
  const source = assertPlainRecord(value, 'ModeProductSessionCompositionV2 options');
  assertKnownKeys(source, OPTION_KEYS, 'ModeProductSessionCompositionV2 options');
  for (const key of OPTION_KEYS) dataField(source, key, 'ModeProductSessionCompositionV2 options');

  const modeDefinitionId = assertNonEmptyString(
    dataField(source, 'modeDefinitionId', 'ModeProductSessionCompositionV2 options'),
    'ModeProductSessionCompositionV2.modeDefinitionId',
  );
  const modeKind = dataField(source, 'modeKind', 'ModeProductSessionCompositionV2 options');
  if (!MODE_KINDS.has(modeKind)) {
    throw new RangeError('ModeProductSessionCompositionV2.modeKind不受支持。');
  }
  const recipientParticipantId = assertNonEmptyString(
    dataField(source, 'recipientParticipantId', 'ModeProductSessionCompositionV2 options'),
    'ModeProductSessionCompositionV2.recipientParticipantId',
  );
  const publicMatchInfo = dataField(
    source,
    'publicMatchInfo',
    'ModeProductSessionCompositionV2 options',
  );
  const publicInfoRecord = assertPlainRecord(
    publicMatchInfo,
    'ModeProductSessionCompositionV2 publicMatchInfo',
  );
  if (dataField(
    publicInfoRecord,
    'modeDefinitionId',
    'ModeProductSessionCompositionV2 publicMatchInfo',
  ) !== modeDefinitionId) {
    throw new RangeError('ModeProductSessionCompositionV2 public Match Mode身份不一致。');
  }
  if (dataField(
    publicInfoRecord,
    'localParticipantId',
    'ModeProductSessionCompositionV2 publicMatchInfo',
  ) !== recipientParticipantId) {
    throw new RangeError('ModeProductSessionCompositionV2奖励接收者必须是本地participant。');
  }

  const matchSession = dataField(
    source,
    'matchSession',
    'ModeProductSessionCompositionV2 options',
  );
  let assembler: ModeProductResultAssemblerV3 | null = null;
  try {
    assembler = new ModeProductResultAssemblerV3({
      modeKind: modeKind as ModeKind,
      publicMatchInfo,
      authorityIdentity: dataField(
        source,
        'authorityIdentity',
        'ModeProductSessionCompositionV2 options',
      ),
    });
    const rewardCommitter = new ModeRewardCommitterV2({
      registry: dataField(
        source,
        'progressionRegistry',
        'ModeProductSessionCompositionV2 options',
      ),
      profileDefinition: dataField(
        source,
        'profileDefinition',
        'ModeProductSessionCompositionV2 options',
      ),
      profileService: dataField(
        source,
        'profileService',
        'ModeProductSessionCompositionV2 options',
      ),
      recipientParticipantId,
    });
    const ownedAssembler = assembler;
    const session = new ModeProductSessionV2({
      modeDefinitionId,
      matchSession: matchSession as ModeProductMatchSessionPortV2,
      resultAssembler: ownedAssembler,
      rewardCommitter,
    });
    assembler = null;
    return session;
  } catch (error) {
    throw combineCleanupFailure(
      safelyWrapThrownError(error, 'ModeProductSessionCompositionV2创建失败。'),
      destroyOwnedAssembler(assembler),
      'ModeProductSessionCompositionV2创建失败且清理不完整。',
    );
  }
}
