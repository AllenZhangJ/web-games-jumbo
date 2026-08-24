import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1,
} from '@number-strategy-jump/arena-product-presentation-three';

function command(
  owner: ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1,
  sourceEventId: string,
  participantId: string,
  kind: 'hit-confirm' | 'surface-transfer' | 'ring-out',
  tick: number,
  motionPolicy: 'standard' | 'static' = 'standard',
  worldDirection: Readonly<{ readonly x: number; readonly z: number }> | null = null,
  impactScaleMultiplier: 0.85 | 1 | 1.12 = 1,
  contactParticipantId: string | null = null,
) {
  return Object.freeze({
    schemaVersion: 1 as const,
    epochId: owner.getCharacterImpactEpochId(),
    sourceEventId,
    participantId,
    contactParticipantId,
    kind,
    tick,
    motionPolicy,
    worldDirection,
    impactScaleMultiplier,
  });
}

test('P5.3zd resolves target-scoped value flashes from authority ticks', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(owner, 'hit-1', 'target-1', 'hit-confirm', 10));

  assert.deepEqual(owner.resolveCharacterImpacts(10, false).participants, [
    { participantId: 'target-1', intensity: 0.55, animationHeld: true },
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(11, false).participants, [
    {
      participantId: 'target-1',
      intensity: 0.55 * ((3 - 1) / 3) ** 2,
      animationHeld: true,
    },
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(12, false).participants, [
    {
      participantId: 'target-1',
      intensity: 0.55 * ((3 - 2) / 3) ** 2,
      animationHeld: false,
    },
  ]);
});

test('P5.3zzzzzl holds the attacker for exactly one presentation tick', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(
    owner,
    'contact-hit',
    'target-1',
    'hit-confirm',
    12,
    'standard',
    null,
    1.12,
    'attacker-1',
  ));

  assert.deepEqual(owner.resolveCharacterImpacts(12, false).participants, [
    { participantId: 'attacker-1', intensity: 0, animationHeld: true },
    { participantId: 'target-1', intensity: 0.55 * 1.12, animationHeld: true },
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(13, false).participants, [
    {
      participantId: 'target-1',
      intensity: 0.55 * 1.12 * ((3 - 1) / 3) ** 2,
      animationHeld: true,
    },
  ]);
});

test('P5.3zzzzzj scales target intensity and adds at most one heavy hold tick', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(
    owner,
    'heavy-hit',
    'target-heavy',
    'hit-confirm',
    15,
    'standard',
    null,
    1.12,
  ));
  assert.deepEqual(owner.resolveCharacterImpacts(15, false).participants, [
    { participantId: 'target-heavy', intensity: 0.55 * 1.12, animationHeld: true },
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(17, false).participants, [
    {
      participantId: 'target-heavy',
      intensity: 0.55 * 1.12 * ((3 - 2) / 3) ** 2,
      animationHeld: true,
    },
  ]);

  const light = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  light.presentCharacterImpact(command(
    light,
    'light-hit',
    'target-light',
    'hit-confirm',
    15,
    'standard',
    null,
    0.85,
  ));
  assert.deepEqual(light.resolveCharacterImpacts(17, false).participants, [
    {
      participantId: 'target-light',
      intensity: 0.55 * 0.85 * ((3 - 2) / 3) ** 2,
      animationHeld: false,
    },
  ]);
});

test('P5.3zzzvt coalesces same-target impacts before the three-target capacity', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(owner, 'normal-z', 'target-b', 'hit-confirm', 20));
  owner.presentCharacterImpact(command(owner, 'strong-z', 'target-a', 'surface-transfer', 20));
  owner.presentCharacterImpact(command(owner, 'warning-z', 'target-a', 'ring-out', 20));
  owner.presentCharacterImpact(command(owner, 'warning-a', 'target-c', 'ring-out', 20));

  assert.deepEqual(owner.getSnapshot().activeSourceEventIds, [
    'warning-a',
    'warning-z',
    'normal-z',
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(20, false).participants, [
    { participantId: 'target-a', intensity: 0.95, animationHeld: true },
    { participantId: 'target-b', intensity: 0.55, animationHeld: true },
    { participantId: 'target-c', intensity: 0.95, animationHeld: true },
  ]);
});

test('P5.3zzzvt prefers stronger same-tick same-kind impact independent of input order', () => {
  const first = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  first.presentCharacterImpact(command(
    first,
    'ring-z-heavy',
    'target-a',
    'ring-out',
    24,
    'standard',
    null,
    1.12,
  ));
  first.presentCharacterImpact(command(
    first,
    'ring-a-light',
    'target-a',
    'ring-out',
    24,
    'standard',
    null,
    0.85,
  ));

  const second = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  second.presentCharacterImpact(command(
    second,
    'ring-a-light',
    'target-a',
    'ring-out',
    24,
    'standard',
    null,
    0.85,
  ));
  second.presentCharacterImpact(command(
    second,
    'ring-z-heavy',
    'target-a',
    'ring-out',
    24,
    'standard',
    null,
    1.12,
  ));

  assert.deepEqual(first.getSnapshot().activeSourceEventIds, ['ring-z-heavy']);
  assert.deepEqual(second.getSnapshot().activeSourceEventIds, ['ring-z-heavy']);
  assert.deepEqual(
    first.resolveCharacterImpacts(24, false),
    second.resolveCharacterImpacts(24, false),
  );
});

test('P5.3zzzvt prefers newer same-kind impact before strength and stable identity', () => {
  const first = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  first.presentCharacterImpact(command(
    first,
    'ring-a-old-heavy',
    'target-a',
    'ring-out',
    24,
    'standard',
    null,
    1.12,
  ));
  first.presentCharacterImpact(command(
    first,
    'ring-z-new-light',
    'target-a',
    'ring-out',
    25,
    'standard',
    null,
    0.85,
  ));
  first.presentCharacterImpact(command(
    first,
    'ring-y-new-light',
    'target-a',
    'ring-out',
    25,
    'standard',
    null,
    0.85,
  ));

  const second = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  second.presentCharacterImpact(command(
    second,
    'ring-a-old-heavy',
    'target-a',
    'ring-out',
    24,
    'standard',
    null,
    1.12,
  ));
  second.presentCharacterImpact(command(
    second,
    'ring-y-new-light',
    'target-a',
    'ring-out',
    25,
    'standard',
    null,
    0.85,
  ));
  second.presentCharacterImpact(command(
    second,
    'ring-z-new-light',
    'target-a',
    'ring-out',
    25,
    'standard',
    null,
    0.85,
  ));

  assert.deepEqual(first.getSnapshot().activeSourceEventIds, ['ring-y-new-light']);
  assert.deepEqual(second.getSnapshot().activeSourceEventIds, ['ring-y-new-light']);
  assert.deepEqual(
    first.resolveCharacterImpacts(25, false),
    second.resolveCharacterImpacts(25, false),
  );
});

test('P5.3zzzvt preserves the longest remaining same-target hold without additive stacking', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(owner, 'old-ring', 'target-a', 'ring-out', 20));
  owner.presentCharacterImpact(command(owner, 'fresh-hit', 'target-a', 'hit-confirm', 24));

  assert.deepEqual(owner.getSnapshot().activeSourceEventIds, ['old-ring']);
  assert.deepEqual(owner.getSnapshot().activeContributorSourceEventIds, [
    'fresh-hit',
    'old-ring',
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(24, false).participants, [
    { participantId: 'target-a', intensity: 0.55, animationHeld: true },
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(25, false).participants, [
    {
      participantId: 'target-a',
      intensity: 0.55 * ((3 - 1) / 3) ** 2,
      animationHeld: true,
    },
  ]);
});

test('P5.3zzzvt promotes the surviving same-target contributor when the winner is removed', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(owner, 'winner-ring', 'target-a', 'ring-out', 30));
  owner.presentCharacterImpact(command(owner, 'surviving-hit', 'target-a', 'hit-confirm', 30));

  owner.removeCharacterImpact('winner-ring');
  assert.deepEqual(owner.getSnapshot().activeSourceEventIds, ['surviving-hit']);
  assert.deepEqual(owner.getSnapshot().activeContributorSourceEventIds, ['surviving-hit']);
});

test('P5.3zzzvt rejects a sixty-fifth active contributor before changing waterlines', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  for (let index = 0; index < 64; index += 1) {
    owner.presentCharacterImpact(command(
      owner,
      `same-target-${String(index).padStart(2, '0')}`,
      'target-a',
      'hit-confirm',
      35,
    ));
  }
  const before = owner.getSnapshot();
  assert.throws(
    () => owner.presentCharacterImpact(command(
      owner,
      'same-target-overflow',
      'target-a',
      'hit-confirm',
      35,
    )),
    /活动贡献事件超出64项/u,
  );
  assert.deepEqual(owner.getSnapshot(), before);
});

test('P5.3ze holds only explicit targets for 2/3/4 ticks without catch-up state', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(owner, 'hit-hold', 'target-hit', 'hit-confirm', 40));
  owner.presentCharacterImpact(command(owner, 'transfer-hold', 'target-transfer', 'surface-transfer', 40));
  owner.presentCharacterImpact(command(owner, 'ring-hold', 'target-ring', 'ring-out', 40));

  assert.deepEqual(
    owner.resolveCharacterImpacts(42, false).participants.map((item) => ({
      participantId: item.participantId,
      animationHeld: item.animationHeld,
    })),
    [
      { participantId: 'target-hit', animationHeld: false },
      { participantId: 'target-ring', animationHeld: true },
      { participantId: 'target-transfer', animationHeld: true },
    ],
  );
  assert.deepEqual(
    owner.resolveCharacterImpacts(43, false).participants.map((item) => ({
      participantId: item.participantId,
      animationHeld: item.animationHeld,
    })),
    [
      { participantId: 'target-ring', animationHeld: true },
      { participantId: 'target-transfer', animationHeld: false },
    ],
  );
});

test('P5.3ze consumes reduced-motion identity while producing no material or animation hold', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(owner, 'reduced-hit', 'target-1', 'ring-out', 50));
  assert.deepEqual(owner.resolveCharacterImpacts(50, true).participants, []);
  assert.deepEqual(owner.resolveCharacterImpacts(51, true).participants, []);
  assert.deepEqual(owner.getSnapshot().activeSourceEventIds, ['reduced-hit']);
});

test('P5.3zf keeps stable target hit direction without inventing non-directional fallback', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(
    owner,
    'directional-hit',
    'target-1',
    'ring-out',
    60,
    'standard',
    { x: 3, z: 4 },
  ));
  owner.presentCharacterImpact(command(
    owner,
    'non-directional-hit',
    'target-2',
    'hit-confirm',
    60,
  ));
  assert.deepEqual(owner.resolveCharacterImpacts(60, false).hitDirections, [
    { participantId: 'target-1', worldDirection: { x: 0.6, z: 0.8 } },
  ]);
  assert.deepEqual(owner.resolveCharacterImpacts(61, true).hitDirections, [
    { participantId: 'target-1', worldDirection: { x: 0.6, z: 0.8 } },
  ]);
});

test('P5.3zf uses the existing priority winner instead of a lower-priority direction fallback', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  owner.presentCharacterImpact(command(
    owner,
    'directional-normal',
    'target-1',
    'hit-confirm',
    70,
    'standard',
    { x: 1, z: 0 },
  ));
  owner.presentCharacterImpact(command(
    owner,
    'non-directional-warning',
    'target-1',
    'ring-out',
    70,
  ));
  assert.deepEqual(owner.resolveCharacterImpacts(70, false).hitDirections, []);
});

test('P5.3zd is idempotent, reduced-motion safe and epoch bounded', () => {
  const owner = new ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1();
  const original = command(owner, 'ring-1', 'target-1', 'ring-out', 30);
  owner.presentCharacterImpact(original);
  owner.resolveCharacterImpacts(31, true);
  owner.presentCharacterImpact(original);
  assert.deepEqual(owner.resolveCharacterImpacts(31, true).participants, []);
  assert.throws(
    () => owner.presentCharacterImpact({ ...original, participantId: 'target-2' }),
    /语义漂移/u,
  );

  const oldEpoch = owner.getCharacterImpactEpochId();
  owner.clearCharacterImpacts();
  assert.notEqual(owner.getCharacterImpactEpochId(), oldEpoch);
  assert.throws(() => owner.presentCharacterImpact(original), /旧epoch/u);
});

test('P5.3zd wires one shared owner through VFX, stage and target material presentation', () => {
  const host = readFileSync('src/entry/arena-v2-formal-web-match-host-candidate-v1.ts', 'utf8');
  const stage = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-three-stage-candidate-v1.ts',
    'utf8',
  );
  const vfx = readFileSync('src/entry/arena-v2-formal-three-vfx-port-candidate-v1.ts', 'utf8');
  const character = readFileSync(
    'packages/arena-product-presentation-three/src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
    'utf8',
  );
  assert.match(host, /cameraImpact: cameraController,\s*characterImpact,/u);
  assert.match(host, /cameraController,\s*characterImpact,\s*hudLayer,/u);
  assert.match(stage, /animationHoldParticipantIds/u);
  assert.match(stage, /characters\.sync\(frame, \{ snap, cameraModel, animationHoldParticipantIds \}\)/u);
  assert.match(stage, /characterFactory\.applyImpactReadability\(Object\.freeze/u);
  assert.match(stage, /this\.#characters\?\.clearAnimationHolds\(\)/u);
  assert.match(stage, /characterFactory\.applyImpactDirections\(characterImpact\.hitDirections\)/u);
  assert.match(stage, /this\.#characterFactory\?\.clearImpactDirections\(\)/u);
  assert.match(vfx, /worldDirection: direction\?\.worldDirection \?\? null/u);
  assert.match(character, /setImpactReadabilityIntensity\(value: unknown\)/u);
  assert.doesNotMatch(stage, /characters\.update\(0\)/u);
});
