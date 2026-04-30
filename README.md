# Flabbergast Random Spell Generator

Flabbergast is a playful chaos magic spell spinner and searchable spell library for tabletop fantasy games. Pick a spell level, narrow the casting time, and let the dragon die conjure something strange.

## What Is Included

- A polished responsive web app in plain HTML, CSS, and JavaScript.
- A random spell spinner with level and casting-time controls.
- A searchable spell list with sorting, filters, favorites, and quick roll/open actions.
- Local recent-roll and favorite storage in the browser.
- Safe text rendering for spell descriptions.
- Existing Flabbergast and dragon-dice artwork reused from `attached_assets/`.
- Project-local SVG UI assets in `attached_assets/ui/` for parchment texture, wax seal, and spell thumbnails.
- Fresh generated PNG UI assets in `attached_assets/ui/generated/` for the logo, dragon emblem, button plates, parchment sheet, row strip, filter panel, ribbon, wax seal, textures, and spell icons.

## Run Locally

The site is static, but it should be served from a local server so `spells.json` loads correctly.

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

If you do not want to use npm, Python also works:

```bash
python3 -m http.server 3000
```

## Project Files

- `index.html` - app layout and content structure.
- `styles.css` - full visual system, responsive layout, and interaction styling.
- `script.js` - spell loading, spinner behavior, filtering, sorting, favorites, and recent rolls.
- `spells.json` - spell data used by the app.
- `attached_assets/` - logo and dragon-dice artwork.
- `.replit` - Replit launch/deployment configuration.

## Publishing With GitHub Desktop

1. Open this folder in GitHub Desktop.
2. Review the changed files.
3. Write a commit message, for example `Redesign Flabbergast spell generator`.
4. Commit to your branch.
5. Push to GitHub.

## Notes

Favorites and recent rolls are stored only in the visitor's browser. No accounts, tracking, or backend server are required.
