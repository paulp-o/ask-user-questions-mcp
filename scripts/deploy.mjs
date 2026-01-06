#!/usr/bin/env node
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const rootDir = resolve(process.cwd());
const version = process.argv[2];

if (!version) {
  console.error("Usage: node scripts/deploy.mjs <version>");
  process.exit(1);
}

const run = (command, options = {}) => {
  console.log(`[deploy] ${command}`);
  execSync(command, { stdio: "inherit", ...options });
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, data) => {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const ensureCleanGit = () => {
  const status = execSync("git status --porcelain", {
    encoding: "utf8",
  }).trim();
  if (status.length > 0) {
    console.error("Git working tree is not clean. Commit or stash first.");
    process.exit(1);
  }
};

const updateVersion = (path) => {
  const pkg = readJson(path);
  pkg.version = version;
  writeJson(path, pkg);
};

const rootPkgPath = resolve(rootDir, "package.json");
const pluginPkgPath = resolve(
  rootDir,
  "packages/opencode-plugin/package.json",
);

ensureCleanGit();

updateVersion(rootPkgPath);
updateVersion(pluginPkgPath);

run("npm install");
run("npm run build");
run("npm run -w packages/opencode-plugin build");

run("git add package.json package-lock.json packages/opencode-plugin/package.json");
run(`git commit -m "chore(release): v${version}"`);
run(`git tag v${version}`);

run("npm publish");
run("npm publish -w packages/opencode-plugin --access public");

run("git push origin HEAD --tags");
run(`gh release create v${version} --generate-notes`);
