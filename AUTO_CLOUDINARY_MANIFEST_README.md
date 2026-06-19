# CTW Game Cloudinary Manifest Fix

This build uses `functions/api/sprite-manifest.js` to generate the sprite list from Cloudinary.

It now prefers the Cloudinary Admin API and searches by public ID prefix, such as:

- `pura_idle_`
- `pura_walk_`
- `unicorn_idle_`
- `owl_walk`

This is more reliable than guessing versionless URLs, because your files have different Cloudinary version numbers.

Required Cloudflare Pages variables/secrets:

- `CLOUDINARY_CLOUD_NAME` = `dpwlfmhia`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

After uploading, redeploy Cloudflare and test:

`https://ctwgame.pages.dev/api/sprite-manifest?fresh=1`

You should see `usedAdminApi: true` and frame counts above 0.
