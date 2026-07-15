import { describe, expect, it } from 'vitest';
import {
  CharacterRegistry,
  ContentSelection,
  DEFAULT_CHARACTER,
  createProgrammaticCharacterDefinition,
} from '../src/index.js';

describe('content registries and lifecycle', () => {
  it('registers ten character manifests with stable versioned identities', () => {
    const registry = new CharacterRegistry();
    for (let index = 1; index <= 10; index += 1) {
      registry.register(createProgrammaticCharacterDefinition(index));
    }
    expect(registry.list()).toHaveLength(10);
    expect(registry.get('fixture-character-10').rendererKey).toBe('three-procedural-jumbo');
  });

  it('switches, falls back and disposes resources exactly once', () => {
    const registry = new CharacterRegistry()
      .register(DEFAULT_CHARACTER)
      .register(createProgrammaticCharacterDefinition(1));
    const disposed: string[] = [];
    const selection = new ContentSelection({
      registry,
      fallbackId: DEFAULT_CHARACTER.id,
      factory: (definition) => ({
        id: definition.id,
        dispose: () => disposed.push(definition.id),
      }),
    });
    expect(selection.select('fixture-character-1').id).toBe('fixture-character-1');
    expect(selection.select('missing-character').id).toBe(DEFAULT_CHARACTER.id);
    expect(selection.snapshot).toMatchObject({ usedFallback: true, selectedId: DEFAULT_CHARACTER.id });
    expect(disposed).toEqual(['fixture-character-1']);
    selection.dispose();
    selection.dispose();
    expect(disposed).toEqual(['fixture-character-1', DEFAULT_CHARACTER.id]);
  });

  it('falls back transactionally when replacement construction fails', () => {
    const registry = new CharacterRegistry()
      .register(DEFAULT_CHARACTER)
      .register(createProgrammaticCharacterDefinition(2));
    const disposed: string[] = [];
    const selection = new ContentSelection({
      registry,
      fallbackId: DEFAULT_CHARACTER.id,
      factory: (definition) => {
        if (definition.id === 'fixture-character-2') throw new Error('asset failed');
        return { dispose: () => disposed.push(definition.id) };
      },
    });
    const original = selection.select(DEFAULT_CHARACTER.id);
    expect(selection.select('fixture-character-2')).toBe(original);
    expect(selection.resource).toBe(original);
    expect(selection.snapshot).toMatchObject({ usedFallback: true, selectedId: DEFAULT_CHARACTER.id });
    expect(disposed).toEqual([]);
    selection.dispose();
  });
});
