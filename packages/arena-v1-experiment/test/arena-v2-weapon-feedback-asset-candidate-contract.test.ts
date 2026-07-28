import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES,
  getArenaV2WeaponFeedbackAssetCandidate,
  runArenaV2WeaponFeedbackAssetCandidateAudit,
} from '../src/index.js';

describe('Arena V2 weapon feedback asset candidate contract', () => {
  it('covers every authority feedback kind with distinct visual, audio, and reduced-motion IDs', () => {
    expect(ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES).toHaveLength(5);
    expect(new Set(ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.map(({ feedbackKind }) => feedbackKind)).size)
      .toBe(5);
    expect(new Set(ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.map(({ visualAssetId }) => visualAssetId)).size)
      .toBe(5);
    expect(new Set(ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.map(({ audioAssetId }) => audioAssetId)).size)
      .toBe(5);
    expect(new Set(ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.map(({ reducedMotionVisualAssetId }) => (
      reducedMotionVisualAssetId
    ))).size).toBe(5);
    expect(ARENA_V2_WEAPON_FEEDBACK_ASSET_CANDIDATES.every(({ status, finalAssetBound, deviceVerified, humanVerified }) => (
      status === 'candidate'
      && finalAssetBound === false
      && deviceVerified === false
      && humanVerified === false
    ))).toBe(true);
  });

  it('resolves a candidate by authority semantics without changing the semantic kind', () => {
    const candidate = getArenaV2WeaponFeedbackAssetCandidate('hit-ring-out');
    expect(candidate).toMatchObject({
      feedbackKind: 'hit-ring-out',
      semanticRole: 'loss-of-support',
      status: 'candidate',
    });
    expect(Object.isFrozen(candidate)).toBe(true);
  });

  it('keeps the asset handoff blocked until final assets, device, and human evidence exist', () => {
    expect(runArenaV2WeaponFeedbackAssetCandidateAudit()).toEqual({
      status: 'blocked',
      candidateCount: 5,
      coveredFeedbackKinds: [
        'hit-confirm',
        'hit-surface-transfer',
        'hit-ring-out',
        'attack-evaded',
        'movement-fall',
      ],
      blockers: [
        'final-visual-assets-not-bound',
        'final-audio-assets-not-bound',
        'device-readability-not-verified',
        'human-causal-readability-not-verified',
      ],
    });
  });
});
