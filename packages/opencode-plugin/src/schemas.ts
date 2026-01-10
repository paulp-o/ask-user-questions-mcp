import { z } from "zod";

export const OptionSchema = z.object({
  label: z
    .string()
    .describe(
      "The display text for this option that the user will see and select. " +
        "Should be concise (1-5 words) and clearly describe the choice.",
    ),
  description: z
    .string()
    .optional()
    .describe(
      "Explanation of what this option means or what will happen if chosen. " +
        "Useful for providing context about trade-offs or implications.",
    ),
});

export const QuestionSchema = z.object({
  prompt: z
    .string()
    .describe(
      "The complete question to ask the user. Should be clear, specific, and end with a question mark. " +
        "Example: 'Which programming language do you want to use?' " +
        "If multiSelect is true, phrase it accordingly, e.g. 'Which features do you want to enable?'",
    ),
  title: z
    .string()
    .min(
      1,
      "Question title is required. Provide a short summary like 'Language' or 'Framework'.",
    )
    .describe(
      "Very short label displayed as a chip/tag (max 12 chars). " +
        "Examples: 'Auth method', 'Library', 'Approach'. " +
        "This title appears in the interface to help users quickly identify questions.",
    ),
  options: z
    .array(OptionSchema)
    .min(2)
    .max(4)
    .describe(
      "The available choices for this question. Must have 2-4 options. " +
        "Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). " +
        "There should be no 'Other' option, that will be provided automatically.",
    ),
  multiSelect: z
    .boolean()
    .describe(
      "Set to true to allow the user to select multiple options instead of just one. " +
        "Use when choices are not mutually exclusive. Default: false (single-select)",
    ),
});

export const QuestionsSchema = z.array(QuestionSchema).min(1).max(4);

export const AskUserQuestionsParametersSchema = z.object({
  questions: QuestionsSchema.describe(
    "Questions to ask the user (1-4 questions). " +
      "Each question must include: prompt (full question text), title (short label, max 12 chars), " +
      "options (2-4 choices with labels and descriptions), and multiSelect (boolean). " +
      "Mark one choice as recommended if possible.",
  ),
});

export const TOOL_DESCRIPTION =
  "Use this tool when you need to ask the user questions during execution. " +
  "This allows you to:\n" +
  "1. Gather user preferences or requirements\n" +
  "2. Clarify ambiguous instructions\n" +
  "3. Get decisions on implementation choices as you work\n" +
  "4. Offer choices to the user about what direction to take\n\n" +
  "FEATURES:\n" +
  "- Ask 1-4 structured questions via an interactive terminal interface\n" +
  "- Each question includes 2-4 multiple-choice options with explanatory descriptions\n" +
  "- Users can always provide custom free-text input as an alternative to predefined options\n" +
  "- Single-select mode (default): User picks ONE option or provides custom text\n" +
  "- Multi-select mode (multiSelect: true): User can select MULTIPLE options\n\n" +
  "USAGE NOTES:\n" +
  "- Always provide a descriptive 'title' field (max 12 chars) for each question\n" +
  "- Use multiSelect: true when choices are not mutually exclusive\n" +
  "- Option labels should be concise (1-5 words)\n" +
  "- Questions should end with a question mark\n" +
  "- Don't include an 'Other' option - it's provided automatically\n" +
  "- Mark one choice as recommended if possible.\n\n" +
  "- If user seems not aware how to answer the question, inform them that they need to install the 'auq' cli tool.\n\n" +
  "Returns a formatted summary of all questions and answers.";

export type QuestionInput = z.infer<typeof QuestionSchema>;