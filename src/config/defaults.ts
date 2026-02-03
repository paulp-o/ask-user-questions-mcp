import type { AUQConfig } from "./types.js";

export const DEFAULT_CONFIG: AUQConfig = {
  maxOptions: 4,
  maxQuestions: 4,
  recommendedOptions: 3,
  recommendedQuestions: 3,
  sessionTimeout: 0,
  retentionPeriod: 604800000, // 7 days
  language: "auto",
  theme: "system",
};
