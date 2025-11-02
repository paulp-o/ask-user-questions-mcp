#!/usr/bin/env node
import React, { useState } from "react";
import { render } from "ink";
import { SessionSelectionMenu } from "../src/tui/components/SessionSelectionMenu.js";
import { StepperView } from "../src/tui/components/StepperView.js";
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

  // Phase 2: Question answering with StepperView
  const { sessionId, sessionRequest } = selectedSession;

  return (
    <StepperView sessionId={sessionId} sessionRequest={sessionRequest} />
  );
};

render(<App />);
