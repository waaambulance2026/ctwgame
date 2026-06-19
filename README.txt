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

# Automatic Cloudinary manifest build

This build keeps images in Cloudinary and code in GitHub/Cloudflare.

Cloudflare Pages must have these environment variables/secrets:

- CLOUDINARY_CLOUD_NAME = dpwlfmhia
- CLOUDINARY_API_KEY = your Cloudinary API key
- CLOUDINARY_API_SECRET = your Cloudinary API secret

The function `functions/api/sprite-manifest.js` lists Cloudinary assets by public ID prefix and returns exact frame URLs.

The game loads `/api/sprite-manifest` first, then falls back to `jsons/sprite_manifest.json` only if the API is not configured yet.

Sprite delivery URLs are resized with `f_auto,q_auto,w_384` to reduce flicker and loading delays. Backgrounds use `w_1800`.

After upload, test:

- `/api/sprite-manifest`
- `/sprite_checker.html`
- `/image_test.html`

If `/api/sprite-manifest` says missing Cloudinary secrets, add them in Cloudflare Pages settings, then redeploy.

