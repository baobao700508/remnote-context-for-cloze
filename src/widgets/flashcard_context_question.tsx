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
      // 继续向下，以便获取路径节点的“其他子分支”
      await dfs(ch, depth + 1, isPathChild ? pathIndex + 1 : pathIndex);
    }
  }
  // 从 anchor 开始，深度=0，且不输出 anchor 本身
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
  const rootRef = React.useRef<HTMLDivElement>(null);
  const plugin = usePlugin();
  const ctx = useRunAsync(async () => await plugin.widget.getWidgetContext(), []) as Ctx | undefined;
  const debug = useRunAsync(async () => !!(await plugin.settings.getSetting('debug')), []);

  // 统一 hooks 顺序：不在此处提前 return；在后面再做 gating
  const { items } = useRunAsync(async () => {
    try {
      console.log('[CFC][Q] ctx', ctx);
      if (!ctx?.remId || ctx?.revealed) return { items: [] as { id: string; depth: number; text: string }[] };
      const anchor = await getNearestAnchor(plugin, ctx.remId);
      console.log('[CFC][Q] anchor', anchor?._id || 'none');
      if (!anchor) return { items: [] };
      const maxDepth = (await plugin.settings.getSetting('maxDepth')) ?? 3;
      const maxNodes = (await plugin.settings.getSetting('maxNodes')) ?? 100;
      const path = await getPathFromAnchorToCurrent(plugin, anchor._id, ctx.remId);
      const items = await collectContextByPathExclusion(plugin, anchor, path, Number(maxDepth), Number(maxNodes));
      console.log('[CFC][Q] path.len', path.length, 'items', items.length);
      return { items };
    } catch (e) {
      console.error('[CFC][Q] error', e);
      return { items: [] };
    }
  }, [ctx?.remId]) || { items: [] } as any;

  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  React.useEffect(() => {
    if (rootRef.current) {
      const w = rootRef.current.clientWidth;
      console.log('[CFC][Q] width] root', w, 'iframe', window.innerWidth);
    }
  }, [items.length]);
  // gating: 
  if (ctx?.revealed) return null;
  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  return (
    <div ref={rootRef} className="cfc-container" style={{ width: '100%', display: 'block', boxSizing: 'border-box', minWidth: 0, maxWidth: '100%' }}>
      <ul className="cfc-list" style={{ listStyle: 'none', margin: 0, paddingLeft: 0, width: '100%' }}>
        {items.map((it: { id: string; depth: number; text: string }) => (
          <li key={it.id} className="cfc-item" style={{ paddingLeft: `${Math.max(0, it.depth)*16}px`, whiteSpace: 'normal', wordBreak: 'break-word' }}>{it.text}</li>
        ))}
      </ul>
    </div>
  );
}

renderWidget(Widget);

