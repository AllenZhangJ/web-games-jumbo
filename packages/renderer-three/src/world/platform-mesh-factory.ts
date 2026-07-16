import * as THREE from 'three';
import { hashString, RENDER3D_COLORS } from '../constants.js';
import { createTextureSprite } from '../resources/texture-manager.js';

interface PlatformLabelSlot {
  readonly sprite: THREE.Sprite;
  readonly operation: string;
  owner: any;
}

const BUILTIN_OPERATION_LABELS = Object.freeze([
  ...Array.from({ length: 9 }, (_, index) => `+${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `−${index + 1}`),
  '×2',
  '÷2',
  '÷3',
]);

function shadowMesh<T extends THREE.Mesh>(mesh: T): T {
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

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export class PlatformMeshFactory {
  [key: string]: any;
  constructor(textureManager: any) {
    this.textureManager = textureManager;
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32, 1, false);
    this.ringGeometry = new THREE.RingGeometry(0.96, 1, 48);
    this.labelTextures = new Map(BUILTIN_OPERATION_LABELS.map((operation) => [
      operation,
      this.textureManager.platformLabel({ operation }),
    ]));
    for (const texture of this.labelTextures.values()) {
      this.textureManager.pin?.(texture);
    }
    this.labelSlots = BUILTIN_OPERATION_LABELS.map((operation, index) => {
      const texture = this.labelTextures.get(operation);
      const sprite = createTextureSprite(texture, {
        color: texture ? 0xffffff : 0x263238,
        textureManager: this.textureManager,
      });
      sprite.name = `PlatformLabelPool:${index}`;
      sprite.visible = false;
      return {
        sprite,
        operation,
        owner: null,
      };
    }) as PlatformLabelSlot[];
  }

  prewarm(renderer: THREE.WebGLRenderer): void {
    if (typeof renderer.initTexture !== 'function') return;
    for (const texture of this.labelTextures.values()) {
      if (texture) renderer.initTexture(texture);
    }
  }

  create(platform: any) {
    const hash = hashString(platform.id);
    const kind = ['cube', 'cylinder', 'parcel'][hash % 3]!;
    const root = new THREE.Group();
    root.name = `PlatformView:${platform.id}`;
    root.userData.platformId = platform.id;
    root.userData.kind = kind;
    const bodyRoot = new THREE.Group();
    bodyRoot.name = 'PlatformBody';
    root.add(bodyRoot);

    const materials: THREE.Material[] = [];
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
      labelSlot: null,
      materials,
      kind,
      height,
      width,
      depth,
      labelKey: '',
      pendingLabelKey: '',
      pendingLabel: null,
      baseY: finite(platform.topY, 0) - height / 2,
    };
  }

  labelKey(platform: any, { selected = false } = {}): string {
    void selected;
    return platform?.role === 'candidate'
      ? `candidate:${platform.operation?.label ?? '—'}`
      : '';
  }

  hideLabel(view: any): void {
    if (view.label) view.label.visible = false;
  }

  showLabel(view: any): void {
    if (view.label) view.label.visible = true;
  }

  acquireLabelSlot(
    view: any,
    operation: string,
    texture: THREE.Texture | null,
  ): PlatformLabelSlot | null {
    if (view.labelSlot) return view.labelSlot;
    let slot = this.labelSlots.find((candidate: PlatformLabelSlot) => (
      candidate.operation === operation && candidate.owner == null
    )) ?? null;
    if (!slot) {
      const sprite = createTextureSprite(texture, {
        color: texture ? 0xffffff : 0x263238,
        textureManager: this.textureManager,
      });
      sprite.name = `PlatformLabelPool:${operation}`;
      sprite.visible = false;
      slot = { sprite, operation, owner: null };
      this.labelSlots.push(slot);
    }
    if (slot) {
      slot.owner = view;
      view.labelSlot = slot;
    }
    return slot;
  }

  releaseLabelSlot(view: any): void {
    const slot = view.labelSlot as PlatformLabelSlot | null;
    if (!slot) return;
    if (slot.owner === view) {
      slot.sprite.visible = false;
      slot.sprite.removeFromParent();
      slot.owner = null;
    }
    view.label = null;
    view.labelSlot = null;
  }

  updateLabel(view: any, platform: any, { selected = false } = {}) {
    const labelKey = this.labelKey(platform, { selected });
    if (labelKey === view.labelKey) return;
    this.releaseLabelSlot(view);
    view.labelKey = labelKey;
    view.pendingLabelKey = '';
    view.pendingLabel = null;
    if (!labelKey) return;

    const operation = platform.operation?.label ?? '—';
    let texture = this.labelTextures.get(operation);
    if (texture === undefined) {
      texture = this.textureManager.platformLabel({ operation });
      this.labelTextures.set(operation, texture);
      this.textureManager.pin?.(texture);
    }
    const slot = this.acquireLabelSlot(view, operation, texture);
    if (!slot) return;
    const sprite = slot.sprite;
    const material = sprite.material as THREE.SpriteMaterial;
    material.color.set(texture ? 0xffffff : selected ? 0x16a6a1 : 0x263238);
    sprite.name = 'PlatformLabel';
    sprite.position.y = view.height / 2 + 1.02;
    sprite.scale.set(2.35, 0.88, 1);
    sprite.userData.fallbackText = String(operation);
    sprite.visible = true;
    view.root.add(sprite);
    view.label = sprite;
  }

  disposeView(view: any) {
    this.releaseLabelSlot(view);
    view.materials.forEach((material: THREE.Material) => material.dispose());
    view.root.removeFromParent();
    view.root.clear();
  }

  dispose() {
    this.labelSlots.forEach((slot: PlatformLabelSlot) => {
      this.textureManager.release?.((slot.sprite.material as THREE.SpriteMaterial).map);
      slot.sprite.material.dispose();
      slot.sprite.removeFromParent();
    });
    for (const texture of this.labelTextures.values()) {
      this.textureManager.unpin?.(texture);
    }
    this.labelTextures.clear();
    this.boxGeometry.dispose();
    this.cylinderGeometry.dispose();
    this.ringGeometry.dispose();
  }
}
