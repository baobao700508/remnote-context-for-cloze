import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';


const POW_CODE = 'contextForCloze';

type Ctx = { remId?: string; cardId?: string; revealed?: boolean };


// 基于 RichText 的逐元素掩码（HTML 版）：凡含 cloze 标记(cId)的文本元素，替换为占位符，再使用 SDK 转为 HTML
const ELLIPSIS_TOKEN = '[[[CFC_EL]]]';
const ELLIPSIS_HTML = '<span class="cfc-omission" style="display:inline-block;padding:0 12px;border-radius:6px;line-height:1.2;background:var(--rn-clr-warning-muted, rgba(255,212,0,0.15));color:var(--rn-clr-warning, #b58900);border:1px solid rgba(255,212,0,0.3)">…</span>';
const QUESTION_HTML = '<span class="cfc-question" style="display:inline-block;padding:0 10px;border-radius:6px;line-height:1.2;background:var(--rn-clr-accent-muted, rgba(56,139,253,0.15));color:var(--rn-clr-accent, #0969da);border:0">?</span>';
function richHasCloze(rich: any[]): boolean {
  if (!Array.isArray(rich)) return false;
  const hasAnyCloze = (obj: any) => !!(obj?.cId || obj?.hiddenCloze || obj?.revealedCloze || obj?.latexClozes?.length || Object.keys(obj||{}).some(k => /cloze/i.test(k)));
  for (const el of rich) {
    if (typeof el === 'string') continue;
    if (hasAnyCloze(el)) return true;
  }
  return false;
}
function revealClozeInHTML(html: string): string {
  try {
    return html
      .replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, '$1')
      .replace(/\{\{[^:{}]+::(.*?)(?:::[^}]*)?\}\}/g, '$1');
  } catch { return html; }
}
// mode: 'ellipsis' | 'question' | 'none'
async function richToHTMLWithClozeMask(plugin: any, rich: any[], mode: 'ellipsis' | 'question' | 'none'): Promise<string> {
  if (!Array.isArray(rich)) return '';
  if (mode === 'none') {
    try {
      const html = await plugin.richText.toHTML(rich);
      const finalHtml = revealClozeInHTML(html);
      try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][A] toHTML noMask', { rich, html, finalHtml }); } catch {}
      return finalHtml;
    } catch {
      try {
        const s = await plugin.richText.toString(rich);
        const txt = revealClozeInHTML(s || '');
        const safe = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>');
        return safe;
      } catch { return ''; }
    }
  }
  const masked: any[] = [];
  for (const el of rich) {
    if (typeof el === 'string') { masked.push(el); continue; }
    const i = (el as any)?.i;
    const hasAnyCloze = (obj: any) => !!(obj?.cId || obj?.hiddenCloze || obj?.revealedCloze || obj?.latexClozes?.length || Object.keys(obj||{}).some(k => /cloze/i.test(k)));
    if (i === 'm') {
      const hasCloze = hasAnyCloze(el);
      if (hasCloze) masked.push({ i: 'm', text: ELLIPSIS_TOKEN }); else masked.push(el);
    } else if (i === 'x') { // LaTeX
      const hasCloze = hasAnyCloze(el);
      if (hasCloze) masked.push({ i: 'm', text: ELLIPSIS_TOKEN }); else masked.push(el);
    } else {
      masked.push(el);
    }
  }
  try {
    const html = await plugin.richText.toHTML(masked);
    const replacement = mode === 'question' ? QUESTION_HTML : ELLIPSIS_HTML;
    const finalHtml = html.replaceAll(ELLIPSIS_TOKEN, replacement);
    try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][A] rich->html', { rich, masked, html, finalHtml, mode }); } catch {}
    return finalHtml;
  } catch {
    const s = await plugin.richText.toString(masked as any);
    const replacement = mode === 'question' ? QUESTION_HTML : ELLIPSIS_HTML;
    return (s || '').replace(/\[\u2026\]|\[…\]/g, replacement);
  }
}

// RichText 

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
async function shouldSkipChildAsMeta(plugin: any, rem: any): Promise<boolean> {
  try {
    const s = (await plugin.richText.toString(rem?.text || []) || '').trim();
    const lower = s.toLowerCase();
    if (lower === 'size' || s === '\u5927\u5c0f') return true;
  } catch {}
  return false;
}
async function collectFullTree(plugin: any, root: any, currentRemId: string, maxDepth: number, maxNodes: number, shouldMask: boolean) {
  const items: { id: string; depth: number; html: string; isCurrent?: boolean; hasCloze?: boolean }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    const id = rem._id;
    let html = ''; let isCurrent = false; let hasCloze = false;
    if (id === currentRemId) {
      isCurrent = true;
      const rich = rem.text || [];
      hasCloze = richHasCloze(rich);
      html = await richToHTMLWithClozeMask(plugin, rich, 'question');
    } else {
      const rich = rem.text || [];
      hasCloze = richHasCloze(rich);
      html = await richToHTMLWithClozeMask(plugin, rich, shouldMask ? 'ellipsis' : 'none');

    }
    items.push({ id, depth, html, isCurrent, hasCloze });
    count++;
    if (count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      if (await shouldSkipChildAsMeta(plugin, ch)) {
        try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][A] skip meta child', ch?._id); } catch {}
        continue;
      }
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

  const { items, shouldMask } = useRunAsync(async () => {
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
      const noHide = await (async () => {
        try {
          const power = await plugin.powerup.getPowerupByCode('contextHideAllTestOne');
          const tagged = power ? await power.taggedRem() : [];
          const set = new Set((tagged||[]).map((r:any)=>r._id));
          return set.has(maskId || ctx.remId);
        } catch { return false; }
      })();
      const shouldMask = !noHide;
      const items = await collectFullTree(plugin, anchor, maskId || ctx.remId, maxDepth, maxNodes, shouldMask);
      console.log('[CFC][A] items', items.length, 'mask target', maskId || ctx.remId, 'shouldMask', shouldMask);
      return { items, shouldMask };
    } catch (e) {
      console.error('[CFC][A] error', e);
      return { items: [] };
    }
  }, [ctx?.remId, answerMode]) || { items: [], shouldMask: true } as any;

  // Only show on answer (back) phase
  if (!ctx?.revealed) return null;
  const renderItem = (it: { id: string; depth: number; html: string; isCurrent?: boolean; hasCloze?: boolean }) => {
    if (it.isCurrent) {
      return (
        <span style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: it.html }} />
      );
    }
    if (shouldMask === false && it.hasCloze) {
      try { const dbg = (window as any).plugin_debug || true; if (dbg) console.log('[CFC][A] underline apply', it.id); } catch {}
      return (
        <span
          className="cfc-revealed-cloze"
          style={{ fontSize: '1rem', display:'inline-block', borderBottom: '2px solid var(--rn-clr-accent, #0969da)', paddingBottom: 1, verticalAlign: 'text-bottom' }}
          dangerouslySetInnerHTML={{ __html: it.html }}
        />
      );
    }
    return <span style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: it.html }} />;

  };


  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  return (
    <div className="cfc-container" style={{ width: '100%', borderTop: '1px solid var(--rn-clr-border, #e4e8ef)', paddingTop: 6, overflow: 'visible' }}>
      <ul className="cfc-list" style={{ listStyle: 'disc', listStylePosition: 'outside', margin: 0, paddingLeft: 20, paddingBottom: 8, fontSize: '1.08rem' }}>
        {items.map((it: { id: string; depth: number; html: string; isCurrent?: boolean; hasCloze?: boolean }) => (
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

