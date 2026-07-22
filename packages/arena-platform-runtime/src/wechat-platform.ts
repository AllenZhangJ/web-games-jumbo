import { createMiniGamePlatform } from './mini-game-platform.js';

export function createWeChatPlatform(api: unknown = (globalThis as { wx?: unknown }).wx) {
  if (!api) throw new Error('未检测到微信小游戏 wx API');
  return createMiniGamePlatform(api, 'wechat');
}
