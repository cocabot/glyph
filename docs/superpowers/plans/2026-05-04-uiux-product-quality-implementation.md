# GLYPH UI/UX 製品クオリティ仕上げ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GLYPH の既存「古代碑文」テーマを保ったまま、視覚仕上げとマイクロインタラクションを製品クオリティに引き上げる。SVG アイコンセット導入、ink-bloom／シェイク／ストローク等のアニメーション追加、進捗リボンと額装演出の実装。

**Architecture:** 新規ブラウザ専用ファイル 2 つ（`glyph-icons.js`, `glyph-fx.js`）を追加し、既存の `index.html` / `style.css` / `app.js` の必要箇所だけを編集する。`glyph-fx.js` は `window.GlyphFx` をエクスポートし、`applyAction` などの既存フックポイントから呼び出す。CSS は冒頭にトークンを追加して既存スタイルを再定義（破壊しない）。Puppeteer の `tests/ui.test.js` のセレクタを壊さないことが鉄則。

**Tech Stack:** バニラ JS、CSS Custom Properties、CSS Animations（transform/opacity）、SVG `<symbol>`/`<use>`、Node built-in test runner、Puppeteer。

**Spec:** `docs/superpowers/specs/2026-05-04-uiux-product-quality-design.md`

---

## File Structure

新規 (browser-only):
- `glyph-icons.js` — SVG `<symbol>` 群を `<body>` 先頭にインジェクト。26 個（チップ用 10 + UI 用 16）
- `glyph-fx.js` — `window.GlyphFx` グローバル。bloom / shake / inkLine / countUp / paintIn / dust / longPressRing / screenInk

修正:
- `index.html` — `?v=21 → ?v=22`、新 script 追加、ヒーローオーナメント、チップを SVG 化、divider SVG 化、進捗リボン、ヘルプモーダル設定トグル、画像保存ボタン、額装フレーム
- `style.css` — トークン v2 追加、keyframes、新コンポーネント
- `app.js` — fx 発火点を 5 箇所追加、設定 localStorage、画像保存ハンドラ、タイトル表示変更、進捗リボン更新

無修正: `picross-core.js`, `picross-dict.js`, `tests/core.test.js`, `tests/icon-pipeline.test.js`

---

## Conventions for All Tasks

各タスク末尾の検証ステップ:
- `node --check <file>` で構文チェック
- `python3 -m http.server 8123` 起動済み前提で `npm run test:ui` を走らせる（既存セレクタ非破壊の保証）
- 構造変更を含むタスクのみ `npm run test:ui:shots` でスクショ更新

各タスクで `git commit` を必ず行う。コミットメッセージは Conventional Commits 風（`feat:` / `style:` / `refactor:`）。

---

## Task 1: モーショントークンと prefers-reduced-motion を導入

**Files:**
- Modify: `style.css:8` (`:root` ブロック末尾)

- [ ] **Step 1: `:root` にモーショントークンを追加**

`style.css` の `:root { ... }` の末尾、`--mono` の行の直後に追加：

```css
  /* モーション */
  --motion-fast: 120ms;
  --motion-mid:  220ms;
  --motion-slow: 420ms;
  --ease:        cubic-bezier(.2,.6,.2,1);
  --ornament:    var(--ink-soft);
```

- [ ] **Step 2: ファイル末尾に reduced-motion 上書きを追加**

`style.css` の末尾（最終行の後）に追加：

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 1ms;
    --motion-mid:  1ms;
    --motion-slow: 1ms;
  }
  *, *::before, *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

- [ ] **Step 3: 構文確認と既存 UI テスト**

```bash
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全テスト pass（このタスクは可視変化なし）。

- [ ] **Step 4: commit**

```bash
git add style.css
git commit -m "style: add motion tokens and reduced-motion override"
```

---

## Task 2: SVG アイコンセット (`glyph-icons.js`) を作成

**Files:**
- Create: `glyph-icons.js`
- Modify: `index.html:198` (script タグ追加・cache buster バンプ)

- [ ] **Step 1: `glyph-icons.js` を作成**

統一スタイル: 24×24 viewBox、`stroke-width=1.5`、`stroke="currentColor"`、`fill="none"`、`stroke-linecap="round"`、`stroke-linejoin="round"`。

```javascript
"use strict";

// SVG <symbol> 群を <body> 先頭にインジェクト
(function injectIcons() {
  const SYMBOLS = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>
    <!-- UI: ナビゲーション -->
    <symbol id="g-arrow-left" viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6M8 12h12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="g-question" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 9.5a3 3 0 015.5 1.5c0 1.5-2.5 2-2.5 3.5M12 17.5h.01" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>

    <!-- UI: モード -->
    <symbol id="g-square-fill" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor"/></symbol>
    <symbol id="g-cross" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
    <symbol id="g-square-empty" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></symbol>

    <!-- UI: アクション -->
    <symbol id="g-minus" viewBox="0 0 24 24"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
    <symbol id="g-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
    <symbol id="g-undo" viewBox="0 0 24 24"><path d="M9 14l-4-4 4-4M5 10h8a5 5 0 110 10h-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="g-restart" viewBox="0 0 24 24"><path d="M19 8a8 8 0 10.5 6M19 4v4h-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>

    <!-- UI: 主要アクション -->
    <symbol id="g-image" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 16l4-4 4 4 3-3 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/></symbol>
    <symbol id="g-camera" viewBox="0 0 24 24"><path d="M4 8h3l2-2h6l2 2h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></symbol>
    <symbol id="g-dice" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/></symbol>

    <!-- UI: ステータス -->
    <symbol id="g-hourglass" viewBox="0 0 24 24"><path d="M7 4h10M7 20h10M8 4v3l4 4 4-4V4M8 20v-3l4-4 4 4v3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="g-checkmark" viewBox="0 0 24 24"><path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="g-sparkle" viewBox="0 0 24 24"><path d="M12 4v6M12 14v6M4 12h6M14 12h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
    <symbol id="g-download" viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>

    <!-- ホームチップ用 -->
    <symbol id="g-cat" viewBox="0 0 24 24"><path d="M5 6l3 4M19 6l-3 4M6 10c0 5 3 9 6 9s6-4 6-9c0-1-1-2-3-2H9c-2 0-3 1-3 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="13" r=".7" fill="currentColor"/><circle cx="14" cy="13" r=".7" fill="currentColor"/><path d="M11 16h2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></symbol>
    <symbol id="g-dog" viewBox="0 0 24 24"><path d="M5 8c0-1 1-2 2-1l1 1M19 8c0-1-1-2-2-1l-1 1M7 9c0 5 2 9 5 9s5-4 5-9c0-1-1-2-2-2H9c-1 0-2 1-2 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="13" r=".7" fill="currentColor"/><circle cx="14" cy="13" r=".7" fill="currentColor"/><circle cx="12" cy="15.5" r=".7" fill="currentColor"/></symbol>
    <symbol id="g-cherry" viewBox="0 0 24 24"><path d="M12 5c-1 3 0 6 3 7M12 5c1 3 0 6-3 7" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="9" cy="15" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="15" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="15" r=".8" fill="currentColor"/></symbol>
    <symbol id="g-star" viewBox="0 0 24 24"><path d="M12 4l2.4 5.4 5.6.8-4 4.2 1 5.6L12 17l-5 3 1-5.6-4-4.2 5.6-.8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
    <symbol id="g-heart" viewBox="0 0 24 24"><path d="M12 19s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 9c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
    <symbol id="g-car" viewBox="0 0 24 24"><path d="M4 14l2-5h12l2 5v4H4zM6 9l1-2h10l1 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="17.5" r="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="16" cy="17.5" r="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/></symbol>
    <symbol id="g-apple" viewBox="0 0 24 24"><path d="M12 7c-3-3-7-1-7 4s3 9 7 9 7-4 7-9-4-7-7-4zM12 7v-2c0-1 1-2 2-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
    <symbol id="g-house" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
    <symbol id="g-fish" viewBox="0 0 24 24"><path d="M3 12c4-5 11-5 15 0-4 5-11 5-15 0zM18 12l3-3v6zM10 12h.01" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="g-flower" viewBox="0 0 24 24"><circle cx="12" cy="7" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></symbol>

    <!-- 装飾 -->
    <symbol id="g-ornament" viewBox="0 0 60 12"><path d="M0 6h22M38 6h22" fill="none" stroke="currentColor" stroke-width="1"/><rect x="22" y="2" width="16" height="8" fill="none" stroke="currentColor" stroke-width="1"/><path d="M26 6h8M30 3v6" fill="none" stroke="currentColor" stroke-width=".8"/></symbol>
  </defs>
</svg>`;
  const wrap = document.createElement("div");
  wrap.innerHTML = SYMBOLS;
  const svg = wrap.firstElementChild;
  if (svg) document.body.insertBefore(svg, document.body.firstChild);
})();
```

- [ ] **Step 2: `index.html` のスクリプトタグ追加と cache buster バンプ**

`index.html:196-198` を以下に置換：

```html
<script src="picross-core.js?v=22"></script>
<script src="picross-dict.js?v=22"></script>
<script src="glyph-icons.js?v=22"></script>
<script src="app.js?v=22"></script>
```

加えて `index.html:10` のスタイルシートも v=22 にバンプ：

```html
<link rel="stylesheet" href="style.css?v=22">
```

- [ ] **Step 3: 構文チェック**

```bash
node --check glyph-icons.js
```

期待: 出力なし（成功）。

- [ ] **Step 4: ローカル動作確認**

ブラウザで `http://127.0.0.1:8123/` を開き、DevTools の Console で実行：

```javascript
document.querySelectorAll('symbol[id^="g-"]').length
```

期待: `26`。

- [ ] **Step 5: 既存 UI テスト**

```bash
npm run test:ui
```

期待: pass（HTML 構造変えていないので影響なし）。

- [ ] **Step 6: commit**

```bash
git add glyph-icons.js index.html
git commit -m "feat: add SVG icon symbol set"
```

---

## Task 3: アニメ utility (`glyph-fx.js`) を作成

**Files:**
- Create: `glyph-fx.js`
- Modify: `index.html` (script タグ追加)
- Modify: `tests/ui.test.js` (Puppeteer 経由の挙動テスト追加)

- [ ] **Step 1: 失敗するテストを書く**

`tests/ui.test.js` の末尾、最終 `test(...)` ブロックの後に追加：

```javascript
test("GlyphFx.bloom adds and removes class", async (t) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.click("#btn-sample");
    await page.waitForSelector(".cell", { timeout: 5000 });
    const result = await page.evaluate(async () => {
      const cell = document.querySelector(".cell");
      window.GlyphFx.bloom(cell);
      const hasClass = cell.classList.contains("ink-bloom");
      await new Promise(r => setTimeout(r, 300));
      const removed = !cell.classList.contains("ink-bloom");
      return { hasClass, removed };
    });
    assert.equal(result.hasClass, true, "bloom adds class");
    assert.equal(result.removed, true, "bloom removes class after timeout");
  } finally {
    await browser.close();
  }
});

test("GlyphFx.shake adds and removes class", async (t) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.click("#btn-sample");
    await page.waitForSelector(".cell", { timeout: 5000 });
    const result = await page.evaluate(async () => {
      const cell = document.querySelector(".cell");
      window.GlyphFx.shake(cell);
      const hasClass = cell.classList.contains("err-shake");
      await new Promise(r => setTimeout(r, 700));
      const removed = !cell.classList.contains("err-shake");
      return { hasClass, removed };
    });
    assert.equal(result.hasClass, true);
    assert.equal(result.removed, true);
  } finally {
    await browser.close();
  }
});
```

- [ ] **Step 2: テスト失敗を確認**

```bash
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui 2>&1 | tail -20
kill $SERVER_PID
```

期待: 新規 2 テストが FAIL（`window.GlyphFx is undefined`）。

- [ ] **Step 3: `glyph-fx.js` を作成**

```javascript
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

  // mm:ss 形式のカウントアップ
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
```

- [ ] **Step 4: `index.html` に script タグを追加**

`index.html:198` の `app.js` 行の直前に追加：

```html
<script src="glyph-fx.js?v=22"></script>
<script src="app.js?v=22"></script>
```

- [ ] **Step 5: bloom / shake CSS を `style.css` 末尾に追加**

```css
/* ========================================================================
   FX: bloom / shake / line-stroke
   ======================================================================== */
.cell.ink-bloom::after {
  content: "";
  position: absolute; inset: 0;
  border-radius: 50%;
  background: var(--ink);
  opacity: 0;
  animation: ink-bloom var(--motion-mid) var(--ease) forwards;
  pointer-events: none;
}
@keyframes ink-bloom {
  0%   { transform: scale(0); opacity: .35; }
  60%  { opacity: .25; }
  100% { transform: scale(1.4); opacity: 0; }
}

.err-shake { animation: err-shake 600ms cubic-bezier(.36,.07,.19,.97); }
@keyframes err-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}
.cell.err-shake { box-shadow: inset 0 0 0 2px var(--terracotta); }

.col-hint.line-stroke span,
.row-hint.line-stroke span {
  position: relative;
}
.col-hint.line-stroke span::after,
.row-hint.line-stroke span::after {
  content: "";
  position: absolute; left: 0; right: 0; top: 50%;
  height: 2px;
  background: var(--terracotta);
  transform-origin: left center;
  animation: line-stroke 300ms var(--ease) forwards;
}
@keyframes line-stroke {
  0%   { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}

.chip-bounce { animation: chip-bounce 180ms var(--ease); }
@keyframes chip-bounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(.94); }
  70%  { transform: scale(1.04); }
  100% { transform: scale(1); }
}

.screen-ink::before {
  content: "";
  position: absolute; inset: 0;
  background: var(--ink);
  opacity: 0;
  pointer-events: none;
  z-index: 50;
  animation: screen-ink 320ms var(--ease) forwards;
}
@keyframes screen-ink {
  0%   { opacity: 0; }
  30%  { opacity: .15; }
  100% { opacity: 0; }
}

.cell.press-ring::before {
  content: "";
  position: absolute; inset: 4px;
  border-radius: 50%;
  background: conic-gradient(var(--terracotta) var(--press-progress, 0deg), transparent 0);
  opacity: .5;
  pointer-events: none;
}

.dust-particle {
  position: absolute;
  bottom: 0;
  width: 2px; height: 2px;
  background: var(--papyrus-deep);
  border-radius: 50%;
  pointer-events: none;
  animation: dust-rise linear forwards;
}
@keyframes dust-rise {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  20%  { opacity: .8; }
  100% { transform: translateY(-90vh) translateX(20px); opacity: 0; }
}
```

- [ ] **Step 6: テスト pass を確認**

```bash
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 新規 bloom / shake テストが pass。

- [ ] **Step 7: commit**

```bash
git add glyph-fx.js index.html style.css tests/ui.test.js
git commit -m "feat: add GlyphFx animation utilities (bloom, shake, ink-line, dust)"
```

---

## Task 4: ホーム画面のチップを SVG 化 + バウンスアニメ

**Files:**
- Modify: `index.html:28-39` (チップ markup)
- Modify: `style.css` (チップスタイル)
- Modify: `app.js:625-631` (チップクリックハンドラ)

- [ ] **Step 1: チップ markup を置換**

`index.html:28-39` の `<div class="keyword-chips">...</div>` 全体を以下に置換：

```html
<div class="keyword-chips">
  <button class="chip" data-kw="猫"><svg class="chip-icon" aria-hidden="true"><use href="#g-cat"/></svg><span>猫</span></button>
  <button class="chip" data-kw="犬"><svg class="chip-icon" aria-hidden="true"><use href="#g-dog"/></svg><span>犬</span></button>
  <button class="chip" data-kw="桜"><svg class="chip-icon" aria-hidden="true"><use href="#g-cherry"/></svg><span>桜</span></button>
  <button class="chip" data-kw="星"><svg class="chip-icon" aria-hidden="true"><use href="#g-star"/></svg><span>星</span></button>
  <button class="chip" data-kw="ハート"><svg class="chip-icon" aria-hidden="true"><use href="#g-heart"/></svg><span>ハート</span></button>
  <button class="chip" data-kw="車"><svg class="chip-icon" aria-hidden="true"><use href="#g-car"/></svg><span>車</span></button>
  <button class="chip" data-kw="りんご"><svg class="chip-icon" aria-hidden="true"><use href="#g-apple"/></svg><span>りんご</span></button>
  <button class="chip" data-kw="家"><svg class="chip-icon" aria-hidden="true"><use href="#g-house"/></svg><span>家</span></button>
  <button class="chip" data-kw="魚"><svg class="chip-icon" aria-hidden="true"><use href="#g-fish"/></svg><span>魚</span></button>
  <button class="chip" data-kw="花"><svg class="chip-icon" aria-hidden="true"><use href="#g-flower"/></svg><span>花</span></button>
</div>
```

- [ ] **Step 2: `style.css` の `.chip` セクションを更新**

`style.css:210-223` の `.chip` 定義を以下に置換：

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--papyrus);
  color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 2px;
  padding: 6px 10px 6px 8px;
  font-size: 0.85rem;
  font-family: var(--sans);
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background var(--motion-fast), color var(--motion-fast), transform var(--motion-fast);
}
.chip-icon {
  width: 16px;
  height: 16px;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.chip:hover { background: var(--papyrus-deep); }
.chip:hover .chip-icon { color: var(--ink); }
.chip:active { background: var(--ink); color: var(--papyrus); }
.chip:active .chip-icon { color: var(--papyrus); }
```

- [ ] **Step 3: `app.js` のチップハンドラに bounce 発火を追加**

`app.js:625-631` の以下のブロック：

```javascript
document.querySelectorAll(".chip[data-kw]").forEach(chip => {
  chip.addEventListener("click", () => {
    const kw = chip.dataset.kw;
    document.getElementById("keyword-input").value = kw;
    generateFromKeyword(kw);
  });
});
```

を次に置換：

```javascript
document.querySelectorAll(".chip[data-kw]").forEach(chip => {
  chip.addEventListener("click", () => {
    const kw = chip.dataset.kw;
    if (window.GlyphFx) GlyphFx.chipBounce(chip);
    document.getElementById("keyword-input").value = kw;
    generateFromKeyword(kw);
  });
});
```

- [ ] **Step 4: 構文チェックと UI テスト**

```bash
node --check app.js
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass（`.chip[data-kw]` セレクタは維持）。

- [ ] **Step 5: commit**

```bash
git add index.html style.css app.js
git commit -m "feat(home): replace chip emojis with SVG icons and add bounce animation"
```

---

## Task 5: ホーム画面 — ヒーロー装飾、divider、主要アクション SVG 化

**Files:**
- Modify: `index.html:16-20` (ヒーロー), `index.html:41-50` (divider と主アクション markup)
- Modify: `style.css` (ヒーロー、divider, 主アクション)

- [ ] **Step 1: ヒーローに上下オーナメント帯を追加**

`index.html:16-20` の `<header class="hero">...</header>` 全体を以下に置換：

```html
<header class="hero">
  <svg class="hero-ornament hero-ornament-top" aria-hidden="true"><use href="#g-ornament"/></svg>
  <h1>GLYPH<span class="ja">グリフ</span></h1>
  <p class="subtitle">言葉や写真から、刻む一枚を。</p>
  <svg class="hero-ornament hero-ornament-bottom" aria-hidden="true"><use href="#g-ornament"/></svg>
</header>
```

`style.css:101-138` の `.hero` 関連を以下に置換（既存の `.hero::before` / `.hero::after` の罫線は SVG オーナメントに置き換え）：

```css
.hero {
  text-align: center;
  padding: 5vh 24px 14px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.hero h1 {
  font-family: var(--serif);
  font-size: 2.4rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.32em;
  color: var(--ink);
  text-indent: 0.32em;
}
.hero h1 .ja {
  display: block;
  font-family: var(--mincho);
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.6em;
  text-indent: 0.6em;
  color: var(--ink-soft);
  margin-top: 6px;
}
.subtitle {
  font-family: var(--mincho);
  color: var(--ink-soft);
  margin: 0;
  font-size: 0.92rem;
  letter-spacing: 0.18em;
}
.hero-ornament {
  width: 80px;
  height: 12px;
  color: var(--ornament);
  flex-shrink: 0;
}
.hero-ornament-top    { margin-bottom: 4px; }
.hero-ornament-bottom { margin-top: 4px; }
```

- [ ] **Step 2: divider markup を置換**

`index.html:41` の `<div class="divider"><span>または</span></div>` を：

```html
<div class="divider">
  <svg class="divider-ornament" aria-hidden="true"><use href="#g-ornament"/></svg>
  <span>または</span>
  <svg class="divider-ornament" aria-hidden="true"><use href="#g-ornament"/></svg>
</div>
```

- [ ] **Step 3: 主アクションボタンに SVG アイコンを追加**

`index.html:42-50` の 3 つのボタンを：

```html
<label class="btn btn-primary btn-large">
  <input type="file" id="file-input" accept="image/*" hidden>
  <svg class="btn-icon" aria-hidden="true"><use href="#g-image"/></svg>
  <span>写真を選ぶ</span>
</label>
<label class="btn btn-secondary btn-large">
  <input type="file" id="camera-input" accept="image/*" capture="environment" hidden>
  <svg class="btn-icon" aria-hidden="true"><use href="#g-camera"/></svg>
  <span>カメラで撮る</span>
</label>
<button class="btn btn-ghost" id="btn-sample">
  <svg class="btn-icon" aria-hidden="true"><use href="#g-dice"/></svg>
  <span>サンプルで試す</span>
</button>
```

- [ ] **Step 4: divider と btn-icon の CSS を更新**

`style.css:226-252` の `.divider` セクション全体を以下に置換：

```css
.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ink-faint);
  font-size: 0.78rem;
  font-family: var(--mincho);
  letter-spacing: 0.3em;
  margin: 6px 0;
}
.divider-ornament {
  width: 60px;
  height: 12px;
  color: var(--ornament);
  flex-shrink: 0;
}
.divider span {
  flex-shrink: 0;
}
```

`style.css` の `.btn` 定義の後に追加（`.btn-fixed` 定義の前）：

```css
.btn-icon {
  width: 18px;
  height: 18px;
  color: currentColor;
  flex-shrink: 0;
}
```

- [ ] **Step 5: UI テスト**

```bash
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass（`#btn-sample`、`#file-input`、`#camera-input` のセレクタ維持）。

- [ ] **Step 6: commit**

```bash
git add index.html style.css
git commit -m "feat(home): hero ornaments, SVG divider, and main action icons"
```

---

## Task 6: プレイ画面 — トップバー / モード / アクションを SVG 化、タイトル変更

**Files:**
- Modify: `index.html:59-141` (topbar, mode-switch, play-actions)
- Modify: `style.css` (mode-btn, play-actions)
- Modify: `app.js` (タイトル設定追加)

- [ ] **Step 1: 戻るボタン・ヘルプボタンを SVG 化**

`index.html:60-62`（編集トップバー）：

```html
<header class="topbar">
  <button class="icon-btn" data-back="home"><svg class="icon-svg" aria-hidden="true"><use href="#g-arrow-left"/></svg></button>
  <h2>下絵</h2>
  <span></span>
</header>
```

`index.html:124-127`（プレイトップバー）：

```html
<header class="topbar">
  <button class="icon-btn" data-back="edit"><svg class="icon-svg" aria-hidden="true"><use href="#g-arrow-left"/></svg></button>
  <h2 id="play-title">プレイ</h2>
  <button class="icon-btn" id="btn-help"><svg class="icon-svg" aria-hidden="true"><use href="#g-question"/></svg></button>
</header>
```

- [ ] **Step 2: モード切替を SVG 化（data-mode と aria-label を残す）**

`index.html:130-134`：

```html
<div class="mode-switch">
  <button class="mode-btn active" data-mode="fill" aria-label="塗る"><svg class="icon-svg" aria-hidden="true"><use href="#g-square-fill"/></svg></button>
  <button class="mode-btn" data-mode="cross" aria-label="印を付ける"><svg class="icon-svg" aria-hidden="true"><use href="#g-cross"/></svg></button>
  <button class="mode-btn" data-mode="erase" aria-label="消す"><svg class="icon-svg" aria-hidden="true"><use href="#g-square-empty"/></svg></button>
</div>
```

- [ ] **Step 3: アクションを SVG 化**

`index.html:136-140`：

```html
<div class="play-actions">
  <button class="icon-btn" id="btn-zoom-out" aria-label="縮小"><svg class="icon-svg" aria-hidden="true"><use href="#g-minus"/></svg></button>
  <button class="icon-btn" id="btn-zoom-in" aria-label="拡大"><svg class="icon-svg" aria-hidden="true"><use href="#g-plus"/></svg></button>
  <button class="icon-btn" id="btn-undo" aria-label="戻る"><svg class="icon-svg" aria-hidden="true"><use href="#g-undo"/></svg></button>
  <button class="icon-btn" id="btn-restart" aria-label="やり直す"><svg class="icon-svg" aria-hidden="true"><use href="#g-restart"/></svg></button>
</div>
```

- [ ] **Step 4: `style.css` に共通 SVG クラス、modeボタン補正**

`style.css` の `.icon-btn` 定義（331-341 付近）の直後に追加：

```css
.icon-svg {
  width: 22px;
  height: 22px;
  color: currentColor;
  display: block;
  margin: auto;
}
.play-actions .icon-svg { width: 18px; height: 18px; }
.mode-btn .icon-svg { width: 18px; height: 18px; margin: 0 auto; }
```

`style.css:513-526` の `.mode-btn` を：

```css
.mode-btn {
  background: transparent;
  border: none;
  color: var(--ink-soft);
  padding: 7px 12px;
  min-width: 44px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  cursor: pointer;
  border-right: 1px solid var(--ink-faint);
  transition: background var(--motion-fast), color var(--motion-fast);
}
.mode-btn:last-child { border-right: none; }
.mode-btn.active {
  background: var(--ink);
  color: var(--papyrus);
}
```

- [ ] **Step 5: プレイタイトルを「ラベル · NxN」形式に**

`app.js` の `state` オブジェクト（`app.js:4-33`）末尾の `cellFit: 32,` の前に追加：

```javascript
  artworkLabel: "下絵",
```

`app.js:1086` の `function startNewGame()` の冒頭（`state.cleared = false;` がある場所、関数の先頭付近）に：

```javascript
  const playTitle = document.getElementById("play-title");
  if (playTitle) playTitle.textContent = `${state.artworkLabel} · ${state.size}×${state.size}`;
```

`generateFromKeyword(rawKeyword)` 関数（app.js:528 付近）でアイコン決定後に `state.artworkLabel = rawKeyword;` を追加。サンプル時のハンドラ（`app.js:633-`）と画像読み込み時には `state.artworkLabel = "下絵";` を設定。具体的な追加箇所：

`app.js:78` 付近の `state.sourceImage = img;` の直後に：

```javascript
      state.artworkLabel = "下絵";
```

`app.js:528-` の `generateFromKeyword` の中、`state.sourceImage = img;` を設定する箇所（同関数内）に：

```javascript
        state.artworkLabel = rawKeyword;
```

`app.js:633-664` の btn-sample ハンドラ内、`state.sourceImage = img;` の直後に：

```javascript
      state.artworkLabel = "サンプル";
```

- [ ] **Step 6: 構文チェックと UI テスト**

```bash
node --check app.js
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass（`#btn-zoom-out`、`#btn-zoom-in`、`#btn-undo`、`#btn-restart`、`#btn-help`、`#play-title`、`.mode-btn[data-mode]` のセレクタ維持）。

- [ ] **Step 7: commit**

```bash
git add index.html style.css app.js
git commit -m "feat(play): replace text icons with SVG and show artwork label"
```

---

## Task 7: プレイ画面 — bloom / shake / 長押しリングを app.js から発火

**Files:**
- Modify: `app.js:1323-1358` (applyAction), `app.js:1448-1452` (long press), `app.js:1085-1102` (startNewGame)

- [ ] **Step 1: applyAction に fx 発火を追加**

`app.js:1323-1358` の `applyAction` 関数全体を以下に置換：

```javascript
function applyAction(r, c, mode, options = {}) {
  if (state.cleared) return;
  const allowOverwrite = !!options.allowOverwrite;
  const forceSet = !!options.forceSet;
  const cur = state.player[r][c];
  let target = 0;
  if (mode === "fill") target = 1;
  else if (mode === "cross") target = 2;
  else if (mode === "erase") target = 0;

  if (cur !== 0 && target !== 0 && cur !== target && !allowOverwrite) {
    if (!options.silent) toast("上書きは長押し");
    return;
  }

  let next = forceSet ? target : target;
  if (!forceSet) {
    if (mode === "fill") next = (cur === 1) ? 0 : 1;
    else if (mode === "cross") next = (cur === 2) ? 0 : 2;
    else if (mode === "erase") next = 0;
  }
  if (next === cur) return;

  const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  let isMistake = false;

  // ミス検知（塗りモードで間違えた場合）
  if (mode === "fill" && next === 1 && state.solution[r][c] === 0) {
    state.mistakes++;
    mistakesEl.textContent = `誤 ${state.mistakes}`;
    isMistake = true;
    if (window.GlyphFx) {
      GlyphFx.shake(cellEl);
      GlyphFx.vibrate(20);
    }
    toast("ミス！");
  }

  state.history.push({ r, c, prev: cur });
  state.player[r][c] = next;
  paintCell(r, c);

  if (!isMistake && next === 1 && window.GlyphFx) {
    GlyphFx.bloom(cellEl);
    GlyphFx.vibrate(8);
  }

  updateHintCompletion();
  checkClear();
}
```

注意: `mistakesEl.textContent` の表示形式を `"ミス: N"` から `"誤 N"` に変えています（仕様書のリボンと整合）。`startNewGame` 内の初期化テキストも修正必要（次ステップ）。

- [ ] **Step 2: 長押しリングを発火**

`app.js:1448-1452` の `pressTimer = setTimeout(...)` ブロックを以下に置換：

```javascript
    let ringTickId = null;
    const pressStart = performance.now();
    const PRESS_DURATION = 600;
    if (window.GlyphFx) {
      const tick = () => {
        const elapsed = performance.now() - pressStart;
        const progress = elapsed / PRESS_DURATION;
        if (progress >= 1 || !pressed) {
          GlyphFx.longPressRing(pressed && pressed.el ? pressed.el : pressed, 0);
          return;
        }
        GlyphFx.longPressRing(pressed.el || pressed, progress);
        ringTickId = requestAnimationFrame(tick);
      };
      ringTickId = requestAnimationFrame(tick);
    }
    pressTimer = setTimeout(() => {
      didLongPress = true;
      if (ringTickId) cancelAnimationFrame(ringTickId);
      if (window.GlyphFx) GlyphFx.longPressRing(pressed.el || pressed, 0);
      startDrag(state.mode, pressed, { allowOverwrite: true });
      if (window.GlyphFx) GlyphFx.vibrate(20);
    }, PRESS_DURATION);
```

そして同じ関数内 `onEnd()` で長押し未満で離した場合のリングクリアを保証するため、`app.js:1475-1491` の `onEnd` 関数の冒頭を以下に：

```javascript
  function onEnd() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (window.GlyphFx && pressed) {
      GlyphFx.longPressRing(pressed.el || pressed, 0);
    }
    if (!dragging && pressed && !didLongPress) {
```

注意: `pressed` は `cellAtPoint` から返る要素そのものなので `.el` プロパティはない。`GlyphFx.longPressRing(pressed, 0)` で十分。上記コードの `pressed.el || pressed` は防御的記述。

- [ ] **Step 3: startNewGame の初期化テキストを修正**

`app.js:1085-1102` 付近、`function startNewGame()` 内の：

```javascript
  mistakesEl.textContent = "ミス: 0";
```

を：

```javascript
  mistakesEl.textContent = "誤 0";
```

- [ ] **Step 4: HTML 側の初期テキストも修正**

`index.html:147` の `<span id="mistakes">ミス: 0</span>` を `<span id="mistakes">誤 0</span>` に。

- [ ] **Step 5: 構文チェックと UI テスト**

```bash
node --check app.js
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass。

- [ ] **Step 6: ブラウザ実機確認（手動）**

`http://127.0.0.1:8123/` をブラウザで開き：
- サンプルで試す → 正しいセルをタップ → ink-bloom が一瞬広がる
- 誤ったセルをタップ → セルが赤縁取りでシェイク
- セルを長押し → 0.6 秒かけてリングが満ちる、その後ドラッグ開始

確認できれば次へ。

- [ ] **Step 7: commit**

```bash
git add app.js index.html
git commit -m "feat(play): wire bloom, shake, and long-press ring effects"
```

---

## Task 8: ヒント完成ストローク + 進捗リボン

**Files:**
- Modify: `app.js:1119-1222` (buildBoardDOM), `app.js` (`updateHintCompletion`)
- Modify: `index.html:142-148` (status-bar 領域、リボンに置換)
- Modify: `style.css` (リボン)

- [ ] **Step 1: `updateHintCompletion` の現在実装を特定**

```bash
grep -n "updateHintCompletion\|function updateHint" /root/picross/app.js
```

この関数内で `hintEl.classList.add("done")` 等を呼んでいる箇所を確認しておく（次ステップで参照）。

- [ ] **Step 2: ヒント完成時に inkLine 発火**

`updateHintCompletion` 関数内、ヒント要素に `done` クラスを付与している箇所の直後に以下を追加（既に `done` だった場合に重複発火しないようガード）：

```javascript
        if (!wasAlreadyDone && window.GlyphFx) {
          GlyphFx.inkLine(hintEl);
          GlyphFx.vibrate([0, 12, 30, 12]);
        }
```

具体的なコードは関数の現状による。`wasAlreadyDone` を直前で `const wasAlreadyDone = hintEl.classList.contains("done");` として捕捉し、その後 `done` クラスをトグルする。完成行・列を回転させる現状ロジックの中に同様にもう一箇所追加。

- [ ] **Step 3: status-bar を進捗リボンに置換**

`index.html:144-148` の `<div class="status-bar">...</div>` を：

```html
<div class="progress-ribbon">
  <div class="rib-cell rib-time">
    <svg class="rib-icon" aria-hidden="true"><use href="#g-hourglass"/></svg>
    <span id="timer">00:00</span>
  </div>
  <div class="rib-cell rib-progress">
    <span id="hint-progress">0 / 0</span>
    <small>帯</small>
  </div>
  <div class="rib-cell rib-mistakes">
    <svg class="rib-icon" aria-hidden="true"><use href="#g-cross"/></svg>
    <span id="mistakes">0</span>
  </div>
</div>
```

- [ ] **Step 4: リボン CSS を `style.css:720-731` の `.status-bar` 定義を置換**

```css
.progress-ribbon {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  padding: 9px 14px;
  background: var(--papyrus-2);
  border-top: 1px solid var(--ink-faint);
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
  color: var(--ink);
  letter-spacing: 0.06em;
  gap: 10px;
}
.rib-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.rib-progress { justify-content: center; }
.rib-mistakes { justify-content: flex-end; }
.rib-icon {
  width: 16px; height: 16px;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.rib-cell small {
  font-family: var(--mincho);
  font-size: .7rem;
  color: var(--ink-soft);
  letter-spacing: .2em;
}
```

- [ ] **Step 5: 進捗カウンタを更新する関数を `app.js` に追加**

`app.js:1115` 付近 `function maxRowHints()` の直前に：

```javascript
function updateHintProgress() {
  const total = (state.rowHints?.length || 0) + (state.colHints?.length || 0);
  if (!total) return;
  const done = document.querySelectorAll(".col-hint.done, .row-hint.done").length;
  const el = document.getElementById("hint-progress");
  if (el) el.textContent = `${done} / ${total}`;
}
```

`updateHintCompletion` の末尾に：

```javascript
  updateHintProgress();
```

`startNewGame` 内、`mistakesEl.textContent = "誤 0";` の直後に：

```javascript
  const hpEl = document.getElementById("hint-progress");
  if (hpEl) hpEl.textContent = `0 / ${state.size * 2}`;
```

- [ ] **Step 6: 構文チェックと UI テスト**

```bash
node --check app.js
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass（`#timer`, `#mistakes` セレクタ維持）。

- [ ] **Step 7: 手動確認**

サンプル → セルを正しく塗って行を完成 → ヒント数字に赤いインクストロークが左→右に走り、リボンの「N / 60 帯」が増える。

- [ ] **Step 8: commit**

```bash
git add index.html style.css app.js
git commit -m "feat(play): add hint-completion ink stroke and progress ribbon"
```

---

## Task 9: クリア画面 — 額装、カウントアップ、ペイントイン、砂塵、画像保存

**Files:**
- Modify: `index.html:153-169` (クリア画面 markup), `index.html` (砂塵コンテナ追加)
- Modify: `style.css` (clear-art-wrap 額装, dust)
- Modify: `app.js` (クリアフロー)

- [ ] **Step 1: クリア画面 markup を更新（保存ボタン + 砂塵コンテナ）**

`index.html:153-169` の `<section id="screen-clear">...</section>` を以下に置換：

```html
<section id="screen-clear" class="screen">
  <div class="clear-body">
    <h2><span class="clear-rule"></span>COMPLETE<span class="ja">完成</span><span class="clear-rule"></span></h2>
    <div class="clear-stats">
      <div><span class="stat-label">時間</span><span id="clear-time">--:--</span></div>
      <div><span class="stat-label">誤</span><span id="clear-mistakes">0</span></div>
      <div><span class="stat-label">寸法</span><span id="clear-size">--</span></div>
    </div>
    <div class="clear-art-wrap">
      <div class="clear-art-frame">
        <canvas id="clear-canvas"></canvas>
      </div>
    </div>
    <div class="clear-actions">
      <button class="btn btn-secondary" id="btn-replay">もう一度</button>
      <button class="btn btn-primary" id="btn-new">別の絵で</button>
      <button class="btn btn-ghost" id="btn-save"><svg class="btn-icon" aria-hidden="true"><use href="#g-download"/></svg><span>保存</span></button>
    </div>
  </div>
  <div class="dust-layer" id="clear-dust"></div>
</section>
```

- [ ] **Step 2: clear-art フレームと dust-layer の CSS**

`style.css:796-810` の `.clear-art-wrap` セクションを以下に置換：

```css
.clear-art-wrap {
  width: 80vw;
  max-width: 320px;
}
.clear-art-frame {
  background: var(--cell-bg);
  border: 1px solid var(--ink-soft);
  box-shadow:
    inset 0 0 0 4px var(--cell-bg),
    inset 0 0 0 5px var(--ink-faint),
    inset 0 0 0 8px var(--cell-bg),
    inset 0 0 0 9px var(--ink-soft);
  padding: 14px;
  width: 100%;
  aspect-ratio: 1 / 1;
  position: relative;
}
.clear-art-frame::before, .clear-art-frame::after {
  content: "";
  position: absolute;
  width: 8px; height: 8px;
  border: 1px solid var(--ink-soft);
  background: var(--papyrus);
}
.clear-art-frame::before { top: 4px; left: 4px; }
.clear-art-frame::after  { bottom: 4px; right: 4px; }

.dust-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.clear-rule {
  display: inline-block;
  width: 32px;
  height: 1px;
  background: var(--ink-soft);
  vertical-align: middle;
  margin: 0 12px;
}
.clear-actions { gap: 8px; flex-wrap: wrap; }
.clear-actions .btn { flex: 1; min-width: 100px; }
```

- [ ] **Step 3: 既存 `showClearScreen` 関数を演出付きに置換**

`app.js:1557-1579` の `function showClearScreen() { ... }` 全体を以下に置換。`state.elapsed` は **秒単位**（既存のフォーマット `Math.floor(state.elapsed / 60)` が分を返すことから確認済み）。

```javascript
function showClearScreen() {
  const N = state.size;
  const totalSec = state.elapsed;
  const clearTimeEl = document.getElementById("clear-time");
  const clearMistakesEl = document.getElementById("clear-mistakes");
  const clearSizeEl = document.getElementById("clear-size");
  if (clearSizeEl) clearSizeEl.textContent = `${N}×${N}`;

  // 額装キャンバスは初期空、後でプログレッシブ描画
  const cell = 16;
  clearCanvas.width = N * cell;
  clearCanvas.height = N * cell;
  const ctx = clearCanvas.getContext("2d");
  ctx.fillStyle = "#f1e7cf";
  ctx.fillRect(0, 0, clearCanvas.width, clearCanvas.height);

  showScreen("clear");

  // 行ごとにフェードインしながら描画（paint-in 演出）
  const reduce = window.GlyphFx && GlyphFx.isMotionReduced();
  const drawRow = (r) => {
    for (let c = 0; c < N; c++) {
      if (state.solution[r][c]) {
        ctx.fillStyle = "#2a1a0e";
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  };
  if (reduce) {
    for (let r = 0; r < N; r++) drawRow(r);
  } else {
    let r = 0;
    const rowDelay = Math.max(20, Math.floor(600 / N));
    const interval = setInterval(() => {
      drawRow(r++);
      if (r >= N) clearInterval(interval);
    }, rowDelay);
  }

  // 統計のカウントアップ
  if (window.GlyphFx) {
    GlyphFx.countUpTime(clearTimeEl, totalSec, 700);
    GlyphFx.countUp(clearMistakesEl, 0, state.mistakes, 400);
    const dustLayer = document.getElementById("clear-dust");
    GlyphFx.dust(dustLayer, 14);
    GlyphFx.vibrate([0, 30, 80, 30, 80, 100]);
  } else {
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    if (clearTimeEl) clearTimeEl.textContent = `${m}:${s}`;
    if (clearMistakesEl) clearMistakesEl.textContent = state.mistakes;
  }
}
```

注意: この置換で `clearCanvas` 変数は `app.js:1556` の既存定義をそのまま使う（`const clearCanvas = document.getElementById("clear-canvas");`）。

- [ ] **Step 4: 画像保存ボタンのハンドラを追加**

`app.js:1585` 付近、`btn-new` のハンドラの直後に：

```javascript
document.getElementById("btn-save").addEventListener("click", () => {
  const canvas = document.getElementById("clear-canvas");
  if (!canvas) return;
  canvas.toBlob(blob => {
    if (!blob) { toast("保存に失敗しました"); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glyph-${state.artworkLabel || "art"}-${state.size}x${state.size}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("保存しました");
  }, "image/png");
});
```

- [ ] **Step 5: 構文チェックと UI テスト**

```bash
node --check app.js
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass。

- [ ] **Step 6: 手動確認**

サンプル → 全セル正解で完成 → クリア画面に遷移し、額装フレーム表示・時間とミスがカウントアップ・砂塵が下から上に上昇・保存ボタンで PNG ダウンロード。

- [ ] **Step 7: commit**

```bash
git add index.html style.css app.js
git commit -m "feat(clear): add framed art, count-up stats, dust, and image save"
```

---

## Task 10: ヘルプモーダルに設定トグル追加（haptic / reduce-motion）

**Files:**
- Modify: `index.html:172-184` (modal markup)
- Modify: `style.css` (toggle row)
- Modify: `app.js` (load/save settings)

- [ ] **Step 1: モーダル markup に設定セクションを追加**

`index.html:172-184` の `<div id="help-modal">...</div>` を以下に置換：

```html
<div id="help-modal" class="modal">
  <div class="modal-card">
    <h3>遊び方</h3>
    <ul>
      <li><b>数字</b>は連続して塗るマスの数を表します</li>
      <li>同じ列・行で複数の数字は<b>1マス以上の空き</b>で区切られます</li>
      <li>「塗る」モードでマスをタップして塗りつぶし</li>
      <li>「印」モードで✕（塗らないマス）を付けられます</li>
      <li>すべての数字に合うように塗ればクリア！</li>
    </ul>
    <div class="settings-section">
      <h4>設定</h4>
      <label class="settings-row">
        <span>触覚フィードバック</span>
        <input type="checkbox" id="set-haptic" checked>
      </label>
      <label class="settings-row">
        <span>動きを抑える</span>
        <input type="checkbox" id="set-reduce-motion">
      </label>
    </div>
    <button class="btn btn-primary" id="btn-help-close">閉じる</button>
  </div>
</div>
```

- [ ] **Step 2: settings セクション CSS**

`style.css` の `.modal-card` 関連定義（841-856 付近）の後に追加：

```css
.settings-section {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--ink-faint);
}
.settings-section h4 {
  font-family: var(--mincho);
  font-size: .85rem;
  letter-spacing: .2em;
  color: var(--ink-soft);
  margin: 0 0 10px;
  font-weight: 500;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-family: var(--sans);
  font-size: .92rem;
  color: var(--ink);
  cursor: pointer;
}
```

- [ ] **Step 3: 設定の読み書き JS**

`app.js:1593` 付近、ヘルプモーダルハンドラ群の直後に追加：

```javascript
const SETTINGS_KEY = "glyph_settings";
function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function writeSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
function applySettingsToUI() {
  const s = readSettings();
  const haptic = s.haptic !== false;
  const reduce = s.reduceMotion === true;
  const hapticEl = document.getElementById("set-haptic");
  const reduceEl = document.getElementById("set-reduce-motion");
  if (hapticEl) hapticEl.checked = haptic;
  if (reduceEl) reduceEl.checked = reduce;
  document.documentElement.classList.toggle("reduce-motion", reduce || matchMedia("(prefers-reduced-motion: reduce)").matches);
}
document.getElementById("set-haptic").addEventListener("change", e => {
  const s = readSettings();
  s.haptic = e.target.checked;
  writeSettings(s);
});
document.getElementById("set-reduce-motion").addEventListener("change", e => {
  const s = readSettings();
  s.reduceMotion = e.target.checked;
  writeSettings(s);
  applySettingsToUI();
  if (window.GlyphFx) GlyphFx.reflectMotionSetting();
});
applySettingsToUI();
```

- [ ] **Step 4: `style.css` 末尾に手動 reduce-motion 上書きを追加**

```css
html.reduce-motion *, html.reduce-motion *::before, html.reduce-motion *::after {
  animation-duration: 1ms !important;
  transition-duration: 1ms !important;
}
```

- [ ] **Step 5: 構文チェックと UI テスト**

```bash
node --check app.js
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass（`#help-modal`, `#btn-help-close` セレクタ維持）。

- [ ] **Step 6: 手動確認**

ヘルプ `?` を開く → 設定セクションに 2 トグル → トグル切替えがリロード後も保持されること。

- [ ] **Step 7: commit**

```bash
git add index.html style.css app.js
git commit -m "feat(settings): haptic and reduce-motion toggles in help modal"
```

---

## Task 11: ローディング演出更新 + 最終確認 + push

**Files:**
- Modify: `index.html:187-190` (loading-overlay markup)
- Modify: `style.css:862-883` (spinner)
- Modify: `tests/ui-shots/` (再生成)

- [ ] **Step 1: ローディングを 3 重リング化**

`index.html:187-190` の `<div id="loading-overlay">...</div>` を以下に置換：

```html
<div id="loading-overlay" class="loading-overlay">
  <div class="ring-spinner">
    <div class="ring r1"></div>
    <div class="ring r2"></div>
    <div class="ring r3"></div>
    <div class="ring-center">刻</div>
  </div>
  <div id="loading-text">読み込み中</div>
</div>
```

- [ ] **Step 2: spinner CSS を置換**

`style.css:876-883` の `.spinner` と `@keyframes spin` を以下に置換（`.spinner` セレクタ自体は残してフォールバック）：

```css
.spinner, .ring-spinner {
  position: relative;
  width: 64px; height: 64px;
}
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  animation: spin linear infinite;
}
.ring.r1 { border-top-color: var(--ochre);    animation-duration: 1.4s; }
.ring.r2 { inset: 8px;  border-top-color: var(--lapis);    animation-duration: 1.0s; animation-direction: reverse; }
.ring.r3 { inset: 16px; border-top-color: var(--ink-faint); animation-duration: 0.7s; }
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mincho);
  font-size: 1.4rem;
  color: var(--ink-soft);
  opacity: .35;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 3: 構文チェックと UI テスト**

```bash
node --check app.js
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
npm run test:ui
kill $SERVER_PID
```

期待: 全 pass。

- [ ] **Step 4: スクリーンショット再生成**

```bash
python3 -m http.server 8123 &
SERVER_PID=$!
sleep 1
PICROSS_UI_SHOTS=1 npm run test:ui:shots
kill $SERVER_PID
```

`tests/ui-shots/*.png` が更新されていることを確認：

```bash
git status tests/ui-shots/
```

- [ ] **Step 5: 最終手動チェック**

ブラウザで `http://127.0.0.1:8123/` を開き、フルフロー：
1. ホーム → 「猫」チップ → アイコン取得 → 編集画面
2. パズルを作る → プレイ画面（タイトル「猫 · NxN」）
3. セル塗布で bloom 確認
4. 誤りで shake 確認
5. 行完成でストロークと進捗リボン更新を確認
6. 全完成でクリア画面 → 額装・砂塵・カウントアップ・保存ボタン
7. ヘルプ → 設定トグル動作

- [ ] **Step 6: commit**

```bash
git add index.html style.css tests/ui-shots/
git commit -m "feat: redesign loading spinner and refresh UI screenshots"
```

- [ ] **Step 7: push（自動デプロイ）**

```bash
git push origin main
```

その後 1〜2 分待ち：

```bash
gh api repos/cocabot/glyph/pages/builds/latest --jq '.status'
```

`built` を確認したらブラウザで https://cocabot.github.io/glyph/ を開いて本番動作確認。

---

## Verification Summary

各タスクで `npm run test:ui` が緑（既存セレクタ維持の保証）。Task 3 は新規 fx テストが緑。Task 11 で `tests/ui-shots/` を再生成して before/after をリポジトリに残す。最終的に main に push して GitHub Pages 自動デプロイが完了することで本番反映を確認。

## Out of Scope (この計画には含めない)

- PWA / manifest / Service Worker
- WCAG 厳格対応（コントラスト計測・キーボード網羅・スクリーンリーダー）
- キーワード履歴・お気に入り・本格設定画面
- 効果音
- 多言語化
- ダークモード

これらは仕様書 `docs/superpowers/specs/2026-05-04-uiux-product-quality-design.md` で明示されている対象外項目。

## Risks

- **Puppeteer テストの破壊**: HTML 構造を維持し、id/class は不変。各タスクで `npm run test:ui` を必ず通すことで早期検知。
- **CJK → SVG アイコンの可読性**: モード切替が一目でわからない場合、手動確認時に気付き次第 `aria-label` の見直しまたはラベル併記へフォールバック（plan に書き込まれてはいないが、Task 6 の Step 6 で発見可能）。
- **iOS の `navigator.vibrate` 未対応**: `GlyphFx.vibrate` 内で `if (navigator.vibrate)` ガード済み、未対応端末でエラー無し。
- **30×30 ボードでの bloom パフォーマンス**: bloom は CSS のみ・`transform`/`opacity` のみ・実セル数の限界 900 でも個別発火（同時発火は最大数十）なので実用上問題なし。
