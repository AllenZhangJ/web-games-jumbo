import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_MODE_ROLE,
  validateProductMatchResultV3,
} from '@number-strategy-jump/arena-product-contracts';
import {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  createArenaV2LearningGrantV1,
  createArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningGrantV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  isArenaV2EffectiveMatchCompletionV1,
  isArenaV2WholeMapCollectionEarnedV1,
} from './arena-v2-effective-match-completion-v1.js';
import { readExactOptions } from './options.js';

export interface ResolveArenaV2MatchLearningGrantV1Options {
  readonly profileDefinition: unknown;
  readonly result: unknown;
  readonly recipientParticipantId: unknown;
}

const OPTION_KEYS = new Set(['profileDefinition', 'result', 'recipientParticipantId']);

function winner(
  result: ReturnType<typeof validateProductMatchResultV3>,
  participantId: string,
): boolean {
  if (result.modeResult.kind === 'survival') return false;
  return result.modeResult.winnerParticipantIds.includes(participantId);
}

function performanceTicks(
  result: ReturnType<typeof validateProductMatchResultV3>,
  participantId: string,
): number | null {
  if (result.modeResult.kind === 'survival') return result.modeResult.survivedTicks;
  if (result.modeResult.kind === 'duel') {
    return winner(result, participantId) ? result.modeResult.endedAtTick : null;
  }
  return result.modeResult.rankings.find(
    (entry) => entry.participantId === participantId,
  )?.finishTick ?? null;
}

/**
 * Resolves only facts carried by ProductMatchResultV3. In particular, this
 * resolver does not invent main weapon research, weapon context, route-segment
 * or challenge evidence because Result V3 proves accepted starts but cannot
 * distinguish an effective action from an explicitly cancelled commitment.
 */
export function resolveArenaV2MatchLearningGrantV1(
  value: unknown,
): ArenaV2LearningGrantV1 {
  const options = readExactOptions(
    value,
    OPTION_KEYS,
    'ResolveArenaV2MatchLearningGrantV1 options',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const result = validateProductMatchResultV3(options.result);
  if (typeof options.recipientParticipantId !== 'string'
    || options.recipientParticipantId.trim().length === 0) {
    throw new TypeError('Learning grant recipientParticipantId 必须是非空字符串。');
  }
  const recipientParticipantId = options.recipientParticipantId;
  const assignment = result.participantAssignments.find(
    (entry) => entry.participantId === recipientParticipantId,
  );
  if (!assignment || assignment.modeRole === PRODUCT_MODE_ROLE.ENEMY) {
    throw new RangeError('Learning grant recipient必须是当局非enemy参与者。');
  }
  if (result.modeResult.kind === 'survival'
    && result.modeResult.playerParticipantId !== recipientParticipantId) {
    throw new RangeError('Survival learning grant只能授予权威player。');
  }
  const modeDefinition = definition.modeDefinitions.find(
    (entry) => entry.modeDefinitionId === result.modeDefinitionId,
  );
  if (!modeDefinition || modeDefinition.kind !== result.modeResult.kind) {
    throw new RangeError('Learning Profile缺少与赛果一致的Mode Definition。');
  }
  const mapIds = result.content.mapDefinitionIds;
  const registeredMapIds = new Set(definition.mapDefinitions.map((entry) => entry.mapDefinitionId));
  if (mapIds.length === 0 || mapIds.some((id) => !registeredMapIds.has(id))) {
    throw new RangeError('Learning grant赛果地图不在Profile Definition。');
  }
  const usage = result.participantEquipmentUsage.find(
    (entry) => entry.participantId === recipientParticipantId,
  );
  if (!usage) throw new RangeError('Learning grant赛果缺少recipient武器使用摘要。');
  const registeredWeapons = new Set(definition.weaponDefinitionIds);
  if (usage.usedCollectionEquipmentDefinitionIds.some((id) => !registeredWeapons.has(id))) {
    throw new RangeError('Learning grant使用了Profile Definition之外的武器。');
  }
  const grantIdentityHash = createDeterministicDataHash({
    profileDefinitionId: definition.id,
    profileDefinitionContentHash: definition.contentHash,
    resultAuthorityHash: result.authorityHash,
    recipientParticipantId,
  }, 'Arena V2 Learning Grant Identity V1');
  const resultGrantId = `arena-learning:v1:${grantIdentityHash}`;
  const effectiveCompletion = isArenaV2EffectiveMatchCompletionV1(
    result,
    recipientParticipantId,
  );
  const wholeMapCollectionEarned = isArenaV2WholeMapCollectionEarnedV1(
    result,
    recipientParticipantId,
  );
  return createArenaV2LearningGrantV1(definition, {
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId: resultGrantId,
    resultAuthorityHash: result.authorityHash,
    recipientParticipantId,
    sourceModeDefinitionId: result.modeDefinitionId,
    sourceMapDefinitionIds: mapIds,
    collectedWeaponDefinitionIds: [],
    collectedMapDefinitionIds: wholeMapCollectionEarned ? mapIds : [],
    weaponDeltas: [],
    mapSegmentDeltas: [],
    modeDelta: {
      modeDefinitionId: result.modeDefinitionId,
      playCountDelta: 1,
      completionCountDelta: effectiveCompletion ? 1 : 0,
      winCountDelta: winner(result, recipientParticipantId) ? 1 : 0,
      bestPerformanceTicksCandidate: performanceTicks(result, recipientParticipantId),
    },
    challengeDeltas: [],
  });
}
