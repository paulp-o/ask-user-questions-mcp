export const ko = {
  footer: {
    options: "옵션",
    questions: "질문",
    select: "선택",
    toggle: "토글",
    elaborate: "자세히",
    recommended: "추천",
    elaborateInput: "자세히 메모",
    reject: "거부",
    quickSubmit: "빠른 제출",
    theme: "테마",
    next: "다음",
    newline: "줄바꿈",
    back: "뒤로",
    submit: "제출",
    confirm: "확인",
    cancel: "취소",
  },
  header: {
    title: "사용자 질문",
    questionCount: "질문 {current} / {total}",
  },
  waiting: {
    title: "질문을 기다리는 중...",
    description: "AI 어시스턴트가 입력이 필요할 때 여기에 질문을 복니다.",
    hint: "Ctrl+C 종료",
  },
  review: {
    title: "답변 검토",
    unanswered: "미응답",
    customAnswer: "직접 입력",
  },
  confirmation: {
    rejectTitle: "질문을 거부하시겠습니까?",
    rejectMessage: "이 질문들을 거부하시겠습니까?",
    submitTitle: "답변을 제출하시겠습니까?",
    submitMessage: "답변을 제출하시겠습니까?",
  },
  toast: {
    copied: "클립보드에 복사됨",
    saved: "저장됨",
    error: "오류",
  },
} as const;

export type TranslationKeys = typeof ko;
