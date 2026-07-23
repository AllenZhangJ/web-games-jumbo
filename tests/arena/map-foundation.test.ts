import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage4ContentRegistries } from '@number-strategy-jump/arena-v1-content';
import {
  MAP_DOMAIN_EVENT,
  ARENA_MAP_EVENT,
  ArenaMapSystem,
  MAP_EVENT_KIND,
  MAP_RULE_COMMAND,
  serializeMapRuntimeSnapshot,
  MapEventStrategyRegistry,
  MapTimeline,
  createDefaultMapEventStrategyRegistry,
  createDefaultMapCommandRegistry,
  MAP_TIMELINE_TRANSITION,
  validateDefaultMapSafety,
  validateWalkableMapTopology,
  type MapMutationPorts,
  type MapOccurrence,
} from '@number-strategy-jump/arena-map';
import {
  MAP_DEFINITION_SCHEMA_VERSION,
  createMapDefinition,
  type MapScheduleDefinition,
} from '@number-strategy-jump/arena-definitions';
import { MapRegistry } from '@number-strategy-jump/arena-definitions';
import {
  createArenaV1MatchConfig,
  resolveArenaV1MapDefinition,
} from '@number-strategy-jump/arena-v1-composition';

const TEST_ARENA = Object.freeze({
  killY: -4,
  surfaces: Object.freeze([
    Object.freeze({
      id: 'left',
      center: Object.freeze({ x: -1, y: -0.5, z: 0 }),
      halfExtents: Object.freeze({ x: 1, y: 0.5, z: 2 }),
    }),
    Object.freeze({
      id: 'right',
      center: Object.freeze({ x: 1, y: -0.5, z: 0 }),
      halfExtents: Object.freeze({ x: 1, y: 0.5, z: 2 }),
    }),
  ]),
  spawns: Object.freeze([
    Object.freeze({ x: 0.5, y: 1, z: -0.5 }),
    Object.freeze({ x: 0.5, y: 1, z: 0.5 }),
  ]),
});

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Readonly<Record<string, unknown>>;
}

function event(id: string, kind: string, schedule: MapScheduleDefinition, parameters: unknown) {
  return { id, kind, schedule, parameters };
}

function oneShot(
  startTick: number,
  warningLeadTicks: number,
  durationTicks = 0,
): MapScheduleDefinition {
  return { startTick, warningLeadTicks, durationTicks, repeatEveryTicks: 0, repeatCount: 1 };
}

function createTestDefinition() {
  return createMapDefinition({
    schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
    id: 'map-test',
    arena: TEST_ARENA,
    equipmentSpawnPoints: [{
      id: 'center-drop',
      surfaceId: 'right',
      position: { x: 1, y: 1, z: 0 },
    }],
    events: [
      event('wave', MAP_EVENT_KIND.EQUIPMENT_WAVE, oneShot(1, 1), {
        spawnPointIds: ['center-drop'],
        equipmentDefinitionIds: ['hammer'],
        count: 1,
      }),
      event('wind', MAP_EVENT_KIND.WIND_ZONE, oneShot(2, 1, 2), {
        region: { center: { x: 0, y: 1, z: 0 }, halfExtents: { x: 3, y: 2, z: 3 } },
        impulsePerTick: { x: 0.1, y: 0, z: 0 },
      }),
      event('collapse', MAP_EVENT_KIND.COLLAPSE_SURFACES, oneShot(4, 1), {
        surfaceIds: ['left'],
      }),
    ],
  });
}

function createSystem(matchSeed = 7, rulesetVersion = 'test-map-ruleset-v1') {
  const definition = createTestDefinition();
  const { equipmentRegistry } = createStage4ContentRegistries();
  return new ArenaMapSystem({
    mapDefinition: definition,
    strategyRegistry: createDefaultMapEventStrategyRegistry(),
    commandRegistry: createDefaultMapCommandRegistry(),
    matchSeed,
    rulesetVersion,
    validationContext: { equipmentRegistry },
  });
}

const EMPTY_PORTS = Object.freeze({
  applyImpulse() {},
  setSurfaceEnabled() {},
  spawnEquipment() {},
});

function actors() {
  return [
    { id: 'player-1', position: { x: -1, y: 1, z: 0 }, eligible: true },
    { id: 'player-2', position: { x: 1, y: 1, z: 0 }, eligible: true },
  ];
}

test('MapDefinition and MapRegistry deeply freeze data and reject schema drift', () => {
  const definition = createTestDefinition();
  const registry = new MapRegistry([definition]);
  assert.equal(registry.require('map-test'), definition);
  assert.ok(Object.isFrozen(definition));
  const firstEvent = required(definition.events[0], 'first event');
  assert.ok(Object.isFrozen(firstEvent.parameters));
  assert.throws(() => { Object.assign(firstEvent.parameters as object, { count: 9 }); }, TypeError);
  assert.throws(() => new MapRegistry([definition, definition]), /重复 MapDefinition/);
  assert.throws(() => createMapDefinition({
    ...definition.toJSON(),
    events: [{
      ...firstEvent,
      schedule: { ...firstEvent.schedule, repeatCount: 2 },
    }],
  }), /repeatEveryTicks\/repeatCount/);
  assert.throws(() => createMapDefinition({
    ...definition.toJSON(),
    equipmentSpawnPoints: [{
      id: 'bad',
      surfaceId: 'missing',
      position: { x: 0, y: 1, z: 0 },
    }],
  }), /未知 surface/);
});

test('Arena V1 map composition resolves registered definitions without hard-coded map IDs', () => {
  const definition = createTestDefinition();
  const registry = new MapRegistry([definition]);
  assert.equal(resolveArenaV1MapDefinition(createArenaV1MatchConfig({
    mapDefinitionId: definition.id,
    arena: definition.arena,
  }), registry), definition);
  assert.throws(() => resolveArenaV1MapDefinition(createArenaV1MatchConfig({
    mapDefinitionId: definition.id,
    arena: {
      ...definition.arena,
      killY: definition.arena.killY - 1,
    },
  }), registry), /与 config\.arena 不一致/);
});

test('MapTimeline orders warning, end and start deterministically', () => {
  const timeline = new MapTimeline(createTestDefinition());
  assert.deepEqual(timeline.transitionsAt(1).map(({ transition, occurrenceId }) => [
    transition,
    occurrenceId,
  ]), [
    [MAP_TIMELINE_TRANSITION.WARNING, 'wind:0'],
    [MAP_TIMELINE_TRANSITION.START, 'wave:0'],
  ]);
  assert.deepEqual(timeline.transitionsAt(4).map(({ transition, occurrenceId }) => [
    transition,
    occurrenceId,
  ]), [
    [MAP_TIMELINE_TRANSITION.END, 'wind:0'],
    [MAP_TIMELINE_TRANSITION.START, 'collapse:0'],
  ]);
});

test('ArenaMapSystem advances warning, wind, equipment and collapse through explicit ports', () => {
  const system = createSystem();
  const recorded: {
    impulses: Parameters<MapMutationPorts['applyImpulse']>[];
    surfaces: Parameters<MapMutationPorts['setSurfaceEnabled']>[];
    equipment: Parameters<MapMutationPorts['spawnEquipment']>[0][];
  } = { impulses: [], surfaces: [], equipment: [] };
  const ports: MapMutationPorts = {
    applyImpulse: (...args) => { recorded.impulses.push(args); },
    setSurfaceEnabled: (...args) => { recorded.surfaces.push(args); },
    spawnEquipment: (spawn) => { recorded.equipment.push(spawn); },
  };

  const zero = system.advance({ activeTick: 0, actors: actors() });
  assert.deepEqual(zero.events.map(({ type }) => type), [ARENA_MAP_EVENT.EVENT_WARNED]);
  system.commit(zero, ports);

  const one = system.advance({ activeTick: 1, actors: actors() });
  system.commit(one, ports);
  assert.deepEqual(one.events.map(({ type }) => type), [
    ARENA_MAP_EVENT.EVENT_WARNED,
    MAP_DOMAIN_EVENT.EQUIPMENT_WAVE_RELEASED,
    ARENA_MAP_EVENT.EVENT_STARTED,
  ]);
  assert.equal(recorded.equipment.length, 1);
  assert.equal(required(recorded.equipment[0], 'spawned equipment').definitionId, 'hammer');

  const two = system.advance({ activeTick: 2, actors: actors() });
  system.commit(two, ports);
  assert.equal(recorded.impulses.length, 2);
  assert.equal(required(two.events[0], 'tick 2 event').type, ARENA_MAP_EVENT.EVENT_STARTED);

  const three = system.advance({ activeTick: 3, actors: actors() });
  system.commit(three, ports);
  assert.equal(recorded.impulses.length, 4);
  assert.equal(required(three.events[0], 'tick 3 event').type, ARENA_MAP_EVENT.EVENT_WARNED);

  const four = system.advance({ activeTick: 4, actors: actors() });
  system.commit(four, ports);
  assert.deepEqual(recorded.surfaces, [['left', false]]);
  assert.deepEqual(four.events.map(({ type }) => type), [
    ARENA_MAP_EVENT.EVENT_ENDED,
    MAP_DOMAIN_EVENT.SURFACE_COLLAPSED,
    ARENA_MAP_EVENT.EVENT_STARTED,
  ]);
  assert.equal(system.isSurfaceEnabled('left'), false);
  assert.equal(system.isSurfaceEnabled('right'), true);
  assert.equal(system.getSnapshot().nextActiveTick, 5);
  system.destroy();
  assert.throws(() => system.getSnapshot(), /已销毁/);
});

test('ArenaMapSystem rejects gaps and fails closed after a mutation port failure', () => {
  const system = createSystem();
  assert.throws(() => system.advance({ activeTick: 1, actors: actors() }), /期望 activeTick 0/);
  const zero = system.advance({ activeTick: 0, actors: actors() });
  system.commit(zero, {
    applyImpulse() {},
    setSurfaceEnabled() {},
    spawnEquipment() {},
  });
  const one = system.advance({ activeTick: 1, actors: actors() });
  assert.throws(() => system.commit(one, {
    applyImpulse() {},
    setSurfaceEnabled() {},
    spawnEquipment() { throw new Error('spawn port failed'); },
  }), /spawn port failed/);
  assert.throws(() => system.advance({ activeTick: 2, actors: actors() }), /已失败/);
  system.destroy();
});

test('ArenaMapSystem requires exactly-once in-order commit of its original batch', () => {
  const system = createSystem();
  const zero = system.advance({ activeTick: 0, actors: actors() });
  assert.throws(
    () => system.advance({ activeTick: 1, actors: actors() }),
    /尚未 commit/,
  );
  assert.throws(() => system.commit({ ...zero }, EMPTY_PORTS), /原始批次/);
  system.commit(zero, EMPTY_PORTS);
  assert.throws(() => system.commit(zero, EMPTY_PORTS), /没有待提交/);
  const one = system.advance({ activeTick: 1, actors: actors() });
  system.commit(one, EMPTY_PORTS);
  system.destroy();
});

test('map content hash includes the explicit ruleset compatibility version', () => {
  const first = createSystem(7, 'test-map-ruleset-v1');
  const same = createSystem(99, 'test-map-ruleset-v1');
  const changed = createSystem(7, 'test-map-ruleset-v2');
  assert.equal(first.getContentHash(), same.getContentHash());
  assert.notEqual(first.getContentHash(), changed.getContentHash());
  first.destroy();
  same.destroy();
  changed.destroy();
});

test('MapCommandRegistry validates the complete batch before invoking any mutation port', () => {
  const registry = createDefaultMapCommandRegistry();
  const metadata = {
    occurrenceId: 'test:0',
    mapEventId: 'test',
    mapEventKind: 'test-kind',
    phase: 'start',
  };
  let impulseCalls = 0;
  assert.throws(() => registry.execute([
    {
      ...metadata,
      sequence: 0,
      kind: MAP_RULE_COMMAND.APPLY_IMPULSE,
      participantId: 'player-1',
      impulse: { x: 1, y: 0, z: 0 },
    },
    {
      ...metadata,
      sequence: 1,
      kind: MAP_RULE_COMMAND.SET_SURFACE_ENABLED,
      surfaceId: 'left',
    },
  ], {
    ports: {
      applyImpulse() { impulseCalls += 1; },
      setSurfaceEnabled() {},
      spawnEquipment() {},
    },
  }), /enabled 必须是布尔值/);
  assert.equal(impulseCalls, 0);
});

test('end-phase surface commands update Runtime and mutation ports consistently', () => {
  const definition = createMapDefinition({
    schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
    id: 'temporary-surface-map',
    arena: TEST_ARENA,
    equipmentSpawnPoints: [],
    events: [event('temporary-disable', 'temporary-surface', oneShot(1, 0, 1), {
      surfaceId: 'left',
    })],
  });
  const strategyRegistry = new MapEventStrategyRegistry([{
    kind: 'temporary-surface',
    validate() {},
    plan({ occurrence }) {
      const parameters = record(occurrence.event.parameters, 'temporary surface parameters');
      return {
        privatePlan: { surfaceId: parameters.surfaceId },
        publicPayload: { surfaceId: parameters.surfaceId },
      };
    },
    start({ privatePlan }) {
      const plan = record(privatePlan, 'temporary surface private plan');
      return {
        commands: [{
          kind: MAP_RULE_COMMAND.SET_SURFACE_ENABLED,
          surfaceId: plan.surfaceId,
          enabled: false,
        }],
        events: [],
      };
    },
    tick() { return { commands: [], events: [] }; },
    end({ privatePlan }) {
      const plan = record(privatePlan, 'temporary surface private plan');
      return {
        commands: [{
          kind: MAP_RULE_COMMAND.SET_SURFACE_ENABLED,
          surfaceId: plan.surfaceId,
          enabled: true,
        }],
        events: [],
      };
    },
  }]);
  const system = new ArenaMapSystem({
    mapDefinition: definition,
    strategyRegistry,
    commandRegistry: createDefaultMapCommandRegistry(),
    matchSeed: 8,
    rulesetVersion: 'test-map-ruleset-v1',
  });
  const surfaceMutations: Parameters<MapMutationPorts['setSurfaceEnabled']>[] = [];
  const ports: MapMutationPorts = {
    ...EMPTY_PORTS,
    setSurfaceEnabled: (...args) => { surfaceMutations.push(args); },
  };
  const zero = system.advance({ activeTick: 0, actors: actors() });
  system.commit(zero, ports);
  const one = system.advance({ activeTick: 1, actors: actors() });
  assert.equal(system.isSurfaceEnabled('left'), false);
  system.commit(one, ports);
  const two = system.advance({ activeTick: 2, actors: actors() });
  assert.equal(system.isSurfaceEnabled('left'), true);
  system.commit(two, ports);
  assert.deepEqual(surfaceMutations, [['left', false], ['left', true]]);
  system.destroy();
});

test('MapEventStrategyRegistry does not allow context to replace authoritative occurrence data', () => {
  let observedOccurrence: MapOccurrence | null = null;
  const registry = new MapEventStrategyRegistry([{
    kind: 'context-test',
    validate() {},
    plan({ occurrence }) {
      observedOccurrence = occurrence;
      return { privatePlan: {}, publicPayload: {} };
    },
    start() { return { commands: [], events: [] }; },
    tick() { return { commands: [], events: [] }; },
    end() { return { commands: [], events: [] }; },
  }]);
  const eventDefinition = required(createTestDefinition().events[0], 'first event');
  const occurrence: MapOccurrence = Object.freeze({
    kind: 'context-test',
    occurrenceId: 'real:0',
    occurrenceIndex: 0,
    eventId: eventDefinition.id,
    warningTick: 0,
    startTick: 1,
    endTick: null,
    event: eventDefinition,
  });
  registry.plan(occurrence, {
    occurrence: Object.freeze({ kind: 'context-test', occurrenceId: 'spoofed:0' }),
  });
  assert.equal(observedOccurrence, occurrence);
});

test('default map safety keeps a permanent surface and equipment point', () => {
  assert.deepEqual(validateDefaultMapSafety(createTestDefinition()), ['right']);
  assert.deepEqual(validateWalkableMapTopology(createTestDefinition(), {
    characterRadius: 0.45,
    maximumStepHeight: 0.35,
  }), {
    initialSurfaceCount: 2,
    permanentSurfaceCount: 1,
    collapseCount: 1,
  });
  const unsafe = createMapDefinition({
    ...createTestDefinition().toJSON(),
    events: [
      event('all-collapse', MAP_EVENT_KIND.COLLAPSE_SURFACES, oneShot(1, 0), {
        surfaceIds: ['left', 'right'],
      }),
    ],
  });
  assert.throws(() => validateDefaultMapSafety(unsafe), /所有 surface/);
  const definition = createTestDefinition();
  assert.throws(() => validateDefaultMapSafety(createMapDefinition({
    ...definition.toJSON(),
    arena: {
      ...definition.arena,
      spawns: [definition.arena.spawns[0], definition.arena.spawns[0]],
    },
  })), /两个永久安全的重生点/);
  assert.throws(() => validateDefaultMapSafety(createMapDefinition({
    ...definition.toJSON(),
    arena: {
      ...definition.arena,
      spawns: [
        { x: -1.5, y: 1, z: -0.5 },
        { x: -1.5, y: 1, z: 0.5 },
      ],
    },
    equipmentSpawnPoints: [
      ...definition.equipmentSpawnPoints,
      { id: 'safe-drop', surfaceId: 'left', position: { x: -1, y: 1, z: 0 } },
    ],
    events: [
      event('late-wave', MAP_EVENT_KIND.EQUIPMENT_WAVE, oneShot(5, 1), {
        spawnPointIds: ['center-drop'],
        equipmentDefinitionIds: ['hammer'],
        count: 1,
      }),
      event('collapse-right', MAP_EVENT_KIND.COLLAPSE_SURFACES, oneShot(4, 1), {
        surfaceIds: ['right'],
      }),
    ],
  })), /没有足够的可用装备点/);
});

test('MapRuntime serializer freezes schema data and prevents private plans leaking publicly', () => {
  const system = createSystem();
  const zero = system.advance({ activeTick: 0, actors: actors() });
  system.commit(zero, {
    applyImpulse() {},
    setSurfaceEnabled() {},
    spawnEquipment() {},
  });
  const publicSnapshot = system.getSnapshot();
  const internalSnapshot = system.getStateSnapshot();
  assert.deepEqual(serializeMapRuntimeSnapshot(publicSnapshot), publicSnapshot);
  assert.deepEqual(
    serializeMapRuntimeSnapshot(internalSnapshot, { includeInternal: true }),
    internalSnapshot,
  );
  assert.equal(Object.isFrozen(
    required(publicSnapshot.occurrences[0], 'first occurrence').publicPayload,
  ), true);
  assert.throws(() => serializeMapRuntimeSnapshot(internalSnapshot), /privatePlan/);
  assert.throws(() => serializeMapRuntimeSnapshot({
    ...publicSnapshot,
    surfaces: [...publicSnapshot.surfaces, publicSnapshot.surfaces[0]],
  }), /重复 map runtime surface/);
  assert.throws(() => serializeMapRuntimeSnapshot(publicSnapshot, {
    includeInternal: 'yes',
  } as unknown as { readonly includeInternal: boolean }), /includeInternal 必须是布尔值/);
  system.destroy();
});
