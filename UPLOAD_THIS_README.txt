UPLOAD THIS CLOUDINARY-TREE VERSION ONLY

Upload only the contents of this folder to GitHub/Cloudflare Pages.

This package does NOT contain character PNGs. Character and background images are loaded from Cloudinary using your real folder tree:

ctwgame/characters/ax/idle/ax_idle_001.png
ctwgame/characters/pura/walk/pura_walk_001.png
ctwgame/characters/unicorn/jump/unicorn_jump_001.png
ctwgame/layers/backgrounds/day_sky.png
ctwgame/layers/middle-ground/day_hills.png
ctwgame/layers/ground/day_ground.png

After deployment test:
https://ctwgame.pages.dev/image_test.html

If the test fails for a file, that exact Cloudinary path/public ID does not exist or is not publicly readable.

Also clear old saved config in Cloudflare KV if sprites/backgrounds still act wrong:
Workers & Pages -> KV -> ctw_game_config -> Keys -> delete game_config
