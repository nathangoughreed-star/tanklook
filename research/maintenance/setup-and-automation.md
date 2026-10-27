# Setup, cycling weeks and automation

Lane C6, 2026-10-27. Research only, not wired into the app. Each row's quote is in cadence.json (items[].sources[].quote). ASSUMPTION rows give their basis there. No opened page states minutes per task.

## One-time setup and cycling
| applies to | field | value | status | source |
|---|---|---|---|---|
| freshwater community | cycling_weeks | 4-6 weeks | sourced | [practicalfishkeeping.co.uk](https://www.practicalfishkeeping.co.uk/features/how-to-cycle-a-fish-tank-the-complete-guide/) |
| freshwater community (fishless) | cycling_weeks | at least 4 weeks | sourced | [practicalfishkeeping.co.uk](https://www.practicalfishkeeping.co.uk/features/how-to-cycle-a-fish-tank-the-complete-guide/) |
| freshwater community | cycling_weeks | 2-8 (wait at least 4 before fish) weeks | sourced | [aquariumscience.org](https://aquariumscience.org/index.php/2-1-fish-less-cycling), [aquariumscience.org](https://aquariumscience.org/index.php/2-1-fish-less-cycling) |
| freshwater community | cycling_weeks | 2-6 weeks | sourced | [liveaquaria.com](https://www.liveaquaria.com/PIC/article.cfm?aid=74) |
| freshwater fishless cycle | cadence | daily water testing during cycle; no minutes stated | sourced | [practicalfishkeeping.co.uk](https://www.practicalfishkeeping.co.uk/features/how-to-cycle-a-fish-tank-the-complete-guide/) |
| planted tank | cycling_weeks | about 2 dark-start before planting (vendor); forum advice 6-12 wk before livestock weeks | ASSUMPTION | - |
| reef | cycling_weeks | 3 (zoas), ~4, 6+2 before coral; one at 8 weeks | sourced | [marinecolorado.org](https://marinecolorado.org/threads/be-honest.22533), [marinecolorado.org](https://marinecolorado.org/threads/be-honest.22533) |
| reef | cycling_weeks | 6 weeks cycle, then 2 more before first frags | sourced | [marinecolorado.org](https://marinecolorado.org/threads/be-honest.22533), [marinecolorado.org](https://marinecolorado.org/threads/be-honest.22533) |
| reef with live rock | cycling_weeks | about 4-6 typical; shorter with cured rock weeks | ASSUMPTION | - |
| bioactive vivarium | cycling_weeks | 4-8 (tropical; longer arid) for ecosystem/cleanup crew population weeks | sourced | [furrycritter.com](https://www.furrycritter.com/pages/articles/reptiles/bioactive_enclosures.htm), [furrycritter.com](https://www.furrycritter.com/pages/articles/reptiles/bioactive_enclosures.htm) |
| bioactive vivarium | cycling_weeks | 2-4 before introducing reptile (same article, lower figure) weeks | sourced | [furrycritter.com](https://www.furrycritter.com/pages/articles/reptiles/bioactive_enclosures.htm) |
| springtail cleanup crew | cycling_weeks | a few weeks to a sustainable population | sourced | [reptifiles.com](https://reptifiles.com/establishing-bioactive-clean-up-crew/) |
| bioactive vivarium | setup_hours | not stated on any opened page; sealant dry about 24 h hours | ASSUMPTION | [reptilecentre.com](https://reptilecentre.com/blog/2015/08/how-to-set-up-a-bioactive-royal-python-vivarium) |
| bioactive vivarium plants | cadence | plants may droop first month under new light | sourced | [furrycritter.com](https://www.furrycritter.com/pages/articles/reptiles/bioactive_enclosures.htm) |
| paludarium (aquatic section) | cycling_weeks | 2 minimum test phase before animals; plants root in weeks | sourced | [reptilecentre.com](https://www.reptilecentre.com/blogs/reptile-blog/paludarium-set-up-guide) |
| paludarium | cadence | partial water change of immersed section every 1-2 weeks | sourced | [petsmart.com](https://www.petsmart.com/learning-center/fish-care/setting-up-a-paludarium) |
| paludarium | cycling_weeks | 4-6 (search summary only, page not opened) weeks | ASSUMPTION | - |
| all tank types | setup_hours | no opened page states hands-on setup hours | ASSUMPTION | - |

## Automatic water changer
| applies to | field | value | status | source |
|---|---|---|---|---|
| Python No Spill Clean and Fill 75 ft | cost | 119.99 USD | sourced | [fishtanksdirect.com](https://fishtanksdirect.com/python-no-spill-clean-fill-75-ft/) |
| Python | not_saved | replaces buckets; freshwater refill only; saltwater needs separate mixing | sourced | [fishtanksdirect.com](https://fishtanksdirect.com/python-no-spill-clean-fill-75-ft/), [fishtanksdirect.com](https://fishtanksdirect.com/python-no-spill-clean-fill-75-ft/) |
| Python, reef | not_saved | salt mix prepared in a separate container, pumped in | sourced | [mail.redearslider.com](https://mail.redearslider.com/forum/viewtopic.php?p=158011) |
| Python | setup_hours | 4-step faucet hookup; no hours stated | sourced | [mail.redearslider.com](https://mail.redearslider.com/forum/viewtopic.php?p=158011) |
| Python | cadence | do not remove more than 1/3; wait a week before repeating | sourced | [mail.redearslider.com](https://mail.redearslider.com/forum/viewtopic.php?p=158011) |
| drip/automatic water change | power | under $1 per month running cost; gravity drip works in outage | sourced | [gensou.sg](https://gensou.sg/how-to-set-up-auto-water-change/), [gensou.sg](https://gensou.sg/how-to-set-up-auto-water-change/) |
| drip water change | failure_mode | overflow if drain clogs; add float valve | sourced | [gensou.sg](https://gensou.sg/how-to-set-up-auto-water-change/), [gensou.sg](https://gensou.sg/how-to-set-up-auto-water-change/) |
| drip water change | cadence | replace inline carbon media every 1-2 months; check flow weekly (tubing clogs with minerals) | sourced | [gensou.sg](https://gensou.sg/how-to-set-up-auto-water-change/), [gensou.sg](https://gensou.sg/how-to-set-up-auto-water-change/) |
| drip water change | not_saved | does not replace filtration | sourced | [aquariumscience.org](https://aquariumscience.org/index.php/18-2-drip-water-changes) |
| drip water change | failure_mode | non-code plumbing fails and can cause large damage | sourced | [aquariumscience.org](https://aquariumscience.org/index.php/18-2-drip-water-changes) |
| Neptune/Genesis/Octopus class | cost | not found (search snippet: $300-800+ fully automated, unverified) | ASSUMPTION | - |

## Automatic feeder
| applies to | field | value | status | source |
|---|---|---|---|---|
| Eheim autofeeder 3581 | cadence | capacity ca. 100 ml; refill interval not stated by Eheim | sourced | [eheim.com](https://eheim.com/en_GB/aquatics/accessories/feeding/autofeeder/autofeeder) |
| Eheim autofeeder | cadence | replace battery about every 6 months (retailer); no manufacturer figure | sourced | [bulkreefsupply.com](https://www.bulkreefsupply.com/content/post/md-eheim-feed-air-automatic-fish-feeder-product-demo) |
| Eheim autofeeder | failure_mode | built-in ventilator against moisture clogging | sourced | [bulkreefsupply.com](https://www.bulkreefsupply.com/content/post/md-eheim-feed-air-automatic-fish-feeder-product-demo) |
| any auto feeder | cadence | load 3-5 days of food at a time | sourced | [gensou.sg](https://gensou.sg/automated-aquarium-feeding-smart-feeders/) |
| any auto feeder | failure_mode | humidity clumps food, jams or dumps hopper | sourced | [gensou.sg](https://gensou.sg/automated-aquarium-feeding-smart-feeders/), [gensou.sg](https://gensou.sg/how-to-feed-fish-while-on-holiday/) |
| any auto feeder | cadence | test-run 3 days before departure | sourced | [gensou.sg](https://gensou.sg/how-to-feed-fish-while-on-holiday/), [gensou.sg](https://gensou.sg/automated-aquarium-feeding-smart-feeders/) |
| fish | neglect_tolerance | healthy adults skip 1-3 days | sourced | [gensou.sg](https://gensou.sg/how-to-feed-fish-while-on-holiday/) |
| auto feeder | not_saved | overfeeding risk; does not replace observation | sourced | [gensou.sg](https://gensou.sg/automated-aquarium-feeding-smart-feeders/), [gensou.sg](https://gensou.sg/how-to-feed-fish-while-on-holiday/) |

## Auto top-off (ATO)
| applies to | field | value | status | source |
|---|---|---|---|---|
| ATO | cadence | wipe sensor pins about monthly; pump impeller monthly | sourced | [redseafish.com](https://redseafish.com/?p=105595), [redseafish.com](https://redseafish.com/?p=105595) |
| ATO | failure_mode | sensors foul; clean regularly; clean with vinegar | sourced | [buildyouraquarium.com](https://www.buildyouraquarium.com/best-auto-top-off-systems/), [buildyouraquarium.com](https://www.buildyouraquarium.com/best-auto-top-off-systems/) |
| ATO | failure_mode | overflow, back siphon | sourced | [buildyouraquarium.com](https://www.buildyouraquarium.com/best-auto-top-off-systems/), [buildyouraquarium.com](https://www.buildyouraquarium.com/best-auto-top-off-systems/) |
| ATO | failure_mode | running pump dry damages it; keep reservoir filled | sourced | [redseafish.com](https://redseafish.com/?p=105595) |
| ATO reservoir refill interval | cadence | not stated by any opened page | ASSUMPTION | - |

