# Context for Cloze — 用户指南

让你在复习时，快速看清“当前卡片在知识结构中的位置”。本插件在复习队列中，于卡片下方显示一棵简洁的“上下文树”，帮助定位、联想与回顾；不更改卡片内容与复习调度。

## 功能介绍
- Context for Cloze（核心功能）
  - 在某个 Rem 上添加 Power‑Up“Context for Cloze”后（code：`contextForCloze`），该 Rem 的所有子代在复习成为题卡时，卡片下方会显示以该 Rem 为根的“上下文树”。
  - 题面阶段：上下文照常显示，但会避免泄露 cloze（填空）答案线索。
  - 答案阶段：继续显示上下文；被“揭示”的 cloze 以蓝色下划线和浅蓝背景作提示，便于对照与回顾。
- Context Hide All Test One（显示策略辅助）
  - 通过给 Rem 添加 Power‑Up“Context Hide All Test One”（code：`contextHideAllTestOne`），可调整“上下文树中其他行的 cloze 显示逻辑”（显示原文或以省略号遮挡）。
  - 适合在希望更严格防止提示泄露或需要完整回看原文的场景间切换。
- 为 Rem 添加 Power‑Up 的方式
  - 命令：
    - Add Context for Cloze（快速码 `cfc`）
    - Add Context Hide All Test One（快速码 `cfcnohide`）
  - 支持对多选 Rem 一次性添加。

## 与 RemNote 官方“Hide in Queue”兼容性
插件与 RemNote 官方“Hide in Queue”插件的三种 power‑up 完整适配：
- Hide in Queue（`hideInQueue`）
  - 在上下文树中显示占位文字“Hidden in queue”，以指示该条目在复习中被隐藏。
- Remove from Queue（`removeFromQueue`）
  - 在上下文树中完全移除此条目（题面/答案均不显示）。
- No Hierarchy（`noHierarchy`）
  - 当前题目带此标记时，上下文区域仅显示“当前题目这一行”，不显示祖先/兄弟/子孙，以保持与原生一致。

## 配置项说明（Settings → Plugins → 本插件）
- Max Depth（默认 3）
  - 限制上下文树的最大层级深度。层级较深、信息量较大时，可适当减小以提升可读性。
- Max Nodes（默认 100）
  - 限制上下文树的最多节点数量。层级分支较多时，可适当减小以避免信息过载。
- Debug Mode（默认关闭）
  - 在界面与控制台输出更多提示，便于排查（一般用户可保持关闭）。

## 使用方法
1. 选择一个 Rem 作为“上下文锚点”，为其添加 Power‑Up“Context for Cloze”（`contextForCloze`）。
2. 开始复习：当该锚点的任意子代成为题卡时，卡片下方会显示以锚点为根的“上下文树”。
3. 可选：按需为相关 Rem 添加“Context Hide All Test One”（`contextHideAllTestOne`），切换其他行 cloze 的显示/遮挡策略。
4. 如有需要，在插件设置中调整 Max Depth / Max Nodes，以获得合适的信息密度。

## 提示
- 本插件仅在“复习队列”中显示；编辑器视图不受影响。
- 若当前卡片不在任何“Context for Cloze”锚点的子树内，则不会显示上下文。
- 与 No Hierarchy（`noHierarchy`）同时使用时，上下文将仅显示当前题目一行，这是设计预期。

## 反馈
欢迎提交使用建议或问题反馈，帮助我们进一步改进上下文的呈现体验。