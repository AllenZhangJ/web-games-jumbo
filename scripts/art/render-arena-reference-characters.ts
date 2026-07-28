import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  AnimationMixer,
  Box3,
  Color,
  Matrix4,
  Mesh,
  SkinnedMesh,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'docs/quality/art/reference-sources/project-character-renders');
const WIDTH = 960;
const HEIGHT = 960;
const VIEW_SIZE = 820;
const RENDERER_VERSION = 'arena-reference-software-renderer-v1';

type SourceAsset = Readonly<{
  glb: string;
  texture: string;
  include: (name: string) => boolean;
}>;

type TextureData = Readonly<{
  data: Buffer;
  width: number;
  height: number;
}>;

type RenderMesh = Readonly<{
  object: Object3D;
  positions: readonly Vector3[];
  indices: readonly number[];
  uvs: readonly Vector2[] | null;
}>;

type RenderSubject = Readonly<{
  id: string;
  asset: SourceAsset;
  meshes: readonly RenderMesh[];
  texture: TextureData;
  bounds: Box3;
}>;

type ViewSpec = Readonly<{
  id: string;
  label: string;
  yawDegrees: number;
  subjects: readonly RenderSubject[];
}>;

type OutputSpec = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  fileName: string;
  views: readonly ViewSpec[];
}>;

type Triangle = Readonly<{
  depth: number;
  points: readonly [number, number, number, number, number, number];
  fill: string;
}>;

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function stripTextureReferences(glbPath: string): ArrayBuffer {
  const source = readFileSync(resolve(ROOT, glbPath));
  const chunks: Array<{ type: number; data: Buffer }> = [];
  let offset = 12;
  while (offset < source.length) {
    const length = source.readUInt32LE(offset);
    chunks.push({ type: source.readUInt32LE(offset + 4), data: source.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const json = JSON.parse(chunks[0]!.data.toString('utf8')) as {
    images?: unknown;
    textures?: unknown;
    samplers?: unknown;
    materials?: Array<Record<string, unknown> & {
      pbrMetallicRoughness?: Record<string, unknown>;
    }>;
  };
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const material of json.materials ?? []) {
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  }
  let jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
  const outputLength = 12 + chunks.reduce((sum, chunk, index) => sum + 8 + (index === 0 ? jsonBytes.length : chunk.data.length), 0);
  const output = Buffer.alloc(outputLength);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(outputLength, 8);
  let writeOffset = 12;
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]!;
    const data = index === 0 ? jsonBytes : chunk.data;
    output.writeUInt32LE(data.length, writeOffset);
    output.writeUInt32LE(chunk.type, writeOffset + 4);
    data.copy(output, writeOffset + 8);
    writeOffset += 8 + data.length;
  }
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}

async function loadTexture(path: string): Promise<TextureData> {
  const result = await sharp(resolve(ROOT, path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: result.data, width: result.info.width, height: result.info.height };
}

function posedPosition(mesh: Object3D, index: number, position: Vector3): Vector3 {
  const output = position.clone();
  if (mesh instanceof SkinnedMesh) mesh.applyBoneTransform(index, output);
  return output.applyMatrix4(mesh.matrixWorld);
}

async function loadSubject(id: string, asset: SourceAsset): Promise<RenderSubject> {
  globalThis.ProgressEvent ??= class ProgressEvent {
    readonly type: string;
    constructor(type: string) { this.type = type; }
  } as typeof globalThis.ProgressEvent;
  const gltf = await new GLTFLoader().parseAsync(stripTextureReferences(asset.glb), '');
  const idle = gltf.animations.find((clip) => clip.name === 'Idle' || clip.name === 'Unarmed_Pose');
  if (idle) {
    const mixer = new AnimationMixer(gltf.scene);
    mixer.clipAction(idle).play();
    mixer.update(Math.min(0.35, idle.duration * 0.25));
  }
  gltf.scene.updateMatrixWorld(true);
  const meshes: RenderMesh[] = [];
  const bounds = new Box3();
  gltf.scene.traverse((object) => {
    if (!(object instanceof Mesh) || !asset.include(object.name)) return;
    const geometry = object.geometry;
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const positions: Vector3[] = [];
    const uvs: Vector2[] = [];
    for (let index = 0; index < position.count; index += 1) {
      const point = posedPosition(object, index, new Vector3(position.getX(index), position.getY(index), position.getZ(index)));
      positions.push(point);
      bounds.expandByPoint(point);
      if (uv) uvs.push(new Vector2(uv.getX(index), uv.getY(index)));
    }
    const indices = geometry.index
      ? Array.from({ length: geometry.index.count }, (_, index) => geometry.index!.getX(index))
      : Array.from({ length: position.count }, (_, index) => index);
    meshes.push({ object, positions, indices, uvs: uv ? uvs : null });
  });
  if (bounds.isEmpty()) throw new Error(`${id} produced no renderable meshes`);
  return { id, asset, meshes, texture: await loadTexture(asset.texture), bounds };
}

function sampleTexture(texture: TextureData, uv: Vector2 | null): Color {
  if (!uv) return new Color('#8b93a6');
  const x = Math.max(0, Math.min(texture.width - 1, Math.round((((uv.x % 1) + 1) % 1) * (texture.width - 1))));
  const y = Math.max(0, Math.min(texture.height - 1, Math.round((1 - (((uv.y % 1) + 1) % 1)) * (texture.height - 1))));
  const offset = (y * texture.width + x) * 4;
  return new Color(texture.data[offset]! / 255, texture.data[offset + 1]! / 255, texture.data[offset + 2]! / 255);
}

function renderView(view: ViewSpec, panelX: number, panelWidth: number): string {
  const combined = new Box3();
  for (const subject of view.subjects) combined.union(subject.bounds);
  const center = combined.getCenter(new Vector3());
  const size = combined.getSize(new Vector3());
  const yaw = view.yawDegrees * Math.PI / 180;
  const rotation = new Matrix4().makeRotationY(yaw);
  const scale = Math.min((panelWidth - 52) / Math.max(size.x, size.z, 0.001), VIEW_SIZE / Math.max(size.y, 0.001));
  const floorY = 862;
  const project = (point: Vector3): Vector3 => {
    const local = point.clone().sub(center).applyMatrix4(rotation);
    return new Vector3(panelX + panelWidth / 2 + local.x * scale, floorY - (local.y + size.y / 2) * scale, local.z);
  };
  const triangles: Triangle[] = [];
  const light = new Vector3(-0.35, 0.8, 0.45).normalize();
  for (const subject of view.subjects) {
    for (const mesh of subject.meshes) {
      for (let cursor = 0; cursor + 2 < mesh.indices.length; cursor += 3) {
        const ia = mesh.indices[cursor]!;
        const ib = mesh.indices[cursor + 1]!;
        const ic = mesh.indices[cursor + 2]!;
        const aWorld = mesh.positions[ia]!;
        const bWorld = mesh.positions[ib]!;
        const cWorld = mesh.positions[ic]!;
        const a = project(aWorld);
        const b = project(bWorld);
        const c = project(cWorld);
        const normal = bWorld.clone().sub(aWorld).cross(cWorld.clone().sub(aWorld)).normalize().applyMatrix4(rotation).normalize();
        const uv = mesh.uvs
          ? mesh.uvs[ia]!.clone().add(mesh.uvs[ib]!).add(mesh.uvs[ic]!).multiplyScalar(1 / 3)
          : null;
        const base = sampleTexture(subject.texture, uv);
        const shade = 0.58 + Math.max(0, normal.dot(light)) * 0.42;
        const color = base.multiplyScalar(shade);
        triangles.push({
          depth: (a.z + b.z + c.z) / 3,
          points: [a.x, a.y, b.x, b.y, c.x, c.y],
          fill: `#${color.getHexString()}`,
        });
      }
    }
  }
  triangles.sort((a, b) => a.depth - b.depth);
  const polygons = triangles.map((triangle) => `<polygon points="${triangle.points.join(' ')}" fill="${triangle.fill}"/>`).join('');
  return `<g><ellipse cx="${panelX + panelWidth / 2}" cy="866" rx="${Math.min(170, panelWidth * 0.35)}" ry="18" fill="#172033" opacity="0.14"/>${polygons}<text x="${panelX + 24}" y="910" fill="#172033" font-family="Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(view.label)}</text></g>`;
}

function svgForOutput(spec: OutputSpec): string {
  const panelWidth = WIDTH / spec.views.length;
  const rendered = spec.views.map((view, index) => renderView(view, index * panelWidth, panelWidth)).join('');
  const dividers = spec.views.slice(1).map((_, index) => `<line x1="${(index + 1) * panelWidth}" y1="124" x2="${(index + 1) * panelWidth}" y2="926" stroke="#172033" opacity="0.14"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="960" height="960" fill="#F4EBDD"/>
  <rect width="960" height="12" fill="#35B8FF"/>
  <text x="32" y="58" fill="#172033" font-family="Arial, sans-serif" font-size="28" font-weight="800">${escapeXml(spec.title)}</text>
  <text x="32" y="92" fill="#273451" font-family="Arial, sans-serif" font-size="18">${escapeXml(spec.subtitle)}</text>
  <rect x="714" y="102" width="214" height="28" rx="14" fill="#FF5C5C" opacity="0.12"/>
  <text x="916" y="121" text-anchor="end" fill="#FF5C5C" font-family="Arial, sans-serif" font-size="13" font-weight="700">SOURCE REVIEW · NOT A0.3</text>
  ${dividers}${rendered}
  <text x="928" y="938" text-anchor="end" fill="#273451" font-family="Arial, sans-serif" font-size="13">fixed orthographic software render · sRGB PNG</text>
</svg>`;
}

function artifactRecord(path: string): Readonly<{ path: string; byteLength: number; sha256: string; width: number; height: number }> {
  const absolute = resolve(ROOT, path);
  return { path, byteLength: statSync(absolute).size, sha256: sha256(path), width: WIDTH, height: HEIGHT };
}

const rogueAsset: SourceAsset = {
  glb: 'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
  texture: 'public/assets/arena/characters/kaykit-adventurers/rogue_texture.png',
  include: (name) => name.startsWith('Rogue_'),
};
const skeletonAsset: SourceAsset = {
  glb: 'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
  texture: 'public/assets/arena/characters/kaykit-skeletons/skeleton_texture.png',
  include: () => true,
};
const shieldAsset: SourceAsset = {
  glb: 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
  texture: 'public/assets/arena/equipment/kaykit-adventurers/shield_texture.png',
  include: () => true,
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const rogue = await loadSubject('rogue', rogueAsset);
const skeleton = await loadSubject('skeleton', skeletonAsset);
const shield = await loadSubject('shield', shieldAsset);
const rogueCenter = rogue.bounds.getCenter(new Vector3());
const rogueSize = rogue.bounds.getSize(new Vector3());
const shieldCenter = shield.bounds.getCenter(new Vector3());
const shieldTarget = new Vector3(rogueCenter.x - rogueSize.x * 0.58, rogueCenter.y + rogueSize.y * 0.08, rogueCenter.z + rogueSize.z * 0.12);
const shieldOffset = shieldTarget.sub(shieldCenter);
for (const mesh of shield.meshes) for (const point of mesh.positions) point.add(shieldOffset);
shield.bounds.translate(shieldOffset);

const outputs: OutputSpec[] = [
  {
    id: 'character-b01',
    title: 'ROGUE · BODY MASS / NEGATIVE SPACE',
    subtitle: 'Formal KayKit CC0 GLB · front + side review views · not a silhouette pass',
    fileName: 'character-b01-rogue-front-side.png',
    views: [
      { id: 'front', label: 'FRONT · 0°', yawDegrees: 0, subjects: [rogue] },
      { id: 'side', label: 'SIDE · 90°', yawDegrees: 90, subjects: [rogue] },
    ],
  },
  {
    id: 'character-b02',
    title: 'CLOCKWORK WARRIOR · HEAD / SHOULDER READ',
    subtitle: 'Formal KayKit CC0 GLB · front + three-quarter review views · not a silhouette pass',
    fileName: 'character-b02-skeleton-front-three-quarter.png',
    views: [
      { id: 'front', label: 'FRONT · 0°', yawDegrees: 0, subjects: [skeleton] },
      { id: 'three-quarter', label: 'THREE-QUARTER · 35°', yawDegrees: 35, subjects: [skeleton] },
    ],
  },
  {
    id: 'character-b03',
    title: 'ROGUE + ROUND SHIELD · ATTACHMENT MASS',
    subtitle: 'Formal CC0 GLBs juxtaposed at hand side · display relation only, not runtime socket evidence',
    fileName: 'character-b03-rogue-round-shield-three-quarter.png',
    views: [
      { id: 'three-quarter-shield', label: 'THREE-QUARTER · 35° · SHIELD AT HAND SIDE', yawDegrees: 35, subjects: [rogue, shield] },
    ],
  },
];

for (const output of outputs) {
  const target = resolve(OUTPUT_DIR, output.fileName);
  await sharp(Buffer.from(svgForOutput(output))).png({ compressionLevel: 9, palette: true }).toFile(target);
}

const manifestPath = 'docs/quality/art/reference-sources/project-character-renders/character-render-manifest-v1.json';
const manifest = {
  schemaVersion: 1,
  id: 'arena.art.reference-character-renders.a0.2.1.v1',
  status: 'source-review-only',
  generatedAt: '2026-07-28',
  generator: {
    path: 'scripts/art/render-arena-reference-characters.ts',
    sha256: sha256('scripts/art/render-arena-reference-characters.ts'),
    version: RENDERER_VERSION,
    projection: 'orthographic',
    cameraViews: ['front-0deg', 'side-90deg', 'three-quarter-35deg'],
    pose: 'GLB Idle clip sampled at min(0.35s, 25% clip duration)',
    raster: `${WIDTH}x${HEIGHT} sRGB PNG via sharp`,
    lighting: 'software lambert, fixed vector (-0.35, 0.8, 0.45)',
    limitation: 'Source-quality visual review only; no gameplay camera, black silhouette, blind test, runtime attachment socket, device or Final claim.',
  },
  inputs: [rogueAsset, skeletonAsset, shieldAsset].map((asset) => ({
    glb: { path: asset.glb, byteLength: statSync(resolve(ROOT, asset.glb)).size, sha256: sha256(asset.glb) },
    texture: { path: asset.texture, byteLength: statSync(resolve(ROOT, asset.texture)).size, sha256: sha256(asset.texture) },
  })),
  outputs: outputs.map((output) => artifactRecord(`docs/quality/art/reference-sources/project-character-renders/${output.fileName}`)),
};
writeFileSync(resolve(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ status: 'generated', manifest: manifestPath, outputs: manifest.outputs })}\n`);
