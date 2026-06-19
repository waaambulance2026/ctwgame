# Live Save Setup

In Cloudflare Pages settings, add:

- KV namespace binding: `CTW_GAME_CONFIG`
- Secret/environment variable: `CTW_GAME_ADMIN_KEY`

After deploy, test:

```txt
https://your-site.pages.dev/api/game-config
```

It should return JSON.
