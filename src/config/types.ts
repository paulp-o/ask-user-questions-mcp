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

  // Notifications (OSC 9/99)
  notifications: NotificationConfigSchema.default({
    enabled: true,
    sound: true,
  }),
});

export type AUQConfig = z.infer<typeof AUQConfigSchema>;
