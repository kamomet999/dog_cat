/**
 * ネイティブ連携ブリッジ（Capacitor）
 * - ネイティブアプリ実行時のみ有効。素のブラウザ/PWAでは全メソッドが安全に何もしない。
 * - 通知: おさんぽ満了時刻にローカル通知を予約（サーバー不要）
 * - 復帰: appStateChange でアプリ復帰を検知し、UI側のハンドラを呼ぶ
 */
(function (global) {
  'use strict';

  var cap = global.Capacitor;
  var isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var P = isNative && cap.Plugins ? cap.Plugins : null;

  var WALK_NOTIF_ID = 1001;
  var TASK_NOTIF_ID = 1002;

  var Native = {
    isNative: isNative,

    /** アプリ復帰/退避のハンドラ登録 */
    init: function (onResume, onPause) {
      if (!P || !P.App) return;
      P.App.addListener('appStateChange', function (s) {
        if (s.isActive) { if (onResume) onResume(); }
        else if (onPause) { onPause(); }
      });
    },

    /** 危険予告の通知プランを張り替える（id 2001-2003。GAME_DESIGN.md §4） */
    schedulePlan: function (items) {
      if (!P || !P.LocalNotifications) return;
      var cancelIds = [{ id: 2001 }, { id: 2002 }, { id: 2003 }];
      P.LocalNotifications.cancel({ notifications: cancelIds }).catch(function () {});
      if (!items || !items.length) return;
      P.LocalNotifications.requestPermissions().then(function (r) {
        if (!r || r.display !== 'granted') return;
        return P.LocalNotifications.schedule({
          notifications: items.map(function (it) {
            return {
              id: it.id, title: it.title, body: it.body,
              schedule: { at: new Date(it.at), allowWhileIdle: true }
            };
          })
        });
      }).catch(function () { /* 通知が使えなくてもゲームは続行 */ });
    },

    /** さんぽ（課題）開始: 終了時刻に「おかえり」通知を予約 */
    taskStarted: function (task) {
      if (!P || !P.LocalNotifications || !task) return;
      P.LocalNotifications.requestPermissions().then(function (r) {
        if (!r || r.display !== 'granted') return;
        return P.LocalNotifications.schedule({
          notifications: [{
            id: TASK_NOTIF_ID,
            title: 'おさんぽ おわり！🐾',
            body: 'いいじかんを いっしょに すごせたよ。えらい！',
            schedule: { at: new Date(task.endsAt), allowWhileIdle: true }
          }]
        });
      }).catch(function () {});
    },
    taskEnded: function () {
      if (!P || !P.LocalNotifications) return;
      P.LocalNotifications.cancel({ notifications: [{ id: TASK_NOTIF_ID }] }).catch(function () {});
    },

    /** おすわり開始：満了時刻に「おかえり」通知を予約 */
    walkStarted: function (walk) {
      if (!P || !P.LocalNotifications || !walk) return;
      P.LocalNotifications.requestPermissions().then(function (r) {
        if (!r || r.display !== 'granted') return;
        return P.LocalNotifications.schedule({
          notifications: [{
            id: WALK_NOTIF_ID,
            title: 'おすわり せいこう！🍖',
            body: 'えさを もってかえったよ。むかえにきてね',
            schedule: { at: new Date(walk.endsAt), allowWhileIdle: true }
          }]
        });
      }).catch(function () { /* 通知が使えなくてもゲームは続行 */ });
    },

    /** おさんぽ終了（成功・失敗とも）：予約済み通知を破棄 */
    walkEnded: function () {
      if (!P || !P.LocalNotifications) return;
      P.LocalNotifications.cancel({ notifications: [{ id: WALK_NOTIF_ID }] })
        .catch(function () {});
    },

    /** 触覚フィードバック（世話・成功演出用） */
    buzz: function (style) {
      if (!P || !P.Haptics) return;
      P.Haptics.impact({ style: style || 'MEDIUM' }).catch(function () {});
    },

    /** 時間指定リマインド: 毎日 HH:MM に「さんぽしないの？」（id 3001-3006・daily repeat） */
    scheduleReminders: function (rem) {
      if (!P || !P.LocalNotifications) return;
      var ids = [3001, 3002, 3003, 3004, 3005, 3006].map(function (id) { return { id: id }; });
      P.LocalNotifications.cancel({ notifications: ids }).catch(function () {});
      if (!rem || !rem.enabled || !rem.times || !rem.times.length) return;
      P.LocalNotifications.requestPermissions().then(function (r) {
        if (!r || r.display !== 'granted') return;
        var notifs = rem.times.slice(0, 6).map(function (t, i) {
          var hm = String(t).split(':');
          return {
            id: 3001 + i,
            title: 'さんぽ しないの？🐾',
            body: 'きょうの いいじかん、いっしょに すごそう',
            schedule: { on: { hour: parseInt(hm[0], 10), minute: parseInt(hm[1], 10) }, allowWhileIdle: true, repeats: true }
          };
        });
        return P.LocalNotifications.schedule({ notifications: notifs });
      }).catch(function () { /* 通知が使えなくてもゲームは続行 */ });
    },

    /** 許可アプリの起動（URLスキームがあるとき。なければ何もしない） */
    openApp: function (url) {
      if (!url) return;
      if (P && P.AppLauncher) { P.AppLauncher.openUrl({ url: url }).catch(function () {}); return; }
      try { global.open(url, '_system'); } catch (e) { /* noop */ }
    }
  };

  global.Native = Native;
})(typeof window !== 'undefined' ? window : this);
