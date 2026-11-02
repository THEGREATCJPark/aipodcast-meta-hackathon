/** CJ 제어 버튼이 MC에게 보내는 지시문 */

export const HOLD_TEXT =
  "[진행자 지시] 지금 즉시 말을 멈추세요. 하던 말을 이어가지 말고, 다시 요청이 올 때까지 조용히 듣기만 하세요.";

export const RESUME_TEXT =
  "[진행자 지시] 이제 평소처럼 진행해도 됩니다. 다만 지금 바로 말할 필요는 없습니다. 대화 흐름에 맞춰 필요할 때 말하세요.";

export const HANDOFF_TEXT = (host: string): string =>
  `[진행자 지시] ${host}님이 진행을 넘겼습니다. 방금까지의 대화를 이어받아 지금 바로 짧게 말하세요. 질문은 하나만.`;

export const speakerNote = (name: string): string => `[진행 메모] 지금 말하는 사람: ${name}`;

export const noteText = (host: string, text: string, speak: boolean): string =>
  speak
    ? `[진행자 ${host}의 지시] ${text} — 지금 바로 반영해서 말하세요.`
    : `[진행자 ${host}의 메모] ${text} — 말하지 말고 앞으로의 진행에 참고만 하세요.`;
