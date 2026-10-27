# usage: powershell -File shot.ps1 -Fig A-tile -Out file.png [-W 1280 -H 860] [-Extra 'tank=20']   (dev server on :5173 must run)
param([string]$Fig, [string]$Out, [int]$W = 1280, [int]$H = 860, [string]$Extra = '')
$u = "http://localhost:5173/research/audits/s243/app.html?fig=$Fig" + $(if ($Extra) { "&$Extra" } else { '' })
Remove-Item $Out -ErrorAction SilentlyContinue
$p = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless', '--no-sandbox', '--hide-scrollbars', "--user-data-dir=$env:TEMP\s243chrome-$([guid]::NewGuid().ToString('N'))", "--window-size=$W,$H", '--virtual-time-budget=60000', "--screenshot=$Out", $u) -Wait -PassThru -WindowStyle Hidden
"$Fig -> exit $($p.ExitCode) exists $(Test-Path $Out)"
