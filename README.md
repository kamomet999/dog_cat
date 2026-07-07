# いぬねこ図鑑

スマホをはなれて、そだてる いぬねこ。
「🍖 おすわり」でスマホを置いて過ごすと犬や猫が育ち、図鑑が埋まっていくデジタルデトックスアプリ。
基本無料（犬猫各15＝30種）＋¥500買い切りで全60種。広告ゼロ・登録不要・延命課金なし。

- 開発規約・公開スケジュール: [`CLAUDE.md`](CLAUDE.md)（毎セッション最初に読む「正」）
- 課金モデル: [`docs/MONETIZATION.md`](docs/MONETIZATION.md) ／ ゲームデザイン: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md)
- 旧ロードマップ: [`PLAN_v2.md`](PLAN_v2.md)（歴史的記録。現行スケジュールは CLAUDE.md）

## 構成

```
www/            Webアプリ本体（素のJS・ビルド不要）
  js/engine.js    ゲームロジック（決定論的・時刻注入式。セーブVERSION管理）
  js/breeds.js    図鑑データ（全60種＝犬30・猫30。無料各15＋premium各15）
  js/art.js       手続きSVGフォールバック（本番はスプライトPNG）
  js/ui.js        画面・イベント
  js/native.js    Capacitorブリッジ（通知・復帰検知。Web実行時はno-op）
  assets/sprites/ 品種スプライトPNG＋manifest.js（登録簿）
android/ ios/   Capacitorが生成したネイティブプロジェクト
tests/          単体テスト・E2E（Playwright）・スナップショット検証
codemagic.yaml  CI/CD（Android AAB / iOS TestFlight）
```

## 開発

```bash
# Webとして起動（ブラウザで動作確認）
npx serve www        # など任意の静的サーバー

# テスト
npm test             # エンジン単体（依存ゼロ・即時）
npm run e2e          # 実ブラウザのユーザージャーニー（約40秒）
npm run snap         # 全画面をPNGに描画して目視確認

# ネイティブプロジェクトへ反映（www/ を変更したら）
npx cap sync

# GitHub Pages 配信物の更新（docs/app）
npm run build:web
```

## ビルドとリリース（Macなし運用）

ビルドはすべて **Codemagic** 上で行う。ローカルにAndroid SDK / Xcodeは不要。

1. [Codemagic](https://codemagic.io) にGitHubでサインアップし、このリポジトリを追加
2. **Android**: Teams > Code signing identities > Android で
   「Generate new keystore」→ 参照名を `inuneko_upload_key` にする
3. `android-release` ワークフローを手動実行 → AAB ができるので
   Google Play Console の内部テストにアップロード
4. **iOS**（Apple Developer登録後）: App Store Connect でAPIキーを発行し、
   Codemagic > Integrations に `inuneko_asc_key` として登録
5. `ios-release` ワークフローを実行 → TestFlight に自動配信

公開スケジュール・クローズドテスト（12人×14日）の段取りは `CLAUDE.md` を参照。
