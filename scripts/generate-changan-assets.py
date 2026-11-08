"""Original, seeded procedural material maps; no third-party image assets."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'changan'
ROOT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(710)
w, h = 1024, 512
y, x = np.mgrid[:h, :w]
grain = rng.normal(0, 1, (h, w))
soft = np.asarray(Image.fromarray(np.uint8(rng.uniform(0, 255, (64, 128)))).resize((w, h), Image.Resampling.BICUBIC)).astype(float) / 255

def save(name, values):
    Image.fromarray(np.uint8(np.clip(values, 0, 255))).save(ROOT / name)

strata = 5 * np.sin(y * .19 + np.sin(x * .009)) + 2 * np.sin(y * .69)
earth = strata + grain * 3 + soft * 14
save('earth.jpg', np.stack([181 + earth, 151 + earth, 111 + earth], -1))
save('earth-bump.jpg', 127 + strata * 3 + grain * 8 + soft * 22)
wood = 3 * np.sin(x * .23 + np.sin(y * .009) * 2) + 5 * np.sin(x * .071 + np.sin(y * .013)) + grain * 2 + soft * 9
save('wood.jpg', np.stack([88 + wood, 62 + wood * .7, 39 + wood * .45], -1))
save('wood-bump.jpg', 127 + wood * 2)
# One row of overlapping convex pan-and-cover tiles, repeated through roof UVs.
tx, ty = x / w, y / h
tube = np.cos(tx * 2 * np.pi) * 18
lap = np.where(ty < .05, -24, 0) + np.sin(ty * np.pi) * 5
tile = tube + lap + grain * 1.8 + soft * 5
save('tile.jpg', np.stack([85 + tile, 89 + tile, 88 + tile], -1))
save('tile-bump.jpg', 128 + tube * 4 + lap * 2 + grain * 2)
dust = grain * 4 + soft * 18
save('ground.jpg', np.stack([164 + dust, 143 + dust, 110 + dust], -1))
save('ground-bump.jpg', 110 + grain * 8 + soft * 35)
print('Generated 8 deterministic material maps in', ROOT)
