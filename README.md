# Context Tree for Outline Cards — User Guide (English)

🇨🇳 [中文](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README_ZH.md) | 🇪🇸 [Español](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README_ES.md) | 🇧🇷 [Português Brasileiro](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README_PT-BR.md)

Make your reviews clearer by showing the current card **surrounded by its outline**. RemNote's queue already gives you a card's ancestors; this plugin renders a compact “Context Tree” under the card that adds everything *around* it — its siblings and their sub‑branches, and the answers they carry — so you can orient, associate, and recall, without changing the card content or scheduling.

> **Renamed in 0.2.0.** The plugin used to be called *Context for Cloze*, and its anchor power‑up used to read *Context for Cloze* too. Both now say **Context Tree**, because the tree is no longer about clozes only — it works for every card type. Nothing you tagged is affected: the stored power‑up code is still `contextForCloze`, and the tag Rem in your knowledge base is renamed in place the first time this version loads. If you had renamed that tag yourself, your name is kept. The command that adds it is now **Add Context Tree to the Cards in This Outline**, quick code `cont` (was `cfc`).

![Switching cloze modes with the eye button, then making it permanent with the tag button](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/context-for-cloze-mode-switch.gif)

## Why you would want this — two ways of studying it fits

**1) Study lists as clozes in context, instead of as list cards.**
A set or an enumeration is the most expensive thing you can put in a review queue. Answering it takes a long time, it is graded all‑or‑nothing, it is prime leech material, and most of the time you do not actually need to *produce* the whole list on demand — you need to have grasped what is in it. Writing the list as an outline and clozing the load‑bearing words is far cheaper: each blank becomes its own small card, so reviewing it is very fast and a slip on one item costs one lapse instead of failing the whole list. What that normally loses is the list itself — a lone blank with no siblings around it is hard to place. The context tree gives it back: every blank is shown **inside its own list**, with the neighbouring items visible, so you keep the shape of the whole while recalling one piece of it. When the neighbours give too much away, `Context Hide Others` masks them and you uncover them one at a time.

**2) Outline‑style note‑taking.**
RemNote already shows a card's *lineage* — the chain of ancestors from the document down to the line under review. What it does not show is anything to the **side** of that chain: the card's siblings and the branches hanging off its ancestors. In outline notes that is usually where the meaning is, because an item is defined as much by what it sits *beside* as by what it sits *under* — a card lifted out of a four‑item contrast is still answerable, but the contrast is gone. Tag the top of the outline once and the tree draws the whole branch under every card below it, lineage and neighbourhood together, with every answer in it other than your own either revealed as context or masked at your choice. It is also how you catch interference (rule 11 in Woźniak's list): confusable items are usually siblings, and you cannot notice the confusion while looking at one of them in isolation.

Both cases work for **any card type**: clozes, Concept/Descriptor cards, Question cards, or a mix of them in the same tree.

## Features
- Context Tree (Core)
  - Add the power‑up “Context Tree” (code: `contextForCloze`) to a Rem. All its descendants, when reviewed as cards, will show a context tree rooted at that Rem under the card.
  - Works for **every card type**, not only clozes: a Concept/Descriptor/Question Rem shows its **back side** in the tree, joined to the front by an arrow that spells out the card’s direction (`⇒` forward, `⇐` backward, `⇔` both).
  - Question stage: the context is shown while avoiding any leak of the answer — the cloze you are tested on, or the whole side the card is asking for.
  - Answer stage: the context remains; the revealed answer is indicated by a blue underline with a light‑blue highlight for easy comparison.
- Context Hide Others (`contextHideAllTestOne`) — applies to **one Rem**, not to a subtree.
  - By default, the context tree hides only the answer you are actually being tested on; every *other* answer in the tree — other cloze lines, and the back side of every other flashcard — is shown revealed. Tag a card with this power‑up when you don’t want **that card’s** review to be spoiled by its neighbours: while it is under review, all those other answers are hidden (shown as `…`) instead.
  - Apply it to the card Rem that would receive the spoiler (the leaf), **not** to the anchor/parent. See [Context Hide Others](#context-hide-others--protecting-a-cloze-from-its-siblings) below.
- How to add power‑ups to Rems
  - Commands:
    - Add Context Tree to the Cards in This Outline (quick code `cont`)
    - Context: Hide Other Answers for This Rem (quick code `conthide`, was `cfchide`)
  - Works on multi‑selection.
- Tag icons in the editor
  - Both power‑ups show a small mark on the Rem's tag pill instead of their name: a blue node tree for “Context Tree”, and the same tree with its answers replaced by `…` — in the amber the queue uses for a masked answer — for “Context Hide Others”. A tag you renamed yourself keeps its own text.

## Compatibility with queue‑display power‑ups (“Hide in Queue” official plugin and "Incremental Everything" plugin)
The context tree mirrors the queue‑display power‑ups from RemNote’s official “Hide in Queue” plugin **and** from the Incremental Everything plugin. This plugin does not register any of them — it only reads their tags when they exist, so nothing is affected if a power‑up isn’t installed.

Tagged on the item itself:
- Hide in Queue (`hideInQueue`)
  - Shows the placeholder text “Hidden in queue” for that item in the context tree (question stage only; the item shows normally on the answer stage).
- Remove from Queue (`removeFromQueue`)
  - Completely removes the item from the context tree (both question and answer stages).
- No Hierarchy (`noHierarchy`)
  - When present on the current card, the context area only shows “this line” (no ancestors/siblings/descendants), matching RemNote’s native behavior.

Tagged on the card, but targeting an ancestor (Incremental Everything):
- Hide Parent (`hideParent`) / Hide Grandparent (`hideGrandparent`)
  - Shows the “Hidden in queue” placeholder for the card’s parent / grandparent line (question stage only).
- Remove Parent (`removeParent`) / Remove Grandparent (`removeGrandparent`)
  - Completely removes the card’s parent / grandparent line from the context tree (both stages); its remaining children stay, un‑indented.

The current card’s own line is always shown, regardless of any of these tags.

## Back sides and direction arrows
A Rem that is a flashcard keeps its answer in a **back side** (`backText`) — that is what a Concept, a Descriptor or a Question Rem stores. The context tree shows both sides, joined by an arrow that says which way the card is asked:

| Arrow | Practice direction | Reads as |
| --- | --- | --- |
| `⇒` | Forward | front asks, back answers |
| `⇐` | Backward | back asks, front answers |
| `⇔` | Both | either side can ask |

This is the same notation the *Incremental Everything* plugin uses, so a card reads the same way in both.

- When the Rem you are reviewing is itself a front/back card, the side being asked is masked as a blue **?** on the question stage and revealed with the underline + highlight after “Show Answer” — exactly what already happened to a cloze.
- Every *other* flashcard in the tree shows both of its sides revealed by default, and hides its answer side behind one clickable `…` when the tree is in masked mode (see the eye button below).
- A Rem with no back side renders exactly as before.

### Backward Descriptor cards test the Concept, not the Descriptor
RemNote has [one special case here](https://help.remnote.com/en/articles/6751778-creating-concept-descriptor-flashcards): a **backward card on a Descriptor shows the Descriptor’s back side but asks you for the Concept above it**, not for the Descriptor itself. Being asked to answer “*abbreviation*” is useless; being shown “*abbreviation ⇐ PC*” and asked *what is PC short for* is the real card.

The tree follows that. On a backward Descriptor card:

- The masked **?** goes on the **nearest non‑Descriptor ancestor** — the concept being tested — not on the descriptor’s own label. If descriptors are nested several levels deep, the tree climbs past all of them to the first real Concept.
- That concept’s line is reduced to the bare **?** on the question stage: its own back side is dropped too, because a concept’s definition names the concept and would hand you the answer.
- The descriptor’s own line stays fully visible — it is the prompt.
- After “Show Answer” the concept comes back in full, underlined and highlighted, with its back side restored.
- If the descriptor has no Concept ancestor inside the tree, nothing is masked. The answer is simply not shown, so nothing leaks.

A descriptor’s label is never treated as an answer anywhere in the tree, so “Hide Other Answers” does not black out the *abbreviation* / *definition* labels that give the outline its shape.

## Collapsed by default — expand what you need
The context tree starts **collapsed**. Only the branch that leads down to the card under review is open, so the tested line is always visible while deeper descendants — which often spoil or heavily hint at the answer — stay hidden.

- A line with hidden children shows a **▸ arrow** instead of a bullet; click it (or focus it and press Enter/Space) to expand that branch. The arrow points down once the branch is open.
- A line with no hidden children keeps its bullet.
- Expansion is per card: it resets when you move to the next card.
- Prefer the old always‑expanded tree? Turn off **Start Collapsed** in Settings.

## The eye and tag buttons — switch answer modes mid‑review
The tree renders the other lines' answers in one of two modes: **revealed** (blue underline, the default) or **masked** (`…`, the default for a card tagged `Context Hide Others`). “Answer” covers both kinds: a cloze inside a line, and the back side of a flashcard line. An **👁 eye button in the top‑right corner of the context area** switches between them for the card in front of you.

![Switching cloze modes with the eye button, then making it permanent with the tag button](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/context-for-cloze-mode-switch.gif)

- Eye **open** = the other answers are revealed. Click it to hide them.
- Eye **struck through** = the other answers are masked as `…`. Click it to reveal them.
- Use it *before* reading the tree when the revealed answers turn out to leak a hint you would rather earn — no need to tag the Rem first.
- Use it *after* “Show Answer” when a masked tree is too cryptic to make sense of.
- By itself it changes nothing in your knowledge base: the tag still decides where you start, and the mode resets on the next card.
- The button only appears when some other line actually carries an answer of its own — a cloze or a back side — otherwise there is nothing to switch.
- In masked mode each `…` is still individually clickable, so you can also uncover one answer at a time. A hidden back side is one `…` for the whole side; a cloze is one `…` per blank.

**Make it permanent — the 🏷 tag button.** As soon as the eye puts the tree in a mode that disagrees with the card's tag, a second button appears **to the left of the eye**. Click it and the choice is written to the Rem itself, so every future review starts that way:

- Plain tag icon = *add* `Context Hide Others` to this Rem (keep the other answers hidden).
- Tag icon with a slash = *remove* it from this Rem (keep the other answers revealed).
- Hover or focus either button and a short explanation appears in the same row, to the left of the icons.
- The button disappears once the tag matches what you see, and a toast confirms the change. This is the only action in the plugin that writes to your knowledge base.

## Settings (Settings → Plugins → This Plugin)
- Start Collapsed (default: On)
  - Renders the tree collapsed, with only the path to the current card open; other branches sit behind a clickable ▸ arrow. Depth is no longer capped — collapsing is what keeps a deep tree readable, so you see the whole hierarchy and open only the parts you want.
- Max Nodes (default: 200)
  - A safety budget on how many Rems the tree **collects** before it stops walking. Collapsed branches are still collected, so this — not collapsing — is what keeps a card under a very large anchor from stalling the queue. Raise it if a tree comes out truncated; lower it if a huge document makes cards slow to appear.
- Debug Mode (default: Off)
  - Adds extra hints in UI/console for troubleshooting (most users can keep it off).

## How to Use
1. Pick a Rem as the “context anchor” — the top of the outline you want cards to see — and add the power‑up “Context Tree” (`contextForCloze`), via the command **Add Context Tree to the Cards in This Outline** (`cont`).
2. Start reviewing: whenever any descendant becomes a card, a context tree rooted at the anchor appears under the card.
3. Optional: if a card would be spoiled by its neighbours’ revealed answers, add “Context Hide Others” to **that card** — run **Context: Hide Other Answers for This Rem** (`conthide`). See the dedicated section below.
4. Click the ▸ arrows during review to open any branch you want to see; the rest stays out of the way.
5. Use the 👁 button in the top‑right of the context area to reveal or hide the other lines' answers whenever the current mode does not suit the card — and the 🏷 button next to it if you want that choice to stick to the Rem.
6. Leave Max Nodes alone unless a tree comes out truncated (raise it) or a very large document makes cards slow to appear (lower it).

## Context Hide Others — protecting a cloze from its siblings

**What it does.** By default the context tree masks the line under review and reveals everything else. Every answer on *another* line — its clozes, and the back side of every other flashcard — is shown **revealed** (blue underline), so the surrounding answers act as visible context.

`Context Hide Others` reverses that for the card it is applied to: while that card is under review, **all other** answers in the tree are **masked** (shown as `…`) instead of revealed. Note the scope difference from the anchor tag: `Context Tree` is placed on the **root** of an outline and affects every descendant, while this one is placed on **a single Rem** and affects only that Rem’s reviews.

The tag sets the **starting** mode only — the 👁 button described above flips it either way for the card in front of you, without changing the tag.

### When there is no context anchor above the Rem
This tag only changes how a *context tree* looks, and a context tree exists only below a Rem tagged `Context Tree`. Tagging a Rem with no such ancestor would therefore do nothing at all, so the command checks first. If the anchor is missing, a dialog appears explaining the situation and offering three ways out:

- **Tag the parent too** — the parent becomes the context anchor and the selected Rem gets `Context Hide Others`. The dialog names the parent and states the consequence up front: an anchor cascades, so *every* card under that parent will show a context tree from then on. It also reports how many siblings the Rem has, since those siblings are what the context is made of — with none, the tree would be thin and a higher ancestor may be the better anchor.
- **Tag only this Rem** — adds the tag anyway; it stays dormant until an ancestor becomes an anchor.
- **Cancel** — nothing is written.

On a multi‑selection, the Rems that already sit under an anchor are tagged immediately and the dialog asks only about the rest.

The current card’s own line is always masked as `?` regardless of this power‑up, and plain (non‑cloze) context text is always shown. This power‑up only changes how *other* clozes appear.

**Where to apply it.**
- Apply it to **the cloze card Rem that would receive the unwanted spoiler from its siblings** — i.e. the leaf whose own review you want to keep clean. It is not a group marker: it protects the specific card it sits on.
- Do **not** apply it to the anchor/parent that carries `Context Tree`. The effect is keyed to the Rem of the card currently under review, and there is no inheritance down the tree, so a tag on the parent does nothing.
- The protection is per‑card and one‑directional: tagging card A only cleans up **A’s own** review; it has no effect on what B or C show when their turn comes. So when several siblings would each be spoiled by the others, tag **each** card you want protected — any sibling you leave untagged will still reveal all the answers during its own review.
- Tip: select the cloze cards you want to protect and run **Context: Hide Other Answers for This Rem** (`conthide`) — the command applies to a multi‑selection, so you can tag them in one step.

**When to use it.** Use it when a parent groups several sibling clozes that would spoil each other if shown together — e.g. an enumerated list where each item is its own cloze card, or a set of parallel facts you want to recall independently. Keep the default (don’t tag) when the neighboring answers are legitimate context you *want* to see while recalling the current one.

**Reveal hidden clozes one at a time (click to reveal).** When a card is protected this way, each masked `…` is a button. Click it (or focus it and press Enter/Space) to reveal just that cloze’s answer in place; click again to hide it back to `…`. This lets you self‑evaluate the surrounding hidden clozes gradually — one by one — even though they are not the card being tested. Each `…` toggles independently, the blanks on the line under review stay hidden (they never become clickable), and every reveal resets automatically when you move to the next card.

## Tips
- The plugin only renders in the review queue; the editor view is not affected.
- If the current card is not under any “Context Tree” anchor, no context tree is shown.
- When used together with No Hierarchy (`noHierarchy`), only the current line is shown. This is by design.

## Example Screenshots

All of the shots below come from one real document — Piotr Woźniak's [*Effective learning: Twenty rules of formulating knowledge*](https://supermemo.guru/wiki/20_rules_of_formulating_knowledge), taken as outline notes. It is a convenient subject for this plugin because it is the argument for it: rules **9 (Avoid sets)** and **10 (Avoid enumerations)** are exactly why you would cloze a list in context rather than card the list itself, and rule **16 (Context cues simplify wording)** is what the tree automates.

To reproduce them: put the cursor on the document's title Rem, run **Add Context Tree to the Cards in This Outline** (`cont`), and review.

1) **The anchor — what you tag, and what the tree is made of**

   The document in the editor, with `Context Tree` on its title Rem. Everything below it now reviews with a tree; the numbered rules are the branches.

   ![Anchor](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/01-anchor.png)

2) **A cloze inside its list — question stage** *(use case 1)*

   Reviewing *“2. `{{Learn}}` before you `{{memorize}}`”*. The card asks for one blank; the tree puts that line back into the list it belongs to, with the rest of the twenty rules around it.

   This is the cheap alternative to a set card, and the document proves the point on itself: a card asking *“list Woźniak's twenty rules”* is exactly the item rules 9 and 10 tell you not to build — graded all‑or‑nothing, and a leech in waiting. Cloze keywords of each rule is much faster to review, costs a single lapse when it slips instead of failing the whole list, and because the tree keeps the other titles in view you can rehearse the shape of the enumeration every time one of its members comes up.

   Two rendering details are visible in this shot:

   - **The line under review shows *both* of its blanks as `?`**, even though only one of them is being tested. RemNote's card area above is already rendering that line properly — *Learn* revealed, the tested blank masked — so the tree stays out of its way and puts the whole line out of play.
   - **Other lines show their answers.** Rule 8 reads *“`Graphic` deletion is as good as `cloze` deletion”* with both of its blanks filled in and underlined. That is the default: everything except the line under review is answered, as context. Shot 4 flips it.

   ![Cloze in context, question stage](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/02-cloze-question.png)

3) **Same card, answer stage**

   After *Show Answer*: the recovered blank is underlined and highlighted in blue, so it is immediately clear which part of the sentence you were on the hook for.

   ![Cloze in context, answer stage](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/03-cloze-answer.png)

4) **`Context Hide Others` — when the neighbours give it away**

   Two shots of the same card: the two‑blank line under **9. Avoid sets**.

   **Without the tag — the default.** Everything except the line under review is shown answered. The sibling boxed in red, *“if sets are absolutely necessary, you should always try to ⇒ **convert them into Enumerations**”*, hands you a good part of what this rule is about before you have recalled any of it — and rules 2 and 8 have their own blanks filled in as well.

   ![Default: the neighbouring answers are revealed](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/04-hide-others.png)

   **With `Context Hide Others` (`conthide`) — recommended for a card like this.** Every *other* answer in the tree collapses to a `…`: the siblings' back sides, and the clozes on rules 2 and 8. Each `…` is a button, so once you have answered your own card you can click them one at a time and check yourself on the rest. The eye in the top‑right is now struck through, which is how you tell at a glance which mode you are in.

   ![Recommended: the neighbouring answers are masked](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/04-hide-others-recomended.png)

   Compare the two: the line under review is identical in both. The tag never touches the card you are being asked — only its neighbours.

5) **A front/back card, its direction arrow, and a Rem reference preview**

   Reviewing *“you should avoid such items whenever possible ⇒ ?”* — a forward Descriptor under **9. Avoid sets**. Its back side is the answer, so the tree masks it as **?**, and the `⇒` records that the rem has a card asked front‑to‑back.

   The line just below keeps its own answer, and that answer carries a Rem reference: *“…you should always try to ⇒ convert them into **Enumerations**”*. References inside the tree are live, and they behave differently on hover and on click.

   **Hover** opens a preview of that Rem beside the tree — here, everything the notes say under *Enumerations* — without leaving the queue.

   ![Front/back card with direction arrow and a reference preview](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/05-arrow-and-reference.png)

   **Click** does not navigate. A confirmation bar appears at the foot of the tree instead — *“Open **Enumerations**? This leaves the queue and ends the review session.”* — with **Open anyway** and **Cancel**. Opening a Rem moves the pane, and that would end the session mid‑review, so a click only ever arms the action and leaves the decision to you.

   ![Clicking a reference asks for confirmation before leaving the queue](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/05-navigating-to-a-tree-reference.png)

6) **A backward Descriptor card — the Concept is masked, not the label**

   Reviewing *“example ⇐ the alphabetical list of the members of the EU”* — a backward Descriptor under the Concept **Enumerations―ordered lists of members**, under **10. Avoid enumerations**. The **?** lands on the *Concept*, which is what you are actually asked to recall, and not on the descriptor's label *example*. The Concept's own back side is dropped too, so that line reads as a bare **?**. This mirrors RemNote's own rendering — see [Backward Descriptor cards test the Concept, not the Descriptor](#backward-descriptor-cards-test-the-concept-not-the-descriptor).

   ![Backward descriptor card](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/06-backward-descriptor.png)

7) **Collapsed by default — open only what you want**

   Reviewing any card deep in the document while the other nineteen rules sit collapsed behind ▸ arrows. Click one to open that branch for this card only.

   ![Collapsed tree, expanding a branch](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/07-collapsed-expand.gif)

## Changelog

Newest first. Kept from 0.2.1 onward; anything earlier is in the [commit log](https://github.com/hugomarins/remnote-context-for-cloze/commits/main).

### 0.2.1
- **Tag pills show an icon instead of the power‑up's name.** “Context Tree” is a blue node tree taken from the plugin's logo; “Context Hide Others” is the same tree with its two answers replaced by `…`, in the amber the queue uses for a masked answer. A tag you renamed yourself keeps its text. The mark is applied per Rem, so a Rem carrying one of these power‑ups *and* another tag shows it on both pills.
- **Quick code for “Context: Hide Other Answers for This Rem” is now `conthide`** (was `cfchide`), so both of the plugin's commands start with `cont`.
