#!/usr/bin/env bash
# Forgotten-work sweep (Nathan 2026-11-12: "my concern is forgotten or lost work I already instructed a chat to fix").
# Lists, for the last N days (default 7):
#   1. branches (local and on GitHub) holding commits whose change is NOT on origin/main (git cherry, so cherry-picked work counts as merged);
#   2. worktrees with uncommitted edits to tracked files;
#   3. the shared folder's uncommitted tracked edits.
# Read-only: it fetches, never changes a branch or a file. Run it at every "check" and before archiving a chat.
# Usage: bash scripts/unmerged.sh [days]
set -u
DAYS=${1:-7}
REPO="C:/Users/nreed/Glass Box"
g() { git -C "$REPO" "$@"; }
g fetch -q origin 2>/dev/null
SINCE=$(date -d "-$DAYS days" +%s 2>/dev/null || echo 0)

echo "== Branches with work not on origin/main (last $DAYS days) =="
declare -A seen
n=0
while IFS='|' read -r ref ts; do
  [ "$ts" -lt "$SINCE" ] && continue
  name=${ref#refs/heads/}; name=${name#refs/remotes/origin/}
  [ "$name" = main ] || [ "$name" = HEAD ] && continue
  sha=$(g rev-parse -q --verify "$ref")
  [ -n "${seen[$sha]:-}" ] && continue; seen[$sha]=1
  left=$(g cherry origin/main "$ref" 2>/dev/null | grep -c '^+')
  [ "$left" -eq 0 ] && continue
  where=local; [[ $ref == refs/remotes/* ]] && where=github
  printf '%3d commit(s)  %s  %-7s %s  | %s\n' "$left" "$(date -d @"$ts" +%m-%d\ %H:%M)" "$where" "$name" "$(g log -1 --format=%s "$ref" | cut -c1-90)"
  n=$((n+1))
done < <(g for-each-ref --sort=-committerdate --format='%(refname)|%(committerdate:unix)' refs/heads refs/remotes/origin)
[ $n -eq 0 ] && echo "(none)"

echo; echo "== Worktrees with uncommitted edits (tracked files) =="
m=0; tmp=0
while read -r wt; do
  [ -d "$wt" ] || continue
  case "$wt" in */AppData/Local/Temp/*) tmp=$((tmp+1)); continue;; esac   # chats' throwaway scratch checkouts (thousands of false "edits")
  [ "$(cd "$wt" && pwd -W 2>/dev/null || pwd)" = "$REPO" ] && continue
  mt=$(stat -c %Y "$wt" 2>/dev/null || echo 0); [ "$mt" -lt "$SINCE" ] && continue
  dirty=$(git -C "$wt" status --porcelain -uno 2>/dev/null | wc -l)
  [ "$dirty" -eq 0 ] && continue
  br=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null)
  printf '%3d file(s)  %s  [%s]  %s\n' "$dirty" "$wt" "$br" "$(git -C "$wt" status --porcelain -uno | awk '{print $2}' | head -4 | tr '\n' ' ')"
  m=$((m+1))
done < <(g worktree list --porcelain | sed -n 's/^worktree //p')
[ $m -eq 0 ] && echo "(none)"; [ $tmp -gt 0 ] && echo "($tmp scratch checkouts under AppData/Local/Temp skipped)"

echo; echo "== Shared folder: uncommitted tracked edits =="
g status --porcelain -uno | sed 's/^/  /'
[ -z "$(g status --porcelain -uno)" ] && echo "(none)"
echo; echo "For each line: name the chat that made it (search transcripts), then merge, port, or tell Nathan it was dropped on purpose."
