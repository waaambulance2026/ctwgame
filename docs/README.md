# Waaambulance Game - GitHub Files

This repository contains the Cloudflare Pages/GitHub version of the Waaambulance game.

The game is being built as part of the wider CTW pet bot world. The aim is to support platform gameplay, quests, pet care actions, mini-games such as Hook-a-Waaambulance, unlockable items, characters, rewards, and future Discord/pet bot integration.

## Folder structure

```txt
assets/
  Fallback images and small visual assets.

docs/
  README and setup notes.

htmls/
  Backup/helper HTML pages.

jsons/
  Game config and asset manifest JSON files.

index.html
  Main Cloudflare/GitHub entry file. This must stay at the repo root so the site opens correctly.
```

## Main files

- `index.html` - the live game entry file. Cloudflare Pages opens this first.
- `htmls/index.html` - backup copy of the game file.
- `htmls/sprite_checker.html` - optional page for checking whether sprite assets load.
- `jsons/game_config.json` - saved game settings, character sizes, layer settings, quests, items, and level setup.
- `jsons/sprite_manifest.json` - backgrounds, layers, and special one-off assets.
- `assets/` - fallback visual assets.

## Important note about index.html

Even though the files are organised into folders, one `index.html` must stay at the root of the repo.

Cloudflare Pages needs this file so the site opens at:

```txt
https://your-site.pages.dev/
```

Do not delete the root `index.html`.

## Character sprites

Character sprite frames are not added one by one into `sprite_manifest.json`.

Sprites are uploaded to Cloudinary using simple filenames, and the game builds the links automatically.

Examples:

```txt
ax_idle1.png
ax_idle2.png
ax_walk1.png
ax_jump1.png
pura_idle1.png
pura_walk1.png
owl_walk01.png
unicorn_jump10.png
```

This avoids copying hundreds or thousands of image links into the script.

## Cloudinary upload rules

Character sprites stay on Cloudinary, not GitHub.

Use clean, predictable filenames.

Good examples:

```txt
ax_idle1.png
ax_idle2.png
ax_idle3.png
ax_walk1.png
ax_walk2.png
ax_jump1.png
pura_idle1.png
owl_walk01.png
unicorn_jump1.png
```

Avoid random long filenames or names with spaces.

## What belongs in sprite_manifest.json

Use `jsons/sprite_manifest.json` for:

- backgrounds
- scene layers
- special assets
- one-off objects
- assets that do not follow a simple filename pattern

Do not use it for every character animation frame.

## Developer Mode

Open the game and click **Developer**.

Developer Mode is used to adjust:

- sprite size
- individual frame size
- whole action size
- whole character size
- feet/baseline position
- animation speed
- layer height
- layer zoom
- layer position
- grid view
- preview zoom

Settings should be saved into `jsons/game_config.json` instead of hard-coded into `index.html`.

## Sprite editing scopes

Sprites can be edited at three levels:

```txt
This frame only
All frames in this action
All actions for this character
```

Use:

- **This frame only** when one frame is the wrong size.
- **All frames in this action** when one action, such as idle or walk, is too big or too small.
- **All actions for this character** when the whole character needs resizing.

## Upload to GitHub

Upload this folder structure to GitHub.

Do not upload large character sprite folders to GitHub. They stay on Cloudinary.

## After Cloudflare deploys

Open the live game:

```txt
https://your-site.pages.dev/
```

Optional sprite checker:

```txt
https://your-site.pages.dev/htmls/sprite_checker.html
```

## Current structure

```txt
index.html = live game entry file
htmls/ = backup/helper HTML files
jsons/game_config.json = editable game settings
jsons/sprite_manifest.json = backgrounds/layers/special assets
assets/ = fallback assets
Cloudinary = uploaded sprites and image assets
```

## Developer editor update

Developer Mode now uses simple tabs so the settings are easier to manage:

```txt
Sprite = character/action size and movement settings
Frame fix = one-frame, action, or character sizing fixes
Layers = background and scene layer settings
Save / Add = config, adding characters, quests, and setup notes
```

Slider values also show live number boxes. You can drag the slider or type an exact number.
