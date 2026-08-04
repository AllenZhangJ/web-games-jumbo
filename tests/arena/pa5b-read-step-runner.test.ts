import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNeutralInputFrame,
  type MatchReadFrameV2,
} from '@number-strategy-jump/arena-contracts';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { createArenaV2SurvivalSupplyBotSession } from '@number-strategy-jump/arena-v1-composition';
import { BOT_PROFILE_REGISTRY } from '@number-strategy-jump/arena-bot';
import {
  ARENA_V2_SURVIVAL_SUPPLY_DEFINITION,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_READ_STEP_EVENT_TYPES,
  createArenaReadStepScheduleV2,
  readArenaFullAuditAtCurrentV2,
  runArenaReadStepV2,
} from '../../scripts/lib/arena-read-step-runner-v2.js';
import { createMatchReadBotBundleV2 } from '../../packages/arena-session/src/bot-match-read-bundle.js';
import {
  LocalMatchSession,
  type BotInputController,
} from '../../packages/arena-session/src/local-match-session.js';

function ordinaryCore(seed: number) {
  return createArenaV1MatchCore({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 60, hardLimitTicks: 120 },
  });
}

const FORMAL_SUPPLY_SPECS = Object.freeze([
  Object.freeze({
    slotId: 'left',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
    spawnId: 'pa5b-runner-left',
    position: Object.freeze({ x: -3, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'center',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'pa5b-runner-center',
    position: Object.freeze({ x: 0, y: 1, z: 0 }),
  }),
  Object.freeze({
    slotId: 'right',
    equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'pa5b-runner-right',
    position: Object.freeze({ x: 3, y: 1, z: 0 }),
  }),
]);

function formalSession(seed: number) {
  return createArenaV2SurvivalSupplyBotSession({
    seed,
    config: { preparingTicks: 0, suddenDeathStartTick: 1_800, hardLimitTicks: 2_500 },
    supply: {
      supplyDefinitionId: ARENA_V2_SURVIVAL_SUPPLY_DEFINITION.id,
      spawnSpecs: FORMAL_SUPPLY_SPECS,
    },
    bot: {
      participantId: 'player-2',
      difficultyId: 'normal',
      behaviorSeed: 0x12003456,
      personalitySeed: 0x5600789a,
      profileRegistry: BOT_PROFILE_REGISTRY,
    },
    publicMatchInfo: {
      matchSeed: seed,
      opponent: {
        id: 'formal-runner-bot',
        displayName: 'Formal runner bot',
        portraitKey: 'formal-runner-portrait',
        appearanceKey: 'formal-runner-appearance',
      },
    },
  });
}

function createController(): BotInputController {
  let reader: { read(): unknown } | null = null;
  return {
    createInput(snapshot) {
      return createNeutralInputFrame(snapshot.tick, 'player-2');
    },
    attachTrustedCommandSourceReader(candidate) {
      reader = candidate as { read(): unknown };
      return true;
    },
    createInputFromTrustedCommandSource() {
      if (reader === null) throw new Error('trusted reader missing');
      const source = reader.read() as { commandTick: number };
      return createNeutralInputFrame(source.commandTick, 'player-2');
    },
    destroy() {},
  };
}

function createCountingAuditPort(session: LocalMatchSession) {
  let fullAuditReads = 0;
  return {
    port: {
      getPresentationReadFrame: session.getPresentationReadFrame.bind(session),
      stepWithPresentationReadFrame: session.stepWithPresentationReadFrame.bind(session),
      getLegacyFullSnapshotForAudit: session.getLegacyFullSnapshotForAudit.bind(session),
      readFullAuditForEvidence: () => {
        fullAuditReads += 1;
        return session.readFullAuditForEvidence();
      },
    },
    readCount: () => fullAuditReads,
  };
}

type FullAuditResult = ReturnType<LocalMatchSession['readFullAuditForEvidence']>;

function tamperWorld(
  result: FullAuditResult,
  mutate: (world: FullAuditResult['worldSnapshot']) => Record<string, unknown>,
): FullAuditResult {
  return Object.freeze({
    ...result,
    worldSnapshot: Object.freeze({
      ...result.worldSnapshot,
      ...mutate(result.worldSnapshot),
    }),
  });
}

function tamperParticipant(world: FullAuditResult['worldSnapshot']): Record<string, unknown> {
  const participant = world.participants[0];
  assert.ok(participant);
  return {
    participants: Object.freeze(world.participants.map((candidate, index) => (
      index === 0
        ? Object.freeze({
          ...candidate,
          position: Object.freeze({ ...candidate.position, x: candidate.position.x + 1 }),
        })
        : candidate
    ))),
  };
}

function tamperEquipment(world: FullAuditResult['worldSnapshot']): Record<string, unknown> {
  const equipment = world.equipment[0];
  assert.ok(equipment, 'ordinary full-audit world 必须包含可篡改 equipment。');
  return {
    equipment: Object.freeze(world.equipment.map((candidate, index) => (
      index === 0
        ? Object.freeze({ ...candidate, spawnId: `${candidate.spawnId}-tampered` })
        : candidate
    ))),
  };
}

function tamperMap(world: FullAuditResult['worldSnapshot']): Record<string, unknown> {
  const surface = world.map.surfaces[0];
  assert.ok(surface);
  return {
    map: Object.freeze({
      ...world.map,
      surfaces: Object.freeze(world.map.surfaces.map((candidate, index) => (
        index === 0 ? Object.freeze({ ...candidate, id: `${candidate.id}-tampered` }) : candidate
      ))),
    }),
  };
}

function tamperSupply(world: FullAuditResult['worldSnapshot']): Record<string, unknown> {
  const projection = world.activeSupplyProjection;
  assert.ok(projection, 'formal full-audit world 必须包含 supply projection。');
  return {
    activeSupplyProjection: Object.freeze({
      ...projection,
      pendingAuthorityTick: projection.pendingAuthorityTick === null
        ? 1
        : projection.pendingAuthorityTick + 1,
    }),
  };
}

function frame(tick: number, phase: string): MatchReadFrameV2 {
  return Object.freeze({
    schemaVersion: 2,
    worldSnapshot: Object.freeze({ tick, eventSequence: tick, phase }),
    localActionSidecar: Object.freeze({
      schemaVersion: 2,
      tick,
      eventSequence: tick,
      participantId: 'player-1',
      profile: 'local-context-primary',
    }),
  }) as unknown as MatchReadFrameV2;
}

test('PA5b runner schedules tick0/interval/phase/event once per stable tick', () => {
  const schedule = createArenaReadStepScheduleV2();
  assert.deepEqual(schedule.initial(frame(0, 'preparing')), {
    tick: 0,
    reasons: ['tick0'],
  });
  assert.equal(schedule.initial(frame(0, 'preparing')), null);
  assert.deepEqual(schedule.afterStep(frame(59, 'running'), frame(60, 'running'), []), {
    tick: 60,
    reasons: ['interval-60'],
  });
  assert.equal(schedule.afterStep(frame(59, 'running'), frame(60, 'running'), [{ type: 'event' } as never]), null);
  assert.deepEqual(schedule.afterStep(frame(60, 'running'), frame(61, 'sudden-death'), []), {
    tick: 61,
    reasons: ['phase-transition'],
  });
  assert.equal(schedule.afterStep(frame(60, 'running'), frame(61, 'sudden-death'), [{ type: 'event' } as never]), null);

  const eventSchedule = createArenaReadStepScheduleV2();
  const event = (type: string): never => ({ type } as never);
  const allEvents = ARENA_READ_STEP_EVENT_TYPES.map(event);
  assert.deepEqual(
    eventSchedule.afterStep(frame(1, 'running'), frame(2, 'running'), allEvents),
    { tick: 2, reasons: ARENA_READ_STEP_EVENT_TYPES.map((type) => `event:${type}`) },
  );
  const unknownSchedule = createArenaReadStepScheduleV2();
  assert.equal(
    unknownSchedule.afterStep(frame(2, 'running'), frame(3, 'running'), [event('UnknownEvent')]),
    null,
  );
  const duplicateSchedule = createArenaReadStepScheduleV2();
  assert.deepEqual(
    duplicateSchedule.afterStep(frame(59, 'running'), frame(60, 'running'), [
      event(ARENA_READ_STEP_EVENT_TYPES[0]),
      event(ARENA_READ_STEP_EVENT_TYPES[0]),
    ]),
    { tick: 60, reasons: ['interval-60', 'event:MatchStarted'] },
  );
  for (const tick of [599, 600, 601, 1199, 1200, 1201, 1799, 1800, 1801, 2399, 2400, 2401]) {
    const boundarySchedule = createArenaReadStepScheduleV2();
    const reasons = tick % 60 === 0 ? ['interval-60', `boundary-${tick}`] : [`boundary-${tick}`];
    assert.deepEqual(
      boundarySchedule.afterStep(frame(tick - 1, 'running'), frame(tick, 'running'), []),
      { tick, reasons },
    );
  }
  const endedSchedule = createArenaReadStepScheduleV2();
  assert.deepEqual(
    endedSchedule.afterStep(frame(10, 'running'), frame(11, 'ended'), [event('MatchEnded')]),
    { tick: 11, reasons: ['phase-transition', 'event:MatchEnded', 'match-ended-stable-tick'] },
  );
  assert.equal(endedSchedule.afterStep(frame(11, 'ended'), frame(11, 'ended'), []), null);
});

test('PA5b bundle construction and unscheduled V5 steps perform no full audit', () => {
  const core = ordinaryCore(9509);
  const bundle = createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: {
      schemaVersion: 1,
      compositionId: 'arena-quick-match.v2',
      participantIds: [...core.config.participantIds],
      mapDefinitionId: core.config.mapDefinitionId,
      contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
      compositionContractHash: null,
    },
    localId: 'player-1',
    botId: 'player-2',
  });
  const session = new LocalMatchSession({
    core,
    botController: createController(),
    botMatchReadBundle: bundle,
    publicMatchInfo: {
      matchSeed: 9509,
      opponent: { id: 'opponent-test', displayName: 'Opponent', portraitKey: 'portrait', appearanceKey: 'appearance' },
    },
  });
  const counted = createCountingAuditPort(session);
  try {
    session.start();
    assert.equal(counted.readCount(), 0);
    const noAuditSchedule = Object.freeze({
      initial: () => null,
      afterStep: () => null,
    });
    runArenaReadStepV2({
      session: counted.port,
      schedule: noAuditSchedule,
      playerInput: (current) => createNeutralInputFrame(current.worldSnapshot.tick, 'player-1'),
    });
    assert.equal(counted.readCount(), 0);
  } finally {
    session.destroy();
  }
});

test('PA5b runner uses one real V2 Session step and includes full audit only when scheduled', () => {
  const core = ordinaryCore(9510);
  const bundle = createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: {
      schemaVersion: 1,
      compositionId: 'arena-quick-match.v2',
      participantIds: [...core.config.participantIds],
      mapDefinitionId: core.config.mapDefinitionId,
      contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
      compositionContractHash: null,
    },
    localId: 'player-1',
    botId: 'player-2',
  });
  const session = new LocalMatchSession({
    core,
    botController: createController(),
    botMatchReadBundle: bundle,
    publicMatchInfo: {
      matchSeed: 9510,
      opponent: {
        id: 'opponent-test',
        displayName: 'Opponent',
        portraitKey: 'portrait',
        appearanceKey: 'appearance',
      },
    },
  });
  let now = 0;
  const clock = {
    start: () => now,
    elapsedMicros: (start: unknown) => {
      now += 10;
      return now - (start as number);
    },
  };
  const counted = createCountingAuditPort(session);
  try {
    session.start();
    const schedule = createArenaReadStepScheduleV2();
    const initial = readArenaFullAuditAtCurrentV2({ session: counted.port, schedule, clock });
    assert.equal(counted.readCount(), 1);
    assert.equal(initial.decision.tick, 0);
    assert.equal(initial.measurement.schemaVersion, 2);
    assert.equal(initial.measurement.preFrameReadMicros, 10);
    assert.equal(initial.measurement.playerMapperMicros, 0);
    assert.equal(initial.measurement.botInputAuthorityPostFrameMicros, 0);
    assert.equal(initial.measurement.fullAuditPerformed, true);
    assert.equal(initial.measurement.tick, initial.frame.worldSnapshot.tick);
    assert.equal(initial.measurement.eventSequence, initial.frame.worldSnapshot.eventSequence);
    assert.equal(initial.measurement.totalMicros >= initial.measurement.preFrameReadMicros, true);
    let measuredMicros = initial.measurement.totalMicros;
    let differentialCalls = 0;
    const result = runArenaReadStepV2({
      session: counted.port,
      schedule,
      clock,
      playerInput: (current) => createNeutralInputFrame(current.worldSnapshot.tick, 'player-1'),
      differential: (value) => {
        differentialCalls += 1;
        assert.equal(value.postFrame.worldSnapshot.tick, 1);
      },
    });
    measuredMicros += result.measurement.totalMicros;
    assert.equal(result.preFrame.worldSnapshot.tick, 0);
    assert.equal(result.postFrame.worldSnapshot.tick, 1);
    assert.equal(result.input.tick, 0);
    assert.equal(result.input.participantId, 'player-1');
    assert.notEqual(result.fullAudit, null);
    assert.deepEqual(result.auditDecision?.reasons, ['event:MatchStarted', 'event:EquipmentSpawned']);
    assert.equal(result.measurement.fullAuditPerformed, true);
    assert.equal(result.measurement.tick, 1);
    assert.equal(result.measurement.botInputAuthorityPostFrameMicros > 0, true);
    assert.equal(counted.readCount(), 2);
    assert.equal(differentialCalls, 1);
    assert.equal(measuredMicros > result.measurement.totalMicros, true);
  } finally {
    session.destroy();
  }
});

test('PA5b formal production Session uses the same timed recomposition path', () => {
  const session = formalSession(9512);
  let now = 0;
  const clock = {
    start: () => now,
    elapsedMicros: (start: unknown) => {
      now += 10;
      return now - (start as number);
    },
  };
  try {
    session.start();
    const schedule = createArenaReadStepScheduleV2();
    const initial = readArenaFullAuditAtCurrentV2({ session, schedule, clock });
    assert.equal(initial.fullAudit.worldSnapshot.activeSupplyProjection === null, false);
    const result = runArenaReadStepV2({
      session,
      schedule,
      clock,
      playerInput: (current) => createNeutralInputFrame(current.worldSnapshot.tick, 'player-1'),
    });
    assert.equal(result.fullAudit !== null, true);
    assert.equal(result.measurement.fullAuditPerformed, true);
    assert.equal(result.postFrame.worldSnapshot.activeSupplyProjection === null, false);
    assert.equal(result.postFrame.worldSnapshot.tick, 1);
  } finally {
    session.destroy();
  }
});

test('PA5b paused and ended evidence keeps stable identities and refuses duplicate audit claims', () => {
  const core = createArenaV1MatchCore({
    seed: 9513,
    config: { preparingTicks: 0, suddenDeathStartTick: 1, hardLimitTicks: 2 },
  });
  const bundle = createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: {
      schemaVersion: 1,
      compositionId: 'arena-quick-match.v2',
      participantIds: [...core.config.participantIds],
      mapDefinitionId: core.config.mapDefinitionId,
      contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
      compositionContractHash: null,
    },
    localId: 'player-1',
    botId: 'player-2',
  });
  const session = new LocalMatchSession({
    core,
    botController: createController(),
    botMatchReadBundle: bundle,
    publicMatchInfo: {
      matchSeed: 9513,
      opponent: { id: 'opponent-test', displayName: 'Opponent', portraitKey: 'portrait', appearanceKey: 'appearance' },
    },
  });
  try {
    session.start();
    const beforePause = session.getPresentationReadFrame();
    session.setPaused(true);
    const paused = session.stepWithPresentationReadFrame(null);
    assert.strictEqual(paused.readFrame, beforePause);
    assert.deepEqual(paused.events, []);
    session.setPaused(false);
    const result = runArenaReadStepV2({
      session,
      schedule: Object.freeze({ initial: () => null, afterStep: () => null }),
      playerInput: (current) => createNeutralInputFrame(current.worldSnapshot.tick, 'player-1'),
    });
    assert.equal(result.postFrame.worldSnapshot.tick, 1);
    const terminal = runArenaReadStepV2({
      session,
      schedule: Object.freeze({ initial: () => null, afterStep: () => null }),
      playerInput: (current) => createNeutralInputFrame(current.worldSnapshot.tick, 'player-1'),
    });
    assert.equal(terminal.postFrame.worldSnapshot.phase, 'ended');
    const ended = session.getPresentationReadFrame();
    assert.strictEqual(ended, terminal.postFrame);
    const endedSchedule = createArenaReadStepScheduleV2();
    assert.deepEqual(
      endedSchedule.afterStep(terminal.preFrame, ended, []),
      { tick: 2, reasons: ['phase-transition', 'match-ended-stable-tick'] },
    );
    assert.equal(endedSchedule.afterStep(ended, ended, []), null);
  } finally {
    session.destroy();
  }
});

test('PA5b mandatory recomposition rejects sidecar order and valid-shape field tampering', () => {
  const core = ordinaryCore(9511);
  const bundle = createMatchReadBotBundleV2({
    ownedNewCore: core,
    descriptor: {
      schemaVersion: 1,
      compositionId: 'arena-quick-match.v2',
      participantIds: [...core.config.participantIds],
      mapDefinitionId: core.config.mapDefinitionId,
      contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
      compositionContractHash: null,
    },
    localId: 'player-1',
    botId: 'player-2',
  });
  const session = new LocalMatchSession({
    core,
    botController: createController(),
    botMatchReadBundle: bundle,
    publicMatchInfo: {
      matchSeed: 9511,
      opponent: { id: 'opponent-test', displayName: 'Opponent', portraitKey: 'portrait', appearanceKey: 'appearance' },
    },
  });
  try {
    session.start();
    const fullAudit = session.readFullAuditForEvidence.bind(session);
    const basePort = {
      getPresentationReadFrame: session.getPresentationReadFrame.bind(session),
      stepWithPresentationReadFrame: session.stepWithPresentationReadFrame.bind(session),
      getLegacyFullSnapshotForAudit: session.getLegacyFullSnapshotForAudit.bind(session),
    };
    const swappedPort = {
      ...basePort,
      readFullAuditForEvidence: () => {
        const result = fullAudit();
        return Object.freeze({
          ...result,
          sidecars: Object.freeze([result.sidecars[1]!, result.sidecars[0]!]),
        });
      },
    };
    assert.throws(
      () => readArenaFullAuditAtCurrentV2({ session: swappedPort, schedule: createArenaReadStepScheduleV2() }),
      /identity|participant|recomposition/,
    );
    const tamperedPort = {
      ...basePort,
      readFullAuditForEvidence: () => {
        const result = fullAudit();
        const first = result.sidecars[0]!;
        const tampered = Object.freeze({
          ...first,
          channels: Object.freeze({
            ...first.channels,
            primary: Object.freeze({ ...first.channels.primary, reason: 'tampered-but-valid-shape' }),
          }),
        });
        return Object.freeze({
          ...result,
          sidecars: Object.freeze([tampered, result.sidecars[1]!]),
        });
      },
    };
    assert.throws(
      () => readArenaFullAuditAtCurrentV2({ session: tamperedPort, schedule: createArenaReadStepScheduleV2() }),
      /recomposition|字段值不一致/,
    );
  } finally {
    session.destroy();
  }
});

test('PA5b full-audit world parity rejects current and post nested tampering', () => {
  const currentSession = ordinaryCore(9514);
  const currentBundle = createMatchReadBotBundleV2({
    ownedNewCore: currentSession,
    descriptor: {
      schemaVersion: 1,
      compositionId: 'arena-quick-match.v2',
      participantIds: [...currentSession.config.participantIds],
      mapDefinitionId: currentSession.config.mapDefinitionId,
      contentSelectionHash: currentSession.config.contentSelection?.contentHash ?? null,
      compositionContractHash: null,
    },
    localId: 'player-1',
    botId: 'player-2',
  });
  const currentLocalSession = new LocalMatchSession({
    core: currentSession,
    botController: createController(),
    botMatchReadBundle: currentBundle,
    publicMatchInfo: {
      matchSeed: 9514,
      opponent: { id: 'opponent-test', displayName: 'Opponent', portraitKey: 'portrait', appearanceKey: 'appearance' },
    },
  });
  try {
    currentLocalSession.start();
    const originalRead = currentLocalSession.readFullAuditForEvidence.bind(currentLocalSession);
    const currentMutations = [
      (world: FullAuditResult['worldSnapshot']) => ({ remainingTicks: world.remainingTicks + 7 }),
      tamperParticipant,
      tamperEquipment,
      tamperMap,
    ];
    for (const mutation of currentMutations) {
      assert.throws(
        () => readArenaFullAuditAtCurrentV2({
          session: {
            getPresentationReadFrame: currentLocalSession.getPresentationReadFrame.bind(currentLocalSession),
            stepWithPresentationReadFrame: currentLocalSession.stepWithPresentationReadFrame.bind(currentLocalSession),
            getLegacyFullSnapshotForAudit: currentLocalSession.getLegacyFullSnapshotForAudit.bind(currentLocalSession),
            readFullAuditForEvidence: () => tamperWorld(originalRead(), mutation),
          },
          schedule: createArenaReadStepScheduleV2(),
        }),
        /full-audit world|字段值不一致|recomposition/,
      );
    }
  } finally {
    currentLocalSession.destroy();
  }

  const formal = formalSession(9515);
  try {
    formal.start();
    const originalRead = formal.readFullAuditForEvidence.bind(formal);
    assert.throws(
      () => readArenaFullAuditAtCurrentV2({
        session: {
          getPresentationReadFrame: formal.getPresentationReadFrame.bind(formal),
          stepWithPresentationReadFrame: formal.stepWithPresentationReadFrame.bind(formal),
          getLegacyFullSnapshotForAudit: formal.getLegacyFullSnapshotForAudit.bind(formal),
          readFullAuditForEvidence: () => tamperWorld(originalRead(), tamperSupply),
        },
        schedule: createArenaReadStepScheduleV2(),
      }),
      /full-audit world|字段值不一致|recomposition/,
    );
  } finally {
    formal.destroy();
  }

  const postMutations = [
    (world: FullAuditResult['worldSnapshot']) => ({ remainingTicks: world.remainingTicks + 7 }),
    tamperParticipant,
    tamperEquipment,
    tamperMap,
  ];
  for (const [index, mutation] of postMutations.entries()) {
    const seed = 9516 + index;
    const core = ordinaryCore(seed);
    const bundle = createMatchReadBotBundleV2({
      ownedNewCore: core,
      descriptor: {
        schemaVersion: 1,
        compositionId: 'arena-quick-match.v2',
        participantIds: [...core.config.participantIds],
        mapDefinitionId: core.config.mapDefinitionId,
        contentSelectionHash: core.config.contentSelection?.contentHash ?? null,
        compositionContractHash: null,
      },
      localId: 'player-1',
      botId: 'player-2',
    });
    const session = new LocalMatchSession({
      core,
      botController: createController(),
      botMatchReadBundle: bundle,
      publicMatchInfo: {
        matchSeed: seed,
        opponent: { id: 'opponent-test', displayName: 'Opponent', portraitKey: 'portrait', appearanceKey: 'appearance' },
      },
    });
    try {
      session.start();
      const originalRead = session.readFullAuditForEvidence.bind(session);
      assert.throws(
        () => runArenaReadStepV2({
          session: {
            getPresentationReadFrame: session.getPresentationReadFrame.bind(session),
            stepWithPresentationReadFrame: session.stepWithPresentationReadFrame.bind(session),
            getLegacyFullSnapshotForAudit: session.getLegacyFullSnapshotForAudit.bind(session),
            readFullAuditForEvidence: () => tamperWorld(originalRead(), mutation),
          },
          schedule: Object.freeze({
            initial: () => null,
            afterStep: () => ({ tick: 1, reasons: ['forced-nested-tamper'] }),
          }),
          playerInput: (current) => createNeutralInputFrame(current.worldSnapshot.tick, 'player-1'),
        }),
        /full-audit world|字段值不一致|recomposition/,
      );
    } finally {
      session.destroy();
    }
  }
});
