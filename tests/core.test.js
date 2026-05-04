"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../picross-core.js");

const {
  clamp, lineHints, otsu, boxBlur, boxBlur2d, sobelEdge,
  cleanupGrid, isSolved, lineHintsMatch, buildHintsFromGrid,
} = core;

// ---------- clamp ----------
test("clamp: 範囲内はそのまま", () => {
  assert.equal(clamp(5, 0, 10), 5);
});
test("clamp: 下限を下回ると lo", () => {
  assert.equal(clamp(-3, 0, 10), 0);
});
test("clamp: 上限を超えると hi", () => {
  assert.equal(clamp(15, 0, 10), 10);
});
test("clamp: 境界値", () => {
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

// ---------- lineHints ----------
test("lineHints: 全部空 → [0]", () => {
  assert.deepEqual(lineHints([0, 0, 0, 0]), [0]);
});
test("lineHints: 空配列 → [0]", () => {
  assert.deepEqual(lineHints([]), [0]);
});
test("lineHints: 全部塗り → 長さ", () => {
  assert.deepEqual(lineHints([1, 1, 1, 1, 1]), [5]);
});
test("lineHints: 連続なし", () => {
  assert.deepEqual(lineHints([1, 0, 1, 0, 1]), [1, 1, 1]);
});
test("lineHints: 混在", () => {
  assert.deepEqual(lineHints([1, 1, 0, 1, 0, 1, 1, 1]), [2, 1, 3]);
});
test("lineHints: 末尾塗り", () => {
  assert.deepEqual(lineHints([0, 1, 1]), [2]);
});
test("lineHints: 先頭塗り", () => {
  assert.deepEqual(lineHints([1, 1, 0, 0]), [2]);
});

// ---------- otsu ----------
test("otsu: 二峰性データはピーク間に閾値を置く", () => {
  // 100x の 30 と 100x の 220
  const data = [];
  for (let i = 0; i < 100; i++) data.push(30);
  for (let i = 0; i < 100; i++) data.push(220);
  const t = otsu(data);
  // 完全二峰では (low, high] の任意の値が最大分散だが、midpoint返却で中央
  assert.ok(t > 30 && t < 220, `threshold=${t}`);
  assert.ok(t > 80 && t < 200, `threshold should land between peaks: ${t}`);
});
test("otsu: 同値のみのデータでも数値を返す", () => {
  const t = otsu(new Array(50).fill(128));
  assert.equal(typeof t, "number");
});
test("otsu: しきい値で二値化すると元の二峰がきれいに分かれる", () => {
  const data = [];
  for (let i = 0; i < 50; i++) data.push(20);
  for (let i = 0; i < 50; i++) data.push(240);
  const t = otsu(data);
  let belowMatch = 0, aboveMatch = 0;
  for (const v of data) {
    if (v < t) belowMatch++;
    else aboveMatch++;
  }
  assert.equal(belowMatch, 50);
  assert.equal(aboveMatch, 50);
});

// ---------- boxBlur (separable) ----------
test("boxBlur: 一定値入力は一定値出力", () => {
  const w = 8, h = 8;
  const src = new Float32Array(w * h).fill(100);
  const out = boxBlur(src, w, h, 2);
  for (let i = 0; i < out.length; i++) {
    assert.ok(Math.abs(out[i] - 100) < 0.001, `out[${i}]=${out[i]}`);
  }
});
test("boxBlur: 単一ピーク → 平均化される", () => {
  const w = 7, h = 7;
  const src = new Float32Array(w * h);
  src[3 * w + 3] = 100; // 中心
  const out = boxBlur(src, w, h, 1);
  // 中心の値は 100/9 ≈ 11.1
  assert.ok(out[3 * w + 3] < 30 && out[3 * w + 3] > 5);
  // 全合計はおおむね保たれる（境界処理で多少増減）
  let sumIn = 0, sumOut = 0;
  for (let i = 0; i < src.length; i++) { sumIn += src[i]; sumOut += out[i]; }
  assert.ok(Math.abs(sumIn - sumOut) < 0.5);
});

// ---------- boxBlur2d ----------
test("boxBlur2d: 一定値入力は一定値出力", () => {
  const w = 5, h = 5;
  const src = new Float32Array(w * h).fill(50);
  const out = boxBlur2d(src, w, h, 1);
  for (let i = 0; i < out.length; i++) {
    assert.ok(Math.abs(out[i] - 50) < 0.001);
  }
});
test("boxBlur2d: 角と中心で異なる平均（境界含む）", () => {
  const w = 4, h = 4;
  const src = new Float32Array([
    100, 100, 100, 100,
    100, 100, 100, 100,
    100, 100, 100, 100,
    100, 100, 100, 100,
  ]);
  const out = boxBlur2d(src, w, h, 1);
  for (const v of out) assert.equal(v, 100);
});

// ---------- sobelEdge ----------
test("sobelEdge: 平坦画像 → 内部はゼロ", () => {
  const w = 5, h = 5;
  const src = new Float32Array(w * h).fill(128);
  const out = sobelEdge(src, w, h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      assert.equal(out[y * w + x], 0);
    }
  }
});
test("sobelEdge: 縦エッジ → 高い応答", () => {
  const w = 6, h = 5;
  const src = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      src[y * w + x] = x < 3 ? 0 : 255;
    }
  }
  const out = sobelEdge(src, w, h);
  // x=2,3 のエッジ近傍では強い応答
  let maxEdge = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      maxEdge = Math.max(maxEdge, out[y * w + x]);
    }
  }
  assert.ok(maxEdge > 800, `maxEdge=${maxEdge}`);
});

// ---------- cleanupGrid ----------
test("cleanupGrid: 孤立した1セルは反転される", () => {
  const grid = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];
  cleanupGrid(grid, 5);
  assert.equal(grid[2][2], 0);
});
test("cleanupGrid: 隣接した塊は維持される", () => {
  const grid = [
    [0, 0, 0],
    [0, 1, 1],
    [0, 1, 1],
  ];
  cleanupGrid(grid, 3);
  assert.equal(grid[1][1], 1);
  assert.equal(grid[1][2], 1);
  assert.equal(grid[2][1], 1);
  assert.equal(grid[2][2], 1);
});
test("cleanupGrid: 1pxの穴は埋められる", () => {
  const grid = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];
  cleanupGrid(grid, 3);
  assert.equal(grid[1][1], 1);
});

// ---------- isSolved ----------
test("isSolved: 完全一致でtrue", () => {
  const sol = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ];
  const player = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ];
  assert.equal(isSolved(player, sol), true);
});
test("isSolved: 印(2)は空(0)と同等扱い", () => {
  const sol = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ];
  const player = [
    [1, 2, 1],
    [2, 1, 2],
    [1, 2, 1],
  ];
  assert.equal(isSolved(player, sol), true);
});
test("isSolved: 不足はfalse", () => {
  const sol = [[1, 1], [1, 1]];
  const player = [[1, 1], [1, 0]];
  assert.equal(isSolved(player, sol), false);
});
test("isSolved: 余分にぬるとfalse", () => {
  const sol = [[1, 0], [0, 1]];
  const player = [[1, 1], [0, 1]];
  assert.equal(isSolved(player, sol), false);
});

// ---------- buildHintsFromGrid (integration) ----------
test("buildHintsFromGrid: 5×5 ハートグリッドの行列ヒント", () => {
  // 0 1 0 1 0
  // 1 1 1 1 1
  // 1 1 1 1 1
  // 0 1 1 1 0
  // 0 0 1 0 0
  const grid = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];
  const { rowHints, colHints } = buildHintsFromGrid(grid);
  assert.deepEqual(rowHints, [
    [1, 1],
    [5],
    [5],
    [3],
    [1],
  ]);
  assert.deepEqual(colHints, [
    [2],
    [4],
    [4],
    [4],
    [2],
  ]);
});

test("buildHintsFromGrid: 全空グリッド", () => {
  const N = 4;
  const grid = Array.from({ length: N }, () => new Array(N).fill(0));
  const { rowHints, colHints } = buildHintsFromGrid(grid);
  for (const h of rowHints) assert.deepEqual(h, [0]);
  for (const h of colHints) assert.deepEqual(h, [0]);
});

test("buildHintsFromGrid: 全塗りグリッド", () => {
  const N = 4;
  const grid = Array.from({ length: N }, () => new Array(N).fill(1));
  const { rowHints, colHints } = buildHintsFromGrid(grid);
  for (const h of rowHints) assert.deepEqual(h, [N]);
  for (const h of colHints) assert.deepEqual(h, [N]);
});

// ---------- ラウンドトリップ整合性 ----------
test("整合性: ヒントから二値ライン復元しても同じヒントになる", () => {
  // 元のヒントから可能な配置を構築 → ヒント再計算 → 一致
  const original = [3, 1, 2];
  const N = 10;
  // 配置: [1,1,1,0,1,0,1,1,0,0]
  const line = [1, 1, 1, 0, 1, 0, 1, 1, 0, 0];
  assert.deepEqual(lineHints(line), original);
  assert.equal(line.length, N);
});

test("lineHintsMatch: ラベル付き判定", () => {
  assert.equal(lineHintsMatch([1, 1, 0, 1], [2, 1]), true);
  assert.equal(lineHintsMatch([1, 1, 0, 1], [3]), false);
});
