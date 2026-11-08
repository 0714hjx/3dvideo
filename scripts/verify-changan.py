"""Verify the actual delivered media, not just the Remotion composition settings."""
from pathlib import Path
import json
import subprocess

root = Path(__file__).resolve().parents[1]
results = []
for filename, frames, duration in [('changan-gate-test.mp4', 240, 8), ('changan.mp4', 1800, 60)]:
    target = root / 'out' / filename
    meta = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(target)]))
    video = next(s for s in meta['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height']) == (1920, 1080), filename
    assert video['r_frame_rate'] == '30/1', filename
    assert int(video['nb_frames']) == frames, filename
    assert abs(float(meta['format']['duration']) - duration) < .05, filename
    assert video['codec_name'] == 'h264' and video['pix_fmt'] == 'yuv420p', filename
    audio = next(s for s in meta['streams'] if s['codec_type'] == 'audio')
    assert audio['codec_name'] == 'aac', filename
    # Decode the entire stream so corrupt middle or end frames cannot hide behind a valid header.
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(target), '-f', 'null', '-'], check=True)
    results.append({'file': filename, 'width': video['width'], 'height': video['height'], 'fps': video['r_frame_rate'], 'frames': int(video['nb_frames']), 'duration': float(meta['format']['duration']), 'audio': 'AAC ambience, no recorded narration', 'full_decode': 'PASS'})
(root / 'out' / 'changan-media-check.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(results, ensure_ascii=False, indent=2))
