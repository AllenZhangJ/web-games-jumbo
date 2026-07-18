function bytesToHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function safeFileName(packageId) {
  if (!/^human-study-package-[0-9a-f]{8}$/.test(packageId)) {
    throw new RangeError('CapturePackage packageId 不能用于下载文件名。');
  }
  return `${packageId}.json`;
}

export async function downloadHumanMatchStudyCapturePackage(root, capturePackage) {
  return downloadJson(root, {
    value: capturePackage,
    fileName: safeFileName(capturePackage.packageId),
    includeReceipt: true,
  });
}

async function downloadJson(root, { value, fileName, includeReceipt }) {
  if (typeof root?.crypto?.subtle?.digest !== 'function') {
    throw new Error('当前浏览器缺少 Web Crypto SHA-256，禁止导出正式采集包。');
  }
  if (typeof root.TextEncoder !== 'function' || typeof root.Blob !== 'function') {
    throw new Error('当前浏览器缺少 UTF-8/Blob 能力，禁止导出正式采集包。');
  }
  const documentObject = root.document;
  const urlApi = root.URL;
  if (
    typeof documentObject?.createElement !== 'function'
    || typeof urlApi?.createObjectURL !== 'function'
    || typeof urlApi?.revokeObjectURL !== 'function'
  ) throw new Error('当前浏览器缺少安全下载能力。');
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const bytes = new root.TextEncoder().encode(text);
  const digest = new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes));
  const url = urlApi.createObjectURL(new root.Blob([bytes], {
    type: 'application/json;charset=utf-8',
  }));
  let anchor = null;
  try {
    anchor = documentObject.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.hidden = true;
    documentObject.body?.appendChild?.(anchor);
    anchor.click();
  } finally {
    try { anchor?.remove?.(); } catch { /* hidden download link cleanup is best-effort */ }
    const revoke = () => {
      try { urlApi.revokeObjectURL(url); } catch { /* temporary URL cleanup is best-effort */ }
    };
    if (typeof root.setTimeout === 'function') root.setTimeout(revoke, 0);
    else revoke();
  }
  const artifact = {
    fileName,
    sha256: bytesToHex(digest),
    byteLength: bytes.byteLength,
  };
  return Object.freeze(includeReceipt
    ? { packageId: value.packageId, ...artifact }
    : artifact);
}

export async function downloadHumanMatchStudyWorkspace(root, workspace) {
  if (!Number.isSafeInteger(workspace?.revision) || workspace.revision < 0) {
    throw new RangeError('Human Match Study Workspace revision 无效。');
  }
  return downloadJson(root, {
    value: workspace,
    fileName: `human-study-workspace-r${workspace.revision}.json`,
    includeReceipt: false,
  });
}
