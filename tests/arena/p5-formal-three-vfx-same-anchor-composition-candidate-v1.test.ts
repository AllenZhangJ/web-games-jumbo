import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FORMAL_VFX_PORT_PATH = 'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts';

test('P5.3zzzvp composes same-anchor effects before mutating Three roots', () => {
  const source = readFileSync(FORMAL_VFX_PORT_PATH, 'utf8');
  const stageIndex = source.indexOf('const stagedEffects:');
  const compositionIndex = source.indexOf(
    'composeArenaV2FormalVfxSameAnchorCandidateV1({',
    stageIndex,
  );
  const positionMutationIndex = source.indexOf('effect.root.position.set(', compositionIndex);
  const cameraPlaneOffsetIndex = source.indexOf(
    'effect.root.position.add(this.#compositionOffset)',
    positionMutationIndex,
  );
  const composeInputEnd = source.indexOf(')),\n        });', compositionIndex);
  const composeInputSourceEventFields = source
    .slice(compositionIndex, composeInputEnd)
    .match(/sourceEventId: effect\.command\.sourceEventId/gu) ?? [];

  assert.equal(stageIndex >= 0, true);
  assert.equal(compositionIndex > stageIndex, true);
  assert.equal(positionMutationIndex > compositionIndex, true);
  assert.equal(cameraPlaneOffsetIndex > positionMutationIndex, true);
  assert.equal(composeInputEnd > compositionIndex, true);
  assert.equal(composeInputSourceEventFields.length, 1);
  assert.match(source, /!displayVisible \|\| anchor === null/u);
  assert.match(source, /if \(shapeKind === 'ring-out'\) return 3/u);
});

test('P5.3zzzvp keeps the existing VFX resource and lifecycle budgets', () => {
  const source = readFileSync(FORMAL_VFX_PORT_PATH, 'utf8');
  assert.match(source, /maximumActiveEffects: MAXIMUM_ACTIVE_EFFECTS/u);
  assert.match(source, /sameAnchorCompositionMaximumLanes: 3 as const/u);
  assert.match(source, /sameAnchorCompositionAddsResourcesOrDrawCalls: false as const/u);
  assert.match(source, /maximumParticlesPerEffect: 96 as const/u);
  assert.match(source, /maximumAverageOverdraw: 2 as const/u);
  assert.match(source, /defaultEntryWired: false as const/u);
  assert.match(source, /validationStatus: 'not-run' as const/u);
});
