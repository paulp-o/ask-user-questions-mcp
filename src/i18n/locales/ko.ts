export const ko = {
  footer: {
    options: "옵션",
    questions: "질문",
    select: "선택",
    toggle: "토글",
    elaborate: "설명 요청",
    recommended: "추천",
    reject: "거부",
    quickSubmit: "빠른 제출",
    theme: "테마",
    next: "다음",
    newline: "줄바꿈",
    back: "뒤로",
    submit: "제출",
    submitting: "제출 중...",
    confirm: "확인",
    cancel: "취소",
    cursor: "커서",
  },
  header: {
    title: "Ask User Questions",
    questionCount: "질문 {current} / {total}",
  },
  confirmation: {
    rejectTitle: "질문을 거부하시겠습니까?",
    rejectMessage: "이 질문 세트를 거부하시겠습니까?",
    submitTitle: "답변을 제출하시겠습니까?",
    submitMessage: "답변을 제출하시겠습니까?",
    rejectYes: "예, AI에게 이 질문 세트를 거부했다고 알립니다",
    rejectNo: "아니오, 질문에 답변하러 돌아갑니다",
    keybindings: "이동 | Enter 선택 | y/n 단축키 | Esc 종료",
  },
  toast: {
    copied: "클립보드에 복사됨",
    saved: "저장됨",
    error: "오류",
  },
  stepper: {
    submitting: "답변 제출 중...",
  },
  input: {
    customAnswerLabel: "직접 입력",
    customAnswerHint: "(Tab을 눌러 직접 입력)",
    otherCustom: "기타 (직접 입력)",
    placeholder: "답변을 입력하세요 (Enter = 줄바꿈, Tab = 완료)",
    singleLinePlaceholder: "여기에 입력...",
    multiLinePlaceholder: "답변을 입력하세요...",
    elaboratePlaceholder:
      "AI에게 원하는 것을 알려주세요 (Enter/Tab = 건너뛰기)",
  },
  question: {
    multipleChoice: "복수 선택",
    singleChoice: "단일 선택",
  },
  review: {
    title: "답변 검토",
    unanswered: "미응답",
    customAnswer: "직접 입력",
    markedForElaboration: "자세히 설명 요청됨",
  },
  waiting: {
    title: "질문을 기다리는 중...",
    description: "AI 어시스턴트가 입력이 필요할 때 여기에 질문을 보냅니다.",
    hint: "Ctrl+C 종료",
    processing: "처리 중...",
    queueCount: "(대기 중인 질문 {count}개)",
  },
  ui: {
    themeLabel: "테마:",
  },
} as const;

export type TranslationKeys = typeof ko;
