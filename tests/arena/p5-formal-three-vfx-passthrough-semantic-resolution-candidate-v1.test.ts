import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1,
  requireArenaV2FormalPassthroughVfxSemanticCandidateV1,
} from '@number-strategy-jump/arena-product-presentation-three';

const FORMAL_VFX_PORT_PATH = 'src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts';

test('P5.3zzzvk closes all passthrough Cue identities before Three effect creation', () => {
  const source = readFileSync(FORMAL_VFX_PORT_PATH, 'utf8');
  const resolveIndex = source.indexOf(
    'requireArenaV2FormalPassthroughVfxSemanticCandidateV1(command.cueId)',
  );
  const presentIndex = source.indexOf('this.#presentEffect(', resolveIndex);
  assert.equal(resolveIndex >= 0 && presentIndex > resolveIndex, true);
  assert.doesNotMatch(source, /cueId\.includes\(['"]fell['"]\)/u);
  assert.doesNotMatch(source, /cueId\.includes\(['"]finish['"]\)/u);
  assert.equal(ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1.length, 22);
});

test('P5.3zzzvk separates credited ring-out from movement and environment falls', () => {
  assert.equal(
    requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
      'participant-fell-credited-hit',
    ).shapeKind,
    'ring-out',
  );
  for (const cueId of ['participant-fell-movement', 'participant-fell-environment'] as const) {
    const semantic = requireArenaV2FormalPassthroughVfxSemanticCandidateV1(cueId);
    assert.equal(semantic.shapeKind, 'movement-fall-warning');
    assert.equal(semantic.cameraImpactKind, null);
    assert.equal(semantic.characterImpactKind, null);
  }
});

test('P5.3zzzvk preserves the existing VFX resource and draw budgets', () => {
  const source = readFileSync(FORMAL_VFX_PORT_PATH, 'utf8');
  assert.match(source, /maximumActiveEffects: MAXIMUM_ACTIVE_EFFECTS/u);
  assert.match(source, /maximumParticlesPerEffect: 96 as const/u);
  assert.match(source, /maximumAverageOverdraw: 2 as const/u);
  assert.match(source, /supportingGeometryAddsLayer: false as const/u);
  assert.match(source, /supportingGeometryRaisesParticleBudget: false as const/u);
  assert.match(source, /defaultEntryWired: false as const/u);
  assert.match(source, /validationStatus: 'not-run' as const/u);
});
