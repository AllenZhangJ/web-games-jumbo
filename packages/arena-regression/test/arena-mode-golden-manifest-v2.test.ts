import { describe, expect, it } from 'vitest';
import {
  ARENA_MODE_GOLDEN_MANIFEST_V2_CANDIDATE_STATUS,
  createArenaModeGoldenManifestV2,
  validateArenaModeGoldenManifestV2,
} from '../src/arena-mode-golden-manifest-v2.js';

type DataRecord = Record<string, unknown>;

function entry(
  modeKind: 'duel' | 'race' | 'survival',
  suffix: string,
): DataRecord {
  const enemySlotCount = modeKind === 'survival' ? 4 : 0;
  return {
    id: `arena.p2.${modeKind}.${suffix}`,
    modeKind,
    modeDefinitionId: `arena.mode.${modeKind}.test.v6`,
    fixtureDefinitionId: modeKind === 'duel'
      ? null
      : `arena.mode.${modeKind}.test.fixture.v1`,
    matchSeed: modeKind === 'duel' ? 11 : modeKind === 'race' ? 22 : 33,
    participantCount: modeKind === 'duel' ? 2 : modeKind === 'race' ? 4 : 5,
    enemySlotCount,
    regressionCandidateId: `arena.regression.${modeKind}.${suffix}`,
    replayIdentityHash: '11111111',
    checkpointSequenceHash: '22222222',
    modeResultHash: '33333333',
    finalHash: '44444444',
    regressionResultHash: '55555555',
  };
}

function options(): DataRecord {
  return {
    schemaVersion: 2,
    candidateStatus: ARENA_MODE_GOLDEN_MANIFEST_V2_CANDIDATE_STATUS,
    id: 'arena.p2.mode-golden.test.v2',
    sourceCommit: 'a'.repeat(40),
    replaySchemaVersion: 6,
    entries: [
      entry('duel', 'seed-11'),
      entry('race', 'seed-22'),
      entry('survival', 'seed-33'),
    ],
  };
}

describe('Arena Mode Golden Manifest V2 candidate', () => {
  it('binds Duel, Race and Survival regression identities without changing V5 manifest', () => {
    const manifest = createArenaModeGoldenManifestV2(options());
    expect(manifest.entries.map(({ modeKind }) => modeKind)).toEqual([
      'duel', 'race', 'survival',
    ]);
    expect(manifest.candidateStatus).toBe('production-unreachable');
    expect(validateArenaModeGoldenManifestV2(manifest)).toEqual(manifest);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.entries)).toBe(true);
  });

  it('requires complete mode coverage, stable order and unique regression candidates', () => {
    const missingMode = options();
    (missingMode.entries as DataRecord[]).pop();
    expect(() => createArenaModeGoldenManifestV2(missingMode)).toThrow(/逐模式|survival/);

    const reversed = options();
    (reversed.entries as DataRecord[]).reverse();
    expect(() => createArenaModeGoldenManifestV2(reversed)).toThrow(/严格递增/);

    const duplicate = options();
    const duplicateEntries = duplicate.entries as DataRecord[];
    duplicateEntries[1]!.regressionCandidateId = duplicateEntries[0]!.regressionCandidateId;
    expect(() => createArenaModeGoldenManifestV2(duplicate)).toThrow(/回归候选重复/);
  });

  it('keeps unresolved Race and Survival values isolated behind explicit test fixtures', () => {
    const noFixture = options();
    (noFixture.entries as DataRecord[])[1]!.fixtureDefinitionId = null;
    expect(() => createArenaModeGoldenManifestV2(noFixture)).toThrow(/test.*fixture|格式无效/);

    const candidateMode = options();
    (candidateMode.entries as DataRecord[])[2]!.modeDefinitionId = 'arena.mode.survival.v6';
    expect(createArenaModeGoldenManifestV2(candidateMode).entries[2]!.modeDefinitionId)
      .toBe('arena.mode.survival.v6');
  });

  it('rejects invalid participant and enemy-slot cardinality by mode', () => {
    const race = options();
    (race.entries as DataRecord[])[1]!.participantCount = 5;
    expect(() => createArenaModeGoldenManifestV2(race)).toThrow(/Race/);

    const survival = options();
    (survival.entries as DataRecord[])[2]!.enemySlotCount = 16;
    expect(() => createArenaModeGoldenManifestV2(survival)).toThrow(/Survival/);
  });

  it('fails closed for future fields, hostile accessors and tampered result identity', () => {
    expect(() => createArenaModeGoldenManifestV2({
      ...options(),
      future: true,
    })).toThrow(/future/);

    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 2;
      },
    });
    expect(() => createArenaModeGoldenManifestV2(hostile)).toThrow(/访问器|数据字段/);
    expect(getterCalls).toBe(0);

    const manifest = createArenaModeGoldenManifestV2(options());
    expect(() => validateArenaModeGoldenManifestV2({
      ...manifest,
      resultHash: '00000000',
    })).toThrow(/resultHash/);
  });

  it('freezes caller-owned data and validates the source commit identity', () => {
    const source = options();
    const manifest = createArenaModeGoldenManifestV2(source);
    (source.entries as DataRecord[])[0]!.finalHash = 'ffffffff';
    expect(manifest.entries[0]!.finalHash).toBe('44444444');

    expect(() => createArenaModeGoldenManifestV2({
      ...options(),
      sourceCommit: 'not-a-commit',
    })).toThrow(/sourceCommit/);
  });
});
