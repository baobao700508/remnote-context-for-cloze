import { declareIndexPlugin, type ReactRNPlugin, WidgetLocation, SelectionType } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';

const POW_CODE = 'contextForCloze';
const POW_CODE_NOHIDE = 'contextHideAllTestOne';

async function onActivate(plugin: ReactRNPlugin) {
  // 设置项
  await plugin.settings.registerNumberSetting({ id: 'maxDepth', title: 'Max Depth', description: '最大递归深度', defaultValue: 3 });
  await plugin.settings.registerNumberSetting({ id: 'maxNodes', title: 'Max Nodes', description: '节点数量上限', defaultValue: 100 });
  await plugin.settings.registerBooleanSetting({ id: 'debug', title: 'Debug Mode', description: '启用调试（控制台日志与占位提示）', defaultValue: false });
  await plugin.app.toast('Context for Cloze activated');
  console.log('[CFC] Plugin activated');

  // Power-Up
  await plugin.app.registerPowerup({ name: 'Context for Cloze', code: POW_CODE, description: '为 Cloze 复习提供邻近上下文（显示层）', options: { slots: [] } });
  await plugin.app.registerPowerup({ name: 'Context Hide All Test One', code: POW_CODE_NOHIDE, description: '当前卡片被标记后：上下文树中不隐藏其他 Rem 的 Cloze（显示原始富文本）', options: { slots: [] } });

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
  await plugin.app.registerCommand({ id: 'add-context-hide-all-test-one', name: 'Add Context Hide All Test One', quickCode: 'cfcnohide', action: async () => runAddPowerupCommand(POW_CODE_NOHIDE) });

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
      const debug = await plugin.settings.getSetting('debug');
      msg += ` debug=${!!debug}`;
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
  const CFC_CSS = `
    /* 仅在复习队列内显示 */
    .rn-queue__content .cfc-container { margin: 6px 0 0; padding: 0; font-size: 0.92rem; line-height: 1.45; color: var(--rn-clr-text, #1f2328); }
    .rn-queue__content .cfc-title { display: none; color: var(--rn-clr-text-secondary, #57606a); font-weight: 600; margin-bottom: 4px; }
    .rn-queue__content .rn-dialog .cfc-container { display: none !important; }

    /* 列表与条目样式，避免默认圆点与过大缩进 */
    .rn-queue__content .cfc-list { list-style: none; margin: 0; padding-left: 0; }
    .rn-queue__content .cfc-item { margin: 5px 0; white-space: pre-wrap; }

    /* 黄底省略号徽标（与蓝色问号一致的尺寸/圆角/边框） */
    .rn-queue__content .cfc-omission {
      display: inline-block; padding: 0 10px; border-radius: 8px; line-height: 1.45;
      background: var(--rn-clr-warning-muted, rgba(255,212,0,0.15));
      color: var(--rn-clr-warning, #b58900);
      border: 1px solid rgba(255,212,0,0.3);
    }

    /* 被“显示出来的 cloze”条目下划线提示（仅视觉标识） */
    .rn-queue__content .cfc-revealed-cloze {
      text-decoration: underline;
      text-decoration-color: var(--rn-clr-accent, #0969da);
      text-decoration-thickness: 2px;
      text-underline-offset: 2px;
    }
  `;
  try {
    const upsertStyle = (id: string, css: string) => {
      const d = document;
      let tag = d.getElementById(id) as HTMLStyleElement | null;
      if (!tag) { tag = d.createElement('style'); tag.id = id; d.head.appendChild(tag); }
      tag.textContent = css;
    };
    upsertStyle('cfc-queue-scope', CFC_CSS);
    console.log('[CFC][CSS] injected locally (no registerCSS)');
  } catch (e) {
    console.error('[CFC][CSS] local inject failed', e);
  }
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);

