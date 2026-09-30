# Squarespace Plugin Playbook

> **For Claude:** You're helping me build a reusable Squarespace plugin. Follow this
> playbook exactly. It describes the setup I already use in production (reference
> implementation: https://github.com/zsawtelle-lgtm/SQSP-Rotating-Logo-Wave-Wall).
> Ask me for the effect I want, which Squarespace section it targets, and the plugin
> name, then produce every file listed under **Deliverables**.

---

## 1. How my plugins work (the setup flow)

Every plugin installs the same way on a Squarespace site:

1. **Code Injection holds exactly one versioned script tag.** Nothing else goes there.
   ```html
   <script src="https://cdn.jsdelivr.net/gh/zsawtelle-lgtm/REPO-NAME@1.0.0/dist/NAME.min.js"></script>
   ```
2. **Everything else lives in Design → Custom CSS (the "CSS pane")**, as CSS custom
   properties scoped to a section ID. That includes switching the plugin on, all
   motion/behaviour settings, all look toggles and all mobile overrides:
   ```css
   [data-section-id="SECTION_ID"] {
     --xx-enable: on;      /* opt-in switch: required */
     --xx-speed: 3.5s;     /* behaviour toggle, read by JS */
     --xx-gap: 11px;       /* look toggle, used by CSS */
     --xx-gap-mobile: 0px; /* mobile override */
   }
   ```
3. The script is **self-contained**. It injects its own base CSS, loads any library
   it needs (e.g. GSAP) from a pinned CDN URL, finds opted-in sections, and builds
   the effect.

Why: I never edit injected code on a client site. Changing a setting means editing
the CSS pane. Upgrading means changing one version number. Each version is cached
permanently by jsDelivr, so a live site only changes when I change the version.

`xx` = a short 2–3 letter prefix unique to each plugin (e.g. `lw` for Logo Wave).

---

## 2. Deliverables for every plugin

```
REPO-NAME/
├── src/NAME.js            the script (source, readable)
├── src/NAME.css           base styles (embedded into the JS at build time)
├── scripts/build.mjs      builds dist/ (embeds CSS, stamps version, minifies)
├── dist/NAME.js           built, readable
├── dist/NAME.min.js       built, minified (this is what sites load)
├── css-pane.css           copy-paste block for Design → Custom CSS, every toggle commented
├── demo/index.html        local demo with mock Squarespace markup
├── package.json           name, version, "build" script, terser devDependency
├── .gitignore             node_modules/
└── README.md              install steps, toggle tables, behaviour notes, release steps
```

**If I can't run a build** (I'm working from the chat, not a terminal), write
`dist/NAME.js` by hand with the CSS already embedded as a string and the version
filled in, and have me use `dist/NAME.js` in the script tag instead of `.min.js`.

---

## 3. Script architecture (follow this skeleton)

```js
/*! PLUGIN TITLE v__VERSION__ | https://github.com/zsawtelle-lgtm/REPO-NAME */
(function () {
  const VERSION = "__VERSION__";            // replaced at build time from package.json
  const BASE_CSS = "__CSS__";               // replaced at build time with minified src/NAME.css
  const LIB_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"; // pinned, only if needed

  // Squarespace element(s) this plugin can convert. Only ones whose computed
  // --xx-enable is "on" are actually converted.
  const TARGETS = ".user-items-list-item-container";

  // Used when a toggle isn't set in the CSS pane.
  const DEFAULTS = { /* desktopCount: 5, mobileCount: 3, mobileBreakpoint: 767, interval: 3500, ... */ };

  // --- Undo namespace: re-running the script tears down the previous instance ---
  const NS = "__SK_COMPOSE_UNDO__";
  const KEY = "pluginKey";
  window[NS] = window[NS] || {};
  if (window[NS][KEY] && typeof window[NS][KEY].destroy === "function") {
    try { window[NS][KEY].destroy(); } catch (e) {}
  }
  const state = { intervals: [], timeouts: [], nodes: [], hidden: [], listeners: [], destroy: null };
  window[NS][KEY] = state;

  state.destroy = function () {
    // clear intervals + timeouts, remove listeners, kill library tweens,
    // remove created nodes, restore hidden originals: h.el.style.display = h.prev
  };

  function on(el, type, fn) { el.addEventListener(type, fn); state.listeners.push({ el, type, fn }); }

  // Tracked timeout that forgets itself after firing (no unbounded growth in loops)
  function later(fn, ms) {
    const t = setTimeout(function () {
      const i = state.timeouts.indexOf(t); if (i !== -1) state.timeouts.splice(i, 1); fn();
    }, ms);
    state.timeouts.push(t);
  }

  function injectCss() {
    if (document.getElementById("xx-css")) return;
    const s = document.createElement("style");
    s.id = "xx-css"; s.textContent = BASE_CSS;
    document.head.insertBefore(s, document.head.firstChild); // first, so the CSS pane wins
  }

  function loadLib(fn) {
    if (window.gsap) { fn(); return; }
    let s = document.querySelector('script[src="' + LIB_SRC + '"]');
    if (!s) { s = document.createElement("script"); s.src = LIB_SRC; document.head.appendChild(s); }
    s.addEventListener("load", fn, { once: true });
  }

  // --- Reading toggles from the CSS pane ---
  function cssVar(el, name) {
    return getComputedStyle(el).getPropertyValue(name).trim().replace(/^["']|["']$/g, "");
  }
  function toNumber(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
  function toMs(v, d) {       // "3.5s" | "3500ms"; bare numbers < 100 = seconds
    const n = parseFloat(v); if (isNaN(n)) return d;
    if (/ms$/i.test(v)) return n; if (/s$/i.test(v) || n < 100) return n * 1000; return n;
  }
  function toBool(v, d) { return v ? /^(on|true|1|yes)$/i.test(v) : d; }
  function isEnabled(el) { return toBool(cssVar(el, "--xx-enable"), false); }
  function readSettings(el) { return { /* each behaviour toggle via cssVar + parser + DEFAULTS */ }; }

  // --- Build ---
  function isMobile(wrap) {
    return window.matchMedia("(max-width: " + wrap._settings.mobileBreakpoint + "px)").matches;
  }
  function render(wrap) {
    const mobile = isMobile(wrap);
    wrap.classList.toggle("xx--mobile", mobile);   // switches on the -mobile look toggles
    wrap._mobile = mobile;
    // (re)build inner DOM for the current breakpoint
  }
  function build() {
    Array.prototype.slice.call(document.querySelectorAll(TARGETS)).filter(isEnabled).forEach(function (src) {
      // 1. read content from the Squarespace markup (images: data-src || src, strip "?format=")
      // 2. create wrapper, wrap._settings = readSettings(src)
      // 3. hide original: state.hidden.push({ el: src, prev: src.style.display }); src.style.display = "none";
      // 4. insert wrapper before original, state.nodes.push(wrapper), render(wrapper), start loops
    });
    if (!state.nodes.length) return;
    let t = null;
    on(window, "resize", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        state.nodes.forEach(function (w) { if (isMobile(w) !== w._mobile) render(w); });
      }, 150);
    });
  }

  function init() { state.destroy(); injectCss(); loadLib(build); }
  window.PluginName = { version: VERSION, init: init, destroy: state.destroy };
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init, { once: true });
})();
```

**Rules**
- Never hard-code section IDs in the script. Sections opt in via `--xx-enable: on` in the CSS pane.
- Hide the original Squarespace content (`display: none`) instead of deleting it, so the site owner keeps managing content in Squarespace and `destroy()` can restore it.
- Every timer, listener and created node is tracked in `state` so `destroy()` fully undoes the plugin.
- Behaviour toggles are read once at build. Tell me to refresh after changing them.
- Expose `window.PluginName.version` so I can check what's live from the console.

---

## 4. CSS architecture

```css
/* src/NAME.css: no :root defaults. Every value is var(--xx-toggle, default). */
.xx-wrap{
  --_gap: var(--xx-gap, 11px);
  --_pad: var(--xx-pad, 10px);
  gap: var(--_gap);
}
.xx--mobile{   /* class added by JS at the breakpoint */
  --_gap: var(--xx-gap-mobile, var(--xx-gap, 11px));
  --_pad: var(--xx-pad-mobile, var(--xx-pad, 10px));
}
.xx-wrap img{ top: var(--_pad); }
```

- Internal `--_name` variables resolve desktop vs mobile once; the rest of the CSS
  only uses `--_name`.
- Every look toggle gets a `-mobile` twin that falls back to the desktop value.
- The mobile switch is driven by the JS class, not `@media`, so it uses the same
  breakpoint toggle (`--xx-mobile-breakpoint`) as the JS behaviour.
- No `!important` anywhere. The CSS pane must always be able to win.

---

## 5. Squarespace gotchas (learned the hard way)

- **`data-section-id` appears on more than one element**: on the `<section>`
  *and* on inner wrappers (e.g. `.user-items-list-simple` and the
  `.user-items-list-item-container` list itself). Always tell me to write toggles
  as `[data-section-id="…"]`, **never** `section[data-section-id="…"]`. A value set
  on the inner wrapper beats one inherited from the section, so a `section[…]`
  override silently loses.
- **Know which section type you're targeting.** Check the markup, not the name in the editor.
  Only the first row is confirmed on a live site; confirm the others with right-click → Inspect
  (or ask me to paste the section's HTML) before building:
  | Squarespace section | Container to target |
  | --- | --- |
  | List Section → Simple layout | `.user-items-list-item-container` |
  | List Section → Carousel layout | `.user-items-list-carousel__slides` |
  | Gallery Section → Grid | `.gallery-grid-wrapper` |
  | Gallery Section → Masonry / Strips / Slideshow / Reel | `.gallery-masonry`, `.gallery-strips`, `.gallery-slideshow`, `.gallery-reel` |
- **Images are lazy-loaded.** Read `data-src` first, then `src`. Strip `?format=…`
  or replace it with `?format=500w` for a sensible size.
- **Code Injection requires a Core/Business plan or higher.** It may not run inside
  the editor, so always test the live page in a private window.
- **The Custom CSS pane is compiled with LESS.** Plain custom properties work fine.
  Avoid LESS-special syntax in toggle values (e.g. `~`, `@`, `e(...)`).

---

## 6. Versioning and release flow

- `package.json` `version` is the single source of truth. The build stamps it into
  the banner and `window.PluginName.version`.
- **Tags have no "v" prefix** (`1.0.0`, `1.1.0`), and the script tag uses the same number.
- Semver: new toggle or feature = minor (`1.1.0`); bug fix = patch (`1.0.1`).
- The repo **must be public** for jsDelivr to serve it.

Release steps:
1. Edit `src/`, bump `version` in `package.json`, run `npm run build`
   (or hand-write `dist/` if there's no build).
2. Commit to a branch → open a pull request → **Merge** into `main`.
3. GitHub → **Releases → Draft a new release** → tag `1.2.0` (create new), target
   `main`, title `1.2.0` → **Publish** (not draft).
4. Check `https://cdn.jsdelivr.net/gh/OWNER/REPO@1.2.0/dist/NAME.min.js` loads
   (can take a few minutes).
5. Update the site's script tag to `@1.2.0`. Old versions keep working forever.

To test before tagging, use a commit SHA instead of a version:
`https://cdn.jsdelivr.net/gh/OWNER/REPO@<full-commit-sha>/dist/NAME.min.js`

---

## 7. Build script (scripts/build.mjs)

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const { version } = JSON.parse(read('package.json'));
const NAME = 'NAME';

const css = read(`src/${NAME}.css`)
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,])\s*/g, '$1').trim();

const js = read(`src/${NAME}.js`)
  .replaceAll('__VERSION__', version)
  .replace('"__CSS__"', JSON.stringify(css));

const min = await minify(js, { format: { comments: /^!/ } });
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, `dist/${NAME}.js`), js);
writeFileSync(join(root, `dist/${NAME}.min.js`), min.code + '\n');
console.log(`Built ${NAME} v${version}`);
```

`package.json`: `"type": "module"`, `"scripts": { "build": "node scripts/build.mjs" }`,
`"devDependencies": { "terser": "^5.36.0" }`.

---

## 8. css-pane.css template

```css
/* ==========================================================
   PLUGIN TITLE: paste into Design > Custom CSS
   Replace the section ID with your section's ID.
   Delete any line to use its default.
   ========================================================== */
[data-section-id="YOUR_SECTION_ID"] {
  --xx-enable: on;               /* required: turns this section on */

  /* Behaviour */
  --xx-mobile-breakpoint: 767;   /* px */
  /* ... */

  /* Look */
  --xx-gap: 11px;
  /* ... */

  /* Look on mobile (falls back to the desktop value when deleted) */
  --xx-gap-mobile: 0px;
  /* ... */
}
```

---

## 9. Demo and testing checklist

`demo/index.html` mirrors the real Squarespace markup for the target section (with
`data-section-id` on the section **and** the inner wrapper, like Squarespace), a
`<style>` block standing in for the CSS pane, and a second identical section
**without** `--xx-enable` that must stay untouched. Load `../dist/NAME.js`.

Before any release, confirm:
- [ ] The effect runs on desktop and mobile widths
- [ ] Resizing across the breakpoint in both directions re-renders and swaps `-mobile` toggles
- [ ] Every `-mobile` toggle falls back to desktop when unset
- [ ] A section without `--xx-enable: on` is untouched
- [ ] Running the script twice doesn't duplicate anything (undo namespace works)
- [ ] `PluginName.destroy()` restores the original section exactly
- [ ] No console errors; the minified build behaves the same as the readable one
- [ ] `PluginName.version` matches `package.json`

---

## 10. Troubleshooting (give me this when something doesn't show up)

1. Console: `PluginName.version`.
   - `undefined` / "not defined" → the script didn't load: check the tag exists and is
     published, the repo is public, and the URL/version is right.
   - Returns a version → the script loaded; the problem is in the CSS pane.
2. Is `--xx-enable: on` present, and does the section ID match the live page exactly?
3. Is the toggle written as `[data-section-id="…"]` (not `section[…]`)?
4. Is any old inline version of the code still in Code Injection? Remove it.
5. Test the live page in a private window, not the editor.

---

## 11. README outline for each plugin

1. What it does (bullets)
2. Install: build the section → add the script tag → CSS pane block
3. Toggle tables: behaviour, look, look on mobile (with defaults)
4. Selector tip (`[data-section-id]` vs `section[...]`)
5. How it behaves (edge cases, resizing, what's hidden vs removed)
6. Versioning and release steps
7. Development (file layout, `npm run build`, demo)
