# GLYPH UI/UX 製品クオリティ仕上げ設計

**日付:** 2026-05-04
**対象:** GLYPH / グリフ — ピクロス web アプリ（`/root/picross/`、`https://cocabot.github.io/glyph/` 公開中）
**スコープ:** ビジュアル仕上げ + インタラクション／動き（2 軸）

## 背景と目的

現状の UI は「古代碑文・パピルス」テーマがすでに作り込まれている（Cinzel + 明朝、土黄／ラピス／テラコッタの古代色、彫り込み風ボタン、◆ ディバイダ等）。一方で：

- マイクロインタラクションが乏しく、セル塗布や行完成の手応えに欠ける
- 絵文字チップ（🐱 🌸 等）はシステムフォント依存で、テーマ統一感を損なう
- プレイ画面下部に空白が残り、進捗感が伝わらない
- クリア瞬間の演出が静的（フェード無し、額装感なし）
- アイコン・ラベルが CJK 文字直書きのものがあり、縦位置や行高がブレる

これらを **既存テーマを保ったまま** 製品クオリティに引き上げる。方向は「磨き上げ」であって作り直しではない。

## 方向性

「彫り込みパス」案 — テーマ維持、視覚 + インタラクション集中。スコープ外：PWA、WCAG 厳格対応、履歴／お気に入り、効果音、多言語、ダークモード。

## 設計

### 1. デザイン言語の更新

**カラートークン**
- `--ochre`：CTA・進捗・狙いガイドの主軸
- `--lapis`：副次（リンク・アクティブモード・フォーカス）
- `--terracotta`：誤・警告のみ
- インクは 2 段階（`--ink-deep` 見出し / `--ink` 本文）
- 紙地は 3 層（`--papyrus` 明 / `--papyrus-2` 中 / `--stone` 暗）
- グラデーション禁止、`border-radius` は基本 `2px`

**タイポグラフィ**
- 英字: Cinzel 600（見出し）/ 500（本文）
- 日本語: Hiragino Mincho ProN（装飾）+ Hiragino Kaku Gothic ProN（UI）
- スケール `clamp()` ベース 6 段（11/13/15/17/22/30）
- 見出しの `letter-spacing × text-indent` を光学的に揃える

**形・装飾**
- 影は彫り込みパターン専用：`inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.18)`
- ◆ ディバイダ → 篆刻印章風 SVG オーナメントに格上げ
- 外側浮きシャドウは原則禁止、モーダルのみ許可

**新トークン**
```css
--motion-fast: 120ms;
--motion-mid:  220ms;
--motion-slow: 420ms;
--ease:        cubic-bezier(.2,.6,.2,1);
--ornament:    var(--ink-soft);
```

`prefers-reduced-motion: reduce` で `--motion-*` を全て `1ms` に上書きしてアニメ無効化。

**アイコン**

`glyph-icons.js` を新規追加し、SVG `<symbol>` 群を `<body>` 先頭にインジェクト。`stroke-width: 1.5`、`stroke: currentColor`、`fill: none`、`24×24` viewBox。

- ホームチップ用 10 個: cat / dog / cherry / star / heart / car / apple / house / fish / flower
- UI 用 16 個: arrow-left / question / camera / image / dice / ink / cross / square-fill / square-empty / minus / plus / undo / restart / hourglass / checkmark / sparkle

合計 26 個、~5KB。

### 2. ホーム画面

**ヒーロー**
- 上下に細い縦罫 + ミニ印章（タイトルが「碑文の中央に刻まれている」印象）
- ヒーロー高を ~60px 圧縮し、主アクションを fold 内に収める

**キーワードカード**
- 入力フォーカス時：枠が `--lapis` に 200ms で反応 + 内側ハイライト
- 「刻む」押下：土黄が一段深まり `translateY(1px)`、`transform-origin: bottom`
- チップ：絵文字 → SVG（丸枠 + アイコン）。タップで `scale(.94 → 1.02 → 1.0)` 160ms 弾みアニメ

**ディバイダ**
- `─◆ または ◆─` → `─❲印章❳─` 様 SVG（中央に四角フレーム + 三本線の碑文模様）

**主アクション**
- 写真を選ぶ（土黄・主）／カメラで撮る（ラピス・副）／サンプルで試す（ゴースト・補）
- 各先頭に SVG アイコン（image / camera / dice）

**フッタ**
- 「タップで塗る ／ 長押しで×印」を字間広めの明朝薄インクで継続

### 3. クリア画面

**遷移演出**
- 最後のセル正解 → 0.4s ディレイ → ヒント帯ストロークが順に消滅 → インクで霞む → クリア画面 fade-in（合計 600ms）

**レイアウト**
- 見出し `COMPLETE / 完成` を碑文ヘッダ風（細罫 + 中央印章）で固定幅
- ステータス 3 グリッド：時間 700ms / ミス 400ms カウントアップ、寸法は静止
- 中央キャンバスは「額装」化：8px ink-soft フレーム + 4px papyrus マット + 角に篆刻 SVG
- ペイントイン演出：完成時に全セルを上から下に 0.05s × 行数で再演（過去の塗布も含めて完成形を披露）

**アクション**
- もう一度（副・ラピス）／別の絵で（主・土黄）／**画像を保存**（追加・ゴースト、`canvas.toBlob → a[download]`）

**砂塵パーティクル**
- クリア瞬間に 12〜16 個の 1〜2px 点が下から上に上昇（papyrus 色、CSS only）
- `prefers-reduced-motion: reduce` で無効化

### 4. プレイ画面

**トップバー**
- タイトルを寸法表示（`15 × 15`）から作品ラベル（`猫 · 15×15` / `下絵 · 15×15`）に
- `?` を SVG 化

**ツールバー**
- モード「塗 / 印 / 消」を CJK 文字 → SVG ピクトグラム（square-fill / cross / square-empty）
- アクション「− / + / ↶ / ⟳」も SVG 化、タップ領域 44×44 厳守
- 中央に進捗インジケータ（後述）

**進捗リボン**（旧空白の埋草、status-bar の上に新設）
- 左：時間 + 砂時計アイコン
- 中央：完成済みヒント帯数 / 全ヒント帯数（`12 / 30 帯`、行ヒント N + 列ヒント N の合計。進捗％ではなく具体数で「ネタバレ」感を抑える）
- 右：`誤 N` + cross アイコン

**マイクロインタラクション**

| 操作 | 演出 |
|---|---|
| セル塗布 | `--cell-fill` 即時切替 + ink-bloom 擬似要素（円が 0 → 1.4 倍に膨らみ 220ms で消える） |
| ドラッグ連続塗布 | 通過セルの bloom を 30ms ずらして発火（波紋） |
| 誤りセル | 既存の mistake 判定発火点で `--terracotta` 縁取りを 600ms シェイクで重ね、その後フェード消去 |
| 長押し → × | セル中央に同心円リングが満ちる（CSS conic-gradient で進捗表示） |
| 行・列完成 | 数字の上にインクストロークが左 → 右に 300ms で描かれる、その後 opacity 40% |
| 戻る `↶` | 直近変更が逆再生で 120ms フェード消去 |
| やり直す `⟳` | ボード全体 250ms fade-out → fade-in（確認モーダル不要） |
| ズーム `+/−` | `--cell-size` を 200ms transition、現在中心保持の scroll 補正 |
| 画面遷移 | 編集 → プレイ：インクが滲み出す → ボード現出（300ms オーバーレイ） |

**触覚フィードバック**（対応端末のみ、Android Chrome 等）
- 塗布／×：`navigator.vibrate(8)`
- 行・列完成：`navigator.vibrate([0, 12, 30, 12])`
- クリア：`navigator.vibrate([0, 30, 80, 30, 80, 100])`
- ヘルプモーダル下部のトグルで OFF 可、`localStorage` 保存

**ローディング**
- 単純 spinner → 同心円 3 重リング（ochre / lapis / ink-faint）が異速度で回転、中央に「刻」字を薄く滲ませる

**ヘルプモーダル**
- リスト箇条書き → 「アイコン + 短文」4 行カード化
- 末尾トグル：「触覚フィードバック」「動きを抑える」（後者は `prefers-reduced-motion` を手動上書き）
- 設定は `localStorage` の `glyph_settings` キーに保存

### 5. ファイル構成

```
index.html              … <link>/<script> v=21 → v=22、SVG <symbol> 定義インジェクト
style.css               … 全面更新（既存維持で先頭にトークン v2 ブロック追加）
app.js                  … fx 発火点を追記（ロジック変更最小）
picross-core.js         … 触らない
picross-dict.js         … 触らない
glyph-icons.js  (NEW)   … SVG <symbol> 文字列、起動時 <body> 先頭に挿入
glyph-fx.js     (NEW)   … bloom/shake/count-up/screen-ink 等の演出ユーティリティ
```

`glyph-fx.js` を分けることで `app.js`（既に 1608 行）の肥大を避ける。dual-export 不要（ブラウザ専用）。

### 6. CSS 構成順

冒頭にトークン v2 ブロックを追加し既存変数を再定義（既存スタイルを壊さない）。セクション順を整理：

1. トークン
2. アニメ keyframes（ink-bloom, shake, fade-ink, paint-in, dust-rise, ring-fill）
3. ベース／レイアウト
4. ボタン
5. ホーム
6. 編集
7. プレイ（ボード・ヒント・進捗リボン）
8. クリア（額装・パーティクル）
9. モーダル／ローディング／トースト
10. ランドスケープ／reduced-motion 上書き

### 7. app.js への手入れ（最小限）

- `applyAction(r, c, action)` 末尾で `fxBloom(cellEl)`
- 行・列完成判定が真になった瞬間に `fxLineComplete(rowOrColEl)`
- 誤りセル: 既存の `state.mistakes` カウント増加点で `fxShake(cellEl)` を発火（mistakes はすでに app.js で計上されている）
- `startNewGame` の最初に `fxScreenInk()`、`isSolved` で `fxClearReveal()`
- 長押しタイマーから `fxLongPressRing(cellEl, progress)` のフレーム呼び出し
- ヘルプモーダルにトグル 2 つ（haptic / reduce-motion）追加、`localStorage` 同期

`fx*` は `glyph-fx.js` 側でクラス付与・剥離を担当。タイマーは `setTimeout` ではなく `Animation` API/`transitionend` で完了検知。

### 8. キャッシュバスター

`index.html` の `?v=21` → `?v=22` に全リンク／スクリプトで統一。

### 9. 検証方法

1. **ローカル動作確認**：`python3 -m http.server 8123` で全画面手動操作。
2. **既存 UI テスト維持**：`npm run test:ui` の Puppeteer テストが既存セレクタを使うので、HTML 構造の不変化を要件とする（id/クラス維持）。新規 SVG はインライン挿入なのでセレクタを破壊しない。
3. **スクリーンショット差分**：`npm run test:ui:shots` で `tests/ui-shots/` を再生成し before/after をリポジトリに残す。
4. **本番反映**：`main` への push でデプロイ。`https://cocabot.github.io/glyph/` で確認。
5. **実機検証**：iPhone Safari（vibrate 非対応）と Android Chrome（vibrate 対応）の双方で操作感（bloom / 長押しリング / haptic）を確認。

### 10. 工数見積もり

- デザイン言語・トークン整理：CSS 200〜300 行追加
- ホーム & クリア演出：CSS 150 行 + JS 60 行
- プレイ画面マイクロインタラクション：CSS 200 行 + JS 120 行
- アイコン SVG セット：新規 1 ファイル ~200 行
- 合計コミット数：5〜7（PR 1 本相当だが直接 main に push）

### 11. コミット戦略

順序: ① トークン v2 → ② SVG アイコンセット → ③ ホーム ④ プレイ ⑤ クリア ⑥ 仕上げとキャッシュバンプ。各コミットが意味のある単位で完結し、回帰しても遡れる。

## スコープ外（明示）

以下は今回の 2 軸（視覚 + 動き）から外れるので別タスク：

- PWA / manifest / Service Worker
- WCAG 厳格対応（コントラスト計測・キーボード網羅・スクリーンリーダー）
- キーワード履歴・お気に入り・本格設定画面（ヘルプ内トグル 2 つだけ実装）
- 効果音
- 多言語化
- ダークモード

## リスクと留意点

- **既存 Puppeteer テストの破壊**：HTML 構造を維持することで回避。新規セレクタが必要な要素はクラスを足すだけで既存セレクタを残す。
- **ペイントイン演出のパフォーマンス**：30×30 = 900 セルで `transform`/`opacity` 同時アニメは GPU レイヤを酷使する可能性。`will-change` を一時付与し終了後に剥離、`prefers-reduced-motion` で完全 OFF。
- **iOS Safari の vibrate 非対応**：機能フラグで分岐、未対応端末でエラーが出ないようガード。
- **長押しリングの conic-gradient**：iOS 13+/Chrome 69+ で動作、Picross の主ターゲット（モバイル現行ブラウザ）では問題なし。
- **CJK → SVG アイコン化**：モード切替・UI 操作の意味が一目でわかるかは要レビュー。実装後にユーザーが触って判断、わかりにくければラベル併記に戻すフォールバックを用意する。

## 検証サマリ

- ローカル目視 → UI テスト → スクショ更新 → 本番デプロイ → 実機確認
- before/after の `tests/ui-shots/` をリポジトリにコミットして履歴に残す
