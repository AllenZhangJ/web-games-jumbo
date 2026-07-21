import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  assertMatchSeed,
  createFrozenMatchContentPool,
  type FrozenMatchContentPool,
} from './frozen-match-content-pool.js';
import {
  readOwnDataField,
  rejectAsyncSyncReturn,
  snapshotMethod,
  type ContentPoolResolverPort,
  type ProfileSnapshotPort,
} from './ports.js';

const CONSTRUCTOR_KEYS = new Set(['profileService', 'resolver']);
const RESOLVE_KEYS = new Set(['matchSeed']);

export class ProfileContentPoolProvider {
  readonly #getProfileSnapshot: ProfileSnapshotPort['getSnapshot'];
  readonly #resolveContentPool: ContentPoolResolverPort['resolve'];
  #resolving = false;

  constructor(value: unknown) {
    assertKnownKeys(value, CONSTRUCTOR_KEYS, 'ProfileContentPoolProvider options');
    const options = assertPlainRecord(value, 'ProfileContentPoolProvider options');
    this.#getProfileSnapshot = snapshotMethod<ProfileSnapshotPort['getSnapshot']>(
      readOwnDataField(options, 'profileService', 'ProfileContentPoolProvider options'),
      'getSnapshot',
      'ProfileService',
    );
    this.#resolveContentPool = snapshotMethod<ContentPoolResolverPort['resolve']>(
      readOwnDataField(options, 'resolver', 'ProfileContentPoolProvider options'),
      'resolve',
      'ContentPoolResolver',
    );
    Object.freeze(this);
  }

  resolve(value: unknown): FrozenMatchContentPool {
    if (this.#resolving) throw new Error('ProfileContentPoolProvider 不允许重入 resolve()。');
    assertKnownKeys(value, RESOLVE_KEYS, 'ProfileContentPoolProvider resolve options');
    const options = assertPlainRecord(value, 'ProfileContentPoolProvider resolve options');
    const matchSeed = assertMatchSeed(readOwnDataField(
      options,
      'matchSeed',
      'ProfileContentPoolProvider resolve options',
    ));
    this.#resolving = true;
    try {
      const profile = this.#getProfileSnapshot();
      rejectAsyncSyncReturn(profile, 'ProfileService.getSnapshot()');
      const result = this.#resolveContentPool({ profile, matchSeed });
      rejectAsyncSyncReturn(result, 'ContentPoolResolver.resolve()');
      const normalized = createFrozenMatchContentPool(result);
      if (normalized.matchSeed !== matchSeed) {
        throw new RangeError('ContentPoolResolver 返回的 matchSeed 与请求不一致。');
      }
      if (normalized.sourceProfileRevision !== profile.revision) {
        throw new RangeError('ContentPoolResolver 返回的 Profile revision 与快照不一致。');
      }
      return normalized;
    } finally {
      this.#resolving = false;
    }
  }
}
