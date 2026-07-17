import * as THREE from 'three';

export function disposeThreeObject(root, { removeFromParent = true } = {}) {
  if (!root) return Object.freeze({ geometries: 0, materials: 0, textures: 0 });
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse?.((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const entries = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of entries) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  const errors = [];
  for (const resource of [...textures, ...materials, ...geometries]) {
    try { resource.dispose?.(); } catch (error) { errors.push(error); }
  }
  if (removeFromParent) {
    try { root.removeFromParent?.(); } catch (error) { errors.push(error); }
  }
  if (errors.length > 0) {
    const failure = new Error('Three.js 资源清理未完整完成。');
    failure.causes = errors;
    throw failure;
  }
  return Object.freeze({
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
  });
}
