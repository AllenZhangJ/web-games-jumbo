import * as THREE from 'three';
import { RENDER3D_COLORS } from '../constants.js';

function roundedRectPath(
  context: any,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
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

export function createCanvasSurface(platform: any, width: number, height: number) {
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

type TexturePainter = (
  context: any,
  width: number,
  height: number,
  path: typeof roundedRectPath,
) => void;

export class DynamicCanvasTexture {
  readonly texture: THREE.CanvasTexture;
  readonly bytes: number;
  readonly #surface: NonNullable<ReturnType<typeof createCanvasSurface>>;
  readonly #onDispose: (resource: DynamicCanvasTexture) => void;
  #disposed = false;

  constructor(
    name: string,
    surface: NonNullable<ReturnType<typeof createCanvasSurface>>,
    onDispose: (resource: DynamicCanvasTexture) => void,
  ) {
    this.#surface = surface;
    this.#onDispose = onDispose;
    this.texture = new THREE.CanvasTexture(surface.canvas);
    this.texture.name = `ui-dynamic:${name}`;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.bytes = estimateTextureBytes(this.texture);
  }

  paint(painter: TexturePainter): boolean {
    if (this.#disposed) return false;
    const { context, canvas } = this.#surface;
    try {
      context.clearRect(0, 0, canvas.width, canvas.height);
      painter(context, canvas.width, canvas.height, roundedRectPath);
      this.texture.needsUpdate = true;
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.texture.dispose();
    this.#onDispose(this);
  }
}

export class TextureManager {
  [key: string]: any;
  constructor(platform: any, {
    maxEntries = 96,
    maxBytes = 24 * 1024 * 1024,
    maxDynamicBytes = 12 * 1024 * 1024,
  } = {}) {
    this.platform = platform;
    this.maxEntries = Math.max(1, Number.isFinite(maxEntries) ? Math.floor(maxEntries) : 96);
    this.maxBytes = Math.max(1, Number.isFinite(maxBytes) ? Math.floor(maxBytes) : 24 * 1024 * 1024);
    this.maxDynamicBytes = Math.max(
      1,
      Number.isFinite(maxDynamicBytes) ? Math.floor(maxDynamicBytes) : 12 * 1024 * 1024,
    );
    this.cache = new Map<string, THREE.Texture>();
    this.references = new Map<THREE.Texture, number>();
    this.pendingDisposal = new Set<THREE.Texture>();
    this.dynamicTextures = new Set<DynamicCanvasTexture>();
    this.fallbackCount = 0;
    this.createdTextures = 0;
    this.createdDynamicTextures = 0;
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

  get(key: string, width: number, height: number, painter: TexturePainter) {
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
      this.createdTextures += 1;
    } catch {
      this.fallbackCount += 1;
      return null;
    }
    this.cache.set(cacheKey, texture);
    this.evictOverflow();
    return texture;
  }

  createDynamic(key: string, width: number, height: number): DynamicCanvasTexture | null {
    if (this.disposed) return null;
    const requestedBytes = Math.max(0, Math.floor(width)) * Math.max(0, Math.floor(height)) * 4;
    const dynamicBytes = this.dynamicBytes();
    if (requestedBytes <= 0 || dynamicBytes + requestedBytes > this.maxDynamicBytes) {
      this.fallbackCount += 1;
      return null;
    }
    const surface = createCanvasSurface(this.platform, width, height);
    if (!surface) {
      this.fallbackCount += 1;
      return null;
    }
    const resource = new DynamicCanvasTexture(key, surface, (disposed) => {
      this.dynamicTextures.delete(disposed);
    });
    this.dynamicTextures.add(resource);
    this.createdDynamicTextures += 1;
    return resource;
  }

  platformLabel({ operation = '—', preview = '', selected = false, muted = false }: any) {
    const key = `platform:${operation}:${preview}:${selected ? 1 : 0}:${muted ? 1 : 0}`;
    return this.get(key, 512, 192, (context: any, width: number, height: number) => {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = muted ? '#858b94' : selected ? RENDER3D_COLORS.cyan : RENDER3D_COLORS.label;
      context.font = '800 112px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(String(operation), width / 2, height / 2 + 3);
    });
  }

  currentLabel(value: unknown) {
    return this.get(`current:${value}`, 320, 112, (context: any, width: number, height: number, path: typeof roundedRectPath) => {
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
    while (this.cache.size > this.maxEntries || this.cacheBytes() > this.maxBytes) {
      const oldest = this.cache.entries().next().value;
      if (!oldest) break;
      const [oldestKey, texture] = oldest;
      this.cache.delete(oldestKey);
      if ((this.references.get(texture) ?? 0) > 0) this.pendingDisposal.add(texture);
      else texture.dispose();
    }
  }

  cacheBytes(): number {
    return [...this.cache.values()].reduce(
      (total: number, texture: THREE.Texture) => total + estimateTextureBytes(texture),
      0,
    );
  }

  dynamicBytes(): number {
    return [...this.dynamicTextures].reduce(
      (total: number, resource: DynamicCanvasTexture) => total + resource.bytes,
      0,
    );
  }

  setBudgets({ maxBytes, maxDynamicBytes }: { maxBytes: number; maxDynamicBytes: number }) {
    this.maxBytes = Math.max(1, Math.floor(maxBytes));
    this.maxDynamicBytes = Math.max(1, Math.floor(maxDynamicBytes));
    this.evictOverflow();
    return this.stats();
  }

  acquire(texture: THREE.Texture | null | undefined) {
    if (!texture || this.disposed) return texture;
    this.references.set(texture, (this.references.get(texture) ?? 0) + 1);
    return texture;
  }

  release(texture: THREE.Texture | null | undefined) {
    if (!texture) return;
    const count = this.references.get(texture) ?? 0;
    if (count <= 1) {
      this.references.delete(texture);
      if (this.pendingDisposal.delete(texture)) texture.dispose();
      return;
    }
    this.references.set(texture, count - 1);
  }

  stats() {
    const cachedTextures = [...this.cache.values()];
    const cacheBytes = cachedTextures.reduce(
      (total: number, texture: THREE.Texture) => total + estimateTextureBytes(texture),
      0,
    );
    const pendingBytes = [...this.pendingDisposal].reduce(
      (total: number, texture: THREE.Texture) => total + estimateTextureBytes(texture),
      0,
    );
    const dynamicBytes = this.dynamicBytes();
    return Object.freeze({
      cacheEntries: this.cache.size,
      cacheBytes,
      pendingBytes,
      dynamicTextures: this.dynamicTextures.size,
      dynamicBytes,
      totalBytes: cacheBytes + pendingBytes + dynamicBytes,
      referencedTextures: this.references.size,
      pendingDisposals: this.pendingDisposal.size,
      fallbackCount: this.fallbackCount,
      createdTextures: this.createdTextures,
      createdDynamicTextures: this.createdDynamicTextures,
      maxEntries: this.maxEntries,
      maxBytes: this.maxBytes,
      maxDynamicBytes: this.maxDynamicBytes,
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    [...this.dynamicTextures].forEach((resource: DynamicCanvasTexture) => resource.dispose());
    const textures = new Set([...this.cache.values(), ...this.pendingDisposal]);
    textures.forEach((texture: THREE.Texture) => texture.dispose());
    this.cache.clear();
    this.pendingDisposal.clear();
    this.references.clear();
    this.dynamicTextures.clear();
  }
}

export function estimateTextureBytes(texture: THREE.Texture | null | undefined): number {
  const image = texture?.image as { width?: unknown; height?: unknown } | undefined;
  const width = Number(image?.width);
  const height = Number(image?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0;
  return Math.floor(width) * Math.floor(height) * 4;
}

export function createTextureSprite(texture: any, { color = 0xffffff, textureManager = null }: any = {}) {
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
