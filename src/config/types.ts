import { z } from "zod";

export const AUQConfigSchema = z.object({
  // Limits
  maxOptions: z.number().min(2).max(10).default(4),
  maxQuestions: z.number().min(1).max(10).default(4),
  recommendedOptions: z.number().min(1).max(10).default(3),
  recommendedQuestions: z.number().min(1).max(10).default(3),

  // Session
  sessionTimeout: z.number().min(0).default(0), // 0 = infinite, milliseconds
  retentionPeriod: z.number().min(0).default(604800000), // 7 days in ms

  // UI
  language: z.string().default("auto"),
  theme: z.string().default("system"),
});

export type AUQConfig = z.infer<typeof AUQConfigSchema>;
