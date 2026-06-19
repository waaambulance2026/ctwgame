# Sprite fix notes

The game now uses local sprite frames from:

```text
assets/characters/<character>/frames/<action>/<character>_<action>_001.png
```

Examples:

```text
assets/characters/pura/frames/walk/pura_walk_001.png
assets/characters/unicorn/frames/jump/unicorn_jump_001.png
assets/characters/ax/frames/jump/ax_jump_001.png
```

Important behaviour:

- Do not use the green preview sheets in the game.
- Use transparent PNG frames or sheets only.
- Each character uses one display size across actions.
- The code does not auto-enlarge walk or jump anymore.
- Old browser settings are ignored because the localStorage keys were changed to `v2-fixed-sprites`.

If the live GitHub Pages version still looks wrong after upload, hard refresh the browser or clear site data for the page.
