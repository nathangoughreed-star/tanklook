"""ChatGPT sheet queue (method row 59): Nathan makes the sheets on his own ChatGPT plan; this script does the copying and filing.
For each fish folder in the queue it:
  1. copies the folder's prompt.txt to the clipboard and opens a new ChatGPT chat in the default browser;
  2. waits for a new image in Downloads (the ChatGPT download button), then files it in the folder as sheet.webp (lossless) and
     keeps the download as sheet-download.<ext>, with sheet.json recording where it came from and when;
  3. moves on to the next fish.
Nathan's part per fish: Ctrl+V, Enter, wait, click download. One new chat per sheet (rule 2: earlier images steer the next one).
While waiting:  s = skip this fish,  r = copy the prompt and open a new chat again,  q = quit.
Usage: python scripts/sheet-queue.py --all              every C:/Users/nreed/fish-sheets/*-gen folder with prompt.txt and no sheet.webp
       python scripts/sheet-queue.py <folder> [<folder>...] [--redo] [--downloads DIR] [--no-open]
  --redo keeps an existing sheet.webp as sheet-prev-<n>.webp and asks again. Then tell the fish chat "sheets are in"."""
import sys, os, time, glob, json, shutil, subprocess, webbrowser
from PIL import Image
SHEETS = 'C:/Users/nreed/fish-sheets'
EXT = ('.png', '.jpg', '.jpeg', '.webp')


def clip(text):
    p = os.path.join(os.environ.get('TEMP', '.'), 'sheet-queue-prompt.txt'); open(p, 'w', encoding='utf-8').write(text)
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


def digest(p):
    import hashlib
    return hashlib.md5(open(p, 'rb').read()).hexdigest()


FILED = set()   # hashes of the sheets filed this run: a repeat download of the previous fish (Nathan, 2026-11-24) is not the next fish's sheet


def wait_download(dl, before, ask):
    """Returns the path of the first new, finished image in dl, or 's' / 'q'. Skips exact copies of a sheet already filed."""
    seen = {}
    while True:
        k = key()
        if k in ('s', 'q'): return k
        if k == 'r': ask(); print('  prompt copied again, new chat opened')
        now = images(dl)
        for f, (mt, sz) in now.items():
            if f in before and before[f] == (mt, sz): continue
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


def expect_words(d):
    """Words the right download's title is likely to contain: the folder's species id, common name, genus and epithet (species.txt)."""
    w = {os.path.basename(d.rstrip(chr(47) + chr(92))).split('-')[0].lower()}
    try:
        for ln in open(os.path.join(d, 'species.txt'), encoding='utf-8'):
            if ln.startswith(('COMMON', 'SCI')): w |= {t.strip('.,()').lower() for t in ln.split('=', 1)[1].split()}
    except OSError: pass
    return {x for x in w if len(x) >= 4}


def title_matches(path, d):
    """ChatGPT titles the download from the picture ("Gourami Anatomy Reference Sheet"). A title sharing no word with the fish is suspect
    (the mismatch only warns: titles like "Orthographic Damselfish ..." for a chromis are fine only if the family word is in the name list)."""
    t = os.path.basename(path).lower(); return any(x in t for x in expect_words(d))


def single_instance():
    """Only one queue at a time (2026-11-24: six copies ran at once, each overwrote the clipboard and grabbed the others' downloads)."""
    lock = os.path.join(SHEETS, 'sheet-queue.lock')
    try:
        pid = int(open(lock).read().strip())
        r = subprocess.run(['tasklist', '/FI', f'PID eq {pid}', '/NH'], capture_output=True, text=True)
        if str(pid) in r.stdout and 'python' in r.stdout.lower():
            sys.exit(f'another sheet queue is already running (PID {pid}). Use that window, or close it (q) and run this again.\n'
                     f'Stuck? taskkill /PID {pid} /F')
    except (OSError, ValueError): pass
    open(lock, 'w').write(str(os.getpid()))


def main(argv):
    single_instance()
    opt = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i] in ('--downloads',)}
    dl = opt.get('--downloads', os.path.join(os.path.expanduser('~'), 'Downloads')); redo = '--redo' in argv; noopen = '--no-open' in argv
    if '--all' in argv: q = sorted(d for d in glob.glob(SHEETS + '/*-gen') if os.path.exists(d + '/prompt.txt') and not os.path.exists(d + '/sheet.webp'))
    else: q = [a for i, a in enumerate(argv) if not a.startswith('--') and not (i > 0 and argv[i - 1] == '--downloads')]
    q = [d for d in q if os.path.exists(os.path.join(d, 'prompt.txt'))]
    for p in glob.glob(SHEETS + '/*/sheet-download.*'): FILED.add(digest(p))   # sheets filed by earlier runs count as repeats too
    if not q: sys.exit('nothing in the queue (folders need prompt.txt' + ('' if redo else ' and no sheet.webp') + ')')
    print(f'{len(q)} sheet(s) to make. Per fish: Ctrl+V, Enter, wait, click download.  s = skip, r = reopen, q = quit\n')
    done, skipped = [], []
    for n, d in enumerate(q, 1):
        name = os.path.basename(d.rstrip('/\\')); sheet = os.path.join(d, 'sheet.webp')
        if os.path.exists(sheet):
            if not redo: print(f'[{n}/{len(q)}] {name}: already has sheet.webp, skipped'); continue
            k = 1
            while os.path.exists(os.path.join(d, f'sheet-prev-{k}.webp')): k += 1
            os.replace(sheet, os.path.join(d, f'sheet-prev-{k}.webp'))
        prompt = open(os.path.join(d, 'prompt.txt'), encoding='utf-8').read()
        def ask():
            clip(prompt)
            if not noopen: webbrowser.open('https://chatgpt.com/')
        before = images(dl); ask()
        print(f'[{n}/{len(q)}] {name}: prompt copied, new ChatGPT chat opened. Waiting for the download...', flush=True)
        got = wait_download(dl, before, ask)
        while got not in ('q', 's') and not title_matches(got, d):   # guard (2026-11-25): a gourami download from another chat was filed as the harlequin
            print(f'  WARNING: the download is named "{os.path.basename(got)}", which shares no word with {name} ({", ".join(sorted(expect_words(d)))}).', flush=True)
            if input('  File it as this fish anyway? [y/N] ').strip().lower() == 'y': break
            before[os.path.basename(got)] = (os.stat(got).st_mtime, os.stat(got).st_size); print('  left in Downloads, waiting for the next download...', flush=True)
            got = wait_download(dl, before, ask)
        if got == 'q': print('  quit'); skipped += [os.path.basename(x) for x in q[n - 1:]]; break
        if got == 's': print('  skipped'); skipped.append(name); continue
        ext = os.path.splitext(got)[1].lower(); keep = os.path.join(d, 'sheet-download' + ext)
        FILED.add(digest(got)); shutil.move(got, keep)
        im = Image.open(keep); im.load(); im.convert('RGB').save(sheet, lossless=True)
        json.dump({'download': os.path.basename(got), 'filed': time.strftime('%Y-%m-%d %H:%M'), 'size_px': list(im.size), 'generator': 'ChatGPT (Nathan, web)',
                   'prompt_chars': len(prompt)}, open(os.path.join(d, 'sheet.json'), 'w'), indent=1)
        print(f'  filed: {sheet} ({im.size[0]}x{im.size[1]})'); done.append(name)
    print(f'\ndone: {len(done)} {done}' + (f'\nskipped: {skipped}' if skipped else '') + '\nNext: tell the fish chat "sheets are in".')


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1:])
