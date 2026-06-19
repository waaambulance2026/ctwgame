# CTW Game Cloudinary Manifest

This build uses Cloudinary for sprite/background images and GitHub/Cloudflare only for code.

The important function is:

```text
functions/api/sprite-manifest.js
```

It now probes public Cloudinary delivery URLs directly instead of relying on Cloudinary Media Library folder paths.

Why: Cloudinary's visible folder tree does not always match the public delivery URL. Your working Ax/Pura/Owl/Unicorn files are root-level public IDs such as:

```text
ax_idle_001.png
pura_idle_001.png
owl_idle_10.png
unicorn_idle_010.png
```

The function generates versionless optimized URLs like:

```text
https://res.cloudinary.com/dpwlfmhia/image/upload/f_auto,q_auto,w_384/ax_walk_001.png
```

This avoids hard-coding upload version numbers like `v1781797065` and reduces sprite size for faster gameplay.

After upload, test:

```text
https://ctwgame.pages.dev/api/sprite-manifest?fresh=1
https://ctwgame.pages.dev/sprite_checker.html
https://ctwgame.pages.dev/image_test.html
```

You do not need to upload character PNGs to GitHub.
