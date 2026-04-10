import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import React, { useEffect, useState } from "react";

import { useTheme } from "../ThemeProvider.js";
import { SingleLineTextInput } from "./SingleLineTextInput.js";

export type TelegramWizardFunnelMode = "auto" | "off";

export interface TelegramWizardSubmitValues {
  token: string;
  funnelMode: TelegramWizardFunnelMode;
  webhookUrl?: string;
}

interface TelegramSetupWizardProps {
  onCancel: () => void;
  onError: (message: string) => void;
  onSubmit: (values: TelegramWizardSubmitValues) => Promise<void>;
}

type WizardStep = "token" | "funnel" | "webhook";

const FUNNEL_CHOICES: TelegramWizardFunnelMode[] = ["auto", "off"];

export const TelegramSetupWizard = ({
  onCancel,
  onError,
  onSubmit,
}: TelegramSetupWizardProps): React.ReactNode => {
  const { theme } = useTheme();
  const [step, setStep] = useState<WizardStep>("token");
  const [token, setToken] = useState("");
  const [funnelMode, setFunnelMode] = useState<TelegramWizardFunnelMode>("auto");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [funnelIndex, setFunnelIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step === "funnel") {
      setFunnelIndex(FUNNEL_CHOICES.indexOf(funnelMode));
    }
  }, [funnelMode, step]);

  const submit = async (values: TelegramWizardSubmitValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch {
      // Parent shows the error toast and keeps the wizard open.
    } finally {
      setSubmitting(false);
    }
  };

  const proceedFromToken = () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      onError("token 不可為空");
      return;
    }

    setToken(trimmedToken);
    setStep("funnel");
  };

  const proceedFromWebhook = () => {
    const trimmedWebhook = webhookUrl.trim();
    if (!trimmedWebhook) {
      onError("webhook-url 不可為空");
      return;
    }

    setWebhookUrl(trimmedWebhook);
    void submit({
      token: token.trim(),
      funnelMode: "off",
      webhookUrl: trimmedWebhook,
    });
  };

  const chooseFunnelMode = (mode: TelegramWizardFunnelMode) => {
    setFunnelMode(mode);

    if (mode === "auto") {
      void submit({
        token: token.trim(),
        funnelMode: "auto",
      });
      return;
    }

    setStep("webhook");
  };

  useKeyboard((key) => {
    if (submitting) return;

    if (key.name === "escape") {
      onCancel();
      return;
    }

    if (step === "token" || step === "webhook") {
      return;
    }

    if (key.name === "up" || key.name === "left") {
      setFunnelIndex((prev) => (prev === 0 ? FUNNEL_CHOICES.length - 1 : prev - 1));
      return;
    }

    if (key.name === "down" || key.name === "right") {
      setFunnelIndex((prev) => (prev + 1) % FUNNEL_CHOICES.length);
      return;
    }

    if (key.name === "return") {
      chooseFunnelMode(FUNNEL_CHOICES[funnelIndex] ?? "auto");
      return;
    }

    const keyValue = (key.sequence || key.name || "").toLowerCase();
    if (keyValue === "a") {
      chooseFunnelMode("auto");
    }
    if (keyValue === "o") {
      chooseFunnelMode("off");
    }
  });

  return (
    <box
      style={{
        borderStyle: "rounded",
        borderColor: theme.colors.focused,
        flexDirection: "column",
        padding: 1,
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.focused }}>
          Telegram 設定精靈
        </text>
      </box>

      {step === "token" && (
        <box style={{ flexDirection: "column" }}>
          <box style={{ marginBottom: 1 }}>
            <text style={{ attributes: TextAttributes.DIM }}>
              請輸入本次 init 要使用的 bot token。
            </text>
          </box>
          <SingleLineTextInput
            isFocused={true}
            onChange={setToken}
            onSubmit={proceedFromToken}
            placeholder="AUQ_TELEGRAM_BOT_TOKEN"
            value={token}
          />
          <box style={{ marginTop: 1 }}>
            <text style={{ attributes: TextAttributes.DIM }}>
              Enter 下一步 | Esc 取消
            </text>
          </box>
        </box>
      )}

      {step === "funnel" && (
        <box style={{ flexDirection: "column" }}>
          <box style={{ marginBottom: 1 }}>
            <text style={{ attributes: TextAttributes.DIM }}>
              選擇 funnel 模式。Enter 套用目前選擇。
            </text>
          </box>
          {FUNNEL_CHOICES.map((choice, index) => {
            const isFocused = index === funnelIndex;
            return (
              <box key={choice} style={{ marginTop: index > 0 ? 1 : 0 }}>
                <text
                  style={{
                    attributes: isFocused ? TextAttributes.BOLD : TextAttributes.NONE,
                    fg: isFocused ? theme.colors.focused : theme.colors.text,
                  }}
                >
                  {`${isFocused ? "> " : "  "}${choice}${choice === "auto" ? "（自動建立）" : "（手動輸入 webhook）"}`}
                </text>
              </box>
            );
          })}
          <box style={{ marginTop: 1 }}>
            <text style={{ attributes: TextAttributes.DIM }}>
              ↑↓ / ←→ 切換 | A auto | O off | Esc 取消
            </text>
          </box>
        </box>
      )}

      {step === "webhook" && (
        <box style={{ flexDirection: "column" }}>
          <box style={{ marginBottom: 1 }}>
            <text style={{ attributes: TextAttributes.DIM }}>
              funnel=off 時需要手動輸入 webhook URL。
            </text>
          </box>
          <SingleLineTextInput
            isFocused={true}
            onChange={setWebhookUrl}
            onSubmit={proceedFromWebhook}
            placeholder="https://example.com/webhook"
            value={webhookUrl}
          />
          <box style={{ marginTop: 1 }}>
            <text style={{ attributes: TextAttributes.DIM }}>
              Enter 完成 | Esc 取消
            </text>
          </box>
        </box>
      )}

      {submitting && (
        <box style={{ marginTop: 1 }}>
          <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.pending }}>
            正在初始化 Telegram...
          </text>
        </box>
      )}
    </box>
  );
};
