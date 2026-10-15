// Hover preview for a rem reference in the context tree.
//
// This is a FloatingWidget rather than anything drawn inside the tree: the tree's own widget
// iframe is only as tall as its content, so a popup rendered there would be clipped. The tree
// hands the target's id over through session storage (openFloatingWidget takes no context data)
// and positions this window under the reference — see refInteraction.ts.
//
// The body is a RemHierarchyEditorTree, i.e. the host's own editor, so the preview shows the Rem
// with its children exactly as RemNote's native reference popup does.
import { RemHierarchyEditorTree, renderWidget, useSessionStorageState } from '@remnote/plugin-sdk';
import * as React from 'react';
import { PREVIEW_REM_KEY } from '../lib/refInteraction';

function RemPreview() {
  const [remId] = useSessionStorageState<string>(PREVIEW_REM_KEY, '');
  if (!remId) return null;
  return (
    <div
      className="cfc-preview"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxHeight: 380,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px 10px',
      }}
    >
      <RemHierarchyEditorTree remId={remId} width="100%" />
    </div>
  );
}

renderWidget(RemPreview);
