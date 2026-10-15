// Power-up slot children ("Priority", "Next Rep Date", "Sources", a PDF's "Title"…) are metadata
// RemNote materialises under a tagged Rem — never context a reader wants inside a cloze's context
// tree. This mirrors what incremental-everything does in its own lib/powerupSlotFilter.ts, for two
// families of power-up:
//
//   1. The four power-ups incremental-everything registers. This plugin does not own them; it only
//      reads their slot definitions so the context tree hides what the queue already hides.
//   2. RemNote's built-ins, enumerated from the SDK's own PowerupSlotCodeMap rather than a
//      hand-copied list, so the coverage tracks the SDK version instead of drifting from it.
//
// Storage note: current RemNote builds no longer give built-in (or hidden) slots a Rem
// representation — `getPowerupSlotByCode` rejects both with "no supported Rem representation,
// although legacy slot Rem may still exist". That last clause is why the built-in half is worth
// keeping: knowledge bases written before the storage overhaul still carry those legacy slot Rems
// as real children, and they are exactly what shows up in an old rem's context tree. For the same
// reason nothing here calls `getPowerupSlotByCode`; slot definitions are resolved by walking the
// power-up rem's children, and the name check below stands in wherever no definition rem exists.

import { BuiltInPowerupCodes, PowerupSlotCodeMap } from '@remnote/plugin-sdk';

// The power-up codes registered by incremental-everything. A code is a stored identity, so this
// list only ever grows — it is not rewritten when a label changes.
const INCREMENTAL_POWERUP_CODES = ['incremental', 'cardPriority', 'dismissed', 'videoExtract'];

// Slot display names as incremental-everything registers them. Only a backstop: when its power-up
// rems resolve we read the real names off the slot definitions instead (which also covers slots
// added by a future version of that plugin).
const INCREMENTAL_SLOT_NAMES = [
  'Priority', 'Next Rep Date', 'History', 'Created', 'Priority Value', 'Priority Source',
  'Last Updated', 'Dismissed Date', 'Video URL', 'Start Time', 'End Time',
];

// Every built-in power-up that declares slots, as `code -> slot names`, straight from the SDK.
const BUILTIN_SLOTS: Array<[string, string[]]> = Object.entries(PowerupSlotCodeMap as Record<string, Record<string, string>>)
  .map(([code, slots]) => [code, Object.keys(slots)] as [string, string[]])
  .filter(([, names]) => names.length > 0);

// Tolerant comparison: 'Read Percent' === 'ReadPercent' === 'readPercent'.
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

interface SlotIndex {
  /** Ids of slot DEFINITION rems — what a property child references and is tagged with. */
  slotDefIds: Set<string>;
  /** Normalised slot name -> the power-up codes that declare it, for the name check. */
  nameOwners: Map<string, string[]>;
}

// Slot definitions are stable for the session, so resolve them once. A knowledge base without
// incremental-everything simply contributes nothing from that half.
let indexPromise: Promise<SlotIndex> | null = null;

const EMPTY_INDEX: SlotIndex = { slotDefIds: new Set(), nameOwners: new Map() };

async function buildSlotIndex(plugin: any): Promise<SlotIndex> {
  const slotDefIds = new Set<string>();
  const nameOwners = new Map<string, string[]>();
  const own = (name: string, code: string) => {
    const key = normalize(name);
    if (!key) return;
    const owners = nameOwners.get(key);
    if (!owners) nameOwners.set(key, [code]);
    else if (!owners.includes(code)) owners.push(code);
  };

  // Built-in names need no lookup at all: `parent.hasPowerup(code)` is the guard, and it answers
  // correctly whether or not the slot was ever a Rem.
  for (const [code, names] of BUILTIN_SLOTS) for (const name of names) own(name, code);

  // Walk each power-up rem's children for its slot definitions. `getPowerupSlotByCode` is avoided
  // deliberately (see the header): it throws for hidden slots, and walking finds every slot the
  // power-up declares, including ones this plugin has never heard of.
  const codes = [...INCREMENTAL_POWERUP_CODES, ...BUILTIN_SLOTS.map(([code]) => code)];
  await Promise.all(
    codes.map(async (code) => {
      let powerup: any = null;
      try {
        powerup = await plugin.powerup.getPowerupByCode(code);
      } catch {
        return; // Not present in this knowledge base, or not exposed as a Rem.
      }
      if (!powerup) return;
      let children: any[] = [];
      try {
        children = (await powerup.getChildrenRem()) || [];
      } catch {
        return;
      }
      for (const child of children) {
        try {
          if (!(await child.isPowerupSlot())) continue;
        } catch {
          continue;
        }
        slotDefIds.add(child._id);
        try {
          const name = ((await plugin.richText.toString(child.text || [])) || '').trim();
          if (name) own(name, code);
        } catch {}
      }
    })
  );

  // Backstop for the plugin family, in case its power-up rems did not resolve above.
  for (const code of INCREMENTAL_POWERUP_CODES) for (const name of INCREMENTAL_SLOT_NAMES) own(name, code);

  return { slotDefIds, nameOwners };
}

function getSlotIndex(plugin: any): Promise<SlotIndex> {
  if (!indexPromise) indexPromise = buildSlotIndex(plugin).catch(() => EMPTY_INDEX);
  return indexPromise;
}

/** Drop the memoised slot index (power-ups re-registered, or a plugin installed mid-session). */
export function clearPowerupSlotIndex(): void {
  indexPromise = null;
}

// True when `rem` is a power-up property child. Three signals, cheapest first:
//   1. Text reference — a property child's text is a single reference to its slot definition
//      (that is why the tree used to print a bare "Priority" / "Next Rep Date" line).
//   2. Tag — the same child is tagged with that slot definition.
//   3. Name + parent guard — for slots with no definition Rem: a known slot name on a child whose
//      PARENT carries a power-up that actually declares that name. The guard is what keeps a user's
//      own line reading "Priority" (or "Title", or "Status") in the tree.
export async function isPowerupSlotChild(plugin: any, rem: any): Promise<boolean> {
  const { slotDefIds, nameOwners } = await getSlotIndex(plugin);

  const rich = Array.isArray(rem?.text) ? rem.text : [];
  for (const el of rich) {
    if (el != null && typeof el === 'object' && el.i === 'q' && el._id && slotDefIds.has(el._id)) return true;
  }

  if (slotDefIds.size > 0) {
    try {
      for (const tag of (await rem.getTagRems()) || []) {
        if (slotDefIds.has(tag._id)) return true;
      }
    } catch {}
  }

  try {
    if (!rem.parent) return false;
    const raw = ((await plugin.richText.toString(rich)) || '').trim();
    // A resolved reference prints as "[Priority]"; strip one bracket pair before matching.
    const text = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1).trim() : raw;
    const owners = text ? nameOwners.get(normalize(text)) : undefined;
    if (!owners) return false;
    const parent = await plugin.rem.findOne(rem.parent);
    if (!parent) return false;
    for (const code of owners) {
      if (await parent.hasPowerup(code as BuiltInPowerupCodes | string)) return true;
    }
  } catch {}

  return false;
}
