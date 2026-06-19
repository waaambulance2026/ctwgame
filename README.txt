UPLOAD THIS FOLDER CONTENTS TO GITHUB

This is the corrected Cloudflare/GitHub package.

Your GitHub repo root must contain exactly these important items:

index.html
index.js
sprite_checker.html
image_test.html
assets/
jsons/
functions/

The Cloudflare Pages Functions folder is correctly spelled:
functions/api/

Required function files:
functions/api/sprite-manifest.js
functions/api/game-config.js
functions/api/save-game-config.js

Do NOT rename functions to funtions.
Do NOT upload character PNGs to GitHub.
Character/background images are loaded from Cloudinary by /api/sprite-manifest.

Cloudflare Pages variables/secrets required:
CLOUDINARY_CLOUD_NAME = dpwlfmhia
CLOUDINARY_API_KEY = your API key
CLOUDINARY_API_SECRET = your API secret
CTW_GAME_ADMIN_KEY = your developer save password/key, if using live save

Cloudflare KV binding required for live save:
CTW_GAME_CONFIG -> ctw_game_config

After upload, redeploy Cloudflare Pages and test:
https://ctwgame.pages.dev/api/sprite-manifest

That URL must show JSON. If it opens the game page, the functions folder is still missing or misspelled.
