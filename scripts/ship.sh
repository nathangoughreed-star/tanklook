#!/usr/bin/env bash
# Commit named files and push them to origin/main WITHOUT touching anyone else's uncommitted work.
# This is the only way to push from the shared folder (C:/Users/nreed/Glass Box), which many chats edit at once
# (Nathan 2026-10-19, after a `pull --rebase --autostash` failed to restore other chats' edits and had to be checked
# by hand). scripts/git_guard.py blocks direct push / pull / stash there and points here.
#
#   scripts/ship.sh -m "message" path [path...]      (or -F msgfile)
#
# 1. Commits only the named paths (new files included); other chats' edits, staged or not, stay out.
# 2. Merges that commit with origin/main in a throwaway worktree and pushes from there. The shared folder is never
#    stashed, rebased or reset. A real content conflict stops here with nothing pushed and nothing touched.
# 3. Fast-forwards the shared folder to the pushed commit. If that would overwrite a file another chat has dirty,
#    git refuses without touching anything; the folder just stays behind until a later ship. Harmless.
set -euo pipefail
msg=() paths=()
while (($#)); do
  case "$1" in
    -m) msg=(-m "$2"); shift 2 ;;
    -F) msg=(-F "$2"); shift 2 ;;
    --) shift; paths+=("$@"); break ;;
    *) paths+=("$1"); shift ;;
  esac
done
((${#msg[@]})) || { echo "ship: give a message with -m or -F" >&2; exit 2; }
((${#paths[@]})) || { echo "ship: name the files to commit (never everything: other chats share this folder)" >&2; exit 2; }

top=$(git rev-parse --show-toplevel); cd "$top"
git add -- "${paths[@]}"
git commit -q "${msg[@]}" --only -- "${paths[@]}"
mine=$(git rev-parse HEAD)
echo "ship: committed $(git log -1 --format='%h %s' "$mine")"

git fetch -q origin main
tmp=$(mktemp -d "${TMPDIR:-/tmp}/ship.XXXXXX"); rmdir "$tmp"
git worktree add -q --detach "$tmp" origin/main
cleanup() { git worktree remove "$tmp" 2>/dev/null || git worktree remove --force "$tmp"; }
trap cleanup EXIT
for try in 1 2 3; do
  if ! git -C "$tmp" merge -q --no-edit "$mine"; then
    git -C "$tmp" merge --abort
    echo "ship: CONFLICT merging with origin/main. Nothing pushed; the shared folder is untouched." >&2
    echo "      Your commit $mine is on local main. Resolve in your own worktree, or ask the coordinator." >&2
    exit 1
  fi
  if git -C "$tmp" push -q origin HEAD:main; then break; fi
  ((try < 3)) || { echo "ship: push rejected 3 times (others pushing); try again" >&2; exit 1; }
  git fetch -q origin main; git -C "$tmp" reset -q --hard origin/main   # throwaway worktree only
done
pushed=$(git -C "$tmp" rev-parse HEAD)

if git merge -q --ff-only "$pushed" 2>/dev/null; then
  echo "ship: pushed; shared folder now at $(git log -1 --format=%h)"
else
  echo "ship: pushed $(git rev-parse --short "$pushed"). Shared folder left at $(git rev-parse --short HEAD): another chat has"
  echo "      uncommitted edits to a file this update changes, so git refused to overwrite them. Nothing lost; it catches up on a later ship."
fi
echo "ship: build $(git rev-list --count origin/main)"
