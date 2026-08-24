import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION,
  ARENA_MATCH_CONTROLLER_KIND_V2,
  ARENA_MATCH_PARTICIPANT_ROLE_V2,
  RACE_MODE_PREPARING_TICKS_V1,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
  SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ModeMatchRuntimeV6ModeOptions,
} from '@number-strategy-jump/arena-match';
import type { ArenaModeVerificationRunRequestV1 } from './arena-mode-verification-runner-v1.js';

export const ARENA_MODE_VERIFICATION_FIXTURE_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

export interface ArenaModeVerificationFixtureV1 {
  readonly candidateStatus:
    typeof ARENA_MODE_VERIFICATION_FIXTURE_V1_CANDIDATE_STATUS;
  readonly config: ArenaMatchConfigV6;
  readonly localParticipantId: string;
  readonly mode: ModeMatchRuntimeV6ModeOptions;
  readonly terminalAuthorityTick: number;
}

const TEST_RESPAWN_PROTECTION_TICKS = 12;
const TEST_SURVIVAL_RESPAWN_DELAY_TICKS = 2;
const TEST_SURVIVAL_RESPAWN_PROTECTION_TICKS = 10;
const REQUEST_KEYS = new Set([
  'caseId',
  'profile',
  'modeKind',
  'modeDefinitionId',
  'fixtureDefinitionId',
  'participantCount',
  'enemySlotCount',
  'matchSeed',
  'runnerTickBudget',
  'rematchCount',
]);
const PROFILES: ReadonlySet<unknown> = new Set(['correctness', 'long-run', 'rematch']);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);

function normalizeRequest(value: unknown): Readonly<ArenaModeVerificationRunRequestV1> {
  const source = cloneFrozenData(value, 'Arena Mode verification fixture request');
  assertKnownKeys(source, REQUEST_KEYS, 'Arena Mode verification fixture request');
  for (const key of REQUEST_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`Arena Mode fixture缺少${key}。`);
  }
  if (!PROFILES.has(source.profile)) throw new RangeError('Arena Mode fixture profile无效。');
  if (!MODE_KINDS.has(source.modeKind)) throw new RangeError('Arena Mode fixture modeKind无效。');
  const profile = source.profile as ArenaModeVerificationRunRequestV1['profile'];
  const modeKind = source.modeKind as ArenaModeVerificationRunRequestV1['modeKind'];
  const participantCount = assertIntegerAtLeast(source.participantCount, 2, 'participantCount');
  const enemySlotCount = assertIntegerAtLeast(source.enemySlotCount, 0, 'enemySlotCount');
  if (
    (modeKind === 'duel' && (participantCount !== 2 || enemySlotCount !== 0))
    || (modeKind === 'race' && (
      participantCount < 2 || participantCount > 4 || enemySlotCount !== 0
    ))
    || (modeKind === 'survival' && (
      enemySlotCount < 1 || enemySlotCount > 16 || participantCount !== enemySlotCount + 1
    ))
  ) throw new RangeError('Arena Mode fixture participant/slot矩阵与mode不一致。');
  const fixtureDefinitionId = source.fixtureDefinitionId === null
    ? null
    : assertNonEmptyString(source.fixtureDefinitionId, 'fixtureDefinitionId');
  if (
    (modeKind === 'duel' && fixtureDefinitionId !== null)
    || (modeKind !== 'duel' && !fixtureDefinitionId?.includes('.test.'))
  ) throw new RangeError('Arena Mode fixture必须保持Duel无fixture、Race/Survival显式.test.fixture。');
  const matchSeed = assertIntegerAtLeast(source.matchSeed, 0, 'matchSeed');
  if (matchSeed > 0xffff_ffff) throw new RangeError('Arena Mode fixture matchSeed必须是uint32。');
  return Object.freeze({
    caseId: assertNonEmptyString(source.caseId, 'caseId'),
    profile,
    modeKind,
    modeDefinitionId: assertNonEmptyString(source.modeDefinitionId, 'modeDefinitionId'),
    fixtureDefinitionId,
    participantCount,
    enemySlotCount,
    matchSeed,
    runnerTickBudget: assertIntegerAtLeast(source.runnerTickBudget, 1, 'runnerTickBudget'),
    rematchCount: assertIntegerAtLeast(source.rematchCount, 1, 'rematchCount'),
  });
}

function participantId(index: number): string {
  return `participant-${String(index + 1).padStart(2, '0')}`;
}

function slotId(index: number): string {
  return `enemy-slot-${String(index + 1).padStart(2, '0')}.test`;
}

function anchorId(prefix: string, index: number): string {
  return `${prefix}-anchor-${String(index + 1).padStart(2, '0')}.test`;
}

function terminalAuthorityTick(request: Readonly<ArenaModeVerificationRunRequestV1>): number {
  if (request.profile !== 'long-run') {
    if (request.modeKind === 'race') {
      return RACE_MODE_PREPARING_TICKS_V1 + RACE_MODE_RESPAWN_DELAY_TICKS_V1 + 2;
    }
    return request.modeKind === 'survival' ? 4 : 0;
  }
  const tick = request.runnerTickBudget - 1;
  if (tick < 0) throw new RangeError('Arena Mode verification tick预算不足。');
  if (request.modeKind === 'race' && tick <= RACE_MODE_PREPARING_TICKS_V1) {
    throw new RangeError('Arena Mode verification Race长局预算必须越过准备阶段。');
  }
  return tick;
}

function createAssignments(request: Readonly<ArenaModeVerificationRunRequestV1>) {
  if (request.modeKind === 'survival') {
    return Object.freeze(Array.from({ length: request.participantCount }, (_, index) => {
      const player = index === 0;
      return Object.freeze({
        participantId: participantId(index),
        modeRole: player
          ? ARENA_MATCH_PARTICIPANT_ROLE_V2.PLAYER
          : ARENA_MATCH_PARTICIPANT_ROLE_V2.ENEMY,
        teamId: player ? 'team.player.test' : 'team.enemy.test',
        controllerKind: player
          ? ARENA_MATCH_CONTROLLER_KIND_V2.HUMAN
          : ARENA_MATCH_CONTROLLER_KIND_V2.BOT,
        characterDefinitionId: player
          ? 'character.player.test'
          : 'character.enemy.shared.test',
        slotId: player ? null : slotId(index - 1),
        slotGeneration: player ? 0 : index,
      });
    }));
  }
  return Object.freeze(Array.from({ length: request.participantCount }, (_, index) => (
    Object.freeze({
      participantId: participantId(index),
      modeRole: ARENA_MATCH_PARTICIPANT_ROLE_V2.COMPETITOR,
      teamId: null,
      controllerKind: index === 0
        ? ARENA_MATCH_CONTROLLER_KIND_V2.HUMAN
        : ARENA_MATCH_CONTROLLER_KIND_V2.BOT,
      characterDefinitionId: `character.competitor-${String(index + 1).padStart(2, '0')}.test`,
      slotId: null,
      slotGeneration: 0,
    })
  )));
}

function duelDefinitionBundle(modeDefinitionId: string, contentHash: string) {
  return Object.freeze({
    schemaVersion: 1,
    modeDefinitionId,
    modeKind: 'duel',
    contentHash,
    participant: Object.freeze({
      definitionId: `${modeDefinitionId}.participant.test.v1`,
      minimumParticipants: 2,
      maximumParticipants: 2,
      roles: Object.freeze([Object.freeze({
        modeRole: 'competitor',
        minimumCount: 2,
        maximumCount: 2,
        allowedControllerKinds: Object.freeze(['human', 'bot']),
        teamId: null,
        slotIds: Object.freeze([]),
      })]),
      controllerKindBounds: Object.freeze([
        Object.freeze({ controllerKind: 'human', minimumCount: 1, maximumCount: 1 }),
        Object.freeze({ controllerKind: 'bot', minimumCount: 1, maximumCount: 1 }),
      ]),
    }),
    elimination: Object.freeze({
      definitionId: `${modeDefinitionId}.elimination.test.v1`,
      roleDispositions: Object.freeze([
        Object.freeze({ modeRole: 'competitor', fallDisposition: 'eliminate' }),
      ]),
    }),
    respawn: Object.freeze({
      definitionId: `${modeDefinitionId}.respawn.test.v1`,
      rolePolicies: Object.freeze([Object.freeze({
        modeRole: 'competitor',
        enabled: false,
        delayTicks: 0,
        maximumRespawns: 0,
        anchorPolicy: Object.freeze({ kind: 'disabled', anchorCapabilityId: null }),
        protectionTicks: 0,
      })]),
    }),
    relationship: Object.freeze({
      definitionId: `${modeDefinitionId}.relationship.test.v1`,
      selfTargeting: 'forbidden',
      relations: Object.freeze([Object.freeze({
        sourceRole: 'competitor',
        targetRole: 'competitor',
        relationship: 'hostile',
      })]),
    }),
  });
}

function raceFixture(
  request: Readonly<ArenaModeVerificationRunRequestV1>,
  assignments: ArenaMatchConfigV6['participantAssignments'],
  terminalTick: number,
) {
  const fixtureDefinitionId = request.fixtureDefinitionId;
  if (fixtureDefinitionId === null) throw new RangeError('Race verification缺少fixture。');
  const anchors = assignments.map((_, index) => anchorId('race-safe', index));
  return Object.freeze({
    schemaVersion: 1,
    fixtureDefinitionId,
    preparingTicks: RACE_MODE_PREPARING_TICKS_V1,
    respawnDelayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
    respawnProtectionTicks: TEST_RESPAWN_PROTECTION_TICKS,
    hardLimitActiveTicks: terminalTick - RACE_MODE_PREPARING_TICKS_V1
      + (request.profile === 'long-run' ? 0 : 1),
    finishGateId: 'race-finish-gate.test',
    safeAnchorIds: Object.freeze(anchors),
    fallbackSafeAnchorId: anchors[0]!,
    initialSafeAnchors: Object.freeze(assignments.map((assignment, index) => Object.freeze({
      participantId: assignment.participantId,
      anchorId: anchors[index]!,
    }))),
  });
}

function survivalFixture(
  request: Readonly<ArenaModeVerificationRunRequestV1>,
  assignments: ArenaMatchConfigV6['participantAssignments'],
  terminalTick: number,
) {
  const fixtureDefinitionId = request.fixtureDefinitionId;
  if (fixtureDefinitionId === null) throw new RangeError('Survival verification缺少fixture。');
  const enemies = assignments.filter(({ modeRole }) => modeRole === 'enemy');
  return Object.freeze({
    schemaVersion: 1,
    fixtureDefinitionId,
    terminalPlayerFallCount: SURVIVAL_MODE_TERMINAL_PLAYER_FALL_COUNT_V1,
    playerRespawnDelayTicks: TEST_SURVIVAL_RESPAWN_DELAY_TICKS,
    playerRespawnProtectionTicks: TEST_SURVIVAL_RESPAWN_PROTECTION_TICKS,
    playerRespawnAnchorId: 'survival-player-anchor.test',
    hardLimitActiveTicks: terminalTick + (request.profile === 'long-run' ? 0 : 1),
    pressurePolicyDefinitionId: 'arena.survival.pressure.verification.test.v1',
    tierPolicyDefinitionId: 'arena.survival.tier.verification.test.v1',
    slotActivationOrder: Object.freeze(enemies.map(({ slotId: value }) => value!)),
    slotEntries: Object.freeze(enemies.map((enemy, index) => Object.freeze({
      slotId: enemy.slotId!,
      participantId: enemy.participantId,
      anchorId: anchorId('survival-enemy', index),
    }))),
    pressureStages: Object.freeze([Object.freeze({
      stage: 0,
      startActiveTick: 0,
      desiredActiveEnemySlots: request.enemySlotCount,
      reactivationDelayTicks: 2,
    })]),
    equipmentTiers: Object.freeze([Object.freeze({
      minimumWaveIndex: 0,
      survivalLevel: 1,
      variants: Object.freeze([Object.freeze({
        collectionEquipmentDefinitionId: 'equipment.collection.verification.test',
        runtimeEquipmentDefinitionId: 'equipment.runtime.verification-level-1.test',
      })]),
    })]),
  });
}

export function createArenaModeVerificationFixtureV1(
  value: unknown,
): DeepReadonly<ArenaModeVerificationFixtureV1> {
  const request = normalizeRequest(value);
  const terminalTick = terminalAuthorityTick(request);
  const assignments = createAssignments(request);
  const modePolicyContentHash = createDeterministicDataHash({
    modeDefinitionId: request.modeDefinitionId,
    fixtureDefinitionId: request.fixtureDefinitionId,
    participantCount: request.participantCount,
    enemySlotCount: request.enemySlotCount,
    terminalTick,
  }, 'Arena Mode verification fixture policy');
  const config = createArenaMatchConfigV6({
    schemaVersion: ARENA_MATCH_CONFIG_V6_SCHEMA_VERSION,
    modeDefinitionId: request.modeDefinitionId,
    modeKind: request.modeKind,
    modePolicyContentHash,
    participantAssignments: assignments,
  });
  const mode: ModeMatchRuntimeV6ModeOptions = request.modeKind === 'duel'
    ? Object.freeze({
      kind: 'duel',
      definitionBundle: duelDefinitionBundle(request.modeDefinitionId, modePolicyContentHash),
    })
    : request.modeKind === 'race'
      ? Object.freeze({ kind: 'race', fixture: raceFixture(request, config.participantAssignments, terminalTick) })
      : Object.freeze({
        kind: 'survival',
        fixture: survivalFixture(request, config.participantAssignments, terminalTick),
      });
  return Object.freeze({
    candidateStatus: ARENA_MODE_VERIFICATION_FIXTURE_V1_CANDIDATE_STATUS,
    config,
    localParticipantId: config.participantAssignments.find(
      ({ controllerKind }) => controllerKind === ARENA_MATCH_CONTROLLER_KIND_V2.HUMAN,
    )!.participantId,
    mode,
    terminalAuthorityTick: terminalTick,
  });
}
