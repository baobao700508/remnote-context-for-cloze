// Click-to-reveal interaction for masked sibling clozes.
// Toggling is done via direct DOM mutation (no React state) so it survives re-renders
// of the same card and resets automatically when the card changes.
import * as React from 'react';
import { decodeReveal } from './clozeMask';

// Toggle a clicked "…" between its collapsed marker and its revealed text.
export function toggleReveal(elm: HTMLElement) {
  if (elm.getAttribute('data-cfc-revealed') === '1') {
    elm.innerHTML = '…';
    elm.setAttribute('data-cfc-revealed', '0');
    elm.classList.remove('cfc-revealed');
  } else {
    const html = decodeReveal(elm.getAttribute('data-cfc-reveal') || '');
    if (html) {
      elm.innerHTML = html;
      elm.setAttribute('data-cfc-revealed', '1');
      elm.classList.add('cfc-revealed');
    }
  }
}

// Attach delegated click/keyboard handlers so any ".cfc-reveal" inside `root` toggles
// on click or Enter/Space. Re-binds whenever `dep` changes (e.g. after the tree re-renders).
export function useRevealDelegation(rootRef: React.RefObject<HTMLElement>, dep: unknown) {
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pick = (t: EventTarget | null) => (t as HTMLElement)?.closest?.('.cfc-reveal') as HTMLElement | null;
    const onClick = (e: MouseEvent) => {
      const el = pick(e.target);
      if (el && root.contains(el)) { e.preventDefault(); e.stopPropagation(); toggleReveal(el); }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = pick(e.target);
      if (el && root.contains(el)) { e.preventDefault(); toggleReveal(el); }
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    return () => { root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
  }, [dep]);
}
