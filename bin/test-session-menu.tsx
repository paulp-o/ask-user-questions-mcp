import { render, Box, Text } from "ink";
#!/usr/bin/env node
import React from "react";

import type { SessionRequest } from "../src/session/types.js";

import { SessionSelectionMenu } from "../src/tui/components/SessionSelectionMenu.js";

const TestSessionMenu: React.FC = () => {
  const [selectedSession, setSelectedSession] = React.useState<{
    sessionId: string;
    sessionRequest: SessionRequest;
  } | null>(null);

  if (selectedSession) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">
          ✓ Session Selected!
        </Text>
        <Box marginTop={1} />
        <Text>Session ID: {selectedSession.sessionId}</Text>
        <Text>
          Questions: {selectedSession.sessionRequest.questions.length}
        </Text>
        <Box marginTop={1} />
        <Text dimColor>
          Integration with StepperView will happen in the next subtask (7.5)
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          SessionSelectionMenu Component Test
        </Text>
      </Box>
      <SessionSelectionMenu
        onSessionSelect={(sessionId, sessionRequest) => {
          setSelectedSession({ sessionId, sessionRequest });
        }}
      />
    </Box>
  );
};

render(<TestSessionMenu />);
