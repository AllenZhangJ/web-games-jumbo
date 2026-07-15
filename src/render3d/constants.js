export const RENDER3D_DESIGN = Object.freeze({
  width: 750,
  height: 1334,
});

export const RENDER3D_COLORS = Object.freeze({
  background: 0xd8dde2,
  floor: 0xd8dde2,
  ink: '#263238',
  muted: '#777d87',
  white: '#ffffff',
  red: 0xe53935,
  redDark: 0xb71c1c,
  redLight: 0xef6c68,
  accent: '#e53935',
  accentSoft: '#fff0ef',
  platform: 0xf6f7f8,
  platformSide: 0xdfe3e8,
  platformSelected: 0x16a6a1,
  platformHistory: 0xd9dde2,
  label: '#263238',
  cyan: '#16A6A1',
});

export const CAMERA_DEFAULTS = Object.freeze({
  viewHeight: 14.2,
  near: 0.1,
  far: 80,
  offset: Object.freeze({ x: 4.8, y: 10.8, z: -12.6 }),
  lookAhead: 1.55,
  transitionDurationSeconds: 0.52,
  transitionDelaySeconds: 0.08,
  reducedTransitionDurationSeconds: 0.12,
});

export const SHADOW_DEFAULTS = Object.freeze({
  mapSize: 1024,
  cameraExtent: 10,
});

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function dampFactor(deltaSeconds, speed) {
  const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const rate = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  return 1 - Math.exp(-delta * rate);
}

export function easeOutBack(value) {
  const x = clamp(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * ((x - 1) ** 3) + c1 * ((x - 1) ** 2);
}

export function easeOutCubic(value) {
  return 1 - ((1 - clamp(value)) ** 3);
}

export function easeInOutCubic(value) {
  const x = clamp(value);
  return x < 0.5 ? 4 * (x ** 3) : 1 - (((-2 * x) + 2) ** 3) / 2;
}

export function hashString(value) {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
