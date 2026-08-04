import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_READ_PROFILE,
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS,
  MATCH_READ_FRAME_V2_SCHEMA_VERSION,
  createBotMobilitySidecarV2Audit,
  createFullAuditSidecarV2Audit,
  createLocalActionSidecarV2Audit,
  createMatchReadFrameV2Audit,
  createWorldSnapshotV2Audit,
  requireArenaSurvivalSupplyProjectionV2,
} from '@number-strategy-jump/arena-contracts';
import type {
  MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';

const POS = Object.freeze({ x: 0, y: 0, z: 0 });

function outcome(kind: string = ACTION_RESOLUTION_KIND.NONE, selected = false): Record<string, unknown> {
  return {
    kind,
    actionDefinitionId: selected ? 'action-primary' : null,
    lane: selected ? 'primary' : null,
    source: selected ? 'fixture' : null,
    reason: selected ? 'selected' : 'no-candidate',
  };
}

function participant(id: string, held = false): Record<string, unknown> {
  return {
    id,
    characterDefinitionId: 'character-basic',
    status: 'active',
    lives: 2,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
    action: {
      definitionId: null,
      phase: 'idle',
      ticksRemaining: 0,
    },
    actionRule: { schemaVersion: 1, mode: 'fixture' },
    movement: {
      schemaVersion: 1,
      participantId: id,
      characterDefinitionId: 'character-basic',
      mode: 'grounded',
      coyoteTicksRemaining: 0,
      jumpBufferTicksRemaining: 0,
      airJumpsUsed: 0,
      crouchChargeTicks: 0,
      crouchActionId: null,
      downSmashActionId: null,
      revision: 0,
      grounded: true,
    },
    equipment: held
      ? { instanceId: `${id}-equipment`, definitionId: 'equipment-hammer', cooldownRemainingTicks: 0 }
      : null,
    position: { ...POS },
    velocity: { ...POS },
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'surface-ground',
  };
}

function runtime(instanceId: string, locationState: string, ownerId: string | null = null): Record<string, unknown> {
  return {
    schemaVersion: 1,
    instanceId,
    definitionId: 'equipment-hammer',
    spawnId: 'spawn-center',
    locationState,
    ownerId,
    position: locationState === 'held' || locationState === 'despawned' ? null : { ...POS },
    lastSafePosition: { ...POS },
    cooldownRemainingTicks: 0,
    revision: 0,
  };
}

function mapSnapshot(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    definitionId: 'arena-map-training',
    nextActiveTick: 0,
    revision: 0,
    surfaces: [{ id: 'surface-ground', enabled: true, revision: 0 }],
    occurrences: [{
      occurrenceId: 'occurrence-0',
      eventId: 'none',
      kind: 'none',
      warningTick: 0,
      startTick: 0,
      endTick: null,
      phase: 'preparing',
      publicPayload: {},
      revision: 0,
    }],
  };
}

function projection(equipmentInstanceId = 'arena-v2.survival-supply.v1:wave-0:slot-center:equipment'): Record<string, unknown> {
  return {
    schemaVersion: 2,
    snapshotTick: 1200,
    snapshotEventSequence: 3,
    resyncReadiness: ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY,
    pendingAuthorityTick: null,
    pendingExpiryEquipmentInstanceIds: [],
    supplies: [{
      schemaVersion: 2,
      supplyDefinitionId: 'arena-v2.survival-supply.v1',
      supplyId: 'arena-v2.survival-supply.v1:wave-0:slot-center',
      slotId: 'center',
      equipmentInstanceId,
      equipmentDefinitionId: 'equipment-hammer',
      equipmentSpawnId: 'spawn-center',
      spawnPosition: { ...POS },
      spawnTick: 1200,
      expireTick: 1800,
      remainingTicks: 600,
      position: { ...POS },
    }],
  };
}

function world(options: {
  equipment?: readonly Record<string, unknown>[];
  activeSupplyProjection?: Record<string, unknown> | null;
  tick?: number;
  eventSequence?: number;
  phase?: string;
  participants?: readonly Record<string, unknown>[];
  result?: Record<string, unknown> | null;
} = {}): Record<string, unknown> {
  return {
    authoritySchemaVersion: 1,
    physicsBackendVersion: 'physics-v1',
    configHash: '12345678',
    ruleContentHash: 'abcdef01',
    matchSeed: 42,
    tick: options.tick ?? 1200,
    activeTick: options.tick ?? 1200,
    phase: options.phase ?? 'running',
    remainingTicks: 100,
    eventSequence: options.eventSequence ?? 3,
    participants: options.participants ?? [participant('player-1'), participant('player-2')],
    equipment: options.equipment ?? [runtime('world-equipment', 'spawned')],
    activeSupplyProjection: options.activeSupplyProjection ?? null,
    map: mapSnapshot(),
    result: options.result ?? null,
  };
}

function localSidecar(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    tick: 1200,
    eventSequence: 3,
    participantId: 'player-1',
    profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
    primaryActionDefinitionId: null,
    channels: {
      primary: outcome(),
      primaryHold: outcome(),
    },
    ...overrides,
  };
}

function botSidecar(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    tick: 1200,
    eventSequence: 3,
    participantId: 'player-1',
    profile: ARENA_MATCH_READ_PROFILE.BOT_MOBILITY,
    channels: {
      jump: outcome(),
      slam: outcome(),
    },
    ...overrides,
  };
}

function fullSidecar(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    tick: 1200,
    eventSequence: 3,
    participantId: 'player-1',
    profile: ARENA_MATCH_READ_PROFILE.FULL_AUDIT,
    primaryActionDefinitionId: 'action-primary',
    channels: {
      primary: outcome(ACTION_RESOLUTION_KIND.SELECTED, true),
      primaryHold: outcome(),
      jump: outcome(),
      slam: outcome(),
    },
    ...overrides,
  };
}

function frame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: MATCH_READ_FRAME_V2_SCHEMA_VERSION,
    worldSnapshot: world(),
    localActionSidecar: localSidecar(),
    ...overrides,
  };
}

function assertFrozenTree(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  if (Array.isArray(value)) {
    value.forEach((child) => assertFrozenTree(child, seen));
    return;
  }
  Object.values(value).forEach((child) => assertFrozenTree(child, seen));
}

test('PA2a ordinary frame audits with null supply and exact V2 boundaries', () => {
  const source = frame();
  const audited = createMatchReadFrameV2Audit(source) as unknown as MatchReadFrameV2;
  assert.equal(audited.schemaVersion, 2);
  assert.equal(audited.worldSnapshot.authoritySchemaVersion, 1);
  assert.equal(audited.worldSnapshot.activeSupplyProjection, null);
  assert.equal('actionAffordance' in audited.worldSnapshot.participants[0]!, false);
  assertFrozenTree(audited);
  (source.worldSnapshot as Record<string, unknown>).phase = 'mutated';
  assert.equal(audited.worldSnapshot.phase, 'running');
});

test('PA2a complete supply projection is audited and survival require rejects null', () => {
  const supplyEquipment = runtime(
    'arena-v2.survival-supply.v1:wave-0:slot-center:equipment',
    'spawned',
  );
  const supply = projection();
  const audited = createWorldSnapshotV2Audit(world({
    equipment: [supplyEquipment],
    activeSupplyProjection: supply,
  }));
  assert.equal(audited.activeSupplyProjection?.supplies.length, 1);
  const supplyWorld = world({
    equipment: [supplyEquipment],
    activeSupplyProjection: supply,
  });
  const required = requireArenaSurvivalSupplyProjectionV2(supplyWorld);
  assert.equal(required.supplies[0]?.remainingTicks, 600);
  assert.throws(
    () => requireArenaSurvivalSupplyProjectionV2(world()),
    /必须携带 activeSupplyProjection/,
  );
});

test('PA2a local, bot and full sidecars have closed profiles and exact channels', () => {
  const auditedWorld = createWorldSnapshotV2Audit(world());
  const auditedLocal = createLocalActionSidecarV2Audit(localSidecar(), auditedWorld);
  const auditedBot = createBotMobilitySidecarV2Audit(botSidecar(), auditedWorld);
  const auditedFull = createFullAuditSidecarV2Audit(fullSidecar(), auditedWorld);
  assert.deepEqual(Object.keys(auditedLocal.channels), ['primary', 'primaryHold']);
  assert.deepEqual(Object.keys(auditedBot.channels), ['jump', 'slam']);
  assert.deepEqual(Object.keys(auditedFull.channels), ['jump', 'primary', 'primaryHold', 'slam']);
  assert.equal(auditedFull.primaryActionDefinitionId, 'action-primary');
  assertFrozenTree(auditedLocal);
  assertFrozenTree(auditedBot);
  assertFrozenTree(auditedFull);
});

test('PA2a frame and sidecar identities must agree with world', () => {
  const auditedWorld = createWorldSnapshotV2Audit(world());
  assert.doesNotThrow(() => createLocalActionSidecarV2Audit(localSidecar(), auditedWorld));
  assert.throws(
    () => createLocalActionSidecarV2Audit(localSidecar({ tick: 1201 }), auditedWorld),
    /identity 必须与 world snapshot 一致/,
  );
  assert.throws(
    () => createLocalActionSidecarV2Audit(localSidecar({ participantId: 'unknown' }), auditedWorld),
    /不存在于 world snapshot/,
  );
});

test('PA2a selected outcome requires complete action identity and reason', () => {
  assert.doesNotThrow(() => createFullAuditSidecarV2Audit(fullSidecar()));
  assert.throws(
    () => createFullAuditSidecarV2Audit(fullSidecar({
      channels: { ...fullSidecar().channels as Record<string, unknown>, primary: outcome(ACTION_RESOLUTION_KIND.SELECTED) },
    })),
    /selected 必须包含/,
  );
  assert.throws(
    () => createBotMobilitySidecarV2Audit(botSidecar({
      channels: { jump: { ...outcome(), reason: '' }, slam: outcome() },
    })),
    /reason 必须是非空字符串/,
  );
});

test('PA2a none/selected/ignored outcome identities are closed for every profile', () => {
  const noneWithIdentity = outcome(ACTION_RESOLUTION_KIND.NONE, true);
  const ignoredPartial = {
    kind: ACTION_RESOLUTION_KIND.IGNORED,
    actionDefinitionId: 'action-primary',
    lane: null,
    source: 'fixture',
    reason: 'candidate-ignored',
  };
  assert.throws(
    () => createLocalActionSidecarV2Audit(localSidecar({
      channels: { primary: noneWithIdentity, primaryHold: outcome() },
    })),
    /none 不得包含/,
  );
  assert.throws(
    () => createBotMobilitySidecarV2Audit(botSidecar({
      channels: { jump: noneWithIdentity, slam: outcome() },
    })),
    /none 不得包含/,
  );
  assert.throws(
    () => createFullAuditSidecarV2Audit(fullSidecar({
      channels: { ...fullSidecar().channels as Record<string, unknown>, jump: noneWithIdentity },
    })),
    /none 不得包含/,
  );
  assert.throws(
    () => createLocalActionSidecarV2Audit(localSidecar({
      channels: { primary: ignoredPartial, primaryHold: outcome() },
    })),
    /ignored 必须是全空或完整/,
  );
  assert.throws(
    () => createBotMobilitySidecarV2Audit(botSidecar({
      channels: { jump: ignoredPartial, slam: outcome() },
    })),
    /ignored 必须是全空或完整/,
  );
  assert.throws(
    () => createFullAuditSidecarV2Audit(fullSidecar({
      channels: { ...fullSidecar().channels as Record<string, unknown>, slam: ignoredPartial },
    })),
    /ignored 必须是全空或完整/,
  );

  const ignoredEmpty = {
    kind: ACTION_RESOLUTION_KIND.IGNORED,
    actionDefinitionId: null,
    lane: null,
    source: null,
    reason: 'participant-unavailable',
  };
  const ignoredComplete = {
    kind: ACTION_RESOLUTION_KIND.IGNORED,
    actionDefinitionId: 'action-primary',
    lane: 'primary',
    source: 'fixture',
    reason: 'candidate-ignored',
  };
  assert.doesNotThrow(() => createLocalActionSidecarV2Audit(localSidecar({
    channels: { primary: ignoredEmpty, primaryHold: outcome() },
  })));
  assert.doesNotThrow(() => createLocalActionSidecarV2Audit(localSidecar({
    primaryActionDefinitionId: 'display-primary',
    channels: { primary: ignoredEmpty, primaryHold: outcome() },
  })));
  assert.doesNotThrow(() => createBotMobilitySidecarV2Audit(botSidecar({
    channels: { jump: ignoredComplete, slam: ignoredEmpty },
  })));
  assert.doesNotThrow(() => createFullAuditSidecarV2Audit(fullSidecar({
    primaryActionDefinitionId: 'action-primary',
    channels: { ...fullSidecar().channels as Record<string, unknown>, primary: ignoredComplete },
  })));
});

test('PA2a primary identity follows selected/ignored/none rules and rejects display mismatches', () => {
  assert.throws(
    () => createFullAuditSidecarV2Audit(fullSidecar({ primaryActionDefinitionId: 'wrong-action' })),
    /必须匹配 primary outcome/,
  );
  assert.throws(
    () => createLocalActionSidecarV2Audit(localSidecar({
      primaryActionDefinitionId: 'display-primary',
    })),
    /none primary 不得携带/,
  );
  assert.doesNotThrow(() => createLocalActionSidecarV2Audit(localSidecar({
    primaryActionDefinitionId: 'display-primary',
    channels: {
      primary: {
        kind: ACTION_RESOLUTION_KIND.IGNORED,
        actionDefinitionId: null,
        lane: null,
        source: null,
        reason: 'participant-unavailable',
      },
      primaryHold: outcome(),
    },
  })));
  assert.throws(
    () => createLocalActionSidecarV2Audit(localSidecar({
      primaryActionDefinitionId: 'display-primary',
      channels: {
        primary: {
          kind: ACTION_RESOLUTION_KIND.IGNORED,
          actionDefinitionId: 'action-primary',
          lane: 'primary',
          source: 'fixture',
          reason: 'candidate-ignored',
        },
        primaryHold: outcome(),
      },
    })),
    /必须匹配 primary outcome/,
  );
});

test('PA2a root, future, profile, channel and owner fields fail closed', () => {
  assert.throws(() => createMatchReadFrameV2Audit(frame({ measurementSchemaVersion: 2 })), /不支持字段/);
  assert.throws(() => createMatchReadFrameV2Audit(frame({ owner: {} })), /不支持字段/);
  assert.throws(() => createMatchReadFrameV2Audit(frame({ schemaVersion: 3 })), /schemaVersion 必须是 2/);
  assert.throws(() => createLocalActionSidecarV2Audit(localSidecar({ profile: 'primary' })), /profile 不匹配/);
  assert.throws(() => createBotMobilitySidecarV2Audit(botSidecar({ channels: { jump: outcome(), slam: outcome(), primary: outcome() } })), /不支持字段/);
  assert.throws(() => createFullAuditSidecarV2Audit(fullSidecar({ owner: {} })), /不支持字段/);
});

test('PA2a accessor, malformed Proxy, containers, cycles, sparse arrays and Symbols fail closed', () => {
  let getterReads = 0;
  const accessorFrame = frame();
  Object.defineProperty(accessorFrame, 'schemaVersion', {
    enumerable: true,
    get: () => {
      getterReads += 1;
      return 2;
    },
  });
  assert.throws(() => createMatchReadFrameV2Audit(accessorFrame), /数据字段/);
  assert.equal(getterReads, 0);

  const acceptedProxy = new Proxy(frame(), { get: () => { getterReads += 1; return undefined; } });
  const audited = createMatchReadFrameV2Audit(acceptedProxy);
  assert.equal(getterReads, 0);
  assert.equal(audited.schemaVersion, 2);

  const descriptorMismatch = new Proxy(frame(), {
    getOwnPropertyDescriptor(target, property) {
      if (property === 'schemaVersion') return undefined;
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  assert.throws(() => createMatchReadFrameV2Audit(descriptorMismatch), /数据字段/);

  for (const container of [new Map(), new Set(), new Date(), new Uint8Array([1])]) {
    const malformed = frame();
    const participants = (malformed.worldSnapshot as Record<string, unknown>).participants as Record<string, unknown>[];
    participants[0]!.actionRule = container;
    assert.throws(() => createMatchReadFrameV2Audit(malformed), /普通对象|可序列化数据/);
  }

  const cyclic = frame();
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  const cyclicParticipants = (cyclic.worldSnapshot as Record<string, unknown>).participants as Record<string, unknown>[];
  cyclicParticipants[0]!.actionRule = cycle;
  assert.throws(() => createMatchReadFrameV2Audit(cyclic), /循环引用|不支持字段/);

  const sparse = frame();
  const map = sparse.worldSnapshot as Record<string, unknown>;
  map.participants = [];
  (map.participants as unknown[]).length = 1;
  assert.throws(() => createMatchReadFrameV2Audit(sparse), /空槽|participants 必须是非空数组/);

  const extraArrayKey = frame();
  const participants = extraArrayKey.worldSnapshot as Record<string, unknown>;
  (participants.participants as unknown as Record<string, unknown>).extra = 1;
  assert.throws(() => createMatchReadFrameV2Audit(extraArrayKey), /数组不能包含额外字段/);

  const nonFinite = frame();
  const nonFiniteParticipants = nonFinite.worldSnapshot as Record<string, unknown>;
  const firstParticipant = (nonFiniteParticipants.participants as Record<string, unknown>[])[0]!;
  (firstParticipant.position as Record<string, unknown>).x = Number.NaN;
  assert.throws(() => createMatchReadFrameV2Audit(nonFinite), /非有限数/);

  const symbolFrame = frame();
  Object.defineProperty(symbolFrame, Symbol('future'), { enumerable: true, value: 1 });
  assert.throws(() => createMatchReadFrameV2Audit(symbolFrame), /Symbol/);
});

test('PA2a numeric, hash, duplicate identity and winner cross-checks are strict', () => {
  const unsafeTick = world();
  unsafeTick.tick = Number.MAX_SAFE_INTEGER + 1;
  unsafeTick.activeTick = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => createWorldSnapshotV2Audit(unsafeTick), /安全整数/);
  const futureActive = world();
  (futureActive as Record<string, unknown>).activeTick = 1201;
  assert.throws(() => createWorldSnapshotV2Audit(futureActive), /activeTick 不能超过 tick/);
  const badSeed = world();
  (badSeed as Record<string, unknown>).matchSeed = 0x100000000;
  assert.throws(() => createWorldSnapshotV2Audit(badSeed), /uint32/);
  const badHash = world();
  (badHash as Record<string, unknown>).configHash = 'ABCDEF01';
  assert.throws(() => createWorldSnapshotV2Audit(badHash), /小写十六进制/);
  const duplicate = world();
  duplicate.participants = [participant('player-1'), participant('player-1')];
  assert.throws(() => createWorldSnapshotV2Audit(duplicate), /重复/);
  const badWinner = world();
  badWinner.phase = 'ended';
  badWinner.result = { winnerId: 'unknown', reason: 'ended', isDraw: false, endedAtTick: 1200 };
  assert.throws(() => createWorldSnapshotV2Audit(badWinner), /winnerId 必须引用/);
});

test('PA2a authority, movement, equipment and map schemas require safe version >= 1', () => {
  const targets: Array<[string, (value: Record<string, unknown>, schemaVersion: number) => void]> = [
    ['authoritySchemaVersion', (value, schemaVersion) => { value.authoritySchemaVersion = schemaVersion; }],
    ['movement.schemaVersion', (value, schemaVersion) => {
      const participant = (value.participants as Record<string, unknown>[])[0]!;
      (participant.movement as Record<string, unknown>).schemaVersion = schemaVersion;
    }],
    ['equipment.schemaVersion', (value, schemaVersion) => {
      (value.equipment as Record<string, unknown>[])[0]!.schemaVersion = schemaVersion;
    }],
    ['map.schemaVersion', (value, schemaVersion) => {
      (value.map as Record<string, unknown>).schemaVersion = schemaVersion;
    }],
  ];
  for (const [label, mutate] of targets) {
    for (const schemaVersion of [0, -1, Number.MAX_SAFE_INTEGER + 1]) {
      const candidate = world();
      mutate(candidate, schemaVersion);
      assert.throws(() => createWorldSnapshotV2Audit(candidate), /安全整数/, `${label}:${schemaVersion}`);
    }
  }
});

test('PA2a participant identity, lifecycle and held equipment are checked bidirectionally', () => {
  const unknownHit = world();
  ((unknownHit.participants as Record<string, unknown>[])[0]!).lastHitBy = 'unknown';
  assert.throws(() => createWorldSnapshotV2Audit(unknownHit), /lastHitBy 必须引用/);

  const heldParticipant = participant('player-1', true);
  const heldRuntime = runtime('player-1-equipment', 'held', 'player-1');
  const heldWorld = world({
    participants: [heldParticipant, participant('player-2')],
    equipment: [heldRuntime],
  });
  assert.doesNotThrow(() => createWorldSnapshotV2Audit(heldWorld));

  const missingPointer = world({
    participants: [participant('player-1'), participant('player-2')],
    equipment: [heldRuntime],
  });
  assert.throws(() => createWorldSnapshotV2Audit(missingPointer), /缺少 participant\.equipment 指针/);

  const cooldownMismatch = world({
    participants: [participant('player-1', true), participant('player-2')],
    equipment: [{ ...heldRuntime, cooldownRemainingTicks: 1 }],
  });
  assert.throws(() => createWorldSnapshotV2Audit(cooldownMismatch), /definition 不一致/);

  const duplicateOwner = world({
    participants: [participant('player-1', true), participant('player-2')],
    equipment: [
      heldRuntime,
      { ...heldRuntime, instanceId: 'player-1-equipment-duplicate' },
    ],
  });
  assert.throws(() => createWorldSnapshotV2Audit(duplicateOwner), /不能同时持有多个/);

  const unknownLocation = world({
    equipment: [{ ...runtime('world-equipment', 'spawned'), locationState: 'teleported' }],
  });
  assert.throws(() => createWorldSnapshotV2Audit(unknownLocation), /locationState 不在/);

  const ownerMismatch = world({
    participants: [participant('player-1', true), participant('player-2')],
    equipment: [runtime('player-1-equipment', 'held', 'player-2')],
  });
  assert.throws(() => createWorldSnapshotV2Audit(ownerMismatch), /owner 不一致/);
});

test('PA2a phase/result contract is closed and valid ended snapshots remain accepted', () => {
  for (const phase of ['preparing', 'running', 'sudden-death']) {
    assert.doesNotThrow(() => createWorldSnapshotV2Audit(world({ phase })));
    assert.throws(
      () => createWorldSnapshotV2Audit(world({ phase, result: {
        winnerId: 'player-1', reason: 'ended', isDraw: false, endedAtTick: 1200,
      } })),
      /只有 ended phase/,
    );
  }
  assert.throws(() => createWorldSnapshotV2Audit(world({ phase: 'unknown' })), /phase 不在/);
  assert.throws(() => createWorldSnapshotV2Audit(world({ phase: 'ended' })), /ended phase 必须携带/);
  assert.doesNotThrow(() => createWorldSnapshotV2Audit(world({
    phase: 'ended',
    result: { winnerId: 'player-1', reason: 'ended', isDraw: false, endedAtTick: 1200 },
  })));
  assert.throws(() => createWorldSnapshotV2Audit(world({
    phase: 'ended',
    result: { winnerId: null, reason: 'ended', isDraw: false, endedAtTick: 1200 },
  })), /winnerId 与 isDraw/);
  assert.throws(() => createWorldSnapshotV2Audit(world({
    phase: 'ended',
    result: { winnerId: 'player-1', reason: 'ended', isDraw: true, endedAtTick: 1200 },
  })), /winnerId 与 isDraw/);
  assert.throws(() => createWorldSnapshotV2Audit(world({
    phase: 'ended',
    result: { winnerId: 'player-1', reason: 'ended', isDraw: false, endedAtTick: 1201 },
  })), /endedAtTick 不能超过/);
});

test('PA2a sidecar world input is independently audited without executing getters', () => {
  let getterReads = 0;
  const fakeWorld = new Proxy(world(), {
    get(target, property, receiver) {
      getterReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  assert.doesNotThrow(() => createLocalActionSidecarV2Audit(localSidecar(), fakeWorld));
  assert.equal(getterReads, 0);

  const accessorWorld = world();
  let accessorReads = 0;
  Object.defineProperty(accessorWorld, 'tick', {
    enumerable: true,
    get: () => {
      accessorReads += 1;
      return 1200;
    },
  });
  assert.throws(
    () => createLocalActionSidecarV2Audit(localSidecar(), accessorWorld),
    /数据字段/,
  );
  assert.equal(accessorReads, 0);

  const invalidWorld = world({ tick: 1201 });
  let invalidGetterReads = 0;
  const invalidProxy = new Proxy(invalidWorld, {
    get(target, property, receiver) {
      invalidGetterReads += 1;
      return Reflect.get(target, property, receiver);
    },
  });
  assert.throws(
    () => createBotMobilitySidecarV2Audit(botSidecar(), invalidProxy),
    /identity 必须与 world snapshot 一致/,
  );
  assert.equal(invalidGetterReads, 0);
});

test('PA2a legal audit recovers after failures without retained state', () => {
  const bad = frame({ schemaVersion: 9 });
  assert.throws(() => createMatchReadFrameV2Audit(bad));
  const audited = createMatchReadFrameV2Audit(frame());
  assert.equal(audited.worldSnapshot.tick, 1200);
});
