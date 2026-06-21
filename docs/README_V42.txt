V42_ACTUAL_GAME_LOOK_RESTORED_PETBOT_SAFE

This version uses the older full-screen Waaambulance Quest visual layout again, not the wrong canvas platform test layout.

Kept from the original PetBot bridge upload:
- functions/api/admin.js
- functions/api/petbot.js
- functions/api/sheet51.js
- functions/api/sheets.js

Added:
- functions/api/levels.js for Cloudflare KV layout save/load.

Cloudflare needs:
- KV namespace binding: CTW_GAME_LEVELS
- Environment variable: CTW_GAME_ADMIN_KEY

The shared visual layout is saved under:
- level_v42_main

Players open the game and see the full-screen game.
Admins open Admin Builder and can edit the visual layout without changing the PetBot bridge files.
