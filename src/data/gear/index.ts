// The gear catalogue, one JSON file per type (lane GM1, 2026-10-29) so lanes adding products never edit the same file.
// `gearCatalog` has the shape the old single gear-catalog.json had; data/gearCatalog.ts reads the per-type arrays.
import meta from './meta.json';
import skimmers from './skimmers.json';
import uv from './uv.json';
import co2 from './co2.json';
import ato from './ato.json';
import chillers from './chillers.json';
import heaters from './heaters.json';
import filters from './filters.json';
import lights from './lights.json';
import pumps from './pumps.json';

export const gearCatalog = { asOf: meta.asOf, note: meta.note, skimmers, uv, co2, ato, chillers, heaters, filters, lights, pumps };
