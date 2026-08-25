# Arena V2 P5 十一页面、HUD 与反馈实施台账

## 1. 当前状态

- 日期：2026-08-25。
- 当前状态：`P5.0-eleven-screen-contract-static-candidate-landed / P5.0a-eleven-screen-navigation-session-static-candidate-landed / P5.0b-navigation-mode-learning-session-host-static-candidate-landed / P5.0c-generation-scoped-mode-learning-session-factory-static-candidate-landed / P5.0d-three-mode-authoritative-quick-match-information-host-code-written-not-run / P5.1-shared-information-viewmodel-layout-and-owner-composition-static-candidate-landed / P5.1a-twenty-weapon-two-map-twenty-segment-read-content-code-written-not-run / P5.1b-host-agnostic-dom-canvas-and-interaction-static-candidate-landed / P5.1c-isolated-web-dom-and-canvas-host-lifecycle-static-candidate-landed / P5.1d-eleven-screen-surface-pipeline-static-candidate-landed / P5.1e-eleven-screen-real-owner-composition-code-written-not-run / P5.1f-isolated-local-playable-surface-binding-code-written-not-run / P5.1g-six-character-selection-and-authority-routing-code-written-not-run / P5.1h-twenty-weapon-selection-and-authority-freeze-code-written-not-run / P5.1i-two-map-three-mode-authority-routing-code-written-not-run / P5.1j-three-concept-fixed-tick-keyboard-driver-code-written-not-run / P5.1k-three-concept-fixed-tick-pointer-driver-code-written-not-run / P5.2-three-mode-hud-public-identity-and-layout-static-candidate-landed / P5.2a-formal-match-surface-lifecycle-code-written-not-run / P5.2b-formal-three-asset-preloader-code-written-not-run / P5.2c-formal-gltf-character-runtime-code-written-not-run / P5.2d-formal-three-stage-camera-code-written-not-run / P5.2e-formal-hud-action-catalog-and-web-host-code-written-not-run / P5.2f-twenty-weapon-attachment-intake-code-written-not-run / P5.2g-two-authored-map-glb-and-web-playable-composition-code-written-not-run / P5.2h-isolated-formal-web-development-entry-code-written-not-run / P5.3-bounded-feedback-queue-static-candidate-landed / P5.3a-restore-consumer-epoch-static-candidate-landed / P5.3b-atomic-presentation-host-static-candidate-landed / P5.3c-validated-step-only-formal-host-static-candidate-landed / P5.3d-authority-audit-to-atomic-hud-owner-code-written-not-run / P5.3e-explicit-supply-authority-fact-cues-code-written-not-run / P5.3f-formal-webaudio-and-tick-vfx-code-written-not-run / P5.3g-seventeen-authored-weapon-audio-candidates-code-written-not-run / production-unreachable / hardGate=false`。
- 2026-08-25 SF-DG.4/A2P5.1候选自动化证据：上一行保留实现批次明细，其中候选对象的`code-written-not-run / validationStatus=not-run`继续表示没有生产准入；它不再表示P5 runner从未执行。当前官方候选命令已通过52包/11波构建、Vitest 43/43文件与365/365项、Node 14/14文件与196/196项。默认Registry/Composition/Entry、正式资产、浏览器、设备、性能和真人门仍未通过，P5正式硬门不得写为PASS。
- 本轮真实修复：Pointer输入绑定在吞重入后不再丢失已返回的cleanup；Information Host只重复清理未完成Owner；Pointer Surface构造进入显式operation并在390×844横向安全区内让视觉/命中按钮共享非重叠中心；Mode Runtime的`localJumpAvailability`从名义必填收紧为start/step类型、required key、规范化和返回值全链真实必填。UI Layout继续是卡片几何唯一Owner，RenderPlan只消费结果；正式玩法数值、权威tick、页面数量、输入概念和资产字节未改变。
- 2026-08-24 证据状态校正：当前 clean 基线`feature/arena-v2-design-docs@787ce27`已有`typecheck:app`与52包workspace build通过记录，P2候选测试记录为`351/421`且P3边界门通过；这不代表P5 DOM/Canvas/Three、读屏、双视口、浏览器、设备、正式资产或默认入口的任何通过，相关门仍为`not-run`。
- 最新本地命中可见性增量：`P5.3zzzzzze-local-resolved-weapon-impact-visual-reservation-code-written-not-run`。既有三条反馈上限不变；携带权威Action身份的本地真实命中、落点转移或击落结果优先于仍有效的本地攻击未命中占用保留槽。没有结果性接触时挥空仍可见；无Action的移动失足不能冒充武器反馈抢槽，未被显示的本地武器项继续受既有8 voice一次性声音预算保护；终局槽不可替换。
- 最新命中反馈跨帧状态闭合：`P5.3zzzzzzf-feedback-queue-active-state-identity-and-time-closure-code-written-not-run`。上一帧每个活动反馈必须与首次接受的tick、sequence和完整指纹一致，`expiresAtTick`必须精确等于事件tick加既有语义寿命，且不能来自状态未来、不能在状态tick已过期；活动项和seen身份顺序均需保持确定性。
- 最新命中反馈无障碍时序闭合：`P5.3zzzzzzg-feedback-queue-first-visible-live-announcement-code-written-not-run`。反馈即使首次接收时因终局拥挤不可见，也会在保留期内第一次真正进入既有可见槽时播报；seen身份持有一次性播报水位，持续可见或离场后重入均不重复。
- 最新命中反馈偏好切换闭合：`P5.3zzzzzzh-feedback-preference-independent-identity-and-live-reduced-motion-code-written-not-run`。事件基础Cue与动作身份不再随静音/减少动态效果变化；声音只在首次接受且当帧开启时发出，活动视觉可立即降级为零粒子静态结果，之后关闭减少动态效果也不重播旧命中动画。
- 最新命中反馈即时静音闭合：`P5.3zzzzzzi-feedback-owned-audio-immediate-mute-stop-code-written-not-run`。Queue显式下发当前声音偏好；Effect Consumer在静音帧先停止自己持有的HUD声音，再处理视觉，重新开音不补播已消费事件，后续新声音仍恢复正常清理所有权。
- 最新武器收藏结算距离增量：`P5.3zzzzzzj-result-weapon-collection-distance-receipt-code-written-not-run`。每次有效武器主研究在原`earned-progress`字段同时显示完整目录已收藏数量和当前武器距加入收藏的理论最少有效局数；已收藏武器不显示虚假的剩余收藏距离。
- 最新首页武器收藏旅程增量：`P5.3zzzzzzk-home-next-goal-weapon-collection-journey-code-written-not-run`。首页原`next-goal`在唯一下一目标为收藏武器时，同时显示下一主研究阶段、当前武器收藏状态或距收藏的理论最少有效主研究局数，以及完整目录收藏N/总数；已收藏导入档案不显示虚假收藏距离，武器/地图详情不重复该首页摘要。
- 最新命中反馈增量：`P5.3zzzzzm-candidate-vfx-port-full-identity-and-idempotent-dispatch-code-written-not-run`。候选VFX端口的专属解析结果继续保留权威攻击者/受击者；同一完整命令只派发一次，复用同一事件身份却改变任一视觉或攻防字段时失败关闭。该端口仍未接默认链。
- 最新研究节奏增量：`P5.3zzzzzt-exact-observed-catalog-completion-duration-code-written-not-run`。在全集完成冻结基础上，只对Profile revision 0且零主研究点的基线、精确完成边界和完整权威局时发布实际完成小时与200小时差值；中途接入或缺局时只给出原因，不把预测值标成实际结果。
- 最新留存承接增量：`P5.3zzzwj-concrete-result-route-adjustment-action-code-written-not-run`。结果页默认下一目标需要换组合时，原单一主按钮直接列出实际变化的模式、武器和地图，并只进入既有模式确认页；生存目标继续明确空手开局和场内拾取，不新增页面、按钮或选择状态。
- 显式下一目标文案闭合增量：`P5.3zzzwk-explicit-next-goal-destination-copy-code-written-not-run`。玩家显式选择下一目标时，同一主按钮按既有真实目标页显示确认组合、了解目标武器、了解目标地图、查看未开放目标武器或返回首页，不再使用泛化“继续长期目标”。
- 精确地图路段目标增量：`P5.3zzzwl-exact-map-segment-next-goal-signature-code-written-not-run`。`map-segment`和带路段的交叉目标不再退化为地图名与整图骨架，首页和结果页共享签名会先显示精确第N段名称与练习重点，再保留整条路线记忆。
- 隔离候选入口原位恢复增量：`P5.3zzzvb-isolated-entry-in-place-reprepare-code-written-not-run`。资源预加载、音频激活或运行期宿主失败后，既有门页和单一按钮改为“重新准备”；每次重试先完成上一代Composition释放，并保留构造失败携带的清理债务直到`cleanupComplete`，任一清理仍失败就拒绝创建下一代。异步加载与音频结果绑定递增generation，旧批次迟到不能覆盖新门页；浏览器进入BFCache时释放当前代，`pageshow.persisted`返回后沿同一入口重建。无销毁职责的Sequential Match Seed Source由页面生命周期唯一持有，重试延续种子序列，不重复已经使用过的比赛身份。该批不新增页面、玩法动作、资源、输入、默认入口或生产可达性；源码、延期反证和治理标记已写，测试、类型、构建、浏览器、设备与性能全部顺延。
- 隔离候选入口参数与租约隔离增量：`P5.3zzzvc-retryable-query-and-cross-tab-lease-isolation-code-written-not-run`。`retention`查询解析移入原位准备事务，非法值会进入同一失败门并允许修正URL后重试，不再在监听器建立前让模块永久中断；首次成功解析后冻结本页选择。页面使用Web Crypto生成仅本页生命周期持有的随机租约owner，使同页重试可安全接管自身已释放租约而不同标签页身份互斥；若Crypto不可用则使用固定兜底owner并强制`leaseTakeoverSameOwner=false`，宁可拒绝并发也不互相夺取Reward/Learning或留存日志。该批不修改Profile schema、租约时长、成长、玩法、页面、默认入口或网络行为；源码、延期反证与治理标记已写，全部运行验证顺延。
- 本轮增量继续包含：`P5.3zzze-authority-impact-strength-unified-hit-feedback-code-written-not-run / P5.3zzzf-same-catalog-in-match-weapon-learning-loop-code-written-not-run / P5.3zzzg-readable-learning-feedback-and-map-aware-pickup-code-written-not-run / P5.3zzzh-product-result-weapon-map-review-focus-code-written-not-run / P5.3zzzi-shared-weapon-map-learning-and-competitive-prep-code-written-not-run / P5.3zzzj-weapon-map-concrete-route-example-code-written-not-run / P5.3zzzk-competitive-detail-learning-continuity-code-written-not-run / P5.3zzzl-quick-start-current-loadout-readability-code-written-not-run / P5.3zzzm-persistent-survival-weapon-map-focus-code-written-not-run / P5.3zzzn-persistent-learning-text-fit-and-consumer-closure-code-written-not-run / P5.3zzzo-race-next-segment-current-weapon-learning-code-written-not-run / P5.3zzzp-duel-persistent-current-weapon-learning-code-written-not-run / P5.3zzzq-registry-playable-not-collected-information-projection-code-written-not-run / P5.3zzzr-newly-playable-weapon-card-marker-code-written-not-run / P5.3zzzsx-detail-directory-selected-card-reveal-code-written-not-run / P5.3zzzsy-detail-visible-directory-position-code-written-not-run / P5.3zzzsz-dom-synchronous-rerender-enabled-action-latch-fix-code-written-not-run / P5.3zzztb-detail-first-reading-point-selected-identity-code-written-not-run / P5.3zzztc-weapon-detail-core-fight-readout-code-written-not-run / P5.3zzztd-information-copy-content-version-6-code-written-not-run / P5.3zzzte-map-detail-four-anchor-route-skeleton-code-written-not-run / P5.3zzztf-information-copy-content-version-7-code-written-not-run / P5.3zzztg-weapon-directory-basic-gesture-readout-code-written-not-run / P5.3zzzum-hud-effect-before-projection-cleanup-code-written-not-run`。二十武器专属标题与轻击/实击/重击标签已进入既有HUD队列；同一力度投影驱动现有SFX优先级/增益档位、Three VFX整体尺寸与方向箭头、镜头冲击和目标角色明度脉冲。武器详情、地图详情、模式选择、竞技准备、1v1持续持有、竞速下一真实路段、生存本地拾取/持续持有和结算回看形成同一学习接力；持续武器短句固定为一行，Canvas沿用实测宽度省略且读屏保留完整具体路段。快速开始前1v1/竞速显示当前武器×地图，生存只显示地图和空手语义。Registry晋级后的未收藏提示只在下一次正常信息页渲染出现，并只给精确新开放卡片增加既有description前缀；详情第一阅读点、目录位置和相邻目标共用同一可浏览目录身份，武器目录、详情与HUD共用同一Definition-backed基础手势读取，地图第二张首屏卡从同一路线体验目录压缩出四段路线骨架，返回目录后按当前实际RenderPlan定位唯一已选卡片，不复制页面坐标。不主动重绘或反向影响维护事务。没有新增Cue、总线、粒子层、输入、武器数值、页面、HUD区域、点击、奖励、任务、Profile字段或玩法状态；全部只开放给隔离开发入口，正式批准状态仍为false。
- HUD拥挤反馈增量：`P5.3zzztz-hud-feedback-semantic-and-perspective-congestion-priority-code-written-not-run`。既有三个可见槽先按六级稳定事件语义取舍，再在同级按本地参与、全局、纯远端排序；权威比赛结束固定最高，供给提示最低。视角只读已验证参与者ID并成为专门化不可改字段；保留/可见上限、一次性音画Cue总量、Authority和默认入口不变。
- 本地武器声音拥挤保留增量：`P5.3zzzw-local-weapon-audio-survives-visual-congestion-code-written-not-run`。三个可见槽继续只留语义最高反馈；同批首次接受、进入12项保留队列但被高价值结果挤出画面，且带权威动作身份的本地武器命中/受击/挥空，仍可在现有8 voice预算内播放一次既有Cue。纯远端溢出和无动作的移动失足不扩播，队列继续提供强调级和三级voice优先级，Effect Consumer只执行并闭合声音身份；不增加VFX、资产、总线、音量、HUD区域或Authority。
- 本地镜头因果降噪增量：`P5.3zzzx-local-involvement-camera-impact-code-written-not-run`。既有Feedback Queue已在本地化文案之前从验证后的参与者ID冻结`local-involved / global / remote-only`；Effect Consumer把该事实原样加入视觉命令，两个严格快照器闭合后，正式Three VFX只让`local-involved`的稳定命中进入既有镜头冲击。纯远端交战继续显示世界命中特效、目标角色亮度脉冲、受击方向和hit-stop，但不再晃动本地镜头；本地命中和本地受击都保留原镜头因果。未新增粒子、透明层、draw call、音频、按钮、规则、Authority或第二套身份推断。
- 快速理解增量：`P5.3zzzs-three-concept-mode-selection-and-focus-readable-copy-code-written-not-run`。加载、模式选择与角色选择复用同一三概念文案源，模式首屏把角色入口提前并继续保持两次主要点击开局；三张模式卡从既有权威tick、刷新数量与复活上限生成关键规则摘要。选择动作的读屏文本同时包含卡片说明，未开放武器继续追加原因；不新增页面、点击、按键、规则、训练场或选择状态。
- 模式选择非颜色身份增量：`P5.3zzzsa-mode-selection-card-non-color-identity-code-written-not-run`。现有三张模式卡分别增加“双方对峙/三段前进路线/中心被包围”三组纯panel几何，每卡精确3个、总计+9，完整RenderPlan硬限128；原action矩形、48px点击下限、选择/禁用、文字和读屏语义不变。该增强已接入现有Information Surface，模式页不创建角色Three、DOM、资产、RAF、timer或新输入，运行验证全部顺延。
- 地图路线研究卡增量：`P5.3zzzsb-map-route-stage-next-segment-and-milestone-selection-copy-code-written-not-run`。两张地图卡复用P6既有逐段Profile证据和路线里程碑算法，显示初识/熟悉/熟练/掌握/路线全通、已理解段数、下一条真实路线段及25/50/75/100%里程碑剩余练习；只替换既有路线理解片段，不新增成长字段、任务、奖励、页面或按钮。纯投影、三模式Local Host接线与未运行测试均已写，所有验证继续顺延。
- 连续练习增量：`P5.3zzzsc-result-play-again-preserves-mode-weapon-map-code-written-not-run`。隔离正式Web的结果页默认保留单主动作：1v1/竞速显示“同组合再来一局”，读屏明确保留当前模式、武器和地图；生存显示“同地图再来一局”，读屏明确保留生存模式和地图、仍然空手开局并在场上拾取武器，不再错误承诺携带当前选择武器。同页既有“下一目标”原位解释为“长期目标”，字段只显示原有长期成长内容，不再把即时复玩动作重复塞进长期目标值。新武器、新地图收藏承接仍分别改写同一个主按钮并执行对应详情跳转，显示动作与真实动作共用同一推荐结果。即时复玩建议继续由权威赛果和本局主研究进度提供。显式`next-goal`配置仍保留原路线，结算待恢复/需要重启时同一按钮分别改为“重试结算/需要重启”，不新增第二按钮。同步复玩开局期间继续锁定上一局模式、武器选择身份与地图；生存底层仍按原规则忽略loadout并空手开局，模式切换、选择重入或active Registry撤下原武器均失败关闭，不再静默换内容。Match Start后再次核对三项身份并释放临时锁；不新增Profile、选择、页面、按钮、任务、奖励、异步或资源，所有验证继续顺延。
- 结果可行动建议增量：`P5.3zzzsf-result-mode-retry-guidance-code-written-not-run`。既有“本局结果”字段在权威终局摘要后追加一条同模式复玩建议：1v1只按胜/负/平给出更快击落、稳住落点或完成击落；竞速完赛后提示同路线提速，未完赛时只用真实`progressOrdinal`指向下一正式路段或终点冲刺；生存只按第二次掉落/时间上限提示保住复活进入更高压力档或刷新坚持时间。它不解释失败原因、不读取位置/回放、不新增统计、任务、字段、页面或按钮，所有验证继续顺延。
- 收藏完成承接增量：`P5.3zzzsg-result-next-weapon-single-action-handoff-code-written-not-run`。正式Web仅在调用方未显式指定结果决策时启用临时推荐：同一结构化Learning结算必须证明本局刚收藏当前主研究武器，且唯一成长目标必须明确指向另一把active可玩武器，结果页唯一按钮才显示“了解下一把：武器名”并复用既有下一目标导航进入武器详情；点击固定使用本次成功渲染的推荐，不在点击瞬间另算按钮含义，并把已展示武器身份交给导航层复核，Profile或active Registry漂移时失败关闭。其他情况按模式继续复玩：1v1/竞速显示“同组合再来一局”，生存显示“同地图再来一局”并明确空手开局。结算待恢复/需重启时不读取推荐，显式`play-again / next-goal`始终优先；不新增按钮、页面、任务、奖励或自动开局。
- 地图收藏完成承接增量：`P5.3zzzsi-result-next-map-single-action-handoff-code-written-not-run`。同一个默认收藏承接开关现在也覆盖地图：结算必须证明本局精确新增收藏当前所选地图，且唯一下一目标明确指向另一张三模式均已接入的正式地图，结果页唯一按钮才显示“了解下一张：地图名”，真实切换选择并进入地图详情；点击复用本次成功渲染的推荐，并在导航前复核已展示地图与实际目标完全一致，漂移时失败关闭。随后仍沿既有主按钮进入模式选择。其他情况按模式继续复玩：1v1/竞速保留当前组合，生存保留当前地图并仍然空手开局；恢复态和显式结果决策继续优先。不新增按钮、页面、自动开局、任务或奖励。
- 详情到模式选择的诚实承接增量：`P5.3zzzsm-detail-to-mode-rule-honest-handoff-code-written-not-run`。武器详情和地图详情的既有唯一主按钮统一显示“选择模式”，不再在尚未选模式时承诺“下局使用”；模式选择的读屏和既有准备入口同时明确：1v1/竞速携带当前武器×地图，生存只使用当前地图并空手开局。它不新增页面、按钮、点击、装备规则或选择状态，只让文案与真实导航和生存空手规则一致。
- 信息文案版本增量：`P5.3zzzsn-information-copy-content-version-5-code-written-not-run`。中文信息消息目录随结果主动作、详情承接和模式装备规则文案变化从内容版本4提升到5，避免缓存或内容身份把新旧玩家承诺视为同一版；不改变页面、导航、规则或Profile schema。
- 武器详情核心打法增量：`P5.3zzztc-weapon-detail-core-fight-readout-code-written-not-run / P5.3zzztd-information-copy-content-version-6-code-written-not-run`。保留既有“距离与覆盖→时机与风险→核心打法”的首屏比较顺序，把原`ground-aerial`卡片可见值收敛为“核心动词｜按一下/按住松开｜主要取舍”，完整commitment、地面结果和空中结果保留在同字段读屏语义；中文消息目录因字段标签从“地面与空中”改为“核心打法”提升至版本6。它不增加字段、页面、按钮、按键、规则或第二份武器说明。
- 地图详情路线骨架增量：`P5.3zzzte-map-detail-four-anchor-route-skeleton-code-written-not-run / P5.3zzztf-information-copy-content-version-7-code-written-not-run`。原`hazard-summary`首屏卡不换ID，从同一地图体验节奏目录依次选择起步、第一次变化、第一次高潮和收官四个不同路段，显示可背诵的路线骨架；完整路线、危险角色数量、分支数、最高难度和复活秒数保留在既有`full-route`字段。字段标签从“主要危险”改为“路线骨架”，消息目录提升至版本7；不新增字段、路线规则、页面或交互。
- 武器目录基础手势增量：`P5.3zzztg-weapon-directory-basic-gesture-readout-code-written-not-run`。武器操作读取收敛为一个Definition/消息目录投影，详情、三模式HUD和20张武器卡共同消费；卡片在成长进度后直接显示“按一下”或“按住松开”，再显示核心动词和主要取舍。A6收藏内容schema不扩张，目录卡组合只按武器Definition身份调用共享读取；HUD删除本地commitment解析，避免未来操作调整形成三处文案漂移。不增加按键、页面、按钮、字段、教程或规则。
- 结果目标路线单动作增量：`P5.3zzzso-result-goal-aligned-single-action-route-code-written-not-run`。默认结果策略复用P6.88只读路线适配器：当前组合可稳定推进、或当前生存组合能以真实补给条件继续时保留复玩；必须换模式、武器或地图时，把既有唯一按钮改为列出实际调整项并进入原有目标准备路线。渲染时冻结目标、页面、模式、武器和地图身份，点击前完整复核，导航后同步目标模式；显式调用方决策继续优先。不新增页面、按钮、目标Resolver、Profile、奖励、自动开局或默认入口。
- 结果到准备最短路径增量：`P5.3zzzsp-result-goal-shortest-preparation-route-code-written-not-run`。默认具体调整动作在目标模式和所需武器/地图都可直接采用时，一次性写入组合并直达既有模式选择页，玩家只需确认后开局；刚收藏后的“了解下一把/下一张”仍保留详情承接，目标内容未激活时仍回目录，显式下一目标继续沿调用方原路线。该批不自动开局、不跳过模式确认、不新增页面、按钮、选择字段或Authority。
- 模式页与准备页可选深度入口增量：`P5.3zzzsq-mode-preparation-rule-secondary-route-code-written-not-run / P5.3zzzsr-mode-character-secondary-route-code-written-not-run / P5.3zzzss-competitive-preparation-detail-secondary-routes-code-written-not-run / P5.3zzzst-survival-preparation-collection-secondary-routes-code-written-not-run`。模式选择页继续只保留“开始这一局”一个主动作，并把既有`preparation-entry`与`character-entry`信息卡分别变为48px以上的次级点击区。1v1/竞速规则进入既有竞技准备页，生存规则进入既有生存准备页；角色入口进入既有六角色选择页，保存后沿现有返回身份回到模式页。竞技准备页继续只保留“开始比赛”一个主动作，角色、武器、地图三张既有信息卡分别进入既有选择或详情页，并可不开始比赛直接返回模式。生存准备页在内容末尾以窄屏2×2、宽屏4列提供返回模式、角色、武器收藏和地图详情，“开始生存”仍是唯一主动作；武器入口只浏览收藏，不会装备武器，空手开局保持不变。所有路径都不新增页面、不改变开局规则，也不把准备、详情或角色选择变成必经步骤。
- 准备详情单层返回增量：`P5.3zzzsu-preparation-detail-single-source-return-code-written-not-run`。竞技准备进入当前武器或地图详情、生存准备进入当前地图详情时，导航只保留一层准备来源；详情唯一主按钮沿用原intent但显示“返回竞技准备/返回生存准备”，并回到真实来源。收藏目录、结算等其他入口进入详情时仍显示“选择模式”；生存准备不能形成武器详情返回来源，避免把收藏浏览误写成预选装备。不新增导航栈、页面、按钮数量、选择状态或Authority。
- 详情返回目录增量：`P5.3zzzsv-detail-directory-secondary-return-code-written-not-run`。武器与地图详情页在既有主动作之外各增加一个48px整宽次级动作“返回武器库/返回地图库”；从准备页进入时，主动作仍优先返回真实准备来源，目录返回只作为可选浏览出口。返回目录保留当前武器或地图选择，并通过现有导航自然清空准备来源；不增加页面、主动作、导航栈、选择写入或Authority。
- 详情连续浏览增量：`P5.3zzzsw-detail-adjacent-continuous-browse-code-written-not-run / P5.3zzzsy-detail-visible-directory-position-code-written-not-run / P5.3zzzta-adjacent-target-name-visible-code-written-not-run / P5.3zzztb-detail-first-reading-point-selected-identity-code-written-not-run`。武器详情按当前可玩Registry与正式目录顺序提供“上把·名称/下把·名称”，地图详情因当前只有两图而提供一个“另一张·名称”；详情首个问题显示当前武器或地图名称，末尾同时显示“武器 N / 当前可玩数”或“地图 N / 2”，切换后停留详情并回到顶部，当前选择同步更新。从准备页进入时仍保留原准备来源，主动作不变；未开放武器不会成为连续浏览目标、标题身份或计数分母。
- 详情返回目录定位增量：`P5.3zzzsx-detail-directory-selected-card-reveal-code-written-not-run`。详情返回武器库或地图库后，绑定层从刚成功渲染的目录计划中复核唯一“已选择”卡片，并请求Surface把它居中显示；DOM、Canvas与Formal Web收藏预览共同使用当前实际RenderPlan矩形和同一有界滚动解析，不保存第二套页面坐标，也不改变选择、页面、动作或Authority。
- DOM连续操作修正：`P5.3zzzsz-dom-synchronous-rerender-enabled-action-latch-fix-code-written-not-run`。Intent回调内同步导航重绘不再把新页面已启用按钮永久写成disabled；按钮可用性只服从RenderPlan，Surface仍用内部事务水位拒绝同步重入，不改变任何Intent或Authority。
- 收藏预览组合证明增量：`A6.15a-host-composed-detail-plan-attestation-code-written-not-run`。Formal Web把Host已经组合的完整目录/详情RenderPlan作为权威证明交给预览桥，预览层不再把详情错误限制为基础Pipeline；仍校验基础Pipeline、selection、页面、revision、动作数量和最终来源计划完全一致，旧隔离夹具可继续省略新证明并沿原路径运行。
- 本地视角命中辨识增量：`P5.3zzzsh-local-perspective-hit-feedback-identity-code-written-not-run`。二十武器HUD在既有权威命中事件、公开本地参与者身份和统一力度投影闭合后，为标题增加“命中确认 / 受击警告 / 交战信息”三类非颜色前缀，再接轻击/实击/重击与武器动作标题。共享纯投影把本地玩家遭受的`hit-confirm / hit-surface-transfer / hit-ring-out`全部提升为warning，使普通受击也复用既有警告色、队列优先级与声音增益，不再被同批远端反馈轻易淹没；主动命中仍保持原本力度强调，适配器只复核该同源结果。HUD效果命令与专属VFX解析结果继续携带同一已验证视角事实，未来替换下游端口也不能从文案、位置或动画重新猜测本地身份。不改HUD队列、视觉容量、伤害、冲量或击落归因。
- 生存敌人视觉收敛记录：`A3-survival-single-enemy-family-visual-contract-code-written-not-run`。全部Survival enemy assignment继续使用唯一敌人家族Definition，正式目录只登记一个Skeleton敌人模型和材质Profile；压力只由数量、节奏和权威武器事实增加，不新增精英/Boss/敌人职业或表现层规则分支。
- 生命周期审计修正：`P5.0e-three-mode-information-host-retryable-destroy-ownership-code-written-not-run / P5.3zzf-information-host-session-factory-bundle-factory-cleanup-order-code-written-not-run`。外层三模式Information Owner按`Information Host → Mode/Learning Session Factory → QuickMatch Bundle Factory`依赖顺序销毁；失败owner保留、成功owner不再重复处理，只有三层都成功后才进入destroyed。第一次清理开始后读取端永久失败关闭，重试只允许继续同一清理所有权。该修正未运行，不改变默认Registry/Composition/入口。
- 继续增量：`P5.3n-result-next-goal-direct-route-code-written-not-run`。结算选择下一目标后不再固定回首页：本地Profile owner解析唯一目标并显式交给导航Session，武器目标直达已选武器详情、地图目标直达已选地图详情、模式/交叉挑战目标直达模式选择、目录完成回首页；导航层只校验显式目标属于Result声明边，不自行读取Profile或选择目标。
- 地图学习增量：`P5.3o-race-map-segment-learning-feedback-code-written-not-run`。竞速HUD不再只显示无语义的路线序号，而是从权威地图Definition身份与`progressOrdinal`解析当前地图、已完成段数、下一路段或终点；安全点与终点一次性反馈同步显示具体路段名和既有练习提示。该增量只消费只读Frame与稳定事件，不改变路线、重生、完成判定或输入。
- 对战可读性增量：`P5.3p-duel-opponent-readability-and-race-rule-copy-code-written-not-run`。1v1 HUD补齐唯一对手名称、剩余生命、在场状态与当前武器；竞速准备文案明确“方向+跳跃可以完成全图，同时攻击可使对手掉落”，不再让玩家误以为竞速禁用主攻击。
- 模式机会可读性增量：`P5.3q-mode-specific-life-respawn-chance-hud-code-written-not-run`。本地状态栏不再对三个模式统一显示`lives`：1v1保留真实生命，竞速改为不限次数复活/权威重生倒计时/已完成，生存改为两次掉落规则下的剩余机会。
- 武器名称一致性增量：`P5.3r-single-weapon-display-name-source-code-written-not-run`。HUD删除第二份手写简称表，对局、供给与局外收藏统一从同一20武器内容目录和中文消息目录解析名称。
- 补给节奏增量：`P5.3s-authoritative-next-supply-cadence-code-written-not-run`。新增独立`ArenaSupplyCadenceSnapshotV1`，由Equipment Supply Timeline从已注册供给Definition和权威tick计算下一波序号、刷新tick、剩余tick与数量；开局、逐tick和checkpoint恢复均经Match Runtime、Session、Product/Learning桥传到HUD。Survival必须发布，Duel/Race必须为`null`，HUD只把权威剩余tick换算为“下一批3把·N秒”，不自行计算20秒周期。
- 玩家时间可读性增量：`P5.3t-authority-tick-player-time-copy-code-written-not-run`。HUD保留全部权威tick字段和阈值判断，但面向玩家的主计时统一显示`MM:SS`，供给刷新/场上武器消失/竞速复活/准备阶段/冷却统一显示秒，零冷却显示“就绪”；模式准备、终局摘要、竞速完成、生存/竞速最佳记录、武器详情动作时序与地图复活说明也不再暴露内部tick。换算固定读取同一权威60Hz调优，不创建表现计时器、不改变刷新、过期、重生或动作时序。对应HUD排版合同固定`MM:SS`主时钟＞准备＞冷却＞下一批供给＞单件消失的层级、164/184px主槽、64px短值槽、等宽数字、供给名称/等级时间双行，以及低动效原位替换和读屏非逐tick播报；代码状态仍为`not-run`。
- 冷却就绪公告增量：`P5.3u-cooldown-ready-single-screen-reader-announcement-code-written-not-run`。正式HUD Canvas仅从同一RenderModel的`local-cooldown`事实识别正数到零，并按`consumerEpochId + generation`去重；首次已就绪、暂停/clear后的新基线和切代均静默。可见“就绪”和读屏“武器已经就绪”由同一时间可读性合同提供，不复制字符串、不读取Authority或墙钟。
- 共享视觉值增量：`P5.3v-shared-dom-canvas-hud-visual-token-contract-code-written-not-run`。`arena-v2.ui-visual-tokens.v1`成为RenderPlan之下的单向基础合同，闭合八种tone、中文/数字字体、稳定数字、圆角与描边；DOM、共享Canvas Painter及正式HUD世界标记均消费同一合同，未知tone在任何绘制或节点提交前失败关闭。未改变几何、交互、权威事实、音频语义或默认入口。
- 触控视觉同源增量：`P5.3w-formal-three-concept-touch-controls-share-visual-tokens-code-written-not-run`。正式Web触控Surface的`move / primary / jump`三角色固定映射为“移动/攻击/跳跃”，颜色、固定半透明底色、文字、字体、描边与阴影全部进入同一深冻结Visual Tokens V1；宿主删除`color-mix`和第二套视觉值。角色与tone在首个DOM节点创建前闭合，构造中途失败移除自有Surface；触控几何、安全区、raw pointer生命周期、Driver语义和Authority均未改变。
- 顶层生命周期增量：`P5.3x-formal-web-playable-composition-lifecycle-hardening-code-written-not-run`。正式Web可玩组合合并并发音频激活为唯一in-flight Promise，收容native/foreign Promise拒绝且不执行普通hostile thenable；surface change建立同步事务水位，回调重入、resize与dispose在父资源变更前拒绝。可选离线Journal只有在open失败且清理成功时降级，清理不完整阻断构造并保留同一所有权供外层重试；首个失败identity不可被迟到prepare/activation覆盖，dispose清理失败以“原失败在前、清理错误在后”聚合。
- 触控按下反馈增量：`P5.3y-formal-web-pointer-pressed-state-and-lifecycle-code-written-not-run`。共享Visual Tokens V1为三角色闭合`idle / pressed`两态且删除旧idle视觉别名；正式Web Pointer Surface只在Driver同步接受`pointerStart`后点亮初始角色，移动不改变角色所有权。多指计数、拒绝、抬起、取消、隐藏、缩放、解绑和销毁均收敛回idle；同步回调重入/抛错执行补偿取消，native/foreign Promise拒绝被收容，生命周期监听器绑定回滚失败仍保留可重试所有权。该切片不新增输入、命令或Authority。
- 移动方向反馈增量：`P5.3z-formal-web-pointer-move-origin-and-direction-feedback-code-written-not-run`。共享Token固定移动外圈空闲原点与方向内圈视觉；Driver接受move后，外圈重定位到同一raw pointer起点，内圈复用`normalizedControlDelta(origin,current,joystickRadius)`并以“外圈半径－内圈半径”钳制位移。角色不随拖动重判，异常多指按最早存活owner稳定转移；结束、取消、隐藏、resize、解绑、销毁与视觉失败都回到固定原点和居中内圈。移动标签来自同一角色Token并独立置于内圈上层，不新增文案、操作或Authority。
- 主攻击权威可用性反馈增量：`P5.3za-authority-primary-availability-touch-feedback-code-written-not-run`。共享Token为primary闭合`unknown / ready / blocked`三种静态表现，正式Web组合只把同一权威Scene的`localAction.channels.primary.kind`裁剪为四字段冻结快照：`selected`映射ready，`ignored / none`映射blocked，未知身份失败关闭。开局在触控层显示前应用，之后随每个权威step刷新；blocked只叠加透明度与固定斜杠，不设置disabled、不阻断原始输入。Surface不深拷贝Scene、不推算冷却、不建立计时器，indicator只创建一次；information、隐藏、失败和销毁都清回unknown，availability与accepted pointer的`idle / pressed`正交。
- 移动端安全区触控布局增量：`P5.3zb-mobile-safe-area-shared-touch-layout-code-written-not-run`。正式Web组合以一个自有隐藏probe读取四边`env(safe-area-inset-*)`并缓存同一冻结viewport，HUD、信息布局、InputSampler与Pointer Surface只消费这一个快照；缺失或不可解析的平台值保守降级为零。primary/jump保持既有至少46px半径，视觉与命中复用同一动作中心且完整落入安全区；idle move外圈按安全区钳制，accepted move继续保留真实raw pointer起点。仅inset变化也会取消pointer ownership；安全区吞没viewport、三圈重叠或resize后几何无效时先隐藏并禁用Surface且不继续sampler。未新增输入、手势、Authority、计时器、RAF或默认入口。
- 命中镜头冲击增量：`P5.3zc-formal-three-hit-camera-impact-code-written-not-run`。正式VFX只把稳定的`hit-confirm / surface-transfer / ring-out`命令映射为5/7/9 tick的normal/strong/warning镜头冲击，闪避、供给与普通UI不触发；状态按权威整数tick衰减，最多保留3项、recent identity为64项，并按强度与`sourceEventId` UTF-8顺序稳定取舍。正式全图/跟随相机先恢复基础模型，再叠加封顶1.20%垂直视野位移与0.55% zoom；权威世界方向和VFX箭头共同适配Three镜像X轴，缺失/零方向使用具名八相位，不使用随机或墙钟。低动效/static消费身份但镜头输出为零；remove、pause、clear、切epoch、reset、Match释放和dispose均归零。VFX借用相机端口并先于相机销毁；宿主已接线，但默认入口仍断开，代码与测试只写入未运行。
- 目标角色命中明度增量：`P5.3zd-target-character-impact-readability-code-written-not-run`。稳定命中命令按明确`anchorParticipantId`驱动3/4/5 tick、0.55/0.75/0.95峰值的角色本体白亮脉冲；同目标取最大值、全局最多3项、recent 64项，全部从权威tick衰减。角色只改实例自有克隆材质并从baseline重算：优先emissive，无emissive才混合color，归零/失败/销毁精确恢复；不增加粒子、透明层、draw call、光源、shader、纹理或distortion。reducedMotion/static输出零但保留静态VFX/HUD/音频；目标缺失时跳过材质写入。当前Registry只能全体推进动画，因此不做会冻结无关玩家的全局hit-stop。共享状态由VFX借用、Three Stage拥有，正式隔离Web宿主已接线，代码与测试未运行。
- 目标角色独立受击停顿增量：`P5.3ze-target-scoped-character-hit-stop-code-written-not-run`。在P5.3zd同一稳定事件、epoch、三项active与64项recent边界内，`hit-confirm / surface-transfer / ring-out`只让明确目标的骨骼动画推进停顿2/3/4个权威tick；Authority位置、击退、碰撞、其他玩家、攻击者、规则tick和音画队列继续推进。逐participant冻结名单沿Stage→Character Registry→Runtime→正式GLTF View单向下传，冻结帧仍同步装备、位置、朝向和可见性；解除后直接恢复1x，不追赶、不补帧、不慢放。reducedMotion/static消费身份但不冻结；snap先建立合法姿态再停顿，暂停/clear/离场/dispose恢复1x。默认入口仍断开，代码和测试只写入未运行。
- 目标角色受击方向增量：`P5.3zf-authority-hit-direction-animation-selection-code-written-not-run`。只有稳定directional命中命令为明确目标提供合法XZ方向；正式角色只在Authority语义已经是HITSTUN/KNOCKBACK时，将该方向与当前权威facing做归一化dot：不大于-0.20选择既有`Hit_A`前受击，不小于+0.20选择既有`Hit_B`后受击，近侧向/缺失/零方向保持既有中性默认。方向沿P5.3zd同一active/priority/epoch生命周期进入Character Factory，不从坐标、镜头、VFX节点或动画反推；低动效/static保留姿态语义但不恢复明度脉冲或hit-stop。未新增Clip、骨骼、动作、资源、计时器、随机、规则或默认入口，代码与测试未运行。
- Web音频总线增量：`P5.3zg-formal-web-sfx-master-limiter-bus-code-written-not-run`。正式Web Audio的全部one-shot不再逐voice直连destination，而是统一进入`voice gain → SFX → Master → limiter → destination`；共享SFX固定0dB，Master固定-6dB余量，末端限制器固定-3dB阈值/20:1/3ms attack/180ms release。8 voice上限、优先级淘汰、Cue dB和确定性速率不变；构造回滚与销毁按voice→SFX→Master→limiter→Context顺序收口。不增加设置页、音乐、环境、语音或玩法状态，代码和静态测试仅写入未运行。
- 统一命中力度反馈增量：`P5.3zzze-authority-impact-strength-unified-hit-feedback-code-written-not-run`。通用HUD Consumer增加受限`projectedRenderModel`入口，只允许二十武器适配器替换武器反馈标题、说明和Cue，禁止修改tick、sequence、参与者、锚点、动作、模式、结果、emphasis或非武器项；因此此前只在适配器中生成的“武器名·地面/空中”标题现在真正进入原有12/3/64队列和单次音画消费链。命中力度只读V2权威水平冲量并按`<8 / 8–<12 / ≥12`映射轻击、实击、重击，同一投影给HUD短标签、既有SFX的`-6/-3/-2 dB`最低档与1/2/3优先级、VFX整体/箭头倍率、镜头与目标角色脉冲倍率；结果语义本身仍由`hit-confirm / surface-transfer / ring-out`决定且优先级不被轻击降级。生存等级不在表现层读取，只通过实际权威冲量自然改变力度。不新增音频资产、总线、VFX层、粒子、draw call、shader、输入、武器数值、成长字段或默认入口。使用`audio-design`约束复用SFX总线与有界voice，使用`vfx-realtime`约束value-first、封顶镜头和无新增透明层；运行测试、类型、构建、浏览器、设备、性能和真人全部顺延。
- 局内武器短学习循环增量：`P5.3zzzf-same-catalog-in-match-weapon-learning-loop-code-written-not-run`。二十武器HUD适配器不新增教学数据，而是按已闭合的Equipment Definition与地面/空中Action身份读取现有20武器内容目录：三类稳定命中把“本招用途”及武器详情页同一句动作结果放在通用因果说明之前，`attack-evaded`同样先显示“下次注意”及同一7类失败风险中文文案。移动掉落、徒手、供给和模式反馈不参与；标题、说明仍进入既有最多3项队列，不新增弹窗、训练场、页面、任务、奖励、Profile字段或第二文案源。目录/Action/风险身份漂移在任何表现副作用前失败关闭。源码、治理和延期用例已写，运行验证全部顺延。
- 挥空后可执行重试策略增量：`P5.3zzzuz-authoritative-risk-retry-strategy-code-written-not-run`。本地玩家的`attack-evaded`继续只承认权威“攻击窗口结束且没有命中/掉落事实”，不从位置或距离猜本局原因；HUD按同一Action的7类失败风险追加一条固定下次策略，覆盖安全恢复、方向对齐、避免自身越界、确认落点、窄判定对线、缩短无效蓄势和先取得优势位置。策略只使用方向、跳跃、主攻击三概念，不新增准星、格挡、训练场、HUD区、队列容量或第二武器规则源；消息目录升至版本9。源码和未运行用例已写，动态排版、读屏、真人理解、设备与性能统一顺延。
- 局内武器学习视角收敛增量：`P5.3zzzsj-local-perspective-result-risk-feedback-code-written-not-run`。同一权威武器反馈不再对所有观察者显示攻击者口吻：本地命中者继续看到“本招用途”，本地受击者改看同一武器详情风险派生的“反制提示”，既非攻击者也非目标的交战只保留权威结果说明；本地挥空仍显示“下次注意”。该分流只比较公开本地参与者与事件既有`attackerId/targetId`，不推断命中、方向、位置、掉落或胜负，不新增队列、HUD区、页面、按钮、教学数据或第二风险源。
- 窄屏反制学习焦点增量：`P5.3zzzsl-local-counterplay-primary-learning-focus-code-written-not-run`。现有HUD学习焦点识别同时覆盖“本招用途”“下次注意”“反制提示”和地图机会；排序固定为危险警告优先，其次学习反馈，再沿用强调级、类别和权威tick/sequence稳定排序。窄屏因此不会让受击反制建议被更晚的普通模式提示遮蔽，也不会让学习卡压住“下一次掉落即结束”等关键生存警告；不增加队列容量、停留时间、HUD区、按钮或权威状态，宽屏仍按既有规则展示最多两条次级事实。
- 命中绝对方位读出增量：`P5.3zzzsk-authority-world-impact-compass-copy-code-written-not-run`。三类权威命中在既有轻/实/重标题中追加“地图东/西/南/北及四个斜向”绝对方位；方向只由V2 `KnockbackApplied`单位向量按固定主轴/斜向边界投影，沿用项目`+X东、-X西、+Z北、-Z南`世界约定，不使用镜头朝向，不写“左/右”，不读取角色位置、动画或画面。无世界方向的闪避和移动掉落不显示方位；不新增HUD区、事件、按键、规则或第二方向源。
- HUD可读性与本地拾取地图学习增量：`P5.3zzzg-readable-learning-feedback-and-map-aware-pickup-code-written-not-run`。力度改为标题前缀，学习提示改为说明前缀；窄屏优先显示当前主学习项，次级项仍保留在有界队列与读屏公告中。Canvas按实际高度限制行数并在截断时保留省略号，低动效仍保留完整因果文字。生存本地拾取/替换读取HUD中的权威地图Definition，并调用共享武器×模式×地图只读投影；不读取玩家坐标、不猜当前路段，最多显示两个“当前地图优先找”的地形。远端拾取、生成、过期不追加；不新增页面、弹窗、训练场、任务、奖励或Profile字段。
- 受击后可执行反制增量：`P5.3zzzh-authority-counter-input-retry-copy-code-written-not-run`。本地玩家成为稳定命中目标时，既有HUD说明行直接读取同一武器地面/空中Definition的`counterInputs`，显示“下次可改变方向/跳跃离开”及对方失败风险；观察他人交战不教学，自己出手仍显示本招用途。反制只允许方向与跳跃，不新增HUD区域、按钮、训练场、格挡、独立瞄准或规则推断；代码与反证已写，验证统一顺延。
- 结算武器×地图回看增量：`P5.3zzzh-product-result-weapon-map-review-focus-code-written-not-run`。既有`full-match-record`先保留完整本局武器使用事实；当Product Result中的选中地图属于当前两图目录时，共享武器×模式×地图只读投影从本局真实使用武器中按收藏顺序稳定选一把，并给出最多两个下一局练习位置。未知地图只保留使用事实，不猜地图；空使用记录不从选择或Profile推断。没有新增结算字段、页面、按钮、任务、奖励、进度或Profile写入。
- 单一武器×地图学习投影与竞技准备提示增量：`P5.3zzzi-shared-weapon-map-learning-and-competitive-prep-code-written-not-run`。武器Definition、模式后果、地图Definition和地形机会计数只在一个投影中完成校验、排序与中文解析；竞技准备按显式本局武器和地图增加一条最多两个地形的“本局练法”，生存拾取和结算回看迁移到同一投影。准备页额外校验武器/地图显示名和地图段落总数没有漂移；生存准备不调用武器投影，继续空手开局。没有新增页面、HUD区域、选择步骤、训练场、任务、奖励、Profile字段或Authority写入。
- 武器×地图具体路段示例增量：`P5.3zzzj-weapon-map-concrete-route-example-code-written-not-run`。内容目录为六类地形机会同时持有数量和路线序号最早的具体路段身份；共享投影保留原地形摘要，并新增“地形（第N段·路段名）”练习摘要供竞技准备、生存本地拾取和结算回看统一消费。示例只表示稳定推荐练习点，不读取玩家坐标、不声称玩家当前位于该段，也不改变地图路线、供给、复活或成长证据。
- 竞技详情学习接力增量：`P5.3zzzk-competitive-detail-learning-continuity-code-written-not-run`。武器详情既有`map-consequences`与地图详情既有`weapon-consequences`增加可选竞技学习上下文；当前模式明确为1v1或竞速时，宿主显式提交当前武器与地图Definition并复用共享具体练习摘要。未选模式或生存时仍返回原通用详情，不承诺预选武器。上下文精确限制三个数据字段，并拒绝额外字段、访问器、目录身份漂移、武器/地图错配和生存模式。
- 快速开始当前组合可读性增量：`P5.3zzzl-quick-start-current-loadout-readability-code-written-not-run`。模式选择页不增加首屏字段、页面或点击，只扩展既有`preparation-entry`延后字段：1v1/竞速在直接开始前显示“当前武器 × 当前地图”，生存只显示当前地图并明确默认空手。该字段使用已经通过Definition校验的中文名，不反向选择内容，也不改变两次主要点击预算。
- 生存持续武器×地图焦点增量：`P5.3zzzm-persistent-survival-weapon-map-focus-code-written-not-run`。本地真实持有武器时，既有`local-weapon`状态行复用共享投影，在可见短句末尾只保留最高优先地形“练X”；读屏说明保留最多两个“地形（第N段·路段名）”。空手不显示，换武器随权威持有状态同步更新。拾取/替换事件仍负责完整即时提示，持续行不新增反馈项、HUD区域、计时器或位置判断。
- 持续学习文本适配与消费者闭合增量：`P5.3zzzn-persistent-learning-text-fit-and-consumer-closure-code-written-not-run`。现有`hud:local:local-weapon`继续固定单行，窄屏超宽时复用共享Canvas Painter的实测文字宽度与省略号，不增加第二套截断器；完整武器、操作与最多两个具体路段仅在无障碍文本中保留且不截断。共享投影合同补齐竞技武器详情、竞技地图详情、竞技准备、生存拾取/替换、生存持续持有与结算六个消费位置。没有修改HUD几何、页面、点击、触控、输入或Authority。
- 竞速下一段当前武器学习增量：`P5.3zzzo-race-next-segment-current-weapon-learning-code-written-not-run`。内容目录公开唯一的路段类型→武器地形匹配判定；共享路段投影只接受完整武器Definition、地图Definition、下一路段Definition与序号。竞速HUD用唯一规范化函数兼容权威读模型中的收藏短ID，并校验地图名与路段名未漂移；真实匹配时在现有`race-route-target`单行末尾追加“练X”，不匹配、空手、终点或已完成时不显示。没有读取玩家坐标、推断当前位置、新增HUD事实、页面、按键或Authority。
- 1v1持续武器×地图学习增量：`P5.3zzzp-duel-persistent-current-weapon-learning-code-written-not-run`。Duel HUD ViewModel从权威Frame的地图Definition解析同一内容目录身份，未知地图失败关闭；当本地参与者实际持有武器时，既有`local-weapon`单行只追加一个主练地形，完整地图和最多两个具体路段仅进入读屏。显示名漂移失败关闭，Race不重复使用地图级持续文案。没有新增HUD事实、页面、输入、规则或Authority。
- 正式Web Registry接线增量：`P5.3zh-registry-backed-formal-web-composition-code-written-not-run`。隔离正式Web Composition新增显式Registry-backed创建路径，默认开发入口仍保持断开；Surface Binding可把Local Host销毁委托给Registry最外层Owner，避免只清理局部宿主而遗留promotion/bootstrap。单把晋级操作只在信息页且没有活动对局时开放，快照公开active revision、snapshot hash与武器池；当前局保持原快照，晋级只影响下一场。未运行测试、类型、构建、浏览器或设备。
- 武器逐项可用性增量：`P5.3zi-partial-registry-weapon-selection-availability-code-written-not-run`。通用选择RenderPlan为每一项增加可选的`available/unavailableReason`闭包，禁用项使用既有muted视觉、不可聚焦/不可点击且读屏说明原因；旧投影不提供字段时保持全可用。Registry-backed局外武器页继续显示20把收藏信息，但只允许active子集成为当前装备；未激活下一目标进入武器目录而非错误详情或非法loadout。未新增页面、输入、规则写入或默认入口。
- 武器晋级后未收藏提示增量：`P5.3zzzq-registry-playable-not-collected-information-projection-code-written-not-run`。单把Registry晋级完成后，正式Web只把Local Owner已经发布的`newlyPlayable=true / newlyCollected=false`只读事实交给Information Binding；下一次正常信息页渲染时，武器目录原位改写`p6-learning-profile / next-unowned`，保留Owner、字段ID与字段总数。当前提交后Profile已经收藏该武器时恢复原文案，Presentation不读取或比较Registry重新判定晋级。Registry维护方法只返回成功投影，不主动重绘、不调用表现失败关闭，避免纯展示失败反向销毁已经成功的Registry结果。
- 终局武器与地图使用事实增量：`P5.3zj-product-result-equipment-usage-read-projection-code-written-not-run`。本地三模式Host从终局Session snapshot验证并缓存完整Product Match Result V3，与step内Mode Result及本地participant做身份闭合。结算页既有`full-match-record`槽由Product Result owner单写入，先显示权威`selectedMapDefinitionId`对应的本局地图，再显示完整V6 ActionStarted事件已聚合的本地武器使用事实与一条下局练习焦点；Learning owner仅保留`earned-progress / next-goal / collection-change`，不再与Product Result重复拥有字段。正式目录内地图使用中文名，未知但合法的权威地图保留Definition ID而不猜名称；空武器记录仍明确显示未使用。ModeResult schema、页面数、字段数、动作和默认入口均不变，所有验证继续顺延。
- 跳跃权威可用性反馈增量：`P5.3zk-authoritative-jump-availability-touch-feedback-code-written-not-run`。新增独立V1只读capability，由Duel MatchCore与Race/Survival各自唯一Movement owner基于正式Character Definition、grounded、已用空中跳、模式阶段、硬直及重生/在场状态生成；没有扩写MatchReadFrame V3的exact localAction sidecar。真实三模式authority可选发布该字段，旧verification authority继续以缺字段表示能力未接入，绝不返回`null`伪装公开值。正式Web只裁剪tick/local participant/state并驱动jump的`unknown / ready / blocked`共享Token；blocked仍接受原始jump输入。开局与逐step同源刷新，information、pause、hide、解绑、失败和dispose清回unknown；不读取墙钟、不猜最近落地、不新增按键或默认入口。
- 结算主研究推进反馈增量：`P5.3zl-exact-main-research-settlement-feedback-code-written-not-run`。结算页仍只使用Learning既有`earned-progress / collection-change`字段：成功提交且本局真实推进唯一主研究武器时，以Profile Definition稳定序号显示“本局完成1次有效主研究、当前N/120、下一30/60/90/120里程碑及还差N次”，达到120明确“已完成收藏”；duplicate、未结算及封顶后未再产生研究增量的对局不重复展示本局推进。投影同时闭合settlement与当前Profile revision，不从Product Result、UI或本局其他使用武器猜测研究归属。
- 三模式个人最佳精确反馈增量：`P5.3zm-three-mode-exact-personal-best-settlement-feedback-code-written-not-run`。Learning结算新增同一Grant的`sourceModeDefinitionId`并与Profile Definition、提交后Profile mode record闭合；仅Reducer真实发布`personal-best`时，既有`earned-progress`显示常规1v1最快胜利、竞速最快到达或生存最长坚持的`MM:SS`。主研究精确进度保持第一优先，个人最佳为第二优先；duplicate、未结算、Duel失败、Race未完成和缺少best记录不伪造新纪录，仍无第4个结果字段。
- 首页与结算长期进度可读布局增量：`P5.3zzzv-home-and-result-long-progress-readable-layout-code-written-not-run`。共享Layout/RenderPlan只对现有`home/recent-records`和`result-reward/earned-progress`按字段文字宽度确定卡高与行数；首页将已有累计、模式、武器、地图和挑战摘要分行，结算把每条上游实际回执原样分行。短文维持88/96px；长文在既有4096码点输入边界内为全部内容保留行数并交给纵向滚动，不另设更小截断门。DOM/Canvas消费同一几何和显式换行，完整accessibilityText保持一个语义。零新增字段、primitive、容器、页面、按钮、事实算法、资源或默认入口。
- 结算阶段与收藏完整回执增量：`P5.3zzzva-result-collection-change-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`result-reward/collection-change`，只把上游已生成的武器里程碑、地图里程碑与新收藏文本按原分号换行；短文继续保持58/68px，长文按双视口文字宽度扩展原卡并进入既有纵向滚动。字段、primitive、页面、按钮、事实算法、资源与默认入口均为零增量；nextGoal仍只消费同一次已验证事实，本批不读取目录或复制完成算法。
- 完整对局记录可读布局增量：`P5.3zzzvb-full-match-record-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`result-reward/full-match-record`，完整保留Product Result Owner已经投影的地图、最多20把本地武器使用事实、单一主复盘与下一局练习点；表现层仅按原分号换行和扩展58/68px原卡，不读取武器目录、不选择复盘对象、不推导表现结论。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 经验明细可读布局增量：`P5.3zzzvd-reward-breakdown-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`result-reward/reward-breakdown`，完整保留Reward Owner已计算的模式规则原因、请求经验、封顶实际入账和重复结算说明；Presentation只按原分号换行并扩展58/68px原卡，不读取Reward Definition、不重新计算经验或判断提交状态。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 地图详情完整路线可读布局增量：`P5.3zzzve-map-full-route-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`map-detail/full-route`，完整保留地图Owner已经投影的12/8段路线与危险统计；Presentation只按原有` → `顺序换行并扩展58/68px原卡，不读取地图Definition、不计算段数、不解释危险或重排路线。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 地图详情武器影响可读布局增量：`P5.3zzzvf-map-weapon-consequences-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`map-detail/weapon-consequences`，完整保留地图详情Owner给出的地标顺序、供给/落点影响与可选竞技学习建议；Presentation只按原中文句号顺序换行并扩展58/68px原卡，不读取地图/武器Definition、不选择建议或推导战斗事实。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 武器详情地图后果可读布局增量：`P5.3zzzvg-weapon-map-consequences-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`weapon-detail/map-consequences`，完整保留武器详情Owner给出的学习问题、三模式地图影响与可选竞技地图建议；Presentation只在原分号后换行、保留分号并扩展58/68px原卡，不读取地图/武器Definition、不选择建议或推导规则。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 武器详情完整研究旅程可读布局增量：`P5.3zzzvh-weapon-record-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`weapon-detail/weapon-record`，完整保留Learning Owner给出的收藏状态、主研究阶段、下一情境、五情境证据、全武器主研究与全部情境旅程；Presentation只在原分号后换行、保留分号并扩展58/68px原卡，不解析进度、不选择下一目标或情境。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 地图详情完整研究与熟练旅程可读布局增量：`P5.3zzzvi-map-mode-records-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`map-detail/mode-records`，完整保留Learning Owner给出的路线研究阶段、下一里程碑、单图路线理解、三模式熟练、全地图路线研究、全部路线理解与下一路段；Presentation只在原分号后换行、保留分号并扩展58/68px原卡，不解析成长、不选择里程碑或路段。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 竞技准备完整本局练法可读布局增量：`P5.3zzzvj-match-prep-weapon-map-plan-readable-layout-code-written-not-run`。同一共享Layout/RenderPlan扩展到既有`match-prep/weapon-map-plan`，完整保留准备Owner给出的武器×地图练法、长期目标、四段路线骨架、武器情境目标与下一路段；Presentation只在原分号后换行、保留分号并扩展58/68px原卡，不解析成长、路线或情境，不选择下一目标。字段、primitive、页面、按钮、资源、生命周期与默认入口均为零增量。
- 再来一局基线原子性增量：`P5.3zn-rematch-learning-baseline-preflight-code-written-not-run`。任何开局意图在Result旧代销毁或新Session创建前同步读取当前Learning Profile基线；读取失败原地拒绝。底层返回后立即以数据描述符解析`outer / information / matchStart`，真实`matchStart`先提交基线，再执行下一目标路由、留存观察等非关键后处理。底层抛错或返回畸形且可能已变更状态时保留预捕获基线并进入粘性失败关闭，业务API不再继续，只有既有`destroy()`可逆序释放；任何尚未消费的旧基线都会阻止再来一局覆盖。页面、按钮、Profile schema与默认入口均未改变。
- 命中因果收敛增量：`P5.3zo-player-perspective-hit-causality-collapse-code-written-not-run`。HUD把已有权威武器反馈改为玩家视角的“你命中/你改变落点/你击落/你被命中或击落”，只使用本地参与者身份和PublicMatchInfo名称；`attack-evaded`因权威合同不携带目标身份，只明确显示“攻击未命中”，不猜测是谁完成闪避。同一批事件中，当`WeaponFeedbackResolved`与`ParticipantFell`的目标、掉落tick、原因和归因攻击者完全一致时，只保留前者作为命中VFX、音效、文字的单一因果提示。环境掉落、无法完全匹配的掉落和独立模式事件继续保留；不修改Core事件、击落判定、奖励、输入或队列预算。
- 武器情境即时学习增量：`P5.3zp-weapon-and-action-context-hit-copy-code-written-not-run`。二十武器HUD适配器在完成权威事件与通用玩家视角文案一致性校验后，为已登记武器命中标题增加同一目录的中文武器名与“地面/空中”上下文，例如“重锤·地面：你击落了对手”；VFX、音频、方向、队列与生命周期仍由原owner负责。移动掉落和空手攻击保持通用文案，不从动画或位置猜测武器身份。
- 二十武器权威阶段姿态增量：`P5.3zq-twenty-weapon-authority-phase-pose-language-code-written-not-run`。二十份既有武器附件不再共用同一组起手/释放/收招旋转缩放；每把武器按自身轻重、攻击轴与反制语义登记三阶段静态姿态，重锤/重斧强调长起手与低位收招，长枪/路径弓强调细长释放轴，双扇/侧翼刃保留非对称展开。姿态只读已有`participant.action.phase`，低动效保留基础轮廓而不动；不增加骨骼动画、粒子、draw call、贴图、输入或命中权威。
- 局外收藏与局内命中战斗语法同源增量：`P5.3zqv-weapon-collection-and-hit-vfx-combat-grammar-identity-code-written-not-run`。二十武器VFX resolution直接消费A5/A6唯一`ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1`，每把地面/空中样式携带同一source content hash、动作Definition、coreVerb、failureRisk与counterInputs；正式Three样式再次按唯一源逐值复算，并强制六个family shape与六类coreVerb双向闭合。20个接触轮廓保留独立差异但不能与family矛盾；movement-fall没有武器grammar。任何漂移在样式或资源提交前失败关闭。没有新增层、粒子、draw call、纹理、动作、输入、页面或Owner，3项同屏/96粒子/2x overdraw及reduced-motion、静音、生命周期保持。状态`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- P5.3zqv目录键纠偏与首轮红证据：2026-08-24 首轮`npm run check:documentation`在VFX解析模块加载期暴露正式`weaponDefinitionId`与读取/Cue `catalogId`的跨投影身份键错配；修复后唯一语法源同时以两种既有稳定身份发布，但VFX只用`catalogId`定位，仍向下游返回同一正式Definition动作身份。20把×ground/aerial的40项回归逐项组装既有Cue并核对深冻结语法身份；两份直接Vitest规格共8项、受影响包定向构建、复跑文档检查和应用类型检查均通过。未新增或替换任何正式纹理、Three槽位、资产加载、Cue、页面、动作或默认Surface，所有正式资产批准与浏览器/设备验证仍为`not-run`。
- 局外收藏与局内命中音频语法同源增量：`P5.3zqw-weapon-collection-and-impact-audio-combat-grammar-identity-code-written-not-run`。正式Audio Cue resolver不再维护20武器字符串token，也不再用`actionDefinitionId.includes()`猜媒体语义；它以消费者中性别名直接引用A5/A6唯一战斗语法对象，并用既有精确Action read binding闭合20把×地面/空中40项`sourceContentHash / weaponDefinitionId / context / actionDefinitionId / coreVerb / failureRisk / counterInputs`，既有400个生存等级动作别名也只经精确绑定归一到这40项，不做字符串匹配。武器命中按精确Action Definition定位唯一武器Definition与唯一媒体记录，解析结果在播放端口前公开深冻结`combatGrammarIdentity`；武器阶段音频仍只按`weaponId + windup/release/recovery`闭合且语法身份恒为null，模式、供给、移动失足和徒手同样不得携带武器语法。98份媒体、三档确定性播放率、响度、priority、8 voice、SFX→Master→limiter、ducking、加载与销毁Owner均未改；所有媒体生产批准仍为0。本批使用`.agents/skills/audio-design/SKILL.md`及其直接参考`references/adaptive-music.md`，但没有新增自适应音乐或媒体。状态`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- Three音画制作清单语义副本消除增量：`P5.3zqx-three-audiovisual-manifest-audio-combat-grammar-identity-code-written-not-run`。P4.4ab清单删除本地`AUDIO_SEMANTIC_BY_WEAPON_ID`，命中媒体只按正式Catalog的`weaponDefinitionId`精确唯一命中；每把地面/空中动作继续经同一个40项Action lookup形成深冻结`combatGrammarIdentity`，并逐项进入480个武器反馈配方。阶段60个槽、模式13个、供给4个、移动失足和徒手均明确保持语法身份`null`，禁止`includes()`或字符串token猜测。98份媒体、响度、priority、8 voice、SFX→Master→limiter、ducking、Owner、默认不可达与生产批准0项均不变。新增延期反证覆盖20×2同源、coherent substitution/future字段、非命中null、媒体计数和源码禁用猜测；状态严格`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 命中VFX明度层级增量：`P5.3zr-hit-vfx-value-hierarchy-and-opacity-preservation-code-written-not-run`。既有命中效果的亮核心继续使用additive，暗边轮廓和方向箭头改为普通透明混合，避免叠加洗白；Sprite、核心、暗边、粒子和箭头保留各自峰值透明度，再乘权威tick衰减，不再每帧被覆盖成同一亮度。该修正不增加粒子、材质、draw call、贴图、distortion或寿命。
- 命中VFX语义节奏增量：`P5.3zs-hit-vfx-semantic-timing-profiles-code-written-not-run`。普通命中收紧为18 tick，改变落点为28 tick，击落保留42 tick最长余韵，闪避警告为24 tick；每类分别定义反应段、保持段和余韵缩放，但只使用已解析的Presentation语义和权威tick。其他模式/供给Cue保留原42 tick兜底，静态动效策略不执行缩放。
- 六角色非色彩手感身份增量：`P5.2q-six-character-value-pattern-and-selection-pose-design-sheet-code-written-not-run`。六角色继续共享同一Rogue GLB、骨骼、18条动作和碰撞，不增加模型或技能；现由唯一角色视觉设计表把手感身份映射到选择页动作采样、形状轴和七个既有身体Mesh的明暗分区。均衡强调居中躯干、追风强调双腿、领航强调双臂/披风、弹簧强调竖直腿部、急先锋强调对角起步、稳步强调躯干/双臂稳定括号；实战实例与选择页预览共用同一材质Profile分区。分区只调整已克隆材质的value，不增加几何、材质数、draw call、贴图、光源或动画。`PublicMatchInfoV2.identityGlyphKey/identityPatternKey`继续只表示参与者席位身份，不能再被误写成角色手感身份；12m远景、色觉真人、A0.3和生产批准仍为红门。
- 地图体验节奏增量：`P5.2r-twenty-segment-map-experience-pacing-code-written-not-run`。两张KZ候选地图的20个既有路线段现在拥有内容层唯一体验目录：12段长图固定为两轮分支递进，8段折返图固定为方向反转锯齿；每段明确introduce/develop/twist/test/climax/release/resolution阶段、1–5强度、入口地标、引导线、记忆钩子以及竞速/生存读法。目录逐段绑定既有Route Definition入口/出口Anchor和Surface，当前段只读投影携带对应语义与体验目录hash；P5.3zzzvl在该基础上让Three以同一入口Cue的静态比例/朝向/高度/倾斜消费既有`guidanceShape / riskShape`，仍不新建Geometry/Material、不修改碰撞、路线、随机、胜负或方向+跳跃输入。全部代码与待运行测试已落盘，浏览器/真机节奏、视线、地标辨识和性能证据顺延。
- 武器拾取即学习增量：`P5.3zt-local-weapon-pickup-operation-learning-code-written-not-run`。20把武器的信息目录由同一Action Definition补出`press / hold-release`手势与完整commitment只读数据；武器详情首屏的地空字段先回答“按一下还是按住、何时松开/自动结束、蓄势能否转向”，再说明地面与空中结果。生存中本地玩家靠近拾取/替换武器时，既有供给反馈条复用同一目录即时给出该操作提示；其他玩家拾取仍只显示战场事实，避免把他人事件变成长教程。没有训练场、弹窗、新页面、新按钮、新输入、计时器或规则分支；测试源码已补但未运行。
- 竞速下一段体验读出增量：`P5.3zu-race-next-segment-experience-read-code-written-not-run`。HUD从同一地图体验目录将当前权威`progressOrdinal`的下一段投影为“地标［节奏阶段+强度］”，详细路段名、练习句和记忆点只进入完整读出文本。该链只消费内容目录和已验证Frame，不从画面或坐标猜路线，不增加页面、按键、规则、几何体或新教程。
- 三模式当前武器操作快速读出增量：`P5.3zv-three-mode-current-weapon-operation-read-code-written-not-run`。既有“当前武器”HUD不增加新区块，只在武器名后显示“按一下/按住松开”；完整读出复用同一Action Definition目录说明蓄势时间、转向约束、自动结束和地空结果。因此常规1v1、竞速和生存都能保留三分钟基础操作读性，不再只依赖生存拾取瞬间。
- 授权依据：[ADR-119](../decisions/119-arena-v2-continuous-development-with-deferred-gates.md)。当前按开发优先连续推进，不等待测试、类型检查、构建、截图、压测、设备或真人门；所有这些状态仍是`not-run`。
- 生产边界：本批在`arena-product-content`和`arena-product-presentation`建立版本化候选，在`src/entry`放置DOM、Canvas、正式HUD Canvas、正式Web比赛宿主、本地键盘驱动和本地触控驱动等被治理精确隔离的宿主候选，在`arena-product-presentation-three`放置正式Scene resolver、GLB预加载Owner、角色Runtime、三模式相机、Three Stage和比赛Surface这一组隔离候选，并在`arena-product-composition`提供版本化导航/Mode/Learning Session宿主、generation工厂和QuickMatch Bundle候选API；包级导出只用于隔离组合，仍没有接入V1默认`ProductScreenRegistry`、默认Product Session、生产Composition、默认DOM/Canvas/Three Surface或三端入口。
- 结论边界：代码落盘只证明合同和实现入口存在，不证明可编译、可运行、无溢出、可读、性能通过或生产完成。
- 延后清单治理：`arena:p5:candidate:test`静态登记43个Vitest文件与14个Node文件。新增登记的信息选择可访问性文件覆盖模式规则入口、六角色入口、48px点击下限和唯一主动作保持；P5.3zzzq/P5.3zzzr共用已登记的武器availability投影Vitest，覆盖摘要与卡片精确改写；P5.3zzzsd登记Survival重复挑战Vitest，P5.3zzzse登记Duel/Race重复挑战Vitest；P5.3zqv新增正式VFX战斗语法同源Vitest，覆盖20×2闭包、字段/family漂移、movement-fall隔离及原预算；P5.3zqw新增正式Audio战斗语法同源Vitest，覆盖20×2精确Action查找、阶段/非武器null隔离、字符串包含替代攻击、98媒体及原voice/bus预算；P5.3zqx新增Three音画manifest同源Vitest，覆盖20份Definition精确媒体、40项语法身份、480配方引用、非命中null及本地映射/substring禁用；P5.3zzztq新增Node静态反证，覆盖正式武器绑定/持握剪影复用、生存空手、Registry失败关闭、共享资源不销毁及生产不可达状态；P5.3zzztr继续扩展同一Node文件，覆盖滚动逐帧投影、完整可见裁剪、小数CSS像素、裁剪期间保留mount、离开角色页释放及mount身份不含屏幕位置；P5.3zzzts再扩展该文件，覆盖构造阶段提前移交Owner/Renderer、孤儿Renderer保留、销毁逐项完成水位、底层Surface依赖顺序、共享角色模型/材质最内层构造债务、清理失败不丢引用与dispose拒绝重入。既有Formal Web生命周期Node反证覆盖同步provider、维护成功无主动重绘、下一次正常information渲染读取，以及selection使用同一次availability/Profile事实且不重读Registry。同时保留Product Result V3、Formal Web显式Mode Registry纯前置适配器、共享视觉Token、Presentation Runtime/Three基础端口、正式GLTF冻结/受击方向，以及HUD、镜头、角色反馈、Web音频、顶层生命周期和Pointer Surface候选测试。全部状态为`code-written-not-run / validationStatus=not-run`。

- P5.3zzzr新开放武器卡片增量：`P5.3zzzr-newly-playable-weapon-card-marker-code-written-not-run`。武器索引页在建立既有20项selection后，复用P5.3zzzq的同一availability fact解析和当前Profile收藏目录；只有精确目标卡已在active pool且未收藏时，才给该卡既有description原位加“新开放 · 已可用未收藏 ·”前缀。kind、selectedId、项数、ID、顺序、label、available/unavailableReason均不改，null fact或当前已收藏恢复原selection。不重读Registry、不比较快照、不新增字段/页面/按钮/动作/输入，不主动重绘；下一次正常信息页渲染可见。
- P5.3zzzr延后清单仍为32个Vitest+11个Node，不新增重复登记。已登记的武器availability投影Vitest同文件扩展卡片精确标记、已收藏/null恢复、未激活目标、身份/hash/revision/连续前缀与恶意字段反证；既有Formal Web生命周期Node文件扩展“先建立selection、再用同一value事实与Profile收藏投影、不重读Registry”源码反证。

## 2. 批次与输出

| 批次 | 当前状态 | 已落盘开发输出 | 仍需补齐 |
|---|---|---|---|
| P5.0 十一页面合同与导航 | 静态候选已落盘 | 精确11个页面、固定顺序、7种模板、每页1个问题/1个主动作/首屏1–3项；单写入导航Session闭合加载→首页、首页两主点击开局、可选角色/准备、Match→结算→再来/下一目标、声明链接和四槽底导航；Product Session投影只读实际模式和三模式真实终局；结算首屏直接显示具体收藏/情境/路线/模式/挑战/最佳进度，隔离正式Web默认用唯一主按钮复玩并保留当前模式/武器/地图，显式配置仍可进入唯一下一目标 | 失败注入与运行验证 |
| P5.0d 三模式权威信息宿主 | 代码已落盘，未执行 | ModeAuthoritative QuickMatch V3将Duel/Race/Survival真实runtime、精确阵容与内容、PublicMatchInfo V2和终局Replay身份组合成generation Bundle；11页Host直接消费该Factory，终局固定先Mode Reward后Learning Grant；新增本地顶层owner原子构造Reward/Learning Profile、XP Registry和Playable Host，从同一终局Session snapshot验证并缓存完整Product Match Result V3与本地participant，结算页只读复用Mode Result和权威武器使用事实，反向清理Playable/HUD消费者→恢复与观察→双Profile，最外层再释放Match媒体生产者 | 默认Composition/导航仍断开；实际信息Surface、测试/设备/性能均未运行 |
| P2.0g-C1 Formal Web显式Mode Registry纯前置适配器 | 代码与未运行测试源码已落盘 | 适配器严格接收`modeRegistryCandidate / raceParticipantCount / survivalEnemyCount`并原样委托P2.0g-A唯一preflight；输出直接复用深冻结身份摘要，不返回Registry或授权token，不读取seed/Profile/storage/DOM/Three/audio/loader，也不换算Survival总参与者数 | `adapterWired=true`，并由后续C2显式顶层消费；默认Registry/Composition/Entry与runtime Policy消费仍为false，类型、构建、浏览器和设备证据顺延 |
| P2.0g-C2 Formal Web顶层显式Mode Registry预检 | 代码与未运行测试源码已落盘 | 显式候选与Race/Survival人数在`hostRoot`、DOM、storage/Profile/seed和表现资源前完成C1纯预检，原值继续透传Local Host重检；摘要不作为授权token | `topLevelConsumerWired=true`；默认Registry/Composition/Entry与runtime Policy消费仍为false，默认开发入口不传该选项，全部运行证据顺延 |
| P5.1 局外同源模型 | 静态候选已落盘 | 中文消息目录、字段闭包、DOM/Canvas共用RenderModel、安全区布局、48px主动作、4槽底部信息入口、窄屏纵向滚动；Content/Profile/Result字段owner显式合并且冲突失败关闭 | 生产宿主Composition与默认导航、长文本/字体/焦点/语义运行证据 |
| P5.1a 具体内容阅读投影 | 代码已落盘，未执行 | 20把武器名称、学习问题、地面/空中结果、Definition真实距离/覆盖、由正式60Hz调优换算的动作秒数、反制与三模式地图情境；2张KZ地图共20段的名称、教学目标、危险角色、复活秒数、分支、供给和难度；收藏列表与武器/地图详情的`p5-content`字段投影 | 默认Surface接线、长文折叠/搜索/筛选、浏览器与真机可读性 |
| P5.1b 宿主无关Surface消费 | 静态候选已落盘 | 同一RenderPlan可生成惰性DOM节点模型或通过最小2D端口绘制Canvas；Canvas有中文逐字换行、最大行数、省略和滚动裁切；DOM模型有heading/status/button语义、aria-live、禁用原因、稳定绝对布局和菜单`pan-y`；Pointer/Enter/Space/有界滚动统一输出Intent结果 | 字体测量、截图、屏幕阅读器和设备交互均未运行 |
| P5.1c 隔离Web DOM/Canvas宿主 | 静态候选已落盘 | DOM按primitive ID复用节点，使用`textContent`、line-clamp、tabular numerics和aria-live；Canvas拥有显式viewport、DPR上限2、同步2D绘制、隐形live region；两者Pointer tap/drag分离、cancel/lostcapture/blur/hidden清理、键盘/wheel和load/render/bind/dispose生命周期闭合；Canvas Tab可遍历选择卡、主动作和底导航，自动滚动到屏外焦点并绘制焦点框 | 两个文件均未被默认入口导入；真实浏览器、字体、触控、焦点环、连续render CPU/内存均未运行 |
| P5.1d–i 十一页面Pipeline、真实owner、隔离绑定与内容选择 | 代码已落盘，未执行 | 单函数闭合`owner fields → ViewModel → RenderModel → Layout → RenderPlan`；本地三模式Host按当前导航revision合并加载、模式/准备、Product Session/真实赛果、Reward/Learning Profile及20武器/2图/20段阅读目录；隔离Surface binding拥有Host、信息Surface和可选比赛Surface的完整生命周期，底部导航、模式/角色/武器/地图选择及信息/对局切换共用同一失败关闭边界；六角色保持同操作合同并冻结到三模式权威runtime；20把武器的当前选择不再只是卡片高亮，Duel/Race在每次开局冻结一把对称武器；两张地图选择会冻结到1v1、竞速与生存权威runtime；Survival仍空手开局且只从世界掉落拾取替换 | 默认生产入口仍断开；正式资产、连续切页、错误注入和性能证据未完成 |
| P5.1j 固定tick本地键盘驱动 | 代码已落盘，未执行 | HUD审计投影向上只读公开generation、当前tick和本地participant；驱动用平台帧只计算需推进的固定tick数，每个tick重新读取权威上下文并提交InputFrame；只支持WASD/方向键、空格、J/E三类操作，明确永远不生成格挡、蹲伏或下砸；暂停、恢复、终局结算、换代和销毁均清空按键状态 | 尚未接默认入口；浏览器键盘、后台切换、追赶上限和生命周期测试顺延 |
| P5.1k 固定tick本地触控驱动 | 代码已落盘，未执行 | 复用移动区、跳跃键和主攻击键的原始触控状态，但改用V2三概念Mapper，拖动动作键也永远不生成下砸；Pointer输入、resize与前后台生命周期由平台端口注入，隐藏时暂停权威对局、显示时只恢复由隐藏触发的暂停；固定tick、换代和失败清理与键盘链一致；隔离Web顶层现可自适应选择键盘或触控，并显示移动/跳跃/攻击三个控制提示 | 尚未接微信/抖音入口或默认Web入口；多指、前后台、尺寸变化、连续采样和生命周期测试顺延 |
| P5.2 三模式HUD、Scene只读投影与正式比赛Surface | 代码已落盘，未执行 | 经审计MatchReadFrame V3投影Duel/Race/Survival、固定宽玩家时间、本地生命/武器/冷却、竞速名次与重生、生存stage/敌人/掉落、最多3个供给world anchor与权威remainingTicks；显式合并PublicMatchInfo V2，1v1固定2名、竞速2–4名、生存1名player，文字同时显示名称和唯一序号，并保留glyph/pattern键；HUD epoch现同时返回持续RenderModel与有界反馈；同一Validated Projection同时产出renderer-neutral Scene Read Frame，保留角色/装备/地图/位置/动作权威身份及已审计local action sidecar，只把V6武器反馈映射为表现Cue；Information Host另以只读方法返回同一Scene，供生产不可达的P6输入探针读取当前事实，不新增第二份Frame投影；正式Scene resolver现可解析6个共享骨骼/差异材质的可玩角色、单一敌人、20件已固定来源的武器附件候选和2张项目自制静态地图GLB候选；地图几何来自现有权威Surface并按表现坐标合同镜像X轴，不复制CS地图文件，运行时无程序化地图兜底；地图生成器现同步读取20段Route Definition，为基础平台/缺口/楼梯/迷宫/窄路/钢丝生成不同顶面语义和低矮入口路标，并拒绝未被段落持有的Surface；两图另分别绑定冷色纵深/青色路线光与暖色转向/琥珀路线光环境，环境只消费Map Definition ID并随Stage跨局恢复，不修改GLB、碰撞或路线；Loading Owner严格路径在逐资产生产批准完成前对GLB、OGG和PNG均零加载；隔离开发路径显式预载29份模型候选、98份音频候选（4份来源已核验intake与94份自制候选）及5份核心VFX纹理候选；正式角色Runtime克隆骨骼与实例材质、驱动18条动作并只挂显式武器附件；正式Three Stage从权威帧同步地图、角色、手持/地面武器、终局动作、tick VFX和本地武器阶段音频并拥有跨局清理；1v1全图相机与竞速/生存本地跟随相机返回稳定输入basis；Canvas HUD直接消费现有Layout/RenderPlan并保留live region，Three相机投影供给锚点且只用地图候选几何判断遮挡；正式Web Match Host组合抗锯齿Three Renderer、Web Audio、灯光、相机、HUD、VFX、预加载与比赛Surface，不拥有第二套RAF或规则；新增顶层Web Playable Composition统一拥有11页DOM、本地Profile、三模式权威Host、自适应固定tick键盘/触控Driver和正式Match Host，仍不接默认入口 | 2地图路标/环境调色/浏览器/真机验收、5份VFX候选与98份音频候选生产审批、默认入口和实际Surface证据 |
| P5.2h 隔离正式Web开发入口 | 代码已落盘，未执行 | 新增独立`arena-v2-formal-candidate.html`，直接启动顶层可玩Composition；页面显式分为Loading资产准备与用户手势激活音频两步，支持`?seed=<uint32>`可复现对局与`?input=adaptive|keyboard|pointer`切换开发输入，使用候选专用Profile命名空间和页面离开清理；构造失败时新增resize监听回滚，重复音频进入保持幂等 | 未运行开发页；不纳入默认生产build和发布清单 |
| P5.2k HUD中宽与无空间降级 | 代码已落盘，未执行 | 常规三栏布局从800px安全宽度开始，避免760–799px区间中计时器与右状态栏互相覆盖；供给栏或反馈区在输入保留区外没有足够空间时不再让整帧失败，而是返回`deferred-no-space`并暂缓对应面板，供给世界锚、反馈队列、声音与无障碍公告仍保留，尺寸恢复后可重新显示 | 390×844、横屏、极矮嵌入视口和三端实际布局均未运行 |
| P5.2l 地面武器正式可读性生命周期 | 代码已落盘，未执行 | 正式Three Stage不再直接写地面武器附件的局部旋转/缩放，而是为每个权威world equipment实例创建独立世界位置根节点，并复用与手持武器相同的20武器只读可读性Owner；根节点只跟随权威位置，子附件唯一拥有轮廓姿态、材质、低动效和静音状态；实例替换、消失、离场及构造失败均先回收可读性Owner再移除节点，asset/Definition漂移会重建且不产生拾取或命中推断 | GLB方向、地面高度、远景轮廓、浏览器/真机和性能均未运行 |
| P5.2m 收藏预览与实战轮廓同源 | 代码已落盘，未执行 | 武器目录和详情不再把20个GLB全部按原始根姿态统一展示；目录clone读取同一武器可读性档案的地面拾取Euler，详情clone读取手持Euler，再以现有包围盒归一化构图。预览只写自有clone的姿态与诊断userData，不改借入source、共享geometry/material/texture，不增加自动旋转、触控或规则推断 | 20把逐项截图、姿态校正、窄屏辨识和真实资源加载均未运行 |
| P5.2n 六角色选择正式预览挂载 | 代码已落盘，未执行 | 新增不创建Renderer/DOM/RAF的角色选择预览Mount Owner；六角色从正式Character Registry解析同一个共享骨骼GLB和各自材质Profile，使用SkeletonUtils clone、独立材质、双视口包围盒构图和静态三分之四朝向。预览按手感身份固定采样Presentation已声明动作：均衡用Idle、冲刺/快速起步用不同Run相位、空中修正/高跃用不同Jump相位、宽容落点用Land；只表达操作感觉，不增加动作能力。替换选择先完整建立新mount再回收旧mount；只释放自有Mixer、clone层级和材质，不释放共享geometry/texture，也不新增输入或程序化角色回退 | 已由P5.2p接入隔离信息Surface；方向、比例、六姿态、浏览器/真机和资源释放证据均未运行 |
| P5.2o 角色选择单次绘制表面 | 代码已落盘，未执行 | 新增只消费P5.2n mount和注入Renderer的单角色Surface；每帧固定执行resize、透明清屏、CSS顶左到WebGL左下scissor转换、一次Scene draw并立即解除借入mount父子关系。Surface不创建DOM/RAF、不推进Mixer、不增加点击，销毁只负责自有Renderer，Mount仍由P5.2n回收 | 已由P5.2p接入隔离信息Surface；Renderer调用、坐标、透明叠加、失败回收和GPU证据均未运行 |
| P5.2p 角色预览接入信息Surface | 代码已落盘，未执行 | 角色选择RenderPlan在双固定视口为当前角色预留一个稳定正式预览槽，六张既有选择卡排列在其后；顶层隔离Web组合在角色页首次完整可见时才创建透明Three Renderer，读取同一选择投影并绘制当前角色。P5.3zzztr已把滚动位置改为逐帧投影：离开完整可见区隐藏但保留mount，重新完整可见直接绘制，真正离开角色页才释放clone；不增加页面、按钮、输入、RAF或墙钟动画。信息Surface最终仍先销毁角色clone和自有材质，再销毁Match Host及共享预加载资产 | 角色预览与收藏预览目前各自惰性持有Renderer且页面上不会同时显示；连续切换、滚动边界、浏览器/真机、GPU内存和性能均顺延未运行 |
| P5.2q 六角色视觉设计表与明暗分区 | 代码已落盘，未执行 | 角色可读性目录把六种手感的中文设计意图、既有Idle/Run/Jump/Land采样和六种唯一明暗分区绑定到正式Material Profile；GLTF实例在材质克隆时按稳定Mesh名应用0.5..1的value倍率，要求七部件完整命中且将分区身份写入实例。选择页与实战共用同一构造函数，角色色彩不再是近中景唯一身份；席位glyph/pattern仍只区分参与者，不冒充角色身份 | 未运行真实GLB加载、六姿态、黑白/色觉、两图灯光、0/5/12m、浏览器、设备、真人或性能；六者仍没有不同外轮廓，A0.3与正式资产批准保持关闭 |
| P5.3zzztq 选角首屏模式装备剪影 | 代码已落盘，未执行 | Local Host发布狭窄只读模式/角色/开局武器；1v1/竞速复用正式20武器asset binding、首屏持握Euler/缩放与角色挂点，生存强制空手；角色和武器同一bounds取景，Registry/身份/模式漂移绘制前失败关闭 | 正式资产批准、真实GLB、持握穿插、0/5/12m剪影、390×844/1440×900、浏览器、设备、真人与性能均顺延 |
| P5.3zzztr 选角正式预览滚动投影与生命周期 | 代码已落盘，未执行 | mount身份只保留角色/模式/武器/资源、视口与预览尺寸，屏幕位置改由Renderer逐帧接收；仅在预览矩形完整进入内容裁剪区时读取Profile/装备并绘制，部分/全部裁剪时隐藏、跳过这些读取但保留角色与武器mount，真正离开角色页才释放clone | 滚动连续性、裁剪边界、回页重建、双视口、浏览器、GPU内存、设备和性能均顺延；不新增RAF、输入、页面、按钮或Authority |
| P5.3zzzts 选角预览构造/销毁可重试所有权 | 代码已落盘，未执行 | mount Owner在工厂返回后立即移交字段；Renderer在Surface接管前由孤儿引用持有，接管后才清空。dispose按隐藏、解绑、Render Surface/Renderer、mount、底层Surface的依赖顺序逐项提交完成水位，只有成功才清引用；共享角色模型/材质构造中途的清理债务也由Preview Owner或正式角色Factory持有。外层Binding只在信息Surface释放后销毁比赛Surface，再销毁共享Host/预加载资产，全部完成才进入disposed；失败状态可用同一实例重试且拒绝重入 | 构造注错、平台dispose抛错、重复销毁、浏览器/GPU和内存证据顺延；不改变预览画面、页面、输入、规则、Authority或默认入口 |
| P5.2r / P5.3zzzvl 两图20段体验节奏目录与既有路标形状消费 | 代码与未运行测试源码已落盘 | 内容层逐段冻结两轮分支递进/折返锯齿节奏、1–5强度、地标、引导线、记忆钩子和竞速/生存读法；投影只按精确支撑Surface解析当前段并携带目录hash，Three以单一6×4 Resolver重塑GLB既有入口Cue且记录当前节奏/引导/风险身份 | 未运行类型、测试、地图资产再生成、浏览器、真机、真人路线理解或性能；不改变权威Route、Surface、碰撞、输入或默认入口 |
| P5.3zt 本地武器拾取操作学习 | 代码与未运行测试源码已落盘 | 20武器阅读目录显式投影按下/按住松开手势和Definition commitment；武器详情及本地拾取/替换反馈说明手势与地空差异，远端拾取保持简洁 | 未运行20把文案、反馈拥塞、窄屏、读屏、浏览器、设备或真人3分钟理解；不增加训练场、弹窗、页面、输入或Authority |
| P5.3zu 竞速下一段地标/节奏/强度读出 | 代码与未运行测试源码已落盘 | 当前权威路线进度单向选中内容目录中的下一段；HUD简短显示地标、体验阶段和1–5强度，完整读出保留路段名、练习句和记忆点 | 未运行两图20段逐段、窄屏、长文、读屏、浏览器、设备或真人理解；不增加路线规则、几何、页面、按键或默认入口 |
| P5.3zv 三模式当前武器操作快速读出 | 代码与未运行测试源码已落盘 | 现有武器名后只补“按一下/按住松开”，完整读出复用同一Action Definition操作、蓄势和地空结果；三种模式共用同一路径 | 未运行20武器、持有/替换、窄屏、读屏、浏览器、设备或真人3分钟理解；不增加HUD区块、页面、按键、规则或默认入口 |
| P5.3zw 命中反馈完整身份不可变 | 代码与未运行测试源码已落盘 | 二十武器HUD Host以确定性数据哈希冻结同一反馈ID的完整武器读取计划、权威反馈事件与V2方向事实；徒手反馈沿用同一身份规则。同批重复ID、武器/徒手身份互换、跨帧计划/事件/方向漂移都在调用音画端口前失败关闭，epoch切换、队列移除、clear和dispose同步释放身份 | 未运行重复/漂移/恢复/拥塞、类型、构建、浏览器、设备或性能验证；不改变命中、方向、队列、VFX/音频预算、规则、输入或默认入口 |
| P5.3zy 音频迟到ended回调身份隔离 | 代码与未运行源码反证已落盘 | 正式Web Audio释放voice时同时核对`sourceEventId`与原`ActiveVoice`对象；stop、启动失败和`ended`回调都携带同一对象身份。旧voice在切局/stopAll后迟到的`ended`即使遇到下一局复用同一事件ID，也不能删除或断开替代voice | 未运行真实Web Audio时序、切局、同ID复用、8声淘汰、浏览器、设备或性能验证；不改变Cue、音量、优先级、总线、玩法规则或默认入口 |
| P5.3zz Match Host迟到音频激活隔离 | 代码与未运行源码反证已落盘 | 正式Match Host只在状态仍为`preloaded`时接受音频激活完成；若加载期间已被销毁或失败关闭，迟到的完成/失败只拒绝原调用，不再次进入`#fail()`、不重复清理，也不能把已关闭Host重新作为可用实例返回 | 未运行销毁竞态、激活失败、页面快速离开、浏览器后台、设备或性能验证；不改变音频资产、用户手势门、对局状态、玩法规则或默认入口 |
| P5.3 最终反馈 | P5.3/P5.3a静态候选已落盘 | 五类武器反馈、Supply Adapter Cue、掉落归因、重生、安全锚、终点、敌人压力、两次生存掉落和终局的只读文字/视觉/音频Cue；权威tick驱动队列保留12条/显示3条/seen 64条，按语义与本地视角有界保留，同一事件声音和live announcement只发一次；三个视觉槽不扩张，本地武器命中/受击若仅被更高价值结果挤出视觉，仍可在现有8 voice预算内播放既有Cue，纯远端溢出不扩播；同步Audio/VFX端口消费者按revision幂等协调present/remove/play，失败时clear/stopAll并关闭；武器反馈全链保留权威actionDefinitionId，正式音频resolver已将空手与3把武器映射到4份来源intake已核验但生产未批准的音频，其余17把武器映射到各自未批准的固定OGG候选；20把武器另各登记windup/release/recovery三段未批准静态OGG候选，本地Stage只根据权威ActionStarted与action phase发声；13个模式Cue与4个供给Cue也映射到各自未批准静态OGG候选，按cueId解析且不反推权威事实；五类核心武器Visual Cue分别绑定128×128透明PNG候选，隔离Loading预载后作为Sprite叠加到有界圆环/粒子执行器；默认严格端口拒绝全部98份生产未批准音频和5份VFX纹理，且始终禁止运行时合成音频或从画面反推规则；恢复Consumer Epoch从稳定无one-shot基线建立事件水位并拒绝旧generation；生存Authority现显式输出spawn/pickup/replacement/expire独立事实流并由Presentation单向转换为Cue | 98份音频与5份VFX候选的试听/美术批准、拥塞调音、设备和真人归因 |
| P5.3l / P5.3zqv 二十武器运行时VFX形状语言与收藏语法同源 | 代码已落盘，未执行 | 480个武器专用Visual Cue不再只换身份后落入同一套通用圆环；表现层从已解析的weapon/action-context/mode/feedback读取稳定样式，20把武器分别拥有轮廓分段、宽高比、接触几何、方向箭头粗细、粒子轨迹和六类核心动词配色，地面/空中及三模式只调整表现构图。样式现再直接携带A5/A6唯一语法源的40份深冻结身份，动作、风险、反制与`coreVerb ↔ familyShape`任一漂移即关闭；movement-fall仍无武器语法。命中、表面转移、击落和闪避继续由四类结果形状主导，warning/strong继续覆盖结果层级；reduced-motion关闭粒子后仍保留武器轮廓。实现复用原有Sprite、Ring、Points与同屏3项/每项96粒子/2x overdraw预算，不新增层、不增加粒子、不推断结果或方向，也不把支撑几何冒充正式纹理资产 | 20×2语法反证与预算/生命周期测试源码已写但未运行；20武器×4结果代表截图、色盲/低动效、拥塞、GPU和真机验收均顺延；5份核心纹理仍未正式批准 |
| P5.3m 二十武器三阶段动作音频 | 代码与60份候选已落盘，未执行 | 从20份已登记武器命中音频分别制作短windup、release、recovery静态OGG候选，形成60个固定asset/cue/hash身份；正式音频目录、Loading预载、resolver和Three Stage已接通。Stage只追踪本地玩家，并且只有观察到权威`ActionStarted`后才把权威`participant.action.phase`映射为三次one-shot；半局恢复缺开始事件时静默，重复帧幂等，静音期间推进但不补播，不从动画、墙钟、命中或方向反推。release为priority 2/-3dB，windup/recovery为priority 1/-6dB，继续共用8 voice拥塞策略；离场、换局和失败清理显式调用同一Web Audio端口的`stopAll`，不依赖HUD先销毁 | 60份均未试听、未批准、未做设备响度/相位拥塞/长局生命周期验收；代码未运行，不能称为正式音频完成 |
| P5.3zg Web Audio SFX/Master总线 | 代码已落盘，未执行 | 全部命中、阶段、模式与供给one-shot统一经过SFX和Master Gain，再进入固定限制器；Master预留-6dB余量，8 voice和逐Cue增益保持原合同。总线由单一Web Audio owner构造、回滚、快照和销毁，不把响度、声音长度或播放结果写回权威状态 | Web Audio兼容、耳机/扬声器响度、8声拥塞、削波和销毁证据均未运行；不等于混音Final |
| P5.3n 供给武器身份反馈 | 代码已落盘，未执行 | P3权威Supply Fact原本已有runtime/collection Equipment与强化等级，但通用Supply Cue会丢弃这些Arena V2专用事实。新增Arena V2表现Cue在不修改共享P1合同的前提下保留三项身份；HUD的刷新、拾取、替换和过期反馈现在明确显示20把武器中文名与`Lv.N`，其他玩家优先使用PublicMatchInfo名称和序号。声音与VFX仍消费原有四类供给Cue，不从文案、场景消失或当前持有状态反推拾取 | 文案拥塞、长名称、屏幕阅读器、真实生存供给和设备证据均未运行；不新增音频、页面或输入 |
| P5.3o 竞速地图路段学习反馈 | 代码已落盘，未执行 | HUD从Frame中的权威地图Definition与竞速`progressOrdinal`单向解析两张正式候选地图的具体中文名、下一路段、段数与练习提示；起点指向第一段，逐段安全点指向下一段，末段指向终点，完成后显示全图闭合。`RaceSafeAnchorCommitted`反馈明确“通过第N段·路段名”并附既有练习要点，`RaceFinishClaimed`明确完成哪张地图。地图目录仍是唯一文案与顺序来源，不从世界坐标、画面、支撑面或墙钟猜测进度 | 两图20段逐段真跑、长文案、反馈拥塞、屏幕阅读器、浏览器与真机证据均未运行；不新增规则、页面、按钮或输入 |
| P5.3p 1v1对手可读性与竞速规则文案 | 代码已落盘，未执行 | 1v1模式面板从同一HUD只读参与者快照和PublicMatchInfo显示唯一对手名称、生命、在场/重生/淘汰状态与武器中文名，使玩家能判断击落压力和武器反制对象；竞速目标与地图规则文案修正为“方向+跳跃能完成全图，也可用主攻击干扰对手，掉落3秒后回安全点” | 窄屏长名称、状态切换、屏幕阅读器、真人理解与设备证据未运行；不增加训练场、格挡、页面或按键 |
| P5.3q 模式化生命/复活/机会显示 | 代码已落盘，未执行 | Duel继续显示权威生命；Race不再把运行时桥接用的固定`lives=1`误呈现为只有一次机会，而是按Race Projection显示不限次数、距离最近安全点复活的剩余tick或已完成；Survival按权威`fallCount/terminalFallCount=2`显示剩余掉落机会。只改变HUD标签与只读计算，不修改任何生命、掉落、重生或终局Authority | 三模式状态切换、重生边界tick、窄屏、读屏与设备证据均未运行 |
| P5.3r 单一武器中文名来源 | 代码已落盘，未执行 | 删除HUD内部20项手写简称表；所有已登记武器都按collection/runtime Definition身份解析P5内容目录的`nameMessageId`，再由同一中文Message Catalog输出名称。未知开发身份仍只做slug回退，不得覆盖正式20武器。供给、当前持有、1v1对手武器与收藏详情因此不再出现同武器不同简称 | 20项全量文字快照、长名称、读屏和设备证据未运行 |
| P5.3s 权威下一批补给倒计时 | 代码已落盘，未执行 | Equipment时间线从正式Supply Definition生成独立只读Cadence Snapshot，包含Mode/Supply身份、snapshot tick、下一波序号与tick、剩余tick及固定3把数量；该快照进入Survival authority状态hash，并在开局、每tick与checkpoint恢复时沿Runtime V6→Session V3→Product/Learning→Validated HUD单向传递。Runtime V6、Session V3和HUD三层都强制Survival非空且Mode/tick闭合，Duel/Race必须为null；旧ModeLocal Session V2不承诺该新增字段，因此Product V2/Learning桥只允许透传而不把它升级为必填，避免破坏旧链。HUD生存面板增加“下一批3把·N秒”，不从Marker、墙钟或Presentation常量推算 | 首波/波次边界、暂停恢复、存档续跑、V2兼容、长局、窄屏与读屏验证均未运行；测试、类型、构建、性能和设备统一顺延 |
| P5.3t 玩家可读时间文案 | 代码已落盘，未执行 | 对局剩余和生存已坚持时间以固定宽`MM:SS`展示；供给下一批、场上武器消失、竞速复活、准备阶段与武器冷却以秒展示，零冷却明确显示“就绪”。原始tick继续保留在RenderModel与权威快照中，warning阈值仍按tick判断；Presentation只引用正式60Hz调优做纯显示换算，不拥有第二套倒计时 | 秒边界、暂停/恢复、长局超过59分钟、窄屏、读屏与设备证据均未运行；测试、类型、构建和性能统一顺延 |
| P5.3u 冷却就绪单次读屏公告 | 代码已落盘，未执行 | 正式HUD Canvas只从同一RenderModel的`local-cooldown`事实识别正数到零的转换，并按`consumerEpochId + generation`去重；首次已就绪基线、逐tick倒计时、切代及暂停/clear后的新基线均不补播历史。就绪公告与既有feedback live announcements在一次原子写入中组合且最多4项，绘制或公告失败前不推进水位；pause/clear/dispose清空转换历史，不读取Authority、不创建墙钟或定时器 | 未运行Node测试、typecheck、lint、build、浏览器、读屏与设备验证；当前仍为production-unreachable候选，默认入口未接线 |
| P5.3v DOM/Canvas/HUD共享视觉值 | 代码已落盘，未执行 | 深冻结Visual Tokens V1位于RenderPlan下方，DOM、共享Canvas Painter与正式HUD世界标记只消费八种闭合tone、字体、稳定数字、圆角和描边；未来tone在绘制/节点提交前失败关闭，不创建资源或第二套规则 | 未运行测试、typecheck、lint、build、截图、浏览器、设备与真人验证；正式UI资产与默认入口仍未批准 |
| P5.3w 三概念触控视觉同源 | 代码已落盘，未执行 | `move / primary / jump`三角色、三中文标签及全部触控视觉值进入共享Visual Tokens V1；角色/tone在DOM创建前闭合，构造失败回滚自有Surface；不改触控布局、输入事件、Driver或Authority | 未运行测试、typecheck、lint、build、浏览器、截图、设备与实际触控验证；pressed态与设备手感仍待后续批次 |
| P5.3x 顶层Web组合生命周期加固 | 代码已落盘，未执行 | 音频激活单飞、同步观察者Promise拒绝收容、surface切换防重入、Journal清理失败保留所有权、构造/销毁逆序清理、首因不可被迟到异步覆盖；清理失败按原失败→清理错误顺序聚合 | 生命周期测试代码已写但未运行；类型、构建、真实异步失败注入、浏览器和设备证据均顺延 |
| P5.3y 三概念触控按下反馈与生命周期 | 代码已落盘，未执行 | `idle / pressed`成为状态级视觉唯一入口；accepted start绑定初始角色，多指按角色计数且移动不漂移；结束、取消、resize、hide、解绑、dispose和失败回滚统一清空pressed，监听器残留可重试清理；不新增操作或Authority | 测试代码已写但未运行；实际多指、浏览器事件顺序、设备手感、截图、类型、构建和性能证据全部顺延 |
| P5.3z 移动摇杆原点与方向反馈 | 代码已落盘，未执行 | 空闲外圈位于Token固定拇指区；accepted move以真实起点为视觉原点，同源归一化位移驱动内圈且不越过外圈；最早存活move pointer拥有视觉，全部清理路径复位；“移动”标签保持可见并位于内圈上层 | 测试代码已写但未运行；边缘触点遮挡、横竖屏、安全区、真实多指手感、截图、类型、构建和性能证据全部顺延 |
| P5.3za 主攻击权威可用性触控反馈 | 代码已落盘，未执行 | `Scene.localAction.channels.primary`是唯一事实源；selected/ignored/none分别裁剪为ready/blocked/blocked，开局与逐权威step更新一个复用indicator。blocked以透明度＋斜杠双通道提示，但仍接受攻击输入；同tick幂等，tick回退、participant漂移、future字段与恶意thenable失败关闭，离场/隐藏、失败/dispose回unknown；不复制Scene、规则、冷却计时或Authority | 测试代码已写但未运行；真实按钮可读性、权威刷新时序、触控手感、截图、类型、构建和性能证据全部顺延 |
| P5.3zk 跳跃权威可用性触控反馈 | 代码已落盘，未执行 | 三模式真实Authority从各自唯一Movement能力生成独立V1只读事实；正式Web将其裁剪为jump三态并复用共享Token。字段对V6 authority端口保持可选，缺字段表示未接入且公开outcome不返回null；真实Scene链要求非空并闭合tick/eventSequence/local participant。blocked不禁用输入，pause/离场/解绑/失败/dispose清回unknown | 测试源码已写但未运行；三模式真实连续/恢复、Race重生、Survival两次掉落、浏览器触控、typecheck、构建与设备证据全部顺延；默认Registry/Composition/entry仍断开 |
| P5.3zl 精确主研究结算反馈 | 代码与未运行测试源码已落盘 | 既有`earned-progress`优先展示本局唯一主研究武器的稳定序号、真实`+1`、提交后Profile的精确N/120与下一里程碑剩余次数；120时明确收藏完成。跨里程碑和新收藏仍留在既有`collection-change`，没有新增第4字段。settlement携带提交Profile revision并与当前验证后Profile闭合；普通duplicate、not-settled和封顶后的无增量提交均不伪造`+1` | 未运行普通+1、30/60/90/120、duplicate、封顶重复、恶意身份漂移、三模式结果页、再来一局、DOM/Canvas、读屏、类型、构建或设备验证；默认入口仍断开 |
| P5.3zm 三模式个人最佳精确结算反馈 | 代码与未运行测试源码已落盘 | settlement从同一Learning Grant传递来源模式身份；committed要求Profile存在同kind记录，duplicate兼容仅有历史Grant ID而没有mode record的合法导入存档。Reducer发布`personal-best`且当前best存在时，既有`earned-progress`按模式显示精确`MM:SS`；主研究/个人最佳固定为前两优先项，无新页面、字段或布局 | 未运行Duel胜负、Race完成/未完成、Survival、duplicate恢复、旧存档导入、身份漂移、读屏、三模式结果页及再来一局；默认入口仍断开 |
| P5.3zn 再来一局Learning基线预检 | 代码与未运行测试源码已落盘 | 本地三模式Host在任何会开局的导航状态变更前同步捕获Learning Profile基线；底层返回后立即解析`matchStart`，先提交基线再执行路由/留存后处理。dispatch抛错或畸形结果保留本次基线并粘性失败关闭到`destroy()`，不会继续半可用运行；旧基线只要尚未消费就阻止下一局，不依赖Grant是否已捕获 | 未运行基线读取失败、后处理抛错、畸形开局结果、旧Result代保留、首次开局、再来一局、duplicate恢复、销毁重试与三模式循环；默认入口仍断开 |
| P5.3zo 玩家视角命中因果收敛 | 代码与未运行测试源码已落盘 | 命中、落点改变、击落、闪避和移动掉落文案使用本地玩家与公开身份；武器击落事实与ParticipantFell只有在目标/tick/原因/归因四元组完全相同时折叠为一个武器因果提示，沿用既有VFX/音频/队列owner | 未运行玩家攻击/受击、竞速多人、生存匿名敌人、环境掉落、不匹配事件、恢复/拥塞、读屏、类型、构建、浏览器或设备验证；默认入口仍断开 |
| P5.3zp 命中标题携带武器与动作情境 | 代码与未运行测试源码已落盘 | 二十武器正式HUD候选从已验证Action读取绑定取得中文武器身份和地面/空中上下文，并前置到玩家视角命中标题；空手和移动掉落不伪造武器标签 | 未运行20×2上下文、三模式等级别名、长武器名、拥塞、读屏、类型、构建或设备验证；不改变命中、数值、输入、VFX/音频预算或默认入口 |
| P5.3zq 二十武器权威阶段姿态语言 | 代码与未运行测试源码已落盘 | 20把武器各自具备唯一的windup/active/recovery附件旋转与缩放姿态，在原有持握变换上叠加，只消费权威Action Phase。reduced-motion跳过所有阶段变换，地面拾取不运行攻击姿态，销毁精确恢复借用变换 | 未运行20把三阶段视觉、六角色挂点、大小地图背景、低动效、类型、浏览器、设备或性能；不增加动画Clip、特效层、粒子、贴图、按键、规则或默认入口 |
| P5.3zr 命中VFX明度层级与透明度保真 | 代码已落盘，未执行 | 正式Three VFX执行器把发光核心与有实体边界的暗边/方向分开混合，五类材质各自保留峰值后再应用tick曲线。命中仍只来自稳定Presentation Command，原有3项同屏/96粒子/2x overdraw与动效关闭合同不变 | 未运行黑/白/同色背景、三强度、低动效、类型、浏览器、设备或GPU验证；不新增特效内容或开放正式素材门 |
| P5.3zs 命中VFX语义节奏分层 | 代码已落盘，未执行 | 命中/落点改变/击落/闪避分别使用18/28/42/24 tick生命，并有独立反应、保持、余韵缩放。同一事件身份、方向事实、同屏上限、粒子和overdraw预算不变，不从强度或动画猜测结果 | 未运行逐tick曲线、重叠命中、低动效、类型、浏览器、设备或性能；不改规则、摄像机/角色冲击周期或默认入口 |
| P5.3zb 移动端安全区共享触控布局 | 代码已落盘，未执行 | 四边CSS安全区只读一次缓存并由HUD、信息、采样与触控层共享；固定动作按钮视觉/命中同中心且完整处于safe rect，idle move安全钳制、accepted move保留raw origin。inset-only resize清理ownership；空间不足、圆形重叠、尺寸漂移或无效resize均在提交新命中前失败关闭并禁用Surface | 测试代码已写但未运行；动态浏览器`env(safe-area-inset-*)`、横竖屏、刘海/圆角屏、真实多指、截图、类型、构建和性能证据全部顺延 |
| P5.3zc 正式Three命中镜头冲击 | 代码已落盘，未执行 | 稳定Presentation反馈命令驱动5/7/9 tick冲击；最多3项、recent 64项、强度/UTF-8稳定取舍、位移与zoom双封顶。相机只在既有full-map/follow模型后叠加瞬态，VFX与镜头共用同一权威方向并适配Three镜像X轴；低动效/static输出零，闪避/供给/UI不触发。宿主显式注入相机端口，VFX先清理借用状态再销毁相机owner | 测试代码已写但未运行；类型、构建、浏览器、Replay/epoch、多人叠加、眩晕舒适度、设备和性能证据全部顺延。`game-art-director`要求的两份参考文档仍缺失，保持治理红门 |
| P5.3zd 目标角色命中明度脉冲 | 代码已落盘，未执行 | hit/transfer/ring-out按明确目标驱动3/4/5 tick白亮脉冲；同目标取最大值，最多3项/recent 64项。只写角色实例自有材质并从baseline重算，不污染共享GLB；reducedMotion/static为零，不新增粒子、透明层、draw call、光源或shader。共享owner沿VFX→Stage→Character Factory单向接入，并在借用方后销毁；明确拒绝全局hit-stop | 测试代码已写但未运行；六角色材质、黑白背景、多人目标、色觉差异、reduced-motion、类型、构建、设备亮度与性能证据全部顺延 |
| P5.3ze 目标角色独立受击停顿 | 代码已落盘，未执行 | 复用P5.3zd命中身份并按2/3/4 tick给明确目标生成动画停顿；Registry按当前participant求交集，Runtime只透传boolean，GLTF View只停自身controller并继续同步权威变换与装备。snap先建姿态，解除后1x且不追赶；暂停/clear/dispose归零，低动效/static不冻结 | 测试代码已写但未运行；逐tick姿态、多人互不冻结、ring-out离场、恢复无跳帧、类型、构建、浏览器、设备手感和性能证据全部顺延 |
| P5.3zf 目标角色前/后受击动作选择 | 代码已落盘，未执行 | directional命令把归一化XZ方向加入同一目标冲击状态；最高优先事件唯一决定方向，非directional赢家不借低优先事件猜测。Character Factory缓存当前帧目标方向，创建中的View也能取得；GLTF View仅在Authority既有HITSTUN/KNOCKBACK语义下按dot阈值交给现有Hit_A/Hit_B，侧向保持默认。通用Registry只有显式V2冻结名单才透传新字段，旧普通角色View保持兼容 | 测试代码已写但未运行；六方向/多人/跨tick/remove、Hit_A/B真实Clip、类型、构建、浏览器、设备可读性、舒适度和性能证据全部顺延 |
| P5.3d 权威审计到原子HUD owner | 代码已落盘，未执行 | Session V3保留同一`readFrameAudit`并透传独立`supplyFacts`与`supplyCadence`；Product/Learning桥只转交不改写；HUD-ready Session从审计Frame、完整V6事件、显式供给事实、权威下一波节奏和PublicMatchInfo创建不透明投影；Playable Host按generation建立HUD epoch、同步消费Audio/VFX并在结算/失败时与对局共同清理 | Supply Fact/Cue/Cadence代码未运行；Surface/资产/运行证据未完成 |
| P5.4 生产接线与Final | 未开放 | 无 | P2/P3/P4对应门、生产DOM/Canvas/Three Composition、正式资产、三端、真人、性能和独立审计 |

## 3. 十一页面单一事实

页面固定为：加载、首页、模式选择、角色选择、竞技准备、生存准备、武器收藏、武器详情、地图收藏、地图详情、结算/奖励。1v1与竞速共用竞技准备；生存因空手开局、供给节奏和两次掉落使用独立准备页。

`ArenaV2InformationScreenDefinitionV1`和只读Registry固定：

1. 每页只有一个主要问题和一个主动作；首屏字段最多3项。
2. 首页主动作进入模式选择，模式选择主动作直接开始已选模式，保持两次主要点击预算。
3. 角色和准备页是可选入口，不被强塞进快速开始必经路径。
4. 武器详情只先回答距离/覆盖、时机/风险、地面/空中；反制、地图后果和个人记录延后展示。
5. 地图详情只先回答路线目标、主要危险和最佳记录；完整路线、武器后果和模式记录延后展示。
6. 底部四槽是开始、武器、地图、记录的信息入口语义；当前不虚构第12个“记录页”，也不在缺少导航Intent时制造第二套点击真相。

`ArenaV2InformationNavigationSessionV1`把上述图固化为单写入、revision保护的同步候选：页面主动作必须与当前Definition完全一致，普通链接必须由当前页面声明，底部导航只在页面允许时生效；开局后页面surface显式切为`match`，只接受外部Match完成事实回到结算页。它不保存Product Session的模式选择、角色、武器、地图、赛果或Profile，只在开局动作中消费调用方显式给出的模式；过期revision、额外字段、页面/intent漂移和非法模式准备页均在状态变更前拒绝。当前只写入源码和待执行测试，默认导航仍未接线。

`ArenaV2InformationModeSessionHostCandidateV1`进一步把导航外部命令与P6 Mode/Learning Session端口合并为一个隔离生命周期：每次开局由显式Factory接收`modeKind + generation`并创建唯一Session；运行、暂停、恢复和终局step只透传到该Session；终局仍停留在Match surface，只有`Mode Reward → Learning Grant`结算返回`settled`后才调用导航的`completeMatch`。可恢复学习写入失败保留原Match surface和同一generation供重试，不重复创建对局；不可恢复的工厂、Session、结算或跨owner转换错误会清理Session并销毁导航。Result页选择再来一局先销毁settled旧代再创建新代，选择下一目标或其他声明入口则释放旧代后回到信息页。

`ArenaV2ModeLearningSessionFactoryCandidateV1`已经补上该Host下方的实际组合层：三模式Match Bundle Factory负责构造具名Mode的Match Session、PublicInfo和Authority identity；本Factory校验generation、modeKind、modeDefinition与本地recipient闭包后，复用`createModeProductSessionCompositionV2`建立Result/Reward owner，再建立完整V6事件的Learning Terminal Handoff，最终用既有Learning Mode Session Bridge固定`Mode Reward → Learning Grant`顺序。Bundle验证、Mode组合、Handoff或Bridge任一阶段失败都会按所有权转移点清理Match/Mode/Handoff，成功后才消耗generation。`ArenaV2QuickMatchBundleFactoryCandidateV1`现在兼容原V2会话，并优先消费`ModeAuthoritativeQuickMatchServiceV3.create()`返回的selection、finalAssignment和Session；V3把Bot输入、随机流和checkpoint留在runtime owner，只把本地玩家InputFrame交给Session。Bundle严格绑定唯一human/local/recipient与PublicMatchInfo V2，终局后由Session提供真实Replay/Rule/Physics/config/content/finalHash身份；失败在所有权转移前清理Session，清理失败会保留同一所有权供destroy重试。三个候选现从`arena-product-composition`包级index导出供隔离组合使用，但默认Composition和入口仍不可达；代码和恶意边界测试仅已写入，未运行。

`ArenaThreeModeAuthoritativeInformationHostCandidateV1`进一步落下首个真实三模式顶层owner：Duel默认1名玩家+1名Bot，Race默认1名玩家+3名Bot且只允许2/3/4人，Survival默认1名玩家+16名同族敌人且只允许1/4/8/12/16敌人。它把精确Roster、角色/地图/武器内容选择、具体Duel/Race/Survival authority、QuickMatch V3、Bundle Factory、Mode/Learning generation Factory和11页Information Host串为单一路径；销毁顺序固定为先Host释放当前generation，再释放Bundle Factory。该候选从`arena-regression`包级index导出，但元数据保持`production-unreachable / defaultCompositionWired=false / defaultEntryWired=false / validationStatus=not-run`，没有成为默认页面或发布入口。

`ArenaV2HudReadyLearningModeSessionCandidateV1`补回此前在Session层被丢弃的权威Frame审计：V3 Match Session的start/step同时返回Frame与同源`readFrameAudit`，Mode Product与Learning Bridge只允许该可选字段透传；HUD-ready装饰层再用PublicMatchInfo、完整V6事件和独立`supplyFacts`创建不透明Validated Projection，不允许外部直接提供HUD Model。`ArenaThreeModeAuthoritativePlayableHostCandidateV1`拥有Information Host与Validated Presentation Host：新generation建立唯一HUD epoch，每个step同步消费投影、声音偏好与低动效偏好；终局结算后释放HUD，任何对局/投影/Audio/VFX错误同时失败关闭并尝试清理两侧。生存Authority现按spawn→expire→pickup阶段顺序显式发布生成、过期、拾取和替换事实；Presentation只做canonical Cue映射，不从Marker消失反推权威事实。该事实流拥有独立sequence，checkpoint保存下一序号，不污染V6 Replay事件序列。

同一Validated Projection现在还创建`ArenaV2MatchSceneReadFrameCandidateV1`：它再次核对Frame/PublicInfo的Mode、seed、本地身份、参与者顺序和角色Definition，向表现层只读提供地图状态、角色位置/速度/朝向/动作、世界武器、供给、Mode Projection、终局结果及同tick/同eventSequence的已审计local action sidecar；V6事件保持一事件一sequence，仅将`WeaponFeedbackResolved`替换成同sequence的`WeaponFeedbackPresented`，不复制命中裁决。Playable Host在开局和每个step都返回`scene`，Information Host也只返回同一投影内的Scene，因此Three宿主与P6隔离输入探针均无需解析深层Session outcome，也没有第二份读模型。该Scene模型不解析GLB、不选择材质、不制造程序化回退。

正式资产链现补出V2独立的Character Presentation Registry：6个可玩手感角色复用同一核验KayKit rogue骨骼、18条动作和单一轮廓，通过6个显式material profile建立珊瑚、青、紫、青柠、琥珀、蓝六种身份；这不会把角色制作扩成6套模型，也不改变三概念操作。KayKit skeleton只绑定生存单一敌人族；同一来源intake已核验的KayKit revision中的19个静态道具已转换为自包含GLB，与原round shield共同形成20个明确Equipment绑定。它们是固定来源、固定哈希的轮廓候选，不等于手持方向、语义匹配或设备美术批准。两张地图已由权威Surface生成项目自有静态GLB候选；`resolveArenaV2FormalSceneFrameCandidateV1()`只解析显式Registry并列出缺失身份，生产严格`require...()`仍要求完整资产Gate，隔离开发`require...ForIsolatedDevelopment...()`则只允许已登记但未批准的候选。两条路径都不会用方块、运行时程序化武器或旧灰盒地图代替。当前6角色、20武器、2地图、20组武器命中音频、60组武器阶段音频、17组模式/供给音频和5类核心VFX身份的登记已闭合；130项逐资产生产批准仍全部缺失，因此默认正式Three Surface继续不可达。

组合层新增`ARENA_V2_FORMAL_ASSET_CONTENT_CLOSURE_CANDIDATE_V1`，直接以六角色Definition、单一敌人族、20把Equipment、两张Map Definition、20组武器命中音频、60组武器阶段音频、17组模式/供给Cue和5类核心VFX为期望集合，与正式角色Registry、武器附件绑定、地图绑定、音频目录和VFX纹理目录逐项求差集；任何指向目录外内容的正式绑定会在模块组合时拒绝。加载页现在消费这份闭包并分别展示真实的登记数与批准数，不再依赖手工填写的概括数字。当前代码目录登记缺口为0个角色Definition绑定、0件武器附件、0张地图、0组武器命中音频身份、0组武器阶段音频身份、0组模式/供给音频身份和0类核心VFX身份；29份模型、3份外部材质纹理、98份音频及5份VFX纹理均是生产未批准候选。六角色继续只拥有1套共享轮廓，6套材质身份由正式角色Runtime实例级消费，不修改共享GLB模板。

`ArenaV2ProfileServicesOwnerCandidateV1`与`ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1`补齐隔离宿主此前要求调用方手工注入两套Profile的问题：前者在同一Storage上用独立key、双槽和租约打开Reward/Learning Service，后者内建三模式奖励Registry、稳定Mode ID、Learning Evidence和完整Playable Host，并默认从Reward Profile读取声音/低动效偏好。代码仍为包级候选，不改变默认入口。

`projectArenaV2ProductSessionInformationCandidateV1()`补齐Product Session拥有的三个动态字段：首页的`last-mode`与`quick-start`只读取当前明确模式和固定两次主点击合同；结算页`match-result`只读取真实ModeResult V3和同一终局Frame的本地participant身份，分别显示1v1胜负/平局、竞速本地名次与终点tick、生存时长/压力/两次掉落。无终局时它不提供`match-result`，不会为凑齐页面编造结果。

`projectArenaV2ModeContentInformationCandidateV1()`从组合层显式传入实际人数和生存Rule常量，补齐模式选择、角色选择、竞技准备与生存准备字段；文案固定只有方向、跳跃、主攻击，不增加格挡或额外按键。`projectArenaV2LoadingInformationCandidateV1()`独立表达输入合同、双Profile恢复和正式资产状态；当前角色、武器、地图与全部音频身份已登记，但美术批准、VFX和94份候选音频批准仍未就绪，所以默认生产加载门保持禁用；隔离开发页使用独立用户手势门，不伪造生产ready。加载诊断同时展示“登记数”和“批准数”，不再用登记冒充正式完成。

`ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1`已把上述字段与Reward/Learning Profile、武器/地图详情及收藏列表按当前导航页合并，并提供当前页共享Pipeline。`ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1`进一步把该Host绑定到任一同步DOM/Canvas Surface，拥有底部导航、模式/角色/武器/地图选择和信息/对局Surface切换；它仍是被治理白名单隔离的候选，不被默认入口导入。

P5.3k把结算收藏变化从种类级提示升级为权威提交结果中的精确变化身份：Learning reducer在原子提交前直接比较当前收藏与同一Grant，返回本局真正新增的武器Definition ID和地图Definition ID；普通重复提交及CAS读回重复均返回空变化，Presentation禁止只从新Profile反向猜测。不确定写入后的同局首次重试另由本地Host保留开局前Profile，以同一权威Grant重放原Reducer，并要求重放Profile与当前存档hash完全一致后才恢复一次原始结果投影；不一致时仍保守保留duplicate空进度。正式本地Host将这两个只读集合与grant/progress kind一并交给结果投影，结果页现在可显示“第几把武器/第几张地图”的本局新增项，并校验收藏kind与具体身份一一一致。首页、武器页和结算页的下一个目标也增加稳定目录序号、地图段落、模式或交叉挑战身份，不再只显示泛化动作句。该实现未运行，内容中文名的进一步合并和实际布局仍顺延。

本地操作链现在补出独立的`ArenaV2LocalMatchKeyboardDriverCandidateV1`。Validated HUD投影只新增本地participant与tick的只读快照，Information/Playable/Surface Host逐层透传该输入上下文，不把MatchCore、Session或可写Frame暴露给平台。驱动使用平台帧和有界累加器安排固定tick，但提交给权威层的仍只有整数tick `InputFrame`；所有二十把武器、两张地图和六个角色共用方向、跳跃、主攻击三类概念。历史Keyboard Adapter里的蹲伏/下砸合同没有接入这条V2链。驱动拥有Binding时会在构造期附加自身；Surface完成信息→对局转换并解除重入锁后同步启动驱动，避免把启动责任散落给页面回调。代码已写入但未运行，整个组合仍被候选白名单隔离，因此不构成默认生产入口。

同一合同现补齐`ArenaV2LocalMatchPointerDriverCandidateV1`。它复用平台已有的多指Pointer采样和可调控制布局，但新增`simple-three-concept-v1`映射器，动作键拖动不会隐式产生第四种下砸操作；平台resize只重算控制区，hide会清空触控并暂停权威对局，show只恢复由hide触发的暂停，不会覆盖玩家手动暂停。键盘和触控驱动是互斥的平台选择，都只能附加到一个Surface Binding，不会同时向同一participant写入。代码已写入但未运行，微信/抖音/Web触控入口仍断开。

选定武器现在与选定角色一样在开局边界冻结。Duel与Race仅允许二十武器目录中的单一Equipment Definition，参与者使用同武器保证对称，规则引擎、动作识别、装备快照与checkpoint恢复都使用该冻结Definition。Survival的负载选择不参与开局，依旧是空手并按权威供给节奏靠近拾取。准备页已使用中文角色、武器和地图名，不显示内部Definition ID。以上仍为代码已写、未运行。

地图选择也已由页面状态贯通到权威内容。首张12段基础路线与第二张8段折返路线都拥有独立Map/Route Definition、出生点、供给点、安全重生锚、Bot路径和信息页中文内容；当前选择在开局时冻结到1v1、竞速和生存。竞速按所选路线判定检查点与终点，生存按所选路线重映射三实体供给、敌人回场与玩家复活，学习证据覆盖两图全部20段，20组交叉挑战使20把武器与20个地图段各自出现一次。以上仍为代码已写、未运行。

六角色目录现固定为均衡、直线高速、空中修正、高跃、快速起步和宽容落点六种手感。六者共用碰撞体、质量、攻击输入、下砸参数和空中跳跃次数，不新增格挡或额外按键；全部从开始可用，收藏与200小时压力继续集中在武器、地图段落和跨内容挑战。角色选择立即提交Reward Profile，QuickMatch内容提供者在每次开局读取当前选择；Duel/Race双方使用同一角色Definition保证对称，Survival仅玩家使用所选Definition，敌人继续共用单一族模板。以上均为代码已写、未运行。

## 4. 同源RenderModel与布局

局外页面采用`Definition → Registry → ViewModel → RenderModel → Layout`单向链：

- ViewModel只接受页面合同要求的精确字段集合；缺项、额外项、主动作启用/禁用矛盾均失败关闭。
- Field Composition不设覆盖优先级；P5内容、P6学习Profile和赛果提供者必须声明owner，任何重复fieldId直接失败关闭。
- RenderModel只解析消息目录，不生成进度、奖励、匹配结果或导航Intent。
- Layout只生成DOM和Canvas可共同消费的安全区几何；主动作固定在底部导航上方，内容不足时不滚动，内容过长时只允许纵向滚动。
- 390×844候选使用单列首屏卡，底部4槽均按至少48px宽度约束；宽屏首屏最多3列。
- 当前只有布局代码和待执行测试，没有浏览器、截图或真机证据，因此“无页面级横向溢出”仍是待验证要求，不是已通过结论。

具体内容阅读链保持`P3/P4 Definition → arena-product-content只读目录 → P5内容投影 → owner合并器`：20把武器全部复用既有地面/空中动作和六种基础战斗动词，不复制命中规则；两张地图共20段直接引用各自KZ Route Definition，不复制路线或重生裁决。武器详情由`p5-content`只提供距离/覆盖、时机/风险、地空结果、反制和地图后果，地图详情只提供路线目标、危险、完整路线和武器后果；`weapon-record`、`best-record`和`mode-records`继续只归P6 Profile owner。当前中文长文是语义初稿，不是最终UI排版验收。

RenderPlan现在有两个宿主无关消费者：Canvas Painter只通过同步2D端口绘制纸张/墨色/珊瑚/青色的竞技UI，不拥有Canvas或Three资源；DOM Surface Model只输出节点、几何、语义和Intent数据，不读取`document/window`也不注册监听器。两者共享同一几何、48px动作、滚动边界和权威公告，不产生第二套页面规则。Pointer和键盘解析只返回UI Intent，滚动只在Layout给出的范围内钳制；宿主未来仍必须负责pointercancel、lostpointercapture、blur和visibility生命周期。

隔离的`ArenaV2InformationDomSurfaceCandidateV1`已经承担上述Web宿主生命周期：它创建专用子根、不清空宿主其他节点，按primitive ID增量复用节点，只通过`textContent`写文案；同一Pointer必须在同一主动作完成down/up才派发Intent，pointercancel、lostpointercapture、窗口blur和页面hidden都会释放捕获；dispose移除全部监听器和自有节点。该文件位于entry目录但被P5治理精确豁免为“自身可存在、其他入口不得导入”的孤立候选，`defaultEntryWired=false`，因此不构成生产接线。

隔离Canvas宿主复用同一RenderPlan和Intent Resolver：DPR被限制在0.5–2，viewport变化重置 backing store 和变换；tap才派发主动作，超过8px的拖动只滚动，wheel/drag均服从Layout上界；隐藏live region保留公告，无法挂载时失败关闭；dispose移除自有公告节点和监听器，并归还原有role、aria-label、tabIndex、touch-action、backing尺寸和CSS尺寸，不销毁宿主Canvas。`createArenaV2InformationScreenPipelineV1()`进一步把十一页共享的owner合并、文案解析、布局和RenderPlan串成单一入口，因此DOM与Canvas宿主不需要各自重做页面逻辑。

## 5. HUD权威边界

`projectArenaV2ModeHudViewModelV1()`只接受同一post-step闭包的`events / supplyCues / readFrame / readFrameAudit`：

1. MatchReadFrame V3先完成world、local sidecar、ModeProjection和SupplyProjection V3审计。
2. V6事件必须闭合Frame事件水位，tick早于post-step Frame，ID唯一，mode identity一致。
3. Supply Cue必须来自显式`ArenaSupplyAuthorityFactV1`或已验证Supply Adapter事件，HUD不比较前后Frame猜测刷新、拾取、替换或消失；Cue tick必须早于post-step Frame，独立Supply sequence不得与V6事件水位混算。
4. 生存供给最多3项，直接显示collection/runtime/level、world position和权威`remainingTicks`；不换算墙钟，不出现三选一弹窗。
5. Duel、Race、Survival只读取各自ModeProjection；UI不计算排名、压力阶段、复活时刻、第二次掉落或winner。
6. 静音只把表现audioCue置空；reduced motion只把motion policy改为static，文字、数字、原因和结果保持。
7. PublicMatchInfo V2必须与Frame的Mode、本地参与者和完整参与者集合闭合；HUD只从明确的非enemy assignment生成1–4个公开身份，竞速不从数组顺序或颜色猜玩家。
8. World Marker只接受RenderPlan已有的最多3个权威锚点；相机端口负责投影与遮挡事实，Marker适配只做安全区、48px尺寸、边缘钳制、HUD/input排斥和标记间去重，不推断距离、可拾取性或归属。

## 6. 反馈分层

| 类别 | 权威输入 | 当前表现候选 | 禁止行为 |
|---|---|---|---|
| 武器 | `WeaponFeedbackResolved` | 命中确认、落点改变、击落、被避开、移动失误 | 从位置/动画重判命中或归因 |
| 供给 | `ArenaSupplyPresentationCueV1` | 刷新、拾取、替换、生命周期消失 | 对比Frame猜测原因、用墙钟删除 |
| 模式 | V6 fall/respawn/anchor/finish/enemy/fall-count/end | 掉落来源、权威readyTick、锚点、终点、压力、1/2或2/2、终局原因 | 用声音/动画完成回写规则或挑选winner |

RenderModel按权威tick、sequence和source ID稳定排序；布局最多显示队列选出的3条，RenderModel本身不裁决过期、去重或声音次数。隔离正式Web宿主现提供预载解码voice池与tick VFX执行器，但仍未运行、未接默认入口且不关闭素材Gate。

`advanceArenaV2ModeHudFeedbackQueueV1()`现已成为RenderModel与Layout/RenderPlan之间的显式表现步骤：它只用权威tick推进，最多保留12条候选、显示3条并保存64个近期事件身份；拥塞时优先保留warning、strong以及mode事件，相同source ID若内容漂移则失败关闭。RenderPlan只消费队列本轮给出的one-shot音频与公告，不会因连续重绘重复播放；该队列不写Match、Result或Profile。

`ArenaV2ModeHudFeedbackEffectConsumerV1`只把队列输出转交同步Audio/VFX端口：相同revision重放幂等，revision/tick倒退、one-shot声音重复或同revision内容漂移都会拒绝；任一端口失败都会尝试`visual.clear()`和`audio.stopAll()`并进入失败关闭。隔离Web Host现接入Web Audio和Three VFX，VFX在Loading阶段预载5份核心反馈纹理候选；因为音频与VFX候选均未批准，正式资产状态继续为false。

武器反馈的权威`actionDefinitionId`现从V6事件一路保留到Queue和Audio Command，音频端不再只能看到泛化的`weapon-hit`。`resolveArenaV2FormalAudioCueCandidateV1()`将空手与3把武器动作映射到4份来源intake已核验但生产未批准的Kenney OGG，并将其余17把武器映射到各自的固定命中OGG候选；武器阶段Cue按`weaponId+phase`精确解析60份静态候选并校验动作Definition身份；13个模式Cue和4个供给Cue在`actionDefinitionId=null`时只按已审计`cueId`匹配各自静态候选。所有声音仍按sourceEventId已确定的0–2索引使用0.96/1/1.04播放速率。生产严格`require...()`拒绝全部98份生产未批准音频，未知Cue返回明确缺失原因，禁止临时振荡器或无关音效冒充正式资产。`ArenaV2FormalWebAudioPortCandidateV1`只在共享批准索引允许后进入Loading获取和解码OGG，用户手势后激活，比赛阶段同步创建voice；最多8路，拥塞丢最低优先级。隔离Web宿主可显式试听已登记候选，默认端口在首个fetch前失败关闭。

`ArenaV2ModeHudPresentationHostV1`现已作为production-unreachable组合候选，独占并同步推进HUD epoch消费者与反馈效果消费者。切换runtime generation时，两者只能经同一`beginEpoch`进入相同epoch；旧generation在任一子消费者变更前拒绝。任一模型、Audio或VFX步骤失败都会销毁并清理两个消费者，使主机整体失败关闭，避免半活跃epoch继续接收回调。该批只完成源码与测试代码，尚未运行测试、typecheck、build、浏览器、真机或性能验证，未接默认Surface/Composition。

### P5.3zzzup 1v1对手武器前置反制提示（代码已写，验证顺延）

1v1 HUD继续复用既有`duel-opponent-weapon`单行，不新增事实、面板或遮挡；当对手持有20武器目录中的武器时，从A5/A6唯一战斗语法源读取该武器地面动作的1–2个`counterInputs`，显示“武器名 · 反制变向/跳开”，空手仍只显示空手。无障碍文本明确这是规避对手地面攻击的方法。该提示不读取位置、不预测下一动作、不改变AI、输入、命中、冷却、奖励或Authority；命中后反馈继续给具体情境反制，形成“出手前可读、出手后解释”的同源闭环。未运行类型、测试、双视口、读屏、浏览器、设备或真人理解验证；状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzuq 生存掉落武器核心用途即时辨识（代码已写，验证顺延）

生存地图仍每20秒刷新3把武器、未拾取10秒后消失，既有三张世界锚点卡不增加高度、行数或HUD区域。第一行从“武器名”收紧为“武器名 · 核心动词”，核心动词直接读取A5/A6唯一20武器战斗语法源并使用既有本地化消息；第二行继续显示等级与剩余时间。无障碍文本同步朗读核心用途、等级和消失倒计时。该提示不比较数值、不声称高等级必然更优、不推荐自动拾取，也不改变供给随机、替换规则、武器属性、输入、奖励、Authority或世界锚点数量。未运行类型、测试、三卡窄屏省略、读屏、浏览器、设备或真人决策时长验证；状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

正式候选入口进一步由`ArenaV2ModeHudValidatedPresentationHostV1`收窄：它拒绝直接HUD Model，只接受`ArenaV2ModeHudValidatedStepProjectionV1`不透明对象；该对象只能由现有`projectArenaV2ModeHudViewModelV1()`从MatchReadFrame V3 audit、PublicMatchInfo V2、Supply Cue和完整V6事件批次创建。由此恢复基线和后续step均沿同一已验证投影路径进入原子主机，不读取checkpoint或内部authority state。当前仍只有源码候选，未运行且未接默认Surface。

正式Three链现在拆分责任：Scene resolver只关闭角色、武器附件和地图的正式视觉Registry，不再错误依赖音频目录；正式音频继续由权威`actionDefinitionId` resolver和顶层资产闭包单独关闭。`ArenaV2FormalThreeAssetPreloaderCandidateV1`只在Loading阶段执行异步GLB I/O，以`PresentationAssetLoadTask`持有每份正式资源租约；任何一份失败、Owner取消或销毁都会释放已取得及迟到资源，比赛阶段`requireAsset()`只接受完整settled缓存。正式GLTF Character View按Presentation克隆骨骼、克隆并着色实例材质、消费已有18条clip和明确装备绑定，找不到附件时直接失败；不会进入原`GltfCharacterViewFactory`的程序化回退。独立正式动作表现目录直接覆盖2个徒手动作和20把武器的40个地面/空中动作，不借用旧产品动作目录。正式Three Stage借用Renderer/Camera/Scene，拥有地图、角色和世界武器实例，固定按1/60秒推进表现动作并在离场销毁实例；地图环境目录按Map Definition ID提供两套不同背景、雾、低强度方向补光与无阴影路线点光，Stage保存并恢复借用Scene原环境，绝不生成替代地图几何或改变碰撞；相机用ModeProjection的明确kind选择1v1全图或竞速/生存本地跟随，不从Mode ID字符串猜模式。HUD Canvas layer把epoch返回的持续RenderModel与Feedback交给既有布局和Painter，清屏后绘制计时、状态、供给与最多3条反馈，并维护无障碍公告，但不消费输入、声音或VFX；供给world anchor经当前Three相机投影，只让正式地图Scene参与射线遮挡，再由既有安全区算法做屏内/边缘钳制和HUD避让。`ArenaV2FormalWebMatchHostCandidateV1`在Loading阶段异步预载，比赛阶段只同步组合抗锯齿WebGL Renderer、Scene灯光、正交相机、HUD和Surface；它不创建第二个动画循环，也不降低render scale。`ArenaV2FormalMatchSurfaceCandidateV1`每次load/render都重新验证Scene Read Frame及视觉绑定，默认只接受已批准正式资产；只有隔离Web Match Host显式设置`allowUnapprovedCandidates=true`后，才允许已登记的未批准候选进入开发Surface，且缺失任一身份仍立即失败并销毁Stage。该链从不查询旧`ArenaWorldStage`、`GreyboxEventEffects`或程序化模型。顶层生产接线仍必须同时满足视觉、音频、VFX和三端门禁，因此这里的责任拆分不代表降低发布标准。

效果端口合同按移动端保守基线固定：音效全部进入`SFX`总线，normal/strong/warning命令分别使用`-6/-3/-2 dB`候选增益，最多8个并发one-shot，溢出时丢弃最低优先级；声音变体由sourceEventId稳定派生0–2，不使用`Math.random()`。VFX同屏最多3项，low/medium/high最多1/2/3层、24/48/96粒子，reduced-motion固定0粒子和静态结果标记，平均overdraw候选上限2且所有质量级禁用distortion。二十武器样式只重参数化既有Sprite/Ring/Points和方向Shape：家族、接触轮廓、粒子分布与箭头比例来自已解析Presentation身份，权威方向仍只来自V2 direction fact；这不是新增VFX层，也不关闭正式资产门。以上是端口预算和代码状态，不是资产、视觉或性能通过结论。

五类核心反馈的Shape–Timing–Color初始Brief为：

| 权威反馈 | Shape | Timing | Color/value | 低动效 |
|---|---|---|---|---|
| 命中确认 | 接触点+短方向楔，不扩大为范围判定 | 起手anticipation来自上游攻击动作；本端只做reaction action+短follow-through | 亮核心+暗边，不能只靠武器色 | 静态接触符号+文字 |
| 支撑面转移 | 起点到新落点的方向带+落点环 | 权威事件后快速方向展开，再保留落点结果 | 亮方向核心、暗轮廓、次级青色 | 静态箭头+落点符号 |
| 击落出圈 | 朝出圈方向的开口楔+边界断点 | 结果强action+较长follow-through，不制造第二次击落 | 高明度核心+深色外轮廓+警示珊瑚 | 静态出圈图标+击落文字 |
| 攻击被避开 | 空心攻击线与目标错位间隙 | 不使用命中爆发，只保留轻量结束尾迹 | 中低明度、与命中亮核心明确分级 | 静态空心错位符号 |
| 移动失足 | 断裂脚印/路线线段+向下结果标记 | 无命中anticipation，直接表达失去支撑与恢复机会 | 警示值差+暗边，禁止复用击落核心形状 | 静态失足图标+原因文字 |

## 7. UI技能与参考记录

本批使用项目技能`threejs-game-ui-designer`，原因是P5需要建立游戏化信息层级、HUD可读性、移动端触控和DOM/Canvas同源边界。已读取并应用：

- `.agents/skills/threejs-game-ui-designer/SKILL.md`
- `references/ui-patterns.md`
- `references/checklists/mobile-input.md`
- `references/checklists/game-ui-quality.md`
- `references/checklists/hud-readability.md`
- `references/checklists/responsive-ui-fit.md`

技能影响：页面没有采用后台Dashboard式多卡操作；每页保持一个主要问题和一个主动作；数字使用稳定容器；HUD避开输入保留区；声音关闭和低动效不隐藏权威事实。正式UI资产、截图和运行验收未开始。

2026-08-11追加`P5.3v`静态切片，把11页DOM与局内HUD Canvas原先重复的色值、中文/数字字体栈、tabular数字策略、圆角和描边收敛到深冻结的`arena-v2.ui-visual-tokens.v1`。Visual Token类型位于RenderPlan下方，避免基础视觉合同反向依赖具体计划；DOM Surface、共享Canvas Painter与正式HUD世界标记只消费该合同，并在绘制或节点提交前拒绝未知/未来tone。布局、交互、权威事实与音频语义未改变。该切片为`production-unreachable / code-written-not-run`，测试、类型、构建、浏览器、截图、设备、性能与真人证据均顺延。

追加使用项目技能`audio-design`与`vfx-realtime`，用于约束本批同步SFX/VFX端口而非制作正式资产。已读取：

- `.agents/skills/audio-design/SKILL.md`
- `.agents/skills/vfx-realtime/SKILL.md`
- `.agents/skills/vfx-realtime/references/patterns.md`
- `.agents/skills/vfx-realtime/references/sharp_edges.md`
- `.agents/skills/vfx-realtime/references/validations.md`
- `docs/architecture/arena-art-and-audio-development-flow.md`

两图正式环境差异化追加使用项目技能`threejs-materials-lighting`，并读取：

- `.agents/skills/threejs-materials-lighting/SKILL.md`
- `.agents/skills/threejs-materials-lighting/references/materials-lights-table.md`

技能影响：保留GLTF PBR材质与既有Hemisphere/Directional主光，不替换材质、不引入运行时程序化几何或未登记HDR；地图差异只增加低强度方向色光、无阴影点光、背景和雾，避免PointLight阴影六面渲染成本，并由Stage完整恢复借用Scene环境。数值仍需浏览器/真机调色与性能证据。

二十段正式GLB路标追加使用项目技能`game-3d-assets`。项目约束要求正式地图继续来自项目自有Route/Surface Definition，因此没有请求Meshy或下载第三方地图，也没有在运行时用Three primitive充当地图；生成器在构建期产出静态GLB、固定字节和SHA，并由正式预加载链消费。技能要求的模型结构、朝向、尺度和截图验证遵照本轮“开发优先”指令顺延，不能据此声称资产已批准。

技能影响：音频命令新增SFX总线、dB增益、8 voice上限、最低优先级丢弃和确定性三变体；VFX命令新增Shape–Timing–Color Brief、质量层数/粒子/overdraw上限、reduced-motion 0粒子、明度优先、禁用distortion与显式off switch。后续二十武器差异层补用`particle-systems`约束：保持burst-only、每项既有96上限、同屏最大288点、单Points批次、无连续发射/物理/碰撞/噪声模拟，按武器只改变确定性分布，不增加粒子或draw call；目标设备GPU和overdraw仍未验证。没有音乐/自适应音乐任务，因此未读取`adaptive-music.md`。

P5.3zd继续使用上述`vfx-realtime`三份强制参考：因当前角色Registry没有逐participant动画时间控制，本批拒绝全局hit-stop，改用目标实例材质的value-first白亮脉冲；不新增透明层/粒子/draw call，低动效输出零脉冲并保留既有静态命中形状。技能要求的白/黑背景、构建、移动端fill-rate与设备检查按开发优先指令顺延。

P5.3ze补用项目技能`threejs-animation`并继续遵守`vfx-realtime`时间尺度：停顿只通过目标角色自己的Animation Controller输入时间实现，不改Clip、Action权重、Authority动作阶段或全局Mixer。命中当tick起停2/3/4 tick，解除后恢复固定1x且不累计被跳过的delta；snap必须先建立当前合法姿态。该技能示例中的`Clock`、独立RAF和程序化摆动不适用于本批，正式实现继续只消费Stage的固定tick节奏。

P5.3zf继续使用`threejs-animation`的现有Clip选择和`vfx-realtime`的方向事实边界：不创建新受击动画，只把稳定命中方向映射到Character Animation Controller已有`Hit_A / Hit_B`。方向只在Authority语义已为HITSTUN/KNOCKBACK时参与选择；近侧向或缺失方向保持默认，不用event hash、随机、镜头或位置猜测。reducedMotion/static保留可读姿态方向，但P5.3zd/ze的脉冲和停顿仍为零。

本批美术/音频任务记录：

- 任务产物：P5反馈Audio/VFX同步消费端口、20武器差异化VFX样式，以及60份武器阶段OGG候选和Stage阶段音频Owner。
- 消费面：五类武器反馈、20把武器的windup/release/recovery、供给与Mode SFX/VFX。
- 权威来源：MatchReadFrame V3、V6稳定事件、权威ActionStarted、权威participant.action.phase、Supply Cue和队列sourceEventId/tick/sequence。
- 正式或研究：`production-unreachable`代码候选；不是正式资产。
- 来源 revision / license / SHA：阶段音频由`arena-v2-authored-weapon-phase-audio-builder.candidate.v1`从已登记Kenney CC0派生候选生成；60份逐文件SHA已写入正式候选目录，批准仍为false。
- 目标设备与视口：Web/微信/抖音移动优先合同；设备均`not-run`。
- reduced-motion / 静音 / 失败回退：0粒子静态结果、audioCue为空、clear/stopAll失败关闭；Stage离场、换局和失败清理显式停止共享SFX voice，不依赖HUD宿主先行销毁。
- 预算影响：新增60份短单声道OGG候选；运行预算继续为3可见VFX、96粒子/项上限、2x平均overdraw、8 SFX voices。Web Audio新增2个GainNode与1个DynamicsCompressorNode作为全局固定总线，Loading解码内存、拥塞、削波与设备响度尚未验证。
- 验证命令与证据路径：未来测试已写，当前按ADR-119全部顺延。
- 回滚点：移除feedback effect consumer导出与待执行测试，不影响Rule/Core、Replay或默认入口。

### P5.3zc–P5.3zd 静态多维审查

下表只评价本次代码静态覆盖，不是阶段Gate分，也不表示编译、运行、设备或真人通过。

| 维度 | 分值 | 静态覆盖 | 结论 |
|---|---:|---:|---|
| 健壮性 | 20 | 18 | command exact-key、有限数、版本、方向、目标、epoch与future字段在相机/材质提交前闭合；未知目标不阻断主流程 |
| 竞态、幂等与重入 | 15 | 14 | 同ID同canonical在tick推进后仍幂等，漂移拒绝；同步端口拒绝thenable，Stage操作水位继续阻止重入 |
| 兜底与可访问性 | 15 | 14 | 缺失/零方向具名八相位；reducedMotion/static镜头和材质均为零，但静态VFX/HUD/音频保留 |
| 边界与有界资源 | 15 | 14 | 两类瞬态状态均最多3项、recent 64项；镜头位移/zoom封顶，角色同目标取最大值且不新增透明层/粒子/draw call |
| 生命周期 | 15 | 14 | remove、pause、clear、切epoch、reset、Match释放与dispose均有清理；VFX先于其借用的角色冲击owner和相机owner销毁 |
| 主流程与Authority边界 | 10 | 10 | 只消费稳定Presentation命令和权威tick；不重判命中、击退、落点或胜负，不冻结Authority或无关玩家动画 |
| 治理与证据 | 10 | 5 | Art Bible、对齐矩阵、计划、台账、索引、源码和待执行测试已同步；两份`game-art-director`参考仍缺，全部运行/设备/真人证据未执行 |
| 合计 | 100 | 89 | `code-written-not-run / hardGate=false`，不得据此进入默认入口或宣称旗舰反馈完成 |

静态审查未发现会直接阻断既有隔离主流程的确定性问题。精确回滚边界为两份impact state、相机控制器增量、角色实例材质脉冲、VFX双端口、Three Stage与Formal Web Host接线、两份待执行测试，以及P5.3zc/zd对应文档段落；不需要撤销Rule/Core、Replay、武器Definition、地图Definition、三概念输入或Profile。

### P5.3ze–P5.3zf 静态多维审查

下表仅评价逐角色动画时间与方向选择的源码静态覆盖，不是编译、运行、设备或阶段Gate证据。

| 维度 | 分值 | 静态覆盖 | 结论 |
|---|---:|---:|---|
| 健壮性 | 20 | 19 | 冻结名单、方向条目、participant、有限数、零向量、重复ID和future字段在View写入前闭合；已离场合法目标只求交集 |
| 竞态、幂等与重入 | 15 | 14 | 同一impact owner继续提供canonical幂等与稳定priority；Registry/Runtime/View保持同步调用和操作水位，冻结解除不追赶 |
| 兜底与可访问性 | 15 | 14 | 无逐目标能力不允许全局冻结；非定向、近侧向与零方向保持中性，reducedMotion/static停顿和脉冲为零但保留方向姿态、静态形状、HUD和音频 |
| 边界与兼容性 | 15 | 15 | 仅目标动画时间为0，位置/装备/朝向/可见性继续同步；显式V2冻结名单才透传新字段，旧普通Character View不接收额外key |
| 生命周期 | 15 | 14 | snap先建姿态，Registry→Runtime→View统一立即解冻；方向与明度在pause/clear/离场/dispose归零，构造中方向失败回收新View |
| 主流程与Authority边界 | 10 | 10 | 命中方向不创建HITSTUN/KNOCKBACK，只在Authority已有语义时选现有Hit_A/Hit_B；不改Rule/Core/物理/tick/其他玩家 |
| 治理与证据 | 10 | 5 | Art Bible、对齐矩阵、计划、台账、索引、源码和待执行测试同步；所有动态证据仍未运行，既有美术治理红门不变 |
| 合计 | 100 | 91 | `code-written-not-run / hardGate=false`，不得进入默认入口或宣称命中手感已通过 |

静态审查发现并修正一项主流程兼容问题：最初基础端口会向所有旧Character View无条件透传`freezeAnimation=false`，与其exact-key合同冲突；现改为只有调用者显式给出`animationHoldParticipantIds`时才透传，P5.3ze暂停则由Registry→Runtime→View同源清理，避免View已解冻而Runtime调试水位仍冻结。精确回滚边界为character-impact的hold/direction输出、VFX direction适配、Registry/Runtime可选冻结端口、正式GLTF View的目标停顿/方向、Three Stage接线、待执行测试及P5.3ze/zf文档；无需回滚Authority、Replay、动作Definition、Clip目录、物理、输入或Profile。

## 8. 开发覆盖估算（非门禁得分）

下表只评估已写代码覆盖面，不能作为P5百分制验收；所有运行、资产、设备和真人项仍是`not-run`。

| 维度 | 满分 | 当前开发覆盖估算 | 主要缺口 |
|---|---:|---:|---|
| 信息架构 | 20 | 20 | 11页导航Session、三模式权威Host、20武器/2图/20段内容与各页真实owner组合已写入；隔离宿主绑定、默认导航和全部运行证据仍断开 |
| 战斗可读性 | 20 | 18 | PublicInfo多人身份、有界去重队列、同步效果消费者和Marker投影已写；仍缺实际HUD、资产、拥塞调音和真人归因 |
| 同源与权威边界 | 15 | 14 | 宿主无关DOM/Canvas消费者同源，导航/Session跨owner失败关闭已写；默认Composition仍断开 |
| 交互/可访问性 | 15 | 13 | DOM/Canvas Pointer全释放、tap/drag、局内三概念固定tick键盘/触控和aria宿主代码已写；屏幕阅读器、长文本、实际触控和局内输入运行均未执行 |
| 最终资产质量 | 10 | 0 | 正式UI/VFX/声音资产均未制作 |
| 三端设备表现 | 10 | 0 | Web/微信/抖音均未运行 |
| 治理证据 | 10 | 7 | 台账、双宿主精确孤立白名单、生命周期/页面Pipeline/内容待执行测试已写，尚无运行证据/截图/缺陷账本 |
| 合计 | 100 | 71 | 不是Gate分，不得晋级生产 |

## 9. 已写入验证与当前执行边界

本节所列、且进入官方P5 runner的候选自动化已由2026-08-25 SF-DG.4执行通过；未进入runner的浏览器、双视口截图、读屏、设备、性能、正式资产与真人检查仍为`not-run`。不得用Node/Vitest结果替代这些表现门。

- 11页固定顺序、唯一主动作、首屏字段数量和两点击路径测试。
- 11页导航Session的两主点击开局、可选角色/准备、四槽导航不新增页面、Match/结算往返、revision/额外字段/非法边/销毁后调用拒绝和确定性双跑测试。
- 导航/Mode/Learning Host的两点击创建、暂停恢复、终局结算后才显Result、可恢复Learning重试、play-again generation替换、旧Session单次销毁、Factory失败关闭与恶意Intent原子拒绝测试。
- Mode/Learning Session Factory的真实Mode Product Composition与Learning Handoff组合、generation顺序、mode/public/recipient身份漂移、Match所有权单次清理、future字段和三模式目录元数据测试。
- 字段闭包、禁用原因、不可变RenderModel和中文消息解析测试。
- Product Result V3权威hash重算、终局step与Mode Result闭合、本地participant一一对应、多武器稳定顺序、空使用事实、身份漂移/future字段/恶意accessor失败关闭，以及Product/Learning结果页字段单owner测试。
- 多owner字段合并成功与字段归属冲突失败关闭测试。
- 20武器/2图/20段内容目录闭包、中文名称闭包、全部武器详情精确5个P5字段、地图详情精确4个P5字段且不越权输出Profile记录的测试（顺延，既有12段断言待统一更新）。
- 惰性DOM模型的heading/button/aria-live/禁用语义、Canvas端口绘制/裁切/换行结果、Pointer/Enter/Space和滚动上下界测试。
- 隔离Web DOM宿主的节点复用、一次Pointer派发、窗口/页面释放路径和dispose监听器回收测试。
- 隔离Canvas宿主的DPR上限、绘制、tap/drag分离、滚动、挂载失败关闭、监听器回收和宿主状态归还测试；十一页Pipeline的多owner武器详情闭包测试。
- 固定tick键盘驱动的三概念键位、对角线归一化、按下/保持、绝不生成slam、tick连续性、暂停恢复清空、终局停转、换代重建、追赶上限与失败清理测试。
- 固定tick触控驱动的三概念映射、多指隔离、动作键拖动绝不生成slam、resize、hide/show只恢复可见性暂停、tick连续性、换代重建与失败清理测试。
- 390×844安全区、48px主动作、4槽宽度、纵向滚动和窄视口失败关闭测试。
- HUD固定宽tick、PublicMatchInfo V2的2–4人非颜色身份、三供给world anchor、静音/低动效回退和输入保留区避让测试。
- Scene Read Frame的Mode/seed/local/角色身份、local action sidecar同tick/sequence/participant闭包、V6 sequence替换不膨胀、二十武器世界身份、两图Map Definition与对局换代测试。
- 正式Scene resolver的均衡角色/单一敌人/蓄力盾绑定、未知角色/武器/两图缺失清单、目录Gate和绝不启用程序化回退测试。
- 正式比赛Surface的每帧Registry重验、GLB必须预载、load/render/pause/resume/leave/dispose状态机、重入/异步端口拒绝、Stage失败清理和跨对局复用测试。
- 正式Three预加载Owner的精确目录加载、重复load幂等、单资产失败全批释放、加载中dispose、迟到资源释放、ready后精确requireAsset和销毁后拒绝测试。
- 正式GLTF角色Runtime的六材质身份、骨骼克隆、18 clip能力、装备显式绑定、缺失附件失败、实例材质释放和构造中途清理测试。
- 六角色视觉设计表的六种唯一明暗分区、七个共享Rogue Mesh精确覆盖、未知/缺失Mesh失败关闭、选择页动作采样同源、选择页与实战实例分区身份一致，以及不增加几何/draw call的静态合同测试。
- 正式Three Stage的地图/角色/手持及世界武器同步、固定1/60动作、跨局复用、阶段音频离场stopAll、借用Renderer/Scene不越权销毁、HUD/相机失败关闭，以及1v1全图/竞速生存跟随相机测试。
- 两图正式环境ID闭包、Definition→环境解析、背景/雾/灯光差异、无阴影预算、跨局恢复借用Scene状态和未知地图失败关闭测试。
- 正式动作表现目录的2个徒手+40个武器动作闭包、0 tick裁剪、Definition timing同源、重复ID拒绝和旧产品动作目录零依赖测试。
- 正式HUD Canvas的持续RenderModel透传、DPR、清屏、安全区/输入保留区、最多3条反馈、live announcement去重、暂停/跨局/销毁恢复测试；正式Web宿主的预加载前拒绝、WebGL context lost失败关闭、无独立RAF、完整资源回收和双Canvas隔离测试。
- 正式资产内容闭包的6+1角色、20武器、2地图期望集合、目录外绑定拒绝、精确差集和加载页数量投影测试。
- 反馈队列12/3/64上限、tick过期、拥塞优先级、重复事件不重复声音/公告、同ID语义漂移失败关闭测试。
- 同步Audio/VFX消费者的revision幂等、倒退/重复声音拒绝、SFX总线/dB/8 voice、质量层级/粒子/overdraw/reduced-motion、present/remove协调和失败清理测试；三锚点屏内/边缘/相机后方/遮挡/HUD输入区避让测试。
- 正式音频resolver的权威action透传、4份来源intake已核验但生产未批准音频、17份未批准武器命中候选、60份未批准武器阶段候选、17份未批准模式/供给候选、严格/隔离路径分离、阶段Cue与动作身份闭合、确定性播放速率、Mode/Supply缺失原因和绝不启用运行时合成音频回退测试；Stage阶段Owner的ActionStarted前置、windup→release→recovery、重复帧幂等、静音不补播、半局恢复静默和跨局reset测试。
- 恢复宿主Consumer Epoch的稳定基线、事件水位、同tick持续态重建、历史one-shot拒绝、旧generation异步回调拒绝、音画clear/stopAll与新epoch重新消费测试。
- V6事件水位、Supply Cue水位、模式身份、重复ID、最多3供给和MatchRead audit异常测试仍需补齐。
- P5.3zc镜头冲击的5/7/9 tick包络、强度/UTF-8取舍、方向fallback、位移/zoom封顶、future resolve原子性、低动效、epoch与宿主接线测试。
- P5.3zd目标材质脉冲的3/4/5 tick包络、同目标最大值、三项/64项上限、幂等/漂移/旧epoch、reducedMotion、共享owner接线和明确不做全局hit-stop测试。
- P5.3ze目标动画停顿的2/3/4 tick边界、同目标最长剩余、明确目标求交集、snap先建姿态、冻结期间权威位置/装备继续同步、解除不追赶、暂停/clear/dispose恢复1x、多人互不冻结与低动效零停顿测试。
- P5.3zf方向命令exact-key/有限数/零向量中性化、priority赢家、非directional不借低优先方向、dot前后阈值/侧向中性、Authority语义门、创建中目标、离场忽略、remove/clear/epoch/pause/dispose清理和旧通用View兼容测试。
- P5.3zzze力度阈值7.999/8/11.999/12、非命中无力度、受限RenderModel不得篡改权威身份、专属标题进入队列、轻/实/重音频档位、VFX/箭头/镜头/角色倍率、全局封顶、reduced-motion和同ID漂移失败关闭测试。
- P5.3zzzf三类稳定命中复用对应地面/空中动作结果、挥空复用7类失败风险、Survival别名回到collection文案、徒手/移动掉落零教学追加、目录与Action身份漂移失败关闭测试。
- P5.3zzzg力度/武器提示前缀、窄屏主学习项优先、隐藏次项仍留队列与读屏、Canvas高度有界换行和省略号、低动效保留文字、生存本地拾取按两图地形机会排序、远端/生成/过期零地图教学、地图显示身份漂移失败关闭测试。
- P5.3zzzh本局真实使用武器、真实选中地图、三模式地形后果、收藏顺序稳定焦点、最多两个有效地形、未知地图不猜测、空使用不推断、目录漂移失败关闭测试。
- P5.3zzzi共享投影精确Definition身份、重复武器拒绝、竞技单武器策略、结算稳定焦点、地图显示名/段落总数漂移失败关闭、竞技准备最多两个地形、生存准备不生成预选武器练法，以及拾取/结算继续消费同一投影测试。
- P5.3zzzj六类地形机会数量与最早路段身份闭合、两张地图具体路段本地化、原地形摘要兼容、当前六个消费位置使用具体练习摘要，以及示例不读取位置、不推断当前路段测试。
- P5.3zzzk通用详情三参数兼容、1v1/竞速详情复用共享具体摘要、宿主当前选择接线、生存不注入、额外字段/访问器/目录哈希/武器/地图身份漂移失败关闭测试。
- P5.3zzzl模式选择页1v1/竞速当前武器×地图、生存地图+空手、无新增字段ID、Definition显示名漂移继续失败关闭和两次主要点击合同不变测试。
- P5.3zzzm生存持有武器短标签、完整读屏具体路段、空手零提示、换武器同步、拾取事件完整文案继续存在、竞速/1v1不猜地图和无新增HUD事实测试。
- P5.3zzzn持续武器事实单行、Canvas实测宽度省略、完整读屏不截断、六消费位置闭包与短ID唯一规范化测试。
- P5.3zzzo公开路段类型匹配映射、路段级投影严格Definition/序号、匹配与不匹配返回、竞速下一段短提示、显示名漂移失败关闭、空手/终点零提示和不读取坐标测试。
- P5.3zzzp权威Duel地图Definition解析、PublicMatchInfo/Frame地图身份闭合、未知地图失败关闭、1v1当前武器主练地形、空手零提示、完整读屏具体路段、显示名漂移失败关闭、Race不重复地图级短句、无新HUD事实与共享投影八消费位置闭包测试。

- P5.3zzzr精确卡片标记、null/已收藏恢复、未激活目标拒绝、正式20把顺序、availability前缀/revision/hash/身份闭合、accessor/Symbol零执行、Regression同一value/Profile接线且不重读Registry测试。

以上全部为`not-run`。当前不执行测试、类型检查、构建、截图、压测、性能、模拟器或真机任务。

## 10. 下一开发批次

1. 宿主无关UI Render Plan、20武器/2图/20段具体内容、十一页真实owner组合、单写入导航、隔离DOM/Canvas绑定与三模式对局/HUD/结算链已进入同一隔离顶层owner，正式GLB/OGG预加载、6角色材质Runtime、20武器附件候选、2地图GLB候选、42动作表现目录、三模式终局动作、相机、Three Stage、HUD Canvas、Web Audio、tick VFX、供给Marker投影/地图遮挡、Web Renderer宿主和比赛Surface生命周期已接成候选链；独立`arena-v2-formal-candidate.html`已作为不进入默认build的开发入口。下一步集中补Audio/VFX内容和角色、武器、地图候选的美术验收；统一类型/测试/浏览器/连续render性能门继续顺延。
2. PublicMatchInfo V2的2–4人非颜色身份、有界反馈队列、同步Audio/VFX端口消费者、原子epoch主机和world-to-screen Marker适配已落盘；下一步只在P2–P4门允许后建立正式Composition，不提前接默认入口。
3. P2.5e恢复边界已增加生产不可达的Consumer Epoch：宿主从无历史one-shot的稳定HUD基线初始化事件水位，旧generation回调和水位以下事件整包拒绝；正式宿主接线与运行反证仍顺延。
4. 正式Web Audio与tick驱动Three VFX执行端口已写入但未运行；全部命中、武器阶段、模式/供给音频和五类核心VFX身份已有静态文件候选，98份音频与5份VFX候选生产审批、截图和设备验证继续顺延。
5. P6 Profile字段已可通过显式owner合并进入P5 ViewModel候选，默认Surface仍断开；P5性能、设备和真人统一留到后续集中验证阶段。

### P5.3zza 正式 Web 组合失败后全链停机（2026-08-12，代码已写、未运行）

静态复核确认，正式 Web 顶层组合原先会在预览、音频、布局、结算调度或观察回调失败时进入
`failed` 并隐藏触控层，但非 Driver 来源的失败没有统一保证仍在运行的固定 tick Driver 在下一平台帧前停止。
这可能让页面已经失败关闭后，本地权威对局仍继续推进。

`ArenaV2FormalWebPlayableCompositionCandidateV1` 现增加仅调度一次的失败停机：构造完成后的任一组合级失败
都会在当前同步调用栈结束后的微任务中释放 resize 监听、Driver 及其拥有的 Binding、Information/Match Surface、
本地权威 Host、离线留存 Journal 和触控 Surface。页面容器与首因诊断继续保留，供失败画面读取；用户之后主动
`dispose()` 仍沿各端口的幂等销毁合同完成页面移除。构造期间即使子对象以 `null/undefined` 作为失败原因同步回调，
顶层也会用独立失败水位锁存首因，在所有字段移交前强制抛回现有同步回滚链，不读取尚未移交的字段，也不返回半构造对象。
任意非 `Error` 或恶意 Proxy 失败值都不会经过字符串化或普通属性读取；顶层只把原值作为不可枚举诊断字段保存，
清理错误采用同样边界规范化，避免错误格式化再次覆盖构造首因。

该切片不改变方向、跳跃、攻击三概念输入，不修改暂停/恢复、结算、奖励、Profile、权威 tick、正式资产或默认入口。
元数据仅新增 `synchronousConstructionFailureUsesRollbackChain=true`、
`arbitraryConstructionFailureValuePreservedWithoutStringification=true`、
`anyCompositionFailureStopsOwnedDriverBeforeNextPlatformTurn=true` 与
`failureShutdownReleasesOwnedRuntimeResources=true`；`production-unreachable / hardGate=false /
validationStatus=not-run` 保持不变。测试、类型、构建、浏览器、设备和性能验证按当前开发优先要求顺延。

精确回滚边界仅为正式 Web 组合中的两个失败停机水位、`#scheduleFailureShutdown()`、`#recordFailure()` 调度接线、
主动销毁时的调度水位清理及两项元数据标记；无需回滚 Driver、Binding、Match Host、权威 Runtime 或其他阶段代码。

### P5.3zzb 键盘与触控后台暂停同源边界（2026-08-12，代码已写、未运行）

正式 Web 触控链原本已监听 `visibilitychange / pagehide / blur`，但未同步读取“对局开始时页面已经隐藏”的状态，
外部调用也可能在隐藏期间尝试恢复。键盘链则只有按键 Adapter 在 `blur` 时清空按下集合，Driver 没有对应的平台
可见性暂停，因此浏览器后台且未产生 blur 时，权威对局可能继续由平台帧推进，或恢复后读取隐藏前的按下状态。

键盘 Driver 现支持可选的只读可见性平台端口：正式 Web 显式提供当前隐藏状态、隐藏和显示监听；隐藏事件先清空
输入，再通过既有 `pauseMatch()` 停止权威推进，只有由可见性触发的自动暂停才会在明确显示事件后自动恢复。
玩家在自动暂停状态再次主动暂停会取消自动恢复，页面仍隐藏时手动 `start/resume` 直接拒绝。触控 Driver 复用相同
水位，并从正式触控 Surface 的 `isHidden()` 同步闭合初始状态与隐藏期间启动/恢复门。

平台事件只调用既有 pause/resume，不创建 tick、不补帧、不把墙钟或 Document 状态传入 Authority。方向、跳跃、攻击
映射、固定 tick、最多追赶步数和所有玩法数值不变；旧键盘调用方不提供可见性端口时保持原合同。源码元数据仍为
`production-unreachable / hardGate=false / validationStatus=not-run`，相关生命周期测试源码登记后统一顺延执行。

同一切片还补齐输入监听清理所有权：键盘绑定回滚或销毁若有监听 cleanup 失败，只释放已成功清理项并保留失败句柄；
键盘与触控 Driver 只有在子输入完整销毁成功后才清空 generation/participant 引用。新输入绑定失败且局部回滚也失败时，
失败候选会先移交给 Driver，再由统一失败关闭和后续 `dispose()` 精确重试，避免监听或采样器离开任何 owner。

精确回滚边界为键盘 Driver 的可选 visibility port/监听/水位、两类输入失败清理的重试所有权、触控 Driver 的当前隐藏读取与手动恢复门、正式 Web
平台事件适配，以及对应未运行测试与本段台账；无需回滚 InputFrame、Binding、MatchCore、三模式 Runtime 或页面实现。

### P5.3zzc Information Intent 解绑重试所有权（2026-08-12，代码已写、未运行）

`ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1` 原先在页面退出和失败清理时都会先或无条件清空
`#unbindIntent`。如果平台解绑抛错或返回 Promise，绑定句柄会从唯一 owner 中消失，后续 `dispose()` 无法重试，
旧页面输入仍可能继续回调已经失败关闭的 Binding。

现在页面退出与统一清理都要求解绑同步完成，并且只有同一解绑句柄成功返回后才释放引用；抛错、异步返回或回调期间
身份替换都会保留原 owner。Binding 仍进入 `failed`，由 Driver 或顶层组合的既有失败清理继续调用 `dispose()`，
精确重试尚未完成的解绑。同步返回边界同时改为纯描述符扫描：限制原型链为32层、拒绝循环链与访问器
`then/constructor`，锁定原生 `Promise.prototype.then` 和 `Promise[Symbol.species]` 身份；只对已确认的原生Promise执行捕获的
brand probe并立即安装吞吐处理器，普通thenable和getter均不执行。该切片不改变导航、页面、输入映射、权威 tick、结算或
默认入口；测试和治理反证已写未运行。

### P5.3zzd Information Binding 部分清理台账（2026-08-12，代码已写、未运行）

Binding 过去会在一次清理中依次释放 Intent、Information Surface、Match Surface 与 Host Owner，但只记录总错误；若中间一项
失败，下一次 `dispose()` 会再次调用此前已经成功的子资源。现在三个拥有型子资源分别记录完成水位，只有同步销毁成功才提交，
失败项保留给下一次清理重试，成功项永久跳过；Intent 继续使用句柄身份作为独立完成水位。该修正只收紧资源生命周期，不改变
页面、输入、对局、结算、权威状态或默认入口。P5.3zzzun进一步把顺序校正为Information Surface→Host Consumer→Match媒体Producer；测试与治理反证已写未运行。

### P5.3zze Formal Web 失败停机与主动销毁共享清理台账（2026-08-12，代码已写、未运行）

正式 Web 顶层原先在组合失败后的微任务停机与用户后续主动`dispose()`中分别调用同一组拥有型资源；即使第一次已经
成功释放resize监听、Driver、离线留存Journal或触控Surface，第二次仍会重复调用。现在两条路径共用五项完成水位：
resize cleanup、Driver、Journal、Pointer Surface和DOM容器。失败停机只收口前四项并保留失败诊断容器；主动`dispose()`
只重试未完成项并负责最终移除容器。任一子项只有成功后才提交完成，失败项保留供下一次显式销毁继续，不会重复调用
已成功资源。该批只收紧表现宿主生命周期，不改变页面、玩法、输入、权威tick、结算、Registry、正式资产或默认入口；
测试、类型、构建、浏览器、设备与性能验证全部顺延。

### P5.3zzg 输入 Driver 部分清理台账（2026-08-12，代码已写、未运行）

键盘与触控Driver原先在失败关闭和后续`dispose()`中会再次销毁已经成功释放的Loop或Binding；触控输入内部也会在
监听清理、Adapter或Sampler任一项失败后重复调用此前成功项。现在键盘按Loop静止、当前输入、可见性监听、Binding
分别记账，触控Driver按Loop静止、当前输入、Binding分别记账；Binding只有在平台循环停止且所有输入/监听释放后才允许
销毁。触控输入内部固定为监听cleanup → Adapter → Sampler依赖顺序，每项只在成功后提交完成，失败项保留给后续
`destroy()/dispose()`精确重试。同步移除触控Driver重复的`#visibilityPaused`字段声明。

该批不修改方向、跳跃、攻击映射，不增加格挡、下蹲或slam，不改变固定tick、追赶上限、暂停恢复、页面、权威状态或
默认入口。源码、治理与延期反证已写；测试、类型、构建、浏览器、设备与性能验证全部顺延。

### P5.3zzh Audio/VFX 部分资源清理台账（2026-08-12，代码已写、未运行）

正式 Web Audio 过去在单个 Voice 的停止或节点断连部分失败后会丢失该 Voice，后续仍可能提前断开共享总线并关闭
`AudioContext`。现在每个 Voice 分别记录播放终止、Source断连与Gain断连完成水位，只有三项全部完成才从池中删除；共享
SFX/Master/Limiter总线必须等待全部Voice释放，Context关闭请求若同步拒绝或异步失败会重新开放清理所有权，后续
`dispose()`只重试未完成项。

正式 Three VFX 过去在Effect根节点、Geometry或Material部分释放失败后可能重复释放成功项，异步纹理又可能在首个加载
失败后迟到并从唯一Owner中丢失。现在Effect逐资源提交完成水位；已加载未入Registry的纹理进入精确待清理集合；整批加载
使用全量settlement，不能因首个失败提前宣布结束；终态必须等待加载落定、正式纹理与迟到纹理全部释放、Camera/Character
Impact清空且VFX根节点移除后才完成。该批只收紧表现资源生命周期，不修改命中、伤害、方向事实、固定tick、武器平衡、
页面或默认入口；源码、治理与延期反证已写，全部验证顺延。

### P5.3zzi 正式 Three 预加载迟到租约台账（2026-08-12，代码已写、未运行）

正式 Three 预加载器过去使用首错即结束的批量等待；当销毁发生在GLB加载中时，`PresentationAssetLoadTask.destroy()`可先返回，
外层随即删除Task，但迟到租约的`release()`仍可能失败，导致唯一可重试Owner丢失。现在底层Task记录加载是否已经落定，并只读
暴露“已进入destroyed、加载已落定、无Lease且不在Release重入中”的完整清理判定。预加载器改为等待整批Task全部settle，
只有Task确认完整清理后才删除引用；加载尚未落定或Lease释放失败时保留原Task，后续`dispose()`精确重试。终态同时要求
Task表为空且整批加载不再进行。

该批不改变130项正式资产目录、GLB内容、动作、材质、地图、比赛阶段同步读取或默认入口。此前PA6-P证据只覆盖修改前的
`PresentationAssetLoadTask`基线；本批新完成水位与正式Preloader组合证据均为`code-written-not-run`，不得沿用历史绿结果。

### P5.3zzj 正式 Three Stage 部分清理台账（2026-08-12，代码已写、未运行）

Stage 过去可能在世界根节点已移除后，把仍有HUD、VFX、CharacterImpact或Camera清理债务的failed状态误判为无需重试；
开局半构造失败时，尚未提交到字段的Map、Route、Character Factory或Registry也可能丢失唯一Owner。地面武器的Readability
销毁成功而根节点移除失败时，后续还会重复销毁Readability。现在开局创建即逐项移交Stage字段，失败统一复用比赛清理账本；
角色Factory等待角色Registry释放，地图节点等待Route Owner释放；地面武器分别记录Readability与根节点水位，根节点只在
Readability释放成功后移除。

比赛级HUD/VFX clear、武器阶段音频reset/stop与Camera reset也分别记账；终态固定为比赛实例收口 → HUD/VFX销毁 →
CharacterImpact/Camera销毁 → 世界根节点移除，其中VFX必须先于其借用的Impact/Camera Owner释放。只有全部拥有型资源完成才
进入disposed；failed重试不再只看世界根节点。该批不改变渲染内容、动作、命中方向、地图、武器、音频语义或默认入口，
源码、治理与延期反证已写，所有验证顺延。

### P5.3zzk 正式 GLTF 角色部分清理台账（2026-08-12，代码已写、未运行）

正式角色View过去只用一个总`disposed`布尔值。Animation Controller、手持武器Readability、角色根节点、模型树或任一克隆
材质清理失败后，下次`dispose()`会重复调用已成功项；手持武器Readability成功而节点移除失败时也会重复销毁Readability。
Factory在View创建后设置初始命中方向失败时，若View清理失败又尚未写入View表，唯一重试Owner会丢失；Factory自身还会直接
清空仍存活View表并假装销毁完成。

现在View在第一次清理开始后永久关闭业务读取，按Controller → 手持武器Readability → 手持武器节点 → 角色根节点 → 模型树
→ 逐材质 → Factory回调顺序分别提交完成水位，仅重试未完成项。Factory在初始方向写入前先登记View，失败清理不完整时保留
同一实例；Factory进入清理后拒绝所有业务方法，逐个销毁仍登记的View，只有View表为空才提交disposed。正常运行时View仍由
`CharacterViewRuntime/Registry`拥有并销毁，Factory不会增加第二个正常Owner。该批不修改6角色身份、动画、命中方向判定、
武器挂点、材质风格、权威状态或默认入口；源码、治理与延期反证已写，所有验证顺延。

### P5.3zzl 正式 HUD Canvas 部分清理台账（2026-08-12，代码已写、未运行）

正式 HUD 过去以一次性`dispose()`恢复Canvas尺寸、样式、ARIA和隐藏播报节点；任一平台操作失败后，后续重试会再次执行已
成功项，且2D Context可能在像素尚未清空时提前失去本地引用。Match Host又把构造与`load()`串成一个表达式，若`load()`
在取得Context、插入隐藏节点或修改ARIA后失败，局部HUD实例可能在进入宿主清理链前失去唯一Owner。

现在HUD第一次清理开始即关闭业务方法，分别记录像素清空、隐藏播报节点移除、Context释放、Canvas宽高、CSS宽高、指针
策略与三个ARIA属性的恢复水位；Context必须等待像素成功清空后才释放，后续`dispose()`只重试未完成平台项。所有待恢复水位
均先于对应平台写入提交，平台调用即使部分生效后抛错也不会误判完成。Match Host先持有HUD实例再调用`load()`，构造失败链
因此始终拥有同一个可重试对象。该批不改变HUD事实、布局、绘制内容、读屏文案、输入、玩法、资产批准或默认入口；源码、
治理与延期反证已写，测试、类型、构建、浏览器、设备和性能验证全部顺延。

### P5.3zzm 正式冲击表现终态清理（2026-08-12，代码已写、未运行）

Character Impact过去在永久销毁时复用普通`clearCharacterImpacts()`，因此仍会分配下一个epoch；达到安全整数上限后，永久
销毁会永远失败。Camera Controller同样先推进epoch再恢复借用相机，恢复或Impact State释放任一失败后没有失败状态与逐项
完成水位。Stage终态清理还会先执行可恢复的HUD/VFX clear和Camera reset，再执行各自永久dispose，产生多余平台调用和epoch。

现在两类Impact State的永久销毁直接清空有界内存，不再申请新epoch；普通暂停、离场和跨局clear仍保持原有换代语义。Camera
Controller进入终态清理后失败关闭，分别提交“基础相机已恢复”和“Impact State已释放”水位，后者等待前者，重试只处理未完成项。
Stage把正常离场与永久清理显式分开：正常离场继续执行HUD/VFX clear与Camera reset，永久清理直接依赖各子Owner的dispose，
成功后回填比赛清理水位。该批不改变镜头幅度、动画停顿、命中方向、reduced-motion、权威tick、玩法或默认入口；源码、治理与
延期反证已写，测试、类型、构建、浏览器、设备和性能验证全部顺延。

### P5.3zzn 正式 Web 宿主终态所有权（2026-08-12，代码已写、未运行）

正式Web宿主过去在构造末尾直接注册`webglcontextlost`监听，监听注册若部分成功后抛错，构造回滚没有可返回给调用方的重试
Owner；统一清理又在监听移除抛错时直接跳出，Surface、Preloader、Renderer和Audio均会被跳过。Surface清理失败时，宿主仍会
提前释放Stage正在借用的预加载资产、Renderer和Audio。Audio自身还把“已请求Context.close()”误作“Context已经关闭”，父宿主
因此可能永久销账，而关闭Promise迟到失败后只剩孤立的failed Audio实例。

现在WebGL监听只在构造成功后的正式资产准备阶段绑定；绑定前先登记待清理水位，部分成功后抛错仍由已返回的Host统一重试。
监听移除作为独立清理项，失败不阻断其他无依赖资源；Preloader、Renderer和Audio则严格等待Surface完成销毁。Audio新增
`disposing`状态与Context关闭完成水位，发起关闭不再等于完成，异步成功后才进入disposed，异步失败重新开放关闭请求；父宿主
持续持有Audio，直至子状态确认为disposed。该批不等待异步关闭、不创建新轮询、不改变音频内容、渲染、玩法、输入、权威状态、
资产批准或默认入口；源码、治理与延期反证已写，测试、类型、构建、浏览器、设备和性能验证全部顺延。

### P5.3zzo 正式表现同步返回边界（2026-08-12，代码已写、未运行）

正式HUD、VFX、Camera、Stage、Match Surface和Web Host此前各自复制同步返回检查，部分实现使用可篡改的
`instanceof Promise`，部分无循环检测或32层上限，也没有统一锁定原生`Promise.prototype.then`和`Promise[Symbol.species]`
描述符。恶意访问器、循环/超深原型链或Promise全局篡改可能执行外部代码、无界遍历或让不同表现端口得出不同结论。

现在`arena-contracts`提供唯一`assertSynchronousReturn`：描述符方式扫描`then/constructor`，限制32层并拒绝循环，普通thenable
与访问器零执行；只有构造身份指向原生Promise且原生then/species描述符完整时才执行捕获式brand probe并安装空处理器。
八个正式表现与Web组合模块统一导入该合同，共享`arena-presentation-runtime`的输入、帧循环与资源能力工具也委托同一实现，
删除本地Promise品牌探测重复路径。同步补齐Audio、VFX、GLB Preloader和Web Host的迟到
加载/激活隔离：Owner不再处于原操作状态时，迟到结果只拒绝原Promise，不重复失败关闭或清理。该批不改变异步Loading本身、
资产内容、渲染、HUD、玩法、输入、权威状态或默认入口；源码、测试源码、治理与台账已写，所有验证顺延。

### P5.3zzp 正式 Web 容器终态顺序（2026-08-12，代码已写、未运行）

正式Web Composition过去在主动`dispose()`中，无论Resize监听、Driver及其Binding/Match Host、离线留存Journal或触控Surface
是否完成清理，都会继续移除总容器。任一上游Owner仍有失败债务时，页面诊断与资源上下文会先消失，后续虽仍持有Composition
对象，却无法维持明确的“运行资源仍待清理、DOM仍保留”终态关系。

现在四项运行资源共享明确的完整清理判定；总容器只在它们全部完成后移除，Composition也只有运行资源与容器均完成才进入
disposed。失败项和容器继续由同一实例持有，下一次显式`dispose()`只重试未完成项。失败停机仍保留诊断容器，不主动改变
页面、输入、对局、资产或权威行为。源码、测试源码、治理与台账已写，测试、类型、构建、浏览器、设备和性能验证全部顺延。

### P5.3zzq 正式 Web Audio 加载整批落定（2026-08-12，代码已写、未运行）

正式Web Audio过去使用`Promise.all`预载整批音频，首个请求或解码失败后会提前结束Owner的加载状态，但同批其他fetch/decode仍可能
继续执行；此时终态清理可能先关闭共享AudioContext，迟到任务再访问已关闭依赖，且父宿主无法准确判断整批异步资源是否已经落定。

现在每次加载显式持有`loadPending`水位，并使用`Promise.allSettled`等待全部音频记录完成或失败后再提交首个失败。终态清理可先停止
Voice、清空Buffer并断开总线，但只有加载整批落定后才允许请求关闭AudioContext；加载中发起的销毁保持`disposing`和同一Owner，
后续显式`dispose()`只继续未完成的Context关闭，不建立轮询、墙钟或后台等待。该批不改变音频目录、Cue、并发Voice、总线参数、
资产批准、玩法、输入、权威状态或默认入口；源码、测试源码、治理与台账已写，所有自动化、浏览器、设备和性能验证全部顺延。

### P5.3zzr 当前 Arena 同步返回消费者统一（2026-08-12，代码已写、未运行）

P5.3zzo最初只收敛了正式比赛链的八个端口；当前Arena的信息DOM/Canvas、Local Surface Binding、收藏与角色选择预览组合、
Product Canvas、Character View Runtime、HUD Feedback Consumer、二十武器VFX Port及同步Storage仍保留九套局部检查。部分局部实现会
执行普通thenable、读取敌意getter、依赖可篡改`instanceof Promise`，或在循环/超深原型链上无界遍历。

现在上述九个页面/表现消费者与原八个正式比赛消费者统一导入`assertSynchronousReturn`，同步Storage直接委托同一底层合同；允许
异步的收藏资产Loader仍保留独立原生Promise识别，不被错误收窄成同步接口。治理锁定17个当前Arena消费者不得重新引入局部
`rejectThenable`或`instanceof Promise`，同步Storage不得调用普通`then`。该批不改变页面、收藏、角色、HUD、VFX、存档数据、
玩法、输入、权威状态或默认入口；源码、测试源码、治理与台账已写，所有验证继续顺延。

### P5.3zzs 信息 DOM / Canvas 页面宿主生命周期账本（2026-08-12，代码已写、未运行）

信息DOM与Canvas宿主过去在`load()`中连续创建节点、改写Canvas属性并注册九类监听，任何中途异常都没有统一回滚；`dispose()`又按
固定串行顺序执行，指针释放或某次监听移除抛错会跳过后续节点移除、属性恢复和状态清理。DOM根节点可能半挂载，Canvas可能保留
菜单ARIA、尺寸或触控样式，同时实例仍错误进入可用或不可重试状态。

现在两种宿主均新增`failed`状态与逐资源完成水位；监听在绑定前登记，加载失败立即走同一清理器，完整回滚后恢复`created`，清理
不完整则保留`failed`并只允许继续`dispose()`。DOM只在指针和全部局部/全局监听释放后移除根节点；Canvas逐项恢复role、aria-label、
tabIndex、touchAction、像素尺寸和CSS尺寸，且只有监听、播报节点与原始状态全部恢复后才释放2D context。成功项不重复处理，失败项由
同一实例精确重试。该批不增加页面、按钮、输入、文案、动画、权威状态或默认入口；源码、测试源码、治理与台账已写，所有验证顺延。

### P5.3zzt 信息页面平台提交失败关闭（2026-08-12，代码已写、未运行）

DOM/Canvas宿主对RenderPlan结构和视觉tone的非法输入仍能在写入前拒绝，但平台提交本身可能在Canvas尺寸、transform、绘制、DOM节点
增删、ARIA/style写入或滚动观察者回调中途抛错。旧实现会留下已经写入一半的新页面，同时保持`ready`和输入监听，玩家仍可点击
几何、文案或可访问性树已经不一致的页面。

现在Canvas的resize/render以及DOM的render/scroll提交由统一运行期失败边界包围；只有完成预检后发生的中途异常才进入`failed`，
立即复用P5.3zzs资源账本清除交互、监听、根节点/播报节点并恢复Canvas原状态。原始错误保持首因，清理错误追加为AggregateError；
清理成功后实例仍保持失败关闭，调用方只能显式`dispose()`完成终态，不能继续渲染或接受输入。该批不改变合法页面布局、滚动距离、
焦点规则、输入Intent、文案、权威状态或默认入口；源码、测试源码、治理与台账已写，所有验证顺延。

### P5.3zzu 本地页面 Intent 事务失败关闭（2026-08-12，代码已写、未运行）

Local Surface Binding处理主按钮时可能先让Navigation/Host创建或切换对局，再由`renderCurrent()`解绑信息页Intent；若之后比赛Surface
load/render、页面通知或下一目标投影失败，旧实现依赖已经可能解绑的Surface `onRejected`回调触发外层清理，存在已启动对局失去
收口入口的窗口。若Binding自行关闭后Surface仍再次调用`onRejected`，还会重复外部错误通知。

现在完整Intent事务由Binding自身`try/catch`拥有；任一后提交失败直接调用同一`#reject()`，同步销毁信息/比赛Surface与Host Owner，
不依赖页面回调仍然存在。Surface随后转交错误时，`#handleRejected`识别Binding已处于failed/disposed并只透传原错误，不重复清理或
再次通知外部错误处理器。Driver仍只在全部页面/比赛提交与通知成功后启动。该批不改变导航图、主按钮、结算、再来一局、下一目标、
对局规则、输入或默认入口；源码、测试源码、治理与台账已写，所有验证顺延。

### P5.3zzv 结算恢复页面二次失败收口（2026-08-12，代码已写、未运行）

结算写入失败后，Binding会读取Learning Recovery并尝试离开比赛Surface、重绘结果页、发布“可重试/需重启”状态。旧catch分支没有
再保护这些恢复动作：Recovery读取、Surface离场、页面重绘或通知任一再次失败，都可能越过`#reject()`，留下已经部分结算或部分
切页的Host与Surface。

现在恢复状态读取拥有独立保护，失败时将原结算错误与读取错误按顺序聚合并关闭Binding；确认可恢复后，离场、重绘和通知作为一组
恢复页面提交，任一失败同样保留原结算错误并进入统一清理。只有恢复页面完整可见后才返回可恢复结果。该批不改变Reward/Learning
写入、重复提交、结果页内容、重试按钮、Profile schema、玩法或默认入口；源码、测试源码、治理与台账已写，所有验证顺延。

### P5.3zzw 正式角色手持武器替换事务（2026-08-12，代码已写、未运行）

正式GLTF角色过去在武器身份变化时先销毁旧附件，再克隆、克隆材质、创建动作阶段可读性Owner并挂载新武器。
任一新资源或表现步骤失败都会让角色提前失去原武器；新Owner构造或挂载部分生效后抛错时，也缺少独立的
清理债务记录。

现在手持附件收敛为显式Record：候选武器先完成模型克隆、独立材质Owner、当前权威tick/动作阶段消费和手部节点挂载，
全部成功后才退役旧武器。候选预提交失败保留旧武器；回滚或旧武器释放不完整时，角色View粘滞进入仅可销毁状态，
并由同一实例持有可重试的附件清理债务；根节点只在所有当前/历史附件债务收敛后才释放。该批不改变20把武器姿态、
动作时序、命中判定、拾取、输入、资产批准或默认入口；源码、待执行反证、治理与台账已写，测试、类型、构建、浏览器、设备和性能验证全部顺延。

### P5.3zzx 正式地面武器替换事务（2026-08-12，代码已写、未运行）

正式Three Stage过去在同一世界武器instance更换Definition或附件资产时，先释放旧可读性Owner和根节点，再构造新附件；
候选的首次权威tick消费、位置写入或挂载失败同样缺少持久清理债务，可能留下半挂载节点或让旧掉落物提前消失。

现在候选Record先完成模型/独立材质Owner、当前帧地面idle可读性、权威位置和根节点挂载，全部成功后才退役旧Record。
候选回滚或旧Record释放不完整时，Stage失败关闭并由独立有界Set保留清理债务；活动掉落物Map与历史债务分离，诊断快照单独报告债务数，
不将它冒充为存活掉落物。该批不改变每20秒3把供给、10秒未拾取消失、靠近替换、位置、等级、命中、规则、输入或默认入口；
源码、待执行反证、治理与台账已写，所有运行验证顺延。

### P5.3zzy 正式 VFX GPU 资源构造事务（2026-08-12，代码已写、未运行）

正式VFX效果会一次构造Sprite材质、一到两个Ring几何/材质、可选粒子Buffer/材质和权威方向箭头几何/材质。
过去任一Three构造、attribute写入或根节点挂载中途抛错，已创建的GPU资源没有统一Owner和重试清理记录。

现在效果以未提交Record累计所有已创建几何与材质；构造失败立即回收，回收不完整时转入VFX Owner的独立清理债务Set。
效果挂到正式VFX根节点与写入活动Map也是单独提交步，部分生效后抛错会回滚并保留债务。普通移除、clear和终态dispose
都先重试历史债务，只有活动效果、历史债务、纹理、借入Impact Owner与根节点全部收敛才完成终态。该批不改变VFX形状、粒子数、
持续tick、三项同屏上限、命中语义、HUD队列、音频、资产批准或默认入口；源码、待执行反证、治理与台账已写，所有运行验证顺延。

### P5.3zzz HUD 反馈消费者终态所有权（2026-08-12，代码已写、未运行）

HUD Feedback Consumer过去在`dispose()`中尝试视觉`clear`和音频`stopAll`后，无论任一外部端口是否抛错都清空内部身份并标记
`disposed`；调用方虽收到错误，却无法让同一实例继续释放残留VFX或Voice。Epoch切换的部分清理失败也会进入通用失败清理，
重复调用已经成功的外部端口。

现在视觉清空与声音停止拥有独立完成水位；失败或终态销毁只重试未完成端口，两项均成功后才清空tick/revision/epoch与活动反馈身份并进入`disposed`。
Epoch切换在首个外部调用前登记新一轮清理债务，部分失败时保留已成功水位；切换完整成功后才为新epoch重新开放资源所有权。该批不改变反馈队列寿命、
三项可见上限、声音优先级、VFX样式、命中语义、玩法或默认入口；源码、待执行反证、治理与台账已写，所有运行验证顺延。

### P5.3zzza HUD 组合宿主子 Owner 终态所有权（2026-08-12，代码已写、未运行）

模式HUD Presentation Host过去在Projection Consumer或Effect Consumer销毁失败后仍会清空epoch并进入`disposed`；二十武器反馈Host也会在
inner host未完成销毁时清空武器读取计划、方向事实和权威反馈事件。调用方收到错误后，原实例已经失去清理水位或诊断身份，无法准确重试。

现在模式HUD Host为两个子Consumer分别记录完成水位，只重试未完成Owner，二者均完成后才清空epoch并进入`disposed`。二十武器Host同样
保留inner host清理Owner；inner未完成时继续持有读取计划、徒手身份、方向事实与权威事件，重试成功后才统一清空。视觉`remove`只有在同步
返回合同确认后才删除身份。该批不改变反馈内容、Cue映射、队列寿命、方向来源、命中语义、玩法或默认入口；源码、待执行反证、治理与台账
已写，测试、类型、构建、浏览器、设备和性能验证全部顺延。

### P5.3zzzb 二十武器 HUD epoch 身份提交事务（2026-08-12，代码已写、未运行）

二十武器反馈Host过去在切换consumer epoch时，先清空旧epoch的武器读取计划与方向/事件身份，再请求inner host切换。若inner host的视觉
清空或声音停止失败，旧epoch身份已经提前消失，而平台副作用仍可能未清理，无法证明失败状态对应哪一组权威反馈。

现在epoch切换先冻结身份清理，由inner host完整提交新epoch；只有内层Projection/Effect两条链均成功后才清空旧身份并发布新的epoch id。
失败路径转入同一终态清理账本，在inner host真正完成前保留旧身份。该批不改变epoch规则、历史one-shot拒绝、64项保留上限、武器专属Cue、
通用徒手透传或默认入口；源码、待执行反证、治理与台账已写，所有运行验证顺延。

### P5.3zzzc HUD 外部效果实际所有权（2026-08-12，代码已写、未运行）

HUD Feedback Consumer过去把`load()`后的实例直接视为已经拥有外部VFX与Audio；即使从未开始epoch、从未present或play，构造回滚和主动
销毁仍会调用宿主`clear/stopAll`。当端口被同一页面的其他Owner共享时，这会清除并非由当前HUD产生的效果，也扩大上层构造失败的副作用。

现在视觉与音频分别记录“可能已经产生外部副作用”的所有权：在`present/remove/play`调用前先登记，以覆盖调用中途抛错；成功清理后释放。
空Owner和没有产生效果的epoch切换不调用外部端口，实际拥有的效果仍按独立水位失败重试。该批不改变Cue、队列、声音并发、VFX样式、
命中或玩法；源码、待执行反证、治理与台账已写，所有运行验证顺延。

### P5.3zzzd 键盘与触控 Driver 同步返回边界统一（2026-08-12，代码已写、未运行）

本地键盘与触控 Driver 不再各自捕获`Promise.prototype.then`或维护独立thenable原型链扫描；事件监听、可见性端口、viewport、observer、cleanup与错误回调的同步返回现在全部委托`arena-contracts`唯一`assertSynchronousReturn`。因此方向、跳跃、攻击三概念在键盘和触控路径对原生Promise、访问器thenable、循环原型链及描述符漂移使用同一失败关闭语义，不再因输入平台不同而产生处置分叉。操作映射、固定tick、暂停恢复、清理所有权、页面与默认入口均不改变；治理与延期反证已写，测试、类型、构建、浏览器、设备和性能仍未运行，状态保持`production-unreachable / hardGate=false / validationStatus=not-run`。

### P5.3zzzg HUD学习反馈可读性与地图感知拾取（2026-08-13，代码已写、未运行）

二十武器HUD继续复用同一有界反馈队列，但把轻/实/重力度放到标题开头，把“本招用途/下次注意”放到说明开头；窄屏只绘制当前主学习项，次级项不出屏但仍保留队列和读屏语义。Canvas按可用高度收紧最大行数，截断时显式显示省略号。生存本地拾取/替换使用权威地图Definition、同一武器内容目录和地图20段的地形机会计数，最多提示两个适合当前武器的地形；不读取位置或推断玩家当前在哪一段。源码、测试源码和治理标记已写，所有运行验证顺延。

### P5.3zzzh 结算武器×地图练习回看（2026-08-13，代码已写、未运行）

结果页没有增加新页面或字段，只扩展既有`full-match-record`：先显示本局V6聚合出的真实武器使用事实，再在地图身份属于当前两张正式候选地图时，选取本局使用武器中收藏顺序最前的一把，并结合该模式的武器地形后果与该图段落机会，输出一条最多两个地形的下一局练习重点。未知地图、空使用事实或没有有效地形机会时不猜测、不补写。源码、测试源码和治理标记已写，测试、类型、构建、浏览器、设备、性能与真人全部顺延；生产入口、硬门和资产批准状态不变。

### P5.3zzzi 单一武器×地图学习投影与竞技准备提示（2026-08-13，代码已写、未运行）

武器×模式×地图关系最初从准备、拾取和结算三处局部计算收敛为单一只读投影，随后详情与持续HUD也纳入同一合同：输入必须显式给出真实武器Definition集合、地图Definition、模式和焦点策略；投影从同一内容目录读取武器模式后果与地图机会计数，稳定排序后只返回最多两个本图真实存在的地形。1v1/竞速准备页用精确单武器策略增加一条“本局练法”；生存仅在实际拾取或替换后使用；结算只在本局真实使用武器中稳定选择回看焦点。竞技准备同时拒绝武器名、地图名或地图段落总数与Definition漂移。生存准备保持空手且不产生预选武器提示。ADR-134、源码、延期测试与治理标记已写；测试、类型、构建、浏览器、设备、性能和真人全部顺延，默认入口与硬门保持关闭。

### P5.3zzzj 武器×地图具体路段练习示例（2026-08-13，代码已写、未运行）

共享投影不再只返回“边缘、断层、平台入口”等抽象地形。地图内容目录为六类地形机会同时计算总段数，并冻结路线序号最早的匹配路段Definition、序号和消息身份；目录自校验该示例确实是对应地形的最早段。共享投影继续保留原`situationSummary`，另生成“地形（第N段·路段名）”的`practiceSummary`，竞技准备、生存本地拾取和结算回看只切换玩家可见短句，不改变字段、队列或页面。该示例是稳定推荐练习点，不是实时定位，不读取participant位置、支撑面或路线进度，也不写Authority、Reward或Profile。源码、延期测试和治理标记已写；全部运行验证继续顺延，生产入口与硬门保持关闭。

### P5.3zzzk 竞技详情到对局的学习接力（2026-08-13，代码已写、未运行）

武器详情和地图详情没有新增字段或页面，而是在既有延后字段中接入可选竞技学习上下文。当前模式明确为1v1或竞速时，本地宿主把当前选择的武器Definition、地图Definition和模式显式交给详情投影；详情投影验证输入只有三个数据字段、内容目录和消息目录与共享投影同源，并在武器/地图身份一致后附加同一`practiceSummary`。因此玩家在详情页看到的具体练习点会原样进入准备页，再由局内拾取/反馈和结算回看延续。模式尚未选择或当前为生存时仍使用原通用详情，避免在空手模式承诺预选武器。源码、延期测试和治理标记已写；测试、类型、构建、浏览器、设备、性能与真人全部顺延，默认入口和硬门保持关闭。

### P5.3zzzl 快速开始前的当前组合可读性（2026-08-13，代码已写、未运行）

模式选择页继续允许首页进入后直接开始已选模式，不增加准备必经步骤。既有`preparation-entry`延后字段改为显示本次实际冻结候选：1v1/竞速为“当前组合：武器 × 地图；可进入竞技准备”，生存为“当前地图：地图；默认空手，可进入生存准备”。中文名已经在同一投影内与Definition校验，UI不据文案反选内容。页面数、首屏三项、一个主动作和两次主要点击预算均不变。源码、延期测试与治理标记已写；全部运行验证继续顺延，默认入口与硬门保持关闭。

### P5.3zzzsq–P5.3zzzst 模式规则、角色与准备页可选入口（2026-08-13，代码已写、未运行）

模式选择页没有增加新的主按钮，也没有把准备页或角色页放进新手必经路径。“开始这一局”继续直接冻结当前模式、角色、武器与地图并开局；玩家需要更多信息时，才可点击原有`preparation-entry`卡片查看规则。该入口按当前已选模式固定路由：常规1v1与竞速进入既有`match-prep`，生存进入既有`survival-prep`。表现适配器只产生带目标身份的次级意图，本地绑定层再调用现有声明导航；目标与当前模式不一致时失败关闭，UI不参与模式规则判定。

原有`character-entry`首屏卡片同时成为可选“更换角色”入口，进入现有`character-select`六角色页。保存动作继续使用导航Session已有`returnScreenId`返回模式选择页，不增加返回状态或第二套角色选择逻辑。两张卡都使用整卡透明点击层，沿用已有可见文字与读屏说明，最小点击区为48px；原主动作数量精确保持一个。页面仍为11个，不新增按键、玩法、Profile字段、奖励、任务、弹窗或Authority写入。

竞技准备页的既有`character-entry / weapon-entry / map-entry`三张延后信息卡也获得同样的整卡次级入口，分别进入现有角色选择、当前武器详情和当前地图详情。角色保存沿导航Session已有返回身份回到竞技准备；武器和地图详情继续使用各自已有主动作进入模式选择，不创造第二套装备或地图选择状态。内容末尾另有“返回模式”，允许只查看规则后退出，不强迫开局。竞技准备页仍只有“开始比赛”一个主动作并可直接开局。生存准备页没有接入这组竞技装备入口，继续保持默认空手、场上拾取替换的产品规则。

生存准备页则在既有内容滚动区末尾追加“返回模式、角色、武器收藏、地图详情”四项轻量次级动作。四项都复用页面合同中已声明的导航目标；角色保存后返回生存准备，武器只进入收藏目录，地图只查看当前详情。“开始生存”仍是唯一主动作，可从准备页直接开局。武器收藏入口的读屏明确提示“仍然空手开局并在场上拾取”，绑定层也不执行任何武器选择或loadout写入，因此不改变生存的20秒3把掉落、拾取替换或复活规则。窄屏固定2×2，宽屏4列，避免中文标签被四等分挤压。

本切片使用`threejs-game-ui-designer`，参考账本如下：

| 已读取 | 路径 | 本批影响 | 延后项 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 把准备和角色放在次级路径，保持一个清晰主动作 | 动态验收顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 复用现有信息卡与页面，不新增菜单层级 | 浏览器交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 可见提示与真实点击行为一致，目标身份显式传递 | 截图与焦点巡检顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 不改对局HUD，只保持菜单动作优先级 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 使用整卡48px以上点击区，不增加固定宽新按钮 | 窄屏与真机证据顺延 |

源码、延期Vitest、Formal Web静态反证和治理标记已写；测试、类型检查、构建、浏览器、设备、性能与真人验证均未运行，状态保持`production-unreachable / hardGate=false / validationStatus=not-run`。

### P5.3zzzsu 准备页详情单层来源返回（2026-08-13，代码已写、未运行）

准备页进入详情时不再丢失玩家所在的决策上下文。导航Session只在`match-prep → weapon-detail/map-detail`和`survival-prep → map-detail`三条路径上写入已有`returnScreenId`，不建立数组、历史栈或通用后退规则。详情主动作的intent保持原值，导航层根据这一层来源决定回到竞技准备、生存准备或原有模式选择；RenderPlan只把按钮显示文案改成与真实结果一致的“返回竞技准备/返回生存准备”。返回后来源立即清空，防止下一次详情浏览继承旧上下文。

武器收藏目录、地图目录、结算和其他来源进入详情时不记录准备来源，原“选择模式”行为保持不变。生存准备不允许进入武器详情作为准备来源，武器收藏入口只停留在目录层，因此不能把浏览武器转换为生存loadout。该批不增加页面、第二主按钮、导航栈、Profile、装备写入或Authority；源码和延期用例已写，全部运行验证继续顺延。

### P5.3zzzsv 武器与地图详情返回目录（2026-08-13，代码已写、未运行）

武器详情和地图详情现在各自拥有一个明确的目录出口：在滚动内容末尾追加“返回武器库”或“返回地图库”次级动作，整宽且最小高度48px。原唯一主动作不变：普通浏览仍进入模式选择，从竞技/生存准备进入时仍返回对应准备页。这样玩家可以在“继续准备”和“回目录比较其他内容”之间选择，同时保持主次清晰。

次级动作只发出带目标页面身份的表现意图，本地绑定层复核当前必须确实处于对应详情页，随后调用已有声明导航。导航不修改当前武器或地图选择，并在进入目录时自然清除上一层准备来源，避免之后从目录再次打开详情仍错误返回旧准备页。没有新增页面、导航栈、选择器、Profile字段、装备写入或Authority判定；源码、延期用例和治理标记已写，测试、类型检查、构建、浏览器、设备、性能与真人验证继续顺延。

### P5.3zzzsw 详情内相邻内容连续浏览（2026-08-13，代码已写、未运行）

为支撑玩家反复比较20把武器，武器详情在内容末尾增加“上一把武器/下一把武器”两个48px次级动作。顺序唯一来自正式20武器阅读目录，并与当前active Registry取交集；尚未开放的武器不会被连续浏览绕过。三把及以上按目录首尾循环，避免到边界后被迫返回列表；如果可玩池只有一把则不显示相邻动作。地图详情当前只有两张正式地图，因此只显示一个“另一张地图”，避免两个按钮指向同一目标。

同一目录投影还在详情末尾增加一行固定宽数字位置提示：武器显示“武器 N / 当前可浏览数”，地图显示“地图 N / 2”。位置、相邻目标和读屏“第N项，共M项”来自同一个经过Registry过滤的有序集合；相邻按钮同时直接显示目标名称，玩家无需盲点后才知道下一项。只有一项时不显示无意义的相邻按钮，但仍显示“1 / 1”，帮助玩家确认收藏范围。位置文本不产生Intent，也不修改选择或导航。

同一可浏览目录投影还把当前名称锚定到详情页第一阅读点：现有问题从“这把武器什么时候最强？”变为“重锤｜这把武器什么时候最强？”一类明确标题，地图同理；读屏先播报“当前浏览武器/地图：名称”，再读取原问题。它只改写现有`page-question`文字，不增加primitive、字段、页面、动作或第二份名称来源；切换相邻内容后标题、位置和相邻目标会一起重投影。

武器详情仍遵守已接受的“先数值比较、后语义理解”顺序：距离与覆盖、时机与风险保持前两项，原第三项`ground-aerial`不换ID，只把可见信息压成“核心动词｜按一下/按住松开｜主要取舍”。完整蓄势秒数、转向约束、自动结束、地面结果和空中结果继续存在于同一字段的无障碍语义，不产生另一套Action说明。字段标签同步从“地面与空中”改为“核心打法”，消息目录内容版本提升到6，避免缓存把新旧阅读合同视为同一版本。

地图详情使用相同的分层原则：现有`hazard-summary`不换字段身份，而是从体验节奏目录自动取第一段、首个`twist`、首个`climax`和最后一段，要求四项身份互不重复，再显示“起步→变化→高潮→收官”的路线骨架。每个锚点的序号、路段名和练习句保留在读屏语义；原危险统计拼接到既有`full-route`末尾，没有删除内容或创建第二套地图事实。字段标签改为“路线骨架”，中文消息目录提升到版本7。

为了让玩家在进入详情前就区分基础操作，新增共享`projectArenaV2WeaponOperationReadV1`，唯一从20武器Action Definition和中文结果消息投影基础手势、完整commitment与地空结果；它同时接受完整Definition ID和受控collection短ID，并归一回完整身份。武器目录卡只插入紧凑“按一下/按住松开”，详情和HUD消费相同结果。地面与空中若出现不同基础手势则失败关闭，不允许卡片给出模糊组合；HUD不再自行读取`commitTicks/expireTicks/expireOutcome/canTurn`。

点击只在本地绑定层通过现有Host选择接口更新武器或地图身份，不执行导航、不新增历史栈，也不改变准备来源；重新渲染后详情计划身份包含新选择，所以DOM/Canvas滚动归零，玩家直接从新详情顶部开始阅读。从竞技/生存准备进入时，主动作仍返回原准备页；普通浏览时主动作仍进入模式选择，目录返回仍可用。生存即使浏览或选择武器，权威开局仍忽略loadout并保持空手。

同批发现并收敛A6.15预览组合边界：Formal Web现在把Host完整组合后的当前RenderPlan作为证明传给收藏预览桥，桥仍独立核对基础Pipeline、selection、screen/revision和来源计划规范值，随后只插入既有只读预览，不增删动作。兼容路径只供原有隔离夹具使用，生产候选明确携带Host证明。该批不新增页面、主动作、Profile、装备规则或Authority；源码、延期用例和治理标记已写，全部运行验证继续顺延。

### P5.3zzzsx 详情返回目录后定位当前选择（2026-08-13，代码已写、未运行）

武器详情可连续比较20把内容后，直接返回目录不再固定停在顶部。声明导航和当前选择先按原事务成功提交，绑定层随后只读取刚渲染目录里的Selection Action，要求对应武器或地图精确存在一个禁用原因是“已选择”的卡片，再发出显示该primitive的同步表现请求；不存在、重复或身份漂移均失败关闭，不从Binding缓存猜默认选择。

共享Interaction根据当前Surface实际持有的RenderPlan矩形计算卡片中心位置，并把目标偏移限制在`0..contentHeight-viewport.height`。DOM提交同一偏移后更新节点并发布滚动观察值，Canvas用同一解析结果重绘；A6角色和收藏预览包装层只转发primitive身份，因此Formal Web插入预览、改变卡片高度或位置后仍以最终预览计划为准，不复制坐标或布局规则。该批不新增按钮、页面、选择写入、导航状态、Profile或Authority；源码、延期测试与治理已写，测试、类型检查、构建、浏览器、设备、性能和真人验证按用户要求继续顺延。

本批继续使用`threejs-game-ui-designer`：主动作保持“选择模式/返回准备”，连续比较、目录返回均维持次级路径；所有新增动作保持48px下限，UI只发选择或导航意图；位置提示、相邻名称和返回定位共同消费同一RenderPlan与有序目录，不把布局坐标或选择规则复制进包装层。动态排版、浏览器截图、焦点巡检和真人读取检查按用户要求顺延。

本批UI参考账本：`references/ui-patterns.md=yes`、`references/checklists/game-ui-quality.md=yes`、`references/checklists/hud-readability.md=yes`、`references/checklists/responsive-ui-fit.md=yes`，均来自项目`threejs-game-ui-designer`且无读取失败。它们约束了唯一主动作、现有状态源、固定点击下限与三行问题区复用；截图、文本适配、重叠、焦点和真实交互属于动态验证，按用户要求不执行并顺延。

本批武器目录继续沿用同一参考账本：手势作为短标签进入既有卡片description，不创建图标资产、容器或新动作；卡片仍只有一个选择意图，完整操作细节留给详情和读屏。20把武器的窄屏换行、截断、截图和真人快速区分任务未执行，状态保持`not-run`。

### P5.3zzzth 地图目录四锚点路线比较（2026-08-13，代码已写、未运行）

地图目录不再只用人数和总段数区分两张地图。新增共享`projectArenaV2MapRouteSkeletonReadV1`，唯一从地图体验节奏目录选择第一段、首个`twist`、首个`climax`和最后一段，并要求四个Definition身份互不重复。详情继续消费同一投影的带空格可读版本；目录卡把无空格紧凑版本放在既有两行description最前，使后续路线研究阶段、下一段与人数文字被裁切时，地图的真实路线差异仍优先可见。

本批不扩展A6收藏内容schema，不把`experienceBeat`选择算法复制进Host，也不增加卡片、primitive、动作、页面、地图规则、Profile或Authority写入。既有路线研究投影仍精确替换原`路线理解 X/N`片段，卡片仍只发一个地图选择Intent。继续使用`threejs-game-ui-designer`及同一四项参考账本；窄屏两行适配、截断、读屏、浏览器截图、设备和真人地图快速辨识均按用户要求顺延，状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。

### P5.3zzzti 准备页开局前路线确认（2026-08-13，代码已写、未运行）

竞技准备的既有`weapon-map-plan`和生存准备的既有`pressure-summary`现共同消费P5.3zzzth同一地图路线骨架投影。可见文本先追加紧凑四段路线，再按原顺序追加未完成武器情境与下一路段目标；读屏使用同一投影的四锚点阶段、序号、名称和练习句。即使Profile当前没有未完成焦点，准备页也保留路线确认，避免高熟练玩家只看到泛化地图名后直接开局。

本批同时修正增强器对目标字段格式的校验：竞技`weapon-map-plan`必须保持非固定数字，生存`pressure-summary`必须保持既有固定数字格式，避免生存合法字段被错误拒绝。没有增加字段、卡片、页面、按钮或必经步骤，“开始比赛/开始生存”仍是唯一主动作；生存输入仍要求`weaponDefinitionId=null`，路线文案不能形成预选装备。`threejs-game-ui-designer`约束本批只增强既有内容层级并保持UI只读。动态高度、截断、读屏、浏览器、设备、真人理解及所有运行验证继续顺延，状态不晋级。

### P5.3zzztj 结算下一地图路线承接（2026-08-13，代码已写、未运行）

当结果推荐精确为`next-map`时，现有主按钮仍显示“了解下一张：地图名”，不把四段路线塞入按钮标签。Binding改用推荐中的完整地图Definition调用同一四锚点投影，并原位增强结果页唯一`first:next-goal:value`：可见值追加紧凑路线，目标字段和主按钮读屏保留完整阶段、序号、名称与练习句。推荐、目标页面、地图身份和点击前重验逻辑不变；目标值缺失或重复会失败关闭。

本批不增加结果字段、primitive、按钮、页面、推荐类型、导航分支、Profile或Authority。`threejs-game-ui-designer`约束路线信息留在既有说明层，唯一主动作标签保持短而明确。运行测试、布局、读屏、浏览器、设备和真人从结算进入下一地图的连续记忆验证全部顺延，状态继续为`not-run`。

### P5.3zzztk 武器核心打法连续记忆（2026-08-13，代码已写、未运行）

新增共享`projectArenaV2WeaponCoreFightReadV1`，它在既有操作投影之上从同一Weapon Definition和中文消息目录输出武器名、核心动词、基础手势、主要取舍，以及含蓄势时序、转向约束、地面/空中结果的完整读屏语义。完整Definition ID和受控短ID都会先归一到同一武器身份；未知武器、地空手势漂移仍沿原失败关闭边界拒绝。

武器详情的既有`ground-aerial`字段、20武器目录、竞技准备的既有`weapon-map-plan`和结算页既有`first:next-goal:value`共同消费该投影。目录将“核心 动词｜手势｜取舍”放在两行说明最前，再显示收藏与情境进度；准备页先确认武器核心，再说明当前地图练习；结算主按钮继续保持“了解下一把：名称”，核心打法进入现有目标值和读屏。收藏目录中的名称/动词/取舍、准备页名称和结算推荐名称均与共享投影交叉核对，防止显示对象与实际Definition或导航对象漂移。

恢复结算或要求重启时，Binding不解析普通下一武器/地图内容，确保恢复主流程优先。没有新增字段、primitive、页面、按钮、按键、教程、训练场、规则、Profile或Authority写入。继续使用`threejs-game-ui-designer`四项参考账本：唯一主动作不变、卡片优先呈现下一决策、完整信息进入读屏；窄屏两行、长文截断、焦点、浏览器截图、设备和真人3分钟武器辨识均顺延，状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。

### P5.3zzztl 模式选择武器与地图短签名（2026-08-13，代码已写、未运行）

模式选择页复用既有`preparation-entry`，把1v1/竞速压缩为“武器名 + 核心动词·基础手势 × 地图名 + 起点→终点”，把生存压缩为“地图名 + 起点→终点 + 空手开局”。武器与地图摘要分别来自共享核心打法和四锚点路线投影，完整语义进入同字段读屏；生存明确跳过武器核心打法读取。快速开始仍是唯一主动作，不增加页面、字段、按钮、准备步骤、输入、规则、Profile或Authority。源码、延期用例和治理已写，所有运行验证按开发优先策略顺延。

### P5.3zzztm 结算主复盘武器核心打法（2026-08-13，代码已写、未运行）

既有`full-match-record`现在把权威本地武器使用集合、共享地图练法和共享武器核心打法闭合为一个结算复盘句。主复盘身份继续采用既有“已使用武器中正式收藏顺序最低者”策略，最多显示一把，内容为核心动词、基础手势和当前地图最多两个具体练习点；完整主要取舍、操作时序与地面/空中结果进入同字段读屏。显示名称必须与共享Definition投影一致，否则失败关闭。

该复盘只说明下一局练什么，不声称本局命中次数、成功率、最佳武器或失败原因。空手局和未知地图继续只显示权威使用事实。没有新增命中统计、事件、字段、页面、按钮、任务、奖励、Profile写入或Authority；动态排版、读屏、浏览器、设备、真人和性能验证按开发优先策略顺延。

### P5.3zzztn 首页武器/地图长期目标学习签名（2026-08-13，代码已写、未运行）

成长层仍先按既有Definition、Profile和可玩Registry解析唯一下一目标；新只读投影只消费该目标已经携带的`weaponDefinitionId / mapDefinitionId`。武器身份存在时，首页既有`next-goal`追加“打法：核心动词·基础手势”，完整核心打法进入读屏；地图身份存在时，可见文本追加“路线：起点→终点”，完整四锚点路线进入读屏；交叉挑战同时显示各一条。两种身份都为空时返回原字段语义，不能凭当前选择或上局使用对象猜测目标。

三模式Information Host只把`pages.profiles.learning.nextGoal`已解析的武器与地图身份交给投影，不参与目标选择，也不写Profile。字段Owner、ID、数量、首页主动作和两次点击开局承诺不变；没有新增页面、按钮、任务、奖励、Authority或第二内容源。源码、延期用例和治理已写，全部运行验证继续顺延。

### P5.3zzzto 首页与结算共用下一学习目标签名（2026-08-13，代码已写、未运行）

首页字段增强器与结算Binding现在共用`projectArenaV2NextLearningSignatureReadCandidateV1`。该读取只接受成长层已经确定的武器、地图Definition身份：武器输出名称、短版“打法：核心动词·基础手势”和展开版“核心动词｜基础手势｜主要取舍”；地图输出名称、短版“起点→终点”和展开版四锚点路线；交叉挑战一次最多组合一把武器和一张地图。未知身份失败关闭，两种身份均为空时不改变既有字段。

三模式Information Host新增轻量`getInformationNextLearningGoalRead()`，结算页只在正常`result-reward`且没有恢复门时读取真实Profile下一目标，避免为了取目标创建完整Profile UI投影。导航推荐仍只负责唯一主按钮、目标页面和模式调整，不能选择学习签名；`next-weapon / next-map`特殊承接继续把推荐名称和Definition与真实目标签名交叉核对。普通`next-goal / prepare-next-goal`因此也能在既有`first:next-goal:value`中显示武器、地图或交叉挑战的展开签名。复玩文案仍分离“立即再来一局”和“长期成长目标”。

没有新增字段、primitive、页面、按钮、推荐算法、Profile写入、Authority或第二内容源。实现继续保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；本批使用`threejs-game-ui-designer`约束信息层级与单一主动作，动态排版、读屏、浏览器、设备、真人和性能验证按用户要求统一顺延。

### P5.3zzztp / P6.90 首页记录总览与底栏定位（2026-08-13，代码已写、未运行）

底栏仍只有`开始 / 武器 / 地图 / 记录`四项，“记录”仍复用首页既有`recent-records`字段，不增加独立记录页。P6成长读取按Definition固定顺序输出1v1、竞速、生存三类Profile记录，并追加模式熟练、武器收藏与主研究、情境与情境研究、地图收藏与路线研究、挑战与挑战进度；完整游玩、完成与胜场语义继续进入读屏。P5展示适配保留Reward Profile原有“累计结算N次；经验X”，只在同字段末尾追加成长摘要，不修改字段Owner、label、fixed-width语义或Profile。

导航点击后不再只依赖`focusFieldId`停在首页顶部。Binding严格复核Host返回`screenId=home / focusFieldId=recent-records`，在当前已渲染计划中寻找唯一`deferred:recent-records:value`文字primitive，并调用通用primitive定位。共享解析器只消费当前RenderPlan的rect/clip/scrollRegion，居中后按边界夹紧；DOM、Canvas、收藏预览和角色预览包装层只转发，不重新拥有布局。短记录仍使用窄屏/常规屏88/96px基础高度；完整长期摘要由P5.3zzzv在同一卡内按文字宽度扩展，不再以两行截断事实。

本批未新增页面、字段、卡片、动作、任务、奖励、Profile schema、写入者或Authority；默认入口仍关闭。延期用例和治理清单已登记但未执行。使用`threejs-game-ui-designer`的影响是保持单一主动作、复用延后信息卡、完整读屏与短可见摘要分层；截图、动态文本适配、浏览器、设备、真人、测试、类型、构建和性能全部顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

本切片技能与强制参考账本：

| 已读取 | 路径 | 本批影响 | 未覆盖原因 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 记录入口复用既有信息页与只读Profile事实，不创建第二套UI Authority | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 保持一页一问题、一个主动作，底栏只负责到达既有内容 | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 可见摘要与完整读屏分层，内部字段身份和玩家标题分离 | 运行截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 本批不改局内HUD；仅确认没有新增会遮挡战斗的记录层 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 记录卡由共享布局确定实际高度并使用几何定位，不依赖固定偏移 | 双视口、动态字体与真机证据顺延 |

### P5.3zzzv 首页/结算长期进度共享可读布局（2026-08-14，代码已写、未运行）

首页`recent-records`与结算`earned-progress`仍各自只有一个既有字段、panel、label和value primitive。新增纯函数只消费当前字段Owner已验证的`screenId / fieldId / valueText`和共享文字宽度：首页把累计＋经验、三模式个人最佳、模式熟练、武器＋情境研究、地图＋路线研究、挑战进度排成稳定行组；结算把成长层发布的全部实际生效回执按原有中文分号换行，不重排、不合并、不隐藏成“另有N项”。`accessibilityText`不拆分，仍由同一个DOM节点/Canvas语义消费者完整承载。

共享Layout在`390×844 / 1440×900`按同一估算规则计算行数和卡高；首页短记录保留88/96px，结算短文保留96px，长文在4096码点边界内保留全部行，超界、预置换行或空分段在发布前失败关闭。增长内容只增加既有滚动区`contentHeight`，主动作和底部导航继续固定在滚动区外。RenderPlan校验自身卡高与Layout完全一致；DOM使用`pre-line`，Canvas显式尊重同一换行，未增加primitive、字段、卡片、页面、按钮、音画资源、Three Owner或生命周期状态。

本切片为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口与正式资产门没有变化。延期测试源码覆盖首页完整分组、结算七条实际回执、短文不膨胀、双视口纵向滚动、DOM/Canvas同几何、完整读屏、空段和4096码点边界；按用户要求均未执行。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 一页一问题、一个主动作；不为长期进度新增Dashboard容器 | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 复用现有字段与纵向滚动，不添加第12页或第二事实源 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整事实可见、完整语义可读，不以省略计数掩盖回执 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只在局外页建立稳定主次；不改局内HUD或Authority | 动态文本截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口同一几何算法，内容增长由纵向滚动承接 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 48px主动作与底栏保持在内容滚动区外 | 触控设备顺延 |

### P5.3zzzva 结算阶段与收藏完整回执可读布局（2026-08-15，代码已写、未运行）

成长Owner的既有`collection-change`可在同一次已提交结算中串联武器主研究里程碑、地图路线里程碑与新武器/地图收藏；原58/68px、最多两行的延后卡不能保证这些事实全部可见。本切片仅将该既有字段加入P5.3zzzv共享可读布局：按上游中文分号原顺序换行，依据当前文字宽度确定行数与卡高，完整内容由既有纵向滚动承接。短状态仍维持原高度；`accessibilityText`仍是一条完整语义。

实现没有读取Profile、Definition目录、nextGoal、奖励或完成度，也没有重排、合并、补算或隐藏回执；P6.132的模式页仍只消费同一次已验证`nextGoal`。现有field、panel、label、value、主动作与导航primitive身份全部不变，DOM/Canvas继续消费同一RenderPlan，未增加资源Owner或生命周期状态。空分段、预置换行和4096码点越界继续在新布局发布前失败关闭。

状态严格保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、A0.3、Blockout和正式资产门均未开放。延期测试源码覆盖双视口多回执、短文原高度、primitive身份零增量、完整读屏、空分段和单一主动作；按用户要求未执行测试、类型、lint、格式化、构建、浏览器、设备或性能验证。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用既有结算延后卡与单一主动作，不新建Dashboard或第二事实源 | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 一页一问题；多回执在同一卡内形成垂直阅读层级 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 不截断真实变化，不以“另有N项”隐藏事实 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外结算层级，不改HUD、Cue或Authority | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 390×844与1440×900使用同一宽度驱动布局和纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 48px主动作保持在内容滚动区外 | 触控设备顺延 |

### P5.3zzzvb 完整对局记录可读布局（2026-08-15，代码已写、未运行）

Product Result Owner的既有`full-match-record`可包含本局地图、完整本地武器使用集合、已经由共享投影选定的单一主复盘与下一局练习位置；20武器上限下，原58/68px、最多两行的延后卡不能保证这些只读事实全部可见。本切片仅将该既有字段加入共享可读布局：按Owner输出的中文分号原序换行，依据当前文字宽度确定卡高并由既有纵向滚动承接。短记录仍维持原高度，完整`accessibilityText`仍由一个语义节点承载。

Presentation不读取Product Result结构、武器Definition或地图目录，不重选主复盘、不统计使用次数，也不把练习建议当作命中或表现结论；P6.132的模式页继续只消费同一次已验证`nextGoal`。现有field、panel、label、value、主动作与底栏primitive身份不变，DOM/Canvas继续消费同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。空分段、预置换行和4096码点越界在布局发布前失败关闭。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、A0.3、Blockout和正式资产门均关闭。延期测试源码覆盖20武器长记录、双视口、短文原高度、primitive身份零增量、完整读屏、空分段和既有纵向滚动；按要求未执行任何运行验证。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用既有结算卡和单一主动作，不新建复盘页面或Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 地图、使用事实、主复盘与练习点在同一卡形成稳定纵向层级 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整事实可见，不用省略计数隐藏武器集合 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外结算，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口使用同一宽度驱动布局与纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 主动作和底栏保持在滚动区外 | 触控设备顺延 |

### P5.3zzzvd 经验明细可读布局（2026-08-15，代码已写、未运行）

Reward Owner的既有`reward-breakdown`可依次包含模式规则原因、规则请求经验、档案上限后的实际入账和重复结算说明；原58/68px、最多两行的延后卡不能保证最长合法说明全部可见。本切片只将该字段加入共享可读布局：按Owner输出的中文分号原序换行，依据当前文字宽度扩展原卡并使用既有纵向滚动。短说明保持原高度，完整`accessibilityText`仍由一个语义节点承载。

Presentation不读取Result、Reward Definition、Profile或Grant，不重新计算requested/granted experience，也不判断committed/duplicate；P6.132的模式页仍只消费同一次已验证`nextGoal`。现有field、panel、label、value、主动作与底栏primitive身份不变，DOM/Canvas共用同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。空分段、预置换行和4096码点越界继续在发布前失败关闭。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、A0.3、Blockout和正式资产门均关闭。延期测试源码覆盖最长三段经验说明、双视口、短文原高度、primitive身份零增量、完整读屏和恶意空分段；所有运行验证按要求顺延。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用既有经验明细卡与单一主动作，不创建奖励Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 规则原因、请求值与实际入账在同一卡内保持稳定阅读顺序 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 不截断封顶或重复结算说明，不用颜色代替文字 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外结算层级，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口用同一宽度驱动布局和纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 主动作和底栏保持在滚动区外 | 触控设备顺延 |

### P5.3zzzve 地图详情完整路线可读布局（2026-08-15，代码已写、未运行）

地图Owner的既有`full-route`会按地图内容目录输出逐段路线并在末尾保留危险统计；当前两张图分别有12段和8段，原58/68px、最多两行的延后卡不能保证完整路线可见。本切片只将该字段加入共享可读布局：按Owner输出的` → `分隔符原序换行，依据当前文字宽度扩展原卡并使用既有纵向滚动。短状态保持原高度，完整`accessibilityText`仍由一个语义节点承载。

Presentation不读取地图Definition、路线节奏目录、危险类型或模式记录，不计算段数、不选择路线锚点，也不把文字顺序反向写入地图规则。现有field、panel、label、value、主动作与底栏primitive身份不变，DOM/Canvas共用同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。空路段、预置换行和4096码点越界继续在发布前失败关闭。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、P6准备页、P7 Evidence Store、A0.3、Blockout和正式资产门均未触碰。延期测试源码覆盖12段长路线、双视口、短文原高度、primitive身份零增量、完整读屏、空路段和单一主动作；所有运行验证按要求顺延。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用地图详情既有延后卡和单一主动作，不创建路线Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 逐段路线在同一卡内建立垂直阅读顺序，不增加第12页 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整路线可见，不以省略计数隐藏路段 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外地图详情，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口使用同一宽度驱动布局与纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 主动作和底栏保持在滚动区外 | 触控设备顺延 |

### P5.3zzzvf 地图详情武器影响可读布局（2026-08-15，代码已写、未运行）

地图详情Owner的既有`weapon-consequences`可同时包含地标顺序、每段供给与不同地形对推离/拉取/压制/侧袭落点的影响，以及可选的当前竞技武器练习建议；原58/68px、最多两行的延后卡不能保证最长合法内容完整可见。本切片只将该字段加入共享可读布局：按Owner输出的中文句号原序分行，依据当前文字宽度扩展原卡并复用既有纵向滚动。短说明保持原高度，完整`accessibilityText`仍由一个语义节点承载。

Presentation不读取地图或武器Definition、路线节奏目录、动作语法、模式规则或Learning状态，不选择练习建议、不解析分号内的战斗含义，也不把文本反向写入Authority。现有field、panel、label、value、主动作与底栏primitive身份不变，DOM/Canvas共用同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。空句、预置换行和4096码点越界继续在发布前失败关闭。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、P6终态消费者、P7 Evidence Store、A0.3、Blockout和正式资产门均未触碰。延期测试源码覆盖最长三句影响说明、双视口、短文原高度、primitive身份零增量、完整读屏、空句和单一主动作；所有运行验证按要求顺延。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用地图详情既有延后卡与单一主动作，不创建武器影响Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 地标、影响与练习建议在同一卡形成垂直阅读顺序，不增加页面 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整建议可见，不用颜色或省略计数代替文本 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外地图详情，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口使用同一宽度驱动布局与纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 主动作和底栏保持在滚动区外 | 触控设备顺延 |

### P5.3zzzvg 武器详情地图后果可读布局（2026-08-15，代码已写、未运行）

武器详情Owner的既有`map-consequences`可同时包含武器学习问题、1v1/竞速/生存的地图后果以及可选的当前竞技地图练习建议；原58/68px、最多两行的延后卡不能保证最长合法内容完整可见。本切片只将该字段加入共享可读布局：在Owner输出的中文分号后插入换行并保留分号，依据当前文字宽度扩展原卡并复用既有纵向滚动。短说明保持原高度，完整`accessibilityText`仍由一个语义节点承载。

Presentation不读取地图或武器Definition、模式规则、学习目录或Profile，不拆分首段中的学习问题和1v1事实、不选择竞技建议，也不把文本反向写入Authority。现有field、panel、label、value、主动作与底栏primitive身份不变，DOM/Canvas共用同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。空子句、预置换行和4096码点越界继续在发布前失败关闭。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、P6终态消费者、P7 Evidence Store、A0.3、Blockout和正式资产门均未触碰。延期测试源码覆盖最长四段地图后果、双视口、短文原高度、分号保真、primitive身份零增量、完整读屏、空子句和单一主动作；所有运行验证按要求顺延。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用武器详情既有延后卡与单一主动作，不创建地图后果Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 学习问题、三模式影响与竞技建议在同一卡形成垂直阅读顺序 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整建议可见，不用颜色或省略计数代替文本 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外武器详情，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口使用同一宽度驱动布局与纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 主动作和底栏保持在滚动区外 | 触控设备顺延 |
| 是 | `docs/architecture/arena-art-and-audio-development-flow.md` | UI只消费只读字段Owner输出，不持有规则状态或新增资源路径 | 运行与设备门顺延 |

### P5.3zzzvh 武器详情完整研究旅程可读布局（2026-08-15，代码已写、未运行）

Learning Owner的既有`weapon-record`可同时包含已收藏/未收藏状态、当前主研究阶段、唯一下一情境及练法、五情境逐项证据、全武器主研究和全部情境研究旅程；原58/68px、最多两行的延后卡不能保证最长合法内容完整可见。本切片只将该字段加入共享可读布局：在Owner输出的中文分号后插入换行并保留分号，依据当前文字宽度扩展原卡并复用既有纵向滚动。短说明保持原高度，完整`accessibilityText`仍由一个语义节点承载。

Presentation不读取Progression、Profile、Definition、情境resolver或目录，不解析进度数值、阶段、收藏状态和证据，不选择下一目标或下一情境，也不把文本反向写入成长或Authority。现有field、panel、label、value、主动作与底栏primitive身份不变，DOM/Canvas共用同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。空子句、预置换行和4096码点越界继续在发布前失败关闭。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、P6终态消费者、P7 Evidence Store、A0.3、Blockout和正式资产门均未触碰。延期测试源码覆盖完整七段研究旅程、双视口、短文原高度、分号保真、primitive身份零增量、完整读屏、空子句和单一主动作；所有运行验证按要求顺延。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用武器详情既有延后卡与单一主动作，不创建研究旅程Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 收藏、阶段、下一情境、五情境与全目录旅程在同一卡形成垂直阅读顺序 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整旅程可见，不用颜色、截断或省略计数代替上游文本 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外武器详情，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口使用同一宽度驱动布局与纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 主动作和底栏保持在滚动区外 | 触控设备顺延 |
| 是 | `docs/architecture/arena-art-and-audio-development-flow.md` | UI只消费只读字段Owner输出，不持有成长状态或新增资源路径 | 运行与设备门顺延 |

### P5.3zzzvi 地图详情完整研究与熟练旅程可读布局（2026-08-15，代码已写、未运行）

Learning Owner的既有`mode-records`同时包含当前地图路线研究阶段、下一里程碑、单图路线理解、三模式整体熟练、全地图路线研究、全部路线理解与唯一下一路段；原58/68px、最多两行的延后卡不能保证最长合法内容完整可见。本切片只将该字段加入共享可读布局：在Owner输出的中文分号后插入换行并保留分号，依据当前文字宽度扩展原卡并复用既有纵向滚动。短说明保持原高度，完整`accessibilityText`仍由一个语义节点承载。

Presentation不读取Progression、Profile、地图Definition、模式熟练resolver或路线目录，不解析进度数值、阶段、里程碑与路段证据，不选择下一里程碑或下一路段，也不把文本反向写入成长或Authority。现有field、panel、label、value、主动作与底栏primitive身份不变，DOM/Canvas共用同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。空子句、预置换行和4096码点越界继续在发布前失败关闭。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、P6终态消费者、P7 Evidence Store、A0.3、Blockout和正式资产门均未触碰。延期测试源码覆盖完整七段地图研究旅程、双视口、短文原高度、分号保真、primitive身份零增量、完整读屏、空子句和单一主动作；所有运行验证按要求顺延。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用地图详情既有延后卡与单一主动作，不创建路线研究Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 单图、全目录、模式熟练和下一路段在同一卡形成垂直阅读顺序 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整旅程可见，不用颜色、截断或省略计数代替上游文本 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外地图详情，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口使用同一宽度驱动布局与纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 主动作和底栏保持在滚动区外 | 触控设备顺延 |
| 是 | `docs/architecture/arena-art-and-audio-development-flow.md` | UI只消费只读字段Owner输出，不持有成长状态或新增资源路径 | 运行与设备门顺延 |

### P5.3zzzvj 竞技准备完整本局练法可读布局（2026-08-15，代码已写、未运行）

本切片先逐页复读11页全部既有延后字段及其当前最终生产者。`record-type / character-record / best-survival-record / counter-inputs / all-weapon-records / all-map-records`是稳定短摘要；`all-weapon-records`当前真实输出精确只有“产生研究记录；完成五情境理解”两段，明确不纳入长文布局。`load-diagnostic`虽可很长，但属于加载诊断且没有稳定分段合同；`weapon-entry / preparation-entry / pressure-summary`存在窄屏换行风险，但信息量低于最终竞技准备计划。影响最大的未覆盖字段是`match-prep/weapon-map-plan`：准备学习焦点Owner会在既有武器×地图练法后追加长期目标、四段路线骨架、武器情境目标和下一路段，形成最多六段、直接影响开局前决策的合法文本。

本批只将`weapon-map-plan`加入共享可读布局：在Owner输出的中文分号后插入换行并保留分号，依据当前文字宽度扩展原58/68px卡并复用既有纵向滚动。Presentation不读取Progression、Profile、地图/武器Definition、路线目录或情境resolver，不解析数值、长期目标、路线与情境，不选择下一目标或下一路段，也不把文本反向写入成长或Authority。现有field、panel、label、value、三张详情入口、“开始比赛”主动作与底栏primitive身份不变，DOM/Canvas共用同一RenderPlan；没有异步、资源Owner、Three、媒体或销毁状态增量。

状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，默认入口、P6终态消费者、P7 Evidence Store、A0.3、Blockout和正式资产门均未触碰。延期测试源码覆盖完整六段准备计划、双视口、短文原高度、分号保真、primitive身份零增量、完整读屏、空子句和单一主动作；所有运行验证按要求顺延。

| 已读取 | 路径 | 本批约束 | 仍缺证据 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 复用竞技准备既有延后卡与唯一主动作，不创建准备Dashboard | 运行验证顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 本局练法、长期目标、路线骨架和两类练习目标形成垂直阅读顺序 | 真实交互顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 完整准备事实可见，不用颜色、截断或省略计数代替上游文本 | 浏览器与读屏顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 只改局外竞技准备，不增加局内HUD竞争 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 双固定视口使用同一宽度驱动布局与纵向滚动 | 双视口截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 三张次级入口、48px目标和“开始比赛”主动作不变 | 触控设备顺延 |
| 是 | `docs/architecture/arena-art-and-audio-development-flow.md` | UI只消费准备Owner只读输出，不持有成长或规则状态 | 运行与设备门顺延 |

### P5.3zzzvk 正式Three透传VFX精确语义执行（2026-08-15，代码已写、未运行）

P5长文布局子线收口后的源码复读确认，正式武器VFX样式已经消费A5/A6唯一战斗语法源，但实际Three VFX执行Owner对非专用透传Cue仍使用`cueId.includes('fell') / includes('finish')`选择几何。合法`participant-fell-movement`与`participant-fell-environment`因此会被误画成武器击落，未来包含相同片段的未知Cue也可能在独立执行边界获得结果形状；这与Art Bible“武器击落和移动坠落保持因果分离”及表现层不得重判Authority的边界冲突。

本批把产品VFX端口已有22项透传Cue提升为唯一冻结导出，Three包建立一一对应的深冻结语义表，并要求正式执行Owner在创建任何Three效果、相机冲击或目标角色冲击前精确解析。`participant-fell-credited-hit`保留ring-out缺口轮廓；移动/环境坠落统一使用movement-fall下落轮廓且不触发武器冲击；`race-finish-claimed`只以精确身份复用surface-transfer完成轮廓。未知、未来或相似字符串失败关闭，`sourceEventId`重放指纹同时绑定语义身份；专用20武器×2情境样式与directional链不变。

该切片不新增VFX层、纹理、粒子、draw call、音频、页面、按钮、输入或玩法事实，不修改3项同屏、每项96粒子、2x overdraw、低动效、静音、加载许可、迟到资源或销毁Owner，也不接默认入口。源码与延期Vitest/Node反证已写，状态保持`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`；测试、类型、构建、浏览器、GPU、设备、性能、截图与真人因果识别全部顺延。

技能与参考账本：使用`game-art-director`选择“先闭合命中因果语言、不给候选资产或程序化层授予正式资格”的切片；使用`vfx-realtime`并读取`patterns.md / sharp_edges.md / validations.md`，按Shape→Timing→Color、整数tick、资源Owner和预算不扩张约束实现。`game-art-director`要求的`docs/collaboration-protocol.md`与`docs/game-design-theory.md`仍不存在，只保留为治理红缺口，不创建占位，也不进入运行包数据。

### P5.3zzzvl 两图路线引导与危险非颜色形状语言（2026-08-15，代码已写、未运行）

本批在“20把武器一眼可辨”和“竞速/生存共用地图可学”之间复读真实生产链。20武器已有正式目录、地面/持握Readability Owner和正式Three Stage消费；地图投影虽已携带当前段`guidanceShape / riskShape`，正式Three此前却只按体验强度缩放入口Cue，玩家无法从局内形状区分平台、断层、台阶、分叉、窄轨、钢丝以及安全、压力、选择、恢复。该缺口同时影响Race路线学习和Survival危险预读，故优先闭合地图链。

产品投影现导出唯一深冻结的六种引导与四种风险值域，并继续从正式`KzRouteSegmentKind / KzRouteSurvivalRole`单源映射；同一投影为冻结路线的12+8全部段落生成规范顺序形状目录，当前精确支撑Surface仅选择额外强调段，不推算下一段。Three包新增纯数据形状目录与exact-key Resolver，24种组合的实际transform签名必须唯一。正式路线Readability Owner只对GLB已有、声明`presentationOnly`的`ArenaV2SegmentEntryCue`组合基础scale/quaternion：引导负责平面比例与朝向，风险负责高度与静态倾斜，体验强度只作统一倍率，不破坏相对形状；TopCap、碰撞面、路线Surface和正式资产字节不变。三类Anchor Cue先按目标节点聚合，再相对已应用形状后的最大轴恰好增加一次确定性统一强调（普通`+0.28`、低动效`+0.12`）；24种组合均可见，同一节点多Cue不叠乘。当前段必须与同一形状目录闭合，地标Surface必须属于冻结路线；相邻段合法共用边界Surface，不强造单段归属。未知/future形状、目录/当前段地标漂移、未知Surface、零或非有限基础transform都在视觉提交前失败关闭；clear/leave/destroy恢复精确原scale与quaternion。reduced-motion保留同一静态比例/倾斜，不创建动画、RAF、timer或随机。

正式Stage原有“投影→Owner.sync”调用链继续作为唯一消费点，本批没有新增Geometry、Material、Texture、draw call、资源Owner、页面、按钮、输入、Rule、Route或胜负判断，也不从坐标、摄像机、动画完成、ID子串或颜色反推路线/危险。源码、Vitest反证与文档已写，状态严格为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`；地图资产仍未获生产批准，类型、测试、构建、浏览器、双视口、设备、性能、截图和真人路线/危险识别证据全部顺延。

技能与参考账本：使用`game-art-director`比较武器与地图生产链并选择真实断点；使用`level-design`及其`references/pacing-and-flow.md`，只把既有引导线、地标、节奏与风险投影成可读形状，不修改可达性或关卡结构。`game-art-director`要求的`docs/collaboration-protocol.md`与`docs/game-design-theory.md`仍缺失，只保留治理红缺口，不创建占位。

### P5.3zzzvo 两图跨段章节地标语言（2026-08-15，代码已写、未运行）

P5.3zzzvl已使12+8个局部段的引导/危险形状可分，但既有正式Three消费链没有跨段节奏分组，玩家只能记单个障碍，难以快速识别当前处于路线哪一章。本批新增唯一深冻结章节目录：基座图12段按`3+3+3+3`闭合，折返图8段按`2+2+2+2`闭合，章节仅绑定已冻结Map/Route Definition、段序号和Map Experience目录hash。五种非颜色章节语法通过比例与静态方向组合同一批既有`ArenaV2SegmentEntryCue`，同图4章语法互异；每章首段只在同一语法上增加一次`1.04`统一尺度，不编码玩家进度或未来路线。

Three Readability Owner的重算顺序现为`原始基准 → 路段shape → 章节landmark → 当前段 → safe-anchor/respawn`：每次sync先恢复构造时scale/quaternion，再从冻结目录重算，不累乘。Anchor Cue继续按目标节点聚合恰好应用一次，因此章节边界不会吞掉当前段、safe-anchor或respawn强调。clear/destroy恢复精确原transform，reduced-motion保留章节静态轮廓。本批不新建Geometry、Material、Texture、draw call、资源Owner或动画，不改世界父节点position、碰撞、Route/Surface、复活、终点、敌人、武器、输入或Authority；Survival复用同一地图章节语言。

源码与延期Vitest反证已写，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。未运行测试、类型、构建、治理脚本、浏览器、真机、性能、压测或截图；地图资产仍未获生产批准，`0/5/12m`轮廓、遮挡与真人章节识别证据顺延。技能账本使用`game-art-director → level-design`，强制参考`docs/architecture/arena-art-and-audio-development-flow.md`、Art Bible、对齐矩阵、P5.3zzzvl源码以及`level-design/references/pacing-and-flow.md`。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与`templates/art-bible.md`仍为治理红缺口，未创建占位。

### P5.3zzzvm 二十武器持有/世界拾取共享轮廓比例（2026-08-15，代码已写、未运行）

静态复读正式资产Catalog、20武器attachment binding/首屏可读性、角色持有Owner、世界拾取Owner、动作阶段可读性与正式Three Stage后确认：两条局内链已共用同一武器档案和各自确定姿态，但档案只有统一scale，没有把每把附件的宽/长/厚轮廓强化冻结为两种状态共享身份。尤其多个候选复用相近KayKit徽章、盾面、箭簇或单/双手附件时，实战距离下仍过度依赖原模型与颜色差异。

本批只在现有唯一可读性档案中为20把武器增加各自唯一的`identityScaleAxes`，并把每轴硬限制在`0.84..1.25`。比例来自既有附件与档案的宽面、长轴、紧凑体/厚度语义，不按collection order编码不可感知微差。角色持有和Three Stage地面拾取继续使用同一装饰器，因此自动消费同一轴比例；持有/地面Euler、统一基础scale和持有动作阶段仍保持各自既有值。每帧从构造时宿主非均匀scale重算，阶段统一倍率恰好叠加一次，同tick重放不累乘；替换、失败关闭和`destroy`仍恢复精确原transform/材质引用。

本批不新增或修改GLB/PNG/OGG，不创建程序化几何、Material、Texture、draw call、动画、碰撞或Authority事实；不改武器数值、hitbox、拾取、命中、输入、页面或默认入口。资产missing仍隐藏附件并请求既有非空间状态Cue，不扩大fallback。源码和延期Vitest反证已写，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；0/5/12m轮廓、六角色穿插、双视口、真实GLB加载、浏览器、设备、性能和真人辨识全部顺延。

技能与强制参考账本：使用`game-art-director`和`game-3d-assets`；完整读取两份`SKILL.md`、`docs/architecture/arena-art-and-audio-development-flow.md`、Art Bible、对齐矩阵、A4武器附件评审准备、A4/A5首屏可读性合同和真实Catalog/Owner/Stage源码。项目约束覆盖`game-3d-assets`的通用生成/下载流程，本批不调用Meshy、不联网、不索要API key。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`和技能引用的`templates/art-bible.md`当前不存在，只登记为治理红缺口，未创建占位。

### P5.3zzzvn 二十武器正式命中VFX结果层级（2026-08-15，代码已写、未运行）

静态复读武器VFX样式、22项透传语义、目标角色冲击Owner和正式Three Stage确认：三种命中结果已有不同`18 / 28 / 42` tick包络与目标材质峰值，但武器样式最终输出的大小主要由每把武器轮廓决定；大轮廓武器的轻命中可能接近小轮廓武器的击落，低质量档只剩核心层时尤其削弱结果分级。

本批不新增VFX层或对象，而是在每把武器原样式内增加深冻结`resultHierarchy`，并把倍率直接应用到正式执行器已读取的`shape / particles / direction`。同一武器和情境内，`hit-confirm → surface-transfer → ring-out`的形状、粒子和方向范围严格递增；`attack-evaded`保持rank 0、粒子范围归零且继续使用非命中轮廓；`movement-fall`仍返回null样式和null战斗语法。20把×2情境沿用同一个语法source hash、动作Definition和接触轮廓，不读取位置、碰撞、动画、事件顺序或颜色来重判结果。

正式Stage、Three VFX端口和目标角色冲击Owner无需新增接线：既有端口已消费这些样式字段，Stage仍只调用有界Owner，三项同屏、sourceEventId幂等、同tick不同已选事件、整数tick、epoch/pause/clear/dispose和失败清理合同不变。每项96粒子、3层、2x overdraw、5份候选纹理、draw call与材质/Geometry所有权均未扩大；低质量仍保留核心形状，reduced-motion/static仍保留结果形状并关闭动态包络，静音不改变视觉。

源码与延期Vitest反证已写，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。未运行测试、类型、构建、浏览器、真机、性能、压测或截图；5份VFX纹理生产批准与真人Shape/Timing/Value识别仍为红门。回滚只需移除样式中的`resultHierarchy`倍率、对应延期测试与本节/Art两处登记，不涉及资产字节、Rule/Core、P6/P7或默认入口。

技能与强制参考账本：依次使用`game-art-director → particle-systems → vfx-realtime`；读取`docs/architecture/arena-art-and-audio-development-flow.md`、`.agents/skills/particle-systems/references/PARTICLES_GUIDE.md`以及VFX的`patterns.md / sharp_edges.md / validations.md`。本批遵守移动端先设计、核心层不可裁、无扭曲、显式上限与回收原则。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`和`templates/art-bible.md`仍缺失，只登记为治理红缺口，未创建占位。

### P5.3zzzvp 正式命中VFX同锚点确定性分槽（2026-08-15，代码已写、未运行）

静态复读P5.3zzzvn样式与正式Three VFX执行器确认：Owner虽保留同tick不同`sourceEventId`的最多3项效果，但所有活动效果每次sync都会把根节点写到同一body-impact、held-weapon-tip或权威world anchor并复制同一相机朝向。结果是三项资源都存在，玩家看到的核心形状却可能完全重合；更强ring-out也可能把同锚点的hit-confirm/surface-transfer遮成一层。

本批新增纯数据同锚点组合器，并接入现有正式VFX sync：先按既有tick包络排除已隐藏效果，再解析当前可见锚点但不修改Three，随后按现有结果rank、权威整数tick/sequence和`sourceEventId`稳定排序；透传Cue直接使用已经精确解析的shape语义形成同一rank，不依赖可选相机/角色冲击端口。每组最高语义项保持中心，第二、第三项分别使用镜头平面`(-0.24, 0.18)`与`(0.24, 0.18)`；不同participant、body-impact/held-weapon-tip和不同精确world anchor各自从中心开始。分槽只平移现有根节点，不读取位置来判定命中，不修改形状、方向、粒子、纹理、tick包络、材质透明度、目标角色或相机冲击。reduced-motion/static保留相同静态形状分离。

组合顺序固定为`稳定Presentation command/style → tick可见性 → 无副作用锚点解析 → 同锚点分槽 → 既有opacity/scale与authority方向 → render`。输入exact-key、最多3项、重复`sourceEventId`、未知rank/字段和缺失lane均在节点提交前失败关闭；已隐藏项不占中心lane也不调用锚点resolver。组合器没有持久历史，clear/remove/epoch/dispose继续只由既有VFX Owner回收实际资源。预算仍为同屏3效果、每项96粒子、2x平均overdraw，Geometry/Material/Texture/draw call/资源Owner均零增量。

源码和延期测试源码已写，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。未运行测试、类型、lint、格式化、构建、治理、浏览器、设备、截图、性能或压测；5份VFX纹理生产批准、同锚点多反馈遮挡、reduced-motion、多人拥挤和真人因果辨识仍顺延。回滚文件为同锚点纯组合器及其导出/测试、正式VFX端口的rank与分槽接线，以及本节/Art Bible/对齐矩阵三处登记；不涉及Rule/Core/P6/P7、资产字节或默认入口。

技能账本使用`game-art-director → particle-systems → vfx-realtime`，同时只读`level-design`和`game-3d-assets`既有结论以排除地图/附件重复开发。强制参考为`docs/architecture/arena-art-and-audio-development-flow.md`、`particle-systems/references/PARTICLES_GUIDE.md`、`vfx-realtime/references/patterns.md / sharp_edges.md / validations.md`与`level-design/references/pacing-and-flow.md`。项目边界覆盖通用技能中的下载、生成和泛化预算，本批没有调用Meshy、联网或生成资产。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与`templates/art-bible.md`继续是治理红缺口，未创建占位。

### P5.3zzzvq 正式命中VFX相机边缘内向构图（2026-08-15，代码已写、未运行）

静态复读P5.3zzzvp确认：同锚点三槽虽然不再互相遮成一层，但固定“中心＋左右上方”扇形在锚点靠近左、右或上边缘时仍可能把次级形状继续推向画面外；右上等角落若只选单轴，另一轴仍可能继续外扩。该问题直接削弱多人拥挤时的命中层级，却不需要新资源或玩法事实。

本批新增纯数据相机边缘内向组合器。正式Stage先完成相机sync并更新正交相机投影/世界矩阵，VFX随后只对已解析的表现锚点执行世界坐标→NDC正向投影。NDC绝对值超过`0.72`时，第二/第三槽的既有固定幅度扇形按左、右、上、下转向画面内侧；同时靠近两边时使用`top-left / top-right / bottom-left / bottom-right`四种角落构图，两槽分别采用不同的双轴内向偏移。主槽始终为零偏移，不移动权威视觉锚点。相同锚点的投影必须逐值一致，`anchorIdentity + lane`必须唯一；重复事件、重复lane、投影漂移、非有限值、未知字段或超量在任何Three根节点变更前失败关闭。

该能力不是视口裁剪器：它不反投影、不读取viewport像素、不测量效果半径或clip rect、不钳制角色/世界锚点、不做遮挡/深度穿透，也不从屏幕位置推断命中、坠落、方向或胜负。它只保证次级槽不再沿当前受压边继续外扩；极端已经出界的锚点仍可能不可见。reduced-motion/static保留同样的静态内向构图。

预算和生命周期均未扩大：仍为最多3项效果、每项96粒子、2x平均overdraw；没有新增Geometry、Material、Texture、draw call、材质层、资源Owner、RAF、timer或无界历史，只增加一个复用的Vector3数学暂存。clear/remove/epoch/pause/dispose继续由既有VFX Owner处理。源码与延期测试源码已写，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

未运行测试、typecheck、lint、formatter、build、治理脚本、浏览器、设备、截图、性能或压测。真实边缘/角落、不同效果半径、极端出界、平台遮挡、多人拥挤、reduced-motion和真人因果辨识继续顺延；这些证据不能由纯NDC单测替代。回滚只需移除相机边缘纯组合器及其导出/延期测试、正式VFX端口中的投影与二次组合hunk，以及本节/Art Bible/对齐矩阵对应段落；不涉及Rule/Core/Replay/Authority、P6/P7、资产字节或默认入口。

技能与参考：使用`game-art-director → particle-systems → vfx-realtime`，完整读取各`SKILL.md`及`PARTICLES_GUIDE.md / patterns.md / sharp_edges.md / validations.md`，并遵循项目`arena-art-and-audio-development-flow.md`。通用技能建议中的新增粒子、软粒子、扭曲和下载资产均被Arena项目预算覆盖而未采用。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与`templates/art-bible.md`继续登记为治理红缺口，不创建占位。

### P5.3zzzvr 正式Web Audio同级拥挤最新事件优先（2026-08-15，代码已写、未运行）

静态审计确认：正式Web Audio的8 voice池满时，旧实现使用`cue.priority <= lowest.priority`，会把与当前最低voice同级的最新命中/击落Cue记入recent后直接丢弃；玩家只能继续听到较旧的同级声音。这是实际拥挤优先级执行断点，不需要修改Cue、媒体或Authority。

本批保留`drop-lowest-priority`命令合同，但将满池决策精确为：新Cue低于最低priority时，消费该`sourceEventId`并进入64项recent水位，不创建节点；同级或更高时，以`priority升序 → 单调ordinal升序 → sourceEventId稳定尾序`选出最旧最低voice。同级因此表达“最新权威事件优先可听”，而不是提高任何Cue的声学优先级或增益。

淘汰事务仍沿用唯一Web Audio Owner：先对选中voice执行`stop → source.disconnect → gain.disconnect`，确认该身份不再留在活动表后，才允许`createBufferSource/createGain`。任一清理回调失败、同步重入或债务仍在时，新voice不创建，Owner进入failed并继续保留未完成节点的可重试所有权。成功播放后的新`sourceEventId`同样进入recent水位，因而丢弃和已播两条路径都不能重播。ordinal必须保持安全整数，耗尽时在淘汰和节点创建前失败关闭。

预算与主流程不变：最多8 voice，不新增AudioNode、总线、媒体、并发、响度、播放率或ducking；不读取墙钟或随机，不回写Rule/Core/Replay/Profile，不改默认入口或当前0项音频生产批准门。延期源码反证已写，但测试、类型、lint、格式化、构建、治理、浏览器、设备、听感、长局拥挤和性能均未运行。这些证据不能由源码排序反证替代。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

技能与回滚：本批使用`audio-design → game-art-director`，完整读取两份`SKILL.md`、`audio-design/references/adaptive-music.md`与项目`arena-art-and-audio-development-flow.md`；本批没有自适应音乐改动。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与`templates/art-bible.md`仍为治理红缺口，未创建占位。回滚仅需移除正式Web Audio的voice排序/满池决策hunk、延期源码反证与本节/Art Bible/对齐矩阵/生产计划登记；不涉及音频字节、Cue resolver、Rule/Core/P6/P7或默认入口。

### P5.3zzzvs 二十武器低动效静态攻击阶段形状（2026-08-15，代码已写、未运行）

窄审计先比较了两个允许方向。地图正式Three链已同时消费2图20段固定Definition、24种guidance/risk组合、两图章节地标、当前段以及safe-anchor/respawn Cue，并按`基准 → 路段shape → 章节 → 当前段 → anchor`逐帧重算；在不运行截图或设备验证的条件下没有新的可证明源码断点。武器链则存在明确不对称：普通模式能看到20项独立`phasePose`，但`reducedMotion=true`会完全跳过阶段旋转和尺度，实际只剩材质颜色/明度，攻击阶段缺少非颜色形状线索。

本批保持普通模式不变，为低动效增加三态静态轴形：windup=`0.96/1.06/1.00`、active=`1.08/0.95/1.04`、recovery=`0.98/1.01/0.96`。输入仍只有已验证的当前武器Definition、持有态和`MatchReadFrameV3.participant.action.phase`；每次同步从宿主原始transform、20把武器既有`identityScaleAxes`和持握比例重算，不累乘、不读取动画完成、坐标、命中、音频时长或墙钟。地面拾取只能是idle，不被这三态误装饰；静音不改变形状。

预算与Owner不变：只写既有附件根节点local scale，普通阶段rotation路径保持原样；不创建Geometry、Material、Texture、节点、动画、draw call或第二资源Owner。失败继续走既有完整transform/material恢复和可重试销毁债务；同tick幂等、武器/动作身份、future字段和64项事件水位仍由原Owner失败关闭。延期测试源码登记了三态exact闭集、轴值边界/唯一性、20把实际静态阶段形状、静音独立与destroy精确恢复，但没有运行。

技能与治理：使用`game-art-director → game-3d-assets`并完整读取两份`SKILL.md`及项目`arena-art-and-audio-development-flow.md`；项目禁止Meshy、下载和新资产，覆盖了通用技能的生成优先建议。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与`templates/art-bible.md`仍缺失，仅登记红缺口，不创建占位。回滚只需移除可读性Owner中的低动效静态轴形、对应延期测试与本节/Art Bible/对齐矩阵/计划登记。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzvt 多目标角色受击可读性容量（2026-08-15，代码已写、未运行）

A/B窄审计先确认武器与地图身份链：20把武器已有持有/地面/阶段同源轮廓，2图20段已有局部形状、章节地标、当前段与anchor叠加；本批不重复扩张。真实断点位于正式角色受击Owner：活动容量按事件截断，同一目标的ring-out/surface-transfer等多条记录可占满3项，而resolve又只对该目标取最大强度，导致另一个真实目标完全没有明度/停顿/方向可读反馈。

本批把可见容量单位收紧为明确目标。每个`participantId`的方向/原因赢家按`impact kind priority降序 → tick降序 → impactScaleMultiplier降序 → sourceEventId UTF-8升序`确定：不同结果继续由既有结果层级先裁决；同一kind先选更新事件，避免旧事件即使初始倍率更高也压住已到达的新反馈；仅同tick再比较力度，最后以稳定ID收口。全局最多3个不同目标仍另用`impact kind priority降序 → sourceEventId UTF-8升序`的代表事件排序，不把tick或力度扩成新的容量语义。没有读取坐标、VFX形状、动画完成或当前装备来重判命中；同目标非赢家只作为有界贡献者保留，用于逐tick计算最大强度与`max endTick`停顿，既不叠加也不占第二个目标槽。赢家remove或过期后从仍存贡献者按同序接替，缺失方向仍不猜测。贡献者与recent共同受64项硬上限保护，溢出在水位变更前失败关闭；所有已消费事件不能在后续revision重播。

预算与生命周期不变：角色受击Owner仍最多3个活动目标，内部贡献者复用原64身份硬边界；正式VFX仍最多3项、每项96粒子、2x平均overdraw，没有新增Geometry、Material、Texture、draw call、动画、资源Owner或无界历史。tick/epoch倒退、同ID漂移、future字段继续在提交前失败关闭；remove可提升剩余贡献者，clear、reduced-motion/static与dispose沿用现有行为。延期测试源码只写未运行，覆盖同一目标不重复占槽、三目标同时保留、同kind同tick轻重不受输入顺序影响、新tick优先于旧tick初始力度、新tick内稳定ID不受输入顺序影响、最长剩余停顿、winner移除接替、64项溢出原子拒绝、方向赢家及epoch清理。

技能与治理：使用`game-art-director → vfx-realtime`，读取项目流程以及VFX的`patterns / sharp_edges / validations`，应用Shape/Value优先、同屏层级有界和核心线索不被冗余效果挤出的约束；没有采纳新增粒子、透明层或屏幕效果。`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与`templates/art-bible.md`仍为治理红缺口，不创建占位。回滚只需移除character impact Owner的目标级聚合hunk、对应延期反证与本节/Art Bible/对齐矩阵/生产计划登记。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzvu 二十武器HUD同步端口边界（2026-08-15，代码已写、未运行）

二十武器HUD Host的Audio/Visual同步数据方法查找现限定最多32层，并以visited身份拒绝循环原型；可选方向端口若为访问器会在执行getter前失败关闭。所有端口在inner Host构造前完成捕获，非法输入不会创建反馈Owner或调用效果端口。外部回调吞掉生命周期重入时，粘性反调仍令本次consume原子失败，清理已发出的视觉/声音并且不提交队列或读取身份水位。当前共享字节中徒手source ID集合只声明一次、徒手方向事实只提交一次；同tick多反馈顺序、64身份窗口、武器/动作/方向事实、Cue、3视觉槽与8声音槽均不变。

延期规格覆盖循环/33层原型、可选端口访问器零执行、吞重入失败清理；P5 runner、边界治理和reachability继续复用既有HUD Host登记。未运行测试、类型、lint、格式化、构建、治理、浏览器、设备、性能或压测。默认Surface/Composition/entry继续断开，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzvv 逐帧补给事实端到端必需边界（2026-08-15，代码已写、未运行）

正式链路不再把逐帧`supplyFacts`视为可选兼容字段。Mode Match Runtime、Authoritative Local Session、Mode Product Session、Learning Bridge与HUD-ready Learning Session逐层把它列为required；Duel/Race提交空数组，Survival提交本tick完整权威增量。任一层缺失都会在事件、Learning或HUD消费者之前失败关闭，不能再由下游静默回退为空数组而吞掉拾取、替换、过期和生成反馈。

该修复只收紧Authority到Presentation的显式传递合同，不改变Supply Authority、事实顺序、HUD槽位、Cue、音频/VFX预算、成长、Profile、玩法、页面或输入。正式终局V2/V3结算链仍独立重验完整事实前缀；逐帧反馈与终局成长因此使用同一权威来源但保持各自Owner。延期静态反证、P2/P5/P6治理标记与计划登记已写，未运行测试、类型、构建、治理、浏览器、设备、性能或压测。默认Surface/Composition/entry继续断开，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

技能记录：本批使用`game-art-director`确认拾取/替换/过期属于必须可见的反馈语义，并读取项目美术与音频开发流程；因A0.3及技能要求的两份泛化参考仍为红缺口，没有制作、替换或批准任何美术/音频资产，也没有把灰盒素材升为正式路径。

### P5.3zzzvw 权威Frame审计与补给节奏显式链（2026-08-15，代码已写、未运行）

正式逐帧链不再允许`readFrameAudit`与`supplyCadence`在中间层成为兼容可选字段。Authoritative Local Session原本已强制发布两者；Mode Product Session、Learning Bridge和HUD-ready Learning Session现在同步把两字段列为required。Product Session还会在Result Assembler前把全部required字段确认为自有、可枚举、纯数据字段，访问器不会执行也不能留下半组装赛果。任何缺失或字段形状漂移都必须在Result Assembler、Learning Handoff或HUD Projection消费前失败关闭，不能再出现比赛与成长继续推进、HUD因缺审计而静默跳过整帧更新的分叉。

HUD start/step去掉了“有审计才投影、无审计就忽略”的分支，始终从显式审计Frame和同tick Supply Cadence创建唯一表现投影。该批不新增HUD事实、提示条数、音频/VFX、页面、按键、规则、成长或Profile写入；延后反证与P5/P6治理标记已写，未运行测试、类型、构建、治理、浏览器、设备、性能或压测。默认Surface/Composition/entry继续断开，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzvx 命中方向事实逐帧显式链（2026-08-15，代码已写、未运行）

正式链路不再允许`weaponFeedbackDirectionFactsV2`作为可选兼容字段。Authoritative Local Session要求Runtime每帧显式提交方向事实数组，并继续逐项闭合对应`WeaponFeedbackResolved`的事件ID、tick、sequence与反馈类型；没有命中反馈的帧也必须提交空数组。Mode Product Session、Learning Bridge与HUD-ready Session逐层把该字段列为required，Product在Result Assembler前先确认其为纯数据字段，Bridge在Learning事件交接前确认，HUD直接消费而不再缺失回退为空。

该批不新增方向推断、不读取镜头或坐标、不改变命中、击退、反馈种类、HUD容量、音频/VFX、成长、Profile、页面、输入或玩法。延期反证覆盖Session、Product和Bridge的缺字段失败关闭，静态规格确认HUD不存在兼容空数组分支；全部未运行。默认Surface/Composition/entry继续断开，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzvy 本地跳跃能力开局/逐帧显式链（2026-08-15，代码已写、未运行）

Duel、Race与Survival三个正式Authority本来已经在开局和每个权威step发布本地玩家`localJumpAvailability`，但Runtime与中间Session合同仍把它当作可选兼容字段。现在Mode Match Runtime会在提交自身状态前拒绝缺失；Authoritative Local Session要求该能力显式存在，并与同帧tick、event sequence和local participant逐值闭合；Mode Product Session、Learning Bridge和HUD-ready Session在开局及逐帧都把它列为required。Product会在进入running或调用Result Assembler前拒绝缺失，Bridge会在状态或Learning事件推进前拒绝，HUD直接投影而不再回退为`null`。逐帧补给事实与命中方向仍只在step读取，不错误扩张到start。

该批只保证“方向＋跳跃”唯一操作集的权威可用性反馈不会中途丢失，不新增操作键、格挡、技能、训练场或输入手势，不改变Movement、地面跳/空中跳判定、角色参数、地图、武器、成长、Profile或页面。延期反证与治理源码已写但未运行；默认Surface/Composition/entry继续断开，状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzvz 权威canMove到方向盘可用性反馈（2026-08-15，代码已写、未运行）

正式Web原先只把`ArenaLocalJumpAvailabilityV1.state`投影给跳跃按钮，没有消费同一权威事实中的`canMove`，因此命中硬直、掉落终态等不可移动阶段仍会显示一个完全可用的方向盘。现在一个共享Projector只校验一次Scene、tick、event sequence和local participant，再同时生成Movement与Jump两个只读快照：`canMove=true`映射方向ready，否则映射blocked；Jump继续使用原权威state。

方向盘复用既有无颜色单通道的透明度＋斜杠语汇，不新增按键、手势、动画、tone或资产。Movement availability与`idle/pressed`正交，blocked仍转发原始方向输入，由权威Movement拒绝或恢复执行；Presentation不会因表现状态截断命令。视觉事实覆盖单调tick/参与者闭合、隐藏、离场、解绑、失败和销毁清理；Composition三项可用性任一提交失败时全部回滚。未运行测试、类型、构建、治理、浏览器、设备、性能或压测；状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwa 真实primary press/hold可用性反馈（2026-08-15，代码已写、未运行）

三模式正式Authority原来都在local action sidecar中硬编码`primary=selected / primaryHold=none`，使主攻击按钮无法反映准备期、冷却、硬直、动作轨道占用、掉落/冲线后不可操作，也会把蓄力武器的按住通道错误标成不可用。Duel现从MatchCore公开快照已生成的Action Affordance严格拷贝本地press/hold；Race与Survival用各自当帧Rule Actor集合调用同一Rule Engine的`local-context-primary`投影。

正式Web Primary availability现在同时验证`primary`和`primaryHold`，任一通道为selected就显示ready，两者都不可用才显示blocked。该修正不改输入映射、Action Resolver、冷却、动作阶段、蓄力阈值、武器数值、HUD容量、按键或资产，仅让只读反馈与真实裁决一致。所有运行验证顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwb Scene/HUD末端Movement能力必传（2026-08-15，代码已写、未运行）

上游Runtime、Authoritative Session、Product Session、Learning Bridge与HUD-ready Session已经把`localJumpAvailability`设为开局及逐帧必传，但最终`ArenaV2MatchSceneReadFrameCandidateV1`和Validated HUD Projection仍接受`null`并省略字段。这会让能力事实在最后一段静默丢失，使正式Web只能在更晚的按钮投影阶段报错，或让其他Scene消费者把“没有事实”误当成兼容状态。

现在Scene投影直接要求完整`ArenaLocalJumpAvailabilityV1`，并在提交Scene前闭合Frame tick、event sequence和PublicInfo本地参与者；Validated HUD Projection永久持有同一能力，读取接口不再返回`undefined`。缺失、`null`、未来字段或身份漂移都在Scene/HUD模型形成前失败关闭，不允许回退为unknown继续比赛表现。该批不改变Movement或Jump裁决、不新增按键、手势、能力、HUD区域、成长、Profile、页面或资产；所有测试、类型、构建、治理、浏览器、设备和性能验证继续顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwc 蓄力进行中Primary持续有效反馈（2026-08-15，代码已写、未运行）

二十武器三概念输入合同及Pointer Input原本已把主攻击映射为`primaryPressed / primaryHeld`，Authority也会在松开时按整数tick提交或取消承诺，因此不需要新增按键或重写输入。但Action Affordance描述的是“当前能否开始一个新动作”：Read Counter进入蓄力后combat lane被既有动作占用，press/hold探针都可能返回ignored，旧Primary视觉会在玩家仍应按住时错误显示blocked。

正式Web现在同时读取同一Scene中本地参与者的权威Action snapshot。只有`action.commitment.status=charging`、动作Definition存在且phase仍为windup时，Primary继续显示ready；`committed`、普通lane占用、冷却、硬直和终态仍保持blocked。该逻辑不重算commit tick、不判断松开结果、不修改InputFrame、Action Resolver或Action Execution，只表达“当前按住仍有意义”。延期反证覆盖charging ready与committed blocked，治理标记同步写入；所有运行验证继续顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwd 权威蓄力级别主攻击手势提示（2026-08-15，代码已写、未运行）

蓄力可用性修正后，玩家仍只能看到同一个“攻击”字样，无法在三分钟基础操作内理解何时继续按住、何时可以松开。为保持页面和操作极简，本批不新增进度条、环形计时、音效、VFX、按钮或HUD槽位，只扩展共享Visual Tokens的三项文字闭集：`press→攻击 / hold→按住 / release→松开`。

正式Projector只在本地权威Action为charging时读取`chargeLevel`：0显示“按住”，大于0显示“松开”；没有承诺或已committed时显示“攻击”。Pointer Surface在同一availability提交事务内原子更新透明度/斜杠与独立Label，失败时两者共同回滚；同tick状态或手势漂移均拒绝，隐藏、解绑、离场、失败和销毁恢复“攻击”。该提示不读取墙钟、不复制commitTicks、不判定释放结果，也不改InputFrame、Action Resolver、武器数值、成长或页面。延期测试与治理源码已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwe 二十武器命中方向事实末端转发（2026-08-15，代码已写、未运行）

Validated Step Projection已经逐项闭合每条`WeaponFeedbackResolved`与`weaponFeedbackDirectionFactsV2`的事件ID、tick、sequence和反馈种类，但20武器专属Validated Host在调用内部Owner时只传了Model和事件，遗漏了方向事实。现在该宿主显式转发投影中已经验证并冻结的同一数组，内部20武器读取计划、专属VFX/音频、地图方向语言和生命周期去重可以消费同一权威事实，不需要重新读取Scene、坐标或当前装备。

本批不增加命中种类、粒子、音频、HUD槽位、页面、按键、规则或成长来源，也不放宽通用HUD Host的输入合同。延期规格覆盖一条真实20武器Action的命中事件和方向事实能够同时留存在专属Owner；P5/P6治理固定最后一跳标记。全部测试、类型、构建、治理、浏览器、设备与性能仍未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwf 专属反馈代次基线拒绝武器反馈重放（2026-08-15，代码已写、未运行）

通用HUD Host在`beginEpoch`时会消费Baseline Model中的反馈项；但20武器专属Host只有逐帧`consume`路径才闭合V6事件、方向事实、武器读取计划和专属Cue。若新代次基线夹带武器反馈，旧实现会直接播放通用效果，绕开专属链。现在正式使用的20武器Validated Host检查已验证方向事实数量，非零时在任何音画端口调用前失败关闭；新代次的武器反馈必须统一由`consume`进入。模式与供给反馈不依赖20武器专属读取计划，因此仍可按通用基线合同处理。

这不删除Replay或Authority历史，也不改变普通HUD Host；它只禁止在新表现代次重播旧武器反馈。延期规格覆盖拒绝后音频/视觉调用均为0、内部Host仍处于created并可释放。全部运行验证顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwg 共享平台操作映射与三分钟上手可发现性（2026-08-15，代码已写、未运行）

既有三概念输入合同已经逐项闭合6个角色、20把武器的40个地面/空中动作、2张地图与20个路段，但实际键盘键位只存在于Driver，触控标签和11页操作文案又各自写死，玩家在没有训练场的产品约束下无法直接知道“按什么”。本批在`arena-presentation-runtime`增加一个只含不可变数据的平台操作映射：键盘固定为WASD/方向键移动、空格跳跃、J/E攻击；触控固定为方向盘、跳跃键、攻击键，蓄力继续使用同一攻击键按住并松开。

键盘/触控Driver、共享Visual Tokens和现有加载/模式/角色操作文案全部消费这份映射；模式页和角色页读屏播报同步读出真实键盘与触控操作，信息消息目录升至版本10。没有新增页面、字段、按钮、引导步骤、训练场、输入概念或Authority分支，格挡、蹲伏、冲刺和下砸仍不可用。延期规格与P5/P6治理源码已写未运行；窄屏、长文本、读屏、浏览器、设备、真人3分钟理解和性能统一顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwh 徒手权威方向与力度末端反馈（2026-08-15，代码已写、未运行）

生存开局默认空手，第一批武器要到既有补给时点才出现。该时段的两种徒手Action已经发布完整`WeaponFeedbackResolved`与V2方向事实，但20武器HUD Host此前只为徒手事件保留事实，最终仍调用无方向的通用视觉端口和未按冲量分级的通用音频端口，导致玩家最早接触战斗时看不清击退方向与力度。

本批增加严格徒手方向表现投影，只接受两项既有徒手Action、四种既有通用命中Cue，并逐项闭合命令、V6事件与V2方向事实的event ID、tick、sequence和kind。20武器HUD Host在端口支持时转发该闭包；正式Three VFX继续使用同一个通用Cue语义、现有形状/时序、方向箭头、镜头冲击与目标角色冲击，只让Authority冲量选择现有轻/中/重缩放档。旧视觉端口没有新方法时继续走原通用表现。徒手SFX沿用既有Cue、SFX→Master→limiter和8 voice预算，仅复用同一力度投影提高最低priority/gain dB，不创建新媒体或总线。

该批不新增命中种类、Action、规则、数值、输入、页面、HUD槽位、纹理、Geometry、Material、粒子、透明层、draw call、音频媒体、Cue、总线、成长或Profile字段。视觉遵循`vfx-realtime`的Shape–Timing–Color、现有质量档和显式关闭开关，尤其保持3项同屏、每项96粒子、2x平均overdraw及无distortion预算；音频遵循`audio-design`的总线与dB边界，不引入按clip私有音量或自适应音乐。源码、延期规格及P5/P6治理已写；测试、类型、构建、治理执行、浏览器、设备、实听、截图、性能和真人归因全部顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

| 技能 | 已读取的强制参考 | 本批约束 |
|---|---|---|
| `vfx-realtime` | `.agents/skills/vfx-realtime/SKILL.md`、`references/patterns.md`、`references/sharp_edges.md`、`references/validations.md` | 方向形状优先于装饰；复用既有时序、亮核/暗边、质量档和关闭开关；禁止新增overdraw、distortion与无界粒子 |
| `audio-design` | `.agents/skills/audio-design/SKILL.md` | 只在既有SFX总线和dB档位内提高命中可辨性；不新增媒体、总线、音乐系统或无界voice |

### P5.3zzzwi 命中音频Priority与Gain独立下限（2026-08-15，代码已写、未运行）

统一力度投影已经为轻击、实击、重击定义最低voice priority与最低gain dB，但执行函数原本只比较priority：只要既有语义优先级达到下限，就原样返回整个命令。`hit-ring-out`本身属于最高voice priority 3，而普通攻击者视角的既有强调只产生-3 dB；重击要求priority 3与-2 dB，因此会出现“优先级满足、响度仍未满足”的半升级。

本批将两个下限独立求最大值：priority只升不降，gain dB也只向更响的既有离散档提升；两项均不需要变化时继续返回原命令。延期反证固定重击击落的基础priority 3、gain -3 dB必须输出priority 3、gain -2 dB。该调整同时服务20武器与P5.3zzzwh徒手方向链，但仍只消费Authority水平冲量，不从武器等级、距离、动画或文本推断力度。

该批遵循`audio-design`的总线与dB边界，不修改Cue、样本、变体、SFX→Master→limiter、8 voice、抢占策略、ducking、静音、Profile、成长、页面、规则或Authority。源码、延期反证及P5/P6治理已写；测试、类型、构建、治理执行、浏览器、设备、实听、响度、性能和真人辨识全部顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwj 结果页具体调整动作（2026-08-15，代码已写、未运行）

结果页已经持有经过结算与当前长期目标闭合的目标模式、目标武器和目标地图，但`prepare-next-goal`主按钮仍只显示“调整后继续”，玩家必须点击后才能知道要改什么。本批让同一主按钮对比当前选择与冻结推荐，只列真正变化的项目，例如“调整为竞速＋武器名＋地图名”；读屏文本完整说明改动，并明确动作只进入已有模式确认页、不会自动开局。目标身份和名称必须成对出现，推荐没有实际变化或没有落到模式确认页时失败关闭。

生存路线不会把长期目标武器伪装成开局装备：按钮只列模式与需要预选的地图，读屏继续说明生存空手开局，具体目标武器必须在场上遇到后拾取。该批不新增页面、按钮、选择字段、Profile、奖励、任务、规则、武器、地图、输入、资产或默认入口；延期静态反证与P5/P6治理源码已写未运行，测试、类型、构建、布局、读屏、浏览器、设备与性能统一顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwk 显式下一目标具体目的地（2026-08-15，代码已写、未运行）

玩家显式选择`next-goal`时，Host已经冻结真实`targetScreenId`及模式、武器和地图身份，但原主按钮统一显示“继续长期目标”。本批按既有目的地生成具体动作：模式页显示“确认模式＋武器＋地图”，武器/地图详情显示精确名称，尚未进入active Registry的目标武器显示“查看目标武器”，完整目录则显示“返回首页继续”。每条文案都复用同一次学习签名，身份、名称、页面或选择夹带发生漂移时失败关闭。

该批不改变P6.100已经建立的导航与准备会话，只替换现有单主按钮文案；不新增页面、按钮、动作、导航栈、Profile、任务、奖励、玩法、资产或默认入口。生存模式确认仍明确空手开局与场内拾取。延期静态反证和P5/P6治理源码已写未运行，测试、类型、构建、布局、读屏、浏览器、设备及性能继续顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwl 精确地图路段下一目标签名（2026-08-15，代码已写、未运行）

唯一下一目标已经为`map-segment`和部分交叉挑战冻结`segmentDefinitionId`，但首页与结果页共用的学习签名此前只读取武器和地图身份，因此玩家只看到地图名及四锚路线，无法知道下一局具体练哪一段。本批把路段身份加入同一只读签名：先显示“下一段：序号.名称”，扩展与读屏版本同时给出该段学习重点，随后继续显示原四锚路线骨架，保持“当前具体问题优先、整图记忆随后”的阅读顺序。

路段必须属于目标地图；`map-segment`缺少路段、普通收藏/模式目标夹带路段或消息目录不闭合时均失败关闭。Host首页与结果页都直接传递同一次`nextGoal.segmentDefinitionId`，不复制目标Resolver。该批不新增页面、字段ID、按钮、Profile字段、任务、奖励、地图段、玩法、输入或资产；延期规格与P5/P6治理源码已写未运行，测试、类型、构建、长文、读屏、浏览器、设备与性能继续顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzztq 选角首屏模式装备剪影（2026-08-13，代码已写、未运行）

角色预览现在消费Local Host狭窄的模式装备只读值。1v1/竞速从当前已选武器出发，复用正式20武器资产绑定、首屏轮廓档案的手持Euler/缩放与角色`handslot.r`挂点；生存始终返回`previewWeaponDefinitionId=null`，因此选角页与真实空手开局一致。预览剪影和角色共同进入同一bounds取景，切换模式/武器会改变mount identity；角色、模式、武器、资产绑定或active Registry任一漂移都在绘制前失败关闭。

该预览不读取位置、命中、动作阶段或未来状态，不新增RAF、输入、页面、按钮、资产字节或Authority。武器clone只拥有Object3D层级，共享预加载几何/材质/纹理；destroy只脱离和清空clone，不dispose共享渲染资源。正式资产批准、A0.3、0/5/12m剪影、窄屏穿插、双视口、浏览器、设备、真人、性能、测试、类型和构建全部顺延，状态为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

本切片技能与强制参考账本：

| 已读取 | 路径 | 本批影响 | 未覆盖原因 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 角色与开局武器共用一个静态取景，不增加自动旋转或第二个预览面板 | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 保持选角页原问题、原卡片和原主动作 | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 预览只表达真实开局状态，生存不用错误武器装饰 | 运行截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 本批不改Gameplay HUD；仅确认剪影不引入额外文字层 | 高动作场景不受本批影响 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 角色与武器合并bounds后再计算统一缩放 | 390×844、1440×900、动态字体和真机证据顺延 |

### P5.3zzztr 选角正式预览滚动投影与生命周期（2026-08-13，代码已写、未运行）

角色正式预览不再把`scrollOffsetCssPixels !== 0`等同于不可显示。正式Web宿主用当前滚动量（包括浏览器细粒度滚动产生的小数CSS像素）投影预览矩形，并沿用“整个预览矩形必须位于内容clip内”的保守裁剪政策：完整可见时才读取当前Profile/装备并把当帧位置交给Renderer，部分或全部离开可见区时跳过这些读取并只隐藏画布。角色、武器、模式、资源、视口和预览尺寸仍组成mount identity，但屏幕`x/y`不再进入identity，因此滚动不会重复clone模型、材质或武器层级。

裁剪隐藏和页面离开现在是两个不同生命周期事件。裁剪隐藏保留active mount，重新滚回完整可见区可直接绘制；Host返回`null`表示已经离开角色页，此时显式`clear()`角色、Mixer、自有材质和武器clone，但保留可复用的owner与Renderer。该切片只改Presentation，不新增RAF、输入、页面、按钮、规则、Profile或Authority；默认入口仍断开。滚动连续性、边界像素、重复进出、GPU内存、390×844、1440×900、浏览器、设备和性能全部为`not-run`。

本切片继续使用`threejs-game-ui-designer`及其`ui-patterns`、`game-ui-quality`、`hud-readability`、`responsive-ui-fit`强制参考：影响是将滚动位置从资源身份剥离、复用既有内容裁剪区、避免不可见预览占用绘制，同时不改变选角问题和主动作。技能要求的运行截图、动态字体、读屏、双视口和设备响应验证按开发优先要求顺延，不能视为通过。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzts 选角预览构造/销毁可重试所有权（2026-08-13，代码已写、未运行）

角色预览组合此前只在Mount Owner、Renderer和Render Surface全部建立后才写入字段；中途失败后的回滚若再次失败，唯一可重试对象可能只剩局部变量，构造返回后即丢失。现在Mount Owner由工厂返回即移交字段；Renderer在被Render Surface接管前由显式孤儿引用持有，Render Surface构造成功才清除孤儿引用。任何回滚项只有真正完成清理才清空对应字段，失败引用继续由组合实例持有。

终态清理也从无条件清引用改为逐项完成水位：隐藏预览、解绑滚动、销毁Render Surface或孤儿Renderer、再销毁其借用的Mount Owner，最后才销毁底层Surface；Renderer或Mount仍有债务时，底层画布与上下文不会被提前移除。load回滚在取得解绑函数后立即将其移交字段，解绑未成功时不会先销毁仍可能回调的底层Surface。Mount内部又分别记录Mixer停止/uncache、武器脱离/清空、每份材质、Group、Model、Camera和两盏灯的完成水位；构造回滚未清完的资源进入Owner清理债务Set，Renderer也分别记录Scene和底层Renderer的销毁水位；旧mount退役失败时，新mount只执行一次回滚并显式标记已处理，避免外层catch重复清理。共享角色构造函数同步纳入该闭包：材质clone一产生即登记，模型clear与每份材质dispose分别记录完成水位；更外层正式角色构造把Controller、Root与材质清理债务交给Factory，选角模型债务交给Preview Mount Owner，避免最内层异常只留下无Owner的AggregateError。外层Local Surface Binding同步收紧为`Information Surface → Local Host Consumer → Match Surface Producer`：角色/收藏/DOM任一信息清理没完成时，不会继续释放仍被信息层借用的Host；Local Host持有的HUD、音频和VFX消费者未释放时，也不会提前释放Match Host媒体生产者。只有解绑、信息Surface、Host Owner和可选Match Surface全部完成，Binding才进入`disposed`。每项成功后才提交完成状态，失败后实例保持`failed`并允许后续`dispose()`精确重试；同步重入被拒绝。该切片不改变选角画面、角色/武器语义、滚动政策、页面、输入、规则、Profile、Authority或默认入口。故障注入、重复清理、浏览器、GPU、内存、测试、类型和构建全部为`not-run`。

本切片继续受`threejs-game-ui-designer`约束，但影响仅在资源生命周期：不可见/失败预览不能遗留画布或可见残影，清理失败也不能伪装成已释放。视觉截图、双视口和设备验证继续顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzm 生存持有期间的武器×地图焦点（2026-08-13，代码已写、未运行）

本地拾取提示进入有界反馈队列后会自然消失，因此现有`local-weapon`事实在生存模式、且本地权威持有武器时继续读取同一共享投影。可见文本只追加一个最高优先地形，例如“练平台入口”，避免把完整路线塞进窄屏状态栏；无障碍文本保留最多两个具体路段示例。空手时不显示，权威持有武器替换后自动更新；Duel没有地图身份，Race已有独立路线目标，因此两者不使用该持续提示。没有新增HUD事实、区域、反馈项、计时器、坐标读取或Authority写入。源码、延期测试和治理标记已写；全部运行验证继续顺延，默认入口和硬门保持关闭。

### P5.3zzzn 持续学习文本适配与投影消费者闭合（2026-08-13，代码已写、未运行）

持续学习短句没有获得新HUD区域或更高布局预算。`hud:local:local-weapon`仍由既有事实行生成，RenderPlan固定`maximumLines=1`；共享Canvas Painter继续按当前字体真实测量宽度，超出既有状态槽时在同一行加省略号，并把该primitive登记到`truncatedTextPrimitiveIds`。完整武器名、按下/持有/松开操作说明、地面/空中后果和最多两个“地形（第N段·路段名）”仍存在于独立`accessibilityText`，可见省略不反向截断语义。没有新增或修改Painter算法。

共享投影合同同步从早期三个消费者修正为当前六个消费位置：竞技武器详情、竞技地图详情、竞技准备、生存本地拾取/替换、生存持续持有和结算回看。延期用例源码覆盖六项闭包及390×844候选布局中的单行省略、完整读屏具体路段；本轮按用户要求没有执行测试、类型、构建、浏览器、截图、设备或性能验证。

本切片使用`threejs-game-ui-designer`，参考账本如下：

| 已读取 | 路径 | 本批影响 | 未覆盖原因 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | 只让UI消费只读事实，先处理文本适配再考虑装饰 | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | Gameplay HUD保持状态优先级，不新增卡片、说明弹窗或第二提示区 | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 动态文字保持稳定容器，完整语义与可见短句分离 | 运行截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 本地武器事实固定一行，不覆盖输入区和战斗路径 | 高动作场景截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 复用实测宽度省略，不按字符数猜测 | 桌面、窄屏、移动端实机证据顺延 |

UI状态清单仅影响`Gameplay HUD / Survival / local weapon held`；暂停、设置、失败重试、胜利结算、加载、触控控制和safe-area几何均未改变。未生成2D/3D资产。源码状态保持`production-unreachable / hardGate=false / validationStatus=not-run`。

### P5.3zzzo 竞速下一真实路段与当前武器学习连接（2026-08-13，代码已写、未运行）

竞速已经拥有由权威`progressOrdinal`和地图内容目录产生的“下一路段”身份，本批没有读取坐标、支撑面或画面来定位玩家。内容目录把原私有的`KzRouteSegmentKind → WeaponMapSituation`判定提升为单一只读公共函数；共享武器地图模块新增路段级投影，严格要求完整武器Definition、地图Definition、路段Definition和正序号，并在该武器当前Mode地形语法确实匹配该路段类型时返回唯一地形，否则返回`null`。

HUD只在`race-route-target.kind === segment`且本地真实持有武器时调用该投影。权威读模型可能携带收藏短ID，因此HUD先通过内容目录唯一规范化为完整Definition；共享投影本身仍拒绝短ID。地图显示名、路段显示名、Definition和序号任一漂移都会失败关闭。匹配时仅在既有路线行追加“练窄路”等短句，完整读屏追加“当前武器X适合在这一段练Y”；不匹配、空手、终点或已完成时不增加文案。

共享合同当前登记七个消费位置：竞技武器详情、竞技地图详情、竞技准备、竞速下一真实路段、生存拾取/替换、生存持续持有和结算回看。延期用例源码覆盖地形映射、严格身份、匹配/不匹配、短ID规范化、显示名漂移和既有路线读屏；本轮未执行测试、类型、构建、浏览器、截图、设备、性能或真人验证。状态保持`production-unreachable / hardGate=false / validationStatus=not-run`。

### P5.3zzzp 1v1持有武器与权威地图持续学习连接（2026-08-13，代码已写、未运行）

Duel HUD ViewModel现在从同一权威Frame的`worldSnapshot.map.definitionId`解析地图内容身份，并将Definition与中文名作为只读Mode Projection数据。PublicMatchInfo本局选中地图必须与Frame地图一致；未知地图或跨边界身份漂移不会回退到手写文案或空名，而是在HUD投影前失败关闭。

本地参与者真实持有武器时，既有`local-weapon`事实复用共享武器×模式×地图投影。可见文案仍固定一行，只追加排名第一的“练X”；完整地图名和最多两个“地形（第N段·路段名）”仅保留在无障碍语义中。地图显示名与内容目录漂移会失败关闭。Race明确返回空，避免与已有“下一真实路段×当前武器”提示重复。

共享投影合同同步登记第八个消费位置`duel-persistent-current-weapon`。延期用例源码已覆盖主练短句、空手零提示、完整读屏、Race不重复地图级短句、无新HUD事实、PublicMatchInfo/Frame地图漂移、显示名漂移和未知权威地图失败关闭。本轮未执行测试、类型、构建、浏览器、截图、设备、性能或真人验证。

本切片使用`threejs-game-ui-designer`与`documentation-and-adrs`，参考账本如下：

| 已读取 | 路径 | 本批影响 | 未覆盖原因 |
|---|---|---|---|
| 是 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | Gameplay HUD只消费只读地图与持有武器事实 | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 保持既有本地武器行，不新增卡片或教程层 | 无 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 可见短句与完整语义分离，未知内容失败关闭 | 运行截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 一行只显示一个主练地形，不增加视觉层级 | 高动作场景截图顺延 |
| 是 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 沿用既有单行实测宽度省略合同 | 窄屏与真机证据顺延 |
| 是 | `/Users/allenaaron/.agents/skills/documentation-and-adrs/SKILL.md` | ADR-134从七处扩展为八处且保留决策边界 | 无 |

UI状态清单只影响`Gameplay HUD / Duel / local weapon held`；暂停、设置、失败重试、结算、加载、触控控制、safe-area几何和资产均未改变。状态保持`production-unreachable / hardGate=false / validationStatus=not-run`。

### P5.3zzzr 新开放武器卡片精确标记（2026-08-13，代码已写、未运行）

P5.3zzzq的同一纯availability投影模块新增selection入口，不新增事实源。入口重验20把正式武器目录的ID与顺序、selection可用性成对字段、P4.4cf单把连续前缀/revision/hash/目标身份以及当前Profile收藏。只有`newlyPlayable=true / newlyCollected=false`、目标卡`available=true`且当前未收藏时，才原位改写该卡description；其他19项和kind/selectedId/标签/可用性不变。

三模式Local Host在既有weapon-index selection构造完成后，用同一调用`value`中的availability fact和同一Learning Profile快照收藏列表调用该纯投影。它不重读Registry、不修改Profile/选中武器，不主动重绘；维护成功后只在下一次正常信息页渲染可见。当前P5延期清单已登记33个Vitest与11个Node文件，本批未运行任何测试、类型、构建、浏览器、设备或性能门禁。

### P5.3zzzsd Survival每局可重复挑战目标（2026-08-13，代码已写、未运行）

`arena-product-presentation`新增纯同步字段投影，仅消费已验证Learning Profile中的Survival个人最佳tick、正式60Hz调优与已存在的Survival pressure policy。无记录时本局目标为00:20；尚未进入最后压力档时选下一个20秒压力边界并显示将进入的玩家可读压力档序；已进入最后压力档时以个人最佳+20秒生成下一局目标。

投影只原位改写`survival-prep / p6-learning-profile / best-survival-record`的`valueText/accessibilityText`；label、field ID、owner、字段数、导航和操作全部不变。三模式Local Host在正常Survival准备页组合时从同一当前Learning Profile快照取得该记录；无Authority/Profile/奖励/任务写入，无墙钟、异步Owner、timer或新页面/按钮。本切片新增1个Vitest延后文件，P5清单更新为33个Vitest+11个Node；全部运行验证继续顺延。

### P5.3zzzse Duel/Race每局可重复挑战目标（2026-08-13，代码已写、未运行）

`arena-product-presentation`新增纯同步字段投影，只消费同一次已验证Learning Profile的Duel/Race模式记录、正式模式Definition身份与60Hz调优。Duel无胜利记录时提示完成常规1v1并争取首胜，Race无完赛记录时提示沿完整路线到达终点；已有记录时显示精确`MM:SS`个人最佳，并明确“争取刷新最快胜利/最快到达”。现有正式合同没有可复用的谨慎缩短阶梯，因此本候选不发明秒数、tick差或第二套目标规则。

投影只原位改写`match-prep / p5-mode-content / mode-goal`的`valueText/accessibilityText`；label、field ID、owner、字段数、导航与操作保持不变。三模式Local Host在同一次模式准备页投影中只读取一份Learning Profile快照，以官方mode Definition ID闭合对应记录；Survival继续走既有独立投影。当前共享树P5延后清单为40个Vitest+14个Node，其中本切片只新增1个Vitest；全部测试、类型、构建、浏览器、设备与性能验证仍为`not-run`。

### P5.3zzztt 收藏预览全链可重试所有权（2026-08-13，代码已写、未运行）

四收藏页的第二个Renderer现在从工厂返回时即被A6.16登记，包装端口或Host构造失败不会把唯一可清理引用留在局部变量。A6.13构造期无法关闭scissor时不再直接dispose，而是把`关闭scissor → dispose Renderer`作为可重试债务；A6.14先清该Renderer债务，再允许页面事务释放mount与资源。A6.12c构造回滚继续沿终态同序执行mount proof、A6.11c资源、mount终结、planner与layout；A6.11c则固定executor先于adapter。底层A6.6/A6.11a同步保留失败的resource、task、handle与待清理计数，pending settlement闭合或同一Owner重试成功后才清账；A6.9按自有Three对象记录完成水位并保留构造清理债务，A6.12b首次mount清理不完整的结果只作为诊断，同tick重试会继续清理A6.9并在真实销毁后补齐proof。任一层失败都保留实际Owner或债务对象，只有真实完成才清引用。

A6.16终态顺序固定为隐藏Canvas、取消settlement补绘、解绑滚动、等待在途提交、销毁Host或重试Host构造债务、处理未转移Renderer、销毁layout/read owner，最后才释放底层信息Surface。回调源或预览资源未收敛时不伪报`disposed`，同步重入被拒绝。该切片不新增页面、按钮、动作、轮询、RAF、资产批准、Profile或Authority，也不接默认入口。

本切片继续使用`threejs-game-ui-designer`的UI生命周期边界；影响是失败预览不能遗留可见Canvas或失去GPU清理Owner，不改变任何视觉设计。故障注入、测试、类型、构建、双视口、浏览器、GPU内存、设备和性能证据按开发优先要求统一顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzztu / P6.91 首页唯一目标的下一局续玩路由（2026-08-13，代码已写、未运行）

成长层新增纯同步续玩路由，只消费已解析的唯一`nextGoal`与同一Learning Definition。显式模式和交叉挑战沿用目标模式；无显式模式的通用武器目标固定推荐常规1v1，确保目标武器可在开局稳定携带；地图与路段目标固定推荐竞速；目录全部闭合后回到自由挑战。若显式生存目标含武器，路由固定为“局内实体供给后再拾取”，不会要求预选，也不承诺目标武器本局出现。所有goal kind均重验goalId和武器/地图/路段/模式/挑战/context身份，伪造组合在生成文案前失败关闭。

首页继续复用既有`p6-learning-profile / next-goal`字段，在原目标、打法和路线后最多追加一条“下一局：常规1v1/竞速/生存”；没有武器或地图的模式目标也能直接显示下一局方向。Information Host使用同一`pages.profiles.learning.nextGoal`生成路由并交给展示层，展示层再次核对目标武器/地图与原签名一致。该批不自动切换模式、武器或地图，不新增页面、字段、按钮、任务、奖励、货币、Profile schema或Authority。延期测试与治理清单已登记但未运行；动态排版、读屏、浏览器、设备、真人与性能继续顺延。

### P5.3zzztv / P6.92 首页下一局建议接受与模式确认（2026-08-13，代码已写、未运行）

首页唯一主按钮仍是原“选择模式”，但点击时不再丢弃本屏已经说明的下一局方向。Binding只保存最后一次成功渲染的续玩路由身份；Host在处理点击时从当前Learning Profile和active Registry重新解析目标，并逐项核对goal、续玩类别、模式、武器和地图。核对通过后先完成原有`home → mode-select`导航，随后才提交建议中的可确定选择：武器目标预选对应武器，地图目标预选对应地图，模式目标预选对应模式。生存武器目标只预选模式与地图，绝不把目标武器带入loadout；目录全部闭合的自由挑战不覆盖玩家当前选择。

玩家仍停在既有模式选择页，必须再次点击原模式主按钮才能开局；没有自动开局、跳过确认、新页面、新按钮、新字段、新任务、奖励、货币、Profile或Authority。该批复用`threejs-game-ui-designer`的单主动作和短路径原则；待执行静态反证已登记，测试、类型、构建、浏览器、设备、真人和性能全部顺延。

同一批把首页原主按钮的玩家可见标签从泛化“选择模式”收敛为“去常规1v1 / 去竞速 / 去生存”；自由挑战仍显示“选择模式”。按钮读屏会明确说明将预选哪些已有内容、仍需在模式页确认且不会自动开局；生存文案同时说明空手开局和局内拾取。只改既有primitive的label/accessibilityText，不新增动作或布局。

### P5.3zzztw / P6.93 首页建议到下一局的离线兑现观察（2026-08-13，代码已写、未运行）

Host在首页导航成功后建立一次性待观察身份，下一次真正开局时从已验证的HUD开局投影读取首帧模式、地图与本地装备。实际组合满足建议要求时记为兑现，玩家手动改选则诚实记为未兑现；生存武器目标仅要求生存模式、目标地图和空手开局，不把未刷新的世界武器当作开局loadout。

该观察复用现有离线Collector/Journal和成功后才提交的序号水位，不读输入轨迹、设备身份或墙钟，不上传。Collector或首帧观察失败只保留诊断，不阻断已成功的开局。不新增UI、Profile、奖励、任务或Authority；延期测试与治理已写，全部运行验证继续顺延。

### P5.3zzztx / P6.94 模式确认页目标准备反馈（2026-08-13，代码已写、未运行）

首页建议导航成功后，Host另外保留一份只服务玩家反馈的会话状态；它与可选留存Collector完全分离。既有模式选择页不增加字段，只在原`preparation-entry`前显示“目标已准备”；玩家随后改选建议要求的模式、地图或需预选武器时，原位变为“已改选”，并明确仍可按当前选择开局。生存目标继续只比较模式、地图和空手规则，不把世界拾取当成预选装备。

成功开局或销毁会清空该状态；Collector未接入或写入失败都不影响显示。该批沿用`threejs-game-ui-designer`的单主动作、短路径和无额外页面原则，不新增页面、按钮、字段、Profile、奖励、任务或Authority；延期测试与治理已写，布局、读屏、浏览器、设备、真人和性能验证继续顺延。

### P5.3zzzty / P6.95 结果页的首页建议开局回执（2026-08-13，代码已写、未运行）

Host在真实开局成功后，从同一个已验证首帧读取实际模式、地图和本地装备，并与本次首页建议会话身份比较。结果只冻结成“按建议组合开局”或“按你的改选组合开局”；结算页继续复用原`p6-learning-profile / earned-progress`字段，在现有真实成长文本末尾追加一次回执。完整读屏明确该回执只描述开局组合，不代表目标已经完成。

该回执与离线Collector完全分离；首帧读取或回执投影失败不能阻断对局。下一局若不是由首页建议进入，会在开局时清空旧回执，避免串局。不新增页面、按钮、字段、Profile、奖励、任务、Authority或完成判定；延期测试与治理已写，布局、读屏、浏览器、设备、真人和性能验证继续顺延。

### P5.3zzzua / P6.96 结算目标复用准备与开局回执会话（2026-08-13，代码已写、未运行）

结果页默认“调整后继续”原先虽能把长期目标组合带到既有模式选择页，却没有复用首页路径的“目标已准备/已改选”反馈，也不会在下一局结算说明这次准备是否真正带入开局。Host现在只在已渲染推荐仍为`prepare-next-goal`、目标路线真实落到`mode-select`时建立同一种短生命周期会话，并在写入前重新核对当前已结算Profile的goal、推荐模式、目标武器和目标地图。模式页仍复用原`preparation-entry`和原唯一主动作；可见前缀保持“目标已准备/已改选”，完整读屏按显式来源区分“首页目标”和“上局结算目标”，不从目标内容或当前选择猜来源。

生存目标若包含武器，准备路线和会话都把它视为局内世界拾取，强制保持空手开局；不会把目标武器写成loadout。下一次真实开局继续从已验证首帧冻结“按建议组合/按改选组合”，结果页原`earned-progress`按来源显示“首页目标”或“上局目标”，并继续明确不代表目标完成。结算入口不会写`home-continuation-accepted/followed`，避免污染首页留存分母；现有`next-goal-selected`仍保留其本来口径。

该批不改变刚收藏后的“了解下一把/下一张”详情路线，也不新增页面、按钮、字段、任务、奖励、货币、Profile、Authority或自动开局。沿用`threejs-game-ui-designer`的单主动作、短路径、来源清晰和既有信息容器原则；代码、延期测试和静态治理已写，测试、类型、构建、布局、读屏、浏览器、设备、真人与性能验证均按开发优先策略顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzub / P6.97 目标续玩会话的可选深度与明确退出（2026-08-13，代码已写、未运行）

模式页的目标续玩会话继续允许玩家临时查看规则、角色、武器或地图详情：这些已声明的可返回深度不会清空会话，返回模式页后仍按当前组合显示“目标已准备/已改选”。玩家通过底栏离开到首页、武器库、地图库或记录定位，或从详情明确返回武器库/地图库时，则在导航成功后清空会话，避免之后重新进入模式页时复现一条已经放弃的旧目标。

清理发生在导航提交之后，失败导航不丢会话。首页来源若仍有待观察项，明确退出复用原`home-continuation-followed`的未兑现口径并只提交一次；上局结算来源没有该观察项，因此不会新增或污染首页分母。该批不增加导航状态、页面、按钮、字段、任务、Profile、奖励或Authority，也不改变任何选择值。源码、延期用例和治理已写，所有运行验证继续顺延。

### P5.3zzzuf / P6.98 结算收藏详情承接到模式确认（2026-08-13，代码已写、未运行）

结算页刚收藏内容后的“了解下一把/了解下一张”继续进入既有武器或地图详情，不被改成直接准备。导航成功后Host只冻结一份来源为上局结算的“待确认详情目标”，不会在详情页提前显示“目标已准备”。玩家使用详情原主动作进入模式页时，Host再次从当前已结算Profile解析唯一下一目标，并核对goal、推荐模式、目标武器、目标地图和生存世界拾取规则；核对成功后才把待确认身份转成既有模式准备会话。

若玩家在详情里使用上把/下把或另一张地图浏览，当前选择可以变化，但冻结的成长目标不跟着变化；进入模式页后因此诚实显示“已改选”，玩家仍可按当前选择开局。若返回武器库/地图库或使用底栏离开，则复用P6.97明确退出，清空待确认身份。生存目标仍空手开局，目标武器只在场上实际刷新后拾取。

该批不新增页面、按钮、详情动作、导航栈、目标Resolver、任务、奖励、Profile或Authority；`next-goal-selected`仍在结算主动作成功时按原口径记录，首页续玩指标不受影响。源码、延期静态用例和治理已写，测试、类型、构建、布局、读屏、浏览器、设备、真人与性能验证全部顺延。

### P5.3zzzug / P6.99 目标对齐的直接复玩回执（2026-08-13，代码已写、未运行）

当结果页唯一目标适配已经证明当前组合可以稳定推进，或当前生存组合可以条件推进世界拾取目标时，原唯一主动作仍是“同组合/同地图再来一局”，不增加模式确认步骤。Binding现在把本次已渲染的适配类型、goal、模式、目标武器和目标地图作为完整身份随点击带回；Host在任何开局状态修改前重新解析当前已结算Profile，只接受`stable-current-combination`或`conditional-survival-supply`，并再次核对当前模式、地图及确定携带武器。

复核成功后，目标身份只作为来源为“上局结算”的本次开局准备进入既有首帧回执链；真实开局成功后仍从已验证首帧判断组合一致性，再在下一次结果页原`earned-progress`显示“上局目标：已按建议组合开局”。条件生存只要求相同生存模式、目标地图与空手开局，不承诺目标武器本局刷新。自由挑战、玩家显式选择的普通再来一局、恢复态、空身份或任何漂移都不会建立目标回执。

该批不改变复玩按钮标签、点击数、目标Resolver、供给概率、奖励、任务、Profile、Authority或首页续玩指标，也不新增页面、按钮和字段。源码、延期静态用例与治理已写，测试、类型、构建、浏览器、设备、真人和性能验证继续顺延。

### P5.3zzzuh / P6.100 显式下一目标复用同一续玩会话（2026-08-13，代码已写、未运行）

玩家显式把结果页决策切到“继续长期目标”时，Binding仍冻结普通`next-goal`的goal、目标页面、模式、武器和地图。本批让Host按真实目标页面复用已存在的两条会话路径：目标落到`mode-select`时直接建立来源为上局结算的模式准备；落到`weapon-detail / map-detail`时先建立待确认详情目标，详情原主动作重新核对后再转为模式准备。该逻辑不要求默认推荐也必须是next-goal，因为玩家可以在当前组合可推进时主动选择查看目标路线；它只要求本次显式已渲染身份与点击时当前Profile闭合。

目标落到未开放武器目录或自由挑战首页时不建立准备状态，也不伪造回执；现有导航照常执行。生存武器目标继续空手、局内世界拾取。该批不增加推荐分支、页面、按钮、导航栈、任务、奖励、Profile或Authority；源码、延期静态用例和治理已写，全部运行验证顺延。

### P5.3zzzui / P6.101 过期目标续玩会话退役（2026-08-13，代码已写、未运行）

首页或上局结算目标在进入模式页后仍可能因Profile结算恢复、同进程档案变化或active Registry调整而变化。短会话现在每次投影都重新读取唯一下一目标并做完整身份比较，但只返回`none / ready / adjusted`，不在渲染期间修改状态；旧目标因此不会继续显示为“已准备”。

任何后续导航、底栏、选择或主动作会在调用底层Host前执行同一判旧。过期时清除模式准备、结果详情待确认身份和首页待观察项；首页来源复用原未兑现分母且只提交一次，上局来源不写首页指标。结果详情目标过期后不再把普通“进入模式页”误判为目标承接，玩家仍可按当前选择导航和开局，且旧目标不会生成结果回执。

该批不新增页面、按钮、字段、目标Resolver、Profile写入、Registry写入、奖励、任务或Authority，也不把目标变化变成玩法阻断。源码、延期静态用例、治理和正式候选标记已写；测试、类型、构建、浏览器、设备、真人和性能验证全部顺延。

### P5.3zzzuj 正式 GLB 预加载生产批准前置门（2026-08-14，代码已写、未运行）

正式 Three 预加载器此前会在读取完整视觉 Catalog 后立即为每项创建加载 Task，而逐资产生产批准只在更下游 Surface 再次检查。这虽然仍是生产不可达候选，却允许默认构造的预加载器在资产未批准时先发生 GLB I/O，与 A3–A7“未批准资产不可进入正常加载路径”的合同不一致。

本批让预加载器在第一个 `PresentationAssetLoadTask` 创建前，按同一 Catalog content hash 读取 A3–A6 Readiness 的逐项 `productionApproved && formalReady` 真值。默认模式只允许批准集合；当前批准集合为 0，因此会一次性列出阻断身份、进入失败关闭且零 loader 调用。Snapshot新增批准模式、批准集合和阻断集合，便于后续批准账本升级后静态核对，不把来源 intake、预算 V2 覆盖或 Catalog 登记误当成生产批准。

隔离正式 Web 开发宿主继续可以读取当前候选资产，但必须在构造预加载器时显式传入 `allowUnapprovedCandidates: true`；这一许可与 Surface 已有同名隔离许可对齐，且宿主仍为`production-unreachable / hardGate=false / defaultEntryWired=false`。默认预加载器、默认Bundle、默认入口均未接线；不修改130项资产、来源、批准、画面、规则或玩法。延期Node反证、P5集中清单和治理标记已写，测试、类型、构建、GLB加载、浏览器、GPU、设备与性能验证全部顺延。

技能记录：本批使用`game-art-director`，应用“正式资产必须先过来源/批准门、失败回退不能成为正常路径、视觉资产加载需有清晰生命周期Owner”的原则。技能要求的`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与模板仍未随安装包提供，本批不创建占位；实际读取并服从项目更具体的`arena-art-and-audio-development-flow.md`、`arena-art-development-alignment-matrix.md`与`arena-art-bible.md`。本批没有调用外部图像、Figma、Blender或AI生成工具。

### P5.3zzzuk 正式媒体统一生产批准加载门（2026-08-14，代码已写、未运行）

静态审计发现GLB前置门修正后，正式音频仍把`verified-intake-only`误当成生产批准，默认路径会先fetch并解码4份Kenney OGG；VFX虽因当前5份纹理均是候选而保持零加载，却也只按`maturity`判断，未来局部状态变化可能再次漂移。内容闭合报告同样用`maturity`推算地图、音频和VFX批准，和130项逐资产生产批准账本的“0项批准”真值不一致。

本批新增唯一共享批准索引，以同一Catalog hash逐项闭合`assetId / path / byteLength / SHA-256`，并且只有`productionApproved && assetUsePermitted && formalReady`同时成立才授予读取资格。模型还必须闭合它声明的全部外部材质纹理依赖，避免批准GLB后由GLTF加载器旁路请求未批准PNG。当前V1账本固定0/130批准，因此默认GLB、OGG和核心VFX纹理都在首个loader/fetch前失败关闭并暴露阻断身份；来源intake和V2候选预算覆盖均不能授予生产批准。

生产不可达的隔离Web开发宿主继续分别显式开启模型、音频和VFX候选读取，使当前开发预览不被阻断；三项许可都不进入默认入口。正式音频resolver和内容闭合报告现共同消费共享批准索引，不再以`maturity`猜批准。延期Vitest/Node反证、P5集中清单和治理标记已写；测试、类型、构建、浏览器、设备、听音、GPU与性能全部按开发优先策略顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

同批继续修正隔离渲染接线：Scene resolver现在列出本帧具体未批准的角色模型、装备模型和地图模型，严格路径不再只报泛化`catalog gate`；隔离resolver仍只要求Registry登记完整。Three Stage默认继续要求`productionReady=true`，但可由隔离宿主单独显式开启“登记完整候选”渲染。Surface与Stage两层许可必须同时存在，任一层缺失都会在Stage观察场景前失败关闭；这修复了此前Surface放行、Stage又无条件拒绝首帧的矛盾，不把候选渲染扩散为生产许可。

技能记录：本批使用`audio-design`保留现有`SFX→Master→limiter`、8 voice和完整加载/销毁生命周期，不增加空总线或播放职责；使用`vfx-realtime`保持Shape/Timing/Color、核心/边缘分层、2x overdraw、显式off switch与纹理Owner不变，仅收紧加载许可。VFX技能要求的patterns、sharp edges、validations均已读取；没有生成或修改任何媒体字节。

### P5.3zzztz HUD拥挤反馈语义优先级（2026-08-13，代码已写、未运行）

既有HUD反馈队列在同帧超过三个可见项时，原先先按`warning / strong / normal`排序，供给即将消失等warning可能挤掉更重要的击飞、坠落或比赛结果。队列现在只读取稳定`category + visualCue + emphasis`建立六级表现优先级：权威比赛结束固定最高；竞速完成或生存终结随后；击飞出圈、参与者坠落和生存首次坠落再次；强/警告武器命中、普通模式/武器与供给依次后置。更高语义级永远不会被视角相关度覆盖。

同一语义层级内，再按`local-involved → global → remote-only`排序，让玩家直接参与的命中、受击或坠落先于纯远端交战。该字段在RenderModel生成时只比较已验证本地参与者ID与事件既有攻击者、目标或锚点ID；比赛起止和敌人压力标为全局。它不从“你”等中文文案猜视角，并作为Consumer Epoch固定字段，后续二十武器文案/Cue专门化不能更改。随后才继续使用既有强调级、类别和权威tick/sequence稳定裁决。

同一次武器击飞与`ParticipantFell`已有权威目标、掉落tick、原因和归因者闭合去重，本批保留该机制，不增加猜测式合并。12项保留上限、3项可见上限、一次性身份去重、Authority tick寿命和最终时间顺序不变。P5.3zzzw随后只把同批首次接受且已进入12项保留队列的本地武器命中/受击Cue从“必须占据视觉三槽”中解耦；声音批次仍最多8项、仍由同一队列决定强调级和voice优先级，纯远端溢出不播放，视觉/VFX仍最多3项。没有增加voice、总线、VFX层、资产、HUD区域或规则状态。

队列把六级语义压缩进既有三级Audio voice抢占：终局/击飞/坠落为3，普通模式/武器为2，供给为1；正式Web Audio继续使用原8 voice与`drop-lowest-priority`。响度不复用该抢占级，而是继续只按原`normal / strong / warning`得到`-6 / -3 / -2 dB`，因此重要性不会被错误实现成更响。实现只消费ViewModel已有稳定表现语义，不重判命中、坠落或胜负。

技能与参考账本：使用`threejs-game-ui-designer`约束Gameplay HUD先显示结果与因果、保持现有三槽和无新遮挡；使用`audio-design`约束一次性声音有界且不新增总线、voice或素材。本批不设计自适应音乐，故不读取`audio-design/references/adaptive-music.md`。双视口拥挤截图、静音、读屏、浏览器、设备、真人归因与音频实听均按开发优先要求顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzul 正式异步媒体销毁自动续接（2026-08-14，代码已写、未运行）

静态生命周期审计确认，正式GLB、Web Audio和Three VFX虽然都使用`Promise.allSettled`等待完整加载批次，也会在销毁时保留未完成资源，但异步批次结束后只清除`loadPending`，不会继续已经提出的销毁请求。Web Audio还漏掉在途`AudioContext.resume()`；Match Host失败停机只尝试一次，导致加载中销毁必须由外部再次调用`dispose()`，否则Stage、预加载Task、纹理、总线或AudioContext的Owner会长期停在`failed/disposing`。

本批统一增加一次性`disposeRequested`合同。GLB Task批次和VFX纹理批次真实结算后，由各自Owner直接继续同一终态清理事务；Web Audio同时等待加载、解码和激活结算，按`voice → SFX → Master → limiter → AudioContext.close`原顺序收口，Context成功关闭后通知唯一Match Host，关闭失败则保留显式重试Owner。Match Host自身等待全部三个准备子任务结算，并只在加载、激活或Context成功关闭等真实异步事件到达时安排一次续清，不增加定时器、轮询、RAF或第二Owner。Host真实进入`disposed`后向顶层Composition发出同步观察通知，使原Binding/Driver运行资源清理链可继续提交完成水位；顶层原有诊断容器仍按显式`dispose`策略保留。

同批源码复核补齐子任务启动原子性：三个`load()`均先由同步抛错捕获边界转成各自拒绝Promise，再交给`Promise.allSettled`。因此任一子Owner在调用瞬间同步失败，也不能阻止另外两个子Owner启动；宿主仍获得完整三项结算结果并沿同一清理链回收已启动资源。

完整结算现在也保留完整诊断：GLB、纹理、音频及Match Host四层均收集本批全部拒绝原因；只有一项失败时保留原值，多项失败时形成`AggregateError`。不再因遍历到第一项拒绝便丢弃同批其余资源错误。

顶层构造回滚也接入同一真实终态事件：如果Composition已经创建Driver/Binding但构造随后失败，首次回滚又只因Match Host异步关闭未完成而失败，Host进入真实`disposed`后会再提交一次Driver或Binding销毁。若第二次仍是同步清理失败，则保留原Owner但不自旋；没有定时器、轮询或无界微任务重试。

若Host恰好在Driver/Binding当前销毁调用内部同步到达终态，回调不会重入同一Owner，而是记录一次“当前调用结束后续接”水位。当前调用若成功则水位随Owner一同清除；若随后在外层清理失败，则最多再提交一次续接。这样不会提前消费唯一终态事件，也不会形成递归销毁。

同步资源清理失败或AudioContext关闭失败仍进入`failed`并保留原Owner，允许外层以后显式重试，不以微任务循环反复调用失败资源；异步等待本身不伪报完成。该批不修改声音素材、音量、8 voice、`SFX→Master→limiter`总线、VFX Shape/Timing/Color、3项效果与96粒子预算、GLB/纹理/音频生产批准，也不改变画面、玩法、Authority、默认入口或hard gate。延期静态反证和治理标记已写；测试、类型、构建、浏览器、设备、GPU/音频内存与性能验证全部顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

技能记录：本批继续使用`audio-design`与`vfx-realtime`。前者约束总线拓扑、headroom和voice预算不因生命周期修复漂移；后者约束纹理/Geometry/Material Owner与效果预算在失败清理中仍可追踪。没有生成、替换或修改任何媒体字节。

### P5.3zzzum HUD效果消费者优先终态清理（2026-08-14，代码已写、未运行）

模式HUD Presentation Host的Effect Consumer消费Projection Consumer形成的有界反馈队列并持有外部视觉/音频副作用，但旧终态顺序先销毁Projection。若`visual.clear`或`audio.stopAll`失败，Effect仍持有未释放副作用，生成这些身份与epoch的Projection却已经消失，重试链只剩半套依赖。

本批把失败关闭与显式销毁统一为`Effect Consumer → Projection Consumer`严格门控。Effect未真正完成时不触碰Projection；Effect成功而Projection失败时，后续重试永久跳过Effect，只推进未完成生产者。只有两侧完成后才清空Host epoch并进入`disposed`。二十武器外层Host继续等内层完整收敛后再清读取计划、方向事实和权威反馈事件。

该调整不改变反馈队列、3项可见上限、8 voice、Cue、声音总线、VFX预算、epoch切换、Authority、玩法、页面、正式资产或默认入口。延期故障用例与治理标记已更新但未执行；测试、类型、构建、浏览器、设备、音频/VFX内存和性能继续顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

技能记录：本批继续应用`audio-design`与`vfx-realtime`的资源Owner约束，只修复销毁依赖顺序，没有新增、生成或替换媒体。

### P5.3zzzur / P6.111 首页交叉挑战整体收藏进度（2026-08-14，代码已写、未运行）

重度收藏玩家原先只能从下一目标看到单项交叉挑战，既有首页`recent-records`只汇总三模式个人最佳、武器、地图和路线。P6现从同一Learning Definition/Profile生成动态挑战旅程事实：完成挑战数/总数、累计进度/总目标和剩余进度；P5仍只增强Reward Profile已有`recent-records`字段，追加`挑战x/y·挑战进度p/t`，不增加第12页、字段、卡片或动作。空挑战工具配置不显示`0/0`。

多项交叉挑战可由同一局同时推进，因此该字段不把剩余进度相加后换算“还需多少局”，读屏明确说明不推算局数；这不会把静态容量误写成200小时真实留存。数据合同按动态Definition校验，不把当前16项或48点目标写死在表现适配器。不新增任务、奖励、Profile schema、战斗数值或第二套挑战算法。

测试源码覆盖动态2挑战、部分完成、单项结果回执、非法累计进度和正式16×3口径；全部测试、类型、构建、两种视口、长文、读屏、DOM/Canvas、浏览器、设备、真人与性能验证按开发优先要求顺延。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzun 顶层Web与Registry嵌套构造债务（2026-08-14，代码已写、未运行）

静态追踪确认，正式Web顶层在构造回滚中只保留Driver/Binding的临时续接函数；如果第二次同步清理仍失败，错误返回后无法由调用方再次推进，而且旧路径仍会继续释放离线观察Journal、Pointer Surface和DOM容器。Registry-backed Owner在Local Playable构造已经返回类型化清理债务时，也会直接销毁共享Registry bootstrap；外层first-provisioned工厂随后还可能再次销毁同一bootstrap。运行期Binding的旧顺序又是Information Surface→Match Host→Local Host，可能先释放Local HUD仍依赖的音频/VFX生产者。

本批新增两层类型化构造清理债务。Registry-backed Owner先归零Local Playable嵌套债务，再释放bootstrap；顶层Formal Web按resize监听→Driver/Binding→预览/信息消费者→Local/Registry消费者→Match Host媒体生产者→离线Journal/Pointer Surface→DOM容器推进。每一水位成功后才清引用，错误对象公开`cleanupComplete/retryCleanup`；first-provisioned工厂只在顶层明确未接管移交bootstrap时执行外层回收。运行期Binding同步改为Information/Preview→Local Host→Match Host，使HUD、Audio和VFX消费者始终先于生产者释放。

该切片不修改资产、画面、音频、VFX、页面、输入、Authority、玩法、Profile、Registry内容或默认入口。延期Node/Vitest静态反证与P4/P5治理标记已写；测试、类型、构建、浏览器、设备、GPU/音频内存与性能均未运行。状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

技能记录：使用`media-asset-management`约束正式交付资源必须有明确source→deliver管理与释放Owner；使用`game-3d-assets`约束Three Renderer、GLB实例和共享资源必须在消费者退出后再释放生产者。技能的通用资产获取、下载与运行验证步骤未执行，因为本批仅修复当前项目已有资源的所有权链，且用户要求开发优先、验证顺延。

### P5.3zzzwm 默认GLTF Loader所有权与迟到结算收口（2026-08-15，代码已写、未运行）

共享`GltfPresentationAssetLoader`现在拥有明确的`active → destroy-requested → destroy-incomplete/destroyed`生命周期：外部读取前登记pending，销毁后拒绝新load，Three解析迟到scene先释放再拒绝；LoadingManager纹理handler等全部pending落定后移除，失败保留精确重试债务。Greybox Renderer在Stage之后释放loader；角色工厂与正式预载器在全部`PresentationAssetLoadTask`退出后释放默认loader；A6.11a在全部任务和迟到lease收敛后释放默认loader；A6.16在预览Host/Renderer释放后结束notifier与默认loader，再释放bridge/read/DOM Surface。所有显式注入loader保持调用方所有权。

该切片不新增模型、纹理、动画、Renderer、页面、按钮、RAF、轮询、输入、Authority、玩法、成长、批准记录或默认入口。延期Vitest、Node静态反证、类型、构建、浏览器、GPU/内存、设备与性能全部未运行；状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwn 平台纹理解码取消与GLTF终态续接（2026-08-15，代码已写、未运行）

`PlatformTextureLoader`现为每张宿主图片建立请求Owner。GLTF上层销毁时先取消未决图片：旧`onload/onerror`即使宿主无法真正移除也因settled水位失效，未发布Texture释放，已开始的LoadingManager item按error/end闭合，并只向GLTF通知一次失败。Texture或Manager清理失败会保留同一请求与逐项完成水位，`destroy-incomplete`重试不重复已经成功的步骤。共享`GltfPresentationAssetLoader`只有在纹理子Owner清理、全部GLTF load落定后才移除自定义handler，因此图片永不回调不再永久阻断Stage、Preloader或收藏预览清理。

该切片不新增纹理、图片格式、路径、Renderer、页面、动画、画质降级、玩法、成长、批准记录或默认入口。延期Vitest、Node静态反证、类型、构建、浏览器、小游戏设备、内存与性能均未运行；状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzwo 纹理成功提交反调与非Error失败水位（2026-08-15，代码已写、未运行）

纹理成功解码不再先写`settled`再调用LoadingManager。请求在`itemEnd`与`onLoad`期间持有唯一completion Owner；同步destroy只登记延期取消并正常返回，不把仍由当前调用栈持有的请求误报成清理失败；`itemEnd`返回后若已取消则释放未发布Texture并走一次失败闭合，若已经进入`onLoad`则承认调用方已取得资源，不反向重复释放。Manager start反调同样延迟到回调返回，避免同一Manager调用递归进入error/end。GLTF load与A6.11a lease/task销毁改用显式失败布尔，`throw null/undefined`仍是失败，不会越过清理或伪报完成。

### P5.3zzzwp 纹理错误回调确认所有权（2026-08-15，代码已写、未运行）

平台纹理取消/失败不再把`onError`调用尝试等同于GLTF已经确认收到失败。错误回调必须同步正常返回且不能是thenable，request Owner才释放；抛错或异步返回保留同一失败原因与通知水位，Loader进入`destroy-incomplete`并在下一次destroy重试。Texture和Manager已经成功的清理步骤不会重复执行，避免一边伪报destroyed、一边让上层GLTF Promise永久pending。

### P5.3zzzwq 自然失败清理与同步重入所有权（2026-08-15，代码已写、未运行）

宿主图片自然解码失败与主动destroy现在共用同一个失败清理Owner。`itemError/itemEnd/onError`清理回调中的同步destroy只把Loader切到销毁请求态并正常返回，当前Owner继续推进唯一一遍Texture、Manager和错误通知水位；任一步未确认时，Loader立即进入`destroy-incomplete`并拒绝新load，下一次destroy只重试未完成水位。这样既不递归清理，也不会让带清理债的共享Loader继续接收资源请求。

### P5.3zzzwr 宿主图片回调绑定事务与成功确认（2026-08-15，代码已写、未运行）

宿主图片的`onload`、`onerror`与`src`逐步绑定现在共享同一请求/attempt身份；任一属性写入同步触发成功、失败、fallback或销毁后，当前绑定事务立刻停止并再次清空旧图片回调，不能在请求落定后继续写回迟到入口。成功回调只有同步正常返回且不是thenable才确认纹理所有权转移；抛错或异步返回会走未发布纹理回收、Manager error结算和一次错误通知，不再仅凭“调用过onLoad”留下无主Texture。

### P5.3zzzws 图片回调解绑债务与绑定后结算（2026-08-15，代码已写、未运行）

每个`createImage()`结果现在建立独立回调清理Owner，`onload/onerror = null`只有赋值同步正常返回才提交对应解绑水位；失败的旧attempt保留在请求内，禁止fallback遗弃，后续destroy只重试未完成字段。图片属性setter内同步触发的成功/失败信号使用单槽有界队列，在setter返回后才结算；多信号冲突失败关闭。createImage、属性绑定或图片失败处理期间同步destroy同样只登记取消，待当前外部调用/图片清理返回后由请求Owner裁决；进入fallback前释放失败处理水位，保证新attempt仍可同步结算。

### P5.3zzzwt 外部回调公开load重入门（2026-08-15，代码已写、未运行）

`createImage`、HostImage属性写入/解绑、LoadingManager、Texture dispose和成功/失败通知现在统一进入同步外部调用边界。该调用栈内再次调用同一Loader公开`load`会在读取路径、创建Texture或登记请求前拒绝，并递增有界重入水位；外部回调即使捕获并吞掉拒绝异常，外层调用在返回时仍检测水位漂移并失败关闭。回调栈退出后的普通同步/异步新load不受影响，destroy继续使用既有create/bind/error/completion/cleanup延期取消水位。

### P5.3zzzwu LoadingManager itemStart失败回滚Owner（2026-08-15，代码已写、未运行）

`itemStart`调用前登记的请求Owner不再在回调抛错/thenable后立即删除。该失败进入与取消、解码失败相同的`failPermanently`水位：回收未发布Texture、执行Manager error/end配平并通知上游；全部确认后才删除请求并重新抛出原始主失败。任一回滚步骤失败时Loader进入`destroy-incomplete`，同步抛出同时保留主失败与回滚失败的AggregateError，后续destroy只重试未完成水位，不创建HostImage，也不把失败回滚伪报为active-clean。

### P5.3zzzwv 无效GLTF候选scene清理债务Owner（2026-08-15，代码已写、未运行）

GLTF结果已取得合法`Object3D`并建立`ThreeObjectDisposalLease`后，如动画校验、迟到发布或其他候选检查失败，首次dispose未完整完成时不再只把cleanupCause塞进异常后丢失租约。Loader以load sequence持有该候选清理Owner，立即关闭新load；`continueDestroy`在移除纹理handler和发布destroyed前逐项重试。失败仍保留原load原因与每次清理原因；只有候选台账归零、pending归零、平台纹理子Owner完成且handler移除后才发布destroyed。

### P5.3zzzww GLTF终态清理destroy反调Owner（2026-08-15，代码已写、未运行）

共享GLTF Loader的终态序列现在由唯一同步Owner推进：平台纹理子Loader销毁、候选scene重试、pending水位检查和LoadingManager handler移除均位于同一`terminalCleanupInProgress`边界。上述外部清理回调同步调用destroy时只登记有界诊断并正常返回，不递归执行同一候选dispose或removeHandler；当前Owner仍负责提交destroyed或保留真实失败。destroyed不会由内层反调提前发布，已有失败债务也不会被反调覆盖。

### P5.3zzzwx GLTF外部回调公开load重入门（2026-08-15，代码已写、未运行）

共享GLTF Loader把字节读取、`loadAsync/parseAsync`同步启动、解析结果数据读取、Three资源租约构建与候选清理纳入同一调用栈重入水位。回调内公开`load`在读取Definition和登记pending前返回已处理的拒绝Promise；即使回调吞掉该拒绝，原load也会失败关闭。异步解析已经返回Promise时不因同步重入而遗弃：原Owner继续等待结果，合法scene先取得资源租约并完成回收，再报告重入失败。调用栈退出后的正常并发与后续load继续允许，已发布lease的release仍由调用方直接持有。

### P5.3zzzwy GLTF候选租约构造失败scene Owner（2026-08-15，代码已写、未运行）

合法GLTF scene已经返回、但Three资源遍历或dispose方法快照使候选租约构造失败时，Loader不再丢失原始scene。该scene按load sequence进入同一候选清理数量水位，立即关闭新load；终态Owner先重建`ThreeObjectDisposalLease`，再释放资源。重建仍失败时保留scene，重建成功但dispose失败时把Owner转移到既有可重试租约台账；只有scene与租约两类候选债务同时归零才能移除handler并发布destroyed。

### P5.3zzzwz GLTF纹理Handler注册事务Owner（2026-08-15，代码已写、未运行）

自定义图片Handler不再在GLTF Loader构造函数中直接修改LoadingManager。构造阶段只冻结add/remove端口并创建未注册的平台纹理Owner；首个load先登记pending sequence，再发布潜在remove债务，最后调用`addHandler`。注册失败、thenable或吞掉公开load重入时，同一个已构造Loader关闭新load、销毁平台纹理并重试remove，不会因构造函数抛出而遗失部分注册。未发生任何load就destroy时只销毁未注册平台Owner，不调用`removeHandler`。

### P5.3zzzxa GLTF角色模板结构失败正式兜底（2026-08-15，代码已写、未运行）

GLTF资产字节和基础scene已成功加载、但角色View构造发现缺少手持插槽、骨骼结构不可用或其他正式模板集成错误时，不再直接阻断参赛者创建。Factory仅在该正式GLTF模板构造失败路径使用既有程序化角色兜底，并按asset ID记住结构拒绝；同一Factory后续角色直接使用兜底，不重复克隆和触发相同故障。有效GLTF仍是正常渲染路径；底层模板Task/lease继续由Factory持有到dispose，不因单个View失败提前释放共享资产。

### P5.3zzzxb GLTF角色兜底类型边界（2026-08-15，代码已写、未运行）

正式GLTF角色View先在兜底边界外规范Definition、options数据字段和Action Presentation，再把Loader交付的角色/装备模板载荷规范化、模型克隆、材质准备、手持插槽闭合及动画控制器集成失败统一包装为`GltfCharacterTemplateIntegrationError`。Factory只捕获该明确类型后进入P5.3zzzxa兜底；Definition、调用参数和动作配置错误继续原样失败关闭，不写入模板拒绝台账，也不被程序化角色掩盖。

### P5.3zzzxc 角色换装候选清理Owner（2026-08-15，代码已写、未运行）

GLTF与程序化角色换装现在在释放旧装备前，先把新装备对象及其资源租约发布到View私有候选槽。旧装备释放、候选挂载或替换事务失败时立即回收候选；若该回收也失败，候选仍由View持有，不随局部异常丢失。角色进入失败关闭后，dispose按未提交候选→当前已装备资源→角色控制器/根资源的顺序重试，已完成Owner不重复释放。

### P5.3zzzxd GLTF角色View构造清理债务Factory Owner（2026-08-15，代码已写、未运行）

正式GLTF角色View在模板集成边界内为已创建的Controller、克隆模型和View根建立构造清理水位。结构集成失败先按Controller→模型脱离→根清空回滚；回滚仍失败时，具名模板错误继续持有同一资源并提供`retryCleanup()`，不因构造函数没有返回对象而丢失Owner。Factory接管未完成债务并关闭后续create，销毁时先重试构造债务，归零后才释放共享模板Task与自有底层Loader；清理成功的普通结构错误仍按既有策略进入程序化兜底。

### P5.3zzzxe 程序化角色View构造租约失败Factory Owner（2026-08-15，代码已写、未运行）

程序化角色骨架完整返回后、外层Group挂载和`ThreeObjectDisposalLease`建立期间产生的失败现在有显式构造资源记录。已建立租约沿用其逐项水位；未建立租约则保留原骨架或外层根，显式重试时先重新建立租约再释放。即时回收仍失败由具名构造错误持有Owner；程序化Factory新增dispose生命周期，GLTF Factory的程序化兜底路径也接管同类债务，归零前统一关闭create。本批明确不宣称覆盖Builder内部尚未返回根之前的构造异常。

### P5.3zzzxf 动画Controller构造清理债务组合（2026-08-15，代码已写、未运行）

`CharacterAnimationController`在overlay Mixer预热期间失败且stopAllAction/uncacheRoot回滚不完整时，不再抛出无法继续清理的普通错误；具名构造错误持有尚未返回的Controller及成功水位，并提供精确重试。共享GLTF View与正式Arena V2 GLTF View把该子债务放在模型层级和材质清理之前，子债务未完成时不提前拆除依赖，外层构造失败对象继续交由各自Factory台账持有。

### P5.3zzzxg 程序化骨架Builder部分构造清理Owner（2026-08-15，代码已写、未运行）

程序化骨架Builder从创建私有根开始建立构造事务；每个材质和几何一经创建即登记独立dispose水位。根返回前任一后续构造/挂载失败先清空私有根，再释放全部已登记资源；失败项保留、成功项不重复。即时清理不完整时由具名Builder构造错误持有资源并交给程序化Factory或GLTF兜底Factory。与P5.3zzzxe组合后，Owner链从Builder首个根贯通到View根租约成功移交。

### P5.3zzzxh GLTF角色Factory默认Loader构造顺序（2026-08-15，代码已写、未运行）

`GltfCharacterViewFactory`先读取并校验全部Registry Definition、装备模板唯一性和默认Loader公开load的数据方法，再创建自有`GltfPresentationAssetLoader`。自有Loader构造完成后只剩内部字段移交，不再调用可失败的Registry、注入端口或原型读取，从源头消除Factory构造抛错后默认Loader不可达的窗口；注入Loader仍保持调用方Owner语义。

### P5.3zzzxi 底层GLTF Loader构造顺序（2026-08-15，代码已写、未运行）

`GltfPresentationAssetLoader`在创建默认Three GLTFLoader前完成Options、readAssetBytes/createImage和默认GLTF/LoadingManager原型数据方法快照。默认Loader创建后只把预捕获方法绑定到内部实例；平台纹理Loader在Manager与add/removeHandler端口全部确认后最后创建。构造期外部数据或可变原型失败因此不会遗留不可达子Owner。

### P5.3zzzxj ArenaWorldStage构造清理Owner（2026-08-15，代码已写、未运行）

`ArenaWorldStage`使用单一构造资源账本覆盖Scene、深渊原始几何/材质、资源租约、成功创建的四类Registry与自有角色Factory。构造回滚按依赖水位推进，未完成资源由`ArenaWorldStageConstructionCleanupError`继续持有并支持显式重试；不再以固定两次回滚后抛普通错误作为终点。Registry内部未返回实例前的子构造窗口留待后续批次，不在本批伪报闭合。

### P5.3zzzxk Greybox Renderer构造债务承接（2026-08-15，代码已写、未运行）

`ArenaGreyboxRenderer`识别并持有Stage构造债务，Stage归零后才释放共享资产Loader；HUD、音频、WebGL Renderer与Context继续独立推进。Renderer构造清理仍未收敛时由具名错误持有Renderer闭包和清理水位，调用方可继续重试，不再在固定重试次数后遗失Owner。

### P5.3zzzxl Stage子Registry内部构造债务上送（2026-08-15，代码已写、未运行）

`SurfaceView`与`PooledEventEffect`从首个几何/材质起逐项登记资源；尚未建立Three租约时失败则清根后逐项释放，租约已建立则沿同一租约水位重试。Surface Registry和Effects Pool持有未返回子实例的债务并清理已成功兄弟实例，再把有类型债务交给Stage；Stage在子债务归零前不清Scene。

### P5.3zzzxm HUD构造清理债务Renderer Owner（2026-08-15，代码已写、未运行）

`ArenaHudLayer`逐项持有CanvasTexture、Quad几何/材质、资源租约与Scene清空水位；构造未返回且即时清理失败时由具名债务继续持有。Greybox Renderer识别并接管该债务，使HUD资源进入Renderer既有构造清理闭包；音频构造期没有创建Voice，不扩张本批范围。

### P5.3zzzxn WebGL Renderer原始候选Owner（2026-08-15，代码已写、未运行）

Renderer工厂返回的原始对象在完整绘制能力快照前进入构造账本；dispose与forceContextLoss优先捕获且独立确认。其余端口快照或配置失败时，Renderer构造错误闭包继续持有原始候选并只重试未完成水位，不再要求候选先成为完整`WebGlRendererPort`。

### P5.3zzzxo WebGL Context构造候选Owner（2026-08-15，代码已写、未运行）

平台返回WebGL Context后立即登记构造候选。Renderer工厂尚未返回时失败，候选通过`WEBGL_lose_context`扩展独立释放；完整Renderer发布后才把Context清理权移交`forceContextLoss`。原始Renderer与Context候选并存时分别推进dispose与context水位，避免重复释放。

### P5.3zzzxp Renderer清理回调重入与同步门（2026-08-15，代码已写、未运行）

Greybox Renderer终态清理由单一Owner推进，清理回调同步重入任一公开API会被记录并使外层失败关闭，不能通过吞掉内层异常绕过。dispose、forceContextLoss、loseContext及普通清理回调必须同步完成；thenable只被观察以避免未处理拒绝，不提交资源完成水位。

### P5.3zzzxq Stage/HUD终态回调重入与同步门（2026-08-15，代码已写、未运行）

ArenaWorldStage与ArenaHudLayer终态清理逐Child确认同步完成。当前清理回调重入公开API时保留当前水位并停止后序依赖释放；HUD Quad反调不会继续清Scene，Stage Child反调不会越过Factory/Abyss/Scene。thenable统一被拒绝并保留Owner，Stage构造回滚复用同一同步合同。

### P5.3zzzxr Stage子Registry与Effects逐记录终态门（2026-08-15，代码已写、未运行）

Surface、Character、Equipment Registry和Effects Pool按确定顺序保留每条记录的脱离/销毁水位。根脱离未确认时不得销毁对应View/Runtime；当前记录回调抛错、返回thenable或吞掉公开API反调时保留Owner并停止后序记录，下一次dispose只重试未完成水位。Stage/HUD/Effects同时把运行与清理操作检查前置到destroyRequested之前，确保终态回调重入不会被普通“已销毁”分支吞没。

### P5.3zzzxs 动态角色Runtime构造债务Registry Owner（2026-08-15，代码已写、未运行）

CharacterViewRuntime把两个解析器、Factory原始候选、dispose端口、规范化View和能力绑定纳入单一构造账本。Runtime未返回且即时回收再失败时，具名错误保留独立完成水位；Character Registry在失败关闭前接管债务，后续dispose先重试债务再处理已发布角色记录，不再遗失比赛中途新角色的模型Owner。

### P5.3zzzxt 动态地面武器Builder与World View构造Owner（2026-08-15，代码已写、未运行）

程序化锤、盾、链从首个Material/Geometry起登记GPU资源，部分根失败由具名Builder债务保留。WorldEquipmentView继续持有Builder债务、成功返回的原始Group与Three租约，命名/缩放/租约/首次同步失败都由同一账本回收；View未返回时Equipment Registry接管债务并在终态精确重试。

### P5.3zzzxu 程序化角色持武器构造与换装Owner（2026-08-15，代码已写、未运行）

ProgrammaticCharacterView在换装配置前发布装备构造账本，承接Builder子债务、原始Group和租约；完整候选发布后才允许释放旧武器。构造/候选清理失败均保留在View，dispose按构造债务→候选→当前武器→角色根停止式推进，不再让角色换装中途的武器GPU Owner失联。

### P5.3zzzxv Three资源租约逐资源终态水位（2026-08-15，代码已写、未运行）

ThreeObjectDisposalLease逐Texture/Material/Geometry确认同步释放，当前dispose回调抛错、thenable或吞掉租约公开API反调时保留当前水位并停止后序资源。全部GPU资源归零后才允许removeFromParent；解绑回调反调也保留detached水位，下一次dispose精确重试。

### P5.3zzzxw 角色Runtime逐Child终态水位（2026-08-15，代码已写、未运行）

CharacterViewRuntime按Semantic Resolver→Direction Resolver→Character View逐Child确认终态。当前destroy/dispose异常、thenable或吞掉Runtime公开API反调时保留当前与后序Owner；operating/cleaning检查前置到failed/destroyed状态之前，下一次Registry dispose沿内部水位精确重试。

### P5.3zzzxx 程序化角色View逐Owner终态反调门（2026-08-15，代码已写、未运行）

ProgrammaticCharacterView按装备构造债→完整候选→当前武器→角色根逐Owner清理。GPU资源回调反调角色View时，公开门记录反调，父Owner保留当前引用并停止后序清理；候选只有清理返回且无反调后才清空pending水位，下一次Runtime dispose继续重试。

### P5.3zzzxy GLTF与正式角色View装备构造/终态Owner（2026-08-15，代码已写、未运行）

共享GltfCharacterView在武器模板clone/程序化Builder前发布构造账本，承接Builder债务、原始Group和租约；终态按构造债→候选→现武器→Controller→根脱离→根清空停止式推进。正式GLTF候选View继续使用单调操作序号，并把Controller、武器债务、根、逐材质、onDisposed改为异常/thenable/反调保留当前及后序Owner。

### P5.3zzzxz GLTF与正式角色Factory逐记录终态Owner（2026-08-15，代码已写、未运行）

共享GltfCharacterViewFactory按构造债务→资产加载Task→自有Loader停止式清理；正式角色Factory按已发布View→构造债务停止式清理。任一当前记录失败、返回thenable或同步反调Factory，均不删除当前记录且不越过清理后序Owner；正式构造债内部同步使用相同逐资源水位。

### P5.3zzzya 程序化角色Factory与正式资产Preloader终态Owner（2026-08-15，代码已写、未运行）

程序化角色Factory逐构造债停止式重试，当前失败、thenable或Factory反调保留当前与后序债务。正式Three资产Preloader逐Task同步销毁并确认完成，首个失败停止后序；Task全部归零后才清模板引用并推进自有Loader，异步加载能力保持不变。

### P5.3zzzyb 正式Three Stage逐Child终态Owner（2026-08-15，代码已写、未运行）

正式Stage沿路线→角色→装备→地图→HUD/VFX→音频→命中可读性/相机→World Root依赖链停止式清理。普通异常、thenable和同步反调都保留当前及后序Child；装备集合只推进到首个失败记录，Match Owner未归零前不进入终态表现Owner。

### P5.3zzzyc 正式地面武器未发布构造Owner（2026-08-15，代码已写、未运行）

正式地面武器clone根或可读性Owner创建后立即进入候选清理记录，完整EquipmentRecord尚未返回时回滚失败也由Stage的装备债务集合持有。清理按可读性→候选根停止式推进，后续Match/Stage终态精确重试。

### P5.3zzzyd 正式Web Match Host逐Child终态Owner（2026-08-15，代码已写、未运行）

Web Host按Context监听器→Match Surface→资产Preloader→Renderer→Audio停止式清理。清理回调统一要求同步；普通异常、thenable或Host反调都保留当前与后序Child，监听器未解绑时不继续拆除可能被回调访问的资源。

### P5.3zzzye 正式Stage/Web Host构造债务链（2026-08-15，代码已写、未运行）

Stage构造期World Root回滚失败由具名债务保留；Web Host构造账本按Surface/Stage债→独立表现Child→Preloader→Audio→Renderer停止式回收，未完成时形成Host债务并由Playable Composition现有构造错误Owner接管。

### P5.3zzzyf Playable Composition构造反向Owner（2026-08-15，代码已写、未运行）

Playable Composition构造账本按Resize→Driver/Binding→预览/信息→下游债务与本地/Match Owner→留存日志→Pointer→Container严格反向清理。每个回调要求同步，当前失败保留当前字段并停止后序Owner，具名构造错误下一次从精确水位重试。

### P5.3zzzyg Playable Composition运行期终态Owner（2026-08-15，代码已写、未运行）

运行期Composition按Resize监听→Driver组合Owner→离线留存日志→Pointer Surface→Container逐Child同步清理。普通失败、thenable和反调统一保留当前与后序Owner；失败停机与显式dispose复用同一水位。

### P5.3zzzyh 键盘/指针Driver与Input终态Owner（2026-08-15，代码已写、未运行）

键盘和指针Driver按Loop→Input→可见性监听→Binding停止式清理；底层键盘/指针监听数组只推进到首个失败记录，Pointer Adapter归零后才推进Sampler。所有回调要求同步，不改三操作输入合同与固定tick权威边界。

### P5.3zzzyi 信息Binding与预览Surface终态Owner（2026-08-15，代码已写、未运行）

信息Binding按Intent解绑→信息Surface→本地Host Owner→Match Surface停止式清理；角色与收藏预览Surface也按各自资源依赖树逐项同步提交。普通异常、thenable和反调统一保留当前与后序Owner，不改11页面、角色/武器预览、正式资产、比赛生命周期和三操作合同。

### P5.3zzzyj 本地权威Host与Registry Owner同步边界（2026-08-15，代码已写、未运行）

Information、Playable、Local Playable与Registry-backed Owner的构造回滚、公开子调用和终态释放统一拒绝thenable；父层只在Child同步确认后提交引用水位，同时保持Registry晋级Owner与Local Playable既有独立清理策略。

### P5.3zzzyk 信息DOM/Canvas Surface终态Owner（2026-08-15，代码已写、未运行）

信息DOM和Canvas Surface按活动指针→事件监听→Live Region/DOM根或Canvas原状态停止式释放；普通异常、thenable与反调统一保留当前和后序水位，不改页面布局、绘制、语义和Intent。

### P5.3zzzyl 正式Pointer Surface终态Owner（2026-08-15，代码已写、未运行）

正式触控Surface按活动指针→输入监听→生命周期监听→三类权威可用性展示→DOM根停止式清理；绑定/解绑宿主调用要求同步，不改方向、跳跃、主攻击、安全区和触控布局。

### P5.3zzzym 隔离正式Web入口终态Owner（2026-08-15，代码已写、未运行）

入口Click/pagehide/pageshow监听在宿主绑定前登记潜在Owner，失败按反向水位同步回滚；dispose先停止式解绑入口监听，再同步释放构造债务或当前Composition，不开放默认入口。

### P5.3zzzyn 正式HUD Canvas终态Owner（2026-08-15，代码已写、未运行）

正式HUD按像素→Live Region→Context→Canvas原始尺寸/样式/ARIA水位同步停止式恢复；普通异常、thenable和反调均保留当前与后序字段，不改HUD内容与布局。

### P5.3zzzyo 角色选择预览Render Surface终态Owner（2026-08-15，代码已写、未运行）

角色预览Render Surface必须先同步清空Scene，才允许销毁注入Renderer；任一步失败保留精确水位，不改六角色、武器预览、相机、光照和资产批准。

### P5.3zzzyp 角色选择预览Mount Owner终态水位（2026-08-15，代码已写、未运行）

Mixer、武器克隆、逐材质、预览层级与模型构造债务逐资源同步停止式清理；Owner只删除确认完成的当前记录，不改角色目录、装备语义、挂点和静态姿态。

### P5.3zzzyq 收藏预览Page Surface Host终态Owner（2026-08-15，代码已写、未运行）

Host必须先同步收敛Multi-slot Render Surface及其构造债务，再释放Page Transaction及其债务；普通异常、thenable或不完整结果保留当前与后序Owner。

### P5.3zzzyr 收藏武器预览Mount Owner终态水位（2026-08-15，代码已写、未运行）

Model Clone、Preview Group、Camera和两类灯光逐对象同步脱离/清空；Mount与债务集合只删除确认完成记录，不改20武器预览和共享资源语义。

### P5.3zzzys 收藏预览Page Transaction终态Owner（2026-08-15，代码已写、未运行）

Proof准备、资源Owner/债务、Proof终结、Planner、Layout Observer和终态Snapshot逐项同步提交；当前失败停止后序，Snapshot失败不再伪报destroyed。

### P5.3zzzyt 收藏资源执行Composition终态Owner（2026-08-15，代码已写、未运行）

Executor同步销毁并取得可信快照后才允许释放Adapter；构造回滚与运行终态都在首个普通异常、thenable或反调处停止并保留后序Child。

### P5.3zzzyu 收藏可见预览释放前证明屏障（2026-08-15，代码已写、未运行）

全部活动记录的before-release证明同步成功后才允许销毁Lease Owner；任一证明失败保留全部记录，不继续越过到租约释放。

### P5.3zzzyv 收藏正式预览Lease Owner终态资源水位（2026-08-15，代码已写、未运行）

Lease Owner终态按资源停止式取消和释放，任一失败保留当前及后序资源；全部资源清理完成前不结算租约或清空账本。

### P5.3zzzyw 收藏惰性GLTF适配器终态任务水位（2026-08-15，代码已写、未运行）

全部loading任务先转为取消并阻断迟到发布，再按任务顺序停止式清理；当前任务未收敛时不越过到后序任务或自有底层Loader。

### P5.3zzzyx 收藏正式预览Lease Owner旧epoch清理屏障（2026-08-15，代码已写、未运行）

旧epoch全部资源完成settlement、取消和释放后才结算租约并提交next Binding；任一失败保留旧账本并失败关闭。

### P5.3zzzyy 正式Three VFX终态资源水位（2026-08-15，代码已写、未运行）

Effect按Root、Geometry、Material逐资源停止式清理；全部Effect归零后才进入Texture、Impact与VFX Root，普通失败不再越过后序Owner。

### P5.3zzzyz 正式WebAudio终态Voice/总线水位（2026-08-15，代码已写、未运行）

Voice按Playback、Source、Gain停止式释放；全部Voice完成后才清Buffer、断开三层总线并关闭Context。

### P5.3zzzza WebAudio总线/Context构造债务上送（2026-08-15，代码已写、未运行）

总线构造失败按Limiter、Master、SFX、Context close水位清理；异步close或普通失败形成可重试债务，由Web Match Host构造资源树接管。

### P5.3zzzzb WebAudio未发布Voice节点构造债务（2026-08-15，代码已写、未运行）

Source/Gain创建后到Voice发布前的失败由Audio Owner债务集合持有，终态先于活动Voice停止式重试。

### P5.3zzzzc Three VFX Scene Root构造债务上送（2026-08-15，代码已写、未运行）

Scene add失败后的未发布VFX Root进入具名可重试债务并上送Web Match Host；Root脱离前不推进后序构造资源释放。

### P5.3zzzzd 角色选择预览未发布Owner债务（2026-08-15，代码已写、未运行）

Web Match Host创建预览Owner后到返回前的失败由Host债务集合接管；终态在共享Preloader释放前逐Owner停止式重试。

### P5.3zzzze 角色/武器首屏可读性终态水位（2026-08-15，代码已写、未运行）

局部Transform、材质引用恢复与逐材质dispose形成停止式水位；当前字段或材质失败时保留全部后序Owner。

### P5.3zzzzf 首屏可读性材质构造债务上送（2026-08-15，代码已写、未运行）

材质Clone在可读性实例返回前回滚失败时形成具名债务，由正式角色手持武器和地面武器Owner接管，归零后才移除Root。

### P5.3zzzzg KZ路线可读性地图变换水位与构造债务（2026-08-15，代码已写、未运行）

正式GLB路线节点的Quaternion/Scale逐节点停止式恢复；构造未返回时的变换回滚债务由Three Stage接管，归零前不得释放地图对象。

### P5.3zzzzh 收藏多槽渲染临时Yaw终态债务（2026-08-15，代码已写、未运行）

单槽渲染前登记Preview Group原Yaw，恢复失败由Surface继续持有；全部Yaw归位后才允许关闭Scissor并释放Renderer。

### P5.3zzzzi 正式地图环境终态恢复水位（2026-08-15，代码已写、未运行）

Three Stage按灯光根、Scene背景、Scene雾逐项恢复地图环境，重试只推进未完成水位，全部归零后才释放环境身份。

### P5.3zzzzj 正式相机冲击终态水位（2026-08-15，代码已写、未运行）

镜头冲击清空、基础相机恢复和冲击Owner释放分步停止式提交，失败重试不再重复已完成相机操作。

### P5.3zzzzk 收藏Page Surface Host未发布Owner上送（2026-08-15，代码已写、未运行）

A6.14 Host构造返回即发布到A6.16父字段并转移Renderer所有权；返回前失败保留完整Host，终态不再越过它直接释放Renderer。

### P5.3zzzzl 角色选择Render Surface未发布Owner上送（2026-08-15，代码已写、未运行）

正式角色预览Render Surface构造返回即发布到父组合并接管孤儿Renderer；返回前失败保留Surface与后序Mount Owner。

### P5.3zzzzm 角色/收藏预览Renderer与Canvas终态水位（2026-08-15，代码已写、未运行）

两条预览Renderer按dispose、Canvas隐藏、宽度和高度复位停止式推进；Renderer失败阻断全部后序Canvas写入。

### P5.3zzzzn 正式操作可用性跨字段停止式清理（2026-08-15，代码已写、未运行）

正式Web离开对局或回滚动作可用性时，按移动、主攻击、跳跃顺序停止式清理；前一字段未确认时不再改写后序字段，已完成字段由Pointer Surface自身状态作为重试水位。

### P5.3zzzzo Pointer Surface构造DOM债务上送（2026-08-15，代码已写、未运行）

Pointer Surface挂入宿主后构造失败且首次根移除失败时，具名债务继续持有该DOM根并提供同步重试；Formal Web Composition在容器移除前接管并收敛债务。

### P5.3zzzzp Formal Web主容器所有权转移纳入构造账本（2026-08-15，代码已写、未运行）

主Container只在反向构造事务开始后挂入宿主；append部分成功后抛错时，既有顶层构造债务继续持有并重试移除Container。

### P5.3zzzzq Formal Web Resize监听器潜在Owner预登记（2026-08-15，代码已写、未运行）

Resize清理闭包在调用宿主addEventListener前进入构造账本；注册部分提交后抛错时仍可同步移除，未注册时移除保持幂等。

### P5.3zzzzr Pointer输入/生命周期监听器潜在Owner预登记（2026-08-15，代码已写、未运行）

Pointer四类输入监听与批量生命周期监听都先登记remove闭包再调用addEventListener；当前注册部分提交或返回异常时，既有Surface账本可逆序重试。

### P5.3zzzzs 键盘输入监听器潜在Owner预登记（2026-08-15，代码已写、未运行）

键盘keydown、keyup与blur监听都先进入本次bind清理数组再调用宿主注册；部分注册失败后Simple Input保留未完成闭包，并由Driver继续持有实例。

### P5.3zzzzt 键盘可见性批量监听构造债务（2026-08-15，代码已写、未运行）

Formal Web hide/show六项监听逐项预登记；批量注册失败且首次逆序解绑仍失败时形成具名债务，Keyboard Driver接管为可重试Visibility cleanup。

### P5.3zzzzu WebAudio Voice ended监听终态水位（2026-08-15，代码已写、未运行）

每个Voice显式持有ended监听函数与解绑水位；终态按监听解绑、播放停止、Source断开、Gain断开推进，自然ended先提交once解绑事实再延期结算。

### P5.3zzzzv Frame Loop取消token终态债务（2026-08-15，代码已写、未运行）

cancelFrame失败不再吞错并遗失token；Loop保留取消债务，stop/destroy/start先重试，迟到的一次性帧交付可在受保护deliver中结清同一token。

### P5.3zzzzw 收藏资源结算重绘取消Owner预发布（2026-08-15，代码已写、未运行）

A6.16调度器返回取消函数后立即发布到Composition字段，再执行父操作提交与同步回调检查；回滚取消失败时闭包保留给dispose继续重试。

### P5.3zzzzx Formal Web Surface切换失败全层关闭（2026-08-15，代码已写、未运行）

信息页、对局Renderer、HUD、两类预览、ARIA与Pointer全部确认后才发布activeSurface；任一步失败统一隐藏全部层并禁用Pointer，避免诊断容器留下混合交互画面。

### P5.3zzzzy Formal Web入口脱离异步Owner接管（2026-08-15，代码已写、未运行）

首次准备、失败重试、页面恢复与进入游戏统一由脱离操作Owner观察同步启动和异步拒绝；页面终止清理异常也在事件边界内接管，不再向浏览器泄漏未处理失败。

### P5.3zzzzz WebAudio关闭结果与提交失败分域（2026-08-15，代码已写、未运行）

AudioContext底层close成功/失败与其后状态提交成功/失败分别记账；成功关闭事实不会被提交异常改写成底层关闭失败，未关闭时释放旧Promise并重新开放重试，Voice ended延期清理拒绝也进入Audio失败账本。

### P5.3zzzzza Formal Web Match Host终态续接兜底（2026-08-15，代码已写、未运行）

Match Host异步续接清理的业务失败与失败提交再次异常均在同一Host内收敛；最终兜底清除scheduled水位并保留failed/lastError，使后续Owner可显式重试。

### P5.3zzzzzb Formal Web脱离异步失败代际绑定（2026-08-15，代码已写、未运行）

脱离操作在同步启动返回后冻结实际generation；异步拒绝只允许提交到同代入口，BFCache恢复或重新准备后的新一代页面不会被旧Promise迟到失败覆盖。

### P5.3zzzzzc 生存准备信息与入口Owner结算代际收敛（2026-08-15，代码已写、未运行）

旧信息架构实验不再把三实体世界掉落描述成“三选一”，首屏明确开局空手、每20秒掉落3把以及靠近自动拾取或替换；正式Web准备/激活Owner在同步启动后冻结实际generation，其迟到结算异常只能提交到原代页面。

### P5.3zzzzzd Formal Web失败停机首因保留（2026-08-15，代码已写、未运行）

Playable Composition异步停机失败后若受保护的失败提交再次异常，最终兜底继续聚合停机前已经记录的业务首因，不再只留下清理错误和提交错误。

### P5.3zzzzze Formal Web音频加载取消Owner（2026-08-15，代码已写、未运行）

每项正式音频fetch在启动前登记独立AbortController；终态先请求取消仍在网络阶段的加载，再等待已开始的读取/解码结算，最后释放Voice、总线与AudioContext。响应或字节在Owner关闭后抵达时不再启动下一阶段工作。

### P5.3zzzzzf Formal Three VFX纹理加载取消Owner（2026-08-15，代码已写、未运行）

正式VFX不再直接等待不可取消的`THREE.TextureLoader.loadAsync()`。它复用共享`PlatformTextureLoader`：项目内纹理路径经受限页面基址解析，每张异步结算Owner在调用图片加载前发布；dispose与启动失败先取消未决图片回调并释放平台持有的未发布Texture，再清理VFX已发布纹理、Impact与Root。Web Host只注入当前Document的图片工厂，不把DOM或网络判断下沉到权威玩法层。

### P5.3zzzzzg Formal GLB主体读取取消Owner（2026-08-15，代码已写、未运行）

共享GLTF Loader为每次平台字节读取建立AbortController，销毁时在等待pending load前先请求取消；正式Web Host的默认Preloader改走受限`assets/` fetch读取并接收该signal，同时注入可取消外部图片的Document工厂。Preloader先请求自有Loader停机，再检查和释放Task，避免Task等待反过来阻断底层网络取消。

### P5.3zzzzzh 收藏正式预览GLB取消Owner（2026-08-15，代码已写、未运行）

A6.16默认收藏预览Loader接入同一可取消字节读取和图片端口；正式Web Playable提供受限项目模型fetch。终态在等待submission、Preview Host和惰性Task前先请求Notifying/自有GLTF Loader停机，最后仍以底层`cleanupComplete`作为释放Surface的硬条件。

### P5.3zzzzzi 本地留存默认接线与学习节奏读取（2026-08-15，代码已写、未运行）

隔离正式候选入口默认建立本地匿名留存日志，`retention=off`可显式关闭；首次成功解析后冻结本页选择，每个重新准备generation仍重新确认存储与匿名主体，不复用失败快照。入口与Formal Web Composition新增只读学习节奏校准读取，消费同一日志的权威比赛tick并输出200小时静态容量判断；结果绑定Journal revision/hash与丢弃计数，容量淘汰后明确标记为最近保留窗口。日志与校准均不上传、不使用设备指纹、不修改Profile/阈值/奖励，也不宣称真实留存已达成。

### P5.3zzzzzj 正式目标受击停顿冲量分级（2026-08-15，代码已写、未运行）

正式Three继续使用唯一Character Impact Owner，不创建全局暂停器。目标级动画Hold按权威方向反馈的轻/中/重冲量倍率缩放并受既有效果时长封顶：轻量不延长、中量保持、重量最多增加1个表现tick。低动效或静态motion policy仍不暂停动画，MatchCore、输入、碰撞、计时与其他参与者始终连续。

### P5.3zzzzzk 当前页面真实武器研究节奏读取（2026-08-15，代码已写、未运行）

隔离Formal Web候选在本地匿名Journal和Local Playable均建立后冻结当前页面Learning Profile基线。新增只读接口把基线后同一Journal中的有效结算按Profile revision闭合到当前Profile，完整时复用唯一研究节奏算法输出真实每主研究点分钟数、剩余收藏小时和200小时差值；缺项、重复或不连续时不猜值，只报告窗口不完整。该读取不新增页面、留存指标或写入者，不修改成长、奖励、玩法或阈值。

### P5.3zzzzzl 攻防双身份与攻击者接触确认（2026-08-15，代码已写、未运行）

武器反馈的攻击者和受击者不再压缩成单一视觉锚点：两项身份分别进入HUD反馈、Queue指纹、不可改专门化字段、Visual Command、武器/徒手VFX闭包和Formal Three。受击者继续承担当帧方向、亮度与2/3/4 tick基础受击Hold；攻击者仅在命中建立时获得固定1个表现tick的动作Hold，冲量分级不会延长它。低动效/静态策略不建立Hold，非武器反馈双身份固定为空；任何命中缺少权威受击者时失败关闭，不从Anchor或本地化文案推断。该批不新增全局hit-stop、规则、伤害、输入、VFX层、粒子、音频、页面、资产或默认入口。

### P5.3zzzzzm 候选VFX端口完整身份与幂等派发（2026-08-15，代码已写、未运行）

尚未接入默认面的独立VFX端口不再把专属武器解析结果压缩为只含Anchor的表现配方：解析结果顶层继续携带权威攻击者和受击者。活动事件记录冻结完整Visual Command指纹；同一事件、同一命令的重复提交在下游调用前幂等返回，任一标题、时序、预算、锚点或攻防身份变化均按身份漂移失败关闭并清理。该批不改变当前Formal HUD→Three主链，不新增表现、粒子、音频、规则、输入、资产或默认接线。

### P5.3zzzzzn 页面生命周期研究节奏基线Token（2026-08-15，代码已写、未运行）

隔离Formal Web原先把“当前页面”武器研究节奏基线保存在单个Composition中；同一页面失败重试或BFCache恢复销毁并重建Composition后会重新取基线，导致前代已完成结算退出精确窗口。现在入口持有不透明内存Token并传给后续Composition，Token冻结Learning Profile Definition、基线Profile和匿名主体，只公开revision、兼容性复核、窗口创建与校准投影，不公开原始Profile。Profile、Definition或匿名主体漂移时只关闭校准读取，不阻断游戏；正常刷新/新页面不持久化Token，因此不新增storage key、迁移、网络、指标或跨页面推断。

### P5.3zzzzzo 研究节奏窗口Definition内容哈希闭合（2026-08-15，代码已写、未运行）

P6.420研究节奏窗口原先只把Learning Profile Definition的ID与`contentVersion`写入身份；若内容错误改变但版本未递增，旧窗口仍可能通过重算。窗口现显式保存`profileDefinitionContentHash`并纳入`windowIdentityHash`，校准输入必须与同一哈希完全一致。P6.528页面Token同时比较保存基线、当前代基线和当前Profile三者的Definition内容哈希；这不改变Profile、研究点、观察或小时计算，只关闭错误Definition复用。

### P5.3zzzzzp 留存匿名主体长度单一合同（2026-08-15，代码已写、未运行）

Retention Observation与Offline Journal原本各自允许最长160字符匿名主体，研究节奏窗口却误用Learning Profile Definition的`maxIdentifierLength`；当自定义或测试Definition把普通ID上限设为小于160时，合法Journal会无法进入校准。现由Retention Observation导出唯一160字符上限，Observation、Journal和研究节奏窗口共同消费；正式内容Definition当前同为160，不受行为变化影响，本地生成身份、窗口哈希、Profile ID限制与隐私口径不变。

### P5.3zzzzzq 长期研究节奏基线与留存租约holder闭合（2026-08-15，代码已写、未运行）

页面Token仍负责同页失败重试与BFCache对象身份，但首次Composition现在优先从独立长期基线Store恢复冻结Profile；不存在时在离线Journal当前水位创建。记录绑定匿名主体、Definition ID/版本/内容哈希、完整基线Profile与hash、窗口hash及创建时Journal revision/payload hash/观察与丢弃水位，持独占租约写入并读回确认后立即释放，不保存墙钟、不上传。未来schema、匿名主体、Profile、Definition或Journal回退全部关闭长期读取；Store不可用且清理完整时退回本页基线，不阻断游戏。匿名身份缺失时若Journal或长期基线任一仍存在，入口拒绝生成新身份，避免旧基线被新主体误接管。

人工源码核对同时发现既有Offline Journal把`leaseTakeoverSameOwner=true`直接交给共享租约，却没有提供区别于owner的holder；共享租约会在正常Web Crypto入口直接拒绝该组合。Journal与长期基线Store现分别派生稳定、不同的holder后缀，Profile/结算Intent既有独立holder逻辑不变。该批未执行测试、类型、构建、浏览器或性能验证，不改Profile schema、120点阈值、奖励、玩法、页面、网络、设备身份、八类指标、生产门或默认入口。

### P5.3zzzzzr 长期研究节奏紧凑结算证据（2026-08-15，代码已写、未运行）

长期基线Store不再只保存页面刷新基线。它以Journal revision/hash为Checkpoint，逐个接收基线后连续的`effective-learning-completed`，只累计结算局数、携带权威时长的局数、缺失时长的局数和权威tick总量；累计Profile revision跨度必须与结算局数完全相等。每次Formal Web回到信息页及每次公开节奏读取前都会尝试同步，写入继续使用独占租约、确定性hash和写后读回确认。

投影仍使用唯一武器研究节奏公式：主研究点来自冻结基线Profile与当前Profile的精确差值，局时来自上述累计tick；不保存Replay、输入轨迹、墙钟或设备身份，也不增加第九类留存指标。当Checkpoint到当前Profile之间的结算明细已经先于同步被容量淘汰、Journal或Profile水位回退、主体/Definition/hash漂移或持久写入失败时，长期Owner失败关闭并清理；Composition只退回本页Token与仍保留的Journal窗口，窗口不完整则`calibration=null`，游戏本身继续运行。源码与延期规格已写，所有运行验证顺延，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzs 全集完成后研究节奏冻结（2026-08-16，代码已写、未运行）

长期基线的紧凑证据新增累计主研究点和全集完成revision。完成前仍按连续Profile revision累计结算数与权威tick；当当前档案达到目录目标时，只有“新增主研究点数等于本次待累计结算数”才能证明最后一个研究点发生于当前窗口末局，随后证据截止revision与完成revision同时冻结。完成后的对局只更新Journal Checkpoint，不再改变结算分母、总tick或200小时收集耗时。共享投影同时公开当前档案revision与证据截止revision，避免把两种水位混为一谈。

如果一次同步跨过多局且其中混有地图、模式或其他非武器有效进度，系统无法从紧凑观察中精确还原完成发生在哪一局，长期路径因此失败关闭；页面Token降级路径使用同一主研究点边界判断，返回`catalog-completion-boundary-unavailable`且`calibration=null`。本批不新增页面、按钮、留存指标、Profile字段、Replay、输入轨迹、墙钟、设备身份或网络，不改20武器、120点阈值、奖励、玩法、资产和默认入口。验证按用户要求统一顺延。

### P5.3zzzzzt 从零到全集的实际完成时长（2026-08-16，代码已写、未运行）

武器研究节奏读数新增独立的实际完成结果，不再让“按样本速度外推的全目录小时数”承担真实完成证据。只有长期基线Profile revision为0且主研究点为零、全集完成revision已精确冻结且窗口没有缺失权威局时，才从累计authority tick直接换算实际完成小时，并给出与200小时目标的差值和是否达到目标。目录未完成、中途基线或缺时长分别返回稳定原因和值`null`；预测结果仍保留用于完成前调参。该批不增加页面、按钮、Profile字段、留存指标、网络或墙钟载荷，不改20武器、120点、奖励、玩法、资产和默认入口；验证继续顺延。

### P5.3zzzzzv 全目录完成后的三模式复玩轮转建议（2026-08-16，代码已写、未运行）

完整学习目录闭合后，既有模式选择页虽然会同时展示三种个人记录，却仍把下一步表述为自由挑战，无法帮助玩家在常规1v1、竞速和生存之间形成稳定轮转。当前只在已验证`catalog-complete`终态下，从同一Home Record Summary选择累计游玩局数最少的模式；相同时严格按`常规1v1 → 竞速 → 生存`固定顺序决胜，并把“本轮建议、模式、累计局数”追加到既有`record-type`字段。玩家完成对局后，原Profile mode record的`playCount`自然变化，下一次投影重新计算，不新增轮转存档、任务、奖励、货币或计时器。

该建议不覆盖玩家当前选择、不自动开局，也不改变三模式已有的个人最佳和每局可重复挑战规则；当前开放内容完成但20武器全集未闭合时不发布完整目录轮转建议。源码与延期反证已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzw 全路线理解后的地图复练轮转建议（2026-08-16，代码已写、未运行）

两张地图的20个路段全部完成理解后，地图目录原来只显示“全部路段已理解/里程碑完成”，缺少下一张复练地图。当前地图选择投影继续复用同一已验证Learning Profile revision，并以`floor(revision / 当前可用武器数) % 2`在冻结地图目录顺序中选择唯一“本轮复练地图”；武器先逐把轮转，完整走过当前可用武器后才切换地图，避免某把武器永久绑定同一张地图。每次有效结算沿既有Profile revision自然推进，不新增地图游玩计数、轮转状态或随机源。

建议只追加到已有地图卡片description，不改变当前选中地图、不自动切换或开局；任一路段尚未完成时仍只显示最少练习路段，不提前发布复练建议。该批不新增页面、卡片、按钮、任务、奖励、货币、Profile字段或Authority写入。源码与延期反证已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzx 全武器学习闭合后的武器复练轮转建议（2026-08-16，代码已写、未运行）

20把武器全部达到120点主研究、完成收藏且五类情境全部理解后，武器目录原来只保留完成态，没有下一把复练方向。当前武器研究卡片投影从同一批已验证事实确认三项条件全部成立，再以`profileRevision % 当前可用武器数`按冻结收藏顺序标记唯一“本轮复练武器”；不可用武器不会进入轮转。任一可用武器的主研究、收藏或情境尚未闭合时，不发布轮转标记，继续显示既有研究里程碑和当前目标。

轮转只复用Profile revision，不新增武器游玩计数、收藏层级、任务、奖励、货币或随机源；标记只追加到既有卡片description，不改变可用性、当前选中武器或开局装备。源码与延期反证已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzy 完整目录后的模式×武器×地图复练组合（2026-08-16，代码已写、未运行）

完整目录终态不再让三条独立建议形成固定武器地图配对。新增只读组合解析器先复核同一Learning Profile、Profile revision与权威唯一下一目标，只接受真正的完整`catalog-complete`；模式继续选择累计局数最少者，平局按`常规1v1 → 竞速 → 生存`，武器按`revision % 当前可用武器数`逐把轮转，地图按`floor(revision / 当前可用武器数) % 地图数`换轮。正式20武器、2地图全部可用时，40局覆盖40种武器×地图组合后才重复；不可用武器和地图从各自推荐候选中排除。

组合只追加到首页既有`next-goal`字段，不新增页面、字段、卡片或按钮，不覆盖玩家选择、不自动开局。生存仍保持默认无武器，推荐武器只表示“局内实体实际出现时再拾取”，不保证本局供给。该批不新增轮转存档、任务、奖励、货币、Profile字段、随机源或Authority写入；源码与延期规格已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzz 结算页完整目录复练接力（2026-08-16，代码已写、未运行）

完整目录玩家完成一局后，结果页原来只保留目录完成和自由挑战文案，必须返回首页才能看到下一组模式×武器×地图复练方向。当前结果页从结算后的同一Learning Profile快照重新解析权威下一目标与P6.540组合，并把下一组复练建议追加到已有`next-goal`字段；首页与结果页共享同一个只读组合解析器，不在Presentation重新计算模式、武器或地图。

结果页已有`earned-progress`继续独立记录“本局按建议组合/改选组合开局”，与下一组建议不互相覆盖。该建议不改变现有“再来一局”或“下一目标”决策，不自动切换模式、武器、地图或开局；生存继续只表达实体实际出现时再拾取。该批不新增页面、字段、按钮、Profile、轮转存档、任务、奖励、货币、随机或Authority写入；源码与延期规格已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzza 完整目录显式下一目标准备路由（2026-08-16，代码已写、未运行）

P6.541虽然在结果页展示下一组复练组合，但玩家把结果决策显式切到“下一目标”后，旧路由仍把完整目录终态送回首页，展示与操作不一致。当前结果导航从点击时的同一Profile、权威下一目标和可用内容范围重新解析P6.540组合，并复核已渲染目标身份后进入既有模式确认页：常规1v1与竞速提交建议武器和地图，生存只提交建议模式与地图、保持空手，建议武器仍需局内实体实际出现后拾取。

这是玩家主动选择“下一目标”后的准备动作，不改变默认“再来一局”，不自动开局；当前开放范围完成`active-learning-complete`没有完整目录组合，仍返回首页。该批复用原结果动作、模式页与选择状态，不新增页面、按钮、字段、Profile、任务、奖励、轮转存档、随机或Authority写入；已补点击时Profile revision/组合漂移失败关闭和生存空手边界的延期规格，所有运行验证继续顺延。

### P5.3zzzzzzb 完整目录复练周期位置提示（2026-08-16，代码已写、未运行）

完整目录复练建议原来只说明武器与地图按40局覆盖后重复，玩家无法判断当前建议处于一轮中的位置，连续变化容易被误解为随机推荐。当前Presentation从P6.540已经验证的武器序号、地图序号和周期长度确定性计算`(地图序号 - 1) × 可用武器数 + 武器序号`，把“复练 N/总数”追加到首页与结果页共用的原`next-goal`文案；读屏同时说明当前组号和完成末组后回到第一组。

序号不新增Profile字段、计数器或轮转存档，不参与推荐、导航、奖励或Authority，只解释已存在的确定性组合；可用内容减少时总数随同一已验证组合自然收缩。源码与延期规格已写未运行，不新增页面、字段、卡片、按钮或自动操作，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzc 复练轮转序号与Profile revision闭合（2026-08-16，代码已写、未运行）

P6.543开始把轮转位置展示给玩家后，Presentation边界不能只校验武器和地图序号处于合法范围。当前投影再次用同一`profileRevision`、可用武器数和地图数计算期望武器序号与地图序号；任一调用方传入“范围合法但不属于该revision”的序号时，在生成玩家文案前失败关闭，不展示错误的复练位置。

该复核不复制推荐策略，不改变P6.540输出，也不写Profile或Authority；它只验证Presentation收到的快照内部自洽。源码与延期反证已写未运行，不新增页面、字段、按钮、任务、奖励、计数器、存档、随机或导航，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzd 首页完整目录复练组合准备接力（2026-08-16，代码已写、未运行）

P6.540已经在首页原`next-goal`字段展示模式×武器×地图组合，但首页原主动作仍只消费`free-choice`续玩路由，无法把已展示组合带到模式确认页。当前页面Composition在同一次Learning Profile读取中只计算一次完整目录组合，同时供字段投影和按钮Binding消费；主按钮原位显示“准备复练N/总数”，不增加第二个动作。

点击时Host从当前Profile、权威下一目标与可用内容范围重新计算组合，并与已渲染的revision、模式、武器、地图、轮转序号、目录规模、周期和生存拾取语义逐字段复核。通过后进入既有模式确认页：Duel/Race预选建议武器和地图，Survival只预选地图并保持空手；不自动开局。当前开放范围完成没有完整目录组合，仍保留“选择模式”的自由选择动作。组合准备进入原续玩回执和留存接力，不新增页面、字段、按钮、Profile、计数器、存档、任务、奖励、随机或Authority写入；源码与延期静态规格已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzze 本地结果性武器反馈优先占用可见槽（2026-08-16，代码已写、未运行）

P6.536已经保证拥挤时至少保留一条本地武器反馈，但本地槽内部仍沿通用时间顺序取舍：较新的`attack-evaded`可能遮住仍在生命周期内的真实命中、落点转移或击落结果。当前Queue先要求本地武器候选携带权威Action身份，排除`movement-fall`，再识别既有通用和二十武器专属VFX语义，优先选择结果性接触；若前三条已有本地挥空而结果性接触在保留队列中，则只替换该本地挥空，不额外挤占第二个槽。

没有结果性接触时，挥空继续沿原规则成为本地可见反馈；被替换或因拥挤不可见的本地武器项仍沿既有一次性声音规则处理。比赛结束、竞速冲线和生存终结掉落保持不可替换，三条可见、十二条保留、八路声音及VFX数量不变。该批不改权威事件、命中、击退、动作、数值、页面、资产或Authority；源码与延期规格已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzf 命中反馈队列活动状态身份与时间闭合（2026-08-16，代码已写、未运行）

Feedback Queue上一帧状态原来只要求活动项ID存在于`seenIdentities`，没有证明活动项仍是首次接受的同一事件；错误调用方可在保留相同ID时改变标题、Cue、攻防身份或其他反馈内容。状态校验也没有拒绝活动项tick晚于状态tick、已经在状态tick过期，以及活动项或seen集合顺序漂移。

当前每个活动项都必须与首次接受身份的tick、sequence和完整fingerprint逐项闭合；`expiresAtTick`必须精确等于事件tick加既有normal/strong/warning语义寿命，活动项必须不晚于状态tick且在该tick严格未过期，活动项与seen身份都维持创建时的稳定顺序。任一漂移在合并新RenderModel、生成可见项或调用音画端口前失败关闭。该批不新增队列字段、容量、Cue、页面、资产、Authority或战斗状态，不改变正常队列时序；源码与延期反证已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzg 命中反馈首次可见时一次性读屏播报（2026-08-16，代码已写、未运行）

Feedback Queue原来只播报“本帧首次接受且立刻可见”的反馈。三个终局槽同时占满时，本地命中可以被正确保留但暂时隐藏；等终局项过期后它虽然第一次进入画面，读屏却不会收到任何提示。

当前seen身份增加Presentation内部`announced`水位，新身份从未播报开始；每帧完成既有三槽取舍后，仅把第一次真正进入可见槽的标题写入`liveAnnouncements`并原子标记已播报。持续可见、被更高优先级反馈挤出后再次进入，或调用方重复送入同一事件，都不会重复播报；首次接收但始终不可见的反馈也不会制造画面外读屏噪声。该字段不进入Profile、Authority、Replay或持久存档，不改变3条可见、12条保留、8路声音、VFX、Cue、寿命、命中或优先级；源码与延期反证已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzh 命中反馈身份与玩家偏好解耦（2026-08-16，代码已写、未运行）

Feedback RenderModel原来把`音效开启`直接投影成Cue或null，把`减少动态效果`直接投影成standard/static，并把这两个结果写入事件指纹和活动队列。玩家在反馈仍保留时切换设置，同一权威事件可能被误判为身份漂移；已经出现的动态特效也不会立即服从新开启的减少动态效果。

当前RenderModel始终保留事件基础音频Cue和稳定standard视觉身份，Queue只在本帧输出边界应用偏好：静音直接抑制本批一次性声音，重新开音不会补播已经接收的旧事件；减少动态效果把所有当前可见项投影为static。Effect Consumer检测活动视觉从standard到static的单向收紧，先移除动态实例、再用同一事件身份建立零粒子静态结果；之后关闭减少动态效果也不让旧命中重新播放。该批不改Authority、事件、声音资产、音量、Cue、VFX上限、命中、优先级、页面或输入，不增加第二套效果身份；源码与延期反证已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzi HUD反馈声音即时静音（2026-08-16，代码已写、未运行）

P6.549已经阻止静音后产生新的反馈声音，但Effect Consumer只看到空的one-shot列表，无法区分“本帧没有声音事件”和“玩家刚刚静音”，因此此前已经交给HUD音频端口播放的命中声仍可能继续响完。

当前Queue Projection显式携带同一RenderModel的`soundEnabled`快照；Consumer把它纳入同revision指纹并拒绝“静音但仍携带声音命令”的不闭合投影。偏好变为关闭且Consumer仍拥有HUD声音时，先同步执行既有`stopAll`并闭合外部所有权，再继续视觉更新；重新开启只改变偏好水位，不补播`consumedAudioIds`中的旧事件。若之后出现全新事件，播放前重新建立未停止的音频所有权，epoch切换、失败和销毁仍能正常清理。该批不触碰音乐/环境音总线，不改音量、Cue、资产、8 voice上限、Authority、命中、页面或输入；源码与延期反证已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzj 结算页显示武器收藏总数与剩余距离（2026-08-16，代码已写、未运行）

结果页原`earned-progress`已经显示本局武器主研究+1、当前武器进度、下一熟悉阶段和全武器主研究总量，但普通未收藏武器没有直接说明“离加入收藏还差多少”，完整目录收藏数也只在恰好收藏成功的那一局出现。玩家需要在120次长期循环中自行换算，削弱每局完成后的成长确认。

当前每次有效武器主研究回执都从结算后同一Profile读取完整目录收藏数量，并在既有紧凑文案末尾追加“收藏N/总数”；当前武器尚未收藏时，再以`collectionEvidenceTarget - useCount`显示“距收藏N次”，读屏明确这是理论至少还需的有效主研究局数，不承诺自然局数或时间。已收藏但主研究未完成的导入档案只显示已收藏总数，不伪造剩余收藏距离；达到收藏边界的本局继续沿既有新收藏回执显示精确身份。该批不新增页面、字段、按钮、任务、奖励、Profile字段、计数器或战力，不改变120点阈值和200小时校准口径；源码与延期测试已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### P5.3zzzzzzk 首页下一目标显示武器收藏旅程（2026-08-16，代码已写、未运行）

P6.551已经让玩家在结算后看到本局研究对收藏旅程的影响，但离开结果页回到首页后，原`next-goal`仍只显示当前进度/目标，玩家仍需自行计算离收藏还差多少，也看不到完整武器目录已收藏数量。

当前首页只在权威唯一下一目标为`collect-weapon`时，从同一次已验证Profile和Definition显示当前研究阶段、下一阶段及理论最少有效主研究局数；未收藏武器再把`targetProgress - currentProgress`追加为“距收藏N次”，已收藏但主研究未满的导入档案改为“已收藏”，两者都显示完整目录“收藏N/总数”。读屏明确两个距离都是理论至少需要的有效主研究局数。正向剩余距离、目录总数、目标武器拥有状态和收藏上下界在发布前失败关闭。结果页继续由P6.551的`earned-progress`单点承载本局收藏距离，结果`next-goal`不重复；武器详情和地图详情继续使用原范围文案。范围完成与完整目录复练文案也不受影响。该批不新增页面、字段、按钮、任务、奖励、Profile、计数器、战力或Authority，不改120点和200小时口径；源码与延期测试已写未运行，状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

批次治理记录：范围限共享GLTF/平台纹理加载器、GLTF与程序化角色/装备View/Factory及骨架/装备Builder、动画Controller、CharacterViewRuntime、Three资源租约、SurfaceView/Registry、Character/Equipment Registry、Greybox Effects Pool、ArenaWorldStage、ArenaHudLayer、Greybox Renderer与WebGL Renderer/Context原始候选、正式Arena V2 GLTF View/Factory、Three资产Preloader、Three Stage、正式地面武器候选、Web Match Host、Playable Composition与键盘/指针Driver/Input完整构造/运行终态Owner、A6.11a及五个既有默认创建点；前置条件为批准账本仍为0项可运行且默认入口关闭；行为映射保持原路径候选、LoadingManager计数、GLTF lease、角色Definition、换装身份、Stage/HUD场景结构、WebGL attributes、平台/特效视觉内容和注入端口语义，只新增取消/销毁/绑定/解绑/平台与GLTF外部回调重入/Renderer、Stage、HUD、Stage子Registry/Effects、Character Runtime、程序化/GLTF/正式Character View/Factory与Preloader及Three资源租约清理反调与同步门/itemStart回滚/候选scene与租约构造清理Owner/纹理Handler首用注册Owner/Factory与底层默认Loader构造前置校验/Surface、Effects、HUD、动态Character Runtime、动态/正式地面装备与程序化/GLTF角色持武器子构造债务/WebGL Renderer与Context原始候选/Stage、Web Host、Composition及Renderer构造债务Owner/有类型边界的正式GLTF角色结构失败兜底/角色换装候选清理Owner/正式与程序化View、骨架Builder及动画Controller构造清理债务Factory Owner/GLTF终态反调/完成/错误确认水位；主要风险是宿主Context不提供标准丢失扩展时只能按无显式释放能力处理、宿主图片属性绑定同步反调、回调解绑部分失败、多信号冲突、平台或GLTF外部回调公开load重入、异步结果被重入拒绝遗弃、候选租约构造失败后scene遗失、Handler部分注册或Factory/底层默认Loader创建后构造失败导致Owner丢失、已加载但结构无效的角色模型阻断开局、兜底误吞Definition或动作配置错误、旧装备和新候选同时清理失败后候选遗失、正式View构造回滚失败后错误对象与共享模板提前失联、程序化Builder部分资源或完整骨架/装备与租约建立之间失去Owner、动画Mixer构造回滚失败后子债务失联、itemStart部分提交、无效/迟到scene清理失败、removeHandler/候选dispose销毁反调、Manager清理部分失败、成功/错误回调失败、非Error抛出和调用方/默认loader所有权混淆；验证按用户要求统一顺延且本批未执行测试、类型检查、构建、压力、性能或设备验证；回滚点为P5.3zzzwm–P5.3zzzyh源码与文档增量，不能回滚或恢复历史旧产品入口。

P5.3zzzzzk治理追加：本批范围扩展到信息Binding、角色/收藏预览Surface、本地权威Host链、Registry-backed Owner、信息DOM/Canvas、正式Pointer Surface、隔离正式Web入口、HUD Canvas、角色选择预览Render/Mount、收藏预览Surface Host/Mount/Page Transaction、资源执行Composition、释放前证明、Lease Owner终态与epoch切换、惰性GLTF Adapter、正式VFX、WebAudio、角色/武器首屏可读性终态、KZ路线地图变换终态、收藏多槽渲染临时Yaw终态、正式地图环境与相机终态水位、A6.14 Host/角色预览Render Surface未发布上送、双预览Renderer/Canvas水位、操作可用性跨字段清理、Pointer构造DOM债务、Formal Web主容器所有权转移、Resize、Pointer、键盘输入与可见性监听器潜在Owner/债务、Voice ended监听、Frame token、收藏结算重绘取消、Surface失败全层关闭、正式入口脱离异步Owner接管及两层代际绑定、生存三实体供给信息对齐、Playable失败停机首因保留、Audio fetch、VFX图片、开局与收藏GLB主体读取取消Owner、Context关闭结果/提交失败分域、Match Host终态续接兜底、VFX/预览/材质/路线构造债务边界、本地匿名留存默认策略、静态容量与当前页面真实武器研究节奏只读校准，以及正式目标级受击停顿冲量分级；验证仍按用户要求全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzk源码与文档增量。

P5.3zzzzzl治理追加：范围增加HUD反馈攻防双身份、Queue/Consumer不可改闭包、武器与徒手VFX权威身份复核，以及Formal Three攻击者1 tick接触确认；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzl源码与文档增量。

P5.3zzzzzm治理追加：范围增加未接默认面的VFX候选端口、V1专属解析结果的攻防身份保真、完整命令指纹与一次性派发边界；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzm源码与文档增量。

P5.3zzzzzn治理追加：范围增加Formal Web入口页面级研究节奏Token、Composition代际注入、匿名主体/Profile/Definition兼容性复核与只读校准承接；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzn源码与文档增量。

P5.3zzzzzo治理追加：范围增加研究节奏窗口的Learning Profile Definition内容哈希字段、窗口身份重算与页面Token逐代哈希闭合；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzo源码与文档增量。

P5.3zzzzzp治理追加：范围增加留存身份160字符共享常量及Observation、Offline Journal、研究节奏窗口三处消费闭合；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzp源码与文档增量。

P5.3zzzzzq治理追加：范围增加长期武器研究节奏基线Store、Formal Web构造/终态Owner接线、匿名身份孤儿保护，以及Offline Journal/长期Store独立租约holder；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzq源码与文档增量。

P5.3zzzzzr治理追加：范围增加长期基线Checkpoint、连续结算紧凑累计、Journal尾部淘汰后的同公式投影、信息页增量同步和持久失败后的本页窗口降级；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzr源码与文档增量。

P5.3zzzzzs治理追加：范围增加共享目录主研究点投影、长期基线全集完成revision、完成后紧凑证据冻结、当前/证据双revision公开读取，以及页面降级路径完成边界失败关闭；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzs源码与文档增量。

P5.3zzzzzt治理追加：范围增加零主研究点基线判定、实际全集完成小时、实际200小时差值/达标结果和四态证据原因；验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzt源码与文档增量。

P5.3zzzzzu治理追加：范围增加HUD拥挤时本地武器可见槽保留、终局槽不可替换和被替换高优先级项的有界声音保留；可见3条、保留12条、声音8条和全部VFX/Authority预算不变。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzu源码与文档增量。

P5.3zzzzzv治理追加：范围增加完整目录终态下基于既有三模式`playCount`的最少游玩模式建议、固定平局顺序和原`record-type`字段复用；不新增Profile字段、页面、按钮、奖励、任务、自动选择或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzv源码与文档增量。

P5.3zzzzzw治理追加：范围增加两图全部路线理解后的Profile revision按当前可用武器跨度切换地图、唯一地图卡片复练标记和未完成路线优先保护；不新增Profile字段、地图计数、随机、页面、按钮、奖励、任务、自动选择或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzw源码与文档增量。

P5.3zzzzzx治理追加：范围增加20武器主研究、收藏与五情境全闭合后的Profile revision模当前可用武器目录轮转、唯一武器卡片复练标记、不可用武器排除及未完成研究优先保护；不新增Profile字段、武器计数、随机、页面、按钮、奖励、任务、自动装备或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzx源码与文档增量。

P5.3zzzzzy治理追加：范围增加完整目录权威目标复核、最少游玩模式与武器/地图混合进位轮转、不可用内容排除、首页原`next-goal`字段复用及生存条件拾取文案；不新增Profile字段、持久轮转、随机、页面、按钮、奖励、任务、自动选择、自动装备或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzy源码与文档增量。

P5.3zzzzzz治理追加：范围增加结算后同快照完整目录组合重算、结果页原`next-goal`字段复用及与`earned-progress`开局回执的分字段接力；不改变结果主决策，不新增页面、字段、按钮、Profile、持久轮转、随机、奖励、任务、自动选择、自动装备或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzz源码与文档增量。

P5.3zzzzzza治理追加：范围增加完整目录显式“下一目标”组合路由、点击时同Profile/goal/可用范围重算、模式确认页停点、生存不预装武器及当前开放范围完成回首页保护；不改变默认复玩，不新增页面、按钮、字段、Profile、任务、奖励、持久轮转、随机或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzza源码与文档增量。

P5.3zzzzzzb治理追加：范围增加完整目录复练组合在原`next-goal`文案中的确定性周期位置提示；位置只由已验证武器/地图序号计算，不新增Profile字段、计数器、持久轮转、页面、按钮、奖励、任务、导航或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzb源码与文档增量。

P5.3zzzzzzc治理追加：范围增加Presentation对复练武器/地图轮转序号与同一Profile revision的反向闭合，范围合法但身份漂移时在生成文案前失败关闭；不新增推荐算法、页面、字段、按钮、Profile、计数器、存档、奖励、任务、随机、导航或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzc源码与文档增量。

P5.3zzzzzzd治理追加：范围增加首页同批次完整目录组合读取、原主按钮周期文案、点击时完整组合身份重算复核、既有模式确认页预选和续玩回执接力；生存不预装武器，当前开放范围完成保留自由选择。不新增页面、字段、按钮、Profile、计数器、存档、任务、奖励、随机、自动开局或Authority写入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzd源码与文档增量。

P5.3zzzzzze治理追加：范围增加本地武器可见槽对权威Action身份的前置要求、`movement-fall`排除、结果性接触优先于攻击未命中的确定性取舍，以及无结果性接触时挥空仍可见的保护；终局不可替换、3条可见、12条保留、8路声音和VFX预算不变。不改权威事件、命中、击退、动作、数值、页面、资产或Authority。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzze源码与文档增量。

P5.3zzzzzzf治理追加：范围增加Feedback Queue上一帧活动项与首次接受完整指纹、既有语义寿命精确expiry、状态tick、严格未过期水位和稳定活动/seen顺序闭合；漂移在任何新可见项或音画调用前失败关闭。不新增状态字段、容量、Cue、页面、资产、Authority或战斗规则。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzf源码与文档增量。

P5.3zzzzzzg治理追加：范围增加Feedback Queue seen身份的Presentation内部一次性播报水位，以及保留反馈首次真正进入既有可见槽时的读屏播报；不可见不播报，持续可见或离场重入不重复。不改Profile、Authority、Replay、持久存档、队列容量、Cue、VFX、声音、命中或优先级。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzg源码与文档增量。

P5.3zzzzzzh治理追加：范围增加基础反馈Cue/动作身份与静音、减少动态效果的分离，Queue输出边界静音与static投影，以及Effect Consumer对活动视觉standard→static的同身份单向替换；重新开音不补播、放宽动态偏好不重播旧特效。不改Authority、事件、资产、音量、Cue、VFX容量、命中、优先级、页面或输入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzh源码与文档增量。

P5.3zzzzzzi治理追加：范围增加Queue Projection声音偏好事实、静音投影声音命令互斥、Effect Consumer对已持有HUD声音的即时stopAll，以及重新播放新事件前音频清理所有权复位。旧声音不补播，不触碰音乐/环境音总线、音量、Cue、资产、8 voice上限、Authority、命中、页面或输入。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzi源码与文档增量。

P5.3zzzzzzj治理追加：范围增加结果页既有`earned-progress`中完整武器目录收藏数和当前未收藏武器理论剩余有效主研究局数；来源只使用结算后Profile与Definition阈值，已收藏武器不显示剩余距离。不新增页面、字段、按钮、任务、奖励、Profile、计数器、战力或Authority，不改120点与200小时口径。验证继续全部顺延，回滚点扩展为P5.3zzzwm–P5.3zzzzzzj源码与文档增量。

## 11. 回滚点

P5候选集中在`packages/arena-product-presentation/src/arena-v2-*`、`packages/arena-product-content/src/arena-v2-information-content-*`、`packages/arena-product-composition/src/arena-v2-*-candidate-v1.ts`及隔离的三模式顶层owner、对应待执行测试和本台账。组合候选虽从包级index导出，但没有默认生产接线；若接口需重做，可整体撤销候选导出和隔离组合，不影响当前Arena V1生产UI、默认MatchCore组合或三端入口。
