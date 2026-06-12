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
  return Object.assign({
    breedId: 'shiba', xp: 90, hunger: 64, mood: 70, clean: 60, energy: 75,
    health: 100, sanpo: 60, runawayH: 0, away: false, careCount: 12
  }, over || {});
}
function saveBase(over) {
  return Object.assign({
    version: 6, premium: false, coin: 180, luck: 0.05,
    current: petBase(),
    dex: { shiba: { count: 3, firstAt: T0 - DAY * 3, unseen: false } },
    lastSavedAt: T0, graduates: 1, deaths: 0, runaways: 0,
    foodStock: 6, task: null, walk: null,
    walkStats: { success: 5, fail: 1, streak: 2, best: 3, totalMin: 240 }
  }, over || {});
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
      name: 'food',
      save: saveBase({ foodStock: 4 }),
      steps: [{ click: '[data-act="feed"]' }, { wait: 350 }]
    },
    {
      name: 'task',
      save: saveBase({ current: petBase({ sanpo: 38 }) }),
      steps: [
        { click: '#taskBtn' }, { wait: 350 },
        { click: '[data-kind="どくしょ"]' }, { click: '[data-min="30"]' }, { wait: 200 }
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
      save: saveBase(),
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
