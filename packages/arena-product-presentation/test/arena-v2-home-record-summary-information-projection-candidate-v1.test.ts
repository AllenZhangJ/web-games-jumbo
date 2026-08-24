import { describe, expect, it } from 'vitest';
import {
  projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1,
} from '../src/index.js';

function fieldSource() {
  return Object.freeze({
    ownerId: 'p6-reward-profile' as const,
    fieldValues: Object.freeze([Object.freeze({
      fieldId: 'recent-records',
      labelMessageId: 'arena.v2.field.recent-records',
      valueText: '累计结算1次；经验120',
      accessibilityText: '累计结算一局，获得一百二十经验。',
      fixedWidthNumeric: true,
    })]),
  });
}

function summary() {
  return Object.freeze({
    schemaVersion: 1 as const,
    modeRecords: Object.freeze([
      Object.freeze({
        kind: 'duel' as const,
        modeDefinitionId: 'mode.duel',
        playCount: 4,
        completionCount: 4,
        winCount: 2,
        bestPerformanceTicks: 480,
        compactText: '1v1 00:08',
        accessibilityText: '1v1游玩4局，完成4局，获胜2局，最快胜利00:08。',
      }),
      Object.freeze({
        kind: 'race' as const,
        modeDefinitionId: 'mode.race',
        playCount: 3,
        completionCount: 2,
        winCount: 1,
        bestPerformanceTicks: 1200,
        compactText: '竞速 00:20',
        accessibilityText: '竞速游玩3局，完成2局，获胜1局，最快到达00:20。',
      }),
      Object.freeze({
        kind: 'survival' as const,
        modeDefinitionId: 'mode.survival',
        playCount: 1,
        completionCount: 1,
        winCount: 0,
        bestPerformanceTicks: 600,
        compactText: '生存 00:10',
        accessibilityText: '生存游玩1局，完成1局，最长坚持00:10。',
      }),
    ]),
    modeMasteryProgress: 7,
    modeMasteryTarget: 15,
    collectedWeaponCount: 5,
    weaponCount: 20,
    weaponMainResearchProgress: 480,
    weaponMainResearchTarget: 2400,
    completedWeaponContextCount: 18,
    weaponContextCount: 100,
    weaponContextEvidenceProgress: 61,
    weaponContextEvidenceTarget: 300,
    completedWeaponContextEvidence: 54,
    collectedMapCount: 1,
    mapCount: 2,
    completedMapSegmentCount: 4,
    mapSegmentCount: 12,
    mapRouteResearchProgress: 9,
    mapRouteResearchTarget: 24,
    completedChallengeCount: 6,
    challengeCount: 16,
    challengeProgress: 18,
    challengeProgressTarget: 48,
    compactText: '1v1 00:08｜竞速 00:20｜生存 00:10；模式熟练7/15·武器5/20·主研究480/2400·情境18/100·情境研究61/300·地图1/2·路线4/12·路线研究9/24·挑战6/16·挑战进度18/48',
    accessibilityText: '三种模式记录。三种模式累计熟练进度7/15；每种模式最多计入5次有效完成。已收藏5/20把武器，全部武器主研究进度480/2400；每局最多一把主研究武器增加1点。已完成18/100项武器实战情境，全部武器累计情境研究进度61/300；已收藏1/2张地图；已完整理解4/12个地图路段，全部地图累计路线研究进度9/24。已完成6/16项交叉挑战，累计挑战进度18/48；多项挑战可在同一局重叠推进，因此不推算剩余局数。',
  });
}

describe('Arena V2 home record summary information projection candidate V1', () => {
  it('enhances the existing recent-records field without adding a field or action', () => {
    const result = projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: fieldSource(),
      summary: summary(),
    });
    expect(result.fieldValues).toHaveLength(fieldSource().fieldValues.length);
    expect(result.fieldValues[0]).toMatchObject({
      fieldId: 'recent-records',
      valueText: '累计结算1次；经验120；1v1 00:08｜竞速 00:20｜生存 00:10；模式熟练7/15·武器5/20·主研究480/2400·情境18/100·情境研究61/300·地图1/2·路线4/12·路线研究9/24·挑战6/16·挑战进度18/48',
      fixedWidthNumeric: true,
    });
    expect(result.fieldValues[0]?.accessibilityText).toContain('已收藏5/20把武器');
  });

  it('fails closed on owner, field, order, count and compact-copy drift', () => {
    const project = (overrides: Record<string, unknown> = {}) => (
      projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1({
        schemaVersion: 1,
        fieldSource: fieldSource(),
        summary: summary(),
        ...overrides,
      } as never)
    );
    expect(() => project({
      fieldSource: { ...fieldSource(), ownerId: 'future-owner' },
    })).toThrow(/Reward Profile/);
    expect(() => project({
      fieldSource: { ...fieldSource(), fieldValues: [] },
    })).toThrow(/recent-records/);
    expect(() => project({
      summary: { ...summary(), modeRecords: [...summary().modeRecords].reverse() },
    })).toThrow(/顺序/);
    expect(() => project({
      summary: { ...summary(), collectedWeaponCount: 21 },
    })).toThrow(/不得超过总量/);
    expect(() => project({
      summary: { ...summary(), weaponContextCount: 99 },
    })).toThrow(/五情境/);
    expect(() => project({
      summary: { ...summary(), modeMasteryProgress: 8 },
    })).toThrow(/模式熟练/);
    expect(() => project({
      summary: { ...summary(), weaponMainResearchTarget: 2399 },
    })).toThrow(/主研究/);
    expect(() => project({
      summary: { ...summary(), weaponContextEvidenceProgress: 53 },
    })).toThrow(/情境研究/);
    expect(() => project({
      summary: { ...summary(), mapRouteResearchTarget: 25 },
    })).toThrow(/路线研究/);
    expect(() => project({
      summary: { ...summary(), mapRouteResearchProgress: 7 },
    })).toThrow(/路线研究/);
    expect(() => project({
      summary: { ...summary(), challengeProgress: 49 },
    })).toThrow(/不得超过总量/);
    expect(() => project({
      summary: { ...summary(), completedChallengeCount: 16 },
    })).toThrow(/不闭合/);
    expect(() => project({
      summary: {
        ...summary(),
        completedChallengeCount: 15,
        challengeProgress: 48,
      },
    })).toThrow(/不闭合/);
    expect(() => project({
      summary: { ...summary(), compactText: '未来漂移' },
    })).toThrow(/紧凑文案/);
  });
});
