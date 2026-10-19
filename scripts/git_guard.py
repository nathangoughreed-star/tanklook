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


def main():
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8-sig"))   # a PowerShell pipe adds a BOM
    except Exception:
        sys.exit(0)
    cmd = (data.get("tool_input") or {}).get("command") or ""
    if "git" not in cmd:
        sys.exit(0)
    cmd = re.sub(r"""\s-m\s+("(?:[^"\\]|\\.)*"|'[^']*')""", " -m MSG", cmd)   # commit messages may say anything
    for where, seg in segments(data.get("cwd") or "", cmd):
        if not shared(where):
            continue
        for pat, why in RULES:
            if re.search(pat, seg):
                deny(why)


if __name__ == "__main__":
    main()
