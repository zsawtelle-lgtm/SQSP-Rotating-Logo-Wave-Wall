# SQSP Rotating Logo Wave Wall

Turn a simple Squarespace logo list into an animated logo wall. It shows a few
logos at a time, and every few seconds swaps in the next set. The swap moves
across the row like a wave.

- **5 logos on desktop, 3 on mobile**
- Every **3.5 seconds**, each position swaps to the next logo in its column
- **Each position cycles through its own column.** With 10 logos on desktop,
  position 1 rotates between logos 1 and 6, position 2 between 2 and 7, and so on.
- The outgoing logo **slides up and fades out**, and the next one **slides in from
  below and fades in** (animated with [GSAP](https://gsap.com))
- Each position's transition is **staggered**, so the change ripples across the row
- Loops forever and pauses while the visitor hovers over the wall
- You still manage the logos inside Squarespace. The plugin reads the images from
  the section, so adding, removing or reordering them updates the wall.

## Install

> Code Injection requires a Squarespace **Core/Business plan or higher**.

1. **Add a List Section** (Auto Layout) and choose the **Carousel** layout.
2. **Add one item per logo** and upload the logo as the item's image, in the order
   you want them to appear.
3. **Add the code.** Copy everything in [`dist/code-injection.html`](dist/code-injection.html) and paste it into one of:
   - **Only this page (recommended):** Page settings → **Advanced** → **Page Header Code Injection**
   - **Whole site:** **Settings → Advanced → Code Injection → Footer**
4. Save and view the live page.

The script converts every element that matches `targets`
(`.user-items-list-carousel__slides` by default). That means every List Section
carousel on the page. That's why per-page injection is the safer choice.

### Using a different section type

Change `targets` to the CSS selector of the element that holds the logo images.
For example, an Auto Gallery Section in Grid layout:

```js
targets: ".gallery-grid-wrapper",
```

To target a single section only, prefix it with the section ID (find
`data-section-id` on the section's `<section>` tag via right-click → **Inspect**):

```js
targets: '[data-section-id="64f1c2ab9e0d1a2b3c4d5e6f"] .user-items-list-carousel__slides',
```

## Motion controls

Edit the `CONTROLS` object at the top of the script:

| Option | Default | What it does |
| --- | --- | --- |
| `targets` | `".user-items-list-carousel__slides"` | Element(s) whose images become the wall |
| `desktopCount` | `5` | Logos visible at once on desktop |
| `mobileCount` | `3` | Logos visible at once on mobile |
| `mobileBreakpoint` | `767` | Width (px) at or below which `mobileCount` applies |
| `interval` | `3500` | Time (ms) between sets |
| `stagger` | `0.2` | Delay (seconds) between one position's transition and the next (the wave) |
| `duration` | `0.55` | Length (seconds) of each slide and fade |
| `travel` | `35` | Distance (px) logos slide up/in |
| `easing` | `"power2.out"` | Any [GSAP ease](https://gsap.com/docs/v3/Eases/) |
| `pauseOnHover` | `true` | Pause rotation while the mouse is over the wall |

## Design toggles (CSS)

Change these at the top of the `<style>` block, or override them in
**Design → Custom CSS** (overrides must load after the snippet, and Custom CSS does):

```css
:root{
  --lw-gap: 11px;         /* space between logos */
  --lw-max-width: 100%;   /* width of the whole wall */
  --lw-ratio: 1.3;        /* slot shape (width / height) */
  --lw-fit: cover;        /* cover = fill the slot, contain = show the whole logo */
  --lw-radius: 6px;       /* slot corner radius */
  --lw-pad: 10px;         /* inner padding around each logo */
  --lw-bg: transparent;   /* slot background colour */
}
```

Tip: for wide wordmark logos, use `--lw-fit: contain` so they aren't cropped.

## How it behaves

- **Logo count isn't a multiple of the visible count?** Each position still only
  cycles through its own column. For example, 12 logos on desktop give columns
  `1·6·11`, `2·7·12`, `3·8`, `4·9` and `5·10`. A column with a single logo stays still.
- **Resizing across the breakpoint** rebuilds the wall with the right number of positions.
- The original list is hidden (`display: none`), not removed.
- Running the script again (for example, re-pasting it in the console) cleanly tears
  down the previous wall first, via `window.__SK_COMPOSE_UNDO__.logoWave.destroy()`.

## Development

```
src/logo-wave.css     design toggles and layout
src/logo-wave.js      reads the images, builds the wall and runs the loop
scripts/build.mjs     bundles src/ into dist/code-injection.html
demo/index.html       local demo with mock Squarespace List Section markup
```

Open `demo/index.html` in a browser to try it. After editing `src/`, rebuild the
paste-in snippet with:

```
npm run build
```
