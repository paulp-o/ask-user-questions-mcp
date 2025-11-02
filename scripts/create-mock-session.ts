/**
 * Helper script to create mock sessions for testing the SessionSelectionMenu
 * Usage: npx tsx scripts/create-mock-session.ts [count]
 */

import { SessionManager } from "../src/session/SessionManager.js";
import type { Question } from "../src/session/types.js";

const mockQuestionSets: Question[][] = [
  [
    {
      title: "Language",
      prompt: "Which programming language do you prefer?",
      options: [
        { label: "JavaScript", description: "Dynamic scripting language" },
        { label: "TypeScript", description: "Type-safe JavaScript" },
        { label: "Python", description: "High-level interpreted language" },
      ],
    },
    {
      title: "Framework",
      prompt: "Which framework do you want to use?",
      options: [
        { label: "React", description: "UI library from Facebook" },
        { label: "Vue", description: "Progressive framework" },
      ],
    },
  ],
  [
    {
      title: "Database",
      prompt: "Which database system?",
      options: [
        { label: "PostgreSQL", description: "Relational database" },
        { label: "MongoDB", description: "NoSQL database" },
      ],
    },
  ],
  [
    {
      title: "Hosting",
      prompt: "Where will you deploy?",
      options: [
        { label: "Vercel", description: "Serverless platform" },
        { label: "AWS", description: "Amazon Web Services" },
        { label: "Self-hosted", description: "Your own servers" },
      ],
    },
    {
      title: "CI/CD",
      prompt: "Which CI/CD tool?",
      options: [
        { label: "GitHub Actions" },
        { label: "GitLab CI" },
        { label: "CircleCI" },
      ],
    },
    {
      title: "Testing",
      prompt: "Testing framework?",
      options: [{ label: "Vitest" }, { label: "Jest" }, { label: "Mocha" }],
    },
  ],
];

async function createMockSessions(count: number) {
  const manager = new SessionManager();
  await manager.initialize();

  console.log(`Creating ${count} mock session(s)...`);

  for (let i = 0; i < count; i++) {
    const questions = mockQuestionSets[i % mockQuestionSets.length];
    const sessionId = await manager.createSession(questions);

    console.log(
      `✓ Created session ${i + 1}/${count}: ${sessionId} (${questions.length} questions)`
    );

    // Add delay between sessions to show different timestamps
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Successfully created ${count} mock session(s)`);
  console.log(
    `\nRun 'npx tsx bin/test-session-menu.tsx' to test the SessionSelectionMenu`
  );
}

// Parse count from command line args (default: 3)
const count = parseInt(process.argv[2] || "3", 10);
if (isNaN(count) || count < 1) {
  console.error("Usage: npx tsx scripts/create-mock-session.ts [count]");
  console.error("  count: number of sessions to create (default: 3)");
  process.exit(1);
}

createMockSessions(count).catch((error) => {
  console.error("Error creating mock sessions:", error);
  process.exit(1);
});
