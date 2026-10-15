// Reliable "has the answer been revealed?" state for FlashcardUnder widgets.
//
// Why this is not trivial: getWidgetContext().revealed and queue.hasRevealedAnswer() are NOT
// reactive here — RemNote does not re-evaluate the widget when the answer is revealed within a
// card (confirmed by logging: a useTrackerPlugin over hasRevealedAnswer() fires once and never
// again). So we drive the flag ourselves: subscribe to the RevealAnswer / QueueLoadCard events
// for instant updates, and poll hasRevealedAnswer() as a guaranteed fallback (the same
// non-reactivity that incremental-everything works around by polling getWidgetContext()).
//
import * as React from 'react';
import { AppEvents, useAPIEventListener } from '@remnote/plugin-sdk';

export function useRevealedAnswer(plugin: any, pollMs = 500): boolean {
  const [revealed, setRevealed] = React.useState(false);

  const recheck = React.useCallback(async () => {
    try {
      const r = !!(await plugin.queue.hasRevealedAnswer());
      setRevealed((prev) => (prev === r ? prev : r));
    } catch { /* ignore */ }
  }, [plugin]);

  // Main path — instant updates when the events reach the widget iframe (verified: RevealAnswer fires here).
  useAPIEventListener(AppEvents.RevealAnswer, undefined, () => setRevealed(true));
  useAPIEventListener(AppEvents.QueueLoadCard, undefined, () => setRevealed(false));

  // Fallback — one immediate check on mount (catches a reveal that fired before this widget
  // mounted), then a low-frequency poll in case an event is ever missed.
  React.useEffect(() => {
    let cancelled = false;
    const tick = () => { if (!cancelled) void recheck(); };
    tick();
    const id = setInterval(tick, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [recheck, pollMs]);

  return revealed;
}
