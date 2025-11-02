import { render } from "ink";
#!/usr/bin/env node
import React, { useState } from "react";

import type { SessionRequest } from "../src/session/types.js";

import { SessionSelectionMenu } from "../src/tui/components/SessionSelectionMenu.js";
import { StepperView } from "../src/tui/components/StepperView.js";

const App: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<{
    sessionId: string;
    sessionRequest: SessionRequest;
  } | null>(null);

  // Phase 1: Question set selection
  if (!selectedSession) {
    return (
      <SessionSelectionMenu
        onSessionSelect={(sessionId, sessionRequest) => {
          setSelectedSession({ sessionId, sessionRequest });
        }}
      />
    );
  }

  // Phase 2: Question answering with StepperView
  const { sessionId, sessionRequest } = selectedSession;

  return <StepperView sessionId={sessionId} sessionRequest={sessionRequest} />;
};

render(<App />);
