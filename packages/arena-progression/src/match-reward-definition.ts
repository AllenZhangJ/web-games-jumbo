import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const MATCH_REWARD_DEFINITION_SCHEMA_VERSION = 1;

export interface MatchRewardDefinitionValue {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly contentVersion: number;
  readonly participantId: string;
  readonly completionExperience: number;
  readonly winnerBonusExperience: number;
  readonly drawBonusExperience: number;
}

const KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'participantId',
  'completionExperience', 'winnerBonusExperience', 'drawBonusExperience',
]);

export class MatchRewardDefinition implements MatchRewardDefinitionValue {
  declare readonly schemaVersion: 1;
  declare readonly id: string;
  declare readonly contentVersion: number;
  declare readonly participantId: string;
  declare readonly completionExperience: number;
  declare readonly winnerBonusExperience: number;
  declare readonly drawBonusExperience: number;

  constructor(value: unknown) {
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
        value: assertIntegerAtLeast(source.completionExperience, 0, 'MatchRewardDefinition.completionExperience'),
        enumerable: true,
      },
      winnerBonusExperience: {
        value: assertIntegerAtLeast(source.winnerBonusExperience, 0, 'MatchRewardDefinition.winnerBonusExperience'),
        enumerable: true,
      },
      drawBonusExperience: {
        value: assertIntegerAtLeast(source.drawBonusExperience, 0, 'MatchRewardDefinition.drawBonusExperience'),
        enumerable: true,
      },
    });
    if (!Number.isSafeInteger(
      this.completionExperience + this.winnerBonusExperience + this.drawBonusExperience
    )) throw new RangeError('MatchRewardDefinition 经验总和超出安全整数范围。');
    Object.freeze(this);
  }
}

export function createMatchRewardDefinition(value: unknown): MatchRewardDefinition {
  if (
    value instanceof MatchRewardDefinition
    && Object.getPrototypeOf(value) === MatchRewardDefinition.prototype
  ) return value;
  return new MatchRewardDefinition(value);
}
