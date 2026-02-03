// Translation key types for type-safe internationalization

export interface FooterTranslations {
  options: string;
  questions: string;
  select: string;
  toggle: string;
  elaborate: string;
  reject: string;
  quickSubmit: string;
  theme: string;
  next: string;
  newline: string;
  back: string;
  submit: string;
  confirm: string;
  cancel: string;
}

export interface HeaderTranslations {
  title: string;
  questionCount: string;
}

export interface WaitingTranslations {
  title: string;
  description: string;
  hint: string;
}

export interface ReviewTranslations {
  title: string;
  unanswered: string;
  customAnswer: string;
}

export interface ConfirmationTranslations {
  rejectTitle: string;
  rejectMessage: string;
  submitTitle: string;
  submitMessage: string;
}

export interface ToastTranslations {
  copied: string;
  saved: string;
  error: string;
}

export interface Translations {
  footer: FooterTranslations;
  header: HeaderTranslations;
  waiting: WaitingTranslations;
  review: ReviewTranslations;
  confirmation: ConfirmationTranslations;
  toast: ToastTranslations;
}

export type TranslationKey =
  | `footer.${keyof FooterTranslations}`
  | `header.${keyof HeaderTranslations}`
  | `waiting.${keyof WaitingTranslations}`
  | `review.${keyof ReviewTranslations}`
  | `confirmation.${keyof ConfirmationTranslations}`
  | `toast.${keyof ToastTranslations}`;

export type SupportedLanguage = "en" | "ko" | "auto";
