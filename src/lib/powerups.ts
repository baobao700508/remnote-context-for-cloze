// Power-up identities in one place, so the stored codes and the labels the user reads can never
// drift apart across the index plugin, the review widgets and the popup.
//
// The codes are the STORED identity of a tag: renaming one would orphan every Rem already tagged
// with it. `POW_HIDE_OTHER_ANSWERS` still reads "…HideAllTestOne" and `POW_CONTEXT_FOR_CLOZE`
// still reads "contextForCloze" for exactly that reason — the labels they show were renamed (the
// plugin now serves every card type, not only clozes), the codes deliberately were not.
export const POW_CONTEXT_FOR_CLOZE = 'contextForCloze';
export const POW_HIDE_OTHER_ANSWERS = 'contextHideAllTestOne';

export const LABEL_CONTEXT_TREE = 'Context Tree';
export const LABEL_HIDE_OTHER_ANSWERS = 'Context Hide Others';

/** Labels this plugin has shipped before, newest first. Only a Rem still carrying one of these is
 *  safe to rename — any other text is a name the user chose. */
export const PREVIOUS_LABELS_CONTEXT_TREE = ['Context for Cloze'];
export const PREVIOUS_LABELS_HIDE_OTHER_ANSWERS = ['Context Hide Other Answers', 'Context Hide All Test One'];

/** Full, scope-explicit phrasing — used for the commands and the widget tooltips. Each one names
 *  WHAT it tags and HOW FAR that reaches, because the two tags differ on exactly that: the anchor
 *  cascades to a whole outline, "Hide Other Answers" applies to the single Rem you run it on. */
export const ACTION_ADD_CONTEXT_TREE = 'Add Context Tree to the Cards in This Outline';
export const ACTION_HIDE_OTHER_ANSWERS = 'Context: Hide Other Answers for This Rem';
export const ACTION_SHOW_OTHER_ANSWERS = 'Context: Show Other Answers for This Rem';
