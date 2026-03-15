export type WorkflowId = "pitch" | "report" | "business";

export interface WorkflowOption {
  id: WorkflowId;
  badge: string;
  title: string;
  summary: string;
  deliverable: string;
  prompt: string;
  accent: string;
  agentId: "omega" | "psi" | "delta";
  agentReason: string;
}

export const WORKFLOWS: WorkflowOption[] = [
  {
    id: "pitch",
    badge: "Delta Check",
    title: "준비도 검증",
    summary: "보고서와 발표 자료가 실제로 공유 가능한 수준인지 최종 품질 기준으로 점검합니다.",
    deliverable: "빠진 검증 포인트, 제출 전 리스크, 보완 우선순위",
    prompt:
      "이 보고서 또는 발표 자료가 실제 공유 직전이라고 생각하고 검증해줘. 빠진 근거, 논리 취약점, 제출 전 체크포인트, 공유해도 되는 수준인지 중심으로 판단해줘.",
    accent: "#00b894",
    agentId: "delta",
    agentReason: "최종 품질 검증과 공유 전 체크에 가장 적합합니다.",
  },
  {
    id: "report",
    badge: "Psi Critique",
    title: "날카로운 비평",
    summary: "보고서나 발표 자료의 허점, 약한 주장, 공격받을 지점을 강하게 드러냅니다.",
    deliverable: "핵심 비판, 반대 질문, 논리 약점, 수정 권고",
    prompt:
      "이 보고서 또는 발표 자료를 매우 비판적으로 검토해줘. 공격받을 지점, 논리적 비약, 약한 근거, 설득 실패 가능성이 큰 부분을 날카롭게 지적해줘.",
    accent: "#e17055",
    agentId: "psi",
    agentReason: "가차 없는 비평과 약점 노출에 가장 적합합니다.",
  },
  {
    id: "business",
    badge: "Omega Shift",
    title: "새로운 시각",
    summary: "사업 고민에 대해 익숙한 프레임을 벗어난 새로운 관점과 기회 구조를 얻습니다.",
    deliverable: "프레임 전환, 반직관적 통찰, 새로운 해석, 확장 아이디어",
    prompt:
      "이 사업 고민을 기존과 다른 프레임으로 다시 보게 해줘. 내가 놓친 기회 구조, 관점 전환, 반직관적 제안, 더 크게 해석할 수 있는 지점을 중심으로 말해줘.",
    accent: "#2563eb",
    agentId: "omega",
    agentReason: "새로운 시각과 프레임 전환에 가장 적합합니다.",
  },
];

export function getWorkflow(id?: string | null) {
  return WORKFLOWS.find((workflow) => workflow.id === id);
}
