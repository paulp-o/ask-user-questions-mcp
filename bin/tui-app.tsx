import { Box, render, Text, useInput } from "ink";
import { promises as fs } from "fs";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AUQConfig } from "../src/config/types.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { SessionRequest } from "../src/session/types.js";
import type { SessionUIState } from "../src/tui/shared/types.js";

import {
  ensureDirectoryExists,
  getSessionDirectory,
} from "../src/session/utils.js";
import { Header } from "../src/tui/components/Header.js";
import { SessionDots } from "../src/tui/components/SessionDots.js";
import { SessionPicker } from "../src/tui/components/SessionPicker.js";
import { StepperView } from "../src/tui/components/StepperView.js";
import { ThemeIndicator } from "../src/tui/components/ThemeIndicator.js";
import { Toast } from "../src/tui/components/Toast.js";
import { WaitingScreen } from "../src/tui/components/WaitingScreen.js";
import {
  createNotificationBatcher,
  showProgress,
  clearProgress,
  calculateProgress,
  checkLinuxDependencies,
  type NotificationBatcher,
} from "../src/tui/notifications/index.js";
import { createTUIWatcher } from "../src/tui/session-watcher.js";
import type { PendingSessionMeta } from "../src/tui/session-watcher.js";
import {
  isSessionStale,
  isSessionAbandoned,
  formatStaleToastMessage,
} from "../src/tui/shared/utils/staleDetection.js";
import { ThemeProvider } from "../src/tui/ThemeProvider.js";
import { ConfigProvider } from "../src/tui/ConfigContext.js";
import {
  getAdjustedIndexAfterRemoval,
  getDirectJumpIndex,
  getNextSessionIndex,
  getPrevSessionIndex,
} from "../src/tui/shared/utils/sessionSwitching.js";
import {
  UpdateChecker,
  fetchChangelog,
  installUpdate,
  detectPackageManager,
  readCache,
  writeCache,
} from "../src/update/index.js";
import type { UpdateInfo } from "../src/update/types.js";
import { UpdateOverlay } from "../src/tui/components/UpdateOverlay.js";
import { KEYS } from "../src/tui/constants/keybindings.js";

type AppState = { mode: "PROCESSING" } | { mode: "WAITING" };

interface SessionData {
  sessionId: string;
  sessionRequest: SessionRequest;
  timestamp: Date;
}

interface ToastData {
  message: string;
  type: "success" | "error" | "info";
  title?: string;
}

interface AppProps {
  config?: AUQConfig;
}

const App: React.FC<AppProps> = ({ config }) => {
  const [state, setState] = useState<AppState>({ mode: "WAITING" });
  const [sessionQueue, setSessionQueue] = useState<SessionData[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [sessionUIStates, setSessionUIStates] = useState<
    Record<string, SessionUIState>
  >({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showSessionLog, setShowSessionLog] = useState(true);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [isInReviewOrRejection, setIsInReviewOrRejection] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<Map<string, { status: string; createdAt: string }>>(new Map());
  const [lastInteractions, setLastInteractions] = useState<Map<string, number>>(new Map());
  const [staleToastShown, setStaleToastShown] = useState<Set<string>>(new Set());
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateOverlay, setShowUpdateOverlay] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [changelogContent, setChangelogContent] = useState<string | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Get session directory for logging
  const sessionDir = getSessionDirectory();

  // Notification configuration from config
  const notificationConfig = useMemo(
    () => config?.notifications ?? { enabled: true, sound: true },
    [config?.notifications],
  );

  // Create notification batcher (memoized to persist across renders)
  const notificationBatcherRef = useRef<NotificationBatcher | null>(null);
  if (!notificationBatcherRef.current) {
    notificationBatcherRef.current =
      createNotificationBatcher(notificationConfig);
  }

  // Auto-hide session log after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSessionLog(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);


  // Initialize: Load existing sessions + start persistent watcher
  useEffect(() => {
    let watcherInstance: null | ReturnType<typeof createTUIWatcher> = null;

    const initialize = async () => {
      try {
        // Step 0: Ensure session directory exists
        await ensureDirectoryExists(sessionDir);

        // Step 0.5: Check Linux dependencies for native notifications
        await checkLinuxDependencies();

        // Step 1: Load existing pending sessions
        const watcher = createTUIWatcher();
        const sessionIds = await watcher.getPendingSessions();
        const sessionsWithStatus = await watcher.getPendingSessionsWithStatus();

        const sessionData = await Promise.all(
          sessionIds.map(async (sessionId) => {
            const sessionRequest = await watcher.getSessionRequest(sessionId);
            if (!sessionRequest) return null;

            return {
              sessionId,
              sessionRequest,
              timestamp: new Date(sessionRequest.timestamp),
            };
          }),
        );

        // Filter out null entries and sort by timestamp (FIFO - oldest first)
        const validSessions = sessionData
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        setSessionQueue(validSessions);

        // Build initial sessionMeta from status data
        const initialMeta = new Map<string, { status: string; createdAt: string }>();
        for (const meta of sessionsWithStatus) {
          initialMeta.set(meta.sessionId, { status: meta.status, createdAt: meta.createdAt });
        }
        setSessionMeta(initialMeta);
        setIsInitialized(true);

        // Step 2: Start persistent watcher for new sessions
        watcherInstance = createTUIWatcher({ autoLoadData: true });
        watcherInstance.startEnhancedWatching((event) => {
          // Add new session to queue (FIFO - append to end)
          setSessionQueue((prev) => {
            // Check for duplicates
            if (prev.some((s) => s.sessionId === event.sessionId)) {
              return prev;
            }

            // Queue notification for new session (batched)
            if (notificationBatcherRef.current) {
              notificationBatcherRef.current.queue(event.sessionId);
            }

            // Add to end of queue
            return [
              ...prev,
              {
                sessionId: event.sessionId,
                sessionRequest: event.sessionRequest!,
                timestamp: new Date(event.timestamp),
              },
            ];
          });
        });
      } catch (error) {
        console.error("Failed to initialize:", error);
        setIsInitialized(true); // Continue even if initialization fails
      }
    };

    initialize();

    // Cleanup: stop watcher and cancel notifications on unmount
    return () => {
      if (watcherInstance) {
        watcherInstance.stop();
      }
      if (notificationBatcherRef.current) {
        notificationBatcherRef.current.cancel();
      }
      // Clear progress bar on unmount
      clearProgress(notificationConfig);
    };
  }, [notificationConfig]);

  // ── Auto-update checker ─────────────────────────────────────
  useEffect(() => {
    // Skip update checks if disabled
    if (config?.updateCheck === false) return;
    if (process.env.NO_UPDATE_NOTIFIER === "1") return;
    if (process.env.CI === "true" || process.env.CI === "1") return;
    if (process.env.NODE_ENV === "test") return;
    if (!process.stdout.isTTY) return;

    const checker = new UpdateChecker();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const runCheck = async () => {
      try {
        const result = await checker.check();
        if (result) {
          setUpdateInfo(result);

          // Fetch changelog for the overlay
          const changelog = await fetchChangelog(result.latestVersion);
          setChangelogContent(changelog.content);

          // Auto-action based on update type
          if (result.updateType === "patch" && !updateDismissed) {
            // Auto-install patch silently
            try {
              const pm = detectPackageManager();
              const success = await installUpdate(pm);
              if (success) {
                setToast({
                  message: `Updated to v${result.latestVersion}. Please restart auq.`,
                  type: "success",
                });
              }
            } catch {
              // Silent — patch auto-install is best-effort
            }
          } else if (!updateDismissed) {
            // Show overlay for minor/major updates
            setShowUpdateOverlay(true);
          }
        }
      } catch {
        // Silently fail — update checks should never break the TUI
      }
    };

    setIsCheckingUpdate(true);
    void runCheck().finally(() => { setIsCheckingUpdate(false); });
    intervalId = setInterval(() => {
      checker.clearCache();
      runCheck();
    }, 3600000); // 1 hour

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [config?.updateCheck]);

  // Auto-transition: WAITING → PROCESSING when queue has items
  useEffect(() => {
    if (!isInitialized) return;

    if (state.mode === "WAITING" && sessionQueue.length > 0) {
      setState({ mode: "PROCESSING" });
      setActiveSessionIndex(0);
      return;
    }

    if (state.mode === "PROCESSING" && sessionQueue.length === 0) {
      setState({ mode: "WAITING" });
      setActiveSessionIndex(0);
    }
  }, [state.mode, sessionQueue.length, isInitialized]);

  // Show toast notification
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
    title?: string,
  ) => {
    setToast({ message, type, title });
  };

  useEffect(() => {
    if (state.mode !== "PROCESSING" || sessionQueue.length <= 1) {
      return;
    }

    let isCancelled = false;
    let isChecking = false;

    const checkPausedSessionStatuses = async () => {
      if (isCancelled || isChecking) {
        return;
      }

      isChecking = true;

      try {
        const checks = await Promise.all(
          sessionQueue.map(async (session, index) => {
            if (index === activeSessionIndex) {
              return null;
            }

            const statusPath = `${sessionDir}/${session.sessionId}/status.json`;

            try {
              const content = await fs.readFile(statusPath, "utf8");
              const parsed = JSON.parse(content) as {
                status?: string;
              };

              if (
                parsed.status === "timed_out" ||
                parsed.status === "completed" ||
                parsed.status === "rejected"
              ) {
                return {
                  notifyAsTimedOut: parsed.status === "timed_out",
                  session,
                };
              }

              return null;
            } catch {
              return {
                notifyAsTimedOut: true,
                session,
              };
            }
          }),
        );

        if (isCancelled) {
          return;
        }

        const sessionsToRemove = checks.filter(
          (
            entry,
          ): entry is { notifyAsTimedOut: boolean; session: SessionData } =>
            entry !== null,
        );

        if (sessionsToRemove.length === 0) {
          return;
        }

        const timedOutSession = sessionsToRemove.find(
          (entry) => entry.notifyAsTimedOut,
        );
        if (timedOutSession) {
          const title =
            timedOutSession.session.sessionRequest.questions[0]?.title ||
            timedOutSession.session.sessionId.slice(0, 8);
          showToast(`Session '${title}' timed out`, "info");
        }

        const idsToRemove = new Set(
          sessionsToRemove.map((entry) => entry.session.sessionId),
        );

        setSessionUIStates((prev) => {
          const next = { ...prev };
          for (const sessionId of idsToRemove) {
            delete next[sessionId];
          }
          return next;
        });

        setSessionQueue((prev) => {
          let nextQueue = [...prev];
          let nextActiveIndex = activeSessionIndex;

          const removalIndices = Array.from(idsToRemove)
            .map((sessionId) =>
              nextQueue.findIndex((session) => session.sessionId === sessionId),
            )
            .filter((idx) => idx !== -1)
            .sort((a, b) => b - a);

          for (const removalIndex of removalIndices) {
            nextQueue = nextQueue.filter((_, idx) => idx !== removalIndex);
            nextActiveIndex = getAdjustedIndexAfterRemoval(
              removalIndex,
              nextActiveIndex,
              nextQueue.length,
            );
          }

          setActiveSessionIndex(nextActiveIndex);
          setState(
            nextQueue.length === 0
              ? { mode: "WAITING" }
              : { mode: "PROCESSING" },
          );

          return nextQueue;
        });
      } finally {
        isChecking = false;
      }
    };

    const interval = setInterval(() => {
      void checkPausedSessionStatuses();
    }, 2000);

    // --- Stale detection (runs alongside status polling) ---
    const staleThreshold = config?.staleThreshold ?? 7200000;
    const notifyOnStale = config?.notifyOnStale ?? true;

    const runStaleDetection = async () => {
      // Refresh session metadata from disk
      const watcher = createTUIWatcher();
      let freshMeta: PendingSessionMeta[] = [];
      try {
        freshMeta = await watcher.getPendingSessionsWithStatus();
      } catch {
        // Non-critical — stale detection simply skips this cycle
      }

      if (freshMeta.length > 0) {
        setSessionMeta((prev) => {
          const next = new Map(prev);
          for (const meta of freshMeta) {
            next.set(meta.sessionId, { status: meta.status, createdAt: meta.createdAt });
          }
          return next;
        });
      }

      // Show toast for newly stale sessions
      for (const session of sessionQueue) {
        const stale = isSessionStale(
          session.timestamp.getTime(),
          staleThreshold,
          lastInteractions.get(session.sessionId),
        );
        if (stale && notifyOnStale && !staleToastShown.has(session.sessionId)) {
          const title = session.sessionRequest.questions[0]?.title ?? session.sessionId.slice(0, 8);
          showToast(formatStaleToastMessage(title, session.timestamp.getTime()), "info");
          setStaleToastShown((prev) => new Set(prev).add(session.sessionId));
        }
      }
    };

    const staleInterval = setInterval(() => {
      void runStaleDetection();
    }, 2000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      clearInterval(staleInterval);
    };
  }, [activeSessionIndex, sessionDir, sessionQueue, state.mode, config?.staleThreshold, config?.notifyOnStale, lastInteractions, staleToastShown]);

  // Handle progress updates from StepperView
  const handleProgressUpdate = (answered: number, total: number) => {
    const percent = calculateProgress(answered, total);
    showProgress(percent, notificationConfig);
  };

  const handleStateSnapshot = useCallback(
    (sessionId: string, ui: SessionUIState) => {
      setSessionUIStates((prev) => ({
        ...prev,
        [sessionId]: ui,
      }));
      // Track interaction for stale grace time
      setLastInteractions((prev) => new Map(prev).set(sessionId, Date.now()));
    },
    [],
  );

  const handleFlowStateChange = useCallback(
    (flowState: { showReview: boolean; showRejectionConfirm: boolean }) => {
      setIsInReviewOrRejection(
        flowState.showReview || flowState.showRejectionConfirm,
      );
    },
    [],
  );

  // ── Auto-update handlers ────────────────────────────────────
  const handleUpdateInstall = async () => {
    try {
      setIsInstallingUpdate(true);
      setInstallError(null);
      const pm = detectPackageManager();
      const success = await installUpdate(pm);
      if (success) {
        setShowUpdateOverlay(false);
        setToast({
          message: `Updated to v${updateInfo!.latestVersion}. Please restart auq.`,
          type: "success",
        });
        // Exit after short delay so user sees the message
        setTimeout(() => process.exit(0), 2000);
      } else {
        setInstallError("Installation failed. Please try manually.");
      }
      setIsInstallingUpdate(false);
    } catch (err) {
      setIsInstallingUpdate(false);
      setInstallError(
        err instanceof Error ? err.message : "Installation failed",
      );
    }
  };

  const handleSkipVersion = async () => {
    if (updateInfo) {
      try {
        const cache = await readCache();
        if (cache) {
          await writeCache({ ...cache, skippedVersion: updateInfo.latestVersion });
        }
      } catch {
        // Non-critical — skip-version simply won't persist
      }
    }
    setShowUpdateOverlay(false);
    setUpdateInfo(null);
  };

  const handleRemindLater = () => {
    setShowUpdateOverlay(false);
    setUpdateDismissed(true);
  };

  const switchToSession = useCallback(
    (targetIndex: number) => {
      if (state.mode !== "PROCESSING" || sessionQueue.length <= 1) {
        return;
      }

      const clampedIndex = Math.max(
        0,
        Math.min(targetIndex, sessionQueue.length - 1),
      );

      if (clampedIndex === activeSessionIndex) {
        return;
      }

      const targetSession = sessionQueue[clampedIndex];
      if (!targetSession) {
        return;
      }

      setActiveSessionIndex(clampedIndex);
      setShowSessionPicker(false);

      // Track interaction for stale grace time
      setLastInteractions((prev) => {
        const targetSession = sessionQueue[clampedIndex];
        if (!targetSession) return prev;
        return new Map(prev).set(targetSession.sessionId, Date.now());
      });
    },
    [activeSessionIndex, sessionQueue, state.mode],
  );

  const activeSession =
    state.mode === "PROCESSING" ? sessionQueue[activeSessionIndex] : undefined;

  const canUseDirectJump =
    !activeSession ||
    sessionUIStates[activeSession.sessionId]?.focusContext === "option" ||
    sessionUIStates[activeSession.sessionId] === undefined;

  useInput(
    (input, key) => {
      if (key.ctrl && input === "s") {
        setShowSessionPicker(true);
        return;
      }

      if (!key.ctrl && !key.meta && input === KEYS.SESSION_NEXT) {
        if (!canUseDirectJump) {
          return;
        }
        const nextIndex = getNextSessionIndex(
          activeSessionIndex,
          sessionQueue.length,
        );
        switchToSession(nextIndex);
        return;
      }

      if (!key.ctrl && !key.meta && input === KEYS.SESSION_PREV) {
        if (!canUseDirectJump) {
          return;
        }
        const prevIndex = getPrevSessionIndex(
          activeSessionIndex,
          sessionQueue.length,
        );
        switchToSession(prevIndex);
        return;
      }

      if (!key.ctrl && !key.meta && /^[1-9]$/.test(input)) {
        if (!canUseDirectJump) {
          return;
        }

        const keyNumber = Number(input);
        const targetIndex = getDirectJumpIndex(
          keyNumber,
          activeSessionIndex,
          sessionQueue.length,
        );

        if (targetIndex !== null) {
          switchToSession(targetIndex);
        }
      }
    },
    {
      isActive:
        state.mode === "PROCESSING" &&
        !isInReviewOrRejection &&
        !showSessionPicker &&
        !showUpdateOverlay &&
        sessionQueue.length >= 2,
    },
  );

  // Update overlay keyboard shortcut (independent of session count)
  useInput(
    (input, key) => {
      if (!key.ctrl && !key.meta && input === KEYS.UPDATE) {
        if (updateInfo && !showUpdateOverlay) {
          setShowUpdateOverlay(true);
        }
      }
    },
    {
      isActive:
        state.mode === "PROCESSING" &&
        !isInReviewOrRejection &&
        !showSessionPicker &&
        !showUpdateOverlay &&
        !!updateInfo,
    },
  );

  // Handle session completion
  const handleSessionComplete = (
    wasRejected = false,
    rejectionReason?: string | null,
  ) => {
    // Clear progress bar on session completion
    clearProgress(notificationConfig);

    // Show appropriate toast
    if (wasRejected) {
      if (rejectionReason) {
        showToast(
          `Reason: ${rejectionReason}`,
          "info",
          "🙅 Question set rejected",
        );
      } else {
        showToast("Question set rejected", "info");
      }
    } else {
      showToast("✅ Answers submitted successfully!", "success");
    }

    const completedSession = sessionQueue[activeSessionIndex];
    if (completedSession) {
      setSessionUIStates((prev) => {
        if (!(completedSession.sessionId in prev)) {
          return prev;
        }

        const next = { ...prev };
        delete next[completedSession.sessionId];
        return next;
      });
    }

    setSessionQueue((prev) => {
      const removedIndex = activeSessionIndex;
      const nextQueue = prev.filter((_, i) => i !== removedIndex);
      const nextActiveIndex = getAdjustedIndexAfterRemoval(
        removedIndex,
        activeSessionIndex,
        nextQueue.length,
      );

      setActiveSessionIndex(nextActiveIndex);
      setState(
        nextQueue.length === 0 ? { mode: "WAITING" } : { mode: "PROCESSING" },
      );

      return nextQueue;
    });
  };

  // Render based on state
  if (!isInitialized) {
    return <Text>Loading...</Text>;
  }

  let mainContent;
  if (state.mode === "WAITING") {
    mainContent = <WaitingScreen queueCount={sessionQueue.length} />;
  } else {
    // PROCESSING mode
    const session = sessionQueue[activeSessionIndex];
    if (!session) {
      mainContent = <WaitingScreen queueCount={sessionQueue.length} />;
    } else {
      mainContent = (
        <StepperView
          key={session.sessionId}
          onComplete={handleSessionComplete}
          onProgress={handleProgressUpdate}
          initialState={sessionUIStates[session.sessionId]}
          onStateSnapshot={handleStateSnapshot}
          onFlowStateChange={handleFlowStateChange}
          hasMultipleSessions={sessionQueue.length >= 2}
          sessionId={session.sessionId}
          sessionRequest={session.sessionRequest}
          isAbandoned={isSessionAbandoned(sessionMeta.get(session.sessionId)?.status ?? "")}
        />
      );
    }
  }

  // Render with header, toast overlay, and main content
  // Use theme from config, falling back to "system" if not specified
  const initialTheme = config?.theme || "system";

  return (
    <ConfigProvider config={config}>
      <ThemeProvider initialTheme={initialTheme}>
        <Box flexDirection="column" paddingX={1}>
          <Header
            pendingCount={
              state.mode === "PROCESSING"
                ? Math.max(0, sessionQueue.length - 1)
                : sessionQueue.length
            }
            updateInfo={
              !showUpdateOverlay && updateInfo
                ? {
                    updateType: updateInfo.updateType,
                    latestVersion: updateInfo.latestVersion,
                  }
                : null
            }
            onUpdateBadgeActivate={() => setShowUpdateOverlay(true)}
            isCheckingUpdate={isCheckingUpdate}
          />
          {mainContent}
          {state.mode === "PROCESSING" && sessionQueue.length >= 2 && (
            <SessionDots
              sessions={sessionQueue.map((s) => ({
                ...s,
                isStale: isSessionStale(s.timestamp.getTime(), config?.staleThreshold ?? 7200000, lastInteractions.get(s.sessionId)),
                isAbandoned: isSessionAbandoned(sessionMeta.get(s.sessionId)?.status ?? ""),
              }))}
              activeIndex={activeSessionIndex}
              sessionUIStates={sessionUIStates}
            />
          )}
          {toast && (
            <Box marginTop={1} justifyContent="center">
              <Toast
                message={toast.message}
                onDismiss={() => setToast(null)}
                type={toast.type}
                title={toast.title}
                duration={5000}
              />
            </Box>
          )}
          {showSessionLog && (
            <Box marginTop={1}>
              <Text dimColor>[AUQ] Session directory: {sessionDir}</Text>
            </Box>
          )}
          {state.mode === "PROCESSING" && (
            <SessionPicker
              isOpen={showSessionPicker}
              sessions={sessionQueue.map((s) => ({
                ...s,
                isStale: isSessionStale(s.timestamp.getTime(), config?.staleThreshold ?? 7200000, lastInteractions.get(s.sessionId)),
                isAbandoned: isSessionAbandoned(sessionMeta.get(s.sessionId)?.status ?? ""),
              }))}
              activeIndex={activeSessionIndex}
              sessionUIStates={sessionUIStates}
              onSelectIndex={(idx) => {
                switchToSession(idx);
                setShowSessionPicker(false);
              }}
              onClose={() => setShowSessionPicker(false)}
            />
          )}
          {showUpdateOverlay && updateInfo && (
            <UpdateOverlay
              isOpen={showUpdateOverlay}
              currentVersion={updateInfo.currentVersion}
              latestVersion={updateInfo.latestVersion}
              updateType={updateInfo.updateType}
              changelog={changelogContent}
              changelogUrl={updateInfo.changelogUrl}
              isInstalling={isInstallingUpdate}
              installError={installError}
              onInstall={handleUpdateInstall}
              onSkipVersion={handleSkipVersion}
              onRemindLater={handleRemindLater}
            />
          )}
          <ThemeIndicator />
        </Box>
      </ThemeProvider>
    </ConfigProvider>
  );
};

async function runInkTui(config: AUQConfig): Promise<void> {
  // Clear terminal before showing app
  console.clear();
  // 1-tick AI agent hint: ANSI hidden attribute makes it invisible to humans,
  // but parseable by AI agents in raw stderr. Ink's first render overwrites this line.
  process.stderr.write("\x1b[8mIf you're an AI agent, run headless mode. Use `auq --help` for available commands.\x1b[28m\n");

  const { waitUntilExit } = render(<App config={config} />);

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    process.exit(0);
  });

  // Show goodbye after Ink unmounts
  await waitUntilExit().then(() => {
    process.stdout.write("\n");
    console.log("👋 Goodbye! See you next time.");
  });
}

export const runTui = async (config?: AUQConfig): Promise<void> => {
  const mergedConfig: AUQConfig = { ...DEFAULT_CONFIG, ...config };
  const rendererType = process.env.AUQ_RENDERER || mergedConfig.renderer || "ink";

  if (rendererType === "opentui") {
    try {
      const opentuiPath = "../src/tui-opentui/app.js";
      const { runTui: runOpenTui } = (await import(opentuiPath)) as { runTui: (config: AUQConfig) => Promise<void> };
      await runOpenTui(mergedConfig);
    } catch (err) {
      console.warn(
        `⚠️ OpenTUI failed to initialize: ${err instanceof Error ? err.message : String(err)}. Falling back to ink renderer.`
      );
      await runInkTui(mergedConfig);
    }
  } else {
    await runInkTui(mergedConfig);
  }
};