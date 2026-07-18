import {
  ARENA_BUILD_MANIFEST_FILENAME,
  createArenaBuildManifest,
} from '../arena/presentation/acceptance/arena-build-manifest.js';

export async function loadHumanMatchStudyBuildIdentity(root = globalThis) {
  if (typeof root.fetch !== 'function') {
    return Object.freeze({
      collectable: false,
      reason: 'build-manifest-fetch-unavailable',
      manifest: null,
    });
  }
  try {
    const response = await root.fetch(`./${ARENA_BUILD_MANIFEST_FILENAME}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response?.ok) throw new Error(`HTTP ${String(response?.status)}`);
    const manifest = createArenaBuildManifest(await response.json());
    if (manifest.target !== 'web') {
      throw new RangeError('真人研究 Web 工作台收到非 Web 构建 Manifest。');
    }
    if (manifest.getArtifact('study.html') === null) {
      throw new RangeError('构建 Manifest 未覆盖 study.html。');
    }
    if (manifest.sourceDirty) {
      return Object.freeze({
        collectable: false,
        reason: 'dirty-source-build',
        manifest,
      });
    }
    return Object.freeze({ collectable: true, reason: null, manifest });
  } catch (error) {
    return Object.freeze({
      collectable: false,
      reason: 'build-manifest-invalid',
      manifest: null,
      error: Object.freeze({
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
      }),
    });
  }
}
