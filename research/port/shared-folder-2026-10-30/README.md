# Shared folder backup before reset (2026-10-30, Coordinator 16, Nathan: "dirty files dealt with")
The shared folder C:/Users/nreed/Glass Box was ~269 commits behind origin/main with 31 dirty tracked files.
- tracked.patch: `git diff` of all 31 files against the folder's base (BASE.txt). R6 audited this set and R7 ported its unique work (pricing, light efficiency, finish ladder); the no-filter Filtration bar (src/ui/fullnessTile.ts) is ported by R9.
- The folder's local main (039a61ec, incl. the unpushed "Starting from something I have now" commit, ported by R9) is kept as local branch backup/shared-main-2026-10-30.
- untracked-list.txt: untracked files at reset time; every one that also exists on main was identical (line endings only). Untracked files were left in place.
To recover a file: `git apply --include=<path> research/port/shared-folder-2026-10-30/tracked.patch` against BASE, or `git show backup/shared-main-2026-10-30:<path>`.
