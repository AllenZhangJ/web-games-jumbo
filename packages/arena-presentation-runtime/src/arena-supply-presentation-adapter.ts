import {
  ARENA_MATCH_EVENT,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1,
  ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1,
  ARENA_SUPPLY_PRESENTATION_MAX_EVENTS_PER_UPDATE,
  ARENA_SUPPLY_PRESENTATION_MAX_MARKERS,
  ARENA_SUPPLY_PRESENTATION_MAX_PENDING_REPLACEMENT_PAIRS,
  ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
  ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1,
  ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1,
  createArenaSupplyPresentationAdapterOptionsV1,
  createArenaSupplyPresentationCueV1,
  createArenaSupplyPresentationDebugSnapshotV1,
  createArenaSupplyPresentationEventCanonicalHashV1,
  createArenaSupplyPresentationMarkerV1,
  createArenaSupplyPresentationStartInputV1,
  createArenaSupplyPresentationUpdateInputV1,
  createArenaSupplyPresentationViewV1,
  type ArenaSupplyPresentationAdapterOptionsV1,
  type ArenaSupplyPresentationCueV1,
  type ArenaSupplyPresentationDebugSnapshotV1,
  type ArenaSupplyPresentationEventV1,
  type ArenaSupplyPresentationExpiredEventV1,
  type ArenaSupplyPresentationLifecycleStateV1,
  type ArenaSupplyPresentationMarkerV1,
  type ArenaSupplyPresentationPickedUpEventV1,
  type ArenaSupplyPresentationRecycledEventV1,
  type ArenaSupplyPresentationReplacedEventV1,
  type ArenaSupplyPresentationStartInputV1,
  type ArenaSupplyPresentationStrictSpawnedEventV1,
  type ArenaSupplyPresentationTerminalFailureKindV1,
  type ArenaSupplyPresentationUpdateInputV1,
  type ArenaSupplyPresentationViewV1,
} from '@number-strategy-jump/arena-presentation-contracts';

interface MarkerState {
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly slotId: string;
  readonly equipmentInstanceId: string;
  readonly equipmentDefinitionId: string;
  readonly equipmentSpawnId: string;
  readonly spawnPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly spawnTick: number;
  readonly expireTick: number;
}

interface RecentEventIdentity {
  readonly id: string;
  readonly sequence: number;
  readonly hash: string;
}

interface PendingReplacement {
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly participantId: string;
  readonly previousEquipmentInstanceId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly sourceEventId: string;
}

interface AdapterState {
  readonly generation: number;
  readonly lifecycleState: ArenaSupplyPresentationLifecycleStateV1;
  readonly snapshotTick: number | null;
  readonly nextExpectedEventSequence: number | null;
  readonly snapshotProjectionHash: string | null;
  readonly markers: ReadonlyMap<string, MarkerState>;
  readonly recentById: ReadonlyMap<string, RecentEventIdentity>;
  readonly recentBySequence: ReadonlyMap<number, RecentEventIdentity>;
  readonly recentOrder: readonly RecentEventIdentity[];
  readonly pendingReplacements: ReadonlyMap<string, PendingReplacement>;
  readonly acceptedEventCount: number;
  readonly duplicateEventCount: number;
  readonly resyncCount: number;
  readonly terminalFailureKind: ArenaSupplyPresentationTerminalFailureKindV1 | null;
}

interface MutableDraft {
  generation: number;
  lifecycleState: ArenaSupplyPresentationLifecycleStateV1;
  snapshotTick: number | null;
  nextExpectedEventSequence: number | null;
  snapshotProjectionHash: string | null;
  markers: Map<string, MarkerState>;
  recentById: Map<string, RecentEventIdentity>;
  recentBySequence: Map<number, RecentEventIdentity>;
  recentOrder: RecentEventIdentity[];
  pendingReplacements: Map<string, PendingReplacement>;
  acceptedEventCount: number;
  duplicateEventCount: number;
  resyncCount: number;
  terminalFailureKind: ArenaSupplyPresentationTerminalFailureKindV1 | null;
}

class SnapshotResyncSignal extends Error {}
class EventIdentityConflictError extends Error {}
class AdapterInputError extends Error {}
class ReentrantCallError extends Error {}

function initialState(): AdapterState {
  return Object.freeze({
    generation: 1,
    lifecycleState: ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.CREATED,
    snapshotTick: null,
    nextExpectedEventSequence: null,
    snapshotProjectionHash: null,
    markers: new Map(),
    recentById: new Map(),
    recentBySequence: new Map(),
    recentOrder: Object.freeze([]),
    pendingReplacements: new Map(),
    acceptedEventCount: 0,
    duplicateEventCount: 0,
    resyncCount: 0,
    terminalFailureKind: null,
  });
}

function cloneDraft(state: AdapterState): MutableDraft {
  return {
    generation: state.generation,
    lifecycleState: state.lifecycleState,
    snapshotTick: state.snapshotTick,
    nextExpectedEventSequence: state.nextExpectedEventSequence,
    snapshotProjectionHash: state.snapshotProjectionHash,
    markers: new Map(state.markers),
    recentById: new Map(state.recentById),
    recentBySequence: new Map(state.recentBySequence),
    recentOrder: [...state.recentOrder],
    pendingReplacements: new Map(state.pendingReplacements),
    acceptedEventCount: state.acceptedEventCount,
    duplicateEventCount: state.duplicateEventCount,
    resyncCount: state.resyncCount,
    terminalFailureKind: state.terminalFailureKind,
  };
}

function samePosition(
  left: Readonly<{ x: number; y: number; z: number }>,
  right: Readonly<{ x: number; y: number; z: number }>,
): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function snapshotProjectionHash(input: ArenaSupplyPresentationStartInputV1): string {
  return createDeterministicDataHash({
    equipment: input.equipment,
    activeSupplyProjection: input.activeSupplyProjection,
  }, 'ArenaSupplyPresentationAdapter snapshot projection');
}

function markerStateFromProjection(
  item: ArenaSupplyPresentationStartInputV1['activeSupplyProjection']['supplies'][number],
): MarkerState {
  return Object.freeze({
    supplyDefinitionId: item.supplyDefinitionId,
    supplyId: item.supplyId,
    slotId: item.slotId,
    equipmentInstanceId: item.equipmentInstanceId,
    equipmentDefinitionId: item.equipmentDefinitionId,
    equipmentSpawnId: item.equipmentSpawnId,
    spawnPosition: item.spawnPosition,
    position: item.position,
    spawnTick: item.spawnTick,
    expireTick: item.expireTick,
  });
}

function projectionMarkerStates(
  input: ArenaSupplyPresentationStartInputV1,
): Map<string, MarkerState> {
  const result = new Map<string, MarkerState>();
  for (const item of input.activeSupplyProjection.supplies) {
    result.set(item.supplyId, markerStateFromProjection(item));
  }
  return result;
}

function presentationMarkers(
  input: ArenaSupplyPresentationStartInputV1,
  ticksPerSecond: number,
): readonly ArenaSupplyPresentationMarkerV1[] {
  return Object.freeze(input.activeSupplyProjection.supplies.map((item) => (
    createArenaSupplyPresentationMarkerV1({
      schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
      supplyDefinitionId: item.supplyDefinitionId,
      supplyId: item.supplyId,
      equipmentInstanceId: item.equipmentInstanceId,
      equipmentDefinitionId: item.equipmentDefinitionId,
      position: item.position,
      spawnTick: item.spawnTick,
      expireTick: item.expireTick,
      remainingTicks: item.remainingTicks,
      labelSeconds: Math.ceil(item.remainingTicks / ticksPerSecond),
    })
  )));
}

function sameMarkerIdentity(left: MarkerState, right: MarkerState): boolean {
  return left.supplyDefinitionId === right.supplyDefinitionId
    && left.supplyId === right.supplyId
    && left.slotId === right.slotId
    && left.equipmentInstanceId === right.equipmentInstanceId
    && left.equipmentDefinitionId === right.equipmentDefinitionId
    && left.equipmentSpawnId === right.equipmentSpawnId
    && left.spawnTick === right.spawnTick
    && left.expireTick === right.expireTick
    && samePosition(left.spawnPosition, right.spawnPosition);
}

function assertAndRefreshProjectionClosure(
  simulated: ReadonlyMap<string, MarkerState>,
  projected: ReadonlyMap<string, MarkerState>,
): Map<string, MarkerState> {
  if (simulated.size !== projected.size) {
    throw new SnapshotResyncSignal('事件模拟 marker 数量与 post projection 不一致。');
  }
  const refreshed = new Map<string, MarkerState>();
  for (const [supplyId, projectedMarker] of projected) {
    const simulatedMarker = simulated.get(supplyId);
    if (simulatedMarker === undefined || !sameMarkerIdentity(simulatedMarker, projectedMarker)) {
      throw new SnapshotResyncSignal(`事件模拟 marker ${supplyId} 与 post projection 不一致。`);
    }
    refreshed.set(supplyId, projectedMarker);
  }
  return refreshed;
}

function createView(
  options: ArenaSupplyPresentationAdapterOptionsV1,
  input: ArenaSupplyPresentationStartInputV1,
  status: typeof ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1[
    keyof typeof ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1
  ],
  markers: readonly ArenaSupplyPresentationMarkerV1[],
  cues: readonly ArenaSupplyPresentationCueV1[],
  resyncedFromSnapshot: boolean,
): ArenaSupplyPresentationViewV1 {
  return createArenaSupplyPresentationViewV1({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: options.streamId,
    status,
    snapshotTick: input.snapshotTick,
    snapshotEventSequence: input.snapshotEventSequence,
    nextExpectedEventSequence: input.snapshotEventSequence,
    resyncedFromSnapshot,
    markers,
    cues,
  });
}

function isReady(input: ArenaSupplyPresentationStartInputV1): boolean {
  return input.activeSupplyProjection.resyncReadiness === 'ready';
}

function strictSpawned(
  event: ArenaSupplyPresentationEventV1,
): ArenaSupplyPresentationStrictSpawnedEventV1 | null {
  return event.type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED
    && Object.hasOwn(event, 'payload')
    ? event as ArenaSupplyPresentationStrictSpawnedEventV1
    : null;
}

function pickedUp(
  event: ArenaSupplyPresentationEventV1,
): ArenaSupplyPresentationPickedUpEventV1 | null {
  return event.type === ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP
    ? event as ArenaSupplyPresentationPickedUpEventV1
    : null;
}

function recycled(
  event: ArenaSupplyPresentationEventV1,
): ArenaSupplyPresentationRecycledEventV1 | null {
  return event.type === ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED
    ? event as ArenaSupplyPresentationRecycledEventV1
    : null;
}

function replaced(
  event: ArenaSupplyPresentationEventV1,
): ArenaSupplyPresentationReplacedEventV1 | null {
  return event.type === ARENA_MATCH_EVENT.EQUIPMENT_REPLACED
    ? event as ArenaSupplyPresentationReplacedEventV1
    : null;
}

function expired(
  event: ArenaSupplyPresentationEventV1,
): ArenaSupplyPresentationExpiredEventV1 | null {
  return event.type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED
    ? event as ArenaSupplyPresentationExpiredEventV1
    : null;
}

function payloadMatchesMarker(
  payload: ArenaSupplyPresentationRecycledEventV1['payload']
    | ArenaSupplyPresentationReplacedEventV1['payload']
    | ArenaSupplyPresentationExpiredEventV1['payload'],
  marker: MarkerState,
): boolean {
  return payload.supplyDefinitionId === marker.supplyDefinitionId
    && payload.supplyId === marker.supplyId
    && payload.equipmentInstanceId === marker.equipmentInstanceId
    && payload.spawnTick === marker.spawnTick
    && payload.expireTick === marker.expireTick;
}

function requireMarkerForStrictPayload(
  markers: ReadonlyMap<string, MarkerState>,
  payload: ArenaSupplyPresentationRecycledEventV1['payload']
    | ArenaSupplyPresentationReplacedEventV1['payload']
    | ArenaSupplyPresentationExpiredEventV1['payload'],
): MarkerState {
  const marker = markers.get(payload.supplyId);
  if (marker === undefined || !payloadMatchesMarker(payload, marker)) {
    throw new SnapshotResyncSignal('strict terminal event 无法唯一命中 active supply。');
  }
  return marker;
}

function markerStateFromSpawn(
  event: ArenaSupplyPresentationStrictSpawnedEventV1,
  options: ArenaSupplyPresentationAdapterOptionsV1,
): MarkerState {
  const payload = event.payload;
  const spec = options.lifecycleContract.spawnSpecs.find((candidate) => (
    payload.supplyId.endsWith(`:slot-${candidate.slotId}`)
    && payload.equipmentDefinitionId === candidate.equipmentDefinitionId
    && payload.spawnId === candidate.spawnId
    && samePosition(payload.position, candidate.position)
  ));
  if (spec === undefined
    || payload.supplyDefinitionId !== options.lifecycleContract.supplyDefinitionId
    || payload.equipmentInstanceId !== `${payload.supplyId}:equipment`) {
    throw new SnapshotResyncSignal('strict spawned identity 未绑定冻结 lifecycle contract。');
  }
  const prefix = `${options.lifecycleContract.supplyDefinitionId}:wave-`;
  const suffix = `:slot-${spec.slotId}`;
  if (!payload.supplyId.startsWith(prefix) || !payload.supplyId.endsWith(suffix)) {
    throw new SnapshotResyncSignal('strict spawned supply identity 不 canonical。');
  }
  const waveToken = payload.supplyId.slice(prefix.length, -suffix.length);
  const waveIndex = Number(waveToken);
  const expectedSpawnTick = options.lifecycleContract.firstSpawnTick
    + options.lifecycleContract.spawnIntervalTicks * waveIndex;
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0 || String(waveIndex) !== waveToken
    || payload.spawnTick !== expectedSpawnTick
    || payload.expireTick !== expectedSpawnTick + options.lifecycleContract.lifetimeTicks) {
    throw new SnapshotResyncSignal('strict spawned wave/lifecycle identity 无效。');
  }
  return Object.freeze({
    supplyDefinitionId: payload.supplyDefinitionId,
    supplyId: payload.supplyId,
    slotId: spec.slotId,
    equipmentInstanceId: payload.equipmentInstanceId,
    equipmentDefinitionId: payload.equipmentDefinitionId,
    equipmentSpawnId: payload.spawnId,
    spawnPosition: payload.position,
    position: payload.position,
    spawnTick: payload.spawnTick,
    expireTick: payload.expireTick,
  });
}

export class ArenaSupplyPresentationAdapter {
  readonly #options: ArenaSupplyPresentationAdapterOptionsV1;
  #state: AdapterState = initialState();
  #inTransaction = false;
  #reentrantObserved = false;

  constructor(options: unknown) {
    this.#inTransaction = true;
    try {
      this.#options = createArenaSupplyPresentationAdapterOptionsV1(options);
    } finally {
      this.#inTransaction = false;
    }
  }

  start(input: unknown): ArenaSupplyPresentationViewV1 {
    this.#enterTransaction();
    let inputValidated = false;
    try {
      this.#assertStartAllowed();
      const normalized = createArenaSupplyPresentationStartInputV1(
        input,
        this.#options.lifecycleContract,
      );
      inputValidated = true;
      const draft = cloneDraft(this.#state);
      const ready = isReady(normalized);
      draft.lifecycleState = ready
        ? ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.ACTIVE
        : ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.RESYNC_REQUIRED;
      draft.snapshotTick = normalized.snapshotTick;
      draft.nextExpectedEventSequence = normalized.snapshotEventSequence;
      draft.snapshotProjectionHash = snapshotProjectionHash(normalized);
      draft.markers = ready ? projectionMarkerStates(normalized) : new Map();
      draft.pendingReplacements.clear();
      draft.terminalFailureKind = null;
      const view = createView(
        this.#options,
        normalized,
        ready
          ? ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.READY
          : ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.RESYNC_REQUIRED,
        ready ? presentationMarkers(normalized, this.#options.ticksPerSecond) : [],
        [],
        false,
      );
      this.#assertNoReentrantCall();
      this.#publishDraft(draft);
      return view;
    } catch (error) {
      return this.#failMutation(error, inputValidated);
    } finally {
      this.#leaveTransaction();
    }
  }

  update(input: unknown): ArenaSupplyPresentationViewV1 {
    this.#enterTransaction();
    let inputValidated = false;
    try {
      this.#assertUpdateAllowed();
      const normalized = createArenaSupplyPresentationUpdateInputV1(
        input,
        this.#options.lifecycleContract,
      );
      inputValidated = true;
      const viewAndDraft = this.#createUpdateDraft(normalized);
      this.#assertNoReentrantCall();
      this.#publishDraft(viewAndDraft.draft);
      return viewAndDraft.view;
    } catch (error) {
      return this.#failMutation(error, inputValidated);
    } finally {
      this.#leaveTransaction();
    }
  }

  getDebugSnapshot(): ArenaSupplyPresentationDebugSnapshotV1 {
    this.#enterTransaction();
    try {
      const result = createArenaSupplyPresentationDebugSnapshotV1({
        schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
        streamId: this.#options.streamId,
        lifecycleState: this.#state.lifecycleState,
        snapshotTick: this.#state.snapshotTick,
        nextExpectedEventSequence: this.#state.nextExpectedEventSequence,
        markerCount: this.#state.markers.size,
        pendingReplacementPairCount: this.#state.pendingReplacements.size,
        recentEventHashCount: this.#state.recentOrder.length,
        acceptedEventCount: this.#state.acceptedEventCount,
        duplicateEventCount: this.#state.duplicateEventCount,
        resyncCount: this.#state.resyncCount,
        terminalFailureKind: this.#state.terminalFailureKind,
      });
      this.#assertNoReentrantCall();
      return result;
    } catch (error) {
      if (this.#reentrantObserved
        && this.#state.lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED) {
        this.#publishFailure(ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1.REENTRANT_CALL);
        throw new ReentrantCallError('ArenaSupplyPresentationAdapter 检测到重入调用。');
      }
      throw error;
    } finally {
      this.#leaveTransaction();
    }
  }

  destroy(): void {
    this.#enterTransaction();
    try {
      if (this.#state.lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED) {
        this.#assertNoReentrantCall();
        return;
      }
      const draft = cloneDraft(this.#state);
      draft.generation += 1;
      draft.lifecycleState = ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED;
      draft.snapshotTick = null;
      draft.nextExpectedEventSequence = null;
      draft.snapshotProjectionHash = null;
      draft.markers.clear();
      draft.recentById.clear();
      draft.recentBySequence.clear();
      draft.recentOrder = [];
      draft.pendingReplacements.clear();
      draft.acceptedEventCount = 0;
      draft.duplicateEventCount = 0;
      draft.resyncCount = 0;
      this.#assertNoReentrantCall();
      this.#publishDraft(draft);
    } catch (error) {
      if (this.#reentrantObserved
        && this.#state.lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED) {
        this.#publishFailure(ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1.REENTRANT_CALL);
        throw new ReentrantCallError('ArenaSupplyPresentationAdapter 检测到重入调用。');
      }
      throw error;
    } finally {
      this.#leaveTransaction();
    }
  }

  #createUpdateDraft(input: ArenaSupplyPresentationUpdateInputV1): Readonly<{
    draft: MutableDraft;
    view: ArenaSupplyPresentationViewV1;
  }> {
    if (this.#state.snapshotTick === null || this.#state.nextExpectedEventSequence === null) {
      throw new Error('ArenaSupplyPresentationAdapter active state 缺少 waterline。');
    }
    if (input.snapshotTick < this.#state.snapshotTick
      || input.snapshotEventSequence < this.#state.nextExpectedEventSequence) {
      throw new AdapterInputError('snapshot waterline 回退必须创建新的 stream Adapter。');
    }
    if (this.#state.lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.RESYNC_REQUIRED) {
      return this.#createResyncRecoveryDraft(input);
    }
    if (input.events.length > ARENA_SUPPLY_PRESENTATION_MAX_EVENTS_PER_UPDATE) {
      return this.#createSnapshotResyncDraft(input);
    }
    if (input.snapshotTick === this.#state.snapshotTick
      && input.snapshotEventSequence === this.#state.nextExpectedEventSequence
      && input.events.length === 0
      && snapshotProjectionHash(input) !== this.#state.snapshotProjectionHash) {
      throw new AdapterInputError('同 snapshot waterline 的无事件重读发生 projection 漂移。');
    }
    if (!isReady(input)) {
      this.#assertNoRecentIdentityConflict(input.events);
      return this.#createSnapshotResyncDraft(input);
    }
    const draft = cloneDraft(this.#state);
    const cues: ArenaSupplyPresentationCueV1[] = [];
    let cursor = this.#state.nextExpectedEventSequence;
    try {
      for (const event of input.events) {
        const hash = createArenaSupplyPresentationEventCanonicalHashV1(event);
        const duplicate = this.#classifyEventIdentity(draft, event, hash);
        if (duplicate) {
          draft.duplicateEventCount += 1;
          continue;
        }
        if (event.sequence < cursor) {
          throw new SnapshotResyncSignal('recent ring 外旧事件不能重播。');
        }
        if (event.sequence !== cursor) {
          throw new SnapshotResyncSignal('事件未完整覆盖半开 sequence 窗口。');
        }
        this.#processAcceptedEvent(draft, event, cues);
        this.#appendRecentEvent(draft, event, hash);
        draft.acceptedEventCount += 1;
        cursor += 1;
      }
      if (cursor !== input.snapshotEventSequence || draft.pendingReplacements.size !== 0) {
        throw new SnapshotResyncSignal('事件窗口存在 gap 或未闭合 replacement pair。');
      }
      const projected = projectionMarkerStates(input);
      draft.markers = assertAndRefreshProjectionClosure(draft.markers, projected);
      draft.lifecycleState = ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.ACTIVE;
      draft.snapshotTick = input.snapshotTick;
      draft.nextExpectedEventSequence = input.snapshotEventSequence;
      draft.snapshotProjectionHash = snapshotProjectionHash(input);
      draft.terminalFailureKind = null;
      const view = createView(
        this.#options,
        input,
        ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.READY,
        presentationMarkers(input, this.#options.ticksPerSecond),
        Object.freeze(cues),
        false,
      );
      return Object.freeze({ draft, view });
    } catch (error) {
      if (error instanceof SnapshotResyncSignal) {
        return this.#createSnapshotResyncDraft(input);
      }
      throw error;
    }
  }

  #createResyncRecoveryDraft(input: ArenaSupplyPresentationUpdateInputV1): Readonly<{
    draft: MutableDraft;
    view: ArenaSupplyPresentationViewV1;
  }> {
    if (!isReady(input)) {
      const draft = this.#blankResyncDraft(input, false);
      const view = createView(
        this.#options,
        input,
        ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.RESYNC_REQUIRED,
        [],
        [],
        false,
      );
      return Object.freeze({ draft, view });
    }
    const draft = this.#blankResyncDraft(input, false);
    draft.lifecycleState = ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.ACTIVE;
    draft.markers = projectionMarkerStates(input);
    const view = createView(
      this.#options,
      input,
      ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.READY,
      presentationMarkers(input, this.#options.ticksPerSecond),
      [],
      true,
    );
    return Object.freeze({ draft, view });
  }

  #createSnapshotResyncDraft(input: ArenaSupplyPresentationUpdateInputV1): Readonly<{
    draft: MutableDraft;
    view: ArenaSupplyPresentationViewV1;
  }> {
    const ready = isReady(input);
    const draft = this.#blankResyncDraft(input, true);
    if (ready) {
      draft.lifecycleState = ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.ACTIVE;
      draft.markers = projectionMarkerStates(input);
    }
    const view = createView(
      this.#options,
      input,
      ready
        ? ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.READY
        : ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.RESYNC_REQUIRED,
      ready ? presentationMarkers(input, this.#options.ticksPerSecond) : [],
      [],
      ready,
    );
    return Object.freeze({ draft, view });
  }

  #blankResyncDraft(
    input: ArenaSupplyPresentationUpdateInputV1,
    incrementCounter: boolean,
  ): MutableDraft {
    const draft = cloneDraft(this.#state);
    draft.lifecycleState = ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.RESYNC_REQUIRED;
    draft.snapshotTick = input.snapshotTick;
    draft.nextExpectedEventSequence = input.snapshotEventSequence;
    draft.snapshotProjectionHash = snapshotProjectionHash(input);
    draft.markers.clear();
    draft.recentById.clear();
    draft.recentBySequence.clear();
    draft.recentOrder = [];
    draft.pendingReplacements.clear();
    if (incrementCounter) draft.resyncCount += 1;
    draft.terminalFailureKind = null;
    return draft;
  }

  #classifyEventIdentity(
    draft: MutableDraft,
    event: ArenaSupplyPresentationEventV1,
    hash: string,
  ): boolean {
    const byId = draft.recentById.get(event.id);
    const bySequence = draft.recentBySequence.get(event.sequence);
    if (byId === undefined && bySequence === undefined) return false;
    if (byId !== undefined && bySequence !== undefined
      && byId.id === event.id && byId.sequence === event.sequence && byId.hash === hash
      && bySequence.id === event.id && bySequence.sequence === event.sequence
      && bySequence.hash === hash) {
      return true;
    }
    throw new EventIdentityConflictError('事件 id/sequence 已绑定不同 canonical hash。');
  }

  #assertNoRecentIdentityConflict(events: readonly ArenaSupplyPresentationEventV1[]): void {
    for (const event of events) {
      const hash = createArenaSupplyPresentationEventCanonicalHashV1(event);
      const byId = this.#state.recentById.get(event.id);
      const bySequence = this.#state.recentBySequence.get(event.sequence);
      if (byId === undefined && bySequence === undefined) continue;
      if (byId !== undefined && bySequence !== undefined
        && byId.id === event.id && byId.sequence === event.sequence && byId.hash === hash
        && bySequence.id === event.id && bySequence.sequence === event.sequence
        && bySequence.hash === hash) {
        continue;
      }
      throw new EventIdentityConflictError(
        'not-ready 前检测到事件 id/sequence canonical hash 冲突。',
      );
    }
  }

  #appendRecentEvent(
    draft: MutableDraft,
    event: ArenaSupplyPresentationEventV1,
    hash: string,
  ): void {
    const identity = Object.freeze({ id: event.id, sequence: event.sequence, hash });
    draft.recentById.set(identity.id, identity);
    draft.recentBySequence.set(identity.sequence, identity);
    draft.recentOrder.push(identity);
    while (draft.recentOrder.length > this.#options.recentEventCapacity) {
      const evicted = draft.recentOrder.shift();
      if (evicted === undefined) throw new Error('recent event ring 驱逐失败。');
      if (draft.recentById.get(evicted.id) === evicted) draft.recentById.delete(evicted.id);
      if (draft.recentBySequence.get(evicted.sequence) === evicted) {
        draft.recentBySequence.delete(evicted.sequence);
      }
    }
  }

  #processAcceptedEvent(
    draft: MutableDraft,
    event: ArenaSupplyPresentationEventV1,
    cues: ArenaSupplyPresentationCueV1[],
  ): void {
    if (draft.pendingReplacements.size > 0 && replaced(event) === null) {
      throw new SnapshotResyncSignal('EquipmentRecycled 后必须紧随 EquipmentReplaced。');
    }
    const spawnEvent = strictSpawned(event);
    if (spawnEvent !== null) {
      const marker = markerStateFromSpawn(spawnEvent, this.#options);
      if (draft.markers.has(marker.supplyId)
        || [...draft.markers.values()].some((item) => (
          item.equipmentInstanceId === marker.equipmentInstanceId
        ))) {
        throw new SnapshotResyncSignal('strict spawned identity 已处于 active。');
      }
      draft.markers.set(marker.supplyId, marker);
      cues.push(createArenaSupplyPresentationCueV1({
        schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
        id: `${this.#options.streamId}:supply-cue-v1:${event.sequence}-${event.sequence}:spawned`,
        kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.SPAWNED,
        sourceEventIds: [event.id],
        tick: event.tick,
        sequenceStart: event.sequence,
        sequenceEnd: event.sequence,
        supplyId: marker.supplyId,
        equipmentInstanceId: marker.equipmentInstanceId,
        participantId: null,
        previousEquipmentInstanceId: null,
        nextEquipmentInstanceId: null,
      }));
      return;
    }
    const pickupEvent = pickedUp(event);
    if (pickupEvent !== null) {
      const matches = [...draft.markers.values()].filter((marker) => (
        marker.equipmentInstanceId === pickupEvent.equipmentInstanceId
      ));
      if (matches.length === 0) return;
      if (matches.length !== 1
        || matches[0]!.equipmentDefinitionId !== pickupEvent.equipmentDefinitionId) {
        throw new SnapshotResyncSignal('EquipmentPickedUp active identity 无法唯一恢复。');
      }
      const marker = matches[0]!;
      draft.markers.delete(marker.supplyId);
      cues.push(createArenaSupplyPresentationCueV1({
        schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
        id: `${this.#options.streamId}:supply-cue-v1:${event.sequence}-${event.sequence}:picked-up`,
        kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.PICKED_UP,
        sourceEventIds: [event.id],
        tick: event.tick,
        sequenceStart: event.sequence,
        sequenceEnd: event.sequence,
        supplyId: marker.supplyId,
        equipmentInstanceId: marker.equipmentInstanceId,
        participantId: pickupEvent.participantId,
        previousEquipmentInstanceId: null,
        nextEquipmentInstanceId: null,
      }));
      return;
    }
    const recycledEvent = recycled(event);
    if (recycledEvent !== null) {
      const marker = requireMarkerForStrictPayload(draft.markers, recycledEvent.payload);
      if (draft.pendingReplacements.size >= ARENA_SUPPLY_PRESENTATION_MAX_PENDING_REPLACEMENT_PAIRS
        || draft.pendingReplacements.has(marker.supplyId)) {
        throw new SnapshotResyncSignal('replacement pending pair 超过有界容量或重复。');
      }
      draft.pendingReplacements.set(marker.supplyId, Object.freeze({
        supplyId: marker.supplyId,
        equipmentInstanceId: marker.equipmentInstanceId,
        participantId: recycledEvent.payload.participantId,
        previousEquipmentInstanceId: recycledEvent.payload.recycledEquipmentInstanceId,
        tick: event.tick,
        sequence: event.sequence,
        sourceEventId: event.id,
      }));
      return;
    }
    const replacedEvent = replaced(event);
    if (replacedEvent !== null) {
      const marker = requireMarkerForStrictPayload(draft.markers, replacedEvent.payload);
      const pending = draft.pendingReplacements.get(marker.supplyId);
      if (pending === undefined
        || pending.sequence + 1 !== event.sequence
        || pending.tick !== event.tick
        || pending.participantId !== replacedEvent.payload.participantId
        || pending.previousEquipmentInstanceId
          !== replacedEvent.payload.previousEquipmentInstanceId
        || pending.equipmentInstanceId !== replacedEvent.payload.nextEquipmentInstanceId) {
        throw new SnapshotResyncSignal('EquipmentReplaced 未紧随匹配的 recycled identity。');
      }
      draft.pendingReplacements.delete(marker.supplyId);
      draft.markers.delete(marker.supplyId);
      cues.push(createArenaSupplyPresentationCueV1({
        schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
        id: `${this.#options.streamId}:supply-cue-v1:${pending.sequence}-${event.sequence}:replaced`,
        kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.REPLACED,
        sourceEventIds: [pending.sourceEventId, event.id],
        tick: event.tick,
        sequenceStart: pending.sequence,
        sequenceEnd: event.sequence,
        supplyId: marker.supplyId,
        equipmentInstanceId: marker.equipmentInstanceId,
        participantId: pending.participantId,
        previousEquipmentInstanceId: pending.previousEquipmentInstanceId,
        nextEquipmentInstanceId: pending.equipmentInstanceId,
      }));
      return;
    }
    const expiredEvent = expired(event);
    if (expiredEvent !== null) {
      const marker = requireMarkerForStrictPayload(draft.markers, expiredEvent.payload);
      draft.markers.delete(marker.supplyId);
      cues.push(createArenaSupplyPresentationCueV1({
        schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
        id: `${this.#options.streamId}:supply-cue-v1:${event.sequence}-${event.sequence}:expired`,
        kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.EXPIRED,
        sourceEventIds: [event.id],
        tick: event.tick,
        sequenceStart: event.sequence,
        sequenceEnd: event.sequence,
        supplyId: marker.supplyId,
        equipmentInstanceId: marker.equipmentInstanceId,
        participantId: null,
        previousEquipmentInstanceId: null,
        nextEquipmentInstanceId: null,
      }));
    }
  }

  #assertStartAllowed(): void {
    if (this.#state.lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED) {
      throw new Error('ArenaSupplyPresentationAdapter 已失败，不能再次 start。');
    }
    if (this.#state.lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED) {
      throw new Error('ArenaSupplyPresentationAdapter 已销毁。');
    }
    if (this.#state.lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.CREATED) {
      throw new AdapterInputError('ArenaSupplyPresentationAdapter.start() 只允许调用一次。');
    }
  }

  #assertUpdateAllowed(): void {
    if (this.#state.lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED) {
      throw new Error('ArenaSupplyPresentationAdapter 已失败，不能 update。');
    }
    if (this.#state.lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED) {
      throw new Error('ArenaSupplyPresentationAdapter 已销毁。');
    }
    if (this.#state.lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.ACTIVE
      && this.#state.lifecycleState
        !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.RESYNC_REQUIRED) {
      throw new AdapterInputError('ArenaSupplyPresentationAdapter 必须先 start。');
    }
  }

  #enterTransaction(): void {
    if (this.#inTransaction) {
      this.#reentrantObserved = true;
      throw new ReentrantCallError('ArenaSupplyPresentationAdapter 检测到重入调用。');
    }
    this.#inTransaction = true;
    this.#reentrantObserved = false;
  }

  #assertNoReentrantCall(): void {
    if (this.#reentrantObserved) {
      throw new ReentrantCallError('ArenaSupplyPresentationAdapter 检测到重入调用。');
    }
  }

  #leaveTransaction(): void {
    this.#inTransaction = false;
    this.#reentrantObserved = false;
  }

  #failMutation(error: unknown, inputValidated: boolean): never {
    let failureKind: ArenaSupplyPresentationTerminalFailureKindV1;
    let thrown = error;
    if (this.#reentrantObserved || error instanceof ReentrantCallError) {
      failureKind = ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1.REENTRANT_CALL;
      thrown = new ReentrantCallError('ArenaSupplyPresentationAdapter 检测到重入调用。');
    } else if (error instanceof EventIdentityConflictError) {
      failureKind = ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1.EVENT_IDENTITY_CONFLICT;
    } else if (!inputValidated || error instanceof AdapterInputError) {
      failureKind = ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1.INPUT_INVALID;
    } else {
      failureKind = ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1.INTERNAL_INVARIANT;
    }
    if (this.#state.lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED
      && this.#state.lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED) {
      this.#publishFailure(failureKind);
    }
    throw thrown;
  }

  #publishFailure(kind: ArenaSupplyPresentationTerminalFailureKindV1): void {
    const draft = cloneDraft(this.#state);
    draft.lifecycleState = ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED;
    draft.pendingReplacements.clear();
    draft.terminalFailureKind = kind;
    this.#publishDraft(draft);
  }

  #publishDraft(draft: MutableDraft): void {
    if (draft.markers.size > ARENA_SUPPLY_PRESENTATION_MAX_MARKERS
      || draft.pendingReplacements.size > ARENA_SUPPLY_PRESENTATION_MAX_PENDING_REPLACEMENT_PAIRS
      || draft.recentOrder.length > this.#options.recentEventCapacity
      || draft.recentById.size !== draft.recentOrder.length
      || draft.recentBySequence.size !== draft.recentOrder.length) {
      throw new Error('ArenaSupplyPresentationAdapter draft 有界状态不变量失败。');
    }
    for (const identity of draft.recentOrder) {
      if (draft.recentById.get(identity.id) !== identity
        || draft.recentBySequence.get(identity.sequence) !== identity) {
        throw new Error('ArenaSupplyPresentationAdapter recent ring 双向绑定失败。');
      }
    }
    this.#state = Object.freeze({
      generation: draft.generation,
      lifecycleState: draft.lifecycleState,
      snapshotTick: draft.snapshotTick,
      nextExpectedEventSequence: draft.nextExpectedEventSequence,
      snapshotProjectionHash: draft.snapshotProjectionHash,
      markers: new Map(draft.markers),
      recentById: new Map(draft.recentById),
      recentBySequence: new Map(draft.recentBySequence),
      recentOrder: Object.freeze([...draft.recentOrder]),
      pendingReplacements: new Map(draft.pendingReplacements),
      acceptedEventCount: draft.acceptedEventCount,
      duplicateEventCount: draft.duplicateEventCount,
      resyncCount: draft.resyncCount,
      terminalFailureKind: draft.terminalFailureKind,
    });
  }
}
