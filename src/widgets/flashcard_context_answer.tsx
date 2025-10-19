import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';


const POW_CODE = 'contextForCloze';


const HIDE_IN_QUEUE = 'hideInQueue';
const REMOVE_FROM_QUEUE = 'removeFromQueue';
const NO_HIERARCHY = 'noHierarchy';


const HIDDEN_IN_QUEUE_HTML = '<span style="opacity:.6;color:var(--rn-clr-text-secondary,#57606a);font-style:italic">Hidden in queue</span>';
interface QueueAdaptOpts { hideSet: Set<string>; removeSet: Set<string>; applyHideInQueue: boolean; }

type Ctx = { remId?: string; cardId?: string; revealed?: boolean };


// 基于 RichText 的逐元素掩码（HTML 版）：凡含 cloze 标记(cId)的文本元素，替换为占位符，再使用 SDK 转为 HTML
const ELLIPSIS_TOKEN = '[[[CFC_EL]]]';
const ELLIPSIS_HTML = '<span class="cfc-omission" style="display:inline-block;padding:0 10px;border-radius:6px;line-height:1.2;background:var(--rn-clr-warning-muted, rgba(255,212,0,0.15));color:var(--rn-clr-warning, #b58900);border:0">…</span>';
const QUESTION_HTML = '<span class="cfc-question" style="display:inline-block;padding:0 12px;border-radius:6px;line-height:1.2;background:var(--rn-clr-accent-muted, rgba(56,139,253,0.15));color:var(--rn-clr-accent, #0969da);border:0">?</span>';
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
    const underline = '<span class="cfc-revealed-cloze" style="text-decoration:underline;text-decoration-color:var(--rn-clr-accent, #0969da);text-decoration-thickness:2px;text-underline-offset:2px">$1</span>';
    return html
      .replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, underline)
      .replace(/\{\{[^:{}]+::(.*?)(?:::[^}]*)?\}\}/g, underline);
  } catch { return html; }
}
// mode: 'ellipsis' | 'question' | 'none'
function addClozeRevealHighlight(html: string): string {
  try {
    // 仅增强我们自己插入的 cfc-revealed-cloze 包裹，不影响原始富文本内部样式
    return html.replace(/<span class=\"cfc-revealed-cloze\" style=\"([^"]*)\">/g,
      (_m, s1) => `<span class="cfc-revealed-cloze" style="${s1};background:var(--rn-clr-accent-muted, rgba(56,139,253,0.15));border-radius:3px;padding:0 2px">`);
  } catch { return html; }
}

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
async function collectFullTree(plugin: any, root: any, currentRemId: string, maxDepth: number, maxNodes: number, shouldMask: boolean, opts?: QueueAdaptOpts) {
  const items: { id: string; depth: number; html: string; isCurrent?: boolean; hasCloze?: boolean }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    const id = rem._id;
    let html = ''; let isCurrent = false; let hasCloze = false;
    let _removed = false;
    if (id === currentRemId) {
      isCurrent = true;
      const rich = rem.text || [];
      hasCloze = richHasCloze(rich);
      // 在卡片背面，当前节点应显示原文并对 Cloze 内容加下划线
      html = await richToHTMLWithClozeMask(plugin, rich, 'none');
      // 为当前题目 Rem 的 cloze 原文添加浅蓝荧光背景，不影响上下文其他 Rem
      html = addClozeRevealHighlight(html);

    } else {
      const rich = rem.text || [];
      hasCloze = richHasCloze(rich);
      _removed = !!opts?.removeSet?.has(id);
      if (!_removed) {
        if (opts?.applyHideInQueue && opts?.hideSet?.has(id)) {
          html = HIDDEN_IN_QUEUE_HTML;
        } else {
          html = await richToHTMLWithClozeMask(plugin, rich, shouldMask ? 'ellipsis' : 'none');
        }
      }

    }
    if (!_removed) items.push({ id, depth, html, isCurrent, hasCloze });
    count++;
    if (count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      if (await shouldSkipChildAsMeta(plugin, ch)) {
        try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][A] skip meta child', ch?._id); } catch {}
        continue;
      }
      await dfs(ch, _removed ? depth : depth + 1);
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
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 300); return () => clearInterval(id); }, []);
  const ctx = useRunAsync(async () => await plugin.widget.getWidgetContext(), [tick]) as Ctx | undefined;
  const debug = useRunAsync(async () => !!(await plugin.settings.getSetting('debug')), []);



  const { items, shouldMask, enabled } = useRunAsync(async () => {
    try {
      console.log('[CFC][A] ctx', ctx);
      if (!ctx?.remId) return { items: [] as { id: string; depth: number; html: string; isCurrent?: boolean }[], enabled: false };
      if (!ctx?.revealed) return { items: [], enabled: false };
      const maskId = await getCurrentCardRemId(plugin, ctx);
      const anchor = await getNearestAnchor(plugin, maskId || ctx.remId);
      console.log('[CFC][A] anchor', anchor?._id || 'none');
      if (!anchor) return { items: [], enabled: false };
      // 从设置接入 Max Depth / Max Nodes（提供健壮的数值兜底）
      const rawDepth = await plugin.settings.getSetting('maxDepth');
      const rawNodes = await plugin.settings.getSetting('maxNodes');
      let _md = Number(rawDepth); if (!Number.isFinite(_md) || _md < 0) _md = 999;
      let _mn = Number(rawNodes); if (!Number.isFinite(_mn) || _mn < 0) _mn = 10000;
      const maxDepth = _md;
      const maxNodes = _mn;
      // 读取三种官方 Power-up 的标记集合
      const [hideSet, removeSet, noHSet] = await Promise.all([
        (async () => { const p = await plugin.powerup.getPowerupByCode(HIDE_IN_QUEUE); const t = p ? await p.taggedRem() : []; return new Set((t||[]).map((r:any)=>r._id)); })(),
        (async () => { const p = await plugin.powerup.getPowerupByCode(REMOVE_FROM_QUEUE); const t = p ? await p.taggedRem() : []; return new Set((t||[]).map((r:any)=>r._id)); })(),
        (async () => { const p = await plugin.powerup.getPowerupByCode(NO_HIERARCHY); const t = p ? await p.taggedRem() : []; return new Set((t||[]).map((r:any)=>r._id)); })(),
      ]);

      //  a a a a a a a a a a a a a a a a a a a a a
      //  a a a a
      //  a a a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //  a
      //   a
      //  a a
      //  a
      // 如果当前题目被标记 noHierarchy：仅显示“当前题目这一行”，不显示祖先/兄弟/子孙（对齐原生）
      if (noHSet.has(maskId || ctx.remId)) {
        try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][A] noHierarchy on current -> show only current line'); } catch {}
        const cur = await plugin.rem.findOne(maskId || ctx.remId);
        const rich = cur?.text || [];
        const hasCloze = richHasCloze(rich);
        let html = await richToHTMLWithClozeMask(plugin, rich, 'none');
        html = addClozeRevealHighlight(html);
        const items = [{ id: cur?._id || (maskId || ctx.remId), depth: 0, html, isCurrent: true, hasCloze }];
        return { items, shouldMask: false, enabled: true } as any;
      }



      const noHide = await (async () => {
        try {
          const power = await plugin.powerup.getPowerupByCode('contextHideAllTestOne');
          const tagged = power ? await power.taggedRem() : [];
          const set = new Set((tagged||[]).map((r:any)=>r._id));
          return set.has(maskId || ctx.remId);
        } catch { return false; }
      })();
      const shouldMask = noHide;
      let items = await collectFullTree(plugin, anchor, maskId || ctx.remId, maxDepth, maxNodes, shouldMask, { hideSet, removeSet, applyHideInQueue: false });
      console.log('[CFC][A] items', items.length, 'mask target', maskId || ctx.remId, 'shouldMask', shouldMask);
      return { items, shouldMask, enabled: true };
    } catch (e) {
      console.error('[CFC][A] error', e);
      return { items: [], enabled: false };
    }
  }, [ctx?.remId, ctx?.revealed]) || { items: [], shouldMask: true, enabled: false } as any;

  // Only show on answer (back) phase
  if (!ctx?.revealed) return null;
  if (!enabled) return null; // 未标记我们 Power-Up（祖先链无 anchor）=> 完全透明
  const renderItem = (it: { id: string; depth: number; html: string; isCurrent?: boolean; hasCloze?: boolean }) => {
    if (it.isCurrent) {
      return (
        <span style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: it.html }} />
      );
    }
    if (shouldMask === false && it.hasCloze) {
      return (
        <span style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: it.html }} />
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

