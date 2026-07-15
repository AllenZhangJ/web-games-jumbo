import * as THREE from 'three';
import { RENDER3D_COLORS } from './constants.js';

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

export function createCanvasSurface(platform, width, height) {
  if (typeof platform?.createOffscreenCanvas !== 'function') return null;
  let canvas = null;
  try {
    canvas = platform.createOffscreenCanvas(width, height);
  } catch {
    try {
      canvas = platform.createOffscreenCanvas({ width, height });
    } catch {
      return null;
    }
  }
  if (!canvas) return null;
  try {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext?.('2d');
    return context ? { canvas, context } : null;
  } catch {
    return null;
  }
}

export class TextureManager {
  [key: string]: any;
  constructor(platform, { maxEntries = 96 } = {}) {
    this.platform = platform;
    this.maxEntries = Math.max(1, Number.isFinite(maxEntries) ? Math.floor(maxEntries) : 96);
    this.cache = new Map();
    this.references = new Map();
    this.pendingDisposal = new Set();
    this.fallbackCount = 0;
    this.capability = null;
    this.disposed = false;
  }

  supportsTextTextures() {
    if (this.disposed) return false;
    if (this.capability != null) return this.capability;
    const surface = createCanvasSurface(this.platform, 8, 8);
    const requiredMethods = [
      'clearRect',
      'beginPath',
      'moveTo',
      'lineTo',
      'quadraticCurveTo',
      'closePath',
      'fill',
      'stroke',
      'fillText',
    ];
    this.capability = Boolean(
      surface?.context
      && requiredMethods.every((method) => typeof surface.context[method] === 'function'),
    );
    return this.capability;
  }

  get(key, width, height, painter) {
    if (this.disposed) return null;
    const cacheKey = `${key}@${width}x${height}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      return cached;
    }

    const surface = createCanvasSurface(this.platform, width, height);
    if (!surface) {
      this.fallbackCount += 1;
      return null;
    }
    const { canvas, context } = surface;
    let texture;
    try {
      context.clearRect(0, 0, width, height);
      painter(context, width, height, roundedRectPath);
      texture = new THREE.CanvasTexture(canvas);
      texture.name = `ui:${key}`;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    } catch {
      this.fallbackCount += 1;
      return null;
    }
    this.cache.set(cacheKey, texture);
    this.evictOverflow();
    return texture;
  }

  platformLabel({ operation = '—', preview = '', selected = false, muted = false }) {
    const key = `platform:${operation}:${preview}:${selected ? 1 : 0}:${muted ? 1 : 0}`;
    return this.get(key, 512, 192, (context, width, height) => {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = muted ? '#858b94' : selected ? RENDER3D_COLORS.cyan : RENDER3D_COLORS.label;
      context.font = '800 112px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(String(operation), width / 2, height / 2 + 3);
    });
  }

  currentLabel(value) {
    return this.get(`current:${value}`, 320, 112, (context, width, height, path) => {
      path(context, 7, 7, width - 14, height - 14, 36);
      context.fillStyle = 'rgba(255,255,255,0.94)';
      context.fill();
      context.strokeStyle = 'rgba(32,36,43,0.12)';
      context.lineWidth = 4;
      context.stroke();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#E53935';
      context.font = '800 54px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(`当前 ${value}`, width / 2, height / 2 + 2);
    });
  }

  evictOverflow() {
    while (this.cache.size > this.maxEntries) {
      const [oldestKey, texture] = this.cache.entries().next().value;
      this.cache.delete(oldestKey);
      if ((this.references.get(texture) ?? 0) > 0) this.pendingDisposal.add(texture);
      else texture.dispose();
    }
  }

  acquire(texture) {
    if (!texture || this.disposed) return texture;
    this.references.set(texture, (this.references.get(texture) ?? 0) + 1);
    return texture;
  }

  release(texture) {
    if (!texture) return;
    const count = this.references.get(texture) ?? 0;
    if (count <= 1) {
      this.references.delete(texture);
      if (this.pendingDisposal.delete(texture)) texture.dispose();
      return;
    }
    this.references.set(texture, count - 1);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const textures = new Set([...this.cache.values(), ...this.pendingDisposal]);
    textures.forEach((texture) => texture.dispose());
    this.cache.clear();
    this.pendingDisposal.clear();
    this.references.clear();
  }
}

export function createTextureSprite(texture, { color = 0xffffff, textureManager = null } = {}) {
  textureManager?.acquire?.(texture);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 20;
  sprite.userData.textureFallback = texture == null;
  sprite.userData.textureManager = textureManager;
  return sprite;
}
