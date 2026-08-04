import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_SUPPLY_PRESENTATION_A1_FIXTURE_IDS_V1,
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1,
  ARENA_SUPPLY_PRESENTATION_EQUIPMENT_SNAPSHOT_SCHEMA_VERSION,
  ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1,
  ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY,
  ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE,
  ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
  ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1,
  ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND,
  ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1,
  createArenaSupplyPresentationAdapterOptionsV1,
  createArenaSupplyPresentationCueV1,
  createArenaSupplyPresentationDebugSnapshotV1,
  createArenaSupplyPresentationEventCanonicalHashV1,
  createArenaSupplyPresentationEventV1,
  createArenaSupplyPresentationMarkerV1,
  createArenaSupplyPresentationStartInputV1,
  createArenaSupplyPresentationUpdateInputV1,
  createArenaSupplyPresentationViewV1,
} from '../../../packages/arena-presentation-contracts/src/arena-supply-presentation-contract.js';
import { ArenaSupplyPresentationAdapter } from '../../../packages/arena-presentation-runtime/src/arena-supply-presentation-adapter.js';

const A1_FIXTURE_IDS = Object.freeze([
  'spawn-three-physical-entities-without-modal',
  'ordinary-flat-equipment-spawn-bypasses-supply-adapter',
  'mixed-flat-and-payload-spawn-fails-closed',
  'active-supply-flat-pickup-terminates-exactly-one-marker',
  'flat-pickup-not-matching-active-bypasses-without-cue-or-marker-change',
  'definition-conflict-or-multiple-active-pickup-fails-closed',
  'missing-history-or-bound-active-projection-enters-resync-before-any-event',
  'replacement-pair-terminates-without-waiting-for-picked-up',
  'strict-replacement-without-active-match-fails-closed',
  'strict-expiry-without-active-match-fails-closed',
  'remaining-tick-599-600-601',
  'same-tick-expire-before-pickup',
  'same-tick-recycle-before-replace-and-pickup-before-action',
  'duplicate-identical-event-idempotent',
  'duplicate-conflicting-event-fail-closed',
  'event-older-than-recent-ring-never-applies-or-replays-one-shot',
  'sequence-gap-and-out-of-order-resync',
  'missing-required-and-future-field-rejected',
  'pause-resume-no-wall-clock-progress',
  '30fps-terminal-state-exact',
  'replay-forward-and-catch-up-no-double-one-shot',
  'replay-seek-or-reset-starts-new-epoch-and-clears-ring-and-pending',
  'asset-failure-accessible-fallback-does-not-pass-asset-gate',
  'reduced-motion-and-silent-equivalence',
  'destroy-twice-no-live-resources',
] as const);

const SUPPLY_DEFINITION_ID = 'arena-v2.survival-supply.v1';
const STREAM_ID = 'arena-main';
const SLOT_DATA = Object.freeze([
  Object.freeze({
    slotId: 'center', equipmentDefinitionId: 'equipment.chain',
    spawnId: 'supply-center', position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'left', equipmentDefinitionId: 'equipment.hammer',
    spawnId: 'supply-left', position: Object.freeze({ x: -3, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right', equipmentDefinitionId: 'equipment.shield',
    spawnId: 'supply-right', position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
] as const);

function lifecycleContract(): Record<string, unknown> {
  return {
    supplyDefinitionId: SUPPLY_DEFINITION_ID,
    firstSpawnTick: 1_200,
    spawnIntervalTicks: 1_200,
    spawnCount: 3,
    lifetimeTicks: 600,
    spawnSpecs: SLOT_DATA.map((item) => ({
      ...item,
      position: { ...item.position },
    })),
    equipmentDefinitionIds: ['equipment.chain', 'equipment.hammer', 'equipment.shield'],
  };
}

function supplyId(slotId: string): string {
  return `${SUPPLY_DEFINITION_ID}:wave-0:slot-${slotId}`;
}

function equipmentId(slotId: string): string {
  return `${supplyId(slotId)}:equipment`;
}

function equipment(slotIndex: number): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_EQUIPMENT_SNAPSHOT_SCHEMA_VERSION,
    instanceId: equipmentId(slot.slotId),
    definitionId: slot.equipmentDefinitionId,
    spawnId: slot.spawnId,
    locationState: 'spawned',
    ownerId: null,
    position: { ...slot.position },
    lastSafePosition: { ...slot.position },
    cooldownRemainingTicks: 0,
    revision: 1,
  };
}

function projectionItem(slotIndex: number, snapshotTick = 1_201): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  return {
    schemaVersion: 2,
    supplyDefinitionId: SUPPLY_DEFINITION_ID,
    supplyId: supplyId(slot.slotId),
    slotId: slot.slotId,
    equipmentInstanceId: equipmentId(slot.slotId),
    equipmentDefinitionId: slot.equipmentDefinitionId,
    equipmentSpawnId: slot.spawnId,
    spawnPosition: { ...slot.position },
    spawnTick: 1_200,
    expireTick: 1_800,
    remainingTicks: 1_800 - snapshotTick,
    position: { ...slot.position },
  };
}

function emptyInput(snapshotTick = 100, snapshotEventSequence = 20): Record<string, unknown> {
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    snapshotTick,
    snapshotEventSequence,
    equipment: [],
    activeSupplyProjection: {
      schemaVersion: 2,
      snapshotTick,
      snapshotEventSequence,
      resyncReadiness: 'ready',
      pendingAuthorityTick: null,
      pendingExpiryEquipmentInstanceIds: [],
      supplies: [],
    },
  };
}

function activeInput(snapshotTick = 1_201, snapshotEventSequence = 20): Record<string, unknown> {
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    snapshotTick,
    snapshotEventSequence,
    equipment: SLOT_DATA.map((_, index) => equipment(index)),
    activeSupplyProjection: {
      schemaVersion: 2,
      snapshotTick,
      snapshotEventSequence,
      resyncReadiness: 'ready',
      pendingAuthorityTick: null,
      pendingExpiryEquipmentInstanceIds: [],
      supplies: SLOT_DATA.map((_, index) => projectionItem(index, snapshotTick)),
    },
  };
}

function marker(snapshotTick = 1_201, slotIndex = 1): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  const remainingTicks = 1_800 - snapshotTick;
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    supplyDefinitionId: SUPPLY_DEFINITION_ID,
    supplyId: supplyId(slot.slotId),
    equipmentInstanceId: equipmentId(slot.slotId),
    equipmentDefinitionId: slot.equipmentDefinitionId,
    position: { ...slot.position },
    spawnTick: 1_200,
    expireTick: 1_800,
    remainingTicks,
    labelSeconds: Math.ceil(remainingTicks / ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND),
  };
}

function cue(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    id: `${STREAM_ID}:supply-cue-v1:5-5:spawned`,
    kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.SPAWNED,
    sourceEventIds: ['event-5'],
    tick: 1_200,
    sequenceStart: 5,
    sequenceEnd: 5,
    supplyId: supplyId('left'),
    equipmentInstanceId: equipmentId('left'),
    participantId: null,
    previousEquipmentInstanceId: null,
    nextEquipmentInstanceId: null,
    ...overrides,
  };
}

function strictPayloadBase(tick = 1_200): Record<string, unknown> {
  return {
    schemaVersion: 1,
    supplyDefinitionId: SUPPLY_DEFINITION_ID,
    supplyId: supplyId('left'),
    equipmentInstanceId: equipmentId('left'),
    spawnTick: 1_200,
    expireTick: 1_800,
    tick,
  };
}

function sixAuthorityEvents(): readonly Record<string, unknown>[] {
  return [
    {
      id: 'event-strict-spawn', sequence: 1, tick: 1_200, type: 'EquipmentSpawned',
      payload: {
        ...strictPayloadBase(), equipmentDefinitionId: 'equipment.hammer',
        spawnId: 'supply-left', position: { x: -3, y: 1, z: 0 },
      },
    },
    {
      id: 'event-ordinary-spawn', sequence: 2, tick: 1_200, type: 'EquipmentSpawned',
      equipmentInstanceId: 'ordinary-equipment', equipmentDefinitionId: 'ordinary-definition',
      spawnId: 'ordinary-spawn', position: { x: 9, y: 1, z: 0 },
    },
    {
      id: 'event-pickup', sequence: 3, tick: 1_300, type: 'EquipmentPickedUp',
      participantId: 'player-1', equipmentInstanceId: equipmentId('left'),
      equipmentDefinitionId: 'equipment.hammer',
    },
    {
      id: 'event-recycled', sequence: 4, tick: 1_400, type: 'EquipmentRecycled',
      payload: {
        ...strictPayloadBase(1_400), participantId: 'player-1',
        recycledEquipmentInstanceId: 'old-held-equipment',
        replacementEquipmentInstanceId: equipmentId('left'), reason: 'replaced',
      },
    },
    {
      id: 'event-replaced', sequence: 5, tick: 1_400, type: 'EquipmentReplaced',
      payload: {
        ...strictPayloadBase(1_400), participantId: 'player-1',
        previousEquipmentInstanceId: 'old-held-equipment',
        nextEquipmentInstanceId: equipmentId('left'),
      },
    },
    {
      id: 'event-expired', sequence: 6, tick: 1_800, type: 'EquipmentExpired',
      payload: {
        ...strictPayloadBase(1_800), expiredEquipmentInstanceId: equipmentId('left'),
        reason: 'lifetime-expired',
      },
    },
  ];
}

function debugSnapshot(
  lifecycleState: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const hasWaterline = lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.CREATED
    && lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED;
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: STREAM_ID,
    lifecycleState,
    snapshotTick: hasWaterline ? 1_201 : null,
    nextExpectedEventSequence: hasWaterline ? 20 : null,
    markerCount: 0,
    pendingReplacementPairCount: 0,
    recentEventHashCount: 0,
    acceptedEventCount: 0,
    duplicateEventCount: 0,
    resyncCount: 0,
    terminalFailureKind: lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED
      ? ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1.INPUT_INVALID : null,
    ...overrides,
  };
}

test('PP0 freezes the exact A1.0 fixture identity and terminal failure enum', () => {
  assert.deepEqual(ARENA_SUPPLY_PRESENTATION_A1_FIXTURE_IDS_V1, A1_FIXTURE_IDS);
  assert.deepEqual(Object.values(ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1), [
    'input-invalid',
    'event-identity-conflict',
    'reentrant-call',
    'internal-invariant',
  ]);
});

test('PP0 marker validator clones and deeply freezes versioned presentation data', () => {
  const source = {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    supplyDefinitionId: 'arena-v2.survival-supply.v1',
    supplyId: 'arena-v2.survival-supply.v1:wave-0:slot-left',
    equipmentInstanceId: 'arena-v2.survival-supply.v1:wave-0:slot-left:equipment',
    equipmentDefinitionId: 'weapon.test.left',
    position: { x: -2, y: 0, z: 1 },
    spawnTick: 1_200,
    expireTick: 1_800,
    remainingTicks: 600,
    labelSeconds: 10,
  };
  const marker = createArenaSupplyPresentationMarkerV1(source);
  source.position.x = 99;
  assert.equal(marker.position.x, -2);
  assert.equal(Object.isFrozen(marker), true);
  assert.equal(Object.isFrozen(marker.position), true);

  const genericMarker = createArenaSupplyPresentationMarkerV1({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    supplyDefinitionId: 'future-mode.supply.v1',
    supplyId: 'supply-alpha',
    equipmentInstanceId: 'equipment-independent-name',
    equipmentDefinitionId: 'equipment.generic',
    position: { x: 1, y: 2, z: 3 },
    spawnTick: 10,
    expireTick: 100,
    remainingTicks: 30,
    labelSeconds: 1,
  });
  assert.equal(genericMarker.supplyDefinitionId, 'future-mode.supply.v1');
  assert.equal(genericMarker.expireTick - genericMarker.spawnTick, 90);
});

test('PP0 validates the six frozen authority event shapes and registered bypass events', () => {
  const normalized = sixAuthorityEvents().map(createArenaSupplyPresentationEventV1);
  assert.deepEqual(normalized.map(({ type }) => type), [
    'EquipmentSpawned',
    'EquipmentSpawned',
    'EquipmentPickedUp',
    'EquipmentRecycled',
    'EquipmentReplaced',
    'EquipmentExpired',
  ]);
  assert.equal(normalized.every(Object.isFrozen), true);

  const bypass = createArenaSupplyPresentationEventV1({
    id: 'event-match-started',
    sequence: 0,
    tick: 0,
    type: 'MatchStarted',
    detail: { seed: 7 },
  });
  assert.equal(Object.isFrozen(bypass), true);
  assert.equal(Object.isFrozen(
    (bypass as unknown as Record<string, unknown>).detail,
  ), true);

  const mixed = { ...sixAuthorityEvents()[0], equipmentInstanceId: equipmentId('left') };
  assert.throws(() => createArenaSupplyPresentationEventV1(mixed), /不支持字段|exact-key/);
  assert.throws(() => createArenaSupplyPresentationEventV1({
    id: 'unknown', sequence: 0, tick: 0, type: 'FutureArenaEvent',
  }), /未登记/);

  const ordered = {
    id: 'hash-event', sequence: 7, tick: 4, type: 'MatchStarted', detail: { b: 2, a: 1 },
  };
  const reordered = {
    detail: { a: 1, b: 2 }, type: 'MatchStarted', tick: 4, sequence: 7, id: 'hash-event',
  };
  assert.equal(
    createArenaSupplyPresentationEventCanonicalHashV1(ordered),
    createArenaSupplyPresentationEventCanonicalHashV1(reordered),
  );
});

test('PP0 validates Options and Start/Update from immutable authority snapshots', () => {
  const contract = lifecycleContract();
  const optionsSource = {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: STREAM_ID,
    ticksPerSecond: ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND,
    lifecycleContract: contract,
    recentEventCapacity: ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY,
  };
  const options = createArenaSupplyPresentationAdapterOptionsV1(optionsSource);
  assert.equal(Object.isFrozen(options.lifecycleContract.spawnSpecs), true);
  assert.equal(Object.isFrozen(options.lifecycleContract.spawnSpecs[0]?.position), true);
  for (const [key, value] of [
    ['supplyDefinitionId', 'other.supply.v1'],
    ['firstSpawnTick', 1_201],
    ['spawnIntervalTicks', 1_201],
    ['spawnCount', 2],
    ['lifetimeTicks', 601],
  ] as const) {
    const mismatchedContract = lifecycleContract();
    mismatchedContract[key] = value;
    assert.throws(() => createArenaSupplyPresentationAdapterOptionsV1({
      ...optionsSource,
      lifecycleContract: mismatchedContract,
    }), /冻结 P1 authority 值不一致/);
  }

  const activeSource = activeInput();
  const start = createArenaSupplyPresentationStartInputV1(activeSource, contract);
  assert.equal(start.activeSupplyProjection.supplies.length, 3);
  assert.equal(Object.isFrozen(start), true);
  assert.equal(Object.isFrozen(start.equipment), true);
  assert.equal(Object.isFrozen(start.equipment[0]?.position), true);
  const firstPosition = (activeSource.equipment as Record<string, unknown>[])[0]!
    .position as Record<string, unknown>;
  firstPosition.x = 99;
  assert.equal(start.equipment[0]?.position?.x, 0);

  const empty = createArenaSupplyPresentationStartInputV1(emptyInput(), lifecycleContract());
  assert.equal(empty.activeSupplyProjection.supplies.length, 0);

  const pendingInput = {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    snapshotTick: 1_800,
    snapshotEventSequence: 30,
    equipment: SLOT_DATA.map((_, index) => equipment(index)),
    activeSupplyProjection: {
      schemaVersion: 2,
      snapshotTick: 1_800,
      snapshotEventSequence: 30,
      resyncReadiness: 'not-ready-pre-expiry',
      pendingAuthorityTick: 1_800,
      pendingExpiryEquipmentInstanceIds: SLOT_DATA.map(({ slotId }) => equipmentId(slotId)),
      supplies: [],
    },
  };
  const pending = createArenaSupplyPresentationStartInputV1(
    pendingInput,
    lifecycleContract(),
  );
  assert.equal(pending.activeSupplyProjection.resyncReadiness, 'not-ready-pre-expiry');

  const update = {
    ...emptyInput(2_000, 100),
    events: sixAuthorityEvents(),
  };
  const normalizedUpdate = createArenaSupplyPresentationUpdateInputV1(
    update,
    lifecycleContract(),
  );
  assert.equal(normalizedUpdate.events.length, 6);
  assert.equal(Object.isFrozen(normalizedUpdate.events), true);
});

test('PP0 Update consumes one frozen root generation and never split-reads events', () => {
  const firstEvents = [{
    id: 'first-generation', sequence: 1, tick: 1, type: 'MatchStarted',
  }];
  const secondEvents = [{
    id: 'second-generation', sequence: 1, tick: 1, type: 'MatchStarted',
  }];
  const target = { ...emptyInput(2, 2), events: firstEvents };
  let eventsDescriptorReads = 0;
  let valueGets = 0;
  const hostile = new Proxy(target, {
    get(inner, key, receiver) {
      valueGets += 1;
      return Reflect.get(inner, key, receiver);
    },
    getOwnPropertyDescriptor(inner, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(inner, key);
      if (key !== 'events' || descriptor === undefined) return descriptor;
      eventsDescriptorReads += 1;
      return {
        ...descriptor,
        value: eventsDescriptorReads === 1 ? firstEvents : secondEvents,
      };
    },
  });

  const update = createArenaSupplyPresentationUpdateInputV1(hostile, lifecycleContract());
  assert.equal(eventsDescriptorReads, 1);
  assert.equal(valueGets, 0);
  assert.equal(update.events[0]?.id, 'first-generation');
});

test('PP0 freezes equipment snapshot v1 and rejects future nested schema versions', () => {
  const valid = activeInput();
  assert.equal(
    createArenaSupplyPresentationStartInputV1(valid, lifecycleContract()).equipment[0]
      ?.schemaVersion,
    ARENA_SUPPLY_PRESENTATION_EQUIPMENT_SNAPSHOT_SCHEMA_VERSION,
  );

  const futureEquipment = activeInput();
  (futureEquipment.equipment as Record<string, unknown>[])[0]!.schemaVersion = 2;
  assert.throws(
    () => createArenaSupplyPresentationStartInputV1(futureEquipment, lifecycleContract()),
    /schemaVersion 必须是 1/,
  );

  const futurePayload = sixAuthorityEvents()[0]!;
  ((futurePayload.payload as Record<string, unknown>)).schemaVersion = 2;
  assert.throws(() => createArenaSupplyPresentationEventV1(futurePayload), /schemaVersion 必须是 1/);
});

test('PP0 Marker/Cue/View contracts enforce derivation, ordering and resync semantics', () => {
  const replacementCue = cue({
    id: `${STREAM_ID}:supply-cue-v1:5-6:replaced`,
    kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.REPLACED,
    sourceEventIds: ['event-5', 'event-6'],
    sequenceEnd: 6,
    participantId: 'player-1',
    previousEquipmentInstanceId: 'old-held-equipment',
    nextEquipmentInstanceId: equipmentId('left'),
  });
  assert.equal(createArenaSupplyPresentationCueV1(replacementCue).sequenceEnd, 6);

  const ready = createArenaSupplyPresentationViewV1({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: STREAM_ID,
    status: ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.READY,
    snapshotTick: 1_201,
    snapshotEventSequence: 10,
    nextExpectedEventSequence: 10,
    resyncedFromSnapshot: false,
    markers: SLOT_DATA.map((_, index) => marker(1_201, index)),
    cues: [cue()],
  });
  assert.equal(ready.markers.length, 3);
  assert.equal(Object.isFrozen(ready.markers), true);

  const resync = createArenaSupplyPresentationViewV1({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: STREAM_ID,
    status: ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.RESYNC_REQUIRED,
    snapshotTick: 1_201,
    snapshotEventSequence: 10,
    nextExpectedEventSequence: 10,
    resyncedFromSnapshot: false,
    markers: [],
    cues: [],
  });
  assert.equal(resync.markers.length, 0);

  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), labelSeconds: 9,
  }), /labelSeconds/);
  assert.throws(() => createArenaSupplyPresentationViewV1({
    ...ready, nextExpectedEventSequence: 11,
  }), /nextExpectedEventSequence/);
  assert.throws(() => createArenaSupplyPresentationViewV1({
    ...resync, markers: [marker()],
  }), /resync-required/);
});

test('PP0 exact-key validators reject missing, extra and future schemas', () => {
  const missing = marker();
  delete missing.labelSeconds;
  assert.throws(() => createArenaSupplyPresentationMarkerV1(missing), /缺少字段|exact-key/);
  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), futureField: true,
  }), /不支持字段/);
  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), schemaVersion: 2,
  }), /schemaVersion/);
  assert.throws(() => createArenaSupplyPresentationCueV1({
    ...cue(), terminalFailureKind: 'future-kind',
  }), /不支持字段/);
  assert.throws(() => createArenaSupplyPresentationAdapterOptionsV1({
    schemaVersion: 1,
    streamId: STREAM_ID,
    ticksPerSecond: 60,
    lifecycleContract: lifecycleContract(),
    recentEventCapacity: 65,
  }), /必须是 64/);
});

test('PP0 fails closed on accessors and hostile Proxy reflection without invoking values', () => {
  let getterCalls = 0;
  let valueGetCalls = 0;
  let coercionCalls = 0;
  const accessor = marker();
  Object.defineProperty(accessor, 'futureField', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return true;
    },
  });
  assert.throws(() => createArenaSupplyPresentationMarkerV1(accessor), /数据字段/);
  assert.equal(getterCalls, 0);

  const proxy = new Proxy(marker(), {
    get(target, key, receiver) {
      valueGetCalls += 1;
      return Reflect.get(target, key, receiver);
    },
    ownKeys() {
      throw new Error('hostile-ownKeys');
    },
  });
  assert.throws(() => createArenaSupplyPresentationMarkerV1(proxy), /hostile-ownKeys/);
  assert.equal(valueGetCalls, 0);

  let thenCalls = 0;
  const thenable = marker();
  Object.defineProperty(thenable, 'then', {
    enumerable: true,
    get() {
      thenCalls += 1;
      return () => undefined;
    },
  });
  assert.throws(() => createArenaSupplyPresentationMarkerV1(thenable), /数据字段/);
  assert.equal(thenCalls, 0);

  const coercion = {
    [Symbol.toPrimitive]() {
      coercionCalls += 1;
      return 1;
    },
  };
  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), schemaVersion: coercion,
  }), /Symbol/);
  assert.equal(coercionCalls, 0);
});

test('PP0 rejects Symbol keys, sparse arrays, cycles and unsafe numeric boundaries', () => {
  const symbolInput = marker();
  Object.defineProperty(symbolInput, Symbol('authority'), { enumerable: true, value: true });
  assert.throws(() => createArenaSupplyPresentationMarkerV1(symbolInput), /Symbol/);

  const sparseUpdate = { ...emptyInput(2, 2), events: new Array(1) };
  assert.throws(
    () => createArenaSupplyPresentationUpdateInputV1(sparseUpdate, lifecycleContract()),
    /空槽|访问器/,
  );

  const cyclicPosition: Record<string, unknown> = { x: 0, y: 1, z: 0 };
  cyclicPosition.loop = cyclicPosition;
  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), position: cyclicPosition,
  }), /循环引用/);
  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), position: { x: Number.NaN, y: 1, z: 0 },
  }), /非有限数|有限数/);
  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), spawnTick: Number.MAX_SAFE_INTEGER + 1,
  }), /安全整数/);
  assert.throws(() => createArenaSupplyPresentationMarkerV1({
    ...marker(), supplyId: 'x'.repeat(257),
  }), /受限非空标识符/);
});

test('PP0 keeps all public arrays and debug counters within frozen capacities', () => {
  const maximumResyncEvents = Array.from(
    { length: ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE },
    (_, sequence) => ({
      id: `event-${sequence}`, sequence, tick: sequence, type: 'MatchStarted',
    }),
  );
  const input = {
    ...emptyInput(
      ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE,
      ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE + 1,
    ),
    events: maximumResyncEvents,
  };
  assert.equal(
    createArenaSupplyPresentationUpdateInputV1(input, lifecycleContract()).events.length,
    ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE,
  );
  assert.throws(() => createArenaSupplyPresentationUpdateInputV1({
    ...input,
    snapshotTick: ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE + 1,
    snapshotEventSequence: ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE + 2,
    activeSupplyProjection: {
      ...((input as Record<string, unknown>).activeSupplyProjection as Record<string, unknown>),
      snapshotTick: ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE + 1,
      snapshotEventSequence: ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE + 2,
    },
    events: [...maximumResyncEvents, {
      id: `event-${ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE}`,
      sequence: ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE,
      tick: ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE,
      type: 'MatchStarted',
    }],
  }, lifecycleContract()), /超过上限 256/);

  assert.throws(() => createArenaSupplyPresentationDebugSnapshotV1(debugSnapshot(
    ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.ACTIVE,
    { markerCount: 4 },
  )), /计数超限/);
});

test('PP0 rejects duplicate identities at every bounded collection boundary', () => {
  const duplicateEquipment = activeInput();
  const equipmentItems = duplicateEquipment.equipment as Record<string, unknown>[];
  equipmentItems[1]!.instanceId = equipmentItems[0]!.instanceId;
  assert.throws(
    () => createArenaSupplyPresentationStartInputV1(duplicateEquipment, lifecycleContract()),
    /instanceId 重复/,
  );

  assert.throws(() => createArenaSupplyPresentationCueV1(cue({
    id: `${STREAM_ID}:supply-cue-v1:5-6:replaced`,
    kind: ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.REPLACED,
    sourceEventIds: ['same-event', 'same-event'],
    sequenceEnd: 6,
    participantId: 'player-1',
    previousEquipmentInstanceId: 'old-held-equipment',
    nextEquipmentInstanceId: equipmentId('left'),
  })), /数量或唯一性/);

  const duplicateMarkers = [marker(), marker()];
  assert.throws(() => createArenaSupplyPresentationViewV1({
    schemaVersion: 1,
    streamId: STREAM_ID,
    status: 'ready',
    snapshotTick: 1_201,
    snapshotEventSequence: 10,
    nextExpectedEventSequence: 10,
    resyncedFromSnapshot: false,
    markers: duplicateMarkers,
    cues: [],
  }), /唯一排序/);
});

test('PP0 Debug is exact, bounded and separates adapter lifecycle from host resources', () => {
  const created = createArenaSupplyPresentationDebugSnapshotV1(debugSnapshot(
    ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.CREATED,
  ));
  const destroyed = createArenaSupplyPresentationDebugSnapshotV1(debugSnapshot(
    ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED,
  ));
  assert.equal(created.markerCount, 0);
  assert.equal(destroyed.recentEventHashCount, 0);
  assert.equal(Object.isFrozen(destroyed), true);

  const failed = createArenaSupplyPresentationDebugSnapshotV1(debugSnapshot(
    ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED,
  ));
  assert.equal(failed.terminalFailureKind, 'input-invalid');
  assert.throws(() => createArenaSupplyPresentationDebugSnapshotV1(debugSnapshot(
    ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED,
    { terminalFailureKind: 'future-failure' },
  )), /terminalFailureKind/);
  assert.throws(() => createArenaSupplyPresentationDebugSnapshotV1({
    ...debugSnapshot(ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED),
    gpuResourceCount: 0,
  }), /不支持字段/);
});

function runtimeAdapter(stream = STREAM_ID): ArenaSupplyPresentationAdapter {
  return new ArenaSupplyPresentationAdapter({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: stream,
    ticksPerSecond: ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND,
    lifecycleContract: lifecycleContract(),
    recentEventCapacity: ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY,
  });
}

function runtimeFrame(
  slotIndexes: readonly number[],
  snapshotTick: number,
  snapshotEventSequence: number,
  nonWorldSlotIndexes: readonly number[] = [],
): Record<string, unknown> {
  const nonWorld = new Set(nonWorldSlotIndexes);
  const equipmentItems = slotIndexes.map((slotIndex) => {
    const item = equipment(slotIndex);
    if (nonWorld.has(slotIndex)) {
      item.locationState = 'held';
      item.ownerId = 'player-1';
      item.position = null;
    }
    return item;
  });
  const activeSlots = slotIndexes.filter((slotIndex) => !nonWorld.has(slotIndex));
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    snapshotTick,
    snapshotEventSequence,
    equipment: equipmentItems,
    activeSupplyProjection: {
      schemaVersion: 2,
      snapshotTick,
      snapshotEventSequence,
      resyncReadiness: 'ready',
      pendingAuthorityTick: null,
      pendingExpiryEquipmentInstanceIds: [],
      supplies: activeSlots.map((slotIndex) => projectionItem(slotIndex, snapshotTick)),
    },
  };
}

function runtimeNotReadyFrame(
  slotIndexes: readonly number[],
  snapshotEventSequence: number,
): Record<string, unknown> {
  return {
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    snapshotTick: 1_800,
    snapshotEventSequence,
    equipment: slotIndexes.map((slotIndex) => equipment(slotIndex)),
    activeSupplyProjection: {
      schemaVersion: 2,
      snapshotTick: 1_800,
      snapshotEventSequence,
      resyncReadiness: 'not-ready-pre-expiry',
      pendingAuthorityTick: 1_800,
      pendingExpiryEquipmentInstanceIds: slotIndexes.map((slotIndex) => (
        equipmentId(SLOT_DATA[slotIndex]!.slotId)
      )),
      supplies: [],
    },
  };
}

function strictSpawnEvent(slotIndex: number, sequence: number): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  return {
    id: `spawn-${slot.slotId}-${sequence}`,
    sequence,
    tick: 1_200,
    type: 'EquipmentSpawned',
    payload: {
      schemaVersion: 1,
      supplyDefinitionId: SUPPLY_DEFINITION_ID,
      supplyId: supplyId(slot.slotId),
      equipmentInstanceId: equipmentId(slot.slotId),
      spawnTick: 1_200,
      expireTick: 1_800,
      tick: 1_200,
      equipmentDefinitionId: slot.equipmentDefinitionId,
      spawnId: slot.spawnId,
      position: { ...slot.position },
    },
  };
}

function pickupEvent(
  slotIndex: number,
  sequence: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  return {
    id: `pickup-${slot.slotId}-${sequence}`,
    sequence,
    tick: 1_300,
    type: 'EquipmentPickedUp',
    participantId: 'player-1',
    equipmentInstanceId: equipmentId(slot.slotId),
    equipmentDefinitionId: slot.equipmentDefinitionId,
    ...overrides,
  };
}

function recycledEvent(slotIndex: number, sequence: number): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  return {
    id: `recycled-${slot.slotId}-${sequence}`,
    sequence,
    tick: 1_400,
    type: 'EquipmentRecycled',
    payload: {
      schemaVersion: 1,
      supplyDefinitionId: SUPPLY_DEFINITION_ID,
      supplyId: supplyId(slot.slotId),
      equipmentInstanceId: equipmentId(slot.slotId),
      spawnTick: 1_200,
      expireTick: 1_800,
      tick: 1_400,
      participantId: 'player-1',
      recycledEquipmentInstanceId: 'old-held-equipment',
      replacementEquipmentInstanceId: equipmentId(slot.slotId),
      reason: 'replaced',
    },
  };
}

function replacedEvent(slotIndex: number, sequence: number): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  return {
    id: `replaced-${slot.slotId}-${sequence}`,
    sequence,
    tick: 1_400,
    type: 'EquipmentReplaced',
    payload: {
      schemaVersion: 1,
      supplyDefinitionId: SUPPLY_DEFINITION_ID,
      supplyId: supplyId(slot.slotId),
      equipmentInstanceId: equipmentId(slot.slotId),
      spawnTick: 1_200,
      expireTick: 1_800,
      tick: 1_400,
      participantId: 'player-1',
      previousEquipmentInstanceId: 'old-held-equipment',
      nextEquipmentInstanceId: equipmentId(slot.slotId),
    },
  };
}

function expiredEvent(slotIndex: number, sequence: number): Record<string, unknown> {
  const slot = SLOT_DATA[slotIndex]!;
  return {
    id: `expired-${slot.slotId}-${sequence}`,
    sequence,
    tick: 1_800,
    type: 'EquipmentExpired',
    payload: {
      schemaVersion: 1,
      supplyDefinitionId: SUPPLY_DEFINITION_ID,
      supplyId: supplyId(slot.slotId),
      equipmentInstanceId: equipmentId(slot.slotId),
      spawnTick: 1_200,
      expireTick: 1_800,
      tick: 1_800,
      expiredEquipmentInstanceId: equipmentId(slot.slotId),
      reason: 'lifetime-expired',
    },
  };
}

function updateFrame(
  frame: Record<string, unknown>,
  events: readonly Record<string, unknown>[],
): Record<string, unknown> {
  return { ...frame, events };
}

test('PP1 exposes the synchronous adapter lifecycle surface', () => {
  const adapter = runtimeAdapter();
  assert.deepEqual(Object.getOwnPropertyNames(ArenaSupplyPresentationAdapter.prototype).sort(), [
    'constructor', 'destroy', 'getDebugSnapshot', 'start', 'update',
  ].sort());
  assert.equal(typeof adapter.start, 'function');
  assert.equal(typeof adapter.update, 'function');
  assert.equal(typeof adapter.getDebugSnapshot, 'function');
  assert.equal(typeof adapter.destroy, 'function');
  assert.equal(Object.hasOwn(adapter, 'then'), false);
  adapter.destroy();
});

test('PP1 A1 #1 strict spawn creates exactly three sorted markers and one-shot cues', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(1_199, 0));
  const view = adapter.update(updateFrame(
    runtimeFrame([0, 1, 2], 1_200, 3),
    [strictSpawnEvent(0, 0), strictSpawnEvent(1, 1), strictSpawnEvent(2, 2)],
  ));
  assert.equal(view.status, 'ready');
  assert.deepEqual(view.markers.map(({ supplyId: id }) => id), [
    supplyId('center'), supplyId('left'), supplyId('right'),
  ]);
  assert.deepEqual(view.cues.map(({ kind }) => kind), ['spawned', 'spawned', 'spawned']);
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.cues), true);
});

test('PP1 A1 #2 ordinary flat spawn bypasses supply markers and cues', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(0, 0));
  const view = adapter.update(updateFrame(emptyInput(1, 1), [{
    id: 'ordinary-spawn',
    sequence: 0,
    tick: 1,
    type: 'EquipmentSpawned',
    equipmentInstanceId: 'ordinary-equipment',
    equipmentDefinitionId: 'ordinary-definition',
    spawnId: 'ordinary-spawn-point',
    position: { x: 10, y: 1, z: 0 },
  }]));
  assert.equal(view.markers.length, 0);
  assert.equal(view.cues.length, 0);
  assert.equal(adapter.getDebugSnapshot().acceptedEventCount, 1);
});

test('PP1 A1 #3 mixed flat and payload spawn fails terminal before publication', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(1_199, 0));
  assert.throws(() => adapter.update(updateFrame(runtimeFrame([1], 1_200, 1), [{
    ...strictSpawnEvent(1, 0),
    equipmentInstanceId: equipmentId('left'),
  }])), /不支持字段|exact-key/);
  const debug = adapter.getDebugSnapshot();
  assert.equal(debug.lifecycleState, 'failed');
  assert.equal(debug.terminalFailureKind, 'input-invalid');
  assert.equal(debug.acceptedEventCount, 0);
});

test('PP1 A1 #4 active pickup removes exactly one marker and emits picked-up once', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_201, 0));
  const view = adapter.update(updateFrame(
    runtimeFrame([1], 1_300, 1, [1]),
    [pickupEvent(1, 0)],
  ));
  assert.equal(view.markers.length, 0);
  assert.deepEqual(view.cues.map(({ kind }) => kind), ['picked-up']);
  assert.equal(view.cues[0]?.participantId, 'player-1');
});

test('PP1 A1 #5 unmatched ordinary pickup bypasses without marker or cue mutation', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_201, 0));
  const view = adapter.update(updateFrame(runtimeFrame([1], 1_300, 1), [{
    id: 'ordinary-pickup',
    sequence: 0,
    tick: 1_300,
    type: 'EquipmentPickedUp',
    participantId: 'player-1',
    equipmentInstanceId: 'ordinary-equipment',
    equipmentDefinitionId: 'ordinary-definition',
  }]));
  assert.equal(view.markers.length, 1);
  assert.equal(view.cues.length, 0);
});

test('PP1 A1 #6 pickup identity ambiguity snapshot-resyncs for ready and not-ready posts', () => {
  const readyAdapter = runtimeAdapter('pickup-conflict-ready');
  readyAdapter.start(runtimeFrame([1], 1_201, 0));
  const ready = readyAdapter.update(updateFrame(runtimeFrame([1], 1_300, 1), [
    pickupEvent(1, 0, { equipmentDefinitionId: 'conflicting-definition' }),
  ]));
  assert.equal(ready.status, 'ready');
  assert.equal(ready.resyncedFromSnapshot, true);
  assert.equal(ready.cues.length, 0);
  assert.equal(ready.markers.length, 1);
  assert.equal(readyAdapter.getDebugSnapshot().terminalFailureKind, null);

  const hiddenAdapter = runtimeAdapter('pickup-conflict-not-ready');
  hiddenAdapter.start(runtimeFrame([1], 1_799, 0));
  const hidden = hiddenAdapter.update(updateFrame(runtimeNotReadyFrame([1], 1), [
    pickupEvent(1, 0, { equipmentDefinitionId: 'conflicting-definition' }),
  ]));
  assert.equal(hidden.status, 'resync-required');
  assert.equal(hidden.markers.length, 0);
  assert.equal(hidden.cues.length, 0);
  assert.equal(hiddenAdapter.getDebugSnapshot().terminalFailureKind, null);
});

test('PP1 A1 #7 missing history and initial not-ready snapshots enter explicit resync', () => {
  const gapAdapter = runtimeAdapter('missing-history');
  gapAdapter.start(emptyInput(0, 0));
  const rebuilt = gapAdapter.update(updateFrame(emptyInput(2, 2), [{
    id: 'gap-event', sequence: 1, tick: 1, type: 'MatchStarted',
  }]));
  assert.equal(rebuilt.status, 'ready');
  assert.equal(rebuilt.resyncedFromSnapshot, true);
  assert.equal(rebuilt.cues.length, 0);
  assert.equal(gapAdapter.getDebugSnapshot().resyncCount, 1);

  const notReadyAdapter = runtimeAdapter('initial-not-ready');
  const hidden = notReadyAdapter.start(runtimeNotReadyFrame([1], 0));
  assert.equal(hidden.status, 'resync-required');
  assert.equal(hidden.markers.length, 0);
  assert.equal(notReadyAdapter.getDebugSnapshot().lifecycleState, 'resync-required');
});

test('PP1 A1 #8 replacement pair terminates immediately without waiting for pickup', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_300, 0));
  const view = adapter.update(updateFrame(
    runtimeFrame([1], 1_400, 2, [1]),
    [recycledEvent(1, 0), replacedEvent(1, 1)],
  ));
  assert.equal(view.markers.length, 0);
  assert.deepEqual(view.cues.map(({ kind }) => kind), ['replaced']);
  assert.deepEqual(view.cues[0]?.sourceEventIds, ['recycled-left-0', 'replaced-left-1']);
  assert.equal(adapter.getDebugSnapshot().pendingReplacementPairCount, 0);
});

test('PP1 A1 #9 strict replacement without an active match snapshot-resyncs', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(1_399, 0));
  const view = adapter.update(updateFrame(
    emptyInput(1_400, 2),
    [recycledEvent(1, 0), replacedEvent(1, 1)],
  ));
  assert.equal(view.status, 'ready');
  assert.equal(view.resyncedFromSnapshot, true);
  assert.equal(view.cues.length, 0);
  assert.equal(adapter.getDebugSnapshot().terminalFailureKind, null);
});

test('PP1 A1 #10 strict expiry without an active match snapshot-resyncs', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(1_799, 0));
  const view = adapter.update(updateFrame(emptyInput(1_800, 1), [expiredEvent(1, 0)]));
  assert.equal(view.resyncedFromSnapshot, true);
  assert.equal(view.cues.length, 0);
  assert.equal(adapter.getDebugSnapshot().resyncCount, 1);
});

test('PP1 A1 #11 remaining tick 600/599/+601 boundaries never expire early', () => {
  const adapter = runtimeAdapter();
  const at600 = adapter.start(runtimeFrame([1], 1_200, 0));
  assert.equal(at600.markers[0]?.remainingTicks, 600);
  assert.equal(at600.markers[0]?.labelSeconds, 10);

  const at599 = adapter.update(updateFrame(runtimeFrame([1], 1_201, 0), []));
  assert.equal(at599.markers[0]?.remainingTicks, 599);
  assert.equal(at599.markers[0]?.labelSeconds, 10);
  assert.equal(at599.cues.length, 0);

  const at600Boundary = adapter.update(updateFrame(runtimeNotReadyFrame([1], 0), []));
  assert.equal(at600Boundary.status, 'resync-required');
  assert.equal(at600Boundary.markers.length, 0);
  const at601 = adapter.update(updateFrame(runtimeFrame([1], 1_801, 0, [1]), []));
  assert.equal(at601.status, 'ready');
  assert.equal(at601.markers.length, 0);
  assert.equal(at601.cues.length, 0);
});

test('PP1 A1 #12 same-tick expiry before pickup emits only expired', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_799, 0));
  const view = adapter.update(updateFrame(
    runtimeFrame([1], 1_800, 2, [1]),
    [expiredEvent(1, 0), pickupEvent(1, 1, { tick: 1_800 })],
  ));
  assert.equal(view.markers.length, 0);
  assert.deepEqual(view.cues.map(({ kind }) => kind), ['expired']);
});

test('PP1 A1 #13 recycle-replace-pickup authority order emits one replacement cue', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_399, 0));
  const view = adapter.update(updateFrame(
    runtimeFrame([1], 1_400, 3, [1]),
    [
      recycledEvent(1, 0),
      replacedEvent(1, 1),
      pickupEvent(1, 2, { tick: 1_400 }),
    ],
  ));
  assert.equal(view.markers.length, 0);
  assert.deepEqual(view.cues.map(({ kind }) => kind), ['replaced']);
  assert.equal(adapter.getDebugSnapshot().acceptedEventCount, 3);
});

test('PP1 A1 #14 identical duplicate is idempotent and never replays a cue', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(0, 0));
  const event = { id: 'duplicate-event', sequence: 0, tick: 1, type: 'MatchStarted' };
  adapter.update(updateFrame(emptyInput(1, 1), [event]));
  const duplicate = adapter.update(updateFrame(emptyInput(2, 1), [event]));
  assert.equal(duplicate.cues.length, 0);
  const debug = adapter.getDebugSnapshot();
  assert.equal(debug.acceptedEventCount, 1);
  assert.equal(debug.duplicateEventCount, 1);
  assert.equal(debug.recentEventHashCount, 1);
});

test('PP1 A1 #15 duplicate id or sequence with another hash fails terminal atomically', () => {
  for (const conflictingEvent of [
    { id: 'bound-event', sequence: 0, tick: 1, type: 'MatchStarted', detail: 'changed' },
    { id: 'other-event', sequence: 0, tick: 1, type: 'MatchStarted' },
  ]) {
    const adapter = runtimeAdapter(`duplicate-${conflictingEvent.id}`);
    adapter.start(emptyInput(0, 0));
    adapter.update(updateFrame(emptyInput(1, 1), [{
      id: 'bound-event', sequence: 0, tick: 1, type: 'MatchStarted',
    }]));
    assert.throws(() => adapter.update(updateFrame(emptyInput(2, 1), [conflictingEvent])),
      /canonical hash|绑定不同/);
    const debug = adapter.getDebugSnapshot();
    assert.equal(debug.lifecycleState, 'failed');
    assert.equal(debug.terminalFailureKind, 'event-identity-conflict');
    assert.equal(debug.acceptedEventCount, 1);
    assert.equal(debug.recentEventHashCount, 1);
  }
});

test('PP1 not-ready fallback still gives committed duplicate conflicts terminal priority', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(0, 0));
  adapter.update(updateFrame(emptyInput(1, 1), [{
    id: 'bound-event', sequence: 0, tick: 1, type: 'MatchStarted',
  }]));
  assert.throws(() => adapter.update(updateFrame(runtimeNotReadyFrame([1], 1), [{
    id: 'bound-event', sequence: 0, tick: 1, type: 'MatchStarted', detail: 'conflict',
  }])), /canonical hash|冲突/);
  assert.equal(adapter.getDebugSnapshot().terminalFailureKind, 'event-identity-conflict');
});

test('PP1 A1 #16 an event evicted from the 64-entry ring resyncs without replay', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(0, 0));
  const firstWindow = Array.from({ length: 64 }, (_, sequence) => ({
    id: `ring-${sequence}`, sequence, tick: sequence, type: 'MatchStarted',
  }));
  adapter.update(updateFrame(emptyInput(64, 64), firstWindow));
  adapter.update(updateFrame(emptyInput(65, 65), [{
    id: 'ring-64', sequence: 64, tick: 65, type: 'MatchStarted',
  }]));
  const old = adapter.update(updateFrame(emptyInput(66, 65), [{
    id: 'ring-0', sequence: 0, tick: 0, type: 'MatchStarted',
  }]));
  assert.equal(old.resyncedFromSnapshot, true);
  assert.equal(old.cues.length, 0);
  assert.equal(adapter.getDebugSnapshot().recentEventHashCount, 0);
});

test('PP1 A1 #17 sequence gaps and stale ordering snapshot-resync without sorting', () => {
  const gapAdapter = runtimeAdapter('gap');
  gapAdapter.start(emptyInput(0, 0));
  const gap = gapAdapter.update(updateFrame(emptyInput(3, 3), [{
    id: 'sequence-2', sequence: 2, tick: 2, type: 'MatchStarted',
  }]));
  assert.equal(gap.resyncedFromSnapshot, true);
  assert.equal(gapAdapter.getDebugSnapshot().acceptedEventCount, 0);

  const staleAdapter = runtimeAdapter('stale');
  staleAdapter.start(emptyInput(0, 2));
  const stale = staleAdapter.update(updateFrame(emptyInput(3, 3), [{
    id: 'sequence-1', sequence: 1, tick: 1, type: 'MatchStarted',
  }]));
  assert.equal(stale.resyncedFromSnapshot, true);
  assert.equal(stale.cues.length, 0);
});

test('PP1 A1 #18 missing and future input schemas fail terminal', () => {
  for (const invalid of [
    { ...emptyInput(0, 0), schemaVersion: 2 },
    (() => {
      const missing = emptyInput(0, 0);
      delete missing.snapshotTick;
      return missing;
    })(),
  ]) {
    const adapter = runtimeAdapter(`invalid-${String(invalid.schemaVersion)}`);
    assert.throws(() => adapter.start(invalid), /schemaVersion|缺少字段|exact-key/);
    assert.equal(adapter.getDebugSnapshot().terminalFailureKind, 'input-invalid');
  }
});

test('PP1 A1 #19 pause/resume uses only integer snapshots and emits no stale cues', () => {
  const adapter = runtimeAdapter();
  const frame = runtimeFrame([1], 1_201, 0);
  const started = adapter.start(frame);
  const paused = adapter.update(updateFrame(frame, []));
  const resumed = adapter.update(updateFrame(runtimeFrame([1], 1_202, 0), []));
  assert.deepEqual(paused.markers, started.markers);
  assert.equal(paused.cues.length, 0);
  assert.equal(resumed.markers[0]?.remainingTicks, 598);
  assert.equal(resumed.cues.length, 0);
});

test('PP1 A1 #20 adapter terminal state is tick-exact and independent of presentation cadence', () => {
  const direct = runtimeAdapter('cadence-equivalence');
  const sampled = runtimeAdapter('cadence-equivalence');
  direct.start(runtimeFrame([1], 1_799, 0));
  sampled.start(runtimeFrame([1], 1_799, 0));
  sampled.update(updateFrame(runtimeFrame([1], 1_799, 0), []));
  const directTerminal = direct.update(updateFrame(
    runtimeFrame([1], 1_800, 1, [1]),
    [expiredEvent(1, 0)],
  ));
  const sampledTerminal = sampled.update(updateFrame(
    runtimeFrame([1], 1_800, 1, [1]),
    [expiredEvent(1, 0)],
  ));
  assert.deepEqual(directTerminal.markers, sampledTerminal.markers);
  assert.deepEqual(directTerminal.cues, sampledTerminal.cues);
  assert.equal(directTerminal.cues[0]?.kind, 'expired');
});

test('PP1 A1 #21 catch-up rebuilds from snapshot and never double-emits one-shot cues', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(1_199, 0));
  const caughtUp = adapter.update(updateFrame(runtimeFrame([1], 1_200, 2), [{
    id: 'missed-before-window', sequence: 1, tick: 1_200, type: 'MatchStarted',
  }]));
  assert.equal(caughtUp.resyncedFromSnapshot, true);
  assert.equal(caughtUp.markers.length, 1);
  assert.equal(caughtUp.cues.length, 0);

  const stale = adapter.update(updateFrame(runtimeFrame([1], 1_201, 2), [{
    id: 'missed-before-window', sequence: 1, tick: 1_200, type: 'MatchStarted',
  }]));
  assert.equal(stale.resyncedFromSnapshot, true);
  assert.equal(stale.cues.length, 0);
  const forward = adapter.update(updateFrame(runtimeFrame([1], 1_202, 3), [{
    id: 'forward-event', sequence: 2, tick: 1_202, type: 'MatchStarted',
  }]));
  assert.equal(forward.cues.length, 0);
});

test('PP1 A1 #22 replay seek uses a new stream instance with cleared ring and pending state', () => {
  const first = runtimeAdapter('replay-epoch-1');
  first.start(emptyInput(0, 0));
  first.update(updateFrame(emptyInput(1, 1), [{
    id: 'epoch-1-event', sequence: 0, tick: 1, type: 'MatchStarted',
  }]));
  assert.equal(first.getDebugSnapshot().recentEventHashCount, 1);
  first.destroy();

  const second = runtimeAdapter('replay-epoch-2');
  const beforeStart = second.getDebugSnapshot();
  assert.equal(beforeStart.recentEventHashCount, 0);
  assert.equal(beforeStart.pendingReplacementPairCount, 0);
  const view = second.start(emptyInput(0, 0));
  assert.equal(view.streamId, 'replay-epoch-2');
  assert.equal(Object.hasOwn(
    ArenaSupplyPresentationAdapter.prototype,
    'setStream',
  ), false);
  assert.equal(Object.hasOwn(
    ArenaSupplyPresentationAdapter.prototype,
    'reset',
  ), false);

  const cannotResetOldStream = runtimeAdapter('replay-old-stream');
  cannotResetOldStream.start(emptyInput(10, 10));
  assert.throws(() => cannotResetOldStream.update(updateFrame(emptyInput(0, 0), [])),
    /新的 stream Adapter/);
  assert.equal(cannotResetOldStream.getDebugSnapshot().terminalFailureKind, 'input-invalid');
  const replacementEpoch = runtimeAdapter('replay-new-stream');
  assert.equal(replacementEpoch.start(emptyInput(0, 0)).nextExpectedEventSequence, 0);
});

test('PP1 A1 #23 asset fallback stays outside adapter authority and gate claims', () => {
  const adapter = runtimeAdapter();
  const view = adapter.start(runtimeFrame([1], 1_201, 0));
  assert.deepEqual(Object.keys(view), [
    'schemaVersion',
    'streamId',
    'status',
    'snapshotTick',
    'snapshotEventSequence',
    'nextExpectedEventSequence',
    'resyncedFromSnapshot',
    'markers',
    'cues',
  ]);
  assert.equal(Object.hasOwn(view, 'assetGatePassed'), false);
  assert.equal(Object.hasOwn(view, 'rendererFallback'), false);
});

test('PP1 A1 #24 reduced-motion and silent hosts consume identical adapter authority data', () => {
  const reducedMotion = runtimeAdapter('motion-equivalence');
  const silent = runtimeAdapter('motion-equivalence');
  reducedMotion.start(runtimeFrame([1], 1_799, 0));
  silent.start(runtimeFrame([1], 1_799, 0));
  const reducedView = reducedMotion.update(updateFrame(
    runtimeFrame([1], 1_800, 1, [1]),
    [expiredEvent(1, 0)],
  ));
  const silentView = silent.update(updateFrame(
    runtimeFrame([1], 1_800, 1, [1]),
    [expiredEvent(1, 0)],
  ));
  assert.deepEqual(reducedView, silentView);
  assert.equal(Object.hasOwn(reducedView, 'reducedMotion'), false);
  assert.equal(Object.hasOwn(reducedView, 'silent'), false);
});

test('PP1 A1 #25 destroy is idempotent and clears adapter-owned state only', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_201, 0));
  adapter.destroy();
  adapter.destroy();
  const debug = adapter.getDebugSnapshot();
  assert.equal(debug.lifecycleState, 'destroyed');
  assert.equal(debug.snapshotTick, null);
  assert.equal(debug.nextExpectedEventSequence, null);
  assert.equal(debug.markerCount, 0);
  assert.equal(debug.pendingReplacementPairCount, 0);
  assert.equal(debug.recentEventHashCount, 0);
  assert.equal(debug.acceptedEventCount, 0);
  assert.equal(debug.duplicateEventCount, 0);
  assert.equal(debug.resyncCount, 0);
  assert.equal(Object.hasOwn(debug, 'gpuResourceCount'), false);
  assert.equal(Object.hasOwn(debug, 'audioResourceCount'), false);
});

test('PP1 65-event ready and not-ready batches resync before canonical hash processing', () => {
  const overflowEvents = Array.from({ length: 65 }, (_, sequence) => ({
    id: `overflow-${sequence}`,
    sequence,
    tick: sequence,
    type: 'MatchStarted',
  }));
  const readyAdapter = runtimeAdapter('overflow-ready');
  readyAdapter.start(emptyInput(0, 0));
  const ready = readyAdapter.update(updateFrame(emptyInput(65, 65), overflowEvents));
  assert.equal(ready.status, 'ready');
  assert.equal(ready.resyncedFromSnapshot, true);
  assert.equal(ready.cues.length, 0);
  assert.equal(readyAdapter.getDebugSnapshot().acceptedEventCount, 0);
  assert.equal(readyAdapter.getDebugSnapshot().recentEventHashCount, 0);

  const hiddenAdapter = runtimeAdapter('overflow-hidden');
  hiddenAdapter.start(emptyInput(0, 0));
  hiddenAdapter.update(updateFrame(emptyInput(1, 1), [{
    id: 'committed-id', sequence: 0, tick: 1, type: 'MatchStarted',
  }]));
  const conflictThatMustNotBeHashed = [
    { id: 'committed-id', sequence: 0, tick: 1, type: 'MatchStarted', changed: true },
    ...Array.from({ length: 64 }, (_, index) => ({
      id: `overflow-hidden-${index + 1}`,
      sequence: index + 1,
      tick: index + 1,
      type: 'MatchStarted',
    })),
  ];
  const hidden = hiddenAdapter.update(updateFrame(
    runtimeNotReadyFrame([1], 65),
    conflictThatMustNotBeHashed,
  ));
  assert.equal(hidden.status, 'resync-required');
  assert.equal(hidden.cues.length, 0);
  const hiddenDebug = hiddenAdapter.getDebugSnapshot();
  assert.equal(hiddenDebug.terminalFailureKind, null);
  assert.equal(hiddenDebug.acceptedEventCount, 1);
  assert.equal(hiddenDebug.recentEventHashCount, 0);
});

test('PP1 batches above the 256 structural cap fail input-invalid', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(0, 0));
  const events = Array.from({ length: 257 }, (_, sequence) => ({
    id: `too-many-${sequence}`, sequence, tick: sequence, type: 'MatchStarted',
  }));
  assert.throws(() => adapter.update(updateFrame(emptyInput(257, 257), events)), /超过上限 256/);
  assert.equal(adapter.getDebugSnapshot().terminalFailureKind, 'input-invalid');
});

test('PP1 constructor validation is instance-local under nested construction', () => {
  let nestedConstructed = false;
  let trapRuns = 0;
  const target = {
    schemaVersion: 1,
    streamId: 'constructor-outer',
    ticksPerSecond: 60,
    lifecycleContract: lifecycleContract(),
    recentEventCapacity: 64,
  };
  const options = new Proxy(target, {
    ownKeys(inner) {
      trapRuns += 1;
      if (!nestedConstructed) {
        nestedConstructed = true;
        runtimeAdapter('constructor-inner').destroy();
      }
      return Reflect.ownKeys(inner);
    },
  });
  const adapter = new ArenaSupplyPresentationAdapter(options);
  assert.equal(nestedConstructed, true);
  assert.equal(trapRuns > 0, true);
  assert.equal(adapter.getDebugSnapshot().lifecycleState, 'created');
});

test('PP1 sticky transaction guard detects swallowed start reentry before publication', () => {
  const adapter = runtimeAdapter('start-reentry');
  const target = emptyInput(0, 0);
  let attempted = false;
  const hostile = new Proxy(target, {
    ownKeys(inner) {
      if (!attempted) {
        attempted = true;
        try {
          adapter.start(emptyInput(0, 0));
        } catch {
          // Deliberately swallowed: the outer transaction must still observe reentry.
        }
      }
      return Reflect.ownKeys(inner);
    },
  });
  assert.throws(() => adapter.start(hostile), /重入/);
  const debug = adapter.getDebugSnapshot();
  assert.equal(debug.lifecycleState, 'failed');
  assert.equal(debug.terminalFailureKind, 'reentrant-call');
  assert.equal(debug.markerCount, 0);
});

test('PP1 sticky transaction guard detects update reentry through getDebug/destroy traps', () => {
  for (const nestedOperation of ['getDebugSnapshot', 'destroy'] as const) {
    const adapter = runtimeAdapter(`update-reentry-${nestedOperation}`);
    adapter.start(runtimeFrame([1], 1_201, 0));
    const target = updateFrame(runtimeFrame([1], 1_202, 0), []);
    let attempted = false;
    const hostile = new Proxy(target, {
      ownKeys(inner) {
        if (!attempted) {
          attempted = true;
          try {
            adapter[nestedOperation]();
          } catch {
            // A hostile trap may swallow the inner error; the sticky bit remains.
          }
        }
        return Reflect.ownKeys(inner);
      },
    });
    assert.throws(() => adapter.update(hostile), /重入/);
    const debug = adapter.getDebugSnapshot();
    assert.equal(debug.lifecycleState, 'failed');
    assert.equal(debug.terminalFailureKind, 'reentrant-call');
    assert.equal(debug.markerCount, 1);
    assert.equal(debug.snapshotTick, 1_201);
  }
});

test('PP1 conflicting second event cannot half-publish the first event hash or counters', () => {
  const adapter = runtimeAdapter();
  adapter.start(emptyInput(0, 0));
  assert.throws(() => adapter.update(updateFrame(emptyInput(2, 2), [
    { id: 'same-id', sequence: 0, tick: 1, type: 'MatchStarted' },
    { id: 'same-id', sequence: 1, tick: 2, type: 'MatchStarted' },
  ])), /canonical hash|绑定不同/);
  const debug = adapter.getDebugSnapshot();
  assert.equal(debug.lifecycleState, 'failed');
  assert.equal(debug.terminalFailureKind, 'event-identity-conflict');
  assert.equal(debug.acceptedEventCount, 0);
  assert.equal(debug.recentEventHashCount, 0);
  assert.equal(debug.nextExpectedEventSequence, 0);
});

test('PP1 incomplete or reversed replacement pairs resync and publish zero pending state', () => {
  const incomplete = runtimeAdapter('replacement-incomplete');
  incomplete.start(runtimeFrame([1], 1_399, 0));
  const incompleteView = incomplete.update(updateFrame(
    runtimeFrame([1], 1_400, 1),
    [recycledEvent(1, 0)],
  ));
  assert.equal(incompleteView.resyncedFromSnapshot, true);
  assert.equal(incompleteView.cues.length, 0);
  assert.equal(incomplete.getDebugSnapshot().pendingReplacementPairCount, 0);

  const reversed = runtimeAdapter('replacement-reversed');
  reversed.start(runtimeFrame([1], 1_399, 0));
  const reversedView = reversed.update(updateFrame(
    runtimeFrame([1], 1_400, 2),
    [replacedEvent(1, 0), recycledEvent(1, 1)],
  ));
  assert.equal(reversedView.resyncedFromSnapshot, true);
  assert.equal(reversedView.cues.length, 0);
  assert.equal(reversed.getDebugSnapshot().pendingReplacementPairCount, 0);
});

test('PP1 returns a fresh deep-frozen View and never memoizes a prior Cue batch', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_201, 0));
  const terminal = adapter.update(updateFrame(
    runtimeFrame([1], 1_300, 1, [1]),
    [pickupEvent(1, 0)],
  ));
  assert.equal(terminal.cues.length, 1);
  const reread = adapter.update(updateFrame(runtimeFrame([1], 1_300, 1, [1]), []));
  assert.notEqual(reread, terminal);
  assert.equal(reread.cues.length, 0);
  assert.equal(Object.isFrozen(reread), true);
  assert.equal(Object.isFrozen(reread.cues), true);
});

test('PP1 terminal Cues use committed identity and remain intentionally non-spatial', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_799, 0));
  const terminal = adapter.update(updateFrame(
    runtimeFrame([1], 1_800, 1, [1]),
    [expiredEvent(1, 0)],
  ));
  assert.equal(terminal.markers.length, 0);
  assert.equal(terminal.cues[0]?.supplyId, supplyId('left'));
  assert.equal(terminal.cues[0]?.equipmentInstanceId, equipmentId('left'));
  assert.equal(Object.hasOwn(terminal.cues[0]!, 'position'), false);
  assert.equal(Object.hasOwn(terminal.cues[0]!, 'resourceHandle'), false);
});

test('PP1 illegal lifecycle transitions fail closed and failed can only destroy', () => {
  const beforeStart = runtimeAdapter('update-before-start');
  assert.throws(() => beforeStart.update(updateFrame(emptyInput(0, 0), [])), /必须先 start/);
  assert.equal(beforeStart.getDebugSnapshot().terminalFailureKind, 'input-invalid');

  const twice = runtimeAdapter('start-twice');
  twice.start(emptyInput(0, 0));
  assert.throws(() => twice.start(emptyInput(0, 0)), /只允许调用一次/);
  assert.equal(twice.getDebugSnapshot().lifecycleState, 'failed');
  assert.throws(() => twice.update(updateFrame(emptyInput(0, 0), [])), /已失败/);
  twice.destroy();
  twice.destroy();
  const destroyed = twice.getDebugSnapshot();
  assert.equal(destroyed.lifecycleState, 'destroyed');
  assert.equal(destroyed.markerCount, 0);
  assert.equal(destroyed.terminalFailureKind, 'input-invalid');
  assert.throws(() => twice.start(emptyInput(0, 0)), /已销毁/);
});

test('PP1 same-waterline no-event projection drift fails instead of silently mutating state', () => {
  const adapter = runtimeAdapter();
  adapter.start(runtimeFrame([1], 1_201, 0));
  const drifted = runtimeFrame([1], 1_201, 0);
  const equipmentItems = drifted.equipment as Record<string, unknown>[];
  const equipmentPosition = equipmentItems[0]!.position as Record<string, unknown>;
  equipmentPosition.x = -2;
  const projection = drifted.activeSupplyProjection as Record<string, unknown>;
  const supplies = projection.supplies as Record<string, unknown>[];
  const projectedPosition = supplies[0]!.position as Record<string, unknown>;
  projectedPosition.x = -2;
  assert.throws(() => adapter.update(updateFrame(drifted, [])), /projection 漂移/);
  const debug = adapter.getDebugSnapshot();
  assert.equal(debug.terminalFailureKind, 'input-invalid');
  assert.equal(debug.snapshotTick, 1_201);
});
