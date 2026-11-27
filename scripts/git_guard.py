r"""PreToolUse guard for the shared Glass Box folder: no git command that can lose another chat's uncommitted work.

Why it exists (Nathan 2026-10-19): many chats edit C:/Users/nreed/Glass Box at once. A `git pull --rebase --autostash`
lifted every chat's edits out, failed to put one back cleanly, and the result had to be checked file by file.
A memory rule ("stage by path") did not prevent it; this hook does.

Active only when the command runs in the shared folder (lane worktrees, including .claude/worktrees, have one owner).
Denied there, each with the safe way in the message:
  - git stash (except list / show), any --autostash  -> moves everyone's edits out and back
  - git reset --hard, git checkout -- / ., git restore (without --staged), git clean -f  -> discards edits
  - git commit -a / --all, git add -A / --all / .     -> commits other chats' work
  - git push, git pull                                -> use scripts/ship.sh, which never touches the folder's edits
"""
import json, os, re, sys

SHARED = os.path.normcase(os.path.normpath(r"C:\Users\nreed\Glass Box"))

GIT = r"\bgit(?:\s+-[Cc]\s+(?:\"[^\"]*\"|'[^']*'|\S+))*\s+"   # git, optionally -C <path> / -c k=v, then the subcommand
ARGS = r"[^|;&\n]*"                                             # the rest of that one command
RULES = [
    (GIT + r"stash\b(?!\s+(list|show)\b)", "git stash lifts out every chat's uncommitted edits in this shared folder."),
    (GIT + ARGS + r"--autostash\b","--autostash stashes every chat's uncommitted edits in this shared folder."),
    (GIT + r"reset\b" + ARGS + r"--hard\b", "git reset --hard discards other chats' edits."),
    (GIT + r"checkout\b" + ARGS + r"(\s--(\s|$)|\s\.(\s|$))", "git checkout -- <path> discards edits."),
    (GIT + r"restore\b(?!" + ARGS + r"--staged)", "git restore (without --staged) discards edits."),
    (GIT + r"clean\b" + ARGS + r"\s-\w*f", "git clean -f deletes other chats' new files."),
    (GIT + r"commit\b(?:\s+-[b-zB-Z]+\b)*\s+(-[a-zA-Z]*a[a-zA-Z]*\b|--all\b)", "git commit -a takes other chats' edits."),
    (GIT + r"add\b" + ARGS + r"(\s-A\b|\s--all\b|\s\.(\s|$))", "git add -A / . stages other chats' edits."),
    (GIT + r"(push|pull)\b", "Pushing or pulling here can collide with other chats' edits."),
]
HOW = ("To commit and push: scripts/ship.sh -m \"message\" <your files>  (bash). It commits only the named files, "
       "merges and pushes from a throwaway worktree, and never stashes, rebases or resets this folder. "
       "To unstage use git restore --staged <file>. Anything else: ask Nathan.")


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                             "permissionDecisionReason": f"Shared-folder git guard: {reason} {HOW}"}}))
    sys.exit(0)


def shared(p):
    p = re.sub(r"^/([a-zA-Z])/", r"\1:/", p.strip().strip("\"'"))   # git-bash /c/Users -> c:/Users
    n = os.path.normcase(os.path.normpath(p))
    return n.startswith(SHARED) and os.path.join(".claude", "worktrees") not in n   # lane worktrees have one owner


PATH = r"""("[^"]*"|'[^']*'|[^\s;&|]+)"""


def segments(cwd, cmd):
    """Each command in a chain with the folder it runs in: cd / Set-Location carry over, -C applies to its own git."""
    here = cwd
    for seg in re.split(r"&&|\|\||;|\||\n", cmd):
        m = re.match(r"\s*(?:cd|Set-Location)\s+" + PATH, seg)
        if m:
            here = m.group(1)
            continue
        c = re.search(r"\bgit\s+-C\s+" + PATH, seg)
        yield (c.group(1) if c else here), seg


FREEZE = r"C:\Users\nreed\.claude\glassbox-push-freeze.json"
"""Push freeze (Nathan 2026-11-27, "pause pushes from the other chats until main is green"): while this file exists,
every chat in every worktree is refused `git push` and scripts/ship.sh, except from a folder listed in its "allow".
The file lives outside the repo so switching the freeze on or off needs no commit:
  {"reason": "...", "since": "...", "allow": ["C:/Users/nreed/Glass-Box-gm"]}
Commit as usual on your branch (or `git commit` your named files in the shared folder); push when the file is gone."""


def norm(p):
    p = re.sub(r"^/([a-zA-Z])/", r"\1:/", (p or "").strip().strip("\"'"))
    return os.path.normcase(os.path.normpath(p)) if p else ""


def frozen(cwd, cmd):
    """The freeze's reason when this command would push from a folder that is not exempt, else None."""
    try:
        with open(FREEZE, encoding="utf-8-sig") as f:
            fz = json.load(f)
    except Exception:
        return None
    allow = [norm(a) for a in fz.get("allow") or []]
    for where, seg in segments(cwd, cmd):
        if not (re.search(GIT + r"push\b", seg) or re.search(r"\bship\.sh\b", seg)):
            continue
        w = norm(where)
        if not any(w == a or w.startswith(a + os.sep) for a in allow):
            return fz.get("reason") or "main is frozen"
    return None


def main():
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8-sig"))   # a PowerShell pipe adds a BOM
    except Exception:
        sys.exit(0)
    cmd = (data.get("tool_input") or {}).get("command") or ""
    if "git" not in cmd and "ship.sh" not in cmd:
        sys.exit(0)
    cmd = re.sub(r"""\s-m\s+("(?:[^"\\]|\\.)*"|'[^']*')""", " -m MSG", cmd)   # commit messages may say anything
    why = frozen(data.get("cwd") or "", cmd)
    if why:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
              "permissionDecisionReason": f"Push freeze: {why} Do not push or run ship.sh until the freeze is lifted. "
              "Commit your work on your branch now (in the shared folder: git add <your files>, git commit), say in "
              "your reply that it is committed but not pushed, and push once the coordinator says main is green. "
              "Do not look for another way to push."}}))
        sys.exit(0)
    for where, seg in segments(data.get("cwd") or "", cmd):
        if not shared(where):
            continue
        for pat, why in RULES:
            if re.search(pat, seg):
                deny(why)


if __name__ == "__main__":
    main()
