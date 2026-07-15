import { createMiniGamePlatform } from './mini-game.js';

export function createWeChatPlatform(api: any = (globalThis as any).wx) {
  if (!api) throw new Error('未检测到微信小游戏 wx API');
  return createMiniGamePlatform(api, 'wechat');
}
