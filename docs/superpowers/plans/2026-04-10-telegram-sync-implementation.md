# Telegram Sync + Optional Funnel + TUI Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有 Telegram 功能上，新增可選 Tailscale Funnel 設定、TUI 快捷鍵啟用/停用、以及啟用時 active quz 與 Telegram 訊息狀態同步。

**Architecture:** 延續現有 `telegram-config` 與 `telegram/notifier` 架構，將 Funnel 決策放在 CLI 初始化流程，將 Telegram 啟用切換與 reconcile 放在 TUI/服務層，透過新的持久化 message mapping 檔實作啟動後差異同步（新增/更新/移除為摘要）。

**Tech Stack:** TypeScript, Bun, Vitest, Ink/OpenTUI, Telegram Bot API, Tailscale CLI (`tailscale funnel`).

---

### Task 1: CLI 增加 Funnel 可選模式與 token fallback

**Files:**
- Modify: `src/cli/commands/telegram-config.ts`
- Modify: `src/cli/commands/config.ts`
- Modify: `src/cli/commands/__tests__/config.test.ts`

- [ ] **Step 1: 寫失敗測試（`--funnel auto|off`、未指定時互動詢問、`--json` 預設 off）**
- [ ] **Step 2: 跑測試確認失敗**
Run: `bun run test src/cli/commands/__tests__/config.test.ts`
Expected: FAIL on missing funnel decision logic.
- [ ] **Step 3: 實作 Funnel 決策流程與 `--webhook-url` 優先規則**
- [ ] **Step 4: 實作 token 讀取策略（env 優先；互動 prompt；非互動缺 token fail-fast）**
- [ ] **Step 5: 重跑測試確認通過**
Run: `bun run test src/cli/commands/__tests__/config.test.ts`
Expected: PASS.
- [ ] **Step 6: Commit**
Run: `git commit -m "feat(cli): add optional funnel flow and token prompt fallback"`

### Task 2: Tailscale Funnel 整合層

**Files:**
- Create: `src/telegram/funnel.ts`
- Modify: `src/cli/commands/telegram-config.ts`
- Test: `src/telegram/__tests__/funnel.test.ts`

- [ ] **Step 1: 寫失敗測試（preflight、同 port 覆蓋、錯誤分類）**
- [ ] **Step 2: 跑測試確認失敗**
Run: `bun run test src/telegram/__tests__/funnel.test.ts`
Expected: FAIL with missing module/behaviors.
- [ ] **Step 3: 最小實作 `tailscale` 封裝（狀態檢查、建立/覆蓋 funnel、URL 解析）**
- [ ] **Step 4: 在 init/rebind 串接 auto 模式，失敗時降級 pairing-only 並輸出修復指令**
- [ ] **Step 5: 重跑測試確認通過**
Run: `bun run test src/telegram/__tests__/funnel.test.ts src/cli/commands/__tests__/config.test.ts`
Expected: PASS.
- [ ] **Step 6: Commit**
Run: `git commit -m "feat(telegram): integrate optional tailscale funnel setup"`

### Task 3: TUI `[T] Telegram` 快捷鍵

**Files:**
- Modify: `src/tui-opentui/components/Footer.tsx`
- Modify: `src/tui-opentui/components/StepperView.tsx`
- Modify: `src/tui-opentui/components/__tests__/Footer.test.ts`
- Modify: `src/tui-opentui/components/__tests__/StepperView.test.ts`

- [ ] **Step 1: 寫失敗測試（顯示 `[T] Telegram`、按鍵事件觸發）**
- [ ] **Step 2: 跑測試確認失敗**
Run: `bun run test src/tui-opentui/components/__tests__/Footer.test.ts src/tui-opentui/components/__tests__/StepperView.test.ts`
Expected: FAIL on missing hotkey and action.
- [ ] **Step 3: 實作 `T` 快捷鍵：未設定走 setup+啟動；已設定切換 `telegram.enabled`**
- [ ] **Step 4: 加入 toast 狀態訊息**
- [ ] **Step 5: 重跑測試確認通過**
Run: `bun run test src/tui-opentui/components/__tests__/Footer.test.ts src/tui-opentui/components/__tests__/StepperView.test.ts`
Expected: PASS.
- [ ] **Step 6: Commit**
Run: `git commit -m "feat(tui): add telegram quick-toggle hotkey"`

### Task 4: 持久化 Telegram message mapping

**Files:**
- Create: `src/telegram/message-map.ts`
- Modify: `src/telegram/notifier.ts`
- Test: `src/telegram/__tests__/notifier.test.ts`
- Create: `src/telegram/__tests__/message-map.test.ts`

- [ ] **Step 1: 寫失敗測試（寫入/讀取 mapping、去重、state 更新）**
- [ ] **Step 2: 跑測試確認失敗**
Run: `bun run test src/telegram/__tests__/message-map.test.ts`
Expected: FAIL with missing store.
- [ ] **Step 3: 實作 mapping store（`sessionId/questionIndex/chatId/messageId/lastSyncedHash/state`）**
- [ ] **Step 4: 在 notifier 發送/更新時維護 mapping**
- [ ] **Step 5: 重跑測試確認通過**
Run: `bun run test src/telegram/__tests__/message-map.test.ts src/telegram/__tests__/notifier.test.ts`
Expected: PASS.
- [ ] **Step 6: Commit**
Run: `git commit -m "feat(telegram): persist message mapping for sync"`

### Task 5: 啟用 Telegram 時 active quz reconcile

**Files:**
- Modify: `src/telegram/notifier.ts`
- Modify: `src/server.ts`
- Modify: `src/session/SessionManager.ts`
- Test: `src/__tests__/server.integration.test.ts`
- Test: `src/session/__tests__/SessionManager.test.ts`

- [ ] **Step 1: 寫失敗測試（啟用時新增/更新/移除摘要三種路徑）**
- [ ] **Step 2: 跑測試確認失敗**
Run: `bun run test src/__tests__/server.integration.test.ts src/session/__tests__/SessionManager.test.ts`
Expected: FAIL on missing reconcile behavior.
- [ ] **Step 3: 實作 active quz 判定（waiting/partial 且未過期）**
- [ ] **Step 4: 實作 reconcile：Add（新發）、Update（edit）、Remove（摘要+移除按鈕）**
- [ ] **Step 5: 重跑測試確認通過**
Run: `bun run test src/__tests__/server.integration.test.ts src/session/__tests__/SessionManager.test.ts`
Expected: PASS.
- [ ] **Step 6: Commit**
Run: `git commit -m "feat(telegram): reconcile active sessions on enable"`

### Task 6: 文件與 smoke 驗證

**Files:**
- Modify: `README.md`
- Modify: `.auqrc.example.json`

- [ ] **Step 1: 更新 README（`--funnel auto|off`、`T` 快捷鍵、reconcile 說明）**
- [ ] **Step 2: 更新設定範例**
- [ ] **Step 3: 跑關鍵驗證**
Run: `bun run test src/cli/commands/__tests__/config.test.ts src/telegram/__tests__/funnel.test.ts src/telegram/__tests__/notifier.test.ts`
Expected: PASS.
- [ ] **Step 4: 跑整體驗證**
Run: `bun run test && bun run typecheck:all`
Expected: PASS.
- [ ] **Step 5: Commit**
Run: `git commit -m "docs: document telegram funnel and tui toggle sync flow"`

## Implementation Notes
- 使用 `@test-driven-development`：每個 task 先寫 failing tests，再最小實作。
- 使用 `@verification-before-completion`：每個 task 先驗證再宣告完成。
- 若執行採代理模式，使用 `@subagent-driven-development`。
- 第三方整合（Tailscale/Telegram API）實作前，先走 `@find-docs` 核對官方行為與 CLI 參數。
