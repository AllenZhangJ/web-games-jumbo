import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_PARTICIPANT_STATUS,
  type ArenaParticipantStatus,
} from './match-config.js';

const OPTIONS_KEYS = new Set(['participantIds', 'livesPerParticipant']);
const ELIMINATION_KEYS = new Set([
  'tick',
  'suddenDeath',
  'lastHitCreditTicks',
  'respawnTicks',
]);
const RESPAWN_KEYS = new Set(['invulnerableTicks', 'reason']);
const RESPAWN_REASON = Object.freeze({
  TIMER: 'timer',
  PHASE_TRANSITION: 'phase-transition',
} as const);

interface ParticipantRuntime {
  readonly id: string;
  readonly spawnIndex: number;
  lives: number;
  status: ArenaParticipantStatus;
  eliminations: number;
  deaths: number;
  hitstunTicks: number;
  invulnerableTicks: number;
  respawnTicks: number;
  lastHitBy: string | null;
  lastHitTick: number;
}

export interface MatchParticipantSnapshot {
  readonly id: string;
  readonly status: ArenaParticipantStatus;
  readonly lives: number;
  readonly eliminations: number;
  readonly deaths: number;
  readonly hitstunTicks: number;
  readonly invulnerableTicks: number;
  readonly respawnTicks: number;
  readonly lastHitBy: string | null;
  readonly lastHitTick: number;
}

export interface ParticipantEliminationOutcome {
  readonly participantId: string;
  readonly remainingLives: number;
  readonly creditedAttackerId: string | null;
  readonly terminal: boolean;
}

export interface ParticipantTimeoutOutcome {
  readonly winnerId: string | null;
  readonly reason: 'timeout-draw' | 'timeout-score';
  readonly isDraw: boolean;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function createRuntime(id: string, lives: number, spawnIndex: number): ParticipantRuntime {
  return {
    id,
    lives,
    spawnIndex,
    status: ARENA_PARTICIPANT_STATUS.ACTIVE,
    eliminations: 0,
    deaths: 0,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    respawnTicks: 0,
    lastHitBy: null,
    lastHitTick: -1,
  };
}

function createSnapshot(participant: ParticipantRuntime): MatchParticipantSnapshot {
  return Object.freeze({
    id: participant.id,
    status: participant.status,
    lives: participant.lives,
    eliminations: participant.eliminations,
    deaths: participant.deaths,
    hitstunTicks: participant.hitstunTicks,
    invulnerableTicks: participant.invulnerableTicks,
    respawnTicks: participant.respawnTicks,
    lastHitBy: participant.lastHitBy,
    lastHitTick: participant.lastHitTick,
  });
}

export class MatchParticipantSystem {
  readonly #participantIds: readonly string[];
  readonly #participants: Map<string, ParticipantRuntime>;
  #destroyed = false;
  #mutating = false;

  constructor(options: unknown) {
    const source = cloneFrozenData(options, 'MatchParticipantSystem options');
    assertKnownKeys(source, OPTIONS_KEYS, 'MatchParticipantSystem options');
    if (!Array.isArray(source.participantIds) || source.participantIds.length !== 2) {
      throw new RangeError('MatchParticipantSystem 需要恰好两个 participant ID。');
    }
    const participantIds = source.participantIds.map((value, index) => (
      assertNonEmptyString(value, `MatchParticipantSystem participantIds[${index}]`)
    ));
    if (new Set(participantIds).size !== participantIds.length) {
      throw new RangeError('MatchParticipantSystem participant ID 必须唯一。');
    }
    participantIds.sort(compareText);
    const livesPerParticipant = assertIntegerAtLeast(
      source.livesPerParticipant,
      1,
      'MatchParticipantSystem livesPerParticipant',
    );
    this.#participantIds = Object.freeze(participantIds);
    this.#participants = new Map(this.#participantIds.map((id, index) => [
      id,
      createRuntime(id, livesPerParticipant, index),
    ]));
  }

  get participantIds(): readonly string[] {
    this.#assertUsable();
    return this.#participantIds;
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MatchParticipantSystem 已销毁。');
  }

  #assertMutable(): void {
    this.#assertUsable();
    if (this.#mutating) throw new Error('MatchParticipantSystem mutation 不可重入。');
  }

  #require(participantId: unknown): ParticipantRuntime {
    const id = assertNonEmptyString(participantId, 'participantId');
    const participant = this.#participants.get(id);
    if (!participant) throw new RangeError(`未知 participant ${id}。`);
    return participant;
  }

  getSnapshot(participantId: unknown): MatchParticipantSnapshot {
    this.#assertUsable();
    return createSnapshot(this.#require(participantId));
  }

  listSnapshots(): readonly MatchParticipantSnapshot[] {
    this.#assertUsable();
    return Object.freeze(this.#participantIds.map((id) => createSnapshot(this.#require(id))));
  }

  getSpawnIndex(participantId: unknown): number {
    this.#assertUsable();
    return this.#require(participantId).spawnIndex;
  }

  isActive(participantId: unknown): boolean {
    this.#assertUsable();
    return this.#require(participantId).status === ARENA_PARTICIPANT_STATUS.ACTIVE;
  }

  canAct(participantId: unknown): boolean {
    this.#assertUsable();
    const participant = this.#require(participantId);
    return participant.status === ARENA_PARTICIPANT_STATUS.ACTIVE
      && participant.hitstunTicks === 0;
  }

  isTargetable(participantId: unknown): boolean {
    this.#assertUsable();
    const participant = this.#require(participantId);
    return participant.status === ARENA_PARTICIPANT_STATUS.ACTIVE
      && participant.invulnerableTicks === 0;
  }

  listByStatus(status: ArenaParticipantStatus): readonly string[] {
    this.#assertUsable();
    if (!Object.values(ARENA_PARTICIPANT_STATUS).includes(status)) {
      throw new RangeError(`未知 participant status ${String(status)}。`);
    }
    return Object.freeze(this.#participantIds.filter(
      (id) => this.#require(id).status === status,
    ));
  }

  advanceTimers(): readonly string[] {
    this.#assertMutable();
    for (const id of this.#participantIds) {
      const participant = this.#require(id);
      if (
        participant.status === ARENA_PARTICIPANT_STATUS.RESPAWNING
        && (!Number.isSafeInteger(participant.respawnTicks) || participant.respawnTicks <= 0)
      ) {
        throw new Error(`respawning participant ${id} 缺少正数计时。`);
      }
    }
    this.#mutating = true;
    try {
      const readyRespawnIds: string[] = [];
      for (const id of this.#participantIds) {
        const participant = this.#require(id);
        if (participant.status === ARENA_PARTICIPANT_STATUS.RESPAWNING) {
          participant.respawnTicks -= 1;
          if (participant.respawnTicks === 0) readyRespawnIds.push(id);
          continue;
        }
        if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) continue;
        if (participant.hitstunTicks > 0) participant.hitstunTicks -= 1;
        if (participant.invulnerableTicks > 0) participant.invulnerableTicks -= 1;
      }
      return Object.freeze(readyRespawnIds);
    } finally {
      this.#mutating = false;
    }
  }

  recordHit(attackerId: unknown, targetId: unknown, tick: unknown): void {
    this.#assertMutable();
    const attacker = this.#require(attackerId);
    const target = this.#require(targetId);
    const normalizedTick = assertIntegerAtLeast(tick, 0, 'recordHit tick');
    if (
      attacker.status !== ARENA_PARTICIPANT_STATUS.ACTIVE
      || target.status !== ARENA_PARTICIPANT_STATUS.ACTIVE
    ) throw new Error('recordHit 只接受 active attacker 与 target。');
    if (normalizedTick < target.lastHitTick) {
      throw new RangeError('recordHit tick 不能早于目标已有命中记录。');
    }
    target.lastHitBy = attacker.id;
    target.lastHitTick = normalizedTick;
  }

  applyHitstun(participantId: unknown, ticks: unknown): void {
    this.#assertMutable();
    const participant = this.#require(participantId);
    const normalizedTicks = assertIntegerAtLeast(ticks, 1, 'hitstun ticks');
    if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) {
      throw new Error('hitstun 只接受 active participant。');
    }
    participant.hitstunTicks = Math.max(participant.hitstunTicks, normalizedTicks);
  }

  eliminateBatch(participantIds: unknown, options: unknown): readonly ParticipantEliminationOutcome[] {
    this.#assertMutable();
    const idsValue = cloneFrozenData(participantIds, 'elimination participantIds');
    if (!Array.isArray(idsValue) || idsValue.length === 0) {
      throw new RangeError('elimination participantIds 必须是非空数组。');
    }
    const ids = idsValue.map((value, index) => (
      assertNonEmptyString(value, `elimination participantIds[${index}]`)
    ));
    if (new Set(ids).size !== ids.length) {
      throw new RangeError('elimination participantIds 不能重复。');
    }
    ids.sort(compareText);
    const source = cloneFrozenData(options, 'elimination options');
    assertKnownKeys(source, ELIMINATION_KEYS, 'elimination options');
    const tick = assertIntegerAtLeast(source.tick, 0, 'elimination tick');
    if (typeof source.suddenDeath !== 'boolean') {
      throw new TypeError('elimination suddenDeath 必须是布尔值。');
    }
    const suddenDeath = source.suddenDeath;
    const lastHitCreditTicks = assertIntegerAtLeast(
      source.lastHitCreditTicks,
      1,
      'elimination lastHitCreditTicks',
    );
    const respawnTicks = assertIntegerAtLeast(
      source.respawnTicks,
      1,
      'elimination respawnTicks',
    );
    const participants = ids.map((id) => {
      const participant = this.#require(id);
      if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) {
        throw new Error(`participant ${id} 不是可淘汰 active 状态。`);
      }
      return participant;
    });
    const outcomes = participants.map((participant) => {
      const remainingLives = Math.max(0, participant.lives - 1);
      const creditedAttacker = participant.lastHitBy
        && tick - participant.lastHitTick <= lastHitCreditTicks
        ? this.#participants.get(participant.lastHitBy) ?? null
        : null;
      return {
        participant,
        remainingLives,
        creditedAttacker,
        terminal: suddenDeath || remainingLives === 0,
      };
    });
    this.#mutating = true;
    try {
      for (const outcome of outcomes) {
        outcome.participant.lives = outcome.remainingLives;
        outcome.participant.deaths += 1;
        if (outcome.creditedAttacker) outcome.creditedAttacker.eliminations += 1;
        outcome.participant.status = outcome.terminal
          ? ARENA_PARTICIPANT_STATUS.ELIMINATED
          : ARENA_PARTICIPANT_STATUS.RESPAWNING;
        outcome.participant.respawnTicks = outcome.terminal ? 0 : respawnTicks;
        outcome.participant.hitstunTicks = 0;
        outcome.participant.invulnerableTicks = 0;
      }
      return Object.freeze(outcomes.map((outcome) => Object.freeze({
        participantId: outcome.participant.id,
        remainingLives: outcome.remainingLives,
        creditedAttackerId: outcome.creditedAttacker?.id ?? null,
        terminal: outcome.terminal,
      })));
    } finally {
      this.#mutating = false;
    }
  }

  respawn(participantId: unknown, options: unknown): MatchParticipantSnapshot {
    this.#assertMutable();
    const source = cloneFrozenData(options, 'respawn options');
    assertKnownKeys(source, RESPAWN_KEYS, 'respawn options');
    const invulnerableTicks = assertIntegerAtLeast(
      source.invulnerableTicks,
      1,
      'respawn invulnerableTicks',
    );
    if (
      source.reason !== RESPAWN_REASON.TIMER
      && source.reason !== RESPAWN_REASON.PHASE_TRANSITION
    ) {
      throw new RangeError(`未知 respawn reason ${String(source.reason)}。`);
    }
    const participant = this.#require(participantId);
    if (participant.status !== ARENA_PARTICIPANT_STATUS.RESPAWNING) {
      throw new Error(`participant ${participant.id} 不是 respawning 状态。`);
    }
    if (source.reason === RESPAWN_REASON.TIMER && participant.respawnTicks !== 0) {
      throw new Error(`participant ${participant.id} 的重生计时尚未结束。`);
    }
    participant.status = ARENA_PARTICIPANT_STATUS.ACTIVE;
    participant.respawnTicks = 0;
    participant.hitstunTicks = 0;
    participant.invulnerableTicks = invulnerableTicks;
    participant.lastHitBy = null;
    participant.lastHitTick = -1;
    return createSnapshot(participant);
  }

  resolveTimeout(): ParticipantTimeoutOutcome {
    this.#assertUsable();
    const ranked = this.#participantIds
      .map((id) => this.#require(id))
      .sort((left, right) => (
        right.lives - left.lives
        || right.eliminations - left.eliminations
        || compareText(left.id, right.id)
      ));
    const first = ranked[0];
    const second = ranked[1];
    if (!first || !second) throw new Error('MatchParticipantSystem 排名状态不完整。');
    const tied = first.lives === second.lives
      && first.eliminations === second.eliminations;
    return Object.freeze({
      winnerId: tied ? null : first.id,
      reason: tied ? 'timeout-draw' : 'timeout-score',
      isDraw: tied,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#mutating) throw new Error('mutation 期间不能销毁 MatchParticipantSystem。');
    this.#destroyed = true;
    this.#participants.clear();
  }
}
