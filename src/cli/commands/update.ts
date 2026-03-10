/**
 * CLI Update Command — `auq update`
 *
 * Checks for available updates, displays changelog, and installs
 * the latest version using the detected package manager.
 */

import { createInterface } from "node:readline";

import { UpdateChecker } from "../../update/checker.js";
import { fetchChangelog } from "../../update/changelog.js";
import { detectPackageManager } from "../../update/package-manager.js";
import { installUpdate, getManualCommand } from "../../update/installer.js";
import { parseFlags } from "../utils.js";

/**
 * Prompt the user for input via readline.
 *
 * Uses stderr for the question text to keep stdout clean for piping.
 */
function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Run the `auq update` command.
 *
 * Usage:
 *   auq update           Check for updates and install interactively
 *   auq update -y        Check and install without confirmation
 *   auq update --yes     Same as -y
 *   auq update --json    Output result as JSON
 */
export async function runUpdateCommand(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);
  const jsonMode = flags.json === true;
  // parseFlags only handles --flag; check raw args for short -y flag
  const skipPrompt = flags.yes === true || args.includes("-y");

  // 1. Check for updates (blocking, with status output)
  process.stderr.write("Checking for updates...\n");

  const checker = new UpdateChecker();
  let result;
  try {
    result = await checker.check();
  } catch {
    const msg = "Unable to check for updates. Please check your network connection.";
    if (jsonMode) {
      console.log(JSON.stringify({ success: false, error: msg }, null, 2));
    } else {
      process.stderr.write(`\u274c ${msg}\n`);
    }
    process.exitCode = 1;
    return;
  }

  // 2. If no update available
  if (!result) {
    const version = checker["currentVersion"];
    const msg = `Already up to date (v${version})`;
    if (jsonMode) {
      console.log(
        JSON.stringify(
          { success: true, upToDate: true, currentVersion: version },
          null,
          2,
        ),
      );
    } else {
      process.stderr.write(`\u2714 ${msg}\n`);
    }
    return;
  }

  // 3. Display update info
  process.stderr.write(
    `\nUpdate available: ${result.currentVersion} \u2192 ${result.latestVersion} (${result.updateType})\n`,
  );

  // 4. Fetch and display changelog
  const changelog = await fetchChangelog(result.latestVersion);
  if (changelog.content) {
    process.stderr.write(`\nChangelog:\n${changelog.content}\n`);
  } else {
    process.stderr.write(`\nView changelog: ${changelog.fallbackUrl}\n`);
  }

  // 5. Breaking change warning for major updates
  if (result.updateType === "major") {
    process.stderr.write(
      "\n\u26a0  Breaking changes may be included in this major version update.\n",
    );
  }

  // 6. Confirmation prompt (unless --yes/-y)
  if (!skipPrompt) {
    const answer = await prompt("\nInstall update? (Y/n): ");
    const trimmed = answer.trim().toLowerCase();
    if (trimmed !== "" && trimmed !== "y" && trimmed !== "yes") {
      process.stderr.write("Update cancelled.\n");
      return;
    }
  }

  // 7. Detect package manager and show what will run
  const pm = detectPackageManager();
  const manualCmd = getManualCommand(pm);
  process.stderr.write(`\nInstalling with ${pm.name}: ${manualCmd}\n`);

  // 8. Execute installation
  const success = await installUpdate(pm);

  if (success) {
    const msg = "Update complete! Please restart auq.";
    if (jsonMode) {
      console.log(
        JSON.stringify(
          {
            success: true,
            upToDate: false,
            previousVersion: result.currentVersion,
            installedVersion: result.latestVersion,
          },
          null,
          2,
        ),
      );
    } else {
      process.stderr.write(`\u2705 ${msg}\n`);
    }
  } else {
    const msg = `Update failed. Run manually: ${manualCmd}`;
    if (jsonMode) {
      console.log(
        JSON.stringify(
          { success: false, error: "Installation failed", manualCommand: manualCmd },
          null,
          2,
        ),
      );
    } else {
      process.stderr.write(`\u274c ${msg}\n`);
    }
    process.exitCode = 1;
  }
}