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

  var Native = {
    isNative: isNative,

    /** アプリ復帰（バックグラウンド→フォアグラウンド）のハンドラ登録 */
    init: function (onResume) {
      if (!P || !P.App) return;
      P.App.addListener('appStateChange', function (s) {
        if (s.isActive && onResume) onResume();
      });
    },

    /** おさんぽ開始：満了時刻に「おかえり」通知を予約 */
    walkStarted: function (walk) {
      if (!P || !P.LocalNotifications || !walk) return;
      P.LocalNotifications.requestPermissions().then(function (r) {
        if (!r || r.display !== 'granted') return;
        return P.LocalNotifications.schedule({
          notifications: [{
            id: WALK_NOTIF_ID,
            title: 'おさんぽ せいこう！🐾',
            body: 'むかえにきてね。ごほうびがまってるよ',
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
    }
  };

  global.Native = Native;
})(typeof window !== 'undefined' ? window : this);
