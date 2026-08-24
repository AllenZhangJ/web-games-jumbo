import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PORT_PATH = 'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts';
const STAGE_PATH =
  'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts';

test('P5.3zzzvq projects after camera sync and composes before mutating VFX roots', () => {
  const stageSource = readFileSync(STAGE_PATH, 'utf8');
  const cameraSyncIndex = stageSource.indexOf('this.#cameraController.sync');
  const visualEffectsSyncIndex = stageSource.indexOf('this.#visualEffects.sync', cameraSyncIndex);
  assert.equal(cameraSyncIndex >= 0, true);
  assert.equal(visualEffectsSyncIndex > cameraSyncIndex, true);

  const portSource = readFileSync(PORT_PATH, 'utf8');
  const projectionIndex = portSource.indexOf('.project(this.#camera)');
  const edgeCompositionIndex = portSource.indexOf(
    'composeArenaV2FormalVfxCameraEdgeSafeCandidateV1({',
  );
  const positionMutationIndex = portSource.indexOf(
    'effect.root.position.set(',
    edgeCompositionIndex,
  );
  assert.equal(edgeCompositionIndex >= 0, true);
  assert.equal(projectionIndex > edgeCompositionIndex, true);
  assert.equal(positionMutationIndex > projectionIndex, true);
  assert.equal(portSource.includes('.unproject('), false);
});

test('P5.3zzzvq keeps all formal VFX resource and lifecycle budgets unchanged', () => {
  const source = readFileSync(PORT_PATH, 'utf8');
  assert.match(source, /cameraEdgeSafeCompositionWired: true as const/u);
  assert.match(source, /cameraEdgeSafeCompositionUsesForwardProjectionOnly: true as const/u);
  assert.match(source, /cameraEdgeSafeCompositionAddsResourcesOrDrawCalls: false as const/u);
  assert.match(source, /maximumActiveEffects: MAXIMUM_ACTIVE_EFFECTS/u);
  assert.match(source, /maximumParticlesPerEffect: 96 as const/u);
  assert.match(source, /maximumAverageOverdraw: 2 as const/u);
  assert.match(source, /defaultEntryWired: false as const/u);
});
