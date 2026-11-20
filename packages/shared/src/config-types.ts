import { z } from "zod";

export const NotificationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sound: z.boolean().default(true),
});

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

export const AUQConfigSchema = z.object({
  maxOptions: z.number().min(2).max(10).default(5),
  maxQuestions: z.number().min(1).max(10).default(5),
  recommendedOptions: z.number().min(1).max(10).default(4),
  recommendedQuestions: z.number().min(1).max(10).default(4),
  sessionTimeout: z.number().min(0).default(0),
  retentionPeriod: z.number().min(0).default(604800000),
  language: z.string().default("auto"),
  theme: z.string().default("system"),
  autoSelectRecommended: z.boolean().default(true),
  renderer: z.enum(["ink", "opentui", "web"]).default("opentui"),
  staleThreshold: z.number().min(0).default(7200000),
  notifyOnStale: z.boolean().default(true),
  staleAction: z.enum(["warn", "remove", "archive"]).default("warn"),
  notifications: NotificationConfigSchema.default({
    enabled: true,
    sound: true,
  }),
  updateCheck: z.boolean().default(true),
});

export type AUQConfig = z.infer<typeof AUQConfigSchema>;