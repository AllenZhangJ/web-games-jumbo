import { describe, expect, it } from 'vitest';
import { runArenaV2UiInformationPrototype } from '../src/index.js';

describe('Arena V2 UI information prototype', () => {
  it('keeps the eleven information entries small and centered on the next decision', () => {
    const first = runArenaV2UiInformationPrototype();
    const second = runArenaV2UiInformationPrototype();

    expect(first).toEqual(second);
    expect(first.passed).toBe(true);
    expect(first.pageCount).toBe(11);
    expect(first.complexSystemsIntroduced).toBe(0);
    expect(first.interactionAudit).toMatchObject({
      pageNavigationCount: 11,
      flowNavigationCount: 4,
      minimumTouchTargetPx: 48,
      mobileBreakpointPx: 760,
      allPagesHavePrimaryAction: true,
      passed: true,
    });
    expect(first.resultToRematchActions).toBe(1);
    expect(first.resultToChangeTargetActions).toBe(2);
    expect(first.pages.find(({ id }) => id === 'weapon-detail')?.requiredInformation)
      .toContain('命中结果');
    expect(first.pages.find(({ id }) => id === 'map-detail')?.requiredInformation)
      .toContain('武器适配空间');
    expect(first.pages.find(({ id }) => id === 'survival-prep')?.requiredInformation)
      .toContain('每 20 秒三选一');
    expect(first.pages.find(({ id }) => id === 'loading')?.maximumActionsBeforeNextStep).toBe(0);
    expect(first.pages.find(({ id }) => id === 'match-prep')?.supportedModes).toEqual(['versus', 'race']);
    expect(first.pages.some(({ id }) => (id as string) === 'race-prep')).toBe(false);
    expect(first.pages.every(({ firstViewInformation }) => (
      firstViewInformation.length >= 1 && firstViewInformation.length <= 3
    ))).toBe(true);
    expect(first.pages.find(({ id }) => id === 'weapon-detail')).toMatchObject({
      firstViewInformation: ['动作时序', '命中结果', '适用地图空间'],
      deferredInformation: ['反制方式', '个人使用记录'],
    });
  });

  it('proves the three most important player flows stay within the click budget', () => {
    const result = runArenaV2UiInformationPrototype();

    expect(result.flows).toHaveLength(4);
    expect(result.flows.every(({ actionCount, passed }) => passed && actionCount <= 3)).toBe(true);
    expect(result.flows.find(({ flowId }) => flowId === 'weapon-learning')?.pageIds).toEqual([
      'home', 'weapon-index', 'weapon-detail', 'match-prep',
    ]);
    expect(result.flows.find(({ flowId }) => flowId === 'map-learning')?.pageIds).toEqual([
      'home', 'map-index', 'map-detail', 'match-prep',
    ]);
    expect(result.flows.find(({ flowId }) => flowId === 'survival-rematch')?.actionCount).toBe(2);
  });
});
