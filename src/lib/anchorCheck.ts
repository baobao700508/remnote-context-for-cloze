// "Context Hide Others" only does something inside a context tree, and a context tree only
// exists below a Rem tagged "Context Tree". Tagging a Rem with no such ancestor is therefore a
// silent no-op — the command checks for that case and offers to place the missing anchor.
import { POW_CONTEXT_FOR_CLOZE } from './powerups';

export interface OrphanRem {
  remId: string;
  /** The Rem that would be tagged as the anchor. Absent for a top-level Rem, which has no parent. */
  parentId?: string;
  /** How many other children that parent has — i.e. how much surrounding context an anchor buys. */
  siblingCount: number;
}

export interface AnchorPlan {
  /** Selected Rems that already sit under an anchor: safe to tag straight away. */
  anchored: string[];
  /** Selected Rems with no anchor above them: tagging these alone would do nothing. */
  orphans: OrphanRem[];
}

// Ids of every Rem tagged as a context anchor, fetched once for the whole plan.
async function anchorIds(plugin: any): Promise<Set<string>> {
  try {
    const power = await plugin.powerup.getPowerupByCode(POW_CONTEXT_FOR_CLOZE);
    const tagged = power ? (await power.taggedRem()) || [] : [];
    return new Set(tagged.map((r: any) => r._id));
  } catch {
    return new Set();
  }
}

// Sort the selection into "already covered by an anchor" and "not covered, and here is the parent
// we would offer to tag". A Rem that is itself tagged as an anchor counts as covered — the review
// widgets root the tree at the card's own Rem in that case, so there is nothing to offer.
export async function planHideOtherAnswers(plugin: any, remIds: string[]): Promise<AnchorPlan> {
  const anchors = await anchorIds(plugin);
  const anchored: string[] = [];
  const orphans: OrphanRem[] = [];

  for (const remId of remIds) {
    const rem = await plugin.rem.findOne(remId);
    if (!rem) continue;

    let hasAnchor = anchors.has(rem._id);
    let cur = rem;
    for (let i = 0; !hasAnchor && cur?.parent && i < 2048; i++) {
      const parent = await plugin.rem.findOne(cur.parent);
      if (!parent) break;
      if (anchors.has(parent._id)) { hasAnchor = true; break; }
      cur = parent;
    }

    if (hasAnchor) {
      anchored.push(remId);
      continue;
    }

    const parent = rem.parent ? await plugin.rem.findOne(rem.parent) : null;
    const siblings = parent ? ((await parent.getChildrenRem()) || []).filter((c: any) => c._id !== remId) : [];
    orphans.push({ remId, parentId: parent?._id, siblingCount: siblings.length });
  }

  return { anchored, orphans };
}

export async function addPowerupToRems(plugin: any, remIds: string[], code: string): Promise<number> {
  const rems = (await plugin.rem.findMany(remIds)) || [];
  await Promise.all(rems.map((r: any) => r.addPowerup(code)));
  return rems.length;
}
