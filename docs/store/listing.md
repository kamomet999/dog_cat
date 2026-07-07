# ストア掲載情報（ドラフト・v1 = 無料版）

> 提出時にコピペで使う文言一式。**v1は無料で出す（アプリ内課金なし）**方針に合わせて改訂（2026-06-23）。
> IAP（¥500プレミアム）は v1.1 で有効化予定。v1では購入導線を隠し、プレミアム内容は「近日公開」表示。

## 共通

- アプリ名: **いぬねこ図鑑 - スマホをはなれて育てるペット**
- カテゴリ: iOS「ライフスタイル」or「ヘルスケア/フィットネス」/ Android「ライフスタイル」
- 年齢区分: 全年齢（暴力・**アプリ内課金なし(v1)**・広告なし・UGCなし）
- プライバシーポリシーURL: GitHub Pages に `privacy-policy` を設置して指定（公開前にURL確定）

## ショート説明（Google Play・80字以内）

> スマホを置くほど、犬や猫が育つ。犬猫30種の いぬねこ図鑑を集めよう。責めない、やさしいデジタルデトックス。

## サブタイトル（iOS・30字以内）

> スマホを置くだけ、いぬねこ育成

## 説明文（日本語）

スマホをはなれた時間が、そのまま「いぬ・ねこ」の成長になる。
がんばらない・責めない デジタルデトックス × ゆるい育成ゲームです。

【あそびかた】
1. ねんね中の あかちゃんを おむかえ（いぬ？ ねこ？）
2. 「おすわり」＝スマホを置くと、その時間が この子の ごはんに
3. 「おさんぽ」＝どくしょ・えいご・うんどうの あいだ となりに（取り組んだぶん ごほうび）
4. 育った子は 図鑑に登録。あたらしい子を おむかえして コンプを目指そう

【とくちょう】
■ 置くほど育つ — アプリを閉じているあいだも、少しずつ成長します
■ 犬猫30種の図鑑 — 柴犬からベンガルまで。レアな子に出会って図鑑をうめよう（v1.1で60種へ）
■ きせかえ・記号模様・目スタイル — その子だけの個性。おさんぽのごほうびで集まる（コードで友だちにおすそわけも）
■ 図鑑・うちの子のシェア — あつめた記録や この子を 1枚の画像にして 友だちと見せ合える
■ 責めない設計 — **スマホを使っていない間は、この子はいなくなりません**。あわてず ゆっくりで だいじょうぶ
■ 広告ゼロ・登録不要・**アプリ内課金なし** — データはぜんぶ端末の中だけ。やさしい設計です

スマホとちょっと距離を置きたいあなたへ。
かわいい相棒と、すこしずつ。

#いぬねこ図鑑

## 説明文（英語・グローバル配信用）

Put your phone down, and your dog or cat grows.
A gentle, guilt-free digital detox app crossed with a cozy pet-collecting game.

HOW IT WORKS
1. Welcome a sleeping puppy or kitten
2. "Sit" — put your phone down, and that time becomes your pet's food
3. "Walk" — keep it by your side while you read, study, or exercise (earn treats)
4. Raise each pet, add it to your Dex, and welcome the next one

FEATURES
- Grows while you're away: your pet keeps growing while the app is closed
- 30 dog & cat breeds to collect (60 with the one-time unlock, coming in v1.1)
- Dress-up, body markings, eye styles — every pet is one of a kind (gift accessories to friends by code)
- Share your Dex progress or your pet as a single image
- Guilt-free: your pet never leaves while you're not using your phone
- No ads, no sign-up, no in-app purchases (v1). All data stays on your device.

## スクリーンショット構成案（6.7" / 6.5" / 5.5" とAndroid共通）

> 並びは `docs/DESIGN.md` §10（Value → Usage → Trust）を正とする。
> **生成済み**: `npm run store:shots` → `docs/store/shots/android/`（1080×1920）・`ios/`（1290×2796）・
> `feature-graphic.png`（1024×500）。文言や状態を変えたら `tools/gen_store_shots.js` を編集して再生成。

1. ホーム画面 — **ペットの顔が最大要素（画面の1/3以上）**「スマホを置くと、育つ。」
2. おすわり画面「スマホを置いた時間が ごはんになる」
3. 図鑑画面「犬猫30種を あつめよう」
4. きせかえ画面「その子だけの おしゃれ」
5. 図鑑/ホームの実写（フッターの一言が写るもの）「広告ゼロ・登録不要・課金なし」

※ 別途: Google Play フィーチャーグラフィック（ペット顔＋「スマホを置くと、育つ。」の1メッセージ。DESIGN.md §10）

## データセーフティ / プライバシー栄養表示の回答

- データ収集: **なし** / データ共有: **なし** / 暗号化: 該当なし（送信なし）
- トラッキング: なし / 広告ID使用: なし
- アプリ内課金: **なし（v1）**（v1.1でIAP有効化時に「デジタルコンテンツ」を申告し直す）
- iOS「App Privacy」: Data Not Collected

## v1.1（IAP有効化）で更新が必要な項目 ※提出時の備忘

- アプリ内課金: **あり**（¥500 買い切り「プレミアム図鑑」＝非消費型）に変更
- 年齢区分・データセーフティの「課金」項目を更新
- 説明文の「課金なし」を「延命・復活課金なし／コレクション拡張のみ ¥500買い切り」に変更
- 図鑑の種数表記を「30種」→「60種（無料30＋プレミアム30）」へ更新
