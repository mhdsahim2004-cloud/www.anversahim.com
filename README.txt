ADDING THE REAL AI PRESENTER VIDEO
1. Create a talking-avatar video with a service such as HeyGen, Synthesia or D-ID. Use your own photo/likeness (with their consent tools), paste the script from intro.js (CUES), pick a clear English voice.
2. Export MP4, ~14 s, 720p portrait/4:5 if possible.
3. Optimise (ffmpeg):
   ffmpeg -i in.mp4 -vf scale=-2:720 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart intro-presenter.mp4
   ffmpeg -i in.mp4 -vf scale=-2:720 -c:v libvpx-vp9 -crf 35 -b:v 0 -c:a libopus intro-presenter.webm
4. Put both files in this folder (intro/). No code changes needed.
5. Adjust CUES times in intro.js so subtitles match your video.
Without these files the intro automatically uses your photo in a holographic frame (about 10 s), and the site is never blocked.
