#!/usr/bin/env node

/**
 * Post-install script for auq-mcp-server
 * Provides instructions for setting up shell aliases
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

// Check if this is a global installation
const isGlobal = process.env.npm_config_global === "true";

// POSIX keeps the checked-in Bun-first shell launcher, which also works when
// Bun skips install hooks. Windows npm shims need the Node launcher. Avoid
// rewriting a contributor's checkout when this is the root project's install.
const isRootProjectInstall =
  path.resolve(process.env.INIT_CWD ?? process.cwd()) === process.cwd();
if (process.platform === "win32" && !isRootProjectInstall) {
  const launcher = path.join(__dirname, "../bin/auq");
  fs.copyFileSync(path.join(__dirname, "auq-node.mjs"), launcher);
  fs.chmodSync(launcher, 0o755);
}

if (!isGlobal) {
  // Local install - no setup needed
  process.exit(0);
}

// Detect if installed via Bun
const isBun = process.env.BUN_INSTALL || typeof Bun !== "undefined";
const runCmd = isBun ? "bunx --bun" : "npx";

console.log("\n✅ AUQ MCP Server installed successfully!\n");
console.log("📝 Optional: Set up shell aliases for convenience\n");

const homeDir = os.homedir();
const shell = process.env.SHELL || "";

// Determine shell config file
let configFile = "";
let aliasCommand = "";

if (shell.includes("zsh")) {
  configFile = path.join(homeDir, ".zshrc");
  aliasCommand = `alias auq="${runCmd} auq-mcp-server"`;
} else if (shell.includes("bash")) {
  configFile = path.join(homeDir, ".bashrc");
  aliasCommand = `alias auq="${runCmd} auq-mcp-server"`;
} else if (shell.includes("fish")) {
  configFile = path.join(homeDir, ".config/fish/config.fish");
  aliasCommand = `alias auq "${runCmd} auq-mcp-server"`;
}

if (configFile) {
  console.log(
    `To set up a shell alias, add this to your ${path.basename(configFile)}:\n`,
  );
  console.log(`  ${aliasCommand}\n`);
  console.log(`Then restart your terminal or run: source ${configFile}\n`);
} else {
  console.log("To set up a shell alias, add this to your shell config:\n");
  console.log(`  alias auq="${runCmd} auq-mcp-server"\n`);
  console.log("Then restart your terminal.\n");
}

console.log("For MCP server setup with Claude Desktop or Cursor, see:");
console.log("  https://github.com/paulp-o/ask-user-questions-mcp#setup\n");
