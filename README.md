# CTW Game Upload Package

This is the Cloudinary-public-URL version of the game.

## What to upload to GitHub

Upload the contents of this folder to the root of your GitHub repo:

```text
index.html
sprite_checker.html
image_test.html
README.md
assets/
jsons/
functions/
htmls/
```

Do not upload character PNGs to GitHub. Character and background images live in Cloudinary.

## How sprites load

The game does not use the Cloudinary Admin API in this version.

Instead, when the game starts it probes public Cloudinary delivery URLs, finds the frames that actually load, preloads them, and caches the working URLs in the browser.

Examples of expected public filenames:

```text
ax_idle_001.png
ax_idle_002.png
ax_walk_001.png
ax_jump_001.png

pura_idle_001.png
pura_walk_001.png
pura_jump_001.png

unicorn_idle_001.png
unicorn_walk_001.png
unicorn_jump_001.png

owl_idle_1.png
owl_walk01.png
owl_jump_1.png
owl_play_1.png
owl_rest_1.png
```

## How to add future sprite frames

Upload new images to Cloudinary using the same naming pattern.

For most characters:

```text
character_action_001.png
character_action_002.png
character_action_003.png
```

Examples:

```text
pura_walk_001.png
pura_walk_002.png
pura_walk_003.png

unicorn_jump_001.png
unicorn_jump_002.png
unicorn_jump_003.png
```

For Owl walk, use the existing owl naming style:

```text
owl_walk01.png
owl_walk02.png
owl_walk03.png
```

For Owl idle/jump/play/rest, use:

```text
owl_idle_1.png
owl_idle_2.png
owl_jump_1.png
owl_play_1.png
owl_rest_1.png
```

## Important naming rule

Frame numbers must be continuous with no gaps.

Good:

```text
001, 002, 003, 004, 005
```

Bad:

```text
001, 002, 010
```

If there is a gap, the game may think the animation ended early.

## How many frames can an animation have?

The current probe limit is 60 frames per action. That is enough for normal sprite animations. If you ever need more, edit this line in `index.html`:

```js
const MAX_FRAME_PROBE = 60;
```

## Why this avoids flickering

The game now probes and preloads sprites before gameplay starts. During gameplay it only uses frame URLs that already loaded successfully.

The first load may still take a moment while it checks Cloudinary, but after that the browser caches the working URLs.

## Tests after upload

After Cloudflare deploys, open:

```text
https://ctwgame.pages.dev/api/sprite-manifest
https://ctwgame.pages.dev/sprite_checker.html
https://ctwgame.pages.dev/image_test.html
https://ctwgame.pages.dev/
```

If sprites look wrong after changing Cloudinary files, clear the browser sprite cache in Developer Mode or clear site data, then reload with Ctrl+F5.

## Cloudflare settings

This version does not require Cloudinary API keys because it does not use the Admin API.

Keep your existing Cloudflare KV binding if you use live save:

```text
CTW_GAME_CONFIG
```
