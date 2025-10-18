import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';


const POW_CODE = 'contextForCloze';

type Ctx = { remId?: string; cardId?: string; revealed?: boolean };

const ClozeMask = (s: string) => s.replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, '[…]');

// 基于 RichText 的逐元素掩码：凡含 cloze 标记(cId)的文本元素，转为 […]
async function stringifyWithClozeMask(plugin: any, rich: any[]): Promise<string> {
  if (!Array.isArray(rich)) return '';
  const out: string[] = [];
  for (const el of rich) {
    if (typeof el === 'string') { out.push(el); continue; }
    const i = (el as any)?.i;
    if (i === 'm') {
      const hasCloze = (el as any)?.cId || (el as any)?.hiddenCloze || (el as any)?.revealedCloze;
      out.push(hasCloze ? '[…]' : ((el as any)?.text ?? ''));
    } else {
      try { out.push(await plugin.richText.toString([el])); } catch { /* noop */ }
    }
  }
  return out.join('');
}

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
async function collectFullTree(plugin: any, root: any, currentRemId: string, maxDepth: number, maxNodes: number) {
  const items: { id: string; depth: number; text: string }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    // 输出当前节点（包含 root 自身），应用占位/掩码
    const id = rem._id;
    let text = '';
    if (id === currentRemId) {
      text = '[?]';
    } else {
      // 使用 RichText 级别的 cloze mask 
      const str = await stringifyWithClozeMask(plugin, rem.text || []);
      // 兜底：若未检测到 cId 
      text = ClozeMask(str || '');
    }
    items.push({ id, depth, text });
    count++;
    if (count >= maxNodes) return;
    // 递归子节点
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      await dfs(ch, depth + 1);
    }
  }
  await dfs(root, 0);
  return items;
}

// 基于 DFS 生成“是否在各层继续画竖线”的标记，用于纯 CSS 原生风格连线
async function collectFullTreeWithLines(plugin: any, root: any, currentRemId: string, maxDepth: number, maxNodes: number) {
  const items: { id: string; depth: number; text: string; continues: boolean[] }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number, continues: boolean[]) {
    if (depth > maxDepth || count >= maxNodes) return;
    const id = rem._id;
    let text = '';
    if (id === currentRemId) {
      text = '[?]';
    } else {
      const str = await stringifyWithClozeMask(plugin, rem.text || []);
      text = ClozeMask(str || '');
    }
    items.push({ id, depth, text, continues: [...continues] });
    count++;
    if (count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    const n = children.length;
    for (let idx = 0; idx < n; idx++) {
      if (count >= maxNodes) break;
      const ch = children[idx];
      const hasNextAtThisDepth = idx < n - 1;
      await dfs(ch, depth + 1, [...continues, hasNextAtThisDepth]);
    }
  }
  await dfs(root, 0, []);
  return items;
}



// 旧的路径排除逻辑已移除

async function getCurrentCardRemId(plugin: any, ctx: Ctx | undefined) {
  if (ctx?.cardId) {
    try {
      const card = await plugin.card.findOne(ctx.cardId);
      if (card) {
        // Prefer direct field if available, fallback to getRem()
        const rem = await card.getRem();
        if (rem?._id) return rem._id;
        // @ts-ignore
        if ((card as any).remId) return (card as any).remId;
      }
    } catch {}
  }
  return ctx?.remId;
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
      const maskId = await getCurrentCardRemId(plugin, ctx);
      const anchor = await getNearestAnchor(plugin, maskId || ctx.remId);
      console.log('[CFC][Q] anchor', anchor?._id || 'none');
      if (!anchor) return { items: [] };
      const maxDepth = 999; // 全树展示
      const maxNodes = 10000;
      const items = await collectFullTreeWithLines(plugin, anchor, maskId || ctx.remId, maxDepth, maxNodes);
      console.log('[CFC][Q] items', items.length, 'mask target', maskId || ctx.remId);
      return { items };
    } catch (e) {
      console.error('[CFC][Q] error', e);
      return { items: [] };
    }
  }, [ctx?.remId]) || { items: [] } as any;

  React.useEffect(() => {
    if (rootRef.current) {
      const w = rootRef.current.clientWidth;
      console.log('[CFC][Q] width] root', w, 'iframe', window.innerWidth);
    }
  }, [items.length]);
  // gating (after all hooks):
  if (ctx?.revealed) return null;
  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  return (
    <div ref={rootRef} className="cfc-container" style={{ width: '100%', display: 'block', boxSizing: 'border-box', minWidth: 0, maxWidth: '100%' }}>
      <ul className="cfc-list rnmm-inline" style={{ listStyle: 'none', margin: 0, paddingLeft: 0, width: '100%' }}>
        {items.map((it: { id: string; depth: number; text: string; continues: boolean[] }) => (
          <li key={it.id} className="cfc-item rnmm-row" style={{ padding: '4px 0' }}>
            {Array.from({ length: Math.max(0, it.depth) }).map((_, d, arr) => {
              const isLast = d === arr.length - 1;
              const cont = it.continues[d];
              return (
                <span
                  key={d}
                  className="rnmm-branch"
                  style={{ position: 'relative', width: 28, flex: '0 0 28px', minHeight: '1.45em', display: 'inline-block' }}
                >
                  <span
                    style={{ position: 'absolute', left: 13, top: 0, bottom: cont ? 0 : '1.05em', borderLeft: '2px solid #c8d1dc' }}
                  />
                  {isLast ? (
                    <span
                      style={{ position: 'absolute', left: 13, top: '1.05em', width: 16, borderTop: '2px solid #c8d1dc' }}
                    />
                  ) : null}
                </span>
              );
            })}
            <span className="rnmm-node" style={{ lineHeight: 1.45 }}>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

renderWidget(Widget);

