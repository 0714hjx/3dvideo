#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out deliverables/changan-v2-preview
npm run lint
npx --no-install remotion render ChanganMaterialStudy out/changan-v2-10s-master.mp4 \
  --browser-executable=/usr/lib/chromium/chromium --gl=swangle \
  --concurrency=2 --crf=18 --x264-preset=fast
ffmpeg -y -v error -i out/changan-v2-10s-master.mp4 \
  -vf 'scale=in_range=full:out_range=tv,format=yuv420p,eq=gamma=1.16:brightness=0.008:saturation=0.98' \
  -c:v libx264 -crf 18 -preset fast -color_range tv -colorspace bt709 \
  -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart \
  deliverables/changan-v2-preview/changan-v2-10s.mp4
