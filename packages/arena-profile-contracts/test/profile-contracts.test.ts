import { describe, expect, it } from 'vitest';
import {
  PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  PlayerProfileFutureSchemaError,
  SaveMigrationRegistry,
  advancePlayerProfile,
  assertPlayerProfileSaveEnvelopeHasNoFutureSchema,
  createPlayerProfile,
  createPlayerProfileDefinition,
  createPlayerProfileSaveEnvelope,
  validatePlayerProfileSaveEnvelope,
  type PlayerProfileDefinitionData,
} from '../src/index.js';

function createDefinitionData(): PlayerProfileDefinitionData {
  return {
    schemaVersion: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
    id: 'test-profile',
    contentVersion: 1,
    currentProfileSchemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    limits: {
      maxUnlockedPerKind: 8,
      maxCommittedGrantIds: 16,
      maxExperience: 1_000,
      maxIdentifierLength: 64,
    },
    defaults: {
      profileId: 'local-player',
      progression: { experience: 0, committedGrantIds: [] },
      unlocks: {
        characterIds: ['hero'], appearanceIds: [], equipmentIds: [], mapIds: ['arena'],
      },
      selection: { characterId: 'hero', appearanceId: null },
      settings: {
        soundEnabled: true,
        reducedMotion: false,
        qualityProfile: PLAYER_PROFILE_QUALITY.AUTO,
      },
    },
  };
}

describe('Arena profile contracts', () => {
  it('creates immutable profiles and increments a revision exactly once', () => {
    const definition = createPlayerProfileDefinition(createDefinitionData());
    const initial = createPlayerProfile(definition);
    const next = advancePlayerProfile(definition, initial, {
      progression: { ...initial.progression, experience: 10 },
    });
    expect(Object.isFrozen(next)).toBe(true);
    expect(next.revision).toBe(1);
    expect(next.progression.experience).toBe(10);
    expect(initial.progression.experience).toBe(0);
  });

  it('verifies a content-addressed save envelope and rejects future data', () => {
    const definition = createPlayerProfileDefinition(createDefinitionData());
    const profile = createPlayerProfile(definition);
    const envelope = createPlayerProfileSaveEnvelope(definition, profile);
    const registry = new SaveMigrationRegistry({ currentVersion: 1, migrations: [] });
    expect(validatePlayerProfileSaveEnvelope(definition, registry, envelope).profile).toEqual(profile);
    expect(() => assertPlayerProfileSaveEnvelopeHasNoFutureSchema(definition, {
      ...envelope,
      payloadSchemaVersion: 2,
    })).toThrow(PlayerProfileFutureSchemaError);
  });

  it('runs every migration twice and rejects non-deterministic output', () => {
    let counter = 0;
    const registry = new SaveMigrationRegistry({
      currentVersion: 2,
      migrations: [{
        fromVersion: 1,
        toVersion: 2,
        migrate: (value: Readonly<Record<string, unknown>>) => ({
          ...value,
          schemaVersion: 2,
          counter: counter += 1,
        }),
      }],
    });
    expect(() => registry.migrate({ schemaVersion: 1 }, 1)).toThrow('不是确定性迁移');
  });
});
