# SQSP Rotating Logo Wave Wall

Turn a Squarespace **Simple List** section of logos into an animated logo wall. It
shows a few logos at a time, and every few seconds swaps in the next set. The
swap moves across the row like a wave.

- **5 logos on desktop, 3 on mobile**
- Every **3.5 seconds**, each position swaps to the next logo in its column
- **Each position cycles through its own column.** With 10 logos on desktop,
  position 1 rotates between logos 1 and 6, position 2 between 2 and 7, and so on.
- The outgoing logo **slides up and fades out**, and the next one **slides in from
  below and fades in** (animated with [GSAP](https://gsap.com))
- Each position's transition is **staggered**, so the change ripples across the row
- Loops forever and pauses while the visitor hovers over the wall
- Logos are still managed in Squarespace: add, remove or reorder list items and
  the wall updates

Setup is one versioned script tag in Code Injection. Every setting lives in the
**CSS pane**, so you never edit the script.

## Install

> Code Injection requires a Squarespace **Core/Business plan or higher**.

### 1. Build the list

1. Add a **List Section** (Auto Layout) and choose the **Simple** layout.
2. Add one item per logo, upload the logo as the item's image, and put them in order.
3. Copy the section ID. On the live page, right-click the list → **Inspect**, then find
   `data-section-id="…"` on the list's `<section>` or `<ul>`.

### 2. Add the script (Code Injection)

**Settings → Advanced → Code Injection → Footer** (or a single page's
**Advanced → Page Header Code Injection**):

```html
<script src="https://cdn.jsdelivr.net/gh/zsawtelle-lgtm/SQSP-Rotating-Logo-Wave-Wall@1.0.0/dist/waves.min.js"></script>
```

The script loads GSAP and its own base styles. Nothing else goes here.

### 3. Turn it on and style it (CSS pane)

In **Design → Custom CSS**, paste the block from [`css-pane.css`](css-pane.css) and
put your section ID in the selector. At minimum you only need:

```css
[data-section-id="6abc8879e923b123d6550a4f"] {
  --lw-wave: on;
}
```

Only sections with `--lw-wave: on` are converted. Every other Simple List on the
site is left alone, so the script is safe to add site-wide. To convert more than
one section, add another selector with its own ID. Each section can have its own
settings.

## CSS pane toggles

All are optional. Delete a line to use its default.

### Motion

| Toggle | Default | What it does |
| --- | --- | --- |
| `--lw-wave` | *(off)* | `on` converts this section into a wave wall |
| `--lw-count` | `5` | Logos visible on desktop |
| `--lw-count-mobile` | `3` | Logos visible on mobile |
| `--lw-mobile-breakpoint` | `767` | Width (px) at or below which the mobile count applies |
| `--lw-interval` | `3.5s` | Time between sets |
| `--lw-stagger` | `0.2s` | Delay between one position's transition and the next (the wave) |
| `--lw-duration` | `0.55s` | Length of each slide and fade |
| `--lw-travel` | `35px` | Distance logos slide up/in |
| `--lw-ease` | `power2.out` | Any [GSAP ease](https://gsap.com/docs/v3/Eases/) |
| `--lw-pause-on-hover` | `on` | `on` / `off` |

Write times with units (`3.5s` or `3500ms`). Motion toggles are read when the
page loads, so refresh after changing them.

### Look

| Toggle | Default | What it does |
| --- | --- | --- |
| `--lw-gap` | `11px` | Space between logos |
| `--lw-max-width` | `100%` | Width of the whole wall |
| `--lw-ratio` | `1.3` | Slot shape (width ÷ height) |
| `--lw-fit` | `cover` | `cover` fills the slot; `contain` shows the whole logo (best for wide wordmarks) |
| `--lw-radius` | `6px` | Slot corner radius |
| `--lw-pad` | `10px` | Padding around each logo |
| `--lw-bg` | `transparent` | Slot background colour |

Look toggles are ordinary CSS, so they also work inside media queries in the CSS pane.

## How it behaves

- **Logo count isn't a multiple of the visible count?** Each position still only
  cycles through its own column. For example, 12 logos on desktop give columns
  `1·6·11`, `2·7·12`, `3·8`, `4·9` and `5·10`. A column with a single logo stays still.
- **Resizing across the breakpoint** rebuilds the wall with the right number of positions.
- The original list is hidden (`display: none`), not removed.
- `LogoWave.version` in the browser console shows which version is running, and
  `LogoWave.destroy()` / `LogoWave.init()` tear down and rebuild the walls.

## Versioning and releases

The Code Injection URL pins a version (`@1.0.0`), and jsDelivr caches each version
permanently. A live site only changes when you edit the version number in the
script tag.

To release a new version:

1. Edit `src/`, then bump `version` in `package.json` (e.g. `1.0.1`).
2. `npm install` (first time only), then `npm run build`.
3. Commit, merge to `main`, and create a GitHub release/tag named `v1.0.1`.
4. Update the site's script tag to `@1.0.1`.

## Development

```
src/waves.js         the script (reads CSS pane toggles, builds the wall, runs the loop)
src/waves.css        base styles, embedded into the script at build time
scripts/build.mjs    builds dist/waves.js and dist/waves.min.js
css-pane.css         copy-paste block for Design > Custom CSS
demo/index.html      local demo with mock Squarespace Simple List markup
```

Open `demo/index.html` in a browser to try it (it needs internet access for GSAP).
