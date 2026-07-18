import {
  ARENA_BUILD_MANIFEST_FILENAME,
  createArenaBuildManifest,
} from '../arena/presentation/acceptance/arena-build-manifest.js';

export async function loadCleanWebBuildIdentity(root = globalThis, {
  requiredArtifact,
  label = 'Web evidence workbench',
} = {}) {
  if (typeof requiredArtifact !== 'string' || requiredArtifact.length === 0) {
    throw new TypeError('requiredArtifact 必须是非空字符串。');
  }
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
    if (manifest.target !== 'web') throw new RangeError(`${label} 收到非 Web 构建 Manifest。`);
    if (manifest.getArtifact(requiredArtifact) === null) {
      throw new RangeError(`构建 Manifest 未覆盖 ${requiredArtifact}。`);
    }
    if (manifest.sourceDirty) {
      return Object.freeze({ collectable: false, reason: 'dirty-source-build', manifest });
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
