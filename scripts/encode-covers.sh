#!/bin/sh
# Encodes the Blender cover frames into web loops and posters.
# Usage: sh scripts/encode-covers.sh <frames_dir>
set -e
FR="$1"
for d in "$FR"/*/; do
  name=$(basename "$d" | tr '_' '-')
  ffmpeg -v error -y -framerate 24 -i "$d/f_%04d.png" -vf "scale=640:-2" -c:v libx264 -pix_fmt yuv420p \
    -crf 24 -preset slow -movflags +faststart -an "public/video/$name.mp4"
  ffmpeg -v error -y -i "$d/f_0001.png" -vf "scale=800:-2" -q:v 3 "public/img/$name.jpg"
  echo "$name $(du -k "public/video/$name.mp4" | cut -f1)KB"
done
find public -name '._*' -delete
