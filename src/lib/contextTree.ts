// Shared context-tree traversal for the question/answer widgets: find the anchor,
// skip metadata/search-portal rems, and collect the masked tree rooted at the anchor.
import { BuiltInPowerupCodes, PORTAL_TYPE, RemType } from '@remnote/plugin-sdk';
import {
  addClozeRevealHighlight,
  applyDelimiter,
  ARROW_BY_DIRECTION,
  arrowHTML,
  DEFAULT_ARROW,
  hasDelimToken,
  maskWholeSideHTML,
  QUESTION_HTML,
  richHasCloze,
  richToHTMLWithClozeMask,
  wrapRevealedAnswer,
} from './clozeMask';
import { isPowerupSlotChild } from './powerupSlotFilter';

export interface Ctx { remId?: string; cardId?: string; revealed?: boolean }
export interface QueueAdaptOpts { hideSet: Set<string>; removeSet: Set<string>; applyHideInQueue: boolean }
// `html` is the revealed rendering of the line — front side, direction arrow, back side; and
// `maskedHtml` is the same line with the OTHER answers in it masked as clickable "…" (each cloze
// on its own, a flashcard's answer side as a whole). It is present only where the two actually
// differ — a line that answers nothing renders identically either way. Both are produced in one
// pass so the widget's reveal/hide toggle is a pure re-render — no second walk of the knowledge base.
//
// `parentId` / `hasChildren` drive the collapsible rendering in the widgets: `parentId` is the
// EFFECTIVE parent inside the collected tree (a "Remove from Queue" node is dropped and its
// children are re-attached to its own parent), and `hasChildren` is true only when at least one
// child actually made it into the list (so a chevron never promises content that the Max Nodes
// budget or metadata-skipping already cut).
export interface TreeItem { id: string; depth: number; html: string; maskedHtml?: string; isCurrent?: boolean; hasCloze?: boolean; parentId?: string; hasChildren?: boolean }
export interface QueueDisplaySets { hideSet: Set<string>; removeSet: Set<string>; noHierarchySet: Set<string> }

const HIDDEN_IN_QUEUE_HTML = '<span style="opacity:.6;color:var(--rn-clr-text-secondary,#57606a);font-style:italic">Hidden in queue</span>';

// Official / incremental-everything queue-display power-up codes. We don't register these
// (other plugins do) — we only read their tags so the context tree mirrors native behavior.
const QUEUE_CODES = {
  hideInQueue: 'hideInQueue',
  removeFromQueue: 'removeFromQueue',
  noHierarchy: 'noHierarchy',
  hideParent: 'hideParent',
  hideGrandparent: 'hideGrandparent',
  removeParent: 'removeParent',
  removeGrandparent: 'removeGrandparent',
};

// Collect the id sets that drive queue-display adaptation. Direct power-ups (Hide/Remove in
// Queue, No Hierarchy) mark the tagged Rem itself; the Parent/Grandparent variants are tagged
// on the CARD but target its parent/grandparent, so we resolve those to the affected Rem id.
//  - Hide* → hideSet   (placeholder on the question side only, via applyHideInQueue)
//  - Remove* → removeSet (dropped on both sides)
// Missing power-ups (not registered in this KB) simply contribute nothing.
export async function collectQueueDisplaySets(plugin: any): Promise<QueueDisplaySets> {
  const taggedRems = async (code: string): Promise<any[]> => {
    try {
      const p = await plugin.powerup.getPowerupByCode(code);
      return p ? (await p.taggedRem()) || [] : [];
    } catch {
      return [];
    }
  };
  const [hideDirect, removeDirect, noH, hideParentR, hideGpR, removeParentR, removeGpR] = await Promise.all([
    taggedRems(QUEUE_CODES.hideInQueue),
    taggedRems(QUEUE_CODES.removeFromQueue),
    taggedRems(QUEUE_CODES.noHierarchy),
    taggedRems(QUEUE_CODES.hideParent),
    taggedRems(QUEUE_CODES.hideGrandparent),
    taggedRems(QUEUE_CODES.removeParent),
    taggedRems(QUEUE_CODES.removeGrandparent),
  ]);

  const hideSet = new Set<string>(hideDirect.map((r: any) => r._id));
  const removeSet = new Set<string>(removeDirect.map((r: any) => r._id));
  const noHierarchySet = new Set<string>(noH.map((r: any) => r._id));

  // Parent variants: the tagged Rem's own `.parent` is already the affected id (no extra lookup).
  for (const r of hideParentR) { if (r?.parent) hideSet.add(r.parent); }
  for (const r of removeParentR) { if (r?.parent) removeSet.add(r.parent); }

  // Grandparent variants: one lookup to climb from parent to grandparent.
  const grandparentId = async (r: any): Promise<string | undefined> => {
    if (!r?.parent) return undefined;
    const p = await plugin.rem.findOne(r.parent);
    return p?.parent || undefined;
  };
  await Promise.all([
    ...hideGpR.map(async (r: any) => { const t = await grandparentId(r); if (t) hideSet.add(t); }),
    ...removeGpR.map(async (r: any) => { const t = await grandparentId(r); if (t) removeSet.add(t); }),
  ]);

  return { hideSet, removeSet, noHierarchySet };
}

// Find the anchor/root for `remId`: the Rem itself if it carries the context power-up, otherwise
// the nearest ancestor that does.
//
// Self first, because a cloze written on the anchor Rem itself is an ordinary case — the tested
// line is the anchor's own text and the context is its children, exactly the tree the user tagged
// the Rem to get. Requiring the anchor to be a strict ancestor used to leave that card with no
// context at all, which read as the plugin silently doing nothing on a Rem visibly tagged for it.
export async function getNearestAnchor(plugin: any, remId: string, powCode: string) {
  const power = await plugin.powerup.getPowerupByCode(powCode);
  if (!power) return null;
  const anchors = await power.taggedRem();
  const set = new Set((anchors || []).map((r: any) => r._id));
  let cur = await plugin.rem.findOne(remId);
  if (cur && set.has(cur._id)) return cur;
  while (cur?.parent) {
    const p = await plugin.rem.findOne(cur.parent);
    if (!p) break;
    if (set.has(p._id)) return p;
    cur = p;
  }
  return null;
}

// Skip rems that shouldn't appear in the context tree:
//  - Search Portal ("query:") rems — their body is a transclusion of query results, which
//    pollutes the tree and may leak the cloze answer. Detected via getPortalType() === SEARCH_PORTAL
//    (the SearchPortal power-up is NOT reliably present on these rems — confirmed by logging).
//    Normal portals (portalType PORTAL / undefined) are deliberately kept: they can be real context.
//  - Title-style metadata rems: RemNote's "Size" label, matched in English and in the Chinese
//    localization it carries in a zh knowledge base.
//  - Power-up slot children — incremental-everything's ("Priority", "Next Rep Date", …) and
//    RemNote's own legacy built-in ones ("Sources", a PDF's "Title", …). Metadata materialised
//    under a tagged Rem, not context. See powerupSlotFilter.ts.
export async function shouldSkipChildAsMeta(plugin: any, rem: any): Promise<boolean> {
  try {
    if (rem && typeof rem.getPortalType === 'function' && (await rem.getPortalType()) === PORTAL_TYPE.SEARCH_PORTAL) return true;
  } catch {}
  try {
    // Fallback for setups where the SearchPortal power-up IS applied.
    if (rem && typeof rem.hasPowerup === 'function' && (await rem.hasPowerup(BuiltInPowerupCodes.SearchPortal))) return true;
  } catch {}
  try {
    const s = (await plugin.richText.toString(rem?.text || []) || '').trim();
    const lower = s.toLowerCase();
    if (lower === 'size' || s === '大小') return true;
  } catch {}
  try {
    if (await isPowerupSlotChild(plugin, rem)) return true;
  } catch {}
  return false;
}

// Resolve the rem that owns the card currently under review (falls back to ctx.remId).
export async function getCurrentCardRemId(plugin: any, ctx: Ctx | undefined) {
  if (ctx?.cardId) {
    try {
      const card = await plugin.card.findOne(ctx.cardId);
      if (card) {
        const rem = await card.getRem();
        if (rem?._id) return rem._id;
        // @ts-ignore
        if ((card as any).remId) return (card as any).remId;
      }
    } catch (e) {
      console.error('[CFC] getCurrentCardRemId error:', e);
    }
  }
  return ctx?.remId;
}

// Which side of a Rem the card under review is actually asking for.
//  - 'back'  : a forward card — the front is the prompt, the back is the answer.
//  - 'front' : a backward card — the back is the prompt, the front is the answer.
//  - 'cloze' : a cloze card — the answer lives inside the front text, and a back side (if the Rem
//              has one) belongs to a DIFFERENT card of the same Rem.
export type TestedSide = 'front' | 'back' | 'cloze';

export interface TestedInfo {
  side: TestedSide;
  /** The Rem whose side actually holds the answer — see `getTestedTarget` for when it is not the
   *  Rem the card belongs to. */
  remId: string;
  /** The answer sits on a Rem OTHER than the card's own (a backward Descriptor card). */
  redirected: boolean;
}

async function remTypeOf(rem: any): Promise<number | undefined> {
  try {
    if (rem && typeof rem.getType === 'function') return await rem.getType();
  } catch {}
  return rem?.type;
}
const isDescriptorRem = async (rem: any) => (await remTypeOf(rem)) === RemType.DESCRIPTOR;

// Climb past every Descriptor above `rem` and return the first Rem that is not one — the concept
// (or plain Rem) the whole descriptor chain hangs under.
async function nearestNonDescriptorAncestor(plugin: any, rem: any) {
  let cur = rem;
  // Guard against a malformed chain; a real descriptor chain is a handful of levels at most.
  for (let i = 0; cur?.parent && i < 256; i++) {
    const p = await plugin.rem.findOne(cur.parent);
    if (!p) break;
    if (!(await isDescriptorRem(p))) return p;
    cur = p;
  }
  return null;
}

// Work out what the card under review is asking for, and WHERE that answer lives.
//
// Usually the answer is a side of the card's own Rem. The exception is a backward DESCRIPTOR card:
// a descriptor's own text is just its label ("this is a", "definition", …), not an answer. What a
// backward descriptor card asks you to recall is the CONCEPT it hangs under, so RemNote masks that
// ancestor natively — and the tree has to mask the same line, not the descriptor's label.
//
// 'cloze' is the fallback whenever the card type cannot be read, because that is the rendering
// this plugin used before it knew about card sides at all.
export async function getTestedTarget(plugin: any, ctx: Ctx | undefined, cardRemId: string): Promise<TestedInfo> {
  const own = (side: TestedSide): TestedInfo => ({ side, remId: cardRemId, redirected: false });
  try {
    if (!ctx?.cardId) return own('cloze');
    const card = await plugin.card.findOne(ctx.cardId);
    const type = card ? await card.getType() : undefined;
    if (type === 'forward') return own('back');
    if (type !== 'backward') return own('cloze');

    const rem = await plugin.rem.findOne(cardRemId);
    if (!rem || !(await isDescriptorRem(rem))) return own('front');
    const target = await nearestNonDescriptorAncestor(plugin, rem);
    // No concept above it: mask nothing rather than masking the descriptor's own label. The answer
    // is then simply absent from the tree, which leaks nothing.
    return target ? { side: 'front', remId: target._id, redirected: true } : own('cloze');
  } catch (e) {
    console.error('[CFC] getTestedTarget error:', e);
  }
  return own('cloze');
}

// One side of a Rem, rendered for both cloze modes. `masked` is present only where hiding actually
// changes the line — everywhere else the widget reuses `html` for both modes.
interface SideHTML { html: string; masked?: string }
const EMPTY_SIDE: SideHTML = { html: '' };

// A side the current card is NOT asking for — every side of every other Rem, plus the prompt side
// of the current one. `hideWhole` marks it as somebody's flashcard answer: those are hidden as a
// unit, the rest only cloze by cloze.
async function renderContextSide(plugin: any, rich: any[], hideWhole: boolean, tag: string): Promise<SideHTML> {
  if (!Array.isArray(rich) || !rich.length) return EMPTY_SIDE;
  const html = await richToHTMLWithClozeMask(plugin, rich, 'none', tag);
  if (hideWhole) return { html, masked: maskWholeSideHTML(html) };
  // Only a line that owns a cloze can look different when masked, so skip the second render
  // everywhere else — that is most of the tree.
  if (richHasCloze(rich)) return { html, masked: await richToHTMLWithClozeMask(plugin, rich, 'ellipsis', tag) };
  return { html };
}

// The side being tested by the card in front of us. It is never affected by the reveal/hide
// toggle — it is the line under review, not an "other answer".
//  - `whole` (a front/back card): the entire side is the answer — "?" on the question stage,
//    underlined and highlighted on the answer stage.
//  - otherwise (a cloze card): only the clozes inside the side are masked / revealed.
async function renderTestedSide(plugin: any, rich: any[], questionStage: boolean, whole: boolean, tag: string): Promise<SideHTML> {
  if (!Array.isArray(rich) || !rich.length) return EMPTY_SIDE;
  if (questionStage) {
    return { html: whole ? QUESTION_HTML : await richToHTMLWithClozeMask(plugin, rich, 'question', tag) };
  }
  const html = await richToHTMLWithClozeMask(plugin, rich, 'none', tag);
  return { html: whole ? wrapRevealedAnswer(html) : addClozeRevealHighlight(html) };
}

// Join the two sides with the arrow that spells out the card's direction. When the front already
// carries RemNote's own card delimiter, THAT is what becomes the arrow — adding a second one would
// print "front ⇒ ⇒ back".
function joinSides(front: string, back: string, arrow: string): string {
  const f = applyDelimiter(front, arrow);
  if (!back) return f;
  if (!f) return back;
  return hasDelimToken(front) ? `${f}${back}` : `${f}${arrowHTML(arrow)}${back}`;
}

function combineSides(front: SideHTML, back: SideHTML, arrow: string): { html: string; maskedHtml?: string } {
  const html = joinSides(front.html, back.html, arrow);
  if (front.masked === undefined && back.masked === undefined) return { html };
  return { html, maskedHtml: joinSides(front.masked ?? front.html, back.masked ?? back.html, arrow) };
}

export interface NodeRender { html: string; maskedHtml?: string; hasCloze: boolean }

export interface NodeRole {
  /** This Rem holds the answer the card is asking for. */
  isTested: boolean;
  /** This Rem is the one the card belongs to. Its lines are the card's PROMPT, so they are never
   *  hidden as somebody else's answer — even on a backward Descriptor card, where the Rem is the
   *  prompt and the answer lives on an ancestor. */
  isCardRem: boolean;
}

// Render one Rem — both of its sides — into the two variants the widget switches between.
//
// The back side is what makes this plugin work for plain flashcards and not only for clozes: a
// Concept/Descriptor/Question Rem carries its answer in `backText`, so a tree that showed only
// `text` was showing half of every card in it.
export async function renderTreeNode(
  plugin: any,
  rem: any,
  role: NodeRole,
  currentIsQuestionStage: boolean,
  tested: TestedInfo,
  tag = '[CFC]'
): Promise<NodeRender> {
  const front: any[] = Array.isArray(rem?.text) ? rem.text : [];
  const back: any[] = Array.isArray(rem?.backText) ? rem.backText : [];
  const hasBack = back.length > 0;

  // The direction decides both the arrow and which side is this Rem's own answer. Only Rems that
  // actually have a back side are asked — that keeps the extra lookup off most of the tree.
  let direction = 'none';
  if (hasBack) {
    try { direction = (await rem.getPracticeDirection()) || 'none'; } catch {}
  }
  const arrow = ARROW_BY_DIRECTION[direction] || DEFAULT_ARROW;

  // A Descriptor's own text is its label ("abbreviation", "definition", …), never an answer: its
  // backward card tests the concept above it instead. So a descriptor's front is not hidden as an
  // answer, however the direction reads. Only backward Rems pay for the type lookup.
  const isDescriptor = direction === 'backward' ? await isDescriptorRem(rem) : false;
  const frontIsAnswer = direction === 'backward' && !isDescriptor;
  const backIsAnswer = direction === 'forward' || direction === 'both';

  // Without a back side there is nothing a forward/backward card could be testing, so fall back to
  // cloze rendering however the card type read. A REDIRECTED target is exempt: the concept under
  // test answers with its own text, whether or not it carries a back side of its own.
  let side: TestedSide = 'cloze';
  if (role.isTested) {
    side = tested.side;
    if (side !== 'cloze' && !hasBack && !tested.redirected) side = 'cloze';
  }

  let frontSide: SideHTML;
  let backSide: SideHTML;
  if (!role.isTested) {
    const isPrompt = role.isCardRem;
    frontSide = await renderContextSide(plugin, front, frontIsAnswer && !isPrompt, tag);
    backSide = await renderContextSide(plugin, back, backIsAnswer && !isPrompt, tag);
  } else if (side === 'back') {
    frontSide = await renderContextSide(plugin, front, false, tag); // the prompt: always visible
    backSide = await renderTestedSide(plugin, back, currentIsQuestionStage, true, tag);
  } else if (side === 'front') {
    frontSide = await renderTestedSide(plugin, front, currentIsQuestionStage, true, tag);
    // A redirected target is not the card's prompt, so its back side is pure giveaway — a concept's
    // definition names the concept. Drop it on the question stage, leaving the bare "?" that
    // RemNote's own rendering of a backward Descriptor card shows.
    backSide = tested.redirected && currentIsQuestionStage
      ? EMPTY_SIDE
      : await renderContextSide(plugin, back, false, tag);
  } else {
    frontSide = await renderTestedSide(plugin, front, currentIsQuestionStage, false, tag);
    // A back side on a cloze card answers a different card, so it is an "other answer" like any
    // other — hidden when the tree is masked.
    backSide = await renderContextSide(plugin, back, backIsAnswer, tag);
  }

  return { ...combineSides(frontSide, backSide, arrow), hasCloze: richHasCloze(front) || richHasCloze(back) };
}

// The single-line tree used when the card carries "No Hierarchy": the current Rem only, rendered
// by exactly the same rules as it would be inside a full tree. On a backward Descriptor card the
// answer lives on an ancestor that this view does not show, so nothing is masked — and nothing
// leaks either, because the answer is simply absent.
export async function collectCurrentOnly(
  plugin: any,
  rem: any,
  currentIsQuestionStage: boolean,
  tested: TestedInfo,
  tag = '[CFC]'
): Promise<TreeItem[]> {
  const role: NodeRole = { isTested: rem._id === tested.remId, isCardRem: true };
  const rendered = await renderTreeNode(plugin, rem, role, currentIsQuestionStage, tested, tag);
  return [{ id: rem._id, depth: 0, ...rendered, isCurrent: true }];
}

// Depth-first collect the tree rooted at `root`, masking answers per policy.
//  - The line that holds the answer: masked as "?" on the question stage, or revealed
//    (highlighted) on the answer stage. It is never affected by the reveal/hide toggle. Usually
//    that is the card's own line; on a backward Descriptor card it is the concept above it.
//  - Other lines: rendered BOTH ways (`html` revealed, `maskedHtml` with their clozes and their
//    flashcard answers as clickable "…"), so the widget can switch between the two modes without
//    re-collecting.
// `currentIsQuestionStage` selects the tested-line rendering; official Hide/Remove marks are honoured via `opts`.
export async function collectFullTree(
  plugin: any,
  root: any,
  currentRemId: string,
  maxNodes: number,
  currentIsQuestionStage: boolean,
  tested: TestedInfo,
  opts?: QueueAdaptOpts,
  tag = '[CFC]'
): Promise<TreeItem[]> {
  const items: TreeItem[] = [];
  let count = 0;
  async function dfs(rem: any, depth: number, parentId?: string) {
    if (count >= maxNodes) return;
    const id = rem._id;
    const isCardRem = id === currentRemId;
    const isTested = id === tested.remId;
    // Neither the card's own line nor the line holding its answer may be dropped or blanked by a
    // queue-display tag — the review would lose the prompt or the answer.
    const pinned = isCardRem || isTested;
    const removed = !pinned && !!opts?.removeSet?.has(id);
    if (!removed) {
      if (!pinned && opts?.applyHideInQueue && opts?.hideSet?.has(id)) {
        items.push({ id, depth, html: HIDDEN_IN_QUEUE_HTML, isCurrent: false, hasCloze: false, parentId, hasChildren: false });
      } else {
        const rendered = await renderTreeNode(plugin, rem, { isTested, isCardRem }, currentIsQuestionStage, tested, tag);
        items.push({ id, depth, ...rendered, isCurrent: isCardRem, parentId, hasChildren: false });
      }
    }
    count++;
    if (count >= maxNodes) return;
    const children = (await rem.getChildrenRem()) || [];
    for (const ch of children) {
      if (count >= maxNodes) break;
      if (await shouldSkipChildAsMeta(plugin, ch)) continue;
      await dfs(ch, removed ? depth : depth + 1, removed ? parentId : id);
    }
  }
  await dfs(root, 0, undefined);
  // Flag the nodes that actually ended up with a visible child, so the widgets know where to
  // draw a collapse/expand arrow instead of a bullet.
  const parents = new Set(items.map((it) => it.parentId).filter(Boolean) as string[]);
  for (const it of items) it.hasChildren = parents.has(it.id);
  return items;
}
