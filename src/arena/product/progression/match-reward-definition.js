import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const MATCH_REWARD_DEFINITION_SCHEMA_VERSION = 1;

const KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'participantId',
  'completionExperience',
  'winnerBonusExperience',
  'drawBonusExperience',
]);

export class MatchRewardDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'MatchRewardDefinition');
    assertKnownKeys(source, KEYS, 'MatchRewardDefinition');
    if (source.schemaVersion !== MATCH_REWARD_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 MatchRewardDefinition schema ${String(source.schemaVersion)}。`);
    }
    Object.defineProperties(this, {
      schemaVersion: { value: MATCH_REWARD_DEFINITION_SCHEMA_VERSION, enumerable: true },
      id: { value: assertNonEmptyString(source.id, 'MatchRewardDefinition.id'), enumerable: true },
      contentVersion: {
        value: assertIntegerAtLeast(source.contentVersion, 1, 'MatchRewardDefinition.contentVersion'),
        enumerable: true,
      },
      participantId: {
        value: assertNonEmptyString(source.participantId, 'MatchRewardDefinition.participantId'),
        enumerable: true,
      },
      completionExperience: {
        value: assertIntegerAtLeast(
          source.completionExperience,
          0,
          'MatchRewardDefinition.completionExperience',
        ),
        enumerable: true,
      },
      winnerBonusExperience: {
        value: assertIntegerAtLeast(
          source.winnerBonusExperience,
          0,
          'MatchRewardDefinition.winnerBonusExperience',
        ),
        enumerable: true,
      },
      drawBonusExperience: {
        value: assertIntegerAtLeast(
          source.drawBonusExperience,
          0,
          'MatchRewardDefinition.drawBonusExperience',
        ),
        enumerable: true,
      },
    });
    if (!Number.isSafeInteger(
      this.completionExperience + this.winnerBonusExperience + this.drawBonusExperience,
    )) {
      throw new RangeError('MatchRewardDefinition 经验总和超出安全整数范围。');
    }
    Object.freeze(this);
  }
}

export function createMatchRewardDefinition(value) {
  return value instanceof MatchRewardDefinition ? value : new MatchRewardDefinition(value);
}
