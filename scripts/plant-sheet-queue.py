"""ChatGPT leaf-sheet queue for plants (R151, lane PT): the plant twin of scripts/sheet-queue.py.
The prompts live in research/plant-sheets/prompts/leaf-sheet.md: the shared block plus one paragraph per plant type
("### <type>: ..." heading, then a ``` block). For each type in the queue it:
  1. builds that type's prompt (shared block + blank line + species paragraph), copies it to the clipboard and opens a
     new ChatGPT chat in the default browser;
  2. waits for a new image in Downloads (the ChatGPT download button), then files it as
     C:/Users/nreed/fish-sheets/plants/<type>-d1.png (lossless PNG, what lane PT's cutter reads). It keeps the download
     as <type>-d1-download.<ext>, and <type>-d1.json records where the sheet came from and when;
  3. moves on to the next type.
Your part per plant: Ctrl+V, Enter, wait, click download. One new chat per sheet.
While waiting:  s = skip this plant,  r = copy the prompt and open a new chat again,  q = quit.
It shares the fish queue's lock, so it won't run at the same time as scripts/sheet-queue.py (the two would grab each
other's downloads).
Usage: python scripts/plant-sheet-queue.py              every type in leaf-sheet.md that has no <type>-d1.png yet
       python scripts/plant-sheet-queue.py crypt grass   just these types
  --redo        keep an existing sheet as <type>-d1-prev-<n>.png and ask again
  --list        print the types and whether each has a sheet, then stop
  --print TYPE  print that type's full prompt, then stop
  --downloads DIR / --out DIR / --no-open   (testing)
Then tell lane PT "plant sheets are in"."""
import sys, os, re, time, json, glob, shutil, hashlib, subprocess, webbrowser
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(HERE, '..', 'research', 'plant-sheets', 'prompts', 'leaf-sheet.md')
SHEETS = 'C:/Users/nreed/fish-sheets'
LOCK = os.path.join(SHEETS, 'sheet-queue.lock')   # the fish queue's lock: one queue at a time
EXT = ('.png', '.jpg', '.jpeg', '.webp')


def load_prompts(path=PROMPTS):
    """{type: (heading, full prompt)} from leaf-sheet.md, in file order."""
    md = open(path, encoding='utf-8').read()
    shared = re.search(r'## Shared block.*?```\n(.*?)```', md, re.S)
    if not shared: sys.exit(f'no "## Shared block" code block in {path}')
    out = {}
    for m in re.finditer(r'^### (\w+): (.*?)$\n```\n(.*?)```', md, re.S | re.M):
        out[m.group(1)] = (re.sub(r'\s*\(plant type `\w+`\)', '', m.group(2)).strip(), shared.group(1).strip() + '\n\n' + m.group(3).strip())
    if not out: sys.exit(f'no "### <type>: ..." paragraphs in {path}')
    return out


def clip(text):
    p = os.path.join(os.environ.get('TEMP', '.'), 'plant-sheet-queue-prompt.txt'); open(p, 'w', encoding='utf-8').write(text)
    subprocess.run(['powershell', '-NoProfile', '-Command', f"Set-Clipboard -Value (Get-Content -Raw -Encoding UTF8 '{p}')"], check=True)


def images(d):
    out = {}
    for f in os.listdir(d):
        if f.lower().endswith(EXT):
            try: st = os.stat(os.path.join(d, f)); out[f] = (st.st_mtime, st.st_size)
            except OSError: pass
    return out


def key():
    try:
        import msvcrt
        return msvcrt.getwch().lower() if msvcrt.kbhit() else None
    except ImportError: return None


def digest(p): return hashlib.md5(open(p, 'rb').read()).hexdigest()


FILED = set()


def wait_download(dl, before, ask):
    """The path of the first new, finished image in dl, or 's' / 'q'. Skips exact copies of a sheet already filed."""
    seen = {}
    while True:
        k = key()
        if k in ('s', 'q'): return k
        if k == 'r': ask(); print('  prompt copied again, new chat opened', flush=True)
        for f, (mt, sz) in images(dl).items():
            if before.get(f) == (mt, sz): continue
            if os.path.exists(os.path.join(dl, f + '.crdownload')) or sz == 0: continue
            if seen.get(f) == sz:   # same size two polls running: the download is complete
                p = os.path.join(dl, f)
                try: Image.open(p).verify()
                except Exception: seen[f] = sz; continue
                if digest(p) in FILED:
                    print(f'  ignored {f}: a repeat download of a sheet already filed', flush=True); before[f] = (mt, sz); continue
                return p
            seen[f] = sz
        time.sleep(1)


def title_matches(path, kind, heading):
    """ChatGPT names the download after the picture. A name sharing no word with the plant only warns."""
    words = {kind.lower()} | {w.strip(".,()'").lower() for w in re.split(r'[\s,/]+', heading)}
    t = os.path.basename(path).lower()
    return any(w in t for w in words if len(w) >= 4) or 'leaf' in t or 'leaves' in t


def single_instance():
    try:
        pid = int(open(LOCK).read().strip())
        r = subprocess.run(['tasklist', '/FI', f'PID eq {pid}', '/NH'], capture_output=True, text=True)
        if pid != os.getpid() and str(pid) in r.stdout and 'python' in r.stdout.lower():
            sys.exit(f'a sheet queue (fish or plant) is already running (PID {pid}). Finish or quit it (q), then run this again.\n'
                     f'Stuck? taskkill /PID {pid} /F')
    except (OSError, ValueError): pass
    os.makedirs(SHEETS, exist_ok=True); open(LOCK, 'w').write(str(os.getpid()))


def main(argv):
    opt = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i] in ('--downloads', '--out', '--print')}
    P = load_prompts()
    if '--print' in opt:
        k = opt['--print']
        if k not in P: sys.exit(f'unknown type {k}; known: {", ".join(P)}')
        print(P[k][1]); return
    out = opt.get('--out', os.path.join(SHEETS, 'plants')); os.makedirs(out, exist_ok=True)
    sheet_of = lambda k: os.path.join(out, f'{k}-d1.png')
    if '--list' in argv:
        for k, (h, _) in P.items(): print(f'{k:10s} {"HAS SHEET" if os.path.exists(sheet_of(k)) else "needed   "}  {h}')
        return
    dl = opt.get('--downloads', os.path.join(os.path.expanduser('~'), 'Downloads'))
    redo, noopen = '--redo' in argv, '--no-open' in argv
    args = [a for i, a in enumerate(argv) if not a.startswith('--') and not (i > 0 and argv[i - 1] in opt)]
    bad = [a for a in args if a not in P]
    if bad: sys.exit(f'unknown type(s) {bad}; known: {", ".join(P)}')
    q = args or [k for k in P if not os.path.exists(sheet_of(k))]
    if not redo: q = [k for k in q if not os.path.exists(sheet_of(k)) or print(f'{k}: already has {sheet_of(k)} (use --redo)')]
    if not q: sys.exit('nothing in the queue: every type has a sheet (--redo to make one again, --list to see them)')
    single_instance()
    for p in glob.glob(out + '/*-download.*') + glob.glob(SHEETS + '/*/sheet-download.*'): FILED.add(digest(p))
    print(f'{len(q)} plant sheet(s) to make: {", ".join(q)}. Per plant: Ctrl+V, Enter, wait, click download.  s = skip, r = reopen, q = quit\n')
    done, skipped = [], []
    for n, k in enumerate(q, 1):
        heading, prompt = P[k]; sheet = sheet_of(k)
        if os.path.exists(sheet):
            i = 1
            while os.path.exists(os.path.join(out, f'{k}-d1-prev-{i}.png')): i += 1
            os.replace(sheet, os.path.join(out, f'{k}-d1-prev-{i}.png'))
        def ask():
            clip(prompt)
            if not noopen: webbrowser.open('https://chatgpt.com/')
        before = images(dl); ask()
        print(f'[{n}/{len(q)}] {k} ({heading}): prompt copied, new ChatGPT chat opened. Waiting for the download...', flush=True)
        got = wait_download(dl, before, ask)
        if got == 'q': print('  quit'); skipped += q[n - 1:]; break
        if got == 's': print('  skipped'); skipped.append(k); continue
        match = title_matches(got, k, heading)
        if not match: print(f'  NOTE: the download is named "{os.path.basename(got)}", which shares no word with {k}; filed anyway, check it.', flush=True)
        keep = os.path.join(out, f'{k}-d1-download' + os.path.splitext(got)[1].lower())
        FILED.add(digest(got)); shutil.move(got, keep)
        im = Image.open(keep); im.load(); im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB').save(sheet, optimize=True)
        json.dump({'type': k, 'species': heading, 'download': os.path.basename(got), 'filed': time.strftime('%Y-%m-%d %H:%M'),
                   'size_px': list(im.size), 'generator': 'ChatGPT (Nathan, web)', 'prompt_chars': len(prompt), 'title_match': match},
                  open(os.path.join(out, f'{k}-d1.json'), 'w'), indent=1)
        print(f'  filed: {sheet} ({im.size[0]}x{im.size[1]})', flush=True); done.append(k)
    print(f'\ndone: {len(done)} {done}' + (f'\nskipped: {skipped}' if skipped else '') + '\nNext: tell lane PT "plant sheets are in".')


if __name__ == '__main__':
    main(sys.argv[1:])
