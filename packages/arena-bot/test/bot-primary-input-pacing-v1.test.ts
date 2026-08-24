import { describe, expect, it } from 'vitest';
import {
  createBotPrimaryCommitmentObservationV1,
  createBotPrimaryInputPacingV1,
  isBotParticipantControlAvailableV1,
  isBotPrimaryActionReadyV1,
} from '../src/index.js';

function input(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    actionReady: true,
    actionInProgress: false,
    commitment: null,
    minimumCommitmentTicks: 0,
    wantsToStart: false,
    ...overrides,
  };
}

describe('Bot primary input pacing V1', () => {
  it('permits ordinary input only for an active participant without hitstun', () => {
    expect(isBotParticipantControlAvailableV1({
      schemaVersion: 1,
      participantActive: true,
      hitstunTicks: 0,
    })).toBe(true);
    expect(isBotParticipantControlAvailableV1({
      schemaVersion: 1,
      participantActive: true,
      hitstunTicks: 1,
    })).toBe(false);
    expect(isBotParticipantControlAvailableV1({
      schemaVersion: 1,
      participantActive: false,
      hitstunTicks: 0,
    })).toBe(false);
  });

  it('derives readiness from action phase and current equipment cooldown', () => {
    expect(isBotPrimaryActionReadyV1({
      schemaVersion: 1,
      actionIdle: true,
      cooldownRemainingTicks: null,
    })).toBe(true);
    expect(isBotPrimaryActionReadyV1({
      schemaVersion: 1,
      actionIdle: true,
      cooldownRemainingTicks: 1,
    })).toBe(false);
    expect(isBotPrimaryActionReadyV1({
      schemaVersion: 1,
      actionIdle: false,
      cooldownRemainingTicks: 0,
    })).toBe(false);
  });

  it('crops known authority commitment states and rejects unknown ones', () => {
    expect(createBotPrimaryCommitmentObservationV1({
      status: 'charging',
      chargeTicks: 2,
    })).toEqual({ status: 'charging', chargeTicks: 2 });
    expect(() => createBotPrimaryCommitmentObservationV1({
      status: 'future-state',
      chargeTicks: 2,
    })).toThrow(/不受支持/);
  });

  it('keeps press actions on one ordinary input frame', () => {
    expect(createBotPrimaryInputPacingV1(input({ wantsToStart: true }))).toEqual({
      primaryPressed: true,
      primaryHeld: true,
    });
    expect(createBotPrimaryInputPacingV1(input({
      actionReady: false,
      actionInProgress: false,
    }))).toEqual({ primaryPressed: false, primaryHeld: false });
    expect(createBotPrimaryInputPacingV1(input({
      actionReady: false,
      actionInProgress: false,
      minimumCommitmentTicks: 6,
    }))).toEqual({ primaryPressed: false, primaryHeld: false });
  });

  it('holds until the next authority step reaches commitTicks and then releases', () => {
    expect(createBotPrimaryInputPacingV1(input({
      minimumCommitmentTicks: 6,
      wantsToStart: true,
    }))).toEqual({ primaryPressed: true, primaryHeld: true });
    expect(createBotPrimaryInputPacingV1(input({
      actionReady: false,
      actionInProgress: true,
      minimumCommitmentTicks: 6,
    }))).toEqual({ primaryPressed: false, primaryHeld: true });
    expect(createBotPrimaryInputPacingV1(input({
      actionReady: false,
      actionInProgress: true,
      commitment: { status: 'charging', chargeTicks: 4 },
      minimumCommitmentTicks: 6,
    }))).toEqual({ primaryPressed: false, primaryHeld: true });
    expect(createBotPrimaryInputPacingV1(input({
      actionReady: false,
      actionInProgress: true,
      commitment: { status: 'charging', chargeTicks: 5 },
      minimumCommitmentTicks: 6,
    }))).toEqual({ primaryPressed: false, primaryHeld: false });
  });

  it('stops holding after authority commitment and rejects impossible shapes', () => {
    expect(createBotPrimaryInputPacingV1(input({
      actionReady: false,
      actionInProgress: true,
      commitment: { status: 'committed', chargeTicks: 6 },
      minimumCommitmentTicks: 6,
    }))).toEqual({ primaryPressed: false, primaryHeld: false });
    expect(() => createBotPrimaryInputPacingV1(input({
      commitment: { status: 'charging', chargeTicks: 0 },
    }))).toThrow(/非蓄势/);
    expect(() => createBotPrimaryInputPacingV1(input({
      commitment: { status: 'charging', chargeTicks: 0 },
      minimumCommitmentTicks: 6,
    }))).toThrow(/已就绪/);
  });
});
