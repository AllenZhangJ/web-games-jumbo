import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  composeArenaV2InformationScreenViewModelV1,
  projectArenaV2InformationScreenViewModelV1,
} from '../src/index.js';

function homeInput() {
  return {
    revision: 3,
    screenId: 'home',
    state: 'ready',
    fieldValues: [
      { fieldId: 'next-goal', labelMessageId: 'label.next', valueText: '完成一局', accessibilityText: '下一目标，完成一局', fixedWidthNumeric: false },
      { fieldId: 'last-mode', labelMessageId: 'label.mode', valueText: '1v1', accessibilityText: '上次模式，1v1', fixedWidthNumeric: false },
      { fieldId: 'quick-start', labelMessageId: 'label.quick', valueText: '2 步', accessibilityText: '两步内开始', fixedWidthNumeric: true },
      { fieldId: 'recent-records', labelMessageId: 'label.record', valueText: '3 局', accessibilityText: '最近三局', fixedWidthNumeric: true },
    ],
    primaryActionEnabled: true,
    primaryActionDisabledReasonMessageId: null,
  };
}

describe('Arena V2 information screen ViewModel V1', () => {
  it('projects one immutable model for DOM and Canvas without deriving rules', () => {
    const model = projectArenaV2InformationScreenViewModelV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      homeInput(),
    );
    expect(model).toMatchObject({
      screenId: 'home', template: 'goal', state: 'ready', revision: 3,
      bottomNavigationVisible: true,
      primaryAction: {
        intentId: 'open-mode-select', enabled: true, minimumTouchTargetCssPixels: 48,
      },
    });
    expect(model.firstViewItems.map(({ fieldId }) => fieldId)).toEqual([
      'next-goal', 'last-mode', 'quick-start',
    ]);
    expect(model.deferredItems.map(({ fieldId }) => fieldId)).toEqual(['recent-records']);
    expect(Object.isFrozen(model)).toBe(true);
  });

  it('fails closed on missing/extra fields and contradictory disabled state', () => {
    const missing = homeInput();
    missing.fieldValues.pop();
    expect(() => projectArenaV2InformationScreenViewModelV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      missing,
    )).toThrow(/missing/);

    expect(() => projectArenaV2InformationScreenViewModelV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      { ...homeInput(), primaryActionDisabledReasonMessageId: 'reason.busy' },
    )).toThrow(/可用时/);
  });

  it('merges explicit field owners and fails closed instead of resolving ownership conflicts', () => {
    const input = homeInput();
    const model = composeArenaV2InformationScreenViewModelV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      {
        revision: input.revision,
        screenId: input.screenId,
        state: input.state,
        fieldSources: [{
          ownerId: 'p6-learning-profile',
          fieldValues: input.fieldValues.filter(({ fieldId }) => fieldId === 'next-goal'),
        }, {
          ownerId: 'p5-content-and-session',
          fieldValues: input.fieldValues.filter(({ fieldId }) => fieldId !== 'next-goal'),
        }],
        primaryActionEnabled: true,
        primaryActionDisabledReasonMessageId: null,
      },
    );
    expect(model.firstViewItems.map(({ fieldId }) => fieldId)).toEqual([
      'next-goal', 'last-mode', 'quick-start',
    ]);
    expect(() => composeArenaV2InformationScreenViewModelV1(
      ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
      {
        revision: input.revision,
        screenId: input.screenId,
        state: input.state,
        fieldSources: [{ ownerId: 'owner-a', fieldValues: input.fieldValues }, {
          ownerId: 'owner-b',
          fieldValues: [input.fieldValues[0]!],
        }],
        primaryActionEnabled: true,
        primaryActionDisabledReasonMessageId: null,
      },
    )).toThrow(/同时由/);
  });
});
