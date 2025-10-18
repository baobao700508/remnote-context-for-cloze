import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';


const POW_CODE = 'contextForCloze';


const HIDE_IN_QUEUE = 'hideInQueue';
const REMOVE_FROM_QUEUE = 'removeFromQueue';
const NO_HIERARCHY = 'noHierarchy';
const HIDDEN_IN_QUEUE_HTML = '<span style="opacity:.6;color:var(--rn-clr-text-secondary,#57606a);font-style:italic">Hidden in queue</span>';

type Ctx = { remId?: string; cardId?: string; revealed?: boolean };

const ClozeMask = (s: string) => s.replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, '[…]');

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
  // 将 {{c1::文本}} 或 {{<id>::文本}}（可带 ::hint）替换为“仅对 cloze 内容加下划线”的 HTML 片段
  try {
    const underline = '<span class="cfc-revealed-cloze" style="text-decoration:underline;text-decoration-color:var(--rn-clr-accent, #0969da);text-decoration-thickness:2px;text-underline-offset:2px">$1</span>';
    return html
      .replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, underline)
      .replace(/\{\{[^:{}]+::(.*?)(?:::[^}]*)?\}\}/g, underline);
  } catch { return html; }
}
// mode: 'ellipsis'（黄省略号） | 'question'（蓝问号） | 'none'（不掩码，显示原文并解包 cloze）
async function richToHTMLWithClozeMask(plugin: any, rich: any[], mode: 'ellipsis' | 'question' | 'none'): Promise<string> {
  if (!Array.isArray(rich)) return '';
  if (mode === 'none') {
    try {
      const html = await plugin.richText.toHTML(rich);
      const finalHtml = revealClozeInHTML(html);
      try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][Q] toHTML noMask', { rich, html, finalHtml }); } catch {}
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
    try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][Q] rich->html', { rich, masked, html, finalHtml, mode }); } catch {}
    return finalHtml;
  } catch {
    const s = await plugin.richText.toString(masked as any);
    const replacement = mode === 'question' ? QUESTION_HTML : ELLIPSIS_HTML;
    return (s || '').replace(/\[\u2026\]|\[…\]/g, replacement);
  }
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
async function shouldSkipChildAsMeta(plugin: any, rem: any): Promise<boolean> {
  try {
    const s = (await plugin.richText.toString(rem?.text || []) || '').trim();
    const lower = s.toLowerCase();
    if (lower === 'size' || s === '大小') return true; // 标题样式元数据（Size/大小）
  } catch {}
  return false;
}
interface QueueAdaptOpts { hideSet: Set<string>; removeSet: Set<string>; yellowSet?: Set<string>; applyHideInQueue: boolean; }

async function collectFullTree(plugin: any, root: any, currentRemId: string, maxDepth: number, maxNodes: number, shouldMask: boolean, opts?: QueueAdaptOpts) {
  const items: { id: string; depth: number; html: string; isCurrent?: boolean; hasCloze?: boolean }[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number) {
    if (depth > maxDepth || count >= maxNodes) return;
    // 输出当前节点（包含 root 自身），应用占位/掩码
    const id = rem._id;
    let html = ''; let isCurrent = false; let hasCloze = false;
    let _removed = false;
    if (id === currentRemId) {
      isCurrent = true;
      const rich = rem.text || [];
      hasCloze = richHasCloze(rich);
      html = await richToHTMLWithClozeMask(plugin, rich, 'question');
    } else {
      // 使用 RichText 级别的 cloze mask 
      const rich = rem.text || [];
      hasCloze = richHasCloze(rich);
      // 根据官方 Remove/Hide 标记覆盖渲染
      _removed = !!opts?.removeSet?.has(id);
      if (!_removed) {
        if (opts?.applyHideInQueue && opts?.hideSet?.has(id)) {
          html = HIDDEN_IN_QUEUE_HTML;
        } else if (opts?.yellowSet?.has(id)) {
          html = ELLIPSIS_HTML;
        } else {
          html = await richToHTMLWithClozeMask(plugin, rich, shouldMask ? 'ellipsis' : 'none');
        }
      }

      // html computed above (Hide/Remove adaptation)
      // 兜底：若未检测到 cId 

    }
    if (!_removed) items.push({ id, depth, html, isCurrent, hasCloze });
    count++;
    if (count >= maxNodes) return;
    // 递归子节点
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      if (await shouldSkipChildAsMeta(plugin, ch)) {
        try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][Q] skip meta child', ch?._id); } catch {}
        continue;
      }
      await dfs(ch, _removed ? depth : depth + 1);
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
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 300); return () => clearInterval(id); }, []);
  const ctx = useRunAsync(async () => await plugin.widget.getWidgetContext(), [tick]) as Ctx | undefined;
  const debug = useRunAsync(async () => !!(await plugin.settings.getSetting('debug')), []);

  // 统一 hooks 顺序：不在此处提前 return；在后面再做 gating
  const { items, shouldMask } = useRunAsync(async () => {
    try {
      console.log('[CFC][Q] ctx', ctx);
      if (!ctx?.remId || ctx?.revealed) return { items: [] as { id: string; depth: number; html: string; isCurrent?: boolean }[] };
      const maskId = await getCurrentCardRemId(plugin, ctx);
      const anchor = await getNearestAnchor(plugin, maskId || ctx.remId);
      console.log('[CFC][Q] anchor', anchor?._id || 'none');
      if (!anchor) return { items: [] };
      const maxDepth = 999; // 全树展示
      // 读取三种官方 Power-up 的标记集合（用于上下文区域的适配）
      const [hideSet, removeSet, noHSet] = await Promise.all([
        (async () => { const p = await plugin.powerup.getPowerupByCode(HIDE_IN_QUEUE); const t = p ? await p.taggedRem() : []; return new Set((t||[]).map((r:any)=>r._id)); })(),
        (async () => { const p = await plugin.powerup.getPowerupByCode(REMOVE_FROM_QUEUE); const t = p ? await p.taggedRem() : []; return new Set((t||[]).map((r:any)=>r._id)); })(),
        (async () => { const p = await plugin.powerup.getPowerupByCode(NO_HIERARCHY); const t = p ? await p.taggedRem() : []; return new Set((t||[]).map((r:any)=>r._id)); })(),
      ]);
      // 读取 contextHideAllTestOne（用于“被打标签的 Rem 用黄色省略号替换”）
      const yellowSet = await (async () => {
        try {
          const p = await plugin.powerup.getPowerupByCode('contextHideAllTestOne');
          const t = p ? await p.taggedRem() : [];
          return new Set((t||[]).map((r:any)=>r._id));
        } catch { return new Set<string>(); }
      })();

      const maxNodes = 10000;
      // 新逻辑：不再使用 contextHideAllTestOne
      //   
      const shouldMask = true;
      let items = await collectFullTree(plugin, anchor, maskId || ctx.remId, maxDepth, maxNodes, shouldMask, { hideSet, removeSet, yellowSet, applyHideInQueue: true });
      // No Hierarchy：如果当前题目被标记，则移除所有祖先行
      if (noHSet.has(maskId || ctx.remId)) {
        const cur = items.find(x => (x as any).isCurrent);
        if (cur) items = items.filter(x => x.depth >= cur.depth);
      }
      try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log('[CFC][Q] items', items.length, 'mask target', maskId || ctx.remId, 'shouldMask', shouldMask, items.map(x=>({id:x.id, hasCloze:(x as any).hasCloze}))); } catch {}
      return { items, shouldMask };
    } catch (e) {
      console.error('[CFC][Q] error', e);
      return { items: [] };
    }
  }, [ctx?.remId, ctx?.revealed]) || { items: [], shouldMask: true } as any;

  React.useEffect(() => {
    if (rootRef.current) {
      const w = rootRef.current.clientWidth;
      console.log('[CFC][Q] width] root', w, 'iframe', window.innerWidth);
    }
  }, [items.length]);
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

  // gating (after all hooks):
  if (ctx?.revealed) return null;
  if (!items.length) return debug ? (
    <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
  ) : null;
  return (
    <div ref={rootRef} className="cfc-container" style={{ width: '100%', display: 'block', boxSizing: 'border-box', minWidth: 0, maxWidth: '100%', borderTop: '1px solid var(--rn-clr-border, #e4e8ef)', paddingTop: 6, overflow: 'visible' }}>
      <ul className="cfc-list" style={{ listStyle: 'disc', listStylePosition: 'outside', margin: 0, paddingLeft: 20, paddingBottom: 8, width: '100%', fontSize: '1.08rem' }}>
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

