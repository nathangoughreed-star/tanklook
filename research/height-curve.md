# Height curve in the water limit (lane HC, 2026-10-21)

Nathan's decision: for water-column swimmers floor area counts linearly; height gives a big boost per inch at first, then quickly less; per species
("an oscar going from 12 to 18 inches is a lot more helpful than a school of danios"). Model in `src/scene/stocking.ts` (`heightMul`, `hsCm`).

Credited height = Hs (1 - exp(-H / Hs)), H = mean water depth (litres / floor area). Each animal's water load is multiplied by H / credited height
(zone "all": half curve, half raw). Hs = 8 x body depth (species card height, fins included), at least 30.5 cm (12 in), x 0.7 (fast schoolers, surface
fish) or x 1.5 (tall-bodied, gouramis, big cichlids). `SPACE_PER_L` re-fit x1.564 so the 37 lists keep median 74.2 % at the published max.

Tuning on the 37 lists (sdlog of percent at the published max; raw litres 0.463):
fixed Hs 12 in 0.472; Hs = max(12 in, 3 x length) 0.460; per-species depth with classes 0.7 / 1.5 (k 8) 0.474, 0.6 / 1.5 (k 6) 0.499,
no classes 0.462. The experts do not support the class split; it is Nathan's call (provenance: assumption).

Known effects: 17 kuhli + 29 danio in 36x18 in: water 158 / 133 / 122 / 117 % at 12 / 18 / 24 / 30 in (floor 95 %); 1 oscar in 48x18: water 48 / 33 / 25 %;
5 oscars now fit the smallest catalogue size that holds one (73 %): check the oscar class if that reads too loose. Starters: counts within about +-5,
paludarium seed 1 jumps 22 to 38 animals and drops its water school at stop 3 (follow-up).
