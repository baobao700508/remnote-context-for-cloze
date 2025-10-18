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
async function collectContextByPathExclusion(plugin: any, anchor: any, pathIds: string[], maxDepth: number, maxNodes: number) {
  const items: { id: string; depth: number; text: string }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number, pathIndex: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      const isPathChild = pathIds[pathIndex + 1] === ch._id;
      if (!isPathChild) {
        const str = await plugin.richText.toString(ch.text || []);
        items.push({ id: ch._id, depth, text: ClozeMask(str || '') });
        count++;
      }
      await dfs(ch, depth + 1, isPathChild ? pathIndex + 1 : pathIndex);
    }
  }
  await dfs(anchor, 0, 0);
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
      const items = await collectContextByPathExclusion(plugin, anchor, path, maxDepth, maxNodes);
      console.log('[CFC][A] path.len', path.length, 'items', items.length);
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
      <ul className="cfc-list" style={{ listStyle: 'none', margin: 0, paddingLeft: 0 }}>
        {items.map((it: { id: string; depth: number; text: string }) => (
          <li key={it.id} className="cfc-item" style={{ paddingLeft: `${Math.max(0, it.depth)*16}px` }}>{it.text}</li>
        ))}
      </ul>
    </div>
  );
}

renderWidget(Widget);

