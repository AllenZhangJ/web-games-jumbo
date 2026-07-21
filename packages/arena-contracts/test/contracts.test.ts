import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_EVENT,
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
  createRng,
  createNeutralInputFrame,
  createArenaMatchSnapshotAudit,
  createSynchronousStoragePort,
  combineCleanupFailure,
  deriveSeed,
  normalizeInputFrames,
  normalizeThrownError,
} from '../src/index.js';
import type { ArenaInputFrame, ArenaMatchEventType } from '../src/index.js';

describe('Arena deterministic contracts', () => {
  function snapshotFixture(includeInternal = false) {
    const participant = {
      id: 'p1',
      characterDefinitionId: 'fighter',
      status: 'active',
      lives: 3,
      eliminations: 0,
      deaths: 0,
      hitstunTicks: 0,
      invulnerableTicks: 0,
      respawnTicks: 0,
      lastHitBy: null,
      lastHitTick: -1,
      action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
      actionRule: { range: 2 },
      movement: {
        schemaVersion: 2,
        participantId: 'p1',
        characterDefinitionId: 'fighter',
        mode: 'standard',
        coyoteTicksRemaining: 0,
        jumpBufferTicksRemaining: 0,
        airJumpsUsed: 0,
        crouchChargeTicks: 0,
        crouchActionId: null,
        downSmashActionId: null,
        revision: 0,
        grounded: true,
      },
      ...(includeInternal ? {} : { actionAffordance: { tick: 3 } }),
      equipment: null,
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: 1, z: 0 },
      grounded: true,
      supportSurfaceId: 'main',
    };
    return {
      schemaVersion: 5,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'config-hash',
      ruleContentHash: 'rule-hash',
      matchSeed: 7,
      tick: 3,
      activeTick: 3,
      phase: 'running',
      remainingTicks: 97,
      eventSequence: 4,
      participants: [participant],
      equipment: [],
      map: {
        schemaVersion: 1,
        definitionId: 'main-map',
        nextActiveTick: 3,
        revision: 0,
        surfaces: [{ id: 'main', enabled: true, revision: 0 }],
        occurrences: [],
      },
      result: null,
      ...(includeInternal ? { rngStates: { combat: 123 } } : {}),
    };
  }

  it('audits public and internal MatchCore snapshots outside the per-tick hot path', () => {
    const publicSnapshot = createArenaMatchSnapshotAudit(snapshotFixture());
    expect(Object.isFrozen(publicSnapshot)).toBe(true);
    expect(Object.isFrozen(publicSnapshot.participants[0])).toBe(true);
    expect(createArenaMatchSnapshotAudit(snapshotFixture(true), { includeInternal: true }).rngStates)
      .toEqual({ combat: 123 });
    expect(() => createArenaMatchSnapshotAudit({
      ...snapshotFixture(),
      unknown: true,
    })).toThrow(/unknown/);
    const accessor = snapshotFixture();
    Object.defineProperty(accessor, 'tick', { enumerable: true, get: () => 3 });
    expect(() => createArenaMatchSnapshotAudit(accessor)).toThrow(/数据字段/);
  });

  it('normalizes complete InputFrame batches and fills missing participants deterministically', () => {
    const frame: ArenaInputFrame = createNeutralInputFrame(3, 'p1');
    expect(normalizeInputFrames([{ ...frame, moveX: 1, moveZ: 1 }], {
      tick: 3,
      participantIds: ['p1', 'p2'],
    })).toEqual([
      { ...frame, moveX: 1 / Math.hypot(1, 1), moveZ: 1 / Math.hypot(1, 1) },
      createNeutralInputFrame(3, 'p2'),
    ]);
    expect(() => normalizeInputFrames([frame, frame], {
      tick: 3,
      participantIds: ['p1'],
    })).toThrow(/重复输入/);
  });

  it('publishes one typed authority event vocabulary', () => {
    const event: ArenaMatchEventType = ARENA_MATCH_EVENT.HIT_RESOLVED;
    expect(event).toBe('HitResolved');
    expect(Object.isFrozen(ARENA_MATCH_EVENT)).toBe(true);
  });

  it('adapts one synchronous storage boundary and rejects ambiguous host results', () => {
    const values = new Map<string, unknown>();
    const host = {
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: values.get(key) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, value);
        return true;
      },
      storageDelete(key: string) {
        return values.delete(key);
      },
    };
    const port = createSynchronousStoragePort(host, { label: 'Contract Test Storage' });
    expect(port.write('profile', { revision: 1 })).toBe(true);
    expect(port.read('profile')).toEqual({ ok: true, found: true, value: { revision: 1 } });
    expect(port.delete('profile')).toBe(true);
    expect(port.read('profile')).toEqual({ ok: true, found: false, value: undefined });
    expect(Object.isFrozen(port)).toBe(true);
    expect(Object.isFrozen(port.read('profile'))).toBe(true);

    expect(() => createSynchronousStoragePort({
      ...host,
      storageRead: () => ({ ok: false, found: true, value: null }),
    }).read('profile')).toThrow(/found/);
    expect(() => createSynchronousStoragePort({
      ...host,
      storageWrite: async () => true,
    }).write('profile', null)).toThrow(/同步完成/);
  });

  it('deeply freezes canonical data without trusting accessors or insertion order', () => {
    const left = cloneFrozenData({ z: [3, 2, 1], a: { enabled: true } });
    const right = { a: { enabled: true }, z: [3, 2, 1] };
    expect(Object.isFrozen(left)).toBe(true);
    expect(Object.isFrozen(left.a)).toBe(true);
    expect(createDeterministicDataHash(left)).toBe(createDeterministicDataHash(right));
    expect(() => cloneFrozenData({
      get unsafe() {
        return 1;
      },
    })).toThrow(/数据字段/);
  });

  it('rejects schema drift and normalizes immutable string sets', () => {
    expect(() => assertKnownKeys({ id: 'arena', extra: true }, new Set(['id']), 'value'))
      .toThrow(/不支持字段 extra/);
    expect(cloneFrozenStringSet(['z', 'a'])).toEqual(['a', 'z']);
    expect(() => cloneFrozenStringSet(['same', 'same'])).toThrow(/重复项/);
  });

  it('preserves the frozen RNG sequence, bounded integers and named stream isolation', () => {
    const rng = createRng(12345);
    expect(Array.from({ length: 4 }, () => rng.next())).toEqual([
      0.9797282677609473,
      0.3067522644996643,
      0.484205421525985,
      0.817934412509203,
    ]);
    expect(deriveSeed(88, 'map')).toBe(deriveSeed(88, 'map'));
    expect(deriveSeed(88, 'map')).not.toBe(deriveSeed(88, 'bot'));
    expect(() => rng.int(0, 0x100000000)).toThrow(/不能超过 uint32/);
  });

  it('normalizes thrown values and preserves original plus cleanup failures', () => {
    const original = normalizeThrownError('host failed', 'Lifecycle');
    expect(original).toBeInstanceOf(Error);
    expect(original.message).toBe('Lifecycle：host failed');
    expect((original as Error & { originalError: unknown }).originalError).toBe('host failed');
    expect(combineCleanupFailure(original, [], 'unused')).toBe(original);

    const cleanup = new Error('cleanup failed');
    const cleanupErrors = [cleanup];
    const combined = combineCleanupFailure(original, cleanupErrors, 'aggregate failed') as Error & {
      originalError: Error;
      cleanupErrors: readonly Error[];
    };
    expect(combined.message).toBe('aggregate failed');
    expect(combined.originalError).toBe(original);
    expect(combined.cleanupErrors).toEqual([cleanup]);
    expect(combined.cleanupErrors).not.toBe(cleanupErrors);
    expect(Object.isFrozen(combined.cleanupErrors)).toBe(true);
  });
});
