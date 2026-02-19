export type FocusContext = "option" | "custom-input" | "elaborate-input";

export interface Answer {
  selectedOption?: string;
  selectedOptions?: string[];
  customText?: string;
}

export interface SessionUIState {
  currentQuestionIndex: number;
  answers: Map<number, Answer>;
  elaborateMarks: Map<number, string>;
  focusContext: FocusContext;
  focusedOptionIndex: number;
  showReview: boolean;
}
