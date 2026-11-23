"""Body mass of a build-B fish against FishBase, and the `thickx` that makes them equal (method doc step E, row 33).
  Model: the anatomy JSON's depth profile (top/bottom, % SL) and top-view half-widths (% SL) times the render's
  thickx (render.photo.thickx, applied at render time in photofish.ts), each station a superellipse of exponent 2.4 (fish3d.ts EXP), density 1.02 g/cm3, trunk only (no fins).
  FishBase: W = a * TL^b, TL in cm, W in g.
Usage: python fish-mass.py <anatomy.json> <tl_mm> <a> <b>
Prints model g (at the current thickx), FishBase g, ratio, and the thickx that gives 1.0x FishBase."""
import sys, json, math


def main(path, tl_mm, a, b):
    an = json.load(open(path, encoding='utf-8'))['anatomy']
    thx = an['render']['photo'].get('thickx') or 1.0
    st = an['depthProfile']['stations']; top = an['depthProfile']['top']; bot = an['depthProfile']['bottom']
    hw = [w * thx for w in an['thickness']['halfWidthPctSL']]; assert an['thickness']['stations'] == st
    n = 2.4; k = 4 * math.gamma(1 + 1 / n) ** 2 / math.gamma(1 + 2 / n)   # area of |x/a|^n + |y/b|^n <= 1 is k*a*b
    sl = tl_mm / 10 / an['tlOverSl']                                       # cm
    area = [k * ((t + bo) / 2 / 100 * sl) * (w / 100 * sl) for t, bo, w in zip(top, bot, hw)]
    vol = sum((area[i] + area[i + 1]) / 2 * (st[i + 1] - st[i]) / 100 * sl for i in range(len(st) - 1))
    m, fb = 1.02 * vol, a * (tl_mm / 10) ** b
    r = m / fb
    print(f'model {m:.1f} g, FishBase {fb:.1f} g (TL {tl_mm / 25.4:.1f} in), ratio {r:.2f}; '
          f'max width {2 * max(hw):.1f}% SL; set thickx {thx / r:.2f} (current {thx})')


if __name__ == '__main__':
    A = sys.argv[1:]
    main(A[0], float(A[1]), float(A[2]), float(A[3]))
