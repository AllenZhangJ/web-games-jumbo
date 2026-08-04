import { createWebPlatform } from '@number-strategy-jump/arena-platform-runtime/web';
import {
  startArenaP1SupplyAcceptanceWithPlatform,
  type ArenaP1SupplyAcceptanceEntryHandle,
} from './arena-p1-supply-acceptance-host.js';

interface WebTextNode {
  textContent: string | null;
  setAttribute(name: string, value: string): void;
}

function webTextNode(environment: unknown, selector: string): WebTextNode {
  if (environment === null || typeof environment !== 'object') {
    throw new TypeError('Web P1 supply environment 无效。');
  }
  const documentValue = (environment as { document?: unknown }).document;
  if (documentValue === null || typeof documentValue !== 'object') {
    throw new Error('Web P1 supply acceptance 缺少 document。');
  }
  const querySelector = (documentValue as { querySelector?: unknown }).querySelector;
  if (typeof querySelector !== 'function') throw new Error('Web P1 supply document 缺少 querySelector。');
  const node = Reflect.apply(querySelector, documentValue, [selector]) as unknown;
  if (node === null || typeof node !== 'object'
    || typeof (node as { setAttribute?: unknown }).setAttribute !== 'function') {
    throw new Error(`Web P1 supply acceptance 缺少 ${selector}。`);
  }
  return node as WebTextNode;
}

export function startWebArenaP1SupplyAcceptance(
  environment: unknown = globalThis,
): ArenaP1SupplyAcceptanceEntryHandle {
  const status = webTextNode(environment, '#arena-p1-status');
  const live = webTextNode(environment, '#arena-p1-live');
  return startArenaP1SupplyAcceptanceWithPlatform(
    createWebPlatform(environment),
    Object.freeze({
      platformId: 'web',
      announce(message: string): void {
        live.textContent = message;
      },
      updateStatus(message: string, failed: boolean): void {
        status.textContent = message;
        status.setAttribute('data-failed', String(failed));
      },
      clearDom(): void {
        live.textContent = '';
        status.textContent = '已停止';
      },
    }),
  );
}

declare const __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__: string | undefined;

if (
  typeof __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__ !== 'undefined'
  && __ARENA_P1_SUPPLY_ACCEPTANCE_TARGET__ === 'web'
) {
  try {
    startWebArenaP1SupplyAcceptance();
  } catch (error) {
    try {
      const status = webTextNode(globalThis, '#arena-p1-status');
      status.textContent = '启动失败 · 资源已关闭';
      status.setAttribute('data-failed', 'true');
    } catch {
      // No second host surface is created when the isolated page is incomplete.
    }
    console.error('Web P1 supply acceptance 启动失败', error);
  }
}
