CTW Game V39 - PetBot Restored

Upload the CONTENTS of this folder to Cloudflare Pages. Keep index.html at the root.

This version restores the Pet Care / PetBot screen and keeps it separate from Play and Admin Builder.

Cloudflare bindings needed:
- CTW_GAME_LEVELS = KV namespace for saved level_1
- CTW_GAME_ADMIN_KEY = secret used to unlock admin saving/builder

Included API routes:
- /api/levels for cloud save/load
- /api/petbot for read-only owned pets
- /api/sheet51 for pet images

Normal Discord users should use Play. Admins use Admin Builder. Pet Care is available from the top menu and menu cards.
