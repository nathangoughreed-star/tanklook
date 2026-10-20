# Biofilter nitrification capacity: numbers for the stocking calculator

Searches were limited (web search plus two page fetches). Items marked DERIVED or ESTIMATE are my inference, not a published figure.

## 1. Published numbers

| Quantity | Value | Source | Confidence |
|---|---|---|---|
| VTR, trickling media, SSA 200 m2/m3 (25 C, pH 7.2, alk 100, TAN max 2 mg/L, DO > 4) | ~90 g TAN/m3/d | https://www.globalseafood.org/advocate/estimating-biofilter-size-for-ras-systems/ (Timmons/Ebeling style planning value) | Med (aquaculture, high TAN) |
| VTR, moving-bed media, same conditions | ~350 g TAN/m3/d ("conservative") | same | Med |
| VTR falls as influent TAN falls | stated qualitatively; no equation | same | High (qualitative) |
| Lab media comparison, 7 L freshwater, loads 5 / 25 / 50 g/m3/d | removal 32-39 / 142-169 / 288-323 g/m3/d (near-complete removal; load-limited). Media SSA 500 (Kaldnes bead) to 7,800 m2/m3 (sand) | Harwanto et al. 2012 via https://koreascience.kr/article/JAKO201108040014041.do | Med |
| Areal rate, fixed vs moving carriers (750 m2/m3) | 0.20 vs 0.14 g N/m2/d | DTU, https://orbit.dtu.dk/en/publications/nitrification-performance-and-robustness-of-fixed-and-moving-bed-/ | Med |
| Areal rate, typical RAS biofilters | 0.1-1.0 g TAN/m2/d (upper half for moving bed, warm water) | https://www.globalseafood.org/advocate/low-space-bioreactors-remove-ammonia-in-recirculating-systems/ | Med |
| Hobby ammonia-oxidation test, 10 media: 30 ppi foam ~9x ceramic rings; bio balls and Matrix ~2x rings; rings / lava / BioHome worst. Tracked effective surface area | relative ranks only | https://aquariumscience.org/index.php/7-filter-media (also /index.php/7-2-7-bio-balls) | Med (non-peer-reviewed, good method) |
| Same site, large canister capacity: foam / static K1 / pot scrubbers ~ 700 five-inch mbuna on good oxidation; rings / lava / BioHome ~ 80 | 8.75x ratio | same | Low-Med |
| Static K1 effective area | ~330 m2/m3 per 100 ft2/ft3 note is in the site; fluidized K1 at 60 % fill ~ 2x static per volume | same | Low (conversion text garbled; recheck) |
| Doubling flow raised biofilm activity only ~9 % | | same (author's experiment) | Low-Med |
| Temperature (fixed film): +1.1 %/C when DO-limited, +4.3 %/C when TAN-limited (20 C range) | | Zhu & Chen 2002, Aquacultural Engineering 26(4) (not opened; via search summary) | Med |
| Temperature coefficient theta: 1.07 default; 1.086-1.109 TAN-limited, 1.023-1.081 O2-limited (moving bed); 1.024 in membrane-aerated biofilm | | search summaries (PMC10165249 and others) | Med |
| O2 demand 4.57 g O2 / g TAN; alkalinity 7.14 g CaCO3 / g TAN | textbook stoichiometry | Timmons & Ebeling, Recirculating Aquaculture (not fetched) | High |
| Moving-bed reactor media fill <= 70 % of reactor volume | | globalseafood link above | Med |

## 2. Specific surface area (SSA, m2/m3 of bulk media), typical

Not verified by a fetch. Marketing figures are inflated (crushed-sample tests). Use "effective" values.

| Media | SSA nominal | Proposed VTR for code, g TAN/m3/d at 25 C, TAN ~0.5 mg/L (DERIVED) |
|---|---|---|
| Ceramic rings / lava rock / bio-block | 200-450 (marketing up to 1000+) | 60 |
| Bio balls (submerged) | ~100-200 | 60 (trickle/wet-dry: 90) |
| Sintered glass (Siporax etc.) | 500-1000+ | 150 |
| K1 moving bed (fluidized) | 500 | 250 (published 350 at high TAN) |
| K1 static | ~250-300 effective | 120 |
| Sponge / foam 20-30 ppi | 500-1000 | 400 (hobby test: ~9x rings = 540; capped for caution) |
| Cartridge floss / filter pad | ~ coarse | 100 |

Basis: start from 90 (trickling, 200 m2/m3), lower for low-TAN aquarium water, then scale by the hobby test's relative ranks. Confidence LOW-MED; this is the least certain column.

## 3. Flow and oxygen

- O2 needed: 4.57 g O2 per g TAN. Biofilm needs DO > ~2 mg/L at the media (aquaculture planning uses > 4). Biofilter water in a normal aquarium is near saturation (~8 mg/L at 25 C), so a TAN load of 1 g/d needs 4.6 g O2/d = ~ 0.58 m3/d of water fully stripped of O2; real filters see 20-50 % drawdown, so min flow ~ 1.5-3 m3/d per g TAN, trivial vs real flows.
- Why flow matters less than media volume: the site test saw only +9 % for double flow. Turnover only needs to deliver TAN and O2.
- What really differs: bypass. In a hang-on-back, water spills over / around the cartridge, and much of the "rated gph" never touches biofilm; media is mostly floss and a small foam block. In a canister, all flow is forced through packed media, but the media is often ceramic (low effective area per litre) and channelling can leave zones dead. So 100 gph through a HOB is NOT 100 gph through a ceramic-filled canister. Capacity follows media volume x VTR; flow is only a gate.

## 4. Temperature and pH

- Temp factor: f_T = 1.07^(T-25) (nitrification fall-off, water 20 C -> 0.71, 27 C -> 1.14). Slower (1.04) is also defensible under O2 limit. Cap at 30 C (rate drops above ~32 C).
- pH factor (no single source verified; commonly ~ 8 C-style): f_pH = 1.0 for 7.2-8.0; 0.8 at 6.8; 0.5 at 6.5; 0.2 at 6.0 or below (nitrification stalls below ~6.0-6.5 and with zero alkalinity). CONFIDENCE LOW; verify.
- Alkalinity < ~ 50 mg/L CaCO3: warn.

## 5. Filter media volumes (ESTIMATES; manufacturer pages did not give litres)

| Filter | Media L (approx.) | Dominant media |
|---|---|---|
| Sponge filter, small (Hydro-Sponge 2 / 3) | 0.3 / 0.6 | foam |
| AquaClear 30 | ~0.5 | foam + ceramic + floss |
| AquaClear 50 | ~0.9 | foam + ceramic + floss |
| AquaClear 70 | ~1.4 | foam + ceramic + floss |
| AquaClear 110 | ~2.4 | foam + ceramic + floss |
| Fluval 107 | ~1.3 | foam + ceramic |
| Fluval 207 | ~2.8 | foam + ceramic |
| Fluval 307 | ~4 | foam + ceramic |
| Eheim Classic 2213 | ~1.0 (2217 ~2.5) | sponge + ceramic |
Confidence LOW. Should be checked against the manuals (owners' manuals list "media capacity"). The aquariumscience reader notes an FX6 at 5.9 L.

Substrate / glass: not found in a source. Estimate: gravel biofilm is a minor but real contribution; planted / sand tanks' hard surfaces (glass, decor, substrate) as bulk SSA ~ 1-3 m2 per 100 L of tank at 0.1-0.2 g/m2/d ~ 1-5 % of a filter's capacity. Recommend: add flat bonus = 0.003 g TAN/d per L of tank (substrate+glass) ONLY after cycling, or ignore. LOW.

## 6. Proposed formulas

```
VTR_media         = table in section 2 (g TAN per L media per day = value/1000)
cap_media_g_day   = sum_i( V_i_litres * VTR_i/1000 ) * f_T * f_pH * f_flow * f_fill
f_T               = 1.07 ** (T - 25), clamp T to 15..30
f_pH              = piecewise per section 4
f_flow            = min(1, effective_flow_m3d / (2.0 * cap_media_g_day))   # >= 2 m3/day per g TAN/day
effective_flow    = rated_flow * through_media_fraction
                    (canister / sponge: 0.9;  HOB: 0.5-0.6;  internal: 0.8)
f_fill            = 1.0 (loose static/packed); K1 moving: fill <=0.5 bulk volume, else 0.8
cap_total         = cap_media_g_day + 0.003 * tank_litres   (substrate/glass; optional)
safe_load_g_day   = 0.7 * cap_total        # 30 % headroom for transients / aging
```

Example: AquaClear 70 (0.4 L foam + 0.5 L ceramic + 0.5 L floss) at 25 C, pH 7.2: 0.4*0.4 + 0.5*0.06 + 0.5*0.1 = 0.24 g TAN/d; plus a 100 L tank 0.3. Compare to ~0.01-0.03 g TAN/d per small fish (check food-load numbers elsewhere).

Gaps: no accessible primary values for pH factor or filter volumes; Timmons and Ebeling and the Chen et al. reviews were not opened.
