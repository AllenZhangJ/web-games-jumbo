import type { ArenaPlatformContract } from '@number-strategy-jump/arena-platform-contracts';
import { createDouyinPlatform } from '@number-strategy-jump/arena-platform-runtime/douyin';
import {
  createArenaP1SupplyAcceptancePlatformHostResourcePort,
  startArenaP1SupplyAcceptanceWithPlatform,
  type ArenaP1SupplyAcceptanceEntryHandle,
  type ArenaP1SupplyAcceptanceHostResourceBundle,
} from './arena-p1-supply-acceptance-host.js';

export function createDouyinP1SupplyAcceptanceHostResourcePort(
  platform: ArenaPlatformContract,
): ArenaP1SupplyAcceptanceHostResourceBundle {
  return createArenaP1SupplyAcceptancePlatformHostResourcePort(platform, Object.freeze({
    platformId: 'douyin',
  }));
}

export function startDouyinArenaP1SupplyAcceptance(
  api: unknown = (globalThis as { tt?: unknown }).tt,
): ArenaP1SupplyAcceptanceEntryHandle {
  const platform = createDouyinPlatform(api);
  return startArenaP1SupplyAcceptanceWithPlatform(platform, Object.freeze({
    platformId: 'douyin',
  }));
}

declare const __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__: string | undefined;

if (
  typeof __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__ !== 'undefined'
  && __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__ === 'douyin'
) {
  try {
    startDouyinArenaP1SupplyAcceptance();
  } catch (error) {
    console.error('抖音 P1 supply acceptance 启动失败', error);
  }
}
