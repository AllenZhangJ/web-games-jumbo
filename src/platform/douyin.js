import { createMiniGamePlatform } from './mini-game.js';

export function createDouyinPlatform(api = globalThis.tt) {
  if (!api) throw new Error('未检测到抖音小游戏 tt API');
  return createMiniGamePlatform(api, 'douyin');
}
