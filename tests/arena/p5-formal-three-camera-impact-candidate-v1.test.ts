import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ArenaV2FormalThreeCameraImpactStateCandidateV1,
} from '@number-strategy-jump/arena-product-presentation-three';

const EPOCH = 'arena-v2.camera-impact.test.1';

function command(
  sourceEventId: string,
  kind: 'hit-confirm' | 'surface-transfer' | 'ring-out',
  tick: number,
  options: Readonly<{
    motionPolicy?: 'standard' | 'static';
    worldDirection?: Readonly<{ x: number; z: number }> | null;
    impactScaleMultiplier?: 0.82 | 1 | 1.18;
  }> = {},
) {
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: EPOCH,
    sourceEventId,
    kind,
    tick,
    motionPolicy: options.motionPolicy ?? 'standard',
    worldDirection: options.worldDirection ?? null,
    impactScaleMultiplier: options.impactScaleMultiplier ?? 1,
  });
}

test('P5.3zc resolves fixed tick envelopes without wall-clock or random input', () => {
  const state = new ArenaV2FormalThreeCameraImpactStateCandidateV1(EPOCH);
  state.present(command('hit-1', 'hit-confirm', 10, { worldDirection: { x: 1, z: 0 } }));

  const peak = state.resolve(10, false);
  assert.equal(peak.samples.length, 1);
  assert.equal(peak.samples[0]?.displacementFraction, 0.0035);
  assert.equal(peak.samples[0]?.zoomFraction, 0.0018);
  assert.deepEqual(peak.samples[0]?.direction, { kind: 'world', x: 1, z: 0 });

  const decay = state.resolve(11, false);
  assert.equal(decay.samples[0]?.displacementFraction, -0.0035 * ((5 - 1) / 5) ** 2);
  assert.equal(decay.samples[0]?.zoomFraction, 0.0018 * ((5 - 1) / 5) ** 2);
});

test('P5.3zzze applies the shared authority strength scale without exceeding global caps', () => {
  const state = new ArenaV2FormalThreeCameraImpactStateCandidateV1(EPOCH);
  state.present(command('light-hit', 'hit-confirm', 12, { impactScaleMultiplier: 0.82 }));
  state.present(command('heavy-hit', 'hit-confirm', 12, { impactScaleMultiplier: 1.18 }));
  const resolution = state.resolve(12, false);
  assert.equal(resolution.samples[0]?.displacementFraction, 0.0035 * 1.18);
  assert.equal(resolution.samples[1]?.displacementFraction, 0.0035 * 0.82);
});

test('P5.3zc maps an explicit zero direction to the deterministic identity fallback', () => {
  const state = new ArenaV2FormalThreeCameraImpactStateCandidateV1(EPOCH);
  state.present(command('zero-direction', 'hit-confirm', 11, {
    worldDirection: { x: 0, z: 0 },
  }));

  const resolution = state.resolve(11, false);
  assert.equal(resolution.samples.length, 1);
  assert.equal(resolution.samples[0]?.direction.kind, 'screen');
  assert.equal(resolution.samples[0]?.displacementFraction, 0.0035);
});

test('P5.3zc keeps canonical identity idempotent after the authority tick advances', () => {
  const state = new ArenaV2FormalThreeCameraImpactStateCandidateV1(EPOCH);
  const original = command('surface-1', 'surface-transfer', 20);
  state.present(original);
  state.resolve(22, false);
  state.present(original);

  assert.throws(
    () => state.present(command('surface-1', 'ring-out', 20)),
    /语义漂移/u,
  );
  assert.deepEqual(state.getSnapshot().activeSourceEventIds, ['surface-1']);
});

test('P5.3zc retains only three deterministic priority winners and caps zoom', () => {
  const state = new ArenaV2FormalThreeCameraImpactStateCandidateV1(EPOCH);
  state.present(command('normal-z', 'hit-confirm', 30));
  state.present(command('strong-z', 'surface-transfer', 30));
  state.present(command('warning-z', 'ring-out', 30));
  state.present(command('warning-a', 'ring-out', 30));

  assert.deepEqual(
    state.getSnapshot().activeSourceEventIds,
    ['warning-a', 'warning-z', 'strong-z'],
  );
  const resolution = state.resolve(30, false);
  assert.equal(resolution.samples.length, 3);
  assert.equal(resolution.zoomFraction, 0.0055);
});

test('P5.3zc future-tick rejection is atomic and reduced motion still consumes identity', () => {
  const state = new ArenaV2FormalThreeCameraImpactStateCandidateV1(EPOCH);
  state.present(command('expired', 'hit-confirm', 0));
  state.present(command('future', 'ring-out', 20));

  assert.throws(() => state.resolve(10, false), /来自未来tick/u);
  assert.deepEqual(state.getSnapshot().activeSourceEventIds, ['future', 'expired']);

  const caughtUp = state.resolve(20, true);
  assert.deepEqual(caughtUp.samples, []);
  assert.deepEqual(state.getSnapshot().activeSourceEventIds, ['future']);
  state.present(command('future', 'ring-out', 20));
  state.remove('future');

  state.present(command('static', 'surface-transfer', 20, { motionPolicy: 'static' }));
  assert.deepEqual(state.resolve(20, false).samples, []);
  state.clear('arena-v2.camera-impact.test.2');
  assert.deepEqual(state.getSnapshot().activeSourceEventIds, []);
  assert.throws(() => state.present(command('old-epoch', 'hit-confirm', 21)), /旧epoch/u);
});
