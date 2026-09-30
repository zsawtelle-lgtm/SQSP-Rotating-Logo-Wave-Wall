/*! Squarespace Logo Wave Wall v__VERSION__ | https://github.com/zsawtelle-lgtm/SQSP-Rotating-Logo-Wave-Wall */
(function () {
  const VERSION = "__VERSION__";
  const GSAP_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js";
  const BASE_CSS = "__CSS__";

  // Simple List (Auto Layout) item containers. A container becomes a wave wall
  // when the CSS pane sets `--lw-wave: on` on it or its section.
  const TARGETS = ".user-items-list-item-container";

  // Used when a toggle isn't set in the CSS pane.
  const DEFAULTS = {
    desktopCount: 5,
    mobileCount: 3,
    mobileBreakpoint: 767,
    interval: 3500, // ms
    stagger: 0.2, // s
    duration: 0.55, // s
    travel: 35, // px
    easing: "power2.out",
    pauseOnHover: true
  };

  const NS = "__SK_COMPOSE_UNDO__";
  const KEY = "logoWave";
  window[NS] = window[NS] || {};
  if (window[NS][KEY] && typeof window[NS][KEY].destroy === "function") {
    try { window[NS][KEY].destroy(); } catch (e) {}
  }

  const state = {
    intervals: [],
    timeouts: [],
    nodes: [],
    hidden: [],
    listeners: [],
    destroy: null
  };
  window[NS][KEY] = state;

  state.destroy = function () {
    state.intervals.forEach(function (id) { clearInterval(id); });
    state.timeouts.forEach(function (id) { clearTimeout(id); });
    state.intervals = [];
    state.timeouts = [];
    state.listeners.forEach(function (l) {
      try { l.el.removeEventListener(l.type, l.fn); } catch (e) {}
    });
    state.listeners = [];
    state.nodes.forEach(function (n) {
      if (window.gsap) { try { gsap.killTweensOf(n.querySelectorAll("img")); } catch (e) {} }
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    state.nodes = [];
    state.hidden.forEach(function (h) { h.el.style.display = h.prev; });
    state.hidden = [];
  };

  function on(el, type, fn) {
    el.addEventListener(type, fn);
    state.listeners.push({ el: el, type: type, fn: fn });
  }

  // Tracks a timeout for destroy() and forgets it once it has fired,
  // so the list doesn't grow forever while the loop runs.
  function later(fn, ms) {
    const t = setTimeout(function () {
      const i = state.timeouts.indexOf(t);
      if (i !== -1) state.timeouts.splice(i, 1);
      fn();
    }, ms);
    state.timeouts.push(t);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  function injectCss() {
    if (document.getElementById("sk-logo-wave-css")) return;
    const style = document.createElement("style");
    style.id = "sk-logo-wave-css";
    style.textContent = BASE_CSS;
    // First in <head>, so anything in the CSS pane loads after it
    document.head.insertBefore(style, document.head.firstChild);
  }

  function loadGsap(fn) {
    if (window.gsap) { fn(); return; }
    let script = document.querySelector('script[src="' + GSAP_SRC + '"]');
    if (!script) {
      script = document.createElement("script");
      script.src = GSAP_SRC;
      document.head.appendChild(script);
    }
    script.addEventListener("load", fn, { once: true });
  }

  /* ---------- Reading toggles from the CSS pane ---------- */

  function cssVar(el, name) {
    return getComputedStyle(el).getPropertyValue(name).trim().replace(/^["']|["']$/g, "");
  }

  function toNumber(value, fallback) {
    const n = parseFloat(value);
    return isNaN(n) ? fallback : n;
  }

  // Accepts "3.5s" or "3500ms". Bare numbers under 100 are seconds, otherwise ms.
  function toMs(value, fallbackMs) {
    const n = parseFloat(value);
    if (isNaN(n)) return fallbackMs;
    if (/ms$/i.test(value)) return n;
    if (/s$/i.test(value) || n < 100) return n * 1000;
    return n;
  }

  function toBool(value, fallback) {
    if (!value) return fallback;
    return /^(on|true|1|yes)$/i.test(value);
  }

  function isEnabled(el) {
    return toBool(cssVar(el, "--lw-wave"), false);
  }

  function readSettings(el) {
    return {
      desktopCount: Math.max(1, Math.round(toNumber(cssVar(el, "--lw-count"), DEFAULTS.desktopCount))),
      mobileCount: Math.max(1, Math.round(toNumber(cssVar(el, "--lw-count-mobile"), DEFAULTS.mobileCount))),
      mobileBreakpoint: toNumber(cssVar(el, "--lw-mobile-breakpoint"), DEFAULTS.mobileBreakpoint),
      interval: Math.max(600, toMs(cssVar(el, "--lw-interval"), DEFAULTS.interval)),
      stagger: toMs(cssVar(el, "--lw-stagger"), DEFAULTS.stagger * 1000) / 1000,
      duration: toMs(cssVar(el, "--lw-duration"), DEFAULTS.duration * 1000) / 1000,
      travel: toNumber(cssVar(el, "--lw-travel"), DEFAULTS.travel),
      easing: cssVar(el, "--lw-ease") || DEFAULTS.easing,
      pauseOnHover: toBool(cssVar(el, "--lw-pause-on-hover"), DEFAULTS.pauseOnHover)
    };
  }

  /* ---------- Wall ---------- */

  function columnCount(wrap) {
    const s = wrap._settings;
    return window.matchMedia("(max-width: " + s.mobileBreakpoint + "px)").matches
      ? s.mobileCount
      : s.desktopCount;
  }

  function renderSlots(wrap) {
    const images = wrap._images;
    const cols = columnCount(wrap);
    if (window.gsap) { try { gsap.killTweensOf(wrap.querySelectorAll("img")); } catch (e) {} }
    wrap.innerHTML = "";
    wrap.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
    wrap._cols = cols;
    wrap._slots = [];

    // Column c cycles through images c, c+cols, c+2*cols, ...
    for (let c = 0; c < cols; c++) {
      const seq = [];
      for (let i = c; i < images.length; i += cols) seq.push(images[i]);
      if (!seq.length) continue;
      const slot = document.createElement("div");
      slot.className = "sk-logo-wave__slot";
      const img = document.createElement("img");
      img.src = seq[0];
      img.alt = "";
      img.loading = "lazy";
      slot.appendChild(img);
      slot._seq = seq;
      slot._i = 0;
      slot._img = img;
      wrap.appendChild(slot);
      wrap._slots.push(slot);
    }
  }

  function advance(slot, s) {
    if (!slot._seq || slot._seq.length < 2 || !slot.isConnected) return;
    slot._i = (slot._i + 1) % slot._seq.length;
    const cur = slot._img;
    const next = document.createElement("img");
    next.src = slot._seq[slot._i];
    next.alt = "";
    slot.appendChild(next);
    slot._img = next;
    gsap.set(next, { y: s.travel, autoAlpha: 0 });
    gsap.to(next, {
      y: 0,
      autoAlpha: 1,
      duration: s.duration,
      ease: s.easing
    });
    if (cur) {
      gsap.to(cur, {
        y: -s.travel,
        autoAlpha: 0,
        duration: s.duration,
        ease: s.easing,
        onComplete: function () { if (cur.parentNode) cur.parentNode.removeChild(cur); }
      });
    }
  }

  function startLoop(wrap) {
    const s = wrap._settings;
    const id = setInterval(function () {
      if (wrap._paused) return;
      (wrap._slots || []).forEach(function (slot, i) {
        later(function () { advance(slot, s); }, i * s.stagger * 1000);
      });
    }, s.interval);
    state.intervals.push(id);
    if (s.pauseOnHover) {
      on(wrap, "mouseenter", function () { wrap._paused = true; });
      on(wrap, "mouseleave", function () { wrap._paused = false; });
    }
  }

  function build() {
    const lists = Array.prototype.slice.call(document.querySelectorAll(TARGETS)).filter(isEnabled);
    lists.forEach(function (list) {
      if (list.classList.contains("sk-logo-wave")) return;
      const images = Array.prototype.slice.call(list.querySelectorAll("img"))
        .map(function (im) { return im.getAttribute("data-src") || im.getAttribute("src") || ""; })
        .map(function (u) { return u.split("?")[0]; })
        .filter(Boolean);
      if (!images.length) return;
      const wrap = document.createElement("div");
      wrap.className = "sk-logo-wave";
      wrap._images = images;
      wrap._settings = readSettings(list);
      state.hidden.push({ el: list, prev: list.style.display });
      list.style.display = "none";
      list.parentNode.insertBefore(wrap, list);
      state.nodes.push(wrap);
      renderSlots(wrap);
      startLoop(wrap);
    });

    if (!state.nodes.length) return;
    let resizeTimer = null;
    on(window, "resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        state.nodes.forEach(function (wrap) {
          if (columnCount(wrap) !== wrap._cols) renderSlots(wrap);
        });
      }, 150);
    });
  }

  function init() {
    state.destroy();
    injectCss();
    loadGsap(build);
  }

  window.LogoWave = { version: VERSION, init: init, destroy: state.destroy };
  ready(init);
})();
