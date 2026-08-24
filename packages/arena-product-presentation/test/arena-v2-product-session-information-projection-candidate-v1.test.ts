import { describe, expect, it } from 'vitest';
import { createProductMatchResultV3 } from '@number-strategy-jump/arena-product-contracts';
import {
  projectArenaV2ProductSessionInformationCandidateV1,
} from '../src/index.js';

const HEAVY_HAMMER = 'arena-v2.weapon.heavy-hammer.candidate.v1';
const FLANK_BLADE = 'arena-v2.weapon.flank-blade.candidate.v1';

function productResult(
  localUsage: readonly string[] = Object.freeze([FLANK_BLADE, HEAVY_HAMMER]),
  selectedMapDefinitionId = 'map.duel.presentation.test.v1',
  modeResult: unknown = {
    kind: 'duel',
    winnerParticipantIds: ['p1'],
    isDraw: false,
    reason: 'last-participant-standing',
    endedAtTick: 300,
  },
) {
  return createProductMatchResultV3({
    schemaVersion: 3,
    modeDefinitionId: 'mode.duel.presentation.test.v1',
    matchSeed: 17,
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: '1234abcd',
    },
    content: {
      schemaVersion: 2,
      modeDefinitionId: 'mode.duel.presentation.test.v1',
      contentDefinitionId: 'content.duel.presentation.test.v1',
      contentVersion: 1,
      characterDefinitionIds: ['fighter-a', 'fighter-b'],
      equipmentDefinitionIds: [FLANK_BLADE, HEAVY_HAMMER],
      mapDefinitionIds: [selectedMapDefinitionId],
      selectedMapDefinitionId,
      participantCharacters: [
        { participantId: 'p1', definitionId: 'fighter-a' },
        { participantId: 'p2', definitionId: 'fighter-b' },
      ],
    },
    participantAssignments: [
      {
        participantId: 'p1',
        modeRole: 'competitor',
        teamId: null,
        slotId: null,
        slotGeneration: 0,
      },
      {
        participantId: 'p2',
        modeRole: 'competitor',
        teamId: null,
        slotId: null,
        slotGeneration: 0,
      },
    ],
    participantEquipmentUsage: [
      { participantId: 'p1', usedCollectionEquipmentDefinitionIds: localUsage },
      { participantId: 'p2', usedCollectionEquipmentDefinitionIds: [] },
    ],
    modeResult,
    publicParticipants: [
      {
        participantId: 'p1',
        displayName: 'Player 1',
        portraitKey: 'portrait.p1',
        appearanceKey: 'appearance.p1',
        identityOrdinal: 1,
        identityGlyphKey: 'glyph.1',
        identityPatternKey: 'pattern.1',
      },
      {
        participantId: 'p2',
        displayName: 'Player 2',
        portraitKey: 'portrait.p2',
        appearanceKey: 'appearance.p2',
        identityOrdinal: 2,
        identityGlyphKey: 'glyph.2',
        identityPatternKey: 'pattern.2',
      },
    ],
  });
}

function resultFields(value: ReturnType<
  typeof projectArenaV2ProductSessionInformationCandidateV1
>) {
  return value.screens.find(({ screenId }) => screenId === 'result-reward')!
    .fieldSource.fieldValues;
}

describe('P5.3zj Product Result V3 equipment usage information projection candidate', () => {
  it('projects the canonical local usage identity after the terminal result', () => {
    const projection = projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: 'duel',
      productResult: productResult(),
      localParticipantId: 'p1',
    });
    expect(resultFields(projection)).toEqual([
      expect.objectContaining({
        fieldId: 'match-result',
        valueText: '常规1v1 胜利 · 00:05 · 再练：同组合争取更快击落',
      }),
      expect.objectContaining({
        fieldId: 'full-match-record',
        valueText: '本局地图：map.duel.presentation.test.v1；本局使用：侧袭刃、重锤',
      }),
    ]);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(resultFields(projection))).toBe(true);
  });

  it('turns a duel loss into one short next-match action without guessing its cause', () => {
    const projection = projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: 'duel',
      productResult: productResult(
        Object.freeze([HEAVY_HAMMER]),
        'arena-v2-kz-base-map.candidate.v1',
        {
          kind: 'duel',
          winnerParticipantIds: ['p2'],
          isDraw: false,
          reason: 'last-participant-standing',
          endedAtTick: 420,
        },
      ),
      localParticipantId: 'p1',
    });
    expect(resultFields(projection)[0]).toMatchObject({
      fieldId: 'match-result',
      valueText: '常规1v1 失败 · 00:07 · 再练：先稳住落点再反击',
      accessibilityText:
        '本局权威结果：常规1v1 失败 · 00:07。下一局先稳住自己的落点，再寻找反击机会。',
    });
  });

  it('keeps a canonical empty-usage fact instead of guessing from selection', () => {
    const projection = projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: 'duel',
      productResult: productResult(Object.freeze([])),
      localParticipantId: 'p1',
    });
    expect(resultFields(projection)[1]).toMatchObject({
      fieldId: 'full-match-record',
      valueText: '本局地图：map.duel.presentation.test.v1；本局未使用收藏武器',
    });
    expect(resultFields(projection)[1]?.accessibilityText).not.toContain('主复盘');
  });

  it('reuses the selected map and used weapon catalogs for one next-match review focus', () => {
    const projection = projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: 'duel',
      productResult: productResult(
        Object.freeze([FLANK_BLADE, HEAVY_HAMMER]),
        'arena-v2-kz-base-map.candidate.v1',
      ),
      localParticipantId: 'p1',
    });
    expect(resultFields(projection)[1]).toMatchObject({
      fieldId: 'full-match-record',
      valueText: '本局地图：KZ 十二段竞技路线；本局使用：侧袭刃、重锤；主复盘重锤：推离·按一下；下局优先找边缘（第2段·定向断层）、开阔平台（第1段·起步平台）',
      accessibilityText: expect.stringContaining('主复盘不代表命中次数或表现结论'),
    });
    expect(resultFields(projection)[1]?.accessibilityText).toContain(
      '重锤。核心动词：推离。',
    );
    expect(resultFields(projection)[1]?.accessibilityText).toContain(
      '地面：地面正面重击，制造最高的一次性水平击退。',
    );
    expect(resultFields(projection)[1]?.valueText.match(/主复盘/gu)).toHaveLength(1);
  });

  it('rejects stale Product Result identity, local identity drift and future input fields', () => {
    const result = productResult();
    expect(() => projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: 'duel',
      productResult: { ...result, authorityHash: '00000000' },
      localParticipantId: 'p1',
    })).toThrow(/authorityHash/);
    expect(() => projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: 'duel',
      productResult: result,
      localParticipantId: 'outside-match',
    })).toThrow(/\u672c\u5730\u73a9\u5bb6\u6b66\u5668\u4f7f\u7528\u4e8b\u5b9e/);
    expect(() => projectArenaV2ProductSessionInformationCandidateV1({
      selectedModeKind: 'duel',
      productResult: result,
      localParticipantId: 'p1',
      future: true,
    })).toThrow(/future/);
  });

  it('rejects accessors without executing them', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({
      selectedModeKind: 'duel',
      productResult: productResult(),
      localParticipantId: 'p1',
    }, 'productResult', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return productResult();
      },
    });
    expect(() => projectArenaV2ProductSessionInformationCandidateV1(options))
      .toThrow(/\u6570\u636e\u5b57\u6bb5|\u8bbf\u95ee\u5668/);
    expect(getterCalls).toBe(0);
  });
});
