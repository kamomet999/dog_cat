#!/bin/bash
# いぬねこ図鑑 — Claude Code on the web のセッション開始時セットアップ。
# 目的: npm test / npm run snap が即座に動く状態でセッションを始める。
set -euo pipefail

# リモート（web）環境のみ実行。ローカルCLIでは何もしない。
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Node依存（Capacitor等）。キャッシュを活かすため ci ではなく install。冪等。
npm install --no-audit --no-fund

# スナップショット検証ループ（npm run snap）用の playwright を保証する。
# ブラウザDLは環境のネットワーク方針で失敗しうるため best-effort（コアを止めない）。
export NODE_PATH="$(npm root -g)"
if ! node -e "require('playwright')" >/dev/null 2>&1; then
  npm install -g playwright >/dev/null 2>&1 || true
fi
npx --yes playwright install chromium >/dev/null 2>&1 || true

echo "session-start: ready (npm test / npm run snap)"
