import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';


const POW_CODE = 'contextForCloze';

type Ctx = { remId?: string; cardId?: string; revealed?: boolean };

const ClozeMask = (s: string) => s.replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, '[…]');

// 基于 RichText 的逐元素掩码（HTML 版）：凡含 cloze 标记(cId)的文本元素，替换为占位符，再使用 SDK 转为 HTML
const ELLIPSIS_TOKEN = '[[[CFC_EL]]]';
async function richToHTMLWithClozeMask(plugin: any, rich: any[]): Promise<string> {
  if (!Array.isArray(rich)) return '';
  const masked: any[] = [];
  for (const el of rich) {
    if (typeof el === 'string') { masked.push(el); continue; }
    const i = (el as any)?.i;
    if (i === 'm') {
      const hasCloze = (el as any)?.cId || (el as any)?.hiddenCloze || (el as any)?.revealedCloze;
      if (hasCloze) masked.push({ i: 'm', text: ELLIPSIS_TOKEN });
      else masked.push(el);
    } else if (i === 'x') { // LaTeX
      const hasCloze = (el as any)?.cId || ((el as any)?.latexClozes && (el as any)?.latexClozes.length);
      if (hasCloze) masked.push({ i: 'm', text: ELLIPSIS_TOKEN }); else masked.push(el);
    } else {
      masked.push(el);
    }
  }
  try {
    const html = await plugin.richText.toHTML(masked);
    return html.replaceAll(ELLIPSIS_TOKEN, '<span class="cfc-omission">…</span>');
  } catch {
    // 兜底：退化为纯文本
    const s = await plugin.richText.toString(masked as any);
    return (s || '').replace(/\[\u2026\]|\[…\]/g, '<span class="cfc-omission">…</span>');
  }
}

// RichText 
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
  const items: { id: string; depth: number; html: string; isCurrent?: boolean }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    const id = rem._id;
    let html = ''; let isCurrent = false;
    if (id === currentRemId) {
      isCurrent = true;
    } else {
      html = await richToHTMLWithClozeMask(plugin, rem.text || []);
      
    }
    items.push({ id, depth, html, isCurrent });
    count++;
    if (count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      await dfs(ch, depth + 1);
    }
  }
  await dfs(root, 0);
  return items;
}


// 旧路径排除逻辑已移除

async function getCurrentCardRemId(plugin: any, ctx: Ctx | undefined) {
  if (ctx?.cardId) {
    try {
      const card = await plugin.card.findOne(ctx.cardId);
      if (card) {
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
  const plugin = usePlugin();
  const ctx = useRunAsync(async () => await plugin.widget.getWidgetContext(), []) as Ctx | undefined;
  const debug = useRunAsync(async () => !!(await plugin.settings.getSetting('debug')), []);


  const answerMode = useRunAsync(async () => (await plugin.settings.getSetting('answerMode')) ?? 'continue', []);

  const { items } = useRunAsync(async () => {
    try {
      console.log('[CFC][A] ctx', ctx, 'mode', answerMode);
      if (!ctx?.remId) return { items: [] as { id: string; depth: number; html: string; isCurrent?: boolean }[] };
      if (!ctx?.revealed) return { items: [] };
      if (answerMode === 'questionOnly') return { items: [] };
      const maskId = await getCurrentCardRemId(plugin, ctx);
      const anchor = await getNearestAnchor(plugin, maskId || ctx.remId);
      console.log('[CFC][A] anchor', anchor?._id || 'none');
      if (!anchor) return { items: [] };
      const maxDepth = 999; // 全树
      const maxNodes = 10000; // 全量上限
      const items = await collectFullTree(plugin, anchor, maskId || ctx.remId, maxDepth, maxNodes);
      console.log('[CFC][A] items', items.length, 'mask target', maskId || ctx.remId);
      return { items };
    } catch (e) {
      console.error('[CFC][A] error', e);
      return { items: [] };
    }
  }, [ctx?.remId, answerMode]) || { items: [] } as any;

  // Only show on answer (back) phase
  if (!ctx?.revealed) return null;
  const renderItem = (it: { id: string; depth: number; html: string; isCurrent?: boolean }) => {
    if (it.isCurrent) {
      return (
        <span style={{
          display: 'inline-block', padding: '0 10px', borderRadius: 8,
          background: 'var(--rn-clr-accent-muted, rgba(56,139,253,0.15))',
          color: 'var(--rn-clr-accent, #0969da)', lineHeight: 1.45,
          border: '1px solid rgba(56,139,253,0.25)'
        }}>?</span>
      );
    }
    return <span style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: it.html }} />;

    return <span style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: it.html }} /> as any;
  };


  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  return (
    <div className="cfc-container" style={{ width: '100%', borderTop: '1px solid var(--rn-clr-border, #e4e8ef)', paddingTop: 6, overflow: 'visible' }}>
      <ul className="cfc-list" style={{ listStyle: 'disc', listStylePosition: 'outside', margin: 0, paddingLeft: 20, paddingBottom: 8, fontSize: '1.08rem' }}>
        {items.map((it: { id: string; depth: number; html: string; isCurrent?: boolean }) => (
          <li key={it.id} className="cfc-item" style={{ position:'relative', marginLeft: `${Math.max(0, it.depth)*24}px`, padding: '2px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {Array.from({ length: Math.max(0, it.depth) }).map((_, i) => (
              <span key={`g-${it.id}-${i}`}
                    style={{ position:'absolute', top:2, bottom:2, width:0,
                             left: `${-((Math.max(0, it.depth) - i) * 24 - 12)}px`,
                             borderLeft: '2px solid rgba(148,163,184,0.35)', pointerEvents:'none' }} />
            ))}
            {renderItem(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}

renderWidget(Widget);

