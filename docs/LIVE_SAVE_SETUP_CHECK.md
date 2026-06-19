# Live Save Setup Check

## Cloudflare settings

In the Cloudflare Pages project, check:

```txt
Bindings → KV namespace
Variable name: CTW_GAME_CONFIG
Namespace: ctw_game_config
```

And:

```txt
Variables and secrets
Name: CTW_GAME_ADMIN_KEY
Type: Secret
Value: your private save key
```

## GitHub files that must exist

```txt
functions/api/game-config.js
functions/api/save-game-config.js
```

## GitHub files that should not exist

```txt
_routes.json
routes.json
functions/api/[[path]].js
game-config.js at repo root
save-game-config.js at repo root
```

## Test URL

After Cloudflare redeploys, open:

```txt
https://your-site.pages.dev/api/game-config
```

Expected result:

```json
{"ok":true,"source":"empty","config":null}
```

or:

```json
{"ok":true,"source":"kv","config":{...}}
```

If it is 404, the functions folder is missing or in the wrong place.

If it is 500 with KV binding missing, the binding name is wrong.

If save gives 403, the admin key does not match.
