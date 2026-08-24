import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_RESULT_PLAY_AGAIN_CONTENT_CONTINUITY_CANDIDATE_V1,
  assertArenaV2ResultPlayAgainContentContinuityCandidateV1,
  captureArenaV2ResultPlayAgainContentContinuityCandidateV1,
} from '../src/index.js';

describe('Arena V2 result play-again content continuity candidate V1', () => {
  it('captures and verifies the same mode, weapon and map identity', () => {
    const continuity = captureArenaV2ResultPlayAgainContentContinuityCandidateV1({
      previousModeKind: 'race',
      requestedModeKind: 'race',
      weaponDefinitionId: 'weapon.heavy-hammer',
      mapDefinitionId: 'map.kz-base',
    });
    expect(assertArenaV2ResultPlayAgainContentContinuityCandidateV1(
      continuity,
      continuity,
    )).toEqual(continuity);
    expect(Object.isFrozen(continuity)).toBe(true);
  });

  it('rejects mode switches and post-start weapon or map drift', () => {
    expect(() => captureArenaV2ResultPlayAgainContentContinuityCandidateV1({
      previousModeKind: 'race',
      requestedModeKind: 'survival',
      weaponDefinitionId: 'weapon.heavy-hammer',
      mapDefinitionId: 'map.kz-base',
    })).toThrow(/保持上一局模式/);
    const continuity = captureArenaV2ResultPlayAgainContentContinuityCandidateV1({
      previousModeKind: 'duel',
      requestedModeKind: 'duel',
      weaponDefinitionId: 'weapon.heavy-hammer',
      mapDefinitionId: 'map.kz-base',
    });
    expect(() => assertArenaV2ResultPlayAgainContentContinuityCandidateV1(
      continuity,
      { ...continuity, weaponDefinitionId: 'weapon.gravity-chain' },
    )).toThrow(/漂移/);
    expect(() => assertArenaV2ResultPlayAgainContentContinuityCandidateV1(
      continuity,
      { ...continuity, mapDefinitionId: 'map.kz-switchback' },
    )).toThrow(/漂移/);
  });

  it('keeps the candidate free of profile, selection and resource ownership', () => {
    expect(ARENA_V2_RESULT_PLAY_AGAIN_CONTENT_CONTINUITY_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      preservesMode: true,
      preservesWeapon: true,
      preservesMap: true,
      registryWithdrawalFailsClosed: true,
      addsProfileFields: false,
      addsSelectionState: false,
      createsResources: false,
      createsAsyncWork: false,
    });
  });
});
