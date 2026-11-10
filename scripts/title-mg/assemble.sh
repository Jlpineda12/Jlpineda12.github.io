#!/bin/zsh
# Turn the rendered passes into the hero videos: stop-motion frames are held for two frames, the
# name and subtitle layers are laid over white (the page multiplies the white away), H.264 for every
# browser, plus a poster frame.
set -e
cd "$(dirname "$0")/out"
OUTDIR="$(cd "$(dirname "$0")/../../public/video" && pwd)"
for d in name sub_es sub_en; do
  for f in $(seq 137 2 195); do
    src=$(printf "%s/%04d.png" $d $f); dst=$(printf "%s/%04d.png" $d $((f + 1)))
    [ -f "$src" ] && cp "$src" "$dst"
  done
done
for lang in es en; do
  ffmpeg -y -loglevel error -f lavfi -i "color=white:s=1281x640:r=24" \
    -framerate 24 -start_number 1 -i name/%04d.png \
    -framerate 24 -start_number 1 -i sub_$lang/%04d.png \
    -filter_complex "[0][1]overlay=shortest=1[a];[a][2]overlay=shortest=1,scale=1280:640,format=yuv420p" \
    -c:v libx264 -crf 26 -preset veryslow -tune animation -movflags +faststart -an "$OUTDIR/title-$lang.mp4"
  ffmpeg -y -loglevel error -f lavfi -i "color=white:s=1281x640" -i name/0060.png -i sub_$lang/0060.png \
    -filter_complex "[0][1]overlay[a];[a][2]overlay,scale=1280:640" -frames:v 1 -q:v 3 "$OUTDIR/title-$lang.jpg"
done
ls -la "$OUTDIR"/title-*
