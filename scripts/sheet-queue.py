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


def wait_download(dl, before, ask):
    """Returns the path of the first new, finished image in dl, or 's' / 'q'."""
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
                try: Image.open(os.path.join(dl, f)).verify(); return os.path.join(dl, f)
                except Exception: pass
            seen[f] = sz
        time.sleep(1)


def main(argv):
    opt = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i] in ('--downloads',)}
    dl = opt.get('--downloads', os.path.join(os.path.expanduser('~'), 'Downloads')); redo = '--redo' in argv; noopen = '--no-open' in argv
    if '--all' in argv: q = sorted(d for d in glob.glob(SHEETS + '/*-gen') if os.path.exists(d + '/prompt.txt') and not os.path.exists(d + '/sheet.webp'))
    else: q = [a for i, a in enumerate(argv) if not a.startswith('--') and not (i > 0 and argv[i - 1] == '--downloads')]
    q = [d for d in q if os.path.exists(os.path.join(d, 'prompt.txt'))]
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
        if got == 'q': print('  quit'); skipped += [os.path.basename(x) for x in q[n - 1:]]; break
        if got == 's': print('  skipped'); skipped.append(name); continue
        ext = os.path.splitext(got)[1].lower(); keep = os.path.join(d, 'sheet-download' + ext)
        shutil.move(got, keep)
        im = Image.open(keep); im.load(); im.convert('RGB').save(sheet, lossless=True)
        json.dump({'download': os.path.basename(got), 'filed': time.strftime('%Y-%m-%d %H:%M'), 'size_px': list(im.size), 'generator': 'ChatGPT (Nathan, web)',
                   'prompt_chars': len(prompt)}, open(os.path.join(d, 'sheet.json'), 'w'), indent=1)
        print(f'  filed: {sheet} ({im.size[0]}x{im.size[1]})'); done.append(name)
    print(f'\ndone: {len(done)} {done}' + (f'\nskipped: {skipped}' if skipped else '') + '\nNext: tell the fish chat "sheets are in".')


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1:])
