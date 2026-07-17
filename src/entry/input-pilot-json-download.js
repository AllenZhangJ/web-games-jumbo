function safeRevision(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function downloadInputPilotJson(root, {
  kind,
  revision,
  value,
}) {
  if (kind !== 'aggregate' && kind !== 'audit') {
    throw new RangeError(`未知 Pilot 导出类型 ${String(kind)}。`);
  }
  const documentObject = root?.document;
  const URLObject = root?.URL;
  const BlobConstructor = root?.Blob;
  if (
    typeof documentObject?.createElement !== 'function'
    || typeof URLObject?.createObjectURL !== 'function'
    || typeof URLObject?.revokeObjectURL !== 'function'
    || typeof BlobConstructor !== 'function'
  ) throw new Error('当前浏览器不支持 Pilot JSON 下载。');
  const serialized = JSON.stringify(value, null, 2);
  const blob = new BlobConstructor([`${serialized}\n`], {
    type: 'application/json;charset=utf-8',
  });
  const url = URLObject.createObjectURL(blob);
  const anchor = documentObject.createElement('a');
  anchor.href = url;
  anchor.download = `arena-input-pilot-${kind}-r${safeRevision(revision)}.json`;
  anchor.hidden = true;
  const parent = documentObject.body ?? documentObject.documentElement;
  try {
    parent?.appendChild?.(anchor);
    anchor.click();
  } finally {
    anchor.remove?.();
    URLObject.revokeObjectURL(url);
  }
  return anchor.download;
}
