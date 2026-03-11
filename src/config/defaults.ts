import type { AUQConfig } from "./types.js";

export const DEFAULT_CONFIG: AUQConfig = {
  maxOptions: 5,
  maxQuestions: 5,
  recommendedOptions: 4,
  recommendedQuestions: 4,
  sessionTimeout: 0,
  retentionPeriod: 604800000, // 7 days
  language: "auto",
  theme: "system",
  autoSelectRecommended: true,
  renderer: "ink" as const,
  staleThreshold: 7200000, // 2 hours in ms
  notifyOnStale: true,
  staleAction: "warn" as const,
  notifications: {
    enabled: true,
    sound: true,
  },

  // Update
  updateCheck: true,
};
