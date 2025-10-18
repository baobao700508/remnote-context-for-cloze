import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation, SelectionType } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';

const POW_CODE = 'contextForCloze';

async function onActivate(plugin: ReactRNPlugin) {
  // 设置项
  await plugin.settings.registerNumberSetting({ id: 'maxDepth', title: 'Max Depth', description: '最大递归深度', defaultValue: 3 });
  await plugin.settings.registerNumberSetting({ id: 'maxNodes', title: 'Max Nodes', description: '节点数量上限', defaultValue: 100 });
  await plugin.settings.registerDropdownSetting({
    id: 'answerMode', title: 'Answer Stage', description: '答案阶段显示策略', defaultValue: 'continue',
    options: [
      { key: 'questionOnly', label: '题面阶段显示，答案阶段不显示', value: 'questionOnly' },
      { key: 'continue', label: '答案阶段继续显示（同题面）', value: 'continue' },
      { key: 'full', label: '答案阶段显示完整上下文（忽略裁剪）', value: 'full' },
    ],
  });
  await plugin.settings.registerBooleanSetting({ id: 'debug', title: 'Debug Mode', description: '启用调试（控制台日志与占位提示）', defaultValue: false });
  await plugin.app.toast('Context for Cloze activated');
  console.log('[CFC] Plugin activated');

  // Power-Up
  await plugin.app.registerPowerup({ name: 'Context for Cloze', code: POW_CODE, description: '为 Cloze 复习提供邻近上下文（显示层）', options: { slots: [] } });

  // 命令：为选中 Rem 添加 Power-Up（支持多选）
  const runAddPowerupCommand = async (powerup: string) => {
    const sel = await plugin.editor.getSelection();
    if (!sel?.type) return;
    if (sel.type === SelectionType.Rem) {
      const rems = (await plugin.rem.findMany(sel.remIds)) || [];
      await Promise.all(rems.map(r => r.addPowerup(powerup)));
    } else {
      const rem = await plugin.rem.findOne(sel.remId);
      await rem?.addPowerup(powerup);
    }
    await plugin.app.toast('已添加 Context for Cloze 标记');
  };

  await plugin.app.registerCommand({ id: 'add-context-for-cloze', name: 'Add Context for Cloze', quickCode: 'cfc', action: async () => runAddPowerupCommand(POW_CODE) });

  await plugin.app.registerCommand({ id: 'cfc-debug', name: 'CFC: Debug Probe', quickCode: 'cfcdbg', action: async () => {
    try {
      const sel = await plugin.editor.getSelection();
      const remId = sel?.type === SelectionType.Rem ? sel.remIds?.[0] : sel?.remId;
      let msg = '[CFC][Debug]';
      msg += ` remId=${remId || 'none'}`;
      if (remId) {
        const power = await plugin.powerup.getPowerupByCode(POW_CODE);
        const anchors = power ? await power.taggedRem() : [];
        const set = new Set((anchors||[]).map((r:any)=>r._id));
        let cur = await plugin.rem.findOne(remId);
        let anchor:any = null;
        while (cur?.parent) {
          const p = await plugin.rem.findOne(cur.parent);
          if (!p) break;
          if (set.has(p._id)) { anchor = p; break; }
          cur = p;
        }
        msg += ` anchor=${anchor?._id || 'none'}`;
      }
      const answerMode = await plugin.settings.getSetting('answerMode');
      const debug = await plugin.settings.getSetting('debug');
      msg += ` answerMode=${answerMode}; debug=${!!debug}`;
      await plugin.app.toast(msg);
      console.log(msg);
    } catch (e) {
      console.error('[CFC][Debug] error', e);
      await plugin.app.toast('CFC Debug Error - see console');
    }
  }});

  // Widget（题面与答案）
  // 统一挂载到 FlashcardUnder（不覆盖原生主区域；题面/答案阶段由组件 gating 控制显示）
  await plugin.app.registerWidget('flashcard_context_question', WidgetLocation.FlashcardUnder, { dimensions: { height: 'auto', width: '100%' } });
  await plugin.app.registerWidget('flashcard_context_answer',   WidgetLocation.FlashcardUnder, { dimensions: { height: 'auto', width: '100%' } });

  // CSS：仅队列内显示，编辑态隐藏，贴近原生
  await plugin.app.registerCSS('cfc-queue-scope', `
    /* 仅在复习队列内显示 */
    .rn-queue__content .cfc-container { margin: 6px 0 0; padding: 0; font-size: 0.92rem; line-height: 1.45; color: var(--rn-clr-text, #1f2328); }
    .rn-queue__content .cfc-title { display: none; color: var(--rn-clr-text-secondary, #57606a); font-weight: 600; margin-bottom: 4px; }
    .rn-queue__content .rn-dialog .cfc-container { display: none !important; }

    /* 列表与条目样式，避免默认圆点与过大缩进 */
    .rn-queue__content .cfc-list { list-style: none; margin: 0; padding-left: 0; }
    .rn-queue__content .cfc-item { margin: 5px 0; white-space: pre-wrap; }

    /* 原生风格树形连线：行距与容器（连线由组件内联实现，CSS 仅负责布局） */
    .rn-queue__content .cfc-list > li.cfc-item.rnmm-row { margin: 4px 0 !important; padding: 0; }
    .rn-queue__content .rnmm-row { display: flex; align-items: stretch; }
    .rn-queue__content .rnmm-branch { width: 28px; position: relative; flex: 0 0 28px; min-height: 1.45em; }
    /* 当使用内联连线时，禁用伪元素以避免重复渲染 */
    .rn-queue__content .rnmm-inline .rnmm-branch::before,
    .rn-queue__content .rnmm-inline .rnmm-branch::after { content: none !important; display: none !important; }
    .rn-queue__content .rnmm-node { display: inline-block; line-height: 1.45; white-space: normal; word-break: break-word; }
  `);
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);

