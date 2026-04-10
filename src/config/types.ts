import { z } from "zod";

/**
 * Notification configuration schema
 */
export const NotificationConfigSchema = z.object({
  /** Whether notifications are enabled (default: true) */
  enabled: z.boolean().default(true),
  /** Whether to play sound with notifications (default: true) */
  sound: z.boolean().default(true),
});

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

export const TelegramConfigSchema = z.object({
  enabled: z.boolean().default(false),
  tokenEnvKey: z.string().default("AUQ_TELEGRAM_BOT_TOKEN"),
  allowedChatId: z.string().default(""),
  webhookUrl: z.string().default(""),
  bindHost: z.literal("0.0.0.0").default("0.0.0.0"),
  bindPort: z.number().int().min(1).max(65535).default(8080),
});

export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;

export const AUQConfigSchema = z.object({
  // Limits
  maxOptions: z.number().min(2).max(10).default(5),
  maxQuestions: z.number().min(1).max(10).default(5),
  recommendedOptions: z.number().min(1).max(10).default(4),
  recommendedQuestions: z.number().min(1).max(10).default(4),

  // Session
  sessionTimeout: z.number().min(0).default(0), // 0 = infinite, milliseconds
  retentionPeriod: z.number().min(0).default(604800000), // 7 days in ms

  // UI
  language: z.string().default("auto"),
  theme: z.string().default("system"),
  autoSelectRecommended: z.boolean().default(true),
  renderer: z.enum(["ink", "opentui"]).default("opentui"),

  // Stale/Orphan Session Detection
  staleThreshold: z.number().min(0).default(7200000), // 2 hours in ms
  notifyOnStale: z.boolean().default(true),
  staleAction: z.enum(["warn", "remove", "archive"]).default("warn"),

  // Notifications (OSC 9/99)
  notifications: NotificationConfigSchema.default({
    enabled: true,
    sound: true,
  }),

  // Telegram
  telegram: TelegramConfigSchema.default({
    enabled: false,
    tokenEnvKey: "AUQ_TELEGRAM_BOT_TOKEN",
    allowedChatId: "",
    webhookUrl: "",
    bindHost: "0.0.0.0",
    bindPort: 8080,
  }),

  // Update
  updateCheck: z.boolean().default(true),
});

export type AUQConfig = z.infer<typeof AUQConfigSchema>;
