#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
npm run lint
browser=/usr/lib/chromium/chromium
test -x "$browser"
# Run and review this test before rendering the full film. Both compositions are 1080p / 30 fps.
npx --no-install remotion render ChanganGateTest out/changan-gate-test-master.mp4 --browser-executable="$browser" --gl=swangle --concurrency=2 --crf=18 --x264-preset=fast
npx --no-install remotion render Changan out/changan-render-master.mp4 --browser-executable="$browser" --gl=swangle --concurrency=2 --crf=18 --x264-preset=fast
# The current Remotion/JPEG pipeline writes full-range YUV. Convert the range
# explicitly for conventional video players; keep the rendered masters intact.
encode_delivery() {
  ffmpeg -y -v error -i "$1" -map 0:v:0 -map 0:a:0 \
    -vf 'scale=in_range=full:out_range=tv,format=yuv420p' \
    -c:v libx264 -preset fast -crf 18 -color_range tv \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
    -c:a copy -movflags +faststart "$2"
}
encode_delivery out/changan-render-master.mp4 out/changan.mp4
encode_delivery out/changan-gate-test-master.mp4 out/changan-gate-test.mp4
python scripts/verify-changan.py
