"""Create a quiet, original synthetic wind / bird / footstep ambience (no speech)."""
from pathlib import Path
import wave
import numpy as np

rate = 48000
rng = np.random.default_rng(618)
t = np.arange(rate * 60) / rate
noise = rng.normal(0, 1, len(t))
cs = np.r_[0, np.cumsum(noise)]
wind = (cs[96:] - cs[:-96]) / 96
sound = np.pad(wind, (0, 95)) * .12 * (1 + .3 * np.sin(t * .4))
for start in [4, 8.7, 15, 20.5, 25.5, 30, 34.6, 38.2, 52.5, 55.3]:
    for gap in [0, .27]:
        u = np.arange(int(rate * .18)) / rate
        chirp = np.sin(2 * np.pi * (2100 * u + 1800 * u * u)) * np.sin(np.pi * u / .18) ** 2 * .013
        k = int((start + gap) * rate)
        sound[k:k+len(u)] += chirp
for start in np.arange(24.1, 39.8, .56):
    u = np.arange(int(rate * .15)) / rate
    foot = (np.sin(2 * np.pi * 95 * u) * .035 + rng.normal(0, .012, len(u))) * np.exp(-u * 38)
    k = int(start * rate)
    sound[k:k+len(u)] += foot
u = np.arange(int(rate * 1.6)) / rate
creak = .008 * np.sin(2 * np.pi * (190 * u + 23 * np.sin(u * 3))) * np.sin(np.pi * u / 1.6) ** 2
sound[46*rate:46*rate+len(u)] += creak
sound *= np.minimum(t / 2, 1) * np.minimum((60 - t) / 2, 1)
dest = Path(__file__).resolve().parents[1] / 'public/changan/ambience.wav'
with wave.open(str(dest), 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
    f.writeframes(np.int16(np.clip(sound, -1, 1) * 32767).tobytes())
print(dest)
