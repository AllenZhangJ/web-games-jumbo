import * as THREE from 'three';

export function disposeMaterial(material: any) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  const disposedMaterials = new Set<any>();
  const disposedTextures = new Set<THREE.Texture>();
  materials.forEach((entry: any) => {
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

export function disposeObject3D(root: any, { disposeTextures = false } = {}) {
  if (!root) return;
  const geometries = new Set<any>();
  const materials = new Set<any>();
  const textures = new Set<THREE.Texture>();
  root.traverse?.((object: any) => {
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
    objectMaterials.forEach((material: any) => {
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
