# CLAUDE.md — いぬねこ図鑑

このファイルは Claude Code（web / CLI）がこのリポジトリで作業するときの規約。
**毎セッションの最初にここを読む。過去に決めたことを再発明しない。**

## このアプリは何か

放置型のたまごっち風育成アプリ。**スマホを触っていない時間でペットが育つ**（デジタルデトックス。Forest のフォーク思想）。
犬・猫の図鑑を集める遊びが中核。広告ゼロ・登録不要。**基本無料＋¥500買い切りで全公式品種を解放**（フリーミアム。`docs/MONETIZATION.md` が正）。
延命・連れもどしの課金は永久になし（コレクション拡張のみ課金）。
- 締切: **プログラム完成 6/22**。ストア公開はその後
- 配信先: **Android (Google Play) のみ**。**iOSはやらない**（2026-10 ユーザー決定）
- リポジトリ: `kamomet999/dog_cat` ／ 開発ブランチ: `claude/bold-cerf-sy7uqt`

## 技術スタック（確定。むやみに変えない）

- **素のJS/CSS**（フレームワークなし）。`www/` がアプリ本体
- **Capacitor 8** でAndroidネイティブ化（appId `com.kamomet.inuneko`）
- **Codemagic** クラウドビルド（`codemagic.yaml`）。**ローカルにXcode/Android SDKは不要**
- アートは**手続き的SVG**（`www/js/art.js`）。後述のとおり現在は**プレースホルダ凍結中**

### Capacitor 6 → 8（2026-10 実施）

Google Play が **2026-08-31 から新規・更新ともに targetSdk 36 を必須化**したため、
targetSdk 34 の Capacitor 6 構成ではストアに出せなくなった。公式の `npx cap migrate` を
6→7→8 と段階実行して移行済み（直接 8 への移行はツールが拒否する）。

Android のビルド要件が上がっている。**下げないこと**:
- `minSdk 24` / `compileSdk・targetSdk 36`
- AGP 8.13.0 / Gradle wrapper 8.14.3
- **JDK 21**（`codemagic.yaml` の `java:` も 21。17 に戻すとビルドが落ちる）

検証済み（2026-10-23）: `npm test` 41/41、`npm run e2e` 26/26、
`./gradlew assembleDebug` 成功、APK の targetSdk が 36 であることを `aapt2` で確認。

`ios/` は Capacitor 8 へ移行済みの状態で残してあるが**未検証**。iOS を再開するなら
Xcode 26 以上と Apple Developer Program が要る。`codemagic.yaml` の `ios-release`
ワークフローも同様に未検証のまま残置。

### 通知の権限（Android）

`android/app/src/main/AndroidManifest.xml` で `SCHEDULE_EXACT_ALARM` を
`tools:node="remove"` により**意図的に外している**。@capacitor/local-notifications が
持ち込むが、Play 審査で用途申告を求められる一方、本アプリの通知は分単位の正確さを
必要としないため。権限が無いとプラグインは `setAndAllowWhileIdle`（おおよその時刻）に
自動フォールバックするので通知は届く。**復活させないこと。**

> 重要な前提（ユーザー決定）: **Macは無い**。だからCapacitor＋クラウドビルド構成。
> 「ネイティブSwiftUIに乗り換える」案はMac必須・Android断念・作り直し・締切断念を伴うため**却下済み**。
> 採用したのは動画事例の**開発手法**（規約固定＝このファイル／スナップショット検証ループ／ビルド自動化）のみ。

## ファイル構成

```
www/
  index.html              画面の骨格
  css/styles.css          全スタイル。配色トークンは :root（DESIGN.md §2 と一致させる）
  js/
    engine.js   ★中核ロジック。時間減衰・なつき度・成長・図鑑・永続化。VERSION=19
    ui.js        描画・イベント・メインループ。Date.now() はこの層からのみ注入
    breeds.js    品種データ（無料=犬猫各30／＋プレミアム）・RARITY・NATURES（性格）
    art.js       手続き的SVG生成（プレースホルダ）
    native.js    Capacitor連携（ローカル通知・haptics・復帰/退避検知）
tools/
  gen_icon.mjs            アプリアイコン生成（ゲーム内スプライトを合成。`node tools/gen_icon.mjs`）
tests/
  test_engine.js          Node の vm サンドボックスで engine.js を読む単体テスト
  visual/                 スナップショット検証ハーネス（後述）
docs/                     設計の「正」。GitHub Pages も兼ねる（index.html / privacy.html）
codemagic.yaml            CI（android-debug / android-release / ios-release）
```

## 設計の「正」（コードより先にこれらに従う）

- `docs/GAME_DESIGN.md` — **なつき度と家出**（ごはん＝スマホを置いた時間／さんぽ＝学習・運動。2つのおわかれ＝おうちを出ていく／旅に出る）
- `docs/DESIGN.md` — ブランド・配色・モーション・原則・**凍結前チェックリスト(§11)**
- `docs/art/CHARACTER_DESIGN.md` — アートの設計書（**§0: 現アートは仮。nanobananaで差し替え予定。docが正**）
- `docs/MARKETING.md` / `docs/store/` — マーケ分析・ストア掲載文・プライバシーポリシー
- `docs/MONETIZATION.md` — **課金モデル**（無料60種＝犬猫各30／¥500で全品種。延命・連れもどしの課金は永久になし）
- `docs/BREEDING_SPEC.md` — v1.1「おみあい」（ブリード）仕様

## 絶対に守る規約

### エンジン（engine.js）
- **`Date.now()` を直呼びしない**。すべて引数 `now(ms)` で注入（決定論＝テスト可能）。UI層(ui.js)だけが実時刻を注入する
- **状態はイミュータブル更新**（`{...s}` で新規生成）。既存stateを破壊変更しない
- セーブは **VERSION** 管理。スキーマを変えたら必ず `migrate()` に段階移行を追加し、`VERSION` を上げ、テスト期待値も更新する
- セーブキーは `inuneko_dex_save_v1`（キー名は変えない。versionフィールドで移行する）
- オフライン上限は2種: `MAX_OFFLINE=24h`（報酬）／`MAX_SIM=72h`（進行シミュレーション）

### デザイン原則（DESIGN.md より。UI文言・演出で必ず守る）
- **原則2「責めない」**: おわかれ（おうちを出ていく/家出）・失敗は穏やかなトーン。赤・警告アイコンを煽りに使わない。「途切れる」予告で惜しさを煽らない
- **「いのち」「死」の語・概念は使わない**（2026-10 決定）。スコアは **なつき度**（`current.bond`）、結末は **いなくなる（逃げる）**
- **課金での 連れもどし・延命は永久になし**（約束）。通知は「良い知らせ＋お世話のお願い」のみ
- **文字コントラストはWCAG AA(4.5:1)以上**。配色は `:root` のトークン経由（`--on-accent`/`--ink-soft`/`--coin-text` 等）。塗り専用色（`--coin`/`--bad`）を文字に使わない
- 最小フォント10px。アクセシビリティ: `prefers-reduced-motion` で環境アニメ停止／全ボタン `:focus-visible`

### アート（凍結中）
- 現在の手続き的SVGは**品質が不十分なため仮**。**作り込まない**。差し替えは画像生成(nanobanana)で `CHARACTER_DESIGN.md` を仕様書として行う
- アートを触るより**設計書(doc)を正として更新**する

## 開発ワークフロー

### テスト（必ず緑にしてからコミット）
```bash
npm test          # engine単体テスト（vmサンドボックス。依存不要・即時）
npm run e2e       # E2E（Playwrightで実ブラウザのユーザージャーニー19本・約40秒）
npm run e2e -- 巣立ち   # 名前の部分一致で絞り込み
```
スキーマ・定数を変えたらテスト期待値も同時に直す。テストが落ちたまま進めない。
UI・フローを変えたら `npm run e2e` も回す（tests/e2e/e2e.js にジャーニーを追加する）。

### スナップショット検証ループ（動画事例の核＝AIに画面を見せる）
```bash
npm run snap                 # 全シナリオを tests/visual/out/*.png に描画
npm run snap -- home food    # シナリオ名で絞り込み
```
シナリオは `tests/visual/scenarios.js` に追加する（state＋操作を宣言）。
描画後、出力PNGを Read して目視 → 直す、を回す。**コードだけで「できた」と言わず、必ず画面を見る。**

### git
- 開発は `claude/bold-cerf-sy7uqt`。**他ブランチへpushしない**
- コミット末尾に作業リンクを付ける。**PRはユーザーが明示的に頼んだ時だけ作る**
- pushは `git push -u origin claude/bold-cerf-sy7uqt`（失敗時のみ指数バックオフで最大4回）

## やることの優先順位（2026-06時点）
1. 凍結前チェックリスト(DESIGN.md §11) — **完了済み**
2. 課金フリーミアムの仕組み（無料60種（犬猫各30）／¥500で全品種・`MONETIZATION.md`）— **仕組み完成**。残=プレミアム品種データ拡充＋実機の課金プラグイン接続
3. ブリード（おみあい）— 友人とコード交換で特徴を継承した子。`BREEDING_SPEC.md`。**実装済み**（encode/decodeMate・breedWith・album・UI・テスト）。残=実機でのコード共有テスト
4. プレイできるMVPの配信: `npm run build:web` → `docs/app/`（GitHub Pages `/dog_cat/app/`。Mac不要で自分のスマホで遊べる）**配信中**
5. ストア素材（スクショ5枚構成＝listing.md／フィーチャーグラフィック）
6. 実機プレイテストによる生存バランス調整（ごはん4〜5日・家出10日の肌感）
