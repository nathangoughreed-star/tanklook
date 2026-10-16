// Lane SG: link time of the hardscape program per grit kind (render/items.ts gritK): each variant drops one kind's
// branch (k = 1.0), so original - variant = that kind's share. Each edit is sent to the page as source: no closures.
//   node scripts/perf-baseline.mjs --shaders --variants research/efficiency/SG-kinds-compile.mjs --reps 3 --out research/efficiency/SG-kinds-compile.json
export default {
  original: s => s,
  'no stone grain (1-5)': s => s.replace('k = gStone(q, px, rough, cracks);', 'k = 1.0;'),
  'no stone cracks': s => s.replace('float e = gEdge(q)', 'float e = 1.0'),
  'no slate fissures (5)': s => s.replace(/if \(t == 5\) \{[\s\S]*?\n    \}/, ''),
  'no wood (6)': s => s.replace('else if (t == 6) k = gWood(p);', 'else if (t == 6) k = 1.0;'),
  'no clay (7)': s => s.replace(/else if \(t == 7\) k = [\s\S]*?;\n  else if \(t == 8\)/, 'else if (t == 7) k = 1.0;\n  else if (t == 8)'),
  'no coconut (8)': s => s.replace(/else if \(t == 8\) k = [^\n]*/, 'else if (t == 8) k = 1.0;'),
  'no end grain (9)': s => s.replace(/else if \(t == 9\) \{[^\n]*/, 'else if (t == 9) k = 1.0;'),
  'no plain wood / cork (10)': s => s.replace(/else if \(t == 10\) k = [^\n]*/, 'else if (t == 10) k = 1.0;'),
  'no hard coral (11)': s => s.replace(/else if \(t == 11\) k = [\s\S]*?;\n  else if \(t == 12\)/, 'else if (t == 11) k = 1.0;\n  else if (t == 12)'),
  'no soft coral / moss (12)': s => s.replace(/else if \(t == 12\) k = [^\n]*/, 'else if (t == 12) k = 1.0;'),
  'no grit at all': s => s.replace('diffuseColor.rgb *= gritK();', ''),
};
