import * as THREE from 'three';
import { hashString, RENDER3D_COLORS } from './constants.js';
import { createTextureSprite } from './texture-manager.js';

function shadowMesh(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** @param {number} [color] */
function platformMaterial(color: number = RENDER3D_COLORS.platform) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0,
    transparent: true,
  });
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export class PlatformMeshFactory {
  [key: string]: any;
  constructor(textureManager) {
    this.textureManager = textureManager;
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32, 1, false);
    this.ringGeometry = new THREE.RingGeometry(0.96, 1, 48);
  }

  create(platform) {
    const hash = hashString(platform.id);
    const kind = ['cube', 'cylinder', 'parcel'][hash % 3];
    const root = new THREE.Group();
    root.name = `PlatformView:${platform.id}`;
    root.userData.platformId = platform.id;
    root.userData.kind = kind;
    const bodyRoot = new THREE.Group();
    bodyRoot.name = 'PlatformBody';
    root.add(bodyRoot);

    const materials = [];
    const bodyMaterial = platformMaterial(kind === 'cube' ? 0x16a6a1 : RENDER3D_COLORS.platform);
    materials.push(bodyMaterial);
    const width = Math.max(0.1, finite(platform.halfWidth, 1.05) * 2);
    const depth = Math.max(0.1, finite(platform.halfDepth, 0.75) * 2);
    const height = Math.max(finite(platform.height, 0.34), 1.18);

    if (kind === 'cylinder') {
      const body = shadowMesh(new THREE.Mesh(this.cylinderGeometry, bodyMaterial));
      body.scale.set(width / 2, height, depth / 2);
      bodyRoot.add(body);
    } else {
      const body = shadowMesh(new THREE.Mesh(this.boxGeometry, bodyMaterial));
      body.scale.set(width, height, depth);
      bodyRoot.add(body);
      if (kind === 'parcel') {
        const bandMaterial = platformMaterial(0x16a6a1);
        materials.push(bandMaterial);
        const topBand = shadowMesh(new THREE.Mesh(this.boxGeometry, bandMaterial));
        topBand.scale.set(width * 0.19, height + 0.025, depth + 0.015);
        topBand.position.y = 0.016;
        const crossBand = shadowMesh(new THREE.Mesh(this.boxGeometry, bandMaterial));
        crossBand.scale.set(width + 0.015, height + 0.03, depth * 0.18);
        crossBand.position.y = 0.018;
        bodyRoot.add(topBand, crossBand);
      }
    }

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x16a6a1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    materials.push(ringMaterial);
    const selectionRing = new THREE.Mesh(this.ringGeometry, ringMaterial);
    selectionRing.name = 'SelectionRing';
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = height / 2 + 0.025;
    selectionRing.scale.set(width * 0.57, depth * 0.72, 1);
    selectionRing.renderOrder = 4;
    root.add(selectionRing);

    return {
      root,
      bodyRoot,
      bodyMaterial,
      selectionRing,
      ringMaterial,
      label: null,
      materials,
      kind,
      height,
      width,
      depth,
      labelKey: '',
      baseY: finite(platform.topY, 0) - height / 2,
    };
  }

  updateLabel(view, platform, { selected = false } = {}) {
    const isCandidate = platform.role === 'candidate';
    const labelKey = isCandidate
      ? `candidate:${platform.operation?.label ?? '—'}:${platform.preview ?? ''}:${selected}`
      : '';
    if (labelKey === view.labelKey) return;
    if (view.label) {
      this.textureManager.release?.(view.label.material?.map);
      view.label.material.dispose();
      view.label.removeFromParent();
      view.label = null;
    }
    view.labelKey = labelKey;
    if (!labelKey) return;

    const texture = this.textureManager.platformLabel({
      operation: platform.operation?.label ?? '—',
      preview: platform.preview ?? '—',
      selected,
    });
    const sprite = createTextureSprite(texture, {
      color: texture ? 0xffffff : selected ? 0x16a6a1 : 0x263238,
      textureManager: this.textureManager,
    });
    sprite.name = 'PlatformLabel';
    sprite.position.y = view.height / 2 + 1.02;
    sprite.scale.set(2.35, 0.88, 1);
    sprite.userData.fallbackText = `${platform.operation?.label ?? '—'} / ${platform.preview ?? '—'}`;
    view.root.add(sprite);
    view.label = sprite;
  }

  disposeView(view) {
    this.textureManager.release?.(view.label?.material?.map);
    view.label?.material?.dispose?.();
    view.materials.forEach((material) => material.dispose());
    view.root.removeFromParent();
    view.root.clear();
  }

  dispose() {
    this.boxGeometry.dispose();
    this.cylinderGeometry.dispose();
    this.ringGeometry.dispose();
  }
}
