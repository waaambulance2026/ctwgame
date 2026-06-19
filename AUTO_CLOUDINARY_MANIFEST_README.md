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
