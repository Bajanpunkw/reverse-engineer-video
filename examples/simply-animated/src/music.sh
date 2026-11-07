#!/usr/bin/env bash
# Soundtrack: one real royalty-free track, fitted to the scene cuts (the original channel is an "edit" cut to one phonk track).
# Track: "Brazilian Phonk - Phonk" by MondaMusic, Pixabay — https://pixabay.com/music/phonk-brazilian-phonk-phonk-542543/
# Pixabay's license doesn't allow redistributing the file itself, so download it into src/music/ yourself.
#
# Measured with scripts/beatgrid.py: 98 BPM, the drop (a downbeat) at 4.891 s, a 2-beat break 32 beats after the drop.
# The scenes are cut on bars of 94 BPM (CUTS in video.html) → stretch 98 → 94 (rubberband keeps the pitch) and start
# exactly on the drop: every bar of the track lands on a scene cut, the break lands on the cut between scenes 3 and 4.
#
# bash src/music.sh <out.wav>   then: scripts/loudness.py <out.wav> sound-full.wav && scripts/mux.sh video-full.mp4 sound-full.wav final.mp4
# Another track: run beatgrid.py on it and change SRC_BPM and DROP.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../.." && pwd)
FF=${FFMPEG:-$ROOT/node_modules/ffmpeg-static/ffmpeg}; [[ -x $FF ]] || FF=$(command -v ffmpeg)
SRC=${TRACK:-$HERE/music/mondamusic-brazilian-phonk-phonk-542543.mp3}
[[ -f $SRC ]] || { echo "download the track from the Pixabay link above into $HERE/music/ (or set TRACK=...)"; exit 1; }
SRC_BPM=98; DROP=4.891; SCENE_BPM=94; BARS=13.5
read R START TOTAL FADE < <(python3 -c "
r=$SCENE_BPM/$SRC_BPM; tot=$BARS*4*60/$SCENE_BPM
print(r, $DROP/r, tot, tot-0.6)")
"$FF" -y -loglevel error -i "$SRC" -af "rubberband=tempo=$R,atrim=start=$START:duration=$TOTAL,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=$FADE:d=0.6" -ar 44100 -ac 2 "$1"
echo "ok $1 (${TOTAL}s from the drop)"
