/* 生成画像(nanobanana)スプライトの登録簿。
 * tools/gen_sprites.mjs が生成した PNG の breedId をここに並べる。
 * 例: window.INUNEKO_SPRITES = { shiba:1, golden:1, ... };
 * 空のあいだは手続きSVGにフォールバック（差し替えは無痛）。 */
window.INUNEKO_SPRITES = {};
if (window.Art && Art.registerSprites) Art.registerSprites(window.INUNEKO_SPRITES);
