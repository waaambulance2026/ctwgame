# V40_SAFE_RESTORE_PETBOT_BASE

This version is built from the original uploaded PetBot read-only bridge zip, not from the stripped-down V38/V39 rebuilds.

What was preserved:
- functions/api/admin.js
- functions/api/petbot.js
- functions/api/sheet51.js
- functions/api/sheets.js

A hash check is included in docs/PETBOT_FILES_PRESERVED_CHECK.txt.

What was changed safely:
- index.html title and labels updated to V40.
- Admin Builder cleaned so it uses one tab row: Layers, Objects, Character, Sprites, Save/Load.
- Duplicate builder controls were removed from the visible UI.
- Sprite actions are locked to 10 frames so old 20-frame settings do not return.
- Saved player settings now load back from local backup.
- Cloudflare KV level save/load added through functions/api/levels.js.
- Pet Care remains connected to /api/petbot and /api/sheet51.

Cloudflare Pages settings needed:
- Environment variable: CTW_GAME_ADMIN_KEY
- KV namespace binding: CTW_GAME_LEVELS
- Existing PetBot settings: PETBOT_APPS_SCRIPT_URL and PETBOT_API_KEY

Upload the CONTENTS of this zip to Cloudflare Pages with index.html at the root.
