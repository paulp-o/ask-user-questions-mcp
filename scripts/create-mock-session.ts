/**
 * Helper script to create mock sessions for testing the SessionSelectionMenu
 * Usage: npx tsx scripts/create-mock-session.ts [count]
 */

import type { Question } from "../src/session/types.js";

import { SessionManager } from "../src/session/SessionManager.js";

const mockQuestionSets: Question[][] = [
  [
    {
      options: [
        { description: "Dynamic scripting language", label: "JavaScript" },
        { description: "Type-safe JavaScript", label: "TypeScript" },
        { description: "High-level interpreted language", label: "Python" },
      ],
      prompt: "Which programming language do you prefer?",
      title: "Language",
    },
    {
      options: [
        { description: "UI library from Facebook", label: "React" },
        { description: "Progressive framework", label: "Vue" },
      ],
      prompt: "Which framework do you want to use?",
      title: "Framework",
    },
  ],
  [
    {
      options: [
        { description: "Relational database", label: "PostgreSQL" },
        { description: "NoSQL database", label: "MongoDB" },
      ],
      prompt: "Which database system?",
      title: "Database",
    },
  ],
  [
    {
      options: [
        { description: "Serverless platform", label: "Vercel" },
        { description: "Amazon Web Services", label: "AWS" },
        { description: "Your own servers", label: "Self-hosted" },
      ],
      prompt: "Where will you deploy?",
      title: "Hosting",
    },
    {
      options: [
        { label: "GitHub Actions" },
        { label: "GitLab CI" },
        { label: "CircleCI" },
      ],
      prompt: "Which CI/CD tool?",
      title: "CI/CD",
    },
    {
      options: [{ label: "Vitest" }, { label: "Jest" }, { label: "Mocha" }],
      prompt: "Testing framework?",
      title: "Testing",
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
      `✓ Created session ${i + 1}/${count}: ${sessionId} (${questions.length} questions)`,
    );

    // Add delay between sessions to show different timestamps
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Successfully created ${count} mock session(s)`);
  console.log(
    `\nRun 'npx tsx bin/test-session-menu.tsx' to test the SessionSelectionMenu`,
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
