#!/usr/bin/env bun
/**
 * Ask User Questions CLI Runner
 *
 * A Bun executable TypeScript CLI for running interactive user questions.
 *
 * Usage:
 *   bun skills/ask-user-questions/scripts/ask.ts '{"questions": [...]}'
 *   echo '{"questions": [...]}' | bun skills/ask-user-questions/scripts/ask.ts
 *
 * Example:
 *   bun skills/ask-user-questions/scripts/ask.ts '{"questions": [{"prompt": "Which language?", "title": "Lang", "options": [{"label": "TypeScript"}, {"label": "Python"}], "multiSelect": false}]}'
 */

// Type definitions for the question format
type Option = {
  label: string;
  description?: string;
};

type Question = {
  prompt: string;
  title: string;
  options: Option[];
  multiSelect?: boolean;
};

type InputPayload = {
  questions: Question[];
};

/**
 * Validates that the input has a valid 'questions' array
 */
function validateInput(input: unknown): input is InputPayload {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const payload = input as Record<string, unknown>;

  if (!Array.isArray(payload.questions)) {
    return false;
  }

  // Validate each question has required fields
  for (const q of payload.questions) {
    if (typeof q !== "object" || q === null) {
      return false;
    }

    const question = q as Record<string, unknown>;

    if (typeof question.prompt !== "string") {
      return false;
    }

    if (typeof question.title !== "string") {
      return false;
    }

    if (!Array.isArray(question.options)) {
      return false;
    }

    // Validate options
    for (const opt of question.options) {
      if (typeof opt !== "object" || opt === null) {
        return false;
      }

      const option = opt as Record<string, unknown>;

      if (typeof option.label !== "string") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Reads all data from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }

  const decoder = new TextDecoder();
  return chunks.map((chunk) => decoder.decode(chunk)).join("");
}

/**
 * Executes bunx auq ask with the JSON payload
 */
async function executeAsk(payload: InputPayload): Promise<unknown> {
  const proc = Bun.spawn({
    cmd: ["bunx", "auq", "ask"],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  // Write the payload to stdin
  const writer = proc.stdin.getWriter();
  await writer.write(JSON.stringify(payload));
  await writer.close();

  // Wait for the process to complete
  const exitCode = await proc.exited;

  // Read stdout
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  if (exitCode !== 0) {
    throw new Error(`auq ask failed with exit code ${exitCode}: ${stderr}`);
  }

  // Parse and return the result
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout.trim();
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    let inputStr: string;

    // Check if input is provided as CLI argument
    const args = process.argv.slice(2);

    if (args.length > 0) {
      // Use CLI argument
      inputStr = args[0];
      console.error("[ask] Reading input from CLI argument");
    } else {
      // Read from stdin
      console.error("[ask] Reading input from stdin...");
      inputStr = await readStdin();
    }

    // Trim whitespace
    inputStr = inputStr.trim();

    if (!inputStr) {
      console.error("[ask] Error: No input provided");
      console.error("[ask] Usage: bun ask.ts '{\"questions\": [...]}'");
      console.error("[ask]    or: echo '{\"questions\": [...]}' | bun ask.ts");
      process.exit(1);
    }

    // Parse JSON
    let input: unknown;
    try {
      input = JSON.parse(inputStr);
    } catch (err) {
      console.error("[ask] Error: Invalid JSON input");
      console.error(
        `[ask] ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }

    // Validate input
    if (!validateInput(input)) {
      console.error("[ask] Error: Invalid input format");
      console.error(
        '[ask] Expected: {"questions": [{"prompt": "...", "title": "...", "options": [{"label": "..."}], "multiSelect": false}]}',
      );
      process.exit(1);
    }

    console.error(`[ask] Processing ${input.questions.length} question(s)...`);

    // Execute the ask command
    const result = await executeAsk(input);

    // Output result to stdout as JSON
    console.log(JSON.stringify(result));

    console.error("[ask] Done");
    process.exit(0);
  } catch (err) {
    console.error(
      "[ask] Error:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}

// Run the main function
main();
