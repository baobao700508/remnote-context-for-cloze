import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';
import { useRevealDelegation } from '../lib/revealInteraction';
import { useRevealedAnswer } from '../lib/useRevealedAnswer';
import {
  collectCurrentOnly,
  collectFullTree,
  collectQueueDisplaySets,
  getCurrentCardRemId,
  getNearestAnchor,
  getTestedTarget,
  TreeItem,
} from '../lib/contextTree';
import { ContextTreeView } from '../lib/contextTreeView';
import { LABEL_HIDE_OTHER_ANSWERS, POW_CONTEXT_FOR_CLOZE as POW_CODE, POW_HIDE_OTHER_ANSWERS } from '../lib/powerups';

const LOG = '[CFC][A]';
// This widget renders the answer stage of the card.
const QUESTION_STAGE = false;

function Widget() {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const plugin = usePlugin();
  const [errorCount, setErrorCount] = React.useState(0);
  const MAX_ERRORS = 10;

  const ctx = useRunAsync(async () => {
    try {
      return await plugin.widget.getWidgetContext();
    } catch (e) {
      console.error(`${LOG} getWidgetContext failed:`, e);
      setErrorCount((prev) => prev + 1);
      return null;
    }
  }, []) as any;

  // Reliable reveal state (event-driven + polled fallback; see useRevealedAnswer for why).
  const revealed = useRevealedAnswer(plugin);

  const debug = useRunAsync(async () => !!(await plugin.settings.getSetting('debug')), []);

  // Start-collapsed preference. `undefined` while the setting is still loading — the tree is only
  // rendered once it resolves, so a branch never flashes open before collapsing.
  const startCollapsedSetting = useRunAsync(
    async () => (await plugin.settings.getSetting('startCollapsed')) !== false,
    []
  );

  const { items, enabled, defaultMasked } = (useRunAsync(async () => {
    try {
      const isDebug = await plugin.settings.getSetting('debug');

      if (!ctx?.remId) {
        setErrorCount((prev) => prev + 1);
        return { items: [] as TreeItem[], enabled: false };
      }
      if (!revealed) {
        return { items: [], enabled: false };
      }

      const maskId = await getCurrentCardRemId(plugin, ctx);
      const anchor = await getNearestAnchor(plugin, maskId || ctx.remId, POW_CODE);
      if (!anchor) {
        setErrorCount((prev) => prev + 1);
        return { items: [], enabled: false };
      }
      setErrorCount(0);

      const rawNodes = await plugin.settings.getSetting('maxNodes');
      let mn = Number(rawNodes); if (!Number.isFinite(mn) || mn < 0) mn = 10000;
      const maxNodes = mn;

      // Queue-display tag sets (Hide/Remove in Queue, No Hierarchy, and the parent/grandparent variants).
      const { hideSet, removeSet, noHierarchySet } = await collectQueueDisplaySets(plugin);

      // Hide Other Answers on the current card → START with the other answers in the tree masked as
      // clickable "…": every other line's clozes, and the answer side of every flashcard in it.
      // From here on it is only a default: the eye button in the widget flips the mode for this
      // card without touching the tag.
      const defaultMasked = await (async () => {
        try {
          const power = await plugin.powerup.getPowerupByCode(POW_HIDE_OTHER_ANSWERS);
          const tagged = power ? await power.taggedRem() : [];
          const set = new Set((tagged || []).map((r: any) => r._id));
          return set.has(maskId || ctx.remId);
        } catch {
          return false;
        }
      })();

      // What this card asks for, and which Rem holds that answer — the card's own Rem, except on a
      // backward Descriptor card, where RemNote tests the concept above it. Decides what is masked
      // and which way the direction arrows point.
      const tested = await getTestedTarget(plugin, ctx, maskId || ctx.remId);

      // No Hierarchy on the current card: show only the current line (matches native).
      if (noHierarchySet.has(maskId || ctx.remId)) {
        const cur = await plugin.rem.findOne(maskId || ctx.remId);
        if (!cur) return { items: [], enabled: false } as any;
        const only = await collectCurrentOnly(plugin, cur, QUESTION_STAGE, tested, LOG);
        return { items: only, defaultMasked, enabled: true } as any;
      }

      const items = await collectFullTree(plugin, anchor, maskId || ctx.remId, maxNodes, QUESTION_STAGE, tested, { hideSet, removeSet, applyHideInQueue: false }, LOG);
      if (isDebug) console.log(`${LOG} generated`, items.length, 'items');
      return { items, defaultMasked, enabled: true };
    } catch (e) {
      console.error(`${LOG} useRunAsync error:`, e);
      setErrorCount((prev) => prev + 1);
      return { items: [], enabled: false };
    }
  }, [ctx?.remId, revealed]) || { items: [], defaultMasked: false, enabled: false }) as any;

  // Cloze mode for the card in front of us. `null` = follow the card's own default; the eye
  // button pins it either way until the tree changes (next card, or the question→answer flip).
  const [maskOverride, setMaskOverride] = React.useState<boolean | null>(null);
  // Local view of the card's "Context Hide Others" tag. Tagging is written straight to the
  // Rem, but the collected tree is not re-read for it, so we track the new value here to keep the
  // toolbar honest for the rest of this card.
  const [taggedOverride, setTaggedOverride] = React.useState<boolean | null>(null);
  React.useEffect(() => { setMaskOverride(null); setTaggedOverride(null); }, [items]);
  const tagged = taggedOverride ?? !!defaultMasked;
  const masked = maskOverride ?? tagged;

  // Nothing to switch between unless some OTHER line holds an answer of its own — a cloze, or the
  // back side of a flashcard.
  const canToggleMask = React.useMemo(
    () => (items as TreeItem[]).some((it) => !!it.maskedHtml),
    [items]
  );
  const currentRemId = React.useMemo(
    () => (items as TreeItem[]).find((it) => it.isCurrent)?.id,
    [items]
  );

  // Make the current mode stick: tag the Rem to keep the other answers hidden, or untag it to keep
  // them revealed. This is the one place the plugin writes to the knowledge base.
  const persistMask = React.useCallback(async () => {
    if (!currentRemId) return;
    try {
      const rem = await plugin.rem.findOne(currentRemId);
      if (!rem) return;
      if (masked) await rem.addPowerup(POW_HIDE_OTHER_ANSWERS);
      else await rem.removePowerup(POW_HIDE_OTHER_ANSWERS);
      setTaggedOverride(masked);
      setMaskOverride(null);
      await plugin.app.toast(
        masked
          ? 'Tagged: the other answers stay hidden for this Rem'
          : 'Untagged: the other answers stay revealed for this Rem'
      );
    } catch (e) {
      console.error(`${LOG} could not update the ${LABEL_HIDE_OTHER_ANSWERS} tag:`, e);
      await plugin.app.toast(`Could not update the "${LABEL_HIDE_OTHER_ANSWERS}" tag`);
    }
  }, [plugin, currentRemId, masked]);

  // Wire up click-to-reveal for the masked answers (sibling clozes and hidden back sides).
  useRevealDelegation(rootRef, items);

  if (errorCount >= MAX_ERRORS) {
    console.error(`${LOG} reached max errors, stopping render`);
    return (
      <div className="cfc-container" style={{ padding: '10px', color: 'red', border: '1px solid red' }}>
        <div>Plugin encountered errors and stopped. Check the console log.</div>
      </div>
    );
  }
  if (!revealed) return null;
  if (!enabled) return null; // no anchor in ancestry => render nothing
  if (!items.length) {
    return debug ? (
      <div className="cfc-container"><div className="cfc-empty">No extra context</div></div>
    ) : null;
  }
  if (startCollapsedSetting === undefined) return null; // setting still loading

  return (
    <div ref={rootRef} className="cfc-container" style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, maxWidth: '100%', borderTop: '1px solid var(--rn-clr-border, #e4e8ef)', paddingTop: 6, overflowX: 'hidden', overflowY: 'visible' }}>
      <ContextTreeView
        items={items}
        startCollapsed={startCollapsedSetting !== false}
        masked={masked}
        onToggleMasked={canToggleMask ? () => setMaskOverride(!masked) : undefined}
        onPersistMask={canToggleMask && currentRemId && masked !== tagged ? persistMask : undefined}
      />
    </div>
  );
}

renderWidget(Widget);
