// Translation key types for type-safe internationalization

export interface FooterTranslations {
  options: string;
  questions: string;
  select: string;
  toggle: string;
  elaborate: string;
  recommended: string;
  elaborateInput: string;
  reject: string;
  quickSubmit: string;
  theme: string;
  next: string;
  newline: string;
  back: string;
  submit: string;
  confirm: string;
  cancel: string;
  cursor: string;
}

export interface HeaderTranslations {
  title: string;
  questionCount: string;
}

export interface WaitingTranslations {
  title: string;
  description: string;
  hint: string;
  processing: string;
  queueCount: string;
}

export interface ReviewTranslations {
  title: string;
  unanswered: string;
  customAnswer: string;
  markedForElaboration: string;
}

export interface ConfirmationTranslations {
  rejectTitle: string;
  rejectMessage: string;
  submitTitle: string;
  submitMessage: string;
  rejectYes: string;
  rejectNo: string;
  keybindings: string;
}

export interface ToastTranslations {
  copied: string;
  saved: string;
  error: string;
}

export interface StepperTranslations {
  submitting: string;
  elaborateTitle: string;
  elaboratePrompt: string;
  elaborateHint: string;
}

export interface InputTranslations {
  customAnswerLabel: string;
  customAnswerHint: string;
  otherCustom: string;
  placeholder: string;
  singleLinePlaceholder: string;
  multiLinePlaceholder: string;
}

export interface QuestionTranslations {
  multipleChoice: string;
  singleChoice: string;
}

export interface UiTranslations {
  themeLabel: string;
}

export interface Translations {
  footer: FooterTranslations;
  header: HeaderTranslations;
  waiting: WaitingTranslations;
  review: ReviewTranslations;
  confirmation: ConfirmationTranslations;
  toast: ToastTranslations;
  stepper: StepperTranslations;
  input: InputTranslations;
  question: QuestionTranslations;
  ui: UiTranslations;
}

export type TranslationKey =
  | `footer.${keyof FooterTranslations}`
  | `header.${keyof HeaderTranslations}`
  | `waiting.${keyof WaitingTranslations}`
  | `review.${keyof ReviewTranslations}`
  | `confirmation.${keyof ConfirmationTranslations}`
  | `toast.${keyof ToastTranslations}`
  | `stepper.${keyof StepperTranslations}`
  | `input.${keyof InputTranslations}`
  | `question.${keyof QuestionTranslations}`
  | `ui.${keyof UiTranslations}`;

export type SupportedLanguage = "en" | "ko" | "auto";
