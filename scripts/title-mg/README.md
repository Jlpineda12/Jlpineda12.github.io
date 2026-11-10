# Title motion graphic

The hero's "JOSÉ LUIS PINEDA / INGENIERO EN MULTIMEDIA" loop, made in Blender: 3D glossy letters drop
in, flip to flat 2D cartoon letters with thick outlines, melt into puddles, rise again as clay in stop
motion (on twos, with hand jitter) and jump out of frame, which loops back to the start.

Render (Blender 5.2, Cycles; about 6 s a frame on an M4):

    B=/Applications/Blender.app/Contents/MacOS/Blender
    $B -b -P title.py -- out/name   name   all 89 24
    $B -b -P title.py -- out/sub_es sub_es all 89 24
    $B -b -P title.py -- out/sub_en sub_en all 89 24
    zsh assemble.sh   # writes public/video/title-{es,en}.mp4 and .jpg

Args: output folder, pass (name | sub_es | sub_en), frames (all | test | 40,112), size % of 1440×720,
samples. The frames are transparent with a shadow catcher; assemble.sh lays them over white and the page
multiplies the white away (mix-blend-mode), so only the letters and their shadows show.

Fonts: TikTok Sans (OFL) instanced at wght 900 / wdth 150 and wght 700 / wdth 125 with overlaps removed
(`fonttools varLib.instancer ... --remove-overlaps`), so bevels have no spikes.
