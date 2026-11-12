"""Stop hook (Nathan 2026-11-12): a chat may not end its turn with its own edits left uncommitted.

Reads the hook input (JSON on stdin): transcript_path, cwd, stop_hook_active.
Collects the files this chat changed with Edit / Write / NotebookEdit (from its transcript) that are tracked or new in
the chat's checkout and still show as modified / untracked there. If any, blocks the stop once (exit 2) and tells the
chat to commit them now. In the shared folder (C:/Users/nreed/Glass Box) that means scripts/ship.sh, which commits
only the named files and pushes; in a worktree, a normal commit on its branch. Never blocks twice in a row
(stop_hook_active), never blocks on errors.
"""
import json, os, subprocess, sys

SHARED = os.path.normcase(os.path.abspath("C:/Users/nreed/Glass Box"))


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    if data.get("stop_hook_active"):
        return 0
    tp, cwd = data.get("transcript_path"), data.get("cwd") or os.getcwd()
    if not tp or not os.path.exists(tp):
        return 0
    try:
        root = subprocess.run(["git", "-C", cwd, "rev-parse", "--show-toplevel"], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return 0
    if not root:
        return 0
    rootn = os.path.normcase(os.path.abspath(root))
    edited = set()
    try:
        with open(tp, encoding="utf-8", errors="replace") as f:
            for line in f:
                if '"tool_use"' not in line:
                    continue
                try:
                    msg = json.loads(line).get("message", {})
                except Exception:
                    continue
                for c in msg.get("content", []) if isinstance(msg.get("content"), list) else []:
                    if c.get("type") == "tool_use" and c.get("name") in ("Edit", "Write", "NotebookEdit"):
                        p = (c.get("input") or {}).get("file_path") or (c.get("input") or {}).get("notebook_path")
                        if p:
                            pn = os.path.normcase(os.path.abspath(p))
                            if pn.startswith(rootn + os.sep) and os.sep + ".claude" + os.sep + "worktrees" + os.sep not in pn[len(rootn):]:
                                edited.add(os.path.relpath(os.path.abspath(p), os.path.abspath(root)).replace("\\", "/"))  # real case: git pathspecs are case-sensitive
    except Exception:
        return 0
    if not edited:
        return 0
    try:
        st = subprocess.run(["git", "-C", root, "status", "--porcelain", "--", *sorted(edited)], capture_output=True, text=True, timeout=20).stdout
    except Exception:
        return 0
    left = []
    for l in st.splitlines():
        path = l[3:].strip().strip('"')
        if path and not path.startswith(".claude/launch.json"):
            left.append(path)
    if not left:
        return 0
    shared = rootn == SHARED
    how = ("run: scripts/ship.sh -m \"<what and why>\" " + " ".join(left) +
           "  (commits only these files and pushes; if another chat also has edits in one of them, ship it anyway and say so in the message)") if shared else \
          ("git add " + " ".join(left) + " && git commit -m \"<what and why>\"  (then report the sha as your brief says)")
    sys.stderr.write(
        "Uncommitted work (Nathan 2026-11-12: every chat commits its own work immediately, no coordinator needed): "
        "you edited these files and they are still uncommitted: " + ", ".join(left) + ". "
        "Run `npm run build` (and the tests for what you touched), then " + how + ". "
        "If the work is unfinished or Nathan said not to commit, say so explicitly in your reply instead.\n")
    return 2


if __name__ == "__main__":
    sys.exit(main())
