import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { prune, resample } from '@gltf-transform/functions';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_CLIPS = new Set([
  '2H_Melee_Attack_Chop',
  'Block_Attack',
  'Blocking',
  'Cheer',
  'Death_A',
  'Death_B',
  'Hit_A',
  'Hit_B',
  'Idle',
  'Jump_Full_Short',
  'Jump_Idle',
  'Jump_Land',
  'Jump_Start',
  'Running_A',
  'Throw',
  'Unarmed_Melee_Attack_Punch_A',
  'Unarmed_Pose',
  'Walking_A',
]);
const ASSETS = Object.freeze([
  Object.freeze({
    path: 'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
    textureFileName: 'rogue_texture.png',
    optimizeAnimations: true,
  }),
  Object.freeze({
    path: 'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
    textureFileName: 'skeleton_texture.png',
    optimizeAnimations: true,
  }),
  Object.freeze({
    path: 'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
    textureFileName: 'shield_texture.png',
    optimizeAnimations: false,
  }),
]);

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;

function paddedLength(length) {
  return Math.ceil(length / 4) * 4;
}

function remapBufferViewReferences(value, removedIndex, location = 'root') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => (
      remapBufferViewReferences(entry, removedIndex, `${location}[${index}]`)
    ));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'bufferView' && Number.isInteger(entry)) {
      if (entry === removedIndex) {
        throw new Error(`${location}.bufferView 仍引用即将移除的纹理 bufferView。`);
      }
      if (entry > removedIndex) value[key] = entry - 1;
      continue;
    }
    remapBufferViewReferences(entry, removedIndex, `${location}.${key}`);
  }
}

function externalizeSingleTexture(bytes, textureFileName, relativePath) {
  const source = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    source.readUInt32LE(0) !== GLB_MAGIC
    || source.readUInt32LE(4) !== GLB_VERSION
    || source.readUInt32LE(8) !== source.byteLength
  ) throw new Error(`${relativePath} 不是受支持的 GLB v2 文件。`);

  const jsonLength = source.readUInt32LE(12);
  if (source.readUInt32LE(16) !== GLB_JSON_CHUNK) {
    throw new Error(`${relativePath} 缺少首个 JSON chunk。`);
  }
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString('utf8'));
  const binChunkOffset = 20 + jsonLength;
  const binLength = source.readUInt32LE(binChunkOffset);
  if (source.readUInt32LE(binChunkOffset + 4) !== GLB_BIN_CHUNK) {
    throw new Error(`${relativePath} 缺少 BIN chunk。`);
  }
  const binStart = binChunkOffset + 8;
  if (binStart + binLength !== source.byteLength) {
    throw new Error(`${relativePath} 包含未知 GLB chunk，优化脚本拒绝静默丢弃。`);
  }
  if (!Array.isArray(json.images) || json.images.length !== 1) {
    throw new Error(`${relativePath} 必须恰好包含一张纹理。`);
  }

  const image = json.images[0];
  const removedIndex = image.bufferView;
  const imageView = json.bufferViews?.[removedIndex];
  if (!Number.isInteger(removedIndex) || !imageView || imageView.buffer !== 0) {
    throw new Error(`${relativePath} 的纹理不是内嵌于主 buffer。`);
  }
  if (image.mimeType !== 'image/png') {
    throw new Error(`${relativePath} 的纹理必须是 PNG，当前为 ${String(image.mimeType)}。`);
  }
  const imageOffset = imageView.byteOffset ?? 0;
  const imageEnd = imageOffset + imageView.byteLength;
  const trailingBytes = imageEnd <= binLength
    ? source.subarray(binStart + imageEnd, binStart + binLength)
    : null;
  if (
    trailingBytes === null
    || trailingBytes.byteLength > 15
    || trailingBytes.some((value) => value !== 0)
  ) {
    throw new Error(`${relativePath} 的纹理不是 BIN 尾部数据，无法安全裁剪。`);
  }
  for (const [index, view] of json.bufferViews.entries()) {
    if (index === removedIndex) continue;
    const end = (view.byteOffset ?? 0) + view.byteLength;
    if (end > imageOffset) {
      throw new Error(`${relativePath} 的 bufferView ${index} 与纹理尾部重叠。`);
    }
  }

  const textureBytes = Buffer.from(source.subarray(
    binStart + imageOffset,
    binStart + imageEnd,
  ));
  const binaryBytes = Buffer.from(source.subarray(binStart, binStart + imageOffset));
  json.images[0] = { ...image, uri: textureFileName };
  delete json.images[0].bufferView;
  delete json.images[0].mimeType;
  json.bufferViews.splice(removedIndex, 1);
  remapBufferViewReferences(json, removedIndex);
  json.buffers[0].byteLength = binaryBytes.byteLength;

  const encodedJson = Buffer.from(JSON.stringify(json));
  const jsonChunkLength = paddedLength(encodedJson.byteLength);
  const binChunkLength = paddedLength(binaryBytes.byteLength);
  const output = Buffer.alloc(12 + 8 + jsonChunkLength + 8 + binChunkLength);
  output.writeUInt32LE(GLB_MAGIC, 0);
  output.writeUInt32LE(GLB_VERSION, 4);
  output.writeUInt32LE(output.byteLength, 8);
  output.writeUInt32LE(jsonChunkLength, 12);
  output.writeUInt32LE(GLB_JSON_CHUNK, 16);
  output.fill(0x20, 20, 20 + jsonChunkLength);
  encodedJson.copy(output, 20);
  const outputBinOffset = 20 + jsonChunkLength;
  output.writeUInt32LE(binChunkLength, outputBinOffset);
  output.writeUInt32LE(GLB_BIN_CHUNK, outputBinOffset + 4);
  binaryBytes.copy(output, outputBinOffset + 8);
  return { modelBytes: output, textureBytes };
}

function requireRuntimeContract(document, relativePath) {
  const rootValue = document.getRoot();
  const clips = new Set(rootValue.listAnimations().map((animation) => animation.getName()));
  const nodes = new Set(rootValue.listNodes().map((node) => node.getName()));
  for (const name of REQUIRED_CLIPS) {
    if (!clips.has(name)) throw new Error(`${relativePath} 缺少运行时动作 ${name}。`);
  }
  for (const name of ['handslot.r', 'handslot.l']) {
    if (!nodes.has(name)) throw new Error(`${relativePath} 缺少武器插槽 ${name}。`);
  }
}

async function optimize({ path: relativePath, textureFileName, optimizeAnimations }) {
  const absolutePath = path.join(root, relativePath);
  const io = new NodeIO();
  const document = await io.read(absolutePath);
  if (optimizeAnimations) {
    requireRuntimeContract(document, relativePath);
    for (const animation of document.getRoot().listAnimations()) {
      if (!REQUIRED_CLIPS.has(animation.getName())) animation.dispose();
    }
    await document.transform(
      resample(),
      prune({ keepLeaves: true, keepAttributes: true, keepSolidTextures: true }),
    );
    requireRuntimeContract(document, relativePath);
  }
  const bytes = await io.writeBinary(document);
  const externalized = externalizeSingleTexture(bytes, textureFileName, relativePath);
  const temporaryPath = `${absolutePath}.optimized`;
  const texturePath = path.join(path.dirname(absolutePath), textureFileName);
  await writeFile(temporaryPath, externalized.modelBytes);
  await writeFile(texturePath, externalized.textureBytes);
  await rename(temporaryPath, absolutePath);
  const current = await readFile(absolutePath);
  return {
    path: relativePath,
    animationCount: document.getRoot().listAnimations().length,
    byteLength: current.byteLength,
    texturePath: path.relative(root, texturePath),
    textureByteLength: externalized.textureBytes.byteLength,
  };
}

const results = [];
for (const asset of ASSETS) results.push(await optimize(asset));
console.log(JSON.stringify({ status: 'optimized', results }, null, 2));
