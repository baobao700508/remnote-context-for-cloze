import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';


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

async function collectContext(plugin: any, anchor: any, maxDepth: number, maxNodes: number, excludeChildId?: string) {
  const items: { id: string; depth: number; text: string }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      if (depth === 1 && excludeChildId && ch._id === excludeChildId) continue; // 排除当前分支
      const str = await plugin.richText.toString(ch.text || []);
      items.push({ id: ch._id, depth, text: ClozeMask(str || '') });
      count++;
      await dfs(ch, depth + 1);
    }
  }
  await dfs(anchor, 1);
  return items;
}

async function getPathFromAnchorToCurrent(plugin: any, anchorId: string, currentId: string) {
  const path: string[] = [];
  const seen = new Set<string>();
  let cur = await plugin.rem.findOne(currentId);
  while (cur && cur._id !== anchorId && !seen.has(cur._id)) {
    seen.add(cur._id);
    path.push(cur._id);
    cur = cur.parent ? await plugin.rem.findOne(cur.parent) : null;
  }
  if (cur?._id !== anchorId) return [];
  path.push(anchorId);
  return path.reverse();
}

function Widget() {
  const plugin = usePlugin();
  const ctx = useRunAsync(async () => await plugin.widget.getWidgetContext(), []) as Ctx | undefined;
  const debug = useRunAsync(async () => !!(await plugin.settings.getSetting('debug')), []);


  const answerMode = useRunAsync(async () => (await plugin.settings.getSetting('answerMode')) ?? 'continue', []);

  const { items } = useRunAsync(async () => {
    try {
      console.log('[CFC][A] ctx', ctx, 'mode', answerMode);
      if (!ctx?.remId) return { items: [] as { id: string; depth: number; text: string }[] };
      if (!ctx?.revealed) return { items: [] };
      if (answerMode === 'questionOnly') return { items: [] };
      const anchor = await getNearestAnchor(plugin, ctx.remId);
      console.log('[CFC][A] anchor', anchor?._id || 'none');
      if (!anchor) return { items: [] };
      let maxDepth = Number((await plugin.settings.getSetting('maxDepth')) ?? 3);
      let maxNodes = Number((await plugin.settings.getSetting('maxNodes')) ?? 100);
      if (answerMode === 'full') { maxDepth = 999; maxNodes = 10000; }
      const path = await getPathFromAnchorToCurrent(plugin, anchor._id, ctx.remId);
      const excludeChildId = path.length > 1 ? path[1] : undefined;
      const items = await collectContext(plugin, anchor, maxDepth, maxNodes, excludeChildId);
      console.log('[CFC][A] items', items.length);
      return { items };
    } catch (e) {
      console.error('[CFC][A] error', e);
      return { items: [] };
    }
  }, [ctx?.remId, answerMode]) || { items: [] } as any;

  // Only show on answer (back) phase
  if (!ctx?.revealed) return null;

  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  return (
    <div className="cfc-container">
      <ul className="cfc-list">
        {items.map((it: { id: string; depth: number; text: string }) => (
          <li key={it.id} className="cfc-item" style={{ paddingLeft: `${(it.depth-1)*16}px` }}>{it.text}</li>
        ))}
      </ul>
    </div>
  );
}

renderWidget(Widget);

