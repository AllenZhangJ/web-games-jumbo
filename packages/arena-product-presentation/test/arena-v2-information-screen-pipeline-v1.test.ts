import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  createArenaV2InformationScreenPipelineV1,
  projectArenaV2WeaponDetailContentFieldsV1,
} from '../src/index.js';

describe('Arena V2 information screen pipeline V1', () => {
  it('composes a complete 390x844 weapon detail plan from P5 content and P6 profile owners', () => {
    const weapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons[0]!;
    const content = projectArenaV2WeaponDetailContentFieldsV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      weapon.weaponDefinitionId,
    );
    const result = createArenaV2InformationScreenPipelineV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      {
        revision: 8,
        screenId: 'weapon-detail',
        state: 'ready',
        fieldSources: [content, {
          ownerId: 'p6-learning-profile',
          fieldValues: [{
            fieldId: 'weapon-record',
            labelMessageId: 'arena.v2.field.weapon-record',
            valueText: '已理解2/5种情境；使用3次',
            accessibilityText: '冲锋盾已理解2/5种情境，使用3次。',
            fixedWidthNumeric: true,
          }],
        }],
        primaryActionEnabled: true,
        primaryActionDisabledReasonMessageId: null,
      },
      {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
    );
    expect(result).toMatchObject({
      status: 'surface-pipeline-candidate',
      productionReady: false,
    });
    expect(result.viewModel.firstViewItems).toHaveLength(3);
    expect(result.viewModel.deferredItems).toHaveLength(3);
    expect(result.layout.density).toBe('narrow');
    expect(result.layout.horizontalOverflowAllowed).toBe(false);
    expect(result.renderPlan.primitives.some(({ kind }) => kind === 'action')).toBe(true);
  });
});
