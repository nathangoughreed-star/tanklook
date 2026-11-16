#!/bin/sh
# Renders every WS1 mockup page to PNG with headless Chrome. Run from this folder.
C="/c/Program Files/Google/Chrome/Application/chrome.exe"
D="$(pwd -W 2>/dev/null || pwd)"
r() { # name page w h
  "$C" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 --window-size=$3,$4 --virtual-time-budget=4000 --screenshot="$D/$1.png" "file:///$D/ws.html?p=$2" >/dev/null 2>&1
}
r 01-shell-flow shell 1280 600
r 02-tank-picker tank 1280 800
r 03-tank-custom tank-custom 1280 800
r 04-scape-hardscape scape 1280 900
r 05-scape-substrate scape-substrate 1280 900
r 06-plants plants 1280 800
r 07-animals animals 1280 900
r 08-equipment equipment 1280 800
r 09-frames-compare frames 1280 440
r 10-frame-B scapeB 1280 800
r 11-frame-C scapeC 1280 800
r 12-small-panels small 1280 960
r 13-phone-flow p-flow 1280 700
r 14-phone-scape p-scape 390 844
r 15-phone-animals p-animals 390 844
r 16-phone-equipment p-equipment 390 844
r 17-phone-tank p-tank 390 844
