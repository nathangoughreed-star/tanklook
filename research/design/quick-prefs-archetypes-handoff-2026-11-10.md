# YourArium — Quick Preferences: Visual Archetypes and Live-Plants Simplification

**Implementation handoff for Claude**  
**Scope:** Targeted update to the existing New Setup / Quick Preferences experience (AB6) and its connection to the Discovery Algorithm (DA). **Not** a redesign of A/B Discovery, locking, equipment, or the project model.

## 1. Decision summary

Replace the current text-only **Look** preference chips (`Natural`, `Lush`, `Colourful`, `Minimal`, `Stylized`) with a small set of **image-based visual archetype cards**, tailored to the habitat type chosen at New Setup. Each card permits three states: **Interested**, **Avoid**, or **Unselected**. Remove the separate **Live plants** question from the initial Quick Preferences screen. Offer **No live plants** as an explicit exclusion in the existing **Don't want** section instead.

The intent is to capture visual taste more accurately and efficiently than abstract adjectives, avoiding A/B rounds spent discovering preferences a user can recognize immediately from pictures. The survey remains fully optional and skippable. The DA remains responsible for refining unresolved aesthetic choices with visual comparisons.

## 2. Why change the current UI?

The Look chips are abstract and overlapping. A setup can be natural, lush and colourful simultaneously; two users may interpret each word differently. Images of clearly distinct habitat concepts are a stronger signal of actual aesthetic preference.

The live-plants question becomes partly redundant when the user can express interest in image-based styles such as lush planted jungle or Dutch aquascaping. Nevertheless, **liking the appearance of live plants is not a hard commitment to maintaining them**. The UI must allow the user to prohibit live plants independently, because budget, effort or personal preference can override a visual attraction.

## 3. Onboarding UI changes

Keep the existing New Setup architecture. In the optional Quick Preferences screen, retain the habitat selection established earlier, approximate size, the Don't want section, and access to budget / care constraints. Do not add a new page or require answers.

### Replace the Look row

Current:

`Look — pick any: Natural | Lush | Colourful | Minimal | Stylized`

Proposed:

**What kinds of setups appeal to you?**  
*Choose any that catch your eye. Leave the others blank.*

Show **approximately 4–6 image cards per habitat type**. Each card has:
- One clear, representative image showing the actual visual archetype.
- A concise name (e.g., *Jungle planted*).
- A short optional description (e.g., “Dense greenery and an organic, overgrown feel”).
- Three states: **Interested**, **Avoid**, **Unselected**. Default: Unselected.

Prefer immediately recognizable cards and labels over jargon, while retaining accepted aquascaping names where helpful. Users must be able to indicate interest in *multiple* archetypes. A card is **a visual direction, not a request to reproduce the exact photo or a commitment to its species/equipment**.

**Example freshwater archetype set for design review, not a final mandated taxonomy:**

| Archetype | What the photo should communicate |
|---|---|
| Nature / River | Stones or wood, organic composition, open swimming channels |
| Jungle / Lush planted | Dense greenery and layered, overgrown planting |
| Iwagumi / Stone-focused | Strong stone composition, restraint, open space |
| Dutch / Planted garden | Deliberate groupings of varied plants and colours |
| Blackwater / Rooted | Darker tannin tones, roots, leaves and subdued atmosphere |
| Modern / Stylized | Clean or intentionally artificial/geometric presentation |

This list should be reconciled against the existing YourArium visual-family / Explore archetype catalogue rather than creating a second, disconnected taxonomy. Verify that each archetype has actual generatable examples. Other habitat types should use their **own** real visual families, not these freshwater labels copied across. For “I don't know yet,” either omit this section until a habitat is chosen or show a *very small* mixed-habitat sample; don't dump all archetypes into one enormous gallery.

### Interaction behavior

- **Interested:** Stated positive aesthetic preference; increases ranking of related candidate families and their stylistic features.
- **Avoid:** Stated negative aesthetic preference; downranks related families, but is **not a hard exclusion** by default. It should not silently prohibit potentially appealing candidates across all later discovery.
- **Unselected:** No stated preference; do not infer dislike from inaction.

Use clear selected states, not ambiguous tiny thumbs. Don't turn any selection into a permanent Lock. Explicit user preferences outrank preference *inferences* from later A/B votes, but they remain editable in the left-side Preferences / Constraints menu, including during Discovery.

### Remove the live-plants row

Remove the initial Quick Preferences question of the form:

`Live plants — Definitely / I'd prefer them / Prefer without / Not sure`

Add **No live plants** to the **Don't want** options for applicable habitat types. Selecting this should be an **explicit prohibition** on designs requiring living plants, not a soft negative. Keep the existing rules for hard exclusions and constraints. This is different from using **Avoid** on a planted archetype card.

Do **not** infer “live plants required” from liking Dutch or Jungle visuals. Do **not** silently replace living plants with fake plants while depicting or labeling the outcome as the same live-planted archetype. If a user both likes a planted archetype and selects **No live plants**, preserve the exclusion, explain that the exact planted look may not be achievable, and suggest visually similar, honest alternatives where appropriate. If no valid alternatives exist under the constraints, communicate the limitation rather than inventing a match.

## 4. Data and DA integration

- **Single source of truth:** Write these choices to the same project preference data used by the existing left-side Preferences UI and Explore preference ranking. No parallel onboarding-only state model.
- Preserve the distinction among **explicit preferences**, **explicit hard exclusions**, **learned preferences**, and **persistent locks**.
- Map archetype interest/avoid states to the existing DA visual-family identifiers and/or the underlying aesthetic dimensions (`natural`, `lush`, `colourful`, `minimal`, `stylized`, etc.) as *ranking signals*. Don't assume a one-to-one mapping or use images as a species/equipment specification.
- Use negative signals to influence ranking rather than categorically banning a whole habitat family unless the user explicitly set a hard constraint.
- **Hard "No live plants"** must be honored during candidate generation and final checks. A candidate that requires live plants cannot pass while this exclusion is active.
- If preferences change mid-session, the generator should use the updated settings for subsequent candidates and recheck/invalidate cached proposals as appropriate. Historical proposals remain immutable records.
- Retain welfare, compatibility, cost, equipment capability and user-defined hard constraints. A visually preferred archetype must not override them.
- Archetypes can suggest initial plant density, hardscape emphasis, composition, atmosphere, etc.; they must not automatically lock any specific design variables.

## 5. Important content and image rules

A good archetype gallery succeeds only if its options are visibly distinct **at thumbnail size**, not merely by text label. Use representative, consistent-framing imagery. Images should convey achievable physical aesthetics and not imply the application can build something its current asset catalogue cannot reasonably render.

Keep the gallery small on desktop and compact on phone; do not let it become a mandatory visual survey. Ensure selected / avoided / neutral states are understandable without relying on colour alone. On small screens, test whether two cards per row are legible or whether a horizontal scroller is better. Preserve an immediately visible Skip / Start building route.

## 6. Acceptance scenarios

1. **Default:** A new user leaves all archetypes unselected and skips the optional screen. Discovery starts without arbitrary aesthetic constraints.
2. **Multiple interests:** A freshwater user marks Jungle and Blackwater Interested. Both influence ranking; neither becomes a lock.
3. **Negative style:** User marks Iwagumi Avoid. It is downranked, not hard-banned, and remains possible during broad exploration when appropriate.
4. **Exclusion:** User selects No live plants. Every subsequently proposed finished design respects the prohibition and cannot rely on living plants.
5. **Conflicting signals:** User marks Dutch Garden Interested and No live plants. The prohibition wins; the app does not quietly show live-planted output. Explain any unavoidable aesthetic compromise.
6. **No automatic commitment:** User selects Jungle Interested and later chooses a rocky layout in A/B. The DA can learn from that preference without treating Jungle as locked.
7. **Editing:** Changes made through the left Preferences menu during Discovery affect later candidates and remain in sync with the initial answers.
8. **Habitat adaptation:** Freshwater, saltwater, terrarium and paludarium each use relevant archetype images and appropriate preference interpretation.
9. **Unsure:** A user who chose “I don't know yet” is not forced to browse a huge collection of habitat-specific archetypes.
10. **No UI regression:** The new gallery does not add a mandatory onboarding step or disturb the existing A/B comparison, locks, working-design isolation, or Make It Yours workflow.
11. **Visual quality:** Screenshots at desktop and 375 px show discernibly different archetypes, legible choices and obvious Skip / Start building controls.
12. **End-to-end:** Verify at least one scenario through the real UI: habitat selection → image interests/avoids → No live plants → Start building → Discover → confirm first proposals and candidate specs actually reflect the stated preferences and exclusion.

## 7. Suggested implementation order

1. Inspect existing AB6 preference schema, the left-side preference editor, and the current Explore visual archetype identifiers/assets.
2. Reuse those families and design appropriate reference images; avoid inventing new families with no candidate-generation support.
3. Replace the Look chips with image cards and implement the three-state interaction.
4. Remove the live-plants question and add the hard No live plants exclusion.
5. Wire ranking and hard exclusions into the existing candidate pipeline.
6. Run focused tests plus the existing onboarding / Discovery regression tests; provide desktop and mobile screenshots and a real-UI demonstration.

**Explicit non-goals:** No new Guided-versus-Sandbox modes, no separate survey system, no automatic locks based on visual interest, no redesign of A/B voting, and no changes to the current equipment inventory rules.

**Guiding principle:** Let users quickly recognize visual directions they already like; let A/B discovery resolve what they cannot yet articulate. Preserve a clear difference between *I like the look of this* and *this setup must contain these exact physical elements*.
