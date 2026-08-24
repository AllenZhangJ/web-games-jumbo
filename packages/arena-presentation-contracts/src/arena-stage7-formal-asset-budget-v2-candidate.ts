import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_SCHEMA_VERSION = 2 as const;
export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID =
  'arena.stage7.formal-asset-budget.v2-candidate' as const;

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2 = Object.freeze({
  AUDIO: 'audio',
  CHARACTER_MODEL: 'character-model',
  MAP_MODEL: 'map-model',
  MODEL_ATTACHMENT: 'model-attachment',
  TEXTURE: 'texture',
} as const);

export type ArenaStage7FormalAssetBudgetArtifactKindV2 =
  typeof ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2[
    keyof typeof ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2
  ];

export const ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2 = Object.freeze({
  GLB: 'glb',
  OGG: 'ogg',
  PNG: 'png',
} as const);

export type ArenaStage7FormalAssetEncodedMediaFormatV2 =
  typeof ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2[
    keyof typeof ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2
  ];

export const ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2 = Object.freeze({
  NOT_APPLICABLE: 'not-applicable',
  RGBA8: 'rgba8',
} as const);

export type ArenaStage7FormalAssetTextureDecodedFormatV2 =
  typeof ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2[
    keyof typeof ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2
  ];

export interface ArenaStage7FormalAssetBudgetArtifactV2Candidate {
  readonly id: string;
  readonly path: string;
  readonly kind: ArenaStage7FormalAssetBudgetArtifactKindV2;
  readonly encodedMediaFormat: ArenaStage7FormalAssetEncodedMediaFormatV2;
  readonly currentEncodedBytes: number;
  readonly maximumEncodedBytes: number;
  readonly decodedTextureBytes: number;
  readonly decodedTextureFormat: ArenaStage7FormalAssetTextureDecodedFormatV2;
  readonly widthPixels: number;
  readonly heightPixels: number;
  readonly sha256: string;
  readonly limitStatus: 'frozen-current-bytes-candidate-not-approved';
}

const ROOT_KEYS = Object.freeze([
  'schemaVersion',
  'id',
  'contentVersion',
  'status',
  'implementationStatus',
  'validationStatus',
  'approvalStatus',
  'hardGate',
  'hardGateUsable',
  'defaultFormalBundleConsumes',
  'defaultPreloaderConsumes',
  'defaultEntryConsumes',
  'limitBasis',
  'structuralLimits',
  'pipelineBoundary',
  'artifacts',
] as const);
const ARTIFACT_KEYS = Object.freeze([
  'id',
  'path',
  'kind',
  'encodedMediaFormat',
  'currentEncodedBytes',
  'maximumEncodedBytes',
  'decodedTextureBytes',
  'decodedTextureFormat',
  'widthPixels',
  'heightPixels',
  'sha256',
  'limitStatus',
] as const);
const STRUCTURAL_LIMIT_KEYS = Object.freeze([
  'status',
  'hardGateUsable',
  'reason',
] as const);
const PIPELINE_BOUNDARY_KEYS = Object.freeze([
  'sourceMetadataOwner',
  'encodedMediaFormatMetadataOwner',
  'textureDimensionMetadataOwner',
  'processBudgetIdentityOwnedHere',
  'deliverByteIdentityFrozenHere',
  'manageApprovalOwnedHere',
  'createsOrModifiesAssets',
  'loadsAssets',
] as const);
const SUMMARY_KEYS = Object.freeze([
  'artifactCount',
  'audioArtifactCount',
  'characterModelArtifactCount',
  'mapModelArtifactCount',
  'modelAttachmentArtifactCount',
  'textureArtifactCount',
  'totalEncodedBytes',
  'totalAudioBytes',
  'totalDecodedTextureBytes',
] as const);

type PlainDataRecord = Readonly<Record<string, unknown>>;

function dataRecord(value: unknown, keys: readonly string[], name: string): PlainDataRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name}必须是plain data object。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name}原型必须是Object.prototype或null。`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${name}不得包含Symbol字段。`);
  }
  const actual = ownKeys as string[];
  if (actual.length !== keys.length || keys.some((key) => !actual.includes(key))) {
    throw new TypeError(`${name}字段必须exact-key闭合。`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  return value as PlainDataRecord;
}

function denseDataArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`${name}不得包含Symbol字段。`);
  }
  const allowedKeys = new Set([
    'length',
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  if (ownKeys.some((key) => typeof key === 'string' && !allowedKeys.has(key))) {
    throw new TypeError(`${name}不得包含额外字段。`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}[${index}]必须是稠密数据项。`);
    }
  }
  return value;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name}必须是非空字符串。`);
  }
  return value;
}

function safeNonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function safePositiveInteger(value: unknown, name: string): number {
  const parsed = safeNonNegativeInteger(value, name);
  if (parsed === 0) throw new RangeError(`${name}必须大于0。`);
  return parsed;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function artifact(
  id: string,
  path: string,
  kind: ArenaStage7FormalAssetBudgetArtifactKindV2,
  encodedMediaFormat: ArenaStage7FormalAssetEncodedMediaFormatV2,
  currentEncodedBytes: number,
  sha256: string,
  decodedTextureBytes = 0,
  decodedTextureFormat: ArenaStage7FormalAssetTextureDecodedFormatV2 =
    ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.NOT_APPLICABLE,
  widthPixels = 0,
  heightPixels = 0,
): ArenaStage7FormalAssetBudgetArtifactV2Candidate {
  return Object.freeze({
    id,
    path,
    kind,
    encodedMediaFormat,
    currentEncodedBytes,
    maximumEncodedBytes: currentEncodedBytes,
    decodedTextureBytes,
    decodedTextureFormat,
    widthPixels,
    heightPixels,
    sha256,
    limitStatus: 'frozen-current-bytes-candidate-not-approved' as const,
  });
}

const WEAPON_ATTACHMENT_INPUTS = Object.freeze([
  Object.freeze(['heavy-hammer', 38_440, 'cecfb0cd3c89f11d80c2947f6e5c6bdd36721917d83968d29ba77f7e12fc74e4'] as const),
  Object.freeze(['gravity-chain', 43_256, 'ab5de123ed622c1df24fa559f7b73354183885ea6783e16c6ad6511e13915d68'] as const),
  Object.freeze(['line-suppressor', 36_260, 'ed6a9a096c421501ae0d41beb688ac9b58ee76a2de8444583a0f3fe1d755b9f8'] as const),
  Object.freeze(['read-counter', 32_820, '4180675597116ea56334dc835fbe047340e09c3b0d47fa59d97d9905f7204448'] as const),
  Object.freeze(['flank-blade', 25_704, '994e1a03eb7e6e088961683cd757c4c58df6bd5bad7a987136f635818999a66e'] as const),
  Object.freeze(['hook-spear', 35_472, '9b195e8028942ce08b62f3af65fda667d37f9e4f89fd154c9fde5ca9154da276'] as const),
  Object.freeze(['burst-gauntlet', 26_060, '9a27a73cf24224a811abda9a788deb75f7d9176afdb5ace348f76aed8144d392'] as const),
  Object.freeze(['vault-lance', 35_444, 'c1b17c71a43bd48ecede3589da9c2018f5fff35018b732341c35923684450670'] as const),
  Object.freeze(['scatter-cannon', 52_948, '5768c5a2b954d2f6195e24f5953ef0ef08d2bdf0b86e8c9218eb971148216bd7'] as const),
  Object.freeze(['sky-anchor', 37_024, 'e4d210517937f6ee74d1b047da2bba45c6e69605e80ad2348531c2323b83fd5a'] as const),
  Object.freeze(['edge-scythe', 29_004, '4f57ce0baef0176e576ae04231ba3fc8e1f8be772f2b14f8792c051d4151e72a'] as const),
  Object.freeze(['rebound-hook', 33_400, '58a99c5c49e74f13c2e6b59443d62d5cf89e3bf51337df118a3afd73d9013339'] as const),
  Object.freeze(['pulse-baton', 23_644, 'f2faa495e45e34b2db60542e4c8520c61310e883475f0b7ab9cbcc1068abbd85'] as const),
  Object.freeze(['siege-axe', 37_032, 'c10657ac0ead435f34df2779daa0748f79a188715cf53dd4c9ea6a254842fae2'] as const),
  Object.freeze(['twin-fan', 26_184, 'a03fd7105cd434c3d4783bec29efdcdc1992645b7de34fb2627774771fab875e'] as const),
  Object.freeze(['diving-claw', 20_692, '2f10e01ced917bd7da0c37e6345d7993511e9bdb7d5c578e1161fb457cafee9a'] as const),
  Object.freeze(['route-bow', 31_936, '148de5df220be81b33b76b72b3603881c0589b6fa3d1d2f63f97b893c3217617'] as const),
  Object.freeze(['pivot-blade', 28_816, '71d9422b28b2296ed85262a2d139338005a13d3fcb9aa1621b2955727f6c3194'] as const),
  Object.freeze(['commitment-fist', 32_252, 'd7435ad682548dfbb40b8385501a8dfecb406b233d9b434903b32f409fac5562'] as const),
]);

const WEAPON_IMPACT_AUDIO_INPUTS = Object.freeze([
  Object.freeze(['line-suppressor', 5_678, '5c3e101bee65d89c379e2b92bb2b95b32124721c6195e4bb6ca5a96dbf794509'] as const),
  Object.freeze(['read-counter', 6_164, '951e2787f1794d596725478b4c93a2af2cc843eff7810e56b9565fddb8c6bd01'] as const),
  Object.freeze(['flank-blade', 5_240, 'f9fa5ddf7a3a079ba5ef4fb23c96ea7ea14636905b33f4f6286a5910e32743c7'] as const),
  Object.freeze(['hook-spear', 5_188, 'aeae39b5a16c5400005afad66c6dddc7436e0f28d2de0e6e4ad6bcc641bf6a5b'] as const),
  Object.freeze(['burst-gauntlet', 6_233, '958243463d8d17ebcdd6cc40a0c82cc17df922e0da0103de3ddd3403895591d3'] as const),
  Object.freeze(['vault-lance', 5_121, '777582413386821b1bc817f3c4bf31e7cda8df286eae8260bb5e98be9a4c205f'] as const),
  Object.freeze(['scatter-cannon', 4_523, 'cbcdaabd6028f39db3b8c2be83bc87aa44556eef8036ecb4d3ed37922e2eaf9e'] as const),
  Object.freeze(['sky-anchor', 6_845, 'd91d2ffcafd2882dec31d5b753dc25e75ab183039e388ac80882d9fa323e1965'] as const),
  Object.freeze(['edge-scythe', 5_031, 'c3d089d6a9c1cadc22540c02238ff9ffb0268623a2af2c25031daf995d9a472c'] as const),
  Object.freeze(['rebound-hook', 5_729, '689f717fb3391b9fe1b2db6cd66362192918d2d6e0087ef0bce7d28e50f6956e'] as const),
  Object.freeze(['pulse-baton', 5_568, '766e36cf96f99cacd9212ddc5427adbace72ce85a04a18ae1adac8e80a2ec6ac'] as const),
  Object.freeze(['siege-axe', 4_479, 'ffa32331ee96ae3cd4c5fcd9e2a02156ab1fd25b6e6ccbab5763f896c083fd27'] as const),
  Object.freeze(['twin-fan', 5_725, '7539b5c295060c1df94f9c478f5a304a10a57c926732b439cdd09d64a96b9019'] as const),
  Object.freeze(['diving-claw', 5_572, '9fdfedd38218b18afb70377a44cb0cb4a1cad272e17891056812edaa40c16401'] as const),
  Object.freeze(['route-bow', 5_166, 'b31bbb8c5ad3dd311439cce0877899658458dbee7d631ac82c826c848e6173b2'] as const),
  Object.freeze(['pivot-blade', 5_158, 'd2f89abf1afef0e8a281e63f3743af1c1efd28fbf9e910e5ffaabfde549dce01'] as const),
  Object.freeze(['commitment-fist', 5_961, 'c2d829e2bea6e83e3d5c633c15b5102f09e298be5989d5bfc621cde42919ad51'] as const),
]);

const WEAPON_PHASE_AUDIO_INPUTS = Object.freeze([
  Object.freeze(['charge-shield', [6056, '37af721e06891f4e67e0cb5c6860aed6985949099257b262b3978b5f3ceb41bb'], [6044, '5a938b52631c370e5788be011b5ccecb57686d03e1106cc14d62c0ad65b0395d'], [6092, 'a2442bf8d90e4a4980e9d4ec2390791095cdefe7fc371962f7ba8f13fe7e21a1']] as const),
  Object.freeze(['heavy-hammer', [4407, 'd5d0029eb26d0480d295d99a8795d37ebca8c2cedb9f887266640464b46f3714'], [4444, 'b9c9055deff3fb7ebf33394a6266e598920703451268896faefc3d76b83c8d1c'], [4385, '40119347b95e50df30b6207499dc1a2a4cef270ef8e03b4d24d5082c005f0894']] as const),
  Object.freeze(['gravity-chain', [5166, '71917a7c55a502dff55df23ba3a4fffd92d7db1f0f5c150e5b40d8503a18df97'], [5028, '293f48b423d3760c19172fe6ae22efa6e8c9fdd0351bf74f524dcf252b0622e3'], [4952, 'e82f9fb1bbb7f6d869e6eaa517e24ce6ac0b47186f92fe794e735a54118f7816']] as const),
  Object.freeze(['line-suppressor', [5170, '7c6ad811f712f9af157fd2b3943029ae800bce6d03ccd7e12578a300af6ae085'], [5148, '7b1ae5e3563050cc80b1a909aec8b6aef67b84afa48922c00b832a27268c5517'], [5274, '78441331fe6cd77d28149169a3fae195a10e54f2f2d4f24c9d0389c51d6371af']] as const),
  Object.freeze(['read-counter', [5557, '68bf3643791d7fdc0ac37ae51f7828127d02087fccdbb7edf8ccc8e2f0c8a10d'], [5501, '0fa0dea542eff8594ce4246504bf1e89b85e558d334e38cc110921a79d08bc7d'], [5531, '0f85b5ece83c017876c2461d0bdc5f2dd3031ba7b71df31517a3f179b56fb3bc']] as const),
  Object.freeze(['flank-blade', [4679, '69b8d9ef1f7ba07e12a56b7affa14f5f7249493f8ce5a19dd842654c14eaf60e'], [4688, '538bd142278ce8d8b001d1c33db4a81c97281822fcc6156b5a53d8e0780b60c3'], [4633, '95146236c74c48ba7563b5486ca4c3e1731e00536dc5855e86d9e4bf97ee28d9']] as const),
  Object.freeze(['hook-spear', [4926, '5a5b48217891f273e2825c7491235a04a4ff412b360d40505f560135121e3cd2'], [4760, '6865739927290176fc379c4e8baf65920fbf529bef71a6e7fc55584e47a67694'], [4895, 'e6737ea41a6442030861a8e00e15fd5d29e730c4acdad6b4c04cefe0f6a1935a']] as const),
  Object.freeze(['burst-gauntlet', [5351, '301e84bf60044d312de130fb899f9d7e70bf44f9737b94161e004cf1d6de49e1'], [5321, '42f3a49ec7c55bfa8155c486c94ebe39209bab6ae5a6119bf19b762255eca5fd'], [5181, '92ebbf7ccd2de593e66c91de2ca431c7cf579b65bfea75dc2331338ee4e0471d']] as const),
  Object.freeze(['vault-lance', [4885, '393c8771ea40257d91f827b6323d8b535dba721232f1fa78d8650acd055f6a0d'], [4766, 'e106ef1cb66d643965f346322261f3ce26e5dc86922dcd620b19cc0ca8b08d4e'], [4854, 'bd486e4cce356e2784c3bfc917ce8879bf5904566965f547e6b969815d86dd52']] as const),
  Object.freeze(['scatter-cannon', [4472, 'fa4b1f5261c3ede75ee0d1f07e436e5a9d4c6e01b8e0b95c39d04a26964ae842'], [4399, '8b0abd8026ae616b0610fdd5d353bc51663dd0e4f0250432c94075496d65d791'], [4316, '640a41d10b1a4e2b7e2bfeec554ffa639462828d539aed37f5378ba8e5b4846d']] as const),
  Object.freeze(['sky-anchor', [5420, '3ffea957eda37a6bbf3f4e30675ad3be3529803589b9f2d2fef0d87c05a85972'], [5569, 'a339914ed83b472a95a35673101a98dc8ec8c932e054c5e63a6c64dec0c37f31'], [5699, '57385556da5e0ab14ca4398c4e489461e58aa75b934376c0f8701670e26a78b4']] as const),
  Object.freeze(['edge-scythe', [4813, '272816f80c141b8ada6721f5062e67c14c2b75fc2c7411fce5eeed5de90bac1b'], [4612, '89e1f3b46589feefd5dea024c5cda3b5f5dd4cbf4360f0066c795611fed4b71e'], [4658, 'fa9f111da15618254b2952a42ed608ae03ae43ef076811c2a6113d2693268e5e']] as const),
  Object.freeze(['rebound-hook', [5108, 'c33c484baaa778c50c127a196b5a0d9c8687830cf4dc0792b0d1515ab1f13d03'], [5055, 'f257126ee38db805cec6dcfd8d05f87cf92a49fb1e54da14e8f2c4209737c598'], [5095, 'cd880d0c43b72f2cfbc565482bf884053bbc34fbddd775e6a4ce8411a31ac559']] as const),
  Object.freeze(['pulse-baton', [5171, '9f278a917279357fcf586b16ebb32df80097415b370d238e360b529c610bf295'], [5123, '2c6cc3da62c907df533691992e3f779aa197efddcb784f398b7c06d21291fa2e'], [5031, 'e13961673dfcc449e4b1760f1eec0f17010a20317018911458635194c4101d77']] as const),
  Object.freeze(['siege-axe', [4467, '73928b7773fb3a929e3c3671d3bb35728365eb67ab0c2372c5cd763646f109db'], [4403, '1f3c52eb25c927b35a25d89163e9167907e676f519579717ea050f6ca31d0923'], [4373, 'd5db3bda3f1d72a8d678b9d573f01c48969cb4f138f1c9812e09a29e277b800b']] as const),
  Object.freeze(['twin-fan', [5087, '9a073c6821c57bcafcca159c6b9e26b9dbd31fba1a720b30c38e42b0c3d8f6ec'], [5169, '3fe56487b1c4747157a3781a59f9128ecbf47ff3edbf3749d423755c4332925a'], [5077, '898deb7fca41a6a2b6a760d06234fdb6334317b405ca974d4cae21264c0293ca']] as const),
  Object.freeze(['diving-claw', [5100, '4c35f3dc269121eb6880033e41f46e16134d85c90f349849adbb1b82cdfcea57'], [5076, '4687c1aff3c0a6fd2646db4940c2be976162d446711d5309b8d5090312398915'], [5080, 'd01cbfb8d1b8bdce094befca7c155b174bb56949d90af770a5d5940a4b79a5c5']] as const),
  Object.freeze(['route-bow', [5022, '24ba085d9f668c1b23a2e978be932fe92a5e966489330a62b48a02cf771d1c7e'], [4804, '4f6b4ed10457a41a084d44719c6613eead285ea7684a8d2a692bec8dd72a69c2'], [4800, 'b78a13eea5c49e198ba3736fd30008d9ae2c0a8c5c7229691df1f805266c825c']] as const),
  Object.freeze(['pivot-blade', [4871, 'c22954523daf3fd54992153e84e1832be990aa81937e6938d3c5349cfe9cd0fe'], [4796, '8a4360284e8ec03ab38a5e6f3aa5b652a756973b4c3f7ddc2339668ea14c71cd'], [4818, '2b85202672af6ea038131da0b6b7727284f9c50c1a91345c848c43b998163eef']] as const),
  Object.freeze(['commitment-fist', [5196, 'cdeffc1898caeb0b45d405f86bfc75d01e0638b4f4f1c39f464f48ce80dfa4c3'], [5245, '43fdbd51d153ef29ced7efc0accd74494c3350af0664235b1934044374903c0e'], [5429, '91302ffa79875db8d4d26bf2bec1c26c1e4add76e0dc247fba9df5404f91bd65']] as const),
]);

const MODE_SUPPLY_AUDIO_INPUTS = Object.freeze([
  Object.freeze(['mode', 'mode-started', 6_440, '7e22872ed48b5342ee4a64f5a5a83af427708c5835d20014a6f02ca056247d27'] as const),
  Object.freeze(['mode', 'participant-fell-credited-hit', 4_460, 'a0b3424254ff5c4277ff9d8dd76e8d6f7f4022b3ba6cc03f97bcf3362063d936'] as const),
  Object.freeze(['mode', 'participant-fell-movement', 5_613, 'eb682dc780d934c3e1e3999cb291922b296ed48140d9a5f4f953dab0844f223e'] as const),
  Object.freeze(['mode', 'participant-fell-environment', 4_462, 'f94f67f0202288f24f688f46e3824f2a096379e54c17a597fd7bcb7648da1af2'] as const),
  Object.freeze(['mode', 'respawn-scheduled', 6_770, '108c870450343c3368177ce525ad3873dd173575626e81c922b6c67f91b12070'] as const),
  Object.freeze(['mode', 'respawned', 5_938, 'f5fe4a9e2b9c0e097d2c2060119d4021ef804a55ba2f309e8859ecfb8c3ad51a'] as const),
  Object.freeze(['mode', 'safe-anchor-committed', 4_908, 'a713de29e9a6dcbd813c7d5d6cd26e1aff3301a0be04466ddbb9fdc8c66cb4ab'] as const),
  Object.freeze(['mode', 'race-finish-claimed', 6_152, '9def72f1f464cf97f99dcee960631d6aa0491bc5eb8a68fbec0ce4ab7e3c1237'] as const),
  Object.freeze(['mode', 'enemy-pressure', 4_522, '78a38ebde41e37029441d74da8c05040144711f82bcf50ed8e2154106bc1ab6c'] as const),
  Object.freeze(['mode', 'enemy-left', 5_317, 'f139eedf2b0c4db00403e93265ceea2bba4084522d08b2598966d14a040fe0cb'] as const),
  Object.freeze(['mode', 'survival-first-fall', 4_724, 'c1bfe7e97de02a9f3cf5b55cfa817b49cb4a3a05abe8603c130aa20dfba4883c'] as const),
  Object.freeze(['mode', 'survival-terminal-fall', 4_547, 'c063c940d3a9dac184933f752479cf20f6230bcfe4ed8fee89cb5ed521210ede'] as const),
  Object.freeze(['mode', 'match-ended', 7_049, '0724f7c034f47cd77895cb809932b0c5a7ff5e61712536ea65400cde1d871dba'] as const),
  Object.freeze(['supply', 'supply-spawned', 6_009, '92af8a59d7939ccbf231687c5ab0b268eee93e19a9a8f19dbb9a0fed500d90a5'] as const),
  Object.freeze(['supply', 'supply-picked-up', 4_754, '24b1a992f5761967e9e3bfa824d53c87f20564ba03e4c41764a810a325145cde'] as const),
  Object.freeze(['supply', 'supply-replaced', 5_259, '89e45d12532a96e3e4c5d92480544547a044de19bcb02b84f1a1d8bed6d874be'] as const),
  Object.freeze(['supply', 'supply-expired', 5_153, '8934825466dc626c757b747c18394e8a31cb33f0b2d272487cdd06c6aae7d843'] as const),
]);

const VFX_TEXTURE_INPUTS = Object.freeze([
  Object.freeze(['impact-confirm', 7_563, '8f6913f33d44ba83ca87c6e11e88b96f511afb453c7741d563bba20a5673c299'] as const),
  Object.freeze(['impact-surface-transfer', 3_378, '5ed885373d4e29eae6f22721e79cd503331bb449310e5a86753d1031fc82a41f'] as const),
  Object.freeze(['ring-out', 4_332, 'ec94e8106da26a62a75dcd371629538a5bba1aef1013faf6328900e0df7d08df'] as const),
  Object.freeze(['evaded-warning', 4_152, '64eb5d1afbe6063e7e49faad6a4ae1bfd61d148e838f2caac4937faa51f0efbb'] as const),
  Object.freeze(['movement-fall-warning', 2_114, '9537122259a17d5d235ba2afbf37c41a615b2a4390ae3dde3ff25a3d36840e94'] as const),
]);

const STATIC_ARTIFACT_INPUTS = Object.freeze([
  artifact(
    'arena.asset.attachment.shield.kaykit-round.v1',
    'public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.MODEL_ATTACHMENT,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB,
    13_084,
    'a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d',
  ),
  artifact(
    'arena.asset.character.parkour-apprentice.kaykit-rogue.v1',
    'public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.CHARACTER_MODEL,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB,
    922_332,
    '3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab',
  ),
  artifact(
    'arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1',
    'public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.CHARACTER_MODEL,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB,
    974_548,
    '1a424efda14e7875180989a66186fafcc94a12ac85ebdfdc7e3f998a00584e39',
  ),
  ...WEAPON_ATTACHMENT_INPUTS.map(([weaponId, byteLength, sha256]) => artifact(
    `arena.asset.attachment.weapon.${weaponId}.kaykit-candidate.v1`,
    `public/assets/arena/equipment/kaykit-adventurers/weapon-candidates/${weaponId}.glb`,
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.MODEL_ATTACHMENT,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB,
    byteLength,
    sha256,
  )),
  artifact(
    'arena.asset.map.kz-base.authored-candidate.v1',
    'public/assets/arena/maps/authored-candidates/kz-base.glb',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.MAP_MODEL,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB,
    37_248,
    'c70ac5f8d01d960c399b9433bbb05b34720841594e1116b42dd0f2ce062e30ef',
  ),
  artifact(
    'arena.asset.map.kz-switchback.authored-candidate.v1',
    'public/assets/arena/maps/authored-candidates/kz-switchback.glb',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.MAP_MODEL,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB,
    27_292,
    '32732dac39379cb9009f7f0c4d95de7ca214bb11ae74c7458751d76cbf2ebc54',
  ),
  artifact(
    'arena.audio.impact.base-push.v1',
    'public/assets/arena/audio/kenney-impact-sounds/base-push.ogg',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG,
    8_800,
    '486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c',
  ),
  artifact(
    'arena.audio.impact.chain-pull.v1',
    'public/assets/arena/audio/kenney-impact-sounds/chain-pull.ogg',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG,
    7_651,
    '33b5e6e37c6e9d54e07bf5a89b12c76e879f40c1ea83cdd82714df1d6f9fec6d',
  ),
  artifact(
    'arena.audio.impact.hammer-smash.v1',
    'public/assets/arena/audio/kenney-impact-sounds/hammer-smash.ogg',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG,
    6_110,
    'e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831',
  ),
  artifact(
    'arena.audio.impact.shield-charge.v1',
    'public/assets/arena/audio/kenney-impact-sounds/shield-charge.ogg',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG,
    10_032,
    '112d4f93ddcc370b410630f971c0f5d991856102da9c76bc5c5540d388e75aaa',
  ),
  ...WEAPON_IMPACT_AUDIO_INPUTS.map(([weaponId, byteLength, sha256]) => artifact(
    `arena.audio.impact.weapon.${weaponId}.authored-candidate.v1`,
    `public/assets/arena/audio/authored-weapon-candidates/${weaponId}.ogg`,
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG,
    byteLength,
    sha256,
  )),
  ...WEAPON_PHASE_AUDIO_INPUTS.flatMap(([weaponId, windup, release, recovery]) => (
    ([['windup', windup], ['release', release], ['recovery', recovery]] as const)
      .map(([phase, [byteLength, sha256]]) => artifact(
        `arena.audio.weapon.${weaponId}.${phase}.authored.v1`,
        `public/assets/arena/audio/authored-weapon-phase-candidates/${weaponId}-${phase}.ogg`,
        ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO,
        ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG,
        byteLength,
        sha256,
      ))
  )),
  ...MODE_SUPPLY_AUDIO_INPUTS.map(([category, cueId, byteLength, sha256]) => artifact(
    `arena.audio.feedback.${category}.${cueId}.authored-candidate.v1`,
    `public/assets/arena/audio/authored-mode-supply-candidates/${cueId}.ogg`,
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG,
    byteLength,
    sha256,
  )),
  artifact(
    'arena.texture.attachment.shield.v1',
    'public/assets/arena/equipment/kaykit-adventurers/shield_texture.png',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.PNG,
    14_172,
    '5d250ccc5da020e6126bfa3839f83bd9a465a951ed223e4d13c08b1925e154d4',
    4_194_304,
    ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.RGBA8,
    1_024,
    1_024,
  ),
  artifact(
    'arena.texture.character.rogue.v1',
    'public/assets/arena/characters/kaykit-adventurers/rogue_texture.png',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.PNG,
    16_670,
    'a4032e877c3b91939f5cdbb630349c1998fdbc3211bbd587c111125500fe4cc5',
    4_194_304,
    ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.RGBA8,
    1_024,
    1_024,
  ),
  artifact(
    'arena.texture.character.skeleton.v1',
    'public/assets/arena/characters/kaykit-skeletons/skeleton_texture.png',
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.PNG,
    17_037,
    '15741a25c53e04fa9bf3beac3bc0de442359404b1ff9be863b892cb551ad3657',
    4_194_304,
    ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.RGBA8,
    1_024,
    1_024,
  ),
  ...VFX_TEXTURE_INPUTS.map(([cueId, byteLength, sha256]) => artifact(
    `arena.vfx.texture.${cueId}.authored-candidate.v1`,
    `public/assets/arena/vfx/authored-candidates/${cueId}.png`,
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE,
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.PNG,
    byteLength,
    sha256,
    65_536,
    ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.RGBA8,
    128,
    128,
  )),
]);

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS = Object.freeze(
  [...STATIC_ARTIFACT_INPUTS].sort((left, right) => compareText(left.id, right.id)),
);

const CANONICAL_ARTIFACT_BY_ID = new Map(
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.map((entry) => (
    [entry.id, entry] as const
  )),
);

function parseArtifact(
  value: unknown,
  index: number,
): ArenaStage7FormalAssetBudgetArtifactV2Candidate {
  const source = dataRecord(
    value,
    ARTIFACT_KEYS,
    `arena.stage7.formal-asset-budget.v2 artifacts[${index}]`,
  );
  const id = nonEmptyString(source.id, `artifacts[${index}].id`);
  const expected = CANONICAL_ARTIFACT_BY_ID.get(id);
  if (expected === undefined) throw new RangeError(`V2候选包含未知资产${id}。`);
  const path = nonEmptyString(source.path, `artifacts[${index}].path`);
  const kinds = Object.values(ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2);
  if (!kinds.includes(source.kind as ArenaStage7FormalAssetBudgetArtifactKindV2)) {
    throw new RangeError(`artifacts[${index}].kind无效。`);
  }
  const kind = source.kind as ArenaStage7FormalAssetBudgetArtifactKindV2;
  const encodedMediaFormats = Object.values(
    ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2,
  );
  if (!encodedMediaFormats.includes(
    source.encodedMediaFormat as ArenaStage7FormalAssetEncodedMediaFormatV2,
  )) throw new RangeError(`artifacts[${index}].encodedMediaFormat无效。`);
  const encodedMediaFormat =
    source.encodedMediaFormat as ArenaStage7FormalAssetEncodedMediaFormatV2;
  const expectedEncodedMediaFormat = kind
    === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.AUDIO
    ? ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.OGG
    : kind === ARENA_STAGE7_FORMAL_ASSET_BUDGET_ARTIFACT_KIND_V2.TEXTURE
      ? ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.PNG
      : ARENA_STAGE7_FORMAL_ASSET_ENCODED_MEDIA_FORMAT_V2.GLB;
  if (
    encodedMediaFormat !== expectedEncodedMediaFormat
    || !path.endsWith(`.${expectedEncodedMediaFormat}`)
  ) throw new RangeError(`V2候选${id}的kind、编码媒体格式与路径后缀不闭合。`);
  const currentEncodedBytes = safePositiveInteger(
    source.currentEncodedBytes,
    `artifacts[${index}].currentEncodedBytes`,
  );
  const maximumEncodedBytes = safePositiveInteger(
    source.maximumEncodedBytes,
    `artifacts[${index}].maximumEncodedBytes`,
  );
  const decodedTextureBytes = safeNonNegativeInteger(
    source.decodedTextureBytes,
    `artifacts[${index}].decodedTextureBytes`,
  );
  const decodedTextureFormats = Object.values(
    ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2,
  );
  if (!decodedTextureFormats.includes(
    source.decodedTextureFormat as ArenaStage7FormalAssetTextureDecodedFormatV2,
  )) throw new RangeError(`artifacts[${index}].decodedTextureFormat无效。`);
  const decodedTextureFormat =
    source.decodedTextureFormat as ArenaStage7FormalAssetTextureDecodedFormatV2;
  const widthPixels = safeNonNegativeInteger(
    source.widthPixels,
    `artifacts[${index}].widthPixels`,
  );
  const heightPixels = safeNonNegativeInteger(
    source.heightPixels,
    `artifacts[${index}].heightPixels`,
  );
  const sha256 = nonEmptyString(source.sha256, `artifacts[${index}].sha256`);
  if (!/^[a-f0-9]{64}$/u.test(sha256)) throw new RangeError(`artifacts[${index}].sha256无效。`);
  if (source.limitStatus !== 'frozen-current-bytes-candidate-not-approved') {
    throw new RangeError(`artifacts[${index}].limitStatus无效。`);
  }
  if (maximumEncodedBytes !== currentEncodedBytes) {
    throw new RangeError(`V2候选${id}只允许精确冻结当前编码字节，不允许猜测余量。`);
  }
  if ((kind === 'texture') !== (decodedTextureBytes > 0)) {
    throw new RangeError(`V2候选${id}的解码纹理字节与kind不闭合。`);
  }
  if (kind === 'texture') {
    if (decodedTextureFormat !== ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.RGBA8) {
      throw new RangeError(`V2候选${id}当前纹理解码格式必须为RGBA8。`);
    }
    if (widthPixels === 0 || heightPixels === 0) {
      throw new RangeError(`V2候选${id}的纹理尺寸必须大于0。`);
    }
    if (
      widthPixels > Math.floor(Number.MAX_SAFE_INTEGER / 4)
      || heightPixels > Math.floor(Number.MAX_SAFE_INTEGER / (widthPixels * 4))
      || widthPixels * heightPixels * 4 !== decodedTextureBytes
    ) throw new RangeError(`V2候选${id}的纹理尺寸必须与RGBA8解码字节闭合。`);
  } else if (
    decodedTextureFormat
      !== ARENA_STAGE7_FORMAL_ASSET_TEXTURE_DECODED_FORMAT_V2.NOT_APPLICABLE
    || widthPixels !== 0
    || heightPixels !== 0
  ) {
    throw new RangeError(`V2候选${id}的非纹理资产格式与尺寸必须为不适用/0。`);
  }
  if (
    path !== expected.path
    || kind !== expected.kind
    || encodedMediaFormat !== expected.encodedMediaFormat
    || currentEncodedBytes !== expected.currentEncodedBytes
    || maximumEncodedBytes !== expected.maximumEncodedBytes
    || decodedTextureBytes !== expected.decodedTextureBytes
    || decodedTextureFormat !== expected.decodedTextureFormat
    || widthPixels !== expected.widthPixels
    || heightPixels !== expected.heightPixels
    || sha256 !== expected.sha256
  ) {
    throw new RangeError(`V2候选${id}与当前正式Catalog固定字节身份漂移。`);
  }
  return Object.freeze({
    id,
    path,
    kind,
    encodedMediaFormat,
    currentEncodedBytes,
    maximumEncodedBytes,
    decodedTextureBytes,
    decodedTextureFormat,
    widthPixels,
    heightPixels,
    sha256,
    limitStatus: 'frozen-current-bytes-candidate-not-approved' as const,
  });
}

function summary(artifacts: readonly ArenaStage7FormalAssetBudgetArtifactV2Candidate[]) {
  const value = Object.freeze({
    artifactCount: artifacts.length,
    audioArtifactCount: artifacts.filter(({ kind }) => kind === 'audio').length,
    characterModelArtifactCount: artifacts.filter(({ kind }) => kind === 'character-model').length,
    mapModelArtifactCount: artifacts.filter(({ kind }) => kind === 'map-model').length,
    modelAttachmentArtifactCount:
      artifacts.filter(({ kind }) => kind === 'model-attachment').length,
    textureArtifactCount: artifacts.filter(({ kind }) => kind === 'texture').length,
    totalEncodedBytes: artifacts.reduce((total, item) => total + item.currentEncodedBytes, 0),
    totalAudioBytes: artifacts
      .filter(({ kind }) => kind === 'audio')
      .reduce((total, item) => total + item.currentEncodedBytes, 0),
    totalDecodedTextureBytes: artifacts.reduce(
      (total, item) => total + item.decodedTextureBytes,
      0,
    ),
  });
  for (const key of SUMMARY_KEYS) safeNonNegativeInteger(value[key], `summary.${key}`);
  return value;
}

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_INPUT = Object.freeze({
  schemaVersion: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_SCHEMA_VERSION,
  id: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID,
  contentVersion: 4 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  approvalStatus: 'proposed-not-approved' as const,
  hardGate: false as const,
  hardGateUsable: false as const,
  defaultFormalBundleConsumes: false as const,
  defaultPreloaderConsumes: false as const,
  defaultEntryConsumes: false as const,
  limitBasis: 'exact-current-catalog-bytes-no-performance-headroom' as const,
  structuralLimits: Object.freeze({
    status: 'unresolved-not-approved' as const,
    hardGateUsable: false as const,
    reason:
      'node-joint-animation-primitive-material-texture-device-limits-require-separate-approved-evidence' as const,
  }),
  pipelineBoundary: Object.freeze({
    sourceMetadataOwner: 'formal-presentation-asset-catalog-and-evidence-ledger' as const,
    encodedMediaFormatMetadataOwner: 'formal-presentation-asset-catalog' as const,
    textureDimensionMetadataOwner: 'formal-presentation-asset-catalog' as const,
    processBudgetIdentityOwnedHere: true as const,
    deliverByteIdentityFrozenHere: true as const,
    manageApprovalOwnedHere: false as const,
    createsOrModifiesAssets: false as const,
    loadsAssets: false as const,
  }),
  artifacts: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS,
});

export function createArenaStage7FormalAssetBudgetV2Candidate(value: unknown) {
  const source = dataRecord(value, ROOT_KEYS, 'arena.stage7.formal-asset-budget.v2 candidate');
  if (
    source.schemaVersion !== ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_SCHEMA_VERSION
    || source.id !== ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID
    || source.contentVersion !== 4
    || source.status !== 'production-unreachable'
    || source.implementationStatus !== 'code-written-not-run'
    || source.validationStatus !== 'not-run'
    || source.approvalStatus !== 'proposed-not-approved'
    || source.hardGate !== false
    || source.hardGateUsable !== false
    || source.defaultFormalBundleConsumes !== false
    || source.defaultPreloaderConsumes !== false
    || source.defaultEntryConsumes !== false
    || source.limitBasis !== 'exact-current-catalog-bytes-no-performance-headroom'
  ) {
    throw new RangeError('Arena Stage7正式资产预算V2候选治理字段漂移。');
  }
  const structuralLimits = dataRecord(
    source.structuralLimits,
    STRUCTURAL_LIMIT_KEYS,
    'arena.stage7.formal-asset-budget.v2 structuralLimits',
  );
  if (
    structuralLimits.status !== 'unresolved-not-approved'
    || structuralLimits.hardGateUsable !== false
    || structuralLimits.reason
      !== 'node-joint-animation-primitive-material-texture-device-limits-require-separate-approved-evidence'
  ) throw new RangeError('Arena Stage7正式资产预算V2候选结构上限不得伪造批准。');
  const pipelineBoundary = dataRecord(
    source.pipelineBoundary,
    PIPELINE_BOUNDARY_KEYS,
    'arena.stage7.formal-asset-budget.v2 pipelineBoundary',
  );
  if (
    pipelineBoundary.sourceMetadataOwner
      !== 'formal-presentation-asset-catalog-and-evidence-ledger'
    || pipelineBoundary.encodedMediaFormatMetadataOwner
      !== 'formal-presentation-asset-catalog'
    || pipelineBoundary.textureDimensionMetadataOwner
      !== 'formal-presentation-asset-catalog'
    || pipelineBoundary.processBudgetIdentityOwnedHere !== true
    || pipelineBoundary.deliverByteIdentityFrozenHere !== true
    || pipelineBoundary.manageApprovalOwnedHere !== false
    || pipelineBoundary.createsOrModifiesAssets !== false
    || pipelineBoundary.loadsAssets !== false
  ) throw new RangeError('Arena Stage7正式资产预算V2候选媒体管线边界漂移。');
  const rawArtifacts = denseDataArray(
    source.artifacts,
    'arena.stage7.formal-asset-budget.v2 artifacts',
  );
  if (rawArtifacts.length !== ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.length) {
    throw new RangeError('Arena Stage7正式资产预算V2候选资产数量漂移。');
  }
  const artifacts = Object.freeze(rawArtifacts.map(parseArtifact));
  const ids = new Set<string>();
  const paths = new Set<string>();
  let previousId: string | null = null;
  for (const item of artifacts) {
    if (
      ids.has(item.id)
      || paths.has(item.path)
      || (previousId !== null && compareText(previousId, item.id) >= 0)
    ) throw new RangeError(`Arena Stage7正式资产预算V2候选重复或排序错误：${item.id}。`);
    ids.add(item.id);
    paths.add(item.path);
    previousId = item.id;
  }
  const core = Object.freeze({
    schemaVersion: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_SCHEMA_VERSION,
    id: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID,
    contentVersion: 4 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    approvalStatus: 'proposed-not-approved' as const,
    hardGate: false as const,
    hardGateUsable: false as const,
    defaultFormalBundleConsumes: false as const,
    defaultPreloaderConsumes: false as const,
    defaultEntryConsumes: false as const,
    limitBasis: 'exact-current-catalog-bytes-no-performance-headroom' as const,
    structuralLimits: Object.freeze({
      status: 'unresolved-not-approved' as const,
      hardGateUsable: false as const,
      reason:
        'node-joint-animation-primitive-material-texture-device-limits-require-separate-approved-evidence' as const,
    }),
    pipelineBoundary: Object.freeze({
      sourceMetadataOwner: 'formal-presentation-asset-catalog-and-evidence-ledger' as const,
      encodedMediaFormatMetadataOwner: 'formal-presentation-asset-catalog' as const,
      textureDimensionMetadataOwner: 'formal-presentation-asset-catalog' as const,
      processBudgetIdentityOwnedHere: true as const,
      deliverByteIdentityFrozenHere: true as const,
      manageApprovalOwnedHere: false as const,
      createsOrModifiesAssets: false as const,
      loadsAssets: false as const,
    }),
    artifacts,
    summary: summary(artifacts),
  });
  return Object.freeze({
    ...core,
    contentHash: createDeterministicDataHash(
      core,
      `FormalAssetBudgetPolicyCandidate ${ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID}`,
    ),
  });
}

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA =
  createArenaStage7FormalAssetBudgetV2Candidate(
    ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_INPUT,
  );

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_CONTENT_HASH =
  ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_DATA.contentHash;

export const ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_POLICY_IDENTITY = Object.freeze({
  policyId: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ID,
  policyContentHash: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_CONTENT_HASH,
  artifactCount: ARENA_STAGE7_FORMAL_ASSET_BUDGET_V2_CANDIDATE_ARTIFACTS.length,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  approvalStatus: 'proposed-not-approved' as const,
  hardGateUsable: false as const,
});
