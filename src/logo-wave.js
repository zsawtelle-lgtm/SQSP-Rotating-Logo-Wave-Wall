(function () {
  const CONTROLS = {
    targets: ".user-items-list-carousel__slides",
    desktopCount: 5,
    mobileCount: 3,
    mobileBreakpoint: 767,
    interval: 3500,
    stagger: 0.2,
    duration: 0.55,
    travel: 35,
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
    mql: null,
    mqlHandler: null,
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
    if (state.mql && state.mqlHandler) {
      try {
        if (state.mql.removeEventListener) state.mql.removeEventListener("change", state.mqlHandler);
        else state.mql.removeListener(state.mqlHandler);
      } catch (e) {}
    }
    state.mql = null;
    state.mqlHandler = null;
    state.nodes.forEach(function (n) {
      if (window.gsap) { try { gsap.killTweensOf(n.querySelectorAll("img")); } catch (e) {} }
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    state.nodes = [];
    state.hidden.forEach(function (h) { h.el.style.display = h.prev; });
    state.hidden = [];
  };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
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

  function whenGsap(fn, tries) {
    tries = tries || 0;
    if (window.gsap) { fn(); return; }
    if (tries > 120) return;
    later(function () { whenGsap(fn, tries + 1); }, 50);
  }

  function columnCount() {
    return window.matchMedia("(max-width: " + CONTROLS.mobileBreakpoint + "px)").matches
      ? Math.max(1, CONTROLS.mobileCount)
      : Math.max(1, CONTROLS.desktopCount);
  }

  function renderSlots(wrap, images) {
    const cols = columnCount();
    if (window.gsap) { try { gsap.killTweensOf(wrap.querySelectorAll("img")); } catch (e) {} }
    wrap.innerHTML = "";
    wrap.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
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

  function advance(slot) {
    if (!slot._seq || slot._seq.length < 2 || !slot.isConnected) return;
    slot._i = (slot._i + 1) % slot._seq.length;
    const cur = slot._img;
    const next = document.createElement("img");
    next.src = slot._seq[slot._i];
    next.alt = "";
    slot.appendChild(next);
    slot._img = next;

    gsap.set(next, { y: CONTROLS.travel, autoAlpha: 0 });
    gsap.to(next, {
      y: 0,
      autoAlpha: 1,
      duration: CONTROLS.duration,
      ease: CONTROLS.easing
    });
    if (cur) {
      gsap.to(cur, {
        y: -CONTROLS.travel,
        autoAlpha: 0,
        duration: CONTROLS.duration,
        ease: CONTROLS.easing,
        onComplete: function () { if (cur.parentNode) cur.parentNode.removeChild(cur); }
      });
    }
  }

  function startLoop(wrap) {
    const id = setInterval(function () {
      if (wrap._paused) return;
      (wrap._slots || []).forEach(function (slot, i) {
        later(function () { advance(slot); }, i * CONTROLS.stagger * 1000);
      });
    }, Math.max(600, CONTROLS.interval));
    state.intervals.push(id);

    if (CONTROLS.pauseOnHover) {
      const enter = function () { wrap._paused = true; };
      const leave = function () { wrap._paused = false; };
      wrap.addEventListener("mouseenter", enter);
      wrap.addEventListener("mouseleave", leave);
      state.listeners.push({ el: wrap, type: "mouseenter", fn: enter });
      state.listeners.push({ el: wrap, type: "mouseleave", fn: leave });
    }
  }

  function build() {
    const lists = document.querySelectorAll(CONTROLS.targets);
    if (!lists.length) return;

    lists.forEach(function (list) {
      const images = Array.prototype.slice.call(list.querySelectorAll("img"))
        .map(function (im) { return im.getAttribute("data-src") || im.getAttribute("src") || ""; })
        .map(function (u) { return u.split("?")[0]; })
        .filter(Boolean);
      if (!images.length) return;

      state.hidden.push({ el: list, prev: list.style.display });
      list.style.display = "none";

      const wrap = document.createElement("div");
      wrap.className = "sk-logo-wave";
      wrap._images = images;
      list.parentNode.insertBefore(wrap, list);
      state.nodes.push(wrap);

      renderSlots(wrap, images);
      startLoop(wrap);
    });

    state.mql = window.matchMedia("(max-width: " + CONTROLS.mobileBreakpoint + "px)");
    state.mqlHandler = function () {
      state.nodes.forEach(function (wrap) { renderSlots(wrap, wrap._images); });
    };
    if (state.mql.addEventListener) state.mql.addEventListener("change", state.mqlHandler);
    else state.mql.addListener(state.mqlHandler);
  }

  ready(function () { whenGsap(build); });
})();
