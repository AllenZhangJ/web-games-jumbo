import { describe, expect, it } from 'vitest';
import {
  ARENA_ANIMATION_ACTION_CATEGORY,
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  AnimationSemanticResolver,
  CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
  CHARACTER_PRESENTATION_SLOT_ID,
  createCharacterPresentationDefinition,
  resolveAnimationBinding,
} from '../src/index.js';

function definitionValue(): unknown {
  return {
    schemaVersion: CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id: 'presentation.test',
    characterDefinitionId: 'character.test',
    defaultForCharacter: true,
    contentVersion: 1,
    modelAssetId: 'asset.character.test',
    rigProfileId: 'rig.test',
    materialProfileId: 'material.test',
    outlineProfileId: 'outline.test',
    direction: {
      strategy: CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE,
      defaultFrontAxis: CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_X,
      hysteresisDegrees: 6,
    },
    locomotion: {
      walkSpeedThreshold: 0.5,
      runSpeedThreshold: 4,
      knockbackSpeedThreshold: 7,
    },
    animationMap: Object.fromEntries(ARENA_ANIMATION_SEMANTIC_IDS.map((semantic) => [
      semantic,
      {
        sourceKind: ARENA_ANIMATION_SOURCE_KIND.PROCEDURAL,
        sourceKey: semantic,
        loop: semantic === 'idle',
        fallbackSemantics: [],
      },
    ])),
    attachmentSlots: Object.values(CHARACTER_PRESENTATION_SLOT_ID).map((id) => ({
      id,
      nodeName: `slot:${id}`,
      allowedAssetIds: [],
      defaultAssetId: null,
    })),
    tags: ['test'],
  };
}

function participant(action: unknown = {
  definitionId: null,
  phase: 'idle',
  animationCategory: null,
}): unknown {
  return {
    id: 'player-1',
    status: 'active',
    hitstunTicks: 0,
    grounded: false,
    velocity: { x: 0, y: 1, z: 0 },
    movement: { mode: 'standard' },
    action,
  };
}

function frame(tick: number, events: readonly unknown[] = []): unknown {
  return {
    source: { matchSeed: 7, tick },
    phase: 'running',
    hud: { result: null },
    events,
  };
}

describe('Arena Presentation contracts', () => {
  it('rejects constructor and capability accessors without executing them', () => {
    let optionReads = 0;
    expect(() => new AnimationSemanticResolver({
      participantId: 'player-1',
      get presentationDefinition() { optionReads += 1; return definitionValue(); },
      actionPresentations: {},
    })).toThrow(/presentationDefinition.*数据字段/);
    expect(optionReads).toBe(0);

    let capabilityReads = 0;
    expect(() => resolveAnimationBinding(
      definitionValue(),
      'idle',
      {
        get proceduralKeys() { capabilityReads += 1; return ['idle']; },
        clipKeys: [],
      },
    )).toThrow(/proceduralKeys.*数据字段/);
    expect(capabilityReads).toBe(0);
  });

  it('keeps airborne memory atomic when a later overlay validation fails', () => {
    const resolver = new AnimationSemanticResolver({
      participantId: 'player-1',
      presentationDefinition: definitionValue(),
      actionPresentations: {
        'movement.air-jump': {
          semantic: 'air-jump',
          animationCategory: ARENA_ANIMATION_ACTION_CATEGORY.MOVEMENT,
        },
      },
    });
    expect(resolver.resolve(frame(0), participant()).baseSemantic).toBe('jump');
    expect(() => resolver.resolve(frame(1, [{
      type: 'ActionStarted', participantId: 'player-1', action: 'movement.air-jump',
    }]), participant({
      definitionId: 'broken', phase: 'unknown', animationCategory: 'attack',
    }))).toThrow(/未知 presentation action phase/);
    expect(resolver.resolve(frame(1), participant()).baseSemantic).toBe('jump');
    resolver.destroy();
    resolver.destroy();
    expect(() => resolver.resolve(frame(2), participant())).toThrow(/已销毁/);
  });

  it('copies definitions and does not observe later caller mutation', () => {
    const source = definitionValue() as { id: string; locomotion: { walkSpeedThreshold: number } };
    const definition = createCharacterPresentationDefinition(source);
    source.id = 'tampered';
    source.locomotion.walkSpeedThreshold = 999;
    expect(definition.id).toBe('presentation.test');
    expect(definition.locomotion.walkSpeedThreshold).toBe(0.5);
  });
});
