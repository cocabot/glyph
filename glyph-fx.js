"use strict";

(function () {
  const SETTINGS_KEY = "glyph_settings";
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
    catch { return {}; }
  }
  function isHapticEnabled() {
    const s = loadSettings();
    return s.haptic !== false;
  }
  function isMotionReduced() {
    const s = loadSettings();
    if (s.reduceMotion === true) return true;
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function bloom(el) {
    if (!el) return;
    el.classList.remove("ink-bloom");
    void el.offsetWidth;
    el.classList.add("ink-bloom");
    setTimeout(() => el.classList.remove("ink-bloom"), 240);
  }

  function shake(el) {
    if (!el) return;
    el.classList.remove("err-shake");
    void el.offsetWidth;
    el.classList.add("err-shake");
    setTimeout(() => el.classList.remove("err-shake"), 620);
  }

  function inkLine(hintEl) {
    if (!hintEl) return;
    hintEl.classList.remove("line-stroke");
    void hintEl.offsetWidth;
    hintEl.classList.add("line-stroke");
    setTimeout(() => hintEl.classList.remove("line-stroke"), 320);
  }

  function chipBounce(el) {
    if (!el) return;
    el.classList.remove("chip-bounce");
    void el.offsetWidth;
    el.classList.add("chip-bounce");
    setTimeout(() => el.classList.remove("chip-bounce"), 180);
  }

  function countUp(el, from, to, duration) {
    if (!el) return;
    if (isMotionReduced()) { el.textContent = to; return; }
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = to;
    }
    requestAnimationFrame(frame);
  }

  function countUpTime(el, totalSeconds, duration) {
    if (!el) return;
    if (isMotionReduced()) {
      const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const s = String(totalSeconds % 60).padStart(2, "0");
      el.textContent = `${m}:${s}`;
      return;
    }
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(totalSeconds * eased);
      const m = String(Math.floor(cur / 60)).padStart(2, "0");
      const s = String(cur % 60).padStart(2, "0");
      el.textContent = `${m}:${s}`;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function paintIn(rootEl) {
    if (!rootEl) return;
    if (isMotionReduced()) return;
    const cells = rootEl.querySelectorAll(".paint-cell");
    cells.forEach((c, i) => {
      c.style.animationDelay = `${(i / cells.length) * 600}ms`;
      c.classList.add("paint-in");
    });
    setTimeout(() => cells.forEach(c => c.classList.remove("paint-in")), 1200);
  }

  function dust(containerEl, count = 14) {
    if (!containerEl || isMotionReduced()) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "dust-particle";
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${1400 + Math.random() * 1000}ms`;
      p.style.animationDelay = `${Math.random() * 200}ms`;
      containerEl.appendChild(p);
      setTimeout(() => p.remove(), 2600);
    }
  }

  function screenInk(targetScreen) {
    if (!targetScreen || isMotionReduced()) return;
    targetScreen.classList.remove("screen-ink");
    void targetScreen.offsetWidth;
    targetScreen.classList.add("screen-ink");
    setTimeout(() => targetScreen.classList.remove("screen-ink"), 320);
  }

  function longPressRing(el, progress) {
    if (!el) return;
    if (progress <= 0) {
      el.classList.remove("press-ring");
      el.style.removeProperty("--press-progress");
      return;
    }
    el.classList.add("press-ring");
    el.style.setProperty("--press-progress", `${Math.min(1, progress) * 360}deg`);
  }

  function vibrate(pattern) {
    if (!isHapticEnabled()) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function reflectMotionSetting() {
    document.documentElement.classList.toggle("reduce-motion", isMotionReduced());
  }
  reflectMotionSetting();

  window.GlyphFx = {
    bloom, shake, inkLine, chipBounce,
    countUp, countUpTime, paintIn, dust,
    screenInk, longPressRing, vibrate,
    loadSettings, isHapticEnabled, isMotionReduced, reflectMotionSetting,
  };
})();
