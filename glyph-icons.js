"use strict";

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
