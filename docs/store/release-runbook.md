# リリース手順書（いぬねこ図鑑 v1.0）

最終更新 2026-09-26。**コードは完成済み。ここから先はすべてブラウザ上の作業。**
上から順に実行する。詰まりやすい所には ⚠ を付けた。

- アプリ名: いぬねこ図鑑 ／ appId `com.kamomet.inuneko` ／ versionCode 1 ／ versionName 1.0
- 掲載文: `docs/store/listing.md` ／ スクショ: `docs/store/shots/`
- プライバシーポリシー: **https://kamomet999.github.io/dog_cat/privacy.html**
  （⚠ 提出前にブラウザで開けることを必ず確認。GitHub の Settings → Pages で `main` / `docs` が公開設定になっている必要がある）

---

## 0. 前提（1回だけ）

| 必要なもの | 費用 | 備考 |
|---|---|---|
| Google Play デベロッパー登録 | $25（買い切り） | 個人アカウントは「12人×14日テスト」が製品版公開の条件 |
| Apple Developer Program | $99/年 | iOS を出すなら必須。Google と独立に進行できる |
| Codemagic アカウント | 無料枠あり | GitHub 連携でこのリポジトリを追加 |

---

## 1. Codemagic でビルドを通す（最初にここ）

⚠ **Capacitor 8 / targetSdk 36 へ移行した直後なので、最初の `android-debug` がその検証を兼ねる。**

1. Codemagic に GitHub でログイン → `kamomet999/dog_cat` を追加
2. ブランチはリリース対象のものを選ぶ
3. **`android-debug`** ワークフローを Start new build
   - 通れば APK が成果物に出る → 自分の Android 実機に入れて動作確認
   - ⚠ 落ちた場合の見どころ: Java 21 が使われているか／`compileSdk 36` が SDK に入っているか／`tools/check_android_res.py` のリソース検証で止まっていないか
4. APK が動いたら **`android-release`**（AAB）へ進む
   - 事前に Codemagic → Teams → Code signing identities → Android で
     「Generate new keystore」→ 参照名を **`inuneko_upload_key`** にする（`codemagic.yaml` がこの名前を参照）
   - ⚠ このキーストアは**紛失すると二度とアプリを更新できない**。ダウンロードしてオフラインにも保管する

---

## 2. Google Play Console

### 2-1. アプリを作る
1. すべてのアプリ → **アプリを作成**
2. アプリ名「いぬねこ図鑑」／ 言語 日本語 ／ **アプリ** ／ **無料**

### 2-2. ストアの掲載情報（`docs/store/listing.md` からコピペ）
- 簡単な説明（80字以内）・詳しい説明: listing.md の該当セクション
- **アプリのアイコン** 512×512 PNG: **`docs/store/shots/icon-512.png`**（生成済み）
- **フィーチャーグラフィック** 1024×500: `docs/store/shots/feature-graphic.png`
- **スマートフォンのスクリーンショット**: `docs/store/shots/android/1-home.png` 〜 `5-trust.png`（最低2枚・推奨5枚）

### 2-3. アプリのコンテンツ（全部埋めないと公開できない）
- **プライバシーポリシー**: 上記 URL
- **データ セーフティ**: listing.md の「データセーフティ」節のとおり
  → データ収集 **なし** ／ 共有 **なし** ／ トラッキング **なし**
- **広告**: 広告なし
- **コンテンツのレーティング**: アンケートに回答（暴力・課金・UGC すべて無しなので全年齢）
- **対象ユーザー**: 13歳以上（⚠ 子ども向けにすると審査要件が増えるので、子ども向けには**しない**）
- **アプリのアクセス権**: 制限なし（ログイン不要）

### 2-4. クローズドテスト（ここがボトルネック）
1. テスト → **クローズドテスト** → 新しいトラックを作成
2. **テスターの指定は Google グループで**（例 `inuneko-testers@googlegroups.com`）
   → 後から人を足す/外すのが Play Console を触らずに済む
3. `android-release` で作った **AAB をアップロード**
4. リリースノート（例:「はじめてのリリースです。スマホを置いて、いぬねこを育ててみてください」）
5. 公開 → **オプトイン URL** が発行される → 募集文面（`docs/store/closed-testing.md`）と一緒に配る
6. ⚠ **12人が14日間、継続してオプトインし続ける**のが条件。
   - 12人ちょうどで始めない（**15〜18人**集めてから一斉スタート）
   - 途中参加者の14日はその人の参加時点から数え直しになる
   - Play Console の「テスター」数を毎日見る

### 2-5. 製品版へ
1. 14日経過＋12人条件を満たすと、製品版申請のフォームが解放される
2. ⚠ **「テストから何を学び、どう改善したか」の記述が必須**
   → `docs/store/closed-testing.md` のフィードバックフォームの回答をそのまま材料にする
3. 製品版トラックに同じ AAB（または修正版）をアップロード → 審査 → 公開

---

## 3. App Store Connect（Google と並行でよい）

1. Apple Developer 登録後、App Store Connect で新規アプリ（バンドルID `com.kamomet.inuneko`）
2. Codemagic → Teams → Integrations → App Store Connect に API キーを **`inuneko_asc_key`** の名前で登録
3. **`ios-release`** ワークフローを実行 → TestFlight に自動配信
   - ⚠ Capacitor 8 は **iOS 15.0 以上**。Podfile / Xcode の deployment target は対応済み
4. スクリーンショット: `docs/store/shots/ios/`（6.7インチ 1290×2796）
5. App Privacy: **Data Not Collected**
6. 審査へ提出。⚠ Apple はテスター要件が無いので、**Google より先に公開される可能性が高い**

---

## 4. 公開後すぐやること

- [ ] 自分の端末でストアから入れ直して起動確認（署名済みビルドは別物）
- [ ] `docs/index.html` のランディングにストアのリンクを追加
- [ ] キーストアと Apple の API キーのバックアップを確認
