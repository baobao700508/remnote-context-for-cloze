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
  await plugin.app.registerWidget('flashcard_context_question', WidgetLocation.FlashcardUnder, { dimensions: { height: 'auto', width: 'auto' } });
  await plugin.app.registerWidget('flashcard_context_answer', WidgetLocation.FlashcardAnswer, { dimensions: { height: 'auto', width: 'auto' } });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);

