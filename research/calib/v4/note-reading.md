# Reading the experts' notes (survey v4, Nathan 2026-10-26)

> "the notes contain quite a bit of golden knowledge. I want them to be read carefully and have all answers of a specific tank be read
> through the lens of the specific notes attached." (Nathan, 2026-10-26)

A note is never a footnote. Before any answer on a tank is fitted or reviewed, the note on that tank is read, and every answer the
expert gave on that tank is decided in its light. The fit (`scripts/calib-fit.mjs`) and the review (`scripts/calib-review-v4.mjs`)
refuse an answer file until every note in it has a current reading.

## Who reads

A model, reading the whole note in context. Never a keyword match or a regex. The reader is the main session's model; a hard or
contested note (one that would move a rule) can go to Fable as a named question per the usage rules. Subagents may draft readings,
but the parent checks every reading that is not "as-clicked" before it is saved. `readBy` names who read.

## Steps

1. `node scripts/calib-notes-v4.mjs brief research/calib/answers/v4-<expert>.json` writes, beside the answers:
   - `v4-<expert>.notes-brief.md`: each noted tank as the expert saw it (box, stock with lengths, temperature, what was asked), the
     expert's answers, what the app says today and what it does not model, and the note.
   - `v4-<expert>.notes.json`: the readings skeleton, one entry per noted tank, every answered field with no status yet. Readings
     already made on an unchanged note are kept; a changed note reopens its tank.
2. Read each tank in the brief and fill its entry (below).
3. `node scripts/calib-notes-v4.mjs check research/calib/answers/v4-<expert>.json` until it reports no problem.
4. If any reading has a modelled condition: `GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts` (writes
   `research/calib/tables/v4-notes.json`; the same test without the variable then locks it).
5. Fit and review as before. The review shows every noted tank with its reading, the answers read under a note's condition, and the
   ledger of claims.

## What a reading holds

```json
"A13": {
  "note": "...", "hash": "...",
  "summary": "one sentence: what the note says about this tank and these answers",
  "fields": {
    "verdict":    { "status": "as-clicked" },
    "ideal":      { "status": "conditional", "quote": "My counts assume young shop neons", "why": "the counts are for juveniles" },
    "reasons":    { "status": "restated", "value": ["aggression"], "quote": "...", "why": "..." },
    "together":   { "status": "aside", "quote": "...", "why": "..." }
  },
  "condition": { "text": "neons at 20 mm (juveniles)", "quote": "young shop neons at about 2 cm", "tl": { "neon": 20 } },
  "claims": [ { "species": ["neon"], "rule": "space.water-small", "claim": "...", "quote": "...", "firm": true } ]
}
```

Every answered field needs a status. "as-clicked" is a decision too: the reader read the note and it does not change that answer.
Every other status needs `quote` (the note's own words, checked against the note) and `why`.

| status | when | what the tools do |
|---|---|---|
| `as-clicked` | the note agrees with the answer, explains it, or is about something else | the answer is read as given |
| `restated` | the note says what the expert meant and the click says something else: "I said problems only because of the pleco", "meant caution", a misclick, a reason given in words but not ticked, a confidence the note lowers ("not sure") | `value` replaces the answer; it must be a value the survey offers for that tank (the parser checks it); `null` removes it |
| `conditional` | the answer is right for a tank other than the one shown, and the note says which: juveniles, another count, a tankmate added or dropped, another temperature | the field moves to the tank as the note describes it (`A13@expert`), which the engine re-reads (`condition` with `stock`, `tempC` or `tl` in mm); it is fitted and reviewed against that reading, never against the tank shown |
| `aside` | the note says the answer is not a judgement of this question: a guess outside the expert's experience, a condition the app cannot model (hard water, corals, a sump, decor), an answer the note contradicts without saying what was meant | the answer is not read; it is listed with its quote |

How to decide:

- Read the note against all of the tank's answers, not only the one it seems to mention. "I'd never put a pleco in a 20" bears on the
  verdict, the first change, the counts of everything else (did the expert count around a pleco they would remove?) and the pair question.
- Prefer the reading that keeps the expert's knowledge: re-read under a condition before setting aside; restate before setting aside.
  Set aside only what the note says is not a judgement, or rests on something the app has no input for.
- A note that only explains (gives the reason for an answer) leaves the answer as-clicked, and its reason usually becomes a claim.
- Never restate toward the app. A restatement follows the expert's words, whatever the app says.
- A skipped tank's note is still read: its summary and claims count, and a skip that says "these animals should never be kept
  together" is a claim.
- When a note is ambiguous between two readings that would change a number, choose as-clicked and record the doubt in `summary`; a
  material doubt goes to Nathan as a question (with the tank shown, per the picture rule).

## Conditions

`condition.stock` replaces the tank's stock (`{ id, n, sex?, note? }` as in scenarios-v4.json), `tempC` the water temperature, `tl` the
adult length per species in mm. Only those three are re-read. A condition in words only ("my water is liquid rock") cannot be re-read:
answers resting on it are set aside, and the knowledge in it goes to a claim. If a condition drops the counted species, its counts
cannot be read under it.

## Claims: the ledger

A claim is knowledge in the note that holds beyond this one tank: "kuhlis need groups of six or more", "nerites are fine with neons in
soft water", "hermits kill snails for their shells". Each claim names the species it is about, a `rule` key (a `tests` tag from
scenarios-v4.json when the claim is about what that tag tests, otherwise a new key like `compat.nerite-ph` or `gap.hermit-shells`),
the claim in plain words, the quote, and `firm` (the expert states it as known, not as a guess).

The review groups claims by rule. A rule is **raised** when two or more experts make it, or one keeper or professional makes it firmly
with high confidence. A raised rule is a proposal of its own, whether or not a tag was flagged, and goes to Nathan with its quotes. A
single AI model's claim is kept for round B, never raised on its own.

## What stays fixed

- Nothing in a reading edits the expert's answer file. The readings file is beside it, and every change is listed in the fit report
  and the review with the expert's words.
- A reading belongs to the exact note it read (`hash`): a changed note reopens its tank.
- A note never moves a number or a gate directly. It decides how each answer is read; the fit and the per-tag review do the rest, and
  every rule change still goes to Nathan for a yes.
