import { describe, expect, it } from 'vitest';
import {
  ACTION_RESOLUTION_KIND,
  ARENA_MATCH_READ_PROFILE,
  createMatchContentSelection,
  createMatchReadFrameV2Audit,
  createNeutralInputFrame,
  normalizeInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ProductMatchCoordinator,
  ProductMatchRuntime,
  createProductMatchRuntimePort,
} from '../src/index.js';

const CONTENT = createMatchContentSelection({
  schemaVersion: 1,
  contentDefinitionId: 'pa4b-1.content',
  contentVersion: 1,
  characterDefinitionIds: ['hero', 'opponent'],
  equipmentDefinitionIds: [],
  mapDefinitionIds: ['arena'],
  selectedMapDefinitionId: 'arena',
  participantCharacters: [
    { participantId: 'player-1', definitionId: 'hero' },
    { participantId: 'player-2', definitionId: 'opponent' },
  ],
});

const POS = { x: 0, y: 0, z: 0 };

function outcome(): Record<string, unknown> {
  return {
    kind: ACTION_RESOLUTION_KIND.NONE,
    actionDefinitionId: null,
    lane: null,
    source: null,
    reason: 'no-candidate',
  };
}

function participant(id: string): Record<string, unknown> {
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
    action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
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
    equipment: null,
    position: { ...POS },
    velocity: { ...POS },
    facing: { x: 1, z: 0 },
    grounded: true,
    supportSurfaceId: 'surface-ground',
  };
}

function frame(tick: number, phase = 'running', matchSeed = 7): Readonly<Record<string, unknown>> {
  const source = {
    schemaVersion: 2,
    worldSnapshot: {
      authoritySchemaVersion: 1,
      physicsBackendVersion: 'physics-v1',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      matchSeed,
      tick,
      activeTick: tick,
      phase,
      remainingTicks: 100,
      eventSequence: tick,
      participants: [participant('player-1'), participant('player-2')],
      equipment: [{
        schemaVersion: 1,
        instanceId: 'world-equipment',
        definitionId: 'equipment-hammer',
        spawnId: 'spawn-center',
        locationState: 'spawned',
        ownerId: null,
        position: { ...POS },
        lastSafePosition: { ...POS },
        cooldownRemainingTicks: 0,
        revision: 0,
      }],
      activeSupplyProjection: null,
      map: {
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
          phase: 'running',
          publicPayload: {},
          revision: 0,
        }],
      },
      result: null,
    },
    localActionSidecar: {
      schemaVersion: 2,
      tick,
      eventSequence: tick,
      participantId: 'player-1',
      profile: ARENA_MATCH_READ_PROFILE.LOCAL_CONTEXT_PRIMARY,
      primaryActionDefinitionId: null,
      channels: { primary: outcome(), primaryHold: outcome() },
    },
  };
  return createMatchReadFrameV2Audit(source);
}

function sessionHarness(): {
  readonly session: Record<string, unknown>;
  readonly counts: { snapshots: number; legacySteps: number; v2Steps: number };
} {
  let tick = 0;
  let state = 'created';
  const counts = { snapshots: 0, legacySteps: 0, v2Steps: 0 };
  const session = {
    get state() { return state; },
    start() { state = 'running'; },
    setPaused(paused: boolean) { state = paused ? 'paused' : 'running'; },
    step() { counts.legacySteps += 1; return { events: [], snapshot: { tick }, input: null }; },
    getSnapshot() { counts.snapshots += 1; return Object.freeze({ tick }); },
    getPresentationReadFrame() { return frame(tick); },
    stepWithPresentationReadFrame() {
      counts.v2Steps += 1;
      const input = normalizeInputFrame(createNeutralInputFrame(tick, 'player-1'));
      tick += 1;
      return Object.freeze({ events: Object.freeze([]), readFrame: frame(tick), input });
    },
    exportReplay() { return Object.freeze({ schemaVersion: 5, trace: [] }); },
    destroy() { state = 'destroyed'; },
  };
  return { session, counts };
}

function runtimeWithSession(session: Record<string, unknown>): ProductMatchRuntime {
  return new ProductMatchRuntime({
    session,
    matchSeed: 7,
    opponent: Object.freeze({
      id: 'opponent-1',
      displayName: 'Opponent',
      portraitKey: 'portrait',
      appearanceKey: 'appearance',
    }),
    content: CONTENT,
  });
}

function runtimePortCandidate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    start() {},
    setPaused() {},
    step() { return Object.freeze({ events: Object.freeze([]), snapshot: Object.freeze({}), result: null }); },
    getSnapshot() { return Object.freeze({}); },
    getPublicInfo() {
      return Object.freeze({
        matchSeed: 7,
        opponent: Object.freeze({
          id: 'opponent-1',
          displayName: 'Opponent',
          portraitKey: 'portrait',
          appearanceKey: 'appearance',
        }),
        content: CONTENT,
      });
    },
    getResult() { return null; },
    startWithReadFrame() { return Object.freeze({ readFrame: frame(0) }); },
    getReadFrame() { return frame(0); },
    stepWithReadFrame() {
      return Object.freeze({
        events: Object.freeze([]),
        readFrame: frame(1),
        input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
        result: null,
      });
    },
    destroy() {},
    ...overrides,
  };
}

describe('PA4b-1 Product V2 plumbing', () => {
  it('returns the frozen Session frame, performs one V2 step, and never asks for legacy snapshot', () => {
    const { session, counts } = sessionHarness();
    const runtime = runtimeWithSession(session);
    const started = runtime.startWithReadFrame!();
    expect(Object.isFrozen(started.readFrame)).toBe(true);
    const stepped = runtime.stepWithReadFrame!();
    expect(stepped.readFrame.worldSnapshot.tick).toBe(1);
    expect(stepped.input?.tick).toBe(0);
    expect(counts.v2Steps).toBe(1);
    expect(counts.legacySteps).toBe(0);
    expect(counts.snapshots).toBe(0);
    runtime.destroy();
  });

  it('keeps direct and wrapped Runtime V2 lifecycle semantics aligned', () => {
    const direct = runtimeWithSession(sessionHarness().session);
    direct.startWithReadFrame!();
    direct.setPaused(true);
    expect(() => direct.stepWithReadFrame!()).toThrow(/只允许 running/);
    direct.destroy();

    const wrappedRuntime = runtimeWithSession(sessionHarness().session);
    const wrapped = createProductMatchRuntimePort(wrappedRuntime);
    wrapped.startWithReadFrame!();
    wrapped.setPaused(true);
    expect(() => wrapped.stepWithReadFrame!()).toThrow(/只允许 running/);
    wrapped.destroy();
  });

  it('removes the legacy Runtime flow instead of retaining a mixed read mode', () => {
    const { session } = sessionHarness();
    const runtime = runtimeWithSession(session);
    expect('start' in runtime).toBe(false);
    expect('step' in runtime).toBe(false);
    expect('getSnapshot' in runtime).toBe(false);
    runtime.startWithReadFrame();
    runtime.destroy();
  });

  it('fails closed for a missing V2 Session contract and preserves the legacy path', () => {
    const { session } = sessionHarness();
    delete session.getPresentationReadFrame;
    delete session.stepWithPresentationReadFrame;
    expect(() => runtimeWithSession(session)).toThrow(/getPresentationReadFrame|stepWithPresentationReadFrame|缺少/);
  });

  it('rejects a partial PA4a Session frame contract at Runtime construction', () => {
    const { session } = sessionHarness();
    delete session.stepWithPresentationReadFrame;
    expect(() => runtimeWithSession(session)).toThrow(/stepWithPresentationReadFrame 不存在/);
  });

  it('returns null without an active runtime and exposes V2 only after preparation', async () => {
    const coordinator = new ProductMatchCoordinator({
      matchFactory: {
        create: () => runtimeWithSession(sessionHarness().session),
      },
    });
    expect(coordinator.getMatchReadFrame()).toBeNull();
    await coordinator.prepare();
    expect(coordinator.getMatchReadFrame()).toBeTruthy();
    coordinator.release();
    expect(coordinator.getMatchReadFrame()).toBeNull();
    coordinator.destroy();
  });

  it('rejects partial/accessor V2 runtime ports before any runtime call', () => {
    const partial = runtimePortCandidate();
    delete partial.getReadFrame;
    expect(() => createProductMatchRuntimePort(partial)).toThrow(/getReadFrame 不存在/);

    const accessor = runtimePortCandidate();
    let getterReads = 0;
    Object.defineProperty(accessor, 'getReadFrame', {
      configurable: true,
      enumerable: true,
      get() {
        getterReads += 1;
        throw new Error('malicious runtime getter');
      },
    });
    expect(() => createProductMatchRuntimePort(accessor)).toThrow(/数据方法/);
    expect(getterReads).toBe(0);
  });

  it('rejects wrong seed, malformed frozen outputs, async values, and identity drift', () => {
    const wrongSeed = createProductMatchRuntimePort(runtimePortCandidate({
      getReadFrame() { return frame(0, 'running', 8); },
    }));
    expect(() => wrongSeed.getReadFrame!()).toThrow(/matchSeed/);

    const extraStart = createProductMatchRuntimePort(runtimePortCandidate({
      startWithReadFrame() {
        return Object.freeze({ readFrame: frame(0), extra: true });
      },
    }));
    expect(() => extraStart.startWithReadFrame!()).toThrow(/未知键|不支持字段/);

    const asyncFrame = createProductMatchRuntimePort(runtimePortCandidate({
      getReadFrame() { return Promise.resolve(frame(0)); },
    }));
    expect(() => asyncFrame.getReadFrame!()).toThrow(/异步|同步完成/);

    const nullInput = createProductMatchRuntimePort(runtimePortCandidate({
      stepWithReadFrame() {
        return Object.freeze({
          events: Object.freeze([]),
          readFrame: frame(1),
          input: null,
          result: null,
        });
      },
    }));
    expect(() => nullInput.stepWithReadFrame!()).toThrow(/normalized InputFrame/);

    const wrongParticipant = createProductMatchRuntimePort(runtimePortCandidate({
      stepWithReadFrame() {
        return Object.freeze({
          events: Object.freeze([]),
          readFrame: frame(1),
          input: normalizeInputFrame(createNeutralInputFrame(0, 'player-2')),
          result: null,
        });
      },
    }));
    expect(() => wrongParticipant.stepWithReadFrame!()).toThrow(/identity/);

    const invalidResult = Object.freeze({
      schemaVersion: 2,
      matchSeed: 7,
      authorityIdentity: Object.freeze({
        replaySchemaVersion: 5,
        ruleSchemaVersion: 1,
        physicsBackendVersion: 'physics-v1',
        configHash: '12345678',
        ruleContentHash: 'abcdef01',
        finalHash: '11111111',
      }),
      authorityResult: Object.freeze({
        winnerId: null,
        reason: 'timeout-draw',
        isDraw: true,
        endedAtTick: 1,
      }),
      content: CONTENT,
      opponent: Object.freeze({
        id: 'opponent-1',
        displayName: 'Opponent',
        portraitKey: 'portrait',
        appearanceKey: 'appearance',
      }),
      authorityHash: '12345678',
    });
    const invalidResultPort = createProductMatchRuntimePort(runtimePortCandidate({
      getResult() { return invalidResult; },
      stepWithReadFrame() {
        return Object.freeze({
          events: Object.freeze([]),
          readFrame: frame(1),
          input: normalizeInputFrame(createNeutralInputFrame(0, 'player-1')),
          result: invalidResult,
        });
      },
    }));
    expect(() => invalidResultPort.stepWithReadFrame!()).toThrow(/authorityHash|ProductMatchResult/);
    expect(() => invalidResultPort.getResult()).toThrow(/authorityHash|ProductMatchResult/);
  });

  it('captures complete publicInfo identity once and prevents later seed/content drift', () => {
    let publicInfoCalls = 0;
    const port = createProductMatchRuntimePort(runtimePortCandidate({
      getPublicInfo() {
        publicInfoCalls += 1;
        return publicInfoCalls === 1
          ? Object.freeze({
            matchSeed: 7,
            opponent: Object.freeze({
              id: 'opponent-1',
              displayName: 'Opponent',
              portraitKey: 'portrait',
              appearanceKey: 'appearance',
            }),
            content: CONTENT,
          })
          : Object.freeze({
            matchSeed: 8,
            opponent: Object.freeze({
              id: 'opponent-8',
              displayName: 'Drifted',
              portraitKey: 'other',
              appearanceKey: 'other',
            }),
            content: CONTENT,
          });
      },
    }));
    const first = port.getPublicInfo();
    const second = port.getPublicInfo();
    expect(second).toBe(first);
    expect(first.matchSeed).toBe(7);
    expect(publicInfoCalls).toBe(1);
  });

  it('uses runtime.getResult identity rather than trusting a forged step result', async () => {
    const coordinator = new ProductMatchCoordinator({
      matchFactory: {
        create: () => runtimePortCandidate({
          getResult() { return Object.freeze({ forged: true }); },
        }),
      },
    });
    await coordinator.prepare();
    coordinator.startWithReadFrame();
    expect(() => coordinator.stepWithReadFrame()).toThrow(/result/);
  });

  it('retains the first raw candidate cleanup method across getPublicInfo failure and retry', async () => {
    let destroys = 0;
    const candidate: Record<string, unknown> = runtimePortCandidate({
      destroy() {
        destroys += 1;
        if (destroys === 1) throw new Error('candidate cleanup failed');
      },
      getPublicInfo() {
        delete candidate.destroy;
        candidate.destroy = () => { throw new Error('replacement destroy must not execute'); };
        throw new Error('public info failed');
      },
    });
    const coordinator = new ProductMatchCoordinator({
      matchFactory: { create: () => candidate },
    });
    await expect(coordinator.prepare()).rejects.toThrow(/清理未完整|public info failed/);
    expect(destroys).toBe(1);
    expect(coordinator.state).toBe('failed');
    coordinator.resetFailure();
    expect(destroys).toBe(2);
    coordinator.destroy();
  });
});
