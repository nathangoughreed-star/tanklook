# Method: building or improving a species model (Nathan 2026-11-18)

Applies to every new species (roster expansion, R139) and every change to an existing fish's look (CM3 forms, restyles, sex looks).
Origin: Endler's female was drawn from memory and came out flat; Nathan: "why not get reference photos every single time?"

## Steps, in order
1. **Reference first.** Before writing or editing a `PLANS` entry in `src/art/fishgen.ts`, look at real photos: at least two good ones per look (a breeder, Seriously Fish, FishBase or a hobby-store page), one per sex where the sexes differ, plus a side-on shot. Nathan gave a standing OK (2026-11-18) to download reference photos without asking each time: download only to the scratchpad (never into the repo, never committed: copyright), only photos of the fish, from ordinary hobby / reference pages. Record the page URLs.
2. **Write the look down** in the species' notes block before drawing: body and back colour, flank pattern, fins (colour, edge, spots), eye, iridescence, markings that identify the species, and what differs by sex or variety. Say which photo URLs were looked at.
3. **Draw to the notes, then compare.** Render the fish at tank size and zoomed, and put it beside the photo. The crisp tank-render style stays (painted or cartoony fish were rejected twice); true colours for the real thing.
4. **Check the details that people recognise**: the diagnostic mark (Endler's: orange flank patch and black-edged tail; three-spot: the two spots; convict: the bars), fin shape, relative size, the dull sex not left flat gray.
5. **Record it.** Photo URLs in the commit message or `research/screens/<lane>/README.md`; the side-by-side picture in `research/screens/<lane>/`. A look with no reference noted is unreviewed.

## Also on every species
Size and behaviour come from cited pages (species.json `tl` with provenance rules, FB3 tables); the common pleco carries its true adult size. See `research/roster-expansion-plan.md` for the build list.
