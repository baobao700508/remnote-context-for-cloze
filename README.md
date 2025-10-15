# Context for Cloze (RemNote Plugin)

显示 Cloze 题面上下文（基于最近 Power-Up 祖先的子树，纯显示层）。

## 功能
- Power-Up：Context for Cloze（code: `contextForCloze`）
- 题面（Question）在 Flashcard 下方显示上下文
- 答案（Answer）可配置继续显示/完整显示/不显示
- 最近父级优先：从当前卡片 rem 向上寻找最近贴有 Power-Up 的祖先
- 作用域：从祖先的子节点开始递归（不含祖先自身）；支持 `maxDepth`、`maxNodes`
- Cloze 遮挡：用简单正则将 `{{cN::...}}` 片段遮挡为 `[…]`（不改变系统逻辑）

## 开发
- 开发：`npm run dev`（Webpack Dev Server 8080）
- RemNote 中：Settings → Plugins → Develop from localhost → 输入 `http://localhost:8080`
- 构建：`npm run build`（生成 `dist/PluginZip.zip`）

## 注意
- 如需使用“命令为选区添加 Power-Up”，manifest 需包含 Write 权限（已默认开启）。
- 首版实现对富文本到字符串的转换使用 `plugin.richText.toString(rem.text)`；
  复杂富文本（图片/LaTeX 等）会被简化为纯文本。

## 兼容性
- 工程结构与 Webpack 配置对齐官方示例（hide-in-queue/template）。

