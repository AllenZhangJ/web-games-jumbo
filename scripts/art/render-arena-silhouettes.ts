import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  AnimationMixer,
  Group,
  Mesh,
  OrthographicCamera,
  SkinnedMesh,
  Vector3,
} from 'three';
import type { AnimationClip, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createLocalFollowArenaCamera } from '../../packages/arena-presentation-three/src/arena-camera.js';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_ROOT = 'docs/quality/art/silhouette';
const MANIFEST_PATH = `${OUTPUT_ROOT}/arena-a0.3-silhouette-render-manifest-v1.json`;
const DATE = '2026-07-28';
const BASELINE = '5d26a4f52a0be61226130ce883e91f981b1cfec8';
const BACKGROUND = 128;
const POSE_SAMPLE_MAX_SECONDS = 0.35;
const WORLD_BOUNDS = Object.freeze({ minX: -24, maxX: 24, minZ: -24, maxZ: 24 });
const CAMERA_SOURCE = 'packages/arena-presentation-three/src/arena-camera.ts';
const DIRECTION_SOURCE = 'packages/arena-presentation-runtime/src/six-sector-direction-resolver.ts';
const PRESENTATION_SOURCE = 'packages/arena-v1-presentation-content/src/arena-gameplay-v2-character-content.ts';
const FORMAL_BUNDLE = 'governance/formal-assets/arena-stage7-formal-assets-v1.json';
const SHIELD_PATH = 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb';

type CharacterSpec = Readonly<{
  id: 'parkour-apprentice' | 'wind-up-cube';
  assetId: string;
  presentationId: string;
  glb: string;
  include: (name: string) => boolean;
}>;
type DirectionSpec = Readonly<{ id: string; yawRadians: number; sector: number }>;
type ViewportSpec = Readonly<{ id: string; cssWidth: number; cssHeight: number; pixelRatio: number; width: number; height: number }>;
type Triangle = Readonly<{ depth: number; points: readonly [number, number, number, number, number, number] }>;
type LoadedCharacter = Readonly<{ spec: CharacterSpec; root: Group; idleClip: AnimationClip; shieldClip: AnimationClip; idleClipHash: string; shieldClipHash: string; skeletonHash: string; clipNames: readonly string[] }>;

const CHARACTERS: readonly CharacterSpec[] = [
  {
    id: 'parkour-apprentice',
    assetId: 'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
    presentationId: 'arena.character-presentation.parkour-apprentice.kaykit-rogue.v1',
    glb: 'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
    include: (name) => name.startsWith('Rogue_'),
  },
  {
    id: 'wind-up-cube',
    assetId: 'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
    presentationId: 'arena.character-presentation.wind-up-cube.kaykit-skeleton-warrior.v1',
    glb: 'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
    include: () => true,
  },
];
const DIRECTIONS: readonly DirectionSpec[] = [
  { id: 'front', sector: 0, yawRadians: 0 },
  { id: 'front-right', sector: 1, yawRadians: -Math.PI / 3 },
  { id: 'back-right', sector: 2, yawRadians: -Math.PI * 2 / 3 },
  { id: 'back', sector: 3, yawRadians: Math.PI },
  { id: 'back-left', sector: 4, yawRadians: Math.PI * 2 / 3 },
  { id: 'front-left', sector: 5, yawRadians: Math.PI / 3 },
];
const DISTANCES = [0, 5, 12] as const;
const VIEWPORTS: readonly ViewportSpec[] = [
  { id: '390x844@2x', cssWidth: 390, cssHeight: 844, pixelRatio: 2, width: 780, height: 1688 },
  { id: '1280x720@1x', cssWidth: 1280, cssHeight: 720, pixelRatio: 1, width: 1280, height: 720 },
];
const EQUIPMENT = ['unarmed', 'shield'] as const;

function sha256Bytes(value: Buffer | string): string { return createHash('sha256').update(value).digest('hex'); }
function sha256File(path: string): string { return sha256Bytes(readFileSync(resolve(ROOT, path))); }
function artifact(path: string, width: number, height: number): Readonly<Record<string, unknown>> {
  return { path, byteLength: statSync(resolve(ROOT, path)).size, sha256: sha256File(path), width, height, colorSpace: 'srgb', transparent: false };
}
function stripTextureReferences(path: string): ArrayBuffer {
  const source = readFileSync(resolve(ROOT, path));
  const chunks: Array<{ type: number; data: Buffer }> = [];
  let offset = 12;
  while (offset < source.length) {
    const length = source.readUInt32LE(offset);
    chunks.push({ type: source.readUInt32LE(offset + 4), data: source.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  const json = JSON.parse(chunks[0]!.data.toString('utf8')) as { images?: unknown; textures?: unknown; samplers?: unknown; materials?: Array<Record<string, unknown> & { pbrMetallicRoughness?: Record<string, unknown> }> };
  delete json.images; delete json.textures; delete json.samplers;
  for (const material of json.materials ?? []) {
    delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
    if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
  }
  let jsonBytes = Buffer.from(JSON.stringify(json));
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 0x20)]);
  const length = 12 + chunks.reduce((sum, chunk, index) => sum + 8 + (index === 0 ? jsonBytes.length : chunk.data.length), 0);
  const output = Buffer.alloc(length);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(length, 8);
  let cursor = 12;
  chunks.forEach((chunk, index) => {
    const data = index === 0 ? jsonBytes : chunk.data;
    output.writeUInt32LE(data.length, cursor); output.writeUInt32LE(chunk.type, cursor + 4); data.copy(output, cursor + 8); cursor += 8 + data.length;
  });
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}
function clipIdentity(clip: AnimationClip): string {
  const payload = JSON.stringify({ name: clip.name, duration: clip.duration, tracks: clip.tracks.map((track) => ({ name: track.name, times: [...track.times], values: [...track.values] })) });
  return sha256Bytes(payload);
}
function skeletonIdentity(root: Object3D): string {
  const bones: string[] = [];
  root.traverse((object) => { if (object.type === 'Bone') bones.push(object.name); });
  return sha256Bytes(JSON.stringify(bones.sort()));
}
function requireNode(root: Object3D, names: readonly string[], label: string): Object3D {
  for (const name of names) { const found = root.getObjectByName(name); if (found) return found; }
  throw new Error(`${label} missing; fallback attachment is forbidden`);
}
async function parse(path: string): Promise<Awaited<ReturnType<GLTFLoader['parseAsync']>>> {
  globalThis.ProgressEvent ??= class ProgressEvent { readonly type: string; constructor(type: string) { this.type = type; } } as typeof globalThis.ProgressEvent;
  return new GLTFLoader().parseAsync(stripTextureReferences(path), '');
}
async function loadCharacter(spec: CharacterSpec): Promise<LoadedCharacter> {
  const gltf = await parse(spec.glb);
  const idleClip = gltf.animations.find((candidate) => candidate.name === 'Idle');
  const shieldClip = gltf.animations.find((candidate) => candidate.name === 'Blocking');
  if (!idleClip || !shieldClip) throw new Error(`${spec.id} formal Idle/Blocking clip missing`);
  const root = new Group(); root.name = `A0.3:${spec.id}`;
  gltf.scene.scale.setScalar(0.8); gltf.scene.position.y = -1;
  root.add(gltf.scene);
  root.updateMatrixWorld(true);
  return { spec, root, idleClip, shieldClip, idleClipHash: clipIdentity(idleClip), shieldClipHash: clipIdentity(shieldClip), skeletonHash: skeletonIdentity(gltf.scene), clipNames: gltf.animations.map((item) => item.name).sort() };
}
async function withEquipment(base: LoadedCharacter, equipment: typeof EQUIPMENT[number], shieldScene: Object3D): Promise<Group> {
  // Object3D.clone() leaves SkinnedMesh skeletons bound to the source hierarchy.
  // SkeletonUtils.clone() remaps every cloned skinned mesh to the cloned bones,
  // matching the production GltfCharacterView path and preventing detached parts.
  const root = cloneSkeleton(base.root) as Group;
  const clip = equipment === 'shield' ? base.shieldClip : base.idleClip;
  const mixer = new AnimationMixer(root);
  mixer.clipAction(clip).reset().play();
  mixer.setTime(Math.min(POSE_SAMPLE_MAX_SECONDS, clip.duration * 0.25));
  if (equipment === 'shield') {
    const slot = requireNode(root, ['handslot.l', 'handslot_l', 'handslotl'], `${base.spec.id} handslot.l`);
    const shield = shieldScene.clone(true); shield.name = 'ArenaHeldEquipment:A0.3:shield';
    shield.position.set(0, 0, 0); shield.rotation.set(0, 0, 0); shield.scale.setScalar(1); slot.add(shield);
  }
  root.updateMatrixWorld(true);
  return root;
}
function posedPosition(mesh: Object3D, index: number, position: Vector3): Vector3 {
  const output = position.clone();
  if (mesh instanceof SkinnedMesh) mesh.applyBoneTransform(index, output);
  return output.applyMatrix4(mesh.matrixWorld);
}
function cameraFor(viewport: ViewportSpec): OrthographicCamera {
  const model = createLocalFollowArenaCamera({ viewport: { width: viewport.cssWidth, height: viewport.cssHeight, pixelRatio: viewport.pixelRatio, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } }, worldBounds: WORLD_BOUNDS, target: { x: 0, z: 0 } });
  const camera = new OrthographicCamera(model.frustum.left, model.frustum.right, model.frustum.top, model.frustum.bottom, model.near, model.far);
  camera.position.set(-model.position.x, model.position.y, model.position.z); camera.lookAt(-model.target.x, model.target.y, model.target.z); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  // Keep the production span, target, orientation and subject scale. Shift the
  // shared evidence layout once so the whole fixed 0..12m screen-up corridor is
  // centered; this is not per-asset or per-distance adaptive framing.
  const corridorMidpoint = new Vector3(0, 0, -DISTANCES.at(-1)! / 2);
  const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const layoutShift = corridorMidpoint.dot(cameraUp);
  camera.top += layoutShift; camera.bottom += layoutShift; camera.updateProjectionMatrix();
  return camera;
}
function renderSvg(root: Group, spec: CharacterSpec, direction: DirectionSpec, distance: number, viewport: ViewportSpec): Buffer {
  // The ground-plane projection of the production camera's screen-up basis is -Z.
  root.rotation.set(0, direction.yawRadians, 0); root.position.set(0, 0, -distance); root.updateMatrixWorld(true);
  const camera = cameraFor(viewport);
  const triangles: Triangle[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!spec.include(object.name) && !object.name.includes('Shield') && !object.parent?.name.includes('HeldEquipment') && !object.parent?.parent?.name.includes('HeldEquipment')) return;
    const geometry = object.geometry;
    const position = geometry.getAttribute('position');
    if (!position) throw new Error(`${spec.id}.${object.name} has no position attribute`);
    const indices = geometry.index ? Array.from({ length: geometry.index.count }, (_, index) => geometry.index!.getX(index)) : Array.from({ length: position.count }, (_, index) => index);
    const projected: Vector3[] = [];
    for (let index = 0; index < position.count; index += 1) projected.push(posedPosition(object, index, new Vector3(position.getX(index), position.getY(index), position.getZ(index))).project(camera));
    for (let cursor = 0; cursor + 2 < indices.length; cursor += 3) {
      const a = projected[indices[cursor]!]!; const b = projected[indices[cursor + 1]!]!; const c = projected[indices[cursor + 2]!]!;
      triangles.push({ depth: (a.z + b.z + c.z) / 3, points: [(a.x + 1) * viewport.width / 2, (1 - a.y) * viewport.height / 2, (b.x + 1) * viewport.width / 2, (1 - b.y) * viewport.height / 2, (c.x + 1) * viewport.width / 2, (1 - c.y) * viewport.height / 2] });
    }
  });
  triangles.sort((left, right) => right.depth - left.depth);
  const polygons = triangles.map((triangle) => `<polygon points="${triangle.points.join(' ')}" fill="#000000"/>`).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}"><rect width="100%" height="100%" fill="#808080"/>${polygons}</svg>`);
}
async function writeBinaryMask(svg: Buffer, path: string, width: number, height: number): Promise<Readonly<{ blackPixelCount: number; coverageRatio: number; inFrame: boolean }>> {
  const { data } = await sharp(svg, { density: 72 }).resize(width, height, { fit: 'fill' }).flatten({ background: '#808080' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let blackPixelCount = 0;
  for (let offset = 0; offset < data.length; offset += 3) {
    const black = data[offset]! < 64;
    const value = black ? 0 : BACKGROUND;
    data[offset] = value; data[offset + 1] = value; data[offset + 2] = value;
    if (black) blackPixelCount += 1;
  }
  await sharp(data, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9 }).toFile(resolve(ROOT, path));
  return { blackPixelCount, coverageRatio: blackPixelCount / (width * height), inFrame: blackPixelCount > 0 };
}

mkdirSync(resolve(ROOT, OUTPUT_ROOT), { recursive: true });
const shieldGltf = await parse(SHIELD_PATH);
if (shieldGltf.animations.length !== 0) throw new Error('formal shield must not carry an unexpected animation clip');
const loaded = await Promise.all(CHARACTERS.map(loadCharacter));
const outputs: Array<Record<string, unknown>> = [];
for (const character of loaded) {
  const characterDir = `${OUTPUT_ROOT}/${character.spec.assetId}`; mkdirSync(resolve(ROOT, characterDir), { recursive: true });
  for (const equipment of EQUIPMENT) {
    const subject = await withEquipment(character, equipment, shieldGltf.scene);
    for (const direction of DIRECTIONS) for (const distance of DISTANCES) for (const viewport of VIEWPORTS) {
      const distanceId = `d${String(distance).padStart(2, '0')}`;
      const baseName = `${character.spec.assetId}__${equipment}__${direction.id}__${distanceId}__${viewport.id}`;
      const path = `${characterDir}/${baseName}.png`;
      const metrics = await writeBinaryMask(renderSvg(subject, character.spec, direction, distance, viewport), path, viewport.width, viewport.height);
      const thumbWidth = Math.round(viewport.width * 0.1); const thumbHeight = Math.round(viewport.height * 0.1);
      const thumbnailPath = `${characterDir}/${baseName}__blind-10pct.png`;
      await sharp(resolve(ROOT, path)).resize(thumbWidth, thumbHeight, { fit: 'fill', kernel: 'nearest' }).png({ compressionLevel: 9 }).toFile(resolve(ROOT, thumbnailPath));
      outputs.push({
        id: baseName, characterId: character.spec.id, assetId: character.spec.assetId, presentationId: character.spec.presentationId,
        equipmentState: equipment, equipmentAssetId: equipment === 'shield' ? 'arena.asset.attachment.shield.kaykit-round.v1' : null,
        direction: direction.id, sector: direction.sector, yawRadians: direction.yawRadians, distanceMeters: distance,
        viewport, artifact: artifact(path, viewport.width, viewport.height), thumbnail: artifact(thumbnailPath, thumbWidth, thumbHeight), ...metrics,
      });
    }
  }
}

const manifest = {
  schemaVersion: 1,
  id: 'arena.art.silhouette-render.a0.3.v1',
  status: 'render-evidence-ready',
  generatedAt: DATE,
  baselineCommit: BASELINE,
  generator: { path: 'scripts/art/render-arena-silhouettes.ts', sha256: sha256File('scripts/art/render-arena-silhouettes.ts'), renderer: 'deterministic-three-cpu-projection+sharp-binary-mask-v1' },
  authorities: [CAMERA_SOURCE, DIRECTION_SOURCE, PRESENTATION_SOURCE, FORMAL_BUNDLE].map((path) => ({ path, sha256: sha256File(path) })),
  camera: {
    factory: 'createLocalFollowArenaCamera', worldBounds: WORLD_BOUNDS, target: { x: 0, z: 0 }, placementBasis: 'ground-projected cameraBasis.screenUp (-Z)', background: '#808080', silhouette: '#000000',
    portraitVerticalSpan: 14, landscapeVerticalSpan: 12, positionHeight: 16, positionDepthOffset: 16, near: 0.1, far: 80,
    distancesMeters: DISTANCES, viewports: VIEWPORTS, lighting: 'disabled', shadows: false, postProcessing: false, hud: false,
  },
  direction: { ids: DIRECTIONS.map((item) => item.id), sectors: DIRECTIONS.map((item) => item.sector), frontAxis: 'positive-z', resolverResetPerSample: true },
  pose: { semanticByEquipment: { unarmed: 'idle', shield: 'blocking' }, sourceClipByEquipment: { unarmed: 'Idle', shield: 'Blocking' }, sampleRule: 'min(0.35s, clip.duration*0.25)', deterministic: true, reason: 'Idle preserves the neutral unarmed baseline; formal Blocking is used for shield because Idle collapses the held round-shield negative space. The shield remains attached to handslot.l with runtime zero transform.' },
  inputs: loaded.map((character) => ({
    characterId: character.spec.id, assetId: character.spec.assetId, presentationId: character.spec.presentationId,
    glb: artifact(character.spec.glb, 0, 0), clips: [
      { equipmentState: 'unarmed', clipName: character.idleClip.name, clipDuration: character.idleClip.duration, clipHash: character.idleClipHash },
      { equipmentState: 'shield', clipName: character.shieldClip.name, clipDuration: character.shieldClip.duration, clipHash: character.shieldClipHash },
    ],
    clipNames: character.clipNames, skeletonHash: character.skeletonHash, attachmentSlot: 'handslot.l', runtimeModelScale: 0.8, runtimeModelYOffset: -1,
  })),
  shield: { assetId: 'arena.asset.attachment.shield.kaykit-round.v1', glb: artifact(SHIELD_PATH, 0, 0), attachmentSlot: 'handslot.l', localPosition: [0, 0, 0], localRotation: [0, 0, 0], localScale: 1, runtimeContract: 'GltfCharacterView shield branch' },
  expected: { characterCount: 2, equipmentStateCount: 2, directionCount: 6, distanceCount: 3, viewportCount: 2, outputCount: 144, thumbnailCount: 144 },
  outputs,
  limitations: ['No hammer, chain, future character or programmatic fallback is present.', '390x844 evidence is a deterministic camera render, not a physical-device capture.', 'Human blind-test evidence is separate and currently absent.'],
};
writeFileSync(resolve(ROOT, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status, outputs: outputs.length, inFrame: outputs.filter((item) => item.inFrame).length, manifest: MANIFEST_PATH })}\n`);
