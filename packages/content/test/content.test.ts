import { describe, expect, it } from 'vitest';
import {
  BUILTIN_CHARACTERS,
  CharacterRegistry,
  ContentSelection,
  DEFAULT_CHARACTER,
  createProgrammaticCharacterDefinition,
} from '../src/index.js';

describe('content registries and lifecycle', () => {
  it('registers ten character manifests with stable versioned identities', () => {
    const registry = BUILTIN_CHARACTERS.reduce(
      (characters, character) => characters.register(character),
      new CharacterRegistry(),
    );
    expect(registry.list()).toHaveLength(10);
    expect(registry.get('golden-crown').rendererKey).toBe('three-procedural-jumbo');
    expect(new Set(registry.list().map(({ presentation }) => presentation.name)).size).toBe(10);
  });

  it('switches, falls back and disposes resources exactly once', () => {
    const registry = new CharacterRegistry()
      .register(DEFAULT_CHARACTER)
      .register(createProgrammaticCharacterDefinition(2));
    const disposed: string[] = [];
    const selection = new ContentSelection({
      registry,
      fallbackId: DEFAULT_CHARACTER.id,
      factory: (definition) => ({
        id: definition.id,
        dispose: () => disposed.push(definition.id),
      }),
    });
    expect(selection.select('aqua-scout').id).toBe('aqua-scout');
    expect(selection.select('missing-character').id).toBe(DEFAULT_CHARACTER.id);
    expect(selection.snapshot).toMatchObject({ usedFallback: true, selectedId: DEFAULT_CHARACTER.id });
    expect(disposed).toEqual(['aqua-scout']);
    selection.dispose();
    selection.dispose();
    expect(disposed).toEqual(['aqua-scout', DEFAULT_CHARACTER.id]);
  });

  it('falls back transactionally when replacement construction fails', () => {
    const registry = new CharacterRegistry()
      .register(DEFAULT_CHARACTER)
      .register(createProgrammaticCharacterDefinition(3));
    const disposed: string[] = [];
    const selection = new ContentSelection({
      registry,
      fallbackId: DEFAULT_CHARACTER.id,
      factory: (definition) => {
        if (definition.id === 'amber-bot') throw new Error('asset failed');
        return { dispose: () => disposed.push(definition.id) };
      },
    });
    const original = selection.select(DEFAULT_CHARACTER.id);
    expect(selection.select('amber-bot')).toBe(original);
    expect(selection.resource).toBe(original);
    expect(selection.snapshot).toMatchObject({ usedFallback: true, selectedId: DEFAULT_CHARACTER.id });
    expect(disposed).toEqual([]);
    selection.dispose();
  });

  it('commits a valid replacement even when cleanup of the old resource fails', () => {
    const registry = new CharacterRegistry()
      .register(DEFAULT_CHARACTER)
      .register(createProgrammaticCharacterDefinition(2));
    const selection = new ContentSelection({
      registry,
      fallbackId: DEFAULT_CHARACTER.id,
      factory: (definition) => ({
        id: definition.id,
        dispose: () => {
          if (definition.id === DEFAULT_CHARACTER.id) throw new Error('old cleanup failed');
        },
      }),
    });
    selection.select(DEFAULT_CHARACTER.id);

    const replacement = selection.select('aqua-scout');
    expect(replacement.id).toBe('aqua-scout');
    expect(selection.resource).toBe(replacement);
    expect(selection.snapshot).toMatchObject({ selectedId: 'aqua-scout' });
    expect(selection.cleanupFailures).toBe(1);
    expect(selection.lastCleanupError?.message).toMatch(/old cleanup failed/);
    selection.dispose();
  });
});
