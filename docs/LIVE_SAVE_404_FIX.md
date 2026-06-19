# Live save 404 fix

If Developer Mode says `HTTP 404` when saving, Cloudflare is not seeing the Pages Functions.

Check these things:

1. The repo must contain these files:

```txt
functions/api/game-config.js
functions/api/save-game-config.js
```

2. In Cloudflare Pages, the project must have a KV binding called exactly:

```txt
CTW_GAME_CONFIG
```

3. In Cloudflare Pages, the project must have a secret/environment variable called exactly:

```txt
CTW_GAME_ADMIN_KEY
```

4. Redeploy the Pages project after adding files/bindings.

5. Test this URL after deployment:

```txt
https://your-site.pages.dev/api/game-config
```

Expected result: JSON.

If it still returns 404, Cloudflare is not deploying the `functions` folder from the repo root.
