# CTW Game - Prefix List Cloudinary Manifest

This build fixes the previous sprite-manifest issue where the Cloudinary Search API returned 0 resources.

It uses a small set of Cloudinary Admin API prefix calls instead:

- ax_
- pura_
- unicorn_
- Uni_
- owl_
- day_
- night_
- ctwgame/characters/
- ctwgame/layers/

This should find root public IDs such as `pura_idle_003` and build exact versioned URLs automatically.

Test after deploy:

`https://ctwgame.pages.dev/api/sprite-manifest?fresh=1`

Look for:

- `mode: "prefix-list"`
- `debug.prefixCounts`
- non-zero `counts`
