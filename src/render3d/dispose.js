import * as THREE from 'three';

export function disposeMaterial(material) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  const disposedMaterials = new Set();
  const disposedTextures = new Set();
  materials.forEach((entry) => {
    if (!entry || disposedMaterials.has(entry)) return;
    disposedMaterials.add(entry);
    Object.values(entry).forEach((value) => {
      if (!(value instanceof THREE.Texture) || disposedTextures.has(value)) return;
      disposedTextures.add(value);
      try {
        value.dispose();
      } catch {
        // Continue releasing the remaining material graph.
      }
    });
    try {
      entry.dispose?.();
    } catch {
      // Cleanup is best-effort and should release all siblings.
    }
  });
}

export function disposeObject3D(root, { disposeTextures = false } = {}) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse?.((object) => {
    if (object.geometry && !geometries.has(object.geometry)) {
      geometries.add(object.geometry);
      try {
        object.geometry.dispose?.();
      } catch {
        // Continue traversing shared resources.
      }
    }
    if (!object.material) return;
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => {
      if (!material || materials.has(material)) return;
      materials.add(material);
      if (disposeTextures) {
        Object.values(material).forEach((value) => {
          if (!(value instanceof THREE.Texture) || textures.has(value)) return;
          textures.add(value);
          try {
            value.dispose();
          } catch {
            // A single texture must not block the rest of the graph.
          }
        });
      }
      try {
        material.dispose?.();
      } catch {
        // Continue traversing shared resources.
      }
    });
  });
  try {
    root.removeFromParent?.();
  } catch {
    // The parent may already be disposed.
  }
}
