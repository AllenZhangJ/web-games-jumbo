import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTIC_CANDIDATE_V1,
  ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1,
  requireArenaV2FormalPassthroughVfxSemanticCandidateV1,
} from '../src/index.js';

describe('Arena V2 formal passthrough VFX semantic candidate V1 (not run)', () => {
  it('closes all 22 exact passthrough cues once and freezes every semantic', () => {
    expect(ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1).toHaveLength(22);
    expect(new Set(
      ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1.map(({ cueId }) => cueId),
    ).size).toBe(22);
    expect(ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTICS_CANDIDATE_V1.every(Object.isFrozen))
      .toBe(true);
  });

  it('keeps credited ring-out distinct from movement and environment falls', () => {
    expect(requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
      'participant-fell-credited-hit',
    ).shapeKind).toBe('ring-out');
    expect(requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
      'participant-fell-movement',
    ).shapeKind).toBe('movement-fall-warning');
    expect(requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
      'participant-fell-environment',
    ).shapeKind).toBe('movement-fall-warning');
  });

  it('uses exact finish identity and rejects similar future cue strings', () => {
    expect(requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
      'race-finish-claimed',
    ).shapeKind).toBe('surface-transfer');
    expect(() => requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
      'future-participant-fell-movement',
    )).toThrow(/未注册/);
    expect(() => requireArenaV2FormalPassthroughVfxSemanticCandidateV1(
      'race-finish-claimed-v2',
    )).toThrow(/未注册/);
  });

  it('keeps the candidate unreachable and unable to own gameplay authority', () => {
    expect(ARENA_V2_FORMAL_PASSTHROUGH_VFX_SEMANTIC_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      substringSemanticInferenceAllowed: false,
      ownsRuleHitFallOrResultAuthority: false,
    });
  });
});
