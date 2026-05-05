"use strict";

// ====== 状態 ======
const state = {
  sourceImage: null,
  size: 30,
  renderMode: "adaptive", // standard | adaptive | edge
  sharpness: 50,
  brightness: 0,
  contrast: 0,
  threshold: 128,
  autoThreshold: true,
  invert: false,
  cleanup: true,
  cropCenterX: 0.5,
  cropCenterY: 0.5,
  cropZoom: 1.0,
  solution: null,
  rowHints: null,
  colHints: null,
  player: null,
  history: [],
  startTime: 0,
  elapsed: 0,
  timerId: null,
  mistakes: 0,
  mode: "fill",
  cleared: false,
  cellSize: 32,
  cellZoom: null,
  cellZoomManual: false,
  artworkLabel: "下絵",
  cellFit: 32,
};

// ====== 画面切替 ======
const screens = {
  home: document.getElementById("screen-home"),
  edit: document.getElementById("screen-edit"),
  play: document.getElementById("screen-play"),
  clear: document.getElementById("screen-clear"),
};
function showScreen(name) {
  for (const [k, el] of Object.entries(screens)) {
    el.classList.toggle("active", k === name);
  }
}
document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.back));
});

// ====== トースト ======
const toastEl = document.getElementById("toast");
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

// ====== 画像読み込み ======
const fileInput = document.getElementById("file-input");
const cameraInput = document.getElementById("camera-input");
[fileInput, cameraInput].forEach(input => {
  input.addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    loadImageFromFile(f);
    input.value = "";
  });
});

function loadImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.sourceImage = img;
      state.artworkLabel = "下絵";
      showScreen("edit");
      requestAnimationFrame(updatePreview);
    };
    img.onerror = () => toast("画像を読み込めませんでした");
    img.src = reader.result;
  };
  reader.onerror = () => toast("ファイルの読み込みに失敗しました");
  reader.readAsDataURL(file);
}

// ====== キーワード→アイコン ======
// JP_TO_EN は picross-dict.js から PICROSS_JP_TO_EN として読み込まれる。
// 値は string または string[]（複数訳）。
const JP_TO_EN = (typeof PICROSS_JP_TO_EN !== "undefined") ? PICROSS_JP_TO_EN : {};

const ICON_PREFIX_PRIORITY = [
  "mdi", "icon-park-solid", "boxicons", "tabler", "ph", "lucide", "lucide-lab",
  "fa6-solid", "fa-solid", "material-symbols", "ic", "bx", "majesticons",
  "gravity-ui", "hugeicons", "game-icons", "streamline-plump", "streamline",
  "fluent-emoji-high-contrast", "noto", "twemoji", "fluent-emoji-flat", "openmoji"
];

const PREFERRED_ICONS = {
  cat: "mdi:cat",
  dog: "mdi:dog",
  bird: "mdi:bird",
  fish: "mdi:fish",
  whale: "icon-park-solid:whale",
  dolphin: "mdi:dolphin",
  shark: "mdi:shark",
  octopus: "boxicons:octopus-filled",
  rabbit: "mdi:rabbit",
  elephant: "mdi:elephant",
  tiger: "fluent-emoji-high-contrast:tiger-face",
  lion: "fluent-emoji-high-contrast:lion",
  monkey: "icon-park-solid:monkey",
  cow: "mdi:cow",
  pig: "mdi:pig",
  sheep: "mdi:sheep",
  fox: "fluent-emoji-high-contrast:fox",
  wolf: "fluent-emoji-high-contrast:wolf",
  bear: "icon-park-solid:bear",
  frog: "icon-park-solid:frog",
  snake: "mdi:snake",
  butterfly: "mdi:butterfly",
  bee: "mdi:bee",
  turtle: "mdi:turtle",
  penguin: "mdi:penguin",
  owl: "mdi:owl",
  eagle: "icon-park-solid:eagle",
  chicken: "icon-park-solid:chicken",
  duck: "mdi:duck",
  apple: "mdi:apple",
  orange: "mdi:fruit-citrus",
  banana: "icon-park-solid:banana",
  strawberry: "streamline-plump:strawberry-solid",
  watermelon: "mdi:fruit-watermelon",
  pineapple: "mdi:fruit-pineapple",
  lemon: "mdi:fruit-citrus",
  grapes: "mdi:fruit-grapes",
  cherry: "mdi:fruit-cherries",
  carrot: "mdi:carrot",
  mushroom: "mdi:mushroom",
  bread: "mdi:bread-slice",
  cake: "mdi:cake-variant",
  pizza: "mdi:pizza",
  hamburger: "mdi:hamburger",
  sushi: "mdi:food",
  tree: "mdi:tree",
  flower: "mdi:flower",
  sakura: "hugeicons:sakura",
  "cherry-blossom": "fluent-emoji-high-contrast:cherry-blossom",
  rose: "mdi:flower",
  sunflower: "mdi:flower-tulip",
  leaf: "mdi:leaf",
  mountain: "mdi:image-filter-hdr",
  sun: "mdi:weather-sunny",
  moon: "mdi:moon-waning-crescent",
  star: "mdi:star",
  cloud: "mdi:cloud",
  rain: "mdi:weather-rainy",
  snow: "mdi:snowflake",
  snowman: "mdi:snowman",
  fire: "mdi:fire",
  water: "mdi:water",
  rainbow: "mdi:rainbow",
  car: "mdi:car",
  bus: "mdi:bus",
  train: "mdi:train",
  airplane: "mdi:airplane",
  ship: "mdi:ferry",
  bicycle: "mdi:bicycle",
  motorcycle: "mdi:motorbike",
  rocket: "mdi:rocket",
  taxi: "mdi:taxi",
  house: "mdi:home",
  school: "mdi:school",
  hospital: "mdi:hospital-building",
  castle: "mdi:castle",
  heart: "mdi:heart",
  "music-note": "mdi:music-note",
  book: "mdi:book-open-page-variant",
  computer: "mdi:desktop-classic",
  phone: "mdi:phone",
  smartphone: "mdi:cellphone",
  camera: "mdi:camera",
  ball: "mdi:soccer",
  soccer: "mdi:soccer",
  baseball: "mdi:baseball",
  cup: "mdi:cup",
  key: "mdi:key",
  gift: "mdi:gift",
  balloon: "mdi:balloon",
  umbrella: "mdi:umbrella",
  hat: "mdi:hat-fedora",
  shoe: "mdi:shoe-sneaker",
  glasses: "mdi:glasses",
  clock: "mdi:clock",
  pencil: "mdi:pencil",
  scissors: "mdi:content-cut",
  chair: "mdi:chair-school",
  bed: "mdi:bed",
  robot: "mdi:robot",
  ghost: "mdi:ghost",
  alien: "mdi:alien",
  crown: "mdi:crown",
  gem: "mdi:diamond-stone",
  ribbon: "mdi:ribbon",
  arrow: "mdi:arrow-right",
  check: "mdi:check-bold",
  close: "mdi:close-thick",
};

function baseIconNameScore(icon, normalized) {
  const [prefix, name = ""] = icon.split(":");
  const prefixRank = ICON_PREFIX_PRIORITY.indexOf(prefix);
  const badNameParts = [
    "off", "outline", "circle", "box", "plus", "minus", "remove", "add",
    "alert", "check", "close", "variant", "multiple", "account", "settings",
    "left", "right", "up", "down", "small", "large", "logo", "brand", "branded"
  ];
  const badPrefixes = [
    "simple-icons", "logos", "devicon", "devicon-plain", "skill-icons",
    "arcticons", "token-branded"
  ];

  let score = prefixRank >= 0 ? (ICON_PREFIX_PRIORITY.length - prefixRank) * 4 : 0;
  if (badPrefixes.includes(prefix)) score -= 80;
  if (name === normalized) score += 120;
  if (name.startsWith(normalized + "-") || name.endsWith("-" + normalized)) score += 50;
  if (name.includes(normalized)) score += 20;
  if (name.split("-").includes("solid") || name.split("-").includes("filled") || name.split("-").includes("fill")) score += 14;
  if (prefix.includes("high-contrast")) score += 10;
  for (const part of badNameParts) {
    if (name.split("-").includes(part)) score -= 12;
  }
  if (name.length > normalized.length + 18) score -= 6;
  return score;
}

// SVG → 1024px 正方形フィット済み画像（白背景・黒インク・自動トリミング）
async function svgToFittedImage(svgText) {
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const svgImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const hr = 1536;
    const aspect = (svgImg.naturalWidth || svgImg.width || 1) / (svgImg.naturalHeight || svgImg.height || 1);
    const drawW = aspect >= 1 ? hr : Math.round(hr * aspect);
    const drawH = aspect >= 1 ? Math.round(hr / aspect) : hr;
    const c1 = document.createElement("canvas");
    c1.width = drawW; c1.height = drawH;
    const ctx1 = c1.getContext("2d");
    ctx1.drawImage(svgImg, 0, 0, drawW, drawH);

    const bbox = findContentBBox(ctx1, drawW, drawH);
    const src = bbox || { x: 0, y: 0, w: drawW, h: drawH };

    const finalSize = 1024;
    const pad = 32;
    const inner = finalSize - pad * 2;
    const scale = Math.min(inner / src.w, inner / src.h);
    const dw = src.w * scale;
    const dh = src.h * scale;
    const dx = (finalSize - dw) / 2;
    const dy = (finalSize - dh) / 2;

    const c = document.createElement("canvas");
    c.width = c.height = finalSize;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, finalSize, finalSize);
    ctx.drawImage(c1, src.x, src.y, src.w, src.h, dx, dy, dw, dh);

    return await new Promise((resolve, reject) => {
      const finalImg = new Image();
      finalImg.onload = () => resolve(finalImg);
      finalImg.onerror = reject;
      finalImg.src = c.toDataURL();
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// フィット済み画像 → 実際のピクロスグリッド（buildIconGridFromInk使用）
function imageToIconGrid(image, N) {
  const sample = N * 16;
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = sample;
  const tctx = tmp.getContext("2d");
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  tctx.fillStyle = "#fff";
  tctx.fillRect(0, 0, sample, sample);
  tctx.drawImage(image, 0, 0, sample, sample);

  const data = tctx.getImageData(0, 0, sample, sample).data;
  const cellInk = new Float32Array(N * N);
  const block = sample / N;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let inkSum = 0, count = 0;
      const y0 = (r * block) | 0, y1 = ((r + 1) * block) | 0;
      const x0 = (c * block) | 0, x1 = ((c + 1) * block) | 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * sample + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          inkSum += Math.max(0, 255 - lum) / 255;
          count++;
        }
      }
      cellInk[r * N + c] = inkSum / count;
    }
  }
  return buildIconGridFromInk(cellInk, N);
}

function gridComponentSizes(grid) {
  const N = grid.length;
  const seen = Array.from({ length: N }, () => new Array(N).fill(false));
  const sizes = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!grid[r][c] || seen[r][c]) continue;
      let size = 0;
      const stack = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [y, x] = stack.pop();
        size++;
        for (const [dy, dx] of dirs) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny >= N || nx < 0 || nx >= N || seen[ny][nx] || !grid[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push([ny, nx]);
        }
      }
      sizes.push(size);
    }
  }
  sizes.sort((a, b) => b - a);
  return sizes;
}

// グリッドのピクロス適性を絶対基準で判定 + 相対スコア
function gridQualityScore(grid) {
  if (!grid) return { pass: false, score: -Infinity, reason: "no-grid" };
  const N = grid.length;
  const total = N * N;

  let count = 0, minR = N, minC = N, maxR = -1, maxC = -1;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!grid[r][c]) continue;
      count++;
      if (r < minR) minR = r; if (c < minC) minC = c;
      if (r > maxR) maxR = r; if (c > maxC) maxC = c;
    }
  }
  if (count === 0 || count === total) return { pass: false, score: -Infinity, reason: "empty/full" };

  const ratio = count / total;
  const bboxW = maxC - minC + 1;
  const bboxH = maxR - minR + 1;
  const longCover = Math.max(bboxW, bboxH) / N;
  const shortCover = Math.min(bboxW, bboxH) / N;

  const sizes = gridComponentSizes(grid);
  const largest = sizes[0] || 0;
  const top2 = largest + (sizes[1] || 0);
  const compRatio = largest / count;
  const top2Ratio = top2 / count;

  let transitions = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 1; c < N; c++) if (grid[r][c] !== grid[r][c - 1]) transitions++;
  }
  for (let c = 0; c < N; c++) {
    for (let r = 1; r < N; r++) if (grid[r][c] !== grid[r - 1][c]) transitions++;
  }
  const transitionDensity = transitions / (2 * N * (N - 1));

  // 行の重複度（情報量チェック：単調すぎる絵を除外）
  const rowSet = new Set();
  const colSet = new Set();
  for (let r = 0; r < N; r++) rowSet.add(grid[r].join(""));
  for (let c = 0; c < N; c++) {
    const col = [];
    for (let r = 0; r < N; r++) col.push(grid[r][c]);
    colSet.add(col.join(""));
  }
  const rowVariety = rowSet.size / N;
  const colVariety = colSet.size / N;

  // ===== 絶対判定（落ちたら採用しない） =====
  if (ratio < 0.06) return { pass: false, score: -Infinity, reason: `塗り少 ${(ratio * 100).toFixed(0)}%` };
  if (ratio > 0.72) return { pass: false, score: -Infinity, reason: `塗り多 ${(ratio * 100).toFixed(0)}%` };
  if (longCover < 0.62) return { pass: false, score: -Infinity, reason: `主形小 ${longCover.toFixed(2)}` };
  if (shortCover < 0.38) return { pass: false, score: -Infinity, reason: `潰れ ${shortCover.toFixed(2)}` };
  if (compRatio < 0.30 && top2Ratio < 0.62) return { pass: false, score: -Infinity, reason: `分散 ${(compRatio * 100).toFixed(0)}%` };
  if (transitionDensity < 0.04) return { pass: false, score: -Infinity, reason: `単調 ${(transitionDensity * 100).toFixed(1)}%` };
  if (transitionDensity > 0.45) return { pass: false, score: -Infinity, reason: `荒 ${(transitionDensity * 100).toFixed(1)}%` };
  // 行/列の重複は対称形状で正常に発生するので、極端な単調さだけ弾く
  if (rowVariety < 0.25 && colVariety < 0.25) return { pass: false, score: -Infinity, reason: `単一 r${rowVariety.toFixed(2)}/c${colVariety.toFixed(2)}` };

  // ===== 相対スコア（高いほど良い） =====
  let s = 0;
  // 塗り率の理想は 0.30 前後
  s -= Math.abs(ratio - 0.32) * 90;
  // bbox被覆は大きいほど良い
  s += longCover * 50 + shortCover * 50;
  // 主成分が大きいほど良い（ばらけ過ぎない）
  s += compRatio * 35;
  // 適度な情報量（~0.16）
  s -= Math.abs(transitionDensity - 0.16) * 110;
  // 行・列のバリエーションが豊富なほど良い
  s += (rowVariety + colVariety) * 20;
  // アスペクト比はスクエアに近いほうが良い
  s -= Math.abs(bboxW - bboxH) / N * 12;

  return {
    pass: true,
    score: s,
    metrics: { ratio, longCover, shortCover, compRatio, transitionDensity, rowVariety, colVariety, bboxW, bboxH, count }
  };
}

// 候補群から、ピクロスとして実際に成立する最良アイコンを選ぶ。
// 全候補を実際のNxNグリッドに変換して品質を測る。失格は採用しない。
async function chooseIconCandidate(icons, query, N) {
  const normalized = (query || "").toLowerCase().trim();
  const preferred = PREFERRED_ICONS[normalized];

  const ranked = icons
    .map(icon => ({ icon, nameScore: baseIconNameScore(icon, normalized) }))
    .sort((a, b) => b.nameScore - a.nameScore);
  const candidates = [];
  if (preferred && icons.includes(preferred)) {
    candidates.push({ icon: preferred, nameScore: 200 });
  }
  for (const item of ranked) {
    if (!candidates.some(c => c.icon === item.icon)) candidates.push(item);
    if (candidates.length >= 12) break;
  }

  let bestPassing = null;
  let bestAny = null;
  for (const item of candidates) {
    try {
      const svgUrl = `https://api.iconify.design/${item.icon.replace(":", "/")}.svg?height=2048&color=%23000000`;
      const resp = await fetch(svgUrl);
      if (!resp.ok) continue;
      const svgText = await resp.text();
      const image = await svgToFittedImage(svgText);
      const grid = imageToIconGrid(image, N);
      const q = gridQualityScore(grid);
      // 名前一致度の寄与は控えめ。ハンドキュレーション済みPREFERREDが品質ゲートを
      // 通過した場合のみ強くboostする（人の目で代表性を確認済みのため）。
      const isPreferred = item.icon === preferred;
      const preferredBoost = (q.pass && isPreferred) ? 80 : 0;
      const total = (q.pass ? q.score : -Infinity) + item.nameScore * 0.18 + preferredBoost;
      const entry = { icon: item.icon, image, grid, total, q, nameScore: item.nameScore };
      if (q.pass && (!bestPassing || total > bestPassing.total)) bestPassing = entry;
      if (!bestAny || (q.pass ? q.score : -Infinity) > (bestAny.q.pass ? bestAny.q.score : -Infinity)) {
        bestAny = entry;
      }
    } catch (e) {
      console.warn("candidate skipped", item.icon, e);
    }
  }
  return { passing: bestPassing, fallback: bestAny };
}

const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
function showLoading(msg) { loadingText.textContent = msg || "読み込み中..."; loadingOverlay.classList.add("active"); }
function hideLoading() { loadingOverlay.classList.remove("active"); }

// 不透明・暗いピクセルのバウンディングボックスを検出
function findContentBBox(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 16) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // alpha が十分高く、かつそれなりに暗い箇所をコンテンツとみなす
      if (lum < 230) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// JP→英訳の候補を全て返す（多義語に対応）
function translateKeywordToEnglish(jp) {
  const direct = JP_TO_EN[jp];
  if (direct) {
    return Array.isArray(direct) ? direct.slice() : [direct];
  }
  // ASCII っぽい入力はそのまま
  if (/^[\x20-\x7e]+$/.test(jp)) return [jp.toLowerCase()];
  return [];
}

async function fetchIconifySearch(query) {
  const r = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=64`);
  if (!r.ok) return [];
  const data = await r.json();
  return data.icons || [];
}

async function generateFromKeyword(rawKeyword) {
  const keyword = (rawKeyword || "").trim();
  if (!keyword) { toast("ことばを入力してください"); return; }

  const enList = translateKeywordToEnglish(keyword);
  if (enList.length === 0) {
    toast(`「${keyword}」を英訳できませんでした`);
    return;
  }

  // 評価サイズはユーザー選択。デフォルトは 30 推奨。
  const evalN = state.size || 30;

  showLoading(`「${keyword}」から下絵を探しています`);
  try {
    // 複数訳すべてで検索 → 結果をユニオン → 一括で品質評価
    const seen = new Set();
    const allIcons = [];
    for (const en of enList) {
      const icons = await fetchIconifySearch(en.toLowerCase());
      for (const ic of icons) {
        if (!seen.has(ic)) { seen.add(ic); allIcons.push(ic); }
      }
      if (allIcons.length >= 96) break;
    }
    if (allIcons.length === 0) {
      hideLoading();
      toast(`「${keyword}」に合うアイコンが見つかりません`);
      return;
    }

    // 第一の英訳（最も代表的）を query としてランキングに使う
    const primaryQuery = enList[0].toLowerCase();
    const result = await chooseIconCandidate(allIcons, primaryQuery, evalN);

    if (!result.passing) {
      hideLoading();
      const reason = result.fallback ? `（${result.fallback.q.reason || "形状不適"}）` : "";
      toast(`「${keyword}」はグリフにしづらい絵柄でした${reason}`);
      console.info("rejected all candidates for", keyword, result);
      return;
    }

    const chosen = result.passing;
    state.sourceImage = chosen.image;
    state.artworkLabel = rawKeyword;
    state.cropCenterX = 0.5;
    state.cropCenterY = 0.5;
    state.cropZoom = 1.0;
    state.renderMode = "standard";
    state.sharpness = 0;
    state.brightness = 0;
    state.contrast = 0;
    state.threshold = 128;
    state.autoThreshold = false;
    state.invert = false;
    state.cleanup = false;
    state._sourceIsIcon = true;
    state._sourceIcon = chosen.icon;
    syncEditUIFromState();
    hideLoading();
    showScreen("edit");
    schedulePreview();
  } catch (e) {
    hideLoading();
    toast("通信エラーが発生しました");
    console.error(e);
  }
}

function syncEditUIFromState() {
  // サイズ
  document.querySelectorAll("#size-buttons button").forEach(b => {
    b.classList.toggle("active", parseInt(b.dataset.size, 10) === state.size);
  });
  // モード
  document.querySelectorAll("#mode-buttons button").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === state.renderMode);
  });
  document.getElementById("sharpness").value = state.sharpness;
  document.getElementById("sharpness-value").textContent = state.sharpness;
  document.getElementById("brightness").value = state.brightness;
  document.getElementById("brightness-value").textContent = state.brightness;
  document.getElementById("contrast").value = state.contrast;
  document.getElementById("contrast-value").textContent = state.contrast;
  document.getElementById("threshold").value = state.threshold;
  document.getElementById("threshold-value").textContent = state.autoThreshold ? "自動" : state.threshold;
  document.getElementById("zoom").value = Math.round(state.cropZoom * 100);
  document.getElementById("zoom-value").textContent = "×" + state.cropZoom.toFixed(1);
  document.getElementById("cleanup").checked = state.cleanup;
  document.getElementById("invert").checked = state.invert;
}

document.getElementById("keyword-form").addEventListener("submit", e => {
  e.preventDefault();
  const v = document.getElementById("keyword-input").value;
  generateFromKeyword(v);
});
document.querySelectorAll(".chip[data-kw]").forEach(chip => {
  chip.addEventListener("click", () => {
    const kw = chip.dataset.kw;
    if (window.GlyphFx) GlyphFx.chipBounce(chip);
    document.getElementById("keyword-input").value = kw;
    generateFromKeyword(kw);
  });
});

// サンプル
document.getElementById("btn-sample").addEventListener("click", () => {
  // シンプルな猫の絵をその場で作る
  const c = document.createElement("canvas");
  c.width = c.height = 200;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = "#333";
  // 顔
  ctx.beginPath();
  ctx.arc(100, 110, 60, 0, Math.PI * 2);
  ctx.fill();
  // 耳
  ctx.beginPath();
  ctx.moveTo(50, 80); ctx.lineTo(60, 30); ctx.lineTo(85, 65); ctx.closePath();
  ctx.moveTo(150, 80); ctx.lineTo(140, 30); ctx.lineTo(115, 65); ctx.closePath();
  ctx.fill();
  // 目
  ctx.fillStyle = "#fafafa";
  ctx.beginPath();
  ctx.arc(80, 100, 8, 0, Math.PI * 2);
  ctx.arc(120, 100, 8, 0, Math.PI * 2);
  ctx.fill();
  // ひげ
  ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(70, 130 + i * 5); ctx.lineTo(40, 125 + i * 8); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(130, 130 + i * 5); ctx.lineTo(160, 125 + i * 8); ctx.stroke();
  }
  const img = new Image();
  img.onload = () => {
    state.sourceImage = img;
    state.artworkLabel = "サンプル";
    showScreen("edit");
    requestAnimationFrame(updatePreview);
  };
  img.src = c.toDataURL();
});

// ====== 編集UI ======
const previewCanvas = document.getElementById("preview-canvas");
const sizeButtons = document.getElementById("size-buttons");
const brightnessInput = document.getElementById("brightness");
const contrastInput = document.getElementById("contrast");
const thresholdInput = document.getElementById("threshold");
const invertInput = document.getElementById("invert");
const brightnessValue = document.getElementById("brightness-value");
const contrastValue = document.getElementById("contrast-value");
const thresholdValue = document.getElementById("threshold-value");

sizeButtons.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    sizeButtons.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.size = parseInt(btn.dataset.size, 10);
    schedulePreview();
  });
});

const modeButtonsEl = document.getElementById("mode-buttons");
modeButtonsEl.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    modeButtonsEl.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.renderMode = btn.dataset.mode;
    schedulePreview();
  });
});

const sharpnessInput = document.getElementById("sharpness");
const sharpnessValue = document.getElementById("sharpness-value");
sharpnessInput.addEventListener("input", () => {
  state.sharpness = parseInt(sharpnessInput.value, 10);
  sharpnessValue.textContent = state.sharpness;
  schedulePreview();
});

brightnessInput.addEventListener("input", () => {
  state.brightness = parseInt(brightnessInput.value, 10);
  brightnessValue.textContent = state.brightness;
  schedulePreview();
});
contrastInput.addEventListener("input", () => {
  state.contrast = parseInt(contrastInput.value, 10);
  contrastValue.textContent = state.contrast;
  schedulePreview();
});
thresholdInput.addEventListener("input", () => {
  state.threshold = parseInt(thresholdInput.value, 10);
  state.autoThreshold = false;
  thresholdValue.textContent = state.threshold;
  schedulePreview();
});
document.getElementById("btn-auto-threshold").addEventListener("click", () => {
  state.autoThreshold = true;
  thresholdValue.textContent = "自動";
  schedulePreview();
});
invertInput.addEventListener("change", () => {
  state.invert = invertInput.checked;
  schedulePreview();
});

const cleanupInput = document.getElementById("cleanup");
cleanupInput.addEventListener("change", () => {
  state.cleanup = cleanupInput.checked;
  schedulePreview();
});

const zoomInput = document.getElementById("zoom");
const zoomValue = document.getElementById("zoom-value");
zoomInput.addEventListener("input", () => {
  state.cropZoom = parseInt(zoomInput.value, 10) / 100;
  zoomValue.textContent = "×" + state.cropZoom.toFixed(1);
  schedulePreview();
});

// プレビュータップで中心を移動
previewCanvas.addEventListener("click", e => {
  const rect = previewCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  // 現在の表示は cropCenterX,cropCenterY を中心にした 1/zoom の正方形
  // タップ位置 (x,y) を中心に移動
  const view = 1 / state.cropZoom;
  const newCx = state.cropCenterX + (x - 0.5) * view;
  const newCy = state.cropCenterY + (y - 0.5) * view;
  state.cropCenterX = Math.max(view / 2, Math.min(1 - view / 2, newCx));
  state.cropCenterY = Math.max(view / 2, Math.min(1 - view / 2, newCy));
  schedulePreview();
});

// プレビュー更新の遅延
let previewTimer = null;
function schedulePreview() {
  if (previewTimer) cancelAnimationFrame(previewTimer);
  previewTimer = requestAnimationFrame(updatePreview);
}

// ====== 画像→グリッド変換 ======
function gridStats(grid, N) {
  let count = 0;
  let minR = N, minC = N, maxR = -1, maxC = -1;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!grid[r][c]) continue;
      count++;
      minR = Math.min(minR, r); minC = Math.min(minC, c);
      maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
    }
  }
  return { count, minR, minC, maxR, maxC };
}

function largestFilledComponent(grid, N) {
  const seen = Array.from({ length: N }, () => new Array(N).fill(false));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let best = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!grid[r][c] || seen[r][c]) continue;
      let size = 0;
      const stack = [[r, c]];
      seen[r][c] = true;
      while (stack.length) {
        const [y, x] = stack.pop();
        size++;
        for (const [dy, dx] of dirs) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny >= N || nx < 0 || nx >= N || seen[ny][nx] || !grid[ny][nx]) continue;
          seen[ny][nx] = true;
          stack.push([ny, nx]);
        }
      }
      best = Math.max(best, size);
    }
  }
  return best;
}

function buildIconGridFromInk(ink, N) {
  function makeGrid(threshold) {
    const grid = [];
    for (let r = 0; r < N; r++) {
      const row = [];
      for (let c = 0; c < N; c++) row.push(ink[r * N + c] >= threshold ? 1 : 0);
      grid.push(row);
    }
    return grid;
  }

  function addSupportedThinDetails(grid, threshold) {
    const next = grid.map(row => row.slice());
    const weakThreshold = N >= 30 ? Math.max(0.24, threshold * 0.68) : Math.max(0.18, threshold * 0.58);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c] || ink[r * N + c] < weakThreshold) continue;
        const left = c > 0 && ink[r * N + c - 1] >= threshold;
        const right = c < N - 1 && ink[r * N + c + 1] >= threshold;
        const up = r > 0 && ink[(r - 1) * N + c] >= threshold;
        const down = r < N - 1 && ink[(r + 1) * N + c] >= threshold;
        if ((left && right) || (up && down)) next[r][c] = 1;
      }
    }
    return next;
  }

  const baseGrid = makeGrid(0.5);
  const baseStats = gridStats(baseGrid, N);
  const baseRatio = baseStats.count / (N * N);
  const targetRatio = baseRatio >= 0.08 && baseRatio <= 0.62
    ? Math.min(0.62, baseRatio * (N >= 30 ? 1.02 : 1.08))
    : 0.32;
  const thresholds = N >= 30
    ? [0.56, 0.52, 0.5, 0.48, 0.44, 0.4, 0.36]
    : [0.52, 0.48, 0.44, 0.4, 0.36, 0.32, 0.28];
  let bestGrid = null;
  let bestScore = Infinity;

  for (const threshold of thresholds) {
    let grid = makeGrid(threshold);
    grid = addSupportedThinDetails(grid, threshold);

    const stats = gridStats(grid, N);
    if (stats.count === 0 || stats.count === N * N) continue;

    const ratio = stats.count / (N * N);
    const bboxW = stats.maxC - stats.minC + 1;
    const bboxH = stats.maxR - stats.minR + 1;
    const bboxCover = Math.min(bboxW, bboxH) / N;
    const componentRatio = largestFilledComponent(grid, N) / stats.count;
    const ratioPenalty = ratio < 0.08 ? (0.08 - ratio) * 7 : ratio > 0.62 ? (ratio - 0.62) * 7 : 0;
    const score =
      ratioPenalty +
      Math.abs(ratio - targetRatio) * 2.4 +
      Math.max(0, 0.58 - bboxCover) * 0.8 +
      Math.max(0, 0.62 - componentRatio) * 1.5;

    if (score < bestScore) {
      bestScore = score;
      bestGrid = grid;
    }
  }

  return bestGrid;
}

function buildGrid() {
  const N = state.size;
  if (!state.sourceImage) return null;

  // 1) 高解像度サンプル描画（クロップ位置・ズーム反映）
  const sample = N * 16;
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = sample;
  const tctx = tmp.getContext("2d");
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  tctx.fillStyle = "#fff";
  tctx.fillRect(0, 0, sample, sample);

  const img = state.sourceImage;
  const sBase = Math.min(img.width, img.height);
  const sSize = sBase / state.cropZoom;
  // imageの正方形領域内で center を 0..1 で扱う
  const cropX0 = (img.width - sBase) / 2;
  const cropY0 = (img.height - sBase) / 2;
  const cx = cropX0 + sBase * state.cropCenterX;
  const cy = cropY0 + sBase * state.cropCenterY;
  let sx = cx - sSize / 2;
  let sy = cy - sSize / 2;
  sx = Math.max(0, Math.min(img.width - sSize, sx));
  sy = Math.max(0, Math.min(img.height - sSize, sy));
  tctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, sample, sample);

  const data = tctx.getImageData(0, 0, sample, sample).data;

  // 2) 高解像度の輝度バッファ
  const hiLum = new Float32Array(sample * sample);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    g += state.brightness;
    const k = (state.contrast + 100) / 100;
    g = (g - 128) * k + 128;
    hiLum[p] = Math.max(0, Math.min(255, g));
  }

  // 3) シャープニング（アンシャープマスク）
  if (state.sharpness > 0) {
    const blurred = boxBlur(hiLum, sample, sample, 2);
    const amount = state.sharpness / 30; // 0..3.3
    for (let i = 0; i < hiLum.length; i++) {
      hiLum[i] = clamp(hiLum[i] + amount * (hiLum[i] - blurred[i]), 0, 255);
    }
  }

  // 4) モード別の信号生成
  let signal = hiLum;
  if (state.renderMode === "edge") {
    const edges = sobelEdge(hiLum, sample, sample); // 0=平坦, 高=エッジ
    // エッジ部分を「暗く」して塗りで表現するため反転
    signal = new Float32Array(edges.length);
    for (let i = 0; i < edges.length; i++) signal[i] = 255 - Math.min(255, edges[i] * 1.5);
  }

  // 5) NxN にブロック平均で縮小
  const cellLum = new Float32Array(N * N);
  const cellInk = new Float32Array(N * N);
  const block = sample / N;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let sum = 0, inkSum = 0, count = 0;
      const y0 = (r * block) | 0, y1 = ((r + 1) * block) | 0;
      const x0 = (c * block) | 0, x1 = ((c + 1) * block) | 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const lum = signal[y * sample + x];
          sum += lum;
          inkSum += Math.max(0, 255 - lum) / 255;
          count++;
        }
      }
      cellLum[r * N + c] = sum / count;
      cellInk[r * N + c] = inkSum / count;
    }
  }

  // 6) 二値化
  let grid;
  if (state._sourceIsIcon && state.renderMode === "standard" && !state.invert) {
    grid = buildIconGridFromInk(cellInk, N);
    if (!grid) {
      const fallbackThreshold = 0.5;
      grid = [];
      for (let r = 0; r < N; r++) {
        const row = [];
        for (let c = 0; c < N; c++) row.push(cellInk[r * N + c] >= fallbackThreshold ? 1 : 0);
        grid.push(row);
      }
    }
  } else if (state.renderMode === "adaptive") {
    // ローカル平均を引いた値で判定（不均一な明るさに強い）
    const radius = Math.max(2, Math.round(N / 8));
    const local = boxBlur2d(cellLum, N, N, radius);
    const offset = state.threshold - 128; // しきい値スライダーをオフセットとして
    grid = [];
    for (let r = 0; r < N; r++) {
      const row = [];
      for (let c = 0; c < N; c++) {
        const v = cellLum[r * N + c];
        const m = local[r * N + c];
        let on = v < (m + offset - 8) ? 1 : 0; // -8 で軽く塗り過剰を抑制
        if (state.invert) on = on ? 0 : 1;
        row.push(on);
      }
      grid.push(row);
    }
  } else {
    let thr = state.autoThreshold ? otsu(cellLum) : state.threshold;
    grid = [];
    for (let r = 0; r < N; r++) {
      const row = [];
      for (let c = 0; c < N; c++) {
        let on = cellLum[r * N + c] < thr ? 1 : 0;
        if (state.invert) on = on ? 0 : 1;
        row.push(on);
      }
      grid.push(row);
    }
  }

  // 7) ノイズ除去（写真向け。クリーンなアイコンでは細部を潰さない）
  if (state.cleanup && !state._sourceIsIcon) cleanupGrid(grid, N);

  return { grid };
}

// 純粋な数値処理 (clamp, lineHints, otsu, boxBlur, boxBlur2d, sobelEdge, cleanupGrid)
// は picross-core.js に切り出し済み。先に読み込まれてグローバルに登録される。

// プレビュー描画
function updatePreview() {
  if (!state.sourceImage) return;
  const built = buildGrid();
  if (!built) return;
  const N = state.size;
  const cell = 14;
  previewCanvas.width = N * cell;
  previewCanvas.height = N * cell;
  const ctx = previewCanvas.getContext("2d");
  ctx.fillStyle = "#f1e7cf"; // --cell-bg
  ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.fillStyle = "#2a1a0e"; // --cell-fill
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (built.grid[r][c]) {
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
  // グリッド線
  ctx.strokeStyle = "rgba(42, 26, 14, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= N; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, N * cell); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell); ctx.lineTo(N * cell, i * cell); ctx.stroke();
  }
  // 5刻みは濃く
  ctx.strokeStyle = "rgba(42, 26, 14, 0.45)";
  for (let i = 0; i <= N; i += 5) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, N * cell); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell); ctx.lineTo(N * cell, i * cell); ctx.stroke();
  }
}

// ====== パズル作成→プレイ画面 ======
document.getElementById("btn-create-puzzle").addEventListener("click", () => {
  const built = buildGrid();
  if (!built) return;

  // 全部空 or 全部塗りはNG
  let on = 0;
  built.grid.forEach(r => r.forEach(v => on += v));
  if (on === 0 || on === state.size * state.size) {
    toast("塗りつぶしのバランスを調整してください");
    return;
  }

  state.solution = built.grid;
  const N = state.size;
  state.rowHints = state.solution.map(r => lineHints(r));
  state.colHints = [];
  for (let c = 0; c < N; c++) {
    const col = [];
    for (let r = 0; r < N; r++) col.push(state.solution[r][c]);
    state.colHints.push(lineHints(col));
  }

  startNewGame();
  showScreen("play");
});

// ====== プレイ盤面構築 ======
const boardEl = document.getElementById("board");
const playTitle = document.getElementById("play-title");
const timerEl = document.getElementById("timer");
const mistakesEl = document.getElementById("mistakes");

function startNewGame() {
  const N = state.size;
  state.player = Array.from({ length: N }, () => new Array(N).fill(0));
  state.history = [];
  state.mistakes = 0;
  state.cleared = false;
  const playTitle = document.getElementById("play-title");
  if (playTitle) playTitle.textContent = `${state.artworkLabel} · ${state.size}×${state.size}`;
  state.startTime = Date.now();
  state.elapsed = 0;
  state.cellZoomManual = false;
  state.cellZoom = null;
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(updateTimer, 250);
  mistakesEl.textContent = "ミス: 0";
  buildBoardDOM();
  updateHintCompletion();
}

function updateTimer() {
  if (state.cleared) return;
  state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const m = Math.floor(state.elapsed / 60).toString().padStart(2, "0");
  const s = (state.elapsed % 60).toString().padStart(2, "0");
  timerEl.textContent = `${m}:${s}`;
}

function maxRowHints() {
  return Math.max(...state.rowHints.map(h => h.length));
}
function maxColHints() {
  return Math.max(...state.colHints.map(h => h.length));
}

function buildBoardDOM() {
  const N = state.size;
  const HR = maxRowHints();
  const HC = maxColHints();

  // 既定は viewport にフィット (スクロール不要)。+/- でユーザーが手動拡大可能。
  const wrap = document.querySelector(".board-wrap");
  // ボーダー分(行ヒント右2px + 盤面右1px = 3px、上下も同様)を差し引く
  const availW = (wrap.clientWidth || window.innerWidth) - 6;
  const availH = (wrap.clientHeight || window.innerHeight - 220) - 6;
  const fitW = Math.floor(availW / (N + HR));
  const fitH = Math.floor(availH / (N + HC));
  const fit = Math.max(10, Math.min(fitW, fitH)); // 絶対最低 10px
  let sz;
  if (state.cellZoomManual && state.cellZoom) {
    sz = state.cellZoom;
  } else {
    sz = fit;
    state.cellZoom = fit;
  }
  state.cellSize = sz;
  state.cellFit = fit;

  document.documentElement.style.setProperty("--cell-size", sz + "px");
  document.documentElement.style.setProperty("--hr", HR);
  document.documentElement.style.setProperty("--hc", HC);
  document.documentElement.style.setProperty("--n", N);

  boardEl.innerHTML = "";

  // 1) 角
  const corner = document.createElement("div");
  corner.className = "bd-corner";
  boardEl.appendChild(corner);

  // 2) 列ヒント
  const colHints = document.createElement("div");
  colHints.className = "bd-col-hints";
  for (let c = 0; c < N; c++) {
    const ch = document.createElement("div");
    ch.className = "col-hint";
    ch.dataset.col = c;
    if ((c + 1) % 5 === 0 && c !== N - 1) ch.classList.add("thick-right");
    state.colHints[c].forEach(n => {
      const sp = document.createElement("span");
      sp.textContent = n;
      ch.appendChild(sp);
    });
    colHints.appendChild(ch);
  }
  boardEl.appendChild(colHints);

  // 3) 行ヒント
  const rowHints = document.createElement("div");
  rowHints.className = "bd-row-hints";
  for (let r = 0; r < N; r++) {
    const rh = document.createElement("div");
    rh.className = "row-hint";
    rh.dataset.row = r;
    if ((r + 1) % 5 === 0 && r !== N - 1) rh.classList.add("thick-bottom");
    state.rowHints[r].forEach(n => {
      const sp = document.createElement("span");
      sp.textContent = n;
      rh.appendChild(sp);
    });
    rowHints.appendChild(rh);
  }
  boardEl.appendChild(rowHints);

  // 4) 盤面
  const cellsEl = document.createElement("div");
  cellsEl.className = "bd-cells";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      if ((c + 1) % 5 === 0 && c !== N - 1) cell.classList.add("thick-right");
      if ((r + 1) % 5 === 0 && r !== N - 1) cell.classList.add("thick-bottom");
      cellsEl.appendChild(cell);
    }
  }

  // 5) 照準オーバーレイ（押下中だけ表示する十字ガイド）
  const aimRowStrip = document.createElement("div");
  aimRowStrip.className = "aim-strip-row";
  aimRowStrip.style.display = "none";
  const aimColStrip = document.createElement("div");
  aimColStrip.className = "aim-strip-col";
  aimColStrip.style.display = "none";
  const aimCellOverlay = document.createElement("div");
  aimCellOverlay.className = "aim-cell-overlay";
  aimCellOverlay.style.display = "none";
  cellsEl.appendChild(aimRowStrip);
  cellsEl.appendChild(aimColStrip);
  cellsEl.appendChild(aimCellOverlay);
  state.aimOverlay = { row: aimRowStrip, col: aimColStrip, cell: aimCellOverlay };
  state.aimR = -1;
  state.aimC = -1;

  boardEl.appendChild(cellsEl);

  attachBoardEvents();
  paintAllCells();
  updateHintCompletion();
}

function setAim(r, c) {
  const ov = state.aimOverlay;
  if (!ov) return;
  const N = state.size;
  // 旧ヒントのハイライト解除
  if (state.aimR >= 0) {
    const oldRh = boardEl.querySelector(`.row-hint[data-row="${state.aimR}"]`);
    if (oldRh) oldRh.classList.remove("aim");
  }
  if (state.aimC >= 0) {
    const oldCh = boardEl.querySelector(`.col-hint[data-col="${state.aimC}"]`);
    if (oldCh) oldCh.classList.remove("aim");
  }
  if (r < 0 || c < 0 || r >= N || c >= N) {
    ov.row.style.display = "none";
    ov.col.style.display = "none";
    ov.cell.style.display = "none";
    state.aimR = -1; state.aimC = -1;
    return;
  }
  state.aimR = r; state.aimC = c;
  const cellsEl = boardEl.querySelector(".bd-cells");
  if (cellsEl) {
    cellsEl.style.setProperty("--aim-r", r);
    cellsEl.style.setProperty("--aim-c", c);
  }
  ov.row.style.display = "";
  ov.col.style.display = "";
  ov.cell.style.display = "";
  const rh = boardEl.querySelector(`.row-hint[data-row="${r}"]`);
  const ch = boardEl.querySelector(`.col-hint[data-col="${c}"]`);
  if (rh) rh.classList.add("aim");
  if (ch) ch.classList.add("aim");
}

function clearAim() { setAim(-1, -1); }

function paintAllCells() {
  const N = state.size;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      paintCell(r, c);
    }
  }
}
function paintCell(r, c) {
  const cell = boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (!cell) return;
  cell.classList.remove("fill", "cross");
  const v = state.player[r][c];
  if (v === 1) cell.classList.add("fill");
  else if (v === 2) cell.classList.add("cross");
}

// ====== 操作 ======
const modeButtons = document.querySelectorAll(".mode-btn");
modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    modeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
  });
});

document.getElementById("btn-undo").addEventListener("click", undo);
document.getElementById("btn-restart").addEventListener("click", () => {
  if (!confirm("最初からやり直しますか？")) return;
  startNewGame();
});

document.getElementById("btn-zoom-in").addEventListener("click", () => {
  state.cellZoomManual = true;
  state.cellZoom = Math.min(80, (state.cellZoom || state.cellFit) + 8);
  buildBoardDOM();
});
document.getElementById("btn-zoom-out").addEventListener("click", () => {
  const next = (state.cellZoom || state.cellFit) - 8;
  if (next <= state.cellFit) {
    // フィット以下に下げない (代わりに自動フィットへ戻す)
    state.cellZoomManual = false;
    state.cellZoom = state.cellFit;
  } else {
    state.cellZoomManual = true;
    state.cellZoom = next;
  }
  buildBoardDOM();
});

function undo() {
  const last = state.history.pop();
  if (!last) return;
  state.player[last.r][last.c] = last.prev;
  paintCell(last.r, last.c);
  updateHintCompletion();
}

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

  // ミス検知（塗りモードで間違えた場合）
  if (mode === "fill" && next === 1 && state.solution[r][c] === 0) {
    state.mistakes++;
    mistakesEl.textContent = `ミス: ${state.mistakes}`;
    toast("ミス！");
  }

  state.history.push({ r, c, prev: cur });
  state.player[r][c] = next;
  paintCell(r, c);
  updateHintCompletion();
  checkClear();
}

let boardEventsAbort = null;

// タッチ/クリック処理 + ドラッグ + 長押し上書き
function attachBoardEvents() {
  if (boardEventsAbort) boardEventsAbort.abort();
  boardEventsAbort = new AbortController();
  const eventOptions = { signal: boardEventsAbort.signal };
  const touchOptions = { passive: false, signal: boardEventsAbort.signal };

  let pressed = null;        // {r,c,el}
  let dragging = false;
  let dragMode = null;
  let dragAllowsOverwrite = false;
  let dragAxis = null;       // "row" | "col"
  let pressTimer = null;
  let didLongPress = false;
  let lastCell = null;       // 最後に処理したセル
  let lastR = -1, lastC = -1;
  let originR = -1, originC = -1;
  let startX = 0, startY = 0;

  function cellAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (el.classList.contains("cell") && el.dataset.r !== undefined) return el;
    return null;
  }

  function lockedCellAtPoint(x, y) {
    if (!dragAxis) return cellAtPoint(x, y);
    const cellsEl = boardEl.querySelector(".bd-cells");
    if (!cellsEl) return null;
    const rect = cellsEl.getBoundingClientRect();
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
    const N = state.size;
    const cellW = rect.width / N;
    const cellH = rect.height / N;
    const r = dragAxis === "row" ? originR : Math.max(0, Math.min(N - 1, Math.floor((y - rect.top) / cellH)));
    const c = dragAxis === "col" ? originC : Math.max(0, Math.min(N - 1, Math.floor((x - rect.left) / cellW)));
    return boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  }

  function applyDragCell(r, c) {
    applyAction(r, c, dragMode, { allowOverwrite: dragAllowsOverwrite, forceSet: true, silent: true });
  }

  function applyDragLineTo(cell) {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (lastR < 0 || lastC < 0) {
      applyDragCell(r, c);
      lastR = r; lastC = c; lastCell = cell;
      return;
    }
    if (dragAxis === "row") {
      const step = c >= lastC ? 1 : -1;
      for (let x = lastC + step; step > 0 ? x <= c : x >= c; x += step) applyDragCell(originR, x);
    } else if (dragAxis === "col") {
      const step = r >= lastR ? 1 : -1;
      for (let y = lastR + step; step > 0 ? y <= r : y >= r; y += step) applyDragCell(y, originC);
    } else {
      applyDragCell(r, c);
    }
    lastR = r; lastC = c; lastCell = cell;
  }

  function startDrag(mode, originCell, options = {}) {
    dragging = true;
    dragMode = mode;
    dragAllowsOverwrite = !!options.allowOverwrite;
    const r = +originCell.dataset.r, c = +originCell.dataset.c;
    applyAction(r, c, mode, { allowOverwrite: dragAllowsOverwrite, forceSet: true });
    lastR = r; lastC = c; lastCell = originCell;
  }

  function onStart(x, y) {
    const cell = cellAtPoint(x, y);
    if (!cell) return;
    pressed = cell;
    didLongPress = false;
    dragging = false;
    dragAxis = null;
    dragAllowsOverwrite = false;
    lastCell = null;
    lastR = -1; lastC = -1;
    originR = +cell.dataset.r;
    originC = +cell.dataset.c;
    startX = x; startY = y;
    setAim(originR, originC);
    pressTimer = setTimeout(() => {
      didLongPress = true;
      startDrag(state.mode, pressed, { allowOverwrite: true });
      if (navigator.vibrate) navigator.vibrate(20);
    }, 600);
  }

  function onMove(x, y) {
    if (!pressed) return;
    const dx = x - startX, dy = y - startY;
    if (!dragging) {
      // ドラッグ閾値内：照準だけ動かしてコミットはしない（タップ目標補正）
      const hover = cellAtPoint(x, y);
      if (hover) setAim(+hover.dataset.r, +hover.dataset.c);
      if (Math.hypot(dx, dy) < 16) return;
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      dragAxis = Math.abs(dx) >= Math.abs(dy) ? "row" : "col";
      startDrag(state.mode, pressed);
    } else if (!dragAxis && Math.hypot(dx, dy) >= 16) {
      dragAxis = Math.abs(dx) >= Math.abs(dy) ? "row" : "col";
    }
    const cell = lockedCellAtPoint(x, y);
    if (cell) setAim(+cell.dataset.r, +cell.dataset.c);
    if (!cell || cell === lastCell) return;
    applyDragLineTo(cell);
  }

  function onEnd() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (!dragging && pressed && !didLongPress) {
      // 照準セルにコミット（指がずれていれば最後にいたセルへ）
      const r = state.aimR >= 0 ? state.aimR : +pressed.dataset.r;
      const c = state.aimC >= 0 ? state.aimC : +pressed.dataset.c;
      applyAction(r, c, state.mode);
    }
    clearAim();
    pressed = null;
    dragging = false;
    dragMode = null;
    dragAllowsOverwrite = false;
    dragAxis = null;
    lastCell = null;
    lastR = -1; lastC = -1;
  }

  boardEl.addEventListener("pointerdown", e => {
    const target = e.target.closest(".cell");
    if (!target || target.dataset.r === undefined) return;
    e.preventDefault();
    onStart(e.clientX, e.clientY);
  }, eventOptions);
  window.addEventListener("pointermove", e => {
    if (!pressed) return;
    onMove(e.clientX, e.clientY);
  }, eventOptions);
  window.addEventListener("pointerup", onEnd, eventOptions);
  window.addEventListener("pointercancel", onEnd, eventOptions);

  boardEl.addEventListener("touchstart", e => {
    if (e.target.closest(".cell")?.dataset.r !== undefined) e.preventDefault();
  }, touchOptions);
  boardEl.addEventListener("touchmove", e => {
    if (pressed) e.preventDefault();
  }, touchOptions);
}

// ====== ヒント完了表示 ======
function updateHintCompletion() {
  const N = state.size;
  // 行
  for (let r = 0; r < N; r++) {
    const filled = [];
    for (let c = 0; c < N; c++) filled.push(state.player[r][c] === 1 ? 1 : 0);
    const got = lineHints(filled);
    const want = state.rowHints[r];
    const ok = got.length === want.length && got.every((v, i) => v === want[i]) && want.join(",") !== "0";
    const el = boardEl.querySelector(`.row-hint[data-row="${r}"]`);
    if (el) el.classList.toggle("done", ok);
  }
  // 列
  for (let c = 0; c < N; c++) {
    const filled = [];
    for (let r = 0; r < N; r++) filled.push(state.player[r][c] === 1 ? 1 : 0);
    const got = lineHints(filled);
    const want = state.colHints[c];
    const ok = got.length === want.length && got.every((v, i) => v === want[i]) && want.join(",") !== "0";
    const el = boardEl.querySelector(`.col-hint[data-col="${c}"]`);
    if (el) el.classList.toggle("done", ok);
  }
}

// ====== クリア判定 ======
function checkClear() {
  const N = state.size;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const want = state.solution[r][c];
      const got = state.player[r][c] === 1 ? 1 : 0;
      if (want !== got) return false;
    }
  }
  state.cleared = true;
  clearInterval(state.timerId);
  setTimeout(showClearScreen, 350);
  return true;
}

// ====== クリア画面 ======
const clearCanvas = document.getElementById("clear-canvas");
function showClearScreen() {
  const N = state.size;
  const m = Math.floor(state.elapsed / 60).toString().padStart(2, "0");
  const s = (state.elapsed % 60).toString().padStart(2, "0");
  document.getElementById("clear-time").textContent = `${m}:${s}`;
  document.getElementById("clear-mistakes").textContent = state.mistakes;
  document.getElementById("clear-size").textContent = `${N}×${N}`;

  const cell = 16;
  clearCanvas.width = N * cell;
  clearCanvas.height = N * cell;
  const ctx = clearCanvas.getContext("2d");
  ctx.fillStyle = "#f1e7cf"; // --cell-bg
  ctx.fillRect(0, 0, clearCanvas.width, clearCanvas.height);
  ctx.fillStyle = "#2a1a0e"; // --cell-fill
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (state.solution[r][c]) ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  showScreen("clear");
}

document.getElementById("btn-replay").addEventListener("click", () => {
  startNewGame();
  showScreen("play");
});
document.getElementById("btn-new").addEventListener("click", () => {
  showScreen("home");
});

// ====== ヘルプ ======
const helpModal = document.getElementById("help-modal");
document.getElementById("btn-help").addEventListener("click", () => helpModal.classList.add("active"));
document.getElementById("btn-help-close").addEventListener("click", () => helpModal.classList.remove("active"));
helpModal.addEventListener("click", e => { if (e.target === helpModal) helpModal.classList.remove("active"); });

// ====== リサイズ対応 ======
window.addEventListener("resize", () => {
  if (screens.play.classList.contains("active") && state.solution) {
    buildBoardDOM();
  }
});

// 初期表示
showScreen("home");

// テスト用フック (window に state を公開)
if (typeof window !== "undefined") {
  window.__state = state;
}
