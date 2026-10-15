// Shared cloze masking / rendering helpers for the context-tree widgets.

export type MaskMode = 'ellipsis' | 'question' | 'none';

// Placeholder tokens survive plugin.richText.toHTML() and are swapped for HTML afterwards.
const ELLIPSIS_TOKEN = '[[[CFC_EL]]]';
const PIN_TOKEN = '[[[CFC_PIN]]]';

export const ELLIPSIS_HTML = '<span class="cfc-omission" style="display:inline-block;padding:0 10px;border-radius:6px;line-height:1.2;background:var(--rn-clr-warning-muted, rgba(255,212,0,0.15));color:var(--rn-clr-warning, #b58900);border:0">…</span>';
export const QUESTION_HTML = '<span class="cfc-question" style="display:inline-block;padding:0 12px;border-radius:6px;line-height:1.2;background:var(--rn-clr-accent-muted, rgba(56,139,253,0.15));color:var(--rn-clr-accent, #0969da);border:0">?</span>';

// Rem reference "pins" are rich-text elements with i:'q' and pin:true. They must render
// as a single pin icon, NOT the referenced rem's full text — expanding them clutters the
// context tree and can leak the cloze answer.
export const PIN_HTML = '<span class="cfc-pin" style="display:inline-block;opacity:.7;vertical-align:baseline" title="Pinned reference (hidden in context)">📌</span>';
export const isPinRef = (el: any) => el != null && typeof el === 'object' && el.i === 'q' && !!el.pin;

// RemNote stores the "front >> back" separator as a card-delimiter element (i:'s') at the end of
// `rem.text`, with the back side in `rem.backText`. It has to render as the card's direction
// arrow, but only the caller knows the Rem's practice direction — so it becomes a token here and
// the caller resolves it through `applyDelimiter`.
const DELIM_TOKEN = '[[[CFC_DELIM]]]';
export const isDelimiterEl = (el: any) => el != null && typeof el === 'object' && el.i === 's';

// Arrow notation borrowed from incremental-everything (its Opt+Z command and the reference
// finder), so a card reads the same way in both plugins: the arrow points the way the card is asked.
export const ARROW_BY_DIRECTION: Record<string, string> = { forward: '⇒', backward: '⇐', both: '⇔', none: '⇔' };
export const DEFAULT_ARROW = '⇔';
export const arrowHTML = (arrow: string) =>
  `<span class="cfc-arrow" style="opacity:.55;margin:0 5px;color:var(--rn-clr-content-secondary, #57606a)">${arrow}</span>`;
export const hasDelimToken = (html: string) => html.includes(DELIM_TOKEN);
export const applyDelimiter = (html: string, arrow: string) => html.replaceAll(DELIM_TOKEN, arrowHTML(arrow));

// Click-to-reveal support for masked sibling clozes (used with Hide Other Answers):
// each masked "…" carries its own revealed text (base64 in data-cfc-reveal) so it can be
// toggled open/closed independently, letting you self-evaluate hidden clozes one at a time.
const REVEAL_STYLE = 'text-decoration:underline;text-decoration-color:var(--rn-clr-accent, #0969da);text-decoration-thickness:2px;text-underline-offset:2px';
const REVEAL_UNDERLINE_OPEN = `<span class="cfc-revealed-cloze" style="${REVEAL_STYLE}">`;

// A whole card SIDE revealed on the answer stage. A cloze answer gets its underline from
// revealClozeInHTML and its highlight from addClozeRevealHighlight; a front/back answer has no
// {{...}} to key off, so the same two marks are applied to the side as a unit.
export const wrapRevealedAnswer = (html: string) =>
  `<span class="cfc-revealed-cloze" style="${REVEAL_STYLE};background:var(--rn-clr-accent-muted, rgba(56,139,253,0.15));border-radius:3px">${html}</span>`;
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const encodeReveal = (html: string) => { try { return btoa(unescape(encodeURIComponent(html))); } catch { return ''; } };
export const decodeReveal = (b64: string) => { try { return decodeURIComponent(escape(atob(b64))); } catch { return ''; } };
const clickableOmissionHTML = (revealHtml: string) =>
  `<span class="cfc-omission cfc-reveal" role="button" tabindex="0" data-cfc-reveal="${encodeReveal(revealHtml)}" title="Click to reveal / hide" style="display:inline-block;padding:0 10px;border-radius:6px;line-height:1.2;background:var(--rn-clr-warning-muted, rgba(255,212,0,0.15));color:var(--rn-clr-warning, #b58900);border:0;cursor:pointer">…</span>`;

// The answer SIDE of a front/back card, masked as a single clickable "…". A cloze is masked span
// by span because each span is a separate answer; a card side has no smaller unit than itself, so
// it is hidden — and revealed — in one piece.
export const maskWholeSideHTML = (revealedHtml: string) => clickableOmissionHTML(revealedHtml);

// Cloze HINTS are rich-text elements carrying a `cloze-hint` (or card-hint-*) key and NO cId.
// They are meant to be visible on the question side — RemNote itself shows them next to the "?" —
// so they must never be treated as cloze content. The `/cloze/i` catch-all below used to match
// `cloze-hint` and blank the hint out, so hint keys are excluded explicitly.
const HINT_KEYS = ['cloze-hint', 'card-hint-front', 'card-hint-back', 'multiline-card-item-hint'];
export const isHintEl = (el: any) =>
  el != null && typeof el === 'object' && el.i === 'm' && !el.cId && HINT_KEYS.some((k) => !!el[k]);

// A hint is shown, but styled so it reads as a prompt rather than as part of the sentence.
const HINT_TOKEN_PREFIX = '[[[CFC_HINT_';
const hintHTML = (text: string) =>
  `<span class="cfc-hint" style="opacity:.75;font-style:italic;color:var(--rn-clr-text-secondary, #57606a)">(${escapeHtml(text.trim())})</span>`;

// Rem REFERENCES (i:'q') get our own markup rather than whatever toHTML() emits. The host's
// rendering carries a real link, and following it inside the widget iframe loads the whole
// RemNote app in there — which looks like a crash. Ours is inert markup carrying the rem id in
// a data attribute; contextTreeView's delegated handlers turn it into open-in-pane and hover
// preview. See refInteraction.ts.
export const REF_ATTR = 'data-cfc-rem';
const REF_TOKEN_PREFIX = '[[[CFC_REF_';
const escapeAttr = (s: string) => escapeHtml(s).replace(/"/g, '&quot;');
// `revealed` marks a reference that IS the cloze answer, rendered on the answer stage: it gets the
// same underline/highlight as revealed cloze text, so the tested content is still identifiable.
const refHTML = (id: string, name: string, revealed?: boolean) => {
  const ref = `<span class="cfc-ref" ${REF_ATTR}="${escapeAttr(id)}" role="link" tabindex="0">${escapeHtml(name)}</span>`;
  return revealed ? `${REVEAL_UNDERLINE_OPEN}${ref}</span>` : ref;
};

export interface TokenBag { hints: string[]; refs: { id: string; name: string; revealed?: boolean }[] }
const emptyBag = (): TokenBag => ({ hints: [], refs: [] });

// Swap pins, hints and rem references for plain-text tokens before handing the rich text to
// toHTML(), then put the real markup back. Returns the token text, or null when `el` is none of
// those and should be passed through untouched.
async function tokenize(plugin: any, el: any, bag: TokenBag): Promise<string | null> {
  if (isPinRef(el)) return PIN_TOKEN;
  if (isDelimiterEl(el)) return DELIM_TOKEN;
  if (isHintEl(el)) {
    bag.hints.push(el.text || '');
    return `${HINT_TOKEN_PREFIX}${bag.hints.length - 1}]]]`;
  }
  if (el?.i === 'q') {
    let name = '';
    try { name = (await plugin.richText.toString([el])) || ''; } catch {}
    bag.refs.push({ id: el.aliasId || el._id || '', name: name.trim() || '⧉', revealed: !!el.cId });
    return `${REF_TOKEN_PREFIX}${bag.refs.length - 1}]]]`;
  }
  return null;
}

async function substituteTokens(plugin: any, rich: any[]): Promise<{ out: any[]; bag: TokenBag }> {
  const bag = emptyBag();
  const out: any[] = [];
  for (const el of rich) {
    if (typeof el === 'string') { out.push(el); continue; }
    const token = await tokenize(plugin, el, bag);
    out.push(token == null ? el : { i: 'm', text: token });
  }
  return { out, bag };
}

function restoreTokens(html: string, bag: TokenBag): string {
  let out = html.replaceAll(PIN_TOKEN, PIN_HTML);
  for (let n = bag.hints.length - 1; n >= 0; n--) out = out.replaceAll(`${HINT_TOKEN_PREFIX}${n}]]]`, hintHTML(bag.hints[n]));
  for (let n = bag.refs.length - 1; n >= 0; n--) out = out.replaceAll(`${REF_TOKEN_PREFIX}${n}]]]`, refHTML(bag.refs[n].id, bag.refs[n].name, bag.refs[n].revealed));
  return out;
}

const hasAnyCloze = (obj: any) => !!(obj?.cId || obj?.hiddenCloze || obj?.revealedCloze || obj?.latexClozes?.length || obj?.blocks?.some?.((b: any) => b?.cId) || Object.keys(obj || {}).some((k) => /cloze/i.test(k) && !/hint/i.test(k)));

// Element types whose cloze content we can safely replace with a single placeholder.
//  - 'm' text, 'x' latex: mask the text itself.
//  - 'q' rem reference: a cloze can be applied to a reference, and rendering it would print the
//    referenced rem's full name — i.e. the answer. This is the leak this set exists to close.
// Images ('i') are deliberately absent: their occlusion is rendered by RemNote itself.
const MASKABLE_TYPES = new Set(['m', 'x', 'q']);

export function richHasCloze(rich: any[]): boolean {
  if (!Array.isArray(rich)) return false;
  for (const el of rich) {
    if (typeof el === 'string') continue;
    if (hasAnyCloze(el)) return true;
  }
  return false;
}

// Replace {{c1::text}} / {{<id>::text}} (optional ::hint) with a span that underlines only the cloze content.
export function revealClozeInHTML(html: string): string {
  try {
    const underline = REVEAL_UNDERLINE_OPEN + '$1</span>';
    return html
      .replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/g, underline)
      .replace(/\{\{[^:{}]+::(.*?)(?:::[^}]*)?\}\}/g, underline);
  } catch {
    return html;
  }
}

// Add a light-blue highlight to cloze content we revealed (answer stage), without touching other spans.
export function addClozeRevealHighlight(html: string): string {
  try {
    return html.replace(/<span class="cfc-revealed-cloze" style="([^"]*)">/g,
      (_m, s1) => `<span class="cfc-revealed-cloze" style="${s1};background:var(--rn-clr-accent-muted, rgba(56,139,253,0.15));border-radius:3px">`);
  } catch {
    return html;
  }
}

// Render a rem's rich text to HTML with the requested cloze-masking policy.
//  - 'none'     : reveal cloze content (underlined); nothing masked.
//  - 'question' : mask every cloze in the rem as a blue "?" (the tested line).
//  - 'ellipsis' : mask every cloze as a clickable "…" that can be toggled to reveal its own text.
export async function richToHTMLWithClozeMask(plugin: any, rich: any[], mode: MaskMode, tag = '[CFC]'): Promise<string> {
  if (!Array.isArray(rich)) return '';
  if (mode === 'none') {
    const { out: withTokens, bag } = await substituteTokens(plugin, rich);
    try {
      const html = await plugin.richText.toHTML(withTokens);
      const finalHtml = restoreTokens(revealClozeInHTML(html), bag);
      try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log(`${tag} toHTML noMask`, { rich, html, finalHtml }); } catch {}
      return finalHtml;
    } catch {
      try {
        const s = await plugin.richText.toString(rich);
        const txt = revealClozeInHTML(s || '');
        return txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
      } catch {
        return '';
      }
    }
  }
  const masked: any[] = [];
  const bag = emptyBag();
  const reveals: string[] = []; // ellipsis mode: revealed HTML per masked cloze (for click-to-reveal)
  for (let idx = 0; idx < rich.length; idx++) {
    const el: any = rich[idx];
    if (typeof el === 'string') { masked.push(el); continue; }
    // Clozed elements are masked below; everything else that needs our own markup (pins, hints,
    // rem references) becomes a token here. The cloze check comes second so a clozed REFERENCE is
    // masked rather than rendered — that is the answer leak this ordering exists to prevent.
    if (!(MASKABLE_TYPES.has(el?.i) && hasAnyCloze(el))) {
      const token = await tokenize(plugin, el, bag);
      masked.push(token == null ? el : { i: 'm', text: token });
      continue;
    }
    // One cloze can span several adjacent elements sharing a cId (e.g. a rem reference plus the
    // trailing space it was created with). Consume the whole run so it yields ONE placeholder
    // instead of one per element.
    const group: any[] = [el];
    const cId = el.cId;
    while (cId && idx + 1 < rich.length) {
      const next: any = rich[idx + 1];
      if (!next || typeof next === 'string' || next.cId !== cId || !MASKABLE_TYPES.has(next.i) || isPinRef(next)) break;
      group.push(next);
      idx++;
    }
    if (mode === 'ellipsis') {
      // Remember this cloze's own text so a click can reveal it in place. toString() resolves a
      // rem reference to its name, which is exactly what the reveal should show.
      let revealText = '';
      try { revealText = (await plugin.richText.toString(group)) || ''; } catch {}
      if (!revealText) revealText = group.map((g: any) => g?.text || '').join('');
      reveals.push(`${REVEAL_UNDERLINE_OPEN}${escapeHtml(revealText.trim())}</span>`);
      masked.push({ i: 'm', text: `[[[CFC_EL_${reveals.length - 1}]]]` });
    } else {
      masked.push({ i: 'm', text: ELLIPSIS_TOKEN });
    }
  }
  try {
    const html = await plugin.richText.toHTML(masked);
    let finalHtml = restoreTokens(html, bag);
    if (mode === 'question') {
      finalHtml = finalHtml.replaceAll(ELLIPSIS_TOKEN, QUESTION_HTML);
    } else {
      // ellipsis mode: each masked cloze becomes an independently clickable "…"
      for (let n = reveals.length - 1; n >= 0; n--) {
        finalHtml = finalHtml.replaceAll(`[[[CFC_EL_${n}]]]`, clickableOmissionHTML(reveals[n]));
      }
      finalHtml = finalHtml.replaceAll(ELLIPSIS_TOKEN, ELLIPSIS_HTML); // safety for any leftover token
    }
    try { const dbg = await plugin.settings.getSetting('debug'); if (dbg) console.log(`${tag} rich->html`, { rich, masked, html, finalHtml, mode }); } catch {}
    return finalHtml;
  } catch {
    const s = await plugin.richText.toString(masked as any);
    const replacement = mode === 'question' ? QUESTION_HTML : ELLIPSIS_HTML;
    return restoreTokens(
      (s || '').replace(/\[…\]/g, replacement).replace(/\[\[\[CFC_EL_\d+\]\]\]/g, ELLIPSIS_HTML),
      bag,
    );
  }
}
