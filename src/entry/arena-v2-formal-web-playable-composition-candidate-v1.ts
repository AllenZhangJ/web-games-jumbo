import {
  ARENA_ACTION_PHASE,
  ARENA_MATCH_READ_PROFILE,
  MATCH_READ_FRAME_V3_SCHEMA_VERSION,
  assertArenaActionPhase,
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
  createArenaLocalJumpAvailabilityV1,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1,
  ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '@number-strategy-jump/arena-product-presentation-three';
import {
  ARENA_V2_RETENTION_OBSERVATION_KIND_V1,
  ArenaV2OfflineRetentionObservationJournalCandidateV1,
  ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1,
  createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1,
  projectArenaV2LearningPaceCalibrationCandidateV1,
  projectArenaV2WeaponResearchCatalogProgressCandidateV1,
  projectArenaV2WeaponResearchPaceCalibrationCandidateV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1,
  ArenaV2RegistryActiveBootstrapCandidateV1,
} from '@number-strategy-jump/arena-product-composition';
import {
  cloneViewport,
  type PresentationInputViewport,
  type PresentationSafeAreaInsets,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1,
  ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1,
  ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1,
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
  type ArenaV2RegistryBackedLocalPlayableBeginPromotionOptionsCandidateV1,
  type ArenaV2RegistryBackedLocalPlayableBeginPromotionFromAssessmentOptionsCandidateV1,
  type ArenaV2RegistryBackedLocalPlayableOwnerOptionsCandidateV1,
  type ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1,
  type ArenaV2RegistryWeaponAvailabilityChangeCandidateV1,
  type ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
} from '@number-strategy-jump/arena-regression';
import * as THREE from 'three';
import {
  createArenaV2CollectionPreviewReadInputCandidateV1,
} from './arena-v2-collection-preview-read-input-candidate-v1.js';
import {
  adaptArenaV2FormalWebModeRegistryPreflightCandidateV1,
} from './arena-v2-formal-web-mode-registry-preflight-adapter-candidate-v1.js';
import {
  ArenaV2FormalWebMatchHostConstructionCleanupFailureCandidateV1,
  ArenaV2FormalWebMatchHostCandidateV1,
} from './arena-v2-formal-web-match-host-candidate-v1.js';
import {
  ArenaV2InformationDomSurfaceCandidateV1,
} from './arena-v2-information-dom-surface-candidate-v1.js';
import {
  ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1,
} from './arena-v2-information-local-playable-surface-binding-candidate-v1.js';
import {
  ArenaV2KeyboardVisibilityRegistrationCleanupFailureCandidateV1,
  ArenaV2LocalMatchKeyboardDriverCandidateV1,
} from './arena-v2-local-match-keyboard-driver-candidate-v1.js';
import {
  ArenaV2LocalMatchPointerDriverCandidateV1,
} from './arena-v2-local-match-pointer-driver-candidate-v1.js';
import {
  ArenaV2FormalWebPointerSurfaceConstructionCleanupFailureCandidateV1,
  ArenaV2FormalWebPointerSurfaceCandidateV1,
  type ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1,
  type ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1,
  type ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1,
} from './arena-v2-formal-web-pointer-surface-candidate-v1.js';

type CompositionState = 'created' | 'loading' | 'ready' | 'failed' | 'disposed';
type ActiveSurface = 'information' | 'match';
type FormalWebSynchronousOperation =
  | 'load'
  | 'prepare-formal-assets'
  | 'activate-audio'
  | 'refresh-layout'
  | 'resize'
  | 'preview-visibility'
  | 'surface-change'
  | 'match-step'
  | 'driver-state-change'
  | 'pause-match'
  | 'resume-match'
  | 'settle-match'
  | 'retry-settlement-recovery'
  | 'registry-maintenance'
  | 'failure-commit'
  | 'failure-shutdown'
  | 'state-read'
  | 'active-surface-read'
  | 'last-error-read'
  | 'binding-read'
  | 'snapshot-read'
  | 'retention-export-read'
  | 'retention-calibration-read'
  | 'retention-weapon-pace-page-token-read'
  | 'retention-weapon-pace-read'
  | 'dispose';
type InputMode = 'keyboard' | 'pointer';
type RequestedInputMode = InputMode | 'adaptive';
type LocalMatchDriver = ArenaV2LocalMatchKeyboardDriverCandidateV1
  | ArenaV2LocalMatchPointerDriverCandidateV1;
type SyncFunction = (...args: readonly unknown[]) => unknown;
type LocalLearningProfileRead = ReturnType<
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
    'getInformationLearningProfileRead'
  ]
>;

export interface ArenaV2FormalWebRegistryProjectionCandidateV1 {
  readonly owner: Readonly<ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1>;
  readonly availabilityChange:
    Readonly<ArenaV2RegistryWeaponAvailabilityChangeCandidateV1> | null;
  readonly sequence:
    ArenaV2RegistryBackedLocalPlayableOwnerSnapshotCandidateV1['registrySequence'];
  readonly active: Readonly<{
    readonly revision: number;
    readonly snapshotHash: string;
    readonly collectionWeaponIds: readonly string[];
  }> | null;
}

export interface ArenaV2FormalWebOfflineLearningPaceCalibrationReadCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-capacity-calibration-read';
  readonly sourceJournalRevision: number;
  readonly sourceJournalPayloadHash: string;
  readonly observationCount: number;
  readonly retainedObservationCount: number;
  readonly droppedObservationCount: number;
  readonly authorityObservationWindow:
    | 'complete-journal-history'
    | 'retained-tail-window';
  readonly calibration: ReturnType<
    typeof projectArenaV2LearningPaceCalibrationCandidateV1
  >;
  readonly mutatesProgression: false;
  readonly claimsObservedRetention: false;
}

export interface ArenaV2FormalWebOfflineWeaponResearchPaceCalibrationReadCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'offline-weapon-research-pace-calibration-read';
  readonly sourceJournalRevision: number;
  readonly sourceJournalPayloadHash: string;
  readonly sourceJournalDroppedObservationCount: number;
  readonly windowIdentityHash: string;
  readonly baselineProfileRevision: number;
  readonly currentProfileRevision: number;
  readonly evidenceThroughProfileRevision: number;
  readonly catalogCompletionProfileRevision: number | null;
  readonly expectedSettlementCount: number;
  readonly retainedSettlementCount: number;
  readonly evidenceSource:
    | 'durable-compact-window'
    | 'retained-journal-window';
  readonly evidenceWindowStatus:
    | 'complete-baseline-profile-window'
    | 'incomplete-baseline-profile-window'
    | 'catalog-completion-boundary-unavailable';
  readonly calibration: ReturnType<
    typeof projectArenaV2WeaponResearchPaceCalibrationCandidateV1
  > | null;
  readonly mutatesProgression: false;
  readonly addsRetentionMetric: false;
  readonly claimsObservedRetention: false;
}

const WEAPON_RESEARCH_PACE_PAGE_BASELINE_TOKEN_INPUT_KEYS = new Set([
  'profileDefinition', 'profile', 'cohortSubjectId',
]);

/**
 * Opaque in-memory owner for the current browser page's resolved
 * weapon-research baseline. The baseline may originate from the durable
 * offline store or from a page-only fallback; retry and BFCache generations
 * reuse this token without exposing the raw profile through diagnostics.
 */
export class ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1 {
  readonly #profileDefinition: LocalLearningProfileRead['profileDefinition'];
  readonly #profile: LocalLearningProfileRead['profile'];
  readonly #cohortSubjectId: string;

  constructor(value: unknown) {
    const source = cloneFrozenData(
      value,
      'Arena V2 formal Web weapon research pace page baseline token input',
    );
    assertKnownKeys(
      source,
      WEAPON_RESEARCH_PACE_PAGE_BASELINE_TOKEN_INPUT_KEYS,
      'Arena V2 formal Web weapon research pace page baseline token input',
    );
    for (const key of WEAPON_RESEARCH_PACE_PAGE_BASELINE_TOKEN_INPUT_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena V2正式Web页面研究节奏基线缺少${key}。`);
      }
    }
    const window = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: source.profileDefinition,
      baselineProfile: source.profile,
      cohortSubjectId: source.cohortSubjectId,
    });
    this.#profileDefinition = source.profileDefinition as
      LocalLearningProfileRead['profileDefinition'];
    this.#profile = source.profile as LocalLearningProfileRead['profile'];
    this.#cohortSubjectId = window.cohortSubjectId;
    Object.freeze(this);
  }

  get baselineProfileRevision(): number { return this.#profile.revision; }

  assertCompatibleCurrent(value: LocalLearningProfileRead): void {
    const storedBaselineWindow =
      createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
        profileDefinition: this.#profileDefinition,
        baselineProfile: this.#profile,
        cohortSubjectId: this.#cohortSubjectId,
      });
    const baselineWindow = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: value.profileDefinition,
      baselineProfile: this.#profile,
      cohortSubjectId: this.#cohortSubjectId,
    });
    const currentWindow = createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: value.profileDefinition,
      baselineProfile: value.profile,
      cohortSubjectId: this.#cohortSubjectId,
    });
    if (storedBaselineWindow.profileDefinitionId !== baselineWindow.profileDefinitionId
      || storedBaselineWindow.profileDefinitionContentVersion
        !== baselineWindow.profileDefinitionContentVersion
      || storedBaselineWindow.profileDefinitionContentHash
        !== baselineWindow.profileDefinitionContentHash
      || baselineWindow.profileDefinitionId !== currentWindow.profileDefinitionId
      || baselineWindow.profileDefinitionContentVersion
        !== currentWindow.profileDefinitionContentVersion
      || baselineWindow.profileDefinitionContentHash
        !== currentWindow.profileDefinitionContentHash
      || value.profile.profileId !== this.#profile.profileId
      || value.profile.revision < this.#profile.revision) {
      throw new RangeError('Arena V2正式Web页面研究节奏基线与当前Profile不兼容。');
    }
  }

  createWindow(
    cohortSubjectId: string,
  ): ReturnType<typeof createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1> {
    if (cohortSubjectId !== this.#cohortSubjectId) {
      throw new RangeError('Arena V2正式Web页面研究节奏基线匿名主体漂移。');
    }
    return createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1({
      profileDefinition: this.#profileDefinition,
      baselineProfile: this.#profile,
      cohortSubjectId: this.#cohortSubjectId,
    });
  }

  canProjectThroughCurrent(value: LocalLearningProfileRead): boolean {
    this.assertCompatibleCurrent(value);
    const baselineProgress = projectArenaV2WeaponResearchCatalogProgressCandidateV1({
      profileDefinition: this.#profileDefinition,
      profile: this.#profile,
    });
    const currentProgress = projectArenaV2WeaponResearchCatalogProgressCandidateV1({
      profileDefinition: value.profileDefinition,
      profile: value.profile,
    });
    if (!currentProgress.catalogComplete) return true;
    const revisionSpan = value.profile.revision - this.#profile.revision;
    const mainResearchPointDelta = currentProgress.currentMainResearchPoints
      - baselineProgress.currentMainResearchPoints;
    return (revisionSpan === 0 && baselineProgress.catalogComplete)
      || mainResearchPointDelta === revisionSpan;
  }

  project(
    current: LocalLearningProfileRead,
    observations: readonly unknown[],
    window: ReturnType<typeof createArenaV2WeaponResearchPaceCalibrationWindowCandidateV1>,
  ): ReturnType<typeof projectArenaV2WeaponResearchPaceCalibrationCandidateV1> {
    this.assertCompatibleCurrent(current);
    return projectArenaV2WeaponResearchPaceCalibrationCandidateV1({
      profileDefinition: current.profileDefinition,
      baselineProfile: this.#profile,
      currentProfile: current.profile,
      observations,
      window,
    });
  }
}

const OPTION_KEYS = new Set([
  'hostRoot',
  'seedSource',
  'storage',
  'ownerId',
  'wallNow',
  'selectedModeKind',
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
  'resultDecision',
  'modeRegistryCandidate',
  'raceParticipantCount',
  'survivalEnemyCount',
  'maxEventCount',
  'qualityTier',
  'preferences',
  'keyPrefix',
  'leaseDurationMs',
  'leaseTakeoverSameOwner',
  'inputMode',
  'controlLayout',
  'reservedInputBottomCssPixels',
  'assetLoader',
  'retentionObservationCollector',
  'offlineRetentionObservationJournal',
  'weaponResearchPacePageBaselineToken',
  'registryBootstrapOptions',
  'registryBootstrap',
  'onSurfaceChange',
  'onError',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'hostRoot',
  'seedSource',
  'storage',
  'ownerId',
  'wallNow',
] as const);
const OFFLINE_RETENTION_JOURNAL_OPTION_KEYS = new Set([
  'cohortSubjectId',
  'capacity',
  'keyPrefix',
  'leaseDurationMs',
  'leaseTakeoverSameOwner',
]);
const SURFACE_CHANGE_KEYS = new Set(['surface', 'outcome']);
const MATCH_OUTCOME_KEYS = new Set([
  'information', 'hud', 'scene', 'weaponFeedbackDirectionFactsV2',
]);
const SCENE_KEYS = new Set([
  'schemaVersion', 'status', 'source', 'world', 'localAction',
  'localJumpAvailability', 'localParticipantId', 'events', 'result',
]);
const SCENE_REQUIRED_KEYS = new Set([
  'schemaVersion', 'status', 'source', 'world', 'localAction',
  'localJumpAvailability', 'localParticipantId', 'events', 'result',
]);
const SCENE_SOURCE_KEYS = new Set([
  'matchSeed', 'tick', 'eventSequence', 'modeDefinitionId', 'mapDefinitionId',
]);
const LOCAL_ACTION_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'participantId', 'profile',
  'primaryActionDefinitionId', 'channels',
]);
const LOCAL_ACTION_CHANNEL_KEYS = new Set(['primary', 'primaryHold']);
const ACTION_AFFORDANCE_KEYS = new Set([
  'kind', 'actionDefinitionId', 'lane', 'source', 'reason',
]);
const LOCAL_PARTICIPANT_ACTION_KEYS = new Set([
  'definitionId', 'phase', 'ticksRemaining', 'commitment',
]);
const LOCAL_PARTICIPANT_ACTION_REQUIRED_KEYS = new Set([
  'definitionId', 'phase', 'ticksRemaining',
]);
const ACTION_COMMITMENT_KEYS = new Set([
  'status', 'chargeTicks', 'chargeLevel', 'facingAtStart', 'facingAtResult',
]);
const VECTOR2_KEYS = new Set(['x', 'z']);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function hostRoot(value: unknown): HTMLElement {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || typeof (value as HTMLElement).append !== 'function'
    || typeof (value as HTMLElement).getBoundingClientRect !== 'function'
  ) throw new TypeError('Arena V2 formal Web playable composition需要HTMLElement根节点。');
  const root = value as HTMLElement;
  if (!root.ownerDocument?.defaultView) {
    throw new TypeError('Arena V2 formal Web playable composition根节点缺少Document/Window。');
  }
  return root;
}

function formalCollectionAssetSourceUrl(sourceKeyValue: unknown, baseUrl: string): string {
  if (
    typeof sourceKeyValue !== 'string'
    || (!sourceKeyValue.startsWith('./assets/') && !sourceKeyValue.startsWith('assets/'))
  ) {
    throw new RangeError('Arena V2 collection preview只允许读取assets/内的正式模型。');
  }
  const pathname = sourceKeyValue.split(/[?#]/u, 1)[0] ?? '';
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch (cause) {
    const failure = new RangeError('Arena V2 collection preview模型路径编码无效。');
    failure.cause = cause;
    throw failure;
  }
  if (
    pathname.includes('\\')
    || decodedPathname.includes('\\')
    || decodedPathname.split('/').includes('..')
  ) {
    throw new RangeError('Arena V2 collection preview拒绝模型路径逃逸。');
  }
  return new URL(sourceKeyValue, baseUrl).href;
}

function syncFunction(value: unknown, name: string): SyncFunction {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncFunction;
}

function exactDataRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
    dataField(source, key, name);
  }
  return source;
}

function exactOptionalDataRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, allowedKeys, name);
  for (const key of Reflect.ownKeys(source)) {
    if (typeof key !== 'string') throw new TypeError(`${name}不得包含Symbol字段。`);
    dataField(source, key, name);
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function nonEmptyIdentity(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    throw new TypeError(`${name}必须是1..256字符字符串。`);
  }
  return value;
}

function safeAuthorityInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function nullableIdentity(value: unknown, name: string): string | null {
  return value === null ? null : nonEmptyIdentity(value, name);
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name}必须是有限数。`);
  }
  return value;
}

function authorityVector2(value: unknown, name: string): void {
  const source = exactDataRecord(value, VECTOR2_KEYS, name);
  finiteNumber(source.x, `${name}.x`);
  finiteNumber(source.z, `${name}.z`);
}

function localPrimaryCommitmentGestureHint(
  worldValue: unknown,
  localParticipantId: string,
): 'hold' | 'release' | null {
  const world = assertPlainRecord(
    worldValue,
    'Arena V2 formal Web primary availability Scene.world',
  );
  const participants = dataField(
    world,
    'participants',
    'Arena V2 formal Web primary availability Scene.world',
  );
  if (!Array.isArray(participants)) {
    throw new TypeError('Arena V2 formal Web primary availability participants必须是数组。');
  }
  let localParticipant: Record<string, unknown> | null = null;
  for (const [index, value] of participants.entries()) {
    const name = `Arena V2 formal Web primary availability participants[${index}]`;
    const participant = assertPlainRecord(value, name);
    const participantId = nonEmptyIdentity(dataField(participant, 'id', name), `${name}.id`);
    if (participantId !== localParticipantId) continue;
    if (localParticipant !== null) {
      throw new RangeError('Arena V2 formal Web primary availability本地参与者重复。');
    }
    if (dataField(participant, 'local', name) !== true) {
      throw new RangeError('Arena V2 formal Web primary availability本地参与者标记漂移。');
    }
    localParticipant = participant;
  }
  if (localParticipant === null) {
    throw new RangeError('Arena V2 formal Web primary availability缺少本地参与者。');
  }
  const action = exactOptionalDataRecord(
    dataField(
      localParticipant,
      'action',
      'Arena V2 formal Web primary availability local participant',
    ),
    LOCAL_PARTICIPANT_ACTION_KEYS,
    LOCAL_PARTICIPANT_ACTION_REQUIRED_KEYS,
    'Arena V2 formal Web primary availability local participant.action',
  );
  const definitionId = nullableIdentity(
    action.definitionId,
    'Arena V2 formal Web primary availability local action.definitionId',
  );
  const phase = assertArenaActionPhase(
    action.phase,
    'Arena V2 formal Web primary availability local action.phase',
  );
  safeAuthorityInteger(
    action.ticksRemaining,
    'Arena V2 formal Web primary availability local action.ticksRemaining',
  );
  if (!Object.hasOwn(action, 'commitment')) return null;
  const commitment = exactDataRecord(
    action.commitment,
    ACTION_COMMITMENT_KEYS,
    'Arena V2 formal Web primary availability local action.commitment',
  );
  if (commitment.status !== 'charging' && commitment.status !== 'committed') {
    throw new RangeError('Arena V2 formal Web primary availability commitment状态无效。');
  }
  safeAuthorityInteger(
    commitment.chargeTicks,
    'Arena V2 formal Web primary availability commitment.chargeTicks',
  );
  const chargeLevel = safeAuthorityInteger(
    commitment.chargeLevel,
    'Arena V2 formal Web primary availability commitment.chargeLevel',
  );
  authorityVector2(
    commitment.facingAtStart,
    'Arena V2 formal Web primary availability commitment.facingAtStart',
  );
  authorityVector2(
    commitment.facingAtResult,
    'Arena V2 formal Web primary availability commitment.facingAtResult',
  );
  if (definitionId === null || phase !== ARENA_ACTION_PHASE.WINDUP) {
    throw new RangeError('Arena V2 formal Web primary availability commitment动作身份无效。');
  }
  if (commitment.status !== 'charging') return null;
  return chargeLevel > 0 ? 'release' : 'hold';
}

function actionAffordanceKind(value: unknown, name: string): 'selected' | 'ignored' | 'none' {
  const source = exactDataRecord(value, ACTION_AFFORDANCE_KEYS, name);
  const kind = source.kind;
  if (kind !== 'selected' && kind !== 'ignored' && kind !== 'none') {
    throw new RangeError(`${name}.kind无效。`);
  }
  const identities = [
    nullableIdentity(source.actionDefinitionId, `${name}.actionDefinitionId`),
    nullableIdentity(source.lane, `${name}.lane`),
    nullableIdentity(source.source, `${name}.source`),
  ];
  nonEmptyIdentity(source.reason, `${name}.reason`);
  const identityCount = identities.filter((identity) => identity !== null).length;
  if (kind === 'selected' && identityCount !== 3) {
    throw new RangeError(`${name}.selected必须携带完整动作身份。`);
  }
  if (kind === 'none' && identityCount !== 0) {
    throw new RangeError(`${name}.none不得携带动作身份。`);
  }
  if (kind === 'ignored' && identityCount !== 0 && identityCount !== 3) {
    throw new RangeError(`${name}.ignored动作身份必须全空或完整。`);
  }
  return kind;
}

export function projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
  value: unknown,
): ArenaV2FormalWebPrimaryActionAvailabilitySnapshotCandidateV1 {
  rejectThenable(value, 'Arena V2 formal Web primary availability Scene');
  const scene = exactOptionalDataRecord(
    value,
    SCENE_KEYS,
    SCENE_REQUIRED_KEYS,
    'Arena V2 formal Web primary availability Scene',
  );
  if (scene.schemaVersion !== 1 || scene.status !== 'production-unreachable') {
    throw new RangeError('Arena V2 formal Web primary availability只接受Scene V1候选。');
  }
  const source = exactDataRecord(
    scene.source,
    SCENE_SOURCE_KEYS,
    'Arena V2 formal Web primary availability Scene.source',
  );
  safeAuthorityInteger(source.matchSeed, 'Scene.source.matchSeed');
  const tick = safeAuthorityInteger(source.tick, 'Scene.source.tick');
  const eventSequence = safeAuthorityInteger(
    source.eventSequence,
    'Scene.source.eventSequence',
  );
  nonEmptyIdentity(source.modeDefinitionId, 'Scene.source.modeDefinitionId');
  nonEmptyIdentity(source.mapDefinitionId, 'Scene.source.mapDefinitionId');
  const localParticipantId = nonEmptyIdentity(
    scene.localParticipantId,
    'Scene.localParticipantId',
  );
  const localAction = exactDataRecord(
    scene.localAction,
    LOCAL_ACTION_KEYS,
    'Arena V2 formal Web primary availability Scene.localAction',
  );
  if (localAction.schemaVersion !== MATCH_READ_FRAME_V3_SCHEMA_VERSION
    || localAction.profile !== ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY) {
    throw new RangeError('Arena V2 formal Web primary availability localAction身份无效。');
  }
  if (safeAuthorityInteger(localAction.tick, 'Scene.localAction.tick') !== tick
    || safeAuthorityInteger(
      localAction.eventSequence,
      'Scene.localAction.eventSequence',
    ) !== eventSequence) {
    throw new RangeError('Arena V2 formal Web primary availability localAction tick水位漂移。');
  }
  const participantId = nonEmptyIdentity(
    localAction.participantId,
    'Scene.localAction.participantId',
  );
  if (participantId !== localParticipantId) {
    throw new RangeError('Arena V2 formal Web primary availability local participant漂移。');
  }
  const primaryActionDefinitionId = nullableIdentity(
    localAction.primaryActionDefinitionId,
    'Scene.localAction.primaryActionDefinitionId',
  );
  const channels = exactDataRecord(
    localAction.channels,
    LOCAL_ACTION_CHANNEL_KEYS,
    'Arena V2 formal Web primary availability Scene.localAction.channels',
  );
  const primaryKind = actionAffordanceKind(
    channels.primary,
    'Arena V2 formal Web primary availability Scene.localAction.channels.primary',
  );
  const primaryHoldKind = actionAffordanceKind(
    channels.primaryHold,
    'Arena V2 formal Web primary availability Scene.localAction.channels.primaryHold',
  );
  const primary = channels.primary as Record<string, unknown>;
  if (primaryKind === 'none' && primaryActionDefinitionId !== null) {
    throw new RangeError('Arena V2 formal Web primary none不得携带primaryActionDefinitionId。');
  }
  if (primary.actionDefinitionId !== null
    && primary.actionDefinitionId !== primaryActionDefinitionId) {
    throw new RangeError('Arena V2 formal Web primary动作身份漂移。');
  }
  const primaryCommitmentGestureHint = localPrimaryCommitmentGestureHint(
    scene.world,
    localParticipantId,
  );
  const primaryAffordanceAvailable = primaryKind === 'selected' || primaryHoldKind === 'selected';
  return Object.freeze({
    schemaVersion: 1 as const,
    tick,
    participantId,
    state: primaryAffordanceAvailable || primaryCommitmentGestureHint !== null
      ? 'ready' as const
      : 'blocked' as const,
    gestureHint: primaryCommitmentGestureHint ?? ('press' as const),
  });
}

export interface ArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1 {
  readonly movement: ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1;
  readonly jump: ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1;
}

export function projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1(
  value: unknown,
): ArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1 {
  rejectThenable(value, 'Arena V2 formal Web movement/jump availability Scene');
  const scene = exactOptionalDataRecord(
    value,
    SCENE_KEYS,
    SCENE_REQUIRED_KEYS,
    'Arena V2 formal Web movement/jump availability Scene',
  );
  if (scene.schemaVersion !== 1 || scene.status !== 'production-unreachable') {
    throw new RangeError('Arena V2 formal Web movement/jump availability只接受Scene V1候选。');
  }
  const source = exactDataRecord(
    scene.source,
    SCENE_SOURCE_KEYS,
    'Arena V2 formal Web movement/jump availability Scene.source',
  );
  safeAuthorityInteger(source.matchSeed, 'Scene.source.matchSeed');
  const tick = safeAuthorityInteger(source.tick, 'Scene.source.tick');
  const eventSequence = safeAuthorityInteger(
    source.eventSequence,
    'Scene.source.eventSequence',
  );
  nonEmptyIdentity(source.modeDefinitionId, 'Scene.source.modeDefinitionId');
  nonEmptyIdentity(source.mapDefinitionId, 'Scene.source.mapDefinitionId');
  const localParticipantId = nonEmptyIdentity(
    scene.localParticipantId,
    'Scene.localParticipantId',
  );
  if (!Object.hasOwn(scene, 'localJumpAvailability')) {
    throw new RangeError('Arena V2 formal Web movement/jump availability缺少权威capability。');
  }
  const authority = createArenaLocalJumpAvailabilityV1(scene.localJumpAvailability);
  if (
    authority.tick !== tick
    || authority.eventSequence !== eventSequence
    || authority.participantId !== localParticipantId
  ) {
    throw new RangeError('Arena V2 formal Web movement/jump availability与Scene身份漂移。');
  }
  return Object.freeze({
    movement: Object.freeze({
      schemaVersion: 1 as const,
      tick,
      participantId: localParticipantId,
      state: authority.canMove ? 'ready' as const : 'blocked' as const,
    }),
    jump: Object.freeze({
      schemaVersion: 1 as const,
      tick,
      participantId: localParticipantId,
      state: authority.state,
    }),
  });
}

export function projectArenaV2FormalWebMovementAvailabilityCandidateV1(
  value: unknown,
): ArenaV2FormalWebMovementAvailabilitySnapshotCandidateV1 {
  return projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1(value).movement;
}

export function projectArenaV2FormalWebJumpAvailabilityCandidateV1(
  value: unknown,
): ArenaV2FormalWebJumpAvailabilitySnapshotCandidateV1 {
  return projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1(value).jump;
}

function sceneFromMatchOutcome(value: unknown): unknown {
  rejectThenable(value, 'Arena V2 formal Web match outcome');
  const source = exactDataRecord(value, MATCH_OUTCOME_KEYS, 'Arena V2 formal Web match outcome');
  return dataField(source, 'scene', 'Arena V2 formal Web match outcome');
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的有限数。`);
  }
  return value;
}

function offlineRetentionJournalOptions(value: unknown): Readonly<Record<string, unknown>> {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena V2 formal Web offline retention journal options'),
    'Arena V2 formal Web offline retention journal options',
  );
  assertKnownKeys(
    source,
    OFFLINE_RETENTION_JOURNAL_OPTION_KEYS,
    'Arena V2 formal Web offline retention journal options',
  );
  if (!Object.hasOwn(source, 'cohortSubjectId')) {
    throw new TypeError('Arena V2 formal Web offline retention journal缺少cohortSubjectId。');
  }
  for (const key of Object.keys(source)) {
    dataField(source, key, 'Arena V2 formal Web offline retention journal options');
  }
  return source;
}

function surfaceChange(value: unknown): Readonly<{
  readonly surface: ActiveSurface;
  readonly outcome: unknown;
}> {
  const source = assertPlainRecord(value, 'Arena V2 formal Web surface change');
  assertKnownKeys(source, SURFACE_CHANGE_KEYS, 'Arena V2 formal Web surface change');
  for (const key of SURFACE_CHANGE_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`Arena V2 surface change缺少${key}。`);
    dataField(source, key, 'Arena V2 formal Web surface change');
  }
  const surface = dataField(source, 'surface', 'Arena V2 formal Web surface change');
  if (surface !== 'information' && surface !== 'match') {
    throw new RangeError('Arena V2 formal Web surface change.surface无效。');
  }
  return Object.freeze({
    surface,
    outcome: dataField(source, 'outcome', 'Arena V2 formal Web surface change'),
  });
}

function requestedInputMode(value: unknown): RequestedInputMode {
  if (value === undefined) return 'adaptive';
  if (value !== 'keyboard' && value !== 'pointer' && value !== 'adaptive') {
    throw new RangeError('Arena V2 formal Web playable composition inputMode无效。');
  }
  return value;
}

function resolveInputMode(value: RequestedInputMode, windowObject: Window): InputMode {
  if (value !== 'adaptive') return value;
  try {
    if (windowObject.navigator.maxTouchPoints > 0) return 'pointer';
  } catch { /* 使用指针媒体查询或键盘保守值。 */ }
  try {
    if (windowObject.matchMedia('(pointer: coarse)').matches) return 'pointer';
  } catch { /* 缺少matchMedia时使用键盘。 */ }
  return 'keyboard';
}

function bindArenaV2KeyboardVisibilityListenersCandidateV1(
  registrations: readonly Readonly<{
    target: EventTarget;
    type: string;
    listener: EventListener;
  }>[],
  name: string,
): () => void {
  const pending: Array<{
    readonly target: EventTarget;
    readonly type: string;
    readonly listener: EventListener;
    owned: boolean;
  }> = [];
  const cleanup = (): void => {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const record = pending[index]!;
      if (!record.owned) continue;
      rejectThenable(
        record.target.removeEventListener(record.type, record.listener),
        `${name} removeEventListener(${record.type})`,
      );
      record.owned = false;
    }
  };
  try {
    for (const registration of registrations) {
      const record = {
        ...registration,
        owned: true,
      };
      pending.push(record);
      rejectThenable(
        record.target.addEventListener(record.type, record.listener),
        `${name} addEventListener(${record.type})`,
      );
    }
  } catch (error) {
    try {
      cleanup();
    } catch (cleanupError) {
      throw new ArenaV2KeyboardVisibilityRegistrationCleanupFailureCandidateV1(
        error,
        cleanupError,
        cleanup,
      );
    }
    throw error;
  }
  return cleanup;
}

function normalizeCompositionFailure(value: unknown, message: string): Error {
  try {
    if (value instanceof Error) return value;
  } catch { /* hostile thrown values must not replace the original failure. */ }
  const error = new Error(message) as Error & { readonly originalError: unknown };
  Object.defineProperty(error, 'originalError', {
    value,
    enumerable: false,
  });
  return error;
}

function aggregate(
  message: string,
  cause: unknown,
  cleanupErrors: readonly unknown[],
): never {
  const normalizedCause = normalizeCompositionFailure(
    cause,
    'Arena V2 formal Web playable composition失败。',
  );
  if (cleanupErrors.length === 0) throw normalizedCause;
  throw new AggregateError([
    normalizedCause,
    ...cleanupErrors.map((error) => normalizeCompositionFailure(
      error,
      'Arena V2 formal Web playable composition清理失败。',
    )),
  ], message);
}

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

interface FormalWebPlayableConstructionCleanupResourcesCandidateV1 {
  resizeCleanup: (() => void) | null;
  resizeCleanupCompleted: boolean;
  driver: LocalMatchDriver | null;
  binding: ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1 | null;
  characterPreviewSurface:
    ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1 | null;
  collectionPreviewSurface:
    ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1 | null;
  informationSurface: ArenaV2InformationDomSurfaceCandidateV1 | null;
  characterPreviewRendererCleanup: (() => void) | null;
  collectionPreviewRendererCleanup: (() => void) | null;
  matchHost: ArenaV2FormalWebMatchHostCandidateV1 | null;
  downstreamConstructionDebt:
    ArenaV2FormalWebMatchHostConstructionCleanupFailureCandidateV1
    | ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1
    | ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1
    | null;
  registryOwner: ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1 | null;
  localHost: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null;
  offlineRetentionObservationJournal:
    ArenaV2OfflineRetentionObservationJournalCandidateV1 | null;
  offlineWeaponResearchPaceBaselineStore:
    ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1 | null;
  pointerSurfaceConstructionDebt:
    ArenaV2FormalWebPointerSurfaceConstructionCleanupFailureCandidateV1 | null;
  pointerSurface: ArenaV2FormalWebPointerSurfaceCandidateV1 | null;
  container: HTMLDivElement | null;
}

function formalWebPlayableConstructionCleanupCompleteCandidateV1(
  resources: FormalWebPlayableConstructionCleanupResourcesCandidateV1,
): boolean {
  return resources.resizeCleanupCompleted
    && resources.driver === null
    && resources.binding === null
    && resources.characterPreviewSurface === null
    && resources.collectionPreviewSurface === null
    && resources.informationSurface === null
    && resources.characterPreviewRendererCleanup === null
    && resources.collectionPreviewRendererCleanup === null
    && resources.matchHost === null
    && resources.downstreamConstructionDebt === null
    && resources.registryOwner === null
    && resources.localHost === null
    && resources.offlineWeaponResearchPaceBaselineStore === null
    && resources.offlineRetentionObservationJournal === null
    && resources.pointerSurfaceConstructionDebt === null
    && resources.pointerSurface === null
    && resources.container === null;
}

function clearFormalWebPlayableBindingOwnedTreeCandidateV1(
  resources: FormalWebPlayableConstructionCleanupResourcesCandidateV1,
): void {
  resources.driver = null;
  resources.binding = null;
  resources.characterPreviewSurface = null;
  resources.collectionPreviewSurface = null;
  resources.informationSurface = null;
  resources.characterPreviewRendererCleanup = null;
  resources.collectionPreviewRendererCleanup = null;
  resources.matchHost = null;
  resources.downstreamConstructionDebt = null;
  resources.registryOwner = null;
  resources.localHost = null;
}

function cleanupFormalWebPlayableConstructionResourcesCandidateV1(
  resources: FormalWebPlayableConstructionCleanupResourcesCandidateV1,
): void {
  if (!resources.resizeCleanupCompleted) {
    if (resources.resizeCleanup === null) {
      resources.resizeCleanupCompleted = true;
    } else {
      rejectThenable(
        resources.resizeCleanup(),
        'Arena V2 formal Web playable construction resize cleanup',
      );
      resources.resizeCleanup = null;
      resources.resizeCleanupCompleted = true;
    }
  }

  if (resources.resizeCleanupCompleted && resources.driver !== null) {
    rejectThenable(
      resources.driver.dispose(),
      'Arena V2 formal Web playable construction driver.dispose()',
    );
    clearFormalWebPlayableBindingOwnedTreeCandidateV1(resources);
  } else if (resources.resizeCleanupCompleted && resources.binding !== null) {
    rejectThenable(
      resources.binding.dispose(),
      'Arena V2 formal Web playable construction binding.dispose()',
    );
    clearFormalWebPlayableBindingOwnedTreeCandidateV1(resources);
  }

  if (resources.resizeCleanupCompleted
    && resources.driver === null
    && resources.binding === null) {
    if (resources.characterPreviewSurface !== null) {
      rejectThenable(
        resources.characterPreviewSurface.dispose(),
        'Arena V2 formal Web playable construction character preview.dispose()',
      );
      resources.characterPreviewSurface = null;
      resources.collectionPreviewSurface = null;
      resources.informationSurface = null;
      resources.characterPreviewRendererCleanup = null;
      resources.collectionPreviewRendererCleanup = null;
    } else if (resources.collectionPreviewSurface !== null) {
      rejectThenable(
        resources.collectionPreviewSurface.dispose(),
        'Arena V2 formal Web playable construction collection preview.dispose()',
      );
      resources.collectionPreviewSurface = null;
      resources.informationSurface = null;
      resources.collectionPreviewRendererCleanup = null;
    } else {
      if (resources.characterPreviewRendererCleanup !== null) {
        rejectThenable(
          resources.characterPreviewRendererCleanup(),
          'Arena V2 formal Web playable construction character preview renderer cleanup',
        );
        resources.characterPreviewRendererCleanup = null;
      }
      if (resources.collectionPreviewRendererCleanup !== null) {
        rejectThenable(
          resources.collectionPreviewRendererCleanup(),
          'Arena V2 formal Web playable construction collection preview renderer cleanup',
        );
        resources.collectionPreviewRendererCleanup = null;
      }
      if (resources.characterPreviewRendererCleanup === null
        && resources.collectionPreviewRendererCleanup === null
        && resources.informationSurface !== null) {
        rejectThenable(
          resources.informationSurface.dispose(),
          'Arena V2 formal Web playable construction information surface.dispose()',
        );
        resources.informationSurface = null;
      }
    }

    const presentationReleased = resources.characterPreviewSurface === null
      && resources.collectionPreviewSurface === null
      && resources.informationSurface === null
      && resources.characterPreviewRendererCleanup === null
      && resources.collectionPreviewRendererCleanup === null;
    if (presentationReleased && resources.downstreamConstructionDebt !== null) {
      const debt = resources.downstreamConstructionDebt;
      if (!debt.cleanupComplete) {
        rejectThenable(
          debt.retryCleanup(),
          'Arena V2 formal Web downstream construction debt.retryCleanup()',
        );
      }
      if (!debt.cleanupComplete) {
        throw new Error('Arena V2 formal Web下游构造债务尚未收敛。');
      }
      resources.downstreamConstructionDebt = null;
    }
    if (presentationReleased && resources.downstreamConstructionDebt === null) {
      if (resources.registryOwner !== null) {
        rejectThenable(
          resources.registryOwner.destroy(),
          'Arena V2 formal Web playable construction registry owner.destroy()',
        );
        resources.registryOwner = null;
        resources.localHost = null;
      } else if (resources.localHost !== null) {
        rejectThenable(
          resources.localHost.destroy(),
          'Arena V2 formal Web playable construction local host.destroy()',
        );
        resources.localHost = null;
      }
      if (resources.registryOwner === null
        && resources.localHost === null
        && resources.matchHost !== null) {
        rejectThenable(
          resources.matchHost.dispose(),
          'Arena V2 formal Web playable construction match host.dispose()',
        );
        resources.matchHost = null;
      }
    }
  }

  const ownerTreeReleased = resources.resizeCleanupCompleted
    && resources.driver === null
    && resources.binding === null
    && resources.characterPreviewSurface === null
    && resources.collectionPreviewSurface === null
    && resources.informationSurface === null
    && resources.characterPreviewRendererCleanup === null
    && resources.collectionPreviewRendererCleanup === null
    && resources.matchHost === null
    && resources.downstreamConstructionDebt === null
    && resources.registryOwner === null
    && resources.localHost === null;
  if (ownerTreeReleased
    && resources.offlineWeaponResearchPaceBaselineStore !== null) {
    rejectThenable(
      resources.offlineWeaponResearchPaceBaselineStore.destroy(),
      'Arena V2 formal Web playable construction weapon pace baseline store.destroy()',
    );
    resources.offlineWeaponResearchPaceBaselineStore = null;
  }
  if (ownerTreeReleased
    && resources.offlineWeaponResearchPaceBaselineStore === null
    && resources.offlineRetentionObservationJournal !== null) {
    rejectThenable(
      resources.offlineRetentionObservationJournal.destroy(),
      'Arena V2 formal Web playable construction retention journal.destroy()',
    );
    resources.offlineRetentionObservationJournal = null;
  }
  if (ownerTreeReleased
    && resources.offlineWeaponResearchPaceBaselineStore === null
    && resources.offlineRetentionObservationJournal === null
    && resources.pointerSurfaceConstructionDebt !== null) {
    const debt = resources.pointerSurfaceConstructionDebt;
    if (!debt.cleanupComplete) {
      rejectThenable(
        debt.retryCleanup(),
        'Arena V2 formal Web playable construction pointer debt.retryCleanup()',
      );
    }
    if (!debt.cleanupComplete) {
      throw new Error('Arena V2 formal Web pointer surface构造债务尚未收敛。');
    }
    resources.pointerSurfaceConstructionDebt = null;
  }
  if (ownerTreeReleased && resources.pointerSurface !== null) {
    rejectThenable(
      resources.pointerSurface.dispose(),
      'Arena V2 formal Web playable construction pointer surface.dispose()',
    );
    resources.pointerSurface = null;
  }
  if (ownerTreeReleased
    && resources.offlineWeaponResearchPaceBaselineStore === null
    && resources.offlineRetentionObservationJournal === null
    && resources.pointerSurfaceConstructionDebt === null
    && resources.pointerSurface === null
    && resources.container !== null) {
    rejectThenable(
      resources.container.remove(),
      'Arena V2 formal Web playable construction container.remove()',
    );
    resources.container = null;
  }
  if (!formalWebPlayableConstructionCleanupCompleteCandidateV1(resources)) {
    throw new Error('Arena V2 formal Web playable composition构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: Error;
  readonly cleanupError: unknown;
  readonly ownsTransferredRegistryBootstrap: boolean;
  readonly #resources: FormalWebPlayableConstructionCleanupResourcesCandidateV1;
  readonly #retryCleanupOperation: () => void;

  constructor(
    originalError: Error,
    cleanupError: unknown,
    resources: FormalWebPlayableConstructionCleanupResourcesCandidateV1,
    retryCleanupOperation: () => void,
    ownsTransferredRegistryBootstrap: boolean,
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 formal Web playable composition构造失败且反向清理不完整。',
    );
    this.name =
      'ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.ownsTransferredRegistryBootstrap = ownsTransferredRegistryBootstrap;
    this.#resources = resources;
    this.#retryCleanupOperation = retryCleanupOperation;
  }

  get cleanupComplete(): boolean {
    return formalWebPlayableConstructionCleanupCompleteCandidateV1(this.#resources);
  }

  retryCleanup(): void {
    if (this.cleanupComplete) return;
    this.#retryCleanupOperation();
  }
}

/**
 * One owner for the current Arena V2 browser candidate: eleven information
 * pages, local profiles, deterministic three-mode authority, adaptive
 * fixed-tick keyboard/pointer input, formal Three scene, HUD, Web Audio and
 * tick-driven VFX.
 * It remains unreachable from the default entry until the remaining visual,
 * audio and device approval gates are closed.
 */
export class ArenaV2FormalWebPlayableCompositionCandidateV1 {
  readonly #hostRoot: HTMLElement;
  readonly #container: HTMLDivElement;
  readonly #informationRoot: HTMLDivElement;
  readonly #rendererCanvas: HTMLCanvasElement;
  readonly #hudCanvas: HTMLCanvasElement;
  readonly #collectionPreviewCanvas: HTMLCanvasElement;
  readonly #characterPreviewCanvas: HTMLCanvasElement;
  readonly #collectionPreviewSurface:
    ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1;
  readonly #characterPreviewSurface:
    ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1;
  readonly #matchHost: ArenaV2FormalWebMatchHostCandidateV1;
  readonly #binding: ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1;
  readonly #localPlayableHost: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1;
  readonly #registryOwner: ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1 | null;
  readonly #offlineRetentionObservationJournal:
    ArenaV2OfflineRetentionObservationJournalCandidateV1 | null;
  readonly #offlineRetentionObservationJournalError: unknown | null;
  readonly #offlineWeaponResearchPaceBaselineStore:
    ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1 | null;
  #offlineWeaponResearchPaceDurableBaselineError: unknown | null;
  readonly #weaponResearchPacePageBaselineToken:
    ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1 | null;
  readonly #weaponResearchPaceBaselineError: unknown | null;
  readonly #driver: LocalMatchDriver;
  readonly #inputMode: InputMode;
  readonly #pointerSurface: ArenaV2FormalWebPointerSurfaceCandidateV1 | null;
  readonly #resizeCleanup: () => void;
  readonly #refreshViewportCache: (force?: boolean) => void;
  readonly #onSurfaceChange: SyncFunction | null;
  readonly #onError: SyncFunction | null;
  #state: CompositionState = 'created';
  #activeSurface: ActiveSurface = 'information';
  #prepareOperation: Promise<this> | null = null;
  #activationOperation: Promise<this> | null = null;
  #assetsPrepared = false;
  #audioActivated = false;
  #lastError: unknown = null;
  #disposing = false;
  #constructionComplete = false;
  #hasConstructionFailure = false;
  #constructionFailure: unknown | null = null;
  #failureShutdownScheduled = false;
  #surfaceTransitioning = false;
  #settlementScheduled = false;
  #collectionPreviewVisibilityRequested = false;
  #characterPreviewVisibilityRequested = false;
  #resizeCleanupCompleted = false;
  #driverDisposed = false;
  #offlineWeaponResearchPaceBaselineStoreDestroyed = false;
  #offlineRetentionObservationJournalDestroyed = false;
  #pointerSurfaceDisposed = false;
  #containerRemoved = false;
  #synchronousOperation: FormalWebSynchronousOperation | null = null;
  #synchronousReentrySequence = 0;
  #synchronousReentryError: Error | null = null;
  #synchronousOperationFailure: unknown = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal Web playable composition options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Web playable composition options');
    for (const key of REQUIRED_OPTION_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena V2 formal Web playable composition缺少${key}。`);
      }
    }
    for (const key of Object.keys(source)) {
      dataField(source, key, 'Arena V2 formal Web playable composition options');
    }
    const hasModeRegistryCandidate = Object.hasOwn(source, 'modeRegistryCandidate');
    const modeRegistryCandidate = hasModeRegistryCandidate
      ? dataField(
        source,
        'modeRegistryCandidate',
        'Arena V2 formal Web playable composition options',
      )
      : undefined;
    const raceParticipantCount = Object.hasOwn(source, 'raceParticipantCount')
      ? dataField(
        source,
        'raceParticipantCount',
        'Arena V2 formal Web playable composition options',
      )
      : undefined;
    const survivalEnemyCount = Object.hasOwn(source, 'survivalEnemyCount')
      ? dataField(
        source,
        'survivalEnemyCount',
        'Arena V2 formal Web playable composition options',
      )
      : undefined;
    if (hasModeRegistryCandidate) {
      if (!Object.hasOwn(source, 'raceParticipantCount')) {
        throw new TypeError(
          'Arena V2 formal Web显式Mode Registry路径缺少raceParticipantCount。',
        );
      }
      if (!Object.hasOwn(source, 'survivalEnemyCount')) {
        throw new TypeError(
          'Arena V2 formal Web显式Mode Registry路径缺少survivalEnemyCount。',
        );
      }
      // This summary is diagnostic only. The Local Host receives the original
      // candidate and counts below and revalidates them before owning resources.
      adaptArenaV2FormalWebModeRegistryPreflightCandidateV1({
        modeRegistryCandidate,
        raceParticipantCount,
        survivalEnemyCount,
      });
    }
    const mount = hostRoot(source.hostRoot);
    const documentObject = mount.ownerDocument;
    const windowObject = documentObject.defaultView!;
    const inputMode = resolveInputMode(requestedInputMode(source.inputMode), windowObject);
    const onSurfaceChange = source.onSurfaceChange === undefined
      ? null
      : syncFunction(
        source.onSurfaceChange,
        'Arena V2 formal Web playable composition onSurfaceChange',
      );
    const onError = source.onError === undefined
      ? null
      : syncFunction(source.onError, 'Arena V2 formal Web playable composition onError');
    const offlineRetentionOptions = source.offlineRetentionObservationJournal === undefined
      ? null
      : offlineRetentionJournalOptions(source.offlineRetentionObservationJournal);
    const inheritedWeaponResearchPacePageBaselineToken =
      source.weaponResearchPacePageBaselineToken === undefined
        ? null
        : source.weaponResearchPacePageBaselineToken;
    if (inheritedWeaponResearchPacePageBaselineToken !== null
      && !(inheritedWeaponResearchPacePageBaselineToken
        instanceof ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1)) {
      throw new TypeError('Arena V2正式Web页面研究节奏基线Token无效。');
    }
    if (offlineRetentionOptions !== null
      && source.retentionObservationCollector !== undefined) {
      throw new RangeError(
        'Arena V2 formal Web不能同时注入Collector并创建离线观察Journal。',
      );
    }
    const reservedInputBottomCssPixels = source.reservedInputBottomCssPixels === undefined
      ? (inputMode === 'pointer' ? 152 : 0)
      : finiteAtLeast(
        source.reservedInputBottomCssPixels,
        0,
        'Arena V2 formal Web playable composition reservedInputBottomCssPixels',
      );

    const container = documentObject.createElement('div');
    container.dataset.arenaV2FormalWebPlayableCompositionCandidate = 'v1';
    Object.assign(container.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      minWidth: '1px',
      minHeight: '1px',
      overflow: 'hidden',
      isolation: 'isolate',
      background: '#192833',
    });
    const rendererCanvas = documentObject.createElement('canvas');
    rendererCanvas.dataset.arenaV2FormalRendererCandidate = 'v1';
    rendererCanvas.setAttribute('aria-hidden', 'true');
    const hudCanvas = documentObject.createElement('canvas');
    hudCanvas.dataset.arenaV2FormalHudCandidate = 'v1';
    hudCanvas.setAttribute('aria-label', '竞技场对局信息');
    const collectionPreviewCanvas = documentObject.createElement('canvas');
    collectionPreviewCanvas.dataset.arenaV2CollectionPreviewCandidate = 'v1';
    collectionPreviewCanvas.setAttribute('aria-hidden', 'true');
    const characterPreviewCanvas = documentObject.createElement('canvas');
    characterPreviewCanvas.dataset.arenaV2CharacterSelectionPreviewCandidate = 'v1';
    characterPreviewCanvas.setAttribute('aria-hidden', 'true');
    const informationRoot = documentObject.createElement('div');
    informationRoot.dataset.arenaV2FormalInformationCandidate = 'v1';
    const safeAreaProbe = documentObject.createElement('div');
    safeAreaProbe.dataset.arenaV2FormalSafeAreaProbeCandidate = 'v1';
    safeAreaProbe.setAttribute('aria-hidden', 'true');
    Object.assign(safeAreaProbe.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '0',
      height: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
    });
    for (const layer of [
      rendererCanvas,
      hudCanvas,
      informationRoot,
      collectionPreviewCanvas,
      characterPreviewCanvas,
    ]) {
      Object.assign(layer.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
      });
    }
    rendererCanvas.style.display = 'none';
    hudCanvas.style.display = 'none';
    hudCanvas.style.pointerEvents = 'none';
    informationRoot.style.display = 'block';
    informationRoot.style.zIndex = '1';
    collectionPreviewCanvas.style.display = 'none';
    collectionPreviewCanvas.style.pointerEvents = 'none';
    collectionPreviewCanvas.style.zIndex = '2';
    collectionPreviewCanvas.style.background = 'transparent';
    characterPreviewCanvas.style.display = 'none';
    characterPreviewCanvas.style.pointerEvents = 'none';
    characterPreviewCanvas.style.zIndex = '2';
    characterPreviewCanvas.style.background = 'transparent';
    container.append(
      rendererCanvas,
      hudCanvas,
      informationRoot,
      collectionPreviewCanvas,
      characterPreviewCanvas,
      safeAreaProbe,
    );

    let cachedInputViewport: Readonly<PresentationInputViewport> | null = null;
    const parseSafeAreaInset = (value: unknown, name: string): number => {
      if (typeof value !== 'string') return 0;
      const normalized = value.trim();
      if (/^[+-]?(?:infinity|nan)px$/iu.test(normalized)) {
        throw new TypeError(`${name}必须是有限CSS像素值。`);
      }
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)px$/u.test(normalized)) return 0;
      const parsed = Number(normalized.slice(0, -2));
      if (!Number.isFinite(parsed)) throw new TypeError(`${name}必须是有限CSS像素值。`);
      if (parsed < 0) throw new RangeError(`${name}不能为负数。`);
      return parsed;
    };
    const refreshViewportCache = (force = false): void => {
      const bounds = container.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      if (!force && cachedInputViewport !== null
        && cachedInputViewport.width === width
        && cachedInputViewport.height === height) return;
      let safeAreaInsets: Readonly<PresentationSafeAreaInsets> = Object.freeze({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
      const getComputedStyleCandidate = windowObject.getComputedStyle;
      if (typeof getComputedStyleCandidate === 'function') {
        let computed: CSSStyleDeclaration | null = null;
        try {
          computed = Reflect.apply(
            getComputedStyleCandidate,
            windowObject,
            [safeAreaProbe],
          ) as CSSStyleDeclaration;
        } catch {
          computed = null;
        }
        if (computed !== null) {
          safeAreaInsets = Object.freeze({
            top: parseSafeAreaInset(computed.paddingTop, 'safe-area-inset-top'),
            right: parseSafeAreaInset(computed.paddingRight, 'safe-area-inset-right'),
            bottom: parseSafeAreaInset(computed.paddingBottom, 'safe-area-inset-bottom'),
            left: parseSafeAreaInset(computed.paddingLeft, 'safe-area-inset-left'),
          });
        }
      }
      cachedInputViewport = cloneViewport({ width, height, safeAreaInsets }, 'Arena V2 Web viewport');
    };
    const inputViewportProvider = (): Readonly<PresentationInputViewport> => {
      refreshViewportCache();
      if (cachedInputViewport === null) {
        throw new Error('Arena V2 Web viewport cache未初始化。');
      }
      return cachedInputViewport;
    };
    const viewportProvider = () => {
      const layout = inputViewportProvider();
      const devicePixelRatio = windowObject.devicePixelRatio;
      return Object.freeze({
        layout,
        pixelRatio: typeof devicePixelRatio === 'number'
          && Number.isFinite(devicePixelRatio)
          && devicePixelRatio > 0
          ? devicePixelRatio
          : 1,
      });
    };
    let matchHost: ArenaV2FormalWebMatchHostCandidateV1 | null = null;
    let localHost: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1 | null = null;
    let registryOwner: ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1 | null = null;
    let offlineRetentionObservationJournal:
      ArenaV2OfflineRetentionObservationJournalCandidateV1 | null = null;
    let offlineRetentionObservationJournalError: unknown = null;
    let offlineWeaponResearchPaceBaselineStore:
      ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1 | null = null;
    let offlineWeaponResearchPaceDurableBaselineError: unknown = null;
    let weaponResearchPacePageBaselineToken =
      inheritedWeaponResearchPacePageBaselineToken;
    let weaponResearchPaceBaselineError: unknown = null;
    let informationSurface: ArenaV2InformationDomSurfaceCandidateV1 | null = null;
    let collectionPreviewRendererCleanup: (() => void) | null = null;
    let collectionPreviewRendererFactoryInvoked = false;
    let collectionPreviewSurface:
      ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1 | null = null;
    let characterPreviewRendererCleanup: (() => void) | null = null;
    let characterPreviewRendererFactoryInvoked = false;
    let characterPreviewSurface:
      ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1 | null = null;
    let binding: ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1 | null = null;
    let driver: LocalMatchDriver | null = null;
    let pointerSurface: ArenaV2FormalWebPointerSurfaceCandidateV1 | null = null;
    let resizeCleanup: (() => void) | null = null;
    let retryConstructionOwnerAfterMatchHostSettles: (() => void) | null = null;
    let constructionOwnerRollbackInProgress = false;
    let constructionOwnerRollbackContinuationRequested = false;
    this.#refreshViewportCache = refreshViewportCache;
    try {
      mount.append(container);
      resizeCleanup = () => {
        windowObject.removeEventListener('resize', this.#handleResize);
      };
      this.#resizeCleanup = resizeCleanup;
      windowObject.addEventListener('resize', this.#handleResize);
      refreshViewportCache(true);
      if (inputMode === 'pointer') {
        pointerSurface = new ArenaV2FormalWebPointerSurfaceCandidateV1({
          hostRoot: container,
          viewportProvider: inputViewportProvider,
          ...(source.controlLayout === undefined ? {} : { layout: source.controlLayout }),
        });
      }
      matchHost = new ArenaV2FormalWebMatchHostCandidateV1({
        rendererCanvas,
        hudCanvas,
        viewportProvider,
        reservedInputBottomCssPixels,
        onTerminalCleanupSettled: () => {
          if (this.#constructionComplete) this.#handleMatchHostTerminalCleanupSettled();
          else if (constructionOwnerRollbackInProgress) {
            constructionOwnerRollbackContinuationRequested = true;
          } else retryConstructionOwnerAfterMatchHostSettles?.();
        },
        ...(source.assetLoader === undefined ? {} : { assetLoader: source.assetLoader }),
      });
      const feedback = matchHost.getFeedbackPorts();
      if (offlineRetentionOptions !== null) {
        try {
          offlineRetentionObservationJournal =
            new ArenaV2OfflineRetentionObservationJournalCandidateV1({
              storage: source.storage,
              ownerId: source.ownerId,
              wallNow: source.wallNow,
              cohortSubjectId: offlineRetentionOptions.cohortSubjectId,
              ...(offlineRetentionOptions.capacity === undefined
                ? {}
                : { capacity: offlineRetentionOptions.capacity }),
              ...(offlineRetentionOptions.keyPrefix === undefined
                ? {}
                : { keyPrefix: offlineRetentionOptions.keyPrefix }),
              ...(offlineRetentionOptions.leaseDurationMs === undefined
                ? {}
                : { leaseDurationMs: offlineRetentionOptions.leaseDurationMs }),
              ...(offlineRetentionOptions.leaseTakeoverSameOwner === undefined
                ? {}
                : {
                  leaseTakeoverSameOwner:
                    offlineRetentionOptions.leaseTakeoverSameOwner,
                }),
            });
          offlineRetentionObservationJournal.open();
        } catch (error) {
          const errors: unknown[] = [error];
          if (offlineRetentionObservationJournal !== null) {
            try { offlineRetentionObservationJournal.destroy(); } catch (cleanupError) {
              errors.push(cleanupError);
            }
          }
          if (errors.length > 1) {
            throw new AggregateError(
              errors,
              'Arena V2 Formal Web离线留存日志初始化失败且清理不完整。',
            );
          }
          offlineRetentionObservationJournal = null;
          offlineRetentionObservationJournalError = error;
        }
      }
      const localPlayableOptions: Omit<
        ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options,
        'registryReference'
      > = {
        seedSource: source.seedSource,
        storage: source.storage,
        ownerId: source.ownerId,
        wallNow: source.wallNow,
        audio: feedback.audio,
        visual: feedback.visual,
        ...(raceParticipantCount === undefined
          ? {}
          : {
            raceParticipantCount: raceParticipantCount as NonNullable<
              ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options[
                'raceParticipantCount'
              ]
            >,
          }),
        ...(survivalEnemyCount === undefined
          ? {}
          : {
            survivalEnemyCount: survivalEnemyCount as NonNullable<
              ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options[
                'survivalEnemyCount'
              ]
            >,
          }),
        ...(hasModeRegistryCandidate ? { modeRegistryCandidate } : {}),
        ...(source.maxEventCount === undefined ? {} : { maxEventCount: source.maxEventCount }),
        ...(source.qualityTier === undefined
          ? {}
          : {
            qualityTier: source.qualityTier as NonNullable<
              ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options['qualityTier']
            >,
          }),
        ...(source.preferences === undefined
          ? {}
          : {
            preferences: source.preferences as NonNullable<
              ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1Options['preferences']
            >,
          }),
        ...(source.keyPrefix === undefined ? {} : { keyPrefix: source.keyPrefix }),
        ...(source.leaseDurationMs === undefined
          ? {}
          : { leaseDurationMs: source.leaseDurationMs }),
        ...(source.leaseTakeoverSameOwner === undefined
          ? {}
          : { leaseTakeoverSameOwner: source.leaseTakeoverSameOwner }),
        ...(offlineRetentionObservationJournal !== null
          ? {
            retentionObservationCollector:
              offlineRetentionObservationJournal.getCollector(),
          }
          : source.retentionObservationCollector === undefined
            ? {}
            : { retentionObservationCollector: source.retentionObservationCollector }),
      };
      const hasRegistryBootstrapOptions = source.registryBootstrapOptions !== undefined;
      const hasTransferredRegistryBootstrap = source.registryBootstrap !== undefined;
      if (hasRegistryBootstrapOptions && hasTransferredRegistryBootstrap) {
        throw new TypeError(
          'Arena V2 Formal Web必须且只能选择新建或移交一个Registry bootstrap。',
        );
      }
      if (!hasRegistryBootstrapOptions && !hasTransferredRegistryBootstrap) {
        localHost = new ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1(
          localPlayableOptions,
        );
      } else {
        registryOwner = new ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1({
          ...(hasTransferredRegistryBootstrap
            ? {
              registryBootstrap: source.registryBootstrap as
                ArenaV2RegistryActiveBootstrapCandidateV1,
            }
            : {
              registryBootstrapOptions: source.registryBootstrapOptions as
                NonNullable<ArenaV2RegistryBackedLocalPlayableOwnerOptionsCandidateV1[
                  'registryBootstrapOptions'
                ]>,
            }),
          localPlayableOptions,
        });
        localHost = registryOwner.localPlayable;
      }
      if (offlineRetentionObservationJournal !== null) {
        if (offlineRetentionOptions === null) {
          throw new Error('Arena V2正式Web离线留存Journal缺少已验证配置。');
        }
        const currentLearningProfile = localHost.getInformationLearningProfileRead();
        let durableBaselineRead: ReturnType<
          ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1['open']
        > | null = null;
        try {
          const journalExport = offlineRetentionObservationJournal.getExportBundle();
          offlineWeaponResearchPaceBaselineStore =
            new ArenaV2OfflineWeaponResearchPaceBaselineStoreCandidateV1({
              storage: source.storage,
              ownerId: source.ownerId,
              wallNow: source.wallNow,
              cohortSubjectId: offlineRetentionOptions.cohortSubjectId,
              ...(offlineRetentionOptions.keyPrefix === undefined
                ? {}
                : { keyPrefix: offlineRetentionOptions.keyPrefix }),
              ...(offlineRetentionOptions.leaseDurationMs === undefined
                ? {}
                : { leaseDurationMs: offlineRetentionOptions.leaseDurationMs }),
              ...(offlineRetentionOptions.leaseTakeoverSameOwner === undefined
                ? {}
                : {
                  leaseTakeoverSameOwner:
                    offlineRetentionOptions.leaseTakeoverSameOwner,
                }),
            });
          durableBaselineRead = offlineWeaponResearchPaceBaselineStore.open({
            profileDefinition: currentLearningProfile.profileDefinition,
            currentProfile: currentLearningProfile.profile,
            sourceJournalRevision: journalExport.revision,
            sourceJournalPayloadHash: journalExport.sourcePayloadHash,
            sourceJournalObservationCount: journalExport.observationCount,
            sourceJournalDroppedObservationCount: journalExport.droppedObservationCount,
            sourceJournalLatestProfileRevision:
              journalExport.observations.at(-1)?.profileRevision ?? null,
            sourceJournalObservations: journalExport.observations,
          });
        } catch (error) {
          const errors: unknown[] = [error];
          if (offlineWeaponResearchPaceBaselineStore !== null) {
            try { offlineWeaponResearchPaceBaselineStore.destroy(); } catch (cleanupError) {
              errors.push(cleanupError);
            }
          }
          if (errors.length > 1) {
            throw new AggregateError(
              errors,
              'Arena V2 Formal Web长期武器研究节奏基线初始化失败且清理不完整。',
            );
          }
          offlineWeaponResearchPaceBaselineStore = null;
          offlineWeaponResearchPaceDurableBaselineError = error;
        }
        try {
          if (weaponResearchPacePageBaselineToken === null) {
            weaponResearchPacePageBaselineToken =
              new ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1({
                profileDefinition: durableBaselineRead?.profileDefinition
                  ?? currentLearningProfile.profileDefinition,
                profile: durableBaselineRead?.baselineProfile
                  ?? currentLearningProfile.profile,
                cohortSubjectId: offlineRetentionOptions.cohortSubjectId,
              });
          } else {
            weaponResearchPacePageBaselineToken.assertCompatibleCurrent(
              currentLearningProfile,
            );
            const inheritedWindow = weaponResearchPacePageBaselineToken.createWindow(
              offlineRetentionOptions.cohortSubjectId as string,
            );
            if (durableBaselineRead !== null
              && inheritedWindow.windowIdentityHash
                !== durableBaselineRead.window.windowIdentityHash) {
              offlineWeaponResearchPaceDurableBaselineError = new RangeError(
                'Arena V2正式Web长期研究节奏基线与本页既有基线不一致。',
              );
              offlineWeaponResearchPaceBaselineStore?.destroy();
              offlineWeaponResearchPaceBaselineStore = null;
              durableBaselineRead = null;
            }
          }
        } catch (error) {
          weaponResearchPaceBaselineError = error;
        }
      }
      informationSurface = new ArenaV2InformationDomSurfaceCandidateV1(informationRoot);
      const collectionPreviewAvailability =
        createArenaV2A6CurrentFormalPreviewAvailabilityV1();
      const collectionPreviewRendererFactory = () => {
        if (collectionPreviewRendererFactoryInvoked) {
          throw new Error('Arena V2 collection preview rendererFactory只能调用一次。');
        }
        collectionPreviewRendererFactoryInvoked = true;
        let renderer: THREE.WebGLRenderer | null = null;
        let rendererDisposed = false;
        let canvasReset = false;
        let canvasDisplayHidden = false;
        let canvasWidthReset = false;
        let canvasHeightReset = false;
        const resetCanvas = (): void => {
          if (canvasReset) return;
          if (!canvasDisplayHidden) {
            collectionPreviewCanvas.style.display = 'none';
            canvasDisplayHidden = true;
          }
          if (!canvasWidthReset) {
            collectionPreviewCanvas.width = 1;
            canvasWidthReset = true;
          }
          if (!canvasHeightReset) {
            collectionPreviewCanvas.height = 1;
            canvasHeightReset = true;
          }
          canvasReset = canvasDisplayHidden && canvasWidthReset && canvasHeightReset;
        };
        const disposeRenderer = (): void => {
          if (rendererDisposed || renderer === null) return;
          renderer.dispose();
          rendererDisposed = true;
        };
        const cleanupRendererAndCanvas = (): void => {
          disposeRenderer();
          resetCanvas();
        };
        try {
          renderer = new THREE.WebGLRenderer({
            canvas: collectionPreviewCanvas,
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
          });
          renderer.setClearColor(0x000000, 0);
          const ownedRenderer = renderer;
          collectionPreviewRendererCleanup = cleanupRendererAndCanvas;
          return Object.freeze({
            setPixelRatio: (ratio: number) => ownedRenderer.setPixelRatio(ratio),
            setSize: (width: number, height: number, updateStyle: false) => (
              ownedRenderer.setSize(width, height, updateStyle)
            ),
            clear: () => ownedRenderer.clear(),
            setScissorTest: (enabled: boolean) => ownedRenderer.setScissorTest(enabled),
            setViewport: (x: number, y: number, width: number, height: number) => (
              ownedRenderer.setViewport(x, y, width, height)
            ),
            setScissor: (x: number, y: number, width: number, height: number) => (
              ownedRenderer.setScissor(x, y, width, height)
            ),
            clearDepth: () => ownedRenderer.clearDepth(),
            render: (scene: THREE.Object3D, camera: THREE.Camera) => (
              ownedRenderer.render(scene, camera)
            ),
            dispose: cleanupRendererAndCanvas,
          });
        } catch (error) {
          const cleanupErrors: unknown[] = [];
          try { cleanupRendererAndCanvas(); } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
          aggregate(
            'Arena V2 collection preview rendererFactory构造失败且Canvas清理不完整。',
            error,
            cleanupErrors,
          );
        }
      };
      collectionPreviewSurface =
        new ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1({
          schemaVersion: 1,
          epochId: 'arena-v2.formal-web.collection-preview.candidate.v1',
          surface: informationSurface,
          rendererFactory: collectionPreviewRendererFactory,
          contextProvider: (request) => {
            const viewportEnvelope = viewportProvider();
            const { width, height } = viewportEnvelope.layout;
            const viewport = width === 390 && height === 844
              ? Object.freeze({
                viewportId: '390x844' as const,
                widthCssPixels: 390,
                heightCssPixels: 844,
              })
              : width === 1440 && height === 900
                ? Object.freeze({
                  viewportId: '1440x900' as const,
                  widthCssPixels: 1440,
                  heightCssPixels: 900,
                })
                : null;
            if (viewport === null) return null;
            const preferences = localHost!.getInformationPresentationPreferencesRead();
            const readInput = createArenaV2CollectionPreviewReadInputCandidateV1({
              host: localHost!,
              epochId: request.epochId,
              tick: request.tick,
              renderPlan: request.sourceRenderPlan,
              formalAssetCatalog: ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
              availability: collectionPreviewAvailability,
              reducedMotion: preferences.reducedMotion,
              muted: !preferences.soundEnabled,
              decorativeAssetState: 'missing',
            });
            if (readInput === null) return null;
            const authoritativePipeline = localHost!.getInformationCurrentScreenPipeline(
              viewportEnvelope.layout,
            );
            return Object.freeze({
              schemaVersion: 1 as const,
              readInput,
              pipelineResult: localHost!.getInformationCurrentScreenBasePipeline(
                viewportEnvelope.layout,
              ),
              authoritativeSourceRenderPlan: authoritativePipeline.renderPlan,
              selectionProjection:
                localHost!.getInformationCurrentScreenSelectionProjection(),
              viewport,
              pixelRatio: Math.min(2, Math.max(0.5, viewportEnvelope.pixelRatio)),
            });
          },
          setPreviewVisible: (visible) => this.#runSynchronousCallback(
            'preview-visibility',
            () => {
              this.#applyCollectionPreviewVisibility(this.#activeSurface, visible);
              this.#collectionPreviewVisibilityRequested = visible;
            },
          ),
          scheduleAfterResourceSettlement: (callback) => {
            const token = windowObject.setTimeout(callback, 0);
            return () => windowObject.clearTimeout(token);
          },
          onFailure: (error) => this.#recordChildCallbackFailure(
            error,
            'Arena V2 collection preview failure callback',
          ),
          ...(source.assetLoader === undefined
            ? {
                readAssetBytes: async (sourceKey: string, signal: AbortSignal) => {
                  const response = await windowObject.fetch(
                    formalCollectionAssetSourceUrl(sourceKey, documentObject.baseURI),
                    { signal },
                  );
                  if (!response.ok) {
                    throw new Error(
                      `Arena V2 collection preview模型读取失败：HTTP ${response.status}。`,
                    );
                  }
                  return response.arrayBuffer();
                },
                createImage: () => documentObject.createElement('img'),
              }
            : { underlyingLoader: source.assetLoader }),
        });
      const characterPreviewRendererFactory = () => {
        if (characterPreviewRendererFactoryInvoked) {
          throw new Error('Arena V2 character preview rendererFactory只能调用一次。');
        }
        characterPreviewRendererFactoryInvoked = true;
        let renderer: THREE.WebGLRenderer | null = null;
        let rendererDisposed = false;
        let canvasReset = false;
        let canvasDisplayHidden = false;
        let canvasWidthReset = false;
        let canvasHeightReset = false;
        const resetCanvas = (): void => {
          if (canvasReset) return;
          if (!canvasDisplayHidden) {
            characterPreviewCanvas.style.display = 'none';
            canvasDisplayHidden = true;
          }
          if (!canvasWidthReset) {
            characterPreviewCanvas.width = 1;
            canvasWidthReset = true;
          }
          if (!canvasHeightReset) {
            characterPreviewCanvas.height = 1;
            canvasHeightReset = true;
          }
          canvasReset = canvasDisplayHidden && canvasWidthReset && canvasHeightReset;
        };
        const disposeRenderer = (): void => {
          if (rendererDisposed || renderer === null) return;
          renderer.dispose();
          rendererDisposed = true;
        };
        const cleanupRendererAndCanvas = (): void => {
          disposeRenderer();
          resetCanvas();
        };
        try {
          renderer = new THREE.WebGLRenderer({
            canvas: characterPreviewCanvas,
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
          });
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.05;
          renderer.setClearColor(0x000000, 0);
          const ownedRenderer = renderer;
          characterPreviewRendererCleanup = cleanupRendererAndCanvas;
          return Object.freeze({
            setPixelRatio: (ratio: number) => ownedRenderer.setPixelRatio(ratio),
            setSize: (width: number, height: number, updateStyle: false) => (
              ownedRenderer.setSize(width, height, updateStyle)
            ),
            clear: () => ownedRenderer.clear(),
            setScissorTest: (enabled: boolean) => ownedRenderer.setScissorTest(enabled),
            setViewport: (x: number, y: number, width: number, height: number) => (
              ownedRenderer.setViewport(x, y, width, height)
            ),
            setScissor: (x: number, y: number, width: number, height: number) => (
              ownedRenderer.setScissor(x, y, width, height)
            ),
            clearDepth: () => ownedRenderer.clearDepth(),
            render: (scene: THREE.Object3D, camera: THREE.Camera) => (
              ownedRenderer.render(scene, camera)
            ),
            dispose: cleanupRendererAndCanvas,
          });
        } catch (error) {
          const cleanupErrors: unknown[] = [];
          try { cleanupRendererAndCanvas(); } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
          aggregate(
            'Arena V2 character preview rendererFactory构造失败且Canvas清理不完整。',
            error,
            cleanupErrors,
          );
        }
      };
      characterPreviewSurface =
        new ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1({
          schemaVersion: 1,
          surface: collectionPreviewSurface,
          mountOwnerFactory: () => (
            matchHost!.createCharacterSelectionFormalPreviewMountOwner()
          ),
          rendererFactory: characterPreviewRendererFactory,
          contextProvider: (request) => {
            const plan = request.sourceRenderPlan;
            if (!plan.identity.startsWith('character-select:selection-character')) return null;
            const panel = plan.primitives.find(({ id }) => (
              id === 'selection:character:formal-preview:panel'
            ));
            if (panel === undefined || panel.kind !== 'panel' || plan.scrollRegion === null) {
              return null;
            }
            const viewportEnvelope = viewportProvider();
            const { width, height } = viewportEnvelope.layout;
            const viewport = width === 390 && height === 844
              ? Object.freeze({
                viewportId: '390x844' as const,
                widthCssPixels: 390 as const,
                heightCssPixels: 844 as const,
              })
              : width === 1440 && height === 900
                ? Object.freeze({
                  viewportId: '1440x900' as const,
                  widthCssPixels: 1440 as const,
                  heightCssPixels: 900 as const,
                })
                : null;
            if (viewport === null) return null;
            const previewRectCssPixels = Object.freeze({
              x: panel.rect.x,
              y: panel.rect.y - request.scrollOffsetCssPixels,
              width: Math.round(panel.rect.width),
              height: Math.round(panel.rect.height),
            });
            const clip = plan.scrollRegion.viewport;
            if (previewRectCssPixels.x < clip.x
              || previewRectCssPixels.y < clip.y
              || previewRectCssPixels.x + previewRectCssPixels.width > clip.x + clip.width
              || previewRectCssPixels.y + previewRectCssPixels.height > clip.y + clip.height) {
              return Object.freeze({
                schemaVersion: 1 as const,
                visibility: 'clipped-or-outside' as const,
              });
            }
            const selection = localHost!.getInformationCurrentScreenSelectionProjection();
            if (selection === null || selection.kind !== 'character') return null;
            const loadout = localHost!.getInformationCharacterPreviewLoadoutRead();
            if (loadout.selectedCharacterDefinitionId !== selection.selectedId) {
              throw new RangeError('Arena V2角色预览的选角与当前Profile已漂移。');
            }
            const preferences = localHost!.getInformationPresentationPreferencesRead();
            return Object.freeze({
              schemaVersion: 1 as const,
              visibility: 'fully-visible' as const,
              characterDefinitionId: selection.selectedId,
              selectedModeKind: loadout.selectedModeKind,
              previewWeaponDefinitionId: loadout.previewWeaponDefinitionId,
              viewport,
              previewRectCssPixels,
              pixelRatio: Math.min(2, Math.max(0.5, viewportEnvelope.pixelRatio)),
              reducedMotion: preferences.reducedMotion,
            });
          },
          setPreviewVisible: (visible) => this.#runSynchronousCallback(
            'preview-visibility',
            () => {
              this.#applyCharacterPreviewVisibility(this.#activeSurface, visible);
              this.#characterPreviewVisibilityRequested = visible;
            },
          ),
          onFailure: (error) => this.#recordChildCallbackFailure(
            error,
            'Arena V2 character preview failure callback',
          ),
        });
      binding = new ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1({
        host: localHost,
        ...(registryOwner === null ? {} : { hostOwner: registryOwner }),
        surface: characterPreviewSurface,
        matchSurface: matchHost,
        initialScreenId: 'loading',
        viewportProvider,
        selectedModeKind: source.selectedModeKind ?? 'duel',
        ...(source.selectedWeaponDefinitionId === undefined
          ? {}
          : { selectedWeaponDefinitionId: source.selectedWeaponDefinitionId }),
        ...(source.selectedMapDefinitionId === undefined
          ? {}
          : { selectedMapDefinitionId: source.selectedMapDefinitionId }),
        resultDecision: source.resultDecision ?? 'play-again',
        preferGoalAlignedResultRecommendation: source.resultDecision === undefined,
        ...(registryOwner === null
          ? {}
          : {
            weaponAvailabilityChangeProvider: () => (
              registryOwner!.snapshot().lastAvailabilityChange
            ),
            matchStartGuard: () => {
              const operations = registryOwner!.snapshot().promotionOperations;
              return Object.freeze({
                allowed: !operations.blocksNewMatchCreation,
                reason: operations.diagnosticReason,
              });
            },
          }),
        onSurfaceChange: (change: unknown) => this.#runSynchronousCallback(
          'surface-change',
          () => this.#handleSurfaceChange(change),
        ),
        onRejected: (error: unknown) => this.#recordChildCallbackFailure(
          error,
          'Arena V2 information binding rejection callback',
        ),
      });
      const sharedDriverOptions = {
        binding,
        requestFrame: (callback: FrameRequestCallback) => windowObject.requestAnimationFrame(callback),
        cancelFrame: (token: number) => windowObject.cancelAnimationFrame(token),
        now: () => windowObject.performance['now'](),
        ownsBinding: true,
        onStep: (outcome: unknown) => this.#runSynchronousCallback(
          'match-step',
          () => this.#handleMatchStep(outcome),
        ),
        onStateChange: (change: unknown) => this.#runSynchronousCallback(
          'driver-state-change',
          () => this.#handleDriverStateChange(change),
        ),
        onError: (error: unknown) => this.#recordChildCallbackFailure(
          error,
          'Arena V2 local match driver error callback',
        ),
      };
      const keyboardVisibilityPlatform = Object.freeze({
        isHidden: () => documentObject.hidden,
        onHide: (callback: () => void) => {
          const visibility: EventListener = () => {
            if (documentObject.hidden) callback();
          };
          const hide: EventListener = () => callback();
          return bindArenaV2KeyboardVisibilityListenersCandidateV1([
            { target: documentObject, type: 'visibilitychange', listener: visibility },
            { target: windowObject, type: 'pagehide', listener: hide },
            { target: windowObject, type: 'blur', listener: hide },
          ], 'Arena V2 formal Web keyboard hide visibility');
        },
        onShow: (callback: () => void) => {
          const visibility: EventListener = () => {
            if (!documentObject.hidden) callback();
          };
          const show: EventListener = () => callback();
          return bindArenaV2KeyboardVisibilityListenersCandidateV1([
            { target: documentObject, type: 'visibilitychange', listener: visibility },
            { target: windowObject, type: 'pageshow', listener: show },
            { target: windowObject, type: 'focus', listener: show },
          ], 'Arena V2 formal Web keyboard show visibility');
        },
      });
      driver = inputMode === 'keyboard'
        ? new ArenaV2LocalMatchKeyboardDriverCandidateV1({
          ...sharedDriverOptions,
          eventTarget: windowObject,
          visibilityPlatform: keyboardVisibilityPlatform,
        })
        : new ArenaV2LocalMatchPointerDriverCandidateV1({
          ...sharedDriverOptions,
          platform: pointerSurface!,
          viewportProvider: inputViewportProvider,
          ...(source.controlLayout === undefined ? {} : { layout: source.controlLayout }),
        });
      this.#hostRoot = mount;
      this.#container = container;
      this.#informationRoot = informationRoot;
      this.#rendererCanvas = rendererCanvas;
      this.#hudCanvas = hudCanvas;
      this.#collectionPreviewCanvas = collectionPreviewCanvas;
      this.#characterPreviewCanvas = characterPreviewCanvas;
      this.#collectionPreviewSurface = collectionPreviewSurface;
      this.#characterPreviewSurface = characterPreviewSurface;
      this.#matchHost = matchHost;
      this.#binding = binding;
      this.#localPlayableHost = localHost;
      this.#registryOwner = registryOwner;
      this.#offlineRetentionObservationJournal = offlineRetentionObservationJournal;
      this.#offlineRetentionObservationJournalError =
        offlineRetentionObservationJournalError;
      this.#offlineWeaponResearchPaceBaselineStore =
        offlineWeaponResearchPaceBaselineStore;
      this.#offlineWeaponResearchPaceDurableBaselineError =
        offlineWeaponResearchPaceDurableBaselineError;
      this.#weaponResearchPacePageBaselineToken =
        weaponResearchPacePageBaselineToken;
      this.#weaponResearchPaceBaselineError = weaponResearchPaceBaselineError;
      this.#driver = driver;
      this.#inputMode = inputMode;
      this.#pointerSurface = pointerSurface;
      this.#onSurfaceChange = onSurfaceChange;
      this.#onError = onError;
      if (this.#hasConstructionFailure) throw this.#constructionFailure;
      this.#constructionComplete = true;
      Object.freeze(this);
    } catch (error) {
      const originalError = normalizeCompositionFailure(
        error,
        'Arena V2 formal Web playable composition构造失败。',
      );
      const ownsTransferredRegistryBootstrap =
        source.registryBootstrap instanceof ArenaV2RegistryActiveBootstrapCandidateV1
        && (registryOwner !== null
          || error instanceof
            ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1
          || error instanceof
            ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1);
      const resources: FormalWebPlayableConstructionCleanupResourcesCandidateV1 = {
        resizeCleanup,
        resizeCleanupCompleted: resizeCleanup === null,
        driver,
        binding,
        characterPreviewSurface,
        collectionPreviewSurface,
        informationSurface,
        characterPreviewRendererCleanup,
        collectionPreviewRendererCleanup,
        matchHost,
        downstreamConstructionDebt:
          error instanceof ArenaV2FormalWebMatchHostConstructionCleanupFailureCandidateV1
            ? error
            : error instanceof
            ArenaV2RegistryBackedLocalPlayableOwnerConstructionCleanupFailureCandidateV1
            ? error
            : error instanceof
                ArenaThreeModeAuthoritativeLocalPlayableHostConstructionCleanupFailureCandidateV1
              ? error
            : null,
        registryOwner,
        localHost,
        offlineWeaponResearchPaceBaselineStore,
        offlineRetentionObservationJournal,
        pointerSurfaceConstructionDebt:
          error instanceof
            ArenaV2FormalWebPointerSurfaceConstructionCleanupFailureCandidateV1
            ? error
            : null,
        pointerSurface,
        container,
      };
      const retryCleanupOperation = (): void => {
        if (constructionOwnerRollbackInProgress) {
          constructionOwnerRollbackContinuationRequested = true;
          return;
        }
        constructionOwnerRollbackInProgress = true;
        try {
          cleanupFormalWebPlayableConstructionResourcesCandidateV1(resources);
          if (formalWebPlayableConstructionCleanupCompleteCandidateV1(resources)) {
            retryConstructionOwnerAfterMatchHostSettles = null;
          }
        } finally {
          constructionOwnerRollbackInProgress = false;
        }
      };
      retryConstructionOwnerAfterMatchHostSettles = () => {
        if (formalWebPlayableConstructionCleanupCompleteCandidateV1(resources)) {
          retryConstructionOwnerAfterMatchHostSettles = null;
          return;
        }
        try {
          retryCleanupOperation();
          if (formalWebPlayableConstructionCleanupCompleteCandidateV1(resources)) {
            retryConstructionOwnerAfterMatchHostSettles = null;
          }
        } catch {
          /* 事件只触发一次推进；剩余债务由同一错误对象显式重试。 */
        }
      };
      try {
        retryCleanupOperation();
      } catch (cleanupError) {
        if (constructionOwnerRollbackContinuationRequested) {
          constructionOwnerRollbackContinuationRequested = false;
          try {
            retryCleanupOperation();
          } catch (continuedCleanupError) {
            throw new ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1(
              originalError,
              new AggregateError(
                [cleanupError, continuedCleanupError],
                'Arena V2 formal Web构造Owner续接清理仍不完整。',
              ),
              resources,
              retryCleanupOperation,
              ownsTransferredRegistryBootstrap,
            );
          }
        } else {
          throw new ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1(
            originalError,
            cleanupError,
            resources,
            retryCleanupOperation,
            ownsTransferredRegistryBootstrap,
          );
        }
      }
      retryConstructionOwnerAfterMatchHostSettles = null;
      throw originalError;
    }
  }

  get state(): CompositionState {
    return this.#runSynchronousOperation('state-read', () => this.#state);
  }
  get activeSurface(): ActiveSurface {
    return this.#runSynchronousOperation('active-surface-read', () => this.#activeSurface);
  }
  get lastError(): unknown {
    return this.#runSynchronousOperation('last-error-read', () => this.#lastError);
  }
  get binding(): ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1 {
    return this.#runSynchronousOperation('binding-read', () => {
      this.#assertUsable('Arena V2 formal Web playable composition binding');
      return this.#binding;
    });
  }

  #assertUsable(operation: string): void {
    if (this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝当前状态${this.#state}。`);
    }
    if (this.#disposing) throw new Error(`${operation}不能与销毁重入。`);
    if (this.#surfaceTransitioning) throw new Error(`${operation}不能与surface change重入。`);
  }

  #assertNoSynchronousOperation(operation: string): void {
    if (this.#synchronousOperation === null) return;
    const error = new Error(
      `Arena V2 formal Web playable composition拒绝${this.#synchronousOperation}`
      + `期间同步重入${operation}。`,
    );
    this.#synchronousReentrySequence += 1;
    this.#synchronousReentryError ??= error;
    throw this.#synchronousReentryError;
  }

  #assertSynchronousOperationCommit(operation: FormalWebSynchronousOperation): void {
    if (this.#synchronousOperation !== operation) {
      throw new Error(
        `Arena V2 formal Web playable composition缺少${operation}操作所有权。`,
      );
    }
    if (this.#synchronousReentryError !== null) throw this.#synchronousReentryError;
  }

  #assertCurrentSynchronousOperationCommit(): void {
    if (this.#synchronousOperation === null) {
      throw new Error('Arena V2 formal Web playable composition缺少当前操作所有权。');
    }
    this.#assertSynchronousOperationCommit(this.#synchronousOperation);
  }

  #runSynchronousOperation<T>(
    operation: FormalWebSynchronousOperation,
    action: () => T,
  ): T {
    this.#assertNoSynchronousOperation(operation);
    this.#synchronousOperation = operation;
    this.#synchronousReentryError = null;
    this.#synchronousOperationFailure = null;
    try {
      const result = action();
      this.#assertSynchronousOperationCommit(operation);
      return result;
    } catch (error) {
      this.#synchronousOperationFailure ??= error;
      throw error;
    } finally {
      const reentryError = this.#synchronousReentryError;
      const operationFailure = this.#synchronousOperationFailure;
      if (reentryError !== null) {
        const failure = operationFailure === null || operationFailure === reentryError
          ? reentryError
          : new AggregateError(
            [operationFailure, reentryError],
            `Arena V2 formal Web playable composition ${operation}`
            + '失败且检测到被子Owner、DOM或Observer吞掉的同步重入。',
          );
        try {
          this.#commitFailure(failure);
        } finally {
          if (this.#synchronousOperation === operation) this.#synchronousOperation = null;
          this.#synchronousReentryError = null;
          this.#synchronousOperationFailure = null;
        }
      }
      if (this.#synchronousOperation === operation) this.#synchronousOperation = null;
      this.#synchronousReentryError = null;
      this.#synchronousOperationFailure = null;
    }
  }

  #runSynchronousCallback<T>(
    operation: FormalWebSynchronousOperation,
    action: () => T,
  ): T {
    if (this.#synchronousOperation !== null) return action();
    return this.#runSynchronousOperation(operation, action);
  }

  #assertRegistryMaintenanceAvailable(
    operation: string,
  ): ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1 {
    this.#assertUsable(operation);
    if (this.#registryOwner === null) {
      throw new Error(`${operation}需要显式Registry-backed候选Composition。`);
    }
    if (this.#activeSurface !== 'information') {
      throw new Error(`${operation}只能在没有活动对局的信息页执行。`);
    }
    return this.#registryOwner;
  }

  #runRegistryMaintenance<T>(
    operation: string,
    action: (owner: ArenaV2RegistryBackedLocalPlayableOwnerCandidateV1) => T,
  ): T {
    return this.#runSynchronousOperation('registry-maintenance', () => {
      const result = action(this.#assertRegistryMaintenanceAvailable(operation));
      this.#assertCurrentSynchronousOperationCommit();
      return result;
    });
  }

  #registryProjection(): Readonly<ArenaV2FormalWebRegistryProjectionCandidateV1> | null {
    if (this.#registryOwner === null) return null;
    const owner = this.#registryOwner.snapshot();
    this.#assertCurrentSynchronousOperationCommit();
    if (owner.destroyed) {
      return Object.freeze({
        owner,
        availabilityChange: owner.lastAvailabilityChange,
        sequence: owner.registrySequence,
        active: null,
      });
    }
    const active = this.#registryOwner.readRegistry();
    this.#assertCurrentSynchronousOperationCommit();
    return Object.freeze({
      owner,
      availabilityChange: owner.lastAvailabilityChange,
      sequence: owner.registrySequence,
      active: Object.freeze({
        revision: active.revision,
        snapshotHash: active.snapshotHash,
        collectionWeaponIds: Object.freeze([...active.collectionWeaponIds]),
      }),
    });
  }

  #registryProjectionAfterMaintenance():
  Readonly<ArenaV2FormalWebRegistryProjectionCandidateV1> {
    const projection = this.#registryProjection();
    if (projection === null) {
      throw new Error('Arena V2 Registry维护结果缺少Registry-backed Owner。');
    }
    return projection;
  }

  #commitFailure(error: unknown): void {
    if (!this.#constructionComplete) {
      if (!this.#hasConstructionFailure) {
        this.#hasConstructionFailure = true;
        this.#constructionFailure = error;
        this.#lastError = error;
        this.#state = 'failed';
      }
      return;
    }
    if (this.#state === 'disposed') return;
    if (this.#state === 'failed') {
      if (this.#synchronousReentryError !== null) {
        this.#lastError = error;
        this.#scheduleFailureShutdown();
      }
      return;
    }
    this.#lastError = error;
    this.#state = 'failed';
    this.#collectionPreviewVisibilityRequested = false;
    this.#characterPreviewVisibilityRequested = false;
    this.#scheduleFailureShutdown();
    const surfaceCleanupErrors = this.#hideAllSurfaceLayersAfterFailure();
    if (surfaceCleanupErrors.length > 0) {
      this.#lastError = new AggregateError(
        [error, ...surfaceCleanupErrors],
        'Arena V2 formal Web失败提交时全层隐藏不完整。',
      );
    }
    if (this.#synchronousReentryError !== null) return;
    try { this.#pointerSurface?.clearMovementAvailability(); } catch {
      /* 表现诊断清理不能覆盖主流程首因。 */
    }
    if (this.#synchronousReentryError !== null) return;
    try { this.#pointerSurface?.clearPrimaryActionAvailability(); } catch {
      /* 表现诊断清理不能覆盖主流程首因。 */
    }
    if (this.#synchronousReentryError !== null) return;
    try { this.#pointerSurface?.clearJumpActionAvailability(); } catch {
      /* 表现诊断清理不能覆盖主流程首因。 */
    }
    if (this.#synchronousReentryError !== null) return;
    if (this.#onError !== null) {
      try {
        rejectThenable(
          this.#onError(error),
          'Arena V2 formal Web playable composition onError',
        );
      } catch { /* 观察者不能反向改变失败状态。 */ }
      if (this.#synchronousOperation !== null) {
        try { this.#assertCurrentSynchronousOperationCommit(); } catch { /* 由操作门统一抛出。 */ }
      }
    }
  }

  #recordFailure(error: unknown): void {
    if (!this.#constructionComplete || this.#synchronousOperation !== null) {
      this.#commitFailure(error);
      return;
    }
    this.#runSynchronousOperation('failure-commit', () => {
      this.#commitFailure(error);
    });
  }

  #recordChildCallbackFailure(error: unknown, operation: string): void {
    if (this.#synchronousOperation !== null) this.#synchronousOperationFailure ??= error;
    this.#assertNoSynchronousOperation(operation);
    this.#recordFailure(error);
  }

  #recordDetachedFailure(error: unknown, message: string): void {
    try {
      this.#recordFailure(error);
    } catch (commitError) {
      this.#state = 'failed';
      this.#lastError = new AggregateError(
        this.#lastError === null
          ? [error, commitError]
          : [this.#lastError, error, commitError],
        message,
      );
      this.#scheduleFailureShutdown();
    }
  }

  #handleMatchHostTerminalCleanupSettled(): void {
    if (!this.#constructionComplete || this.#state === 'disposed' || this.#disposing) return;
    if (this.#state === 'failed') {
      this.#scheduleFailureShutdown();
      return;
    }
    const failure = new Error('Arena V2 formal Web match host在顶层运行期间提前进入终态。');
    if (this.#synchronousOperation !== null) this.#synchronousOperationFailure ??= failure;
    this.#assertNoSynchronousOperation(
      'Arena V2 formal Web match host terminal cleanup callback',
    );
    this.#recordFailure(failure);
  }

  #scheduleFailureShutdown(): void {
    if (!this.#constructionComplete || this.#failureShutdownScheduled
      || this.#state !== 'failed') return;
    this.#failureShutdownScheduled = true;
    void Promise.resolve().then(() => this.#runSynchronousOperation(
      'failure-shutdown',
      () => {
        this.#failureShutdownScheduled = false;
        if (this.#state === 'disposed') return;
        const errors: unknown[] = [];
        this.#cleanupOwnedRuntimeResources(errors);
        this.#assertCurrentSynchronousOperationCommit();
        this.#prepareOperation = null;
        this.#activationOperation = null;
        this.#settlementScheduled = false;
        if (errors.length > 0) {
          this.#lastError = new AggregateError(
            this.#lastError === null ? errors : [this.#lastError, ...errors],
            'Arena V2 formal Web playable composition失败后停机不完整。',
          );
        }
      },
    )).catch((shutdownError: unknown) => {
      const failureBeforeCommit = this.#lastError;
      try {
        this.#runSynchronousOperation('failure-commit', () => {
          this.#failureShutdownScheduled = false;
          this.#lastError = new AggregateError(
            this.#lastError === null
              ? [shutdownError]
              : [this.#lastError, shutdownError],
            'Arena V2 formal Web playable composition失败后停机异常。',
          );
        });
      } catch (commitError) {
        this.#failureShutdownScheduled = false;
        this.#state = 'failed';
        this.#lastError = new AggregateError(
          failureBeforeCommit === null
            ? [shutdownError, commitError]
            : [failureBeforeCommit, shutdownError, commitError],
          'Arena V2 formal Web playable composition失败后停机异常提交失败。',
        );
      }
    });
  }

  #runOwnedRuntimeCleanupStep(
    label: string,
    run: () => unknown,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const reentrySequence = this.#synchronousReentrySequence;
    try {
      rejectThenable(run(), `${label}清理回调`);
      if (this.#synchronousReentrySequence !== reentrySequence) {
        const error = this.#synchronousReentryError
          ?? new Error(`${label}清理期间发生同步重入。`);
        errors.push(error);
        this.#synchronousOperationFailure ??= error;
        return false;
      }
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      if (this.#synchronousReentrySequence !== reentrySequence) {
        this.#synchronousOperationFailure ??= error;
      }
      return false;
    }
  }

  #cleanupOwnedRuntimeResources(errors: unknown[]): void {
    if (!this.#resizeCleanupCompleted) {
      if (!this.#runOwnedRuntimeCleanupStep(
        'Arena V2 formal Web resize listener',
        () => this.#resizeCleanup(),
        () => { this.#resizeCleanupCompleted = true; },
        errors,
      )) return;
    }
    if (this.#resizeCleanupCompleted && !this.#driverDisposed) {
      if (!this.#runOwnedRuntimeCleanupStep(
        'Arena V2 formal Web input driver',
        () => this.#driver.dispose(),
        () => { this.#driverDisposed = true; },
        errors,
      )) return;
    }
    if (this.#driverDisposed) {
      if (this.#offlineWeaponResearchPaceBaselineStore === null) {
        this.#offlineWeaponResearchPaceBaselineStoreDestroyed = true;
      } else if (!this.#offlineWeaponResearchPaceBaselineStoreDestroyed) {
        if (!this.#runOwnedRuntimeCleanupStep(
          'Arena V2 formal Web offline weapon research pace baseline store',
          () => this.#offlineWeaponResearchPaceBaselineStore!.destroy(),
          () => { this.#offlineWeaponResearchPaceBaselineStoreDestroyed = true; },
          errors,
        )) return;
      }
      if (!this.#offlineWeaponResearchPaceBaselineStoreDestroyed) return;
      if (this.#offlineRetentionObservationJournal === null) {
        this.#offlineRetentionObservationJournalDestroyed = true;
      } else if (!this.#offlineRetentionObservationJournalDestroyed) {
        if (!this.#runOwnedRuntimeCleanupStep(
          'Arena V2 formal Web offline retention observation journal',
          () => this.#offlineRetentionObservationJournal!.destroy(),
          () => { this.#offlineRetentionObservationJournalDestroyed = true; },
          errors,
        )) return;
      }
      if (this.#pointerSurface === null) {
        this.#pointerSurfaceDisposed = true;
      } else if (!this.#pointerSurfaceDisposed) {
        if (!this.#runOwnedRuntimeCleanupStep(
          'Arena V2 formal Web pointer surface',
          () => this.#pointerSurface!.dispose(),
          () => { this.#pointerSurfaceDisposed = true; },
          errors,
        )) return;
      }
    }
  }

  #ownedRuntimeCleanupComplete(): boolean {
    return this.#resizeCleanupCompleted
      && this.#driverDisposed
      && this.#offlineWeaponResearchPaceBaselineStoreDestroyed
      && this.#offlineRetentionObservationJournalDestroyed
      && this.#pointerSurfaceDisposed;
  }

  #applyCollectionPreviewVisibility(
    surface = this.#activeSurface,
    requested = this.#collectionPreviewVisibilityRequested,
  ): void {
    this.#collectionPreviewCanvas.style.display = requested
      && surface === 'information'
      ? 'block'
      : 'none';
    if (this.#synchronousOperation !== null) this.#assertCurrentSynchronousOperationCommit();
  }

  #applyCharacterPreviewVisibility(
    surface = this.#activeSurface,
    requested = this.#characterPreviewVisibilityRequested,
  ): void {
    this.#characterPreviewCanvas.style.display = requested
      && surface === 'information'
      ? 'block'
      : 'none';
    if (this.#synchronousOperation !== null) this.#assertCurrentSynchronousOperationCommit();
  }

  #hideAllSurfaceLayersAfterFailure(): readonly unknown[] {
    const errors: unknown[] = [];
    const hide = (run: () => unknown): void => {
      try {
        rejectThenable(run(), 'Arena V2 formal Web failed surface visibility cleanup');
      } catch (error) {
        errors.push(error);
      }
    };
    hide(() => { this.#informationRoot.style.display = 'none'; });
    hide(() => { this.#rendererCanvas.style.display = 'none'; });
    hide(() => { this.#hudCanvas.style.display = 'none'; });
    hide(() => { this.#collectionPreviewCanvas.style.display = 'none'; });
    hide(() => { this.#characterPreviewCanvas.style.display = 'none'; });
    hide(() => this.#informationRoot.setAttribute('aria-hidden', 'true'));
    hide(() => this.#rendererCanvas.setAttribute('aria-hidden', 'true'));
    hide(() => this.#hudCanvas.setAttribute('aria-hidden', 'true'));
    if (this.#pointerSurface !== null) {
      hide(() => this.#pointerSurface!.setVisible(false));
    }
    if (this.#synchronousReentryError !== null
      && !errors.includes(this.#synchronousReentryError)) {
      errors.push(this.#synchronousReentryError);
    }
    return Object.freeze(errors);
  }

  #setSurface(surface: ActiveSurface): void {
    const informationVisible = surface === 'information';
    try {
      this.#informationRoot.style.display = informationVisible ? 'block' : 'none';
      this.#assertCurrentSynchronousOperationCommit();
      this.#rendererCanvas.style.display = informationVisible ? 'none' : 'block';
      this.#assertCurrentSynchronousOperationCommit();
      this.#hudCanvas.style.display = informationVisible ? 'none' : 'block';
      this.#assertCurrentSynchronousOperationCommit();
      this.#applyCollectionPreviewVisibility(surface);
      this.#applyCharacterPreviewVisibility(surface);
      this.#informationRoot.setAttribute('aria-hidden', String(!informationVisible));
      this.#assertCurrentSynchronousOperationCommit();
      this.#rendererCanvas.setAttribute('aria-hidden', String(informationVisible));
      this.#assertCurrentSynchronousOperationCommit();
      this.#hudCanvas.setAttribute('aria-hidden', String(informationVisible));
      this.#assertCurrentSynchronousOperationCommit();
      this.#pointerSurface?.setVisible(!informationVisible);
      this.#assertCurrentSynchronousOperationCommit();
      this.#activeSurface = surface;
    } catch (error) {
      const cleanupErrors = this.#hideAllSurfaceLayersAfterFailure();
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal Web surface切换失败且全层隐藏不完整。',
        );
    }
  }

  #clearActionAvailability(): void {
    if (this.#pointerSurface === null) return;
    const steps = Object.freeze([
      () => this.#pointerSurface!.clearMovementAvailability(),
      () => this.#pointerSurface!.clearPrimaryActionAvailability(),
      () => this.#pointerSurface!.clearJumpActionAvailability(),
    ]);
    for (const step of steps) {
      try {
        step();
        this.#assertCurrentSynchronousOperationCommit();
      } catch (error) {
        throw new AggregateError(
          [error],
          'Arena V2 formal Web动作可用性清理不完整，已停止后序状态改写。',
        );
      }
    }
  }

  #applyMatchActionAvailability(scene: unknown): void {
    if (this.#pointerSurface === null) return;
    const primary = projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(scene);
    const movementAndJump =
      projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1(scene);
    try {
      this.#pointerSurface.applyMovementAvailability(movementAndJump.movement);
      this.#assertCurrentSynchronousOperationCommit();
      this.#pointerSurface.applyPrimaryActionAvailability(primary);
      this.#assertCurrentSynchronousOperationCommit();
      this.#pointerSurface.applyJumpActionAvailability(movementAndJump.jump);
      this.#assertCurrentSynchronousOperationCommit();
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      let mayContinue = true;
      try { this.#pointerSurface.clearMovementAvailability(); } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
        mayContinue = false;
      }
      if (this.#synchronousReentryError !== null) throw error;
      if (mayContinue) {
        try { this.#pointerSurface.clearPrimaryActionAvailability(); } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
          mayContinue = false;
        }
      }
      if (this.#synchronousReentryError !== null) throw error;
      if (mayContinue) {
        try { this.#pointerSurface.clearJumpActionAvailability(); } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal Web动作可用性提交失败且回滚不完整。',
        );
      }
      throw error;
    }
  }

  #handleSurfaceChange(change: unknown): void {
    if (this.#surfaceTransitioning) {
      throw new Error('Arena V2 formal Web playable composition surface change不可重入。');
    }
    this.#surfaceTransitioning = true;
    try {
      const { surface, outcome } = surfaceChange(change);
      if (this.#pointerSurface !== null) {
        if (surface === 'match') {
          this.#applyMatchActionAvailability(sceneFromMatchOutcome(outcome));
        } else {
          this.#clearActionAvailability();
        }
      }
      this.#setSurface(surface);
      if (surface === 'information'
        && this.#offlineRetentionObservationJournal !== null) {
        const current = this.#localPlayableHost.getInformationLearningProfileRead();
        this.#assertCurrentSynchronousOperationCommit();
        const journalExport = this.#offlineRetentionObservationJournal.getExportBundle();
        this.#assertCurrentSynchronousOperationCommit();
        this.#synchronizeOfflineWeaponResearchPaceDurableBaseline(
          current,
          journalExport,
        );
        this.#assertCurrentSynchronousOperationCommit();
      }
      if (this.#onSurfaceChange === null) return;
      const result = this.#onSurfaceChange(change);
      rejectThenable(result, 'Arena V2 formal Web playable composition onSurfaceChange');
      this.#assertCurrentSynchronousOperationCommit();
    } finally {
      this.#surfaceTransitioning = false;
    }
  }

  #synchronizeOfflineWeaponResearchPaceDurableBaseline(
    current: LocalLearningProfileRead,
    journalExport: ReturnType<
      ArenaV2OfflineRetentionObservationJournalCandidateV1['getExportBundle']
    >,
  ): void {
    if (this.#offlineWeaponResearchPaceBaselineStore === null
      || this.#offlineWeaponResearchPaceBaselineStoreDestroyed
      || this.#offlineWeaponResearchPaceDurableBaselineError !== null) return;
    try {
      this.#offlineWeaponResearchPaceBaselineStore.synchronize({
        profileDefinition: current.profileDefinition,
        currentProfile: current.profile,
        sourceJournalRevision: journalExport.revision,
        sourceJournalPayloadHash: journalExport.sourcePayloadHash,
        sourceJournalObservationCount: journalExport.observationCount,
        sourceJournalDroppedObservationCount: journalExport.droppedObservationCount,
        sourceJournalLatestProfileRevision:
          journalExport.observations.at(-1)?.profileRevision ?? null,
        sourceJournalObservations: journalExport.observations,
      });
      this.#assertCurrentSynchronousOperationCommit();
    } catch (error) {
      this.#disableOfflineWeaponResearchPaceDurableBaseline(error);
    }
  }

  #disableOfflineWeaponResearchPaceDurableBaseline(error: unknown): void {
    if (this.#synchronousReentryError !== null) throw error;
    let durableError: unknown = error;
    if (this.#offlineWeaponResearchPaceBaselineStore !== null
      && !this.#offlineWeaponResearchPaceBaselineStoreDestroyed) {
      try {
        this.#offlineWeaponResearchPaceBaselineStore.destroy();
        this.#assertCurrentSynchronousOperationCommit();
        this.#offlineWeaponResearchPaceBaselineStoreDestroyed = true;
      } catch (cleanupError) {
        if (this.#synchronousReentryError !== null) throw error;
        durableError = new AggregateError(
          [error, cleanupError],
          'Arena V2正式Web长期武器研究节奏Owner失败且清理不完整。',
        );
      }
    }
    this.#offlineWeaponResearchPaceDurableBaselineError = durableError;
  }

  #handleMatchStep(outcome: unknown): void {
    if (this.#pointerSurface === null) return;
    if (this.#activeSurface !== 'match') {
      throw new Error('Arena V2 formal Web动作可用性step只能发生在match surface。');
    }
    this.#applyMatchActionAvailability(sceneFromMatchOutcome(outcome));
  }

  #handleDriverStateChange(change: unknown): void {
    const source = assertPlainRecord(change, 'Arena V2 formal Web driver state change');
    const state = dataField(source, 'state', 'Arena V2 formal Web driver state change');
    if (state !== 'settlement-pending' || this.#settlementScheduled
      || this.#state === 'disposed' || this.#state === 'failed') return;
    this.#settlementScheduled = true;
    void Promise.resolve().then(() => this.#runSynchronousOperation(
      'settle-match',
      () => {
        this.#settlementScheduled = false;
        if (this.#state === 'disposed' || this.#state === 'failed') return;
        const driverState = this.#driver.state;
        this.#assertCurrentSynchronousOperationCommit();
        if (driverState !== 'settlement-pending') return;
        this.#driver.settle();
        this.#assertCurrentSynchronousOperationCommit();
      },
    )).catch((error: unknown) => this.#recordDetachedFailure(
      error,
      'Arena V2 formal Web playable composition自动结算失败提交异常。',
    ));
  }

  readonly #handleResize = (): void => {
    if (this.#state === 'disposed') return;
    try {
      this.#runSynchronousOperation('resize', () => {
        this.#refreshViewportCache(true);
        this.#assertCurrentSynchronousOperationCommit();
        if (this.#disposing || this.#surfaceTransitioning
          || this.#state === 'created' || this.#state === 'failed') return;
        if (this.#activeSurface === 'information') {
          this.#binding.renderCurrent();
          this.#assertCurrentSynchronousOperationCommit();
        }
      });
    } catch (error) {
      this.#recordDetachedFailure(
        error,
        'Arena V2 formal Web playable composition窗口尺寸刷新失败提交异常。',
      );
    }
  };

  load(): this {
    return this.#runSynchronousOperation('load', () => {
      this.#assertUsable('Arena V2 formal Web playable composition load');
      if (this.#state !== 'created') return this;
      try {
        this.#binding.load();
        this.#assertCurrentSynchronousOperationCommit();
        this.#state = 'loading';
        return this;
      } catch (error) {
        this.#recordFailure(error);
        throw error;
      }
    });
  }

  prepareFormalAssets(): Promise<this> {
    this.#assertNoSynchronousOperation(
      'Arena V2 formal Web playable composition prepareFormalAssets',
    );
    if (this.#prepareOperation !== null
      && this.#state !== 'failed'
      && this.#state !== 'disposed') return this.#prepareOperation;
    const prepareLaunch: {
      reject: ((reason?: unknown) => void) | null;
    } = { reject: null };
    let launchedPrepare: Promise<this> | null = null;
    try {
      return this.#runSynchronousOperation('prepare-formal-assets', () => {
        this.#assertUsable('Arena V2 formal Web playable composition prepareFormalAssets');
        if (this.#assetsPrepared) return Promise.resolve(this);
        if (this.#prepareOperation !== null) return this.#prepareOperation;
        const prepareOwner = deferred<this>();
        prepareLaunch.reject = prepareOwner.reject;
        this.#prepareOperation = prepareOwner.promise;
        const childPreparation = this.#matchHost.prepareFormalAssets();
        const execution = childPreparation.then(() => (
          this.#runSynchronousOperation('prepare-formal-assets', () => {
            if (this.#state === 'disposed' || this.#state === 'failed') {
              throw new Error(
                `Arena V2 formal Web playable composition预加载完成时状态已是${this.#state}。`,
              );
            }
            this.#assetsPrepared = true;
            return this;
          })
        )).catch((error: unknown) => this.#runSynchronousOperation(
          'prepare-formal-assets',
          () => {
            if (this.#state !== 'disposed') this.#commitFailure(error);
            throw error;
          },
        ));
        launchedPrepare = execution;
        void execution.then(prepareOwner.resolve, prepareOwner.reject);
        this.#assertCurrentSynchronousOperationCommit();
        return this.#prepareOperation;
      });
    } catch (error) {
      let failure: unknown = error;
      if (this.#state !== 'disposed') {
        try { this.#recordFailure(error); } catch (caught) { failure = caught; }
      }
      const reject = prepareLaunch.reject;
      if (reject === null || this.#prepareOperation === null) throw failure;
      if (launchedPrepare === null) reject(failure);
      return this.#prepareOperation;
    }
  }

  loadAndPrepare(): Promise<this> {
    this.load();
    return this.prepareFormalAssets();
  }

  activateAudioAndEnterHome(): Promise<this> {
    this.#assertNoSynchronousOperation(
      'Arena V2 formal Web playable composition activateAudioAndEnterHome',
    );
    if (this.#activationOperation !== null
      && this.#state !== 'failed'
      && this.#state !== 'disposed') return this.#activationOperation;
    const activationLaunch: {
      reject: ((reason?: unknown) => void) | null;
    } = { reject: null };
    let launchedActivation: Promise<this> | null = null;
    try {
      return this.#runSynchronousOperation('activate-audio', () => {
        this.#assertUsable('Arena V2 formal Web playable composition activateAudioAndEnterHome');
        if (this.#state === 'ready' && this.#audioActivated) return Promise.resolve(this);
        if (this.#activationOperation !== null) return this.#activationOperation;
        if (this.#state !== 'loading' || !this.#assetsPrepared) {
          return Promise.reject(new Error('必须先显示Loading页并完成正式资产预加载。'));
        }
        const activationOwner = deferred<this>();
        activationLaunch.reject = activationOwner.reject;
        this.#activationOperation = activationOwner.promise;
        const childActivation = this.#matchHost.activateFormalAudio();
        const execution = childActivation.then(() => (
          this.#runSynchronousOperation('activate-audio', () => {
            if (this.#state !== 'loading') {
              throw new Error('正式音频激活完成时Composition已不可接收。');
            }
            this.#binding.loadingReady();
            this.#assertCurrentSynchronousOperationCommit();
            this.#audioActivated = true;
            this.#state = 'ready';
            return this;
          })
        )).catch((error: unknown) => this.#runSynchronousOperation(
          'activate-audio',
          () => {
            if (this.#state !== 'disposed') this.#commitFailure(error);
            throw error;
          },
        ));
        launchedActivation = execution;
        void execution.then(activationOwner.resolve, activationOwner.reject);
        this.#assertCurrentSynchronousOperationCommit();
        return this.#activationOperation;
      });
    } catch (error) {
      let failure: unknown = error;
      if (this.#state !== 'disposed') {
        try { this.#recordFailure(error); } catch (caught) { failure = caught; }
      }
      const reject = activationLaunch.reject;
      if (reject === null || this.#activationOperation === null) throw failure;
      if (launchedActivation === null) reject(failure);
      return this.#activationOperation;
    }
  }

  refreshLayout(): void {
    this.#runSynchronousOperation('refresh-layout', () => {
      this.#assertUsable('Arena V2 formal Web playable composition refreshLayout');
      this.#refreshViewportCache();
      this.#assertCurrentSynchronousOperationCommit();
      if (this.#activeSurface === 'information') {
        this.#binding.renderCurrent();
        this.#assertCurrentSynchronousOperationCommit();
      }
    });
  }

  pauseMatch(): boolean {
    return this.#runSynchronousOperation('pause-match', () => {
      this.#assertUsable('Arena V2 formal Web playable composition pauseMatch');
      try {
        const paused = this.#driver.pause();
        this.#assertCurrentSynchronousOperationCommit();
        if (paused) this.#clearActionAvailability();
        return paused;
      } catch (error) {
        this.#recordFailure(error);
        throw error;
      }
    });
  }

  resumeMatch(): boolean {
    return this.#runSynchronousOperation('resume-match', () => {
      this.#assertUsable('Arena V2 formal Web playable composition resumeMatch');
      const resumed = this.#driver.resume();
      this.#assertCurrentSynchronousOperationCommit();
      return resumed;
    });
  }

  settleMatch(): unknown {
    return this.#runSynchronousOperation('settle-match', () => {
      this.#assertUsable('Arena V2 formal Web playable composition settleMatch');
      const outcome = this.#driver.settle();
      this.#assertCurrentSynchronousOperationCommit();
      return outcome;
    });
  }

  retryLearningSettlementProjectionRecovery(): ReturnType<
    ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1[
      'retryLearningSettlementProjectionRecovery'
    ]
  > {
    return this.#runSynchronousOperation('retry-settlement-recovery', () => {
      this.#assertUsable(
        'Arena V2 formal Web playable composition retry learning settlement recovery',
      );
      if (this.#activeSurface !== 'information') {
        throw new Error('Arena V2 formal Web只能在结算信息页重试学习结算恢复。');
      }
      const recovery = this.#binding.retryLearningSettlementProjectionRecovery();
      this.#assertCurrentSynchronousOperationCommit();
      return recovery;
    });
  }

  beginSingleWeaponRegistryPromotion(
    options: ArenaV2RegistryBackedLocalPlayableBeginPromotionOptionsCandidateV1,
  ): Readonly<ArenaV2FormalWebRegistryProjectionCandidateV1> {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition beginSingleWeaponRegistryPromotion',
      (owner) => {
        owner.beginSingleWeaponPromotion(options);
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjection()!;
      },
    );
  }

  beginSingleWeaponRegistryPromotionFromAssessment(
    options:
      ArenaV2RegistryBackedLocalPlayableBeginPromotionFromAssessmentOptionsCandidateV1,
  ): Readonly<ArenaV2FormalWebRegistryProjectionCandidateV1> {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition beginSingleWeaponRegistryPromotionFromAssessment',
      (owner) => {
        owner.beginSingleWeaponPromotionFromAssessment(options);
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjection()!;
      },
    );
  }

  promoteNextWeaponRegistryFromAssessment(
    options:
      ArenaV2RegistryBackedLocalPlayableBeginPromotionFromAssessmentOptionsCandidateV1,
  ): Readonly<ArenaV2FormalWebRegistryProjectionCandidateV1> {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition promoteNextWeaponRegistryFromAssessment',
      (owner) => {
        owner.promoteNextWeaponFromAssessment(options);
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjectionAfterMaintenance();
      },
    );
  }

  advanceSingleWeaponRegistryPromotionToStable(): Readonly<
    ArenaV2FormalWebRegistryProjectionCandidateV1
  > {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition advanceSingleWeaponRegistryPromotionToStable',
      (owner) => {
        owner.advanceSingleWeaponPromotionToStable();
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjectionAfterMaintenance();
      },
    );
  }

  publishAndPromoteSingleWeaponRegistry(): Readonly<
    ArenaV2FormalWebRegistryProjectionCandidateV1
  > {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition publishAndPromoteSingleWeaponRegistry',
      (owner) => {
        owner.publishAndPromoteSingleWeapon();
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjectionAfterMaintenance();
      },
    );
  }

  retrySingleWeaponRegistryReferenceAfterActivation(): Readonly<
    ArenaV2FormalWebRegistryProjectionCandidateV1
  > {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition retrySingleWeaponRegistryReferenceAfterActivation',
      (owner) => {
        owner.retrySingleWeaponReferenceAfterActivation();
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjectionAfterMaintenance();
      },
    );
  }

  retrySingleWeaponRegistrySealAfterPromotion(): Readonly<
    ArenaV2FormalWebRegistryProjectionCandidateV1
  > {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition retrySingleWeaponRegistrySealAfterPromotion',
      (owner) => {
        owner.retrySingleWeaponSealAfterPromotion();
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjectionAfterMaintenance();
      },
    );
  }

  renewSingleWeaponRegistryPromotionLease(): boolean {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition renewSingleWeaponRegistryPromotionLease',
      (owner) => owner.renewSingleWeaponPromotionLease(),
    );
  }

  closeSingleWeaponRegistryPromotion(): Readonly<
    ArenaV2FormalWebRegistryProjectionCandidateV1
  > {
    return this.#runRegistryMaintenance(
      'Arena V2 formal Web playable composition closeSingleWeaponRegistryPromotion',
      (owner) => {
        owner.closeSingleWeaponPromotion();
        this.#assertCurrentSynchronousOperationCommit();
        return this.#registryProjection()!;
      },
    );
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runSynchronousOperation('snapshot-read', () => {
      const mounted = this.#container.parentNode === this.#hostRoot;
      this.#assertCurrentSynchronousOperationCommit();
      const bindingState = this.#binding.state;
      this.#assertCurrentSynchronousOperationCommit();
      const learningSettlementRecovery = bindingState === 'failed' || bindingState === 'disposed'
        ? null
        : this.#binding.getLearningSettlementRecoveryRead();
      this.#assertCurrentSynchronousOperationCommit();
      const driver = this.#driver.getSnapshot();
      this.#assertCurrentSynchronousOperationCommit();
      const pointerSurface = this.#pointerSurface?.getSnapshot() ?? null;
      this.#assertCurrentSynchronousOperationCommit();
      const matchHost = this.#matchHost.getSnapshot();
      this.#assertCurrentSynchronousOperationCommit();
      const collectionPreview = this.#collectionPreviewSurface.getSnapshot();
      this.#assertCurrentSynchronousOperationCommit();
      const characterPreview = this.#characterPreviewSurface.getSnapshot();
      this.#assertCurrentSynchronousOperationCommit();
      const offlineRetentionObservationJournal =
        this.#offlineRetentionObservationJournal?.getSnapshot() ?? null;
      this.#assertCurrentSynchronousOperationCommit();
      const registry = this.#registryProjection();
      this.#assertCurrentSynchronousOperationCommit();
      return Object.freeze({
        state: this.#state,
        activeSurface: this.#activeSurface,
        assetsPrepared: this.#assetsPrepared,
        audioActivated: this.#audioActivated,
        settlementScheduled: this.#settlementScheduled,
        collectionPreviewVisibilityRequested: this.#collectionPreviewVisibilityRequested,
        characterPreviewVisibilityRequested: this.#characterPreviewVisibilityRequested,
        mounted,
        bindingState,
        learningSettlementRecovery,
        inputMode: this.#inputMode,
        driver,
        pointerSurface,
        matchHost,
        collectionPreview,
        characterPreview,
        offlineRetentionObservationJournal,
        offlineRetentionObservationJournalError:
          this.#offlineRetentionObservationJournalError,
        offlineWeaponResearchPaceDurableBaseline:
          this.#offlineWeaponResearchPaceBaselineStore === null
            || this.#offlineWeaponResearchPaceBaselineStoreDestroyed
            || this.#offlineWeaponResearchPaceDurableBaselineError !== null
            ? null
            : (() => {
              const baseline = this.#offlineWeaponResearchPaceBaselineStore!.getRead();
              return Object.freeze({
                source: baseline.source,
                baselineProfileRevision: baseline.baselineProfileRevision,
                sourceJournalRevision: baseline.sourceJournalRevision,
                sourceJournalPayloadHash: baseline.sourceJournalPayloadHash,
                checkpointJournalRevision: baseline.checkpointJournalRevision,
                checkpointJournalPayloadHash: baseline.checkpointJournalPayloadHash,
                checkpointJournalDroppedObservationCount:
                  baseline.checkpointJournalDroppedObservationCount,
                accumulatedThroughProfileRevision:
                  baseline.accumulatedThroughProfileRevision,
                accumulatedMainResearchPoints:
                  baseline.accumulatedMainResearchPoints,
                catalogCompletionProfileRevision:
                  baseline.catalogCompletionProfileRevision,
                accumulatedSettlementCount: baseline.accumulatedSettlementCount,
                accumulatedMeasuredSettlementCount:
                  baseline.accumulatedMeasuredSettlementCount,
                accumulatedMissingAuthorityDurationCount:
                  baseline.accumulatedMissingAuthorityDurationCount,
                accumulatedAuthorityTicks: baseline.accumulatedAuthorityTicks,
                windowIdentityHash: baseline.window.windowIdentityHash,
              });
            })(),
        offlineWeaponResearchPaceDurableBaselineError:
          this.#offlineWeaponResearchPaceDurableBaselineError,
        offlineWeaponResearchPaceCalibrationWindow:
          this.#weaponResearchPacePageBaselineToken === null
            ? null
            : Object.freeze({
              baselineProfileRevision:
                this.#weaponResearchPacePageBaselineToken.baselineProfileRevision,
            }),
        offlineWeaponResearchPaceCalibrationWindowError:
          this.#weaponResearchPaceBaselineError,
        registry,
        lastError: this.#lastError,
      });
    });
  }

  getOfflineRetentionObservationExportRead(): ReturnType<
    ArenaV2OfflineRetentionObservationJournalCandidateV1['getExportBundle']
  > | null {
    return this.#runSynchronousOperation(
      'retention-export-read',
      () => {
        this.#assertUsable(
          'Arena V2 formal Web playable composition offline retention export read',
        );
        const exportBundle = this.#offlineRetentionObservationJournal?.getExportBundle() ?? null;
        this.#assertCurrentSynchronousOperationCommit();
        return exportBundle;
      },
    );
  }

  getOfflineWeaponResearchPacePageBaselineTokenForEntryCandidateV1(
  ): ArenaV2FormalWebWeaponResearchPacePageBaselineTokenCandidateV1 | null {
    return this.#runSynchronousOperation(
      'retention-weapon-pace-page-token-read',
      () => {
        this.#assertUsable(
          'Arena V2 formal Web playable composition weapon research pace page token read',
        );
        return this.#weaponResearchPacePageBaselineToken;
      },
    );
  }

  getOfflineLearningPaceCalibrationRead(
  ): ArenaV2FormalWebOfflineLearningPaceCalibrationReadCandidateV1 | null {
    return this.#runSynchronousOperation(
      'retention-calibration-read',
      () => {
        this.#assertUsable(
          'Arena V2 formal Web playable composition offline learning pace calibration read',
        );
        const journalExport = this.#offlineRetentionObservationJournal?.getExportBundle() ?? null;
        this.#assertCurrentSynchronousOperationCommit();
        if (journalExport === null) return null;
        const calibration = projectArenaV2LearningPaceCalibrationCandidateV1({
          profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
          observations: journalExport.observations,
        });
        return Object.freeze({
          schemaVersion: 1 as const,
          status: 'offline-capacity-calibration-read' as const,
          sourceJournalRevision: journalExport.revision,
          sourceJournalPayloadHash: journalExport.sourcePayloadHash,
          observationCount: journalExport.observationCount,
          retainedObservationCount: journalExport.retainedObservationCount,
          droppedObservationCount: journalExport.droppedObservationCount,
          authorityObservationWindow: journalExport.droppedObservationCount === 0
            ? 'complete-journal-history' as const
            : 'retained-tail-window' as const,
          calibration,
          mutatesProgression: false as const,
          claimsObservedRetention: false as const,
        });
      },
    );
  }

  getOfflineWeaponResearchPaceCalibrationRead(
  ): ArenaV2FormalWebOfflineWeaponResearchPaceCalibrationReadCandidateV1 | null {
    return this.#runSynchronousOperation(
      'retention-weapon-pace-read',
      () => {
        this.#assertUsable(
          'Arena V2 formal Web playable composition offline weapon research pace read',
        );
        const baselineToken = this.#weaponResearchPacePageBaselineToken;
        const journalExport = this.#offlineRetentionObservationJournal?.getExportBundle() ?? null;
        this.#assertCurrentSynchronousOperationCommit();
        if (baselineToken === null
          || this.#weaponResearchPaceBaselineError !== null
          || journalExport === null) return null;
        const current = this.#localPlayableHost.getInformationLearningProfileRead();
        this.#assertCurrentSynchronousOperationCommit();
        this.#synchronizeOfflineWeaponResearchPaceDurableBaseline(current, journalExport);
        this.#assertCurrentSynchronousOperationCommit();
        if (this.#offlineWeaponResearchPaceBaselineStore !== null
          && !this.#offlineWeaponResearchPaceBaselineStoreDestroyed
          && this.#offlineWeaponResearchPaceDurableBaselineError === null) {
          try {
            const baseline = this.#offlineWeaponResearchPaceBaselineStore.getRead();
            this.#assertCurrentSynchronousOperationCommit();
            const calibration = this.#offlineWeaponResearchPaceBaselineStore.project(
              current.profile,
            );
            this.#assertCurrentSynchronousOperationCommit();
            return Object.freeze({
              schemaVersion: 1 as const,
              status: 'offline-weapon-research-pace-calibration-read' as const,
              sourceJournalRevision: journalExport.revision,
              sourceJournalPayloadHash: journalExport.sourcePayloadHash,
              sourceJournalDroppedObservationCount: journalExport.droppedObservationCount,
              windowIdentityHash: baseline.window.windowIdentityHash,
              baselineProfileRevision: baseline.baselineProfileRevision,
              currentProfileRevision: current.profile.revision,
              evidenceThroughProfileRevision:
                baseline.accumulatedThroughProfileRevision,
              catalogCompletionProfileRevision:
                baseline.catalogCompletionProfileRevision,
              expectedSettlementCount: baseline.accumulatedSettlementCount,
              retainedSettlementCount: journalExport.observations.filter((entry) => (
                entry.kind ===
                  ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED
                && entry.profileRevision > baseline.baselineProfileRevision
                && entry.profileRevision <= baseline.accumulatedThroughProfileRevision
              )).length,
              evidenceSource: 'durable-compact-window' as const,
              evidenceWindowStatus: 'complete-baseline-profile-window' as const,
              calibration,
              mutatesProgression: false as const,
              addsRetentionMetric: false as const,
              claimsObservedRetention: false as const,
            });
          } catch (error) {
            this.#disableOfflineWeaponResearchPaceDurableBaseline(error);
            this.#assertCurrentSynchronousOperationCommit();
          }
        }
        baselineToken.assertCompatibleCurrent(current);
        const baselineProfileRevision = baselineToken.baselineProfileRevision;
        const currentProfileRevision = current.profile.revision;
        const expectedSettlementCount = currentProfileRevision - baselineProfileRevision;
        if (!Number.isSafeInteger(expectedSettlementCount) || expectedSettlementCount < 0) {
          throw new RangeError('Arena V2正式Web武器研究节奏Profile revision窗口无效。');
        }
        const observations = journalExport.observations.filter((entry) => (
          entry.kind ===
            ARENA_V2_RETENTION_OBSERVATION_KIND_V1.EFFECTIVE_LEARNING_COMPLETED
          && entry.profileRevision > baselineProfileRevision
          && entry.profileRevision <= currentProfileRevision
        ));
        const revisionSet = new Set(observations.map(({ profileRevision }) => profileRevision));
        if (revisionSet.size !== observations.length) {
          throw new RangeError('Arena V2正式Web武器研究节奏同一Profile revision存在重复结算。');
        }
        const retainedSettlementRevisions = [...revisionSet]
          .sort((left, right) => left - right);
        const continuousWindow = observations.length === expectedSettlementCount
          && retainedSettlementRevisions.every((revision, index) => (
            revision === baselineProfileRevision + index + 1
          ));
        const exactCatalogCompletionBoundary =
          baselineToken.canProjectThroughCurrent(current);
        const completeWindow = continuousWindow && exactCatalogCompletionBoundary;
        const window = baselineToken.createWindow(journalExport.cohortSubjectId);
        const calibration = completeWindow
          ? baselineToken.project(current, observations, window)
          : null;
        return Object.freeze({
          schemaVersion: 1 as const,
          status: 'offline-weapon-research-pace-calibration-read' as const,
          sourceJournalRevision: journalExport.revision,
          sourceJournalPayloadHash: journalExport.sourcePayloadHash,
          sourceJournalDroppedObservationCount: journalExport.droppedObservationCount,
          windowIdentityHash: window.windowIdentityHash,
          baselineProfileRevision,
          currentProfileRevision,
          evidenceThroughProfileRevision: currentProfileRevision,
          catalogCompletionProfileRevision:
            calibration?.catalogCompletionProfileRevision ?? null,
          expectedSettlementCount,
          retainedSettlementCount: observations.length,
          evidenceSource: 'retained-journal-window' as const,
          evidenceWindowStatus: completeWindow
            ? 'complete-baseline-profile-window' as const
            : continuousWindow && !exactCatalogCompletionBoundary
              ? 'catalog-completion-boundary-unavailable' as const
              : 'incomplete-baseline-profile-window' as const,
          calibration,
          mutatesProgression: false as const,
          addsRetentionMetric: false as const,
          claimsObservedRetention: false as const,
        });
      },
    );
  }

  dispose(): void {
    this.#assertNoSynchronousOperation('dispose');
    if (this.#state === 'disposed') return;
    this.#runSynchronousOperation('dispose', () => {
      if (this.#surfaceTransitioning) {
        throw new Error(
          'Arena V2 formal Web playable composition surface change期间不能dispose。',
        );
      }
      if (this.#disposing) {
        throw new Error('Arena V2 formal Web playable composition dispose不可重入。');
      }
      const failedBeforeDispose = this.#state === 'failed';
      const failureBeforeDispose = this.#lastError;
      this.#disposing = true;
      try {
        const errors: unknown[] = [];
        this.#collectionPreviewVisibilityRequested = false;
        this.#characterPreviewVisibilityRequested = false;
        try { this.#applyCollectionPreviewVisibility(); } catch (error) { errors.push(error); }
        if (this.#synchronousReentryError !== null) return;
        try { this.#applyCharacterPreviewVisibility(); } catch (error) { errors.push(error); }
        if (this.#synchronousReentryError !== null) return;
        this.#cleanupOwnedRuntimeResources(errors);
        this.#assertCurrentSynchronousOperationCommit();
        if (this.#ownedRuntimeCleanupComplete() && !this.#containerRemoved) {
          if (!this.#runOwnedRuntimeCleanupStep(
            'Arena V2 formal Web composition container',
            () => this.#container.remove(),
            () => { this.#containerRemoved = true; },
            errors,
          )) return;
        }
        this.#assertCurrentSynchronousOperationCommit();
        this.#prepareOperation = null;
        this.#activationOperation = null;
        this.#settlementScheduled = false;
        this.#failureShutdownScheduled = false;
        const cleanupComplete = this.#ownedRuntimeCleanupComplete() && this.#containerRemoved;
        this.#state = errors.length === 0 && cleanupComplete ? 'disposed' : 'failed';
        if (errors.length === 0 && !cleanupComplete) {
          errors.push(new Error(
            'Arena V2 formal Web playable composition终态清理依赖尚未收敛。',
          ));
        }
        if (errors.length > 0) {
          const failure = new AggregateError(
            failedBeforeDispose ? [failureBeforeDispose, ...errors] : errors,
            'Arena V2 formal Web playable composition清理不完整。',
          );
          this.#lastError = failure;
          throw failure;
        }
      } finally {
        this.#disposing = false;
      }
    });
  }
}

export function createArenaV2RegistryBackedFormalWebPlayableCompositionCandidateV1(
  value: unknown,
): ArenaV2FormalWebPlayableCompositionCandidateV1 {
  const source = assertPlainRecord(
    value,
    'Arena V2 Registry-backed formal Web playable composition options',
  );
  if (!Object.hasOwn(source, 'registryBootstrapOptions')) {
    throw new TypeError(
      'Arena V2 Registry-backed formal Web playable composition缺少registryBootstrapOptions。',
    );
  }
  dataField(
    source,
    'registryBootstrapOptions',
    'Arena V2 Registry-backed formal Web playable composition options',
  );
  return new ArenaV2FormalWebPlayableCompositionCandidateV1(source);
}

export function createArenaV2FirstProvisionedFormalWebPlayableCompositionCandidateV1(
  value: unknown,
): ArenaV2FormalWebPlayableCompositionCandidateV1 {
  const source = assertPlainRecord(
    value,
    'Arena V2 first-provisioned formal Web playable composition options',
  );
  const provisioningDescriptor = Object.getOwnPropertyDescriptor(
    source,
    'registryProvisioningOwner',
  );
  if (provisioningDescriptor === undefined
    || !provisioningDescriptor.enumerable
    || !Object.hasOwn(provisioningDescriptor, 'value')
    || !(provisioningDescriptor.value
      instanceof ArenaV2FirstWeaponRegistryProvisioningOwnerCandidateV1)) {
    throw new TypeError(
      'Arena V2 first-provisioned Formal Web缺少真实Registry provisioning Owner。',
    );
  }
  if (Object.hasOwn(source, 'registryBootstrapOptions')
    || Object.hasOwn(source, 'registryBootstrap')) {
    throw new TypeError(
      'Arena V2 first-provisioned Formal Web不接受额外Registry bootstrap输入。',
    );
  }
  const forwardedEntries = Object.entries(Object.getOwnPropertyDescriptors(source))
    .filter(([key]) => key !== 'registryProvisioningOwner')
    .map(([key, descriptor]) => {
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`Arena V2 first-provisioned Formal Web options.${key}必须是数据字段。`);
      }
      return [key, descriptor.value] as const;
    });
  const provisioningOwner = provisioningDescriptor.value;
  const registryBootstrap = provisioningOwner.takeRuntimeBootstrap();
  try {
    return new ArenaV2FormalWebPlayableCompositionCandidateV1(Object.freeze({
      ...Object.fromEntries(forwardedEntries),
      registryBootstrap,
    }));
  } catch (error) {
    if (error instanceof
        ArenaV2FormalWebPlayableCompositionConstructionCleanupFailureCandidateV1
      && error.ownsTransferredRegistryBootstrap) {
      throw error;
    }
    if (registryBootstrap.snapshot().destroyed) throw error;
    try {
      registryBootstrap.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Arena V2 first-provisioned Formal Web构造失败且bootstrap清理不完整。',
      );
    }
    throw error;
  }
}

export const ARENA_V2_FORMAL_WEB_PLAYABLE_COMPOSITION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  explicitModeRegistryPreflightTopLevelConsumerWired: true as const,
  explicitModeRegistryPreflightBeforeHostRootDomStorageSeedAndPresentation: true as const,
  explicitModeRegistryDownstreamCandidateRevalidationRequired: true as const,
  explicitModeRegistryRuntimePolicyConsumptionWired: false as const,
  ownsElevenPageInformationSurface: true as const,
  elevenPagePlayerReachabilityRoutesWired: true as const,
  modeAndPreparationOptionalDepthNavigationWired: true as const,
  preparationPagesExplicitReturnToModeWired: true as const,
  preparationDetailSingleSourceReturnWired: true as const,
  detailDirectorySecondaryNavigationWired: true as const,
  detailDirectoryReturnPreservesSelection: true as const,
  detailDirectoryReturnRevealsCurrentSelection: true as const,
  detailDirectoryRevealUsesPreviewAwareRenderPlanGeometry: true as const,
  detailAdjacentContinuousBrowseWired: true as const,
  detailBrowseVisibleDirectoryPositionWired: true as const,
  detailAdjacentTargetNamesVisible: true as const,
  detailSelectedIdentityVisibleInQuestion: true as const,
  weaponDetailCoreFightReadoutWired: true as const,
  mapDetailFourAnchorRouteSkeletonWired: true as const,
  mapDirectoryFourAnchorRouteSkeletonWired: true as const,
  preparationMapRouteSkeletonWired: true as const,
  preparationUniqueLongTermGoalFitWired: true as const,
  preparationUniqueLongTermGoalFitReusesResultRouteFit: true as const,
  preparationIncompatibleGoalFitDoesNotBlockStart: true as const,
  preparationConditionalSurvivalGoalNeverPromisesSupply: true as const,
  resultNextMapRouteSkeletonWired: true as const,
  resultNextWeaponCoreFightWired: true as const,
  weaponDirectoryBasicGestureReadoutWired: true as const,
  weaponDirectoryCoreFightReadoutWired: true as const,
  preparationWeaponCoreFightWired: true as const,
  modeSelectionShortContentSignatureWired: true as const,
  homeNextLearningSignatureWired: true as const,
  homeNextMatchContinuationRouteWired: true as const,
  homePrimaryActionAcceptsContinuationIntoExistingModeConfirmation: true as const,
  homeContinuationNeverAutoStartsMatch: true as const,
  homeSurvivalContinuationNeverPreselectsWeapon: true as const,
  homeContinuationFollowObservationOptInWired: true as const,
  homeContinuationFollowUsesFrozenMatchStartScene: true as const,
  homeContinuationObservationFailureNeverBlocksMatchStart: true as const,
  modeConfirmationShowsHomeContinuationPreparationState: true as const,
  adjustedHomeContinuationStillAllowsCurrentSelection: true as const,
  homeContinuationPreparationStateIndependentFromRetentionCollector: true as const,
  resultHomeContinuationReceiptUsesValidatedMatchStartScene: true as const,
  resultHomeContinuationReceiptNeverClaimsGoalCompletion: true as const,
  resultHomeContinuationReceiptFailureNeverBlocksMatch: true as const,
  resultMatchStartLearningGoalAttemptReceiptWired: true as const,
  resultMatchStartLearningGoalAttemptUsesFrozenProfileAndRegistryRead: true as const,
  resultMatchStartLearningGoalAttemptUsesReducerAppliedIdentityOnly: true as const,
  resultMatchStartLearningGoalAttemptIndependentFromRetentionCollector: true as const,
  resultGoalPreparationReusesContinuationConfirmationSession: true as const,
  resultGoalPreparationRevalidatesGoalModeWeaponAndMap: true as const,
  resultGoalPreparationPreservesSurvivalUnarmedStart: true as const,
  resultGoalPreparationNeverWritesHomeContinuationMetric: true as const,
  continuationPreparationOptionalDepthPreservesSession: true as const,
  continuationPreparationExplicitExitClearsAfterNavigation: true as const,
  continuationPreparationExitCompletesOnlyPendingHomeObservation: true as const,
  resultCollectionDetailCarriesPendingGoalPreparation: true as const,
  resultCollectionDetailRevalidatesGoalBeforeModeConfirmation: true as const,
  resultCollectionDetailAdjacentBrowseBecomesAdjustedPreparation: true as const,
  resultCollectionDetailExitClearsPendingPreparation: true as const,
  resultNewCollectionDetailWired: true as const,
  resultNewCollectionDetailUsesFrozenDataBoundary: true as const,
  canonicalEncodedSelectionAndDetailIntentsRequired: true as const,
  informationSelectionUsesFrozenDataBoundary: true as const,
  detailAdjacentBrowseUsesSingleFrozenValidatedProjection: true as const,
  characterInformationCatalogEntriesUseFrozenDataBoundary: true as const,
  pointerPointUsesFrozenDataBoundary: true as const,
  hudFeedbackConsumerUsesDescriptorOnlyBoundedConstruction: true as const,
  hudFeedbackConsumerMethodBindingAvoidsBindPropertyLookup: true as const,
  hudFeedbackConsumerSynchronousLifecycleReentryRejected: true as const,
  hudPresentationHostSynchronousLifecycleReentryRejected: true as const,
  hudTwentyWeaponFeedbackHostSynchronousLifecycleReentryRejected: true as const,
  authoritativePlayableHostSynchronousLifecycleReentryRejected: true as const,
  localPlayableHostSynchronousLifecycleReentryRejected: true as const,
  formalWebSynchronousLifecycleReentryRejected: true as const,
  formalWebSynchronousOperationLockScope:
    'load-media-setup-layout-match-settlement-registry-failure-shutdown-dispose' as const,
  swallowedChildDomOrObserverReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  childDomAndObserverCallbacksCheckedBeforeCrossOwnerOrStateCommit: true as const,
  callbackEntrypointsJoinOrCreateGuardedOperation: true as const,
  asyncChildOwnersAndSettlementHooksCapturedBeforeReentryCheck: true as const,
  runtimeCleanupReentryRetainsCurrentAndLaterOwners: true as const,
  ordinaryRuntimeCleanupFailureRetainsCurrentAndLaterOwners: true as const,
  runtimeCleanupCallbacksMustCompleteSynchronously: true as const,
  childSnapshotsCheckedBeforeAggregateSnapshotPublication: true as const,
  publicStateBindingSnapshotAndRetentionReadsUseStickyGuard: true as const,
  repeatedPrepareAndActivationReadsCheckReentryBeforeOwnerReuse: true as const,
  prepareOperationPublishedBeforeMatchHostPrepare: true as const,
  activationOperationPublishedBeforeMatchHostActivation: true as const,
  repeatedAsyncRequestsReusePublishedOwner: true as const,
  publishedPrepareAndActivationOwnersWaitForLaunchedChildren: true as const,
  asyncPrepareAndActivationSettlementCommitsUnderOperationGuard: true as const,
  failureRecordingUsesSynchronousOperationGuard: true as const,
  detachedSettlementAndResizeFailureCommitsAreContained: true as const,
  formalWebAudioActivationCommitReentersThroughOperationLock: true as const,
  formalWebScheduledSettlementCommitReentersThroughOperationLock: true as const,
  formalWebFailureShutdownCommitReentersThroughOperationLock: true as const,
  terminalFailureShutdownErrorCommitUsesOperationGuard: true as const,
  terminalFailureShutdownFallbackPreservesOriginalCause: true as const,
  formalWebDisposeFlagReleasedInFinally: true as const,
  hudConsumerEpochIdentityRequiresTrimmedNonEmptyString: true as const,
  hudCanvasExternalDataFieldsCapturedOnceByDescriptor: true as const,
  hudCanvasSynchronousLifecycleReentryRejected: true as const,
  hudCanvasLoadFailureRetainsRetryableDisposeOwnership: true as const,
  hudCanvasClearFailureRetainsRetryableDisposeOwnership: true as const,
  resultNewCollectionDetailUsesCommittedReducerOutcomeOnly: true as const,
  resultNewCollectionDetailReusesExistingDetailPages: true as const,
  resultNewCollectionDetailPreservesLongTermGoalPrimaryAction: true as const,
  resultNewCollectionDetailSelectionRequiresExplicitAction: true as const,
  resultNewCollectionDetailNeverStartsMatch: true as const,
  weaponContextGoalUsesFormalDefinitionOrder: true as const,
  resultNewCollectionTextAndActionsUseFormalDefinitionOrder: true as const,
  resultNewCollectionFormalOrderUsesSingleResolver: true as const,
  resultNewCollectionFormalOrderRejectsSparseAccessorAndExtraArrayFields: true as const,
  goalAlignedPlayAgainUsesRenderedRouteFitIdentity: true as const,
  goalAlignedPlayAgainRevalidatesStableOrConditionalFit: true as const,
  goalAlignedPlayAgainReceiptUsesValidatedMatchStartScene: true as const,
  arbitraryPlayAgainNeverClaimsGoalContinuation: true as const,
  explicitNextGoalReusesModeOrDetailContinuationSession: true as const,
  explicitNextGoalUnsupportedRoutesNeverClaimPreparation: true as const,
  staleContinuationPreparationHiddenWithoutMutation: true as const,
  staleContinuationPreparationClearedBeforeNextAction: true as const,
  staleContinuationNeverCreatesMatchReceipt: true as const,
  staleResultDetailContinuesAsOrdinaryNavigation: true as const,
  sevenOfflineRetentionObservationLifecycleOptInWired: true as const,
  eightOfflineRetentionObservationLifecycleOptInWired: true as const,
  legacySixMetricRetentionJournalMigrationWired: true as const,
  legacySevenMetricRetentionJournalMigrationWired: true as const,
  homeRecordSummaryWired: true as const,
  recordsBottomNavigationFocusWired: true as const,
  resultNextLearningSignatureWired: true as const,
  nextLearningGoalLightweightReadWired: true as const,
  detailAdjacentBrowseExcludesInactiveWeapons: true as const,
  informationPrimaryStartActionsRemainDirect: true as const,
  survivalCollectionNavigationCannotEquipBeforeMatch: true as const,
  ownsThreeModeDeterministicAuthority: true as const,
  supportsExplicitDurableActiveRegistryOwner: true as const,
  durableActiveRegistryOwnerDefaultWired: false as const,
  exposesRegistryRevisionHashAndWeaponPoolSnapshot: true as const,
  exposesInformationSurfaceOnlySingleWeaponPromotionLifecycle: true as const,
  exposesInformationSurfaceLearningSettlementRecoveryRetry: true as const,
  reusesExistingResultActionForLearningSettlementRecovery: true as const,
  exposesAssessmentOnlyFollowUpPromotionEntry: true as const,
  exposesCoarseFirstAndFollowUpRegistryPromotionOrchestration: true as const,
  explicitRegistryBackedFactoryAvailable: true as const,
  explicitFirstProvisionedRegistryFactoryAvailable: true as const,
  explicitRegistryBackedFactoryDefaultEntryWired: false as const,
  ownsFormalThreeSceneAndHud: true as const,
  ownsCollectionPreviewThreeSurface: true as const,
  ownsCharacterSelectionPreviewThreeSurface: true as const,
  ownsOfflineRetentionObservationJournalWhenOptedIn: true as const,
  offlineRetentionObservationExportReadWired: true as const,
  offlineRetentionObservationExportReadPerformsUpload: false as const,
  offlineRetentionObservationJournalDefaultWired: false as const,
  offlineRetentionObservationJournalOpenFailureAfterCompleteCleanupBlocksGame: false as const,
  offlineRetentionObservationJournalCleanupIncompleteBlocksConstruction: true as const,
  collectionPreviewIntegrationStage: 'A6.17' as const,
  collectionPreviewRendererCreation: 'first-valid-a6.15-frame' as const,
  collectionPreviewRendererCanvasTerminalWatermarks: Object.freeze([
    'renderer-disposed',
    'canvas-display-hidden',
    'canvas-width-reset',
    'canvas-height-reset',
  ] as const),
  collectionPreviewAddsPages: false as const,
  collectionPreviewAddsActions: false as const,
  collectionPreviewConsumesHostComposedInformationPlan: true as const,
  collectionPreviewPollsResources: false as const,
  collectionPreviewDefaultModelReadsAreAbortable: true as const,
  collectionPreviewDefaultModelPathsRestrictedToProjectAssets: true as const,
  characterPreviewAddsPages: false as const,
  characterPreviewAddsActions: false as const,
  characterPreviewCreatesRaf: false as const,
  characterPreviewRendererCreation: 'first-fully-visible-character-preview-frame' as const,
  characterPreviewRendererCanvasTerminalWatermarks: Object.freeze([
    'renderer-disposed',
    'canvas-display-hidden',
    'canvas-width-reset',
    'canvas-height-reset',
  ] as const),
  previewRendererFailureStopsBeforeLaterCanvasWatermarks: true as const,
  characterPreviewUsesCurrentModeLoadout: true as const,
  survivalCharacterPreviewRemainsUnarmed: true as const,
  characterPreviewScrollProjectionWired: true as const,
  characterPreviewFractionalScrollProjectionWired: true as const,
  characterPreviewFullyVisiblePolicy: 'entire-preview-rect-inside-content-clip' as const,
  characterPreviewScrollDoesNotRemountModel: true as const,
  characterPreviewClippedStateRetainsMount: true as const,
  characterPreviewClippedStateSkipsProfileAndLoadoutReads: true as const,
  characterPreviewPageExitReleasesMount: true as const,
  ownsFormalWebAudioAndTickVfx: true as const,
  ownsAdaptiveKeyboardOrPointerDriver: true as const,
  ownsFixedTickKeyboardDriverWhenSelected: true as const,
  ownsFixedTickPointerDriverWhenSelected: true as const,
  synchronousConstructionFailureUsesRollbackChain: true as const,
  hostContainerOwnershipTransferStartsInsideRollbackChain: true as const,
  hostContainerAppendFailureRetainsRetryableContainerOwner: true as const,
  resizeListenerPotentialOwnerRecordedBeforeRegistration: true as const,
  resizeListenerPartialRegistrationIsRetryableByConstructionLedger: true as const,
  keyboardVisibilityListenerPotentialOwnersRecordedBeforeRegistration: true as const,
  keyboardVisibilityRegistrationDebtTransferredToDriver: true as const,
  constructionCleanupRetainsRetryableCompleteOwnerTree: true as const,
  constructionCleanupAcceptsFormalMatchHostDebt: true as const,
  constructionCleanupAcceptsPointerSurfaceRootDebt: true as const,
  constructionCleanupSettlesPointerSurfaceRootDebtBeforeContainerRemoval: true as const,
  constructionCleanupWaitsForNestedLocalAndRegistryDebt: true as const,
  constructionCleanupReleasesLocalConsumersBeforeMatchMediaProducer: true as const,
  constructionCleanupStopsAtFirstIncompleteOwner: true as const,
  constructionCleanupCallbacksMustCompleteSynchronously: true as const,
  constructionFailureReportsTransferredRegistryBootstrapOwnership: true as const,
  firstProvisionedFactoryDoesNotDoubleDestroyRetainedBootstrap: true as const,
  matchHostSettlementContinuesIncompleteConstructionOwnerRollback: true as const,
  synchronousHostSettlementCannotReenterConstructionOwnerRollback: true as const,
  synchronousHostSettlementPreservesOnePostAttemptContinuation: true as const,
  constructionRollbackContinuationDoesNotPoll: true as const,
  arbitraryConstructionFailureValuePreservedWithoutStringification: true as const,
  anyCompositionFailureStopsOwnedDriverBeforeNextPlatformTurn: true as const,
  failureShutdownReleasesOwnedRuntimeResources: true as const,
  failureShutdownAndDisposeShareCleanupLedger: true as const,
  matchHostTerminalCleanupSettlementRetriesFailureShutdown: true as const,
  independentMatchHostFailurePropagatesToComposition: true as const,
  cleanupRetriesOnlyIncompleteOwnedResources: true as const,
  runtimeCleanupWaitsForResizeAndDriverBeforeIndependentDependencies: true as const,
  failureShutdownRetainsDiagnosticContainerUntilDispose: true as const,
  failedSurfaceTransitionHidesAllInformationMatchAndPreviewLayers: true as const,
  failedSurfaceTransitionDisablesPointerBeforeDiagnosticContainerRetention: true as const,
  activeSurfacePublishesOnlyAfterCompleteLayerAndAccessibilityCommit: true as const,
  containerRemovalWaitsForOwnedRuntimeCleanup: true as const,
  terminalStateRequiresOwnedRuntimeAndContainerCleanup: true as const,
  projectsPrimaryAvailabilityFromAuthorityScene: true as const,
  actionAvailabilityClearOrder: Object.freeze([
    'movement',
    'primary',
    'jump',
  ] as const),
  actionAvailabilityClearStopsAtFirstIncompleteField: true as const,
  actionAvailabilityRollbackStopsAtFirstIncompleteField: true as const,
  primaryAvailabilityIncludesPressOrHoldAffordance: true as const,
  primaryAvailabilityIncludesActiveHoldCommitment: true as const,
  primaryGestureHintUsesAuthorityChargeLevel: true as const,
  refreshesPrimaryAvailabilityOnEveryAuthoritativeStep: true as const,
  inputConceptCount: 3 as const,
  directionJumpAndPrimaryOnly: true as const,
  terminalMatchAutoSettlesToResultPage: true as const,
  defaultResultPrimaryDecision: 'play-again' as const,
  defaultResultPrimaryDecisionAdvancesAfterCollectionCompletion: true as const,
  defaultResultPrimaryDecisionAlignsWithResolvedGoalRoute: true as const,
  defaultStableOrConditionalGoalKeepsReplay: true as const,
  defaultGoalAdjustmentUsesShortestPreparedRoute: true as const,
  explicitResultDecisionAlwaysWins: true as const,
  settledExplicitNextGoalRouteIdentityFrozen: true as const,
  resultPrimaryActionCount: 1 as const,
  offlineWeaponResearchFocusContinuationCollectorOptIn: true as const,
  defaultRetentionObservationSinkWired: false as const,
  offlineLearningPaceCalibrationReadWired: true as const,
  offlineLearningPaceCalibrationBindsSourceJournalIdentity: true as const,
  offlineLearningPaceCalibrationReportsTruncatedTailWindow: true as const,
  offlineLearningPaceCalibrationMutatesProgression: false as const,
  offlineLearningPaceCalibrationClaimsObservedRetention: false as const,
  offlineWeaponResearchPaceCalibrationReadWired: true as const,
  offlineWeaponResearchPaceCalibrationUsesPageLifetimeBaselineToken: true as const,
  offlineWeaponResearchPaceCalibrationPreservesBaselineAcrossCompositionRetry: true as const,
  offlineWeaponResearchPaceCalibrationPreservesBaselineAcrossBfcacheRestore: true as const,
  offlineWeaponResearchPaceCalibrationPersistsBaselineAcrossPageReload: true as const,
  offlineWeaponResearchPaceDurableBaselineUsesLeaseHashAndReadBack: true as const,
  offlineWeaponResearchPaceDurableBaselineCompactsSettlementCountsAndTicks: true as const,
  offlineWeaponResearchPaceDurableBaselineSurvivesJournalTailEviction: true as const,
  offlineWeaponResearchPaceDurableBaselineSynchronizesOnInformationSurface: true as const,
  offlineWeaponResearchPaceFreezesAtCatalogCompletion: true as const,
  offlineWeaponResearchPaceIgnoresPostCompletionMatches: true as const,
  offlineWeaponResearchPaceAmbiguousCompletionBoundaryFailsClosed: true as const,
  offlineWeaponResearchPaceDurableFailureFallsBackToPageBaseline: true as const,
  offlineWeaponResearchPaceCalibrationTokenExposesRawProfile: false as const,
  offlineWeaponResearchPaceCalibrationLocalHostReferenceIsReadOnlyAlias: true as const,
  offlineWeaponResearchPaceCalibrationRequiresContiguousProfileWindow: true as const,
  offlineWeaponResearchPaceCalibrationPublishesNoEstimateForIncompleteWindow: true as const,
  offlineWeaponResearchPaceCalibrationExposesRawProfileId: false as const,
  offlineWeaponResearchPaceCalibrationMutatesProgression: false as const,
  offlineWeaponResearchPaceCalibrationAddsRetentionMetric: false as const,
  offlineWeaponResearchPaceCalibrationClaimsObservedRetention: false as const,
  pointerDriverAvailableSeparately: true as const,
  requiresLoadingPhaseFormalAssetPreload: true as const,
  requiresUserGestureAudioActivation: true as const,
  formalVisualAssetsReady: false as const,
  formalAudioAssetsReady: false as const,
  validationStatus: 'not-run' as const,
});
