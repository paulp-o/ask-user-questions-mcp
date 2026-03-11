import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { promises as fs } from "fs";

import type { AUQConfig } from "../config/types.js";
import { DEFAULT_CONFIG } from "../config/defaults.js";
import { ConfigProvider } from "./ConfigContext.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { ThemeProvider, useTheme } from "./ThemeProvider.js";

import type { SessionRequest } from "../session/types.js";
import type { SessionUIState } from "../tui/shared/types.js";
import {
  ensureDirectoryExists,
  getSessionDirectory,
} from "../session/utils.js";
import {
  createTUIWatcher,
} from "../tui/session-watcher.js";
import type { PendingSessionMeta } from "../tui/session-watcher.js";
import {
  isSessionStale,
  isSessionAbandoned,
  formatStaleToastMessage,
} from "../tui/shared/utils/staleDetection.js";
import {
  getAdjustedIndexAfterRemoval,
  getDirectJumpIndex,
  getNextSessionIndex,
  getPrevSessionIndex,
} from "../tui/shared/utils/sessionSwitching.js";
import {
  UpdateChecker,
  fetchChangelog,
  installUpdate,
  detectPackageManager,
  readCache,
  writeCache,
} from "../update/index.js";
import type { UpdateInfo } from "../update/types.js";
import { KEYS } from "../tui/constants/keybindings.js";

import { Header as _Header } from "./components/Header.js";
import { WaitingScreen as _WaitingScreen } from "./components/WaitingScreen.js";
import { StepperView as _StepperView } from "./components/StepperView.js";
import { SessionDots as _SessionDots } from "./components/SessionDots.js";
import { SessionPicker as _SessionPicker } from "./components/SessionPicker.js";
import { UpdateOverlay as _UpdateOverlay } from "./components/UpdateOverlay.js";
import { Toast as _Toast } from "./components/Toast.js";
import { ThemeIndicator as _ThemeIndicator } from "./components/ThemeIndicator.js";

// Cast to FC to avoid React class component type mismatch between @opentui/react
// bundled React version and the project's @types/react (structural type incompatibility).
// ErrorBoundary is still a valid class component at runtime.
const BoundedErrorBoundary = ErrorBoundary as unknown as (props: {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}) => React.ReactElement | null;

// Cast all components to avoid dual React type TS2786 errors
type AnyFC<P = Record<string, unknown>> = (props: P) => React.ReactElement | null;
const Header = _Header as unknown as AnyFC<React.ComponentProps<typeof _Header>>;
const WaitingScreen = _WaitingScreen as unknown as AnyFC<React.ComponentProps<typeof _WaitingScreen>>;
const StepperView = _StepperView as unknown as AnyFC<React.ComponentProps<typeof _StepperView>>;
const SessionDots = _SessionDots as unknown as AnyFC<React.ComponentProps<typeof _SessionDots>>;
const SessionPicker = _SessionPicker as unknown as AnyFC<React.ComponentProps<typeof _SessionPicker>>;
const UpdateOverlay = _UpdateOverlay as unknown as AnyFC<React.ComponentProps<typeof _UpdateOverlay>>;
const Toast = _Toast as unknown as AnyFC<React.ComponentProps<typeof _Toast>>;
const ThemeIndicator = _ThemeIndicator as unknown as AnyFC<Record<string, never>>;

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

// Inner App component that has access to ThemeProvider context
function AppInner({ config }: { config: AUQConfig }) {
  const { cycleTheme } = useTheme();
  const [state, setState] = useState<AppState>({ mode: "WAITING" });
  const [sessionQueue, setSessionQueue] = useState<SessionData[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [sessionUIStates, setSessionUIStates] = useState<Record<string, SessionUIState>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
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

  const sessionDir = getSessionDirectory();

  // ── Show toast helper ────────────────────────────────────────
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success", title?: string) => {
      setToast({ message, type, title });
    },
    [],
  );

  // ── Initialize: load existing sessions + start persistent watcher ───
  useEffect(() => {
    let watcherInstance: ReturnType<typeof createTUIWatcher> | null = null;

    const initialize = async () => {
      try {
        await ensureDirectoryExists(sessionDir);

        // Load existing pending sessions
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

        const validSessions = sessionData
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        setSessionQueue(validSessions);

        const initialMeta = new Map<string, { status: string; createdAt: string }>();
        for (const meta of sessionsWithStatus) {
          initialMeta.set(meta.sessionId, { status: meta.status, createdAt: meta.createdAt });
        }
        setSessionMeta(initialMeta);
        setIsInitialized(true);

        // Start persistent watcher for new sessions
        watcherInstance = createTUIWatcher({ autoLoadData: true });
        watcherInstance.startEnhancedWatching((event) => {
          setSessionQueue((prev) => {
            if (prev.some((s) => s.sessionId === event.sessionId)) return prev;
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
        setIsInitialized(true);
      }
    };

    void initialize();

    return () => {
      if (watcherInstance) watcherInstance.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-update checker ─────────────────────────────────────
  useEffect(() => {
    if (config.updateCheck === false) return;
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
          const changelog = await fetchChangelog(result.latestVersion);
          setChangelogContent(changelog.content);

          if (result.updateType === "patch" && !updateDismissed) {
            try {
              const pm = detectPackageManager();
              const success = await installUpdate(pm);
              if (success) {
                showToast(`Updated to v${result.latestVersion}. Please restart auq.`, "success");
              }
            } catch {
              // Silent — patch auto-install is best-effort
            }
          } else if (!updateDismissed) {
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
      void runCheck();
    }, 3600000); // 1 hour

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.updateCheck]);

  // ── Auto-transition: WAITING ↔ PROCESSING ────────────────────
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

  // ── Stale detection + background session status polling ──────
  const sessionQueueRef = useRef(sessionQueue);
  sessionQueueRef.current = sessionQueue;
  const activeSessionIndexRef = useRef(activeSessionIndex);
  activeSessionIndexRef.current = activeSessionIndex;
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.mode !== "PROCESSING" || sessionQueue.length <= 1) return;

    let isCancelled = false;
    let isChecking = false;

    const checkPausedSessionStatuses = async () => {
      if (isCancelled || isChecking) return;
      isChecking = true;

      try {
        const queue = sessionQueueRef.current;
        const activeIdx = activeSessionIndexRef.current;

        const checks = await Promise.all(
          queue.map(async (session, index) => {
            if (index === activeIdx) return null;
            const statusPath = `${sessionDir}/${session.sessionId}/status.json`;
            try {
              const content = await fs.readFile(statusPath, "utf8");
              const parsed = JSON.parse(content) as { status?: string };
              if (
                parsed.status === "timed_out" ||
                parsed.status === "completed" ||
                parsed.status === "rejected"
              ) {
                return { notifyAsTimedOut: parsed.status === "timed_out", session };
              }
              return null;
            } catch {
              return { notifyAsTimedOut: true, session };
            }
          }),
        );

        if (isCancelled) return;

        const sessionsToRemove = checks.filter(
          (entry): entry is { notifyAsTimedOut: boolean; session: SessionData } => entry !== null,
        );

        if (sessionsToRemove.length === 0) return;

        const timedOutSession = sessionsToRemove.find((entry) => entry.notifyAsTimedOut);
        if (timedOutSession) {
          const title =
            timedOutSession.session.sessionRequest.questions[0]?.title ||
            timedOutSession.session.sessionId.slice(0, 8);
          showToast(`Session '${title}' timed out`, "info");
        }

        const idsToRemove = new Set(sessionsToRemove.map((entry) => entry.session.sessionId));

        setSessionUIStates((prev) => {
          const next = { ...prev };
          for (const sessionId of idsToRemove) delete next[sessionId];
          return next;
        });

        setSessionQueue((prev) => {
          let nextQueue = [...prev];
          let nextActiveIndex = activeSessionIndexRef.current;

          const removalIndices = Array.from(idsToRemove)
            .map((sessionId) => nextQueue.findIndex((s) => s.sessionId === sessionId))
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
          setState(nextQueue.length === 0 ? { mode: "WAITING" } : { mode: "PROCESSING" });
          return nextQueue;
        });
      } finally {
        isChecking = false;
      }
    };

    const interval = setInterval(() => { void checkPausedSessionStatuses(); }, 2000);
    statusIntervalRef.current = interval;

    // Stale detection
    const staleThreshold = config.staleThreshold ?? 7200000;
    const notifyOnStale = config.notifyOnStale ?? true;

    const runStaleDetection = async () => {
      const watcher = createTUIWatcher();
      let freshMeta: PendingSessionMeta[] = [];
      try {
        freshMeta = await watcher.getPendingSessionsWithStatus();
      } catch {
        // Non-critical
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

      const queue = sessionQueueRef.current;
      for (const session of queue) {
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

    const staleInterval = setInterval(() => { void runStaleDetection(); }, 2000);
    staleIntervalRef.current = staleInterval;

    return () => {
      isCancelled = true;
      clearInterval(interval);
      clearInterval(staleInterval);
      statusIntervalRef.current = null;
      staleIntervalRef.current = null;
    };
  }, [activeSessionIndex, sessionDir, sessionQueue, state.mode, config.staleThreshold, config.notifyOnStale, lastInteractions, staleToastShown, showToast]);

  // ── Session switching helper ──────────────────────────────────
  const switchToSession = useCallback(
    (targetIndex: number) => {
      if (state.mode !== "PROCESSING" || sessionQueueRef.current.length <= 1) return;
      const clampedIndex = Math.max(0, Math.min(targetIndex, sessionQueueRef.current.length - 1));
      if (clampedIndex === activeSessionIndexRef.current) return;
      setActiveSessionIndex(clampedIndex);
      setShowSessionPicker(false);
      setLastInteractions((prev) => {
        const session = sessionQueueRef.current[clampedIndex];
        if (!session) return prev;
        return new Map(prev).set(session.sessionId, Date.now());
      });
    },
    [state.mode],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────
  const activeSession = state.mode === "PROCESSING" ? sessionQueue[activeSessionIndex] : undefined;
  const canUseDirectJump =
    !activeSession ||
    sessionUIStates[activeSession.sessionId]?.focusContext === "option" ||
    sessionUIStates[activeSession.sessionId] === undefined;

  const isNavActive =
    state.mode === "PROCESSING" &&
    !isInReviewOrRejection &&
    !showSessionPicker &&
    !showUpdateOverlay &&
    sessionQueue.length >= 2;

  useKeyboard((key) => {
    if (!isNavActive) return;

    // Ctrl+S / Ctrl+L: open session picker
    if (key.ctrl && (key.name === "s" || key.sequence === "\x13" || key.name === "l" || key.sequence === "\x0c")) {
      setShowSessionPicker(true);
      return;
    }

    if (!key.ctrl && !key.meta) {
      const seq = key.sequence || key.name || "";

      // Session navigation: ] and [
      if (seq === KEYS.SESSION_NEXT && canUseDirectJump) {
        switchToSession(getNextSessionIndex(activeSessionIndex, sessionQueue.length));
        return;
      }
      if (seq === KEYS.SESSION_PREV && canUseDirectJump) {
        switchToSession(getPrevSessionIndex(activeSessionIndex, sessionQueue.length));
        return;
      }

      // 1-9: jump to session
      if (/^[1-9]$/.test(seq) && canUseDirectJump) {
        const keyNumber = Number(seq);
        const targetIndex = getDirectJumpIndex(keyNumber, activeSessionIndex, sessionQueue.length);
        if (targetIndex !== null) switchToSession(targetIndex);
        return;
      }

      // u: activate update overlay
      if (seq === KEYS.UPDATE && updateInfo && !showUpdateOverlay) {
        setShowUpdateOverlay(true);
        return;
      }

      // t: cycle theme
      if (seq === "t") {
        cycleTheme();
        return;
      }
    }
  });

  // Ctrl+S outside isNavActive (fewer conditions)
  useKeyboard((key) => {
    if (state.mode !== "PROCESSING") return;
    if (showSessionPicker || showUpdateOverlay) return;
    if (key.ctrl && (key.sequence === "\x13" || key.name === "s")) {
      setShowSessionPicker(true);
    }
  });

  // ── Update overlay handlers ────────────────────────────────────
  const handleUpdateInstall = async () => {
    try {
      setIsInstallingUpdate(true);
      setInstallError(null);
      const pm = detectPackageManager();
      const success = await installUpdate(pm);
      if (success) {
        setShowUpdateOverlay(false);
        showToast(`Updated to v${updateInfo!.latestVersion}. Please restart auq.`, "success");
        setTimeout(() => process.exit(0), 2000);
      } else {
        setInstallError("Installation failed. Please try manually.");
      }
      setIsInstallingUpdate(false);
    } catch (err) {
      setIsInstallingUpdate(false);
      setInstallError(err instanceof Error ? err.message : "Installation failed");
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
        // Non-critical
      }
    }
    setShowUpdateOverlay(false);
    setUpdateInfo(null);
  };

  const handleRemindLater = () => {
    setShowUpdateOverlay(false);
    setUpdateDismissed(true);
  };

  // ── Session completion handler ─────────────────────────────────
  const handleSessionComplete = (wasRejected = false, rejectionReason?: string | null) => {
    if (wasRejected) {
      if (rejectionReason) {
        showToast(`Reason: ${rejectionReason}`, "info", "🙅 Question set rejected");
      } else {
        showToast("Question set rejected", "info");
      }
    } else {
      showToast("✅ Answers submitted successfully!", "success");
    }

    const completedSession = sessionQueue[activeSessionIndex];
    if (completedSession) {
      setSessionUIStates((prev) => {
        if (!(completedSession.sessionId in prev)) return prev;
        const next = { ...prev };
        delete next[completedSession.sessionId];
        return next;
      });
    }

    setSessionQueue((prev) => {
      const removedIndex = activeSessionIndex;
      const nextQueue = prev.filter((_, i) => i !== removedIndex);
      const nextActiveIndex = getAdjustedIndexAfterRemoval(removedIndex, activeSessionIndex, nextQueue.length);
      setActiveSessionIndex(nextActiveIndex);
      setState(nextQueue.length === 0 ? { mode: "WAITING" } : { mode: "PROCESSING" });
      if (nextQueue.length === 0) {
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
          statusIntervalRef.current = null;
        }
        if (staleIntervalRef.current) {
          clearInterval(staleIntervalRef.current);
          staleIntervalRef.current = null;
        }
      }
      return nextQueue;
    });
  };

  // ── State snapshot handler ─────────────────────────────────────
  const handleStateSnapshot = useCallback(
    (sessionId: string, ui: SessionUIState) => {
      setSessionUIStates((prev) => ({ ...prev, [sessionId]: ui }));
      setLastInteractions((prev) => new Map(prev).set(sessionId, Date.now()));
    },
    [],
  );

  // ── Flow state change handler ──────────────────────────────────
  const handleFlowStateChange = useCallback(
    (flowState: { showReview: boolean; showRejectionConfirm: boolean; showAbandonedConfirm: boolean }) => {
      setIsInReviewOrRejection(flowState.showReview || flowState.showRejectionConfirm);
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────
  const staleThreshold = config.staleThreshold ?? 7200000;

  // Compute derived session data for SessionDots and SessionPicker
  const sessionsWithMeta = useMemo(
    () =>
      sessionQueue.map((s) => ({
        ...s,
        isStale: isSessionStale(s.timestamp.getTime(), staleThreshold, lastInteractions.get(s.sessionId)),
        isAbandoned: isSessionAbandoned(sessionMeta.get(s.sessionId)?.status ?? ""),
      })),
    [sessionQueue, staleThreshold, lastInteractions, sessionMeta],
  );

  if (!isInitialized) {
    return (
      <box style={{ flexDirection: "column", width: "100%", height: "100%" }}>
        <text style={{ fg: "#888888" }}>Loading...</text>
      </box>
    );
  }

  // Determine main content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mainContent: any;
  if (state.mode === "WAITING") {
    mainContent = <WaitingScreen queueCount={sessionQueue.length} />;
  } else {
    const session = sessionQueue[activeSessionIndex];
    if (!session) {
      mainContent = <WaitingScreen queueCount={sessionQueue.length} />;
    } else {
      mainContent = (
        <StepperView
          key={session.sessionId}
          onComplete={handleSessionComplete}
          onProgress={undefined}
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

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%" }}>
      <box style={{ flexDirection: "column", paddingLeft: 1, paddingRight: 1 }}>
      <Header
        pendingCount={
          state.mode === "PROCESSING"
            ? Math.max(0, sessionQueue.length - 1)
            : sessionQueue.length
        }
        updateInfo={
          !showUpdateOverlay && updateInfo
            ? { updateType: updateInfo.updateType, latestVersion: updateInfo.latestVersion }
            : null
        }
        onUpdateBadgeActivate={() => setShowUpdateOverlay(true)}
        isCheckingUpdate={isCheckingUpdate}
      />
      {showSessionPicker && state.mode === "PROCESSING" ? (
        <SessionPicker
          isOpen={showSessionPicker}
          sessions={sessionsWithMeta}
          activeIndex={activeSessionIndex}
          sessionUIStates={sessionUIStates}
          onSelectIndex={(idx) => {
            switchToSession(idx);
            setShowSessionPicker(false);
          }}
          onClose={() => setShowSessionPicker(false)}
        />
      ) : mainContent}
      {state.mode === "PROCESSING" && sessionQueue.length >= 2 && (
        <SessionDots
          sessions={sessionsWithMeta}
          activeIndex={activeSessionIndex}
          sessionUIStates={sessionUIStates}
        />
      )}
      {toast && (
        <box style={{ marginTop: 1, justifyContent: "center" }}>
          <Toast
            message={toast.message}
            onDismiss={() => setToast(null)}
            type={toast.type}
            title={toast.title}
            duration={5000}
          />
        </box>
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
      </box>
    </box>
  );
}

function App({ config }: { config: AUQConfig }) {
  return (
    <ConfigProvider config={config}>
      <ThemeProvider initialTheme={config.theme}>
        <BoundedErrorBoundary>
          <AppInner config={config} />
        </BoundedErrorBoundary>
      </ThemeProvider>
    </ConfigProvider>
  );
}

export async function runTui(config?: AUQConfig): Promise<void> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    useMouse: true,
    autoFocus: false,
    useAlternateScreen: true,
    useKittyKeyboard: {},
    useConsole: process.env.AUQ_DEBUG === "1",
    targetFps: 60,
  });

  const root = createRoot(renderer);
  root.render(<App config={mergedConfig} />);

  // Handle graceful shutdown
  const cleanup = () => {
    renderer.destroy();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Keep process alive — renderer keeps process alive via its internal event loop
  await new Promise<void>(() => {
    // Intentionally never resolves; renderer lifecycle drives exit
  });
}