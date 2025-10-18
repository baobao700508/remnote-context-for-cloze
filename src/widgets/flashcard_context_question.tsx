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
      const items = await collectFullTree(plugin, anchor, maskId || ctx.remId, maxDepth, maxNodes);
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
  const renderCFCText = (text: string) => {
    if (text === '[?]') {
      return (
        <span style={{
          display: 'inline-block', padding: '0 10px', borderRadius: 8,
          background: 'var(--rn-clr-accent-muted, rgba(56,139,253,0.15))',
          color: 'var(--rn-clr-accent, #0969da)', lineHeight: 1.45,
          border: '1px solid rgba(56,139,253,0.25)'
        }}>?</span>
      );
    }
    if (typeof text === 'string' && text.includes('[…]')) {
      const parts = text.split('[…]');
      const nodes: React.ReactNode[] = [];
      parts.forEach((p, i) => {
        if (p) nodes.push(<span key={`t-${i}`}>{p}</span>);
        if (i < parts.length - 1) nodes.push(
          <span key={`om-${i}`} style={{
            display: 'inline-block', padding: '0 10px', borderRadius: 8,
            background: 'var(--rn-clr-warning-muted, rgba(255,212,0,0.15))',
            color: 'var(--rn-clr-warning, #b58900)', lineHeight: 1.45,
            border: '1px solid rgba(255,212,0,0.3)'
          }}>…</span>
        );
      });
      return nodes;
    }
    return text as any;
  };

  // gating (after all hooks):
  if (ctx?.revealed) return null;
  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  return (
    <div ref={rootRef} className="cfc-container" style={{ width: '100%', display: 'block', boxSizing: 'border-box', minWidth: 0, maxWidth: '100%', borderTop: '1px solid var(--rn-clr-border, #e4e8ef)', paddingTop: 6, overflow: 'visible' }}>
      <ul className="cfc-list" style={{ listStyle: 'disc', listStylePosition: 'outside', margin: 0, paddingLeft: 20, paddingBottom: 8, width: '100%', fontSize: '1rem' }}>
        {items.map((it: { id: string; depth: number; text: string }) => (
          <li key={it.id} className="cfc-item" style={{ marginLeft: `${Math.max(0, it.depth)*24}px`, padding: '2px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {renderCFCText(it.text)}
          </li>
        ))}
      </ul>
    </div>
  );
}

renderWidget(Widget);

