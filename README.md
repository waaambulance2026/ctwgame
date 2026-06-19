# Waaambulance Game - GitHub Files

This repository contains the Cloudflare Pages/GitHub version of the Waaambulance game.

## Folder structure

```txt
assets/      fallback images and small visual assets
docs/        README notes and setup guides
htmls/       backup/helper HTML pages
jsons/       game_config.json and sprite_manifest.json
functions/   Cloudflare Pages Functions for live save
index.html   the real live game entry file
```

## Important

Do not delete the root `index.html`. Cloudflare Pages opens that file first.

Character sprites stay on Cloudinary and are loaded by filename pattern, for example:

```txt
ax_idle1.png
ax_walk1.png
pura_jump1.png
owl_walk01.png to owl_walk10.png
unicorn_jump10.png
```

## Live save

The Developer Mode save button uses Cloudflare KV.

Required Cloudflare bindings:

```txt
KV binding name: CTW_GAME_CONFIG
Secret name: CTW_GAME_ADMIN_KEY
```

API test URL after deployment:

```txt
/api/game-config
```

If that URL returns JSON, the live save API is connected.

## What to keep in GitHub

Upload these folders/files:

```txt
assets/
docs/
htmls/
jsons/
functions/
README.md
index.html
sprite_checker.html
```

Do not upload the big sprite folders to GitHub. They stay on Cloudinary.

## Fixed local sprite build

This package includes local transparent sprite frames in `assets/characters/` for Ax, Pura, Owl, and Unicorn.

What changed:

- The game now loads character frames from the repo instead of relying only on Cloudinary.
- Each character action uses fixed-size transparent frame canvases, so idle/walk/jump do not resize when switching animation.
- Automatic action scaling was disabled because it made normalized sprite frames look wrong.
- The jump ceiling was made safer so tall sprites, especially the unicorn jump/horn, stay inside the visible game area.
- Browser storage keys were bumped to avoid old saved sprite settings overriding the fixed build.

Use `index.html` as the main GitHub Pages entry point.

## Pura walk/chroma update

This package includes a Pura sprite cleanup pass:
- Green edge spill was removed from Pura transparent frames.
- Pura idle/walk/jump sheets were rebuilt from cleaned frames.
- Pura walk now uses action-specific FPS and a tiny walk bob in the HTML game for smoother motion.
- Magenta chroma fallback assets are included at `assets/characters/pura/chroma_magenta/` for tools that need a solid removable background.

For the game itself, use the transparent frames in `assets/characters/pura/frames/`, not the chroma fallback.
