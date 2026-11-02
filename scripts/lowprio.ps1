# Run a heavy command (headless-Chrome renders, screenshot sheets, big scripts) at BELOW-NORMAL priority so merges, tests and the
# person's own work keep the CPU. Usage: powershell -File scripts/lowprio.ps1 node scripts/my-render.mjs args...
# Also takes the machine-wide heavy lock (one heavy job at a time, see HANDOFF.md "Machine load").
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Cmd)
$lock = Join-Path $env:TEMP 'gb-heavy.lock'
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 45) { Remove-Item $lock -Force -ErrorAction SilentlyContinue; break }   # stale
  Start-Sleep -Seconds 20
}
Set-Content $lock "$PID $($Cmd -join ' ')"
try {
  $p = Start-Process -FilePath $Cmd[0] -ArgumentList ($Cmd | Select-Object -Skip 1) -NoNewWindow -PassThru
  try { $p.PriorityClass = 'BelowNormal' } catch {}
  $p.WaitForExit(); exit $p.ExitCode
} finally { Remove-Item $lock -Force -ErrorAction SilentlyContinue }
