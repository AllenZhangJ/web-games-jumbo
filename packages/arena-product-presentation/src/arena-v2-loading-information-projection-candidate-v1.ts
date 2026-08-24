import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
  ArenaV2InformationScreenStateV1,
} from './arena-v2-information-screen-view-model-v1.js';
import {
  ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1,
} from './arena-v2-control-learning-copy-candidate-v1.js';

export interface ArenaV2LoadingInformationProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly state: ArenaV2InformationScreenStateV1;
  readonly primaryActionEnabled: boolean;
  readonly primaryActionDisabledReasonMessageId: string | null;
}

const OPTION_KEYS = new Set([
  'formalVisualAssetsReady',
  'inputContractReady',
  'profileRecoveryReady',
  'diagnosticText',
]);

function boolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name}必须是boolean。`);
  return value;
}

function field(
  fieldId: string,
  valueText: string,
  accessibilityText = valueText,
  fixedWidthNumeric = false,
): ArenaV2InformationFieldValueV1 {
  return Object.freeze({
    fieldId,
    labelMessageId: `arena.v2.field.${fieldId}`,
    valueText,
    accessibilityText,
    fixedWidthNumeric,
  });
}

export function projectArenaV2LoadingInformationCandidateV1(
  value: unknown,
): ArenaV2LoadingInformationProjectionCandidateV1 {
  const options = assertPlainRecord(value, 'Arena V2 loading information options');
  assertKnownKeys(options, OPTION_KEYS, 'Arena V2 loading information options');
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(options, key)) {
      throw new TypeError(`Arena V2 loading information缺少${key}。`);
    }
  }
  const formalVisualAssetsReady = boolean(
    options.formalVisualAssetsReady,
    'Arena V2 loading formalVisualAssetsReady',
  );
  const inputContractReady = boolean(
    options.inputContractReady,
    'Arena V2 loading inputContractReady',
  );
  const profileRecoveryReady = boolean(
    options.profileRecoveryReady,
    'Arena V2 loading profileRecoveryReady',
  );
  const diagnosticText = assertNonEmptyString(
    options.diagnosticText,
    'Arena V2 loading diagnosticText',
  );
  const ready = formalVisualAssetsReady && inputContractReady && profileRecoveryReady;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    fieldSource: Object.freeze({
      ownerId: 'p5-loading',
      fieldValues: Object.freeze([
        field(
          'asset-progress',
          formalVisualAssetsReady
            ? '正式视觉资产已就绪'
            : '规则、地图与20把武器数据已就绪；正式视觉资产待接入',
        ),
        field(
          'input-summary',
          inputContractReady
            ? ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.loadingReadyText
            : '基础输入合同尚未就绪',
        ),
        field(
          'recovery-status',
          profileRecoveryReady
            ? '奖励档案与学习档案已完成恢复'
            : '玩家档案正在恢复',
        ),
        field('load-diagnostic', diagnosticText),
      ]),
    }),
    state: ready ? 'ready' as const : 'loading' as const,
    primaryActionEnabled: ready,
    primaryActionDisabledReasonMessageId: ready
      ? null
      : 'arena.v2.reason.content-unavailable',
  });
}

export const ARENA_V2_LOADING_INFORMATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  ownerId: 'p5-loading' as const,
  validationStatus: 'not-run' as const,
  defaultSurfaceWired: false as const,
});
