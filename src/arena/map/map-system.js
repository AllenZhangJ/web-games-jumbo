import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { deriveSeed } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  MAP_RULE_COMMAND,
  MAP_TIMELINE_TRANSITION,
  MapRuntime,
  MapTimeline,
} from '@number-strategy-jump/arena-map';

export const ARENA_MAP_EVENT = Object.freeze({
  EVENT_WARNED: 'MapEventWarned',
  EVENT_STARTED: 'MapEventStarted',
  EVENT_ENDED: 'MapEventEnded',
});

const ADVANCE_KEYS = new Set(['activeTick', 'actors']);
const ACTOR_KEYS = new Set(['id', 'position', 'eligible']);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const COMMIT_PORT_KEYS = new Set(['applyImpulse', 'setSurfaceEnabled', 'spawnEquipment']);
const REQUIRED_MAP_SYSTEM_METHODS = Object.freeze([
  'advance',
  'commit',
  'getSnapshot',
  'getStateSnapshot',
  'getContentHash',
  'isSurfaceEnabled',
  'isPositionOnEnabledSurface',
  'destroy',
]);

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cloneActors(values) {
  if (!Array.isArray(values)) throw new TypeError('MapSystem actors 必须是数组。');
  const ids = new Set();
  const actors = values.map((actor, index) => {
    const name = `MapSystem actors[${index}]`;
    assertKnownKeys(actor, ACTOR_KEYS, name);
    const id = assertNonEmptyString(actor.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复 map actor ${id}。`);
    ids.add(id);
    if (typeof actor.eligible !== 'boolean') throw new TypeError(`${name}.eligible 必须是布尔值。`);
    assertKnownKeys(actor.position, POSITION_KEYS, `${name}.position`);
    const position = {};
    for (const axis of POSITION_KEYS) {
      if (!Number.isFinite(actor.position[axis])) {
        throw new TypeError(`${name}.position.${axis} 必须是有限数。`);
      }
      position[axis] = actor.position[axis];
    }
    return Object.freeze({ id, eligible: actor.eligible, position: Object.freeze(position) });
  });
  return Object.freeze(actors.sort((left, right) => compareText(left.id, right.id)));
}

function enrichCommands(commands, occurrence, phase, sequenceOffset) {
  return commands.map((command, index) => cloneFrozenData({
    ...command,
    occurrenceId: occurrence.occurrenceId,
    mapEventId: occurrence.eventId,
    mapEventKind: occurrence.kind,
    phase,
    sequence: sequenceOffset + index,
  }, 'MapRuleCommand'));
}

function enrichEvents(events, occurrence) {
  return events.map((event, index) => {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new TypeError(`MapDomainEvent[${index}] 必须是对象。`);
    }
    assertNonEmptyString(event.type, `MapDomainEvent[${index}].type`);
    return cloneFrozenData({
      ...event,
      occurrenceId: occurrence.occurrenceId,
      mapEventId: occurrence.eventId,
      mapEventKind: occurrence.kind,
    }, 'MapDomainEvent');
  });
}

export function assertArenaMapSystem(system) {
  if (!system || typeof system !== 'object') throw new TypeError('mapSystemFactory 必须返回对象。');
  for (const method of REQUIRED_MAP_SYSTEM_METHODS) {
    if (typeof system[method] !== 'function') {
      throw new TypeError(`mapSystemFactory 返回值缺少 ${method}()。`);
    }
  }
  return system;
}

export class ArenaMapSystem {
  #definition;
  #strategyRegistry;
  #commandRegistry;
  #timeline;
  #runtime;
  #matchSeed;
  #contentHash;
  #destroyed;
  #advancing;
  #committing;
  #failed;
  #pendingBatch;

  constructor({
    mapDefinition,
    strategyRegistry,
    commandRegistry,
    matchSeed,
    rulesetVersion,
    validationContext = {},
  }) {
    if (!mapDefinition || typeof mapDefinition.id !== 'string') {
      throw new TypeError('ArenaMapSystem 需要 MapDefinition。');
    }
    if (!strategyRegistry || typeof strategyRegistry.validateMapDefinition !== 'function') {
      throw new TypeError('ArenaMapSystem 需要 MapEventStrategyRegistry。');
    }
    if (!commandRegistry || typeof commandRegistry.execute !== 'function') {
      throw new TypeError('ArenaMapSystem 需要 MapCommandRegistry。');
    }
    if (!Number.isSafeInteger(matchSeed) || matchSeed < 0 || matchSeed > 0xffffffff) {
      throw new RangeError('ArenaMapSystem matchSeed 必须是 uint32。');
    }
    const normalizedRulesetVersion = assertNonEmptyString(
      rulesetVersion,
      'ArenaMapSystem rulesetVersion',
    );
    strategyRegistry.validateMapDefinition(mapDefinition, validationContext);
    this.#definition = mapDefinition;
    this.#strategyRegistry = strategyRegistry;
    this.#commandRegistry = commandRegistry;
    this.#timeline = new MapTimeline(mapDefinition);
    this.#runtime = new MapRuntime({
      mapDefinition,
      occurrences: this.#timeline.listOccurrences(),
    });
    this.#matchSeed = matchSeed;
    this.#contentHash = createDeterministicDataHash({
      rulesetVersion: normalizedRulesetVersion,
      definition: mapDefinition.toJSON(),
    }, 'Map authority content');
    this.#destroyed = false;
    this.#advancing = false;
    this.#committing = false;
    this.#failed = false;
    this.#pendingBatch = null;
    Object.freeze(this);
  }

  #assertReadable() {
    if (this.#destroyed) throw new Error('ArenaMapSystem 已销毁。');
    if (this.#failed) throw new Error('ArenaMapSystem 已失败，不能继续推进。');
  }

  #assertUsable() {
    this.#assertReadable();
    if (this.#advancing || this.#committing) throw new Error('ArenaMapSystem 权威变更不可重入。');
  }

  #handlerContext(occurrence, actors) {
    return Object.freeze({
      mapDefinition: this.#definition,
      mapSnapshot: this.#runtime.getSnapshot(),
      privatePlan: this.#runtime.getPrivatePlan(occurrence.occurrenceId),
      actors,
      seed: deriveSeed(
        this.#matchSeed,
        `map:${this.#definition.id}:${occurrence.occurrenceId}`,
      ),
    });
  }

  #applyInternalCommands(commands) {
    for (const command of commands) {
      if (command.kind === MAP_RULE_COMMAND.SET_SURFACE_ENABLED) {
        this.#runtime.setSurfaceEnabled(command.surfaceId, command.enabled);
      }
    }
  }

  advance(options) {
    this.#assertUsable();
    if (this.#pendingBatch) {
      throw new Error('ArenaMapSystem 上一个 advance 批次尚未 commit。');
    }
    this.#advancing = true;
    let validated = false;
    const commands = [];
    const events = [];
    try {
      assertKnownKeys(options, ADVANCE_KEYS, 'ArenaMapSystem advance options');
      const activeTick = assertIntegerAtLeast(options.activeTick, 0, 'ArenaMapSystem activeTick');
      const actors = cloneActors(options.actors);
      this.#runtime.assertNextTick(activeTick);
      validated = true;
      for (const transition of this.#timeline.transitionsAt(activeTick)) {
        const occurrence = this.#timeline.requireOccurrence(transition.occurrenceId);
        if (transition.transition === MAP_TIMELINE_TRANSITION.WARNING) {
          const seed = deriveSeed(
            this.#matchSeed,
            `map:${this.#definition.id}:${occurrence.occurrenceId}`,
          );
          const plan = this.#strategyRegistry.plan(occurrence, {
            mapDefinition: this.#definition,
            mapSnapshot: this.#runtime.getSnapshot(),
            actors,
            seed,
          });
          const publicState = this.#runtime.warn(occurrence.occurrenceId, plan);
          events.push(Object.freeze({
            type: ARENA_MAP_EVENT.EVENT_WARNED,
            occurrenceId: occurrence.occurrenceId,
            mapEventId: occurrence.eventId,
            mapEventKind: occurrence.kind,
            startsAtActiveTick: occurrence.startTick,
            endsAtActiveTick: occurrence.endTick,
            publicPayload: publicState.publicPayload,
          }));
          continue;
        }
        if (transition.transition === MAP_TIMELINE_TRANSITION.END) {
          const result = this.#strategyRegistry.end(
            occurrence,
            this.#handlerContext(occurrence, actors),
          );
          const enrichedCommands = enrichCommands(result.commands, occurrence, 'end', commands.length);
          this.#applyInternalCommands(enrichedCommands);
          commands.push(...enrichedCommands);
          events.push(...enrichEvents(result.events, occurrence));
          this.#runtime.end(occurrence.occurrenceId);
          events.push(Object.freeze({
            type: ARENA_MAP_EVENT.EVENT_ENDED,
            occurrenceId: occurrence.occurrenceId,
            mapEventId: occurrence.eventId,
            mapEventKind: occurrence.kind,
          }));
          continue;
        }
        const result = this.#strategyRegistry.start(
          occurrence,
          this.#handlerContext(occurrence, actors),
        );
        const enrichedCommands = enrichCommands(result.commands, occurrence, 'start', commands.length);
        this.#applyInternalCommands(enrichedCommands);
        commands.push(...enrichedCommands);
        events.push(...enrichEvents(result.events, occurrence));
        const publicState = this.#runtime.start(occurrence.occurrenceId);
        events.push(Object.freeze({
          type: ARENA_MAP_EVENT.EVENT_STARTED,
          occurrenceId: occurrence.occurrenceId,
          mapEventId: occurrence.eventId,
          mapEventKind: occurrence.kind,
          publicPayload: publicState.publicPayload,
        }));
      }

      for (const occurrenceId of this.#runtime.listActiveOccurrenceIds()) {
        const occurrence = this.#timeline.requireOccurrence(occurrenceId);
        const result = this.#strategyRegistry.tick(
          occurrence,
          this.#handlerContext(occurrence, actors),
        );
        const enrichedCommands = enrichCommands(result.commands, occurrence, 'tick', commands.length);
        this.#applyInternalCommands(enrichedCommands);
        commands.push(...enrichedCommands);
        events.push(...enrichEvents(result.events, occurrence));
      }
      this.#runtime.completeTick(activeTick);
      const batch = Object.freeze({
        activeTick,
        commands: Object.freeze(commands),
        events: Object.freeze(events),
      });
      this.#pendingBatch = batch;
      return batch;
    } catch (error) {
      if (validated) this.#failed = true;
      throw error;
    } finally {
      this.#advancing = false;
    }
  }

  commit(batch, ports) {
    this.#assertUsable();
    if (!this.#pendingBatch) throw new Error('ArenaMapSystem 没有待提交的 advance 批次。');
    if (batch !== this.#pendingBatch) {
      throw new Error('ArenaMapSystem 只能提交最近一次 advance 返回的原始批次。');
    }
    this.#committing = true;
    let authoritativeFailure = false;
    try {
      assertKnownKeys(ports, COMMIT_PORT_KEYS, 'Map mutation ports');
      for (const name of COMMIT_PORT_KEYS) {
        if (typeof ports[name] !== 'function') throw new TypeError(`Map mutation port 缺少 ${name}()。`);
      }
      authoritativeFailure = true;
      this.#commandRegistry.assertSupported(batch.commands);
      this.#commandRegistry.execute(batch.commands, { ports });
      this.#pendingBatch = null;
    } catch (error) {
      if (authoritativeFailure) this.#failed = true;
      throw error;
    } finally {
      this.#committing = false;
    }
  }

  getSnapshot() {
    this.#assertReadable();
    return this.#runtime.getSnapshot();
  }

  getStateSnapshot() {
    this.#assertReadable();
    return this.#runtime.getSnapshot({ includeInternal: true });
  }

  getContentHash() {
    this.#assertReadable();
    return this.#contentHash;
  }

  isSurfaceEnabled(surfaceId) {
    this.#assertReadable();
    return this.#runtime.isSurfaceEnabled(surfaceId);
  }

  isPositionOnEnabledSurface(position) {
    this.#assertReadable();
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return false;
    return this.#definition.arena.surfaces.some((surface) => (
      this.#runtime.isSurfaceEnabled(surface.id)
      && Math.abs(position.x - surface.center.x) <= surface.halfExtents.x
      && Math.abs(position.z - surface.center.z) <= surface.halfExtents.z
    ));
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#advancing || this.#committing) {
      throw new Error('ArenaMapSystem 权威变更期间不能销毁。');
    }
    this.#runtime.destroy();
    this.#pendingBatch = null;
    this.#destroyed = true;
  }
}
