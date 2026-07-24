import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import {
  bindWebGameTeardown,
  clearWebStartupError,
  showMiniGameStartupError,
  showWebStartupError,
} from '../src/index.js';

function eventEnvironment() {
  const listeners = new Set<(event: unknown) => void>();
  return {
    listeners,
    addEventListener(_type: string, callback: (event: unknown) => void) {
      listeners.add(callback);
    },
    removeEventListener(_type: string, callback: (event: unknown) => void) {
      listeners.delete(callback);
    },
    emit(event: unknown) {
      for (const callback of [...listeners]) callback(event);
    },
  };
}

function webDocumentFixture() {
  const elements = new Map<string, Record<string, unknown>>();
  const canvas = {
    attributes: new Map<string, string>(),
    setAttribute(name: string, value: string) { this.attributes.set(name, value); },
    removeAttribute(name: string) { this.attributes.delete(name); },
  };
  const shell = {
    appendChild(node: Record<string, unknown>) {
      elements.set(String(node.id), node);
    },
  };
  const createElement = () => ({
    id: '',
    style: {},
    attributes: new Map<string, string>(),
    children: [] as unknown[],
    textContent: '',
    setAttribute(name: string, value: string) { this.attributes.set(name, value); },
    appendChild(node: unknown) { this.children.push(node); },
    focus() { /* observable behavior is covered by the Node integration fixture */ },
    remove() { elements.delete(this.id); },
  });
  return {
    environment: {
      document: {
        createElement,
        getElementById: (id: string) => elements.get(id) ?? null,
        querySelector: (selector: string) => (selector === '.game-shell' ? shell : canvas),
        body: shell,
      },
    },
    elements,
    canvas,
  };
}

describe('startup fallback boundaries', () => {
  it('falls through asynchronous mini-game modal results without leaking a rejection', async () => {
    const calls: string[] = [];
    expect(showMiniGameStartupError({
      showModal() {
        calls.push('modal');
        return Promise.reject(new Error('late modal rejection'));
      },
      showToast() {
        calls.push('toast');
      },
    })).toBe(true);
    await Promise.resolve();
    expect(calls).toEqual(['modal', 'toast']);
  });

  it('keeps one accessible Web fallback and clears its canvas state', () => {
    const fixture = webDocumentFixture();
    expect(showWebStartupError(new Error('first'), fixture.environment)).toBe(true);
    expect(showWebStartupError(new Error('second'), fixture.environment)).toBe(true);
    expect(fixture.elements.size).toBe(1);
    expect(fixture.canvas.attributes.get('aria-hidden')).toBe('true');
    clearWebStartupError(fixture.environment);
    expect(fixture.elements.size).toBe(0);
    expect(fixture.canvas.attributes.has('aria-hidden')).toBe(false);
  });
});

describe('Web teardown ownership', () => {
  it('replaces exactly one listener and preserves bfcache sessions', () => {
    const environment = eventEnvironment();
    const stopped: unknown[] = [];
    bindWebGameTeardown(environment, (root) => stopped.push(root));
    const cleanup = bindWebGameTeardown(environment, (root) => stopped.push(root));
    expect(environment.listeners.size).toBe(1);
    environment.emit({ persisted: true });
    environment.emit({ persisted: false });
    expect(stopped).toEqual([environment]);
    cleanup();
    expect(environment.listeners.size).toBe(0);
  });

  it('retains a failed listener cleanup for an exact retry', () => {
    const environment = eventEnvironment();
    let failures = 1;
    const remove = environment.removeEventListener;
    environment.removeEventListener = (type, callback) => {
      if (failures > 0) {
        failures -= 1;
        throw new Error('remove failed');
      }
      remove.call(environment, type, callback);
    };
    const cleanup = bindWebGameTeardown(environment, () => {});
    expect(() => cleanup()).toThrow(/remove failed/);
    expect(environment.listeners.size).toBe(1);
    expect(() => cleanup()).not.toThrow();
    expect(environment.listeners.size).toBe(0);
  });

  it('rolls back a registered listener when state ownership cannot be stored', () => {
    const environment = eventEnvironment();
    Object.preventExtensions(environment);
    expect(() => bindWebGameTeardown(environment, () => {})).toThrow(/无法持有/);
    expect(environment.listeners.size).toBe(0);
  });

  it('rejects an accessor-owned teardown slot without executing it', () => {
    const environment = eventEnvironment();
    let reads = 0;
    Object.defineProperty(environment, Symbol.for('number-strategy-jump.web-teardown-state'), {
      configurable: true,
      get() {
        reads += 1;
        return null;
      },
    });
    expect(() => bindWebGameTeardown(environment, () => {})).toThrow(/数据字段/);
    expect(reads).toBe(0);
    expect(environment.listeners.size).toBe(0);
  });
});

describe('platform runtime architecture', () => {
  it('keeps every host adapter outside authority and presentation dependencies', async () => {
    const sourceUrl = new URL('../src/', import.meta.url);
    const files = (await readdir(sourceUrl)).filter((name) => name.endsWith('.ts')).sort();
    const source = (await Promise.all(files.map((name) => readFile(new URL(name, sourceUrl), 'utf8'))))
      .join('\n');
    expect(source).not.toMatch(/@number-strategy-jump\/arena-(?:core|match|bot|session|presentation)/);
    expect(source).not.toMatch(/Math\.random/);
  });
});
