# Pura sprite update

- Cleaned green spill/outline from Pura transparent PNG frames by unmatting soft edge pixels against pure green.
- Rebuilt Pura idle/walk/jump sheets from the cleaned transparent frames.
- Added magenta chroma fallback assets at `assets/characters/pura/chroma_magenta/`.
- Recommended chroma key colour for Pura: pure magenta `#FF00FF`, because it is far from Pura’s black clothes and orange/brown fur.
- The actual game should use the transparent PNG frames under `assets/characters/pura/frames/`, not the chroma fallback.

For GitHub: upload the full repo and hard-refresh the browser with Ctrl+F5.
