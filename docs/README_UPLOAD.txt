CTW Waaambulance Game - V37 fixed upload

Upload the ROOT CONTENTS of this folder to Cloudflare Pages.
Keep index.html at the root. Do not move it into htmls/ for deployment.

What was fixed:
- Added /functions/api/levels.js for Cloudflare KV save/load.
- Save / Load screen now has Cloudflare KV buttons.
- Player size/settings saved locally now load back on startup.
- Animation frame count is locked to 10 so old 20-frame settings stop coming back.
- Layer editor click/drag coordinates are now screen-space so layer boxes do not drift after camera movement.
- The pasted AI-generated mini script was not used because it contains syntax/runtime mistakes.

Cloudflare setup needed for Cloud Save:
1. Pages project > Settings > Functions > KV namespace bindings.
2. Add binding name: CTW_GAME_LEVELS
3. Bind it to your CTW game levels KV namespace.
4. Pages project > Settings > Environment variables.
5. Keep/add CTW_GAME_ADMIN_KEY.

Files that must stay at root for Cloudflare Pages:
- index.html
- functions/api/admin.js
- functions/api/levels.js
- functions/api/petbot.js
- functions/api/sheet51.js
- functions/api/sheets.js
