"""Extracts José's vector layers (and every animation frame) from Personaje.psd.

Usage: pip install psd-tools && python3 scripts/psd-extract.py Personaje.psd character-src
Writes one SVG per layer/frame plus manifest.json. Then run scripts/build-puppet.py.
Frame 00 of each animated layer is the END of the original animation (headphones on).
"""
import sys, os, json, tempfile
from psd_tools import PSDImage

psd_path, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
names = {1: 'neck', 2: 'shirt', 3: 'neck-shadow', 4: 'ears', 5: 'ear-shade', 6: 'face', 7: 'hair',
         11: 'mouth-alt', 12: 'nose', 13: 'glasses'}
motion = {8: 'lenses', 9: 'pupils', 10: 'mouth', 14: 'hands', 15: 'headphones'}
manifest = {}
psd = PSDImage.open(psd_path)
layers = list(psd)
for i, n in names.items():
    l = layers[i]
    open(f'{out}/{n}.svg', 'wb').write(l.smart_object.data)
    manifest[n] = {'file': f'{n}.svg', 'bbox': list(l.bbox), 'opacity': l.opacity}
for i, n in motion.items():
    with tempfile.NamedTemporaryFile(suffix='.psb', delete=False) as tmp:
        tmp.write(layers[i].smart_object.data)
    inner = PSDImage.open(tmp.name)
    frames = []
    for k, l in enumerate([x for x in inner.descendants() if x.kind == 'smartobject']):
        fn = f'{n}-{k:02d}.svg'
        open(f'{out}/{fn}', 'wb').write(l.smart_object.data)
        frames.append({'file': fn, 'bbox': list(l.bbox)})
    manifest[n] = {'frames': frames}
json.dump(manifest, open(f'{out}/manifest.json', 'w'), indent=1)
print('ok', len(manifest))
