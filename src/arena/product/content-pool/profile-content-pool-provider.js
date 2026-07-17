function validateProfileService(value) {
  if (!value || typeof value.getSnapshot !== 'function') {
    throw new TypeError('ProfileContentPoolProvider 需要 ProfileService.getSnapshot()。');
  }
  return value;
}

function validateResolver(value) {
  if (!value || typeof value.resolve !== 'function') {
    throw new TypeError('ProfileContentPoolProvider 需要 ContentPoolResolver.resolve()。');
  }
  return value;
}

export class ProfileContentPoolProvider {
  #profileService;
  #resolver;

  constructor({ profileService, resolver }) {
    this.#profileService = validateProfileService(profileService);
    this.#resolver = validateResolver(resolver);
    Object.freeze(this);
  }

  resolve({ matchSeed }) {
    return this.#resolver.resolve({
      profile: this.#profileService.getSnapshot(),
      matchSeed,
    });
  }
}
