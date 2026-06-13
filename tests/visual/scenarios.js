/**
 * スナップショット検証のシナリオ定義。
 * 各シナリオ = { name, viewport?, save, steps? }
 *   save : localStorage に書く inuneko_dex_save_v1（null なら初回起動＝種選択）
 *   steps: ページに対する操作の配列（{ click } / { wait } / { eval }）
 * 時刻は固定（T0）。Date.now() を上書きして決定論的に描画する。
 * 追加したいときはこの配列に足すだけ。`npm run snap -- <name>` で個別描画できる。
 */
const T0 = 1750000000000;
const DAY = 86400000;

function petBase(over) {
  // v8: 指標は3つ（hunger/sanpo/clean）。xp 300 = 子ども（GROW[2]=200, GROW[3]=760）
  return Object.assign({
    breedId: 'shiba', xp: 300, hunger: 64, clean: 60,
    health: 100, sanpo: 60, runawayH: 0, away: false, careCount: 12
  }, over || {});
}
function saveBase(over) {
  return Object.assign({
    version: 9, premium: false, coin: 180, luck: 0.05,
    current: petBase(),
    dex: { shiba: { count: 3, firstAt: T0 - DAY * 3, unseen: false } },
    lastSavedAt: T0, graduates: 1, deaths: 0, runaways: 0,
    foodStock: 6, task: null, walk: null,
    walkStats: { success: 5, fail: 1, streak: 2, best: 3, totalMin: 240 },
    album: []
  }, over || {});
}
// 成体（おみあい可能。GROW[3]=760）
function adultSave(over) {
  return saveBase(Object.assign({ current: petBase({ xp: 800 }) }, over || {}));
}

module.exports = {
  T0,
  scenarios: [
    {
      name: 'intro',
      save: null, // セーブなし＝初回。説明画面が出る
      fullPage: true,
      steps: [{ wait: 500 }]
    },
    {
      name: 'home',
      save: saveBase()
    },
    {
      name: 'tutorial1',
      save: null, // 初回フロー: intro → はじめる → 種選択 → チュートリアル
      steps: [
        { eval: () => { try { localStorage.removeItem('inuneko_tutorial_done_v1'); } catch (e) {} } },
        { click: '#introGo' }, { wait: 250 },
        { click: '[data-sp="dog"]' }, { wait: 700 }
      ]
    },
    {
      name: 'tutorial2',
      save: null,
      steps: [
        { eval: () => { try { localStorage.removeItem('inuneko_tutorial_done_v1'); } catch (e) {} } },
        { click: '#introGo' }, { wait: 250 },
        { click: '[data-sp="dog"]' }, { wait: 700 },
        { click: '#tutNext' }, { wait: 300 }
      ]
    },
    {
      name: 'tutorial3',
      save: null, // ②お散歩ステップ（ユーザー報告の位置不良を検証）
      steps: [
        { eval: () => { try { localStorage.removeItem('inuneko_tutorial_done_v1'); } catch (e) {} } },
        { click: '#introGo' }, { wait: 250 },
        { click: '[data-sp="dog"]' }, { wait: 700 },
        { click: '#tutNext' }, { wait: 150 }, { click: '#tutNext' }, { wait: 300 }
      ]
    },
    {
      name: 'tutorial4',
      save: null,
      steps: [
        { eval: () => { try { localStorage.removeItem('inuneko_tutorial_done_v1'); } catch (e) {} } },
        { click: '#introGo' }, { wait: 250 },
        { click: '[data-sp="dog"]' }, { wait: 700 },
        { click: '#tutNext' }, { wait: 200 }, { click: '#tutNext' }, { wait: 200 },
        { click: '#tutNext' }, { wait: 300 }
      ]
    },
    {
      name: 'tutorial5',
      save: null,
      steps: [
        { eval: () => { try { localStorage.removeItem('inuneko_tutorial_done_v1'); } catch (e) {} } },
        { click: '#introGo' }, { wait: 250 },
        { click: '[data-sp="dog"]' }, { wait: 700 },
        { click: '#tutNext' }, { wait: 150 }, { click: '#tutNext' }, { wait: 150 },
        { click: '#tutNext' }, { wait: 150 }, { click: '#tutNext' }, { wait: 300 }
      ]
    },
    {
      name: 'room-decorated',
      // 飾りをはめ込んだ部屋（背景そら＋壁の絵＋観葉＋くま＋ベッド）
      save: saveBase({ room: { bg: 'bg_sky', wall: 'w_pic', left: 'l_plant', right: 'r_bear', floor: 'f_bed' } }),
      steps: [{ wait: 300 }]
    },
    {
      name: 'room-modal',
      save: saveBase({ room: { bg: 'bg_sky', wall: 'w_pic', left: 'l_plant', right: null, floor: null } }),
      fullPage: true,
      steps: [{ click: '#roomBtn' }, { wait: 400 }]
    },
    {
      name: 'food',
      save: saveBase({ foodStock: 4 }),
      steps: [{ click: '[data-act="feed"]' }, { wait: 350 }]
    },
    {
      name: 'task',
      save: saveBase({ current: petBase({ sanpo: 38 }) }),
      steps: [
        { click: '#taskBtn' }, { wait: 350 },
        { click: '[data-kind="ほんよみ"]' }, { click: '[data-min="30"]' }, { wait: 200 }
      ]
    },
    {
      name: 'walkpicker',
      save: saveBase(),
      steps: [{ click: '#walkBtn' }, { wait: 350 }]
    },
    {
      name: 'dex',
      save: saveBase({
        dex: {
          shiba:  { count: 3, firstAt: T0 - DAY * 3, unseen: false },
          calico: { count: 1, firstAt: T0 - DAY * 2, unseen: true }
        }
      }),
      steps: [{ click: '#dexBtn' }, { wait: 450 }]
    },
    {
      name: 'dex-premium-locked',
      save: saveBase({
        dex: {
          shiba: { count: 3, firstAt: T0 - DAY * 3, unseen: false },
          golden: { count: 1, firstAt: T0 - DAY * 2, unseen: false },
          chihuahua: { count: 1, firstAt: T0 - DAY * 2, unseen: false },
          kijitora: { count: 1, firstAt: T0 - DAY, unseen: false }
        }
      }),
      fullPage: true,
      steps: [
        { click: '#dexBtn' }, { wait: 450 },
        { eval: () => { const m = document.querySelector('.modal'); if (m) m.scrollTop = 99999; } },
        { wait: 300 }
      ]
    },
    {
      name: 'dex-premium-unlocked',
      save: saveBase({
        premium: true,
        dex: {
          shiba:  { count: 3, firstAt: T0 - DAY * 3, unseen: false },
          akita:  { count: 1, firstAt: T0 - DAY * 1, unseen: true },
          persian:{ count: 1, firstAt: T0 - DAY * 2, unseen: false }
        }
      }),
      fullPage: true,
      steps: [
        { click: '#dexBtn' }, { wait: 450 },
        { eval: () => { const m = document.querySelector('.modal'); if (m) m.scrollTop = 99999; } },
        { wait: 300 }
      ]
    },
    {
      name: 'premium-modal',
      save: saveBase(),
      steps: [
        { click: '#dexBtn' }, { wait: 450 },
        { eval: () => { const b = document.querySelector('#premBtn'); if (b) b.click(); } },
        { wait: 400 }
      ]
    },
    {
      name: 'mate-menu',
      save: adultSave(),
      steps: [{ click: '#mateBtn' }, { wait: 350 }]
    },
    {
      name: 'mate-share',
      save: adultSave(),
      steps: [{ click: '#mateBtn' }, { wait: 300 }, { click: '#mateShow' }, { wait: 350 }]
    },
    {
      name: 'dex-album',
      save: saveBase({
        album: [
          { at: T0 - DAY, species: 'dog', nature: 'げんきいっぱい', parents: ['柴犬', 'コーギー'],
            art: { base: 'dog', ear: 'bigprick', color: '#e0913f', color2: '#fbf2e6', pattern: 'tan', eye: '#2a1d12', fluffy: false, tail: 'curl' } },
          { at: T0 - DAY * 2, species: 'dog', nature: 'じゆうじん', parents: ['ハスキー', 'ポメラニアン'],
            art: { base: 'dog', ear: 'prick', color: '#8aa0b0', color2: '#f6dcab', pattern: 'patch', eye: '#7ab3e0', fluffy: true } }
        ]
      }),
      steps: [
        { click: '#dexBtn' }, { wait: 450 },
        { eval: () => { const t = [...document.querySelectorAll('.dex-section-title')].find(e => e.textContent.includes('おみあい')); if (t) t.scrollIntoView(); } },
        { wait: 400 }
      ]
    },
    {
      name: 'settings',
      save: saveBase({ graduates: 7, walkStats: { success: 18, fail: 3, streak: 4, best: 9, totalMin: 1240 } }),
      fullPage: true,
      steps: [{ click: '#settingsBtn' }, { wait: 400 }]
    },
    {
      name: 'success',
      // ごはんさがしが1分前に満了 → 起動時に「自慢の1枚」成功モーダル
      save: saveBase({ walk: { startedAt: T0 - 31 * 60000, endsAt: T0 - 60000, minutes: 30 }, lastSavedAt: T0 - 60000 }),
      steps: [{ wait: 600 }]
    },
    {
      name: 'farewell-star',
      // おなか0・いのち0 → おほしさま
      save: saveBase({ current: petBase({ hunger: 0, health: 0 }), foodStock: 0 }),
      steps: [{ wait: 600 }]
    },
    {
      name: 'farewell-away',
      // さんぽ0が長期化 → 家出
      save: saveBase({ current: petBase({ sanpo: 0, runawayH: 80, away: true }) }),
      steps: [{ wait: 600 }]
    }
  ]
};
