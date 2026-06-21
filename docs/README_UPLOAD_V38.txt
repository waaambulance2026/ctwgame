CTW Waaambulance Quest Dash - V38 CLEAN EDITOR RESET

This version resets the messy editor layout.

What this version is for:
- Discord users press Play and only see the playable game.
- Admins press Admin Builder, enter CTW_GAME_ADMIN_KEY, and edit the level.
- Admin editing is separate from player mode.
- Builder tabs are simple: Layers, Objects, Character, Sprites, Save / Load.
- Sprites are locked to 10-frame batches so old 20-frame settings do not come back.
- Saves use a new V38 localStorage key, so old broken local browser settings should not poison this build.

Upload instructions:
1. Upload the ROOT CONTENTS of this folder to Cloudflare Pages.
2. Keep index.html at the root.
3. Keep functions/api at the root path exactly as included.
4. In Cloudflare Pages, set environment variable CTW_GAME_ADMIN_KEY.
5. In Cloudflare Pages > Functions > KV namespace bindings, bind CTW_GAME_LEVELS.
6. Open the site, press Admin Builder, edit, then Save / Load > Save Cloud.
7. Discord users press Play. The game tries to load cloud level_1 automatically.

Important files:
- index.html = live game + clean builder
- functions/api/admin.js = admin key check
- functions/api/levels.js = cloud save/load for levels
- functions/api/petbot.js, sheet51.js, sheets.js = kept for your read-only petbot bridge
- jsons/example-level-pack-v38.json = example export format

What to test first:
1. Press Play: Ax should stand on the ground and move/jump.
2. Press Admin Builder: enter your admin key.
3. Go to Objects: click Platform / Coin / Hazard and drag it.
4. Go to Character: change Width/Height and drag the character.
5. Go to Sprites: paste a 10-frame URL pattern using {n}.
6. Go to Save / Load: Save Local, then Save Cloud.
