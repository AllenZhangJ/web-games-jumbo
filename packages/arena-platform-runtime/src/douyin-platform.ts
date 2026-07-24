import { createMiniGamePlatform } from './mini-game-platform.js';

export function createDouyinPlatform(api: unknown = (globalThis as { tt?: unknown }).tt) {
  if (!api) throw new Error('未检测到抖音小游戏 tt API');
  return createMiniGamePlatform(api, 'douyin');
}
