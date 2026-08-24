import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2MatchSceneReadFrameCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

export interface ArenaV2CurrentWeaponThreatOpponentCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly tick: number;
  readonly participantId: string;
  readonly equipmentDefinitionId: string;
  readonly actionDefinitionId: string | null;
  readonly actionPhase: string;
  readonly horizontalDistance: number;
  readonly verticalDistance: number;
  readonly currentThreatDistance: number;
  readonly facingPressure: number;
  readonly score: number;
  readonly selectionIdentityHash: string;
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function phaseScore(phase: string): number {
  switch (phase) {
    case 'active': return 50;
    case 'windup': return 42;
    case 'recovery': return 18;
    case 'idle': return 0;
    default: return -20;
  }
}

function allowedOpponentIds(
  scene: ArenaV2MatchSceneReadFrameCandidateV1,
): ReadonlySet<string> | null {
  const projection = scene.world.modeProjection.state;
  if (projection.kind === 'race') {
    return new Set(projection.participants
      .filter(({ status }) => status === 'racing')
      .map(({ participantId }) => participantId));
  }
  if (projection.kind === 'survival') {
    return new Set(projection.enemySlots
      .filter(({ active }) => active)
      .map(({ participantId }) => participantId));
  }
  return null;
}

/**
 * Ranks current armed threats using only the current Scene Read Frame.
 * Active/windup actions, being inside current weapon range, facing pressure
 * and distance raise priority; a stable participant ID resolves exact ties.
 */
export function rankArenaV2CurrentWeaponThreatOpponentsCandidateV1(
  scene: ArenaV2MatchSceneReadFrameCandidateV1,
): readonly ArenaV2CurrentWeaponThreatOpponentCandidateV1[] {
  if (scene.schemaVersion !== 1 || scene.status !== 'production-unreachable') {
    throw new RangeError('Arena V2当前武器威胁选择只接受V1 Scene Read Frame候选。');
  }
  const self = scene.world.participants.find(({ id }) => id === scene.localParticipantId);
  if (!self) throw new RangeError('Arena V2当前武器威胁选择缺少local participant。');
  const allowedIds = allowedOpponentIds(scene);
  const candidates = scene.world.participants.flatMap((opponent) => {
    if (
      opponent.id === self.id
      || opponent.status !== 'active'
      || opponent.respawnTicks !== 0
      || opponent.equipment === null
      || (allowedIds !== null && !allowedIds.has(opponent.id))
    ) return [];
    const profile = ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1.find(
      ({ equipmentDefinitionId }) => (
        equipmentDefinitionId === opponent.equipment!.collectionEquipmentDefinitionId
      ),
    );
    if (!profile) return [];
    const dx = self.position.x - opponent.position.x;
    const dz = self.position.z - opponent.position.z;
    const horizontalDistance = Math.hypot(dx, dz);
    const verticalDistance = Math.abs(self.position.y - opponent.position.y);
    const directionLength = Math.hypot(dx, dz);
    const facingLength = Math.hypot(opponent.facing.x, opponent.facing.z);
    const facingPressure = directionLength <= Number.EPSILON || facingLength <= Number.EPSILON
      ? 0
      : Math.max(0, Math.min(1, (
        (dx / directionLength) * (opponent.facing.x / facingLength)
        + (dz / directionLength) * (opponent.facing.z / facingLength)
      )));
    const currentThreatDistance = opponent.grounded
      ? profile.groundThreatDistance
      : profile.aerialThreatDistance;
    const distanceRatio = horizontalDistance / currentThreatDistance;
    const rangePressure = distanceRatio <= 1
      ? 45
      : Math.max(0, 45 - (distanceRatio - 1) * 22.5);
    const distancePressure = Math.max(0, 30 - horizontalDistance * 4);
    const heightPenalty = Math.min(24, verticalDistance * 8);
    const score = rounded(
      phaseScore(opponent.action.phase)
      + rangePressure
      + distancePressure
      + facingPressure * 28
      - heightPenalty,
    );
    const authority = Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      tick: scene.source.tick,
      participantId: opponent.id,
      equipmentDefinitionId: opponent.equipment.collectionEquipmentDefinitionId,
      actionDefinitionId: opponent.action.definitionId,
      actionPhase: opponent.action.phase,
      horizontalDistance: rounded(horizontalDistance),
      verticalDistance: rounded(verticalDistance),
      currentThreatDistance,
      facingPressure: rounded(facingPressure),
      score,
    });
    return [Object.freeze({
      ...authority,
      selectionIdentityHash: createDeterministicDataHash(
        authority,
        `Arena V2 current weapon threat ${opponent.id}`,
      ),
    })];
  }).filter(({ score }) => score > 0).sort((left, right) => (
    right.score - left.score
    || (left.participantId < right.participantId
      ? -1
      : left.participantId > right.participantId ? 1 : 0)
  ));
  return Object.freeze(candidates);
}

export function selectArenaV2CurrentWeaponThreatOpponentCandidateV1(
  scene: ArenaV2MatchSceneReadFrameCandidateV1,
): ArenaV2CurrentWeaponThreatOpponentCandidateV1 | null {
  return rankArenaV2CurrentWeaponThreatOpponentsCandidateV1(scene)[0] ?? null;
}

export const ARENA_V2_CURRENT_WEAPON_THREAT_OPPONENT_SELECTOR_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  readsCurrentSceneOnly: true as const,
  usesFuturePositionActionOrRoute: false as const,
  filtersRaceToRacingParticipants: true as const,
  filtersSurvivalToActiveEnemySlots: true as const,
  returnsNullWithoutCurrentArmedThreat: true as const,
  minimumExclusiveThreatScore: 0 as const,
  exposesCanonicalCurrentRanking: true as const,
  stableTieBreak: 'participant-id' as const,
  defaultBotRegistryWired: false as const,
  validationStatus: 'not-run' as const,
});
