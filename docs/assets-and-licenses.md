# 资产与许可证

## 内置资产策略

- 当前场景、10 个扩展角色夹具、平台、粒子、HUD 图形、提示音均由代码程序化生成。
- 内置 `Character.assetManifest` 不引用模型、纹理或音频文件，也不允许运行时外链。
- 未来引入真实模型、纹理、字体或音频时，必须先登记来源、作者、许可、修改说明和发行归属，再更新 `scripts/audit-assets.ts` 的白名单与测试。

## 第三方运行时依赖

- Three.js `0.185.1`：MIT，完整文本见 [`licenses/three-LICENSE`](../licenses/three-LICENSE)。
- 参考项目 `shenmaxg/web-jump`：MIT，完整文本见 [`licenses/web-jump-LICENSE`](../licenses/web-jump-LICENSE)。
- 汇总发行声明见 [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)。

## 自动门禁

`npm run audit:assets` 会检查第三方运行时依赖白名单、许可文件、发行声明、角色资源清单和内容层运行时外链。`npm run build` 会把归属与许可文本复制到三端产物。
