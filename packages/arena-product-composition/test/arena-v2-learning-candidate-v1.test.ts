import { describe, expect, it } from 'vitest';
import {
  ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
  createMatchContentSelectionV2,
} from '@number-strategy-jump/arena-contracts';
import { RACE_MODE_PREPARING_TICKS_V1 } from '@number-strategy-jump/arena-definitions';
import { createProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaV2LearningEvidenceDefinitionV1,
  createArenaV2LearningCapacityReportV1,
  resolveArenaV2NextLearningGoalV1,
  resolveArenaV2MatchLearningGrantV1,
  resolveArenaV2ReplayLearningGrantV1,
} from '@number-strategy-jump/arena-product-progression';
import {
  ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
  ArenaV2LearningTerminalHandoffCandidateV1,
} from '../src/index.js';
import { ArenaV2LearningProfileRepositoryV1 } from '@number-strategy-jump/arena-profile-persistence';
import { ArenaV2LearningProfileServiceV1 } from '@number-strategy-jump/arena-profile-service';

const PARTICIPANTS = Object.freeze(['p1', 'p2']);
const WEAPON = ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1[0]!;
const SECOND_WEAPON = ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1[1]!;
const MODE_ID = ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel;
const RACE_FIRST_ACTIVE_TICK = RACE_MODE_PREPARING_TICKS_V1;
const RACE_END_TICK = RACE_FIRST_ACTIVE_TICK + 10;

function result(
  matchSeed = 7,
  reason: 'last-participant-standing' | 'timeout-draw' = 'timeout-draw',
  usedEquipment: Readonly<{
    p1: readonly string[];
    p2: readonly string[];
  }> = { p1: [WEAPON.equipment.id], p2: [] },
) {
  const content = createMatchContentSelectionV2({
    schemaVersion: 2,
    modeDefinitionId: MODE_ID,
    contentDefinitionId: 'arena-v2.learning.test-content.v1',
    contentVersion: 1,
    characterDefinitionIds: ['character.p1', 'character.p2'],
    equipmentDefinitionIds: ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1
      .map(({ equipment }) => equipment.id).sort(),
    mapDefinitionIds: [ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID],
    selectedMapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    participantCharacters: PARTICIPANTS.map((participantId) => ({
      participantId,
      definitionId: `character.${participantId}`,
    })),
  });
  return createProductMatchResultV3({
    schemaVersion: 3,
    modeDefinitionId: MODE_ID,
    matchSeed,
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: '1234abcd',
    },
    content,
    participantAssignments: PARTICIPANTS.map((participantId) => ({
      participantId,
      modeRole: 'competitor',
      teamId: null,
      slotId: null,
      slotGeneration: 0,
    })),
    participantEquipmentUsage: [{
      participantId: 'p1',
      usedCollectionEquipmentDefinitionIds: usedEquipment.p1,
    }, {
      participantId: 'p2',
      usedCollectionEquipmentDefinitionIds: usedEquipment.p2,
    }],
    modeResult: {
      kind: 'duel',
      winnerParticipantIds: reason === 'timeout-draw' ? [] : ['p1'],
      isDraw: reason === 'timeout-draw',
      reason,
      endedAtTick: 10,
    },
    publicParticipants: PARTICIPANTS.map((participantId, index) => ({
      participantId,
      displayName: `P${index + 1}`,
      portraitKey: `portrait.${index + 1}`,
      appearanceKey: `appearance.${index + 1}`,
      identityOrdinal: index + 1,
      identityGlyphKey: `glyph.${index + 1}`,
      identityPatternKey: `pattern.${index + 1}`,
    })),
  });
}

function raceResult(
  reason: 'finish-claimed' | 'no-finisher',
  recipientProgressOrdinal: number,
  finisherParticipantId: 'p1' | 'p2' = 'p2',
) {
  const modeDefinitionId = ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race;
  const content = createMatchContentSelectionV2({
    schemaVersion: 2,
    modeDefinitionId,
    contentDefinitionId: 'arena-v2.learning.race-test-content.v1',
    contentVersion: 1,
    characterDefinitionIds: ['character.p1', 'character.p2'],
    equipmentDefinitionIds: ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1
      .map(({ equipment }) => equipment.id).sort(),
    mapDefinitionIds: [ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID],
    selectedMapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    participantCharacters: PARTICIPANTS.map((participantId) => ({
      participantId,
      definitionId: `character.${participantId}`,
    })),
  });
  const finishClaimed = reason === 'finish-claimed';
  const recipientFinished = finishClaimed && finisherParticipantId === 'p1';
  const opponentFinished = finishClaimed && finisherParticipantId === 'p2';
  return createProductMatchResultV3({
    schemaVersion: 3,
    modeDefinitionId,
    matchSeed: finishClaimed ? 17 : 18,
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: finishClaimed ? '2345bcde' : '3456cdef',
    },
    content,
    participantAssignments: PARTICIPANTS.map((participantId) => ({
      participantId,
      modeRole: 'competitor',
      teamId: null,
      slotId: null,
      slotGeneration: 0,
    })),
    participantEquipmentUsage: [{
      participantId: 'p1',
      usedCollectionEquipmentDefinitionIds: [WEAPON.equipment.id],
    }, {
      participantId: 'p2',
      usedCollectionEquipmentDefinitionIds: [],
    }],
    modeResult: {
      kind: 'race',
      winnerParticipantIds: finishClaimed ? [finisherParticipantId] : [],
      rankings: [{
        participantId: 'p1',
        rank: recipientFinished ? 1 : finishClaimed ? 2 : 1,
        finishTick: recipientFinished ? RACE_END_TICK : null,
        progressOrdinal: recipientFinished ? 13 : recipientProgressOrdinal,
      }, {
        participantId: 'p2',
        rank: opponentFinished ? 1 : finishClaimed || recipientProgressOrdinal > 0 ? 2 : 1,
        finishTick: opponentFinished ? RACE_END_TICK : null,
        progressOrdinal: opponentFinished ? 13 : 0,
      }],
      reason,
      endedAtTick: RACE_END_TICK,
    },
    publicParticipants: PARTICIPANTS.map((participantId, index) => ({
      participantId,
      displayName: `P${index + 1}`,
      portraitKey: `portrait.${index + 1}`,
      appearanceKey: `appearance.${index + 1}`,
      identityOrdinal: index + 1,
      identityGlyphKey: `glyph.${index + 1}`,
      identityPatternKey: `pattern.${index + 1}`,
    })),
  });
}

function raceEvents(matchResult: ReturnType<typeof raceResult>) {
  const ground = WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
  const events: Record<string, unknown>[] = [{
    id: 'race-event.0', sequence: 0, tick: 0, type: 'MatchStarted',
    modeDefinitionId: matchResult.modeDefinitionId, participantIds: PARTICIPANTS,
  }, {
    id: 'race-event.1', sequence: 1, tick: 1, type: 'ActionStarted',
    participantId: 'p1', action: ground.actionDefinitionId, sourceKind: 'equipment',
    equipmentInstanceId: 'equipment.instance.race.1',
    runtimeEquipmentDefinitionId: WEAPON.equipment.id,
    collectionEquipmentDefinitionId: WEAPON.equipment.id,
    survivalLevel: null,
  }];
  const recipient = matchResult.modeResult.kind === 'race'
    ? matchResult.modeResult.rankings.find(({ participantId }) => participantId === 'p1')!
    : null;
  if (recipient !== null && recipient.progressOrdinal > 0) {
    events.push({
      id: 'race-event.2', sequence: events.length, tick: RACE_FIRST_ACTIVE_TICK,
      type: 'RaceSafeAnchorCommitted', modeDefinitionId: matchResult.modeDefinitionId,
      participantId: 'p1', anchorId: 'kz-a-route-start', progressOrdinal: 1,
    });
  }
  if (matchResult.modeResult.kind === 'race' && matchResult.modeResult.reason === 'finish-claimed') {
    const finisher = matchResult.modeResult.rankings.find(({ finishTick }) => (
      finishTick !== null
    ));
    if (!finisher) throw new RangeError('Race test result缺少冲线者。');
    events.push({
      id: 'race-event.finish', sequence: events.length, tick: RACE_END_TICK,
      type: 'RaceFinishClaimed', modeDefinitionId: matchResult.modeDefinitionId,
      participantId: finisher.participantId,
      finishTick: RACE_END_TICK,
      progressOrdinal: finisher.progressOrdinal,
    });
  }
  events.push({
    id: 'race-event.end', sequence: events.length, tick: RACE_END_TICK, type: 'MatchEnded',
    modeDefinitionId: matchResult.modeDefinitionId, modeResult: matchResult.modeResult,
  });
  return events;
}

function survivalResult(
  fallCount: 0 | 1 | 2 = 2,
  reason: 'terminal-player-fall' | 'survival-time-cap' = 'terminal-player-fall',
  playerRole: 'player' | 'competitor' = 'player',
  usedCollectionEquipmentDefinitionIds: readonly string[] = [],
) {
  const modeDefinitionId = ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.survival;
  const content = createMatchContentSelectionV2({
    schemaVersion: 2,
    modeDefinitionId,
    contentDefinitionId: 'arena-v2.learning.survival-test-content.v1',
    contentVersion: 1,
    characterDefinitionIds: ['character.p1', 'character.p2'],
    equipmentDefinitionIds: ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1
      .map(({ equipment }) => equipment.id).sort(),
    mapDefinitionIds: [ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID],
    selectedMapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    participantCharacters: PARTICIPANTS.map((participantId) => ({
      participantId,
      definitionId: `character.${participantId}`,
    })),
  });
  return createProductMatchResultV3({
    schemaVersion: 3,
    modeDefinitionId,
    matchSeed: 29,
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: '4567def0',
    },
    content,
    participantAssignments: [{
      participantId: 'p1',
      modeRole: playerRole,
      teamId: null,
      slotId: null,
      slotGeneration: 0,
    }, {
      participantId: 'p2',
      modeRole: playerRole === 'player' ? 'enemy' : 'competitor',
      teamId: null,
      slotId: playerRole === 'player' ? 'survival.enemy-slot.1' : null,
      slotGeneration: playerRole === 'player' ? 1 : 0,
    }],
    participantEquipmentUsage: PARTICIPANTS.map((participantId) => ({
      participantId,
      usedCollectionEquipmentDefinitionIds: participantId === 'p1'
        ? usedCollectionEquipmentDefinitionIds
        : [],
    })),
    modeResult: {
      kind: 'survival',
      playerParticipantId: 'p1',
      survivedTicks: 200,
      pressureStage: 1,
      fallCount,
      reason,
      endedAtTick: 200,
    },
    publicParticipants: PARTICIPANTS.map((participantId, index) => ({
      participantId,
      displayName: `P${index + 1}`,
      portraitKey: `portrait.${index + 1}`,
      appearanceKey: `appearance.${index + 1}`,
      identityOrdinal: index + 1,
      identityGlyphKey: `glyph.${index + 1}`,
      identityPatternKey: `pattern.${index + 1}`,
    })),
  });
}

function terminalSurvivalEvents(matchResult: ReturnType<typeof survivalResult>) {
  return [{
    id: 'survival-event.0', sequence: 0, tick: 0, type: 'MatchStarted',
    modeDefinitionId: matchResult.modeDefinitionId, participantIds: PARTICIPANTS,
  }, {
    id: 'survival-event.fall.1', sequence: 1, tick: 10, type: 'ParticipantFell',
    modeDefinitionId: matchResult.modeDefinitionId,
    participantId: 'p1', modeRole: 'player', slotId: null, slotGeneration: 0,
    fallCause: 'movement', creditedAttackerId: null, supportSurfaceId: 'kz-s01-start',
  }, {
    id: 'survival-event.count.1', sequence: 2, tick: 10,
    type: 'SurvivalPlayerFallCounted', modeDefinitionId: matchResult.modeDefinitionId,
    participantId: 'p1', fallCount: 1, terminalFallCount: 2, terminal: false,
  }, {
    id: 'survival-event.schedule.1', sequence: 3, tick: 10,
    type: 'ParticipantRespawnScheduled', modeDefinitionId: matchResult.modeDefinitionId,
    participantId: 'p1', modeRole: 'player', slotId: null, slotGeneration: 0,
    readyTick: 20, anchorId: 'kz-a-route-start', reason: 'survival-first-fall',
  }, {
    id: 'survival-event.feedback.1', sequence: 4, tick: 10,
    type: 'WeaponFeedbackResolved', kind: 'movement-fall',
    attackerId: null, targetId: 'p1', actionDefinitionId: null,
    actionStartedTick: null, firstHitTick: null, targetFallTick: 10,
    initialSupportSurfaceId: 'kz-s01-start', finalSupportSurfaceId: null,
    fallCause: 'movement', creditedAttackerId: null,
  }, {
    id: 'survival-event.respawn.1', sequence: 5, tick: 20,
    type: 'ParticipantRespawned', modeDefinitionId: matchResult.modeDefinitionId,
    participantId: 'p1', modeRole: 'player', slotId: null, slotGeneration: 0,
    anchorId: 'kz-a-route-start', invulnerableTicks: 120,
  }, {
    id: 'survival-event.fall.2', sequence: 6, tick: 200, type: 'ParticipantFell',
    modeDefinitionId: matchResult.modeDefinitionId,
    participantId: 'p1', modeRole: 'player', slotId: null, slotGeneration: 0,
    fallCause: 'movement', creditedAttackerId: null, supportSurfaceId: 'kz-s01-start',
  }, {
    id: 'survival-event.count.2', sequence: 7, tick: 200,
    type: 'SurvivalPlayerFallCounted', modeDefinitionId: matchResult.modeDefinitionId,
    participantId: 'p1', fallCount: 2, terminalFallCount: 2, terminal: true,
  }, {
    id: 'survival-event.feedback.2', sequence: 8, tick: 200,
    type: 'WeaponFeedbackResolved', kind: 'movement-fall',
    attackerId: null, targetId: 'p1', actionDefinitionId: null,
    actionStartedTick: null, firstHitTick: null, targetFallTick: 200,
    initialSupportSurfaceId: 'kz-s01-start', finalSupportSurfaceId: null,
    fallCause: 'movement', creditedAttackerId: null,
  }, {
    id: 'survival-event.end', sequence: 9, tick: 200, type: 'MatchEnded',
    modeDefinitionId: matchResult.modeDefinitionId, modeResult: matchResult.modeResult,
  }];
}

function storageHarness() {
  const values = new Map<string, unknown>();
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    values,
    port: {
      storageRead(key: string) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown) {
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key: string) {
        values.delete(key);
        return true;
      },
    },
  };
}

function events(
  modeResult: ReturnType<typeof result>['modeResult'],
  feedbackSurfaceId = 'kz-s01-start',
) {
  const ground = WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
  const replay: Record<string, unknown>[] = [{
    id: 'event.0', sequence: 0, tick: 0, type: 'MatchStarted',
    modeDefinitionId: MODE_ID, participantIds: PARTICIPANTS,
  }, {
    id: 'event.1', sequence: 1, tick: 1, type: 'ActionStarted',
    participantId: 'p1', action: ground.actionDefinitionId, sourceKind: 'equipment',
    equipmentInstanceId: 'equipment.instance.1',
    runtimeEquipmentDefinitionId: WEAPON.equipment.id,
    collectionEquipmentDefinitionId: WEAPON.equipment.id,
    survivalLevel: null,
  }];
  const terminalFall = modeResult.kind === 'duel'
    && modeResult.reason === 'last-participant-standing';
  replay.push({
    id: 'event.2', sequence: replay.length, tick: terminalFall ? 10 : 2,
    type: 'WeaponFeedbackResolved',
    kind: terminalFall ? 'hit-ring-out' : 'hit-confirm',
    attackerId: 'p1', targetId: 'p2',
    actionDefinitionId: ground.actionDefinitionId,
    actionStartedTick: 1, firstHitTick: terminalFall ? 10 : 2,
    targetFallTick: terminalFall ? 10 : null,
    initialSupportSurfaceId: feedbackSurfaceId,
    finalSupportSurfaceId: terminalFall ? null : feedbackSurfaceId,
    fallCause: terminalFall ? 'credited-hit' : null,
    creditedAttackerId: terminalFall ? 'p1' : null,
  });
  if (terminalFall) replay.push({
    id: 'event.3', sequence: replay.length, tick: 10, type: 'ParticipantFell',
    modeDefinitionId: MODE_ID, participantId: 'p2', modeRole: 'competitor',
    slotId: null, slotGeneration: 0, fallCause: 'credited-hit',
    creditedAttackerId: 'p1', supportSurfaceId: feedbackSurfaceId,
  });
  replay.push({
    id: 'event.end', sequence: replay.length, tick: 10, type: 'MatchEnded',
    modeDefinitionId: MODE_ID, modeResult,
  });
  return replay;
}

function multiWeaponEvents(
  modeResult: ReturnType<typeof result>['modeResult'],
) {
  const replay = events(modeResult).map((event) => {
    if (event.type === 'ActionStarted') {
      const secondGround = SECOND_WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
      return {
        ...event,
        action: secondGround.actionDefinitionId,
        equipmentInstanceId: 'equipment.instance.2',
        runtimeEquipmentDefinitionId: SECOND_WEAPON.equipment.id,
        collectionEquipmentDefinitionId: SECOND_WEAPON.equipment.id,
      };
    }
    if (event.type === 'WeaponFeedbackResolved' && event.actionDefinitionId !== null) {
      const secondGround = SECOND_WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
      return { ...event, actionDefinitionId: secondGround.actionDefinitionId };
    }
    return event;
  });
  const terminal = replay.pop()!;
  const firstGround = WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
  replay.push({
    id: 'event.first-catalog-action', sequence: replay.length, tick: 3, type: 'ActionStarted',
    participantId: 'p1', action: firstGround.actionDefinitionId, sourceKind: 'equipment',
    equipmentInstanceId: 'equipment.instance.1',
    runtimeEquipmentDefinitionId: WEAPON.equipment.id,
    collectionEquipmentDefinitionId: WEAPON.equipment.id,
    survivalLevel: null,
  }, {
    id: 'event.first-catalog-feedback', sequence: replay.length + 1, tick: 4,
    type: 'WeaponFeedbackResolved', kind: 'hit-confirm',
    attackerId: 'p1', targetId: 'p2',
    actionDefinitionId: firstGround.actionDefinitionId,
    actionStartedTick: 3, firstHitTick: 4, targetFallTick: null,
    initialSupportSurfaceId: 'kz-s02-landing',
    finalSupportSurfaceId: 'kz-s02-landing', fallCause: null,
    creditedAttackerId: null,
  }, {
    ...terminal,
    sequence: replay.length + 2,
  });
  return replay;
}

function cancelledActionEvents(modeResult: ReturnType<typeof result>['modeResult']) {
  const ground = WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
  const replay: Record<string, unknown>[] = [{
    id: 'cancelled.0', sequence: 0, tick: 0, type: 'MatchStarted',
    modeDefinitionId: MODE_ID, participantIds: PARTICIPANTS,
  }, {
    id: 'cancelled.1', sequence: 1, tick: 1, type: 'ActionStarted',
    participantId: 'p1', action: ground.actionDefinitionId, sourceKind: 'equipment',
    equipmentInstanceId: 'equipment.instance.cancelled.1',
    runtimeEquipmentDefinitionId: WEAPON.equipment.id,
    collectionEquipmentDefinitionId: WEAPON.equipment.id,
    survivalLevel: null,
  }];
  if (modeResult.kind === 'duel' && modeResult.reason === 'last-participant-standing') {
    replay.push({
      id: 'cancelled.fall', sequence: replay.length, tick: 10, type: 'ParticipantFell',
      modeDefinitionId: MODE_ID, participantId: 'p2', modeRole: 'competitor',
      slotId: null, slotGeneration: 0, fallCause: 'movement',
      creditedAttackerId: null, supportSurfaceId: 'kz-s01-start',
    }, {
      id: 'cancelled.feedback', sequence: replay.length + 1, tick: 10,
      type: 'WeaponFeedbackResolved', kind: 'movement-fall',
      attackerId: null, targetId: 'p2', actionDefinitionId: null,
      actionStartedTick: null, firstHitTick: null, targetFallTick: 10,
      initialSupportSurfaceId: 'kz-s01-start', finalSupportSurfaceId: null,
      fallCause: 'movement', creditedAttackerId: null,
    });
  }
  replay.push({
    id: 'cancelled.end', sequence: replay.length, tick: 10, type: 'MatchEnded',
    modeDefinitionId: MODE_ID, modeResult,
  });
  return replay;
}

function evadedActionEvents(modeResult: ReturnType<typeof result>['modeResult']) {
  const replay = events(modeResult);
  return replay.map((event) => event.type === 'WeaponFeedbackResolved' ? {
    ...event,
    kind: 'attack-evaded',
    targetId: null,
    firstHitTick: null,
    initialSupportSurfaceId: null,
    finalSupportSurfaceId: null,
  } : event);
}

describe('Arena V2 P6 composed learning candidate', () => {
  it('binds every current map segment to one unique authority safe anchor', () => {
    expect(ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.racePreparingTicks)
      .toBe(RACE_MODE_PREPARING_TICKS_V1);
    for (const map of ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.mapBindings) {
      const safeAnchorIds = map.segments.map(({ safeAnchorId }) => safeAnchorId);
      expect(safeAnchorIds.every((safeAnchorId) => typeof safeAnchorId === 'string')).toBe(true);
      expect(new Set(safeAnchorIds).size).toBe(map.segments.length);
      expect(map.raceStartAnchorIds).toHaveLength(4);
    }
    expect(() => createArenaV2LearningEvidenceDefinitionV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      {
        schemaVersion: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.schemaVersion,
        status: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.status,
        hardGate: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.hardGate,
        racePreparingTicks: RACE_MODE_PREPARING_TICKS_V1 - 1,
        weaponBindings: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.weaponBindings,
        mapBindings: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.mapBindings,
      },
    )).toThrow(/准备期必须精确/);
  });

  it('binds every learning action to one runtime weapon, mode set and Survival level', () => {
    for (const weapon of ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1.weaponBindings) {
      expect(weapon.actionBindings).toBeDefined();
      type ActionBinding = NonNullable<typeof weapon.actionBindings>[number];
      const runtimeGroups = new Map<string, ActionBinding[]>();
      for (const binding of weapon.actionBindings!) {
        runtimeGroups.set(
          binding.runtimeEquipmentDefinitionId,
          [...(runtimeGroups.get(binding.runtimeEquipmentDefinitionId) ?? []), binding],
        );
      }
      expect(runtimeGroups.get(weapon.weaponDefinitionId)?.map(({ context }) => context).sort())
        .toEqual(['aerial', 'ground']);
      expect(runtimeGroups.get(weapon.weaponDefinitionId)?.every((binding) => (
        binding.survivalLevel === null
        && binding.modeKinds.join('|') === 'duel|race'
      ))).toBe(true);
      const survivalLevels = [...runtimeGroups.values()].flatMap((bindings) => (
        bindings[0]!.survivalLevel === null ? [] : [bindings[0]!.survivalLevel]
      )).sort((left, right) => left - right);
      expect(survivalLevels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });

  it('preserves Race start-anchor order instead of canonicalizing spawn positions', () => {
    const definition = ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1;
    const reversedFirstMapStarts = [...definition.mapBindings[0]!.raceStartAnchorIds!]
      .reverse();
    const reordered = createArenaV2LearningEvidenceDefinitionV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      {
        schemaVersion: definition.schemaVersion,
        status: definition.status,
        hardGate: definition.hardGate,
        racePreparingTicks: definition.racePreparingTicks,
        weaponBindings: definition.weaponBindings,
        mapBindings: definition.mapBindings.map((map, index) => ({
          mapDefinitionId: map.mapDefinitionId,
          raceStartAnchorIds: index === 0
            ? reversedFirstMapStarts
            : map.raceStartAnchorIds,
          segments: map.segments,
        })),
      },
    );
    expect(reordered.mapBindings[0]!.raceStartAnchorIds).toEqual(reversedFirstMapStarts);
  });

  it('keeps legacy learning evidence canonical and rejects partial anchor upgrades', () => {
    const definition = ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1;
    const legacyInput = {
      schemaVersion: definition.schemaVersion,
      status: definition.status,
      hardGate: definition.hardGate,
      weaponBindings: definition.weaponBindings,
      mapBindings: definition.mapBindings.map((map) => ({
        mapDefinitionId: map.mapDefinitionId,
        segments: map.segments.map(({ safeAnchorId: _safeAnchorId, ...segment }) => segment),
      })),
    };
    const legacy = createArenaV2LearningEvidenceDefinitionV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      legacyInput,
    );
    expect(legacy.mapBindings.every((map) => map.segments.every((segment) => (
      !Object.hasOwn(segment, 'safeAnchorId')
    )))).toBe(true);
    expect(() => createArenaV2LearningEvidenceDefinitionV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      {
        ...legacyInput,
        mapBindings: legacyInput.mapBindings.map((map, mapIndex) => ({
          ...map,
          segments: map.segments.map((segment, segmentIndex) => (
            mapIndex === 0 && segmentIndex === 0
              ? { ...segment, safeAnchorId: 'partial-anchor' }
              : segment
          )),
        })),
      },
    )).toThrow(/全部提供safeAnchorId/);
  });

  it('keeps the implemented static 200h capacity separate from longitudinal evidence', () => {
    const report = createArenaV2LearningCapacityReportV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
    );
    expect(report.implementedCatalog.totalHours).toBe(200);
    expect(report.plannedBaseline.totalHours).toBe(200);
    expect(report.implementedCatalog.mapSegmentCount).toBe(20);
    expect(report.plannedBaseline.mapSegmentCount).toBe(20);
    expect(report.weaponSensitivity.every(({ mapSegmentCount }) => (
      mapSegmentCount === 20
    ))).toBe(true);
    expect(report.weaponSensitivity.map(({ totalHours }) => totalHours)).toEqual([120, 200, 280]);
    expect(report).toMatchObject({
      longitudinalEvidence: 'not-run',
      duplicateDropMinutes: 0,
      waitingMinutes: 0,
    });
  });

  it('starts with one actionable map goal instead of parallel task clutter', () => {
    const profile = {
      schemaVersion: 1,
      profileDefinitionId: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.id,
      profileDefinitionContentVersion:
        ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.contentVersion,
      profileId: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.defaultProfileId,
      revision: 0,
      committedGrantIds: [],
      collections: { weaponDefinitionIds: [], mapDefinitionIds: [] },
      weaponMastery: [],
      mapSegmentMastery: [],
      modeRecords: [],
      challenges: [],
    };
    expect(resolveArenaV2NextLearningGoalV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      profile,
    })).toMatchObject({
      kind: 'collect-map',
      currentProgress: 0,
      targetProgress: 1,
      actionLabel: '竞速亲自冲线，或完成1v1/生存来收藏地图',
    });
  });

  it('derives ground, segment and cross-challenge evidence from a closed V6 replay', () => {
    const matchResult = result();
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: events(matchResult.modeResult),
    });
    expect(grant.weaponDeltas[0]).toMatchObject({
      weaponDefinitionId: WEAPON.equipment.id,
      contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
    });
    expect(grant.mapSegmentDeltas[0]).toMatchObject({
      segmentDefinitionId: 'kz-segment-01-platform',
      completionEvidenceDelta: 1,
    });
    expect(grant.challengeDeltas).toContainEqual({
      challengeDefinitionId: 'arena-v2.learning.cross-01.candidate.v1',
      progressDelta: 1,
    });
  });

  it('commits the complete effective multi-weapon fact set once while keeping one featured weapon', () => {
    const usedWeaponIds = [WEAPON.equipment.id, SECOND_WEAPON.equipment.id].sort();
    const matchResult = result(19, 'timeout-draw', { p1: usedWeaponIds, p2: [] });
    const replay = multiWeaponEvents(matchResult.modeResult);
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: replay,
    });
    expect(grant.weaponDeltas.map(({ weaponDefinitionId }) => weaponDefinitionId))
      .toEqual(usedWeaponIds);
    expect(grant.weaponDeltas.filter(({ useCountDelta }) => useCountDelta === 1))
      .toHaveLength(1);
    expect(grant.weaponDeltas.find(({ useCountDelta }) => useCountDelta === 1))
      .toMatchObject({ weaponDefinitionId: SECOND_WEAPON.equipment.id });
    expect(grant.weaponDeltas.every(({ contextEvidence }) => (
      contextEvidence.some(({ context }) => context === 'ground')
    ))).toBe(true);

    const storage = storageHarness();
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage: storage.port,
      ownerId: 'owner.p6.multi-weapon.test',
      wallNow: () => 1_000,
      keyPrefix: 'arena.p6.multi-weapon.test',
    });
    const service = new ArenaV2LearningProfileServiceV1({
      definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      repository,
    });
    service.open();
    const committed = service.commitGrant(grant);
    expect(committed).toMatchObject({ committed: true, duplicate: false });
    const committedRecords = usedWeaponIds.map((weaponDefinitionId) => (
      committed.profile.weaponMastery.find((entry) => (
        entry.weaponDefinitionId === weaponDefinitionId
      ))
    ));
    expect(committedRecords.every((entry) => entry !== undefined)).toBe(true);
    expect(committedRecords.map((entry) => entry!.useCount).sort()).toEqual([0, 1]);
    expect(committedRecords.every((entry) => (
      entry!.contexts.find(({ context }) => context === 'ground')!.evidenceCount === 1
    ))).toBe(true);

    const duplicate = service.commitGrant(grant);
    expect(duplicate).toMatchObject({ committed: false, duplicate: true });
    expect(duplicate.profile).toEqual(committed.profile);
    expect(duplicate.profile.revision).toBe(1);
    expect(duplicate.profile.committedGrantIds.filter((id) => id === grant.grantId))
      .toHaveLength(1);
    service.destroy();

    const incompleteResult = result(19, 'timeout-draw', {
      p1: [WEAPON.equipment.id],
      p2: [],
    });
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: incompleteResult,
      recipientParticipantId: 'p1',
      events: replay,
    })).toThrow(/武器使用摘要不一致/u);
  });

  it('does not award a cross-challenge when the required weapon acts on another segment', () => {
    const matchResult = result();
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: events(matchResult.modeResult, 'kz-s02-landing'),
    });
    expect(grant.mapSegmentDeltas[0]).toMatchObject({
      segmentDefinitionId: 'kz-segment-02-gap',
      completionEvidenceDelta: 1,
    });
    expect(grant.challengeDeltas).not.toContainEqual({
      challengeDefinitionId: 'arena-v2.learning.cross-01.candidate.v1',
      progressDelta: 1,
    });
  });

  it('does not use an evaded attack as route-segment proof', () => {
    const matchResult = result();
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: evadedActionEvents(matchResult.modeResult),
    });
    expect(grant.weaponDeltas).toHaveLength(1);
    expect(grant.mapSegmentDeltas).toEqual([]);
    expect(grant.challengeDeltas).toEqual([]);
  });

  it('rejects weapon feedback whose participant provenance is outside the match', () => {
    const matchResult = result();
    const forgedEvents = events(matchResult.modeResult).map((event) => (
      event.type === 'WeaponFeedbackResolved'
        ? { ...event, targetId: 'participant.outside-match' }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedEvents,
    })).toThrow(/不属于当前对局/);
  });

  it('rejects forged runtime weapon, mode and Survival-level action identities', () => {
    const matchResult = result();
    const validEvents = events(matchResult.modeResult);
    const forgedRuntimeEvents = validEvents.map((event) => (
      event.type === 'ActionStarted'
        ? { ...event, runtimeEquipmentDefinitionId: 'equipment.forged-runtime' }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedRuntimeEvents,
    })).toThrow(/运行时身份绑定/);

    const survivalRuntime = ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1
      .find(({ collectionEquipmentDefinitionId, level }) => (
        collectionEquipmentDefinitionId === WEAPON.equipment.id && level === 1
      ))!;
    const forgedModeEvents = validEvents.map((event) => {
      if (event.type === 'ActionStarted') return {
        ...event,
        action: survivalRuntime.actions[0]!.id,
        runtimeEquipmentDefinitionId: survivalRuntime.equipment.id,
        survivalLevel: survivalRuntime.level,
      };
      if (event.type === 'WeaponFeedbackResolved') return {
        ...event,
        actionDefinitionId: survivalRuntime.actions[0]!.id,
      };
      return event;
    });
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedModeEvents,
    })).toThrow(/运行时身份绑定/);

    const forgedLevelEvents = forgedModeEvents.map((event) => (
      event.type === 'ActionStarted' ? { ...event, survivalLevel: 2 } : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedLevelEvents,
    })).toThrow(/运行时身份绑定/);
  });

  it('keeps legacy weapon evidence readable but refuses it for learning grants', () => {
    const definition = ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1;
    const legacyWeaponEvidence = createArenaV2LearningEvidenceDefinitionV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      {
        schemaVersion: definition.schemaVersion,
        status: definition.status,
        hardGate: definition.hardGate,
        racePreparingTicks: definition.racePreparingTicks,
        weaponBindings: definition.weaponBindings.map(({ actionBindings: _actionBindings, ...binding }) => (
          binding
        )),
        mapBindings: definition.mapBindings,
      },
    );
    const matchResult = result();
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: legacyWeaponEvidence,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: events(matchResult.modeResult),
    })).toThrow(/缺少运行时武器动作身份绑定/);
  });

  it('accepts a correctly bound Survival runtime weapon action', () => {
    const survivalRuntime = ARENA_V2_SURVIVAL_BASELINE_WEAPON_RUNTIME_VARIANTS_CANDIDATE_V1
      .find(({ collectionEquipmentDefinitionId, level }) => (
        collectionEquipmentDefinitionId === WEAPON.equipment.id && level === 1
      ))!;
    const matchResult = survivalResult(
      2,
      'terminal-player-fall',
      'player',
      [WEAPON.equipment.id],
    );
    const replay = terminalSurvivalEvents(matchResult);
    const survivalCombat = [
      replay[0]!,
      {
        id: 'survival-event.action.1', sequence: 1, tick: 1, type: 'ActionStarted',
        participantId: 'p1', action: survivalRuntime.actions[0]!.id,
        sourceKind: 'equipment', equipmentInstanceId: 'equipment.instance.survival.1',
        runtimeEquipmentDefinitionId: survivalRuntime.equipment.id,
        collectionEquipmentDefinitionId: WEAPON.equipment.id,
        survivalLevel: survivalRuntime.level,
      },
      {
        id: 'survival-event.weapon-feedback.1', sequence: 2, tick: 2,
        type: 'WeaponFeedbackResolved', kind: 'hit-confirm',
        attackerId: 'p1', targetId: 'p2',
        actionDefinitionId: survivalRuntime.actions[0]!.id,
        actionStartedTick: 1, firstHitTick: 2, targetFallTick: null,
        initialSupportSurfaceId: 'kz-s01-start',
        finalSupportSurfaceId: 'kz-s01-start', fallCause: null,
        creditedAttackerId: null,
      },
      ...replay.slice(1).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + 2,
      })),
    ];
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: survivalCombat,
    });
    expect(grant.weaponDeltas[0]).toMatchObject({
      weaponDefinitionId: WEAPON.equipment.id,
      useCountDelta: 1,
    });
    expect(grant.weaponDeltas[0]!.contextEvidence).toEqual(expect.arrayContaining([
      { context: 'ground', evidenceDelta: 1 },
      { context: 'survival', evidenceDelta: 1 },
    ]));
  });

  it('rejects equipment instance identity mutation and impossible concurrent ownership', () => {
    const matchResult = result(7, 'timeout-draw', {
      p1: [WEAPON.equipment.id, SECOND_WEAPON.equipment.id].sort(),
      p2: [],
    });
    const validEvents = events(matchResult.modeResult);
    const secondGround = SECOND_WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
    const mutatedInstanceEvents = [
      ...validEvents.slice(0, -1),
      {
        id: 'event.mutated-equipment-instance', sequence: validEvents.length - 1,
        tick: 3, type: 'ActionStarted', participantId: 'p1',
        action: secondGround.actionDefinitionId, sourceKind: 'equipment',
        equipmentInstanceId: 'equipment.instance.1',
        runtimeEquipmentDefinitionId: SECOND_WEAPON.equipment.id,
        collectionEquipmentDefinitionId: SECOND_WEAPON.equipment.id,
        survivalLevel: null,
      },
      { ...validEvents.at(-1)!, sequence: validEvents.length },
    ];
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: mutatedInstanceEvents,
    })).toThrow(/同一装备实例的运行时身份不能变化/);

    const sameTickDuplicate = [
      validEvents[0]!,
      validEvents[1]!,
      {
        ...validEvents[1]!,
        id: 'event.same-participant-same-tick',
        sequence: 2,
        equipmentInstanceId: 'equipment.instance.same-tick.2',
      },
      ...validEvents.slice(2).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + 1,
      })),
    ];
    const originalResult = result();
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: originalResult,
      recipientParticipantId: 'p1',
      events: sameTickDuplicate,
    })).toThrow(/同一参与者同tick只能启动一个装备动作/);

    const sharedInstanceResult = result(7, 'timeout-draw', {
      p1: [WEAPON.equipment.id],
      p2: [WEAPON.equipment.id],
    });
    const sharedInstanceBase = events(sharedInstanceResult.modeResult);
    const crossParticipantEvents = [
      sharedInstanceBase[0]!,
      sharedInstanceBase[1]!,
      {
        ...sharedInstanceBase[1]!,
        id: 'event.shared-instance-p2',
        sequence: 2,
        tick: 3,
        participantId: 'p2',
      },
      ...sharedInstanceBase.slice(2).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + 1,
      })),
    ].sort((left, right) => Number(left.tick) - Number(right.tick)).map((event, index) => ({
      ...event,
      sequence: index,
    }));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: sharedInstanceResult,
      recipientParticipantId: 'p1',
      events: crossParticipantEvents,
    })).toThrow(/Duel\/Race装备实例不能跨参与者转移/);
  });

  it('rejects incomplete or reordered V6 learning event chains', () => {
    const matchResult = result();
    const validEvents = events(matchResult.modeResult);
    const sequenceGap = validEvents.map((event, index) => (
      index < 2 ? event : { ...event, sequence: index + 1 }
    ));
    const duplicateStart = [
      validEvents[0]!,
      { ...validEvents[0]!, id: 'event.duplicate-start', sequence: 1 },
      ...validEvents.slice(1).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + 1,
      })),
    ];
    const tickRegression = [
      validEvents[0]!,
      { ...validEvents[1]!, tick: 3 },
      {
        ...validEvents[2]!,
        tick: 3,
        actionStartedTick: 3,
        firstHitTick: 3,
      },
      {
        id: 'event.base-action-after-feedback',
        sequence: 3,
        tick: 2,
        type: 'ActionStarted',
        participantId: 'p2',
        action: 'arena-v2.action.base.primary.candidate.v1',
        sourceKind: 'base-action',
        equipmentInstanceId: null,
        runtimeEquipmentDefinitionId: null,
        collectionEquipmentDefinitionId: null,
        survivalLevel: null,
      },
      { ...validEvents[3]!, sequence: 4 },
    ];

    for (const malformedEvents of [sequenceGap, duplicateStart, tickRegression]) {
      expect(() => resolveArenaV2ReplayLearningGrantV1({
        profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
        evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
        result: matchResult,
        recipientParticipantId: 'p1',
        events: malformedEvents,
      })).toThrow();
    }
  });

  it('requires Duel elimination facts to match the terminal result', () => {
    const matchResult = result(7, 'last-participant-standing');
    const missingFall = events(matchResult.modeResult).filter((event) => (
      event.type !== 'ParticipantFell'
      && !(event.type === 'WeaponFeedbackResolved' && event.kind === 'hit-ring-out')
    )).map((event, index) => ({ ...event, sequence: index }));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: missingFall,
    })).toThrow(/Duel掉落事件/);

    const winnerFellResult = result(7, 'last-participant-standing', {
      p1: [WEAPON.equipment.id],
      p2: [WEAPON.equipment.id],
    });
    const winnerFellBase = events(winnerFellResult.modeResult);
    const winnerFell = [
      winnerFellBase[0]!,
      winnerFellBase[1]!,
      {
        ...winnerFellBase[1]!,
        id: 'event.opponent-authority-action',
        sequence: 2,
        participantId: 'p2',
        equipmentInstanceId: 'equipment.instance.p2',
      },
      ...winnerFellBase.slice(2).map((event) => {
      if (event.type === 'ParticipantFell') return {
        ...event,
        sequence: Number(event.sequence) + 1,
        participantId: 'p1',
        creditedAttackerId: 'p2',
      };
      if (event.type === 'WeaponFeedbackResolved' && event.kind === 'hit-ring-out') {
        return {
          ...event,
          sequence: Number(event.sequence) + 1,
          attackerId: 'p2',
          targetId: 'p1',
          creditedAttackerId: 'p2',
        };
      }
      return { ...event, sequence: Number(event.sequence) + 1 };
    }),
    ];
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: winnerFellResult,
      recipientParticipantId: 'p1',
      events: winnerFell,
    })).toThrow(/Duel掉落事件/);
  });

  it('requires every attack feedback to reference a preceding authority action', () => {
    const matchResult = result(7, 'timeout-draw', {
      p1: [WEAPON.equipment.id],
      p2: [WEAPON.equipment.id],
    });
    const ground = WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
    const base = events(matchResult.modeResult);
    const opponentAction = {
      id: 'event.opponent-action', sequence: 3, tick: 3, type: 'ActionStarted',
      participantId: 'p2', action: ground.actionDefinitionId, sourceKind: 'equipment',
      equipmentInstanceId: 'equipment.instance.opponent.1',
      runtimeEquipmentDefinitionId: WEAPON.equipment.id,
      collectionEquipmentDefinitionId: WEAPON.equipment.id,
      survivalLevel: null,
    };
    const opponentFeedback = {
      id: 'event.opponent-feedback', sequence: 4, tick: 4,
      type: 'WeaponFeedbackResolved', kind: 'hit-confirm',
      attackerId: 'p2', targetId: 'p1',
      actionDefinitionId: ground.actionDefinitionId,
      actionStartedTick: 3, firstHitTick: 4, targetFallTick: null,
      initialSupportSurfaceId: 'kz-s01-start',
      finalSupportSurfaceId: 'kz-s01-start', fallCause: null,
      creditedAttackerId: null,
    };
    const validEvents = [
      ...base.slice(0, -1),
      opponentAction,
      opponentFeedback,
      { ...base.at(-1)!, sequence: 5 },
    ];
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: validEvents,
    })).not.toThrow();

    const missingAction = validEvents.filter(({ id }) => id !== opponentAction.id)
      .map((event, index) => ({ ...event, sequence: index }));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: missingAction,
    })).toThrow(/缺少同攻击者、同动作、同起手tick/);

    const feedbackBeforeAction = [
      ...base.slice(0, -1),
      {
        ...opponentFeedback,
        sequence: 3,
        tick: 3,
        firstHitTick: 3,
      },
      { ...opponentAction, sequence: 4 },
      { ...base.at(-1)!, sequence: 5 },
    ];
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: feedbackBeforeAction,
    })).toThrow(/先行权威起手/);

    const weaponAsBaseAction = validEvents.map((event) => (
      event.id === opponentAction.id
        ? {
          ...event,
          sourceKind: 'base-action',
          equipmentInstanceId: null,
          runtimeEquipmentDefinitionId: null,
          collectionEquipmentDefinitionId: null,
          survivalLevel: null,
        }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: weaponAsBaseAction,
    })).toThrow(/武器反馈只能引用equipment权威起手/);
  });

  it('accepts the shared hit outcome boundary and rejects delayed forged feedback', () => {
    const baseline = result();
    const { authorityHash: _authorityHash, ...authority } = baseline;
    const matchResult = createProductMatchResultV3({
      ...authority,
      modeResult: {
        ...baseline.modeResult,
        endedAtTick: 40,
      },
    });
    const boundaryEvents = events(matchResult.modeResult).map((event) => {
      if (event.type === 'WeaponFeedbackResolved') {
        return {
          ...event,
          tick: 2 + ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
          firstHitTick: 2,
        };
      }
      if (event.type === 'MatchEnded') return { ...event, tick: 40 };
      return event;
    });
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: boundaryEvents,
    })).not.toThrow();

    const delayedEvents = boundaryEvents.map((event) => (
      event.type === 'WeaponFeedbackResolved'
        ? { ...event, tick: Number(event.tick) + 1 }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: delayedEvents,
    })).toThrow(/20 tick结果窗口/);
  });

  it('requires every ring-out feedback to close one authoritative fall', () => {
    const matchResult = result(7, 'last-participant-standing');
    const validRingOut = events(matchResult.modeResult);
    expect(resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: validRingOut,
    }).weaponDeltas).toHaveLength(1);

    const forgedRingOut = validRingOut.map((event) => (
      event.type === 'ParticipantFell'
        ? { ...event, creditedAttackerId: null, fallCause: 'movement' }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedRingOut,
    })).toThrow(/唯一匹配的权威掉落/);
  });

  it('requires movement-fall feedback and uncredited falls to close one-to-one', () => {
    const matchResult = survivalResult();
    const validEvents = terminalSurvivalEvents(matchResult);
    const missingFeedback = validEvents.filter((event) => (
      event.id !== 'survival-event.feedback.1'
    )).map((event, index) => ({ ...event, sequence: index }));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: missingFeedback,
    })).toThrow(/移动掉落缺少唯一movement-fall反馈/);

    const forgedTarget = validEvents.map((event) => (
      event.id === 'survival-event.feedback.1' ? { ...event, targetId: 'p2' } : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedTarget,
    })).toThrow(/移动掉落事实/);

    const forgedSurface = validEvents.map((event) => (
      event.id === 'survival-event.feedback.1'
        ? { ...event, initialSupportSurfaceId: 'kz-s02-landing' }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedSurface,
    })).toThrow(/移动掉落事实/);
  });

  it('rejects forged movement-fall attack context before effective weapon learning', () => {
    const matchResult = result(7, 'last-participant-standing');
    const replay = events(matchResult.modeResult);
    const forgedReplay = replay.map((event) => {
      if (event.type === 'ParticipantFell') return {
        ...event,
        fallCause: 'movement',
        creditedAttackerId: null,
      };
      if (event.type !== 'WeaponFeedbackResolved') return event;
      return {
        ...event,
        kind: 'movement-fall',
        firstHitTick: null,
        fallCause: 'movement',
        creditedAttackerId: null,
      };
    });
    expect(forgedReplay.some((event) => (
      event.type === 'ActionStarted'
      && 'participantId' in event
      && event.participantId === 'p1'
      && event.tick === 1
    ))).toBe(true);
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedReplay,
    })).toThrow(/movement-fall必须是无命中归因的移动掉落/);
  });

  it('rejects non-feedback events whose participant is outside the match', () => {
    const matchResult = raceResult('finish-claimed', 1);
    const forgedEvents = raceEvents(matchResult).map((event) => (
      event.type === 'RaceSafeAnchorCommitted'
        ? { ...event, participantId: 'participant.outside-match' }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedEvents,
    })).toThrow(/participantId不属于当前对局/);
  });

  it('rejects forged Race anchors and mode-specific events in another mode', () => {
    const raceMatchResult = raceResult('finish-claimed', 1);
    const forgedAnchorEvents = raceEvents(raceMatchResult).map((event) => (
      event.type === 'RaceSafeAnchorCommitted'
        ? { ...event, anchorId: 'kz-a-forged-safe-anchor' }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: raceMatchResult,
      recipientParticipantId: 'p1',
      events: forgedAnchorEvents,
    })).toThrow(/安全锚/);

    const duelMatchResult = result();
    const duelEvents = events(duelMatchResult.modeResult);
    const crossModeEvents = [
      duelEvents[0]!,
      {
        id: 'event.cross-mode-race-anchor',
        sequence: 1,
        tick: 1,
        type: 'RaceSafeAnchorCommitted',
        modeDefinitionId: duelMatchResult.modeDefinitionId,
        participantId: 'p1',
        anchorId: 'kz-a-route-start',
        progressOrdinal: 1,
      },
      ...duelEvents.slice(1).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + 1,
      })),
    ];
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: duelMatchResult,
      recipientParticipantId: 'p1',
      events: crossModeEvents,
    })).toThrow(/非Race/);
  });

  it('requires the authority Race preparation binding before replay learning', () => {
    const definition = ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1;
    const legacyEvidence = createArenaV2LearningEvidenceDefinitionV1(
      ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      {
        schemaVersion: definition.schemaVersion,
        status: definition.status,
        hardGate: definition.hardGate,
        weaponBindings: definition.weaponBindings,
        mapBindings: definition.mapBindings,
      },
    );
    const matchResult = raceResult('finish-claimed', 1);
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: legacyEvidence,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: raceEvents(matchResult),
    })).toThrow(/缺少权威准备期绑定/);
  });

  it('rejects Race competition facts before the first active tick', () => {
    const matchResult = raceResult('finish-claimed', 1);
    const forgedEvents = raceEvents(matchResult).map((event) => (
      event.type === 'RaceSafeAnchorCommitted'
        ? { ...event, tick: RACE_FIRST_ACTIVE_TICK - 1 }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedEvents,
    })).toThrow(/准备期不能提交比赛事实/);
  });

  it('does not turn Race preparation combat into learning evidence', () => {
    const matchResult = raceResult('finish-claimed', 1);
    const ground = WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
    const replay = raceEvents(matchResult);
    const endIndex = replay.length - 1;
    const preparationFeedback = [
      ...replay.slice(0, endIndex),
      {
        id: 'race-event.preparation-feedback',
        sequence: endIndex,
        tick: 2,
        type: 'WeaponFeedbackResolved',
        kind: 'hit-confirm',
        attackerId: 'p1',
        targetId: 'p2',
        actionDefinitionId: ground.actionDefinitionId,
        actionStartedTick: 1,
        firstHitTick: 2,
        targetFallTick: null,
        initialSupportSurfaceId: 'kz-s01-start',
        finalSupportSurfaceId: 'kz-s01-start',
        fallCause: null,
        creditedAttackerId: null,
      },
      { ...replay[endIndex]!, sequence: endIndex + 1 },
    ].sort((left, right) => Number(left.tick) - Number(right.tick)).map((event, index) => ({
      ...event,
      sequence: index,
    }));
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: preparationFeedback,
    });
    expect(grant.weaponDeltas).toEqual([]);
    expect(grant.challengeDeltas).toEqual([]);
    expect(grant.mapSegmentDeltas.map(({ segmentDefinitionId }) => (
      segmentDefinitionId
    ))).toEqual(['kz-segment-01-platform']);
  });

  it('accepts Race weapon learning from an action started at the first active tick', () => {
    const matchResult = raceResult('finish-claimed', 1);
    const ground = WEAPON.grammar.contexts.find(({ kind }) => kind === 'ground')!;
    const replay = raceEvents(matchResult).filter((event) => event.type !== 'ActionStarted');
    const endIndex = replay.length - 1;
    const activeCombat = [
      ...replay.slice(0, endIndex),
      {
        id: 'race-event.active-action',
        sequence: endIndex,
        tick: RACE_FIRST_ACTIVE_TICK,
        type: 'ActionStarted',
        participantId: 'p1',
        action: ground.actionDefinitionId,
        sourceKind: 'equipment',
        equipmentInstanceId: 'equipment.instance.race.active',
        runtimeEquipmentDefinitionId: WEAPON.equipment.id,
        collectionEquipmentDefinitionId: WEAPON.equipment.id,
        survivalLevel: null,
      },
      {
        id: 'race-event.active-feedback',
        sequence: endIndex + 1,
        tick: RACE_FIRST_ACTIVE_TICK + 1,
        type: 'WeaponFeedbackResolved',
        kind: 'hit-confirm',
        attackerId: 'p1',
        targetId: 'p2',
        actionDefinitionId: ground.actionDefinitionId,
        actionStartedTick: RACE_FIRST_ACTIVE_TICK,
        firstHitTick: RACE_FIRST_ACTIVE_TICK + 1,
        targetFallTick: null,
        initialSupportSurfaceId: 'kz-s01-start',
        finalSupportSurfaceId: 'kz-s01-start',
        fallCause: null,
        creditedAttackerId: null,
      },
      { ...replay[endIndex]!, sequence: endIndex + 2 },
    ].sort((left, right) => Number(left.tick) - Number(right.tick)).map((event, index) => ({
      ...event,
      sequence: index,
    }));
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: activeCombat,
    });
    expect(grant.weaponDeltas[0]).toMatchObject({
      weaponDefinitionId: WEAPON.equipment.id,
      contextEvidence: [{ context: 'ground', evidenceDelta: 1 }],
    });
  });

  it('rejects a Race result whose non-finisher progress lacks safe-anchor evidence', () => {
    const matchResult = raceResult('finish-claimed', 1);
    const incompleteEvents = raceEvents(matchResult).filter((event) => (
      event.type !== 'RaceSafeAnchorCommitted'
    )).map((event, index) => ({ ...event, sequence: index }));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: incompleteEvents,
    })).toThrow(/未冲线者的安全锚证据/);
  });

  it('rejects same-tick duplicate Race progress and post-finish anchors', () => {
    const matchResult = raceResult('finish-claimed', 2);
    const baseEvents = raceEvents(matchResult);
    const firstAnchorIndex = baseEvents.findIndex((event) => (
      event.type === 'RaceSafeAnchorCommitted'
    ));
    const secondSegment = ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1
      .mapBindings.find(({ mapDefinitionId }) => (
        mapDefinitionId === ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID
      ))!.segments[1]!;
    const sameTickDuplicate = [
      ...baseEvents.slice(0, firstAnchorIndex + 1),
      {
        id: 'race-event.same-tick-second-anchor',
        sequence: firstAnchorIndex + 1,
        tick: RACE_FIRST_ACTIVE_TICK,
        type: 'RaceSafeAnchorCommitted',
        modeDefinitionId: matchResult.modeDefinitionId,
        participantId: 'p1',
        anchorId: secondSegment.safeAnchorId,
        progressOrdinal: 2,
      },
      ...baseEvents.slice(firstAnchorIndex + 1).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + 1,
      })),
    ];
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: sameTickDuplicate,
    })).toThrow(/安全锚/);

    const finishedResult = raceResult('finish-claimed', 0);
    const finishedEvents = raceEvents(finishedResult);
    const terminalIndex = finishedEvents.length - 1;
    const postFinishAnchor = [
      ...finishedEvents.slice(0, terminalIndex),
      {
        id: 'race-event.post-finish-anchor',
        sequence: terminalIndex,
        tick: RACE_END_TICK,
        type: 'RaceSafeAnchorCommitted',
        modeDefinitionId: finishedResult.modeDefinitionId,
        participantId: 'p2',
        anchorId: 'kz-a-route-start',
        progressOrdinal: 1,
      },
      { ...finishedEvents[terminalIndex]!, sequence: terminalIndex + 1 },
    ];
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: finishedResult,
      recipientParticipantId: 'p1',
      events: postFinishAnchor,
    })).toThrow(/安全锚/);
  });

  it('accepts a physical Race fall on the terminal tick without inventing a respawn', () => {
    const matchResult = raceResult('finish-claimed', 1);
    const replay = raceEvents(matchResult);
    const finishIndex = replay.findIndex((event) => event.type === 'RaceFinishClaimed');
    const terminalFallReplay = [
      ...replay.slice(0, finishIndex),
      {
        id: 'race-event.terminal-fall',
        sequence: finishIndex,
        tick: RACE_END_TICK,
        type: 'ParticipantFell',
        modeDefinitionId: matchResult.modeDefinitionId,
        participantId: 'p1',
        modeRole: 'competitor',
        slotId: null,
        slotGeneration: 0,
        fallCause: 'movement',
        creditedAttackerId: null,
        supportSurfaceId: 'kz-s01-start',
      },
      {
        ...replay[finishIndex]!,
        sequence: finishIndex + 1,
      },
      {
        id: 'race-event.terminal-fall-feedback',
        sequence: finishIndex + 2,
        tick: RACE_END_TICK,
        type: 'WeaponFeedbackResolved',
        kind: 'movement-fall',
        attackerId: null,
        targetId: 'p1',
        actionDefinitionId: null,
        actionStartedTick: null,
        firstHitTick: null,
        targetFallTick: RACE_END_TICK,
        initialSupportSurfaceId: 'kz-s01-start',
        finalSupportSurfaceId: null,
        fallCause: 'movement',
        creditedAttackerId: null,
      },
      ...replay.slice(finishIndex + 1).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + 2,
      })),
    ];
    expect(resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: terminalFallReplay,
    }).modeDelta.completionCountDelta).toBe(1);
  });

  it('rejects Race ranks that disagree with finishers and terminal progress', () => {
    const matchResult = raceResult('finish-claimed', 1);
    const { authorityHash: _authorityHash, ...authority } = matchResult;
    const forgedResult = createProductMatchResultV3({
      ...authority,
      modeResult: {
        ...matchResult.modeResult,
        rankings: matchResult.modeResult.kind === 'race'
          ? matchResult.modeResult.rankings.map((ranking) => ({
            ...ranking,
            rank: 1,
          }))
          : [],
      },
    });
    const forgedEvents = raceEvents(forgedResult);
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: forgedResult,
      recipientParticipantId: 'p1',
      events: forgedEvents,
    })).toThrow(/名次与冲线\/进度权威排序/);
  });

  it('closes Survival first-respawn and terminal-fall evidence before learning', () => {
    const matchResult = survivalResult();
    const validEvents = terminalSurvivalEvents(matchResult);
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: validEvents,
    });
    expect(grant.modeDelta).toMatchObject({
      modeDefinitionId: matchResult.modeDefinitionId,
      completionCountDelta: 1,
    });

    const missingRespawn = validEvents.filter((event) => (
      event.type !== 'ParticipantRespawned'
    )).map((event, index) => ({ ...event, sequence: index }));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: missingRespawn,
    })).toThrow(/掉落|重生/);

    const missingPlayerFall = validEvents.filter((event) => (
      event.id !== 'survival-event.fall.1'
      && event.id !== 'survival-event.feedback.1'
    )).map((event, index) => ({ ...event, sequence: index }));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: missingPlayerFall,
    })).toThrow(/掉落计数/);
  });

  it('accepts an unscheduled first fall only when the same tick reaches the Survival time cap', () => {
    const matchResult = survivalResult(1, 'survival-time-cap');
    const validEvents = [{
      id: 'survival-time-cap-event.0', sequence: 0, tick: 0, type: 'MatchStarted',
      modeDefinitionId: matchResult.modeDefinitionId, participantIds: PARTICIPANTS,
    }, {
      id: 'survival-time-cap-event.fall', sequence: 1, tick: 200, type: 'ParticipantFell',
      modeDefinitionId: matchResult.modeDefinitionId,
      participantId: 'p1', modeRole: 'player', slotId: null, slotGeneration: 0,
      fallCause: 'movement', creditedAttackerId: null, supportSurfaceId: 'kz-s01-start',
    }, {
      id: 'survival-time-cap-event.count', sequence: 2, tick: 200,
      type: 'SurvivalPlayerFallCounted', modeDefinitionId: matchResult.modeDefinitionId,
      participantId: 'p1', fallCount: 1, terminalFallCount: 2, terminal: false,
    }, {
      id: 'survival-time-cap-event.feedback', sequence: 3, tick: 200,
      type: 'WeaponFeedbackResolved', kind: 'movement-fall',
      attackerId: null, targetId: 'p1', actionDefinitionId: null,
      actionStartedTick: null, firstHitTick: null, targetFallTick: 200,
      initialSupportSurfaceId: 'kz-s01-start', finalSupportSurfaceId: null,
      fallCause: 'movement', creditedAttackerId: null,
    }, {
      id: 'survival-time-cap-event.end', sequence: 4, tick: 200, type: 'MatchEnded',
      modeDefinitionId: matchResult.modeDefinitionId, modeResult: matchResult.modeResult,
    }];
    const grant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: validEvents,
    });
    expect(grant.modeDelta.completionCountDelta).toBe(1);

    const forgedSchedule = validEvents.flatMap((event) => event.type === 'WeaponFeedbackResolved'
      ? [{
        id: 'survival-time-cap-event.schedule', sequence: 3, tick: 200,
        type: 'ParticipantRespawnScheduled', modeDefinitionId: matchResult.modeDefinitionId,
        participantId: 'p1', modeRole: 'player', slotId: null, slotGeneration: 0,
        readyTick: 210, anchorId: 'kz-a-route-start', reason: 'survival-first-fall',
      }, { ...event, sequence: 4 }]
      : [{ ...event, sequence: event.sequence >= 4 ? event.sequence + 1 : event.sequence }]);
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedSchedule,
    })).toThrow(/掉落|重生/);
  });

  it('rejects a Survival result without one player and enemy-only opponents', () => {
    const matchResult = survivalResult(2, 'terminal-player-fall', 'competitor');
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: terminalSurvivalEvents(matchResult),
    })).toThrow(/唯一player/);
  });

  it('closes Survival enemy slot generation through activation, fall and deactivation', () => {
    const matchResult = survivalResult();
    const replay = terminalSurvivalEvents(matchResult);
    const enemyLifecycle = [{
      id: 'survival-event.enemy.activate', sequence: 1, tick: 0,
      type: 'SurvivalEnemySlotChanged', modeDefinitionId: matchResult.modeDefinitionId,
      participantId: 'p2', slotId: 'survival.enemy-slot.1',
      previousGeneration: 1, generation: 2, active: true,
      anchorId: 'kz-a-route-start', reason: 'pressure-stage',
    }, {
      id: 'survival-event.enemy.fall', sequence: 2, tick: 5, type: 'ParticipantFell',
      modeDefinitionId: matchResult.modeDefinitionId,
      participantId: 'p2', modeRole: 'enemy',
      slotId: 'survival.enemy-slot.1', slotGeneration: 2,
      fallCause: 'movement', creditedAttackerId: null, supportSurfaceId: 'kz-s01-start',
    }, {
      id: 'survival-event.enemy.deactivate', sequence: 3, tick: 5,
      type: 'SurvivalEnemySlotChanged', modeDefinitionId: matchResult.modeDefinitionId,
      participantId: 'p2', slotId: 'survival.enemy-slot.1',
      previousGeneration: 2, generation: 2, active: false,
      anchorId: null, reason: 'fell',
    }, {
      id: 'survival-event.enemy.feedback', sequence: 4, tick: 5,
      type: 'WeaponFeedbackResolved', kind: 'movement-fall',
      attackerId: null, targetId: 'p2', actionDefinitionId: null,
      actionStartedTick: null, firstHitTick: null, targetFallTick: 5,
      initialSupportSurfaceId: 'kz-s01-start', finalSupportSurfaceId: null,
      fallCause: 'movement', creditedAttackerId: null,
    }];
    const validEvents = [
      replay[0]!,
      ...enemyLifecycle,
      ...replay.slice(1).map((event) => ({
        ...event,
        sequence: Number(event.sequence) + enemyLifecycle.length,
      })),
    ];
    expect(resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: validEvents,
    }).modeDelta.completionCountDelta).toBe(1);

    const forgedGeneration = validEvents.map((event) => (
      event.id === 'survival-event.enemy.activate'
        ? { ...event, previousGeneration: 2, generation: 3 }
        : event
    ));
    expect(() => resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: forgedGeneration,
    })).toThrow(/敌人槽/);
  });

  it('does not turn an unproven or cancelled weapon start into research evidence', () => {
    const matchResult = result();
    const replayGrant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
      events: cancelledActionEvents(matchResult.modeResult),
    });
    const summaryGrant = resolveArenaV2MatchLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      result: matchResult,
      recipientParticipantId: 'p1',
    });

    expect(replayGrant.collectedWeaponDefinitionIds).toEqual([]);
    expect(replayGrant.weaponDeltas).toEqual([]);
    expect(replayGrant.challengeDeltas).toEqual([]);
    expect(summaryGrant.collectedWeaponDefinitionIds).toEqual([]);
    expect(summaryGrant.weaponDeltas).toEqual([]);
  });

  it('awards the final Race segment only to the participant who actually finishes', () => {
    const finalSegmentId = ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1
      .mapBindings.find(({ mapDefinitionId }) => (
        mapDefinitionId === ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID
      ))!.segments.at(-1)!.segmentDefinitionId;
    const recipientFinished = raceResult('finish-claimed', 0, 'p1');
    const recipientGrant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: recipientFinished,
      recipientParticipantId: 'p1',
      events: raceEvents(recipientFinished),
    });
    expect(recipientGrant.mapSegmentDeltas.map(({ segmentDefinitionId }) => (
      segmentDefinitionId
    ))).toEqual(['kz-segment-01-platform', finalSegmentId]);
    expect(recipientGrant.mapSegmentDeltas.find(({ segmentDefinitionId }) => (
      segmentDefinitionId === finalSegmentId
    ))).toMatchObject({ raceFinishTicksCandidate: RACE_END_TICK });

    const opponentFinished = raceResult('finish-claimed', 1, 'p2');
    const opponentGrant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: opponentFinished,
      recipientParticipantId: 'p1',
      events: raceEvents(opponentFinished),
    });
    expect(opponentGrant.mapSegmentDeltas.map(({ segmentDefinitionId }) => (
      segmentDefinitionId
    ))).toEqual(['kz-segment-01-platform']);
    expect(opponentGrant.mapSegmentDeltas.some(({ segmentDefinitionId }) => (
      segmentDefinitionId === finalSegmentId
    ))).toBe(false);
    expect(recipientGrant.collectedMapDefinitionIds).toEqual([
      ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    ]);
    expect(opponentGrant.collectedMapDefinitionIds).toEqual([]);
  });

  it('keeps progressed Race completion separate from whole-map collection', () => {
    const cases = [{
      result: raceResult('finish-claimed', 1),
      completionCountDelta: 1,
      collectedMapCount: 0,
    }, {
      result: raceResult('finish-claimed', 0, 'p1'),
      completionCountDelta: 1,
      collectedMapCount: 1,
    }, {
      result: raceResult('finish-claimed', 0),
      completionCountDelta: 0,
      collectedMapCount: 0,
    }, {
      result: raceResult('no-finisher', 1),
      completionCountDelta: 0,
      collectedMapCount: 0,
    }] as const;
    for (const fixture of cases) {
      const summaryGrant = resolveArenaV2MatchLearningGrantV1({
        profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
        result: fixture.result,
        recipientParticipantId: 'p1',
      });
      const replayGrant = resolveArenaV2ReplayLearningGrantV1({
        profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
        evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
        result: fixture.result,
        recipientParticipantId: 'p1',
        events: raceEvents(fixture.result),
      });
      expect(summaryGrant.modeDelta.completionCountDelta).toBe(fixture.completionCountDelta);
      expect(replayGrant.modeDelta.completionCountDelta).toBe(fixture.completionCountDelta);
      expect(summaryGrant.collectedMapDefinitionIds).toHaveLength(
        fixture.collectedMapCount,
      );
      expect(replayGrant.collectedMapDefinitionIds).toHaveLength(
        fixture.collectedMapCount,
      );
    }
  });

  it('settles once through service and alternates verified dual-slot CAS writes', () => {
    const storage = storageHarness();
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage: storage.port,
      ownerId: 'owner.p6.test',
      wallNow: () => 1_000,
      keyPrefix: 'arena.p6.test',
    });
    const service = new ArenaV2LearningProfileServiceV1({
      definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      repository,
    });
    expect(service.open().revision).toBe(0);
    const firstResult = result(7);
    const handoff = new ArenaV2LearningTerminalHandoffCandidateV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      learningProfileService: service,
      authorityRegistry: null,
      authorityAdmission: null,
      recipientParticipantId: 'p1',
      maxEventCount: 100,
    });
    expect(handoff.appendEvents(events(firstResult.modeResult))).toMatchObject({
      state: 'ready-to-settle',
      eventCount: 4,
    });
    const firstOutcome = handoff.settle(firstResult);
    expect(firstOutcome).toMatchObject({ committed: true, duplicate: false });
    expect(handoff.settle(firstResult)).toBe(firstOutcome);
    const firstGrant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: firstResult,
      recipientParticipantId: 'p1',
      events: events(firstResult.modeResult),
    });
    expect(service.commitGrant(firstGrant)).toMatchObject({ committed: false, duplicate: true });
    const secondResult = result(8);
    const secondGrant = resolveArenaV2ReplayLearningGrantV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      result: secondResult,
      recipientParticipantId: 'p1',
      events: events(secondResult.modeResult),
    });
    expect(service.commitGrant(secondGrant)).toMatchObject({ committed: true, duplicate: false });
    expect(service.getSnapshot().revision).toBe(2);
    expect(storage.values.has('arena.p6.test.slot-a')).toBe(true);
    expect(storage.values.has('arena.p6.test.slot-b')).toBe(true);
    handoff.destroy();
    service.destroy();
  });

  it('retains terminal evidence after swallowed Profile callback reentry and finalizes on retry', () => {
    const storage = storageHarness();
    const repository = new ArenaV2LearningProfileRepositoryV1({
      definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      storage: storage.port,
      ownerId: 'owner.p6.reentry.test',
      wallNow: () => 1_000,
      keyPrefix: 'arena.p6.reentry.test',
    });
    let attemptReentry: (() => void) | null = null;
    class SwallowingReentryLearningProfileService
      extends ArenaV2LearningProfileServiceV1 {
      override commitGrant(grantValue: unknown) {
        if (attemptReentry !== null) {
          try { attemptReentry(); } catch { /* external port swallows the inner rejection */ }
        }
        return super.commitGrant(grantValue);
      }
    }
    const service = new SwallowingReentryLearningProfileService({
      definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      repository,
    });
    service.open();
    const matchResult = result(11);
    const handoff = new ArenaV2LearningTerminalHandoffCandidateV1({
      profileDefinition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
      evidenceDefinition: ARENA_V2_LEARNING_EVIDENCE_DEFINITION_CANDIDATE_V1,
      learningProfileService: service,
      authorityRegistry: null,
      authorityAdmission: null,
      recipientParticipantId: 'p1',
      maxEventCount: 100,
    });
    attemptReentry = () => handoff.destroy();
    handoff.appendEvents(events(matchResult.modeResult));

    expect(() => handoff.settle(matchResult)).toThrow(/重入/u);
    expect(handoff.getSnapshot()).toMatchObject({
      state: 'ready-to-settle',
      eventCount: 4,
      settlementCommitted: null,
      settlementDuplicate: null,
    });
    expect(service.getSnapshot().revision).toBe(1);
    attemptReentry = null;
    expect(handoff.settle(matchResult)).toMatchObject({ committed: false, duplicate: true });
    expect(handoff.getSnapshot()).toMatchObject({
      state: 'settled',
      eventCount: 0,
      settlementCommitted: false,
      settlementDuplicate: true,
    });
    expect(service.getSnapshot().revision).toBe(1);
    handoff.destroy();
    service.destroy();
  });
});
