import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '@number-strategy-jump/arena-product-v1-content';
import { advancePlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import { PlayerProfileRepository } from '@number-strategy-jump/arena-profile-persistence';

function parsePositiveInteger(
  argument: string | undefined,
  prefix: string,
  fallback: number,
): number {
  const match = argument?.startsWith(prefix) ? argument.slice(prefix.length) : null;
  if (match === null) return fallback;
  const value = Number(match);
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${prefix} 必须是正整数。`);
  return value;
}

const commitsArgument = process.argv.find((argument) => argument.startsWith('--commits='));
const commits = parsePositiveInteger(commitsArgument, '--commits=', 500);
if (commits > ARENA_V1_PLAYER_PROFILE_DEFINITION.limits.maxCommittedGrantIds) {
  throw new RangeError('压力次数不能超过 Profile committedGrantIds 上限。');
}

function clone<T>(value: T): T {
  return value === undefined
    ? value
    : JSON.parse(JSON.stringify(value)) as T;
}

const values = new Map<string, unknown>();
const failNextRead = new Set<string>();
let failHeadOnce = false;
let armReadbackKey: string | null = null;
const port = {
  storageRead(key: string) {
    if (failNextRead.delete(key)) return { ok: false, found: false, value: undefined };
    return values.has(key)
      ? { ok: true, found: true, value: clone(values.get(key)) }
      : { ok: true, found: false, value: undefined };
  },
  storageWrite(key: string, value: unknown): boolean {
    if (failHeadOnce && key.endsWith('.head')) {
      failHeadOnce = false;
      return false;
    }
    values.set(key, clone(value));
    if (key === armReadbackKey) {
      armReadbackKey = null;
      failNextRead.add(key);
    }
    return true;
  },
  storageDelete(key: string): boolean {
    values.delete(key);
    return true;
  },
};

let now = 1000;
let ownerSequence = 0;
function createRepository(): PlayerProfileRepository {
  ownerSequence += 1;
  return new PlayerProfileRepository({
    definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    storage: port,
    ownerId: `stress-owner-${ownerSequence}`,
    wallNow: () => now,
    keyPrefix: 'stress.player-profile',
  });
}

let repository = createRepository();
let profile = repository.open();
const keys = repository.getStorageKeys();
let readbackRollbacks = 0;
let headFailures = 0;
let corruptions = 0;

for (let revision = 1; revision <= commits; revision += 1) {
  now += 10;
  const next = advancePlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION, profile, {
    progression: {
      experience: revision,
      committedGrantIds: [...profile.progression.committedGrantIds, `grant-${revision}`],
    },
  });

  if (revision % 17 === 0) {
    failHeadOnce = true;
    headFailures += 1;
  }
  if (revision % 29 === 0) {
    armReadbackKey = revision % 2 === 1 ? keys.slotA : keys.slotB;
  }

  let result = repository.compareAndSet(next, profile.revision);
  if (!result.committed && result.reason === 'slot-readback-failed') {
    readbackRollbacks += 1;
    result = repository.compareAndSet(next, profile.revision);
  }
  if (!result.committed) throw new Error(`revision ${revision} 未能提交：${result.reason}`);
  profile = repository.getSnapshot();
  if (profile.revision !== revision || profile.progression.experience !== revision) {
    throw new Error(`revision ${revision} 内存快照不一致。`);
  }

  if (revision % 31 === 0) {
    const inactiveKey = revision % 2 === 1 ? keys.slotB : keys.slotA;
    values.set(inactiveKey, { corrupt: true, marker: revision });
    corruptions += 1;
  }

  if (revision % 40 === 0) {
    repository.destroy();
    repository = createRepository();
    profile = repository.open();
    if (profile.revision !== revision) throw new Error(`reopen ${revision} 丢失最新提交。`);
  }
}

repository.destroy();
const finalRepository = createRepository();
const finalProfile = finalRepository.open();
if (
  finalProfile.revision !== commits
  || finalProfile.progression.experience !== commits
  || finalProfile.progression.committedGrantIds.length !== commits
) throw new Error('最终 PlayerProfile 与已确认提交不一致。');
const diagnostics = finalRepository.getDiagnostics();
finalRepository.destroy();

console.log(JSON.stringify({
  ok: true,
  commits,
  finalRevision: finalProfile.revision,
  readbackRollbacks,
  headFailures,
  corruptions,
  boundedDataKeys: [...values.keys()].filter((key) => !key.endsWith('.lease')).length,
  diagnostics,
}));
