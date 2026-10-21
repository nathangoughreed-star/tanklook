# Research brief: minutes per task for fish-keeping chores (lane MW)

Same rules and the same JSON shape as research/sourcing/brief-items.md (read it first; its hard rules apply: only pages you opened
with WebFetch, one verbatim contiguous quote that contains the number, never attach a page that does not state the value, report
disagreements, at most two sources per field, no forums / Reddit / YouTube unless nothing else exists, then say so in `note`).

What is different: the numbers are TIMES or INTERVALS of a chore. Most pages state only how OFTEN. That is useful: record the
interval (`states` = "every 2 weeks") and, if a page gives a duration ("takes about 15 minutes"), record that too. `ours` is our
assumption in minutes (or per week). A field is `agrees` only if a stated duration / interval is within +-30 % of it. If a page states
only the interval, verdict `not-stated` for the minutes and put the interval in `note` + `sources`. Do NOT invent a duration from an interval.
Prices: product listing page (Amazon, Chewy, manufacturer) opened with WebFetch; `quote` must contain the price. A blocked retailer
page = say so, try the manufacturer page.

Write ONE JSON file at the path your task gives you. Finish with the path, counts agree / disagree / not-stated, WebFetch count.
