CLOUDINARY-ONLY UPLOAD PACKAGE

Upload ONLY these files/folders to the GitHub repo root:

index.html
sprite_checker.html
image_test.html
UPLOAD_THIS_README.txt
assets/                 (background SVGs only, no character PNGs)
jsons/                  (game_config.json and sprite_manifest.json)
functions/              (Cloudflare Pages Functions)

Do NOT upload assets/characters. Character sprites are loaded from Cloudinary.

After Cloudflare deploys, test:
https://ctwgame.pages.dev/image_test.html

If Ax walk fails there, the Cloudinary file name/version is wrong, not GitHub.
