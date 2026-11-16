#!/bin/sh
# PV1: headless Chrome shots. usage: sh research/mockups/PV1/shoot.sh
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
R="$(pwd)"; D="$(cygpath -m "$R")/research/mockups/PV1"; D="$(echo "$D" | sed "s/ /%20/g")"; O="$(cygpath -w "$R")\research\screens\PV1"
shot() { # name file W H hash
  "$CH" --headless=old --disable-gpu --hide-scrollbars --window-size=$3,$4 --virtual-time-budget=800 --screenshot="$O/$1.png" "file:///$D/$2#$5" >/dev/null 2>&1
}
for f in 01-hob-20-long 02a-canister-40-cutaway 02b-canister-40-flat 03-reef-75; do
  shot "$f-1280" $f.html 1280 800 ""
  shot "$f-1280-losses" $f.html 1280 800 "losses"
done
for f in 02a-canister-40-cutaway 02b-canister-40-flat; do
  for h in "" "losses"; do
    n="$f-390"; [ -n "$h" ] && n="$f-390-losses"
    W="$(cygpath -m "$R")/research/mockups/PV1/_phone.html"; W="$(echo "$W" | sed "s/ /%20/g")"
    printf '<body style="margin:0;background:#000"><iframe src="%s#%s" width="390" height="844" style="border:0"></iframe>' "$f.html" "$h" > "$R/research/mockups/PV1/_phone.html"
    "$CH" --headless=old --disable-gpu --hide-scrollbars --window-size=800,900 --virtual-time-budget=800 --screenshot="$O/$n.png" "file:///$W" >/dev/null 2>&1
    python -c "import sys;from PIL import Image;im=Image.open(sys.argv[1]);im.crop((0,0,390,844)).save(sys.argv[1])" "$O/$n.png"
  done
done
rm -f "$R/research/mockups/PV1/_phone.html"
ls research/screens/PV1
