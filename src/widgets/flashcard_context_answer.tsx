import { renderWidget, usePlugin, useRunAsync, useWidgetContext } from '@remnote/plugin-sdk';

const POW_CODE = 'contextForCloze';

type Ctx = { remId?: string; revealed?: boolean };

const ClozeMask = (s: string) => s.replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, '[…]');

async function getNearestAnchor(plugin: any, remId: string) {
  const power = await plugin.powerup.getPowerupByCode(POW_CODE);
  if (!power) return null;
  const anchors = await power.taggedRem();
  const set = new Set((anchors||[]).map((r: any) => r._id));
  let cur = await plugin.rem.findOne(remId);
  while (cur?.parent) {
    const p = await plugin.rem.findOne(cur.parent);
    if (!p) break;
    if (set.has(p._id)) return p;
    cur = p;
  }
  return null;
}

async function collectContext(plugin: any, anchor: any, maxDepth: number, maxNodes: number) {
  const items: { id: string; depth: number; text: string }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      const str = await plugin.richText.toString(ch.text || []);
      items.push({ id: ch._id, depth, text: ClozeMask(str || '') });
      count++;
      await dfs(ch, depth + 1);
    }
  }
  await dfs(anchor, 1);
  return items;
}

function Widget() {
  const plugin = usePlugin();
  const ctx = useWidgetContext() as Ctx;

  const answerMode = useRunAsync(async () => (await plugin.settings.getSetting('answerMode')) ?? 'continue', []);

  const { items } = useRunAsync(async () => {
    if (!ctx?.remId) return { items: [] as { id: string; depth: number; text: string }[] };
    if (answerMode === 'questionOnly') return { items: [] };
    const anchor = await getNearestAnchor(plugin, ctx.remId);
    if (!anchor) return { items: [] };
    let maxDepth = Number((await plugin.settings.getSetting('maxDepth')) ?? 3);
    let maxNodes = Number((await plugin.settings.getSetting('maxNodes')) ?? 100);
    if (answerMode === 'full') { maxDepth = 999; maxNodes = 10000; }
    const items = await collectContext(plugin, anchor, maxDepth, maxNodes);
    return { items };
  }, [ctx?.remId, answerMode]) || { items: [] } as any;

  if (!items.length) return null;
  return (
    <div className="cfc-container">
      <div className="cfc-title">Context</div>
      <ul className="cfc-list">
        {items.map((it) => (
          <li key={it.id} className="cfc-item" style={{ paddingLeft: `${(it.depth-1)*16}px` }}>{it.text}</li>
        ))}
      </ul>
    </div>
  );
}

renderWidget(Widget);

