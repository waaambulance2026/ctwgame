# Cloudflare Live Save Setup

This adds the easy save system for Developer Mode.

After this is set up, you can edit sprite sizes, frame settings, layers, levels, quests, and other config in Developer Mode, then press:

```txt
Save to live game
```

No GitHub upload is needed for normal config changes.

## What was added

The repo now includes Cloudflare Pages Functions:

```txt
functions/api/game-config.js
functions/api/save-game-config.js
```

These let the game:

```txt
Load live config from Cloudflare KV
Save live config to Cloudflare KV using an admin save key
```

## One-time Cloudflare setup

### 1. Create a KV namespace

In Cloudflare, create a KV namespace called something like:

```txt
CTW_GAME_CONFIG
```

### 2. Bind the KV namespace to the Pages project

In your Cloudflare Pages project settings, add a KV binding:

```txt
Variable name: CTW_GAME_CONFIG
KV namespace: your CTW game config namespace
```

The variable name must be exactly:

```txt
CTW_GAME_CONFIG
```

### 3. Add an admin save key

In Cloudflare Pages project settings, add an environment variable:

```txt
CTW_GAME_ADMIN_KEY
```

Set it to a private password/key that only the developer has.

Example:

```txt
my-secret-game-save-key
```

Do not put this key in GitHub.

### 4. Redeploy

Redeploy the Pages site after adding the KV binding and admin key.

## How to use it

1. Open the live game.
2. Open Developer Mode.
3. Paste the admin save key into **Admin save key**.
4. Edit sprite sizes, frames, layers, or other settings.
5. Press **Save to live game**.
6. Refresh the game.

The game should now load the saved live config automatically.

## Buttons in Developer Mode

```txt
Save to live game = saves current config to Cloudflare KV
Load live config = pulls the current live config back into the editor
Save browser + live = saves locally and to live at the same time
Forget admin key = removes the saved admin key from this browser
```

## Safety

The live save key is checked by Cloudflare, not by the browser.

This is safer than trying to save directly to GitHub, because a GitHub token would be dangerous to expose in the web page.

## Backups

Every live save also writes a timestamped backup entry in KV:

```txt
backup:timestamp
```

The latest config is always stored as:

```txt
live
```
