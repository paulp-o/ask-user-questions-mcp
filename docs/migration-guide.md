# Migration Guide: v3.x → v4.x

Welcome to `auq-mcp-server` v4.0.0! This guide explains what's changed and how to upgrade.

## TL;DR: CLI Users

**Good news**: If you're using the CLI/TUI, **nothing changes**. The `auq-mcp-server` npm package works exactly like v3.x:

```bash
npm install auq-mcp-server@4.0.0
auq                          # Still works the same way
```

The CLI publishes from `packages/cli` in the monorepo, but the npm package name and behavior are identical.

---

## What's New in v4.0.0

### 1. **Monorepo Architecture**

The project is now a **Turborepo monorepo** with three packages:

- **`@auq/core`** — Shared business logic (SessionManager, StorageAdapter, schemas)
- **`auq-mcp-server`** (CLI) — Terminal/STDIO interface (published on npm)
- **`@auq/web`** (internal) — Optional web dashboard with HTTP MCP transport

### 2. **Web Dashboard**

**New feature**: Answer MCP questions via a browser dashboard instead of the terminal.

```
                  MCP Client (STDIO)          MCP Client (HTTP)
                       │                              │
                  ┌────┴────┐                 ┌──────┴──────┐
                  ▼         ▼                 ▼             ▼
            CLI (TUI)  → [core logic] ← web server (Next.js)
            FileStore                    SQLiteStore
```

### 3. **Storage Architecture**

Previously: File-based sessions only (`~/.local/share/auq/sessions/`)

Now: **Pluggable storage via StorageAdapter interface**

- **CLI uses FileStore** — Sessions stored as JSON files (unchanged)
- **Web uses SQLiteStore** — Sessions stored in SQLite database
- **Same SessionManager code** — Shared between CLI and web

### 4. **MCP Transports**

- **CLI**: STDIO transport (unchanged)
- **Web**: Streamable HTTP transport (`POST /api/mcp`)

---

## Breaking Changes

### SessionManager Constructor (Developers Only)

If you're using `SessionManager` programmatically in custom code:

**v3.x:**

```typescript
const manager = new SessionManager(sessionsDir);
```

**v4.x:**

```typescript
import { SessionManager } from "@auq/core";
import { FileStore } from "@auq/core";

const store = new FileStore(sessionsDir);
await store.initialize();

const events = new EventEmitter();
const manager = new SessionManager(store, events);
```

**Why**: Separates storage (pluggable) from session logic.

### Package Structure

If you import directly from internal files:

**v3.x:**

```typescript
import { SessionManager } from "auq-mcp-server/dist/session";
```

**v4.x:**

```typescript
// Use the public API instead
import { SessionManager } from "@auq/core";
```

Public exports from `@auq/core`:

- `SessionManager`
- `StorageAdapter` (interface)
- `FileStore`
- Session types and schemas

---

## Upgrade Instructions

### For CLI Users (No Changes)

Simply update the package:

```bash
npm install auq-mcp-server@4.0.0
```

Or globally:

```bash
npm install -g auq-mcp-server@4.0.0
auq                 # Works exactly like before
```

**Backward compatibility**: All existing sessions are preserved.

### For Custom Code Using SessionManager

Update your imports and code:

```typescript
// Old (v3.x)
import { SessionManager } from "auq-mcp-server";
const manager = new SessionManager("~/.local/share/auq/sessions");

// New (v4.x)
import { SessionManager, FileStore } from "@auq/core";
import { EventEmitter } from "events";

const store = new FileStore("~/.local/share/auq/sessions");
await store.initialize();

const events = new EventEmitter();
const manager = new SessionManager(store, events);

// Listen to events
events.on("session:created", (session) => {
  console.log("New session:", session.id);
});
```

### For Running the Web Dashboard (New)

See [Web Setup Guide](./web-setup.md).

---

## Session Migration (Auto-Handled)

If you switch from CLI to web server:

**Problem**: You have old v3.x sessions in `~/.local/share/auq/sessions/`; you want to try the web dashboard.

**Solution**: The web server **automatically detects and imports** existing sessions on first run.

1. Start the web server for the first time
2. It checks for file-based sessions
3. Imports them into SQLite (preserves session IDs and answers)
4. Logs migration status
5. You can delete the old files manually afterward

**No data loss** — all existing sessions are available in the web dashboard.

---

## Testing Your Upgrade

### CLI Still Works

```bash
# Start the CLI (TUI)
auq

# In another terminal, ask a question via STDIO
# (your MCP client behavior is unchanged)
```

### New Web Dashboard (Optional)

```bash
# From the project root or web directory
bun run dev:web       # Starts Next.js at http://localhost:3000

# Or inside packages/web/
cd packages/web
bun run dev           # Same thing
```

### What to Expect

✅ **CLI/TUI** — Identical experience to v3.x  
✅ **File-based sessions** — Still stored in `~/.local/share/auq/sessions/`  
✅ **STDIO MCP** — Unchanged behavior  
✅ **Web dashboard** — New optional interface at `http://localhost:3000`  
✅ **HTTP MCP** — New optional transport at `/api/mcp`

---

## Rollback Plan

If you need to go back to v3.x:

```bash
npm install auq-mcp-server@3
```

Your file-based sessions remain in `~/.local/share/auq/sessions/` and are compatible with both versions. If you used the web server (SQLite), keep the database file at `~/.local/share/auq/sessions.db` — it won't affect the CLI.

---

## FAQ

### Q: Do I need to change how I use the CLI?

**A**: No. The `auq` command works exactly like v3.x.

### Q: Will my existing sessions be lost?

**A**: No. File-based sessions in `~/.local/share/auq/sessions/` are automatically preserved. If you use the web server, they're auto-imported to SQLite.

### Q: Can CLI and web server both run?

**A**: Yes! They can run simultaneously in separate terminals:

```bash
# Terminal 1
bun run dev:cli       # CLI with STDIO

# Terminal 2
bun run dev:web       # Web dashboard on :3000
```

Both access the same session storage (though via different adapters — file vs database).

### Q: Where are sessions stored now?

**A**:

- **CLI**: `~/.local/share/auq/sessions/` (JSON files) — unchanged
- **Web**: `~/.local/share/auq/sessions.db` (SQLite) — new

### Q: Can I use the web dashboard without running the CLI?

**A**: Yes. The web server is independent and starts a separate MCP server at `POST /api/mcp`.

### Q: Is the web dashboard production-ready?

**A**: This is the first release. It's feature-complete (session list, answer questions, history) but not battle-tested. Test thoroughly before production use.

### Q: What if I have custom code depending on auq-mcp-server internals?

**A**: Update imports to use `@auq/core` (the public API). See "Breaking Changes" section above.

---

## Support

For issues or questions:

- 🐛 **Bug reports**: [GitHub Issues](https://github.com/paulp-o/ask-user-questions-mcp/issues)
- 📚 **More docs**:
  - [Web Setup Guide](./web-setup.md)
  - [API Documentation](./api.md)
  - [Architecture Guide](./architecture.md)
