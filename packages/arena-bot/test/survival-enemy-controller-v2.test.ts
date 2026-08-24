import { describe, expect, it } from 'vitest';
import {
  SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE,
  SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  SurvivalEnemyControllerV2,
  createSurvivalEnemyObservationV2,
  validateSurvivalEnemyControllerCheckpointV2,
} from '../src/index.js';

function baseObservation(tick: number) {
  return {
    schemaVersion: 2,
    tick,
    eventSequence: tick,
    modeDefinitionId: 'arena.mode.survival.candidate.v1',
    participantId: 'enemy-1',
    slotId: 'enemy-slot-1',
    slotGeneration: 0,
    active: true,
    primaryRange: 2,
    primaryMinimumCommitmentTicks: 0,
    primaryCommitment: null,
    self: {
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      hitstunTicks: 0,
      actionReady: true,
      actionInProgress: false,
      currentSegmentId: 'segment-a',
    },
    player: {
      participantId: 'player-1',
      position: { x: -1, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      invulnerableTicks: 0,
      currentSegmentId: 'segment-a',
    },
    routeTargets: [{
      segmentId: 'segment-a',
      anchorId: 'anchor-player',
      position: { x: -2, y: 1, z: 0 },
      intent: 'pursuit',
      traversal: 'walk',
      priority: 100,
    }],
    heldEquipment: null,
    visibleSupplies: [],
  };
}

function sameSegmentSupply(
  supplyId = 'supply-a',
  remainingTicks = 300,
  x = 4,
) {
  return {
    supplyId,
    equipmentInstanceId: `equipment-${supplyId}`,
    collectionEquipmentDefinitionId: 'arena.weapon.charge-shield.collection.candidate.v1',
    runtimeEquipmentDefinitionId: 'arena.weapon.charge-shield.survival.level-1.candidate.v1',
    survivalLevel: 1,
    segmentId: 'segment-a',
    position: { x, y: 1, z: 0 },
    remainingTicks,
    directTraversal: 'walk',
    routeTargetAnchorId: null,
  };
}

function heldEquipment() {
  return {
    collectionEquipmentDefinitionId: 'arena.weapon.charge-shield.collection.candidate.v1',
    runtimeEquipmentDefinitionId: 'arena.weapon.charge-shield.survival.level-1.candidate.v1',
    survivalLevel: 1,
  };
}

function controller() {
  return new SurvivalEnemyControllerV2({
    participantId: 'enemy-1',
    slotId: 'enemy-slot-1',
    behaviorSeed: 0x51a7_0002,
    profile: SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  });
}

describe('Survival enemy supply-aware controller V2 candidate', () => {
  it('moves an unarmed enemy toward visible same-segment supply without attacking', () => {
    const bot = controller();
    const frame = bot.createInput({
      ...baseObservation(0),
      visibleSupplies: [sameSegmentSupply()],
    });
    expect(frame.moveX).toBeGreaterThan(0);
    expect(frame.primaryPressed).toBe(false);
    expect(frame.primaryHeld).toBe(false);
    expect(bot.getDebugSnapshot().delegate.selectedAnchorId).toBe(
      'arena.survival.supply-target:supply-a',
    );
  });

  it('does not abandon an in-progress commitment to pursue a visible supply', () => {
    const bot = controller();
    const frame = bot.createInput({
      ...baseObservation(0),
      primaryMinimumCommitmentTicks: 3,
      primaryCommitment: { status: 'charging', chargeTicks: 1 },
      self: {
        ...baseObservation(0).self,
        actionReady: false,
        actionInProgress: true,
      },
      visibleSupplies: [sameSegmentSupply()],
    });
    expect(frame.primaryHeld).toBe(true);
    // The committed action keeps the original pursuit target, but an enemy
    // already inside preferred distance must not walk through that target
    // merely to prove it ignored a visible supply.
    expect(Math.abs(frame.moveX)).toBe(0);
    expect(Math.abs(frame.moveZ)).toBe(0);
    expect(bot.getDebugSnapshot().delegate.selectedAnchorId).toBe('anchor-player');
  });

  it('holds position while a charging target is temporarily invulnerable', () => {
    const bot = controller();
    const observation = baseObservation(0);
    const frame = bot.createInput({
      ...observation,
      primaryMinimumCommitmentTicks: 3,
      primaryCommitment: { status: 'charging', chargeTicks: 1 },
      self: {
        ...observation.self,
        actionReady: false,
        actionInProgress: true,
      },
      player: {
        ...observation.player,
        invulnerableTicks: 30,
      },
      visibleSupplies: [sameSegmentSupply()],
    });
    expect(frame.primaryHeld).toBe(true);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
    expect(bot.getDebugSnapshot().delegate.selectedAnchorId).toBe('anchor-player');
  });

  it('returns to player pursuit and normal attacks after equipment is held', () => {
    const bot = controller();
    bot.createInput({
      ...baseObservation(0),
      visibleSupplies: [sameSegmentSupply()],
    });
    const frame = bot.createInput({
      ...baseObservation(1),
      heldEquipment: heldEquipment(),
      visibleSupplies: [sameSegmentSupply()],
    });
    expect(frame.moveX).toBeLessThanOrEqual(0);
    expect(frame.primaryPressed).toBe(true);
  });

  it('chooses same-segment supply, then expiry, distance and stable id deterministically', () => {
    const bot = controller();
    bot.createInput({
      ...baseObservation(0),
      visibleSupplies: [
        sameSegmentSupply('supply-a', 300, 2),
        sameSegmentSupply('supply-b', 100, 8),
      ],
    });
    expect(bot.getDebugSnapshot().delegate.selectedAnchorId).toBe(
      'arena.survival.supply-target:supply-b',
    );
    expect(SURVIVAL_ENEMY_CONTROLLER_V2_CANDIDATE).toMatchObject({
      status: 'production-unreachable', hardGate: false,
      emitsOnlyInputFrame: true, writesHitMovementSupplyOrMode: false,
      defaultBotRegistryWired: false, validationStatus: 'not-run',
    });
  });

  it('uses only an authority-approved current route target for cross-segment supply', () => {
    const bot = controller();
    const source = baseObservation(0);
    const frame = bot.createInput({
      ...source,
      routeTargets: [{
        segmentId: 'segment-b',
        anchorId: 'anchor-b',
        position: { x: 3, y: 1, z: 0 },
        intent: 'intercept',
        traversal: 'jump',
        priority: 100,
      }],
      visibleSupplies: [{
        ...sameSegmentSupply(),
        segmentId: 'segment-c',
        position: { x: 20, y: 1, z: 0 },
        routeTargetAnchorId: 'anchor-b',
      }],
    });
    expect(frame.moveX).toBeGreaterThan(0);
    expect(bot.getDebugSnapshot().delegate.selectedAnchorId).toBe('anchor-b');
  });

  it('rejects future fields, invalid equipment and unapproved cross-segment shortcuts', () => {
    expect(() => createSurvivalEnemyObservationV2({
      ...baseObservation(0),
      futureSupplyPrediction: [],
    })).toThrow(/不支持字段/);
    expect(() => createSurvivalEnemyObservationV2({
      ...baseObservation(0),
      heldEquipment: {
        ...heldEquipment(),
        runtimeEquipmentDefinitionId: heldEquipment().collectionEquipmentDefinitionId,
      },
    })).toThrow(/分离/);
    expect(() => createSurvivalEnemyObservationV2({
      ...baseObservation(0),
      visibleSupplies: [{
        ...sameSegmentSupply(),
        segmentId: 'segment-b',
      }],
    })).toThrow(/合法route target/);
  });

  it('detects same-tick supply forks that the V1 observation cannot see', () => {
    const bot = controller();
    bot.createInput({
      ...baseObservation(0),
      visibleSupplies: [sameSegmentSupply('supply-a', 300)],
    });
    expect(() => bot.createInput({
      ...baseObservation(0),
      visibleSupplies: [sameSegmentSupply('supply-a', 299)],
    })).toThrow(/同tick/);
  });

  it('preserves the exact V2 suffix across checkpoint restore', () => {
    const continuous = controller();
    let restored = controller();
    for (let tick = 0; tick < 8; tick += 1) {
      const observation = {
        ...baseObservation(tick),
        visibleSupplies: [sameSegmentSupply('supply-a', 300 - tick)],
      };
      expect(restored.createInput(observation)).toEqual(continuous.createInput(observation));
    }
    const checkpoint = restored.exportCheckpointV2();
    restored.destroy();
    restored = SurvivalEnemyControllerV2.restoreFromCheckpointV2(checkpoint);
    for (let tick = 8; tick < 30; tick += 1) {
      const observation = {
        ...baseObservation(tick),
        heldEquipment: tick >= 12 ? heldEquipment() : null,
        visibleSupplies: [sameSegmentSupply('supply-a', 300 - tick)],
      };
      expect(restored.createInput(observation)).toEqual(continuous.createInput(observation));
    }
  });

  it('rejects checkpoint tampering, paused input and calls after destroy', () => {
    const bot = controller();
    bot.createInput(baseObservation(0));
    bot.pause();
    expect(() => bot.createInput(baseObservation(1))).toThrow(/paused/);
    const checkpoint = bot.exportCheckpointV2();
    const tampered = JSON.parse(JSON.stringify(checkpoint)) as Record<string, unknown>;
    tampered.lastEventSequence = 99;
    expect(() => validateSurvivalEnemyControllerCheckpointV2(tampered)).toThrow(/漂移|hash|不闭合/);
    bot.resume();
    bot.destroy();
    expect(() => bot.createInput(baseObservation(1))).toThrow(/destroyed|已销毁/);
    expect(() => bot.destroy()).not.toThrow();
  });
});
