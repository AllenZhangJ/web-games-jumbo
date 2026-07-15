import { describe, expect, it } from 'vitest';
import { ContentMenuController, type ContentMenuCatalog } from '../src/content-menu.js';

const catalog: ContentMenuCatalog = {
  gameplays: [
    { id: 'classic', version: 1, name: '经典', description: '全部任务', supportedTaskIds: ['exact', 'combo'] },
    { id: 'simple', version: 1, name: '简化', description: '仅精确任务', supportedTaskIds: ['exact'] },
  ],
  tasks: [
    { id: 'exact', version: 1, name: '精确', description: '命中目标' },
    { id: 'combo', version: 1, name: '组合', description: '完成组合' },
  ],
  characters: [
    { id: 'red', version: 1, name: '红', description: '红色角色' },
    { id: 'blue', version: 1, name: '蓝', description: '蓝色角色' },
  ],
  qualities: [
    { id: 'high', version: 1, name: '高画质', description: '完整效果' },
    { id: 'low', version: 1, name: '低画质', description: '降低效果' },
  ],
};

describe('content menu controller', () => {
  it('cycles all three content axes and filters incompatible tasks', () => {
    const menu = new ContentMenuController({
      catalog,
      gameplayId: 'classic',
      taskId: 'combo',
      characterId: 'red',
      qualityId: 'high',
    });
    menu.cycle('gameplay', 1);
    expect(menu.gameplayId).toBe('simple');
    expect(menu.taskId).toBe('exact');
    menu.cycle('character', -1);
    menu.cycle('quality', 1);
    expect(menu.characterId).toBe('blue');
    expect(menu.snapshot()).toMatchObject({
      gameplay: { index: 2, total: 2 },
      task: { index: 1, total: 1 },
      character: { index: 2, total: 2 },
      quality: { id: 'low', index: 2, total: 2 },
    });
  });

  it('falls back from stale saved selections without exposing unknown IDs', () => {
    const menu = new ContentMenuController({
      catalog,
      gameplayId: 'missing',
      taskId: 'missing',
      characterId: 'missing',
      qualityId: 'missing',
      open: true,
    });
    expect(menu.snapshot()).toMatchObject({
      open: true,
      gameplay: { id: 'classic' },
      task: { id: 'exact' },
      character: { id: 'red' },
      quality: { id: 'high' },
    });
  });
});
