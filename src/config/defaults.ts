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
  notifications: {
    enabled: true,
    sound: true,
  },
};
