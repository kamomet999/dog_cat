# いぬねこ図鑑

スマホをはなれて、そだてるたまごっち。
「おさんぽ」でスマホを置いて過ごすと犬や猫が育ち、図鑑が埋まっていくデジタルデトックスアプリ。

- 企画・ロードマップ: [`PLAN_v2.md`](PLAN_v2.md)（6/22 ストア提出計画）

## 構成

```
www/            Webアプリ本体（素のJS・ビルド不要）
  js/engine.js    ゲームロジック（決定論的・時刻注入式）
  js/breeds.js    図鑑データ（品種定義）
  js/art.js       プロシージャルSVGアート
  js/ui.js        画面・イベント
  js/native.js    Capacitorブリッジ（通知・復帰検知。Web実行時はno-op）
android/ ios/   Capacitorが生成したネイティブプロジェクト
tests/          エンジン単体テスト（依存ゼロ・Node標準のみ）
codemagic.yaml  CI/CD（Android AAB / iOS TestFlight）
```

## 開発

```bash
# Webとして起動（ブラウザで動作確認）
npx serve www        # など任意の静的サーバー

# テスト
npm test

# ネイティブプロジェクトへ反映（www/ を変更したら）
npx cap sync
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

詳細な提出手順・審査の流れは `PLAN_v2.md` §5 を参照。
