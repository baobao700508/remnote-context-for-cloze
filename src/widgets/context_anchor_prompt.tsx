// Shown when "Context: Hide Other Answers for This Rem" is run on a Rem that has no context anchor
// above it. Without an anchor there is no context tree at all, so the tag would sit there doing
// nothing — this popup explains that and offers to place the missing anchor on the parent.
//
// Tagging the parent is not a neutral act: an anchor cascades to EVERY descendant, so all of the
// parent's other cards start showing a context tree too. That consequence is stated in the dialog
// rather than buried, because it is the reason the command asks instead of just doing it.
import { RemViewer, renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';
import { addPowerupToRems, OrphanRem } from '../lib/anchorCheck';
import {
  LABEL_CONTEXT_TREE,
  LABEL_HIDE_OTHER_ANSWERS,
  POW_CONTEXT_FOR_CLOZE,
  POW_HIDE_OTHER_ANSWERS,
} from '../lib/powerups';

const LOG = '[CFC][AnchorPrompt]';
const MAX_PARENTS_SHOWN = 4;

interface PromptData {
  orphans: OrphanRem[];
  /** Selected Rems that already had an anchor and were tagged before this popup opened. */
  taggedAlready: number;
}

const BTN_BASE: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: '0.9rem',
  cursor: 'pointer',
  userSelect: 'none',
  border: '1px solid var(--rn-clr-border, #e4e8ef)',
  background: 'transparent',
  color: 'var(--rn-clr-content-primary, inherit)',
};

function Widget() {
  const plugin = usePlugin();
  const [busy, setBusy] = React.useState(false);
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = React.useState(0);

  const data = useRunAsync(async () => {
    const ctx = await plugin.widget.getWidgetContext<any>();
    return (ctx?.contextData || null) as PromptData | null;
  }, []);

  const orphans = data?.orphans || [];
  const parentIds = React.useMemo(
    () => Array.from(new Set(orphans.map((o) => o.parentId).filter(Boolean) as string[])),
    [orphans]
  );
  const withSiblings = orphans.filter((o) => o.siblingCount > 0).length;
  const canTagParents = parentIds.length > 0;

  const finish = React.useCallback(
    async (tagParents: boolean) => {
      if (busy) return;
      setBusy(true);
      try {
        if (tagParents && parentIds.length) {
          await addPowerupToRems(plugin, parentIds, POW_CONTEXT_FOR_CLOZE);
        }
        await addPowerupToRems(plugin, orphans.map((o) => o.remId), POW_HIDE_OTHER_ANSWERS);
        await plugin.app.toast(
          tagParents
            ? `Tagged ${parentIds.length} parent Rem(s) as "${LABEL_CONTEXT_TREE}" and ${orphans.length} Rem(s) as "${LABEL_HIDE_OTHER_ANSWERS}"`
            : `Tagged ${orphans.length} Rem(s) as "${LABEL_HIDE_OTHER_ANSWERS}" — inactive until an ancestor carries "${LABEL_CONTEXT_TREE}"`
        );
      } catch (e) {
        console.error(`${LOG} tagging failed:`, e);
        await plugin.app.toast('Could not add the tags — see the console log');
      } finally {
        setBusy(false);
        await plugin.widget.closePopup();
      }
    },
    [plugin, busy, parentIds, orphans]
  );

  // Left-to-right, matching the rendered order; the primary action is the one focus starts on.
  const actions = React.useMemo(() => {
    const list: { key: string; label: string; primary?: boolean; run: () => void }[] = [
      { key: 'cancel', label: 'Cancel', run: () => { void plugin.widget.closePopup(); } },
      {
        key: 'only',
        label: `Tag only ${orphans.length === 1 ? 'this Rem' : 'these Rems'}`,
        primary: !canTagParents,
        run: () => { void finish(false); },
      },
    ];
    if (canTagParents) {
      list.push({
        key: 'both',
        label: `Tag ${orphans.length === 1 ? 'the parent' : 'the parents'} too`,
        primary: true,
        run: () => { void finish(true); },
      });
    }
    return list;
  }, [plugin, orphans.length, canTagParents, finish]);

  const primaryIdx = Math.max(0, actions.findIndex((a) => a.primary));

  // Focus the confirming button as soon as the dialog has its data, so Enter works without a
  // click first — and so the arrow keys have somewhere to start from.
  React.useEffect(() => {
    if (!data) return;
    setFocusIdx(primaryIdx);
    buttonRefs.current[primaryIdx]?.focus();
    // The popup iframe may only take focus a beat after it opens, in which case the call above
    // lands on nothing. One retry costs nothing and makes the keys work on the first press.
    const retry = setTimeout(() => buttonRefs.current[primaryIdx]?.focus(), 60);
    return () => clearTimeout(retry);
  }, [data, primaryIdx]);

  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (!busy) void plugin.widget.closePopup();
      return;
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    setFocusIdx((prev) => {
      const next = (prev + step + actions.length) % actions.length;
      buttonRefs.current[next]?.focus();
      return next;
    });
    // Enter and Space need no handling of their own: the focused element is a real <button>.
  }, [plugin, busy, actions.length]);

  if (!data) return null;

  const one = orphans.length === 1;

  return (
    <div
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={{
        padding: 16,
        fontSize: '0.92rem',
        lineHeight: 1.5,
        color: 'var(--rn-clr-content-primary, inherit)',
        background: 'var(--rn-clr-background-primary, transparent)',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 8 }}>
        No context anchor above {one ? 'this Rem' : 'these Rems'}
      </div>

      <p style={{ margin: '0 0 10px' }}>
        “{LABEL_HIDE_OTHER_ANSWERS}” only changes how a <b>context tree</b> is displayed, and a context
        tree appears only below a Rem tagged “{LABEL_CONTEXT_TREE}”. {one ? 'This Rem has' : 'These Rems have'} no
        such ancestor, so the tag alone would have no visible effect.
      </p>

      {canTagParents && (
        <>
          <p style={{ margin: '0 0 6px' }}>
            {one ? 'Its parent' : 'Their parents'} can become that anchor:
          </p>
          <div
            style={{
              margin: '0 0 10px', padding: '6px 10px', borderRadius: 6,
              background: 'var(--rn-clr-background-secondary, rgba(148,163,184,0.12))',
            }}
          >
            {parentIds.slice(0, MAX_PARENTS_SHOWN).map((id) => (
              <div key={id} style={{ padding: '2px 0' }}>
                <RemViewer remId={id} width="100%" />
              </div>
            ))}
            {parentIds.length > MAX_PARENTS_SHOWN && (
              <div style={{ padding: '2px 0', color: 'var(--rn-clr-content-secondary, #64748b)' }}>
                …and {parentIds.length - MAX_PARENTS_SHOWN} more
              </div>
            )}
          </div>

          <p style={{ margin: '0 0 10px' }}>
            <b>What this changes:</b> the anchor applies to the whole subtree — every card under{' '}
            {one ? 'that parent' : 'those parents'}, not just the one you selected, will show a context
            tree during review.
          </p>

          <p style={{ margin: '0 0 14px', color: 'var(--rn-clr-content-secondary, #64748b)' }}>
            {withSiblings === orphans.length
              ? one
                ? `Its parent has ${orphans[0].siblingCount} other child/children, which become the surrounding context.`
                : 'Each parent has other children, which become the surrounding context.'
              : one
              ? 'Note: this Rem has no siblings, so the context tree would show only the parent line and this Rem’s own descendants. A higher ancestor may be the better anchor.'
              : 'Note: some of these Rems have no siblings, so their context would be thin. A higher ancestor may be the better anchor for those.'}
          </p>
        </>
      )}

      {!canTagParents && (
        <p style={{ margin: '0 0 14px' }}>
          {one ? 'This Rem is' : 'These Rems are'} at the top level, so there is no parent to use as an
          anchor. Tag a Rem higher in the hierarchy with “{LABEL_CONTEXT_TREE}” yourself, or continue
          and the tag will start working once one exists.
        </p>
      )}

      {data.taggedAlready > 0 && (
        <p style={{ margin: '0 0 14px', color: 'var(--rn-clr-content-secondary, #64748b)' }}>
          {data.taggedAlready} other selected Rem(s) already sit under an anchor and have been tagged.
        </p>
      )}

      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
      >
        <span
          style={{
            marginRight: 'auto', fontSize: '0.78rem',
            color: 'var(--rn-clr-content-tertiary, rgba(100,116,139,0.75))',
          }}
        >
          ← → choose · ↵ confirm · Esc cancel
        </span>
        {actions.map((action, i) => (
          <button
            key={action.key}
            ref={(el) => { buttonRefs.current[i] = el; }}
            disabled={busy}
            onClick={action.run}
            onFocus={() => setFocusIdx(i)}
            style={{
              ...BTN_BASE,
              ...(action.primary
                ? {
                    border: '1px solid var(--rn-clr-accent, #0969da)',
                    background: 'var(--rn-clr-accent, #0969da)',
                    color: '#fff',
                  }
                : null),
              // Drawn from state rather than left to :focus-visible, which does not always paint
              // for focus moved programmatically — the selected button must always be obvious.
              boxShadow: focusIdx === i ? '0 0 0 2px var(--rn-clr-accent, #0969da)' : undefined,
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

renderWidget(Widget);
