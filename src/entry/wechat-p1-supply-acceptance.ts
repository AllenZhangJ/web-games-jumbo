import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';
import { createWeChatPlatform } from '@number-strategy-jump/arena-platform-runtime/wechat';
import {
  createArenaP1SupplyAcceptancePlatformHostResourcePort,
  startArenaP1SupplyAcceptanceWithPlatform,
  type ArenaP1SupplyAcceptanceEntryHandle,
  type ArenaP1SupplyAcceptanceHostResourceBundle,
} from './arena-p1-supply-acceptance-host.js';

export function createWeChatP1SupplyAcceptanceHostResourcePort(
  platform: ArenaPlatformContract,
): ArenaP1SupplyAcceptanceHostResourceBundle {
  return createArenaP1SupplyAcceptancePlatformHostResourcePort(platform, Object.freeze({
    platformId: 'wechat',
  }));
}

export function startWeChatArenaP1SupplyAcceptance(
  api: unknown = (globalThis as { wx?: unknown }).wx,
): ArenaP1SupplyAcceptanceEntryHandle {
  const platform = createWeChatPlatform(api);
  return startArenaP1SupplyAcceptanceWithPlatform(platform, Object.freeze({
    platformId: 'wechat',
  }));
}

declare const __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__: string | undefined;

if (
  typeof __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__ !== 'undefined'
  && __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__ === 'wechat'
) {
  try {
    startWeChatArenaP1SupplyAcceptance();
  } catch (error) {
    console.error('微信 P1 supply acceptance 启动失败', error);
  }
}
