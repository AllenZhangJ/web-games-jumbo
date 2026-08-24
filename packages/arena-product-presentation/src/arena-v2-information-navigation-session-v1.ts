import {
  assertIntegerAtLeast,
  assertKnownKeys,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_SCREEN_ID_V1 as SCREEN,
  ARENA_V2_INFORMATION_UI_INTENT_V1 as INTENT,
  type ArenaV2InformationScreenIdV1,
  type ArenaV2InformationUiIntentV1,
} from './arena-v2-information-screen-definition-v1.js';
import {
  ArenaV2InformationScreenRegistryV1,
} from './arena-v2-information-screen-registry-v1.js';

export const ARENA_V2_INFORMATION_NAVIGATION_SESSION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_INFORMATION_NAVIGATION_SESSION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

export const ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1 = Object.freeze({
  INFORMATION: 'information',
  MATCH: 'match',
} as const);

export const ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1 = Object.freeze({
  START: 'start',
  WEAPONS: 'weapons',
  MAPS: 'maps',
  RECORDS: 'records',
} as const);

export type ArenaV2InformationNavigationModeKindV1 = 'duel' | 'race' | 'survival';
export type ArenaV2InformationNavigationSurfaceV1 =
  typeof ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1[
    keyof typeof ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1
  ];
export type ArenaV2InformationBottomNavigationItemV1 =
  typeof ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1[
    keyof typeof ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1
  ];

type ArenaV2InformationNavigationOperationV1 =
  | 'start'
  | 'loading-ready'
  | 'open-declared-link'
  | 'open-bottom-navigation'
  | 'dispatch-primary-intent'
  | 'complete-match'
  | 'snapshot-read'
  | 'destroy';

export interface ArenaV2InformationNavigationSnapshotV1 {
  readonly schemaVersion:
    typeof ARENA_V2_INFORMATION_NAVIGATION_SESSION_V1_SCHEMA_VERSION;
  readonly revision: number;
  readonly lifecycle: 'created' | 'active' | 'destroyed';
  readonly surface: ArenaV2InformationNavigationSurfaceV1;
  readonly currentScreenId: ArenaV2InformationScreenIdV1 | null;
  readonly returnScreenId: ArenaV2InformationScreenIdV1 | null;
}

export type ArenaV2InformationNavigationOutcomeV1 = Readonly<{
  readonly status: 'navigated' | 'external-command';
  readonly revision: number;
  readonly surface: ArenaV2InformationNavigationSurfaceV1;
  readonly screenId: ArenaV2InformationScreenIdV1 | null;
  readonly command:
    | 'retry-loading'
    | 'start-match'
    | null;
  readonly selectedModeKind: ArenaV2InformationNavigationModeKindV1 | null;
  readonly focusFieldId: 'recent-records' | null;
}>;

const CONSTRUCTOR_KEYS = new Set(['registry']);
const START_KEYS = new Set(['initialScreenId']);
const EXPECTED_REVISION_KEYS = new Set(['expectedRevision']);
const OPEN_LINK_KEYS = new Set(['expectedRevision', 'targetScreenId']);
const BOTTOM_NAVIGATION_KEYS = new Set(['expectedRevision', 'itemId']);
const PRIMARY_INTENT_KEYS = new Set([
  'expectedRevision', 'screenId', 'intentId', 'selectedModeKind', 'resultDecision',
  'resultTargetScreenId',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const SCREEN_IDS: ReadonlySet<unknown> = new Set(Object.values(SCREEN));
const BOTTOM_NAVIGATION_ITEMS: ReadonlySet<unknown> = new Set(
  Object.values(ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1),
);
const RESULT_DECISIONS: ReadonlySet<unknown> = new Set(['play-again', 'next-goal']);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是自有可枚举数据字段。`);
    }
  }
}

function nextRevision(value: number): number {
  const revision = value + 1;
  if (!Number.isSafeInteger(revision)) throw new RangeError('Arena V2导航revision溢出。');
  return revision;
}

function screenId(value: unknown, name: string): ArenaV2InformationScreenIdV1 {
  if (!SCREEN_IDS.has(value)) throw new RangeError(`${name}不受支持：${String(value)}。`);
  return value as ArenaV2InformationScreenIdV1;
}

function modeKind(value: unknown): ArenaV2InformationNavigationModeKindV1 {
  if (!MODE_KINDS.has(value)) throw new RangeError(`Arena V2导航modeKind不受支持：${String(value)}。`);
  return value as ArenaV2InformationNavigationModeKindV1;
}

function createOutcome(
  status: ArenaV2InformationNavigationOutcomeV1['status'],
  revision: number,
  surface: ArenaV2InformationNavigationSurfaceV1,
  screenIdValue: ArenaV2InformationScreenIdV1 | null,
  command: ArenaV2InformationNavigationOutcomeV1['command'],
  selectedModeKind: ArenaV2InformationNavigationModeKindV1 | null,
  focusFieldId: ArenaV2InformationNavigationOutcomeV1['focusFieldId'] = null,
): ArenaV2InformationNavigationOutcomeV1 {
  return Object.freeze({
    status,
    revision,
    surface,
    screenId: screenIdValue,
    command,
    selectedModeKind,
    focusFieldId,
  });
}

/**
 * Owns only the eleven-screen navigation state. Match, selection, result and
 * profile authority remain outside this class and enter through explicit calls.
 */
export class ArenaV2InformationNavigationSessionV1 {
  readonly #registry: ArenaV2InformationScreenRegistryV1;
  #revision = 0;
  #lifecycle: ArenaV2InformationNavigationSnapshotV1['lifecycle'] = 'created';
  #surface: ArenaV2InformationNavigationSurfaceV1 =
    ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.INFORMATION;
  #currentScreenId: ArenaV2InformationScreenIdV1 | null = SCREEN.LOADING;
  #returnScreenId: ArenaV2InformationScreenIdV1 | null = null;
  #operation: ArenaV2InformationNavigationOperationV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    exactRecord(value, CONSTRUCTOR_KEYS, 'ArenaV2InformationNavigationSessionV1 options');
    if (!(value.registry instanceof ArenaV2InformationScreenRegistryV1)) {
      throw new TypeError('Arena V2导航需要受支持的ScreenRegistry。');
    }
    this.#registry = value.registry;
  }

  #assertActive(operation: string): void {
    if (this.#lifecycle !== 'active') {
      throw new Error(`${operation}只接受active导航会话。`);
    }
  }

  #rejectReentry(operation: ArenaV2InformationNavigationOperationV1): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `Arena V2导航操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #runOperation<T>(operation: ArenaV2InformationNavigationOperationV1, callback: () => T): T {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    try {
      return callback();
    } finally {
      this.#operation = null;
    }
  }

  #assertReentryFree(sequence: number, operation: string): void {
    if (this.#reentrySequence === sequence) return;
    const error = new Error(`Arena V2导航${operation}期间发生Registry回调重入。`);
    if (this.#reentryError !== null) error.cause = this.#reentryError;
    throw error;
  }

  #useRegistryValueChecked<T>(sequence: number, operation: string, callback: () => T): T {
    try {
      const value = callback();
      this.#assertReentryFree(sequence, operation);
      return value;
    } catch (error) {
      this.#assertReentryFree(sequence, operation);
      throw error;
    }
  }

  #requireScreenDefinition(
    screenIdValue: ArenaV2InformationScreenIdV1,
    sequence: number,
    operation: string,
  ) {
    try {
      const definition = this.#registry.require(screenIdValue);
      this.#assertReentryFree(sequence, operation);
      return definition;
    } catch (error) {
      this.#assertReentryFree(sequence, operation);
      throw error;
    }
  }

  #assertInformation(operation: string): ArenaV2InformationScreenIdV1 {
    this.#assertActive(operation);
    if (
      this.#surface !== ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.INFORMATION
      || this.#currentScreenId === null
    ) throw new Error(`${operation}只接受信息页面surface。`);
    return this.#currentScreenId;
  }

  #assertRevision(value: unknown, name: string): void {
    const expected = assertIntegerAtLeast(value, 0, name);
    if (expected !== this.#revision) {
      throw new RangeError(`${name}漂移；expected=${this.#revision} actual=${expected}。`);
    }
  }

  #assertDeclaredTarget(
    fromScreenId: ArenaV2InformationScreenIdV1,
    targetScreenId: ArenaV2InformationScreenIdV1,
    sequence: number,
  ): void {
    const definition = this.#requireScreenDefinition(
      fromScreenId,
      sequence,
      '页面Definition读取',
    );
    const declared = this.#useRegistryValueChecked(
      sequence,
      '页面Definition使用',
      () => definition.navigationTargetIds.includes(targetScreenId),
    );
    if (!declared) {
      throw new RangeError(`Arena V2页面${fromScreenId}未声明导航到${targetScreenId}。`);
    }
  }

  #commitInformation(
    targetScreenId: ArenaV2InformationScreenIdV1,
    returnScreenId: ArenaV2InformationScreenIdV1 | null,
    focusFieldId: ArenaV2InformationNavigationOutcomeV1['focusFieldId'] = null,
  ): ArenaV2InformationNavigationOutcomeV1 {
    const revision = nextRevision(this.#revision);
    const outcome = createOutcome(
      'navigated',
      revision,
      ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.INFORMATION,
      targetScreenId,
      null,
      null,
      focusFieldId,
    );
    this.#revision = revision;
    this.#surface = ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.INFORMATION;
    this.#currentScreenId = targetScreenId;
    this.#returnScreenId = returnScreenId;
    return outcome;
  }

  #commitMatch(
    selectedModeKind: ArenaV2InformationNavigationModeKindV1 | null,
  ): ArenaV2InformationNavigationOutcomeV1 {
    if (selectedModeKind === null) {
      throw new Error('Arena V2开局前必须显式提供Product Session模式。');
    }
    const revision = nextRevision(this.#revision);
    const outcome = createOutcome(
      'external-command',
      revision,
      ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.MATCH,
      null,
      'start-match',
      selectedModeKind,
    );
    this.#revision = revision;
    this.#surface = ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.MATCH;
    this.#currentScreenId = null;
    this.#returnScreenId = null;
    return outcome;
  }

  start(value: unknown): ArenaV2InformationNavigationSnapshotV1 {
    return this.#runOperation('start', () => {
      if (this.#lifecycle !== 'created') throw new Error('Arena V2导航会话只能启动一次。');
      const sequence = this.#reentrySequence;
      exactRecord(value, START_KEYS, 'ArenaV2InformationNavigationSessionV1 start');
      const initialScreenId = screenId(
        value.initialScreenId,
        'ArenaV2InformationNavigationSessionV1 start.initialScreenId',
      );
      if (initialScreenId !== SCREEN.LOADING && initialScreenId !== SCREEN.HOME) {
        throw new RangeError('Arena V2导航初始页面只能是loading或home。');
      }
      this.#assertReentryFree(sequence, '启动输入校验');
      this.#lifecycle = 'active';
      this.#currentScreenId = initialScreenId;
      return this.#snapshot();
    });
  }

  loadingReady(value: unknown): ArenaV2InformationNavigationOutcomeV1 {
    return this.#runOperation('loading-ready', () => {
      const sequence = this.#reentrySequence;
      const currentScreenId = this.#assertInformation('Arena V2 loadingReady');
      exactRecord(value, EXPECTED_REVISION_KEYS, 'ArenaV2InformationNavigationSessionV1 loadingReady');
      this.#assertRevision(value.expectedRevision, 'ArenaV2InformationNavigationSessionV1 loadingReady.expectedRevision');
      if (currentScreenId !== SCREEN.LOADING) {
        throw new Error('Arena V2 loadingReady只接受loading页面。');
      }
      this.#assertReentryFree(sequence, 'Loading输入校验');
      this.#assertDeclaredTarget(currentScreenId, SCREEN.HOME, sequence);
      return this.#commitInformation(SCREEN.HOME, null);
    });
  }

  openDeclaredLink(value: unknown): ArenaV2InformationNavigationOutcomeV1 {
    return this.#runOperation('open-declared-link', () => {
      const sequence = this.#reentrySequence;
      const currentScreenId = this.#assertInformation('Arena V2 openDeclaredLink');
      exactRecord(value, OPEN_LINK_KEYS, 'ArenaV2InformationNavigationSessionV1 openDeclaredLink');
      this.#assertRevision(value.expectedRevision, 'ArenaV2InformationNavigationSessionV1 openDeclaredLink.expectedRevision');
      const targetScreenId = screenId(
        value.targetScreenId,
        'ArenaV2InformationNavigationSessionV1 openDeclaredLink.targetScreenId',
      );
      this.#assertReentryFree(sequence, '显式链接输入校验');
      this.#assertDeclaredTarget(currentScreenId, targetScreenId, sequence);
      const returnScreenId = targetScreenId === SCREEN.CHARACTER_SELECT
        ? currentScreenId
        : currentScreenId === SCREEN.MATCH_PREP
          && (targetScreenId === SCREEN.WEAPON_DETAIL || targetScreenId === SCREEN.MAP_DETAIL)
          ? currentScreenId
          : currentScreenId === SCREEN.SURVIVAL_PREP && targetScreenId === SCREEN.MAP_DETAIL
            ? currentScreenId
            : null;
      return this.#commitInformation(targetScreenId, returnScreenId);
    });
  }

  openBottomNavigation(value: unknown): ArenaV2InformationNavigationOutcomeV1 {
    return this.#runOperation('open-bottom-navigation', () => {
      const sequence = this.#reentrySequence;
      const currentScreenId = this.#assertInformation('Arena V2 openBottomNavigation');
      exactRecord(
        value,
        BOTTOM_NAVIGATION_KEYS,
        'ArenaV2InformationNavigationSessionV1 openBottomNavigation',
      );
      this.#assertRevision(value.expectedRevision, 'ArenaV2InformationNavigationSessionV1 openBottomNavigation.expectedRevision');
      if (!BOTTOM_NAVIGATION_ITEMS.has(value.itemId)) {
        throw new RangeError(`Arena V2底部导航项不受支持：${String(value.itemId)}。`);
      }
      const itemId = value.itemId as ArenaV2InformationBottomNavigationItemV1;
      this.#assertReentryFree(sequence, '底部导航输入校验');
      const definition = this.#requireScreenDefinition(
        currentScreenId,
        sequence,
        '底部导航Definition读取',
      );
      const bottomNavigationVisible = this.#useRegistryValueChecked(
        sequence,
        '底部导航Definition使用',
        () => definition.bottomNavigationVisible,
      );
      if (!bottomNavigationVisible) {
        throw new Error(`Arena V2页面${currentScreenId}未显示底部导航。`);
      }
      const target = itemId === ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1.WEAPONS
        ? SCREEN.WEAPON_INDEX
        : itemId === ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1.MAPS
          ? SCREEN.MAP_INDEX
          : SCREEN.HOME;
      return this.#commitInformation(
        target,
        null,
        itemId === ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1.RECORDS
          ? 'recent-records'
          : null,
      );
    });
  }

  dispatchPrimaryIntent(value: unknown): ArenaV2InformationNavigationOutcomeV1 {
    return this.#runOperation('dispatch-primary-intent', () => {
      const sequence = this.#reentrySequence;
      const currentScreenId = this.#assertInformation('Arena V2 dispatchPrimaryIntent');
      exactRecord(
        value,
        PRIMARY_INTENT_KEYS,
        'ArenaV2InformationNavigationSessionV1 dispatchPrimaryIntent',
      );
      this.#assertRevision(value.expectedRevision, 'ArenaV2InformationNavigationSessionV1 dispatchPrimaryIntent.expectedRevision');
      if (screenId(value.screenId, 'ArenaV2InformationNavigationSessionV1 dispatchPrimaryIntent.screenId') !== currentScreenId) {
        throw new RangeError('Arena V2主动作页面身份漂移。');
      }
      const intentId = value.intentId as ArenaV2InformationUiIntentV1;
      const selectedModeKind = value.selectedModeKind === null
        ? null
        : modeKind(value.selectedModeKind);
      const resultDecision = value.resultDecision;
      const resultTargetScreenId = value.resultTargetScreenId === null
        ? null
        : screenId(
          value.resultTargetScreenId,
          'ArenaV2InformationNavigationSessionV1 dispatchPrimaryIntent.resultTargetScreenId',
        );
      if (intentId === INTENT.PLAY_AGAIN_OR_NEXT) {
        if (!RESULT_DECISIONS.has(resultDecision)) {
          throw new RangeError('Arena V2结算动作必须显式选择play-again或next-goal。');
        }
        if (resultDecision === 'play-again' && resultTargetScreenId !== null) {
          throw new RangeError('Arena V2重新开始不能携带下一目标页面。');
        }
        if (resultDecision === 'next-goal' && resultTargetScreenId === null) {
          throw new RangeError('Arena V2下一目标动作必须携带唯一目标页面。');
        }
      } else if (resultDecision !== null || resultTargetScreenId !== null) {
        throw new RangeError('Arena V2非结算主动作不能携带结果决策或目标页面。');
      }
      const startsMatch = intentId === INTENT.START_SELECTED_MODE
        || intentId === INTENT.START_PREPARED_MATCH
        || intentId === INTENT.START_SURVIVAL
        || (intentId === INTENT.PLAY_AGAIN_OR_NEXT && resultDecision === 'play-again');
      if (startsMatch && selectedModeKind === null) {
        throw new RangeError('Arena V2开局动作必须携带Product Session selectedModeKind。');
      }
      if (!startsMatch && selectedModeKind !== null) {
        throw new RangeError('Arena V2非开局动作不能把模式选择写入导航会话。');
      }
      this.#assertReentryFree(sequence, '主动作输入校验');
      const definition = this.#requireScreenDefinition(
        currentScreenId,
        sequence,
        '主动作Definition读取',
      );
      const primaryIntentId = this.#useRegistryValueChecked(
        sequence,
        '主动作Definition使用',
        () => definition.primaryAction.intentId,
      );
      if (intentId !== primaryIntentId) {
        throw new RangeError('Arena V2主动作intent与页面Definition不一致。');
      }
      if (intentId === INTENT.RETRY_LOADING) {
        const revision = nextRevision(this.#revision);
        const outcome = createOutcome(
          'external-command',
          revision,
          this.#surface,
          currentScreenId,
          'retry-loading',
          null,
        );
        this.#revision = revision;
        return outcome;
      }
      if (intentId === INTENT.OPEN_MODE_SELECT) {
        this.#assertDeclaredTarget(currentScreenId, SCREEN.MODE_SELECT, sequence);
        return this.#commitInformation(SCREEN.MODE_SELECT, null);
      }
      if (intentId === INTENT.START_SELECTED_MODE) return this.#commitMatch(selectedModeKind);
      if (intentId === INTENT.SAVE_CHARACTER) {
        const target = this.#returnScreenId ?? SCREEN.MODE_SELECT;
        this.#assertDeclaredTarget(currentScreenId, target, sequence);
        return this.#commitInformation(target, null);
      }
      if (intentId === INTENT.START_PREPARED_MATCH) {
        if (selectedModeKind === 'survival') {
          throw new Error('Arena V2 survival不能从竞技准备页开局。');
        }
        return this.#commitMatch(selectedModeKind);
      }
      if (intentId === INTENT.START_SURVIVAL) {
        if (selectedModeKind !== 'survival') {
          throw new Error('Arena V2生存准备页只接受survival模式。');
        }
        return this.#commitMatch(selectedModeKind);
      }
      if (intentId === INTENT.OPEN_SELECTED_WEAPON) {
        this.#assertDeclaredTarget(currentScreenId, SCREEN.WEAPON_DETAIL, sequence);
        return this.#commitInformation(SCREEN.WEAPON_DETAIL, null);
      }
      if (intentId === INTENT.USE_SELECTED_WEAPON_NEXT_MATCH) {
        const target = this.#returnScreenId === SCREEN.MATCH_PREP
          ? SCREEN.MATCH_PREP
          : SCREEN.MODE_SELECT;
        this.#assertDeclaredTarget(currentScreenId, target, sequence);
        return this.#commitInformation(target, null);
      }
      if (intentId === INTENT.OPEN_SELECTED_MAP) {
        this.#assertDeclaredTarget(currentScreenId, SCREEN.MAP_DETAIL, sequence);
        return this.#commitInformation(SCREEN.MAP_DETAIL, null);
      }
      if (intentId === INTENT.USE_SELECTED_MAP_NEXT_MATCH) {
        const target = this.#returnScreenId === SCREEN.MATCH_PREP
          || this.#returnScreenId === SCREEN.SURVIVAL_PREP
          ? this.#returnScreenId
          : SCREEN.MODE_SELECT;
        this.#assertDeclaredTarget(currentScreenId, target, sequence);
        return this.#commitInformation(target, null);
      }
      if (resultDecision === 'play-again') return this.#commitMatch(selectedModeKind);
      if (resultTargetScreenId === null) {
        throw new Error('Arena V2下一目标页面在提交前丢失。');
      }
      this.#assertDeclaredTarget(currentScreenId, resultTargetScreenId, sequence);
      return this.#commitInformation(resultTargetScreenId, null);
    });
  }

  completeMatch(value: unknown): ArenaV2InformationNavigationOutcomeV1 {
    return this.#runOperation('complete-match', () => {
      const sequence = this.#reentrySequence;
      this.#assertActive('Arena V2 completeMatch');
      exactRecord(value, EXPECTED_REVISION_KEYS, 'ArenaV2InformationNavigationSessionV1 completeMatch');
      this.#assertRevision(value.expectedRevision, 'ArenaV2InformationNavigationSessionV1 completeMatch.expectedRevision');
      if (
        this.#surface !== ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.MATCH
        || this.#currentScreenId !== null
      ) throw new Error('Arena V2 completeMatch只接受match surface。');
      this.#assertReentryFree(sequence, '比赛完成输入校验');
      return this.#commitInformation(SCREEN.RESULT_REWARD, null);
    });
  }

  getSnapshot(): ArenaV2InformationNavigationSnapshotV1 {
    return this.#runOperation('snapshot-read', () => this.#snapshot());
  }

  #snapshot(): ArenaV2InformationNavigationSnapshotV1 {
    return Object.freeze({
      schemaVersion: ARENA_V2_INFORMATION_NAVIGATION_SESSION_V1_SCHEMA_VERSION,
      revision: this.#revision,
      lifecycle: this.#lifecycle,
      surface: this.#surface,
      currentScreenId: this.#currentScreenId,
      returnScreenId: this.#returnScreenId,
    });
  }

  destroy(): ArenaV2InformationNavigationSnapshotV1 {
    return this.#runOperation('destroy', () => {
      if (this.#lifecycle === 'destroyed') return this.#snapshot();
      this.#revision = nextRevision(this.#revision);
      this.#lifecycle = 'destroyed';
      this.#surface = ARENA_V2_INFORMATION_NAVIGATION_SURFACE_V1.INFORMATION;
      this.#currentScreenId = null;
      this.#returnScreenId = null;
      return this.#snapshot();
    });
  }
}

export const ARENA_V2_INFORMATION_NAVIGATION_CANDIDATE_V1 = Object.freeze({
  status: ARENA_V2_INFORMATION_NAVIGATION_SESSION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  defaultNavigationWired: false as const,
  pageCount: 11 as const,
  ownsMatchAuthority: false as const,
  ownsSelectionData: false as const,
  ownsResultOrProfile: false as const,
  maximumPrimaryClicksFromHomeToStartMatch: 2 as const,
  operationGuardPrecedesLifecycleAndInputValidation: true as const,
  registryCallbacksCheckedBeforeNavigationCommit: true as const,
  publicSnapshotRejectsOperationIntermediateState: true as const,
  internalSnapshotAvoidsPublicReentry: true as const,
  destroyFastPathChecksOperationBeforeIdempotence: true as const,
  inputAccessorsRejectedBeforeExecution: true as const,
  revisionOverflowRejectedBeforeCommit: true as const,
  validationStatus: 'not-run' as const,
});
