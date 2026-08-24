import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {
  Document,
  NodeIO,
  type Material,
  type Mesh,
} from '@gltf-transform/core';
const OUTPUT_DIRECTORY = path.join('public', 'assets', 'arena', 'maps', 'authored-candidates');

const UNIT_CUBE_POSITIONS = new Float32Array([
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
]);
const UNIT_CUBE_NORMALS = new Float32Array([
  0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
  1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
  -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
]);
const UNIT_CUBE_INDICES = new Uint16Array([
  0, 1, 2, 0, 2, 3,
  4, 5, 6, 4, 6, 7,
  8, 9, 10, 8, 10, 11,
  12, 13, 14, 12, 14, 15,
  16, 17, 18, 16, 18, 19,
  20, 21, 22, 20, 22, 23,
]);

type Surface = Readonly<{
  readonly id: string;
  readonly center: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly halfExtents: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
}>;
type RouteSegmentKind = 'basic-platform' | 'gap' | 'stairs' | 'maze' | 'narrow-path' | 'wire';
type RouteSegment = Readonly<{
  readonly id: string;
  readonly kind: RouteSegmentKind;
  readonly surfaceIds: readonly string[];
  readonly entryAnchorId: string;
}>;
type MapContent = Readonly<{
  readonly mapDefinition: Readonly<{
    readonly id: string;
    readonly arena: Readonly<{ readonly surfaces: readonly Surface[] }>;
  }>;
  readonly routeDefinition: Readonly<{
    readonly finishAnchorId: string;
    readonly anchors: readonly Readonly<{
      readonly id: string;
      readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
    }>[];
    readonly segments: readonly RouteSegment[];
  }>;
}>;

function unwrapFreeze(value: ts.Expression): ts.Expression {
  if (
    ts.isCallExpression(value)
    && ts.isPropertyAccessExpression(value.expression)
    && value.expression.expression.getText() === 'Object'
    && value.expression.name.text === 'freeze'
    && value.arguments.length === 1
  ) return value.arguments[0]!;
  return value;
}

function numericLiteral(value: ts.Expression, name: string): number {
  if (ts.isNumericLiteral(value)) return Number(value.text);
  if (
    ts.isPrefixUnaryExpression(value)
    && value.operator === ts.SyntaxKind.MinusToken
    && ts.isNumericLiteral(value.operand)
  ) return -Number(value.operand.text);
  throw new TypeError(`${name}必须是数字字面量。`);
}

function vectorLiteral(value: ts.Expression, name: string): Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}> {
  if (!ts.isObjectLiteralExpression(value)) throw new TypeError(`${name}必须是对象字面量。`);
  const coordinates = new Map<string, number>();
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property)) throw new TypeError(`${name}字段必须是赋值。`);
    const key = property.name.getText().replaceAll(/["']/g, '');
    if (key !== 'x' && key !== 'y' && key !== 'z') throw new RangeError(`${name}.${key}无效。`);
    coordinates.set(key, numericLiteral(property.initializer, `${name}.${key}`));
  }
  if (coordinates.size !== 3) throw new RangeError(`${name}必须精确包含x/y/z。`);
  return Object.freeze({
    x: coordinates.get('x')!,
    y: coordinates.get('y')!,
    z: coordinates.get('z')!,
  });
}

function requireArrayDeclaration(source: ts.SourceFile, name: string): ts.ArrayLiteralExpression {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name
        || declaration.initializer === undefined) continue;
      const initializer = unwrapFreeze(declaration.initializer);
      if (!ts.isArrayLiteralExpression(initializer)) {
        throw new TypeError(`${source.fileName}.${name}必须是数组字面量。`);
      }
      return initializer;
    }
  }
  throw new RangeError(`${source.fileName}缺少${name}。`);
}

function requireObjectProperty(
  value: ts.ObjectLiteralExpression,
  key: string,
  name: string,
): ts.Expression {
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (property.name.getText().replaceAll(/["']/g, '') === key) return property.initializer;
  }
  throw new RangeError(`${name}缺少${key}。`);
}

function requireCallObjectDeclaration(
  source: ts.SourceFile,
  name: string,
): ts.ObjectLiteralExpression {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name
        || declaration.initializer === undefined) continue;
      const initializer = unwrapFreeze(declaration.initializer);
      if (
        !ts.isCallExpression(initializer)
        || initializer.arguments.length !== 1
        || !ts.isObjectLiteralExpression(initializer.arguments[0]!)
      ) throw new TypeError(`${source.fileName}.${name}必须由单一对象参数创建。`);
      return initializer.arguments[0];
    }
  }
  throw new RangeError(`${source.fileName}缺少${name}。`);
}

function stringLiteral(value: ts.Expression, name: string): string {
  if (!ts.isStringLiteral(value)) throw new TypeError(`${name}必须是字符串字面量。`);
  return value.text;
}

function stringArray(value: ts.Expression, name: string): readonly string[] {
  const source = unwrapFreeze(value);
  if (!ts.isArrayLiteralExpression(source)) throw new TypeError(`${name}必须是数组字面量。`);
  return Object.freeze(source.elements.map((entry, index) => (
    stringLiteral(entry, `${name}[${index}]`)
  )));
}

function routeSegmentKind(value: ts.Expression, name: string): RouteSegmentKind {
  if (!ts.isPropertyAccessExpression(value)) throw new TypeError(`${name}必须引用段落类型常量。`);
  const byKey: Readonly<Record<string, RouteSegmentKind>> = Object.freeze({
    BASIC_PLATFORM: 'basic-platform',
    GAP: 'gap',
    STAIRS: 'stairs',
    MAZE: 'maze',
    NARROW_PATH: 'narrow-path',
    WIRE: 'wire',
  });
  const result = byKey[value.name.text];
  if (!result) throw new RangeError(`${name}引用未知段落类型${value.name.text}。`);
  return result;
}

async function readMapContent(value: Readonly<{
  readonly sourcePath: string;
  readonly mapDefinitionId: string;
  readonly routeDefinitionName: string;
  readonly finishAnchorId: string;
}>): Promise<MapContent> {
  const absolutePath = path.join(process.cwd(), value.sourcePath);
  const text = await readFile(absolutePath, 'utf8');
  const source = ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const surfaces = requireArrayDeclaration(source, 'SURFACES').elements.map((element, index) => {
    if (!ts.isCallExpression(element) || element.expression.getText(source) !== 'surface'
      || element.arguments.length !== 3 || !ts.isStringLiteral(element.arguments[0]!)) {
      throw new TypeError(`${value.sourcePath}.SURFACES[${index}]格式无效。`);
    }
    return Object.freeze({
      id: element.arguments[0].text,
      center: vectorLiteral(element.arguments[1]!, `SURFACES[${index}].center`),
      halfExtents: vectorLiteral(element.arguments[2]!, `SURFACES[${index}].halfExtents`),
    });
  });
  const anchors = requireArrayDeclaration(source, 'ANCHORS').elements.map((element, index) => {
    if (!ts.isCallExpression(element) || element.expression.getText(source) !== 'anchor'
      || element.arguments.length !== 5 || !ts.isStringLiteral(element.arguments[0]!)) {
      throw new TypeError(`${value.sourcePath}.ANCHORS[${index}]格式无效。`);
    }
    return Object.freeze({
      id: element.arguments[0].text,
      position: Object.freeze({
        x: numericLiteral(element.arguments[2]!, `ANCHORS[${index}].x`),
        y: numericLiteral(element.arguments[3]!, `ANCHORS[${index}].y`),
        z: numericLiteral(element.arguments[4]!, `ANCHORS[${index}].z`),
      }),
    });
  });
  const routeSource = requireCallObjectDeclaration(source, value.routeDefinitionName);
  const segmentSource = unwrapFreeze(requireObjectProperty(
    routeSource,
    'segments',
    `${value.sourcePath}.${value.routeDefinitionName}`,
  ));
  if (!ts.isArrayLiteralExpression(segmentSource)) {
    throw new TypeError(`${value.sourcePath}.${value.routeDefinitionName}.segments必须是数组。`);
  }
  const segments = segmentSource.elements.map((entry, index) => {
    if (!ts.isObjectLiteralExpression(entry)) {
      throw new TypeError(`${value.sourcePath}.segments[${index}]必须是对象。`);
    }
    return Object.freeze({
      id: stringLiteral(requireObjectProperty(entry, 'id', `segments[${index}]`), `segments[${index}].id`),
      kind: routeSegmentKind(
        requireObjectProperty(entry, 'kind', `segments[${index}]`),
        `segments[${index}].kind`,
      ),
      surfaceIds: stringArray(
        requireObjectProperty(entry, 'surfaceIds', `segments[${index}]`),
        `segments[${index}].surfaceIds`,
      ),
      entryAnchorId: stringLiteral(
        requireObjectProperty(entry, 'entryAnchorId', `segments[${index}]`),
        `segments[${index}].entryAnchorId`,
      ),
    });
  });
  if (surfaces.length === 0 || new Set(surfaces.map(({ id }) => id)).size !== surfaces.length) {
    throw new RangeError(`${value.sourcePath}的Surface必须非空且身份唯一。`);
  }
  if (!anchors.some(({ id }) => id === value.finishAnchorId)) {
    throw new RangeError(`${value.sourcePath}缺少终点${value.finishAnchorId}。`);
  }
  const ownedSurfaceIds = segments.flatMap(({ surfaceIds }) => surfaceIds);
  if (
    segments.length === 0
    || new Set(segments.map(({ id }) => id)).size !== segments.length
    || new Set(ownedSurfaceIds).size !== surfaces.length
    || surfaces.some(({ id }) => !ownedSurfaceIds.includes(id))
  ) throw new RangeError(`${value.sourcePath}的段落必须唯一并精确持有全部Surface。`);
  return Object.freeze({
    mapDefinition: Object.freeze({
      id: value.mapDefinitionId,
      arena: Object.freeze({ surfaces: Object.freeze(surfaces) }),
    }),
    routeDefinition: Object.freeze({
      finishAnchorId: value.finishAnchorId,
      anchors: Object.freeze(anchors),
      segments: Object.freeze(segments),
    }),
  });
}

function category(
  surfaceId: string,
  segmentKind: RouteSegmentKind,
): 'start' | 'finish' | 'wire' | 'stairs' | 'gap' | 'maze' | 'route' {
  if (surfaceId.includes('start')) return 'start';
  if (surfaceId.includes('finish')) return 'finish';
  if (segmentKind === 'wire' || segmentKind === 'narrow-path') return 'wire';
  if (segmentKind === 'stairs') return 'stairs';
  if (segmentKind === 'gap') return 'gap';
  if (segmentKind === 'maze') return 'maze';
  return 'route';
}

function material(
  document: Document,
  name: string,
  color: readonly [number, number, number, number],
  emissive: readonly [number, number, number],
): Material {
  return document.createMaterial(name)
    .setBaseColorFactor(color)
    .setMetallicFactor(0.05)
    .setRoughnessFactor(0.72)
    .setEmissiveFactor(emissive);
}

function cubeMesh(
  document: Document,
  buffer: ReturnType<Document['createBuffer']>,
  name: string,
  meshMaterial: Material,
): Mesh {
  const position = document.createAccessor(`${name}:position`)
    .setType('VEC3')
    .setArray(UNIT_CUBE_POSITIONS)
    .setBuffer(buffer);
  const normal = document.createAccessor(`${name}:normal`)
    .setType('VEC3')
    .setArray(UNIT_CUBE_NORMALS)
    .setBuffer(buffer);
  const indices = document.createAccessor(`${name}:indices`)
    .setType('SCALAR')
    .setArray(UNIT_CUBE_INDICES)
    .setBuffer(buffer);
  const primitive = document.createPrimitive()
    .setAttribute('POSITION', position)
    .setAttribute('NORMAL', normal)
    .setIndices(indices)
    .setMaterial(meshMaterial);
  return document.createMesh(name).addPrimitive(primitive);
}

function addBox(
  document: Document,
  scene: ReturnType<Document['createScene']>,
  mesh: Mesh,
  name: string,
  translation: readonly [number, number, number],
  scale: readonly [number, number, number],
  extras: Record<string, unknown>,
): void {
  scene.addChild(document.createNode(name)
    .setMesh(mesh)
    .setTranslation(translation)
    .setScale(scale)
    .setExtras(extras));
}

async function buildMapAsset(content: MapContent, outputPath: string): Promise<number> {
  const document = new Document();
  const buffer = document.createBuffer('arena-v2-authored-map-buffer');
  const scene = document.createScene(content.mapDefinition.id);
  const warm = content.mapDefinition.id.includes('switchback');
  const materials = Object.freeze({
    route: material(document, 'route-base', warm
      ? [0.31, 0.20, 0.24, 1] : [0.12, 0.25, 0.32, 1], warm
      ? [0.018, 0.007, 0.009] : [0.005, 0.012, 0.016]),
    start: material(document, 'start-base', warm
      ? [0.35, 0.32, 0.20, 1] : [0.12, 0.42, 0.38, 1], warm
      ? [0.04, 0.026, 0.006] : [0.01, 0.05, 0.04]),
    finish: material(document, 'finish-base', warm
      ? [0.72, 0.29, 0.15, 1] : [0.72, 0.24, 0.20, 1], [0.08, 0.015, 0.01]),
    wire: material(document, 'wire-base', warm
      ? [0.88, 0.55, 0.16, 1] : [0.86, 0.50, 0.13, 1], [0.06, 0.025, 0.002]),
    stairs: material(document, 'stairs-base', warm
      ? [0.43, 0.29, 0.37, 1] : [0.28, 0.38, 0.52, 1], [0.008, 0.012, 0.025]),
    gap: material(document, 'gap-base', warm
      ? [0.48, 0.20, 0.18, 1] : [0.34, 0.20, 0.28, 1], [0.035, 0.006, 0.008]),
    maze: material(document, 'maze-base', warm
      ? [0.36, 0.24, 0.44, 1] : [0.22, 0.31, 0.46, 1], [0.012, 0.008, 0.035]),
    cueBasic: material(document, 'cue-basic-platform', warm
      ? [0.94, 0.66, 0.32, 1] : [0.42, 0.88, 0.86, 1], [0.11, 0.05, 0.012]),
    cueGap: material(document, 'cue-gap', [0.96, 0.34, 0.26, 1], [0.18, 0.018, 0.008]),
    cueStairs: material(document, 'cue-stairs', warm
      ? [0.78, 0.48, 0.82, 1] : [0.46, 0.66, 0.96, 1], [0.035, 0.025, 0.12]),
    cueMaze: material(document, 'cue-maze', warm
      ? [0.96, 0.54, 0.34, 1] : [0.60, 0.48, 0.94, 1], [0.09, 0.025, 0.09]),
    cueNarrow: material(document, 'cue-narrow-path', [0.98, 0.72, 0.24, 1], [0.16, 0.07, 0.006]),
    cueWire: material(document, 'cue-wire', [0.98, 0.86, 0.38, 1], [0.18, 0.11, 0.008]),
    marker: material(document, 'route-marker', warm
      ? [0.98, 0.56, 0.24, 1] : [0.34, 0.86, 0.94, 1], [0.20, 0.09, 0.008]),
  });
  const meshes = Object.freeze({
    route: cubeMesh(document, buffer, 'route-cube', materials.route),
    start: cubeMesh(document, buffer, 'start-cube', materials.start),
    finish: cubeMesh(document, buffer, 'finish-cube', materials.finish),
    wire: cubeMesh(document, buffer, 'wire-cube', materials.wire),
    stairs: cubeMesh(document, buffer, 'stairs-cube', materials.stairs),
    gap: cubeMesh(document, buffer, 'gap-cube', materials.gap),
    maze: cubeMesh(document, buffer, 'maze-cube', materials.maze),
    cueBasic: cubeMesh(document, buffer, 'cue-basic-platform-cube', materials.cueBasic),
    cueGap: cubeMesh(document, buffer, 'cue-gap-cube', materials.cueGap),
    cueStairs: cubeMesh(document, buffer, 'cue-stairs-cube', materials.cueStairs),
    cueMaze: cubeMesh(document, buffer, 'cue-maze-cube', materials.cueMaze),
    cueNarrow: cubeMesh(document, buffer, 'cue-narrow-path-cube', materials.cueNarrow),
    cueWire: cubeMesh(document, buffer, 'cue-wire-cube', materials.cueWire),
    marker: cubeMesh(document, buffer, 'marker-cube', materials.marker),
  });

  const segmentBySurfaceId = new Map<string, RouteSegment>();
  for (const segment of content.routeDefinition.segments) {
    for (const surfaceId of segment.surfaceIds) segmentBySurfaceId.set(surfaceId, segment);
  }
  const cueMeshByKind: Readonly<Record<RouteSegmentKind, Mesh>> = Object.freeze({
    'basic-platform': meshes.cueBasic,
    gap: meshes.cueGap,
    stairs: meshes.cueStairs,
    maze: meshes.cueMaze,
    'narrow-path': meshes.cueNarrow,
    wire: meshes.cueWire,
  });

  for (const surface of content.mapDefinition.arena.surfaces) {
    const segment = segmentBySurfaceId.get(surface.id);
    if (!segment) throw new RangeError(`${surface.id}缺少段落视觉归属。`);
    const kind = category(surface.id, segment.kind);
    const visualX = -surface.center.x;
    addBox(
      document,
      scene,
      meshes[kind],
      `ArenaV2Surface:${surface.id}`,
      [visualX, surface.center.y, surface.center.z],
      [surface.halfExtents.x * 2, surface.halfExtents.y * 2, surface.halfExtents.z * 2],
      { surfaceId: surface.id, authorityX: surface.center.x, category: kind },
    );
    addBox(
      document,
      scene,
      cueMeshByKind[segment.kind],
      `ArenaV2TopCap:${surface.id}`,
      [visualX, surface.center.y + surface.halfExtents.y + 0.025, surface.center.z],
      [surface.halfExtents.x * 1.94, 0.05, surface.halfExtents.z * 1.94],
      {
        surfaceId: surface.id,
        segmentId: segment.id,
        segmentKind: segment.kind,
        presentationOnly: true,
      },
    );
  }

  const anchorById = new Map(content.routeDefinition.anchors.map((anchor) => [anchor.id, anchor]));
  for (const segment of content.routeDefinition.segments) {
    const entry = anchorById.get(segment.entryAnchorId);
    if (!entry) throw new RangeError(`${segment.id}缺少入口路标Anchor。`);
    addBox(
      document,
      scene,
      cueMeshByKind[segment.kind],
      `ArenaV2SegmentEntryCue:${segment.id}`,
      [-entry.position.x, entry.position.y + 0.04, entry.position.z],
      [0.56, 0.08, 0.56],
      {
        segmentId: segment.id,
        segmentKind: segment.kind,
        anchorId: segment.entryAnchorId,
        presentationOnly: true,
      },
    );
  }

  const finish = content.routeDefinition.anchors.find(({ id }) => (
    id === content.routeDefinition.finishAnchorId
  ));
  if (finish === undefined) throw new RangeError(`${content.mapDefinition.id}缺少终点Anchor。`);
  const finishX = -finish.position.x;
  const finishY = finish.position.y + 1.6;
  addBox(document, scene, meshes.marker, 'ArenaV2FinishGate:left',
    [finishX, finishY, finish.position.z - 1.2], [0.18, 3.2, 0.18],
    { anchorId: finish.id, presentationOnly: true });
  addBox(document, scene, meshes.marker, 'ArenaV2FinishGate:right',
    [finishX, finishY, finish.position.z + 1.2], [0.18, 3.2, 0.18],
    { anchorId: finish.id, presentationOnly: true });
  addBox(document, scene, meshes.marker, 'ArenaV2FinishGate:header',
    [finishX, finishY + 1.5, finish.position.z], [0.18, 0.18, 2.58],
    { anchorId: finish.id, presentationOnly: true });

  Object.assign(document.getRoot().getAsset(), {
    generator: 'Arena V2 authored KZ map asset builder candidate V2',
    copyright: 'Project-authored candidate; no third-party geometry copied',
  });
  const bytes = await new NodeIO().writeBinary(document);
  await writeFile(outputPath, bytes);
  return bytes.byteLength;
}

async function main(): Promise<void> {
  const outputRoot = path.join(process.cwd(), OUTPUT_DIRECTORY);
  await mkdir(outputRoot, { recursive: true });
  const inputs = Object.freeze([
    Object.freeze({
      name: 'kz-base',
      sourcePath: 'packages/arena-product-content/src/arena-v2-kz-base-map-candidate-v1.ts',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      routeDefinitionName: 'ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2',
      finishAnchorId: 'kz-a-finish',
    }),
    Object.freeze({
      name: 'kz-switchback',
      sourcePath: 'packages/arena-product-content/src/arena-v2-kz-switchback-map-candidate-v1.ts',
      mapDefinitionId: 'arena-v2-kz-switchback-map.candidate.v1',
      routeDefinitionName: 'ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2',
      finishAnchorId: 'ks-a-finish',
    }),
  ]);
  const results = [];
  for (const input of inputs) {
    const outputPath = path.join(outputRoot, `${input.name}.glb`);
    const content = await readMapContent(input);
    const byteLength = await buildMapAsset(content, outputPath);
    results.push(Object.freeze({
      mapDefinitionId: content.mapDefinition.id,
      outputPath: path.relative(process.cwd(), outputPath),
      byteLength,
    }));
  }
  process.stdout.write(`${JSON.stringify({
    status: 'built-project-authored-candidate-assets-not-validated',
    copiedThirdPartyGeometry: false,
    results,
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
