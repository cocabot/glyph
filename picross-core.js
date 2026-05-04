(function (root) {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // 連続した1の長さの配列を生成。空線は [0]
  function lineHints(line) {
    const hints = [];
    let count = 0;
    for (const v of line) {
      if (v) count++;
      else if (count) { hints.push(count); count = 0; }
    }
    if (count) hints.push(count);
    if (hints.length === 0) hints.push(0);
    return hints;
  }

  // Otsu 大津の二値化しきい値（最大変動が連続する場合は中点を返す）
  function otsu(arr) {
    const hist = new Array(256).fill(0);
    for (const v of arr) hist[Math.round(v)]++;
    const total = arr.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0;
    let max = -1, firstIdx = 128, lastIdx = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (wB === 0) continue;
      const wF = total - wB; if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > max) { max = between; firstIdx = t; lastIdx = t; }
      else if (between === max) lastIdx = t;
    }
    return Math.round((firstIdx + lastIdx) / 2);
  }

  // 分離可能ボックスブラー (高解像度向け)
  function boxBlur(src, w, h, radius) {
    const tmp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const div = 2 * radius + 1;
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = -radius; x <= radius; x++) {
        sum += src[y * w + Math.max(0, Math.min(w - 1, x))];
      }
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = sum / div;
        const left = src[y * w + Math.max(0, x - radius)];
        const right = src[y * w + Math.min(w - 1, x + radius + 1)];
        sum += right - left;
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) {
        sum += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
      }
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / div;
        const top = tmp[Math.max(0, y - radius) * w + x];
        const bot = tmp[Math.min(h - 1, y + radius + 1) * w + x];
        sum += bot - top;
      }
    }
    return out;
  }

  // 小サイズ用 (NxN)
  function boxBlur2d(src, w, h, radius) {
    const out = new Float32Array(src.length);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        let sum = 0, n = 0;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < h && nc >= 0 && nc < w) {
              sum += src[nr * w + nc]; n++;
            }
          }
        }
        out[r * w + c] = sum / n;
      }
    }
    return out;
  }

  // Sobel エッジ強度
  function sobelEdge(src, w, h) {
    const out = new Float32Array(src.length);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const tl = src[i - w - 1], t = src[i - w], tr = src[i - w + 1];
        const l = src[i - 1], r = src[i + 1];
        const bl = src[i + w - 1], b = src[i + w], br = src[i + w + 1];
        const gx = -tl - 2 * l - bl + tr + 2 * r + br;
        const gy = -tl - 2 * t - tr + bl + 2 * b + br;
        out[i] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return out;
  }

  // 4近傍が全て反対色のセルを反転（孤立点・1pxの穴除去）
  function cleanupGrid(grid, N) {
    const next = grid.map(r => r.slice());
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let same = 0, total = 0;
        for (const [dy, dx] of dirs) {
          const nr = r + dy, nc = c + dx;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
            total++;
            if (grid[nr][nc] === grid[r][c]) same++;
          }
        }
        if (total > 0 && same === 0) next[r][c] = 1 - grid[r][c];
      }
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = next[r][c];
    return grid;
  }

  // 解とプレイヤー状態の一致判定（プレイヤー: 0=空, 1=塗, 2=印）
  function isSolved(player, solution) {
    const N = solution.length;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const want = solution[r][c];
        const got = player[r][c] === 1 ? 1 : 0;
        if (want !== got) return false;
      }
    }
    return true;
  }

  // ライン全体のヒントが指定リストと一致するか
  function lineHintsMatch(line, expectedHints) {
    const got = lineHints(line);
    if (got.length !== expectedHints.length) return false;
    for (let i = 0; i < got.length; i++) if (got[i] !== expectedHints[i]) return false;
    return true;
  }

  // グリッドから行と列のヒントを生成
  function buildHintsFromGrid(grid) {
    const N = grid.length;
    const rowHints = grid.map(r => lineHints(r));
    const colHints = [];
    for (let c = 0; c < N; c++) {
      const col = [];
      for (let r = 0; r < N; r++) col.push(grid[r][c]);
      colHints.push(lineHints(col));
    }
    return { rowHints, colHints };
  }

  const api = {
    clamp,
    lineHints,
    otsu,
    boxBlur,
    boxBlur2d,
    sobelEdge,
    cleanupGrid,
    isSolved,
    lineHintsMatch,
    buildHintsFromGrid,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
