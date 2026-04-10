# AUQ Telegram Sync Design

## Summary
Add an opt-in Telegram channel to AUQ so question sets can be delivered to Telegram and answered via inline buttons. Telegram answers are first-class submissions (same authority as TUI/CLI), with strict first-writer-wins locking.

## Confirmed Decisions
- Transport: webhook mode, AUQ binds `0.0.0.0`; Tailscale Funnel is optional.
- Answer authority: Telegram submissions are official session answers.
- Conflict policy: first successful submission completes the session; later submissions are rejected.
- Setup UX: `auq config telegram init|rebind` with optional Funnel assistance.
- Funnel policy: default interactive ask; `--funnel auto|off` skips prompt.
- Non-interactive policy (`--json` or no TTY): default `funnel=off` unless `--funnel auto` is explicitly set.
- Override policy: explicit `--webhook-url` takes precedence over Funnel auto URL.
- Existing whitelist policy: reject overwrite by default; require explicit `rebind`.
- Token policy: read from env first; if missing and interactive, prompt for bot token (ephemeral, never persisted).
- Non-interactive missing token: fail with actionable next steps.
- Button UX: max 4 options per question, max 20 chars per button label.
- Completion UX: on completion, remove Telegram buttons and edit message to keep only question + submitted option.

## Initialization Flow (`auq config telegram init`)
1. Parse flags: `--funnel auto|off`, `--webhook-url`, `--bind-host`, `--bind-port`, `--json`.
2. Enforce `bind-host=0.0.0.0` and valid port range.
3. Validate overwrite rule: if `allowedChatId` exists and command is not `rebind`, fail fast.
4. Resolve token:
   - read env via `telegram.tokenEnvKey`
   - if missing and interactive: prompt user for bot token (in-memory only)
   - if missing and non-interactive: fail and print fixes (set env / pass CLI token / use interactive mode)
5. Call Telegram `getMe` to fetch bot identity.
6. Decide webhook source:
   - if `--webhook-url` provided: use it
   - else if `--funnel auto`: run Funnel setup and derive HTTPS webhook URL
   - else if `--funnel off`: skip Funnel
   - else (interactive): ask whether to enable Funnel
7. If webhook URL is available, call `setWebhook` (+ optional secret).
8. Generate `pairingId` + PIN + TTL; print bot link `https://t.me/<bot>?start=pair_<pairingId>`.
9. User opens bot chat and sends PIN.
10. Validate pairing (pairingId, pin, expiry, attempts) and persist single `allowedChatId`.
11. Persist config updates (enabled/token env key/bind settings/webhook URL if available).

## Rebind Flow (`auq config telegram rebind`)
- Same as init, but allows replacing existing whitelist chat.
- Default behavior remains explicit: only `rebind` may overwrite `allowedChatId`.

## Funnel Integration Behavior
- `funnel=auto` path performs preflight checks (`tailscale` binary, login/status, permission).
- Same-port overwrite is allowed when auto mode is selected.
- If Funnel setup fails:
  - do not block pairing completion
  - report `telegram.ready=false` with exact remediation commands
  - keep webhook unset unless an explicit `--webhook-url` is present

## Runtime Flow
1. `ask_user_questions` creates session.
2. If `telegram.enabled`, send one Telegram message per question with inline keyboard.
3. Callback handling validates chat whitelist and session state.
4. First valid submission writes answer through session manager; later writes are rejected deterministically.
5. On completion:
   - remove inline keyboard (`editMessageReplyMarkup` empty)
   - edit message body to summary-only format (question + submitted option)

## TUI Quick Toggle Flow
- Add `[T] Telegram` to TUI footer quick actions.
- Press `T` behavior:
  - If Telegram is not fully configured, open Telegram setup flow and auto-enable on success.
  - If Telegram is configured, toggle `telegram.enabled` and show status toast.
- When enabling Telegram from TUI, immediately run active-session reconciliation.

## Active Session Reconciliation on Telegram Enable
- Scope of `active quz`: not completed and not expired (`waiting` / `partial`).
- Trigger points:
  - TUI `T` enables Telegram
  - `auq config telegram init|rebind` completes and enables Telegram
- Reconciliation actions:
  - Add: active session without Telegram message mapping -> create Telegram messages
  - Update: active session with existing mapping -> edit Telegram messages to latest prompt/options/progress
  - Remove: mapped message for non-active session -> keep message, remove buttons, convert to summary-only content

## Data Model
`telegram` config fields:
- `enabled: boolean`
- `tokenEnvKey: string`
- `allowedChatId: string`
- `webhookUrl: string`
- `bindHost: "0.0.0.0"`
- `bindPort: number`

Persistent Telegram message mapping store (new file):
- `sessionId`
- `questionIndex`
- `chatId`
- `messageId`
- `lastSyncedHash`
- `state` (`active` | `completed` | `stale`)

## Error Handling
- Invalid token / `getMe` failure: setup aborts with actionable hint.
- Missing token in non-interactive mode: fail fast with explicit alternatives.
- Unauthorized chat: reject callback.
- Expired/used pin: reject pairing.
- Webhook unavailable: setup can still complete pairing; webhook state clearly reported.

## Security
- Token is never persisted in config.
- Single-chat whitelist enforced for callback writes.
- Pairing artifacts are one-time and TTL-bound.
- Rebind path is explicit and auditable.
