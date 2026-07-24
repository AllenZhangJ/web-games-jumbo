# Arena Product Content

产品内容选择的纯规则包。它负责内容目录、退役内容替代、Profile 解锁过滤和确定性单局内容池，不依赖 Match、Session、表现层或平台 API。

边界规则：

- 所有 Definition 和结果均在入口校验并冻结。
- 同 Profile、同 `matchSeed` 必须产生相同内容池和 `poolHash`。
- 退役 ID 必须显式声明替代链；歧义、环和缺失目标一律拒绝。
- Profile 与 Resolver 通过快照方法端口接入；同步端口拒绝 Promise、拒绝重入，并固定构造时的方法实现。
