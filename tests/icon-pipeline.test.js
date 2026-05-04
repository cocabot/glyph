"use strict";

// Iconify から実際にアイコンを取得し、app.js と同じパイプラインで NxN グリッドへ
// 変換した結果の品質をテストする。
//
// 実行: node --test tests/icon-pipeline.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const core = require("../picross-core.js");
const { cleanupGrid, buildHintsFromGrid } = core;

const DEBUG_DIR = path.join(__dirname, "debug-out");
const SAVE_DEBUG = process.env.PICROSS_DEBUG === "1";
if (SAVE_DEBUG && !fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR);

// ----- ユーティリティ -----

async function fetchSVG(prefix, name) {
  const url = `https://api.iconify.design/${prefix}/${name}.svg?height=1024&color=%23000000`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch failed: ${resp.status} for ${url}`);
  return await resp.text();
}

async function fetchIconSearch(query) {
  const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=64`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`search failed: ${resp.status} for ${url}`);
  const data = await resp.json();
  return data.icons || [];
}

const ICON_PREFIX_PRIORITY = [
  "mdi", "icon-park-solid", "boxicons", "tabler", "ph", "lucide", "lucide-lab",
  "fa6-solid", "fa-solid", "material-symbols", "ic", "bx", "majesticons",
  "gravity-ui", "hugeicons", "game-icons", "streamline-plump", "streamline",
  "fluent-emoji-high-contrast", "noto", "twemoji", "fluent-emoji-flat", "openmoji"
];

const PREFERRED_ICONS = {
  cat: "mdi:cat",
  dog: "mdi:dog",
  heart: "mdi:heart",
  star: "mdi:star",
  car: "mdi:car",
  house: "mdi:home",
  home: "mdi:home",
  apple: "mdi:apple",
  banana: "icon-park-solid:banana",
  strawberry: "streamline-plump:strawberry-solid",
  tree: "mdi:tree",
  fish: "mdi:fish",
  whale: "icon-park-solid:whale",
  dolphin: "mdi:dolphin",
  shark: "mdi:shark",
  octopus: "boxicons:octopus-filled",
  tiger: "fluent-emoji-high-contrast:tiger-face",
  lion: "fluent-emoji-high-contrast:lion",
  monkey: "icon-park-solid:monkey",
  fox: "fluent-emoji-high-contrast:fox",
  wolf: "fluent-emoji-high-contrast:wolf",
  bear: "icon-park-solid:bear",
  frog: "icon-park-solid:frog",
  flower: "mdi:flower",
  sakura: "hugeicons:sakura",
  "cherry-blossom": "fluent-emoji-high-contrast:cherry-blossom",
  bird: "mdi:bird",
  rabbit: "mdi:rabbit",
  butterfly: "mdi:butterfly",
  camera: "mdi:camera",
  airplane: "mdi:airplane",
  bicycle: "mdi:bicycle",
  umbrella: "mdi:umbrella",
  eagle: "icon-park-solid:eagle",
  chicken: "icon-park-solid:chicken",
  duck: "mdi:duck",
};

function selectIconCandidate(icons, query) {
  const normalized = (query || "").toLowerCase().trim();
  const preferred = PREFERRED_ICONS[normalized];
  if (preferred && icons.includes(preferred)) return preferred;

  const badNameParts = [
    "off", "outline", "circle", "box", "plus", "minus", "remove", "add",
    "alert", "check", "close", "variant", "multiple", "account", "settings",
    "left", "right", "up", "down", "small", "large", "logo", "brand", "branded"
  ];
  const badPrefixes = [
    "simple-icons", "logos", "devicon", "devicon-plain", "skill-icons",
    "arcticons", "token-branded"
  ];

  let best = null;
  let bestScore = -Infinity;
  for (const icon of icons) {
    const [prefix, name = ""] = icon.split(":");
    const prefixRank = ICON_PREFIX_PRIORITY.indexOf(prefix);
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
    if (score > bestScore) {
      bestScore = score;
      best = icon;
    }
  }
  return best || icons[0] || null;
}

// SVG → RGBA バッファ (白背景に黒のアイコン)
async function rasterizeSVG(svgString, size = 1024) {
  // 透明背景でレンダ → 後段でbbox検出
  const { data, info } = await sharp(Buffer.from(svgString), { density: 200 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// 不透明・暗いピクセルの bbox 検出
function findContentBBox({ data, w, h }) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 16) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
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

// 透明背景の RGBA を白背景に合成しつつ、bbox を中央にフィットさせた正方形 RGBA を返す
async function tightFitToSquare(rasterRGBA, bbox, finalSize = 1024, pad = 32) {
  const { data, w, h } = rasterRGBA;
  // bbox 部分だけ切り出す
  const cropBuf = Buffer.alloc(bbox.w * bbox.h * 4);
  for (let y = 0; y < bbox.h; y++) {
    for (let x = 0; x < bbox.w; x++) {
      const sIdx = ((bbox.y + y) * w + (bbox.x + x)) * 4;
      const dIdx = (y * bbox.w + x) * 4;
      cropBuf[dIdx]     = data[sIdx];
      cropBuf[dIdx + 1] = data[sIdx + 1];
      cropBuf[dIdx + 2] = data[sIdx + 2];
      cropBuf[dIdx + 3] = data[sIdx + 3];
    }
  }
  const inner = finalSize - pad * 2;
  const scale = Math.min(inner / bbox.w, inner / bbox.h);
  const dw = Math.round(bbox.w * scale);
  const dh = Math.round(bbox.h * scale);

  // 切り出し → リサイズ → 白に合成
  const resized = await sharp(cropBuf, { raw: { width: bbox.w, height: bbox.h, channels: 4 } })
    .resize(dw, dh)
    .raw()
    .toBuffer();

  // finalSize x finalSize 白キャンバスを作る
  const out = Buffer.alloc(finalSize * finalSize * 3);
  out.fill(255);
  const dx = Math.floor((finalSize - dw) / 2);
  const dy = Math.floor((finalSize - dh) / 2);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sIdx = (y * dw + x) * 4;
      const a = resized[sIdx + 3] / 255;
      const r = resized[sIdx], g = resized[sIdx + 1], b = resized[sIdx + 2];
      const dIdx = ((dy + y) * finalSize + (dx + x)) * 3;
      // alpha 合成 (背景白)
      out[dIdx]     = Math.round(r * a + 255 * (1 - a));
      out[dIdx + 1] = Math.round(g * a + 255 * (1 - a));
      out[dIdx + 2] = Math.round(b * a + 255 * (1 - a));
    }
  }
  return { data: out, w: finalSize, h: finalSize, channels: 3 };
}

// 白背景RGB を NxN の輝度・インク量へ縮小
function imageToCells(image, N) {
  const { data, w, h } = image;
  const cellLum = new Float32Array(N * N);
  const cellInk = new Float32Array(N * N);
  const blockX = w / N;
  const blockY = h / N;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let lumSum = 0, inkSum = 0, count = 0;
      const x0 = (c * blockX) | 0, x1 = ((c + 1) * blockX) | 0;
      const y0 = (r * blockY) | 0, y1 = ((r + 1) * blockY) | 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 3;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          lumSum += lum;
          inkSum += Math.max(0, 255 - lum) / 255;
          count++;
        }
      }
      cellLum[r * N + c] = lumSum / count;
      cellInk[r * N + c] = inkSum / count;
    }
  }
  return { cellLum, cellInk };
}

function gridFromInk(ink, N, threshold) {
  const grid = [];
  for (let r = 0; r < N; r++) {
    const row = [];
    for (let c = 0; c < N; c++) row.push(ink[r * N + c] >= threshold ? 1 : 0);
    grid.push(row);
  }
  return grid;
}

function addSupportedThinDetails(grid, ink, N, threshold) {
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

// app.js のアイコン専用パイプラインと同等
function imageToIconGrid(image, N) {
  const { cellInk } = imageToCells(image, N);
  const baseGrid = gridFromInk(cellInk, N, 0.5);
  const baseStats = filledBBox(baseGrid);
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
    let grid = gridFromInk(cellInk, N, threshold);
    grid = addSupportedThinDetails(grid, cellInk, N, threshold);

    const stats = filledBBox(grid);
    if (stats.count === 0 || stats.count === N * N) continue;

    const ratio = stats.count / (N * N);
    const bboxW = stats.maxX - stats.minX + 1;
    const bboxH = stats.maxY - stats.minY + 1;
    const bboxCover = Math.min(bboxW, bboxH) / N;
    const componentRatio = largestComponent(grid) / stats.count;
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

  return bestGrid || baseGrid;
}

function imageToReferenceGrid(image, N) {
  const { cellInk } = imageToCells(image, N);
  return gridFromInk(cellInk, N, 0.5);
}

// bbox of filled cells
function filledBBox(grid) {
  const N = grid.length;
  let minX = N, minY = N, maxX = -1, maxY = -1, count = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c]) {
        count++;
        if (c < minX) minX = c;
        if (c > maxX) maxX = c;
        if (r < minY) minY = r;
        if (r > maxY) maxY = r;
      }
    }
  }
  return { count, minX, minY, maxX, maxY };
}

// グリッド連結成分 (4近傍)
function largestComponent(grid) {
  return componentSizes(grid)[0] || 0;
}

function componentSizes(grid) {
  const N = grid.length;
  const visited = Array.from({ length: N }, () => new Array(N).fill(false));
  const sizes = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c] && !visited[r][c]) {
        let count = 0;
        const stack = [[r, c]];
        while (stack.length) {
          const [y, x] = stack.pop();
          if (y < 0 || y >= N || x < 0 || x >= N) continue;
          if (visited[y][x] || !grid[y][x]) continue;
          visited[y][x] = true;
          count++;
          stack.push([y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]);
        }
        sizes.push(count);
      }
    }
  }
  sizes.sort((a, b) => b - a);
  return sizes;
}

// グリッドを ASCII で可視化
function gridToAscii(grid) {
  return grid.map(row => row.map(v => v ? "█" : "·").join("")).join("\n");
}

// グリッドをPNGに保存（デバッグ用）
async function saveGridPng(grid, filepath) {
  const N = grid.length;
  const cell = 24;
  const size = N * cell;
  const buf = Buffer.alloc(size * size * 3);
  buf.fill(255);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!grid[r][c]) continue;
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const x = c * cell + dx;
          const y = r * cell + dy;
          const i = (y * size + x) * 3;
          buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0;
        }
      }
    }
  }
  await sharp(buf, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toFile(filepath);
}

// パイプライン全体を回す
async function generatePuzzle(prefix, name, N) {
  const svg = await fetchSVG(prefix, name);
  const raster = await rasterizeSVG(svg, 1024);
  const bbox = findContentBBox(raster);
  assert.ok(bbox, `bbox not found for ${prefix}:${name}`);
  const fitted = await tightFitToSquare(raster, bbox, 1024, 32);
  const grid = imageToIconGrid(fitted, N);
  const referenceGrid = imageToReferenceGrid(fitted, N);
  return { grid, referenceGrid, bbox };
}

// ----- 一般品質メトリクス -----

function assertQuality(grid, label) {
  const N = grid.length;
  const total = N * N;
  const fill = filledBBox(grid);
  const ratio = fill.count / total;

  // 1. 完全に空・完全に塗り、ではない
  assert.ok(fill.count > 0, `${label}: 塗りセルが0`);
  assert.ok(fill.count < total, `${label}: 全セルが塗り`);

  // 2. 妥当な塗り率 (5% - 80%)
  assert.ok(ratio >= 0.05, `${label}: 塗り率が低すぎる ${(ratio * 100).toFixed(1)}%`);
  assert.ok(ratio <= 0.80, `${label}: 塗り率が高すぎる ${(ratio * 100).toFixed(1)}%`);

  // 3. 自動トリミングが効き、主形状が十分な大きさで入っている
  const bboxW = fill.maxX - fill.minX + 1;
  const bboxH = fill.maxY - fill.minY + 1;
  const longSide = Math.max(bboxW, bboxH);
  const shortSide = Math.min(bboxW, bboxH);
  assert.ok(longSide >= N * 0.7, `${label}: 主形状が小さい (${bboxW}×${bboxH}/${N})`);
  assert.ok(shortSide >= N * 0.48, `${label}: 短辺が潰れすぎ (${bboxW}×${bboxH}/${N})`);

  // 4. 主成分群が支配的。蝶など左右に分かれる絵もあるため上位2成分も見る
  const sizes = componentSizes(grid);
  const largest = sizes[0] || 0;
  const topTwo = largest + (sizes[1] || 0);
  const compRatio = largest / fill.count;
  const topTwoRatio = topTwo / fill.count;
  assert.ok(compRatio >= 0.38 || topTwoRatio >= 0.72,
    `${label}: 主成分が小さい largest=${(compRatio * 100).toFixed(1)}% top2=${(topTwoRatio * 100).toFixed(1)}%`);

  // 5. ヒント生成が壊れない
  const { rowHints, colHints } = buildHintsFromGrid(grid);
  assert.equal(rowHints.length, N);
  assert.equal(colHints.length, N);
  for (const hs of [...rowHints, ...colHints]) {
    assert.ok(Array.isArray(hs) && hs.length > 0);
  }

  return { ratio, largest, bboxW, bboxH, compRatio };
}

function compareToReference(grid, referenceGrid, label) {
  const N = grid.length;
  let both = 0, gotOnly = 0, refOnly = 0, got = 0, ref = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c]) got++;
      if (referenceGrid[r][c]) ref++;
      if (grid[r][c] && referenceGrid[r][c]) both++;
      else if (grid[r][c]) gotOnly++;
      else if (referenceGrid[r][c]) refOnly++;
    }
  }

  const union = both + gotOnly + refOnly;
  const iou = both / Math.max(1, union);
  const precision = both / Math.max(1, got);
  const recall = both / Math.max(1, ref);
  const densityDrift = Math.abs(got - ref) / Math.max(1, ref);
  const extraRatio = gotOnly / Math.max(1, got);
  const missingRatio = refOnly / Math.max(1, ref);

  assert.ok(iou >= 0.82, `${label}: 元シルエットとのIoUが低い ${(iou * 100).toFixed(1)}%`);
  assert.ok(precision >= 0.86, `${label}: 余計な塗りが多い precision=${(precision * 100).toFixed(1)}%`);
  assert.ok(recall >= 0.84, `${label}: 元シルエットの欠落が多い recall=${(recall * 100).toFixed(1)}%`);
  assert.ok(densityDrift <= 0.22, `${label}: 塗り量が元シルエットからずれすぎ ${(densityDrift * 100).toFixed(1)}%`);

  return { iou, precision, recall, densityDrift, extraRatio, missingRatio };
}

function lineRunCount(line) {
  let runs = 0;
  let inRun = false;
  for (const v of line) {
    if (v && !inRun) {
      runs++;
      inRun = true;
    } else if (!v) {
      inRun = false;
    }
  }
  return runs;
}

function visualInformation(grid) {
  const N = grid.length;
  let transitions = 0;
  let rowRuns = 0;
  let colRuns = 0;
  const rows = new Set();
  const cols = new Set();
  for (let r = 0; r < N; r++) {
    rows.add(grid[r].join(""));
    rowRuns += lineRunCount(grid[r]);
    for (let c = 1; c < N; c++) if (grid[r][c] !== grid[r][c - 1]) transitions++;
  }
  for (let c = 0; c < N; c++) {
    const col = [];
    for (let r = 0; r < N; r++) {
      col.push(grid[r][c]);
      if (r > 0 && grid[r][c] !== grid[r - 1][c]) transitions++;
    }
    cols.add(col.join(""));
    colRuns += lineRunCount(col);
  }
  return {
    transitions,
    rowRuns,
    colRuns,
    totalRuns: rowRuns + colRuns,
    uniqueRows: rows.size,
    uniqueCols: cols.size,
  };
}

function assertDetailRetention(grid, referenceGrid, label) {
  const got = visualInformation(grid);
  const ref = visualInformation(referenceGrid);
  const transitionRetention = got.transitions / Math.max(1, ref.transitions);
  const runRetention = got.totalRuns / Math.max(1, ref.totalRuns);
  const uniqueRowRetention = got.uniqueRows / Math.max(1, ref.uniqueRows);
  const uniqueColRetention = got.uniqueCols / Math.max(1, ref.uniqueCols);

  assert.ok(transitionRetention >= 0.78,
    `${label}: 輪郭変化が少なすぎる ${(transitionRetention * 100).toFixed(1)}%`);
  assert.ok(transitionRetention <= 1.35,
    `${label}: 輪郭変化が増えすぎ ${(transitionRetention * 100).toFixed(1)}%`);
  assert.ok(runRetention >= 0.76,
    `${label}: 連続ブロック情報が落ちすぎ ${(runRetention * 100).toFixed(1)}%`);
  assert.ok(uniqueRowRetention >= 0.72,
    `${label}: 行方向の形状パターンが単純化しすぎ ${(uniqueRowRetention * 100).toFixed(1)}%`);
  assert.ok(uniqueColRetention >= 0.72,
    `${label}: 列方向の形状パターンが単純化しすぎ ${(uniqueColRetention * 100).toFixed(1)}%`);

  return { got, ref, transitionRetention, runRetention, uniqueRowRetention, uniqueColRetention };
}

function nearestNeighborResizeGrid(grid, targetN) {
  const N = grid.length;
  const out = [];
  for (let r = 0; r < targetN; r++) {
    const row = [];
    const sr = Math.min(N - 1, Math.floor((r + 0.5) * N / targetN));
    for (let c = 0; c < targetN; c++) {
      const sc = Math.min(N - 1, Math.floor((c + 0.5) * N / targetN));
      row.push(grid[sr][sc]);
    }
    out.push(row);
  }
  return out;
}

function assertRecommendedBeatsCoarse(coarseGrid, recommendedGrid, referenceGrid, label) {
  const N = referenceGrid.length;
  const coarseUpscaled = nearestNeighborResizeGrid(coarseGrid, N);
  const coarseSimilarity = compareSimilarityOnly(coarseUpscaled, referenceGrid);
  const recommendedSimilarity = compareSimilarityOnly(recommendedGrid, referenceGrid);
  assert.ok(
    recommendedSimilarity.iou >= coarseSimilarity.iou + 0.04,
    `${label}: おすすめ細かさが粗い盤面より十分改善していない coarse=${(coarseSimilarity.iou * 100).toFixed(1)}% recommended=${(recommendedSimilarity.iou * 100).toFixed(1)}%`
  );
}

function compareSimilarityOnly(grid, referenceGrid) {
  let both = 0, gotOnly = 0, refOnly = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (grid[r][c] && referenceGrid[r][c]) both++;
      else if (grid[r][c]) gotOnly++;
      else if (referenceGrid[r][c]) refOnly++;
    }
  }
  return { iou: both / Math.max(1, both + gotOnly + refOnly) };
}

// ----- 既知アイコンでのテスト（mdi優先で安定化） -----

const CASES = [
  { prefix: "mdi", name: "cat", label: "🐱 mdi:cat" },
  { prefix: "mdi", name: "dog", label: "🐶 mdi:dog" },
  { prefix: "mdi", name: "heart", label: "💗 mdi:heart" },
  { prefix: "mdi", name: "star", label: "⭐ mdi:star" },
  { prefix: "mdi", name: "car", label: "🚗 mdi:car" },
  { prefix: "mdi", name: "home", label: "🏠 mdi:home" },
  { prefix: "mdi", name: "apple", label: "🍎 mdi:apple" },
  { prefix: "mdi", name: "tree", label: "🌳 mdi:tree" },
  { prefix: "mdi", name: "fish", label: "🐟 mdi:fish" },
  { prefix: "mdi", name: "flower", label: "🌼 mdi:flower" },
  { prefix: "hugeicons", name: "sakura", label: "sakura hugeicons:sakura" },
  { prefix: "icon-park-solid", name: "banana", label: "banana icon-park-solid:banana" },
  { prefix: "streamline-plump", name: "strawberry-solid", label: "strawberry streamline-plump:strawberry-solid" },
];

const EXTRA_RECOGNIZABILITY_CASES = [
  { prefix: "mdi", name: "bird", label: "🐦 mdi:bird" },
  { prefix: "mdi", name: "rabbit", label: "🐰 mdi:rabbit" },
  { prefix: "mdi", name: "butterfly", label: "🦋 mdi:butterfly" },
  { prefix: "mdi", name: "camera", label: "📷 mdi:camera" },
  { prefix: "mdi", name: "airplane", label: "✈️ mdi:airplane" },
  { prefix: "mdi", name: "bicycle", label: "🚲 mdi:bicycle" },
  { prefix: "mdi", name: "umbrella", label: "☂️ mdi:umbrella" },
  { prefix: "icon-park-solid", name: "whale", label: "whale icon-park-solid:whale" },
  { prefix: "mdi", name: "dolphin", label: "dolphin mdi:dolphin" },
  { prefix: "mdi", name: "shark", label: "shark mdi:shark" },
  { prefix: "boxicons", name: "octopus-filled", label: "octopus boxicons:octopus-filled" },
  { prefix: "fluent-emoji-high-contrast", name: "tiger-face", label: "tiger fluent-emoji-high-contrast:tiger-face" },
  { prefix: "fluent-emoji-high-contrast", name: "lion", label: "lion fluent-emoji-high-contrast:lion" },
  { prefix: "icon-park-solid", name: "monkey", label: "monkey icon-park-solid:monkey" },
  { prefix: "fluent-emoji-high-contrast", name: "fox", label: "fox fluent-emoji-high-contrast:fox" },
  { prefix: "fluent-emoji-high-contrast", name: "wolf", label: "wolf fluent-emoji-high-contrast:wolf" },
  { prefix: "icon-park-solid", name: "bear", label: "bear icon-park-solid:bear" },
  { prefix: "icon-park-solid", name: "frog", label: "frog icon-park-solid:frog" },
];

const KEYWORD_SELECTION_CASES = [
  { query: "cat", expected: "mdi:cat" },
  { query: "dog", expected: "mdi:dog" },
  { query: "heart", expected: "mdi:heart" },
  { query: "star", expected: "mdi:star" },
  { query: "car", expected: "mdi:car" },
  { query: "apple", expected: "mdi:apple" },
  { query: "tree", expected: "mdi:tree" },
  { query: "fish", expected: "mdi:fish" },
  { query: "whale", expected: "icon-park-solid:whale" },
  { query: "dolphin", expected: "mdi:dolphin" },
  { query: "shark", expected: "mdi:shark" },
  { query: "octopus", expected: "boxicons:octopus-filled" },
  { query: "tiger", expected: "fluent-emoji-high-contrast:tiger-face" },
  { query: "lion", expected: "fluent-emoji-high-contrast:lion" },
  { query: "monkey", expected: "icon-park-solid:monkey" },
  { query: "fox", expected: "fluent-emoji-high-contrast:fox" },
  { query: "wolf", expected: "fluent-emoji-high-contrast:wolf" },
  { query: "bear", expected: "icon-park-solid:bear" },
  { query: "frog", expected: "icon-park-solid:frog" },
  { query: "flower", expected: "mdi:flower" },
  { query: "sakura", expected: "hugeicons:sakura" },
  { query: "cherry-blossom", expected: "fluent-emoji-high-contrast:cherry-blossom" },
  { query: "banana", expected: "icon-park-solid:banana" },
  { query: "strawberry", expected: "streamline-plump:strawberry-solid" },
  { query: "camera", expected: "mdi:camera" },
  { query: "airplane", expected: "mdi:airplane" },
  { query: "bicycle", expected: "mdi:bicycle" },
];

for (const { query, expected } of KEYWORD_SELECTION_CASES) {
  test(`keyword "${query}": 分かりやすい代表アイコンを選ぶ`, async () => {
    const icons = await fetchIconSearch(query);
    assert.ok(icons.includes(expected), `${query}: Iconify検索結果に ${expected} がない`);
    const chosen = selectIconCandidate(icons, query);
    assert.equal(chosen, expected);
  });
}

for (const { prefix, name, label } of CASES) {
  test(`${label} 20×20: 品質メトリクスを満たす`, async () => {
    const { grid, referenceGrid } = await generatePuzzle(prefix, name, 20);
    const m = assertQuality(grid, label);
    const s = compareToReference(grid, referenceGrid, label);
    if (SAVE_DEBUG) {
      await saveGridPng(grid, path.join(DEBUG_DIR, `${name}-20.png`));
    }
    console.log(`  ${label}: 塗り率 ${(m.ratio * 100).toFixed(1)}% / 主成分 ${m.largest}cells / bbox ${m.bboxW}×${m.bboxH} / IoU ${(s.iou * 100).toFixed(1)}%`);
  });
}

for (const { prefix, name, label } of CASES) {
  test(`${label} 30×30: おすすめ細かさで判別性を満たす`, async () => {
    const { grid, referenceGrid } = await generatePuzzle(prefix, name, 30);
    const m = assertQuality(grid, `${label}-30`);
    const s = compareToReference(grid, referenceGrid, `${label}-30`);
    const d = assertDetailRetention(grid, referenceGrid, `${label}-30`);
    if (SAVE_DEBUG) {
      await saveGridPng(grid, path.join(DEBUG_DIR, `${name}-30.png`));
    }
    console.log(`  ${label} 30: 塗り率 ${(m.ratio * 100).toFixed(1)}% / IoU ${(s.iou * 100).toFixed(1)}% / 輪郭 ${(d.transitionRetention * 100).toFixed(1)}%`);
  });
}

for (const { prefix, name, label } of EXTRA_RECOGNIZABILITY_CASES) {
  test(`${label} 30×30: 追加の判別性ケースを満たす`, async () => {
    const { grid, referenceGrid } = await generatePuzzle(prefix, name, 30);
    const m = assertQuality(grid, `${label}-30`);
    const s = compareToReference(grid, referenceGrid, `${label}-30`);
    const d = assertDetailRetention(grid, referenceGrid, `${label}-30`);
    if (SAVE_DEBUG) {
      await saveGridPng(grid, path.join(DEBUG_DIR, `${name}-30.png`));
    }
    console.log(`  ${label} 30: 塗り率 ${(m.ratio * 100).toFixed(1)}% / IoU ${(s.iou * 100).toFixed(1)}% / 輪郭 ${(d.transitionRetention * 100).toFixed(1)}%`);
  });
}

for (const { prefix, name, label } of CASES.filter(c => !["heart", "star"].includes(c.name))) {
  test(`${label}: 30×30は10×10より元絵に近い`, async () => {
    const coarse = await generatePuzzle(prefix, name, 10);
    const recommended = await generatePuzzle(prefix, name, 30);
    assertRecommendedBeatsCoarse(coarse.grid, recommended.grid, recommended.referenceGrid, label);
  });
}

test("品質チェック: 太りすぎたグリッドを検出する", async () => {
  const { referenceGrid } = await generatePuzzle("mdi", "cat", 20);
  const N = referenceGrid.length;
  const fat = referenceGrid.map(row => row.slice());
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!referenceGrid[r][c]) continue;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) fat[nr][nc] = 1;
      }
    }
  }
  assert.throws(
    () => compareToReference(fat, referenceGrid, "fat-cat"),
    /余計な塗りが多い|塗り量が元シルエットからずれすぎ|IoUが低い/
  );
});

test("品質チェック: 欠けすぎたグリッドを検出する", async () => {
  const { referenceGrid } = await generatePuzzle("mdi", "heart", 20);
  const N = referenceGrid.length;
  const sparse = referenceGrid.map((row, r) => row.map((v, c) => (v && (r + c) % 3 !== 0 ? 1 : 0)));
  assert.throws(
    () => compareToReference(sparse, referenceGrid, "sparse-heart"),
    /欠落が多い|塗り量が元シルエットからずれすぎ|IoUが低い/
  );
});

// ----- 形状特性テスト -----

test("💗 mdi:heart: 左右対称（許容差あり）", async () => {
  const { grid } = await generatePuzzle("mdi", "heart", 20);
  const N = grid.length;
  let diff = 0, total = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N / 2; c++) {
      const left = grid[r][c];
      const right = grid[r][N - 1 - c];
      if (left || right) total++;
      if (left !== right) diff++;
    }
  }
  const ratio = diff / Math.max(1, total);
  assert.ok(ratio < 0.20, `左右対称差 ${(ratio * 100).toFixed(1)}% (許容20%)`);
});

test("⭐ mdi:star: 上半分にも下半分にも塗りがある", async () => {
  const { grid } = await generatePuzzle("mdi", "star", 20);
  const N = grid.length;
  let upper = 0, lower = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c]) {
        if (r < N / 2) upper++;
        else lower++;
      }
    }
  }
  assert.ok(upper > 0, "上半分が空");
  assert.ok(lower > 0, "下半分が空");
});

test("🏠 mdi:home: 屋根（上半分）と壁（下半分）の両方が存在", async () => {
  const { grid } = await generatePuzzle("mdi", "home", 20);
  const N = grid.length;
  let upper = 0, lower = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c]) {
        if (r < N / 2) upper++;
        else lower++;
      }
    }
  }
  assert.ok(upper >= 5, `屋根領域に塗り不足 ${upper}`);
  assert.ok(lower >= 5, `壁領域に塗り不足 ${lower}`);
});

// ----- サイズ違いでも安定 -----

for (const N of [15, 25]) {
  test(`mdi:heart ${N}×${N}: 品質メトリクスを満たす`, async () => {
    const { grid } = await generatePuzzle("mdi", "heart", N);
    assertQuality(grid, `heart-${N}`);
  });
}

// ----- ASCII プレビュー出力 (1件) -----

test("💗 ASCIIプレビュー出力", async () => {
  const { grid } = await generatePuzzle("mdi", "heart", 20);
  console.log("\n💗 mdi:heart 20×20:");
  console.log(gridToAscii(grid));
});
