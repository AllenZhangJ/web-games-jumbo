import type {
  ProductMatchResultV3,
} from '@number-strategy-jump/arena-product-contracts';
import { PRODUCT_MODE_ROLE } from '@number-strategy-jump/arena-product-contracts';

/**
 * Projects whether an authority result contains an effective mode completion
 * for one participant. Unknown participants, enemies and a non-player
 * Survival recipient fail closed so every caller shares the same boundary.
 */
export function isArenaV2EffectiveMatchCompletionV1(
  result: Readonly<ProductMatchResultV3>,
  participantId: string,
): boolean {
  const assignment = result.participantAssignments.find((entry) => (
    entry.participantId === participantId
  ));
  if (assignment === undefined || assignment.modeRole === PRODUCT_MODE_ROLE.ENEMY) {
    return false;
  }
  if (result.modeResult.kind === 'survival') {
    return result.modeResult.playerParticipantId === participantId;
  }
  if (result.modeResult.kind === 'duel') return true;
  if (result.modeResult.reason !== 'finish-claimed') return false;
  return result.modeResult.rankings.some((entry) => (
    entry.participantId === participantId
    && (entry.finishTick !== null || entry.progressOrdinal > 0)
  ));
}

/**
 * Narrows an effective completion to the fact required for permanent map
 * collection. Race route progress remains a valid completion/learning fact,
 * but the whole map is collected only by the participant who crossed the
 * finish. Duel and Survival keep their effective-completion semantics.
 */
export function isArenaV2WholeMapCollectionEarnedV1(
  result: Readonly<ProductMatchResultV3>,
  participantId: string,
): boolean {
  if (!isArenaV2EffectiveMatchCompletionV1(result, participantId)) return false;
  if (result.modeResult.kind !== 'race') return true;
  return result.modeResult.rankings.some((entry) => (
    entry.participantId === participantId && entry.finishTick !== null
  ));
}
