#!/usr/bin/env node
import React, { useState } from "react";
import { render, Box, Text } from "ink";
import { SessionSelectionMenu } from "../src/tui/components/SessionSelectionMenu.js";
import { TabBar } from "../src/tui/components/TabBar.js";
import type { SessionRequest } from "../src/session/types.js";

const App: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<{
    sessionId: string;
    sessionRequest: SessionRequest;
  } | null>(null);

  // Phase 1: Session selection
  if (!selectedSession) {
    return (
      <SessionSelectionMenu
        onSessionSelect={(sessionId, sessionRequest) => {
          setSelectedSession({ sessionId, sessionRequest });
        }}
      />
    );
  }

  // Phase 2: Question display (placeholder for Task 7.5)
  const { sessionId, sessionRequest } = selectedSession;

  return (
    <Box flexDirection="column" padding={1}>
      {/* TabBar showing all question titles */}
      <TabBar
        questions={sessionRequest.questions}
        currentIndex={0} // TODO: Will be dynamic in 7.5
      />

      <Box marginTop={1} borderStyle="single" padding={1}>
        <Text bold>Session: {sessionId}</Text>
        <Box marginTop={1} />
        <Text color="yellow">
          Question navigation and answering UI coming in Task 7.5...
        </Text>
        <Box marginTop={1} />
        <Text dimColor>Questions:</Text>
        {sessionRequest.questions.map((q, idx) => (
          <Text key={idx} dimColor>
            {idx + 1}. {q.title || `Q${idx + 1}`}: {q.prompt}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press q to quit</Text>
      </Box>
    </Box>
  );
};

render(<App />);
