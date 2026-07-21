import { describe, expect, it } from 'vitest';

import {
  MAP_DEFINITION_SCHEMA_VERSION,
  MapDefinition,
} from '@number-strategy-jump/arena-definitions';

import {
  ARENA_MAP_EVENT,
  MAP_DOMAIN_EVENT,
  MAP_EVENT_KIND,
  MAP_RULE_COMMAND,
  MAP_RUNTIME_SCHEMA_VERSION,
  MAP_TIMELINE_TRANSITION,
  MAP_OCCURRENCE_PHASE,
  ArenaMapSystem,
  MapEventStrategyRegistry,
  MapRuntime,
  MapTimeline,
  createDefaultMapCommandRegistry,
  createDefaultMapEventStrategyRegistry,
  validateCharacterSpawnSafety,
  validateDefaultMapSafety,
  validateWalkableMapTopology,
  serializeMapRuntimeSnapshot,
  assertArenaMapSystem,
} from '../src/index.js';
import type {
  ArenaMapSnapshot,
} from '@number-strategy-jump/arena-contracts';
import type { MapEventExecutionContext, MapEventStrategy } from '../src/index.js';

function createTestMap(collapseSurfaceIds: readonly string[] = ['wing']): MapDefinition {
  return new MapDefinition({
    schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
    id: 'test-map',
    arena: {
      killY: -5,
      surfaces: [
        {
          id: 'base',
          center: { x: 0, y: -0.5, z: 0 },
          halfExtents: { x: 5, y: 0.5, z: 3 },
        },
        {
          id: 'wing',
          center: { x: 6, y: -0.5, z: 0 },
          halfExtents: { x: 1, y: 0.5, z: 3 },
        },
      ],
      spawns: [{ x: -2, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }],
    },
    equipmentSpawnPoints: [],
    events: [
      {
        id: 'wind',
        kind: MAP_EVENT_KIND.WIND_ZONE,
        schedule: {
          startTick: 5,
          warningLeadTicks: 0,
          durationTicks: 5,
          repeatEveryTicks: 0,
          repeatCount: 1,
        },
        parameters: {},
      },
      {
        id: 'collapse',
        kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
        schedule: {
          startTick: 10,
          warningLeadTicks: 0,
          durationTicks: 0,
          repeatEveryTicks: 0,
          repeatCount: 1,
        },
        parameters: { surfaceIds: collapseSurfaceIds },
      },
    ],
  });
}

describe('arena-map primitives', () => {
  it('orders same-tick end before start with stable occurrence identity', () => {
    const timeline = new MapTimeline(createTestMap());
    expect(timeline.transitionsAt(10).map(({ transition, occurrenceId }) => [
      transition,
      occurrenceId,
    ])).toEqual([
      [MAP_TIMELINE_TRANSITION.WARNING, 'collapse:0'],
      [MAP_TIMELINE_TRANSITION.END, 'wind:0'],
      [MAP_TIMELINE_TRANSITION.START, 'collapse:0'],
    ]);
    expect(timeline.requireOccurrence('collapse:0').startTick).toBe(10);
  });

  it('proves initial and post-collapse walkable topology deterministically', () => {
    expect(validateWalkableMapTopology(createTestMap(), {
      characterRadius: 0.45,
      maximumStepHeight: 0.35,
    })).toEqual({
      initialSurfaceCount: 2,
      permanentSurfaceCount: 1,
      collapseCount: 1,
    });
  });

  it('requires permanent safe surfaces and two collision-safe character spawns', () => {
    const map = createTestMap();
    const permanent = validateDefaultMapSafety(map);
    expect(permanent).toEqual(['base']);
    expect(validateCharacterSpawnSafety(map, {
      characterSpawns: [
        { characterId: 'player-a', collision: { radius: 0.45, halfHeight: 0.55 } },
        { characterId: 'player-b', collision: { radius: 0.45, halfHeight: 0.55 } },
      ],
      permanentSafeSurfaceIds: permanent,
      groundProbeTolerance: 0.035,
    })).toEqual([
      { characterId: 'player-a', spawnIndex: 0, surfaceId: 'base' },
      { characterId: 'player-b', spawnIndex: 1, surfaceId: 'base' },
    ]);
  });

  it('fails closed when the timeline eventually removes every surface', () => {
    const map = createTestMap(['base', 'wing']);
    expect(() => validateDefaultMapSafety(map)).toThrow('不能最终塌陷所有 surface');
    expect(() => validateWalkableMapTopology(map, {
      characterRadius: 0.45,
      maximumStepHeight: 0.35,
    })).toThrow('不能没有可用 surface');
  });

  it('validates and snapshots the complete command batch before any port mutation', () => {
    const registry = createDefaultMapCommandRegistry();
    const metadata = {
      occurrenceId: 'wind:0',
      mapEventId: 'wind',
      mapEventKind: MAP_EVENT_KIND.WIND_ZONE,
      phase: 'tick',
    } as const;
    let calls = 0;
    const commands: Array<Record<string, unknown>> = [
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
        surfaceId: 'wing',
      },
    ];
    expect(() => registry.execute(commands, {
      ports: {
        applyImpulse() {
          calls += 1;
          commands[1]!.enabled = true;
        },
        setSurfaceEnabled() {},
        spawnEquipment() {},
      },
    })).toThrow('enabled 必须是布尔值');
    expect(calls).toBe(0);
    let getterCalls = 0;
    const accessorCommand = Object.defineProperty({}, 'kind', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return MAP_RULE_COMMAND.APPLY_IMPULSE;
      },
    });
    expect(() => registry.assertSupported([accessorCommand])).toThrow(
      'kind 必须是可枚举数据字段',
    );
    expect(getterCalls).toBe(0);
  });

  it('keeps authoritative occurrence data ahead of caller context', () => {
    let observedId = '';
    const strategy: MapEventStrategy = {
      kind: MAP_EVENT_KIND.WIND_ZONE,
      validate() {},
      plan({ occurrence }) {
        observedId = occurrence.occurrenceId;
        return { privatePlan: {}, publicPayload: {} };
      },
      start() { return { commands: [], events: [] }; },
      tick() { return { commands: [], events: [] }; },
      end() { return { commands: [], events: [] }; },
    };
    const map = createTestMap();
    const occurrence = new MapTimeline(map).requireOccurrence('wind:0');
    const registry = new MapEventStrategyRegistry([strategy]);
    const context = createExecutionContext(map, {
      occurrence: { ...occurrence, occurrenceId: 'spoofed:0' },
    });
    registry.plan(occurrence, context);
    expect(observedId).toBe('wind:0');
    let getterCalls = 0;
    const accessorContext = Object.defineProperty({}, 'seed', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 7;
      },
    });
    expect(() => registry.plan(
      occurrence,
      accessorContext as Omit<MapEventExecutionContext, 'occurrence'>
        & Readonly<Record<string, unknown>>,
    )).toThrow('seed 必须是可枚举数据字段');
    expect(getterCalls).toBe(0);
  });

  it('plans equipment waves deterministically without exposing identity at warning time', () => {
    const map = createStrategyMap();
    const registry = createDefaultMapEventStrategyRegistry();
    registry.validateMapDefinition(map, {
      equipmentRegistry: { require: (id: string) => ({ id }) },
    });
    const occurrence = new MapTimeline(map).requireOccurrence('wave:0');
    const first = registry.plan(occurrence, createExecutionContext(map, { seed: 1234 }));
    const second = registry.plan(occurrence, createExecutionContext(map, { seed: 1234 }));
    expect(first).toEqual(second);
    expect(first.publicPayload).toEqual({
      spawnPoints: [{
        spawnPointId: expect.any(String),
        surfaceId: 'base',
        position: expect.any(Object),
      }],
    });
    expect(JSON.stringify(first.publicPayload)).not.toContain('hammer');
    expect(JSON.stringify(first.publicPayload)).not.toContain('shield');
    const released = registry.start(occurrence, createExecutionContext(map, {
      privatePlan: first.privatePlan,
    }));
    expect(released.commands[0]).toMatchObject({
      kind: MAP_RULE_COMMAND.SPAWN_EQUIPMENT,
      instanceId: 'map:wave:0:0',
    });
    expect(released.events[0]).toMatchObject({
      type: MAP_DOMAIN_EVENT.EQUIPMENT_WAVE_RELEASED,
    });
  });

  it('emits only declarative wind and collapse commands', () => {
    const map = createStrategyMap();
    const registry = createDefaultMapEventStrategyRegistry();
    const timeline = new MapTimeline(map);
    const wind = timeline.requireOccurrence('wind:0');
    const windPlan = registry.plan(wind, createExecutionContext(map));
    const windTick = registry.tick(wind, createExecutionContext(map, {
      privatePlan: windPlan.privatePlan,
      actors: [{ id: 'player-1', eligible: true, position: { x: 0, y: 1, z: 0 } }],
    }));
    expect(windTick).toEqual({
      commands: [{
        kind: MAP_RULE_COMMAND.APPLY_IMPULSE,
        participantId: 'player-1',
        impulse: { x: 0.1, y: 0, z: 0 },
      }],
      events: [],
    });
    const collapse = timeline.requireOccurrence('collapse:0');
    const collapsePlan = registry.plan(collapse, createExecutionContext(map));
    const collapseStart = registry.start(collapse, createExecutionContext(map, {
      privatePlan: collapsePlan.privatePlan,
    }));
    expect(collapseStart).toEqual({
      commands: [{
        kind: MAP_RULE_COMMAND.SET_SURFACE_ENABLED,
        surfaceId: 'wing',
        enabled: false,
      }],
      events: [{ type: MAP_DOMAIN_EVENT.SURFACE_COLLAPSED, surfaceId: 'wing' }],
    });
  });

  it('keeps warn atomic and owns explicit occurrence, surface, tick and destroy lifecycles', () => {
    const map = createStrategyMap();
    const runtime = new MapRuntime({
      mapDefinition: map,
      occurrences: new MapTimeline(map).listOccurrences(),
    });
    let getterCalls = 0;
    const invalidPayload = Object.defineProperty({}, 'danger', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return true;
      },
    });
    expect(() => runtime.warn('wind:0', {
      privatePlan: { region: 'validated-first' },
      publicPayload: invalidPayload,
    })).toThrow('必须是可枚举数据字段');
    expect(getterCalls).toBe(0);
    expect(() => runtime.getPrivatePlan('wind:0')).toThrow('尚未建立预告计划');
    const sourcePlan = { region: { x: 1 } };
    runtime.warn('wind:0', { privatePlan: sourcePlan, publicPayload: { direction: 'east' } });
    sourcePlan.region.x = 99;
    expect(runtime.getPrivatePlan('wind:0')).toEqual({ region: { x: 1 } });
    expect(runtime.getSnapshot().occurrences[0]).not.toHaveProperty('privatePlan');
    expect(runtime.getSnapshot({ includeInternal: true }).occurrences[0]).toHaveProperty(
      'privatePlan',
    );
    runtime.start('wind:0');
    expect(runtime.listActiveOccurrenceIds()).toEqual(['wind:0']);
    runtime.end('wind:0');
    expect(runtime.listActiveOccurrenceIds()).toEqual([]);
    const changed = runtime.setSurfaceEnabled('wing', false);
    const unchanged = runtime.setSurfaceEnabled('wing', false);
    expect(unchanged.revision).toBe(changed.revision);
    expect(runtime.isSurfaceEnabled('wing')).toBe(false);
    expect(() => runtime.completeTick(1)).toThrow('期望 activeTick 0');
    runtime.completeTick(0);
    expect(runtime.getSnapshot().nextActiveTick).toBe(1);
    runtime.destroy();
    runtime.destroy();
    expect(() => runtime.getSnapshot()).toThrow('已销毁');
  });

  it('normalizes runtime snapshots and rejects phase, revision, privacy and option drift', () => {
    const snapshot = {
      schemaVersion: MAP_RUNTIME_SCHEMA_VERSION,
      definitionId: 'snapshot-map',
      nextActiveTick: 2,
      revision: 3,
      surfaces: [{ id: 'z', enabled: true, revision: 1 }, { id: 'a', enabled: false, revision: 2 }],
      occurrences: [{
        occurrenceId: 'wind:0',
        eventId: 'wind',
        kind: MAP_EVENT_KIND.WIND_ZONE,
        warningTick: 1,
        startTick: 2,
        endTick: 4,
        phase: MAP_OCCURRENCE_PHASE.WARNING,
        publicPayload: { direction: 'east' },
        revision: 1,
      }],
    };
    const normalized = serializeMapRuntimeSnapshot(snapshot);
    expect(normalized.surfaces.map(({ id }) => id)).toEqual(['a', 'z']);
    expect(Object.isFrozen(normalized.occurrences[0]!.publicPayload)).toBe(true);
    expect(() => serializeMapRuntimeSnapshot({
      ...snapshot,
      occurrences: [{ ...snapshot.occurrences[0]!, phase: MAP_OCCURRENCE_PHASE.COMPLETED }],
    })).toThrow('completed occurrence 不能包含 endTick');
    expect(() => serializeMapRuntimeSnapshot({
      ...snapshot,
      surfaces: [{ id: 'a', enabled: true, revision: 4 }],
    })).toThrow('不能超过 MapRuntime snapshot.revision');
    expect(() => serializeMapRuntimeSnapshot({
      ...snapshot,
      occurrences: [{ ...snapshot.occurrences[0]!, privatePlan: {} }],
    })).toThrow('不支持字段 privatePlan');
    let getterCalls = 0;
    const invalidOptions = Object.defineProperty({}, 'includeInternal', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return true;
      },
    });
    expect(() => serializeMapRuntimeSnapshot(snapshot, invalidOptions as never)).toThrow(
      '必须是可枚举数据字段',
    );
    expect(getterCalls).toBe(0);
  });

  it('runs map authority through an identity-bound two-phase batch', () => {
    const system = createMapSystem();
    const recorded: Array<Readonly<Record<string, unknown>>> = [];
    const ports = {
      applyImpulse(participantId: string) { recorded.push({ kind: 'impulse', participantId }); },
      setSurfaceEnabled(surfaceId: string, enabled: boolean) {
        recorded.push({ kind: 'surface', surfaceId, enabled });
      },
      spawnEquipment(spawn: Readonly<Record<string, unknown>>) {
        recorded.push({ kind: 'spawn', ...spawn });
      },
    };
    const zero = system.advance({ activeTick: 0, actors: strategyActors() });
    expect(() => system.advance({ activeTick: 1, actors: strategyActors() })).toThrow(
      '尚未 commit',
    );
    expect(() => system.commit({ ...zero }, ports)).toThrow('原始批次');
    system.commit(zero, ports);
    const one = system.advance({ activeTick: 1, actors: strategyActors() });
    system.commit(one, ports);
    const two = system.advance({ activeTick: 2, actors: strategyActors() });
    expect(two.events.map(({ type }) => type)).toEqual([
      ARENA_MAP_EVENT.EVENT_WARNED,
      MAP_DOMAIN_EVENT.EQUIPMENT_WAVE_RELEASED,
      ARENA_MAP_EVENT.EVENT_STARTED,
    ]);
    system.commit(two, ports);
    expect(recorded).toContainEqual(expect.objectContaining({ kind: 'spawn' }));
    expect(system.getSnapshot().nextActiveTick).toBe(3);
    system.destroy();
    expect(() => system.getSnapshot()).toThrow('已销毁');
  });

  it('allows commit validation retry but fails closed after a mutation port throws', () => {
    const system = createMapSystem();
    const zero = system.advance({ activeTick: 0, actors: strategyActors() });
    expect(() => system.commit(zero, { applyImpulse() {} })).toThrow('缺少 setSurfaceEnabled');
    system.commit(zero, emptyMapPorts());
    for (let tick = 1; tick < 2; tick += 1) {
      const batch = system.advance({ activeTick: tick, actors: strategyActors() });
      system.commit(batch, emptyMapPorts());
    }
    const wave = system.advance({ activeTick: 2, actors: strategyActors() });
    expect(() => system.commit(wave, {
      ...emptyMapPorts(),
      spawnEquipment() { throw new Error('spawn failed'); },
    })).toThrow('spawn failed');
    expect(() => system.getSnapshot()).toThrow('已失败');
    expect(() => system.advance({ activeTick: 3, actors: strategyActors() })).toThrow('已失败');
    system.destroy();
  });

  it('snapshots mutation ports, permits commit reads and rejects commit mutation reentry', () => {
    const system = createMapSystem();
    for (let tick = 0; tick < 3; tick += 1) {
      const batch = system.advance({ activeTick: tick, actors: strategyActors() });
      system.commit(batch, emptyMapPorts());
    }
    const wind = system.advance({ activeTick: 3, actors: strategyActors() });
    let originalCalls = 0;
    let replacedCalls = 0;
    const ports = {
      ...emptyMapPorts(),
      applyImpulse() {
        originalCalls += 1;
        expect(system.getSnapshot().nextActiveTick).toBe(4);
        expect(() => system.advance({ activeTick: 4, actors: strategyActors() })).toThrow(
          '不可重入',
        );
        ports.applyImpulse = () => { replacedCalls += 1; };
      },
    };
    system.commit(wind, ports);
    expect(originalCalls).toBe(2);
    expect(replacedCalls).toBe(0);
    let positionGetterCalls = 0;
    const position = Object.defineProperty({ z: 0 }, 'x', {
      enumerable: true,
      get() {
        positionGetterCalls += 1;
        return 0;
      },
    });
    expect(system.isPositionOnEnabledSurface(position)).toBe(false);
    expect(positionGetterCalls).toBe(0);
    system.destroy();

    let methodGetterCalls = 0;
    const invalidSystem = Object.defineProperty({}, 'advance', {
      get() {
        methodGetterCalls += 1;
        return () => {};
      },
    });
    expect(() => assertArenaMapSystem(invalidSystem)).toThrow('数据方法');
    expect(methodGetterCalls).toBe(0);
  });
});

function createStrategyMap(): MapDefinition {
  return new MapDefinition({
    schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
    id: 'strategy-map',
    arena: {
      killY: -5,
      surfaces: [
        {
          id: 'base',
          center: { x: 0, y: -0.5, z: 0 },
          halfExtents: { x: 5, y: 0.5, z: 3 },
        },
        {
          id: 'wing',
          center: { x: 6, y: -0.5, z: 0 },
          halfExtents: { x: 1, y: 0.5, z: 3 },
        },
      ],
      spawns: [{ x: -2, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }],
    },
    equipmentSpawnPoints: [
      { id: 'drop-a', surfaceId: 'base', position: { x: -1, y: 1, z: 0 } },
      { id: 'drop-b', surfaceId: 'base', position: { x: 1, y: 1, z: 0 } },
    ],
    events: [
      {
        id: 'wave',
        kind: MAP_EVENT_KIND.EQUIPMENT_WAVE,
        schedule: {
          startTick: 2,
          warningLeadTicks: 1,
          durationTicks: 0,
          repeatEveryTicks: 0,
          repeatCount: 1,
        },
        parameters: {
          spawnPointIds: ['drop-a', 'drop-b'],
          equipmentDefinitionIds: ['hammer', 'shield'],
          count: 1,
        },
      },
      {
        id: 'wind',
        kind: MAP_EVENT_KIND.WIND_ZONE,
        schedule: {
          startTick: 3,
          warningLeadTicks: 1,
          durationTicks: 2,
          repeatEveryTicks: 0,
          repeatCount: 1,
        },
        parameters: {
          region: {
            center: { x: 0, y: 1, z: 0 },
            halfExtents: { x: 2, y: 2, z: 2 },
          },
          impulsePerTick: { x: 0.1, y: 0, z: 0 },
        },
      },
      {
        id: 'collapse',
        kind: MAP_EVENT_KIND.COLLAPSE_SURFACES,
        schedule: {
          startTick: 5,
          warningLeadTicks: 1,
          durationTicks: 0,
          repeatEveryTicks: 0,
          repeatCount: 1,
        },
        parameters: { surfaceIds: ['wing'] },
      },
    ],
  });
}

function createExecutionContext(
  mapDefinition: MapDefinition,
  overrides: Readonly<Record<string, unknown>> = {},
): Omit<MapEventExecutionContext, 'occurrence'> & Readonly<Record<string, unknown>> {
  const mapSnapshot: ArenaMapSnapshot = Object.freeze({
    schemaVersion: 1,
    definitionId: mapDefinition.id,
    nextActiveTick: 0,
    revision: 0,
    surfaces: Object.freeze(mapDefinition.arena.surfaces.map(({ id }) => Object.freeze({
      id,
      enabled: true,
      revision: 0,
    }))),
    occurrences: Object.freeze([]),
  });
  return Object.freeze({
    mapDefinition,
    mapSnapshot,
    actors: Object.freeze([]),
    seed: 7,
    ...overrides,
  }) as Omit<MapEventExecutionContext, 'occurrence'> & Readonly<Record<string, unknown>>;
}

function createMapSystem(): ArenaMapSystem {
  const mapDefinition = createStrategyMap();
  return new ArenaMapSystem({
    mapDefinition,
    strategyRegistry: createDefaultMapEventStrategyRegistry(),
    commandRegistry: createDefaultMapCommandRegistry(),
    matchSeed: 17,
    rulesetVersion: 'arena-map-test-v1',
    validationContext: {
      equipmentRegistry: { require: (id: string) => ({ id }) },
    },
  });
}

function strategyActors() {
  return [
    { id: 'player-2', eligible: true, position: { x: 1, y: 1, z: 0 } },
    { id: 'player-1', eligible: true, position: { x: -1, y: 1, z: 0 } },
  ];
}

function emptyMapPorts() {
  return {
    applyImpulse() {},
    setSurfaceEnabled() {},
    spawnEquipment() {},
  };
}
