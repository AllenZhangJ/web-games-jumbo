interface MiniGameDialogApi {
  showModal?(options: { title: string; content: string; showCancel: boolean }): unknown;
  showToast?(options: { title: string; icon: string; duration: number }): unknown;
}

export function showMiniGameStartupError(
  api: MiniGameDialogApi | null | undefined,
  title = '游戏启动失败',
): boolean {
  if (!api) return false;
  const content = '当前设备或基础库无法启动游戏，请升级客户端/基础库并确认支持 WebGL2。';
  if (typeof api.showModal === 'function') {
    try {
      api.showModal({ title, content, showCancel: false });
      return true;
    } catch {
      // Fall through to the lighter-weight toast API.
    }
  }
  if (typeof api.showToast === 'function') {
    try {
      api.showToast({ title: content, icon: 'none', duration: 4000 });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
