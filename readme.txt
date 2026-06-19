UPLOAD ONLY THESE FILES/FOLDERS TO GITHUB/CLOUDFLARE:

index.html
sprite_checker.html
image_test.html
UPLOAD_THIS_README.txt
assets/
jsons/
functions/

Do NOT upload character PNGs to GitHub. Character images are loaded from Cloudinary using this tree:
ctwgame/characters/<character>/<action>/<filename>.png

Frame counts are now discovered automatically by checking the folder sequence:
- ax/pura/unicorn use 001, 002, 003...
- owl idle/jump/play/rest use _1, _2, _3...
- owl walk uses owl_walk01, owl_walk02...

The game stops after two missing frame numbers, so actions can have 2, 8, 10, 20, etc. frames.

After deployment, open:
https://ctwgame.pages.dev/image_test.html

This page shows how many frames are found for each character/action.
