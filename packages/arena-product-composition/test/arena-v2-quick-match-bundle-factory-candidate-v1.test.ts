import { describe, expect, it } from 'vitest';
import {
  ModeAuthoritativeQuickMatchServiceV3,
  ModeQuickMatchServiceV2,
} from '@number-strategy-jump/arena-quick-match';
import {
  ARENA_V2_QUICK_MATCH_BUNDLE_FACTORY_CANDIDATE_V1,
  ArenaV2QuickMatchBundleFactoryCandidateV1,
  type ArenaV2QuickMatchBundleProviderRequestCandidateV1,
} from '../src/arena-v2-quick-match-bundle-factory-candidate-v1.js';

const MODE_IDS = Object.freeze({
  duel: 'arena.mode.duel.bundle.test.v1',
  race: 'arena.mode.race.bundle.test.v1',
  survival: 'arena.mode.survival.bundle.test.v1',
});

type ModeKind = keyof typeof MODE_IDS;

interface RealServiceHarnessOptions {
  readonly runtimeDestroyFailures?: number;
  readonly seedStart?: number;
}

function expectFailureMessage(run: () => unknown, pattern: RegExp): void {
  let failure: unknown;
  try {
    run();
  } catch (error) {
    failure = error;
  }
  const messages: string[] = [];
  const queue: unknown[] = [failure];
  const visited = new Set<object>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (typeof current !== 'object' || current === null || visited.has(current)) continue;
    visited.add(current);
    const message = Object.getOwnPropertyDescriptor(current, 'message');
    if (message && Object.hasOwn(message, 'value') && typeof message.value === 'string') {
      messages.push(message.value);
    }
    for (const key of ['cause', 'originalError'] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor && Object.hasOwn(descriptor, 'value')) queue.push(descriptor.value);
    }
    const cleanupErrors = Object.getOwnPropertyDescriptor(current, 'cleanupErrors');
    if (
      cleanupErrors
      && Object.hasOwn(cleanupErrors, 'value')
      && Array.isArray(cleanupErrors.value)
    ) queue.push(...cleanupErrors.value);
  }
  expect(failure).toBeDefined();
  expect(messages.join('\n')).toMatch(pattern);
}

function modeKindForId(modeDefinitionId: string): ModeKind {
  const entry = Object.entries(MODE_IDS).find(([, id]) => id === modeDefinitionId);
  if (entry === undefined) throw new RangeError(`unexpected mode ${modeDefinitionId}`);
  return entry[0] as ModeKind;
}

function roster(modeDefinitionId: string) {
  const modeKind = modeKindForId(modeDefinitionId);
  return {
    schemaVersion: 2,
    modeDefinitionId,
    participants: [
      {
        participantId: 'p1',
        modeRole: modeKind === 'survival' ? 'player' : 'competitor',
        teamId: null,
        controllerKind: 'human',
        slotId: null,
        slotGeneration: 0,
      },
      {
        participantId: 'p2',
        modeRole: modeKind === 'survival' ? 'enemy' : 'competitor',
        teamId: null,
        controllerKind: 'bot',
        slotId: modeKind === 'survival' ? 'enemy-slot-1' : null,
        slotGeneration: modeKind === 'survival' ? 1 : 0,
      },
    ],
  };
}

function content(modeDefinitionId: string) {
  const modeKind = modeKindForId(modeDefinitionId);
  return {
    schemaVersion: 2,
    modeDefinitionId,
    contentDefinitionId: `arena.content.${modeKind}.bundle.test.v1`,
    contentVersion: 1,
    characterDefinitionIds: ['fighter-a', 'fighter-b'],
    equipmentDefinitionIds: ['weapon-a'],
    mapDefinitionIds: [`map-${modeKind}`],
    selectedMapDefinitionId: `map-${modeKind}`,
    participantCharacters: [
      { participantId: 'p1', definitionId: 'fighter-a' },
      { participantId: 'p2', definitionId: 'fighter-b' },
    ],
  };
}

function authorityIdentity() {
  return Object.freeze({
    replaySchemaVersion: 6,
    ruleSchemaVersion: 6,
    physicsBackendVersion: 'lightweight-v3',
    configHash: 'deadbeef',
    ruleContentHash: 'c0ffee00',
    finalHash: '1234abcd',
  });
}

function realAuthoritativeQuickMatchService(options: RealServiceHarnessOptions = {}) {
  let seed = options.seedStart ?? 41;
  let seedCalls = 0;
  let runtimeDestroyFailures = options.runtimeDestroyFailures ?? 0;
  let runtimeDestroys = 0;
  let authorityIdentityReads = 0;
  const service = new ModeAuthoritativeQuickMatchServiceV3({
    seedSource: {
      nextSeed() {
        seedCalls += 1;
        const value = seed;
        seed += 1;
        return value;
      },
    },
    rosterProvider: {
      createRoster({ modeDefinitionId }: { modeDefinitionId: string }) {
        return roster(modeDefinitionId);
      },
    },
    contentProvider: {
      createContent({ modeDefinitionId }: { modeDefinitionId: string }) {
        return content(modeDefinitionId);
      },
    },
    runtimeFactory: {
      createRuntime() {
        return {
          start() {},
          step() {},
          pause() {},
          resume() {},
          getModeDriverContentHash() { return 'a001a001'; },
          getTerminalAuthorityIdentity() {
            authorityIdentityReads += 1;
            return authorityIdentity();
          },
          exportReplayV6() {
            throw new Error('bundle factory test Replay V6 is terminal-only');
          },
          exportTerminalEvidenceV1() {
            throw new Error('bundle factory test Runtime evidence is terminal-only');
          },
          exportTerminalEvidenceV2() {
            throw new Error('bundle factory test Runtime evidence V2 is terminal-only');
          },
          destroy() {
            runtimeDestroys += 1;
            if (runtimeDestroyFailures > 0) {
              runtimeDestroyFailures -= 1;
              throw new Error('runtime cleanup failed');
            }
          },
        };
      },
    },
  });
  return Object.freeze({
    service,
    seedCalls: () => seedCalls,
    runtimeDestroys: () => runtimeDestroys,
    authorityIdentityReads: () => authorityIdentityReads,
  });
}

function realLegacyQuickMatchServiceV2() {
  let runtimeDestroys = 0;
  let controllerDestroys = 0;
  const service = new ModeQuickMatchServiceV2({
    seedSource: { nextSeed: () => 91 },
    rosterProvider: {
      createRoster({ modeDefinitionId }: { modeDefinitionId: string }) {
        return roster(modeDefinitionId);
      },
    },
    contentProvider: {
      createContent({ modeDefinitionId }: { modeDefinitionId: string }) {
        return content(modeDefinitionId);
      },
    },
    runtimeFactory: {
      createRuntime() {
        return {
          start() {},
          step() {},
          pause() {},
          resume() {},
          destroy() { runtimeDestroys += 1; },
        };
      },
    },
    controllerFactory: {
      createController() {
        return {
          createInput() { return null; },
          destroy() { controllerDestroys += 1; },
        };
      },
    },
  });
  return Object.freeze({
    service,
    runtimeDestroys: () => runtimeDestroys,
    controllerDestroys: () => controllerDestroys,
  });
}

function publicParticipants(request: ArenaV2QuickMatchBundleProviderRequestCandidateV1) {
  return request.finalAssignment.participants.map((participant, index) => ({
    participantId: participant.participantId,
    displayName: `Participant ${index + 1}`,
    portraitKey: `portrait.${index + 1}`,
    appearanceKey: `appearance.${index + 1}`,
    identityOrdinal: index + 1,
    identityGlyphKey: `glyph.${index + 1}`,
    identityPatternKey: `pattern.${index + 1}`,
  }));
}

function bundleFactory(options: Readonly<{
  quickMatchService?: unknown;
  createPublicParticipants?: (
    request: ArenaV2QuickMatchBundleProviderRequestCandidateV1,
  ) => unknown;
}> = {}) {
  const real = realAuthoritativeQuickMatchService();
  const factory = new ArenaV2QuickMatchBundleFactoryCandidateV1({
    duelModeDefinitionId: MODE_IDS.duel,
    raceModeDefinitionId: MODE_IDS.race,
    survivalModeDefinitionId: MODE_IDS.survival,
    quickMatchService: (options.quickMatchService ?? real.service) as (
      ModeAuthoritativeQuickMatchServiceV3
    ),
    publicParticipantProvider: {
      createPublicParticipants: options.createPublicParticipants ?? publicParticipants,
    },
  });
  return Object.freeze({ factory, real });
}

describe('Arena V2 authoritative Quick Match bundle factory candidate V1', () => {
  it('adapts real authoritative V3 sessions for all three Mode generations', () => {
    const value = bundleFactory();
    for (const [index, modeKind] of (['duel', 'race', 'survival'] as const).entries()) {
      const bundle = value.factory.createMatchBundle({
        schemaVersion: 1,
        generation: index + 1,
        modeKind,
      });
      expect(bundle).toMatchObject({
        schemaVersion: 1,
        generation: index + 1,
        modeKind,
        modeDefinitionId: MODE_IDS[modeKind],
        recipientParticipantId: 'p1',
        publicMatchInfo: {
          schemaVersion: 2,
          modeDefinitionId: MODE_IDS[modeKind],
          localParticipantId: 'p1',
        },
      });
      expect(typeof Object.getOwnPropertyDescriptor(
        bundle.authorityIdentity as object,
        'getTerminalAuthorityIdentity',
      )?.value).toBe('function');
      expect(Object.isFrozen(bundle)).toBe(true);
      expect(Object.isFrozen(bundle.publicMatchInfo)).toBe(true);
      expect((bundle.publicMatchInfo as { publicParticipants: unknown[] }).publicParticipants)
        .toHaveLength(2);
      (bundle.matchSession as { destroy(): void }).destroy();
    }
    expect(value.real.seedCalls()).toBe(3);
    expect(value.real.runtimeDestroys()).toBe(3);
    expect(value.real.authorityIdentityReads()).toBe(0);
    value.factory.destroy();
    expect(ARENA_V2_QUICK_MATCH_BUNDLE_FACTORY_CANDIDATE_V1).toEqual({
      schemaVersion: 1,
      status: 'production-unreachable',
      hardGate: false,
      defaultEntryWired: false,
      defaultCompositionWired: false,
      defaultNavigationWired: false,
      validationStatus: 'not-run',
      quickMatchContract: 'ModeAuthoritativeQuickMatchServiceV3',
      authorityIdentitySource: 'terminal-session-only',
      replayIdentitySource: 'terminal-session-replay-v6-only',
      runtimeTerminalEvidenceSource: 'terminal-session-mode-driver-bound-v1-compatibility',
      authorityRegistrySource: 'explicit-match-bundle-factory-option-only',
      authorityAdmissionSource:
        'validated-selection-and-runtime-mode-driver-before-bundle-transfer-v2',
      legacyModeQuickMatchServiceV2Accepted: false,
      sharedSynchronousReturnBoundaryWired: true,
      operationGuardPrecedesStateAndRequestValidation: true,
      quickMatchParticipantAndAdmissionPortsCheckedBeforeTransfer: true,
      returnedRawSessionOwnedBeforeDestroyPortCapture: true,
      invalidDestroyPortRetainsRawSessionCleanupOwnership: true,
      sessionOwnershipRetainedUntilBundlePublicationCommits: true,
      stickyReentryUsesSequenceAndFirstError: true,
      successfulPendingCleanupWatermarkPrecedesReentryRejection: true,
      supportedModeKinds: ['duel', 'race', 'survival'],
      runtimeTerminalSupplyEvidenceSource: 'terminal-session-complete-supply-facts-v2-only',
    });
  });

  it('transfers only the successful V3 Session owner and does not retain it', () => {
    const value = bundleFactory();
    const bundle = value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    });
    value.factory.destroy();
    expect(value.real.runtimeDestroys()).toBe(0);
    (bundle.matchSession as { destroy(): void }).destroy();
    expect(value.real.runtimeDestroys()).toBe(1);
  });

  it('rejects stale/future requests and duplicate Mode ids before Quick Match creation', () => {
    const value = bundleFactory();
    expect(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 2,
      modeKind: 'duel',
    })).toThrow(/generation/u);
    expect(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
      future: true,
    } as never)).toThrow(/future|字段|不受支持/u);
    expect(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'future',
    } as never)).toThrow(/不受支持/u);
    expect(value.real.seedCalls()).toBe(0);
    expect(() => new ArenaV2QuickMatchBundleFactoryCandidateV1({
      duelModeDefinitionId: MODE_IDS.duel,
      raceModeDefinitionId: MODE_IDS.duel,
      survivalModeDefinitionId: MODE_IDS.survival,
      quickMatchService: value.real.service,
      publicParticipantProvider: { createPublicParticipants: publicParticipants },
    })).toThrow(/唯一/u);
    value.factory.destroy();
  });

  it('fails closed on Mode drift and destroys the real V3 Session before transfer', () => {
    const drifted = realAuthoritativeQuickMatchService();
    const value = bundleFactory({
      quickMatchService: {
        create() {
          return drifted.service.create({ modeDefinitionId: MODE_IDS.race });
        },
      },
    });
    expectFailureMessage(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    }), /Mode身份漂移/u);
    expect(drifted.runtimeDestroys()).toBe(1);
    value.factory.destroy();
  });

  it('rejects the legacy V2 Bot-controller Session and rolls back both owners', () => {
    const legacy = realLegacyQuickMatchServiceV2();
    let publicProviderCalls = 0;
    const value = bundleFactory({
      quickMatchService: legacy.service,
      createPublicParticipants() {
        publicProviderCalls += 1;
        return [];
      },
    });
    expectFailureMessage(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    }), /authoritative V3 session|getTerminalAuthorityIdentity/u);
    expect(publicProviderCalls).toBe(0);
    expect(legacy.runtimeDestroys()).toBe(1);
    expect(legacy.controllerDestroys()).toBe(1);
    value.factory.destroy();
  });

  it('rejects the obsolete authority provider key without executing its getter', () => {
    const real = realAuthoritativeQuickMatchService();
    let getterCalls = 0;
    const options = {
      duelModeDefinitionId: MODE_IDS.duel,
      raceModeDefinitionId: MODE_IDS.race,
      survivalModeDefinitionId: MODE_IDS.survival,
      quickMatchService: real.service,
      publicParticipantProvider: { createPublicParticipants: publicParticipants },
    } as Record<string, unknown>;
    Object.defineProperty(options, 'authorityIdentityProvider', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('obsolete authority provider getter must stay opaque');
      },
    });
    expect(() => new ArenaV2QuickMatchBundleFactoryCandidateV1(options as never)).toThrow(
      /authorityIdentityProvider|字段|不受支持/u,
    );
    expect(getterCalls).toBe(0);
  });

  it('rejects provider failures and native/hostile async values without leaking ownership', async () => {
    const publicFailure = bundleFactory({
      createPublicParticipants() {
        throw new Error('public provider failed');
      },
    });
    expectFailureMessage(() => publicFailure.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    }), /public provider failed/u);
    expect(publicFailure.real.runtimeDestroys()).toBe(1);
    publicFailure.factory.destroy();

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      const native = bundleFactory({
        createPublicParticipants: (() => Promise.reject(
          new Error('late public rejection'),
        )) as never,
      });
      expectFailureMessage(() => native.factory.createMatchBundle({
        schemaVersion: 1,
        generation: 1,
        modeKind: 'duel',
      }), /同步完成/u);
      expect(native.real.runtimeDestroys()).toBe(1);
      native.factory.destroy();

      let thenCalls = 0;
      const hostile = bundleFactory({
        createPublicParticipants() {
          return {
            then() {
              thenCalls += 1;
              return Promise.reject(new Error('returned rejection'));
            },
          };
        },
      });
      expectFailureMessage(() => hostile.factory.createMatchBundle({
        schemaVersion: 1,
        generation: 1,
        modeKind: 'race',
      }), /同步完成/u);
      expect(thenCalls).toBe(0);
      expect(hostile.real.runtimeDestroys()).toBe(1);
      hostile.factory.destroy();

      const dataThen = bundleFactory({
        createPublicParticipants() {
          return Object.freeze({ constructor: null, then: null });
        },
      });
      expectFailureMessage(() => dataThen.factory.createMatchBundle({
        schemaVersion: 1,
        generation: 1,
        modeKind: 'survival',
      }), /then字段|同步完成/u);
      expect(dataThen.real.runtimeDestroys()).toBe(1);
      dataThen.factory.destroy();

      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('rejects an accessor terminal identity port without invoking it and cleans the Session', () => {
    const real = realAuthoritativeQuickMatchService();
    let getterCalls = 0;
    let serviceDestroyCalls = 0;
    const value = bundleFactory({
      quickMatchService: {
        create(request: unknown) {
          const created = real.service.create(request);
          const session = Object.create(null) as Record<string, unknown>;
          Object.defineProperty(session, 'destroy', {
            enumerable: true,
            value() {
              serviceDestroyCalls += 1;
              created.session.destroy();
            },
          });
          Object.defineProperty(session, 'getTerminalAuthorityIdentity', {
            enumerable: true,
            get() {
              getterCalls += 1;
              return () => authorityIdentity();
            },
          });
          return { ...created, session };
        },
      },
    });
    expectFailureMessage(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    }), /数据方法/u);
    expect(getterCalls).toBe(0);
    expect(serviceDestroyCalls).toBe(1);
    expect(real.runtimeDestroys()).toBe(1);
    value.factory.destroy();
  });

  it('retains the raw Session when destroy itself is an accessor and never invokes it', () => {
    const real = realAuthoritativeQuickMatchService();
    let destroyGetterCalls = 0;
    const value = bundleFactory({
      quickMatchService: {
        create(request: unknown) {
          const created = real.service.create(request);
          const session = Object.create(created.session) as Record<string, unknown>;
          Object.defineProperty(session, 'destroy', {
            enumerable: true,
            get() {
              destroyGetterCalls += 1;
              return () => created.session.destroy();
            },
          });
          return { ...created, session };
        },
      },
    });
    expectFailureMessage(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    }), /destroy必须是数据方法|清理不完整/u);
    expect(destroyGetterCalls).toBe(0);
    expect(real.runtimeDestroys()).toBe(0);
    expect(() => value.factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/未完成清理/u);
    expect(() => value.factory.destroy()).toThrow(/保留清理所有权/u);
    expect(destroyGetterCalls).toBe(0);
  });

  it('marks swallowed provider reentry terminal and destroys the captured V3 Session', () => {
    const real = realAuthoritativeQuickMatchService();
    let factory: ArenaV2QuickMatchBundleFactoryCandidateV1;
    factory = new ArenaV2QuickMatchBundleFactoryCandidateV1({
      duelModeDefinitionId: MODE_IDS.duel,
      raceModeDefinitionId: MODE_IDS.race,
      survivalModeDefinitionId: MODE_IDS.survival,
      quickMatchService: real.service,
      publicParticipantProvider: {
        createPublicParticipants(request) {
          try {
            factory.createMatchBundle({
              schemaVersion: 1,
              generation: request.generation,
              modeKind: request.modeKind,
            });
          } catch {
            // The outer attempt must retain the reentry marker.
          }
          return publicParticipants(request);
        },
      },
    });
    expectFailureMessage(() => factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    }), /重入/u);
    expect(real.runtimeDestroys()).toBe(1);
    factory.destroy();
  });

  it('retains exact failed V3 Session cleanup ownership and retries before destroy', () => {
    const real = realAuthoritativeQuickMatchService({ runtimeDestroyFailures: 1 });
    const factory = new ArenaV2QuickMatchBundleFactoryCandidateV1({
      duelModeDefinitionId: MODE_IDS.duel,
      raceModeDefinitionId: MODE_IDS.race,
      survivalModeDefinitionId: MODE_IDS.survival,
      quickMatchService: real.service,
      publicParticipantProvider: {
        createPublicParticipants() { throw new Error('force rollback'); },
      },
    });
    expect(() => factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/清理不完整/u);
    expect(real.runtimeDestroys()).toBe(1);
    expect(() => factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/未完成清理/u);
    expect(real.seedCalls()).toBe(1);
    factory.destroy();
    expect(real.runtimeDestroys()).toBe(2);
    expect(() => factory.createMatchBundle({
      schemaVersion: 1,
      generation: 1,
      modeKind: 'duel',
    })).toThrow(/已销毁/u);
  });
});
