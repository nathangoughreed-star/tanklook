# Glass Box / TankLook (Yourarium): rules for every chat

## Commit your own work immediately (Nathan, 2026-11-12)
Every chat commits its own finished work itself, right away. You don't need a coordinator for this. Never end with "left uncommitted" or "left for the coordinator".

- **In the shared folder `C:/Users/nreed/Glass Box`:**
  1. Run `npm run build` (it includes tsc) and the tests for what you touched.
  2. Then run `scripts/ship.sh -m "<what and why>" <your files>`. It commits only the named files and pushes to main without touching other chats' edits.
  3. If a file you changed also has another chat's uncommitted edit, ship it anyway and name that in the message.
  4. Direct push, pull, stash and reset are blocked there (`scripts/git_guard.py`); `ship.sh` is the way.
- **In a worktree (`.claude/worktrees/*` or `../Glass-Box-*`):** commit on your branch. If your brief says a coordinator merges, send them the sha.
- **Not finished, or Nathan said not to commit?** Say that plainly in your last reply.

A Stop hook (`scripts/commit_check.py`) checks for files you edited that are still uncommitted, and stops you once to commit them.

## Other house rules
- End replies with "Build N", the commit count on origin/main.
- Use US units.
- Project state lives in `HANDOFF.md` ("Start here"). Grep it by section; never read it whole.
