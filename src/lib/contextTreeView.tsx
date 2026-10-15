// Collapsible rendering of the collected context tree, shared by the question / answer widgets.
//
// Why collapse at all: the tree used to render fully expanded, so a deep descendant of the tested
// line could spoil (or heavily hint at) the answer before you recalled it. Now every branch starts closed except the path that leads to the card under review — the
// card itself is always visible, its own children are not — and each branch that hides something
// carries an arrow you can click to open it (same affordance as incremental-everything's
// Rem History rows).
//
// The tree also renders in one of two modes — every OTHER answer in it revealed, or all of them
// masked as "…". "Answer" means both kinds: a cloze inside a line, and the back side of a
// flashcard line (front ⇒ back). Which mode you start in is decided by the card (the "Context Hide
// Others" power-up); the eye button in the top-right switches between them for the card in front
// of you, so you can hide answers that turn out to leak a hint, or reveal them when the masked
// tree stops making sense.
//
import { usePlugin, useRunAsync } from '@remnote/plugin-sdk';
import * as React from 'react';
import { TreeItem } from './contextTree';
import { DEFAULT_CLOSE_DELAY_MS, RefTarget, useRefDelegation } from './refInteraction';
import { ACTION_HIDE_OTHER_ANSWERS, ACTION_SHOW_OTHER_ANSWERS, LABEL_HIDE_OTHER_ANSWERS } from './powerups';

const INDENT_PX = 24;

// Ancestors of the current card, so the tested line is never hidden behind a closed arrow.
// Falls back to "expand everything" when the tree should not start collapsed.
export function defaultExpandedIds(items: TreeItem[], startCollapsed: boolean): Set<string> {
  if (!startCollapsed) return new Set(items.map((it) => it.id));
  const byId = new Map(items.map((it) => [it.id, it] as const));
  const expanded = new Set<string>();
  for (const it of items) {
    if (!it.isCurrent) continue;
    let cur: TreeItem | undefined = it;
    // Guard against a malformed chain; the depth of a real context tree is tiny.
    for (let i = 0; cur?.parentId && i < 256; i++) {
      expanded.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
  }
  return expanded;
}

// A node shows only when every ancestor between it and the root is open.
function visibleItems(items: TreeItem[], expanded: Set<string>): TreeItem[] {
  const byId = new Map(items.map((it) => [it.id, it] as const));
  return items.filter((it) => {
    let parentId = it.parentId;
    for (let i = 0; parentId && i < 256; i++) {
      if (!expanded.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId;
    }
    return true;
  });
}

// Centred on the first text line of the item (the li is a flex row aligned to its top), so the
// arrow/bullet lines up with the text next to it however long that text wraps.
const MARKER_WIDTH = 14;
const MARKER_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: MARKER_WIDTH,
  minHeight: '1.5em',
  marginRight: 4,
  flex: '0 0 auto',
  userSelect: 'none',
  color: 'var(--rn-clr-content-tertiary, rgba(100,116,139,0.75))',
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: `rotate(${open ? 0 : -90}deg)`,
        transitionProperty: 'transform',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDuration: '150ms',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Eye / eye-with-a-slash, drawn in the same monochrome line style as the chevron so the two
// controls read as one family (an emoji 👁️/🙈 pair would import a second visual language and
// renders differently on every platform).
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.6 12S5.3 5.5 12 5.5 22.4 12 22.4 12 18.7 18.5 12 18.5 1.6 12 1.6 12Z" />
      <circle cx="12" cy="12" r="3.2" />
      {off && <line x1="3" y1="21" x2="21" y2="3" />}
    </svg>
  );
}

// Which toolbar button the pointer (or focus) is currently on.
type HintKey = 'eye' | 'persist';

// A label/tag outline — the action it stands for is literally "put a tag on this Rem" (or, with
// the slash, take it off). Drawn in the same stroke language as the eye and the chevron.
function TagIcon({ off }: { off: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.6" cy="7.6" r="1.3" />
      {off && <line x1="3" y1="21" x2="21" y2="3" />}
    </svg>
  );
}

interface IconButtonProps {
  className: string;
  label: string;
  /** Identifies this button to the toolbar's hover explanation. */
  hintKey: HintKey;
  pressed?: boolean;
  disabled?: boolean;
  onActivate: () => void;
  onHint: (hint: HintKey | null) => void;
  children: React.ReactNode;
}

// Every control in the toolbar swallows its click and its Enter/Space: inside the queue those
// would otherwise bubble up and reveal the answer / rate the card.
function IconButton({ className, label, hintKey, pressed, disabled, onActivate, onHint, children }: IconButtonProps) {
  const fire = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) onActivate();
  };
  return (
    <span
      className={className}
      role="button"
      tabIndex={0}
      aria-pressed={pressed}
      aria-label={label}
      aria-disabled={disabled}
      onClick={fire}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fire(e); }}
      onMouseEnter={() => onHint(hintKey)}
      onMouseLeave={() => onHint(null)}
      onFocus={() => onHint(hintKey)}
      onBlur={() => onHint(null)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, userSelect: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : undefined,
        color: 'var(--rn-clr-content-secondary, rgba(100,116,139,0.9))',
      }}
    >
      {children}
    </span>
  );
}

interface MarkerProps { hasChildren: boolean; open: boolean; onToggle: () => void }

function Marker({ hasChildren, open, onToggle }: MarkerProps) {
  if (!hasChildren) {
    return <span className="cfc-bullet" style={{ ...MARKER_STYLE, fontSize: '0.8em' }}>•</span>;
  }
  // Clicks and Enter/Space are swallowed here: inside the queue they would otherwise bubble up
  // and reveal the answer / rate the card.
  const toggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };
  return (
    <span
      className="cfc-toggle"
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={open ? 'Collapse' : 'Expand'}
      title={open ? 'Collapse' : 'Expand'}
      onClick={toggle}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(e); }}
      style={{ ...MARKER_STYLE, cursor: 'pointer', lineHeight: 1 }}
    >
      <Chevron open={open} />
    </span>
  );
}

export interface ContextTreeViewProps {
  items: TreeItem[];
  /** Start with every branch closed except the path down to the card under review. */
  startCollapsed: boolean;
  /** Are the other lines' answers — their clozes and their back sides — currently masked as "…"? */
  masked: boolean;
  /** Flip that mode. Omit to hide the button — e.g. when no other line holds an answer. */
  onToggleMasked?: () => void;
  /**
   * Write the current mode into the card itself, by adding or removing the "Context Hide Others"
   * tag. Provided only while the mode on screen differs from what the tag says, so the button
   * appears exactly when there is a divergence worth keeping.
   */
  onPersistMask?: () => void | Promise<void>;
}

export function ContextTreeView({ items, startCollapsed, masked, onToggleMasked, onPersistMask }: ContextTreeViewProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => defaultExpandedIds(items, startCollapsed));

  // Re-seed whenever the tree changes (new card, or the question→answer flip): expansion is
  // per-card UI state and must not leak from one card to the next.
  React.useEffect(() => {
    setExpanded(defaultExpandedIds(items, startCollapsed));
  }, [items, startCollapsed]);

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visible = React.useMemo(() => visibleItems(items, expanded), [items, expanded]);

  // Rem references in the tree: hover previews and click-to-open, wired in refInteraction.
  // Opening one navigates the pane, which ENDS the review session — so a click only arms this
  // confirmation, it never navigates on its own.
  const plugin = usePlugin();
  const listRef = React.useRef<HTMLUListElement>(null);
  const [pendingRef, setPendingRef] = React.useState<RefTarget | null>(null);
  React.useEffect(() => { setPendingRef(null); }, [items]);
  const closeDelay = useRunAsync(async () => {
    const raw = Number(await plugin.settings.getSetting('previewCloseDelay'));
    return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_CLOSE_DELAY_MS;
  }, []);
  useRefDelegation(listRef, plugin, items, setPendingRef, closeDelay ?? DEFAULT_CLOSE_DELAY_MS);
  const confirmOpen = React.useCallback(async () => {
    const target = pendingRef;
    setPendingRef(null);
    if (!target?.id) return;
    try {
      const rem = await plugin.rem.findOne(target.id);
      if (rem) await plugin.window.openRem(rem);
      else await plugin.app.toast('That Rem no longer exists');
    } catch (e) {
      console.error('[CFC] could not open the referenced Rem:', e);
      await plugin.app.toast('Could not open that Rem');
    }
  }, [plugin, pendingRef]);

  // Inline hover/focus explanation for the toolbar buttons, and a guard against a double write
  // while the tag is being applied.
  const [hint, setHint] = React.useState<HintKey | null>(null);
  const [persisting, setPersisting] = React.useState(false);
  React.useEffect(() => { setHint(null); setPersisting(false); }, [items]);

  const eyeLabel = masked ? 'Reveal the other answers' : 'Hide the other answers';
  const persistLabel = masked
    ? `${ACTION_HIDE_OTHER_ANSWERS} — adds the "${LABEL_HIDE_OTHER_ANSWERS}" tag`
    : `${ACTION_SHOW_OTHER_ANSWERS} — removes the "${LABEL_HIDE_OTHER_ANSWERS}" tag`;
  const hintText = hint === 'eye' ? eyeLabel : hint === 'persist' ? persistLabel : null;

  return (
    <>
      {/* Hover affordance for the arrows. It lives here rather than in the plugin-level CSS
          because that stylesheet is injected into the host document, not into this widget iframe. */}
      <style>{`
        .cfc-toggle, .cfc-mask-toggle, .cfc-mask-persist { border-radius: 4px; }
        .cfc-toggle:hover, .cfc-mask-toggle:hover, .cfc-mask-persist:hover { background: var(--rn-clr-background--hovered, rgba(148,163,184,0.22)); color: var(--rn-clr-content-primary, inherit); }
        .cfc-toggle:focus-visible, .cfc-mask-toggle:focus-visible, .cfc-mask-persist:focus-visible { outline: 2px solid var(--rn-clr-accent, #0969da); outline-offset: 1px; }
        .cfc-mask-toggle, .cfc-mask-persist { opacity: 0.55; transition: opacity 150ms ease; }
        .cfc-mask-toggle:hover, .cfc-mask-toggle:focus-visible, .cfc-mask-persist:hover, .cfc-mask-persist:focus-visible { opacity: 1; }
        /* Rem references. Our own markup, not the host's — see clozeMask/refInteraction — so it is
           styled here to read like a native reference instead of like revealed cloze text. */
        .cfc-ref {
          color: var(--rn-clr-content-accent, var(--rn-clr-accent, #3b82f6));
          text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px;
          border-radius: 3px; padding: 0 1px; cursor: pointer;
        }
        .cfc-ref:hover { background: var(--rn-clr-background--hovered, rgba(59,130,246,0.12)); text-decoration-thickness: 2px; }
        .cfc-ref:focus-visible { outline: 2px solid var(--rn-clr-accent, #0969da); outline-offset: 1px; }
        .cfc-confirm-btn { border-radius: 5px; padding: 2px 10px; cursor: pointer; user-select: none; border: 1px solid var(--rn-clr-border, #e4e8ef); }
        .cfc-confirm-btn:hover { background: var(--rn-clr-background--hovered, rgba(148,163,184,0.22)); }
      `}</style>
      {onToggleMasked && (
        // Top-right, on its own row: out of the reading flow of the tree, in the corner where a
        // widget affordance is expected, and it can never overlap a wrapped line the way an
        // absolutely positioned button would. The hover explanation is laid out in this same row
        // rather than floated over the page — a floating tooltip would be clipped by the widget
        // iframe, which is only as tall as its content.
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minHeight: 20 }}>
          {hintText && (
            <span
              style={{
                fontSize: '0.78rem', lineHeight: 1.25, textAlign: 'right', minWidth: 0,
                color: 'var(--rn-clr-content-secondary, rgba(100,116,139,0.9))',
              }}
            >
              {hintText}
            </span>
          )}
          {onPersistMask && (
            <IconButton
              className="cfc-mask-persist"
              label={persistLabel}
              hintKey="persist"
              disabled={persisting}
              onActivate={() => {
                if (persisting) return;
                setPersisting(true);
                // The button disappears once the tag matches the screen, so no mouseleave will
                // ever arrive to clear the explanation — drop it here.
                Promise.resolve(onPersistMask()).finally(() => { setPersisting(false); setHint(null); });
              }}
              onHint={setHint}
            >
              <TagIcon off={!masked} />
            </IconButton>
          )}
          <IconButton
            className="cfc-mask-toggle"
            label={eyeLabel}
            hintKey="eye"
            pressed={masked}
            onActivate={onToggleMasked}
            onHint={setHint}
          >
            <EyeIcon off={masked} />
          </IconButton>
        </div>
      )}
      <ul
        ref={listRef}
        className="cfc-list"
        style={{ listStyle: 'none', margin: 0, padding: 0, paddingBottom: 8, width: '100%', fontSize: '1.08rem' }}
      >
        {visible.map((it) => {
          const depth = Math.max(0, it.depth);
          return (
            <li
              key={it.id}
              className="cfc-item"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                marginLeft: `${depth * INDENT_PX}px`,
                padding: '2px 0',
              }}
            >
              {Array.from({ length: depth }).map((_, i) => (
                <span
                  key={`g-${it.id}-${i}`}
                  style={{
                    position: 'absolute', top: 2, bottom: 2, width: 0,
                    left: `${-((depth - i) * INDENT_PX - MARKER_WIDTH / 2)}px`,
                    borderLeft: '2px solid rgba(148,163,184,0.35)', pointerEvents: 'none',
                  }}
                />
              ))}
              <Marker
                hasChildren={!!it.hasChildren}
                open={expanded.has(it.id)}
                onToggle={() => toggle(it.id)}
              />
              <span
                style={{ fontSize: '1rem', lineHeight: 1.5, minWidth: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: masked && it.maskedHtml ? it.maskedHtml : it.html }}
              />
            </li>
          );
        })}
      </ul>
      {pendingRef && (
        // Inline rather than floated: this widget's iframe is only as tall as its content, so a
        // floating confirmation would be clipped (same reason the toolbar hint lives in its row).
        <div
          className="cfc-confirm"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            margin: '4px 0 8px', padding: '6px 8px', borderRadius: 6,
            background: 'var(--rn-clr-background-secondary, rgba(148,163,184,0.12))',
            fontSize: '0.82rem', lineHeight: 1.35,
          }}
        >
          <span style={{ minWidth: 0, color: 'var(--rn-clr-content-secondary, rgba(100,116,139,0.9))' }}>
            Open <strong>{pendingRef.name}</strong>? This leaves the queue and ends the review session.
          </span>
          <span style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <span className="cfc-confirm-btn" role="button" tabIndex={0}
                  onClick={confirmOpen}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmOpen(); } }}>
              Open anyway
            </span>
            <span className="cfc-confirm-btn" role="button" tabIndex={0}
                  onClick={() => setPendingRef(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPendingRef(null); } }}>
              Cancel
            </span>
          </span>
        </div>
      )}
    </>
  );
}
