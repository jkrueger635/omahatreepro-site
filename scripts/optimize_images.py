#!/usr/bin/env python3
"""Shrink images for the web (WebP). Needs Pillow: pip3 install pillow  (Claude runs this in the linked-computer shell)

  python3 scripts/optimize_images.py hero  public/images/banner.jpg  [more files]   # -> banner-sm.webp (800w) + banner-lg.webp (1600w)
  python3 scripts/optimize_images.py photo public/images/team.jpg    [more files]   # -> team.webp (max 1200w)
  python3 scripts/optimize_images.py photo --width 750 public/images/person.jpg     # custom max width

Originals are MOVED to ../_to_delete/original-images/ (never deleted). After converting, update the references in src/.
Check the size table it prints: very detailed photos (forests, gravel) can stay heavy: lower --quality (e.g. 55) for those.
"""
import argparse, os, shutil, sys
from PIL import Image, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument('mode', choices=['hero', 'photo'])
ap.add_argument('files', nargs='+')
ap.add_argument('--width', type=int, default=1200, help='max width for photo mode')
ap.add_argument('--quality', type=int, default=None, help='WebP quality (default 74 hero, 78 photo)')
a = ap.parse_args()
orig_dir = os.path.join(os.path.dirname(os.path.abspath(a.files[0])), '..', '..', '..', '_to_delete', 'original-images')
os.makedirs(orig_dir, exist_ok=True)

def save(im, out, w, q):
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(out, 'WEBP', quality=q, method=6)
    return os.path.getsize(out) // 1024

for f in a.files:
    stem = os.path.splitext(f)[0]
    im = ImageOps.exif_transpose(Image.open(f))
    im = im.convert('RGBA' if ('A' in im.getbands() or im.info.get('transparency')) else 'RGB')
    before = os.path.getsize(f) // 1024
    if a.mode == 'hero':
        q = a.quality or 74
        sm, lg = save(im, f'{stem}-sm.webp', 800, q), save(im, f'{stem}-lg.webp', 1600, q)
        print(f'{os.path.basename(f)}: {before} KB -> sm {sm} KB + lg {lg} KB')
    else:
        out = f'{stem}.webp'
        if os.path.abspath(out) == os.path.abspath(f):          # already .webp: keep a copy of the original first
            shutil.copy(f, os.path.join(orig_dir, os.path.basename(f))); tmp = out + '.tmp.webp'
            kb = save(im, tmp, a.width, a.quality or 78); os.replace(tmp, out)
            print(f'{os.path.basename(f)}: {before} KB -> {kb} KB (re-encoded in place)'); continue
        kb = save(im, out, a.width, a.quality or 78)
        print(f'{os.path.basename(f)}: {before} KB -> {os.path.basename(out)} {kb} KB')
    if os.path.abspath(f) != os.path.abspath(f'{stem}.webp'): shutil.move(f, os.path.join(orig_dir, os.path.basename(f)))
